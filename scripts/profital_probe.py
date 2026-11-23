"""Einmaliger Test: Wie ist profital.ch aufgebaut und was erlauben robots.txt / Nutzungsbedingungen?"""
import re, urllib.request
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA, "Accept-Language": "de-CH"}), timeout=30) as r:
        return r.status, r.url, r.read().decode("utf-8", "replace")
for u in ["https://www.profital.ch/robots.txt", "https://www.profital.ch/", "https://www.profital.ch/de/coop"]:
    try:
        st, url, b = get(u)
        print("PROFITAL", u, st, url, len(b))
        if u.endswith("robots.txt"): print("PROFITAL ROBOTS:", b[:1500].replace("\n", " | "))
        else:
            print("PROFITAL LINKS:", sorted(set(l for l in re.findall(r'href="([^"]+)"', b) if re.search(r"agb|nutzung|terms|impressum|rechtlich|legal|coop|migros|aldi|spar", l, re.I)))[:30])
            print("PROFITAL APIHINTS:", sorted(set(re.findall(r'https?://[a-z0-9.-]*(?:api|offerista|bonial|cdn)[a-z0-9./-]*', b)))[:15], "next:", "__NEXT_DATA__" in b, "nuxt:", "__NUXT" in b)
    except Exception as e: print("PROFITAL", u, "FEHLER", e)
