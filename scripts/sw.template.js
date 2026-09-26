/* Table Games service worker. Generated into dist/sw.js by scripts/build-pwa.mjs — do not edit dist/sw.js. */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;

const CACHE_PREFIX = 'table-games-';
const CACHE = CACHE_PREFIX + VERSION;
// Scope ends with "/", e.g. "https://host/" or "https://host/Table-Games/".
const BASE = new URL(self.registration.scope).pathname;
const INDEX = BASE + 'index.html';

self.addEventListener('install', (event) => {
  // Precache the whole build so every game works offline after the first visit.
  // No skipWaiting here: a new version waits until the app asks for it (see src/pwa/usePwa.ts),
  // so an open game never has its assets swapped out from under it.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((path) => BASE + path)))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  // App routes (/, /games/checkers, /settings…) are all served by the SPA shell.
  // Network-first so a fresh deploy is picked up; fall back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(INDEX, copy));
          }
          return response;
        })
        .catch(() => caches.match(INDEX, { ignoreSearch: true }))
    );
    return;
  }

  // Everything else is content-hashed by Metro, so cache-first is safe.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
