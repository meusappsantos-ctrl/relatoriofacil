const CACHE_NAME = 'mina-reports-v1';

// Install event: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: claim clients so we control the page immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event: Network first, falling back to cache
// This strategy ensures fresh data if online, but works offline if cached.
// For libraries (esm.sh), we cache them aggressively.
self.addEventListener('fetch', (event) => {
  // Skip non-http requests (like chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Logic:
      // 1. Try Network
      // 2. If network success -> Cache it -> Return it
      // 3. If network fail -> Return Cached Response
      // 4. If no cache -> Return offline error (or let it fail)

      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        // Clone the response
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          try {
             cache.put(event.request, responseToCache);
          } catch (err) {
             // Ignore errors (e.g. quota exceeded)
          }
        });

        return networkResponse;
      }).catch(() => {
        // Network failed, return cached response if available
        if (cachedResponse) {
          return cachedResponse;
        }
      });

      // If we have a cached response, return it immediately for speed (Stale-while-revalidate), 
      // OR wait for network (Network First).
      // Here we implement "Stale-while-revalidate" for static assets/libs, "Network First" for others could be complex.
      // Let's stick to a robust "Cache First, falling back to Network" for libs, and "Network First" for app data?
      // Given the simplicity, let's prioritize the Cached version if it exists to ensure offline speed,
      // but update in background? 
      // Actually, for this specific app structure with esm.sh imports, 
      // returning the cached response immediately if found is safest for offline.
      
      return cachedResponse || fetchPromise;
    })
  );
});