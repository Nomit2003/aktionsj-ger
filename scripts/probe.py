"""Testlauf 2: Datenformat von Denner ansehen, Aktionslinks von Lidl/Spar/Volg/Aldi finden, Migros-Skripte finden."""
import re, urllib.request, json
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "de-CH,de", "Accept": "text/html,application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.url, r.read().decode("utf-8", "replace")
# Denner: Struktur der eingebetteten Daten
try:
    st, u, b = get("https://www.denner.ch/de/aktionen/aktuelle-aktionen")
    for m in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', b, re.S): print("DENNER LD:", m[:600])
    i = b.find("__NUXT"); print("DENNER NUXT:", b[i:i+1500].replace("\n", " "))
    for kw in ["Fr.", "CHF", "statt", "%", "price", "Preis"]:
        j = b.find(kw); print(f"DENNER kw {kw!r}:", b[max(0,j-200):j+200].replace("\n"," ") if j >= 0 else "-")
except Exception as e: print("DENNER FEHLER", e)
for name, url in {"lidl": "https://www.lidl.ch/", "spar": "https://www.spar.ch/", "volg": "https://www.volg.ch/", "aldi": "https://www.aldi-suisse.ch/de/"}.items():
    try:
        st, u, b = get(url)
        links = sorted(set(l for l in re.findall(r'href="([^"]+)"', b) if re.search(r"aktion|angebot|promo|prospekt|flugblatt|deal", l, re.I)))
        print(f"{name.upper()} {st} {u} links:", links[:25])
    except Exception as e: print(name.upper(), "FEHLER", e)
try:
    st, u, b = get("https://www.migros.ch/de/offers/home")
    print("MIGROS scripts:", re.findall(r'<script[^>]+src="([^"]+)"', b)[:15])
    for kw in ["api", "graphql", "onesearch", "product-display"]:
        print("MIGROS kw", kw, b.count(kw))
except Exception as e: print("MIGROS FEHLER", e)
