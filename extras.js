"use strict";
/* Zusatzfunktionen: Strichcode scannen, Liste teilen (Link + live mit Firebase), Mitteilungen für Favoriten. */

// =====================================================================
// 1) STRICHCODE SCANNEN
// =====================================================================
// Produktdaten kommen aus Open Food Facts (freie Datenbank, kostenlos, ohne Schlüssel).
// Preise pro Strichcode gibt es dort nicht → wir vergleichen das passende Produkt aus unserem Katalog.
let scanCtl = null;
const EAN_MAP = () => store.get("eanMap", {}); // vom Nutzer korrigierte Zuordnung Strichcode → Produkt
const EN_HINTS = { milks: "milch", "whole-milks": "vollmilch", cheeses: "käse", butters: "butter", yogurts: "joghurt", eggs: "eier", breads: "brot",
  pastas: "spaghetti", rices: "reis", coffees: "kaffee", chocolates: "schokolade", "chicken-breasts": "pouletbrust", bananas: "bananen", apples: "äpfel",
  tomatoes: "tomaten", waters: "mineralwasser", "mineral-waters": "mineralwasser", "orange-juices": "orangensaft", "olive-oils": "olivenöl", "crisps": "chips",
  "breakfast-cereals": "cornflakes", mueslis: "müesli", "hazelnut-spreads": "nutella", jams: "konfitüre", honeys: "honig", teas: "tee", colas: "cola",
  beers: "bier", "red-wines": "rotwein", "white-wines": "weisswein", "ice-creams": "glace", pizzas: "pizza", sausages: "wienerli", hams: "schinken",
  "salamis": "salami", flours: "mehl", sugars: "zucker", "tomato-sauces": "tomatensauce", ketchup: "ketchup", mayonnaises: "mayonnaise", "cat-food": "katzenfutter", "dog-food": "hundefutter" };

async function lookupEan(code) {
  const cached = store.get("ean_" + code, null); if (cached) return cached;
  const ctl = new AbortController(); setTimeout(() => ctl.abort(), 8000);
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_de,generic_name_de,brands,quantity,categories_tags,image_front_small_url`, { signal: ctl.signal });
  if (!r.ok && r.status !== 404) throw new Error("Produktdatenbank nicht erreichbar");
  const j = await r.json(); if (j.status !== 1 || !j.product) return null;
  const p = j.product;
  const info = { name: p.product_name_de || p.product_name || "", generic: p.generic_name_de || "", brand: (p.brands || "").split(",")[0].trim(), qty: p.quantity || "",
    cats: (p.categories_tags || []).map(t => t.replace(/^\w\w:/, "")), img: p.image_front_small_url || "" };
  store.set("ean_" + code, info); return info;
}
function productForEan(code, info) {
  const mapped = EAN_MAP()[code]; if (mapped && productById(mapped)) return productById(mapped);
  if (!info) return null;
  const txt = `${info.name} ${info.generic}`;
  let p = liveMatch(txt); if (p) return p;
  for (const c of [...info.cats].reverse()) { const h = EN_HINTS[c] || (/^[a-zäöü-]+$/.test(c) ? c.replace(/-/g, " ") : null); if (h && (p = liveMatch(h) || matchProducts(h)[0])) return p; }
  for (const w of txt.split(/\s+/).filter(w => w.length >= 4)) { const m = matchProducts(w)[0]; if (m && scoreProduct(norm(w), m) >= 80) return m; }
  return null;
}
function scanMsg(t, err) { const s = $("#scanMsg"); s.textContent = t; s.className = "status" + (err ? " err" : ""); }
async function startScan() {
  $("#scanOut").innerHTML = ""; scanMsg("Kamera wird gestartet …");
  try {
    await loadScript("lib/zxing/zxing-library.min.js"); await loadScript("lib/zxing/zxing-browser.min.js");
    const hints = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]]]);
    const reader = new ZXingBrowser.BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
    scanCtl = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, $("#scanVideo"), (res) => {
      if (!res) return; stopScan(); if (navigator.vibrate) navigator.vibrate(80); showEan(res.getText());
    });
    $("#scanBox").hidden = false; scanMsg("Halte den Strichcode in den Rahmen.");
  } catch (e) {
    scanMsg(/Permission|NotAllowed/i.test(e.name + e.message) ? "Die Kamera ist nicht freigegeben. Du kannst den Code auch unten eintippen." : "Kamera nicht verfügbar. Du kannst den Code unten eintippen.", true);
  }
}
function stopScan() { try { scanCtl?.stop(); } catch {} scanCtl = null; $("#scanBox").hidden = true; }
async function showEan(code) {
  code = String(code).replace(/\D/g, ""); if (code.length < 8) return scanMsg("Das ist kein gültiger Strichcode.", true);
  scanMsg(`Strichcode ${code} wird gesucht …`);
  let info = null;
  try { info = await lookupEan(code); } catch { scanMsg("Die Produktdatenbank ist gerade nicht erreichbar. Wähle das Produkt unten selbst.", true); }
  const p = productForEan(code, info);
  scanMsg(info ? "" : `Strichcode ${code} ist in der Produktdatenbank nicht bekannt. Wähle unten, was es ist.`, !info && !p);
  renderEan(code, info, p);
}
function renderEan(code, info, p) {
  const opts = [...PRODUCTS].sort((a, b) => a.label.localeCompare(b.label, "de")).map(x => `<option value="${x.id}" ${x === p ? "selected" : ""}>${x.icon || ""} ${esc(x.label)}</option>`).join("");
  let body = "";
  if (p) {
    const size = (info && liveSize(info.qty + " " + info.name, p.unit)) || refAmount(p);
    const offers = offersFor(p, state.activeStores, size), best = offers[0], onList = state.items.some(i => i.productId === p.id);
    const promos = offers.filter(o => o.promo);
    body = best ? `<div class="scan-best"><span class="lbl">Am günstigsten in deiner Region</span>
        <div class="row-main"><span><b>${STORES[best.store].name}</b><span class="pdesc">${best.packs > 1 ? best.packs + " × " : ""}${esc(best.name)} · ${CHF(best.unitPrice)}/${UNIT_LABEL[p.unit]}</span></span>
        <span class="now">${CHF(best.cost)}</span></div>
        ${promos.length ? `<div class="good small">🏷️ ${promos.length} ${promos.length === 1 ? "Aktion" : "Aktionen"}: ${promos.slice(0, 3).map(o => `${STORES[o.store].name} ${CHF(o.cost)}`).join(", ")}</div>` : ""}</div>
      ${compareTable(p, size).replace("<details", "<details open")}
      <p class="muted small">Verglichen wird das passende Produkt (${fmtAmount(p, size)}), nicht genau diese Marke.</p>
      <div class="scan-acts"><button type="button" class="btn primary" data-scan-add="${p.id}" data-amount="${size}">${onList ? "✓ auf der Liste" : "+ Auf die Liste"}</button>
        <button type="button" class="btn ghost" data-fav="${p.id}">${isFav(p.id) ? "★ Favorit" : "☆ Favorit"}</button></div>`
      : `<p class="muted">In deinen Läden gibt es dazu noch keine Preise.</p>`;
  }
  $("#scanOut").innerHTML = `<div class="region-card scan-product">
      ${info?.img ? `<img class="scan-img" src="${esc(info.img)}" alt="">` : ""}
      <div><div class="scan-name">${esc(info?.name || "Unbekanntes Produkt")}</div>
      <div class="muted small">${esc([info?.brand, info?.qty].filter(Boolean).join(" · "))}${info ? " · " : ""}Code ${code}</div></div></div>
    <label class="scan-pick">Das ist:<select id="scanPick" data-code="${code}"><option value="">– Produkt wählen –</option>${opts}</select></label>
    ${body}`;
  $("#scanPick").addEventListener("change", e => {
    const m = EAN_MAP(); if (e.target.value) m[code] = e.target.value; else delete m[code]; store.set("eanMap", m);
    renderEan(code, info, productById(e.target.value));
  });
}

// =====================================================================
// 2) LISTE TEILEN
// =====================================================================
// a) Sofort, ohne Konto: Liste als Link schicken (eine Kopie, nicht live).
// b) Live für die ganze Familie: Firebase Realtime Database (kostenloser Plan). Braucht firebase-config.js.
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
const baseUrl = () => location.href.split("#")[0];
function snapshotLink() {
  const data = state.items.filter(i => !i.done).map(i => [i.text, i.productId || 0, i.amount ?? 0]);
  return `${baseUrl()}#import=${b64e(JSON.stringify(data))}`;
}
async function shareLink(url, text) {
  try { if (navigator.share) { await navigator.share({ title: "Aktionsjäger", text, url }); return "geteilt"; } } catch (e) { if (e.name === "AbortError") return ""; }
  try { await navigator.clipboard.writeText(url); return "Link kopiert. Füge ihn z.B. in WhatsApp ein."; } catch { prompt("Diesen Link kopieren:", url); return ""; }
}
function pendingCard() {
  const h = location.hash;
  if (h.startsWith("#import=")) {
    let data = []; try { data = JSON.parse(b64d(h.slice(8))); } catch {}
    if (!data.length) return "";
    return `<div class="alarm share-in"><div class="alarm-head"><span>📥 Geteilte Liste mit ${data.length} ${data.length === 1 ? "Artikel" : "Artikeln"}</span></div>
      <div class="pdesc">${data.slice(0, 8).map(d => esc(d[0])).join(", ")}${data.length > 8 ? " …" : ""}</div>
      <div class="scan-acts"><button type="button" class="btn primary small" data-import="yes">Zu meiner Liste hinzufügen</button><button type="button" class="btn ghost small" data-import="no">Nein danke</button></div></div>`;
  }
  return "";
}
function importSnapshot(yes) {
  if (yes) { let data = []; try { data = JSON.parse(b64d(location.hash.slice(8))); } catch {}
    for (const [text, pid, amount] of data) {
      const p = pid && productById(pid), ex = p && state.items.find(i => i.productId === p.id && !i.done);
      if (ex) continue;
      state.items.push({ id: Date.now() + Math.random(), text, productId: p ? p.id : null, amount: p ? (amount || null) : null, done: false });
    }
    save();
  }
  try { history.replaceState(null, "", "#liste"); } catch {}
  renderList(); $("#shareIn").innerHTML = "";
}

// ---- Live-Teilen ----
const LIVE_SHARE = { db: null, ref: null, id: store.get("shareId", null), name: store.get("shareName", ""), synced: {}, applying: false };
const ikey = id => String(id).replace(/[.#$\[\]\/]/g, "_");
const shareReady = () => !!(window.FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL);
async function getDb() {
  if (LIVE_SHARE.db) return LIVE_SHARE.db;
  if (window.__FAKE_DB) return LIVE_SHARE.db = window.__FAKE_DB; // nur für Tests
  await loadScript("lib/firebase/firebase-app-compat.js"); await loadScript("lib/firebase/firebase-database-compat.js");
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
  return LIVE_SHARE.db = app.database();
}
const newShareId = () => { const a = new Uint8Array(15); crypto.getRandomValues(a); return [...a].map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 24); };
async function startShare(id, mergeLocal = true) {
  const db = await getDb();
  LIVE_SHARE.id = id; store.set("shareId", id);
  LIVE_SHARE.ref = db.ref(`lists/${id}/items`);
  if (mergeLocal && state.items.length) {
    const up = {}; for (const it of state.items) up[ikey(it.id)] = cleanItem(it); await LIVE_SHARE.ref.update(up);
  }
  LIVE_SHARE.ref.on("value", snap => {
    const val = snap.val() || {};
    LIVE_SHARE.synced = Object.fromEntries(Object.entries(val).map(([k, v]) => [k, JSON.stringify(v)]));
    LIVE_SHARE.applying = true;
    state.items = Object.values(val).sort((a, b) => (a.id || 0) - (b.id || 0)).map(v => ({ ...v, productId: v.productId || null, amount: v.amount ?? null }));
    save(); LIVE_SHARE.applying = false;
    renderList(); if (!$("#view-einkaufen").hidden) renderPlan(); renderShare();
  });
  renderShare();
}
const cleanItem = it => ({ id: it.id, text: it.text, productId: it.productId || null, amount: it.amount ?? null, done: !!it.done, by: it.by || LIVE_SHARE.name || null });
// wird nach jedem save() aufgerufen: nur Änderungen hochladen (so überschreiben sich zwei Personen nicht gegenseitig)
window.onItemsSaved = () => {
  if (!LIVE_SHARE.ref || LIVE_SHARE.applying) return;
  const up = {}, now = new Set();
  for (const it of state.items) {
    if (!it.by && LIVE_SHARE.name) it.by = LIVE_SHARE.name;
    const k = ikey(it.id), v = cleanItem(it), s = JSON.stringify(v); now.add(k);
    if (LIVE_SHARE.synced[k] !== s) { up[k] = v; LIVE_SHARE.synced[k] = s; }
  }
  for (const k of Object.keys(LIVE_SHARE.synced)) if (!now.has(k)) { up[k] = null; delete LIVE_SHARE.synced[k]; }
  if (Object.keys(up).length) LIVE_SHARE.ref.update(up);
};
function leaveShare() {
  try { LIVE_SHARE.ref?.off(); } catch {}
  LIVE_SHARE.ref = null; LIVE_SHARE.id = null; LIVE_SHARE.synced = {}; store.set("shareId", null); renderShare(); renderList();
}
const groupLink = () => `${baseUrl()}#gruppe=${LIVE_SHARE.id}`;
function renderShare() {
  const box = $("#shareBox"); if (!box) return;
  const chip = $("#shareChip"); if (chip) { chip.textContent = LIVE_SHARE.ref ? "👪 Geteilt" : "👪 Teilen"; chip.classList.toggle("on", !!LIVE_SHARE.ref); }
  if (!shareReady()) {
    box.innerHTML = `<div class="region-card"><div class="scan-title">📤 Liste als Link schicken</div>
      <p class="muted small">Schickt eine Kopie deiner Liste, z.B. per WhatsApp. Wer den Link öffnet, kann die Artikel übernehmen.</p>
      <button type="button" class="btn primary block" data-share="snapshot">Link teilen</button></div>
      <div class="region-card share-soon"><div class="scan-title">👪 Gemeinsame Liste (live)</div>
      <p class="muted small">Alle in der Familie sehen dieselbe Liste und können Sachen hinzufügen oder abhaken. Dafür braucht die App eine kleine, kostenlose Online-Datenbank, die noch eingerichtet werden muss.</p></div>`;
    return;
  }
  if (!LIVE_SHARE.ref) {
    box.innerHTML = `<div class="region-card"><div class="scan-title">👪 Gemeinsame Liste</div>
      <p class="muted small">Alle, die den Link öffnen, sehen dieselbe Liste und können Sachen hinzufügen und abhaken, live auf allen Handys.</p>
      <label class="own-form"><span>Dein Name <span class="muted">(freiwillig)</span></span><input id="shareName" type="text" placeholder="z.B. Timon" value="${esc(LIVE_SHARE.name)}"></label>
      <button type="button" class="btn primary block" data-share="start">Gemeinsame Liste starten</button></div>
      <div class="region-card"><div class="scan-title">📤 Nur eine Kopie schicken</div>
      <button type="button" class="btn ghost block" data-share="snapshot">Liste als Link teilen</button></div>`;
    return;
  }
  const who = [...new Set(state.items.map(i => i.by).filter(Boolean))];
  box.innerHTML = `<div class="region-card"><div class="scan-title">👪 Gemeinsame Liste ist aktiv</div>
    <p class="muted small">Schick diesen Link an deine Familie oder WG. ${who.length ? "Dabei: " + who.map(esc).join(", ") + "." : ""}</p>
    <input class="share-url" readonly value="${esc(groupLink())}">
    <button type="button" class="btn primary block" data-share="invite">Link schicken</button>
    <button type="button" class="btn ghost block small" data-share="leave">Gemeinsame Liste verlassen</button></div>`;
}
async function shareClick(e) {
  const b = e.target.closest("[data-share]"); if (!b) return; const a = b.dataset.share, st = $("#shareStatus");
  st.className = "status"; st.textContent = "";
  if (a === "snapshot") { if (!state.items.some(i => !i.done)) { st.textContent = "Deine Liste ist leer."; return; } st.textContent = await shareLink(snapshotLink(), "Meine Einkaufsliste"); }
  if (a === "start") {
    LIVE_SHARE.name = ($("#shareName")?.value || "").trim(); store.set("shareName", LIVE_SHARE.name);
    try { await startShare(newShareId()); st.textContent = "✓ Gemeinsame Liste gestartet. Jetzt den Link schicken."; } catch (err) { st.className = "status err"; st.textContent = "Konnte nicht verbinden: " + err.message; }
  }
  if (a === "invite") st.textContent = await shareLink(groupLink(), "Unsere gemeinsame Einkaufsliste im Aktionsjäger");
  if (a === "leave") { leaveShare(); st.textContent = "Du bist nicht mehr in der gemeinsamen Liste. Deine Artikel bleiben auf diesem Handy."; }
}
async function joinFromHash() {
  const m = location.hash.match(/^#gruppe=([a-z0-9]{16,40})$/); if (!m) return false;
  try { history.replaceState(null, "", "#liste"); } catch {}
  if (!shareReady()) return false;
  if (LIVE_SHARE.id === m[1] && LIVE_SHARE.ref) return true;
  try { await startShare(m[1], true); show("liste"); $("#shareIn").innerHTML = `<div class="alarm"><div class="alarm-head"><span>👪 Du bist jetzt in der gemeinsamen Liste.</span></div></div>`; } catch {}
  return true;
}

// =====================================================================
// 3) MITTEILUNGEN BEI AKTIONEN FÜR FAVORITEN (nur wenn selbst eingeschaltet)
// =====================================================================
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function renderNotify() {
  const on = store.get("notify", false), box = $("#notifyBox"); if (!box) return;
  const unsupported = !("Notification" in window);
  box.innerHTML = `<label class="switch-row"><span><b>🔔 Mitteilung bei Aktionen</b><span class="pdesc">Nur für deine Favoriten (☆). Jederzeit wieder ausschaltbar.</span></span>
    <input type="checkbox" id="notifyToggle" ${on ? "checked" : ""} ${unsupported && !isIos() ? "disabled" : ""}><span class="switch" aria-hidden="true"></span></label>
    <p class="muted small" id="notifyHint">${unsupported && isIos() && !isStandalone() ? "Auf dem iPhone geht das nur, wenn die App auf dem Home-Bildschirm ist: in Safari unten auf Teilen tippen, dann „Zum Home-Bildschirm“." : on ? `Du bekommst eine Mitteilung, sobald ein Favorit neu in Aktion ist${state.favs.length ? "" : " (du hast noch keine Favoriten)"}.` : ""}</p>`;
  $("#notifyToggle").addEventListener("change", async e => {
    if (!e.target.checked) { store.set("notify", false); return renderNotify(); }
    if (!("Notification" in window)) { e.target.checked = false; return renderNotify(); }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { e.target.checked = false; store.set("notify", false); $("#notifyHint").textContent = "Mitteilungen sind in den Einstellungen deines Handys blockiert."; return; }
    store.set("notify", true); renderNotify(); checkNotify(true);
  });
}
async function checkNotify(test) {
  if (!store.get("notify", false) || !("Notification" in window) || Notification.permission !== "granted") return;
  const seen = new Set(store.get("notified", []));
  const hits = favPromos().filter(h => !seen.has(`${h.p.id}|${h.o.store}|${h.o.price}`));
  if (!hits.length) { if (test) notify("Mitteilungen sind eingeschaltet", "Du hörst von mir, sobald einer deiner Favoriten in Aktion ist."); return; }
  const body = hits.slice(0, 4).map(({ p, o, pct }) => `${p.label}: ${CHF(o.price)} bei ${STORES[o.store].name} (−${pct}%)`).join("\n") + (hits.length > 4 ? `\n+ ${hits.length - 4} weitere` : "");
  await notify(`🔔 ${hits.length} ${hits.length === 1 ? "Favorit ist" : "Favoriten sind"} in Aktion`, body);
  store.set("notified", [...seen, ...hits.map(h => `${h.p.id}|${h.o.store}|${h.o.price}`)].slice(-300));
}
async function notify(title, body) {
  try { const reg = await navigator.serviceWorker?.getRegistration(); if (reg) return reg.showNotification(title, { body, icon: "icon.svg", badge: "icon.svg", tag: "aktionen", data: { url: baseUrl() + "#aktionen" } }); } catch {}
  try { new Notification(title, { body, icon: "icon.svg" }); } catch {}
}

// =====================================================================
function initExtras() {
  // Scan
  $("#scanStart").addEventListener("click", startScan);
  $("#scanStop").addEventListener("click", stopScan);
  $("#eanForm").addEventListener("submit", e => { e.preventDefault(); stopScan(); showEan($("#eanInput").value); });
  $("#scanOut").addEventListener("click", e => {
    const b = e.target.closest("[data-scan-add]"); if (!b) return;
    const p = productById(b.dataset.scanAdd);
    if (!state.items.some(i => i.productId === p.id)) { state.items.push({ id: Date.now() + Math.random(), text: p.label, productId: p.id, amount: +b.dataset.amount || null, done: false }); save(); renderList(); }
    b.textContent = "✓ auf der Liste";
  });
  document.addEventListener("click", e => { if (e.target.closest("[data-fav]") && !$("#view-scan").hidden) setTimeout(() => { const c = $("#scanPick")?.dataset.code; if (c) $("#scanPick").dispatchEvent(new Event("change")); }, 0); });
  // Teilen
  $("#shareBox").addEventListener("click", shareClick);
  $("#shareIn").addEventListener("click", e => { const b = e.target.closest("[data-import]"); if (b) importSnapshot(b.dataset.import === "yes"); });
  if (location.hash.startsWith("#import=")) { $("#shareIn").innerHTML = pendingCard(); }
  if (shareReady() && LIVE_SHARE.id) startShare(LIVE_SHARE.id, false).catch(() => {});
  joinFromHash();
  renderShare();
  // Mitteilungen
  renderNotify(); checkNotify();
}
