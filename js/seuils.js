// seuils.js - Objectif affiché avant la mesure (chantier du 2026-10-04)
//
// Au-dessus d'un champ de mesure, la valeur à atteindre pour un avis satisfaisant : « Objectif ·
// Vitesse de transport : ≥ 20 m/s ». Le technicien sait avant de taper s'il doit refaire la mesure,
// vérifier un registre ou chercher la cause sur place.
//
// L'objectif n'est PAS recopié des textes à la main : il est déduit du calcul de l'appli lui-même
// (CALC_RULES, js/calculations.js). On essaie des valeurs de la mesure sur une copie de l'installation
// et on repère où les avis basculent entre « Non Satisfaisant » et « Satisfaisant ». L'objectif
// affiché est donc toujours celui que le calcul appliquera, avec les données déjà saisies (effectif,
// valeur de référence, dimensions…) ; s'il en manque, aucun objectif n'est affiché.

// Champs qui décrivent l'installation ou servent de référence : pas des mesures à « viser »
var SEUIL_CHAMPS_EXCLUS = /_n1$|reference|recommand|inrs|vlep|^effectif$|occupants|volume|surface|largeur|hauteur|longueur|diametre|cote|nb_|nombre|temperature|pression_statique|pression_atmo|hygro|cylindree|regime|travailleur|^public$|wc_|douches|lavabos|precedent|vitesse_captage|_mm$|_mm_/;

// Valeurs essayées : 0 puis une échelle logarithmique de 0,005 à 200 000
var SEUIL_ECHELLE = (function () {
  var out = [0];
  for (var e = Math.log10(0.005); e <= Math.log10(200000) + 1e-9; e += 0.1) out.push(Math.pow(10, e));
  return out;
})();

var _seuilCache = {};

function seuilVerdict(v) {
  var c = (typeof statusClass === 'function') ? statusClass(v) : '';
  return c === 'status-ok' ? 'S' : c === 'status-bad' ? 'N' : '';
}

// Copie de l'installation avec la mesure fixée à v (grille : tous les points à v, sauf ceux exclus « / »)
function seuilEvaluer(typeId, f, data, v, meta) {
  var d = JSON.parse(JSON.stringify(data));
  if (f.type === 'grid') {
    var g = [];
    for (var r = 0; r < meta.rows; r++) {
      g.push([]);
      for (var c = 0; c < meta.cols; c++) {
        var old = data[f.key] && data[f.key][r] && data[f.key][r][c];
        g[r].push(old === '/' ? '/' : String(v));
      }
    }
    d[f.key] = g;
  } else d[f.key] = String(v);
  var inst = { data: d };
  applyCalculations(typeId, inst);
  return inst.data;
}

// Frontière arrondie à une précision lisible (300 et non 300,0000001)
function seuilArrondi(v) {
  if (v === 0) return 0;
  var a = Math.abs(v), pas = a >= 1000 ? 10 : a >= 100 ? 1 : a >= 10 ? 0.1 : a >= 0.1 ? 0.01 : 0.001;
  return Math.round(Math.round(v / pas) * pas * 1000) / 1000;
}

function seuilUnite(label) {
  var m = String(label || '').match(/\((m\/s|m³\/h|m3\/h|Pa|mg\/m³|%|cm|vol\/h|m³)\)/);
  return m ? ' ' + m[1] : '';
}

function seuilFr(v) {
  return String(v).replace('.', ',');
}

// Objectifs pour un champ : [{ libelle, texte, ok }] (ok = la valeur saisie atteint l'objectif)
function seuilsPourChamp(typeId, f, inst) {
  if (!f || (f.type !== 'number' && f.type !== 'grid') || SEUIL_CHAMPS_EXCLUS.test(f.key)) return [];
  if (f.type === 'number' && String(inst.data[f.key] || '').trim() === '/') return []; // mesure exclue
  if (typeof applyCalculations !== 'function' || typeof CALC_RULES === 'undefined' || !CALC_RULES[typeId]) return [];
  var type = getInstallationType(typeId);
  var meta = null;
  if (f.type === 'grid') {
    meta = (typeof gwGridMeta === 'function') ? gwGridMeta(f, inst) : null;
    if (!meta || !meta.rows || !meta.cols) return [];
  }
  var base = {};
  Object.keys(inst.data || {}).forEach(function (k) { if (k !== f.key && k.charAt(0) !== '_') base[k] = inst.data[k]; });
  if (f.type === 'grid') base[f.key] = inst.data[f.key];
  var cle = typeId + '|' + f.key + '|' + JSON.stringify(base);
  var resultats = _seuilCache[cle];
  if (!resultats) {
    resultats = seuilsCalculer(typeId, type, f, base, meta);
    if (Object.keys(_seuilCache).length > 300) _seuilCache = {};
    _seuilCache[cle] = resultats;
  }
  // Valeur saisie : objectif atteint ou non
  var actuel = f.type === 'grid' ? null : num(inst.data[f.key]);
  return resultats.map(function (r) {
    var ok = null;
    if (actuel !== null && !isNaN(actuel)) {
      ok = (r.min === null || (r.minIncl ? actuel >= r.min : actuel > r.min)) && (r.max === null || (r.maxIncl ? actuel <= r.max : actuel < r.max));
    }
    // Valeur saisie à moins de 5 % de la borne : à confirmer (js/mesures.js)
    var borne = r.min !== null ? r.min : r.max, proche = false;
    if (actuel !== null && !isNaN(actuel) && borne) proche = Math.abs(actuel - borne) / Math.abs(borne) < (typeof MESURE_ZONE_SEUIL !== 'undefined' ? MESURE_ZONE_SEUIL : 0.05);
    return { libelle: resultats.length > 1 ? r.libelle : '', texte: r.texte, ok: ok, borne: borne, proche: proche };
  });
}

function seuilsCalculer(typeId, type, f, base, meta) {
  var avisKeys = type.fields.filter(function (x) { return x.type === 'computed'; }).map(function (x) { return x.key; });
  var echant = SEUIL_ECHELLE.map(function (v) {
    var d = seuilEvaluer(typeId, f, base, v, meta), out = {};
    avisKeys.forEach(function (k) { out[k] = seuilVerdict(d[k]); });
    return out;
  });
  var global = (typeof resolveAvisFieldKey === 'function') ? resolveAvisFieldKey(type) : null;
  var res = [];
  avisKeys.forEach(function (k) {
    var serie = echant.map(function (e) { return e[k]; });
    if (serie.indexOf('S') === -1 || serie.indexOf('N') === -1) return; // ne dépend pas de cette mesure
    // Une seule plage satisfaisante, bornée par des « Non satisfaisant »
    var debut = serie.indexOf('S'), fin = serie.lastIndexOf('S');
    for (var i = debut; i <= fin; i++) if (serie[i] === 'N') return;
    var bas = null, haut = null;
    var verdictA = function (v) { return seuilVerdict(seuilEvaluer(typeId, f, base, v, meta)[k]); };
    var affiner = function (lo, hi, sAuDessus) { // frontière entre lo et hi
      for (var n = 0; n < 40; n++) {
        var mid = (lo + hi) / 2;
        if ((verdictA(mid) === 'S') === sAuDessus) hi = mid; else lo = mid;
      }
      return sAuDessus ? hi : lo;
    };
    if (debut > 0 && serie.slice(0, debut).indexOf('N') !== -1) bas = affiner(SEUIL_ECHELLE[debut - 1], SEUIL_ECHELLE[debut], true);
    if (fin < serie.length - 1 && serie.slice(fin + 1).indexOf('N') !== -1) haut = affiner(SEUIL_ECHELLE[fin], SEUIL_ECHELLE[fin + 1], false);
    if (bas === null && haut === null) return;
    // Borne atteinte ou non (≥ / >) : on teste la valeur arrondie elle-même
    var b = bas !== null ? seuilArrondi(bas) : null, h = haut !== null ? seuilArrondi(haut) : null;
    var bIncl = b !== null && verdictA(b) === 'S', hIncl = h !== null && verdictA(h) === 'S';
    var u = seuilUnite(f.label);
    var texte = b !== null && h !== null ? 'entre ' + seuilFr(b) + ' et ' + seuilFr(h) + u
      : b !== null ? (bIncl ? '≥ ' : '> ') + seuilFr(b) + u : (hIncl ? '≤ ' : '< ') + seuilFr(h) + u;
    var champ = type.fields.filter(function (x) { return x.key === k; })[0];
    // Libellé du critère : celui du champ d'avis (« Avis vitesse minimale » -> « Vitesse minimale »),
    // ou le titre de l'étape quand il est trop générique (« Avis », « Avis par rapport aux… »)
    var lib = String(champ.label).replace(/\s*\(.*\)\s*$/, '');
    if (/^(avis|conclusion)/i.test(lib) && !/^avis\s+(vitesse|débit|air|concentration|dépression|distance|taux|traitement|atmosph|captage|extraction|compensation|destination|gaine|capot|ouvertures|conduit)/i.test(lib)) {
      lib = (typeof reasonLabel === 'function') ? reasonLabel(type, champ) : lib;
    }
    lib = lib.replace(/^Calcul du /i, '').replace(/^Avis\s+/i, '').replace(/\s*\/\s*(valeur|minimum).*$/i, '');
    res.push({ key: k, global: k === global, libelle: lib.charAt(0).toUpperCase() + lib.slice(1), texte: texte, min: b, max: h, minIncl: bIncl, maxIncl: hIncl });
  });
  // L'avis global reprend souvent le même seuil qu'un critère : on garde le critère, plus parlant
  var parTexte = {};
  res.forEach(function (r) { if (!parTexte[r.texte] || parTexte[r.texte].global) parTexte[r.texte] = r; });
  return res.filter(function (r) { return parTexte[r.texte] === r; }).map(function (r) {
    return { libelle: r.libelle, texte: r.texte, min: r.min, max: r.max, minIncl: r.minIncl, maxIncl: r.maxIncl };
  });
}

function seuilObjectifHtml(typeId, f, inst) {
  var list;
  try { list = seuilsPourChamp(typeId, f, inst); } catch (e) { return ''; }
  if (!list.length) return '';
  var h = '<div class="seuil-objectif"><span class="seuil-cible">◎</span><div class="seuil-lignes">';
  list.slice(0, 3).forEach(function (s) {
    h += '<div class="seuil-ligne' + (s.ok === true ? ' atteint' : s.ok === false ? ' manque' : '') + '"><b>Objectif</b>' + (s.libelle ? ' · ' + escapeHtml(s.libelle) : '') + ' : <b>' + escapeHtml(s.texte) + '</b>' +
      (s.ok === true ? ' <span class="seuil-etat">✓ atteint</span>' : s.ok === false ? ' <span class="seuil-etat">✗ non atteint</span>' : '') +
      (s.proche ? ' <span class="seuil-proche">≈ très proche du seuil : mesure à confirmer</span>' : '') + '</div>';
  });
  return h + '</div></div>';
}

console.log('✓ Objectifs avant mesure chargés');
