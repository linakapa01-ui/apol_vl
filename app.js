const KEY = "nv-vlachos-v1";
const DAYS = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
const MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
const MONTHS_GEN = ["Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου", "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"];
const WEEK = ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"];
const SERVICES = ["Απεντόμωση", "Μυοκτονία", "Απολύμανση"];

const viewEl = document.getElementById("view");
const sheetEl = document.getElementById("sheet");
const sheetBody = document.getElementById("sheet-body");
const badgeEl = document.getElementById("badge");

let state = load();
let view = "home";
let query = "";
let cal = startOfMonth(new Date());
let picked = iso(new Date());

function iso(d) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function todayISO() { return iso(new Date()); }
function parseISO(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function dash(s) { return s ? esc(s) : "—"; }
function areaOf(address) {
  const parts = String(address).split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "";
}
function nextId(prefix, list) {
  const n = list.reduce((max, item) => Math.max(max, parseInt(String(item.id).slice(1), 10) || 0), 0) + 1;
  return prefix + n;
}
function customer(id) { return state.customers.find((c) => c.id === id); }
function apptsOn(date, activeOnly = true) {
  return state.appointments
    .filter((a) => a.date === date && (!activeOnly || isActive(a)))
    .sort((a, b) => a.time.localeCompare(b.time));
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Καλημέρα";
  if (h < 18) return "Καλησπέρα";
  return "Καληνύχτα";
}
function longDate(value) {
  const d = parseISO(value);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
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
  return "about:blank";
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
function placeTarget(appt, person) {
  if (appt && appt.lat && appt.lng) return appt;
  if (person && person.lat && person.lng) return person;
  return person;
}
function isActive(appt) { return !appt.status || appt.status === "scheduled"; }
function statusLabel(status) {
  if (status === "cancelled") return "Ακυρώθηκε";
  if (status === "done") return "Ολοκληρώθηκε";
  return "";
}
function durationShort(value) {
  const n = String(value || "").match(/\d+/);
  if (!value) return "—";
  return n ? `${n[0]}′` : value;
}
function costShort(value) {
  const text = String(value || "");
  const parts = text.match(/\d+(?:[.,]\d+)?/g);
  if (!parts || !text.includes("€")) return text || "—";
  const sum = parts.reduce((total, part) => total + Number(part.replace(",", ".")), 0);
  if (!sum) return text;
  return `${Number.isInteger(sum) ? sum : Math.round(sum)}€`;
}

function seed() {
  const today = todayISO();
  const customers = [
    { id: "c1", name: "Φωτεινή Λιώλη", address: "Γραβιάς 66, Πετρούπολη, 13231", scope: "Ολόκληρη πολυκατοικία", cost: "45€ + 15€ τζελ Κ", apartments: "2", phone: "6939948096", phone2: "6975668158", lastDate: "", pest: "Κατσαρίδα (τζελ Κ)", notes: "" },
    { id: "c2", name: "Βάνα Πηγαδιώτη Φίλη Αντωνίας", address: "Δήλου 12, Περιστέρι, 12134", scope: "Ολόκληρη πολυκατοικία", cost: "45€ + 20€ κουνούπια", apartments: "2", phone: "6946892290", phone2: "", lastDate: "", pest: "Κουνούπια", notes: "" },
    { id: "c3", name: "Βάσω Γράψα", address: "Μπουμπουλίνας και Νάξου 12, Άλσος Χαϊδαρίου, 12462", scope: "Ολόκληρη πολυκατοικία", cost: "45€ + 15€ τζελ Κ + 15€ συνεργείο", apartments: "3 (μόνο κοινόχρηστα)", phone: "6977090580", phone2: "", lastDate: "", pest: "Κατσαρίδα (τζελ Κ)", notes: "Μόνο κοινόχρηστα." }
  ];
  const appointments = [
    { id: "a1", customerId: "c1", date: today, time: "09:00", service: "Απεντόμωση", floor: "", manholes: "", cost: customers[0].cost, duration: "45 λεπτά", status: "scheduled", log: [], notes: "" },
    { id: "a2", customerId: "c2", date: today, time: "11:30", service: "Απεντόμωση", floor: "", manholes: "", cost: customers[1].cost, duration: "40 λεπτά", status: "scheduled", log: [], notes: "" },
    { id: "a3", customerId: "c3", date: today, time: "14:00", service: "Απεντόμωση", floor: "", manholes: "", cost: customers[2].cost, duration: "55 λεπτά", status: "scheduled", log: [], notes: "" }
  ];
  return {
    customers,
    appointments,
    notifications: [],
    theme: "dark",
    adminPhone: "",
    notifiedOn: ""
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const data = JSON.parse(raw);
    if (!data.customers || !data.appointments) return seed();
    data.notifications ||= [];
    data.theme ||= "dark";
    data.adminPhone ||= "";
    data.notifiedOn ||= "";
    const demoDuration = { a1: "45 λεπτά", a2: "40 λεπτά", a3: "55 λεπτά" };
    data.appointments.forEach((appt) => {
      if (!appt.status) appt.status = "scheduled";
      if (appt.duration == null) appt.duration = demoDuration[appt.id] || "";
      if (!appt.log) appt.log = [];
    });
    return data;
  } catch {
    return seed();
  }
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = state.theme === "light" ? "#f3f0e8" : "#070807";
  document.getElementById("theme-icon").innerHTML = state.theme === "dark"
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
    : '<path d="M16 13.2A6.2 6.2 0 0 1 10.8 8 6.4 6.4 0 1 0 16 13.2Z"/>';
}

function unread() { return state.notifications.filter((n) => !n.read).length; }
function paintBadge() {
  const n = unread();
  badgeEl.hidden = n === 0;
  badgeEl.textContent = String(n);
}
function pushNote(title, body, alsoPhone) {
  state.notifications.unshift({ id: nextId("n", state.notifications), title, body, at: new Date().toISOString(), read: false });
  save();
  paintBadge();
  if (alsoPhone) phoneNotify(title, body);
}
function phoneNotify(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try { new Notification(title, { body, icon: "assets/logo.png" }); } catch { /* page without permission */ }
}
function dailyReminder() {
  const today = todayISO();
  if (state.notifiedOn === today) return;
  const list = apptsOn(today);
  if (!list.length) return;
  state.notifiedOn = today;
  const first = list[0];
  const person = customer(first.customerId);
  pushNote("Σήμερα", `${list.length} ραντεβού. Πρώτο στις ${first.time}${person ? `, ${person.name}` : ""}.`, true);
}

function cardHTML(appt) {
  const person = customer(appt.customerId);
  if (!person) return "";
  const past = !isActive(appt);
  const call = phoneLink(person.phone);
  const label = statusLabel(appt.status);
  return `<article class="card${past ? " past" : ""}">
    <div class="card-body" data-action="appt" data-id="${esc(appt.id)}">
      <div class="time"><span class="time-label"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>${esc(appt.time)}</span><span class="tag">${esc(label || appt.service)}</span></div>
      <h3>${esc(person.name)}</h3>
      <a class="meta map" href="${mapsLink(placeTarget(appt, person))}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.2"/></svg><span>${esc(person.address)}</span></a>
      ${call ? `<a class="meta phone" href="${esc(call)}"><svg viewBox="0 0 24 24"><path d="M7 3h3l1.5 4-2 1.5a12 12 0 0 0 6 6L17 13l4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 4 5a2 2 0 0 1 2-2Z"/></svg><span>${esc(person.phone)}</span></a>` : ""}
    </div>
    <div class="side" data-action="appt" data-id="${esc(appt.id)}">
      <span class="mini"><small>Χρόνος</small>${esc(durationShort(appt.duration))}</span>
      <span class="mini"><small>Κόστος</small>${esc(costShort(appt.cost || person.cost))}</span>
    </div>
  </article>`;
}

function render() {
  document.querySelectorAll(".nav button").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  if (view === "home") renderHome();
  if (view === "schedule") renderSchedule();
  if (view === "calendar") renderCalendar();
  if (view === "customers") renderCustomers();
  if (view === "profile") renderProfile();
  paintBadge();
}

function renderHome() {
  const today = todayISO();
  const list = apptsOn(today);
  const word = list.length === 1 ? "ραντεβού" : "ραντεβού";
  viewEl.innerHTML = `<section class="hello">
      <h2>${greeting()}, Νίκο!</h2>
      <p>Σήμερα έχεις ${list.length} ${word}</p>
    </section>
    <h2 class="section-label">ΣΗΜΕΡΙΝΟ ΠΡΟΓΡΑΜΜΑ</h2>
    <div class="stack">${list.map(cardHTML).join("") || '<p class="empty">Δεν υπάρχει ραντεβού για σήμερα.</p>'}</div>`;
}

function renderSchedule() {
  const dates = [...new Set(state.appointments.filter(isActive).map((a) => a.date))].sort();
  const blocks = dates.map((date) => `<section class="day-block"><h3>${esc(longDate(date))}</h3><div class="stack">${apptsOn(date).map(cardHTML).join("")}</div></section>`).join("");
  const history = state.appointments
    .filter((a) => !isActive(a))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  viewEl.innerHTML = `<div class="row"><h2 class="section-label">ΟΛΟ ΤΟ ΠΡΟΓΡΑΜΜΑ</h2><button class="text-btn" type="button" data-action="new-appt">Νέο</button></div>
    ${blocks || '<p class="empty">Το πρόγραμμα είναι άδειο.</p>'}
    <div class="actions"><button class="solid" type="button" data-action="new-appt">Νέο ραντεβού</button></div>
    <h2 class="section-label">ΙΣΤΟΡΙΚΟ</h2>
    <div class="stack">${history.map(cardHTML).join("") || '<p class="empty">Οι ακυρωμένες και οι ολοκληρωμένες επισκέψεις φαίνονται εδώ.</p>'}</div>`;
}

function renderCalendar() {
  const year = cal.getFullYear();
  const month = cal.getMonth();
  const firstPad = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const today = todayISO();
  let cells = "";
  for (let i = 0; i < firstPad; i++) cells += "<span></span>";
  for (let day = 1; day <= days; day++) {
    const date = iso(new Date(year, month, day));
    const has = apptsOn(date).length > 0;
    const cls = ["day", has ? "on" : "", date === today ? "today" : "", date === picked ? "picked" : ""].filter(Boolean).join(" ");
    cells += `<button class="${cls}" type="button" data-action="pick-day" data-date="${date}">${day}${has ? "<i></i>" : ""}</button>`;
  }
  const pickedList = apptsOn(picked);
  viewEl.innerHTML = `<div class="month-switch">
      <button class="icon-btn" type="button" data-action="prev-month" aria-label="Προηγούμενος μήνας"><svg viewBox="0 0 24 24"><path d="M15 6 9 12l6 6"/></svg></button>
      <strong>${MONTHS[month]} ${year}</strong>
      <button class="icon-btn" type="button" data-action="next-month" aria-label="Επόμενος μήνας"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>
    </div>
    <div class="cal-head">${WEEK.map((d) => `<span>${d}</span>`).join("")}</div>
    <div class="cal-grid">${cells}</div>
    <h2 class="section-label">${esc(longDate(picked))}</h2>
    <div class="stack">${pickedList.map(cardHTML).join("") || '<p class="empty">Καμία επίσκεψη αυτή την ημέρα.</p>'}</div>`;
}

function renderCustomers() {
  const q = query.trim().toLowerCase();
  const list = state.customers.filter((c) => !q || `${c.name} ${c.address} ${c.phone} ${c.pest}`.toLowerCase().includes(q));
  viewEl.innerHTML = `<div class="row"><h2 class="section-label">ΠΕΛΑΤΟΛΟΓΙΟ</h2><button class="text-btn" type="button" data-action="new-customer">Νέος</button></div>
    <input class="search" id="search" placeholder="Αναζήτηση ονόματος, περιοχής, τηλεφώνου" value="${esc(query)}">
    <div class="stack">${list.map((c) => {
      const call = phoneLink(c.phone);
      return `<article class="card person">
      <div class="card-body" data-action="customer" data-id="${esc(c.id)}">
        <h3>${esc(c.name)}</h3>
        <a class="meta map" href="${mapsLink(c)}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.2"/></svg><span>${esc(c.address)}</span></a>
        ${call ? `<a class="meta phone" href="${esc(call)}"><svg viewBox="0 0 24 24"><path d="M7 3h3l1.5 4-2 1.5a12 12 0 0 0 6 6L17 13l4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 4 5a2 2 0 0 1 2-2Z"/></svg><span>${esc(c.phone)}</span></a>` : ""}
      </div>
    </article>`;
    }).join("") || '<p class="empty">Δεν βρέθηκε πελάτης.</p>'}</div>`;
}

function renderProfile() {
  const granted = "Notification" in window && Notification.permission === "granted";
  viewEl.innerHTML = `<article class="panel profile-card">
      <img src="assets/logo.png" alt="">
      <h2 style="margin:0">Νίκος Βλάχος</h2>
      <p class="sub">Απεντόμωση · Μυοκτονία · Απολύμανση</p>
    </article>
    <div class="stack" style="margin-top:12px">
      <button class="panel switch" type="button" data-action="toggle-theme">
        <span><strong>Εμφάνιση</strong><br><span class="sub">${state.theme === "dark" ? "Σκοτεινή" : "Φωτεινή"}</span></span>
        <span class="tag" style="margin:0">${state.theme === "dark" ? "Dark" : "Light"}</span>
      </button>
      <article class="panel">
        <strong>Ειδοποιήσεις</strong>
        <p class="note">Μένουν μέσα στην εφαρμογή. Αν τις επιτρέψεις, εμφανίζονται και στην οθόνη του τηλεφώνου σου όσο η εφαρμογή είναι ανοιχτή.</p>
        <p class="sub">${granted ? "Το τηλέφωνο τις δέχεται." : "Δεν έχουν ενεργοποιηθεί ακόμα στο τηλέφωνο."}</p>
        <div class="actions"><button class="solid" type="button" data-action="enable-push">Ενεργοποίηση στο τηλέφωνο</button></div>
      </article>
      <form class="panel form" id="admin-form">
        <label>Τηλέφωνο διαχειριστή
          <input name="adminPhone" inputmode="tel" value="${esc(state.adminPhone)}" placeholder="Το κινητό σου">
        </label>
        <button class="ghost" type="submit">Αποθήκευση τηλεφώνου</button>
      </form>
    </div>`;
}

function openSheet(html) {
  sheetBody.innerHTML = `<button class="sheet-close" type="button" data-action="close" aria-label="Κλείσιμο">×</button>${html}`;
  sheetEl.hidden = false;
}
function closeSheet() { sheetEl.hidden = true; sheetBody.innerHTML = ""; }

function apptSheet(id) {
  const appt = state.appointments.find((a) => a.id === id);
  const person = appt && customer(appt.customerId);
  if (!appt || !person) return;
  const call = phoneLink(person.phone);
  const call2 = phoneLink(person.phone2);
  const moves = (appt.log || []).filter((item) => item.kind === "moved");
  const active = isActive(appt);
  openSheet(`<h2>${esc(appt.time)} · ${esc(person.name)}</h2>
    ${statusLabel(appt.status) ? `<p class="tag">${esc(statusLabel(appt.status))}</p>` : ""}
    <div class="fields">
      <label>Υπηρεσία<b>${dash(appt.service)}</b></label>
      <label>Περιοχή<b>${dash(areaOf(person.address))}</b></label>
      <label>Ακριβής διεύθυνση<b><a href="${mapsLink(placeTarget(appt, person))}" target="_blank" rel="noopener noreferrer">${esc(person.address)}</a></b></label>
      ${(appt.lat || person.lat) ? `<iframe class="map-frame" title="Google Maps" src="${esc(embedSrc(appt.lat || person.lat, appt.lng || person.lng))}"></iframe>` : ""}
      <label>Ολόκληρη ή διαμερίσματα<b>${dash(person.scope)}</b></label>
      <label>Πλήθος διαμερισμάτων<b>${dash(person.apartments)}</b></label>
      <label>Όροφος<b>${dash(appt.floor)}</b></label>
      <label>Άνοιγμα φρεατίων<b>${dash(appt.manholes)}</b></label>
      <label>Εκτιμώμενος χρόνος<b>${dash(appt.duration)}</b></label>
      <label>Κόστος αυτής της επίσκεψης<b>${dash(appt.cost || person.cost)}</b></label>
      <label>Τελευταία φορά<b>${person.lastDate ? esc(longDate(person.lastDate)) : "—"}</b></label>
      <label>Είδος<b>${dash(person.pest)}</b></label>
      <label>Τηλέφωνο<b>${call ? `<a href="${esc(call)}">${esc(person.phone)}</a>` : "—"}</b></label>
      <label>Τηλέφωνο 2<b>${call2 ? `<a href="${esc(call2)}">${esc(person.phone2)}</a>` : "—"}</b></label>
      <label>Σημειώσεις<b>${dash(appt.notes || person.notes)}</b></label>
      ${moves.length ? `<label>Μεταφορές<b>${moves.map((item) => `Από ${esc(longDate(item.from))} στις ${esc(longDate(item.to))}`).join("<br>")}</b></label>` : ""}
    </div>
    ${active ? `<form class="form move-form" id="move-form" data-id="${esc(appt.id)}">
      <label>Αλλαγή ημερομηνίας<input type="date" name="date" value="${esc(appt.date)}" required></label>
      <button class="solid" type="submit">Μεταφορά σε αυτή την ημέρα</button>
    </form>` : ""}
    <div class="actions">
      ${call ? `<a class="solid" href="${esc(call)}">Κλήση</a>` : ""}
      <a class="ghost" href="${mapsLink(placeTarget(appt, person))}" target="_blank" rel="noopener noreferrer">${appt.lat || person.lat ? "Πλοήγηση" : "Χάρτης"}</a>
      <button class="ghost" type="button" data-action="edit-appt" data-id="${esc(appt.id)}">Διόρθωση</button>
      ${active ? `<button class="ghost" type="button" data-action="done-appt" data-id="${esc(appt.id)}">Ολοκληρώθηκε</button>
      <button class="text-btn danger" type="button" data-action="cancel-appt" data-id="${esc(appt.id)}">Ακύρωση</button>` : `<button class="ghost" type="button" data-action="restore-appt" data-id="${esc(appt.id)}">Επαναφορά στο πρόγραμμα</button>`}
    </div>`);
}

function customerSheet(id) {
  const person = customer(id);
  if (!person) return;
  const call = phoneLink(person.phone);
  const call2 = phoneLink(person.phone2);
  const past = state.appointments.filter((a) => a.customerId === person.id && !isActive(a));
  openSheet(`<h2>${esc(person.name)}</h2>
    <div class="fields">
      <label>Διεύθυνση<b><a href="${mapsLink(person)}" target="_blank" rel="noopener noreferrer">${esc(person.address)}</a></b></label>
      ${person.lat ? `<iframe class="map-frame" title="Google Maps" src="${esc(embedSrc(person.lat, person.lng))}"></iframe>` : ""}
      <label>Ολόκληρη πολυκατοικία ή διαμερίσματα<b>${dash(person.scope)}</b></label>
      <label>Κόστος συνολικό ή ανά όροφο<b>${dash(person.cost)}</b></label>
      <label>Πλήθος διαμερισμάτων<b>${dash(person.apartments)}</b></label>
      <label>Τηλέφωνο<b>${call ? `<a href="${esc(call)}">${esc(person.phone)}</a>` : "—"}</b></label>
      <label>Τηλέφωνο 2<b>${call2 ? `<a href="${esc(call2)}">${esc(person.phone2)}</a>` : "—"}</b></label>
      <label>Ημερομηνία τελευταίας απολύμανσης<b>${person.lastDate ? esc(longDate(person.lastDate)) : "—"}</b></label>
      <label>Είδος εντόμου / τρωκτικού<b>${dash(person.pest)}</b></label>
      <label>Σημειώσεις τεχνικού<b>${dash(person.notes)}</b></label>
    </div>
    <h2 class="section-label">Ιστορικό πελάτη</h2>
    <div class="stack">${past.map(cardHTML).join("") || '<p class="empty">Δεν υπάρχει ακύρωση ή ολοκληρωμένη επίσκεψη.</p>'}</div>
    <div class="actions">
      ${call ? `<a class="solid" href="${esc(call)}">Κλήση</a>` : ""}
      <button class="ghost" type="button" data-action="edit-customer" data-id="${esc(person.id)}">Διόρθωση</button>
      <button class="ghost" type="button" data-action="appt-for" data-id="${esc(person.id)}">Νέο ραντεβού</button>
    </div>`);
}

function field(label, name, value, extra = "") {
  return `<label>${label}<input name="${name}" value="${esc(value || "")}" ${extra}></label>`;
}

function locationFields(record) {
  const locked = record.lat && record.lng;
  return `<div class="map-pick">
      <p class="note">Άνοιξε το Google Maps, βρες το κτίριο, πάτα Κοινοποίηση και επικόλλησε τον σύνδεσμο. Έτσι κλειδώνει το ακριβές σημείο.</p>
      <iframe class="map-frame" id="map-frame" title="Google Maps" src="${esc(embedSrc(record.lat, record.lng, record.address))}"></iframe>
      <a class="ghost map-open" id="open-gmaps" href="${esc(mapsLink(record))}" target="_blank" rel="noopener noreferrer">Άνοιγμα στο Google Maps</a>
      <label>Σύνδεσμος Google Maps
        <input name="mapsUrl" id="maps-url" value="${esc(record.mapsUrl || "")}" placeholder="Επικόλληση συνδέσμου">
      </label>
      <p class="map-status${locked ? " ok" : ""}" id="map-status">${locked ? "Το ακριβές σημείο είναι κλειδωμένο." : ""}</p>
      <input type="hidden" name="lat" id="map-lat" value="${esc(record.lat || "")}">
      <input type="hidden" name="lng" id="map-lng" value="${esc(record.lng || "")}">
    </div>`;
}
function customerForm(person) {
  const c = person || {};
  openSheet(`<h2>${person ? "Διόρθωση πελάτη" : "Νέος πελάτης"}</h2>
    <form class="form" id="customer-form" data-id="${esc(c.id || "")}">
      ${field("Όνομα πελάτη", "name", c.name, "required")}
      <label>Διεύθυνση<input name="address" id="map-address" value="${esc(c.address || "")}" required></label>
      ${locationFields(c)}
      <label>Ολόκληρη ή διαμερίσματα
        <select name="scope">
          ${["Ολόκληρη πολυκατοικία", "Μεμονωμένα διαμερίσματα"].map((opt) => `<option ${c.scope === opt ? "selected" : ""}>${esc(opt)}</option>`).join("")}
        </select>
      </label>
      ${field("Κόστος συνολικό ή ανά όροφο", "cost", c.cost)}
      ${field("Πλήθος διαμερισμάτων", "apartments", c.apartments)}
      ${field("Τηλέφωνο", "phone", c.phone, 'inputmode="tel" required')}
      ${field("Τηλέφωνο 2", "phone2", c.phone2, 'inputmode="tel"')}
      <label>Ημερομηνία τελευταίας απολύμανσης<input type="date" name="lastDate" value="${esc(c.lastDate || "")}"></label>
      ${field("Είδος εντόμου / τρωκτικού", "pest", c.pest)}
      <label>Σημειώσεις τεχνικού<textarea name="notes">${esc(c.notes || "")}</textarea></label>
      <div class="actions"><button class="solid" type="submit">Αποθήκευση</button>${person ? `<button class="text-btn danger" type="button" data-action="delete-customer" data-id="${esc(c.id)}">Διαγραφή</button>` : ""}</div>
    </form>`);
}

function apptLocation(person) {
  if (person && person.lat && person.lng) {
    return `<div class="map-pick" id="appt-loc">
      <p class="map-status ok">Θα μπει στο ακριβές σημείο του πελάτη στο Google Maps.</p>
      <iframe class="map-frame" title="Google Maps" src="${esc(embedSrc(person.lat, person.lng))}"></iframe>
    </div>`;
  }
  return `<div class="map-pick" id="appt-loc">${locationFields(person || {})}</div>`;
}
function apptForm(appt, customerId) {
  const a = appt || { date: picked || todayISO(), time: "09:00", service: "Απεντόμωση", customerId: customerId || state.customers[0]?.id || "" };
  const person = customer(a.customerId);
  const options = state.customers.map((c) => `<option value="${esc(c.id)}" ${c.id === a.customerId ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  openSheet(`<h2>${appt ? "Διόρθωση ραντεβού" : "Νέο ραντεβού"}</h2>
    <form class="form" id="appt-form" data-id="${esc(a.id || "")}">
      <label>Πελάτης<select name="customerId" required>${options}</select></label>
      ${apptLocation(person)}
      <label>Ημερομηνία<input type="date" name="date" value="${esc(a.date)}" required></label>
      <label>Ώρα<input type="time" name="time" value="${esc(a.time)}" required></label>
      ${field("Εκτιμώμενος χρόνος", "duration", a.duration, 'placeholder="π.χ. 45 λεπτά"')}
      <label>Υπηρεσία<select name="service">${SERVICES.map((s) => `<option ${a.service === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
      ${field("Όροφος", "floor", a.floor, 'placeholder="π.χ. 2ος"')}
      <label>Άνοιγμα φρεατίων
        <select name="manholes">
          ${["", "Ναι", "Όχι"].map((opt) => `<option value="${esc(opt)}" ${a.manholes === opt ? "selected" : ""}>${opt || "—"}</option>`).join("")}
        </select>
      </label>
      ${field("Κόστος αυτής της επίσκεψης", "cost", a.cost, 'placeholder="π.χ. 60€"')}
      <label>Σημειώσεις<textarea name="notes">${esc(a.notes || "")}</textarea></label>
      <div class="actions"><button class="solid" type="submit">Αποθήκευση</button></div>
    </form>`);
}

function notesSheet() {
  const items = state.notifications;
  openSheet(`<h2>Ειδοποιήσεις</h2>
    ${items.map((n) => `<article class="notice ${n.read ? "read" : ""}"><strong>${esc(n.title)}</strong><span class="sub">${esc(n.body)}</span></article>`).join("") || '<p class="empty">Δεν υπάρχουν ειδοποιήσεις.</p>'}
    ${items.length ? '<div class="actions"><button class="ghost" type="button" data-action="read-all">Σήμανση ως διαβασμένες</button></div>' : ""}`);
  state.notifications.forEach((n) => { n.read = true; });
  save();
  paintBadge();
}

function formData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => { data[key] = String(value).trim(); });
  return data;
}

document.getElementById("theme").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  save();
  applyTheme();
  render();
});
document.getElementById("bell").addEventListener("click", notesSheet);

document.body.addEventListener("click", (event) => {
  if (event.target.closest("a")) return;
  const target = event.target.closest("[data-view], [data-action]");
  if (!target) return;
  if (target.dataset.view) {
    view = target.dataset.view;
    closeSheet();
    render();
    return;
  }
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (action === "close") closeSheet();
  if (action === "appt") apptSheet(id);
  if (action === "customer") customerSheet(id);
  if (action === "new-customer") customerForm();
  if (action === "edit-customer") customerForm(customer(id));
  if (action === "new-appt") apptForm(null, id);
  if (action === "appt-for") apptForm(null, id);
  if (action === "edit-appt") apptForm(state.appointments.find((a) => a.id === id));
  if (action === "pick-day") { picked = target.dataset.date; render(); }
  if (action === "prev-month") { cal = new Date(cal.getFullYear(), cal.getMonth() - 1, 1); render(); }
  if (action === "next-month") { cal = new Date(cal.getFullYear(), cal.getMonth() + 1, 1); render(); }
  if (action === "toggle-theme") document.getElementById("theme").click();
  if (action === "read-all") { state.notifications.forEach((n) => { n.read = true; }); save(); notesSheet(); }
  if (action === "enable-push") enablePush();
  if (action === "done-appt") completeAppt(id);
  if (action === "cancel-appt") cancelAppt(id);
  if (action === "restore-appt") restoreAppt(id);
  if (action === "delete-customer") removeCustomer(id);
});

document.body.addEventListener("change", (event) => {
  if (event.target.name === "customerId" && event.target.form && event.target.form.id === "appt-form") {
    const slot = document.getElementById("appt-loc");
    if (slot) slot.outerHTML = apptLocation(customer(event.target.value));
  }
});

document.body.addEventListener("input", (event) => {
  if (event.target.id === "map-address") scheduleMapAddress();
  if (event.target.id === "maps-url") refreshMapFromLink();
});

let mapTimer;
function scheduleMapAddress() {
  clearTimeout(mapTimer);
  mapTimer = setTimeout(refreshMapAddress, 350);
}
function refreshMapAddress() {
  if (document.getElementById("map-lat")?.value) return;
  const address = document.getElementById("map-address")?.value.trim() || "";
  const frame = document.getElementById("map-frame");
  const open = document.getElementById("open-gmaps");
  if (frame && address) frame.src = embedSrc("", "", address);
  if (open) open.href = mapsLink(address);
}
function refreshMapFromLink() {
  const link = document.getElementById("maps-url");
  const frame = document.getElementById("map-frame");
  const open = document.getElementById("open-gmaps");
  const status = document.getElementById("map-status");
  const lat = document.getElementById("map-lat");
  const lng = document.getElementById("map-lng");
  if (!link || !lat || !lng) return;
  if (!link.value.trim()) {
    lat.value = "";
    lng.value = "";
    if (status) {
      status.textContent = "";
      status.className = "map-status";
    }
    refreshMapAddress();
    return;
  }
  const parsed = parseMapsUrl(link.value);
  if (parsed && parsed.lat) {
    lat.value = parsed.lat;
    lng.value = parsed.lng;
    if (frame) frame.src = embedSrc(parsed.lat, parsed.lng);
    if (open) open.href = mapsLink({ lat: parsed.lat, lng: parsed.lng });
    if (status) {
      status.textContent = "Το ακριβές σημείο κλειδώθηκε από το Google Maps.";
      status.className = "map-status ok";
    }
    return;
  }
  lat.value = "";
  lng.value = "";
  if (!status) return;
  status.className = "map-status bad";
  status.textContent = parsed && parsed.short
    ? "Αυτός είναι σύντομος σύνδεσμος. Άνοιξέ τον, πάτα ξανά Κοινοποίηση και αντέγραψε τον πλήρη."
    : "Ο σύνδεσμος δεν έχει ακριβές σημείο. Χρησιμοποίησε Κοινοποίηση από το Google Maps.";
}

viewEl.addEventListener("input", (event) => {
  if (event.target.id === "search") {
    query = event.target.value;
    const start = event.target.selectionStart;
    renderCustomers();
    const search = document.getElementById("search");
    if (search) {
      search.focus();
      search.setSelectionRange(start, start);
    }
  }
});

document.body.addEventListener("submit", (event) => {
  const form = event.target;
  if (form.id === "customer-form") {
    event.preventDefault();
    const data = formData(form);
    const existing = customer(form.dataset.id);
    const parsedPin = parseMapsUrl(data.mapsUrl);
    if (parsedPin && parsedPin.lat) {
      data.lat = parsedPin.lat;
      data.lng = parsedPin.lng;
    }
    if (!data.lat || !data.lng) {
      if (!existing || data.mapsUrl) {
        const status = document.getElementById("map-status");
        if (status) {
          status.textContent = parsedPin && parsedPin.short
            ? "Άνοιξε τον σύντομο σύνδεσμο και αντέγραψε τον πλήρη από το Google Maps."
            : "Πρώτα κλείδωσε το ακριβές σημείο από το Google Maps.";
          status.className = "map-status bad";
        }
        return;
      }
      data.lat = existing.lat || "";
      data.lng = existing.lng || "";
      data.mapsUrl = existing.mapsUrl || "";
    }
    if (existing) Object.assign(existing, data);
    else state.customers.unshift({ id: nextId("c", state.customers), ...data });
    save();
    closeSheet();
    view = "customers";
    render();
    pushNote("Πελατολόγιο", `Αποθηκεύτηκε ο πελάτης ${data.name}.`, false);
  }
  if (form.id === "appt-form") {
    event.preventDefault();
    const data = formData(form);
    const person = customer(data.customerId);
    if (!person) return;
    const parsed = parseMapsUrl(data.mapsUrl);
    if (parsed && parsed.lat) {
      person.lat = parsed.lat;
      person.lng = parsed.lng;
      person.mapsUrl = data.mapsUrl;
    }
    if ((!person.lat || !person.lng) && !form.dataset.id) {
      const status = document.getElementById("map-status");
      if (status) {
        status.textContent = parsed && parsed.short
          ? "Άνοιξε τον σύντομο σύνδεσμο και αντέγραψε τον πλήρη από το Google Maps."
          : "Κλείδωσε πρώτα το ακριβές σημείο από το Google Maps.";
        status.className = "map-status bad";
      }
      return;
    }
    if (person.lat && person.lng) {
      data.lat = person.lat;
      data.lng = person.lng;
    }
    delete data.mapsUrl;
    if (!data.cost && person) data.cost = person.cost;
    const existing = state.appointments.find((a) => a.id === form.dataset.id);
    if (existing) Object.assign(existing, data);
    else state.appointments.push({ id: nextId("a", state.appointments), status: "scheduled", log: [], ...data });
    picked = data.date;
    save();
    closeSheet();
    view = data.date === todayISO() ? "home" : "schedule";
    render();
    pushNote("Ραντεβού", `${data.time} · ${person ? person.name : "Πελάτης"} · ${longDate(data.date)}`, true);
  }
  if (form.id === "move-form") {
    event.preventDefault();
    const appt = state.appointments.find((a) => a.id === form.dataset.id);
    const next = formData(form).date;
    if (!appt || !next || next === appt.date) return;
    appt.log = appt.log || [];
    appt.log.push({ kind: "moved", from: appt.date, to: next });
    appt.date = next;
    appt.status = "scheduled";
    picked = next;
    save();
    closeSheet();
    view = next === todayISO() ? "home" : "schedule";
    render();
    const person = customer(appt.customerId);
    pushNote("Μεταφορά", `${person ? person.name : "Ραντεβού"} πήγε στις ${longDate(next)}.`, false);
  }
  if (form.id === "admin-form") {
    event.preventDefault();
    state.adminPhone = formData(form).adminPhone;
    save();
    render();
  }
});

function completeAppt(id) {
  const appt = state.appointments.find((a) => a.id === id);
  const person = appt && customer(appt.customerId);
  if (!appt || !person) return;
  appt.status = "done";
  appt.log = appt.log || [];
  appt.log.push({ kind: "done", date: appt.date });
  person.lastDate = appt.date;
  save();
  closeSheet();
  render();
  pushNote("Ολοκληρώθηκε", `${person.name}, ${appt.time}.`, true);
}
function cancelAppt(id) {
  const appt = state.appointments.find((a) => a.id === id);
  const person = appt && customer(appt.customerId);
  if (!appt) return;
  appt.status = "cancelled";
  appt.log = appt.log || [];
  appt.log.push({ kind: "cancelled", date: appt.date });
  save();
  closeSheet();
  view = "schedule";
  render();
  pushNote("Ακύρωση", `${person ? person.name : "Ραντεβού"} στις ${longDate(appt.date)} μπήκε στο ιστορικό.`, false);
}
function restoreAppt(id) {
  const appt = state.appointments.find((a) => a.id === id);
  if (!appt) return;
  appt.status = "scheduled";
  save();
  closeSheet();
  render();
}
function removeCustomer(id) {
  state.customers = state.customers.filter((c) => c.id !== id);
  state.appointments = state.appointments.filter((a) => a.customerId !== id);
  save();
  closeSheet();
  view = "customers";
  render();
}
async function enablePush() {
  if (!("Notification" in window)) {
    openSheet("<h2>Ειδοποιήσεις</h2><p class=\"note\">Αυτό το πρόγραμμα δεν δείχνει ειδοποιήσεις οθόνης.</p>");
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") phoneNotify("Νίκος Βλάχος", "Οι ειδοποιήσεις έρχονται και στο τηλέφωνο.");
  render();
}

applyTheme();
render();
dailyReminder();
