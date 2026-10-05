// sauvegarde.js - Données à l'abri (2026-10-05)
//
//  - Stockage protégé : l'appli demande au navigateur de ne pas effacer ses données quand l'appareil
//    manque de place (navigator.storage.persist) ; sans effet sur une tablette perdue ou cassée.
//  - Rappel de sauvegarde : une mission modifiée et non envoyée (fichier .json par mail, partage
//    OneDrive, téléchargement ou dossier de sauvegarde automatique) depuis SAUVEGARDE_RAPPEL_H heures
//    est signalée à l'accueil, avec un bouton pour envoyer une copie. Rien ne s'ouvre tout seul.
//    Dates : m._sauvegarde (dernière copie envoyée), inst.data._mod (dernière modification, js/fusion.js).

var SAUVEGARDE_RAPPEL_H = 6;

(function protegerStockage() {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) return;
    navigator.storage.persisted().then(function (deja) {
      if (deja) { state._stockageProtege = true; return; }
      return navigator.storage.persist().then(function (ok) { state._stockageProtege = !!ok; });
    }).catch(function () {});
  } catch (e) {}
})();

function missionDerniereModif(m) {
  var max = 0;
  Object.keys(m.installations || {}).forEach(function (t) {
    (m.installations[t] || []).forEach(function (inst) { var v = inst.data && inst.data._mod; if (v > max) max = v; });
  });
  return max;
}

function marquerSauvegarde(m) {
  if (!m) return;
  m._sauvegarde = Date.now();
  persistMissions();
}

// Missions modifiées depuis la dernière copie, sans copie depuis plus de SAUVEGARDE_RAPPEL_H heures
function missionsASauvegarder() {
  var maintenant = Date.now(), seuil = SAUVEGARDE_RAPPEL_H * 3600 * 1000;
  return (state.missions || []).filter(function (m) {
    if (m.archived) return false;
    var mod = missionDerniereModif(m), sauv = m._sauvegarde || 0;
    if (!mod || mod <= sauv) return false;
    var depuis = sauv || (m.createdAt ? Date.parse(m.createdAt) : mod);
    return maintenant - depuis >= seuil;
  });
}

function dureeDepuis(ts) {
  var h = Math.floor((Date.now() - ts) / 3600000);
  return h >= 48 ? Math.floor(h / 24) + ' jours' : h + ' h';
}

function rappelSauvegardeHtml() {
  var list = missionsASauvegarder();
  if (!list.length) return '';
  var h = '<div class="card sauv-rappel"><div class="sauv-titre">' + ICONS.upload + '<b>Copie de sauvegarde conseillée</b></div>' +
    '<p class="subtitle">Ces missions ne sont enregistrées que sur cet appareil. Envoyez une copie (mail, OneDrive…) : en cas de perte ou de panne de la tablette, vous la retrouverez.</p>';
  list.forEach(function (m) {
    var ref = m._sauvegarde ? 'dernière copie il y a ' + dureeDepuis(m._sauvegarde) : 'aucune copie envoyée';
    h += '<div class="sauv-ligne"><span><b>' + escapeHtml(typeof missionNom === 'function' ? missionNom(m) : (m.clientSite || 'Mission')) + '</b><br><span class="subtitle">' + ref + '</span></span>' +
      '<button type="button" class="btn btn-primary btn-small" onclick="shareOrExportMission(' + m.id + ');">Envoyer une copie</button></div>';
  });
  return h + '</div>';
}

console.log('✓ Sauvegarde (stockage protégé, rappel) chargée');
