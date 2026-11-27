// wizard-steps.js - Découpage en étapes par type d'installation. Un type entre dans ce fichier dès
// qu'il passe sur le moteur générique (js/wizard-engine.js) — les types absents d'ici restent sur le
// rendu à plat existant (js/installations.js).
//
// Trame commune des installations de captage (retours terrain du 2026-11-27, lots 1 et 2) :
//   Installation → Valeurs de référence → Mesures (résultats et avis juste sous la mesure) → Constat.
// Les valeurs de référence viennent avant la mesure pour que l'objectif s'affiche pendant la mesure
// (js/seuils.js) ; les constats (état visuel, fumigène, observation) viennent en dernier. Un écran
// regroupé est découpé en rubriques : une entrée « #Titre » dans fields ouvre un sous-titre, affiché
// seulement si l'un de ses champs l'est (gwStepBodyHtml). Le sous-titre sert aussi à nommer un critère
// ou une mesure au libellé vague (« Avis », « Valeur mesurée ») : gwChampRubrique.
//
// Une étape sans aucun champ visible (tous masqués par showIf) est sautée automatiquement. Les champs
// repris d'une visite à l'autre ne dépendent plus des titres d'écran (DUPLICATION_KEEP_FIELDS,
// js/state.js) : renommer ou regrouper un écran ne fait rien perdre à l'import ni au N-1.
// Bureaux, ERP, sanitaires, locaux fumeurs : découpage d'origine (pas des captages).

// Points répétés (torches, grilles des locaux de charge) : un seul écran, un sous-titre par point. Les
// points au-delà du nombre choisi (torches) ou après la dernière grille remplie (locaux de charge) sont
// masqués par leur showIf : l'écran s'allonge au fur et à mesure, sans 10 écrans à traverser.
var TORCHE_POINTS_FIELDS = [];
for (var _ti = 1; _ti <= 10; _ti++) {
  var _tp = 'torche' + _ti + '_';
  TORCHE_POINTS_FIELDS.push('#Point de mesure n°' + _ti, _tp + 'point_mesure', _tp + 'diametre_tube', _tp + 'valeur_reference',
    _tp + 'vitesse_centre', _tp + 'debit', _tp + 'ecart_pct', _tp + 'distance_l', _tp + 'vitesse_point_emission',
    _tp + 'valeur_preconisee', _tp + 'constat');
}

var LOCAL_CHARGE_GRILLES_FIELDS = [];
for (var _gi = 1; _gi <= 10; _gi++) {
  var _gp = 'grille' + _gi + '_';
  LOCAL_CHARGE_GRILLES_FIELDS.push('#Grille n°' + _gi, _gp + 'largeur', _gp + 'longueur', _gp + 'diametre',
    _gp + 'debit_cone', _gp + 'valeur_mesuree', _gp + 'debit_obtenu');
}

// Box de préparation : un écran par captage (conduit, vitesse et débit), masqué au-delà de nombre_captage
var BOX_CAPTAGE_STEPS = [];
for (var _bi = 1; _bi <= 4; _bi++) {
  var _bp = 'captage' + _bi + '_';
  BOX_CAPTAGE_STEPS.push({
    title: 'Mesure du captage n°' + _bi,
    fields: ['#Conduit', _bp + 'forme_conduit', _bp + 'diametre_cote1', _bp + 'cote2', _bp + 'surface', _bp + 'temperature',
      _bp + 'pression_statique', _bp + 'masse_volumique',
      '#Vitesse et débit', _bp + 'vitesse_mode', _bp + 'vitesse_nb_axes', _bp + 'vitesse_nb_points', _bp + 'vitesse_grid',
      _bp + 'vitesse_directe', _bp + 'vitesse_moyenne', _bp + 'debit']
  });
}

// Mesure dans un conduit à vitesse (extracteur, échappement, menuiserie) : section, conditions, vitesse
var CONDUIT_MESURE_FIELDS = ['#Section du conduit', 'forme_section', 'diametre_cote1', 'cote2', 'surface_m2',
  'temperature_conduit', 'pression_statique', 'masse_volumique',
  '#Vitesse', 'vitesse_mode', 'vitesse_nb_axes', 'vitesse_nb_points', 'vitesse_grid', 'vitesse', 'vitesse_moyenne_grille'];

var WIZARD_STEPS = {
  bureaux: [
    { title: 'Identification', fields: ['batiment', 'reference_local', 'type_local', 'volume', 'effectif'] },
    { title: 'Type de ventilation', fields: ['type_ventilation', 'entree_air_permanente', 'ouvrant_exterieur', 'entree_air_exterieur'] },
    { title: 'Débits mesurés', fields: ['volume_min', 'debit_min_air_neuf', 'debit_total_mesure', 'debit_soufflage', 'debit_extraction', 'nombre_bouches', 'pourcentage_air_neuf', 'debit_air_neuf_introduit'] },
    { title: 'État & constat', fields: ['etat_bouches', 'type_ventilation_libelle', 'avis', 'commentaire_rapso', 'commentaire'] }
  ],

  erp: [
    { title: 'Identification', fields: ['batiment', 'reference_local', 'type_local', 'volume'] },
    { title: 'Occupation', fields: ['travailleur', 'public'] },
    { title: 'Type de ventilation', fields: ['type_ventilation', 'entree_air_permanente', 'ouvrant_exterieur', 'entree_air_exterieur'] },
    { title: 'Débits mesurés', fields: ['volume_min', 'debit_min_air_neuf', 'debit_total_mesure', 'debit_soufflage', 'debit_extraction', 'nombre_bouches', 'pourcentage_air_neuf', 'debit_air_neuf_introduit', 'etat_bouches'] },
    { title: 'Constat', fields: ['type_ventilation_libelle', 'avis', 'commentaire'] }
  ],

  installations_diverses: [
    { title: 'Installation', fields: ['batiment', 'localisation', 'type_installation', 'date_controle', 'reference_equipement', 'photo', 'mesures_choisies'] },
    { title: 'Valeurs de référence', fields: ["#Vitesse au point d'émission", 'vpe_conditions_dispersion', 'vpe_inrs', 'vpe_reference',
      '#Vitesse de transport', 'vt_type_polluant', 'vt_inrs', 'vt_reference'] },
    { title: 'Mesures', fields: ["#Vitesse au point d'émission", 'vpe_mesuree', 'avis_vpe',
      '#Vitesse de transport', 'gaine', 'forme_section', 'diametre_cote1', 'cote2', 'temperature_conduit', 'pression_statique', 'masse_volumique',
      'vt_mesuree', 'debit_vt', 'avis_vt'] },
    { title: 'Constat', fields: ['etat_visuel_reseau', 'test_fumigene', 'avis', 'observation', 'remarque'] }
  ],

  // Checklist réglementaire à 21 critères (UserForm_LOCFUMEUR) : découpée en étapes courtes par
  // thème réglementaire — un technicien qui coche une checklist officielle préfère des groupes courts.
  locaux_fumeurs: [
    { title: 'Identification', fields: ['batiment', 'localisation', 'reference_equipement', 'date_controle'] },
    { title: 'Local', fields: ['critere_local_clos', 'critere_aucune_prestation', 'critere_entretien_apres_renouvellement', 'critere_pas_lieu_passage', 'critere_fermetures_auto'] },
    { title: 'Dimensions du local', fields: ['largeur', 'longueur', 'hauteur', 'surface', 'volume'] },
    { title: "Ratio avec l'établissement", fields: ['surface_etablissement', 'crit_surface_35', 'crit_ratio_20'] },
    { title: 'Ventilation mécanique', fields: ['critere_ventilation_mecanique', 'critere_rejet_exterieur', 'critere_rejet_distance_passage', 'critere_rejet_distance_prises_air'] },
    { title: 'Débit & renouvellement', fields: ['debit_extraction', 'critere_reprise_totale', 'taux_renouvellement', 'crit_renouvellement'] },
    { title: 'Indépendance & dépression', fields: ['critere_ventilation_independante', 'critere_depression'] },
    { title: 'Attestations et entretien', fields: ['critere_attestation_installateur', 'critere_attestation_disponible', 'critere_entretien_regulier', 'critere_consultation_chsct'] },
    { title: 'Signalétique', fields: ['critere_panneau_zone_fumeur', 'critere_panneau_interdiction'] },
    { title: 'Constat', fields: ['avis_csp', 'observation'] }
  ],

  bras_aspiration: [
    { title: 'Installation', fields: ['batiment', 'activite', 'atelier', 'reference_equipement', 'photo', 'recyclage'] },
    { title: "Bouche d'aspiration", fields: ['type_bouche', 'forme_bouche', 'diametre_bouche', 'largeur_bouche_ovale', 'longueur_bouche_ovale', 'surface_bouche_autre', 'surface_bouche',
      'localisation_point_mesure', 'diametre_conduit', 'diametre_bras_cone'] },
    { title: 'Valeurs de référence', fields: ['conditions_dispersion', 'vitesse_captage', 'debit_precedent'] },
    { title: 'Mesures', fields: ['vitesse_moyenne', 'debit_calcule', 'evolution_pct', '#Distance de captage', 'distance_max_captage', 'distance_utilisation', 'conclusion_distance'] },
    { title: 'Constat', fields: ['adapte_situation', 'commentaire_1', 'etat_visuel', 'etat_conduits', 'test_fumigene', 'commentaire_2', 'conclusion'] }
  ],

  extracteur: [
    { title: 'Installation', fields: ['batiment', 'locaux_extraits', 'date_controle', 'reference_equipement', 'photo', 'mesure_debit', 'afficher_taux'] },
    { title: 'Valeurs de référence', fields: ['valeur_reference_recommandee', 'debit_annee_n1',
      '#Taux de renouvellement', 'valeur_recommandee', 'referentiel', 'volume_local'] },
    { title: 'Mesures', fields: CONDUIT_MESURE_FIELDS.concat(['#Débit', 'debit_annee_en_cours', 'avis_constructeur',
      '#Taux de renouvellement', 'volume_par_heure', 'conclusion_taux']) },
    { title: 'Constat', fields: ['observation'] }
  ],

  gaz_echappement: [
    { title: 'Installation', fields: ['type_vehicule', 'type_vehicule_autre', 'type_captage', 'batiment', 'atelier', 'date_controle', 'reference_equipement', 'photo'] },
    { title: 'Valeurs de référence', fields: ['debit_reference', 'debit_min_inrs', 'cylindree', 'regime_moteur', 'debit_min_calcule'] },
    { title: 'Mesures', fields: ['gaine'].concat(CONDUIT_MESURE_FIELDS).concat(['#Débit', 'debit_mesure', 'avis_constructeur']) },
    { title: 'Constat', fields: ['type_captage_adapte', 'etat_visuel_installations', 'etat_visuel_si_autres', 'commentaire', 'observation'] }
  ],

  hottes: [
    { title: 'Installation', fields: ['batiment', 'localisation', 'date_installation', 'date_mesure', 'reference_equipement', 'photo', 'mesures_choisies'] },
    { title: 'Valeurs de référence', fields: ["#Vitesse au point d'émission", 'vpe_min_reference', 'vpe_min_inrs', 'vpe_moy_reference', 'vpe_moy_inrs',
      '#Vitesse de transport', 'vt_type_polluant', 'vt_inrs', 'vt_reference'] },
    { title: 'Mesures', fields: ["#Vitesse au point d'émission", 'vpe_largeur_cm', 'vpe_hauteur_cm', 'vpe_nb_points_largeur', 'vpe_nb_points_hauteur', 'vpe_grid',
      'vpe_min', 'avis_vpe_min', 'vpe_moyenne', 'avis_vpe_moy', 'vpe_debit',
      '#Vitesse de transport', 'vt_mesuree', 'avis_vt'] },
    { title: 'Constat', fields: ['etat_visuel_reseau', 'test_fumigene', 'operateur_hors_volume', 'conclusion', 'observation'] }
  ],

  // Champs « toggle » (presence_trappes, entree_air_additionnelle, afficher_depoussiereur) : traités
  // comme un choix à 2 boutons par le moteur générique.
  menuiserie: [
    { title: 'Installation', fields: ['batiment', 'localisation', 'reference_equipement', 'date_controle', 'photo', 'nb_machines_reliees', 'simultaneites'] },
    { title: 'Réseau et dépoussiéreur', fields: ['reseau_forme', 'reseau_forme_si_autres', 'presence_trappes', 'ouverture_trappes', 'entree_air_additionnelle', 'reseau_debit',
      '#Dépoussiéreur', 'afficher_depoussiereur', 'type_filtre', 'position'] },
    { title: 'Valeurs de référence', fields: ['valeur_reference_recommandee', 'debit_annee_n1'] },
    { title: 'Mesures', fields: ['mesure_localisation'].concat(CONDUIT_MESURE_FIELDS).concat(['#Débit', 'debit_annee_en_cours', 'avis_constructeur',
      '#Dépoussiéreur', 'perte_charge']) },
    { title: 'Constat', fields: ['etat_filtre', 'observation'] }
  ],

  // Retour terrain du 2026-11-27 (lot 1) : 8 écrans, constat demandé avant le diamètre et la vitesse.
  menuiserie_bis: [
    { title: 'Machine', fields: ['reference_machine', 'date_controle', 'type_machine', 'photo', 'simultaneites'] },
    { title: 'Valeurs de référence', fields: ['vitesse_reference', 'vitesse_inrs_ed750', 'debit_reference', 'debit_inrs_ed750'] },
    { title: 'Mesure dans le conduit', fields: ['forme_conduit', 'diametre_cote1', 'cote2', 'surface_m2', 'temperature_conduit', 'pression_statique', 'masse_volumique',
      'vitesse_mode', 'vitesse_nb_axes', 'vitesse_nb_points', 'vitesse_grid', 'vitesse_directe',
      'vitesse_moyenne', 'vitesse_avis', 'debit', 'debit_avis'] },
    { title: 'Constat', fields: ['etat_visuel_reseau', 'conclusion_avis', 'observation', 'commentaire'] }
  ],

  // Grille de points (rowsKey/colsKey calculés : nb_lignes/nb_colonnes).
  sorbonnes: [
    { title: 'Installation', fields: ['batiment', 'localisation', 'date_controle', 'reference_equipement', 'photo',
      '#Ouverture de travail', 'largeur_mm', 'annee_construction', 'h_mm_autre', 'h_mm', 'surface_ouverture'] },
    { title: 'Valeurs de référence', fields: ['vitesse_min_reference', 'vitesse_min_norme_valeur', 'vitesse_moy_reference', 'debit_reference'] },
    { title: 'Conditions de mesure', fields: ['temperature', 'hygrometrie', 'pression_atmospherique', 'difference_pression', 'appareils_mesure',
      '#Contexte', 'local', 'paillasse', 'ouvrants', 'obstacle_point_mesure', 'autres_sorbonnes', 'autres_dispositifs'] },
    { title: 'Mesures', fields: ['espace_horizontal', 'espace_vertical', 'nb_lignes', 'nb_colonnes', 'grille',
      '#Vitesse minimale', 'vitesse_min_mesuree', 'vitesse_min_avis_reference', 'vitesse_min_avis_norme',
      '#Vitesse moyenne', 'vitesse_moy_mesuree', 'vitesse_moy_avis_reference',
      '#Débit d’air extrait', 'debit_mesure', 'debit_avis_reference', 'commentaire'] },
    { title: 'Constat', fields: ['#Test au fumigène', 'zones_turbulentes', 'zones_mortes', 'perturbations', 'v90_mesuree', 'v140_mesuree', 'remarques_complementaires',
      '#Dispositif de sécurité', 'verrouillage_paroi', 'parachute_paroi', 'mesure_vitesse_frontale', 'alarme_sonore', 'alarme_visuelle', 'eclairage_interieur'] }
  ],

  tts: [
    { title: 'Installation', fields: ['activite_reference_local', 'batiment', 'date_mesure', 'reference_equipement', 'photo', 'aspiration_type', 'mesure_mode'] },
    { title: 'Procédé et cuve', fields: ['procede_famille', 'procede_type', 'procede_constituants', 'procede_conditions', 'procede_niveau_vitesse',
      '#Cuve', 'type_ventilation', 'type_cuve', 'forme_cuve', 'coef_a', 'coef_b', 'coef_n', 'diametre_cuve', 'longueur_l', 'largeur_l', 'surface_cuve', 'surface_ouvertures'] },
    { title: 'Valeurs de référence', fields: ['vitesse', 'debit_calcule', 'debit_qr10', 'debit_so', 'debit_min_inrs', 'debit_reference', 'debit_reference_fentes'] },
    { title: 'Mesures', fields: ['#Mesure dans le conduit', 'gaine', 'temperature_conduit', 'pression_statique', 'masse_volumique', 'debit_mesure', 'avis',
      '#Mesure dans les fentes', 'nb_fentes', 'longueur_fente', 'largeur_fente', 'surface_totale_fentes', 'vitesse_fentes', 'debit_mesure_fentes', 'avis_fentes'] },
    { title: 'Constat', fields: ['etat_visuel_aspiration', 'etat_visuel_si_autres', 'test_fumigene', 'observation'] }
  ],

  // 10 points au plus sur un seul écran ; « Nombre de points de mesure » masque les suivants
  // (torchePointShowIf, js/installations-schema.js).
  torches_aspirantes: [
    { title: 'Installation', fields: ['activite_reference_local', 'batiment', 'date_controle', 'reference_equipement', 'nombre_points_mesure'] },
    { title: 'Points de mesure', fields: TORCHE_POINTS_FIELDS },
    { title: 'Constat', fields: ['total_debit', 'note_reference', 'commentaire'] }
  ],

  // Grilles sur un seul écran : la grille suivante apparaît dès que la précédente est remplie.
  locaux_charge: [
    { title: 'Installation', fields: ['localisation', 'batiment', 'date_controle', 'reference_equipement', 'photo',
      'ventilation_permanente', 'ventilation_asservie', 'debit_variable', 'reglage_variateur'] },
    { title: 'Valeurs de référence', fields: ['chargeurs', 'valeur_inrs', 'valeur_reference'] },
    { title: 'Mesure sur les grilles', fields: LOCAL_CHARGE_GRILLES_FIELDS.concat(['#Débit du local', 'debit_mesure_local', 'avis']) },
    { title: 'Constat', fields: ['etat_visuel', 'si_autre', 'observation'] }
  ],

  // Taux de renouvellement après les captages : le débit du box est la somme des captages mesurés.
  box_peinture: [
    { title: 'Installation', fields: ['nombre_captage', 'activite_reference_local', 'batiment', 'date_controle', 'reference_equipement', 'photo',
      'ventilation_naturelle', 'asservissement', 'type_ventilation', 'volume_local'] }
  ].concat(BOX_CAPTAGE_STEPS).concat([
    { title: 'Taux de renouvellement', fields: ['debit_extraction_box', 'volume_par_heure', 'debit_minimal_50vh', 'conclusion_renouvellement'] },
    { title: 'Constat', fields: ['etat_visuel_installations', 'etat_visuel_si_autres', 'avis', 'observation', 'commentaire'] }
  ]),

  // Retour terrain du 2026-11-27 (lot 1) : constats demandés en premier, références mêlées aux mesures.
  cabines_peinture: [
    { title: 'Cabine', fields: ['batiment', 'marque', 'type_cabine', 'date_controle', 'reference_equipement', 'photo',
      'type_flux', 'nature_produits', 'pulverisation', 'zone_travail', 'vehicules_subjectiles'] },
    { title: 'Valeurs de référence', fields: ['avec_moy_reference', 'avec_moy_reco', 'avec_min_reference', 'avec_min_reco', 'avec_recommandee_par',
      'v1_reference', 'v1_valeur_recommandee', 'v1_recommandee_par', 'v2_active', 'v2_reference', 'v2_valeur_recommandee', 'v2_recommandee_par',
      'debit_reference'] },
    // Voiture, camion, encombrant : mesure autour du véhicule ou de l'encombrant (2026-10-08, comme le Rapso)
    { title: 'Mesure avec le véhicule ou l’encombrant', fields: ['avec_classe_camion', 'avec_nb_points', 'avec_grid', 'avec_v_moy', 'avec_moy_avis', 'avec_v_min', 'avec_min_avis'] },
    { title: 'Mesure de la cabine vide', fields: ['largeur_cabine', 'longueur_cabine', 'vitesse_nb_axes', 'vitesse_nb_points', 'vitesse_grid',
      'v1_mesuree', 'v1_avis', 'v2_mesuree', 'v2_avis', 'debit_mesure', 'debit_avis'] },
    { title: 'Mesure dans le conduit', fields: ['gaine', 'temperature_conduit', 'pression_statique', 'masse_volumique'] },
    { title: 'Constats et conclusion', fields: ['etat_visuel_cabine', 'direction_flux', 'etat_filtres', 'observation_visuel', 'conclusion', 'observations'] }
  ],

  // Réseau repris optionnel : rep_active toujours visible ; ses rubriques se masquent s'il n'est pas
  // mesuré. Les champs filt_* n'ont pas de showIf (comportement d'origine, inchangé).
  cta: [
    { title: 'Installation', fields: ['batiment', 'localisation', 'locaux_alimentes', 'date_controle', 'reference_equipement', 'mode_fonctionnement', 'photo',
      'mesure_debit', 'rep_active'] },
    { title: 'Filtration', fields: ['afficher_filtration',
      '#Pré-filtre', 'filt_pre_type', 'filt_pre_nombre_dimensions', 'filt_pre_classe', 'filt_pre_etat', 'filt_pre_perte_charge',
      '#Filtre', 'filt_filtre_type', 'filt_filtre_nombre_dimensions', 'filt_filtre_classe', 'filt_filtre_etat', 'filt_filtre_perte_charge',
      '#Filtre absolu', 'filt_absolu_type', 'filt_absolu_nombre_dimensions', 'filt_absolu_classe', 'filt_absolu_etat'] },
    { title: 'Valeurs de référence', fields: ['#Réseau d’air neuf', 'neuf_reference', 'neuf_debit_n1', '#Réseau d’air soufflé', 'souf_reference', 'souf_debit_n1',
      '#Réseau d’air repris', 'rep_reference', 'rep_debit_n1'] },
    { title: 'Mesure du réseau d’air neuf', fields: ['neuf_forme', 'neuf_diametre_cote1', 'neuf_cote2', 'neuf_surface', 'neuf_temperature_conduit', 'neuf_pression_statique',
      'neuf_masse_volumique', 'neuf_vitesse', 'neuf_debit'] },
    { title: 'Mesure du réseau d’air soufflé', fields: ['souf_forme', 'souf_diametre_cote1', 'souf_cote2', 'souf_surface', 'souf_temperature_conduit', 'souf_pression_statique',
      'souf_masse_volumique', 'souf_vitesse', 'souf_debit'] },
    { title: 'Mesure du réseau d’air repris', fields: ['rep_forme', 'rep_diametre_cote1', 'rep_cote2', 'rep_surface', 'rep_temperature_conduit', 'rep_pression_statique',
      'rep_masse_volumique', 'rep_vitesse', 'rep_debit'] },
    { title: 'Constat', fields: ['#État de l’installation', 'etat_general', 'prise_air_neuf', 'batterie_froide', 'batterie_chaude', 'canalisations_gaines',
      'ventilateur_courroie', 'fiche_maintenance', 'date_derniere_maintenance', '#Conclusion', 'avis', 'observation'] }
  ]
};
