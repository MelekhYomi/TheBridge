import { siteUrl, ogImage } from './views/layout.js';
import { parseFaq } from './views/public.js';

// Structured data (schema.org JSON-LD) so Google can show the organisation,
// the webinar as an event, the courses and the FAQs as rich results.

const sameAs = (s) => ['social_linkedin', 'social_instagram', 'social_x', 'social_facebook', 'social_tiktok', 'social_youtube']
  .map((k) => s[k]).filter((u) => /^https?:\/\//.test(u || ''));

export function organisation(site) {
  const s = site.settings;
  const phone = String(s.contact_whatsapp || '').replace(/[^\d+]/g, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${siteUrl()}/#organization`,
    name: s.org_name,
    alternateName: 'TheBridge',
    url: `${siteUrl()}/`,
    logo: `${siteUrl()}/icon-512.png`,
    email: s.contact_email || undefined,
    areaServed: s.seo_keywords_area || undefined,
    sameAs: sameAs(s),
    contactPoint: phone ? [{ '@type': 'ContactPoint', telephone: phone, contactType: 'customer support', availableLanguage: ['English'] }] : undefined,
  };
}

export function website(site) {
  return { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${siteUrl()}/#website`, name: 'TheBridge', url: `${siteUrl()}/`, publisher: { '@id': `${siteUrl()}/#organization` }, inLanguage: 'en-NG', description: site.settings.seo_description };
}

/** The webinar as a free online event; only when an exact start time is set. */
export function webinarEvent(site) {
  const s = site.settings;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.webinar_start || '')) return null;
  const start = `${s.webinar_start}:00+01:00`; // Lagos time
  const minutes = Number(s.hero_minutes) || 120;
  const end = new Date(new Date(start).getTime() + minutes * 60e3).toISOString();
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: s.webinar_title,
    description: s.webinar_tagline,
    startDate: start,
    endDate: end,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: `${siteUrl()}/#register` },
    image: [ogImage(site)],
    organizer: { '@id': `${siteUrl()}/#organization` },
    performer: site.facilitators.filter((f) => f.name && f.name !== 'Facilitator name').map((f) => ({ '@type': 'Person', name: f.name })),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN', availability: 'https://schema.org/InStock', url: `${siteUrl()}/#register`, validFrom: new Date().toISOString().slice(0, 10) },
    isAccessibleForFree: true,
  };
}

export function course(site, c) {
  const offer = c.price_kobo != null ? { '@type': 'Offer', category: 'Paid', price: String(c.price_kobo / 100), priceCurrency: 'NGN', url: `${siteUrl()}/courses/${c.slug}` } : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: c.title,
    description: c.summary,
    url: `${siteUrl()}/courses/${c.slug}`,
    provider: { '@type': 'Organization', name: site.settings.org_name, sameAs: `${siteUrl()}/` },
    inLanguage: 'en',
    offers: offer ? [offer] : undefined,
    hasCourseInstance: [{ '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: c.duration || undefined, startDate: undefined }],
  };
}

export function courseList(site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: site.courses.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${siteUrl()}/courses/${c.slug}`, name: c.title })),
  };
}

export function faqPage(site) {
  const qa = parseFaq(site.settings.faq);
  if (!qa.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

export function breadcrumbs(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${siteUrl()}${path}` })),
  };
}

export const compact = (...xs) => xs.filter(Boolean);

// ---------- robots.txt and sitemap.xml ----------

export function robotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /payments/',
    'Disallow: /fprofile',
    '',
    `Sitemap: ${siteUrl()}/sitemap.xml`,
    '',
  ].join('\n');
}

export function sitemapXml(site) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ['/', '1.0', 'weekly'],
    ['/courses', '0.8', 'weekly'],
    ...site.courses.map((c) => [`/courses/${c.slug}`, '0.7', 'monthly']),
  ];
  const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([p, priority, freq]) => `  <url><loc>${xmlEsc(siteUrl() + p)}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`).join('\n')}
</urlset>
`;
}
