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
// Débit minimal réglementaire des sanitaires (R.4212-6), calculé à partir du nombre de WC/Urinoirs,
// Douches et Lavabos — reproduit exactement la logique Cas_ValRetenue9 de Userform_SAN.bas (VBA d'origine).
function debitMinSanitaires(d) {
  if (d.chambre_erp_individuelle === 'Oui') return 15;

  var nbUrine = num(d.wc_urinoirs); if (isNaN(nbUrine)) nbUrine = 0;
  var nbDouche = num(d.douches); if (isNaN(nbDouche)) nbDouche = 0;
  var nbLavabos = num(d.lavabos); if (isNaN(nbLavabos)) nbLavabos = 0;

  if (nbUrine === 0 && nbDouche === 0 && nbLavabos < 2) return 0;
  if (nbUrine === 0 && nbDouche === 1 && nbLavabos < 2) return 45;
  if (nbUrine === 1 && nbDouche === 0 && nbLavabos < 2) return 30;
  if (nbUrine === 0 && nbDouche === 0 && nbLavabos >= 2) return 10 + 5 * nbLavabos;
  if (nbUrine === 0 && nbDouche === 1 && nbLavabos >= 2) return 45 + (10 + 5 * nbLavabos);
  if (nbUrine === 1 && nbDouche === 0 && nbLavabos >= 2) return 30 + (10 + 5 * nbLavabos);
  if (nbLavabos < 2) return 30 + 15 * (nbUrine + nbDouche);
  return 30 + 15 * (nbUrine + nbDouche) + (10 + 5 * nbLavabos);
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
// Génère les règles de calcul répétées pour un captage du Box préparation peinture
function buildBoxCaptageCalcRules(n) {
  var p = 'captage' + n;
  return [
    { target: p + '_surface', decimals: 4, fn: function (d) {
        return surfaceSection(d[p + '_forme_conduit'], d[p + '_diametre_cote1'], d[p + '_cote2']);
      } },
    { target: p + '_masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d[p + '_temperature'], d[p + '_pression_statique']);
      } },
    { target: p + '_vitesse_moyenne', decimals: 3, fn: function (d) {
        if (d[p + '_vitesse_mode'] === 'Grille de points') {
          var s = gridStats(d[p + '_vitesse_grid'], d[p + '_vitesse_nb_axes'], d[p + '_vitesse_nb_points']);
          return (!s || s.incomplete) ? '' : s.moyenne;
        }
        return d[p + '_vitesse_directe'] || '';
      } },
    { target: p + '_debit', fn: function (d) {
        var v = debitFromSV(d[p + '_surface'], d[p + '_vitesse_moyenne']);
        return isNaN(v) ? '' : v;
      } }
  ];
}

// Génère les règles de calcul d'une ligne de mesure "Torches aspirantes"
function buildTorcheRowCalcRules(i) {
  var p = 'torche' + i;
  return [
    { target: p + '_debit', fn: function (d) {
        // VBA : débit = Vcentre × 0,89 × π × (D/2 × 10⁻³)² × 3600  (D en mm)
        var v = num(d[p + '_vitesse_centre']), D = num(d[p + '_diametre_tube']);
        if (isNaN(v) || isNaN(D)) return '';
        return Math.round(v * 0.89 * Math.PI * Math.pow((D / 2) * 0.001, 2) * 3600);
      } },
    { target: p + '_ecart_pct', fn: function (d) {
        var q = num(d[p + '_debit']);
        if (isNaN(q)) return '';
        var refStr = String(d[p + '_valeur_reference'] || '').trim();
        var ref = (refStr === '' || refStr === '/' || refStr === '0' || refStr === '-') ? 100 : num(refStr);
        if (isNaN(ref) || ref === 0) return '';
        return Math.round(((q - ref) * 100) / ref);
      } },
    { target: p + '_constat', fn: function (d) {
        var q = num(d[p + '_debit']);
        if (isNaN(q)) return '';
        var refStr = String(d[p + '_valeur_reference'] || '').trim();
        var ref = (refStr === '' || refStr === '/' || refStr === '0' || refStr === '-') ? 100 : num(refStr);
        var constat;
        if (isNaN(ref)) {
          constat = 'Impossible de se prononcer';
        } else {
          constat = (q >= POURCENTAGE_REF * ref) ? 'Satisfaisant' : 'Non Satisfaisant';
        }
        // Rattrapage : si Non Satisfaisant sur le débit, vérifier la vitesse au point d'émission (distance L)
        if (constat === 'Non Satisfaisant') {
          var dist = num(d[p + '_distance_l']);
          if (!isNaN(dist) && dist !== 0) {
            var vape = (q / 3600) / (4 * Math.PI * Math.pow(dist / 1000, 2));
            if (vape > 0.25) constat = 'Satisfaisant';
          }
        }
        return constat;
      } },
    { target: p + '_vitesse_point_emission', decimals: 2, fn: function (d) {
        var q = num(d[p + '_debit']), dist = num(d[p + '_distance_l']);
        if (isNaN(q) || isNaN(dist) || dist === 0) return '';
        return (q / 3600) / (4 * Math.PI * Math.pow(dist / 1000, 2));
      } },
    { target: p + '_valeur_preconisee', fn: function (d) {
        var dist = num(d[p + '_distance_l']);
        return isNaN(dist) || dist === 0 ? '' : 0.25;
      } }
  ];
}

// Génère les règles de calcul d'une ligne "grille" (Locaux de charge)
// Priorité à la mesure directe au cône (m³/h) ; sinon surface × vitesse × 3600
function buildLocalChargeGrilleCalcRules(i) {
  var p = 'grille' + i;
  return [
    { target: p + '_debit_obtenu', fn: function (d) {
        var cone = num(d[p + '_debit_cone']);
        if (!isNaN(cone)) return Math.round(cone);
        var v = num(d[p + '_valeur_mesuree']);
        if (isNaN(v)) return '';
        var l = num(d[p + '_largeur']), L = num(d[p + '_longueur']), diam = num(d[p + '_diametre']);
        var surface;
        if (!isNaN(l) && !isNaN(L)) surface = (l / 100) * (L / 100);
        else if (!isNaN(diam)) surface = Math.PI * Math.pow(diam / 200, 2);
        else return '';
        return Math.round(surface * v * 3600);
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
        return debitMinSanitaires(d);
      } },
    { target: 'type_ventilation', fn: function (d) {
        var v = num(d.debit_mesure);
        return (!isNaN(v) && v > 0) ? 'Mécanique' : 'Absence de ventilation';
      } },
    { target: 'avis', fn: function (d) {
        if (d.debit_mesure === undefined || d.debit_mesure === null || d.debit_mesure === '') return '';
        var ref = num(d.debit_min_reglementaire);
        var nbLavabos = num(d.lavabos) || 0;
        if (nbLavabos === 1 && ref === 0) return 'Satisfaisant';
        if (ref === 0) return 'Impossible de se prononcer';
        var v = num(d.debit_mesure);
        if (isNaN(v) || isNaN(ref)) return 'Impossible de se prononcer';
        return v >= ref ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  erp: [
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
    { target: 'crit_surface_35', fn: function (d) {
        var s = num(d.surface);
        if (isNaN(s)) return '';
        return s < 35 ? 'Oui' : 'Non';
      } },
    { target: 'crit_ratio_20', fn: function (d) {
        var s = num(d.surface), et = num(d.surface_etablissement);
        if (isNaN(s) || isNaN(et) || et === 0) return '';
        return s <= 0.20 * et ? 'Oui' : 'Non';
      } },
    { target: 'taux_renouvellement', fn: function (d) {
        var q = num(d.debit_extraction), vol = num(d.volume);
        if (isNaN(q) || isNaN(vol) || vol === 0) return '';
        return q / vol;
      } },
    { target: 'crit_renouvellement', fn: function (d) {
        var t = num(d.taux_renouvellement);
        if (isNaN(t)) return '';
        return t >= 10 ? 'Oui' : 'Non';
      } },
    { target: 'avis_csp', fn: function (d) {
        var c1 = d.crit_surface_35, c2 = d.crit_ratio_20, c3 = d.crit_renouvellement;
        if (!c1 || !c2 || !c3) return 'Impossible de se prononcer';
        return (c1 === 'Oui' && c2 === 'Oui' && c3 === 'Oui') ? 'Conforme' : 'Non Conforme';
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

  cta: [
    { target: 'neuf_surface', decimals: 4, fn: function (d) {
        return surfaceSection(d.neuf_forme, d.neuf_diametre_cote1, d.neuf_cote2);
      } },
    { target: 'neuf_masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.neuf_temperature_conduit, d.neuf_pression_statique);
      } },
    { target: 'neuf_debit', fn: function (d) {
        var v = debitFromSV(d.neuf_surface, d.neuf_vitesse);
        return isNaN(v) ? '' : v;
      } },
    { target: 'souf_surface', decimals: 4, fn: function (d) {
        return surfaceSection(d.souf_forme, d.souf_diametre_cote1, d.souf_cote2);
      } },
    { target: 'souf_masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.souf_temperature_conduit, d.souf_pression_statique);
      } },
    { target: 'souf_debit', fn: function (d) {
        var v = debitFromSV(d.souf_surface, d.souf_vitesse);
        return isNaN(v) ? '' : v;
      } },
    { target: 'rep_surface', decimals: 4, fn: function (d) {
        if (d.rep_active !== 'Oui') return '';
        return surfaceSection(d.rep_forme, d.rep_diametre_cote1, d.rep_cote2);
      } },
    { target: 'rep_masse_volumique', decimals: 3, fn: function (d) {
        if (d.rep_active !== 'Oui') return '';
        return masseVolumique(d.rep_temperature_conduit, d.rep_pression_statique);
      } },
    { target: 'rep_debit', fn: function (d) {
        if (d.rep_active !== 'Oui') return '';
        var v = debitFromSV(d.rep_surface, d.rep_vitesse);
        return isNaN(v) ? '' : v;
      } }
    // 'avis' est une sélection manuelle (Satisfaisant/Non Satisfaisant/Impossible de se prononcer) :
    // dans le VBA d'origine (UserForm_CTA), l'avis global est un bouton à 3 états choisi par le technicien,
    // pas une valeur calculée — les 3 réseaux (Neuf/Soufflé/Repris) n'ont pas toujours de valeur de
    // référence constructeur disponible (cf. rapport exemple : "Impossible de se prononcer globalement,
    // en l'absence de valeur de référence constructeur pour le débit d'air neuf").
  ],

  menuiserie_bis: [
    { target: 'surface_m2', decimals: 4, fn: function (d) {
        return surfaceSection(d.forme_conduit, d.diametre_cote1, d.cote2);
      } },
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'vitesse_moyenne', decimals: 3, fn: function (d) {
        if (d.vitesse_mode === 'Grille de points') {
          var s = gridStats(d.vitesse_grid, d.vitesse_nb_axes, d.vitesse_nb_points);
          return (!s || s.incomplete) ? '' : s.moyenne;
        }
        var v = num(d.vitesse_directe);
        return isNaN(v) ? '' : v;
      } },
    { target: 'debit', fn: function (d) {
        var v = debitFromSV(d.surface_m2, d.vitesse_moyenne);
        return isNaN(v) ? '' : Math.round(v);
      } },
    // Valeur recommandée par l'INRS (ED 750/ED 695) pour le transport pneumatique des poussières de bois : 20 m/s
    { target: 'vitesse_inrs_ed750', fn: function () { return 20; } },
    { target: 'vitesse_avis', fn: function (d) {
        var v = num(d.vitesse_moyenne), ref = num(d.vitesse_reference);
        if (isNaN(v) || isNaN(ref)) return 'Impossible de se prononcer';
        return v >= ref * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'debit_reference', fn: function (d) {
        var r = MACHINE_BOIS_DEBIT_REF[d.type_machine];
        return (r === undefined || r === null) ? '' : r;
      } },
    { target: 'debit_avis', fn: function (d) {
        var v = num(d.debit), ref = num(d.debit_reference);
        if (isNaN(v) || isNaN(ref)) return 'Impossible de se prononcer';
        return v >= ref * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'conclusion_avis', fn: function (d) {
        // Conforme si vitesse ET débit satisfaisants par rapport aux préconisations INRS
        // (vitesse_avis / debit_avis calculés lors des passes précédentes)
        var va = d.vitesse_avis, db = d.debit_avis;
        if (va === 'Impossible de se prononcer' || db === 'Impossible de se prononcer' || !va || !db) {
          return 'Impossible de se prononcer';
        }
        return (va === 'Satisfaisant' && db === 'Satisfaisant') ? 'Satisfaisant' : 'Non Satisfaisant';
      } }
  ],

  box_peinture: []
    .concat(buildBoxCaptageCalcRules(1))
    .concat(buildBoxCaptageCalcRules(2))
    .concat(buildBoxCaptageCalcRules(3))
    .concat(buildBoxCaptageCalcRules(4))
    .concat([
    { target: 'debit_extraction_box', fn: function (d) {
        var n = parseInt(d.nombre_captage, 10) || 0;
        var total = 0, any = false;
        for (var i = 1; i <= n; i++) {
          var v = num(d['captage' + i + '_debit']);
          if (!isNaN(v)) { total += v; any = true; }
        }
        return any ? Math.round(total * 10) / 10 : '';
      } },
    { target: 'volume_par_heure', decimals: 1, fn: function (d) {
        var q = num(d.debit_extraction_box), vol = num(d.volume_local);
        return (isNaN(q) || isNaN(vol) || vol === 0) ? '' : q / vol;
      } },
    { target: 'debit_minimal_50vh', fn: function (d) {
        // Formule VBA : 50 × volume du local
        var vol = num(d.volume_local);
        return isNaN(vol) ? '' : 50 * vol;
      } },
    { target: 'conclusion_renouvellement', fn: function (d) {
        // VBA : volume/heure > 50 -> Satisfaisant ; sinon Non Satisfaisant ; sinon Impossible
        var vph = num(d.volume_par_heure);
        if (isNaN(vph)) return 'Impossible de se prononcer';
        return vph > 50 ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'avis', fn: function (d) {
        // VBA (Caller_Avis_Conclusion) : priorité Impossible > Non Satisfaisant > Satisfaisant ;
        // un champ tri-état non répondu compte comme "Impossible"
        var vals = [d.ventilation_naturelle, d.asservissement, d.type_ventilation, d.conclusion_renouvellement];
        var presenceSatisfaisant = false, presenceNonSatisfaisant = false, presenceImpossible = false;
        vals.forEach(function (v) {
          if (v === 'Satisfaisant') presenceSatisfaisant = true;
          else if (v === 'Non Satisfaisant') presenceNonSatisfaisant = true;
          else presenceImpossible = true;
        });
        if (presenceImpossible) return 'Impossible de se prononcer';
        if (presenceNonSatisfaisant) return 'Non Satisfaisant';
        return 'Satisfaisant';
      } }
  ]),

  locaux_charge: []
    .concat(buildLocalChargeGrilleCalcRules(1)).concat(buildLocalChargeGrilleCalcRules(2)).concat(buildLocalChargeGrilleCalcRules(3))
    .concat(buildLocalChargeGrilleCalcRules(4)).concat(buildLocalChargeGrilleCalcRules(5)).concat(buildLocalChargeGrilleCalcRules(6))
    .concat(buildLocalChargeGrilleCalcRules(7)).concat(buildLocalChargeGrilleCalcRules(8)).concat(buildLocalChargeGrilleCalcRules(9))
    .concat(buildLocalChargeGrilleCalcRules(10))
    .concat([
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
    { target: 'debit_mesure_local', fn: function (d) {
        var total = 0, any = false;
        for (var i = 1; i <= 10; i++) {
          var v = num(d['grille' + i + '_debit_obtenu']);
          if (!isNaN(v)) { total += v; any = true; }
        }
        return any ? Math.round(total) : '';
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
  ]),

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
    { target: 'debit_so', fn: function (d) {
        // VBA : Qc = So × V × 3600 — pertinent pour sous couvercle / enveloppante / tunnel
        var so = num(d.surface_ouvertures), v = num(d.vitesse);
        return (isNaN(so) || isNaN(v)) ? '' : so * v * 3600;
      } },
    { target: 'debit_min_inrs', fn: function (d) {
        // VBA : pour sous couvercle/enveloppante/tunnel -> max(So×V×3600, Qr(ou Qc)/10) ; sinon Qr/10 seul
        var qr10 = num(d.debit_qr10);
        var typesAvecSo = ['Aspiration sous couvercle', 'Aspiration enveloppante', 'Aspiration tunnel'];
        if (typesAvecSo.indexOf(d.aspiration_type) !== -1) {
          var so = num(d.debit_so);
          if (isNaN(so) && isNaN(qr10)) return '';
          if (isNaN(so)) return qr10;
          if (isNaN(qr10)) return so;
          return Math.max(so, qr10);
        }
        return isNaN(qr10) ? '' : qr10;
      } },
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'surface_totale_fentes', decimals: 4, fn: function (d) {
        var n = num(d.nb_fentes), L = num(d.longueur_fente), l = num(d.largeur_fente);
        return (isNaN(n) || isNaN(L) || isNaN(l)) ? '' : n * L * l;
      } },
    { target: 'debit_mesure_fentes', fn: function (d) {
        var s = num(d.surface_totale_fentes), v = num(d.vitesse_fentes);
        return (isNaN(s) || isNaN(v)) ? '' : s * v * 3600;
      } },
    { target: 'avis_fentes', fn: function (d) {
        var mes = num(d.debit_mesure_fentes);
        if (isNaN(mes)) return 'Impossible de se prononcer';
        var refStr = String(d.debit_reference_fentes || '').trim();
        if (refStr !== '' && refStr !== '/') {
          var ref = num(refStr);
          if (isNaN(ref)) return 'Impossible de se prononcer';
          return mes >= ref * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
        }
        var inrs = num(d.debit_min_inrs);
        if (isNaN(inrs)) return 'Impossible de se prononcer';
        return mes >= inrs ? 'Satisfaisant' : 'Non Satisfaisant';
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
    { target: 'vt_inrs', fn: function (d) {
        return HOTTE_POLLUANTS[d.vt_type_polluant] || '';
      } },
    { target: 'avis_vpe', fn: function (d) {
        var mesures = Array.isArray(d.mesures_choisies) ? d.mesures_choisies : [];
        if (mesures.indexOf("Vitesse au point d'émission") === -1) return '';
        return avisVitesse(d.vpe_mesuree, d.vpe_reference, d.vpe_inrs);
      } },
    { target: 'avis_vt', fn: function (d) {
        var mesures = Array.isArray(d.mesures_choisies) ? d.mesures_choisies : [];
        if (mesures.indexOf('Vitesse de transport') === -1) return '';
        return avisTransport(d.vt_mesuree, d.vt_reference, d.vt_inrs);
      } },
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'avis', fn: function (d) {
        var mesures = Array.isArray(d.mesures_choisies) ? d.mesures_choisies : [];
        var avis = [];
        if (mesures.indexOf("Vitesse au point d'émission") !== -1) avis.push(d.avis_vpe);
        if (mesures.indexOf('Vitesse de transport') !== -1 && d.avis_vt !== '/') avis.push(d.avis_vt);
        avis = avis.filter(function (a) { return a; });
        if (avis.length === 0) return '';
        if (avis.some(function (a) { return a === 'Impossible de se prononcer'; })) return 'Impossible de se prononcer';
        if (avis.some(function (a) { return a === 'Non Satisfaisant'; })) return 'Non Satisfaisant';
        return 'Satisfaisant';
      } }
  ],

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
    { target: 'debit_calcule', fn: function (d) {
        // VBA : débit = surface bouche × vitesse moyenne × 3600
        var s = num(d.surface_bouche), v = num(d.vitesse_moyenne);
        return (isNaN(s) || isNaN(v)) ? '' : s * v * 3600;
      } },
    { target: 'distance_max_captage', decimals: 0, fn: function (d) {
        // Formule INRS de captage ponctuel : Vc = Q / (10x² + A)  =>  x = √(Q/(10·Vc) − A/10)
        // (Q en m³/s, A en m², x en m — converti en cm en sortie)
        var q = num(d.debit_calcule), vc = num(d.vitesse_captage), s = num(d.surface_bouche);
        if (isNaN(q) || isNaN(vc) || isNaN(s) || vc === 0) return '';
        var qms = q / 3600;
        var inner = qms / (10 * vc) - s / 10;
        if (inner < 0) return 0;
        return Math.sqrt(inner) * 100;
      } },
    { target: 'conclusion_distance', fn: function (d) {
        var dmax = num(d.distance_max_captage), dutil = num(d.distance_utilisation);
        if (isNaN(dmax) || isNaN(dutil)) return '';
        return dutil <= dmax ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'evolution_pct', decimals: 1, fn: function (d) {
        var prev = num(d.debit_precedent), cur = num(d.debit_calcule);
        return (isNaN(prev) || isNaN(cur) || prev === 0) ? '' : ((cur - prev) / prev) * 100;
      } }
  ],

  sorbonnes: [
    { target: 'v90_avis_reference', fn: function (d) {
        return avisVitesse(d.v90_mesuree, d.v90_reference, d.valeur_norme);
      } },
    { target: 'v90_avis_norme', fn: function (d) {
        var mes = num(d.v90_mesuree), norme = num(d.valeur_norme);
        if (isNaN(mes) || isNaN(norme)) return '';
        return mes >= norme ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'v140_avis_reference', fn: function (d) {
        return avisVitesse(d.v140_mesuree, d.v140_reference, d.valeur_norme);
      } },
    { target: 'v140_avis_norme', fn: function (d) {
        var mes = num(d.v140_mesuree), norme = num(d.valeur_norme);
        if (isNaN(mes) || isNaN(norme)) return '';
        return mes >= norme ? 'Satisfaisant' : 'Non Satisfaisant';
      } },
    { target: 'conclusion', fn: function (d) {
        var avis = [d.v90_avis_reference, d.v140_avis_reference].filter(function (a) { return a; });
        if (avis.length === 0) return '';
        if (avis.some(function (a) { return a === 'Impossible de se prononcer'; })) return 'Impossible de se prononcer';
        if (avis.some(function (a) { return a === 'Non Satisfaisant'; })) return 'Non Satisfaisant';
        return 'Satisfaisant';
      } }
  ],

  cabines_peinture: [
    { target: 'masse_volumique', decimals: 3, fn: function (d) {
        return masseVolumique(d.temperature_conduit, d.pression_statique);
      } },
    { target: 'v1_avis', fn: function (d) {
        return avisVitesse(d.v1_mesuree, d.v1_reference, null);
      } },
    { target: 'v2_avis', fn: function (d) {
        if (d.v2_active !== 'Oui') return '';
        return avisVitesse(d.v2_mesuree, d.v2_reference, null);
      } },
    { target: 'conclusion', fn: function (d) {
        var avis = [d.v1_avis];
        if (d.v2_active === 'Oui') avis.push(d.v2_avis);
        avis = avis.filter(function (a) { return a; });
        if (avis.length === 0) return '';
        if (avis.some(function (a) { return a === 'Impossible de se prononcer'; })) return 'Impossible de se prononcer';
        if (avis.some(function (a) { return a === 'Non Satisfaisant'; })) return 'Non Satisfaisant';
        return 'Satisfaisant';
      } }
  ],

  torches_aspirantes: []
    .concat(buildTorcheRowCalcRules(1)).concat(buildTorcheRowCalcRules(2)).concat(buildTorcheRowCalcRules(3))
    .concat(buildTorcheRowCalcRules(4)).concat(buildTorcheRowCalcRules(5)).concat(buildTorcheRowCalcRules(6))
    .concat(buildTorcheRowCalcRules(7)).concat(buildTorcheRowCalcRules(8)).concat(buildTorcheRowCalcRules(9))
    .concat(buildTorcheRowCalcRules(10))
    .concat([
    { target: 'total_debit', fn: function (d) {
        var total = 0, any = false;
        for (var i = 1; i <= 10; i++) {
          var v = num(d['torche' + i + '_debit']);
          if (!isNaN(v)) { total += v; any = true; }
        }
        return any ? Math.round(total) : '';
      } }
  ]),

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
