// sw.js - Service Worker Contrôle Aération
const CACHE_NAME = 'aeration-v1.9';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './favicon-96x96.png',
  './apple-touch-icon.png',
  './web-app-manifest-192x192.png',
  './web-app-manifest-512x512.png',
  './web-app-manifest-maskable-512x512.png',
  './assets/logo-socotec.jpg',
  './js/icons.js',
  './js/state.js',
  './js/installations-schema.js',
  './js/calculations.js',
  './js/docx.iife.js',
  './js/export-word.js',
  './js/import-export.js',
  './js/installations.js',
  './js/missions.js',
  './js/selection-installations.js',
  './js/profil-technicien.js',
  './js/app.js',
  './js/main.css'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(urlsToCache.map(function (url) {
        return cache.add(url).catch(function (err) {
          console.warn('[SW] Fichier ignoré:', url, err);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) {
        if (n !== CACHE_NAME) return caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    fetch(event.request).then(function (response) {
      if (response && response.status === 200) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      }
      return response;
    }).catch(function () { return caches.match(event.request); })
  );
});
