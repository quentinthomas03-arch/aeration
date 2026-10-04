// mesures.js - Fiabilité des mesures sur site (chantier du 2026-10-04)
//
//  - Point aberrant dans une grille : un point très éloigné des autres (plus de 3 fois ou moins du
//    tiers de la médiane, et au moins 0,3 m/s d'écart) est signalé sous la grille : faute de frappe ou
//    sonde mal placée, à revérifier avant de quitter le poste.
//  - Mesure proche du seuil : une valeur à moins de MESURE_ZONE_SEUIL (5 %) de l'objectif calculé
//    (js/seuils.js) est signalée « à confirmer », qu'elle soit au-dessus ou en dessous : l'avis ne doit
//    pas basculer sur une seule lecture.
// Les deux remontent aussi dans « Vérifier avant de partir » (installationAnomalies, js/controles.js).

var MESURE_ZONE_SEUIL = 0.05;

function grilleValeurs(f, inst) {
  var g = Array.isArray(inst.data[f.key]) ? inst.data[f.key] : [], out = [];
  g.forEach(function (row, r) {
    (row || []).forEach(function (c, col) {
      if (c === '/' || c === '' || c === undefined || c === null) return;
      var v = num(c);
      if (!isNaN(v)) out.push({ r: r, c: col, v: v });
    });
  });
  return out;
}

function mediane(vals) {
  var s = vals.slice().sort(function (a, b) { return a - b; }), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

// Points aberrants d'une grille : [{ r, c, v, med }]
function grilleAberrants(f, inst) {
  var pts = grilleValeurs(f, inst);
  if (pts.length < 6) return [];
  var med = mediane(pts.map(function (p) { return p.v; }));
  if (med <= 0) return [];
  return pts.filter(function (p) { return (p.v > 3 * med || p.v < med / 3) && Math.abs(p.v - med) >= 0.3; })
    .map(function (p) { return { r: p.r, c: p.c, v: p.v, med: med }; });
}

function grillePointLibelle(f, p) {
  return (f.rowLabel || 'Axe') + ' ' + (p.r + 1) + ', ' + (f.colLabel || 'point').toLowerCase() + ' ' + (p.c + 1);
}

function grilleAberrantsHtml(typeId, f, inst) {
  var ab = grilleAberrants(f, inst);
  if (!ab.length) return '';
  return '<div class="mesure-alerte">' + ab.slice(0, 4).map(function (p) {
    return '<div>' + escapeHtml(grillePointLibelle(f, p)) + ' : <b>' + escapeHtml(frDisplay(String(p.v))) + '</b>, très différent des autres points (médiane ' +
      escapeHtml(frDisplay(String(Math.round(p.med * 100) / 100))) + ') : à revérifier.</div>';
  }).join('') + '</div>';
}

// Mesures proches de l'objectif : [{ f, s: seuil, ecart }]
function mesuresProchesSeuil(typeId, inst) {
  if (typeof seuilsPourChamp !== 'function') return [];
  var t = getInstallationType(typeId), out = [];
  t.fields.forEach(function (f) {
    if (f.type !== 'number' || (f.showIf && !evalShowIf(f.showIf, inst.data))) return;
    var v = num(inst.data[f.key]);
    if (isNaN(v)) return;
    var s;
    try { s = seuilsPourChamp(typeId, f, inst); } catch (e) { s = []; }
    s.forEach(function (x) {
      var b = x.borne;
      if (b === null || b === undefined || !b) return;
      var ecart = Math.abs(v - b) / Math.abs(b);
      if (ecart < MESURE_ZONE_SEUIL) out.push({ f: f, s: x, ecart: ecart });
    });
  });
  return out;
}

// Pour « Vérifier avant de partir » (appelé par installationAnomalies, js/controles.js)
function mesuresAnomalies(t, inst) {
  var out = [];
  t.fields.forEach(function (f) {
    if (f.type !== 'grid' || (f.showIf && !evalShowIf(f.showIf, inst.data))) return;
    grilleAberrants(f, inst).slice(0, 3).forEach(function (p) {
      out.push({ label: f.label.replace(/\s*—.*$/, ''), message: grillePointLibelle(f, p) + ' : ' + frDisplay(String(p.v)) + ', très différent des autres points (médiane ' + frDisplay(String(Math.round(p.med * 100) / 100)) + ')', stepIdx: fieldStepIndex(t.id, f.key) });
    });
  });
  mesuresProchesSeuil(t.id, inst).forEach(function (x) {
    out.push({ label: x.f.label, message: 'à ' + Math.max(1, Math.round(x.ecart * 100)) + ' % de l’objectif (' + x.s.texte + ') : mesure à confirmer', stepIdx: fieldStepIndex(t.id, x.f.key) });
  });
  return out;
}

console.log('✓ Contrôle des mesures chargé');
