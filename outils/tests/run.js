// Tests automatiques de l'appli Aération — à lancer avant chaque livraison :
//   node outils/tests/run.js            (tout)
//   node outils/tests/run.js fusion     (seulement les tests dont le nom contient « fusion »)
//
// Charge les scripts de l'appli dans l'ordre d'index.html (même code que le navigateur, sans
// navigateur) puis vérifie : la mission de démonstration (statuts, avis, vérification), la génération
// du rapport PDF, du compte rendu et de l'export Excel, les fonctions de contrôle et de fusion, et les
// calculs face au Rapso (outils/non-regression-rapso, si le cache des classeurs est présent).
// Code de sortie 1 au moindre échec.

const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const APP = path.resolve(__dirname, '../..');
const FILTER = process.argv[2] || '';

// ————————————————————————————————————————————
// Chargement de l'appli dans un contexte isolé
// ————————————————————————————————————————————

function makeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i], get length() { return m.size; } };
}

function loadApp() {
  const alerts = [];
  const el = () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => null, getContext: () => null });
  const ctx = {
    console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, setInterval() {}, clearInterval() {},
    Uint8Array, Uint16Array, Uint32Array, Int32Array, Float32Array, Float64Array, ArrayBuffer, DataView, TextEncoder, TextDecoder, Promise, Buffer,
    alert: msg => alerts.push(String(msg)), confirm: () => true,
    localStorage: makeStorage(), navigator: { userAgent: 'node' }, location: { reload() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, history: { pushState() {} },
    fetch: () => Promise.reject(new Error('pas de réseau dans les tests'))
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.document = Object.assign(el(), { documentElement: el(), body: el(), createElement: el, getElementById: () => null, querySelectorAll: () => [] });
  vm.createContext(ctx);
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => s !== 'js/app.js');
  for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(APP, s), 'utf8'), ctx, { filename: s });
  ctx.render = () => {};
  ctx.__alerts = alerts;
  return ctx;
}

function dataUrl(p) {
  const b = fs.readFileSync(path.join(APP, p));
  return 'data:image/' + (p.endsWith('.png') ? 'png' : 'jpeg') + ';base64,' + b.toString('base64');
}

function initPdfAssets(ctx) {
  ctx.PDF_ASSETS.logo = dataUrl(ctx.LOGO_PATH);
  ctx.PDF_ASSETS.banner = dataUrl(ctx.BANNER_PATH);
  ctx.PDF_ASSETS.ctaSchema = dataUrl(ctx.CTA_SCHEMA_PATH);
  ctx.PDF_ASSETS.sorbonneSchema = dataUrl(ctx.SORBONNE_SCHEMA_PATH);
  ctx.PDF_ASSETS.dividers = {};
  ctx.SECTION_GROUPS.forEach(g => { ctx.PDF_ASSETS.dividers[g.key] = g.images.map(dataUrl); });
  ctx.PDF_ASSETS.methodo = {};
  Object.keys(ctx.METHODO_IMAGES).forEach(k => { ctx.PDF_ASSETS.methodo[k] = dataUrl(ctx.METHODO_IMAGES[k]); });
}

function loadDemo(ctx) {
  const env = JSON.parse(fs.readFileSync(path.join(APP, 'assets/demo/mission-demo.json'), 'utf8'));
  const m = env.mission;
  ctx.normalizeMission(m);
  return m;
}

const clone = o => JSON.parse(JSON.stringify(o));
const pdfBuffer = dd => new Promise(res => dd.getBuffer(b => res(Buffer.from(b))));
const pageCount = buf => (buf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;

// Cherche des valeurs mal formées (« undefined », « NaN », « [object ») dans une définition pdfmake
function badStrings(node, out = []) {
  if (typeof node === 'string') { if (/undefined|NaN|\[object /.test(node) && !node.startsWith('data:')) out.push(node.slice(0, 60)); }
  else if (Array.isArray(node)) node.forEach(n => badStrings(n, out));
  else if (node && typeof node === 'object') Object.keys(node).forEach(k => { if (typeof node[k] !== 'function') badStrings(node[k], out); });
  return out;
}

// ————————————————————————————————————————————
// Mini-framework
// ————————————————————————————————————————————

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg ? msg + ' : ' : '') + 'obtenu ' + a + ', attendu ' + e);
}

// ————————————————————————————————————————————
// Mission de démonstration
// ————————————————————————————————————————————

test('démo : statuts et avis', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const items = ctx.overviewOrderedItems(m);
  eq(items.length, 27, 'installations');
  const st = { done: 0, inprogress: 0, todo: 0 };
  items.forEach(it => st[it.status.state]++);
  eq(st, { done: 26, inprogress: 1, todo: 0 }, 'statuts');
  const c = { ok: 0, bad: 0, na: 0, open: 0 };
  items.forEach(it => c[ctx.bilanCategory(it)]++);
  eq(c, { ok: 9, bad: 16, na: 1, open: 1 }, 'catégories du bilan');
});

test('démo : vérification avant départ', ctx => {
  const m = loadDemo(ctx);
  const v = ctx.computeVerification(m);
  eq(v.missionIssues, [], 'problèmes de mission');
  const aCompleter = v.items.filter(x => x.notStarted || x.missing.filter(f => f.label !== 'Photo' && !/^Photo/.test(f.label)).length);
  eq(aCompleter.map(x => x.it.inst.data.reference_local), ['Bureau méthodes (à mesurer en démo)'], 'seul le bureau de démo reste à saisir');
  eq(v.items.filter(x => x.anomalies.length).length, 0, 'aucune valeur inhabituelle');
});

test('démo : rapport PDF complet', async ctx => {
  const m = loadDemo(ctx);
  initPdfAssets(ctx);
  const dd = ctx.pdfBuildRapportDocDefinition(m);
  eq(badStrings(dd.content), [], 'valeurs mal formées dans le rapport');
  const buf = await pdfBuffer(ctx.pdfMake.createPdf(dd));
  const pages = pageCount(buf);
  assert(pages >= 55 && pages <= 75, 'nombre de pages inattendu : ' + pages);
});

test('démo : compte rendu de fin de visite (2 pages au plus, signatures avec les remarques)', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  m.compteRendu = { signataire: 'M. Test', fonction: 'Maintenance', remarques: 'RAS', signature: dataUrl('favicon-96x96.png') };
  const dd = ctx.compteRenduDocDefinition(m, dataUrl(ctx.LOGO_PATH));
  eq(badStrings(dd.content), [], 'valeurs mal formées');
  const pages = pageCount(await pdfBuffer(ctx.pdfMake.createPdf(dd)));
  assert(pages >= 1 && pages <= 2, 'pages : ' + pages);
  const fin = dd.content[dd.content.length - 1];
  assert(fin.unbreakable && JSON.stringify(fin).includes('Le représentant du client') && JSON.stringify(fin).includes('Remarques'), 'bloc final insécable remarques + signatures');
});

test('démo : export Excel', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  let wb = null, name = null;
  ctx.XLSX.writeFile = (w, n) => { wb = w; name = n; };
  ctx.exportSyntheseExcel();
  assert(wb, 'classeur non produit');
  assert(/_synthese_aeration\.xlsx$/.test(name), 'nom de fichier : ' + name);
  eq(wb.SheetNames.slice(0, 2), ['Synthèse', 'Mission']);
  eq(wb.SheetNames.length, 17, 'feuilles');
  assert(wb.SheetNames.every(n => n.length <= 31 && n === n.trim()), 'nom de feuille invalide');
  const rows = ctx.XLSX.utils.sheet_to_json(wb.Sheets['Synthèse'], { header: 1 });
  eq(rows.length, 28, 'lignes de synthèse (en-tête + 27)');
});

// ————————————————————————————————————————————
// Contrôles et affichage
// ————————————————————————————————————————————

test('contrôles : valeurs inhabituelles', ctx => {
  const vit = { key: 'vitesse', label: 'Vitesse (m/s)', type: 'number' };
  eq((ctx.plausibilityIssue(vit, '69') || {}).kind, 'hors-plage', '69 m/s');
  eq(ctx.plausibilityIssue(vit, '6,9'), null);
  eq(ctx.plausibilityIssue(vit, '0'), null, 'zéro est un constat valable');
  eq(ctx.plausibilityIssue(vit, '/'), null);
  eq((ctx.plausibilityIssue(vit, '6.9.1') || {}).kind, 'texte', '6.9.1');
  eq(ctx.plausibilityIssue({ key: 'vitesse_reference', label: 'Référence (m/s)', type: 'number' }, '0,5 - 1'), null, 'plage de référence');
  eq((ctx.plausibilityIssue({ key: 'debit', label: 'Débit (m³/h)', type: 'number' }, '250000') || {}).kind, 'hors-plage', '250 000 m³/h');
});

test('contrôles : dates', ctx => {
  const m = { donneesInternes: { datesIntervention: 'du 15/09/2026 au 16/09/2026' } };
  eq(ctx.datesInText('15 et 16/09/2026').length, 2);
  eq(ctx.dateIssue('16/09/2026', m), null);
  assert(/format/.test(ctx.dateIssue('32/01/2026', m)), 'date invalide');
  assert(/futur/.test(ctx.dateIssue('15/09/2099', m)), 'date future');
  assert(/hors des dates/.test(ctx.dateIssue('01/09/2026', m)), 'hors intervention');
});

test('affichage : virgule décimale', ctx => {
  eq(ctx.frDisplay('6.96'), '6,96');
  eq(ctx.frDisplay(1152.58), '1152,58');
  eq(ctx.frDisplay('Satisfaisant'), 'Satisfaisant');
  eq(ctx.frDisplay('15/09/2026'), '15/09/2026');
});

test('identifiants uniques et réparation des doublons', ctx => {
  const ids = Array.from({ length: 20000 }, () => ctx.generateId());
  eq(new Set(ids).size, ids.length, 'generateId');
  const m = ctx.createEmptyMission();
  m.installations.bureaux = [{ id: 7, data: {} }, { id: 7, data: {} }];
  ctx.normalizeMission(m);
  assert(m.installations.bureaux[0].id !== m.installations.bureaux[1].id, 'doublon non réparé');
});

test('import Rapso : apostrophes recalées sur les options', ctx => {
  const d = { ventilation_naturelle: "Présence d'ouvertures haute et basse, diamétralement opposées" };
  ctx.rapsoSnapToOptions('box_peinture', d);
  eq(d.ventilation_naturelle, 'Présence d’ouvertures haute et basse, diamétralement opposées');
});

// ————————————————————————————————————————————
// Fusion de missions (travail à plusieurs)
// ————————————————————————————————————————————

test('fusion : chacun ses installations', ctx => {
  const base = loadDemo(ctx);
  const A = clone(base), B = clone(base);
  A.installations.bureaux[0].data.commentaire = 'Vu par A'; ctx.touchInstallation(A.installations.bureaux[0]);
  B.installations.sanitaires[0].data.observation = 'Vu par B'; ctx.touchInstallation(B.installations.sanitaires[0]);
  B.installations.hottes.push({ id: 424242, data: { batiment: 'Bâtiment Z', reference_equipement: 'Nouvelle hotte' } });
  ctx.state.missions = [A];
  const r = ctx.mergeMissionInto(A, B);
  eq(A.installations.bureaux[0].data.commentaire, 'Vu par A', 'saisie locale conservée');
  eq(A.installations.sanitaires[0].data.observation, 'Vu par B', 'saisie reçue reprise');
  eq(A.installations.hottes.length, 3, 'installation ajoutée');
  eq([r.ajoutees, r.misesAJour, r.conflits.length, r.doublons.length], [1, 1, 0, 0]);
});

test('fusion : modifiée des deux côtés, la plus récente gagne et c’est signalé', ctx => {
  const base = loadDemo(ctx);
  const A = clone(base), B = clone(base);
  A.installations.cta[0].data.observation = 'Version A'; A.installations.cta[0].data._mod = 1000;
  B.installations.cta[0].data.observation = 'Version B'; B.installations.cta[0].data._mod = 2000;
  const r = ctx.mergeMissionInto(A, B);
  eq(A.installations.cta[0].data.observation, 'Version B');
  eq(r.conflits.length, 1, 'conflit signalé');
  const A2 = clone(base), B2 = clone(base);
  A2.installations.cta[0].data.observation = 'Version A'; A2.installations.cta[0].data._mod = 3000;
  B2.installations.cta[0].data.observation = 'Version B'; B2.installations.cta[0].data._mod = 2000;
  ctx.mergeMissionInto(A2, B2);
  eq(A2.installations.cta[0].data.observation, 'Version A', 'version locale plus récente gardée');
});

test('fusion : missions créées séparément, doublons signalés', ctx => {
  const A = ctx.createEmptyMission(), B = ctx.createEmptyMission();
  A.installations.extracteur.push({ id: 1, data: { batiment: 'Atelier', reference_equipement: 'EX-01', vitesse: '5' } });
  B.installations.extracteur.push({ id: 2, data: { batiment: 'Atelier', reference_equipement: 'EX-01', vitesse: '6' } });
  B.installations.extracteur.push({ id: 3, data: { batiment: 'Atelier', reference_equipement: 'EX-02', vitesse: '7' } });
  B.typesSelectionnes = ['extracteur'];
  B.infosClient.nomEntreprise = 'Client B';
  const r = ctx.mergeMissionInto(A, B);
  eq(A.installations.extracteur.length, 3);
  eq(r.doublons.length, 1, 'doublon EX-01');
  eq(A.typesSelectionnes, ['extracteur']);
  eq(A.infosClient.nomEntreprise, 'Client B', 'champ vide complété');
});

test('fusion : fichier identique, rien ne change', ctx => {
  const base = loadDemo(ctx);
  const A = clone(base), before = JSON.stringify(A);
  const r = ctx.mergeMissionInto(A, clone(base));
  eq(r.ajoutees + r.misesAJour + r.conflits.length, 0);
  eq(JSON.stringify(A), before, 'mission modifiée');
});

// ————————————————————————————————————————————
// Relevé pour le dossier de valeurs de référence (js/dvr.js)
// ————————————————————————————————————————————

function dvrLigneDe(ctx, m, typeId, idx, label) {
  const x = ctx.dvrItems(m).find(x => x.it.type.id === typeId && x.it.idx === idx);
  const l = x && x.lignes.find(l => l.def.label === label);
  if (!l) throw new Error('ligne introuvable : ' + typeId + ' #' + idx + ' « ' + label + ' »');
  return l.val;
}

test('valeurs de référence : jamais une valeur non satisfaisante proposée', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  // Hotte satisfaisante : la valeur relevée devient la référence
  const h = dvrLigneDe(ctx, m, 'hottes', 0, 'Vitesse moyenne dans le plan d’ouverture');
  eq([h.origine, h.propose], ['releve', h.releve], 'hotte satisfaisante');
  // Sorbonne non satisfaisante (0,04 m/s) : on propose la valeur normative 0,4, pas la mesure
  const s = dvrLigneDe(ctx, m, 'sorbonnes', 0, 'Vitesse frontale minimale');
  eq([s.origine, s.propose], ['mini', '0,4'], 'sorbonne non satisfaisante');
  // Bureau non satisfaisant : minimum réglementaire proposé, débit relevé laissé à définir
  eq(dvrLigneDe(ctx, m, 'bureaux', 0, 'Débit minimal d’air neuf du local').origine, 'mini');
  eq(dvrLigneDe(ctx, m, 'bureaux', 0, 'Débit d’air neuf relevé (point de comparaison)').origine, 'adefinir');
  // Garde-fou global : toute valeur « relevée » proposée provient d'un critère satisfaisant
  ctx.dvrItems(m).forEach(x => x.lignes.forEach(l => {
    if (l.val.origine !== 'releve') return;
    const avis = x.it.inst.data[l.def.avis || ctx.resolveAvisFieldKey(x.it.type)];
    eq(avis, 'Satisfaisant', x.it.type.id + ' › ' + l.def.label);
  }));
});

test('valeurs de référence : PDF du relevé', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const dd = ctx.dvrDocDefinition(m, dataUrl(ctx.LOGO_PATH));
  eq(badStrings(dd.content), [], 'valeurs mal formées');
  const pages = pageCount(await pdfBuffer(ctx.pdfMake.createPdf(dd)));
  assert(pages >= 2 && pages <= 8, 'pages : ' + pages);
});

test('valeurs de référence : reprises à la visite suivante une fois validées', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const vpe = dvrLigneDe(ctx, m, 'hottes', 0, 'Vitesse moyenne dans le plan d’ouverture').propose;
  ctx.setDvrValidation('20/09/2026');
  const suivante = ctx.createMissionFromPreviousSite(m);
  eq(suivante.installations.hottes[0].data.vpe_moy_reference, vpe, 'référence reprise');
  eq(suivante.installations.sorbonnes[0].data.vitesse_min_reference, '0,4', 'référence normative reprise');
  // Sans validation, rien n'est repris
  ctx.setDvrValidation('');
  const sansValidation = ctx.createMissionFromPreviousSite(m);
  assert(!sansValidation.installations.hottes[0].data.vpe_moy_reference || sansValidation.installations.hottes[0].data.vpe_moy_reference === '/', 'référence reprise sans validation');
});

// ————————————————————————————————————————————
// Local à pollution spécifique et recyclage (js/locaux-specifiques.js)
// ————————————————————————————————————————————

function calc(ctx, typeId, data) { const inst = { id: 1, data: Object.assign({}, data) }; ctx.applyCalculations(typeId, inst); return inst.data; }

test('local spécifique : air neuf R4222-11 / R4222-6, extraction, compensation', ctx => {
  const base = { type_local: 'Ateliers ou Locaux avec Travail Physique Léger', effectif: '6', mode_air_neuf: 'Soufflage mécanique (CTA, centrale)',
    debit_air_neuf: '300', debit_captages: '900', debit_extraction_generale: '400', valeur_reference_extraction: '/', volume: '260',
    constat_compensation: 'Compensation suffisante, sans courant d’air perturbant les captages' };
  let d = calc(ctx, 'local_specifique', base);
  eq([d.debit_min_air_neuf, d.avis_air_neuf], ['270', 'Satisfaisant'], '6 × 45 m³/h');
  eq([d.debit_global_extrait, d.taux_compensation, d.taux_renouvellement], ['1300', '23', '5'], 'bilan');
  eq(d.avis_extraction, 'Sans Objet - Absence de Val. de Réf.');
  eq(d.avis, 'Satisfaisant', 'avis global (sans objet ignoré)');
  d = calc(ctx, 'local_specifique', Object.assign({}, base, { occupants_autres_locaux: '4' }));
  eq(d.debit_min_air_neuf, '450', 'occupants des locaux d’où provient l’air comptés (R4222-11)');
  eq(d.avis, 'Non Satisfaisant');
  d = calc(ctx, 'local_specifique', Object.assign({}, base, { valeur_reference_extraction: '2000' }));
  eq(d.avis_extraction, 'Non Satisfaisant', '1300 < 0,8 × 2000');
  d = calc(ctx, 'local_specifique', Object.assign({}, base, { mode_air_neuf: 'Entrées d’air naturelles (non mesurables)', debit_air_neuf: '' }));
  eq(d.avis_air_neuf, 'Impossible de se prononcer');
  d = calc(ctx, 'local_specifique', Object.assign({}, base, { debit_air_neuf: '200', constat_compensation: 'Impossible de se prononcer' }));
  eq(d.avis, 'Non Satisfaisant', 'une non-conformité connue n’est pas masquée par un critère indéterminé');
});

test('recyclage : R4222-10 (4 et 0,9 mg/m³), R4222-14, contrôle semestriel', ctx => {
  const base = { nature_polluant: 'Poussières sans effet spécifique', destination: 'Dans le même local', etat_epurateur: 'Bon état',
    surveillance_etat: 'Systèmes contrôlés et fonctionnels', type_local: 'Autres ateliers et locaux', effectif: '5',
    mode_air_neuf: 'Soufflage mécanique (CTA, centrale)', debit_air_neuf: '400', conc_gaine: '0,3', ref_gaine: '0,5',
    conc_inhalable: '3', conc_alveolaire: '0,5', mesure_8h: 'Oui', date_controle: '15/09/2026' };
  let d = calc(ctx, 'recyclage', base);
  eq([d.debit_min_air_neuf, d.avis_air_neuf, d.avis_gaine, d.avis_atmosphere, d.avis], ['300', 'Satisfaisant', 'Satisfaisant', 'Satisfaisant', 'Satisfaisant']);
  eq(d.prochain_controle, '15/03/2027', 'art. 4 b : six mois');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { conc_alveolaire: '1,2' })).avis_atmosphere, 'Non Satisfaisant', 'alvéolaire > 0,9');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { conc_inhalable: '4,5' })).avis_atmosphere, 'Non Satisfaisant', 'inhalable > 4');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { mesure_8h: 'Non' })).avis_atmosphere, 'Impossible de se prononcer', 'mesure ponctuelle');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { destination: 'Vers d’autres locaux', meme_nature: 'Non' })).avis, 'Non Satisfaisant', 'R4222-14');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { ref_gaine: '/' })).avis, 'Satisfaisant', 'sans valeur de référence : ignoré');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { surveillance_etat: 'Système défaillant' })).avis, 'Non Satisfaisant');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { nature_polluant: 'Poussières de bois', vlep: '1', conc_inhalable: '1,5' })).avis_atmosphere, 'Non Satisfaisant', 'VLEP bois');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { surveillance_etat: 'Aucun système de surveillance' })).avis, 'Non Satisfaisant', 'R4222-16 : surveillance obligatoire');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { destination: 'Vers un local à pollution non spécifique' })).avis, 'Non Satisfaisant', 'R4222-9');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { information_medecin_cse: 'Non' })).avis, 'Non Satisfaisant', 'R4222-17');
  eq(calc(ctx, 'recyclage', Object.assign({}, base, { information_medecin_cse: 'Non vérifié' })).avis, 'Satisfaisant', 'non vérifié : sans effet');
});

test('local spécifique : sens de l’air vers les locaux voisins (R4212-5)', ctx => {
  const base = { type_local: 'Autres ateliers et locaux', effectif: '2', mode_air_neuf: 'Bouches / grilles mesurées', debit_air_neuf: '200',
    debit_captages: '500', valeur_reference_extraction: '/', constat_compensation: 'Compensation suffisante, sans courant d’air perturbant les captages' };
  eq(calc(ctx, 'local_specifique', Object.assign({}, base, { sens_air: 'Vers les locaux voisins (le local est en surpression)' })).avis, 'Non Satisfaisant');
  eq(calc(ctx, 'local_specifique', Object.assign({}, base, { sens_air: 'Non vérifié' })).avis, 'Satisfaisant', 'non vérifié : sans effet');
  eq(calc(ctx, 'local_specifique', Object.assign({}, base, { sens_air: 'Vers le local (légère dépression)' })).avis, 'Satisfaisant');
});

test('décapage (ED 768) : débit surfacique, grandes cabines, caisson, conduit', ctx => {
  const cab = 'Cabine de décapage au jet libre (opérateur à l’intérieur)';
  let d = calc(ctx, 'decapage', { type_installation: cab, deplacement_air: 'Déplacement vertical de l’air (du plafond vers le sol)',
    longueur: '6', largeur: '4', hauteur: '4', debit_extrait: '10000', etat_depoussiereur: 'Bon état' });
  eq([d.section_ventilee, d.debit_minimal, d.avis_debit, d.grande_cabine], ['24', '9600', 'Satisfaisant', 'Non'], '400 m³/h × 24 m²');
  eq(d.avis, 'Satisfaisant');
  d = calc(ctx, 'decapage', { type_installation: cab, deplacement_air: 'Déplacement horizontal de l’air', longueur: '6', largeur: '4', hauteur: '4', debit_extrait: '10000' });
  eq([d.debit_minimal, d.avis_debit], ['16000', 'Non Satisfaisant'], '1 000 m³/h × (4 × 4)');
  d = calc(ctx, 'decapage', { type_installation: cab, deplacement_air: 'Déplacement vertical de l’air (du plafond vers le sol)', longueur: '16', largeur: '5', hauteur: '5',
    debit_extrait: '40000', debit_introduit: '36000', operations_tres_polluantes: 'Oui', etat_depoussiereur: 'Bon état' });
  eq([d.grande_cabine, d.taux_renouvellement, d.avis_taux], ['Oui', '90', 'Non Satisfaisant'], 'grande cabine très polluante : > 120 vol/h');
  d = calc(ctx, 'decapage', { type_installation: 'Caisson de grenaillage (manipulation par manchons)', vitesse_ouvertures: '2,5', vitesse_conduit: '22', etat_depoussiereur: 'Bon état' });
  eq([d.avis_ouvertures, d.avis_conduit, d.avis], ['Non Satisfaisant', 'Satisfaisant', 'Non Satisfaisant'], 'caisson : 3 m/s');
});

test('fluides de coupe (ED 972) : captage, recyclage, atmosphère', ctx => {
  const base = { type_captage: 'Captage enveloppant (machine capotée)', depression_capot: '30', debit_mesure: '600', debit_reference: '/',
    traitement: 'Rejet à l’extérieur', brouillard: 'Aucun brouillard visible' };
  let d = calc(ctx, 'fluide_coupe', base);
  eq([d.avis_capot, d.avis_debit, d.avis_traitement, d.avis_atelier, d.avis], ['Satisfaisant', 'Sans Objet - Absence de Val. de Réf.', 'Satisfaisant', 'Satisfaisant', 'Satisfaisant']);
  eq(calc(ctx, 'fluide_coupe', Object.assign({}, base, { depression_capot: '10' })).avis, 'Non Satisfaisant', 'capot < 20 Pa');
  eq(calc(ctx, 'fluide_coupe', Object.assign({}, base, { traitement: 'Épurateur sur la machine rejetant dans l’atelier' })).avis, 'Non Satisfaisant');
  eq(calc(ctx, 'fluide_coupe', Object.assign({}, base, { traitement: 'Recyclage centralisé avec by-pass vers l’extérieur', conc_aval: '0,15' })).avis_traitement, 'Non Satisfaisant', 'aval > 0,1');
  eq(calc(ctx, 'fluide_coupe', Object.assign({}, base, { conc_atelier: '0,7', mesure_8h: 'Oui' })).avis_atelier, 'Non Satisfaisant', 'objectif 0,5 mg/m³');
  eq(calc(ctx, 'fluide_coupe', Object.assign({}, base, { type_captage: 'Aucun captage' })).avis, 'Non Satisfaisant', 'R4222-12');
});

test('postes aux solvants (ED 6049) : seuils selon le dispositif', ctx => {
  eq(calc(ctx, 'poste_solvant', { type_dispositif: 'Enceinte ventilée (ouvertures de 10 cm au plus)', vitesse_moyenne: '0,55' }).avis, 'Satisfaisant');
  eq(calc(ctx, 'poste_solvant', { type_dispositif: 'Enceinte ventilée (ouvertures de plus de 10 cm)', vitesse_moyenne: '0,55' }).avis, 'Non Satisfaisant', '0,65 m/s');
  eq(calc(ctx, 'poste_solvant', { type_dispositif: 'Table aspirante / dosseret', vitesse_moyenne: '0,6', vitesse_minimale: '0,3' }).avis, 'Non Satisfaisant', 'point < 0,4');
  eq(calc(ctx, 'poste_solvant', { type_dispositif: 'Bac ou récipient avec fentes d’aspiration', vitesse_point_eloigne: '0,3' }).avis, 'Satisfaisant', '0,25 m/s');
  eq(calc(ctx, 'poste_solvant', { type_dispositif: 'Table aspirante / dosseret', vitesse_moyenne: '0,6', test_fumigene: 'Fuites hors du captage' }).avis, 'Non Satisfaisant');
});

test('nouveaux types : fiches PDF et pictogrammes', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  m.typesSelectionnes.push('decapage', 'fluide_coupe', 'poste_solvant');
  m.installations.decapage.push({ id: 81, data: calc(ctx, 'decapage', { batiment: 'Bâtiment G', reference_equipement: 'Cabine D1', type_installation: 'Cabine de décapage au jet libre (opérateur à l’intérieur)', deplacement_air: 'Déplacement vertical de l’air (du plafond vers le sol)', longueur: '6', largeur: '4', hauteur: '4', debit_extrait: '10000', etat_depoussiereur: 'Bon état' }) });
  m.installations.fluide_coupe.push({ id: 82, data: calc(ctx, 'fluide_coupe', { batiment: 'Bâtiment G', reference_machine: 'Tour CN 3', type_captage: 'Captage enveloppant (machine capotée)', depression_capot: '30', traitement: 'Rejet à l’extérieur', brouillard: 'Aucun brouillard visible' }) });
  m.installations.poste_solvant.push({ id: 83, data: calc(ctx, 'poste_solvant', { batiment: 'Bâtiment G', reference_equipement: 'Fontaine de dégraissage', type_dispositif: 'Table aspirante / dosseret', vitesse_moyenne: '0,6' }) });
  initPdfAssets(ctx);
  const dd = ctx.pdfBuildRapportDocDefinition(m);
  eq(badStrings(dd.content), [], 'valeurs mal formées');
  const txt = JSON.stringify(dd.content);
  ['Cabine D1', 'Tour CN 3', 'Fontaine de dégraissage', 'ED 768', 'ED 972', 'ED 6049'].forEach(k => assert(txt.includes(k), 'absent du rapport : ' + k));
  await pdfBuffer(ctx.pdfMake.createPdf(dd));
  const sansPicto = ctx.INSTALLATION_TYPES.filter(t => !/^picto_/.test(t.icon)).map(t => t.id);
  eq(sansPicto, [], 'types sans pictogramme');
});

test('valeurs de référence : sanitaires classés en pollution spécifique (R4222-3)', ctx => {
  eq(ctx.DVR_CONFIG.sanitaires.cat, 'sp');
});

test('local spécifique et recyclage : rapport PDF, synthèse, anciennes missions', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  eq(Array.isArray(m.installations.local_specifique) && Array.isArray(m.installations.recyclage), true, 'listes ajoutées à une mission existante');
  m.installations.local_specifique.push({ id: 91, data: calc(ctx, 'local_specifique', { batiment: 'Bâtiment C - Laboratoire', reference_local: 'Laboratoire contrôle qualité',
    type_local: 'Ateliers ou Locaux avec Travail Physique Léger', effectif: '4', mode_air_neuf: 'Bouches / grilles mesurées', debit_air_neuf: '0.0', debit_captages: '1031' }) });
  m.installations.recyclage.push({ id: 92, data: calc(ctx, 'recyclage', { batiment: 'Bâtiment F - Menuiserie', reference_equipement: 'Dépoussiéreur DP-01',
    nature_polluant: 'Poussières de bois', conc_gaine: '0,2', mesure_8h: 'Oui', conc_inhalable: '0,8', vlep: '1', date_controle: '15/09/2026' }) });
  const s = ctx.sommeDebitsBatiment(m, 'Bâtiment B - Production', false);
  assert(s.n >= 4 && s.total > 0, 'somme des captages du bâtiment : ' + JSON.stringify(s));
  initPdfAssets(ctx);
  const dd = ctx.pdfBuildRapportDocDefinition(m);
  eq(badStrings(dd.content), [], 'valeurs mal formées');
  const txt = JSON.stringify(dd.content);
  ['LOCAUX A POLLUTION SPECIFIQUE', 'RECYCLAGE DE L’AIR', 'Conclusion sur les locaux à pollution spécifique', 'Dépoussiéreur DP-01', '15/03/2027'].forEach(k => assert(txt.includes(k), 'absent du rapport : ' + k));
  const buf = await pdfBuffer(ctx.pdfMake.createPdf(dd));
  assert(pageCount(buf) > 60, 'pages');
});

// ————————————————————————————————————————————
// Calculs face au Rapso (classeurs réels, cache local non versionné)
// ————————————————————————————————————————————

// Écarts connus et expliqués au 2026-10-03 (cf. en-tête de compare.js) : le test échoue s'il y en a plus.
const ECARTS_RAPSO_CONNUS = 12;

test('calculs : non-régression face au Rapso', () => {
  const rows = path.join(APP, 'outils/non-regression-rapso/rows');
  if (!fs.existsSync(rows) || !fs.readdirSync(rows).length) return 'ignoré (lancer d’abord outils/non-regression-rapso/dump.js)';
  const out = cp.execFileSync(process.execPath, [path.join(APP, 'outils/non-regression-rapso/compare.js')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ko = (out.match(/^✗/gm) || []).length, ok = (out.match(/^✓/gm) || []).length;
  assert(ok > 0, 'aucune comparaison effectuée');
  assert(ko <= ECARTS_RAPSO_CONNUS, ko + ' rubriques en écart (connues : ' + ECARTS_RAPSO_CONNUS + ') — détail : node outils/non-regression-rapso/compare.js');
  return ok + ' rubriques identiques, ' + ko + ' écarts connus';
});

// ————————————————————————————————————————————

(async () => {
  let failed = 0, ran = 0;
  const t0 = Date.now();
  for (const t of tests) {
    if (FILTER && !t.name.includes(FILTER)) continue;
    ran++;
    try {
      const note = await t.fn(loadApp());
      console.log('✓ ' + t.name + (typeof note === 'string' ? '  (' + note + ')' : ''));
    } catch (e) {
      failed++;
      console.log('✗ ' + t.name + '\n    ' + (e && e.message || e));
    }
  }
  console.log('\n' + (ran - failed) + '/' + ran + ' tests réussis en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  process.exit(failed ? 1 : 0);
})();
