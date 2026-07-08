// installations-schema.js
// Schémas déclaratifs des 17 types d'installations de contrôle aération
// Extraits des modules VBA TAB_x_*.bas (mapping colonnes -> libellés) + CONSTANTE.bas (libellés d'options)
// Statut "implemented:false" = squelette à compléter (liste présente, formulaire détaillé à venir)

var OPT_CONFORME = ['Conforme', 'Non Conforme'];
var OPT_OUI_NON = ['Oui', 'Non'];
var OPT_SATISFAISANT = ['Satisfaisant', 'Non Satisfaisant', 'Impossible de se prononcer'];

// --- Helpers pour générer les blocs répétitifs du schéma CTA ---
var CTA_CLASSES_EFFICACITE = [
  'Filtre Grossier - G1', 'Filtre Grossier - G2', 'Filtre Grossier - G3', 'Filtre Grossier - G4',
  'Filtre Moyen - M5', 'Filtre Moyen - M6',
  'Filtre Fin - F7', 'Filtre Fin - F8', 'Filtre Fin - F9',
  'Haute efficacité (EPA) - E10', 'Haute efficacité (EPA) - E11', 'Haute efficacité (EPA) - E12',
  'Très Haute efficacité (HEPA) - H13', 'Très Haute efficacité (HEPA) - H14',
  'Très faible pénétration (ULPA) - U15', 'Très faible pénétration (ULPA) - U16', 'Très faible pénétration (ULPA) - U17'
];

function buildCtaFiltrationFields(prefix, label) {
  return [
    { key: prefix + '_etat', label: label + ' — État', type: 'select', options: ['Bon Etat', 'A remplacer', 'Non observé'] },
    { key: prefix + '_type', label: label + ' — Type (cellules, poches, ...)', type: 'select', options: ['Cellule', 'Poche', 'Média découpé'] },
    { key: prefix + '_nombre_dimensions', label: label + ' — Nombre / Dimensions', type: 'text' },
    { key: prefix + '_classe_efficacite', label: label + " — Classe d'efficacité", type: 'select', options: CTA_CLASSES_EFFICACITE },
    { key: prefix + '_perte_charge', label: label + ' — Perte de charge (Pa)', type: 'number' }
  ];
}

function buildCtaCircuitFields(prefix, label, baseShowIf) {
  function combine(extra) {
    return baseShowIf ? { and: [baseShowIf, extra] } : extra;
  }
  var modeGrille = { key: prefix + '_vitesse_mode', equals: 'Grille de points' };
  var modeDirecte = { key: prefix + '_vitesse_mode', equals: 'Vitesse moyenne directe' };
  var rectangulaire = { key: prefix + '_forme_section', equals: 'Rectangulaire' };

  return [
    { key: 'section_' + prefix, label: 'Mesure de la vitesse — Air ' + label, type: 'section', showIf: baseShowIf },
    { key: prefix + '_forme_section', label: 'Type de conduit', type: 'select', options: ['Circulaire', 'Rectangulaire'], showIf: baseShowIf },
    { key: prefix + '_diametre_cote1', label: 'Diamètre ou côté 1 (cm)', type: 'number', showIf: baseShowIf },
    { key: prefix + '_cote2', label: 'Côté 2 (cm)', type: 'number', showIf: combine(rectangulaire) },
    { key: prefix + '_surface', label: 'Surface (m²)', type: 'computed', showIf: baseShowIf },
    { key: prefix + '_temperature', label: 'Température dans le conduit (°C)', type: 'number', showIf: baseShowIf },
    { key: prefix + '_pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number', showIf: baseShowIf },
    { key: prefix + '_masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed', showIf: baseShowIf },
    { key: prefix + '_vitesse_mode', label: 'Saisie de la vitesse', type: 'select', options: ['Vitesse moyenne directe', 'Grille de points'], showIf: baseShowIf },
    { key: prefix + '_vitesse_nb_axes', label: "Nombre d'axes", type: 'number', showIf: combine(modeGrille) },
    { key: prefix + '_vitesse_nb_points', label: 'Nombre de points par axe', type: 'number', showIf: combine(modeGrille) },
    { key: prefix + '_vitesse_grid', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid', colsKey: prefix + '_vitesse_nb_points', rowsKey: prefix + '_vitesse_nb_axes', showIf: combine(modeGrille) },
    { key: prefix + '_vitesse', label: 'Vitesse (m/s)', type: 'number', showIf: combine(modeDirecte) },
    { key: prefix + '_vitesse_moyenne_grille', label: 'Vitesse moyenne calculée (m/s)', type: 'computed', showIf: combine(modeGrille) },
    { key: prefix + '_ecart_norme', label: 'Remarque norme X10-112', type: 'computed', showIf: combine(modeGrille) },
    { key: prefix + '_debit_reference', label: 'Débit de référence (m³/h)', type: 'number', showIf: baseShowIf },
    { key: prefix + '_debit_n1', label: 'Débit année N-1 (m³/h)', type: 'number', showIf: baseShowIf },
    { key: prefix + '_debit_en_cours', label: 'Débit année en cours (m³/h)', type: 'computed', showIf: baseShowIf }
  ];
}

// Génère les champs d'une mesure de vitesse de transport pour "Installations diverses"
// (Transport 1 / Transport 2), avec mesure conduit complète (circulaire/rectangulaire, grille de points)
function buildEquipTransportFields(prefix, numero, showIfLabel) {
  var showIf = { key: 'mesures_choisies', contains: showIfLabel };
  function combine(extra) { return { and: [showIf, extra] }; }
  var modeGrille = { key: prefix + '_vitesse_mode', equals: 'Grille de points' };
  var modeDirecte = { key: prefix + '_vitesse_mode', equals: 'Vitesse moyenne directe' };
  var rectangulaire = { key: prefix + '_forme_conduit', equals: 'Rectangulaire' };

  return [
    { key: 'section_' + prefix, label: 'Mesure de la vitesse de transport ' + numero, type: 'section', showIf: showIf },
    { key: prefix + '_type_polluant', label: 'Type de polluants', type: 'select',
      options: ['Gaz et vapeurs', 'Fumées', 'Poussières très fines et légères',
                'Poussières sèches et poudres', 'Poussières industrielles moyennes',
                'Poussières lourdes', 'Poussières lourdes ou humides'], showIf: showIf },
    { key: prefix + '_inrs', label: 'Valeurs recommandées par le guide INRS (ED695)', type: 'computed', showIf: showIf },

    { key: prefix + '_forme_conduit', label: 'Type de conduit', type: 'select', options: ['Circulaire', 'Rectangulaire'], showIf: showIf },
    { key: prefix + '_diametre_cote1', label: 'Diamètre ou côté 1 (cm)', type: 'number', showIf: showIf },
    { key: prefix + '_cote2', label: 'Côté 2 (cm)', type: 'number', showIf: combine(rectangulaire) },
    { key: prefix + '_surface', label: 'Surface (m²)', type: 'computed', showIf: showIf },
    { key: prefix + '_temperature', label: 'Température dans le conduit (°C)', type: 'number', showIf: showIf },
    { key: prefix + '_pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number', showIf: showIf },
    { key: prefix + '_masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed', showIf: showIf },

    { key: prefix + '_vitesse_mode', label: 'Saisie de la vitesse', type: 'select', options: ['Vitesse moyenne directe', 'Grille de points'], showIf: showIf },
    { key: prefix + '_vitesse_nb_axes', label: "Nombre d'axes", type: 'number', showIf: combine(modeGrille) },
    { key: prefix + '_vitesse_nb_points', label: 'Nombre de points par axe', type: 'number', showIf: combine(modeGrille) },
    { key: prefix + '_vitesse_grid', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid',
      colsKey: prefix + '_vitesse_nb_points', rowsKey: prefix + '_vitesse_nb_axes', showIf: combine(modeGrille) },
    { key: prefix + '_vitesse_directe', label: 'Vitesse (m/s)', type: 'number', showIf: combine(modeDirecte) },
    { key: prefix + '_mesuree', label: 'Vitesse moyenne mesurée (m/s)', type: 'computed', showIf: showIf },
    { key: prefix + '_debit', label: 'Débit (m³/h)', type: 'computed', showIf: showIf },

    { key: prefix + '_reference', label: 'Valeur de référence (m/s, « / » si aucune)', type: 'text', showIf: showIf },
    { key: 'avis_' + prefix, label: 'Avis vitesse de transport ' + numero, type: 'computed', showIf: showIf }
  ];
}

var INSTALLATION_TYPES = [
  {
    id: 'bureaux', label: 'Bureaux / Salles de réunion', icon: 'building', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'reference_local', label: 'Référence du local', type: 'textarea' },
      { key: 'type_local', label: 'Type de local', type: 'select',
        options: ['Bureaux', 'Locaux Sans Travail Physique',
                  'Locaux de Restauration, Vente ou Réunion',
                  'Ateliers ou Locaux avec Travail Physique Léger',
                  'Autres ateliers et locaux',
                  'Local occupé occasionnellement'] },

      { key: 'type_ventilation', label: 'Type de ventilation', type: 'select',
        options: ['Nat sans ouvrants', 'Nat avec ouvrants', 'Extraction', 'Soufflage', 'Double flux'] },

      { key: 'ouvrant_exterieur', label: "Présence d'ouvrant donnant directement sur l'extérieur", type: 'toggle',
        options: ['Oui', 'Non'],
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },

      { key: 'entree_air_permanente', label: "Présence d'entrée d'air permanente en façade (ex : grille) donnant directement sur l'extérieur", type: 'toggle',
        options: ['Oui', 'Non'],
        showIf: { and: [{ key: 'type_ventilation', in: ['Soufflage', 'Double flux'] }, { key: 'ouvrant_exterieur', equals: 'Non' }] } },

      { key: 'volume', label: 'Volume (m³)', type: 'number',
        showIf: { key: 'volume_apparent', equals: 'true' } },
      { key: 'effectif', label: 'Effectif', type: 'number' },
      { key: 'volume_min', label: 'Volume minimal à respecter (m³)', type: 'computed' },
      { key: 'debit_min_air_neuf', label: "Débit minimum d'air neuf à respecter (m³/h)", type: 'computed' },

      { key: 'debit_total_mesure', label: 'Débit total mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage'] } },
      { key: 'debit_soufflage', label: 'Débit soufflage mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', equals: 'Double flux' } },
      { key: 'debit_extraction', label: 'Débit extraction mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', equals: 'Double flux' } },
      { key: 'nombre_bouches', label: 'Nombre de bouches', type: 'number',
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage', 'Double flux'] } },
      { key: 'pourcentage_air_neuf', label: "Pourcentage d'air neuf (%)", type: 'number', default: 100,
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },
      { key: 'debit_air_neuf_introduit', label: "Débit d'air neuf introduit (m³/h)", type: 'computed',
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },

      { key: 'etat_bouches', label: 'État des bouches', type: 'select',
        options: ['En bon état', 'A nettoyer', 'A réparer'] },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis', label: "Avis (débit d'air neuf vs valeur à respecter)", type: 'computed' },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' }
    ]
  },
  {
    id: 'sanitaires', label: 'Sanitaires', icon: 'droplet', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'repere', label: 'Repère du local', type: 'text' },
      { key: 'type_local', label: 'Type de local', type: 'select',
        options: ['chambre individuelle dans ERP', 'sanitaires', 'sanitaires Homme', 'sanitaires Homme-PMR',
                  'sanitaires Femme', 'sanitaires Femme-PMR', 'Vest.+San. Homme', 'Vest.+San. Femme',
                  'Douche', 'Douche Homme', 'Douche Femme', 'Vest. Homme', 'Vest. Femme'] },

      { key: 'section_equipements', label: "Type d'équipement", type: 'section' },
      { key: 'nb_wc_urinoirs', label: 'WC / urinoirs', type: 'number' },
      { key: 'nb_douches', label: 'Douches', type: 'number' },
      { key: 'nb_lavabos', label: 'Lavabos', type: 'number' },
      { key: 'individuel_collectif', label: 'Sanitaire Individuel (I) ou collectif (C)', type: 'toggle',
        options: ['I', 'C'] },
      { key: 'erp_chambre_individuelle', label: 'ERP', type: 'boolean',
        checkboxLabel: 'Sanitaire et/ou douche dans chambre individuelle' },

      { key: 'section_extraction', label: 'Extraction', type: 'section' },
      { key: 'debit_mesure', label: "Débit d'extraction mesuré (m³/h)", type: 'number' },
      { key: 'nombre_bouches', label: 'Nombre de bouches', type: 'number' },
      { key: 'debit_min_reglementaire', label: 'Débit minimal réglementaire (m³/h)', type: 'computed' },
      { key: 'avis', label: 'Avis par rapport au débit réglementaire', type: 'computed' },

      { key: 'etat_bouches', label: 'État des bouches', type: 'select',
        options: ['En bon état', 'A nettoyer', 'A réparer'] },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'locaux_fumeurs', label: 'Locaux fumeurs', icon: 'building', implemented: true,
    fields: [
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_local', label: 'Référence du local', type: 'textarea' },

      { key: 'section_dimensions', label: 'Dimensions du local fumeur', type: 'section' },
      { key: 'longueur', label: 'Longueur (m)', type: 'number' },
      { key: 'largeur', label: 'Largeur (m)', type: 'number' },
      { key: 'hauteur', label: 'Hauteur (m)', type: 'number' },
      { key: 'surface', label: 'Surface (m²)', type: 'computed' },
      { key: 'volume', label: 'Volume (m³)', type: 'computed' },

      { key: 'section_verif', label: 'Vérification', type: 'section' },

      { key: 'crit_salle_close', label: 'Salle close, exclusivement affectée à la consommation de tabac', type: 'satisf' },
      { key: 'crit_salle_close_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_aucune_prestation', label: 'Aucune prestation de service délivrée dans la salle', type: 'satisf' },
      { key: 'crit_aucune_prestation_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_organisation_entretien', label: "Aucune tâche d'entretien/maintenance ne peut être exécutée sans que l'air ait été renouvelé, en l'absence de tout occupant, pendant au moins une heure", type: 'satisf' },
      { key: 'crit_organisation_entretien_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_dispositif_extraction', label: "Salle équipée d'un dispositif d'extraction d'air par ventilation mécanique", type: 'satisf' },
      { key: 'crit_dispositif_extraction_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_rejet_exterieur', label: "Rejet d'air à l'extérieur", type: 'satisf' },
      { key: 'crit_rejet_exterieur_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_rejet_distance_passage', label: 'Rejet d\u2019air à bonne distance des lieux de passage de personnes', type: 'satisf' },
      { key: 'crit_rejet_distance_passage_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_rejet_distance_prises', label: "Rejet d'air à bonne distance des prises d'air frais ou des ouvertures", type: 'satisf' },
      { key: 'crit_rejet_distance_prises_com', label: 'Commentaire', type: 'textarea' },

      { key: 'reprise_totale', label: 'Reprise totale (m³/h)', type: 'number' },
      { key: 'crit_taux_renouvellement', label: "Taux de renouvellement d'air par ventilation mécanique (minimum : 10 fois le volume / h)", type: 'computed' },
      { key: 'taux_renouvellement_valeur', label: "Taux de renouvellement calculé (vol/h)", type: 'computed' },

      { key: 'crit_ventilation_independante', label: 'La ventilation est entièrement indépendante du système de ventilation ou de climatisation d\u2019air du bâtiment', type: 'satisf' },
      { key: 'crit_ventilation_independante_com', label: 'Commentaire', type: 'textarea' },

      { key: 'depression_mesuree', label: 'Dépression mesurée (Pa)', type: 'number' },
      { key: 'crit_depression', label: 'Le local est maintenu en dépression continue d\u2019au moins 5 pascals par rapport aux pièces communicantes', type: 'computed' },

      { key: 'crit_fermetures_auto', label: "Le local est doté de fermetures auto sans possibilité d'ouverture non intentionnelle", type: 'satisf' },
      { key: 'crit_fermetures_auto_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_pas_lieu_passage', label: 'La salle fumeur ne constitue pas un lieu de passage', type: 'satisf' },
      { key: 'crit_pas_lieu_passage_com', label: 'Commentaire', type: 'textarea' },

      { key: 'superficie_etablissement', label: "Superficie totale de l'établissement (m²)", type: 'number' },
      { key: 'crit_ratio_surface', label: "Le local doit présenter une superficie au plus égale à 20 % de la superficie totale de l'établissement et être inférieur à 35 m²", type: 'computed' },

      { key: 'crit_attestation_installateur', label: "L'installateur ou la personne assurant la maintenance du dispositif de ventilation mécanique atteste que celui-ci permet de respecter les exigences de ventilation (en gras ci-dessus)", type: 'satisf' },
      { key: 'crit_attestation_installateur_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_document_possession_chef', label: 'Le responsable de l\u2019établissement est tenu de produire cette attestation à l\u2019occasion de tout contrôle : le document est en possession du chef d\u2019établissement', type: 'satisf' },
      { key: 'crit_document_possession_chef_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_entretien_regulier', label: "Le responsable de l'établissement est tenu de faire procéder à l'entretien régulier de la ventilation", type: 'satisf' },
      { key: 'crit_entretien_regulier_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_consultation_chsct', label: 'La mise à disposition d\u2019un emplacement à disposition des fumeurs et ses modalités de mise en œuvre sont soumises à la consultation du comité d\u2019hygiène et de sécurité et des conditions de travail (avant sa mise en œuvre, puis tous les 2 ans)', type: 'satisf' },
      { key: 'crit_consultation_chsct_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_panneau_avertissement', label: 'Le panneau d\u2019avertissement de la zone fumeur est présent', type: 'satisf' },
      { key: 'crit_panneau_avertissement_com', label: 'Commentaire', type: 'textarea' },

      { key: 'crit_panneau_interdiction', label: 'Le panneau d\u2019interdiction de fumer dans les autres zones est présent', type: 'satisf' },
      { key: 'crit_panneau_interdiction_com', label: 'Commentaire', type: 'textarea' },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis_global', label: 'Avis global', type: 'computed' },
      { key: 'observation', label: 'Observation générale', type: 'textarea' }
    ]
  },
  {
    id: 'cta', label: 'CTA (Centrale de traitement d\u2019air)', icon: 'tool', implemented: true,
    fields: [
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'mode_fonctionnement', label: 'Mode de fonctionnement', type: 'select',
        options: ['AIR NEUF / AIR RECYCLE', 'AIR NEUF UNIQUEMENT'] },
      { key: 'locaux_alimentes', label: 'Locaux alimentées', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: "Réf. de l'équipement et/ou Implantation", type: 'textarea' },

      { key: 'section_etat', label: 'État du reste de l\u2019installation', type: 'section' },
      { key: 'etat_general', label: 'État général (propreté, corrosion, chocs, etc.)', type: 'checkbox-group',
        options: ['Bon état général', 'A réparer', 'Traces de corrosion', 'CTA non ouverte', 'Les portes de la CTA sont déformées (difficultés de fermeture)'] },
      { key: 'prise_air_neuf', label: "Prise d'air neuf", type: 'select',
        options: ['Satisfaisant', 'A nettoyer', 'A réparer', 'Non observée'] },
      { key: 'batterie_chaude', label: 'Batterie(s) chaude(s)', type: 'select',
        options: ['Satisfaisant', 'Non Observée', 'Fuite de fluide', 'Corrosion', 'A réparer'] },
      { key: 'batterie_froide', label: 'Batterie(s) froide(s)', type: 'select',
        options: ['Satisfaisant', 'Non Observée', 'Fuite de fluide', 'Corrosion', 'A réparer'] },
      { key: 'ventilateur_courroie', label: 'Ventilateur / Courroie', type: 'select',
        options: ['Bon état général', "Le moteur n'utilise pas de courroie", 'Courroie distendue', 'Courroie à remplacer', 'Courroie rompue', 'Non observé'] },
      { key: 'canalisations_gaines', label: 'Canalisations / Gaines', type: 'checkbox-group',
        options: ['Bon état', 'A réparer', 'Identification des gaines à prévoir + sens fluide'] },
      { key: 'fiche_maintenance', label: 'Fiche de Maintenance', type: 'checkbox-group',
        options: ['Absence de fiche de maintenance', 'Dernière intervention de maintenance'] },
      { key: 'derniere_intervention_date', label: 'Date de la dernière intervention de maintenance', type: 'text',
        showIf: { key: 'fiche_maintenance', contains: 'Dernière intervention de maintenance' } },

      { key: 'section_filtration', label: 'Filtration', type: 'section' }
    ]
    .concat(buildCtaFiltrationFields('pre_filtre', 'Pré-filtre'))
    .concat(buildCtaFiltrationFields('filtre', 'Filtre'))
    .concat(buildCtaFiltrationFields('filtre_absolu', 'Filtre absolu'))
    .concat(buildCtaCircuitFields('neuf', 'neuf', null))
    .concat(buildCtaCircuitFields('souffle', 'soufflé', null))
    .concat(buildCtaCircuitFields('recycle', 'recyclé', { key: 'mode_fonctionnement', equals: 'AIR NEUF / AIR RECYCLE' }))
    .concat([
      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis_inrs', label: 'Le dispositif doit satisfaire aux préconisations indiquées par l\u2019INRS. Avis par rapport à ces préconisations', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' }
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
      { key: 'vitesse_grid', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid', colsKey: 'vitesse_nb_points', rowsKey: 'vitesse_nb_axes', showIf: { key: 'vitesse_mode', equals: 'Grille de points' } },
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
      { key: 'gaine', label: 'Gaine', type: 'text' },
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
      { key: 'reference_equipement', label: "Référence de l'équipement", type: 'textarea' },
      { key: 'type_local', label: 'Type de local', type: 'select',
        options: ['Bureaux', 'Locaux Sans Travail Physique',
                  'Locaux de Restauration, Vente ou Réunion',
                  'Ateliers ou Locaux avec Travail Physique Léger',
                  'Autres ateliers et locaux',
                  'Local occupé occasionnellement'] },

      { key: 'type_ventilation', label: 'Type de ventilation', type: 'select',
        options: ['Nat sans ouvrants', 'Nat avec ouvrants', 'Extraction', 'Soufflage', 'Double flux'] },

      { key: 'ouvrant_exterieur', label: "Présence d'ouvrant donnant directement sur l'extérieur", type: 'toggle',
        options: ['Oui', 'Non'],
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },

      { key: 'entree_air_permanente', label: "Présence d'entrée d'air permanente en façade (ex : grille) donnant directement sur l'extérieur", type: 'toggle',
        options: ['Oui', 'Non'],
        showIf: { and: [{ key: 'type_ventilation', in: ['Soufflage', 'Double flux'] }, { key: 'ouvrant_exterieur', equals: 'Non' }] } },

      { key: 'volume', label: 'Volume (m³)', type: 'number',
        showIf: { key: 'volume_apparent', equals: 'true' } },
      { key: 'travailleur', label: 'Nombre de travailleurs', type: 'number' },
      { key: 'public', label: 'Nombre de public', type: 'number' },
      { key: 'debit_min_air_neuf', label: "Débit minimum d'air neuf à respecter (m³/h)", type: 'computed' },

      { key: 'debit_total_mesure', label: 'Débit total mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage'] } },
      { key: 'debit_soufflage', label: 'Débit soufflage mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', equals: 'Double flux' } },
      { key: 'debit_extraction', label: 'Débit extraction mesuré (m³/h)', type: 'number',
        showIf: { key: 'type_ventilation', equals: 'Double flux' } },
      { key: 'nombre_bouches', label: 'Nombre de bouches', type: 'number',
        showIf: { key: 'type_ventilation', in: ['Extraction', 'Soufflage', 'Double flux'] } },
      { key: 'pourcentage_air_neuf', label: "Pourcentage d'air neuf (%)", type: 'number', default: 100,
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },
      { key: 'debit_air_neuf_introduit', label: "Débit d'air neuf introduit (m³/h)", type: 'computed',
        showIf: { key: 'type_ventilation', in: ['Soufflage', 'Double flux'] } },

      { key: 'etat_bouches', label: 'État des bouches', type: 'select',
        options: ['En bon état', 'A nettoyer', 'A réparer'] },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis', label: 'Avis', type: 'computed' },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' }
    ]
  },
  {
    id: 'sorbonnes', label: 'Sorbonnes', icon: 'flask', implemented: true,
    fields: [
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: "Réf. de l'équipement et/ou implantation", type: 'textarea' },
      { key: 'photo', label: 'Photo', type: 'photo' },

      { key: 'section_mesures', label: 'Mesures', type: 'section' },
      { key: 'temperature', label: 'Température (°C)', type: 'number' },
      { key: 'hygrometrie', label: 'Hygrométrie (%)', type: 'number' },
      { key: 'pression_atmospherique', label: 'Pression atmosphérique (hPa)', type: 'number' },
      { key: 'difference_pression', label: 'Différence de pression (Pa) entre le local et son environnement', type: 'number' },
      { key: 'appareils_mesure', label: 'Appareils de mesure utilisés', type: 'text' },

      { key: 'section_fumigene', label: 'Test au fumigène', type: 'section' },
      { key: 'zones_turbulentes', label: 'Présence de zones turbulentes', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'zones_mortes', label: 'Présence de zones mortes', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'fumigene_absence_perturbation', label: "Le test au fumigène met-il en évidence l'absence des perturbations susceptibles de gêner le bon fonctionnement de la sorbonne ?", type: 'toggle', options: ['Oui', 'Non'] },

      { key: 'rmq_complementaires', label: 'Remarques complémentaires', type: 'checkbox-group',
        options: ["Défaut d'aspiration de la sorbonne", 'La sorbonne est mal entretenue', 'Etat défectueux de la gaine', 'La sorbonne est encombrée'] },

      { key: 'section_contexte', label: 'Contexte de mesures', type: 'section' },
      { key: 'verrouillage_paroi', label: 'Verrouillage de la paroi vitrée (butée)', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'parachute_paroi', label: 'Parachute sur la paroi vitrée', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'vitesse_frontale_dispositif', label: 'Mesure de la vitesse frontale', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'alarme_sonore', label: 'Alarme sonore', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'alarme_visuelle', label: 'Alarme visuelle', type: 'select', options: ['Oui', 'Non', 'Défectueux'] },
      { key: 'eclairage_interieur', label: "Eclairage à l'intérieur du volume", type: 'select', options: ['Oui', 'Non', 'Défectueux'] },

      { key: 'taille_local', label: 'Local', type: 'select', options: ['Grande taille', 'Taille moyenne', 'Exigu'] },
      { key: 'paillasse', label: 'Paillasse', type: 'select', options: ['Libre', 'Partiellement encombrée', 'Encombrée'] },
      { key: 'ouvrants', label: 'Ouvrants', type: 'select', options: ['Portes et fenêtres closes', 'Porte (ou Fenêtre) ouverte'] },
      { key: 'obstacle_point_mesure', label: "Obstacle gênant la réalisation d'un point", type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'autres_sorbonnes_fonctionnement', label: 'Autre(s) sorbonne(s) en fonctionnement', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'autres_dispositifs_ventilation', label: 'Autre(s) dispositif(s) de ventilation', type: 'toggle', options: ['Oui', 'Non'] },

      { key: 'section_dimensions', label: "Ouverture de travail", type: 'section' },
      { key: 'largeur_mm', label: 'Largeur (mm)', type: 'number' },
      { key: 'annee_construction', label: "Ouverture de travail h (mm) en fonction de l'année de construction de la sorbonne", type: 'select',
        options: ['Avant janvier 2005 - Norme XP X15-203 (400 mm)', 'Après janvier 2005 - Norme NF EN 14175-4 (500 mm)', 'Autre'] },
      { key: 'hauteur_ouverture_autre', label: "Hauteur d'ouverture personnalisée (mm)", type: 'number',
        showIf: { key: 'annee_construction', equals: 'Autre' } },
      { key: 'surface_ouverture', label: "Surface de l'ouverture (m²)", type: 'computed' },
      { key: 'espace_horizontal', label: 'Espace horizontal entre 2 points (mm)', type: 'computed' },
      { key: 'espace_vertical', label: 'Espace vertical entre 2 points (mm)', type: 'computed' },

      { key: 'section_grille', label: 'Relevé des vitesses mesurées', type: 'section' },
      { key: 'nb_colonnes_actives', label: 'Colonnes actives', type: 'computed' },
      { key: 'nb_lignes_mesure', label: 'Lignes', type: 'computed' },
      { key: 'vitesse_grid', label: 'Vitesses mesurées (m/s) — « / » pour exclure un point', type: 'grid',
        colsKey: 'nb_colonnes_actives', rowsKey: 'nb_lignes_mesure' },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'vitesse_min_mesuree', label: 'Vitesse minimale mesurée (m/s)', type: 'computed' },
      { key: 'vitesse_min_reference', label: 'Vitesse minimale — valeur de référence (m/s, « / » si aucune)', type: 'text' },
      { key: 'vitesse_min_ed795', label: 'Vitesse minimale — recommandation ED795 (m/s)', type: 'computed' },
      { key: 'vitesse_min_avis_reference', label: 'Vitesse minimale — avis / valeur de référence', type: 'computed' },
      { key: 'vitesse_min_avis_ed795', label: 'Vitesse minimale — avis / ED795 INRS', type: 'computed' },

      { key: 'vitesse_moy_mesuree', label: 'Vitesse moyenne mesurée (m/s)', type: 'computed' },
      { key: 'vitesse_moy_reference', label: 'Vitesse moyenne — valeur de référence (m/s, « / » si aucune)', type: 'text' },
      { key: 'vitesse_moy_avis_reference', label: 'Vitesse moyenne — avis / valeur de référence', type: 'computed' },
      { key: 'vitesse_moy_avis_ed795', label: 'Vitesse moyenne — avis / ED795 INRS', type: 'computed' },

      { key: 'debit_mesure', label: "Débit d'air extrait mesuré (m³/h)", type: 'computed' },
      { key: 'debit_reference', label: 'Débit — valeur de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'debit_avis_reference', label: 'Débit — avis / valeur de référence', type: 'computed' },
      { key: 'debit_avis_ed795', label: 'Débit — avis / ED795 INRS', type: 'computed' },

      { key: 'avis_global', label: 'Avis global', type: 'computed' }
    ]
  },
  {
    id: 'hottes', label: 'Hottes', icon: 'flask', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'date_installation', label: "Date d'installation", type: 'text' },
      { key: 'date_mesure', label: 'Date de mesure', type: 'text' },
      { key: 'reference_equipement', label: "Réf. de l'équipement et/ou implantation", type: 'textarea' },

      { key: 'etat_visuel_reseau', label: "État visuel du réseau d'aspiration", type: 'select',
        options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués'] },
      { key: 'test_fumigene', label: 'Test fumigène', type: 'select',
        options: ['Toute la fumée a été aspirée',
                  "On observe des irrégularités lors de l'aspiration des fumées",
                  'On constate un phénomène de rétrodiffusion des fumées',
                  'Aucune aspiration',
                  'Non concluant',
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
        colsKey: 'vpe_nb_points_largeur', rowsKey: 'vpe_nb_points_hauteur',
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
        type: 'toggle', options: ['Conforme', 'Non Conforme'],
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

      { key: 'vt_forme_conduit', label: 'Type de conduit', type: 'select', options: ['Circulaire', 'Rectangulaire'],
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_diametre_cote1', label: 'Diamètre ou côté 1 (cm)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_cote2', label: 'Côté 2 (cm)', type: 'number',
        showIf: { and: [{ key: 'mesures_choisies', contains: 'Vitesse de transport' }, { key: 'vt_forme_conduit', equals: 'Rectangulaire' }] } },
      { key: 'vt_surface', label: 'Surface (m²)', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },

      { key: 'vt_temperature', label: 'Température dans le conduit (°C)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },

      { key: 'vt_vitesse_mode', label: 'Saisie de la vitesse', type: 'select', options: ['Vitesse moyenne directe', 'Grille de points'],
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_vitesse_nb_axes', label: "Nombre d'axes", type: 'number',
        showIf: { and: [{ key: 'mesures_choisies', contains: 'Vitesse de transport' }, { key: 'vt_vitesse_mode', equals: 'Grille de points' }] } },
      { key: 'vt_vitesse_nb_points', label: 'Nombre de points par axe', type: 'number',
        showIf: { and: [{ key: 'mesures_choisies', contains: 'Vitesse de transport' }, { key: 'vt_vitesse_mode', equals: 'Grille de points' }] } },
      { key: 'vt_vitesse_grid', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid',
        colsKey: 'vt_vitesse_nb_points', rowsKey: 'vt_vitesse_nb_axes',
        showIf: { and: [{ key: 'mesures_choisies', contains: 'Vitesse de transport' }, { key: 'vt_vitesse_mode', equals: 'Grille de points' }] } },
      { key: 'vt_vitesse_directe', label: 'Vitesse (m/s)', type: 'number',
        showIf: { and: [{ key: 'mesures_choisies', contains: 'Vitesse de transport' }, { key: 'vt_vitesse_mode', equals: 'Vitesse moyenne directe' }] } },
      { key: 'vt_mesuree', label: 'Vitesse moyenne mesurée (m/s)', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: 'Vitesse de transport' } },
      { key: 'vt_debit', label: "Débit (m³/h)", type: 'computed',
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
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'activite', label: 'Activité', type: 'text' },
      { key: 'atelier', label: 'Atelier', type: 'text' },
      { key: 'reference_equipement', label: 'Référence équipement', type: 'textarea' },
      { key: 'photo', label: 'Photo', type: 'photo' },

      { key: 'section_examen', label: "Examen visuel de l'état des éléments de l'installation", type: 'section' },
      { key: 'recyclage', label: 'Recyclage', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'adapte_situation', label: 'Adapté à la situation', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'commentaire_1', label: "Commentaire (bras non adapté à la situation)", type: 'textarea',
        showIf: { key: 'adapte_situation', equals: 'Non' } },
      { key: 'etat_conduits', label: 'État des conduits aérauliques', type: 'select',
        options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués'] },
      { key: 'etat_visuel', label: 'État visuel', type: 'select',
        options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués'] },
      { key: 'test_fumigene', label: 'Test fumigène', type: 'select',
        options: ['Bon', 'Moyen', 'Insuffisant', 'Insatisfaisant', 'Non réalisé'] },

      { key: 'section_dimensionnement', label: 'Dimensionnement', type: 'section' },
      { key: 'type_bouche', label: "Type de bouche d'aspiration", type: 'select',
        options: ['Sans collerette', 'Avec collerette', 'Sans collerette reposant sur un plan', 'Avec collerette reposant sur un plan'] },
      { key: 'forme_bouche', label: 'Forme de la bouche', type: 'select', options: ['Circulaire', 'Ovale', 'Autre (surface connue)'] },
      { key: 'diametre_bouche', label: 'Diamètre de la bouche (cm)', type: 'number', showIf: { key: 'forme_bouche', equals: 'Circulaire' } },
      { key: 'largeur_bouche_ovale', label: 'Largeur de la bouche si ovale (cm)', type: 'number', showIf: { key: 'forme_bouche', equals: 'Ovale' } },
      { key: 'longueur_bouche_ovale', label: 'Longueur de la bouche si ovale (cm)', type: 'number', showIf: { key: 'forme_bouche', equals: 'Ovale' } },
      { key: 'surface_bouche_autre', label: 'Surface de la bouche pour les autres cas (m²)', type: 'number', showIf: { key: 'forme_bouche', equals: 'Autre (surface connue)' } },
      { key: 'surface_bouche', label: 'Surface de la bouche calculée (m²)', type: 'computed' },
      { key: 'diametre_conduit', label: 'Diamètre du conduit (cm)', type: 'number' },

      { key: 'section_mesures', label: 'Résultats des mesures de vitesse et de débit d\u2019air', type: 'section' },
      { key: 'localisation_point_mesure', label: 'Localisation du point de mesure', type: 'select', options: ['Conduit', 'Bouche'] },
      { key: 'vitesse_moyenne', label: 'Vitesse mesurée (m/s)', type: 'number' },
      { key: 'debit_calcule', label: 'Débit calculé (m³/h)', type: 'computed' },

      { key: 'condition_dispersion', label: 'Condition de dispersion du polluant', type: 'select',
        options: ['Emission sans vitesse initiale en air calme',
                  'Emission à faible vitesse en air modérément calme',
                  'Génération active en zone agitée',
                  'Emission à grande vitesse initiale dans une zone à mouvement d\u2019air très rapide',
                  'Gaz et vapeurs'] },
      { key: 'vitesse_captage_recommandee', label: 'Vitesse de captage recommandée (m/s)', type: 'computed' },
      { key: 'distance_max_captage', label: 'Distance maximum de captage (cm)', type: 'computed' },
      { key: 'distance_utilisation', label: "Distance d'utilisation (cm)", type: 'number' },
      { key: 'avis',
        label: "La distance d'utilisation du bras par rapport au point d'émission permet un captage (satisfaisant/non satisfaisant) par rapport à la distance maximum de captage",
        type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_evolution', label: 'Évolution des valeurs par rapport aux mesures précédentes', type: 'section' },
      { key: 'debit_precedent', label: 'Débit mesuré précédemment (m³/h)', type: 'number' },
      { key: 'evolution_pct', label: 'Évolution (%)', type: 'computed' },
      { key: 'commentaire_2', label: 'Commentaire', type: 'textarea' }
    ]
  },
  {
    id: 'cabines_peinture', label: 'Cabines de peinture', icon: 'building', implemented: true,
    fields: [
      { key: 'sous_type', label: 'Type de cabine', type: 'select',
        options: ['CDP Voiture', 'CDP Camion', 'CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] },
      { key: 'norme_16985', label: 'Norme 16985', type: 'boolean' },
      { key: 'guide_inrs', label: 'Guide INRS', type: 'boolean' },

      { key: 'section_localisation', label: 'Localisation', type: 'section' },
      { key: 'marque', label: 'Marque', type: 'text' },
      { key: 'emplacement', label: 'Emplacement', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'description_cabine', label: 'Description de la cabine', type: 'textarea' },
      { key: 'photo', label: 'Photo', type: 'photo' },

      { key: 'subjectiles_type', label: 'Nature des subjectiles', type: 'checkbox-group',
        options: ['Subjectiles industriels divers', 'Véhicules'],
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion'] } },
      { key: 'nature_produits', label: 'Nature des produits à peindre', type: 'text',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'type_flux', label: 'Type de flux', type: 'checkbox-group', options: ['Horizontale', 'Verticale'],
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Ouverte', 'CDP Fermee', 'CDP Encombrant'] } },
      { key: 'type_flux_fosse', label: 'Type de flux', type: 'checkbox-group', options: ['Ascendant', 'Descendant'],
        showIf: { key: 'sous_type', equals: 'CDP Fosse' } },
      { key: 'pulverisation', label: 'Pulvérisation', type: 'checkbox-group', options: ['Liquide', 'Poudre'],
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee'] } },
      { key: 'zone_travail', label: 'Zone de travail', type: 'checkbox-group', options: ['Intérieure', 'Extérieure'],
        showIf: { key: 'sous_type', equals: 'CDP Ouverte' } },

      { key: 'section_visuel', label: "Examen visuel de l'état des éléments de l'installation", type: 'section' },
      { key: 'etat_visuel_cabine', label: 'État visuel de la cabine', type: 'select',
        options: ['Cabine encombrée', 'Cabine encrassée', 'Cabine avec une aération déficiente',
                  "Cabine avec un appel d'air empêchant le bon fonctionnement de l'aération", 'Etat visuel satisfaisant'] },
      { key: 'direction_flux', label: 'Vérification de la direction du flux', type: 'select',
        options: ['Non réalisé', 'Aucune aspiration', 'Toute la fumée a été aspirée',
                  "On observe des irrégularités lors de l'aspiration des fumées", 'On constate un phénomène de rétrodiffusion des fumées'] },
      { key: 'etat_filtres', label: 'État des filtres', type: 'select',
        options: ['Non observé', 'Détérioré', 'En bon état', 'Encrassé', 'Neuf'] },

      { key: 'section_dimensions', label: 'Dimensionnement de la cabine (pour la grille de mesure)', type: 'section' },
      { key: 'cabine_longueur', label: 'Longueur (m) — max 28 m', type: 'number',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Ouverte', 'CDP Fermee', 'CDP Encombrant'] } },
      { key: 'cabine_largeur', label: 'Largeur (m) — max 28 m', type: 'number',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Ouverte', 'CDP Fermee', 'CDP Encombrant'] } },
      { key: 'fosse_longueur', label: 'Longueur (m) — max 28 m', type: 'number',
        showIf: { key: 'sous_type', equals: 'CDP Fosse' } },
      { key: 'nb_lignes', label: 'Lignes de mesure', type: 'computed' },
      { key: 'nb_colonnes', label: 'Colonnes de mesure', type: 'computed' },

      { key: 'section_mesure_avec', label: "Vitesse d'air — avec véhicule / objet encombrant", type: 'section',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },
      { key: 'vitesse_grid_avec', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid',
        colsKey: 'nb_colonnes', rowsKey: 'nb_lignes',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },
      { key: 'vitesse_moy_avec', label: 'Vitesse moyenne mesurée (m/s)', type: 'computed',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },
      { key: 'vitesse_moy_avec_reference', label: 'Vitesse moyenne — valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },
      { key: 'vitesse_moy_avec_inrs', label: 'Vitesse moyenne — valeur recommandée guide INRS (ED839)', type: 'number',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },
      { key: 'vitesse_moy_avec_avis', label: 'Avis vitesse moyenne', type: 'computed',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },
      { key: 'vitesse_min_avec', label: 'Vitesse minimale mesurée (m/s)', type: 'computed',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },
      { key: 'vitesse_min_avec_reference', label: 'Vitesse minimale — valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },
      { key: 'vitesse_min_avec_inrs', label: 'Vitesse minimale — valeur recommandée guide INRS (ED839)', type: 'number',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },
      { key: 'vitesse_min_avec_avis', label: 'Avis vitesse minimale', type: 'computed',
        showIf: { key: 'sous_type', in: ['CDP Voiture', 'CDP Camion', 'CDP Encombrant'] } },

      { key: 'section_mesure_vide', label: "Vitesse d'air — cabine vide", type: 'section',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'vitesse_grid_vide', label: 'Valeurs mesurées (m/s) — « / » pour exclure un point', type: 'grid',
        colsKey: 'nb_colonnes', rowsKey: 'nb_lignes',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'vitesse_moy_vide', label: 'Vitesse moyenne mesurée (m/s)', type: 'computed',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'vitesse_moy_vide_reference', label: 'Vitesse moyenne — valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'vitesse_moy_vide_inrs', label: 'Vitesse moyenne — valeur recommandée guide INRS (ED839)', type: 'number',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'vitesse_moy_vide_avis', label: 'Avis vitesse moyenne', type: 'computed',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'vitesse_min_vide', label: 'Vitesse minimale mesurée (m/s)', type: 'computed',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'vitesse_min_vide_reference', label: 'Vitesse minimale — valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'vitesse_min_vide_inrs', label: 'Vitesse minimale — valeur recommandée guide INRS (ED839)', type: 'number',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },
      { key: 'vitesse_min_vide_avis', label: 'Avis vitesse minimale', type: 'computed',
        showIf: { key: 'sous_type', in: ['CDP Ouverte', 'CDP Fermee', 'CDP Encombrant', 'CDP Fosse'] } },

      { key: 'section_debit', label: "Débit d'air (m³/h) dans la cabine", type: 'section' },
      { key: 'debit_mesure', label: 'Débit mesuré (m³/h)', type: 'computed' },
      { key: 'debit_reference', label: 'Débit — valeur de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'debit_avis', label: 'Avis débit', type: 'computed' },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'conclusion', label: 'Avis global', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

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
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'date_controle', label: 'Date de contrôle', type: 'text' },
      { key: 'reference_equipement', label: "Réf. de l'équipement et/ou Implantation", type: 'textarea' },
      { key: 'commentaire', label: 'Commentaire / Informations', type: 'textarea' },
      { key: 'photo', label: 'Photo', type: 'photo' },

      { key: 'mesures_choisies', label: 'Mesures choisies', type: 'checkbox-group',
        options: ["Vitesse au point d'émission", 'Vitesse de transport', 'Vitesse de transport secondaire'] },

      { key: 'section_vpe', label: "Mesure de la vitesse au point d'émission", type: 'section',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_mesuree', label: 'Vitesse moyenne mesurée (m/s)', type: 'number',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'condition_dispersion', label: 'Condition de dispersion du polluant', type: 'select',
        options: ['Emission sans vitesse initiale en air calme',
                  'Emission à faible vitesse en air modérément calme',
                  'Génération active en zone agitée',
                  'Emission à grande vitesse initiale dans une zone à mouvement d’air très rapide',
                  'Gaz et vapeurs'],
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_reference', label: 'Valeur de référence (m/s, « / » si aucune)', type: 'text',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'vpe_inrs', label: 'Valeurs recommandées par le guide INRS (ED695)', type: 'computed',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
      { key: 'avis_vpe', label: "Avis vitesse au point d'émission", type: 'computed',
        showIf: { key: 'mesures_choisies', contains: "Vitesse au point d'émission" } },
    ]
      .concat(buildEquipTransportFields('vt1', '1', "Vitesse de transport"))
      .concat(buildEquipTransportFields('vt2', '2', 'Vitesse de transport secondaire'))
      .concat([
      { key: 'section_visuel', label: 'État visuel du réseau d’aspiration', type: 'section' },
      { key: 'etat_visuel_reseau', label: 'État visuel du réseau d’aspiration', type: 'select',
        options: ['En bon état', 'Le réseau est encrassé', 'Les tuyaux sont troués'] },
      { key: 'test_fumigene', label: 'Test fumigène', type: 'select',
        options: ['Non réalisé', 'Aucune aspiration', 'Toute la fumée a été aspirée', 'Sans Objet',
                  "On observe des irrégularités lors de l'aspiration des fumées",
                  'On constate un phénomène de rétrodiffusion des fumées'] },

      { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
      { key: 'avis', label: 'Avis global', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ])
  },
  {
    id: 'gaz_echappement', label: 'Gaz d\u2019échappement', icon: 'zap', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'atelier', label: 'Atelier', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Réf. équipement et/ou implantation', type: 'textarea' },

      { key: 'type_equipement', label: "Type d'équipement", type: 'select',
        options: ['Véhicule léger', 'Poids-Lourd et Bus', 'Locomotive (SNCF)', 'Outillage portatif', 'Autres'] },
      { key: 'type_equipement_autre', label: "Préciser l'équipement", type: 'text',
        showIf: { key: 'type_equipement', equals: 'Autres' } },
      { key: 'type_captage', label: 'Type de captage', type: 'select',
        options: ["Captage enveloppant (fixé à l'échappement)", "Captage récepteur (non fixé à l'échappement)"] },

      { key: 'type_captage_adapte', label: 'Type de captage adapté à la situation', type: 'toggle', options: ['Oui', 'Non'] },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' },

      { key: 'section_reseau', label: 'Réseau d\u2019air', type: 'section' },
      { key: 'mesure_localisation', label: 'Localisation de la mesure', type: 'select',
        options: ["Sur la surface de la bouche d'aspiration", 'Dans le conduit'] },
      { key: 'forme_section', label: 'Forme de la section', type: 'select', options: ['Circulaire', 'Rectangulaire'] },
      { key: 'diametre_cote1', label: 'Diamètre ou côte 1 (cm)', type: 'number' },
      { key: 'cote2', label: 'Côte 2 (cm)', type: 'number', showIf: { key: 'forme_section', equals: 'Rectangulaire' } },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'computed' },
      { key: "vitesse_mode", label: "Saisie de la vitesse", type: "select", options: ["Vitesse moyenne directe", "Grille de points"] },
      { key: "vitesse_nb_axes", label: "Nombre d\u2019axes", type: "number", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse_nb_points", label: "Nombre de points par axe", type: "number", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse_grid", label: "Valeurs mesurées (m/s) — « / » pour exclure un point", type: "grid", colsKey: "vitesse_nb_points", rowsKey: "vitesse_nb_axes", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse", label: "Vitesse (m/s)", type: "number", showIf: { key: "vitesse_mode", equals: "Vitesse moyenne directe" } },
      { key: "vitesse_moyenne_grille", label: "Vitesse moyenne calculée (m/s)", type: "computed", showIf: { key: "vitesse_mode", equals: "Grille de points" } },

      { key: 'section_debits', label: 'Débits', type: 'section' },
      { key: 'debit_mesure', label: 'Débit mesuré (m³/h)', type: 'computed' },
      { key: 'debit_reference', label: 'Débit de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'debit_min_inrs', label: 'Débit minimum préconisé INRS (m³/h)', type: 'computed' },
      { key: 'cylindree', label: 'V : cylindrée du véhicule (litres)', type: 'number' },
      { key: 'regime_moteur', label: 'n : régime du moteur (tours/min)', type: 'number' },
      { key: 'debit_min_calcule', label: 'Débit minimum calculé (m³/h)', type: 'computed' },
      { key: 'avis_constructeur', label: 'Avis par rapport aux données constructeur', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_visuel', label: 'État visuel du réseau d\u2019aspiration', type: 'section' },
      { key: 'etat_visuel_reseau', label: 'État visuel du réseau d\u2019aspiration', type: 'checkbox-group',
        options: ['Le système de fixation est hors-service', 'Bon état', 'Autres', 'La gaine est trouée', 'Le réseau est encrassée'] },
      { key: 'config_mesure', label: 'Configuration lors de la mesure (captages raccordés, simultanéité, variateur...)', type: 'textarea' },

      { key: 'section_conduit', label: 'Mesure dans le conduit', type: 'section' },
      { key: 'gaine', label: 'Gaine', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed' },
      { key: 'photo', label: 'Photo', type: 'photo' }
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
      { key: 'etat_filtre', label: 'État du filtre', type: 'select', options: ['Satisfaisant', 'Non Satisfaisant', 'Impossible de se prononcer'] },
      { key: 'perte_charge', label: 'Perte de charge (Pa)', type: 'number' },

      { key: 'section_gaine', label: 'Section', type: 'section' },
      { key: 'forme_section', label: 'Forme de la section', type: 'select', options: ['Circulaire', 'Rectangulaire'] },
      { key: 'diametre_cote1', label: 'Diamètre ou côte 1 (cm)', type: 'number' },
      { key: 'cote2', label: 'Côte 2 (cm)', type: 'number', showIf: { key: 'forme_section', equals: 'Rectangulaire' } },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'computed' },
      { key: "vitesse_mode", label: "Saisie de la vitesse", type: "select", options: ["Vitesse moyenne directe", "Grille de points"] },
      { key: "vitesse_nb_axes", label: "Nombre d\u2019axes", type: "number", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse_nb_points", label: "Nombre de points par axe", type: "number", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse_grid", label: "Valeurs mesurées (m/s) — « / » pour exclure un point", type: "grid", colsKey: "vitesse_nb_points", rowsKey: "vitesse_nb_axes", showIf: { key: "vitesse_mode", equals: "Grille de points" } },
      { key: "vitesse", label: "Vitesse (m/s)", type: "number", showIf: { key: "vitesse_mode", equals: "Vitesse moyenne directe" } },
      { key: "vitesse_moyenne_grille", label: "Vitesse moyenne calculée (m/s)", type: "computed", showIf: { key: "vitesse_mode", equals: "Grille de points" } },

      { key: 'section_debit', label: 'Débit', type: 'section' },
      { key: 'valeur_reference_recommandee', label: 'Valeur de référence ou recommandée (m³/h)', type: 'number' },
      { key: 'debit_annee_n1', label: 'Débit année N-1 (m³/h)', type: 'number' },
      { key: 'debit_annee_en_cours', label: 'Débit année en cours (m³/h)', type: 'computed' },
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
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Réf. équipement', type: 'text' },
      { key: 'ventilation_naturelle', label: 'Ventilation naturelle permanente', type: 'select', options: ['Oui', 'Non'] },
      { key: 'asservissement', label: 'Asservissement', type: 'select', options: ['Oui', 'Non'] },
      { key: 'commentaire', label: 'Commentaire', type: 'textarea' },

      { key: 'section_50vh', label: 'Renouvellement d\u2019air (50 volumes/heure)', type: 'section' },
      { key: 'volume_local', label: 'Volume du local (m³)', type: 'number' },
      { key: 'debit_extraction_box', label: "Débit d'extraction du box (m³/h)", type: 'number' },
      { key: 'volume_par_heure', label: 'Volume par heure (vol/h)', type: 'computed' },
      { key: 'debit_minimal_50vh', label: 'Débit minimal (m³/h) pour 50 volumes/heure', type: 'computed' },
      { key: 'conclusion', label: 'Conclusion', type: 'computed' },

      { key: 'section_debit', label: 'Débit mesuré vs constructeur (optionnel)', type: 'section' },
      { key: 'debit_reference', label: 'Débit de référence constructeur (m³/h)', type: 'number' },
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
    id: 'torches_aspirantes', label: 'Torches aspirantes', icon: 'zap', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'activite_reference_local', label: 'Activité et référence du local', type: 'text' },
      { key: 'date_controle', label: 'Date de contrôle', type: 'text' },
      { key: 'reference_equipement', label: "Réf. de l'équipement", type: 'text' },
      { key: 'point_mesure', label: 'Point de mesure', type: 'text' },
      { key: 'diametre_tube', label: 'Diamètre du tube (mm)', type: 'number' },
      { key: 'vitesse_centre', label: 'Vitesse au centre (m/s)', type: 'number' },
      { key: 'debit', label: 'Débit (m³/h)', type: 'computed' },
      { key: 'valeur_reference', label: 'Valeur de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'ecart_pct', label: 'Écart (%)', type: 'computed' },
      { key: 'constat', label: 'Constat', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'locaux_charge', label: 'Locaux de charge', icon: 'zap', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'date_controle', label: 'Date du contrôle', type: 'text' },
      { key: 'reference_equipement', label: 'Réf. équipement', type: 'text' },
      { key: 'ventilation_permanente', label: 'Ventilation permanente', type: 'select', options: ['Oui', 'Non'] },
      { key: 'ventilation_asservie', label: 'Ventilation asservie aux chargeurs', type: 'select', options: ['Oui', 'Non'] },
      { key: 'debit_variable', label: 'Débit variable', type: 'select', options: ['Oui', 'Non'] },
      { key: 'reglage_variateur', label: 'Réglage du variateur', type: 'text', showIf: { key: 'debit_variable', equals: 'Oui' } },
      { key: 'etat_visuel', label: 'État visuel des installations', type: 'select', options: ['En bon état', 'Autre'] },
      { key: 'si_autre', label: 'Si autre', type: 'text', showIf: { key: 'etat_visuel', equals: 'Autre' } },

      { key: 'section_chargeurs', label: 'Chargeurs (calcul du débit nécessaire INRS)', type: 'section' },
      { key: 'chargeurs', label: 'Liste des chargeurs', type: 'charger-list' },
      { key: 'valeur_inrs', label: 'Débit recommandé par le guide INRS (m³/h)', type: 'computed' },

      { key: 'section_debits', label: 'Débits', type: 'section' },
      { key: 'valeur_reference', label: 'Valeur de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'debit_mesure_local', label: 'Débit mesuré du local (m³/h)', type: 'number' },
      { key: 'avis', label: 'Avis par rapport aux valeurs de référence', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' }
    ]
  },
  {
    id: 'tts', label: 'TTS (Traitement de surface)', icon: 'tool', implemented: true,
    fields: [
      { key: 'batiment', label: 'Bâtiment', type: 'text' },
      { key: 'activite_reference_local', label: 'Activité et réf. du local', type: 'text' },
      { key: 'date_mesure', label: 'Date de mesure', type: 'text' },
      { key: 'reference_equipement', label: "Référence de l'équipement", type: 'text' },

      { key: 'section_cuve', label: 'Caractéristiques de la cuve', type: 'section' },
      { key: 'type_ventilation', label: 'Type de ventilation', type: 'select',
        options: ['Extraction unilatérale', 'Extraction bilatérale'] },
      { key: 'type_cuve', label: 'Type de cuve', type: 'select',
        options: ['Cuve sans dosseret non appuyée contre un mur', 'Cuve avec dosseret ou appuyée contre un mur',
          'Cuve ouverte circulaire sans écran', 'Cuve ouverte circulaire avec écran'] },
      { key: 'forme_cuve', label: 'Forme de cuve', type: 'select', options: ['Rectangulaire', 'Circulaire'] },
      { key: 'coef_a', label: 'a (coefficient)', type: 'number' },
      { key: 'coef_b', label: 'b (coefficient)', type: 'number' },
      { key: 'coef_n', label: 'n (coefficient)', type: 'number' },
      { key: 'diametre_cuve', label: 'Diamètre de la cuve (m)', type: 'number', showIf: { key: 'forme_cuve', equals: 'Circulaire' } },
      { key: 'surface_cuve', label: 'Surface de la cuve (m²)', type: 'computed' },
      { key: 'longueur_l', label: 'Longueur de la cuve L (m)', type: 'number', showIf: { key: 'forme_cuve', equals: 'Rectangulaire' } },
      { key: 'largeur_l', label: 'Largeur de la cuve W (m)', type: 'number', showIf: { key: 'forme_cuve', equals: 'Rectangulaire' } },
      { key: 'surface_ouvertures', label: 'Surface des ouvertures So (m²)', type: 'number' },

      { key: 'section_debits', label: 'Débits', type: 'section' },
      { key: 'vitesse', label: 'Vitesse (m/s)', type: 'number' },
      { key: 'debit_calcule', label: 'Débit calculé Qr ou Qc (m³/h)', type: 'computed' },
      { key: 'debit_qr10', label: 'Débit Qr/10 ou Qc/10 (m³/h)', type: 'computed' },
      { key: 'debit_min_inrs', label: 'Débit minimum préconisé INRS (m³/h)', type: 'number' },
      { key: 'debit_mesure', label: 'Débit mesuré (m³/h)', type: 'number' },
      { key: 'debit_reference', label: 'Débit de référence (m³/h, « / » si aucune)', type: 'text' },
      { key: 'avis', label: 'Avis par rapport aux valeurs de référence', type: 'computed' },
      { key: 'observation', label: 'Observation', type: 'textarea' },

      { key: 'section_conduit', label: 'Mesure dans le conduit', type: 'section' },
      { key: 'gaine', label: 'Gaine', type: 'text' },
      { key: 'temperature_conduit', label: 'Température dans le conduit (°C)', type: 'number' },
      { key: 'pression_statique', label: 'Pression statique dans le conduit (Pa)', type: 'number' },
      { key: 'masse_volumique', label: 'Masse volumique dans les conditions réelles (kg/m³)', type: 'computed' }
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
