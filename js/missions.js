// missions.js - Écran d'accueil et gestion des missions (visites de contrôle)

function renderHome() {
  var h = '<div class="card"><h1>' + ICONS.zap + ' Contrôle Aération</h1><p class="subtitle">' + state.missions.length + ' mission(s)</p></div>';
  h += '<button class="btn btn-primary" onclick="createMission();">' + ICONS.plus + ' Nouvelle mission</button>';
  h += '<button class="btn btn-gray" onclick="triggerImportMission();" style="margin-top:8px;">' + ICONS.upload + ' Importer une mission (.json)</button>';

  if (state.missions.length === 0) {
    h += '<div class="empty-state"><div class="empty-state-icon">' + ICONS.empty + '</div><p>Aucune mission pour l\u2019instant</p></div>';
  }

  state.missions.slice().reverse().forEach(function (m) {
    var totalInst = 0;
    Object.keys(m.installations || {}).forEach(function (k) { totalInst += m.installations[k].length; });
    h += '<div class="nav-item" onclick="state.currentMissionId=' + m.id + ';state.view=\'mission-detail\';render();">';
    h += '<div class="nav-icon">' + ICONS.building + '</div>';
    h += '<div style="flex:1;"><div style="font-weight:600;">' + escapeHtml(m.clientSite || 'Sans nom') + '</div>';
    h += '<div class="subtitle">' + totalInst + ' installation(s) renseignée(s)</div></div>';
    h += '<button class="agent-delete" onclick="event.stopPropagation();deleteMission(' + m.id + ');">' + ICONS.trash + '</button>';
    h += '</div>';
  });

  return h;
}

function createMission() {
  var name = prompt('Client / Site :');
  if (!name) return;
  var m = createEmptyMission();
  m.clientSite = name;
  m.controleur = prompt('Nom du contrôleur :') || '';
  m.dateControle = new Date().toLocaleDateString('fr-FR');
  state.missions.push(m);
  persistMissions();
  state.currentMissionId = m.id;
  state.view = 'mission-detail';
  render();
}

function deleteMission(id) {
  if (!confirm('Supprimer cette mission et toutes ses installations ?')) return;
  state.missions = state.missions.filter(function (m) { return m.id !== id; });
  persistMissions();
  render();
}

console.log('✓ Missions chargé');
