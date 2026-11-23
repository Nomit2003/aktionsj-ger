# Baut aus index.html, style.css, data.js und app.js eine einzige Datei: aktionsjaeger.html
# (läuft ohne Zusatzdateien, z.B. als Vorschau oder geteilter Link)
import re, pathlib
d = pathlib.Path(__file__).parent
html = (d / "index.html").read_text()
body = html[html.index("<body>") + 6 : html.index("</body>")]
body = re.sub(r'<script src="[^"]+"></script>\s*', "", body)
out = f'''<meta charset="utf-8">
<title>Aktionsjäger</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#0f766e">
<style>
{(d / "style.css").read_text()}
</style>
{body}
<script>
{(d / "data.js").read_text()}
</script>
<script>
{(d / "app.js").read_text()}
</script>
'''
(d / "aktionsjaeger.html").write_text(out)
print("ok", len(out))
