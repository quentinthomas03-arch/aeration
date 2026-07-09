// import-export.js - Export/Import de missions en JSON
// Permet de transférer une mission d'un appareil à un autre (fichier .json)

function exportMissionJSON(id) {
  var m = state.missions.find(function (x) { return x.id === id; });
  if (!m) { alert('Mission introuvable'); return; }
  var exportData = {
    _format: 'AERATION_Mission_JSON',
    _version: '1.0',
    _exportDate: new Date().toISOString(),
    mission: JSON.parse(JSON.stringify(m))
  };
  var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  var safeName = (m.clientSite || 'mission').replace(/[^a-zA-Z0-9\u00e0-\u00ff _-]/g, '').replace(/\s+/g, '_').substring(0, 40);
  a.href = URL.createObjectURL(blob);
  a.download = 'AERATION_' + safeName + '_' + String(m.id).slice(-6) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function triggerImportMission() {
  var input = document.getElementById('import-mission-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.id = 'import-mission-input';
    input.onchange = handleImportMission;
    document.body.appendChild(input);
  }
  input.value = '';
  input.click();
}

function handleImportMission(event) {
  var file = event.target ? event.target.files[0] : null;
  if (!file) return;
  if (!file.name.endsWith('.json')) { alert('Veuillez sélectionner un fichier .json'); return; }
  var reader = new FileReader();
  reader.onload = function (e) { importMissionFromText(e.target.result); };
  reader.readAsText(file);
}

function importMissionFromText(text) {
  try {
    var data = JSON.parse(text);
    var mission = null;
    if (data._format === 'AERATION_Mission_JSON' && data.mission) mission = data.mission;
    else if (data.id && data.installations) mission = data;
    else { alert('Format non reconnu.\n\nAssurez-vous d\u2019importer une mission Contrôle Aération.'); return; }

    // compléter les types manquants (si le schéma a évolué depuis l'export)
    INSTALLATION_TYPES.forEach(function (t) {
      if (!mission.installations[t.id]) mission.installations[t.id] = [];
    });
    normalizeMission(mission);

    var exists = state.missions.some(function (m) { return m.id === mission.id; });
    if (exists) {
      if (!confirm('Une mission avec le même identifiant existe déjà.\n\nVoulez-vous l\u2019écraser ?')) return;
      state.missions = state.missions.filter(function (m) { return m.id !== mission.id; });
    }
    state.missions.push(mission);
    persistMissions();
    render();

    var total = 0;
    Object.keys(mission.installations).forEach(function (k) { total += mission.installations[k].length; });
    alert('Mission importée avec succès !\n\n' + (mission.clientSite || 'Sans nom') + '\n' + total + ' installation(s)');
  } catch (err) {
    alert('Erreur lors de l\u2019import :\n\n' + err.message);
  }
}

console.log('✓ Import/Export chargé');
