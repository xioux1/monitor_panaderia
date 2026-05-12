'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '..', 'payments.db'));

db.exec(`
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

// Add columns to existing DBs that predate this schema
for (const col of ['payer_first_name', 'payer_last_name']) {
  try { db.exec(`ALTER TABLE payments ADD COLUMN ${col} TEXT`); } catch (_) {}
}

const upsertStmt = db.prepare(`
  INSERT OR IGNORE INTO payments
    (payment_id, amount, status, payment_method_id, date_created, payer_email, payer_first_name, payer_last_name)
  VALUES
    (:payment_id, :amount, :status, :payment_method_id, :date_created, :payer_email, :payer_first_name, :payer_last_name)
`);

function upsertPayment(payment) {
  upsertStmt.run({
    payment_id:        String(payment.id),
    amount:            payment.transaction_amount ?? 0,
    status:            payment.status,
    payment_method_id: payment.payment_method_id ?? null,
    date_created:      payment.date_created,
    payer_email:       payment.payer?.email ?? null,
    payer_first_name:  payment.payer?.first_name ?? null,
    payer_last_name:   payment.payer?.last_name ?? null,
  });
}

const listStmt = db.prepare(`
  SELECT * FROM payments
  ORDER BY date_created DESC
  LIMIT 20
`);

function listPayments() {
  return listStmt.all();
}

module.exports = { upsertPayment, listPayments };
