// sw.js - Service Worker Contrôle Aération
// IMPORTANT : incrémenter CACHE_NAME à chaque changement significatif de js/*.js ou main.css, sinon
// les techniciens de terrain restent bloqués sur une version périmée (cf. incident du 19/08/2026 :
// des correctifs export-word.js n'étaient pas pris en compte malgré un rechargement normal de la
// page, car fetch() sans option "cache" consulte le cache HTTP heuristique du navigateur avant même
// d'atteindre ce fetch handler "network-first" — un simple F5 ne suffisait pas).
const CACHE_NAME = 'aeration-v1.12';
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
    })
    // Pas de skipWaiting() automatique ici : la nouvelle version reste "en attente" tant que
    // l'utilisateur n'a pas confirmé via le bandeau "Nouvelle version disponible" (js/app.js), pour
    // ne jamais couper une saisie en cours sur le terrain. Voir le message 'skipWaiting' ci-dessous.
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'skipWaiting') self.skipWaiting();
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
    // cache: 'no-store' force une vraie requête réseau à chaque fois — sans ça, fetch() peut être
    // satisfait par le cache HTTP heuristique du navigateur (pas de Cache-Control côté serveur) et ne
    // jamais atteindre le réseau, malgré cette stratégie "network-first". C'est ce qui causait des
    // rapports de version périmée persistant après un rechargement normal (cf. commentaire CACHE_NAME).
    fetch(event.request, { cache: 'no-store' }).then(function (response) {
      if (response && response.status === 200) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      }
      return response;
    }).catch(function () { return caches.match(event.request); })
  );
});
