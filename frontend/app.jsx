// Panadería Monitor — production build
// Reads /api/payments (served by backend/server.js) every 5s.

const { useState, useEffect, useRef } = React;

const POLL_INTERVAL = 5_000;
const MAX_ROWS = 7;

// ─── Derive friendly name from email prefix ──────────────────────────────
const _NAMES = [
  "alejandro","alejandra","maximiliano","maximiliana","florencia","sebastian",
  "valentina","valentino","carolina","ezequiel","federico","gabriela","agustina",
  "marcela","mariana","daniela","patricia","claudia","lorena","viviana","silvana",
  "mariela","soledad","virginia","fernanda","jimena","stefania","cristian",
  "gonzalo","leandro","rodrigo","damian","facundo","agustin","ignacio","maximo",
  "lautaro","santiago","joaquin","bautista","roberto","miguel","carlos","sergio",
  "gustavo","claudio","marcelo","javier","hernan","ramiro","walter","flavio",
  "antonio","manuel","andres","alberto","hector","ernesto","juanjo","juanma",
  "mateo","tomas","franco","roman","brian","lucas","ariel","oscar","emilio",
  "horacio","raul","alfredo","hugo","ruben","mario","jorge","pablo","diego",
  "pedro","luis","jose","juan","alan","fede","sabrina","melina","melisa",
  "gisela","celeste","magali","daiana","ayelen","brenda","johana","yamila",
  "carina","karina","nadia","sonia","monica","susana","graciela","silvia",
  "beatriz","norma","elena","mirta","alicia","andrea","valeria","vanesa",
  "natalia","veronica","paula","julia","lucia","sofia","camila","micaela",
  "belen","noelia","romina","sandra","laura","maria","yesica","jessica",
  "mercedes","adriana","paola","cecilia","roxana","delia","irma","rita",
  "nora","olga","ines","elisa","rosa","ana",
  "nicolas","emiliano","thiago","benjamin","samuel","constanza","constance",
  "renata","camilo","adriano","joaquina","sebastiana","valentino","mauricio",
  "ezequiela","ignacia","maxima","bautista","augusto","augustina","luciana",
  "luciano","cristina","cristiano","mariano","mariana","carolina","florencio",
  "antonella","maricel","marisol","maribel","lourdes","azul","milagros",
  "pilar","rocio","abril","candela","julieta","victoria","eliana","estefania",
  "debora","veronica","alejandrina","guadalupe","dolores","esperanza",
  "trinidad","fernanda","yolanda","graciela","alejandrina","albertina",
  "bernardita","evangelina","natividad","concepcion","guillermo","edmundo",
  "osvaldo","ernestina","celestino","celestina","gilberto","isidro",
  "leopoldo","balthazar","augusto","esteban","esteban","fabian","gaston",
  "eduardo","adolfo","alfonsina","osvaldo","reinaldo","rolando","orlando",
  "armando","arnaldo","gerardo","leonardo","alejandro","bernardo","fernando",
  "simon",
  "santi","nacho","guille","pachi","cacho","tito","mati","gato","nene",
  "nena","nati","vicky","caro","fer","gabi","mili","belu","sofi","juli",
  "pau","dani","vane","tere","flor","ceci","silvi","vivi","lore","moni",
  "clari","romi","fran","seba","nico","benja","luchi","pilu","bruni",
  "joaco","tobi","fabi","vale","agu","charly","charo","paty","mago",
  "chio","titi","pipi","colo","kike","quique","roque","pepe","lalo",
  "nando","beto","walo","chino","china","negra","negro","gordo","gorda",
  "flaco","flaca","pelado","pelada","tano","gringa","gringo","turco",
].sort((a, b) => b.length - a.length);

function nameFromEmail(email) {
  if (!email) return { first: "Transferencia", last: "" };
  const local = String(email).split("@")[0] || "";
  if (!local) return { first: email, last: "" };

  const stripped = local.replace(/[._\-+]+/g, " ").replace(/\d+/g, "").trim();
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const parts = stripped.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return { first: cap(parts[0]), last: parts.slice(1).map(cap).join(" ") };
  if (parts.length === 0) return { first: cap(local), last: "" };

  const word = parts[0].toLowerCase();
  const segments = [];
  let rem = word;
  while (rem.length > 0) {
    let found = false;
    for (const name of _NAMES) {
      if (rem.startsWith(name)) {
        segments.push(name); rem = rem.slice(name.length); found = true; break;
      }
    }
    if (!found) {
      for (const name of _NAMES) {
        if (rem.endsWith(name) && rem.length > name.length) {
          segments.push(rem.slice(0, rem.length - name.length));
          segments.push(name); rem = ""; found = true; break;
        }
      }
    }
    if (!found) { segments.push(rem); break; }
  }
  if (segments.length >= 2) return { first: cap(segments[0]), last: segments.slice(1).map(cap).join(" ") };
  return { first: cap(segments[0] || word), last: "" };
}

// ─── Normalize an MP payment row from /api/payments ─────────────────────
function normalizePayment(raw) {
  const fromEmail = nameFromEmail(raw.payer_email);
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
  const first = raw.payer_first_name ? cap(raw.payer_first_name) : fromEmail.first;
  const last  = raw.payer_last_name  ? cap(raw.payer_last_name)  : fromEmail.last;
  return {
    id: String(raw.payment_id),
    first,
    last,
    email: raw.payer_email || null,
    amount: Number(raw.amount) || 0,
    ts: raw.date_created ? new Date(raw.date_created).getTime() : Date.now(),
    isNew: false,
  };
}

// ─── Formatters ──────────────────────────────────────────────────────────
const fmtAmount = (n) => n.toLocaleString('es-AR');

const relTime = (ts, now) => {
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 60) return 'ahora';
  const m = Math.floor(diff / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return `hace ${h} h`;
};

const absTime = (ts) => {
  const d = new Date(ts);
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const initialOf = (s) => (s || '').slice(0, 1).toUpperCase();
const colorIdx = (name) => {
  let s = 0;
  for (const c of name) s = (s + c.charCodeAt(0)) % 6;
  return s;
};

// ─── Hooks ───────────────────────────────────────────────────────────────
function useAutoReload(intervalMs = 30_000) {
  useEffect(() => {
    let knownVersion = null;
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json();
        if (knownVersion === null) { knownVersion = version; return; }
        if (knownVersion !== version) window.location.reload();
      } catch (_) {}
    }
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
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
  const [rows, setRows]            = useState([]);
  const [lastSyncAt, setLastSync]  = useState(0);
  const [connected, setConnected]  = useState(false);
  const [hasLoaded, setHasLoaded]  = useState(false);
  const [reloading, setReloading]  = useState(false);
  const prevIdsRef = useRef(new Set());
  const failsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    async function tick() {
      try {
        const res = await fetch("/api/payments", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (failsRef.current >= 3) {
          // connection recovered — reload for clean state
          window.location.reload();
          return;
        }
        failsRef.current = 0;
        const list = (data.payments || []).map(normalizePayment).slice(0, MAX_ROWS);
        const prevIds = prevIdsRef.current;
        const withNew = list.map((p, idx) => ({
          ...p,
          isNew: idx === 0 && prevIds.size > 0 && !prevIds.has(p.id),
        }));
        prevIdsRef.current = new Set(list.map(p => p.id));
        setRows(withNew);
        setLastSync(data.lastSyncAt ? new Date(data.lastSyncAt).getTime() : Date.now());
        setConnected(true);
        setHasLoaded(true);
      } catch (err) {
        if (cancelled) return;
        setConnected(false);
        failsRef.current += 1;
        console.error("[/api/payments]", err);
        if (failsRef.current >= 3) {
          setReloading(true);
        }
      } finally {
        if (!cancelled) {
          const delay = failsRef.current >= 3 ? POLL_INTERVAL * 2 : POLL_INTERVAL;
          timer = setTimeout(tick, delay);
        }
      }
    }

    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (rows[0]?.isNew) {
      const id = setTimeout(() => {
        setRows(prev => prev.map((r, i) => i === 0 ? { ...r, isNew: false } : r));
      }, 31000);
      return () => clearTimeout(id);
    }
  }, [rows[0]?.id]);

  return { rows, lastSyncAt, connected, hasLoaded, reloading };
}

// ─── Components ──────────────────────────────────────────────────────────
function Brand() {
  return (
    <div className="brand">
      <div className="brand-eyebrow">
        <span className="rule" />
        <span>Panadería</span>
      </div>
      <div className="brand-name">
        Rubiño<span className="seed" />
      </div>
    </div>
  );
}

function LiveIndicator({ connected, now }) {
  const d = new Date(now);
  const pad = (x) => String(x).padStart(2, '0');
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return (
    <div className="live-cluster">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="live-dot-wrap">
          <div className={`live-dot${connected ? '' : ' disconnected'}`} />
        </div>
        <div className="live-label">{connected ? 'En vivo' : 'Reconectando'}</div>
      </div>
      <div className="monitor-clock">{date} · {time}</div>
    </div>
  );
}

function Row({ r, idx, now, showEmail, highlightNew, showAvatars }) {
  const newClass = r.isNew && highlightNew !== 'off' ? 'is-new' : '';
  return (
    <div className={`row ${newClass}`}>
      <div className="time">
        <div className="time-rel">{relTime(r.ts, now)}</div>
        <div className="time-abs">{absTime(r.ts)}</div>
      </div>
      <div className="payer">
        {showAvatars && (
          <div className={`avatar ap-${colorIdx(r.first + r.last)}`}>
            {initialOf(r.first)}{initialOf(r.last)}
          </div>
        )}
        <div className="payer-text">
          <div className="payer-name">
            {r.first}{r.last ? <span className="last"> {r.last}</span> : null}
          </div>
          {showEmail && r.email && (
            <div className="payer-email">{r.email}</div>
          )}
        </div>
      </div>
      <div className="amount">
        <span className="plus">+</span>
        <span className="cur">$</span>
        {fmtAmount(r.amount)}
      </div>
    </div>
  );
}

function ReconnectBanner() {
  return (
    <div className="reconnect-banner">
      ⚠️ Reconectando… se recargará automáticamente cuando vuelva la señal
    </div>
  );
}

function EmptyState({ hasLoaded }) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">
        {hasLoaded ? "Esperando primer pago…" : "Conectando con Mercado Pago…"}
      </div>
      <div className="empty-state-sub">
        Cuando llegue un pago aparecerá automáticamente.
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "warm",
  "showRows": 4,
  "showEmail": true,
  "highlightNew": "celebratory",
  "showAvatars": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { rows, lastSyncAt, connected, hasLoaded, reloading } = usePaymentsFeed();
  const now = useNow(1000);
  useAutoReload(30_000);

  const ageS = lastSyncAt ? Math.floor((now - lastSyncAt) / 1000) : null;
  const isConnected = connected && ageS != null && ageS < 15;
  const visibleRows = rows.slice(0, t.showRows);

  return (
    <div className="monitor" data-theme={t.theme}>
      {reloading && <ReconnectBanner />}
      <div className="topbar">
        <Brand />
        <LiveIndicator connected={isConnected} now={now} />
      </div>

      {rows.length === 0 ? (
        <EmptyState hasLoaded={hasLoaded} />
      ) : (
        <div className="table-wrap">
          <div className="tbody">
            <div className="rows">
              {visibleRows.map((r, i) => (
                <Row
                  key={r.id}
                  r={r}
                  idx={i}
                  now={now}
                  showEmail={t.showEmail}
                  highlightNew={t.highlightNew}
                  showAvatars={t.showAvatars}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Tema">
          <TweakRadio
            label="Apariencia"
            value={t.theme}
            options={[
              { value: 'warm', label: 'Cálido' },
              { value: 'midnight', label: 'Oscuro' },
              { value: 'paper', label: 'Papel' },
            ]}
            onChange={(v) => setTweak('theme', v)}
          />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakRadio
            label="Filas"
            value={t.showRows}
            options={[
              { value: 3, label: '3' },
              { value: 4, label: '4' },
              { value: 5, label: '5' },
              { value: 6, label: '6' },
            ]}
            onChange={(v) => setTweak('showRows', Number(v))}
          />
          <TweakToggle
            label="Mostrar email"
            value={t.showEmail}
            onChange={(v) => setTweak('showEmail', v)}
          />
          <TweakToggle
            label="Mostrar avatares"
            value={t.showAvatars}
            onChange={(v) => setTweak('showAvatars', v)}
          />
        </TweakSection>
        <TweakSection label="Animación">
          <TweakRadio
            label="Resaltar nuevo"
            value={t.highlightNew}
            options={[
              { value: 'off', label: 'No' },
              { value: 'celebratory', label: 'Sí' },
            ]}
            onChange={(v) => setTweak('highlightNew', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
