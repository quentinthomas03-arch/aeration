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
  var info = typeof ficheSaisie === 'function' ? ficheSaisie(typeId, key, value) : null; // valeur remplacée : « Annuler » (js/fiche-plus.js)
  updateInstallationField(typeId, key, value);
  if (info) ficheProposerAnnulation(typeId, key, info);
}

function gwToggleMulti(typeId, key, option) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  var current = Array.isArray(inst.data[key]) ? inst.data[key] : [];
  var idx = current.indexOf(option);
  if (idx === -1) current.push(option); else current.splice(idx, 1);
  inst.data[key] = current;
  touchInstallation(inst);
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  render();
}

// === Composants de champ tap-friendly (mêmes gabarits que le wizard sanitaires) ===

function gwBigText(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var st = fieldState(f, inst);
  var setter = function (v) { return 'gwField(\'' + typeId + '\',\'' + f.key + '\',' + v + ');'; };
  // Niveau : liste RDC, R+1… ; bâtiment : bâtiments déjà saisis proposés (js/grands-sites.js)
  if (f.key === 'niveau' && typeof gsNiveauSelectHtml === 'function') {
    return '<div class="field-big">' + fieldLabelWithTag(f, st) + gsNiveauSelectHtml(f, inst, setter) + fieldHint(st) + '</div>';
  }
  var suggestions = f.key === 'batiment' && typeof gsBatimentsSuggestionsHtml === 'function' ? gsBatimentsSuggestionsHtml(inst, setter) : '';
  var today = (isVisitDateField(f) && val !== todayFr())
    ? todayButtonHtml('gwField(\'' + typeId + '\',\'' + f.key + '\',todayFr());') : '';
  return '<div class="field-big">' + fieldLabelWithTag(f, st) +
    '<input type="text" class="input-text-big state-' + st + '" value="' + escapeHtml(val) +
    '"' + (isVisitDateField(f) ? ' inputmode="numeric" placeholder="jj/mm/aaaa"' : '') +
    ' onchange="gwField(\'' + typeId + '\',\'' + f.key + '\',this.value);">' + today + suggestions + fieldHint(st) +
    appareilsRepriseHtml(typeId, f, inst) + '</div>';
}

function gwBigNumber(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var st = fieldState(f, inst);
  var champ = '<input type="text" inputmode="decimal" class="input-big state-' + st + '" value="' + escapeHtml(val) +
    '" onchange="gwField(\'' + typeId + '\',\'' + f.key + '\',this.value);">';
  if (typeof ficheEstEntier === 'function' && ficheEstEntier(f)) champ = ficheStepper(typeId, f, champ); // − / + (js/fiche-plus.js)
  return '<div class="field-big">' + fieldLabelWithTag(f, st) + champ + fieldHint(st) +
    plausibilityHintHtml(typeId, f, val) + gwN1Hint(typeId, f.key, inst) +
    (typeof fieldAssistHtml === 'function' ? fieldAssistHtml(typeId, f, inst) : '') +
    (typeof aidesMesureHtml === 'function' ? aidesMesureHtml(typeId, f, inst) : '') + // bouches, tour du conduit (js/aides-mesure.js)
    (typeof omAideChampHtml === 'function' ? omAideChampHtml(typeId, f, inst) : '') + '</div>'; // Pitot, valeur recommandée des cabines, fumigène du décapage (js/ou-mesurer.js)
}

// Boutons larges (2 colonnes max) : select/toggle à choix restreint (≤4 options).
function gwChoiceButtons(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var st = fieldState(f, inst);
  var h = '<div class="field-big">' + fieldLabelWithTag(f, st) + '<div class="choice-grid state-' + st + '">';
  f.options.forEach(function (opt) {
    var jsSafeOpt = String(opt).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    h += '<button type="button" class="choice-btn' + (val === opt ? ' selected' : '') + '" onclick="gwField(\'' +
      typeId + '\',\'' + f.key + '\',\'' + jsSafeOpt + '\');">' + escapeHtml(opt) +
      (optionHint(f, opt) ? ' <span class="choice-hint">' + escapeHtml(optionHint(f, opt)) + '</span>' : '') + '</button>';
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
  h += selectOptionsHtml(f, val);
  h += '</select>' + fieldHint(st) + '</div>';
  return h;
}

function gwTextarea(typeId, f, inst) {
  var val = inst.data[f.key] !== undefined ? inst.data[f.key] : '';
  var st = fieldState(f, inst);
  return '<div class="field-big">' + fieldLabelWithTag(f, st) +
    '<textarea class="input state-' + st + '" rows="4" onchange="gwField(\'' + typeId + '\',\'' + f.key + '\',this.value);">' +
    escapeHtml(val) + '</textarea>' + fieldHint(st) +
    (typeof constatBoutonHtml === 'function' ? constatBoutonHtml(typeId, f, inst) : '') + // constat rédigé (js/constat.js)
    phrasesTypesHtml(typeId, f) +
    (typeof ficheCommentaireMultiHtml === 'function' ? ficheCommentaireMultiHtml(typeId, f, inst) : '') + '</div>'; // js/fiche-plus.js
}

// Rappel N-1 (js/installations-schema.js N1_COMPARISON_FIELDS) : petit texte sous le champ "mesure
// de cette année" (calculé ou saisi) des types qui ont un mécanisme N-1, distinct du hint "Renseigné"
// des champs saisis (fieldHint) pour ne pas laisser croire que le technicien a lui-même déjà validé
// cette valeur cette année — elle vient de la mission source chargée via "Charger un site précédent".
function gwN1Hint(typeId, key, inst) {
  var pairs = N1_COMPARISON_FIELDS[typeId];
  if (!pairs) return '';
  var pair = pairs.filter(function (p) { return p.current === key; })[0];
  if (!pair) return '';
  var v = inst.data[pair.n1];
  if (v === undefined || v === '') return '';
  v = frDisplay(v);
  // Écart avec la mesure de cette année (js/terrain-assist.js) : signalé en couleur au-delà du seuil,
  // pour revérifier sur place une faute de frappe ou une vraie dérive.
  var e = n1Ecart(inst.data[key], v);
  if (e && e.fort) {
    return '<div class="field-hint field-hint-n1 field-hint-n1-ecart">N-1 : ' + escapeHtml(v) + ' · écart ' +
      formatEcartPct(e.pct) + ' — vérifier la mesure</div>';
  }
  return '<div class="field-hint field-hint-n1">N-1 : ' + escapeHtml(v) + (e ? ' · écart ' + formatEcartPct(e.pct) : '') + '</div>';
}

function gwComputedBadge(typeId, f, inst) {
  var avisKey = typeof resolveAvisFieldKey === 'function' ? resolveAvisFieldKey(getInstallationType(typeId)) : null;
  return '<div class="field-big">' + computedLabelWithTag(f.label) + computedValueHtml(inst.data[f.key]) +
    gwN1Hint(typeId, f.key, inst) +
    (f.key === avisKey && typeof pourquoiAvisHtml === 'function' ? pourquoiAvisHtml(typeId, inst) : '') + '</div>'; // js/pourquoi-avis.js
}

// Grille de points / liste de chargeurs / photo : pas encore repensés en tap-friendly (chantier
// séparé à venir) — on réutilise tel quel le rendu générique existant pour ces widgets.
function gwPassthrough(typeId, f, inst) {
  return '<div class="field-big"><label class="label">' + escapeHtml(f.label) + '</label>' +
    renderFieldInput(typeId, f, inst) + '</div>';
}

// Objectif à atteindre, affiché au-dessus du champ de mesure (js/seuils.js)
function seuilAvant(typeId, f, inst) {
  return (typeof seuilObjectifHtml === 'function') ? seuilObjectifHtml(typeId, f, inst) : '';
}

function gwRenderField(typeId, f, inst) {
  if (f.showIf && !evalShowIf(f.showIf, inst.data)) return '';
  switch (f.type) {
    case 'computed': return gwComputedBadge(typeId, f, inst);
    case 'text': return gwBigText(typeId, f, inst);
    case 'number': return seuilAvant(typeId, f, inst) + gwBigNumber(typeId, f, inst);
    case 'textarea': return gwTextarea(typeId, f, inst);
    case 'checkbox-group': return gwChoiceButtonsMulti(typeId, f, inst);
    case 'select':
    case 'toggle':
      return (f.options && f.options.length <= 4) ? gwChoiceButtons(typeId, f, inst) : gwNativeSelect(typeId, f, inst);
    case 'grid':
      return seuilAvant(typeId, f, inst) + (f.pointEntry ? gwGridPointEntry(typeId, f, inst) : gwPassthrough(typeId, f, inst)) +
        (typeof grilleAberrantsHtml === 'function' ? grilleAberrantsHtml(typeId, f, inst) : '') + // point aberrant (js/mesures.js)
        (typeof positionsPointsHtml === 'function' ? positionsPointsHtml(typeId, f, inst) : '') + // positions des points (js/finitions.js)
        (typeof pitotAlerteHtml === 'function' ? pitotAlerteHtml(typeId, f, inst) : ''); // Pitot sous 4 m/s (js/ou-mesurer.js)
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
  var inst = m && m.installations[typeId][state.currentInstIndex];
  if (!inst) { state.view = 'type-list'; render(); return; }
  var steps = WIZARD_STEPS[typeId] || [];
  var next = gwWalkToVisible(typeId, inst, state.currentStep + 1, 1);
  if (next < steps.length) { state.currentStep = next; gwPersistStep(typeId, next); render(); return; }
  // Fin du parcours : persister l'étape 0 (pas seulement en mémoire) — sinon inst.data._step reste
  // sur la dernière étape visitée et rouvrir cette installation plus tard saute directement dessus
  // au lieu de repartir du début (bug trouvé lors de l'audit du 2026-09-18).
  finishInstallation(typeId, false);
}

// Sélecteur d'étape (ergonomie du 2026-09-19) : pour les types à beaucoup d'étapes (ex. CTA, 13
// étapes), naviguer uniquement via Suivant/Précédent impose de traverser tout le formulaire pour
// revenir corriger une valeur en étape 2 depuis l'étape 11. `stepIdx` est un index dans WIZARD_STEPS
// (pas dans la liste des étapes visibles) — toujours une étape réellement visible puisqu'il vient des
// options du <select> rempli par gwVisibleStepIndices.
function gwJumpToStep(typeId, stepIdx) {
  state.currentStep = parseInt(stepIdx, 10);
  gwPersistStep(typeId, state.currentStep);
  render();
}

function gwPrevStep(typeId) {
  var m = getCurrentMission();
  var inst = m && m.installations[typeId][state.currentInstIndex];
  if (!inst) { state.view = 'type-list'; render(); return; }
  var prev = gwWalkToVisible(typeId, inst, state.currentStep - 1, -1);
  if (prev >= 0) { state.currentStep = prev; gwPersistStep(typeId, prev); render(); return; }
  state.currentStep = 0;
  state.view = vueRetourFiche();
  render();
}

// Classe d'animation quand l'étape affichée change (vers l'avant ou l'arrière), pas à chaque saisie
function etapeAnimClasse(typeId, step) {
  var cle = typeId + ':' + state.currentInstIndex, prec = state._etapeVue;
  state._etapeVue = { cle: cle, step: step };
  if (!prec || prec.cle !== cle || prec.step === step) return '';
  return step > prec.step ? ' etape-avance' : ' etape-recule';
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

  var h = '<div class="wizard-header-row"><button class="back-btn" onclick="state.view=vueRetourFiche();state.currentStep=0;render();">' +
    ICONS.arrowLeft + ' ' + escapeHtml(libelleRetourFiche(t)) + '</button>' + duplicateButtonHtml(t.id, state.currentInstIndex) + '</div>';
  h += installationNomHtml(t, inst); // local / repère et bâtiment de la fiche ouverte
  if (typeof noteInstallationBandeauHtml === 'function') h += noteInstallationBandeauHtml(inst); // note de la visite (js/visite.js)
  if (typeof ncBandeauHtml === 'function') h += ncBandeauHtml(t.id, inst) + relectureBandeauHtml(inst); // non contrôlée, relecture (js/qualite.js)

  h += '<div class="wizard-progress">';
  visibleIdx.forEach(function (_, i) {
    h += '<div class="wizard-progress-seg' + (i <= posInVisible ? ' filled' : '') + '"></div>';
  });
  h += '</div>';

  h += '<div class="wizard-step-header"><div class="step-count">';
  // Sélecteur d'étape natif (<select>, ouvre le picker OS sur mobile — pas de composant custom à
  // rendre tap-friendly) : n'apparaît que s'il y a plus d'une étape à choisir, pour ne rien changer
  // aux types courts (sanitaires, box_peinture...). Ne liste que les étapes visibles (visibleIdx) —
  // sauter sur une étape masquée par showIf n'aurait aucun sens.
  if (visibleIdx.length > 1) {
    h += '<select class="wizard-step-jump" onchange="gwJumpToStep(\'' + t.id + '\',this.value);">';
    visibleIdx.forEach(function (idx, i) {
      h += '<option value="' + idx + '"' + (idx === step ? ' selected' : '') + '>' +
        (i + 1) + '/' + visibleIdx.length + ' — ' + escapeHtml(steps[idx].title) + '</option>';
    });
    h += '</select>';
  } else {
    h += 'Étape ' + (posInVisible + 1) + ' / ' + visibleIdx.length;
  }
  h += '</div><h2>' + getIcon(t.icon) + ' ' + escapeHtml(steps[step].title) + '</h2></div>';

  h += '<div class="card' + etapeAnimClasse(t.id, step) + '">';
  if (typeof conditionsMesureHtml === 'function') h += conditionsMesureHtml(t.id, steps, step, inst); // conditions de mesure (js/conditions-mesure.js)
  if (typeof ouMesurerHtml === 'function') h += ouMesurerHtml(t.id, steps, step, inst); // schéma « où et comment mesurer » (js/ou-mesurer.js)
  if (typeof repriseVoisineHtml === 'function') h += repriseVoisineHtml(t.id, steps, step, inst); // reprise d'une installation voisine (js/terrain-assist.js)
  gwStepFields(t.id, steps[step]).forEach(function (f) { h += gwRenderField(t.id, f, inst); });
  h += '</div>';

  h += '<div class="wizard-nav row">';
  h += '<button class="btn btn-gray" onclick="gwPrevStep(\'' + t.id + '\');">' + ICONS.arrowLeft + ' ' +
    (posInVisible === 0 ? 'Retour' : 'Précédent') + '</button>';
  if (posInVisible < visibleIdx.length - 1) {
    h += '<button class="btn btn-primary" onclick="gwNextStep(\'' + t.id + '\');">Suivant ' + ICONS.arrowRight + '</button>';
  } else {
    // Auparavant ce bouton revenait à la liste sans passer par la fin de parcours de gwNextStep :
    // la sauvegarde automatique n'était jamais déclenchée pour ces 17 types (constaté le 2026-10-03).
    h += finishButtonHtml(t.id);
  }
  h += '</div>';
  if (posInVisible === visibleIdx.length - 1) h += nextInstallationButtonHtml(t.id);
  h += liveVerdictBarHtml(t.id, inst);
  if (typeof histoCarteHtml === 'function') h += histoCarteHtml(t.id, inst); // historique (js/bilans.js)
  if (typeof bilanCtaCarteHtml === 'function') h += bilanCtaCarteHtml(t.id, inst); // bilan d'air neuf de la CTA
  if (typeof plaqueHtml === 'function') h += plaqueHtml(t.id, inst); // photo de la plaque (js/plaque.js)
  if (typeof plaqueDonneesHtml === 'function') h += plaqueDonneesHtml(t.id, inst); // débit nominal, facteur K (js/aides-mesure.js)
  if (typeof ncChampHtml === 'function') h += ncChampHtml(t.id, inst); // installation non contrôlée (js/qualite.js)
  if (typeof etiquetteFicheHtml === 'function') h += etiquetteFicheHtml(t.id, inst); // étiquette QR à l'unité (js/finitions.js)
  if (typeof noteInstallationChampHtml === 'function') h += noteInstallationChampHtml(t.id, inst); // note pour la prochaine visite

  return h;
}

console.log('✓ Moteur d\'assistant générique chargé');
