// temps.js - Temps passé sur site, par installation (chantier du 2026-10-04)
//
// Chronométrage discret : le temps passé sur la fiche d'une installation (écran de saisie ouvert,
// appli au premier plan) s'ajoute à inst.data._temps (secondes). Une fiche laissée ouverte sans
// activité ne compte pas plus de TEMPS_PLAFOND_S par séance. Récapitulatif interne dans le Bilan (par
// type, moyenne, visite précédente) pour chiffrer le devis suivant ; jamais dans le rapport.

var TEMPS_PLAFOND_S = 30 * 60;
var _chrono = null; // { missionId, typeId, idx, debut }

function chronoCleCourante() {
  if (state.view !== 'installation-form' || !state.currentMissionId || !state.currentTypeId || typeof state.currentInstIndex !== 'number') return null;
  return { missionId: state.currentMissionId, typeId: state.currentTypeId, idx: state.currentInstIndex };
}

function chronoArreter() {
  if (!_chrono || !_chrono.debut) { _chrono = null; return; }
  var s = Math.min(TEMPS_PLAFOND_S, Math.round((Date.now() - _chrono.debut) / 1000));
  var m = (state.missions || []).filter(function (x) { return x.id === _chrono.missionId; })[0];
  var inst = m && m.installations[_chrono.typeId] && m.installations[_chrono.typeId][_chrono.idx];
  _chrono = null;
  if (inst && s >= 3) {
    inst.data._temps = (parseInt(inst.data._temps, 10) || 0) + s;
    persistMissions();
  }
}

// Appelée à chaque rendu (js/app.js) : démarre, poursuit ou arrête le chronomètre selon l'écran
function chronoTick() {
  var k = chronoCleCourante();
  if (_chrono && k && _chrono.missionId === k.missionId && _chrono.typeId === k.typeId && _chrono.idx === k.idx) return;
  chronoArreter();
  if (k && (typeof document === 'undefined' || document.visibilityState !== 'hidden')) _chrono = { missionId: k.missionId, typeId: k.typeId, idx: k.idx, debut: Date.now() };
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') chronoArreter();
    else chronoTick();
  });
}

function tempsFormat(s) {
  s = Math.round(s || 0);
  if (s < 60) return s ? '< 1 min' : '0 min';
  var h = Math.floor(s / 3600), mn = Math.round((s % 3600) / 60);
  if (mn === 60) { h++; mn = 0; }
  return h ? h + ' h ' + (mn < 10 ? '0' : '') + mn : mn + ' min';
}

function tempsMission(m) {
  var total = 0;
  Object.keys(m.installations || {}).forEach(function (t) {
    (m.installations[t] || []).forEach(function (inst) { total += parseInt(inst.data && inst.data._temps, 10) || 0; });
  });
  return total;
}

// Carte du Bilan (interne)
function tempsBilanHtml(m) {
  var items = overviewOrderedItems(m), total = tempsMission(m);
  if (!total && !m.tempsN1) return '';
  var parType = {}, ordre = [];
  items.forEach(function (it) {
    var s = parseInt(it.inst.data._temps, 10) || 0;
    if (!parType[it.type.id]) { parType[it.type.id] = { label: it.type.label, n: 0, s: 0, mesurees: 0 }; ordre.push(it.type.id); }
    var p = parType[it.type.id];
    p.n++; p.s += s; if (s) p.mesurees++;
  });
  var h = '<div class="card temps-carte"><div class="section-title">Temps passé sur site <span class="temps-interne">interne, hors rapport</span></div>';
  h += '<div class="temps-total"><b>' + tempsFormat(total) + '</b> sur les fiches (' + items.length + ' installations)' +
    (m.tempsN1 ? '<span class="subtitle"> · visite précédente : ' + tempsFormat(m.tempsN1) + '</span>' : '') + '</div>';
  h += '<table class="temps-table"><thead><tr><th>Type</th><th>Nb</th><th>Total</th><th>Moyenne</th></tr></thead><tbody>';
  ordre.filter(function (id) { return parType[id].s; }).sort(function (a, b) { return parType[b].s - parType[a].s; }).forEach(function (id) {
    var p = parType[id];
    h += '<tr><td>' + escapeHtml(p.label) + '</td><td>' + p.n + '</td><td>' + tempsFormat(p.s) + '</td><td>' + tempsFormat(p.s / Math.max(1, p.mesurees)) + '</td></tr>';
  });
  h += '</tbody></table><p class="subtitle">Temps de saisie des fiches uniquement (déplacements et installation du matériel non comptés). Utile pour chiffrer la prochaine visite.</p></div>';
  return h;
}

console.log('✓ Temps passé chargé');
