// Fa aprire l'app anche senza rete: pagina e icone dalla cache, aggiornate quando c'è connessione.
const CACHE = "winter-arc-v2";
const BASE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    // Prima la rete (per ricevere gli aggiornamenti), poi la cache se sei offline.
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(url.pathname, c)); return r; }).catch(() => caches.match(url.pathname).then((r) => r || caches.match("/"))));
    return;
  }
  if (url.origin === location.origin) e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
