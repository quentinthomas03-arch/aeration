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
// évoque un avis/une conclusion, puis en dernier recours le dernier champ calculé du type — repli
// seulement pour un type absent de SYNTHESE_CONFIG (voir ci-dessous). Purement indicatif pour cet
// écran de navigation, aucun impact sur le calcul ou l'export du rapport.
var _avisFieldCache = {};
function resolveAvisFieldKey(type) {
  if (_avisFieldCache.hasOwnProperty(type.id)) return _avisFieldCache[type.id];
  // En priorité l'avis retenu par la synthèse du rapport (js/report-shared.js SYNTHESE_CONFIG) : même
  // verdict que celui imprimé. L'heuristique ci-dessous choisissait pour l'extracteur la conclusion du
  // taux de renouvellement (section optionnelle) et pour les torches le constat du 10e point, d'où un
  // statut « En cours » permanent sur des installations terminées (constaté le 2026-10-03).
  var syn = (typeof SYNTHESE_CONFIG !== 'undefined') && SYNTHESE_CONFIG[type.id];
  var key = (syn && syn.avis && type.fields.some(function (f) { return f.key === syn.avis; })) ? syn.avis : null;
  var direct = !key && type.fields.find(function (f) { return f.key === 'avis'; });
  if (key) {
    // déjà résolu par la synthèse
  } else if (direct) {
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
  // Installation non contrôlée (js/qualite.js) : terminée, avec son motif
  if (data._nonControle) return { state: 'done', cls: 'status-nc', text: 'Non contrôlée · ' + (data._nonControle.motif || ''), nc: true };
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

// Entrée dans la recherche : ouvre la fiche si un seul résultat, ou si un seul nom contient le terme
// comme mot ou numéro entier (« 104 » → Bureau 104, pas Bureau 1040)
function overviewSearchEntree(v) {
  var m = getCurrentMission(), term = String(v || '').trim().toLowerCase();
  if (!m || !term) return;
  var sel = m.typesSelectionnes || [];
  var items = filterOverviewItems(listAllInstallations(m, INSTALLATION_TYPES.filter(function (t) { return sel.indexOf(t.id) !== -1; })), term);
  var esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var exact = new RegExp('(^|[^0-9a-zà-ÿ])' + esc + '($|[^0-9a-zà-ÿ])', 'i');
  var cible = items.length === 1 ? items[0] : null;
  if (!cible) {
    var exacts = items.filter(function (it) { return exact.test(overviewRowTitle(it)); });
    if (exacts.length === 1) cible = exacts[0];
  }
  if (cible) openOverviewInstallation(cible.type.id, cible.idx);
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
    '" oninput="setOverviewSearch(this.value);" onkeydown="if(event.key===\'Enter\'){event.preventDefault();overviewSearchEntree(this.value);}" enterkeyhint="go">';
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

// Dans un bâtiment (ou un type), les installations sont rangées par ordre alphabétique de leur nom,
// numéros dans l'ordre naturel (Bureau 2 avant Bureau 10) — demande de Quentin du 2026-10-05
function overviewTriNom(a, b) {
  return overviewRowTitle(a).localeCompare(overviewRowTitle(b), 'fr', { numeric: true, sensitivity: 'base' });
}

function groupByBatiment(items) {
  var map = {};
  items.forEach(function (it) {
    var b = (it.inst.data && it.inst.data.batiment) ? String(it.inst.data.batiment).trim() : '';
    var key = b || ' sans-batiment';
    if (!map[key]) map[key] = { key: key, label: b || 'Sans bâtiment', items: [] };
    map[key].items.push(it);
  });
  // Ordre de visite choisi par le technicien (m.ordreBatiments, js/grands-sites.js), sinon alphabétique
  var m = typeof getCurrentMission === 'function' ? getCurrentMission() : null, ordre = (m && m.ordreBatiments) || [];
  var rang = function (k) { var i = ordre.indexOf(k); return i === -1 ? Infinity : i; };
  return Object.keys(map).sort(function (a, b) {
    if (a === ' sans-batiment') return 1;
    if (b === ' sans-batiment') return -1;
    return (rang(a) - rang(b)) || a.localeCompare(b, 'fr');
  }).map(function (k) { map[k].items.sort(overviewTriNom); return map[k]; });
}

function groupByType(items, typesAffiches) {
  var map = {};
  items.forEach(function (it) {
    if (!map[it.type.id]) map[it.type.id] = { key: it.type.id, label: it.type.label, icon: it.type.icon, items: [] };
    map[it.type.id].items.push(it);
  });
  var bat = function (it) { return String((it.inst.data && it.inst.data.batiment) || '').trim(); };
  return typesAffiches.filter(function (t) { return t.implemented; }).map(function (t) {
    var g = map[t.id] || { key: t.id, label: t.label, icon: t.icon, items: [] };
    g.items.sort(function (a, b) { return bat(a).localeCompare(bat(b), 'fr', { numeric: true }) || overviewTriNom(a, b); });
    return g;
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

// Les compteurs servent de filtres (ergonomie du 2026-10-05, sites à 200 installations) : un toucher
// filtre la liste et le plan, un second toucher l'annule. Pas de menu de tri ni de filtre en plus.
var OVERVIEW_FILTRES = [
  { k: 'todo', label: 'À faire', cls: 'status-muted' },
  { k: 'inprogress', label: 'En cours', cls: 'status-warn' },
  { k: 'bad', label: 'Non satisf.', cls: 'status-bad' },
  { k: 'done', label: 'Terminé', cls: 'status-ok' },
  { k: 'revoir', label: 'À revoir', cls: 'status-warn', siPresent: true } // affiché seulement s'il y en a
];

function overviewFiltreMatch(it, k) {
  if (!k) return true;
  if (k === 'bad') return it.status.cls === 'status-bad';
  if (k === 'revoir') return !!(it.inst.data && it.inst.data._aRevoir);
  return it.status.state === k;
}

function setOverviewFiltre(k) {
  state.overviewFiltre = state.overviewFiltre === k ? null : k;
  render();
}

function renderOverviewCounters(items) {
  var actif = state.overviewFiltre;
  var tuiles = OVERVIEW_FILTRES.map(function (f) {
    return { f: f, n: items.filter(function (it) { return overviewFiltreMatch(it, f.k); }).length };
  }).filter(function (x) { return !x.f.siPresent || x.n || actif === x.f.k; });
  return '<div class="stat-tiles stat-tiles-filtres" style="grid-template-columns:repeat(' + tuiles.length + ',1fr);">' + tuiles.map(function (x) {
    var f = x.f, n = x.n;
    return '<button type="button" class="stat-tile ' + f.cls + (actif === f.k ? ' actif' : '') + '" aria-pressed="' + (actif === f.k) + '" ' +
      'onclick="setOverviewFiltre(\'' + f.k + '\');"><div class="stat-tile-value">' + n + '</div>' +
      '<div class="stat-tile-label">' + escapeHtml(f.label) + '</div></button>';
  }).join('') + '</div>';
}

function renderOverviewToggle() {
  var mode = state.overviewMode || 'batiment';
  return '<div class="choice-grid overview-toggle">' +
    '<button type="button" class="choice-btn' + (mode === 'batiment' ? ' selected' : '') +
      '" onclick="setOverviewMode(\'batiment\');">Par bâtiment</button>' +
    '<button type="button" class="choice-btn' + (mode === 'type' ? ' selected' : '') +
      '" onclick="setOverviewMode(\'type\');">Par type</button>' +
    '<button type="button" class="choice-btn' + (mode === 'plan' ? ' selected' : '') +
      '" onclick="setOverviewMode(\'plan\');">Plan</button>' +
    '</div>';
}

function setOverviewMode(mode) {
  state.overviewMode = mode;
  state.planPlacement = null;
  render();
}

// `ouvert` : état affiché au moment du toucher (le repli par défaut dépend de la taille du groupe)
function toggleOverviewGroup(key, ouvert) {
  if (!state.overviewExpanded) state.overviewExpanded = {};
  state.overviewExpanded[key] = !ouvert;
  render();
}

function overviewGroupOuvert(key, parDefaut) {
  var st = state.overviewExpanded && state.overviewExpanded[key];
  return (st === true || st === false) ? st : parDefaut;
}

function openOverviewGroupFull(mode, key) {
  state.overviewGroupMode = mode;
  state.overviewGroupKey = key;
  state.view = 'site-overview-group';
  render();
}

function openOverviewInstallation(typeId, idx) {
  // Retour à la vue d'ensemble, à la même position, après la fiche (et non à la liste du type)
  if (state.view === 'mission-detail') state._overviewScroll = window.scrollY;
  state.planFocus = null;
  state.retourVue = 'mission-detail';
  state.currentTypeId = typeId;
  state.currentInstIndex = idx;
  state.currentStep = 0; // resynchronisé sur l'étape mémorisée par renderSanitairesWizard si besoin
  state.view = 'installation-form';
  render();
}

// Titre de ligne : en mode "Par type" le nom du bâtiment identifie l'installation (comme sur l'écran
// type-list existant). En mode "Par bâtiment" ce serait redondant avec l'en-tête du groupe : on
// affiche plutôt le type (en kicker, cf. renderOverviewRow) + un 2e champ texte pour distinguer les
// installations entre elles.
// Dans les deux modes, le titre est ce qui identifie l'installation (référence, repère…). En vue
// « Par type », il affichait auparavant le premier champ texte, c'est-à-dire le bâtiment : cinq bureaux
// d'affilée s'appelaient « Bâtiment A » (ergonomie du 2026-10-04) ; le bâtiment passe en sur-titre.
function overviewRowTitle(it) {
  var type = it.type, inst = it.inst;
  // Champ qui identifie l'équipement en priorité (référence, repère...) : « le premier champ texte
  // hors bâtiment » tombait selon le type sur la marque, la localisation ou même la date de contrôle.
  for (var i = 0; i < OVERVIEW_TITLE_KEYS.length; i++) {
    var k = OVERVIEW_TITLE_KEYS[i];
    if (inst.data[k] && !/^[\/-]$/.test(String(inst.data[k]).trim()) && type.fields.some(function (f) { return f.key === k; })) return String(inst.data[k]);
  }
  var f2 = type.fields.find(function (f) { return f.type === 'text' && f.key !== 'batiment' && f.key !== 'niveau' && !/date/.test(f.key) && inst.data[f.key]; });
  var v2 = f2 ? inst.data[f2.key] : '';
  return v2 || ('#' + (it.idx + 1));
}
var OVERVIEW_TITLE_KEYS = ['reference_equipement', 'reference_local', 'repere', 'reference_machine', 'activite_reference_local',
  'nom_local', 'localisation', 'atelier'];

// Le titre passe désormais sur plusieurs lignes plutôt que d'être tronqué par "..." pile sur la
// partie qui identifie l'installation, illisible sur site dès que le repère est un peu long
// (retour utilisateur du 19/09/2026).
function renderOverviewRow(it, mode) {
  var title = overviewRowTitle(it, mode);
  var bat = it.inst.data && it.inst.data.batiment;
  // 'sous' : ligne d'un sous-groupe, dont l'en-tête dit déjà le type ou le bâtiment
  var lieu = [bat, it.inst.data && it.inst.data.niveau].filter(Boolean).join(' · ');
  var kicker = mode === 'sous' ? '' : mode === 'batiment' ? '<div class="overview-row-kicker">' + escapeHtml(it.type.label) + '</div>'
    : (lieu ? '<div class="overview-row-kicker">' + escapeHtml(lieu) + '</div>' : '');
  if (it.inst.data && it.inst.data._aRevoir) kicker += '<div class="overview-row-revoir">' + GS_REVOIR_ICON + ' À revoir</div>';
  return '<div class="overview-row ' + it.status.cls + '" onclick="openOverviewInstallation(\'' + it.type.id + '\',' + it.idx + ');">' +
    '<span class="status-dot ' + it.status.cls + '"></span>' +
    '<div class="overview-row-body">' + kicker + '<div class="overview-row-title">' + escapeHtml(title) + '</div>' +
    '<div class="overview-row-status ' + it.status.cls + '">' + escapeHtml(it.status.text) + '</div></div>' +
    '<button type="button" class="overview-row-duplicate" title="Dupliquer cette installation" aria-label="Dupliquer cette installation" ' +
      'onclick="event.stopPropagation();duplicateInstallation(\'' + it.type.id + '\',' + it.idx + ');">' +
      ICONS.copy + '</button>' +
    ICONS.chevronRight +
    '</div>';
}

// Mini barre sous l'en-tête d'un groupe : part des installations satisfaisantes, non satisfaisantes,
// à compléter et sans objet ; le reste (à faire) apparaît en fond.
function overviewGroupProgressHtml(items) {
  if (!items.length) return '';
  var c = { ok: 0, bad: 0, warn: 0, na: 0 };
  items.forEach(function (it) {
    if (it.status.state === 'todo') return;
    if (it.status.cls === 'status-ok') c.ok++;
    else if (it.status.cls === 'status-bad') c.bad++;
    else if (it.status.cls === 'status-warn') c.warn++;
    else c.na++;
  });
  var pct = function (n) { return (100 * n / items.length).toFixed(1) + '%'; };
  return '<div class="overview-group-progress" aria-hidden="true">' +
    ['ok', 'bad', 'warn', 'na'].map(function (k) { return c[k] ? '<span class="p-' + k + '" style="width:' + pct(c[k]) + ';"></span>' : ''; }).join('') + '</div>';
}

// Sous-groupes d'un grand groupe, dépliables sur place (remplacent l'écran « Voir tout ») : par type
// dans un bâtiment, par bâtiment dans un type.
var OVERVIEW_SOUS_GROUPE_MIN = 8, OVERVIEW_SOUS_GROUPE_OUVERT = 10;

function overviewSousGroupes(g, mode) {
  var map = {}, ordre = [];
  var parNiveau = mode === 'batiment' && typeof gsNiveau === 'function' && g.items.some(function (it) { return gsNiveau(it); });
  g.items.forEach(function (it) {
    var b = String((it.inst.data && it.inst.data.batiment) || '').trim(), k, label, icon;
    if (parNiveau) { var n = gsNiveau(it); k = n ? 'niv:' + n : 'niv: '; label = n ? 'Niveau ' + n : 'Niveau non renseigné'; icon = 'building'; }
    else if (mode === 'batiment') { k = it.type.id; label = it.type.label; icon = it.type.icon; }
    else { k = b || ' sans-batiment'; label = b || 'Sans bâtiment'; icon = 'building'; }
    if (!map[k]) { map[k] = { key: k, label: label, icon: icon, items: [], niveau: parNiveau }; ordre.push(k); }
    map[k].items.push(it);
  });
  var tri = function (a, b) { return /^niv: $| sans-batiment/.test(a) ? 1 : /^niv: $| sans-batiment/.test(b) ? -1 : a.localeCompare(b, 'fr', { numeric: true }); };
  if (mode === 'type' || parNiveau) ordre.sort(tri);
  return ordre.map(function (k) { return map[k]; });
}

// Lien « Tableau » d'un sous-groupe : un type de local en série (par type), ou un niveau qui n'en contient qu'un
function overviewLienTableau(g, s) {
  if (typeof tbTypePossible !== 'function' || (state.overviewMode || 'batiment') !== 'batiment') return '';
  var bat = g.key === ' sans-batiment' ? '' : g.key, typeId = s.niveau ? s.items[0].type.id : s.key, niv = '';
  if (s.niveau) {
    if (s.items.some(function (it) { return it.type.id !== typeId; }) || s.key === 'niv: ') return '';
    niv = s.key.slice(4);
  }
  if (!tbTypePossible(typeId)) return '';
  return '<span class="overview-group-manage" onclick="event.stopPropagation();ouvrirTableau(\'' + typeId + '\',\'' + escapeHtml(jsSafeStr(bat)) + '\'' +
    (s.niveau ? ',\'' + escapeHtml(jsSafeStr(niv)) + '\'' : '') + ');">Tableau</span>';
}

function renderOverviewGroup(g, mode, focus) {
  var agg = aggregateStatus(g.items);
  // Recherche ou filtre actif : peu de résultats, tout est déplié sauf repli explicite
  var expanded = overviewGroupOuvert(g.key, focus || g.items.length <= OVERVIEW_GROUP_THRESHOLD);
  var icon = mode === 'type' ? getIcon(g.icon) : getIcon('building');

  var h = '<div class="card overview-group">';
  h += '<div class="overview-group-header"' +
    // g.key est un nom de bâtiment saisi librement par le technicien en mode 'batiment' : jsSafeStr()
    // seul échappe backslash/quote simple pour le littéral JS mais pas le guillemet double, qui casse
    // l'attribut HTML onclick="..." si le nom en contient un — escapeHtml() en plus corrige ça
    // (bug trouvé lors de l'audit du 2026-09-18).
    ' onclick="toggleOverviewGroup(\'' + escapeHtml(jsSafeStr(g.key)) + '\',' + expanded + ');">';
  h += '<span class="status-dot ' + agg.cls + '" title="' + escapeHtml(statusDotLabel(agg)) +
    '" aria-label="' + escapeHtml(statusDotLabel(agg)) + '"></span>';
  h += '<span class="overview-group-icon">' + icon + '</span>';
  h += '<span class="overview-group-title">' + escapeHtml(g.label) + '</span>';
  h += '<span class="overview-group-count">' + agg.done + '/' + agg.total + '</span>';
  if (mode === 'type' && agg.total > 1 && typeof tbTypePossible === 'function' && tbTypePossible(g.key)) {
    h += '<span class="overview-group-manage" onclick="event.stopPropagation();ouvrirTableau(\'' + g.key + '\');">Tableau</span>';
  }
  if (mode === 'type' && agg.total > 0) {
    h += '<span class="overview-group-manage" onclick="event.stopPropagation();state.currentTypeId=\'' +
      g.key + '\';state.view=\'type-list\';render();">Gérer</span>';
  }
  h += '<span class="overview-chevron' + (expanded ? ' expanded' : '') + '">' + ICONS.chevronRight + '</span>';
  h += '</div>';
  h += overviewGroupProgressHtml(g.items);

  if (expanded) {
    var sous = overviewSousGroupes(g, mode);
    if ((sous.length > 1 && g.items.length > OVERVIEW_SOUS_GROUPE_MIN) || (sous[0] && sous[0].niveau && sous.length > 1)) {
      sous.forEach(function (s) {
        var key = g.key + '|' + s.key, a = aggregateStatus(s.items);
        var ouvert = overviewGroupOuvert(key, focus || s.items.length <= OVERVIEW_SOUS_GROUPE_OUVERT);
        h += '<div class="overview-sub-header" onclick="toggleOverviewGroup(\'' + escapeHtml(jsSafeStr(key)) + '\',' + ouvert + ');">' +
          '<span class="status-dot ' + a.cls + '"></span><span class="overview-group-icon">' + getIcon(s.icon) + '</span>' +
          '<span class="overview-group-title">' + escapeHtml(s.label) + '</span>' +
          overviewLienTableau(g, s) +
          '<span class="overview-group-count">' + a.done + '/' + a.total + '</span>' +
          '<span class="overview-chevron' + (ouvert ? ' expanded' : '') + '">' + ICONS.chevronRight + '</span></div>';
        if (ouvert) s.items.forEach(function (it) { h += renderOverviewRow(it, s.niveau ? 'batiment' : 'sous'); }); // par niveau : le type reste affiché
      });
    } else {
      g.items.forEach(function (it) { h += renderOverviewRow(it, mode); });
    }
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
  var filtre = state.overviewFiltre || null;
  var filteredItems = filterOverviewItems(items, search).filter(function (it) { return overviewFiltreMatch(it, filtre); });
  var mode = state.overviewMode || 'batiment';
  var focus = !!(search.trim() || filtre);
  var groups = (mode === 'batiment') ? groupByBatiment(filteredItems) : groupByType(filteredItems, typesAffiches);
  if (focus) groups = groups.filter(function (g) { return g.items.length > 0; });

  // Les compteurs restent sur le total du site (repère fixe), seule la liste de groupes ci-dessous
  // est filtrée par la recherche.
  var h = (typeof gsReprendreHtml === 'function') ? gsReprendreHtml(m) : ''; // reprendre où j'en étais (js/grands-sites.js)
  h += (typeof notesSiteCarteHtml === 'function') ? notesSiteCarteHtml(m) : ''; // notes de visite (js/visite.js)
  h += (typeof renderQrScanBouton === 'function') ? renderQrScanBouton(m) : ''; // étiquettes QR (js/qr.js)
  // En haut (retour terrain du 2026-10-06) : on ajoute une installation dès l'arrivée, sans redescendre la liste
  h += '<button class="btn btn-primary" onclick="state.view=\'add-installation-picker\';render();">' + ICONS.plus + ' Ajouter une installation</button>';
  h += renderOverviewCounters(items);
  h += renderOverviewSearch();
  h += renderOverviewToggle();
  if (mode === 'plan' && typeof renderPlanView === 'function') return h + renderPlanView(m, items, filteredItems); // filtres appliqués aux épingles
  if (focus && groups.length === 0) {
    var f = OVERVIEW_FILTRES.filter(function (x) { return x.k === filtre; })[0];
    h += '<div class="empty-state"><div class="empty-state-icon">' + ICONS.search + '</div>' +
      '<p>Aucune installation' + (f ? ' « ' + escapeHtml(f.label) + ' »' : '') + (search.trim() ? ' ne correspond à « ' + escapeHtml(search) + ' »' : '') + '.</p>' +
      (f ? '<button type="button" class="btn btn-gray btn-small" onclick="setOverviewFiltre(\'' + f.k + '\');">Tout afficher</button>' : '') + '</div>';
  }
  groups.forEach(function (g) { h += renderOverviewGroup(g, mode, focus); });
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
