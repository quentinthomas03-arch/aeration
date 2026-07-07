// installations-schema.js
// Schémas déclaratifs des 17 types d'installations de contrôle aération
// Extraits des modules VBA TAB_x_*.bas (mapping colonnes -> libellés) + CONSTANTE.bas (libellés d'options)
// Statut "implemented:false" = squelette à compléter (liste présente, formulaire détaillé à venir)

var OPT_CONFORME = ['Conforme', 'Non Conforme'];
var OPT_OUI_NON = ['Oui', 'Non'];
var OPT_SATISFAISANT = ['Satisfaisant', 'Non Satisfaisant', 'Impossible de se prononcer'];

var INSTALLATION_TYPES = [
  {
    id: 'bureaux', label: 'Bureaux / Salles de réunion', icon: 'building', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement', type: 'text' },
      { key: 'volume', label: 'Volume (m³)', type: 'number' },
      { key: 'effectif', label: 'Effectif', type: 'number' },
      { key: 'debit_total_mesure', label: 'Débit total mesuré (m³/h)', type: 'number' },
      { key: 'nombre_bouches', label: 'Nombre de bouches', type: 'number' },
      { key: 'pourcentage_air_neuf', label: 'Pourcentage d\u2019air neuf (%)', type: 'number' },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'sanitaires', label: 'Sanitaires', icon: 'droplet', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment secteur', type: 'text' },
      { key: 'repere', label: 'Repère', type: 'text' },
      { key: 'nom_usage', label: 'Nom / Usage', type: 'text' },
      { key: 'wc_urinoirs', label: 'WC / Urinoirs', type: 'number' },
      { key: 'douches', label: 'Douches', type: 'number' },
      { key: 'lavabos', label: 'Lavabos', type: 'number' },
      { key: 'type_usage', label: 'Individuel ou Collectif', type: 'select', options: ['Individuel', 'Collectif'] },
      { key: 'debit_ventilation', label: 'Débit extraction ou ventilation naturelle', type: 'text' },
      { key: 'nombre_douche', label: 'Nombre de douche', type: 'number' }
    ]
  },
  {
    id: 'locaux_fumeurs', label: 'Locaux fumeurs', icon: 'building', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'marque', label: 'Marque', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Référence équipement', type: 'text' },
      { key: 'largeur', label: 'Largeur (m)', type: 'number' },
      { key: 'longueur', label: 'Longueur (m)', type: 'number' },
      { key: 'hauteur', label: 'Hauteur (m)', type: 'number' },
      { key: 'surface', label: 'Surface (calculée) (m²)', type: 'number' },
      { key: 'surface_reelle', label: 'Surface réelle (m²)', type: 'number' },
      { key: 'volume', label: 'Volume (calculé) (m³)', type: 'number' },
      { key: 'volume_reel', label: 'Volume réel (m³)', type: 'number' },
      { key: 'avis_csp', label: 'Avis par rapport aux critères du code de la santé publique', type: 'select', options: OPT_CONFORME }
    ]
  },
  {
    id: 'cta', label: 'CTA (Centrale de traitement d\u2019air)', icon: 'tool', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'marque', label: 'Marque', type: 'text' },
      { key: 'locaux_alimentes', label: 'Locaux alimentés', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement', type: 'text' },
      { key: 'taux_renouvellement_affiche', label: 'Taux de renouvellement affiché', type: 'select', options: OPT_OUI_NON },
      { key: 'filtration_affichee', label: 'Filtration affichée', type: 'select', options: OPT_OUI_NON },
      { key: 'evolution_valeurs_affichee', label: 'Évolution des valeurs affichée', type: 'select', options: OPT_OUI_NON },
      { key: 'depoussiereur_affiche', label: 'Dépoussiéreur affiché', type: 'select', options: OPT_OUI_NON },
      { key: 'avis_reference', label: 'Avis par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'extracteur', label: 'Extracteur', icon: 'zap', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'locaux_extraits', label: 'Locaux extraits', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement', type: 'text' },

      { key: 'section_gaine', label: 'Section / gaine', type: 'section' },
      { key: 'forme_section', label: 'Forme de la section', type: 'select', options: ['Circulaire', 'Rectangulaire'] },
      { key: 'diametre_cote1', label: 'Diamètre ou côte 1 (cm)', type: 'number' },
      { key: 'cote2', label: 'Côte 2 (cm)', type: 'number' },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'number' },
      { key: 'vitesse', label: 'Vitesse (m/s)', type: 'number' },
      { key: 'gaine', label: 'Gaine', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'number' },

      { key: 'section_debit', label: 'Débit', type: 'section' },
      { key: 'valeur_reference_recommandee', label: 'Valeur de référence ou recommandée (m³/h)', type: 'number' },
      { key: 'debit_annee_n1', label: 'Débit année N-1 (m³/h)', type: 'number' },
      { key: 'debit_annee_en_cours', label: 'Débit année en cours (m³/h)', type: 'number' },
      { key: 'valeur_mesuree', label: 'Valeur mesurée (m/s)', type: 'number' },
      { key: 'avis_constructeur', label: 'Avis par rapport aux données constructeur', type: 'select', options: OPT_CONFORME },

      { key: 'section_grille', label: 'Grille de mesure', type: 'section' },
      { key: 'largeur_cm', label: 'Largeur (cm)', type: 'number' },
      { key: 'longueur_cm', label: 'Longueur (cm)', type: 'number' },
      { key: 'nombre_axes', label: 'Nombre d\u2019axes', type: 'number' },
      { key: 'nombre_points', label: 'Nombre de points', type: 'number' },
      { key: 'nombre_points_total', label: 'Nombre de points total', type: 'number' },
      { key: 'nombre_points_par_axe', label: 'Nombre de points par axe', type: 'number' },
      { key: 'diametre_cm', label: 'Diamètre (cm)', type: 'number' },

      { key: 'section_local', label: 'Local (taux de renouvellement)', type: 'section' },
      { key: 'valeur_recommandee', label: 'Valeur recommandée', type: 'text' },
      { key: 'referentiel', label: 'Référentiel', type: 'text' },
      { key: 'volume_local', label: 'Volume du local (m³)', type: 'number' },
      { key: 'volume_par_heure', label: 'Volume par heure', type: 'number' },

      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'erp', label: 'ERP', icon: 'building', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'marque', label: 'Marque', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement', type: 'text' },
      { key: 'volume', label: 'Volume (m³)', type: 'number' },
      { key: 'travailleur', label: 'Travailleur', type: 'number' },
      { key: 'public', label: 'Public', type: 'number' },
      { key: 'debit_total_mesure', label: 'Débit total mesuré (m³/h)', type: 'number' },
      { key: 'nombre_bouches', label: 'Nombre de bouches', type: 'number' },
      { key: 'pourcentage_air_neuf', label: 'Pourcentage d\u2019air neuf (%)', type: 'number' },
      { key: 'conclusion', label: 'Conclusion', type: 'select', options: OPT_CONFORME },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' }
    ]
  },
  {
    id: 'sorbonnes', label: 'Sorbonnes', icon: 'flask', implemented: true,
    fields: [
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement', type: 'text' },

      { key: 'section_ambiance', label: 'Conditions ambiantes', type: 'section' },
      { key: 'temperature', label: 'Température (°C)', type: 'number' },
      { key: 'hygrometrie', label: 'Hygrométrie (%)', type: 'number' },
      { key: 'pression_atmospherique', label: 'Pression atmosphérique (Pa)', type: 'number' },
      { key: 'difference_pression', label: 'Différence de pression (Pa) entre le local et son environnement', type: 'number' },
      { key: 'appareils_mesure', label: 'Appareils de mesure utilisés', type: 'text' },
      { key: 'test_fumigene_perturbation', label: 'Le test au fumigène met-il en évidence des perturbations susceptibles de gêner le bon fonctionnement de la sorbonne ?', type: 'select', options: OPT_OUI_NON },

      { key: 'section_vitesse', label: 'Vitesse à l\u2019ouverture', type: 'section' },
      { key: 'vitesse_90cm', label: 'Vitesse (m/s) distance 90 cm', type: 'number' },
      { key: 'vitesse_140cm', label: 'Vitesse (m/s) distance 140 cm', type: 'number' },
      { key: 'largeur_mm', label: 'Largeur (mm)', type: 'number' },
      { key: 'ouverture_travail_h', label: 'Ouverture de travail h (mm) selon année de construction', type: 'number' },
      { key: 'surface_ouverture', label: 'Surface de l\u2019ouverture', type: 'number' },
      { key: 'espace_horizontal', label: 'Espace horizontal entre 2 points (mm)', type: 'number' },
      { key: 'espace_vertical', label: 'Espace vertical entre 2 points (mm)', type: 'number' },

      { key: 'section_mesures', label: 'Résultats de mesure', type: 'section' },
      { key: 'valeur_mesuree_1', label: 'Valeur mesurée', type: 'number' },
      { key: 'valeur_reference_1', label: 'Valeur de référence', type: 'number' },
      { key: 'valeur_norme_1', label: 'Valeur norme', type: 'number' },
      { key: 'avis_reference', label: 'Avis par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },
      { key: 'avis_normatif', label: 'Avis par rapport aux valeurs normatives', type: 'select', options: OPT_CONFORME },

      { key: 'commentaire', label: 'Commentaire', type: 'textarea' }
    ]
  },
  {
    id: 'hottes', label: 'Hottes', icon: 'flask', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement', type: 'text' },
      { key: 'etat_visuel_reseau', label: 'État visuel du réseau d\u2019aspiration', type: 'select',
        options: OPT_SATISFAISANT },
      { key: 'type_fumigene', label: 'Type fumigène', type: 'select',
        options: ['Tube fumigène', 'Générateur de fumée', 'Fil de laine', 'Autre'] },
      { key: 'mesures_choisies', label: 'Mesures choisies', type: 'checkbox-group',
        options: ['Vitesse au point d\u2019émission', 'Vitesse moyenne'] },

      { key: 'section_vitesse_emission', label: 'Vitesse au point d\u2019émission', type: 'section' },
      { key: 'vpe_mesuree', label: 'Valeur mesurée (m/s)', type: 'number' },
      { key: 'vpe_reference', label: 'Valeur de référence (m/s)', type: 'number' },
      { key: 'vpe_inrs_ed835', label: 'Valeur recommandée INRS (ED 835)', type: 'number' },
      { key: 'vpe_avis', label: 'Avis par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },

      { key: 'section_vitesse_moyenne', label: 'Vitesse moyenne', type: 'section' },
      { key: 'vm_mesuree', label: 'Valeur mesurée (m/s)', type: 'number' },
      { key: 'vm_reference', label: 'Valeur de référence (m/s)', type: 'number' },
      { key: 'vm_inrs_ed835', label: 'Valeur recommandée INRS (ED 835)', type: 'number' },
      { key: 'vm_avis', label: 'Avis par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },

      { key: 'section_debit', label: 'Débit', type: 'section' },
      { key: 'debit_recommande', label: 'Valeur recommandée', type: 'number' },
      { key: 'type_polluants', label: 'Type de polluants', type: 'text' },
      { key: 'debit_reference', label: 'Valeur de référence', type: 'number' },
      { key: 'debit_inrs_ed651', label: 'Valeur recommandée INRS (ED 651)', type: 'number' },
      { key: 'debit_avis', label: 'Avis par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },

      { key: 'valeur_recommandee_autre', label: 'Valeur recommandée (autre)', type: 'text' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_grille', label: 'Grille de mesure', type: 'section' },
      { key: 'largeur_cm', label: 'Largeur (cm)', type: 'number' },
      { key: 'hauteur_cm', label: 'Hauteur (cm)', type: 'number' },
      { key: 'nb_points_largeur', label: 'Nombre de points sur la largeur', type: 'number' },
      { key: 'nb_points_hauteur', label: 'Nombre de points sur la hauteur', type: 'number' },

      { key: 'operateur_hors_volume', label: 'L\u2019opérateur est situé en dehors du volume entre le point d\u2019émission et la hotte',
        type: 'select', options: OPT_CONFORME },

      { key: 'section_conduit', label: 'Mesures dans le conduit', type: 'section' },
      { key: 'vitesse_minimale', label: 'Vitesse minimale (m/s)', type: 'number' },
      { key: 'vitesse_moyenne_conduit', label: 'Vitesse moyenne (m/s)', type: 'number' },
      { key: 'debit_air_extrait', label: 'Débit d\u2019air extrait (m³/h)', type: 'number' },
      { key: 'gaine', label: 'Gaine', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'number' },

      { key: 'photo', label: 'Photo', type: 'photo' }
    ]
  },
  {
    id: 'bras_aspiration', label: 'Bras d\u2019aspiration', icon: 'zap', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'activite', label: 'Activité', type: 'text' },
      { key: 'atelier', label: 'Atelier', type: 'text' },
      { key: 'reference_equipement', label: 'Référence équipement', type: 'text' },
      { key: 'adapte_situation', label: 'Adapté à la situation', type: 'select', options: OPT_OUI_NON },
      { key: 'commentaire_1', label: 'Commentaire', type: 'textarea' },
      { key: 'recyclage', label: 'Recyclage', type: 'select', options: OPT_OUI_NON },
      { key: 'etat_visuel', label: 'État visuel', type: 'select', options: OPT_SATISFAISANT },
      { key: 'etat_conduits', label: 'État des conduits aérauliques', type: 'select', options: OPT_SATISFAISANT },
      { key: 'test_fumigene', label: 'Test fumigène', type: 'select', options: OPT_SATISFAISANT },

      { key: 'section_bouche', label: 'Bouche d\u2019aspiration', type: 'section' },
      { key: 'type_bouche', label: 'Type de bouche d\u2019aspiration', type: 'text' },
      { key: 'diametre_bouche', label: 'Diamètre de la bouche (cm)', type: 'number' },
      { key: 'largeur_bouche_ovale', label: 'Largeur de la bouche si ovale (cm)', type: 'number' },
      { key: 'longueur_bouche_ovale', label: 'Longueur de la bouche si ovale (cm)', type: 'number' },
      { key: 'surface_bouche_autre', label: 'Surface de la bouche pour les autres cas (m²)', type: 'number' },
      { key: 'diametre_conduit', label: 'Diamètre du conduit (cm)', type: 'number' },
      { key: 'localisation_point_mesure', label: 'Localisation du point de mesure', type: 'text' },
      { key: 'diametre_bras_cone', label: 'Diamètre du bras au niveau du cône (cm)', type: 'number' },

      { key: 'section_mesures', label: 'Mesures', type: 'section' },
      { key: 'vitesse_moyenne', label: 'Vitesse moyenne mesurée (m/s)', type: 'number' },
      { key: 'debit_calcule', label: 'Débit calculé (m³/h)', type: 'number' },
      { key: 'distance_max_captage', label: 'Distance maximum de captage (cm)', type: 'number' },
      { key: 'distance_utilisation', label: 'Distance d\u2019utilisation (cm)', type: 'number' },

      { key: 'section_evolution', label: 'Évolution des valeurs', type: 'section' },
      { key: 'debit_precedent', label: 'Débit mesuré précédemment (m³/h)', type: 'number' },
      { key: 'debit_annee', label: 'Débit mesuré cette année (m³/h)', type: 'number' },
      { key: 'evolution_pct', label: 'Évolution (%)', type: 'number' },
      { key: 'commentaire_2', label: 'Commentaire', type: 'textarea' },

      { key: 'conclusion', label: 'Conclusion', type: 'select', options: OPT_CONFORME },
      { key: 'observations', label: 'Observations', type: 'textarea' }
    ]
  },
  {
    id: 'cabines_peinture', label: 'Cabines de peinture', icon: 'building', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement', type: 'text' },

      { key: 'section_visuel', label: 'Contrôle visuel', type: 'section' },
      { key: 'etat_visuel_cabine', label: 'État visuel de la cabine', type: 'select', options: OPT_SATISFAISANT },
      { key: 'direction_flux', label: 'Vérification de la direction du flux', type: 'select', options: OPT_SATISFAISANT },
      { key: 'etat_filtres', label: 'État des filtres', type: 'select', options: OPT_SATISFAISANT },
      { key: 'avis_csp', label: 'Avis par rapport aux critères du code de la santé publique', type: 'select', options: OPT_CONFORME },
      { key: 'observation_visuel', label: 'Observation', type: 'textarea' },

      { key: 'section_vitesses', label: 'Mesures de vitesse', type: 'section' },
      { key: 'v1_mesuree', label: 'Valeur mesurée (m/s)', type: 'number' },
      { key: 'v1_reference', label: 'Valeur de référence', type: 'number' },
      { key: 'v1_recommandee', label: 'Valeur recommandée par', type: 'text' },
      { key: 'v1_avis', label: 'Avis par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },

      { key: 'section_debit', label: 'Débit', type: 'section' },
      { key: 'debit_mesure', label: 'Débit mesuré (m³/h)', type: 'number' },
      { key: 'debit_reference', label: 'Valeur de référence', type: 'number' },
      { key: 'debit_avis', label: 'Avis', type: 'select', options: OPT_CONFORME },

      { key: 'section_conduit', label: 'Mesures dans le conduit', type: 'section' },
      { key: 'gaine', label: 'Gaine', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'number' },
      { key: 'largeur_cm', label: 'Largeur (cm)', type: 'number' },
      { key: 'longueur_cm', label: 'Longueur (cm)', type: 'number' },
      { key: 'diametre_cm', label: 'Diamètre (cm)', type: 'number' },
      { key: 'nombre_axes', label: 'Nombre d\u2019axes', type: 'number' },
      { key: 'nombre_points', label: 'Nombre de points', type: 'number' },
      { key: 'nombre_points_total', label: 'Nombre de points total', type: 'number' },
      { key: 'valeur_mesuree_conduit', label: 'Valeur mesurée (m/s)', type: 'number' },

      { key: 'observations', label: 'Observations', type: 'textarea' }
    ]
  },
  {
    id: 'installations_diverses', label: 'Installations diverses', icon: 'tool', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement', type: 'text' },
      { key: 'avis_reference', label: 'Avis par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },
      { key: 'observation', label: 'Observation', type: 'textarea' },
      { key: 'remarque', label: 'Remarque', type: 'textarea' }
    ]
  },
  {
    id: 'gaz_echappement', label: 'Gaz d\u2019échappement', icon: 'zap', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'atelier', label: 'Atelier', type: 'text' },
      { key: 'reference_equipement', label: 'Réf. équipement et/ou implantation', type: 'text' },
      { key: 'type_captage_adapte', label: 'Type de captage adapté à la situation', type: 'select', options: OPT_OUI_NON },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' },

      { key: 'section_reseau', label: 'Réseau d\u2019air', type: 'section' },
      { key: 'reseau_air', label: 'Réseau d\u2019air', type: 'text' },
      { key: 'diametre_cote1', label: 'Diamètre ou côte 1 (cm)', type: 'number' },
      { key: 'cote2', label: 'Côte 2 (cm)', type: 'number' },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'number' },
      { key: 'vitesse', label: 'Vitesse (m/s)', type: 'number' },

      { key: 'section_debits', label: 'Débits', type: 'section' },
      { key: 'debit_mesure', label: 'Débit mesuré (m³/h)', type: 'number' },
      { key: 'debit_reference', label: 'Débit de référence (m³/h)', type: 'number' },
      { key: 'debit_min_inrs', label: 'Débit minimum préconisé INRS (m³/h)', type: 'number' },
      { key: 'cylindree', label: 'V : cylindrée du véhicule (litres)', type: 'number' },
      { key: 'regime_moteur', label: 'n : régime du moteur (tours/min)', type: 'number' },
      { key: 'debit_min_calcule', label: 'Débit minimum calculé (m³/h)', type: 'number' },
      { key: 'avis_constructeur', label: 'Avis par rapport aux données constructeur', type: 'select', options: OPT_CONFORME },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_conduit', label: 'Mesures dans le conduit', type: 'section' },
      { key: 'type_conduit', label: 'Type de conduit', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'number' },
      { key: 'largeur_cm', label: 'Largeur (cm)', type: 'number' },
      { key: 'longueur_cm', label: 'Longueur (cm)', type: 'number' },
      { key: 'diametre_cm', label: 'Diamètre (cm)', type: 'number' },
      { key: 'nombre_axes', label: 'Nombre d\u2019axes', type: 'number' },
      { key: 'nombre_points', label: 'Nombre de points', type: 'number' },
      { key: 'valeur_mesuree_conduit', label: 'Valeur mesurée (m/s)', type: 'number' },
      { key: 'configuration_mesure', label: 'Configuration lors de la mesure', type: 'text' }
    ]
  },
  {
    id: 'menuiserie', label: 'Menuiserie (réseau d\u2019aspiration)', icon: 'tool', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'nb_machines_reliees', label: 'Nombre de machines reliées au dispositif', type: 'number' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Référence équipement', type: 'text' },

      { key: 'section_filtre', label: 'Filtration', type: 'section' },
      { key: 'type_filtre', label: 'Type de filtre', type: 'text' },
      { key: 'position', label: 'Position', type: 'text' },
      { key: 'etat_filtre', label: 'État du filtre', type: 'select', options: OPT_SATISFAISANT },
      { key: 'perte_charge', label: 'Perte de charge', type: 'number' },
      { key: 'presence_trappes', label: 'Présence de trappes', type: 'select', options: OPT_OUI_NON },
      { key: 'entree_air_additionnelle', label: 'Entrée d\u2019air additionnelle extérieure', type: 'select', options: OPT_OUI_NON },

      { key: 'section_gaine', label: 'Section / gaine', type: 'section' },
      { key: 'forme_section', label: 'Forme de la section', type: 'select', options: ['Circulaire', 'Rectangulaire'] },
      { key: 'diametre_cote1', label: 'Diamètre ou côte 1 (cm)', type: 'number' },
      { key: 'cote2', label: 'Côte 2 (cm)', type: 'number' },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'number' },
      { key: 'vitesse', label: 'Vitesse (m/s)', type: 'number' },

      { key: 'section_debit', label: 'Débit', type: 'section' },
      { key: 'valeur_reference_recommandee', label: 'Valeur de référence ou recommandée (m³/h)', type: 'number' },
      { key: 'debit_annee_n1', label: 'Débit année N-1 (m³/h)', type: 'number' },
      { key: 'debit_annee_en_cours', label: 'Débit année en cours (m³/h)', type: 'number' },
      { key: 'avis_constructeur', label: 'Avis par rapport aux données constructeur', type: 'select', options: OPT_CONFORME },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_conduit', label: 'Mesures dans le conduit', type: 'section' },
      { key: 'gaine', label: 'Gaine', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'number' },
      { key: 'largeur_cm', label: 'Largeur (cm)', type: 'number' },
      { key: 'longueur_cm', label: 'Longueur (cm)', type: 'number' },
      { key: 'diametre_cm', label: 'Diamètre (cm)', type: 'number' },
      { key: 'nombre_axes', label: 'Nombre d\u2019axes', type: 'number' },
      { key: 'nombre_points', label: 'Nombre de points', type: 'number' },
      { key: 'nombre_points_total', label: 'Nombre de points total', type: 'number' },
      { key: 'valeur_mesuree_conduit', label: 'Valeur mesurée (m/s)', type: 'number' },
      { key: 'simultanement', label: 'Simultanément', type: 'text' }
    ]
  },
  {
    id: 'menuiserie_bis', label: 'Menuiserie (machines à bois)', icon: 'tool', implemented: true,
    fields: [
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'type_machine', label: 'Type de machine à bois', type: 'text' },
      { key: 'conditions_mesure', label: 'Conditions de mesure', type: 'text' },

      { key: 'section_vitesse', label: 'Vitesse', type: 'section' },
      { key: 'vitesse_moyenne', label: 'Vitesse moyenne (m/s)', type: 'number' },
      { key: 'vitesse_reference', label: 'Valeur de référence', type: 'number' },
      { key: 'vitesse_inrs_ed750', label: 'Valeur recommandée par le guide INRS (ED 750)', type: 'number' },
      { key: 'vitesse_avis', label: 'Avis', type: 'select', options: OPT_CONFORME },

      { key: 'section_debit', label: 'Débit', type: 'section' },
      { key: 'debit', label: 'Débit (m³/h)', type: 'number' },
      { key: 'debit_reference', label: 'Débit de référence (m³/h)', type: 'number' },
      { key: 'debit_inrs_ed750', label: 'Valeur recommandée par le guide INRS (ED 750)', type: 'number' },
      { key: 'debit_avis', label: 'Avis', type: 'select', options: OPT_CONFORME },

      { key: 'conclusion_avis', label: 'Conclusion — Avis par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_conduit', label: 'Mesures dans le conduit', type: 'section' },
      { key: 'type_conduit', label: 'Type de conduit', type: 'text' },
      { key: 'temperature', label: 'Température (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique (kg/m³)', type: 'number' },
      { key: 'largeur_cm', label: 'Largeur (cm)', type: 'number' },
      { key: 'longueur_cm', label: 'Longueur (cm)', type: 'number' },
      { key: 'diametre_cm', label: 'Diamètre (cm)', type: 'number' },
      { key: 'nombre_axes', label: 'Nombre d\u2019axes', type: 'number' },
      { key: 'nombre_points', label: 'Nombre de points', type: 'number' },
      { key: 'nombre_points_total', label: 'Nombre de points total', type: 'number' },
      { key: 'valeur_mesuree_conduit', label: 'Valeur mesurée (m/s)', type: 'number' },
      { key: 'debit_calcule', label: 'Débit calculé (m³/h)', type: 'number' },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' }
    ]
  },
  {
    id: 'box_peinture', label: 'Box préparation peinture', icon: 'building', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'activite_reference_local', label: 'Activité et référence du local', type: 'text' },
      { key: 'reference_equipement', label: 'Réf. équipement', type: 'text' },
      { key: 'ventilation_naturelle', label: 'Ventilation naturelle permanente', type: 'select', options: OPT_OUI_NON },
      { key: 'asservissement', label: 'Asservissement', type: 'select', options: OPT_OUI_NON },
      { key: 'type_ventilation', label: 'Type de ventilation', type: 'text' },
      { key: 'volume_local', label: 'Volume du local (m³)', type: 'number' },
      { key: 'volume_par_heure', label: 'Volume par heure', type: 'number' },
      { key: 'conclusion', label: 'Conclusion', type: 'select',
        options: ['Satisfaisant', 'Non satisfaisant (< 50 volumes par heure)', 'Impossible de se prononcer'] },
      { key: 'debit_extraction_box', label: 'Débit d\u2019extraction du box (m³/h)', type: 'number' },
      { key: 'debit_minimal_50vh', label: 'Débit minimal (m³/h) pour 50 volumes/heure', type: 'number' },
      { key: 'avis_constructeur', label: 'Avis par rapport aux données constructeur', type: 'select', options: OPT_CONFORME },
      { key: 'observation', label: 'Observation', type: 'textarea' },
      { key: 'configuration_mesure', label: 'Configuration lors de la mesure', type: 'text' }
    ]
  },
  {
    id: 'torches_aspirantes', label: 'Torches aspirantes', icon: 'zap', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'activite_reference_local', label: 'Activité et référence du local', type: 'text' },
      { key: 'date_controle', label: 'Date de contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Réf. de l\u2019équipement', type: 'text' },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'locaux_charge', label: 'Locaux de charge', icon: 'zap', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'reference_equipement', label: 'Réf. équipement', type: 'text' },
      { key: 'nb_elements_batterie', label: 'Nombre d\u2019éléments batterie', type: 'number' },
      { key: 'capacite_totale', label: 'Capacité totale (Ah)', type: 'number' },

      { key: 'section_ventilation', label: 'Ventilation', type: 'section' },
      { key: 'ventilation_permanente', label: 'Ventilation permanente', type: 'select', options: OPT_OUI_NON },
      { key: 'ventilation_asservie', label: 'Ventilation asservie aux chargeurs', type: 'select', options: OPT_OUI_NON },
      { key: 'debit_variable', label: 'Débit variable', type: 'select', options: OPT_OUI_NON },
      { key: 'reglage_variateur', label: 'Réglage du variateur', type: 'text' },
      { key: 'si_autre', label: 'Si autre', type: 'text' },

      { key: 'section_debits', label: 'Débits', type: 'section' },
      { key: 'valeur_reference', label: 'Valeur de référence', type: 'number' },
      { key: 'valeur_inrs', label: 'Valeur recommandée par le guide INRS', type: 'number' },
      { key: 'debit_mesure_local', label: 'Débit mesuré du local', type: 'number' },
      { key: 'avis_reference', label: 'Avis par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },
      { key: 'avis', label: 'Avis', type: 'select', options: OPT_CONFORME },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'tts', label: 'TTS (Traitement de surface)', icon: 'tool', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'activite_reference_local', label: 'Activité et réf. du local', type: 'text' },
      { key: 'reference_equipement', label: 'Référence de l\u2019équipement', type: 'text' },

      { key: 'section_cuve', label: 'Caractéristiques de la cuve', type: 'section' },
      { key: 'type_ventilation', label: 'Type de ventilation', type: 'select',
        options: ['Extraction unilatérale', 'Extraction bilatérale'] },
      { key: 'type_cuve', label: 'Type de cuve', type: 'select',
        options: ['Cuve sans dosseret non appuyée contre un mur', 'Cuve avec dosseret ou appuyée contre un mur',
          'Cuve ouverte circulaire sans écran', 'Cuve ouverte circulaire avec écran'] },
      { key: 'forme_cuve', label: 'Forme de cuve', type: 'select', options: ['Circulaire', 'Rectangulaire'] },
      { key: 'si_autre', label: 'Si autre', type: 'text' },
      { key: 'diametre_cuve', label: 'Diamètre de la cuve (m)', type: 'number' },
      { key: 'surface_cuve', label: 'Surface de la cuve (m²)', type: 'number' },
      { key: 'longueur_l', label: 'Longueur L (m)', type: 'number' },
      { key: 'largeur_l', label: 'Largeur l (m)', type: 'number' },
      { key: 'surface_ouvertures', label: 'Surface des ouvertures So (m²)', type: 'number' },
      { key: 'coef_a', label: 'a', type: 'number' },
      { key: 'coef_b', label: 'b', type: 'number' },
      { key: 'coef_n', label: 'n', type: 'number' },

      { key: 'section_debits', label: 'Débits', type: 'section' },
      { key: 'debit_min_inrs_0', label: 'Débit minimum préconisé INRS (m³/h)', type: 'number' },
      { key: 'debit_calcule', label: 'Débit calculé (m³/h)', type: 'number' },
      { key: 'debit_qr10', label: 'Débit Qr/10 ou Qc/10 (m³/h)', type: 'number' },
      { key: 'vitesse', label: 'Vitesse (m/s)', type: 'number' },
      { key: 'debit_mesure', label: 'Débit mesuré (m³/h)', type: 'number' },
      { key: 'debit_reference', label: 'Débit de référence (m³/h)', type: 'number' },
      { key: 'avis_reference_1', label: 'Avis par rapport à la valeur de référence', type: 'select', options: OPT_CONFORME },
      { key: 'avis_reference_global', label: 'Avis global par rapport aux valeurs de référence', type: 'select', options: OPT_CONFORME },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  }
];

function getInstallationType(id) {
  for (var i = 0; i < INSTALLATION_TYPES.length; i++) {
    if (INSTALLATION_TYPES[i].id === id) return INSTALLATION_TYPES[i];
  }
  return null;
}

console.log('✓ Schémas installations chargés (' + INSTALLATION_TYPES.length + ' types, ' +
  INSTALLATION_TYPES.filter(function (t) { return t.implemented; }).length + ' implémentés)');
