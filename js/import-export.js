// import-export.js - Export/Import de missions en JSON
// Permet de transférer une mission d'un appareil à un autre (fichier .json), y compris une mission
// EN COURS (statuts, étape en cours par installation — inst.data._step est un champ de donnée normal,
// donc déjà inclus sans traitement particulier).

function buildMissionExportBlob(m) {
  var exportData = {
    _format: 'AERATION_Mission_JSON',
    _version: '1.0',
    _exportDate: new Date().toISOString(),
    mission: JSON.parse(JSON.stringify(m))
  };
  var safeName = (m.clientSite || 'mission').replace(/[^a-zA-Z0-9à-ÿ _-]/g, '').replace(/\s+/g, '_').substring(0, 40);
  var filename = 'AERATION_' + safeName + '_' + String(m.id).slice(-6) + '.json';
  return { blob: new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }), filename: filename };
}

function downloadBlob(blob, filename) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// Partage natif (mobile, Web Share API niveau 2 avec fichiers) si disponible, sinon téléchargement
// classique. Le partage échoue silencieusement si l'utilisateur annule (AbortError) ; toute autre
// erreur retombe sur le téléchargement pour ne jamais bloquer le transfert.
function shareOrExportMission(id) {
  var m = state.missions.find(function (x) { return x.id === id; });
  if (!m) { alert('Mission introuvable'); return; }
  var built = buildMissionExportBlob(m);

  var file = null;
  try { file = new File([built.blob], built.filename, { type: 'application/json' }); } catch (e) { file = null; }

  if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      files: [file],
      title: 'Mission ' + (m.clientSite || 'Aération'),
      text: 'Export mission Contrôle Aération'
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return; // annulé par l'utilisateur, rien à faire
      downloadBlob(built.blob, built.filename);
    });
    return;
  }
  downloadBlob(built.blob, built.filename);
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

// Détecte le format d'un JSON importé (enveloppe AERATION_Mission_JSON ou mission brute), utilisé
// aussi bien par le transfert de mission (reprise à l'identique) que par le chargement d'un site
// précédent pour préremplissage N-1 (reprise de structure seulement, cf. importPreviousSiteFromText).
function extractMissionFromImportData(data) {
  if (data._format === 'AERATION_Mission_JSON' && data.mission) return data.mission;
  if (data.id && data.installations) return data;
  return null;
}

function importMissionFromText(text) {
  try {
    var data = JSON.parse(text);
    var mission = extractMissionFromImportData(data);
    if (!mission) { alert('Format non reconnu.\n\nAssurez-vous d’importer une mission Contrôle Aération.'); return; }

    // compléter les types manquants (si le schéma a évolué depuis l'export)
    INSTALLATION_TYPES.forEach(function (t) {
      if (!mission.installations[t.id]) mission.installations[t.id] = [];
    });
    normalizeMission(mission);

    var existing = state.missions.find(function (m) { return m.id === mission.id; });
    if (existing) {
      // Conflit d'id : jamais de fusion silencieuse — l'utilisateur choisit explicitement
      // (écraser / garder les deux / annuler) sur un écran dédié, cf. renderImportConflict.
      state.pendingImport = { incoming: mission, existing: existing };
      state.view = 'import-conflict';
      render();
      return;
    }
    finishImportMission(mission);
  } catch (err) {
    alert('Erreur lors de l’import :\n\n' + err.message);
  }
}

function finishImportMission(mission) {
  state.missions.push(mission);
  persistMissions();
  render();
  var total = 0;
  Object.keys(mission.installations).forEach(function (k) { total += mission.installations[k].length; });
  alert('Mission importée avec succès !\n\n' + (mission.clientSite || 'Sans nom') + '\n' + total + ' installation(s)');
}

function resolveImportConflict(action) {
  var pending = state.pendingImport;
  if (!pending) return;
  state.pendingImport = null;

  if (action === 'cancel') { state.view = 'home'; render(); return; }

  if (action === 'overwrite') {
    state.missions = state.missions.filter(function (m) { return m.id !== pending.existing.id; });
    finishImportMission(pending.incoming);
    return;
  }

  if (action === 'keep-both') {
    pending.incoming.id = generateId();
    pending.incoming.clientSite = (pending.incoming.clientSite || 'Sans nom') + ' (copie importée)';
    finishImportMission(pending.incoming);
    return;
  }
}

// ————————————————————————————————————————————
// Charger un site précédent pour préremplissage N-1 — usage distinct du transfert de mission
// ci-dessus : on ne reprend PAS la mission à l'identique (pas de conflit d'id possible, une mission
// neuve est toujours créée), seulement sa structure (bâtiments, installations, noms, emplacements)
// avec les mesures vierges et les champs N-1 des 4 types identifiés (js/installations-schema.js
// N1_COMPARISON_FIELDS) préremplis depuis les valeurs mesurées de la mission source. Construction de
// la mission déléguée à createMissionFromPreviousSite (js/state.js).
// ————————————————————————————————————————————

function triggerImportPreviousSite() {
  var input = document.getElementById('import-previous-site-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.id = 'import-previous-site-input';
    input.onchange = handleImportPreviousSite;
    document.body.appendChild(input);
  }
  input.value = '';
  input.click();
}

function handleImportPreviousSite(event) {
  var file = event.target ? event.target.files[0] : null;
  if (!file) return;
  if (!file.name.endsWith('.json')) { alert('Veuillez sélectionner un fichier .json'); return; }
  var reader = new FileReader();
  reader.onload = function (e) { importPreviousSiteFromText(e.target.result); };
  reader.readAsText(file);
}

function importPreviousSiteFromText(text) {
  try {
    var data = JSON.parse(text);
    var source = extractMissionFromImportData(data);
    if (!source) { alert('Format non reconnu.\n\nAssurez-vous d’importer un fichier de mission Contrôle Aération.'); return; }
    INSTALLATION_TYPES.forEach(function (t) {
      if (!source.installations[t.id]) source.installations[t.id] = [];
    });

    var m = createMissionFromPreviousSite(source);
    state.missions.push(m);
    persistMissions();
    state.currentMissionId = m.id;
    state.view = 'mission-form';
    render();

    var total = 0;
    Object.keys(m.installations).forEach(function (k) { total += m.installations[k].length; });
    alert('Structure du site reprise avec succès !\n\n' + (m.clientSite || 'Sans nom') + '\n' + total +
      ' installation(s) — mesures vierges, valeurs N-1 préremplies quand disponibles.');
  } catch (err) {
    alert('Erreur lors du chargement :\n\n' + err.message);
  }
}

function renderImportConflict() {
  var pending = state.pendingImport;
  if (!pending) { state.view = 'home'; render(); return ''; }
  var existing = pending.existing, incoming = pending.incoming;

  function countInst(m) {
    var total = 0;
    Object.keys(m.installations || {}).forEach(function (k) { total += (m.installations[k] || []).length; });
    return total;
  }
  function summaryCard(title, m) {
    var dateStr = m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : '';
    return '<div class="card"><div class="section-title">' + escapeHtml(title) + '</div>' +
      '<div style="font-weight:600;">' + escapeHtml(m.clientSite || 'Sans nom') + '</div>' +
      '<div class="subtitle">' + countInst(m) + ' installation(s)' + (dateStr ? ' · créée le ' + escapeHtml(dateStr) : '') + '</div></div>';
  }

  var h = '<div class="card"><h1>' + ICONS.upload + ' Mission déjà présente</h1>' +
    '<p class="subtitle">Une mission avec le même identifiant existe déjà sur cet appareil. Que veux-tu faire ?</p></div>';
  h += summaryCard('Mission actuelle sur cet appareil', existing);
  h += summaryCard('Mission à importer', incoming);
  h += '<button class="btn btn-primary" onclick="resolveImportConflict(\'overwrite\');">' + ICONS.check + ' Écraser la mission existante</button>';
  h += '<button class="btn btn-gray" onclick="resolveImportConflict(\'keep-both\');">' + ICONS.copy + ' Garder les deux (créer une copie)</button>';
  h += '<button class="btn btn-gray" onclick="resolveImportConflict(\'cancel\');">Annuler</button>';
  return h;
}

console.log('✓ Import/Export chargé');
