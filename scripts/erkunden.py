import urllib.request, re, json
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", "Accept-Language": "de-CH,de;q=0.9"}
def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30)
        return r.status, r.read().decode("utf-8", "replace")
    except Exception as e:
        return getattr(e, "code", 0), str(e)
for site in ["https://www.denner.ch", "https://www.aldi-suisse.ch", "https://www.lidl.ch", "https://www.migros.ch", "https://www.volg.ch", "https://www.spar.ch", "https://www.coop.ch", "https://prices.openfoodfacts.org"]:
    s, t = get(site + "/robots.txt")
    print("=====", site, s)
    print("\n".join(l for l in t.splitlines()[:80] if l.strip()))
for u in ["https://www.denner.ch/de/sortiment", "https://www.denner.ch/de/sortiment/milchprodukte-eier", "https://www.aldi-suisse.ch/de/produkte.html", "https://www.aldi-suisse.ch/de/sortiment", "https://www.lidl.ch/c/de-CH/lebensmittel/a10006065", "https://www.volg.ch/sortiment/"]:
    s, t = get(u)
    print("#####", u, s, len(t))
    print(" prices:", re.findall(r"\d+\.\d\d", t)[:15])
    print(" links:", sorted(set(re.findall(r'href="(/[^"]{3,80})"', t)))[:60])
