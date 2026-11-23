"""Testlauf 3: Beispiel-Ausschnitte der Aktionsseiten, um die Leser (Parser) zu schreiben."""
import re, urllib.request
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "de-CH,de"})
    with urllib.request.urlopen(req, timeout=30) as r: return r.status, r.url, r.read().decode("utf-8", "replace")
def clean(s): return re.sub(r'\s+', ' ', re.sub(r'data-v-[0-9a-f]+', '', s))
PAGES = {"DENNER": ("https://www.denner.ch/de/aktionen/aktuelle-aktionen", "price-tag__final-price"),
         "LIDL": ("https://www.lidl.ch/c/de-CH/store/wochenaktion/a10107043", "statt"),
         "SPAR": ("https://www.spar.ch/aktuelles/angebote", "statt"),
         "VOLG": ("https://www.volg.ch/sortiment/wochenaktionen/", "statt")}
for name, (url, kw) in PAGES.items():
    try:
        st, u, b = get(url)
        idx = [m.start() for m in re.finditer(re.escape(kw), b)]
        print(f"{name} {st} {u} len={len(b)} hits={len(idx)} gueltig={re.findall(r'(?:gültig|Gültig|bis)[^<]{0,60}', b)[:3]}")
        print(f"{name} jsonhints:", re.findall(r'"(?:price|fullTitle|title|name|validFrom|startDate|endDate)"\s*:', b)[:10], "ld:", b.count('ld+json'))
        for k, i in enumerate(idx[:3]): print(f"{name} SNIP{k}:", clean(b[max(0, i - 1500):i + 400]))
        if not idx:
            i = b.find("<main"); print(f"{name} MAIN:", clean(b[i:i + 3000]))
    except Exception as e: print(name, "FEHLER", e)
