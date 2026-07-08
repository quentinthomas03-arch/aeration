// selection-installations.js
// Écran "Sélection des installations/locaux contrôlés" (reprend la popup "Initialisation" de la macro)

// Sous-ensemble fixe des 6 types proposés en "Mission pollution non spécifique"
var MISSION_TYPES_NON_SPECIFIQUE = ['bureaux', 'sanitaires', 'locaux_fumeurs', 'cta', 'extracteur', 'erp'];

function renderSelectInstallations() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  if (!m.typeMission) m.typeMission = 'non_specifique';
  if (!m.typesSelectionnes) m.typesSelectionnes = [];

  var isNew = m.typesSelectionnes.length === 0 && !m._selectionDejaValidee;

  var h = '<div class="card"><h1>' + ICONS.list + ' Sélection des installations</h1>' +
    '<p class="subtitle">Choisis le type de mission puis les installations/locaux contrôlés. Modifiable à tout moment pendant la mission.</p></div>';

  h += '<div class="card"><div class="section-title">Type de mission</div><div class="row">';
  h += '<button class="btn ' + (m.typeMission === 'non_specifique' ? 'btn-primary' : 'btn-gray') + '" onclick="setTypeMission(\'non_specifique\');">Pollution non spécifique</button>';
  h += '<button class="btn ' + (m.typeMission === 'globale' ? 'btn-primary' : 'btn-gray') + '" onclick="setTypeMission(\'globale\');">Mission globale</button>';
  h += '</div></div>';

  var visibleTypes = m.typeMission === 'globale'
    ? INSTALLATION_TYPES
    : INSTALLATION_TYPES.filter(function (t) { return MISSION_TYPES_NON_SPECIFIQUE.indexOf(t.id) !== -1; });

  h += '<div class="card"><div class="section-title">Locaux / installations contrôlés</div>';
  h += '<div class="install-select-grid">';
  visibleTypes.forEach(function (t) {
    var selected = m.typesSelectionnes.indexOf(t.id) !== -1;
    h += '<button class="install-select-btn' + (selected ? ' selected' : '') + '" onclick="toggleTypeSelectionne(\'' + t.id + '\');">' +
      escapeHtml(t.label) + '</button>';
  });
  h += '</div></div>';

  h += '<button class="btn btn-primary" style="margin-top:10px;" onclick="confirmerSelectionInstallations();">' + ICONS.check + ' Valider</button>';
  if (!isNew) {
    h += '<button class="btn btn-gray" onclick="state.view=\'mission-detail\';render();">Annuler</button>';
  } else {
    h += '<button class="btn btn-gray" onclick="state.view=\'mission-form\';render();">' + ICONS.arrowLeft + ' Retour aux informations de mission</button>';
  }

  return h;
}

function setTypeMission(type) {
  var m = getCurrentMission();
  if (!m) return;
  m.typeMission = type;
  if (type === 'non_specifique') {
    // On ne garde que les sélections encore valides dans le sous-ensemble des 6 types
    m.typesSelectionnes = (m.typesSelectionnes || []).filter(function (id) {
      return MISSION_TYPES_NON_SPECIFIQUE.indexOf(id) !== -1;
    });
  }
  persistMissions();
  render();
}

function toggleTypeSelectionne(id) {
  var m = getCurrentMission();
  if (!m) return;
  if (!m.typesSelectionnes) m.typesSelectionnes = [];
  var idx = m.typesSelectionnes.indexOf(id);
  if (idx === -1) m.typesSelectionnes.push(id);
  else m.typesSelectionnes.splice(idx, 1);
  persistMissions();
  render();
}

function confirmerSelectionInstallations() {
  var m = getCurrentMission();
  if (!m) return;
  if (!m.typesSelectionnes || m.typesSelectionnes.length === 0) {
    if (!confirm('Aucune installation sélectionnée. Continuer quand même ?')) return;
  }
  m._selectionDejaValidee = true;
  persistMissions();
  state.view = 'mission-detail';
  render();
}

console.log('✓ Sélection installations chargé');
