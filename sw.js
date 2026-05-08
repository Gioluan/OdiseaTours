/* === SERVICE WORKER — Odisea Tours PWA === */
const CACHE_NAME = 'odisea-tours-v42';
const ASSETS = [
  './',
  './index.html',
  './portal.html',
  './guide.html',
  './css/styles.css',
  './css/portal.css',
  './css/guide.css',
  './js/data.js',
  './js/auth.js',
  './js/briefing.js',
  './js/dashboard.js',
  './js/quote.js',
  './js/crm.js',
  './js/tours.js',
  './js/invoicing.js',
  './js/email.js',
  './js/passengers.js',
  './js/clients.js',
  './js/providers.js',
  './js/pdf-quote.js',
  './js/pdf-itinerary.js',
  './js/portal.js',
  './js/guide.js',
  './js/app.js',
  './firebase-config.js',
  './manifest.json',
  './portal-manifest.json',
  './guide-manifest.json',
  './img/icon-192.png',
  './img/icon-512.png'
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML (ensures updates propagate), cache-first for assets
self.addEventListener('fetch', event => {
  // Skip non-GET and external requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // HTML documents: network-first so updates reach all devices quickly
  if (event.request.destination === 'document' || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request) || caches.match('./index.html'))
    );
    return;
  }

  // JS / CSS / JSON: network-first with cached fallback. Critical: cache-first
  // here used to serve stale code for entire deployment cycles, breaking
  // production fixes silently until the cache version was bumped manually.
  const url = new URL(event.request.url);
  const path = url.pathname;
  const isCodeAsset = /\.(js|css|json)$/i.test(path);
  if (isCodeAsset) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Images / fonts / other binary assets: cache-first (rarely change, big to refetch)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
