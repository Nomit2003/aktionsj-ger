"""Testlauf 4: Details Denner-Produktkarte und Lidl-Produktdaten."""
import re, urllib.request, html
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "de-CH,de"})
    with urllib.request.urlopen(req, timeout=30) as r: return r.read().decode("utf-8", "replace")
def clean(s): return re.sub(r'\s+', ' ', re.sub(r' data-v-[0-9a-f]+', '', s))
b = get("https://www.denner.ch/de/aktionen/aktuelle-aktionen")
cards = re.split(r'<div class="product-item stretch-link', b)
print("DENNER cards", len(cards) - 1)
for c in cards[2:4]: print("DENNER CARD:", clean(c[:3000]))
i = b.find("Gültig"); print("DENNER GUELTIG:", clean(b[i-300:i+300]) if i >= 0 else "-")
for m in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', b, re.S): print("DENNER LD:", m[:800])
l = html.unescape(get("https://www.lidl.ch/c/de-CH/store/wochenaktion/a10107043"))
i = l.find('"fullTitle"'); print("LIDL fullTitle count", l.count('"fullTitle"'))
print("LIDL DATA:", l[max(0, i-1500):i+2500])
