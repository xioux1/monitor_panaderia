'use strict';

// Run in Render shell: node scripts/export_transfers.js
// Requires MP_ACCESS_TOKEN env var (already set in Render service).
// Fetches the last 20 approved payments and dumps the FULL raw detail
// from MercadoPago — nothing filtered or pre-selected.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fetch = require('node-fetch');

const BASE = 'https://api.mercadopago.com';
const TOKEN = process.env.MP_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('ERROR: MP_ACCESS_TOKEN no está seteado.');
  process.exit(1);
}

async function mpGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`MP ${res.status} en ${path}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  console.log('Buscando últimos 20 pagos aprobados...\n');

  const search = await mpGet(
    '/v1/payments/search?status=approved&sort=date_created&criteria=desc&limit=20'
  );

  const list = search.results ?? [];
  console.log(`Encontrados: ${list.length} pagos. Bajando detalle completo de cada uno...\n`);

  const details = [];
  for (const p of list) {
    process.stdout.write(`  Fetching ${p.id}...`);
    try {
      const detail = await mpGet(`/v1/payments/${p.id}`);
      details.push(detail);
      console.log(' OK');
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      details.push({ id: p.id, _error: err.message });
    }
  }

  console.log('\n=== DETALLE COMPLETO (JSON RAW) ===\n');
  console.log(JSON.stringify(details, null, 2));

  console.log('\n=== RESUMEN RÁPIDO ===\n');
  for (const d of details) {
    if (d._error) { console.log(`[${d.id}] ERROR: ${d._error}`); continue; }
    const fecha = new Date(d.date_created).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const nombre = [d.payer?.first_name, d.payer?.last_name].filter(Boolean).join(' ') || '(sin nombre)';
    console.log(`[${d.id}] ${fecha} | $${d.transaction_amount} | ${d.payment_method_id} | ${nombre} | ${d.payer?.email ?? '-'}`);
  }

  console.log('\nCampos disponibles en el primer pago:');
  if (details[0] && !details[0]._error) {
    console.log(Object.keys(details[0]).join(', '));
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
