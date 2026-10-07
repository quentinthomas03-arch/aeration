// rapport-recyclage.js - Rapport autonome du contrôle semestriel des installations de recyclage (2026-10-07)
//
// Prestation « recyclage » commandée seule : rapport distinct du rapport annuel (même page de garde,
// même pied de page). Pendant un contrôle annuel, les mêmes fiches figurent comme chapitre du rapport.
// Contenu :
//  1. Présentation de la mission (objectif, demandeur, site, référentiel, matériel)
//  2. Synthèse : chaque disposition (arrêté du 8 octobre 1987, art. 4.2 b ; Code du travail R4222-9 à
//     R4222-17) en Conforme / Non conforme / Ne peut se prononcer, avec commentaire ; à part, les
//     conditions recommandées par l'INRS (ED 6008)
//  3. Méthode de mesure et critères (limites de la mesure à lecture directe écrites noir sur blanc)
//  4. Suivi d'un contrôle à l'autre (concentrations, prochain contrôle)
//  5. Rappels (dossier de maintenance, arrêt du recyclage en cas de défaillance, information)
//  6. Fiches par installation
// Un contrôle non réalisé (surveillance non testée, concentration non mesurée) ne sort jamais
// « conforme » : il est classé « ne peut se prononcer ».

var RR_COL = { 'Satisfaisant': 0, 'Non Satisfaisant': 1, 'Impossible de se prononcer': 2 };

function rrInstallations(m) {
  return ((m.installations && m.installations.recyclage) || []).filter(function (inst) { return !(inst.data && inst.data._nonControle); });
}

// Mission composée uniquement d'installations de recyclage : le bouton « Rapport PDF » produit ce rapport
function rrMissionRecyclageSeule(m) {
  var sel = (m && m.typesSelectionnes) || [];
  return sel.length === 1 && sel[0] === 'recyclage';
}

function rrF(v, dec) { return isNaN(v) ? '-' : frDisplay(String(Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec))); }

// Lignes de la synthèse d'une installation : [disposition, texte, avis, commentaire]
function rrLignesSynthese(d) {
  var lim = rcLignesLimites(d);
  var dep = lim.filter(function (l) { return l.avis === 'Non Satisfaisant'; });
  var mes = lim.filter(function (l) { return !isNaN(l.conc); });
  var comCinq = dep.length ? dep.map(function (l) { return l.nom + ' : ' + rrF(l.conc, 3) + ' > ' + rrF(l.limite, 3) + ' mg/m³'; }).join(' ; ')
    : mes.length ? mes.map(function (l) { return l.nom + ' : ' + rrF(l.conc, 3) + ' ≤ ' + rrF(l.limite, 3) + ' mg/m³'; }).join(' ; ')
    : 'Concentration non mesurée ou VLEP non renseignée';
  if (rcPhotometre(d) && mes.length) comCinq += ' (mesure à lecture directe)';
  var sys = Array.isArray(d.systemes_surveillance) ? d.systemes_surveillance : [];
  var aucun = sys.indexOf('Aucun') !== -1 || d.surveillance_test === RC_TESTS[3];
  var presence = aucun ? 'Non Satisfaisant' : sys.length ? 'Satisfaisant' : 'Impossible de se prononcer';
  var test = d.surveillance_test || d.surveillance_etat || '';
  var lignes = [
    ['Concentration en polluants dans les gaines de recyclage ou à leur sortie : au plus 1/5 de la VLEP', 'Arrêté du 8/10/1987, art. 4.2 b ; INRS ED 6008', d.avis_cinquieme, comCinq],
    ['Contrôle de tous les systèmes de surveillance', 'Arrêté du 8/10/1987, art. 4.2 b', d.avis_surveillance,
      test ? test + (d.surveillance_test_methode ? ' (' + d.surveillance_test_methode + ')' : '') : 'Test non renseigné'],
    ['Système de surveillance des dispositifs d’épuration', 'Code du travail, R4222-16', presence, sys.join(', ') || 'Non renseigné'],
    ['Destination de l’air recyclé', 'Code du travail, R4222-9 et R4222-14', d.avis_destination, d.destination || ''],
    ['Conditions du recyclage portées à la connaissance du médecin du travail et du CSE', 'Code du travail, R4222-17',
      d.information_medecin_cse === 'Oui' ? 'Satisfaisant' : d.information_medecin_cse === 'Non' ? 'Non Satisfaisant' : 'Impossible de se prononcer',
      d.information_medecin_cse === 'Non vérifié' ? 'Non vérifié lors du contrôle' : ''],
    ['État du système d’épuration', 'Arrêté du 8/10/1987, art. 4.2 a', d.etat_epurateur ? (d.etat_epurateur === 'Bon état' ? 'Satisfaisant' : 'Non Satisfaisant') : 'Impossible de se prononcer',
      [d.etat_epurateur, d.avis_perte_charge ? 'perte de charge ' + rrF(num(d.perte_charge), 0) + ' Pa (maximum ' + rrF(num(d.perte_charge_max), 0) + ' Pa)' : ''].filter(Boolean).join(', ')]
  ];
  var ref = String(d.ref_gaine || '').trim();
  if (ref && ref !== '/' && ref !== '-') lignes.splice(1, 0, ['Concentration / valeur du dossier de valeurs de référence', 'Arrêté du 8/10/1987, art. 4.1', d.avis_gaine,
    rrF(num(d.conc_inhalable_gaine), 3) + ' mg/m³ pour une référence de ' + frDisplay(ref) + ' mg/m³']);
  if (d.avis_air_neuf) lignes.push(['Débit minimal d’air neuf', 'Code du travail, R4222-6 et R4222-11', d.avis_air_neuf,
    rrF(num(d.debit_air_neuf), 0) + ' m³/h pour un minimum de ' + rrF(num(d.debit_min_air_neuf), 0) + ' m³/h']);
  if (d.avis_atmosphere) lignes.push(['Atmosphère du local sous les valeurs limites', 'Code du travail, R4222-10 et R4222-14', d.avis_atmosphere, d.mesure_8h === 'Oui' ? '' : 'Mesure non représentative de 8 h']);
  return lignes;
}

function rrTableSynthese(d) {
  var h = function (t) { return pdfHeaderCell(t, { size: 8 }); };
  var b = function (t, o) { return pdfBodyCell(t, Object.assign({ size: 8 }, o || {})); };
  var body = [[h('Disposition contrôlée'), h('Texte'), h('Conforme'), h('Non conforme'), h('Ne peut se prononcer'), h('Commentaire')]];
  rrLignesSynthese(d).forEach(function (l) {
    var col = RR_COL[l[2]];
    var x = function (i) { return b(col === i ? 'X' : '', { center: true, bold: true }); };
    body.push([b(l[0]), b(l[1]), x(0), x(1), x(2), b(l[3] || '')]);
  });
  return pdfTable([150, 80, 42, 42, 50, '*'], body, { headerRows: 1 });
}

function rrTableRecommandations(list) {
  var lignes = list.filter(function (inst) { return inst.data.avis_recommandations; });
  if (!lignes.length) return [];
  var h = function (t) { return pdfHeaderCell(t, { size: 8 }); };
  var b = function (t, o) { return pdfBodyCell(t, Object.assign({ size: 8 }, o || {})); };
  var body = [[h('Installation'), h('Période de recyclage'), h('Dérivation vers l’extérieur'), h('Polluants tous identifiés'), h('Avis')]];
  lignes.forEach(function (inst) {
    var d = inst.data;
    body.push([b(d.reference_equipement || '-'), b(d.periode_recyclage || '-'), b(d.derivation_exterieur || '-'), b(d.polluants_connus || '-'), b(d.avis_recommandations, { center: true, bold: true })]);
  });
  return [pdfSubHeading('Conditions recommandées par l’INRS (hors avis réglementaire)'),
    { text: 'Le guide INRS ED 6008 recommande de ne recycler qu’en période de chauffage ou de climatisation, de pouvoir rejeter l’air directement à l’extérieur (notamment en cas de panne de l’épuration) et de ne recycler que si tous les polluants sont connus. Ces conditions sont indiquées pour information ; elles n’entrent pas dans l’avis réglementaire.', fontSize: 9, margin: [0, 2, 0, 6] },
    pdfTable([110, 120, 100, 90, '*'], body, { headerRows: 1 })];
}

function rrSectionMethode(list) {
  var photo = list.some(function (inst) { return rcPhotometre(inst.data); });
  var gravi = list.some(function (inst) { return inst.data.methode_mesure === RC_GRAVI; });
  var c = [pdfHeading1('3. METHODE DE MESURE ET CRITERES', { pageBreak: true, top: 30 })];
  c.push(pdfSubHeading('Critère appliqué'));
  c.push({ text: 'L’arrêté du 8 octobre 1987 (art. 4.2 b) impose, au minimum tous les six mois lorsqu’il existe un système de recyclage, le contrôle de la concentration en poussières sans effet spécifique ou en autres polluants dans les gaines de recyclage ou à leur sortie dans un écoulement canalisé, et le contrôle de tous les systèmes de surveillance mis en œuvre. Conformément au guide INRS ED 6008, la concentration de chaque polluant dans l’air recyclé est comparée au cinquième de sa valeur limite d’exposition professionnelle (VLEP 8 h). Pour les poussières sans effet spécifique, les valeurs de l’article R4222-10 du Code du travail sont retenues : 4 mg/m³ (fraction inhalable) et 0,9 mg/m³ (fraction alvéolaire), soit des limites de 0,8 et 0,18 mg/m³ dans l’air recyclé.', fontSize: 9.5, alignment: 'justify' });
  if (photo) {
    c.push(pdfSubHeading('Mesure par photomètre à lecture directe'));
    c.push({ text: 'La concentration est mesurée en continu par un photomètre laser à diffusion de la lumière à plusieurs canaux (DustTrak DRX : PM1, PM2,5, RESP – fraction alvéolaire, PM10, TOTAL). La moyenne de chaque canal sur la durée de la mesure est relevée. La fraction alvéolaire est comparée au canal RESP ; la fraction inhalable au canal TOTAL, qui la majore. La réponse d’un photomètre dépend de la nature des particules : sans facteur de correction établi par comparaison à une mesure gravimétrique, le résultat est indicatif. Le facteur appliqué (1 en l’absence d’étalonnage) est indiqué pour chaque installation.', fontSize: 9.5, alignment: 'justify' });
  }
  if (gravi) {
    c.push(pdfSubHeading('Mesure par prélèvement et analyse gravimétrique'));
    c.push({ text: 'La concentration est déterminée par prélèvement sur filtre et pesée (méthode de référence pour les faibles concentrations en conduit : NF EN 13284-1).', fontSize: 9.5, alignment: 'justify' });
  }
  c.push(pdfSubHeading('Systèmes de surveillance'));
  c.push({ text: 'Chaque système de surveillance (alarme de colmatage, détecteur de poussières…) est testé en conditions réelles lorsque c’est possible. Un système qui n’a pas pu être testé ne permet pas de conclure : la disposition est alors classée « ne peut se prononcer ».', fontSize: 9.5, alignment: 'justify' });
  return c;
}

function rrSectionSuivi(list) {
  var h = function (t) { return pdfHeaderCell(t, { size: 8 }); };
  var b = function (t, o) { return pdfBodyCell(t, Object.assign({ size: 8 }, o || {})); };
  var body = [[h('Installation'), h('Polluant'), h('Limite (mg/m³)'), h('Contrôle précédent (mg/m³)'), h('Ce contrôle (mg/m³)'), h('Prochain contrôle avant le')]];
  list.forEach(function (inst) {
    var d = inst.data, lim = rcLignesLimites(d);
    if (!lim.length) lim = [{ nom: '-', limite: NaN, n1: NaN, conc: NaN }];
    lim.forEach(function (l, i) {
      body.push([b(i === 0 ? d.reference_equipement || '-' : ''), b(l.nom), b(rrF(l.limite, 3), { center: true }), b(rrF(l.n1, 3), { center: true }),
        b(rrF(l.conc, 3), { center: true, bold: true }), b(i === 0 ? d.prochain_controle || '-' : '', { center: true })]);
    });
  });
  return [pdfHeading1('4. SUIVI D’UN CONTROLE A L’AUTRE', { top: 30 }),
    { text: 'Le contrôle est à renouveler au minimum tous les six mois (arrêté du 8 octobre 1987, art. 4.2 b). Ses résultats sont à reporter dans le dossier de maintenance de l’installation (art. 2 b).', fontSize: 9.5, margin: [0, 0, 0, 8] },
    pdfTable([105, 120, 60, 75, 65, '*'], body, { headerRows: 1 })];
}

function rrSectionRappels() {
  var t = function (s) { return { text: '-   ' + s, fontSize: 9.5, margin: [0, 2, 0, 2], alignment: 'justify' }; };
  return [pdfHeading1('5. RAPPELS', { top: 30 }),
    t('L’air provenant d’un local à pollution spécifique ne peut être recyclé que s’il est efficacement épuré, et renvoyé dans d’autres locaux que si la pollution y est de même nature ; il ne peut l’être vers un local à pollution non spécifique (Code du travail, R4222-14 et R4222-9).'),
    t('En cas de recyclage, les concentrations dans l’atmosphère du local doivent rester inférieures aux valeurs limites d’exposition professionnelle (R4222-14).'),
    t('Les dispositifs d’épuration doivent être équipés d’un système de surveillance permettant de déceler leurs défauts (R4222-16).'),
    t('Les conditions du recyclage sont portées à la connaissance du médecin du travail et du comité social et économique (R4222-17).'),
    t('La consigne d’utilisation de l’installation prévoit les mesures permettant l’arrêt du recyclage en cas de panne ou de dysfonctionnement de l’épuration (INRS ED 6008).')];
}

function pdfBuildRecyclageDocDefinition(m) {
  var di = m.donneesInternes || {}, ic = m.infosClient || {}, is = m.intervenantSite || {}, isi = m.infosSiteIntervention || {};
  var list = rrInstallations(m);
  var content = [];
  content = content.concat(pdfBuildPageDeGarde(m, di, ic, is, isi, PDF_ASSETS.logo, PDF_ASSETS.banner,
    { bandeau: 'Rapport de contrôle', titre: 'CONTRÔLE SEMESTRIEL DES INSTALLATIONS\nD’ÉPURATION AVEC RECYCLAGE DE L’AIR' }));
  content.push({ text: '', pageBreak: 'after' });
  content = content.concat(pdfBuildSommaire());
  content.push({ text: '', pageBreak: 'after' });

  // 1. Présentation
  content.push(pdfHeading1('1. PRESENTATION DE LA MISSION', { top: 30 }));
  if (typeof pdfMentionsQualite === 'function') content = content.concat(pdfMentionsQualite(m));
  content.push(pdfSubHeading('Objectif'));
  content.push({ text: 'Ce rapport présente les résultats du contrôle semestriel des installations d’épuration avec recyclage de l’air du site ' + (isi.siteIntervention || ic.nomEntreprise || '—') + ' : concentration en polluants dans l’air recyclé, contrôle des systèmes de surveillance et conditions du recyclage.', fontSize: 10, margin: [0, 6, 0, 6] });
  content.push(pdfSubHeading('Demandeur'));
  content.push(pdfLabelValueLine('Nom du demandeur :', ic.nomDemandeur || '—'));
  content.push(pdfLabelValueLine('Adresse du demandeur :', [ic.nomEntreprise, ic.adresse, ((ic.codePostal || '') + ' ' + (ic.ville || '')).trim()].filter(Boolean).join('\n')));
  content.push(pdfSubHeading('Site d’intervention'));
  content.push(pdfLabelValueLine('Nom du site :', isi.siteIntervention || ic.nomEntreprise || '—'));
  content.push(pdfLabelValueLine('Adresse du site :', [isi.adresseSite, ((isi.codePostal || '') + ' ' + (isi.ville || '')).trim()].filter(Boolean).join('\n')));
  content.push(pdfSubHeading('Référentiel'));
  ['Code du travail, articles R4222-9, R4222-10 et R4222-14 à R4222-17,',
    'Arrêté du 8 octobre 1987 relatif au contrôle périodique des installations d’aération et d’assainissement des locaux de travail, article 4,',
    'Guide INRS ED 6008 « Le dossier d’installation de ventilation » (2023).'
  ].forEach(function (t) { content.push({ text: '-      ' + t, fontSize: 10 }); });
  content = content.concat(pdfTableAppareils(m));
  var docs = ((m.documentsTransmis || {}).documents || []).filter(function (x) { return x && x.label && x.transmis; });
  if (docs.length) {
    content.push(pdfSubHeading('Documents transmis à SOCOTEC'));
    var hd = function (t) { return pdfHeaderCell(t, { size: 8 }); }, cd = function (t, o) { return pdfBodyCell(t, Object.assign({ size: 8 }, o || {})); };
    content.push(pdfTable([260, 70, '*'], [[hd('Nature du document'), hd('Transmis'), hd('Commentaire')]].concat(docs.map(function (x) {
      return [cd(x.label), cd(x.transmis, { center: true }), cd(x.commentaire || '')];
    })), { headerRows: 1 }));
  }

  // 2. Synthèse
  content.push(pdfHeading1('2. SYNTHESE DU CONTROLE', { pageBreak: true, top: 30 }));
  if (!list.length) content.push({ text: 'Aucune installation de recyclage renseignée.', italics: true, fontSize: 10 });
  list.forEach(function (inst, i) {
    var d = inst.data;
    content.push({ stack: [
      pdfHeading2('2.' + (i + 1) + ' ' + String(d.reference_equipement || 'Installation ' + (i + 1)).toUpperCase()),
      { text: [d.batiment, d.localisation].filter(Boolean).join(' — '), fontSize: 9, margin: [0, -8, 0, 6] },
      rrTableSynthese(d),
      { text: [{ text: 'Avis par rapport à la réglementation : ', bold: true }, { text: d.avis || '-', bold: true, color: pdfAvisColor(d.avis) }], fontSize: 10, margin: [0, 6, 0, 12] }
    ] });
  });
  content = content.concat(rrTableRecommandations(list));

  // 3. Méthode, 4. Suivi, 5. Rappels
  content = content.concat(rrSectionMethode(list));
  content = content.concat(rrSectionSuivi(list));
  content = content.concat(rrSectionRappels());

  // 6. Fiches
  content.push(Object.assign(pdfTocMarker('6. RESULTATS PAR INSTALLATION', 1), { pageBreak: 'before' }));
  content = content.concat(pdfBuildAnnexeRecyclage(list, PDF_ASSETS.logo));

  return {
    pageSize: 'A4', pageMargins: PDF_PAGE_MARGINS,
    defaultStyle: { font: 'Arial', fontSize: FS(20) },
    info: { title: 'Contrôle semestriel du recyclage – ' + (m.clientSite || '') },
    footer: pdfBuildFooter(di),
    content: content
  };
}

function exportRecyclagePdf(share) {
  var m = getCurrentMission();
  if (!m) return;
  if (!rrInstallations(m).length) { alert('Aucune installation de recyclage dans cette mission.'); return; }
  rapportProgres('Préparation du rapport de recyclage…');
  ensureLib('pdf').then(function () {
    return Promise.all([resolveMissionPhotos(m), pdfFetchAsDataUrl(LOGO_PATH), pdfFetchAsDataUrl(BANNER_PATH)]);
  }).then(function (r) {
    PDF_ASSETS.logo = r[1]; PDF_ASSETS.banner = r[2];
    var pdf = rapportPdfAvecProgres(pdfMake.createPdf(pdfBuildRecyclageDocDefinition(r[0])), rrInstallations(m).length);
    var name = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').trim() + '_recyclage_controle_semestriel.pdf';
    rapportProgresFin();
    if (share && typeof offerPdfShare === 'function') offerPdfShare(pdf, name, missionMailDraft(m, 'Contrôle semestriel du recyclage'));
    else pdf.download(name);
  }).catch(function (err) { rapportProgresFin(); alert('Erreur lors de la génération du rapport.\n' + err.message); });
}

console.log('✓ Rapport du contrôle semestriel du recyclage chargé');
