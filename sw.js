/* squares.mehlhase.info */
/* (c) Sascha Mehlhase - kontakt@mehlhase.info */
/* game idea: Sascha Mehlhase */

// Files to cache
const cacheName = 'squares-mehlhase-v2026-03-06b';
const appShellFiles = [
  '',
  './index.html',
  './app.js',
  './style.css',
  './squares32.ico',
  './media/icon-32.png',
  './media/icon-64.png',
  './media/icon-96.png',
  './media/icon-128.png',
  './media/icon-168.png',
  './media/icon-192.png',
  './media/icon-256.png',
  './media/icon-512.png',
];
const contentToCache = appShellFiles;

// Installing Service Worker
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    console.log('[Service Worker] Caching all: app shell and content');
    await cache.addAll(contentToCache);
  })());
});

// Fetching content using Service Worker
self.addEventListener('fetch', (e) => {
    // Cache http and https only, skip unsupported chrome-extension:// and file://...
    if (!(
       e.request.url.startsWith('http:') || e.request.url.startsWith('https:')
    )) {
        return; 
    }

  e.respondWith((async () => {
    const r = await caches.match(e.request);
    console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
    if (r) return r;
    const response = await fetch(e.request);
    const cache = await caches.open(cacheName);
    console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
    cache.put(e.request, response.clone());
    return response;
  })());
});
