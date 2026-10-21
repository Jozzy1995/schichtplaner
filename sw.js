// ── Schichtplaner · Service Worker ──────────────────────────────
// Schimbă versiunea când vrei să forțezi refresh pe toate dispozitivele
const CACHE_VERSION = 'v2';
const CACHE_NAME    = `schichtplaner-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── INSTALL: pre-cache fișierele principale ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: curăță cache-urile vechi ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: Cache-First cu fallback la rețea ──────────────────────
self.addEventListener('fetch', event => {
  // Ignorăm request-urile non-GET și chrome-extension://
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // Salvăm în cache doar răspunsuri valide
          if (
            response &&
            response.status === 200 &&
            response.type !== 'opaque'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback → pagina principală
          return caches.match('./program-munca.html');
        });
    })
  );
});

// ── MESSAGE: forțează update manual ─────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
