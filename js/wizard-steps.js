// wizard-steps.js - Découpage en étapes courtes par type d'installation (chantier "ergonomie de
// saisie terrain", généralisation à partir du pattern sanitaires). Un type entre dans ce fichier
// dès qu'il passe sur le moteur générique (js/wizard-engine.js) — les types absents d'ici restent
// sur le rendu à plat existant (js/installations.js).
//
// Convention de découpage (même logique que sanitaires) : groupes courts et opérationnellement
// cohérents, 3-5 champs par étape (les champs mutuellement exclusifs via showIf comptent pour un
// seul dans la pratique). Une étape sans aucun champ visible (tous masqués par showIf) est
// automatiquement sautée par le moteur générique — sauf si on veut sciemment la garder allégée
// (cf. l'exception chambre_erp_individuelle du wizard sanitaires) : dans ce cas donner à l'étape au
// moins un champ toujours visible pour qu'elle ne disparaisse jamais.
//
// Pour les types avec grille de points (extracteur, sorbonnes, hottes, cabines_peinture,
// gaz_echappement, menuiserie, menuiserie_bis, box_peinture) ou liste de chargeurs (locaux_charge) :
// les champs qui pilotent/affichent la grille restent au rendu existant (js/installations.js,
// renderFieldInput) via gwPassthrough — chantier séparé à venir pour retravailler ce pattern.

// Blocs répétés (10 points de mesure / 10 grilles) générés par boucle plutôt que recopiés à la
// main : évite les fautes de frappe sur des clés très proches (torche1_… à torche10_…).
var TORCHE_POINT_STEPS = [];
for (var _ti = 1; _ti <= 10; _ti++) {
  TORCHE_POINT_STEPS.push({
    title: 'Point de mesure n°' + _ti,
    fields: ['torche' + _ti + '_point_mesure', 'torche' + _ti + '_diametre_tube', 'torche' + _ti + '_vitesse_centre',
      'torche' + _ti + '_distance_l', 'torche' + _ti + '_debit', 'torche' + _ti + '_valeur_reference',
      'torche' + _ti + '_ecart_pct', 'torche' + _ti + '_vitesse_point_emission', 'torche' + _ti + '_valeur_preconisee',
      'torche' + _ti + '_constat']
  });
}

var LOCAL_CHARGE_GRILLE_STEPS = [];
for (var _gi = 1; _gi <= 10; _gi++) {
  LOCAL_CHARGE_GRILLE_STEPS.push({
    title: 'Grille n°' + _gi,
    fields: ['grille' + _gi + '_largeur', 'grille' + _gi + '_longueur', 'grille' + _gi + '_diametre',
      'grille' + _gi + '_debit_cone', 'grille' + _gi + '_valeur_mesuree', 'grille' + _gi + '_debit_obtenu']
  });
}

// Jusqu'à 4 captages (box_peinture), chacun sur 2 étapes courtes (conduit / vitesse+débit) plutôt
// qu'une seule étape à 15 champs. Chaque champ captageN_* hérite le showIf sur nombre_captage
// (cf. buildBoxCaptageFields, installations-schema.js) : les étapes des captages non sélectionnés
// se masquent automatiquement, aucune logique dédiée nécessaire ici.
var BOX_CAPTAGE_STEPS = [];
for (var _bi = 1; _bi <= 4; _bi++) {
  BOX_CAPTAGE_STEPS.push({
    title: 'Captage n°' + _bi + ' — conduit',
    fields: ['captage' + _bi + '_forme_conduit', 'captage' + _bi + '_diametre_cote1', 'captage' + _bi + '_cote2',
      'captage' + _bi + '_surface', 'captage' + _bi + '_temperature', 'captage' + _bi + '_pression_statique',
      'captage' + _bi + '_masse_volumique']
  });
  BOX_CAPTAGE_STEPS.push({
    title: 'Captage n°' + _bi + ' — vitesse & débit',
    fields: ['captage' + _bi + '_vitesse_mode', 'captage' + _bi + '_vitesse_nb_axes', 'captage' + _bi + '_vitesse_nb_points',
      'captage' + _bi + '_vitesse_grid', 'captage' + _bi + '_vitesse_directe', 'captage' + _bi + '_vitesse_moyenne',
      'captage' + _bi + '_debit']
  });
}

var WIZARD_STEPS = {
  bureaux: [
    { title: 'Identification', fields: ['batiment', 'reference_local', 'type_local', 'volume', 'effectif'] },
    { title: 'Type de ventilation', fields: ['type_ventilation', 'entree_air_permanente', 'ouvrant_exterieur', 'entree_air_exterieur'] },
    { title: 'Débits mesurés', fields: ['volume_min', 'debit_min_air_neuf', 'debit_total_mesure', 'debit_soufflage', 'debit_extraction', 'nombre_bouches', 'pourcentage_air_neuf', 'debit_air_neuf_introduit'] },
    { title: 'État & constat', fields: ['etat_bouches', 'type_ventilation_libelle', 'avis', 'commentaire'] }
  ],

  erp: [
    { title: 'Identification', fields: ['batiment', 'reference_local', 'type_local', 'volume'] },
    { title: 'Occupation', fields: ['travailleur', 'public'] },
    { title: 'Type de ventilation', fields: ['type_ventilation', 'entree_air_permanente', 'ouvrant_exterieur', 'entree_air_exterieur'] },
    { title: 'Débits mesurés', fields: ['volume_min', 'debit_min_air_neuf', 'debit_total_mesure', 'debit_soufflage', 'debit_extraction', 'nombre_bouches', 'pourcentage_air_neuf', 'debit_air_neuf_introduit', 'etat_bouches'] },
    { title: 'Constat', fields: ['type_ventilation_libelle', 'avis', 'commentaire'] }
  ],

  installations_diverses: [
    { title: 'Identification', fields: ['batiment', 'localisation', 'type_installation', 'date_controle', 'reference_equipement'] },
    { title: 'État visuel', fields: ['etat_visuel_reseau', 'test_fumigene', 'mesures_choisies'] },
    { title: "Vitesse au point d'émission", fields: ['vpe_mesuree', 'vpe_conditions_dispersion', 'vpe_reference', 'vpe_inrs', 'avis_vpe'] },
    { title: 'Vitesse de transport', fields: ['vt_type_polluant', 'vt_inrs', 'vt_mesuree', 'vt_reference', 'avis_vt'] },
    { title: 'Constat', fields: ['avis', 'observation', 'remarque'] },
    { title: 'Mesure dans le conduit', fields: ['gaine', 'temperature_conduit', 'pression_statique', 'masse_volumique'] }
  ],

  // Checklist réglementaire à 21 critères (UserForm_LOCFUMEUR) : découpée en étapes courtes par
  // thème réglementaire plutôt qu'en une poignée d'étapes très longues — un technicien qui coche
  // une checklist officielle préfère des groupes courts et nommés à un mur de questions.
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
    { title: 'Identification', fields: ['batiment', 'activite', 'atelier', 'reference_equipement'] },
    { title: 'Adaptation & recyclage', fields: ['adapte_situation', 'recyclage', 'commentaire_1'] },
    { title: 'État visuel', fields: ['etat_visuel', 'etat_conduits', 'test_fumigene', 'conditions_dispersion'] },
    { title: "Bouche d'aspiration — forme", fields: ['type_bouche', 'forme_bouche', 'diametre_bouche', 'largeur_bouche_ovale', 'longueur_bouche_ovale', 'surface_bouche_autre', 'surface_bouche'] },
    { title: "Bouche d'aspiration — implantation", fields: ['diametre_conduit', 'localisation_point_mesure', 'diametre_bras_cone'] },
    { title: 'Mesures & captage', fields: ['vitesse_moyenne', 'debit_calcule', 'vitesse_captage', 'distance_max_captage', 'distance_utilisation', 'conclusion_distance'] },
    { title: 'Évolution', fields: ['debit_precedent', 'evolution_pct', 'commentaire_2'] },
    { title: 'Conclusion', fields: ['conclusion'] }
  ],

  // Grille de points (vitesse_grid) non retravaillée : reste au rendu existant via gwPassthrough.
  extracteur: [
    { title: 'Identification', fields: ['batiment', 'locaux_extraits', 'date_controle', 'reference_equipement'] },
    { title: 'Section du conduit', fields: ['forme_section', 'diametre_cote1', 'cote2', 'surface_m2'] },
    { title: 'Vitesse', fields: ['vitesse_mode', 'vitesse_nb_axes', 'vitesse_nb_points', 'vitesse_grid', 'vitesse', 'vitesse_moyenne_grille'] },
    { title: 'Débit & avis', fields: ['valeur_reference_recommandee', 'debit_annee_n1', 'debit_annee_en_cours', 'avis_constructeur', 'observation'] },
    { title: 'Taux de renouvellement (optionnel)', fields: ['afficher_taux', 'valeur_recommandee', 'referentiel', 'volume_local', 'volume_par_heure', 'conclusion_taux'] },
    { title: 'Mesure dans le conduit', fields: ['temperature_conduit', 'pression_statique', 'masse_volumique', 'photo'] }
  ],

  // Grille de points (vitesse_grid) non retravaillée : reste au rendu existant via gwPassthrough.
  gaz_echappement: [
    { title: "Type d'équipement", fields: ['type_vehicule', 'type_vehicule_autre', 'type_captage'] },
    { title: 'Identification', fields: ['batiment', 'atelier', 'date_controle', 'reference_equipement'] },
    { title: 'État visuel', fields: ['type_captage_adapte', 'etat_visuel_installations', 'etat_visuel_si_autres', 'commentaire'] },
    { title: 'Section du conduit', fields: ['forme_section', 'diametre_cote1', 'cote2', 'surface_m2'] },
    { title: 'Vitesse', fields: ['vitesse_mode', 'vitesse_nb_axes', 'vitesse_nb_points', 'vitesse_grid', 'vitesse', 'vitesse_moyenne_grille'] },
    { title: 'Débits & données constructeur', fields: ['debit_mesure', 'debit_reference', 'debit_min_inrs', 'cylindree', 'regime_moteur', 'debit_min_calcule', 'avis_constructeur', 'observation'] },
    { title: 'Mesure dans le conduit', fields: ['gaine', 'temperature_conduit', 'pression_statique', 'masse_volumique'] }
  ],

  // Grille(s) de points (vpe_grid) non retravaillée(s) : reste au rendu existant via gwPassthrough.
  // Les 3 étapes VPE sont toutes gated par le même mesures_choisies — bon test du saut automatique
  // sur plusieurs étapes consécutives masquées ensemble.
  hottes: [
    { title: 'Identification', fields: ['batiment', 'localisation', 'date_installation', 'date_mesure', 'reference_equipement'] },
    { title: 'État visuel & mesures choisies', fields: ['etat_visuel_reseau', 'test_fumigene', 'mesures_choisies'] },
    { title: "VPE — dimensions & grille", fields: ['vpe_largeur_cm', 'vpe_hauteur_cm', 'vpe_nb_points_largeur', 'vpe_nb_points_hauteur', 'vpe_grid'] },
    { title: 'VPE — résultats', fields: ['vpe_min', 'vpe_moyenne', 'vpe_debit', 'operateur_hors_volume'] },
    { title: 'VPE — avis vs référence', fields: ['vpe_min_reference', 'vpe_min_inrs', 'avis_vpe_min', 'vpe_moy_reference', 'vpe_moy_inrs', 'avis_vpe_moy'] },
    { title: 'Vitesse de transport', fields: ['vt_type_polluant', 'vt_inrs', 'vt_mesuree', 'vt_reference', 'avis_vt'] },
    { title: 'Constat', fields: ['conclusion', 'observation', 'photo'] }
  ],

  // Grille de points (vitesse_grid) non retravaillée : reste au rendu existant via gwPassthrough.
  // Premier type avec des champs type "toggle" (presence_trappes, entree_air_additionnelle,
  // afficher_depoussiereur) — jusqu'ici invisibles dans le rendu à plat (aucun cas 'toggle' dans
  // renderFieldInput) : le moteur générique les traite comme un select à 2 choix (boutons Oui/Non),
  // ils redeviennent saisissables. Pas un bug de calcul, mais un vrai gain de couverture de saisie.
  menuiserie: [
    { title: 'Identification', fields: ['batiment', 'localisation', 'reference_equipement', 'date_controle'] },
    { title: 'Machines reliées', fields: ['nb_machines_reliees', 'simultaneites', 'photo'] },
    { title: 'Caractéristique du réseau', fields: ['reseau_forme', 'reseau_forme_si_autres', 'presence_trappes', 'ouverture_trappes', 'entree_air_additionnelle', 'reseau_debit'] },
    { title: 'Dépoussiéreur', fields: ['afficher_depoussiereur', 'type_filtre', 'position', 'etat_filtre', 'perte_charge'] },
    { title: 'Section du conduit', fields: ['mesure_localisation', 'forme_section', 'diametre_cote1', 'cote2', 'surface_m2'] },
    { title: 'Vitesse', fields: ['vitesse_mode', 'vitesse_nb_axes', 'vitesse_nb_points', 'vitesse_grid', 'vitesse', 'vitesse_moyenne_grille'] },
    { title: 'Mesure dans le conduit', fields: ['temperature_conduit', 'pression_statique', 'masse_volumique'] },
    { title: 'Débit', fields: ['valeur_reference_recommandee', 'debit_annee_n1', 'debit_annee_en_cours', 'avis_constructeur', 'observation'] }
  ],

  // Grille de points (vitesse_grid) non retravaillée : reste au rendu existant via gwPassthrough.
  menuiserie_bis: [
    { title: 'Localisation', fields: ['reference_machine', 'date_controle', 'type_machine', 'photo', 'simultaneites'] },
    { title: 'Vitesse de transport', fields: ['vitesse_moyenne', 'vitesse_reference', 'vitesse_inrs_ed750', 'vitesse_avis'] },
    { title: 'Calcul du débit', fields: ['debit', 'debit_reference', 'debit_inrs_ed750', 'debit_avis'] },
    { title: 'État visuel', fields: ['etat_visuel_reseau'] },
    { title: 'Constat', fields: ['conclusion_avis', 'observation'] },
    { title: 'Conduit — section', fields: ['forme_conduit', 'diametre_cote1', 'cote2', 'surface_m2'] },
    { title: 'Conduit — vitesse', fields: ['vitesse_mode', 'vitesse_nb_axes', 'vitesse_nb_points', 'vitesse_grid', 'vitesse_directe'] },
    { title: 'Conduit — mesures & commentaire', fields: ['temperature_conduit', 'pression_statique', 'masse_volumique', 'commentaire'] }
  ],

  // Grille de points (rowsKey/colsKey eux-mêmes calculés : nb_lignes/nb_colonnes) non retravaillée :
  // reste au rendu existant via gwPassthrough.
  sorbonnes: [
    { title: 'Identification', fields: ['batiment', 'localisation', 'date_controle', 'reference_equipement', 'photo'] },
    { title: 'Mesures ambiantes', fields: ['temperature', 'hygrometrie', 'pression_atmospherique', 'difference_pression', 'appareils_mesure'] },
    { title: 'Contexte de mesures', fields: ['local', 'paillasse', 'ouvrants', 'obstacle_point_mesure', 'autres_sorbonnes', 'autres_dispositifs'] },
    { title: 'Test au fumigène', fields: ['zones_turbulentes', 'zones_mortes', 'perturbations', 'v90_mesuree', 'v140_mesuree', 'remarques_complementaires'] },
    { title: 'Ouverture de travail', fields: ['largeur_mm', 'annee_construction', 'h_mm_autre', 'h_mm', 'surface_ouverture'] },
    { title: 'Dispositif de sécurité', fields: ['verrouillage_paroi', 'parachute_paroi', 'mesure_vitesse_frontale', 'alarme_sonore', 'alarme_visuelle', 'eclairage_interieur'] },
    { title: 'Grille de points', fields: ['espace_horizontal', 'espace_vertical', 'nb_lignes', 'nb_colonnes', 'grille', 'commentaire'] },
    { title: 'Résultats — vitesse', fields: ['vitesse_min_mesuree', 'vitesse_min_reference', 'vitesse_min_avis_reference', 'vitesse_min_avis_norme', 'vitesse_moy_mesuree', 'vitesse_moy_reference', 'vitesse_moy_avis_reference'] },
    { title: 'Résultats — débit', fields: ['debit_mesure', 'debit_reference', 'debit_avis_reference'] }
  ],

  tts: [
    { title: 'Identification', fields: ['activite_reference_local', 'batiment', 'date_mesure', 'reference_equipement', 'photo'] },
    { title: 'Type & état visuel', fields: ['aspiration_type', 'mesure_mode', 'etat_visuel_aspiration', 'etat_visuel_si_autres', 'test_fumigene'] },
    { title: 'Procédé', fields: ['procede_famille', 'procede_type', 'procede_constituants', 'procede_conditions', 'procede_niveau_vitesse'] },
    { title: 'Cuve — caractéristiques', fields: ['type_ventilation', 'type_cuve', 'forme_cuve', 'coef_a', 'coef_b', 'coef_n'] },
    { title: 'Cuve — dimensions', fields: ['diametre_cuve', 'longueur_l', 'largeur_l', 'surface_cuve', 'surface_ouvertures'] },
    { title: 'Débits & avis', fields: ['vitesse', 'debit_calcule', 'debit_qr10', 'debit_so', 'debit_min_inrs', 'debit_mesure', 'debit_reference', 'avis', 'observation'] },
    { title: 'Mesure dans les fentes', fields: ['nb_fentes', 'longueur_fente', 'largeur_fente', 'surface_totale_fentes', 'vitesse_fentes', 'debit_mesure_fentes', 'debit_reference_fentes', 'avis_fentes'] },
    { title: 'Mesure dans le conduit', fields: ['gaine', 'temperature_conduit', 'pression_statique', 'masse_volumique'] }
  ],

  // 10 points de mesure : un point regroupe volontairement plus que 3-5 champs (mesures + résultat
  // calculé immédiat, même logique que sanitaires étape 3) plutôt que de le scinder en 2 étapes —
  // un technicien qui mesure le point N veut voir son résultat dans la foulée.
  torches_aspirantes: [
    { title: 'Identification', fields: ['activite_reference_local', 'batiment', 'date_controle', 'reference_equipement'] },
    { title: 'Constat global', fields: ['note_reference', 'total_debit', 'commentaire'] }
  ].concat(TORCHE_POINT_STEPS),

  // Chargeurs (liste) et grilles non retravaillés en tap-friendly (widgets à part, cf. commentaire
  // gwPassthrough) : chantier séparé à venir, comme les grilles de points.
  locaux_charge: [
    { title: 'Identification', fields: ['localisation', 'batiment', 'date_controle', 'reference_equipement', 'photo'] },
    { title: 'Ventilation', fields: ['ventilation_permanente', 'ventilation_asservie', 'debit_variable', 'reglage_variateur'] },
    { title: 'État visuel', fields: ['etat_visuel', 'si_autre'] },
    { title: 'Chargeurs (guide INRS)', fields: ['chargeurs', 'valeur_inrs'] }
  ].concat(LOCAL_CHARGE_GRILLE_STEPS).concat([
    { title: 'Mesure du débit', fields: ['valeur_reference', 'debit_mesure_local', 'avis', 'observation'] }
  ]),

  box_peinture: [
    { title: 'Identification', fields: ['nombre_captage', 'activite_reference_local', 'batiment', 'date_controle', 'reference_equipement', 'photo'] },
    { title: 'État visuel & ventilation', fields: ['etat_visuel_installations', 'etat_visuel_si_autres', 'ventilation_naturelle', 'asservissement', 'type_ventilation'] },
    { title: 'Taux de renouvellement', fields: ['volume_local', 'debit_extraction_box', 'volume_par_heure', 'debit_minimal_50vh', 'conclusion_renouvellement'] }
  ].concat(BOX_CAPTAGE_STEPS).concat([
    { title: 'Constat', fields: ['avis', 'observation', 'commentaire'] }
  ]),

  // Grille de points (vitesse_grid) non retravaillée : reste au rendu existant via gwPassthrough.
  cabines_peinture: [
    { title: 'Identification', fields: ['batiment', 'marque', 'type_cabine', 'date_controle', 'reference_equipement', 'photo'] },
    { title: 'Caractéristiques', fields: ['type_flux', 'nature_produits', 'pulverisation', 'zone_travail'] },
    { title: 'Contrôle visuel', fields: ['etat_visuel_cabine', 'direction_flux', 'etat_filtres', 'observation_visuel'] },
    { title: 'Cabine vide — dimensions & grille', fields: ['largeur_cabine', 'longueur_cabine', 'vitesse_nb_axes', 'vitesse_nb_points', 'vitesse_grid', 'vitesse_moyenne_grille'] },
    { title: 'Vitesse moyenne', fields: ['v1_mesuree', 'v1_reference', 'v1_valeur_recommandee', 'v1_recommandee_par', 'v1_avis'] },
    { title: 'Vitesse minimale (optionnel)', fields: ['v2_active', 'v2_mesuree', 'v2_reference', 'v2_valeur_recommandee', 'v2_recommandee_par', 'v2_avis'] },
    { title: 'Débit dans la cabine vide', fields: ['debit_mesure', 'debit_reference', 'debit_avis'] },
    { title: 'Conclusion', fields: ['conclusion', 'observations'] },
    { title: 'Mesure dans le conduit', fields: ['gaine', 'temperature_conduit', 'pression_statique', 'masse_volumique'] }
  ],

  // Dernier type migré (le plus complexe). Le réseau "repris" (rep_*) est optionnel
  // (buildCtaReseauFields(..., true)) : rep_active reste toujours visible (pas de showIf dessus,
  // même logique que chambre_erp_individuelle côté sanitaires — étape jamais totalement masquée),
  // mais l'étape "Réseau repris — mesures" (entièrement gated sur rep_active='Oui') se masque
  // automatiquement si le réseau n'est pas mesuré. La filtration (afficher_filtration) n'a jamais
  // gated les champs filt_*_… dans le schéma existant (buildCtaFiltreFields ne pose aucun showIf) —
  // comportement inchangé, pas une régression introduite ici.
  cta: [
    { title: 'Identification', fields: ['batiment', 'localisation', 'locaux_alimentes', 'date_controle', 'reference_equipement', 'mode_fonctionnement'] },
    { title: 'État visuel (1/2)', fields: ['etat_general', 'prise_air_neuf', 'batterie_froide', 'batterie_chaude'] },
    { title: 'État visuel (2/2)', fields: ['canalisations_gaines', 'ventilateur_courroie', 'fiche_maintenance', 'date_derniere_maintenance'] },
    { title: 'Filtration — pré-filtre', fields: ['afficher_filtration', 'filt_pre_etat', 'filt_pre_type', 'filt_pre_nombre_dimensions', 'filt_pre_classe', 'filt_pre_perte_charge'] },
    { title: 'Filtration — filtre', fields: ['filt_filtre_etat', 'filt_filtre_type', 'filt_filtre_nombre_dimensions', 'filt_filtre_classe', 'filt_filtre_perte_charge'] },
    { title: 'Filtration — filtre absolu', fields: ['filt_absolu_etat', 'filt_absolu_type', 'filt_absolu_nombre_dimensions', 'filt_absolu_classe'] },
    { title: 'Réseau neuf — section', fields: ['neuf_forme', 'neuf_diametre_cote1', 'neuf_cote2', 'neuf_surface'] },
    { title: 'Réseau neuf — mesures', fields: ['neuf_temperature_conduit', 'neuf_pression_statique', 'neuf_masse_volumique', 'neuf_vitesse', 'neuf_reference', 'neuf_debit_n1', 'neuf_debit'] },
    { title: 'Réseau soufflé — section', fields: ['souf_forme', 'souf_diametre_cote1', 'souf_cote2', 'souf_surface'] },
    { title: 'Réseau soufflé — mesures', fields: ['souf_temperature_conduit', 'souf_pression_statique', 'souf_masse_volumique', 'souf_vitesse', 'souf_reference', 'souf_debit_n1', 'souf_debit'] },
    { title: 'Réseau repris (optionnel) — section', fields: ['rep_active', 'rep_forme', 'rep_diametre_cote1', 'rep_cote2', 'rep_surface'] },
    { title: 'Réseau repris — mesures', fields: ['rep_temperature_conduit', 'rep_pression_statique', 'rep_masse_volumique', 'rep_vitesse', 'rep_reference', 'rep_debit_n1', 'rep_debit'] },
    { title: 'Constat', fields: ['avis', 'observation'] }
  ]
};
