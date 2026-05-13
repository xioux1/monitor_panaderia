'use strict';

const fetch = require('node-fetch');

const BASE_URL = 'https://api.mercadopago.com';

// Returns the MP user ID of the authenticated account (the merchant/recipient).
// Used to detect payments where MP incorrectly populates payer with the owner's data.
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

  // For non-MP transfers (bank_transfer, naranja, uala, etc.) the payer object
  // contains the merchant account's own data, not the sender's. Detect this by
  // comparing payer.id to the owner's user ID and clear the identity fields so
  // the frontend doesn't display the wrong name.
  return data.results.map((p) => {
    if (ownerUserId && p.payer?.id != null && String(p.payer.id) === String(ownerUserId)) {
      return {
        ...p,
        payer: { ...p.payer, first_name: null, last_name: null, email: null },
      };
    }
    return p;
  });
}

module.exports = { fetchRecentPayments, fetchAccountOwnerId };
