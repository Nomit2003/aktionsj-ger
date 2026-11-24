// Einfacher Offline-Cache für die App-Hülle (Netzwerk zuerst, Cache als Rückfall)
const CACHE = "aktionsjaeger-v11";
const FILES = ["./", "index.html", "style.css", "app.js", "prospekt.js", "data.js", "catalog.js", "manifest.json", "icon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // OSM-Anfragen nicht cachen
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});
