// ── CONSTANTS ──
const STORAGE_KEY = "corte_v1";
const QUOTE_KEY   = "corte_quote_v1";
const MACROS = { calorias: 2550, proteina: 185, carbos: 285, grasas: 75 };
const START_DATE = "2026-05-27";
const END_DATE   = "2026-08-15";
const START_WEIGHT = 82;
const GOAL_WEIGHT  = 76;
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ── STATE ──
let entries = [];
let currentView = "home";
let formData = freshForm();
let savedTimeout = null;
let deferredInstall = null;

// ── UTILS ──
function today() { return new Date().toISOString().split("T")[0]; }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function formatDate(d) {
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTHS[parseInt(m)-1]}`;
}
function freshForm(date) {
  return { date: date || today(), weight:"", proteina:"", carbos:"", grasas:"", calorias:"", notes:"", trained: false };
}
function pct(val, goal) { return val ? Math.min(100, Math.round((parseFloat(val)/goal)*100)) : 0; }
function macroColor(key) {
  return { proteina:"#00d4ff", carbos:"#ffb800", grasas:"#ff6b6b", calorias:"#a78bfa" }[key];
}
function dateHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// ── STORAGE ──
function load() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) entries = JSON.parse(r); } catch {}
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

// ── COMPUTED ──
function getTodayEntry()  { return entries.find(e => e.date === today()); }
function getWeightEntries() { return entries.filter(e => e.weight).sort((a,b) => a.date.localeCompare(b.date)); }
function getLastWeight() {
  const we = getWeightEntries();
  return we.length ? parseFloat(we[we.length-1].weight) : START_WEIGHT;
}
function getWeightLost() { return (START_WEIGHT - getLastWeight()).toFixed(1); }
function getDaysElapsed() { return Math.max(0, daysBetween(START_DATE, today())); }
function getDaysLeft()    { return Math.max(0, daysBetween(today(), END_DATE)); }
function getProgress()    { return Math.min(100, (getDaysElapsed() / 80) * 100); }

// ── QUOTE OF THE DAY ──
function getQuoteState() {
  try {
    const raw = localStorage.getItem(QUOTE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (state.date === today()) return state;
    }
  } catch {}
  // Nuevo día: elegir frase determinista basada en la fecha
  const index = dateHash(today()) % QUOTES.length;
  const state = { date: today(), index, accepted: false };
  try { localStorage.setItem(QUOTE_KEY, JSON.stringify(state)); } catch {}
  return state;
}

function acceptQuote() {
  const state = getQuoteState();
  state.accepted = true;
  try { localStorage.setItem(QUOTE_KEY, JSON.stringify(state)); } catch {}
  document.getElementById("quote-modal").classList.add("hidden");
  render();
}

function initQuoteModal() {
  const state = getQuoteState();
  if (!state.accepted) {
    const modal = document.getElementById("quote-modal");
    const text  = document.getElementById("quote-text");
    if (modal && text) {
      text.textContent = QUOTES[state.index];
      modal.classList.remove("hidden");
    }
  }
}

// ── RENDER HELPERS ──
function macroBar(label, key, val) {
  const g = MACROS[key];
  const p = pct(val, g);
  const done = p >= 90;
  const color = p >= 100 ? "#00ff87" : p >= 70 ? macroColor(key) : "#444";
  return `
    <div class="macro-row">
      <div class="macro-meta">
        <span class="macro-name">${label}</span>
        <span class="macro-val ${done?"done":""}">${val||0} / ${g}${key==="calorias"?"":" g"}</span>
      </div>
      <div class="macro-bar-bg">
        <div class="macro-bar-fill" style="width:${p}%;background:${color}"></div>
      </div>
    </div>`;
}

function statBox(num, lbl, colorClass="") {
  return `<div class="stat"><div class="stat-num ${colorClass}">${num}</div><div class="stat-lbl">${lbl}</div></div>`;
}

// ── VIEWS ──
function renderHome() {
  const te = getTodayEntry();
  const dLeft = getDaysLeft();
  const prog = getProgress().toFixed(0);
  const wLost = parseFloat(getWeightLost());
  const lastW = getLastWeight();
  const qState = getQuoteState();

  const quoteCard = qState.accepted ? `
    <div class="quote-bottom fade-up">
      <div class="quote-bottom-label">Frase del día</div>
      <div class="quote-bottom-text">${QUOTES[qState.index]}</div>
    </div>` : "";

  return `
    <div class="header fade-up">
      <div class="header-sub">Transformación · 80 días</div>
      <div class="header-title">AGOSTO 15</div>
    </div>
    <div class="section">
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:flex-end;margin-bottom:12px">
          <div>
            <div class="big-num">${dLeft}</div>
            <div class="stat-lbl">días restantes</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--font-display);font-size:28px;color:var(--dim)">${prog}%</div>
            <div class="stat-lbl">completado</div>
          </div>
        </div>
        <div class="progress-wrap">
          <div class="progress-fill gradient" style="width:${prog}%"></div>
        </div>
      </div>

      <div class="row">
        ${statBox(wLost > 0 ? `-${wLost}` : `${lastW}`, wLost > 0 ? "kg perdidos" : "kg actuales", wLost > 0 ? "green" : "")}
        ${statBox(`${lastW}<span style="font-size:18px;color:var(--dim)">kg</span>`, "peso actual")}
      </div>

      <div class="card ${te ? "accent" : ""}">
        <div class="row" style="justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:600;color:${te?"var(--accent)":"var(--muted)"}">${te ? "✓ Hoy registrado" : "Sin registro hoy"}</div>
            <div style="font-size:11px;color:var(--dim2);font-family:var(--font-mono);margin-top:4px">${formatDate(today())}</div>
          </div>
          <button class="btn-primary" style="width:auto;padding:10px 18px;font-size:12px" onclick="goView('log')">${te ? "Editar" : "+ Registrar"}</button>
        </div>
      </div>

      <div class="card">
        <span class="lbl">Meta diaria</span>
        ${macroBar("Proteína","proteina", te?.proteina)}
        ${macroBar("Carbos","carbos", te?.carbos)}
        ${macroBar("Grasas","grasas", te?.grasas)}
        ${macroBar("Calorías","calorias", te?.calorias)}
      </div>

      ${quoteCard}
    </div>`;
}

function renderLog() {
  const f = formData;
  return `
    <div class="header fade-up">
      <div class="header-sub">Registro diario</div>
      <div class="header-title">${formatDate(f.date).toUpperCase()}</div>
    </div>
    <div class="section">
      <div class="card">
        <span class="lbl">Peso del día (kg)</span>
        <input type="number" class="big ${f.weight?"ok":""}" placeholder="82.0" step="0.1" value="${f.weight}" oninput="setField('weight',this.value)">
      </div>

      <div class="card">
        <span class="lbl">Macros consumidos</span>
        <div class="grid2">
          ${[
            {key:"proteina", label:"Proteína (g)", ph:"185"},
            {key:"carbos",   label:"Carbos (g)",   ph:"285"},
            {key:"grasas",   label:"Grasas (g)",   ph:"75"},
            {key:"calorias", label:"Calorías",      ph:"2550"},
          ].map(({key,label,ph}) => `
            <div>
              <span class="lbl lbl-xs">${label}</span>
              <input type="number" data-key="${key}" class="big ${f[key] && parseFloat(f[key]) >= MACROS[key]*0.9 ? "ok" : ""}" placeholder="${ph}" value="${f[key]}" oninput="setField('${key}',this.value)">
            </div>`).join("")}
        </div>
      </div>

      <div class="card">
        <span class="lbl">¿Entrenaste hoy?</span>
        <div class="toggle-group">
          <button class="toggle-btn ${f.trained?"active":""}" onclick="setField('trained',true)">✓ Sí</button>
          <button class="toggle-btn ${!f.trained?"active":""}" onclick="setField('trained',false)">✗ No</button>
        </div>
      </div>

      <div class="card">
        <span class="lbl">Notas del día</span>
        <textarea placeholder="Cómo te sentiste, qué comiste, algo importante..." oninput="setField('notes',this.value)">${f.notes}</textarea>
      </div>

      <button id="save-btn" class="btn-primary" onclick="saveEntry()">Guardar registro</button>
    </div>`;
}

function renderProgress() {
  const wData = [{ date: START_DATE, w: START_WEIGHT }, ...getWeightEntries().map(e => ({ date: e.date, w: parseFloat(e.weight) }))];
  const trainedDays = entries.filter(e => e.trained).length;
  const totalDays = entries.length;
  const consistPct = totalDays ? Math.round((trainedDays/totalDays)*100) : 0;
  const lastW = getLastWeight();
  const wLost = parseFloat(getWeightLost());
  const toGoal = Math.max(0, lastW - GOAL_WEIGHT).toFixed(1);
  const goalKg = START_WEIGHT - GOAL_WEIGHT;
  const goalPct = Math.min(100, (wLost / goalKg) * 100);
  const goalRange = `${GOAL_WEIGHT - 2}–${GOAL_WEIGHT} kg`;

  const cW = 360, cH = 140;
  const vals = wData.map(d => d.w);
  const minW = Math.min(...vals) - 1;
  const maxW = Math.max(...vals) + 1;
  const px = i => (i / Math.max(wData.length-1,1)) * (cW-40) + 20;
  const py = w => cH - 20 - ((w - minW) / Math.max(maxW-minW, 1)) * (cH-40);

  let chartHTML = `<div class="chart-no-data">Registra al menos 2 días con peso para ver la gráfica</div>`;
  if (wData.length >= 2) {
    const pathD = wData.map((d,i) => `${i===0?"M":"L"}${px(i).toFixed(1)},${py(d.w).toFixed(1)}`).join(" ");
    const areaD = `${pathD} L${px(wData.length-1).toFixed(1)},${cH-20} L${px(0).toFixed(1)},${cH-20} Z`;
    const dots  = wData.map((d,i) => `<circle cx="${px(i).toFixed(1)}" cy="${py(d.w).toFixed(1)}" r="3" fill="#00ff87"/>`).join("");
    chartHTML = `
      <svg class="chart-wrap" viewBox="0 0 ${cW} ${cH}" style="overflow:visible">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00ff87" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#00ff87" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${[0,1,2,3].map(i=>`<line x1="20" y1="${(20+i*((cH-40)/3)).toFixed(1)}" x2="${cW-20}" y2="${(20+i*((cH-40)/3)).toFixed(1)}" stroke="#1a1a1a" stroke-width="1"/>`).join("")}
        <path d="${areaD}" fill="url(#wg)"/>
        <path d="${pathD}" fill="none" stroke="#00ff87" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
        <text x="${px(0).toFixed(1)}" y="${cH-4}" font-size="8" fill="#444" text-anchor="middle" font-family="Space Mono">Inicio</text>
        <text x="${px(wData.length-1).toFixed(1)}" y="${cH-4}" font-size="8" fill="#444" text-anchor="middle" font-family="Space Mono">Hoy</text>
        <text x="22" y="${(py(wData[0].w)+4).toFixed(1)}" font-size="8" fill="#555" font-family="Space Mono">${wData[0].w}kg</text>
        <text x="22" y="${(py(wData[wData.length-1].w)+4).toFixed(1)}" font-size="8" fill="#00ff87" font-family="Space Mono">${wData[wData.length-1].w}kg</text>
      </svg>`;
  }

  return `
    <div class="header fade-up">
      <div class="header-sub">Tu progreso</div>
      <div class="header-title">EVOLUCIÓN</div>
    </div>
    <div class="section">
      <div class="card">
        <span class="lbl">Curva de peso</span>
        ${chartHTML}
      </div>

      <div class="row">
        ${statBox(wLost > 0 ? `-${wLost}` : "0", "kg perdidos", wLost > 0 ? "green" : "")}
        ${statBox(totalDays, "días registrados")}
      </div>
      <div class="row" style="margin-top:0">
        ${statBox(trainedDays, "días entrenados")}
        ${statBox(`${consistPct}%`, "consistencia", consistPct >= 80 ? "green" : "yellow")}
      </div>

      <div class="card">
        <span class="lbl">Meta final</span>
        <div class="row" style="justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;color:var(--muted)">Inicio: <span style="color:#fff;font-weight:700">${START_WEIGHT} kg</span></div>
            <div style="font-size:13px;color:var(--muted);margin-top:4px">Meta: <span style="color:var(--accent);font-weight:700">${goalRange}</span></div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;color:var(--muted)">Actual: <span style="color:#fff;font-weight:700">${lastW} kg</span></div>
            <div style="font-size:13px;color:var(--muted);margin-top:4px">Faltan: <span style="color:${parseFloat(toGoal)===0?"var(--accent)":"var(--yellow)"};font-weight:700">${toGoal} kg</span></div>
          </div>
        </div>
        <div class="progress-wrap" style="margin-top:14px">
          <div class="progress-fill gradient" style="width:${goalPct}%"></div>
        </div>
      </div>
    </div>`;
}

function renderHistory() {
  const sorted = [...entries].sort((a,b) => b.date.localeCompare(a.date));
  const items = sorted.length === 0
    ? `<div class="card empty">
         <div class="empty-icon">📭</div>
         <div class="empty-text">Sin registros aún.</div>
         <div class="empty-sub">Empieza hoy.</div>
       </div>`
    : sorted.map(e => `
        <div class="history-item ${e.date===today()?"today":""}" onclick="editEntry('${e.date}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div class="history-date ${e.date===today()?"today":""}">${formatDate(e.date)}</div>
              <div class="history-meta">${e.trained?"✓ Entrenó":"✗ Sin entreno"}${e.weight?" · "+e.weight+" kg":""}</div>
            </div>
            <div style="text-align:right">
              ${e.proteina?`<div style="font-size:11px;color:var(--blue);font-family:var(--font-mono)">${e.proteina}g prot</div>`:""}
              ${e.calorias?`<div style="font-size:11px;color:var(--dim);font-family:var(--font-mono);margin-top:2px">${e.calorias} kcal</div>`:""}
            </div>
          </div>
          ${e.notes?`<div class="history-notes">${e.notes}</div>`:""}
        </div>`).join("");

  return `
    <div class="header fade-up">
      <div class="header-sub">Todos los registros</div>
      <div class="header-title">HISTORIAL</div>
    </div>
    <div class="section">
      ${items}
      ${sorted.length > 0 ? `<button class="btn-export" onclick="exportData()">↓ Exportar respaldo (.json)</button>` : ""}
    </div>`;
}

function renderNav() {
  const tabs = [
    { id:"home",     icon:"⚡", label:"Inicio"   },
    { id:"log",      icon:"＋", label:"Registrar" },
    { id:"progress", icon:"📈", label:"Progreso"  },
    { id:"history",  icon:"📋", label:"Historial" },
  ];
  return `<nav>${tabs.map(t => `
    <button class="nav-btn ${currentView===t.id?"active":""}" onclick="goView('${t.id}')">
      <span class="nav-icon">${t.icon}</span>${t.label}
    </button>`).join("")}</nav>`;
}

// ── RENDER ──
function render() {
  const views = { home: renderHome, log: renderLog, progress: renderProgress, history: renderHistory };
  document.getElementById("view").innerHTML = (views[currentView] || renderHome)();
  document.getElementById("nav").innerHTML  = renderNav();
}

// ── ACTIONS ──
function goView(v) {
  currentView = v;
  if (v === "log") {
    const existing = getTodayEntry();
    formData = existing ? { ...existing } : freshForm();
  }
  window.scrollTo(0, 0);
  render();
}

function setField(key, value) {
  formData[key] = value;
  document.querySelectorAll('.grid2 input[data-key]').forEach(inp => {
    const k = inp.dataset.key;
    if (k && MACROS[k]) {
      const v = parseFloat(inp.value);
      inp.classList.toggle("ok", !isNaN(v) && v >= MACROS[k] * 0.9);
    }
  });
}

function saveEntry() {
  if (formData.weight !== "" && formData.weight !== undefined) {
    const w = parseFloat(formData.weight);
    if (isNaN(w) || w < 30 || w > 300) {
      alert("Peso inválido. Ingresa un valor entre 30 y 300 kg.");
      return;
    }
  }
  const macroKeys = ["proteina", "carbos", "grasas", "calorias"];
  const macroNames = { proteina: "Proteína", carbos: "Carbos", grasas: "Grasas", calorias: "Calorías" };
  for (const k of macroKeys) {
    if (formData[k] !== "" && formData[k] !== undefined) {
      const v = parseFloat(formData[k]);
      if (isNaN(v) || v < 0 || v > 9999) {
        alert(`Valor inválido para ${macroNames[k]}. Ingresa un número entre 0 y 9999.`);
        return;
      }
    }
  }
  const updated = entries.filter(e => e.date !== formData.date);
  entries = [...updated, { ...formData }];
  save();
  const btn = document.getElementById("save-btn");
  if (btn) { btn.textContent = "✓ Guardado"; btn.classList.add("saved"); }
  clearTimeout(savedTimeout);
  savedTimeout = setTimeout(() => { if (btn) { btn.textContent = "Guardar registro"; btn.classList.remove("saved"); } }, 2000);
}

function editEntry(date) {
  const e = entries.find(x => x.date === date);
  if (e) { formData = { ...e }; currentView = "log"; window.scrollTo(0,0); render(); }
}

function exportData() {
  if (entries.length === 0) { alert("No hay registros para exportar."); return; }
  const json = JSON.stringify({ exportDate: today(), startDate: START_DATE, startWeight: START_WEIGHT, entries }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `corte-backup-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── PWA INSTALL ──
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstall = e;
  const banner = document.getElementById("install-banner");
  if (banner) banner.classList.remove("hidden");
});

function installApp() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  deferredInstall.userChoice.then(() => {
    deferredInstall = null;
    const banner = document.getElementById("install-banner");
    if (banner) banner.classList.add("hidden");
  });
}

function dismissInstall() {
  const banner = document.getElementById("install-banner");
  if (banner) banner.classList.add("hidden");
}

// ── SERVICE WORKER ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// ── INIT ──
load();
render();
initQuoteModal();
