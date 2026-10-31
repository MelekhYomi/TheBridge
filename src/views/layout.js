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
  audio: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8z" fill="currentColor" stroke="none"/>',
  tiktok: '<path d="M16.5 3c.4 2.3 1.9 3.8 4 4v3.3a7.6 7.6 0 0 1-4-1.2v6.4A5.6 5.6 0 1 1 11 9.9v3.4a2.3 2.3 0 1 0 2.2 2.3V3z" fill="currentColor" stroke="none"/>',
  youtube: '<path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8zM10 15V9l5.2 3z" fill="currentColor" stroke="none"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7.5 5-3 5 3-1.5-7.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
  linkedin: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-4z" fill="currentColor" stroke="none"/>',
  x: '<path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78zm-1.08 16.17h1.7L7.4 4.73H5.58z" fill="currentColor" stroke="none"/>',
  github: '<path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" fill="currentColor" stroke="none"/>',
};
export const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
export const arrowBtn = `<span class="arr">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS.arrow + '</svg>'}</span>`;

const FOOTER_SOCIALS = [['social_linkedin', 'linkedin', 'LinkedIn'], ['social_instagram', 'instagram', 'Instagram'], ['social_x', 'x', 'X'],
  ['social_facebook', 'facebook', 'Facebook'], ['social_tiktok', 'tiktok', 'TikTok'], ['social_youtube', 'youtube', 'YouTube']];

/**
 * The public page shell. `seo` carries everything search engines and link
 * previews read: { title, description, path, image, jsonLd, noindex }.
 */
export function layout({ active = '', body, site, seo = {} }) {
  const s = site.settings;
  const base = siteUrl();
  const pageTitle = seo.title ? `${seo.title} · TheBridge` : s.seo_title;
  const description = seo.description || s.seo_description;
  const canonical = `${base}${seo.path ?? '/'}`;
  const image = seo.image || ogImage(site);
  const nav = [
    ['/#webinar', 'Webinar', 'home'],
    ['/#facilitators', 'Facilitators', 'facilitators'],
    ['/courses', 'Courses', 'courses'],
    ['/#contact', 'Contact', 'contact'],
  ];
  const socials = FOOTER_SOCIALS.filter(([k]) => /^https?:\/\//.test(s[k] || ''));
  return `<!doctype html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
${seo.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta name="theme-color" content="#0A0A0B">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TheBridge">
<meta property="og:locale" content="en_NG">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="${seo.image || s.og_image ? 'summary_large_image' : 'summary'}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css?v=${ASSET_V}">
<script src="/js/early.js?v=${ASSET_V}"></script>
${(seo.jsonLd || []).map((d) => `<script type="application/ld+json">${jsonLdText(d)}</script>`).join('\n')}
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
        <a class="brand" href="/"><img src="/brand/mark-reversed.svg" alt="" width="49" height="44" loading="lazy">${brandName}</a>
        <p>${esc(s.footer_blurb)}</p>
        <a class="btn btn-yellow btn-sm footer-cta" href="/#register">Save a free seat ${arrowBtn}</a>
        ${socials.length ? `<div class="footer-socials">${socials.map(([k, ico, label]) => `<a href="${esc(s[k])}" target="_blank" rel="noopener me" aria-label="TheBridge on ${label}">${icon(ico)}</a>`).join('')}</div>` : ''}
      </div>
      <div>
        <h2 class="h4">Explore</h2>
        <ul><li><a href="/#webinar">Free webinar</a></li><li><a href="/#programme">Programme</a></li><li><a href="/#facilitators">Facilitators</a></li><li><a href="/courses">Courses</a></li><li><a href="/#contact">Contact</a></li></ul>
      </div>
      <div>
        <h2 class="h4">Talk to us</h2>
        <ul>
          <li><a href="${esc(whatsappLink(s.contact_whatsapp))}" rel="noopener" target="_blank">WhatsApp ${esc(s.contact_whatsapp)}</a></li>
          <li><a href="mailto:${esc(s.contact_email)}">${esc(s.contact_email)}</a></li>
        </ul>
      </div>
    </div>
    <div class="mega" aria-hidden="true"><span>The</span>Bridge</div>
    <div class="footer-bar"><i></i><i></i><i></i></div>
    <div class="copyright"><span>© ${new Date().getFullYear()} ${esc(s.org_name)}.</span><span>${esc(s.footer_tagline)}</span></div>
  </div>
</footer>
<script src="/js/site.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

/** The public address of the site, from BASE_URL (no trailing slash). */
export const siteUrl = () => (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');

export function ogImage(site) {
  const m = site.settings.og_image && site.mediaById[site.settings.og_image];
  return m ? `${siteUrl()}/media/${m.id}/${encodeURIComponent(m.name)}` : `${siteUrl()}/icon-512.png`;
}

// JSON inside <script> must not be able to close the tag.
const jsonLdText = (d) => JSON.stringify(d).replace(/</g, '\\u003c');
