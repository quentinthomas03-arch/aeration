// state.js - État global de l'application Contrôle Aération
// Architecture reprise du projet VLEP Mission

var state = {
  view: 'home',
  showModal: null,

  // Une "mission" = une visite de contrôle chez un client, contenant des installations de différents types
  missions: [],
  currentMissionId: null,

  // Navigation dans le détail d'une installation
  currentTypeId: null,   // ex: 'hottes'
  currentInstIndex: null, // index de l'installation dans la liste du type

  searchText: ''
};

function generateId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function escapeHtml(t) {
  if (!t) return '';
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

console.log('✓ State chargé');
