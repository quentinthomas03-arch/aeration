// storage-indicator.js - Indicateur d'espace de stockage utilisé (localStorage + IndexedDB)
//
// navigator.storage.estimate() est la seule source qui reflète l'usage réel du navigateur pour
// une origine (missions en localStorage + photos en IndexedDB confondues) sans avoir à recalculer
// la taille à la main. Support desktop/mobile large (Chrome/Edge/Firefox, Safari 15.2+) mais pas
// universel : quand l'API est absente, ou renvoie un quota nul/non fini (certains navigateurs
// in-app, vieux Safari), on affiche "non mesurable" plutôt qu'un chiffre potentiellement faux.
//
// Rendu en deux temps comme la galerie photo (js/photos.js hydratePhotoThumbnails) : le HTML
// synchrone pose un placeholder, estimate() est asynchrone et met à jour le DOM une fois résolu.
// Un cache mémoire (jamais persisté) évite de réafficher "calcul en cours" à chaque retour sur
// l'accueil tant que la page n'a pas été rechargée.

var STORAGE_WARNING_THRESHOLD = 0.8;
var _storageEstimateCache = null; // { text, warn } | null

function formatStorageSize(bytes) {
  var mo = bytes / (1024 * 1024);
  if (mo < 1) return '< 1 Mo';
  if (mo < 100) return mo.toFixed(1) + ' Mo';
  return Math.round(mo) + ' Mo';
}

// Contenu interne (texte + alerte éventuelle) partagé entre le rendu synchrone initial et la
// mise à jour asynchrone — toujours injecté via innerHTML sur le même conteneur stable
// #storage-indicator-root, jamais via outerHTML, pour ne jamais laisser une ancienne alerte
// orpheline en cas de ré-hydratation répétée (plusieurs retours sur l'accueil).
function storageIndicatorInnerHtml() {
  var line = _storageEstimateCache
    ? '<span' + (_storageEstimateCache.warn ? ' class="storage-indicator-warn"' : '') + '>' + ICONS.database + ' ' + _storageEstimateCache.text + '</span>'
    : '<span>' + ICONS.database + ' Espace de stockage : calcul en cours…</span>';
  var h = '<div class="subtitle">' + line + '</div>';
  if (_storageEstimateCache && _storageEstimateCache.warn) {
    h += '<div class="storage-indicator-alert">Espace de stockage presque saturé — pensez à exporter puis supprimer d’anciennes missions.</div>';
  }
  return h;
}

function storageIndicatorUnavailableHtml() {
  return '<div class="subtitle">' + ICONS.database + ' Espace de stockage : non mesurable sur ce navigateur</div>';
}

function renderStorageIndicatorPlaceholder() {
  return '<div class="storage-indicator" id="storage-indicator-root">' + storageIndicatorInnerHtml() + '</div>';
}

function hydrateStorageIndicator() {
  var el = document.getElementById('storage-indicator-root');
  if (!el) return;
  if (!navigator.storage || !navigator.storage.estimate) {
    el.innerHTML = storageIndicatorUnavailableHtml();
    return;
  }
  navigator.storage.estimate().then(function (est) {
    var el2 = document.getElementById('storage-indicator-root');
    if (!el2) return; // vue quittée entre-temps
    var usage = est && est.usage, quota = est && est.quota;
    if (!isFinite(usage) || !isFinite(quota) || quota <= 0) {
      el2.innerHTML = storageIndicatorUnavailableHtml();
      return;
    }
    var pct = Math.round((usage / quota) * 100);
    var warn = (usage / quota) >= STORAGE_WARNING_THRESHOLD;
    _storageEstimateCache = {
      text: formatStorageSize(usage) + ' utilisés sur ' + formatStorageSize(quota) + ' (' + pct + '%)',
      warn: warn
    };
    el2.innerHTML = storageIndicatorInnerHtml();
  }).catch(function () {
    var el3 = document.getElementById('storage-indicator-root');
    if (el3) el3.innerHTML = storageIndicatorUnavailableHtml();
  });
}

console.log('✓ Indicateur de stockage chargé');
