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
  const label = chosen.length ? `Άνοιγμα SMS (${chosen.length})` : "Διάλεξε πελάτες";
  if (text && personal && group) {
    return `<div class="send-each">${chosen.map((c) => `<a class="solid small" href="${esc(smsHref([c.phone], fillMessage(text, c)))}">${icon("msg")}${esc(c.name)}</a>`).join("")}</div>`;
  }
  return groupOk
    ? `<a class="solid big" href="${esc(groupHref)}">${icon("msg")}${label}</a>`
    : `<button class="solid big" type="button" disabled>${icon("msg")}${label}</button>`;
}

function renderMessages() {
  viewEl.innerHTML = `<div class="row"><h2 class="section-label">ΜΗΝΥΜΑΤΑ</h2><button class="solid small" type="button" data-action="tpl-new">${icon("plus")}Νέο</button></div>
    <div class="msg-list">${state.templates.map((t) => `<div class="msg-row">
        <strong class="msg-title">${esc(t.title)}</strong>
        <button class="solid small" type="button" data-action="tpl-send" data-id="${esc(t.id)}">${icon("msg")}Αποστολή</button>
        <button class="ghost icon-act" type="button" data-action="tpl-edit" data-id="${esc(t.id)}" title="Επεξεργασία" aria-label="Επεξεργασία">${icon("edit")}</button>
      </div>`).join("") || emptyBox("Δεν υπάρχουν μηνύματα. Πάτα «Νέο».")}</div>`;
}
function sendSheet(id) {
  const t = state.templates.find((x) => x.id === id);
  if (!t) return;
  msgTemplateId = id;
  msgText = t.text;
  msgSearch = "";
  openSheet(`<h2>${esc(t.title)}</h2>
    <input class="search" id="msg-search" type="search" placeholder="Αναζήτηση πελάτη" autocomplete="off">
    <div class="fchips" id="msg-filters">${msgFilterChips()}</div>
    <div id="msg-recips">${recipientList()}</div>
    <div class="send-bar" id="msg-send">${sendPanel()}</div>`, "send-sheet");
}
function msgFilterChips() {
  const chip = (action, value, label, on) => `<button type="button" class="fchip${on ? " on" : ""}" data-action="${action}" data-v="${esc(value)}">${esc(label)}</button>`;
  return `${chip("msg-cat", "", "Όλες οι κατηγορίες", !msgFilter.cat)}${categories().map((c) => chip("msg-cat", c, c, msgFilter.cat === c)).join("")}${chip("msg-owe", "1", "Με εκκρεμή πληρωμή", msgFilter.owe)}`;
}
function refreshMessageParts() {
  const recips = document.getElementById("msg-recips");
  const send = document.getElementById("msg-send");
  const filters = document.getElementById("msg-filters");
  const listBox = recips && recips.querySelector(".recip-list");
  const scroll = listBox ? listBox.scrollTop : 0;
  if (recips) {
    recips.innerHTML = recipientList();
    const fresh = recips.querySelector(".recip-list");
    if (fresh) fresh.scrollTop = scroll;
  }
  if (send) send.innerHTML = sendPanel();
  if (filters) filters.innerHTML = msgFilterChips();
}

function templateForm(id) {
  const t = state.templates.find((x) => x.id === id) || {};
  openSheet(`<h2>${id ? "Επεξεργασία" : "Νέο μήνυμα"}</h2>
    <form class="form" id="tpl-form" data-id="${esc(t.id || "")}">
      ${field("Τίτλος", "title", t.title, 'required maxlength="60"')}
      <label>Κείμενο<textarea name="text" rows="6" required>${esc(t.text || "")}</textarea></label>
      <div class="fchips">${PLACEHOLDERS.map((p) => `<button type="button" class="fchip" data-action="ph-insert" data-v="${esc(p)}">${esc(p)}</button>`).join("")}</div>
      <button class="solid big" type="submit">${icon("check")}Αποθήκευση</button>
    </form>
    ${id ? `<div class="danger-zone"><button class="ghost danger" type="button" data-action="tpl-delete" data-id="${esc(id)}">${icon("trash")}Διαγραφή μηνύματος</button></div>` : ""}`);
}
