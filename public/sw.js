const CACHE_NAME = "whiplc-misc-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network first, fallback to cache for offline capabilities
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if(event.request.method === 'GET' && !event.request.url.includes('/api/')) {
            cache.put(event.request, resClone);
          }
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
