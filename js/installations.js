// installations.js - Moteur générique piloté par schéma
// Un seul moteur de formulaire pour les 17 types, au lieu de 17 formulaires écrits à la main

function renderMissionDetail() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  var h = '<button class="back-btn" onclick="state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  h += '<div class="card"><h1>' + ICONS.building + ' ' + escapeHtml(m.clientSite || 'Mission') + '</h1>';
  h += '<p class="subtitle">' + escapeHtml(m.controleur || '') + (m.dateControle ? ' • ' + escapeHtml(m.dateControle) : '') + '</p></div>';

  h += '<div class="row" style="margin-bottom:12px;">';
  h += '<button class="btn btn-blue btn-small" onclick="exportRapportWord();">' + ICONS.download + ' Rapport Word</button>';
  h += '<button class="btn btn-gray btn-small" onclick="exportMissionJSON(' + m.id + ');">' + ICONS.download + ' JSON</button>';
  h += '</div>';

  h += '<div class="nav-menu">';
  INSTALLATION_TYPES.forEach(function (t) {
    var count = (m.installations[t.id] || []).length;
    var disabled = !t.implemented;
    h += '<div class="nav-item" style="' + (disabled ? 'opacity:0.5;' : '') + '" onclick="' +
      (disabled ? 'alert(\'Ce type d\\\'installation sera bientôt disponible.\');' :
        'state.currentTypeId=\'' + t.id + '\';state.view=\'type-list\';render();') + '">';
    h += '<div class="nav-icon">' + getIcon(t.icon) + '</div>';
    h += '<div style="flex:1;"><div style="font-weight:600;">' + escapeHtml(t.label) + '</div>';
    h += '<div class="subtitle">' + count + ' installation(s)' + (disabled ? ' — à venir' : '') + '</div></div>';
    h += ICONS.chevronRight + '</div>';
  });
  h += '</div>';
  return h;
}

function renderTypeList() {
  var m = getCurrentMission();
  var t = getInstallationType(state.currentTypeId);
  if (!m || !t) { state.view = 'home'; render(); return ''; }
  var list = m.installations[t.id] || [];

  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(m.clientSite || 'Mission') + '</button>';
  h += '<div class="card"><h1>' + getIcon(t.icon) + ' ' + escapeHtml(t.label) + '</h1><p class="subtitle">' + list.length + ' installation(s)</p></div>';

  list.forEach(function (inst, idx) {
    var titleField = t.fields.find(function (f) { return f.type === 'text'; });
    var title = titleField ? (inst.data[titleField.key] || 'Sans nom') : ('#' + (idx + 1));
    h += '<div class="nav-item" onclick="state.currentInstIndex=' + idx + ';state.view=\'installation-form\';render();">';
    h += '<div class="nav-icon">' + getIcon(t.icon) + '</div>';
    h += '<div style="flex:1;"><div style="font-weight:600;">' + escapeHtml(title) + '</div></div>';
    h += '<button class="agent-delete" onclick="event.stopPropagation();deleteInstallation(\'' + t.id + '\',' + idx + ');">' + ICONS.trash + '</button>';
    h += '</div>';
  });

  h += '<button class="btn btn-primary" onclick="addInstallation(\'' + t.id + '\');">' + ICONS.plus + ' Ajouter</button>';
  return h;
}

function addInstallation(typeId) {
  var m = getCurrentMission();
  if (!m.installations[typeId]) m.installations[typeId] = [];
  m.installations[typeId].push({ id: generateId(), data: {} });
  persistMissions();
  state.currentTypeId = typeId;
  state.currentInstIndex = m.installations[typeId].length - 1;
  state.view = 'installation-form';
  render();
}

function deleteInstallation(typeId, idx) {
  if (!confirm('Supprimer cette installation ?')) return;
  var m = getCurrentMission();
  m.installations[typeId].splice(idx, 1);
  persistMissions();
  render();
}

function renderInstallationForm() {
  var m = getCurrentMission();
  var t = getInstallationType(state.currentTypeId);
  if (!m || !t) { state.view = 'home'; render(); return ''; }
  var inst = m.installations[t.id][state.currentInstIndex];
  if (!inst) { state.view = 'type-list'; render(); return ''; }

  var h = '<button class="back-btn" onclick="state.view=\'type-list\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(t.label) + '</button>';
  h += '<div class="card"><h1>' + getIcon(t.icon) + ' ' + escapeHtml(t.label) + '</h1></div>';

  t.fields.forEach(function (f) {
    if (f.type === 'section') {
      h += '<div class="section-title" style="margin-top:16px;color:#374151;font-weight:700;">' + escapeHtml(f.label) + '</div>';
      return;
    }
    h += '<div class="card"><div class="field">';
    var isAuto = (typeof isComputedField === 'function') && isComputedField(t.id, f.key);
    h += '<label class="label">' + escapeHtml(f.label) +
      (isAuto ? ' <span style="font-size:10px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:8px;">calculé auto</span>' : '') +
      '</label>';
    h += renderFieldInput(t.id, f, inst);
    h += '</div></div>';
  });

  h += '<button class="btn btn-primary" onclick="state.view=\'type-list\';render();">' + ICONS.check + ' Terminé</button>';
  return h;
}

function renderFieldInput(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var onchange = "updateInstallationField('" + typeId + "','" + f.key + "',this.value);";

  if (f.type === 'text') {
    return '<input type="text" class="input" value="' + escapeHtml(val) + '" onchange="' + onchange + '">';
  }
  if (f.type === 'number') {
    return '<input type="number" class="input" value="' + escapeHtml(val) + '" onchange="' + onchange + '">';
  }
  if (f.type === 'textarea') {
    return '<textarea class="input" rows="3" onchange="' + onchange + '">' + escapeHtml(val) + '</textarea>';
  }
  if (f.type === 'select') {
    var h = '<select class="input" onchange="' + onchange + '">';
    h += '<option value=""' + (val === '' ? ' selected' : '') + '>—</option>';
    f.options.forEach(function (opt) {
      h += '<option value="' + escapeHtml(opt) + '"' + (val === opt ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>';
    });
    h += '</select>';
    return h;
  }
  if (f.type === 'checkbox-group') {
    var current = Array.isArray(val) ? val : (val ? [val] : []);
    var h = '<div class="row">';
    f.options.forEach(function (opt) {
      var checked = current.indexOf(opt) !== -1;
      h += '<label style="display:flex;align-items:center;gap:6px;font-size:13px;">' +
        '<input type="checkbox"' + (checked ? ' checked' : '') +
        ' onchange="toggleInstallationCheckbox(\'' + typeId + '\',\'' + f.key + '\',\'' + escapeHtml(opt).replace(/'/g, "\\'") + '\',this.checked);">' +
        escapeHtml(opt) + '</label>';
    });
    h += '</div>';
    return h;
  }
  if (f.type === 'photo') {
    return '<input type="file" accept="image/*" capture="environment" onchange="handleInstallationPhoto(\'' + typeId + '\',\'' + f.key + '\',this);">' +
      (val ? '<img src="' + val + '" style="max-width:100%;margin-top:8px;border-radius:8px;">' : '');
  }
  return '';
}

function updateInstallationField(typeId, key, value) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  inst.data[key] = value;
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  if (state.view === 'installation-form') render();
}

function toggleInstallationCheckbox(typeId, key, option, checked) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  var current = Array.isArray(inst.data[key]) ? inst.data[key] : [];
  if (checked) { if (current.indexOf(option) === -1) current.push(option); }
  else { current = current.filter(function (o) { return o !== option; }); }
  inst.data[key] = current;
  persistMissions();
}

function handleInstallationPhoto(typeId, key, input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    updateInstallationField(typeId, key, e.target.result);
    render();
  };
  reader.readAsDataURL(file);
}

console.log('✓ Moteur installations chargé');
