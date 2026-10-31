export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Appended to CSS/JS links so a new deploy isn't hidden behind the 1-hour static cache.
export const ASSET_V = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 8);

export const lines = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);

export function naira(kobo) {
  if (kobo == null) return 'Fee to be announced';
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function whatsappLink(number, text = '') {
  const digits = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function alerts(query = {}) {
  const map = {
    registered: ['ok', "You're registered. We'll send the webinar details to your email and WhatsApp."],
    sent: ['ok', 'Message sent. We usually reply within one working day.'],
    interested: ['ok', "Thanks — your interest is recorded. We'll contact you by email and WhatsApp with course details and next steps."],
    invalid: ['err', 'Please fill in the required fields with a valid email address.'],
    badreach: ['err', 'Please enter a valid email address or WhatsApp number so we can reply.'],
    unavailable: ['err', 'That payment option is not available right now. Please pick another or contact us.'],
    payfail: ['err', "We couldn't start the payment. Please try again in a moment."],
  };
  const a = map[query.status];
  return a ? `<div class="alert ${a[0]}" role="status">${esc(a[1])}</div>` : '';
}

const brandName = '<span class="brand-name"><span>The</span><b>Bridge</b></span>';

// Small inline line icons (24px grid, stroke = currentColor).
const ICONS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  play: '<path d="M7 5.5v13l11-6.5z"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
  chat: '<path d="M4 20l1.4-4.2A8 8 0 1 1 8.6 19z"/>',
  spark: '<path d="M12 2c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10 5.4-.6 9.4-4.6 10-10z" fill="currentColor" stroke="none"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7.5 5-3 5 3-1.5-7.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
  linkedin: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-4z" fill="currentColor" stroke="none"/>',
  x: '<path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78zm-1.08 16.17h1.7L7.4 4.73H5.58z" fill="currentColor" stroke="none"/>',
  github: '<path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" fill="currentColor" stroke="none"/>',
};
export const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
export const arrowBtn = `<span class="arr">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS.arrow + '</svg>'}</span>`;

export function layout({ title, description, active = '', body, settings, noindex = false }) {
  const pageTitle = title ? `${title} · TheBridge` : 'TheBridge · Learn the skills that move you forward';
  const nav = [
    ['/#webinar', 'Webinar', 'home'],
    ['/#facilitators', 'Facilitators', 'facilitators'],
    ['/courses', 'Courses', 'courses'],
    ['/#contact', 'Contact', 'contact'],
  ];
  return `<!doctype html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description || 'TheBridge runs a free practical webinar and subsidised cohort courses in product thinking and automation, software development, cybersecurity and blockchain security.')}">
<meta name="theme-color" content="#0A0A0B">${noindex ? '\n<meta name="robots" content="noindex">' : ''}
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:image" content="/icon-512.png">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css?v=${ASSET_V}">
<script src="/js/early.js"></script>
</head>
<body class="site">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="TheBridge home"><img src="/brand/mark-reversed.svg" alt="" width="38" height="34">${brandName}</a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav class="nav" id="nav" aria-label="Main">
      ${nav.map(([href, label, key]) => `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
      <a class="btn btn-yellow btn-sm" href="/#register">Register free</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <div>
        <a class="brand" href="/"><img src="/brand/mark-reversed.svg" alt="" width="49" height="44">${brandName}</a>
        <p>TheBridge Project and Integrated Services Limited. Free webinars and cohort courses that bridge the gap into tech.</p>
        <a class="btn btn-yellow btn-sm footer-cta" href="/#register">Save a free seat ${arrowBtn}</a>
      </div>
      <div>
        <h4>Explore</h4>
        <ul><li><a href="/#webinar">Free webinar</a></li><li><a href="/#programme">Programme</a></li><li><a href="/#facilitators">Facilitators</a></li><li><a href="/courses">Courses</a></li><li><a href="/#contact">Contact</a></li></ul>
      </div>
      <div>
        <h4>Talk to us</h4>
        <ul>
          <li><a href="${esc(whatsappLink(settings.contact_whatsapp))}" rel="noopener" target="_blank">WhatsApp ${esc(settings.contact_whatsapp)}</a></li>
          <li><a href="mailto:${esc(settings.contact_email)}">${esc(settings.contact_email)}</a></li>
        </ul>
      </div>
    </div>
    <div class="mega" aria-hidden="true"><span>The</span>Bridge</div>
    <div class="footer-bar"><i></i><i></i><i></i></div>
    <div class="copyright"><span>© ${new Date().getFullYear()} TheBridge Project and Integrated Services Limited.</span><span>Built to bridge the gap into tech.</span></div>
  </div>
</footer>
<script src="/js/site.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}
