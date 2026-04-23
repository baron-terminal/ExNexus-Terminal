// ExNexus Service Worker v1.1
const CACHE_NAME = 'exnexus-v2';
const STATIC_ASSETS = [
  '/',
  '/terminal.html',
  '/index.html',
  '/Icon.png',
  '/Logo.png'
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', event => {
  // Skip non-GET
  if(event.request.method !== 'GET') return;

  // ✅ FIX: Only handle http(s) — ignore chrome-extension://, moz-extension://, ws://, etc.
  // This prevents the "Request scheme 'chrome-extension' is unsupported" cache error.
  const url = new URL(event.request.url);
  if(url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Skip API calls (don't cache live market data)
  if(event.request.url.includes('workers.dev')) return;
  if(event.request.url.includes('api.')) return;
  if(event.request.url.includes('binance.com')) return;
  if(event.request.url.includes('bybit.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if(response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            // Safety net: swallow any future unsupported-scheme errors silently
            cache.put(event.request, clone).catch(err => {
              console.warn('[SW] Cache put skipped:', err.message);
            });
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then(cached => {
          if(cached) return cached;
          // Return offline page for navigation requests
          if(event.request.mode === 'navigate') {
            return caches.match('/terminal.html');
          }
        });
      })
  );
});

// Push notifications (for future alerts)
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  self.registration.showNotification(data.title || 'ExNexus Alert', {
    body: data.body || 'Market update',
    icon: '/Icon.png',
    badge: '/Icon.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/terminal.html' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/terminal.html')
  );
});
