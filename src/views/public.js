import { esc, lines, naira, whatsappLink, alerts, icon, arrowBtn } from './layout.js';
import { facilitatorFor } from '../facilitators.js';

export const REG_STATUS = ['Student', 'Recent graduate', 'Jobseeker', 'Career switcher', 'Other'];
export const REG_EXPERIENCE = ['Complete beginner', 'Some experience', 'Already working in tech'];

const honeypot = '<label class="hp" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>';
const consent = '<p class="consent">By submitting, you agree that TheBridge may contact you about this programme by email, phone or WhatsApp. We never sell your details.</p>';
const squiggle = '<svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path d="M2 14 Q 25 2 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 298 10" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>';

// Staggered scroll-reveal helper: returns attributes for the nth item.
const rv = (i = 0) => `class="reveal" style="--d:${(i * 0.07).toFixed(2)}s"`;

// A course takes payments once it has a fee and a payment provider is connected;
// until then it collects interest instead.
export const isOpen = (c, payments) => c.price_kobo != null && c.price_kobo > 0 && (payments.paystack || payments.flutterwave);

const contribution = (c) => (c.price_kobo != null ? naira(c.price_kobo) : 'To be confirmed');

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// Photo, or initials on the course colour when there's no photo yet.
const avatar = (f, cls = '') => (f.photo
  ? `<img class="${cls}" src="${esc(f.photo)}" alt="${esc(f.name)}" loading="lazy" width="600" height="600">`
  : `<span class="${cls} initials" aria-hidden="true">${esc(initials(f.name))}</span>`);

const SOCIALS = [['x', 'X (Twitter)'], ['github', 'GitHub'], ['instagram', 'Instagram'], ['website', 'Website']];
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

// LinkedIn gets a labelled pill; the rest are icon buttons.
function socialLinks(f) {
  const s = f.socials || {};
  const out = [];
  if (safeUrl(s.linkedin)) out.push(`<a class="soc-in" href="${esc(s.linkedin)}" target="_blank" rel="noopener">${icon('linkedin')}<span>LinkedIn</span></a>`);
  for (const [key, label] of SOCIALS) {
    if (safeUrl(s[key])) out.push(`<a class="soc" href="${esc(s[key])}" target="_blank" rel="noopener" aria-label="${esc(f.name)} on ${label}">${icon(key === 'website' ? 'globe' : key)}</a>`);
  }
  return out.length ? `<div class="socials">${out.join('')}</div>` : '';
}

function facilitatorCard(f, c, i) {
  const quals = (f.qualifications || []).filter(Boolean);
  return `<article class="person c-${esc(c.colour)} reveal" style="--d:${(i * 0.08).toFixed(2)}s">
    <div class="person-photo">
      ${avatar(f)}
      <span class="person-idx">0${i + 1}</span>
    </div>
    <div class="person-body">
      <span class="person-role">${esc(f.role)}</span>
      <h3>${esc(f.name)}</h3>
      <a class="person-course" href="/courses/${esc(c.slug)}"><i></i>Leads ${esc(c.title)}</a>
      ${f.bio ? `<p class="person-bio">${esc(f.bio)}</p>` : ''}
      ${quals.length ? `<ul class="quals">${quals.map((q) => `<li>${icon('award')}<span>${esc(q)}</span></li>`).join('')}</ul>` : ''}
      ${socialLinks(f)}
    </div>
  </article>`;
}

function facilitatorsSection(courses) {
  const pairs = courses.map((c) => [facilitatorFor(c.slug), c]).filter(([f]) => f);
  if (!pairs.length) return '';
  return `<section class="dark" id="facilitators">
  <div class="glow g2" style="opacity:.35"></div>
  <div class="wrap">
    <div class="section-head reveal">
      <span class="tag">Your facilitators</span>
      <h2>Learn from people who do the work.</h2>
      <p class="lead muted">Four practitioners, one for each field. They teach the webinar sessions and lead the cohort courses that follow.</p>
    </div>
    <div class="people">${pairs.map(([f, c], i) => facilitatorCard(f, c, i)).join('')}</div>
  </div>
</section>`;
}

// Compact "your facilitator" block for a course page.
function facilitatorNote(c) {
  const f = facilitatorFor(c.slug);
  if (!f) return '';
  return `<div class="person-mini c-${esc(c.colour)}">
    ${avatar(f, 'mini-photo')}
    <div>
      <small>Your facilitator</small>
      <strong>${esc(f.name)}</strong>
      <span>${esc(f.role)}</span>
    </div>
    ${socialLinks(f)}
  </div>`;
}

function courseCard(c, payments, i) {
  const open = isOpen(c, payments);
  const f = facilitatorFor(c.slug);
  return `<article class="course reveal" style="--d:${(i * 0.07).toFixed(2)}s">
    <div class="course-head ${esc(c.colour)}">
      <span class="idx">0${i + 1}</span>
      <span class="status${open ? ' open' : ''}"><i></i>${open ? 'Enrolment open' : 'Taking interest'}</span>
    </div>
    <div class="course-body">
      <h3>${esc(c.title)}</h3>
      <div class="course-meta">
        ${c.duration ? `<span class="chip">${esc(c.duration)}</span>` : ''}
        <span class="chip">${c.start_date ? `Starts ${esc(c.start_date)}` : 'Dates to be confirmed'}</span>
      </div>
      <p>${esc(c.summary)}</p>
      ${f ? `<div class="led-by">${avatar(f, 'mini-photo')}<span><small>Led by</small>${esc(f.name)}</span></div>` : ''}
      <div class="price"><small>Participation contribution</small>${esc(contribution(c))}</div>
      <div class="course-actions">
        <a class="btn" href="/courses/${esc(c.slug)}">${open ? 'Enrol now' : 'Express interest'} ${arrowBtn}</a>
      </div>
    </div>
  </article>`;
}

function goodToKnow() {
  const qa = [
    ['Who can join?', 'Entry levels are set from your experience level and webinar feedback, so beginners are not left behind.'],
    ['What does it cost?', 'Courses are highly subsidised, with a small participation contribution. The amount is shown on each course once it is confirmed, and free places are offered where the team can support them.'],
    ['What happens next?', 'When a course is open, you pay your contribution securely with Paystack or Flutterwave and we confirm your place. Before then, express interest: we review interest, confirm scope and teaching capacity, then contact you with your course details and payment link.'],
  ];
  return `<section class="dark" style="border-top:1px solid var(--line)">
  <div class="wrap">
    <div class="section-head reveal"><span class="tag">Good to know</span><h2>Before you choose</h2></div>
    <div class="faq">${qa.map(([q, a], i) => `<details ${rv(i)}${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  </div>
</section>`;
}

const experienceSelect = `<label>Your experience level
  <select name="experience" required>
    <option value="">Choose one</option>
    ${REG_EXPERIENCE.map((o) => `<option>${esc(o)}</option>`).join('')}
  </select>
</label>`;

function interestForm(c, { freePlace = false } = {}) {
  return `<form class="form" method="post" action="/interest" data-once>
    ${honeypot}
    <input type="hidden" name="course" value="${esc(c.slug)}">
    <label>Full name<input name="name" required maxlength="120" autocomplete="name"></label>
    <div class="row2">
      <label>Email address<input name="email" type="email" required maxlength="160" autocomplete="email"></label>
      <label>WhatsApp number<input name="phone" type="tel" required maxlength="30" autocomplete="tel"></label>
    </div>
    ${experienceSelect}
    <label class="check"><input type="checkbox" name="free_place" value="1"${freePlace ? ' checked' : ''}> I'd like to be considered for a free place.</label>
    ${consent}
    <button class="btn btn-block" type="submit">Express interest ${arrowBtn}</button>
  </form>`;
}

// "time | who | what" per line; older two-part lines ("time | what") still work.
function parseAgenda(text) {
  return lines(text).map((l) => {
    const parts = l.split('|').map((p) => p.trim());
    if (parts.length >= 3) return { time: parts[0], who: parts[1], what: parts.slice(2).join(' | ') };
    if (parts.length === 2) return { time: parts[0], who: '', what: parts[1] };
    return { time: '', who: '', what: l };
  });
}

// "Main title: subtitle" → big title with the last word highlighted, subtitle as a code-style line.
function heroTitle(title) {
  const i = title.indexOf(':');
  const main = (i < 0 ? title : title.slice(0, i)).trim();
  const sub = i < 0 ? '' : title.slice(i + 1).trim();
  const words = main.split(/\s+/);
  const last = words.pop();
  return {
    h1: `${esc(words.join(' '))} <span class="last">${esc(last)}${squiggle}</span>`,
    sub: sub ? `<div class="hero-sub"><b>&gt;_</b>${esc(sub)}</div>` : '',
  };
}

function fieldCard(c, i) {
  return `<article class="field ${esc(c.colour)} reveal" style="--d:${(i * 0.08).toFixed(2)}s">
    <div class="field-top"><span class="idx">0${i + 1}</span><span class="lbl">${esc(c.title)}</span></div>
    <h3>${esc(c.session_title || c.title)}</h3>
    ${c.session_desc ? `<p>${esc(c.session_desc)}</p>` : ''}
    <div class="steps">
      ${c.session_demo ? `<div class="step"><span class="ico">${icon('play')}</span><div><b>Live demo</b><p>${esc(c.session_demo)}</p></div></div>` : ''}
      ${c.session_exercise ? `<div class="step"><span class="ico">${icon('pencil')}</span><div><b>Your exercise</b><p>${esc(c.session_exercise)}</p></div></div>` : ''}
    </div>
  </article>`;
}

function ticket(s) {
  return `<div class="ticket">
    <div class="ticket-main">
      <div class="tk">Admit one · Free entry</div>
      <div class="tt">Free live webinar</div>
      <div class="ticket-rows">
        <div><small>Date</small><strong>${esc(s.webinar_date || 'TBA')}</strong></div>
        <div><small>Time</small><strong>${esc(s.webinar_time || 'TBA')}</strong></div>
        <div><small>Where</small><strong>${esc(s.webinar_platform || 'Online')}</strong></div>
      </div>
    </div>
    <div class="ticket-stub" aria-hidden="true"><div class="barcode"></div></div>
  </div>`;
}

const noteIcons = ['phone', 'bolt', 'laptop', 'video'];

export function homePage({ settings: s, courses, payments, query }) {
  const agenda = parseAgenda(s.webinar_agenda);
  const audience = lines(s.webinar_audience);
  const notes = lines(s.webinar_notes);
  const title = heroTitle(s.webinar_title);
  const tickerItems = [...courses.map((c) => c.title), 'Free entry', 'Live demos', 'Starter exercises', '120 minutes'];
  const tickerRun = tickerItems.map((t) => `<span>${esc(t)} ${icon('spark')}</span>`).join('');
  return `
<section class="hero dark" id="webinar">
  <div class="glow g1"></div><div class="glow g2"></div><div class="glow g3"></div><div class="grid-bg"></div>
  <div class="wrap hero-grid">
    <div>
      <div class="live reveal"><i></i>Registration open · Free · 2 hours, live</div>
      <h1 ${rv(1)}>${title.h1}</h1>
      <div ${rv(2)}>${title.sub}</div>
      <p class="lead reveal" style="--d:.21s">${esc(s.webinar_tagline)}</p>
      <div class="hero-actions reveal" style="--d:.28s">
        <a class="btn btn-yellow" href="#register">Save my free seat ${arrowBtn}</a>
        <a class="btn btn-ghost" href="#fields">See what's inside</a>
      </div>
      ${audience.length ? `<div class="audience reveal" style="--d:.35s"><span>Made for</span>${audience.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="hero-bento reveal" style="--d:.2s">
      ${ticket(s)}
      <div class="tile mark" style="grid-row:span 2"><img src="/brand/mark-reversed.svg" alt=""></div>
      <div class="tile y"><div class="k">120</div><div class="l">minutes, live</div></div>
      <div class="tile r"><div class="k">₦0</div><div class="l">to attend</div></div>
    </div>
  </div>
</section>

<div class="ticker" aria-hidden="true"><div class="ticker-track">${tickerRun}${tickerRun}</div></div>

<section class="light" id="fields">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="tag">The four fields</span>
      <h2>Four fields. One practical first step.</h2>
      <p class="lead">Each facilitator gets 20 minutes: five to explain the subject, ten to demonstrate and five to set your starter exercise and suggested learning path.</p>
    </div>
    <div class="stat-row">
      <div ${rv(0)}><strong>120</strong><span>minutes, live</span></div>
      <div ${rv(1)}><strong>${courses.length}</strong><span>live demonstrations</span></div>
      <div ${rv(2)}><strong>${courses.length}</strong><span>starter exercises</span></div>
      <div ${rv(3)}><strong>₦0</strong><span>to attend</span></div>
    </div>
    <div class="bento">${courses.map(fieldCard).join('')}</div>
  </div>
</section>

${facilitatorsSection(courses)}

<section class="dark" id="programme" style="border-top:1px solid var(--line)">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="tag">Programme</span>
      <h2>Two hours. No fluff.</h2>
      <p class="lead muted">Times are minutes from the start. The date and start time are confirmed before registration opens.</p>
    </div>
    <ol class="timeline">
      ${agenda.map((a, i) => `<li ${rv(i)}${/question/i.test(a.what) ? ' data-qa' : ''}>
        <span class="dot"><i></i></span>
        <time>${esc(a.time)}</time>
        <div>${a.who ? `<span class="who">${esc(a.who)}</span>` : ''}<span class="what">${esc(a.what)}</span></div>
      </li>`).join('')}
    </ol>
  </div>
</section>

<section class="white" id="outcomes">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="tag">Outcomes</span>
      <h2>By the end, you'll be able to…</h2>
    </div>
    <div class="outcome-grid">
      ${lines(s.webinar_outcomes).map((o, i) => `<div class="outcome reveal" style="--d:${(i * 0.06).toFixed(2)}s">
        <div class="badge"><span>Skill ${String(i + 1).padStart(2, '0')}</span><i>${icon('check')}</i></div>
        <p>${esc(o)}</p>
      </div>`).join('')}
    </div>
    ${s.webinar_resource_pack ? `<div class="pack reveal">
      <img src="/brand/mark-on-yellow.svg" alt="" width="92" height="82">
      <div><h3>Take-home resource pack</h3><p>${esc(s.webinar_resource_pack)}</p></div>
      <span class="stamp">Yours to keep</span>
    </div>` : ''}
  </div>
</section>

<section class="dark" id="register">
  <div class="glow g1" style="left:auto;right:-160px;top:10%;opacity:.4"></div>
  <div class="wrap register-grid">
    <div class="reveal">
      <span class="tag">RSVP</span>
      <h2>Save your free seat.</h2>
      <p class="lead muted">Registration is free. Tell us a little about you so we can keep every session useful.</p>
      ${notes.length ? `<ul class="notes">${notes.map((n, i) => `<li><i>${icon(noteIcons[i] || 'check')}</i>${esc(n)}</li>`).join('')}</ul>` : ''}
    </div>
    <div class="card on-glow reveal" style="--d:.1s">
      ${query.form === 'register' ? alerts(query) : ''}
      <form class="form" method="post" action="/register" data-once>
        ${honeypot}
        <label>Full name<input name="name" required maxlength="120" autocomplete="name"></label>
        <div class="row2">
          <label>Email<input name="email" type="email" required maxlength="160" autocomplete="email"></label>
          <label>WhatsApp number<input name="phone" type="tel" required maxlength="30" autocomplete="tel" placeholder="080..."></label>
        </div>
        <div class="row2">
          <label>Current status
            <select name="status" required>
              <option value="">Choose one</option>
              ${REG_STATUS.map((o) => `<option>${esc(o)}</option>`).join('')}
            </select>
          </label>
          <label>Experience level
            <select name="experience" required>
              <option value="">Choose one</option>
              ${REG_EXPERIENCE.map((o) => `<option>${esc(o)}</option>`).join('')}
            </select>
          </label>
        </div>
        <label>Topic of most interest
          <select name="interest" required>
            <option value="">Choose one</option>
            ${courses.map((c) => `<option>${esc(c.title)}</option>`).join('')}
            <option>All four</option>
          </select>
        </label>
        <label>A question for the facilitators (optional)<textarea name="question" maxlength="1000" style="min-height:90px"></textarea></label>
        <label>How did you hear about us?
          <select name="source">
            <option value="">Choose one (optional)</option>
            <option>Instagram</option><option>Facebook</option><option>X (Twitter)</option><option>LinkedIn</option><option>WhatsApp</option><option>TikTok</option><option>A friend</option><option>Other</option>
          </select>
        </label>
        <label class="check"><input type="checkbox" name="cohort_updates" value="1"> Also keep me updated about subsidised cohort courses (optional, separate from your seat).</label>
        ${consent}
        <button class="btn btn-block" type="submit">Reserve my free seat ${arrowBtn}</button>
      </form>
    </div>
  </div>
</section>

<section class="light" id="courses">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="tag">After the webinar</span>
      <h2>Next: subsidised cohort courses</h2>
      <p class="lead">After the webinar, interested participants can join guided cohort courses in the four fields. Entry levels follow your registration and feedback. Course scope, teaching capacity and a small participation contribution are confirmed before enrolment opens, with free places where we can support them.</p>
    </div>
    <div class="course-grid">${courses.map((c, i) => courseCard(c, payments, i)).join('')}</div>
  </div>
</section>

<section class="blue on-dark" id="contact">
  <div class="wrap contact-grid">
    <div class="reveal">
      <span class="tag">Contact</span>
      <h2>Questions? Talk to a human.</h2>
      <p class="lead">Ask about the webinar, the cohort courses or working with TheBridge Project and Integrated Services Limited.</p>
      <div class="contact-ways">
        <a href="${esc(whatsappLink(s.contact_whatsapp, 'Hello TheBridge, I have a question.'))}" target="_blank" rel="noopener">
          <span class="ico wa">${icon('chat')}</span><span><small>Fastest · WhatsApp</small><strong>${esc(s.contact_whatsapp)}</strong></span><span class="go">${icon('arrow')}</span>
        </a>
        <a href="mailto:${esc(s.contact_email)}">
          <span class="ico">${icon('mail')}</span><span><small>Email</small><strong>${esc(s.contact_email)}</strong></span><span class="go">${icon('arrow')}</span>
        </a>
      </div>
    </div>
    <div class="card reveal" style="--d:.1s">
      ${query.form === 'contact' ? alerts(query) : ''}
      <form class="form" method="post" action="/contact" data-once>
        ${honeypot}
        <label>Your name<input name="name" required maxlength="120" autocomplete="name"></label>
        <label>Email or WhatsApp number<input name="reach" required maxlength="160" placeholder="you@example.com or 080..."></label>
        <label>Topic
          <select name="subject"><option>General question</option><option>Webinar</option><option>Cohort courses</option><option>Payments</option><option>Partnership</option></select>
        </label>
        <label>Message<textarea name="body" required maxlength="4000"></textarea></label>
        <button class="btn btn-block" type="submit">Send message ${arrowBtn}</button>
      </form>
    </div>
  </div>
</section>`;
}

export function coursesPage({ courses, payments }) {
  return `
<section class="page-hero dark">
  <div class="glow g1"></div><div class="glow g3"></div><div class="grid-bg"></div>
  <div class="wrap page-hero-grid">
    <div class="reveal">
      <span class="tag">After the webinar</span>
      <h1>Highly subsidised <span class="last">cohort courses</span></h1>
      <p class="lead muted">Guided learning in the four fields you met in the webinar. Tell us which one you want and we will confirm entry level, dates and your place.</p>
    </div>
    <img src="/brand/mark-reversed.svg" alt="" width="240" height="215">
  </div>
</section>
<section class="light">
  <div class="wrap">
    <div class="section-head reveal"><span class="tag">Choose a path</span><h2>Pick your lane.</h2></div>
    <div class="course-grid">${courses.map((c, i) => courseCard(c, payments, i)).join('')}</div>
  </div>
</section>
${goodToKnow()}`;
}

export function coursePage({ course: c, payments, query }) {
  const open = isOpen(c, payments);
  const option = (key, label) => `<label><input type="radio" name="provider" value="${key}" required ${payments[key] ? '' : 'disabled'}> ${label}${payments[key] ? '' : ' <small>(unavailable)</small>'}</label>`;
  return `
<section class="dark page-hero" style="padding-top:48px !important">
  <div class="glow g1"></div><div class="grid-bg"></div>
  <div class="wrap course-page">
    <div class="reveal">
      <a href="/courses" class="back">${'<span style="display:inline-block;width:16px;transform:rotate(180deg)">' + icon('arrow') + '</span>'} All courses</a>
      <div class="color-bar ${esc(c.colour)}"></div>
      <h1>${esc(c.title)}</h1>
      <div class="course-meta">
        ${c.duration ? `<span class="chip">${esc(c.duration)}</span>` : ''}
        <span class="chip">${c.start_date ? `Starts ${esc(c.start_date)}` : 'Dates to be confirmed'}</span>
        <span class="chip">Live online</span>
        <span class="chip">${open ? 'Enrolment open' : 'Taking interest'}</span>
      </div>
      <p class="lead" style="color:#D4D4D0">${esc(c.summary)}</p>
      ${lines(c.outcomes).length ? `<h3 style="margin-top:32px">What you'll be able to do</h3>
      <ul class="ticks">${lines(c.outcomes).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
      ${c.session_title ? `<div class="session-note"><i>${icon('play')}</i><div><small>Introduced in the free webinar</small>${esc(c.session_title)}</div></div>` : ''}
      ${facilitatorNote(c)}
    </div>
    <div class="card on-glow reveal" style="--d:.1s">
      ${alerts(query)}
      <h2>${open ? 'Reserve your place' : 'Express interest'}</h2>
      <dl class="receipt order">
        <div><dt>Course</dt><dd>${esc(c.title)}</dd></div>
        <div><dt>Participation contribution</dt><dd>${esc(contribution(c))}</dd></div>
        <div><dt>Total due</dt><dd>${esc(open ? naira(c.price_kobo) : 'To be confirmed')}</dd></div>
      </dl>
      ${open ? `
      <form class="form" method="post" action="/enrol" data-once>
        ${honeypot}
        <input type="hidden" name="course" value="${esc(c.slug)}">
        <label>Full name<input name="name" required maxlength="120" autocomplete="name"></label>
        <label>Email (your receipt goes here)<input name="email" type="email" required maxlength="160" autocomplete="email"></label>
        <label>WhatsApp number<input name="phone" type="tel" required maxlength="30" autocomplete="tel"></label>
        ${experienceSelect}
        <fieldset class="pay-choice">
          <legend>Pay securely with</legend>
          ${option('paystack', 'Paystack')}
          ${option('flutterwave', 'Flutterwave')}
        </fieldset>
        ${consent}
        <button class="btn btn-block" type="submit">Continue to secure payment ${arrowBtn}</button>
        <p class="consent">You are taken to the payment provider to pay by card, bank transfer or the options they offer. We never see or store your card details.</p>
      </form>
      <details class="free-place">
        <summary>Can't pay the contribution? Ask for a free place</summary>
        <p class="consent" style="margin-top:8px">Free places are offered where the team can support them.</p>
        ${interestForm(c, { freePlace: true })}
      </details>` : `
      <p>Once the course scope, teaching capacity and contribution are confirmed, we open enrolment and send you a secure payment link. Free places are offered where the team can support them.</p>
      ${interestForm(c)}`}
    </div>
  </div>
</section>
${goodToKnow()}`;
}

export function paymentResultPage({ enrolment: e, course, state }) {
  const views = {
    paid: ['ok', '✓', 'Payment confirmed', `You're enrolled in ${course?.title || 'your course'}. We've recorded your payment and will contact you by email and WhatsApp with your onboarding details.`],
    pending: ['', '…', 'Confirming your payment', "We haven't received confirmation from the payment provider yet. This can take a few minutes. If you were charged, you're covered — we'll confirm by email. Keep your reference below."],
    failed: ['err', '×', 'Payment not completed', 'The payment was cancelled or declined, and you have not been charged by us. You can try again or pick the other payment option.'],
  };
  const [cls, mark, heading, text] = views[state];
  return `
<section class="dark">
  <div class="glow g1"></div>
  <div class="wrap result" style="position:relative">
    <div class="badge ${cls}">${mark}</div>
    <h1 style="font-size:clamp(2.2rem,5vw,3.4rem)">${esc(heading)}</h1>
    <p class="lead muted">${esc(text)}</p>
    ${e ? `<dl class="receipt">
      <div><dt>Reference</dt><dd>${esc(e.reference)}</dd></div>
      <div><dt>Course</dt><dd>${esc(course?.title || '')}</dd></div>
      <div><dt>Amount</dt><dd>${esc(naira(e.amount_kobo))}</dd></div>
      <div><dt>Paid with</dt><dd>${esc(e.provider === 'paystack' ? 'Paystack' : 'Flutterwave')}</dd></div>
    </dl>` : ''}
    <div class="hero-actions">
      ${state === 'failed' && course ? `<a class="btn btn-yellow" href="/courses/${esc(course.slug)}">Try again ${arrowBtn}</a>` : `<a class="btn btn-yellow" href="/">Back to home ${arrowBtn}</a>`}
      <a class="btn btn-ghost" href="/#contact">Contact us</a>
    </div>
  </div>
</section>`;
}

export function demoCheckoutPage({ enrolment: e, course }) {
  return `
<section class="dark">
  <div class="wrap result">
    <div class="alert">Demo checkout — local testing only. No money moves. Set real keys in .env to use ${esc(e.provider === 'paystack' ? 'Paystack' : 'Flutterwave')}.</div>
    <h1 style="font-size:2.6rem">Pay ${esc(naira(e.amount_kobo))}</h1>
    <p class="muted">${esc(course.title)} · ${esc(e.email)}</p>
    <form method="post" action="/payments/demo" class="hero-actions">
      <input type="hidden" name="reference" value="${esc(e.reference)}">
      <button class="btn btn-yellow" name="outcome" value="success" type="submit">Simulate success</button>
      <button class="btn btn-ghost" name="outcome" value="fail" type="submit">Simulate failure</button>
    </form>
  </div>
</section>`;
}

export function notFoundPage() {
  return `<section class="dark"><div class="glow g1"></div><div class="wrap result" style="position:relative"><div class="badge err">404</div><h1>Lost the bridge.</h1><p class="lead muted" style="margin-bottom:24px">That page doesn't exist or has moved.</p><div class="hero-actions"><a class="btn btn-yellow" href="/">Go home ${arrowBtn}</a></div></div></section>`;
}
