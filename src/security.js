import crypto from 'node:crypto';

const COOKIE = 'tb_admin';
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set to at least 32 characters (see .env.example).');
  return s;
}

const sign = (value) => crypto.createHmac('sha256', secret()).update(value).digest('base64url');

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function checkAdminLogin(username, password) {
  const u = process.env.ADMIN_USERNAME || 'admin';
  const p = process.env.ADMIN_PASSWORD;
  if (!p || p === 'change-this-to-a-long-password') return false;
  // Compare hashes so timing does not leak the length of the real values.
  const h = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
  const userOk = safeEqual(h(username), h(u));
  const passOk = safeEqual(h(password), h(p));
  return userOk && passOk;
}

export function startSession(res) {
  const payload = `${crypto.randomBytes(16).toString('hex')}.${Date.now() + SESSION_HOURS * 3600e3}`;
  const value = `${payload}.${sign(payload)}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

export function endSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function readSession(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return null;
  const [id, exp, sig] = raw.split('.');
  if (!id || !exp || !sig || !safeEqual(sig, sign(`${id}.${exp}`))) return null;
  if (Date.now() > Number(exp)) return null;
  return { id, csrf: sign(`csrf:${id}`) };
}

/** Requires a valid admin session; on POST also requires the CSRF token. */
export function requireAdmin(req, res, next) {
  const session = readSession(req);
  if (!session) return res.redirect('/admin/login');
  if (req.method === 'POST' && !safeEqual(req.body?._csrf || '', session.csrf)) {
    return res.status(403).send('Form expired. Go back, refresh the page and try again.');
  }
  res.locals.csrf = session.csrf;
  next();
}

/** Simple in-memory fixed-window rate limiter keyed by IP. */
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const key = req.ip;
    const n = (hits.get(key) || 0) + 1;
    hits.set(key, n);
    if (n > max) return res.status(429).send(message || 'Too many requests. Please wait a few minutes and try again.');
    next();
  };
}

export const newReference = () => `TB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

export { safeEqual };
