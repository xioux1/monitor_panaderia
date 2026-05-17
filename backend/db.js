'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'panaderia.db'));

const INSERT_SQL = `
  INSERT INTO payments
    (payment_id, amount, status, payment_method_id, date_created, payer_email, payer_first_name, payer_last_name)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (payment_id) DO NOTHING
`;

function initDb() {
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
  return Promise.resolve();
}

function upsertPayment(payment) {
  db.prepare(INSERT_SQL).run(
    String(payment.id),
    payment.transaction_amount ?? 0,
    payment.status,
    payment.payment_method_id ?? null,
    payment.date_created,
    payment.payer?.email ?? null,
    payment.payer?.first_name ?? null,
    payment.payer?.last_name ?? null,
  );
  return Promise.resolve();
}

function listPayments() {
  const rows = db.prepare(
    `SELECT * FROM payments ORDER BY date_created DESC LIMIT 20`
  ).all();
  return Promise.resolve(rows);
}

module.exports = { initDb, upsertPayment, listPayments };
