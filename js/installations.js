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
  h += '<button class="btn btn-gray btn-small" onclick="shareOrExportMission(' + m.id + ');">' + ICONS.download + ' Exporter / Transférer</button>';
  h += '</div>';

  // Chantier "ergonomie de saisie terrain" (2026-08) : la liste à plat "un type = une ligne avec
  // compteur" est remplacée par l'écran de vue d'ensemble (compteurs, groupage bâtiment/type,
  // statut par installation) — voir js/site-overview.js. Le reste de cet écran (infos mission,
  // exports) est inchangé.
  h += renderSiteOverview(m);
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
    h += '<div class="nav-item" onclick="state.currentInstIndex=' + idx + ';state.currentStep=0;state.view=\'installation-form\';render();">';
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
  state.currentStep = 0;
  state.view = 'installation-form';
  render();
}

// Annuler la dernière action (chantier "sécurité de saisie terrain") : un seul niveau, en mémoire
// (state.undoToast n'est jamais persisté) — juste le temps d'une fausse manip évidente, pas un
// historique. scheduleUndo() écrase silencieusement toute annulation en attente : planifier une
// 2e action pendant que le bandeau de la 1re est encore affiché rend la 1re définitive (comportement
// voulu, cf. consigne "annuler seulement la toute dernière action").
var UNDO_TOAST_DURATION_MS = 6000;
var _undoTimeoutId = null;

function scheduleUndo(message, restoreFn) {
  if (_undoTimeoutId) clearTimeout(_undoTimeoutId);
  state.undoToast = { message: message, restore: restoreFn };
  _undoTimeoutId = setTimeout(function () {
    state.undoToast = null;
    _undoTimeoutId = null;
    renderUndoToastRoot();
  }, UNDO_TOAST_DURATION_MS);
  renderUndoToastRoot();
}

function performUndo() {
  if (!state.undoToast) return;
  if (_undoTimeoutId) { clearTimeout(_undoTimeoutId); _undoTimeoutId = null; }
  var restore = state.undoToast.restore;
  state.undoToast = null;
  if (typeof restore === 'function') restore();
  render();
}

// Rendu à part de #app (pas au fil de render()) : #app rejoue une animation CSS avec transform à
// chaque rendu (fadeSlideIn, main.css), ce qui en ferait un containing block pour un bandeau
// position:fixed pendant l'animation et le décalerait du bas d'écran réel vers le bas du contenu.
function renderUndoToastRoot() {
  var el = document.getElementById('undo-toast-root');
  if (!el) return;
  el.innerHTML = state.undoToast
    ? '<div class="undo-toast"><span>' + escapeHtml(state.undoToast.message) + '</span>' +
      '<button type="button" class="undo-toast-btn" onclick="performUndo();">Annuler</button></div>'
    : '';
}

// Bouton "Dupliquer" de l'écran de détail (chantier "duplication rapide") — même action que la
// ligne de la vue d'ensemble (js/site-overview.js), partagée par les 3 rendus d'écran de saisie
// (wizard générique, wizard sanitaires dédié, rendu à plat de repli).
function duplicateButtonHtml(typeId, idx) {
  return '<button type="button" class="btn btn-gray btn-small" title="Dupliquer cette installation" ' +
    'onclick="duplicateInstallation(\'' + typeId + '\',' + idx + ');">' + ICONS.copy + ' Dupliquer</button>';
}

// Duplication rapide (chantier "forte volumétrie") : reprend les champs de configuration de la
// source (js/state.js buildInstallationDataForDuplicate) mais jamais ses mesures/constats — la
// nouvelle installation est donc toujours "À faire"/"En cours", jamais "Terminé" même si la source
// l'était, puisqu'aucun champ d'avis/conclusion n'est recopié. Nom repris + " (copie)" sur le même
// champ texte "distinctif" qu'utilise déjà l'écran de vue d'ensemble (overviewRowTitle) — insérée
// juste après la source et ouverte immédiatement pour que le technicien édite ce nom sans avoir à le
// chercher.
function duplicateInstallation(typeId, idx) {
  var m = getCurrentMission();
  var t = getInstallationType(typeId);
  var list = m && m.installations[typeId];
  if (!m || !t || !list || !list[idx]) return;

  var data = buildInstallationDataForDuplicate(typeId, list[idx].data || {});
  var nameField = t.fields.find(function (f) { return f.type === 'text' && f.key !== 'batiment'; });
  if (nameField) {
    var base = data[nameField.key] || '';
    data[nameField.key] = (base ? base + ' ' : '') + '(copie)';
  }

  var newInst = { id: generateId(), data: data };
  if (typeof applyCalculations === 'function') applyCalculations(typeId, newInst);
  list.splice(idx + 1, 0, newInst);
  persistMissions();

  var missionId = m.id;
  scheduleUndo('Installation dupliquée.', function () {
    var mm = state.missions.find(function (x) { return x.id === missionId; });
    if (!mm || !mm.installations[typeId]) return;
    var pos = mm.installations[typeId].findIndex(function (x) { return x.id === newInst.id; });
    if (pos !== -1) mm.installations[typeId].splice(pos, 1);
    persistMissions();
  });

  state.currentTypeId = typeId;
  state.currentInstIndex = idx + 1;
  state.currentStep = 0;
  state.view = 'installation-form';
  render();
}

function deleteInstallation(typeId, idx) {
  if (!confirm('Supprimer cette installation ?')) return;
  var m = getCurrentMission();
  var list = m.installations[typeId];
  var removed = list[idx];
  list.splice(idx, 1);
  persistMissions();

  var missionId = m.id;
  scheduleUndo('Installation supprimée.', function () {
    var mm = state.missions.find(function (x) { return x.id === missionId; });
    if (!mm || !mm.installations[typeId]) return;
    mm.installations[typeId].splice(idx, 0, removed);
    persistMissions();
  });

  render();
}

function renderInstallationForm() {
  var m = getCurrentMission();
  var t = getInstallationType(state.currentTypeId);
  if (!m || !t) { state.view = 'home'; render(); return ''; }
  var inst = m.installations[t.id][state.currentInstIndex];
  if (!inst) { state.view = 'type-list'; render(); return ''; }

  // Chantier "ergonomie de saisie terrain" (2026-08) : sanitaires garde son wizard dédié (premier
  // jet validé sur le terrain avant généralisation) ; les autres types passent au fur et à mesure
  // sur le moteur générique (js/wizard-engine.js) dès qu'ils ont une entrée dans WIZARD_STEPS
  // (js/wizard-steps.js). Le rendu à plat ci-dessous reste le repli pour les types pas encore migrés.
  if (t.id === 'sanitaires' && typeof renderSanitairesWizard === 'function') {
    return renderSanitairesWizard(m, t, inst);
  }
  if (typeof WIZARD_STEPS !== 'undefined' && WIZARD_STEPS[t.id] && typeof renderGenericWizard === 'function') {
    return renderGenericWizard(m, t, inst);
  }

  var h = '<div class="wizard-header-row"><button class="back-btn" onclick="state.view=\'type-list\';render();">' +
    ICONS.arrowLeft + ' ' + escapeHtml(t.label) + '</button>' + duplicateButtonHtml(t.id, state.currentInstIndex) + '</div>';
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

  h += '<button class="btn btn-primary" onclick="state.view=\'type-list\';render();scheduleAutoBackup();">' + ICONS.check + ' Terminé</button>';
  return h;
}

// Palette de statut unifiée (voir tokens --status-* dans main.css), utilisée par le rendu
// générique ci-dessous ET par les écrans de saisie en étapes (ex: renderSanitairesWizard).
function statusClass(display) {
  if (display === 'Satisfaisant' || display === 'Conforme') return 'status-ok';
  if (display === 'Non Satisfaisant' || display === 'Non Conforme') return 'status-bad';
  if (display === 'Impossible de se prononcer') return 'status-warn';
  return 'status-muted';
}

// Distinction visuelle à 4 états pour les écrans de saisie en étapes (voir .field-tag/.field-hint/
// .state-* dans main.css) : calculé auto / optionnel+vide / obligatoire+vide / obligatoire+rempli.
// "optionnel+rempli" n'a pas d'état dédié (style neutre par défaut).
//
// Par défaut TOUT champ non calculé est traité "obligatoire" (à saisir/renseigné) : la plupart des
// champs du schéma finissent dans le rapport Word même s'ils n'entrent dans aucun calcul (ex.
// nombre_bouches, état des bouches) — les marquer "optionnel" sur ce seul critère ferait courir le
// risque qu'un technicien les laisse vides en pensant qu'ils n'ont pas d'importance, et que le
// rapport livré ait des trous. Seuls les champs déjà explicitement optionnels au schéma
// (`optional: true`, ex. date_installation) basculent dans l'état "optionnel".
function fieldEmptyValue(val) {
  if (Array.isArray(val)) return val.length === 0;
  return val === undefined || val === null || val === '';
}

function fieldState(f, inst) {
  if (f.type === 'computed') return 'computed';
  var empty = fieldEmptyValue(inst.data[f.key]);
  if (f.optional) return empty ? 'optional-empty' : 'optional-filled';
  return empty ? 'required-empty' : 'required-filled';
}

function fieldLabelWithTag(f, state) {
  var tag = (state === 'optional-empty' || state === 'optional-filled')
    ? '<span class="field-tag field-tag-optional">optionnel</span>' : '';
  return '<label class="label">' + escapeHtml(f.label) + tag + '</label>';
}

function computedLabelWithTag(label) {
  return '<label class="label"><span class="field-computed-icon">' + ICONS.zap + '</span>' +
    escapeHtml(label) + '<span class="field-tag field-tag-auto">calculé</span></label>';
}

function fieldHint(state) {
  if (state === 'required-empty') return '<div class="field-hint field-hint-required">À saisir</div>';
  if (state === 'required-filled') return '<div class="field-hint field-hint-done">' + ICONS.check + ' Renseigné</div>';
  return '';
}

function evalShowIf(cond, data) {
  // ⚠️ BUG CORRIGÉ (2026-08) : le combinateur `and: [...]` (utilisé par buildBoxCaptageFields pour
  // combiner "nombre_captage sélectionné" + une condition propre au captage, ex. forme rectangulaire
  // ou mode de vitesse) n'était pas géré ici — faute de correspondance avec contains/in/equals, la
  // fonction retombait sur `return true` par défaut. Résultat, dans box_peinture : captageN_cote2 et
  // les 4 champs liés au mode de vitesse (vitesse_nb_axes/nb_points/grid/directe) restaient TOUJOURS
  // affichés quel que soit nombre_captage ou le mode choisi, dans le rendu à plat existant comme
  // dans le nouveau wizard. Protection dossiers existants : aucune formule de calcul (calculations.js)
  // ne dépend de la visibilité d'un champ — surfaceSection()/etc. branchent directement sur
  // forme_conduit/vitesse_mode — donc aucun avis recalculé ni donnée supprimée ; seuls les champs
  // now correctement masqués cessent d'apparaître à l'écran.
  if (cond.and) return cond.and.every(function (c) { return evalShowIf(c, data); });
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
      // Échapper d'abord pour un littéral JS (', \), puis pour l'attribut HTML — dans cet ordre,
      // sinon le navigateur décode les entités HTML avant que le JS ne s'exécute et l'échappement
      // de quote perd son effet.
      var jsSafeOpt = String(opt).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      h += '<label style="display:flex;align-items:center;gap:6px;font-size:13px;">' +
        '<input type="checkbox"' + (checked ? ' checked' : '') +
        ' onchange="toggleInstallationCheckbox(\'' + typeId + '\',\'' + f.key + '\',\'' + escapeHtml(jsSafeOpt) + '\',this.checked);">' +
        escapeHtml(opt) + '</label>';
    });
    h += '</div>';
    return h;
  }
  if (f.type === 'computed') {
    var display = (val === '' || val === undefined) ? '—' : String(val);
    return '<div class="status-badge ' + statusClass(val) + '">' + escapeHtml(display) + '</div>';
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
    var photos = Array.isArray(val) ? val : [];
    var h = '<div class="photo-gallery">';
    photos.forEach(function (p) {
      h += '<div class="photo-thumb">' +
        '<img data-photo-src="' + escapeHtml(p.id) + '" alt="Photo" onclick="openPhotoViewer(\'' + escapeHtml(p.id) + '\');">' +
        '<button type="button" class="agent-delete" title="Supprimer cette photo" ' +
          'onclick="event.stopPropagation();removeInstallationPhoto(\'' + typeId + '\',\'' + f.key + '\',\'' + escapeHtml(p.id) + '\');">' +
          ICONS.trash + '</button></div>';
    });
    if (photos.length < PHOTO_MAX_PER_INSTALLATION) {
      h += '<label class="photo-add-btn">' + ICONS.plus +
        '<input type="file" accept="image/*" capture="environment" ' +
        'onchange="handleInstallationPhoto(\'' + typeId + '\',\'' + f.key + '\',this);"></label>';
    }
    h += '</div>';
    return h;
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

// ⚠️ BUG CORRIGÉ : avant ce chantier, ce handler stockait la photo brute non compressée en base64
// directement dans inst.data.photo (readAsDataURL, aucun redimensionnement) — donc dans le JSON de
// mission persisté en localStorage à chaque saisie. Une seule photo de smartphone (3-8 Mo bruts)
// pouvait suffire à approcher les quotas localStorage habituels (5-10 Mo) et menacer de perdre des
// données de saisie d'autres installations. Remplacé par une compression côté client (canvas, cf.
// js/photos.js compressImageFile) puis un stockage IndexedDB — seule une référence légère {id} reste
// dans les données de mission. Protection dossiers existants : migration automatique au chargement,
// voir js/photos.js migrateLegacyPhotos.
function handleInstallationPhoto(typeId, key, input) {
  var file = input.files[0];
  input.value = '';
  if (!file) return;
  compressImageFile(file).then(function (blob) {
    var id = generatePhotoId();
    return savePhotoBlob(id, blob).then(function () { return id; });
  }).then(function (id) {
    var m = getCurrentMission();
    var inst = m.installations[typeId][state.currentInstIndex];
    var photos = Array.isArray(inst.data[key]) ? inst.data[key] : [];
    inst.data[key] = photos.concat([{ id: id }]).slice(0, PHOTO_MAX_PER_INSTALLATION);
    persistMissions();
    render();
  }).catch(function (err) {
    alert('Erreur lors de l’ajout de la photo :\n\n' + err.message);
  });
}

function removeInstallationPhoto(typeId, key, photoId) {
  if (!confirm('Supprimer cette photo ?')) return;
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  var photos = Array.isArray(inst.data[key]) ? inst.data[key] : [];
  inst.data[key] = photos.filter(function (p) { return p.id !== photoId; });
  persistMissions();
  deletePhotoBlob(photoId); // suppression explicite d'une photo précise : pas d'annulation possible
  // (chantier "Annuler la dernière action" volontairement limité à suppression/duplication
  // d'installation), le fil de confirmation ci-dessus est le seul garde-fou, comme pour
  // deleteInstallation.
  if (_photoObjectUrlCache[photoId]) { URL.revokeObjectURL(_photoObjectUrlCache[photoId]); delete _photoObjectUrlCache[photoId]; }
  render();
}

console.log('✓ Moteur installations chargé');
