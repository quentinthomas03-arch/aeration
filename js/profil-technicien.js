// profil-technicien.js
// Remplace l'annuaire "Liste_Intervenant" introuvable : chaque technicien renseigne
// une fois ses propres infos, stockées en localStorage (propres à son appareil),
// et peut ensuite les réinjecter dans une mission via "Utiliser mon profil".

var PROFIL_TECHNICIEN_KEY = 'aeration_profil_technicien_v1';

var PROFIL_TECHNICIEN_FIELDS = [
  { key: 'nom', label: 'Nom (Auteur du rapport)' },
  { key: 'agence', label: 'Agence de l\u2019auteur' },
  { key: 'adresse', label: 'Adresse de l\u2019agence' },
  { key: 'codePostal', label: 'Code postal' },
  { key: 'ville', label: 'Ville' },
  { key: 'tel', label: 'Tel' },
  { key: 'mail', label: 'Mail' }
];

function getProfilTechnicien() {
  try {
    var p = localStorage.getItem(PROFIL_TECHNICIEN_KEY);
    return p ? JSON.parse(p) : null;
  } catch (e) { return null; }
}

function saveProfilTechnicien(p) {
  saveData(PROFIL_TECHNICIEN_KEY, p);
}

function renderProfilTechnicien() {
  if (!state._profilTemp) {
    state._profilTemp = getProfilTechnicien() || {};
  }
  var pf = state._profilTemp;

  var h = '<button class="back-btn" onclick="state._profilTemp=null;state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  h += '<div class="card"><h1>' + ICONS.user + ' Mon profil technicien</h1>' +
    '<p class="subtitle">Enregistré uniquement sur cet appareil, réutilisable via "Utiliser mon profil" à la création d\u2019une mission.</p></div>';

  h += '<div class="card">';
  PROFIL_TECHNICIEN_FIELDS.forEach(function (f) {
    h += '<div class="field"><label class="label">' + escapeHtml(f.label) + '</label>';
    h += '<input type="text" class="input" value="' + escapeHtml(pf[f.key] || '') + '" onchange="updateProfilTemp(\'' + f.key + '\',this.value);">';
    h += '</div>';
  });
  h += '</div>';

  h += '<button class="btn btn-primary" onclick="enregistrerProfil();">' + ICONS.check + ' Enregistrer</button>';
  return h;
}

function updateProfilTemp(key, value) {
  if (!state._profilTemp) state._profilTemp = {};
  state._profilTemp[key] = value;
}

function enregistrerProfil() {
  saveProfilTechnicien(state._profilTemp || {});
  state._profilTemp = null;
  state.view = 'home';
  render();
}

console.log('✓ Profil technicien chargé');
