"""Lädt die aktuellen Wochenaktionen von den öffentlichen Aktionsseiten der Läden
und schreibt sie nach aktionen.json. Läuft täglich über GitHub Actions.

Liest pro Laden nur die öffentliche Aktionsübersicht (1–5 Seitenabrufe pro Tag).
Funktioniert ein Laden nicht (Seite geändert, gesperrt), bleiben dessen letzte Daten stehen.
"""
import html, json, re, sys, urllib.request
from datetime import datetime, timedelta, timezone

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
TZ = timezone(timedelta(hours=1))
TODAY = datetime.now(TZ).date()


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "de-CH,de"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def txt(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def chf(s):
    """'–.69' → 0.69, '4.50' → 4.5, '11.20' → 11.2"""
    if s is None:
        return None
    s = s.replace("–", "0").replace("-", "0").replace("'", "")
    m = re.search(r"\d+(?:\.\d+)?", s)
    return round(float(m.group()), 2) if m else None


def ddmm(s, ref=TODAY):
    """'28.11.' → Datum im passenden Jahr"""
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.", s or "")
    if not m:
        return None
    d, mo = int(m.group(1)), int(m.group(2))
    y = ref.year + (1 if mo < ref.month - 6 else 0) - (1 if mo > ref.month + 6 else 0)
    return f"{y:04d}-{mo:02d}-{d:02d}"


def offer(store, title, size, price, regular, valid_from=None, valid_to=None, image=None, url=None):
    if not title or price is None:
        return None
    disc = round((1 - price / regular) * 100) if regular and regular > price else None
    return {"store": store, "title": title, "size": size or "", "price": price, "regular": regular if disc else None,
            "discount": disc, "validFrom": valid_from, "validTo": valid_to, "image": image, "url": url}


# ---------- Volg: Frische-Aktionen ab Mittwoch, weitere ab Montag ----------
def volg():
    b = get("https://www.volg.ch/sortiment/wochenaktionen/")
    out = []
    for sec in re.split(r'<h2 class="c-section__subtitle">', b)[1:]:
        span = re.search(r"<span>(.*?)</span>", sec)
        parts = (span.group(1) if span else "").split("bis")
        vf, vt = ddmm(parts[0]), ddmm(parts[1]) if len(parts) > 1 else None
        for c in re.split(r'<div class="c-product">', sec)[1:]:
            t = re.search(r'c-product__title[^>]*>(.*?)</h3>', c, re.S)
            desc = re.search(r'c-product__description">(.*?)(?:<br>|</div>)', c, re.S)
            pm = re.search(r'c-product__price-main">([^<]+)', c)
            reg = re.search(r'statt\s*([\d.–-]+)', c)
            img = re.search(r'<img src="([^"]+)"', c)
            o = offer("volg", txt(t.group(1)) if t else "", txt(desc.group(1)) if desc else "", chf(pm.group(1)) if pm else None,
                      chf(reg.group(1)) if reg else None, vf, vt,
                      "https://www.volg.ch" + img.group(1) if img else None, "https://www.volg.ch/sortiment/wochenaktionen/")
            if o: out.append(o)
    return out


# ---------- Denner: Aktionen laufen Dienstag bis Montag ----------
def denner():
    b = get("https://www.denner.ch/de/aktionen/aktuelle-aktionen")
    out = []
    # Gültigkeit steht nicht auf der Übersicht: Denner-Aktionswoche = Dienstag bis Montag
    start = TODAY - timedelta(days=(TODAY.weekday() - 1) % 7)
    vf, vt = start.isoformat(), (start + timedelta(days=6)).isoformat()
    for c in re.split(r'<div class="product-item stretch-link', b)[1:]:
        t = re.search(r'product-item__title[^>]*>(.*?)</h3>', c, re.S)
        sub = re.search(r'product-item__subline[^>]*>(.*?)</div>', c, re.S)
        pm = re.search(r'price-tag__final-price[^>]*>([^<]+)', c)
        reg = re.search(r'price-tag__instead[^>]*>\s*statt\s*([^<]+)', c)
        img = re.search(r'class="product-item__image"[^>]*\bsrc="([^"]+)"', c)
        link = re.search(r'<a href="(/de/aktionen/[^"]+)"', c)
        o = offer("denner", txt(t.group(1)) if t else "", txt(sub.group(1)) if sub else "", chf(pm.group(1)) if pm else None,
                  chf(reg.group(1)) if reg else None, vf, vt,
                  html.unescape(img.group(1)) if img else None, "https://www.denner.ch" + link.group(1) if link else None)
        if o: out.append(o)
    return out


# ---------- Lidl: mehrere Wochenaktions-Seiten, Daten als JSON in der Seite ----------
def lidl():
    home = get("https://www.lidl.ch/")
    pages = sorted(set(re.findall(r'/c/de-CH/store/wochenaktion/a\d+', home))) or ["/c/de-CH/store/wochenaktion/a10107043"]
    out, seen = [], set()
    fmt = lambda t: datetime.fromtimestamp(t, TZ).date().isoformat() if t else None
    for p in pages[:4]:
        b = get("https://www.lidl.ch" + p)
        for raw in re.findall(r'data-grid-data="([^"]+)"', b):
            try:
                d = json.loads(html.unescape(raw))
            except ValueError:
                continue
            if d.get("productId") in seen or not d.get("price"):
                continue
            seen.add(d.get("productId"))
            pr = d["price"]
            desc = txt((d.get("keyfacts") or {}).get("description", ""))
            o = offer("lidl", d.get("fullTitle") or d.get("title"), desc, pr.get("price"), pr.get("oldPrice"),
                      fmt(d.get("storeStartDate")), fmt(d.get("storeEndDate")), d.get("image"),
                      "https://www.lidl.ch" + d.get("canonicalUrl", ""))
            if o: out.append(o)
    return out


SOURCES = {"volg": volg, "denner": denner, "lidl": lidl}


def main():
    try:
        old = json.load(open("aktionen.json", encoding="utf-8"))
    except (OSError, ValueError):
        old = {"stores": {}, "offers": []}
    offers, status = [], {}
    for store, fn in SOURCES.items():
        try:
            got = fn()
            if not got:
                raise RuntimeError("keine Angebote gefunden (Seite geändert?)")
            offers += got
            status[store] = {"ok": True, "count": len(got), "updated": TODAY.isoformat()}
            print(f"{store}: {len(got)} Aktionen")
        except Exception as e:  # alte Daten behalten
            keep = [o for o in old.get("offers", []) if o["store"] == store]
            offers += keep
            prev = old.get("stores", {}).get(store, {})
            status[store] = {"ok": False, "count": len(keep), "updated": prev.get("updated"), "error": str(e)[:200]}
            print(f"{store}: FEHLER {e} – behalte {len(keep)} alte Aktionen", file=sys.stderr)
    offers = [o for o in offers if not o.get("validTo") or o["validTo"] >= TODAY.isoformat()]  # abgelaufene weg
    data = {"updated": datetime.now(TZ).isoformat(timespec="minutes"), "stores": status, "offers": offers}
    same = {k: v for k, v in data.items() if k != "updated"} == {k: v for k, v in old.items() if k != "updated"}
    if same:
        print("keine Änderungen")
        return
    with open("aktionen.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"gespeichert: {len(offers)} Aktionen")


if __name__ == "__main__":
    main()
