# Aktionsjäger v1 – Einkaufsliste mit Preisvergleich (Schweiz)

## So startest du die App
- **Am Computer:** Ordner öffnen und `index.html` im Browser öffnen. (Die Filialsuche braucht Internet.)
- **Am Handy als App:** Der Ordner muss über eine Webadresse erreichbar sein (z.B. kostenlos über GitHub Pages oder Netlify). Dann im Browser „Zum Home-Bildschirm hinzufügen“. Das richte ich gerne ein.

## Was die App kann
1. **Region:** PLZ/Ort oder GPS eingeben, Umkreis wählen. Die App sucht die echten Filialen in der Nähe (Migros, Coop, Denner, Lidl, Aldi, Spar, Volg) und vergleicht nur diese Läden. Läden lassen sich auch von Hand an- und abwählen.
2. **Einkaufsliste:** Produkte eintippen, auch mit Tippfehlern oder Mundart („Poulebrust“, „Härdöpfel“, „Kafi“). Bei jedem Produkt steht sofort der günstigste Laden.
3. **Einkaufsplan:** Liste nach Laden gruppiert, mit Total, Aktionsersparnis, Abhaken beim Einkaufen und Preisvergleich über alle Läden. Mit „Höchstens 1/2/3 Läden“ rechnet die App die günstigste Kombination aus.
4. Verglichen wird der **Preis pro kg / l / Stück**, damit verschiedene Packungsgrössen fair sind.

## Was echt ist und was nicht
| Teil | Stand v1 |
|---|---|
| Filialen in deiner Region | **Echt** (OpenStreetMap, live abgefragt) |
| Aktionen Volg, Denner, Lidl, Aldi | **Echt**, täglich automatisch geladen (`scripts/aktionen.py` → `aktionen.json`) |
| Aktionen Migros, Coop, Spar | noch Beispieldaten: Coop sperrt automatische Abrufe, Migros verbietet die Aktionsseiten in robots.txt, Spar hat keine Aktionsliste. Dafür gibt es unter „Aktionen“ den Knopf **„Aktion selbst eintragen“**: Aktionen aus dem Prospekt werden im Browser gespeichert und zählen beim Vergleich mit, bis sie ablaufen. Mit **„Prospekt einlesen“** (Foto oder PDF) liest die App Produkte und Preise selbst heraus (Texterkennung Tesseract.js bzw. pdf.js, läuft im Browser, in `lib/`). |
| Normalpreise | **Beispieldaten**, von Hand geschätzt (`data.js`), grosser Katalog mit ~250 Produkten in `catalog.js` (Preise pro Laden aus Richtpreis × typischem Preisniveau) |

## Mögliche echte Datenquellen (Recherche)
- **Keine offiziellen Preis-APIs:** Migros, Coop, Denner, Lidl, Aldi, Spar und Volg bieten keine öffentliche Schnittstelle für Preise/Aktionen.
- **Webshops/Aktionsseiten der Läden** (migros.ch, coop.ch, denner.ch, lidl.ch, aldi-suisse.ch): Preise sind öffentlich sichtbar, ein Scraper kann sie wöchentlich einlesen. Es gibt fertige kostenpflichtige Scraper (z.B. auf Apify für Migros, Coop, Denner).
- **Aktionsportale** (aktionis.ch, preispirat.ch, profital.ch): sammeln die Wochenaktionen aller Läden, das wäre die einfachste Quelle für Aktionen.
- **Rechtliches (keine Rechtsberatung):** Für eine private App ist das Auslesen öffentlicher Preise meist unproblematisch. Bei einer veröffentlichten App sind die Nutzungsbedingungen der Seiten und das UWG (Art. 5 lit. c, Übernahme fremder Arbeitsergebnisse) zu beachten. Daten direkt bei den Läden zu holen ist sicherer als die gesammelten Daten der Aktionsportale zu übernehmen.

## Automatischer Abruf
Der Workflow `.github/workflows/aktionen.yml` läuft jeden Morgen und übernimmt neue Aktionen am Tag, an dem ein Laden sie veröffentlicht. Fällt ein Laden aus, bleiben seine letzten Daten stehen. Manuell starten: GitHub → Actions → „Aktionen laden“ → Run workflow.

## Dateien
- `index.html`, `style.css`, `app.js`: die App
- `data.js`: Produkte und Preise (später automatisch wöchentlich erzeugt)
- `catalog.js`: ganzes Supermarkt-Sortiment (Gemüse, Früchte, Fleisch, Käse, Getränke, Haushalt, Hygiene …) mit Suchwörtern und Kategorien
- `manifest.json`, `sw.js`, `icon.svg`: damit sie wie eine Handy-App installierbar ist und offline startet
