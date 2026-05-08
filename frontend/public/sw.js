// Service Worker — Nexus PWA
// Strategia: Network First per tutto (dev-friendly)
// La cache serve solo come fallback offline

const CACHE_NAME = "nexus-v4-2026-05-08";
const STATIC_ASSETS = ["/", "/index.html"];

// Install: pre-cache della shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: pulisci TUTTE le cache vecchie
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network First per tutto — cache solo come fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Non interferire con le chiamate API
  if (url.pathname.startsWith("/api")) return;

  // Network First per tutto (JS, CSS, immagini, navigazione)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html")))
  );
});
