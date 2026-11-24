"""Einmaliger Test 2: Aldi Suisse – robots.txt, Aktionsseite finden und deren Datenquelle ansehen."""
import re, json
from playwright.sync_api import sync_playwright
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(user_agent=UA, locale="de-CH", viewport={"width": 1280, "height": 900}); page = ctx.new_page()
    r = page.goto("https://www.aldi-suisse.ch/robots.txt"); print("ALDI ROBOTS", r.status, re.sub(r"\s+", " | ", page.inner_text("body"))[:1500])
    page.goto("https://www.aldi-suisse.ch/de/", wait_until="domcontentloaded"); page.wait_for_timeout(5000)
    links = page.eval_on_selector_all("a", "els => els.map(e => [e.innerText.trim(), e.href])")
    akt = [l for l in links if re.search(r"(?i)aktion|angebot", l[0] + l[1])]
    print("ALDI LINKS", akt[:20])
    apis = []
    page.on("response", lambda r: apis.append((r.status, r.url)) if "api.aldi" in r.url else None)
    target = next((l[1] for l in akt if re.search(r"(?i)^aktionen$", l[0])), akt[0][1] if akt else None)
    if target:
        page.goto(target, wait_until="domcontentloaded"); page.wait_for_timeout(8000)
        for _ in range(5): page.mouse.wheel(0, 3000); page.wait_for_timeout(1200)
        body = page.inner_text("body")
        print("ALDI PAGE", page.url, page.title(), "Preise:", len(re.findall(r"\d+\.\d{2}", body)))
        print("ALDI TEXT", re.sub(r"\s+", " ", body)[:2500])
        sub = [l for l in page.eval_on_selector_all("a", "els => els.map(e => [e.innerText.trim(), e.href])") if re.search(r"(?i)aktion|angebot|ab (mo|do|mi|di|sa)", l[0] + l[1])]
        print("ALDI SUBLINKS", sub[:30])
    for a in apis[:25]: print("ALDI API", a)
    # Beispiel-Antwort einer Produkt-API zeigen
    for st, u in apis:
        if "product" in u and "category-tree" not in u:
            try:
                txt = page.request.get(u).text(); print("ALDI SAMPLE", u[:200], txt[:2500]); break
            except Exception as e: print("ALDI SAMPLE FEHLER", e)
    br.close()
