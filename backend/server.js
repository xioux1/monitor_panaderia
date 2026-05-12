'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const path = require('path');
const { fetchRecentPayments } = require('./mp');
const { initDb, upsertPayment, listPayments } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

let lastSyncAt = null;

app.get('/api/payments', async (_req, res) => {
  try {
    const payments = await listPayments();
    res.json({ payments, lastSyncAt });
  } catch (err) {
    console.error('[/api/payments]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync', async (_req, res) => {
  try {
    const results = await fetchRecentPayments();
    for (const p of results) await upsertPayment(p);
    lastSyncAt = new Date().toISOString();
    res.json({ processed: results.length, lastSyncAt });
  } catch (err) {
    console.error('[sync]', err.message);
    res.status(502).json({ error: err.message });
  }
});

async function syncJob() {
  try {
    const results = await fetchRecentPayments();
    for (const p of results) await upsertPayment(p);
    lastSyncAt = new Date().toISOString();
    console.log(`[sync] ${results.length} pagos procesados — ${lastSyncAt}`);
  } catch (err) {
    console.error('[sync]', err.message);
  }
}

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`bakery-monitor running on http://localhost:${PORT}`);
    });
    setInterval(syncJob, 5_000);
  })
  .catch((err) => {
    console.error('[initDb]', err.message);
    process.exit(1);
  });
