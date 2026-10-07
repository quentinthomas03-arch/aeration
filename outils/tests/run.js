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

const { loadApp, dataUrl, initPdfAssets } = require('../charger-appli');

function loadDemo(ctx) {
  const env = JSON.parse(fs.readFileSync(path.join(APP, 'assets/demo/mission-demo.json'), 'utf8'));
  const m = env.mission;
  ctx.normalizeMission(m);
  return m;
}

const clone = o => JSON.parse(JSON.stringify(o));
const { pdfBuffer } = require('../charger-appli');
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
  ctx.exportSyntheseExcelLoaded(); // cœur synchrone (exportSyntheseExcel attend d'abord le chargement de SheetJS)
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

test('valeurs de référence : dossier (installation existante, mise en service) et analyse', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  initPdfAssets(ctx);
  const texte = dd => JSON.stringify(dd.content);
  // Installation existante : valeurs de référence + consigne, pas de descriptif
  ctx.dvrData(m).mode = 'existante';
  let dd = ctx.dossierInstallationDocDefinition(m);
  eq(badStrings(dd.content), [], 'valeurs mal formées (existante)');
  assert(texte(dd).includes('CONSIGNE D’UTILISATION') && !texte(dd).includes('NOTICE D’INSTRUCTIONS : DESCRIPTIF'), 'existante : sans descriptif');
  assert(texte(dd).includes('Q = Qréf × √(P / Préf)'), 'suivi par la pression statique');
  let pages = pageCount(await pdfBuffer(ctx.pdfMake.createPdf(dd)));
  assert(pages >= 8 && pages <= 30, 'pages (existante) : ' + pages);
  // Mise en service : descriptif en plus
  ctx.dvrData(m).mode = 'mise_en_service'; ctx.dvrData(m).dateMiseEnService = '01/09/2026';
  dd = ctx.dossierInstallationDocDefinition(m);
  eq(badStrings(dd.content), [], 'valeurs mal formées (mise en service)');
  assert(texte(dd).includes('NOTICE D’INSTRUCTIONS : DESCRIPTIF') && texte(dd).includes('du 01/09/2026'), 'mise en service : descriptif');
  // Analyse : groupes selon les installations, manques, comparaison aux valeurs du dossier
  ctx.dvrData(m).mode = 'analyse';
  const groupes = ctx.dvrVerifGroupes(m).map(g => g.key);
  eq(groupes, ['dossier', 'ns', 'sp', 'rc'], 'groupes applicables');
  ctx.setDvrVerif('dvr', 'etat', 'present');
  ctx.setDvrVerif('ns_filtres', 'etat', 'absent'); ctx.setDvrVerif('ns_filtres', 'com', 'pertes de charge maximales non indiquées');
  ctx.setDvrVerif('sp_efficacite', 'etat', 'partiel');
  eq(ctx.dvrVerifManques(m).map(x => x.item[0]), ['ns_filtres', 'sp_efficacite'], 'éléments à compléter');
  dd = ctx.dossierInstallationDocDefinition(m);
  eq(badStrings(dd.content), [], 'valeurs mal formées (analyse)');
  assert(texte(dd).includes('pertes de charge maximales non indiquées'), 'précision reprise');
  pages = pageCount(await pdfBuffer(ctx.pdfMake.createPdf(dd)));
  assert(pages >= 4 && pages <= 15, 'pages (analyse) : ' + pages);
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

test('local spécifique : air neuf R4222-11 / R4222-6, extraction, choix des mesures', ctx => {
  const base = { type_local: 'Ateliers ou Locaux avec Travail Physique Léger', effectif: '6', mode_air_neuf: 'Soufflage mécanique (CTA, centrale)',
    debit_air_neuf: '300', debit_captages: '900', debit_extraction_generale: '400', valeur_reference_extraction: '/' };
  let d = calc(ctx, 'local_specifique', base);
  eq([d.debit_min_air_neuf, d.avis_air_neuf], ['270', 'Satisfaisant'], '6 × 45 m³/h');
  eq(d.debit_global_extrait, '1300', 'captages + extraction générale');
  eq(d.avis_extraction, 'Sans Objet - Absence de Val. de Réf.');
  eq(d.avis, 'Satisfaisant', 'avis global (sans objet ignoré)');
  d = calc(ctx, 'local_specifique', Object.assign({}, base, { occupants_autres_locaux: '4' }));
  eq(d.debit_min_air_neuf, '450', 'occupants des locaux d’où provient l’air comptés (R4222-11)');
  eq(d.avis, 'Non Satisfaisant');
  d = calc(ctx, 'local_specifique', Object.assign({}, base, { valeur_reference_extraction: '2000' }));
  eq(d.avis_extraction, 'Non Satisfaisant', '1300 < 0,8 × 2000');
  d = calc(ctx, 'local_specifique', Object.assign({}, base, { mode_air_neuf: 'Entrées d’air naturelles (non mesurables)', debit_air_neuf: '' }));
  eq(d.avis_air_neuf, 'Impossible de se prononcer');
  // Air neuf seul : l'extraction n'est ni calculée ni évaluée
  d = calc(ctx, 'local_specifique', Object.assign({}, base, { mesures_realisees: 'Air neuf seul', valeur_reference_extraction: '2000' }));
  eq([d.debit_global_extrait, d.avis_extraction, d.avis], ['', '', 'Satisfaisant'], 'air neuf seul');
  // Extraction seule : pas d'occupation à renseigner
  d = calc(ctx, 'local_specifique', { mesures_realisees: 'Extraction seule', debit_extraction_generale: '1700', valeur_reference_extraction: '2000' });
  eq([d.debit_min_air_neuf, d.avis_air_neuf, d.avis], ['', '', 'Satisfaisant'], 'extraction seule, 1700 ≥ 0,8 × 2000');
  // Taux de renouvellement : informatif sans taux recommandé, jugé sinon (laboratoire à 10 vol/h)
  d = calc(ctx, 'local_specifique', { mesures_realisees: 'Extraction seule', debit_extraction_generale: '1700', valeur_reference_extraction: '2000', volume: '200' });
  eq([d.taux_renouvellement, d.avis_taux, d.avis], ['8.5', '', 'Satisfaisant'], 'taux informatif');
  d = calc(ctx, 'local_specifique', { mesures_realisees: 'Extraction seule', debit_extraction_generale: '1700', valeur_reference_extraction: '2000', volume: '200', taux_recommande: '10' });
  eq([d.avis_taux, d.avis], ['Non Satisfaisant', 'Non Satisfaisant'], '8,5 < 10 vol/h');
  d = calc(ctx, 'local_specifique', { mesures_realisees: 'Extraction seule', debit_extraction_generale: '1700', valeur_reference_extraction: '/', volume: '150', taux_recommande: '10' });
  eq([d.taux_renouvellement, d.avis], ['11.3', 'Satisfaisant'], 'taux atteint, sans valeur de référence du débit');
  d = calc(ctx, 'local_specifique', { mesures_realisees: 'Extraction seule', debit_extraction_generale: '1700', valeur_reference_extraction: '/' });
  eq(d.avis, 'Sans Objet - Absence de Val. de Réf.', 'extraction seule sans valeur de référence');
  const t = ctx.getInstallationType('local_specifique');
  assert(!t.fields.some(f => /compensation|sens_air/.test(f.key)), 'partie compensation retirée');
  assert(!ctx.evalShowIf(t.fields.find(f => f.key === 'effectif').showIf, { mesures_realisees: 'Extraction seule' }), 'effectif masqué en extraction seule');
  eq(ctx.plaqueHtml('local_specifique', { data: {} }), '', 'pas de plaque signalétique pour un local');
  // Taux déjà retenus proposés sur les autres locaux
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.state.currentInstIndex = 1;
  Object.assign(m.installations.local_specifique[0].data, { taux_recommande: '10', referentiel_taux: 'choix du technicien' });
  const h = ctx.fieldAssistHtml('local_specifique', { key: 'taux_recommande' }, m.installations.local_specifique[1]);
  assert(h.includes('10 vol/h — Analyses chimiques (choix du technicien)'), 'taux proposé : ' + h);
  ctx.lsReprendreTaux(0);
  eq([m.installations.local_specifique[1].data.taux_recommande, m.installations.local_specifique[1].data.referentiel_taux], ['10', 'choix du technicien'], 'taux repris avec sa source');
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

test('bureaux : soufflage sans ouvrant jugé sur l’air neuf, pas sur le volume', ctx => {
  const base = { type_local: 'Bureaux', volume: '30', effectif: '4', ouvrant_exterieur: 'Non', entree_air_exterieur: 'Non' };
  eq(calc(ctx, 'bureaux', Object.assign({}, base, { type_ventilation: 'Soufflage', debit_total_mesure: '400', pourcentage_air_neuf: '100' })).avis, 'Satisfaisant', 'soufflage 400 ≥ 100');
  eq(calc(ctx, 'bureaux', Object.assign({}, base, { type_ventilation: 'Double flux', debit_soufflage: '400', debit_extraction: '380' })).avis, 'Satisfaisant', '% d’air neuf vide : tout l’air soufflé compté');
  eq(calc(ctx, 'bureaux', Object.assign({}, base, { type_ventilation: 'Extraction', debit_total_mesure: '400' })).avis, 'Non Satisfaisant', 'extraction sans entrée d’air : pas d’air neuf');
});

test('pourquoi cet avis : explication fidèle au calcul', ctx => {
  const pq = (typeId, data) => { const inst = { id: 1, data: Object.assign({}, data) }; ctx.applyCalculations(typeId, inst); return { avis: inst.data.avis, txt: ctx.pourquoiAvis(typeId, inst).join(' | ') }; };
  let r = pq('bureaux', { type_local: 'Bureaux', volume: '30', effectif: '4', type_ventilation: 'Soufflage', debit_total_mesure: '400', ouvrant_exterieur: 'Non', entree_air_exterieur: 'Non' });
  assert(r.avis === 'Satisfaisant' && r.txt.includes('25 m³/h × 4 personnes = 100 m³/h') && r.txt.includes('tout l’air soufflé') && r.txt.includes('400 ≥ 100'), r.txt);
  r = pq('bureaux', { type_local: 'Bureaux', volume: '80', effectif: '4', type_ventilation: 'Extraction', debit_total_mesure: '60' });
  assert(r.avis === 'Satisfaisant' && r.txt.includes('volume du local compense'), r.txt);
  r = pq('bureaux', { type_local: 'Bureaux', volume: '80', effectif: '4', type_ventilation: 'Extraction', debit_total_mesure: '600', ouvrant_exterieur: 'Non', entree_air_exterieur: 'Non' });
  assert(r.avis === 'Non Satisfaisant' && r.txt.includes('pas d’apport d’air neuf'), r.txt);
  r = pq('sanitaires', { chambre_erp_individuelle: 'Non', wc_urinoirs: '1', lavabos: '1', individuel_collectif: 'Individuel', debit_mesure: '20' });
  assert(r.avis === 'Satisfaisant' && r.txt.includes('limité à 15 m³/h') && r.txt.includes('privatif'), r.txt);
  r = pq('sanitaires', { chambre_erp_individuelle: 'Non', wc_urinoirs: '4', lavabos: '3', individuel_collectif: 'Collectif', debit_mesure: '100' });
  assert(r.avis === 'Non Satisfaisant' && r.txt.includes('115 m³/h') && r.txt.includes('100 < 115'), r.txt);
  r = pq('local_specifique', { mesures_realisees: 'Air neuf seul', type_local: 'Ateliers ou Locaux avec Travail Physique Léger', effectif: '3', mode_air_neuf: 'Bouches / grilles mesurées', debit_air_neuf: '620' });
  assert(r.avis === 'Satisfaisant' && r.txt.includes('45 m³/h × 3 personnes = 135 m³/h') && r.txt.includes('ne compense pas'), r.txt);
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const h = ctx.pourquoiAvisHtml('hottes', m.installations.hottes[0]);
  assert(h.includes('Pourquoi cet avis ?') && h.includes('Critères évalués'), 'type générique : ' + h.slice(0, 200));
});

test('vue d’ensemble : compteurs-filtres, sous-groupes, retour à la vue d’origine', ctx => {
  const m = loadDemo(ctx);
  m.installations.bureaux = [];
  for (let i = 1; i <= 30; i++) m.installations.bureaux.push({ id: 'b' + i, data: { batiment: 'Bâtiment Z', reference_local: 'Bureau ' + i } });
  m.installations.sanitaires = [{ id: 's1', data: { batiment: 'Bâtiment Z', repere: 'WC 1' } }];
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.state.overviewMode = 'batiment'; ctx.state.overviewExpanded = {}; ctx.state.overviewFiltre = null;
  let h = ctx.renderSiteOverview(m);
  assert(['À faire', 'En cours', 'Non satisf.', 'Terminé'].every(x => h.includes('>' + x + '<')), 'quatre compteurs-filtres');
  assert(!h.includes('Voir tout'), 'plus d’écran « Voir tout »');
  assert(!h.includes('Bureau 12'), 'grand bâtiment replié par défaut');
  ctx.state.overviewExpanded = { 'Bâtiment Z': true };
  h = ctx.renderSiteOverview(m);
  assert(h.includes('overview-sub-header') && h.includes('Bureaux / Salles de réunion') && !h.includes('Bureau 12'), 'sous-groupe par type, replié au-delà de 10');
  ctx.state.overviewExpanded = { 'Bâtiment Z': true, 'Bâtiment Z|bureaux': true };
  assert(ctx.renderSiteOverview(m).includes('Bureau 12'), 'sous-groupe déplié');
  ctx.state.overviewExpanded = {};
  ctx.state.overviewFiltre = 'bad';
  h = ctx.renderSiteOverview(m);
  assert(!h.includes('Bureau 12') && h.includes('aria-pressed="true"'), 'filtre non satisfaisant actif');
  ctx.state.overviewFiltre = 'inprogress';
  assert(ctx.renderSiteOverview(m).includes('Bureau 12'), 'filtre « En cours » : groupe déplié d’office');
  ctx.state.overviewFiltre = null;
  // Fiche ouverte depuis la vue d'ensemble : retour à la vue d'ensemble
  ctx.state.view = 'mission-detail';
  ctx.openOverviewInstallation('bureaux', 3);
  eq([ctx.state.view, ctx.vueRetourFiche()], ['installation-form', 'mission-detail']);
  ctx.state.retourVue = 'type-list';
  eq(ctx.vueRetourFiche(), 'type-list', 'depuis la liste du type');
});

test('plan : filtres sur les épingles, zoom, placement par bâtiment', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.state.overviewMode = 'plan'; ctx.state.planPlacement = null; ctx.state.planZoom = 1;
  const planId = m.plans[0].id;
  m.installations.bureaux = [];
  for (let i = 0; i < 6; i++) m.installations.bureaux.push({ id: 'pb' + i, data: { batiment: i < 3 ? 'Bât X' : 'Bât Y', reference_local: 'B' + i } });
  m.installations.bureaux[0].data._plan = { id: planId, x: 0.5, y: 0.5 };
  ctx.state.overviewFiltre = null;
  const tout = (ctx.renderSiteOverview(m).match(/class="plan-pin /g) || []).length;
  ctx.state.overviewFiltre = 'bad';
  const nsSeules = (ctx.renderSiteOverview(m).match(/class="plan-pin /g) || []).length;
  assert(nsSeules < tout, 'épingles filtrées : ' + nsSeules + ' / ' + tout);
  ctx.state.overviewFiltre = null;
  ctx.state.planZoom = 2;
  assert(ctx.renderSiteOverview(m).includes('style="width:200%;"'), 'zoom × 2');
  // zoom continu (pincement) : valeur quelconque conservée, bornée, et les boutons repartent du palier voisin
  ctx.state.planZoom = 2.37;
  const hz = ctx.renderSiteOverview(m);
  assert(hz.includes('style="width:237%;"') && hz.includes('× 2,4'), 'zoom continu × 2,37');
  eq(ctx.planZoomBorne(50), 6, 'zoom borné au maximum');
  eq(ctx.planZoomBorne(0.3), 1, 'zoom borné au plan entier');
  ctx.state.planZoom = 1;
  ctx.planDemarrerPlacement(planId);
  ctx.planChoisirBatiment('Bât Y');
  eq(ctx.state.planPlacement.key, 'bureaux:3', 'première à placer du bâtiment');
  ctx.planPasser();
  eq(ctx.state.planPlacement.key, 'bureaux:4', 'passer');
  const h = ctx.renderSiteOverview(m);
  assert(h.includes('Bât Y (3)') && h.includes('Bât X (2)'), 'bâtiments restant à placer');
  ctx.state.planPlacement = null;
});

test('questionnaire client : génération, import, reprise cochée', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  let genere = null, nom = '';
  ctx.XLSX.writeFile = (w, n) => { genere = w; nom = n; };
  ctx.telechargerQuestionnaire();
  await new Promise(r => setTimeout(r, 10));
  assert(genere && genere.SheetNames.join() === 'Installations,Site' && /_questionnaire_aeration\.xlsx$/.test(nom), 'classeur généré : ' + nom);
  const items = ctx.overviewOrderedItems(m);
  const bureau = items.find(it => it.type.id === 'bureaux'), hotte = items.find(it => it.type.id === 'hottes');
  bureau.inst.data.effectif = '';
  const entetes = ctx.qcEnTetes(), lb = ctx.qcLigne(bureau), lh = ctx.qcLigne(hotte);
  eq(lh[4], '—', 'effectif sans objet pour une hotte');
  assert(lh[5] && lh[5] !== '—', 'grandeur de référence de la hotte : ' + lh[5]);
  // Le client remplit : effectif du bureau, référence de la hotte, remarque ; feuille Site
  lb[4] = '6'; lh[6] = '0,5'; lh[entetes.length - 1] = 'Hotte arrêtée le vendredi';
  const wb = ctx.XLSX.utils.book_new();
  ctx.XLSX.utils.book_append_sheet(wb, ctx.XLSX.utils.aoa_to_sheet([['Questionnaire'], [], entetes, lb, lh]), 'Installations');
  ctx.XLSX.utils.book_append_sheet(wb, ctx.XLSX.utils.aoa_to_sheet([['Question', 'Réponse'], ['Interlocuteur sur place (nom, téléphone)', 'M. Martin 06 00 00 00 00']]), 'Site');
  const lu = ctx.XLSX.read(ctx.XLSX.write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
  const r = ctx.qcAnalyser(lu, m);
  const eff = r.props.find(p => p.champ === 'effectif');
  assert(eff && eff.valeur === '6' && eff.coche, 'effectif proposé et coché');
  assert(r.props.some(p => p.it.inst === hotte.inst && p.champ !== '_note' && p.valeur === '0,5'), 'référence de la hotte proposée');
  assert(r.props.some(p => p.champ === '_note' && p.affiche === 'Hotte arrêtée le vendredi'), 'remarque en note de visite');
  eq(r.site.length, 1, 'réponse sur le site');
  ctx.state.qc = { props: r.props, site: r.site, siteCoche: true };
  ctx.alert = () => {};
  ctx.qcAppliquer();
  eq(bureau.inst.data.effectif, '6', 'effectif repris');
  assert(m.notesSite.includes('M. Martin'), 'notes du site');
  assert(String(hotte.inst.data._note).includes('Client : Hotte arrêtée'), 'note de la hotte');
});

test('grands sites : niveau, reprendre, à revoir, série, tableau', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.state.overviewMode = 'batiment'; ctx.state.overviewFiltre = null;
  // Niveau : champ ajouté après le bâtiment, dans le schéma et l'étape de saisie
  const tb = ctx.getInstallationType('bureaux');
  eq(tb.fields[tb.fields.findIndex(f => f.key === 'batiment') + 1].key, 'niveau');
  assert(ctx.WIZARD_STEPS.bureaux[0].fields.indexOf('niveau') === 1, 'niveau dans l’identification');
  assert(ctx.duplicationFieldKeys('sanitaires').indexOf('niveau') !== -1, 'niveau repris à la duplication des sanitaires');
  m.installations.bureaux = [];
  for (let i = 1; i <= 10; i++) m.installations.bureaux.push({ id: 'g' + i, data: { batiment: 'Bât N', niveau: i <= 5 ? 'R+1' : 'R+2', reference_local: 'Bureau ' + (100 + i) } });
  ctx.state.overviewExpanded = { 'Bât N': true };
  let h = ctx.renderSiteOverview(m);
  assert(h.includes('Niveau R+1') && h.includes('Niveau R+2'), 'bâtiment rangé par niveau');
  assert(h.includes("ouvrirTableau('bureaux','Bât N','R+1')"), 'lien Tableau du niveau');
  // Dupliquer en série
  ctx.state.currentTypeId = 'bureaux'; ctx.state.currentInstIndex = 9;
  ctx.prompt = () => '3';
  ctx.gsDupliquerSerie('bureaux', 9);
  eq(m.installations.bureaux.slice(10).map(x => x.data.reference_local), ['Bureau 111', 'Bureau 112', 'Bureau 113']);
  eq(m.installations.bureaux[10].data.niveau, 'R+2', 'configuration reprise');
  eq(ctx.gsNomsSerie('Local 09', 2), ['Local 10', 'Local 11']);
  eq(ctx.gsNomsSerie('Atelier', 2), ['Atelier 2', 'Atelier 3']);
  // À revoir et reprendre
  ctx.state.currentInstIndex = 2;
  ctx.gsBasculerRevoir('bureaux');
  ctx.gsMemoriserFiche(m, 'bureaux', m.installations.bureaux[2]);
  h = ctx.renderSiteOverview(m);
  assert(h.includes('>À revoir<') && h.includes('Continuer') && h.includes('Bureau 103'), 'filtre À revoir et reprise');
  ctx.state.overviewFiltre = 'revoir';
  assert((ctx.renderSiteOverview(m).match(/overview-row /g) || []).length === 1, 'filtre à revoir : une ligne');
  ctx.state.overviewFiltre = null;
  const v = ctx.computeVerification(m);
  assert(v.items.some(x => x.aRevoir), 'rappel avant de partir');
  // Saisie en tableau
  ctx.scrollTo = () => {};
  ctx.ouvrirTableau('bureaux', 'Bât N', 'R+1');
  h = ctx.renderSaisieTableau();
  eq((h.match(/<tr>/g) || []).length - 1, 5, 'cinq lignes au niveau R+1');
  const inst = m.installations.bureaux[0];
  Object.assign(inst.data, { type_local: 'Bureaux', type_ventilation: 'Extraction', volume: '40' });
  ctx.document.getElementById = () => null;
  ctx.tbSaisir(0, 'effectif', { value: '2' }, false);
  ctx.tbSaisir(0, 'debit_total_mesure', { value: '80' }, false);
  eq([inst.data.effectif, inst.data.avis], ['2', 'Satisfaisant'], 'avis calculé depuis le tableau');
  ctx.tbAjouterLigne();
  const der = m.installations.bureaux[m.installations.bureaux.length - 1].data;
  eq([der.batiment, der.niveau], ['Bât N', 'R+1'], 'nouvelle ligne dans le bâtiment et le niveau');
});

test('ordre de visite, fiches voisines, reste à faire par bâtiment', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.state.overviewMode = 'batiment';
  const bats = ctx.gsBatimentsDeLaMission(m).map(b => b.nom);
  ctx.gsDeplacerBatiment(bats.length - 1, -1);
  const ordre = ctx.groupByBatiment(ctx.overviewOrderedItems(m)).map(g => g.key);
  eq(ordre[bats.length - 2], bats[bats.length - 1], 'dernier bâtiment remonté d’un cran');
  ctx.gsOrdreAlphabetique();
  assert(!m.ordreBatiments, 'retour à l’ordre alphabétique');
  const items = ctx.overviewOrderedItems(m);
  const v = ctx.gsVoisines(items[1].type.id, items[1].idx);
  assert(v.prec.inst === items[0].inst && v.suiv.inst === items[2].inst, 'fiches voisines dans l’ordre de la liste');
  ctx.state.retourVue = 'saisie-tableau';
  ctx.scrollTo = () => {};
  ctx.gsAllerFiche(items[2].type.id, items[2].idx);
  eq([ctx.state.view, ctx.state.retourVue], ['installation-form', 'saisie-tableau'], 'écran de retour conservé');
  const h = ctx.gsResteParBatimentHtml(items);
  assert(h.includes('Reste à faire par bâtiment') && h.includes('à compléter'), 'reste à faire dans le bilan');
});

test('tri alphabétique dans les bâtiments, recherche par numéro', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.state.overviewMode = 'batiment';
  m.installations.bureaux = [10, 2, 104, 1040].map(n => ({ id: 'n' + n, data: { batiment: 'Bât T', reference_local: 'Bureau ' + n } }));
  m.installations.sanitaires.push({ id: 'wc', data: { batiment: 'Bât T', repere: 'Accueil WC' } });
  const g = ctx.groupByBatiment(ctx.overviewOrderedItems(m)).find(x => x.key === 'Bât T');
  eq(g.items.map(it => ctx.overviewRowTitle(it)), ['Accueil WC', 'Bureau 2', 'Bureau 10', 'Bureau 104', 'Bureau 1040']);
  ctx.state.view = 'mission-detail';
  ctx.overviewSearchEntree('104');
  eq([ctx.state.view, ctx.getCurrentInstallation('bureaux').data.reference_local], ['installation-form', 'Bureau 104'], '« 104 » ouvre Bureau 104, pas 1040');
  ctx.state.view = 'mission-detail';
  ctx.overviewSearchEntree('Bureau');
  eq(ctx.state.view, 'mission-detail', 'plusieurs résultats : rien n’est ouvert');
  assert(typeof ctx.entreeSuivante === 'function', 'touche Entrée branchée');
});

test('fiche : cases manquantes à « Terminé », − / +, commentaire sur plusieurs fiches', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.state.currentTypeId = 'bureaux';
  m.installations.bureaux.push({ id: 'v1', data: { batiment: 'Bât V', reference_local: 'Bureau vide' } });
  ctx.state.currentInstIndex = m.installations.bureaux.length - 1;
  ctx.state.view = 'installation-form';
  ctx.finishInstallation('bureaux', false);
  assert(ctx.state.manquesFiche && ctx.state.manquesFiche.list.some(f => f.label === 'Effectif'), 'cases manquantes signalées');
  eq(ctx.state.view, 'installation-form', 'on reste sur la fiche');
  ctx.state.manquesFiche = null;
  ctx.finishInstallation('bureaux', false, true);
  assert(ctx.state.view !== 'installation-form', 'terminer quand même');
  // − / +
  ctx.state.view = 'installation-form';
  ctx.ficheIncrement('bureaux', 'effectif', 1); ctx.ficheIncrement('bureaux', 'effectif', 1); ctx.ficheIncrement('bureaux', 'effectif', -1);
  eq(m.installations.bureaux[ctx.state.currentInstIndex].data.effectif, '1');
  ctx.ficheIncrement('bureaux', 'effectif', -1); ctx.ficheIncrement('bureaux', 'effectif', -1);
  eq(m.installations.bureaux[ctx.state.currentInstIndex].data.effectif, '0', 'jamais négatif');
  assert(ctx.ficheEstEntier({ key: 'wc_urinoirs' }) && !ctx.ficheEstEntier({ key: 'volume' }), 'nombres entiers seulement');
  // Commentaire sur plusieurs fiches
  const src = ctx.state.currentInstIndex;
  m.installations.bureaux[src].data.commentaire = 'Bouches encrassées.';
  m.installations.bureaux[0].data.commentaire = 'Remarque existante.';
  ctx.state.comMulti = { typeId: 'bureaux', key: 'commentaire', src: src, coches: { 0: true, 1: true } };
  ctx.ficheComAppliquer();
  eq(m.installations.bureaux[0].data.commentaire, 'Remarque existante.\nBouches encrassées.', 'ajouté à la suite');
  ctx.performUndo();
  eq(m.installations.bureaux[0].data.commentaire, 'Remarque existante.', 'annulable');
});

test('compléter à la suite, annuler une valeur remplacée', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.scrollTo = () => {};
  ctx.document.querySelectorAll = () => [];
  const avant = ctx.parcoursCompte(m);
  assert(avant >= 1, 'au moins une fiche incomplète dans la démo');
  ctx.parcoursDemarrer();
  eq([ctx.state.view, ctx.state.retourVue], ['installation-form', 'verification-depart'], 'première fiche incomplète ouverte');
  const premiere = ctx.getCurrentInstallation(ctx.state.currentTypeId);
  ctx.parcoursSuivante();
  if (avant === 1) eq(ctx.state.view, 'verification-depart', 'fin du parcours');
  else assert(ctx.getCurrentInstallation(ctx.state.currentTypeId) !== premiere, 'fiche suivante');
  ctx.parcoursArreter();
  eq(ctx.state.parcoursManques, null);
  // Annuler une valeur remplacée
  ctx.state.currentTypeId = 'bureaux'; ctx.state.currentInstIndex = 0; ctx.state.view = 'installation-form';
  const inst = m.installations.bureaux[0], ancien = inst.data.volume;
  assert(ancien, 'volume renseigné dans la démo');
  ctx.gwField('bureaux', 'volume', '999');
  eq(inst.data.volume, '999');
  assert(ctx.state.undoToast && /remplacé par 999/.test(ctx.state.undoToast.message), 'bandeau Annuler : ' + (ctx.state.undoToast && ctx.state.undoToast.message));
  ctx.performUndo();
  eq(inst.data.volume, ancien, 'valeur retrouvée');
  ctx.state.undoToast = null;
  inst.data.niveau = '';
  ctx.gwField('bureaux', 'niveau', 'R+1');
  assert(!ctx.state.undoToast, 'pas de bandeau à la première saisie');
});

test('rapport : index des installations ; synthèse par bâtiment à part', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  initPdfAssets(ctx);
  const dd = ctx.pdfBuildRapportDocDefinition(m);
  const json = JSON.stringify(dd.content);
  assert(json.includes('INDEX DES INSTALLATIONS') && json.includes('"pageReference":"idx-'), 'index en annexe avec renvois de page');
  const ancres = Object.values(ctx.PDF_INDEX_ANCRES);
  assert(ancres.some(a => a.indexOf('idx-inst-') === 0), 'page exacte pour les types à une fiche par installation');
  ancres.forEach(a => assert(json.includes('"id":"' + a + '"'), 'repère présent : ' + a));
  const pages = pageCount(await pdfBuffer(ctx.pdfMake.createPdf(dd)));
  assert(pages >= 56 && pages <= 78, 'pages du rapport avec l’index : ' + pages);
  const ds = ctx.syntheseBatimentsDocDefinition(m, null);
  eq(badStrings(ds.content), [], 'valeurs mal formées dans la synthèse');
  const js = JSON.stringify(ds.content);
  assert(js.includes('SYNTHÈSE PAR BÂTIMENT') && js.includes('Bâtiment B - Production') && js.includes('fait seul foi'), 'synthèse par bâtiment');
  assert(pageCount(await pdfBuffer(ctx.pdfMake.createPdf(ds))) >= 1, 'PDF de la synthèse');
});

test('observations à rédiger, zip des photos, équilibre double flux, versions du rapport', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  // Observations à rédiger
  const ns = ctx.overviewOrderedItems(m).find(it => it.status.cls === 'status-bad' && ctx.SYNTHESE_CONFIG[it.type.id] && ctx.SYNTHESE_CONFIG[it.type.id].commentaire);
  ns.inst.data[ctx.SYNTHESE_CONFIG[ns.type.id].commentaire] = '';
  assert(ctx.observationsARediger(m).some(x => x.it.inst === ns.inst), 'non satisfaisante sans observation repérée');
  assert(ctx.renderVerificationDepart().includes('Observations à rédiger'), 'rappel avant de partir');
  // Zip : format lisible (signature, entrées, CRC connu)
  ctx.Blob = Blob;
  eq(ctx.crc32(new TextEncoder().encode('123456789')).toString(16), 'cbf43926', 'CRC-32');
  const zip = ctx.zipCreer([{ nom: 'Bât A/photo – 1.jpg', data: new Uint8Array([1, 2, 3]) }, { nom: 'Bât B/x.jpg', data: new Uint8Array([4]) }]);
  assert(zip.size > 100 && zip.type === 'application/zip', 'zip produit');
  // Équilibre double flux
  const d = { type_ventilation: 'Double flux', debit_soufflage: '600', debit_extraction: '380' };
  assert(/surpression/.test(ctx.equilibreDoubleFlux(d)), 'surpression signalée');
  assert(ctx.equilibreDoubleFlux(Object.assign({}, d, { debit_extraction: '560' })) === null, 'écart faible : rien');
  assert(/dépression/.test(ctx.equilibreDoubleFlux(Object.assign({}, d, { debit_extraction: '900' }))), 'dépression signalée');
  // Versions du rapport
  assert(ctx.rapportModifications(m) === null, 'pas de version précédente');
  ctx.rapportMemoriserVersion(m);
  m.donneesInternes.natureRevision = 'Version B';
  const b = m.installations.bureaux[0], avant = b.data.volume;
  b.data.volume = '999'; ctx.applyCalculations('bureaux', b);
  m.installations.bureaux.push({ id: 'nouv', data: { batiment: 'Bât X', reference_local: 'Bureau ajouté' } });
  const res = ctx.rapportModifications(m);
  assert(res && res.ref.nature === 'Version initiale', 'comparaison avec la version initiale');
  const txt = JSON.stringify(res.lignes);
  assert(txt.includes('→ 999') && txt.includes(String(avant)), 'valeur modifiée : ' + txt.slice(0, 200));
  assert(txt.includes('Installation ajoutée'), 'installation ajoutée');
  ctx.rapportMemoriserVersion(m); ctx.rapportMemoriserVersion(m);
  eq(m._versionsRapport.map(v => v.nature), ['Version initiale', 'Version B'], 'une copie par version');
});

test('doublons possibles, notes pour la visite suivante', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  eq(ctx.doublonsPossibles(m).length, 0, 'démo sans doublon');
  const b = m.installations.bureaux[0];
  m.installations.bureaux.push({ id: 'dbl', data: { batiment: b.data.batiment, reference_local: ' ' + b.data.reference_local.toUpperCase() + ' ' } });
  const gr = ctx.doublonsPossibles(m);
  assert(gr.length === 1 && gr[0].length === 2, 'doublon repéré malgré casse et espaces');
  assert(ctx.renderVerificationDepart().includes('Doublons possibles'), 'affiché avant de partir');
  m.installations.bureaux.pop();
  // Notes pour la visite suivante
  m.installations.hottes[0].data._nonControle = { motif: 'Accès impossible', precision: 'nacelle absente' };
  m.installations.hottes[1].data._aRevoir = true;
  ctx.state.memoire = null;
  const props = ctx.memoirePropositions(m);
  assert(props.some(p => /Non contrôlée en \d{4} : Accès impossible \(nacelle absente\)/.test(p.texte)), 'non contrôlée proposée');
  assert(props.some(p => /à revoir/.test(p.texte)), 'à revoir proposé');
  assert(ctx.renderVerificationDepart().includes('Pour la prochaine visite'), 'bloc affiché');
  ctx.memoireAppliquer();
  assert(/Accès impossible/.test(m.installations.hottes[0].data._note), 'note ajoutée');
  ctx.state.memoire = null;
  assert(!ctx.memoirePropositions(m).some(p => p.it.inst === m.installations.hottes[0]), 'pas reproposée une fois notée');
  ctx.performUndo();
  assert(!m.installations.hottes[0].data._note, 'annulable');
});

test('rappel de sauvegarde', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const il_y_a = h => Date.now() - h * 3600 * 1000;
  m.createdAt = new Date(il_y_a(10)).toISOString();
  m.installations.bureaux[0].data._mod = il_y_a(1);
  delete m._sauvegarde;
  assert(ctx.missionsASauvegarder().length === 1 && ctx.rappelSauvegardeHtml().includes('aucune copie envoyée'), 'modifiée, jamais envoyée, créée il y a 10 h');
  ctx.marquerSauvegarde(m);
  eq(ctx.missionsASauvegarder().length, 0, 'copie envoyée');
  m._sauvegarde = il_y_a(7); m.installations.bureaux[0].data._mod = il_y_a(0.5);
  assert(ctx.rappelSauvegardeHtml().includes('il y a 7 h'), 'modifiée après une copie de 7 h');
  m._sauvegarde = il_y_a(2);
  eq(ctx.missionsASauvegarder().length, 0, 'copie récente : pas de rappel');
  m._sauvegarde = il_y_a(8); m.installations.bureaux.forEach(i => { if (i.data._mod > m._sauvegarde) i.data._mod = il_y_a(9); });
  Object.keys(m.installations).forEach(t => m.installations[t].forEach(i => { if (i.data._mod && i.data._mod > m._sauvegarde) i.data._mod = il_y_a(9); }));
  eq(ctx.missionsASauvegarder().length, 0, 'rien modifié depuis la copie : pas de rappel');
});

test('fiches alignées sur le Rapso : cases réclamées, listes avec valeur imposée', ctx => {
  const manques = (typeId, data) => ctx.verifMissingFields(ctx.getInstallationType(typeId), { data }).map(f => f.label);
  // CTA : filtration masquée tant qu'on ne l'affiche pas (bouton du Rapso)
  assert(!manques('cta', {}).some(l => /filtre/i.test(l)), 'filtration CTA non réclamée');
  assert(manques('cta', { afficher_filtration: 'Oui' }).some(l => /Pré-filtre/.test(l)), 'filtration réclamée une fois affichée');
  // Température / pression dans le conduit, commentaires, valeurs N-1 : facultatives
  const ext = manques('extracteur', {});
  assert(!ext.some(l => /Température|Pression statique|N-1|Observation/.test(l)), 'extracteur : ' + ext.join(', '));
  // Locaux de charge : une grille à la fois, rien d'obligatoire dans une grille
  const lc = manques('locaux_charge', {});
  assert(!lc.some(l => /Largeur|Diamètre|Valeur mesurée/.test(l)), 'grilles non réclamées : ' + lc.join(', '));
  const t = ctx.getInstallationType('locaux_charge'), f2 = t.fields.find(f => f.key === 'grille2_largeur');
  assert(!ctx.evalShowIf(f2.showIf, {}), 'grille 2 masquée');
  assert(ctx.evalShowIf(f2.showIf, { grille1_diametre: '30' }), 'grille 2 affichée après la grille 1');
  // Bras : commentaire seulement si non adapté ; vitesse de captage imposée par la condition (liste Rapso)
  const bras = ctx.getInstallationType('bras_aspiration');
  const com = bras.fields.find(f => f.key === 'commentaire_1');
  assert(!ctx.evalShowIf(com.showIf, { adapte_situation: 'Oui' }) && ctx.evalShowIf(com.showIf, { adapte_situation: 'Non' }), 'commentaire si non adapté');
  const inst = { data: { conditions_dispersion: 'Emission à faible vitesse en air modérément calme', vitesse_captage: '2' } };
  ctx.applyCalculations('bras_aspiration', inst);
  eq(inst.data.vitesse_captage, '0.5', 'vitesse imposée');
  const gaz = { data: { conditions_dispersion: 'Gaz et vapeurs', vitesse_captage: '0.3' } };
  ctx.applyCalculations('bras_aspiration', gaz);
  eq(gaz.data.vitesse_captage, '0.3', 'gaz et vapeurs : saisie gardée');
  const cond = bras.fields.find(f => f.key === 'conditions_dispersion');
  assert(ctx.selectOptionsHtml(cond, '').includes('modérément calme — 0,5 m/s'), 'vitesse affichée dans la liste');
  assert(ctx.selectOptionsHtml(cond, 'Projection à grande vitesse').includes('selected>Projection à grande vitesse'), 'ancienne valeur conservée');
});

test('torches : un point tant que le nombre n’est pas choisi ; reprise depuis une installation voisine', ctx => {
  const t = ctx.getInstallationType('torches_aspirantes');
  const vis = (key, data) => { const f = t.fields.find(x => x.key === key); return ctx.evalShowIf(f.showIf, data); };
  assert(vis('torche1_vitesse_centre', {}) && !vis('torche2_vitesse_centre', {}), 'un seul point par défaut');
  assert(vis('torche3_vitesse_centre', { nombre_points_mesure: '3' }) && !vis('torche4_vitesse_centre', { nombre_points_mesure: '3' }), '3 points choisis');
  assert(vis('torche5_vitesse_centre', { torche5_vitesse_centre: '80' }), 'point déjà rempli (ancienne fiche) toujours affiché');
  const manques = ctx.verifMissingFields(t, { data: {} }).length;
  assert(manques < 12, 'fiche vierge : ' + manques + ' cases réclamées');

  const m = { id: 'm1', installations: { sorbonnes: [
    { id: 'a', data: { reference_equipement: 'SO-01', temperature: '21.5', hygrometrie: '45', pression_atmospherique: '1013', appareils_mesure: 'KIMO' } },
    { id: 'b', data: { reference_equipement: 'SO-02' } }],
    bras_aspiration: [
    { id: 'c', data: { reference_equipement: 'P1', etat_visuel: 'En bon état', etat_conduits: 'En bon état', test_fumigene: 'Non réalisé', conditions_dispersion: 'Gaz et vapeurs', vitesse_moyenne: '8' } },
    { id: 'd', data: { reference_equipement: 'P2', test_fumigene: 'Non réalisé' } }] }, typesSelectionnes: ['sorbonnes', 'bras_aspiration'] };
  ctx.state.missions = [m]; ctx.state.currentMissionId = 'm1'; ctx.state.currentInstIndex = 1;
  const steps = ctx.WIZARD_STEPS.sorbonnes, etape = steps.findIndex(s => s.title === 'Mesures ambiantes');
  const html = ctx.repriseVoisineHtml('sorbonnes', steps, etape, m.installations.sorbonnes[1]);
  assert(html.includes('SO-01') && html.includes('21,5 °C'), 'bouton de reprise : ' + html.slice(0, 120));
  ctx.repriseVoisineAppliquer('sorbonnes', 0, etape);
  eq(m.installations.sorbonnes[1].data.temperature, '21.5', 'température reprise');
  eq(m.installations.sorbonnes[1].data.appareils_mesure, 'KIMO', 'appareils repris');
  eq(ctx.repriseVoisineHtml('sorbonnes', steps, etape, m.installations.sorbonnes[1]), '', 'plus de bouton une fois repris');
  // Bras : constats repris, jamais la mesure ; un seul champ à gagner = pas de bouton
  const sb = ctx.WIZARD_STEPS.bras_aspiration, ev = sb.findIndex(s => s.title === 'État visuel');
  const hb = ctx.repriseVoisineHtml('bras_aspiration', sb, ev, m.installations.bras_aspiration[1]);
  assert(hb.includes('P1') && !hb.includes('Non réalisé'), 'bouton bras sans le champ déjà identique : ' + hb.slice(0, 160));
  ctx.repriseVoisineAppliquer('bras_aspiration', 0, ev);
  const d = m.installations.bras_aspiration[1].data;
  eq([d.etat_visuel, d.etat_conduits, d.conditions_dispersion, d.vitesse_moyenne], ['En bon état', 'En bon état', 'Gaz et vapeurs', undefined], 'constats repris, pas la mesure');
  const ad = sb.findIndex(s => s.title === 'Adaptation & recyclage');
  eq(ctx.repriseVoisineHtml('bras_aspiration', sb, ad, d), '', 'rien à reprendre');
});

test('recyclage : rapport semestriel autonome, synthèse sans « conforme » non contrôlé', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  initPdfAssets(ctx);
  const d = m.installations.recyclage[0].data;
  eq([d.avis_cinquieme, d.avis_surveillance, d.avis], ['Satisfaisant', 'Satisfaisant', 'Satisfaisant'], 'démo conforme');
  // Surveillance non testée : jamais « conforme »
  const inst = JSON.parse(JSON.stringify(m.installations.recyclage[0]));
  inst.data.surveillance_test = 'Non testés';
  ctx.applyCalculations('recyclage', inst);
  const l = ctx.rrLignesSynthese(inst.data).find(x => /systèmes de surveillance$/.test(x[0]));
  eq(l[2], 'Impossible de se prononcer', 'surveillance non testée');
  eq(inst.data.avis, 'Impossible de se prononcer', 'avis global');
  // Dépassement du 1/5 de la VLEP (bois : 1 mg/m³ → 0,2)
  inst.data.surveillance_test = ctx.RC_TESTS[0]; inst.data.dt_total = '0,35';
  ctx.applyCalculations('recyclage', inst);
  eq([inst.data.conc_inhalable_gaine, inst.data.avis_cinquieme], ['0.35', 'Non Satisfaisant'], 'dépassement');
  // Facteur de correction appliqué
  inst.data.dt_total = '0,15'; inst.data.dt_facteur = '2';
  ctx.applyCalculations('recyclage', inst);
  eq(inst.data.conc_inhalable_gaine, '0.3', 'facteur de correction');
  // Ancienne fiche (concentration unique, état de surveillance) toujours évaluée
  const ancienne = { data: { nature_polluant: 'Poussières sans effet spécifique', destination: 'Dans le même local', etat_epurateur: 'Bon état',
    surveillance_etat: 'Systèmes contrôlés et fonctionnels', methode_mesure: 'Appareil à lecture directe', conc_gaine: '0,3', fraction_gaine: 'Fraction inhalable' } };
  ctx.applyCalculations('recyclage', ancienne);
  eq([ancienne.data.conc_inhalable_gaine, ancienne.data.avis_cinquieme, ancienne.data.avis_surveillance], ['0.3', 'Satisfaisant', 'Satisfaisant'], 'ancienne fiche');
  // Rapport
  const dd = ctx.pdfBuildRecyclageDocDefinition(m);
  eq(badStrings(dd.content), [], 'valeurs mal formées');
  const pages = pageCount(await pdfBuffer(ctx.pdfMake.createPdf(dd)));
  assert(pages >= 6 && pages <= 12, 'pages : ' + pages);
  // Mission « recyclage seul » : le bouton Rapport PDF produit ce rapport
  assert(ctx.rrMissionRecyclageSeule({ typesSelectionnes: ['recyclage'] }) && !ctx.rrMissionRecyclageSeule(m), 'recyclage seul');
});

test('plans en PDF : nom du niveau lu dans la page', ctx => {
  eq(ctx.planNomDepuisTexte('PLAN D’EVACUATION - REZ-DE-CHAUSSEE - Bât A'), 'RDC');
  eq(ctx.planNomDepuisTexte('Niveau R+1 bureaux'), 'R+1');
  eq(ctx.planNomDepuisTexte('Plan sous-sol -1 parking'), 'Sous-sol -1');
  eq(ctx.planNomDepuisTexte('2ème étage administratif'), '2ème étage');
  eq(ctx.planNomDepuisTexte('Légende extincteurs'), '');
});

test('démo complète : tous les types, avis calculés, rapport sans valeur mal formée', async ctx => {
  const env = JSON.parse(fs.readFileSync(path.join(APP, 'assets/demo/mission-demo-complete.json'), 'utf8'));
  const m = env.mission;
  ctx.normalizeMission(m);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  ctx.INSTALLATION_TYPES.forEach(t => assert((m.installations[t.id] || []).length > 0, 'type présent : ' + t.id));
  eq(m.typesSelectionnes.length, ctx.INSTALLATION_TYPES.length, 'tous les types sélectionnés');
  // Avis enregistrés = avis recalculés (la démo n'a pas d'avis écrit à la main)
  Object.keys(m.installations).forEach(t => (m.installations[t] || []).forEach(i => {
    const avant = JSON.stringify(i.data); ctx.applyCalculations(t, i);
    eq(JSON.stringify(i.data), avant, 'calculs à jour : ' + t + ' ' + ctx.overviewRowTitle({ type: ctx.getInstallationType(t), inst: i, idx: 0 }));
  }));
  initPdfAssets(ctx);
  const dd = ctx.pdfBuildRapportDocDefinition(m);
  eq(badStrings(dd.content), [], 'valeurs mal formées');
  const pages = pageCount(await pdfBuffer(ctx.pdfMake.createPdf(dd)));
  assert(pages > 75, 'pages : ' + pages);
});

test('bâtiments proposés, liste des niveaux', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const vide = { data: {} };
  const connus = ctx.gsBatimentsConnus(vide);
  eq(connus[0], 'Bâtiment B - Production', 'le plus utilisé en premier');
  const h = ctx.gwBigText('bureaux', ctx.getInstallationType('bureaux').fields.find(f => f.key === 'batiment'), vide);
  const hd = h.replace(/&#39;/g, "'").replace(/&#039;/g, "'");
  assert(hd.includes('bat-suggestions') && hd.includes("gwField('bureaux','batiment','Bâtiment B - Production');"), 'bâtiments proposés sous la case');
  const n = ctx.gwBigText('bureaux', ctx.getInstallationType('bureaux').fields.find(f => f.key === 'niveau'), { data: { niveau: 'Mezzanine' } });
  assert(n.includes('<select') && n.indexOf('>RDC<') < n.indexOf('>R+1<') && n.indexOf('>R+5<') < n.indexOf('>R-1<') && n.includes('<option selected>Mezzanine</option>') && n.includes('Autre…'), 'liste des niveaux, étages avant sous-sols, valeur libre gardée');
});

test('sanitaires : WC, douches, lavabos vides = 0, jamais manquants', ctx => {
  const t = ctx.getInstallationType('sanitaires');
  const inst = { data: { batiment: 'Bât S', repere: 'WC accueil', nom_usage: 'sanitaires', chambre_erp_individuelle: 'Non', wc_urinoirs: '1', individuel_collectif: 'Collectif', debit_mesure: '40', nombre_bouches: '1', etat_bouches: 'En bon état' } };
  ctx.applyCalculations('sanitaires', inst);
  eq([inst.data.debit_min_reglementaire, inst.data.avis], ['30', 'Satisfaisant'], 'douches et lavabos vides = 0');
  const manquants = ctx.verifMissingFields(t, inst).map(f => f.label);
  assert(!manquants.some(l => /Douches|Lavabos/.test(l)), 'pas signalés manquants : ' + manquants.join(', '));
  const f = t.fields.find(x => x.key === 'douches');
  assert(ctx.fieldLabelWithTag(f, ctx.fieldState(f, inst)).includes('vide = 0'), 'repère « vide = 0 »');
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

test('plan du site : épingles, visite suivante, fusion, page du rapport', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  eq(m.plans.length, 1, 'plan de la démo');
  const placed = ctx.planPlacedItems(m, m.plans[0].id);
  eq(placed.length, 27, 'installations épinglées');
  eq(placed.map(p => p.n), placed.map((_, i) => i + 1), 'numérotation continue');
  assert(placed.every(p => p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1), 'coordonnées relatives');
  // Visite suivante : le plan et les emplacements reviennent
  const suivante = ctx.createMissionFromPreviousSite(m);
  eq(suivante.plans.length, 1, 'plan repris');
  eq(ctx.planPlacedItems(suivante, m.plans[0].id).length, 27, 'emplacements repris');
  // Fusion : le plan d'un collègue est ajouté une seule fois
  const A = ctx.createEmptyMission(); ctx.mergeMissionInto(A, clone(m)); ctx.mergeMissionInto(A, clone(m));
  eq(A.plans.length, 1, 'plan ajouté par la fusion');
  // Page « 4.2 Plan du site » (image composée remplacée ici par une image de test)
  initPdfAssets(ctx);
  ctx.PDF_ASSETS.plans = { [m.plans[0].id]: dataUrl('favicon-96x96.png') };
  const page = ctx.pdfBuildPlansSite(m);
  const txt = JSON.stringify(page);
  assert(txt.includes('4.2 PLAN DU SITE') && txt.includes('Sorbonne SO-01'), 'page du plan');
  eq(page.find(n => n.table).table.body.length, 28, 'légende : en-tête + 27');
  eq(badStrings(page), [], 'valeurs mal formées');
  // Sans image composée (pas de navigateur), pas de page vide
  ctx.PDF_ASSETS.plans = {};
  eq(ctx.pdfBuildPlansSite(m).length, 0);
});

test('documents joints et schéma de réseau : rattachements, visite suivante, fusion, rapport, fichier piégé', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const sc = m.schemas[0];
  eq(sc.elements.filter(e => e.k === 'inst' && e.inst).length, 3, 'installations de la démo rattachées');
  // Sens de l'air et rôle des gaines déduits du réseau (ventilateur commun, division vers rejet et retour)
  ctx.schemaItemsParId(m);
  const o = ctx.schemaOrientation(sc), lien = (a, b) => sc.liens.find(l => (l.a === a && l.b === b) || (l.a === b && l.b === a)).id;
  const sens = (a, b) => { const x = o[lien(a, b)]; return x.de + '>' + x.vers + ':' + x.genre; };
  eq([sens('e_scie', 'n_1'), sens('e_toupie', 'n_1'), sens('n_1', 'e_depous'), sens('e_depous', 'e_ventil')],
    ['e_scie>n_1:aspiration', 'e_toupie>n_1:aspiration', 'n_1>e_depous:aspiration', 'e_depous>e_ventil:aspiration'], 'aspiration vers le ventilateur');
  eq([sens('e_ventil', 'n_2'), sens('n_2', 'e_rejet'), sens('n_2', 'e_retour')],
    ['e_ventil>n_2:refoulement', 'n_2>e_rejet:refoulement', 'n_2>e_retour:recyclage'], 'refoulement et recyclage après le ventilateur');
  // Division : toucher une gaine crée un piquage sans changer le tracé
  const sp = clone(sc), avant = sp.liens.length;
  const nid = ctx.schemaCreerPiquage(sp, lien('e_toupie', 'n_1'), 300, 384);
  eq([sp.liens.length, sp.elements.find(e => e.id === nid).k], [avant + 1, 'noeud'], 'piquage inséré');
  ctx.schemaSupprimerDe(sp, { type: 'el', id: nid });
  eq(sp.liens.length, avant, 'piquage supprimé : gaine recousue');
  // Anciens schémas (v1-2) convertis : postes -> installations, registres / mesures -> piquages, textes retirés
  const ancien = { id: 'sc_x', nom: 'x', ratio: 0.7, elements: [{ id: 'a', k: 'poste', x: 0.1, y: 0.1, inst: 1022 }, { id: 'b', k: 'registre', x: 0.3, y: 0.1 }, { id: 'c', k: 'note', x: 0.5, y: 0.5, t: 'Texte' }, { id: 'd', k: 'ventilateur', x: 0.6, y: 0.1 }],
    liens: [{ id: 'l1', a: 'a', b: 'b', g: 'aspiration' }, { id: 'l2', a: 'b', b: 'd' }, { id: 'l3', a: 'c', b: 'd' }] };
  ctx.schemaMigrer(ancien);
  eq([ancien.v, ancien.elements.map(e => e.k).join(','), ancien.liens.length], [3, 'inst,noeud,ventilateur', 2], 'ancien schéma converti');
  const proposees = ctx.schemaInstallationsDuSchema(m, sc);
  assert(proposees.length >= 3 && proposees.every(it => ['menuiserie_bis', 'recyclage'].includes(it.type.id)), 'seules les installations des types du réseau sont proposées');
  eq(ctx.schemaInstallationsDuSchema(m, Object.assign({}, sc, { types: [] })).length, 27, 'types vides : toutes les installations');
  const nomencl = ctx.schemaNomenclature(m, sc);
  eq(nomencl.map(r => r.n), [1, 2, 3], 'installations numérotées');
  eq(ctx.schemaLegendeContenu(m, sc).gaines, ['aspiration', 'refoulement', 'recyclage'], 'gaines de la légende');
  m.documentsJoints = [{ id: 'dj_1', nom: 'Plan réseau client', source: 'pdf', pages: ['ph_a', 'ph_b'], instIds: [1022], rapport: true }];
  // Visite suivante : nouveaux identifiants d'installation, rattachements suivis
  const suivante = ctx.createMissionFromPreviousSite(m);
  const scieId = suivante.installations.menuiserie_bis[0].id;
  assert(scieId !== 1022, 'nouvel identifiant');
  eq(suivante.documentsJoints[0].instIds, [scieId], 'document rattaché à la nouvelle installation');
  eq(suivante.schemas[0].elements.find(e => e.id === 'e_scie').inst, scieId, 'poste du schéma rattaché');
  eq(suivante.schemas[0].liens.length, sc.liens.length, 'gaines reprises');
  // Fusion : ajoutés une seule fois
  const A = ctx.createEmptyMission(); ctx.mergeMissionInto(A, clone(m)); ctx.mergeMissionInto(A, clone(m));
  eq([A.documentsJoints.length, A.schemas.length], [1, 1], 'fusion');
  // Fichier .json piégé : identifiants et symboles assainis
  const piege = clone(m);
  piege.documentsJoints.push({ id: "x');alert(1);//", nom: 'x', pages: ['ph_c'] });
  piege.schemas[0].elements.push({ id: 'e"><script>', k: 'inst', x: 9, y: 'a' }, { id: 'e_ok', k: '<img>', x: 2, y: -1, t: '<b>' }, { id: 'e_ko', k: 'inst', x: 0.5, y: 0.5, t: '<i>x</i>' });
  piege.schemas[0].liens.push({ id: 'l_x', a: 'e_scie', b: 'e_ok', t: '<u>' });
  ctx.normalizeMission(piege);
  const eok = piege.schemas[0].elements.find(e => e.id === 'e_ok');
  eq(eok.k, 'noeud', 'type d’élément inconnu neutralisé');
  eq(piege.documentsJoints.length, 1, 'document à identifiant piégé écarté');
  const ok = piege.schemas[0].elements.find(e => e.id === 'e_ok');
  eq([ok.x, ok.y], [1, 0], 'coordonnées bornées');
  const svg = ctx.schemaSvg(piege, piege.schemas[0], { legende: true });
  assert(!svg.includes('<script') && !svg.includes('<b>') && !svg.includes('<img') && !svg.includes('<i>') && !svg.includes('<u>'), 'SVG sans balise injectée');
  assert(svg.includes('Gaines (la flèche') && svg.includes('Équipements'), 'légende dans le SVG du rapport');
  // Rapport : 3.3, 4.3 et annexe (images de test à la place des rendus du navigateur)
  initPdfAssets(ctx);
  const img = dataUrl('favicon-96x96.png');
  ctx.PDF_ASSETS.docs = { ph_a: { url: img, w: 100, h: 140 }, ph_b: { url: img, w: 140, h: 100 } };
  ctx.PDF_ASSETS.schemas = { [sc.id]: { url: img, w: 1800, h: 1300 } };
  const dd = ctx.pdfBuildRapportDocDefinition(m);
  const txt = JSON.stringify(dd.content);
  assert(txt.includes('3.3    DOCUMENTS JOINTS') && txt.includes('4.3 SCHEMAS DES RESEAUX') && /5\.\d+ DOCUMENTS JOINTS — Document n° 1 : Plan réseau client \(page 2\/2\)/.test(txt), 'sections du rapport');
  assert(txt.includes('sans valeur de plan d’exécution'), 'mention de schéma de principe');
  eq(badStrings(dd.content), [], 'valeurs mal formées');
  const buf = await pdfBuffer(ctx.pdfMake.createPdf(dd));
  assert(pageCount(buf) > 10, 'PDF produit');
  // Hors rapport : rien n'est ajouté
  m.documentsJoints[0].rapport = false; sc.rapport = false;
  eq([ctx.pdfBuildDocsJointsListe(m).length, ctx.pdfBuildSchemas(m).length, ctx.pdfBuildDocsJointsAnnexe(m, 'x').length], [0, 0, 0], 'hors rapport');
});

test('étiquettes QR : codes, visite suivante, duplication, planche PDF, ouverture', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const items = ctx.overviewOrderedItems(m), used = {};
  items.forEach(it => ctx.qrCodeInstallation(it.inst, used));
  const codes = items.map(it => it.inst.data._qr);
  eq(new Set(codes).size, 27, 'un code distinct par installation');
  assert(codes.every(c => /^[A-Z2-9]{8}$/.test(c) && !/[01IO]/.test(c)), 'codes lisibles');
  eq(ctx.qrExtraireCode('https://x.github.io/aeration/?qr=' + codes[0]), codes[0], 'code lu dans l’adresse');
  eq(ctx.qrExtraireCode(codes[0].slice(0, 4).toLowerCase() + '-' + codes[0].slice(4)), codes[0], 'référence tapée à la main');
  eq(ctx.qrExtraireCode('https://exemple.com'), null, 'QR étranger refusé');
  const suivante = ctx.createMissionFromPreviousSite(m);
  eq(ctx.overviewOrderedItems(suivante).map(it => it.inst.data._qr).sort(), codes.slice().sort(), 'codes repris à la visite suivante');
  ctx.state.currentMissionId = m.id;
  ctx.duplicateInstallation('hottes', 0);
  assert(!m.installations.hottes[1].data._qr, 'pas de code sur une copie');
  const piege = clone(m); piege.installations.hottes[0].data._qr = '<img src=x>';
  ctx.normalizeMission(piege);
  assert(!piege.installations.hottes[0].data._qr, 'code piégé supprimé');
  // Planche : nom de l'installation sous chaque QR, 21 par page
  const dd = ctx.qrEtiquettesDocDefinition(m, items);
  eq(dd.content.length, 27);
  const txt = JSON.stringify(dd.content[0]);
  assert(txt.includes('"qr":') && txt.includes(ctx.overviewRowTitle(items[0])), 'QR + nom de l’installation');
  eq(dd.content.filter(b => b.pageBreak).length, 1, 'deux planches');
  const buf = await pdfBuffer(ctx.pdfMake.createPdf(dd));
  eq(pageCount(buf), 2, 'PDF de 2 pages');
  // Scan : ouvre la bonne installation, dans la mission la plus récente qui la contient
  suivante.createdAt = '2099-01-01T00:00:00Z';
  ctx.state.missions = [m, suivante]; ctx.state.currentMissionId = null;
  const cible = items.find(it => it.type.id === 'sorbonnes');
  assert(ctx.qrOuvrirCode(cible.inst.data._qr), 'code trouvé');
  eq([ctx.state.currentMissionId, ctx.state.currentTypeId, ctx.state.view], [suivante.id, 'sorbonnes', 'installation-form'], 'fiche ouverte dans la mission de l’année');
});

test('version : appli, cache hors ligne (sw.js) et Nouveautés concordent', ctx => {
  const sw = fs.readFileSync(path.join(APP, 'sw.js'), 'utf8');
  const cache = (sw.match(/CACHE_NAME = 'aeration-v([\d.]+)'/) || [])[1];
  eq(cache, ctx.APP_VERSION, 'sw.js CACHE_NAME = APP_VERSION (sinon les téléphones ne voient pas la mise à jour)');
  eq(ctx.NOUVEAUTES[0].version, ctx.APP_VERSION, 'première entrée des Nouveautés');
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  const manquants = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !sw.includes("'./" + s + "'"));
  eq(manquants, [], 'chaque script d’index.html est dans le cache hors ligne');
});

test('photo de la plaque : reprise à la visite suivante, jamais copiée par « Dupliquer »', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  m.installations.cta[0].data._plaque = 'ph_plaque1';
  assert(ctx.docsPhotoIds(m).includes('ph_plaque1') && ctx.referencedPhotoIds().ph_plaque1, 'photo référencée (export, nettoyage)');
  eq(ctx.createMissionFromPreviousSite(m).installations.cta[0].data._plaque, 'ph_plaque1', 'reprise l’an prochain');
  ctx.state.currentMissionId = m.id; ctx.duplicateInstallation('cta', 0);
  assert(!m.installations.cta[1].data._plaque, 'pas copiée sur un doublon');
  const piege = clone(m); piege.installations.cta[0].data._plaque = '"><img src=x>';
  ctx.normalizeMission(piege);
  assert(piege.installations.cta[0].data._plaque === undefined, 'identifiant piégé supprimé');
  eq(ctx.plaqueHtml('bureaux', m.installations.bureaux[0]), '', 'pas de plaque pour un bureau');
});

test('préparer la visite : notes reprises, matériel déduit des fiches', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  m.notesSite = 'Badge à l’accueil'; m.installations.sorbonnes[0].data._note = 'Labo fermé le vendredi';
  const s = ctx.createMissionFromPreviousSite(m);
  eq([s.notesSite, s.installations.sorbonnes[0].data._note], ['Badge à l’accueil', 'Labo fermé le vendredi'], 'notes reprises l’an prochain');
  const mat = ctx.materielMission(m).map(x => x.k);
  ['anemometre', 'debit', 'manometre', 'fumigene', 'concentration', 'metre'].forEach(k => assert(mat.includes(k), 'matériel ' + k));
  const sorb = ctx.materielPourType(ctx.getInstallationType('sorbonnes'));
  assert(sorb.fumigene && sorb.anemometre && sorb.ambiance, 'sorbonnes : fumigène, anémomètre, conditions ambiantes');
  assert(!ctx.materielPourType(ctx.getInstallationType('bureaux')).fumigene, 'pas de fumigène pour un bureau');
  const html = ctx.renderPreparation();
  assert(html.includes('Badge à l’accueil') && html.includes('Labo fermé le vendredi') && html.includes('Générateur de fumée'), 'écran de préparation');
});

test('temps passé : cumul par installation, repris comme référence l’an prochain', ctx => {
  const m = loadDemo(ctx);
  m.installations.hottes[0].data._temps = 600; m.installations.hottes[1].data._temps = 900; m.installations.cta[0].data._temps = 3720;
  eq(ctx.tempsMission(m), 5220);
  eq([ctx.tempsFormat(5220), ctx.tempsFormat(600), ctx.tempsFormat(20)], ['1 h 27', '10 min', '< 1 min']);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const html = ctx.tempsBilanHtml(m);
  assert(html.includes('1 h 27') && html.includes('Hottes') && html.includes('hors rapport'), 'carte du Bilan');
  const s = ctx.createMissionFromPreviousSite(m);
  eq([s.tempsN1, ctx.tempsMission(s)], [5220, 0], 'référence de l’an dernier, compteur remis à zéro');
  const dd = JSON.stringify(ctx.pdfBuildRapportDocDefinition(m).content);
  assert(!dd.includes('Temps passé') && !dd.includes('Labo fermé'), 'rien dans le rapport');
});

test('photo de la visite précédente et bilan du réseau', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  m.installations.hottes[0].data._photoN1 = 'ph_n1';
  assert(ctx.docsPhotoIds(m).includes('ph_n1'), 'photo N-1 exportée avec la mission');
  eq(ctx.createMissionFromPreviousSite(m).installations.hottes[0].data._photoN1, 'ph_n1', 'reprise');
  const f = ctx.getInstallationType('hottes').fields.find(x => x.key === 'photo');
  assert(ctx.renderFieldInput('hottes', f, m.installations.hottes[0]).includes('N-1'), 'affichée dans la galerie');
  // Bilan : dépoussiéreur DP-01 (8 500 m³/h) et machines raccordées (542,73 + 1 400,7 m³/h)
  const b = ctx.schemaBilanReseau(m, m.schemas[0]);
  eq(b.length, 1);
  eq([Math.round(b[0].qv), Math.round(b[0].qc), b[0].n, Math.round(b[0].ecart * 100)], [8500, 1943, 2, 77], 'débits comparés');
  assert(ctx.schemaBilanTexte(b[0]).includes('inférieure de 77 %'), 'constat rédigé');
  ctx.initPdfAssetsDone = true; initPdfAssets(ctx);
  ctx.PDF_ASSETS.schemas = { [m.schemas[0].id]: { url: dataUrl('favicon-96x96.png'), w: 1800, h: 1300 } };
  assert(JSON.stringify(ctx.pdfBuildSchemas(m)).includes('Bilan du réseau'), 'dans le rapport 4.3');
});

test('bilan d’air neuf des CTA, historique, calculette', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const items = ctx.overviewOrderedItems(m), cta2 = items.find(it => it.inst.id === 1009);
  const r = ctx.bilanCta(m, cta2);
  eq([Math.round(r.an.v), r.besoin, Math.round(r.mesure), r.locaux.length], [2253, 180, 650, 1], 'CTA-02 : air neuf, besoin, mesure');
  assert(ctx.bilanCtaTexte(r).includes('couvre ce besoin'), 'constat');
  const r1 = ctx.bilanCta(m, items.find(it => it.inst.id === 1008));
  assert(r1.sansBesoin.length === 1 && ctx.bilanCtaTexte(r1).includes('Besoin non calculé'), 'local sans effectif signalé');
  assert(JSON.stringify(ctx.pdfBuildBilansCta(m)).includes('4.4 BILAN'), 'rapport 4.4');
  // Visite suivante : historique prolongé, locaux alimentés suivis
  const s = ctx.createMissionFromPreviousSite(m);
  eq(s.installations.menuiserie_bis[0].data._histo.map(p => p.a + ':' + p.v), ['2023:690', '2024:640', '2025:598', '2026:542.73'], 'historique prolongé de la mesure 2026');
  const ids = s.installations.cta[0].data._alimente, soudure = s.installations.local_specifique.find(i => i.data.reference_local === 'Atelier soudure' || i.data.activite_reference_local === 'Atelier soudure');
  assert(ids.length === 2 && ids.includes(soudure.id), 'locaux alimentés remis sur les nouveaux identifiants');
  const html = ctx.histoCarteHtml('menuiserie_bis', m.installations.menuiserie_bis[0]);
  assert(html.includes('2023') && html.includes('2026') && html.includes('542,73'), 'courbe dans la fiche');
  // Calculette
  const R = (o, v) => ctx.calcResultats(o, v).map(x => x.r);
  eq(R('debit', { v: 10, d1: 20, d2: NaN, rond: true })[1], (1131).toLocaleString('fr-FR') + ' m³/h', 'débit Ø20 à 10 m/s');
  eq(R('debit', { v: 5, d1: 30, d2: 20, rond: false })[1], (1080).toLocaleString('fr-FR') + ' m³/h', 'débit 30×20 à 5 m/s');
  eq(R('pitot', { pd: 60, t: 20 })[1], '9,98 m/s', 'Pitot 60 Pa à 20 °C');
  eq(R('renouv', { q: 1200, vol: 100, taux: 10 }), ['12 vol/h', (1000).toLocaleString('fr-FR') + ' m³/h'], 'renouvellement');
  eq(R('airneuf', { eff: 12, cat: 25 }), ['300 m³/h'], 'R4222-6');
});

test('fiabilité des mesures : point aberrant, valeur proche du seuil, écart au devis', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const hotte = m.installations.hottes[0], f = ctx.getInstallationType('hottes').fields.find(x => x.key === 'vpe_grid');
  const g = hotte.data.vpe_grid.map(r => r.slice());
  eq(ctx.grilleAberrants(f, hotte), [], 'grille de la démo sans point aberrant');
  hotte.data.vpe_grid[1][2] = '25';
  const ab = ctx.grilleAberrants(f, hotte);
  eq([ab.length, ab[0].r, ab[0].c], [1, 1, 2], 'point aberrant repéré');
  assert(ctx.installationAnomalies(ctx.getInstallationType('hottes'), hotte, m).some(a => /très différent/.test(a.message)), 'remonte dans « Vérifier avant de partir »');
  hotte.data.vpe_grid = g;
  // Menuiserie : vitesse de transport à 19,5 m/s pour un objectif de 20 m/s
  const mb = m.installations.menuiserie_bis[0];
  mb.data.vitesse_directe = '19,5'; ctx.applyCalculations('menuiserie_bis', mb);
  const proches = ctx.mesuresProchesSeuil('menuiserie_bis', mb);
  assert(proches.length >= 1 && proches[0].s.texte === '≥ 20 m/s', 'mesure à moins de 5 % du seuil');
  mb.data.vitesse_directe = '13,33'; ctx.applyCalculations('menuiserie_bis', mb);
  eq(ctx.mesuresProchesSeuil('menuiserie_bis', mb).length, 0, 'loin du seuil : rien');
  // Devis
  m.devis = { sorbonnes: 3, hottes: 2 };
  const ecarts = ctx.devisEcarts(m);
  assert(ecarts.some(e => /3 × Sorbonnes, 2 dans la mission/.test(e)), 'quantité différente');
  assert(!ecarts.some(e => /Hottes/.test(e)), 'quantité conforme : rien');
  assert(ecarts.some(e => /non prévu/.test(e)), 'type hors devis signalé');
  assert(ctx.computeVerification(m).missionIssues.some(e => /Devis/.test(e)), 'dans « Vérifier avant de partir »');
});

test('créer les installations par quantités ou depuis un tableau Excel', ctx => {
  const m = ctx.createEmptyMission(); ctx.normalizeMission(m);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const T = x => (ctx.listeType(x) || {}).id || null;
  eq([T('Sorbonne'), T('Hottes'), T('CTA'), T('CTA (Centrale de traitement d’air)'), T('Bureau'), T('WC'), T('Cabine de peinture'), T('Machines à bois'), T('Grenaillage'), T('Truc inconnu')],
    ['sorbonnes', 'hottes', 'cta', 'cta', 'bureaux', 'sanitaires', 'cabines_peinture', 'menuiserie_bis', 'decapage', null], 'types reconnus');
  // Copier-coller depuis Excel (tabulations, ligne d'en-tête)
  const lignes = ctx.listeDepuisTexte('Type d’installation\tNombre\tBâtiment\tNom ou repère\nSorbonne\t3\tBâtiment C\tSO\nHotte\t\tBâtiment B\t\nCTA\t1\tToiture\tCTA-01\nMachin\t2\t\t');
  eq(lignes.map(l => [l.type && l.type.id, l.nb, l.bat, l.nom]), [['sorbonnes', 3, 'Bâtiment C', 'SO'], ['hottes', 1, 'Bâtiment B', ''], ['cta', 1, 'Toiture', 'CTA-01'], [null, 2, '', '']], 'lignes analysées');
  ctx.listeCreerLignes(lignes.filter(l => l.type), true);
  eq([m.installations.sorbonnes.length, m.installations.hottes.length, m.installations.cta.length], [3, 1, 1], 'installations créées');
  eq(m.installations.sorbonnes.map(i => i.data.reference_equipement || ctx.overviewRowTitle({ type: ctx.getInstallationType('sorbonnes'), inst: i, idx: 0 })), ['SO 1', 'SO 2', 'SO 3'], 'noms numérotés');
  eq(m.devis, { sorbonnes: 3, hottes: 1, cta: 1 }, 'quantités du devis');
  assert(['sorbonnes', 'hottes', 'cta'].every(t => m.typesSelectionnes.includes(t)), 'types ajoutés à la mission');
  // CSV avec points-virgules, sans en-tête
  eq(ctx.listeDepuisTexte('Bureaux;4;Bâtiment A').map(l => [l.type.id, l.nb]), [['bureaux', 4]], 'CSV');
});

test('qualité : non contrôlée, contre-visite, bâtiments, relecture', async ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  // Installation non contrôlée
  const bm = m.installations.bureaux.find(i => /méthodes/.test(i.data.reference_local));
  bm.data._nonControle = { motif: 'Accès impossible', precision: 'bureau fermé à clé' };
  const it = ctx.overviewOrderedItems(m).find(x => x.inst === bm);
  eq([it.status.state, it.status.cls, it.status.nc], ['done', 'status-nc', true], 'statut non contrôlée');
  const v = ctx.computeVerification(m).items.find(x => x.inst === bm || x.it.inst === bm);
  eq([v.notStarted, v.missing.length, v.anomalies.length], [false, 0, 0], 'rien à compléter');
  initPdfAssets(ctx);
  const txt = JSON.stringify(ctx.pdfBuildRapportDocDefinition(m).content);
  assert(txt.includes('INSTALLATIONS NON CONTRÔLÉES') && txt.includes('bureau fermé à clé') && txt.includes('Non contrôlée'), 'rapport : synthèse et liste');
  // Contre-visite : seulement les non satisfaisantes, mesure initiale en N-1
  const ns = ctx.contreVisiteInstallations(m);
  const cv = ctx.contreVisiteCreer(m);
  const n = Object.keys(cv.installations).reduce((s, t) => s + cv.installations[t].length, 0);
  eq(n, ns.length, 'installations non satisfaisantes reprises');
  assert(cv.contreVisite && cv.contreVisite.n === ns.length, 'mention de contre-visite');
  const ext = cv.installations.extracteur || [], scie = cv.installations.menuiserie_bis[0];
  assert(scie && !scie.data.vitesse_directe, 'mesures à refaire');
  assert(JSON.stringify(ctx.pdfMentionsQualite(cv)).includes('Contre-visite faisant suite'), 'rappel du rapport d’origine');
  // Harmonisation des bâtiments
  m.installations.hottes[0].data.batiment = 'Bât B'; m.installations.hottes[1].data.batiment = 'Bat. B';
  const g = ctx.batimentsSimilaires(m).find(x => x.noms.some(y => y.nom === 'Bât B'));
  assert(g && g.cible === 'Bâtiment B - Production' && g.noms.length === 3, 'noms proches regroupés');
  assert(!ctx.batimentsSimilaires(m).some(x => x.noms.some(y => /Bâtiment A/.test(y.nom))), 'bâtiments différents non regroupés');
  eq(ctx.harmoniserVers(m, g.noms.map(x => x.nom), g.cible), 2, 'deux installations renommées');
  // Relecture
  const h0 = m.installations.hottes[0];
  ctx.relectureMaj('hottes', 0, 'c', 'Vérifier la largeur saisie');
  assert(ctx.installationAnomalies(ctx.getInstallationType('hottes'), h0, m).some(a => a.label === 'Relecture'), 'commentaire à traiter');
  ctx.relectureMaj('hottes', 0, 'ok', true);
  eq(ctx.relectureAnomalies(ctx.getInstallationType('hottes'), h0).length, 0, 'validée : plus rien à traiter');
  m.relecture = { par: 'Relecteur Test', date: '05/10/2026', t: 1, statut: 'validee' };
  assert(JSON.stringify(ctx.pdfMentionsQualite(m)).includes('Rapport vérifié par Relecteur Test le 05/10/2026'), 'mention dans le rapport');
  const piege = clone(m); piege.relecture.par = '<b>x</b>'.repeat(30); piege.installations.hottes[0].data._nonControle = 'texte';
  ctx.normalizeMission(piege);
  assert(piege.relecture.par.length <= 80 && piege.installations.hottes[0].data._nonControle === undefined, 'données assainies');
});

test('finitions : positions des points, étiquette sur planche entamée, visa', ctx => {
  eq(ctx.pointsRond(20, 4), [1.3, 5, 15, 18.7], 'Ø20 cm, 4 points : aires égales');
  eq(ctx.pointsRond(20, 3), null, 'nombre impair refusé');
  eq(ctx.pointsRect(30, 3), [5, 15, 25], 'rectangle : centres de bandes égales');
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const ext = m.installations.extracteur[0], f = ctx.getInstallationType('extracteur').fields.find(x => x.key === 'vitesse_grid');
  Object.assign(ext.data, { diametre_cote1: '40', cote2: '', vitesse_nb_axes: '2', vitesse_nb_points: '6' });
  assert(ctx.positionsPointsHtml('extracteur', f, ext).includes('méthode des aires égales'), 'carte sous la grille');
  // Étiquettes : case de départ 20 sur 21 -> la 3e étiquette passe sur une nouvelle planche
  const items = ctx.overviewOrderedItems(m).slice(0, 3), used = {};
  items.forEach(it => ctx.qrCodeInstallation(it.inst, used));
  const dd = ctx.qrEtiquettesDocDefinition(m, items, 20);
  eq(dd.content.map(b => !!b.pageBreak), [false, false, true], 'saut de planche au bon endroit');
  eq(dd.content[0].absolutePosition.y, ctx.QR_PLANCHE.top + 6 * ctx.QR_PLANCHE.h, 'première étiquette en case 20');
  // Visa et relecteur sur la page de garde
  const png = dataUrl('favicon-96x96.png').replace('data:image/png', 'data:image/png');
  ctx.localStorage.setItem(ctx.VISA_KEY, png);
  m.relecture = { par: 'Responsable Qualité', date: '05/10/2026', t: 1, statut: 'validee' };
  initPdfAssets(ctx);
  const garde = JSON.stringify(ctx.pdfBuildRapportDocDefinition(m).content.slice(0, 20));
  assert(garde.includes('Responsable Qualité') && garde.includes('"fit":[110,24]'), 'visa et relecteur sur la page de garde');
  ctx.localStorage.removeItem(ctx.VISA_KEY);
});

test('conditions de mesure : modèle d’incertitude INRS PR 49 et rappel', ctx => {
  // Valeurs du tableau VI de l'article (k traverses, p points, L/D)
  eq(Math.round(ctx.cmErreurMax(2, 1, 1)), 47, '1 point à 2 D');
  eq(Math.round(ctx.cmErreurMax(2, 2, 10)), 4, '2 × 10 points à 2 D');
  eq(Math.round(ctx.cmErreurMax(10, 2, 2)), 4, '2 × 2 points à 10 D');
  eq(Math.round(ctx.cmErreurMax(50, 1, 1)), 5, '1 point à 50 D');
  eq(ctx.cmSchemaConseille(2), [2, 10], 'à 2 D : 2 diamètres de 10 points');
  eq(ctx.cmSchemaConseille(10), [2, 2], 'à 10 D : 2 diamètres de 2 points');
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const ext = m.installations.extracteur[0], steps = ctx.WIZARD_STEPS.extracteur;
  const iv = steps.findIndex(s => s.title === 'Vitesse');
  Object.assign(ext.data, { vitesse_mode: 'Grille de points', vitesse_nb_axes: '1', vitesse_nb_points: '2', _ld: 4 });
  const h = ctx.conditionsMesureHtml('extracteur', steps, iv, ext);
  assert(h.includes('erreur maximale estimée <b>16 %</b>') && h.includes('1 diamètre de 10 points'), 'erreur et schéma conseillé : ' + h.slice(0, 200));
  assert(ctx.conditionsMesureHtml('bureaux', ctx.WIZARD_STEPS.bureaux, 2, m.installations.bureaux[0]) === '', 'rien pour un bureau');
});

test('aides de mesure : bouches, tour du conduit, facteur K, nominal', ctx => {
  eq(Math.round(ctx.amDiametreDepuisTour(Math.PI * 40, 0) * 10) / 10, 40, 'tour d’un Ø40');
  eq(Math.round(ctx.amDiametreDepuisTour(Math.PI * 50, 5) * 10) / 10, 40, 'Ø50 avec 5 cm d’isolant -> 40');
  eq(Math.round(ctx.amDebitK(100, 400)), 2000, 'Q = K√Δp');
  eq(ctx.amBouchesFaibles(['120', '110', '40', '115']).map(x => x.i), [2], 'bouche 3 faible');
  eq(ctx.amBouchesFaibles(['120', '40']), [], 'pas de jugement sous 3 bouches');
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.state.currentInstIndex = 0;
  const b = m.installations.bureaux[0];
  b.data.type_ventilation = 'Extraction';
  b.data._bouchesMode = 'debit';
  ctx.amBouchesMaj('bureaux', 'debit_total_mesure', ['100', '95,5', '', '110'], false);
  eq(b.data.debit_total_mesure, '306', 'somme des bouches');
  eq(b.data.nombre_bouches, '3', 'nombre de bouches');
  // Cône : débit = K × vitesse ; changer K recalcule le total
  ctx.amBouchesReglage('bureaux', 'mode', 'cone');
  ctx.amBouchesReglage('bureaux', 'k', '36');
  ctx.amBouchesMaj('bureaux', 'debit_total_mesure', ['2', '2,5', '1'], false);
  eq(b.data.debit_total_mesure, '198', 'cône K 36 : 72 + 90 + 36');
  ctx.amBouchesReglage('bureaux', 'k', '40');
  eq(b.data.debit_total_mesure, '220', 'K changé : total recalculé');
  eq(ctx.localStorage.getItem(ctx.AM_CONE_K_KEY), '40', 'K du cône retenu');
  const hk = ctx.amBouchesHtml('bureaux', { key: 'debit_total_mesure' }, b);
  assert(['K35 <small>(coeff. 22)', 'K75 <small>(coeff. 50)', 'K120 <small>(coeff. 135)', 'Autre coefficient'].every(x => hk.includes(x)) && hk.includes('value="40"'), 'trois cônes et coefficient libre (40 en libre)');
  ctx.amBouchesReglage('bureaux', 'k', '50');
  eq(b.data.debit_total_mesure, '275', 'cône K75, coeff. 50 : 100 + 125 + 50');
  assert(ctx.amBouchesHtml('bureaux', { key: 'debit_total_mesure' }, b).includes(`actif" onclick="amBouchesReglage('bureaux','k','50');">K75`), 'cône K75 (coeff. 50) sélectionné');
  ctx.amBouchesReglage('bureaux', 'k', '40');
  // Dimensions de la bouche : surface × vitesse × 3600 ; dimensions de la précédente reprises
  ctx.amBouchesReglage('bureaux', 'mode', 'dim');
  ctx.amBouchesMaj('bureaux', 'debit_total_mesure', ['2'], false);
  ctx.amBoucheDim('bureaux', 'debit_total_mesure', 0, 'a', '20');
  ctx.amBoucheDim('bureaux', 'debit_total_mesure', 0, 'b', '30');
  eq(b.data.debit_total_mesure, '432', '0,2 × 0,3 × 2 × 3600');
  ctx.amBoucheAjouter('bureaux', 'debit_total_mesure');
  ctx.amBoucheSaisie('bureaux', 'debit_total_mesure', 1, '1');
  eq(b.data.debit_total_mesure, '648', 'bouche 2 aux mêmes dimensions');
  ctx.amBoucheDim('bureaux', 'debit_total_mesure', 1, 'b', '');
  eq(b.data.debit_total_mesure, '545', 'bouche 2 ronde Ø20 : 113 m³/h');
  assert(ctx.aidesMesureHtml('sanitaires', { key: 'debit_mesure' }, { data: {} }).includes('bouche par bouche'), 'bouches proposées en sanitaires');
  assert(ctx.aidesMesureHtml('local_specifique', { key: 'debit_air_neuf' }, { data: {} }).includes('bouche par bouche'), 'bouches proposées en local spécifique');
  ctx.localStorage.removeItem(ctx.AM_CONE_K_KEY);
  const ext = m.installations.extracteur[0];
  Object.assign(ext.data, { _nominal: '2000', _k: '50', _kdp: '400' });
  const h = ctx.plaqueDonneesHtml('extracteur', ext);
  assert(h.includes('Débit selon K : <b>1000 m³/h</b>') && h.includes('50 % du nominal'), 'débit K et % du nominal : ' + h.slice(0, 300));
});

test('constat rédigé à partir des mesures', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id; ctx.state.currentInstIndex = 0;
  const b = m.installations.bureaux[0];
  Object.assign(b.data, { type_ventilation: 'Extraction', debit_total_mesure: '180', etat_bouches: 'A réparer', observation: '' });
  ctx.applyCalculations('bureaux', b);
  const txt = ctx.constatTexte('bureaux', b);
  assert(/Débit total mesuré : 180 m³\/h, pour un objectif ≥ \d+/.test(txt), 'mesure et objectif : ' + txt);
  assert(txt.includes('État des bouches : à réparer.'), 'état défavorable : ' + txt);
  ctx.constatRediger('bureaux', 'observation');
  eq(b.data.observation, txt, 'écrit dans l’observation');
  ctx.constatRediger('bureaux', 'observation');
  eq(b.data.observation, txt, 'pas de doublon');
  b.data.debit_total_mesure = '5000'; b.data.etat_bouches = 'En bon état'; ctx.applyCalculations('bureaux', b);
  eq(ctx.constatBoutonHtml('bureaux', { key: 'observation', type: 'textarea' }, b), '', 'pas de bouton si satisfaisant');
});

test('import du rapport PDF précédent : synthèse et fiches', ctx => {
  const L = (p, s) => ({ p, s });
  const lignes = [
    L(4, 'Conclusion sur les sorbonnes'), L(4, 'Bâtiment | Commentaire'),
    L(4, 'Labo | Salle 2 | Sorbonne S1 | Non Satisfaisant'), L(4, 'Labo | Sorbonne S2 | Satisfaisant | -'),
    L(4, 'Conclusion sur les contrôles des locaux à pollution non spécifique'),
    L(4, 'Bât A | Bureaux | Accueil | Impossible de se prononcer'),
    L(6, 'ANNEXES'),
    L(7, 'CAPTAGE DES GAZ D\'ECHAPPEMENT'), L(8, 'Bâtiment | Atelier'), L(8, 'Ref. de l\'équipement | Bras 1'),
    L(10, 'Bâtiment | Atelier'), L(10, 'Ref. de l\'équipement | Bras 2'),
    L(12, 'SORBONNES DE LABORATOIRE'), L(13, 'Bâtiment | Labo')
  ];
  const res = ctx.rapportAnalyser(lignes);
  eq(res.map(r => r.type.id + '|' + r.bat + '|' + r.nom), ['sorbonnes|Labo|Salle 2 – Sorbonne S1', 'sorbonnes|Labo|Sorbonne S2', 'bureaux|Bât A|Bureaux – Accueil', 'gaz_echappement|Atelier|Bras 1', 'gaz_echappement|Atelier|Bras 2'], 'synthèse puis fiches des types absents');
});

test('rapport précédent : débits N-1 ; dossier de valeurs de référence du client', ctx => {
  eq(ctx.rapportDebitMesure('Extrait | Circulaire | 70 | / | 0,38 | 15,9 | - | 23830 | 22029'), { v: 22029, lib: 'extrait' }, 'débit = surface × vitesse × 3600');
  eq(ctx.rapportDebitMesure("Débit d'air extrait (m3/h) | 1327,04"), { v: 1327.04, lib: '' }, 'ligne libellée');
  eq(ctx.rapportDebitMesure('Débit théorique (m3/h) | 900'), null, 'pas un débit théorique');
  const d = ctx.rapportDonneesN1('extracteur', [{ v: 22029, lib: 'extrait' }], 2025);
  eq(d.debit_annee_n1, '22029', 'champ N-1 de l’extracteur');
  eq(d._histo, [{ a: 2025, v: 22029 }], 'historique');
  eq(Object.keys(ctx.rapportDonneesN1('cta', [{ v: 6680, lib: 'neuf' }, { v: 6044, lib: 'souffle' }], null)), ['neuf_debit_n1', 'souf_debit_n1'], 'CTA : selon la ligne');
  // Dossier de valeurs de référence : rapprochement installation + champ
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const sorb = m.installations.sorbonnes[0], ext = m.installations.extracteur[0];
  sorb.data.reference_equipement = 'SORB-LABO-12'; sorb.data.vitesse_min_reference = ''; sorb.data.debit_reference = '';
  ext.data.reference_equipement = 'EXT-TOIT-3'; ext.data.valeur_reference_recommandee = '';
  const rows = [['Équipement', 'Vitesse minimale (m/s)', 'Débit (m3/h)'], ['SORB-LABO-12', '0,5', '1 250'], ['EXT-TOIT-3', '', '24000']];
  const p = ctx.vrAnalyser(rows, m).map(x => x.it.type.id + '.' + x.ligne.ref + '=' + x.valeur);
  eq(p, ['sorbonnes.vitesse_min_reference=0,5', 'sorbonnes.debit_reference=1250', 'extracteur.valeur_reference_recommandee=24000'], 'valeurs rapprochées');
  // Constat « Impossible de se prononcer »
  ext.data.valeur_reference_recommandee = ''; ctx.applyCalculations('extracteur', ext);
  assert(ctx.constatTexte('extracteur', ext).includes('dossier de valeurs de référence'), 'constat IDSP : ' + ctx.constatTexte('extracteur', ext));
});

test('création rapide d’une installation depuis le schéma ou le plan', ctx => {
  const m = loadDemo(ctx);
  ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;
  const avant = ctx.overviewOrderedItems(m).length;
  const key = ctx.creationRapideCreer(m, ctx.getInstallationType('hottes'), 'Hotte H4', 'Bâtiment B - Production');
  const [t, i] = key.split(':');
  const inst = m.installations[t][+i];
  eq([t, inst.data.batiment, ctx.overviewRowTitle({ type: ctx.getInstallationType('hottes'), inst, idx: +i })], ['hottes', 'Bâtiment B - Production', 'Hotte H4'], 'nom et bâtiment');
  eq(ctx.overviewOrderedItems(m).length, avant + 1, 'visible dans la mission');
  const k2 = ctx.creationRapideCreer(m, ctx.getInstallationType('decapage'), 'Cabine de grenaillage', '');
  assert(m.typesSelectionnes.includes('decapage') && k2.startsWith('decapage:'), 'type ajouté à la mission si besoin');
});

test('guide d’utilisation : étapes numérotées, icônes existantes', ctx => {
  const e = ctx.GUIDE_UTILISATION_ETAPES;
  eq(e.map(x => parseInt(x.titre, 10)), e.map((_, i) => i + 1), 'numérotation continue');
  const vide = ctx.getIcon('__inexistante__');
  eq(e.filter(x => ctx.getIcon(x.icon) === vide).map(x => x.icon), [], 'icônes manquantes');
});

test('photo annotée : l’original reste référencé tant que la photo existe', ctx => {
  const m = loadDemo(ctx);
  m.installations.extracteur[0].data.photo = [{ id: 'ph_annotee', orig: 'ph_original', annot: [{ t: 'cercle', c: '#e5484d', p: [[0.1, 0.1], [0.3, 0.3]] }] }];
  ctx.state.missions = [m];
  const refs = ctx.referencedPhotoIds();
  assert(refs.ph_annotee && refs.ph_original, 'photo annotée et original référencés');
  assert(typeof ctx.annoterPhoto === 'function' && typeof ctx.annotRendu === 'function', 'module chargé');
});

test('objectif avant la mesure : déduit du calcul de l’appli', ctx => {
  const m = loadDemo(ctx);
  const f = (typeId, key) => ctx.getInstallationType(typeId).fields.find(x => x.key === key);
  const obj = (typeId, key, data) => ctx.seuilsPourChamp(typeId, f(typeId, key), { data }).map(r => (r.libelle ? r.libelle + ' : ' : '') + r.texte);
  const mb = m.installations.menuiserie_bis[0];
  eq(obj('menuiserie_bis', 'vitesse_directe', mb.data)[0], 'Vitesse de transport : ≥ 20 m/s', 'vitesse de transport ED 750');
  eq(obj('sanitaires', 'debit_mesure', { chambre_erp_individuelle: 'Non', wc_urinoirs: '2', individuel_collectif: 'Collectif' }), ['≥ 60 m³/h'], 'sanitaires 2 WC');
  eq(obj('sanitaires', 'debit_mesure', { chambre_erp_individuelle: 'Non', wc_urinoirs: '1', individuel_collectif: 'Individuel' }), ['≥ 15 m³/h'], 'WC individuel');
  eq(obj('sanitaires', 'debit_mesure', { chambre_erp_individuelle: 'Non' }), [], 'pas d’équipement : pas d’objectif');
  eq(obj('bureaux', 'effectif', m.installations.bureaux[0].data), [], 'champ descriptif : pas d’objectif');
  const r = ctx.seuilsPourChamp('sanitaires', f('sanitaires', 'debit_mesure'), { data: { chambre_erp_individuelle: 'Non', wc_urinoirs: '2', individuel_collectif: 'Collectif', debit_mesure: '45' } });
  eq(r[0].ok, false, 'valeur saisie sous l’objectif');
});

test('sanitaires à usage individuel : débit minimal limité à 15 m³/h (R4212-6)', ctx => {
  const f = d => ctx.debitMinSanitaires(Object.assign({ chambre_erp_individuelle: 'Non' }, d));
  eq(f({ wc_urinoirs: '1', individuel_collectif: 'Collectif' }), 30, 'WC collectif');
  eq(f({ wc_urinoirs: '1', individuel_collectif: 'Individuel' }), 15, 'WC individuel');
  eq(f({ douches: '1', lavabos: '1', individuel_collectif: 'Individuel' }), 15, 'douche individuelle');
  eq(f({ lavabos: '3', individuel_collectif: 'Individuel' }), 25, 'lavabos seuls : non visés');
  eq(f({ wc_urinoirs: '1' }), 30, 'non renseigné : règle générale');
  eq(f({ wc_urinoirs: '1', douches: '1', individuel_collectif: 'Individuel' }), 15, 'salle de douche avec WC, individuelle');
  eq(f({ wc_urinoirs: '3', individuel_collectif: 'Individuel' }), 75, 'WC groupés : tableau, même coché individuel');
  eq(f({ douches: '4', individuel_collectif: 'Individuel' }), 90, 'douches groupées : tableau');
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
