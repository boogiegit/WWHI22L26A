// Cache only explicitly approved application code and icons. Never cache API responses,
// navigation, tour data, documents, uploaded media, invitation links or third-party requests.
const CACHE_NAME = 'wwhi22l26a-static-v172';
const STATIC_PATHS = [
  './js/core/tour-updates.js',
  './css/app.css', './manifest.json', './favicon.ico', './favicon-16.png',
  './favicon-32.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png',
  './js/core/journey-recaps.js', './js/services/onward-export.js',
  './js/services/auth.js', './js/services/storage.js', './js/services/analytics.js',
  './js/services/admin-content-storage.js', './js/services/admin-content-overrides.js',
  './js/core/utils.js', './js/core/itinerary-helpers.js', './js/core/resource-helpers.js',
  './js/core/tour-config-helpers.js', './js/core/today-state.js',
  './js/maps/map-panel.js', './js/navigation/navigation.js', './js/viewer/document-viewer.js',
  './js/rendering/contacts-renderer.js', './js/rendering/travel-director-renderer.js',
  './js/rendering/experiences-renderer.js', './js/rendering/tools-renderer.js',
  './js/rendering/rewards-renderer.js', './js/rendering/travel-impact-renderer.js',
  './js/rendering/today-components.js', './js/rendering/itinerary-components.js'
];
const APPROVED = new Set(STATIC_PATHS.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([...APPROVED])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME &&
    key.startsWith('wwhi22l26a-')).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const canonical = url.origin + url.pathname;
  if (!APPROVED.has(canonical) || event.request.mode === 'navigate') {
    // no-store also bypasses the ordinary HTTP cache for private requests.
    if (url.origin === self.location.origin) {
      event.respondWith(fetch(event.request, { cache: 'no-store' }));
    }
    return;
  }
  event.respondWith(fetch(event.request, { cache: 'no-cache' }).then(async response => {
    if (response.ok && !response.redirected && !/no-store|private/i.test(response.headers.get('Cache-Control') || '')) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(canonical, response.clone());
    }
    return response;
  }).catch(() => caches.match(canonical)));
});
