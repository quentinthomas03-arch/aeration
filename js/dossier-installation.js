// dossier-installation.js - Dossier de valeurs de référence : l'établir ou analyser un dossier existant
// (chantier du 2026-10-07, à partir du relevé de js/dvr.js)
//
// Sources : arrêté du 8 octobre 1987, art. 2 (dossier d'installation : a) notice d'instructions avec le
// dossier de valeurs de référence, b) consigne d'utilisation avec le dossier de maintenance), art. 3.1
// (contenu pour la pollution non spécifique), art. 4.1 (pollution spécifique et recyclage), art. 3.2 et
// 4.2 (contrôles périodiques) ; Code du travail R4212-7 (notice d'instructions du maître d'ouvrage) ;
// INRS ED 6008 « Le dossier d'installation de ventilation » (2023) : structure du dossier (tableaux I à
// VIII), dossier à établir au plus tard un mois après la mise en service, installation existante =
// dossier de valeurs de référence + consigne d'utilisation, suivi du débit par la pression statique
// Q = Qréf × √(P / Préf).
//
// Trois prestations (m.dvr.mode) :
//  - 'existante'       : établir le dossier d'une installation existante (valeurs de référence et
//                        consigne d'utilisation) ;
//  - 'mise_en_service' : mesures initiales d'une installation nouvelle ou modifiée (notice
//                        d'instructions avec descriptif, valeurs de référence, consigne d'utilisation) ;
//  - 'analyse'         : vérifier, compléter ou aider à lire un dossier existant (complétude article
//                        par article, comparaison des valeurs du dossier aux mesures).
// SOCOTEC relève, rédige et propose ; le chef d'établissement (ou le maître d'ouvrage) valide. Règle
// de js/dvr.js conservée : une valeur relevée non satisfaisante n'est jamais proposée comme référence.

var DVR_MODES = [
  { key: 'existante', label: 'Établir le dossier (installation existante)' },
  { key: 'mise_en_service', label: 'Mesures à la mise en service (installation nouvelle ou modifiée)' },
  { key: 'analyse', label: 'Vérifier ou compléter un dossier existant' }
];

function dvrMode(m) { var mo = dvrData(m).mode; return DVR_MODES.some(function (x) { return x.key === mo; }) ? mo : 'existante'; }

function setDvrMode(mode) {
  var m = getCurrentMission();
  if (!m) return;
  dvrData(m).mode = mode;
  persistMissions();
  render();
}

// Pression statique : facultative au contrôle annuel (comme le Rapso), mais demandée quand la mission
// établit un dossier de valeurs de référence — l'arrêté (art. 3.1 et 4.1) y attend les pressions
// statiques ou vitesses aux points caractéristiques, associées aux débits. Utilisé par fieldState
// (js/installations.js) et la liste des cases manquantes (js/terrain-assist.js).
function dvrExigeChamp(f) {
  if (!f || !/(^|_)pression_statique$/.test(f.key || '')) return false;
  var m = typeof getCurrentMission === 'function' ? getCurrentMission() : null;
  return !!(m && m.dvr && m.dvr.actif && dvrMode(m) !== 'analyse');
}

// Repérage d'une installation : plan du site (numéro d'épingle, js/plans.js) et schémas de réseau
// où elle figure (js/schemas.js)
function dsReperage(m, inst) {
  var parts = [], p = inst && inst.data && inst.data._plan;
  if (p && typeof missionPlans === 'function') {
    var plan = missionPlans(m).filter(function (x) { return x.id === p.id; })[0];
    var rang = typeof planPlacedItems === 'function' ? planPlacedItems(m, p.id).filter(function (x) { return x.it.inst === inst; })[0] : null;
    if (plan) parts.push('Plan « ' + plan.nom + ' »' + (rang ? ', repère n°' + rang.n : ''));
  }
  if (typeof missionSchemas === 'function' && inst) {
    missionSchemas(m).forEach(function (s) {
      if ((s.elements || []).some(function (e) { return e.k === 'inst' && e.inst === inst.id; })) parts.push('Schéma « ' + s.nom + ' »');
    });
  }
  return parts.join(' ; ');
}

function setDvrChamp(key, value) {
  var m = getCurrentMission();
  if (!m) return;
  dvrData(m)[key] = value;
  persistMissions();
}

// ————————————————————————————————————————————
// Analyse d'un dossier existant : complétude article par article
// ————————————————————————————————————————————

var DVR_VERIF_ETATS = [['present', 'Présent'], ['partiel', 'Partiel'], ['absent', 'Absent'], ['so', 'Sans objet']];

var DVR_VERIF_GROUPES = [
  { key: 'dossier', titre: 'Dossier d’installation (arrêté du 8 octobre 1987, art. 2 ; INRS ED 6008)', items: [
    ['notice', 'Notice d’instructions : descriptif des installations (installations nouvelles)', 'Code du travail R4212-7'],
    ['dvr', 'Dossier de valeurs de référence', 'Art. 2 a'],
    ['consigne', 'Consigne d’utilisation : dispositions prises pour la ventilation, utilisation et entretien', 'Art. 2 b ; ED 6008'],
    ['panne', 'Consigne d’utilisation : mesures à prendre en cas de panne ou de dysfonctionnement', 'ED 6008'],
    ['maintenance', 'Dossier de maintenance : dates et résultats des contrôles périodiques, entretien et nettoyage, aménagements et réglages', 'Art. 2 b']
  ] },
  { key: 'ns', cat: 'ns', titre: 'Locaux à pollution non spécifique (art. 3.1)', items: [
    ['ns_global', 'Débit global minimal d’air neuf', 'Art. 3.1'],
    ['ns_local', 'Débit minimal d’air neuf par local', 'Art. 3.1'],
    ['ns_points', 'Pressions statiques ou vitesses d’air aux points caractéristiques, associées aux débits', 'Art. 3.1'],
    ['ns_filtres', 'Caractéristiques des filtres : classe d’efficacité, perte de charge initiale et maximale admise', 'Art. 3.1']
  ] },
  { key: 'sp', cat: 'sp', titre: 'Locaux à pollution spécifique (art. 4.1)', items: [
    ['sp_polluants', 'Polluant(s) représentatif(s) de la pollution ambiante', 'Art. 4.1'],
    ['sp_captages', 'Débit extrait par chaque système de captage, avec les pressions statiques ou vitesses associées', 'Art. 4.1'],
    ['sp_global', 'Débit global d’air extrait', 'Art. 4.1'],
    ['sp_efficacite', 'Efficacité de captage minimale (par conformité aux normes ou par mesure)', 'Art. 4.1'],
    ['sp_surveillance', 'Caractéristiques des systèmes de surveillance et moyens de contrôle', 'Art. 4.1']
  ] },
  { key: 'rc', type: 'recyclage', titre: 'Installations avec recyclage (art. 4.1, informations complémentaires)', items: [
    ['rc_air_neuf', 'Débit d’air neuf introduit dans les locaux', 'Art. 4.1'],
    ['rc_epuration', 'Efficacité minimale des systèmes d’épuration (par tranches granulométriques pour les poussières)', 'Art. 4.1'],
    ['rc_concentrations', 'Concentrations en points caractéristiques de l’atelier et dans les gaines de recyclage', 'Art. 4.1'],
    ['rc_surveillance', 'Système de surveillance mis en œuvre et moyens de contrôle', 'Art. 4.1']
  ] }
];

// Groupes applicables à la mission, d'après les installations présentes
function dvrVerifGroupes(m) {
  var cats = {}, types = {};
  INSTALLATION_TYPES.forEach(function (t) {
    if (!((m.installations && m.installations[t.id]) || []).length) return;
    types[t.id] = true;
    var cfg = typeof DVR_CONFIG !== 'undefined' && DVR_CONFIG[t.id];
    if (cfg) cats[cfg.cat] = true;
  });
  return DVR_VERIF_GROUPES.filter(function (g) { return (!g.cat && !g.type) || (g.cat && cats[g.cat]) || (g.type && types[g.type]); });
}

function dvrVerif(m) {
  var dv = dvrData(m);
  if (!dv.verif) dv.verif = { items: {}, document: { titre: '', auteur: '', date: '' } };
  if (!dv.verif.items) dv.verif.items = {};
  if (!dv.verif.document) dv.verif.document = { titre: '', auteur: '', date: '' };
  return dv.verif;
}

function setDvrVerif(key, champ, value) {
  var m = getCurrentMission();
  if (!m) return;
  var v = dvrVerif(m);
  v.items[key] = v.items[key] || {};
  v.items[key][champ] = value;
  persistMissions();
  if (champ === 'etat') render();
}

function setDvrVerifDocument(champ, value) {
  var m = getCurrentMission();
  if (!m) return;
  dvrVerif(m).document[champ] = value;
  persistMissions();
}

// Éléments manquants ou incomplets (pour la conclusion de l'analyse)
function dvrVerifManques(m) {
  var v = dvrVerif(m), out = [];
  dvrVerifGroupes(m).forEach(function (g) {
    g.items.forEach(function (it) {
      var e = (v.items[it[0]] || {}).etat;
      if (e === 'absent' || e === 'partiel') out.push({ groupe: g, item: it, etat: e, com: (v.items[it[0]] || {}).com || '' });
    });
  });
  return out;
}

function dvrVerifNonRenseignes(m) {
  var v = dvrVerif(m), n = 0;
  dvrVerifGroupes(m).forEach(function (g) { g.items.forEach(function (it) { if (!(v.items[it[0]] || {}).etat) n++; }); });
  return n;
}

// Valeurs du dossier existant comparées aux mesures : lignes de DVR_CONFIG dont le champ « référence »
// de la fiche est renseigné (valeurs reprises du dossier du client, ou importées : js/valeurs-reference.js)
function dvrComparaisons(m) {
  var out = [];
  overviewOrderedItems(m).forEach(function (it) {
    var cfg = DVR_CONFIG[it.type.id];
    if (!cfg || it.status.nc) return;
    cfg.lignes.forEach(function (l) {
      if (!l.ref) return;
      var ref = dvrNum(it.inst.data[l.ref]);
      if (ref === null) return;
      var mes = l.mesure ? dvrNum(it.inst.data[l.mesure]) : null;
      var ecart = (mes !== null && ref !== 0) ? Math.round((mes - ref) / ref * 1000) / 10 : null;
      var avis = l.avis ? it.inst.data[l.avis] : it.inst.data[resolveAvisFieldKey(it.type)];
      out.push({ it: it, label: l.label, unit: l.unit, ref: ref, mes: mes, ecart: ecart, avis: avis || '' });
    });
  });
  return out;
}

// ————————————————————————————————————————————
// Écran : bloc ajouté à l'écran « Valeurs de référence » (js/dvr.js renderDvr)
// ————————————————————————————————————————————

function renderDvrModeChoix(m) {
  var mode = dvrMode(m), dv = dvrData(m);
  var h = '<div class="card"><div class="section-title" style="margin-top:0;">Prestation</div><div class="row" style="flex-wrap:wrap;gap:6px;">';
  DVR_MODES.forEach(function (x) {
    h += '<button type="button" class="home-filter' + (mode === x.key ? ' active' : '') + '" onclick="setDvrMode(\'' + x.key + '\');">' + escapeHtml(x.label) + '</button>';
  });
  h += '</div>';
  if (mode === 'mise_en_service') {
    h += '<div class="field" style="margin-top:10px;"><label class="label">Date de mise en service de l’installation</label>' +
      '<input type="text" class="input" placeholder="jj/mm/aaaa" value="' + escapeHtml(dv.dateMiseEnService || '') + '" onchange="setDvrChamp(\'dateMiseEnService\',this.value);">' +
      '<div class="subtitle">Le dossier est à établir au plus tard un mois après la mise en service (INRS ED 6008).</div></div>';
  }
  return h + '</div>';
}

function renderDvrAnalyse(m) {
  var v = dvrVerif(m), doc = v.document, h = '';
  h += '<div class="card"><div class="section-title" style="margin-top:0;">Dossier analysé</div>' +
    ['titre:Intitulé du document', 'auteur:Établi par (installateur, bureau d’études…)', 'date:Date du document'].map(function (s) {
      var k = s.split(':')[0], lab = s.split(':')[1];
      return '<div class="field"><label class="label">' + escapeHtml(lab) + '</label><input type="text" class="input" value="' + escapeHtml(doc[k] || '') + '" onchange="setDvrVerifDocument(\'' + k + '\',this.value);"></div>';
    }).join('') + '</div>';
  dvrVerifGroupes(m).forEach(function (g) {
    h += '<div class="section-title">' + escapeHtml(g.titre) + '</div><div class="card">';
    g.items.forEach(function (it) {
      var cur = v.items[it[0]] || {};
      h += '<div class="field"><label class="label">' + escapeHtml(it[1]) + ' <span class="subtitle">· ' + escapeHtml(it[2]) + '</span></label><div class="choice-grid">';
      DVR_VERIF_ETATS.forEach(function (e) {
        h += '<button type="button" class="choice-btn' + (cur.etat === e[0] ? ' selected' : '') + '" onclick="setDvrVerif(\'' + it[0] + '\',\'etat\',\'' + e[0] + '\');">' + e[1] + '</button>';
      });
      h += '</div>' + (cur.etat === 'partiel' || cur.etat === 'absent'
        ? '<input type="text" class="input" style="margin-top:6px;" placeholder="Précision (ce qui manque)" value="' + escapeHtml(cur.com || '') + '" onchange="setDvrVerif(\'' + it[0] + '\',\'com\',this.value);">' : '') + '</div>';
    });
    h += '</div>';
  });
  var comp = dvrComparaisons(m);
  h += '<div class="card"><div class="section-title" style="margin-top:0;">Valeurs du dossier comparées aux mesures</div>' +
    '<p class="subtitle">' + (comp.length ? comp.length + ' valeur(s) du dossier reportée(s) dans les fiches (champs « valeur de référence ») et comparées à la mesure.'
      : 'Aucune valeur du dossier reportée dans les fiches. Saisissez-les dans les champs « valeur de référence » des installations, ou importez-les (menu ⋯ › Importer les valeurs de référence du client).') + '</p></div>';
  var n = dvrVerifNonRenseignes(m);
  if (n) h += '<p class="subtitle" style="margin:6px 4px;">' + n + ' point(s) de la liste encore à renseigner.</p>';
  h += '<button class="btn btn-primary" onclick="exportDvrPdf(false);">' + ICONS.download + ' Télécharger l’analyse (PDF)</button>';
  h += '<button class="btn btn-gray" onclick="exportDvrPdf(true);">' + ICONS.upload + ' Envoyer l’analyse</button>';
  return h;
}

// ————————————————————————————————————————————
// Documents PDF : éléments communs
// ————————————————————————————————————————————

function dsH(t) { return pdfHeaderCell(t, { size: 8 }); }
function dsB(t, o) { return pdfBodyCell(t === undefined || t === null || t === '' ? '-' : String(t), Object.assign({ size: 8 }, o || {})); }
function dsTexte(t) { return { text: t, fontSize: 9.5, alignment: 'justify', margin: [0, 2, 0, 4] }; }
function dsListe(lignes) { return lignes.map(function (t) { return { text: '-   ' + t, fontSize: 9.5, margin: [0, 1, 0, 1], alignment: 'justify' }; }); }
function dsLignesVides(n, cols) {
  var out = [];
  for (var i = 0; i < n; i++) out.push(cols.map(function () { return dsB(' ', { margin: [2, 7, 2, 7] }); }));
  return out;
}

function dsPresentation(m, objectif, referentiels, intro) {
  var di = m.donneesInternes || {}, ic = m.infosClient || {}, isi = m.infosSiteIntervention || {};
  var c = [pdfHeading1('1. PRESENTATION', { top: 30 })];
  c.push(pdfSubHeading('Objet'));
  c.push(dsTexte(objectif));
  if (intro) intro.forEach(function (p) { c.push(dsTexte(p)); });
  c.push(pdfSubHeading('Demandeur'));
  c.push(pdfLabelValueLine('Nom du demandeur :', ic.nomDemandeur || '—'));
  c.push(pdfLabelValueLine('Adresse du demandeur :', [ic.nomEntreprise, ic.adresse, ((ic.codePostal || '') + ' ' + (ic.ville || '')).trim()].filter(Boolean).join('\n')));
  c.push(pdfSubHeading('Site'));
  c.push(pdfLabelValueLine('Nom du site :', isi.siteIntervention || ic.nomEntreprise || '—'));
  c.push(pdfLabelValueLine('Adresse du site :', [isi.adresseSite, ((isi.codePostal || '') + ' ' + (isi.ville || '')).trim()].filter(Boolean).join('\n')));
  c.push(pdfLabelValueLine('Date(s) d’intervention :', di.datesIntervention || m.dateControle || '—'));
  c.push(pdfSubHeading('Référentiel'));
  referentiels.forEach(function (t) { c.push({ text: '-      ' + t, fontSize: 10 }); });
  return c.concat(pdfTableAppareils(m));
}

function dsDocDefinition(m, opts, content) {
  var di = m.donneesInternes || {}, ic = m.infosClient || {}, is = m.intervenantSite || {}, isi = m.infosSiteIntervention || {};
  var debut = pdfBuildPageDeGarde(m, di, ic, is, isi, PDF_ASSETS.logo, PDF_ASSETS.banner, opts);
  debut.push({ text: '', pageBreak: 'after' });
  debut = debut.concat(pdfBuildSommaire());
  debut.push({ text: '', pageBreak: 'after' });
  return {
    pageSize: 'A4', pageMargins: PDF_PAGE_MARGINS,
    defaultStyle: { font: 'Arial', fontSize: FS(20) },
    info: { title: opts.titre.replace(/\n/g, ' ') + ' – ' + (m.clientSite || '') },
    footer: pdfBuildFooter(di),
    content: debut.concat(content)
  };
}

function dsValidation(texte) {
  return { unbreakable: true, stack: [
    pdfHeading1('VALIDATION', { top: 20 }),
    dsTexte(texte),
    pdfTable([140, 120, 80, '*'], [[dsH('Nom'), dsH('Fonction'), dsH('Date'), dsH('Signature')],
      [dsB(' ', { margin: [2, 20, 2, 20] }), dsB(' '), dsB(' '), dsB(' ')]])
  ] };
}

// ————————————————————————————————————————————
// Dossier de valeurs de référence et consigne d'utilisation (modes 'existante' et 'mise_en_service')
// ————————————————————————————————————————————

var DVR_COULEURS = { releve: '#166534', mini: '#92400E', adefinir: '#555555', so: '#555555' };

function dsItemsRetenus(m) {
  var dv = dvrData(m);
  return dvrItems(m).filter(function (x) { return !dv.exclus[x.it.inst.id]; });
}

// Descriptif d'une installation, à partir de sa fiche (tableaux I et III de l'ED 6008)
function dsDescriptif(x, m) {
  var d = x.it.inst.data, t = x.it.type, l = [];
  var add = function (lib, val) { if (val !== undefined && val !== null && String(val).trim() && String(val).trim() !== '/') l.push([lib, Array.isArray(val) ? val.join(', ') : String(val)]); };
  add('Bâtiment / local', [d.batiment, d.niveau, d.reference_local || d.localisation || d.locaux_extraits || d.atelier].filter(Boolean).join(' — '));
  add('Installation', t.label + (d.reference_equipement ? ' — ' + d.reference_equipement : ''));
  if (x.cfg.cat === 'sp') add('Polluant(s) représentatif(s)', dvrPolluant(m, t, x.it.inst));
  add('Activité', d.activite || d.activite_reference_local);
  add('Ventilation', d.type_ventilation_libelle || d.type_ventilation);
  add('Occupation', d.effectif ? d.effectif + ' personne(s)' : d.travailleur ? (num(d.travailleur) + (num(d.public) || 0)) + ' personne(s)' : '');
  add('Volume du local', d.volume ? frDisplay(d.volume) + ' m³' : '');
  add('Introduction d’air neuf', d.mode_air_neuf || d.locaux_alimentes);
  add('Épuration', d.type_epurateur);
  add('Systèmes de surveillance', d.systemes_surveillance);
  ['pre', 'filtre', 'absolu'].forEach(function (f, i) {
    var cl = d['filt_' + f + '_classe'], ty = d['filt_' + f + '_type'];
    if (cl || ty) add(['Pré-filtre', 'Filtre', 'Filtre absolu'][i], [ty, cl, d['filt_' + f + '_nombre_dimensions']].filter(Boolean).join(' · '));
  });
  add('Point de mesure', d.mesure_localisation || d.localisation_point_mesure || d.point_mesure_gaine);
  return l;
}

function dsTableValeurs(x) {
  var u = function (l) { return l.def.unit ? ' ' + l.def.unit : ''; };
  var body = [[dsH('Grandeur'), dsH('Valeur relevée'), dsH('Valeur de référence proposée'), dsH('Origine')]];
  x.lignes.forEach(function (l) {
    body.push([dsB(l.def.label), dsB(l.val.releve ? l.val.releve + u(l) : '-', { center: true }),
      dsB(l.val.propose ? l.val.propose + u(l) : '-', { center: true, bold: !!l.val.propose }),
      dsB(l.val.label, { color: DVR_COULEURS[l.val.origine] || '#333333', italics: l.val.origine === 'adefinir' })]);
  });
  if (x.cfg.filtres) {
    DVR_FILTRES.forEach(function (f) {
      var d = x.it.inst.data, classe = d['filt_' + f[0] + '_classe'], type = d['filt_' + f[0] + '_type'], pdc = d['filt_' + f[0] + '_perte_charge'];
      if (!classe && !type && !pdc) return;
      body.push([dsB(f[1] + ' — type et classe d’efficacité'), dsB([type, classe].filter(Boolean).join(' · '), { center: true }),
        dsB([type, classe].filter(Boolean).join(' · '), { center: true, bold: true }), dsB('Filtre en place (relevé)', { color: DVR_COULEURS.releve })]);
      body.push([dsB(f[1] + ' — perte de charge initiale / maximale admise'), dsB(dvrFmt(pdc) ? dvrFmt(pdc) + ' Pa' : '-', { center: true }), dsB('-', { center: true }),
        dsB('Donnée constructeur à reporter', { color: DVR_COULEURS.adefinir, italics: true })]);
    });
  }
  return pdfTable([190, 80, 105, '*'], body, { headerRows: 1 });
}

// Lignes du suivi par la pression statique : un débit de référence et, s'il existe, une pression associée
function dsPointsSuivi(x) {
  var debit = x.lignes.filter(function (l) { return l.def.unit === 'm³/h' && l.val.propose && l.val.origine === 'releve'; })[0];
  var pression = x.lignes.filter(function (l) { return l.def.unit === 'Pa' && (l.val.propose || l.val.releve); })[0];
  if (!debit) return null;
  return { debit: debit.val.propose, pression: pression ? (pression.val.propose || pression.val.releve) : '', point: x.it.inst.data.mesure_localisation || x.it.inst.data.localisation_point_mesure || '' };
}

function pdfBuildDossierDocDefinition(m) {
  var dv = dvrData(m), mode = dvrMode(m), mes = mode === 'mise_en_service';
  var di = m.donneesInternes || {};
  var items = dsItemsRetenus(m);
  var dateMes = di.datesIntervention || m.dateControle || '';
  var c = [];
  var n = 1;

  c = c.concat(dsPresentation(m,
    mes ? 'Ce document constitue le dossier d’installation de ventilation établi à la mise en service' + (dv.dateMiseEnService ? ' du ' + dv.dateMiseEnService : '') + ' : notice d’instructions (descriptif des installations et dossier des valeurs de référence) et consigne d’utilisation. Les valeurs de référence caractérisent l’installation par ses paramètres initiaux, réputés satisfaisants ; elles servent ensuite de base aux contrôles périodiques.'
      : 'Ce document constitue le dossier de valeurs de référence et la consigne d’utilisation des installations de ventilation existantes du site, établis à partir des mesures réalisées par SOCOTEC' + (dateMes ? ' le ' + dateMes : '') + '. Les valeurs de référence servent de base aux contrôles périodiques ultérieurs, qui comparent les mesures à ces valeurs.',
    ['Arrêté du 8 octobre 1987 relatif au contrôle périodique des installations d’aération et d’assainissement des locaux de travail, articles 2 à 4,',
      'Code du travail, article R4212-7 (notice d’instructions) et articles R4222-1 et suivants,',
      'Guide INRS ED 6008 « Le dossier d’installation de ventilation » (2023).'],
    [mes ? 'Pour une installation nouvelle, la notice d’instructions est établie par le maître d’ouvrage et le dossier des valeurs de référence au plus tard un mois après la mise en service (INRS ED 6008). La consigne d’utilisation est établie par le chef d’établissement.'
      : 'Pour une installation existante, le dossier d’installation comprend le dossier des valeurs de référence et la consigne d’utilisation ; il est établi par le chef d’établissement, à partir des résultats des premiers contrôles réalisés à son initiative (INRS ED 6008).',
      'SOCOTEC a réalisé les mesures et propose les valeurs ci-après. Une valeur relevée n’est proposée comme référence que lorsque le critère applicable (exigence réglementaire, valeur normative ou recommandée) est satisfait ; dans le cas contraire, la valeur proposée est le minimum réglementaire ou normatif, ou elle reste à définir par le maître d’ouvrage après remise en conformité. Le dossier n’engage le chef d’établissement qu’une fois validé et signé par lui (page de validation).']));

  // Descriptif (installation nouvelle)
  if (mes) {
    n++;
    c.push(pdfHeading1(n + '. NOTICE D’INSTRUCTIONS : DESCRIPTIF DES INSTALLATIONS', { pageBreak: true, top: 30 }));
    c.push(dsTexte('Description des dispositions prises pour l’aération et l’assainissement, établie d’après les constats et les mesures de la mise en service. Les éléments marqués « à compléter » relèvent des documents du maître d’ouvrage (plans, notices des fabricants).'));
    items.forEach(function (x) {
      var rows = dsDescriptif(x, m);
      c.push({ unbreakable: true, stack: [
        { text: x.it.type.label + ' — ' + verifInstallationTitle(x.it), bold: true, fontSize: 9.5, margin: [0, 8, 0, 3] },
        pdfTable([170, '*'], rows.map(function (r) { return [dsB(r[0], { bold: true }), dsB(r[1])]; }).concat([[dsB('Repérage sur plan / schéma', { bold: true }),
          dsReperage(m, x.it.inst) ? dsB(dsReperage(m, x.it.inst) + ' (annexe)') : dsB('À compléter', { italics: true })]]))
      ] });
    });
  }

  // Dossier des valeurs de référence
  n++;
  c.push(pdfHeading1(n + '. DOSSIER DES VALEURS DE REFERENCE', { pageBreak: true, top: 30 }));
  c.push(dsTexte('Contenu fixé par l’arrêté du 8 octobre 1987 : article 3.1 pour les locaux à pollution non spécifique (débits d’air neuf, pressions statiques ou vitesses aux points caractéristiques associées aux débits, caractéristiques des filtres), article 4.1 pour les locaux à pollution spécifique (polluants représentatifs, débits par captage et pressions ou vitesses associées, débit global extrait, efficacité de captage, systèmes de surveillance) et pour les installations avec recyclage (air neuf, efficacité d’épuration, concentrations, surveillance).'));
  c.push({ text: [{ text: 'Origine des valeurs : ', bold: true }, { text: 'valeur relevée', color: DVR_COULEURS.releve }, ' (mesure satisfaisante) ; ', { text: 'minimum réglementaire ou normatif', color: DVR_COULEURS.mini }, ' (mesure non satisfaisante ou indéterminée) ; ', { text: 'à définir par le maître d’ouvrage', color: DVR_COULEURS.adefinir, italics: true }, '.'], fontSize: 8.5, margin: [0, 0, 0, 6] });
  if (!items.length) c.push({ text: 'Aucune installation mesurée et terminée dans la mission.', italics: true, fontSize: 10 });
  DVR_CATEGORIES.forEach(function (cat) {
    var list = items.filter(function (x) { return x.cfg.cat === cat.key; });
    if (!list.length) return;
    c.push(pdfHeading2(n + '.' + (DVR_CATEGORIES.indexOf(cat) + 1) + ' ' + cat.titre.toUpperCase()));
    list.forEach(function (x) {
      var rep = dsReperage(m, x.it.inst);
      var bloc = [{ text: [x.it.type.label + ' — ' + verifInstallationTitle(x.it), rep ? { text: '   ·   ' + rep, bold: false, fontSize: 8.5, color: '#555555' } : ''], bold: true, fontSize: 9.5, margin: [0, 4, 0, 2] }];
      if (x.cfg.cat === 'sp') {
        var refEd = (typeof getEdReferenceForType === 'function' && getEdReferenceForType(x.it.type.id)) || null;
        bloc.push({ text: [{ text: 'Polluant(s) représentatif(s) : ', bold: true }, dvrPolluant(m, x.it.type, x.it.inst) || 'à préciser par le chef d’établissement',
          refEd && /^(ED|NF|EN)/.test(refEd.badge || '') ? '   ·   Efficacité de captage : par conformité au référentiel ' + refEd.badge + ' (débits et géométrie du captage)' : ''], fontSize: 8, margin: [0, 0, 0, 3] });
      }
      bloc.push(dsTableValeurs(x));
      c.push({ stack: bloc, unbreakable: true, margin: [0, 0, 0, 6] });
    });
  });

  // Consigne d'utilisation
  n++;
  var cats = {}; items.forEach(function (x) { cats[x.cfg.cat] = true; });
  var recy = items.some(function (x) { return x.it.type.id === 'recyclage'; });
  c.push(pdfHeading1(n + '. CONSIGNE D’UTILISATION', { pageBreak: true, top: 30 }));
  c.push(dsTexte('Établie par le chef d’établissement (ou son délégué, responsable de l’entretien par exemple), la consigne d’utilisation est un guide pratique pour l’utilisation et le suivi de l’installation. Elle doit être disponible pour les utilisateurs dans les ateliers où sont installés les dispositifs de ventilation.'));
  c.push(pdfHeading2(n + '.1 RAPPEL DES PRINCIPALES VALEURS DE REFERENCE'));
  var rappel = [[dsH('Installation'), dsH('Grandeur'), dsH('Valeur de référence')]];
  items.forEach(function (x) {
    x.lignes.filter(function (l) { return l.val.propose; }).forEach(function (l, i) {
      rappel.push([dsB(i === 0 ? verifInstallationTitle(x.it) : ' '), dsB(l.def.label), dsB(l.val.propose + (l.def.unit ? ' ' + l.def.unit : ''), { center: true, bold: true })]);
    });
  });
  c.push(rappel.length > 1 ? pdfTable([150, '*', 110], rappel, { headerRows: 1 }) : { text: 'Aucune valeur proposée.', italics: true, fontSize: 9 });

  c.push(pdfHeading2(n + '.2 UTILISATION ET ENTRETIEN'));
  c.push(dsTexte('À compléter par le chef d’établissement pour chaque installation : nature des opérations, localisation, fréquence, méthodes préconisées (d’après les notices des fabricants et le contrat d’entretien).'));
  c.push(pdfTable([170, 110, 80, '*'], [[dsH('Nature de l’opération'), dsH('Localisation'), dsH('Fréquence'), dsH('Méthode préconisée')]]
    .concat([[dsB('Contrôle périodique réglementaire (débits, pressions ou vitesses aux points caractéristiques, état des éléments)'), dsB('Ensemble des installations'), dsB('Au moins une fois par an'), dsB('Arrêté du 8 octobre 1987, art. 3.2 et 4.2')]])
    .concat(recy ? [[dsB('Concentration dans l’air recyclé et contrôle de tous les systèmes de surveillance'), dsB('Installations de recyclage'), dsB('Au moins tous les six mois'), dsB('Arrêté du 8 octobre 1987, art. 4.2 b')]] : [])
    .concat(cats.ns ? [[dsB('Remplacement des filtres'), dsB('Centrales de traitement d’air'), dsB('Selon perte de charge maximale admise'), dsB('Filtres de même classe et dimensions que la fourniture initiale')]] : [])
    .concat(dsLignesVides(4, [0, 1, 2, 3])), { headerRows: 1 }));

  c.push(pdfHeading2(n + '.3 MESURES A PRENDRE EN CAS DE PANNE OU DE DYSFONCTIONNEMENT'));
  if (cats.ns) {
    c.push(pdfSubHeading('Locaux à pollution non spécifique (ventilation mécanique)'));
    c = c.concat(dsListe(['Remettre en marche l’installation ou établir une ventilation naturelle provisoire (ouverture des ouvrants).',
      'Si un renouvellement d’air suffisant ne peut être assuré, définir les mesures et délais d’évacuation des locaux.']));
  }
  if (cats.sp) {
    c.push(pdfSubHeading('Locaux à pollution spécifique (captage localisé, ventilation générale)'));
    c = c.concat(dsListe(['Arrêter la production de polluants.',
      'Si l’arrêt n’est pas possible immédiatement, appliquer les mesures de sauvegarde et d’évacuation adaptées aux risques des polluants.',
      'Remettre en marche l’installation ou établir une ventilation provisoire ; à défaut, définir les mesures et délais d’évacuation des locaux.']));
  }
  if (recy) {
    c.push(pdfSubHeading('Installations avec recyclage'));
    c = c.concat(dsListe(['Arrêter le recyclage et rejeter l’air à l’extérieur.',
      'Si l’air ne peut être rejeté à l’extérieur, arrêter la production des polluants ; à défaut, appliquer les mesures de sauvegarde et d’évacuation.']));
  }
  c.push({ text: 'Mesures établies d’après le guide INRS ED 6008 (tableau VII) ; à préciser pour le site (responsables, organes de commande, consignes affichées) :', fontSize: 8.5, italics: true, margin: [0, 6, 0, 2] });
  c.push(pdfTable(['*'], dsLignesVides(3, [0])));

  c.push(pdfHeading2(n + '.4 DOSSIER DE MAINTENANCE'));
  c.push(dsTexte('Le dossier de maintenance rassemble les dates et résultats des contrôles périodiques, les opérations d’entretien et de nettoyage, et les aménagements et réglages modifiant l’installation ou ses valeurs de référence (arrêté du 8 octobre 1987, art. 2 b).'));
  c.push(pdfSubHeading('Contrôles périodiques à réaliser'));
  var per = [];
  if (cats.ns) per.push([dsB('Locaux à pollution non spécifique'), dsB('Tous les ans'), dsB('Débit global minimal d’air neuf ; état des éléments (introduction, extraction, gaines, ventilateurs), présence et conformité des filtres de rechange à la fourniture initiale ; état des systèmes de traitement de l’air ; pressions statiques ou vitesses aux points caractéristiques (art. 3.2)')]);
  if (cats.sp) per.push([dsB('Locaux à pollution spécifique'), dsB('Tous les ans'), dsB('Débit global d’air extrait ; pressions statiques ou vitesses aux points caractéristiques, notamment au niveau des captages ; état de tous les éléments (captages, gaines, dépoussiéreurs, épurateurs, compensation) (art. 4.2 a)')]);
  if (recy) per.push([dsB('Installations avec recyclage'), dsB('Tous les six mois'), dsB('Concentration en poussières ou autres polluants dans les gaines de recyclage ou à leur sortie ; contrôle de tous les systèmes de surveillance (art. 4.2 b)')]);
  if (per.length) c.push(pdfTable([130, 70, '*'], [[dsH('Locaux'), dsH('Périodicité minimale'), dsH('Contrôles')]].concat(per), { headerRows: 1 }));
  c.push(pdfSubHeading('Suivi des contrôles : vérification du débit par la pression statique'));
  c.push(dsTexte('Lorsqu’une pression statique de référence est associée au débit, le débit actuel peut être estimé à partir de la pression mesurée au même point : Q = Qréf × √(P / Préf) (INRS ED 6008).'));
  var suivi = [[dsH('Installation'), dsH('Point de mesure'), dsH('Débit de référence (m³/h)'), dsH('Pression de référence (Pa)'), dsH('Date'), dsH('Pression mesurée (Pa)'), dsH('Débit estimé (m³/h)')]];
  items.forEach(function (x) {
    var p = dsPointsSuivi(x);
    if (p) suivi.push([dsB(verifInstallationTitle(x.it)), dsB(p.point || ' '), dsB(p.debit, { center: true, bold: true }), dsB(p.pression || ' ', { center: true }), dsB(' '), dsB(' '), dsB(' ')]);
  });
  if (suivi.length > 1) c.push(pdfTable([110, 75, 65, 65, 55, 60, '*'], suivi, { headerRows: 1 }));
  c.push(pdfSubHeading('Opérations d’entretien et de nettoyage'));
  c.push(pdfTable([70, '*', 130], [[dsH('Date'), dsH('Opération'), dsH('Intervenant')]].concat(dsLignesVides(4, [0, 1, 2])), { headerRows: 1 }));
  c.push(pdfSubHeading('Aménagements et réglages'));
  c.push(pdfTable([70, '*', 130], [[dsH('Date'), dsH('Aménagement ou réglage (et valeurs de référence modifiées)'), dsH('Intervenant')]].concat(dsLignesVides(3, [0, 1, 2])), { headerRows: 1 }));

  c.push({ text: '', pageBreak: 'before' });
  c.push(dsValidation('Les valeurs proposées sont adoptées comme valeurs de référence de l’installation. Le présent dossier est intégré au dossier d’installation et tenu à la disposition de l’inspection du travail, des services de prévention des Carsat/Cramif/CGSS et des instances représentatives du personnel.' + (dv.valideLe ? ' Validé le ' + dv.valideLe + '.' : '')));

  // Annexe : plans du site (installations repérées) et schémas de réseau, pour les points de mesure
  // et le repérage cités plus haut (images préparées par exportDvrPdf, comme pour le rapport)
  if (typeof pdfBuildPlansSite === 'function') c = c.concat(pdfBuildPlansSite(m, 'ANNEXE — PLAN DU SITE'));
  if (typeof pdfBuildSchemas === 'function') c = c.concat(pdfBuildSchemas(m, 'ANNEXE — SCHEMAS DES RESEAUX'));

  return dsDocDefinition(m, mes
    ? { bandeau: 'Dossier technique', titre: 'DOSSIER D’INSTALLATION DE VENTILATION\nVALEURS DE RÉFÉRENCE À LA MISE EN SERVICE' }
    : { bandeau: 'Dossier technique', titre: 'DOSSIER DE VALEURS DE RÉFÉRENCE\nET CONSIGNE D’UTILISATION' }, c);
}

// ————————————————————————————————————————————
// Analyse d'un dossier existant (mode 'analyse')
// ————————————————————————————————————————————

function pdfBuildAnalyseDvrDocDefinition(m) {
  var v = dvrVerif(m), doc = v.document, c = [];
  c = c.concat(dsPresentation(m,
    'Ce rapport présente l’analyse du dossier de valeurs de référence des installations de ventilation du site : complétude au regard de l’arrêté du 8 octobre 1987, puis comparaison des valeurs du dossier aux mesures réalisées par SOCOTEC.',
    ['Arrêté du 8 octobre 1987 relatif au contrôle périodique des installations d’aération et d’assainissement des locaux de travail, articles 2 à 4,',
      'Code du travail, article R4212-7 (notice d’instructions),',
      'Guide INRS ED 6008 « Le dossier d’installation de ventilation » (2023).']));
  c.push(pdfSubHeading('Document analysé'));
  c.push(pdfTable([170, '*'], [[dsB('Intitulé', { bold: true }), dsB(doc.titre)], [dsB('Établi par', { bold: true }), dsB(doc.auteur)], [dsB('Date', { bold: true }), dsB(doc.date)]]));

  // 2. Complétude
  c.push(pdfHeading1('2. COMPLETUDE DU DOSSIER', { pageBreak: true, top: 30 }));
  c.push(dsTexte('Chaque élément attendu est indiqué présent, partiel (mentionné mais incomplet) ou absent du dossier analysé. Les groupes retenus dépendent des installations du site.'));
  var etatCol = { present: 0, partiel: 1, absent: 2, so: 3 };
  dvrVerifGroupes(m).forEach(function (g) {
    var body = [[dsH('Élément attendu'), dsH('Texte'), dsH('Présent'), dsH('Partiel'), dsH('Absent'), dsH('Sans objet'), dsH('Précision')]];
    g.items.forEach(function (it) {
      var cur = v.items[it[0]] || {}, col = etatCol[cur.etat];
      var x = function (i) { return dsB(col === i ? 'X' : ' ', { center: true, bold: true }); };
      body.push([dsB(it[1]), dsB(it[2]), x(0), x(1), x(2), x(3), dsB(cur.etat ? cur.com || ' ' : 'Non renseigné', { italics: !cur.etat })]);
    });
    c.push({ stack: [pdfSubHeading(g.titre), pdfTable([165, 60, 38, 38, 38, 40, '*'], body, { headerRows: 1 })], unbreakable: true });
  });

  // 3. Comparaison
  var comp = dvrComparaisons(m);
  c.push(pdfHeading1('3. VALEURS DU DOSSIER COMPAREES AUX MESURES', { top: 30 }));
  if (comp.length) {
    c.push(dsTexte('Les valeurs du dossier sont comparées aux mesures de SOCOTEC. Une mesure est jugée satisfaisante lorsqu’elle atteint au moins 80 % de la valeur de référence (règle appliquée aux contrôles périodiques) ou, selon la grandeur, la valeur réglementaire ou recommandée.'));
    var body = [[dsH('Installation'), dsH('Grandeur'), dsH('Valeur du dossier'), dsH('Valeur mesurée'), dsH('Écart'), dsH('Avis')]];
    comp.forEach(function (x) {
      var u = x.unit ? ' ' + x.unit : '';
      body.push([dsB(verifInstallationTitle(x.it)), dsB(x.label), dsB(dvrFmt(x.ref, x.unit) + u, { center: true }), dsB(x.mes === null ? '-' : dvrFmt(x.mes, x.unit) + u, { center: true, bold: true }),
        dsB(x.ecart === null ? '-' : (x.ecart > 0 ? '+' : '') + frDisplay(String(x.ecart)) + ' %', { center: true }), dsB(x.avis, { center: true, color: pdfAvisColor(x.avis), bold: true })]);
    });
    c.push(pdfTable([115, '*', 70, 70, 45, 85], body, { headerRows: 1 }));
  } else {
    c.push(dsTexte('Aucune valeur du dossier n’a été reportée dans les fiches de mesure : la comparaison n’a pas pu être faite.'));
  }

  // 4. Conclusion
  var manques = dvrVerifManques(m), nr = dvrVerifNonRenseignes(m);
  c.push(pdfHeading1('4. CONCLUSION', { top: 30 }));
  if (!manques.length && !nr) c.push(dsTexte('Le dossier analysé comporte l’ensemble des éléments attendus au regard de l’arrêté du 8 octobre 1987.'));
  else {
    if (manques.length) {
      c.push(dsTexte('Le dossier analysé est incomplet. Éléments à compléter par le chef d’établissement (ou le maître d’ouvrage pour la notice d’instructions) :'));
      c = c.concat(dsListe(manques.map(function (x) { return x.item[1] + ' (' + x.item[2] + ')' + (x.etat === 'partiel' ? ' : partiel' : ' : absent') + (x.com ? ' — ' + x.com : ''); })));
    }
    if (nr) c.push(dsTexte(nr + ' élément(s) n’ont pas pu être examinés.'));
  }
  var ns = comp.filter(function (x) { return x.avis === 'Non Satisfaisant'; });
  if (ns.length) c.push(dsTexte(ns.length + ' valeur(s) mesurée(s) n’atteignent pas la valeur du dossier : voir le tableau du chapitre 3 et le rapport de contrôle.'));
  c.push(dsTexte('Les éléments manquants peuvent être établis lors d’un contrôle à l’initiative du chef d’établissement (arrêté du 8 octobre 1987, art. 2).'));

  return dsDocDefinition(m, { bandeau: 'Rapport d’analyse', titre: 'ANALYSE DU DOSSIER DE VALEURS DE RÉFÉRENCE\nDES INSTALLATIONS DE VENTILATION' }, c);
}

function dossierInstallationDocDefinition(m) {
  return dvrMode(m) === 'analyse' ? pdfBuildAnalyseDvrDocDefinition(m) : pdfBuildDossierDocDefinition(m);
}

console.log('✓ Dossier de valeurs de référence (établissement et analyse) chargé');
