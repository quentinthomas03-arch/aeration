// wizard-sanitaires.js - Écran de saisie sanitaires en étapes courtes (mobile-first)
// Premier type du chantier "ergonomie de saisie terrain" (2026-08) : valide le pattern
// (étapes sans scroll, gros inputs tap-friendly, avis calculé en direct) avant généralisation
// aux 17 autres types. Réutilise le moteur générique (updateInstallationField, applyCalculations,
// persistMissions, evalShowIf) — seule la présentation change, aucun impact sur le calcul/la sauvegarde.

var SANITAIRES_STEP_LABELS = ['Identification', 'Équipements', 'Extraction & bouches', 'Constat'];

// Mémorise quelle installation (par id stable, pas par index — l'index peut être réutilisé d'une
// mission à l'autre) a déjà servi à initialiser state.currentStep depuis inst.data._step, pour
// reprendre à la bonne étape en cas de retour, sans réinitialiser à chaque re-render interne.
var _sanitairesLoadedInstKey = null;

function sanitairesFieldDef(key) {
  var t = getInstallationType('sanitaires');
  return t.fields.find(function (f) { return f.key === key; });
}

function sanField(key, value) {
  updateInstallationField('sanitaires', key, value);
}

// _step (préfixe "_" = méta-donnée d'UI, jamais un champ de rapport, cf. site-overview.js) permet
// à l'écran de vue d'ensemble d'afficher "En cours · Étape X sur 4" et de reprendre au bon endroit.
function sanitairesPersistStep(step) {
  var m = getCurrentMission();
  var inst = m && m.installations.sanitaires[state.currentInstIndex];
  if (!inst) return;
  inst.data._step = step;
  persistMissions();
}

function sanitairesPrevStep() {
  if (state.currentStep > 0) { state.currentStep--; sanitairesPersistStep(state.currentStep); render(); return; }
  state.currentStep = 0;
  state.view = 'type-list';
  render();
}

function sanitairesNextStep() {
  if (state.currentStep < SANITAIRES_STEP_LABELS.length - 1) { state.currentStep++; sanitairesPersistStep(state.currentStep); render(); return; }
  state.currentStep = 0;
  state.view = 'type-list';
  render();
  scheduleAutoBackup();
}

function renderSanitairesWizard(m, t, inst) {
  var instKey = 'sanitaires:' + inst.id;
  if (_sanitairesLoadedInstKey !== instKey) {
    state.currentStep = (typeof inst.data._step === 'number') ? inst.data._step : 0;
    _sanitairesLoadedInstKey = instKey;
  }
  var step = state.currentStep;

  var h = '<div class="wizard-header-row"><button class="back-btn" onclick="state.view=\'type-list\';state.currentStep=0;render();">' +
    ICONS.arrowLeft + ' ' + escapeHtml(t.label) + '</button>' + duplicateButtonHtml(t.id, state.currentInstIndex) + '</div>';

  h += '<div class="wizard-progress">';
  SANITAIRES_STEP_LABELS.forEach(function (_, i) {
    h += '<div class="wizard-progress-seg' + (i <= step ? ' filled' : '') + '"></div>';
  });
  h += '</div>';

  h += '<div class="wizard-step-header"><div class="step-count">Étape ' + (step + 1) + ' / ' +
    SANITAIRES_STEP_LABELS.length + '</div><h2>' + getIcon(t.icon) + ' ' +
    escapeHtml(SANITAIRES_STEP_LABELS[step]) + '</h2></div>';

  h += '<div class="card">';
  if (step === 0) h += renderSanStep1(inst);
  else if (step === 1) h += renderSanStep2(inst);
  else if (step === 2) h += renderSanStep3(inst);
  else h += renderSanStep4(inst);
  h += '</div>';

  h += '<div class="wizard-nav row">';
  h += '<button class="btn btn-gray" onclick="sanitairesPrevStep();">' + ICONS.arrowLeft + ' ' +
    (step === 0 ? 'Retour' : 'Précédent') + '</button>';
  if (step < SANITAIRES_STEP_LABELS.length - 1) {
    h += '<button class="btn btn-primary" onclick="sanitairesNextStep();">Suivant ' + ICONS.arrowRight + '</button>';
  } else {
    h += '<button class="btn btn-primary" onclick="sanitairesNextStep();">' +
      ICONS.check + ' Terminé</button>';
  }
  h += '</div>';

  return h;
}

// === Composants de champ tap-friendly ===

function sanBigText(f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var state = fieldState(f, inst);
  return '<div class="field-big">' + fieldLabelWithTag(f, state) +
    '<input type="text" class="input-text-big state-' + state + '" value="' + escapeHtml(val) +
    '" onchange="sanField(\'' + f.key + '\',this.value);">' + fieldHint(state) + '</div>';
}

function sanBigNumber(f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var state = fieldState(f, inst);
  return '<div class="field-big">' + fieldLabelWithTag(f, state) +
    '<input type="text" inputmode="decimal" class="input-big state-' + state + '" value="' + escapeHtml(val) +
    '" onchange="sanField(\'' + f.key + '\',this.value);">' + fieldHint(state) + '</div>';
}

// Boutons larges (2 colonnes max) pour les select à choix restreint (Oui/Non, Individuel/Collectif,
// état des bouches...) — remplace le <select> natif pour la saisie au pouce sur tablette/mobile.
function sanChoiceButtons(f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var state = fieldState(f, inst);
  var h = '<div class="field-big">' + fieldLabelWithTag(f, state) + '<div class="choice-grid state-' + state + '">';
  f.options.forEach(function (opt) {
    var jsSafeOpt = String(opt).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    h += '<button type="button" class="choice-btn' + (val === opt ? ' selected' : '') + '" onclick="sanField(\'' +
      f.key + '\',\'' + jsSafeOpt + '\');">' + escapeHtml(opt) + '</button>';
  });
  h += '</div>' + fieldHint(state) + '</div>';
  return h;
}

// nom_usage a 13 options : trop nombreuses pour des boutons tap-friendly sans scroll, reste un
// <select> natif (agrandi) plutôt qu'une grille de boutons.
function sanNativeSelect(f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var state = fieldState(f, inst);
  var h = '<div class="field-big">' + fieldLabelWithTag(f, state) +
    '<select class="input-text-big state-' + state + '" onchange="sanField(\'' + f.key + '\',this.value);">';
  h += '<option value=""' + (val === '' ? ' selected' : '') + '>—</option>';
  f.options.forEach(function (opt) {
    h += '<option value="' + escapeHtml(opt) + '"' + (val === opt ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>';
  });
  h += '</select>' + fieldHint(state) + '</div>';
  return h;
}

function sanTextarea(f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var state = fieldState(f, inst);
  return '<div class="field-big">' + fieldLabelWithTag(f, state) +
    '<textarea class="input state-' + state + '" rows="4" onchange="sanField(\'' + f.key + '\',this.value);">' + escapeHtml(val) +
    '</textarea>' + fieldHint(state) + '</div>';
}

function sanComputedBadge(label, display) {
  var text = (display === '' || display === undefined) ? '—' : String(display);
  return '<div class="field-big">' + computedLabelWithTag(label) +
    '<div class="status-badge ' + statusClass(display) + '">' + escapeHtml(text) + '</div></div>';
}

// === Étapes ===

function renderSanStep1(inst) {
  var h = '';
  h += sanBigText(sanitairesFieldDef('batiment'), inst);
  h += sanBigText(sanitairesFieldDef('repere'), inst);
  h += sanNativeSelect(sanitairesFieldDef('nom_usage'), inst);
  h += sanChoiceButtons(sanitairesFieldDef('chambre_erp_individuelle'), inst);
  return h;
}

function renderSanStep2(inst) {
  var h = '';
  // Exception documentée (validée avec Quentin) : chambre individuelle en ERP a un débit
  // réglementaire forfaitaire (15 m³/h, cf. debitMinSanitaires dans calculations.js), indépendant
  // du nombre d'équipements — les compteurs WC/douches/lavabos n'ont pas de sens dans ce cas.
  // L'étape reste affichée (avec juste Individuel/Collectif) plutôt que sautée, à la différence du
  // mécanisme générique "étape entièrement vide = sautée" prévu pour les 17 autres types : ici il
  // reste un champ pertinent à saisir.
  var isChambreErp = inst.data.chambre_erp_individuelle === 'Oui';
  if (isChambreErp) {
    h += '<p class="subtitle" style="margin-bottom:14px;text-align:center;">Chambre individuelle en ERP : ' +
      'débit réglementaire forfaitaire (15 m³/h), les compteurs d’équipements ne s’appliquent pas.</p>';
  } else {
    h += sanBigNumber(sanitairesFieldDef('wc_urinoirs'), inst);
    h += sanBigNumber(sanitairesFieldDef('douches'), inst);
    h += sanBigNumber(sanitairesFieldDef('lavabos'), inst);
  }
  h += sanChoiceButtons(sanitairesFieldDef('individuel_collectif'), inst);
  return h;
}

function renderSanStep3(inst) {
  var h = '';
  h += sanBigNumber(sanitairesFieldDef('debit_mesure'), inst);
  if (inst.data.type_ventilation) {
    h += sanComputedBadge('Type de ventilation (constat)', inst.data.type_ventilation);
  }
  h += sanBigNumber(sanitairesFieldDef('nombre_bouches'), inst);
  h += sanChoiceButtons(sanitairesFieldDef('etat_bouches'), inst);
  // Feedback en direct dès que l'avis est calculable, sans attendre l'étape Constat.
  if (inst.data.avis) {
    h += sanComputedBadge('Avis (aperçu)', inst.data.avis);
  }
  return h;
}

function renderSanStep4(inst) {
  var h = '';
  if (inst.data.debit_min_reglementaire !== undefined && inst.data.debit_min_reglementaire !== '') {
    h += '<p class="subtitle" style="text-align:center;margin-bottom:10px;">Débit minimal réglementaire : ' +
      escapeHtml(inst.data.debit_min_reglementaire) + ' m³/h</p>';
  }
  h += sanComputedBadge('Avis par rapport aux valeurs réglementaires', inst.data.avis);
  h += sanTextarea(sanitairesFieldDef('observation'), inst);
  return h;
}

console.log('✓ Assistant sanitaires chargé');
