let dashRange = "month";
const PALETTE = ["var(--c-green)", "var(--c-blue)", "var(--c-amber)", "var(--c-violet)", "var(--c-teal)", "var(--c-orange)", "var(--c-red)"];
const DASH_RANGES = [["week", "Εβδομάδα"], ["month", "Μήνας"], ["quarter", "3 μήνες"], ["year", "Έτος"], ["all", "Όλα"]];

function dashBounds() {
  const today = todayISO();
  const now = new Date();
  if (dashRange === "week") return { from: mondayOf(today), to: addDays(mondayOf(today), 6), label: "Αυτή την εβδομάδα" };
  if (dashRange === "month") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)), label: `${MONTHS[now.getMonth()]} ${now.getFullYear()}` };
  if (dashRange === "quarter") return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)), label: "Τελευταίοι 3 μήνες" };
  if (dashRange === "year") return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31`, label: `Έτος ${now.getFullYear()}` };
  return { from: "0000-01-01", to: "9999-12-31", label: "Όλο το ιστορικό" };
}

function donutSVG(items, centerTop, centerBottom) {
  const total = items.reduce((t, i) => t + i.value, 0);
  if (!total) return '<p class="empty small">Δεν υπάρχουν δεδομένα για αυτή την περίοδο.</p>';
  const r = 38;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const rings = items.filter((i) => i.value > 0).map((item) => {
    const len = (item.value / total) * c;
    const ring = `<circle class="seg" cx="60" cy="60" r="${r}" fill="none" stroke-width="16" style="stroke:${item.color}" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 60 60)" data-action="chart-tip" data-tip="${esc(item.tip)}"/>`;
    offset += len;
    return ring;
  }).join("");
  return `<svg class="donut" viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="${r}" fill="none" stroke-width="16" class="track"/>${rings}
    <text x="60" y="58" text-anchor="middle" class="d-top">${esc(centerTop)}</text><text x="60" y="73" text-anchor="middle" class="d-bottom">${esc(centerBottom)}</text></svg>`;
}
function legend(items, fmt) {
  return `<ul class="legend">${items.filter((i) => i.value > 0).map((i) => `<li data-action="chart-tip" data-tip="${esc(i.tip)}"><i style="background:${i.color}"></i><span>${esc(i.label)}</span><b>${fmt(i.value)}</b></li>`).join("")}</ul>`;
}
function barsSVG(items, unit = "") {
  const max = Math.max(1, ...items.map((i) => i.parts.reduce((t, p) => t + p.value, 0)));
  const w = 52;
  const h = 150;
  const W = items.length * w + 12;
  const bars = items.map((item, idx) => {
    const x = 8 + idx * w;
    let y = h;
    const total = item.parts.reduce((t, p) => t + p.value, 0);
    const rects = item.parts.map((p) => {
      const bh = (p.value / max) * (h - 16);
      y -= bh;
      return bh > 0 ? `<rect x="${x + 6}" y="${y.toFixed(1)}" width="${w - 20}" height="${bh.toFixed(1)}" rx="5" style="fill:${p.color}"/>` : "";
    }).join("");
    return `<g class="bar-g" data-action="chart-tip" data-tip="${esc(item.tip)}"><rect x="${x}" y="0" width="${w - 8}" height="${h + 18}" fill="transparent"/>${rects}
      ${total ? `<text x="${x + (w - 8) / 2}" y="${(y - 4).toFixed(1)}" text-anchor="middle" class="b-val">${esc(Number.isInteger(total) ? total : total.toFixed(0))}${unit}</text>` : ""}
      <text x="${x + (w - 8) / 2}" y="${h + 14}" text-anchor="middle" class="b-lab">${esc(item.label)}</text></g>`;
  }).join("");
  return `<div class="bars-wrap"><svg class="bars" style="min-width:${items.length * 40}px" viewBox="0 0 ${W} ${h + 22}" role="img"><line x1="0" y1="${h}" x2="${W}" y2="${h}" class="axis"/>${bars}</svg></div>`;
}
function hbars(items, fmt) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return `<div class="hbars">${items.map((i) => `<div class="hbar" data-action="chart-tip" data-tip="${esc(i.tip || `${i.label}: ${fmt(i.value)}`)}">
      <span class="hb-label">${esc(i.label)}</span>
      <span class="hb-track"><span class="hb-fill" style="width:${((i.value / max) * 100).toFixed(1)}%;background:${i.color}"></span></span>
      <b>${fmt(i.value)}</b></div>`).join("")}</div>`;
}
function chartCard(title, body, hint = "Πάτα σε ένα στοιχείο για λεπτομέρειες.") {
  return `<section class="panel chart-card"><h3>${title}</h3>${body}<p class="chart-tip">${hint}</p></section>`;
}

function renderDashboard() {
  const { from, to, label } = dashBounds();
  const inRange = state.appointments.filter((a) => a.date >= from && a.date <= to && a.status !== "postponed");
  const done = inRange.filter((a) => a.status === "done");
  const pend = inRange.filter((a) => a.status === "pending");
  const canc = inRange.filter((a) => a.status === "cancelled");
  const upcoming = inRange.filter(isActive);
  const revenue = done.reduce((t, a) => t + amountOf(a), 0);
  const pendTotal = pend.reduce((t, a) => t + amountOf(a), 0);
  const finished = done.length + pend.length + canc.length;
  const rate = finished ? Math.round((canc.length / finished) * 100) : 0;
  const avg = done.length ? revenue / done.length : 0;
  const allPending = pendingPayments().reduce((t, a) => t + amountOf(a), 0);

  const monthsBack = dashRange === "year" || dashRange === "all" ? 12 : 6;
  const now = new Date();
  const monthly = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const list = state.appointments.filter((a) => a.date.startsWith(key));
    const paid = list.filter((a) => a.status === "done").reduce((t, a) => t + amountOf(a), 0);
    const wait = list.filter((a) => a.status === "pending").reduce((t, a) => t + amountOf(a), 0);
    return { label: MONTHS_SHORT[d.getMonth()], parts: [{ value: paid, color: "var(--c-green)" }, { value: wait, color: "var(--c-orange)" }], tip: `${MONTHS[d.getMonth()]} ${d.getFullYear()}: ${euro(paid)} εισπράχθηκαν${wait ? `, ${euro(wait)} αναμένονται` : ""}` };
  });

  const catCount = {};
  inRange.filter((a) => a.status !== "cancelled").forEach((a) => { const k = a.service || "Άλλο"; catCount[k] = (catCount[k] || 0) + 1; });
  const catItems = Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ label: k, value: v, color: PALETTE[i % PALETTE.length], tip: `${k}: ${v} ${v === 1 ? "ραντεβού" : "ραντεβού"}` }));

  const cash = [...done, ...pend].filter((a) => a.payMethod === "cash").reduce((t, a) => t + amountOf(a), 0);
  const card = [...done, ...pend].filter((a) => a.payMethod === "card").reduce((t, a) => t + amountOf(a), 0);
  const payItems = [
    { label: "Μετρητά", value: cash, color: "var(--c-green)", tip: `Μετρητά: ${euro(cash)}` },
    { label: "Κάρτα", value: card, color: "var(--c-blue)", tip: `Κάρτα: ${euro(card)}` },
    { label: "Αναμένονται", value: pendTotal, color: "var(--c-orange)", tip: `Αναμένονται: ${euro(pendTotal)}` }
  ];

  const weekdayCounts = WEEKDAYS.map((name, i) => ({
    label: name.slice(0, 3),
    parts: [{ value: inRange.filter((a) => a.status !== "cancelled" && (parseISO(a.date).getDay() + 6) % 7 === i).length, color: "var(--c-blue)" }],
    tip: ""
  }));
  weekdayCounts.forEach((w, i) => { w.tip = `${WEEKDAYS[i]}: ${w.parts[0].value} ραντεβού`; });

  const statusItems = [
    { label: "Ολοκληρώθηκαν", value: done.length, color: "var(--c-green)" },
    { label: "Αναμένεται πληρωμή", value: pend.length, color: "var(--c-orange)" },
    { label: "Προγραμματισμένα", value: upcoming.length, color: "var(--c-blue)" },
    { label: "Ακυρώθηκαν", value: canc.length, color: "var(--c-red)" }
  ].filter((i) => i.value > 0).map((i) => ({ ...i, tip: `${i.label}: ${i.value}` }));

  const cancelCount = {};
  canc.forEach((a) => { const k = (a.cancel && a.cancel.label) || "Χωρίς λόγο"; cancelCount[k] = (cancelCount[k] || 0) + 1; });
  const cancelItems = Object.entries(cancelCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, color: "var(--c-red)", tip: `${k}: ${v}` }));

  const rated = state.customers.map((c) => ({ c, r: ratingOf(c) })).filter((x) => x.r.score != null);
  const best = [...rated].sort((a, b) => b.r.score - a.r.score || b.r.visits - a.r.visits).slice(0, 5);
  const watch = rated.filter((x) => x.r.score < 80).sort((a, b) => a.r.score - b.r.score).slice(0, 5);
  const revenueBy = state.customers.map((c) => ({ c, total: state.appointments.filter((a) => a.customerId === c.id && a.status === "done" && a.date >= from && a.date <= to).reduce((t, a) => t + amountOf(a), 0) }))
    .filter((x) => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  const personRow = ({ c, r }) => `<button type="button" class="person-row" data-action="customer" data-id="${esc(c.id)}"><span><strong>${esc(c.name)}</strong><small>${esc(areaOf(c.address))}</small></span>${ratingBadge(c, false)}</button>`;

  viewEl.innerHTML = `<div class="row dash-head"><div><h2 class="section-label">ΣΤΑΤΙΣΤΙΚΑ</h2><p class="sub">${esc(label)}</p></div></div>
    <div class="fchips range-chips">${DASH_RANGES.map(([k, l]) => `<button type="button" class="fchip${dashRange === k ? " on" : ""}" data-action="dash-range" data-v="${k}">${l}</button>`).join("")}</div>
    <div class="kpis dash-kpis">
      ${kpi("Έσοδα", esc(euro(revenue)), "green", `${done.length} ${done.length === 1 ? "επίσκεψη" : "επισκέψεις"}`)}
      ${kpi("Αναμένονται", esc(euro(pendTotal)), "orange", allPending !== pendTotal ? `Συνολικά ${esc(euro(allPending))}` : `${pend.length} πληρωμές`)}
      ${kpi("Μέσο ποσό", esc(euro(Math.round(avg))), "blue", "ανά επίσκεψη")}
      ${kpi("Ακυρώσεις", `${rate}%`, rate > 20 ? "red" : "teal", `${canc.length} από ${finished}`)}
    </div>
    <div class="chart-grid">
      ${chartCard("Έσοδα ανά μήνα", `${barsSVG(monthly, "€")}<p class="legend-inline"><i style="background:var(--c-green)"></i>Εισπράχθηκαν <i style="background:var(--c-orange)"></i>Αναμένονται</p>`)}
      ${chartCard("Κατηγορίες εργασίας", catItems.length ? `<div class="donut-wrap">${donutSVG(catItems, String(catItems.reduce((t, i) => t + i.value, 0)), "ραντεβού")}${legend(catItems, (v) => v)}</div>` : '<p class="empty small">Δεν υπάρχουν δεδομένα.</p>')}
      ${chartCard("Τρόπος πληρωμής", cash + card + pendTotal ? `<div class="donut-wrap">${donutSVG(payItems, euro(cash + card + pendTotal), "σύνολο")}${legend(payItems, (v) => euro(v))}</div>` : '<p class="empty small">Δεν υπάρχουν πληρωμές ακόμα.</p>')}
      ${chartCard("Ραντεβού ανά ημέρα", barsSVG(weekdayCounts))}
      ${chartCard("Κατάσταση ραντεβού", statusItems.length ? hbars(statusItems, (v) => v) : '<p class="empty small">Δεν υπάρχουν δεδομένα.</p>')}
      ${chartCard("Λόγοι ακύρωσης", cancelItems.length ? hbars(cancelItems, (v) => v) : '<p class="empty small">Καμία ακύρωση σε αυτή την περίοδο.</p>')}
    </div>
    <div class="chart-grid people-grid">
      <section class="panel"><h3>${icon("star")}Καλύτεροι πελάτες</h3>${best.map(personRow).join("") || '<p class="empty small">Η βαθμολογία εμφανίζεται μετά τις πρώτες επισκέψεις.</p>'}</section>
      <section class="panel"><h3>${icon("hourglass")}Θέλουν προσοχή</h3>${watch.map(personRow).join("") || '<p class="empty small">Όλοι οι πελάτες είναι καλοί πληρωτές της ώρας τους.</p>'}</section>
      <section class="panel"><h3>${icon("cash")}Περισσότερα έσοδα</h3>${revenueBy.map(({ c, total }) => `<button type="button" class="person-row" data-action="customer" data-id="${esc(c.id)}"><span><strong>${esc(c.name)}</strong><small>${esc(areaOf(c.address))}</small></span><b class="money-pill">${esc(euro(total))}</b></button>`).join("") || '<p class="empty small">Δεν υπάρχουν έσοδα σε αυτή την περίοδο.</p>'}</section>
    </div>
    <p class="note rating-note">Η βαθμολογία ξεκινά από 100. Αφαιρούνται 5 πόντοι για ακύρωση εγκαίρως, 20 για ακύρωση την τελευταία στιγμή και 35 για μη εμφάνιση. Κακοκαιρία και δικά μου προβλήματα δεν μετράνε.</p>`;
}
