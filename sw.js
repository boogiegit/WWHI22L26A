// Cache only explicitly approved application code and icons. Never cache API responses,
// private data, uploaded media, invitation links or third-party requests.
// The public offline guide is the only saved tour-content document.
const CACHE_NAME = 'wwhi22l26a-static-v185';
const STATIC_PATHS = [
  './offline-guide.html', './js/services/offline-guide.js', './js/services/announcements.js', './js/services/experience-interest.js',
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
    key.startsWith('wwhi22l26a-') && key !== 'wwhi22l26a-offline-guide-v4').map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const canonical = url.origin + url.pathname;
  const scopeURL = new URL(self.registration.scope);
  if (event.request.mode === 'navigate' && url.origin === scopeURL.origin &&
      [scopeURL.pathname, scopeURL.pathname+'app.html', scopeURL.pathname+'index.html', scopeURL.pathname+'offline-guide.html'].includes(url.pathname)) {
    event.respondWith(fetch(event.request, {cache:'no-store'}).catch(async () => {
      const guideURL = new URL('./offline-guide.html',self.registration.scope).href;
      const saved = await caches.open('wwhi22l26a-offline-guide-v4');
      return await saved.match(guideURL) || await caches.match(guideURL) || new Response('Connect to the internet once to save your trip guide.', {status:503,headers:{'Content-Type':'text/plain'}});
    }));
    return;
  }
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

// Empty Web Push messages contain no guest or message data. Fetch the current public
// announcement, and always show a notification even if that fetch is unavailable.
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let title = 'New announcement from Brendon', body = 'Open Xmas Whirl 2026 to read the latest update.';
    try {
      const response = await fetch(new URL('./api.php?action=announcements', self.registration.scope), { cache:'no-store', signal:AbortSignal.timeout(5000) });
      if(response.ok) { const data=await response.json(); const item=data.items?.[0]; if(item) { title=item.title; body=item.body.slice(0,180); } }
    } catch {}
    await self.registration.showNotification(title,{body,icon:new URL('./icon-192.png',self.registration.scope).href,badge:new URL('./favicon-32.png',self.registration.scope).href,tag:'wwhi22l26a-announcement'});
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows) if(client.url.startsWith(self.registration.scope)) client.postMessage({type:'announcements'});
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async()=>{
    const url=new URL('./app.html?tab=announcements',self.registration.scope).href;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows) if(client.url.startsWith(self.registration.scope) && new URL(client.url).pathname.endsWith('/app.html')) { await client.focus(); client.postMessage({type:'announcements',open:true}); return; }
    await self.clients.openWindow(url);
  })());
});
