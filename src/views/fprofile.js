import { esc, icon, arrowBtn, ASSET_V } from './layout.js';

// Options for the facilitator profile form. The server only accepts these values.
export const FP = {
  experience: ['Less than 1 year', '1-2 years', '3-5 years', '5+ years'],
  courses: [
    'Product Design (UI/UX)',
    'Frontend Development',
    'Backend Development',
    'Data Analysis / Data Science',
    'Cybersecurity',
    'Mobile App Development',
    'Digital Marketing / Tech Sales',
    'Blockchain / Web3',
    'Other',
  ],
  levels: ['Beginner', 'Intermediate', 'Advanced', 'General (All Levels)'],
  formats: ['Slide Presentation', 'Live Practical / Demo', 'Code-Along', 'Q&A'],
  lengths: ['10 Minutes', '15 Minutes', '20 Minutes', '30 Minutes'],
  certificate: ['Yes', 'No'],
};

export const BIO_MIN_WORDS = 50;

const req = '<b class="req" aria-hidden="true">*</b>';
const hint = (t) => `<small class="hint">${esc(t)}</small>`;
const honeypot = '<label class="hp" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>';

function section(n, title, intro, body) {
  return `<fieldset class="fp-section">
    <legend><span class="fp-num">0${n}</span>${esc(title)}</legend>
    ${intro ? `<p class="fp-intro">${esc(intro)}</p>` : ''}
    ${body}
  </fieldset>`;
}

const text = (v, name, label, { required = true, hintText = '', type = 'text', max = 200, auto = '', placeholder = '' } = {}) => `<label><span>${esc(label)}${required ? req : ''}</span>
  ${hintText ? hint(hintText) : ''}
  <input name="${name}" type="${type}" maxlength="${max}" value="${esc(v[name])}"${required ? ' required' : ''}${auto ? ` autocomplete="${auto}"` : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}>
</label>`;

const para = (v, name, label, { required = true, hintText = '', max = 4000, rows = 5, extra = '' } = {}) => `<label><span>${esc(label)}${required ? req : ''}</span>
  ${hintText ? hint(hintText) : ''}
  <textarea name="${name}" maxlength="${max}" rows="${rows}"${required ? ' required' : ''}${extra}>${esc(v[name])}</textarea>
</label>`;

const select = (v, name, label, options) => `<label><span>${esc(label)}${req}</span>
  <select name="${name}" required>
    <option value="">Choose one</option>
    ${options.map((o) => `<option${v[name] === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}
  </select>
</label>`;

// Checkbox or radio options shown as selectable pills.
function choices(v, name, label, options, { type = 'checkbox', required = false, hintText = '' } = {}) {
  const picked = [].concat(v[name] || []);
  return `<div class="fp-choice" role="group" aria-labelledby="lbl-${name}"${required ? ' data-required' : ''}>
    <span class="fp-label" id="lbl-${name}">${esc(label)}${required ? req : ''}</span>
    ${hintText ? hint(hintText) : ''}
    <div class="pills">
      ${options.map((o) => `<label class="fp-pill"><input type="${type}" name="${name}" value="${esc(o)}"${picked.includes(o) ? ' checked' : ''}${type === 'radio' && required ? ' required' : ''}><span>${esc(o === 'Other' ? 'Other (please specify)' : o)}</span></label>`).join('')}
    </div>
  </div>`;
}

export function fprofilePage({ values = {}, errors = [], sent = false, connected = true }) {
  const v = values;
  const hero = `<section class="page-hero dark fp-hero">
  <div class="glow g1"></div><div class="glow g3"></div><div class="grid-bg"></div>
  <div class="wrap page-hero-grid">
    <div class="reveal">
      <span class="tag">Facilitator profile</span>
      <h1>Welcome, esteemed <span class="last">facilitator</span></h1>
      <p class="lead muted">As we prepare for our upcoming tech webinar, please fill in this form with details of your assigned course, your knowledge base and your wealth of experience. Your response will help us craft the webinar agenda and publicity materials.</p>
    </div>
    <img src="/brand/mark-reversed.svg" alt="" width="240" height="215">
  </div>
</section>`;

  if (sent) {
    return `${hero}
<section class="light">
  <div class="wrap fp-wrap">
    <div class="card fp-done reveal">
      <div class="badge ok">${icon('check')}</div>
      <h2>Thank you. We've got your details.</h2>
      <p>We'll use them to build your profile on the website and the webinar publicity. We'll contact you on WhatsApp or email if we need anything else.</p>
      <div class="hero-actions"><a class="btn" href="/">Visit the website ${arrowBtn}</a></div>
    </div>
  </div>
</section>`;
  }

  const takeaways = [1, 2, 3].map((i) => text(v, `takeaway${i}`, `${i}.`, { max: 300 })).join('');
  return `${hero}
<section class="light">
  <div class="wrap fp-wrap">
    ${!connected ? '<div class="alert err" role="status">This form is not connected to the sheet yet, so submissions will not be saved. Please try again later.</div>' : ''}
    ${errors.length ? `<div class="alert err" role="alert"><strong>Please check the form:</strong><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
    <p class="fp-note">Fields marked ${req} are required. It takes about 10 minutes.</p>
    <form class="form fp-form" method="post" action="/fprofile" data-once>
      ${honeypot}
      ${section(1, 'Facilitator profile', '', `
        ${text(v, 'name', 'Full name', { max: 120, auto: 'name' })}
        <div class="row2">
          ${text(v, 'phone', 'WhatsApp number', { type: 'tel', max: 30, auto: 'tel', placeholder: '080...' })}
          ${text(v, 'email', 'Email address', { type: 'email', max: 160, auto: 'email' })}
        </div>
        ${text(v, 'role', 'Current role and organisation', { hintText: 'For example: Frontend Developer at Paystack', max: 160, auto: 'organization-title' })}
        ${select(v, 'experience', 'Years of experience in this field', FP.experience)}
        <label><span>Professional bio${req}</span>
          ${hint(`We'll use this for publicity. At least ${BIO_MIN_WORDS} words.`)}
          <textarea name="bio" maxlength="3000" rows="6" required data-min-words="${BIO_MIN_WORDS}">${esc(v.bio)}</textarea>
          <small class="counter" data-counter-for="bio" aria-live="polite"></small>
        </label>
        <div class="fp-photo">
          <span class="fp-label" id="lbl-photo">Professional photo${req}</span>
          ${hint('A clear, well-lit headshot. JPG or PNG. We resize it for you.')}
          <div class="photo-drop">
            <img class="photo-preview" alt="Your photo preview"${v.photo_data ? ` src="${esc(v.photo_data)}"` : ' hidden'}>
            <div>
              <input type="file" id="photo" accept="image/jpeg,image/png,image/webp" aria-labelledby="lbl-photo">
              <small class="photo-status" aria-live="polite">${v.photo_data ? 'Photo ready.' : ''}</small>
            </div>
          </div>
          <input type="hidden" name="photo_data" value="${esc(v.photo_data)}">
          <noscript><p class="alert err">Photo upload needs JavaScript. Please turn it on, or send your photo to us on WhatsApp.</p></noscript>
        </div>
        ${text(v, 'link', 'LinkedIn or portfolio link', { required: false, type: 'url', max: 300, placeholder: 'https://www.linkedin.com/in/...' })}
      `)}
      ${section(2, 'Course and session details', '', `
        ${choices(v, 'courses', 'Course(s) assigned to you', FP.courses, { required: true, hintText: 'Tick all that apply.' })}
        <div class="other-course"${[].concat(v.courses || []).includes('Other') ? '' : ' hidden'}>
          ${text(v, 'other_course', 'Please specify the other course', { required: false, max: 120 })}
        </div>
        ${text(v, 'topic', 'Your final session topic', { hintText: 'For example: "Building Responsive Websites with React"', max: 200 })}
        ${para(v, 'qualifications', 'What makes you qualified to take this course?', { hintText: 'Your wealth of experience: projects handled, companies worked with, students trained.' })}
        ${choices(v, 'level', 'Session level', FP.levels, { type: 'radio', required: true })}
      `)}
      ${section(3, 'Session plan', '', `
        <div class="fp-group">
          <span class="fp-label">The 3 key things attendees will learn${req}</span>
          ${takeaways}
        </div>
        ${para(v, 'outline', 'Detailed session outline or agenda', { rows: 7 })}
        ${choices(v, 'formats', 'Delivery format', FP.formats, { hintText: 'Tick all that apply.' })}
        ${select(v, 'length', 'How long will your session be?', FP.lengths)}
        ${text(v, 'tools', 'Tools or software students should install before class', { required: false, max: 300 })}
      `)}
      ${section(4, 'Logistics and commitment', '', `
        ${text(v, 'availability', 'Available date and time for your session', { max: 200, placeholder: 'e.g. Saturday 14 November, 10am to 1pm' })}
        ${para(v, 'requirements', 'Do you have any special requirements from us?', { required: false, rows: 3 })}
        ${choices(v, 'certificate', 'Are you willing to provide a certificate or follow-up resources?', FP.certificate, { type: 'radio' })}
        ${para(v, 'comments', 'Additional comments', { required: false, rows: 3 })}
      `)}
      <div class="fp-submit">
        <p class="consent">We use these details for the webinar programme, publicity and your profile on the TheBridge website. Your phone number and email stay private.</p>
        <button class="btn btn-block" type="submit">Submit my profile ${arrowBtn}</button>
      </div>
    </form>
  </div>
</section>
<script src="/js/fprofile.js?v=${ASSET_V}" defer></script>`;
}
