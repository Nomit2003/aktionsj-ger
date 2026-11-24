"""Echte Normalpreise sammeln → normalpreise.json

Quellen (nur öffentliche, laut robots.txt erlaubte Seiten):
  1. Aldi: das ganze Sortiment auf aldi-suisse.ch/de/sortiment/… (Preis im Regal). Einmal pro Woche.
  2. „statt“-Preise aus den Wochenaktionen (Volg, Denner, Lidl): das ist der eigene Normalpreis des Ladens.
     Denner-Preise mit * sind ein Konkurrenzvergleich und werden NICHT genommen. Täglich, gesammelt über die Wochen.
Migros (Online-Shop sperrt automatische Abrufe), Coop (gesperrt), Spar und Volg (kein Online-Sortiment) haben keine Quelle.

Aufruf: python scripts/normalpreise.py           → Aldi-Sortiment + statt-Preise
        python scripts/normalpreise.py --statt   → nur statt-Preise (schnell, im täglichen Aktionen-Lauf)
"""
import json, re, sys
from datetime import datetime, timedelta, timezone

TZ = timezone(timedelta(hours=1))
TODAY = datetime.now(TZ).date().isoformat()
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
KEEP_DAYS = 150  # statt-Preise so lange behalten


def load(path, default):
    try:
        return json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return default


def statt_prices():
    akt = load("aktionen.json", {"offers": []})
    out = []
    for o in akt["offers"]:
        if not o.get("regular") or o["store"] not in ("volg", "denner", "lidl"):
            continue
        if o["store"] == "denner" and o.get("cmp") is not False:
            continue  # Konkurrenzvergleich oder unbekannt
        if o.get("cat") and o["cat"] != "Food":
            continue
        if re.search(r"nur (im|in der) (Tessin|Romandie|Westschweiz)", o["title"], re.I):
            continue  # regionale Preise
        out.append({"store": o["store"], "title": o["title"], "size": o.get("size", ""), "price": o["regular"], "date": TODAY, "src": "statt"})
    return out


def aldi_sortiment():
    from playwright.sync_api import sync_playwright
    out, seen = [], set()
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        page = br.new_page(user_agent=UA, locale="de-CH", viewport={"width": 1280, "height": 900})
        page.goto("https://www.aldi-suisse.ch/de/sitemap.xml", timeout=60000)
        cats = sorted(set(re.findall(r"https://www\.aldi-suisse\.ch/de/sortiment/[a-z0-9-]+(?=[<\s\"])", page.content())))
        skip = ("tiefpreisversprechen", "superdeals", "neu-im-sortiment", "dauerhafte-preissenkung", "alkohol-und-tabakwaren")
        cats = [c for c in cats if not c.endswith(skip)]
        print("Aldi Kategorien:", len(cats))
        lists = []
        for c in cats:
            page.goto(c, wait_until="domcontentloaded", timeout=60000); page.wait_for_timeout(3500)
            links = page.eval_on_selector_all("a[href*='/de/produkte/']", "as => as.map(a => a.href)")
            lists += [l.split("?")[0] for l in links if re.search(r"/k/\d+$", l.split("?")[0])]
        lists = list(dict.fromkeys(lists))
        # Unterkategorien weglassen, wenn die Oberkategorie schon dabei ist (enthält dieselben Produkte)
        path = lambda u: u.split("/de/produkte/")[1].rsplit("/k/", 1)[0]
        lists = [l for l in lists if not any(path(l) != path(o) and path(l).startswith(path(o) + "/") for o in lists)]
        print("Aldi Produktlisten:", len(lists))
        for base in lists:
            for pg in range(1, 15):  # robots.txt erlaubt ?page=
                page.goto(base + (f"?page={pg}" if pg > 1 else ""), wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(3000)
                for _ in range(8):
                    page.mouse.wheel(0, 4000); page.wait_for_timeout(500)
                tiles = page.eval_on_selector_all("a[href*='/produkt/']", """els => els.filter(e => /CHF/.test(e.innerText) && e.innerText.length < 400)
                    .map(e => ({href: e.href, text: e.innerText}))""")
                new = 0
                for t in tiles:
                    if t["href"] in seen: continue
                    seen.add(t["href"]); new += 1
                    text = t["text"].replace("\xa0", " ")
                    lines = [l.strip() for l in text.splitlines() if l.strip() and not l.strip().lower().startswith("verfügbar")]
                    prices = re.findall(r"CHF\s*(\d+(?:\.\d+)?)(?!\d|\.\d|\s*/)", text)
                    if not prices: continue
                    sizes = [l for l in lines if re.match(r"^[\d.,]+\s*(x\s*[\d.,]+\s*)?(g|kg|ml|cl|dl|l|Stück|Stk\.?)\b", l)]
                    name = [l for l in lines if "CHF" not in l and l not in sizes and not l.startswith("(") and l not in ("Gekühlt", "Tiefgekühlt")]
                    out.append({"store": "aldi", "title": " ".join(name[:2])[:120], "size": " ".join(sizes)[:60],
                                "price": round(float(prices[0]), 2), "date": TODAY, "src": "sortiment", "url": t["href"]})
                if len(tiles) < 20 or new == 0: break
            print(f"  {base.split('/de/produkte/')[1][:50]}: total {len(out)}")
        br.close()
    return out


def main():
    only_statt = "--statt" in sys.argv
    old = load("normalpreise.json", {"items": [], "stores": {}})
    items = [i for i in old["items"] if i["date"] >= (datetime.now(TZ).date() - timedelta(days=KEEP_DAYS)).isoformat()]
    stores = old.get("stores", {})
    if not only_statt:
        try:
            aldi = aldi_sortiment()
            if len(aldi) < 200: raise RuntimeError(f"nur {len(aldi)} Produkte")
            items = [i for i in items if i["src"] != "sortiment"] + aldi
            stores["aldi"] = {"count": len(aldi), "updated": TODAY, "source": "Sortiment aldi-suisse.ch"}
        except Exception as e:
            print(f"::warning::Aldi-Sortiment nicht geladen: {e}")
    # statt-Preise: neuester Eintrag pro Laden+Produkt gewinnt
    byk = {(i["store"], i["title"], i["size"]): i for i in items if i["src"] == "statt"}
    for i in statt_prices():
        byk[(i["store"], i["title"], i["size"])] = i
    items = [i for i in items if i["src"] != "statt"] + list(byk.values())
    for s in ("volg", "denner", "lidl"):
        n = sum(1 for i in items if i["store"] == s and i["src"] == "statt")
        if n: stores[s] = {"count": n, "updated": TODAY, "source": "Normalpreise aus den Wochenaktionen (statt-Preis)"}
    new = {"updated": stores and max(v["updated"] for v in stores.values()), "stores": stores, "items": sorted(items, key=lambda i: (i["store"], i["title"]))}
    if new["items"] != old.get("items") or new["stores"] != old.get("stores"):
        json.dump(new, open("normalpreise.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
        print("normalpreise.json geschrieben:", {s: v["count"] for s, v in stores.items()})
    else:
        print("keine Änderung")


if __name__ == "__main__":
    main()
