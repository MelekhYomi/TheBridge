try { process.loadEnvFile(); } catch { /* no .env file: rely on real environment variables */ }

const { fileURLToPath } = await import('node:url');
const { default: express } = await import('express');
const { store, newId, nowUtc, usingSheet } = await import('./src/store.js');
const data = await import('./src/data.js');
const sec = await import('./src/security.js');
const pay = await import('./src/payments.js');
const seo = await import('./src/seo.js');
const { parseUpload, kindOf } = await import('./src/media.js');
const { CONTENT_GROUPS } = await import('./src/content.js');
const { layout, siteUrl } = await import('./src/views/layout.js');
const pub = await import('./src/views/public.js');
const fp = await import('./src/views/fprofile.js');
const adm = await import('./src/views/admin.js');

const app = express();
const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "font-src 'self'",
    "img-src 'self' data: https://i.ytimg.com", "media-src 'self'", 'frame-src https://www.youtube-nocookie.com',
    "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'",
  ].join('; '));
  if (production) res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  // Vercel also serves each deployment on its own address; keep those out of Google.
  if (production && req.hostname !== new URL(siteUrl()).hostname) res.setHeader('X-Robots-Tag', 'noindex');
  next();
});

// One address per page: /courses/ and /courses are the same page, so pick one.
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.length > 1 && req.path.endsWith('/')) {
    const q = req.url.slice(req.path.length);
    return res.redirect(301, req.path.replace(/\/+$/, '') + q);
  }
  next();
});

// Express 4 does not catch errors from async handlers by itself.
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Payment webhooks (need the raw body for signature checks) ----------

app.post('/webhooks/paystack', express.raw({ type: '*/*', limit: '200kb' }), h(async (req, res) => {
  if (!pay.paystackSignatureValid(req.body, req.get('x-paystack-signature'))) return res.sendStatus(401);
  try {
    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'charge.success' && event.data?.reference) {
      await pay.recordResult(event.data.reference, await pay.verifyPaystack(event.data.reference));
    }
  } catch (err) {
    console.error('Paystack webhook error:', err.message);
  }
  res.sendStatus(200); // after the work: serverless functions stop once they respond
}));

app.post('/webhooks/flutterwave', express.raw({ type: '*/*', limit: '200kb' }), h(async (req, res) => {
  if (!pay.flutterwaveSignatureValid(req.get('verif-hash'))) return res.sendStatus(401);
  try {
    const event = JSON.parse(req.body.toString('utf8'));
    const d = event.data || event;
    if (d.id && d.tx_ref) {
      const v = await pay.verifyFlutterwave({ transactionId: d.id });
      if (v.reference === d.tx_ref) await pay.recordResult(d.tx_ref, v);
    }
  } catch (err) {
    console.error('Flutterwave webhook error:', err.message);
  }
  res.sendStatus(200);
}));

// The facilitator form carries a resized photo and the media library takes
// uploads, so they get bigger limits (still under Vercel's 4.5 MB request cap).
app.use('/fprofile', express.urlencoded({ extended: false, limit: '4mb' }));
app.use('/admin/media/upload', express.json({ limit: '4.4mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url)), {
  maxAge: '1d',
  setHeaders(res, file) {
    // Fonts never change, and CSS/JS are linked with a ?v= version, so they can be cached for a year.
    if (/[\\/](fonts|css|js)[\\/]/.test(file)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));

// ---------- Helpers ----------

const clean = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanText = (v, max = 4000) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const isBot = (req) => Boolean(req.body.website);
const yes = (v) => (v === '1' ? '1' : '0');
const paymentsReady = () => ({ paystack: pay.providerReady('paystack'), flutterwave: pay.providerReady('flutterwave') });

// Public pages are cached at Vercel's edge for a minute, then refreshed in the
// background, so most visitors get an instant response.
const edgeCache = (res) => res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
const noStore = (res) => res.setHeader('Cache-Control', 'no-store');

function page(res, { site, active, body, seo: meta = {}, status = 200, cache = true }) {
  if (cache && status === 200) edgeCache(res); else noStore(res);
  res.status(status).type('html').send(layout({ active, body, site, seo: meta }));
}

const findCourse = (site, slug) => site.courses.find((c) => c.slug === slug);

const formLimit = sec.rateLimit({ windowMs: 10 * 60e3, max: 20 });

// ---------- Public pages ----------

app.get('/', h(async (req, res) => {
  const site = await data.getSite();
  page(res, {
    site, active: 'home',
    body: pub.homePage({ site, payments: paymentsReady(), query: req.query }),
    seo: { path: '/', jsonLd: seo.compact(seo.organisation(site), seo.website(site), seo.webinarEvent(site), seo.courseList(site)) },
  });
}));

app.post('/register', formLimit, h(async (req, res) => {
  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 160).toLowerCase();
  const phone = clean(req.body.phone, 30);
  if (isBot(req)) return res.redirect(303, '/?form=register&status=registered#register');
  if (!name || !validEmail(email) || !phone) return res.redirect(303, '/?form=register&status=invalid#register');
  const site = await data.getSite();
  const pick = (value, allowed) => (allowed.includes(value) ? value : '');
  await data.addRegistration({
    name, email, phone,
    status: pick(req.body.status, pub.REG_STATUS),
    experience: pick(req.body.experience, pub.REG_EXPERIENCE),
    interest: pick(req.body.interest, [...site.courses.map((c) => c.title), 'All four']),
    question: cleanText(req.body.question, 1000),
    cohort_updates: req.body.cohort_updates === '1' ? 'Yes' : 'No',
    source: clean(req.body.source, 80),
  });
  res.redirect(303, '/?form=register&status=registered#register');
}));

app.post('/contact', formLimit, h(async (req, res) => {
  const name = clean(req.body.name, 120);
  const reach = clean(req.body.reach, 160);
  const body = cleanText(req.body.body);
  if (isBot(req)) return res.redirect(303, '/?form=contact&status=sent#contact');
  if (!name || !body) return res.redirect(303, '/?form=contact&status=invalid#contact');
  // One field takes either an email address or a phone/WhatsApp number.
  const email = reach.includes('@') ? reach.toLowerCase() : '';
  const phone = email ? '' : reach;
  if (email ? !validEmail(email) : phone.replace(/\D/g, '').length < 7) {
    return res.redirect(303, '/?form=contact&status=badreach#contact');
  }
  await data.addMessage({ name, email, phone, subject: clean(req.body.subject, 80), body });
  res.redirect(303, '/?form=contact&status=sent#contact');
}));

app.get('/courses', h(async (req, res) => {
  const site = await data.getSite();
  page(res, {
    site, active: 'courses',
    body: pub.coursesPage({ site, payments: paymentsReady() }),
    seo: {
      title: 'Courses', path: '/courses', description: site.settings.courses_page_description,
      jsonLd: seo.compact(seo.courseList(site), seo.faqPage(site), seo.breadcrumbs([['Home', '/'], ['Courses', '/courses']])),
    },
  });
}));

app.get('/courses/:slug', h(async (req, res, next) => {
  const site = await data.getSite();
  const course = findCourse(site, req.params.slug);
  if (!course) return next();
  page(res, {
    site, active: 'courses',
    body: pub.coursePage({ site, course, payments: paymentsReady(), query: req.query }),
    seo: {
      title: course.title, path: `/courses/${course.slug}`, description: course.summary,
      jsonLd: seo.compact(seo.course(site, course), seo.faqPage(site), seo.breadcrumbs([['Home', '/'], ['Courses', '/courses'], [course.title, `/courses/${course.slug}`]])),
    },
  });
}));

app.post('/interest', formLimit, h(async (req, res, next) => {
  const site = await data.getSite();
  const course = findCourse(site, clean(req.body.course, 80));
  if (!course) return next();
  const back = (status) => res.redirect(303, `/courses/${course.slug}?status=${status}`);
  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 160).toLowerCase();
  const phone = clean(req.body.phone, 30);
  if (isBot(req)) return back('interested');
  if (!name || !validEmail(email) || !phone) return back('invalid');
  await data.addInterest({
    course_id: course.id, course: course.title, name, email, phone,
    experience: pub.REG_EXPERIENCE.includes(req.body.experience) ? req.body.experience : '',
    free_place: req.body.free_place === '1' ? 'Yes' : 'No',
  });
  back('interested');
}));

// ---------- Robots, sitemap and media ----------

app.get('/robots.txt', (req, res) => {
  edgeCache(res);
  res.type('text/plain').send(seo.robotsTxt());
});

app.get('/sitemap.xml', h(async (req, res) => {
  edgeCache(res);
  res.type('application/xml').send(seo.sitemapXml(await data.getSite()));
}));

// Uploaded files live in Google Drive; the site serves them itself so visitors
// never load from Drive. Each file id is unique, so the response is cached for good.
const fileCache = new Map();
const FILE_CACHE_BYTES = 40 * 1024 * 1024;
let fileCacheSize = 0;

async function fileBytes(m) {
  const hit = fileCache.get(m.id);
  if (hit) return hit;
  const f = await store.readFile(m.drive_id);
  const bytes = Buffer.from(f.data, 'base64');
  while (fileCacheSize + bytes.length > FILE_CACHE_BYTES && fileCache.size) {
    const [oldest, b] = fileCache.entries().next().value;
    fileCache.delete(oldest);
    fileCacheSize -= b.length;
  }
  fileCache.set(m.id, bytes);
  fileCacheSize += bytes.length;
  return bytes;
}

app.get('/media/:id/:name?', h(async (req, res, next) => {
  const site = await data.getSite();
  const m = site.mediaById[req.params.id] || (await data.getSite({ fresh: true })).mediaById[req.params.id];
  if (!m) return next();
  const bytes = await fileBytes(m);
  res.setHeader('Content-Type', m.type);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Accept-Ranges', 'bytes');
  // Audio and video players (Safari especially) ask for byte ranges.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.get('range') || '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : Math.max(0, bytes.length - Number(range[2]));
    let end = range[1] && range[2] ? Number(range[2]) : bytes.length - 1;
    end = Math.min(end, bytes.length - 1);
    if (start > end || start >= bytes.length) {
      res.setHeader('Content-Range', `bytes */${bytes.length}`);
      return res.sendStatus(416);
    }
    res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${bytes.length}`);
    return res.end(bytes.subarray(start, end + 1));
  }
  res.end(bytes);
}));

// ---------- Facilitator profile form (/fprofile) → Google Sheet ----------

const fprofilePage = (res, site, opts, status = 200) => page(res, {
  site, status, cache: !opts.values,
  body: fp.fprofilePage({ connected: usingSheet() || !production, ...opts }),
  seo: { title: 'Facilitator profile', path: '/fprofile', noindex: true },
});

app.get('/fprofile', h(async (req, res) => fprofilePage(res, await data.getSite(), { sent: req.query.status === 'sent' })));

app.post('/fprofile', formLimit, h(async (req, res) => {
  if (isBot(req)) return res.redirect(303, '/fprofile?status=sent');
  const site = await data.getSite();
  const b = req.body;
  const one = (v, allowed) => (allowed.includes(v) ? v : '');
  const many = (v, allowed) => [].concat(v || []).filter((x) => allowed.includes(x));
  const words = (s) => s.split(/\s+/).filter(Boolean).length;

  const v = {
    name: clean(b.name, 120),
    phone: clean(b.phone, 30),
    email: clean(b.email, 160).toLowerCase(),
    role: clean(b.role, 160),
    experience: one(b.experience, fp.FP.experience),
    bio: cleanText(b.bio, 3000),
    photo_data: String(b.photo_data || ''),
    link: clean(b.link, 300),
    courses: many(b.courses, fp.FP.courses),
    other_course: clean(b.other_course, 120),
    topic: clean(b.topic, 200),
    qualifications: cleanText(b.qualifications),
    level: one(b.level, fp.FP.levels),
    takeaway1: clean(b.takeaway1, 300),
    takeaway2: clean(b.takeaway2, 300),
    takeaway3: clean(b.takeaway3, 300),
    outline: cleanText(b.outline),
    formats: many(b.formats, fp.FP.formats),
    length: one(b.length, fp.FP.lengths),
    tools: clean(b.tools, 300),
    availability: clean(b.availability, 200),
    requirements: cleanText(b.requirements, 2000),
    certificate: one(b.certificate, fp.FP.certificate),
    comments: cleanText(b.comments, 2000),
  };

  const photo = parseUpload(v.photo_data, `${v.name || 'facilitator'}-photo`);
  const errors = [];
  if (!v.name) errors.push('Enter your full name.');
  if (v.phone.replace(/\D/g, '').length < 7) errors.push('Enter a valid WhatsApp number.');
  if (!validEmail(v.email)) errors.push('Enter a valid email address.');
  if (!v.role) errors.push('Enter your current role and organisation.');
  if (!v.experience) errors.push('Choose your years of experience.');
  if (words(v.bio) < fp.BIO_MIN_WORDS) errors.push(`Write a bio of at least ${fp.BIO_MIN_WORDS} words.`);
  if (!photo.ok || photo.kind !== 'image') errors.push('Add your professional photo (JPG, PNG or WebP).');
  if (v.link && !pub.safeUrl(v.link)) errors.push('Enter the LinkedIn or portfolio link as a full web address starting with https://');
  if (!v.courses.length) errors.push('Tick at least one course.');
  if (v.courses.includes('Other') && !v.other_course) errors.push('Tell us the name of the other course.');
  if (!v.topic) errors.push('Enter your session topic.');
  if (!v.qualifications) errors.push('Tell us what makes you qualified to take this course.');
  if (!v.level) errors.push('Choose the session level.');
  if (!v.takeaway1 || !v.takeaway2 || !v.takeaway3) errors.push('Enter all 3 key things attendees will learn.');
  if (!v.outline) errors.push('Enter your session outline.');
  if (!v.length) errors.push('Choose how long your session will be.');
  if (!v.availability) errors.push('Enter your available date and time.');
  if (!photo.ok) v.photo_data = '';
  if (errors.length) return fprofilePage(res, site, { values: v, errors }, 422);

  const row = {
    submitted_at: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }),
    name: v.name, phone: v.phone, email: v.email, role: v.role, experience: v.experience,
    bio: v.bio, link: v.link,
    courses: v.courses.map((c) => (c === 'Other' ? `Other: ${v.other_course}` : c)).join(', '),
    topic: v.topic, qualifications: v.qualifications, level: v.level,
    takeaways: `1. ${v.takeaway1}\n2. ${v.takeaway2}\n3. ${v.takeaway3}`,
    outline: v.outline, formats: v.formats.join(', '), length: v.length, tools: v.tools,
    availability: v.availability, requirements: v.requirements, certificate: v.certificate, comments: v.comments,
  };
  try {
    await store.append('fprofile', row, { photo: photo.file });
  } catch (err) {
    console.error('Facilitator profile → sheet failed:', err.message);
    return fprofilePage(res, site, { values: v, errors: ["We couldn't save your details just now. Please press Submit again in a moment. Nothing you typed has been lost."] }, 502);
  }
  res.redirect(303, '/fprofile?status=sent');
}));

// ---------- Checkout ----------

app.post('/enrol', formLimit, h(async (req, res, next) => {
  const site = await data.getSite();
  const course = findCourse(site, clean(req.body.course, 80));
  if (!course) return next();
  const back = (status) => res.redirect(303, `/courses/${course.slug}?status=${status}`);

  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 160).toLowerCase();
  const phone = clean(req.body.phone, 30);
  const provider = req.body.provider === 'flutterwave' ? 'flutterwave' : req.body.provider === 'paystack' ? 'paystack' : '';
  if (isBot(req) || !name || !validEmail(email) || !phone || !provider) return back('invalid');
  if (!pub.isOpen(course, paymentsReady()) || !pay.providerReady(provider)) return back('unavailable');

  const enrolment = await data.addEnrolment({
    reference: sec.newReference(), course_id: course.id, course: course.title, name, email, phone, provider,
    amount_kobo: String(course.price_kobo),
    experience: pub.REG_EXPERIENCE.includes(req.body.experience) ? req.body.experience : '',
  });

  try {
    res.redirect(303, await pay.startCheckout(enrolment, course));
  } catch (err) {
    console.error('Checkout start failed:', err.message);
    await data.updateEnrolment(enrolment.reference, { status: 'failed' }).catch(() => {});
    back('payfail');
  }
}));

app.get('/payments/paystack/callback', h(async (req, res) => {
  const reference = clean(req.query.reference || req.query.trxref, 80);
  if (!reference) return res.redirect('/');
  try {
    await pay.recordResult(reference, await pay.verifyPaystack(reference));
  } catch (err) {
    console.error('Paystack verify failed:', err.message); // stays pending; webhook or admin re-check will settle it
  }
  res.redirect(303, `/payments/result/${encodeURIComponent(reference)}`);
}));

app.get('/payments/flutterwave/callback', h(async (req, res) => {
  const reference = clean(req.query.tx_ref, 80);
  if (!reference) return res.redirect('/');
  try {
    if (req.query.status === 'cancelled' && !req.query.transaction_id) {
      await pay.recordResult(reference, { paid: false });
    } else {
      const v = await pay.verifyFlutterwave(req.query.transaction_id ? { transactionId: req.query.transaction_id } : { reference });
      if (v.reference === reference) await pay.recordResult(reference, v);
    }
  } catch (err) {
    console.error('Flutterwave verify failed:', err.message);
  }
  res.redirect(303, `/payments/result/${encodeURIComponent(reference)}`);
}));

app.get('/payments/result/:reference', h(async (req, res, next) => {
  const enrolment = await data.findEnrolment(clean(req.params.reference, 80));
  if (!enrolment) return next();
  const site = await data.getSite();
  const course = site.allCourses.find((c) => c.id === enrolment.course_id);
  page(res, { site, cache: false, body: pub.paymentResultPage({ enrolment, course, state: enrolment.status }), seo: { title: 'Payment', path: req.path, noindex: true } });
}));

// Local-only fake checkout so the whole flow can be tested without provider keys.
app.get('/payments/demo', h(async (req, res, next) => {
  if (!pay.providers().demo) return next();
  const enrolment = await data.findEnrolment(clean(req.query.reference, 80));
  if (!enrolment || enrolment.status !== 'pending') return next();
  const site = await data.getSite();
  const course = site.allCourses.find((c) => c.id === enrolment.course_id);
  page(res, { site, cache: false, body: pub.demoCheckoutPage({ enrolment, course }), seo: { title: 'Demo checkout', noindex: true } });
}));

app.post('/payments/demo', h(async (req, res, next) => {
  if (!pay.providers().demo) return next();
  const reference = clean(req.body.reference, 80);
  const row = await data.findEnrolment(reference);
  if (!row) return next();
  await pay.recordResult(reference, { paid: req.body.outcome === 'success', amountKobo: row.amount_kobo, providerTx: 'demo' });
  res.redirect(303, `/payments/result/${encodeURIComponent(reference)}`);
}));

// ---------- Admin ----------

const loginLimit = sec.rateLimit({ windowMs: 15 * 60e3, max: 10, message: 'Too many sign-in attempts. Try again in 15 minutes.' });

app.use('/admin', (req, res, next) => { noStore(res); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); next(); });

app.get('/admin/login', (req, res) => res.type('html').send(adm.loginPage({})));

app.post('/admin/login', loginLimit, h(async (req, res) => {
  if (!sec.checkAdminLogin(req.body.username, req.body.password)) {
    await new Promise((r) => setTimeout(r, 600)); // slows down password guessing
    return res.status(401).type('html').send(adm.loginPage({ error: 'Wrong username or password.' }));
  }
  sec.startSession(res);
  res.redirect(303, '/admin');
}));

app.use('/admin', sec.requireAdmin);

app.post('/admin/logout', (req, res) => {
  sec.endSession(res);
  res.redirect(303, '/admin/login');
});

const render = (res, html) => res.type('html').send(html);
const ctx = (res, extra = {}) => ({ csrf: res.locals.csrf, unread: res.locals.unread ?? 0, ...extra });
const flashOf = (req) => clean(req.query.flash, 300);
function back(res, target, flash) {
  const [path, hash] = target.split('#');
  res.redirect(303, `${path}${path.includes('?') ? '&' : '?'}flash=${encodeURIComponent(flash)}${hash ? `#${hash}` : ''}`);
}

// Unread message count for the sidebar badge (cheap: the admin lists messages anyway on most pages).
async function withUnread(res) {
  const msgs = await store.list('messages');
  res.locals.unread = msgs.filter((m) => m.handled !== '1').length;
  return msgs;
}

app.get('/admin', h(async (req, res) => {
  const [regs, interest, enrolments, messages] = await store.listMany(['registrations', 'interest', 'enrolments', 'messages']);
  const site = await data.getSite({ fresh: true });
  res.locals.unread = messages.filter((m) => m.handled !== '1').length;
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().replace('T', ' ');
  const paid = enrolments.filter((e) => e.status === 'paid');
  const newest = (rows) => [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const stats = {
    regs: regs.length,
    regs7: regs.filter((r) => r.created_at >= weekAgo).length,
    cohort: regs.filter((r) => r.cohort_updates === 'Yes').length,
    attendance: site.settings.webinar_attendance,
    interest: interest.length,
    freePlaces: interest.filter((i) => i.free_place === 'Yes').length,
    paid: paid.length,
    pending: enrolments.filter((e) => e.status === 'pending').length,
    revenue: paid.reduce((n, e) => n + (Number(e.amount_kobo) || 0), 0),
    messages: messages.length,
    unread: res.locals.unread,
  };
  const byField = site.allCourses.map((c) => ({
    label: c.title,
    regs: regs.filter((r) => r.interest === c.title).length,
    interested: interest.filter((i) => i.course_id === c.id).length,
    paid: paid.filter((e) => e.course_id === c.id).length,
  }));
  const allFour = regs.filter((r) => r.interest === 'All four').length;
  if (allFour) byField.push({ label: 'All four', regs: allFour, interested: '—', paid: '—' });
  render(res, adm.overviewPage(ctx(res, {
    stats, interest: byField,
    recentRegs: newest(regs).slice(0, 5),
    recentPays: newest(enrolments).slice(0, 5),
    system: { sheet: usingSheet(), production, degraded: Boolean(site.degraded), payments: pay.providers(), baseUrl: siteUrl() },
  })));
}));

app.get('/admin/registrations', h(async (req, res) => {
  await withUnread(res);
  const q = clean(req.query.q, 100).toLowerCase();
  let rows = await data.listNewest('registrations');
  if (q) rows = rows.filter((r) => [r.name, r.email, r.phone].some((x) => String(x).toLowerCase().includes(q)));
  render(res, adm.registrationsPage(ctx(res, { rows: rows.slice(0, 1000), q })));
}));

app.get('/admin/enrolments', h(async (req, res) => {
  await withUnread(res);
  const status = ['paid', 'pending', 'failed'].includes(req.query.status) ? req.query.status : '';
  let rows = await data.listNewest('enrolments');
  if (status) rows = rows.filter((r) => r.status === status);
  render(res, adm.enrolmentsPage(ctx(res, { rows: rows.slice(0, 1000), status, flash: flashOf(req) })));
}));

app.post('/admin/enrolments/:reference/recheck', h(async (req, res) => {
  const row = await data.findEnrolment(clean(req.params.reference, 80));
  let flash = 'Payment not found.';
  if (row) {
    try {
      if (!pay.providers()[row.provider]) throw new Error(`${row.provider} keys are not set`);
      const v = row.provider === 'paystack' ? await pay.verifyPaystack(row.reference) : await pay.verifyFlutterwave({ reference: row.reference });
      const after = await pay.recordResult(row.reference, v);
      flash = `${row.reference}: ${after.status}.`;
    } catch (err) {
      flash = `Could not check ${row.reference}: ${err.message}`;
    }
  }
  back(res, '/admin/enrolments', flash);
}));

app.get('/admin/interest', h(async (req, res) => {
  await withUnread(res);
  const site = await data.getSite();
  const course = clean(req.query.course, 40);
  let rows = await data.listNewest('interest');
  if (course) rows = rows.filter((r) => r.course_id === course);
  rows.sort((a, b) => (a.contacted === '1') - (b.contacted === '1'));
  render(res, adm.interestPage(ctx(res, { rows: rows.slice(0, 1000), courses: site.allCourses, course })));
}));

app.post('/admin/interest/:id/toggle', h(async (req, res) => {
  const row = (await store.list('interest')).find((r) => r.id === req.params.id);
  if (row) await store.update('interest', row.id, { contacted: row.contacted === '1' ? '0' : '1' });
  res.redirect(303, '/admin/interest');
}));

app.get('/admin/messages', h(async (req, res) => {
  const msgs = await withUnread(res);
  const rows = msgs.sort((a, b) => (a.handled === '1') - (b.handled === '1') || String(b.created_at).localeCompare(String(a.created_at)));
  render(res, adm.messagesPage(ctx(res, { rows })));
}));

app.post('/admin/messages/:id/toggle', h(async (req, res) => {
  const row = (await store.list('messages')).find((r) => r.id === req.params.id);
  if (row) await store.update('messages', row.id, { handled: row.handled === '1' ? '0' : '1' });
  res.redirect(303, '/admin/messages');
}));

// ----- Site content -----

app.get('/admin/content', h(async (req, res) => {
  await withUnread(res);
  const site = await data.getSite({ fresh: true });
  render(res, adm.contentPage(ctx(res, { site, flash: flashOf(req) })));
}));

app.post('/admin/content/:group', h(async (req, res) => {
  const group = CONTENT_GROUPS.find((g) => g.id === req.params.group);
  if (!group) return res.sendStatus(404);
  const site = await data.getSite({ fresh: true });
  const items = [];
  for (const f of group.fields) {
    if (!(f.key in req.body)) continue;
    let v = ['textarea', 'lines'].includes(f.type) ? cleanText(req.body[f.key], 8000) : clean(req.body[f.key], 500);
    if (f.type === 'url' && v && !pub.safeUrl(v)) return back(res, `/admin/content#${group.id}`, `${f.label}: enter a full web address starting with https://`);
    if (f.type === 'video' && v && !pub.youtubeId(v)) return back(res, `/admin/content#${group.id}`, `${f.label}: paste a YouTube link, e.g. https://youtu.be/…`);
    if (f.type === 'email' && v && !validEmail(v)) return back(res, `/admin/content#${group.id}`, `${f.label}: enter a valid email address.`);
    if (f.type === 'datetime' && v && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) v = '';
    if ((f.type === 'image' || f.type === 'audio') && v && !site.mediaById[v]) v = '';
    if (f.key === 'webinar_attendance') v = v.replace(/\D/g, '').slice(0, 7);
    if (v !== site.settings[f.key]) items.push({ id: f.key, patch: { value: v, updated_at: nowUtc() } });
  }
  await store.updateMany('content', items, { match: 'key', upsert: true });
  data.invalidateSite();
  back(res, `/admin/content#${group.id}`, items.length ? `${group.title}: saved. The live site updates within about a minute.` : 'Nothing changed.');
}));

// ----- Courses -----

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

app.get('/admin/courses', h(async (req, res) => {
  await withUnread(res);
  render(res, adm.coursesAdminPage(ctx(res, { site: await data.getSite({ fresh: true }), flash: flashOf(req) })));
}));

function courseFields(body, site) {
  const priceText = clean(body.price, 20).replace(/[₦,\s]/g, '');
  const price = priceText === '' ? '' : Math.round(Number(priceText) * 100);
  if (price !== '' && (!Number.isFinite(price) || price < 0)) return { error: 'Fee must be a number, e.g. 75000.' };
  const video = clean(body.video, 300);
  if (video && !pub.youtubeId(video)) return { error: 'Video: paste a YouTube link.' };
  return {
    patch: {
      title: clean(body.title, 120) || 'Untitled course',
      price_kobo: String(price),
      duration: clean(body.duration, 60),
      start_date: clean(body.start_date, 60),
      summary: clean(body.summary, 300),
      outcomes: cleanText(body.outcomes, 2000),
      session_title: clean(body.session_title, 160),
      session_desc: cleanText(body.session_desc, 600),
      session_demo: cleanText(body.session_demo, 400),
      session_exercise: cleanText(body.session_exercise, 400),
      colour: ['blue', 'yellow', 'red', 'black'].includes(body.colour) ? body.colour : 'blue',
      active: yes(body.active),
      sort: String(Number(body.sort) || site.allCourses.length + 1),
      video,
    },
  };
}

app.post('/admin/courses/new', h(async (req, res) => {
  await data.ensureSeeded('courses');
  const site = await data.getSite({ fresh: true });
  const title = clean(req.body.title, 120);
  if (!title) return back(res, '/admin/courses', 'Give the new course a title.');
  let slug = slugify(title) || 'course';
  while (site.allCourses.some((c) => c.slug === slug)) slug += '-2';
  await store.append('courses', { id: newId('c_'), slug, title, colour: 'blue', active: '0', sort: String(site.allCourses.length + 1) });
  data.invalidateSite();
  back(res, `/admin/courses#${slug}`, `"${title}" added. It stays hidden until you fill it in and set Visible to Yes.`);
}));

app.post('/admin/courses/:id', h(async (req, res) => {
  await data.ensureSeeded('courses');
  const site = await data.getSite({ fresh: true });
  const course = site.allCourses.find((c) => c.id === req.params.id);
  if (!course) return back(res, '/admin/courses', 'Course not found.');
  const { patch, error } = courseFields(req.body, site);
  if (error) return back(res, `/admin/courses#${course.slug}`, error);
  await store.update('courses', course.id, patch);
  data.invalidateSite();
  back(res, `/admin/courses#${course.slug}`, `${patch.title}: saved.`);
}));

app.post('/admin/courses/:id/delete', h(async (req, res) => {
  await data.ensureSeeded('courses');
  const site = await data.getSite({ fresh: true });
  const course = site.allCourses.find((c) => c.id === req.params.id);
  if (!course) return back(res, '/admin/courses', 'Course not found.');
  await store.remove('courses', course.id);
  data.invalidateSite();
  back(res, '/admin/courses', `${course.title}: deleted. Its sign-ups and payments are kept.`);
}));

// ----- Facilitators -----

app.get('/admin/facilitators', h(async (req, res) => {
  await withUnread(res);
  render(res, adm.facilitatorsPage(ctx(res, { site: await data.getSite({ fresh: true }), flash: flashOf(req) })));
}));

function facilitatorFields(body, site) {
  const patch = {
    name: clean(body.name, 120) || 'Facilitator name',
    role: clean(body.role, 160),
    course_id: site.allCourses.some((c) => c.id === body.course_id) ? body.course_id : '',
    bio: cleanText(body.bio, 2000),
    qualifications: cleanText(body.qualifications, 2000),
    photo: site.mediaById[body.photo]?.type.startsWith('image/') ? body.photo : '',
    audio: site.mediaById[body.audio]?.type.startsWith('audio/') ? body.audio : '',
    video: clean(body.video, 300),
    active: yes(body.active),
    sort: String(Number(body.sort) || 1),
  };
  for (const k of ['linkedin', 'x', 'github', 'instagram', 'website']) {
    patch[k] = clean(body[k], 300);
    if (patch[k] && !pub.safeUrl(patch[k])) return { error: `${k}: enter a full web address starting with https://` };
  }
  if (patch.video && !pub.youtubeId(patch.video)) return { error: 'Video: paste a YouTube link.' };
  return { patch };
}

app.post('/admin/facilitators/new', h(async (req, res) => {
  await data.ensureSeeded('facilitators');
  const site = await data.getSite({ fresh: true });
  const id = newId('f_');
  await store.append('facilitators', { id, name: clean(req.body.name, 120) || 'New facilitator', active: '0', sort: String(site.allFacilitators.length + 1) });
  data.invalidateSite();
  back(res, `/admin/facilitators#${id}`, 'Facilitator added. It stays hidden until you set Visible to Yes.');
}));

app.post('/admin/facilitators/:id', h(async (req, res) => {
  await data.ensureSeeded('facilitators');
  const site = await data.getSite({ fresh: true });
  const f = site.allFacilitators.find((x) => x.id === req.params.id);
  if (!f) return back(res, '/admin/facilitators', 'Facilitator not found.');
  const { patch, error } = facilitatorFields(req.body, site);
  if (error) return back(res, `/admin/facilitators#${f.id}`, error);
  await store.update('facilitators', f.id, patch);
  data.invalidateSite();
  back(res, `/admin/facilitators#${f.id}`, `${patch.name}: saved.`);
}));

app.post('/admin/facilitators/:id/delete', h(async (req, res) => {
  await data.ensureSeeded('facilitators');
  const site = await data.getSite({ fresh: true });
  const f = site.allFacilitators.find((x) => x.id === req.params.id);
  if (f) await store.remove('facilitators', f.id);
  data.invalidateSite();
  back(res, '/admin/facilitators', f ? `${f.name}: deleted.` : 'Facilitator not found.');
}));

// Facilitator form submissions, with a shortcut to turn one into a profile.
app.get('/admin/submissions', h(async (req, res) => {
  await withUnread(res);
  const [rows, site] = await Promise.all([store.list('fprofile'), data.getSite({ fresh: true })]);
  render(res, adm.submissionsPage(ctx(res, { rows: rows.reverse(), site, flash: flashOf(req) })));
}));

const driveId = (url) => (/\/d\/([\w-]{20,})/.exec(url || '') || /[?&]id=([\w-]{20,})/.exec(url || '') || /^local-file:([\w-]+)$/.exec(url || '') || [])[1] || '';

async function addMedia(file, size, alt = '') {
  const saved = await store.upload(file);
  const row = { id: newId('m_'), created_at: nowUtc(), name: file.name, type: file.type, size: String(size), alt, drive_id: saved.id };
  await store.append('media', row);
  return row;
}

app.post('/admin/submissions/use', h(async (req, res) => {
  const rows = await store.list('fprofile');
  const sub = rows.find((r) => r.submitted_at === req.body.submitted_at && r.email === req.body.email);
  const site = await data.getSite({ fresh: true });
  const target = site.allFacilitators.find((f) => f.id === req.body.facilitator_id);
  if (!sub || !target) return back(res, '/admin/submissions', 'Pick a submission and a profile to fill.');
  await data.ensureSeeded('facilitators');
  const patch = {
    name: sub.name, role: sub.role, bio: sub.bio,
    qualifications: sub.qualifications.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 6).join('\n'),
  };
  if (/linkedin\.com/i.test(sub.link)) patch.linkedin = sub.link;
  else if (pub.safeUrl(sub.link)) patch.website = sub.link;
  const id = driveId(sub.photo);
  if (id) {
    try {
      const f = await store.readFile(id);
      const up = parseUpload(`data:;base64,${f.data}`, `${sub.name}-photo`);
      if (up.ok && up.kind === 'image') patch.photo = (await addMedia(up.file, up.size, sub.name)).id;
    } catch (err) {
      console.error('Copying submission photo failed:', err.message);
    }
  }
  await store.update('facilitators', target.id, patch);
  data.invalidateSite();
  back(res, `/admin/facilitators#${target.id}`, `${sub.name}'s details are now in that profile. Check it, then set Visible to Yes.`);
}));

// ----- Media library -----

app.get('/admin/media', h(async (req, res) => {
  await withUnread(res);
  render(res, adm.mediaPage(ctx(res, { site: await data.getSite({ fresh: true }), flash: flashOf(req) })));
}));

// Called by the admin page's script with JSON; answers JSON.
app.post('/admin/media/upload', h(async (req, res) => {
  const up = parseUpload(req.body.data, clean(req.body.name, 120));
  if (!up.ok) return res.status(400).json({ ok: false, error: up.error });
  const row = await addMedia(up.file, up.size, clean(req.body.alt, 200));
  data.invalidateSite();
  res.json({ ok: true, media: { id: row.id, name: row.name, type: row.type, kind: kindOf(row.type), url: data.mediaUrl(row) } });
}));

app.post('/admin/media/:id', h(async (req, res) => {
  await store.update('media', req.params.id, { alt: clean(req.body.alt, 200) });
  data.invalidateSite();
  back(res, '/admin/media', 'Description saved.');
}));

app.post('/admin/media/:id/delete', h(async (req, res) => {
  const site = await data.getSite({ fresh: true });
  const m = site.mediaById[req.params.id];
  if (!m) return back(res, '/admin/media', 'File not found.');
  const usedBy = [
    ...Object.entries(site.settings).filter(([, v]) => v === m.id).map(([k]) => `site content (${k})`),
    ...site.allFacilitators.filter((f) => f.photo === m.id || f.audio === m.id).map((f) => f.name),
  ];
  if (usedBy.length) return back(res, '/admin/media', `${m.name} is still used by ${usedBy.join(', ')}. Remove it there first.`);
  await store.remove('media', m.id);
  await store.deleteFile(m.drive_id).catch((err) => console.error('Drive delete failed:', err.message));
  fileCache.delete(m.id);
  data.invalidateSite();
  back(res, '/admin/media', `${m.name}: deleted (it stays in Google Drive's bin for 30 days).`);
}));

// ----- CSV exports -----

function csv(res, filename, rows, columns) {
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
    return `"${s.replace(/"/g, '""')}"`;
  };
  const out = [columns.map(([, label]) => cell(label)).join(','), ...rows.map((r) => columns.map(([k]) => cell(r[k])).join(','))];
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.type('text/csv').send('﻿' + out.join('\r\n'));
}

app.get('/admin/registrations.csv', h(async (req, res) => {
  csv(res, 'webinar-registrations.csv', await data.listNewest('registrations'), [['created_at', 'Date (UTC)'], ['name', 'Name'], ['email', 'Email'], ['phone', 'WhatsApp'],
    ['status', 'Status'], ['experience', 'Experience'], ['interest', 'Topic'], ['cohort_updates', 'Cohort updates'], ['question', 'Question'], ['source', 'Source']]);
}));

app.get('/admin/enrolments.csv', h(async (req, res) => {
  const rows = (await data.listNewest('enrolments')).map((r) => ({ ...r, amount: (Number(r.amount_kobo) / 100).toFixed(2) }));
  csv(res, 'payments.csv', rows, [['created_at', 'Date (UTC)'], ['reference', 'Reference'], ['name', 'Name'], ['email', 'Email'], ['phone', 'WhatsApp'],
    ['course', 'Course'], ['amount', 'Amount (NGN)'], ['provider', 'Provider'], ['status', 'Status'], ['paid_at', 'Paid at (UTC)']]);
}));

app.get('/admin/interest.csv', h(async (req, res) => {
  csv(res, 'course-interest.csv', await data.listNewest('interest'), [['created_at', 'Date (UTC)'], ['name', 'Name'], ['email', 'Email'], ['phone', 'WhatsApp'],
    ['course', 'Course'], ['experience', 'Experience'], ['free_place', 'Free place requested'], ['contacted', 'Contacted (1 = yes)']]);
}));

// ---------- Errors ----------

app.use(h(async (req, res) => {
  const site = await data.getSite();
  page(res, { site, status: 404, body: pub.notFoundPage(), seo: { title: 'Page not found', noindex: true } });
}));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  if (res.headersSent) return;
  noStore(res);
  res.status(500).type('html').send('<!doctype html><meta charset="utf-8"><title>Something went wrong</title><body style="font-family:sans-serif;padding:40px"><h1>Something went wrong</h1><p>Please try again in a moment. If it keeps happening, contact us on WhatsApp.</p><p><a href="/">Back to TheBridge</a></p>');
});

export const paymentStatus = () => {
  const p = pay.providers();
  return `Payments: Paystack ${p.paystack ? 'on' : 'off'}, Flutterwave ${p.flutterwave ? 'on' : 'off'}${p.demo ? ', demo checkout on' : ''} · Data: ${usingSheet() ? 'Google Sheet' : 'local file (data/store.json)'}`;
};

export default app;
