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

    // Facultatif (2026-10-09) : le minimum par occupant (R4222-11) n'est vérifié que si l'effectif est
    // renseigné, et ne peut jamais rendre satisfaisant un local dont le taux de renouvellement est insuffisant
    { key: 'section_occupation', label: 'Occupation, facultatif (Code du travail, R4222-6 et R4222-11)', type: 'section', showIf: LS_SI_AIR_NEUF },
    { key: 'type_local', label: 'Désignation du local (R4222-6), si vous vérifiez aussi le minimum par occupant', type: 'select', options: TYPES_LOCAL_R4222_6, optional: true, showIf: LS_SI_AIR_NEUF },
    { key: 'effectif', label: 'Effectif présent dans le local (facultatif)', type: 'number', optional: true, showIf: LS_SI_AIR_NEUF },
    { key: 'occupants_autres_locaux', label: 'Occupants des locaux à pollution non spécifique d’où provient l’air (si c’est le cas)', type: 'number', optional: true, showIf: LS_SI_AIR_NEUF },

    { key: 'section_extraction', label: 'Extraction (arrêté du 8 octobre 1987, art. 4)', type: 'section', showIf: LS_SI_EXTRACTION },
    { key: 'debit_captages', label: 'Débit extrait par les captages localisés (m³/h)', type: 'number', optional: true, showIf: LS_SI_EXTRACTION },
    { key: 'debit_extraction_generale', label: 'Débit de l’extraction générale, bouches du local (m³/h)', type: 'number', optional: true, showIf: LS_SI_EXTRACTION },
    { key: 'debit_global_extrait', label: 'Débit global d’air extrait (m³/h)', type: 'computed', showIf: LS_SI_EXTRACTION },
    { key: 'valeur_reference_extraction', label: 'Valeur de référence du débit global (m³/h, « / » si aucune)', type: 'text', showIf: LS_SI_EXTRACTION },
    { key: 'avis_extraction', label: 'Avis débit global extrait / valeur de référence', type: 'computed', showIf: LS_SI_EXTRACTION },

    { key: 'section_air_neuf', label: 'Air neuf', type: 'section', showIf: LS_SI_AIR_NEUF },
    { key: 'mode_air_neuf', label: 'Introduction de l’air neuf', type: 'select', showIf: LS_SI_AIR_NEUF,
      options: ['Soufflage mécanique (CTA, centrale)', 'Bouches / grilles mesurées', 'Entrées d’air naturelles (non mesurables)'] },
    { key: 'debit_air_neuf', label: 'Débit d’air neuf introduit (m³/h)', type: 'number',
      showIf: { and: [LS_SI_AIR_NEUF, { key: 'mode_air_neuf', in: ['Soufflage mécanique (CTA, centrale)', 'Bouches / grilles mesurées'] }] } },
    { key: 'debit_min_air_neuf', label: 'Débit minimal d’air neuf par occupant (R4222-6, m³/h), si l’effectif est renseigné', type: 'computed', showIf: LS_SI_AIR_NEUF },
    { key: 'avis_air_neuf', label: 'Avis air neuf / minimum par occupant', type: 'computed', showIf: LS_SI_AIR_NEUF },

    // Taux de renouvellement (2026-10-09) : critère principal du local, à l'extraction et au soufflage
    { key: 'section_taux', label: 'Taux de renouvellement', type: 'section' },
    { key: 'volume', label: 'Volume du local (m³)', type: 'number' },
    { key: 'taux_renouvellement', label: 'Taux de renouvellement à l’extraction (vol/h)', type: 'computed', showIf: LS_SI_EXTRACTION },
    { key: 'taux_air_neuf', label: 'Taux de renouvellement en air neuf soufflé (vol/h)', type: 'computed', showIf: LS_SI_AIR_NEUF },
    // Facultatif : aucun taux par défaut, certains locaux n'en ont pas (soudage : jugé sur les captages)
    { key: 'taux_recommande', label: 'Taux de renouvellement à atteindre (vol/h), s’il en existe un pour l’activité', type: 'number', optional: true },
    { key: 'referentiel_taux', label: 'Source du taux à atteindre (demande du client, dossier de l’installation, guide INRS…)', type: 'text', optional: true },
    { key: 'avis_taux', label: 'Avis taux de renouvellement / taux à atteindre', type: 'computed' },

    { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
    { key: 'avis', label: 'Avis par rapport à la réglementation', type: 'computed' },
    { key: 'observation', label: 'Observation', type: 'textarea' }
  ]
};

// Contrôle semestriel du recyclage (refonte du 2026-10-07) — sources :
//  - arrêté du 8 octobre 1987, art. 4.1 (dossier de valeurs de référence, compléments recyclage) et
//    4.2 b (au minimum tous les six mois : concentration dans les gaines de recyclage ou à leur sortie,
//    contrôle de tous les systèmes de surveillance) ;
//  - Code du travail R4222-9, R4222-14 (air efficacement épuré, même nature de pollution, atmosphère
//    sous les VLEP), R4222-16 (surveillance obligatoire), R4222-17 (médecin du travail, CSE), R4222-10 ;
//  - INRS ED 6008 (2023), chap. 1 § 2 : concentration de chaque polluant dans les conduits de recyclage
//    au plus le cinquième de sa valeur limite ; recyclage en période de chauffage ou de climatisation
//    seulement, dérivation vers l'extérieur, polluants tous connus (conditions « recommandées », tenues à
//    part de l'avis réglementaire).
// Mesure en gaine : photomètre à lecture directe (DustTrak DRX, canaux PM1, PM2,5, RESP, PM10, TOTAL)
// ou gravimétrie. Photomètre : RESP retenu pour la fraction alvéolaire, TOTAL pour la fraction
// inhalable (majorant), multipliés par le facteur de correction s'il y en a un.
var RC_PSES = 'Poussières sans effet spécifique';
var RC_AGENT = 'Poussières avec agent(s) à effet spécifique';
var RC_GAZ = 'Gaz ou vapeurs';
var RC_NATURES_AGENT = [RC_AGENT, RC_GAZ, 'Poussières de bois', 'Autres poussières à effet spécifique', 'Autres polluants (gaz, vapeurs)'];
var RC_PHOTOMETRE = 'Photomètre à lecture directe (DustTrak)';
var RC_GRAVI = 'Prélèvement et analyse gravimétrique';
var RC_FRACTIONS = ['Inhalable', 'Alvéolaire', 'Gaz / vapeur'];
var RC_TESTS = ['Testés : alarme ou signal déclenché', 'Testés : un système ne réagit pas', 'Non testés', 'Aucun système de surveillance'];
var RC_SI_AGENT = { key: 'nature_polluant', in: RC_NATURES_AGENT };
var RC_SI_PHOTO = { key: 'methode_mesure', in: ['', RC_PHOTOMETRE, 'Appareil à lecture directe'] };
var RC_SI_AUTRE_METHODE = { key: 'methode_mesure', in: [RC_GRAVI, 'Autre méthode', 'Prélèvement et analyse gravimétrique'] };

// Nature du polluant, anciennes valeurs comprises (fiches d'avant la refonte)
function rcNature(d) {
  var n = d.nature_polluant || '';
  if (n === 'Poussières de bois' || n === 'Autres poussières à effet spécifique') return RC_AGENT;
  if (n === 'Autres polluants (gaz, vapeurs)') return RC_GAZ;
  return n;
}
function rcPhotometre(d) { return !d.methode_mesure || d.methode_mesure === RC_PHOTOMETRE || d.methode_mesure === 'Appareil à lecture directe'; }
function rcPoussieres(d) { var n = rcNature(d); return n === RC_PSES || n === RC_AGENT; }

function rcAgentFields(i, optional) {
  var p = 'agent' + i;
  return [
    { key: p + '_nom', label: 'Agent ' + i + ' (substance)', type: 'text', showIf: RC_SI_AGENT, optional: optional },
    { key: p + '_vlep', label: 'Agent ' + i + ' — VLEP 8 h (mg/m³)', type: 'number', showIf: RC_SI_AGENT, optional: optional },
    { key: p + '_fraction', label: 'Agent ' + i + ' — fraction comparée', type: 'select', options: RC_FRACTIONS, showIf: RC_SI_AGENT, optional: optional }
  ];
}

var TYPE_RECYCLAGE = {
  id: 'recyclage', label: 'Recyclage de l’air (contrôle semestriel)', icon: 'merge', implemented: true,
  fields: [
    { key: 'batiment', label: 'Bâtiment', type: 'text' },
    { key: 'localisation', label: 'Atelier / local desservi', type: 'text' },
    { key: 'reference_equipement', label: 'Installation de recyclage (dépoussiéreur, épurateur…)', type: 'text' },
    { key: 'date_controle', label: 'Date de Contrôle', type: 'text' },
    { key: 'photo', label: 'Photo', type: 'photo' },

    { key: 'section_fonctionnement', label: 'Fonctionnement du recyclage (R4222-9, R4222-14, R4222-17)', type: 'section' },
    { key: 'destination', label: 'L’air épuré est renvoyé', type: 'select', options: ['Dans le même local', 'Vers d’autres locaux', 'Vers un local à pollution non spécifique'] },
    { key: 'meme_nature', label: 'Pollution de même nature dans tous les locaux concernés', type: 'toggle', options: ['Oui', 'Non'],
      showIf: { key: 'destination', equals: 'Vers d’autres locaux' } },
    { key: 'avis_destination', label: 'Avis destination de l’air recyclé', type: 'computed' },
    { key: 'information_medecin_cse', label: 'Conditions du recyclage portées à la connaissance du médecin du travail et du CSE (R4222-17)', type: 'select',
      options: ['Oui', 'Non', 'Non vérifié'] },

    { key: 'section_reco', label: 'Conditions recommandées par l’INRS (ED 6008)', type: 'section' },
    { key: 'periode_recyclage', label: 'Période de recyclage', type: 'select', options: ['Seulement en période de chauffage ou de climatisation', 'Toute l’année', 'Non connue'] },
    { key: 'derivation_exterieur', label: 'Rejet direct à l’extérieur possible (dérivation), notamment en cas de panne de l’épuration', type: 'select', options: ['Oui', 'Non', 'Non vérifié'] },
    { key: 'polluants_connus', label: 'Tous les polluants émis sont identifiés', type: 'select', options: ['Oui', 'Non', 'Non vérifié'] },
    { key: 'avis_recommandations', label: 'Avis conditions recommandées (ED 6008)', type: 'computed' },

    { key: 'section_polluant', label: 'Polluants et valeurs limites', type: 'section' },
    { key: 'nature_polluant', label: 'Nature de la pollution recyclée', type: 'select', options: [RC_PSES, RC_AGENT, RC_GAZ] }
  ].concat(rcAgentFields(1, false), rcAgentFields(2, true), [

    { key: 'section_epuration', label: 'Épuration', type: 'section' },
    { key: 'type_epurateur', label: 'Système d’épuration', type: 'select',
      options: ['Filtre à manches', 'Filtre à cartouches', 'Filtre à poches / plans', 'Électrofiltre', 'Cyclone', 'Autre'] },
    { key: 'efficacite_constructeur', label: 'Efficacité annoncée par le constructeur', type: 'text', optional: true },
    { key: 'efficacite_granulo', label: 'Efficacité par tranches granulométriques fournie (poussières)', type: 'select', options: ['Oui', 'Non'], optional: true },
    { key: 'perte_charge', label: 'Perte de charge relevée (Pa)', type: 'number', optional: true },
    { key: 'perte_charge_max', label: 'Perte de charge maximale admissible (constructeur ou dossier, Pa)', type: 'number', optional: true },
    { key: 'avis_perte_charge', label: 'Avis perte de charge', type: 'computed' },
    { key: 'etat_epurateur', label: 'État du système d’épuration', type: 'select', options: ['Bon état', 'Colmaté / encrassé', 'Fuite ou défaut constaté'] },

    { key: 'section_surveillance', label: 'Systèmes de surveillance (R4222-16 ; arrêté du 8 octobre 1987, art. 4.2 b)', type: 'section' },
    { key: 'systemes_surveillance', label: 'Systèmes de surveillance en place', type: 'checkbox-group',
      options: ['Pressostat / alarme de colmatage', 'Détecteur de poussières en continu (sortie de filtre)', 'Contrôle visuel du rejet', 'Aucun'] },
    { key: 'surveillance_test', label: 'Test de fonctionnement des systèmes de surveillance', type: 'select', options: RC_TESTS },
    { key: 'surveillance_test_methode', label: 'Méthode de test (ex. simulation de colmatage)', type: 'text', optional: true,
      showIf: { key: 'surveillance_test', in: [RC_TESTS[0], RC_TESTS[1]] } },
    { key: 'surveillance_etalonnage', label: 'Dernier étalonnage ou vérification du capteur (date, intervenant)', type: 'text', optional: true },
    { key: 'avis_surveillance', label: 'Avis systèmes de surveillance', type: 'computed' },

    { key: 'section_mesure', label: 'Concentration dans l’air recyclé — conditions de mesure (art. 4.2 b)', type: 'section' },
    { key: 'methode_mesure', label: 'Méthode de mesure', type: 'select', options: [RC_PHOTOMETRE, RC_GRAVI, 'Autre méthode'] },
    { key: 'point_mesure_gaine', label: 'Point de mesure', type: 'select', options: ['Dans la gaine de recyclage', 'À la sortie de l’épurateur, dans un écoulement canalisé', 'Autre (préciser en observation)'] },
    { key: 'regime_mesure', label: 'Fonctionnement pendant la mesure', type: 'select', options: ['Procédé en production, recyclage en service', 'Recyclage en service, procédé à l’arrêt', 'Autre (préciser en observation)'] },
    { key: 'heure_debut', label: 'Début de la mesure (hh:mm)', type: 'text' },
    { key: 'heure_fin', label: 'Fin de la mesure (hh:mm)', type: 'text' },
    { key: 'duree_mesure', label: 'Durée de la mesure (min)', type: 'computed' },

    { key: 'section_resultats', label: 'Concentration dans l’air recyclé — résultats', type: 'section' },
    { key: 'dt_total', label: 'Moyenne canal TOTAL (mg/m³)', type: 'number', showIf: RC_SI_PHOTO },
    { key: 'dt_pm10', label: 'Moyenne canal PM10 (mg/m³)', type: 'number', optional: true, showIf: RC_SI_PHOTO },
    { key: 'dt_resp', label: 'Moyenne canal RESP — PM4 (mg/m³)', type: 'number', showIf: RC_SI_PHOTO },
    { key: 'dt_pm25', label: 'Moyenne canal PM2,5 (mg/m³)', type: 'number', optional: true, showIf: RC_SI_PHOTO },
    { key: 'dt_pm1', label: 'Moyenne canal PM1 (mg/m³)', type: 'number', optional: true, showIf: RC_SI_PHOTO },
    { key: 'dt_facteur', label: 'Facteur de correction photométrique (vide = 1, aucun étalonnage)', type: 'number', optional: true, showIf: RC_SI_PHOTO },
    { key: 'grav_inhalable', label: 'Concentration, fraction inhalable (mg/m³)', type: 'number', showIf: RC_SI_AUTRE_METHODE },
    { key: 'grav_alveolaire', label: 'Concentration, fraction alvéolaire (mg/m³)', type: 'number', optional: true, showIf: RC_SI_AUTRE_METHODE },
    { key: 'agent1_conc', label: 'Agent 1 — concentration mesurée (mg/m³, vide = fraction de poussières retenue)', type: 'number', optional: true, showIf: RC_SI_AGENT },
    { key: 'agent2_conc', label: 'Agent 2 — concentration mesurée (mg/m³, vide = fraction de poussières retenue)', type: 'number', optional: true, showIf: RC_SI_AGENT },
    { key: 'conc_inhalable_gaine', label: 'Concentration retenue, fraction inhalable (mg/m³)', type: 'computed' },
    { key: 'conc_alveolaire_gaine', label: 'Concentration retenue, fraction alvéolaire (mg/m³)', type: 'computed' },
    { key: 'conc_inhalable_gaine_n1', label: 'Fraction inhalable — contrôle précédent (mg/m³)', type: 'number', optional: true },
    { key: 'conc_alveolaire_gaine_n1', label: 'Fraction alvéolaire — contrôle précédent (mg/m³)', type: 'number', optional: true },
    { key: 'avis_cinquieme', label: 'Avis : concentrations au plus égales au 1/5 de la VLEP (INRS ED 6008)', type: 'computed' },
    { key: 'ref_gaine', label: 'Valeur de référence du dossier (fraction inhalable, mg/m³, « / » si aucune)', type: 'text' },
    { key: 'avis_gaine', label: 'Avis concentration / valeur de référence', type: 'computed' },

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

    { key: 'section_atmosphere', label: 'Atmosphère du local, si mesurée (R4222-10, R4222-14)', type: 'section' },
    { key: 'conc_inhalable', label: 'Concentration en poussières, fraction inhalable (mg/m³)', type: 'number', optional: true },
    { key: 'conc_alveolaire', label: 'Concentration en poussières, fraction alvéolaire (mg/m³)', type: 'number', optional: true },
    { key: 'mesure_8h', label: 'Mesure représentative d’une moyenne sur 8 heures', type: 'toggle', options: ['Oui', 'Non'], optional: true },
    { key: 'avis_atmosphere', label: 'Avis atmosphère du local', type: 'computed' },

    { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
    { key: 'avis', label: 'Avis par rapport à la réglementation', type: 'computed' },
    { key: 'prochain_controle', label: 'Prochain contrôle semestriel avant le', type: 'computed' },
    { key: 'observation', label: 'Observation', type: 'textarea' }
  ])
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
  { target: 'taux_air_neuf', decimals: 1, fn: function (d) {
      var q = num(d.debit_air_neuf), v = num(d.volume);
      return (!lsAvecAirNeuf(d) || isNaN(q) || isNaN(v) || v === 0) ? '' : q / v;
    } },
  // Aucun taux réglementaire pour un local à pollution spécifique : il dépend du polluant et du procédé.
  // Le technicien saisit celui qu'il retient (ex. 10 vol/h pour un laboratoire) et sa source ; sans
  // taux recommandé, le taux reste informatif (2026-10-05).
  // Taux à atteindre : propre à l'activité (polluant, procédé), saisi avec sa source ; aucune valeur par
  // défaut. Vérifié à l'extraction et au soufflage selon les mesures réalisées ; sans taux à atteindre, le
  // taux reste informatif. Entrées d'air naturelles : taux en air neuf non mesurable.
  { target: 'avis_taux', fn: function (d) {
      var rec = num(d.taux_recommande);
      if (isNaN(rec)) return '';
      var avis = [];
      var juge = function (t) { t = num(t); return isNaN(t) ? 'Impossible de se prononcer' : (t >= rec ? 'Satisfaisant' : 'Non Satisfaisant'); };
      if (lsAvecExtraction(d)) avis.push(juge(d.taux_renouvellement));
      if (lsAvecAirNeuf(d)) avis.push(d.mode_air_neuf === 'Entrées d’air naturelles (non mesurables)' ? 'Impossible de se prononcer' : juge(d.taux_air_neuf));
      return worstAvis(avis);
    } },
  { target: 'debit_min_air_neuf', decimals: 0, fn: function (d) { return lsAvecAirNeuf(d) ? debitMinR4222_6(d) : ''; } },
  // Minimum par occupant (R4222-11) seulement si l'effectif est renseigné
  { target: 'avis_air_neuf', fn: function (d) {
      if (!lsAvecAirNeuf(d) || String(d.effectif === undefined ? '' : d.effectif).trim() === '') return '';
      return avisAirNeuf(d);
    } },
  // Le critère le moins favorable l'emporte : un minimum par occupant respecté ne valide jamais un taux
  // de renouvellement insuffisant
  { target: 'avis', fn: function (d) {
      var avis = [d.avis_taux];
      if (lsAvecExtraction(d)) avis.push(d.avis_extraction || 'Impossible de se prononcer');
      if (lsAvecAirNeuf(d)) avis.push(d.avis_air_neuf);
      var vals = avis.filter(Boolean);
      if (vals.length && vals.every(function (v) { return v.indexOf('Sans Objet') === 0; })) return AVIS_SO_REF;
      return worstAvis(avis);
    } }
];

// Heure saisie « 8:36 », « 08h36 », « 0836 » -> minutes depuis minuit
function rcMinutes(s) {
  var m = /^\s*(\d{1,2})\s*[:hH.]?\s*(\d{2})\s*$/.exec(String(s || ''));
  if (!m) return NaN;
  var h = parseInt(m[1], 10), mn = parseInt(m[2], 10);
  return (h > 23 || mn > 59) ? NaN : h * 60 + mn;
}

// Facteur de correction photométrique : vide ou invalide = 1
function rcFacteur(d) { var f = num(d.dt_facteur); return (isNaN(f) || f <= 0) ? 1 : f; }

// Concentration retenue pour une fraction, anciennes fiches comprises (une seule valeur conc_gaine)
function rcConcFraction(d, fraction) {
  var v;
  if (rcPhotometre(d)) v = num(fraction === 'Inhalable' ? d.dt_total : d.dt_resp) * rcFacteur(d);
  else v = num(fraction === 'Inhalable' ? d.grav_inhalable : d.grav_alveolaire);
  if (isNaN(v) && d.conc_gaine !== undefined && d.conc_gaine !== '') {
    var alv = d.fraction_gaine === 'Fraction alvéolaire';
    if ((fraction === 'Alvéolaire') === alv) v = num(d.conc_gaine);
  }
  return v;
}

// Lignes de comparaison au 1/5 de la VLEP : poussières (R4222-10) puis agents à effet spécifique
function rcLignesLimites(d) {
  var lignes = [];
  if (rcPoussieres(d)) {
    lignes.push({ nom: 'Poussières, fraction inhalable', vlep: R4222_10_INHALABLE, conc: num(d.conc_inhalable_gaine), n1: num(d.conc_inhalable_gaine_n1), source: 'R4222-10' });
    lignes.push({ nom: 'Poussières, fraction alvéolaire', vlep: R4222_10_ALVEOLAIRE, conc: num(d.conc_alveolaire_gaine), n1: num(d.conc_alveolaire_gaine_n1), source: 'R4222-10' });
  }
  if (RC_NATURES_AGENT.indexOf(d.nature_polluant || '') !== -1) {
    [1, 2].forEach(function (i) {
      var p = 'agent' + i, nom = String(d[p + '_nom'] || (i === 1 ? d.polluant_precision || (d.nature_polluant === 'Poussières de bois' ? 'Poussières de bois' : '') : '')).trim();
      // Fraction non précisée (ancienne fiche) : inhalable, celle des VLEP de poussières
      var fraction = d[p + '_fraction'] || (rcPoussieres(d) ? 'Inhalable' : '');
      var vlep = num(d[p + '_vlep']);
      if (i === 1 && isNaN(vlep)) vlep = num(d.vlep); // ancienne fiche : une seule VLEP
      if (!nom && isNaN(vlep)) return;
      var conc = num(d[p + '_conc']);
      if (isNaN(conc)) conc = fraction === 'Alvéolaire' ? num(d.conc_alveolaire_gaine) : fraction === 'Inhalable' ? num(d.conc_inhalable_gaine) : NaN;
      lignes.push({ nom: nom || 'Agent ' + i, vlep: vlep, conc: conc, n1: NaN, source: 'VLEP de l’agent', agent: i });
    });
  }
  return lignes.map(function (l) {
    l.limite = isNaN(l.vlep) ? NaN : l.vlep / 5;
    l.avis = (isNaN(l.limite) || isNaN(l.conc)) ? 'Impossible de se prononcer' : (l.conc <= l.limite ? 'Satisfaisant' : 'Non Satisfaisant');
    return l;
  });
}

var CALC_RECYCLAGE = [
  { target: 'avis_destination', fn: function (d) {
      if (!d.destination) return 'Impossible de se prononcer';
      if (d.destination === 'Dans le même local') return 'Satisfaisant';
      if (d.destination === 'Vers un local à pollution non spécifique') return 'Non Satisfaisant'; // R4222-9
      if (d.meme_nature === 'Oui') return 'Satisfaisant';
      if (d.meme_nature === 'Non') return 'Non Satisfaisant';
      return 'Impossible de se prononcer';
    } },
  // Conditions de l'ED 6008 : tenues à part de l'avis réglementaire
  { target: 'avis_recommandations', fn: function (d) {
      var l = [];
      if (d.periode_recyclage) l.push(d.periode_recyclage === 'Toute l’année' ? 'Non Satisfaisant' : d.periode_recyclage === 'Non connue' ? 'Impossible de se prononcer' : 'Satisfaisant');
      if (d.derivation_exterieur) l.push(d.derivation_exterieur === 'Oui' ? 'Satisfaisant' : d.derivation_exterieur === 'Non' ? 'Non Satisfaisant' : 'Impossible de se prononcer');
      if (d.polluants_connus) l.push(d.polluants_connus === 'Oui' ? 'Satisfaisant' : d.polluants_connus === 'Non' ? 'Non Satisfaisant' : 'Impossible de se prononcer');
      return l.length ? worstAvis(l) : '';
    } },
  { target: 'avis_perte_charge', fn: function (d) {
      var p = num(d.perte_charge), mx = num(d.perte_charge_max);
      if (isNaN(p) || isNaN(mx)) return '';
      return p <= mx ? 'Satisfaisant' : 'Non Satisfaisant';
    } },
  // Arrêté du 8 octobre 1987, art. 4.2 b : contrôle de tous les systèmes de surveillance ; R4222-16 :
  // surveillance obligatoire. Un test non réalisé ne permet pas de conclure.
  { target: 'avis_surveillance', fn: function (d) {
      var t = d.surveillance_test;
      if (t === RC_TESTS[0]) return 'Satisfaisant';
      if (t === RC_TESTS[1] || t === RC_TESTS[3]) return 'Non Satisfaisant';
      if (t === RC_TESTS[2]) return 'Impossible de se prononcer';
      if (d.surveillance_etat === 'Systèmes contrôlés et fonctionnels') return 'Satisfaisant'; // ancienne fiche
      if (d.surveillance_etat === 'Système défaillant' || d.surveillance_etat === 'Aucun système de surveillance') return 'Non Satisfaisant';
      return 'Impossible de se prononcer';
    } },
  { target: 'duree_mesure', decimals: 0, fn: function (d) {
      var a = rcMinutes(d.heure_debut), b = rcMinutes(d.heure_fin);
      if (isNaN(a) || isNaN(b)) return '';
      return b >= a ? b - a : b + 1440 - a;
    } },
  { target: 'conc_inhalable_gaine', decimals: 3, fn: function (d) { var v = rcConcFraction(d, 'Inhalable'); return isNaN(v) ? '' : v; } },
  { target: 'conc_alveolaire_gaine', decimals: 3, fn: function (d) { var v = rcConcFraction(d, 'Alvéolaire'); return isNaN(v) ? '' : v; } },
  { target: 'avis_cinquieme', fn: function (d) {
      if (rcNature(d) === RC_GAZ && !rcLignesLimites(d).length) return 'Impossible de se prononcer';
      var lignes = rcLignesLimites(d).filter(function (l) { return !isNaN(l.conc) || l.agent; });
      if (!lignes.length) return 'Impossible de se prononcer';
      return worstAvis(lignes.map(function (l) { return l.avis; }));
    } },
  { target: 'avis_gaine', fn: function (d) {
      var r = String(d.ref_gaine || '').trim();
      if (!r || r === '/' || r === '-') return AVIS_SO_REF;
      var c = num(d.conc_inhalable_gaine), rv = num(r);
      if (isNaN(c) || isNaN(rv)) return 'Impossible de se prononcer';
      return c <= rv ? 'Satisfaisant' : 'Non Satisfaisant';
    } },
  { target: 'debit_min_air_neuf', decimals: 0, fn: function (d) { return debitMinR4222_6(d); } },
  // Air neuf : évalué seulement s'il a été relevé (le contrôle semestriel porte sur la gaine)
  { target: 'avis_air_neuf', fn: function (d) {
      if (!d.mode_air_neuf && (d.debit_air_neuf === undefined || d.debit_air_neuf === '')) return '';
      return avisAirNeuf(d);
    } },
  // Atmosphère du local : seulement si elle a été mesurée
  { target: 'avis_atmosphere', fn: function (d) {
      var inh = num(d.conc_inhalable), alv = num(d.conc_alveolaire);
      if (isNaN(inh) && isNaN(alv)) return '';
      if (d.mesure_8h !== 'Oui') return 'Impossible de se prononcer';
      if (rcNature(d) === RC_PSES) {
        if ((!isNaN(inh) && inh > R4222_10_INHALABLE) || (!isNaN(alv) && alv > R4222_10_ALVEOLAIRE)) return 'Non Satisfaisant';
        return 'Satisfaisant';
      }
      var vlep = num(d.agent1_vlep);
      if (isNaN(vlep)) vlep = num(d.vlep);
      if (isNaN(vlep)) return 'Impossible de se prononcer';
      return ((!isNaN(inh) && inh > vlep) || (!isNaN(alv) && alv > vlep)) ? 'Non Satisfaisant' : 'Satisfaisant';
    } },
  { target: 'avis', fn: function (d) {
      var etat = d.etat_epurateur ? (d.etat_epurateur === 'Bon état' ? 'Satisfaisant' : 'Non Satisfaisant') : 'Impossible de se prononcer';
      // R4222-17 : information non faite = non satisfaisant ; non vérifiée = sans effet sur l'avis
      var info = d.information_medecin_cse === 'Non' ? 'Non Satisfaisant' : '';
      return worstAvis([d.avis_destination, d.avis_cinquieme, d.avis_gaine, d.avis_surveillance, etat, d.avis_perte_charge, info, d.avis_air_neuf, d.avis_atmosphere]);
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
      content.push(H.bar('Air neuf soufflé'));
      content.push(H.t([270, 270], [
        [H.L('Introduction de l’air neuf'), H.V(d.mode_air_neuf)],
        [H.L('Débit d’air neuf introduit'), H.V(H.u(d.debit_air_neuf, 'm³/h'), { bold: true })]
      ].concat(d.avis_air_neuf ? [
        [H.L('Désignation du local (R4222-6)'), H.V(d.type_local)],
        [H.L('Effectif' + (H.v(d.occupants_autres_locaux) !== '-' ? ' (+ occupants des locaux d’où provient l’air)' : '')), H.V(H.v(d.effectif) + (H.v(d.occupants_autres_locaux) !== '-' ? ' + ' + H.v(d.occupants_autres_locaux) : ''))],
        [H.L('Débit minimal d’air neuf par occupant (R4222-6 et R4222-11)'), H.V(H.u(d.debit_min_air_neuf, 'm³/h'))],
        [H.L('Avis air neuf / minimum par occupant'), H.avis(d.avis_air_neuf)]
      ] : [])));
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
      ]));
      content.push(H.gap(10));
    }
    content.push(H.bar('Taux de renouvellement'));
    content.push(H.t([270, 270], [[H.L('Volume du local'), H.V(H.u(d.volume, 'm³'))]]
      .concat(ext ? [[H.L('Taux de renouvellement à l’extraction'), H.V(H.u(d.taux_renouvellement, 'vol/h'), { bold: true })]] : [])
      .concat(an ? [[H.L('Taux de renouvellement en air neuf soufflé'), H.V(H.u(d.taux_air_neuf, 'vol/h'), { bold: true })]] : [])
      .concat([[H.L('Taux à atteindre' + (d.referentiel_taux ? ' (' + d.referentiel_taux + ')' : '')), H.V(H.u(d.taux_recommande, 'vol/h'))],
        [H.L('Avis taux de renouvellement'), H.avis(d.avis_taux || 'Sans objet (aucun taux à atteindre retenu)')]])));
    content.push(H.gap(10));
    var refs = [an ? 'Code du travail, art. R4222-6 et R4222-11' : '', ext ? 'arrêté du 8 octobre 1987, art. 4' : ''].filter(Boolean).join(' ; ');
    content.push(H.t([386, 154], [[H.V('Avis par rapport à la réglementation (' + refs + ') :', { alignment: 'left' }), H.avis(d.avis)]]));
    content.push(H.gap(8));
    content.push(H.t([540], [[H.L('Observation')], [H.V(H.v(d.observation), { alignment: 'left', margin: [6, 8, 6, 8] })]]));
  });
  return content;
}

// Tableau « polluant / VLEP / limite 1/5 / contrôle précédent / ce contrôle / avis » (comme la trame
// SOCOTEC des installations d'épuration avec recyclage, critère de l'ED 6008)
function pdfRecyclageTableLimites(H, d) {
  var lignes = rcLignesLimites(d);
  if (!lignes.length) return null;
  var f = function (v, dec) { return isNaN(v) ? '-' : frDisplay(String(Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec))); };
  var body = [[H.L('Polluant'), H.L('VLEP 8 h (mg/m³)'), H.L('Limite : 1/5 de la VLEP (mg/m³)'), H.L('Contrôle précédent (mg/m³)'), H.L('Ce contrôle (mg/m³)'), H.L('Avis')]];
  lignes.forEach(function (l) {
    body.push([H.V(l.nom, { alignment: 'left' }), H.V(f(l.vlep, 3)), H.V(f(l.limite, 3)), H.V(f(l.n1, 3)), H.V(f(l.conc, 3), { bold: true }), H.avis(l.avis)]);
  });
  return H.t([150, 70, 85, 80, 70, 85], body);
}

// Canaux du photomètre (DustTrak DRX)
function pdfRecyclageTableCanaux(H, d) {
  var canaux = [['TOTAL', d.dt_total], ['PM10', d.dt_pm10], ['RESP (PM4)', d.dt_resp], ['PM2,5', d.dt_pm25], ['PM1', d.dt_pm1]]
    .filter(function (c) { return c[1] !== undefined && c[1] !== ''; });
  if (!canaux.length) return null;
  var w = Math.floor(400 / canaux.length);
  return H.t([140].concat(canaux.map(function () { return w; })), [
    [H.L('Canal')].concat(canaux.map(function (c) { return H.L(c[0]); })),
    [H.L('Moyenne lue (mg/m³)')].concat(canaux.map(function (c) { return H.V(H.v(c[1])); }))
  ]);
}

function pdfBuildAnnexeRecyclage(list, logo) {
  var titre = 'Recyclage de l’air', sousTitre = 'CONTRÔLE SEMESTRIEL DES INSTALLATIONS D’ÉPURATION AVEC RECYCLAGE';
  var content = [], H = pdfLsHelpers();
  var rows = function (r) { return H.t([270, 270], r.filter(Boolean).map(function (x) { return [H.L(x[0]), x[2] ? H.avis(x[1]) : H.V(x[1])]; })); };
  (list || []).forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logo));
    content.push(pdfLsIdent(H, [['Bâtiment', d.batiment, true], ['Atelier / local desservi', d.localisation, true], ['Installation de recyclage', d.reference_equipement], ['Date du contrôle', d.date_controle], ['Prochain contrôle avant le', d.prochain_controle, true]], d.photo));
    content.push(H.gap(4));

    content.push(H.bar('Fonctionnement du recyclage (Code du travail, art. R4222-9, R4222-14 et R4222-17)'));
    content.push(rows([
      ['L’air épuré est renvoyé', d.destination],
      d.destination === 'Vers d’autres locaux' ? ['Pollution de même nature dans les locaux concernés', d.meme_nature] : null,
      ['Avis destination de l’air recyclé', d.avis_destination, true],
      ['Information du médecin du travail et du CSE (R4222-17)', d.information_medecin_cse]
    ]));
    content.push(H.gap(4));

    content.push(H.bar('Systèmes de surveillance (R4222-16 ; arrêté du 8 octobre 1987, art. 4.2 b)'));
    content.push(rows([
      ['Systèmes en place', Array.isArray(d.systemes_surveillance) ? d.systemes_surveillance.join(', ') : d.systemes_surveillance],
      ['Test de fonctionnement', d.surveillance_test || d.surveillance_etat],
      d.surveillance_test_methode ? ['Méthode de test', d.surveillance_test_methode] : null,
      ['Dernier étalonnage ou vérification du capteur', d.surveillance_etalonnage],
      ['Avis systèmes de surveillance', d.avis_surveillance, true]
    ]));
    content.push(H.gap(4));

    content.push(H.bar('Épuration'));
    content.push(rows([
      ['Système d’épuration', d.type_epurateur],
      ['Efficacité annoncée par le constructeur', d.efficacite_constructeur],
      d.efficacite_granulo ? ['Efficacité par tranches granulométriques fournie', d.efficacite_granulo] : null,
      ['Perte de charge relevée / maximale admissible', [H.u(d.perte_charge, 'Pa'), H.u(d.perte_charge_max, 'Pa')].join(' / ')],
      d.avis_perte_charge ? ['Avis perte de charge', d.avis_perte_charge, true] : null,
      ['État du système d’épuration', d.etat_epurateur]
    ]));
    content.push(H.gap(4));

    var photo = rcPhotometre(d);
    content.push(H.bar('Concentration dans l’air recyclé (arrêté du 8 octobre 1987, art. 4.2 b ; limite : INRS ED 6008)'));
    content.push(rows([
      ['Méthode de mesure', d.methode_mesure || (d.dt_total || d.dt_resp ? RC_PHOTOMETRE : '')],
      ['Point de mesure', d.point_mesure_gaine],
      ['Fonctionnement pendant la mesure', d.regime_mesure],
      ['Horaires et durée', [d.heure_debut && d.heure_fin ? d.heure_debut + ' – ' + d.heure_fin : '', H.v(d.duree_mesure) !== '-' ? H.v(d.duree_mesure) + ' min' : ''].filter(Boolean).join(', ')],
      photo ? ['Facteur de correction photométrique', H.v(d.dt_facteur) !== '-' ? H.v(d.dt_facteur) : '1 (aucun étalonnage)'] : null
    ]));
    var canaux = photo ? pdfRecyclageTableCanaux(H, d) : null;
    if (canaux) { content.push(H.gap(3)); content.push(canaux); }
    var lim = pdfRecyclageTableLimites(H, d);
    if (lim) { content.push(H.gap(3)); content.push(lim); }
    if (photo && (d.dt_total || d.dt_resp)) {
      content.push({ text: 'Fraction alvéolaire : canal RESP ; fraction inhalable : canal TOTAL (majorant). Mesure à lecture directe, indicative.', fontSize: 7.5, italics: true, margin: [0, 2, 0, 0] });
    }
    content.push(H.gap(3));
    content.push(rows([
      ['Avis : concentrations au plus égales au 1/5 de la VLEP', d.avis_cinquieme, true],
      ['Valeur de référence du dossier (fraction inhalable)', H.u(d.ref_gaine, 'mg/m³')],
      ['Avis concentration / valeur de référence', d.avis_gaine, true]
    ]));
    content.push(H.gap(4));

    if (d.debit_recycle || d.mode_air_neuf || d.debit_air_neuf) {
      content.push(H.bar('Débits et air neuf (Code du travail, art. R4222-11 et R4222-6)'));
      content.push(rows([
        ['Débit d’air recyclé', H.u(d.debit_recycle, 'm³/h')],
        ['Désignation du local / effectif', [d.type_local, H.v(d.effectif) !== '-' ? H.v(d.effectif) + ' personne(s)' : ''].filter(Boolean).join(' — ')],
        ['Débit minimal d’air neuf réglementaire', H.u(d.debit_min_air_neuf, 'm³/h')],
        ['Débit d’air neuf introduit', H.u(d.debit_air_neuf, 'm³/h') + (d.mode_air_neuf ? ' (' + d.mode_air_neuf + ')' : '')],
        d.avis_air_neuf ? ['Avis air neuf / minimum réglementaire', d.avis_air_neuf, true] : null
      ]));
      content.push(H.gap(4));
    }
    if (d.avis_atmosphere) {
      content.push(H.bar('Atmosphère du local (Code du travail, art. R4222-10 et R4222-14)'));
      content.push(rows([
        ['Poussières, fraction inhalable / alvéolaire', [H.u(d.conc_inhalable, 'mg/m³'), H.u(d.conc_alveolaire, 'mg/m³')].join(' / ')],
        ['Mesure représentative d’une moyenne sur 8 h', d.mesure_8h],
        ['Avis atmosphère du local', d.avis_atmosphere, true]
      ]));
      content.push(H.gap(4));
    }
    if (d.avis_recommandations) {
      content.push(H.bar('Conditions recommandées par l’INRS (ED 6008) — hors avis réglementaire'));
      content.push(rows([
        ['Période de recyclage', d.periode_recyclage],
        ['Rejet direct à l’extérieur possible (dérivation)', d.derivation_exterieur],
        ['Tous les polluants émis sont identifiés', d.polluants_connus],
        ['Avis conditions recommandées', d.avis_recommandations, true]
      ]));
      content.push(H.gap(4));
    }
    content.push(H.t([386, 154], [[H.V('Avis par rapport à la réglementation (Code du travail, art. R4222-9 à R4222-17 ; arrêté du 8 octobre 1987, art. 4) :', { alignment: 'left' }), H.avis(d.avis)]]));
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
    { title: 'Extraction', fields: ['debit_captages', 'debit_extraction_generale', 'debit_global_extrait', 'valeur_reference_extraction', 'avis_extraction'] },
    { title: 'Air neuf soufflé', fields: ['mode_air_neuf', 'debit_air_neuf'] },
    { title: 'Taux de renouvellement', fields: ['volume', 'taux_renouvellement', 'taux_air_neuf', 'taux_recommande', 'referentiel_taux', 'avis_taux'] },
    { title: 'Occupation (facultatif)', fields: ['type_local', 'effectif', 'occupants_autres_locaux', 'debit_min_air_neuf', 'avis_air_neuf'] },
    { title: 'Conclusion', fields: ['avis', 'observation'] }
  ];
  WIZARD_STEPS.recyclage = [
    { title: 'Identification', fields: ['batiment', 'localisation', 'reference_equipement', 'date_controle', 'photo'] },
    { title: 'Fonctionnement du recyclage', fields: ['destination', 'meme_nature', 'avis_destination', 'information_medecin_cse'] },
    { title: 'Conditions recommandées (ED 6008)', fields: ['periode_recyclage', 'derivation_exterieur', 'polluants_connus', 'avis_recommandations'] },
    { title: 'Polluants', fields: ['nature_polluant', 'agent1_nom', 'agent1_vlep', 'agent1_fraction', 'agent2_nom', 'agent2_vlep', 'agent2_fraction'] },
    { title: 'Épuration', fields: ['type_epurateur', 'efficacite_constructeur', 'efficacite_granulo', 'perte_charge', 'perte_charge_max', 'avis_perte_charge', 'etat_epurateur'] },
    { title: 'Systèmes de surveillance', fields: ['systemes_surveillance', 'surveillance_test', 'surveillance_test_methode', 'surveillance_etalonnage', 'avis_surveillance'] },
    { title: 'Mesure en gaine — conditions', fields: ['methode_mesure', 'point_mesure_gaine', 'regime_mesure', 'heure_debut', 'heure_fin', 'duree_mesure'] },
    { title: 'Mesure en gaine — résultats', fields: ['dt_total', 'dt_pm10', 'dt_resp', 'dt_pm25', 'dt_pm1', 'dt_facteur', 'grav_inhalable', 'grav_alveolaire',
      'agent1_conc', 'agent2_conc', 'conc_inhalable_gaine', 'conc_alveolaire_gaine', 'conc_inhalable_gaine_n1', 'conc_alveolaire_gaine_n1', 'avis_cinquieme', 'ref_gaine', 'avis_gaine'] },
    { title: 'Débits & air neuf', fields: ['debit_recycle', 'type_local', 'effectif', 'mode_air_neuf', 'debit_air_neuf', 'debit_min_air_neuf', 'avis_air_neuf'] },
    { title: 'Atmosphère du local (si mesurée)', fields: ['conc_inhalable', 'conc_alveolaire', 'mesure_8h', 'avis_atmosphere'] },
    { title: 'Conclusion', fields: ['avis', 'prochain_controle', 'observation'] }
  ];
  }
  // Préremplissage N-1 / duplication : la configuration du local se reconduit, pas les mesures
  if (typeof DUPLICATION_EXTRA_KEEP_STEPS !== 'undefined') {
    DUPLICATION_EXTRA_KEEP_STEPS.local_specifique = ['Mesures à réaliser', 'Occupation', 'Taux de renouvellement'];
    DUPLICATION_EXTRA_KEEP_STEPS.recyclage = ['Fonctionnement du recyclage', 'Conditions recommandées (ED 6008)', 'Polluants', 'Épuration', 'Mesure en gaine — conditions'];
    // Constats et relevés de la visite, jamais reconduits
    if (typeof DUPLICATION_FINDING_KEYS !== 'undefined') ['information_medecin_cse', 'perte_charge', 'heure_debut', 'heure_fin', 'surveillance_test', 'surveillance_test_methode']
      .forEach(function (k) { DUPLICATION_FINDING_KEYS[k] = true; });
  }

  if (typeof N1_COMPARISON_FIELDS !== 'undefined') N1_COMPARISON_FIELDS.recyclage = [
    { current: 'conc_inhalable_gaine', n1: 'conc_inhalable_gaine_n1' }, { current: 'conc_alveolaire_gaine', n1: 'conc_alveolaire_gaine_n1' }];

  if (typeof SECTION_GROUPS !== 'undefined') {
  var gi = SECTION_GROUPS.findIndex(function (g) { return g.key === 'captage_localise'; });
  SECTION_GROUPS.splice(gi + 1, 0,
    { key: 'local_specifique', titre: 'Locaux à pollution spécifique', sommaireTitre: 'LOCAUX A POLLUTION SPECIFIQUE : EXTRACTION ET AIR NEUF', types: ['local_specifique'],
      images: ['assets/report/divider-local-specifique.png'], divTitres: ['LOCAUX A POLLUTION SPECIFIQUE'], divPhotos: [{ x: 80, y: 230, w: 340, h: 325 }],
      divNote: { x: 60, y: 610, w: 380, lines: ['REFERENTIELS', '', 'Code du travail, art. R4222-10 à R4222-12', 'Débit minimal d’air neuf : art. R4222-6 et R4222-11', 'Arrêté du 8 octobre 1987, art. 4'] } },
    { key: 'recyclage', titre: 'Recyclage de l’air', sommaireTitre: 'RECYCLAGE DE L’AIR', types: ['recyclage'],
      images: ['assets/report/divider-recyclage.jpg'], divTitres: ['RECYCLAGE DE L\'AIR'], divPhotos: [{ x: 80, y: 280, w: 340, h: 255 }],
      divNote: { x: 60, y: 610, w: 380, lines: ['REFERENTIELS', '', 'Code du travail, art. R4222-9 à R4222-17', 'Arrêté du 8 octobre 1987, art. 4.2 b : contrôle semestriel', 'Concentration dans l’air recyclé : au plus 1/5 de la VLEP (INRS ED 6008)'] } });

  }
  if (typeof SYNTHESE_CONFIG !== 'undefined') {
  SYNTHESE_CONFIG.local_specifique = { titre: 'Conclusion sur les locaux à pollution spécifique', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_local', col2Label: 'Local', col3: 'activite', col3Label: 'Activité', avis: 'avis', commentaire: 'observation' };
  SYNTHESE_CONFIG.recyclage = { titre: 'Conclusion sur les installations de recyclage de l’air', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Installation', col3: 'localisation', col3Label: 'Local desservi', avis: 'avis', commentaire: 'observation' };
  }

  if (typeof ED_REFERENCE !== 'undefined') {
    ED_REFERENCE.local_specifique = { badge: 'Réglementaire', status: 'muted', note: 'Code du travail R4222-11 (air neuf ≥ valeurs de R4222-6), R4222-12 (captage à la source) ; arrêté du 8 octobre 1987, art. 4 (débit global extrait). Extraction, air neuf ou les deux, au choix du technicien.' };
    ED_REFERENCE.recyclage = { badge: 'Réglementaire', status: 'muted', note: 'Arrêté du 8 octobre 1987, art. 4.2 b (tous les six mois : concentration dans les gaines de recyclage, contrôle de tous les systèmes de surveillance) ; Code du travail R4222-9, R4222-14, R4222-16, R4222-17 ; INRS ED 6008 : concentration de chaque polluant dans l’air recyclé au plus égale au 1/5 de sa VLEP (poussières sans effet spécifique, R4222-10 : 4 et 0,9 mg/m³).' };
  }

  if (typeof DVR_CONFIG !== 'undefined') {
    DVR_CONFIG.local_specifique = { cat: 'sp', polluant: 'Selon l’activité du local', lignes: [
      { label: 'Débit global d’air extrait', mesure: 'debit_global_extrait', avis: 'avis_extraction', unit: 'm³/h', ref: 'valeur_reference_extraction' },
      { label: 'Débit minimal d’air neuf (R4222-6 / R4222-11)', role: 'mini', mini: 'debit_min_air_neuf', unit: 'm³/h' },
      { label: 'Débit d’air neuf introduit', mesure: 'debit_air_neuf', avis: 'avis_air_neuf', role: 'point', unit: 'm³/h' },
      { label: 'Taux de renouvellement à l’extraction', mesure: 'taux_renouvellement', mini: 'taux_recommande', miniLabel: 'Taux à atteindre', avis: 'avis_taux', unit: 'vol/h' },
      { label: 'Taux de renouvellement en air neuf soufflé', mesure: 'taux_air_neuf', mini: 'taux_recommande', miniLabel: 'Taux à atteindre', avis: 'avis_taux', unit: 'vol/h' }
    ] };
    DVR_CONFIG.recyclage = { cat: 'sp', polluant: 'Poussières', lignes: [
      { label: 'Débit d’air neuf introduit', mesure: 'debit_air_neuf', mini: 'debit_min_air_neuf', miniLabel: 'Minimum réglementaire (R4222-6)', avis: 'avis_air_neuf', unit: 'm³/h' },
      { label: 'Débit d’air recyclé', mesure: 'debit_recycle', role: 'point', unit: 'm³/h' },
      { label: 'Concentration dans l’air recyclé (fraction inhalable)', mesure: 'conc_inhalable_gaine', avis: 'avis_cinquieme', unit: 'mg/m³', ref: 'ref_gaine' },
      { label: 'Concentration dans l’air recyclé (fraction alvéolaire)', mesure: 'conc_alveolaire_gaine', avis: 'avis_cinquieme', unit: 'mg/m³' }
    ] };
  }

  if (typeof PDF_ANNEXES_FIDELES !== 'undefined') {
    PDF_ANNEXES_FIDELES.local_specifique = function (list) { return pdfBuildAnnexeLocalSpecifique(list, PDF_ASSETS.logo); };
    PDF_ANNEXES_FIDELES.recyclage = function (list) { return pdfBuildAnnexeRecyclage(list, PDF_ASSETS.logo); };
  }
})();

console.log('✓ Locaux à pollution spécifique et recyclage chargés');
