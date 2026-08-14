// state.js - État global de l'application Contrôle Aération
// Architecture reprise du projet VLEP Mission

var state = {
  view: 'home',

  // Une "mission" = une visite de contrôle chez un client, contenant des installations de différents types
  missions: [],
  currentMissionId: null,

  // Navigation dans le détail d'une installation
  currentTypeId: null,   // ex: 'hottes'
  currentInstIndex: null, // index de l'installation dans la liste du type
  currentStep: 0,         // étape courante dans un écran de saisie en étapes (ex: assistant sanitaires)

  // Écran de vue d'ensemble du site (js/site-overview.js) — état d'affichage uniquement,
  // jamais persisté avec la mission
  overviewMode: 'batiment',   // 'batiment' | 'type'
  overviewExpanded: {},       // clé de groupe -> replié/déplié (accordéon)
  overviewGroupMode: null,    // mode du groupe ouvert en plein écran ("Voir tout")
  overviewGroupKey: null,
  overviewSearch: '',         // recherche en direct (nom / bâtiment / repère), jamais persistée

  // Annuler la dernière action (js/installations.js scheduleUndo) — un seul niveau, en mémoire,
  // jamais persisté : { message, restore }. restore() est appelé par performUndo().
  undoToast: null,

  // Transfert de mission entre appareils (js/import-export.js) — conflit d'id en attente de
  // résolution (écraser / garder les deux / annuler), jamais persisté
  pendingImport: null
};

function generateId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function escapeHtml(t) {
  if (t === undefined || t === null || t === '') return '';
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function saveData(k, d) {
  try { localStorage.setItem(k, JSON.stringify(d)); } catch (e) {}
}

function loadData() {
  try {
    var m = localStorage.getItem('aeration_missions_v1');
    if (m) state.missions = JSON.parse(m);
  } catch (e) {}
  state.missions.forEach(normalizeMission);
}

// Complète les missions sauvegardées avant l'ajout de nouveaux champs (rétrocompatibilité)
function normalizeMission(m) {
  var ref = createEmptyMission();
  if (!m.donneesInternes) m.donneesInternes = {};
  if (m.donneesInternes.natureRevision === undefined) m.donneesInternes.natureRevision = ref.donneesInternes.natureRevision;
  if (!m.documentsTransmis) m.documentsTransmis = ref.documentsTransmis;
  if (!m.descriptionLocaux) m.descriptionLocaux = ref.descriptionLocaux;

  // Sanitaires : pré-remplit chambre_erp_individuelle depuis nom_usage uniquement si le champ n'a
  // jamais été renseigné — ne modifie jamais une valeur Oui/Non déjà saisie (même incohérente avec
  // nom_usage), pour ne changer le résultat calculé d'aucun dossier déjà sauvegardé.
  if (m.installations && Array.isArray(m.installations.sanitaires)) {
    m.installations.sanitaires.forEach(function (inst) {
      var d = inst.data;
      if (d && (d.chambre_erp_individuelle === undefined || d.chambre_erp_individuelle === '')) {
        d.chambre_erp_individuelle = (d.nom_usage === 'chambre individuelle dans ERP') ? 'Oui' : 'Non';
      }
    });
  }

  // Cabines de peinture : force le recalcul de la conclusion (avis global) sur les dossiers déjà
  // sauvegardés. Contrairement à chambre_erp_individuelle, ce champ est un "computed" pur (jamais
  // saisi manuellement) — il n'y a donc aucune valeur explicite à protéger : la formule précédente
  // oubliait debit_avis dans l'agrégation (bug corrigé), et l'ancienne valeur stockée n'est que le
  // résultat périmé de ce bug, pas une décision du technicien.
  if (m.installations && Array.isArray(m.installations.cabines_peinture) && typeof applyCalculations === 'function') {
    m.installations.cabines_peinture.forEach(function (inst) {
      if (inst && inst.data) applyCalculations('cabines_peinture', inst);
    });
  }

  // Bras d'aspiration : même raisonnement que cabines_peinture ci-dessus. conclusion_distance est
  // un champ "computed" pur ; la formule précédente ne tenait pas compte de recyclage = Oui (qui doit
  // forcer Non Satisfaisant, VBA Caller_Conclusion_BOA) — bug corrigé, rien à protéger.
  if (m.installations && Array.isArray(m.installations.bras_aspiration) && typeof applyCalculations === 'function') {
    m.installations.bras_aspiration.forEach(function (inst) {
      if (inst && inst.data) applyCalculations('bras_aspiration', inst);
    });
  }

  // Locaux fumeurs : avis_csp est un champ "computed" pur. La formule précédente utilisait le
  // libellé "Conforme/Non Conforme" (faux, le VBA utilise "Satisfaisant/Non Satisfaisant") — bug
  // corrigé, rien à protéger sur les 3 critères déjà existants (crit_surface_35/crit_ratio_20/
  // crit_renouvellement) : même verdict Satisfaisant/Non Satisfaisant qu'avant, juste le mot qui
  // change. Les 17 nouveaux critères de la checklist réglementaire à 21 critères n'existaient pas
  // avant et restent naturellement vides sur les dossiers déjà saisis (ignorés par la formule tant
  // qu'ils ne sont pas renseignés — cf. commentaire dans calculations.js).
  if (m.installations && Array.isArray(m.installations.locaux_fumeurs) && typeof applyCalculations === 'function') {
    m.installations.locaux_fumeurs.forEach(function (inst) {
      if (inst && inst.data) applyCalculations('locaux_fumeurs', inst);
    });
  }
  return m;
}

function persistMissions() {
  saveData('aeration_missions_v1', state.missions);
}

function getCurrentMission() {
  for (var i = 0; i < state.missions.length; i++) {
    if (state.missions[i].id === state.currentMissionId) return state.missions[i];
  }
  return null;
}

function createEmptyMission() {
  var installations = {};
  INSTALLATION_TYPES.forEach(function (t) { installations[t.id] = []; });
  return {
    id: generateId(),
    createdAt: new Date().toISOString(),

    // Champs "legacy" gardés pour compat (accueil, export Word/JSON) — synchronisés
    // automatiquement depuis infosClient/donneesInternes via updateMissionField()
    clientSite: '',
    controleur: '',
    dateControle: '',

    // Onglet "Entrées" — Données internes
    donneesInternes: {
      numeroAffaire: '',
      referenceOffre: '',
      numeroChrono: '',
      auteurRapport: '',
      telAuteur: '',
      mailAgenceAuteur: '',
      datesIntervention: '',
      dateRapport: '',
      natureRevision: 'Version initiale'
    },

    // Onglet "Entrées" — Informations sur le client
    infosClient: {
      nomEntreprise: '',
      nomDemandeur: '',
      adresse: '',
      codePostal: '',
      ville: '',
      tel: ''
    },

    // Onglet "Entrées" — Intervenant sur site
    intervenantSite: {
      intervenant: '',
      agenceAuteur: '',
      adresseAgence: '',
      codePostal: '',
      ville: ''
    },

    // Onglet "Entrées" — Informations sur le site d'intervention
    infosSiteIntervention: {
      siteIntervention: '',
      nomContact: '',
      adresseSite: '',
      codePostal: '',
      ville: '',
      telContact: '',
      portableContact: '',
      mailContact: ''
    },

    // Sélection des installations contrôlées (section 3 de l'onglet Entrées)
    typeMission: '',        // 'non_specifique' | 'globale'
    typesSelectionnes: [],  // ids des INSTALLATION_TYPES retenus pour cette mission

    // Onglet "Entrées" — Documents transmis à SOCOTEC (feuille "Info" du fichier d'origine)
    documentsTransmis: {
      documents: [
        { label: 'Plan général de l\u2019installation', transmis: '', commentaire: '' },
        { label: 'Nombre de postes de travail par local', transmis: '', commentaire: '' },
        { label: 'Données techniques sur les centrales de traitement d\u2019air (CTA)', transmis: '', commentaire: '' },
        { label: 'Planning annuel de maintenance préventive', transmis: '', commentaire: '' },
        { label: 'Contrat d\u2019entretien et de maintenance', transmis: '', commentaire: '' },
        { label: 'Résultats de la vérification de l\u2019année précédente', transmis: '', commentaire: '' }
      ],
      notice: [
        { label: 'Notice d\u2019instruction y compris Dossier de Valeurs de Référence', presence: '', commentaire: '' },
        { label: 'Consigne d\u2019utilisation', presence: '', commentaire: '' }
      ],
      observations: ''
    },

    // Onglet "Entrées" — Description générale des locaux (locaux exclus de la prestation)
    descriptionLocaux: {
      locauxExclus: ''
    },

    installations: installations
  };
}

// Champs "structure" repris lors du chargement d'un site précédent : uniquement les champs
// d'identification (bâtiment, repère, emplacement, référence...), pas les champs d'état/
// configuration/mesure — ceux-là repartent vierges pour que chaque visite reflète un constat
// réellement fait cette année-là. Une règle par TYPE de champ (garder tous les 'select', par ex.)
// aurait été trop large : plusieurs 'select' sont des constats de visite, pas des attributs fixes
// (ex. CTA : 'batterie_froide' ou 'avis' ne doivent jamais être prérempli avec la conclusion de
// l'année précédente). On s'appuie donc sur les étapes "Identification" déjà curées dans
// js/wizard-steps.js ; sanitaires (wizard dédié, hors WIZARD_STEPS) est listé à la main.
function structuralFieldKeys(typeId) {
  if (typeId === 'sanitaires') return ['batiment', 'repere', 'nom_usage'];
  var steps = (typeof WIZARD_STEPS !== 'undefined' && WIZARD_STEPS[typeId]) || [];
  var keys = [];
  steps.forEach(function (step) {
    if (step.title === 'Identification') keys = keys.concat(step.fields);
  });
  return keys;
}

// Duplication rapide d'une installation (chantier "forte volumétrie", ex. 50 sanitaires) : élargit
// le découpage Identification/Constat ci-dessus aux champs de configuration qui ne sont pas des
// constats de visite (dimensions, type de ventilation, comptages d'équipement...), toujours avec la
// même prudence que le préremplissage N-1 — ne jamais reconduire un constat comme si déjà validé.
// Deux couches de protection : (1) whitelist d'étapes par type ci-dessous, dérivée de
// wizard-steps.js, qui n'ajoute que des étapes relues champ par champ comme purement
// configuration — une étape ambiguë (mesure et configuration mélangées sans filtre fiable, ex.
// "Cabine vide — dimensions & grille") est sciemment laissée de côté plutôt que risquée ; (2) même
// dans une étape retenue, un champ dont la clé signale un constat individuel reste explicitement
// exclu (ceinture et bretelles) — repéré grâce au bug CTA du chantier N-1 où batterie_froide/avis
// auraient été reconduits comme validés par une règle basée sur le seul type de champ.
var DUPLICATION_FINDING_KEY_PATTERN = /^(avis|conclusion|constat|critere_|etat_)|_etat$/;
var DUPLICATION_FINDING_KEYS = {
  adapte_situation: true, conditions_dispersion: true, direction_flux: true, fiche_maintenance: true,
  mesures_choisies: true, obstacle_point_mesure: true, operateur_hors_volume: true, perturbations: true,
  prise_air_neuf: true, recyclage: true, remarques_complementaires: true, test_fumigene: true,
  type_captage_adapte: true, vpe_conditions_dispersion: true, zones_mortes: true, zones_turbulentes: true,
  batterie_chaude: true, batterie_froide: true, canalisations_gaines: true, ventilateur_courroie: true
};
function isDuplicationFindingField(f) {
  return DUPLICATION_FINDING_KEY_PATTERN.test(f.key) || !!DUPLICATION_FINDING_KEYS[f.key];
}

// Étapes de configuration au-delà d'Identification ('Localisation' pour menuiserie_bis) jugées sûres
// à dupliquer intégralement (la couche 2 ci-dessus filtre quand même tout champ de constat qui s'y
// serait glissé, ex. les 'etat_*' des étapes filtration CTA).
var DUPLICATION_EXTRA_KEEP_STEPS = {
  bureaux: ['Type de ventilation'],
  erp: ['Occupation', 'Type de ventilation'],
  locaux_fumeurs: ['Dimensions du local', "Ratio avec l'établissement"],
  bras_aspiration: ["Bouche d'aspiration — forme", "Bouche d'aspiration — implantation"],
  extracteur: ['Section du conduit', 'Taux de renouvellement (optionnel)'],
  gaz_echappement: ["Type d'équipement", 'Section du conduit'],
  hottes: ['VPE — dimensions & grille'],
  menuiserie: ['Machines reliées', 'Caractéristique du réseau', 'Dépoussiéreur', 'Section du conduit'],
  sorbonnes: ['Ouverture de travail', 'Dispositif de sécurité'],
  tts: ['Cuve — caractéristiques', 'Cuve — dimensions', 'Procédé'],
  locaux_charge: ['Ventilation'],
  box_peinture: ['État visuel & ventilation'],
  cabines_peinture: ['Caractéristiques'],
  cta: ['Filtration — pré-filtre', 'Filtration — filtre', 'Filtration — filtre absolu',
    'Réseau neuf — section', 'Réseau soufflé — section', 'Réseau repris (optionnel) — section']
};

function duplicationFieldKeys(typeId) {
  if (typeId === 'sanitaires') {
    return ['batiment', 'repere', 'nom_usage', 'chambre_erp_individuelle', 'wc_urinoirs', 'douches',
      'lavabos', 'individuel_collectif', 'nombre_bouches'];
  }
  var steps = (typeof WIZARD_STEPS !== 'undefined' && WIZARD_STEPS[typeId]) || [];
  var keepTitles = { Identification: true, Localisation: true };
  (DUPLICATION_EXTRA_KEEP_STEPS[typeId] || []).forEach(function (title) { keepTitles[title] = true; });
  var keys = [];
  steps.forEach(function (step) {
    if (keepTitles[step.title]) keys = keys.concat(step.fields);
  });
  return keys;
}

var DUPLICATION_ALWAYS_RESET_TYPES = { computed: true, textarea: true, grid: true, 'charger-list': true, photo: true };

function buildInstallationDataForDuplicate(typeId, sourceData) {
  var t = getInstallationType(typeId);
  var data = {};
  if (!t || !sourceData) return data;
  var keepKeys = {};
  duplicationFieldKeys(typeId).forEach(function (k) { keepKeys[k] = true; });
  var n1Targets = {};
  (N1_COMPARISON_FIELDS[typeId] || []).forEach(function (pair) { n1Targets[pair.n1] = true; });
  t.fields.forEach(function (f) {
    if (f.type === 'section' || !keepKeys[f.key]) return;
    if (DUPLICATION_ALWAYS_RESET_TYPES[f.type] || n1Targets[f.key] || isDuplicationFindingField(f)) return;
    if (sourceData[f.key] !== undefined) data[f.key] = sourceData[f.key];
  });
  return data;
}

// Reprend la structure d'une mission source (bâtiments, installations, noms, emplacements) avec les
// mesures vierges, pour préremplir une nouvelle visite du même site — distinct du transfert de
// mission (js/import-export.js finishImportMission) qui reprend une mission EN COURS à l'identique,
// même id. Ici on part toujours d'une mission neuve : nouvel id de mission, nouveaux id
// d'installation, aucune résolution de conflit nécessaire.
function buildInstallationDataFromPrevious(typeId, sourceData) {
  var data = {};
  if (!sourceData) return data;
  var t = getInstallationType(typeId);
  var fieldByKey = {};
  if (t) t.fields.forEach(function (f) { fieldByKey[f.key] = f; });
  structuralFieldKeys(typeId).forEach(function (key) {
    // Chantier "photos par installation" : 'photo' a rejoint l'étape Identification de 3 types
    // (bras_aspiration, installations_diverses, gaz_echappement) — une photo est propre à une visite
    // précise, jamais une référence à reconduire d'un site à l'autre (même logique que les autres
    // champs de constat/mesure déjà exclus). Filtre défensif générique par type de champ plutôt qu'un
    // cas particulier sur 'photo', au cas où une future étape Identification embarquerait un autre
    // champ de ce genre.
    var f = fieldByKey[key];
    if (f && DUPLICATION_ALWAYS_RESET_TYPES[f.type]) return;
    if (sourceData[key] !== undefined) data[key] = sourceData[key];
  });
  var n1Fields = N1_COMPARISON_FIELDS[typeId];
  if (n1Fields) {
    n1Fields.forEach(function (pair) {
      var v = sourceData[pair.current];
      if (v !== undefined && v !== '' && !isNaN(parseFloat(v))) data[pair.n1] = v;
    });
  }
  return data;
}

function createMissionFromPreviousSite(source) {
  var m = createEmptyMission();
  m.infosClient = JSON.parse(JSON.stringify(source.infosClient || m.infosClient));
  m.intervenantSite = JSON.parse(JSON.stringify(source.intervenantSite || m.intervenantSite));
  m.infosSiteIntervention = JSON.parse(JSON.stringify(source.infosSiteIntervention || m.infosSiteIntervention));
  m.clientSite = source.clientSite || m.infosClient.nomEntreprise || '';
  m.typeMission = source.typeMission || '';
  m.typesSelectionnes = (source.typesSelectionnes || []).slice();

  Object.keys(source.installations || {}).forEach(function (typeId) {
    if (!m.installations.hasOwnProperty(typeId)) return;
    m.installations[typeId] = (source.installations[typeId] || []).map(function (inst) {
      return { id: generateId(), data: buildInstallationDataFromPrevious(typeId, inst.data) };
    });
  });
  normalizeMission(m);
  return m;
}

console.log('✓ State chargé');
