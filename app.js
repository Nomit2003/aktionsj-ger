"use strict";
/* Aktionsjäger v1 – Einkaufsliste mit Preisvergleich für Schweizer Läden.
   - Region: echte Filialsuche über OpenStreetMap (Nominatim + Overpass)
   - Preise: Beispieldaten aus data.js (siehe Hinweis dort)              */

const $ = s => document.querySelector(s);
const CHF = n => "CHF " + n.toFixed(2);
const UNIT_LABEL = { kg: "kg", l: "l", stk: "Stk." };
const store = {
  get(k, d) { try { const v = localStorage.getItem("sk_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("sk_" + k, JSON.stringify(v)); } catch {} },
};

// ---------- Zustand ----------
const state = {
  items: store.get("items", []),                 // [{id, text, productId|null, amount (in kg / l / Stk.), done}]
  activeStores: store.get("activeStores", Object.keys(STORES)),
  region: store.get("region", null),             // {label, lat, lon, radius, found:{brand:[{name,addr,dist}]}}
  maxStores: store.get("maxStores", 99),
  forceStore: store.get("forceStore", null),     // "Alles in einem Laden"-Modus
  favs: store.get("favs", []),                   // Produkt-IDs der Favoriten (= Aktionsalarm)
  history: store.get("history", []),             // abgeschlossene Einkäufe
  own: store.get("own", []),                     // selbst eingetragene Aktionen [{id, store, productId, title, size, price, regular, validTo}]
};
const save = () => { store.set("items", state.items); store.set("activeStores", state.activeStores);
  store.set("region", state.region); store.set("maxStores", state.maxStores); store.set("forceStore", state.forceStore);
  store.set("favs", state.favs); store.set("history", state.history); window.onItemsSaved?.(); };
const isFav = id => state.favs.includes(id);
function toggleFav(id) { state.favs = isFav(id) ? state.favs.filter(x => x !== id) : [...state.favs, id]; save(); }
const pic = p => `<span class="pic" aria-hidden="true">${p?.icon || "🛒"}</span>`;

// ---------- Produkt-Erkennung (tolerant gegenüber Tippfehlern & Mundart) ----------
const norm = s => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
  .replace(/é|è/g, "e").replace(/ß/g, "ss").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[a.length][b.length];
}
function scoreProduct(q, p) {
  const terms = [p.label, p.id, ...p.syn].map(norm);
  let best = 0;
  for (const t of terms) {
    if (t === q) return 100;
    if (t.startsWith(q) && q.length >= 2) best = Math.max(best, 80 - (t.length - q.length));
    else if (q.length >= 4 && (t.includes(q) || (t.length >= 6 && q.includes(t)))) best = Math.max(best, 60);
    else if (q.length >= 4) { const d = lev(q, t); if (d <= (q.length > 7 ? 2 : 1)) best = Math.max(best, 70 - d * 10); }
  }
  return best;
}
// Passt die Eingabe auf eine Kategorie (z.B. "Gemüse", "Käse", "Putzmittel")?
function matchCategories(q) {
  if (!q || !window.CATEGORIES) return [];
  return Object.entries(CATEGORIES).filter(([c, ws]) => [c, ...ws].map(norm).some(w => w === q || (q.length >= 4 && w.startsWith(q)))).map(([c]) => c);
}
function matchProducts(text) {
  const q = norm(text); if (!q) return [];
  const cats = matchCategories(q);
  return PRODUCTS.map((p, i) => { let s = scoreProduct(q, p); if (cats.includes(p.cat)) s = Math.max(s, 85); return { p, s, i }; }).filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.p);
}
const productById = id => PRODUCTS.find(p => p.id === id);

// ---------- Preisberechnung ----------
// ---------- Mengen ----------
const refAmount = p => { const sizes = p.offers.map(o => o[2]).sort((a, b) => a - b); return sizes[Math.floor(sizes.length / 2)]; };
const amt = it => { const p = productById(it.productId); return it.amount ?? (p ? refAmount(p) * (it.qty || 1) : 1); };
const r3 = n => Math.round(n * 1000) / 1000;
function fmtAmount(p, a) {
  if (p.unit === "kg") return a < 1 ? `${Math.round(a * 1000)} g` : `${r3(a)} kg`;
  if (p.unit === "l") return a < 1 ? `${r3(a * 10)} dl` : `${r3(a)} l`;
  return `${r3(a)} Stk.`;
}
const PRESETS = { kg: [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2, 2.5, 5], l: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 9, 12, 18],
  stk: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 24, 30] };
// Liest eine Mengenangabe aus dem Text, z.B. "500g Pouletbrust", "Milch 6 l", "2 Gurken", "5 dl Rahm"
function parseAmount(text) {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|gr|gramm|g|liter|lt|l|dl|cl|ml|stk|stück|stueck|x)?(?![a-zäöü])/i);
  if (!m) return { rest: text, n: null, u: null };
  const n = parseFloat(m[1].replace(",", ".")); const u = (m[2] || "").toLowerCase();
  const rest = (text.slice(0, m.index) + " " + text.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim();
  return { rest, n, u };
}
function toAmount(p, n, u) {
  if (n == null || !(n > 0)) return refAmount(p);
  const f = { kg: 1, kilo: 1, g: 0.001, gr: 0.001, gramm: 0.001, l: 1, lt: 1, liter: 1, dl: 0.1, cl: 0.01, ml: 0.001 }[u];
  const isMass = ["kg", "kilo", "g", "gr", "gramm"].includes(u), isVol = ["l", "lt", "liter", "dl", "cl", "ml"].includes(u);
  if ((p.unit === "kg" && isMass) || (p.unit === "l" && isVol)) return r3(n * f);
  if (p.unit === "stk") return Math.round(n);
  return r3(n * refAmount(p)); // nur eine Zahl → Anzahl Packungen
}
// Packungsgrösse lesbar, z.B. 500 g, 1.5 kg, 7.5 dl, 6 Stk.
function fmtPack(p, size) {
  if (p.unit === "kg") return size < 1 ? `${Math.round(size * 1000)} g` : `${r3(size)} kg`;
  if (p.unit === "l") return size < 1 ? `${r3(size * 10)} dl` : `${r3(size)} l`;
  return `${r3(size)} Stk.`;
}
// Produktname immer mit Packungsgrösse (falls sie nicht schon im Namen steht)
const withSize = (p, name, size) => /\d/.test(name) ? name : `${name} ${fmtPack(p, size)}`;
// Bestes Angebot pro Laden für die gewünschte Menge: wie viele Packungen braucht es, was kostet das?
function offersFor(p, stores, amount = refAmount(p)) {
  return p.offers.filter(o => stores.includes(o[0])).map(([s, name, size, price, regular, meta]) => {
    const packs = Math.max(1, Math.ceil(amount / size - 1e-9));
    return { store: s, live: !!meta && !meta.own && !meta.real, own: !!meta?.own, real: !!meta?.real, est: !meta, validTo: meta?.validTo, url: meta?.url, name: meta ? name : withSize(p, name, size), size, price, regular, promo: regular != null, unitPrice: price / size, packs, cost: packs * price,
      regCost: regular != null ? packs * regular : null };
  }).sort((a, b) => a.cost - b.cost || a.unitPrice - b.unitPrice);
}
// Wählt die Kombination von höchstens N Läden, mit der die ganze Liste am günstigsten ist
// (Vergleich über Preis pro kg/l/Stk., damit unterschiedliche Packungsgrössen fair sind).
function planShopping(force = state.forceStore) {
  const items = state.items.filter(i => i.productId);
  const avail = force && state.activeStores.includes(force) ? [force] : state.activeStores.filter(s => STORES[s]);
  const subsets = [];
  const n = avail.length;
  for (let m = 1; m < (1 << n); m++) {
    const sub = avail.filter((_, i) => m & (1 << i));
    if (sub.length <= state.maxStores) subsets.push(sub);
  }
  let best = null;
  for (const sub of subsets) {
    let cost = 0, missing = 0;
    for (const it of items) {
      const p = productById(it.productId); const o = offersFor(p, sub, amt(it))[0];
      if (!o) { missing++; continue; }
      cost += o.cost;
    }
    // weniger fehlende Artikel zuerst, dann Preis, dann weniger Läden
    const key = [missing, cost, sub.length];
    if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && (key[1] < best.key[1] - 0.005 ||
        (Math.abs(key[1] - best.key[1]) <= 0.005 && key[2] < best.key[2])))) best = { sub, key };
  }
  const chosen = best ? best.sub : [];
  const groups = {}; const missing = [];
  let total = 0, promoSave = 0;
  for (const it of items) {
    const p = productById(it.productId);
    const o = offersFor(p, chosen, amt(it))[0];
    if (!o) { missing.push(it); continue; }
    (groups[o.store] ||= []).push({ it, p, o });
    total += o.cost;
    if (o.promo) promoSave += o.regCost - o.cost;
  }
  // Vergleich: alles im teuersten bzw. im günstigsten Einzelladen
  return { chosen, groups, missing, total, promoSave };
}

// ---------- Rendering: Liste ----------
const initials = id => STORES[id].name.slice(0, 2);
function renderList() {
  const box = $("#itemList"); box.innerHTML = "";
  $("#listEmpty").hidden = state.items.length > 0;
  $("#listActions").hidden = state.items.length === 0;
  renderFavRow();
  const open = state.items.filter(i => !i.done).length;
  $("#tabCount").hidden = !open; $("#tabCount").textContent = open;
  const cats = {};
  for (const it of state.items) { const p = productById(it.productId); (cats[p ? p.cat : "Nicht erkannt"] ||= []).push(it); }
  const order = [...new Set(PRODUCTS.map(p => p.cat)), "Nicht erkannt"];
  for (const cat of order.filter(c => cats[c])) {
    const h = document.createElement("div"); h.className = "cat"; h.textContent = cat; box.appendChild(h);
    const ul = document.createElement("ul"); ul.className = "items card-list"; box.appendChild(ul);
    for (const it of cats[cat]) {
      const p = productById(it.productId);
      const o = p && offersFor(p, state.activeStores, amt(it))[0];
      const li = document.createElement("li"); li.className = "item";
      const dot = o ? `<div class="dot" style="--c:${STORES[o.store].color}">${initials(o.store)}</div>` : `<div class="dot none">?</div>`;
      const sub = !p ? `<span class="nomatch">Nicht in den Daten.</span> ${suggestFor(it.text)}`
        : !o ? `<span class="nomatch">In deinen Läden nicht gefunden</span>`
        : `${STORES[o.store].name} · ${o.packs > 1 ? o.packs + " × " : ""}${esc(o.name)}${o.promo ? ' <span class="badge">AKTION</span>' : ""}`;
      const a = p ? amt(it) : null;
      const opts = p ? [...new Set([...PRESETS[p.unit], a])].sort((x, y) => x - y) : [];
      li.innerHTML = `${dot}
        <div class="name">${p ? pic(p) : ""}${esc(p ? p.label : it.text)}</div>
        <div class="price">${o ? CHF(o.cost) : ""}</div>
        <div class="best">${sub}</div>
        <div class="ctrl">
          ${p ? `<select class="amount" aria-label="Menge">${opts.map(v => `<option value="${v}" ${v === a ? "selected" : ""}>${fmtAmount(p, v)}</option>`).join("")}</select>` : ""}
          ${p ? `<button class="icon-btn star ${isFav(p.id) ? "on" : ""}" data-a="fav" aria-label="Favorit">${isFav(p.id) ? "★" : "☆"}</button>` : ""}
          <button class="icon-btn" data-a="del" aria-label="entfernen">✕</button>
        </div>`;
      li.addEventListener("click", e => {
        const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
        if (a === "del") state.items = state.items.filter(x => x !== it);
        if (a === "fav") toggleFav(p.id);
        if (a === "pick") { it.productId = e.target.dataset.pid; it.text = productById(it.productId).label; }
        save(); renderList();
      });
      li.querySelector(".amount")?.addEventListener("change", e => { it.amount = +e.target.value; save(); renderList(); });
      ul.appendChild(li);
    }
  }
}
function renderFavRow() {
  const favs = state.favs.map(productById).filter(Boolean);
  $("#favRow").innerHTML = !favs.length ? `<p class="muted small fav-tip">Tipp: Mit ☆ markierst du Favoriten. Sie erscheinen dann hier zum schnellen Hinzufügen, und du bekommst einen Aktionsalarm.</p>`
    : `<div class="cat">Favoriten</div><div class="chips fav-chips">${favs.map(p => {
      const on = state.items.some(i => i.productId === p.id);
      const promo = offersFor(p, state.activeStores).some(o => o.promo);
      return `<button type="button" class="${on ? "on" : ""}" data-quick="${p.id}">${p.icon || ""} ${esc(p.label)}${promo ? ' <span class="badge">AKTION</span>' : ""}${on ? " ✓" : ""}</button>`; }).join("")}</div>`;
}
function suggestFor(text) {
  const q = norm(text).slice(0, 3);
  const opts = PRODUCTS.filter(p => norm(p.label).startsWith(q.slice(0, 2))).slice(0, 3);
  return opts.length ? "Meintest du: " + opts.map(p => `<a href="#" data-a="pick" data-pid="${p.id}">${p.label}</a>`).join(", ") + "?" : "";
}
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- Eingabe mit Vorschlägen ----------
let sugSel = -1;
function showSuggest() {
  const val = $("#addInput").value; const ul = $("#suggest");
  const q = parseAmount(val).rest || val, many = matchCategories(norm(q)).length > 0;
  const res = matchProducts(q).slice(0, many ? 60 : 8); sugSel = -1;
  if (!val.trim() || !res.length) { ul.hidden = true; return; }
  ul.innerHTML = res.map((p, i) => `<li data-i="${i}" data-pid="${p.id}"><span>${p.icon || ""} ${p.label}</span> <span class="muted small">· ${p.cat}</span></li>`).join("");
  ul.hidden = false;
}
function addItem(text, productId) {
  text = text.trim(); if (!text) return;
  let { rest, n, u } = parseAmount(text);
  const pid = productId || matchProducts(rest || text)[0]?.id || null;
  const p = productById(pid);
  if (p && matchCategories(norm(rest || text)).length && scoreProduct(norm(rest || text), p) < 100) rest = p.label; // "Gemüse" → "Broccoli"
  const amount = p ? toAmount(p, n, u) : null;
  const existing = pid && state.items.find(i => i.productId === pid);
  if (existing) existing.amount = r3(amt(existing) + amount);
  else state.items.push({ id: Date.now() + Math.random(), text: rest || text, productId: pid, amount, done: false });
  $("#addInput").value = ""; $("#suggest").hidden = true; save(); renderList();
}

// ---------- Rendering: Einkaufsplan ----------
function renderPlan() {
  const plan = planShopping();
  const sum = $("#planSummary"), box = $("#planGroups");
  sum.innerHTML = ""; box.innerHTML = "";
  $("#planOptions").hidden = !state.items.length;
  $("#alarm").innerHTML = alarmCard();
  $("#monthCard").innerHTML = monthCard();
  const doneCount = state.items.filter(i => i.done && i.productId).length;
  $("#finishBtn").textContent = doneCount ? `✓ Einkauf abschliessen (${doneCount} abgehakt)` : "✓ Einkauf abschliessen (alle Artikel)";
  if (!state.region && !state.items.length) { box.innerHTML = `<div class="empty"><span class="big">📍</span>Willkommen! Wähl zuerst oben rechts deinen Standort,<br>damit nur Läden in deiner Nähe verglichen werden.<br><br><button class="btn primary" type="button" data-go="region">Standort wählen</button></div>`; return; }
  if (!state.items.length) { box.innerHTML = `<div class="empty"><span class="big">🛒</span>Noch nichts einzukaufen.<br>Schreib in der Einkaufsliste auf, was du brauchst.<br><br><button class="btn primary" type="button" data-go="liste">Zur Einkaufsliste</button></div>`; return; }
  if (!state.activeStores.length) { box.innerHTML = `<div class="warn">Keine Läden ausgewählt. Tippe oben rechts auf den Standort und wähle deine Läden.</div>`; return; }
  const unmatched = state.items.filter(i => !i.productId);
  const main = state.forceStore ? null : mainStoreOf(plan);
  const storeNames = plan.chosen.filter(s => plan.groups[s]).map(s => STORES[s].name);
  const planned = Object.values(plan.groups).flat(); const doneN = planned.filter(r => r.it.done).length;
  sum.innerHTML = `<div class="summary">
      <div class="lbl">${planned.length} Artikel · ${storeNames.join(" + ")}</div>
      <div class="total">${CHF(plan.total)}</div>
      <div class="pills">
        ${plan.promoSave > 0 ? `<span class="pill">🏷️ ${CHF(plan.promoSave)} gespart mit Aktionen</span>` : ""}
      </div>
      <div class="progress" title="${doneN} von ${planned.length} erledigt"><i style="width:${planned.length ? doneN / planned.length * 100 : 0}%"></i></div>
    </div>
    ${hintCard(plan, main)}
    ${unmatched.length ? `<div class="warn">Nicht erkannt (nicht im Vergleich): ${unmatched.map(i => esc(i.text)).join(", ")}</div>` : ""}
    ${plan.missing.length ? `<div class="warn">In der gewählten Kombination nicht erhältlich: ${plan.missing.map(i => esc(productById(i.productId).label)).join(", ")}</div>` : ""}`;
  for (const s of Object.keys(plan.groups).sort((a, b) => (b === main) - (a === main) || plan.groups[b].length - plan.groups[a].length)) {
    const rows = plan.groups[s];
    const st = rows.reduce((a, r) => a + r.o.cost, 0);
    const g = document.createElement("div"); g.className = "group"; g.style.setProperty("--c", STORES[s].color);
    g.innerHTML = `<div class="group-head"><div class="dot" style="--c:${STORES[s].color}">${initials(s)}</div><div><span class="gname">${STORES[s].name}</span>${s === main ? ' <span class="main-tag">Hauptladen</span>' : ""}${nearestText(s)}</div><span class="gsum">${CHF(st)}</span></div>` +
      rows.map(({ it, p, o }) => `<div class="row ${it.done ? "done" : ""}" data-id="${it.id}">
        <div class="row-main">
          <label><input type="checkbox" ${it.done ? "checked" : ""}>
            <span><span class="pname">${pic(p)}${fmtAmount(p, amt(it))} ${esc(p.label)}</span>${o.promo ? ' <span class="badge">AKTION' + (o.validTo || !o.live ? " bis " + fmtDate(o.validTo || DATA_INFO.aktionBis) : "") + "</span>" : ""}${o.live ? ' <span class="badge live">ECHT</span>' : ""}${o.own ? ' <span class="badge own">EIGENE</span>' : ""}
            <span class="pdesc">${o.packs > 1 ? o.packs + " × " : ""}${esc(o.name)} · ${CHF(o.unitPrice)}/${UNIT_LABEL[p.unit]}</span>${vsMain(main, p, o, amt(it))}</span>
          </label>
          <div class="price-col"><span class="now">${o.est ? '<span class="est" title="geschätzt">≈</span>' : ""}${CHF(o.cost)}</span>${o.promo ? `<span class="was">${CHF(o.regCost)}</span>` : ""}</div>
        </div>
        ${compareTable(p, amt(it))}
      </div>`).join("");
    g.addEventListener("change", e => {
      const id = e.target.closest(".row")?.dataset.id; const it = state.items.find(i => String(i.id) === id);
      if (it) { it.done = e.target.checked; save(); renderPlan(); renderList(); }
    });
    box.appendChild(g);
  }
}
// Kosten, wenn alles in Laden s gekauft wird
function allIn(s) {
  let t = 0; const missing = [];
  for (const it of state.items.filter(i => i.productId)) {
    const o = offersFor(productById(it.productId), [s], amt(it))[0];
    if (o) t += o.cost; else missing.push(productById(it.productId).label);
  }
  return { t, missing };
}
// Hauptladen = Laden mit den meisten günstigsten Produkten.
// Gleichstand: der Laden, in dem "alles dort kaufen" am wenigsten Aufpreis kostet.
function mainStoreOf(plan) {
  const counts = Object.entries(plan.groups).map(([s, rows]) => ({ s, n: rows.length, all: allIn(s) }));
  if (counts.length < 2) return null;
  counts.sort((a, b) => b.n - a.n || a.all.missing.length - b.all.missing.length || a.all.t - b.all.t);
  return counts[0].s;
}
function vsMain(main, p, o, amount) {
  if (!main || o.store === main) return "";
  const m = STORES[main].name, mo = offersFor(p, [main], amount)[0];
  if (!mo) return `<span class="vs">Bei ${m} nicht erhältlich</span>`;
  const extra = mo.cost - o.cost;
  const cls = extra < 1 ? "vs near" : "vs far";
  return `<span class="${cls}">Bei ${m}: ${CHF(mo.cost)} (${mo.packs > 1 ? mo.packs + " × " : ""}${esc(mo.name)}) · <b>+${CHF(Math.max(0, extra))}</b></span>`;
}
function hintCard(plan, main) {
  if (state.forceStore) {
    const cheapest = planShopping(null);
    const extra = plan.total - cheapest.total;
    return `<div class="hint"><div>Du kaufst alles bei <b>${STORES[state.forceStore].name}</b>.${extra > 0.004 ? ` Das kostet ${CHF(extra)} mehr als der günstigste Plan.` : ""}</div>
      <button class="btn ghost small" type="button" data-force="">Günstigsten Plan zeigen</button></div>`;
  }
  if (!main) return "";
  const a = allIn(main), extra = a.t - plan.total, m = STORES[main].name;
  if (a.missing.length) return `<div class="hint"><div>Alles bei <b>${m}</b> geht nicht: ${a.missing.map(esc).join(", ")} gibt es dort nicht.</div></div>`;
  return `<div class="hint"><div>Alles bei <b>${m}</b> kaufen: nur <b>${CHF(extra)}</b> teurer, dafür nur ein Laden.</div>
    <button class="btn primary small" type="button" data-force="${main}">Nur ${m}</button></div>`;
}
function compareTable(p, amount) {
  const all = offersFor(p, Object.keys(STORES), amount).map(o => ({ s: o.store, name: (o.packs > 1 ? o.packs + " × " : "") + o.name, price: o.cost, regular: o.regular, up: o.unitPrice, est: o.est }));
  const bestActive = all.find(o => state.activeStores.includes(o.s));
  return `<details class="compare"><summary>Alle Preise für ${fmtAmount(p, amount)} vergleichen</summary><table>${all.map(o => {
    const active = state.activeStores.includes(o.s);
    return `<tr class="${active ? (o === bestActive ? "best" : "") : "na"}"><td>${STORES[o.s].name}${active ? "" : " (nicht in Region)"}<br><span class="muted">${esc(o.name)}</span></td>
      <td>${o.est ? '<span class="est" title="geschätzt">≈</span>' : ""}${CHF(o.price)}${o.regular ? ' <span class="badge">AKTION</span>' : ""}<br><span class="muted">${CHF(o.up)}/${UNIT_LABEL[p.unit]}</span></td></tr>`;
  }).join("")}</table>${all.some(o => o.est) ? ESTIMATED_NOTE : ""}</details>`;
}
function nearestText(s) {
  const f = state.region?.found?.[s]; if (!f || !f.length) return "";
  return `<span class="sub">${f[0].dist.toFixed(1)} km${f[0].addr ? " · " + esc(f[0].addr) : ""}</span>`;
}
const fmtDate = iso => { const [y, m, d] = iso.split("-"); return `${d}.${m}.`; };

// ---------- Region: echte Filialsuche über OpenStreetMap ----------
const BRAND_PATTERNS = [ // Reihenfolge wichtig: Ausschlüsse zuerst
  [/migrolino|coop pronto|denner express|avec/, null],
  [/\bmigros\b/, "migros"], [/\bcoop\b/, "coop"], [/\bdenner\b/, "denner"], [/\blidl\b/, "lidl"],
  [/\baldi\b/, "aldi"], [/\bspar\b/, "spar"], [/\bvolg\b/, "volg"],
];
function brandOf(tags) {
  const t = [tags.brand, tags.name, tags.operator].filter(Boolean).join(" ").toLowerCase();
  for (const [re, b] of BRAND_PATTERNS) if (re.test(t)) return b;
  return null;
}
function km(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// ---------- Schnelle Suche: alle Filialen der Schweiz liegen vorgeladen in filialen.json ----------
let FILIALEN = null, filialenPromise = null;
function loadFilialen() {
  return filialenPromise ||= fetch("filialen.json").then(r => r.ok ? r.json() : null).then(d => (FILIALEN = d)).catch(() => null);
}
// PLZ oder Ort direkt aus den Filial-Adressen bestimmen (ohne Internet-Abfrage)
function geocodeLocal(q) {
  if (!FILIALEN) return null;
  const qq = q.trim(), isPlz = /^\d{4}$/.test(qq), nq = norm(qq);
  const hits = FILIALEN.rows.filter(r => isPlz ? r[5] === qq : norm(r[6]) === nq);
  if (!hits.length) return null;
  const lat = hits.reduce((a, r) => a + r[1], 0) / hits.length, lon = hits.reduce((a, r) => a + r[2], 0) / hits.length;
  const city = hits.find(r => r[6])?.[6] || "";
  return { lat, lon, label: isPlz ? `${qq} ${city}`.trim() : city || qq };
}
function findStoresLocal(lat, lon, radius) {
  const found = {}, km0 = radius / 1000;
  const dLat = km0 / 111, dLon = km0 / (111 * Math.cos(lat * Math.PI / 180));
  for (const [b, la, lo, name, street, plz, ort] of FILIALEN.rows) {
    if (Math.abs(la - lat) > dLat || Math.abs(lo - lon) > dLon || !STORES[b]) continue;
    const dist = km(lat, lon, la, lo); if (dist > km0) continue;
    (found[b] ||= []).push({ name: name || STORES[b].name, addr: [street, ort].filter(Boolean).join(", "), dist });
  }
  for (const b in found) found[b].sort((x, y) => x.dist - y.dist);
  return found;
}
async function geocode(q) {
  await loadFilialen();
  const local = geocodeLocal(q); if (local) return local;
  const base = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ch&";
  const url = /^\d{4}$/.test(q.trim()) ? base + "postalcode=" + q.trim() : base + "q=" + encodeURIComponent(q);
  const r = await fetch(url, { headers: { "Accept-Language": "de" } });
  const j = await r.json(); if (!j.length) throw new Error("Ort nicht gefunden");
  return { lat: +j[0].lat, lon: +j[0].lon, label: (/^\d{4}$/.test(q.trim()) ? q.trim() + " " : "") + (j[0].display_name.split(",").map(x => x.trim()).find(x => !/^\d+$/.test(x)) || "") };
}
async function findStores(lat, lon, radius) {
  await loadFilialen();
  if (FILIALEN) return findStoresLocal(lat, lon, radius);
  const query = `[out:json][timeout:25];nwr["shop"~"^(supermarket|convenience|discount)$"](around:${radius},${lat},${lon});out center tags;`;
  const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  let lastErr;
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json(); const found = {};
      for (const el of j.elements) {
        const b = brandOf(el.tags || {}); if (!b) continue;
        const la = el.lat ?? el.center?.lat, lo = el.lon ?? el.center?.lon; if (la == null) continue;
        const addr = [el.tags["addr:street"] && (el.tags["addr:street"] + " " + (el.tags["addr:housenumber"] || "")).trim(), el.tags["addr:city"]].filter(Boolean).join(", ");
        (found[b] ||= []).push({ name: el.tags.name || STORES[b].name, addr, dist: km(lat, lon, la, lo) });
      }
      for (const b in found) found[b].sort((x, y) => x.dist - y.dist);
      return found;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}
async function runRegionSearch(getPos) {
  const st = $("#regionStatus"); st.className = "status"; st.textContent = "Suche Läden …";
  try {
    const pos = await getPos();
    const radius = +$("#radiusInput").value;
    const found = await findStores(pos.lat, pos.lon, radius);
    const brands = Object.keys(found);
    state.region = { label: pos.label, lat: pos.lat, lon: pos.lon, radius, found };
    if (brands.length) state.activeStores = brands;
    save();
    st.textContent = brands.length
      ? `${brands.reduce((a, b) => a + found[b].length, 0)} Filialen im Umkreis von ${radius / 1000} km gefunden.`
      : "Keine bekannten Läden im Umkreis gefunden. Vergrössere den Umkreis.";
    renderRegion(); renderList();
  } catch (e) {
    st.className = "status err";
    st.textContent = e.message === "Ort nicht gefunden" ? "Diesen Ort habe ich nicht gefunden. Versuch es mit der PLZ." : "Die Kartensuche ist hier nicht erreichbar. Wähle unten von Hand, welche Läden es bei dir gibt.";
  }
}
function renderRegion() {
  $("#regionChip").textContent = state.region ? "📍 " + state.region.label : "📍 Standort wählen";
  if (state.region && !$("#plzInput").value && state.region.label !== "Mein Standort") $("#plzInput").value = state.region.label.split(",")[0];
  const ul = $("#storeToggles"); ul.innerHTML = "";
  for (const [id, s] of Object.entries(STORES)) {
    const f = state.region?.found?.[id];
    const li = document.createElement("li");
    li.innerHTML = `<label style="--c:${s.color}"><input type="checkbox" ${state.activeStores.includes(id) ? "checked" : ""}>
      <div class="dot" style="--c:${s.color}">${initials(id)}</div><span class="sname">${s.name}<span class="dist">${f ? `${f.length} Filiale${f.length > 1 ? "n" : ""}, ab ${f[0].dist.toFixed(1)} km` : state.region ? "nicht in der Nähe" : "&nbsp;"}</span></span></label>`;
    li.querySelector("input").addEventListener("change", e => {
      state.activeStores = e.target.checked ? [...new Set([...state.activeStores, id])] : state.activeStores.filter(x => x !== id);
      save(); renderList();
    });
    ul.appendChild(li);
  }
  const fd = $("#foundDetails"), fl = $("#foundList");
  const all = state.region ? Object.entries(state.region.found).flatMap(([b, arr]) => arr.map(x => ({ b, ...x }))).sort((a, b) => a.dist - b.dist) : [];
  fd.hidden = !all.length;
  fl.innerHTML = all.slice(0, 40).map(x => `<li><b>${STORES[x.b].name}</b> ${esc(x.name)}${x.addr ? ", " + esc(x.addr) : ""} · ${x.dist.toFixed(1)} km</li>`).join("");
}

// ---------- Echte Aktionen (aktionen.json, täglich von GitHub Actions erzeugt) ----------
let LIVE = null;
const LIVE_STORES = () => LIVE ? Object.keys(LIVE.stores).filter(s => LIVE.stores[s].count > 0) : [];
// Packungsgrösse aus dem Aktionstext lesen, z.B. "2 x 160 g", "500 g", "Pro kg", "1,5 l", "6 Stück"
function liveSize(text, unit) {
  const t = text.toLowerCase().replace(/(\d),(\d)/g, "$1.$2").replace(/(\d|\b)\s*liter\b/g, "$1 l").replace(/(\d|\b)\s*gramm\b/g, "$1 g").replace(/\bkilo(gramm)?\b/g, "kg");
  const conv = { kg: ["kg", 1], g: ["kg", 0.001], l: ["l", 1], dl: ["l", 0.1], cl: ["l", 0.01], ml: ["l", 0.001] };
  let m = t.match(/(?:pro|per|je|für)\s*(\d+)\s*(g|ml|cl|dl)\b/); // Preis "per 100 g"
  if (m && conv[m[2]][0] === unit) return +m[1] * conv[m[2]][1];
  m = t.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|l|dl|cl|ml)\b/);
  if (m && conv[m[3]][0] === unit) return +m[1] * +m[2] * conv[m[3]][1];
  m = t.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|dl|cl|ml)\b/);
  if (m && conv[m[2]][0] === unit) return +m[1] * conv[m[2]][1];
  if (/pro kg|per kg|\/kg/.test(t) && unit === "kg") return 1;
  if (unit === "stk") { m = t.match(/(\d+)\s*(?:stück|stk|rollen|er)\b/); if (m) return +m[1]; if (/pro stück|per stück|pro bund/.test(t)) return 1; }
  return null;
}
// Welches Produkt der Liste ist mit einer echten Aktion gemeint?
function liveMatch(title) {
  const n = norm(title), toks = n.split(" ");
  let best = null; // das zuerst genannte Produkt gewinnt ("Vollmilch Joghurt" ist trotzdem Joghurt dank not-Liste)
  for (const p of PRODUCTS) {
    const cfg = (window.LIVE_KEYS || {})[p.id]; if (!cfg) continue;
    if ((cfg.not || []).some(w => n.includes(norm(w)))) continue;
    const cn = window.CAT_NOT || {};
    if ((cn[p.cat] || []).some(w => toks.includes(norm(w)) || n.includes(norm(w) + " ") && norm(w).length > 5)) continue;
    if (p.cat !== "Baby & Tier" && (cn["*"] || []).some(w => toks.some(t => t.startsWith(norm(w))))) continue;
    for (const raw of cfg.keys) {
      const pre = raw.endsWith("*"), key = norm(raw.replace("*", "")); if (!key) continue;
      let pos = -1;
      if (key.includes(" ")) { const i = (" " + n + " ").indexOf(" " + key + " "); if (i >= 0) pos = n.slice(0, i).split(" ").filter(Boolean).length; }
      else { const i = toks.findIndex((k, j) => (k === key || (pre && k.startsWith(key))) && !["mit", "im", "in", "und"].includes(toks[j - 1])); pos = i; }
      if (pos >= 0 && (!best || pos < best.pos || (pos === best.pos && key.length > best.len))) best = { p, pos, len: key.length };
    }
  }
  return best ? best.p : null;
}
async function loadLive() {
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
    const r = await fetch("aktionen.json", { cache: "no-cache", signal: ctl.signal });
    if (!r.ok) return;
    LIVE = await r.json();
  } catch { return; }
  for (const o of LIVE.offers) {
    if (!STORES[o.store] || o.cat && o.cat !== "Food") continue;
    if (/nur (im|in der) (tessin|romandie|westschweiz)/i.test(o.title)) continue; // regionale Aktionen nicht automatisch verwenden
    const p = liveMatch(o.title); if (!p) continue;
    const size = liveSize(o.size + " " + o.title, p.unit); if (!size) continue;
    o.productId = p.id;
    p.offers.push([o.store, `${o.title}${/\d/.test(o.title) ? "" : " " + fmtPack(p, size)}`, size, o.price, o.regular, { validTo: o.validTo, url: o.url }]);
  }
}


// ---------- Selbst eingetragene Aktionen (z.B. Coop/Migros aus dem Prospekt) ----------
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const ownActive = () => state.own.filter(o => o.validTo >= todayIso() && productById(o.productId) && STORES[o.store]);
const ownName = o => { const p = productById(o.productId); const t = o.title || p.label; return `${t}${/\d/.test(t) ? "" : " " + fmtPack(p, o.size)}`; };
// Fügt die eigenen Aktionen in die Angebote der Produkte ein (vorher alte entfernen)
function applyOwn() {
  for (const p of PRODUCTS) p.offers = p.offers.filter(o => !o[5]?.own);
  for (const o of ownActive()) productById(o.productId).offers.push([o.store, ownName(o), o.size, o.price, o.regular, { validTo: o.validTo, own: true }]);
}
// Für die Aktionsliste im gleichen Format wie aktionen.json
const ownDeals = () => ownActive().map(o => { const p = productById(o.productId); return { own: true, store: o.store, productId: o.productId, title: ownName(o), size: fmtPack(p, o.size),
  price: o.price, regular: o.regular, validTo: o.validTo, discount: o.regular ? Math.round((1 - o.price / o.regular) * 100) : 0 }; });
const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const num = s => { const n = parseFloat(String(s).replace(",", ".").replace(/[^\d.]/g, "")); return n > 0 ? n : null; };
let ownEditing = null;
function ownUnitSync() {
  const p = productById($("#ownProduct").value); if (!p) return;
  $("#ownUnit").textContent = { kg: "Gramm", l: "dl", stk: "Stück" }[p.unit];
  $("#ownSize").placeholder = { kg: "500", l: "10", stk: "6" }[p.unit];
}
// Eingabe "500" → 0.5 kg; "1.5 kg" → 1.5; "10" dl → 1 l; "1.5 l" → 1.5
function ownSize(p, text) {
  const { n, u } = parseAmount(String(text)); if (!(n > 0)) return null;
  if (p.unit === "stk") return Math.round(n);
  if (u) { const a = toAmount(p, n, u); return u === "x" ? null : a; }
  return p.unit === "kg" ? r3(n / 1000) : r3(n / 10);
}
function renderOwn() {
  const sel = $("#ownStore");
  if (!sel.options.length) {
    sel.innerHTML = Object.keys(STORES).map(s => `<option value="${s}">${STORES[s].name}</option>`).join("");
    sel.value = state.activeStores.includes("coop") ? "coop" : state.activeStores.find(s => !LIVE_STORES().includes(s)) || "coop";
    $("#ownProduct").innerHTML = [...PRODUCTS].sort((a, b) => a.label.localeCompare(b.label, "de")).map(p => `<option value="${p.id}">${p.icon || ""} ${esc(p.label)}</option>`).join("");
    $("#ownValid").value = nextMonday(); ownUnitSync();
  }
  const list = [...state.own].sort((a, b) => b.validTo.localeCompare(a.validTo));
  $("#ownList").innerHTML = list.length ? `<ul class="items card-list">${list.map(o => { const p = productById(o.productId); if (!p) return "";
    const old = o.validTo < todayIso();
    return `<li class="deal ${old ? "done" : ""}">
      <div class="dot" style="--c:${STORES[o.store]?.color || "#888"}">${initials(o.store)}</div>
      <div class="dname">${pic(p)}${esc(ownName(o))}</div>
      <div class="dprice">${o.regular ? `<span class="pct">−${Math.round((1 - o.price / o.regular) * 100)}%</span> ` : ""}<b>${CHF(o.price)}</b>${o.regular ? `<s>${CHF(o.regular)}</s>` : ""}</div>
      <div class="dsub">${STORES[o.store]?.name || o.store} · ${old ? "abgelaufen am " : "bis "}${fmtDate(o.validTo)}${o.validTo.slice(0, 4)}</div>
      <div class="dact"><button type="button" class="add-btn" data-own-edit="${o.id}">Ändern</button><button type="button" class="icon-btn" data-own-del="${o.id}" aria-label="Löschen">✕</button></div>
    </li>`; }).join("")}</ul>` : `<div class="empty"><span class="big">✏️</span>Noch keine eigenen Aktionen.<br>Trag oben ein, was du im Prospekt siehst.</div>`;
}
function ownSubmit(e) {
  e.preventDefault();
  const p = productById($("#ownProduct").value), st = $("#ownStatus");
  const size = ownSize(p, $("#ownSize").value), price = num($("#ownPrice").value), regular = num($("#ownRegular").value), validTo = $("#ownValid").value;
  const err = !size ? "Bitte die Packungsgrösse angeben." : !price ? "Bitte den Aktionspreis angeben." : regular && regular <= price ? "Der Normalpreis muss höher sein als der Aktionspreis." : !validTo ? "Bitte angeben, bis wann die Aktion gilt." : validTo < todayIso() ? "Dieses Datum ist schon vorbei." : "";
  st.className = "status" + (err ? " err" : "");
  if (err) { st.textContent = err; return; }
  const entry = { id: ownEditing || Date.now(), store: $("#ownStore").value, productId: p.id, title: $("#ownTitle").value.trim(), size, price, regular: regular || null, validTo };
  state.own = state.own.filter(o => o.id !== entry.id).concat(entry);
  store.set("own", state.own); applyOwn();
  st.textContent = `✓ Gespeichert: ${ownName(entry)} bei ${STORES[entry.store].name} für ${CHF(price)}.`;
  ownEditing = null; $("#ownForm").querySelector("[type=submit]").textContent = "Aktion speichern";
  for (const id of ["#ownTitle", "#ownSize", "#ownPrice", "#ownRegular"]) $(id).value = "";
  renderOwn();
}
function ownClick(e) {
  const ed = e.target.closest("[data-own-edit]"), del = e.target.closest("[data-own-del]");
  if (del) { state.own = state.own.filter(o => String(o.id) !== del.dataset.ownDel); store.set("own", state.own); applyOwn(); renderOwn(); }
  if (ed) {
    const o = state.own.find(o => String(o.id) === ed.dataset.ownEdit); if (!o) return; const p = productById(o.productId);
    ownEditing = o.id;
    $("#ownStore").value = o.store; $("#ownProduct").value = o.productId; ownUnitSync(); $("#ownTitle").value = o.title || "";
    $("#ownSize").value = p.unit === "kg" ? (o.size < 1 ? Math.round(o.size * 1000) : o.size + " kg") : p.unit === "l" ? (o.size < 1 ? r3(o.size * 10) : o.size + " l") : o.size;
    $("#ownPrice").value = o.price.toFixed(2); $("#ownRegular").value = o.regular ? o.regular.toFixed(2) : ""; $("#ownValid").value = o.validTo < todayIso() ? nextMonday() : o.validTo;
    $("#ownForm").querySelector("[type=submit]").textContent = "Änderung speichern"; $("#ownStatus").textContent = "";
    window.scrollTo(0, 0);
  }
}

// ---------- Echte Normalpreise (normalpreise.json: Aldi-Sortiment + statt-Preise aus Aktionen) ----------
let NORMAL = null; const NORMAL_STATS = {};
async function loadNormal() {
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
    const r = await fetch("normalpreise.json", { cache: "no-cache", signal: ctl.signal }); if (!r.ok) return;
    NORMAL = await r.json();
  } catch { return; }
  const best = {};
  for (const it of NORMAL.items) {
    if (!STORES[it.store] || /nur (im|in der) (tessin|romandie|westschweiz)/i.test(it.title)) continue;
    const p = liveMatch(it.title); if (!p) continue;
    const size = liveSize(`${it.size} ${it.title}`, p.unit); if (!size) continue;
    const sample = p.offers.filter(o => !o[5]).map(o => o[2]), ref = sample.length ? sample.sort((x, y) => x - y)[Math.floor(sample.length / 2)] : size;
    if (size < ref / 6 || size > ref * 6) continue; // ganz andere Packungsgrösse (z.B. Probierpackung, Grosspackung)
    const k = p.id + "|" + it.store, up = it.price / size;
    if (!best[k] || up < best[k].up) best[k] = { p, it, size, up };
  }
  for (const { p, it, size } of Object.values(best)) {
    p.offers = p.offers.filter(o => o[0] !== it.store || o[5]); // geschätzten Preis dieses Ladens ersetzen
    p.offers.push([it.store, `${it.title}${/\d\s*(g|kg|l|dl|cl|ml|stk|stück)\b/i.test(it.title) ? "" : " " + fmtPack(p, size)}`, size, it.price, null, { real: true, date: it.date, src: it.src, url: it.url }]);
    NORMAL_STATS[it.store] = (NORMAL_STATS[it.store] || 0) + 1;
  }
}
const ESTIMATED_NOTE = `<p class="muted small est-note">≈ = geschätzter Preis. Für diesen Laden gibt es (noch) keinen echten Preis.</p>`;

// ---------- Aktionen ----------
let dealStore = "alle";
let dealQuery = "";
function dealRow(o) {
  const p = productById(o.productId), onList = p && state.items.some(i => i.productId === p.id);
  return `<li class="deal">
      ${o.image ? `<img class="dimg" src="${esc(o.image)}" alt="" loading="lazy">` : `<div class="dot" style="--c:${STORES[o.store].color}">${initials(o.store)}</div>`}
      <div class="dname">${esc(o.title)}</div>
      <div class="dprice">${o.discount ? `<span class="pct">−${o.discount}%</span> ` : ""}<b>${CHF(o.price)}</b>${o.regular ? `<s>${CHF(o.regular)}</s>` : ""}</div>
      <div class="dsub">${o.size ? esc(o.size.slice(0, 70)) : ""}${o.size && o.validTo ? " · " : ""}${o.validTo ? "bis " + fmtDate(o.validTo) : ""}${o.own ? ' <span class="badge own">EIGENE</span>' : ""}</div>
      <div class="dact">${p ? `<button type="button" class="icon-btn star ${isFav(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="Favorit">${isFav(p.id) ? "★" : "☆"}</button><button type="button" class="add-btn ${onList ? "added" : ""}" data-add="${p.id}">${onList ? "✓ auf Liste" : "+ Liste"}</button>` : o.url ? `<a class="add-btn" href="${esc(o.url)}" target="_blank" rel="noopener">Ansehen ↗</a>` : ""}</div>
    </li>`;
}
function renderDealsLive() {
  const own = ownDeals();
  const stores = [...new Set([...LIVE_STORES(), ...own.map(o => o.store)])].filter(s => state.activeStores.includes(s));
  if (dealStore !== "alle" && !stores.includes(dealStore)) dealStore = "alle";
  $("#dealFilter").innerHTML = [["alle", "Alle"], ...stores.map(s => [s, STORES[s].name])]
    .map(([k, l]) => `<button type="button" data-s="${k}" class="${dealStore === k ? "on" : ""}">${l}</button>`).join("");
  const missing = Object.keys(STORES).filter(s => state.activeStores.includes(s) && !LIVE_STORES().includes(s) && !own.some(o => o.store === s)).map(s => STORES[s].name);
  $("#dealsSub").innerHTML = `Echte Wochenaktionen, Stand ${fmtDate(LIVE.updated.slice(0, 10))}${LIVE.updated.slice(0, 4)}.${missing.length ? ` Für ${missing.join(", ")} gibt es noch keine echten Daten.` : ""}`;
  $("#favDeals").innerHTML = alarmCard(true) + `<input id="dealSearch" class="deal-search" type="search" placeholder="Aktionen durchsuchen …" value="${esc(dealQuery)}">`;
  const q = norm(dealQuery);
  const all = [...own, ...LIVE.offers].filter(o => stores.includes(o.store) && (dealStore === "alle" || o.store === dealStore) && (!q || norm(o.title + " " + o.size).includes(q)))
    .sort((a, b) => (b.own ? 1 : 0) - (a.own ? 1 : 0) || (b.discount || 0) - (a.discount || 0));
  if (!all.length) { $("#dealList").innerHTML = `<div class="empty"><span class="big">🏷️</span>Keine passenden Aktionen gefunden.</div>`; }
  else {
    // pro Laden ein Abschnitt; bei „Alle“ nur die besten pro Laden, Rest über „Alle anzeigen“
    const limit = dealStore === "alle" ? (q ? 30 : 12) : 300;
    const order = Object.keys(STORES).filter(s => all.some(o => o.store === s));
    $("#dealList").innerHTML = order.map(s => {
      const list = all.filter(o => o.store === s), shown = list.slice(0, limit);
      return `<section class="deal-group">
        <div class="deal-group-head"><div class="dot" style="--c:${STORES[s].color}">${initials(s)}</div><span class="gname">${STORES[s].name}</span><span class="muted small">${list.length} ${list.length === 1 ? "Aktion" : "Aktionen"}</span>
          ${list.length > shown.length ? `<button type="button" class="more-btn" data-deal-store="${s}">Alle ›</button>` : ""}</div>
        <ul class="items card-list">${shown.map(dealRow).join("")}</ul>
        ${list.length > shown.length ? `<button type="button" class="btn ghost block small more-all" data-deal-store="${s}">Alle ${list.length} Aktionen von ${STORES[s].name} anzeigen</button>` : ""}
      </section>`; }).join("");
  }
  const inp = $("#dealSearch");
  inp.addEventListener("input", () => { dealQuery = inp.value; clearTimeout(inp._t); inp._t = setTimeout(() => { renderDealsLive(); const n = $("#dealSearch"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
}
function renderDeals() {
  if (LIVE) return renderDealsLive();
  const deals = [];
  for (const p of PRODUCTS) for (const [s, name, size, price, regular, meta] of p.offers)
    if ((!meta || meta.own) && regular != null && state.activeStores.includes(s)) deals.push({ p, s, own: !!meta, name: meta ? name : withSize(p, name, size), price, regular, size, pct: Math.round((1 - price / regular) * 100) });
  deals.sort((a, b) => b.pct - a.pct);
  const stores = [...new Set(deals.map(d => d.s))];
  if (dealStore !== "alle" && !stores.includes(dealStore)) dealStore = "alle";
  $("#dealFilter").innerHTML = [["alle", "Alle"], ...stores.map(s => [s, STORES[s].name])]
    .map(([k, l]) => `<button type="button" data-s="${k}" class="${dealStore === k ? "on" : ""}">${l}</button>`).join("");
  $("#dealsSub").textContent = `Die besten Rabatte in deinen Läden, gültig bis ${fmtDate(DATA_INFO.aktionBis)}${DATA_INFO.isSample ? " (Beispieldaten)" : ""}.`;
  $("#favDeals").innerHTML = alarmCard(true);
  const shown = deals.filter(d => dealStore === "alle" || d.s === dealStore);
  if (!shown.length) { $("#dealList").innerHTML = `<div class="empty"><span class="big">🏷️</span>Zurzeit keine Aktionen in deinen Läden.</div>`; return; }
  $("#dealList").innerHTML = `<ul class="items card-list">${shown.map(d => {
    const onList = state.items.some(i => i.productId === d.p.id);
    return `<li class="deal">
      <div class="dot" style="--c:${STORES[d.s].color}">${initials(d.s)}</div>
      <div class="dname">${pic(d.p)}${esc(d.name)}</div>
      <div class="dprice"><span class="pct">−${d.pct}%</span> <b>${CHF(d.price)}</b><s>${CHF(d.regular)}</s></div>
      <div class="dsub">${STORES[d.s].name} · ${CHF(d.price / d.size)}/${UNIT_LABEL[d.p.unit]}${d.own ? ' · <span class="badge own">EIGENE</span>' : ""}</div>
      <div class="dact"><button type="button" class="icon-btn star ${isFav(d.p.id) ? "on" : ""}" data-fav="${d.p.id}" aria-label="Favorit">${isFav(d.p.id) ? "★" : "☆"}</button><button type="button" class="add-btn ${onList ? "added" : ""}" data-add="${d.p.id}">${onList ? "✓ auf Liste" : "+ Liste"}</button></div>
    </li>`; }).join("")}</ul>`;
}

// ---------- Aktionsalarm für Favoriten ----------
function favPromos() {
  const out = [];
  for (const id of state.favs) {
    const p = productById(id); if (!p) continue;
    const o = offersFor(p, state.activeStores).filter(o => o.promo).sort((a, b) => (b.regular - b.price) / b.regular - (a.regular - a.price) / a.regular)[0];
    if (o) out.push({ p, o, pct: Math.round((1 - o.price / o.regular) * 100) });
  }
  return out;
}
function alarmCard(always) {
  const hits = favPromos();
  const key = "alarmSeen_" + (LIVE?.updated || DATA_INFO.aktionBis);
  if (!hits.length || (!always && store.get(key, false))) return "";
  return `<div class="alarm"><div class="alarm-head"><span>🔔 Aktionsalarm: ${hits.length} ${hits.length === 1 ? "Favorit ist" : "Favoriten sind"} in Aktion</span>
      ${always ? "" : `<button type="button" class="icon-btn" data-alarm-close aria-label="ausblenden">✕</button>`}</div>
    ${hits.map(({ p, o, pct }) => {
      const on = state.items.some(i => i.productId === p.id);
      return `<div class="alarm-row">${pic(p)}<span class="a-txt"><b>${esc(p.label)}</b> bei ${STORES[o.store].name}: ${CHF(o.price)} statt ${CHF(o.regular)} <span class="pct">−${pct}%</span><span class="pdesc">${esc(o.name)} · bis ${fmtDate(o.validTo || DATA_INFO.aktionBis)}${o.live ? " · echte Aktion" : ""}${o.own ? " · selbst eingetragen" : ""}</span></span>
      <button type="button" class="add-btn ${on ? "added" : ""}" data-add="${p.id}">${on ? "✓ auf Liste" : "+ Liste"}</button></div>`; }).join("")}</div>`;
}

// ---------- Einkauf abschliessen & Monatsübersicht ----------
function finishShopping() {
  const plan = planShopping();
  const rows = Object.values(plan.groups).flat();
  const anyDone = rows.some(r => r.it.done);
  const bought = rows.filter(r => !anyDone || r.it.done);
  if (!bought.length) return;
  let spent = 0, savedPromo = 0, savedCompare = 0; const stores = new Set();
  for (const { it, p, o } of bought) {
    spent += o.cost; stores.add(o.store);
    if (o.promo) savedPromo += o.regCost - o.cost;
    // Ersparnis durch Vergleich: gegenüber dem Durchschnittspreis der Läden in deiner Region
    const all = offersFor(p, state.activeStores, amt(it)); const avg = all.reduce((a, x) => a + x.cost, 0) / all.length;
    savedCompare += Math.max(0, avg - o.cost);
  }
  state.history.unshift({ id: Date.now(), date: new Date().toISOString().slice(0, 10), spent: +spent.toFixed(2), savedPromo: +savedPromo.toFixed(2),
    savedCompare: +savedCompare.toFixed(2), stores: [...stores], items: bought.map(r => r.p.label) });
  const ids = new Set(bought.map(r => r.it.id));
  state.items = state.items.filter(i => !ids.has(i.id));
  save(); renderList(); show("verlauf");
}
const monthKey = d => d.slice(0, 7);
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const monthName = k => `${MONTHS[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`;
function monthTotals() {
  const m = {};
  for (const h of state.history) { const k = monthKey(h.date); const t = (m[k] ||= { spent: 0, promo: 0, cmp: 0, n: 0, list: [] });
    t.spent += h.spent; t.promo += h.savedPromo; t.cmp += h.savedCompare; t.n++; t.list.push(h); }
  return m;
}
function monthCard() {
  const k = new Date().toISOString().slice(0, 7); const t = monthTotals()[k];
  return `<button type="button" class="month-card" data-go="verlauf">
    <span class="mc-title">${monthName(k)}</span>
    <span class="mc-vals"><span>Ausgegeben <b>${CHF(t ? t.spent : 0)}</b></span><span class="save">Gespart <b>${CHF(t ? t.promo + t.cmp : 0)}</b></span></span>
    <span class="mc-more">Verlauf ›</span></button>`;
}
function renderHistory() {
  const m = monthTotals(); const keys = Object.keys(m).sort().reverse();
  if (!keys.length) { $("#historyBox").innerHTML = `<div class="empty"><span class="big">📊</span>Noch keine Einkäufe gespeichert.<br>Hake beim Einkaufen ab und tippe dann auf „Einkauf abschliessen“.</div>`; return; }
  const max = Math.max(...keys.map(k => m[k].spent + m[k].promo + m[k].cmp));
  $("#historyBox").innerHTML = keys.map(k => { const t = m[k], saved = t.promo + t.cmp, full = t.spent + saved;
    return `<div class="group month">
      <div class="month-head"><span class="gname">${monthName(k)}</span><span class="muted small">${t.n} ${t.n === 1 ? "Einkauf" : "Einkäufe"}</span></div>
      <div class="month-stats">
        <div><span class="lbl">Ausgegeben</span><b>${CHF(t.spent)}</b></div>
        <div><span class="lbl">Gespart</span><b class="good">${CHF(saved)}</b></div>
        <div><span class="lbl">Ohne Sparen</span><b>${CHF(full)}</b></div>
      </div>
      <div class="bar" title="Ausgegeben vs. gespart"><i class="spent" style="width:${t.spent / max * 100}%"></i><i class="saved" style="width:${saved / max * 100}%"></i></div>
      <div class="muted small month-split">Davon Aktionen ${CHF(t.promo)} · Preisvergleich ${CHF(t.cmp)} (gegenüber dem Durchschnittspreis deiner Läden)</div>
      ${t.list.map(h => `<div class="row hist"><div class="row-main"><span><span class="pname">${fmtDate(h.date)}${h.date.slice(0, 4)} · ${h.stores.map(s => STORES[s]?.name || s).join(", ")}</span>
        <span class="pdesc">${h.items.map(esc).join(", ")}</span></span>
        <div class="price-col"><span class="now">${CHF(h.spent)}</span><span class="pdesc good">−${CHF(h.savedPromo + h.savedCompare)}</span>
        <button type="button" class="icon-btn" data-del-hist="${h.id}" aria-label="Einkauf löschen">✕</button></div></div></div>`).join("")}
    </div>`; }).join("");
}

// ---------- Navigation ----------
function show(view) {
  if (view !== "scan" && typeof stopScan === "function" && !$("#view-scan").hidden) stopScan();
  for (const v of ["einkaufen", "liste", "aktionen", "region", "verlauf", "eintragen", "scan", "teilen"]) $("#view-" + v).hidden = v !== view;
  const tab = view === "region" || view === "verlauf" ? "einkaufen" : view === "eintragen" ? "aktionen" : view === "scan" || view === "teilen" ? "liste" : view;
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.view === tab));
  if (view === "einkaufen") renderPlan();
  if (view === "liste") renderList();
  if (view === "aktionen") renderDeals();
  if (view === "verlauf") renderHistory();
  if (view === "eintragen") renderOwn();
  if (view === "teilen") renderShare();
  window.scrollTo(0, 0);
  if (location.hash.slice(1) !== view) try { history.replaceState(null, "", "#" + view); } catch {}
}

// ---------- Start ----------
async function init() {
  loadFilialen(); // im Hintergrund vorladen
  await Promise.all([loadLive(), loadNormal()]);
  applyOwn();
  $("#ownForm").addEventListener("submit", ownSubmit);
  $("#ownProduct").addEventListener("change", ownUnitSync);
  $("#ownList").addEventListener("click", ownClick);
  $("#standDate").textContent = fmtDate(DATA_INFO.stand) + DATA_INFO.stand.slice(0, 4);
  if (LIVE) { const rest = Object.keys(STORES).filter(s => !LIVE_STORES().includes(s)).map(s => STORES[s].name);
    const real = Object.keys(NORMAL_STATS).map(s => STORES[s].name), noReal = Object.keys(STORES).filter(s => !NORMAL_STATS[s]).map(s => STORES[s].name);
    $("#sampleNoteText").textContent = `Echte Aktionen von ${LIVE_STORES().map(s => STORES[s].name).join(", ")} (Stand ${fmtDate(LIVE.updated.slice(0, 10))}).`
      + (real.length ? ` Echte Normalpreise: ${real.join(", ")}${NORMAL_STATS.aldi ? " (Aldi ganzes Sortiment, die anderen teilweise)" : " (teilweise)"}.` : "")
      + ` Mit ≈ markierte Preise sind geschätzt${noReal.length ? `, bei ${noReal.join(", ")} immer` : ""}. Aktionen von ${rest.join(", ")} kannst du selbst eintragen.`; }
  $("#sampleBanner").hidden = !DATA_INFO.isSample || store.get("noteHidden2", false);
  $("#hideNote").addEventListener("click", () => { $("#sampleBanner").hidden = true; store.set("noteHidden2", true); });
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));
  $("#regionChip").addEventListener("click", () => show("region"));
  $("#toPlan").addEventListener("click", () => show("einkaufen"));
  $("#regionBack").addEventListener("click", () => show("einkaufen"));
  document.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) show(g.dataset.go); });
  $("#planSummary").addEventListener("click", e => { const b = e.target.closest("[data-force]"); if (!b) return; state.forceStore = b.dataset.force || null; save(); renderPlan(); window.scrollTo(0, 0); });
  $("#dealFilter").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { dealStore = b.dataset.s; renderDeals(); } });
  $("#dealList").addEventListener("click", e => { const b = e.target.closest("[data-deal-store]"); if (b) { dealStore = b.dataset.dealStore; renderDeals(); $("#dealFilter").scrollIntoView({ block: "start" }); window.scrollBy(0, -80); } });
  // globale Klicks: Favorit, + Liste, Alarm schliessen, Schnell-Hinzufügen, Verlauf löschen
  document.addEventListener("click", e => {
    const t = e.target;
    const add = t.closest("[data-add]"), fav = t.closest("[data-fav]"), quick = t.closest("[data-quick]"), close = t.closest("[data-alarm-close]"), del = t.closest("[data-del-hist]");
    if (add) { if (!state.items.some(i => i.productId === add.dataset.add)) addItem(productById(add.dataset.add).label, add.dataset.add); }
    else if (fav) toggleFav(fav.dataset.fav);
    else if (quick) { if (!state.items.some(i => i.productId === quick.dataset.quick)) addItem(productById(quick.dataset.quick).label, quick.dataset.quick); }
    else if (close) store.set("alarmSeen_" + (LIVE?.updated || DATA_INFO.aktionBis), true);
    else if (del) { state.history = state.history.filter(h => String(h.id) !== del.dataset.delHist); save(); renderHistory(); return; }
    else return;
    renderList();
    if (!$("#view-aktionen").hidden) renderDeals();
    if (!$("#view-einkaufen").hidden) renderPlan();
  });
  $("#finishBtn").addEventListener("click", finishShopping);
  $("#clearList").addEventListener("click", e => {
    const b = e.currentTarget;
    if (b.dataset.armed) { state.items = []; save(); renderList(); b.textContent = "Liste leeren"; delete b.dataset.armed; return; }
    b.dataset.armed = "1"; b.textContent = "Wirklich leeren?";
    setTimeout(() => { if (b.dataset.armed) { delete b.dataset.armed; b.textContent = "Liste leeren"; } }, 3000);
  });
  const segSync = () => document.querySelectorAll("#maxStores button").forEach(b => b.classList.toggle("on", +b.dataset.v === state.maxStores));
  segSync();
  $("#maxStores").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.maxStores = +b.dataset.v; state.forceStore = null; save(); segSync(); renderPlan(); });

  const inp = $("#addInput"), sug = $("#suggest");
  inp.addEventListener("input", showSuggest);
  inp.addEventListener("keydown", e => {
    const lis = [...sug.querySelectorAll("li")]; if (sug.hidden || !lis.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); sugSel = (sugSel + (e.key === "ArrowDown" ? 1 : -1) + lis.length) % lis.length;
      lis.forEach((l, i) => l.classList.toggle("sel", i === sugSel));
    } else if (e.key === "Escape") sug.hidden = true;
  });
  sug.addEventListener("mousedown", e => { const li = e.target.closest("li"); if (li) { e.preventDefault(); addItem(inp.value || productById(li.dataset.pid).label, li.dataset.pid); } });
  inp.addEventListener("blur", () => setTimeout(() => sug.hidden = true, 150));
  $("#addForm").addEventListener("submit", e => {
    e.preventDefault();
    const sel = sug.querySelectorAll("li")[sugSel];
    if (!sug.hidden && sel) return addItem(inp.value, sel.dataset.pid);
    // Nur eine Kategorie eingegeben (z.B. "Gemüse")? Dann Auswahl offen lassen statt irgendein Gemüse zu nehmen
    const q = norm(parseAmount(inp.value).rest || inp.value);
    if (matchCategories(q).length && !PRODUCTS.some(p => scoreProduct(q, p) === 100)) { showSuggest(); return; }
    addItem(inp.value);
  });
  $("#itemList").addEventListener("click", e => { if (e.target.matches("a[data-a=pick]")) e.preventDefault(); }, true);

  $("#radiusInput").addEventListener("change", () => { if (state.region && FILIALEN) runRegionSearch(async () => state.region); });
  $("#regionForm").addEventListener("submit", e => {
    e.preventDefault(); const q = $("#plzInput").value.trim(); if (!q) return;
    runRegionSearch(() => geocode(q));
  });
  $("#geoBtn").addEventListener("click", () => runRegionSearch(() => new Promise((res, rej) =>
    navigator.geolocation ? navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Mein Standort" }),
      () => rej(new Error("Standort nicht freigegeben")), { timeout: 10000 }) : rej(new Error("kein GPS")))));

  renderRegion(); renderList();
  const startView = () => { const h = location.hash.slice(1); if (/^(import|gruppe)=/.test(h)) return "liste"; return ["einkaufen", "liste", "aktionen", "region", "verlauf", "eintragen", "scan", "teilen"].includes(h) ? h : "einkaufen"; };
  const first = startView();
  if (window.initExtras) initExtras(); // liest #import / #gruppe, bevor die Adresse umgeschrieben wird
  if (location.hash.startsWith("#import=")) { for (const v of document.querySelectorAll(".view")) v.hidden = v.id !== "view-liste"; document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.view === "liste")); renderList(); }
  else show(first);
  window.addEventListener("hashchange", () => show(startView()));
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
}
init();
