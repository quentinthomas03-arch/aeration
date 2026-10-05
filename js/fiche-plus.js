// fiche-plus.js - Saisie d'une fiche plus rapide (2026-10-05)
//
//  - « Terminé » signale les cases obligatoires encore vides (même liste que « Vérifier avant de
//    partir », photos exclues) : un toucher amène à l'étape, ou l'on termine quand même.
//  - Boutons − / + pour les petits nombres entiers (effectif, WC, douches, lavabos, bouches…).
//  - Commentaire appliqué aussi à d'autres fiches du même type (cochées), sans écraser : ajouté à la
//    suite d'un commentaire existant ; annulable.
//  - Écran à l'horizontale (tablette ou téléphone, 640 px de large au moins) : liste des installations
//    à gauche, fiche à droite. L'orientation est lue sur l'écran de l'appareil (pas sur la fenêtre), pour
//    que l'ouverture du clavier ne fasse pas basculer l'affichage pendant la saisie.

// ————————————————————————————————————————————
// « Terminé » : cases manquantes
// ————————————————————————————————————————————

function ficheManques(typeId, inst) {
  var t = getInstallationType(typeId);
  if (!t || !inst || typeof verifMissingFields !== 'function') return [];
  if (inst.data._nonControle) return []; // installation non contrôlée : rien à compléter
  return verifMissingFields(t, inst).filter(function (f) { return !/^Photo/i.test(f.label); });
}

function manquesFicheHtml() {
  var mq = state.manquesFiche;
  if (!mq) return '';
  var lignes = mq.list.slice(0, 8).map(function (f) {
    var lien = typeof f.stepIdx === 'number' && mq.typeId !== 'sanitaires';
    return '<li>' + (lien ? '<button type="button" class="fp-manque" onclick="ficheAllerEtape(' + f.stepIdx + ');">' : '<span>') + escapeHtml(f.label) +
      (f.stepTitle ? ' <span class="subtitle">· ' + escapeHtml(f.stepTitle) + '</span>' : '') + (lien ? '</button>' : '</span>') + '</li>';
  }).join('');
  return '<div class="fp-voile" onclick="if(event.target===this){state.manquesFiche=null;render();}"><div class="fp-boite" role="dialog" aria-label="Cases à compléter">' +
    '<b>Il manque ' + mq.list.length + ' case(s) :</b><ul>' + lignes + '</ul>' + (mq.list.length > 8 ? '<p class="subtitle">et ' + (mq.list.length - 8) + ' autre(s).</p>' : '') +
    '<div class="row"><button type="button" class="btn btn-gray btn-small" onclick="state.manquesFiche=null;render();">Compléter</button>' +
    '<button type="button" class="btn btn-primary btn-small" onclick="var q=state.manquesFiche;state.manquesFiche=null;finishInstallation(q.typeId,q.goNext,true);">Terminer quand même</button></div></div></div>';
}

function ficheAllerEtape(stepIdx) {
  var mq = state.manquesFiche;
  state.manquesFiche = null;
  if (mq && typeof gwJumpToStep === 'function') gwJumpToStep(mq.typeId, stepIdx); else render();
  window.scrollTo(0, 0);
}

// ————————————————————————————————————————————
// Boutons − / + des petits nombres entiers
// ————————————————————————————————————————————

var FP_ENTIERS = ['effectif', 'travailleur', 'public', 'occupants_autres_locaux', 'wc_urinoirs', 'douches', 'lavabos', 'nombre_bouches'];

function ficheEstEntier(f) { return f && FP_ENTIERS.indexOf(f.key) !== -1; }

function ficheIncrement(typeId, key, sens) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  var v = num(inst.data[key]);
  updateInstallationField(typeId, key, String(Math.max(0, (isNaN(v) ? 0 : Math.round(v)) + sens)));
}

// Entoure le champ saisi (input) des deux boutons
function ficheStepper(typeId, f, inputHtml) {
  var b = function (sens) {
    return '<button type="button" class="fp-pas" aria-label="' + (sens < 0 ? 'Moins un' : 'Plus un') + '" onclick="ficheIncrement(\'' + typeId + '\',\'' + f.key + '\',' + sens + ');">' + (sens < 0 ? '−' : '+') + '</button>';
  };
  return '<div class="fp-stepper">' + b(-1) + inputHtml + b(1) + '</div>';
}

// ————————————————————————————————————————————
// Commentaire appliqué à d'autres fiches
// ————————————————————————————————————————————

function ficheCommentaireMultiHtml(typeId, f, inst) {
  var val = String(inst.data[f.key] || '').trim();
  if (!val) return '';
  var cm = state.comMulti;
  if (!cm || cm.typeId !== typeId || cm.key !== f.key || cm.src !== state.currentInstIndex) {
    return '<button type="button" class="today-btn" onclick="state.comMulti={typeId:\'' + typeId + '\',key:\'' + f.key + '\',src:' + state.currentInstIndex + ',coches:{}};render();">Appliquer ce commentaire à d’autres fiches</button>';
  }
  var m = getCurrentMission(), t = getInstallationType(typeId), bat = String(inst.data.batiment || '').trim();
  var autres = (m.installations[typeId] || []).map(function (x, idx) { return { type: t, inst: x, idx: idx }; })
    .filter(function (it) { return it.idx !== state.currentInstIndex; });
  // Même bâtiment d'abord, puis par ordre alphabétique (comme la vue d'ensemble)
  autres.sort(function (a, b) {
    var ba = String(a.inst.data.batiment || '').trim(), bb = String(b.inst.data.batiment || '').trim();
    return ((ba === bat ? 0 : 1) - (bb === bat ? 0 : 1)) || ba.localeCompare(bb, 'fr', { numeric: true }) || overviewTriNom(a, b);
  });
  var n = Object.keys(cm.coches).filter(function (k) { return cm.coches[k]; }).length;
  var h = '<div class="fp-com card"><b>Ajouter ce commentaire aux fiches cochées</b><p class="subtitle">Un commentaire déjà présent est conservé : le texte est ajouté à la suite.</p>';
  if (!autres.length) h += '<p class="subtitle">Aucune autre fiche de ce type.</p>';
  if (autres.some(function (it) { return String(it.inst.data.batiment || '').trim() === bat; }) && bat) {
    h += '<button type="button" class="btn btn-gray btn-small" onclick="ficheComCocherBatiment();">Tout le bâtiment ' + escapeHtml(bat) + '</button>';
  }
  h += '<div class="fp-com-liste">';
  autres.forEach(function (it) {
    var deja = String(it.inst.data[f.key] || '').trim();
    h += '<label class="fp-com-ligne"><input type="checkbox"' + (cm.coches[it.idx] ? ' checked' : '') + ' onchange="state.comMulti.coches[' + it.idx + ']=this.checked;render();">' +
      '<span>' + escapeHtml(overviewRowTitle(it)) + (it.inst.data.batiment ? ' <span class="subtitle">· ' + escapeHtml(it.inst.data.batiment) + '</span>' : '') +
      (deja ? ' <span class="subtitle">(a déjà un commentaire)</span>' : '') + '</span></label>';
  });
  h += '</div><div class="row"><button type="button" class="btn btn-gray btn-small" onclick="state.comMulti=null;render();">Annuler</button>' +
    '<button type="button" class="btn btn-primary btn-small"' + (n ? '' : ' disabled') + ' onclick="ficheComAppliquer();">Ajouter à ' + n + ' fiche(s)</button></div></div>';
  return h;
}

function ficheComCocherBatiment() {
  var cm = state.comMulti, m = getCurrentMission();
  if (!cm || !m) return;
  var list = m.installations[cm.typeId] || [], bat = String((list[cm.src] && list[cm.src].data.batiment) || '').trim();
  list.forEach(function (x, idx) { if (idx !== cm.src && String(x.data.batiment || '').trim() === bat) cm.coches[idx] = true; });
  render();
}

function ficheComAppliquer() {
  var cm = state.comMulti, m = getCurrentMission();
  if (!cm || !m) return;
  var list = m.installations[cm.typeId] || [], val = String(list[cm.src].data[cm.key] || '').trim(), avant = {};
  Object.keys(cm.coches).forEach(function (k) {
    if (!cm.coches[k] || !list[k]) return;
    var inst = list[k], deja = String(inst.data[cm.key] || '').trim();
    avant[inst.id] = inst.data[cm.key];
    if (deja.indexOf(val) !== -1) return;
    inst.data[cm.key] = deja ? deja + '\n' + val : val;
    if (typeof touchInstallation === 'function') touchInstallation(inst);
  });
  persistMissions();
  state.comMulti = null;
  var n = Object.keys(avant).length, missionId = m.id, typeId = cm.typeId, key = cm.key;
  scheduleUndo('Commentaire ajouté à ' + n + ' fiche(s).', function () {
    var mm = state.missions.find(function (x) { return x.id === missionId; });
    (mm && mm.installations[typeId] || []).forEach(function (inst) {
      if (!avant.hasOwnProperty(inst.id)) return;
      if (avant[inst.id] === undefined) delete inst.data[key]; else inst.data[key] = avant[inst.id];
    });
    persistMissions();
  });
  render();
}

// ————————————————————————————————————————————
// Compléter les fiches incomplètes à la suite (depuis « Vérifier avant de partir »)
// ————————————————————————————————————————————

// Fiches encore incomplètes, dans l'ordre de la vérification, hors celles déjà vues pendant ce parcours.
// Les photos manquantes seules ne comptent pas (comme à « Terminé »).
function parcoursRestantes(m, v) {
  var vues = (state.parcoursManques && state.parcoursManques.vues) || [];
  return (v || computeVerification(m)).items.map(function (x) {
    return { it: x.it, notStarted: x.notStarted, missing: x.missing.filter(function (f) { return !/^Photo/i.test(f.label); }) };
  }).filter(function (x) {
    return (x.notStarted || x.missing.length) && vues.indexOf(x.it.inst.id) === -1;
  });
}

// v : vérification déjà calculée par l'écran appelant (évite un second calcul, lent sur un gros site)
function parcoursCompte(m, v) {
  var sauve = state.parcoursManques;
  state.parcoursManques = null;
  var n = parcoursRestantes(m, v).length;
  state.parcoursManques = sauve;
  return n;
}

// Place le curseur sur la case qui manque (ou fait défiler jusqu'aux boutons de choix)
function parcoursViserCase(label) {
  var blocs = document.querySelectorAll('#app .field-big');
  for (var i = 0; i < blocs.length; i++) {
    var l = blocs[i].querySelector('label, .label');
    if (!l || String(l.textContent || '').trim().indexOf(label) !== 0) continue;
    var champ = blocs[i].querySelector('input:not([type="checkbox"]), select, textarea');
    if (champ) { champ.focus(); return; }
    if (blocs[i].scrollIntoView) blocs[i].scrollIntoView({ block: 'center' });
    return;
  }
}

function parcoursDemarrer() {
  state.parcoursManques = { vues: [] };
  parcoursSuivante();
}

function parcoursSuivante() {
  var m = getCurrentMission(), p = state.parcoursManques;
  if (!m || !p) return;
  var cur = state.view === 'installation-form' && m.installations[state.currentTypeId] && m.installations[state.currentTypeId][state.currentInstIndex];
  if (cur && p.vues.indexOf(cur.id) === -1) p.vues.push(cur.id);
  var reste = parcoursRestantes(m);
  p.restantes = reste.length; // mémorisé pour le bandeau : pas de recalcul à chaque saisie
  if (!reste.length) {
    state.parcoursManques = null;
    state.view = 'verification-depart';
    render();
    return;
  }
  var x = reste[0], etape = x.missing.length ? x.missing[0].stepIdx : null;
  openVerificationTarget(x.it.type.id, x.it.idx, etape);
  state.retourVue = 'verification-depart';
  if (x.missing.length) parcoursViserCase(x.missing[0].label);
}

function parcoursArreter() {
  state.parcoursManques = null;
  state.view = 'verification-depart';
  render();
}

function parcoursBandeauHtml() {
  var m = getCurrentMission();
  if (!state.parcoursManques || !m || state.view !== 'installation-form') return '';
  var n = state.parcoursManques.restantes || 0;
  return '<div class="fp-parcours"><span><b>Compléter à la suite</b> · ' + n + ' fiche(s) incomplète(s) restante(s)</span>' +
    '<button type="button" class="btn btn-primary btn-small" onclick="parcoursSuivante();">Fiche suivante ›</button>' +
    '<button type="button" class="btn btn-gray btn-small" onclick="parcoursArreter();">Arrêter</button></div>';
}

// ————————————————————————————————————————————
// Valeur remplacée ou effacée par erreur : bandeau « Annuler »
// ————————————————————————————————————————————

// Saisie directe du technicien (fiche, tableau) : si une valeur déjà renseignée est remplacée ou
// effacée, un bandeau « Annuler » permet de la retrouver. Rien à la première saisie d'une case.
function ficheSaisie(typeId, key, value, idx) {
  var m = getCurrentMission(), i = idx === undefined ? state.currentInstIndex : idx;
  var inst = m && m.installations[typeId] && m.installations[typeId][i];
  if (!inst) return;
  var avant = inst.data[key], a = String(avant === undefined || avant === null ? '' : avant).trim(), b = String(value === undefined || value === null ? '' : value).trim();
  var f = (getInstallationType(typeId).fields || []).find(function (x) { return x.key === key; });
  var remplace = a !== '' && a !== b && !Array.isArray(avant);
  return { inst: inst, avant: avant, remplace: remplace, label: f ? f.label : key, a: a, b: b, missionId: m.id };
}

function ficheProposerAnnulation(typeId, key, info) {
  if (!info || !info.remplace || typeof scheduleUndo !== 'function') return;
  var court = function (s) { return s.length > 24 ? s.slice(0, 23) + '…' : s; };
  var msg = '« ' + info.label.replace(/\s*\(.*\)\s*$/, '') + ' » : ' + court(info.a) + (info.b ? ' remplacé par ' + court(info.b) : ' effacé');
  scheduleUndo(msg, function () {
    var mm = state.missions.find(function (x) { return x.id === info.missionId; });
    var inst = mm && (mm.installations[typeId] || []).find(function (x) { return x.id === info.inst.id; }) || info.inst;
    inst.data[key] = info.avant;
    if (typeof touchInstallation === 'function') touchInstallation(inst);
    if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
    persistMissions();
  });
}

// ————————————————————————————————————————————
// Écran à l'horizontale : liste à gauche, fiche à droite
// ————————————————————————————————————————————

function ficheEcranPaysage() {
  if (typeof window === 'undefined' || !window.innerWidth || window.innerWidth < 640) return false;
  var o = window.screen && window.screen.orientation && window.screen.orientation.type;
  if (o) return /landscape/.test(o);
  return window.screen ? window.screen.width > window.screen.height : window.innerWidth > window.innerHeight;
}

function ficheVueDivisee() {
  return state.view === 'installation-form' && state.retourVue !== 'saisie-tableau' && ficheEcranPaysage();
}

function ficheListeLateraleHtml() {
  var m = getCurrentMission();
  if (!m) return '';
  var items = filterOverviewItems(overviewOrderedItems(m), state.overviewSearch || '')
    .filter(function (it) { return overviewFiltreMatch(it, state.overviewFiltre || null); });
  var mode = state.overviewMode === 'type' ? 'type' : 'batiment', groupe = null, h = '';
  items.forEach(function (it) {
    var g = mode === 'type' ? it.type.label : (String(it.inst.data.batiment || '').trim() || 'Sans bâtiment');
    if (g !== groupe) { groupe = g; h += '<div class="fp-liste-titre">' + escapeHtml(g) + '</div>'; }
    var actif = it.type.id === state.currentTypeId && it.idx === state.currentInstIndex;
    h += '<button type="button" class="fp-liste-ligne' + (actif ? ' actif' : '') + '" onclick="gsAllerFiche(\'' + it.type.id + '\',' + it.idx + ');">' +
      '<span class="status-dot ' + it.status.cls + '"></span><span class="fp-liste-nom">' + escapeHtml(overviewRowTitle(it)) +
      '<span class="fp-liste-sous">' + escapeHtml(mode === 'type' ? (it.inst.data.batiment || '') : it.type.label) + '</span></span></button>';
  });
  var filtre = (state.overviewFiltre || (state.overviewSearch || '').trim()) ? '<div class="subtitle fp-liste-filtre">Filtre de la vue d’ensemble appliqué</div>' : '';
  return '<aside class="fp-liste">' + filtre + (h || '<p class="subtitle">Aucune installation.</p>') + '</aside>';
}

// Changement d'orientation de l'appareil : on redessine la fiche ouverte
(function () {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  var dernier = null;
  var verifier = function () {
    var v = ficheVueDivisee();
    if (dernier !== null && v !== dernier && state.view === 'installation-form') render();
    dernier = v;
  };
  if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) window.screen.orientation.addEventListener('change', verifier);
  window.addEventListener('orientationchange', verifier);
  window.addEventListener('resize', function () { var a = document.activeElement; if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) verifier(); });
})();

console.log('✓ Fiche : manques, − / +, commentaire multiple, vue divisée chargés');
