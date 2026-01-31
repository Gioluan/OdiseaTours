/* === SERVICE WORKER — Odisea Tours PWA === */
const CACHE_NAME = 'odisea-tours-v9';
const ASSETS = [
  './',
  './index.html',
  './portal.html',
  './css/styles.css',
  './css/portal.css',
  './js/data.js',
  './js/auth.js',
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
  './js/app.js',
  './firebase-config.js',
  './manifest.json',
  './portal-manifest.json',
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

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', event => {
  // Skip non-GET and external requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache new requests dynamically (like Google Fonts)
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
