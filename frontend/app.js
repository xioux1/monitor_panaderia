'use strict';

const POLL_INTERVAL = 5_000; // ms

const tbody = document.getElementById('payments-body');
const totalAmountEl = document.getElementById('total-amount');
const approvedCountEl = document.getElementById('approved-count');
const statusDot = document.getElementById('status-indicator');

function formatCurrency(amount, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function badgeClass(status) {
  if (status === 'approved') return 'approved';
  if (status === 'pending')  return 'pending';
  return 'rejected';
}

async function fetchPayments() {
  const res = await fetch('/api/payments');
  if (!res.ok) throw new Error('Error al obtener pagos');
  return res.json();
}

function renderPayments(payments) {
  if (!payments.length) {
    tbody.innerHTML = '<tr><td colspan="5">Sin pagos registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = payments.map(p => `
    <tr>
      <td>${formatDate(p.created_at)}</td>
      <td>${p.description ?? '—'}</td>
      <td>${p.payer_email ?? '—'}</td>
      <td>${formatCurrency(p.amount, p.currency)}</td>
      <td><span class="badge ${badgeClass(p.status)}">${p.status}</span></td>
    </tr>
  `).join('');

  const approved = payments.filter(p => p.status === 'approved');
  const total = approved.reduce((sum, p) => sum + p.amount, 0);
  totalAmountEl.textContent = formatCurrency(total);
  approvedCountEl.textContent = approved.length;
}

async function refresh() {
  try {
    const payments = await fetchPayments();
    renderPayments(payments);
    statusDot.className = 'status-dot connected';
  } catch (err) {
    console.error(err);
    statusDot.className = 'status-dot';
  }
}

refresh();
setInterval(refresh, POLL_INTERVAL);
