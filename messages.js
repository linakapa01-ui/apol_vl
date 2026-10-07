let msgText = "";
let msgTemplateId = "";
let msgSelected = new Set();
let msgSearch = "";
let msgFilter = { cat: "", owe: false };

const PLACEHOLDERS = ["{όνομα}", "{ημερομηνία}", "{ώρα}", "{ποσό}", "{διεύθυνση}"];

function fillMessage(text, person) {
  const next = nextVisit(person);
  const owed = state.appointments.filter((a) => a.customerId === person.id && a.status === "pending").reduce((t, a) => t + amountOf(a), 0);
  return text
    .replaceAll("{όνομα}", person.name)
    .replaceAll("{ημερομηνία}", next ? longDate(next.date) : "")
    .replaceAll("{ώρα}", next ? next.time : "")
    .replaceAll("{ποσό}", owed ? euro(owed) : "")
    .replaceAll("{διεύθυνση}", person.address || "");
}
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function smsHref(numbers, body) {
  const list = numbers.map((n) => String(n).replace(/[^\d+]/g, "")).filter(Boolean).join(",");
  const sep = isIOS() ? "&" : "?";
  return `sms:${list}${sep}body=${encodeURIComponent(body)}`;
}
function recipients() {
  return state.customers.filter((c) => matchesText(`${c.name} ${c.address} ${c.phone}`, msgSearch)
    && (!msgFilter.cat || customerCategories(c).includes(msgFilter.cat))
    && (!msgFilter.owe || state.appointments.some((a) => a.customerId === c.id && a.status === "pending")));
}

function templateCards() {
  return state.templates.map((t) => `<article class="tpl${t.id === msgTemplateId ? " on" : ""}">
      <button type="button" class="tpl-main" data-action="tpl-use" data-id="${esc(t.id)}"><strong>${esc(t.title)}</strong><span>${esc(t.text)}</span></button>
      <div class="tpl-actions"><button type="button" class="text-btn" data-action="tpl-edit" data-id="${esc(t.id)}">Επεξεργασία</button><button type="button" class="text-btn danger" data-action="tpl-delete" data-id="${esc(t.id)}" aria-label="Διαγραφή">${icon("trash")}</button></div>
    </article>`).join("") || emptyBox("Δεν υπάρχουν έτοιμα μηνύματα.");
}
function recipientList() {
  const list = recipients();
  const allOn = list.length && list.every((c) => msgSelected.has(c.id));
  return `<div class="recip-head"><label class="check mini"><input type="checkbox" data-msg-all ${allOn ? "checked" : ""}><span class="box">${icon("check")}</span><span class="check-text">Όλοι (${list.length})</span></label>
      <span class="count">${msgSelected.size} επιλεγμένοι</span></div>
    <div class="recip-list">${list.map((c) => `<label class="recip${msgSelected.has(c.id) ? " on" : ""}${has(c.phone) ? "" : " nophone"}">
        <input type="checkbox" data-msg-pick="${esc(c.id)}"${msgSelected.has(c.id) ? " checked" : ""}${has(c.phone) ? "" : " disabled"}>
        <span class="box">${icon("check")}</span>
        <span class="recip-info"><strong>${esc(c.name)}</strong><small>${has(c.phone) ? esc(c.phone) : "Χωρίς τηλέφωνο"} · ${esc(areaOf(c.address))}</small></span>
      </label>`).join("") || emptyBox("Δεν βρέθηκε πελάτης.")}</div>`;
}
function sendPanel() {
  const chosen = state.customers.filter((c) => msgSelected.has(c.id) && has(c.phone));
  const text = msgText.trim();
  const personal = /\{[^}]+\}/.test(text);
  const group = chosen.length > 1;
  const groupOk = text && chosen.length && !(personal && group);
  const groupHref = groupOk ? smsHref(chosen.map((c) => c.phone), personal && chosen.length === 1 ? fillMessage(text, chosen[0]) : text) : "";
  return `<div class="send-main">
      ${groupOk ? `<a class="solid big" href="${esc(groupHref)}">${icon("msg")}Άνοιγμα μηνύματος${chosen.length > 1 ? ` σε ${chosen.length} πελάτες` : ""}</a>` : `<button class="solid big" type="button" disabled>${icon("msg")}Άνοιγμα μηνύματος</button>`}
      ${!text ? '<p class="note">Γράψε ή διάλεξε ένα μήνυμα.</p>' : !chosen.length ? '<p class="note">Διάλεξε τουλάχιστον έναν πελάτη με τηλέφωνο.</p>' : ""}
      ${text && personal && group ? '<p class="note">Το μήνυμα έχει πεδία που αλλάζουν ανά πελάτη. Στείλε το ένα-ένα από τη λίστα παρακάτω.</p>' : ""}
    </div>
    ${text && chosen.length > 1 ? `<div class="send-each"><strong>Ένα-ένα</strong>${chosen.map((c) => `<a class="ghost small" href="${esc(smsHref([c.phone], fillMessage(text, c)))}">${esc(c.name)}</a>`).join("")}</div>` : ""}`;
}

function renderMessages() {
  const tpl = state.templates.find((t) => t.id === msgTemplateId);
  viewEl.innerHTML = `<div class="row"><h2 class="section-label">ΜΗΝΥΜΑΤΑ</h2><button class="solid small" type="button" data-action="tpl-new">${icon("plus")}Νέο μήνυμα</button></div>
    <div class="msg-grid">
      <section class="panel">
        <h3>1. Διάλεξε ή γράψε μήνυμα</h3>
        <div class="tpl-list">${templateCards()}</div>
        <label class="msg-box">Κείμενο μηνύματος
          <textarea id="msg-text" rows="5" placeholder="Γράψε εδώ το μήνυμα…">${esc(msgText)}</textarea>
        </label>
        <div class="fchips ph-chips"><span class="ph-label">Πεδία:</span>${PLACEHOLDERS.map((p) => `<button type="button" class="fchip" data-action="ph-insert" data-v="${esc(p)}">${esc(p)}</button>`).join("")}</div>
        <div class="actions"><button class="ghost small" type="button" data-action="tpl-save-current">${tpl ? "Ενημέρωση προτύπου" : "Αποθήκευση ως πρότυπο"}</button></div>
      </section>
      <section class="panel">
        <h3>2. Διάλεξε πελάτες</h3>
        <input class="search" id="msg-search" type="search" placeholder="Αναζήτηση πελάτη" value="${esc(msgSearch)}" autocomplete="off">
        <div class="fchips" id="msg-filters">${msgFilterChips()}</div>
        <div id="msg-recips">${recipientList()}</div>
      </section>
    </div>
    <section class="panel send-panel"><h3>3. Αποστολή</h3><p class="note">Θα ανοίξει η εφαρμογή μηνυμάτων του κινητού με το κείμενο και τους παραλήπτες έτοιμους. Πατάς εκεί την αποστολή.</p><div id="msg-send">${sendPanel()}</div></section>`;
}
function msgFilterChips() {
  const chip = (action, value, label, on) => `<button type="button" class="fchip${on ? " on" : ""}" data-action="${action}" data-v="${esc(value)}">${esc(label)}</button>`;
  return `${chip("msg-cat", "", "Όλες οι κατηγορίες", !msgFilter.cat)}${categories().map((c) => chip("msg-cat", c, c, msgFilter.cat === c)).join("")}${chip("msg-owe", "1", "Με εκκρεμή πληρωμή", msgFilter.owe)}`;
}
function refreshMessageParts() {
  const recips = document.getElementById("msg-recips");
  const send = document.getElementById("msg-send");
  const filters = document.getElementById("msg-filters");
  if (recips) recips.innerHTML = recipientList();
  if (send) send.innerHTML = sendPanel();
  if (filters) filters.innerHTML = msgFilterChips();
}

function templateForm(id, presetText) {
  const t = state.templates.find((x) => x.id === id) || {};
  openSheet(`<h2>${id ? "Επεξεργασία μηνύματος" : "Νέο έτοιμο μήνυμα"}</h2>
    <form class="form" id="tpl-form" data-id="${esc(t.id || "")}">
      ${field("Τίτλος", "title", t.title, 'required maxlength="60" placeholder="π.χ. Υπενθύμιση ραντεβού"')}
      <label>Κείμενο<textarea name="text" rows="6" required>${esc(t.text || presetText || "")}</textarea></label>
      <p class="note">Πεδία που συμπληρώνονται μόνα τους: ${PLACEHOLDERS.join(" ")}</p>
      <div class="actions"><button class="solid" type="submit">Αποθήκευση</button></div>
    </form>`);
}
