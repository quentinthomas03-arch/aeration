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
  // Valeur écrite par le calcul (0.87) affichée à la française (0,87), comme une saisie
  if (/^-?\d+\.\d+$/.test(String(val))) val = String(val).replace('.', ',');
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

// Rappel sous un champ (f.note(data) -> texte, ou { texte, alerte }) : ex. ce qu'implique la valeur de
// référence saisie pour l'avis (machines à bois, retour terrain du 2026-11-27)
function gwNoteChamp(f, inst) {
  if (typeof f.note !== 'function') return '';
  var n;
  try { n = f.note(inst.data); } catch (e) { return ''; }
  if (!n) return '';
  if (typeof n === 'string') n = { texte: n };
  return '<div class="field-hint field-note' + (n.alerte ? ' field-hint-warn' : '') + '">' + escapeHtml(n.texte) + '</div>';
}

function gwRenderField(typeId, f, inst) {
  if (f.showIf && !evalShowIf(f.showIf, inst.data)) return '';
  switch (f.type) {
    case 'computed': return gwComputedBadge(typeId, f, inst);
    case 'text': return gwBigText(typeId, f, inst) + gwNoteChamp(f, inst);
    case 'number': return seuilAvant(typeId, f, inst) + gwBigNumber(typeId, f, inst) + gwNoteChamp(f, inst);
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

// Sous-titres dans un écran (2026-11-27) : une entrée « #Titre » dans fields (js/wizard-steps.js) ouvre
// une rubrique, affichée seulement si l'un de ses champs l'est. Les écrans regroupés restent lisibles.
function gwEstRubrique(k) { return typeof k === 'string' && k.charAt(0) === '#'; }

function gwStepBodyHtml(typeId, stepDef, inst) {
  var t = getInstallationType(typeId), h = '', titre = null, bloc = '';
  var vider = function () {
    if (bloc) h += (titre ? '<div class="wizard-rubrique">' + escapeHtml(titre) + '</div>' : '') + bloc;
    bloc = '';
  };
  stepDef.fields.forEach(function (k) {
    if (gwEstRubrique(k)) { vider(); titre = k.slice(1); return; }
    var f = t.fields.find(function (x) { return x.key === k; });
    if (f) bloc += gwRenderField(typeId, f, inst);
  });
  vider();
  return h;
}

// Nom de la rubrique qui porte un champ : son sous-titre dans l'écran, sinon le titre de l'écran
// (sert à nommer un critère ou une mesure au libellé trop vague : « Avis », « Valeur mesurée »)
function gwChampRubrique(typeId, key) {
  var steps = (typeof WIZARD_STEPS !== 'undefined' && WIZARD_STEPS[typeId]) || [];
  for (var i = 0; i < steps.length; i++) {
    var j = steps[i].fields.indexOf(key);
    if (j === -1) continue;
    for (var k = j - 1; k >= 0; k--) if (gwEstRubrique(steps[i].fields[k])) return steps[i].fields[k].slice(1);
    return steps[i].title;
  }
  return '';
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
  h += gwStepBodyHtml(t.id, steps[step], inst);
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
  h += outilsFicheHtml(t.id, inst);

  return h;
}

// Outils de la fiche (retour terrain du 2026-11-27, lot 3) : historique, bilan d'air neuf, plaque,
// non contrôlée, étiquette QR, note s'empilaient sous chaque écran. Ils sont regroupés derrière un
// seul bouton « Plus », qui se déplie sur place (un toucher, pas de menu) et liste ce qu'il contient.
// Il reste ouvert d'une fiche à l'autre une fois ouvert, et s'ouvre de lui-même quand on y travaille
// (formulaire « non contrôlée » ou note en cours de saisie).
var OUTILS_FICHE = [
  { nom: 'historique', fn: 'histoCarteHtml' },          // js/bilans.js
  { nom: 'bilan d’air neuf', fn: 'bilanCtaCarteHtml' },  // CTA
  { nom: 'plaque', fn: 'plaqueHtml' },                   // photo de la plaque (js/plaque.js)
  { nom: '', fn: 'plaqueDonneesHtml' },                  // débit nominal, facteur K (js/aides-mesure.js)
  { nom: 'non contrôlée', fn: 'ncChampHtml' },           // js/qualite.js
  { nom: 'étiquette QR', fn: 'etiquetteFicheHtml' },     // js/finitions.js
  { nom: 'note', fn: 'noteInstallationChampHtml' }       // note pour la prochaine visite (js/visite.js)
];

function outilsFicheHtml(typeId, inst) {
  if (!inst) return '';
  var contenu = '', noms = [];
  OUTILS_FICHE.forEach(function (o) {
    var fn = (typeof window !== 'undefined' ? window : this)[o.fn];
    if (typeof fn !== 'function') return;
    var x = fn(typeId, inst);
    if (!x) return;
    contenu += x;
    if (o.nom && noms.indexOf(o.nom) === -1) noms.push(o.nom);
  });
  if (!contenu) return '';
  var cle = typeId + ':' + state.currentInstIndex;
  var ouvert = state.outilsFicheOuverts || state.ncOuvert === cle || state.noteOuverte === cle;
  var signal = inst.data && inst.data._note ? ' · note saisie' : '';
  var h = '<div class="outils-fiche' + (ouvert ? ' ouvert' : '') + '"><button type="button" class="btn btn-gray btn-small outils-fiche-btn" aria-expanded="' + ouvert +
    '" onclick="state.outilsFicheOuverts=!' + (ouvert ? 'true' : 'false') + ';state.ncOuvert=null;state.noteOuverte=null;render();">' +
    (ouvert ? '▴ Moins' : '▾ Plus') + ' : ' + escapeHtml(noms.join(', ')) + escapeHtml(signal) + '</button>';
  if (ouvert) h += '<div class="outils-fiche-contenu">' + contenu + '</div>';
  return h + '</div>';
}

console.log('✓ Moteur d\'assistant générique chargé');
