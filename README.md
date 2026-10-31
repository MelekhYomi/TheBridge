# TheBridge website

Website for **TheBridge Project and Integrated Services Limited**: the free "Build, Automate and Secure" webinar, cohort courses with Paystack/Flutterwave checkout, a contact form, and an admin dashboard.

- **Stack:** Node.js 22+, Express. No build step. Hosted on Vercel.
- **Data:** the **Bridge Database** Google Sheet. Each kind of record has its own tab (Webinar DB, Pre -registration DB, Payments, Messages, Site content, Courses, Facilitators, Media, Facilitator's Profile). Uploaded files go to Google Drive. The site talks to the sheet through a small Apps Script web app, [scripts/bridge-sheet.gs](scripts/bridge-sheet.gs), using a shared secret key.
- **Development:** with `SHEET_API_URL`/`SHEET_API_KEY` empty, everything is stored in `data/store.json` instead, so you can work without touching the real sheet.

## Run locally

```bash
npm install
cp .env.example .env   # then fill it in
npm run dev
```

Open http://localhost:3000. The admin dashboard is at http://localhost:3000/admin.

With `PAYMENT_DEMO=1` and no provider keys, checkout goes to a fake payment page so you can test the full flow. It is switched off whenever `NODE_ENV=production`.

## Pages

| URL | What it is |
| --- | --- |
| `/` | Webinar landing page: hero, optional intro video and audio, the four fields, facilitators, programme, outcomes, registration, courses, contact |
| `/courses`, `/courses/:slug` | Course list and course pages with the enrol and payment form |
| `/fprofile` | Private form for facilitators to send their profile and session plan (not linked or indexed) |
| `/payments/result/:ref` | Payment confirmed / pending / failed page |
| `/sitemap.xml`, `/robots.txt` | For search engines |
| `/media/:id/:name` | Images, audio and video from the media library |
| `/admin` | Dashboard: sign-ups, interest, payments, messages, **site content**, courses, facilitators, facilitator forms, **media library**, CSV exports |

## Admin

Everything on the public site is editable under **Website** in `/admin`:

- **Site content:** every heading and paragraph, the webinar details, SEO title and description, share image, social links, the hero image, and an optional intro video (YouTube) and audio clip. Clearing a text field brings back its original wording.
- **Courses:** add, edit, hide, reorder and delete; fee, dates, outcomes, webinar session text and an optional YouTube video.
- **Facilitators:** photo, role, course, bio, qualifications, LinkedIn and other links, intro video and audio.
- **Facilitator forms:** answers from `/fprofile`, with **Fill profile** to copy one into a website profile, photo included.
- **Media library:** upload images (resized to 1600 px in the browser), audio and short video clips, up to 3 MB each. Long videos go on YouTube.

Edits reach the live site within about a minute: pages are cached at Vercel's edge for 60 seconds.

## Tests

```bash
npm test
```

Runs the whole site against a temporary local store: forms, payments (demo checkout), admin login, CSRF, content editing, uploads, media serving, SEO output and escaping.

## Going live

1. **Google Sheet.** Follow the setup steps at the top of [scripts/bridge-sheet.gs](scripts/bridge-sheet.gs): paste it into the sheet's Apps Script, add the `API_KEY` script property (the same value as `SHEET_API_KEY`), and deploy it as a web app. Put its `/exec` URL in `SHEET_API_URL`.
2. **Server.** Set every variable from `.env.example` in Vercel. Set `BASE_URL` to the real https address: it is used for canonical links, the sitemap and payment redirects.
3. **Admin.** Choose a long `ADMIN_PASSWORD`. Generate `SESSION_SECRET` with the command in `.env.example`.
4. **Paystack.** Copy the secret key into `PAYSTACK_SECRET_KEY`. In the Paystack dashboard, set the webhook URL to `https://YOUR-DOMAIN/webhooks/paystack`.
5. **Flutterwave.** Copy the secret key into `FLW_SECRET_KEY`. In the Flutterwave dashboard, set the webhook URL to `https://YOUR-DOMAIN/webhooks/flutterwave`. Choose a secret hash there and put the same value in `FLW_SECRET_HASH`.
6. **Content.** In `/admin`:
   - under **Courses**, set each course's fee and start date (the payment form only appears once a fee is set);
   - under **Site content**, set the webinar date, time, platform and the exact start time for Google.
7. **Test with test keys first.** Use the providers' test keys and test cards, then switch to live keys.
8. **Search.** Add the site to [Google Search Console](https://search.google.com/search-console), verify it, and submit `https://YOUR-DOMAIN/sitemap.xml`.

### How payments are trusted

- The price always comes from the database, never from the browser.
- After checkout, the server asks Paystack or Flutterwave to confirm the transaction. It only marks an enrolment *paid* when the provider says it succeeded, in NGN, for at least the stored amount.
- Webhooks are signature-checked, then re-verified the same way. This covers customers who close the tab before they are redirected back.
- If a payment stays *pending*, use **Re-check** on the admin Payments page.
- Card details never touch this server.

## Brand files

All brand files are in `public/brand/`:

- **Main logo (arch with the deck across both pillars):**
  - `logo.svg` (white backgrounds), `logo-reversed.svg` (black), `logo-on-blue.svg`, `logo-on-yellow.svg`, `logo-mono.svg`, `logo-stacked.svg`.
  - The mark on its own: `mark.svg`, `mark-reversed.svg`, `mark-on-blue.svg`, `mark-on-yellow.svg`, `mark-mono.svg`, `mark-mono-white.svg`.
  - `mark-512.png`: the mark as a PNG.
- **Extras (the alternative arch mark with the short deck between the pillars, not used on the site):** the same set of names with `-arch`, for example `logo-arch.svg` and `mark-arch-on-blue.svg`.

Favicons and app icons are in `public/`: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png` and `icon-512.png`. To regenerate the PNGs and the ICO, run `npm run icons`, which needs Python 3.

The SVG logos use the Space Grotesk font. For print, or for anywhere that font isn't installed, convert the text to outlines in a vector editor.
