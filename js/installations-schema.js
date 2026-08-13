// installations-schema.js
// Schémas déclaratifs des 17 types d'installations de contrôle aération
// Extraits des modules VBA TAB_x_*.bas (mapping colonnes -> libellés) + CONSTANTE.bas (libellés d'options)
// Statut "implemented:false" = squelette à compléter (liste présente, formulaire détaillé à venir)

var OPT_CONFORME = ['Conforme', 'Non Conforme'];
var OPT_OUI_NON = ['Oui', 'Non'];
var OPT_SATISFAISANT = ['Satisfaisant', 'Non Satisfaisant', 'Impossible de se prononcer'];

// Checklist réglementaire locaux fumeurs (21 critères, UserForm_LOCFUMEUR CB1-CB21) — chaque critère se
// répond Satisfaisant / Non Satisfaisant / Sans Objet (VBA : Libelle_Usf_Satisfaisant / _Non_Satisfaisant
// / Libelle_Sans_Objet), pas "Impossible de se prononcer" comme OPT_SATISFAISANT.
var OPT_CRITERE_LOCFUMEUR = ['Satisfaisant', 'Non Satisfaisant', 'Sans Objet'];

// Menuiserie (machines à bois) — table "Type de machine à bois" -> débit de référence (m³/h)
// Extraite de la liste déroulante UserForm_MENUISERIE_BIS (feuille de référence liée)
var MACHINE_BOIS_DEBIT_REF = {
  'Dégauchisseuse de largeur <400mm': 800,
  'Dégauchisseuse de largeur entre 400 et 600 mm': 1100,
  'Dégauchisseuse de largeur > 600mm': 1400,
  'Raboteuse de largeur <400mm': 800,
  'Raboteuse de largeur entre 400 et 600 mm': 1100,
  'Raboteuse de largeur > 600mm': 1400,
  'Dégauchisseuse-raboteuse de largeur <400mm': 800,
  'Dégauchisseuse-raboteuse de largeur entre 400 et 600 mm': 1100,
  'Dégauchisseuse-raboteuse de largeur > 600mm': 1400,
  'Scie à ruban : largeur du volant <500mm': 450,
  'Scie à ruban : largeur du volant >500mm': 700,
  'Scie circulaire de diamètre <315mm': 850,
  'Scie circulaire de diamètre entre 315 et 400 mm': 1100,
  'Scie circulaire de diamètre > 400mm': 1400,
  'Scie à panneau horizontale': 2500,
  'Scie à panneau verticale': 1500,
  'Tronçonneuse à coupe verticale': 350,
  'Tronçonneuse à coupe horizontale, pendulaire, en V ….': 800,
  'Déligneuse': 1800,
  'Toupie pour découpe droite': 1100,
  'Toupie pour découpe courbe': 2000,
  'Toupie pour réalisation de tenon': 1400,
  'Tenonneuse': 3000,
  'Plaqueuse de chant': 350,
  'Machines à profiler': 500,
  'Ponceuse': null // pas de valeur de référence dans la liste d'origine ("/")
};
var MACHINE_BOIS_OPTIONS = ['/'].concat(Object.keys(MACHINE_BOIS_DEBIT_REF));

// Génère les champs de mesure d'un captage (Box préparation peinture), visible selon nombre_captage
function buildBoxCaptageFields(n) {
  var visibles = [];
  for (var k = n; k <= 4; k++) visibles.push(String(k));
  var showIf = { key: 'nombre_captage', in: visibles };

  function combine(extra) { return { and: [showIf, extra] }; }
  var modeGrille = { key: 'captage' + n + '_vitesse_mode', equals: 'Grille de points' };
  var modeDirecte = { key: 'captage' + n + '_vitesse_mode', equals: 'Vitesse moyenne directe' };
  var rectangulaire = { key: 'captage' + n + '_forme_conduit', equals: 'Rectangulaire' };
  var p = 'captage' + n;

  return [
    { key: 'section_' + p, label: 'Mesure de la vitesse d\u2019extraction — Captage n°' + n, type: 'section', showIf: showIf },
    { key: p + '_forme_conduit', label: 'Type de conduit', type: 'select', options: ['Circulaire', 'Rectangulaire'], showIf: showIf },
    { key: p + '_diametre_cote1', label: 'Diamètre ou côté 1 (cm)', type: 'number', showIf: showIf },
    { key: p + '_cote2', label: 'Côté 2 (cm)', type: 'number', showIf: combine(rectangulaire) },
    { key: p + '_surface', label: 'Surface (m²)', type: 'computed', showIf: showIf },
    { key: p + '_temperature', label: 'Température dans le conduit (°C)', type: 'number', showIf: showIf },
    { key: p + '_pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number', showIf: showIf },
    { key: p + '_masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed', showIf: showIf },
    { key: p + '_vitesse_mode', label: 'Saisie de la vitesse', type: 'select', options: ['Vitesse moyenne directe', 'Grille de points'], showIf: showIf },
    { key: p + '_vitesse_nb_axes', label: "Nombre d'axes", type: 'number', showIf: combine(modeGrille) },
    { key: p + '_vitesse_nb_points', label: 'Nombre de points par axe', type: 'number', showIf: combine(modeGrille) },
    { key: p + '_vitesse_grid', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid',
      colsKey: p + '_vitesse_nb_points', rowsKey: p + '_vitesse_nb_axes', showIf: combine(modeGrille), pointEntry: true },
    { key: p + '_vitesse_directe', label: 'Vitesse (m/s)', type: 'number', showIf: combine(modeDirecte) },
    { key: p + '_vitesse_moyenne', label: 'Vitesse moyenne mesurée (m/s)', type: 'computed', showIf: showIf },
    { key: p + '_debit', label: 'Débit mesuré (m³/h)', type: 'computed', showIf: showIf }
  ];
}

// Génère les champs d'une ligne de mesure "Torches aspirantes" (jusqu'à 10 points)
// Génère les champs d'un réseau mesuré CTA (Neuf / Soufflé / Repris)
function buildCtaReseauFields(prefix, label, optional) {
  var showIf = optional ? { key: prefix + '_active', equals: 'Oui' } : undefined;
  var f = [{ key: 'section_' + prefix, label: 'Mesure de la vitesse dans le conduit d\u2019air ' + label, type: 'section' }];
  if (optional) f.push({ key: prefix + '_active', label: 'Mesurer ce réseau', type: 'select', options: ['Oui', 'Non'] });
  f = f.concat([
    { key: prefix + '_forme', label: 'Forme de la section', type: 'select', options: ['Circulaire', 'Rectangulaire'], showIf: showIf },
    { key: prefix + '_diametre_cote1', label: 'Diamètre ou côte 1 (cm)', type: 'number', showIf: showIf },
    { key: prefix + '_cote2', label: 'Côte 2 (cm)', type: 'number', showIf: { key: prefix + '_forme', equals: 'Rectangulaire' } },
    { key: prefix + '_surface', label: 'Surface (m²)', type: 'computed', showIf: showIf },
    { key: prefix + '_temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number', showIf: showIf },
    { key: prefix + '_pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number', showIf: showIf },
    { key: prefix + '_masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed', showIf: showIf },
    { key: prefix + '_vitesse', label: 'Vitesse (m/s)', type: 'number', showIf: showIf },
    { key: prefix + '_reference', label: 'Débit de référence (m³/h)', type: 'number', showIf: showIf },
    { key: prefix + '_debit_n1', label: 'Débit année N-1 (m³/h)', type: 'number', showIf: showIf },
    { key: prefix + '_debit', label: 'Débit année en cours (m³/h)', type: 'computed', showIf: showIf }
  ]);
  return f;
}

// Génère les champs d'une colonne de filtration CTA (Pré-filtre / Filtre / Filtre absolu)
var CLASSES_EFFICACITE_FILTRE = [
  'Filtre Grossier - G1', 'Filtre Grossier - G2', 'Filtre Grossier - G3', 'Filtre Grossier - G4',
  'Filtre Moyen - M5', 'Filtre Moyen - M6', 'Filtre Fin - F7', 'Filtre Fin - F8', 'Filtre Fin - F9',
  'Haute efficacité (EPA) - E10', 'Haute efficacité (EPA) - E11', 'Haute efficacité (EPA) - E12',
  'Très Haute efficacité (HEPA) - H13', 'Très Haute efficacité (HEPA) - H14',
  'Très faible pénétration (ULPA) - U15', 'Très faible pénétration (ULPA) - U16', 'Très faible pénétration (ULPA) - U17'
];
function buildCtaFiltreFields(prefix, label, avecPerteDeCharge) {
  var f = [
    { key: prefix + '_etat', label: label + ' — État', type: 'select', options: ['Bon Etat', 'A remplacer', 'Non observé'] },
    { key: prefix + '_type', label: label + ' — Type (cellules, poches, ...)', type: 'select', options: ['Cellule', 'Poche', 'Média découpé'] },
    { key: prefix + '_nombre_dimensions', label: label + ' — Nombre / Dimensions', type: 'text' },
    { key: prefix + '_classe', label: label + ' — Classe d\u2019efficacité', type: 'select', options: CLASSES_EFFICACITE_FILTRE }
  ];
  if (avecPerteDeCharge) f.push({ key: prefix + '_perte_charge', label: label + ' — Perte de charge (Pa)', type: 'number' });
  return f;
}

function buildTorcheRowFields(i) {
  var p = 'torche' + i;
  return [
    { key: 'section_' + p, label: 'Point de mesure n°' + i, type: 'section' },
    { key: p + '_point_mesure', label: 'Point de mesure', type: 'text' },
    { key: p + '_diametre_tube', label: 'Diamètre du tube (mm)', type: 'number' },
    { key: p + '_vitesse_centre', label: 'Vitesse au centre (m/s)', type: 'number' },
    { key: p + '_debit', label: 'Débit (m³/h)', type: 'computed' },
    { key: p + '_valeur_reference', label: 'Valeur de référence (m³/h) — vide = 100 m³/h (INRS)', type: 'text' },
    { key: p + '_ecart_pct', label: 'Écart (%)', type: 'computed' },
    { key: p + '_distance_l', label: 'Distance L (mm)', type: 'number' },
    { key: p + '_vitesse_point_emission', label: "Vitesse au point d'émission (m/s)", type: 'computed' },
    { key: p + '_valeur_preconisee', label: 'Valeur préconisée (m/s)', type: 'computed' },
    { key: p + '_constat', label: 'Constat', type: 'computed' }
  ];
}

// Génère les champs d'une ligne "grille" du panneau Calcul du débit (Locaux de charge)
function buildLocalChargeGrilleFields(i) {
  var p = 'grille' + i;
  return [
    { key: 'section_' + p, label: 'Grille n°' + i, type: 'section' },
    { key: p + '_largeur', label: 'Largeur (cm)', type: 'number' },
    { key: p + '_longueur', label: 'Longueur (cm)', type: 'number' },
    { key: p + '_diametre', label: 'Diamètre (cm)', type: 'number' },
    { key: p + '_debit_cone', label: "Débit mesuré à l'aide d'un cône (m³/h)", type: 'number' },
    { key: p + '_valeur_mesuree', label: 'Valeur mesurée (m/s)', type: 'number' },
    { key: p + '_debit_obtenu', label: 'Débit obtenu (m³/h)', type: 'computed' }
  ];
}

// Préremplissage N-1 (js/state.js createMissionFromPreviousSite) — inventaire VBA (rapso_modules/) :
// seuls 4 types ont un mécanisme dédié de rappel N-1 (contrairement au report intégral générique de
// Recopier_Les_Donnees.bas, qui recopie tout) — bras_aspiration (UserForm_BOA, "Evolution des
// valeurs"), extracteur et menuiserie (TextBoxFrC1TAB7/TAB8, "Débit année N-1"/"Débit année en
// cours"), cta (3 réseaux, mêmes colonnes que Inserer_Annexes.bas). Chaque paire { current, n1 }
// relie le champ "mesure de cette année" (calculé) à son champ N-1 correspondant (saisi
// manuellement) : le préremplissage y recopie la valeur "current" de la mission source, et le
// wizard (gwComputedBadge, js/wizard-engine.js) y lit la valeur N-1 pour l'afficher en rappel sous
// le champ calculé de l'année en cours.
var N1_COMPARISON_FIELDS = {
  bras_aspiration: [{ current: 'debit_calcule', n1: 'debit_precedent' }],
  extracteur: [{ current: 'debit_annee_en_cours', n1: 'debit_annee_n1' }],
  menuiserie: [{ current: 'debit_annee_en_cours', n1: 'debit_annee_n1' }],
  cta: [
    { current: 'neuf_debit', n1: 'neuf_debit_n1' },
    { current: 'souf_debit', n1: 'souf_debit_n1' },
    { current: 'rep_debit', n1: 'rep_debit_n1' }
  ]
};

var INSTALLATION_TYPES = [
  {
    id: 'bureaux', label: 'Bureaux / Salles de réunion', icon: 'building', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'reference_local', label: 'Référence du local', type: 'text' },
      { key: 'type_local', label: 'Type de local', type: 'select',
        options: ['Bureaux', 'Locaux Sans Travail Physique',
                  'Locaux de Restauration, Vente ou Réunion',
                  'Ateliers ou Locaux avec Travail Physique Léger',
                  'Autres ateliers et locaux',
                  'Local occupé occasionnellement'] },
      { key: 'volume', label: 'Volume (m³)', type: 'number' },
      { key: 'effectif', label: 'Effectif', type: 'number' },
      { key: 'volume_min', label: 'Volume minimal à respecter (m³)', type: 'computed' },
      { key: 'debit_min_air_neuf', label: "Débit minimum d'air neuf à respecter (m³/h)", type: 'computed' },

      { key: 'type_ventilation', label: 'Type de ventilation', type: 'select',
        options: ['Nat sans ouvrants', 'Nat avec ouvrants', 'Extraction', 'Soufflage', 'Double flux'] },

      { key: 'entree_air_permanente', label: "Présence d'entrée d'air permanente donnant directement sur l'extérieur", type: 'select',
        options: ['Oui', 'Non'],
        showIf: { key: 'type_ventilation', equals: 'Nat sans ouvrants' } },
      { key: 'ouvrant_exterieur', label: "Présence d'ouvrant donnant directement sur l'extérieur", type: 'select',
        options: ['Oui', 'Non'],
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage', 'Double flux'] } },
      { key: 'entree_air_exterieur', label: "Présence d'entrée d'air donnant directement sur l'extérieur", type: 'select',
        options: ['Oui', 'Non'],
        showIf: { key: 'ouvrant_exterieur', equals: 'Non' } },

      { key: 'debit_total_mesure', label: 'Débit total mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage'] } },
      { key: 'debit_soufflage', label: 'Débit soufflage mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', equals: 'Double flux' } },
      { key: 'debit_extraction', label: 'Débit extraction mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', equals: 'Double flux' } },
      { key: 'nombre_bouches', label: 'Nombre de bouches', type: 'number',
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage', 'Double flux'] } },
      { key: 'pourcentage_air_neuf', label: "Pourcentage d'air neuf (%)", type: 'number',
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },
      { key: 'debit_air_neuf_introduit', label: "Débit d'air neuf introduit (m³/h)", type: 'computed',
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },

      { key: 'etat_bouches', label: 'État des bouches', type: 'select',
        options: ['En bon état', 'A réparer'] },
      { key: 'type_ventilation_libelle', label: 'Type de ventilation (constat)', type: 'computed' },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis', label: "Avis (débit d'air neuf vs valeur à respecter)", type: 'computed' },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' }
    ]
  },
  {
    id: 'sanitaires', label: 'Sanitaires', icon: 'droplet', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment secteur', type: 'text' },
      { key: 'repere', label: 'Repère', type: 'text' },
      { key: 'nom_usage', label: 'Nom / Usage', type: 'select',
        options: ['chambre individuelle dans ERP', 'sanitaires', 'sanitaires Homme', 'sanitaires Homme-PMR',
                  'sanitaires Femme', 'sanitaires Femme-PMR', 'Vest.+San. Homme', 'Vest.+San. Femme',
                  'Douche', 'Douche Homme', 'Douche Femme', 'Vest. Homme', 'Vest. Femme'] },
      { key: 'chambre_erp_individuelle', label: 'Chambre individuelle dans ERP (débit limité à 15 m³/h)', type: 'select', options: ['Oui', 'Non'] },

      { key: 'section_equipement', label: 'Type d\u2019équipement', type: 'section' },
      { key: 'wc_urinoirs', label: 'WC / Urinoirs', type: 'number', showIf: { key: 'chambre_erp_individuelle', equals: 'Non' } },
      { key: 'douches', label: 'Douches', type: 'number', showIf: { key: 'chambre_erp_individuelle', equals: 'Non' } },
      { key: 'lavabos', label: 'Lavabos', type: 'number', showIf: { key: 'chambre_erp_individuelle', equals: 'Non' } },
      { key: 'individuel_collectif', label: 'Individuel ou Collectif', type: 'select', options: ['Individuel', 'Collectif'] },

      { key: 'section_extraction', label: 'Extraction', type: 'section' },
      { key: 'debit_mesure', label: 'Débit extraction mesuré (m³/h)', type: 'number' },
      { key: 'nombre_bouches', label: 'Nombre de bouches', type: 'number' },
      { key: 'type_ventilation', label: 'Type de ventilation', type: 'computed' },

      { key: 'section_bouches', label: 'État des bouches', type: 'section' },
      { key: 'etat_bouches', label: 'État des bouches', type: 'select', options: ['En bon état', 'A nettoyer', 'A réparer'] },

      { key: 'section_constat', label: 'Constat', type: 'section' },
      { key: 'debit_min_reglementaire', label: 'Débit minimal réglementaire (m³/h)', type: 'computed' },
      { key: 'avis', label: 'Avis par rapport aux valeurs réglementaires', type: 'computed' },
      { key: 'observation', label: 'Commentaires', type: 'textarea' }
    ]
  },
  {
    id: 'locaux_fumeurs', label: 'Locaux fumeurs', icon: 'building', implemented: true,
    // ⚠️ NON VÉRIFIÉ TERRAIN — reconstruit depuis le VBA seul, à confirmer
    // dès qu'un rapport réel de ce type sera disponible.
    // Checklist réglementaire à 21 critères fidèle à UserForm_LOCFUMEUR (CB1-CB21), extraite via
    // oletools.oleform (captions des Label associés à chaque CB). Voir aeration_word_export_schema_gaps
    // (mémoire) pour le détail des repères VBA.
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'reference_equipement', label: 'Référence équipement', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },

      { key: 'section_local', label: 'Local', type: 'section' },
      { key: 'critere_local_clos', label: "Les emplacements réservés comme locaux fumeurs sont des salles closes, affectées à la consommation de tabac", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_aucune_prestation', label: "Aucune prestation de service n'est délivrée dans la salle", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_entretien_apres_renouvellement', label: "Prise en compte dans l'organisation qu'aucune tâche d'entretien et de maintenance ne puisse y être exécutée sans que l'air ait été renouvelé, en l'absence de tout occupant, pendant au moins une heure", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_pas_lieu_passage', label: "La salle fumeur ne constitue pas un lieu de passage", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_fermetures_auto', label: "Le local est doté de fermetures automatiques sans possibilité d'ouverture non intentionnelle", type: 'select', options: OPT_CRITERE_LOCFUMEUR },

      { key: 'section_dimensions', label: 'Dimensions', type: 'section' },
      { key: 'largeur', label: 'Largeur (m)', type: 'number' },
      { key: 'longueur', label: 'Longueur (m)', type: 'number' },
      { key: 'hauteur', label: 'Hauteur (m)', type: 'number' },
      { key: 'surface', label: 'Surface du local (m²)', type: 'computed' },
      { key: 'volume', label: 'Volume du local (m³)', type: 'computed' },
      { key: 'surface_etablissement', label: "Superficie totale de l'établissement (m²)", type: 'number' },
      { key: 'crit_surface_35', label: 'Superficie du local < 35 m²', type: 'computed' },
      { key: 'crit_ratio_20', label: "Superficie ≤ 20 % de la superficie de l'établissement", type: 'computed' },

      { key: 'section_ventilation', label: 'Ventilation mécanique', type: 'section' },
      { key: 'critere_ventilation_mecanique', label: "Salle équipée d'un dispositif d'extraction d'air par ventilation mécanique", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_rejet_exterieur', label: "Rejet d'air à l'extérieur", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_rejet_distance_passage', label: "Rejet d'air à bonne distance des lieux de passage de personnes", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_rejet_distance_prises_air', label: "Rejet d'air à bonne distance des prises d'air frais ou des ouvertures", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'debit_extraction', label: "Débit d'extraction mesuré (m³/h)", type: 'number' },
      { key: 'critere_reprise_totale', label: 'Reprise totale (m³/h) — avis', type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'taux_renouvellement', label: "Taux de renouvellement d'air (vol/h)", type: 'computed' },
      { key: 'crit_renouvellement', label: 'Taux de renouvellement ≥ 10 vol/h', type: 'computed' },
      { key: 'critere_ventilation_independante', label: "La ventilation est entièrement indépendante du système de ventilation ou de climatisation d'air du bâtiment", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_depression', label: "Le local est maintenu en dépression continue d'au moins cinq pascals par rapport aux pièces communicantes", type: 'select', options: OPT_CRITERE_LOCFUMEUR },

      { key: 'section_attestations', label: 'Attestations et entretien', type: 'section' },
      { key: 'critere_attestation_installateur', label: "L'installateur ou la personne assurant la maintenance du dispositif de ventilation mécanique atteste que celui-ci permet de respecter les exigences de ventilation", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_attestation_disponible', label: "Le responsable de l'établissement est tenu de produire cette attestation à l'occasion de tout contrôle : le document est en possession du chef d'établissement", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_entretien_regulier', label: "Le responsable de l'établissement est tenu de faire procéder à l'entretien régulier de la ventilation", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_consultation_chsct', label: "La mise à disposition d'un emplacement à la disposition des fumeurs et ses modalités de mise en œuvre sont soumises à la consultation du comité d'hygiène et de sécurité et des conditions de travail (avant sa mise en œuvre, puis tous les 2 ans)", type: 'select', options: OPT_CRITERE_LOCFUMEUR },

      { key: 'section_panneaux', label: 'Signalétique', type: 'section' },
      { key: 'critere_panneau_zone_fumeur', label: "Le panneau d'avertissement de la zone fumeur est présent", type: 'select', options: OPT_CRITERE_LOCFUMEUR },
      { key: 'critere_panneau_interdiction', label: "Le panneau d'interdiction de fumer dans les autres zones est présent", type: 'select', options: OPT_CRITERE_LOCFUMEUR },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis_csp', label: 'Avis par rapport aux critères du code de la santé publique', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'cta', label: 'CTA (Centrale de traitement d\u2019air)', icon: 'tool', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'locaux_alimentes', label: 'Locaux alimentés', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Réf. de l\u2019équipement et/ou Implantation', type: 'text' },
      { key: 'mode_fonctionnement', label: 'Mode de fonctionnement', type: 'select',
        options: ['AIR NEUF / AIR RECYCLE', 'AIR NEUF UNIQUEMENT'] },

      { key: 'section_visuel', label: 'État du reste de l\u2019installation', type: 'section' },
      { key: 'etat_general', label: 'État général (propreté, corrosion, chocs, etc.)', type: 'select',
        options: ['Bon état général', 'Traces de corrosion', 'Les portes de la CTA sont déformées (difficultés de fermeture)', 'A réparer', 'CTA non ouverte'] },
      { key: 'prise_air_neuf', label: 'Prise d\u2019air neuf', type: 'select',
        options: ['Satisfaisant', 'A nettoyer', 'A réparer', 'Non observée'] },
      { key: 'batterie_froide', label: 'Batterie(s) froide(s)', type: 'select',
        options: ['Satisfaisant', 'Non Observée', 'Fuite de fluide', 'Corrosion', 'A réparer'] },
      { key: 'batterie_chaude', label: 'Batterie(s) chaude(s)', type: 'select',
        options: ['Satisfaisant', 'Non Observée', 'Fuite de fluide', 'Corrosion', 'A réparer'] },
      { key: 'canalisations_gaines', label: 'Canalisations / Gaines', type: 'select',
        options: ['Bon état', 'A réparer', 'Identification des gaines à prévoir + sens fluide'] },
      { key: 'ventilateur_courroie', label: 'Ventilateur / Courroie', type: 'select',
        options: ['Bon état général', 'Le moteur n\u2019utilise pas de courroie', 'Courroie distendue', 'Courroie à remplacer', 'Courroie rompue', 'Non observé'] },
      { key: 'fiche_maintenance', label: 'Fiche de Maintenance', type: 'select',
        options: ['Absence de fiche de maintenance', 'Dernière intervention de maintenance'] },
      { key: 'date_derniere_maintenance', label: 'Date de la dernière intervention de maintenance', type: 'text',
        showIf: { key: 'fiche_maintenance', equals: 'Dernière intervention de maintenance' } },

      { key: 'section_filtration', label: 'Filtration', type: 'section' },
      { key: 'afficher_filtration', label: 'Afficher la filtration', type: 'select', options: ['Oui', 'Non'] }
    ]
      .concat(buildCtaFiltreFields('filt_pre', 'Pré-filtre', true))
      .concat(buildCtaFiltreFields('filt_filtre', 'Filtre', true))
      .concat(buildCtaFiltreFields('filt_absolu', 'Filtre absolu', false))
      .concat(buildCtaReseauFields('neuf', 'neuf', false))
      .concat(buildCtaReseauFields('souf', 'soufflé', false))
      .concat(buildCtaReseauFields('rep', 'repris', true))
      .concat([
        { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
        { key: 'avis', label: 'Avis par rapport aux données constructeurs', type: 'select', options: OPT_SATISFAISANT },
        { key: 'observation', label: 'Observations', type: 'textarea' }
      ])
  },
  {
    id: 'extracteur', label: 'Extracteur', icon: 'zap', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'locaux_extraits', label: 'Locaux extraits', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: "Référence de l'équipement", type: 'text' },

      { key: 'section_gaine', label: 'Section', type: 'section' },
      { key: 'forme_section', label: 'Forme de la section', type: 'select', options: ['Circulaire', 'Rectangulaire'] },
      { key: 'diametre_cote1', label: 'Diamètre ou côte 1 (cm)', type: 'number' },
      { key: 'cote2', label: 'Côte 2 (cm)', type: 'number', showIf: { key: 'forme_section', equals: 'Rectangulaire' } },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'computed' },
      { key: 'vitesse_mode', label: 'Saisie de la vitesse', type: 'select', options: ['Vitesse moyenne directe', 'Grille de points'] },
      { key: 'vitesse_nb_axes', label: "Nombre d'axes", type: 'number', showIf: { key: 'vitesse_mode', equals: 'Grille de points' } },
      { key: 'vitesse_nb_points', label: 'Nombre de points par axe', type: 'number', showIf: { key: 'vitesse_mode', equals: 'Grille de points' } },
      { key: 'vitesse_grid', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid', colsKey: 'vitesse_nb_points', rowsKey: 'vitesse_nb_axes', showIf: { key: 'vitesse_mode', equals: 'Grille de points' }, pointEntry: true },
      { key: 'vitesse', label: 'Vitesse (m/s)', type: 'number', showIf: { key: 'vitesse_mode', equals: 'Vitesse moyenne directe' } },
      { key: 'vitesse_moyenne_grille', label: 'Vitesse moyenne calculée (m/s)', type: 'computed', showIf: { key: 'vitesse_mode', equals: 'Grille de points' } },

      { key: 'section_debit', label: 'Débit', type: 'section' },
      { key: 'valeur_reference_recommandee', label: 'Valeur de référence ou recommandée (m³/h)', type: 'number' },
      { key: 'debit_annee_n1', label: 'Débit année N-1 (m³/h)', type: 'number' },
      { key: 'debit_annee_en_cours', label: 'Débit année en cours (m³/h)', type: 'computed' },
      { key: 'avis_constructeur', label: 'Avis par rapport aux données constructeur', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_local', label: 'Taux de renouvellement du local (optionnel)', type: 'section' },
      { key: 'afficher_taux', label: 'Afficher le taux de renouvellement', type: 'select', options: ['Oui', 'Non'] },
      { key: 'valeur_recommandee', label: 'Valeur recommandée (vol/h)', type: 'number', showIf: { key: 'afficher_taux', equals: 'Oui' } },
      { key: 'referentiel', label: 'Référentiel', type: 'text', showIf: { key: 'afficher_taux', equals: 'Oui' } },
      { key: 'volume_local', label: 'Volume du local (m³)', type: 'number', showIf: { key: 'afficher_taux', equals: 'Oui' } },
      { key: 'volume_par_heure', label: 'Volume par heure (vol/h)', type: 'computed', showIf: { key: 'afficher_taux', equals: 'Oui' } },
      { key: 'conclusion_taux', label: 'Conclusion taux de renouvellement', type: 'computed', showIf: { key: 'afficher_taux', equals: 'Oui' } },

      { key: 'section_conduit', label: 'Mesure dans le conduit', type: 'section' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed' },
      { key: 'photo', label: 'Photo', type: 'photo' }
    ]
  },
  {
    id: 'erp', label: 'ERP', icon: 'building', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'reference_local', label: 'Référence du local', type: 'text' },
      { key: 'type_local', label: 'Type de local', type: 'select',
        options: ['Bureaux', 'Locaux Sans Travail Physique',
                  'Locaux de Restauration, Vente ou Réunion',
                  'Ateliers ou Locaux avec Travail Physique Léger',
                  'Autres ateliers et locaux',
                  'Locaux d\u2019hébergement (chambre de une ou deux personnes)',
                  'Locaux d\u2019hébergement (chambres collectives, dortoirs, cellules — plus de 3 personnes)',
                  'Local occupé occasionnellement'] },
      { key: 'volume', label: 'Volume (m³)', type: 'number' },
      { key: 'travailleur', label: 'Nombre de travailleurs', type: 'number' },
      { key: 'public', label: 'Nombre de public', type: 'number' },
      { key: 'volume_min', label: 'Volume minimal à respecter (m³)', type: 'computed' },
      { key: 'debit_min_air_neuf', label: "Débit minimum d'air neuf à respecter (m³/h)", type: 'computed' },

      { key: 'type_ventilation', label: 'Type de ventilation', type: 'select',
        options: ['Nat sans ouvrants', 'Nat avec ouvrants', 'Extraction', 'Soufflage', 'Double flux'] },
      { key: 'entree_air_permanente', label: "Présence d'entrée d'air permanente donnant directement sur l'extérieur", type: 'select',
        options: ['Oui', 'Non'],
        showIf: { key: 'type_ventilation', equals: 'Nat sans ouvrants' } },
      { key: 'ouvrant_exterieur', label: "Présence d'ouvrant donnant directement sur l'extérieur", type: 'select',
        options: ['Oui', 'Non'],
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage', 'Double flux'] } },
      { key: 'entree_air_exterieur', label: "Présence d'entrée d'air donnant directement sur l'extérieur", type: 'select',
        options: ['Oui', 'Non'],
        showIf: { key: 'ouvrant_exterieur', equals: 'Non' } },
      { key: 'debit_total_mesure', label: 'Débit total mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage'] } },
      { key: 'debit_soufflage', label: 'Débit soufflage mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', equals: 'Double flux' } },
      { key: 'debit_extraction', label: 'Débit extraction mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', equals: 'Double flux' } },
      { key: 'nombre_bouches', label: 'Nombre de bouches', type: 'number',
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage', 'Double flux'] } },
      { key: 'pourcentage_air_neuf', label: "Pourcentage d'air neuf (%)", type: 'number',
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },
      { key: 'debit_air_neuf_introduit', label: "Débit d'air neuf introduit (m³/h)", type: 'computed',
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },
      // Le VBA (UserForm ERP, CheckBox18-20) a 3 options pour l'état des bouches ;
      // le libellé exact de la 3e est introuvable dans les sources disponibles (cf.
      // aeration_word_export_schema_gaps.md). Ne pas deviner — à confirmer par un
      // rapport terrain avant ajout.
      { key: 'etat_bouches', label: 'État des bouches', type: 'select',
        options: ['En bon état', 'A réparer'],
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage', 'Double flux'] } },
      { key: 'type_ventilation_libelle', label: 'Type de ventilation (constat)', type: 'computed' },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis', label: 'Avis', type: 'computed' },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' }
    ]
  },
  {
    id: 'sorbonnes', label: 'Sorbonnes', icon: 'flask', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Activité et référence du local', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement et/ou implantation', type: 'text' },
      { key: 'photo', label: 'Photo', type: 'photo' },

      { key: 'section_mesures', label: 'Mesures', type: 'section' },
      { key: 'temperature', label: 'Température (°C)', type: 'number' },
      { key: 'hygrometrie', label: 'Hygrométrie (%)', type: 'number' },
      { key: 'pression_atmospherique', label: 'Pression atmosphérique (hPa)', type: 'number' },
      { key: 'difference_pression', label: 'Différence de pression (Pa) entre le local et son environnement', type: 'number' },
      { key: 'appareils_mesure', label: 'Appareils de mesure utilisés', type: 'text' },

      { key: 'section_contexte', label: 'Contexte de mesures', type: 'section' },
      { key: 'local', label: 'Local', type: 'select', options: ['Grande taille', 'Taille moyenne', 'Exigu'] },
      { key: 'paillasse', label: 'Paillasse', type: 'select', options: ['Libre', 'Partiellement encombrée', 'Encombrée'] },
      { key: 'ouvrants', label: 'Ouvrants', type: 'select', options: ['Portes et fenêtres closes', 'Porte (ou Fenêtre) ouverte'] },
      { key: 'obstacle_point_mesure', label: 'Obstacle gênant la réalisation d\u2019un point', type: 'select', options: ['Oui', 'Non'] },
      { key: 'autres_sorbonnes', label: 'Autre(s) sorbonne(s) en fonctionnement', type: 'select', options: ['Oui', 'Non'] },
      { key: 'autres_dispositifs', label: 'Autre(s) dispositif(s) de ventilation', type: 'select', options: ['Oui', 'Non'] },

      { key: 'section_fumigene', label: 'Test au fumigène', type: 'section' },
      { key: 'zones_turbulentes', label: 'Présence de zones turbulentes', type: 'select', options: ['Oui', 'Non'] },
      { key: 'zones_mortes', label: 'Présence de zones mortes', type: 'select', options: ['Oui', 'Non'] },
      { key: 'perturbations', label: 'Le test au fumigène met-il en évidence des perturbations susceptibles de gêner le bon fonctionnement de la sorbonne ?', type: 'select', options: ['Oui', 'Non'] },
      { key: 'v90_mesuree', label: 'Vitesse (m/s) distance 90 cm (recommandation < 0,2 m/s)', type: 'number', showIf: { key: 'perturbations', equals: 'Non' } },
      { key: 'v140_mesuree', label: 'Vitesse (m/s) distance 140 cm (recommandation < 0,2 m/s)', type: 'number', showIf: { key: 'perturbations', equals: 'Non' } },

      { key: 'remarques_complementaires', label: 'Remarques complémentaires', type: 'select',
        options: ['-', 'défaut d\u2019aspiration de la sorbonne', 'La sorbonne est mal entretenue', 'Etat défectueux de la gaine', 'la sorbonne est encombrée'] },

      { key: 'section_ouverture', label: 'Ouverture de travail', type: 'section' },
      { key: 'largeur_mm', label: 'Largeur (mm)', type: 'number' },
      { key: 'annee_construction', label: 'Ouverture de travail h (mm) en fonction de l\u2019année de construction de la sorbonne', type: 'select',
        options: ['Avant janvier 2005 - Norme XP X15-203 (h=400mm)', 'Après janvier 2005 - Norme NF EN 14175-4 (h=500mm)', 'Autre'] },
      { key: 'h_mm_autre', label: 'Ouverture de travail h (mm) — valeur autre', type: 'number', showIf: { key: 'annee_construction', equals: 'Autre' } },
      { key: 'h_mm', label: 'Ouverture de travail h (mm)', type: 'computed' },
      { key: 'surface_ouverture', label: 'Surface de l\u2019ouverture (m²)', type: 'computed' },
      { key: 'espace_horizontal', label: 'Espace horizontal l entre 2 points (mm)', type: 'computed' },
      { key: 'espace_vertical', label: 'Espace vertical h entre 2 points (mm)', type: 'computed' },
      { key: 'nb_colonnes', label: 'Nombre de colonnes de points (selon la largeur)', type: 'computed' },

      { key: 'section_securite', label: 'Dispositif de sécurité', type: 'section' },
      { key: 'verrouillage_paroi', label: 'Verrouillage de la paroi vitrée (butée)', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'parachute_paroi', label: 'Parachute sur la paroi vitrée', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'mesure_vitesse_frontale', label: 'Mesure de la vitesse frontale', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'alarme_sonore', label: 'Alarme sonore', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'alarme_visuelle', label: 'Alarme visuelle', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'eclairage_interieur', label: 'Eclairage à l\u2019intérieur du volume', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },

      { key: 'section_grille', label: 'Relevé des vitesses mesurées dans le plan d\u2019ouverture', type: 'section' },
      { key: 'nb_lignes', label: 'Nombre de lignes', type: 'computed' },
      { key: 'grille', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid', rowsKey: 'nb_lignes', colsKey: 'nb_colonnes', rowLabel: 'Ligne', colLabel: 'Colonne', pointEntry: true },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' },

      { key: 'section_resultats', label: 'Résultats (guide INRS ED 795)', type: 'section' },
      { key: 'vitesse_min_mesuree', label: 'Vitesse minimale — Valeur mesurée (m/s)', type: 'computed' },
      { key: 'vitesse_min_reference', label: 'Vitesse minimale — Valeur de référence (m/s, « / » si aucune)', type: 'text' },
      { key: 'vitesse_min_avis_reference', label: 'Vitesse minimale — Avis / valeurs de référence', type: 'computed' },
      { key: 'vitesse_min_avis_norme', label: 'Vitesse minimale — Avis / ED795 de l\u2019INRS', type: 'computed' },
      { key: 'vitesse_moy_mesuree', label: 'Vitesse moyenne — Valeur mesurée (m/s)', type: 'computed' },
      { key: 'vitesse_moy_reference', label: 'Vitesse moyenne — Valeur de référence (m/s, « / » si aucune)', type: 'text' },
      { key: 'vitesse_moy_avis_reference', label: 'Vitesse moyenne — Avis / valeurs de référence', type: 'computed' },
      { key: 'debit_mesure', label: 'Débit d\u2019air extrait — Valeur mesurée (m³/h)', type: 'computed' },
      { key: 'debit_reference', label: 'Débit d\u2019air extrait — Valeur de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'debit_avis_reference', label: 'Débit d\u2019air extrait — Avis / valeurs de référence', type: 'computed' }
    ]
  },
  {
    id: 'hottes', label: 'Hottes', icon: 'flask', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      // Optionnel : colonne marquée "ne pas prendre en compte" dans le classeur Excel d'origine, et
      // vue systématiquement vide ("/") sur tous les rapports de référence analysés — à ne pas rendre
      // obligatoire côté saisie.
      { key: 'date_installation', label: "Date d'installation (optionnel)", type: 'text', optional: true },
      { key: 'date_mesure', label: 'Date de mesure', type: 'text' },
      { key: 'reference_equipement', label: "Réf. de l'équipement et/ou implantation", type: 'text' },

      { key: 'etat_visuel_reseau', label: "État visuel du réseau d'aspiration", type: 'select',
        options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués'] },
      { key: 'test_fumigene', label: 'Test fumigène', type: 'select',
        options: ['Toute la fumée a été aspirée',
                  "On observe des irrégularités lors de l'aspiration des fumées",
                  'On constate un phénomène de rétrodiffusion des fumées',
                  'Aucune aspiration',
                  'Non réalisé'] },

      { key: 'mesures_choisies', label: 'Mesures choisies', type: 'checkbox-group',
        options: ["Vitesse au point d'émission", 'Vitesse de transport'] },

      { key: 'section_vpe', label: "Vitesse au point d'émission — plan d'ouverture", type: 'section',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_largeur_cm', label: 'Largeur (cm)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_hauteur_cm', label: 'Hauteur (cm)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_nb_points_largeur', label: 'Nombre de points sur la largeur (max 5)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_nb_points_hauteur', label: 'Nombre de points sur la hauteur (max 5)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_grid', label: 'Valeurs mesurées (m/s) — saisir « / » pour exclure un point', type: 'grid',
        colsKey: 'vpe_nb_points_largeur', rowsKey: 'vpe_nb_points_hauteur', pointEntry: true,
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },

      { key: 'vpe_min', label: 'Vitesse minimale mesurée (m/s)', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_moyenne', label: 'Vitesse moyenne mesurée (m/s)', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_debit', label: "Débit d'air extrait (m³/h)", type: 'computed',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },

      { key: 'vpe_min_reference', label: 'Vitesse minimale — valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_min_inrs', label: 'Vitesse minimale — valeur recommandée guide INRS (ED 695)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'avis_vpe_min', label: 'Avis vitesse minimale', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },

      { key: 'vpe_moy_reference', label: 'Vitesse moyenne — valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_moy_inrs', label: 'Vitesse moyenne — valeur recommandée guide INRS (ED 695)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'avis_vpe_moy', label: 'Avis vitesse moyenne', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },

      { key: 'operateur_hors_volume',
        label: "L'opérateur est situé en dehors du volume entre le point d'émission et le captage",
        type: 'select', options: ['Conforme', 'Non Conforme'],
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },

      { key: 'section_vt', label: 'Vitesse de transport', type: 'section',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_type_polluant', label: 'Type de polluants', type: 'select',
        options: ['Gaz et vapeurs', 'Fumées', 'Poussières très fines et légères',
                  'Poussières sèches et poudres', 'Poussières industrielles moyennes',
                  'Poussières lourdes', 'Poussières lourdes ou humides'],
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_inrs', label: 'Valeur recommandée guide INRS ED 695 (m/s)', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_mesuree', label: 'Valeur mesurée (m/s)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_reference', label: 'Valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'avis_vt', label: 'Avis vitesse de transport', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'conclusion',
        label: "Le dispositif doit satisfaire aux préconisations indiquées par l'INRS — avis par rapport à ces préconisations",
        type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'photo', label: 'Photo', type: 'photo' }
    ]
  },
  {
    id: 'bras_aspiration', label: 'Bras d\u2019aspiration', icon: 'zap', implemented: true,
    // Le paragraphe réglementaire "Non respect du code du travail pour le recyclage" (quand
    // Recyclage = Oui) est entièrement fixe côté VBA (Caller_Conclusion_BOA) — pas de critère
    // supplémentaire à saisir, contrairement à ce qu'on pensait initialement. Rendu géré directement
    // dans export-word.js (buildAnnexeBrasAspiration) à partir du seul champ 'recyclage' déjà présent.
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'activite', label: 'Activité', type: 'text' },
      { key: 'atelier', label: 'Atelier', type: 'text' },
      { key: 'reference_equipement', label: 'Référence équipement', type: 'text' },
      { key: 'adapte_situation', label: 'Adapté à la situation', type: 'select', options: ['Oui', 'Non'] },
      { key: 'commentaire_1', label: 'Commentaire', type: 'textarea' },
      { key: 'recyclage', label: 'Recyclage', type: 'select', options: ['Oui', 'Non'] },
      { key: 'etat_visuel', label: 'État visuel', type: 'select', options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués'] },
      { key: 'etat_conduits', label: 'État des conduits aérauliques', type: 'select', options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués'] },
      { key: 'test_fumigene', label: 'Test fumigène — Visualisation fumigène à 20 cm', type: 'text' },
      { key: 'conditions_dispersion', label: 'Conditions de dispersion du polluant', type: 'select',
        options: ['Emission passive en air calme', 'Emission à faible vitesse en air calme',
                  'Emission à faible vitesse en air modérément calme', 'Génération active en zone calme',
                  'Génération active en zone agitée', 'Projection à grande vitesse'] },

      { key: 'section_bouche', label: "Bouche d'aspiration", type: 'section' },
      { key: 'type_bouche', label: 'Type de bouche d\u2019aspiration', type: 'select', options: ['Sans collerette', 'Avec collerette'] },
      { key: 'forme_bouche', label: 'Forme de la bouche', type: 'select', options: ['Circulaire', 'Ovale', 'Autre (surface connue)'] },
      { key: 'diametre_bouche', label: 'Diamètre de la bouche (cm)', type: 'number', showIf: { key: 'forme_bouche', equals: 'Circulaire' } },
      { key: 'largeur_bouche_ovale', label: 'Largeur de la bouche si ovale (cm)', type: 'number', showIf: { key: 'forme_bouche', equals: 'Ovale' } },
      { key: 'longueur_bouche_ovale', label: 'Longueur de la bouche si ovale (cm)', type: 'number', showIf: { key: 'forme_bouche', equals: 'Ovale' } },
      { key: 'surface_bouche_autre', label: 'Surface de la bouche (m²)', type: 'number', showIf: { key: 'forme_bouche', equals: 'Autre (surface connue)' } },
      { key: 'surface_bouche', label: 'Surface de la bouche calculée (m²)', type: 'computed' },
      { key: 'diametre_conduit', label: 'Diamètre du conduit (cm)', type: 'number' },
      { key: 'localisation_point_mesure', label: 'Localisation du point de mesure', type: 'text' },
      { key: 'diametre_bras_cone', label: 'Diamètre du bras au niveau du cône (cm)', type: 'number' },

      { key: 'section_mesures', label: 'Mesures', type: 'section' },
      { key: 'vitesse_moyenne', label: 'Vitesse moyenne mesurée (m/s)', type: 'number' },
      { key: 'debit_calcule', label: 'Débit calculé (m³/h)', type: 'computed' },
      { key: 'vitesse_captage', label: 'Vitesse de captage recherchée (m/s)', type: 'number' },
      { key: 'distance_max_captage', label: 'Distance maximum de captage (cm)', type: 'computed' },
      { key: 'distance_utilisation', label: "Distance d'utilisation (cm)", type: 'number' },
      { key: 'conclusion_distance', label: 'Conclusion distance de captage', type: 'computed' },

      { key: 'section_evolution', label: 'Évolution des valeurs', type: 'section' },
      { key: 'debit_precedent', label: 'Débit mesuré précédemment (m³/h)', type: 'number' },
      { key: 'evolution_pct', label: 'Évolution (%)', type: 'computed' },
      { key: 'commentaire_2', label: 'Commentaire', type: 'textarea' },

      { key: 'conclusion', label: 'Conclusion', type: 'textarea' }
    ]
  },
  {
    id: 'cabines_peinture', label: 'Cabines de peinture', icon: 'building', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'marque', label: 'Marque', type: 'text' },
      { key: 'type_cabine', label: 'Type de cabine', type: 'select', options: ['Fermée', 'Ouverte', 'Semi-fermée'] },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Description de la cabine', type: 'text' },
      { key: 'photo', label: 'Photo de l\u2019installation', type: 'photo' },
      { key: 'type_flux', label: 'Type de flux', type: 'select', options: ['Verticale', 'Horizontale'] },
      { key: 'nature_produits', label: 'Nature des produits à peindre', type: 'text' },
      { key: 'pulverisation', label: 'Pulvérisation', type: 'select', options: ['Liquide', 'Poudre'] },
      { key: 'zone_travail', label: 'Zone de travail', type: 'text' },

      { key: 'section_visuel', label: 'Contrôle visuel', type: 'section' },
      { key: 'etat_visuel_cabine', label: 'État visuel de la cabine', type: 'select', options: ['Satisfaisant', 'Non Satisfaisant', 'Impossible de se prononcer'] },
      { key: 'direction_flux', label: 'Vérification de la direction du flux (test fumigène)', type: 'select',
        options: ['Toute la fumée a été aspirée', 'On observe des irrégularités lors de l\u2019aspiration des fumées',
                  'On constate un phénomène de rétrodiffusion des fumées', 'Aucune aspiration', 'Non réalisé'] },
      { key: 'etat_filtres', label: 'État des filtres', type: 'select', options: ['Satisfaisant', 'Non Satisfaisant', 'Impossible de se prononcer'] },
      { key: 'observation_visuel', label: 'Observation', type: 'textarea' },

      { key: 'section_dimensions', label: 'Mesure de la cabine vide', type: 'section' },
      { key: 'largeur_cabine', label: 'Largeur (m)', type: 'number' },
      { key: 'longueur_cabine', label: 'Longueur (m)', type: 'number' },
      { key: 'vitesse_nb_axes', label: 'Nombre d’axes', type: 'number' },
      { key: 'vitesse_nb_points', label: 'Nombre de points par axe', type: 'number' },
      { key: 'vitesse_grid', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid', colsKey: 'vitesse_nb_points', rowsKey: 'vitesse_nb_axes', pointEntry: true },
      { key: 'vitesse_moyenne_grille', label: 'Vitesse moyenne calculée (m/s)', type: 'computed' },

      { key: 'section_v1', label: 'Vitesse d\u2019air — Vitesse moyenne', type: 'section' },
      { key: 'v1_mesuree', label: 'Valeur mesurée (m/s)', type: 'number' },
      { key: 'v1_reference', label: 'Valeur de référence (m/s, « / » si aucune)', type: 'text' },
      { key: 'v1_valeur_recommandee', label: 'Valeur recommandée (m/s)', type: 'number' },
      { key: 'v1_recommandee_par', label: 'Valeur recommandée par (ex : Norme 16985, guide INRS ED 835/ED 928)', type: 'text' },
      { key: 'v1_avis', label: 'Avis par rapport aux valeurs de référence', type: 'computed' },

      { key: 'section_v2', label: 'Vitesse d\u2019air — Vitesse minimale', type: 'section' },
      { key: 'v2_active', label: 'Ajouter la vitesse minimale', type: 'select', options: ['Oui', 'Non'] },
      { key: 'v2_mesuree', label: 'Valeur mesurée (m/s)', type: 'number', showIf: { key: 'v2_active', equals: 'Oui' } },
      { key: 'v2_reference', label: 'Valeur de référence (m/s, « / » si aucune)', type: 'text', showIf: { key: 'v2_active', equals: 'Oui' } },
      { key: 'v2_valeur_recommandee', label: 'Valeur recommandée (m/s)', type: 'number', showIf: { key: 'v2_active', equals: 'Oui' } },
      { key: 'v2_recommandee_par', label: 'Valeur recommandée par', type: 'text', showIf: { key: 'v2_active', equals: 'Oui' } },
      { key: 'v2_avis', label: 'Avis par rapport aux valeurs de référence', type: 'computed', showIf: { key: 'v2_active', equals: 'Oui' } },

      { key: 'section_debit', label: 'Débit d\u2019air dans la cabine vide', type: 'section' },
      { key: 'debit_mesure', label: 'Débit mesuré (m³/h)', type: 'number' },
      { key: 'debit_reference', label: 'Débit de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'debit_avis', label: 'Avis par rapport aux valeurs de référence', type: 'computed' },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'conclusion', label: 'Avis global', type: 'computed' },
      { key: 'observations', label: 'Observations', type: 'textarea' },

      { key: 'section_conduit', label: 'Mesure dans le conduit', type: 'section' },
      { key: 'gaine', label: 'Gaine', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed' }
    ]
  },
  {
    id: 'installations_diverses', label: 'Installations diverses', icon: 'tool', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'type_installation', label: "Type d'installation", type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: "Référence de l'équipement", type: 'text' },
      { key: 'etat_visuel_reseau', label: "État visuel du réseau d'aspiration", type: 'select',
        options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués'] },
      { key: 'test_fumigene', label: 'Test fumigène', type: 'select',
        options: ['Toute la fumée a été aspirée',
                  "On observe des irrégularités lors de l'aspiration des fumées",
                  'On constate un phénomène de rétrodiffusion des fumées',
                  'Aucune aspiration', 'Non réalisé'] },

      { key: 'mesures_choisies', label: 'Mesures choisies', type: 'checkbox-group',
        options: ["Vitesse au point d'émission", 'Vitesse de transport'] },

      { key: 'section_vpe', label: "Vitesse au point d'émission", type: 'section',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_mesuree', label: 'Valeur mesurée (m/s)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_conditions_dispersion', label: 'Condition de dispersion du polluant', type: 'select',
        options: ['Emission passive en air calme', 'Emission à faible vitesse en air calme',
                  'Emission à faible vitesse en air modérément calme', 'Génération active en zone calme',
                  'Génération active en zone agitée', 'Emission à grande vitesse initiale dans une zone à mouvement d\u2019air très rapide'],
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_reference', label: 'Valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_inrs', label: 'Valeur recommandée guide INRS (ED 695) (m/s)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'avis_vpe', label: "Avis vitesse au point d'émission", type: 'computed',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },

      { key: 'section_vt', label: 'Vitesse de transport', type: 'section',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_type_polluant', label: 'Type de polluants', type: 'select',
        options: ['Gaz et vapeurs', 'Fumées', 'Poussières très fines et légères',
                  'Poussières sèches et poudres', 'Poussières industrielles moyennes',
                  'Poussières lourdes', 'Poussières lourdes ou humides'],
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_inrs', label: 'Valeur recommandée guide INRS ED 695 (m/s)', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_mesuree', label: 'Valeur mesurée (m/s)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_reference', label: 'Valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'avis_vt', label: 'Avis vitesse de transport', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis', label: 'Avis par rapport aux valeurs de référence', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },
      { key: 'remarque', label: 'Remarque', type: 'textarea' },

      { key: 'section_conduit', label: 'Mesure dans le conduit', type: 'section' },
      { key: 'gaine', label: 'Gaine', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed' }
    ]
  },
  {
    id: 'gaz_echappement', label: 'Gaz d\u2019échappement', icon: 'zap', implemented: true,
    fields: [
      { key: 'section_type_equipement', label: 'Type d’équipement', type: 'section' },
      { key: 'type_vehicule', label: 'Type', type: 'select',
        options: ['VEHICULE LEGER', 'POIDS-LOURD et BUS', 'LOCOMOTIVE (SNCF)', 'OUTILLAGE PORTATIF', 'AUTRES'] },
      { key: 'type_vehicule_autre', label: 'Préciser', type: 'text', showIf: { key: 'type_vehicule', equals: 'AUTRES' } },
      { key: 'type_captage', label: 'Type de captage', type: 'select',
        options: ['Captage enveloppant (fixé à l’échappement)', 'Captage récepteur (non fixé à l’échappement)'] },

      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'atelier', label: 'Atelier', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Réf. équipement et/ou implantation', type: 'text' },
      { key: 'type_captage_adapte', label: 'Type de captage adapté à la situation', type: 'select', options: ['Oui', 'Non'] },
      // "Le système de fixation est hors-service", "La gaine est trouée" et "Bon état" confirmés
      // verbatim par plusieurs rapports de référence réels (ex. EK2L0_25_1909, ek2l0_1910).
      // "Le réseau est encrassé" vient de la lecture directe de la feuille LISTE du classeur VBA
      // (source fiable) mais n'a pas été vu coché sur un rapport réel échantillonné — à vérifier en
      // priorité si un dossier réel montre un jour "réseau encrassé" coché.
      { key: 'etat_visuel_installations', label: 'État visuel des installations', type: 'checkbox-group',
        options: ['Le réseau est encrassé', 'Le système de fixation est hors-service', 'La gaine est trouée', 'Bon état', 'Autres'] },
      { key: 'etat_visuel_si_autres', label: 'Si autres', type: 'text', showIf: { key: 'etat_visuel_installations', contains: 'Autres' } },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' },

      { key: 'section_reseau', label: 'Réseau d\u2019air', type: 'section' },
      { key: 'forme_section', label: 'Forme de la section', type: 'select', options: ['Circulaire', 'Rectangulaire'] },
      { key: 'diametre_cote1', label: 'Diamètre ou côte 1 (cm)', type: 'number' },
      { key: 'cote2', label: 'Côte 2 (cm)', type: 'number', showIf: { key: 'forme_section', equals: 'Rectangulaire' } },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'computed' },
      { key: "vitesse_mode", label: "Saisie de la vitesse", type: "select", options: ["Vitesse moyenne directe", "Grille de points"] },
      { key: "vitesse_nb_axes", label: "Nombre d\u2019axes", type: "number", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse_nb_points", label: "Nombre de points par axe", type: "number", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse_grid", label: "Valeurs mesurées (m/s) — « / » pour exclure un point", type: "grid", colsKey: "vitesse_nb_points", rowsKey: "vitesse_nb_axes", showIf: { key: "vitesse_mode", equals: "Grille de points" }, pointEntry: true },
      { key: "vitesse", label: "Vitesse (m/s)", type: "number", showIf: { key: "vitesse_mode", equals: "Vitesse moyenne directe" } },
      { key: "vitesse_moyenne_grille", label: "Vitesse moyenne calculée (m/s)", type: "computed", showIf: { key: "vitesse_mode", equals: "Grille de points" } },

      { key: 'section_debits', label: 'Débits', type: 'section' },
      { key: 'debit_mesure', label: 'Débit mesuré (m³/h)', type: 'computed' },
      { key: 'debit_reference', label: 'Débit de référence (m³/h)', type: 'number' },
      { key: 'debit_min_inrs', label: 'Débit minimum préconisé INRS (m³/h)', type: 'number' },
      { key: 'cylindree', label: 'V : cylindrée du véhicule (litres)', type: 'number' },
      { key: 'regime_moteur', label: 'n : régime du moteur (tours/min)', type: 'number' },
      { key: 'debit_min_calcule', label: 'Débit minimum calculé (m³/h)', type: 'computed' },
      { key: 'avis_constructeur', label: 'Avis par rapport aux données constructeur', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_conduit', label: 'Mesure dans le conduit', type: 'section' },
      { key: 'gaine', label: 'Gaine', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed' }
    ]
  },
  {
    id: 'menuiserie', label: 'Menuiserie (réseau d\u2019aspiration)', icon: 'tool', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'reference_equipement', label: "Référence du dispositif d'extraction", type: 'textarea' },
      { key: 'nb_machines_reliees', label: 'Nombre de machines reliées au dispositif', type: 'number' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'simultaneites', label: 'Simultanéités (ex : 100% — toutes les machines en aspiration, ou XX% — machines en aspiration : ...)', type: 'textarea' },
      { key: 'photo', label: 'Photo', type: 'photo' },

      { key: 'section_reseau_carac', label: 'Caractéristique du réseau', type: 'section' },
      { key: 'reseau_forme', label: 'Forme du réseau', type: 'checkbox-group', options: ['En épi', 'autres'] },
      { key: 'reseau_forme_si_autres', label: 'Si autres', type: 'text', showIf: { key: 'reseau_forme', contains: 'autres' } },
      { key: 'presence_trappes', label: 'Présence de trappes', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'ouverture_trappes', label: 'Ouverture des trappes', type: 'select', options: ['Manuelle', 'Pneumatique'],
        showIf: { key: 'presence_trappes', equals: 'Oui' } },
      { key: 'entree_air_additionnelle', label: 'Entrée d\u2019air additionnelle extérieure', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'reseau_debit', label: 'Réseau à débit', type: 'select', options: ['Fixe', 'Variable'] },

      { key: 'section_depoussiereur', label: 'Dépoussiéreur', type: 'section' },
      { key: 'afficher_depoussiereur', label: 'Ce dispositif comporte un dépoussiéreur', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'type_filtre', label: 'Type de filtre', type: 'text', showIf: { key: 'afficher_depoussiereur', equals: 'Oui' } },
      { key: 'position', label: 'Position', type: 'text', showIf: { key: 'afficher_depoussiereur', equals: 'Oui' } },
      { key: 'etat_filtre', label: 'État du filtre', type: 'text', showIf: { key: 'afficher_depoussiereur', equals: 'Oui' } },
      { key: 'perte_charge', label: 'Pertes de charge', type: 'text', showIf: { key: 'afficher_depoussiereur', equals: 'Oui' } },

      { key: 'section_gaine', label: 'Section', type: 'section' },
      { key: 'mesure_localisation', label: 'Localisation de la mesure', type: 'select',
        options: ['Sur la surface de la grille', 'Dans le conduit'] },
      { key: 'forme_section', label: 'Forme de la section', type: 'select', options: ['Circulaire', 'Rectangulaire'] },
      { key: 'diametre_cote1', label: 'Diamètre ou côte 1 (cm)', type: 'number' },
      { key: 'cote2', label: 'Côte 2 (cm)', type: 'number', showIf: { key: 'forme_section', equals: 'Rectangulaire' } },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'computed' },
      { key: "vitesse_mode", label: "Saisie de la vitesse", type: "select", options: ["Vitesse moyenne directe", "Grille de points"] },
      { key: "vitesse_nb_axes", label: "Nombre d\u2019axes", type: "number", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse_nb_points", label: "Nombre de points par axe", type: "number", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse_grid", label: "Valeurs mesurées (m/s) — « / » pour exclure un point", type: "grid", colsKey: "vitesse_nb_points", rowsKey: "vitesse_nb_axes", showIf: { key: "vitesse_mode", equals: "Grille de points" }, pointEntry: true },
      { key: "vitesse", label: "Vitesse (m/s)", type: "number", showIf: { key: "vitesse_mode", equals: "Vitesse moyenne directe" } },
      { key: "vitesse_moyenne_grille", label: "Vitesse moyenne calculée (m/s)", type: "computed", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed' },

      { key: 'section_debit', label: 'Débit', type: 'section' },
      { key: 'valeur_reference_recommandee', label: 'Débit de référence (m³/h)', type: 'number' },
      { key: 'debit_annee_n1', label: 'Débit année N-1 (m³/h)', type: 'number' },
      { key: 'debit_annee_en_cours', label: 'Débit année en cours (m³/h)', type: 'computed' },
      { key: 'avis_constructeur', label: 'Avis par rapport au débit de référence', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'menuiserie_bis', label: 'Menuiserie (machines à bois)', icon: 'tool', implemented: true,
    // Ce type couvre la fiche "par machine" (Inserer_Annexe_13BIS, TAB_MENUISERIE_MAB). Le 2e sous-type
    // VBA "Machine à bois extracteur" (fiche réseau commune à plusieurs machines, TAB_MENUISERIE_EXTRACT)
    // n'est pas manquant : il est déjà couvert par le type 'menuiserie' (nb_machines_reliees, dépoussiéreur,
    // caractéristiques réseau — vérifié champ par champ contre l'en-tête VBA) — deux types distincts, pas
    // un gap. Le rendu Word de 'menuiserie' reste générique (buildAnnexeFicheGenerique) pour l'instant,
    // comme les autres types encore non passés en fiche fidèle.
    fields: [
      { key: 'section_localisation', label: 'Localisation', type: 'section' },
      { key: 'reference_machine', label: 'Référence de la machine à bois', type: 'text' },
      { key: 'date_controle', label: 'Date de Contrôle', type: 'text' },
      { key: 'type_machine', label: 'Type de machine à bois', type: 'select', options: MACHINE_BOIS_OPTIONS },
      { key: 'photo', label: 'Photo', type: 'photo' },
      { key: 'simultaneites', label: 'Simultanéités (ex : 100% — toutes les machines en aspiration, ou XX% — machines en aspiration : ...)', type: 'textarea' },

      { key: 'section_vitesse', label: 'Mesure de la vitesse de transport', type: 'section' },
      { key: 'vitesse_moyenne', label: 'Vitesse moyenne (m/s)', type: 'computed' },
      { key: 'vitesse_reference', label: 'Valeur de référence (m/s)', type: 'number' },
      { key: 'vitesse_inrs_ed750', label: 'Valeur recommandée par le guide INRS (ED 750)', type: 'computed' },
      { key: 'vitesse_avis', label: 'Avis', type: 'computed' },

      { key: 'section_debit', label: 'Calcul du débit', type: 'section' },
      { key: 'debit', label: 'Débit (m³/h)', type: 'computed' },
      { key: 'debit_reference', label: 'Valeur de référence (m³/h)', type: 'computed' },
      { key: 'debit_inrs_ed750', label: 'Valeur recommandée par le guide INRS (ED 750)', type: 'computed' },
      { key: 'debit_avis', label: 'Avis', type: 'computed' },

      { key: 'section_etat_visuel', label: 'État visuel du réseau d\u2019aspiration', type: 'section' },
      { key: 'etat_visuel_reseau', label: 'État visuel du réseau d\u2019aspiration', type: 'checkbox-group',
        options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués', 'Autres'] },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'conclusion_avis', label: 'Le dispositif doit satisfaire aux préconisations indiquées par l\u2019INRS. Avis par rapport à ces préconisations', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_conduit', label: 'Mesure de la vitesse et du débit d\u2019air extrait', type: 'section' },
      { key: 'forme_conduit', label: 'Type de conduit', type: 'select', options: ['Circulaire', 'Rectangulaire'] },
      { key: 'diametre_cote1', label: 'Diamètre ou côté 1 (cm)', type: 'number' },
      { key: 'cote2', label: 'Côté 2 (cm)', type: 'number', showIf: { key: 'forme_conduit', equals: 'Rectangulaire' } },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'computed' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed' },
      { key: 'vitesse_mode', label: 'Saisie de la vitesse', type: 'select', options: ['Vitesse moyenne directe', 'Grille de points'] },
      { key: 'vitesse_nb_axes', label: 'Nombre d\u2019axes', type: 'number', showIf: { key: 'vitesse_mode', equals: 'Grille de points' } },
      { key: 'vitesse_nb_points', label: 'Nombre de points par axe', type: 'number', showIf: { key: 'vitesse_mode', equals: 'Grille de points' } },
      { key: 'vitesse_grid', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid',
        colsKey: 'vitesse_nb_points', rowsKey: 'vitesse_nb_axes', showIf: { key: 'vitesse_mode', equals: 'Grille de points' }, pointEntry: true },
      { key: 'vitesse_directe', label: 'Vitesse (m/s)', type: 'number', showIf: { key: 'vitesse_mode', equals: 'Vitesse moyenne directe' } },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' }
    ]
  },
  {
    id: 'box_peinture', label: 'Box préparation peinture', icon: 'building', implemented: true,
    fields: [
      { key: 'nombre_captage', label: 'Nombre de captage', type: 'select', options: ['0', '1', '2', '3', '4'] },
      { key: 'activite_reference_local', label: 'Activité et référence du local', type: 'textarea' },
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'date_controle', label: 'Date de Contrôle', type: 'text' },
      { key: 'reference_equipement', label: "Réf. équipement", type: 'text' },
      { key: 'photo', label: 'Photo', type: 'photo' },

      { key: 'etat_visuel_installations', label: 'État visuel des installations', type: 'checkbox-group',
        options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués', 'Autres'] },
      { key: 'etat_visuel_si_autres', label: 'Si autres', type: 'text', showIf: { key: 'etat_visuel_installations', contains: 'Autres' } },
      // Bascules "Satisfaisant / Non Satisfaisant" (UserForm_BOX.bas — CB_Choix_5/6/7) : reproduites
      // ici en select, la valeur exacte pilote l'avis global (cf. calculations.js).
      { key: 'ventilation_naturelle', label: 'Ventilation naturelle permanente', type: 'select',
        options: ['Présence d’ouvertures haute et basse, diamétralement opposées', 'Absence'] },
      { key: 'asservissement', label: 'Asservissement', type: 'select',
        options: ['Ventilation mécanique asservie à la présence de l’opérateur', 'Absence d’asservissement'] },
      { key: 'type_ventilation', label: 'Type de ventilation', type: 'select',
        options: ['Le renouvellement d’air du local est assuré par un captage localisé',
                  'Le renouvellement d’air est réalisé par ventilation générale',
                  'Pas de ventilation mécanique'] },

      { key: 'section_renouvellement', label: 'Taux de renouvellement', type: 'section' },
      { key: 'volume_local', label: 'Volume du local (m³)', type: 'number' },
      { key: 'debit_extraction_box', label: "Débit d'extraction du box (m³/h)", type: 'computed' },
      { key: 'volume_par_heure', label: 'Volume par heure (vol/h)', type: 'computed' },
      { key: 'debit_minimal_50vh', label: 'Débit minimal (m³/h) pour 50 volumes/heure', type: 'computed' },
      { key: 'conclusion_renouvellement', label: 'Conclusion — taux de renouvellement', type: 'computed' },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis', label: 'Avis global', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },
      { key: 'commentaire', label: 'Commentaire / Informations', type: 'textarea' }
    ]
      .concat(buildBoxCaptageFields(1))
      .concat(buildBoxCaptageFields(2))
      .concat(buildBoxCaptageFields(3))
      .concat(buildBoxCaptageFields(4))
  },
  {
    id: 'torches_aspirantes', label: 'Torches aspirantes', icon: 'zap', implemented: true,
    fields: [
      { key: 'activite_reference_local', label: 'Activité et référence du local', type: 'textarea' },
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: "Réf. de l'équipement", type: 'text' },
      { key: 'note_reference', label: 'Note', type: 'computed' },
      { key: 'total_debit', label: 'Total débit (m³/h)', type: 'computed' },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' }
    ]
      .concat(buildTorcheRowFields(1)).concat(buildTorcheRowFields(2)).concat(buildTorcheRowFields(3))
      .concat(buildTorcheRowFields(4)).concat(buildTorcheRowFields(5)).concat(buildTorcheRowFields(6))
      .concat(buildTorcheRowFields(7)).concat(buildTorcheRowFields(8)).concat(buildTorcheRowFields(9))
      .concat(buildTorcheRowFields(10))
  },
  {
    id: 'locaux_charge', label: 'Locaux de charge', icon: 'zap', implemented: true,
    fields: [
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'date_controle', label: 'Date de Contrôle', type: 'text' },
      { key: 'reference_equipement', label: "Réf. de l'équipement", type: 'text' },
      { key: 'photo', label: 'Photo', type: 'photo' },

      { key: 'ventilation_permanente', label: 'Ventilation permanente', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'ventilation_asservie', label: 'Ventilation asservie aux chargeurs', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'debit_variable', label: 'Débit variable', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'reglage_variateur', label: 'Réglage du variateur', type: 'text', showIf: { key: 'debit_variable', equals: 'Oui' } },
      { key: 'etat_visuel', label: 'État visuel des installations', type: 'checkbox-group',
        options: ['En bon état', 'Le réseau est encrassé', 'Autres'] },
      { key: 'si_autre', label: 'Si autres', type: 'text', showIf: { key: 'etat_visuel', contains: 'Autres' } },

      { key: 'section_chargeurs', label: 'Calcul du débit nécessaire (chargeurs — guide INRS)', type: 'section' },
      { key: 'chargeurs', label: 'Liste des chargeurs', type: 'charger-list' },
      { key: 'valeur_inrs', label: 'Débit recommandé par le guide INRS (m³/h)', type: 'computed' },

      { key: 'section_grilles', label: 'Calcul du débit (mesure sur les grilles)', type: 'section' }
    ]
      .concat(buildLocalChargeGrilleFields(1)).concat(buildLocalChargeGrilleFields(2)).concat(buildLocalChargeGrilleFields(3))
      .concat(buildLocalChargeGrilleFields(4)).concat(buildLocalChargeGrilleFields(5)).concat(buildLocalChargeGrilleFields(6))
      .concat(buildLocalChargeGrilleFields(7)).concat(buildLocalChargeGrilleFields(8)).concat(buildLocalChargeGrilleFields(9))
      .concat(buildLocalChargeGrilleFields(10))
      .concat([
      { key: 'section_debits', label: 'Mesure du débit', type: 'section' },
      { key: 'valeur_reference', label: 'Valeur de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'debit_mesure_local', label: 'Débit mesuré du local (m³/h)', type: 'computed' },
      { key: 'avis', label: 'Avis par rapport aux valeurs de référence', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ])
  },
  {
    id: 'tts', label: 'TTS (Traitement de surface)', icon: 'tool', implemented: true,
    fields: [
      { key: 'activite_reference_local', label: 'Activité et réf. du local', type: 'textarea' },
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'date_mesure', label: 'Date de mesure', type: 'text' },
      { key: 'reference_equipement', label: "Réf. de l'équipement et/ou implantation", type: 'text' },
      { key: 'photo', label: 'Photo', type: 'photo' },

      { key: 'aspiration_type', label: "Type d'aspiration", type: 'select',
        options: ['Aspiration sous couvercle', 'Aspiration enveloppante', 'Aspiration tunnel', 'Aspiration latérale sur cuve ouverte'] },
      { key: 'mesure_mode', label: 'Mode de mesure', type: 'checkbox-group',
        options: ['Mesure dans les ouvertures', 'Mesure dans le conduit'] },

      { key: 'etat_visuel_aspiration', label: "État visuel de l'aspiration", type: 'checkbox-group',
        options: ['En bon état', 'Le réseau est encrassé', "Les fentes d'aspiration sont endommagées ou obturées", 'La gaine est trouée', 'Autres'] },
      { key: 'etat_visuel_si_autres', label: 'Si autres', type: 'text', showIf: { key: 'etat_visuel_aspiration', contains: 'Autres' } },
      { key: 'test_fumigene', label: 'Test fumigène', type: 'text' },

      { key: 'section_procede', label: 'Procédé', type: 'section' },
      { key: 'procede_famille', label: 'Famille', type: 'text' },
      { key: 'procede_type', label: 'Type', type: 'text' },
      { key: 'procede_constituants', label: 'Constituants dangereux', type: 'text' },
      { key: 'procede_conditions', label: "Conditions d'utilisation", type: 'text' },
      { key: 'procede_niveau_vitesse', label: 'Niveau vitesse de captage (V1 à V4)', type: 'text' },

      { key: 'section_cuve', label: 'Caractéristiques de la cuve', type: 'section' },
      { key: 'type_ventilation', label: 'Type de ventilation', type: 'select',
        options: ['Extraction unilatérale', 'Extraction bilatérale'] },
      { key: 'type_cuve', label: 'Type de cuve', type: 'select',
        options: ['Cuve sans dosseret non appuyée contre un mur', 'Cuve avec dosseret ou appuyée contre un mur',
          'Cuve ouverte circulaire sans écran', 'Cuve ouverte circulaire avec écran'] },
      { key: 'forme_cuve', label: 'Forme de cuve', type: 'select', options: ['Rectangulaire', 'Circulaire'] },
      { key: 'coef_a', label: 'a (coefficient — table INRS selon ventilation/cuve)', type: 'number' },
      { key: 'coef_b', label: 'b (coefficient — table INRS selon ventilation/cuve)', type: 'number' },
      { key: 'coef_n', label: 'n (coefficient — table INRS selon ventilation/cuve)', type: 'number' },
      { key: 'diametre_cuve', label: 'Diamètre de la cuve (m)', type: 'number', showIf: { key: 'forme_cuve', equals: 'Circulaire' } },
      { key: 'surface_cuve', label: 'Surface de la cuve (m²)', type: 'computed' },
      { key: 'longueur_l', label: 'Longueur de la cuve L (m)', type: 'number', showIf: { key: 'forme_cuve', equals: 'Rectangulaire' } },
      { key: 'largeur_l', label: 'Largeur de la cuve W (m)', type: 'number', showIf: { key: 'forme_cuve', equals: 'Rectangulaire' } },
      { key: 'surface_ouvertures', label: 'Surface des ouvertures So (m²)', type: 'number' },

      { key: 'section_debits', label: 'Débits', type: 'section' },
      { key: 'vitesse', label: 'Vitesse de captage V (m/s — table INRS selon procédé/aspiration)', type: 'number' },
      { key: 'debit_calcule', label: 'Débit calculé Qr ou Qc (m³/h)', type: 'computed' },
      { key: 'debit_qr10', label: 'Débit Qr/10 ou Qc/10 (m³/h)', type: 'computed' },
      { key: 'debit_so', label: 'Débit So × V (m³/h)', type: 'computed' },
      { key: 'debit_min_inrs', label: 'Débit minimum préconisé INRS (m³/h)', type: 'computed' },
      { key: 'debit_mesure', label: 'Débit mesuré (m³/h)', type: 'number' },
      { key: 'debit_reference', label: 'Débit de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'avis', label: 'Avis par rapport aux valeurs de référence', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_fentes', label: 'Mesure dans les fentes', type: 'section',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans les ouvertures' } },
      { key: 'nb_fentes', label: 'Nb de fentes', type: 'number',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans les ouvertures' } },
      { key: 'longueur_fente', label: 'Longueur de la fente (m)', type: 'number',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans les ouvertures' } },
      { key: 'largeur_fente', label: 'Largeur de la fente (m)', type: 'number',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans les ouvertures' } },
      { key: 'surface_totale_fentes', label: "Surface totale d'aspiration (m²)", type: 'computed',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans les ouvertures' } },
      { key: 'vitesse_fentes', label: 'Vitesse (m/s)', type: 'number',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans les ouvertures' } },
      { key: 'debit_mesure_fentes', label: 'Débit mesuré (m³/h)', type: 'computed',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans les ouvertures' } },
      { key: 'debit_reference_fentes', label: 'Débit de référence (m³/h, « / » si aucune)', type: 'text',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans les ouvertures' } },
      { key: 'avis_fentes', label: 'Avis par rapport à la valeur de référence', type: 'computed',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans les ouvertures' } },

      { key: 'section_conduit', label: 'Mesure dans le conduit', type: 'section',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans le conduit' } },
      { key: 'gaine', label: 'Gaine', type: 'text', showIf: { key: 'mesure_mode', contains: 'Mesure dans le conduit' } },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans le conduit' } },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans le conduit' } },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed',
        showIf: { key: 'mesure_mode', contains: 'Mesure dans le conduit' } }
    ]
  },
];

function getInstallationType(id) {
  for (var i = 0; i < INSTALLATION_TYPES.length; i++) {
    if (INSTALLATION_TYPES[i].id === id) return INSTALLATION_TYPES[i];
  }
  return null;
}

console.log('✓ Schémas installations chargés (' + INSTALLATION_TYPES.length + ' types, ' +
  INSTALLATION_TYPES.filter(function (t) { return t.implemented; }).length + ' implémentés)');
