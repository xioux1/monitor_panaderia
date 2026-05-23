'use strict';

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id              TEXT PRIMARY KEY,
      amount                  REAL NOT NULL,
      status                  TEXT NOT NULL,
      payment_method_id       TEXT,
      date_created            TEXT NOT NULL,
      payer_email             TEXT,
      payer_first_name        TEXT,
      payer_last_name         TEXT,
      payer_identification_number TEXT,
      payer_identification_type   TEXT
    )
  `);
  // Add columns for existing deployments that predate this migration
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_identification_number TEXT`);
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_identification_type   TEXT`);
}

async function upsertPayment(payment) {
  await pool.query(
    `INSERT INTO payments
       (payment_id, amount, status, payment_method_id, date_created,
        payer_email, payer_first_name, payer_last_name,
        payer_identification_number, payer_identification_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (payment_id) DO NOTHING`,
    [
      String(payment.id),
      payment.transaction_amount ?? 0,
      payment.status,
      payment.payment_method_id ?? null,
      payment.date_created,
      payment.payer?.email ?? null,
      payment.payer?.first_name ?? null,
      payment.payer?.last_name ?? null,
      payment.payer?.identification?.number ?? null,
      payment.payer?.identification?.type ?? null,
    ]
  );
}

async function listPayments() {
  const { rows } = await pool.query(
    `SELECT * FROM payments ORDER BY date_created DESC LIMIT 50`
  );
  return rows;
}

module.exports = { initDb, upsertPayment, listPayments };
