// index-synthese.js - Index des installations (annexe du rapport) et synthèse par bâtiment (document à
// part) — 2026-10-05
//
//  - Index : dernière annexe du rapport, une ligne par installation par ordre alphabétique (type,
//    bâtiment, niveau, n° sur le plan, avis, page). Page exacte de la fiche quand le type a une fiche par
//    installation (un en-tête de fiche par installation, compté à la construction) ; sinon page du début
//    de la section du type (types présentés en tableau).
//  - Synthèse par bâtiment : PDF séparé du rapport, pour le client (bilan par bâtiment et points non
//    satisfaisants). Ne modifie pas le rapport ; rappelle que seul le rapport fait foi.

var PDF_INDEX_ANCRES = {};

// Construit l'annexe d'un type en posant un repère (id pdfmake) au début de chaque fiche
function pdfAnnexeAvecAncres(t, list) {
  var entetes = [], orig = pdfAnnexePageHeader, contenu;
  pdfAnnexePageHeader = function () { var n = orig.apply(this, arguments); entetes.push(n); return n; };
  try { contenu = pdfBuildAnnexeForType(t, list); } finally { pdfAnnexePageHeader = orig; }
  var idType = 'idx-type-' + t.id;
  var objet = function (n) { return n && typeof n === 'object' && !Array.isArray(n); };
  // Repère posé dans l'en-tête lui-même (texte non vide : pdfmake ignore un repère vide)
  var ancrer = function (n, id) {
    var inner = {};
    Object.keys(n).forEach(function (k) { inner[k] = n[k]; delete n[k]; });
    n.stack = [{ text: ' ', fontSize: 1, id: id }, inner];
  };
  var unParFiche = entetes.length === list.length && entetes.every(objet);
  // Types en tableau : page du premier tableau (après d'éventuels extraits réglementaires), sinon début
  if (!unParFiche) {
    if (objet(entetes[0])) ancrer(entetes[0], idType);
    else contenu = [{ text: ' ', fontSize: 1, id: idType }].concat(contenu);
  }
  list.forEach(function (inst, i) {
    var id = idType;
    if (unParFiche) {
      id = 'idx-inst-' + String(inst.id || (t.id + i)).replace(/[^a-zA-Z0-9_-]/g, '_');
      ancrer(entetes[i], id);
    }
    PDF_INDEX_ANCRES[inst.id] = id;
  });
  return contenu;
}

// Numéro de chaque installation sur le plan du site (même numérotation que la page « Plan du site »)
function indexNumerosPlan(m) {
  var out = {}, plans = (typeof missionPlans === 'function') ? missionPlans(m) : [];
  plans.forEach(function (p) {
    planPlacedItems(m, p.id).forEach(function (x) { out[x.it.inst.id] = (plans.length > 1 ? p.nom + ' · ' : '') + x.n; });
  });
  return out;
}

function pdfBuildIndexInstallations(m, titreSommaire) {
  var items = overviewOrderedItems(m).slice().sort(overviewTriNom);
  if (!items.length) return [];
  var plan = indexNumerosPlan(m);
  var cell = function (t, o) { return Object.assign({ text: t === undefined || t === null || t === '' ? '-' : String(t), fontSize: 8, margin: [2, 1.5, 2, 1.5] }, o || {}); };
  var head = function (t) { return cell(t, { bold: true, color: 'white', fillColor: PDF_TABLE_HEADER_BLUE }); };
  var body = [[head('Installation'), head('Type'), head('Bâtiment'), head('Niveau'), head('N° plan'), head('Avis'), head('Page')]];
  items.forEach(function (it) {
    var d = it.inst.data || {}, nc = !!d._nonControle, key = resolveAvisFieldKey(it.type), avis = nc ? 'Non contrôlée' : (d[key] || 'À compléter');
    var ancre = PDF_INDEX_ANCRES[it.inst.id];
    body.push([cell(overviewRowTitle(it), { bold: true }), cell(it.type.label.replace(/\s*\(.*\)\s*$/, '')), cell(d.batiment), cell(d.niveau), cell(plan[it.inst.id]),
      cell(avis, { color: avis === 'Satisfaisant' ? AVIS_TEINTES.okTexte : avis === 'Non Satisfaisant' ? AVIS_TEINTES.badTexte : '#333333' }),
      nc || !ancre ? cell('—', { alignment: 'center' }) : { text: '', pageReference: ancre, fontSize: 8, alignment: 'center', margin: [2, 1.5, 2, 1.5] }]);
  });
  return [
    Object.assign(pdfTocMarker(titreSommaire, 2), { pageBreak: 'before', pageOrientation: 'portrait' }),
    pdfAnnexePageHeader('Index des installations', 'INDEX DES INSTALLATIONS (PAR ORDRE ALPHABÉTIQUE)', PDF_ASSETS.logo),
    { text: '', margin: [0, 0, 0, 8] },
    { table: { headerRows: 1, widths: ['*', 92, 92, 44, 40, 70, 30], body: body },
      layout: { hLineColor: function () { return '#B7D7F0'; }, vLineColor: function () { return '#B7D7F0'; }, hLineWidth: function () { return 0.5; }, vLineWidth: function () { return 0.5; } } },
    { text: 'Page : début de la fiche de l’installation, ou de la section de son type quand les installations y sont présentées en tableau.', fontSize: 7, italics: true, color: '#555', margin: [0, 6, 0, 0] }
  ];
}

// ————————————————————————————————————————————
// Synthèse par bâtiment (document à part)
// ————————————————————————————————————————————

function syntheseBatimentsDocDefinition(m, logo) {
  var di = m.donneesInternes || {}, ic = m.infosClient || {}, si = m.infosSiteIntervention || {};
  var items = overviewOrderedItems(m).filter(function (it) { return !(it.inst.data && it.inst.data._nonControle); });
  var groupes = groupByBatiment(items);
  var BLUE = '#0082DE';
  var cell = function (t, o) { return Object.assign({ text: t === undefined || t === null || t === '' ? '-' : String(t), fontSize: 8.5, margin: [3, 2, 3, 2] }, o || {}); };
  var head = function (t) { return cell(t, { bold: true, color: 'white', fillColor: BLUE }); };
  var layout = { hLineColor: function () { return '#B7D7F0'; }, vLineColor: function () { return '#B7D7F0'; }, hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } };
  var compte = function (list) { var c = { ok: 0, bad: 0, na: 0, open: 0 }; list.forEach(function (it) { c[bilanCategory(it)]++; }); return c; };

  var content = [];
  content.push({ columns: [
    logo ? { image: logo, width: 46 } : { text: '' },
    { stack: [{ text: 'SYNTHÈSE PAR BÂTIMENT', bold: true, fontSize: 14, color: BLUE },
      { text: 'Contrôle de l’aération et de l’assainissement des locaux de travail', fontSize: 10, color: '#333' }], margin: [12, 6, 0, 0] }
  ], margin: [0, 0, 0, 10] });
  content.push({ table: { widths: [110, '*'], body: [
    [head('Client'), cell(ic.nomEntreprise || m.clientSite)],
    [head('Site'), cell([si.siteIntervention, [si.adresseSite, si.codePostal, si.ville].filter(Boolean).join(' ')].filter(Boolean).join(' – '))],
    [head('Date(s) de visite'), cell(di.datesIntervention || m.dateControle)],
    [head('Rapport de référence'), cell([di.numeroAffaire ? 'Affaire ' + di.numeroAffaire : '', di.numeroChrono ? 'chrono ' + di.numeroChrono : ''].filter(Boolean).join(', '))]
  ] }, layout: layout, margin: [0, 0, 0, 12] });

  // Tableau récapitulatif
  var recap = [[head('Bâtiment'), head('Installations'), head('Satisfaisant'), head('Non satisfaisant'), head('Sans objet'), head('À compléter')]];
  groupes.forEach(function (g) {
    var c = compte(g.items);
    recap.push([cell(g.label, { bold: true }), cell(g.items.length, { alignment: 'center' }), cell(c.ok, { alignment: 'center', color: AVIS_TEINTES.okTexte }),
      cell(c.bad, { alignment: 'center', color: c.bad ? AVIS_TEINTES.badTexte : '#333', bold: !!c.bad }), cell(c.na, { alignment: 'center' }), cell(c.open, { alignment: 'center' })]);
  });
  var tot = compte(items);
  recap.push([cell('Total', { bold: true }), cell(items.length, { alignment: 'center', bold: true }), cell(tot.ok, { alignment: 'center', bold: true }),
    cell(tot.bad, { alignment: 'center', bold: true }), cell(tot.na, { alignment: 'center', bold: true }), cell(tot.open, { alignment: 'center', bold: true })]);
  content.push({ table: { headerRows: 1, widths: ['*', 62, 62, 70, 52, 58], body: recap }, layout: layout, margin: [0, 0, 0, 14] });

  // Points non satisfaisants, bâtiment par bâtiment
  groupes.forEach(function (g) {
    var bad = g.items.filter(function (it) { return bilanCategory(it) === 'bad'; });
    var bloc = [{ text: g.label, bold: true, fontSize: 11, color: BLUE, margin: [0, 6, 0, 4] }];
    if (!bad.length) {
      bloc.push({ text: 'Aucun point non satisfaisant.', fontSize: 9, color: AVIS_TEINTES.okTexte, margin: [0, 0, 0, 6] });
    } else {
      var body = [[head('Installation'), head('Type'), head('Niveau'), head('Critère en cause / observation')]];
      bad.forEach(function (it) {
        body.push([cell(overviewRowTitle(it), { bold: true }), cell(it.type.label.replace(/\s*\(.*\)\s*$/, '')), cell(it.inst.data.niveau), cell(badPointDetail(it))]);
      });
      bloc.push({ table: { headerRows: 1, widths: [110, 100, 44, '*'], body: body }, layout: layout, margin: [0, 0, 0, 6] });
    }
    content.push({ stack: bloc, unbreakable: bad.length <= 6 });
  });
  content.push({ text: 'Document de synthèse établi à partir des constats du contrôle, pour faciliter la lecture par bâtiment. Il ne se substitue pas au rapport de contrôle, qui fait seul foi.',
    fontSize: 8, italics: true, color: '#555', margin: [0, 12, 0, 0] });

  return {
    pageSize: 'A4', pageMargins: [36, 30, 36, 36],
    defaultStyle: { font: 'Arial', fontSize: 10 },
    info: { title: 'Synthèse par bâtiment – ' + (m.clientSite || '') },
    footer: function (page, pages) {
      return { columns: [{ text: di.numeroAffaire ? 'N° d’affaire : ' + di.numeroAffaire : '', fontSize: 7, color: '#777' },
        { text: page + '/' + pages, alignment: 'right', fontSize: 7, color: '#777' }], margin: [36, 12, 36, 0] };
    },
    content: content
  };
}

function exportSyntheseBatiments() {
  var m = getCurrentMission();
  if (!m) return;
  ensureLib('pdf').then(function () { return pdfFetchAsDataUrl(LOGO_PATH); }).then(function (logo) {
    var name = (m.donneesInternes && m.donneesInternes.referenceOffre || m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').trim() + '_synthese_par_batiment.pdf';
    pdfMake.createPdf(syntheseBatimentsDocDefinition(m, logo)).download(name);
  }).catch(function (err) { alert('Erreur lors de la génération de la synthèse.\n' + err.message); });
}

console.log('✓ Index des installations et synthèse par bâtiment chargés');
