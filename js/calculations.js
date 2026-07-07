// calculations.js - Calculs automatiques
// Formules extraites du code VBA d'origine (Rapso Aération V29)

function num(v) {
  if (v === undefined || v === null || v === '') return NaN;
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? NaN : n;
}

function round2(v) { return Math.round(v * 100) / 100; }

// Surface d'une section : circulaire = π×(D/100)²/4 ; rectangulaire = (c1/100)×(c2/100)
function surfaceSection(forme, d1cm, d2cm) {
  var a = num(d1cm);
  if (isNaN(a)) return NaN;
  if (forme === 'Rectangulaire') {
    var b = num(d2cm);
    if (isNaN(b)) return NaN;
    return (a / 100) * (b / 100);
  }
  // par défaut circulaire
  return (Math.PI * (a / 100) * (a / 100)) / 4;
}

// Débit (m³/h) = Surface (m²) × Vitesse (m/s) × 3600
function debitFromSV(s, v) {
  var S = num(s), V = num(v);
  if (isNaN(S) || isNaN(V)) return NaN;
  return S * V * 3600;
}

// Règles de calcul par type : { target, fn(data) }
// fn retourne NaN si les entrées sont incomplètes -> le champ cible n'est pas modifié
var CALC_RULES = {

  locaux_fumeurs: [
    { target: 'surface', fn: function (d) {
        var L = num(d.largeur), l = num(d.longueur);
        return (isNaN(L) || isNaN(l)) ? NaN : L * l;
      } },
    { target: 'volume', fn: function (d) {
        var L = num(d.largeur), l = num(d.longueur), h = num(d.hauteur);
        return (isNaN(L) || isNaN(l) || isNaN(h)) ? NaN : L * l * h;
      } }
  ],

  extracteur: [
    { target: 'surface_m2', decimals: 4, fn: function (d) {
        return surfaceSection(d.forme_section, d.diametre_cote1, d.cote2);
      } },
    { target: 'debit_annee_en_cours', fn: function (d) {
        return debitFromSV(d.surface_m2, d.vitesse);
      } },
    { target: 'volume_par_heure', fn: function (d) {
        var q = num(d.debit_annee_en_cours), vol = num(d.volume_local);
        return (isNaN(q) || isNaN(vol) || vol === 0) ? NaN : q / vol;
      } }
  ],

  gaz_echappement: [
    { target: 'surface_m2', decimals: 4, fn: function (d) {
        // réseau d'air : si côte 2 renseignée -> rectangulaire, sinon circulaire
        var forme = (!isNaN(num(d.cote2)) && num(d.cote2) > 0) ? 'Rectangulaire' : 'Circulaire';
        return surfaceSection(forme, d.diametre_cote1, d.cote2);
      } },
    { target: 'debit_mesure', fn: function (d) {
        return debitFromSV(d.surface_m2, d.vitesse);
      } },
    { target: 'debit_min_calcule', fn: function (d) {
        // Formule VBA : 1,2 × cylindrée (L) × 0,0363 × régime (tr/min)
        var V = num(d.cylindree), n = num(d.regime_moteur);
        return (isNaN(V) || isNaN(n)) ? NaN : 1.2 * V * 0.0363 * n;
      } }
  ],

  menuiserie: [
    { target: 'surface_m2', decimals: 4, fn: function (d) {
        return surfaceSection(d.forme_section, d.diametre_cote1, d.cote2);
      } },
    { target: 'debit_annee_en_cours', fn: function (d) {
        return debitFromSV(d.surface_m2, d.vitesse);
      } }
  ],

  menuiserie_bis: [
    { target: 'debit', fn: function (d) {
        // débit = vitesse moyenne × surface du conduit ; ici approximé via diamètre conduit si présent
        var s = surfaceSection('Circulaire', d.diametre_cm, null);
        return debitFromSV(s, d.vitesse_moyenne);
      } }
  ],

  box_peinture: [
    { target: 'volume_par_heure', fn: function (d) {
        var q = num(d.debit_extraction_box), vol = num(d.volume_local);
        return (isNaN(q) || isNaN(vol) || vol === 0) ? NaN : q / vol;
      } },
    { target: 'debit_minimal_50vh', fn: function (d) {
        // Formule VBA : 50 × volume du local
        var vol = num(d.volume_local);
        return isNaN(vol) ? NaN : 50 * vol;
      } }
  ],

  tts: [
    { target: 'surface_cuve', decimals: 4, fn: function (d) {
        if (d.forme_cuve === 'Circulaire') {
          var D = num(d.diametre_cuve);
          return isNaN(D) ? NaN : (Math.PI * D * D) / 4;
        }
        var L = num(d.longueur_l), l = num(d.largeur_l);
        return (isNaN(L) || isNaN(l)) ? NaN : L * l;
      } },
    { target: 'debit_calcule', fn: function (d) {
        // Formules VBA :
        // Rectangulaire : Qr = L·W·a·(W/(n·L))^b·V·3600
        // Circulaire   : Qc = Sc·a·(1/n)^b·V·3600
        var a = num(d.coef_a), b = num(d.coef_b), n = num(d.coef_n), V = num(d.vitesse);
        if (isNaN(a) || isNaN(b) || isNaN(n) || isNaN(V) || n === 0) return NaN;
        if (d.forme_cuve === 'Circulaire') {
          var Sc = num(d.surface_cuve);
          if (isNaN(Sc)) return NaN;
          return Sc * a * Math.pow(1 / n, b) * V * 3600;
        }
        var L = num(d.longueur_l), W = num(d.largeur_l);
        if (isNaN(L) || isNaN(W) || L === 0) return NaN;
        return L * W * a * Math.pow(W / (n * L), b) * V * 3600;
      } },
    { target: 'debit_qr10', fn: function (d) {
        var q = num(d.debit_calcule);
        return isNaN(q) ? NaN : q / 10;
      } }
  ],

  bras_aspiration: [
    { target: 'debit_calcule', fn: function (d) {
        var s = surfaceSection('Circulaire', d.diametre_conduit, null);
        return debitFromSV(s, d.vitesse_moyenne);
      } },
    { target: 'evolution_pct', fn: function (d) {
        var prev = num(d.debit_precedent), cur = num(d.debit_annee);
        return (isNaN(prev) || isNaN(cur) || prev === 0) ? NaN : ((cur - prev) / prev) * 100;
      } }
  ],

  sorbonnes: [
    { target: 'surface_ouverture', decimals: 4, fn: function (d) {
        // Surface (m²) = largeur (mm) × ouverture h (mm) / 1e6
        var l = num(d.largeur_mm), h = num(d.ouverture_travail_h);
        return (isNaN(l) || isNaN(h)) ? NaN : (l * h) / 1000000;
      } }
  ]
};

// Champs qui sont la cible d'un calcul (pour affichage "auto")
var COMPUTED_FIELDS = {};
Object.keys(CALC_RULES).forEach(function (typeId) {
  COMPUTED_FIELDS[typeId] = {};
  CALC_RULES[typeId].forEach(function (r) { COMPUTED_FIELDS[typeId][r.target] = true; });
});

function isComputedField(typeId, key) {
  return !!(COMPUTED_FIELDS[typeId] && COMPUTED_FIELDS[typeId][key]);
}

// Applique toutes les règles du type ; passe en plusieurs itérations
// pour propager les calculs en chaîne (surface -> débit -> volume/heure)
function applyCalculations(typeId, inst) {
  var rules = CALC_RULES[typeId];
  if (!rules) return;
  for (var pass = 0; pass < 3; pass++) {
    rules.forEach(function (r) {
      var v = r.fn(inst.data);
      if (!isNaN(v) && isFinite(v)) {
        var dec = (r.decimals !== undefined) ? r.decimals : 2;
        var f = Math.pow(10, dec);
        inst.data[r.target] = String(Math.round(v * f) / f);
      }
    });
  }
}

console.log('✓ Calculs chargés (' + Object.keys(CALC_RULES).length + ' types avec formules)');
