import { store, newId, nowUtc } from './store.js';
import { mergeContent, SEED_COURSES, SEED_FACILITATORS } from './content.js';

// ---------- Site content (cached) ----------
// One sheet request loads all public content. It is kept in memory for a
// minute and the pages are cached at Vercel's edge as well, so visitors almost
// never wait on Google. Admin edits clear this instance's copy straight away;
// other instances and the edge pick them up within about a minute.

const TTL_MS = 60e3;
let cache = null;
let inflight = null;

const bySort = (a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0);
const lines = (t) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean);

function shapeCourse(c) {
  return {
    ...c,
    price_kobo: c.price_kobo === '' || c.price_kobo == null ? null : Number(c.price_kobo),
    active: c.active !== '0',
    colour: ['blue', 'yellow', 'red', 'black'].includes(c.colour) ? c.colour : 'blue',
  };
}

function shapeFacilitator(f) {
  return { ...f, active: f.active !== '0', qualifications: lines(f.qualifications) };
}

export function shapeSite({ content, courses, facilitators, media }) {
  const allCourses = (courses.length ? courses : SEED_COURSES).map(shapeCourse).sort(bySort);
  const allFacilitators = (facilitators.length ? facilitators : SEED_FACILITATORS).map(shapeFacilitator).sort(bySort);
  const mediaById = Object.fromEntries(media.map((m) => [m.id, m]));
  return {
    settings: mergeContent(content),
    allCourses,
    courses: allCourses.filter((c) => c.active),
    allFacilitators,
    facilitators: allFacilitators.filter((f) => f.active),
    media,
    mediaById,
    seeded: { courses: courses.length > 0, facilitators: facilitators.length > 0 },
  };
}

async function loadSite() {
  const [content, courses, facilitators, media] = await store.listMany(['content', 'courses', 'facilitators', 'media']);
  const value = shapeSite({ content, courses, facilitators, media });
  cache = { at: Date.now(), value };
  return value;
}

export async function getSite({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;
  inflight ||= loadSite().finally(() => { inflight = null; });
  try {
    return await inflight;
  } catch (err) {
    console.error('Loading site content failed:', err.message);
    // Never take the site down because Google is slow: serve the last copy, or the defaults.
    if (cache) return cache.value;
    return { ...shapeSite({ content: [], courses: [], facilitators: [], media: [] }), degraded: true };
  }
}

export const invalidateSite = () => { cache = null; };

/** Writes the built-in courses or facilitators to the sheet the first time an admin edits them. */
export async function ensureSeeded(table) {
  const site = await getSite({ fresh: true });
  if (site.seeded[table]) return;
  const seed = table === 'courses' ? SEED_COURSES : SEED_FACILITATORS;
  await store.updateMany(table, seed.map((row) => ({ id: row.id, patch: row })), { upsert: true });
  invalidateSite();
}

// ---------- Media ----------

export const mediaUrl = (m) => (m ? `/media/${m.id}/${encodeURIComponent(m.name || 'file')}` : '');

/** Resolves a stored media id to { url, type, alt }, or null. */
export function media(site, id) {
  const m = id && site.mediaById[id];
  return m ? { url: mediaUrl(m), type: m.type, alt: m.alt || '', name: m.name } : null;
}

// ---------- Submissions ----------

const stamp = (row, prefix) => ({ id: newId(prefix), created_at: nowUtc(), ...row });

export const addRegistration = (row) => store.append('registrations', stamp(row, 'r_'));
export const addMessage = (row) => store.append('messages', stamp({ handled: '0', ...row }, 'm_'));
export const addInterest = (row) => store.append('interest', stamp({ contacted: '0', ...row }, 'i_'));
export const addEnrolment = (row) => store.append('enrolments', stamp({ status: 'pending', ...row }, 'e_'));

export async function findEnrolment(reference) {
  return (await store.list('enrolments')).find((e) => e.reference === reference) || null;
}

export const updateEnrolment = (reference, patch) => store.update('enrolments', reference, patch, { match: 'reference' });

// Newest first, for the admin tables.
export async function listNewest(table) {
  return (await store.list(table)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}
