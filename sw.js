const CACHE = "corte-v1";
const ASSETS = [
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&family=Space+Mono&display=swap"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match("./index.html"))));
});
