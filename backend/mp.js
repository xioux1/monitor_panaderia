'use strict';

const fetch = require('node-fetch');

const BASE_URL = 'https://api.mercadopago.com';

async function fetchAccountOwnerId() {
  const token = process.env.MP_ACCESS_TOKEN;
  try {
    const res = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id ?? null;
  } catch {
    return null;
  }
}

// Fetch full detail for a single payment — the search endpoint omits some fields
// (e.g. additional_info.payer, transaction_details, metadata).
async function fetchPaymentDetail(paymentId) {
  const token = process.env.MP_ACCESS_TOKEN;
  const res = await fetch(`${BASE_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Try to extract the real sender's identity from fields that non-MP payment
// methods sometimes populate (additional_info.payer, metadata, etc.).
function extractSenderFromDetail(detail) {
  if (!detail) return null;

  // additional_info.payer is filled by some wallets (Uala, Naranja X, etc.)
  const aip = detail.additional_info?.payer;
  if (aip?.first_name || aip?.last_name || aip?.email) {
    return {
      first_name: aip.first_name ?? null,
      last_name:  aip.last_name  ?? null,
      email:      aip.email      ?? null,
    };
  }

  // Some integrations put a name in metadata
  const meta = detail.metadata;
  if (meta?.payer_name || meta?.sender_name) {
    const name = (meta.payer_name || meta.sender_name || '').trim();
    const parts = name.split(/\s+/);
    return {
      first_name: parts[0] ?? null,
      last_name:  parts.slice(1).join(' ') || null,
      email:      meta.payer_email ?? null,
    };
  }

  return null;
}

async function fetchRecentPayments(ownerUserId) {
  const token = process.env.MP_ACCESS_TOKEN;

  const params = new URLSearchParams({
    status: 'approved',
    sort: 'date_created',
    criteria: 'desc',
    limit: '20',
  });

  const res = await fetch(`${BASE_URL}/v1/payments/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MercadoPago API ${res.status}: ${body}`);
  }

  const data = await res.json();

  const results = await Promise.all(
    data.results.map(async (p) => {
      const payerIsOwner =
        ownerUserId &&
        p.payer?.id != null &&
        String(p.payer.id) === String(ownerUserId);

      if (!payerIsOwner) return p;

      // Payer field has the merchant's own data — fetch full detail to look
      // for the real sender in additional_info / metadata.
      const detail = await fetchPaymentDetail(p.id);
      const sender = extractSenderFromDetail(detail);

      if (sender) {
        console.log(`[mp] sender recovered from detail for payment ${p.id}:`, sender);
        return { ...p, payer: { ...p.payer, ...sender } };
      }

      // No real sender found → this is an outgoing payment (merchant paying a
      // provider). Exclude it so only incoming transfers appear in the monitor.
      console.log(`[mp] filtering out outgoing payment ${p.id} (${p.payment_method_id}) — payer is owner and no sender found`);
      return null;
    })
  );

  return results.filter(Boolean);
}

module.exports = { fetchRecentPayments, fetchAccountOwnerId };
