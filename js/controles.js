// controles.js - Contrôles de vraisemblance et de cohérence (chantier du 2026-10-03)
//
//  - Valeurs inhabituelles : chaque champ numérique est comparé à une plage plausible selon son unité
//    (plages calibrées sur les missions réelles de rapso-exemples-remplis, avec une large marge). Ce
//    n'est qu'un avertissement : une valeur hors plage peut être juste, elle mérite d'être revérifiée
//    (virgule oubliée, unité confondue, 69 au lieu de 6,9).
//  - Cohérence : dates de visite, avis choisi par le technicien contre les critères calculés, infos
//    de mission obligatoires pour le rapport. Remonté dans « Vérifier avant de partir ».

// Plage plausible par unité (unité = dernière parenthèse du libellé du champ). Débit et vitesse
// peuvent valoir 0 (local sans extraction, ventilateur à l'arrêt) : c'est un constat, pas une erreur.
var PLAUSIBLE_RANGES = {
  'm/s': [0, 40], 'm³/h': [0, 150000], 'm³': [1, 200000], 'm²': [0.01, 200000],
  'cm': [1, 500], 'mm': [5, 5000], 'm': [0.2, 200], 'Pa': [-3000, 3000], '°C': [-20, 120],
  'hPa': [850, 1100], '%': [0, 100], 'litres': [0.05, 20], 'tours/min': [300, 8000], 'vol/h': [0.1, 200]
};
var REFERENCE_KEY_PATTERN = /reference|recommand|inrs|norme|preconis/;

function fieldUnit(f) {
  var m = String(f.label || '').match(/\(([^()]*)\)\s*$/);
  if (m && PLAUSIBLE_RANGES[m[1]]) return m[1];
  // Grilles de points : pas d'unité dans le libellé, mais ce sont toujours des vitesses
  if (f.type === 'grid' && /vitesse|grid/.test(f.key)) return 'm/s';
  return null;
}

function formatRangeFr(r, unit) {
  return frDisplay(r[0]) + ' à ' + frDisplay(r[1]) + ' ' + unit;
}

// null si rien à signaler ; sinon { kind: 'texte' | 'hors-plage', message }
function plausibilityIssue(f, value) {
  if (value === undefined || value === null || value === '' || value === '/' || value === '-') return null;
  var s = String(value).trim();
  if (!/^-?\d+([.,]\d+)?$/.test(s)) {
    // Une valeur de référence peut légitimement être une plage ou un texte (« 0,5 - 1 ») : seules les
    // mesures doivent être des nombres.
    if (REFERENCE_KEY_PATTERN.test(f.key)) return null;
    return { kind: 'texte', message: 'Valeur non numérique « ' + s + ' »' };
  }
  var unit = fieldUnit(f);
  if (!unit) return null;
  var n = parseFloat(s.replace(',', '.')), r = PLAUSIBLE_RANGES[unit];
  if (n < r[0] || n > r[1]) return { kind: 'hors-plage', message: 'Valeur inhabituelle (' + formatRangeFr(r, unit) + ' attendu)' };
  return null;
}

// Champs N-1 : valeurs de l'an dernier, pas une saisie de cette visite — jamais signalées.
function isN1Field(typeId, key) {
  return (N1_COMPARISON_FIELDS[typeId] || []).some(function (p) { return p.n1 === key; });
}

function plausibilityHintHtml(typeId, f, value) {
  if (isN1Field(typeId, f.key)) return '';
  var issue = plausibilityIssue(f, value);
  return issue ? '<div class="field-hint field-hint-warn">' + ICONS.zap + ' ' + escapeHtml(issue.message) + ' — vérifier</div>' : '';
}

// === Dates ===

function parseDateFr(s) {
  var m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  var d = new Date(+m[3], +m[2] - 1, +m[1]);
  return (d.getMonth() === +m[2] - 1) ? d : null;
}

// Toutes les dates jj/mm/aaaa d'un texte libre (« du 15/09/2026 au 16/09/2026 », « 15 et 16/09/2026 »...)
function datesInText(s) {
  var out = [];
  String(s || '').replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, function (all) { var d = parseDateFr(all); if (d) out.push(d); return all; });
  var jm = String(s || '').match(/^\s*(\d{1,2})\s*(?:et|,|-|à|au)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (jm) { var d0 = new Date(+jm[4], +jm[3] - 1, +jm[1]); if (!isNaN(d0)) out.push(d0); }
  return out;
}

var JOUR_MS = 24 * 3600 * 1000;

function dateIssue(value, mission) {
  if (!value) return null;
  var d = parseDateFr(value);
  if (!d) return 'Date « ' + value + ' » au format inattendu (jj/mm/aaaa)';
  if (d.getTime() > Date.now() + JOUR_MS) return 'Date ' + value + ' dans le futur';
  var inter = datesInText(mission && mission.donneesInternes && mission.donneesInternes.datesIntervention);
  if (inter.length) {
    var min = Math.min.apply(null, inter.map(Number)), max = Math.max.apply(null, inter.map(Number));
    if (d.getTime() < min - JOUR_MS || d.getTime() > max + JOUR_MS) return 'Date ' + value + ' hors des dates d’intervention de la mission';
  }
  return null;
}

// === Anomalies d'une installation (pour « Vérifier avant de partir ») ===

function fieldStepIndex(typeId, key) {
  var steps = (typeof WIZARD_STEPS !== 'undefined' && WIZARD_STEPS[typeId]) || [];
  for (var i = 0; i < steps.length; i++) if (steps[i].fields.indexOf(key) !== -1) return i;
  return null;
}

function installationAnomalies(t, inst, mission) {
  var out = [];
  var push = function (f, message) { out.push({ label: f.label, message: message, stepIdx: fieldStepIndex(t.id, f.key) }); };
  t.fields.forEach(function (f) {
    if (f.showIf && !evalShowIf(f.showIf, inst.data)) return;
    var v = inst.data[f.key];
    if (f.type === 'number' && !isN1Field(t.id, f.key)) {
      var issue = plausibilityIssue(f, v);
      if (issue) push(f, issue.message + ' : ' + frDisplay(v));
    } else if (f.type === 'grid' && Array.isArray(v)) {
      var bad = [];
      v.forEach(function (row) { (row || []).forEach(function (c) { if (plausibilityIssue(f, c)) bad.push(frDisplay(c)); }); });
      if (bad.length) push(f, 'Point(s) inhabituel(s) dans la grille : ' + bad.slice(0, 4).join(', '));
    } else if (isVisitDateField(f)) {
      var di = dateIssue(v, mission);
      if (di) push(f, di);
    }
  });
  // Avis choisi par le technicien (CTA...) « Satisfaisant » alors qu'un critère calculé ne l'est pas
  var key = resolveAvisFieldKey(t);
  var avisField = t.fields.find(function (f) { return f.key === key; });
  if (avisField && avisField.type !== 'computed' && inst.data[key] === 'Satisfaisant') {
    var reasons = verdictReasons(t, inst, key, 'Non Satisfaisant');
    if (reasons.length) push(avisField, 'Avis « Satisfaisant » alors que non satisfaisant : ' + reasons.join(', '));
  }
  if (typeof mesuresAnomalies === 'function') out = out.concat(mesuresAnomalies(t, inst)); // points aberrants, mesures proches du seuil (js/mesures.js)
  return out;
}

// === Infos de mission indispensables au rapport ===

var MISSION_CHAMPS_RAPPORT = [
  ['infosClient', 'nomEntreprise', 'nom du client'],
  ['infosSiteIntervention', 'siteIntervention', 'site d’intervention'],
  ['donneesInternes', 'numeroAffaire', 'n° d’affaire'],
  ['donneesInternes', 'numeroChrono', 'n° de chrono'],
  ['donneesInternes', 'auteurRapport', 'auteur du rapport'],
  ['donneesInternes', 'datesIntervention', 'dates d’intervention'],
  ['donneesInternes', 'dateRapport', 'date du rapport']
];

function missionCoherenceIssues(m) {
  var out = [];
  var manquants = MISSION_CHAMPS_RAPPORT.filter(function (c) { return !String((m[c[0]] || {})[c[1]] || '').trim(); }).map(function (c) { return c[2]; });
  if (manquants.length) out.push('Infos mission à compléter pour le rapport : ' + manquants.join(', ') + '.');
  var rap = parseDateFr(m.donneesInternes && m.donneesInternes.dateRapport);
  var inter = datesInText(m.donneesInternes && m.donneesInternes.datesIntervention);
  if (rap && inter.length && rap.getTime() < Math.min.apply(null, inter.map(Number)) - JOUR_MS) {
    out.push('La date du rapport précède les dates d’intervention.');
  }
  return out;
}

console.log('✓ Contrôles de cohérence chargés');
