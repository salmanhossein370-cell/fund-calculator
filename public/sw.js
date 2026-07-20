const CACHE_NAME = 'fund-calculator-cache-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only intercept GET requests and exclude chrome-extension requests
  if (e.request.method !== 'GET' || e.request.url.startsWith('chrome-extension')) {
    return;
  }
  
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // If request is successful and is a standard resource, cache it
        if (res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => {
        // If fetch fails (offline), fall back to cached content if available
        return caches.match(e.request);
      })
  );
});
