// End-to-end tests against the real app with the local file store.
// Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thebridge-test-'));
Object.assign(process.env, {
  LOCAL_STORE_DIR: dir,
  SHEET_API_URL: '',
  SHEET_API_KEY: '',
  FPROFILE_SHEET_URL: '',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'test-password-123456',
  SESSION_SECRET: 'x'.repeat(48),
  PAYMENT_DEMO: '1',
  NODE_ENV: 'test',
  BASE_URL: 'https://thebridge.example',
  PAYSTACK_SECRET_KEY: '',
  FLW_SECRET_KEY: '',
});

const { default: app } = await import('../app.js');
let server;
let base;

before(() => new Promise((resolve) => {
  server = app.listen(0, () => {
    base = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------- helpers ----------

let cookie = '';
const get = (p, opts = {}) => fetch(base + p, { redirect: 'manual', headers: { cookie, ...(opts.headers || {}) } });
const post = (p, body, opts = {}) => fetch(base + p, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie, ...(opts.headers || {}) },
  body: new URLSearchParams(body).toString(),
});
const html = async (p) => (await get(p)).text();
const store = () => JSON.parse(fs.readFileSync(path.join(dir, 'store.json'), 'utf8'));
const csrfFrom = (page) => /name="_csrf" value="([^"]+)"/.exec(page)[1];

async function login() {
  const r = await post('/admin/login', { username: 'admin', password: 'test-password-123456' });
  assert.equal(r.status, 303);
  cookie = r.headers.get('set-cookie').split(';')[0];
  return csrfFrom(await html('/admin'));
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const pngDataUrl = `data:image/png;base64,${PNG.toString('base64')}`;

// ---------- public site ----------

test('public pages render with security headers and edge caching', async () => {
  for (const p of ['/', '/courses', '/courses/cybersecurity', '/fprofile']) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.match(r.headers.get('cache-control'), /s-maxage=60/);
    assert.equal(r.headers.get('x-powered-by'), null);
  }
  const home = await html('/');
  assert.match(home, /Build, Automate and/);
  assert.match(home, /id="facilitators"/);
  assert.doesNotMatch(home, /fonts\.googleapis/, 'fonts are self-hosted');
});

test('unknown pages 404, trailing slashes redirect once', async () => {
  assert.equal((await get('/no-such-page')).status, 404);
  const r = await get('/courses/');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), '/courses');
});

test('SEO: canonical, social tags, structured data, robots and sitemap', async () => {
  const home = await html('/');
  assert.match(home, /<link rel="canonical" href="https:\/\/thebridge\.example\/">/);
  assert.match(home, /property="og:image" content="https:\/\/thebridge\.example\//);
  const blocks = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.ok(blocks.some((b) => b['@type'] === 'EducationalOrganization'));
  assert.ok(blocks.some((b) => b['@type'] === 'ItemList'));

  const course = await html('/courses/cybersecurity');
  assert.match(course, /<title>Cybersecurity · TheBridge<\/title>/);
  assert.match(course, /"@type":"Course"/);
  assert.match(course, /"@type":"BreadcrumbList"/);
  assert.match(await html('/courses'), /"@type":"FAQPage"/);

  assert.match(await html('/fprofile'), /<meta name="robots" content="noindex">/);

  const robots = await html('/robots.txt');
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Sitemap: https:\/\/thebridge\.example\/sitemap\.xml/);
  const sitemap = await html('/sitemap.xml');
  for (const p of ['/', '/courses', '/courses/software-development']) assert.ok(sitemap.includes(`<loc>https://thebridge.example${p}</loc>`), p);
});

test('webinar registration saves a row and rejects bad input', async () => {
  let r = await post('/register', { name: 'Ada Lovelace', email: 'ADA@Example.com', phone: '+234 801 000 0000', status: 'Student', experience: 'Complete beginner', interest: 'Cybersecurity', cohort_updates: '1' });
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), /status=registered/);
  const row = store()['Webinar DB'].at(-1);
  assert.equal(row.email, 'ada@example.com');
  assert.equal(row.interest, 'Cybersecurity');
  assert.equal(row.cohort_updates, 'Yes');

  r = await post('/register', { name: 'X', email: 'not-an-email', phone: '1' });
  assert.match(r.headers.get('location'), /status=invalid/);

  const before = store()['Webinar DB'].length;
  r = await post('/register', { name: 'Bot', email: 'bot@x.io', phone: '1', website: 'spam' });
  assert.match(r.headers.get('location'), /status=registered/, 'bots see success');
  assert.equal(store()['Webinar DB'].length, before, 'but nothing is saved');
});

test('contact form accepts email or WhatsApp, rejects neither', async () => {
  assert.match((await post('/contact', { name: 'Tolu', reach: '08012345678', body: 'Hello' })).headers.get('location'), /status=sent/);
  assert.match((await post('/contact', { name: 'Tolu', reach: 'abc', body: 'Hello' })).headers.get('location'), /status=badreach/);
  assert.equal(store().Messages.at(-1).phone, '08012345678');
});

test('course interest is recorded against the course', async () => {
  const r = await post('/interest', { course: 'cybersecurity', name: 'Bisi', email: 'bisi@example.com', phone: '0803', experience: 'Some experience', free_place: '1' });
  assert.match(r.headers.get('location'), /\/courses\/cybersecurity\?status=interested/);
  const row = store()['Pre -registration DB'].at(-1);
  assert.equal(row.course, 'Cybersecurity');
  assert.equal(row.free_place, 'Yes');
});

test('facilitator form: validation keeps answers, success saves row and photo', async () => {
  let r = await post('/fprofile', { name: 'Kemi', bio: 'too short' });
  assert.equal(r.status, 422);
  const page = await r.text();
  assert.match(page, /value="Kemi"/);
  assert.match(page, /at least 50 words/);

  const answers = {
    name: 'Kemi Adeyemi', phone: '+2348030000000', email: 'kemi@example.com', role: 'Security Engineer at Example',
    experience: '5+ years', bio: Array(55).fill('word').join(' '), photo_data: pngDataUrl, link: 'https://www.linkedin.com/in/kemi',
    courses: 'Cybersecurity', topic: '=HYPERLINK("x")', qualifications: 'CISSP', level: 'Beginner',
    takeaway1: 'a', takeaway2: 'b', takeaway3: 'c', outline: 'Intro', formats: 'Q&A', length: '20 Minutes', availability: 'Saturday', certificate: 'Yes',
  };
  r = await post('/fprofile', answers);
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/fprofile?status=sent');
  const row = store()["Facilitator's Profile"].at(-1);
  assert.equal(row.name, 'Kemi Adeyemi');
  assert.match(row.photo, /^local-file:/);
  assert.equal(row.takeaways, '1. a\n2. b\n3. c');

  r = await post('/fprofile', { ...answers, photo_data: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' });
  assert.equal(r.status, 422, 'SVG photo is refused');
});

// ---------- admin and security ----------

test('admin needs a login; wrong password is refused', async () => {
  cookie = '';
  assert.equal((await get('/admin/content')).headers.get('location'), '/admin/login');
  const r = await post('/admin/login', { username: 'admin', password: 'wrong' });
  assert.equal(r.status, 401);
  assert.equal(r.headers.get('set-cookie'), null);
  assert.equal((await get('/admin')).status, 302);
  const forged = 'tb_admin=abc.9999999999999.forged';
  assert.equal((await get('/admin', { headers: { cookie: forged } })).status, 302, 'forged session cookie rejected');
});

test('admin forms need the CSRF token', async () => {
  await login();
  const r = await post('/admin/content/webinar', { hero_badge: 'Hacked' });
  assert.equal(r.status, 403);
});

test('admin pages all load and are never cached', async () => {
  await login();
  for (const p of ['/admin', '/admin/registrations', '/admin/interest', '/admin/enrolments', '/admin/messages', '/admin/content', '/admin/courses', '/admin/facilitators', '/admin/submissions', '/admin/media']) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
    assert.equal(r.headers.get('cache-control'), 'no-store', p);
    assert.match(r.headers.get('x-robots-tag'), /noindex/, p);
  }
  for (const p of ['/admin/registrations.csv', '/admin/enrolments.csv', '/admin/interest.csv']) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
    assert.match(r.headers.get('content-type'), /text\/csv/);
  }
});

test('content edits show on the site, and HTML is escaped', async () => {
  const csrf = await login();
  let r = await post('/admin/content/webinar', { _csrf: csrf, hero_badge: '<script>alert(1)</script> Seats filling fast', webinar_start: '2026-12-05T16:00' });
  assert.equal(r.status, 303);
  const home = await html('/');
  assert.match(home, /&lt;script&gt;alert\(1\)&lt;\/script&gt; Seats filling fast/);
  assert.doesNotMatch(home, /<script>alert\(1\)<\/script>/);
  assert.match(home, /"@type":"Event"/, 'event appears once a start time is set');
  assert.match(home, /"startDate":"2026-12-05T16:00:00\+01:00"/);

  // Clearing a field brings back the default wording.
  await post('/admin/content/webinar', { _csrf: csrf, hero_badge: '' });
  assert.match(await html('/'), /Registration open · Free · 2 hours, live/);

  r = await post('/admin/content/brand', { _csrf: csrf, social_linkedin: 'javascript:alert(1)' });
  assert.match(decodeURIComponent(r.headers.get('location')), /full web address/);
  r = await post('/admin/content/intro', { _csrf: csrf, promo_video: 'https://example.com/video' });
  assert.match(decodeURIComponent(r.headers.get('location')), /YouTube link/);
  await post('/admin/content/intro', { _csrf: csrf, promo_video: 'https://youtu.be/dQw4w9WgXcQ' });
  assert.match(await html('/'), /data-yt="dQw4w9WgXcQ"/);
});

test('JSON-LD cannot break out of its script tag', async () => {
  const csrf = await login();
  await post('/admin/content/webinar', { _csrf: csrf, webinar_title: 'A</script><script>alert(1)</script>: sub' });
  const home = await html('/');
  assert.doesNotMatch(home, /<\/script><script>alert/);
  await post('/admin/content/webinar', { _csrf: csrf, webinar_title: '' });
});

test('courses: edit fee, add, hide and delete', async () => {
  const csrf = await login();
  let r = await post('/admin/courses/c3', { _csrf: csrf, title: 'Cybersecurity', price: '50,000', colour: 'red', active: '1', sort: '3', summary: 'Stay safe online.' });
  assert.equal(r.status, 303);
  assert.equal(store().Courses.length, 4, 'built-in courses written on first edit');
  assert.equal(store().Courses.find((c) => c.id === 'c3').price_kobo, '5000000');
  assert.match(await html('/courses/cybersecurity'), /₦50,000/);

  r = await post('/admin/courses/c3', { _csrf: csrf, title: 'Cybersecurity', price: 'abc' });
  assert.match(decodeURIComponent(r.headers.get('location')), /Fee must be a number/);

  await post('/admin/courses/new', { _csrf: csrf, title: 'Data Analysis' });
  const added = store().Courses.find((c) => c.title === 'Data Analysis');
  assert.equal(added.slug, 'data-analysis');
  assert.equal((await get('/courses/data-analysis')).status, 404, 'new courses start hidden');
  await post(`/admin/courses/${added.id}`, { _csrf: csrf, title: 'Data Analysis', active: '1', colour: 'yellow', sort: '5' });
  assert.equal((await get('/courses/data-analysis')).status, 200);
  assert.match(await html('/sitemap.xml'), /courses\/data-analysis/);
  await post(`/admin/courses/${added.id}/delete`, { _csrf: csrf });
  assert.equal((await get('/courses/data-analysis')).status, 404);
});

test('demo checkout: paid only after verification, amount from the server', async () => {
  const r = await post('/enrol', { course: 'cybersecurity', name: 'Femi', email: 'femi@example.com', phone: '0809', experience: 'Some experience', provider: 'paystack' });
  assert.equal(r.status, 303);
  const loc = r.headers.get('location');
  assert.match(loc, /\/payments\/demo\?reference=TB-/);
  const reference = new URL(loc, base).searchParams.get('reference');
  const row = store().Payments.find((e) => e.reference === reference);
  assert.equal(row.amount_kobo, '5000000');
  assert.equal(row.status, 'pending');

  const pay = await post('/payments/demo', { reference, outcome: 'success' });
  assert.equal(pay.status, 303);
  assert.equal(store().Payments.find((e) => e.reference === reference).status, 'paid');
  const result = await get(`/payments/result/${reference}`);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.match(await result.text(), /Payment confirmed/);
});

test('media: uploads are type-checked, served with ranges, protected while in use', async () => {
  const csrf = await login();
  const upload = (data, name) => fetch(`${base}/admin/media/upload`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ _csrf: csrf, data, name }),
  });

  let r = await upload('data:image/png;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+', 'evil.png');
  assert.equal(r.status, 400, 'SVG pretending to be PNG is refused');
  r = await fetch(`${base}/admin/media/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ data: pngDataUrl, name: 'x.png' }) });
  assert.equal(r.status, 403, 'upload needs CSRF');

  r = await upload(pngDataUrl, 'Team Photo.PNG');
  assert.equal(r.status, 200);
  const { media } = await r.json();
  assert.equal(media.name, 'team-photo.png');
  assert.equal(media.kind, 'image');

  let file = await get(media.url);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'image/png');
  assert.match(file.headers.get('cache-control'), /immutable/);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), PNG);
  file = await get(media.url, { headers: { range: 'bytes=0-7' } });
  assert.equal(file.status, 206);
  assert.equal(file.headers.get('content-range'), `bytes 0-7/${PNG.length}`);

  // Use it as a facilitator photo; it can't be deleted while in use.
  r = await post('/admin/facilitators/f3', { _csrf: csrf, name: 'Kemi Adeyemi', role: 'Security Engineer', course_id: 'c3', photo: media.id, linkedin: 'https://www.linkedin.com/in/kemi', active: '1', sort: '3' });
  assert.equal(r.status, 303);
  const home = await html('/');
  assert.match(home, new RegExp(`src="${media.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  assert.match(home, /Kemi Adeyemi/);
  r = await post(`/admin/media/${media.id}/delete`, { _csrf: csrf });
  assert.match(decodeURIComponent(r.headers.get('location')), /still used by Kemi Adeyemi/);

  r = await post('/admin/facilitators/f3', { _csrf: csrf, name: 'Kemi', linkedin: 'javascript:alert(1)' });
  assert.match(decodeURIComponent(r.headers.get('location')), /full web address/);
});

test('facilitator form submission can fill a website profile', async () => {
  const csrf = await login();
  const sub = store()["Facilitator's Profile"].at(-1);
  const r = await post('/admin/submissions/use', { _csrf: csrf, submitted_at: sub.submitted_at, email: sub.email, facilitator_id: 'f2' });
  assert.equal(r.status, 303);
  const f = store().Facilitators.find((x) => x.id === 'f2');
  assert.equal(f.name, 'Kemi Adeyemi');
  assert.equal(f.linkedin, 'https://www.linkedin.com/in/kemi');
  assert.ok(f.photo.startsWith('m_'), 'photo copied into the media library');
});
