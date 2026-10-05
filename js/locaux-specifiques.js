// locaux-specifiques.js - Deux types d'installation absents du Rapso (chantier du 2026-10-03)
//
// 1. « Local à pollution spécifique — extraction / air neuf » (local_specifique) : bilan à l'échelle
//    du LOCAL (laboratoire, atelier de soudure...), là où le Rapso ne raisonne qu'équipement par
//    équipement. Critères sourcés :
//    - Code du travail R4222-11 : dans un local à pollution spécifique, le débit d'air neuf ne peut
//      être inférieur aux valeurs de l'article R4222-6 (25/30/45/60 m³/h par occupant selon le local),
//      en comptant les occupants des locaux à pollution non spécifique d'où provient l'air ;
//    - R4222-12 : captage à la source, la ventilation générale n'évacuant que le résiduel ;
//    - arrêté du 8 octobre 1987, art. 4 : contrôle annuel du débit global d'air extrait.
//    Le technicien choisit de contrôler l'extraction, l'air neuf ou les deux (2026-10-05) ; la partie
//    compensation (R4222-13, sens de l'air R4212-5) a été retirée à sa demande.
// 2. « Recyclage de l'air » (recyclage) : contrôle semestriel des installations qui recyclent l'air
//    d'un local à pollution spécifique. Critères sourcés :
//    - arrêté du 8 octobre 1987, art. 4.2 b : au minimum tous les six mois, concentration en poussières
//      (ou autres polluants) dans les gaines de recyclage ou à leur sortie, et contrôle de tous les
//      systèmes de surveillance ;
//    - R4222-14 : recyclage seulement si l'air est efficacement épuré, vers d'autres locaux seulement
//      si la pollution y est de même nature ;
//    - R4222-9 : interdiction d'envoyer l'air d'un local à pollution spécifique, même épuré, dans un
//      local à pollution non spécifique ;
//    - R4222-16 : un système de surveillance des dispositifs d'épuration est obligatoire ;
//    - R4222-17 : les conditions du recyclage sont portées à la connaissance du médecin du travail et
//      du CSE ;
//    - R4222-10 (décret 2021-1763, en vigueur au 1er juillet 2023) : poussières réputées sans effet
//      spécifique, 4 mg/m³ (fraction inhalable) et 0,9 mg/m³ (fraction alvéolaire) en moyenne sur 8 h.
//
// Choix de méthode (pas de règle imposée) : l'avis global d'une fiche retient d'abord un critère non
// satisfaisant, puis un critère indéterminé (une non-conformité connue n'est jamais masquée) ; une
// mesure de concentration n'est comparée au seuil R4222-10 que si elle est représentative de 8 h.
//
// Le module s'enregistre auprès de l'appli (schéma, étapes, calculs, rapport, synthèse, valeurs de
// référence) : tout ce qui concerne ces deux types est ici.

var AVIS_SO_REF = 'Sans Objet - Absence de Val. de Réf.';
var TYPES_LOCAL_R4222_6 = ['Bureaux', 'Locaux Sans Travail Physique', 'Locaux de Restauration, Vente ou Réunion',
  'Ateliers ou Locaux avec Travail Physique Léger', 'Autres ateliers et locaux'];
var R4222_10_INHALABLE = 4, R4222_10_ALVEOLAIRE = 0.9;

// Pire avis : Non Satisfaisant > Impossible > Satisfaisant ; « Sans objet » et vide ignorés
function worstAvis(list) {
  var vals = list.filter(function (v) { return v && v.indexOf('Sans Objet') !== 0; });
  if (!vals.length) return 'Impossible de se prononcer';
  if (vals.indexOf('Non Satisfaisant') !== -1) return 'Non Satisfaisant';
  if (vals.indexOf('Impossible de se prononcer') !== -1) return 'Impossible de se prononcer';
  return 'Satisfaisant';
}

function avisVersReference(mesure, ref) {
  var r = String(ref || '').trim();
  if (!r || r === '/' || r === '-') return AVIS_SO_REF;
  var m = num(mesure), rv = num(r);
  if (isNaN(m) || isNaN(rv)) return 'Impossible de se prononcer';
  return m >= rv * POURCENTAGE_REF ? 'Satisfaisant' : 'Non Satisfaisant';
}

function debitMinR4222_6(d) {
  var t = LOCAL_LPNS[d.type_local];
  var occ = num(d.effectif);
  if (!t || !t.debit || isNaN(occ)) return '';
  var autres = num(d.occupants_autres_locaux);
  return t.debit * (occ + (isNaN(autres) ? 0 : autres));
}

function avisAirNeuf(d) {
  if (d.mode_air_neuf === 'Entrées d’air naturelles (non mesurables)') return 'Impossible de se prononcer';
  var q = num(d.debit_air_neuf), mini = num(d.debit_min_air_neuf);
  if (isNaN(q) || isNaN(mini)) return 'Impossible de se prononcer';
  return q >= mini ? 'Satisfaisant' : 'Non Satisfaisant';
}

function addSixMonths(dateFr) {
  var d = (typeof parseDateFr === 'function') ? parseDateFr(dateFr) : null;
  if (!d) return '';
  d.setMonth(d.getMonth() + 6);
  var p = function (n) { return String(n).padStart(2, '0'); };
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
}

// ————————————————————————————————————————————
// Schéma
// ————————————————————————————————————————————

// Retour terrain du 2026-10-05 : le technicien choisit avant de mesurer ce qu'il contrôle (l'extraction,
// l'air neuf ou les deux) ; la partie « compensation » (taux, constat R4222-13, sens de l'air R4212-5,
// recyclage) est retirée, jugée trop poussée pour un contrôle aux bouches du local.
var MESURES_LS = ['Extraction et air neuf', 'Extraction seule', 'Air neuf seul'];
// '' : fiche antérieure à ce choix, les deux parties restent affichées et évaluées
var LS_AVEC_EXTRACTION = ['', MESURES_LS[0], MESURES_LS[1]];
var LS_AVEC_AIR_NEUF = ['', MESURES_LS[0], MESURES_LS[2]];
var LS_SI_EXTRACTION = { key: 'mesures_realisees', in: LS_AVEC_EXTRACTION };
var LS_SI_AIR_NEUF = { key: 'mesures_realisees', in: LS_AVEC_AIR_NEUF };
function lsAvecExtraction(d) { return LS_AVEC_EXTRACTION.indexOf(d.mesures_realisees || '') !== -1; }
function lsAvecAirNeuf(d) { return LS_AVEC_AIR_NEUF.indexOf(d.mesures_realisees || '') !== -1; }

var TYPE_LOCAL_SPECIFIQUE = {
  id: 'local_specifique', label: 'Local à pollution spécifique (extraction / air neuf)', icon: 'beaker', implemented: true,
  fields: [
    { key: 'batiment', label: 'Bâtiment', type: 'text' },
    { key: 'reference_local', label: 'Local (laboratoire, atelier…)', type: 'text' },
    { key: 'activite', label: 'Activité', type: 'text' },
    { key: 'polluant', label: 'Polluant(s) représentatif(s)', type: 'text' },
    { key: 'date_controle', label: 'Date de Contrôle', type: 'text' },
    { key: 'photo', label: 'Photo', type: 'photo' },
    { key: 'mesures_realisees', label: 'Mesures réalisées dans ce local', type: 'select', options: MESURES_LS },

    { key: 'section_occupation', label: 'Occupation (Code du travail, R4222-6 et R4222-11)', type: 'section', showIf: LS_SI_AIR_NEUF },
    { key: 'type_local', label: 'Désignation du local (R4222-6)', type: 'select', options: TYPES_LOCAL_R4222_6, showIf: LS_SI_AIR_NEUF },
    { key: 'effectif', label: 'Effectif présent dans le local', type: 'number', showIf: LS_SI_AIR_NEUF },
    { key: 'occupants_autres_locaux', label: 'Occupants des locaux à pollution non spécifique d’où provient l’air (si c’est le cas)', type: 'number', optional: true, showIf: LS_SI_AIR_NEUF },

    { key: 'section_extraction', label: 'Extraction (arrêté du 8 octobre 1987, art. 4)', type: 'section', showIf: LS_SI_EXTRACTION },
    { key: 'debit_captages', label: 'Débit extrait par les captages localisés (m³/h)', type: 'number', optional: true, showIf: LS_SI_EXTRACTION },
    { key: 'debit_extraction_generale', label: 'Débit de l’extraction générale, bouches du local (m³/h)', type: 'number', optional: true, showIf: LS_SI_EXTRACTION },
    { key: 'debit_global_extrait', label: 'Débit global d’air extrait (m³/h)', type: 'computed', showIf: LS_SI_EXTRACTION },
    { key: 'valeur_reference_extraction', label: 'Valeur de référence du débit global (m³/h, « / » si aucune)', type: 'text', showIf: LS_SI_EXTRACTION },
    { key: 'avis_extraction', label: 'Avis débit global extrait / valeur de référence', type: 'computed', showIf: LS_SI_EXTRACTION },
    { key: 'volume', label: 'Volume du local (m³)', type: 'number', optional: true, showIf: LS_SI_EXTRACTION },
    { key: 'taux_renouvellement', label: 'Taux de renouvellement (vol/h)', type: 'computed', showIf: LS_SI_EXTRACTION },
    { key: 'taux_recommande', label: 'Taux de renouvellement recommandé (vol/h), si vous en retenez un', type: 'number', optional: true, showIf: LS_SI_EXTRACTION },
    { key: 'referentiel_taux', label: 'Source du taux recommandé (guide INRS, dossier du client, installateur…)', type: 'text', optional: true, showIf: LS_SI_EXTRACTION },
    { key: 'avis_taux', label: 'Avis taux de renouvellement / taux recommandé', type: 'computed', showIf: LS_SI_EXTRACTION },

    { key: 'section_air_neuf', label: 'Air neuf', type: 'section', showIf: LS_SI_AIR_NEUF },
    { key: 'mode_air_neuf', label: 'Introduction de l’air neuf', type: 'select', showIf: LS_SI_AIR_NEUF,
      options: ['Soufflage mécanique (CTA, centrale)', 'Bouches / grilles mesurées', 'Entrées d’air naturelles (non mesurables)'] },
    { key: 'debit_air_neuf', label: 'Débit d’air neuf introduit (m³/h)', type: 'number',
      showIf: { and: [LS_SI_AIR_NEUF, { key: 'mode_air_neuf', in: ['Soufflage mécanique (CTA, centrale)', 'Bouches / grilles mesurées'] }] } },
    { key: 'debit_min_air_neuf', label: 'Débit minimal d’air neuf (R4222-6, m³/h)', type: 'computed', showIf: LS_SI_AIR_NEUF },
    { key: 'avis_air_neuf', label: 'Avis air neuf / minimum réglementaire', type: 'computed', showIf: LS_SI_AIR_NEUF },

    { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
    { key: 'avis', label: 'Avis par rapport à la réglementation', type: 'computed' },
    { key: 'observation', label: 'Observation', type: 'textarea' }
  ]
};

var TYPE_RECYCLAGE = {
  id: 'recyclage', label: 'Recyclage de l’air (contrôle semestriel)', icon: 'merge', implemented: true,
  fields: [
    { key: 'batiment', label: 'Bâtiment', type: 'text' },
    { key: 'localisation', label: 'Atelier / local desservi', type: 'text' },
    { key: 'reference_equipement', label: 'Installation de recyclage (dépoussiéreur, épurateur…)', type: 'text' },
    { key: 'date_controle', label: 'Date de Contrôle', type: 'text' },
    { key: 'photo', label: 'Photo', type: 'photo' },

    { key: 'section_polluant', label: 'Polluant et recyclage (R4222-14)', type: 'section' },
    { key: 'nature_polluant', label: 'Nature du polluant', type: 'select',
      options: ['Poussières sans effet spécifique', 'Poussières de bois', 'Autres poussières à effet spécifique', 'Autres polluants (gaz, vapeurs)'] },
    { key: 'polluant_precision', label: 'Précision (substance, procédé)', type: 'text', optional: true },
    { key: 'destination', label: 'L’air épuré est renvoyé', type: 'select', options: ['Dans le même local', 'Vers d’autres locaux', 'Vers un local à pollution non spécifique'] },
    { key: 'meme_nature', label: 'Pollution de même nature dans tous les locaux concernés', type: 'toggle', options: ['Oui', 'Non'],
      showIf: { key: 'destination', equals: 'Vers d’autres locaux' } },
    { key: 'avis_destination', label: 'Avis destination de l’air recyclé', type: 'computed' },

    { key: 'section_epuration', label: 'Épuration et surveillance', type: 'section' },
    { key: 'type_epurateur', label: 'Système d’épuration', type: 'select',
      options: ['Filtre à manches', 'Filtre à cartouches', 'Filtre à poches / plans', 'Électrofiltre', 'Cyclone', 'Autre'] },
    { key: 'efficacite_constructeur', label: 'Efficacité annoncée par le constructeur', type: 'text', optional: true },
    { key: 'perte_charge', label: 'Perte de charge relevée (Pa)', type: 'number', optional: true },
    { key: 'etat_epurateur', label: 'État du système d’épuration', type: 'select', options: ['Bon état', 'Colmaté / encrassé', 'Fuite ou défaut constaté'] },
    { key: 'systemes_surveillance', label: 'Systèmes de surveillance en place', type: 'checkbox-group',
      options: ['Pressostat / alarme de colmatage', 'Mesure de concentration en continu', 'Contrôle visuel du rejet', 'Aucun'] },
    { key: 'surveillance_etat', label: 'Contrôle des systèmes de surveillance (obligatoires, R4222-16)', type: 'select',
      options: ['Systèmes contrôlés et fonctionnels', 'Système défaillant', 'Aucun système de surveillance'] },
    { key: 'information_medecin_cse', label: 'Conditions du recyclage portées à la connaissance du médecin du travail et du CSE (R4222-17)', type: 'select',
      options: ['Oui', 'Non', 'Non vérifié'] },

    { key: 'section_debits', label: 'Débits et air neuf (R4222-11)', type: 'section' },
    { key: 'debit_recycle', label: 'Débit d’air recyclé (m³/h)', type: 'number' },
    { key: 'type_local', label: 'Désignation du local (R4222-6)', type: 'select', options: TYPES_LOCAL_R4222_6 },
    { key: 'effectif', label: 'Effectif présent dans le local', type: 'number' },
    { key: 'mode_air_neuf', label: 'Introduction de l’air neuf', type: 'select',
      options: ['Soufflage mécanique (CTA, centrale)', 'Bouches / grilles mesurées', 'Entrées d’air naturelles (non mesurables)'] },
    { key: 'debit_air_neuf', label: 'Débit d’air neuf introduit (m³/h)', type: 'number',
      showIf: { key: 'mode_air_neuf', in: ['Soufflage mécanique (CTA, centrale)', 'Bouches / grilles mesurées'] } },
    { key: 'debit_min_air_neuf', label: 'Débit minimal d’air neuf (R4222-6, m³/h)', type: 'computed' },
    { key: 'avis_air_neuf', label: 'Avis air neuf / minimum réglementaire', type: 'computed' },

    { key: 'section_gaine', label: 'Concentration dans l’air recyclé (art. 4, contrôle semestriel)', type: 'section' },
    { key: 'conc_gaine', label: 'Concentration mesurée dans la gaine de recyclage ou à sa sortie (mg/m³)', type: 'number' },
    { key: 'fraction_gaine', label: 'Fraction mesurée', type: 'select', options: ['Fraction inhalable', 'Fraction alvéolaire', 'Autre'] },
    { key: 'methode_mesure', label: 'Méthode de mesure', type: 'select', options: ['Prélèvement et analyse gravimétrique', 'Appareil à lecture directe'] },
    { key: 'ref_gaine', label: 'Valeur de référence (dossier de valeurs de référence, mg/m³, « / » si aucune)', type: 'text' },
    { key: 'avis_gaine', label: 'Avis concentration / valeur de référence', type: 'computed' },

    { key: 'section_atmosphere', label: 'Atmosphère du local (R4222-10, R4222-14)', type: 'section' },
    { key: 'conc_inhalable', label: 'Concentration en poussières, fraction inhalable (mg/m³)', type: 'number', optional: true },
    { key: 'conc_alveolaire', label: 'Concentration en poussières, fraction alvéolaire (mg/m³)', type: 'number', optional: true },
    { key: 'mesure_8h', label: 'Mesure représentative d’une moyenne sur 8 heures', type: 'toggle', options: ['Oui', 'Non'] },
    { key: 'vlep', label: 'VLEP 8 h du polluant (mg/m³), si poussières ou polluant à effet spécifique', type: 'number', optional: true,
      showIf: { key: 'nature_polluant', in: ['Poussières de bois', 'Autres poussières à effet spécifique', 'Autres polluants (gaz, vapeurs)'] } },
    { key: 'avis_atmosphere', label: 'Avis atmosphère du local', type: 'computed' },

    { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
    { key: 'avis', label: 'Avis par rapport à la réglementation', type: 'computed' },
    { key: 'prochain_controle', label: 'Prochain contrôle semestriel avant le', type: 'computed' },
    { key: 'observation', label: 'Observation', type: 'textarea' }
  ]
};

// ————————————————————————————————————————————
// Calculs
// ————————————————————————————————————————————

// Une partie non mesurée (choix « Extraction seule » / « Air neuf seul ») n'a ni résultat ni avis
var CALC_LOCAL_SPECIFIQUE = [
  { target: 'debit_global_extrait', decimals: 0, fn: function (d) {
      if (!lsAvecExtraction(d)) return '';
      var a = num(d.debit_captages), b = num(d.debit_extraction_generale);
      if (isNaN(a) && isNaN(b)) return '';
      return (isNaN(a) ? 0 : a) + (isNaN(b) ? 0 : b);
    } },
  { target: 'avis_extraction', fn: function (d) { return lsAvecExtraction(d) ? avisVersReference(d.debit_global_extrait, d.valeur_reference_extraction) : ''; } },
  { target: 'taux_renouvellement', decimals: 1, fn: function (d) {
      var e = num(d.debit_global_extrait), v = num(d.volume);
      return (!lsAvecExtraction(d) || isNaN(e) || isNaN(v) || v === 0) ? '' : e / v;
    } },
  // Aucun taux réglementaire pour un local à pollution spécifique : il dépend du polluant et du procédé.
  // Le technicien saisit celui qu'il retient (ex. 10 vol/h pour un laboratoire) et sa source ; sans
  // taux recommandé, le taux reste informatif (2026-10-05).
  { target: 'avis_taux', fn: function (d) {
      var rec = num(d.taux_recommande);
      if (!lsAvecExtraction(d) || isNaN(rec)) return '';
      var t = num(d.taux_renouvellement);
      if (isNaN(t)) return 'Impossible de se prononcer';
      return t >= rec ? 'Satisfaisant' : 'Non Satisfaisant';
    } },
  { target: 'debit_min_air_neuf', decimals: 0, fn: function (d) { return lsAvecAirNeuf(d) ? debitMinR4222_6(d) : ''; } },
  { target: 'avis_air_neuf', fn: function (d) { return lsAvecAirNeuf(d) ? avisAirNeuf(d) : ''; } },
  { target: 'avis', fn: function (d) {
      var avis = [];
      if (lsAvecExtraction(d)) avis.push(d.avis_extraction || 'Impossible de se prononcer', d.avis_taux);
      if (lsAvecAirNeuf(d)) avis.push(d.avis_air_neuf);
      // Extraction seule sans valeur de référence : le contrôle relève le débit, sans critère pour l'évaluer
      var vals = avis.filter(Boolean);
      if (vals.length && vals.every(function (v) { return v.indexOf('Sans Objet') === 0; })) return AVIS_SO_REF;
      return worstAvis(avis);
    } }
];

var CALC_RECYCLAGE = [
  { target: 'avis_destination', fn: function (d) {
      if (!d.destination) return 'Impossible de se prononcer';
      if (d.destination === 'Dans le même local') return 'Satisfaisant';
      if (d.destination === 'Vers un local à pollution non spécifique') return 'Non Satisfaisant'; // R4222-9
      if (d.meme_nature === 'Oui') return 'Satisfaisant';
      if (d.meme_nature === 'Non') return 'Non Satisfaisant';
      return 'Impossible de se prononcer';
    } },
  { target: 'debit_min_air_neuf', decimals: 0, fn: function (d) { return debitMinR4222_6(d); } },
  { target: 'avis_air_neuf', fn: avisAirNeuf },
  { target: 'avis_gaine', fn: function (d) {
      var r = String(d.ref_gaine || '').trim();
      if (!r || r === '/' || r === '-') return AVIS_SO_REF;
      var c = num(d.conc_gaine), rv = num(r);
      if (isNaN(c) || isNaN(rv)) return 'Impossible de se prononcer';
      return c <= rv ? 'Satisfaisant' : 'Non Satisfaisant';
    } },
  { target: 'avis_atmosphere', fn: function (d) {
      var inh = num(d.conc_inhalable), alv = num(d.conc_alveolaire);
      if (isNaN(inh) && isNaN(alv)) return 'Impossible de se prononcer';
      if (d.mesure_8h !== 'Oui') return 'Impossible de se prononcer';
      if (d.nature_polluant === 'Poussières sans effet spécifique') {
        if ((!isNaN(inh) && inh > R4222_10_INHALABLE) || (!isNaN(alv) && alv > R4222_10_ALVEOLAIRE)) return 'Non Satisfaisant';
        return 'Satisfaisant';
      }
      var vlep = num(d.vlep);
      if (isNaN(vlep)) return 'Impossible de se prononcer';
      return ((!isNaN(inh) && inh > vlep) || (!isNaN(alv) && alv > vlep)) ? 'Non Satisfaisant' : 'Satisfaisant';
    } },
  { target: 'avis', fn: function (d) {
      var etat = d.etat_epurateur ? (d.etat_epurateur === 'Bon état' ? 'Satisfaisant' : 'Non Satisfaisant') : 'Impossible de se prononcer';
      // R4222-16 : la surveillance des dispositifs d'épuration est obligatoire — absente ou défaillante, non satisfaisant
      var surv = d.surveillance_etat === 'Systèmes contrôlés et fonctionnels' ? 'Satisfaisant' : (d.surveillance_etat ? 'Non Satisfaisant' : 'Impossible de se prononcer');
      // R4222-17 : information non faite = non satisfaisant ; non vérifiée = sans effet sur l'avis
      var info = d.information_medecin_cse === 'Non' ? 'Non Satisfaisant' : '';
      return worstAvis([d.avis_destination, etat, surv, info, d.avis_air_neuf, d.avis_gaine, d.avis_atmosphere]);
    } },
  { target: 'prochain_controle', fn: function (d) { return addSixMonths(d.date_controle); } }
];

// ————————————————————————————————————————————
// Aide à la saisie : reprendre les débits déjà mesurés dans le même bâtiment
// ————————————————————————————————————————————

// Débit de chaque type de captage localisé (pour la somme « captages du local »)
var DEBIT_CAPTAGE_KEYS = {
  hottes: 'vpe_debit', sorbonnes: 'debit_mesure', bras_aspiration: 'debit_calcule', installations_diverses: 'debit_vt',
  cabines_peinture: 'debit_mesure', menuiserie_bis: 'debit', gaz_echappement: 'debit_mesure', box_peinture: 'debit_extraction_box',
  torches_aspirantes: 'total_debit', tts: 'debit_mesure'
};

function sommeDebitsBatiment(m, batiment, generale) {
  var b = String(batiment || '').trim().toLowerCase();
  var total = 0, n = 0, detail = {};
  var keys = generale ? { extracteur: 'debit_annee_en_cours' } : DEBIT_CAPTAGE_KEYS;
  Object.keys(keys).forEach(function (typeId) {
    (m.installations[typeId] || []).forEach(function (inst) {
      if (String(inst.data.batiment || '').trim().toLowerCase() !== b) return;
      var v = num(inst.data[keys[typeId]]);
      if (isNaN(v)) return;
      total += v; n++;
      var label = (getInstallationType(typeId) || {}).label || typeId;
      detail[label] = (detail[label] || 0) + 1;
    });
  });
  return { total: Math.round(total), n: n, detail: detail };
}

// Taux de renouvellement déjà retenus sur les autres locaux (toutes missions de l'appareil), avec leur
// source et l'activité du local : le technicien reprend le sien en un geste ou en saisit un autre.
// Aucune valeur par défaut : seulement ce que les techniciens ont saisi et sourcé.
function lsTauxDejaRetenus(instCourante) {
  var vus = {}, out = [];
  (state.missions || []).forEach(function (m) {
    ((m.installations && m.installations.local_specifique) || []).forEach(function (inst) {
      var d = inst.data || {}, t = String(d.taux_recommande || '').trim();
      if (inst === instCourante || isNaN(num(t))) return;
      var cle = t + '|' + (d.referentiel_taux || '') + '|' + (d.activite || d.reference_local || '');
      if (vus[cle]) return;
      vus[cle] = true;
      out.push({ taux: t, ref: d.referentiel_taux || '', activite: d.activite || d.reference_local || '' });
    });
  });
  return out.slice(0, 6);
}

function lsReprendreTaux(i) {
  var inst = getCurrentInstallation('local_specifique'), x = lsTauxDejaRetenus(inst)[i];
  if (!inst || !x) return;
  inst.data.referentiel_taux = x.ref;
  updateInstallationField('local_specifique', 'taux_recommande', x.taux);
}

function fieldAssistHtml(typeId, f, inst) {
  if (typeId === 'local_specifique' && f.key === 'taux_recommande') {
    var deja = lsTauxDejaRetenus(inst);
    if (!deja.length) return '<div class="field-hint">Taux propre à l’activité (polluant, procédé) : indiquez celui que vous retenez et sa source. Sans taux, le taux de renouvellement reste informatif.</div>';
    return deja.map(function (x, i) {
      return '<button type="button" class="today-btn" onclick="lsReprendreTaux(' + i + ');">' + escapeHtml(x.taux + ' vol/h' +
        (x.activite ? ' — ' + x.activite : '') + (x.ref ? ' (' + x.ref + ')' : '')) + '</button>';
    }).join(' ');
  }
  if (typeId !== 'local_specifique' || (f.key !== 'debit_captages' && f.key !== 'debit_extraction_generale')) return '';
  var m = getCurrentMission();
  if (!m || !inst.data.batiment) return '<div class="field-hint">Renseignez le bâtiment pour reprendre les débits déjà mesurés.</div>';
  var s = sommeDebitsBatiment(m, inst.data.batiment, f.key === 'debit_extraction_generale');
  if (!s.n) return '<div class="field-hint">Aucun ' + (f.key === 'debit_captages' ? 'captage' : 'extracteur') + ' mesuré dans ce bâtiment.</div>';
  var det = Object.keys(s.detail).map(function (k) { return s.detail[k] + ' × ' + k; }).join(', ');
  return '<button type="button" class="today-btn" onclick="gwField(\'local_specifique\',\'' + f.key + '\',\'' + s.total + '\');">' +
    'Reprendre ' + s.total + ' m³/h (' + escapeHtml(det) + ')</button>';
}

// ————————————————————————————————————————————
// Fiches PDF (style des fiches du rapport)
// ————————————————————————————————————————————

function pdfLsHelpers() {
  var v = function (val) { return formatCrosstabValue(typeof frDisplay === 'function' ? frDisplay(val) : val); };
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 9.5 }), { margin: [2, 2, 2, 2], alignment: 'left' }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 9.5 }), { margin: [2, 2, 2, 2] }, extra || {}); };
  var t = function (w, body) { return pdfTight(pdfTable(w, body)); };
  var bar = function (txt) { return t([540], [[Object.assign(pdfHeaderCell(txt, { size: 10.5 }), { margin: [1, 1, 1, 1] })]]); };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };
  var avis = function (val) {
    var col = val === 'Satisfaisant' ? '#166534' : val === 'Non Satisfaisant' ? '#B42318' : '#333333';
    return V(v(val), { bold: true, color: col });
  };
  var u = function (val, unit) { var s = v(val); return (s && s !== '-' && s !== '/') ? s + ' ' + unit : s; };
  return { v: v, L: L, V: V, t: t, bar: bar, gap: gap, avis: avis, u: u };
}

function pdfLsIdent(H, rows, photo) {
  var ident = H.t([150, 200], rows.map(function (r) { return [H.L(r[0]), H.V(r[1], { alignment: 'left', bold: !!r[2] })]; }));
  var ph = photo ? { image: photo, fit: [178, 130], alignment: 'center' } : { text: '' };
  return { columns: [{ width: 360, stack: [ident] }, { width: 180, stack: [ph] }], columnGap: 0 };
}

function pdfBuildAnnexeLocalSpecifique(list, logo) {
  var titre = 'Local à pollution spécifique', sousTitre = 'EXTRACTION ET AIR NEUF DU LOCAL';
  var content = [], H = pdfLsHelpers();
  (list || []).forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logo));
    var ext = lsAvecExtraction(d), an = lsAvecAirNeuf(d);
    content.push(pdfLsIdent(H, [['Bâtiment', d.batiment, true], ['Local', d.reference_local, true], ['Activité', d.activite], ['Polluant(s) représentatif(s)', d.polluant], ['Date du contrôle', d.date_controle],
      ['Mesures réalisées', d.mesures_realisees || MESURES_LS[0]]], d.photo));
    content.push(H.gap(10));
    if (an) {
      content.push(H.bar('Air neuf (Code du travail, art. R4222-11 et R4222-6)'));
      content.push(H.t([270, 270], [
        [H.L('Désignation du local (R4222-6)'), H.V(d.type_local)],
        [H.L('Effectif' + (H.v(d.occupants_autres_locaux) !== '-' ? ' (+ occupants des locaux d’où provient l’air)' : '')), H.V(H.v(d.effectif) + (H.v(d.occupants_autres_locaux) !== '-' ? ' + ' + H.v(d.occupants_autres_locaux) : ''))],
        [H.L('Introduction de l’air neuf'), H.V(d.mode_air_neuf)],
        [H.L('Débit minimal d’air neuf réglementaire'), H.V(H.u(d.debit_min_air_neuf, 'm³/h'))],
        [H.L('Débit d’air neuf introduit'), H.V(H.u(d.debit_air_neuf, 'm³/h'))],
        [H.L('Avis air neuf / minimum réglementaire'), H.avis(d.avis_air_neuf)]
      ]));
      content.push(H.gap(8));
    }
    if (ext) {
      content.push(H.bar('Extraction (arrêté du 8 octobre 1987, art. 4 ; Code du travail, art. R4222-12)'));
      content.push(H.t([270, 270], [
        [H.L('Débit extrait par les captages localisés'), H.V(H.u(d.debit_captages, 'm³/h'))],
        [H.L('Débit de l’extraction générale (bouches du local)'), H.V(H.u(d.debit_extraction_generale, 'm³/h'))],
        [H.L('Débit global d’air extrait'), H.V(H.u(d.debit_global_extrait, 'm³/h'), { bold: true })],
        [H.L('Valeur de référence'), H.V(H.u(d.valeur_reference_extraction, 'm³/h'))],
        [H.L('Avis débit global / valeur de référence'), H.avis(d.avis_extraction)]
      ].concat(H.v(d.volume) !== '-' ? [
        [H.L('Volume du local'), H.V(H.u(d.volume, 'm³'))],
        [H.L('Taux de renouvellement'), H.V(H.u(d.taux_renouvellement, 'vol/h'), { bold: true })]
      ] : []).concat(H.v(d.taux_recommande) !== '-' ? [
        [H.L('Taux recommandé' + (d.referentiel_taux ? ' (' + d.referentiel_taux + ')' : '')), H.V(H.u(d.taux_recommande, 'vol/h'))],
        [H.L('Avis taux de renouvellement'), H.avis(d.avis_taux)]
      ] : [])));
      content.push(H.gap(10));
    }
    var refs = [an ? 'Code du travail, art. R4222-6 et R4222-11' : '', ext ? 'arrêté du 8 octobre 1987, art. 4' : ''].filter(Boolean).join(' ; ');
    content.push(H.t([386, 154], [[H.V('Avis par rapport à la réglementation (' + refs + ') :', { alignment: 'left' }), H.avis(d.avis)]]));
    content.push(H.gap(8));
    content.push(H.t([540], [[H.L('Observation')], [H.V(H.v(d.observation), { alignment: 'left', margin: [6, 8, 6, 8] })]]));
  });
  return content;
}

function pdfBuildAnnexeRecyclage(list, logo) {
  var titre = 'Recyclage de l’air', sousTitre = 'CONTRÔLE SEMESTRIEL DES INSTALLATIONS DE RECYCLAGE';
  var content = [], H = pdfLsHelpers();
  (list || []).forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logo));
    content.push(pdfLsIdent(H, [['Bâtiment', d.batiment, true], ['Atelier / local desservi', d.localisation, true], ['Installation de recyclage', d.reference_equipement], ['Date du contrôle', d.date_controle], ['Prochain contrôle avant le', d.prochain_controle, true]], d.photo));
    content.push(H.gap(4));
    content.push(H.bar('Polluant et destination de l’air recyclé (Code du travail, art. R4222-9 et R4222-14)'));
    content.push(H.t([270, 270], [
      [H.L('Nature du polluant'), H.V([d.nature_polluant, d.polluant_precision].filter(Boolean).join(' — '))],
      [H.L('L’air épuré est renvoyé'), H.V(d.destination)],
      [H.L('Pollution de même nature dans les locaux concernés'), H.V(d.destination === 'Vers d’autres locaux' ? d.meme_nature : 'Sans objet')],
      [H.L('Avis destination'), H.avis(d.avis_destination)]
    ]));
    content.push(H.gap(4));
    content.push(H.bar('Épuration et surveillance (Code du travail, art. R4222-16 et R4222-17 ; arrêté du 8 octobre 1987, art. 4)'));
    content.push(H.t([270, 270], [
      [H.L('Système d’épuration'), H.V(d.type_epurateur)],
      [H.L('Efficacité annoncée par le constructeur'), H.V(d.efficacite_constructeur)],
      [H.L('Perte de charge relevée'), H.V(H.u(d.perte_charge, 'Pa'))],
      [H.L('État du système d’épuration'), H.V(d.etat_epurateur)],
      [H.L('Systèmes de surveillance en place'), H.V(Array.isArray(d.systemes_surveillance) ? d.systemes_surveillance.join(', ') : d.systemes_surveillance)],
      [H.L('Contrôle des systèmes de surveillance (R4222-16)'), H.V(d.surveillance_etat)],
      [H.L('Information du médecin du travail et du CSE (R4222-17)'), H.V(d.information_medecin_cse)]
    ]));
    content.push(H.gap(4));
    content.push(H.bar('Débits et air neuf (Code du travail, art. R4222-11 et R4222-6)'));
    content.push(H.t([270, 270], [
      [H.L('Débit d’air recyclé'), H.V(H.u(d.debit_recycle, 'm³/h'))],
      [H.L('Désignation du local / effectif'), H.V([d.type_local, H.v(d.effectif) !== '-' ? H.v(d.effectif) + ' personne(s)' : ''].filter(Boolean).join(' — '))],
      [H.L('Débit minimal d’air neuf réglementaire'), H.V(H.u(d.debit_min_air_neuf, 'm³/h'))],
      [H.L('Débit d’air neuf introduit'), H.V(H.u(d.debit_air_neuf, 'm³/h') + (d.mode_air_neuf ? ' (' + d.mode_air_neuf + ')' : ''))],
      [H.L('Avis air neuf / minimum réglementaire'), H.avis(d.avis_air_neuf)]
    ]));
    content.push(H.gap(4));
    content.push(H.bar('Concentration dans l’air recyclé (arrêté du 8 octobre 1987, art. 4 — contrôle semestriel)'));
    content.push(H.t([270, 270], [
      [H.L('Concentration dans la gaine de recyclage ou à sa sortie'), H.V(H.u(d.conc_gaine, 'mg/m³') + (d.fraction_gaine ? ' (' + d.fraction_gaine.toLowerCase() + ')' : ''))],
      [H.L('Méthode de mesure'), H.V(d.methode_mesure)],
      [H.L('Valeur de référence'), H.V(H.u(d.ref_gaine, 'mg/m³'))],
      [H.L('Avis concentration / valeur de référence'), H.avis(d.avis_gaine)]
    ]));
    content.push(H.gap(4));
    var seuil = d.nature_polluant === 'Poussières sans effet spécifique'
      ? 'R4222-10 : 4 mg/m³ (inhalable) et 0,9 mg/m³ (alvéolaire), moyenne sur 8 h'
      : (H.v(d.vlep) !== '-' ? 'VLEP 8 h : ' + H.u(d.vlep, 'mg/m³') : 'VLEP du polluant non renseignée');
    content.push(H.bar('Atmosphère du local (Code du travail, art. R4222-10 et R4222-14)'));
    content.push(H.t([270, 270], [
      [H.L('Poussières, fraction inhalable'), H.V(H.u(d.conc_inhalable, 'mg/m³'))],
      [H.L('Poussières, fraction alvéolaire'), H.V(H.u(d.conc_alveolaire, 'mg/m³'))],
      [H.L('Mesure représentative d’une moyenne sur 8 h'), H.V(d.mesure_8h)],
      [H.L('Valeur(s) limite(s) appliquée(s)'), H.V(seuil)],
      [H.L('Avis atmosphère du local'), H.avis(d.avis_atmosphere)]
    ]));
    content.push(H.gap(4));
    content.push(H.t([386, 154], [[H.V('Avis par rapport à la réglementation (Code du travail, art. R4222-10, R4222-11 et R4222-14 ; arrêté du 8 octobre 1987, art. 4) :', { alignment: 'left' }), H.avis(d.avis)]]));
    content.push(H.gap(4));
    content.push(H.t([540], [[H.L('Observation')], [H.V(H.v(d.observation), { alignment: 'left', margin: [6, 4, 6, 4] })]]));
  });
  return content;
}

// ————————————————————————————————————————————
// Enregistrement auprès de l'appli
// ————————————————————————————————————————————

(function registerLocauxSpecifiques() {
  // Après les captages localisés dans la liste des types (sélection, vue par type)
  var at = INSTALLATION_TYPES.findIndex(function (t) { return t.id === 'installations_diverses'; });
  INSTALLATION_TYPES.splice(at + 1, 0, TYPE_LOCAL_SPECIFIQUE, TYPE_RECYCLAGE);

  CALC_RULES.local_specifique = CALC_LOCAL_SPECIFIQUE;
  CALC_RULES.recyclage = CALC_RECYCLAGE;

  if (typeof WIZARD_STEPS !== 'undefined') {
  WIZARD_STEPS.local_specifique = [
    { title: 'Identification', fields: ['batiment', 'reference_local', 'activite', 'polluant', 'date_controle', 'photo'] },
    { title: 'Mesures à réaliser', fields: ['mesures_realisees'] },
    { title: 'Occupation', fields: ['type_local', 'effectif', 'occupants_autres_locaux'] },
    { title: 'Extraction', fields: ['debit_captages', 'debit_extraction_generale', 'debit_global_extrait', 'valeur_reference_extraction', 'avis_extraction'] },
    { title: 'Taux de renouvellement', fields: ['volume', 'taux_renouvellement', 'taux_recommande', 'referentiel_taux', 'avis_taux'] },
    { title: 'Air neuf', fields: ['mode_air_neuf', 'debit_air_neuf', 'debit_min_air_neuf', 'avis_air_neuf'] },
    { title: 'Conclusion', fields: ['avis', 'observation'] }
  ];
  WIZARD_STEPS.recyclage = [
    { title: 'Identification', fields: ['batiment', 'localisation', 'reference_equipement', 'date_controle', 'photo'] },
    { title: 'Polluant & recyclage', fields: ['nature_polluant', 'polluant_precision', 'destination', 'meme_nature', 'avis_destination'] },
    { title: 'Épuration & surveillance', fields: ['type_epurateur', 'efficacite_constructeur', 'perte_charge', 'etat_epurateur', 'systemes_surveillance', 'surveillance_etat', 'information_medecin_cse'] },
    { title: 'Débits & air neuf', fields: ['debit_recycle', 'type_local', 'effectif', 'mode_air_neuf', 'debit_air_neuf', 'debit_min_air_neuf', 'avis_air_neuf'] },
    { title: 'Air recyclé (semestriel)', fields: ['conc_gaine', 'fraction_gaine', 'methode_mesure', 'ref_gaine', 'avis_gaine'] },
    { title: 'Atmosphère du local', fields: ['conc_inhalable', 'conc_alveolaire', 'mesure_8h', 'vlep', 'avis_atmosphere'] },
    { title: 'Conclusion', fields: ['avis', 'prochain_controle', 'observation'] }
  ];
  }
  // Préremplissage N-1 / duplication : la configuration du local se reconduit, pas les mesures
  if (typeof DUPLICATION_EXTRA_KEEP_STEPS !== 'undefined') {
    DUPLICATION_EXTRA_KEEP_STEPS.local_specifique = ['Mesures à réaliser', 'Occupation', 'Taux de renouvellement'];
    DUPLICATION_EXTRA_KEEP_STEPS.recyclage = ['Polluant & recyclage', 'Épuration & surveillance'];
  }

  if (typeof SECTION_GROUPS !== 'undefined') {
  var gi = SECTION_GROUPS.findIndex(function (g) { return g.key === 'captage_localise'; });
  SECTION_GROUPS.splice(gi + 1, 0,
    { key: 'local_specifique', titre: 'Locaux à pollution spécifique', sommaireTitre: 'LOCAUX A POLLUTION SPECIFIQUE : EXTRACTION ET AIR NEUF', types: ['local_specifique'],
      images: ['assets/report/divider-local-specifique.png'], divTitres: ['LOCAUX A POLLUTION SPECIFIQUE'], divPhotos: [{ x: 80, y: 230, w: 340, h: 325 }],
      divNote: { x: 60, y: 610, w: 380, lines: ['REFERENTIELS', '', 'Code du travail, art. R4222-10 à R4222-12', 'Débit minimal d’air neuf : art. R4222-6 et R4222-11', 'Arrêté du 8 octobre 1987, art. 4'] } },
    { key: 'recyclage', titre: 'Recyclage de l’air', sommaireTitre: 'RECYCLAGE DE L’AIR', types: ['recyclage'],
      images: ['assets/report/divider-recyclage.jpg'], divTitres: ['RECYCLAGE DE L\'AIR'], divPhotos: [{ x: 80, y: 280, w: 340, h: 255 }],
      divNote: { x: 60, y: 610, w: 380, lines: ['REFERENTIELS', '', 'Code du travail, art. R4222-10 et R4222-14', 'Poussières sans effet spécifique : 4 mg/m³ (inhalable), 0,9 mg/m³ (alvéolaire)', 'Arrêté du 8 octobre 1987, art. 4 : contrôle semestriel'] } });

  }
  if (typeof SYNTHESE_CONFIG !== 'undefined') {
  SYNTHESE_CONFIG.local_specifique = { titre: 'Conclusion sur les locaux à pollution spécifique', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_local', col2Label: 'Local', col3: 'activite', col3Label: 'Activité', avis: 'avis', commentaire: 'observation' };
  SYNTHESE_CONFIG.recyclage = { titre: 'Conclusion sur les installations de recyclage de l’air', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Installation', col3: 'localisation', col3Label: 'Local desservi', avis: 'avis', commentaire: 'observation' };
  }

  if (typeof ED_REFERENCE !== 'undefined') {
    ED_REFERENCE.local_specifique = { badge: 'Réglementaire', status: 'muted', note: 'Code du travail R4222-11 (air neuf ≥ valeurs de R4222-6), R4222-12 (captage à la source) ; arrêté du 8 octobre 1987, art. 4 (débit global extrait). Extraction, air neuf ou les deux, au choix du technicien.' };
    ED_REFERENCE.recyclage = { badge: 'Réglementaire', status: 'muted', note: 'Arrêté du 8 octobre 1987, art. 4 (contrôle semestriel des gaines de recyclage et des systèmes de surveillance) ; Code du travail R4222-14 (recyclage) et R4222-10 (poussières : 4 et 0,9 mg/m³).' };
  }

  if (typeof DVR_CONFIG !== 'undefined') {
    DVR_CONFIG.local_specifique = { cat: 'sp', polluant: 'Selon l’activité du local', lignes: [
      { label: 'Débit global d’air extrait', mesure: 'debit_global_extrait', avis: 'avis_extraction', unit: 'm³/h', ref: 'valeur_reference_extraction' },
      { label: 'Débit minimal d’air neuf (R4222-6 / R4222-11)', role: 'mini', mini: 'debit_min_air_neuf', unit: 'm³/h' },
      { label: 'Débit d’air neuf introduit', mesure: 'debit_air_neuf', avis: 'avis_air_neuf', role: 'point', unit: 'm³/h' }
    ] };
    DVR_CONFIG.recyclage = { cat: 'sp', polluant: 'Poussières', lignes: [
      { label: 'Débit d’air neuf introduit', mesure: 'debit_air_neuf', mini: 'debit_min_air_neuf', miniLabel: 'Minimum réglementaire (R4222-6)', avis: 'avis_air_neuf', unit: 'm³/h' },
      { label: 'Débit d’air recyclé', mesure: 'debit_recycle', role: 'point', unit: 'm³/h' },
      { label: 'Concentration dans l’air recyclé', mesure: 'conc_gaine', role: 'point', unit: 'mg/m³', ref: 'ref_gaine' }
    ] };
  }

  if (typeof PDF_ANNEXES_FIDELES !== 'undefined') {
    PDF_ANNEXES_FIDELES.local_specifique = function (list) { return pdfBuildAnnexeLocalSpecifique(list, PDF_ASSETS.logo); };
    PDF_ANNEXES_FIDELES.recyclage = function (list) { return pdfBuildAnnexeRecyclage(list, PDF_ASSETS.logo); };
  }
})();

console.log('✓ Locaux à pollution spécifique et recyclage chargés');
