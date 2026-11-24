"use strict";
/* Prospekt einlesen: Foto oder Datei (PDF/Bild) → Aktionen erkennen → Vorschau → als eigene Aktionen speichern.
   Läuft komplett im Browser (Texterkennung mit Tesseract.js, PDF mit pdf.js), kostenlos und ohne Konto. */

const ABS = p => new URL(p, location.href).href;
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Konnte " + src + " nicht laden"));
    document.head.appendChild(s);
  });
}
const scanStatus = (t, err) => { const s = $("#scanStatus"); s.textContent = t; s.className = "status" + (err ? " err" : ""); };

// ---------- Text mit Position holen ----------
// Jeder Block: {text, x0, y0, x1, y1, h} in Einheiten der Seitenbreite (0..1)
let ocrWorker = null;
async function getOcr() {
  if (ocrWorker) return ocrWorker;
  scanStatus("Texterkennung wird geladen (nur beim ersten Mal etwas länger) …");
  await loadScript("lib/tesseract/tesseract.min.js");
  ocrWorker = await Tesseract.createWorker("deu", 1, {
    workerPath: ABS("lib/tesseract/worker.min.js"), corePath: ABS("lib/tesseract/core/"), langPath: ABS("lib/tesseract/lang"),
    logger: m => { if (m.status === "recognizing text" && scanStatus.page) scanStatus(`${scanStatus.page}: Text wird gelesen … ${Math.round(m.progress * 100)} %`); },
  });
  return ocrWorker;
}
// Bild verkleinern (Handyfotos sind riesig) und leicht kontrastreicher machen
async function toCanvas(src, maxW = 2000) {
  const img = await createImageBitmap(src);
  const f = Math.min(1, maxW / img.width);
  const c = document.createElement("canvas"); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
  const g = c.getContext("2d"); g.filter = "grayscale(1) contrast(1.3)"; g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
async function ocrBlocks(canvas, label) {
  const w = await getOcr(); scanStatus.page = label;
  const { data } = await w.recognize(canvas);
  const W = canvas.width;
  const out = [];
  for (const l of data.lines || []) {
    // Tesseract hängt nebeneinanderliegende Spalten oft zu einer Zeile zusammen → bei grossen Lücken trennen
    let cur = null; const h = l.bbox.y1 - l.bbox.y0;
    for (const w of l.words || []) {
      if (!w.text.trim()) continue;
      if (cur && w.bbox.x0 - cur.x1 < h * 1.2) { cur.text += " " + w.text; cur.x1 = w.bbox.x1; cur.y0 = Math.min(cur.y0, w.bbox.y0); cur.y1 = Math.max(cur.y1, w.bbox.y1); }
      else { cur = { text: w.text, x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1 }; out.push(cur); }
    }
  }
  return out.map(s => ({ text: s.text.trim(), x0: s.x0 / W, y0: s.y0 / W, x1: s.x1 / W, y1: s.y1 / W, h: (s.y1 - s.y0) / W }));
}
async function pdfPages(file, onPage) {
  await loadScript("lib/pdfjs/pdf.min.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc = ABS("lib/pdfjs/pdf.worker.min.js");
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const n = Math.min(pdf.numPages, 60);
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i), vp = page.getViewport({ scale: 1 }), W = vp.width;
    scanStatus(`Seite ${i} von ${n} wird gelesen …`);
    const tc = await page.getTextContent();
    // Textstücke auf gleicher Höhe und nah beieinander zu Zeilenstücken zusammenfassen
    const items = tc.items.filter(t => t.str.trim()).map(t => { const h = Math.hypot(t.transform[2], t.transform[3]) || 10;
      const x = t.transform[4], y = vp.height - t.transform[5]; return { text: t.str, x0: x, x1: x + t.width, y0: y - h, y1: y, h }; })
      .sort((a, b) => a.y1 - b.y1 || a.x0 - b.x0);
    const segs = [];
    for (const it of items) {
      const s = segs.find(s => Math.abs(s.y1 - it.y1) < it.h * 0.4 && it.x0 - s.x1 < it.h * 1.2 && it.x0 >= s.x0 - 1);
      if (s) { s.text += (it.x0 - s.x1 > it.h * 0.15 ? " " : "") + it.text; s.x1 = Math.max(s.x1, it.x1); s.h = Math.max(s.h, it.h); s.y0 = Math.min(s.y0, it.y0); }
      else segs.push({ ...it });
    }
    let blocks = segs.map(s => ({ text: s.text.trim(), x0: s.x0 / W, x1: s.x1 / W, y0: s.y0 / W, y1: s.y1 / W, h: s.h / W }));
    if (blocks.map(b => b.text).join("").length < 40) { // eingescannte Seite ohne Text → Texterkennung
      const vp2 = page.getViewport({ scale: 2000 / W }), c = document.createElement("canvas"); c.width = vp2.width; c.height = vp2.height;
      await page.render({ canvasContext: c.getContext("2d"), viewport: vp2 }).promise;
      blocks = await ocrBlocks(c, `Seite ${i} von ${n}`);
    }
    await onPage(blocks, i, n);
  }
}

// ---------- Aktionen aus den Textblöcken lesen ----------
const PRICE_RE = /(?:^|[^\d.,\/])(\d{1,3})\s?[.,·]\s?(\d{2}|[–—-])(?![\d%])(?!\.\s?\d)(?!\.(?:\s|$))/g;
function pricesIn(text) {
  const out = [];
  const t = text.replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|dl|l|stk\.?|stück)\s*=\s*[\d.,–-]+/gi, " ") // Grundpreise "100 g = 1.23" weg
    .replace(/[\d.,]+\s*\/\s*(?:kg|l|100\s*g|stk)/gi, " ");
  for (const m of t.matchAll(PRICE_RE)) { const v = +m[1] + (/\d/.test(m[2]) ? +m[2] / 100 : 0); if (v > 0.1 && v < 500) out.push(v); }
  if (!out.length) { const m = t.trim().match(/^(\d{1,2})\s?(\d{2})$/); if (m) out.push(+m[1] + m[2] / 100); } // grosser Preis ohne Punkt, z.B. "795"
  return out;
}
const gap = (a, b) => ({ x: Math.max(0, b.x0 - a.x1, a.x0 - b.x1), y: Math.max(0, b.y0 - a.y1, a.y0 - b.y1) });
function findDeals(blocks) {
  const deals = [];
  // Text unter oder neben dem Produktnamen gehört eher dazu als Text darüber
  const dist = (a, o) => { const g = gap(a, o), above = o.y1 <= a.y0 + a.h * 0.3; return { d: g.x * 1.5 + g.y + (above ? 0.15 : 0), ok: g.x < 0.12 && g.y < (above ? 0.06 : 0.2) }; };
  const prods = blocks.map(b => [b, liveMatch(b.text)]).filter(x => x[1]);
  // jeder andere Textblock gehört zum nächstgelegenen Produktnamen (so mischen sich Nachbar-Kacheln nicht)
  const owner = new Map();
  for (const o of blocks) {
    if (prods.some(([b]) => b === o)) continue;
    let best = null;
    for (const [b] of prods) { const r = dist(b, o); if (r.ok && (!best || r.d < best.d)) best = { b, d: r.d }; }
    if (best) owner.set(o, best);
  }
  for (const [b, p] of prods) {
    const near = [...owner].filter(([, v]) => v.b === b).sort((x, y) => x[1].d - y[1].d).slice(0, 10).map(([o]) => o);
    // Preise der nächsten Blöcke; Aktionspreis = am grössten gedruckt, Normalpreis = "statt …" oder ein höherer Preis daneben
    const cand = [];
    for (const o of [b, ...near]) for (const v of pricesIn(o.text)) cand.push({ v, h: o.h, statt: /statt|konkurrenz|vorher|bisher|normal/i.test(o.text), o });
    if (!cand.length) continue;
    const main = cand.filter(c => !c.statt).sort((a, c) => c.h - a.h)[0] || cand[0];
    let regular = cand.find(c => c.statt && c.v > main.v)?.v || cand.filter(c => c !== main && c.v > main.v && c.v < main.v * 4).sort((a, c) => a.v - c.v)[0]?.v || null;
    const pct = [b, ...near].map(o => o.text.match(/(\d{2})\s?%/)).find(Boolean);
    if (!regular && pct && +pct[1] < 80) regular = Math.round(main.v / (1 - pct[1] / 100) * 20) / 20;
    const ctx = [b, ...[...near].sort((x, y) => x.y0 - y.y0 || x.x0 - y.x0)].map(o => o.text).join(" ").replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|dl|l)\s*=\s*[\d.,]+/gi, " ");
    const size = liveSize(ctx, p.unit);
    deals.push({ productId: p.id, title: b.text.replace(/\s+/g, " ").slice(0, 60), size, price: main.v, regular });
  }
  // gleiche Aktion nur einmal
  const seen = new Set();
  return deals.filter(d => { const k = d.productId + "|" + d.price; if (seen.has(k)) return false; seen.add(k); return true; });
}
function findValidTo(text) {
  const m = [...text.matchAll(/(\d{1,2})\.\s?(\d{1,2})\.?\s*(?:\d{2,4})?\s*(?:–|—|-|bis)\s*(\d{1,2})\.\s?(\d{1,2})\.?\s*(\d{4}|\d{2})?/g)]
    .map(m => { const now = new Date(); let y = m[5] ? (m[5].length === 2 ? 2000 + +m[5] : +m[5]) : now.getFullYear();
      if (!m[5] && +m[4] < now.getMonth() - 1) y++; return `${y}-${String(m[4]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`; })
    .filter(d => d >= todayIso() && !isNaN(new Date(d)));
  return m.sort()[0] || null;
}
function findStore(text) {
  const t = text.toLowerCase(), hits = Object.keys(STORES).map(s => [s, (t.match(new RegExp("\\b" + STORES[s].name.toLowerCase() + "\\b", "g")) || []).length]).sort((a, b) => b[1] - a[1]);
  return hits[0][1] ? hits[0][0] : null;
}

// ---------- Ablauf + Vorschau ----------
let scanDeals = [];
async function scanFiles(files) {
  if (!files.length) return;
  $("#scanResult").innerHTML = ""; scanDeals = []; let allText = "";
  const btns = document.querySelectorAll(".scan-btn"); btns.forEach(b => b.classList.add("busy"));
  try {
    for (const [i, f] of [...files].entries()) {
      const tag = files.length > 1 ? `Datei ${i + 1} von ${files.length}` : "Bild";
      if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
        await pdfPages(f, blocks => { allText += blocks.map(b => b.text).join("\n") + "\n"; scanDeals.push(...findDeals(blocks)); });
      } else if (f.type.startsWith("image/") || /\.(jpe?g|png|heic|webp)$/i.test(f.name)) {
        scanStatus(`${tag} wird vorbereitet …`);
        const blocks = await ocrBlocks(await toCanvas(f), tag);
        allText += blocks.map(b => b.text).join("\n") + "\n"; scanDeals.push(...findDeals(blocks));
      } else throw new Error(`„${f.name}“ ist weder Bild noch PDF.`);
    }
  } catch (e) { scanStatus("Das hat nicht geklappt: " + e.message, true); btns.forEach(b => b.classList.remove("busy")); return; }
  btns.forEach(b => b.classList.remove("busy"));
  scanDeals.store = findStore(allText) || $("#ownStore").value;
  scanDeals.validTo = findValidTo(allText) || $("#ownValid").value || nextMonday();
  scanStatus(scanDeals.length ? `${scanDeals.length} ${scanDeals.length === 1 ? "Aktion" : "Aktionen"} erkannt. Bitte kurz prüfen und korrigieren.`
    : "Keine passenden Aktionen erkannt. Tipp: Foto gerade und nah aufnehmen, oder die Aktion unten von Hand eintragen.", !scanDeals.length);
  renderScan();
}
const sizeText = (p, s) => !s ? "" : p.unit === "kg" ? (s < 1 ? String(Math.round(s * 1000)) : s + " kg") : p.unit === "l" ? (s < 1 ? String(r3(s * 10)) : s + " l") : String(s);
function renderScan() {
  if (!scanDeals.length) { $("#scanResult").innerHTML = ""; return; }
  const opts = sel => [...PRODUCTS].sort((a, b) => a.label.localeCompare(b.label, "de")).map(p => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${p.icon || ""} ${esc(p.label)}</option>`).join("");
  $("#scanResult").innerHTML = `<div class="scan-head">
      <label>Laden<select id="scanStore">${Object.keys(STORES).map(s => `<option value="${s}" ${s === scanDeals.store ? "selected" : ""}>${STORES[s].name}</option>`).join("")}</select></label>
      <label>Gültig bis<input id="scanValid" type="date" value="${scanDeals.validTo}"></label></div>
    <ul class="scan-list">${scanDeals.map((d, i) => { const p = productById(d.productId), miss = !d.size;
      return `<li class="scan-row ${miss ? "warn" : ""}" data-i="${i}">
        <label class="scan-check"><input type="checkbox" data-f="on" ${miss ? "" : "checked"}></label>
        <div class="scan-fields">
          <select data-f="productId">${opts(d.productId)}</select>
          <input data-f="title" type="text" value="${esc(d.title)}" aria-label="Bezeichnung">
          <div class="scan-nums">
            <label>Packung (${{ kg: "g", l: "dl", stk: "Stk." }[p.unit]})<input data-f="size" type="text" inputmode="decimal" value="${esc(sizeText(p, d.size))}" placeholder="fehlt"></label>
            <label>Aktion<input data-f="price" type="text" inputmode="decimal" value="${d.price.toFixed(2)}"></label>
            <label>Normal<input data-f="regular" type="text" inputmode="decimal" value="${d.regular ? d.regular.toFixed(2) : ""}"></label>
          </div>
        </div></li>`; }).join("")}</ul>
    <button type="button" class="btn primary block" id="scanSave">Ausgewählte übernehmen</button>`;
}
function scanSave() {
  const sid = $("#scanStore").value, validTo = $("#scanValid").value; let n = 0, bad = 0;
  if (!validTo || validTo < todayIso()) return scanStatus("Bitte ein gültiges Enddatum wählen.", true);
  document.querySelectorAll(".scan-row").forEach(li => {
    const f = k => li.querySelector(`[data-f=${k}]`); if (!f("on").checked) return;
    const p = productById(f("productId").value), size = ownSize(p, f("size").value), price = num(f("price").value), regular = num(f("regular").value);
    if (!size || !price) { bad++; li.classList.add("warn"); return; }
    state.own.push({ id: Date.now() + Math.random(), store: sid, productId: p.id, title: f("title").value.trim(), size, price, regular: regular && regular > price ? regular : null, validTo });
    li.remove(); n++;
  });
  store_set_own();
  scanStatus(n ? `✓ ${n} ${n === 1 ? "Aktion" : "Aktionen"} gespeichert.${bad ? ` ${bad} brauchen noch Packung oder Preis.` : ""}` : "Nichts gespeichert: Packung und Aktionspreis müssen ausgefüllt sein.", !n);
  if (!document.querySelector(".scan-row")) $("#scanResult").innerHTML = "";
  renderOwn();
}
function store_set_own() { store.set("own", state.own); applyOwn(); }

function initScan() {
  for (const id of ["#scanPhoto", "#scanFile"]) $(id).addEventListener("change", e => { scanFiles(e.target.files); e.target.value = ""; });
  $("#scanResult").addEventListener("click", e => { if (e.target.id === "scanSave") scanSave(); });
  $("#scanResult").addEventListener("change", e => { // Produkt gewechselt → Einheit im Label anpassen
    if (e.target.dataset.f !== "productId") return; const p = productById(e.target.value);
    e.target.closest(".scan-row").querySelector("[data-f=size]").previousSibling.textContent = `Packung (${{ kg: "g", l: "dl", stk: "Stk." }[p.unit]})`;
  });
}
initScan();
