'use strict';

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id        TEXT PRIMARY KEY,
      amount            REAL NOT NULL,
      status            TEXT NOT NULL,
      payment_method_id TEXT,
      date_created      TEXT NOT NULL,
      payer_email       TEXT,
      payer_first_name  TEXT,
      payer_last_name   TEXT
    )
  `);
}

async function upsertPayment(payment) {
  await pool.query(
    `INSERT INTO payments
       (payment_id, amount, status, payment_method_id, date_created, payer_email, payer_first_name, payer_last_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (payment_id) DO UPDATE SET
       payer_email      = EXCLUDED.payer_email,
       payer_first_name = EXCLUDED.payer_first_name,
       payer_last_name  = EXCLUDED.payer_last_name`,
    [
      String(payment.id),
      payment.transaction_amount ?? 0,
      payment.status,
      payment.payment_method_id ?? null,
      payment.date_created,
      payment.payer?.email ?? null,
      payment.payer?.first_name ?? null,
      payment.payer?.last_name ?? null,
    ]
  );
}

async function listPayments() {
  const { rows } = await pool.query(
    `SELECT * FROM payments ORDER BY date_created DESC LIMIT 20`
  );
  return rows;
}

module.exports = { initDb, upsertPayment, listPayments };
