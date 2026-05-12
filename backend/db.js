'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'payments.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id          TEXT PRIMARY KEY,
    status      TEXT NOT NULL,
    amount      REAL NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'ARS',
    payer_email TEXT,
    description TEXT,
    created_at  TEXT NOT NULL
  )
`);

module.exports = db;
