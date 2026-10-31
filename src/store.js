import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Every table the site keeps, as [key, column heading] pairs. In production
// each one is a tab in the Bridge Database Google Sheet (see
// scripts/bridge-sheet.gs); in development they live in data/store.json.
export const TABLES = {
  registrations: {
    tab: 'Webinar DB',
    columns: [['id', 'ID'], ['created_at', 'Date (UTC)'], ['name', 'Full name'], ['email', 'Email'], ['phone', 'WhatsApp'],
      ['status', 'Current status'], ['experience', 'Experience level'], ['interest', 'Topic of interest'], ['question', 'Question'],
      ['cohort_updates', 'Wants cohort updates'], ['source', 'Heard about us']],
  },
  interest: {
    tab: 'Pre -registration DB',
    columns: [['id', 'ID'], ['created_at', 'Date (UTC)'], ['course_id', 'Course ID'], ['course', 'Course'], ['name', 'Full name'],
      ['email', 'Email'], ['phone', 'WhatsApp'], ['experience', 'Experience level'], ['free_place', 'Free place requested'], ['contacted', 'Contacted']],
  },
  enrolments: {
    tab: 'Payments',
    columns: [['id', 'ID'], ['created_at', 'Date (UTC)'], ['reference', 'Reference'], ['course_id', 'Course ID'], ['course', 'Course'],
      ['name', 'Full name'], ['email', 'Email'], ['phone', 'WhatsApp'], ['experience', 'Experience level'], ['provider', 'Provider'],
      ['amount_kobo', 'Amount (kobo)'], ['status', 'Status'], ['provider_tx', 'Provider transaction'], ['paid_at', 'Paid at (UTC)']],
  },
  messages: {
    tab: 'Messages',
    columns: [['id', 'ID'], ['created_at', 'Date (UTC)'], ['name', 'Name'], ['email', 'Email'], ['phone', 'WhatsApp'],
      ['subject', 'Topic'], ['body', 'Message'], ['handled', 'Handled']],
  },
  content: {
    tab: 'Site content',
    columns: [['key', 'Key'], ['value', 'Value'], ['updated_at', 'Updated (UTC)']],
  },
  courses: {
    tab: 'Courses',
    columns: [['id', 'ID'], ['sort', 'Order'], ['active', 'Visible'], ['slug', 'URL slug'], ['title', 'Title'], ['colour', 'Colour'],
      ['summary', 'Summary'], ['outcomes', 'Outcomes'], ['duration', 'Duration'], ['start_date', 'Start date'], ['price_kobo', 'Fee (kobo)'],
      ['session_title', 'Webinar session title'], ['session_desc', 'Webinar session description'], ['session_demo', 'Webinar demo'],
      ['session_exercise', 'Starter exercise'], ['video', 'Video (YouTube)']],
  },
  facilitators: {
    tab: 'Facilitators',
    columns: [['id', 'ID'], ['sort', 'Order'], ['active', 'Visible'], ['course_id', 'Course ID'], ['name', 'Name'], ['role', 'Role'],
      ['photo', 'Photo'], ['bio', 'Bio'], ['qualifications', 'Qualifications'], ['linkedin', 'LinkedIn'], ['x', 'X (Twitter)'],
      ['github', 'GitHub'], ['instagram', 'Instagram'], ['website', 'Website'], ['video', 'Video (YouTube)'], ['audio', 'Audio intro']],
  },
  media: {
    tab: 'Media',
    columns: [['id', 'ID'], ['created_at', 'Date (UTC)'], ['name', 'File name'], ['type', 'Type'], ['size', 'Size (bytes)'],
      ['alt', 'Description'], ['drive_id', 'Drive file ID']],
  },
  fprofile: {
    tab: "Facilitator's Profile",
    columns: [['submitted_at', 'Submitted at'], ['name', 'Full name'], ['phone', 'WhatsApp number'], ['email', 'Email address'],
      ['role', 'Current role & organisation'], ['experience', 'Years of experience'], ['bio', 'Professional bio'], ['photo', 'Photo'],
      ['link', 'LinkedIn / portfolio'], ['courses', 'Course(s) assigned'], ['topic', 'Session topic'],
      ['qualifications', 'Qualifications & experience'], ['level', 'Session level'], ['takeaways', '3 key things attendees will learn'],
      ['outline', 'Session outline / agenda'], ['formats', 'Delivery format'], ['length', 'Session length'],
      ['tools', 'Tools to install before class'], ['availability', 'Available date & time'], ['requirements', 'Special requirements'],
      ['certificate', 'Certificate / follow-up resources'], ['comments', 'Additional comments']],
  },
};

export const newId = (prefix = '') => prefix + crypto.randomBytes(6).toString('base64url');
export const nowUtc = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const sheetUrl = () => (process.env.SHEET_API_URL || process.env.FPROFILE_SHEET_URL || '').trim(); // trim() also drops a stray BOM
const sheetKey = () => (process.env.SHEET_API_KEY || '').trim();
export const usingSheet = () => Boolean(sheetUrl() && sheetKey());

const spec = (table) => {
  const t = TABLES[table];
  if (!t) throw new Error(`Unknown table ${table}`);
  return { tab: t.tab, columns: t.columns };
};

// ---------- Google Sheet backend ----------

async function call(body, timeout = 25000) {
  const res = await fetch(sheetUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: sheetKey(), ...body }),
    signal: AbortSignal.timeout(timeout),
  });
  const out = await res.json().catch(() => null);
  if (!out) throw new Error(`Sheet API responded ${res.status}`);
  if (!out.ok) throw new Error(`Sheet API: ${out.error || 'request failed'}`);
  return out;
}

const sheet = {
  async listMany(tables) {
    return (await call({ action: 'list', tables: tables.map(spec) })).tables;
  },
  async append(table, row, files) {
    return (await call({ action: 'append', ...spec(table), row, files })).row;
  },
  async update(table, id, patch, { match = 'id', upsert = false } = {}) {
    return (await call({ action: 'update', ...spec(table), id, patch, match, upsert })).row;
  },
  async updateMany(table, items, { match = 'id', upsert = false } = {}) {
    if (!items.length) return [];
    return (await call({ action: 'update_many', ...spec(table), items, match, upsert })).rows;
  },
  async remove(table, id, { match = 'id' } = {}) {
    return (await call({ action: 'remove', ...spec(table), id, match })).removed;
  },
  async upload(file) {
    return (await call({ action: 'upload', file }, 40000)).file;
  },
  async readFile(id) {
    return (await call({ action: 'file', id }, 40000)).file;
  },
  async deleteFile(id) {
    return (await call({ action: 'delete_file', id })).removed;
  },
};

// ---------- Local JSON backend (development and tests) ----------

function localStore() {
  // Vercel can only write to /tmp, which is wiped on restart: fine for a preview, not real data.
  const dir = path.resolve(process.env.LOCAL_STORE_DIR || (process.env.VERCEL ? '/tmp/thebridge' : './data'));
  const file = path.join(dir, 'store.json');
  const filesDir = path.join(dir, 'files');
  let data = null;
  const load = () => {
    if (!data) {
      try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { data = {}; }
    }
    return data;
  };
  const save = () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 1));
  };
  const rows = (table) => (load()[TABLES[table].tab] ||= []);
  const keys = (table) => TABLES[table].columns.map(([k]) => k);
  const shape = (table, row) => Object.fromEntries(keys(table).map((k) => [k, row[k] == null ? '' : String(row[k])]));
  const saveFile = (f) => {
    const id = newId();
    fs.mkdirSync(filesDir, { recursive: true });
    const bytes = Buffer.from(f.data, 'base64');
    fs.writeFileSync(path.join(filesDir, id), bytes);
    fs.writeFileSync(path.join(filesDir, `${id}.json`), JSON.stringify({ type: f.type, name: f.name }));
    return { id, size: bytes.length, url: `local-file:${id}` };
  };
  return {
    async listMany(tables) {
      return tables.map((t) => rows(t).map((r) => ({ ...r })));
    },
    async append(table, row, files) {
      const r = { ...row };
      for (const [k, f] of Object.entries(files || {})) r[k] = saveFile(f).url;
      const out = shape(table, r);
      rows(table).push(out);
      save();
      return { ...out };
    },
    async update(table, id, patch, { match = 'id', upsert = false } = {}) {
      const list = rows(table);
      const r = list.find((x) => x[match] === String(id));
      if (!r) return upsert ? this.append(table, { ...patch, [match]: id }) : null;
      for (const [k, v] of Object.entries(patch)) if (keys(table).includes(k)) r[k] = v == null ? '' : String(v);
      save();
      return { ...r };
    },
    async updateMany(table, items, opts) {
      const out = [];
      for (const it of items) out.push(await this.update(table, it.id, it.patch, opts));
      return out;
    },
    async remove(table, id, { match = 'id' } = {}) {
      const list = rows(table);
      const i = list.findIndex((x) => x[match] === String(id));
      if (i < 0) return false;
      list.splice(i, 1);
      save();
      return true;
    },
    async upload(f) {
      return saveFile(f);
    },
    async readFile(id) {
      if (!/^[\w-]+$/.test(id)) throw new Error('File not found');
      const meta = JSON.parse(fs.readFileSync(path.join(filesDir, `${id}.json`), 'utf8'));
      return { ...meta, data: fs.readFileSync(path.join(filesDir, id)).toString('base64') };
    },
    async deleteFile(id) {
      if (!/^[\w-]+$/.test(id)) return false;
      fs.rmSync(path.join(filesDir, id), { force: true });
      fs.rmSync(path.join(filesDir, `${id}.json`), { force: true });
      return true;
    },
  };
}

let local;
const backend = () => (usingSheet() ? sheet : (local ||= localStore()));

export const store = {
  listMany: (tables) => backend().listMany(tables),
  list: async (table) => (await backend().listMany([table]))[0],
  append: (table, row, files) => backend().append(table, row, files),
  update: (table, id, patch, opts) => backend().update(table, id, patch, opts),
  updateMany: (table, items, opts) => backend().updateMany(table, items, opts),
  remove: (table, id, opts) => backend().remove(table, id, opts),
  upload: (file) => backend().upload(file),
  readFile: (id) => backend().readFile(id),
  deleteFile: (id) => backend().deleteFile(id),
};
