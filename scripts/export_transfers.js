'use strict';

// Run in Render shell: node scripts/export_transfers.js
// Requires DATABASE_URL env var (already set in Render service).

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const { rows } = await pool.query(`
    SELECT
      payment_id,
      amount,
      status,
      payment_method_id,
      date_created,
      payer_email,
      payer_first_name,
      payer_last_name
    FROM payments
    ORDER BY date_created DESC
    LIMIT 20
  `);

  if (rows.length === 0) {
    console.log('No hay pagos en la base de datos todavía.');
    return;
  }

  console.log(`\n=== Últimas ${rows.length} transferencias ===\n`);

  rows.forEach((p, i) => {
    const nombre = [p.payer_first_name, p.payer_last_name].filter(Boolean).join(' ') || '(desconocido)';
    const fecha  = new Date(p.date_created).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    console.log(`#${String(i + 1).padStart(2, '0')} | ${fecha}`);
    console.log(`     ID:      ${p.payment_id}`);
    console.log(`     Monto:   $${Number(p.amount).toFixed(2)}`);
    console.log(`     Estado:  ${p.status}`);
    console.log(`     Método:  ${p.payment_method_id ?? '-'}`);
    console.log(`     Pagador: ${nombre}`);
    console.log(`     Email:   ${p.payer_email ?? '-'}`);
    console.log('');
  });

  // También dump JSON crudo al final por si necesitás copiar los datos
  console.log('=== JSON crudo ===');
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch(err => { console.error('Error:', err.message); process.exit(1); })
  .finally(() => pool.end());
