const DAYS = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
const WEEKDAYS = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];
const MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
const MONTHS_GEN = ["Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου", "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"];
const MONTHS_SHORT = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μάι", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
const WEEK = ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"];

const REPEATS = [
  ["", "Χωρίς επανάληψη"],
  ["w1", "Κάθε εβδομάδα"],
  ["w2", "Κάθε 2 εβδομάδες"],
  ["m1", "Κάθε μήνα"],
  ["m2", "Κάθε 2 μήνες"],
  ["m3", "Κάθε 3 μήνες"],
  ["m6", "Κάθε 6 μήνες"],
  ["y1", "Κάθε χρόνο"]
];

const ICONS = {
  import: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"/>',
  week: '<path d="M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 13h8M8 17h5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  cal: '<path d="M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><circle cx="8" cy="13" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="16" cy="13" r="1"/>',
  users: '<path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19c.4-2.6 2.4-4 4.5-4s4.1 1.4 4.5 4M14 15.1c1.6.2 3 .9 3.6 2.9"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3M20 16V6"/>',
  msg: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z"/><path d="M8 10h8M8 13h5"/>',
  user: '<circle cx="12" cy="8" r="3.2"/><path d="M5 19.2c1.2-2.8 3.6-4.2 7-4.2s5.8 1.4 7 4.2"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.2"/>',
  phone: '<path d="M7 3h3l1.5 4-2 1.5a12 12 0 0 0 6 6L17 13l4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 4 5a2 2 0 0 1 2-2Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calplus: '<path d="M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M12 12v6M9 15h6"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  hourglass: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  repeat: '<path d="M17 2l3 3-3 3M3 11V9a4 4 0 0 1 4-4h13M7 22l-3-3 3-3M21 13v2a4 4 0 0 1-4 4H4"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  building: '<path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 10h3a1 1 0 0 1 1 1v10M3 21h18M9 8h2M9 12h2M9 16h2"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14 12h.01"/>',
  manhole: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'
};
function icon(name, cls = "") {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function has(value) { return String(value ?? "").trim() !== ""; }
function fold(s) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ς/g, "σ");
}
function matchesText(haystack, query) {
  const needle = fold(query).trim();
  if (!needle) return true;
  const hay = fold(haystack);
  return needle.split(/\s+/).every((word) => hay.includes(word));
}

function iso(d) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function parseISO(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function todayISO() { return iso(new Date()); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(date, n) {
  const d = parseISO(date);
  d.setDate(d.getDate() + n);
  return iso(d);
}
function mondayOf(date) {
  const d = parseISO(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}
function addInterval(date, code) {
  if (!code) return date;
  const d = parseISO(date);
  const n = Number(code.slice(1)) || 1;
  const unit = code[0];
  if (unit === "w") {
    d.setDate(d.getDate() + 7 * n);
    return iso(d);
  }
  const months = unit === "y" ? 12 * n : n;
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return iso(d);
}
function longDate(value) {
  const d = parseISO(value);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}
function dayName(value) { return value ? DAYS[parseISO(value).getDay()] : ""; }
function dayHint(value) { return `<b class="day-hint">${esc(dayName(value))}</b>`; }
function shortDate(value) {
  const d = parseISO(value);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Καλημέρα";
  if (h < 18) return "Καλησπέρα";
  return "Καλό βράδυ";
}

function phoneLink(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}
function mapsLink(target, fallbackAddress) {
  const lat = target && typeof target === "object" ? target.lat : "";
  const lng = target && typeof target === "object" ? target.lng : "";
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const text = typeof target === "string" ? target : (fallbackAddress || target?.address || "");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}
function embedSrc(lat, lng, address) {
  if (lat && lng) return `https://maps.google.com/maps?q=${lat},${lng}&z=18&hl=el&output=embed`;
  if (address) return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=16&hl=el&output=embed`;
  return "https://maps.google.com/maps?q=" + encodeURIComponent("Ελλάδα") + "&z=6&hl=el&output=embed";
}
function parseMapsUrl(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  let url;
  try { url = new URL(text); } catch { return null; }
  const host = url.hostname.replace(/^www\./, "");
  const google = /google\./.test(host) || host === "maps.app.goo.gl" || host.endsWith("goo.gl");
  if (!google) return null;
  const precise = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (precise) return { lat: precise[1], lng: precise[2] };
  const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return { lat: at[1], lng: at[2] };
  const query = url.searchParams.get("q") || url.searchParams.get("query") || url.searchParams.get("ll") || url.searchParams.get("destination") || "";
  const pair = String(query).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (pair) return { lat: pair[1], lng: pair[2] };
  if (host === "maps.app.goo.gl" || host.endsWith("goo.gl")) return { short: true };
  return null;
}
function areaOf(address) {
  const parts = String(address).split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "";
}

function euro(n) {
  const value = Number(n) || 0;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
  return `${text}€`;
}
function sumEuros(text) {
  const raw = String(text ?? "");
  const withSign = [...raw.matchAll(/(\d+(?:[.,]\d+)?)\s*€/g)].map((m) => Number(m[1].replace(",", ".")));
  if (withSign.length) return withSign.reduce((a, b) => a + b, 0);
  const plain = raw.trim().match(/^\d+(?:[.,]\d+)?$/);
  return plain ? Number(plain[0].replace(",", ".")) : 0;
}
function durationMinutes(value) {
  const text = String(value || "");
  const n = Number((text.match(/\d+/) || [])[0]);
  if (!n) return 60;
  return /ωρ/i.test(text) ? n * 60 : n;
}
function durationShort(value) {
  if (!has(value)) return "";
  const n = String(value).match(/\d+/);
  return n ? `${n[0]}′` : String(value);
}

function formData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      data[key] = [].concat(data[key], String(value).trim());
    } else {
      data[key] = typeof value === "string" ? value.trim() : value;
    }
  });
  return data;
}

function kv(label, valueHTML) {
  return valueHTML ? `<div class="kv"><dt>${label}</dt><dd>${valueHTML}</dd></div>` : "";
}

const geoCache = new Map();
async function geocode(address) {
  const text = String(address || "").trim();
  if (text.length < 4) return null;
  if (geoCache.has(text)) return geoCache.get(text);
  const queries = [text, text.replace(/\b\d{3}\s?\d{2}\b/, "").replace(/\s+,/g, ",").trim()].filter((q, i, all) => q && all.indexOf(q) === i);
  for (const q of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=gr&accept-language=el&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data[0]) {
        const found = { lat: Number(data[0].lat).toFixed(6), lng: Number(data[0].lon).toFixed(6) };
        geoCache.set(text, found);
        return found;
      }
    } catch { /* offline or blocked: fall back to the plain address */ }
  }
  return null;
}
