function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3200);
}
function isTyping() {
  const el = document.activeElement;
  return Boolean(el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && viewEl.contains(el));
}
function rerenderSafely() {
  if (!sheetEl.hidden || isTyping()) {
    renderLater = true;
    return;
  }
  render();
}

function afterSave(date) {
  picked = date;
  weekStart = mondayOf(date);
  closeSheet();
  view = date === todayISO() ? "home" : "week";
  render();
}

document.getElementById("theme").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  persist();
  applyTheme();
  render();
});
document.getElementById("bell").addEventListener("click", notesSheet);

document.body.addEventListener("click", (event) => {
  if (!event.target.closest("#cust-picker")) closePicker();
  if (event.target.closest("a")) return;
  const target = event.target.closest("[data-view], [data-action]");
  if (!target) return;
  if (target.dataset.view) {
    go(target.dataset.view);
    return;
  }
  const [action, arg] = String(target.dataset.action).split(":");
  const id = target.dataset.id;
  const value = target.dataset.v;
  switch (action) {
    case "close": closeSheet(); break;
    case "more": moreSheet(); break;
    case "love": loveSheet(); break;
    case "pick-customer": choosePicker(id); break;
    case "add-customer-from-appt": newCustomerFromAppt(target.dataset.q); break;
    case "appt": apptSheet(id); break;
    case "customer": customerSheet(id); break;
    case "new-customer": customerForm(); break;
    case "import-contacts": importSheet(); break;
    case "imp-device": importFromDevice(); break;
    case "imp-confirm": importConfirm(); break;
    case "edit-customer": customerForm(customer(id)); break;
    case "new-appt": apptForm(null, { customerId: id }); break;
    case "new-appt-day": apptForm(null, { date: target.dataset.date, prefill: target.dataset.time ? { time: target.dataset.time } : undefined }); break;
    case "pick-phone": phoneSheet(id, value); break;
    case "appt-for": apptForm(null, { customerId: id }); break;
    case "edit-appt": apptForm(apptById(id)); break;
    case "repeat-appt": repeatAppt(id); break;
    case "outcome": outcomeSheet(id, "paid"); break;
    case "outcome-no": outcomeSheet(id, "cancel"); break;
    case "outcome-tab": outcomeSheet(id, value); break;
    case "pick-day": picked = target.dataset.date; render(); break;
    case "prev-month": cal = new Date(cal.getFullYear(), cal.getMonth() - 1, 1); render(); break;
    case "next-month": cal = new Date(cal.getFullYear(), cal.getMonth() + 1, 1); render(); break;
    case "week-prev": weekStart = addDays(weekStart, -7); render(); break;
    case "week-next": weekStart = addDays(weekStart, 7); render(); break;
    case "week-today": weekStart = mondayOf(todayISO()); render(); break;
    case "scroll": scrollToSection(arg); break;
    case "go-week": go("week"); break;
    case "go-dashboard": go("dashboard"); break;
    case "toggle-theme": document.getElementById("theme").click(); break;
    case "read-all": state.notifications.forEach((n) => { n.read = true; }); persist(); notesSheet(); break;
    case "enable-push": enablePush(); break;
    case "restore-appt": restoreAppt(id); closeSheet(); render(); toast("Το ραντεβού επανήλθε στο πρόγραμμα."); break;
    case "delete-appt":
      if (confirm("Να διαγραφεί οριστικά αυτό το ραντεβού;")) {
        state.appointments = state.appointments.filter((a) => a.id !== id);
        save();
        closeSheet();
        render();
        toast("Το ραντεβού διαγράφηκε.");
      }
      break;
    case "delete-customer":
      if (confirm("Να διαγραφεί ο πελάτης και όλα τα ραντεβού του;")) {
        removeCustomer(id);
        go("customers");
        toast("Ο πελάτης διαγράφηκε.");
      }
      break;
    case "filter-cat": custFilter.cat = value; refreshCustomerList(); break;
    case "filter-rating": custFilter.rating = value; refreshCustomerList(); break;
    case "dash-range": dashRange = value; render(); break;
    case "chart-tip": {
      const tip = target.closest(".chart-card")?.querySelector(".chart-tip");
      if (tip) tip.textContent = target.dataset.tip;
      break;
    }
    case "msg-customer":
      msgSelected = new Set([id]);
      msgSearch = "";
      go("messages");
      break;
    case "msg-cat": msgFilter.cat = value; refreshMessageParts(); break;
    case "msg-owe": msgFilter.owe = !msgFilter.owe; refreshMessageParts(); break;
    case "ph-insert": {
      const box = document.querySelector("#tpl-form textarea[name=text]");
      if (!box) break;
      const start = box.selectionStart ?? box.value.length;
      box.setRangeText(value, start, box.selectionEnd ?? start, "end");
      box.focus();
      break;
    }
    case "tpl-send": sendSheet(id); break;
    case "tpl-new": templateForm(null); break;
    case "tpl-edit": templateForm(id); break;
    case "tpl-delete":
      if (confirm("Να διαγραφεί αυτό το μήνυμα;")) {
        state.templates = state.templates.filter((t) => t.id !== id);
        if (msgTemplateId === id) msgTemplateId = "";
        save();
        closeSheet();
        render();
      }
      break;
    case "cat-remove":
      state.settings.categories = state.settings.categories.filter((c) => c !== value);
      save();
      render();
      break;
    case "logo-reset": state.settings.logo = ""; save(); render(); break;
    case "sync-now": syncNow(); break;
    case "sync-off": disconnectSync(); render(); break;
    case "gen-code": {
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      const code = `nv-${[...bytes].map((b) => (b % 36).toString(36)).join("")}`;
      const input = document.getElementById("sync-code");
      if (input) input.value = code;
      break;
    }
    default: break;
  }
});

document.body.addEventListener("change", (event) => {
  const el = event.target;
  if (el.form && el.form.id === "appt-form" && ["date", "time", "duration"].includes(el.name)) refreshAgenda();
  if (el.type === "date" && el.name === "date") {
    const hint = el.closest("label") && el.closest("label").querySelector(".day-hint");
    if (hint) hint.textContent = dayName(el.value);
  }
  if (el.name === "customerId" && el.form && el.form.id === "appt-form") {
    const slot = document.getElementById("appt-loc");
    const person = customer(el.value);
    if (slot) slot.outerHTML = apptLocation(person);
    applyCustomerDefaults(person);
    if (person && !person.lat) scheduleMapAddress();
    return;
  }
  if (el.id === "imp-file" && el.files[0]) {
    importFromFile(el.files[0]);
    return;
  }
  if (el.dataset && el.dataset.impPick !== undefined) {
    const idx = Number(el.dataset.impPick);
    if (el.checked) imp.picked.add(idx);
    else imp.picked.delete(idx);
    showImportPreview();
    return;
  }
  if (el.dataset && "impAll" in el.dataset) {
    imp.picked = el.checked ? new Set(imp.items.map((_, i) => i)) : new Set();
    showImportPreview();
    return;
  }
  if (el.dataset && el.dataset.msgPick) {
    if (el.checked) msgSelected.add(el.dataset.msgPick);
    else msgSelected.delete(el.dataset.msgPick);
    refreshMessageParts();
    return;
  }
  if (el.dataset && "msgAll" in el.dataset) {
    recipients().forEach((c) => {
      if (!has(c.phone)) return;
      if (el.checked) msgSelected.add(c.id);
      else msgSelected.delete(c.id);
    });
    refreshMessageParts();
    return;
  }
  if (el.id === "logo-file" && el.files[0]) {
    readLogo(el.files[0]).then((data) => {
      if (!data) { toast("Δεν μπόρεσα να διαβάσω την εικόνα."); return; }
      state.settings.logo = data;
      save();
      render();
      toast("Το λογότυπο άλλαξε.");
    });
  }
});

function readLogo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 420 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL("image/png");
      if (data.length > 350000) data = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
    img.src = url;
  });
}

document.body.addEventListener("focusin", (event) => {
  if (event.target.id !== "cust-search") return;
  event.target.select();
  openPicker("");
});
function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) { toast(sectionId === "home-pending" ? "Δεν υπάρχουν εκκρεμείς πληρωμές." : "Δεν βρέθηκε."); return; }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.body.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches && event.target.matches(".kpi.click")) {
    event.preventDefault();
    event.target.click();
    return;
  }
  if (!event.target.closest || !event.target.closest("#cust-picker")) return;
  const { input, list } = pickerParts();
  const items = [...list.querySelectorAll(".picker-item")];
  const current = items.indexOf(document.activeElement);
  if (event.key === "Enter") {
    event.preventDefault();
    if (list.hidden) openPicker(input.value);
    else if (items.length) choosePicker((items[current] || items[0]).dataset.id);
  } else if (event.key === "Escape") {
    if (!list.hidden) {
      event.preventDefault();
      closePicker();
      input.focus();
    }
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    if (list.hidden) openPicker(input.value);
    else if (items.length) items[Math.min(current + 1, items.length - 1)].focus();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    if (current > 0) items[current - 1].focus();
    else input.focus();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !event.defaultPrevented && !sheetEl.hidden) closeSheet();
});

document.body.addEventListener("input", (event) => {
  const el = event.target;
  if (el.id === "cust-search") {
    const { id, error } = pickerParts();
    const hadCustomer = Boolean(id.value);
    id.value = "";
    error.hidden = true;
    if (hadCustomer) id.dispatchEvent(new Event("change", { bubbles: true }));
    openPicker(el.value);
    return;
  }
  if (el.id === "search") { query = el.value; refreshCustomerList(); return; }
  if (el.id === "msg-search") { msgSearch = el.value; refreshMessageParts(); return; }
  if (el.id === "msg-text") {
    msgText = el.value;
    const send = document.getElementById("msg-send");
    if (send) send.innerHTML = sendPanel();
    return;
  }
  if (el.form && el.form.id === "appt-form" && ["time", "duration"].includes(el.name)) refreshAgenda();
  if (el.id === "map-address") scheduleMapAddress();
  if (el.id === "maps-url") refreshMapFromLink();
});

let mapTimer;
function scheduleMapAddress() {
  clearTimeout(mapTimer);
  mapTimer = setTimeout(refreshMapAddress, 800);
}
function currentMapAddress() {
  const field = document.getElementById("map-address");
  if (field) return field.value.trim();
  const box = document.querySelector(".map-pick[data-address]");
  return box ? box.dataset.address.trim() : "";
}
let geoToken = 0;
function refreshMapAddress() {
  const lat = document.getElementById("map-lat");
  const lng = document.getElementById("map-lng");
  if (lat && lat.value && lat.dataset.auto !== "1") return;
  const address = currentMapAddress();
  const frame = document.getElementById("map-frame");
  const open = document.getElementById("open-gmaps");
  const status = document.getElementById("map-status");
  if (frame) frame.src = embedSrc("", "", address);
  if (open) open.href = mapsLink(address);
  if (lat) { lat.value = ""; lng.value = ""; lat.dataset.auto = "1"; }
  if (status) { status.textContent = address ? "Ψάχνω τη διεύθυνση στον χάρτη…" : ""; status.className = "map-status"; }
  if (!address || !lat) return;
  const token = ++geoToken;
  geocode(address).then((found) => {
    if (token !== geoToken || lat.dataset.auto !== "1" || !document.body.contains(lat)) return;
    if (found) {
      lat.value = found.lat;
      lng.value = found.lng;
      if (frame) frame.src = embedSrc(found.lat, found.lng);
      if (open) open.href = mapsLink({ lat: found.lat, lng: found.lng });
      if (status) { status.textContent = "Βρέθηκε αυτόματα από τη διεύθυνση. Έλεγξε στον χάρτη ότι είναι σωστό."; status.className = "map-status ok"; }
    } else if (status) {
      status.textContent = "Δεν βρέθηκε αυτόματα. Θα χρησιμοποιηθεί η διεύθυνση όπως την έγραψες.";
      status.className = "map-status";
    }
  });
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
    lat.dataset.auto = "1";
    refreshMapAddress();
    return;
  }
  const parsed = parseMapsUrl(link.value);
  if (parsed && parsed.lat) {
    lat.value = parsed.lat;
    lng.value = parsed.lng;
    lat.dataset.auto = "0";
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
  lat.dataset.auto = "0";
  if (!status) return;
  status.className = "map-status bad";
  status.textContent = parsed && parsed.short
    ? "Αυτός είναι σύντομος σύνδεσμος. Άνοιξέ τον, πάτα ξανά Κοινοποίηση και αντέγραψε τον πλήρη."
    : "Ο σύνδεσμος δεν έχει ακριβές σημείο. Χρησιμοποίησε Κοινοποίηση από το Google Maps.";
}

function mapStatusError(parsed, fallback) {
  const manual = document.querySelector(".map-manual");
  if (manual) manual.open = true;
  const status = document.getElementById("map-status");
  if (!status) return;
  status.textContent = parsed && parsed.short
    ? "Άνοιξε τον σύντομο σύνδεσμο και αντέγραψε τον πλήρη από το Google Maps."
    : fallback;
  status.className = "map-status bad";
}

document.body.addEventListener("submit", (event) => {
  const form = event.target;
  event.preventDefault();

  if (form.id === "customer-form") {
    const data = formData(form);
    const existing = customer(form.dataset.id);
    const parsedPin = parseMapsUrl(data.mapsUrl);
    if (parsedPin && parsedPin.lat) {
      data.lat = parsedPin.lat;
      data.lng = parsedPin.lng;
    }
    if (!data.lat || !data.lng) {
      if (data.mapsUrl) {
        mapStatusError(parsedPin, "Αυτός ο σύνδεσμος δεν έχει ακριβές σημείο. Διόρθωσέ τον ή άδειασε το πεδίο για να χρησιμοποιηθεί η διεύθυνση.");
        return;
      }
      data.lat = "";
      data.lng = "";
      data.mapsUrl = "";
    }
    data.isBuilding = form.elements.isBuilding.checked;
    data.hasApts = form.elements.hasApts.checked;
    data.manholes = form.elements.manholes.checked;
    data.categories = [...form.querySelectorAll('input[name="categories"]:checked')].map((el) => el.value);
    data.scope = data.isBuilding ? "Ολόκληρη πολυκατοικία" : data.hasApts ? "Μεμονωμένα διαμερίσματα" : "";
    if (existing) Object.assign(existing, data);
    else state.customers.unshift({ id: uid("c"), ...data });
    save();
    pushNote("Πελατολόγιο", `Αποθηκεύτηκε ο πελάτης ${data.name}.`, false);
    if (form.dataset.return) {
      backToApptWith(state.customers[0].id);
      toast(`Προστέθηκε ο πελάτης ${data.name}.`);
      return;
    }
    closeSheet();
    go("customers");
    toast(`Αποθηκεύτηκε ο πελάτης ${data.name}.`);
    return;
  }

  if (form.id === "appt-form") {
    const data = formData(form);
    if (!form.dataset.id && data.date < todayISO()) {
      toast("Δεν μπορείς να βάλεις ραντεβού σε μέρα που πέρασε.");
      return;
    }
    const clash = findClash(data.date, data.time, data.duration, form.dataset.id);
    if (clash) {
      refreshAgenda();
      toast(`Δεν γίνεται: ${clashText(clash)}`);
      return;
    }
    const person = customer(data.customerId);
    if (!person) {
      const { error, input } = pickerParts();
      if (error) error.hidden = false;
      if (input) input.focus();
      return;
    }
    const parsed = parseMapsUrl(data.mapsUrl);
    if (parsed && parsed.lat) {
      person.lat = parsed.lat;
      person.lng = parsed.lng;
      person.mapsUrl = data.mapsUrl;
    }
    if (!(parsed && parsed.lat) && !person.lat && data.lat && data.lng) {
      person.lat = data.lat;
      person.lng = data.lng;
    }
    if (has(data.mapsUrl) && !(parsed && parsed.lat)) {
      mapStatusError(parsed, "Αυτός ο σύνδεσμος δεν έχει ακριβές σημείο. Διόρθωσέ τον ή άδειασε το πεδίο.");
      return;
    }
    if (person.lat && person.lng) {
      data.lat = person.lat;
      data.lng = person.lng;
    }
    delete data.mapsUrl;
    data.manholes = form.elements.manholes.checked ? "Ναι" : "";
    data.repeat = data.repeat || "";
    if (!data.cost) data.cost = person.cost || "";
    const existing = apptById(form.dataset.id);
    if (existing) {
      Object.assign(existing, data);
      pushLog(existing, "edited");
    } else {
      state.appointments.push({ id: uid("a"), status: "scheduled", log: [{ kind: "created", at: new Date().toISOString(), from: form.dataset.from || "" }], ...data });
    }
    save();
    afterSave(data.date);
    toast(`Ραντεβού ${data.time} · ${person.name} · ${longDate(data.date)}`);
    pushNote("Ραντεβού", `${data.time} · ${person.name} · ${longDate(data.date)}`, true);
    return;
  }

  if (form.id === "move-form") {
    const appt = apptById(form.dataset.id);
    const next = formData(form).date;
    if (!appt || !next || next === appt.date) return;
    if (next < todayISO()) { toast("Δεν μπορείς να μεταφέρεις ραντεβού σε μέρα που πέρασε."); return; }
    const moveClash = findClash(next, appt.time, appt.duration, appt.id);
    if (moveClash) { toast(`Δεν γίνεται: ${clashText(moveClash)}`); return; }
    appt.log = appt.log || [];
    appt.log.push({ kind: "moved", from: appt.date, to: next });
    appt.date = next;
    appt.status = "scheduled";
    appt.promptedAt = "";
    save();
    afterSave(next);
    const person = customer(appt.customerId);
    toast(`${person ? person.name : "Ραντεβού"} πήγε στις ${longDate(next)}.`);
    pushNote("Μεταφορά", `${person ? person.name : "Ραντεβού"} πήγε στις ${longDate(next)}.`, false);
    return;
  }

  if (form.id === "outcome-form") {
    const data = formData(form);
    const id = form.dataset.id;
    const appt = apptById(id);
    const person = appt && customer(appt.customerId);
    if (!appt) return;
    const mode = form.dataset.mode;
    if (mode === "paid" || mode === "pay") {
      if (mode === "pay") {
        appt.amount = Number(data.amount) || amountOf(appt);
        markPaid(id, data.method);
      } else {
        finishPaid(id, data.method, data.amount);
      }
      closeSheet();
      render();
      toast(`Πληρώθηκε · ${PAY_METHODS[data.method]} · ${euro(amountOf(appt))}`);
      if (mode === "paid" && appt.repeat) repeatAppt(id);
    } else if (mode === "pending") {
      finishPending(id, data.amount, data.note);
      closeSheet();
      render();
      toast(`Αναμένεται πληρωμή ${euro(amountOf(appt))} από ${person ? person.name : "τον πελάτη"}.`);
      if (appt.repeat) repeatAppt(id);
    } else if (mode === "postpone") {
      const postponeClash = findClash(data.date, data.time, appt.duration, id);
      if (postponeClash) { toast(`Δεν γίνεται: ${clashText(postponeClash)}`); return; }
      const copy = postponeAppt(id, data.date, data.time, data.reason);
      closeSheet();
      if (copy) afterSave(copy.date);
      toast(`Αναβλήθηκε για ${longDate(data.date)}.`);
    } else if (mode === "cancel") {
      if (data.reason === "other" && !has(data.text)) {
        const input = document.getElementById("cancel-text");
        if (input) { input.required = true; input.focus(); input.reportValidity(); }
        return;
      }
      cancelAppt(id, data.reason, data.text);
      closeSheet();
      render();
      toast("Το ραντεβού ακυρώθηκε και μπήκε στο ιστορικό.");
    }
    return;
  }

  if (form.id === "profile-form") {
    const data = formData(form);
    state.settings.businessName = data.businessName || state.settings.businessName;
    state.settings.adminPhone = data.adminPhone || "";
    if (data.workStart && data.workEnd && data.workEnd > data.workStart) {
      state.settings.workStart = data.workStart;
      state.settings.workEnd = data.workEnd;
    }
    save();
    render();
    toast("Αποθηκεύτηκε.");
    return;
  }
  if (form.id === "cat-form") {
    const name = formData(form).name;
    if (name && !state.settings.categories.some((c) => fold(c) === fold(name))) {
      const list = state.settings.categories;
      const otherIdx = list.indexOf("Άλλο");
      state.settings.categories = otherIdx >= 0 ? [...list.slice(0, otherIdx), name, ...list.slice(otherIdx)] : [...list, name];
      save();
      toast(`Προστέθηκε η κατηγορία ${name}.`);
    }
    render();
    return;
  }
  if (form.id === "sync-form") {
    const code = formData(form).code;
    if (code.length < 12) return;
    connectSync(code);
    render();
    return;
  }
  if (form.id === "tpl-form") {
    const data = formData(form);
    const existing = state.templates.find((t) => t.id === form.dataset.id);
    if (existing) Object.assign(existing, data);
    else {
      state.templates.push({ id: uid("t"), ...data });
    }
    save();
    closeSheet();
    render();
    return;
  }
});

async function enablePush() {
  if (!("Notification" in window)) {
    openSheet("<h2>Ειδοποιήσεις</h2><p class=\"note\">Αυτό το πρόγραμμα δεν δείχνει ειδοποιήσεις οθόνης.</p>");
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    await phoneNotify("Νίκος Βλάχος", "Οι ειδοποιήσεις έρχονται και στο τηλέφωνο.");
  } else if (permission === "denied") {
    toast("Οι ειδοποιήσεις είναι μπλοκαρισμένες. Ενεργοποίησέ τες από τις ρυθμίσεις του browser για αυτή τη σελίδα.");
  }
  render();
}

onRemoteChange = rerenderSafely;
onSyncStatus = () => {
  paintSync();
  if (view === "profile" && sheetEl.hidden && !isTyping()) render();
};
document.addEventListener("focusout", () => {
  setTimeout(() => {
    if (renderLater && sheetEl.hidden && !isTyping()) {
      renderLater = false;
      render();
    }
  }, 300);
});

let dueSignature = dueAppointments().map((a) => a.id).join();
function tick() {
  checkOutcomes();
  const signature = dueAppointments().map((a) => a.id).join();
  if (signature !== dueSignature) {
    dueSignature = signature;
    if (sheetEl.hidden && !isTyping()) render();
  }
}

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

buildNav();
applyTheme();
render();
dailyReminder();
checkOutcomes();
render();
setInterval(tick, 60000);
syncNow();
