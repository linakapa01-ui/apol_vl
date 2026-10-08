const STATUS = {
  scheduled: { label: "Προγραμματισμένο", tone: "blue" },
  due: { label: "Περιμένει ενημέρωση", tone: "amber" },
  done: { label: "Ολοκληρώθηκε", tone: "green" },
  pending: { label: "Αναμένεται πληρωμή", tone: "orange" },
  postponed: { label: "Αναβλήθηκε", tone: "violet" },
  cancelled: { label: "Ακυρώθηκε", tone: "red" }
};
const PAY_METHODS = { cash: "Μετρητά", card: "Κάρτα" };
const CANCEL_REASONS = [
  { id: "weather", label: "Κακοκαιρία", by: "us" },
  { id: "customer-early", label: "Ο πελάτης ακύρωσε εγκαίρως", by: "customer", timing: "early" },
  { id: "customer-late", label: "Ο πελάτης ακύρωσε την τελευταία στιγμή", by: "customer", timing: "late" },
  { id: "no-show", label: "Δεν ήταν διαθέσιμος ή δεν εμφανίστηκε", by: "customer", timing: "noshow" },
  { id: "us", label: "Πρόβλημα δικό μου", by: "us" },
  { id: "other", label: "Άλλος λόγος", by: "other" }
];

function customer(id) { return state.customers.find((c) => c.id === id); }
function apptById(id) { return state.appointments.find((a) => a.id === id); }
function categories() { return state.settings.categories; }
function isActive(appt) { return !appt.status || appt.status === "scheduled"; }

function startsAt(appt) { return new Date(`${appt.date}T${appt.time || "00:00"}`); }
function endsAt(appt) { return new Date(startsAt(appt).getTime() + durationMinutes(appt.duration) * 60000); }
function isDue(appt) { return isActive(appt) && endsAt(appt) <= new Date(); }
function statusKey(appt) {
  if (isActive(appt)) return isDue(appt) ? "due" : "scheduled";
  return STATUS[appt.status] ? appt.status : "done";
}
function statusText(appt) {
  const key = statusKey(appt);
  if (key === "done") return appt.payMethod ? `Πληρώθηκε · ${PAY_METHODS[appt.payMethod]}` : "Ολοκληρώθηκε";
  return STATUS[key].label;
}
function statusTag(appt) {
  return `<span class="tag tone-${STATUS[statusKey(appt)].tone}">${esc(statusText(appt))}</span>`;
}

function apptsOn(date, activeOnly = true) {
  return state.appointments
    .filter((a) => a.date === date && (!activeOnly || isActive(a)))
    .sort((a, b) => a.time.localeCompare(b.time));
}
function amountOf(appt) {
  if (appt && appt.amount != null && appt.amount !== "") return Number(appt.amount) || 0;
  const person = appt && customer(appt.customerId);
  return sumEuros(appt && has(appt.cost) ? appt.cost : person && person.cost);
}
function floorPriceOf(appt, person) {
  const value = appt && has(appt.floorPrice) ? appt.floorPrice : person && person.floorPrice;
  return has(value) ? value : "";
}
function floorPriceText(appt, person) {
  const value = floorPriceOf(appt, person);
  if (!value) return "";
  return /[€a-zα-ω]/i.test(value) ? value : `${value}€`;
}

function flagsOf(person) {
  const scope = String(person.scope || "");
  return {
    building: person.isBuilding ?? /πολυκατοικ/i.test(scope),
    apartments: person.hasApts ?? (/διαμερ/i.test(scope) || has(person.apartments)),
    manholes: Boolean(person.manholes)
  };
}
function flagsHTML(person, manholesOverride) {
  const flags = flagsOf(person);
  if (manholesOverride !== undefined) flags.manholes = manholesOverride;
  const item = (on, label, name) => `<span class="flag${on ? " on" : ""}">${icon(on ? "check" : name)}${label}</span>`;
  return `<div class="flags">${item(flags.building, "Πολυκατοικία", "building")}${item(flags.apartments, "Διαμερίσματα", "door")}${item(flags.manholes, "Φρεάτια", "manhole")}</div>`;
}

function customerCategories(person) {
  const set = new Set(person.categories || []);
  state.appointments.forEach((a) => { if (a.customerId === person.id && a.service) set.add(a.service); });
  if (!set.size && has(person.pest)) {
    const text = fold(person.pest);
    if (text.includes("κουνουπ")) set.add("Κουνούπια");
    else if (text.includes("μυρμηγ")) set.add("Μυρμήγκια");
    else if (/ποντικ|μυοκτ|τρωκτ/.test(text)) set.add("Μυοκτονία");
  }
  return [...set];
}

function ratingOf(person) {
  const own = state.appointments.filter((a) => a.customerId === person.id);
  const stats = { early: 0, late: 0, noshow: 0, visits: own.filter((a) => a.status === "done" || a.status === "pending").length };
  own.filter((a) => a.status === "cancelled" && a.cancel && a.cancel.by === "customer").forEach((a) => { stats[a.cancel.timing || "late"] += 1; });
  const finished = own.filter((a) => !isActive(a)).length;
  if (!finished) return { ...stats, score: null, stars: 0, label: "Νέος", tone: "blue", key: "new" };
  const score = Math.max(0, 100 - stats.early * 5 - stats.late * 20 - stats.noshow * 35);
  const key = score >= 80 ? "good" : score >= 55 ? "ok" : "bad";
  const label = { good: "Καλός πελάτης", ok: "Μέτριος πελάτης", bad: "Κακός πελάτης" }[key];
  const tone = { good: "green", ok: "amber", bad: "red" }[key];
  return { ...stats, score, stars: Math.round(score / 20), label, tone, key };
}
function ratingBadge(person, withLabel = true) {
  const r = ratingOf(person);
  const text = r.score == null ? "Νέος" : `${r.score}`;
  return `<span class="rating tone-${r.tone}" title="${esc(r.label)}">${icon("star")}<b>${text}</b>${withLabel && r.score != null ? `<i>${esc(r.label.replace(" πελάτης", ""))}</i>` : ""}</span>`;
}
function starsHTML(count) {
  return `<span class="stars" aria-label="${count} από 5">${[1, 2, 3, 4, 5].map((i) => `<svg class="ico star${i <= count ? " on" : ""}" viewBox="0 0 24 24">${ICONS.star}</svg>`).join("")}</span>`;
}

function pendingPayments() {
  return state.appointments.filter((a) => a.status === "pending").sort((a, b) => a.date.localeCompare(b.date));
}
function dueAppointments() {
  return state.appointments.filter(isDue).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
function dueRepeats() {
  const today = todayISO();
  const horizon = addDays(today, 14);
  const out = [];
  state.customers.forEach((person) => {
    const finished = state.appointments
      .filter((a) => a.customerId === person.id && a.repeat && (a.status === "done" || a.status === "pending"))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0];
    if (!finished) return;
    const next = addInterval(finished.date, finished.repeat);
    const hasFuture = state.appointments.some((a) => a.customerId === person.id && isActive(a) && a.date >= finished.date);
    if (!hasFuture && next <= horizon) out.push({ person, from: finished, next });
  });
  return out.sort((a, b) => a.next.localeCompare(b.next));
}
function nextVisit(person) {
  return state.appointments
    .filter((a) => a.customerId === person.id && isActive(a))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
}

function pushLog(appt, kind, extra = {}) {
  appt.log = appt.log || [];
  appt.log.push({ kind, at: new Date().toISOString(), ...extra });
}

function finishPaid(id, method, amount) {
  const appt = apptById(id);
  const person = appt && customer(appt.customerId);
  if (!appt) return;
  appt.status = "done";
  appt.payMethod = method;
  appt.amount = Number(amount) || amountOf(appt);
  appt.paidAt = new Date().toISOString();
  appt.doneAt = appt.doneAt || appt.paidAt;
  pushLog(appt, "done", { method });
  if (person) person.lastDate = appt.date;
  save();
  pushNote("Ολοκληρώθηκε", `${person ? person.name : "Ραντεβού"}, ${appt.time}. Πληρώθηκε ${euro(appt.amount)}.`, true);
}
function finishPending(id, amount, note) {
  const appt = apptById(id);
  const person = appt && customer(appt.customerId);
  if (!appt) return;
  appt.status = "pending";
  appt.amount = Number(amount) || amountOf(appt);
  appt.payNote = note || "";
  appt.payMethod = "";
  appt.doneAt = new Date().toISOString();
  pushLog(appt, "pending");
  if (person) person.lastDate = appt.date;
  save();
  pushNote("Αναμένεται πληρωμή", `${person ? person.name : "Ραντεβού"}: ${euro(appt.amount)}.`, true);
}
function markPaid(id, method) {
  const appt = apptById(id);
  if (!appt) return;
  appt.status = "done";
  appt.payMethod = method;
  appt.paidAt = new Date().toISOString();
  pushLog(appt, "paid", { method });
  save();
  const who = customer(appt.customerId);
  pushNote("Πληρώθηκε", `${who ? who.name : "Ραντεβού"}: ${euro(amountOf(appt))}.`, true);
}
function postponeAppt(id, date, time, reason) {
  const appt = apptById(id);
  if (!appt) return null;
  appt.status = "postponed";
  appt.postponedTo = date;
  appt.postponeReason = reason || "";
  pushLog(appt, "postponed", { to: date });
  const copy = {
    ...appt,
    id: uid("a"),
    date,
    time: time || appt.time,
    status: "scheduled",
    log: [{ kind: "created", at: new Date().toISOString(), from: appt.id }],
    postponedTo: "",
    postponeReason: "",
    promptedAt: "",
    amount: "",
    payMethod: "",
    paidAt: "",
    doneAt: "",
    cancel: null,
    postponedFrom: appt.id
  };
  delete copy._u;
  delete copy._h;
  state.appointments.push(copy);
  save();
  const who = customer(appt.customerId);
  pushNote("Αναβολή", `${who ? who.name : "Ραντεβού"} πήγε στις ${longDate(date)}.`, false);
  return copy;
}
function cancelAppt(id, reasonId, text) {
  const appt = apptById(id);
  if (!appt) return;
  const reason = CANCEL_REASONS.find((r) => r.id === reasonId) || CANCEL_REASONS[CANCEL_REASONS.length - 1];
  appt.status = "cancelled";
  appt.cancel = { reason: reason.id, label: reason.label, by: reason.by, timing: reason.timing || "", text: text || "", at: new Date().toISOString() };
  pushLog(appt, "cancelled", { reason: reason.id });
  save();
  const who = customer(appt.customerId);
  pushNote("Ακύρωση", `${who ? who.name : "Ραντεβού"} στις ${longDate(appt.date)}: ${reason.label}.`, false);
}
function restoreAppt(id) {
  const appt = apptById(id);
  if (!appt) return;
  appt.status = "scheduled";
  appt.cancel = null;
  appt.promptedAt = "";
  pushLog(appt, "restored");
  save();
}
function removeCustomer(id) {
  state.customers = state.customers.filter((c) => c.id !== id);
  state.appointments = state.appointments.filter((a) => a.customerId !== id);
  save();
}

function pushNote(title, body, alsoPhone, apptId) {
  state.notifications.unshift({ id: uid("n"), title, body, apptId: apptId || "", at: new Date().toISOString(), read: false });
  state.notifications = state.notifications.slice(0, 60);
  persist();
  paintBadge();
  if (alsoPhone) phoneNotify(title, body);
}
async function phoneNotify(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options = { body, icon: "assets/icon-192.png", badge: "assets/icon-192.png", lang: "el" };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg && reg.showNotification) {
      await reg.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch { /* notifications not available here */ }
}
function dailyReminder() {
  const today = todayISO();
  if (state.notifiedOn === today) return;
  const list = apptsOn(today);
  if (!list.length) return;
  state.notifiedOn = today;
  const first = list[0];
  const person = customer(first.customerId);
  persist();
  pushNote("Σήμερα", `${list.length} ραντεβού. Πρώτο στις ${first.time}${person ? `, ${person.name}` : ""}.`, true);
}
function checkOutcomes() {
  const fresh = dueAppointments().filter((a) => !a.promptedAt);
  if (!fresh.length) return;
  fresh.forEach((appt) => {
    const person = customer(appt.customerId);
    appt.promptedAt = new Date().toISOString();
    pushNote("Πώς πήγε;", `${appt.time} · ${person ? person.name : "Ραντεβού"}. Πάτα για να ολοκληρώσεις ή να ακυρώσεις.`, true, appt.id);
  });
  save();
}
function unread() { return state.notifications.filter((n) => !n.read).length; }

function occupiesTime(a) {
  return a.status !== "cancelled" && a.status !== "postponed" && Boolean(customer(a.customerId));
}
function dayAgenda(date, excludeId = "") {
  return state.appointments
    .filter((a) => a.date === date && a.id !== excludeId && occupiesTime(a))
    .sort((a, b) => a.time.localeCompare(b.time));
}
function minutesOf(time) {
  const [h, m] = String(time || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function overlaps(time, duration, other) {
  const start = minutesOf(time);
  const end = start + durationMinutes(duration);
  const oStart = minutesOf(other.time);
  const oEnd = oStart + durationMinutes(other.duration);
  return start < oEnd && oStart < end;
}
function findClash(date, time, duration, excludeId = "") {
  if (!date || !time) return null;
  return dayAgenda(date, excludeId).find((a) => overlaps(time, duration, a)) || null;
}
function clashText(clash) {
  const person = customer(clash.customerId);
  return `Έχεις ήδη ραντεβού στις ${clash.time}${person ? ` με ${person.name}` : ""}.`;
}

function workWindow() {
  const s = state.settings;
  const start = minutesOf(s.workStart || "08:00");
  const end = minutesOf(s.workEnd || "21:00");
  return end > start ? [start, end] : [8 * 60, 21 * 60];
}
function clock(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
function freeRanges(date, minLength = 30) {
  const today = todayISO();
  if (date < today) return [];
  let [from, to] = workWindow();
  if (date === today) {
    const now = new Date();
    from = Math.max(from, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15);
  }
  const busy = dayAgenda(date)
    .map((a) => [minutesOf(a.time), minutesOf(a.time) + durationMinutes(a.duration)])
    .sort((a, b) => a[0] - b[0]);
  const out = [];
  let cursor = from;
  busy.forEach(([start, end]) => {
    if (start - cursor >= minLength) out.push([cursor, Math.min(start, to)]);
    cursor = Math.max(cursor, end);
  });
  if (to - cursor >= minLength) out.push([cursor, to]);
  return out.filter(([a, b]) => b - a >= minLength);
}
