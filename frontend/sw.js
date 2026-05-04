/* sw.js — Service Worker pour SoutenancePro */
const CACHE_NAME = 'soutenance-pro-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/main.css',
  '/css/login.css',
  '/css/dashboard.css',
  '/js/api.js',
  '/js/app.js',
  '/img/LOGOREELUCAD.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
