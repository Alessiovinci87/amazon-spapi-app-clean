// Service Worker — DISABILITATO 2026-05-08
// Causa: cache vecchie servivano HTML per chiamate /api/, errore JSON.parse.
// Strategia: no-op che, all'attivazione, ripulisce TUTTE le cache e prende
// immediatamente il controllo per disabilitare anche i SW vecchi sui browser.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Niente handler fetch: tutte le richieste passano direttamente alla rete.
