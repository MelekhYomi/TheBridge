# TheBridge website

Website for **TheBridge Project and Integrated Services Limited**: the free "Build, Automate and Secure" webinar, cohort courses with Paystack/Flutterwave checkout, a contact form, and an admin dashboard.

- **Stack:** Node.js 22.13+ (built-in SQLite), Express. No build step.
- **Data:** one SQLite file at `data/thebridge.db`, created on first run. Back it up.

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
| `/` | Webinar landing page: the four fields (session, demo, exercise), the two-hour programme, outcomes, resource pack, registration form, course teaser, contact form |
| `/courses`, `/courses/:slug` | Course list and course pages with the enrol and payment form |
| `/payments/result/:ref` | Payment confirmed / pending / failed page |
| `/admin` | Dashboard: sign-ups, payments, messages, course fees and dates, webinar details, CSV exports |

## Going live

1. **Server.** Any host that runs Node 22.13+ with a persistent disk works, for example a VPS, Render or Railway with a volume. Set every variable from `.env.example`. Set `NODE_ENV=production` and set `BASE_URL` to the real https address.
2. **Admin.** Choose a long `ADMIN_PASSWORD`. Generate `SESSION_SECRET` with the command in `.env.example`.
3. **Paystack.** Copy the secret key into `PAYSTACK_SECRET_KEY`. In the Paystack dashboard, set the webhook URL to `https://YOUR-DOMAIN/webhooks/paystack`.
4. **Flutterwave.** Copy the secret key into `FLW_SECRET_KEY`. In the Flutterwave dashboard, set the webhook URL to `https://YOUR-DOMAIN/webhooks/flutterwave`. Choose a secret hash there and put the same value in `FLW_SECRET_HASH`.
5. **Content.** In `/admin`:
   - under **Courses**, set each course's fee and start date (the payment form only appears once a fee is set);
   - under **Webinar & contact**, set the webinar date, time and platform.
6. **Test with test keys first.** Use the providers' test keys and test cards, then switch to live keys.

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
