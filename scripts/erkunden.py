import urllib.request, re, gzip, json
from playwright.sync_api import sync_playwright
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", "Accept-Language": "de-CH,de;q=0.9"}
def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40); b = r.read()
        if b[:2] == b"\x1f\x8b": b = gzip.decompress(b)
        return r.status, b.decode("utf-8", "replace")
    except Exception as e:
        return getattr(e, "code", 0), str(e)
def locs(t): return re.findall(r"<loc>\s*([^<]+?)\s*</loc>", t)
for sm in ["https://www.denner.ch/sitemap.xml", "https://www.migros.ch/sitemap.xml", "https://www.lidl.ch/static/sitemap.xml"]:
    s, t = get(sm); L = locs(t); print("=====", sm, s, len(L)); print("\n".join(L[:40]))
    for sub in [l for l in L if re.search(r"product|produkt|artikel|sortiment", l, re.I)][:3]:
        s2, t2 = get(sub); L2 = locs(t2); print("  --", sub, s2, len(L2)); print("  " + "\n  ".join(L2[:8]))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(locale="de-CH", user_agent=UA["User-Agent"])
    for u in ["https://www.aldi-suisse.ch/robots.txt", "https://www.aldi-suisse.ch/sitemap.xml"]:
        r = pg.goto(u, timeout=60000); t = pg.content(); print("=====", u, r.status if r else None); print(re.sub(r"<[^>]+>", "\n", t)[:3000])
    for u in ["https://www.migros.ch/de/category/milch-butter-eier", "https://www.denner.ch/de/"]:
        try:
            r = pg.goto(u, timeout=60000); pg.wait_for_timeout(6000)
            t = pg.inner_text("body"); print("#####", u, r.status if r else None, len(t)); print(t[:2500])
            print(" links:", sorted(set(pg.eval_on_selector_all("a[href]", "as => as.map(a => a.getAttribute('href'))")))[:120])
        except Exception as e: print("#####", u, "ERR", e)
    b.close()
