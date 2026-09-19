// rapso-import.js - Import d'un classeur Rapso V29 (.xlsb/.xlsx) rempli, pour préremplir une mission
// avec les données non-mesure d'un site déjà suivi avec l'ancien outil Excel/VBA — pensé pour faciliter
// l'adoption de l'app par les équipes (elles n'ont pas à ressaisir tout un site déjà connu).
//
// Architecture : on lit chaque feuille TAB_xxx du classeur, on la transforme en un objet
// "sourceData" utilisant les MÊMES clés que notre schéma (js/installations-schema.js), puis on
// réutilise TEL QUEL le pipeline N-1 déjà construit et validé (buildInstallationDataFromPrevious,
// js/state.js) pour ne garder que les champs structurels — bâtiment, dimensions, comptages, valeurs
// de référence — jamais les mesures/avis/observations, exactement comme pour "Charger un site
// précédent". Le mapping ci-dessous peut donc rester généreux (mapper une mesure par erreur ne pose
// pas de risque : le filtre existant l'exclura de toute façon) — l'effort porte sur la CORRESPONDANCE
// des clés, pas sur le tri mesure/config qui est déjà résolu ailleurs.
//
// Sheets sans données réelles trouvées dans les 9 fichiers d'exemple analysés (menuiserie réseau,
// torches aspirantes, tts, locaux fumeurs, ERP) : mapping construit à partir de la seule structure de
// colonnes (en-têtes), jamais vérifié sur une vraie ligne remplie — même statut que les autres champs
// "NON VÉRIFIÉ TERRAIN" déjà présents ailleurs dans l'app.

var RAPSO_SHEET_TO_TYPE = {
  'TAB_CTA': 'cta',
  'Extracteur': 'extracteur',
  'BOA': 'bras_aspiration',
  'TAB_EQUIP': 'installations_diverses',
  'TAB_HOTTE': 'hottes',
  'TAB_SORBONNE': 'sorbonnes',
  'TAB_LOCAUX_CHARGE': 'locaux_charge',
  'autres locaux': 'bureaux',
  'sanitaires': 'sanitaires',
  'TAB_CDP': 'cabines_peinture',
  'TAB_ECHAP': 'gaz_echappement',
  'TAB_MENUISERIE_MAB': 'menuiserie_bis',
  'TAB_BOX_PREPA_PEINTURE': 'box_peinture',
  'TAB_MENUISERIE_EXTRACT': 'menuiserie',
  'TAB_TORCHE': 'torches_aspirantes',
  'TAB_TTS': 'tts',
  'TAB_LOC_FUMEUR': 'locaux_fumeurs',
  'TAB_ERP': 'erp'
};

// Types dont le mapping n'a jamais pu être vérifié sur une ligne réelle remplie (structure de
// colonnes uniquement) — signalé dans le résumé d'import, ne bloque pas l'import.
var RAPSO_TYPES_NON_VERIFIES = { menuiserie: true, torches_aspirantes: true, tts: true, locaux_fumeurs: true, erp: true };

// Certaines colonnes Rapso stockent "Satisfaisant : <libellé>" / "Non satisfaisant : <libellé>" au
// lieu du seul libellé attendu par nos options de schéma (ex. box_peinture.ventilation_naturelle) —
// on retire le préfixe d'avis pour retrouver la valeur exploitable.
function rapsoStripAvisPrefix(v) {
  var m = /^(satisfaisant|non satisfaisant)\s*:\s*(.+)$/i.exec(String(v || '').trim());
  return m ? m[2].trim() : v;
}

function rapsoNorm(s) {
  return String(s === undefined || s === null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// [libellé Rapso (tel que lu dans la ligne d'en-tête réelle), clé de notre schéma, transform optionnel]
var RAPSO_FIELD_MAP = {
  cta: [
    ['Bâtiment', 'batiment'], ['Localisation', 'localisation'], ['Mode de fonctionnement', 'mode_fonctionnement'],
    ['Locaux alimentées', 'locaux_alimentes'], ['Date du contrôle', 'date_controle'],
    ["Réf. Equipement et/ou Implatation", 'reference_equipement'],
    ['Etat général (propreté, …)', 'etat_general'], ["Prise d'air neuf", 'prise_air_neuf'],
    ['Batterie(s) froide(s)', 'batterie_froide'], ['Batterie(s) chaude(s)', 'batterie_chaude'],
    ['Canalisations / Gaines', 'canalisations_gaines'], ['Ventilateur / Courroie', 'ventilateur_courroie'],
    ['Fiche de Maintenance', 'fiche_maintenance'],
    ['Filtration Affiché ?', 'afficher_filtration', function (v) { return v ? 'Oui' : 'Non'; }],
    ['Type (cellules, poches, …)_1', 'filt_pre_type'], ['Nombre / Dimensions_1', 'filt_pre_nombre_dimensions'],
    ["Classe d'éfficacité_1", 'filt_pre_classe'], ['Perte de charge (Pa)_1', 'filt_pre_perte_charge'],
    ['Type (cellules, poches, …)_2', 'filt_filtre_type'], ['Nombre / Dimensions_2', 'filt_filtre_nombre_dimensions'],
    ["Classe d'éfficacité_2", 'filt_filtre_classe'], ['Perte de charge (Pa)_2', 'filt_filtre_perte_charge'],
    ['Type (cellules, poches, …)_3', 'filt_absolu_type'], ['Nombre / Dimensions_3', 'filt_absolu_nombre_dimensions'],
    ["Classe d'éfficacité_3", 'filt_absolu_classe'],
    ['Forme de la section_1', 'neuf_forme'], ['Diametre ou côte 1 (cm)_1', 'neuf_diametre_cote1'],
    ['Côte 2 (cm)_1', 'neuf_cote2'], ['Débit de référence_1', 'neuf_reference'],
    ['Forme de la section_2', 'souf_forme'], ['Diametre ou côte 1 (cm)_2', 'souf_diametre_cote1'],
    ['Côte 2 (cm)_2', 'souf_cote2'], ['Débit de référence_2', 'souf_reference'],
    ['Forme de la section_3', 'rep_forme'], ['Diametre ou côte 1 (cm)_3', 'rep_diametre_cote1'],
    ['Côte 2 (cm)_3', 'rep_cote2'], ['Débit de référence_3', 'rep_reference']
  ],

  extracteur: [
    ['Bâtiment', 'batiment'], ['Locaux extraits', 'locaux_extraits'], ['Date du contrôle', 'date_controle'],
    ['Réf. Equipement et/ou Implatation', 'reference_equipement'],
    ['Forme de la section', 'forme_section'], ['Diametre ou côte 1 (cm)', 'diametre_cote1'], ['Côte 2 (cm)', 'cote2'],
    ['Valeur de référence ou recommandée (en m³/h)', 'valeur_reference_recommandee'],
    ['Valeur recommandée', 'valeur_recommandee'], ['Référentiel', 'referentiel'],
    ['Volume du local (m3)', 'volume_local'], ['Afficher Taux de Renouvellement', 'afficher_taux', function (v) { return v ? 'Oui' : 'Non'; }]
  ],

  bras_aspiration: [
    ['Bâtiment', 'batiment'], ['Activité', 'activite'], ['Atelier', 'atelier'], ['Référence équipement', 'reference_equipement'],
    ['Adapté à la situation', 'adapte_situation'],
    ["Type de bouche d'aspiration", 'type_bouche'],
    ['Diamètre de la bouche (cm)', 'diametre_bouche'],
    ['Longueur et largeur de la bouche si ovale (cm) - Largeur', 'largeur_bouche_ovale'],
    ['Longueur et largeur de la bouche si ovale (cm) - Longueur', 'longueur_bouche_ovale'],
    ['Surface de la bouche pour les autres cas (m2)', 'surface_bouche_autre'],
    ['Diamètre du conduit (cm)', 'diametre_conduit'],
    ['Localisation du point de mesure', 'localisation_point_mesure'],
    ['Distance maximum de captage à XX m/s* en cm', 'distance_max_captage'],
    ["Distance d'utilisation en cm", 'distance_utilisation'],
    ['Condition de Polluant_1', 'conditions_dispersion']
  ],

  installations_diverses: [
    ['Bâtiment', 'batiment'], ['Localisation_1', 'localisation'], ['Date du contrôle', 'date_controle'],
    ['Réf. Equipement et/ou Implatation', 'reference_equipement'],
    ["Etat visuel du réseau d'aspiration", 'etat_visuel_reseau'],
    ['Condition de dispersion du polluant', 'vpe_conditions_dispersion'],
    ['Valeur de référence_1', 'vpe_reference'], ["Valeur recommandée par l'INRS(ED695)_1", 'vpe_inrs'],
    ['Type de polluants_1', 'vt_type_polluant'], ['Valeur de référence_2', 'vt_reference'],
    ["Valeur recommandée par l'INRS(ED695)_2", 'vt_inrs']
  ],

  hottes: [
    ['Bâtiment', 'batiment'], ['Localisation', 'localisation'], ["Date d'installation (ne pas prendre en compte)", 'date_installation'],
    ['Date de Mesure', 'date_mesure'], ['Réf. Equipement et/ou Implatation', 'reference_equipement'],
    ["Etat visuel du réseau d'aspiration", 'etat_visuel_reseau'],
    ['Valeur de référence_1', 'vpe_min_reference'], ["Valeur recommandée par l'INRS(ED 835)_1", 'vpe_min_inrs'],
    ['Valeur de référence_2', 'vpe_moy_reference'], ["Valeur recommandée par l'INRS(ED 835)_2", 'vpe_moy_inrs'],
    ['Type de polluants', 'vt_type_polluant'], ['Valeur de référence_3', 'vt_reference'],
    ["Valeur recommandée par l'INRS(ED 651)", 'vt_inrs'],
    ['Largeur (cm)', 'vpe_largeur_cm'], ['Hauteur (cm)', 'vpe_hauteur_cm'],
    ['Nbre de Point sur la largeur', 'vpe_nb_points_largeur'], ['Nbre de Point sur la hauteur', 'vpe_nb_points_hauteur'],
    ["L'opérateur est situé en dehors du volume entre le point d'émission et le captage", 'operateur_hors_volume']
  ],

  sorbonnes: [
    ['Bâtiment', 'batiment'], ['Localisation', 'localisation'], ['Réf. Equipement et/ou Implatation', 'reference_equipement'],
    ['Local', 'local'], ['Paillasse', 'paillasse'], ['Ouvrants', 'ouvrants'],
    ["Obstacle génant la réalisation d'un point", 'obstacle_point_mesure'],
    ['Autre(s) sorbonne(s) en fonctionnement', 'autres_sorbonnes'],
    ['Autre(s) dispositif(s) de ventilation', 'autres_dispositifs'],
    ['Appareils de mesure utilisés', 'appareils_mesure'],
    ['Largeur (mm)', 'largeur_mm'],
    ["Ouverture de travail h (mm) en fonction de l'année de construction de la sorbonne (Avant janvier 2005)", 'annee_construction',
      function () { return 'Avant janvier 2005 - Norme XP X15-203 (h=400mm)'; }],
    ['Verrouillage de la paroi vitrée (butée)', 'verrouillage_paroi'], ['Parachute sur a paroi vitrée', 'parachute_paroi'],
    ['Mesure de la vitesse frontale', 'mesure_vitesse_frontale'], ['Alarme sonore', 'alarme_sonore'],
    ['Alarme visuelle', 'alarme_visuelle'], ["Eclairage à l'intérieur du volume", 'eclairage_interieur'],
    ['Valeur de référence_1', 'vitesse_min_reference'], ['Valeur de référence_2', 'vitesse_moy_reference'],
    ['Valeur de référence_3', 'debit_reference']
  ],

  locaux_charge: [
    ['Localisation', 'localisation'], ['Bâtiment', 'batiment'], ['Réf. Equipement', 'reference_equipement'],
    ['Ventilation permanent', 'ventilation_permanente'], ['Ventilation asservie aux chargeurs', 'ventilation_asservie'],
    ['Débit variable', 'debit_variable'], ['Réglage du variateur', 'reglage_variateur'],
    ['Etat visuel des instal.', 'etat_visuel'], ['Si autre', 'si_autre'],
    ['Valeur de référence', 'valeur_reference'], ["Valeur recommandée par le guide INRS", 'valeur_inrs']
  ],

  bureaux: [
    ['Bâtiment', 'batiment'], ['Référence du local', 'reference_local'], ['type de local', 'type_local'],
    ['Ventilation', 'type_ventilation'],
    ["Présence d'ouvrant donnant directement sur l'extérieur :", 'ouvrant_exterieur'],
    ["Présence d'entrée d'air donnant directement sur l'extérieur :", 'entree_air_exterieur'],
    ["Présence d'entrée d'air permanente donnant directement sur l'extérieur", 'entree_air_permanente'],
    ['Volume (m3)', 'volume'], ['Effectif', 'effectif'],
    ['Nombre de bouches_1', 'nombre_bouches'], ['Nombre de bouches_2', 'nombre_bouches'], ['Nombre de bouches_3', 'nombre_bouches'],
    ["Pourcentage d'air neuf (%)", 'pourcentage_air_neuf'], ['Etat des bouches', 'etat_bouches']
  ],

  sanitaires: [
    ['Bâtiment', 'batiment'], ['référence du local', 'repere'], ['type de local', 'nom_usage'],
    ['WC/Urinoirs', 'wc_urinoirs'], ['Douches', 'douches'], ['Lavabos', 'lavabos'],
    ['Individuel ou Collectif', 'individuel_collectif', function (v) {
      var s = String(v || '').trim();
      if (s === 'C') return 'Collectif';
      if (s === 'I') return 'Individuel';
      return s;
    }],
    ['Nombre de bouches', 'nombre_bouches'], ['Etat des bouches', 'etat_bouches']
  ],

  cabines_peinture: [
    ['Marque', 'marque'], ['Emplacement', 'batiment'], ['Date du contrôle', 'date_controle'],
    ['Description de la cabine', 'reference_equipement'],
    ['Nature des produits à peindre', 'nature_produits'],
    ['Subjectiles industriels divers ou véhicules', 'zone_travail'],
    ['Zone de travail', 'zone_travail'],
    ['Etat des filtres', 'etat_filtres'],
    ['Valeur de référence_1', 'v1_reference'], ['Valeur recommandées par_1', 'v1_recommandee_par'],
    ['Valeur de référence_2', 'v2_reference'], ['Valeur recommandées par_2', 'v2_recommandee_par'],
    ['Largeur (m)/Hauteur (m)', 'largeur_cabine'], ['Longueur (m)', 'longueur_cabine'],
    ['Valeur de référence_5', 'debit_reference']
  ],

  gaz_echappement: [
    ['Type', 'type_vehicule'], ['Type de captage', 'type_captage'], ['Bâtiment', 'batiment'], ['Atelier', 'atelier'],
    ['Date du contrôle', 'date_controle'], ['Réf. Equipement et/ou Implatation', 'reference_equipement'],
    ['Type de captage adapté à la situation', 'type_captage_adapte'],
    // Pas de colonne "Forme de la section" dédiée dans TAB_ECHAP (contrairement à extracteur/cta) —
    // déduite juste après du remplissage de "Côté 2 (cm)_1" (bug trouvé le 2026-09-18 : la colonne
    // "Réseau d'air_1" contient en fait un libellé de réseau type "Extrait", pas une forme).
    ['Diamètre ou Côte 1 (cm)_1', 'diametre_cote1'], ['Côté 2 (cm)_1', 'cote2'],
    ['Débit de référence (en m³/h)_1', 'debit_reference'], ['Débit minimum préconisé \nINRS\n(en m³/h)_1', 'debit_min_inrs'],
    ['V : cylindrée du véhicule en litres_1', 'cylindree'], ['n : régime du moteur en tours/min_1', 'regime_moteur']
  ],

  menuiserie_bis: [
    ['Référence de la machine à bois', 'reference_machine'], ['Date du contrôle', 'date_controle'],
    ['Type de machine à bois', 'type_machine'], ["Etat visuel du réseau d'aspiration", 'etat_visuel_reseau'],
    ['Valeur de référence', 'vitesse_reference'], ['Débit de référence (m3/h)', 'debit_reference']
  ],

  box_peinture: [
    ['Nombre de Captahe', 'nombre_captage'], ['Activité et référence du local', 'activite_reference_local'],
    ['Bâtiment', 'batiment'], ['Date du contrôle', 'date_controle'], ['Réf. Equipement', 'reference_equipement'],
    ['Etat visuel des installations', 'etat_visuel_installations'], ['Si autres', 'etat_visuel_si_autres'],
    // Ces 3 colonnes stockent "Satisfaisant : <libellé>"/"Non satisfaisant : <libellé>" côté Rapso —
    // bug trouvé le 2026-09-18 : sans le transform, la valeur ne correspondrait à aucune option de
    // notre schéma (qui n'a que le libellé, sans le préfixe d'avis) et le champ semblerait non renseigné.
    ['Ventilation naturelle permanente', 'ventilation_naturelle', rapsoStripAvisPrefix],
    ['Asservissement', 'asservissement', rapsoStripAvisPrefix],
    ['Type de ventilation', 'type_ventilation', rapsoStripAvisPrefix],
    ['Volume du local (m3)', 'volume_local']
  ],

  // Non vérifiés terrain (structure seule, cf. RAPSO_TYPES_NON_VERIFIES) — mapping construit par
  // analogie directe avec les en-têtes de colonnes réels du classeur vide.
  menuiserie: [
    ['Bâtiment', 'batiment'], ['Localisation', 'localisation'],
    ['Nombre de machines reliées au dispositif', 'nb_machines_reliees'],
    ['Date du contrôle', 'date_controle'],
    ['Référence du dispositif d extraction ', 'reference_equipement'],
    ['Type de filtre', 'type_filtre'], ['Position', 'position'],
    ['Caractéristique du réseau', 'reseau_forme'], ['Si autres', 'reseau_forme_si_autres'],
    ['Présence de trappes', 'presence_trappes'], ["Entrée d'air additionnelle extérieure", 'entree_air_additionnelle'],
    ['Ouverture des trappes', 'ouverture_trappes'], ['Réseau à débit', 'reseau_debit'],
    ['Forme de la section', 'forme_section'], ['Diametre ou côte 1 (cm)', 'diametre_cote1'], ['Côte 2 (cm)', 'cote2'],
    ['Débit de référence', 'valeur_reference_recommandee']
  ],
  torches_aspirantes: [
    ['Activité et référence du local', 'activite_reference_local'], ['Bâtiment', 'batiment'],
    ['Date du contrôle', 'date_controle'], ['Réf. Equipement', 'reference_equipement']
  ],
  tts: [
    ['Activité et réf. du local', 'activite_reference_local'], ['Bâtiment', 'batiment'],
    ['Date de mesure', 'date_mesure'], ['Réf. Equipement', 'reference_equipement'],
    ["Etat visuel de l'aspiration", 'etat_visuel_aspiration'], ['Si autres', 'etat_visuel_si_autres'],
    ['Famille', 'procede_famille'], ['Type', 'procede_type'], ['Constituants', 'procede_constituants'],
    ["Conditions d'utilisation", 'procede_conditions'],
    ['Type de  cuve_2', 'type_cuve'], ['Forme de la cuve', 'forme_cuve'],
    ['a', 'coef_a'], ['b', 'coef_b'], ['n', 'coef_n'],
    ['Diamètre de la cuve (m)', 'diametre_cuve'], ['Surface de la cuve (m²)', 'surface_cuve'],
    ['Surface des ouvertures (m²)', 'surface_ouvertures'],
    ['Longueur de la cuve (L) (m)', 'longueur_l'], ['Largeur de la cuve (m)', 'largeur_l'],
    ['Débit de référence (en m²/h)_1', 'debit_reference'],
    ['Débit minimum préconisé INRS (en m²/h)_1', 'debit_min_inrs'],
    ['Nombre de fentes', 'nb_fentes'], ['Longueur (cm)', 'longueur_fente'], ['Largeur (cm)', 'largeur_fente'],
    ['Débit de référence (en m²/h)_2', 'debit_reference_fentes']
  ],
  locaux_fumeurs: [
    ['Bâtiment', 'batiment'], ['Localisation', 'localisation'], ['Référence du local', 'reference_equipement'],
    ['Longueur (m)', 'longueur'], ['Largeur (m)', 'largeur'], ['Hauteur (m)', 'hauteur'],
    ["Superficie totale de l'établissement(m²)", 'surface_etablissement']
  ],
  erp: [
    ['Bâtiment', 'batiment'], ['Référence du local', 'reference_local'], ['type de local', 'type_local'],
    ['Ventilation', 'type_ventilation'], ['Volume (m3)', 'volume'],
    ['Travailleur', 'travailleur'], ['Public', 'public'],
    ["Présence d'ouvrant donnant directement sur l'extérieur :", 'ouvrant_exterieur'],
    ["Présence d'entrée d'air donnant directement sur l'extérieur :", 'entree_air_exterieur'],
    ["Présence d'entrée d'air permanent directement sur l'extérieur :", 'entree_air_permanente'],
    ["Pourcentage d'air neuf (%)", 'pourcentage_air_neuf'], ['Etat des bouches', 'etat_bouches']
  ]
};

// Construit un objet { header_normalisé: index_colonne } pour une ligne d'en-tête donnée.
function rapsoHeaderIndex(headerRow) {
  var idx = {};
  headerRow.forEach(function (h, i) {
    var n = rapsoNorm(h);
    if (n && idx[n] === undefined) idx[n] = i;
  });
  return idx;
}

// Transforme une feuille Rapso (tableau de tableaux, sheet_to_json header:1) en une liste
// d'objets sourceData au format de notre schéma pour le type donné. La ligne d'en-tête réelle est
// systématiquement à l'index 4 (ligne 5) et les données commencent à l'index 5 (ligne 6) — vérifié
// sur les 18 types du classeur Rapso V29/V27.
function rapsoSheetToInstallations(typeId, rows) {
  var map = RAPSO_FIELD_MAP[typeId];
  if (!map || !rows || rows.length < 6) return [];
  var headerRow = rows[4] || [];
  var colIndex = rapsoHeaderIndex(headerRow);
  var out = [];
  for (var r = 5; r < rows.length; r++) {
    var row = rows[r];
    if (!row || row.every(function (c) { return c === '' || c === undefined || c === null; })) continue;
    var data = {};
    map.forEach(function (entry) {
      var label = entry[0], key = entry[1], transform = entry[2];
      var ci = colIndex[rapsoNorm(label)];
      if (ci === undefined) return;
      var v = row[ci];
      if (v === undefined || v === null) v = '';
      v = String(v).trim();
      if (transform) v = transform(v);
      if (v === '' && !transform) return;
      // Ne jamais écraser une valeur déjà posée par une entrée précédente du mapping (ex. bureaux
      // "Nombre de bouches_1/_2/_3" qui pointent toutes vers la même clé selon le type de ventilation).
      if (data[key] === undefined || data[key] === '') data[key] = v;
    });
    // rep_active (CTA) : pas de case à cocher dédiée côté Rapso, déduit de la présence du réseau repris.
    if (typeId === 'cta' && data.rep_forme) data.rep_active = 'Oui';
    // forme_section (gaz_echappement) : déduite de la présence de "Côté 2", faute de colonne dédiée
    // dans TAB_ECHAP (cf. commentaire dans RAPSO_FIELD_MAP.gaz_echappement).
    if (typeId === 'gaz_echappement' && data.diametre_cote1) {
      data.forme_section = (data.cote2 && data.cote2 !== '/') ? 'Rectangulaire' : 'Circulaire';
    }
    if (Object.keys(data).length > 0) out.push(data);
  }
  return out;
}

// Point d'entrée : lit un classeur (déjà parsé par SheetJS, cf. js/xlsx.full.min.js) et construit un
// objet "source" au même format qu'une mission exportée par l'app (source.installations[typeId] =
// [{id, data}]), directement consommable par createMissionFromPreviousSite (js/state.js) — même
// pipeline, mêmes garanties, que "Charger un site précédent".
function rapsoWorkbookToSourceMission(workbook, meta) {
  var source = { installations: {}, clientSite: (meta && meta.clientSite) || '', infosClient: {}, infosSiteIntervention: {} };
  INSTALLATION_TYPES.forEach(function (t) { source.installations[t.id] = []; });
  var typesFound = {}, typesNonVerifies = [];

  Object.keys(RAPSO_SHEET_TO_TYPE).forEach(function (sheetName) {
    var typeId = RAPSO_SHEET_TO_TYPE[sheetName];
    var sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    var list = rapsoSheetToInstallations(typeId, rows);
    if (list.length === 0) return;
    list.forEach(function (data) {
      source.installations[typeId].push({ id: 'rapso-' + typeId + '-' + source.installations[typeId].length, data: data });
    });
    typesFound[typeId] = list.length;
    if (RAPSO_TYPES_NON_VERIFIES[typeId]) typesNonVerifies.push(typeId);
  });
  // Sans ça, les installations importées existent bien dans les données mais l'écran de vue
  // d'ensemble du site (js/site-overview.js) n'affiche que les types listés ici — jamais renseigné
  // automatiquement par createMissionFromPreviousSite, à la différence d'une mission normale où
  // l'utilisateur les choisit lui-même (bug trouvé le 2026-09-18 en testant l'import de bout en bout).
  source.typesSelectionnes = Object.keys(typesFound);

  // Métadonnées de mission (feuille "Entrées", en forme libre label/valeur — le libellé est dans une
  // cellule, la valeur dans la cellule immédiatement à droite, jamais dans une colonne fixe d'une
  // ligne à l'autre) : préremplit donneesInternes/infosClient/intervenantSite/infosSiteIntervention
  // comme le ferait un import JSON de mission (js/state.js createEmptyMission pour la référence des
  // clés). Certains libellés portent un suffixe de champ de fusion Word (ex. "_ISLC", "_ISSI") retiré
  // par la correspondance en préfixe ci-dessous plutôt qu'en égalité stricte.
  // Uniquement les libellés SANS AMBIGUÏTÉ (une seule occurrence dans toute la feuille) : "Code
  // postal"/"Ville"/"Tel"/"Adresse" apparaissent identiques dans 3 blocs différents (agence, client,
  // site) sans suffixe qui les distingue de façon fiable — les mapper par simple texte de libellé
  // ferait écraser la même clé à chaque occurrence rencontrée. Non repris ici, laissés vides plutôt
  // que remplis au hasard. `donneesInternes` (numéro d'affaire, chrono...) n'est pas non plus repris
  // : createMissionFromPreviousSite ne le copie jamais (comportement voulu, cf. commentaire à côté de
  // sa définition) — une nouvelle mission doit recevoir un numéro d'affaire propre à CETTE visite, pas
  // hériter de celui du fichier Rapso source.
  var RAPSO_ENTREES_LABELS = [
    ["Nom de l'entreprise", 'infosClient', 'nomEntreprise'],
    ['Nom du demandeur', 'infosClient', 'nomDemandeur'],
    ['Intervenant', 'intervenantSite', 'intervenant'],
    ["Agence de l'auteur", 'intervenantSite', 'agenceAuteur'],
    ["Site d'Intervention", 'infosSiteIntervention', 'siteIntervention'],
    ['Nom du contact principal', 'infosSiteIntervention', 'nomContact']
  ];
  var entrees = workbook.Sheets['Entrées'];
  if (entrees) {
    var eRows = XLSX.utils.sheet_to_json(entrees, { header: 1, defval: '', raw: false });
    for (var i = 0; i < eRows.length; i++) {
      var row = eRows[i];
      for (var c = 0; c < row.length; c++) {
        var normCell = rapsoNorm(row[c]);
        if (!normCell) continue;
        for (var m = 0; m < RAPSO_ENTREES_LABELS.length; m++) {
          var entry = RAPSO_ENTREES_LABELS[m], normLabel = rapsoNorm(entry[0]);
          if (normCell.indexOf(normLabel) !== 0) continue;
          var v = row[c + 1];
          if (v === undefined || v === '') break;
          if (!source[entry[1]]) source[entry[1]] = {};
          source[entry[1]][entry[2]] = String(v).trim();
          break;
        }
      }
    }
    if (source.infosClient && source.infosClient.nomEntreprise) source.clientSite = source.infosClient.nomEntreprise;
  }

  return { source: source, typesFound: typesFound, typesNonVerifies: typesNonVerifies };
}

console.log('✓ Import Rapso chargé');
