try { process.loadEnvFile(); } catch { /* no .env file: rely on real environment variables */ }

const { fileURLToPath } = await import('node:url');
const { default: express } = await import('express');
const { db, getSettings, saveSettings } = await import('./src/db.js');
const sec = await import('./src/security.js');
const pay = await import('./src/payments.js');
const { layout } = await import('./src/views/layout.js');
const pub = await import('./src/views/public.js');
const fp = await import('./src/views/fprofile.js');
const adm = await import('./src/views/admin.js');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'");
  next();
});

// ---------- Payment webhooks (need the raw body for signature checks) ----------

app.post('/webhooks/paystack', express.raw({ type: '*/*', limit: '200kb' }), async (req, res) => {
  if (!pay.paystackSignatureValid(req.body, req.get('x-paystack-signature'))) return res.sendStatus(401);
  res.sendStatus(200);
  try {
    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'charge.success' && event.data?.reference) {
      const v = await pay.verifyPaystack(event.data.reference);
      pay.recordResult(event.data.reference, v);
    }
  } catch (err) {
    console.error('Paystack webhook error:', err.message);
  }
});

app.post('/webhooks/flutterwave', express.raw({ type: '*/*', limit: '200kb' }), async (req, res) => {
  if (!pay.flutterwaveSignatureValid(req.get('verif-hash'))) return res.sendStatus(401);
  res.sendStatus(200);
  try {
    const event = JSON.parse(req.body.toString('utf8'));
    const data = event.data || event;
    if (data.id && data.tx_ref) {
      const v = await pay.verifyFlutterwave({ transactionId: data.id });
      if (v.reference === data.tx_ref) pay.recordResult(data.tx_ref, v);
    }
  } catch (err) {
    console.error('Flutterwave webhook error:', err.message);
  }
});

// The facilitator form carries a resized photo, so it gets a bigger body limit
// (still under Vercel's 4.5 MB request cap).
app.use('/fprofile', express.urlencoded({ extended: false, limit: '4mb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url)), { maxAge: '1h' }));

// ---------- Helpers ----------

const clean = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanText = (v, max = 4000) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const isBot = (req) => Boolean(req.body.website);

const activeCourses = () => db.prepare('SELECT * FROM courses WHERE active = 1 ORDER BY sort, id').all();
const findCourse = (slug) => db.prepare('SELECT * FROM courses WHERE slug = ? AND active = 1').get(slug);

function page(res, { title, description, active, body, status = 200, noindex = false }) {
  res.status(status).type('html').send(layout({ title, description, active, body, noindex, settings: getSettings() }));
}

const formLimit = sec.rateLimit({ windowMs: 10 * 60e3, max: 20 });

// ---------- Public pages ----------

const paymentsReady = () => ({ paystack: pay.providerReady('paystack'), flutterwave: pay.providerReady('flutterwave') });

app.get('/', (req, res) => {
  page(res, { active: 'home', body: pub.homePage({ settings: getSettings(), courses: activeCourses(), payments: paymentsReady(), query: req.query }) });
});

app.post('/register', formLimit, (req, res) => {
  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 160).toLowerCase();
  const phone = clean(req.body.phone, 30);
  if (isBot(req)) return res.redirect(303, '/?form=register&status=registered#register');
  if (!name || !validEmail(email) || !phone) return res.redirect(303, '/?form=register&status=invalid#register');
  const pick = (value, allowed) => (allowed.includes(value) ? value : '');
  const fields = [...activeCourses().map((c) => c.title), 'All four'];
  db.prepare(`INSERT INTO registrations (name, email, phone, status, experience, interest, question, cohort_updates, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    name, email, phone,
    pick(req.body.status, pub.REG_STATUS),
    pick(req.body.experience, pub.REG_EXPERIENCE),
    pick(req.body.interest, fields),
    cleanText(req.body.question, 1000),
    req.body.cohort_updates === '1' ? 1 : 0,
    clean(req.body.source, 80),
  );
  res.redirect(303, '/?form=register&status=registered#register');
});

app.post('/contact', formLimit, (req, res) => {
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
  db.prepare('INSERT INTO messages (name, email, phone, subject, body) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, phone, clean(req.body.subject, 80), body);
  res.redirect(303, '/?form=contact&status=sent#contact');
});

app.get('/courses', (req, res) => {
  page(res, { title: 'Courses', active: 'courses', body: pub.coursesPage({ courses: activeCourses(), payments: paymentsReady() }) });
});

app.get('/courses/:slug', (req, res, next) => {
  const course = findCourse(req.params.slug);
  if (!course) return next();
  page(res, { title: course.title, description: course.summary, active: 'courses', body: pub.coursePage({ course, payments: paymentsReady(), query: req.query }) });
});

// ---------- Facilitator profile form (/fprofile) → Google Sheet ----------

const sheetUrl = () => process.env.FPROFILE_SHEET_URL || '';
const fprofilePage = (res, opts, status = 200) => page(res, { title: 'Facilitator profile', noindex: true, status, body: fp.fprofilePage({ connected: Boolean(sheetUrl()), ...opts }) });

app.get('/fprofile', (req, res) => fprofilePage(res, { sent: req.query.status === 'sent' }));

app.post('/fprofile', formLimit, async (req, res) => {
  if (isBot(req)) return res.redirect(303, '/fprofile?status=sent');
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

  const photo = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(v.photo_data);
  const errors = [];
  if (!v.name) errors.push('Enter your full name.');
  if (v.phone.replace(/\D/g, '').length < 7) errors.push('Enter a valid WhatsApp number.');
  if (!validEmail(v.email)) errors.push('Enter a valid email address.');
  if (!v.role) errors.push('Enter your current role and organisation.');
  if (!v.experience) errors.push('Choose your years of experience.');
  if (words(v.bio) < fp.BIO_MIN_WORDS) errors.push(`Write a bio of at least ${fp.BIO_MIN_WORDS} words.`);
  if (!photo) errors.push('Add your professional photo.');
  if (v.link && !/^https?:\/\/\S+\.\S+/i.test(v.link)) errors.push('Enter the LinkedIn or portfolio link as a full web address starting with https://');
  if (!v.courses.length) errors.push('Tick at least one course.');
  if (v.courses.includes('Other') && !v.other_course) errors.push('Tell us the name of the other course.');
  if (!v.topic) errors.push('Enter your session topic.');
  if (!v.qualifications) errors.push('Tell us what makes you qualified to take this course.');
  if (!v.level) errors.push('Choose the session level.');
  if (!v.takeaway1 || !v.takeaway2 || !v.takeaway3) errors.push('Enter all 3 key things attendees will learn.');
  if (!v.outline) errors.push('Enter your session outline.');
  if (!v.length) errors.push('Choose how long your session will be.');
  if (!v.availability) errors.push('Enter your available date and time.');
  if (!photo) v.photo_data = '';
  if (errors.length) return fprofilePage(res, { values: v, errors }, 422);

  if (!sheetUrl()) return fprofilePage(res, { values: v, errors: ['This form is not connected to the sheet yet. Please try again later or contact us on WhatsApp.'] }, 503);

  // Sheets would run a value starting with = + - @ as a formula; a leading ' keeps it as text.
  const cell = (s) => (/^[=+\-@]/.test(s) ? `'${s}` : s);
  const slug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'facilitator';
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
  for (const k of Object.keys(row)) row[k] = cell(row[k]);
  row.photo = { name: `${slug}-${Date.now()}.${photo[1].split('/')[1].replace('jpeg', 'jpg')}`, type: photo[1], data: photo[2] };

  try {
    const r = await fetch(sheetUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(25000),
    });
    const out = await r.json().catch(() => ({}));
    if (!out.ok) throw new Error(out.error || `Sheet responded ${r.status}`);
  } catch (err) {
    console.error('Facilitator profile → sheet failed:', err.message);
    return fprofilePage(res, { values: v, errors: ["We couldn't save your details just now. Please press Submit again in a moment. Nothing you typed has been lost."] }, 502);
  }
  res.redirect(303, '/fprofile?status=sent');
});

app.post('/interest', formLimit, (req, res, next) => {
  const course = findCourse(clean(req.body.course, 80));
  if (!course) return next();
  const back = (status) => res.redirect(303, `/courses/${course.slug}?status=${status}`);
  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 160).toLowerCase();
  const phone = clean(req.body.phone, 30);
  if (isBot(req)) return back('interested');
  if (!name || !validEmail(email) || !phone) return back('invalid');
  db.prepare('INSERT INTO course_interest (course_id, name, email, phone, experience, free_place) VALUES (?, ?, ?, ?, ?, ?)').run(
    course.id, name, email, phone,
    pub.REG_EXPERIENCE.includes(req.body.experience) ? req.body.experience : '',
    req.body.free_place === '1' ? 1 : 0,
  );
  back('interested');
});

// ---------- Checkout ----------

app.post('/enrol', formLimit, async (req, res, next) => {
  const course = findCourse(clean(req.body.course, 80));
  if (!course) return next();
  const back = (status) => res.redirect(303, `/courses/${course.slug}?status=${status}`);

  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 160).toLowerCase();
  const phone = clean(req.body.phone, 30);
  const provider = req.body.provider === 'flutterwave' ? 'flutterwave' : req.body.provider === 'paystack' ? 'paystack' : '';
  if (isBot(req) || !name || !validEmail(email) || !phone || !provider) return back('invalid');
  if (!pub.isOpen(course, paymentsReady()) || !pay.providerReady(provider)) return back('unavailable');

  const enrolment = {
    reference: sec.newReference(), course_id: course.id, name, email, phone, provider, amount_kobo: course.price_kobo,
    experience: pub.REG_EXPERIENCE.includes(req.body.experience) ? req.body.experience : '',
  };
  db.prepare(`INSERT INTO enrolments (reference, course_id, name, email, phone, experience, provider, amount_kobo)
    VALUES (:reference, :course_id, :name, :email, :phone, :experience, :provider, :amount_kobo)`).run(enrolment);

  try {
    res.redirect(303, await pay.startCheckout(enrolment, course));
  } catch (err) {
    console.error('Checkout start failed:', err.message);
    db.prepare(`UPDATE enrolments SET status = 'failed' WHERE reference = ?`).run(enrolment.reference);
    back('payfail');
  }
});

app.get('/payments/paystack/callback', async (req, res) => {
  const reference = clean(req.query.reference || req.query.trxref, 80);
  if (!reference) return res.redirect('/');
  try {
    pay.recordResult(reference, await pay.verifyPaystack(reference));
  } catch (err) {
    console.error('Paystack verify failed:', err.message); // stays pending; webhook or admin re-check will settle it
  }
  res.redirect(303, `/payments/result/${encodeURIComponent(reference)}`);
});

app.get('/payments/flutterwave/callback', async (req, res) => {
  const reference = clean(req.query.tx_ref, 80);
  if (!reference) return res.redirect('/');
  try {
    if (req.query.status === 'cancelled' && !req.query.transaction_id) {
      pay.recordResult(reference, { paid: false });
    } else {
      const v = await pay.verifyFlutterwave(req.query.transaction_id ? { transactionId: req.query.transaction_id } : { reference });
      if (v.reference === reference) pay.recordResult(reference, v);
    }
  } catch (err) {
    console.error('Flutterwave verify failed:', err.message);
  }
  res.redirect(303, `/payments/result/${encodeURIComponent(reference)}`);
});

app.get('/payments/result/:reference', (req, res, next) => {
  const enrolment = db.prepare('SELECT * FROM enrolments WHERE reference = ?').get(req.params.reference);
  if (!enrolment) return next();
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(enrolment.course_id);
  page(res, { title: 'Payment', body: pub.paymentResultPage({ enrolment, course, state: enrolment.status }) });
});

// Local-only fake checkout so the whole flow can be tested without provider keys.
app.get('/payments/demo', (req, res, next) => {
  if (!pay.providers().demo) return next();
  const enrolment = db.prepare(`SELECT * FROM enrolments WHERE reference = ? AND status = 'pending'`).get(clean(req.query.reference, 80));
  if (!enrolment) return next();
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(enrolment.course_id);
  page(res, { title: 'Demo checkout', body: pub.demoCheckoutPage({ enrolment, course }) });
});

app.post('/payments/demo', (req, res, next) => {
  if (!pay.providers().demo) return next();
  const reference = clean(req.body.reference, 80);
  const row = db.prepare('SELECT * FROM enrolments WHERE reference = ?').get(reference);
  if (!row) return next();
  pay.recordResult(reference, { paid: req.body.outcome === 'success', amountKobo: row.amount_kobo, providerTx: 'demo' });
  res.redirect(303, `/payments/result/${encodeURIComponent(reference)}`);
});

// ---------- Admin ----------

const loginLimit = sec.rateLimit({ windowMs: 15 * 60e3, max: 10, message: 'Too many sign-in attempts. Try again in 15 minutes.' });

app.get('/admin/login', (req, res) => res.type('html').send(adm.loginPage({})));

app.post('/admin/login', loginLimit, (req, res) => {
  if (!sec.checkAdminLogin(req.body.username, req.body.password)) {
    return res.status(401).type('html').send(adm.loginPage({ error: 'Wrong username or password.' }));
  }
  sec.startSession(res);
  res.redirect(303, '/admin');
});

app.use('/admin', sec.requireAdmin);

app.post('/admin/logout', (req, res) => {
  sec.endSession(res);
  res.redirect(303, '/admin/login');
});

const counts = () => ({ unread: db.prepare('SELECT COUNT(*) AS n FROM messages WHERE handled = 0').get().n });
const enrolmentsQuery = `SELECT e.*, c.title AS course_title FROM enrolments e JOIN courses c ON c.id = e.course_id`;
const render = (res, html) => res.type('html').send(html);

app.get('/admin', (req, res) => {
  const one = (sql) => db.prepare(sql).get().n;
  const stats = {
    regs: one('SELECT COUNT(*) AS n FROM registrations'),
    regs7: one(`SELECT COUNT(*) AS n FROM registrations WHERE created_at >= datetime('now', '-7 days')`),
    cohort: one('SELECT COUNT(*) AS n FROM registrations WHERE cohort_updates = 1'),
    attendance: getSettings().webinar_attendance,
    interest: one('SELECT COUNT(*) AS n FROM course_interest'),
    freePlaces: one('SELECT COUNT(*) AS n FROM course_interest WHERE free_place = 1'),
    paid: one(`SELECT COUNT(*) AS n FROM enrolments WHERE status = 'paid'`),
    pending: one(`SELECT COUNT(*) AS n FROM enrolments WHERE status = 'pending'`),
    revenue: one(`SELECT COALESCE(SUM(amount_kobo), 0) AS n FROM enrolments WHERE status = 'paid'`),
    messages: one('SELECT COUNT(*) AS n FROM messages'),
    unread: one('SELECT COUNT(*) AS n FROM messages WHERE handled = 0'),
  };
  const interest = db.prepare(`
    SELECT c.title AS label,
      (SELECT COUNT(*) FROM registrations r WHERE r.interest = c.title) AS regs,
      (SELECT COUNT(*) FROM course_interest i WHERE i.course_id = c.id) AS interested,
      (SELECT COUNT(*) FROM enrolments e WHERE e.course_id = c.id AND e.status = 'paid') AS paid
    FROM courses c ORDER BY c.sort, c.id`).all();
  const allFour = db.prepare(`SELECT COUNT(*) AS n FROM registrations WHERE interest = 'All four'`).get().n;
  if (allFour) interest.push({ label: 'All four', regs: allFour, interested: '—', paid: '—' });
  render(res, adm.overviewPage({
    stats,
    interest,
    recentRegs: db.prepare('SELECT * FROM registrations ORDER BY id DESC LIMIT 5').all(),
    recentPays: db.prepare(`${enrolmentsQuery} ORDER BY e.id DESC LIMIT 5`).all(),
    csrf: res.locals.csrf,
    counts: counts(),
  }));
});

app.get('/admin/registrations', (req, res) => {
  const q = clean(req.query.q, 100);
  const rows = q
    ? db.prepare('SELECT * FROM registrations WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY id DESC LIMIT 500').all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM registrations ORDER BY id DESC LIMIT 500').all();
  render(res, adm.registrationsPage({ rows, q, csrf: res.locals.csrf, counts: counts() }));
});

app.get('/admin/enrolments', (req, res) => {
  const status = ['paid', 'pending', 'failed'].includes(req.query.status) ? req.query.status : '';
  const rows = status
    ? db.prepare(`${enrolmentsQuery} WHERE e.status = ? ORDER BY e.id DESC LIMIT 500`).all(status)
    : db.prepare(`${enrolmentsQuery} ORDER BY e.id DESC LIMIT 500`).all();
  render(res, adm.enrolmentsPage({ rows, status, flash: clean(req.query.flash, 200), csrf: res.locals.csrf, counts: counts() }));
});

app.post('/admin/enrolments/:id/recheck', async (req, res) => {
  const row = db.prepare('SELECT * FROM enrolments WHERE id = ?').get(Number(req.params.id));
  let flash = 'Enrolment not found.';
  if (row) {
    try {
      if (!pay.providers()[row.provider]) throw new Error(`${row.provider} keys are not set`);
      const v = row.provider === 'paystack' ? await pay.verifyPaystack(row.reference) : await pay.verifyFlutterwave({ reference: row.reference });
      const after = pay.recordResult(row.reference, v);
      flash = `${row.reference}: ${after.status}.`;
    } catch (err) {
      flash = `Could not check ${row.reference}: ${err.message}`;
    }
  }
  res.redirect(303, `/admin/enrolments?flash=${encodeURIComponent(flash)}`);
});

const interestQuery = `SELECT i.*, c.title AS course_title FROM course_interest i JOIN courses c ON c.id = i.course_id`;

app.get('/admin/interest', (req, res) => {
  const course = Number(req.query.course) || 0;
  const rows = course
    ? db.prepare(`${interestQuery} WHERE i.course_id = ? ORDER BY i.contacted, i.id DESC LIMIT 500`).all(course)
    : db.prepare(`${interestQuery} ORDER BY i.contacted, i.id DESC LIMIT 500`).all();
  const courses = db.prepare('SELECT id, title FROM courses ORDER BY sort, id').all();
  render(res, adm.interestPage({ rows, courses, course, csrf: res.locals.csrf, counts: counts() }));
});

app.post('/admin/interest/:id/toggle', (req, res) => {
  db.prepare('UPDATE course_interest SET contacted = 1 - contacted WHERE id = ?').run(Number(req.params.id));
  res.redirect(303, '/admin/interest');
});

app.get('/admin/interest.csv', (req, res) => {
  const rows = db.prepare(`${interestQuery} ORDER BY i.id`).all()
    .map((r) => ({ ...r, free: r.free_place ? 'Yes' : 'No', done: r.contacted ? 'Yes' : 'No' }));
  csv(res, 'course-interest.csv', rows, [['created_at', 'Date (UTC)'], ['name', 'Name'], ['email', 'Email'], ['phone', 'WhatsApp'],
    ['course_title', 'Course'], ['experience', 'Experience'], ['free', 'Free place requested'], ['done', 'Contacted']]);
});

app.get('/admin/messages', (req, res) => {
  const rows = db.prepare('SELECT * FROM messages ORDER BY handled, id DESC LIMIT 500').all();
  render(res, adm.messagesPage({ rows, csrf: res.locals.csrf, counts: counts() }));
});

app.post('/admin/messages/:id/toggle', (req, res) => {
  db.prepare('UPDATE messages SET handled = 1 - handled WHERE id = ?').run(Number(req.params.id));
  res.redirect(303, '/admin/messages');
});

app.get('/admin/courses', (req, res) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY sort, id').all();
  render(res, adm.coursesAdminPage({ courses, flash: req.query.saved ? 'Course saved.' : '', csrf: res.locals.csrf, counts: counts() }));
});

app.post('/admin/courses/:id', (req, res) => {
  const priceText = clean(req.body.price, 20).replace(/[₦,\s]/g, '');
  const price = priceText === '' ? null : Math.round(Number(priceText) * 100);
  if (price !== null && (!Number.isFinite(price) || price < 0)) return res.status(400).send('Fee must be a number, e.g. 75000.');
  db.prepare(`UPDATE courses SET title = ?, price_kobo = ?, duration = ?, start_date = ?, summary = ?, outcomes = ?,
    session_title = ?, session_desc = ?, session_demo = ?, session_exercise = ?, colour = ?, active = ? WHERE id = ?`).run(
    clean(req.body.title, 120) || 'Untitled course',
    price,
    clean(req.body.duration, 60),
    clean(req.body.start_date, 60),
    clean(req.body.summary, 300),
    cleanText(req.body.outcomes, 2000),
    clean(req.body.session_title, 160),
    clean(req.body.session_desc, 600),
    clean(req.body.session_demo, 400),
    clean(req.body.session_exercise, 400),
    ['blue', 'yellow', 'red', 'black'].includes(req.body.colour) ? req.body.colour : 'blue',
    req.body.active === '0' ? 0 : 1,
    Number(req.params.id),
  );
  res.redirect(303, '/admin/courses?saved=1');
});

app.get('/admin/settings', (req, res) => {
  render(res, adm.settingsPage({ s: getSettings(), payments: pay.providers(), flash: req.query.saved ? 'Saved.' : '', csrf: res.locals.csrf, counts: counts() }));
});

app.post('/admin/settings', (req, res) => {
  const values = { ...req.body };
  if ('webinar_attendance' in values) values.webinar_attendance = String(values.webinar_attendance).replace(/\D/g, '').slice(0, 7);
  for (const k of ['webinar_agenda', 'webinar_outcomes', 'webinar_audience', 'webinar_notes', 'webinar_resource_pack']) values[k] = cleanText(values[k], 3000);
  delete values._csrf;
  saveSettings(values);
  res.redirect(303, '/admin/settings?saved=1');
});

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

app.get('/admin/registrations.csv', (req, res) => {
  csv(res, 'webinar-registrations.csv', db.prepare('SELECT * FROM registrations ORDER BY id').all().map((r) => ({ ...r, cohort: r.cohort_updates ? 'Yes' : 'No' })),
    [['created_at', 'Date (UTC)'], ['name', 'Name'], ['email', 'Email'], ['phone', 'WhatsApp'], ['status', 'Status'], ['experience', 'Experience'],
      ['interest', 'Topic'], ['cohort', 'Cohort updates'], ['question', 'Question'], ['source', 'Source']]);
});

app.get('/admin/enrolments.csv', (req, res) => {
  const rows = db.prepare(`${enrolmentsQuery} ORDER BY e.id`).all().map((r) => ({ ...r, amount: (r.amount_kobo / 100).toFixed(2) }));
  csv(res, 'payments.csv', rows, [['created_at', 'Date (UTC)'], ['reference', 'Reference'], ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['experience', 'Experience'],
    ['course_title', 'Course'], ['amount', 'Amount (NGN)'], ['provider', 'Provider'], ['status', 'Status'], ['provider_tx', 'Provider transaction'], ['paid_at', 'Paid at (UTC)']]);
});

// ---------- Errors ----------

app.use((req, res) => page(res, { title: 'Not found', body: pub.notFoundPage(), status: 404 }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong. Please try again.');
});

export const paymentStatus = () => {
  const p = pay.providers();
  return `Payments: Paystack ${p.paystack ? 'on' : 'off'}, Flutterwave ${p.flutterwave ? 'on' : 'off'}${p.demo ? ', demo checkout on' : ''}`;
};

export default app;
