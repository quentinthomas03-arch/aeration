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

// Masse volumique dans les conditions réelles (kg/m³) — formule VBA
// ρ = 1,293 × (273 / (273 + T)) × ((101300 + P) / 101300)
// Cabines de peinture : nombre de points de mesure sur un axe donné, selon la dimension
// de la cabine (m) et l'espacement cible (1,5 m ou 2 m) — reproduit la boucle VBA
// (répartition régulière, max 20 points, aucune valeur si dimension absente ou > 28 m)
function cdpNbPoints(dimension, spacing) {
  var d = num(dimension);
  if (isNaN(d) || d > 28) return '';
  var n = Math.ceil((d - 1) / spacing);
  if (n <= 0) return 1;
  var step = Math.round(((d - 1) / n) * 10) / 10;
  if (step <= 0) return 1;
  var count = 0;
  for (var i = 0.5; i <= 27.5 + 1e-9; i += step) {
    if (d >= i - 1e-9) count++;
    else break;
    if (count === 20) break;
  }
  return count || 1;
}

function masseVolumique(temperature, pression) {
  var T = num(temperature), P = num(pression);
  if (isNaN(T) || isNaN(P)) return '';
  return 1.293 * (273 / (273 + T)) * ((101300 + P) / 101300);
}

// Débit d'un chargeur (locaux de charge) — formule VBA vérifiée sur données réelles :
// round(0,055 × (courant/2) × (tension × 0,4) × nb, 0) × 4
function chargerDebit(c) {
  if (!c) return '';
  var nb = num(c.nb), U = num(c.tension), I = num(c.courant);
  if (isNaN(nb) || isNaN(U) || isNaN(I)) return '';
  return Math.round(0.055 * (I / 2) * (U * 0.4) * nb) * 4;
}

// === HOTTES : logique fidèle au VBA (UserForm_HOTTE) ===

// Table INRS ED 695 : type de polluant -> vitesse de transport recommandée
// ⚠ Valeurs standard ED 695 à valider (la table d'origine est dans une feuille cachée du classeur)
// Bras d'aspiration — vitesse de captage recommandée selon la condition de dispersion du polluant
var BRAS_DISPERSION = {
  'Emission sans vitesse initiale en air calme': 0.25,
  'Emission à faible vitesse en air modérément calme': 0.5,
  'Génération active en zone agitée': 1,
  'Emission à grande vitesse initiale dans une zone à mouvement d\u2019air très rapide': 2.5,
  'Gaz et vapeurs': null
};

// Installations diverses — même principe mais en plage de vitesses (guide INRS ED695)
var EQUIP_DISPERSION = {
  'Emission sans vitesse initiale en air calme': '0,25 - 0,5',
  'Emission à faible vitesse en air modérément calme': '0,5 - 1',
  'Génération active en zone agitée': '1 - 2,5',
  'Emission à grande vitesse initiale dans une zone à mouvement d\u2019air très rapide': '2,5 - 10',
  'Gaz et vapeurs': '/'
};

// Avis vitesse au point d'émission (Installations diverses) : réf numérique -> ×0,8 ;
// sinon compare à la borne basse de la plage recommandée (VBA : satisfaisant dès que mesuré ≥ borne basse)
function avisDispersionRange(mesuree, reference, rangeStr) {
  var mes = num(mesuree);
  var ref = String(reference === undefined ? '' : reference).trim();
  if (isNaN(mes) || ref === '') return 'Impossible de se prononcer';
  if (ref !== '/' && !isNaN(num(ref))) {
    return mes >= num(ref) * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
  }
  var range = String(rangeStr || '').trim();
  if (range === '' || range === '/') return 'Impossible de se prononcer';
  var parts = range.split(' - ');
  if (parts.length < 2) return 'Impossible de se prononcer';
  var lower = num(parts[0]);
  if (isNaN(lower)) return 'Impossible de se prononcer';
  return mes >= lower ? 'Satisfaisant' : 'Non Satisfaisant';
}

// Génère les règles de calcul répétées pour une mesure de transport "Installations diverses"
function buildEquipTransportCalcRules(prefix, showIfLabel) {
  return [
    { target: prefix + '_surface', decimals: 4, fn: function (d) {
        return surfaceSection(d[prefix + '_forme_conduit'], d[prefix + '_diametre_cote1'], d[prefix + '_cote2']);
      } },
    { target: prefix + '_masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d[prefix + '_temperature'], d[prefix + '_pression_statique']);
      } },
    { target: prefix + '_vitesse_moyenne_grille', decimals: 3, fn: function (d) {
        if (d[prefix + '_vitesse_mode'] !== 'Grille de points') return '';
        var s = gridStats(d[prefix + '_vitesse_grid'], d[prefix + '_vitesse_nb_axes'], d[prefix + '_vitesse_nb_points']);
        if (!s || s.incomplete) return '';
        return s.moyenne;
      } },
    { target: prefix + '_mesuree', decimals: 3, fn: function (d) {
        return (d[prefix + '_vitesse_mode'] === 'Grille de points') ? (d[prefix + '_vitesse_moyenne_grille'] || '') : (d[prefix + '_vitesse_directe'] || '');
      } },
    { target: prefix + '_debit', fn: function (d) {
        var v = debitFromSV(d[prefix + '_surface'], d[prefix + '_mesuree']);
        return isNaN(v) ? '' : v;
      } },
    { target: prefix + '_inrs', fn: function (d) {
        return HOTTE_POLLUANTS[d[prefix + '_type_polluant']] || '';
      } },
    { target: 'avis_' + prefix, fn: function (d) {
        var mesures = Array.isArray(d.mesures_choisies) ? d.mesures_choisies : [];
        if (mesures.indexOf(showIfLabel) === -1) return '';
        return avisTransport(d[prefix + '_mesuree'], d[prefix + '_reference'], d[prefix + '_inrs']);
      } }
  ];
}

// Gaz d'échappement — débit minimal préconisé INRS selon type d'équipement + type de captage
// (Locomotive / Outillage portatif / Autres : pas de valeur fixe -> "/")
var ECHAP_INRS = {
  'Véhicule léger': {
    "Captage enveloppant (fixé à l'échappement)": 400,
    "Captage récepteur (non fixé à l'échappement)": 1000
  },
  'Poids-Lourd et Bus': {
    "Captage enveloppant (fixé à l'échappement)": 1000,
    "Captage récepteur (non fixé à l'échappement)": 2000
  }
};

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

// Table LPNS (feuille F_LISTE) : type de local -> volume min/occupant (m³) et débit min/occupant (m³/h)
// Valeurs extraites du classeur Rapso V29
var LOCAL_LPNS = {
  'Bureaux': { vol: 15, debit: 25 },
  'Locaux Sans Travail Physique': { vol: 15, debit: 25 },
  'Locaux de Restauration, Vente ou Réunion': { vol: 15, debit: 30 },
  'Ateliers ou Locaux avec Travail Physique Léger': { vol: 15, debit: 45 },
  'Autres ateliers et locaux': { vol: 24, debit: 60 },
  'Local occupé occasionnellement': { vol: null, debit: null }
};

// Débit minimal réglementaire sanitaires (R4212-6). N = nombre d'équipements.
// Débit minimal réglementaire sanitaires (R4212-6) — calculé à partir du nombre
// d'équipements, pas du type de local (WC/urinoirs + douches combinés ; lavabos séparés)
function debitSanitaire(nbWcUrinoirs, nbDouches, nbLavabos) {
  var wc = num(nbWcUrinoirs), douches = num(nbDouches), lavabos = num(nbLavabos);
  var nWcDouches = (isNaN(wc) ? 0 : wc) + (isNaN(douches) ? 0 : douches);
  var nLavabos = isNaN(lavabos) ? 0 : lavabos;
  if (nWcDouches <= 0 && nLavabos <= 0) return NaN;
  var total = 0;
  if (nWcDouches > 0) total += (nWcDouches === 1) ? 30 : (30 + 15 * nWcDouches);
  if (nLavabos > 0) total += 10 + 5 * nLavabos;
  return total;
}

// Débit d'air neuf effectivement introduit selon le type de ventilation (VBA)
function debitAirNeufMesure(d) {
  var vt = d.type_ventilation;
  if (vt === 'Extraction') return num(d.debit_total_mesure);
  if (vt === 'Soufflage' || vt === 'Double flux') {
    var base = (vt === 'Double flux') ? num(d.debit_soufflage) : num(d.debit_total_mesure);
    var pct = num(d.pourcentage_air_neuf);
    if (isNaN(base) || isNaN(pct)) return NaN;
    return base * (pct / 100);
  }
  return NaN;
}

function gridStats(grid, rows, cols) {
  // Reproduit la logique VBA : toutes les cases doivent être remplies (nombre ou "/"),
  // "/" exclut le point ; sinon résultat impossible.
  var r = Math.min(parseInt(rows, 10) || 0, 20);
  var c = Math.min(parseInt(cols, 10) || 0, 20);
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

// Variante Sorbonnes : deux colonnes d'avis séparées (référence seule, ED795 seule),
// avec priorité à la référence si elle est renseignée (numérique)
function avisRefSeule(mesuree, reference) {
  var ref = String(reference === undefined ? '' : reference).trim();
  if (ref === '' || ref === '/') return 'Sans objet';
  var mes = num(mesuree), r = num(ref);
  if (isNaN(mes) || isNaN(r)) return 'Impossible de se prononcer';
  return mes >= r * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
}
function avisAltSeul(mesuree, reference, altValue) {
  var ref = String(reference === undefined ? '' : reference).trim();
  if (ref !== '' && ref !== '/') return 'Sans objet';
  var mes = num(mesuree), alt = num(altValue);
  if (isNaN(mes) || isNaN(alt)) return 'Impossible de se prononcer';
  return mes >= alt ? 'Satisfaisant' : 'Non Satisfaisant';
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
// Génère les règles de calcul répétées pour un circuit CTA (neuf / souffle / recycle)
function buildCtaCircuitCalcRules(prefix) {
  return [
    { target: prefix + '_surface', decimals: 4, fn: function (d) {
        return surfaceSection(d[prefix + '_forme_section'], d[prefix + '_diametre_cote1'], d[prefix + '_cote2']);
      } },
    { target: prefix + '_masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d[prefix + '_temperature'], d[prefix + '_pression_statique']);
      } },
    { target: prefix + '_vitesse_moyenne_grille', decimals: 3, fn: function (d) {
        if (d[prefix + '_vitesse_mode'] !== 'Grille de points') return '';
        var s = gridStats(d[prefix + '_vitesse_grid'], d[prefix + '_vitesse_nb_axes'], d[prefix + '_vitesse_nb_points']);
        if (!s || s.incomplete) return '';
        return s.moyenne;
      } },
    { target: prefix + '_ecart_norme', fn: function (d) {
        if (d[prefix + '_vitesse_mode'] !== 'Grille de points') return '';
        var axes = num(d[prefix + '_vitesse_nb_axes']), pts = num(d[prefix + '_vitesse_nb_points']);
        if (isNaN(axes) || isNaN(pts)) return '';
        var total = axes * pts;
        if (total < 25 && axes < 5) {
          return "Ecart à la norme X10-112 : le nombre de points préconisé par la norme (25 points) n'a pas pu être réalisé compte tenu de la configuration de l'installation (nombre d'axes insuffisant)";
        }
        return '';
      } },
    { target: prefix + '_debit_en_cours', fn: function (d) {
        var v = (d[prefix + '_vitesse_mode'] === 'Grille de points') ? num(d[prefix + '_vitesse_moyenne_grille']) : num(d[prefix + '_vitesse']);
        var s = num(d[prefix + '_surface']);
        var res = debitFromSV(s, v);
        return isNaN(res) ? '' : res;
      } }
  ];
}

var CALC_RULES = {

  bureaux: [
    { target: 'volume_min', fn: function (d) {
        var t = LOCAL_LPNS[d.type_local]; var eff = num(d.effectif);
        if (!t || t.vol === null || isNaN(eff)) return '';
        return t.vol * eff;
      } },
    { target: 'volume_apparent', fn: function (d) {
        // Le volume n'est masqué que si Soufflage/Double flux ET ouvrant=Non ET entrée d'air permanente=Non
        var vt = d.type_ventilation;
        if ((vt === 'Soufflage' || vt === 'Double flux') && d.ouvrant_exterieur === 'Non' && d.entree_air_permanente === 'Non') {
          return 'false';
        }
        return 'true';
      } },
    { target: 'debit_min_air_neuf', fn: function (d) {
        var t = LOCAL_LPNS[d.type_local]; var eff = num(d.effectif);
        if (!t || t.debit === null || isNaN(eff)) return '';
        return t.debit * eff;
      } },
    { target: 'debit_air_neuf_introduit', fn: function (d) {
        var v = debitAirNeufMesure(d);
        return isNaN(v) ? '' : v;
      } },
    { target: 'avis', fn: function (d) {
        if (d.type_local === 'Local occupé occasionnellement') return 'Sans objet';
        if (!d.type_local) return 'Impossible de se prononcer';
        if (!d.type_ventilation) return 'Impossible de se prononcer';
        if (num(d.effectif) !== num(d.effectif)) return 'Impossible de se prononcer';
        var min = num(d.debit_min_air_neuf);
        var vt = d.type_ventilation;
        var mesure = (vt === 'Extraction') ? num(d.debit_total_mesure) : debitAirNeufMesure(d);
        if (isNaN(min) || isNaN(mesure)) return 'Impossible de se prononcer';
        return mesure >= min ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  sanitaires: [
    { target: 'debit_min_reglementaire', fn: function (d) {
        var v = debitSanitaire(d.nb_wc_urinoirs, d.nb_douches, d.nb_lavabos);
        return isNaN(v) ? '' : v;
      } },
    { target: 'avis', fn: function (d) {
        var min = num(d.debit_min_reglementaire), mes = num(d.debit_mesure);
        if (isNaN(min) || isNaN(mes)) return 'Impossible de se prononcer';
        return mes >= min ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  erp: [
    { target: 'volume_apparent', fn: function (d) {
        var vt = d.type_ventilation;
        if ((vt === 'Soufflage' || vt === 'Double flux') && d.ouvrant_exterieur === 'Non' && d.entree_air_permanente === 'Non') {
          return 'false';
        }
        return 'true';
      } },
    { target: 'debit_min_air_neuf', fn: function (d) {
        var t = LOCAL_LPNS[d.type_local];
        var occ = num(d.travailleur) + (isNaN(num(d.public)) ? 0 : num(d.public));
        if (!t || t.debit === null || isNaN(num(d.travailleur))) return '';
        return t.debit * occ;
      } },
    { target: 'debit_air_neuf_introduit', fn: function (d) {
        var v = debitAirNeufMesure(d);
        return isNaN(v) ? '' : v;
      } },
    { target: 'avis', fn: function (d) {
        if (d.type_local === 'Local occupé occasionnellement') return 'Sans objet';
        if (!d.type_local || !d.type_ventilation) return 'Impossible de se prononcer';
        var min = num(d.debit_min_air_neuf);
        var vt = d.type_ventilation;
        var mesure = (vt === 'Extraction') ? num(d.debit_total_mesure) : debitAirNeufMesure(d);
        if (isNaN(min) || isNaN(mesure)) return 'Impossible de se prononcer';
        return mesure >= min ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  locaux_fumeurs: [
    { target: 'surface', fn: function (d) {
        var L = num(d.largeur), l = num(d.longueur);
        return (isNaN(L) || isNaN(l)) ? NaN : L * l;
      } },
    { target: 'volume', fn: function (d) {
        var L = num(d.largeur), l = num(d.longueur), h = num(d.hauteur);
        return (isNaN(L) || isNaN(l) || isNaN(h)) ? NaN : L * l * h;
      } },
    { target: 'taux_renouvellement_valeur', fn: function (d) {
        var q = num(d.reprise_totale), vol = num(d.volume);
        if (isNaN(q) || isNaN(vol) || vol === 0) return '';
        return q / vol;
      } },
    { target: 'crit_taux_renouvellement', fn: function (d) {
        var t = num(d.taux_renouvellement_valeur);
        if (isNaN(t)) return '';
        return t >= 10 ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'crit_depression', fn: function (d) {
        var p = num(d.depression_mesuree);
        if (isNaN(p)) return '';
        return p >= 5 ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'crit_ratio_surface', fn: function (d) {
        var s = num(d.surface), et = num(d.superficie_etablissement);
        if (isNaN(s) || isNaN(et) || et === 0) return '';
        return (s < 35 && s <= 0.20 * et) ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'avis_global', fn: function (d) {
        var criteres = [
          'crit_salle_close', 'crit_aucune_prestation', 'crit_organisation_entretien',
          'crit_dispositif_extraction', 'crit_rejet_exterieur', 'crit_rejet_distance_passage',
          'crit_rejet_distance_prises', 'crit_taux_renouvellement', 'crit_ventilation_independante',
          'crit_depression', 'crit_fermetures_auto', 'crit_pas_lieu_passage', 'crit_ratio_surface',
          'crit_attestation_installateur', 'crit_document_possession_chef', 'crit_entretien_regulier',
          'crit_consultation_chsct', 'crit_panneau_avertissement', 'crit_panneau_interdiction'
        ];
        var tousSatisfaisants = criteres.every(function (k) { return d[k] === 'Satisfaisant'; });
        return tousSatisfaisants ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  extracteur: [
    { target: 'surface_m2', decimals: 4, fn: function (d) {
        return surfaceSection(d.forme_section, d.diametre_cote1, d.cote2);
      } },
    { target: 'vitesse_moyenne_grille', decimals: 3, fn: function (d) {
        if (d.vitesse_mode !== 'Grille de points') return '';
        var s = gridStats(d.vitesse_grid, d.vitesse_nb_axes, d.vitesse_nb_points);
        if (!s || s.incomplete) return '';
        return s.moyenne;
      } },
    { target: 'debit_annee_en_cours', fn: function (d) {
        var v = (d.vitesse_mode === 'Grille de points') ? num(d.vitesse_moyenne_grille) : num(d.vitesse);
        var s = num(d.surface_m2);
        return (isNaN(v) || isNaN(s)) ? NaN : s * v * 3600;
      } },
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'volume_par_heure', fn: function (d) {
        if (d.afficher_taux !== 'Oui') return '';
        var q = num(d.debit_annee_en_cours), vol = num(d.volume_local);
        return (isNaN(q) || isNaN(vol) || vol === 0) ? '' : q / vol;
      } },
    { target: 'conclusion_taux', fn: function (d) {
        if (d.afficher_taux !== 'Oui') return '';
        var vph = num(d.volume_par_heure), rec = num(d.valeur_recommandee);
        if (isNaN(vph) || isNaN(rec)) return 'Impossible de se prononcer';
        return vph >= rec ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'avis_constructeur', fn: function (d) {
        // VBA : débit année en cours >= référence × 0.8 ; + prise en compte du taux si affiché
        var debit = num(d.debit_annee_en_cours), ref = num(d.valeur_reference_recommandee);
        var avis;
        if (isNaN(debit) || isNaN(ref)) avis = 'Impossible de se prononcer';
        else avis = debit >= ref * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
        if (d.afficher_taux === 'Oui') {
          var ct = d.conclusion_taux;
          if (avis === 'Satisfaisant' && ct === 'Non Satisfaisant') avis = 'Non Satisfaisant';
        }
        return avis;
      } }
  ],

  gaz_echappement: [
    { target: 'surface_m2', decimals: 4, fn: function (d) {
        return surfaceSection(d.forme_section, d.diametre_cote1, d.cote2);
      } },
    { target: 'vitesse_moyenne_grille', decimals: 3, fn: function (d) {
        if (d.vitesse_mode !== 'Grille de points') return '';
        var s = gridStats(d.vitesse_grid, d.vitesse_nb_axes, d.vitesse_nb_points);
        if (!s || s.incomplete) return '';
        return s.moyenne;
      } },
    { target: 'debit_mesure', fn: function (d) {
        var v = (d.vitesse_mode === 'Grille de points') ? num(d.vitesse_moyenne_grille) : num(d.vitesse);
        var s = num(d.surface_m2);
        return (isNaN(v) || isNaN(s)) ? NaN : s * v * 3600;
      } },
    { target: 'debit_min_inrs', fn: function (d) {
        var table = ECHAP_INRS[d.type_equipement];
        if (!table) return '/';
        return table[d.type_captage] !== undefined ? table[d.type_captage] : '/';
      } },
    { target: 'debit_min_calcule', fn: function (d) {
        // Formule VBA : 1,2 × cylindrée (L) × 0,0363 × régime (tr/min)
        var V = num(d.cylindree), n = num(d.regime_moteur);
        return (isNaN(V) || isNaN(n)) ? '' : 1.2 * V * 0.0363 * n;
      } },
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'avis_constructeur', fn: function (d) {
        // VBA : débit mesuré >= (référence × 0.8) ET >= débit min INRS ET >= débit min calculé
        var debit = num(d.debit_mesure);
        if (isNaN(debit)) return 'Impossible de se prononcer';
        var ref = num(d.debit_reference), inrs = num(d.debit_min_inrs), calc = num(d.debit_min_calcule);
        if (isNaN(ref) && isNaN(inrs) && isNaN(calc)) return 'Impossible de se prononcer';
        var ok = true;
        if (!isNaN(ref)) ok = ok && debit >= ref * POURCENTAGE_REF;
        if (!isNaN(inrs)) ok = ok && debit >= inrs;
        if (!isNaN(calc)) ok = ok && debit >= calc;
        return ok ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  menuiserie: [
    { target: 'surface_m2', decimals: 4, fn: function (d) {
        return surfaceSection(d.forme_section, d.diametre_cote1, d.cote2);
      } },
    { target: 'vitesse_moyenne_grille', decimals: 3, fn: function (d) {
        if (d.vitesse_mode !== 'Grille de points') return '';
        var s = gridStats(d.vitesse_grid, d.vitesse_nb_axes, d.vitesse_nb_points);
        if (!s || s.incomplete) return '';
        return s.moyenne;
      } },
    { target: 'debit_annee_en_cours', fn: function (d) {
        var v = (d.vitesse_mode === 'Grille de points') ? num(d.vitesse_moyenne_grille) : num(d.vitesse);
        var s = num(d.surface_m2);
        return (isNaN(v) || isNaN(s)) ? NaN : s * v * 3600;
      } },
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'avis_constructeur', fn: function (d) {
        var debit = num(d.debit_annee_en_cours), ref = num(d.valeur_reference_recommandee);
        if (isNaN(debit) || isNaN(ref)) return 'Impossible de se prononcer';
        return debit >= ref * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  cta: []
    .concat(buildCtaCircuitCalcRules('neuf'))
    .concat(buildCtaCircuitCalcRules('souffle'))
    .concat(buildCtaCircuitCalcRules('recycle'))
    .concat([
      { target: 'avis_inrs', fn: function (d) {
          var circuits = (d.mode_fonctionnement === 'AIR NEUF / AIR RECYCLE')
            ? ['neuf', 'souffle', 'recycle']
            : ['neuf', 'souffle'];
          var actifs = circuits.filter(function (p) { return d[p + '_forme_section']; });
          if (actifs.length === 0) return 'Impossible de se prononcer';
          var manque = false;
          var conforme = actifs.every(function (p) {
            var mes = num(d[p + '_debit_en_cours']), ref = num(d[p + '_debit_reference']);
            if (isNaN(mes) || isNaN(ref)) { manque = true; return false; }
            return mes >= ref * POURCENTAGE_REF;
          });
          if (manque) return 'Impossible de se prononcer';
          return conforme ? 'Satisfaisant' : 'Non Satisfaisant';
        } }
    ]),

  menuiserie_bis: [
    { target: 'debit', fn: function (d) {
        // débit = vitesse moyenne × surface du conduit ; ici approximé via diamètre conduit si présent
        var s = surfaceSection('Circulaire', d.diametre_cm, null);
        return debitFromSV(s, d.vitesse_moyenne);
      } }
  ],

  box_peinture: [
    { target: 'volume_par_heure', decimals: 1, fn: function (d) {
        var q = num(d.debit_extraction_box), vol = num(d.volume_local);
        return (isNaN(q) || isNaN(vol) || vol === 0) ? '' : q / vol;
      } },
    { target: 'debit_minimal_50vh', fn: function (d) {
        // Formule VBA : 50 × volume du local
        var vol = num(d.volume_local);
        return isNaN(vol) ? '' : 50 * vol;
      } },
    { target: 'conclusion', fn: function (d) {
        // VBA : volume/heure > 50 -> Satisfaisant ; sinon "Non satisfaisant < 50 volumes/heure"
        var vph = num(d.volume_par_heure);
        if (isNaN(vph)) return 'Impossible de se prononcer';
        return vph > 50 ? 'Satisfaisant' : 'Non satisfaisant (< 50 volumes/heure)';
      } },
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'avis_constructeur', fn: function (d) {
        var mes = num(d.debit_extraction_box), ref = num(d.debit_reference);
        if (isNaN(mes) || isNaN(ref)) return '';
        return mes >= ref * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  locaux_charge: [
    { target: 'valeur_inrs', fn: function (d) {
        var list = Array.isArray(d.chargeurs) ? d.chargeurs : [];
        if (list.length === 0) return '';
        var total = 0, anyValid = false;
        list.forEach(function (c) {
          var deb = chargerDebit(c);
          if (deb !== '' && !isNaN(deb)) { total += deb; anyValid = true; }
        });
        return anyValid ? total : '';
      } },
    { target: 'avis', fn: function (d) {
        // VBA : débit mesuré >= référence × 0.8 (ou >= INRS calculé si pas de référence)
        var mes = num(d.debit_mesure_local);
        if (isNaN(mes)) return 'Impossible de se prononcer';
        var refStr = String(d.valeur_reference || '').trim();
        if (refStr !== '' && refStr !== '/') {
          var ref = num(refStr);
          if (isNaN(ref)) return 'Impossible de se prononcer';
          return mes >= ref * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
        }
        var inrs = num(d.valeur_inrs);
        if (isNaN(inrs)) return 'Impossible de se prononcer';
        return mes >= inrs ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  tts: [
    { target: 'surface_cuve', decimals: 4, fn: function (d) {
        if (d.forme_cuve === 'Circulaire') {
          var D = num(d.diametre_cuve);
          return isNaN(D) ? '' : (Math.PI * D * D) / 4;
        }
        var L = num(d.longueur_l), l = num(d.largeur_l);
        return (isNaN(L) || isNaN(l)) ? '' : L * l;
      } },
    { target: 'debit_calcule', fn: function (d) {
        // Formules VBA :
        // Rectangulaire : Qr = L·W·a·(W/(n·L))^b·V·3600
        // Circulaire   : Qc = Sc·a·(1/n)^b·V·3600
        var a = num(d.coef_a), b = num(d.coef_b), n = num(d.coef_n), V = num(d.vitesse);
        if (isNaN(a) || isNaN(b) || isNaN(n) || isNaN(V) || n === 0) return '';
        if (d.forme_cuve === 'Circulaire') {
          var Sc = num(d.surface_cuve);
          if (isNaN(Sc)) return '';
          return Sc * a * Math.pow(1 / n, b) * V * 3600;
        }
        var L = num(d.longueur_l), W = num(d.largeur_l);
        if (isNaN(L) || isNaN(W) || L === 0) return '';
        return L * W * a * Math.pow(W / (n * L), b) * V * 3600;
      } },
    { target: 'debit_qr10', fn: function (d) {
        var q = num(d.debit_calcule);
        return isNaN(q) ? '' : q / 10;
      } },
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'avis', fn: function (d) {
        // VBA : débit mesuré > Qr/10 (seuil INRS) ; + comparaison référence si fournie
        var mes = num(d.debit_mesure), qr10 = num(d.debit_qr10);
        var refStr = String(d.debit_reference || '').trim();
        if (isNaN(mes)) return 'Impossible de se prononcer';
        var ok = true, evaluated = false;
        if (!isNaN(qr10)) { ok = ok && (mes > qr10); evaluated = true; }
        var inrs = num(d.debit_min_inrs);
        if (!isNaN(inrs)) { ok = ok && (mes >= inrs); evaluated = true; }
        if (refStr !== '' && refStr !== '/') {
          var ref = num(refStr);
          if (!isNaN(ref)) { ok = ok && (mes >= ref * POURCENTAGE_REF); evaluated = true; }
        }
        if (!evaluated) return 'Impossible de se prononcer';
        return ok ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  installations_diverses: [
    { target: 'vpe_inrs', fn: function (d) {
        return EQUIP_DISPERSION[d.condition_dispersion] || '';
      } },
    { target: 'avis_vpe', fn: function (d) {
        var mesures = Array.isArray(d.mesures_choisies) ? d.mesures_choisies : [];
        if (mesures.indexOf("Vitesse au point d'émission") === -1) return '';
        return avisDispersionRange(d.vpe_mesuree, d.vpe_reference, d.vpe_inrs);
      } }
  ]
    .concat(buildEquipTransportCalcRules('vt1', "Vitesse de transport"))
    .concat(buildEquipTransportCalcRules('vt2', 'Vitesse de transport secondaire'))
    .concat([
    { target: 'avis', fn: function (d) {
        var mesures = Array.isArray(d.mesures_choisies) ? d.mesures_choisies : [];
        var avis = [];
        if (mesures.indexOf("Vitesse au point d'émission") !== -1) avis.push(d.avis_vpe);
        if (mesures.indexOf('Vitesse de transport') !== -1 && d.avis_vt1 !== '/') avis.push(d.avis_vt1);
        if (mesures.indexOf('Vitesse de transport secondaire') !== -1 && d.avis_vt2 !== '/') avis.push(d.avis_vt2);
        avis = avis.filter(function (a) { return a; });
        if (avis.length === 0) return '';
        if (avis.some(function (a) { return a === 'Impossible de se prononcer'; })) return 'Impossible de se prononcer';
        if (avis.some(function (a) { return a === 'Non Satisfaisant'; })) return 'Non Satisfaisant';
        return 'Satisfaisant';
      } }
  ]),

  bras_aspiration: [
    { target: 'surface_bouche', decimals: 4, fn: function (d) {
        // VBA : circulaire π×(D/200)² ; ovale π×(l/200)×(L/200) ; sinon surface saisie
        if (d.forme_bouche === 'Circulaire') {
          var D = num(d.diametre_bouche);
          return isNaN(D) ? '' : Math.PI * Math.pow(D / 200, 2);
        }
        if (d.forme_bouche === 'Ovale') {
          var l = num(d.largeur_bouche_ovale), L = num(d.longueur_bouche_ovale);
          return (isNaN(l) || isNaN(L)) ? '' : Math.PI * (l / 200) * (L / 200);
        }
        if (d.forme_bouche === 'Autre (surface connue)') {
          var s = num(d.surface_bouche_autre);
          return isNaN(s) ? '' : s;
        }
        return '';
      } },
    { target: 'surface_point_mesure', decimals: 4, fn: function (d) {
        if (d.localisation_point_mesure === 'Conduit') {
          var Dc = num(d.diametre_conduit);
          return isNaN(Dc) ? '' : Math.PI * Math.pow(Dc / 200, 2);
        }
        if (d.localisation_point_mesure === 'Bouche') {
          return num(d.surface_bouche);
        }
        return '';
      } },
    { target: 'debit_calcule', fn: function (d) {
        var s = num(d.surface_point_mesure), v = num(d.vitesse_moyenne);
        return (isNaN(s) || isNaN(v)) ? '' : Math.round(s * v * 3600);
      } },
    { target: 'vitesse_captage_recommandee', fn: function (d) {
        var vc = BRAS_DISPERSION[d.condition_dispersion];
        if (vc === undefined) return '';
        return (vc === null) ? '/' : vc;
      } },
    { target: 'distance_max_captage', fn: function (d) {
        // VBA : dist = (Débit / (3600 × facteur × Vcaptage) − Aire_bouche) / K ; puis sqrt(dist)×100, min 0
        var q = num(d.debit_calcule), s = num(d.surface_bouche);
        var vcRaw = d.vitesse_captage_recommandee;
        if (vcRaw === '/' || vcRaw === '' || vcRaw === undefined) return '';
        var vc = num(vcRaw);
        if (isNaN(q) || isNaN(vc) || isNaN(s) || vc === 0) return '';
        var K, facteur;
        switch (d.type_bouche) {
          case 'Sans collerette': K = 10; facteur = 1; break;
          case 'Avec collerette': K = 10; facteur = 0.75; break;
          case 'Sans collerette reposant sur un plan': K = 5; facteur = 1; break;
          case 'Avec collerette reposant sur un plan': K = 5; facteur = 0.75; break;
          default: return '';
        }
        var inner = (q / (3600 * facteur * vc) - s) / K;
        if (inner < 0) inner = 0;
        return Math.sqrt(inner) * 100;
      } },
    { target: 'avis', fn: function (d) {
        if (d.recyclage === 'Oui') return 'Non Satisfaisant';
        if (d.adapte_situation === 'Non') return 'Non Satisfaisant';
        var dmax = num(d.distance_max_captage), dutil = num(d.distance_utilisation);
        if (isNaN(dmax) || isNaN(dutil)) return 'Impossible de se prononcer';
        return dmax > dutil ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'evolution_pct', decimals: 1, fn: function (d) {
        var prev = num(d.debit_precedent), cur = num(d.debit_calcule);
        return (isNaN(prev) || isNaN(cur) || cur === 0) ? '' : ((cur - prev) / cur) * 100;
      } }
  ],

  sorbonnes: [
    { target: 'nb_colonnes_actives', fn: function (d) {
        var l = num(d.largeur_mm);
        if (isNaN(l)) return '';
        if (l > 2210) return 6;
        if (l > 1810) return 5;
        if (l > 1410) return 4;
        if (l > 1010) return 3;
        if (l > 610) return 2;
        return 1;
      } },
    { target: 'nb_lignes_mesure', fn: function () { return 3; } },
    { target: 'hauteur_ouverture_valeur', fn: function (d) {
        if (d.annee_construction === 'Avant janvier 2005 - Norme XP X15-203 (400 mm)') return 400;
        if (d.annee_construction === 'Après janvier 2005 - Norme NF EN 14175-4 (500 mm)') return 500;
        if (d.annee_construction === 'Autre') return num(d.hauteur_ouverture_autre);
        return '';
      } },
    { target: 'surface_ouverture', decimals: 4, fn: function (d) {
        var l = num(d.largeur_mm), h = num(d.hauteur_ouverture_valeur);
        if (isNaN(l) || isNaN(h)) return '';
        return (l / 1000) * (h / 1000);
      } },
    { target: 'espace_horizontal', fn: function (d) {
        var l = num(d.largeur_mm), n = num(d.nb_colonnes_actives);
        if (isNaN(l) || isNaN(n) || n === 0) return '';
        return (l - 200) / n;
      } },
    { target: 'espace_vertical', fn: function (d) {
        var h = num(d.hauteur_ouverture_valeur);
        if (isNaN(h)) return '';
        return (h - 200) / 2;
      } },
    { target: 'vitesse_min_mesuree', decimals: 3, fn: function (d) {
        var s = gridStats(d.vitesse_grid, d.nb_lignes_mesure, d.nb_colonnes_actives);
        if (!s || s.incomplete) return '';
        return s.min;
      } },
    { target: 'vitesse_moy_mesuree', decimals: 3, fn: function (d) {
        var s = gridStats(d.vitesse_grid, d.nb_lignes_mesure, d.nb_colonnes_actives);
        if (!s || s.incomplete) return '';
        return s.moyenne;
      } },
    { target: 'vitesse_min_ed795', fn: function () { return 0.4; } },
    { target: 'debit_mesure', fn: function (d) {
        return debitFromSV(d.surface_ouverture, d.vitesse_moy_mesuree);
      } },
    { target: 'vitesse_min_avis_reference', fn: function (d) {
        return avisRefSeule(d.vitesse_min_mesuree, d.vitesse_min_reference);
      } },
    { target: 'vitesse_min_avis_ed795', fn: function (d) {
        return avisAltSeul(d.vitesse_min_mesuree, d.vitesse_min_reference, d.vitesse_min_ed795);
      } },
    { target: 'vitesse_moy_avis_reference', fn: function (d) {
        return avisRefSeule(d.vitesse_moy_mesuree, d.vitesse_moy_reference);
      } },
    { target: 'vitesse_moy_avis_ed795', fn: function () { return 'Sans objet'; } },
    { target: 'debit_avis_reference', fn: function (d) {
        return avisRefSeule(d.debit_mesure, d.debit_reference);
      } },
    { target: 'debit_avis_ed795', fn: function () { return 'Sans objet'; } },
    { target: 'avis_global', fn: function (d) {
        var avisPertinents = [
          (d.vitesse_min_avis_reference !== 'Sans objet') ? d.vitesse_min_avis_reference : d.vitesse_min_avis_ed795,
          d.vitesse_moy_avis_reference,
          d.debit_avis_reference
        ].filter(function (a) { return a && a !== 'Sans objet'; });
        if (avisPertinents.length === 0) return '';
        if (avisPertinents.some(function (a) { return a === 'Non Satisfaisant'; })) return 'Non Satisfaisant';
        if (avisPertinents.some(function (a) { return a === 'Impossible de se prononcer'; })) return 'Impossible de se prononcer';
        return 'Satisfaisant';
      } }
  ],

  cabines_peinture: [
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'nb_lignes', fn: function (d) {
        if (d.sous_type === 'CDP Fosse') return 1;
        var spacing = (d.sous_type === 'CDP Camion' || d.sous_type === 'CDP Encombrant') ? 2 : 1.5;
        return cdpNbPoints(d.cabine_longueur, spacing);
      } },
    { target: 'nb_colonnes', fn: function (d) {
        var spacing = (d.sous_type === 'CDP Camion' || d.sous_type === 'CDP Encombrant') ? 2 : 1.5;
        var dim = (d.sous_type === 'CDP Fosse') ? d.fosse_longueur : d.cabine_largeur;
        return cdpNbPoints(dim, spacing);
      } },
    { target: 'vitesse_moy_avec', decimals: 3, fn: function (d) {
        var s = gridStats(d.vitesse_grid_avec, d.nb_lignes, d.nb_colonnes);
        if (!s || s.incomplete) return '';
        return s.moyenne;
      } },
    { target: 'vitesse_min_avec', decimals: 3, fn: function (d) {
        var s = gridStats(d.vitesse_grid_avec, d.nb_lignes, d.nb_colonnes);
        if (!s || s.incomplete) return '';
        return s.min;
      } },
    { target: 'vitesse_moy_avec_avis', fn: function (d) {
        return avisVitesse(d.vitesse_moy_avec, d.vitesse_moy_avec_reference, d.vitesse_moy_avec_inrs);
      } },
    { target: 'vitesse_min_avec_avis', fn: function (d) {
        return avisVitesse(d.vitesse_min_avec, d.vitesse_min_avec_reference, d.vitesse_min_avec_inrs);
      } },
    { target: 'vitesse_moy_vide', decimals: 3, fn: function (d) {
        var s = gridStats(d.vitesse_grid_vide, d.nb_lignes, d.nb_colonnes);
        if (!s || s.incomplete) return '';
        return s.moyenne;
      } },
    { target: 'vitesse_min_vide', decimals: 3, fn: function (d) {
        var s = gridStats(d.vitesse_grid_vide, d.nb_lignes, d.nb_colonnes);
        if (!s || s.incomplete) return '';
        return s.min;
      } },
    { target: 'vitesse_moy_vide_avis', fn: function (d) {
        return avisVitesse(d.vitesse_moy_vide, d.vitesse_moy_vide_reference, d.vitesse_moy_vide_inrs);
      } },
    { target: 'vitesse_min_vide_avis', fn: function (d) {
        return avisVitesse(d.vitesse_min_vide, d.vitesse_min_vide_reference, d.vitesse_min_vide_inrs);
      } },
    { target: 'debit_mesure', fn: function (d) {
        // VBA : débit = 3600 × vitesse moyenne × longueur × largeur (Fosse : × largeur seule)
        var vMoy = (d.sous_type === 'CDP Voiture' || d.sous_type === 'CDP Camion') ? num(d.vitesse_moy_avec) : num(d.vitesse_moy_vide);
        if (isNaN(vMoy)) return '';
        if (d.sous_type === 'CDP Fosse') {
          var largeurFosse = num(d.fosse_longueur);
          return isNaN(largeurFosse) ? '' : 3600 * vMoy * largeurFosse;
        }
        var L = num(d.cabine_longueur), l = num(d.cabine_largeur);
        return (isNaN(L) || isNaN(l)) ? '' : 3600 * vMoy * L * l;
      } },
    { target: 'debit_avis', fn: function (d) {
        return avisRefSeule(d.debit_mesure, d.debit_reference);
      } },
    { target: 'conclusion', fn: function (d) {
        var avecTypes = ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'];
        var videTypes = ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'];
        var avis = [];
        if (avecTypes.indexOf(d.sous_type) !== -1) avis.push(d.vitesse_moy_avec_avis, d.vitesse_min_avec_avis);
        if (videTypes.indexOf(d.sous_type) !== -1) avis.push(d.vitesse_moy_vide_avis, d.vitesse_min_vide_avis);
        avis.push(d.debit_avis);
        avis = avis.filter(function (a) { return a && a !== 'Sans objet'; });
        if (avis.length === 0) return '';
        if (avis.some(function (a) { return a === 'Non Satisfaisant'; })) return 'Non Satisfaisant';
        if (avis.some(function (a) { return a === 'Impossible de se prononcer'; })) return 'Impossible de se prononcer';
        return 'Satisfaisant';
      } }
  ],

  torches_aspirantes: [
    { target: 'debit', fn: function (d) {
        // VBA : débit = Vcentre × 0.89 × π × (D/2 × 10^-3)² × 3600  (D en mm)
        var v = num(d.vitesse_centre), D = num(d.diametre_tube);
        if (isNaN(v) || isNaN(D)) return '';
        return v * 0.89 * Math.PI * Math.pow((D / 2) * 0.001, 2) * 3600;
      } },
    { target: 'ecart_pct', decimals: 1, fn: function (d) {
        var q = num(d.debit), ref = num(d.valeur_reference);
        if (isNaN(q) || isNaN(ref) || ref === 0) return '';
        return ((q - ref) / ref) * 100;
      } },
    { target: 'constat', fn: function (d) {
        // VBA : si pas de référence -> débit >= 80 ; sinon débit >= 0.8 × référence
        var q = num(d.debit);
        if (isNaN(q)) return 'Impossible de se prononcer';
        var refStr = String(d.valeur_reference || '').trim();
        if (refStr === '' || refStr === '/') {
          return q >= POURCENTAGE_REF * 100 ? 'Satisfaisant' : 'Non Satisfaisant';
        }
        var ref = num(refStr);
        if (isNaN(ref)) return 'Impossible de se prononcer';
        return q >= POURCENTAGE_REF * ref ? 'Satisfaisant' : 'Non Satisfaisant';
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
    { target: 'vt_surface', decimals: 4, fn: function (d) {
        return surfaceSection(d.vt_forme_conduit, d.vt_diametre_cote1, d.vt_cote2);
      } },
    { target: 'vt_masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.vt_temperature, d.vt_pression_statique);
      } },
    { target: 'vt_vitesse_moyenne_grille', decimals: 3, fn: function (d) {
        if (d.vt_vitesse_mode !== 'Grille de points') return '';
        var s = gridStats(d.vt_vitesse_grid, d.vt_vitesse_nb_axes, d.vt_vitesse_nb_points);
        if (!s || s.incomplete) return '';
        return s.moyenne;
      } },
    { target: 'vt_mesuree', decimals: 3, fn: function (d) {
        return (d.vt_vitesse_mode === 'Grille de points') ? (d.vt_vitesse_moyenne_grille || '') : (d.vt_vitesse_directe || '');
      } },
    { target: 'vt_debit', fn: function (d) {
        var v = debitFromSV(d.vt_surface, d.vt_mesuree);
        return isNaN(v) ? '' : v;
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
