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

// === HOTTES : logique fidèle au VBA (UserForm_HOTTE) ===

// Table INRS ED 695 : type de polluant -> vitesse de transport recommandée
// ⚠ Valeurs standard ED 695 à valider (la table d'origine est dans une feuille cachée du classeur)
var HOTTE_POLLUANTS = {
  'Gaz et vapeurs': 'pas de vitesse de transport minimum nécessaire',
  'Fumées': '7 à 10',
  'Poussières très fines et légères': '10 à 12,5',
  'Poussières sèches et poudres': '12,5 à 17,5',
  'Poussières industrielles moyennes': '17,5 à 20',
  'Poussières lourdes': '20 à 22,5',
  'Poussières lourdes ou humides': '> 22,5'
};

var POURCENTAGE_REF = 0.8; // Pourcentage_Ref_TABx dans le VBA

function gridStats(grid, rows, cols) {
  // Reproduit la logique VBA : toutes les cases doivent être remplies (nombre ou "/"),
  // "/" exclut le point ; sinon résultat impossible.
  var r = Math.min(parseInt(rows, 10) || 0, 5);
  var c = Math.min(parseInt(cols, 10) || 0, 5);
  if (!r || !c || !Array.isArray(grid)) return null;
  var sum = 0, count = 0, min = Infinity, incomplete = false;
  for (var i = 0; i < r; i++) {
    for (var j = 0; j < c; j++) {
      var cell = (grid[i] && grid[i][j] !== undefined) ? String(grid[i][j]).trim() : '';
      if (cell === '') { incomplete = true; continue; }
      if (cell === '/') continue;
      var v = num(cell);
      if (isNaN(v)) { incomplete = true; continue; }
      sum += v; count++;
      if (v < min) min = v;
    }
  }
  if (incomplete || count === 0) return { incomplete: true };
  return { min: min, moyenne: sum / count };
}

// Avis vitesse (VBA) : réf = "/" -> mesuré >= INRS ; sinon mesuré >= réf × 0,8
function avisVitesse(mesuree, reference, inrs) {
  var mes = num(mesuree);
  var ref = String(reference === undefined ? '' : reference).trim();
  if (isNaN(mes) || ref === '' || (ref !== '/' && isNaN(num(ref)))) return 'Impossible de se prononcer';
  if (ref === '/') {
    var vi = num(inrs);
    if (isNaN(vi)) return 'Impossible de se prononcer';
    return mes >= vi ? 'Satisfaisant' : 'Non Satisfaisant';
  }
  return mes >= num(ref) * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
}

// Avis vitesse de transport (VBA) : parse "X à Y", "> X", ou "pas de vitesse..."
function avisTransport(mesuree, reference, inrsStr) {
  var mes = num(mesuree);
  var ref = String(reference === undefined ? '' : reference).trim();
  var inrs = String(inrsStr || '').trim();
  if (inrs === '' || isNaN(mes) || ref === '') return 'Impossible de se prononcer';
  if (inrs.indexOf('pas de vitesse de transport minimum nécessaire') !== -1) return '/';
  if (ref !== '/') {
    return mes >= num(ref) * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
  }
  if (inrs.indexOf('>') !== -1) {
    var seuil = num(inrs.split('>')[1]);
    if (isNaN(seuil)) return 'Impossible de se prononcer';
    return mes > seuil ? 'Satisfaisant' : 'Non Satisfaisant';
  }
  if (inrs.indexOf(' à ') !== -1) {
    var debut = num(inrs.split(' à ')[0]);
    if (isNaN(debut)) return 'Impossible de se prononcer';
    return mes >= debut ? 'Satisfaisant' : 'Non Satisfaisant';
  }
  var vi = num(inrs);
  if (!isNaN(vi)) return mes >= vi ? 'Satisfaisant' : 'Non Satisfaisant';
  return 'Impossible de se prononcer';
}

// Conclusion = pire des avis des mesures sélectionnées (VBA TextBox17)
function conclusionHotte(d) {
  var mesures = Array.isArray(d.mesures_choisies) ? d.mesures_choisies : [];
  var avis = [];
  if (mesures.indexOf("Vitesse au point d'émission") !== -1) {
    avis.push(d.avis_vpe_min, d.avis_vpe_moy);
  }
  if (mesures.indexOf('Vitesse de transport') !== -1) {
    if (d.avis_vt !== '/') avis.push(d.avis_vt);
  }
  if (avis.length === 0) return '';
  if (avis.some(function (a) { return !a || a === 'Impossible de se prononcer'; })) return 'Impossible de se prononcer';
  if (avis.some(function (a) { return a === 'Non Satisfaisant'; })) return 'Non Satisfaisant';
  return 'Satisfaisant';
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
  ],

  hottes: [
    { target: 'vpe_min', fn: function (d) {
        var s = gridStats(d.vpe_grid, d.vpe_nb_points_hauteur, d.vpe_nb_points_largeur);
        if (!s) return NaN;
        return s.incomplete ? '' : s.min;
      } },
    { target: 'vpe_moyenne', fn: function (d) {
        var s = gridStats(d.vpe_grid, d.vpe_nb_points_hauteur, d.vpe_nb_points_largeur);
        if (!s) return NaN;
        return s.incomplete ? '' : s.moyenne;
      } },
    { target: 'vpe_debit', fn: function (d) {
        // VBA : (Largeur/100) × (Hauteur/100) × Vmoyenne × 3600
        var L = num(d.vpe_largeur_cm), H = num(d.vpe_hauteur_cm), V = num(d.vpe_moyenne);
        return (isNaN(L) || isNaN(H) || isNaN(V)) ? NaN : (L / 100) * (H / 100) * V * 3600;
      } },
    { target: 'avis_vpe_min', fn: function (d) {
        if (num(d.vpe_min) !== num(d.vpe_min)) return '';
        return avisVitesse(d.vpe_min, d.vpe_min_reference, d.vpe_min_inrs);
      } },
    { target: 'avis_vpe_moy', fn: function (d) {
        if (num(d.vpe_moyenne) !== num(d.vpe_moyenne)) return '';
        return avisVitesse(d.vpe_moyenne, d.vpe_moy_reference, d.vpe_moy_inrs);
      } },
    { target: 'vt_inrs', fn: function (d) {
        return HOTTE_POLLUANTS[d.vt_type_polluant] || '';
      } },
    { target: 'avis_vt', fn: function (d) {
        return avisTransport(d.vt_mesuree, d.vt_reference, d.vt_inrs);
      } },
    { target: 'conclusion', fn: function (d) {
        return conclusionHotte(d);
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
      if (typeof v === 'string') {
        inst.data[r.target] = v;
      } else if (!isNaN(v) && isFinite(v)) {
        var dec = (r.decimals !== undefined) ? r.decimals : 2;
        var f = Math.pow(10, dec);
        inst.data[r.target] = String(Math.round(v * f) / f);
      }
    });
  }
}

console.log('✓ Calculs chargés (' + Object.keys(CALC_RULES).length + ' types avec formules)');
