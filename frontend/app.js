'use strict';

const POLL_INTERVAL = 5_000; // ms
const SYNC_WARNING_THRESHOLD = 15_000; // ms — warn if last sync older than this

const tbody = document.getElementById('payments-body');
const totalAmountEl = document.getElementById('total-amount');
const approvedCountEl = document.getElementById('approved-count');
const statusDot = document.getElementById('status-indicator');

let warningBanner = null;

function getOrCreateWarning() {
  if (!warningBanner) {
    warningBanner = document.createElement('p');
    warningBanner.id = 'sync-warning';
    warningBanner.style.cssText =
      'color:#92400e;background:#fef3c7;padding:8px 16px;border-radius:6px;margin-bottom:12px;font-size:.9rem;';
    document.querySelector('.payments').prepend(warningBanner);
  }
  return warningBanner;
}

function updateSyncWarning(lastSyncAt) {
  if (!lastSyncAt) return;
  const age = Date.now() - new Date(lastSyncAt).getTime();
  const banner = getOrCreateWarning();
  if (age > SYNC_WARNING_THRESHOLD) {
    banner.textContent = '⚠️ Sin conexión con MP';
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
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
    totalAmountEl.textContent = formatCurrency(0);
    approvedCountEl.textContent = '0';
    return;
  }

  tbody.innerHTML = payments.map(p => `
    <tr>
      <td>${formatDate(p.date_created)}</td>
      <td>${p.payment_method_id ?? '—'}</td>
      <td>${p.payer_email ?? '—'}</td>
      <td>${formatCurrency(p.amount)}</td>
      <td><span class="badge ${badgeClass(p.status)}">${p.status}</span></td>
    </tr>
  `).join('');

  const todayStr = new Date().toLocaleDateString('es-AR');
  const todayPayments = payments.filter(p =>
    p.status === 'approved' &&
    new Date(p.date_created).toLocaleDateString('es-AR') === todayStr
  );

  totalAmountEl.textContent = formatCurrency(todayPayments.reduce((s, p) => s + p.amount, 0));
  approvedCountEl.textContent = todayPayments.length;

  const totalSubEl = document.getElementById('total-sub');
  if (totalSubEl) {
    totalSubEl.textContent = todayPayments.length === 0
      ? 'Sin pagos hoy aún'
      : `${todayPayments.length} pago${todayPayments.length !== 1 ? 's' : ''}`;
  }
}

async function refresh() {
  try {
    const { payments, lastSyncAt } = await fetchPayments();
    renderPayments(payments);
    updateSyncWarning(lastSyncAt);
    statusDot.className = 'status-dot connected';
  } catch (err) {
    console.error(err);
    statusDot.className = 'status-dot';
  }
}

refresh();
setInterval(refresh, POLL_INTERVAL);
