const CACHE_NAME = 'mina-reports-v3';

// Assets that MUST be cached immediately for the app to work offline
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

// Install Event: Cache critical assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate worker immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching critical assets');
      // We use addAllSettled logic manually to prevent one failure from stopping everything
      // (e.g. if an icon is missing)
      return Promise.all(
        PRECACHE_ASSETS.map(url => 
          cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
        )
      );
    })
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// Fetch Event: The caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // STRATEGY 1: Cache First (Stale While Revalidate) for External Libraries
  // (esm.sh, tailwind, fonts, etc.) - These rarely change or are versioned
  if (url.hostname.includes('esm.sh') || url.hostname.includes('tailwindcss') || url.hostname.includes('google') || url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        
        // If in cache, return it immediately
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not, fetch from network and cache it for next time
        try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
        } catch (error) {
            // If offline and not in cache, we can't do much for external libs
            // return a generic error or nothing
            console.error('[SW] Fetch failed for lib:', error);
            return new Response('Offline', { status: 503 });
        }
      })
    );
    return;
  }

  // STRATEGY 2: Network First, Fallback to Cache for the App Shell (HTML, local scripts)
  // We want the user to get the latest version if online, but use cache if offline.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If we got a valid response, update the cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed (Offline), try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If the user requested a navigation (HTML page) and we are offline/uncached
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }

          return new Response('Você está offline e este recurso não foi salvo.', { 
            status: 503, 
            headers: { 'Content-Type': 'text/plain' } 
          });
        });
      })
  );
});