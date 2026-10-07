let imp = { items: [], picked: new Set(), error: "" };

function cleanPhone(raw) {
  let p = String(raw || "").replace(/[^\d+]/g, "");
  if (p.startsWith("0030")) p = p.slice(4);
  else if (p.startsWith("+30")) p = p.slice(3);
  else if (p.startsWith("30") && p.length === 12) p = p.slice(2);
  return p;
}
function phoneKey(raw) {
  return cleanPhone(raw).replace(/\D/g, "").slice(-10);
}

function decodeQP(value) {
  const bytes = [];
  const text = value.replace(/=\r?\n/g, "");
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(text.slice(i + 1, i + 3))) {
      bytes.push(parseInt(text.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(text[i]));
    }
  }
  try { return new TextDecoder("utf-8").decode(new Uint8Array(bytes)); } catch { return value; }
}
function vcfUnescape(v) {
  return String(v).replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function parseVCF(text) {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const lines = [];
  for (let i = 0; i < raw.length; i++) {
    let line = raw[i];
    if (/QUOTED-PRINTABLE/i.test(line)) {
      while (line.endsWith("=") && i + 1 < raw.length) line = line.slice(0, -1) + raw[++i];
    }
    lines.push(line);
  }
  const out = [];
  let card = null;
  lines.forEach((line) => {
    const upper = line.trim().toUpperCase();
    if (upper === "BEGIN:VCARD") { card = { fn: "", n: "", org: "", tels: [], adr: "" }; return; }
    if (upper === "END:VCARD") {
      if (card) out.push(card);
      card = null;
      return;
    }
    if (!card) return;
    const idx = line.indexOf(":");
    if (idx < 0) return;
    const head = line.slice(0, idx).toUpperCase();
    let value = line.slice(idx + 1);
    if (/ENCODING=QUOTED-PRINTABLE/.test(head)) value = decodeQP(value);
    const key = head.split(";")[0].replace(/^.*\./, "");
    if (key === "FN") card.fn = vcfUnescape(value);
    else if (key === "N") {
      const [last = "", first = "", middle = ""] = value.split(";");
      card.n = [first, middle, last].map(vcfUnescape).filter(Boolean).join(" ");
    } else if (key === "ORG") card.org = vcfUnescape(value.split(";")[0]);
    else if (key === "TEL") card.tels.push(value.trim());
    else if (key === "ADR" && !card.adr) {
      const parts = value.split(";").map(vcfUnescape);
      const [, , street = "", city = "", , zip = ""] = parts;
      card.adr = [street, city, zip].filter(Boolean).join(", ");
    }
  });
  return out.map((c) => ({
    name: c.fn || c.n || c.org,
    phones: c.tels,
    address: c.adr,
  }));
}

function parseCSVRows(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const body = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quoted) {
      if (ch === '"' && body[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && body[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

function parseCSV(text) {
  const first = text.split(/\r?\n/)[0] || "";
  const delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : (first.includes("\t") && !first.includes(",") ? "\t" : ",");
  const rows = parseCSVRows(text, delimiter);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const find = (...needles) => head.findIndex((h) => needles.some((n) => h === n));
  const all = (test) => head.map((h, i) => (test(h) ? i : -1)).filter((i) => i >= 0);
  const nameCol = find("name", "full name", "display name", "όνομα", "ονοματεπώνυμο", "επωνυμία");
  const firstCol = find("first name", "given name", "όνομα");
  const lastCol = find("last name", "family name", "surname", "επώνυμο", "επίθετο");
  const middleCol = find("middle name", "additional name");
  const phoneCols = all((h) => /phone|mobile|tel|τηλ|κινητ|σταθερ/.test(h) && !/type|label|τύπος/.test(h));
  const addrCols = all((h) => /address|διεύθυνση|διευθυνση|street|οδός|οδος/.test(h) && !/type|label|τύπος/.test(h));
  const orgCol = find("organization 1 - name", "organization", "company", "εταιρεία");
  return rows.slice(1).map((r) => {
    const cell = (i) => (i >= 0 && r[i] ? r[i].trim() : "");
    const composed = [cell(firstCol), cell(middleCol), cell(lastCol)].filter(Boolean).join(" ");
    const name = cell(nameCol) || composed || cell(orgCol);
    const phones = phoneCols.flatMap((i) => cell(i).split(/\s*:::\s*|\s*\/\s*/)).filter(Boolean);
    const address = addrCols.map(cell).find(Boolean) || "";
    return { name, phones, address: address.replace(/\s*\n\s*/g, ", ") };
  });
}

function buildImportItems(parsed) {
  const known = new Set(state.customers.flatMap((c) => [phoneKey(c.phone), phoneKey(c.phone2)]).filter(Boolean));
  const seen = new Set();
  const items = [];
  parsed.forEach((p) => {
    const name = String(p.name || "").trim();
    const phones = [...new Set((p.phones || []).map(cleanPhone).filter((x) => x.replace(/\D/g, "").length >= 6))];
    if (!name || !phones.length) return;
    const key = phoneKey(phones[0]);
    const dup = known.has(key) || seen.has(key);
    seen.add(key);
    items.push({ name, phone: phones[0], phone2: phones[1] || "", address: String(p.address || "").trim(), dup });
  });
  return items.sort((a, b) => a.name.localeCompare(b.name, "el"));
}

function contactsSupported() {
  return "contacts" in navigator && "ContactsManager" in window;
}

function importSheet() {
  imp = { items: [], picked: new Set(), error: "" };
  openSheet(`<h2>Εισαγωγή επαφών</h2><div id="imp-body">${importChooser()}</div>`, "send-sheet");
}

function importChooser() {
  return `${imp.error ? `<p class="map-status bad">${esc(imp.error)}</p>` : ""}
    <div class="imp-actions">
      ${contactsSupported() ? `<button class="solid big" type="button" data-action="imp-device">${icon("users")}Από τις επαφές του κινητού</button>` : ""}
      <label class="${contactsSupported() ? "ghost" : "solid"} big file-btn imp-file">${icon("import")}Από αρχείο επαφών<input type="file" id="imp-file" hidden></label>
    </div>
    <details class="imp-help">
      <summary>Πώς βγάζω το αρχείο επαφών</summary>
      <p><b>Android:</b> Επαφές → ☰ → Ρυθμίσεις → Εξαγωγή → αποθήκευση ως <b>.vcf</b>.</p>
      <p><b>iPhone:</b> Μπες στο icloud.com/contacts, επίλεξε όλες τις επαφές (Cmd/Ctrl+A), πάτα το γρανάζι → Εξαγωγή vCard.</p>
      <p><b>Google Επαφές:</b> contacts.google.com → Εξαγωγή → vCard ή Google CSV.</p>
      <p>Δουλεύει και αρχείο Excel που έχεις αποθηκεύσει ως <b>.csv</b> με στήλες όνομα, τηλέφωνο, διεύθυνση.</p>
    </details>`;
}

function importPreview() {
  const items = imp.items;
  const fresh = items.filter((i) => !i.dup).length;
  const allOn = items.length && items.every((_, idx) => imp.picked.has(idx));
  return `<div class="recip-head"><label class="check mini"><input type="checkbox" data-imp-all ${allOn ? "checked" : ""}><span class="box">${icon("check")}</span><span class="check-text">Όλες (${items.length})</span></label>
      <span class="count">${imp.picked.size} επιλεγμένες${items.length - fresh ? ` · ${items.length - fresh} υπάρχουν ήδη` : ""}</span></div>
    <div class="recip-list imp-list">${items.map((c, idx) => `<label class="recip${imp.picked.has(idx) ? " on" : ""}">
        <input type="checkbox" data-imp-pick="${idx}"${imp.picked.has(idx) ? " checked" : ""}>
        <span class="box">${icon("check")}</span>
        <span class="recip-info"><strong>${esc(c.name)}</strong><small>${esc(c.phone)}${c.address ? ` · ${esc(c.address)}` : ""}${c.dup ? " · υπάρχει ήδη" : ""}</small></span>
      </label>`).join("")}</div>
    <div class="send-bar">${imp.picked.size
    ? `<button class="solid big" type="button" data-action="imp-confirm">${icon("check")}Εισαγωγή ${imp.picked.size} επαφών</button>`
    : `<button class="solid big" type="button" disabled>Διάλεξε επαφές</button>`}</div>`;
}

function showImportPreview() {
  const body = document.getElementById("imp-body");
  if (!body) return;
  body.innerHTML = imp.items.length ? importPreview() : importChooser();
}

function loadImportItems(parsed) {
  imp.items = buildImportItems(parsed);
  imp.picked = new Set(imp.items.map((c, idx) => (c.dup ? -1 : idx)).filter((idx) => idx >= 0));
  imp.error = imp.items.length ? "" : "Δεν βρήκα επαφές με όνομα και τηλέφωνο σε αυτό το αρχείο.";
  showImportPreview();
}

async function importFromDevice() {
  try {
    const picked = await navigator.contacts.select(["name", "tel", "address"], { multiple: true });
    loadImportItems(picked.map((c) => ({
      name: (c.name || [])[0] || "",
      phones: c.tel || [],
      address: ((c.address || [])[0] && [].concat(c.address[0].addressLine || [], c.address[0].city || [], c.address[0].postalCode || []).filter(Boolean).join(", ")) || "",
    })));
  } catch {
    imp.error = "Δεν έγινε επιλογή επαφών.";
    showImportPreview();
  }
}

function importFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    const parsed = /BEGIN:VCARD/i.test(text) ? parseVCF(text) : parseCSV(text);
    loadImportItems(parsed);
  };
  reader.onerror = () => { imp.error = "Δεν μπόρεσα να διαβάσω το αρχείο."; showImportPreview(); };
  reader.readAsText(file);
}

function importConfirm() {
  const chosen = imp.items.filter((_, idx) => imp.picked.has(idx));
  if (!chosen.length) return;
  chosen.slice().reverse().forEach((c) => {
    state.customers.unshift({
      id: uid("c"), name: c.name, address: c.address, isBuilding: false, hasApts: false, manholes: false,
      scope: "", categories: [], floorPrice: "", cost: "", apartments: "", phone: c.phone, phone2: c.phone2,
      lastDate: "", pest: "", notes: "", lat: "", lng: "", mapsUrl: "",
    });
  });
  save();
  pushNote("Πελατολόγιο", `Εισήχθησαν ${chosen.length} επαφές.`, false);
  closeSheet();
  go("customers");
  toast(`Προστέθηκαν ${chosen.length} πελάτες.`);
}
