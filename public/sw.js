// contatti-fiera/public/sw.js
// version: 0.3.0
//
// La pagina si apre anche senza rete (in fiera il segnale va e viene):
// prima la rete, se manca la copia salvata. Le /api non si salvano mai.

const CASSA = "contatti-fiera-0.3.0";
const GUSCIO = ["./", "index.html", "estrai.js", "porta.js", "porta.css", "comuni.json", "manifest.json", "icona.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CASSA).then((c) => c.addAll(GUSCIO)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== CASSA).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.includes("/api/")) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(CASSA).then((c) => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
