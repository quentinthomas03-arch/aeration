// sorties.js - Ce qui sort de l'appli vers le client (chantier du 2026-10-03)
//
//  - Envoi du rapport PDF par le partage natif du téléphone (mail, Teams...), repli téléchargement +
//    brouillon de mail adressé au contact du site.
//  - Export Excel de la synthèse (une ligne par installation) et du détail par type.
//  - Compte rendu de fin de visite : une page récapitulative signée par le client sur l'écran.

// ————————————————————————————————————————————
// Envoi d'un PDF
// ————————————————————————————————————————————

// navigator.share() n'est accepté que juste après un geste de l'utilisateur ; or la génération du PDF
// prend quelques secondes. Le fichier est donc préparé d'abord, puis un bandeau « Envoyer » déclenche
// le partage sur un second geste.
var _pendingShare = null;

function missionMailDraft(m, objet) {
  var site = m.clientSite || (m.infosSiteIntervention && m.infosSiteIntervention.siteIntervention) || '';
  var auteur = (m.donneesInternes && m.donneesInternes.auteurRapport) || m.controleur || '';
  return {
    to: (m.infosSiteIntervention && m.infosSiteIntervention.mailContact) || '',
    subject: objet + (site ? ' – ' + site : ''),
    body: 'Bonjour,\n\nVeuillez trouver ci-joint le ' + objet.toLowerCase() + (site ? ' du site ' + site : '') + '.\n\nCordialement,\n' + auteur
  };
}

function offerPdfShare(pdf, filename, draft) {
  pdf.getBlob(function (blob) { offerFileShare(blob, filename, 'application/pdf', draft); });
}

// Bandeau « Envoyer » pour un fichier déjà prêt (PDF, mission .json…)
function offerFileShare(blob, filename, mime, draft) {
  offerFilesShare([{ blob: blob, filename: filename, mime: mime }], draft);
}

// Bandeau « Envoyer » pour un ou plusieurs fichiers prêts (ex. rapport PDF + mission .json)
function offerFilesShare(files, draft) {
  _pendingShare = { files: files, draft: draft };
  var old = document.getElementById('share-ready-banner');
  if (old) old.remove();
  var total = files.reduce(function (s, f) { return s + f.blob.size; }, 0);
  var label = files.length === 1 ? escapeHtml(files[0].filename) + ' prêt' : files.length + ' fichiers prêts (PDF + mission)';
  var banner = document.createElement('div');
  banner.id = 'share-ready-banner';
  banner.className = 'sw-update-banner';
  banner.innerHTML = '<span>' + label + ' (' + Math.max(1, Math.round(total / 1024)) + ' Ko)</span>' +
    '<span style="display:flex;gap:4px;"><button type="button" class="sw-update-btn" onclick="sharePendingPdf();">Envoyer</button>' +
    '<button type="button" class="sw-update-btn" style="color:#94a0b8;" onclick="this.closest(\'#share-ready-banner\').remove();">Fermer</button></span>';
  document.body.appendChild(banner);
}

function pendingShareFiles(p) {
  return p.files || [{ blob: p.blob, filename: p.filename, mime: p.mime }];
}

function sharePendingPdf() {
  var p = _pendingShare;
  var banner = document.getElementById('share-ready-banner');
  if (banner) banner.remove();
  if (!p) return;
  var files = null;
  try {
    files = pendingShareFiles(p).map(function (f) { return new File([f.blob], f.filename, { type: f.mime || 'application/pdf' }); });
  } catch (e) { files = null; }
  if (files && navigator.canShare && navigator.canShare({ files: files })) {
    navigator.share({ files: files, title: p.draft.subject, text: p.draft.body }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      fallbackMailWithDownload(p);
    });
    return;
  }
  fallbackMailWithDownload(p);
}

// Ordinateur (pas de partage de fichier) : les fichiers sont téléchargés et un brouillon de mail
// s'ouvre (Outlook) ; il ne reste qu'à y glisser les pièces jointes.
function fallbackMailWithDownload(p) {
  var files = pendingShareFiles(p);
  files.forEach(function (f, i) { setTimeout(function () { downloadBlob(f.blob, f.filename); }, i * 400); });
  var href = 'mailto:' + encodeURIComponent(p.draft.to) + '?subject=' + encodeURIComponent(p.draft.subject) +
    '&body=' + encodeURIComponent(p.draft.body + '\n\n(Pièce' + (files.length > 1 ? 's' : '') + ' jointe' + (files.length > 1 ? 's' : '') + ' : ' +
      files.map(function (f) { return f.filename; }).join(', ') + ')');
  setTimeout(function () { window.location.href = href; }, files.length * 400);
}

// Mail de la mission : objet, texte et signature prêts, destinataire choisi dans Outlook
function missionTransfertMailDraft(m, jsonFilename, pdfFilename) {
  var di = m.donneesInternes || {}, site = m.clientSite || (m.infosSiteIntervention && m.infosSiteIntervention.siteIntervention) || '';
  var p = (typeof getProfilTechnicien === 'function' && getProfilTechnicien()) || {};
  var date = new Date().toLocaleDateString('fr-FR');
  var signature = [p.nom || di.auteurRapport || m.controleur || '', p.agence ? 'SOCOTEC – ' + p.agence : 'SOCOTEC', p.tel || ''].filter(Boolean).join('\n');
  var lignes = pdfFilename
    ? 'Ci-joint, pour le contrôle de l’aération' + (site ? ' du site ' + site : '') + ' :\n' +
      '- le rapport : ' + pdfFilename + '\n' +
      '- le fichier de la mission : ' + jsonFilename + ' (pour reprendre ou modifier la mission, sur ordinateur ou sur un autre téléphone : appli Contrôle Aération, « Importer une mission »)'
    : 'Ci-joint le fichier de la mission de contrôle de l’aération' + (site ? ' du site ' + site : '') + ' (' + jsonFilename + ').\n' +
      'Pour l’ouvrir : appli Contrôle Aération, « Importer une mission » (ou « Fusionner le travail d’un collègue » pour ajouter ce travail à une mission existante).';
  return {
    to: '',
    subject: (pdfFilename ? 'Rapport aération' : 'Mission aération') + (site ? ' – ' + site : '') + (di.numeroAffaire ? ' – affaire ' + di.numeroAffaire : '') + ' – ' + date,
    body: 'Bonjour,\n\n' + lignes + '\n\nCordialement,\n' + signature
  };
}

// Menu de la mission : un mail avec le rapport PDF ET la mission .json (pour modifier sur PC si besoin)
function envoyerRapportEtMission() {
  var m = getCurrentMission();
  if (!m) return;
  Promise.all([
    buildRapportPdf(m).then(function (r) {
      return new Promise(function (res) { r.pdf.getBlob(function (b) { res({ blob: b, filename: r.filename, mime: 'application/pdf' }); }); });
    }),
    buildMissionExportBlob(m).then(function (b) { return { blob: b.blob, filename: b.filename, mime: 'application/json' }; })
  ]).then(function (files) {
    var total = files[0].blob.size + files[1].blob.size;
    if (total > SHARE_SIZE_WARN_THRESHOLD) {
      alert('Les deux fichiers font ' + Math.round(total / 1024 / 1024) + ' Mo (photos incluses) : trop lourd pour un mail depuis le téléphone.\n\n' +
        'Ils vont être téléchargés : transférez-les ensuite manuellement (câble, OneDrive…).');
      files.forEach(function (f, i) { setTimeout(function () { downloadBlob(f.blob, f.filename); }, i * 400); });
      return;
    }
    offerFilesShare(files, missionTransfertMailDraft(m, files[1].filename, files[0].filename));
    if (typeof marquerSauvegarde === 'function') marquerSauvegarde(m); // rappel de sauvegarde (js/sauvegarde.js)
  }).catch(function (err) { alert('Erreur lors de la préparation du mail.\n' + err.message); });
}

function shareRapportPdf() {
  var m = getCurrentMission();
  if (!m) return;
  buildRapportPdf(m).then(function (r) { offerPdfShare(r.pdf, r.filename, missionMailDraft(m, 'Rapport de contrôle de l’aération')); })
    .catch(function (err) { alert('Erreur lors de la préparation du rapport.\n' + err.message); });
}

// ————————————————————————————————————————————
// Export Excel
// ————————————————————————————————————————————

function excelCell(v) {
  if (Array.isArray(v)) return v.map(function (x) { return Array.isArray(x) ? x.join(' ; ') : x; }).join(' | ');
  if (typeof v === 'string' && /^-?\d+([.,]\d+)?$/.test(v.trim())) return parseFloat(v.replace(',', '.'));
  return v === undefined || v === null ? '' : v;
}

function excelSheetName(label, used) {
  var base = String(label).replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28).trim() || 'Feuille';
  var name = base, i = 2;
  while (used[name]) name = base.slice(0, 26) + ' ' + (i++);
  used[name] = true;
  return name;
}

function exportSyntheseExcel() {
  if (!getCurrentMission()) return;
  ensureLib('xlsx').then(exportSyntheseExcelLoaded).catch(function (err) { alert(err.message); });
}

function exportSyntheseExcelLoaded() {
  var m = getCurrentMission();
  if (!m) return;
  var items = overviewOrderedItems(m);
  var wb = XLSX.utils.book_new(), used = {};

  // Feuille 1 : une ligne par installation
  var rows = [['Type', 'Bâtiment', 'Installation', 'Avis', 'Critères non satisfaisants', 'Observation']];
  items.forEach(function (it) {
    var key = resolveAvisFieldKey(it.type);
    var cfg = (typeof SYNTHESE_CONFIG !== 'undefined' && SYNTHESE_CONFIG[it.type.id]) || {};
    rows.push([it.type.label, it.inst.data.batiment || '', overviewRowTitle(it, 'batiment'),
      it.status.nc ? 'Non contrôlée : ' + it.inst.data._nonControle.motif : it.status.state === 'todo' ? 'À faire' : (it.inst.data[key] || 'À compléter'),
      verdictReasons(it.type, it.inst, key, 'Non Satisfaisant').join(', '),
      cfg.commentaire ? (it.inst.data[cfg.commentaire] || '') : '']);
  });
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 26 }, { wch: 34 }, { wch: 22 }, { wch: 40 }, { wch: 60 }];
  ws['!autofilter'] = { ref: 'A1:F' + rows.length };
  XLSX.utils.book_append_sheet(wb, ws, excelSheetName('Synthèse', used));

  // Feuille 2 : infos de la mission
  var di = m.donneesInternes || {}, ic = m.infosClient || {}, si = m.infosSiteIntervention || {};
  var infos = [['Client', ic.nomEntreprise || ''], ['Site', si.siteIntervention || ''], ['Adresse du site', [si.adresseSite, si.codePostal, si.ville].filter(Boolean).join(' ')],
    ['N° d’affaire', di.numeroAffaire || ''], ['N° de chrono', di.numeroChrono || ''], ['Dates d’intervention', di.datesIntervention || ''],
    ['Auteur du rapport', di.auteurRapport || ''], ['Date du rapport', di.dateRapport || ''], ['Installations', items.length]];
  var wsi = XLSX.utils.aoa_to_sheet(infos);
  wsi['!cols'] = [{ wch: 24 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsi, excelSheetName('Mission', used));

  // Une feuille par type : tous les champs renseignés (détail des mesures)
  var byType = {};
  items.forEach(function (it) { (byType[it.type.id] = byType[it.type.id] || { type: it.type, list: [] }).list.push(it.inst); });
  Object.keys(byType).forEach(function (k) {
    var t = byType[k].type, list = byType[k].list;
    var fields = t.fields.filter(function (f) {
      return f.type !== 'section' && f.type !== 'photo' && list.some(function (inst) { var v = inst.data[f.key]; return v !== undefined && v !== '' && !(Array.isArray(v) && !v.length); });
    });
    var data = [fields.map(function (f) { return f.label; })];
    list.forEach(function (inst) { data.push(fields.map(function (f) { return excelCell(inst.data[f.key]); })); });
    var wst = XLSX.utils.aoa_to_sheet(data);
    wst['!cols'] = fields.map(function () { return { wch: 18 }; });
    XLSX.utils.book_append_sheet(wb, wst, excelSheetName(t.label, used));
  });

  var name = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').trim();
  XLSX.writeFile(wb, name + '_synthese_aeration.xlsx');
}

// ————————————————————————————————————————————
// Compte rendu de fin de visite (signature du client)
// ————————————————————————————————————————————

function compteRenduData(m) {
  if (!m.compteRendu) m.compteRendu = { signataire: '', fonction: '', remarques: '', signature: '' };
  return m.compteRendu;
}

function updateCompteRendu(key, value) {
  var m = getCurrentMission();
  if (!m) return;
  compteRenduData(m)[key] = value;
  persistMissions();
}

function renderCompteRendu() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  var cr = compteRenduData(m);
  var items = overviewOrderedItems(m);
  var counts = { ok: 0, bad: 0, na: 0, open: 0 };
  items.forEach(function (it) { counts[bilanCategory(it)]++; });
  var bad = items.filter(function (it) { return bilanCategory(it) === 'bad'; });

  var h = '<button class="back-btn" onclick="state.view=\'bilan\';render();">' + ICONS.arrowLeft + ' Bilan</button>';
  h += '<div class="card"><h1>' + ICONS.edit + ' Compte rendu de fin de visite</h1>' +
    '<p class="subtitle">Une page récapitulative remise au client avant le rapport complet, signée sur l’écran.</p></div>';

  h += '<div class="card"><div class="section-title" style="margin-top:0;">Résumé</div>' +
    '<p style="font-size:13px;">' + items.length + ' installation(s) contrôlée(s) : <b>' + counts.ok + '</b> satisfaisante(s), <b>' + counts.bad +
    '</b> non satisfaisante(s)' + (counts.na ? ', ' + counts.na + ' sans objet' : '') + (counts.open ? ', ' + counts.open + ' à compléter' : '') + '.</p>';
  if (bad.length) {
    h += '<div class="subtitle" style="margin-top:8px;">Points non satisfaisants repris dans le compte rendu :</div><ul class="cr-list">';
    bad.forEach(function (it) {
      h += '<li><b>' + escapeHtml(it.type.label) + '</b> — ' + escapeHtml(verifInstallationTitle(it)) + '</li>';
    });
    h += '</ul>';
  }
  h += '</div>';

  h += '<div class="card">';
  h += '<div class="field"><label class="label">Remarques / actions à prévoir</label><textarea class="input" rows="4" placeholder="Ex. : nettoyage des bouches du bâtiment A, réglage de la CTA-02…" ' +
    'onchange="updateCompteRendu(\'remarques\',this.value);">' + escapeHtml(cr.remarques) + '</textarea></div>';
  h += '<div class="field"><label class="label">Représentant du client</label><input type="text" class="input" value="' + escapeHtml(cr.signataire) + '" placeholder="Nom et prénom" ' +
    'onchange="updateCompteRendu(\'signataire\',this.value);"></div>';
  h += '<div class="field"><label class="label">Fonction</label><input type="text" class="input" value="' + escapeHtml(cr.fonction) + '" placeholder="Ex. : responsable maintenance" ' +
    'onchange="updateCompteRendu(\'fonction\',this.value);"></div>';
  h += '<label class="label">Signature du client</label>';
  h += '<div class="signature-wrap"><canvas id="signature-pad" class="signature-pad"></canvas>' +
    '<div class="signature-hint"' + (cr.signature ? ' style="display:none;"' : '') + '>Signer ici avec le doigt</div></div>';
  h += '<button type="button" class="btn btn-gray btn-small" style="margin-top:6px;" onclick="clearSignature();">Effacer la signature</button>';
  h += '</div>';

  h += '<button class="btn btn-primary" onclick="exportCompteRenduPdf(false);">' + ICONS.download + ' Télécharger le compte rendu (PDF)</button>';
  h += '<button class="btn btn-gray" onclick="exportCompteRenduPdf(true);">' + ICONS.upload + ' Envoyer le compte rendu</button>';
  setTimeout(initSignaturePad, 0);
  return h;
}

// Pavé de signature : tracé au doigt (pointer events), fond blanc même en thème sombre pour que la
// signature reste lisible dans le PDF. Enregistrée en PNG dans la mission à chaque fin de trait.
function initSignaturePad() {
  var canvas = document.getElementById('signature-pad');
  if (!canvas || canvas._init) return;
  canvas._init = true;
  var ratio = window.devicePixelRatio || 1;
  var w = canvas.clientWidth, hgt = canvas.clientHeight;
  canvas.width = w * ratio; canvas.height = hgt * ratio;
  var ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt);
  ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0c1220';
  var m = getCurrentMission(), cr = m && compteRenduData(m);
  if (cr && cr.signature) {
    var img = new Image();
    img.onload = function () { ctx.drawImage(img, 0, 0, w, hgt); };
    img.src = cr.signature;
  }
  var drawing = false, last = null;
  var pos = function (e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', function (e) {
    drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId);
    var hint = canvas.parentNode.querySelector('.signature-hint'); if (hint) hint.style.display = 'none';
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p; e.preventDefault();
  });
  var end = function () {
    if (!drawing) return;
    drawing = false;
    updateCompteRendu('signature', canvas.toDataURL('image/png'));
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function clearSignature() {
  updateCompteRendu('signature', '');
  render();
}

// Pourquoi l'installation est non satisfaisante : critères calculés en cause, sinon l'observation
// saisie (bureaux, sanitaires... n'ont qu'un avis global), sinon rien.
function badPointDetail(it) {
  var reasons = verdictReasons(it.type, it.inst, resolveAvisFieldKey(it.type), 'Non Satisfaisant');
  if (reasons.length) return reasons.join(', ');
  var cfg = (typeof SYNTHESE_CONFIG !== 'undefined' && SYNTHESE_CONFIG[it.type.id]) || {};
  var obs = cfg.commentaire ? String(it.inst.data[cfg.commentaire] || '').trim() : '';
  return (obs && obs !== '/' && obs !== '-') ? (obs.length > 160 ? obs.slice(0, 157) + '…' : obs) : '';
}

function compteRenduDocDefinition(m, logo) {
  var cr = compteRenduData(m);
  var di = m.donneesInternes || {}, ic = m.infosClient || {}, si = m.infosSiteIntervention || {};
  var items = overviewOrderedItems(m);
  var counts = { ok: 0, bad: 0, na: 0, open: 0 };
  items.forEach(function (it) { counts[bilanCategory(it)]++; });
  var bad = items.filter(function (it) { return bilanCategory(it) === 'bad'; });
  var BLUE = '#0082DE', LIGHT = '#E6F3FC';
  var cell = function (t, o) { return Object.assign({ text: t === undefined || t === null || t === '' ? '-' : String(t), fontSize: 8, margin: [3, 1.5, 3, 1.5] }, o || {}); };
  var head = function (t) { return cell(t, { bold: true, color: 'white', fillColor: BLUE }); };
  var layout = { hLineColor: function () { return '#B7D7F0'; }, vLineColor: function () { return '#B7D7F0'; }, hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } };

  var content = [];
  content.push({ columns: [
    logo ? { image: logo, width: 46 } : { text: '' },
    { stack: [{ text: 'COMPTE RENDU DE FIN DE VISITE', bold: true, fontSize: 14, color: BLUE },
      { text: 'Contrôle de l’aération et de l’assainissement des locaux de travail', fontSize: 10, color: '#333' }], margin: [12, 6, 0, 0] }
  ], margin: [0, 0, 0, 10] });
  content.push({ table: { widths: [110, '*'], body: [
    [head('Client'), cell(ic.nomEntreprise || m.clientSite)],
    [head('Site'), cell([si.siteIntervention, [si.adresseSite, si.codePostal, si.ville].filter(Boolean).join(' ')].filter(Boolean).join(' – '))],
    [head('Date(s) de visite'), cell(di.datesIntervention || m.dateControle || todayFr())],
    [head('Technicien'), cell(di.auteurRapport || m.controleur)],
    [head('N° d’affaire'), cell(di.numeroAffaire)]
  ] }, layout: layout, margin: [0, 0, 0, 10] });

  content.push({ text: 'Synthèse', bold: true, fontSize: 11, color: BLUE, margin: [0, 0, 0, 6] });
  content.push({ text: [items.length + ' installation(s) contrôlée(s) : ', { text: counts.ok + ' satisfaisante(s)', bold: true }, ', ',
    { text: counts.bad + ' non satisfaisante(s)', bold: true, color: counts.bad ? AVIS_TEINTES.badTexte : '#333' },
    counts.na ? ', ' + counts.na + ' sans objet' : '', counts.open ? ', ' + counts.open + ' encore à compléter' : '', '.'], fontSize: 10, margin: [0, 0, 0, 12] });

  if (bad.length) {
    content.push({ text: 'Points non satisfaisants', bold: true, fontSize: 11, color: BLUE, margin: [0, 0, 0, 6] });
    var body = [[head('Installation'), head('Bâtiment'), head('Désignation'), head('Critère en cause / observation')]];
    bad.forEach(function (it) {
      body.push([cell(it.type.label), cell(it.inst.data.batiment), cell(overviewRowTitle(it, 'batiment')), cell(badPointDetail(it))]);
    });
    content.push({ table: { headerRows: 1, widths: [92, 100, 110, '*'], body: body }, layout: layout, margin: [0, 0, 0, 10] });
  }

  // Remarques, mention et signatures restent ensemble : jamais une signature seule en haut de page
  var fin = [];
  fin.push({ text: 'Remarques / actions à prévoir', bold: true, fontSize: 11, color: BLUE, margin: [0, 0, 0, 6] });
  fin.push({ table: { widths: ['*'], body: [[cell(cr.remarques || 'Aucune remarque particulière.', { margin: [4, 6, 4, 6] })]] }, layout: layout, margin: [0, 0, 0, 10] });
  fin.push({ text: 'Ce compte rendu est établi à l’issue de la visite. Il ne se substitue pas au rapport de contrôle, qui sera transmis ultérieurement et fera seul foi.',
    fontSize: 8, italics: true, color: '#555', margin: [0, 0, 0, 10] });

  var sigClient = cr.signature ? { image: cr.signature, fit: [180, 46] } : { text: '', margin: [0, 22, 0, 22] };
  fin.push({ table: { widths: ['*', '*'], body: [
    [head('Le technicien SOCOTEC'), head('Le représentant du client')],
    [(typeof getVisa === 'function' && getVisa()) ? { stack: [cell((di.auteurRapport || m.controleur || '') + '\nLe ' + todayFr(), { margin: [4, 6, 4, 2] }), { image: getVisa(), fit: [160, 40], margin: [4, 2, 4, 6] }] }
      : cell((di.auteurRapport || m.controleur || '') + '\nLe ' + todayFr(), { margin: [4, 6, 4, 6] }),
      { stack: [cell([cr.signataire, cr.fonction].filter(Boolean).join(' – ') || ' ', { margin: [4, 6, 4, 2] }), Object.assign(sigClient, { margin: [4, 2, 4, 6] })] }]
  ] }, layout: layout });
  content.push({ stack: fin, unbreakable: true });

  return {
    pageSize: 'A4', pageMargins: [36, 30, 36, 36],
    defaultStyle: { font: 'Arial', fontSize: 10 },
    info: { title: 'Compte rendu de fin de visite – ' + (m.clientSite || '') },
    footer: function (page, pages) {
      return { columns: [{ text: di.numeroAffaire ? 'N° d’affaire : ' + di.numeroAffaire : '', fontSize: 7, color: '#777' },
        { text: page + '/' + pages, alignment: 'right', fontSize: 7, color: '#777' }], margin: [36, 12, 36, 0] };
    },
    content: content
  };
}

function exportCompteRenduPdf(share) {
  var m = getCurrentMission();
  if (!m) return;
  ensureLib('pdf').then(function () { return pdfFetchAsDataUrl(LOGO_PATH); }).then(function (logo) {
    var pdf = pdfMake.createPdf(compteRenduDocDefinition(m, logo));
    var name = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').trim() + '_compte_rendu_visite.pdf';
    if (share) offerPdfShare(pdf, name, missionMailDraft(m, 'Compte rendu de fin de visite'));
    else pdf.download(name);
  }).catch(function (err) { alert('Erreur lors de la génération du compte rendu.\n' + err.message); });
}

console.log('✓ Sorties (envoi, Excel, compte rendu) chargées');
