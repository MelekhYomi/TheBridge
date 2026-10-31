import { esc, lines, naira, whatsappLink, alerts, icon, arrowBtn } from './layout.js';
import { media } from '../data.js';

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

// ---------- Media ----------

/** The 11-character video id from any common YouTube link, or ''. */
export function youtubeId(url) {
  const m = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/.exec(String(url || ''));
  return m ? m[1] : '';
}

// A thumbnail that becomes the real player on click, so YouTube's heavy
// scripts never load unless someone actually plays the video.
export function videoEmbed(url, title) {
  const id = youtubeId(url);
  if (!id) return '';
  return `<a class="yt" href="https://www.youtube.com/watch?v=${id}" data-yt="${id}" target="_blank" rel="noopener" aria-label="Play video: ${esc(title)}">
    <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
    <span class="yt-play" aria-hidden="true">${icon('play')}</span>
  </a>`;
}

const audioPlayer = (a, title) => (a ? `<figure class="audio"><figcaption>${icon('audio')}${esc(title)}</figcaption><audio controls preload="none" src="${esc(a.url)}"></audio></figure>` : '');

const imgTag = (m, { cls = '', alt, eager = false, w = 1200, h = 800 } = {}) => (m
  ? `<img${cls ? ` class="${cls}"` : ''} src="${esc(m.url)}" alt="${esc(alt ?? m.alt)}" width="${w}" height="${h}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}>`
  : '');

// ---------- Facilitators ----------

const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// Photo, or initials on the course colour when there's no photo yet.
function avatar(site, f, cls = '') {
  const photo = media(site, f.photo);
  return photo
    ? imgTag(photo, { cls, alt: f.name, w: 600, h: 600 })
    : `<span class="${cls} initials" aria-hidden="true">${esc(initials(f.name))}</span>`;
}

const SOCIALS = [['x', 'X (Twitter)'], ['github', 'GitHub'], ['instagram', 'Instagram'], ['website', 'Website']];
export const safeUrl = (u) => (/^https?:\/\/[^\s"'<>]+$/i.test(u || '') ? u : '');

// LinkedIn gets a labelled pill; the rest are icon buttons.
function socialLinks(f) {
  const out = [];
  if (safeUrl(f.linkedin)) out.push(`<a class="soc-in" href="${esc(f.linkedin)}" target="_blank" rel="noopener">${icon('linkedin')}<span>LinkedIn</span></a>`);
  for (const [key, label] of SOCIALS) {
    if (safeUrl(f[key])) out.push(`<a class="soc" href="${esc(f[key])}" target="_blank" rel="noopener" aria-label="${esc(f.name)} on ${label}">${icon(key === 'website' ? 'globe' : key)}</a>`);
  }
  return out.length ? `<div class="socials">${out.join('')}</div>` : '';
}

const facilitatorFor = (site, c) => site.facilitators.find((f) => f.course_id === c.id);

function facilitatorCard(site, f, c, i) {
  const audio = media(site, f.audio);
  const vid = youtubeId(f.video);
  return `<article class="person c-${esc(c?.colour || 'blue')} reveal" style="--d:${(i * 0.08).toFixed(2)}s">
    <div class="person-photo">
      ${avatar(site, f)}
      <span class="person-idx">0${i + 1}</span>
    </div>
    <div class="person-body">
      <span class="person-role">${esc(f.role)}</span>
      <h3>${esc(f.name)}</h3>
      ${c ? `<a class="person-course" href="/courses/${esc(c.slug)}"><i></i>Leads ${esc(c.title)}</a>` : ''}
      ${f.bio ? `<p class="person-bio">${esc(f.bio)}</p>` : ''}
      ${f.qualifications.length ? `<ul class="quals">${f.qualifications.map((q) => `<li>${icon('award')}<span>${esc(q)}</span></li>`).join('')}</ul>` : ''}
      ${vid ? `<a class="person-media" href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener">${icon('play')}Watch ${esc(f.name.split(' ')[0])}'s intro</a>` : ''}
      ${audio ? `<audio class="person-audio" controls preload="none" src="${esc(audio.url)}" aria-label="Audio intro from ${esc(f.name)}"></audio>` : ''}
      ${socialLinks(f)}
    </div>
  </article>`;
}

function facilitatorsSection(site) {
  const s = site.settings;
  if (!site.facilitators.length) return '';
  const course = (f) => site.courses.find((c) => c.id === f.course_id);
  return `<section class="dark" id="facilitators">
  <div class="glow g2" style="opacity:.35"></div>
  <div class="wrap">
    <div class="section-head reveal">
      <span class="tag">${esc(s.facilitators_tag)}</span>
      <h2>${esc(s.facilitators_title)}</h2>
      <p class="lead muted">${esc(s.facilitators_lead)}</p>
    </div>
    <div class="people">${site.facilitators.map((f, i) => facilitatorCard(site, f, course(f), i)).join('')}</div>
  </div>
</section>`;
}

// Compact "your facilitator" block for a course page.
function facilitatorNote(site, c) {
  const f = facilitatorFor(site, c);
  if (!f) return '';
  return `<div class="person-mini c-${esc(c.colour)}">
    ${avatar(site, f, 'mini-photo')}
    <div>
      <small>Your facilitator</small>
      <strong>${esc(f.name)}</strong>
      <span>${esc(f.role)}</span>
    </div>
    ${socialLinks(f)}
  </div>`;
}

// ---------- Courses ----------

function courseCard(site, c, payments, i) {
  const open = isOpen(c, payments);
  const f = facilitatorFor(site, c);
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
      ${f ? `<div class="led-by">${avatar(site, f, 'mini-photo')}<span><small>Led by</small>${esc(f.name)}</span></div>` : ''}
      <div class="price"><small>Participation contribution</small>${esc(contribution(c))}</div>
      <div class="course-actions">
        <a class="btn" href="/courses/${esc(c.slug)}">${open ? 'Enrol now' : 'Express interest'} ${arrowBtn}</a>
      </div>
    </div>
  </article>`;
}

// "question | answer" per line.
export const parseFaq = (text) => lines(text).map((l) => {
  const i = l.indexOf('|');
  return i < 0 ? null : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
}).filter(Boolean);

function goodToKnow(s) {
  const qa = parseFaq(s.faq);
  if (!qa.length) return '';
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

// ---------- Home page ----------

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

// Highlights the last `n` words of a heading.
function lastWords(text, n = 2) {
  const words = String(text).trim().split(/\s+/);
  const tail = words.splice(Math.max(1, words.length - n));
  return `${esc(words.join(' '))} <span class="last">${esc(tail.join(' '))}</span>`;
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

function introSection(site) {
  const s = site.settings;
  const video = videoEmbed(s.promo_video, s.promo_title);
  const audio = audioPlayer(media(site, s.promo_audio), s.promo_audio_title);
  if (!video && !audio) return '';
  return `<section class="light intro" id="intro">
  <div class="wrap intro-grid${video ? '' : ' no-video'}">
    <div class="reveal">
      <span class="tag">${esc(s.promo_tag)}</span>
      <h2>${esc(s.promo_title)}</h2>
      ${s.promo_text ? `<p class="lead">${esc(s.promo_text)}</p>` : ''}
      ${audio}
    </div>
    ${video ? `<div class="reveal" style="--d:.1s">${video}</div>` : ''}
  </div>
</section>`;
}

const noteIcons = ['phone', 'bolt', 'laptop', 'video'];

export function homePage({ site, payments, query }) {
  const s = site.settings;
  const { courses } = site;
  const agenda = parseAgenda(s.webinar_agenda);
  const audience = lines(s.webinar_audience);
  const notes = lines(s.webinar_notes);
  const title = heroTitle(s.webinar_title);
  const heroImg = media(site, s.hero_image);
  const tickerItems = [...courses.map((c) => c.title), ...lines(s.ticker_extra)];
  const tickerRun = tickerItems.map((t) => `<span>${esc(t)} ${icon('spark')}</span>`).join('');
  return `
<section class="hero dark" id="webinar">
  <div class="glow g1"></div><div class="glow g2"></div><div class="glow g3"></div><div class="grid-bg"></div>
  <div class="wrap hero-grid">
    <div>
      <div class="live reveal"><i></i>${esc(s.hero_badge)}</div>
      <h1 ${rv(1)}>${title.h1}</h1>
      <div ${rv(2)}>${title.sub}</div>
      <p class="lead reveal" style="--d:.21s">${esc(s.webinar_tagline)}</p>
      <div class="hero-actions reveal" style="--d:.28s">
        <a class="btn btn-yellow" href="#register">${esc(s.hero_cta)} ${arrowBtn}</a>
        <a class="btn btn-ghost" href="#fields">${esc(s.hero_cta_secondary)}</a>
      </div>
      ${audience.length ? `<div class="audience reveal" style="--d:.35s"><span>Made for</span>${audience.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="hero-bento reveal" style="--d:.2s">
      ${ticket(s)}
      <div class="tile mark${heroImg ? ' photo' : ''}" style="grid-row:span 2">${heroImg ? imgTag(heroImg, { eager: true, w: 600, h: 800 }) : '<img src="/brand/mark-reversed.svg" alt="" width="240" height="215">'}</div>
      <div class="tile y"><div class="k">${esc(s.hero_minutes)}</div><div class="l">${esc(s.hero_minutes_label)}</div></div>
      <div class="tile r"><div class="k">${esc(s.hero_price)}</div><div class="l">${esc(s.hero_price_label)}</div></div>
    </div>
  </div>
</section>

<div class="ticker" aria-hidden="true"><div class="ticker-track">${tickerRun}${tickerRun}</div></div>

${introSection(site)}

<section class="light" id="fields">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="tag">${esc(s.fields_tag)}</span>
      <h2>${esc(s.fields_title)}</h2>
      <p class="lead">${esc(s.fields_lead)}</p>
    </div>
    <div class="stat-row">
      <div ${rv(0)}><strong>${esc(s.hero_minutes)}</strong><span>${esc(s.hero_minutes_label)}</span></div>
      <div ${rv(1)}><strong>${courses.length}</strong><span>live demonstrations</span></div>
      <div ${rv(2)}><strong>${courses.length}</strong><span>starter exercises</span></div>
      <div ${rv(3)}><strong>${esc(s.hero_price)}</strong><span>${esc(s.hero_price_label)}</span></div>
    </div>
    <div class="bento">${courses.map(fieldCard).join('')}</div>
  </div>
</section>

${facilitatorsSection(site)}

<section class="dark" id="programme" style="border-top:1px solid var(--line)">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="tag">${esc(s.programme_tag)}</span>
      <h2>${esc(s.programme_title)}</h2>
      <p class="lead muted">${esc(s.programme_lead)}</p>
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
      <span class="tag">${esc(s.outcomes_tag)}</span>
      <h2>${esc(s.outcomes_title)}</h2>
    </div>
    <div class="outcome-grid">
      ${lines(s.webinar_outcomes).map((o, i) => `<div class="outcome reveal" style="--d:${(i * 0.06).toFixed(2)}s">
        <div class="badge"><span>Skill ${String(i + 1).padStart(2, '0')}</span><i>${icon('check')}</i></div>
        <p>${esc(o)}</p>
      </div>`).join('')}
    </div>
    ${s.webinar_resource_pack ? `<div class="pack reveal">
      <img src="/brand/mark-on-yellow.svg" alt="" width="92" height="82" loading="lazy">
      <div><h3>${esc(s.pack_title)}</h3><p>${esc(s.webinar_resource_pack)}</p></div>
      <span class="stamp">${esc(s.pack_stamp)}</span>
    </div>` : ''}
  </div>
</section>

<section class="dark" id="register">
  <div class="glow g1" style="left:auto;right:-160px;top:10%;opacity:.4"></div>
  <div class="wrap register-grid">
    <div class="reveal">
      <span class="tag">${esc(s.register_tag)}</span>
      <h2>${esc(s.register_title)}</h2>
      <p class="lead muted">${esc(s.register_lead)}</p>
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
        <button class="btn btn-block" type="submit">${esc(s.register_button)} ${arrowBtn}</button>
      </form>
    </div>
  </div>
</section>

<section class="light" id="courses">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="tag">${esc(s.courses_tag)}</span>
      <h2>${esc(s.courses_title)}</h2>
      <p class="lead">${esc(s.courses_lead)}</p>
    </div>
    <div class="course-grid">${courses.map((c, i) => courseCard(site, c, payments, i)).join('')}</div>
  </div>
</section>

<section class="blue on-dark" id="contact">
  <div class="wrap contact-grid">
    <div class="reveal">
      <span class="tag">${esc(s.contact_tag)}</span>
      <h2>${esc(s.contact_title)}</h2>
      <p class="lead">${esc(s.contact_lead)}</p>
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

// ---------- Course pages ----------

export function coursesPage({ site, payments }) {
  const s = site.settings;
  return `
<section class="page-hero dark">
  <div class="glow g1"></div><div class="glow g3"></div><div class="grid-bg"></div>
  <div class="wrap page-hero-grid">
    <div class="reveal">
      <span class="tag">${esc(s.courses_tag)}</span>
      <h1>${lastWords(s.courses_page_title)}</h1>
      <p class="lead muted">${esc(s.courses_page_lead)}</p>
    </div>
    <img src="/brand/mark-reversed.svg" alt="" width="240" height="215">
  </div>
</section>
<section class="light">
  <div class="wrap">
    <div class="section-head reveal"><span class="tag">Choose a path</span><h2>${esc(s.courses_pick)}</h2></div>
    <div class="course-grid">${site.courses.map((c, i) => courseCard(site, c, payments, i)).join('')}</div>
  </div>
</section>
${goodToKnow(s)}`;
}

export function coursePage({ site, course: c, payments, query }) {
  const open = isOpen(c, payments);
  const option = (key, label) => `<label><input type="radio" name="provider" value="${key}" required ${payments[key] ? '' : 'disabled'}> ${label}${payments[key] ? '' : ' <small>(unavailable)</small>'}</label>`;
  const video = videoEmbed(c.video, c.title);
  return `
<section class="dark page-hero" style="padding-top:48px !important">
  <div class="glow g1"></div><div class="grid-bg"></div>
  <div class="wrap course-page">
    <div class="reveal">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/courses">Courses</a></nav>
      <div class="color-bar ${esc(c.colour)}"></div>
      <h1>${esc(c.title)}</h1>
      <div class="course-meta">
        ${c.duration ? `<span class="chip">${esc(c.duration)}</span>` : ''}
        <span class="chip">${c.start_date ? `Starts ${esc(c.start_date)}` : 'Dates to be confirmed'}</span>
        <span class="chip">Live online</span>
        <span class="chip">${open ? 'Enrolment open' : 'Taking interest'}</span>
      </div>
      <p class="lead" style="color:#D4D4D0">${esc(c.summary)}</p>
      ${video ? `<div class="course-video">${video}</div>` : ''}
      ${lines(c.outcomes).length ? `<h2 class="h3" style="margin-top:32px">What you'll be able to do</h2>
      <ul class="ticks">${lines(c.outcomes).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
      ${c.session_title ? `<div class="session-note"><i>${icon('play')}</i><div><small>Introduced in the free webinar</small>${esc(c.session_title)}</div></div>` : ''}
      ${facilitatorNote(site, c)}
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
${goodToKnow(site.settings)}`;
}

// ---------- Payments and errors ----------

export function paymentResultPage({ enrolment: e, course, state }) {
  const views = {
    paid: ['ok', '✓', 'Payment confirmed', `You're enrolled in ${course?.title || 'your course'}. We've recorded your payment and will contact you by email and WhatsApp with your onboarding details.`],
    pending: ['', '…', 'Confirming your payment', "We haven't received confirmation from the payment provider yet. This can take a few minutes. If you were charged, you're covered — we'll confirm by email. Keep your reference below."],
    failed: ['err', '×', 'Payment not completed', 'The payment was cancelled or declined, and you have not been charged by us. You can try again or pick the other payment option.'],
  };
  const [cls, mark, heading, text] = views[state] || views.pending;
  return `
<section class="dark">
  <div class="glow g1"></div>
  <div class="wrap result" style="position:relative">
    <div class="badge ${cls}">${mark}</div>
    <h1 style="font-size:clamp(2.2rem,5vw,3.4rem)">${esc(heading)}</h1>
    <p class="lead muted">${esc(text)}</p>
    ${e ? `<dl class="receipt">
      <div><dt>Reference</dt><dd>${esc(e.reference)}</dd></div>
      <div><dt>Course</dt><dd>${esc(course?.title || e.course || '')}</dd></div>
      <div><dt>Amount</dt><dd>${esc(naira(Number(e.amount_kobo)))}</dd></div>
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
    <h1 style="font-size:2.6rem">Pay ${esc(naira(Number(e.amount_kobo)))}</h1>
    <p class="muted">${esc(course?.title || e.course)} · ${esc(e.email)}</p>
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
