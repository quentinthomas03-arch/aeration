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
    clientSite: '',
    controleur: '',
    dateControle: '',
    installations: installations
  };
}

console.log('✓ State chargé');
