const CACHE_NAME = 'timetracker-v1';

// Files required for the app to work offline
const ASSETS_TO_CACHE = [
    // './',
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

// 1. Install: Cache the core files
self.addEventListener('install', (event) => {
    // Force this new SW to become active immediately (don't wait for tab close)
    self.skipWaiting(); 
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching core assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all pages immediately
    );
});

// 3. Fetch: Network First -> Cache Fallback
self.addEventListener('fetch', (event) => {
    // Ignore non-GET requests (like API saves) and WebSockets
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If network works, return response AND update cache
                // This ensures next time we go offline, we have the latest version
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Network failed (Offline). Try Cache.
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If not in cache (e.g., LiveServer specific files), return nothing
                    // This prevents the "Failed to convert" error for non-essential files
                    return new Response('Offline', { status: 404, statusText: 'Offline' });
                });
            })
    );
});