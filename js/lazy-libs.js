// lazy-libs.js - Chargement à la demande des bibliothèques lourdes (chantier du 2026-10-04)
//
// pdfmake + polices (≈ 4 Mo) et SheetJS (≈ 0,9 Mo) étaient chargés et analysés à chaque ouverture de
// l'appli, alors qu'ils ne servent qu'à produire un PDF / un Excel ou à importer un classeur Rapso.
// Ils sont maintenant chargés au premier usage (puis restent en mémoire). Ils restent dans le cache
// hors ligne de sw.js : le chargement à la demande fonctionne aussi sans réseau.

var LAZY_LIBS = {
  pdf: { label: 'Préparation du module PDF…', scripts: ['js/pdfmake.min.js', 'js/vfs_fonts.js', 'js/fonts-arial.js'],
    ready: function () { return typeof pdfMake !== 'undefined' && pdfMake.fonts && pdfMake.fonts.Arial; } },
  xlsx: { label: 'Préparation du module Excel…', scripts: ['js/xlsx.full.min.js'],
    ready: function () { return typeof XLSX !== 'undefined'; } }
};

var _lazyScriptPromises = {};

function loadScriptOnce(src) {
  if (!_lazyScriptPromises[src]) {
    _lazyScriptPromises[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () {
        delete _lazyScriptPromises[src];
        reject(new Error('Impossible de charger ' + src + '. Vérifiez la connexion (le module n’est pas encore dans le cache hors ligne).'));
      };
      document.head.appendChild(s);
    });
  }
  return _lazyScriptPromises[src];
}

// Résout quand la bibliothèque est prête ; affiche un court bandeau pendant le premier chargement.
function ensureLib(name) {
  var lib = LAZY_LIBS[name];
  if (!lib || lib.ready()) return Promise.resolve();
  var toast = showLibLoading(lib.label);
  return lib.scripts.reduce(function (p, src) { return p.then(function () { return loadScriptOnce(src); }); }, Promise.resolve())
    .then(function () { hideLibLoading(toast); }, function (err) { hideLibLoading(toast); throw err; });
}

function showLibLoading(label) {
  if (typeof document === 'undefined' || !document.body || !document.body.appendChild) return null;
  var el = document.createElement('div');
  el.className = 'sw-update-banner lib-loading';
  el.innerHTML = '<span>' + label + '</span>';
  document.body.appendChild(el);
  return el;
}

function hideLibLoading(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

console.log('✓ Chargement à la demande prêt');
