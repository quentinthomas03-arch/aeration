// wizard-engine.js - Moteur générique d'écran de saisie en étapes, pour les 17 types autres que
// sanitaires (qui garde son wizard dédié js/wizard-sanitaires.js, premier jet validé sur le terrain
// avant généralisation). Un type y accède dès qu'il a une entrée dans WIZARD_STEPS
// (js/wizard-steps.js) ; sinon il reste sur le rendu à plat existant (renderInstallationForm).
//
// Réutilise entièrement le moteur de données existant (updateInstallationField, applyCalculations,
// persistMissions, evalShowIf, statusClass) ainsi que les helpers d'état à 4 champs partagés avec le
// wizard sanitaires (fieldState/fieldLabelWithTag/fieldHint/computedLabelWithTag, définis dans
// installations.js) — seule la présentation/navigation change, aucun impact sur le calcul ou le
// format de sauvegarde.

var _gwLoadedInstKey = null;

function gwFieldDef(typeId, key) {
  var t = getInstallationType(typeId);
  return t.fields.find(function (f) { return f.key === key; });
}

function gwField(typeId, key, value) {
  updateInstallationField(typeId, key, value);
}

function gwToggleMulti(typeId, key, option) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  var current = Array.isArray(inst.data[key]) ? inst.data[key] : [];
  var idx = current.indexOf(option);
  if (idx === -1) current.push(option); else current.splice(idx, 1);
  inst.data[key] = current;
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  render();
}

// === Composants de champ tap-friendly (mêmes gabarits que le wizard sanitaires) ===

function gwBigText(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var st = fieldState(f, inst);
  return '<div class="field-big">' + fieldLabelWithTag(f, st) +
    '<input type="text" class="input-text-big state-' + st + '" value="' + escapeHtml(val) +
    '" onchange="gwField(\'' + typeId + '\',\'' + f.key + '\',this.value);">' + fieldHint(st) + '</div>';
}

function gwBigNumber(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var st = fieldState(f, inst);
  return '<div class="field-big">' + fieldLabelWithTag(f, st) +
    '<input type="text" inputmode="decimal" class="input-big state-' + st + '" value="' + escapeHtml(val) +
    '" onchange="gwField(\'' + typeId + '\',\'' + f.key + '\',this.value);">' + fieldHint(st) + '</div>';
}

// Boutons larges (2 colonnes max) : select/toggle à choix restreint (≤4 options).
function gwChoiceButtons(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var st = fieldState(f, inst);
  var h = '<div class="field-big">' + fieldLabelWithTag(f, st) + '<div class="choice-grid state-' + st + '">';
  f.options.forEach(function (opt) {
    var jsSafeOpt = String(opt).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    h += '<button type="button" class="choice-btn' + (val === opt ? ' selected' : '') + '" onclick="gwField(\'' +
      typeId + '\',\'' + f.key + '\',\'' + jsSafeOpt + '\');">' + escapeHtml(opt) + '</button>';
  });
  h += '</div>' + fieldHint(st) + '</div>';
  return h;
}

// Variante multi-sélection des boutons larges (checkbox-group) : chaque bouton se coche/décoche
// indépendamment, valeur stockée en tableau (même format que l'ancien rendu à plat).
function gwChoiceButtonsMulti(typeId, f, inst) {
  var current = Array.isArray(inst.data[f.key]) ? inst.data[f.key] : [];
  var st = fieldState(f, inst);
  var h = '<div class="field-big">' + fieldLabelWithTag(f, st) + '<div class="choice-grid state-' + st + '">';
  f.options.forEach(function (opt) {
    var jsSafeOpt = String(opt).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var checked = current.indexOf(opt) !== -1;
    h += '<button type="button" class="choice-btn' + (checked ? ' selected' : '') + '" onclick="gwToggleMulti(\'' +
      typeId + '\',\'' + f.key + '\',\'' + jsSafeOpt + '\');">' + escapeHtml(opt) + '</button>';
  });
  h += '</div>' + fieldHint(st) + '</div>';
  return h;
}

// select à choix nombreux (>4 options) : reste un <select> natif agrandi, pas une grille de boutons.
function gwNativeSelect(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var st = fieldState(f, inst);
  var h = '<div class="field-big">' + fieldLabelWithTag(f, st) +
    '<select class="input-text-big state-' + st + '" onchange="gwField(\'' + typeId + '\',\'' + f.key + '\',this.value);">';
  h += '<option value=""' + (val === '' ? ' selected' : '') + '>—</option>';
  f.options.forEach(function (opt) {
    h += '<option value="' + escapeHtml(opt) + '"' + (val === opt ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>';
  });
  h += '</select>' + fieldHint(st) + '</div>';
  return h;
}

function gwTextarea(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var st = fieldState(f, inst);
  return '<div class="field-big">' + fieldLabelWithTag(f, st) +
    '<textarea class="input state-' + st + '" rows="4" onchange="gwField(\'' + typeId + '\',\'' + f.key + '\',this.value);">' +
    escapeHtml(val) + '</textarea>' + fieldHint(st) + '</div>';
}

// Rappel N-1 (js/installations-schema.js N1_COMPARISON_FIELDS) : petit texte sous le champ calculé
// "année en cours" des 4 types qui ont un mécanisme N-1 côté VBA, distinct du hint "Renseigné" des
// champs saisis (fieldHint) pour ne pas laisser croire que le technicien a lui-même déjà validé cette
// valeur cette année — elle vient de la mission source chargée via "Charger un site précédent".
function gwN1Hint(typeId, key, inst) {
  var pairs = N1_COMPARISON_FIELDS[typeId];
  if (!pairs) return '';
  var pair = pairs.filter(function (p) { return p.current === key; })[0];
  if (!pair) return '';
  var v = inst.data[pair.n1];
  if (v === undefined || v === '') return '';
  return '<div class="field-hint field-hint-n1">N-1 : ' + escapeHtml(v) + '</div>';
}

function gwComputedBadge(typeId, f, inst) {
  var display = inst.data[f.key];
  var text = (display === '' || display === undefined) ? '—' : String(display);
  return '<div class="field-big">' + computedLabelWithTag(f.label) +
    '<div class="status-badge ' + statusClass(display) + '">' + escapeHtml(text) + '</div>' +
    gwN1Hint(typeId, f.key, inst) + '</div>';
}

// Grille de points / liste de chargeurs / photo : pas encore repensés en tap-friendly (chantier
// séparé à venir) — on réutilise tel quel le rendu générique existant pour ces widgets.
function gwPassthrough(typeId, f, inst) {
  return '<div class="field-big"><label class="label">' + escapeHtml(f.label) + '</label>' +
    renderFieldInput(typeId, f, inst) + '</div>';
}

function gwRenderField(typeId, f, inst) {
  if (f.showIf && !evalShowIf(f.showIf, inst.data)) return '';
  switch (f.type) {
    case 'computed': return gwComputedBadge(typeId, f, inst);
    case 'text': return gwBigText(typeId, f, inst);
    case 'number': return gwBigNumber(typeId, f, inst);
    case 'textarea': return gwTextarea(typeId, f, inst);
    case 'checkbox-group': return gwChoiceButtonsMulti(typeId, f, inst);
    case 'select':
    case 'toggle':
      return (f.options && f.options.length <= 4) ? gwChoiceButtons(typeId, f, inst) : gwNativeSelect(typeId, f, inst);
    case 'grid':
      return f.pointEntry ? gwGridPointEntry(typeId, f, inst) : gwPassthrough(typeId, f, inst);
    case 'charger-list':
    case 'photo':
      return gwPassthrough(typeId, f, inst);
    default: return '';
  }
}

// === Étapes : visibilité, navigation, reprise ===

function gwStepFields(typeId, stepDef) {
  var t = getInstallationType(typeId);
  return stepDef.fields.map(function (k) { return t.fields.find(function (f) { return f.key === k; }); }).filter(Boolean);
}

function gwStepVisible(typeId, stepDef, inst) {
  return gwStepFields(typeId, stepDef).some(function (f) { return !f.showIf || evalShowIf(f.showIf, inst.data); });
}

function gwVisibleStepIndices(typeId, inst) {
  var steps = WIZARD_STEPS[typeId] || [];
  var out = [];
  steps.forEach(function (s, i) { if (gwStepVisible(typeId, s, inst)) out.push(i); });
  return out;
}

// Avance/recule jusqu'à la prochaine étape visible dans la direction donnée ; peut renvoyer un
// index hors bornes (-1 ou steps.length) pour signaler "plus d'étape dans cette direction".
function gwWalkToVisible(typeId, inst, fromIdx, dir) {
  var steps = WIZARD_STEPS[typeId] || [];
  var i = fromIdx;
  while (i >= 0 && i < steps.length && !gwStepVisible(typeId, steps[i], inst)) i += dir;
  return i;
}

function gwPersistStep(typeId, step) {
  var m = getCurrentMission();
  var inst = m && m.installations[typeId][state.currentInstIndex];
  if (!inst) return;
  inst.data._step = step;
  persistMissions();
}

function gwNextStep(typeId) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  var steps = WIZARD_STEPS[typeId] || [];
  var next = gwWalkToVisible(typeId, inst, state.currentStep + 1, 1);
  if (next < steps.length) { state.currentStep = next; gwPersistStep(typeId, next); render(); return; }
  state.currentStep = 0;
  state.view = 'type-list';
  render();
  scheduleAutoBackup();
}

function gwPrevStep(typeId) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  var prev = gwWalkToVisible(typeId, inst, state.currentStep - 1, -1);
  if (prev >= 0) { state.currentStep = prev; gwPersistStep(typeId, prev); render(); return; }
  state.currentStep = 0;
  state.view = 'type-list';
  render();
}

function renderGenericWizard(m, t, inst) {
  var steps = WIZARD_STEPS[t.id];
  if (!steps || !steps.length) return null;

  var instKey = t.id + ':' + inst.id;
  if (_gwLoadedInstKey !== instKey) {
    var saved = (typeof inst.data._step === 'number') ? inst.data._step : 0;
    if (saved < 0 || saved >= steps.length || !gwStepVisible(t.id, steps[saved], inst)) {
      var walked = gwWalkToVisible(t.id, inst, saved, 1);
      saved = (walked < steps.length) ? walked : gwWalkToVisible(t.id, inst, steps.length - 1, -1);
      if (saved < 0) saved = 0;
    }
    state.currentStep = saved;
    _gwLoadedInstKey = instKey;
  }
  var step = state.currentStep;
  var visibleIdx = gwVisibleStepIndices(t.id, inst);
  var posInVisible = visibleIdx.indexOf(step);
  if (posInVisible === -1) posInVisible = 0;

  var h = '<div class="wizard-header-row"><button class="back-btn" onclick="state.view=\'type-list\';state.currentStep=0;render();">' +
    ICONS.arrowLeft + ' ' + escapeHtml(t.label) + '</button>' + duplicateButtonHtml(t.id, state.currentInstIndex) + '</div>';

  h += '<div class="wizard-progress">';
  visibleIdx.forEach(function (_, i) {
    h += '<div class="wizard-progress-seg' + (i <= posInVisible ? ' filled' : '') + '"></div>';
  });
  h += '</div>';

  h += '<div class="wizard-step-header"><div class="step-count">Étape ' + (posInVisible + 1) + ' / ' +
    visibleIdx.length + '</div><h2>' + getIcon(t.icon) + ' ' + escapeHtml(steps[step].title) + '</h2></div>';

  h += '<div class="card">';
  gwStepFields(t.id, steps[step]).forEach(function (f) { h += gwRenderField(t.id, f, inst); });
  h += '</div>';

  h += '<div class="wizard-nav row">';
  h += '<button class="btn btn-gray" onclick="gwPrevStep(\'' + t.id + '\');">' + ICONS.arrowLeft + ' ' +
    (posInVisible === 0 ? 'Retour' : 'Précédent') + '</button>';
  if (posInVisible < visibleIdx.length - 1) {
    h += '<button class="btn btn-primary" onclick="gwNextStep(\'' + t.id + '\');">Suivant ' + ICONS.arrowRight + '</button>';
  } else {
    h += '<button class="btn btn-primary" onclick="state.view=\'type-list\';state.currentStep=0;render();">' +
      ICONS.check + ' Terminé</button>';
  }
  h += '</div>';

  return h;
}

console.log('✓ Moteur d\'assistant générique chargé');
