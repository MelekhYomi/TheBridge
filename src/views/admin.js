import { esc, naira, whatsappLink, ASSET_V } from './layout.js';

const csrfField = (csrf) => `<input type="hidden" name="_csrf" value="${esc(csrf)}">`;
const when = (iso) => (iso ? esc(iso.replace('T', ' ').slice(0, 16)) + ' UTC' : '');

function shell({ title, active, body, csrf, counts }) {
  const items = [
    ['/admin', 'Overview', 'overview'],
    ['/admin/registrations', 'Webinar sign-ups', 'registrations'],
    ['/admin/interest', 'Course interest', 'interest'],
    ['/admin/enrolments', 'Payments', 'enrolments'],
    ['/admin/messages', 'Messages', 'messages', counts.unread],
    ['/admin/courses', 'Courses', 'courses'],
    ['/admin/settings', 'Webinar & contact', 'settings'],
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} · TheBridge Admin</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css?v=${ASSET_V}"><link rel="stylesheet" href="/css/admin.css?v=${ASSET_V}">
</head>
<body class="admin">
<div class="admin-shell">
  <aside class="admin-side">
    <a class="brand" href="/admin"><img src="/brand/mark-reversed.svg" alt="" width="38" height="34"><span class="brand-name"><span>The</span><b>Bridge</b></span></a>
    ${items.map(([href, label, key, n]) => `<a class="nav-item" href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}${n ? `<span class="count">${n}</span>` : ''}</a>`).join('')}
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Admin login · TheBridge</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
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

function enrolmentRows(rows, csrf) {
  if (!rows.length) return '<div class="empty">No payments yet.</div>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Name</th><th>Contact</th><th>Course</th><th>Amount</th><th>Via</th><th>Status</th><th>Reference</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td class="nowrap">${when(r.created_at)}</td>
      <td>${esc(r.name)}</td>
      <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a><br>${esc(r.phone)}</td>
      <td>${esc(r.course_title)}</td>
      <td class="nowrap">${esc(naira(r.amount_kobo))}</td>
      <td>${esc(r.provider)}</td>
      <td>${pill(r.status)}${r.status === 'pending' ? `<br><form class="inline" method="post" action="/admin/enrolments/${r.id}/recheck">${csrfField(csrf)}<button class="link-btn" type="submit">Re-check</button></form>` : ''}</td>
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
      <td>${r.cohort_updates ? '<span class="pill paid">Yes</span>' : 'No'}</td>
      <td style="white-space:pre-wrap;min-width:200px">${esc(r.question)}</td><td>${esc(r.source)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

export function overviewPage({ stats, recentRegs, recentPays, interest, csrf, counts }) {
  const body = `
  <div class="admin-top"><h1>Overview</h1></div>
  <div class="stats">
    <div class="stat"><small>Webinar sign-ups</small><strong>${stats.regs}</strong><span>${stats.regs7} in the last 7 days · ${stats.cohort} want cohort updates</span></div>
    <div class="stat"><small>Live attendance</small><strong>${stats.attendance === '' ? '—' : esc(stats.attendance)}</strong><span><a href="/admin/settings#attendance">${stats.attendance === '' ? 'Enter after the webinar' : 'Update'}</a></span></div>
    <div class="stat"><small>Course interest</small><strong>${stats.interest}</strong><span>${stats.freePlaces} asked for a free place</span></div>
    <div class="stat"><small>Payments received</small><strong>${esc(naira(stats.revenue))}</strong><span>${stats.paid} paid · ${stats.pending} pending</span></div>
    <div class="stat"><small>Unread messages</small><strong>${stats.unread}</strong><span>${stats.messages} total</span></div>
  </div>
  <div class="panel"><div class="panel-head"><h2>Interest by field</h2></div><div class="table-wrap"><table>
    <thead><tr><th>Field</th><th>Webinar sign-ups</th><th>Course interest</th><th>Paid enrolments</th></tr></thead>
    <tbody>${interest.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.regs}</td><td>${r.interested}</td><td>${r.paid}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No data yet.</td></tr>'}</tbody>
  </table></div></div>
  <div class="panel"><div class="panel-head"><h2>Latest sign-ups</h2><a href="/admin/registrations">See all</a></div>${registrationRows(recentRegs)}</div>
  <div class="panel"><div class="panel-head"><h2>Latest payments</h2><a href="/admin/enrolments">See all</a></div>${enrolmentRows(recentPays, csrf)}</div>`;
  return shell({ title: 'Overview', active: 'overview', body, csrf, counts });
}

export function registrationsPage({ rows, q, csrf, counts }) {
  const body = `
  <div class="admin-top"><h1>Webinar sign-ups</h1><a class="btn btn-sm" href="/admin/registrations.csv">Download CSV</a></div>
  <div class="panel"><div class="panel-head">
    <form class="filters" method="get"><input name="q" value="${esc(q)}" placeholder="Search name, email, phone"><button class="btn btn-sm" type="submit">Search</button>${q ? '<a href="/admin/registrations">Clear</a>' : ''}</form>
    <span class="muted">${rows.length} shown</span>
  </div>${registrationRows(rows)}</div>`;
  return shell({ title: 'Webinar sign-ups', active: 'registrations', body, csrf, counts });
}

export function enrolmentsPage({ rows, status, flash, csrf, counts }) {
  const tabs = ['all', 'paid', 'pending', 'failed'];
  const body = `
  <div class="admin-top"><h1>Payments</h1><a class="btn btn-sm" href="/admin/enrolments.csv">Download CSV</a></div>
  ${flash ? `<div class="alert">${esc(flash)}</div>` : ''}
  <div class="panel"><div class="panel-head">
    <div class="filters">${tabs.map((t) => `<a href="/admin/enrolments${t === 'all' ? '' : `?status=${t}`}" ${status === t || (!status && t === 'all') ? 'style="text-decoration:underline 3px var(--yellow)"' : ''}>${t[0].toUpperCase() + t.slice(1)}</a>`).join(' · ')}</div>
    <span class="muted">Pending means the customer started checkout but no confirmation has arrived.</span>
  </div>${enrolmentRows(rows, csrf)}</div>`;
  return shell({ title: 'Payments', active: 'enrolments', body, csrf, counts });
}

export function interestPage({ rows, courses, course, csrf, counts }) {
  const body = `
  <div class="admin-top"><h1>Course interest</h1><a class="btn btn-sm" href="/admin/interest.csv">Download CSV</a></div>
  <div class="panel"><div class="panel-head">
    <div class="filters">${[{ id: 0, title: 'All' }, ...courses].map((c) => `<a href="/admin/interest${c.id ? `?course=${c.id}` : ''}" ${course === c.id ? 'style="text-decoration:underline 3px var(--yellow)"' : ''}>${esc(c.title)}</a>`).join(' · ')}</div>
    <span class="muted">People waiting for enrolment to open or asking for a free place.</span>
  </div>
  ${rows.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Name</th><th>Contact</th><th>Course</th><th>Experience</th><th>Free place</th><th></th></tr></thead>
    <tbody>${rows.map((r) => `<tr class="${r.contacted ? 'done' : ''}">
      <td class="nowrap">${when(r.created_at)}</td><td>${esc(r.name)}</td>
      <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a><br><a href="${esc(whatsappLink(r.phone))}" target="_blank" rel="noopener">WhatsApp ${esc(r.phone)}</a></td>
      <td>${esc(r.course_title)}</td><td>${esc(r.experience)}</td>
      <td>${r.free_place ? '<span class="pill pending">Requested</span>' : '—'}</td>
      <td><form method="post" action="/admin/interest/${r.id}/toggle">${csrfField(csrf)}<button class="link-btn" type="submit">${r.contacted ? 'Mark not contacted' : 'Mark contacted'}</button></form></td>
    </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No course interest yet.</div>'}</div>`;
  return shell({ title: 'Course interest', active: 'interest', body, csrf, counts });
}

export function messagesPage({ rows, csrf, counts }) {
  const body = `
  <div class="admin-top"><h1>Messages</h1></div>
  <div class="panel">${rows.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>From</th><th>Topic</th><th>Message</th><th></th></tr></thead>
    <tbody>${rows.map((m) => `<tr class="${m.handled ? 'done' : ''}">
      <td class="nowrap">${when(m.created_at)}</td>
      <td>${esc(m.name)}${m.email ? `<br><a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ''}${m.phone ? `<br><a href="${esc(whatsappLink(m.phone))}" target="_blank" rel="noopener">WhatsApp ${esc(m.phone)}</a>` : ''}</td>
      <td>${esc(m.subject)}</td>
      <td style="white-space:pre-wrap;min-width:260px">${esc(m.body)}</td>
      <td><form method="post" action="/admin/messages/${m.id}/toggle">${csrfField(csrf)}<button class="link-btn" type="submit">${m.handled ? 'Mark unread' : 'Mark handled'}</button></form></td>
    </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No messages yet.</div>'}</div>`;
  return shell({ title: 'Messages', active: 'messages', body, csrf, counts });
}

export function coursesAdminPage({ courses, flash, csrf, counts }) {
  const colours = ['blue', 'yellow', 'red', 'black'];
  const body = `
  <div class="admin-top"><h1>Courses</h1></div>
  ${flash ? `<div class="alert ok">${esc(flash)}</div>` : ''}
  <p class="muted">Each course is also one of the four webinar fields on the home page. Leave the fee empty to hide the payment form ("Fee to be announced"). Changing the fee only affects new checkouts.</p>
  ${courses.map((c) => `
  <div class="panel"><div class="panel-head"><h2>${esc(c.title)}</h2><a href="/courses/${esc(c.slug)}" target="_blank">View page ↗</a></div>
  <div class="panel-body"><form class="form grid-form" method="post" action="/admin/courses/${c.id}">
    ${csrfField(csrf)}
    <label>Title<input name="title" value="${esc(c.title)}" required maxlength="120"></label>
    <label>Fee in naira <span class="hint">e.g. 75000</span><input name="price" inputmode="decimal" value="${c.price_kobo == null ? '' : c.price_kobo / 100}"></label>
    <label>Duration<input name="duration" value="${esc(c.duration)}" maxlength="60"></label>
    <label>Next start date<input name="start_date" value="${esc(c.start_date)}" maxlength="60" placeholder="e.g. 12 January 2027"></label>
    <label class="full">Short summary<input name="summary" value="${esc(c.summary)}" maxlength="300"></label>
    <label class="full">Course outcomes <span class="hint">one per line; leave empty to hide</span><textarea name="outcomes">${esc(c.outcomes)}</textarea></label>
    <label class="full">Webinar session title<input name="session_title" value="${esc(c.session_title)}" maxlength="160"></label>
    <label class="full">Webinar session description<textarea name="session_desc" style="min-height:80px">${esc(c.session_desc)}</textarea></label>
    <label>Webinar demo<textarea name="session_demo" style="min-height:80px">${esc(c.session_demo)}</textarea></label>
    <label>Starter exercise<textarea name="session_exercise" style="min-height:80px">${esc(c.session_exercise)}</textarea></label>
    <label>Colour<select name="colour">${colours.map((k) => `<option ${k === c.colour ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
    <label>Visible on site<select name="active"><option value="1" ${c.active ? 'selected' : ''}>Yes</option><option value="0" ${c.active ? '' : 'selected'}>No (hidden)</option></select></label>
    <div class="full"><button class="btn" type="submit">Save ${esc(c.title)}</button></div>
  </form></div></div>`).join('')}`;
  return shell({ title: 'Courses', active: 'courses', body, csrf, counts });
}

export function settingsPage({ s, payments, flash, csrf, counts }) {
  const field = (key, label, hint = '', type = 'input') => `<label class="${type === 'textarea' ? 'full' : ''}">${label}${hint ? ` <span class="hint">${hint}</span>` : ''}${type === 'textarea' ? `<textarea name="${key}">${esc(s[key])}</textarea>` : `<input name="${key}" value="${esc(s[key])}">`}</label>`;
  const status = (on) => (on ? '<span class="pill paid">connected</span>' : '<span class="pill failed">not set</span>');
  const body = `
  <div class="admin-top"><h1>Webinar &amp; contact</h1></div>
  ${flash ? `<div class="alert ok">${esc(flash)}</div>` : ''}
  <div class="panel"><div class="panel-head"><h2>Webinar details</h2></div><div class="panel-body">
  <form class="form grid-form" method="post" action="/admin/settings">
    ${csrfField(csrf)}
    ${field('webinar_title', 'Webinar name')}
    ${field('webinar_platform', 'Where', 'e.g. Zoom, Google Meet')}
    ${field('webinar_date', 'Date', 'e.g. Saturday 14 November 2026')}
    ${field('webinar_time', 'Time', 'e.g. 4:00pm WAT')}
    <label class="full">Tagline<input name="webinar_tagline" value="${esc(s.webinar_tagline)}"></label>
    ${field('webinar_join_link', 'Joining link', 'private: shown only here, for you to send to registrants')}
    <label id="attendance">Live attendance <span class="hint">peak number from Zoom/Meet, after the event</span><input name="webinar_attendance" inputmode="numeric" value="${esc(s.webinar_attendance)}"></label>
    ${field('webinar_audience', 'Made for', 'one group per line', 'textarea')}
    ${field('webinar_agenda', 'Programme', 'one item per line, as "time | who | what"', 'textarea')}
    ${field('webinar_outcomes', 'Learning outcomes', 'one per line', 'textarea')}
    ${field('webinar_resource_pack', 'Take-home resource pack', 'leave empty to hide', 'textarea')}
    ${field('webinar_notes', 'Practical notes beside the registration form', 'one per line', 'textarea')}
    ${field('contact_email', 'Contact email')}
    ${field('contact_whatsapp', 'WhatsApp number', 'with country code, e.g. +234...')}
    <div class="full"><button class="btn" type="submit">Save changes</button></div>
  </form></div></div>
  <div class="panel"><div class="panel-head"><h2>Payment connections</h2></div><div class="panel-body">
    <p>Keys are set in the server's <code>.env</code> file, not here, so they never pass through the browser.</p>
    <div class="status-row"><span>Paystack ${status(payments.paystack)}</span><span>Flutterwave ${status(payments.flutterwave)}</span>${payments.demo ? '<span>Demo checkout <span class="pill pending">on</span></span>' : ''}</div>
  </div></div>`;
  return shell({ title: 'Settings', active: 'settings', body, csrf, counts });
}
