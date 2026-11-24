"""Einmaliger Test: Aktionsseiten von Coop, Migros und Aldi mit einem echten Browser öffnen.
Gibt robots.txt-Regeln, Seitentitel, Textausschnitte und die JSON-Schnittstellen aus, die die Seite selbst lädt."""
import re, urllib.request
from playwright.sync_api import sync_playwright

PAGES = {
    "coop": ("https://www.coop.ch", "/de/aktionen/aktuelle-aktionen/c/m_1011"),
    "migros": ("https://www.migros.ch", "/de/offers/home"),
    "aldi": ("https://www.aldi-suisse.ch", "/de/aktionen.html"),
}
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

for store, (base, path) in PAGES.items():
    try:
        rob = urllib.request.urlopen(urllib.request.Request(base + "/robots.txt", headers={"User-Agent": UA}), timeout=20).read().decode("utf-8", "replace")
        rel = [l for l in rob.splitlines() if re.search(r"(?i)^(user-agent|disallow|allow)", l)]
        print(f"{store.upper()} ROBOTS ({len(rel)} Regeln):", " | ".join(rel[:40]))
    except Exception as e:
        print(f"{store.upper()} ROBOTS FEHLER", e)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for store, (base, path) in PAGES.items():
        ctx = br.new_context(user_agent=UA, locale="de-CH", viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        apis = []
        def on_resp(r, apis=apis):
            ct = r.headers.get("content-type", "")
            if "json" in ct:
                try: size = len(r.body())
                except Exception: size = -1
                apis.append((r.status, r.request.method, r.url[:220], size))
        page.on("response", on_resp)
        try:
            resp = page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(8000)
            for _ in range(4):
                page.mouse.wheel(0, 3000); page.wait_for_timeout(1500)
            body = page.inner_text("body")
            print(f"{store.upper()} STATUS {resp.status if resp else '-'} URL {page.url} TITLE {page.title()!r}")
            print(f"{store.upper()} TEXT ({len(body)} Zeichen, Preise: {len(re.findall(r'\\d+\\.\\d{2}', body))}):", re.sub(r'\s+', ' ', body)[:1500])
            big = sorted(apis, key=lambda a: -a[3])[:15]
            for a in big: print(f"{store.upper()} API", a)
        except Exception as e:
            print(f"{store.upper()} FEHLER", e)
        ctx.close()
    br.close()
