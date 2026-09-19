// site-overview.js - Écran de vue d'ensemble du site (chantier "ergonomie de saisie terrain")
// Remplace la liste à plat "un type = une ligne avec compteur" de l'écran mission par une vue
// groupée (bâtiment ou type) avec statut par installation, pensée pour se répérer vite sur site.
// Écran de navigation uniquement : ne touche à aucun formulaire de saisie des 17 autres types.

var OVERVIEW_GROUP_THRESHOLD = 15;

// Convention : toute clé de inst.data préfixée par "_" est une méta-donnée d'UI (ex: _step, la
// dernière étape du wizard sanitaires visitée), jamais un champ de rapport — ignorée pour décider
// si une installation a été "commencée", et jamais lue par l'export Word/JSON.
function hasRealInstallationData(data) {
  return Object.keys(data || {}).some(function (k) { return k.charAt(0) !== '_'; });
}

// Le schéma n'a pas de convention unique pour le champ d'avis final (voir catalogue des 18 types) :
// on essaie la clé 'avis' (la majorité des types), puis le dernier champ calculé dont le libellé
// évoque un avis/une conclusion, puis en dernier recours le dernier champ calculé du type. Pour
// 2-3 types sans conclusion unifiée (sorbonnes, bras_aspiration, torches_aspirantes) ce dernier
// recours est une approximation : le statut affiché peut rester "En cours" même si le technicien
// considère l'installation traitée. Purement indicatif pour cet écran de navigation, aucun impact
// sur le calcul ou l'export du rapport.
var _avisFieldCache = {};
function resolveAvisFieldKey(type) {
  if (_avisFieldCache.hasOwnProperty(type.id)) return _avisFieldCache[type.id];
  var key = null;
  var direct = type.fields.find(function (f) { return f.key === 'avis'; });
  if (direct) {
    key = direct.key;
  } else {
    for (var i = type.fields.length - 1; i >= 0 && !key; i--) {
      var f = type.fields[i];
      if (f.type === 'computed' && /avis|onclusion/i.test(f.label)) key = f.key;
    }
    for (var j = type.fields.length - 1; j >= 0 && !key; j--) {
      if (type.fields[j].type === 'computed') key = type.fields[j].key;
    }
  }
  _avisFieldCache[type.id] = key;
  return key;
}

function installationStatus(type, inst) {
  var data = inst.data || {};
  if (!hasRealInstallationData(data)) return { state: 'todo', cls: 'status-muted', text: 'À faire' };

  var avisKey = resolveAvisFieldKey(type);
  var avisVal = avisKey ? data[avisKey] : undefined;
  // 'Impossible de se prononcer' (OPT_SATISFAISANT, cf. installations-schema.js) signifie "pas assez
  // de données pour conclure" côté formule métier — plusieurs types (bureaux, erp, ...) le renvoient
  // dès qu'un seul prérequis manque, y compris sur une installation à peine commencée. Le traiter
  // comme "en cours" plutôt que "terminé" évite d'afficher une installation vide comme terminée.
  if (avisVal === undefined || avisVal === '' || avisVal === 'Impossible de se prononcer') {
    var text = 'En cours';
    if (type.id === 'sanitaires') {
      var step = (typeof data._step === 'number') ? data._step : 0;
      text = 'En cours · Étape ' + (step + 1) + ' sur ' + SANITAIRES_STEP_LABELS.length;
    }
    return { state: 'inprogress', cls: 'status-warn', text: text };
  }
  return { state: 'done', cls: statusClass(avisVal), text: 'Terminé · ' + avisVal };
}

// Recherche en direct (chantier "forte volumétrie") : contains insensible à la casse sur le nom de
// l'installation ET le bâtiment/repère — pas besoin de connaître l'orthographe exacte du type. Pas
// de champ dédié "nom" unique selon le schéma (voir overviewRowTitle) : on construit un texte de
// recherche large à partir de tous les champs texte de l'installation (bâtiment, repère,
// localisation, référence...) plutôt que de deviner la bonne clé par type.
function overviewSearchHaystack(it) {
  var parts = [it.type.label];
  it.type.fields.forEach(function (f) {
    if (f.type === 'text' && it.inst.data[f.key]) parts.push(it.inst.data[f.key]);
  });
  return parts.join(' ').toLowerCase();
}

function filterOverviewItems(items, search) {
  var term = (search || '').trim().toLowerCase();
  if (!term) return items;
  return items.filter(function (it) { return overviewSearchHaystack(it).indexOf(term) !== -1; });
}

var _overviewSearchDebounceId = null;

// Débounce du rendu complet (audit du 2026-09-18) : listAllInstallations reconstruit le statut de
// TOUTES les installations du site à chaque frappe, même si seul le terme de recherche a changé —
// perceptible sur un site à forte volumétrie. La frappe elle-même n'attend jamais (le champ affiche
// déjà ce qui a été tapé nativement) ; seul le re-rendu de la liste filtrée est différé et regroupé.
function setOverviewSearch(v) {
  state.overviewSearch = v;
  if (_overviewSearchDebounceId) clearTimeout(_overviewSearchDebounceId);
  _overviewSearchDebounceId = setTimeout(function () {
    _overviewSearchDebounceId = null;
    render();
    var input = document.getElementById('overview-search-input');
    if (input) { input.focus(); var pos = input.value.length; input.setSelectionRange(pos, pos); }
  }, 150);
}

function clearOverviewSearch() {
  if (_overviewSearchDebounceId) { clearTimeout(_overviewSearchDebounceId); _overviewSearchDebounceId = null; }
  state.overviewSearch = '';
  render();
}

function renderOverviewSearch() {
  var val = state.overviewSearch || '';
  var h = '<div class="overview-search">';
  h += '<span class="overview-search-icon">' + ICONS.search + '</span>';
  h += '<input type="text" id="overview-search-input" class="input overview-search-input" ' +
    'placeholder="Rechercher (nom, bâtiment, repère...)" value="' + escapeHtml(val) +
    '" oninput="setOverviewSearch(this.value);">';
  if (val) h += '<button type="button" class="overview-search-clear" onclick="clearOverviewSearch();">Effacer</button>';
  h += '</div>';
  return h;
}

function listAllInstallations(m, typesAffiches) {
  var out = [];
  typesAffiches.forEach(function (t) {
    if (!t.implemented) return;
    (m.installations[t.id] || []).forEach(function (inst, idx) {
      out.push({ type: t, inst: inst, idx: idx, status: installationStatus(t, inst) });
    });
  });
  return out;
}

function groupByBatiment(items) {
  var map = {};
  items.forEach(function (it) {
    var b = (it.inst.data && it.inst.data.batiment) ? String(it.inst.data.batiment).trim() : '';
    var key = b || ' sans-batiment';
    if (!map[key]) map[key] = { key: key, label: b || 'Sans bâtiment', items: [] };
    map[key].items.push(it);
  });
  return Object.keys(map).sort(function (a, b) {
    if (a === ' sans-batiment') return 1;
    if (b === ' sans-batiment') return -1;
    return a.localeCompare(b, 'fr');
  }).map(function (k) { return map[k]; });
}

function groupByType(items, typesAffiches) {
  var map = {};
  items.forEach(function (it) {
    if (!map[it.type.id]) map[it.type.id] = { key: it.type.id, label: it.type.label, icon: it.type.icon, items: [] };
    map[it.type.id].items.push(it);
  });
  return typesAffiches.filter(function (t) { return t.implemented; }).map(function (t) {
    return map[t.id] || { key: t.id, label: t.label, icon: t.icon, items: [] };
  });
}

function aggregateStatus(items) {
  var total = items.length;
  var done = items.filter(function (i) { return i.status.state === 'done'; }).length;
  var hasBad = items.some(function (i) { return i.status.cls === 'status-bad'; });
  var hasActivity = items.some(function (i) { return i.status.state !== 'todo'; });
  var cls;
  if (total === 0) cls = 'status-muted';
  else if (hasBad) cls = 'status-bad';
  else if (done === total) cls = 'status-ok';
  else if (hasActivity) cls = 'status-warn';
  else cls = 'status-muted';
  return { total: total, done: done, cls: cls };
}

function statusDotLabel(agg) {
  if (agg.total === 0) return 'Aucune installation';
  if (agg.cls === 'status-bad') return 'Au moins un avis non satisfaisant';
  if (agg.cls === 'status-ok') return 'Tout terminé (' + agg.done + '/' + agg.total + ')';
  if (agg.cls === 'status-warn') return 'En cours (' + agg.done + '/' + agg.total + ' terminé(s))';
  return 'À faire';
}

function jsSafeStr(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function statTile(value, label, cls) {
  return '<div class="stat-tile ' + cls + '"><div class="stat-tile-value">' + value + '</div>' +
    '<div class="stat-tile-label">' + escapeHtml(label) + '</div></div>';
}

function renderOverviewCounters(items) {
  var done = items.filter(function (i) { return i.status.state === 'done'; }).length;
  var inprogress = items.filter(function (i) { return i.status.state === 'inprogress'; }).length;
  var todo = items.filter(function (i) { return i.status.state === 'todo'; }).length;
  return '<div class="stat-tiles">' +
    statTile(done, 'Terminé', 'status-ok') +
    statTile(inprogress, 'En cours', 'status-warn') +
    statTile(todo, 'À faire', 'status-muted') +
    '</div>';
}

function renderOverviewToggle() {
  var mode = state.overviewMode || 'batiment';
  return '<div class="choice-grid overview-toggle">' +
    '<button type="button" class="choice-btn' + (mode === 'batiment' ? ' selected' : '') +
      '" onclick="setOverviewMode(\'batiment\');">Par bâtiment</button>' +
    '<button type="button" class="choice-btn' + (mode === 'type' ? ' selected' : '') +
      '" onclick="setOverviewMode(\'type\');">Par type</button>' +
    '</div>';
}

function setOverviewMode(mode) {
  state.overviewMode = mode;
  render();
}

function toggleOverviewGroup(key) {
  if (!state.overviewExpanded) state.overviewExpanded = {};
  state.overviewExpanded[key] = (state.overviewExpanded[key] === false) ? true : false;
  render();
}

function openOverviewGroupFull(mode, key) {
  state.overviewGroupMode = mode;
  state.overviewGroupKey = key;
  state.view = 'site-overview-group';
  render();
}

function openOverviewInstallation(typeId, idx) {
  state.currentTypeId = typeId;
  state.currentInstIndex = idx;
  state.currentStep = 0; // resynchronisé sur l'étape mémorisée par renderSanitairesWizard si besoin
  state.view = 'installation-form';
  render();
}

// Titre de ligne : en mode "Par type" le nom du bâtiment identifie l'installation (comme sur l'écran
// type-list existant). En mode "Par bâtiment" ce serait redondant avec l'en-tête du groupe : on
// affiche plutôt le type + un 2e champ texte pour distinguer les installations entre elles.
function overviewRowTitle(it, mode) {
  var type = it.type, inst = it.inst;
  if (mode === 'type') {
    var f = type.fields.find(function (f) { return f.type === 'text'; });
    var v = f ? inst.data[f.key] : '';
    return v || ('#' + (it.idx + 1));
  }
  var f2 = type.fields.find(function (f) { return f.type === 'text' && f.key !== 'batiment'; });
  var v2 = f2 ? inst.data[f2.key] : '';
  return type.label + (v2 ? ' — ' + v2 : '');
}

function renderOverviewRow(it, mode) {
  var title = overviewRowTitle(it, mode);
  return '<div class="overview-row" onclick="openOverviewInstallation(\'' + it.type.id + '\',' + it.idx + ');">' +
    '<span class="status-dot ' + it.status.cls + '"></span>' +
    '<div class="overview-row-body"><div class="overview-row-title">' + escapeHtml(title) + '</div>' +
    '<div class="overview-row-status">' + escapeHtml(it.status.text) + '</div></div>' +
    '<button type="button" class="overview-row-duplicate" title="Dupliquer cette installation" ' +
      'onclick="event.stopPropagation();duplicateInstallation(\'' + it.type.id + '\',' + it.idx + ');">' +
      ICONS.copy + '</button>' +
    ICONS.chevronRight +
    '</div>';
}

function renderOverviewGroup(g, mode) {
  var agg = aggregateStatus(g.items);
  var isBig = g.items.length > OVERVIEW_GROUP_THRESHOLD;
  var expanded = !isBig && (!state.overviewExpanded || state.overviewExpanded[g.key] !== false);
  var icon = mode === 'type' ? getIcon(g.icon) : getIcon('building');

  var h = '<div class="card overview-group">';
  h += '<div class="overview-group-header"' +
    // g.key est un nom de bâtiment saisi librement par le technicien en mode 'batiment' : jsSafeStr()
    // seul échappe backslash/quote simple pour le littéral JS mais pas le guillemet double, qui casse
    // l'attribut HTML onclick="..." si le nom en contient un — escapeHtml() en plus corrige ça
    // (bug trouvé lors de l'audit du 2026-09-18).
    (isBig ? '' : ' onclick="toggleOverviewGroup(\'' + escapeHtml(jsSafeStr(g.key)) + '\');"') + '>';
  h += '<span class="status-dot ' + agg.cls + '" title="' + escapeHtml(statusDotLabel(agg)) +
    '" aria-label="' + escapeHtml(statusDotLabel(agg)) + '"></span>';
  h += '<span class="overview-group-icon">' + icon + '</span>';
  h += '<span class="overview-group-title">' + escapeHtml(g.label) + '</span>';
  h += '<span class="overview-group-count">' + agg.done + '/' + agg.total + '</span>';
  if (mode === 'type' && agg.total > 0) {
    h += '<span class="overview-group-manage" onclick="event.stopPropagation();state.currentTypeId=\'' +
      g.key + '\';state.view=\'type-list\';render();">Gérer</span>';
  }
  if (!isBig) h += '<span class="overview-chevron' + (expanded ? ' expanded' : '') + '">' + ICONS.chevronRight + '</span>';
  h += '</div>';

  if (isBig) {
    h += '<div class="overview-voir-tout"><button class="btn btn-gray btn-small" onclick="openOverviewGroupFull(\'' +
      mode + '\',\'' + escapeHtml(jsSafeStr(g.key)) + '\');">Voir tout (' + g.items.length + ') ' + ICONS.chevronRight + '</button></div>';
  } else if (expanded) {
    g.items.forEach(function (it) { h += renderOverviewRow(it, mode); });
  }
  h += '</div>';
  return h;
}

function renderSiteOverview(m) {
  var typesSelectionnes = m.typesSelectionnes || [];
  var typesAffiches = INSTALLATION_TYPES.filter(function (t) { return typesSelectionnes.indexOf(t.id) !== -1; });

  if (typesAffiches.length === 0) {
    var h = '<div class="empty-state"><div class="empty-state-icon">' + ICONS.empty + '</div>' +
      '<p>Aucune installation sélectionnée pour cette mission.</p></div>';
    h += '<button class="btn btn-primary" onclick="state.view=\'select-installations\';render();">' + ICONS.list + ' Sélectionner les installations</button>';
    return h;
  }

  var items = listAllInstallations(m, typesAffiches);
  var search = state.overviewSearch || '';
  var filteredItems = filterOverviewItems(items, search);
  var mode = state.overviewMode || 'batiment';
  var groups = (mode === 'batiment') ? groupByBatiment(filteredItems) : groupByType(filteredItems, typesAffiches);
  if (search.trim()) groups = groups.filter(function (g) { return g.items.length > 0; });

  // Les compteurs restent sur le total du site (repère fixe), seule la liste de groupes ci-dessous
  // est filtrée par la recherche.
  var h = renderOverviewCounters(items);
  h += renderOverviewSearch();
  h += renderOverviewToggle();
  if (search.trim() && groups.length === 0) {
    h += '<div class="empty-state"><div class="empty-state-icon">' + ICONS.search + '</div>' +
      '<p>Aucune installation ne correspond à « ' + escapeHtml(search) + ' ».</p></div>';
  }
  groups.forEach(function (g) { h += renderOverviewGroup(g, mode); });
  h += '<button class="btn btn-primary mt-8" onclick="state.view=\'add-installation-picker\';render();">' +
    ICONS.plus + ' Ajouter une installation</button>';
  return h;
}

function renderAddInstallationPicker() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  var typesSelectionnes = m.typesSelectionnes || [];
  var typesAffiches = INSTALLATION_TYPES.filter(function (t) { return typesSelectionnes.indexOf(t.id) !== -1; });

  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' Vue d’ensemble</button>';
  h += '<div class="card"><h1>' + ICONS.plus + ' Ajouter une installation</h1><p class="subtitle">Choisis le type d’installation à ajouter</p></div>';
  h += '<div class="nav-menu">';
  typesAffiches.forEach(function (t) {
    var disabled = !t.implemented;
    h += '<div class="nav-item" style="' + (disabled ? 'opacity:0.5;' : '') + '" onclick="' +
      (disabled ? 'alert(\'Ce type d\\\'installation sera bientôt disponible.\');' : 'addInstallation(\'' + t.id + '\');') + '">';
    h += '<div class="nav-icon">' + getIcon(t.icon) + '</div>';
    h += '<div style="flex:1;"><div style="font-weight:600;">' + escapeHtml(t.label) + '</div></div>';
    h += ICONS.chevronRight + '</div>';
  });
  h += '</div>';
  return h;
}

function renderSiteOverviewGroupFull() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  var typesSelectionnes = m.typesSelectionnes || [];
  var typesAffiches = INSTALLATION_TYPES.filter(function (t) { return typesSelectionnes.indexOf(t.id) !== -1; });
  var items = filterOverviewItems(listAllInstallations(m, typesAffiches), state.overviewSearch);
  var mode = state.overviewGroupMode || 'batiment';
  var groups = (mode === 'batiment') ? groupByBatiment(items) : groupByType(items, typesAffiches);
  var g = groups.find(function (gr) { return gr.key === state.overviewGroupKey; });

  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' Vue d’ensemble</button>';
  if (!g) {
    h += '<div class="empty-state"><p>Groupe introuvable.</p></div>';
    return h;
  }
  var agg = aggregateStatus(g.items);
  h += '<div class="card"><h1>' + (mode === 'type' ? getIcon(g.icon) : getIcon('building')) + ' ' + escapeHtml(g.label) + '</h1>' +
    '<p class="subtitle">' + agg.done + '/' + agg.total + ' terminé(s)</p></div>';
  h += '<div class="card overview-group">';
  g.items.forEach(function (it) { h += renderOverviewRow(it, mode); });
  h += '</div>';
  return h;
}

console.log('✓ Vue d\'ensemble du site chargée');
