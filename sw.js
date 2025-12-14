/* =========================================
   SERVICE WORKER
   Strategy: Network First, Fallback to Cache
   ========================================= */

const CACHE_NAME = 'timetracker-v1';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/db.js',
    './js/export.js',
    './js/timer.js',
    './js/utils.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

/* --- 1. INSTALLATION --- */
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activate immediately
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching core assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

/* --- 2. ACTIVATION (Cleanup) --- */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // Remove old versions
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of clients immediately
    );
});

/* --- 3. FETCH STRATEGY --- */
self.addEventListener('fetch', (event) => {
    // Only cache GET requests (ignore API/WebSockets)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // NETWORK SUCCESS: Return valid response and update cache
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // NETWORK FAIL: Try serving from cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    
                    // Return distinct 404 for non-cached items to prevent crash
                    return new Response('Offline', { status: 404, statusText: 'Offline' });
                });
            })
    );
});