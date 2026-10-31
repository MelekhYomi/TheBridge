// Everything an admin can edit on the site, with the current wording as defaults.
// The admin "Site content" page is generated from this list. A value saved in
// the admin overrides the default; clearing a field brings the default back
// (except fields marked optional, which hide their section when empty).
//
// Field types: text, textarea, lines (one item per line), image / audio (from
// the media library), video (a YouTube link), datetime, email, private (admin
// only, never shown on the site).

const lines = (...xs) => xs.join('\n');

export const CONTENT_GROUPS = [
  {
    id: 'brand', title: 'Brand, search and social',
    fields: [
      { key: 'org_name', label: 'Organisation name', type: 'text', default: 'TheBridge Project and Integrated Services Limited' },
      { key: 'seo_title', label: 'Home page title in Google', type: 'text', hint: 'About 50–60 characters.', default: 'TheBridge · Free tech webinar and subsidised cohort courses' },
      { key: 'seo_description', label: 'Home page description in Google', type: 'textarea', hint: 'About 150–160 characters.', default: 'Free live webinar and highly subsidised cohort courses in product thinking and automation, software development, cybersecurity and blockchain security. Start your tech career with TheBridge.' },
      { key: 'seo_keywords_area', label: 'Location for search', type: 'text', hint: 'Used in structured data, e.g. Nigeria or Lagos, Nigeria.', default: 'Nigeria' },
      { key: 'og_image', label: 'Share image', type: 'image', optional: true, hint: 'Shown when the site is shared on WhatsApp, LinkedIn or X. Best at 1200 × 630.' },
      { key: 'footer_blurb', label: 'Footer description', type: 'textarea', default: 'TheBridge Project and Integrated Services Limited. Free webinars and cohort courses that bridge the gap into tech.' },
      { key: 'footer_tagline', label: 'Footer tagline', type: 'text', default: 'Built to bridge the gap into tech.' },
      { key: 'social_linkedin', label: 'LinkedIn page', type: 'url', optional: true },
      { key: 'social_instagram', label: 'Instagram', type: 'url', optional: true },
      { key: 'social_x', label: 'X (Twitter)', type: 'url', optional: true },
      { key: 'social_facebook', label: 'Facebook', type: 'url', optional: true },
      { key: 'social_tiktok', label: 'TikTok', type: 'url', optional: true },
      { key: 'social_youtube', label: 'YouTube channel', type: 'url', optional: true },
    ],
  },
  {
    id: 'webinar', title: 'Webinar and hero',
    fields: [
      { key: 'hero_badge', label: 'Badge above the title', type: 'text', default: 'Registration open · Free · 2 hours, live' },
      { key: 'webinar_title', label: 'Webinar name', type: 'text', hint: 'Text after a colon shows as the subtitle.', default: 'Build, Automate and Secure: Your First Practical Step into Tech' },
      { key: 'webinar_tagline', label: 'Tagline', type: 'textarea', default: 'A free practical webinar for students, recent graduates, jobseekers and career switchers. Four facilitators, four fields, and one clear place to start.' },
      { key: 'webinar_audience', label: 'Made for', type: 'lines', hint: 'One group per line.', default: lines('Students', 'Recent graduates', 'Jobseekers', 'Career switchers') },
      { key: 'hero_cta', label: 'Main button', type: 'text', default: 'Save my free seat' },
      { key: 'hero_cta_secondary', label: 'Second button', type: 'text', default: "See what's inside" },
      { key: 'webinar_date', label: 'Date (as shown)', type: 'text', optional: true, hint: 'e.g. Saturday 14 November 2026. Empty shows "TBA".' },
      { key: 'webinar_time', label: 'Time (as shown)', type: 'text', optional: true, hint: 'e.g. 4:00pm WAT' },
      { key: 'webinar_start', label: 'Start date and time for Google', type: 'datetime', optional: true, hint: 'Lagos time. Lets Google show the webinar as an event.' },
      { key: 'webinar_platform', label: 'Where', type: 'text', default: 'Online (live)' },
      { key: 'webinar_join_link', label: 'Joining link', type: 'private', optional: true, hint: 'Private: only shown here, for you to send to registrants.' },
      { key: 'webinar_attendance', label: 'Live attendance', type: 'private', optional: true, hint: 'Peak number from Zoom or Meet, after the event.' },
      { key: 'hero_image', label: 'Hero image', type: 'image', optional: true, hint: 'Replaces the logo tile beside the ticket.' },
      { key: 'hero_minutes', label: 'Yellow tile number', type: 'text', default: '120' },
      { key: 'hero_minutes_label', label: 'Yellow tile label', type: 'text', default: 'minutes, live' },
      { key: 'hero_price', label: 'Red tile number', type: 'text', default: '₦0' },
      { key: 'hero_price_label', label: 'Red tile label', type: 'text', default: 'to attend' },
      { key: 'ticker_extra', label: 'Scrolling ticker', type: 'lines', hint: 'Shown after the course names. One item per line.', default: lines('Free entry', 'Live demos', 'Starter exercises', '120 minutes') },
    ],
  },
  {
    id: 'intro', title: 'Intro video and audio',
    note: 'Optional section under the hero. It only appears when a video or audio clip is set.',
    fields: [
      { key: 'promo_tag', label: 'Small label', type: 'text', default: 'Watch first' },
      { key: 'promo_title', label: 'Heading', type: 'text', default: 'See what the webinar is about' },
      { key: 'promo_text', label: 'Text', type: 'textarea', optional: true },
      { key: 'promo_video', label: 'Video', type: 'video', optional: true },
      { key: 'promo_audio', label: 'Audio clip', type: 'audio', optional: true },
      { key: 'promo_audio_title', label: 'Audio title', type: 'text', default: 'Listen to the 1-minute intro' },
    ],
  },
  {
    id: 'fields', title: 'Four fields section',
    fields: [
      { key: 'fields_tag', label: 'Small label', type: 'text', default: 'The four fields' },
      { key: 'fields_title', label: 'Heading', type: 'text', default: 'Four fields. One practical first step.' },
      { key: 'fields_lead', label: 'Intro', type: 'textarea', default: 'Each facilitator gets 20 minutes: five to explain the subject, ten to demonstrate and five to set your starter exercise and suggested learning path.' },
    ],
  },
  {
    id: 'facilitators', title: 'Facilitators section',
    note: 'The profiles themselves are on the Facilitators page.',
    fields: [
      { key: 'facilitators_tag', label: 'Small label', type: 'text', default: 'Your facilitators' },
      { key: 'facilitators_title', label: 'Heading', type: 'text', default: 'Learn from people who do the work.' },
      { key: 'facilitators_lead', label: 'Intro', type: 'textarea', default: 'Four practitioners, one for each field. They teach the webinar sessions and lead the cohort courses that follow.' },
    ],
  },
  {
    id: 'programme', title: 'Programme',
    fields: [
      { key: 'programme_tag', label: 'Small label', type: 'text', default: 'Programme' },
      { key: 'programme_title', label: 'Heading', type: 'text', default: 'Two hours. No fluff.' },
      { key: 'programme_lead', label: 'Intro', type: 'textarea', default: 'Times are minutes from the start. The date and start time are confirmed before registration opens.' },
      {
        key: 'webinar_agenda', label: 'Programme items', type: 'lines', hint: 'One per line, as "time | who | what".',
        default: lines(
          '0–5 min | Programme coordinator | Welcome, giveback purpose, speaker introductions and an opening audience poll.',
          '5–25 min | Programme coordinator | Product thinking and automation: session, demonstration and starter exercise.',
          '25–45 min | Developer | Software development: session, webpage demonstration and starter exercise.',
          '45–65 min | Cybersecurity expert | Cybersecurity: session, simulated message review and starter exercise.',
          '65–85 min | Blockchain security expert | Blockchain security: session, permissions demonstration and starter exercise.',
          '85–115 min | All four facilitators | Moderated questions and discussion of learning paths, projects and getting started.',
          '115–120 min | Programme coordinator | Exit poll, resource instructions, feedback form and an invitation to show cohort interest.',
        ),
      },
    ],
  },
  {
    id: 'outcomes', title: 'Outcomes and resource pack',
    fields: [
      { key: 'outcomes_tag', label: 'Small label', type: 'text', default: 'Outcomes' },
      { key: 'outcomes_title', label: 'Heading', type: 'text', default: "By the end, you'll be able to…" },
      {
        key: 'webinar_outcomes', label: 'Outcomes', type: 'lines', hint: 'One per line.',
        default: lines(
          'Describe the purpose of each of the four learning areas in your own words.',
          'Map a repeated task as a simple automation workflow.',
          'Identify the basic components used to build a webpage.',
          'Recognise the signs of a suspicious message and name one account protection measure.',
          'Explain a basic permission risk in a blockchain application.',
          'Choose one learning path and one exercise to finish within the following week.',
        ),
      },
      { key: 'pack_title', label: 'Resource pack heading', type: 'text', default: 'Take-home resource pack' },
      { key: 'webinar_resource_pack', label: 'Resource pack text', type: 'textarea', optional: true, hint: 'Leave empty to hide the resource pack.', default: 'The four presentations or summaries, four starter exercises, starter files, learning links and answers to common questions. We send it within 48 hours, along with a feedback form.' },
      { key: 'pack_stamp', label: 'Resource pack stamp', type: 'text', default: 'Yours to keep' },
    ],
  },
  {
    id: 'register', title: 'Registration',
    fields: [
      { key: 'register_tag', label: 'Small label', type: 'text', default: 'RSVP' },
      { key: 'register_title', label: 'Heading', type: 'text', default: 'Save your free seat.' },
      { key: 'register_lead', label: 'Intro', type: 'textarea', default: 'Registration is free. Tell us a little about you so we can keep every session useful.' },
      {
        key: 'webinar_notes', label: 'Practical notes', type: 'lines', hint: 'One per line.',
        default: lines('Watch on a phone or a computer', 'No software to install during the webinar', 'A computer helps for some follow-up exercises', 'Any recording arrangements are explained here at registration and again at the start of the event.'),
      },
      { key: 'register_button', label: 'Button', type: 'text', default: 'Reserve my free seat' },
    ],
  },
  {
    id: 'courses', title: 'Courses section and page',
    fields: [
      { key: 'courses_tag', label: 'Small label', type: 'text', default: 'After the webinar' },
      { key: 'courses_title', label: 'Home page heading', type: 'text', default: 'Next: subsidised cohort courses' },
      { key: 'courses_lead', label: 'Home page intro', type: 'textarea', default: 'After the webinar, interested participants can join guided cohort courses in the four fields. Entry levels follow your registration and feedback. Course scope, teaching capacity and a small participation contribution are confirmed before enrolment opens, with free places where we can support them.' },
      { key: 'courses_page_title', label: 'Courses page heading', type: 'text', hint: 'The last two words are highlighted.', default: 'Highly subsidised cohort courses' },
      { key: 'courses_page_lead', label: 'Courses page intro', type: 'textarea', default: 'Guided learning in the four fields you met in the webinar. Tell us which one you want and we will confirm entry level, dates and your place.' },
      { key: 'courses_page_description', label: 'Courses page description in Google', type: 'textarea', default: 'Highly subsidised cohort courses in product thinking and automation, software development, cybersecurity and blockchain security, with free places available.' },
      { key: 'courses_pick', label: 'Course list heading', type: 'text', default: 'Pick your lane.' },
      {
        key: 'faq', label: 'Questions and answers', type: 'lines', hint: 'One per line, as "question | answer". Also shown in Google as FAQs.',
        default: lines(
          'Who can join? | Entry levels are set from your experience level and webinar feedback, so beginners are not left behind.',
          'What does it cost? | Courses are highly subsidised, with a small participation contribution. The amount is shown on each course once it is confirmed, and free places are offered where the team can support them.',
          'What happens next? | When a course is open, you pay your contribution securely with Paystack or Flutterwave and we confirm your place. Before then, express interest: we review interest, confirm scope and teaching capacity, then contact you with your course details and payment link.',
        ),
      },
    ],
  },
  {
    id: 'contact', title: 'Contact',
    fields: [
      { key: 'contact_tag', label: 'Small label', type: 'text', default: 'Contact' },
      { key: 'contact_title', label: 'Heading', type: 'text', default: 'Questions? Talk to a human.' },
      { key: 'contact_lead', label: 'Intro', type: 'textarea', default: 'Ask about the webinar, the cohort courses or working with TheBridge Project and Integrated Services Limited.' },
      { key: 'contact_email', label: 'Email', type: 'email', default: 'mail.oluwanifemi@gmail.com' },
      { key: 'contact_whatsapp', label: 'WhatsApp number', type: 'text', hint: 'With country code, e.g. +234…', default: '+234 707 070 4095' },
    ],
  },
];

export const CONTENT_FIELDS = CONTENT_GROUPS.flatMap((g) => g.fields);
export const CONTENT_KEYS = new Set(CONTENT_FIELDS.map((f) => f.key));
export const DEFAULTS = Object.fromEntries(CONTENT_FIELDS.map((f) => [f.key, f.default ?? '']));
const OPTIONAL = new Set(CONTENT_FIELDS.filter((f) => f.optional).map((f) => f.key));

/** Saved values over defaults. An empty saved value falls back to the default unless the field is optional. */
export function mergeContent(rows) {
  const out = { ...DEFAULTS };
  for (const r of rows) {
    if (!CONTENT_KEYS.has(r.key)) continue;
    if (r.value !== '' || OPTIONAL.has(r.key)) out[r.key] = r.value;
  }
  return out;
}

// First-run data, written to the sheet when the Courses or Facilitators tab is empty.
export const SEED_COURSES = [
  {
    id: 'c1', sort: '1', active: '1', slug: 'product-thinking-automation', title: 'Product thinking and automation', colour: 'blue',
    summary: 'Identify a useful problem, map a solution and automate repetitive work.',
    session_title: 'Solving Everyday Problems with Technology',
    session_desc: 'Identify a useful problem, describe who it affects and map the steps of a solution. See how a simple automation removes repetitive work.',
    session_demo: 'Turn a form submission into an organised task or follow-up workflow, using sample information.',
    session_exercise: 'Pick one repeated task and sketch its trigger, steps and intended result.',
  },
  {
    id: 'c2', sort: '2', active: '1', slug: 'software-development', title: 'Software development', colour: 'yellow',
    summary: 'Build on HTML, CSS and JavaScript towards working websites and web apps.',
    session_title: 'From an Idea to a Working Website',
    session_desc: 'Front-end and back-end development in plain language, and the role of HTML, CSS and JavaScript in a webpage.',
    session_demo: 'Build or edit a simple personal portfolio page from prepared starter files.',
    session_exercise: 'Personalise the page, or sketch a useful website and its main features.',
  },
  {
    id: 'c3', sort: '3', active: '1', slug: 'cybersecurity', title: 'Cybersecurity', colour: 'red',
    summary: 'Recognise risks, apply controls and learn to communicate your findings.',
    session_title: 'Protecting Your Digital Life',
    session_desc: 'Phishing, account protection, multifactor authentication and device hygiene, and how security work spots risks and applies controls.',
    session_demo: 'Review a simulated suspicious message and a sample account security checklist.',
    session_exercise: 'Review your own security settings and write three improvements, without sharing private details.',
  },
  {
    id: 'c4', sort: '4', active: '1', slug: 'blockchain-security', title: 'Blockchain security', colour: 'black',
    summary: 'Lay the foundations for securing smart contracts and decentralised apps.',
    session_title: 'Understanding and Securing Blockchain Applications',
    session_desc: 'Blockchains, smart contracts and decentralised apps, and how permissions, transactions and contract logic can create security risks.',
    session_demo: 'Walk through a contract permission or transaction approval scenario in a test environment.',
    session_exercise: 'Identify the users, permissions and one possible risk in a simple blockchain app.',
  },
];

const placeholder = {
  name: 'Facilitator name',
  bio: 'A short two or three sentence bio: current work, years of experience and what you love teaching beginners.',
  qualifications: lines('Degree, institution', 'Professional certification', 'Notable role or achievement'),
};

export const SEED_FACILITATORS = [
  { id: 'f1', sort: '1', active: '1', course_id: 'c1', role: 'Programme coordinator', ...placeholder },
  { id: 'f2', sort: '2', active: '1', course_id: 'c2', role: 'Developer', ...placeholder },
  { id: 'f3', sort: '3', active: '1', course_id: 'c3', role: 'Cybersecurity expert', ...placeholder },
  { id: 'f4', sort: '4', active: '1', course_id: 'c4', role: 'Blockchain security expert', ...placeholder },
];
