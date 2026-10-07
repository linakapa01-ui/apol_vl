const viewEl = document.getElementById("view");
const sheetEl = document.getElementById("sheet");
const sheetBody = document.getElementById("sheet-body");
const badgeEl = document.getElementById("badge");

let view = "home";
let query = "";
let cal = startOfMonth(new Date());
let picked = todayISO();
let weekStart = mondayOf(todayISO());
let custFilter = { cat: "", rating: "" };
let renderLater = false;

const NAV = [
  { id: "home", label: "Αρχική", icon: "home" },
  { id: "week", label: "Εβδομάδα", icon: "week" },
  { id: "customers", label: "Πελάτες", icon: "users" },
  { id: "dashboard", label: "Στατιστικά", icon: "chart" },
  { id: "schedule", label: "Πρόγραμμα", icon: "list", secondary: true },
  { id: "calendar", label: "Ημερολόγιο", icon: "cal", secondary: true },
  { id: "messages", label: "Μηνύματα", icon: "msg", secondary: true },
  { id: "profile", label: "Προφίλ", icon: "user", secondary: true }
];

function buildNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = NAV.map((item) => `<button type="button" data-view="${item.id}"${item.secondary ? ' class="secondary"' : ""}>${icon(item.icon)}<span>${item.label}</span></button>`).join("")
    + `<button type="button" class="more-btn" data-action="more">${icon("more")}<span>Ακόμα</span></button>`;
}
function moreSheet() {
  openSheet(`<h2>Ακόμα</h2><div class="more-grid">${NAV.filter((n) => n.secondary).map((item) => `<button type="button" class="more-item" data-view="${item.id}">${icon(item.icon)}<span>${item.label}</span></button>`).join("")}</div>`);
}

function paintBadge() {
  const n = unread();
  badgeEl.hidden = n === 0;
  badgeEl.textContent = String(n);
}
function paintBrand() {
  const logo = state.settings.logo || "assets/logo.png";
  document.querySelectorAll("[data-brand-logo]").forEach((img) => { img.src = logo; });
  document.getElementById("brand-name").textContent = state.settings.businessName.toLocaleUpperCase("el-GR");
  document.title = state.settings.businessName;
}
function paintSync() {
  const dot = document.getElementById("sync-dot");
  if (!dot) return;
  const map = {
    off: ["off", "Τοπική αποθήκευση"],
    syncing: ["busy", "Συγχρονισμός"],
    ok: ["ok", "Συγχρονισμένο"],
    error: ["bad", "Σφάλμα συγχρονισμού"],
    offline: ["bad", "Χωρίς σύνδεση"]
  };
  const [cls, text] = map[sync.status] || map.off;
  dot.className = `sync-dot ${cls}`;
  dot.title = text;
  dot.setAttribute("aria-label", text);
  dot.hidden = !syncConfigured();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = state.theme === "light" ? "#f3f0e8" : "#070807";
  document.getElementById("theme-icon").innerHTML = state.theme === "dark"
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
    : '<path d="M16 13.2A6.2 6.2 0 0 1 10.8 8 6.4 6.4 0 1 0 16 13.2Z"/>';
}

function openSheet(html, cls = "") {
  sheetBody.className = `sheet-card ${cls}`.trim();
  sheetBody.innerHTML = `<button class="sheet-close" type="button" data-action="close" aria-label="Κλείσιμο">${icon("x")}</button>${html}`;
  sheetEl.hidden = false;
  sheetBody.scrollTop = 0;
  document.body.classList.add("sheet-open");
}
function closeSheet() {
  sheetEl.hidden = true;
  sheetBody.innerHTML = "";
  document.body.classList.remove("sheet-open");
  if (renderLater) {
    renderLater = false;
    render();
  }
}

function cardHTML(appt, opts = {}) {
  const person = customer(appt.customerId);
  if (!person) return "";
  const key = statusKey(appt);
  const fp = floorPriceText(appt, person);
  const dur = durationShort(appt.duration);
  const money = amountOf(appt);
  const chips = [
    appt.service ? `<span class="chip">${esc(appt.service)}</span>` : "",
    has(appt.floor) ? `<span class="chip">Όροφος ${esc(appt.floor)}</span>` : "",
    fp ? `<span class="chip money">${esc(fp)} ανά όροφο</span>` : ""
  ].join("");
  return `<article class="card st-${STATUS[key].tone}">
    <div class="card-body" data-action="appt" data-id="${esc(appt.id)}">
      <div class="time"><span class="time-label">${icon("clock")}${esc(appt.time)}${opts.date ? ` · ${esc(shortDate(appt.date))}` : ""}</span>${statusTag(appt)}</div>
      <h3>${esc(person.name)}</h3>
      <a class="meta map" href="${esc(mapsLink(placeTarget(appt, person)))}" target="_blank" rel="noopener noreferrer">${icon("pin")}<span>${esc(person.address)}</span></a>
      ${chips ? `<div class="chips">${chips}</div>` : ""}
      ${key === "due" ? `<button class="solid small" type="button" data-action="outcome" data-id="${esc(appt.id)}">Πώς πήγε; Ενημέρωση</button>` : ""}
      ${key === "pending" ? `<button class="solid small orange" type="button" data-action="outcome" data-id="${esc(appt.id)}">Πληρώθηκε</button>` : ""}
    </div>
    ${dur || money ? `<div class="side" data-action="appt" data-id="${esc(appt.id)}">
      ${dur ? `<span class="mini"><small>Χρόνος</small>${esc(dur)}</span>` : ""}
      ${money ? `<span class="mini"><small>Κόστος</small>${esc(euro(money))}</span>` : ""}
    </div>` : ""}
  </article>`;
}
function placeTarget(appt, person) {
  if (appt && appt.lat && appt.lng) return appt;
  return person;
}
function emptyBox(text) { return `<p class="empty">${text}</p>`; }

function kpi(label, value, tone, sub = "", action = "") {
  const attrs = action ? ` data-action="${action}" role="button" tabindex="0"` : "";
  return `<div class="kpi tone-${tone}${action ? " click" : ""}"${attrs}><small>${label}</small><b>${value}</b>${sub ? `<span>${sub}</span>` : ""}</div>`;
}
function sumRevenue(list) {
  return list.filter((a) => a.status === "done").reduce((t, a) => t + amountOf(a), 0);
}
function pendingBox() {
  const list = pendingPayments();
  if (!list.length) return "";
  const total = list.reduce((t, a) => t + amountOf(a), 0);
  return `<section class="pending-box">
    <div class="pending-head"><span>${icon("hourglass")}Αναμένονται πληρωμές</span><b>${esc(euro(total))}</b></div>
    <div class="pending-list">${list.map((a) => {
      const person = customer(a.customerId);
      return `<div class="pending-row">
        <div data-action="appt" data-id="${esc(a.id)}" class="pending-info"><strong>${esc(person ? person.name : "Πελάτης")}</strong>
          <span>${esc(longDate(a.date))}${a.service ? ` · ${esc(a.service)}` : ""}${has(a.payNote) ? ` · ${esc(a.payNote)}` : ""}</span></div>
        <b>${esc(euro(amountOf(a)))}</b>
        <button class="solid small orange" type="button" data-action="outcome" data-id="${esc(a.id)}">Πληρώθηκε</button>
      </div>`;
    }).join("")}</div>
  </section>`;
}
function dueBox() {
  const list = dueAppointments();
  if (!list.length) return "";
  return `<section class="due-box"><h2 class="section-label">ΧΡΕΙΑΖΕΤΑΙ ΕΝΗΜΕΡΩΣΗ</h2>
    <p class="note">Πέρασε η ώρα τους. Πες μου πώς πήγαν για να κλείσουν.</p>
    <div class="stack">${list.map((a) => cardHTML(a, { date: true })).join("")}</div></section>`;
}
function repeatsBox() {
  const list = dueRepeats();
  if (!list.length) return "";
  return `<section><h2 class="section-label">ΕΤΟΙΜΕΣ ΕΠΑΝΑΛΗΨΕΙΣ</h2>
    <div class="stack">${list.map(({ person, from, next }) => `<article class="card st-teal">
      <div class="card-body">
        <div class="time"><span class="time-label">${icon("repeat")}${esc(shortDate(next))}</span><span class="tag tone-teal">${esc((REPEATS.find((r) => r[0] === from.repeat) || [])[1] || "Επανάληψη")}</span></div>
        <h3>${esc(person.name)}</h3>
        <p class="sub">Τελευταία φορά ${esc(longDate(from.date))} στις ${esc(from.time)}</p>
        <div class="actions tight"><button class="solid small" type="button" data-action="repeat-appt" data-id="${esc(from.id)}">Ετοίμασε το ραντεβού</button></div>
      </div></article>`).join("")}</div></section>`;
}

function renderHome() {
  const today = todayISO();
  const list = apptsOn(today, false).filter((a) => a.status !== "postponed" && !isDue(a));
  const weekEnd = addDays(mondayOf(today), 6);
  const weekList = state.appointments.filter((a) => isActive(a) && a.date >= mondayOf(today) && a.date <= weekEnd);
  const monthKey = today.slice(0, 7);
  const monthRevenue = sumRevenue(state.appointments.filter((a) => a.date.startsWith(monthKey)));
  const pending = pendingPayments();
  const pendingTotal = pending.reduce((t, a) => t + amountOf(a), 0);
  const todayActive = apptsOn(today).length;
  viewEl.innerHTML = `<section class="hello">
      <h2>${greeting()}, Νίκο!</h2>
      <p>${todayActive ? `Σήμερα έχεις ${todayActive} ${todayActive === 1 ? "ραντεβού" : "ραντεβού"}.` : "Δεν έχεις ραντεβού που να περιμένουν σήμερα."}</p>
    </section>
    <div class="kpis">
      ${kpi("Σήμερα", todayActive, "blue", longDate(today))}
      ${kpi("Αυτή την εβδομάδα", weekList.length, "teal", "ραντεβού", "go-week")}
      ${kpi("Έσοδα μήνα", esc(euro(monthRevenue)), "green", MONTHS[new Date().getMonth()], "go-dashboard")}
      ${kpi("Εκκρεμείς πληρωμές", esc(euro(pendingTotal)), pending.length ? "orange" : "green", pending.length ? `${pending.length} ${pending.length === 1 ? "πελάτης" : "πελάτες"}` : "Όλα εισπράχθηκαν")}
    </div>
    <div class="actions quick">
      <button class="solid" type="button" data-action="new-appt">${icon("plus")}Νέο ραντεβού</button>
      <button class="ghost" type="button" data-action="new-customer">${icon("plus")}Νέος πελάτης</button>
      <button class="ghost" type="button" data-view="messages">${icon("msg")}Μήνυμα</button>
    </div>
    ${dueBox()}
    <h2 class="section-label">ΣΗΜΕΡΙΝΟ ΠΡΟΓΡΑΜΜΑ</h2>
    <div class="stack">${list.map((a) => cardHTML(a)).join("") || emptyBox(dueAppointments().some((a) => a.date === today) ? "Τα υπόλοιπα ραντεβού της ημέρας είναι παραπάνω, περιμένουν ενημέρωση." : "Δεν υπάρχει ραντεβού για σήμερα.")}</div>
    ${pendingBox()}
    ${repeatsBox()}`;
}

function renderWeek() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = todayISO();
  const active = state.appointments.filter((a) => isActive(a) && a.date >= days[0] && a.date <= days[6]);
  const expected = active.reduce((t, a) => t + amountOf(a), 0);
  const first = parseISO(days[0]);
  const last = parseISO(days[6]);
  const range = first.getMonth() === last.getMonth()
    ? `${first.getDate()}–${last.getDate()} ${MONTHS_GEN[last.getMonth()]}`
    : `${first.getDate()} ${MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}`;
  const thisWeek = weekStart === mondayOf(today);
  const rows = days.map((date, i) => {
    const list = state.appointments.filter((a) => a.date === date && a.status !== "postponed").sort((a, b) => a.time.localeCompare(b.time));
    const activeList = list.filter(isActive);
    const dayTotal = activeList.reduce((t, a) => t + amountOf(a), 0);
    const open = date === today || (!thisWeek && list.length > 0) || (thisWeek && list.length > 0);
    return `<details class="day-acc${date === today ? " today" : ""}"${open ? " open" : ""}>
      <summary><span class="day-name"><b>${WEEKDAYS[i]}</b><i>${esc(shortDate(date))}</i></span>
        <span class="day-meta">${list.length ? `<span class="tag tone-blue">${activeList.length} ${activeList.length === 1 ? "ραντεβού" : "ραντεβού"}</span>` : `<span class="muted-tag">Ελεύθερη μέρα</span>`}${dayTotal ? `<span class="day-sum">${esc(euro(dayTotal))}</span>` : ""}</span></summary>
      <div class="day-body">${list.map(weekRow).join("") || '<p class="empty small">Κανένα ραντεβού.</p>'}
        <button class="text-btn add-day" type="button" data-action="new-appt-day" data-date="${date}">${icon("plus")}Προσθήκη ραντεβού</button></div>
    </details>`;
  }).join("");
  viewEl.innerHTML = `<div class="week-bar">
      <button class="icon-btn" type="button" data-action="week-prev" aria-label="Προηγούμενη εβδομάδα">${icon("chevL")}</button>
      <div class="week-title"><strong>${esc(range)}</strong><span>${thisWeek ? "Αυτή η εβδομάδα" : `Εβδομάδα ${esc(longDate(days[0]))}`}</span></div>
      <button class="icon-btn" type="button" data-action="week-next" aria-label="Επόμενη εβδομάδα">${icon("chevR")}</button>
    </div>
    <div class="kpis small">
      ${kpi("Ραντεβού", active.length, "blue")}
      ${kpi("Αναμενόμενα έσοδα", esc(euro(expected)), "green")}
      ${thisWeek ? "" : `<button class="ghost" type="button" data-action="week-today">Πίσω στη σημερινή</button>`}
    </div>
    <div class="week-list">${rows}</div>`;
}
function weekRow(appt) {
  const person = customer(appt.customerId);
  if (!person) return "";
  const fp = floorPriceText(appt, person);
  const manholes = has(appt.manholes) ? appt.manholes === "Ναι" : flagsOf(person).manholes;
  const money = amountOf(appt);
  return `<div class="week-row st-${STATUS[statusKey(appt)].tone}" data-action="appt" data-id="${esc(appt.id)}">
    <div class="week-time">${esc(appt.time)}</div>
    <div class="week-main">
      <strong>${esc(person.name)}</strong>
      <span class="sub">${esc(areaOf(person.address) || person.address)}${appt.service ? ` · ${esc(appt.service)}` : ""}${has(appt.floor) ? ` · Όροφος ${esc(appt.floor)}` : ""}</span>
      <div class="chips">${fp ? `<span class="chip money">${esc(fp)} ανά όροφο</span>` : ""}${flagsHTML(person, manholes)}</div>
    </div>
    <div class="week-side">${money ? `<b>${esc(euro(money))}</b>` : ""}${statusTag(appt)}</div>
  </div>`;
}

function renderSchedule() {
  const dates = [...new Set(state.appointments.filter(isActive).map((a) => a.date))].sort();
  const blocks = dates.map((date) => `<section class="day-block"><h3>${esc(longDate(date))}</h3><div class="stack">${apptsOn(date).map((a) => cardHTML(a)).join("")}</div></section>`).join("");
  const history = state.appointments
    .filter((a) => !isActive(a))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  viewEl.innerHTML = `<div class="row"><h2 class="section-label">ΟΛΟ ΤΟ ΠΡΟΓΡΑΜΜΑ</h2><button class="solid small" type="button" data-action="new-appt">${icon("plus")}Νέο ραντεβού</button></div>
    ${blocks || emptyBox("Το πρόγραμμα είναι άδειο.")}
    <h2 class="section-label">ΙΣΤΟΡΙΚΟ</h2>
    <div class="stack">${history.map((a) => cardHTML(a, { date: true })).join("") || emptyBox("Οι ακυρωμένες και οι ολοκληρωμένες επισκέψεις φαίνονται εδώ.")}</div>`;
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
    const count = apptsOn(date).length;
    const cls = ["day", count ? "on" : "", date === today ? "today" : "", date === picked ? "picked" : ""].filter(Boolean).join(" ");
    cells += `<button class="${cls}" type="button" data-action="pick-day" data-date="${date}">${day}${count ? `<i>${count}</i>` : ""}</button>`;
  }
  const pickedList = state.appointments.filter((a) => a.date === picked && a.status !== "postponed").sort((a, b) => a.time.localeCompare(b.time));
  viewEl.innerHTML = `<div class="cal-wrap"><div class="panel cal-panel">
      <div class="month-switch">
        <button class="icon-btn" type="button" data-action="prev-month" aria-label="Προηγούμενος μήνας">${icon("chevL")}</button>
        <strong>${MONTHS[month]} ${year}</strong>
        <button class="icon-btn" type="button" data-action="next-month" aria-label="Επόμενος μήνας">${icon("chevR")}</button>
      </div>
      <div class="cal-head">${WEEK.map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="cal-grid">${cells}</div>
    </div>
    <div class="cal-day"><div class="row"><h2 class="section-label">${esc(longDate(picked))}</h2><button class="solid small" type="button" data-action="new-appt-day" data-date="${picked}">${icon("plus")}Νέο</button></div>
    <div class="stack">${pickedList.map((a) => cardHTML(a)).join("") || emptyBox("Καμία επίσκεψη αυτή την ημέρα.")}</div></div></div>`;
}

function customerFilterChips() {
  const chip = (action, value, label, active) => `<button type="button" class="fchip${active ? " on" : ""}" data-action="${action}" data-v="${esc(value)}">${esc(label)}</button>`;
  const cats = categories();
  const ratings = [["good", "Καλός"], ["ok", "Μέτριος"], ["bad", "Κακός"], ["new", "Νέος"]];
  return `<div class="filters">
    <div class="fgroup"><span>Κατηγορία</span><div class="fchips">${chip("filter-cat", "", "Όλες", !custFilter.cat)}${cats.map((c) => chip("filter-cat", c, c, custFilter.cat === c)).join("")}</div></div>
    <div class="fgroup"><span>Πελάτης</span><div class="fchips">${chip("filter-rating", "", "Όλοι", !custFilter.rating)}${ratings.map(([k, l]) => chip("filter-rating", k, l, custFilter.rating === k)).join("")}</div></div>
  </div>`;
}
function filteredCustomers() {
  return state.customers.filter((c) => {
    if (!matchesText(`${c.name} ${c.address} ${c.phone} ${c.phone2 || ""} ${c.pest || ""}`, query)) return false;
    if (custFilter.cat && !customerCategories(c).includes(custFilter.cat)) return false;
    if (custFilter.rating && ratingOf(c).key !== custFilter.rating) return false;
    return true;
  });
}
function customerCard(c) {
  const call = phoneLink(c.phone);
  const cats = customerCategories(c);
  const fp = floorPriceText(null, c);
  return `<article class="card person">
    <div class="card-body" data-action="customer" data-id="${esc(c.id)}">
      <div class="time"><h3>${esc(c.name)}</h3>${ratingBadge(c, false)}</div>
      <a class="meta map" href="${esc(mapsLink(c))}" target="_blank" rel="noopener noreferrer">${icon("pin")}<span>${esc(c.address)}</span></a>
      ${call ? `<a class="meta phone" href="${esc(call)}">${icon("phone")}<span>${esc(c.phone)}</span></a>` : ""}
      ${flagsHTML(c)}
      <div class="chips">${cats.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}${fp ? `<span class="chip money">${esc(fp)} ανά όροφο</span>` : ""}</div>
    </div>
  </article>`;
}
function customerResults() {
  const list = filteredCustomers();
  return `<p class="count">${list.length} ${list.length === 1 ? "πελάτης" : "πελάτες"}${list.length !== state.customers.length ? ` από ${state.customers.length}` : ""}</p>
    <div class="stack">${list.map(customerCard).join("") || emptyBox("Δεν βρέθηκε πελάτης με αυτά τα φίλτρα.")}</div>`;
}
function renderCustomers() {
  viewEl.innerHTML = `<div class="row"><h2 class="section-label">ΠΕΛΑΤΟΛΟΓΙΟ</h2><button class="solid small" type="button" data-action="new-customer">${icon("plus")}Νέος πελάτης</button></div>
    <input class="search" id="search" type="search" placeholder="Αναζήτηση ονόματος, περιοχής, τηλεφώνου" value="${esc(query)}" autocomplete="off">
    <div id="cust-filters">${customerFilterChips()}</div>
    <div id="cust-results">${customerResults()}</div>`;
}
function refreshCustomerList() {
  const box = document.getElementById("cust-results");
  const filters = document.getElementById("cust-filters");
  if (box) box.innerHTML = customerResults();
  if (filters) filters.innerHTML = customerFilterChips();
}

function syncPanel() {
  const code = getSync().code || "";
  if (!syncConfigured()) {
    return `<article class="panel">
      <strong>Κοινά δεδομένα για όλους</strong>
      <p class="note">Τώρα τα δεδομένα μένουν μόνο σε αυτή τη συσκευή. Για να τα βλέπουν όλοι όσοι έχουν το λινκ, χρειάζεται μια δωρεάν βάση δεδομένων. Οι οδηγίες είναι στο αρχείο <b>SETUP_SHARED.md</b>.</p>
    </article>`;
  }
  const labels = { off: "Δεν έχει συνδεθεί", syncing: "Γίνεται συγχρονισμός…", ok: `Συγχρονισμένο${sync.at ? ` · ${new Date(sync.at).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}` : ""}`, error: "Σφάλμα συγχρονισμού", offline: "Χωρίς σύνδεση" };
  if (syncEnabled()) {
    return `<article class="panel">
      <strong>Κοινά δεδομένα για όλους</strong>
      <p class="sync-state ${sync.status}"><span class="sync-dot ${sync.status === "ok" ? "ok" : sync.status === "syncing" ? "busy" : "bad"}"></span>${labels[sync.status] || labels.off}</p>
      ${sync.error ? `<p class="map-status bad">${esc(sync.error)}</p>` : ""}
      <p class="note">Όποιος βάλει τον ίδιο κωδικό ομάδας βλέπει και αλλάζει τα ίδια δεδομένα.</p>
      <label class="code-row">Κωδικός ομάδας<input readonly value="${esc(code)}" id="sync-code-show"></label>
      <div class="actions"><button class="ghost" type="button" data-action="sync-now">Συγχρονισμός τώρα</button><button class="text-btn danger" type="button" data-action="sync-off">Αποσύνδεση</button></div>
    </article>`;
  }
  return `<form class="panel form" id="sync-form">
    <strong>Κοινά δεδομένα για όλους</strong>
    <p class="note">Βάλε τον ίδιο κωδικό ομάδας (τουλάχιστον 12 χαρακτήρες) σε κάθε συσκευή που θέλεις να βλέπει τα ίδια δεδομένα. Για την πρώτη συσκευή φτιάξε έναν νέο.</p>
    <label>Κωδικός ομάδας<input name="code" id="sync-code" minlength="12" autocomplete="off" required placeholder="π.χ. vlachos-2026-xxxxxx"></label>
    <div class="actions"><button class="solid" type="submit">Σύνδεση</button><button class="ghost" type="button" data-action="gen-code">Φτιάξε κωδικό</button></div>
  </form>`;
}

function renderProfile() {
  const s = state.settings;
  const granted = "Notification" in window && Notification.permission === "granted";
  const base = new Set(DEFAULT_CATEGORIES);
  viewEl.innerHTML = `<div class="profile-grid">
    <article class="panel profile-card">
      <img src="${esc(s.logo || "assets/logo.png")}" alt="Λογότυπο" data-brand-logo>
      <h2>${esc(s.businessName)}</h2>
      <p class="sub">Απεντόμωση · Μυοκτονία · Απολύμανση</p>
      <div class="actions center"><label class="ghost file-btn">Αλλαγή λογοτύπου<input type="file" id="logo-file" accept="image/*" hidden></label>${s.logo ? '<button class="text-btn danger" type="button" data-action="logo-reset">Αρχικό λογότυπο</button>' : ""}</div>
    </article>
    <form class="panel form" id="profile-form">
      <strong>Στοιχεία</strong>
      <label>Όνομα επιχείρησης<input name="businessName" value="${esc(s.businessName)}" required></label>
      <label>Τηλέφωνο διαχειριστή<input name="adminPhone" inputmode="tel" value="${esc(s.adminPhone)}" placeholder="Το κινητό σου"></label>
      <button class="solid" type="submit">Αποθήκευση</button>
    </form>
    <article class="panel">
      <strong>Κατηγορίες εργασίας</strong>
      <p class="note">Αυτές εμφανίζονται στα ραντεβού, στους πελάτες και στα φίλτρα.</p>
      <div class="chips cat-edit">${categories().map((c) => `<span class="chip">${esc(c)}${base.has(c) ? "" : `<button type="button" class="chip-x" data-action="cat-remove" data-v="${esc(c)}" aria-label="Διαγραφή ${esc(c)}">${icon("x")}</button>`}</span>`).join("")}</div>
      <form class="inline-form" id="cat-form"><input name="name" placeholder="Νέα κατηγορία, π.χ. Ψύλλοι" required maxlength="40"><button class="solid" type="submit">${icon("plus")}Προσθήκη</button></form>
    </article>
    ${syncPanel()}
    <article class="panel">
      <button class="switch" type="button" data-action="toggle-theme">
        <span><strong>Εμφάνιση</strong><br><span class="sub">${state.theme === "dark" ? "Σκοτεινή" : "Φωτεινή"}</span></span>
        <span class="tag tone-blue">${state.theme === "dark" ? "Dark" : "Light"}</span>
      </button>
    </article>
    <article class="panel">
      <strong>Ειδοποιήσεις</strong>
      <p class="note">Όταν περνά η ώρα ενός ραντεβού, έρχεται ειδοποίηση για να το ολοκληρώσεις. Στο τηλέφωνο εμφανίζονται όσο η εφαρμογή είναι ανοιχτή.</p>
      <p class="sub">${granted ? "Το τηλέφωνο τις δέχεται." : "Δεν έχουν ενεργοποιηθεί ακόμα στο τηλέφωνο."}</p>
      <div class="actions"><button class="solid" type="button" data-action="enable-push">Ενεργοποίηση στο τηλέφωνο</button></div>
    </article>
  </div>`;
}

function render() {
  document.querySelectorAll("#nav button[data-view]").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  const secondary = NAV.find((n) => n.id === view)?.secondary;
  document.querySelector(".more-btn")?.classList.toggle("active", Boolean(secondary));
  document.body.dataset.page = view;
  if (view === "home") renderHome();
  if (view === "week") renderWeek();
  if (view === "schedule") renderSchedule();
  if (view === "calendar") renderCalendar();
  if (view === "customers") renderCustomers();
  if (view === "dashboard") renderDashboard();
  if (view === "messages") renderMessages();
  if (view === "profile") renderProfile();
  paintBadge();
  paintBrand();
  paintSync();
}
function go(next) {
  view = next;
  closeSheet();
  render();
  window.scrollTo({ top: 0 });
}
