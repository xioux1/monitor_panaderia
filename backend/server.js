'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const path = require('path');
const { fetchRecentPayments } = require('./mp');
const { upsertPayment, listPayments } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

let lastSyncAt = null;

app.get('/api/payments', (_req, res) => {
  const payments = listPayments();
  res.json({ payments, lastSyncAt });
});

app.post('/api/sync', async (_req, res) => {
  try {
    const results = await fetchRecentPayments();
    for (const p of results) upsertPayment(p);
    lastSyncAt = new Date().toISOString();
    res.json({ processed: results.length, lastSyncAt });
  } catch (err) {
    console.error('[sync]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Internal sync job — runs every 5 s
setInterval(async () => {
  try {
    const results = await fetchRecentPayments();
    for (const p of results) upsertPayment(p);
    lastSyncAt = new Date().toISOString();
    console.log(`[sync] ${results.length} pagos procesados — ${lastSyncAt}`);
  } catch (err) {
    console.error('[sync]', err.message);
  }
}, 5_000);

app.listen(PORT, () => {
  console.log(`bakery-monitor running on http://localhost:${PORT}`);
});
