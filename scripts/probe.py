"""Testlauf: Welche Aktionsseiten der Läden sind von GitHub aus erreichbar und in welchem Format?
Liest nur je eine öffentliche Seite pro Laden. Ergebnis steht im Log des Workflows."""
import re, urllib.request

URLS = {
    "migros": "https://www.migros.ch/de/offers/home",
    "coop":   "https://www.coop.ch/de/aktionen/aktuelle-aktionen/c/m_1011",
    "denner": "https://www.denner.ch/de/aktionen",
    "lidl":   "https://www.lidl.ch/c/de-CH/aktionen-der-woche/a10006065",
    "aldi":   "https://www.aldi-suisse.ch/de/aktionen.html",
    "spar":   "https://www.spar.ch/aktionen",
    "volg":   "https://www.volg.ch/aktionen/",
}
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
for store, url in URLS.items():
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "de-CH,de"})
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode("utf-8", "replace")
            title = re.search(r"<title[^>]*>(.*?)</title>", body, re.S)
            print(f"[{store}] {r.status} {r.headers.get('content-type')} {len(body)} bytes final={r.url}")
            print(f"   title: {title.group(1).strip()[:100] if title else '-'}")
            print(f"   preise: {len(re.findall(r'\\d+\\.\\d{2}', body))}  json-ld: {body.count('application/ld+json')}  next_data: {'__NEXT_DATA__' in body}  nuxt: {'__NUXT' in body}")
            for m in re.findall(r'(?:src|href)="([^"]*(?:api|json|graphql)[^"]*)"', body)[:5]:
                print("   api-hint:", m[:150])
    except Exception as e:
        print(f"[{store}] FEHLER {type(e).__name__}: {e}")
