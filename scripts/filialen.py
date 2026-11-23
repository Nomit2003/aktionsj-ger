"""Lädt einmal pro Woche alle Filialen von Migros, Coop, Denner, Lidl, Aldi, Spar und Volg in der Schweiz
aus OpenStreetMap (Overpass) und speichert sie kompakt in filialen.json.
Die App sucht dann die Läden in deiner Nähe direkt in dieser Datei, ohne Wartezeit."""
import json, re, sys, urllib.parse, urllib.request
from datetime import datetime, timezone

QUERY = """[out:json][timeout:180];
area["ISO3166-1"="CH"][admin_level=2]->.ch;
nwr["shop"~"^(supermarket|convenience|discount)$"](area.ch);
out center tags;"""
ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
             "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
BRANDS = [(r"migrolino|coop pronto|denner express|avec|spar express", None),
          (r"\bmigros\b", "migros"), (r"\bcoop\b", "coop"), (r"\bdenner\b", "denner"), (r"\blidl\b", "lidl"),
          (r"\baldi\b", "aldi"), (r"\bspar\b", "spar"), (r"\bvolg\b", "volg")]

def brand(tags):
    t = " ".join(filter(None, [tags.get("brand"), tags.get("name"), tags.get("operator")])).lower()
    for pat, b in BRANDS:
        if re.search(pat, t):
            return b
    return None

def main():
    data = None
    import time
    for ep in ENDPOINTS * 2:  # zwei Runden, Overpass ist oft überlastet
        try:
            req = urllib.request.Request(ep, data=urllib.parse.urlencode({"data": QUERY}).encode(),
                                         headers={"User-Agent": "aktionsjaeger-filialen/1.0 (GitHub Actions)"})
            with urllib.request.urlopen(req, timeout=240) as r:
                data = json.load(r)
            print("Quelle:", ep)
            break
        except Exception as e:
            print("Fehler bei", ep, e, file=sys.stderr)
            time.sleep(30)
    if not data:
        print("::warning::Kein Overpass-Server erreichbar – alte filialen.json bleibt bestehen.")
        return
    rows = []
    for el in data["elements"]:
        tags = el.get("tags", {}); b = brand(tags)
        lat = el.get("lat") or (el.get("center") or {}).get("lat"); lon = el.get("lon") or (el.get("center") or {}).get("lon")
        if not b or lat is None:
            continue
        street = " ".join(filter(None, [tags.get("addr:street"), tags.get("addr:housenumber")]))
        rows.append([b, round(lat, 5), round(lon, 5), tags.get("name", ""), street, tags.get("addr:postcode", ""), tags.get("addr:city", "")])
    rows.sort()
    counts = {}
    for r in rows: counts[r[0]] = counts.get(r[0], 0) + 1
    print("Filialen:", counts)
    if len(rows) < 1000:
        sys.exit("Zu wenige Filialen – vermutlich Fehler, alte Datei bleibt.")
    with open("filialen.json", "w", encoding="utf-8") as f:
        json.dump({"updated": datetime.now(timezone.utc).date().isoformat(), "fields": ["laden", "lat", "lon", "name", "strasse", "plz", "ort"],
                   "rows": rows}, f, ensure_ascii=False, separators=(",", ":"))

if __name__ == "__main__":
    main()
