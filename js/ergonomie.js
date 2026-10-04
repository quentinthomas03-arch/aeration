// ergonomie.js - Confort de saisie terrain et présentation (chantier ergonomie du 2026-10-03)
//
//  - frDisplay / computedValueHtml : valeurs calculées affichées à la française (virgule) et dans un
//    style « résultat » distinct d'un champ à saisir.
//  - liveVerdictBarHtml : avis de l'installation mis à jour pendant la saisie, avec le critère en cause.
//  - nextInstallationTarget / finishInstallation : « Terminé » enchaîne sur l'installation suivante
//    (même ordre que la vue d'ensemble) et déclenche la sauvegarde automatique.
//  - renderBilan : écran récapitulatif de la mission (anneau des avis, points non satisfaisants).
//  - Thème clair / sombre / automatique.

var BILAN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>';
var MORE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
var THEME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

// Clavier adapté au champ (fiche mission, profil) : téléphone, code postal, e-mail.
function inputKindAttrs(key) {
  if (/^(tel|portable)/i.test(key) || /Tel$|tel[A-Z]/.test(key)) return 'type="tel" inputmode="tel"';
  if (/codePostal/.test(key)) return 'type="text" inputmode="numeric" maxlength="5"';
  if (/mail/i.test(key)) return 'type="email" inputmode="email" autocapitalize="off"';
  return 'type="text"';
}

// === Affichage des nombres à la française ===

function frDisplay(v) {
  if (typeof v === 'number') return isFinite(v) ? String(v).replace('.', ',') : '';
  if (typeof v === 'string' && /^-?\d+\.\d+$/.test(v.trim())) return v.trim().replace('.', ',');
  return v;
}

// Avis (Satisfaisant, Non Satisfaisant…) : pastille colorée ; valeur numérique ou texte calculé :
// style « résultat » (fond teinté, pas de cadre de saisie) pour ne pas ressembler à un champ à remplir.
function computedValueHtml(val) {
  var empty = (val === '' || val === undefined || val === null);
  var cls = statusClass(val);
  if (!empty && cls !== 'status-muted') return '<div class="status-badge ' + cls + '">' + escapeHtml(String(val)) + '</div>';
  return '<div class="computed-value' + (empty ? ' computed-value-empty' : '') + '">' + (empty ? '—' : escapeHtml(String(frDisplay(val)))) + '</div>';
}

// === Date du jour ===

function todayFr() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
}

// Dates de LA visite (contrôle, mesure) : un bouton les remplit en un geste. date_installation (date
// de pose de l'équipement) est exclue : ce n'est jamais la date du jour.
function isVisitDateField(f) {
  return f.type === 'text' && /^date_(controle|mesure)$/.test(f.key);
}

function todayButtonHtml(onclickJs) {
  return '<button type="button" class="today-btn" onclick="' + onclickJs + '">' + ICONS.clock + ' Aujourd’hui</button>';
}

// === Avis en direct pendant la saisie ===

// Critères en cause : les autres avis calculés de l'installation qui sont non satisfaisants (ou
// indéterminés quand l'avis global l'est), avec leur libellé — générique pour les 18 types.
function verdictReasons(type, inst, avisKey, wanted) {
  var out = [];
  type.fields.forEach(function (f) {
    if (f.type !== 'computed' || f.key === avisKey) return;
    if (f.showIf && typeof evalShowIf === 'function' && !evalShowIf(f.showIf, inst.data)) return;
    if (inst.data[f.key] !== wanted) return;
    var label = reasonLabel(type, f);
    if (out.indexOf(label) === -1) out.push(label);
  });
  return out;
}

// Libellé « Avis » / « Conclusion » trop vague : remplacé par le titre de l'étape de saisie qui
// porte ce critère (ex. « Vitesse de transport »).
function reasonLabel(type, f) {
  if (!/^(avis|conclusion)\b/i.test(f.label) || typeof WIZARD_STEPS === 'undefined') return f.label;
  var step = (WIZARD_STEPS[type.id] || []).filter(function (s) { return s.fields.indexOf(f.key) !== -1; })[0];
  return step ? step.title.replace(/\s*\(optionnel\)\s*$/i, '') : f.label;
}

function liveVerdictBarHtml(typeId, inst) {
  var type = getInstallationType(typeId);
  if (!type || !inst || typeof resolveAvisFieldKey !== 'function' || !hasRealInstallationData(inst.data)) return '';
  var key = resolveAvisFieldKey(type);
  if (!key) return '';
  var val = inst.data[key];
  var cls, text, reasons = [];
  if (val === undefined || val === '' || val === 'Impossible de se prononcer') {
    cls = 'status-warn';
    text = 'Avis : données incomplètes';
    reasons = verdictReasons(type, inst, key, 'Impossible de se prononcer');
  } else {
    cls = statusClass(val);
    text = 'Avis actuel : ' + val;
    if (cls === 'status-bad') reasons = verdictReasons(type, inst, key, 'Non Satisfaisant');
  }
  var why = reasons.length ? '<div class="live-verdict-why">' + escapeHtml(reasons.slice(0, 2).join(' · ') +
    (reasons.length > 2 ? ' (+' + (reasons.length - 2) + ')' : '')) + '</div>' : '';
  return '<div class="live-verdict ' + cls + '"><span class="status-dot ' + cls + '"></span><div>' +
    '<div class="live-verdict-text">' + escapeHtml(text) + '</div>' + why + '</div></div>';
}

// === Enchaînement d'une installation à la suivante ===

// Même ordre que la vue d'ensemble (par bâtiment ou par type, selon le mode choisi) : le technicien
// enchaîne dans l'ordre où il voit la liste.
function overviewOrderedItems(m) {
  var sel = m.typesSelectionnes || [];
  var typesAffiches = INSTALLATION_TYPES.filter(function (t) { return sel.indexOf(t.id) !== -1; });
  var items = listAllInstallations(m, typesAffiches);
  var groups = (state.overviewMode === 'type') ? groupByType(items, typesAffiches) : groupByBatiment(items);
  var out = [];
  groups.forEach(function (g) { out = out.concat(g.items); });
  return out;
}

function nextInstallationTarget(typeId) {
  var m = getCurrentMission();
  if (!m) return null;
  var items = overviewOrderedItems(m);
  var pos = -1;
  items.forEach(function (it, i) { if (it.type.id === typeId && it.idx === state.currentInstIndex) pos = i; });
  if (pos === -1) {
    // Type non sélectionné dans la vue d'ensemble : on reste dans la liste du type
    var list = m.installations[typeId] || [];
    return state.currentInstIndex + 1 < list.length ? { type: getInstallationType(typeId), idx: state.currentInstIndex + 1, inst: list[state.currentInstIndex + 1] } : null;
  }
  return items[pos + 1] || null;
}

function nextInstallationLabel(next) {
  var title = overviewRowTitle({ type: next.type, inst: next.inst, idx: next.idx }, 'batiment');
  return next.type.label + ' — ' + title;
}

// Fin du parcours de saisie (bouton « Terminé » ou « Suivante ») : étape remise à 0 et sauvegarde
// automatique (js/auto-backup.js), puis installation suivante ou retour à la liste.
function finishInstallation(typeId, goNext) {
  var m = getCurrentMission();
  var inst = m && m.installations[typeId] && m.installations[typeId][state.currentInstIndex];
  var next = goNext ? nextInstallationTarget(typeId) : null;
  if (inst) { inst.data._step = 0; persistMissions(); }
  state.currentStep = 0;
  if (typeof scheduleAutoBackup === 'function') scheduleAutoBackup();
  if (next) { openOverviewInstallation(next.type.id, next.idx); window.scrollTo(0, 0); return; }
  state.view = 'type-list';
  render();
}

function finishButtonHtml(typeId) {
  return '<button class="btn btn-primary" onclick="finishInstallation(\'' + typeId + '\', false);">' + ICONS.check + ' Terminé</button>';
}

// Sous la barre Précédent / Terminé, à la dernière étape seulement.
function nextInstallationButtonHtml(typeId) {
  var next = nextInstallationTarget(typeId);
  if (!next) return '';
  return '<button class="btn btn-gray next-inst-btn" onclick="finishInstallation(\'' + typeId + '\', true);">' +
    '<span class="next-inst-text"><span>Terminé, installation suivante</span><span class="next-inst-name">' +
    escapeHtml(nextInstallationLabel(next)) + '</span></span>' + ICONS.arrowRight + '</button>';
}

// Anneau d'avancement de l'en-tête de mission (installations terminées / total)
function missionRingSvg(done, total) {
  var r = 30, c = 2 * Math.PI * r, len = total ? c * done / total : 0;
  return '<svg class="mission-ring" viewBox="0 0 76 76" role="img" aria-label="' + done + ' installations terminées sur ' + total + '">' +
    '<circle cx="38" cy="38" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="7"/>' +
    '<circle cx="38" cy="38" r="' + r + '" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" ' +
    'stroke-dasharray="' + len.toFixed(1) + ' ' + (c - len).toFixed(1) + '" transform="rotate(-90 38 38)"/>' +
    '<text x="38" y="40" text-anchor="middle" class="mission-ring-value">' + done + '/' + total + '</text>' +
    '<text x="38" y="53" text-anchor="middle" class="mission-ring-label">terminées</text></svg>';
}

// === Bilan de mission ===

var BILAN_CATEGORIES = [
  { key: 'ok', label: 'Satisfaisant', color: 'var(--status-ok)' },
  { key: 'bad', label: 'Non satisfaisant', color: 'var(--status-bad)' },
  { key: 'na', label: 'Sans objet', color: 'var(--status-muted)' },
  { key: 'open', label: 'À compléter', color: 'var(--status-warn)' }
];

function bilanCategory(it) {
  if (it.status.state !== 'done') return 'open';
  if (it.status.cls === 'status-ok') return 'ok';
  if (it.status.cls === 'status-bad') return 'bad';
  return 'na';
}

function bilanDonutSvg(counts, total) {
  var r = 52, c = 2 * Math.PI * r, offset = 0;
  var segs = BILAN_CATEGORIES.map(function (cat) {
    var n = counts[cat.key];
    if (!n) return '';
    var len = c * n / total;
    var s = '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + cat.color + '" stroke-width="18" ' +
      'stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 70 70)"/>';
    offset += len;
    return s;
  }).join('');
  var pct = total ? Math.round(100 * counts.ok / Math.max(1, total - counts.na - counts.open)) : 0;
  var evaluated = total - counts.na - counts.open;
  return '<svg class="bilan-donut" viewBox="0 0 140 140" role="img" aria-label="Répartition des avis">' +
    '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="var(--track)" stroke-width="18"/>' + segs +
    '<text x="70" y="68" text-anchor="middle" class="bilan-donut-value">' + (evaluated ? pct + '%' : '—') + '</text>' +
    '<text x="70" y="88" text-anchor="middle" class="bilan-donut-label">satisfaisant</text></svg>';
}

function renderBilan() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  var items = overviewOrderedItems(m);
  var counts = { ok: 0, bad: 0, na: 0, open: 0 };
  items.forEach(function (it) { counts[bilanCategory(it)]++; });
  var total = items.length;

  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(m.clientSite || 'Mission') + '</button>';
  h += '<div class="card"><h1>' + ICONS.check + ' Bilan de la mission</h1><p class="subtitle">' + total + ' installation(s) · ' +
    escapeHtml(m.clientSite || '') + '</p></div>';
  if (!total) return h + '<div class="empty-state"><p>Aucune installation pour l’instant.</p></div>';

  h += '<div class="card bilan-head">' + bilanDonutSvg(counts, total) + '<div class="bilan-legend">';
  BILAN_CATEGORIES.forEach(function (cat) {
    h += '<div class="bilan-legend-row"><span class="bilan-swatch" style="background:' + cat.color + ';"></span>' +
      '<span class="bilan-legend-label">' + cat.label + '</span><span class="bilan-legend-n">' + counts[cat.key] + '</span></div>';
  });
  h += '</div></div>';

  // Par type : barre empilée
  var byType = {};
  items.forEach(function (it) {
    var b = byType[it.type.id] || (byType[it.type.id] = { type: it.type, c: { ok: 0, bad: 0, na: 0, open: 0 }, n: 0 });
    b.c[bilanCategory(it)]++; b.n++;
  });
  h += '<div class="section-title">Par type d’installation</div><div class="card">';
  Object.keys(byType).forEach(function (k) {
    var b = byType[k];
    h += '<div class="bilan-type"><div class="bilan-type-head"><span>' + escapeHtml(b.type.label) + '</span><span class="subtitle">' + b.n + '</span></div><div class="bilan-bar">';
    BILAN_CATEGORIES.forEach(function (cat) {
      if (b.c[cat.key]) h += '<span style="flex:' + b.c[cat.key] + ';background:' + cat.color + ';" title="' + cat.label + ' : ' + b.c[cat.key] + '"></span>';
    });
    h += '</div></div>';
  });
  h += '</div>';

  // Points à signaler au client
  var bad = items.filter(function (it) { return bilanCategory(it) === 'bad'; });
  h += '<div class="section-title">Points non satisfaisants (' + bad.length + ')</div>';
  if (!bad.length) {
    h += '<div class="card verif-ok">' + ICONS.check + ' Aucun avis non satisfaisant</div>';
  } else {
    h += '<div class="card overview-group">';
    bad.forEach(function (it) {
      var detail = typeof badPointDetail === 'function' ? badPointDetail(it) : '';
      h += '<div class="overview-row status-bad" onclick="openOverviewInstallation(\'' + it.type.id + '\',' + it.idx + ');">' +
        '<span class="status-dot status-bad"></span><div class="overview-row-body">' +
        '<div class="overview-row-kicker">' + escapeHtml(it.type.label) + (it.inst.data.batiment ? ' · ' + escapeHtml(it.inst.data.batiment) : '') + '</div>' +
        '<div class="overview-row-title">' + escapeHtml(overviewRowTitle(it, 'batiment')) + '</div>' +
        (detail ? '<div class="overview-row-status status-bad">' + escapeHtml(detail) + '</div>' : '') +
        '</div>' + ICONS.chevronRight + '</div>';
    });
    h += '</div>';
  }
  if (counts.open) {
    h += '<p class="subtitle" style="margin:4px 4px 12px;">' + counts.open + ' installation(s) encore à compléter : voir « Vérifier avant de partir ».</p>';
  }
  h += '<button class="btn btn-primary mt-8" onclick="state.view=\'compte-rendu\';render();">' + ICONS.edit + ' Compte rendu de fin de visite (signature client)</button>';
  if (counts.bad && typeof creerContreVisite === 'function') h += '<button class="btn btn-gray" onclick="creerContreVisite();">' + ICONS.copy + ' Créer une contre-visite (' + counts.bad + ' non satisfaisante' + (counts.bad > 1 ? 's' : '') + ')</button>';
  h += '<div class="row"><button class="btn btn-gray" onclick="exportRapportPdf();">' + ICONS.download + ' Rapport PDF</button>' +
    '<button class="btn btn-gray" onclick="exportSyntheseExcel();">' + ICONS.list + ' Synthèse Excel</button></div>';
  if (typeof tempsBilanHtml === 'function') h += tempsBilanHtml(m); // temps passé (js/temps.js), interne
  return h;
}

// === Thème clair / sombre ===

var THEME_KEY = 'aeration_theme_v1';
var THEME_CYCLE = ['auto', 'light', 'dark', 'sun'];

function getThemePref() {
  try { var v = localStorage.getItem(THEME_KEY); return THEME_CYCLE.indexOf(v) !== -1 ? v : 'auto'; } catch (e) { return 'auto'; }
}

// Le thème effectif (clair/sombre) est toujours posé sur <html data-theme>, le mode « auto » suivant
// le réglage du téléphone : main.css n'a ainsi qu'un seul jeu de règles sombres à maintenir.
function applyTheme() {
  var pref = getThemePref();
  var dark = pref === 'dark' || (pref === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  // « Plein soleil » : thème clair à contraste maximal et cibles tactiles agrandies (saisie dehors, avec des gants)
  document.documentElement.setAttribute('data-theme', pref === 'sun' ? 'sun' : (dark ? 'dark' : 'light'));
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', pref === 'sun' ? '#ffffff' : (dark ? '#0b111c' : '#eef0f2'));
}

function cycleTheme() {
  var next = THEME_CYCLE[(THEME_CYCLE.indexOf(getThemePref()) + 1) % THEME_CYCLE.length];
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  applyTheme();
  render();
}

function themeLabel() {
  return { auto: 'Thème auto', light: 'Clair', dark: 'Sombre', sun: 'Plein soleil' }[getThemePref()];
}

applyTheme();
if (window.matchMedia) {
  var _themeMq = window.matchMedia('(prefers-color-scheme: dark)');
  if (_themeMq.addEventListener) _themeMq.addEventListener('change', applyTheme);
}

console.log('✓ Ergonomie chargée');
