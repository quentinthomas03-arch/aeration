// installations.js - Moteur générique piloté par schéma
// Un seul moteur de formulaire pour les 17 types, au lieu de 17 formulaires écrits à la main

function renderMissionDetail() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  var h = '<button class="back-btn" onclick="state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  h += '<div class="card"><h1>' + ICONS.building + ' ' + escapeHtml(m.clientSite || 'Mission') + '</h1>';
  h += '<p class="subtitle">' + escapeHtml(m.controleur || '') + (m.dateControle ? ' • ' + escapeHtml(m.dateControle) : '') + '</p></div>';

  h += '<div class="row" style="margin-bottom:8px;">';
  h += '<button class="btn btn-gray btn-small" onclick="state.view=\'mission-form\';render();">' + ICONS.edit + ' Infos mission</button>';
  h += '<button class="btn btn-gray btn-small" onclick="state.view=\'select-installations\';render();">' + ICONS.list + ' Sélection installations</button>';
  h += '</div>';

  h += '<div class="row" style="margin-bottom:12px;">';
  h += '<button class="btn btn-blue btn-small" onclick="exportRapportWord();">' + ICONS.download + ' Rapport Word</button>';
  h += '<button class="btn btn-gray btn-small" onclick="exportMissionJSON(' + m.id + ');">' + ICONS.download + ' JSON</button>';
  h += '</div>';

  var typesSelectionnes = m.typesSelectionnes || [];
  var typesAffiches = INSTALLATION_TYPES.filter(function (t) { return typesSelectionnes.indexOf(t.id) !== -1; });

  if (typesAffiches.length === 0) {
    h += '<div class="empty-state"><div class="empty-state-icon">' + ICONS.empty + '</div>' +
      '<p>Aucune installation sélectionnée pour cette mission.</p></div>';
    h += '<button class="btn btn-primary" onclick="state.view=\'select-installations\';render();">' + ICONS.list + ' Sélectionner les installations</button>';
    return h;
  }

  h += '<div class="nav-menu">';
  typesAffiches.forEach(function (t) {
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
    if (f.showIf && !evalShowIf(f.showIf, inst.data)) return;
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

function evalShowIf(cond, data) {
  var v = data[cond.key];
  if (cond.contains !== undefined) {
    return Array.isArray(v) ? v.indexOf(cond.contains) !== -1 : v === cond.contains;
  }
  if (cond.in !== undefined) return cond.in.indexOf(v) !== -1;
  if (cond.equals !== undefined) return v === cond.equals;
  return true;
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
  if (f.type === 'computed') {
    var display = (val === '' || val === undefined) ? '—' : String(val);
    var bg = '#f3f4f6', fg = '#374151';
    if (display === 'Satisfaisant' || display === 'Conforme') { bg = '#dcfce7'; fg = '#166534'; }
    else if (display === 'Non Satisfaisant' || display === 'Non Conforme') { bg = '#fee2e2'; fg = '#991b1b'; }
    else if (display === 'Impossible de se prononcer') { bg = '#fef3c7'; fg = '#92400e'; }
    return '<div style="padding:10px 12px;border-radius:8px;background:' + bg + ';color:' + fg + ';font-weight:600;font-size:14px;">' + escapeHtml(display) + '</div>';
  }
  if (f.type === 'grid') {
    var cols = Math.min(parseInt(inst.data[f.colsKey], 10) || 0, 5);
    var rows = Math.min(parseInt(inst.data[f.rowsKey], 10) || 0, 5);
    if (!cols || !rows) return '<div class="subtitle">Renseignez d\u2019abord le nombre de points (largeur et hauteur).</div>';
    var grid = Array.isArray(val) ? val : [];
    var h = '<div style="overflow-x:auto;"><table style="border-collapse:collapse;">';
    for (var r = 0; r < rows; r++) {
      h += '<tr>';
      for (var c = 0; c < cols; c++) {
        var cell = (grid[r] && grid[r][c] !== undefined) ? grid[r][c] : '';
        h += '<td style="padding:2px;"><input type="text" inputmode="decimal" value="' + escapeHtml(cell) + '" ' +
          'style="width:58px;padding:8px 4px;text-align:center;border:1px solid #d1d5db;border-radius:6px;font-size:14px;" ' +
          'onchange="updateGridCell(\'' + typeId + '\',\'' + f.key + '\',' + r + ',' + c + ',this.value);">' + '</td>';
      }
      h += '</tr>';
    }
    h += '</table></div>';
    return h;
  }
  if (f.type === 'charger-list') {
    var chargers = Array.isArray(val) ? val : [];
    var h = '<div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;font-size:13px;">';
    h += '<tr style="background:#eef2f7;"><th style="padding:6px;">Nb</th><th style="padding:6px;">Tension (V)</th><th style="padding:6px;">Courant (A)</th><th style="padding:6px;">Débit (m³/h)</th><th></th></tr>';
    chargers.forEach(function (c, i) {
      var deb = chargerDebit(c);
      h += '<tr>' +
        '<td style="padding:2px;"><input type="number" value="' + escapeHtml(c.nb || '') + '" style="width:50px;padding:6px;border:1px solid #d1d5db;border-radius:6px;" onchange="updateCharger(\'' + typeId + '\',' + i + ',\'nb\',this.value);"></td>' +
        '<td style="padding:2px;"><input type="number" value="' + escapeHtml(c.tension || '') + '" style="width:70px;padding:6px;border:1px solid #d1d5db;border-radius:6px;" onchange="updateCharger(\'' + typeId + '\',' + i + ',\'tension\',this.value);"></td>' +
        '<td style="padding:2px;"><input type="number" value="' + escapeHtml(c.courant || '') + '" style="width:70px;padding:6px;border:1px solid #d1d5db;border-radius:6px;" onchange="updateCharger(\'' + typeId + '\',' + i + ',\'courant\',this.value);"></td>' +
        '<td style="padding:6px;text-align:center;font-weight:600;">' + (deb === '' ? '—' : deb) + '</td>' +
        '<td style="padding:2px;"><button class="agent-delete" onclick="removeCharger(\'' + typeId + '\',' + i + ');">' + ICONS.trash + '</button></td>' +
        '</tr>';
    });
    h += '</table></div>';
    h += '<button class="btn btn-gray btn-small mt-8" onclick="addCharger(\'' + typeId + '\');">' + ICONS.plus + ' Ajouter un chargeur</button>';
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

function addCharger(typeId) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  if (!Array.isArray(inst.data.chargeurs)) inst.data.chargeurs = [];
  inst.data.chargeurs.push({ nb: '', tension: '', courant: '' });
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  render();
}

function updateCharger(typeId, idx, field, value) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  if (!inst.data.chargeurs[idx]) return;
  inst.data.chargeurs[idx][field] = value;
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  render();
}

function removeCharger(typeId, idx) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  inst.data.chargeurs.splice(idx, 1);
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  render();
}

function updateGridCell(typeId, key, r, c, value) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  var grid = Array.isArray(inst.data[key]) ? inst.data[key] : [];
  if (!grid[r]) grid[r] = [];
  grid[r][c] = value.trim();
  inst.data[key] = grid;
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
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  if (state.view === 'installation-form') render();
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
