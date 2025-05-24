const CACHE_NAME = 'svg-editor-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/paper-setup.js',
    './js/tools/PencilTool.js',
    // ... list all your JS modules, CSS, and essential assets
    './js/history.js',
    './js/io.js',
    './js/canvasInteraction.js',
    'https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js'
    // './icons/icon-192x192.png', // etc.
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Serve from cache
                }
                return fetch(event.request); // Fetch from network
            }
        )
    );
});

// Optional: Service worker activation to clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});