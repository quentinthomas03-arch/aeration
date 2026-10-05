// installations.js - Moteur générique piloté par schéma
// Un seul moteur de formulaire pour les 17 types, au lieu de 17 formulaires écrits à la main

function renderMissionDetail() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  var h = '<button class="back-btn" onclick="state.missionMenuOpen=false;state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  // En-tête « tableau de bord » (esthétique du 2026-10-04) : client, site, date, technicien et anneau
  // d'avancement, dans le bleu du rapport.
  var di = m.donneesInternes || {}, si = m.infosSiteIntervention || {};
  var heroItems = (typeof overviewOrderedItems === 'function') ? overviewOrderedItems(m) : [];
  var heroDone = heroItems.filter(function (it) { return it.status.state === 'done'; }).length;
  var lieu = [si.siteIntervention, si.ville].filter(Boolean).join(' · ');
  var dates = di.datesIntervention || m.dateControle || '';
  var meta = [dates ? '<span>' + ICONS.clock + escapeHtml(dates) + '</span>' : '', m.controleur ? '<span>' + ICONS.user + escapeHtml(m.controleur) + '</span>' : ''].join('');
  h += '<div class="card mission-head"><div class="mission-hero"><div class="mission-hero-text">' +
    '<div class="mission-hero-kicker">' + (di.numeroAffaire ? 'Affaire ' + escapeHtml(di.numeroAffaire) : 'Mission') + '</div>' +
    '<h1>' + escapeHtml(missionNom(m)) + '</h1>' +
    (m.clientSite && missionNom(m) !== m.clientSite ? '<div class="mission-hero-sub">' + escapeHtml(m.clientSite) + '</div>' : '') +
    (lieu && lieu !== m.clientSite ? '<div class="mission-hero-sub">' + escapeHtml(lieu) + '</div>' : '') +
    (meta ? '<div class="mission-hero-meta">' + meta + '</div>' : '') + '</div>' +
    (heroItems.length ? missionRingSvg(heroDone, heroItems.length) : '') + '</div><div class="mission-head-body">';

  // Écran allégé (ergonomie du 2026-10-03) : la liste des installations, essentielle sur site, passe
  // avant les actions secondaires. Restent visibles le rapport PDF (export direct pdfmake, cf.
  // js/export-pdf.js) et le bilan ; le reste est regroupé dans le menu « ⋯ ».
  h += '<div class="mission-actions">';
  h += '<button class="btn btn-primary btn-small" onclick="exportRapportPdf();">' + ICONS.download + ' Rapport PDF</button>';
  h += '<button class="btn btn-gray btn-small" onclick="state.missionMenuOpen=false;state.view=\'bilan\';render();">' + BILAN_ICON + ' Bilan</button>';
  h += '<button class="btn btn-gray btn-small mission-more-btn' + (state.missionMenuOpen ? ' active' : '') + '" aria-label="Plus d\u2019actions" ' +
    'onclick="state.missionMenuOpen=!state.missionMenuOpen;render();">' + MORE_ICON + '</button>';
  h += '</div>';
  if (state.missionMenuOpen) {
    var item = function (onclick, icon, label) {
      return '<button type="button" class="home-action-row" onclick="state.missionMenuOpen=false;' + onclick + '">' +
        '<span class="home-action-row-icon">' + icon + '</span><div class="home-action-row-title">' + label + '</div></button>';
    };
    h += '<div class="mission-menu">' +
      item('state.view=\'mission-form\';render();', ICONS.edit, 'Infos mission') +
      item('state.view=\'select-installations\';render();', ICONS.list, 'Sélection des installations') +
      (typeof renderImportListe === 'function' ? item('state.importListe=null;state.view=\'import-liste\';render();', ICONS.upload, 'Créer les installations par quantités (ou Excel)') : '') +
      item('state.view=\'preparation\';render();', ICONS.clipboard, 'Préparer la visite (notes, matériel)') +
      (typeof renderOrdreBatiments === 'function' ? item('state.view=\'ordre-batiments\';render();', ICONS.list, 'Ordre de visite des bâtiments') : '') +
      (typeof renderQuestionnaire === 'function' ? item('state.qc=null;state.qcInfo=\'\';state.view=\'questionnaire\';render();', ICONS.clipboard, 'Questionnaire client (avant la visite)') : '') +
      (typeof renderValeursReference === 'function' ? item('state.vrPropositions=null;state.vrInfo=\'\';state.view=\'valeurs-ref\';render();', ICONS.upload, 'Importer les valeurs de référence du client') : '') +
      item('state.view=\'verification-depart\';render();', ICONS.check, 'Vérifier avant de partir') +
      (typeof calculetteOuvrir === 'function' ? item('render();calculetteOuvrir();', ICONS.calc, 'Calculette') : '') +
      item('render();shareRapportPdf();', ICONS.upload, 'Envoyer le rapport (mail, Teams…)') +
      item('state.view=\'compte-rendu\';render();', ICONS.edit, 'Compte rendu de fin de visite') +
      (typeof exportSyntheseBatiments === 'function' ? item('render();exportSyntheseBatiments();', ICONS.download, 'Synthèse par bâtiment pour le client (PDF à part)') : '') +
      item('render();exportSyntheseExcel();', ICONS.list, 'Exporter la synthèse (Excel)') +
      (typeof exporterPhotosZip === 'function' ? item('render();exporterPhotosZip();', ICONS.download, 'Photos de la mission (zip, rangées par bâtiment)') : '') +
      (typeof renderModifsRapport === 'function' ? item('state.view=\'modifs-rapport\';render();', ICONS.list, 'Modifications depuis la version précédente du rapport') : '') +
      (m.dvr && m.dvr.actif ? item('state.view=\'dvr\';render();', ICONS.clipboard, 'Relevé des valeurs de référence') : '') +
      item('render();envoyerRapportEtMission();', ICONS.upload, 'Envoyer par mail : rapport PDF + mission (Outlook)') +
      item('render();shareOrExportMission(' + m.id + ');', ICONS.download, 'Transférer la mission seule (fichier .json)') +
      (typeof imprimerEtiquettesQr === 'function' ? item('render();imprimerEtiquettesQr();', QR_ICON, 'Imprimer les étiquettes QR (avant la visite)') : '') +
      item('render();triggerMergeMission();', ICONS.merge, 'Fusionner le travail d’un collègue (.json)') +
      (typeof renderRelecture === 'function' ? item('state.view=\'relecture\';render();', ICONS.check, 'Relire la mission (relecture)') : '') +
      (typeof creerContreVisite === 'function' ? item('render();creerContreVisite();', ICONS.copy, 'Créer une contre-visite') : '') +
      '</div>';
  }
  h += '</div></div>';

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

  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(missionNom(m)) + '</button>';
  h += '<div class="card"><h1>' + getIcon(t.icon) + ' ' + escapeHtml(t.label) + '</h1><p class="subtitle">' + list.length + ' installation(s)</p></div>';
  if (typeof renderEdReferenceBadge === 'function') h += renderEdReferenceBadge(t.id);

  list.forEach(function (inst, idx) {
    // Référence du local / repère / équipement, et le bâtiment en dessous : le premier champ texte
    // (le bâtiment) donnait le même nom à 15 bureaux d'un même bâtiment (retour terrain du 2026-10-05)
    var title = overviewRowTitle({ type: t, inst: inst, idx: idx });
    var bat = inst.data.batiment;
    h += '<div class="nav-item" onclick="state.retourVue=\'type-list\';state.currentInstIndex=' + idx + ';state.currentStep=0;state.view=\'installation-form\';render();">';
    h += '<div class="nav-icon">' + getIcon(t.icon) + '</div>';
    h += '<div style="flex:1;"><div style="font-weight:600;">' + escapeHtml(title) + '</div>' +
      (bat && bat !== title ? '<div class="subtitle">' + escapeHtml(bat) + '</div>' : '') + '</div>';
    h += '<button class="agent-delete" onclick="event.stopPropagation();deleteInstallation(\'' + t.id + '\',' + idx + ');">' + ICONS.trash + '</button>';
    h += '</div>';
  });

  h += '<button class="btn btn-primary" onclick="addInstallation(\'' + t.id + '\');">' + ICONS.plus + ' Ajouter</button>';
  if (typeof tbTypePossible === 'function' && tbTypePossible(t.id) && list.length) h += '<button class="btn btn-gray" onclick="ouvrirTableau(\'' + t.id + '\');">' + ICONS.list + ' Saisie en tableau</button>';
  return h;
}

// Nom de la fiche ouverte (référence du local, repère…) et son bâtiment, sous l'en-tête de saisie
function installationNomHtml(t, inst) {
  if (!inst) return '';
  var actions = (typeof parcoursBandeauHtml === 'function' ? parcoursBandeauHtml() : '') + // compléter à la suite (js/fiche-plus.js)
    (typeof gsLigneFicheHtml === 'function' ? gsLigneFicheHtml(t, inst) : ''); // js/grands-sites.js
  if (!hasRealInstallationData(inst.data)) return actions;
  var nom = overviewRowTitle({ type: t, inst: inst, idx: state.currentInstIndex });
  var bat = [inst.data.batiment, inst.data.niveau].filter(Boolean).join(' · ');
  return '<div class="subtitle" style="margin:-4px 0 8px;font-weight:600;">' + escapeHtml(nom) +
    (bat && bat !== nom ? ' · ' + escapeHtml(bat) : '') + '</div>' + actions;
}

function addInstallation(typeId) {
  var m = getCurrentMission();
  if (!m.installations[typeId]) m.installations[typeId] = [];
  m.installations[typeId].push({ id: generateId(), data: {} });
  persistMissions();
  state.retourVue = state.view === 'type-list' ? 'type-list' : 'mission-detail';
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

// discardFn (optionnel) est appelé une fois que l'annulation n'est plus possible — expiration du
// délai, ou écrasement par une action suivante — jamais si l'utilisateur a cliqué "Annuler". Sert à
// ne libérer une ressource externe (ex : photos IndexedDB d'une installation supprimée) qu'une fois
// certain qu'elle ne sera plus restaurée (audit du 2026-09-18).
function scheduleUndo(message, restoreFn, discardFn) {
  if (_undoTimeoutId) clearTimeout(_undoTimeoutId);
  if (state.undoToast && typeof state.undoToast.discard === 'function') state.undoToast.discard();
  state.undoToast = { message: message, restore: restoreFn, discard: discardFn };
  _undoTimeoutId = setTimeout(function () {
    var toast = state.undoToast;
    state.undoToast = null;
    _undoTimeoutId = null;
    renderUndoToastRoot();
    if (toast && typeof toast.discard === 'function') toast.discard();
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
// Haut de fiche allégé (2026-10-05) : flèches fiche précédente / suivante et un seul bouton ⋯ qui ouvre
// les actions (calculette, dupliquer, en série, à revoir, plan) — js/grands-sites.js gsMenuFicheHtml
function duplicateButtonHtml(typeId, idx) {
  var t = getInstallationType(typeId), ouvert = state.ficheMenu === typeId + ':' + idx;
  return '<span class="wizard-actions">' + (typeof gsVoisinesHtml === 'function' && t ? gsVoisinesHtml(t) : '') +
    '<button type="button" class="btn btn-gray btn-small fiche-plus-btn' + (ouvert ? ' active' : '') + '" aria-label="Actions de la fiche" aria-expanded="' + ouvert + '" ' +
    'onclick="state.ficheMenu=state.ficheMenu===\'' + typeId + ':' + idx + '\'?null:\'' + typeId + ':' + idx + '\';render();">' + (typeof MORE_ICON !== 'undefined' ? MORE_ICON : '⋯') + '</button></span>';
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
  var nameField = t.fields.find(function (f) { return f.type === 'text' && f.key !== 'batiment' && f.key !== 'niveau'; });
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
  }, function () {
    // N'est appelé que si l'annulation n'a pas été utilisée (cf. scheduleUndo) — supprime les
    // photos IndexedDB de l'installation, qui restaient orphelines indéfiniment auparavant.
    if (typeof deleteInstallationPhotoBlobs === 'function') deleteInstallationPhotoBlobs(removed);
  });

  render();
}

function renderInstallationForm() {
  var m = getCurrentMission();
  var t = getInstallationType(state.currentTypeId);
  if (!m || !t) { state.view = 'home'; render(); return ''; }
  var inst = m.installations[t.id][state.currentInstIndex];
  if (!inst) { state.view = 'type-list'; render(); return ''; }
  if (typeof gsMemoriserFiche === 'function') gsMemoriserFiche(m, t.id, inst); // « Reprendre où j'en étais »

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

// Marqueur inline dans le libellé (coche discrète si rempli, point neutre si vide) plutôt qu'un
// bandeau répétant "Renseigné" en toutes lettres sous le champ — évite le double signal redondant
// tout en restant repérable en un coup d'œil (retour utilisateur du 19/09/2026).
function fieldLabelWithTag(f, state) {
  var tag = (state === 'optional-empty' || state === 'optional-filled')
    ? '<span class="field-tag field-tag-optional">optionnel</span>' : '';
  var marker = '';
  if (state === 'required-filled') marker = '<span class="field-label-marker field-label-marker-done">' + ICONS.check + '</span>';
  else if (state === 'required-empty') marker = '<span class="field-label-marker field-label-marker-empty"></span>';
  return '<label class="label">' + escapeHtml(f.label) + tag + marker + '</label>';
}

function computedLabelWithTag(label) {
  return '<label class="label"><span class="field-computed-icon">' + ICONS.zap + '</span>' +
    escapeHtml(label) + '<span class="field-tag field-tag-auto">calculé</span></label>';
}

// "required-filled" ne renvoie plus de bandeau ici : la coche est désormais dans le libellé
// (cf. fieldLabelWithTag) — un second signal "Renseigné" en toutes lettres en dessous était redondant.
function fieldHint(state) {
  if (state === 'required-empty') return '<div class="field-hint field-hint-required">À saisir</div>';
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
  // ⚠️ BUG CORRIGÉ (2026-09-19) : v vaut `undefined` (jamais '') tant que le technicien n'a pas
  // touché le champ — torchePointShowIf (installations-schema.js) compte sur `in: ['', '1', ...]`
  // pour que "pas encore répondu" affiche tous les points de mesure, mais `[...].indexOf(undefined)`
  // ne matchait jamais, masquant TOUS les points par défaut (y compris sur les installations créées
  // avant l'ajout de ce champ). Normaliser ici une bonne fois pour toutes : aucune autre condition du
  // schéma n'utilise '' dans un `in`/`equals` (vérifié), donc ça ne change le comportement d'aucun
  // autre champ.
  var v = data[cond.key];
  if (v === undefined) v = '';
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
  // type="text" + inputmode="decimal" (pas type="number") : clavier numérique avec virgule sur mobile,
  // et une valeur stockée avec virgule (« 15,9 », import Rapso) reste affichée au lieu d'un champ vide.
  if (f.type === 'number') {
    return '<input type="text" inputmode="decimal" class="input" value="' + escapeHtml(val) + '" onchange="' + onchange + '">';
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
  if (f.type === 'computed') return computedValueHtml(val);
  if (f.type === 'grid') {
    var cols = Math.min(parseInt(inst.data[f.colsKey], 10) || 0, GRID_MAX);
    var rows = Math.min(parseInt(inst.data[f.rowsKey], 10) || 0, GRID_MAX);
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
        '<td style="padding:2px;"><input type="text" inputmode="decimal" value="' + escapeHtml(c.nb || '') + '" style="width:50px;padding:6px;border:1px solid #d1d5db;border-radius:6px;" onchange="updateCharger(\'' + typeId + '\',' + i + ',\'nb\',this.value);"></td>' +
        '<td style="padding:2px;"><input type="text" inputmode="decimal" value="' + escapeHtml(c.tension || '') + '" style="width:70px;padding:6px;border:1px solid #d1d5db;border-radius:6px;" onchange="updateCharger(\'' + typeId + '\',' + i + ',\'tension\',this.value);"></td>' +
        '<td style="padding:2px;"><input type="text" inputmode="decimal" value="' + escapeHtml(c.courant || '') + '" style="width:70px;padding:6px;border:1px solid #d1d5db;border-radius:6px;" onchange="updateCharger(\'' + typeId + '\',' + i + ',\'courant\',this.value);"></td>' +
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
    // Photo de la visite précédente (js/plaque.js) : pour reprendre le même cadrage, hors rapport
    if (inst && inst.data && inst.data._photoN1) {
      h += '<div class="photo-thumb photo-n1"><img data-photo-src="' + escapeHtml(inst.data._photoN1) + '" alt="Photo de la visite précédente" onclick="openPhotoViewer(\'' + escapeHtml(inst.data._photoN1) + '\');"><span class="photo-n1-tag">N-1</span></div>';
    }
    photos.forEach(function (p) {
      h += '<div class="photo-thumb' + (p.annot && p.annot.length ? ' annotee' : '') + '">' +
        '<img data-photo-src="' + escapeHtml(p.id) + '" alt="Photo" onclick="openPhotoViewer(\'' + escapeHtml(p.id) + '\');">' +
        (typeof annoterPhoto === 'function' ? '<button type="button" class="photo-annoter" title="Annoter la photo (entourer, flécher)" ' +
          'onclick="event.stopPropagation();annoterPhoto(\'' + typeId + '\',\'' + f.key + '\',\'' + escapeHtml(p.id) + '\');">' + ICONS.edit + '</button>' : '') +
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

// Les 6 fonctions suivantes vérifient désormais que l'installation existe encore avant de la
// modifier (getCurrentInstallation renvoie null si la mission a disparu entre-temps, ex. supprimée
// depuis un autre onglet/écran) — auparavant un plantage possible en pleine saisie (audit du
// 2026-09-18).

function updateInstallationField(typeId, key, value) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  inst.data[key] = value;
  touchInstallation(inst);
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  if (state.view === 'installation-form') render();
}

function addCharger(typeId) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  if (!Array.isArray(inst.data.chargeurs)) inst.data.chargeurs = [];
  inst.data.chargeurs.push({ nb: '', tension: '', courant: '' });
  touchInstallation(inst);
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  render();
}

function updateCharger(typeId, idx, field, value) {
  var inst = getCurrentInstallation(typeId);
  if (!inst || !inst.data.chargeurs || !inst.data.chargeurs[idx]) return;
  inst.data.chargeurs[idx][field] = value;
  touchInstallation(inst);
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  render();
}

function removeCharger(typeId, idx) {
  var inst = getCurrentInstallation(typeId);
  if (!inst || !Array.isArray(inst.data.chargeurs)) return;
  inst.data.chargeurs.splice(idx, 1);
  touchInstallation(inst);
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  render();
}

function updateGridCell(typeId, key, r, c, value) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  var grid = Array.isArray(inst.data[key]) ? inst.data[key] : [];
  if (!grid[r]) grid[r] = [];
  grid[r][c] = value.trim();
  inst.data[key] = grid;
  touchInstallation(inst);
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions();
  if (state.view === 'installation-form') render();
}

function toggleInstallationCheckbox(typeId, key, option, checked) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  var current = Array.isArray(inst.data[key]) ? inst.data[key] : [];
  if (checked) { if (current.indexOf(option) === -1) current.push(option); }
  else { current = current.filter(function (o) { return o !== option; }); }
  inst.data[key] = current;
  touchInstallation(inst);
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
    touchInstallation(inst);
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
  var origine = photos.filter(function (p) { return p.id === photoId && p.orig; })[0]; // photo annotée : original conservé (js/annotation.js)
  if (origine) deletePhotoBlob(origine.orig);
  inst.data[key] = photos.filter(function (p) { return p.id !== photoId; });
  touchInstallation(inst);
  persistMissions();
  deletePhotoBlob(photoId); // suppression explicite d'une photo précise : pas d'annulation possible
  // (chantier "Annuler la dernière action" volontairement limité à suppression/duplication
  // d'installation), le fil de confirmation ci-dessus est le seul garde-fou, comme pour
  // deleteInstallation.
  if (_photoObjectUrlCache[photoId]) { URL.revokeObjectURL(_photoObjectUrlCache[photoId]); delete _photoObjectUrlCache[photoId]; }
  render();
}

console.log('✓ Moteur installations chargé');
