import crypto from 'node:crypto';
import { findEnrolment, updateEnrolment } from './data.js';
import { nowUtc } from './store.js';
import { safeEqual } from './security.js';

const baseUrl = () => (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

export function providers() {
  const demo = process.env.PAYMENT_DEMO === '1' && process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
  return {
    paystack: Boolean(process.env.PAYSTACK_SECRET_KEY),
    flutterwave: Boolean(process.env.FLW_SECRET_KEY),
    demo,
  };
}

export function providerReady(name) {
  const p = providers();
  return p[name] || p.demo;
}

async function api(url, { method = 'GET', key, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}: ${json.message || 'request failed'}`);
  return json;
}

/** Starts a hosted checkout and returns the URL to send the customer to. */
export async function startCheckout(enrolment, course) {
  const { provider, reference } = enrolment;

  if (!providers()[provider] && providers().demo) {
    return `/payments/demo?reference=${encodeURIComponent(reference)}`;
  }

  if (provider === 'paystack') {
    const json = await api('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      key: process.env.PAYSTACK_SECRET_KEY,
      body: {
        email: enrolment.email,
        amount: Number(enrolment.amount_kobo),
        currency: 'NGN',
        reference,
        callback_url: `${baseUrl()}/payments/paystack/callback`,
        metadata: { course: course.title, name: enrolment.name, phone: enrolment.phone },
      },
    });
    return json.data.authorization_url;
  }

  if (provider === 'flutterwave') {
    const json = await api('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      key: process.env.FLW_SECRET_KEY,
      body: {
        tx_ref: reference,
        amount: Number(enrolment.amount_kobo) / 100,
        currency: 'NGN',
        redirect_url: `${baseUrl()}/payments/flutterwave/callback`,
        customer: { email: enrolment.email, name: enrolment.name, phonenumber: enrolment.phone },
        customizations: { title: 'TheBridge', description: course.title, logo: `${baseUrl()}/icon-192.png` },
      },
    });
    return json.data.link;
  }

  throw new Error(`Unknown provider ${provider}`);
}

/** Asks Paystack for the true state of a transaction. Never trust the redirect alone. */
export async function verifyPaystack(reference) {
  const json = await api(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    key: process.env.PAYSTACK_SECRET_KEY,
  });
  const d = json.data || {};
  return { paid: d.status === 'success' && d.currency === 'NGN', reference: d.reference, amountKobo: d.amount, providerTx: String(d.id || '') };
}

/** Verify by Flutterwave transaction id, or by our own reference when the id is unknown. */
export async function verifyFlutterwave({ transactionId, reference }) {
  const url = transactionId
    ? `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`
    : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;
  const json = await api(url, { key: process.env.FLW_SECRET_KEY });
  const d = json.data || {};
  return { paid: d.status === 'successful' && d.currency === 'NGN', reference: d.tx_ref, amountKobo: Math.round(Number(d.amount) * 100), providerTx: String(d.id || '') };
}

/**
 * Records a verified payment. Only marks paid if the amount covers the price we
 * stored when the enrolment was created. Returns the enrolment row.
 */
export async function recordResult(reference, { paid, amountKobo, providerTx }) {
  const row = await findEnrolment(reference);
  if (!row) return null;
  if (row.status === 'paid') return row;
  if (paid && Number(amountKobo) >= Number(row.amount_kobo)) {
    return updateEnrolment(reference, { status: 'paid', provider_tx: providerTx || '', paid_at: nowUtc() });
  }
  if (row.status === 'pending') return updateEnrolment(reference, { status: 'failed', provider_tx: providerTx || '' });
  return row;
}

export function paystackSignatureValid(rawBody, signature) {
  if (!process.env.PAYSTACK_SECRET_KEY || !signature) return false;
  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

export function flutterwaveSignatureValid(headerHash) {
  return Boolean(process.env.FLW_SECRET_HASH) && safeEqual(headerHash || '', process.env.FLW_SECRET_HASH);
}
