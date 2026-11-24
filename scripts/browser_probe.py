"""Einmaliger Test 3: Aldi-Aktionsseiten nach Datum und deren Produkt-Schnittstelle."""
import re, json
from playwright.sync_api import sync_playwright
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(user_agent=UA, locale="de-CH", viewport={"width": 1280, "height": 900}); page = ctx.new_page()
    apis = []
    page.on("response", lambda r: apis.append(r) if "api.aldi" in r.url else None)
    for d in ["2026-11-23", "2026-11-26"]:
        apis.clear()
        r = page.goto(f"https://www.aldi-suisse.ch/de/aktionen-und-angebote/{d}", wait_until="domcontentloaded"); page.wait_for_timeout(7000)
        for _ in range(6): page.mouse.wheel(0, 3000); page.wait_for_timeout(1000)
        body = page.inner_text("body")
        print("ALDI PAGE", d, r.status, page.title(), "Preise:", len(re.findall(r"\d+\.\d{2}", body)))
        i = body.find("CHF"); print("ALDI TEXT", re.sub(r"\s+", " ", body[max(0, i-1500):i+1500]))
        for a in apis[:12]: print("ALDI API", a.status, a.url[:300])
        for a in apis:
            if "product" in a.url and "category-tree" not in a.url:
                try: print("ALDI SAMPLE", a.url[:300], a.text()[:3000])
                except Exception as e: print("ALDI SAMPLE FEHLER", e)
                break
    br.close()
