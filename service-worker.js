// Service Worker with Network-First strategy for assets to ensure updates are always instant
const CACHE_NAME = 'corey-music-cache-v12';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './down-arrow.png',
  './album-art-1024.jpg',
  './album-art-512.jpg',
  './album-art-256.jpg',
  './album-art-128.jpg',
  './favicon.png',
  './icon.png',
  './waubash.aac',
  './windy-and-warm.aac',
  './freight-train.aac',
  './cannonball-rag.aac',
  './docs-guitar.aac'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Cache prefill notice:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first for CSS, JS, HTML; Cache-first for audio files and images
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isMedia = url.pathname.endsWith('.aac') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.png');

  if (isMedia) {
    // Cache first for media files
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        });
      })
    );
  } else {
    // Network first for HTML, CSS, JS so changes are seen immediately
    event.respondWith(
      fetch(event.request).then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});
