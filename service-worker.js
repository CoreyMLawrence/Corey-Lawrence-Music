const CACHE_NAME = 'corey-music-cache-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './album-art-1024.jpg',
  './play.png',
  './pause.png',
  './skipback.png',
  './skipforward.png',
  './down-arrow.png',
  './up-arrow.png',
  // Include all icon files
  './icon-48.png',
  './icon-72.png',
  './icon-96.png',
  './icon-128.png',
  './icon-144.png',
  './icon-152.png',
  './icon-192.png',
  './icon-256.png',
  './icon-384.png',
  './icon-512.png',
  // Include all song files
  './waubash.aac',
  './windy-and-warm.aac',
  './freight-train.aac',
  './cannonball-rag.aac',
  './docs-guitar.aac',
];

// Modify the install event to be more aggressive about caching
self.addEventListener('install', (event) => {
  // Force waiting service worker to become active
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.error('Cache addAll failed:', error);
        // Continue even if some assets fail to cache
        return Promise.resolve();
      });
    })
  );
});

// Fix the fetch event handler
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      if (response) {
        return response;
      }

      // Try to fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Don't cache non-successful responses
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Clone the response before returning it
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If both cache and network fail, return cached index.html
          return caches.match('./index.html');
        });
    })
  );
});

// Update activate event to claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      // Take control of all pages immediately
      clients.claim(),
    ])
  );
});
