'use strict';

const fetch = require('node-fetch');

const BASE_URL = 'https://api.mercadopago.com';

async function getPayments(limit = 20) {
  const token = process.env.MP_ACCESS_TOKEN;
  const res = await fetch(
    `${BASE_URL}/v1/payments/search?limit=${limit}&sort=date_created&criteria=desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`MercadoPago API error: ${res.status}`);
  const data = await res.json();
  return data.results;
}

module.exports = { getPayments };
