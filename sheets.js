function field(label, name, value, extra = "") {
  return `<label>${label}<input name="${name}" value="${esc(value || "")}" ${extra}></label>`;
}
function checkField(name, label, checked, iconName) {
  return `<label class="check"><input type="checkbox" name="${name}" value="1"${checked ? " checked" : ""}><span class="box">${icon("check")}</span><span class="check-text">${iconName ? icon(iconName) : ""}${label}</span></label>`;
}

function apptSheet(id) {
  const appt = apptById(id);
  const person = appt && customer(appt.customerId);
  if (!appt || !person) return;
  const call = phoneLink(person.phone);
  const call2 = phoneLink(person.phone2);
  const moves = (appt.log || []).filter((item) => item.kind === "moved");
  const active = isActive(appt);
  const key = statusKey(appt);
  const manholes = has(appt.manholes) ? appt.manholes === "Ναι" : flagsOf(person).manholes;
  const fp = floorPriceText(appt, person);
  const money = amountOf(appt);
  const repeat = (REPEATS.find((r) => r[0] === appt.repeat) || [])[1];
  const lat = appt.lat || person.lat;
  const lng = appt.lng || person.lng;
  const payRows = (appt.status === "done" || appt.status === "pending")
    ? `<h3 class="sub-head">Πληρωμή</h3><dl class="kvs">
        ${kv("Ποσό", `<b>${esc(euro(money))}</b>`)}
        ${kv("Κατάσταση", appt.status === "done" ? `<span class="tag tone-green">Πληρώθηκε</span>` : `<span class="tag tone-orange">Αναμένεται</span>`)}
        ${kv("Τρόπος", appt.payMethod ? esc(PAY_METHODS[appt.payMethod]) : "")}
        ${kv("Σημείωση", has(appt.payNote) ? esc(appt.payNote) : "")}
      </dl>` : "";
  const cancelRows = appt.status === "cancelled" && appt.cancel
    ? `<h3 class="sub-head">Ακύρωση</h3><dl class="kvs">
        ${kv("Λόγος", esc(appt.cancel.label || ""))}
        ${kv("Σημείωση", has(appt.cancel.text) ? esc(appt.cancel.text) : "")}
      </dl>` : "";
  const postponedRows = appt.status === "postponed"
    ? `<h3 class="sub-head">Αναβολή</h3><dl class="kvs">${kv("Νέα ημερομηνία", appt.postponedTo ? esc(longDate(appt.postponedTo)) : "")}${kv("Λόγος", has(appt.postponeReason) ? esc(appt.postponeReason) : "")}</dl>` : "";
  openSheet(`<div class="sheet-head"><div><h2>${esc(person.name)}</h2><p class="sub">${esc(longDate(appt.date))} · ${esc(appt.time)}</p></div>${statusTag(appt)}</div>
    ${flagsHTML(person, manholes)}
    <dl class="kvs">
      ${kv("Υπηρεσία", has(appt.service) ? esc(appt.service) : "")}
      ${kv("Περιοχή", has(areaOf(person.address)) ? esc(areaOf(person.address)) : "")}
      ${kv("Διεύθυνση", `<a href="${esc(mapsLink(placeTarget(appt, person)))}" target="_blank" rel="noopener noreferrer">${esc(person.address)}</a>`)}
      ${kv("Όροφος", has(appt.floor) ? esc(appt.floor) : "")}
      ${kv("Χρέωση ανά όροφο", fp ? `<b>${esc(fp)}</b>` : "")}
      ${kv("Πλήθος διαμερισμάτων", has(person.apartments) ? esc(person.apartments) : "")}
      ${kv("Εκτιμώμενος χρόνος", has(appt.duration) ? esc(appt.duration) : "")}
      ${kv("Κόστος επίσκεψης", has(appt.cost || person.cost) ? esc(appt.cost || person.cost) : "")}
      ${kv("Τηλέφωνο", call ? `<a href="${esc(call)}">${esc(person.phone)}</a>` : "")}
      ${kv("Τηλέφωνο 2", call2 ? `<a href="${esc(call2)}">${esc(person.phone2)}</a>` : "")}
      ${kv("Τελευταία φορά", person.lastDate ? esc(longDate(person.lastDate)) : "")}
      ${kv("Επανάληψη", repeat && appt.repeat ? `<span class="tag tone-teal">${esc(repeat)}</span>` : "")}
      ${kv("Σημειώσεις", has(appt.notes || person.notes) ? esc(appt.notes || person.notes) : "")}
      ${moves.length ? kv("Μεταφορές", moves.map((item) => `Από ${esc(longDate(item.from))} στις ${esc(longDate(item.to))}`).join("<br>")) : ""}
    </dl>
    ${lat ? `<iframe class="map-frame" title="Google Maps" src="${esc(embedSrc(lat, lng))}"></iframe>` : `<p class="note">Η τοποθεσία είναι προσεγγιστική, από τη διεύθυνση. Διόρθωσέ την από τον πελάτη.</p>`}
    ${payRows}${cancelRows}${postponedRows}
    ${active ? `<form class="form move-form" id="move-form" data-id="${esc(appt.id)}">
      <label>Αλλαγή ημερομηνίας ${dayHint(appt.date)}<input type="date" name="date" value="${esc(appt.date)}" min="${esc(todayISO())}" required></label>
      <button class="ghost" type="submit">Μεταφορά σε αυτή την ημέρα</button>
    </form>` : ""}
    <div class="actions">
      ${active ? `<button class="solid${key === "due" ? " glow" : ""}" type="button" data-action="outcome" data-id="${esc(appt.id)}">${icon("check")}${key === "due" ? "Πώς πήγε;" : "Ολοκλήρωση"}</button>` : ""}
      ${appt.status === "pending" ? `<button class="solid orange" type="button" data-action="outcome" data-id="${esc(appt.id)}">${icon("cash")}Πληρώθηκε</button>` : ""}
      ${call ? `<a class="ghost" href="${esc(call)}">${icon("phone")}Κλήση</a>` : ""}
      <a class="ghost" href="${esc(mapsLink(placeTarget(appt, person)))}" target="_blank" rel="noopener noreferrer">${icon("pin")}${lat ? "Πλοήγηση" : "Χάρτης"}</a>
      <button class="ghost" type="button" data-action="edit-appt" data-id="${esc(appt.id)}">Διόρθωση</button>
      <button class="ghost" type="button" data-action="repeat-appt" data-id="${esc(appt.id)}">${icon("repeat")}Νέο ραντεβού σαν αυτό</button>
      ${active ? "" : `<button class="text-btn" type="button" data-action="restore-appt" data-id="${esc(appt.id)}">Επαναφορά στο πρόγραμμα</button>`}
      <button class="text-btn danger" type="button" data-action="delete-appt" data-id="${esc(appt.id)}">Διαγραφή</button>
    </div>`);
}

function outcomeSheet(id, mode) {
  const appt = apptById(id);
  const person = appt && customer(appt.customerId);
  if (!appt || !person) return;
  const awaiting = appt.status === "pending";
  mode = awaiting ? "pay" : (mode || "paid");
  const amount = amountOf(appt);
  const choices = (name, current) => Object.entries(PAY_METHODS).map(([value, label]) =>
    `<label class="choice big"><input type="radio" name="${name}" value="${value}"${value === current ? " checked" : ""}><span>${icon(value)}${label}</span></label>`).join("");
  const tabs = [
    ["paid", "Επιτυχής · πληρώθηκε", "check", "green"],
    ["pending", "Έγινε · αναμένω πληρωμή", "hourglass", "orange"],
    ["postpone", "Αναβλήθηκε", "repeat", "violet"],
    ["cancel", "Ακυρώθηκε", "x", "red"]
  ];
  const tabsHTML = awaiting ? "" : `<div class="outcome-tabs">${tabs.map(([m, label, ic, tone]) => `<button type="button" class="otab tone-${tone}${m === mode ? " on" : ""}" data-action="outcome-tab" data-id="${esc(id)}" data-v="${m}">${icon(ic)}<span>${label}</span></button>`).join("")}</div>`;
  let panel = "";
  if (mode === "paid" || mode === "pay") {
    panel = `<form class="form" id="outcome-form" data-id="${esc(id)}" data-mode="${mode}">
      <div class="choices">${choices("method", appt.payMethod || "cash")}</div>
      <label>Ποσό που πληρώθηκε (€)<input type="number" name="amount" inputmode="decimal" step="0.5" min="0" value="${amount || ""}" required></label>
      <button class="solid" type="submit">${mode === "pay" ? "Πληρώθηκε" : "Ολοκληρώθηκε επιτυχώς"}</button>
    </form>`;
  } else if (mode === "pending") {
    panel = `<form class="form" id="outcome-form" data-id="${esc(id)}" data-mode="pending">
      <p class="note">Η δουλειά έγινε αλλά δεν πληρώθηκε ακόμα. Θα μπει στο κουτί «Αναμένονται πληρωμές».</p>
      <label>Ποσό που περιμένεις (€)<input type="number" name="amount" inputmode="decimal" step="0.5" min="0" value="${amount || ""}" required></label>
      <label>Σημείωση<input name="note" placeholder="π.χ. θα το στείλει με έμβασμα"></label>
      <button class="solid orange" type="submit">Ολοκληρώθηκε, περιμένω πληρωμή</button>
    </form>`;
  } else if (mode === "postpone") {
    panel = `<form class="form" id="outcome-form" data-id="${esc(id)}" data-mode="postpone">
      <label>Νέα ημερομηνία ${dayHint(addDays(appt.date, 1) < todayISO() ? todayISO() : addDays(appt.date, 1))}<input type="date" name="date" value="${esc(addDays(appt.date, 1) < todayISO() ? todayISO() : addDays(appt.date, 1))}" min="${esc(todayISO())}" required></label>
      <label>Ώρα<input type="time" name="time" value="${esc(appt.time)}" required></label>
      <label>Λόγος αναβολής<input name="reason" placeholder="π.χ. δεν ήταν στο σπίτι"></label>
      <button class="solid violet" type="submit">Αναβολή και νέο ραντεβού</button>
    </form>`;
  } else {
    panel = `<form class="form" id="outcome-form" data-id="${esc(id)}" data-mode="cancel">
      <div class="reasons">${CANCEL_REASONS.map((r, i) => `<label class="choice reason"><input type="radio" name="reason" value="${r.id}"${i === 0 ? " checked" : ""}><span>${esc(r.label)}</span></label>`).join("")}</div>
      <label>Σημείωση ή λόγος που σου είπαν<input name="text" placeholder="Γράψε εδώ όποιον λόγο σου είπαν" id="cancel-text"></label>
      <p class="note">Οι ακυρώσεις του πελάτη μετράνε στη βαθμολογία του. Η κακοκαιρία και τα δικά μου προβλήματα δεν μετράνε.</p>
      <button class="solid danger-solid" type="submit">Ακύρωση ραντεβού</button>
    </form>`;
  }
  openSheet(`<h2>${awaiting ? "Εκκρεμής πληρωμή" : "Πώς πήγε;"}</h2>
    <p class="sub sheet-sub">${esc(person.name)} · ${esc(longDate(appt.date))} · ${esc(appt.time)}</p>
    ${tabsHTML}${panel}`);
}

function customerSheet(id) {
  const person = customer(id);
  if (!person) return;
  const call = phoneLink(person.phone);
  const call2 = phoneLink(person.phone2);
  const history = state.appointments.filter((a) => a.customerId === person.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const r = ratingOf(person);
  const cats = customerCategories(person);
  const fp = floorPriceText(null, person);
  const owed = history.filter((a) => a.status === "pending").reduce((t, a) => t + amountOf(a), 0);
  const total = history.filter((a) => a.status === "done").reduce((t, a) => t + amountOf(a), 0);
  openSheet(`<div class="sheet-head"><div><h2>${esc(person.name)}</h2><p class="sub">${esc(areaOf(person.address))}</p></div>${ratingBadge(person)}</div>
    ${flagsHTML(person)}
    <div class="rating-card tone-${r.tone}">
      <div>${starsHTML(r.stars)}<strong>${r.score == null ? "Νέος πελάτης" : `${r.score}/100 · ${esc(r.label)}`}</strong></div>
      <p class="sub">${r.score == null ? "Η βαθμολογία θα εμφανιστεί μετά την πρώτη επίσκεψη." : `${r.visits} ${r.visits === 1 ? "επίσκεψη" : "επισκέψεις"} · ακυρώσεις πελάτη: ${r.early} εγκαίρως, ${r.late} την τελευταία στιγμή, ${r.noshow} χωρίς εμφάνιση`}</p>
    </div>
    <dl class="kvs">
      ${kv("Διεύθυνση", `<a href="${esc(mapsLink(person))}" target="_blank" rel="noopener noreferrer">${esc(person.address)}</a>`)}
      ${kv("Κατηγορίες", cats.length ? cats.map((c) => `<span class="chip">${esc(c)}</span>`).join(" ") : "")}
      ${kv("Χρέωση ανά όροφο", fp ? `<b>${esc(fp)}</b>` : "")}
      ${kv("Κόστος συνολικό ή ανά όροφο", has(person.cost) ? esc(person.cost) : "")}
      ${kv("Πλήθος διαμερισμάτων", has(person.apartments) ? esc(person.apartments) : "")}
      ${kv("Τηλέφωνο", call ? `<a href="${esc(call)}">${esc(person.phone)}</a>` : "")}
      ${kv("Τηλέφωνο 2", call2 ? `<a href="${esc(call2)}">${esc(person.phone2)}</a>` : "")}
      ${kv("Τελευταία απολύμανση", person.lastDate ? esc(longDate(person.lastDate)) : "")}
      ${kv("Είδος εντόμου / τρωκτικού", has(person.pest) ? esc(person.pest) : "")}
      ${kv("Έχει πληρώσει συνολικά", total ? `<b>${esc(euro(total))}</b>` : "")}
      ${kv("Οφείλει", owed ? `<b class="owed">${esc(euro(owed))}</b>` : "")}
      ${kv("Σημειώσεις τεχνικού", has(person.notes) ? esc(person.notes) : "")}
    </dl>
    ${person.lat
      ? `<iframe class="map-frame" title="Google Maps" src="${esc(embedSrc(person.lat, person.lng))}"></iframe>`
      : `<p class="note">Η τοποθεσία είναι προσεγγιστική, από τη διεύθυνση. Πάτα «Διόρθωση» για να βάλεις το ακριβές σημείο.</p>`}
    <div class="actions">
      <button class="solid" type="button" data-action="appt-for" data-id="${esc(person.id)}">${icon("plus")}Νέο ραντεβού</button>
      ${call2 ? `<button class="ghost" type="button" data-action="pick-phone" data-id="${esc(person.id)}" data-v="call">${icon("phone")}Κλήση</button>` : call ? `<a class="ghost" href="${esc(call)}">${icon("phone")}Κλήση</a>` : ""}
      <button class="ghost" type="button" data-action="msg-customer" data-id="${esc(person.id)}">${icon("msg")}Μήνυμα</button>
      <button class="ghost" type="button" data-action="edit-customer" data-id="${esc(person.id)}">Διόρθωση</button>
    </div>
    <h2 class="section-label">Ιστορικό πελάτη</h2>
    <div class="stack">${history.map((a) => cardHTML(a, { date: true })).join("") || emptyBox("Δεν υπάρχει καμία επίσκεψη ακόμα.")}</div>`);
}

function locationFields(record) {
  const locked = record.lat && record.lng;
  return `<div class="map-pick" data-address="${esc(record.address || "")}">
      <iframe class="map-frame" id="map-frame" title="Google Maps" src="${esc(embedSrc(record.lat, record.lng, record.address))}"></iframe>
      <p class="map-status${locked ? " ok" : ""}" id="map-status">${locked ? (record.mapsUrl ? "Το σημείο είναι κλειδωμένο." : "Βρέθηκε αυτόματα από τη διεύθυνση.") : ""}</p>
      <a class="ghost map-open" id="open-gmaps" href="${esc(mapsLink(record))}" target="_blank" rel="noopener noreferrer">Άνοιγμα στο Google Maps</a>
      <details class="map-manual"${record.mapsUrl ? " open" : ""}>
        <summary>Διόρθωση σημείου με σύνδεσμο</summary>
        <label>Σύνδεσμος Google Maps
          <input name="mapsUrl" id="maps-url" value="${esc(record.mapsUrl || "")}" placeholder="Επικόλληση πλήρους συνδέσμου">
        </label>
      </details>
      <input type="hidden" name="lat" id="map-lat" value="${esc(record.lat || "")}" data-auto="${locked && !record.mapsUrl ? "1" : "0"}">
      <input type="hidden" name="lng" id="map-lng" value="${esc(record.lng || "")}">
    </div>`;
}
function categoryChoices(selected) {
  const set = new Set(selected || []);
  return `<div class="choices wrap">${categories().map((c) => `<label class="choice"><input type="checkbox" name="categories" value="${esc(c)}"${set.has(c) ? " checked" : ""}><span>${esc(c)}</span></label>`).join("")}</div>`;
}
let returnAppt = null;

function customerForm(person, opts = {}) {
  const c = person || opts.prefill || {};
  const flags = person ? flagsOf(person) : { building: true, apartments: false, manholes: false };
  openSheet(`<h2>${person ? "Διόρθωση πελάτη" : "Νέος πελάτης"}</h2>
    <form class="form" id="customer-form" data-id="${esc(person ? person.id : "")}"${opts.returnToAppt ? ' data-return="1"' : ""}>
      ${field("Όνομα πελάτη", "name", c.name, "required")}
      <label>Διεύθυνση<input name="address" id="map-address" value="${esc(c.address || "")}" required></label>
      ${locationFields(c)}
      <div class="check-group">
        ${checkField("isBuilding", "Πολυκατοικία", flags.building, "building")}
        ${checkField("hasApts", "Έχει διαμερίσματα", flags.apartments, "door")}
        ${checkField("manholes", "Ανοίγει φρεάτια", flags.manholes, "manhole")}
      </div>
      <div class="field-block"><span class="field-label">Κατηγορίες εργασίας</span>${categoryChoices(customerCategories(c))}</div>
      ${field("Πλήθος διαμερισμάτων", "apartments", c.apartments)}
      ${field("Χρέωση ανά όροφο (€)", "floorPrice", c.floorPrice, 'inputmode="decimal" placeholder="π.χ. 15"')}
      ${field("Κόστος συνολικό ή ανά όροφο", "cost", c.cost, 'placeholder="π.χ. 45€ + 15€ τζελ"')}
      ${field("Τηλέφωνο", "phone", c.phone, 'inputmode="tel" required')}
      ${field("Τηλέφωνο 2", "phone2", c.phone2, 'inputmode="tel"')}
      <label>Ημερομηνία τελευταίας απολύμανσης<input type="date" name="lastDate" value="${esc(c.lastDate || "")}"></label>
      ${field("Είδος εντόμου / τρωκτικού", "pest", c.pest)}
      <label>Σημειώσεις τεχνικού<textarea name="notes">${esc(c.notes || "")}</textarea></label>
      <button class="solid big" type="submit">Αποθήκευση</button>
    </form>
    ${person ? `<div class="danger-zone"><button class="ghost danger" type="button" data-action="delete-customer" data-id="${esc(c.id)}">${icon("trash")}Διαγραφή πελάτη</button></div>` : ""}`);
  if (!c.lat && c.address) autoLocateSoon();
}

function apptLocation(person) {
  if (!person) return `<div id="appt-loc"></div>`;
  if (person.lat && person.lng) {
    return `<div class="map-pick" id="appt-loc">
      <p class="map-status ok">Θα μπει στο ακριβές σημείο του πελάτη στο Google Maps.</p>
      <iframe class="map-frame" title="Google Maps" src="${esc(embedSrc(person.lat, person.lng))}"></iframe>
    </div>`;
  }
  return `<div class="map-pick" id="appt-loc">${locationFields(person)}</div>`;
}
function customerOptionsHTML(q, selectedId) {
  const matches = state.customers.filter((c) => matchesText(`${c.name} ${c.address} ${c.phone} ${c.phone2 || ""}`, q));
  const addBtn = `<button type="button" class="picker-add" data-action="add-customer-from-appt" data-q="${esc(String(q || "").trim())}">${icon("plus")}<span>Προσθήκη νέου πελάτη${has(q) ? `: «${esc(String(q).trim())}»` : ""}</span></button>`;
  if (!matches.length) return `<p class="picker-empty">Δεν βρέθηκε πελάτης.</p>${addBtn}`;
  return matches.map((c) => `<button type="button" class="picker-item${c.id === selectedId ? " selected" : ""}" data-action="pick-customer" data-id="${esc(c.id)}">
      <strong>${esc(c.name)}</strong>
      <span>${esc([c.address, c.phone].filter(Boolean).join(" · "))}</span>
    </button>`).join("") + addBtn;
}
function newCustomerFromAppt(q) {
  const form = document.getElementById("appt-form");
  returnAppt = form ? formData(form) : null;
  if (returnAppt) ['customerId', 'lat', 'lng', 'mapsUrl'].forEach((k) => delete returnAppt[k]);
  const text = String(q || "").trim();
  const isPhone = /^[\d\s+()-]{5,}$/.test(text);
  customerForm(null, { returnToAppt: true, prefill: isPhone ? { phone: text } : { name: text } });
}
function backToApptWith(customerId) {
  const prefill = returnAppt || {};
  returnAppt = null;
  apptForm(null, { prefill, override: { customerId } });
}
function customerPicker(person) {
  return `<div class="picker" id="cust-picker">
      <label for="cust-search">Πελάτης</label>
      <input type="hidden" name="customerId" id="cust-id" value="${esc(person ? person.id : "")}">
      <input type="search" class="picker-input" id="cust-search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" placeholder="Αναζήτηση ονόματος, διεύθυνσης, τηλεφώνου" value="${esc(person ? person.name : "")}">
      <div class="picker-list" id="cust-list" role="listbox" hidden></div>
      <p class="map-status bad" id="cust-error" hidden>Διάλεξε πελάτη από τη λίστα.</p>
    </div>`;
}
function agendaHTML(date, time, duration, excludeId) {
  const list = dayAgenda(date, excludeId);
  const clash = findClash(date, time, duration, excludeId);
  const items = list.map((a) => {
    const person = customer(a.customerId);
    const end = minutesOf(a.time) + durationMinutes(a.duration);
    const endText = `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
    return `<span class="ag-item${clash && clash.id === a.id ? " clash" : ""}"><b>${esc(a.time)}–${endText}</b> ${esc(person ? person.name : "")}</span>`;
  }).join("");
  return `${clash ? `<p class="clash-msg">${icon("x")}${esc(clashText(clash))}</p>` : ""}
    <div class="ag-row">${items || '<span class="ag-free">Ελεύθερη μέρα</span>'}</div>`;
}
function refreshAgenda() {
  const form = document.getElementById("appt-form");
  const box = document.getElementById("day-agenda");
  if (!form || !box) return;
  box.innerHTML = agendaHTML(form.elements.date.value, form.elements.time.value, form.elements.duration.value, form.dataset.id);
}
function autoLocateSoon() {
  setTimeout(() => { if (typeof scheduleMapAddress === "function") scheduleMapAddress(); }, 60);
}
function apptForm(appt, opts = {}) {
  const base = appt || opts.prefill || {};
  const a = {
    date: opts.date || picked || todayISO(),
    time: "09:00",
    service: categories()[0],
    customerId: opts.customerId || "",
    repeat: "",
    ...base,
    ...(opts.override || {})
  };
  if (!appt && a.date < todayISO()) a.date = todayISO();
  const person = customer(a.customerId);
  const manholes = has(a.manholes) ? a.manholes === "Ναι" : Boolean(person && flagsOf(person).manholes);
  const services = [...new Set([...categories(), a.service].filter(Boolean))];
  openSheet(`<h2>${appt ? "Διόρθωση ραντεβού" : "Νέο ραντεβού"}</h2>
    ${opts.banner ? `<p class="banner">${icon("repeat")}${esc(opts.banner)}</p>` : ""}
    <form class="form" id="appt-form" data-id="${esc(appt ? appt.id : "")}" data-from="${esc(opts.fromId || "")}">
      ${customerPicker(person)}
      ${apptLocation(person)}
      <div class="grid-2">
        <label>Ημερομηνία ${dayHint(a.date)}<input type="date" name="date" value="${esc(a.date)}"${appt ? "" : ` min="${esc(todayISO())}"`} required></label>
        <label>Ώρα<input type="time" name="time" value="${esc(a.time)}" required></label>
      </div>
      <div class="day-agenda" id="day-agenda">${agendaHTML(a.date, a.time, a.duration, appt ? appt.id : "")}</div>
      <div class="grid-2">
        <label>Κατηγορία<select name="service">${services.map((s) => `<option ${a.service === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
        ${field("Εκτιμώμενος χρόνος", "duration", a.duration, 'placeholder="π.χ. 45 λεπτά"')}
      </div>
      <div class="grid-2">
        ${field("Όροφος", "floor", a.floor, 'placeholder="π.χ. 2ος"')}
        ${field("Χρέωση ανά όροφο (€)", "floorPrice", a.floorPrice ?? (person && person.floorPrice) ?? "", 'inputmode="decimal" placeholder="π.χ. 15"')}
      </div>
      ${checkField("manholes", "Άνοιγμα φρεατίων", manholes, "manhole")}
      ${field("Κόστος αυτής της επίσκεψης", "cost", a.cost, 'placeholder="π.χ. 60€"')}
      <label>Επανάληψη<select name="repeat">${REPEATS.map(([v, l]) => `<option value="${v}"${a.repeat === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>Σημειώσεις<textarea name="notes">${esc(a.notes || "")}</textarea></label>
      <div class="actions"><button class="solid" type="submit">Αποθήκευση</button></div>
    </form>`);
  if (person && !person.lat) autoLocateSoon();
}
function repeatAppt(id) {
  const from = apptById(id);
  if (!from) return;
  const next = from.repeat ? addInterval(from.date, from.repeat) : addInterval(from.date, "m1");
  const today = todayISO();
  apptForm(null, {
    customerId: from.customerId,
    fromId: from.id,
    prefill: { ...from, notes: from.notes || "" },
    override: { date: next < today ? today : next, time: from.time },
    banner: `Έτοιμο από την επίσκεψη της ${longDate(from.date)}. Άλλαξε ημερομηνία ή ώρα αν χρειάζεται.`
  });
}

function pickerParts() {
  return {
    input: document.getElementById("cust-search"),
    id: document.getElementById("cust-id"),
    list: document.getElementById("cust-list"),
    error: document.getElementById("cust-error")
  };
}
function openPicker(q) {
  const { input, id, list } = pickerParts();
  if (!list) return;
  list.innerHTML = customerOptionsHTML(q, id.value);
  list.hidden = false;
  const selected = list.querySelector(".selected");
  if (selected && !q) list.scrollTop = selected.offsetTop - 8;
  if (input) input.setAttribute("aria-expanded", "true");
}
function closePicker() {
  const { input, id, list } = pickerParts();
  if (!list || list.hidden) return;
  list.hidden = true;
  const chosen = customer(id.value);
  input.value = chosen ? chosen.name : "";
}
function choosePicker(customerId) {
  const { input, id, list, error } = pickerParts();
  const chosen = customer(customerId);
  if (!chosen || !id) return;
  id.value = chosen.id;
  input.value = chosen.name;
  list.hidden = true;
  error.hidden = true;
  id.dispatchEvent(new Event("change", { bubbles: true }));
}
function applyCustomerDefaults(person) {
  const form = document.getElementById("appt-form");
  if (!form || form.dataset.id || !person) return;
  const set = (name, value) => {
    const el = form.elements[name];
    if (el && !el.value && has(value)) el.value = value;
  };
  set("cost", person.cost);
  set("floorPrice", person.floorPrice);
  const cats = customerCategories(person);
  if (cats.length && form.elements.service && [...form.elements.service.options].some((o) => o.value === cats[0])) form.elements.service.value = cats[0];
  if (form.elements.manholes) form.elements.manholes.checked = flagsOf(person).manholes;
}

function notesSheet() {
  const items = state.notifications;
  openSheet(`<h2>Ειδοποιήσεις</h2>
    ${items.map((n) => `<article class="notice ${n.read ? "read" : ""}${n.apptId ? " click" : ""}"${n.apptId ? ` data-action="appt" data-id="${esc(n.apptId)}"` : ""}><strong>${esc(n.title)}</strong><span class="sub">${esc(n.body)}</span><small>${esc(new Date(n.at).toLocaleString("el-GR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</small></article>`).join("") || '<p class="empty">Δεν υπάρχουν ειδοποιήσεις.</p>'}
    ${items.length ? '<div class="actions"><button class="ghost" type="button" data-action="read-all">Σήμανση ως διαβασμένες</button></div>' : ""}`);
  state.notifications.forEach((n) => { n.read = true; });
  persist();
  paintBadge();
}

function loveSheet() {
  openSheet(`<div class="love">
      <div class="love-photo"><img src="assets/lina.jpg" alt="Lina" onerror="this.parentNode.classList.add('nophoto');this.remove()"><span class="love-heart">${icon("heart")}</span></div>
      <h2>Σε λατρεύω έρωτα της ζωής μου</h2>
      <p class="love-sign">Το γυναικάκι σου</p>
      <div class="hearts" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}">${icon("heart")}</i>`).join("")}</div>
    </div>`, "love-sheet");
}

function phoneSheet(id, mode) {
  const person = customer(id);
  if (!person) return;
  const numbers = [person.phone, person.phone2].filter((n) => phoneLink(n));
  const sms = mode === "sms";
  openSheet(`<h2>${sms ? "Μήνυμα σε" : "Κλήση σε"} ${esc(person.name)}</h2>
    <div class="phone-choice">${numbers.map((n) => `<a class="solid big" href="${esc(sms ? smsHref([n], "") : phoneLink(n))}">${icon(sms ? "msg" : "phone")}${esc(n)}</a>`).join("")}</div>`);
}
