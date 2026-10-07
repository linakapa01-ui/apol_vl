const KEY = "nv-vlachos-v1";
const SYNC_KEY = "nv-vlachos-sync";
const DIRTY_KEY = "nv-vlachos-dirty";
const COLLECTIONS = ["customers", "appointments", "templates"];
const DEFAULT_CATEGORIES = ["Απεντόμωση", "Μυοκτονία", "Απολύμανση", "Μυρμήγκια", "Κουνούπια", "Άλλο"];
const TOMBSTONE_DAYS = 90;

const known = {};
let dirty = localStorage.getItem(DIRTY_KEY) === "1";
let state = load();
const sync = { status: "off", at: 0, error: "", busy: false };
let pushTimer = 0;
let onRemoteChange = () => {};
let onSyncStatus = () => {};

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function defaultSettings() {
  return { id: "settings", businessName: "Νίκος Βλάχος", logo: "", adminPhone: "", categories: [...DEFAULT_CATEGORIES] };
}
function defaultTemplates() {
  return [
    { id: "t-reminder", title: "Υπενθύμιση ραντεβού", text: "Καλημέρα {όνομα}, σας υπενθυμίζω ότι έχουμε ραντεβού {ημερομηνία} στις {ώρα}. Νίκος Βλάχος" },
    { id: "t-weather", title: "Μεταφορά λόγω καιρού", text: "Καλημέρα, λόγω κακοκαιρίας θα χρειαστεί να μεταφέρουμε το ραντεβού μας. Θα σας ενημερώσω για τη νέα ημερομηνία. Ευχαριστώ για την κατανόηση." },
    { id: "t-repeat", title: "Νέα επίσκεψη", text: "Καλημέρα {όνομα}, πέρασε αρκετός καιρός από την τελευταία επίσκεψη. Θέλετε να κλείσουμε νέο ραντεβού;" },
    { id: "t-payment", title: "Υπενθύμιση πληρωμής", text: "Καλημέρα {όνομα}, υπενθυμίζω την εκκρεμή πληρωμή {ποσό} για την τελευταία επίσκεψη. Ευχαριστώ." },
    { id: "t-thanks", title: "Ευχαριστώ", text: "Ευχαριστώ πολύ για την εμπιστοσύνη σας! Για οτιδήποτε χρειαστείτε είμαι στη διάθεσή σας. Νίκος Βλάχος" }
  ];
}

function sigOf(record) {
  const { _u, _h, ...rest } = record;
  return JSON.stringify(rest);
}
function preStamp(record) {
  record._h = sigOf(record);
  record._u = 0;
  return record;
}

function seed() {
  const today = todayISO();
  const customers = [
    { id: "c1", name: "Φωτεινή Λιώλη", address: "Γραβιάς 66, Πετρούπολη, 13231", isBuilding: true, hasApts: true, manholes: false, categories: ["Απεντόμωση"], floorPrice: "", cost: "45€ + 15€ τζελ Κ", apartments: "2", phone: "6939948096", phone2: "6975668158", lastDate: "", pest: "Κατσαρίδα (τζελ Κ)", notes: "" },
    { id: "c2", name: "Βάνα Πηγαδιώτη Φίλη Αντωνίας", address: "Δήλου 12, Περιστέρι, 12134", isBuilding: true, hasApts: true, manholes: false, categories: ["Απεντόμωση", "Κουνούπια"], floorPrice: "", cost: "45€ + 20€ κουνούπια", apartments: "2", phone: "6946892290", phone2: "", lastDate: "", pest: "Κουνούπια", notes: "" },
    { id: "c3", name: "Βάσω Γράψα", address: "Μπουμπουλίνας και Νάξου 12, Άλσος Χαϊδαρίου, 12462", isBuilding: true, hasApts: true, manholes: false, categories: ["Απεντόμωση"], floorPrice: "", cost: "45€ + 15€ τζελ Κ + 15€ συνεργείο", apartments: "3 (μόνο κοινόχρηστα)", phone: "6977090580", phone2: "", lastDate: "", pest: "Κατσαρίδα (τζελ Κ)", notes: "Μόνο κοινόχρηστα." }
  ];
  const mk = (id, i, time, duration) => ({ id, customerId: customers[i].id, date: today, time, service: "Απεντόμωση", floor: "", manholes: "", cost: customers[i].cost, duration, status: "scheduled", log: [], notes: "", repeat: "" });
  const appointments = [mk("a1", 0, "09:00", "45 λεπτά"), mk("a2", 1, "11:30", "40 λεπτά"), mk("a3", 2, "14:00", "55 λεπτά")];
  customers.forEach(preStamp);
  appointments.forEach(preStamp);
  const templates = defaultTemplates().map(preStamp);
  return {
    customers, appointments, templates,
    settings: preStamp(defaultSettings()),
    tombstones: { customers: {}, appointments: {}, templates: {} },
    notifications: [], theme: "dark", notifiedOn: ""
  };
}

function normalise(data) {
  data.customers ||= [];
  data.appointments ||= [];
  data.notifications ||= [];
  data.theme ||= "dark";
  data.notifiedOn ||= "";
  data.tombstones ||= {};
  COLLECTIONS.forEach((name) => { data.tombstones[name] ||= {}; });
  if (!data.settings) {
    data.settings = { ...defaultSettings(), adminPhone: data.adminPhone || "" };
  }
  delete data.adminPhone;
  data.settings.id = "settings";
  if (!Array.isArray(data.settings.categories) || !data.settings.categories.length) data.settings.categories = [...DEFAULT_CATEGORIES];
  if (!Array.isArray(data.templates)) data.templates = defaultTemplates().map(preStamp);
  data.appointments.forEach((appt) => {
    if (!appt.status) appt.status = "scheduled";
    if (appt.duration == null) appt.duration = "";
    if (!appt.log) appt.log = [];
  });
  return data;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return normalise(seed());
    const data = JSON.parse(raw);
    if (!data.customers || !data.appointments) return normalise(seed());
    return normalise(data);
  } catch {
    return normalise(seed());
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
function setDirty(value) {
  dirty = value;
  try { localStorage.setItem(DIRTY_KEY, value ? "1" : "0"); } catch { /* ignore */ }
}

function stamp() {
  const now = Date.now();
  COLLECTIONS.forEach((name) => {
    const ids = new Set();
    state[name].forEach((record) => {
      ids.add(record.id);
      const sig = sigOf(record);
      if (record._h !== sig) {
        record._h = sig;
        record._u = now;
      }
    });
    (known[name] || new Set()).forEach((id) => {
      if (!ids.has(id)) state.tombstones[name][id] = now;
    });
    known[name] = ids;
  });
  const sig = sigOf(state.settings);
  if (state.settings._h !== sig) {
    state.settings._h = sig;
    state.settings._u = now;
  }
}
function initKnown() {
  COLLECTIONS.forEach((name) => { known[name] = new Set(state[name].map((r) => r.id)); });
}
function save() {
  stamp();
  persist();
  setDirty(true);
  schedulePush();
}

function snapshot() {
  const limit = Date.now() - TOMBSTONE_DAYS * 86400000;
  const tombstones = {};
  COLLECTIONS.forEach((name) => {
    tombstones[name] = {};
    Object.entries(state.tombstones[name]).forEach(([id, ts]) => { if (ts > limit) tombstones[name][id] = ts; });
  });
  return { customers: state.customers, appointments: state.appointments, templates: state.templates, settings: state.settings, tombstones };
}

function mergeRemote(remote) {
  let changed = false;
  COLLECTIONS.forEach((name) => {
    const map = new Map(state[name].map((r) => [r.id, r]));
    const tomb = { ...(state.tombstones[name] || {}) };
    Object.entries((remote.tombstones || {})[name] || {}).forEach(([id, ts]) => { tomb[id] = Math.max(tomb[id] || 0, ts); });
    (remote[name] || []).forEach((incoming) => {
      const mine = map.get(incoming.id);
      if (!mine || (incoming._u || 0) > (mine._u || 0)) {
        map.set(incoming.id, incoming);
        changed = true;
      }
    });
    Object.entries(tomb).forEach(([id, ts]) => {
      const record = map.get(id);
      if (record && ts >= (record._u || 0)) {
        map.delete(id);
        changed = true;
      }
    });
    state[name] = [...map.values()];
    state.tombstones[name] = tomb;
  });
  if (remote.settings && (remote.settings._u || 0) > (state.settings._u || 0)) {
    state.settings = remote.settings;
    changed = true;
  }
  return changed;
}

function getSync() {
  try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch { return {}; }
}
function syncConfigured() {
  const cfg = window.APP_CONFIG || {};
  return Boolean(cfg.supabaseUrl && cfg.supabaseKey);
}
function syncEnabled() {
  return syncConfigured() && String(getSync().code || "").length >= 12;
}
function setSyncStatus(status, error = "") {
  sync.status = status;
  sync.error = error;
  if (status === "ok") sync.at = Date.now();
  onSyncStatus();
}

async function rpc(name, body) {
  const cfg = window.APP_CONFIG;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${cfg.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status} ${text.slice(0, 160)}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

function schedulePush() {
  if (!syncEnabled()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, 1200);
}

async function syncNow() {
  if (!syncEnabled() || sync.busy) return;
  if (!navigator.onLine) {
    setSyncStatus("offline");
    return;
  }
  sync.busy = true;
  setSyncStatus("syncing");
  let remoteChanged = false;
  try {
    const code = getSync().code;
    for (let attempt = 0; attempt < 4; attempt++) {
      const remote = await rpc("get_state", { p_code: code });
      const hasData = Boolean(remote && remote.data && Object.keys(remote.data).length);
      if (hasData && mergeRemote(remote.data)) {
        remoteChanged = true;
        initKnown();
      }
      stamp();
      persist();
      if (hasData && !dirty) break;
      const version = await rpc("put_state", { p_code: code, p_data: snapshot(), p_expected: remote ? remote.updated_at : null });
      if (version) {
        setDirty(false);
        break;
      }
    }
    setSyncStatus("ok");
    if (remoteChanged) onRemoteChange();
  } catch (error) {
    setSyncStatus("error", String(error.message || error));
  } finally {
    sync.busy = false;
  }
}

function connectSync(code) {
  localStorage.setItem(SYNC_KEY, JSON.stringify({ code }));
  setDirty(true);
  return syncNow();
}
function disconnectSync() {
  localStorage.removeItem(SYNC_KEY);
  setSyncStatus("off");
}

initKnown();
stamp();
persist();
setInterval(syncNow, 20000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) syncNow(); });
window.addEventListener("online", syncNow);
