import { esc, naira, whatsappLink, ASSET_V } from './layout.js';
import { CONTENT_GROUPS } from '../content.js';
import { mediaUrl } from '../data.js';
import { youtubeId } from './public.js';

const csrfField = (csrf) => `<input type="hidden" name="_csrf" value="${esc(csrf)}">`;
const when = (s) => (s ? esc(String(s).replace('T', ' ').slice(0, 16)) + ' UTC' : '');
const flashBox = (flash) => (flash ? `<div class="alert toast${/saved|added|deleted|now in|uploaded/i.test(flash) ? ' ok' : ''}" role="status">${esc(flash)}</div>` : '');

function shell({ title, active, body, csrf, unread }) {
  const items = [
    ['/admin', 'Overview', 'overview'],
    ['/admin/registrations', 'Webinar sign-ups', 'registrations'],
    ['/admin/interest', 'Course interest', 'interest'],
    ['/admin/enrolments', 'Payments', 'enrolments'],
    ['/admin/messages', 'Messages', 'messages', unread],
    ['—', 'Website'],
    ['/admin/content', 'Site content', 'content'],
    ['/admin/courses', 'Courses', 'courses'],
    ['/admin/facilitators', 'Facilitators', 'facilitators'],
    ['/admin/submissions', 'Facilitator forms', 'submissions'],
    ['/admin/media', 'Media library', 'media'],
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} · TheBridge Admin</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/site.css?v=${ASSET_V}"><link rel="stylesheet" href="/css/admin.css?v=${ASSET_V}">
<script src="/js/admin.js?v=${ASSET_V}" defer></script>
</head>
<body class="admin" data-csrf="${esc(csrf)}">
<div class="admin-shell">
  <aside class="admin-side">
    <a class="brand" href="/admin"><img src="/brand/mark-reversed.svg" alt="" width="38" height="34"><span class="brand-name"><span>The</span><b>Bridge</b></span></a>
    ${items.map(([href, label, key, n]) => (href === '—'
      ? `<span class="nav-group">${label}</span>`
      : `<a class="nav-item" href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}${n ? `<span class="count">${n}</span>` : ''}</a>`)).join('')}
    <a class="nav-item" href="/" target="_blank">View site ↗</a>
    <form method="post" action="/admin/logout">${csrfField(csrf)}<button type="submit">Log out</button></form>
  </aside>
  <main class="admin-main">${body}</main>
</div>
</body>
</html>`;
}

export function loginPage({ error }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Admin login · TheBridge</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/site.css?v=${ASSET_V}"><link rel="stylesheet" href="/css/admin.css?v=${ASSET_V}"></head>
<body><div class="login-wrap on-dark"><div class="card">
  <a class="brand" href="/" style="margin-bottom:22px"><img src="/brand/mark.svg" alt="" width="44" height="40"><span class="brand-name"><span>The</span><b>Bridge</b></span></a>
  <h1 style="font-size:1.6rem">Admin sign in</h1>
  ${error ? `<div class="alert err">${esc(error)}</div>` : ''}
  <form class="form" method="post" action="/admin/login">
    <label>Username<input name="username" required autocomplete="username"></label>
    <label>Password<input name="password" type="password" required autocomplete="current-password"></label>
    <button class="btn btn-block" type="submit" style="background:var(--black);color:#fff;border-color:var(--black)">Sign in</button>
  </form>
</div></div></body></html>`;
}

const pill = (status) => `<span class="pill ${esc(status)}">${esc(status)}</span>`;
const yesNo = (v) => (v === 'Yes' || v === '1' ? '<span class="pill paid">Yes</span>' : 'No');

function enrolmentRows(rows, csrf) {
  if (!rows.length) return '<div class="empty">No payments yet.</div>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Name</th><th>Contact</th><th>Course</th><th>Amount</th><th>Via</th><th>Status</th><th>Reference</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td class="nowrap">${when(r.created_at)}</td>
      <td>${esc(r.name)}</td>
      <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a><br>${esc(r.phone)}</td>
      <td>${esc(r.course)}</td>
      <td class="nowrap">${esc(naira(Number(r.amount_kobo)))}</td>
      <td>${esc(r.provider)}</td>
      <td>${pill(r.status)}${r.status === 'pending' ? `<br><form class="inline" method="post" action="/admin/enrolments/${encodeURIComponent(r.reference)}/recheck">${csrfField(csrf)}<button class="link-btn" type="submit">Re-check</button></form>` : ''}</td>
      <td class="nowrap"><code>${esc(r.reference)}</code></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function registrationRows(rows) {
  if (!rows.length) return '<div class="empty">No sign-ups yet.</div>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Name</th><th>Contact</th><th>Status</th><th>Experience</th><th>Topic</th><th>Cohort updates</th><th>Question</th><th>Source</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td class="nowrap">${when(r.created_at)}</td><td>${esc(r.name)}</td>
      <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a><br><span class="nowrap">${esc(r.phone)}</span></td>
      <td>${esc(r.status)}</td><td>${esc(r.experience)}</td><td>${esc(r.interest)}</td>
      <td>${yesNo(r.cohort_updates)}</td>
      <td style="white-space:pre-wrap;min-width:200px">${esc(r.question)}</td><td>${esc(r.source)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

export function overviewPage({ stats, recentRegs, recentPays, interest, system, csrf, unread }) {
  const on = (ok, yes, no) => (ok ? `<span class="pill paid">${yes}</span>` : `<span class="pill failed">${no}</span>`);
  const body = `
  <div class="admin-top"><h1>Overview</h1></div>
  ${!system.sheet && system.production ? '<div class="alert err"><strong>Data is not being saved permanently.</strong> The Google Sheet connection (SHEET_API_URL and SHEET_API_KEY) is not set, so sign-ups and edits are lost when the server restarts.</div>' : ''}
  ${system.degraded ? '<div class="alert err">The Google Sheet could not be reached just now, so the site is showing its built-in defaults. Try again in a minute.</div>' : ''}
  <div class="stats">
    <div class="stat"><small>Webinar sign-ups</small><strong>${stats.regs}</strong><span>${stats.regs7} in the last 7 days · ${stats.cohort} want cohort updates</span></div>
    <div class="stat"><small>Live attendance</small><strong>${stats.attendance === '' ? '—' : esc(stats.attendance)}</strong><span><a href="/admin/content#webinar">${stats.attendance === '' ? 'Enter after the webinar' : 'Update'}</a></span></div>
    <div class="stat"><small>Course interest</small><strong>${stats.interest}</strong><span>${stats.freePlaces} asked for a free place</span></div>
    <div class="stat"><small>Payments received</small><strong>${esc(naira(stats.revenue))}</strong><span>${stats.paid} paid · ${stats.pending} pending</span></div>
    <div class="stat"><small>Unread messages</small><strong>${stats.unread}</strong><span>${stats.messages} total</span></div>
  </div>
  <div class="panel"><div class="panel-head"><h2>Interest by field</h2></div><div class="table-wrap"><table>
    <thead><tr><th>Field</th><th>Webinar sign-ups</th><th>Course interest</th><th>Paid enrolments</th></tr></thead>
    <tbody>${interest.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.regs}</td><td>${r.interested}</td><td>${r.paid}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No data yet.</td></tr>'}</tbody>
  </table></div></div>
  <div class="panel"><div class="panel-head"><h2>Latest sign-ups</h2><a href="/admin/registrations">See all</a></div>${registrationRows(recentRegs)}</div>
  <div class="panel"><div class="panel-head"><h2>Latest payments</h2><a href="/admin/enrolments">See all</a></div>${enrolmentRows(recentPays, csrf)}</div>
  <div class="panel"><div class="panel-head"><h2>System</h2></div><div class="panel-body">
    <div class="status-row">
      <span>Data storage ${on(system.sheet, 'Google Sheet', 'temporary file')}</span>
      <span>Paystack ${on(system.payments.paystack, 'connected', 'not set')}</span>
      <span>Flutterwave ${on(system.payments.flutterwave, 'connected', 'not set')}</span>
      ${system.payments.demo ? '<span>Demo checkout <span class="pill pending">on</span></span>' : ''}
    </div>
    <p class="muted" style="margin:14px 0 0">Site address: <code>${esc(system.baseUrl)}</code>. Payment keys and the sheet connection are set as environment variables on the server, so they never pass through the browser.</p>
  </div></div>`;
  return shell({ title: 'Overview', active: 'overview', body, csrf, unread });
}

export function registrationsPage({ rows, q, csrf, unread }) {
  const body = `
  <div class="admin-top"><h1>Webinar sign-ups</h1><a class="btn btn-sm" href="/admin/registrations.csv">Download CSV</a></div>
  <div class="panel"><div class="panel-head">
    <form class="filters" method="get"><input name="q" value="${esc(q)}" placeholder="Search name, email, phone"><button class="btn btn-sm" type="submit">Search</button>${q ? '<a href="/admin/registrations">Clear</a>' : ''}</form>
    <span class="muted">${rows.length} shown</span>
  </div>${registrationRows(rows)}</div>`;
  return shell({ title: 'Webinar sign-ups', active: 'registrations', body, csrf, unread });
}

export function enrolmentsPage({ rows, status, flash, csrf, unread }) {
  const tabs = ['all', 'paid', 'pending', 'failed'];
  const body = `
  <div class="admin-top"><h1>Payments</h1><a class="btn btn-sm" href="/admin/enrolments.csv">Download CSV</a></div>
  ${flashBox(flash)}
  <div class="panel"><div class="panel-head">
    <div class="filters">${tabs.map((t) => `<a href="/admin/enrolments${t === 'all' ? '' : `?status=${t}`}"${status === t || (!status && t === 'all') ? ' class="current"' : ''}>${t[0].toUpperCase() + t.slice(1)}</a>`).join(' · ')}</div>
    <span class="muted">Pending means the customer started checkout but no confirmation has arrived.</span>
  </div>${enrolmentRows(rows, csrf)}</div>`;
  return shell({ title: 'Payments', active: 'enrolments', body, csrf, unread });
}

export function interestPage({ rows, courses, course, csrf, unread }) {
  const body = `
  <div class="admin-top"><h1>Course interest</h1><a class="btn btn-sm" href="/admin/interest.csv">Download CSV</a></div>
  <div class="panel"><div class="panel-head">
    <div class="filters">${[{ id: '', title: 'All' }, ...courses].map((c) => `<a href="/admin/interest${c.id ? `?course=${encodeURIComponent(c.id)}` : ''}"${course === c.id ? ' class="current"' : ''}>${esc(c.title)}</a>`).join(' · ')}</div>
    <span class="muted">People waiting for enrolment to open or asking for a free place.</span>
  </div>
  ${rows.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Name</th><th>Contact</th><th>Course</th><th>Experience</th><th>Free place</th><th></th></tr></thead>
    <tbody>${rows.map((r) => `<tr class="${r.contacted === '1' ? 'done' : ''}">
      <td class="nowrap">${when(r.created_at)}</td><td>${esc(r.name)}</td>
      <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a><br><a href="${esc(whatsappLink(r.phone))}" target="_blank" rel="noopener">WhatsApp ${esc(r.phone)}</a></td>
      <td>${esc(r.course)}</td><td>${esc(r.experience)}</td>
      <td>${r.free_place === 'Yes' ? '<span class="pill pending">Requested</span>' : '—'}</td>
      <td><form method="post" action="/admin/interest/${esc(r.id)}/toggle">${csrfField(csrf)}<button class="link-btn" type="submit">${r.contacted === '1' ? 'Mark not contacted' : 'Mark contacted'}</button></form></td>
    </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No course interest yet.</div>'}</div>`;
  return shell({ title: 'Course interest', active: 'interest', body, csrf, unread });
}

export function messagesPage({ rows, csrf, unread }) {
  const body = `
  <div class="admin-top"><h1>Messages</h1></div>
  <div class="panel">${rows.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>From</th><th>Topic</th><th>Message</th><th></th></tr></thead>
    <tbody>${rows.map((m) => `<tr class="${m.handled === '1' ? 'done' : ''}">
      <td class="nowrap">${when(m.created_at)}</td>
      <td>${esc(m.name)}${m.email ? `<br><a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ''}${m.phone ? `<br><a href="${esc(whatsappLink(m.phone))}" target="_blank" rel="noopener">WhatsApp ${esc(m.phone)}</a>` : ''}</td>
      <td>${esc(m.subject)}</td>
      <td style="white-space:pre-wrap;min-width:260px">${esc(m.body)}</td>
      <td><form method="post" action="/admin/messages/${esc(m.id)}/toggle">${csrfField(csrf)}<button class="link-btn" type="submit">${m.handled === '1' ? 'Mark unread' : 'Mark handled'}</button></form></td>
    </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No messages yet.</div>'}</div>`;
  return shell({ title: 'Messages', active: 'messages', body, csrf, unread });
}

// ---------- Field widgets ----------

const kindOfType = (type) => String(type || '').split('/')[0];

/** A select of library files of one kind, an upload button and a preview. */
function mediaPicker(site, name, value, kind, label) {
  const files = site.media.filter((m) => kindOfType(m.type) === kind);
  const current = site.mediaById[value];
  return `<div class="picker" data-kind="${kind}">
    <select name="${esc(name)}" aria-label="${esc(label)}">
      <option value="">None</option>
      ${files.map((m) => `<option value="${esc(m.id)}" data-url="${esc(mediaUrl(m))}"${m.id === value ? ' selected' : ''}>${esc(m.alt || m.name)}</option>`).join('')}
    </select>
    <label class="btn btn-sm btn-ghost upload-btn">Upload new<input type="file" accept="${kind === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' : 'audio/*'}" hidden></label>
    <span class="picker-status" aria-live="polite"></span>
    <div class="picker-preview">${current ? preview(current) : ''}</div>
  </div>`;
}

function preview(m) {
  const url = esc(mediaUrl(m));
  const kind = kindOfType(m.type);
  if (kind === 'image') return `<img src="${url}" alt="" loading="lazy">`;
  if (kind === 'audio') return `<audio controls preload="none" src="${url}"></audio>`;
  if (kind === 'video') return `<video controls preload="metadata" src="${url}"></video>`;
  return '';
}

const videoPreview = (url) => {
  const id = youtubeId(url);
  return id ? `<img class="yt-thumb" src="https://i.ytimg.com/vi/${id}/mqdefault.jpg" alt="Video thumbnail" loading="lazy">` : '';
};

function field(site, f, value) {
  const hint = f.hint ? ` <span class="hint">${esc(f.hint)}</span>` : '';
  const def = f.default && !f.optional ? ' data-default' : '';
  const full = ['textarea', 'lines', 'image', 'audio', 'video'].includes(f.type) ? ' class="full"' : '';
  const name = esc(f.key);
  let input;
  switch (f.type) {
    case 'textarea':
    case 'lines':
      input = `<textarea name="${name}" rows="${f.type === 'lines' ? Math.min(10, Math.max(3, String(value).split('\n').length + 1)) : 3}"${def}>${esc(value)}</textarea>`;
      break;
    case 'image':
    case 'audio':
      return `<div class="full field-block"><span class="field-label">${esc(f.label)}${hint}</span>${mediaPicker(site, f.key, value, f.type, f.label)}</div>`;
    case 'video':
      input = `<input name="${name}" type="url" value="${esc(value)}" placeholder="https://youtu.be/…">${videoPreview(value)}`;
      break;
    case 'datetime':
      input = `<input name="${name}" type="datetime-local" value="${esc(value)}">`;
      break;
    case 'email':
      input = `<input name="${name}" type="email" value="${esc(value)}">`;
      break;
    case 'url':
      input = `<input name="${name}" type="url" value="${esc(value)}" placeholder="https://">`;
      break;
    default:
      input = `<input name="${name}" value="${esc(value)}">`;
  }
  return `<label${full}>${esc(f.label)}${f.type === 'private' ? ' <span class="pill pending">private</span>' : ''}${hint}${input}</label>`;
}

export function contentPage({ site, flash, csrf, unread }) {
  const s = site.settings;
  const body = `
  <div class="admin-top"><h1>Site content</h1><a class="btn btn-sm" href="/" target="_blank">View site ↗</a></div>
  ${flashBox(flash)}
  <p class="muted">Every heading, text, image, video and audio clip on the public site. Clearing a text field brings back its original wording. Changes reach the live site within about a minute.</p>
  <nav class="jump">${CONTENT_GROUPS.map((g) => `<a href="#${g.id}">${esc(g.title)}</a>`).join('')}</nav>
  ${CONTENT_GROUPS.map((g) => `
  <div class="panel" id="${g.id}"><div class="panel-head"><h2>${esc(g.title)}</h2></div><div class="panel-body">
    ${g.note ? `<p class="muted">${esc(g.note)}</p>` : ''}
    <form class="form grid-form" method="post" action="/admin/content/${g.id}" data-dirty>
      ${csrfField(csrf)}
      ${g.fields.map((f) => field(site, f, s[f.key])).join('')}
      <div class="full form-actions"><button class="btn" type="submit">Save ${esc(g.title.toLowerCase())}</button></div>
    </form>
  </div></div>`).join('')}`;
  return shell({ title: 'Site content', active: 'content', body, csrf, unread });
}

// ---------- Courses ----------

export function coursesAdminPage({ site, flash, csrf, unread }) {
  const colours = ['blue', 'yellow', 'red', 'black'];
  const body = `
  <div class="admin-top"><h1>Courses</h1></div>
  ${flashBox(flash)}
  <p class="muted">Each course is also one of the webinar fields on the home page. Leave the fee empty to show "To be confirmed" and collect interest instead of payments. Changing the fee only affects new checkouts.</p>
  <div class="panel"><div class="panel-body">
    <form class="filters" method="post" action="/admin/courses/new">${csrfField(csrf)}<input name="title" placeholder="New course title" required maxlength="120"><button class="btn btn-sm" type="submit">Add course</button></form>
  </div></div>
  ${site.allCourses.map((c) => `
  <div class="panel" id="${esc(c.slug)}"><div class="panel-head"><h2>${esc(c.title)} ${c.active ? '' : '<span class="pill failed">hidden</span>'}</h2><a href="/courses/${esc(c.slug)}" target="_blank">View page ↗</a></div>
  <div class="panel-body"><form class="form grid-form" method="post" action="/admin/courses/${esc(c.id)}" data-dirty>
    ${csrfField(csrf)}
    <label>Title<input name="title" value="${esc(c.title)}" required maxlength="120"></label>
    <label>Fee in naira <span class="hint">e.g. 75000</span><input name="price" inputmode="decimal" value="${c.price_kobo == null ? '' : c.price_kobo / 100}"></label>
    <label>Duration<input name="duration" value="${esc(c.duration)}" maxlength="60" placeholder="e.g. 6 weeks"></label>
    <label>Next start date<input name="start_date" value="${esc(c.start_date)}" maxlength="60" placeholder="e.g. 12 January 2027"></label>
    <label class="full">Short summary <span class="hint">Also the page description in Google.</span><input name="summary" value="${esc(c.summary)}" maxlength="300"></label>
    <label class="full">Course outcomes <span class="hint">One per line; leave empty to hide.</span><textarea name="outcomes">${esc(c.outcomes)}</textarea></label>
    <label class="full">Course video <span class="hint">Optional YouTube link, shown on the course page.</span><input name="video" type="url" value="${esc(c.video)}" placeholder="https://youtu.be/…">${videoPreview(c.video)}</label>
    <label class="full">Webinar session title<input name="session_title" value="${esc(c.session_title)}" maxlength="160"></label>
    <label class="full">Webinar session description<textarea name="session_desc" rows="3">${esc(c.session_desc)}</textarea></label>
    <label>Webinar demo<textarea name="session_demo" rows="3">${esc(c.session_demo)}</textarea></label>
    <label>Starter exercise<textarea name="session_exercise" rows="3">${esc(c.session_exercise)}</textarea></label>
    <label>Colour<select name="colour">${colours.map((k) => `<option${k === c.colour ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
    <label>Order<input name="sort" type="number" min="1" value="${esc(c.sort)}"></label>
    <label>Visible on site<select name="active"><option value="1"${c.active ? ' selected' : ''}>Yes</option><option value="0"${c.active ? '' : ' selected'}>No (hidden)</option></select></label>
    <div class="full form-actions"><button class="btn" type="submit">Save ${esc(c.title)}</button></div>
  </form>
  <form class="danger" method="post" action="/admin/courses/${esc(c.id)}/delete" data-confirm="Delete ${esc(c.title)}? Its sign-ups and payments are kept.">${csrfField(csrf)}<button class="link-btn" type="submit">Delete this course</button></form>
  </div></div>`).join('')}`;
  return shell({ title: 'Courses', active: 'courses', body, csrf, unread });
}

// ---------- Facilitators ----------

export function facilitatorsPage({ site, flash, csrf, unread }) {
  const body = `
  <div class="admin-top"><h1>Facilitators</h1><a class="btn btn-sm" href="/#facilitators" target="_blank">View on site ↗</a></div>
  ${flashBox(flash)}
  <p class="muted">Profiles shown in the Facilitators section, on course cards and on course pages. To copy details sent through the facilitator form, use <a href="/admin/submissions">Facilitator forms</a>.</p>
  <div class="panel"><div class="panel-body">
    <form class="filters" method="post" action="/admin/facilitators/new">${csrfField(csrf)}<input name="name" placeholder="New facilitator's name" maxlength="120"><button class="btn btn-sm" type="submit">Add facilitator</button></form>
  </div></div>
  ${site.allFacilitators.map((f) => `
  <div class="panel" id="${esc(f.id)}"><div class="panel-head"><h2>${esc(f.name)} ${f.active ? '' : '<span class="pill failed">hidden</span>'}</h2></div>
  <div class="panel-body"><form class="form grid-form" method="post" action="/admin/facilitators/${esc(f.id)}" data-dirty>
    ${csrfField(csrf)}
    <label>Name<input name="name" value="${esc(f.name)}" required maxlength="120"></label>
    <label>Role <span class="hint">e.g. Senior Security Engineer at X</span><input name="role" value="${esc(f.role)}" maxlength="160"></label>
    <label>Course<select name="course_id"><option value="">None</option>${site.allCourses.map((c) => `<option value="${esc(c.id)}"${c.id === f.course_id ? ' selected' : ''}>${esc(c.title)}</option>`).join('')}</select></label>
    <label>Order<input name="sort" type="number" min="1" value="${esc(f.sort)}"></label>
    <div class="full field-block"><span class="field-label">Photo <span class="hint">Square headshot works best.</span></span>${mediaPicker(site, 'photo', f.photo, 'image', 'Photo')}</div>
    <label class="full">Bio<textarea name="bio" rows="4">${esc(f.bio)}</textarea></label>
    <label class="full">Qualifications <span class="hint">One per line, 3–4 short lines.</span><textarea name="qualifications" rows="4">${esc(f.qualifications.join('\n'))}</textarea></label>
    <label>LinkedIn<input name="linkedin" type="url" value="${esc(f.linkedin)}" placeholder="https://www.linkedin.com/in/…"></label>
    <label>X (Twitter)<input name="x" type="url" value="${esc(f.x)}" placeholder="https://x.com/…"></label>
    <label>GitHub<input name="github" type="url" value="${esc(f.github)}" placeholder="https://github.com/…"></label>
    <label>Instagram<input name="instagram" type="url" value="${esc(f.instagram)}" placeholder="https://instagram.com/…"></label>
    <label>Website<input name="website" type="url" value="${esc(f.website)}" placeholder="https://"></label>
    <label>Intro video <span class="hint">YouTube link</span><input name="video" type="url" value="${esc(f.video)}" placeholder="https://youtu.be/…"></label>
    <div class="full field-block"><span class="field-label">Audio intro <span class="hint">Optional short clip.</span></span>${mediaPicker(site, 'audio', f.audio, 'audio', 'Audio intro')}</div>
    <label>Visible on site<select name="active"><option value="1"${f.active ? ' selected' : ''}>Yes</option><option value="0"${f.active ? '' : ' selected'}>No (hidden)</option></select></label>
    <div class="full form-actions"><button class="btn" type="submit">Save ${esc(f.name)}</button></div>
  </form>
  <form class="danger" method="post" action="/admin/facilitators/${esc(f.id)}/delete" data-confirm="Delete ${esc(f.name)}'s profile?">${csrfField(csrf)}<button class="link-btn" type="submit">Delete this profile</button></form>
  </div></div>`).join('')}`;
  return shell({ title: 'Facilitators', active: 'facilitators', body, csrf, unread });
}

export function submissionsPage({ rows, site, flash, csrf, unread }) {
  const body = `
  <div class="admin-top"><h1>Facilitator forms</h1><a class="btn btn-sm" href="/fprofile" target="_blank">Open the form ↗</a></div>
  ${flashBox(flash)}
  <p class="muted">Answers sent through <code>/fprofile</code>. They are also in the "Facilitator's Profile" tab of the Google Sheet. "Fill profile" copies the name, role, bio, qualifications, link and photo into a website profile, which you can then edit.</p>
  ${rows.length ? rows.map((r) => `
  <div class="panel"><div class="panel-head"><h2>${esc(r.name)}</h2><span class="muted">${esc(r.submitted_at)}</span></div>
  <div class="panel-body sub-grid">
    <div>
      <dl class="facts">
        <div><dt>Role</dt><dd>${esc(r.role)}</dd></div>
        <div><dt>Course(s)</dt><dd>${esc(r.courses)}</dd></div>
        <div><dt>Topic</dt><dd>${esc(r.topic)}</dd></div>
        <div><dt>Level · length</dt><dd>${esc(r.level)} · ${esc(r.length)}</dd></div>
        <div><dt>Experience</dt><dd>${esc(r.experience)}</dd></div>
        <div><dt>Available</dt><dd>${esc(r.availability)}</dd></div>
        <div><dt>Contact</dt><dd><a href="mailto:${esc(r.email)}">${esc(r.email)}</a> · <a href="${esc(whatsappLink(r.phone))}" target="_blank" rel="noopener">WhatsApp ${esc(r.phone)}</a></dd></div>
        ${r.link ? `<div><dt>Link</dt><dd><a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.link)}</a></dd></div>` : ''}
        ${r.photo ? `<div><dt>Photo</dt><dd><a href="${esc(r.photo)}" target="_blank" rel="noopener">Open in Drive ↗</a></dd></div>` : ''}
      </dl>
      <details><summary>Bio, qualifications and session plan</summary>
        <h3>Bio</h3><p class="pre">${esc(r.bio)}</p>
        <h3>Qualifications</h3><p class="pre">${esc(r.qualifications)}</p>
        <h3>Key takeaways</h3><p class="pre">${esc(r.takeaways)}</p>
        <h3>Outline</h3><p class="pre">${esc(r.outline)}</p>
        <h3>Delivery · tools</h3><p>${esc(r.formats)}${r.tools ? ` · ${esc(r.tools)}` : ''}</p>
        ${r.requirements ? `<h3>Special requirements</h3><p class="pre">${esc(r.requirements)}</p>` : ''}
        ${r.comments ? `<h3>Comments</h3><p class="pre">${esc(r.comments)}</p>` : ''}
      </details>
    </div>
    <form class="form use-form" method="post" action="/admin/submissions/use">
      ${csrfField(csrf)}
      <input type="hidden" name="submitted_at" value="${esc(r.submitted_at)}">
      <input type="hidden" name="email" value="${esc(r.email)}">
      <label>Fill this website profile<select name="facilitator_id" required><option value="">Choose a profile</option>${site.allFacilitators.map((f) => `<option value="${esc(f.id)}">${esc(f.name)} (${esc(site.allCourses.find((c) => c.id === f.course_id)?.title || 'no course')})</option>`).join('')}</select></label>
      <button class="btn btn-sm" type="submit">Fill profile</button>
    </form>
  </div></div>`).join('') : '<div class="panel"><div class="empty">No submissions yet. Share <code>/fprofile</code> with your facilitators.</div></div>'}`;
  return shell({ title: 'Facilitator forms', active: 'submissions', body, csrf, unread });
}

// ---------- Media ----------

const size = (n) => (Number(n) > 1048576 ? `${(Number(n) / 1048576).toFixed(1)} MB` : `${Math.ceil(Number(n) / 1024)} KB`);

export function mediaPage({ site, flash, csrf, unread }) {
  const items = [...site.media].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const body = `
  <div class="admin-top"><h1>Media library</h1></div>
  ${flashBox(flash)}
  <div class="panel"><div class="panel-body">
    <div class="picker upload-zone" data-kind="any" data-reload>
      <label class="btn upload-btn">Upload files<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,audio/*,video/mp4,video/webm" hidden></label>
      <span class="picker-status" aria-live="polite"></span>
    </div>
    <p class="muted" style="margin:12px 0 0">Images are resized to 1600 px before upload, so they load fast. Up to 3 MB per file. Put longer videos on YouTube and paste the link where a video is asked for. Files are stored in the "TheBridge website media" folder in Google Drive.</p>
  </div></div>
  ${items.length ? `<div class="media-grid">${items.map((m) => `
    <div class="media-card">
      <div class="media-thumb">${preview(m) || esc(m.type)}</div>
      <div class="media-info">
        <strong title="${esc(m.name)}">${esc(m.name)}</strong>
        <span class="muted">${esc(m.type)} · ${size(m.size)}</span>
        <input class="copy-url" readonly value="${esc(mediaUrl(m))}" aria-label="File address">
        <form class="alt-form" method="post" action="/admin/media/${esc(m.id)}">${csrfField(csrf)}<input name="alt" value="${esc(m.alt)}" placeholder="Describe it (for search and screen readers)" maxlength="200"><button class="btn btn-sm" type="submit">Save</button></form>
        <form method="post" action="/admin/media/${esc(m.id)}/delete" data-confirm="Delete ${esc(m.name)}?">${csrfField(csrf)}<button class="link-btn" type="submit">Delete</button></form>
      </div>
    </div>`).join('')}</div>` : '<div class="panel"><div class="empty">No files yet.</div></div>'}`;
  return shell({ title: 'Media library', active: 'media', body, csrf, unread });
}
