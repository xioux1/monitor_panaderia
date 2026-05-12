// Panadería Monitor — production build
const { useState, useEffect, useRef, useMemo } = React;

const POLL_INTERVAL = 5_000;
const MAX_ROWS = 6;

const METHOD_MAP = {
  account_money: { label: "Dinero en cuenta",  short: "MP" },
  visa:          { label: "Visa crédito",      short: "Visa" },
  master:        { label: "Mastercard",        short: "Master" },
  amex:          { label: "American Express",  short: "Amex" },
  debvisa:       { label: "Visa débito",       short: "Visa déb." },
  debmaster:     { label: "Mastercard débito", short: "Master déb." },
  maestro:       { label: "Maestro",           short: "Maestro" },
  naranja:       { label: "Naranja",           short: "Naranja" },
  cabal:         { label: "Cabal",             short: "Cabal" },
  pagofacil:     { label: "Pago Fácil",        short: "Pago Fácil" },
  rapipago:      { label: "Rapipago",          short: "Rapipago" },
  bank_transfer: { label: "Transferencia",     short: "Transf." },
  pix:           { label: "Transferencia PIX", short: "PIX" },
};
function resolveMethod(methodId) {
  if (!methodId) return { label: "—", short: "—" };
  const known = METHOD_MAP[methodId];
  if (known) return known;
  const titled = methodId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: titled, short: titled.length > 10 ? titled.slice(0, 10) + "…" : titled };
}

function nameFromEmail(email) {
  if (!email) return "—";
  const local = String(email).split("@")[0] || "";
  if (!local) return email;
  return local
    .replace(/[._\-+]+/g, " ").replace(/\d+/g, "").trim()
    .split(/\s+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ") || email;
}

function normalizePayment(raw) {
  return {
    id: String(raw.payment_id),
    payerEmail: raw.payer_email || null,
    payerName: nameFromEmail(raw.payer_email),
    method: resolveMethod(raw.payment_method_id),
    amount: Number(raw.amount) || 0,
    status: raw.status || "approved",
    dateCreated: raw.date_created,
  };
}

const ARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const TIME = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function relativeAgo(iso, nowMs) {
  const ms = nowMs - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5)  return "ahora";
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function usePaymentsFeed() {
  const [payments, setPayments]   = useState([]);
  const [lastSyncAt, setLastSync] = useState(0);
  const [connected, setConnected] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false, timer = null;
    async function tick() {
      try {
        const res = await fetch("/api/payments", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setPayments((data.payments || []).map(normalizePayment).slice(0, MAX_ROWS));
        setLastSync(data.lastSyncAt ? new Date(data.lastSyncAt).getTime() : Date.now());
        setConnected(true); setHasLoaded(true);
      } catch (err) {
        if (!cancelled) setConnected(false);
        console.error("[/api/payments]", err);
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL);
      }
    }
    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);
  return { payments, lastSyncAt, connected, hasLoaded };
}

function PaymentRow({ p, idx, now, density }) {
  const justArrived = now - new Date(p.dateCreated).getTime() < 6000;
  return (
    <div className={`pm-row ${justArrived && idx === 0 ? "fresh" : ""}`}
         data-density={density} style={{ "--row-i": idx }}>
      <div className="pm-row-num">{String(idx + 1).padStart(2, "0")}</div>
      <div className="pm-row-time">
        <div className="pm-row-time-rel">{relativeAgo(p.dateCreated, now)}</div>
        <div className="pm-row-time-abs">{TIME.format(new Date(p.dateCreated))}</div>
      </div>
      <div className="pm-row-payer">
        <div className="pm-row-name">{p.payerName}</div>
      </div>
      <div className="pm-row-method">
        <span className="pm-row-method-chip">{p.method.short}</span>
      </div>
      <div className="pm-row-amount">
        <span className="pm-row-amount-sign">+</span>{ARS.format(p.amount)}
      </div>
    </div>
  );
}

function EmptyState({ hasLoaded }) {
  return (
    <div className="pm-empty">
      <div className="pm-empty-title">
        {hasLoaded ? "Esperando primera transferencia…" : "Conectando con Mercado Pago…"}
      </div>
    </div>
  );
}

const THEMES = {
  midnight: {
    "--bg": "#0c0a07", "--bg-soft": "#15110b", "--surface": "#1a1610", "--surface-2": "#221c14",
    "--border": "rgba(255,238,200,.08)", "--border-2": "rgba(255,238,200,.14)",
    "--text": "#f6ecd6", "--text-dim": "rgba(246,236,214,.55)", "--text-faint": "rgba(246,236,214,.32)",
    "--accent": "#f4b860", "--accent-2": "#e98a3a", "--ok": "#7fd49b",
  },
  paper: {
    "--bg": "#f6f1e6", "--bg-soft": "#efe7d4", "--surface": "#ffffff", "--surface-2": "#fbf6e9",
    "--border": "rgba(58,42,18,.10)", "--border-2": "rgba(58,42,18,.18)",
    "--text": "#2b2113", "--text-dim": "rgba(43,33,19,.6)", "--text-faint": "rgba(43,33,19,.4)",
    "--accent": "#b9531b", "--accent-2": "#8a3a0c", "--ok": "#2f7a4f",
  },
  console: {
    "--bg": "#070a0c", "--bg-soft": "#0b1115", "--surface": "#0f1619", "--surface-2": "#141d22",
    "--border": "rgba(180,220,240,.08)", "--border-2": "rgba(180,220,240,.16)",
    "--text": "#e6f1f5", "--text-dim": "rgba(230,241,245,.55)", "--text-faint": "rgba(230,241,245,.32)",
    "--accent": "#5dd6c0", "--accent-2": "#3aa7e9", "--ok": "#5dd6c0",
  },
};

const TWEAK_DEFAULTS = { "theme": "midnight", "density": "regular" };

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { payments, lastSyncAt, connected, hasLoaded } = usePaymentsFeed();
  const now = useNow(1000);
  const themeVars = THEMES[t.theme] || THEMES.midnight;
  const isEmpty = payments.length === 0;
  return (
    <div className="pm-root" style={themeVars}>
      {isEmpty ? <EmptyState hasLoaded={hasLoaded} /> : (
        <section className="pm-list-wrap">
          <div className="pm-list-head">
            <div className="pm-col-num">#</div>
            <div className="pm-col-time">Hora</div>
            <div className="pm-col-payer">Pagador</div>
            <div className="pm-col-method">Medio</div>
            <div className="pm-col-amount">Monto</div>
          </div>
          <div className="pm-list" data-density={t.density}>
            {payments.map((p, i) => (
              <PaymentRow key={p.id} p={p} idx={i} now={now} density={t.density} />
            ))}
          </div>
        </section>
      )}
      <footer className="pm-footer">
        <span className="pm-footer-item">Mercado Pago · últimas {MAX_ROWS} transferencias · actualiza cada 5s</span>
      </footer>
      <TweaksPanel>
        <TweakSection label="Tema" />
        <TweakRadio label="Theme" value={t.theme} options={["midnight", "paper", "console"]}
                    onChange={(v) => setTweak("theme", v)} />
        <TweakSection label="Densidad" />
        <TweakRadio label="Densidad" value={t.density} options={["compact", "regular", "comfy"]}
                    onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
