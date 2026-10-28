import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Vercel functions can only write to /tmp, and it is wiped between cold starts:
// fine for a preview, not for real data (see README, "Hosting").
const defaultPath = process.env.VERCEL ? '/tmp/thebridge.db' : './data/thebridge.db';
const dbPath = path.resolve(process.env.DATABASE_PATH || defaultPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS courses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  colour      TEXT NOT NULL DEFAULT 'blue',
  summary     TEXT NOT NULL DEFAULT '',
  outcomes    TEXT NOT NULL DEFAULT '',
  duration    TEXT NOT NULL DEFAULT '',
  start_date  TEXT NOT NULL DEFAULT '',
  price_kobo  INTEGER,
  session_title    TEXT NOT NULL DEFAULT '',
  session_desc     TEXT NOT NULL DEFAULT '',
  session_demo     TEXT NOT NULL DEFAULT '',
  session_exercise TEXT NOT NULL DEFAULT '',
  active      INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT '',
  experience TEXT NOT NULL DEFAULT '',
  interest   TEXT NOT NULL DEFAULT '',
  question   TEXT NOT NULL DEFAULT '',
  cohort_updates INTEGER NOT NULL DEFAULT 0,
  source     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  subject    TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  handled    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS course_interest (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES courses(id),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  experience  TEXT NOT NULL DEFAULT '',
  free_place  INTEGER NOT NULL DEFAULT 0,
  contacted   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrolments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reference   TEXT NOT NULL UNIQUE,
  course_id   INTEGER NOT NULL REFERENCES courses(id),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  experience  TEXT NOT NULL DEFAULT '',
  provider    TEXT NOT NULL,
  amount_kobo INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  provider_tx TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at     TEXT
);
`);

const DEFAULT_SETTINGS = {
  webinar_title: 'Build, Automate and Secure: Your First Practical Step into Tech',
  webinar_tagline: 'A free practical webinar for students, recent graduates, jobseekers and career switchers. Four facilitators, four fields, and one clear place to start.',
  webinar_audience: ['Students', 'Recent graduates', 'Jobseekers', 'Career switchers'].join('\n'),
  webinar_date: '',
  webinar_time: '',
  webinar_platform: 'Online (live)',
  webinar_join_link: '',
  webinar_agenda: [
    '0–5 min | Programme coordinator | Welcome, giveback purpose, speaker introductions and an opening audience poll.',
    '5–25 min | Programme coordinator | Product thinking and automation: session, demonstration and starter exercise.',
    '25–45 min | Developer | Software development: session, webpage demonstration and starter exercise.',
    '45–65 min | Cybersecurity expert | Cybersecurity: session, simulated message review and starter exercise.',
    '65–85 min | Blockchain security expert | Blockchain security: session, permissions demonstration and starter exercise.',
    '85–115 min | All four facilitators | Moderated questions and discussion of learning paths, projects and getting started.',
    '115–120 min | Programme coordinator | Exit poll, resource instructions, feedback form and an invitation to show cohort interest.',
  ].join('\n'),
  webinar_outcomes: [
    'Describe the purpose of each of the four learning areas in your own words.',
    'Map a repeated task as a simple automation workflow.',
    'Identify the basic components used to build a webpage.',
    'Recognise the signs of a suspicious message and name one account protection measure.',
    'Explain a basic permission risk in a blockchain application.',
    'Choose one learning path and one exercise to finish within the following week.',
  ].join('\n'),
  webinar_resource_pack: 'The four presentations or summaries, four starter exercises, starter files, learning links and answers to common questions. We send it within 48 hours, along with a feedback form.',
  webinar_notes: [
    'Watch on a phone or a computer',
    'No software to install during the webinar',
    'A computer helps for some follow-up exercises',
    'Any recording arrangements are explained here at registration and again at the start of the event.',
  ].join('\n'),
  webinar_attendance: '',
  contact_email: 'mail.oluwanifemi@gmail.com',
  contact_whatsapp: '+234 707 070 4095',
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(k, v);

if (db.prepare('SELECT COUNT(*) AS n FROM courses').get().n === 0) {
  // The four webinar fields double as the four cohort courses.
  const add = db.prepare(`INSERT INTO courses (slug, title, colour, summary, session_title, session_desc, session_demo, session_exercise, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  add.run('product-thinking-automation', 'Product thinking and automation', 'blue',
    'Identify a useful problem, map a solution and automate repetitive work.',
    'Solving Everyday Problems with Technology',
    'Identify a useful problem, describe who it affects and map the steps of a solution. See how a simple automation removes repetitive work.',
    'Turn a form submission into an organised task or follow-up workflow, using sample information.',
    'Pick one repeated task and sketch its trigger, steps and intended result.',
    1);
  add.run('software-development', 'Software development', 'yellow',
    'Build on HTML, CSS and JavaScript towards working websites and web apps.',
    'From an Idea to a Working Website',
    'Front-end and back-end development in plain language, and the role of HTML, CSS and JavaScript in a webpage.',
    'Build or edit a simple personal portfolio page from prepared starter files.',
    'Personalise the page, or sketch a useful website and its main features.',
    2);
  add.run('cybersecurity', 'Cybersecurity', 'red',
    'Recognise risks, apply controls and learn to communicate your findings.',
    'Protecting Your Digital Life',
    'Phishing, account protection, multifactor authentication and device hygiene, and how security work spots risks and applies controls.',
    'Review a simulated suspicious message and a sample account security checklist.',
    'Review your own security settings and write three improvements, without sharing private details.',
    3);
  add.run('blockchain-security', 'Blockchain security', 'black',
    'Lay the foundations for securing smart contracts and decentralised apps.',
    'Understanding and Securing Blockchain Applications',
    'Blockchains, smart contracts and decentralised apps, and how permissions, transactions and contract logic can create security risks.',
    'Walk through a contract permission or transaction approval scenario in a test environment.',
    'Identify the users, permissions and one possible risk in a simple blockchain app.',
    4);
}

export function getSettings() {
  const out = {};
  for (const row of db.prepare('SELECT key, value FROM settings').all()) out[row.key] = row.value;
  return out;
}

export function saveSettings(values) {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    if (k in values) up.run(k, String(values[k] ?? '').trim());
  }
}

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
