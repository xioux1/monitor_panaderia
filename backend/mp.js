'use strict';

const fetch = require('node-fetch');

const BASE_URL = 'https://api.mercadopago.com';

async function fetchRecentPayments() {
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
  return data.results;
}

module.exports = { fetchRecentPayments };
