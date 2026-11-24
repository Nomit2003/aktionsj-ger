import urllib.request, re, gzip, json, collections
from playwright.sync_api import sync_playwright
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", "Accept-Language": "de-CH,de;q=0.9"}
def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40); b = r.read()
        if b[:2] == b"\x1f\x8b": b = gzip.decompress(b)
        return r.status, b.decode("utf-8", "replace")
    except Exception as e:
        return getattr(e, "code", 0), str(e)
s, t = get("https://www.denner.ch/sitemap.product.xml")
L = [l for l in re.findall(r"<loc>\s*([^<]+?)\s*</loc>", t) if "/de/" in l]
print("DENNER de products", len(L), collections.Counter(l.split("/")[4] for l in L).most_common(30))
food = [l for l in L if "/weinshop/" not in l]
print("\n".join(food[:30]))
for u in food[:2]:
    s, h = get(u); txt = re.sub(r"<[^>]+>", " ", h); txt = re.sub(r"\s+", " ", txt)
    print("##", u, s, len(h)); print(txt[:1500])
    print(" jsonld:", re.findall(r'"price"\s*:\s*"?([\d.]+)', h)[:5], re.findall(r'application/ld\+json[^>]*>(.{0,600})', h)[:1])
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(locale="de-CH", user_agent=UA["User-Agent"])
    r = pg.goto("https://www.aldi-suisse.ch/de/sortiment/milchprodukte-und-eier", timeout=60000); pg.wait_for_timeout(5000)
    print("ALDI", r.status, pg.url)
    tiles = pg.eval_on_selector_all("a[href*='/produkt/']", "as => as.map(a => a.innerText.replace(/\\s+/g,' ').trim() + ' => ' + a.getAttribute('href'))")
    print(len(tiles)); print("\n".join(tiles[:25]))
    print(pg.inner_text("body")[:1500])
    print([a for a in pg.eval_on_selector_all("a[href]", "as => as.map(a => a.getAttribute('href'))") if "sortiment" in a or "page=" in a][:60])
    b.close()
