// grands-sites.js - Se repérer sur un site de 200 installations (2026-10-05)
//
//  - Niveau / étage : champ facultatif ajouté à tous les types qui ont un bâtiment (juste après lui,
//    dans le schéma et dans l'étape de saisie). Champ ordinaire : repris par « Dupliquer », la visite
//    suivante, la recherche et l'export Excel. La vue d'ensemble range un bâtiment par niveau.
//  - « Reprendre où j'en étais » : dernière fiche ouverte (m._derniere), proposée en tête de la vue
//    d'ensemble.
//  - « À revoir » : marque posée sur une fiche (inst.data._aRevoir, méta-donnée hors rapport), filtre de
//    la vue d'ensemble et rappel dans « Vérifier avant de partir ».
//  - Dupliquer en série : N copies d'une installation, noms numérotés à la suite (Bureau 101 → 102…),
//    configuration reprise sans les mesures (même règle que « Dupliquer »).
//  - « Voir sur le plan » depuis une fiche placée : ouvre le bon plan, zoomé sur l'épingle.

var NIVEAU_FIELD = { key: 'niveau', label: 'Niveau / étage', type: 'text', optional: true };
var GS_REVOIR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/></svg>';

(function enregistrerNiveau() {
  INSTALLATION_TYPES.forEach(function (t) {
    var i = t.fields.findIndex(function (f) { return f.key === 'batiment'; });
    if (i === -1 || t.fields.some(function (f) { return f.key === 'niveau'; })) return;
    t.fields.splice(i + 1, 0, NIVEAU_FIELD);
    var steps = (typeof WIZARD_STEPS !== 'undefined' && WIZARD_STEPS[t.id]) || [];
    steps.some(function (s) {
      var j = s.fields.indexOf('batiment');
      if (j === -1) return false;
      s.fields.splice(j + 1, 0, 'niveau');
      return true;
    });
  });
})();

// Niveau d'une installation (vide si non renseigné)
function gsNiveau(it) { return String((it.inst.data && it.inst.data.niveau) || '').trim(); }

// ————————————————————————————————————————————
// Saisie du bâtiment et du niveau (retour terrain du 2026-10-06)
// ————————————————————————————————————————————

// Niveaux proposés : les étages d'abord, les sous-sols ensuite (plus rares), puis la toiture
var NIVEAUX_LISTE = ['RDC', 'R+1', 'R+2', 'R+3', 'R+4', 'R+5', 'R-1', 'R-2', 'R-3', 'Toiture'];

// setter(valeur) -> code JS de l'enregistrement (gwField pour les fiches, sanField pour les sanitaires)
function gsNiveauSelectHtml(f, inst, setter) {
  var val = String(inst.data[f.key] || '').trim(), opts = NIVEAUX_LISTE.slice();
  if (val && opts.indexOf(val) === -1) opts.push(val); // valeur saisie autrement (mezzanine…) gardée
  var appel = setter('this.value');
  return '<select class="input-text-big" onchange="if(this.value===\'__autre\'){var v=prompt(\'Niveau (ex. Mezzanine, R+1 bis) :\',\'\');this.value=\'\';if(v!==null&&v.trim()){' + setter('v.trim()') + '}}else{' + appel + '}">' +
    '<option value=""' + (val ? '' : ' selected') + '>—</option>' +
    opts.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'; }).join('') +
    '<option value="__autre">Autre…</option></select>';
}

// Bâtiments déjà saisis dans la mission, le plus utilisé d'abord (8 au plus), hors valeur actuelle
function gsBatimentsConnus(inst) {
  var m = getCurrentMission(), n = {}, actuel = String((inst && inst.data.batiment) || '').trim();
  if (!m) return [];
  Object.keys(m.installations || {}).forEach(function (t) {
    (m.installations[t] || []).forEach(function (x) { var b = String((x.data && x.data.batiment) || '').trim(); if (b && b !== actuel) n[b] = (n[b] || 0) + 1; });
  });
  return Object.keys(n).sort(function (a, b) { return (n[b] - n[a]) || a.localeCompare(b, 'fr', { numeric: true }); }).slice(0, 8);
}

function gsBatimentsSuggestionsHtml(inst, setter) {
  var liste = gsBatimentsConnus(inst);
  if (!liste.length) return '';
  return '<div class="bat-suggestions">' + liste.map(function (b) {
    return '<button type="button" class="gs-chip" onclick="' + escapeHtml(setter("'" + jsSafeStr(b) + "'")) + '">' + escapeHtml(b) + '</button>';
  }).join('') + '</div>';
}

// ————————————————————————————————————————————
// Reprendre où j'en étais
// ————————————————————————————————————————————

function gsMemoriserFiche(m, typeId, inst) {
  if (!m || !inst || !inst.id) return;
  if (m._derniere && m._derniere.t === typeId && m._derniere.id === inst.id) return;
  m._derniere = { t: typeId, id: inst.id };
  persistMissions();
}

function gsReprendreHtml(m) {
  var d = m._derniere;
  if (!d) return '';
  var list = m.installations[d.t] || [], idx = list.findIndex(function (x) { return x.id === d.id; });
  var t = getInstallationType(d.t);
  if (idx === -1 || !t) return '';
  var it = { type: t, inst: list[idx], idx: idx };
  var bat = [it.inst.data.batiment, it.inst.data.niveau].filter(Boolean).join(' · ');
  return '<button type="button" class="gs-reprendre" onclick="openOverviewInstallation(\'' + d.t + '\',' + idx + ');">' +
    '<span class="gs-reprendre-k">Continuer</span><span class="gs-reprendre-t">' + escapeHtml(t.label + ' — ' + overviewRowTitle(it)) + '</span>' +
    (bat ? '<span class="gs-reprendre-b">' + escapeHtml(bat) + '</span>' : '') + ICONS.chevronRight + '</button>';
}

// ————————————————————————————————————————————
// À revoir
// ————————————————————————————————————————————

function gsBasculerRevoir(typeId) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  if (inst.data._aRevoir) delete inst.data._aRevoir; else inst.data._aRevoir = true;
  persistMissions();
  render();
}

// Ligne sous l'en-tête d'une fiche : nom, « À revoir », « Voir sur le plan »
// Sous l'en-tête : le menu ⋯ quand il est ouvert, sinon seulement la marque « À revoir » si elle est posée
function gsLigneFicheHtml(t, inst) {
  if (!inst) return '';
  var idx = state.currentInstIndex, revoir = !!inst.data._aRevoir;
  if (state.ficheMenu !== t.id + ':' + idx) {
    return revoir ? '<div class="gs-fiche-actions"><button type="button" class="gs-chip actif" onclick="gsBasculerRevoir(\'' + t.id + '\');" title="Retirer la marque">' + GS_REVOIR_ICON + ' À revoir ✕</button></div>' : '';
  }
  var item = function (onclick, icone, label) {
    return '<button type="button" class="fiche-menu-item" onclick="state.ficheMenu=null;' + onclick + '">' + icone + '<span>' + label + '</span></button>';
  };
  return '<div class="fiche-menu">' +
    (typeof calculetteOuvrir === 'function' ? item('render();calculetteOuvrir();', ICONS.calc, 'Calculette') : '') +
    item('duplicateInstallation(\'' + t.id + '\',' + idx + ');', ICONS.copy, 'Dupliquer') +
    item('gsDupliquerSerie(\'' + t.id + '\',' + idx + ');', ICONS.copy, 'Dupliquer en série') +
    item('gsBasculerRevoir(\'' + t.id + '\');', GS_REVOIR_ICON, revoir ? 'Retirer la marque « à revoir »' : 'Marquer à revoir') +
    (inst.data._plan ? item('gsVoirSurPlan(\'' + t.id + '\',' + idx + ');', PLAN_ICON, 'Voir sur le plan') : '') +
    '</div>';
}

// ————————————————————————————————————————————
// Voir sur le plan
// ————————————————————————————————————————————

function gsVoirSurPlan(typeId, idx) {
  var m = getCurrentMission(), inst = m && m.installations[typeId] && m.installations[typeId][idx];
  var p = inst && inst.data._plan;
  if (!p) return;
  state.planCourant = p.id;
  state.planPlacement = null;
  state.overviewMode = 'plan';
  state.overviewFiltre = null;
  state.planZoom = 2;
  state.planScroll = { cx: p.x, cy: p.y };
  state.planFocus = typeId + ':' + idx;
  state.view = 'mission-detail';
  render();
  var vp = document.getElementById('plan-viewport');
  if (vp && vp.scrollIntoView) vp.scrollIntoView({ block: 'center' });
}

// ————————————————————————————————————————————
// Dupliquer en série
// ————————————————————————————————————————————

function gsChampNom(t) {
  return t.fields.find(function (f) { return f.type === 'text' && f.key !== 'batiment' && f.key !== 'niveau' && !/date/.test(f.key); });
}

// Noms des copies : numéro final incrémenté (« Bureau 101 » → 102, 103…), sinon « nom 2 », « nom 3 »…
function gsNomsSerie(base, n) {
  var out = [], mm = String(base || '').match(/^(.*?)(\d+)(\s*)$/);
  for (var i = 1; i <= n; i++) {
    if (mm) {
      var num = String(parseInt(mm[2], 10) + i);
      while (num.length < mm[2].length) num = '0' + num; // « 01 » → « 02 »
      out.push(mm[1] + num);
    } else out.push((base ? base + ' ' : '') + (i + 1));
  }
  return out;
}

function gsDupliquerSerie(typeId, idx) {
  var m = getCurrentMission(), t = getInstallationType(typeId), list = m && m.installations[typeId];
  if (!list || !list[idx]) return;
  var rep = prompt('Combien de copies de cette installation ? (noms numérotés à la suite)', '5');
  if (rep === null) return;
  var n = parseInt(rep, 10);
  if (!(n > 0) || n > 100) { alert('Indiquez un nombre entre 1 et 100.'); return; }
  var champ = gsChampNom(t), base = champ ? list[idx].data[champ.key] : '';
  var noms = gsNomsSerie(base, n), crees = [];
  noms.forEach(function (nom, i) {
    var data = buildInstallationDataForDuplicate(typeId, list[idx].data || {});
    if (champ) data[champ.key] = nom;
    var inst = { id: generateId() + '_' + i, data: data };
    if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
    crees.push(inst);
  });
  Array.prototype.splice.apply(list, [idx + 1, 0].concat(crees));
  persistMissions();
  var ids = crees.map(function (x) { return x.id; }), missionId = m.id;
  scheduleUndo(n + ' installation(s) créée(s) : ' + noms[0] + (n > 1 ? ' à ' + noms[n - 1] : '') + '.', function () {
    var mm = state.missions.find(function (x) { return x.id === missionId; });
    if (!mm || !mm.installations[typeId]) return;
    mm.installations[typeId] = mm.installations[typeId].filter(function (x) { return ids.indexOf(x.id) === -1; });
    persistMissions();
  });
  render();
}

// ————————————————————————————————————————————
// Fiche précédente / suivante (en haut de la fiche, dans l'ordre de la vue d'ensemble)
// ————————————————————————————————————————————

function gsVoisines(typeId, idx) {
  var m = getCurrentMission(), items = m ? overviewOrderedItems(m) : [], pos = -1;
  items.forEach(function (it, i) { if (it.type.id === typeId && it.idx === idx) pos = i; });
  return pos === -1 ? { prec: null, suiv: null } : { prec: items[pos - 1] || null, suiv: items[pos + 1] || null };
}

// Change de fiche sans changer l'écran de retour (vue d'ensemble ou tableau)
function gsAllerFiche(typeId, idx) {
  state.currentTypeId = typeId;
  state.currentInstIndex = idx;
  state.currentStep = 0;
  state.view = 'installation-form';
  window.scrollTo(0, 0);
  render();
}

function gsVoisinesHtml(t) {
  var v = gsVoisines(t.id, state.currentInstIndex);
  if (!v.prec && !v.suiv) return '';
  var b = function (it, sens) {
    if (!it) return '<button type="button" class="gs-chip gs-nav" disabled aria-label="' + (sens < 0 ? 'Pas de fiche précédente' : 'Pas de fiche suivante') + '">' + (sens < 0 ? '‹' : '›') + '</button>';
    var nom = it.type.label + ' — ' + overviewRowTitle(it);
    return '<button type="button" class="gs-chip gs-nav" title="' + escapeHtml(nom) + '" aria-label="' + (sens < 0 ? 'Fiche précédente : ' : 'Fiche suivante : ') + escapeHtml(nom) + '" ' +
      'onclick="gsAllerFiche(\'' + it.type.id + '\',' + it.idx + ');">' + (sens < 0 ? '‹' : '›') + '</button>';
  };
  return '<span class="gs-navs">' + b(v.prec, -1) + b(v.suiv, 1) + '</span>';
}

// ————————————————————————————————————————————
// Ordre de visite des bâtiments (menu « ⋯ » de la mission)
// ————————————————————————————————————————————

function gsBatimentsDeLaMission(m) {
  var sel = m.typesSelectionnes || [];
  var items = listAllInstallations(m, INSTALLATION_TYPES.filter(function (t) { return sel.indexOf(t.id) !== -1; }));
  return groupByBatiment(items).filter(function (g) { return g.key !== ' sans-batiment'; }).map(function (g) { return { nom: g.key, n: g.items.length }; });
}

function gsDeplacerBatiment(i, sens) {
  var m = getCurrentMission();
  if (!m) return;
  var noms = gsBatimentsDeLaMission(m).map(function (b) { return b.nom; }), j = i + sens;
  if (j < 0 || j >= noms.length) return;
  var x = noms[i]; noms[i] = noms[j]; noms[j] = x;
  m.ordreBatiments = noms;
  persistMissions();
  render();
}

function gsOrdreAlphabetique() {
  var m = getCurrentMission();
  if (!m) return;
  delete m.ordreBatiments;
  persistMissions();
  render();
}

function renderOrdreBatiments() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; return renderHome(); }
  var bats = gsBatimentsDeLaMission(m);
  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(missionNom(m)) + '</button>';
  h += '<div class="card"><h1>' + ICONS.list + ' Ordre de visite des bâtiments</h1><p class="subtitle">Rangez les bâtiments dans l’ordre où vous faites le site : la vue d’ensemble, « Suivante », les flèches des fiches et le placement sur le plan suivent cet ordre.</p></div>';
  if (bats.length < 2) return h + '<div class="empty-state"><p>Il faut au moins deux bâtiments pour choisir un ordre.</p></div>';
  h += '<div class="card overview-group">';
  bats.forEach(function (b, i) {
    h += '<div class="gs-ordre-ligne"><span class="gs-ordre-n">' + (i + 1) + '</span><span class="gs-ordre-nom">' + escapeHtml(b.nom) + '<span class="subtitle"> · ' + b.n + '</span></span>' +
      '<button type="button" class="btn btn-gray btn-small" aria-label="Monter ' + escapeHtml(b.nom) + '" onclick="gsDeplacerBatiment(' + i + ',-1);"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button type="button" class="btn btn-gray btn-small" aria-label="Descendre ' + escapeHtml(b.nom) + '" onclick="gsDeplacerBatiment(' + i + ',1);"' + (i === bats.length - 1 ? ' disabled' : '') + '>↓</button></div>';
  });
  h += '</div>';
  if (m.ordreBatiments) h += '<button type="button" class="btn btn-gray btn-small" onclick="gsOrdreAlphabetique();">Revenir à l’ordre alphabétique</button>';
  return h;
}

// ————————————————————————————————————————————
// Bilan : reste à faire par bâtiment
// ————————————————————————————————————————————

function gsResteParBatimentHtml(items) {
  var lignes = groupByBatiment(items).map(function (g) {
    return { g: g, reste: g.items.filter(function (it) { return it.status.state !== 'done'; }).length,
      revoir: g.items.filter(function (it) { return it.inst.data && it.inst.data._aRevoir; }).length };
  }).filter(function (x) { return x.reste || x.revoir; });
  if (!lignes.length) return '';
  var h = '<div class="section-title">Reste à faire par bâtiment</div><div class="card overview-group">';
  lignes.forEach(function (x) {
    var txt = [x.reste ? x.reste + ' à compléter' : '', x.revoir ? x.revoir + ' à revoir' : ''].filter(Boolean).join(' · ');
    h += '<div class="overview-row status-warn" onclick="gsOuvrirBatiment(\'' + escapeHtml(jsSafeStr(x.g.key)) + '\');">' +
      '<span class="status-dot status-warn"></span><div class="overview-row-body"><div class="overview-row-title">' + escapeHtml(x.g.label) + '</div>' +
      '<div class="overview-row-status status-warn">' + escapeHtml(txt) + ' sur ' + x.g.items.length + '</div></div>' + ICONS.chevronRight + '</div>';
  });
  return h + '</div>';
}

// Ouvre la vue d'ensemble sur ce bâtiment, déplié
function gsOuvrirBatiment(key) {
  state.overviewMode = 'batiment';
  state.overviewFiltre = null;
  state.overviewSearch = '';
  state.overviewExpanded = {};
  state.overviewExpanded[key] = true;
  state.view = 'mission-detail';
  render();
  var titres = document.querySelectorAll('.overview-group-title');
  for (var i = 0; i < titres.length; i++) {
    if (titres[i].textContent === (key === ' sans-batiment' ? 'Sans bâtiment' : key)) { titres[i].scrollIntoView({ block: 'start' }); window.scrollBy(0, -12); break; }
  }
}

console.log('✓ Grands sites (niveau, reprendre, à revoir, série, voisines, ordre) chargés');
