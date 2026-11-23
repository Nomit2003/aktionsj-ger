"""Einmaliger Test: Nutzungsbedingungen von profital.ch – relevante Stellen ausgeben."""
import re, urllib.request, html
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
b = urllib.request.urlopen(urllib.request.Request("https://www.profital.ch/terms-of-use", headers={"User-Agent": UA}), timeout=30).read().decode("utf-8", "replace")
t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", b, flags=re.S))))
print("PROFITAL LEN", len(t))
for kw in ["automat", "Robot", "Scrap", "Crawl", "kommerziell", "gewerblich", "Vervielfältig", "Inhalte", "Daten", "API", "Urheber", "privat"]:
    for m in list(re.finditer(kw, t, re.I))[:2]:
        print(f"PROFITAL [{kw}]", t[max(0, m.start() - 250):m.start() + 300])
