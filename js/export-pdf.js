// export-pdf.js - Export du rapport de contrôle aération en PDF natif (pdfmake) — seul mode d'export
// du rapport (le Word a été retiré en 2026-09) : un technicien clique sur un bouton, le PDF est
// généré et téléchargé directement, sans ouvrir Word/LibreOffice. Réutilise les constantes et
// fonctions pures (SECTION_GROUPS, SYNTHESE_CONFIG, TYPES_POLLUTION_NON_SPECIFIQUE,
// sectionGroupForType, formatCrosstabValue, formatCrosstabDebit) définies dans js/report-shared.js —
// une seule source de vérité pour la configuration métier, chargé avant ce fichier dans index.html.
//
// Conversion d'unités : les largeurs/tailles de police ci-dessous sont exprimées en twips (largeurs)
// et demi-points (tailles de police), comme dans la mise en page Word d'origine. PT()/FS() font la
// conversion vers les points utilisés par pdfmake.

function PT(twips) { return twips / 20; }
function FS(halfPoints) { return halfPoints / 2; }

var PDF_BLUE = '#000000';
var PDF_ACCENT = '#00ACE8';
var PDF_NAVY = '#005399';
var PDF_TABLE_HEADER_BLUE = '#0082DE';
var PDF_AVIS_GREEN = '#95C918';
var PDF_AVIS_AMBER = '#FFC000';
var PDF_LEGAL_GRAY = '#E6E6E6';
var PDF_GRAY_IDENTITY = '#808080';
var PDF_LIGHT = '#DEEAF6';
// Marge de sécurité (audit du 2026-09-18, comparaison avec un vrai rapport) : pdfmake ADDITIONNE le
// padding des cellules (voir pdfBorderedLayout) à la largeur déclarée dans `widths`, contrairement à
// docx où la largeur déclarée par cellule inclut déjà ses marges internes. Sans cette marge, un
// tableau à beaucoup de colonnes (ex. Extracteur, 9 colonnes) déborde de la page et se fait couper —
// vu concrètement sur le tableau "Mesures de vitesse" lors du test. Un tampon fixe reste imparfait
// (un tableau à 2 colonnes garde un peu de marge inutilisée à droite) mais évite tout débordement.
var PDF_ANNEXE_CONTENT_WIDTH = PT(9636) - 40;
var PDF_CROSSTAB_GROUP_SIZE = CROSSTAB_GROUP_SIZE;

// ————————————————————————————————————————————
// Bas niveau : tables, cellules
// ————————————————————————————————————————————

function pdfBorderedLayout() {
  return {
    hLineWidth: function () { return 0.5; },
    vLineWidth: function () { return 0.5; },
    hLineColor: function () { return PDF_ACCENT; },
    vLineColor: function () { return PDF_ACCENT; },
    paddingLeft: function () { return 2; },
    paddingRight: function () { return 2; },
    paddingTop: function () { return 2; },
    paddingBottom: function () { return 2; }
  };
}

// widths: tableau de largeurs en points ('*' autorisé). body: tableau de lignes (chaque ligne = tableau
// de cellules, avec des {} pour les emplacements couverts par un colSpan précédent — convention pdfmake).
function pdfTable(widths, body, opts) {
  opts = opts || {};
  var t = { table: { widths: widths, body: body } };
  if (opts.headerRows) t.table.headerRows = opts.headerRows;
  t.layout = opts.noBorders ? 'noBorders' : pdfBorderedLayout();
  if (opts.margin) t.margin = opts.margin;
  return t;
}

// n-1 cellules vides à ajouter juste après une cellule avec colSpan:n, pour respecter le nombre de
// colonnes déclaré dans `widths` (convention pdfmake, contrairement à docx qui gère colSpan sans ça).
function pdfSpanFillers(n) {
  var out = [];
  for (var i = 1; i < n; i++) out.push({});
  return out;
}

function pdfHeaderCell(text, opts) {
  opts = opts || {};
  var c = { text: text, bold: true, fontSize: FS(18), color: '#FFFFFF', fillColor: PDF_TABLE_HEADER_BLUE, alignment: 'center' };
  if (opts.colSpan) c.colSpan = opts.colSpan;
  if (opts.fill) c.fillColor = opts.fill;
  return c;
}

function pdfTitleBarCell(text, opts) {
  opts = opts || {};
  var c = { text: text, bold: true, fontSize: FS(20), color: '#FFFFFF', fillColor: PDF_NAVY, alignment: 'center' };
  if (opts.colSpan) c.colSpan = opts.colSpan;
  return c;
}

function pdfBodyCell(text, opts) {
  opts = opts || {};
  var c = { text: text, fontSize: FS(18), bold: !!opts.bold, color: opts.color || '#000000', alignment: opts.center ? 'center' : 'left' };
  if (opts.fill) c.fillColor = opts.fill;
  if (opts.colSpan) c.colSpan = opts.colSpan;
  return c;
}

// ————————————————————————————————————————————
// Avis (Satisfaisant/Non Satisfaisant -> couleur de fond), synthèse, documents transmis
// ————————————————————————————————————————————

function pdfAvisColor(text) {
  if (text === 'Satisfaisant' || text === 'Conforme') return PDF_AVIS_GREEN;
  if (text === 'Non Satisfaisant' || text === 'Non Conforme') return PDF_AVIS_AMBER;
  return null;
}

function pdfDocsTable(documents) {
  var W = [PT(4200), PT(900), PT(900), PT(3636)];
  var body = [];
  body.push([pdfHeaderCell('Nature du document'), pdfHeaderCell('Transmis ou disponible sur site', { colSpan: 2 }), {}, pdfHeaderCell('Commentaire')]);
  body.push([pdfBodyCell(''), pdfHeaderCell('Oui'), pdfHeaderCell('Non'), pdfBodyCell('')]);
  (documents || []).forEach(function (doc) {
    body.push([
      pdfBodyCell(doc.label),
      pdfBodyCell(doc.transmis === 'Oui' ? 'X' : '', { center: true, fill: doc.transmis === 'Oui' ? PDF_LIGHT : undefined }),
      pdfBodyCell(doc.transmis === 'Non' ? 'X' : '', { center: true, fill: doc.transmis === 'Non' ? PDF_LIGHT : undefined }),
      pdfBodyCell(doc.commentaire || '-')
    ]);
  });
  return pdfTable(W, body);
}

function pdfNoticeTable(notice) {
  var W = [PT(1400), PT(2800), PT(900), PT(900), PT(900), PT(3038)];
  var body = [];
  body.push([pdfHeaderCell('Article'), pdfHeaderCell('Conformité à l’article R.4222-21 du code du travail'), pdfHeaderCell('Présence'), pdfHeaderCell('Absence'), pdfHeaderCell('Sans objet'), pdfHeaderCell('Commentaire')]);
  (notice || []).forEach(function (n) {
    body.push([
      pdfBodyCell('R4222-21', { center: true }),
      pdfBodyCell(n.label, { bold: true }),
      pdfBodyCell(n.presence === 'Présence' ? 'X' : '', { center: true, fill: n.presence === 'Présence' ? PDF_LIGHT : undefined }),
      pdfBodyCell(n.presence === 'Absence' ? 'X' : '', { center: true, fill: n.presence === 'Absence' ? PDF_LIGHT : undefined }),
      pdfBodyCell(n.presence === 'Sans objet' ? 'X' : '', { center: true, fill: n.presence === 'Sans objet' ? PDF_LIGHT : undefined }),
      pdfBodyCell(n.commentaire || '-')
    ]);
  });
  return pdfTable(W, body);
}

function pdfSyntheseTable(cfg, list) {
  var hasCol2 = !!cfg.col2, hasCol3 = !!cfg.col3;
  var W_TOTAL = 9636;
  var headers = [{ text: cfg.col1Label, key: cfg.col1 }];
  if (hasCol2) headers.push({ text: cfg.col2Label, key: cfg.col2 });
  if (hasCol3) headers.push({ text: cfg.col3Label, key: cfg.col3 });
  headers.push({ text: 'Avis par rapport aux valeurs recommandées', key: cfg.avis, isAvis: true });
  headers.push({ text: 'Commentaire', key: cfg.commentaire });

  var idColsCount = headers.length - 2;
  var idColWidth = Math.round(W_TOTAL * 0.22);
  var avisColWidth = Math.round(W_TOTAL * (idColsCount === 1 ? 0.30 : 0.22));
  var comColWidth = W_TOTAL - idColWidth * idColsCount - avisColWidth;
  var widths = headers.map(function (h, i) { return PT(h.isAvis ? avisColWidth : (i === headers.length - 1 ? comColWidth : idColWidth)); });

  var body = [];
  body.push([pdfTitleBarCell(cfg.titre, { colSpan: headers.length })].concat(pdfSpanFillers(headers.length)));
  body.push(headers.map(function (h) { return pdfHeaderCell(h.text); }));

  list.forEach(function (inst) {
    body.push(headers.map(function (h) {
      var val = h.key ? inst.data[h.key] : undefined;
      var text = (val === undefined || val === null || val === '') ? '-' : String(val);
      if (h.isAvis) {
        var fill = pdfAvisColor(text);
        return pdfBodyCell(text, { center: true, bold: true, fill: fill });
      }
      return pdfBodyCell(text);
    }));
  });

  return pdfTable(widths, body, { margin: [0, 0, 0, PT(200)] });
}

// ————————————————————————————————————————————
// Annexes : en-tête de page, tableau croisé (colonnes = installations)
// ————————————————————————————————————————————

function pdfAnnexePageHeader(titre, sousTitre, logoDataUrl) {
  var W_LOGO = PT(1100), W_BAR = PDF_ANNEXE_CONTENT_WIDTH - W_LOGO;
  var logoCell = logoDataUrl ? { image: logoDataUrl, width: 35, height: 33 } : { text: '' };
  var barCell = {
    fillColor: PDF_ACCENT,
    stack: [
      { text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, fontSize: FS(24), color: '#FFFFFF', alignment: 'center' },
      { text: sousTitre, bold: true, fontSize: FS(22), color: '#FFFFFF', alignment: 'center', margin: [0, 2, 0, 0] }
    ]
  };
  return pdfTable([W_LOGO, W_BAR], [[logoCell, barCell]], { noBorders: true, margin: [0, 0, 0, PT(120)] });
}

// Page intercalaire de section (5.1 à 5.9) : photo(s) à gauche, bandeau plein hauteur à droite. Le
// texte pivoté (bas -> haut) du PDF de référence est reproduit en SVG, pdfmake ne supportant pas la
// rotation de texte nativement.
function pdfSectionDividerPage(titre, imgDataUrls, sommaireHeading) {
  var out = [];
  if (sommaireHeading) {
    // Entrée de sommaire (5.x) : ancrée ici pour que la table des matières pointe sur cette page,
    // texte visuellement quasi invisible (blanc, taille 1) - fidèle à l'esprit du PDF de référence.
    out.push({ text: sommaireHeading, fontSize: 0.5, color: '#FFFFFF', tocItem: 'mainToc', tocStyle: { fontSize: FS(20), bold: true, color: PDF_BLUE }, tocMargin: [0, 6, 0, 0] });
  }
  var photoStack = (imgDataUrls || []).filter(Boolean).map(function (url) {
    return { image: url, width: 130, height: 100, alignment: 'center', margin: [0, 0, 0, 12] };
  });
  if (!photoStack.length) photoStack.push({ text: '' });
  // rotate(-90) appliqué à un repère DÉJÀ déplacé (translate) au point de départ du texte : le texte,
  // normalement horizontal vers la droite, se retrouve à s'étendre vers le haut depuis ce point après
  // rotation — exactement la lecture bas -> haut voulue. Attention : la largeur/hauteur déclarées du
  // <svg> doivent correspondre exactement à celles demandées à pdfmake (width/height du noeud `svg`),
  // sinon pdfmake redimensionne tout le dessin (donc les positions du texte) de façon non uniforme.
  var BAR_W = 45, BAR_H = 700;
  var barSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + BAR_W + '" height="' + BAR_H + '">' +
    '<rect width="' + BAR_W + '" height="' + BAR_H + '" fill="' + PDF_ACCENT + '"/>' +
    '<text x="0" y="0" transform="translate(30,' + (BAR_H - 20) + ') rotate(-90)" fill="#FFFFFF" font-family="Arial" font-weight="bold" font-size="15">AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL</text>' +
    '<text x="0" y="0" transform="translate(14,' + (BAR_H - 20) + ') rotate(-90)" fill="#FFFFFF" font-family="Arial" font-weight="bold" font-size="14">' + String(titre).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>' +
    '</svg>';
  out.push(pdfTable([PDF_ANNEXE_CONTENT_WIDTH - BAR_W, BAR_W], [[
    { stack: photoStack, alignment: 'center' },
    { svg: barSvg, width: BAR_W, height: BAR_H }
  ]], { noBorders: true }));
  return out;
}

function pdfCrosstabRows(rows, group) {
  var out = [];
  var inIdentityBlock = true;
  rows.forEach(function (r) {
    if (r.subheader) {
      if (r.subheader !== 'Localisation') inIdentityBlock = false;
      out.push([pdfTitleBarCell('', {}), pdfTitleBarCell(r.subheader, { colSpan: group.length })].concat(pdfSpanFillers(group.length)));
      return;
    }
    var labelFill = inIdentityBlock ? PDF_GRAY_IDENTITY : PDF_TABLE_HEADER_BLUE;
    var row = [{ text: r.label, bold: true, fontSize: FS(20), color: '#FFFFFF', fillColor: labelFill }];
    group.forEach(function (inst) {
      var val = formatCrosstabValue(inst.data[r.key]);
      row.push(pdfBodyCell(val, { center: true, bold: !!r.isAvis }));
    });
    out.push(row);
  });
  return out;
}

function pdfCrosstabSection(titre, sousTitre, legalNodes, rows, list, logoDataUrl) {
  var content = [];
  if (legalNodes && legalNodes.length) {
    content.push({ text: 'Extraits du Code du Travail', bold: true, fontSize: FS(22), margin: [0, 0, 0, PT(160)] });
    content = content.concat(legalNodes);
    content.push({ text: '', pageBreak: 'after' });
  }
  content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
  if (!list || list.length === 0) {
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  for (var g = 0; g < list.length; g += PDF_CROSSTAB_GROUP_SIZE) {
    var group = list.slice(g, g + PDF_CROSSTAB_GROUP_SIZE);
    if (g > 0) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    }
    var W_LABEL = PT(2400), W_COL = (PDF_ANNEXE_CONTENT_WIDTH - W_LABEL) / group.length;
    var widths = [W_LABEL].concat(group.map(function () { return W_COL; }));
    content.push(pdfTable(widths, pdfCrosstabRows(rows, group)));
  }
  return content;
}

// ————————————————————————————————————————————
// "Fiche équipement" (une page par installation, avec photo)
// ————————————————————————————————————————————

function pdfFicheBar(text, widthPt) {
  return pdfTable([widthPt || PDF_ANNEXE_CONTENT_WIDTH], [[pdfHeaderCell(text)]], { margin: [0, 0, 0, 0] });
}

// Retourne des LIGNES (pas une table complète) : l'appelant les enveloppe avec pdfTable([labelW,valW], ...).
function pdfFicheIdentRows(pairs) {
  return pairs.map(function (p) { return [pdfHeaderCell(p[0]), pdfBodyCell(p[1] || '-')]; });
}

function pdfFichePhotoBox(dataUrl, widthPt) {
  var imgCell = dataUrl
    ? { image: dataUrl, width: 130, height: 97, alignment: 'center' }
    : { text: '', margin: [0, 45, 0, 45] };
  return pdfTable([widthPt], [[pdfHeaderCell('Photo de l’équipement')], [imgCell]]);
}

function pdfFicheTwoCol(leftContent, rightContent, leftWidthPt, rightWidthPt) {
  return pdfTable([leftWidthPt, rightWidthPt], [[leftContent, rightContent]], { noBorders: true });
}

function pdfFicheConclusionRow(label, value, widthPt) {
  widthPt = widthPt || PDF_ANNEXE_CONTENT_WIDTH;
  return pdfTable([widthPt - PT(2400), PT(2400)], [[pdfBodyCell(label), pdfBodyCell(value || '-', { center: true, bold: true })]]);
}

function pdfFicheObservationBox(text, widthPt) {
  return pdfTable([widthPt || PDF_ANNEXE_CONTENT_WIDTH], [[pdfBodyCell(text || '-')]]);
}

// Paragraphe encadré gris (extraits du Code du travail) : une table 1x1 sans bordure avec fillColor
// sur la cellule, pdfmake ne permettant pas un fond coloré sur un simple bloc de texte hors tableau.
function pdfLegalParagraph(text, opts) {
  opts = opts || {};
  return pdfTable(['*'], [[{
    text: text, bold: !!opts.bold, italics: !!opts.italics, fontSize: FS(opts.size || 19),
    alignment: opts.center ? 'center' : 'justify', fillColor: PDF_LEGAL_GRAY, decoration: opts.underline ? 'underline' : undefined
  }]], { noBorders: true, margin: [0, 0, 0, PT(opts.after !== undefined ? opts.after : 0)] });
}

function pdfFicheGrilleTable(grid, nbAxes, nbPoints, rowLabel, colLabel) {
  rowLabel = rowLabel || 'Axe';
  colLabel = colLabel || 'Point';
  var rows = Math.min(parseInt(nbAxes, 10) || 0, 5);
  var cols = Math.min(parseInt(nbPoints, 10) || 0, 5);
  if (!rows || !cols) return { text: '' };
  var W_LABEL = PT(2400), W_COL = (PDF_ANNEXE_CONTENT_WIDTH - W_LABEL) / cols;
  var widths = [W_LABEL];
  for (var j = 0; j < cols; j++) widths.push(W_COL);
  var body = [];
  var headerRow = [pdfHeaderCell('')];
  for (j = 0; j < cols; j++) headerRow.push(pdfHeaderCell(colLabel + ' ' + (j + 1)));
  body.push(headerRow);
  for (var i = 0; i < rows; i++) {
    var row = [pdfHeaderCell(rowLabel + ' ' + (i + 1))];
    for (j = 0; j < cols; j++) {
      var cell = (grid[i] && grid[i][j] !== undefined && grid[i][j] !== '') ? String(grid[i][j]) : '-';
      row.push(pdfBodyCell(cell, { center: true }));
    }
    body.push(row);
  }
  return pdfTable(widths, body);
}

// Tableau "Mesure de la vitesse de transport" (mêmes clés vt_* pour Hottes et Installations diverses).
function pdfFicheVtTable(d) {
  var W = [2400, 1800, 1900, 1918, 1618].map(PT);
  var avisTxt = formatCrosstabValue(d.avis_vt);
  return pdfTable(W, [
    [pdfHeaderCell(''), pdfHeaderCell('Valeur mesurée'), pdfHeaderCell('Type de polluants'), pdfHeaderCell('Valeur recommandée par l’INRS (ED 695)'), pdfHeaderCell('Avis par rapport aux valeurs de référence')],
    [pdfHeaderCell('Vitesse moyenne (m/s)'), pdfBodyCell(formatCrosstabValue(d.vt_mesuree), { center: true }), pdfBodyCell(formatCrosstabValue(d.vt_type_polluant), { center: true }), pdfBodyCell(formatCrosstabValue(d.vt_inrs), { center: true }), pdfBodyCell(avisTxt, { center: true, bold: true })]
  ]);
}

var PDF_AVIS_WORDS = ['Non Satisfaisant', 'Satisfaisant', 'Impossible de se prononcer', 'Non Conforme', 'Conforme', 'Sans Objet', 'Sans objet'];
function pdfFicheConclusionPhrase(text) {
  text = text || '-';
  var idx = -1, word = '';
  for (var i = 0; i < PDF_AVIS_WORDS.length; i++) {
    var p = text.indexOf(PDF_AVIS_WORDS[i]);
    if (p !== -1 && (idx === -1 || p < idx)) { idx = p; word = PDF_AVIS_WORDS[i]; }
  }
  var runs;
  if (idx === -1) {
    runs = [{ text: text, fontSize: FS(18) }];
  } else {
    runs = [
      { text: text.slice(0, idx), fontSize: FS(18) },
      { text: word, bold: true, fontSize: FS(18) },
      { text: text.slice(idx + word.length), fontSize: FS(18) }
    ];
  }
  return { text: runs, margin: [0, 0, 0, PT(60)] };
}

function pdfFicheTitreSouligne(text) {
  return { text: text, bold: true, decoration: 'underline', fontSize: FS(20), margin: [0, PT(60), 0, PT(60)] };
}

// ————————————————————————————————————————————
// Fiche générique (fallback schéma-piloté) et filet de sécurité ultime
// ————————————————————————————————————————————

function pdfBuildAnnexeFicheGenerique(typeId, titre, sousTitre, legal, list, logoDataUrl) {
  var t = getInstallationType(typeId);
  var content = [];
  if (legal && legal.length) {
    content = content.concat(legal);
    content.push({ text: '', pageBreak: 'after' });
  }
  content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
  if (!list || list.length === 0) {
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }

  var photoField = t.fields.filter(function (f) { return f.type === 'photo'; })[0];
  var W_LABEL = PT(3200);

  list.forEach(function (inst, idx) {
    if (idx > 0) { content.push({ text: '', pageBreak: 'before' }); content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl)); }

    var identPairs = [];
    var i = 0;
    while (i < t.fields.length && t.fields[i].type !== 'section') {
      var idf = t.fields[i];
      if (idf.type !== 'photo' && (!idf.showIf || evalShowIf(idf.showIf, inst.data))) {
        identPairs.push([idf.label, formatCrosstabValue(inst.data[idf.key])]);
      }
      i++;
    }
    var W_IDENT = photoField ? PT(5200) : PDF_ANNEXE_CONTENT_WIDTH;
    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows(identPairs));
    if (photoField) {
      var W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
      content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(inst.data[photoField.key], W_PHOTO), W_IDENT, W_PHOTO));
    } else {
      content.push(identTable);
    }

    var rows = [];
    for (; i < t.fields.length; i++) {
      var f = t.fields[i];
      if (f.showIf && !evalShowIf(f.showIf, inst.data)) continue;
      if (f.type === 'photo' || f.type === 'grid' || f.type === 'charger-list') continue;
      if (f.type === 'section') {
        if (rows.length) { content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], rows)); rows = []; }
        content.push(pdfFicheBar(f.label));
        continue;
      }
      var val = formatCrosstabValue(inst.data[f.key]);
      var opts = {};
      if (f.type === 'computed') { var c = pdfAvisColor(val); if (c) opts = { center: true, bold: true }; }
      rows.push([pdfHeaderCell(f.label), pdfBodyCell(val, opts)]);
    }
    if (rows.length) content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], rows));
  });

  return content;
}

function pdfBuildAnnexeProvisoire(t, list) {
  var content = [{ text: t.label + ' (' + list.length + ') — version provisoire', bold: true, color: PDF_BLUE, fontSize: FS(24), margin: [0, PT(120), 0, PT(120)] }];
  list.forEach(function (inst) {
    var rows = [];
    t.fields.forEach(function (f) {
      if (f.type === 'photo') return;
      if (f.type === 'section') { rows.push([pdfTitleBarCell(f.label, { colSpan: 2 }), {}]); return; }
      var val = inst.data[f.key];
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return;
      if (Array.isArray(val)) val = val.join(', ');
      rows.push([pdfHeaderCell(f.label), pdfBodyCell(String(val))]);
    });
    if (rows.length) content.push(pdfTable([PT(4800), PT(9800)], rows, { margin: [0, 0, 0, PT(200)] }));
  });
  return content;
}

// ————————————————————————————————————————————
// Page de garde
// ————————————————————————————————————————————

function pdfThreeColBlock(labels, values) {
  var W = PT(3212);
  function headCell(text) { return { text: text, bold: true, fontSize: FS(18), color: '#FFFFFF', fillColor: PDF_ACCENT, alignment: 'center', margin: [0, 4, 0, 4] }; }
  function valCell(text) { return { text: text, fontSize: FS(20), alignment: 'center', margin: [0, 4, 0, 4] }; }
  return pdfTable([W, W, W], [
    [headCell(labels[0]), headCell(labels[1]), headCell(labels[2])],
    [valCell(values[0]), valCell(values[1]), valCell(values[2])]
  ]);
}

function pdfBuildPageDeGarde(m, di, ic, is, isi, logoDataUrl, bannerDataUrl) {
  var content = [];

  if (bannerDataUrl || logoDataUrl) {
    var bannerCell = bannerDataUrl
      ? { stack: [{ image: bannerDataUrl, width: 260, height: 34.5 }], relativePosition: { x: 0, y: 0 } }
      : { text: '' };
    content.push(pdfTable([PT(7200), PT(2436)], [[
      bannerCell,
      logoDataUrl ? { image: logoDataUrl, width: 42, height: 40, alignment: 'right' } : { text: '' }
    ]], { noBorders: true }));
    // Le bandeau image est un dégradé sans texte dans le gabarit d'origine : le titre est superposé en
    // absolu par-dessus (fidèle à export-word.js, qui flotte le texte sur l'image plutôt que de le graver dedans).
    if (bannerDataUrl) {
      content.push({ text: 'Rapport d’intervention', bold: true, fontSize: FS(26), color: '#FFFFFF', absolutePosition: { x: 58, y: 58 } });
    }
    content.push({ text: '', margin: [0, 0, 0, PT(300)] });
  }

  content.push({ text: ic.nomEntreprise || '—', bold: true, fontSize: FS(22), alignment: 'right' });
  content.push({ text: 'A l’attention de ' + (ic.nomDemandeur || '—'), fontSize: FS(20), alignment: 'right' });
  content.push({ text: ic.adresse || '', fontSize: FS(20), alignment: 'right' });
  content.push({ text: (ic.codePostal || '') + ' ' + (ic.ville || ''), fontSize: FS(20), alignment: 'right', margin: [0, 0, 0, PT(480)] });

  content.push({ text: 'CONTRÔLE DE L’AERATION ET DE L’ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, fontSize: FS(27), alignment: 'center', margin: [0, PT(480), 0, PT(480)] });

  var nomAuteur = di.auteurRapport || is.intervenant || '—';
  content.push(pdfThreeColBlock(['Intervention sur site réalisée par', 'Rédigé par', 'Validé par'], [nomAuteur, nomAuteur, nomAuteur]));
  content.push({ text: '', margin: [0, 0, 0, PT(240)] });
  content.push(pdfThreeColBlock(['Date d’édition du rapport', 'Référence du rapport (chrono)', 'Nature de la révision'],
    [di.dateRapport || '—', di.numeroChrono || '—', di.natureRevision || 'Version initiale']));

  content.push({ text: '', margin: [0, PT(480), 0, 0] });
  content.push(pdfTable([PDF_ANNEXE_CONTENT_WIDTH], [[{
    stack: [
      { text: 'N° d’Affaire : ' + (di.numeroAffaire || '—'), bold: true, fontSize: FS(20), color: '#FFFFFF' },
      { text: 'Mission réalisée ' + (di.datesIntervention ? ('du ' + di.datesIntervention) : '—'), bold: true, fontSize: FS(20), color: '#FFFFFF' },
      { text: ' ', fontSize: FS(12) },
      { text: 'La reproduction de ce document n’est autorisée que sous sa forme intégrale.', italics: true, fontSize: FS(18), color: '#FFFFFF' }
    ], fillColor: PDF_ACCENT, margin: [10, 12, 10, 12]
  }]], { noBorders: true, margin: [0, 0, 0, PT(300)] }));

  content.push(pdfTable([PT(6636), PT(3000)], [[
    { stack: [
      { text: 'SOCOTEC ENVIRONNEMENT', bold: true, fontSize: FS(20) },
      { text: is.agenceAuteur || '—', fontSize: FS(18) },
      { text: is.adresseAgence || '', fontSize: FS(18) },
      { text: (is.codePostal || '') + ' ' + (is.ville || ''), fontSize: FS(18) }
    ] },
    // Le nombre total de pages est déjà affiché dans le pied de page de cette même page (voir
    // pdfBuildFooter) : pas de second calcul ici. Une tentative via pageReference/id (comme dans
    // export-word.js avec D.PageNumber.TOTAL_PAGES) provoquait un blocage de pdfmake sur un document
    // de cette longueur combiné au sommaire automatique (deux mécanismes multi-passes qui ne
    // convergent pas ensemble) — mieux vaut l'unique occurrence déjà fiable du pied de page.
    { stack: [
      { text: 'Nombre de pages : voir pied de page', fontSize: FS(16), alignment: 'center' },
      { text: '(annexes comprises)', fontSize: FS(16), alignment: 'center' }
    ] }
  ]], { noBorders: true }));

  content.push({ text: 'SOCOTEC ENVIRONNEMENT - S.A.S au capital de 436 960 euros - 834 096 497 RCS Versailles', fontSize: FS(14), color: '#444444', margin: [0, PT(300), 0, 0] });
  content.push({ text: [
    { text: 'Siège social : 5, place des Frères Montgolfier - CS 20732 - Guyancourt - 78182 St-Quentin-en-Yvelines Cedex - FRANCE ', fontSize: FS(14), color: '#444444' },
    { text: 'www.socotec.fr', fontSize: FS(14), bold: true, color: PDF_ACCENT }
  ] });

  return content;
}

// ————————————————————————————————————————————
// 1. Présentation / 2. Description locaux / 3. Documents transmis / 4. Synthèse
// ————————————————————————————————————————————

function pdfHeading1(text) {
  return { text: text, bold: true, color: PDF_BLUE, fontSize: FS(28), margin: [0, PT(360), 0, PT(120)], tocItem: 'mainToc', tocStyle: { fontSize: FS(28), bold: true, color: PDF_BLUE }, tocMargin: [0, 6, 0, 0] };
}
function pdfHeading2(text) {
  return { text: text, bold: true, color: PDF_ACCENT, fontSize: FS(22), margin: [0, 0, 0, PT(120)] };
}
function pdfSubHeading(text) {
  return { text: text, bold: true, fontSize: FS(20), margin: [0, PT(180), 0, PT(60)] };
}
function pdfLabelValueLine(label, value) {
  return { text: [{ text: label, fontSize: FS(20) }, { text: value, fontSize: FS(20) }], margin: [PT(1600), 0, 0, 0] };
}

function pdfBuildPresentationMission(m, di, ic, isi) {
  var content = [];
  content.push(pdfHeading1('1. PRESENTATION DE LA MISSION'));
  content.push(pdfSubHeading('Objectif'));
  var nomSite = ic.nomEntreprise || '—';
  content.push({ text: 'Ce rapport présente les résultats de la vérification de l’aération et de l’assainissement des locaux de travail réalisée sur le site ' + nomSite + ', selon le contrat référencé ' + nomSite + '.', fontSize: FS(20), margin: [0, 0, 0, PT(240)] });

  content.push(pdfSubHeading('Demandeur'));
  content.push(pdfLabelValueLine('Nom du demandeur : ', ic.nomDemandeur || '—'));
  content.push(pdfLabelValueLine('Adresse du demandeur : ', ic.nomEntreprise || ''));
  content.push({ text: ic.adresse || '', fontSize: FS(20), margin: [PT(1600), 0, 0, 0] });
  content.push({ text: (ic.codePostal || '') + ' ' + (ic.ville || ''), fontSize: FS(20), margin: [PT(1600), 0, 0, PT(240)] });

  content.push(pdfSubHeading('Site d’intervention'));
  content.push(pdfLabelValueLine('Nom du site : ', isi.siteIntervention || ic.nomEntreprise || '—'));
  content.push(pdfLabelValueLine('Adresse du site : ', isi.adresseSite || ''));
  content.push({ text: (isi.codePostal || '') + ' ' + (isi.ville || ''), fontSize: FS(20), margin: [PT(1600), 0, 0, PT(240)] });

  content.push(pdfSubHeading('Référentiel'));
  ['Articles R.4212 du code du travail,', 'Articles R.4222 du code du travail,',
    'Arrêté du 8 octobre 1987 relatif au contrôle périodique des installations d’aération et d’assainissement des locaux de travail.'
  ].forEach(function (t) { content.push({ text: '-    ' + t, fontSize: FS(20) }); });

  return content;
}

function pdfBuildDescriptionLocaux(m) {
  var content = [];
  content.push(pdfHeading1('2. DESCRIPTION GENERALE DES LOCAUX'));
  content.push(pdfHeading2('2.1 DESCRIPTION DES LOCAUX CONTRÔLÉS'));
  content.push({ text: 'Les locaux contrôlés sont les suivants :', fontSize: FS(20) });

  var selectionnes = m.typesSelectionnes || [];
  var aNonSpecifique = selectionnes.indexOf('bureaux') !== -1;
  var autresNonSpecifiques = TYPES_POLLUTION_NON_SPECIFIQUE.filter(function (id) { return id !== 'bureaux' && selectionnes.indexOf(id) !== -1; });
  var specifiques = selectionnes.filter(function (id) { return TYPES_POLLUTION_NON_SPECIFIQUE.indexOf(id) === -1; });
  var labelsSpecifiques = specifiques.map(function (id) {
    var t = INSTALLATION_TYPES.filter(function (x) { return x.id === id; })[0];
    return t ? t.label.toLowerCase() : id;
  });

  if (aNonSpecifique) {
    content.push({ text: '-    Locaux à pollution non spécifique : ensemble des bureaux, salles de réunion', fontSize: FS(20) });
  } else if (autresNonSpecifiques.length > 0) {
    var labelsAutres = autresNonSpecifiques.map(function (id) {
      var t = INSTALLATION_TYPES.filter(function (x) { return x.id === id; })[0];
      return t ? t.label.toLowerCase() : id;
    });
    content.push({ text: '-    Locaux à pollution non spécifique : ' + labelsAutres.join(', '), fontSize: FS(20) });
  }
  if (labelsSpecifiques.length > 0) {
    content.push({ text: '-    Locaux à pollution spécifique : ' + labelsSpecifiques.join(', '), fontSize: FS(20) });
  }

  var locauxExclus = (m.descriptionLocaux && m.descriptionLocaux.locauxExclus) || '';
  if (locauxExclus) {
    content.push({ text: 'Les locaux suivants sont exclus de la prestation :', fontSize: FS(20), margin: [0, PT(120), 0, 0] });
    content.push({ text: locauxExclus, fontSize: FS(20) });
  }
  return content;
}

function pdfBuildDocumentsTransmis(m) {
  var dt = m.documentsTransmis || { documents: [], notice: [], observations: '' };
  var content = [];
  content.push(pdfHeading1('3. DOCUMENTS TRANSMIS A SOCOTEC'));
  content.push(pdfHeading2('3.1 LISTE DES DOCUMENTS TRANSMIS A SOCOTEC'));
  content.push(pdfDocsTable(dt.documents));
  content.push({ text: '3.2 NOTICE D’INSTRUCTION ET CONSIGNES D’UTILISATION', bold: true, color: PDF_ACCENT, fontSize: FS(22), margin: [0, PT(300), 0, PT(120)] });
  content.push(pdfNoticeTable(dt.notice));
  content.push({ text: 'Observations', bold: true, fontSize: FS(20), margin: [0, PT(240), 0, 0] });
  content.push({ text: dt.observations || '—', fontSize: FS(20) });
  return content;
}

function pdfBuildSyntheseControle(m) {
  var content = [];
  content.push(pdfHeading1('4. SYNTHESE DU CONTROLE'));
  content.push({ text: 'Locaux à pollution non spécifique :', bold: true, fontSize: FS(20), margin: [0, 0, 0, PT(60)] });
  content.push({ text: 'En présence du Dossier de Valeurs de Références, SOCOTEC compare les valeurs mesurées à celles-ci. En l’absence de ce Dossier, SOCOTEC évalue les conditions minimales de renouvellement d’air prescrites par l’article R.4222-6 du Code du Travail et par le règlement sanitaire départemental type sur la base des effectifs constatés ou estimés in situ pour chaque local, au moment du contrôle, et les compare aux valeurs mesurées.', fontSize: FS(20), margin: [0, 0, 0, PT(200)] });
  content.push({ text: 'Locaux à pollution spécifique :', bold: true, fontSize: FS(20), margin: [0, 0, 0, PT(60)] });
  content.push({ text: 'En présence du Dossier de Valeurs de Références, SOCOTEC compare les valeurs mesurées à celles-ci. En l’absence de celui-ci, SOCOTEC compare les valeurs mesurées à celles prescrites par l’article R.4212-6 du Code du Travail pour ce qui concerne les sanitaires et à celles prescrites par les normes ou les guides de l’INRS pour l’ensemble des locaux ou installations à pollution spécifique.', fontSize: FS(20), margin: [0, 0, 0, PT(240)] });
  content.push({ text: '4.1 SYNTHESE DU CONTRÔLE', bold: true, color: PDF_ACCENT, fontSize: FS(22), margin: [0, PT(120), 0, PT(160)] });

  var hasContent = false;
  INSTALLATION_TYPES.forEach(function (t) {
    var list = (m.installations && m.installations[t.id]) || [];
    var cfg = SYNTHESE_CONFIG[t.id];
    if (list.length === 0 || !cfg) return;
    hasContent = true;
    content.push(pdfSyntheseTable(cfg, list));
  });
  if (!hasContent) content.push({ text: 'Aucune installation renseignée.', italics: true, fontSize: FS(20) });
  return content;
}

function pdfBuildSommaire() {
  return [
    { text: 'SOMMAIRE', bold: true, fontSize: FS(32), color: PDF_BLUE, alignment: 'center', margin: [0, 0, 0, PT(240)] },
    { toc: { id: 'mainToc' } }
  ];
}

// ————————————————————————————————————————————
// 5.1 — Bureaux / Salles de réunion
// ————————————————————————————————————————————
function pdfBuildAnnexeBureaux(list, logoDataUrl) {
  var legal = [
    pdfLegalParagraph('Article R4222-5', { bold: true, center: true, size: 20 }),
    pdfLegalParagraph('Créé par Décret n°2008-244 du 7 mars 2008 - art. (V)', { italics: true, center: true, size: 16, after: 160 }),
    pdfLegalParagraph('L’aération par ventilation naturelle, assurée exclusivement par ouverture de fenêtres ou autres ouvrants donnant directement sur l’extérieur, est autorisée lorsque le volume par occupant est égal ou supérieur à :'),
    pdfLegalParagraph('1° / 15 m³ pour les bureaux et les locaux où est accompli un travail physique léger ;'),
    pdfLegalParagraph('2° / 24 m³ pour les autres locaux.', { after: 280 }),
    pdfLegalParagraph('Article R4222-6', { bold: true, center: true, size: 20 }),
    pdfLegalParagraph('Créé par Décret n°2008-244 du 7 mars 2008 - art. (V)', { italics: true, center: true, size: 16, after: 160 }),
    pdfLegalParagraph('Lorsque l’aération est assurée par ventilation mécanique, le débit minimal d’air neuf à introduire par occupant est fixé dans le tableau suivant :', { after: 160 }),
    pdfTable([PT(5600), PT(2400)], [
      [pdfHeaderCell('DESIGNATION DES LOCAUX'), pdfHeaderCell('DEBIT MINIMAL (m³/h/occupant)')],
      [pdfBodyCell('Bureaux, locaux sans travail physique'), pdfBodyCell('25', { center: true })],
      [pdfBodyCell('Locaux de restauration, locaux de vente, locaux de réunion'), pdfBodyCell('30', { center: true })],
      [pdfBodyCell('Ateliers et locaux avec travail physique léger'), pdfBodyCell('45', { center: true })],
      [pdfBodyCell('Autres ateliers et locaux'), pdfBodyCell('60', { center: true })]
    ], { noBorders: true, margin: [0, 0, 0, PT(160)] })
  ];
  var rows = [
    { label: 'Bâtiment', key: 'batiment' }, { label: 'Référence du local', key: 'reference_local' },
    { label: 'Type de local', key: 'type_local' }, { label: 'Ventilation', key: 'type_ventilation' },
    { label: 'Volume (m³)', key: 'volume' }, { label: 'Effectif', key: 'effectif' },
    { label: 'Présence d’ouvrant donnant directement sur l’extérieur', key: 'ouvrant_exterieur' },
    { label: 'Présence d’entrée d’air donnant directement sur l’extérieur', key: 'entree_air_exterieur' },
    { label: 'Présence d’entrée d’air permanente donnant directement sur l’extérieur', key: 'entree_air_permanente' },
    { subheader: 'Extraction' }, { label: 'Débit total mesuré (m³/h)', key: 'debit_total_mesure' },
    { subheader: 'Soufflage' }, { label: 'Débit soufflage mesuré (m³/h)', key: 'debit_soufflage' },
    { label: 'Débit extraction mesuré (m³/h)', key: 'debit_extraction' },
    { label: 'Débit d’air neuf introduit (m³/h)', key: 'debit_air_neuf_introduit' },
    { label: 'Pourcentage d’air neuf (%)', key: 'pourcentage_air_neuf' }, { label: 'Nombre de bouches', key: 'nombre_bouches' },
    { label: 'État des bouches', key: 'etat_bouches' },
    { subheader: 'Constat' }, { label: 'Type de ventilation', key: 'type_ventilation_libelle' },
    { label: 'Débit minimum d’air neuf (m³/h)', key: 'debit_min_air_neuf' }, { label: 'Volume minimal (m³)', key: 'volume_min' },
    { label: 'Avis par rapport aux valeurs réglementaires', key: 'avis', isAvis: true }, { label: 'Commentaire', key: 'commentaire' }
  ];
  return pdfCrosstabSection('Bureaux', 'Locaux à pollution non spécifique', legal, rows, list, logoDataUrl);
}

// ————————————————————————————————————————————
// 5.2 — Sanitaires
// ————————————————————————————————————————————
function pdfBuildAnnexeSanitaires(list, logoDataUrl) {
  var legal = [
    pdfLegalParagraph('Article R4212-6', { bold: true, center: true, size: 20 }),
    pdfLegalParagraph('Créé par Décret n°2008-244 du 7 mars 2008 - art. (V)', { italics: true, center: true, size: 16, after: 160 }),
    pdfLegalParagraph('Le maître d’ouvrage prévoit dans les locaux sanitaires l’introduction d’un débit minimal d’air déterminé par le tableau suivant :', { after: 160 }),
    pdfTable([PT(5600), PT(3000)], [
      [pdfHeaderCell('DÉSIGNATION DES LOCAUX'), pdfHeaderCell('DÉBIT MINIMAL d’air introduit (m³/h et par local)')],
      [pdfBodyCell('Cabinet d’aisances isolé (**)'), pdfBodyCell('30', { center: true })],
      [pdfBodyCell('Salle de bains ou de douches isolée (**)'), pdfBodyCell('45', { center: true })],
      [pdfBodyCell('Commune avec un cabinet d’aisances'), pdfBodyCell('60', { center: true })],
      [pdfBodyCell('Bains, douches et cabinets d’aisances groupés'), pdfBodyCell('30 + 15 N (*)', { center: true })],
      [pdfBodyCell('Lavabos groupés'), pdfBodyCell('10 + 5 N (*)', { center: true })]
    ], { noBorders: true }),
    pdfLegalParagraph('N (*) : nombre d’équipements dans le local', { size: 16, after: 60 }),
    pdfLegalParagraph('(**) : pour un cabinet d’aisances, une salle de bains ou de douches avec ou sans cabinet d’aisances, le débit minimal d’air introduit peut être limité à 15 mètres cubes par heure si ce local n’est pas à usage collectif.', { size: 16 })
  ];
  var rows = [
    { subheader: 'Localisation' }, { label: 'Bâtiment', key: 'batiment' }, { label: 'Référence du local', key: 'repere' },
    { label: 'Type de local', key: 'nom_usage' },
    { subheader: 'Type d’équipement' }, { label: 'WC/Urinoirs', key: 'wc_urinoirs' }, { label: 'Douches', key: 'douches' },
    { label: 'Lavabos', key: 'lavabos' }, { label: 'Individuel ou Collectif', key: 'individuel_collectif' },
    { subheader: 'Extraction' }, { label: 'Débit total mesuré (m³/h)', key: 'debit_mesure' }, { label: 'Nombre de bouches', key: 'nombre_bouches' },
    { subheader: 'Constat' }, { label: 'État des bouches', key: 'etat_bouches' }, { label: 'Type de ventilation', key: 'type_ventilation' },
    { label: 'Débit minimum d’extraction requis (m³/h)', key: 'debit_min_reglementaire' },
    { label: 'Avis par rapport aux valeurs réglementaires', key: 'avis', isAvis: true }, { label: 'Commentaires', key: 'observation' }
  ];
  return pdfCrosstabSection('Sanitaires', 'Sanitaires', legal, rows, list, logoDataUrl);
}

// ————————————————————————————————————————————
// 5.x — ERP
// ————————————————————————————————————————————
function pdfBuildAnnexeERP(list, logoDataUrl) {
  // Extraits réglementaires identiques à Bureaux + Règlement Sanitaire Départemental (Art. 64/66) —
  // reproduits en texte simple (le détail intégral des tableaux légaux importe moins ici que la
  // fidélité du tableau croisé de mesures, seule partie réellement consultée en pratique).
  var legal = [
    pdfLegalParagraph('Article R4222-5', { bold: true, center: true, size: 20 }),
    pdfLegalParagraph('Créé par Décret n°2008-244 du 7 mars 2008 - art. (V)', { italics: true, center: true, size: 16, after: 160 }),
    pdfLegalParagraph('L’aération par ventilation naturelle, assurée exclusivement par ouverture de fenêtres ou autres ouvrants donnant directement sur l’extérieur, est autorisée lorsque le volume par occupant est égal ou supérieur à 15 m³ (bureaux et locaux à travail physique léger) ou 24 m³ (autres locaux).', { after: 160 }),
    pdfLegalParagraph('Article R4222-6 et Règlement Sanitaire Départemental type (Art. 64/66)', { bold: true, center: true, size: 20 }),
    pdfLegalParagraph('Lorsque l’aération est assurée par ventilation mécanique, le débit minimal d’air neuf à introduire par occupant est fixé selon la désignation des locaux (voir barème Bureaux, complété par le Règlement Sanitaire Départemental type pour les établissements recevant du public).', { after: 160 })
  ];
  var rows = [
    { label: 'Bâtiment', key: 'batiment' }, { label: 'Référence du local', key: 'reference_local' },
    { label: 'Type de local', key: 'type_local' }, { label: 'Ventilation', key: 'type_ventilation' },
    { label: 'Volume (m³)', key: 'volume' }, { label: 'Travailleur', key: 'travailleur' }, { label: 'Public', key: 'public' },
    { subheader: 'Extraction / Soufflage' }, { label: 'Débit total mesuré (m³/h)', key: 'debit_total_mesure' },
    { label: 'Présence d’ouvrant donnant directement sur l’extérieur', key: 'ouvrant_exterieur' },
    { label: 'Présence d’entrée d’air donnant directement sur l’extérieur', key: 'entree_air_exterieur' },
    { label: 'Présence d’entrée d’air permanente donnant directement sur l’extérieur', key: 'entree_air_permanente' },
    { label: 'Pourcentage d’air neuf (%)', key: 'pourcentage_air_neuf' }, { label: 'Nombre de bouches', key: 'nombre_bouches' },
    { label: 'État des bouches', key: 'etat_bouches' },
    { subheader: 'Double flux' }, { label: 'Débit soufflage mesuré (m³/h)', key: 'debit_soufflage' },
    { label: 'Débit extraction mesuré (m³/h)', key: 'debit_extraction' }, { label: 'Débit d’air neuf introduit (m³/h)', key: 'debit_air_neuf_introduit' },
    { subheader: 'Constat' }, { label: 'Type de ventilation', key: 'type_ventilation_libelle' },
    { label: 'Débit minimum d’air neuf (m³/h)', key: 'debit_min_air_neuf' }, { label: 'Volume minimal (m³)', key: 'volume_min' },
    { label: 'Avis par rapport aux valeurs réglementaires', key: 'avis', isAvis: true }, { label: 'Commentaire', key: 'commentaire' }
  ];
  return pdfCrosstabSection('ERP', 'locaux à pollution non spécifique', legal, rows, list, logoDataUrl);
}

// ————————————————————————————————————————————
// 5.4 — Extracteurs
// ————————————————————————————————————————————
function pdfBuildAnnexeExtracteur(list, logoDataUrl) {
  var titre = 'Extracteur', sousTitre = 'Extracteurs';
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Bâtiment', formatCrosstabValue(d.batiment)], ['Locaux extraits', formatCrosstabValue(d.locaux_extraits)],
      ['Date du contrôle', formatCrosstabValue(d.date_controle)], ['Réf. de l’équipement et/ou implantation', formatCrosstabValue(d.reference_equipement)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var vitesse = d.vitesse_mode === 'Grille de points' ? d.vitesse_moyenne_grille : d.vitesse;
    var cols = [['Réseau d’air', 900], ['Forme de la section', 1300], ['Diamètre ou Côté 1 (cm)', 1100],
      ['Côté 2 (cm)', 900], ['Surface (m²)', 900], ['Vitesse (m/s)', 900],
      ['Valeur de référence ou recommandée (m³/h)', 1400], ['Débit année N-1 (m³/h)', 1118], ['Débit année en cours (m³/h)', 1118]];
    var vals = ['Extrait', formatCrosstabValue(d.forme_section), formatCrosstabValue(d.diametre_cote1),
      formatCrosstabValue(d.cote2), formatCrosstabValue(d.surface_m2), formatCrosstabValue(vitesse),
      formatCrosstabValue(d.valeur_reference_recommandee), formatCrosstabDebit(d.debit_annee_n1), formatCrosstabDebit(d.debit_annee_en_cours)];
    content.push(pdfFicheBar('Mesures de vitesse'));
    content.push(pdfTable(cols.map(function (c) { return PT(c[1]); }), [
      cols.map(function (c) { return pdfHeaderCell(c[0]); }),
      vals.map(function (v) { return pdfBodyCell(v, { center: true }); })
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport à la valeur de recommandée :', formatCrosstabValue(d.avis_constructeur)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Observations'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));

    if (d.forme_section) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(pdfFicheBar('Mesure de la vitesse dans le conduit d’air extrait'));
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
        [pdfHeaderCell('Type de conduit'), pdfBodyCell(formatCrosstabValue(d.forme_section))],
        [pdfHeaderCell('Température dans le conduit (°C)'), pdfBodyCell(formatCrosstabValue(d.temperature_conduit))],
        [pdfHeaderCell('Pression statique dans le conduit (Pa)'), pdfBodyCell(formatCrosstabValue(d.pression_statique))],
        [pdfHeaderCell('Masse volumique dans les conditions réelles (kg/m³)'), pdfBodyCell(formatCrosstabValue(d.masse_volumique))]
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });

      var gaineLabel = d.forme_section === 'Rectangulaire' ? 'Gaine rectangulaire' : 'Gaine circualire';
      content.push(pdfFicheBar(gaineLabel));
      var dimRows = d.forme_section === 'Rectangulaire'
        ? [[pdfHeaderCell('Largeur (cm)'), pdfBodyCell(formatCrosstabValue(d.diametre_cote1))], [pdfHeaderCell('Longueur (cm)'), pdfBodyCell(formatCrosstabValue(d.cote2))]]
        : [[pdfHeaderCell('Diamètre (cm)'), pdfBodyCell(formatCrosstabValue(d.diametre_cote1))]];
      dimRows.push([pdfHeaderCell('Vitesse moyenne (m/s)'), pdfBodyCell(formatCrosstabValue(vitesse))]);
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], dimRows));

      if (d.vitesse_mode === 'Grille de points' && Array.isArray(d.vitesse_grid)) {
        content.push({ text: '', margin: [0, 0, 0, PT(120)] });
        content.push(pdfFicheGrilleTable(d.vitesse_grid, d.vitesse_nb_axes, d.vitesse_nb_points));
      }
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.6 — Hottes (guide INRS ED 695)
// ————————————————————————————————————————————
function pdfBuildAnnexeHottes(list, logoDataUrl) {
  var titre = 'Hottes', sousTitre = 'Hottes et dosserets aspirants (guide INRS ED 695)';
  var legal = [
    pdfLegalParagraph('Méthodologie de vérification de l’aspiration des hottes', { bold: true, center: true, size: 20, after: 120 }),
    pdfLegalParagraph('Tests réalisés :', { size: 18, after: 40 }),
    pdfLegalParagraph('mesure de la vitesse de transport et comparaison avec les valeurs indiquées dans le guide INRS 695', { size: 18, after: 40 }),
    pdfLegalParagraph('mesure de la vitesse en sortie de hotte et comparaison avec les valeurs indiquées dans le guide INRS 695', { size: 18 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Bâtiment', formatCrosstabValue(d.batiment)], ['Localisation', formatCrosstabValue(d.localisation)],
      ['Date d’installation', formatCrosstabValue(d.date_installation)], ['Date de mesure', formatCrosstabValue(d.date_mesure)],
      ['Réf. de l’équipement et/ou implantation', formatCrosstabValue(d.reference_equipement)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('État visuel du réseau d’aspiration'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.etat_visuel_reseau)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Test fumigène'));
    content.push(pdfFicheConclusionRow('Observation', formatCrosstabValue(d.test_fumigene)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var choix = d.mesures_choisies || [];
    var avecVpe = choix.indexOf('Vitesse au point d’émission') !== -1 || choix.indexOf("Vitesse au point d'émission") !== -1;
    if (avecVpe) {
      var W = [2400, 1812, 1812, 1812, 1800].map(PT);
      content.push(pdfFicheBar('Mesure de la vitesse au point d’émission'));
      content.push(pdfTable(W, [
        [pdfHeaderCell(''), pdfHeaderCell('Valeurs mesurées'), pdfHeaderCell('Valeurs recommandées par l’INRS (ED 695)'), pdfHeaderCell('Valeurs de référence'), pdfHeaderCell('Avis par rapport aux valeurs de référence')],
        [pdfHeaderCell('Vitesse minimale (m/s)'), pdfBodyCell(formatCrosstabValue(d.vpe_min), { center: true }), pdfBodyCell(formatCrosstabValue(d.vpe_min_inrs), { center: true }), pdfBodyCell(formatCrosstabValue(d.vpe_min_reference), { center: true }), pdfBodyCell(formatCrosstabValue(d.avis_vpe_min), { center: true, bold: true })],
        [pdfHeaderCell('Vitesse moyenne (m/s)'), pdfBodyCell(formatCrosstabValue(d.vpe_moyenne), { center: true }), pdfBodyCell(formatCrosstabValue(d.vpe_moy_inrs), { center: true }), pdfBodyCell(formatCrosstabValue(d.vpe_moy_reference), { center: true }), pdfBodyCell(formatCrosstabValue(d.avis_vpe_moy), { center: true, bold: true })],
        [pdfHeaderCell('Débit d’air extrait (m³/h)'), pdfBodyCell(formatCrosstabValue(d.vpe_debit), { center: true, colSpan: 4 }), {}, {}, {}]
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }
    if (choix.indexOf('Vitesse de transport') !== -1) {
      content.push(pdfFicheVtTable(d));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport à la réglementation et/ou aux préconisations (dossier de valeurs de référence si existant, normes, guide INRS) :', formatCrosstabValue(d.conclusion)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Observation'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));

    if (avecVpe && (d.vpe_largeur_cm || d.vpe_hauteur_cm)) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(pdfFicheBar('Mesure dans le plan d’ouverture'));
      content.push(pdfTable([PT(3200), PDF_ANNEXE_CONTENT_WIDTH - PT(3200)], [
        [pdfHeaderCell('Largeur L (cm)'), pdfBodyCell(formatCrosstabValue(d.vpe_largeur_cm))],
        [pdfHeaderCell('Hauteur h (cm)'), pdfBodyCell(formatCrosstabValue(d.vpe_hauteur_cm))],
        [pdfHeaderCell('L’opérateur est situé en dehors du volume entre le point d’émission et le captage'), pdfBodyCell(formatCrosstabValue(d.operateur_hors_volume), { center: true, bold: true })]
      ]));
      if (Array.isArray(d.vpe_grid)) {
        content.push({ text: '', margin: [0, 0, 0, PT(120)] });
        content.push(pdfFicheGrilleTable(d.vpe_grid, d.vpe_nb_points_hauteur, d.vpe_nb_points_largeur));
      }
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.7 — Bras d'aspiration articulés
// ————————————————————————————————————————————
function pdfBuildAnnexeBrasAspiration(list, logoDataUrl) {
  var titre = 'Bras articulé', sousTitre = 'Bras articulés';
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    content.push(pdfFicheTitreSouligne('Identification du bras Aspirant'));
    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Batiment:', formatCrosstabValue(d.batiment)], ['Activité:', formatCrosstabValue(d.activite)],
      ['Atelier:', formatCrosstabValue(d.atelier)], ['Référence de l’équipement :', formatCrosstabValue(d.reference_equipement)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Examen visuel de l’état des éléments de l’installation'));
    content.push(pdfFicheTitreSouligne('Captage'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Adapté à la situation', formatCrosstabValue(d.adapte_situation)], ['Etat visuel', formatCrosstabValue(d.etat_visuel)],
      ['Etat des conduits aérauliques', formatCrosstabValue(d.etat_conduits)], ['Recyclage', formatCrosstabValue(d.recyclage)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(60)] });
    content.push(pdfFicheConclusionRow('Commentaire :', formatCrosstabValue(d.commentaire_1)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Test fumigène'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], [
      [pdfHeaderCell('Visualisation fumigène à 20 cm'), pdfBodyCell(formatCrosstabValue(d.test_fumigene))]
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(60)] });
    content.push(pdfFicheBar('Conditions de dispersion du polluant'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.conditions_dispersion)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var estCone = !!d.diametre_bras_cone;
    if (!estCone) {
      content.push(pdfFicheTitreSouligne('Dimensionnement'));
      var dimCols = [['Type de bouche d’aspiration', 2200], ['Diamètre de la bouche (cm)', 1900],
        ['Longueur et largeur de la bouche si ovale (cm)', 2400], ['Surface de la bouche pour les autres cas (m²)', 1800],
        ['Diamètre du conduit (cm)', 1336]];
      var ovale = d.forme_bouche === 'Ovale' ? (formatCrosstabValue(d.longueur_bouche_ovale) + ' × ' + formatCrosstabValue(d.largeur_bouche_ovale)) : '-';
      var dimVals = [formatCrosstabValue(d.type_bouche), d.forme_bouche === 'Circulaire' ? formatCrosstabValue(d.diametre_bouche) : '-',
        ovale, d.forme_bouche === 'Autre (surface connue)' ? formatCrosstabValue(d.surface_bouche_autre) : '-', formatCrosstabValue(d.diametre_conduit)];
      content.push(pdfTable(dimCols.map(function (c) { return PT(c[1]); }), [
        dimCols.map(function (c) { return pdfHeaderCell(c[0]); }),
        dimVals.map(function (v) { return pdfBodyCell(v, { center: true }); })
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheTitreSouligne('Résultats des mesures de vitesse et de débit d’air'));
    var seuilCaptage = formatCrosstabValue(d.vitesse_captage);
    var resCols = estCone
      ? [['Zone de la prise de mesure', 1800], ['Diamètre du bras au niveau du cône en (cm)', 1836], ['Vitesse moyenne mesurée en m/s', 1800], ['Débit calculé en m³/h', 1600], ['Distance maximum de captage à ' + seuilCaptage + ' m/s en cm', 1500], ['Distance d’utilisation en cm', 1100]]
      : [['Zone de la prise de mesure', 1800], ['Vitesse moyenne mesurée en m/s', 2136], ['Débit calculé en m³/h', 1800], ['Distance maximum de captage à ' + seuilCaptage + ' m/s en cm', 2100], ['Distance d’utilisation en cm', 1800]];
    var resVals = estCone
      ? [formatCrosstabValue(d.localisation_point_mesure), formatCrosstabValue(d.diametre_bras_cone), formatCrosstabValue(d.vitesse_moyenne), formatCrosstabValue(d.debit_calcule), formatCrosstabValue(d.distance_max_captage), formatCrosstabValue(d.distance_utilisation)]
      : [formatCrosstabValue(d.localisation_point_mesure), formatCrosstabValue(d.vitesse_moyenne), formatCrosstabValue(d.debit_calcule), formatCrosstabValue(d.distance_max_captage), formatCrosstabValue(d.distance_utilisation)];
    content.push(pdfTable(resCols.map(function (c) { return PT(c[1]); }), [
      resCols.map(function (c) { return pdfHeaderCell(c[0]); }),
      resVals.map(function (v) { return pdfBodyCell(v, { center: true }); })
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Conclusion:'));
    var phrase = 'le bras aspirant permet un captage efficace des polluants à une distance de ' +
      formatCrosstabValue(d.distance_max_captage) + ' cm ce qui est ' + formatCrosstabValue(d.conclusion_distance) +
      ' par rapport à la distance d’utilisation.';
    content.push(pdfFicheConclusionPhrase(phrase));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    if (d.debit_precedent) {
      content.push(pdfFicheTitreSouligne('Evolution des valeurs par rapport aux mesures précédentes'));
      var evoCols = [['Débit mesuré précédemment en m³/h', 2400], ['Débit mesurés cette année en m³/h', 2400], ['Evolution en %', 1800], ['Commentaire', 3036]];
      var evoVals = [formatCrosstabValue(d.debit_precedent), formatCrosstabValue(d.debit_calcule), formatCrosstabValue(d.evolution_pct), formatCrosstabValue(d.commentaire_2)];
      content.push(pdfTable(evoCols.map(function (c) { return PT(c[1]); }), [
        evoCols.map(function (c) { return pdfHeaderCell(c[0]); }),
        evoVals.map(function (v) { return pdfBodyCell(v, { center: true }); })
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheTitreSouligne('Explication/remarque:'));
    content.push({ text: formatCrosstabValue(d.conclusion), fontSize: FS(18) });
    if (d.recyclage === 'Oui') {
      content.push({ text: 'Non respect du code du travail pour le recyclage', fontSize: FS(18), margin: [0, PT(80), 0, 0] });
      content.push({ text: '- absence d’un système de surveillance permettant de déceler les défauts des dispositifs d’épuration.', fontSize: FS(18) });
      content.push({ text: '- absence de contrôle de la concentration en polluant dans l’air recyclé', fontSize: FS(18) });
    }
  });
  return content;
}

// ————————————————————————————————————————————
// Assemblage du document complet
// ————————————————————————————————————————————

// Les 18 types d'installations sont tous portés fidèlement vers pdfmake. pdfBuildAnnexeFicheGenerique
// (fiche schéma-pilotée générique) reste le filet de sécurité pour un futur 19e type ajouté sans fiche
// dédiée immédiate.
var PDF_ANNEXES_FIDELES = {
  bureaux: function (list) { return pdfBuildAnnexeBureaux(list, PDF_ASSETS.logo); },
  sanitaires: function (list) { return pdfBuildAnnexeSanitaires(list, PDF_ASSETS.logo); },
  erp: function (list) { return pdfBuildAnnexeERP(list, PDF_ASSETS.logo); },
  extracteur: function (list) { return pdfBuildAnnexeExtracteur(list, PDF_ASSETS.logo); },
  hottes: function (list) { return pdfBuildAnnexeHottes(list, PDF_ASSETS.logo); },
  bras_aspiration: function (list) { return pdfBuildAnnexeBrasAspiration(list, PDF_ASSETS.logo); },
  cta: function (list) { return pdfBuildAnnexeCTA(list, PDF_ASSETS.logo, PDF_ASSETS.ctaSchema); },
  sorbonnes: function (list) { return pdfBuildAnnexeSorbonnes(list, PDF_ASSETS.logo); },
  cabines_peinture: function (list) { return pdfBuildAnnexeCabinesPeinture(list, PDF_ASSETS.logo); },
  box_peinture: function (list) { return pdfBuildAnnexeBoxPeinture(list, PDF_ASSETS.logo); },
  locaux_fumeurs: function (list) { return pdfBuildAnnexeLocauxFumeurs(list, PDF_ASSETS.logo); },
  gaz_echappement: function (list) { return pdfBuildAnnexeGazEchappement(list, PDF_ASSETS.logo); },
  menuiserie: function (list) { return pdfBuildAnnexeMenuiserie(list, PDF_ASSETS.logo); },
  menuiserie_bis: function (list) { return pdfBuildAnnexeMenuiserieMAB(list, PDF_ASSETS.logo); },
  torches_aspirantes: function (list) { return pdfBuildAnnexeTorchesAspirantes(list, PDF_ASSETS.logo); },
  tts: function (list) { return pdfBuildAnnexeTTS(list, PDF_ASSETS.logo); },
  installations_diverses: function (list) { return pdfBuildAnnexeInstallationsDiverses(list, PDF_ASSETS.logo); },
  locaux_charge: function (list) { return pdfBuildAnnexeLocauxCharge(list, PDF_ASSETS.logo); }
};

// Résolu par exportRapportPdf() avant l'assemblage (logo + bandeau + photos de page intercalaire),
// simple objet global le temps d'un export — pas d'état persistant.
var PDF_ASSETS = { logo: null, banner: null, dividers: {}, ctaSchema: null };

function pdfBuildAnnexeForType(t, list) {
  if (PDF_ANNEXES_FIDELES[t.id]) return PDF_ANNEXES_FIDELES[t.id](list);
  var group = sectionGroupForType(t.id);
  return pdfBuildAnnexeFicheGenerique(t.id, t.label, (group && group.titre) || t.label, null, list, PDF_ASSETS.logo);
}

function pdfBuildFooter(di) {
  return function (currentPage, pageCount) {
    if (currentPage === 1) {
      return {
        margin: [40, 10, 40, 0],
        columns: [
          { text: 'SOCOTEC ENVIRONNEMENT', fontSize: FS(22) },
          { text: 'Nombre de pages : ' + pageCount + ' pages (annexes comprises)', fontSize: FS(22), alignment: 'right' }
        ]
      };
    }
    return {
      margin: [40, 10, 40, 0],
      columns: [
        { text: 'N° d’Affaire : ' + (di.numeroAffaire || '—'), fontSize: FS(22) },
        { text: 'N° Chrono : ' + (di.numeroChrono || '—'), fontSize: FS(22), alignment: 'center' },
        { text: currentPage + '/' + pageCount, fontSize: FS(22), alignment: 'right' }
      ]
    };
  };
}

function pdfBuildRapportDocDefinition(m) {
  var di = m.donneesInternes || {}, ic = m.infosClient || {}, is = m.intervenantSite || {}, isi = m.infosSiteIntervention || {};

  var content = [];
  content = content.concat(pdfBuildPageDeGarde(m, di, ic, is, isi, PDF_ASSETS.logo, PDF_ASSETS.banner));
  content.push({ text: '', pageBreak: 'after' });
  content = content.concat(pdfBuildSommaire());
  content.push({ text: '', pageBreak: 'after' });
  content = content.concat(pdfBuildPresentationMission(m, di, ic, isi));
  content = content.concat(pdfBuildDescriptionLocaux(m));
  content = content.concat(pdfBuildDocumentsTransmis(m));
  content = content.concat(pdfBuildSyntheseControle(m));

  // Page de titre "ANNEXES" à part entière (grand mot centré verticalement, comme le PDF de
  // référence) plutôt qu'un simple titre en haut de page — corrigé lors de la comparaison avec un
  // vrai rapport de référence (audit du 2026-09-18, retour utilisateur). L'entrée de sommaire ("5.
  // ANNEXES") est un marqueur séparé quasi invisible, même technique que pdfSectionDividerPage :
  // pdfmake reprend tel quel le texte d'un tocItem, qui doit donc rester distinct du gros mot affiché.
  content.push({ text: '5. ANNEXES', fontSize: 0.5, color: '#FFFFFF', pageBreak: 'before', tocItem: 'mainToc', tocStyle: { fontSize: FS(28), bold: true, color: PDF_BLUE } });
  content.push({ text: 'ANNEXES', bold: true, color: PDF_ACCENT, fontSize: 40, alignment: 'center', margin: [0, 320, 0, 0] });

  var seenSectionGroups = {};
  INSTALLATION_TYPES.forEach(function (t) {
    var list = (m.installations && m.installations[t.id]) || [];
    if (list.length === 0) return;

    var group = sectionGroupForType(t.id);
    if (group && !seenSectionGroups[group.key]) {
      seenSectionGroups[group.key] = true;
      content.push({ text: '', pageBreak: 'before' });
      var groupNum = SECTION_GROUPS.indexOf(group) + 1;
      content = content.concat(pdfSectionDividerPage(group.titre, PDF_ASSETS.dividers[group.key], '5.' + groupNum + ' ' + group.sommaireTitre));
    }
    content.push({ text: '', pageBreak: 'before' });
    content = content.concat(pdfBuildAnnexeForType(t, list));
  });

  return {
    pageSize: 'A4',
    pageMargins: [PT(1134), PT(1134), PT(1134), PT(1134) + 20],
    defaultStyle: { font: 'Arial', fontSize: FS(20) },
    footer: pdfBuildFooter(di),
    content: content
  };
}

// ————————————————————————————————————————————
// Orchestration : chargement des images (en dataURL, directement exploitables par pdfmake), puis
// génération et téléchargement du PDF — un seul clic, aucun logiciel externe requis.
// ————————————————————————————————————————————

function pdfFetchAsDataUrl(path) {
  return fetch(path).then(function (r) {
    if (!r.ok) throw new Error('asset introuvable: ' + path);
    return r.blob();
  }).then(function (blob) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { resolve(null); };
      reader.readAsDataURL(blob);
    });
  }).catch(function () { return null; });
}

function exportRapportPdf() {
  var m = getCurrentMission();
  if (!m) { alert('Aucune mission sélectionnée'); return; }
  if (typeof pdfMake === 'undefined') {
    alert('Bibliothèque PDF non chargée. Rechargez l’application.');
    return;
  }

  var sectionImagePaths = [];
  var sectionImageCounts = SECTION_GROUPS.map(function (g) { return g.images.length; });
  SECTION_GROUPS.forEach(function (g) { sectionImagePaths = sectionImagePaths.concat(g.images); });

  Promise.all([resolveMissionPhotos(m), pdfFetchAsDataUrl(LOGO_PATH), pdfFetchAsDataUrl(BANNER_PATH), pdfFetchAsDataUrl(CTA_SCHEMA_PATH)].concat(sectionImagePaths.map(pdfFetchAsDataUrl)))
    .then(function (bufs) {
      var resolvedM = bufs[0];
      PDF_ASSETS.logo = bufs[1];
      PDF_ASSETS.banner = bufs[2];
      PDF_ASSETS.ctaSchema = bufs[3];
      PDF_ASSETS.dividers = {};
      var cursor = 4;
      SECTION_GROUPS.forEach(function (g, i) {
        PDF_ASSETS.dividers[g.key] = bufs.slice(cursor, cursor + sectionImageCounts[i]);
        cursor += sectionImageCounts[i];
      });
      try {
        var docDefinition = pdfBuildRapportDocDefinition(resolvedM);
        var rawName = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').trim();
        pdfMake.createPdf(docDefinition).download(rawName + '_controle_aeration.pdf');
      } catch (err) {
        alert('Erreur lors de l’export PDF.\n' + err.message);
      }
    });
}

// ————————————————————————————————————————————
// 5.3 — Centrales de traitement de l'air
// ————————————————————————————————————————————
function pdfFicheCtaReseauRow(label, d, prefix) {
  var vals = [label, formatCrosstabValue(d[prefix + '_forme']), formatCrosstabValue(d[prefix + '_diametre_cote1']),
    formatCrosstabValue(d[prefix + '_cote2']), formatCrosstabValue(d[prefix + '_surface']), formatCrosstabValue(d[prefix + '_vitesse']),
    formatCrosstabValue(d[prefix + '_reference']), formatCrosstabDebit(d[prefix + '_debit_n1']), formatCrosstabDebit(d[prefix + '_debit'])];
  return vals.map(function (v) { return pdfBodyCell(v, { center: true }); });
}

function pdfBuildAnnexeCTA(list, logoDataUrl, ctaSchemaDataUrl) {
  var titre = 'CTA', sousTitre = 'Centrales de traitement de l’air';
  var legal = [
    pdfLegalParagraph('Méthodologie de vérification des Centrales de Traitement d’Air', { bold: true, center: true, size: 20, after: 120 }),
    pdfLegalParagraph('La vérification du bon fonctionnement des centrales de traitement d’air consiste principalement à vérifier l’état des filtres et à s’assurer que la vitesse de l’air dans les gaines est satisfaisante par rapport aux valeurs figurant dans le dossier de valeurs de référence ou, à défaut, des contrôles précédents.', { size: 18 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200);
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Localisation', formatCrosstabValue(d.localisation)],
      ['Locaux alimentés', formatCrosstabValue(d.locaux_alimentes)],
      ['Date du contrôle', formatCrosstabValue(d.date_controle)],
      ['Réf. de l’équipement et/ou Implantation', formatCrosstabValue(d.reference_equipement)],
      ['Mode de fonctionnement', formatCrosstabValue(d.mode_fonctionnement)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    if (d.afficher_filtration === 'Oui') {
      var FW = [2400, 2412, 2412, 2412].map(PT);
      function filtreCol(prefix) {
        return [formatCrosstabValue(d[prefix + '_etat']), formatCrosstabValue(d[prefix + '_type']), formatCrosstabValue(d[prefix + '_nombre_dimensions']), formatCrosstabValue(d[prefix + '_classe']), d[prefix + '_perte_charge'] !== undefined ? formatCrosstabValue(d[prefix + '_perte_charge']) : '-'];
      }
      var pre = filtreCol('filt_pre'), filtre = filtreCol('filt_filtre'), absolu = filtreCol('filt_absolu');
      var filtreLabels = ['État', 'Type (cellules, poches, ...)', 'Nombre / Dimensions', 'Classe d’efficacité', 'Perte de charge (Pa)'];
      content.push(pdfFicheBar('Filtration'));
      var filtreRows = [[pdfHeaderCell(''), pdfHeaderCell('Pré-filtre'), pdfHeaderCell('Filtre'), pdfHeaderCell('Filtre absolu')]];
      filtreLabels.forEach(function (lab, i) {
        filtreRows.push([pdfHeaderCell(lab), pdfBodyCell(pre[i], { center: true }), pdfBodyCell(filtre[i], { center: true }), pdfBodyCell(absolu[i], { center: true })]);
      });
      content.push(pdfTable(FW, filtreRows));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheBar('État du reste de l’installation'));
    var etatPairs = [
      ['État général (propreté, corrosion, chocs, etc.)', formatCrosstabValue(d.etat_general)],
      ['Prise d’air neuf', formatCrosstabValue(d.prise_air_neuf)],
      ['Batterie(s) froide(s)', formatCrosstabValue(d.batterie_froide)],
      ['Batterie(s) chaude(s)', formatCrosstabValue(d.batterie_chaude)],
      ['Canalisations / Gaines', formatCrosstabValue(d.canalisations_gaines)],
      ['Ventilateur / Courroie', formatCrosstabValue(d.ventilateur_courroie)],
      ['Fiche de Maintenance', formatCrosstabValue(d.fiche_maintenance)]
    ];
    if (d.fiche_maintenance === 'Dernière intervention de maintenance') {
      etatPairs.push(['Date de la dernière intervention de maintenance', formatCrosstabValue(d.date_derniere_maintenance)]);
    }
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows(etatPairs)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var cols = [
      ['Réseau d’air', 900], ['Forme de la section', 1300], ['Diamètre ou Côté 1 (cm)', 1100],
      ['Côté 2 (cm)', 900], ['Surface (m²)', 900], ['Vitesse (m/s)', 900],
      ['Débit de référence (m³/h)', 1400], ['Débit année N-1 (m³/h)', 1118], ['Débit année en cours (m³/h)', 1118]
    ];
    var colWidths = cols.map(function (c) { return PT(c[1]); });
    var reseauRows = [cols.map(function (c) { return pdfHeaderCell(c[0]); })];
    reseauRows.push(pdfFicheCtaReseauRow('Neuf', d, 'neuf'));
    reseauRows.push(pdfFicheCtaReseauRow('Soufflé', d, 'souf'));
    if (d.rep_active === 'Oui') reseauRows.push(pdfFicheCtaReseauRow('Repris', d, 'rep'));
    content.push(pdfFicheBar('Mesures de vitesse'));
    content.push(pdfTable(colWidths, reseauRows));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport aux données constructeurs :', formatCrosstabValue(d.avis)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Observations'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));

    if (ctaSchemaDataUrl) {
      content.push({ text: '', margin: [0, 0, 0, PT(160)] });
      content.push({ image: ctaSchemaDataUrl, width: 345, height: 146.25, alignment: 'center' });
    }

    var reseauxPage2 = ['neuf', 'souf', 'rep'].filter(function (p) {
      if (p === 'rep' && d.rep_active !== 'Oui') return false;
      return !!d[p + '_forme'];
    });
    if (reseauxPage2.length) {
      content.push({ text: '', pageBreak: 'before' });
      reseauxPage2.forEach(function (prefix, ri) {
        if (ri > 0) content.push({ text: '', margin: [0, 0, 0, PT(160)] });
        var label = prefix === 'neuf' ? 'neuf' : (prefix === 'souf' ? 'soufflé' : 'repris');
        content.push(pdfFicheBar('Mesure de la vitesse dans le conduit d’air ' + label));
        content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
          [pdfHeaderCell('Type de conduit'), pdfBodyCell(formatCrosstabValue(d[prefix + '_forme']))],
          [pdfHeaderCell('Température dans le conduit (°C)'), pdfBodyCell(formatCrosstabValue(d[prefix + '_temperature_conduit']))],
          [pdfHeaderCell('Pression statique dans le conduit (Pa)'), pdfBodyCell(formatCrosstabValue(d[prefix + '_pression_statique']))],
          [pdfHeaderCell('Masse volumique dans les conditions réelles (kg/m³)'), pdfBodyCell(formatCrosstabValue(d[prefix + '_masse_volumique']))]
        ]));
        content.push({ text: '', margin: [0, 0, 0, PT(120)] });
        if (d[prefix + '_forme'] === 'Rectangulaire') {
          content.push(pdfFicheBar('Gaine rectangulaire'));
          content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
            [pdfHeaderCell('Largeur (cm)'), pdfBodyCell(formatCrosstabValue(d[prefix + '_diametre_cote1']))],
            [pdfHeaderCell('Longueur (cm)'), pdfBodyCell(formatCrosstabValue(d[prefix + '_cote2']))],
            [pdfHeaderCell('Vitesse moyenne (m/s)'), pdfBodyCell(formatCrosstabValue(d[prefix + '_vitesse']))]
          ]));
        } else if (d[prefix + '_forme'] === 'Circulaire') {
          content.push(pdfFicheBar('Gaine circualire'));
          content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
            [pdfHeaderCell('Diamètre (cm)'), pdfBodyCell(formatCrosstabValue(d[prefix + '_diametre_cote1']))],
            [pdfHeaderCell('Vitesse moyenne (m/s)'), pdfBodyCell(formatCrosstabValue(d[prefix + '_vitesse']))]
          ]));
        }
      });
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.5 — Sorbonnes
// ————————————————————————————————————————————
function pdfBuildAnnexeSorbonnes(list, logoDataUrl) {
  var titre = 'Sorbonne', sousTitre = 'Vérification des sorbonnes';
  var legal = [
    pdfLegalParagraph('Tests réalisés lors d’un contrôle de routine :', { after: 40 }),
    pdfLegalParagraph('Test fumigène, mesure des vitesses d’air dans le plan d’ouverture de la sorbonne, vérification de l’état de la sorbonne. les valeurs mesurées sont comparées aux valeurs recommandées par les normes XP X15-203 et NF EN 14175-4 (en fonction de la date de construction) ou aux valeurs de référence des installations.', {})
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Activité et référence du local', formatCrosstabValue(d.localisation)],
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Date de mesures', formatCrosstabValue(d.date_controle)],
      ['Réf. de l’équipement', formatCrosstabValue(d.reference_equipement)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Contexte de mesures :'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Local', formatCrosstabValue(d.local)],
      ['Paillasse', formatCrosstabValue(d.paillasse)],
      ['Obstacle gênant la réalisation d’un point', formatCrosstabValue(d.obstacle_point_mesure)],
      ['Autre(s) sorbonne(s) en fonctionnement', formatCrosstabValue(d.autres_sorbonnes)],
      ['Ouvrants', formatCrosstabValue(d.ouvrants)],
      ['Autre(s) dispositif(s) de ventilation', formatCrosstabValue(d.autres_dispositifs)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Mesures :'));
    var mCols = [['Température (°C)', 1800], ['Hygrométrie (%)', 1800], ['Pression atmosphérique (Pa)', 2000], ['Différence de pression (Pa) entre le local et son environnement', 2436], ['Appareils de mesure utilisés', 1600]];
    var mVals = [formatCrosstabValue(d.temperature), formatCrosstabValue(d.hygrometrie), formatCrosstabValue(d.pression_atmospherique), formatCrosstabValue(d.difference_pression), formatCrosstabValue(d.appareils_mesure)];
    content.push(pdfTable(mCols.map(function (c) { return PT(c[1]); }), [
      mCols.map(function (c) { return pdfHeaderCell(c[0]); }),
      mVals.map(function (v) { return pdfBodyCell(v, { center: true }); })
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Test au fumigène :'));
    content.push({ text: 'visualisation des déplacements d’air autour de l’ouverture de travail', italics: true, fontSize: FS(18), margin: [0, 0, 0, PT(80)] });
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Présence de zones turbulentes', formatCrosstabValue(d.zones_turbulentes)],
      ['Présence de zones mortes', formatCrosstabValue(d.zones_mortes)],
      ['Le test au fumigène met-il en évidence des perturbations susceptibles de gêner le bon fonctionnement de la sorbonne ?', formatCrosstabValue(d.perturbations)]
    ])));
    if (d.v90_mesuree || d.v140_mesuree) {
      content.push({ text: '', margin: [0, 0, 0, PT(60)] });
      content.push(pdfFicheBar('Mesures de vitesse d’air du local (à 40cm devant la sorbonne ; h : 90 puis 140 cm) — recommandation < 0,2 m/s'));
      content.push(pdfTable([PT(3636), PT(3000), PT(3000)], [
        [pdfHeaderCell(''), pdfHeaderCell('90 cm'), pdfHeaderCell('140 cm')],
        [pdfHeaderCell('Vitesses (m/s)'), pdfBodyCell(formatCrosstabValue(d.v90_mesuree), { center: true }), pdfBodyCell(formatCrosstabValue(d.v140_mesuree), { center: true })]
      ]));
    }
    if (d.remarques_complementaires && d.remarques_complementaires !== '-') {
      content.push({ text: '', margin: [0, 0, 0, PT(60)] });
      content.push(pdfFicheConclusionRow('Remarques complémentaires :', formatCrosstabValue(d.remarques_complementaires)));
    }
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Ouverture de travail'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Largeur (mm)', formatCrosstabValue(d.largeur_mm)],
      ['Ouverture de travail h (mm) en fonction de l’année de construction de la sorbonne', formatCrosstabValue(d.annee_construction)],
      ['Ouverture de travail h (mm)', formatCrosstabValue(d.h_mm)],
      ['Surface de l’ouverture (m²)', formatCrosstabValue(d.surface_ouverture)],
      ['Espace horizontal l entre 2 points (mm)', formatCrosstabValue(d.espace_horizontal)],
      ['Espace vertical h entre 2 points (mm)', formatCrosstabValue(d.espace_vertical)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push({ text: '', pageBreak: 'before' });
    content.push({ text: 'Dispositif de sécurité sur la sorbonne :', bold: true, fontSize: FS(20), margin: [0, PT(60), 0, PT(60)] });
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Verrouillage de la paroi vitrée (butée)', formatCrosstabValue(d.verrouillage_paroi)],
      ['Parachute sur la paroi vitrée', formatCrosstabValue(d.parachute_paroi)],
      ['Mesure de la vitesse frontale', formatCrosstabValue(d.mesure_vitesse_frontale)],
      ['Alarme sonore', formatCrosstabValue(d.alarme_sonore)],
      ['Alarme visuelle', formatCrosstabValue(d.alarme_visuelle)],
      ['Eclairage à l’intérieur du volume', formatCrosstabValue(d.eclairage_interieur)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    if (Array.isArray(d.grille)) {
      content.push(pdfFicheBar('Relevé des vitesses mesurées dans le plan d’ouverture'));
      content.push(pdfFicheGrilleTable(d.grille, d.nb_lignes, d.nb_colonnes, 'Ligne', 'Colonne'));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }
    if (d.commentaire) {
      content.push(pdfFicheBar('Commentaire'));
      content.push(pdfFicheObservationBox(formatCrosstabValue(d.commentaire)));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheBar('Résultats (guide INRS ED 795)'));
    var rCols = [2000, 1200, 1200, 1200, 2018, 2018].map(PT);
    content.push(pdfTable(rCols, [
      [pdfHeaderCell(''), pdfHeaderCell('Valeurs mesurées'), pdfHeaderCell('Valeurs de référence'), pdfHeaderCell('Valeurs normes'), pdfHeaderCell('Avis par rapport aux valeurs de référence'), pdfHeaderCell('Avis par rapport aux valeurs normatives')],
      [
        pdfHeaderCell('Vitesse minimale (m/s)'),
        pdfBodyCell(formatCrosstabValue(d.vitesse_min_mesuree), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.vitesse_min_reference), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.vitesse_min_norme_valeur), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.vitesse_min_avis_reference), { center: true, bold: true }),
        pdfBodyCell(formatCrosstabValue(d.vitesse_min_avis_norme), { center: true, bold: true })
      ],
      [
        pdfHeaderCell('Vitesse moyenne (m/s)'),
        pdfBodyCell(formatCrosstabValue(d.vitesse_moy_mesuree), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.vitesse_moy_reference), { center: true }),
        pdfBodyCell('/', { center: true }),
        pdfBodyCell(formatCrosstabValue(d.vitesse_moy_avis_reference), { center: true, bold: true }),
        pdfBodyCell('/', { center: true })
      ],
      [
        pdfHeaderCell('Débit d’air extrait (m³/h)'),
        pdfBodyCell(formatCrosstabValue(d.debit_mesure), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.debit_reference), { center: true }),
        pdfBodyCell('-', { center: true }),
        pdfBodyCell(formatCrosstabValue(d.debit_avis_reference), { center: true, bold: true }),
        pdfBodyCell(formatCrosstabValue(d.debit_avis_reference), { center: true, bold: true })
      ]
    ]));
  });
  return content;
}

// ————————————————————————————————————————————
// 5.8 — Cabines de peinture (dans le groupe "Installations avec captage localisé")
// ————————————————————————————————————————————
var PDF_TITRES_CABINE = {
  'Ouverte': 'CABINE DE PEINTURE OUVERTE',
  'Fermée': 'CABINE DE PEINTURE FERMEE',
  'Semi-fermée': 'CABINE DE PEINTURE SEMI-FERMEE'
};
function pdfBuildAnnexeCabinesPeinture(list, logoDataUrl) {
  var titre = 'Cabine de peinture';
  var legal = [
    pdfLegalParagraph('Méthodologie de vérification de la', { bold: true, center: true, size: 20 }),
    pdfLegalParagraph('ventilation des cabines de peinture', { bold: true, center: true, size: 20, after: 120 }),
    pdfLegalParagraph('Ventilation verticale: - Mesures réalisées à 1m du sol, aux points indiqués dans les fiches annexes.  Ventilation horizontale: - Mesures réalisées dans le plan de travail du peintre : vérifier qu’il ne se trouve pas entre le pulvérisateur et l’objet à peindre.', { after: 160 }),
    pdfLegalParagraph('Les valeurs mesurées sont comparées à celles des guides INRS ED 835 pour les peintures liquides et ED 928 pour les peintures poudre ou, éventuellement, à celles de la norme 16985.', { after: 100 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, 'Cabines de peinture', logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;

  function pdfCabineVitesseTable(d) {
    var recommandeePar = formatCrosstabValue(d.v1_recommandee_par);
    var W = [2400, 1800, 1800, 2018, 1618].map(PT);
    var rows = [[pdfHeaderCell(''), pdfHeaderCell('Valeurs mesurées'), pdfHeaderCell('Valeurs de référence'), pdfHeaderCell('Valeurs recommandées par ' + recommandeePar), pdfHeaderCell('Avis par rappport aux valeurs de référence')]];
    rows.push([
      pdfHeaderCell('Vitesse moyenne (m/s)'),
      pdfBodyCell(formatCrosstabValue(d.v1_mesuree), { center: true }),
      pdfBodyCell(formatCrosstabValue(d.v1_reference), { center: true }),
      pdfBodyCell(formatCrosstabValue(d.v1_valeur_recommandee), { center: true }),
      pdfBodyCell(formatCrosstabValue(d.v1_avis), { center: true, bold: true })
    ]);
    if (d.v2_active === 'Oui') {
      rows.push([
        pdfHeaderCell('Vitesse minimale (m/s)'),
        pdfBodyCell(formatCrosstabValue(d.v2_mesuree), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.v2_reference), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.v2_valeur_recommandee), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.v2_avis), { center: true, bold: true })
      ]);
    }
    return pdfTable(W, rows);
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    var sousTitre = PDF_TITRES_CABINE[d.type_cabine] || 'CABINE DE PEINTURE';
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Marque', formatCrosstabValue(d.marque)],
      ['Emplacement', formatCrosstabValue(d.batiment)],
      ['Date du contrôle', formatCrosstabValue(d.date_controle)],
      ['Réf. de l’équipement et/ou Implantation', formatCrosstabValue(d.reference_equipement)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Type de flux', formatCrosstabValue(d.type_flux)],
      ['Nature des produits à peindre', formatCrosstabValue(d.nature_produits)],
      ['Pulvérisation', formatCrosstabValue(d.pulverisation)],
      ['Zone de travail', formatCrosstabValue(d.zone_travail)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('État visuel de la cabine'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.etat_visuel_cabine)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Test fumigène'));
    content.push(pdfFicheConclusionRow('Vérification de la direction du flux', formatCrosstabValue(d.direction_flux)));
    content.push(pdfFicheConclusionRow('État des filtres', formatCrosstabValue(d.etat_filtres)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Vitesse d’air dans la cabine'));
    content.push(pdfCabineVitesseTable(d));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Débit d’air dans la cabine vide'));
    content.push(pdfTable([2400, 2412, 2412, 2412].map(PT), [
      [pdfHeaderCell(''), pdfHeaderCell('Valeurs mesurées'), pdfHeaderCell('Valeurs de référence'), pdfHeaderCell('Avis par rappport aux valeurs de référence')],
      [
        pdfHeaderCell('Débit (m³/h)'),
        pdfBodyCell(formatCrosstabValue(d.debit_mesure), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.debit_reference), { center: true }),
        pdfBodyCell(formatCrosstabValue(d.debit_avis), { center: true, bold: true })
      ]
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport à la réglementation et/ou aux préconisations (dossier de valeurs de référence si existant, norme 16985, guide INRS) vis-à-vis des cabines de peinture :', formatCrosstabValue(d.conclusion)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Observation'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observations)));

    if (d.largeur_cabine || d.longueur_cabine) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(pdfFicheBar('Mesure de la cabine vide'));
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
        [pdfHeaderCell('Largeur (m)'), pdfBodyCell(formatCrosstabValue(d.largeur_cabine))],
        [pdfHeaderCell('Longueur (m)'), pdfBodyCell(formatCrosstabValue(d.longueur_cabine))]
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
      if (Array.isArray(d.vitesse_grid)) {
        content.push(pdfFicheGrilleTable(d.vitesse_grid, d.vitesse_nb_axes, d.vitesse_nb_points));
        content.push({ text: '', margin: [0, 0, 0, PT(120)] });
      }
      content.push(pdfCabineVitesseTable(d));
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.9 — Box de préparation peinture
// ————————————————————————————————————————————
function pdfBuildAnnexeBoxPeinture(list, logoDataUrl) {
  var titre = 'Box préparation peinture', sousTitre = 'Installations avec captage localisé';
  var legal = [
    pdfLegalParagraph('RÉFÉRENTIEL', { bold: true, center: true, size: 20, after: 100 }),
    pdfLegalParagraph('NF T 35-014, Décembre 2004 — Box de préparation des peintures', { center: true, size: 18 }),
    pdfLegalParagraph('Taux de renouvellement minimum préconisé : 50 volumes/heure', { center: true, size: 18, after: 100 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Activité et référence du local', formatCrosstabValue(d.activite_reference_local)],
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Date de contrôle', formatCrosstabValue(d.date_controle)],
      ["Réf. équipement", formatCrosstabValue(d.reference_equipement)],
      ['Nombre de captage', formatCrosstabValue(d.nombre_captage)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var etatVisuel = formatCrosstabValue(d.etat_visuel_installations);
    if (Array.isArray(d.etat_visuel_installations) && d.etat_visuel_installations.indexOf('Autres') !== -1 && d.etat_visuel_si_autres) {
      etatVisuel += ' (' + d.etat_visuel_si_autres + ')';
    }
    content.push(pdfFicheTitreSouligne('Examen visuel de l’état des éléments de l’installation'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['État visuel des installations', etatVisuel],
      ['Ventilation naturelle permanente', formatCrosstabValue(d.ventilation_naturelle)],
      ['Asservissement', formatCrosstabValue(d.asservissement)],
      ['Type de ventilation', formatCrosstabValue(d.type_ventilation)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Taux de renouvellement'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Volume du local (m³)', formatCrosstabValue(d.volume_local)],
      ["Débit d’extraction du box (m³/h)", formatCrosstabValue(d.debit_extraction_box)],
      ['Volume par heure (vol/h)', formatCrosstabValue(d.volume_par_heure)],
      ['Débit minimal (m³/h) pour 50 volumes/heure', formatCrosstabValue(d.debit_minimal_50vh)],
      ['Conclusion — taux de renouvellement', formatCrosstabValue(d.conclusion_renouvellement)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var n = parseInt(d.nombre_captage, 10) || 0;
    if (n > 0) {
      var capCols = [['', 2200]];
      for (var i = 1; i <= n; i++) capCols.push(['Captage n°' + i, (9636 - 2200) / n]);
      content.push(pdfFicheTitreSouligne('Vitesse et débit d’extraction par captage'));
      var rowVitesse = [pdfHeaderCell('Vitesse moyenne (m/s)')];
      var rowDebit = [pdfHeaderCell('Débit mesuré (m³/h)')];
      for (var j = 1; j <= n; j++) {
        rowVitesse.push(pdfBodyCell(formatCrosstabValue(d['captage' + j + '_vitesse_moyenne']), { center: true }));
        rowDebit.push(pdfBodyCell(formatCrosstabValue(d['captage' + j + '_debit']), { center: true }));
      }
      content.push(pdfTable(capCols.map(function (c) { return PT(c[1]); }), [
        capCols.map(function (c) { return pdfHeaderCell(c[0]); }),
        rowVitesse,
        rowDebit
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis global :', formatCrosstabValue(d.avis)));
    content.push({ text: '', margin: [0, 0, 0, PT(60)] });
    content.push(pdfFicheBar('Observation'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));
    if (d.commentaire) {
      content.push({ text: '', margin: [0, 0, 0, PT(60)] });
      content.push(pdfFicheBar('Commentaire'));
      content.push(pdfFicheObservationBox(formatCrosstabValue(d.commentaire)));
    }

    for (var c = 1; c <= n; c++) {
      var p = 'captage' + c;
      if (!d[p + '_forme_conduit']) continue;
      content.push({ text: '', pageBreak: 'before' });
      var vitesseC = d[p + '_vitesse_mode'] === 'Grille de points' ? d[p + '_vitesse_moyenne'] : d[p + '_vitesse_directe'];
      content.push(pdfFicheBar('Captage n°' + c + ' — Mesure dans le conduit'));
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
        [pdfHeaderCell('Type de conduit'), pdfBodyCell(formatCrosstabValue(d[p + '_forme_conduit']))],
        [pdfHeaderCell('Température dans le conduit (°C)'), pdfBodyCell(formatCrosstabValue(d[p + '_temperature']))],
        [pdfHeaderCell('Pression statique dans le conduit (Pa)'), pdfBodyCell(formatCrosstabValue(d[p + '_pression_statique']))],
        [pdfHeaderCell('Masse volumique dans les conditions réelles (kg/m³)'), pdfBodyCell(formatCrosstabValue(d[p + '_masse_volumique']))]
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });

      var gaineLabelC = d[p + '_forme_conduit'] === 'Rectangulaire' ? 'Gaine rectangulaire' : 'Gaine circualire';
      content.push(pdfFicheBar(gaineLabelC));
      var dimRowsC = d[p + '_forme_conduit'] === 'Rectangulaire'
        ? [
            [pdfHeaderCell('Largeur (cm)'), pdfBodyCell(formatCrosstabValue(d[p + '_diametre_cote1']))],
            [pdfHeaderCell('Longueur (cm)'), pdfBodyCell(formatCrosstabValue(d[p + '_cote2']))]
          ]
        : [[pdfHeaderCell('Diamètre (cm)'), pdfBodyCell(formatCrosstabValue(d[p + '_diametre_cote1']))]];
      dimRowsC.push([pdfHeaderCell('Vitesse moyenne (m/s)'), pdfBodyCell(formatCrosstabValue(vitesseC || d[p + '_vitesse_moyenne']))]);
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], dimRowsC));

      if (d[p + '_vitesse_mode'] === 'Grille de points' && Array.isArray(d[p + '_vitesse_grid'])) {
        content.push({ text: '', margin: [0, 0, 0, PT(120)] });
        content.push(pdfFicheGrilleTable(d[p + '_vitesse_grid'], d[p + '_vitesse_nb_axes'], d[p + '_vitesse_nb_points']));
      }
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.10 — Locaux fumeurs
// ————————————————————————————————————————————
function pdfBuildAnnexeLocauxFumeurs(list, logoDataUrl) {
  var titre = 'Local fumeurs', sousTitre = 'Locaux fumeurs';
  var legal = [
    pdfLegalParagraph('RÉFÉRENTIEL', { bold: true, center: true, size: 20, after: 100 }),
    pdfLegalParagraph('Code de la santé publique — emplacements réservés aux fumeurs', { center: true, size: 18, after: 100 }),
    pdfLegalParagraph('L’avis est établi à partir d’une checklist de 21 critères réglementaires (local clos dédié, ventilation mécanique indépendante et rejetée à l’extérieur, dépression, fermetures automatiques, superficie, attestations d’entretien, signalétique). Le local est jugé Non Satisfaisant dès qu’un seul de ces critères est explicitement relevé Non Satisfaisant.', { after: 100 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;

  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Localisation', formatCrosstabValue(d.localisation)],
      ['Référence équipement', formatCrosstabValue(d.reference_equipement)],
      ['Date du contrôle', formatCrosstabValue(d.date_controle)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Dimensions'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Largeur (m)', formatCrosstabValue(d.largeur)],
      ['Longueur (m)', formatCrosstabValue(d.longueur)],
      ['Hauteur (m)', formatCrosstabValue(d.hauteur)],
      ['Surface du local (m²)', formatCrosstabValue(d.surface)],
      ['Volume du local (m³)', formatCrosstabValue(d.volume)],
      ["Superficie totale de l’établissement (m²)", formatCrosstabValue(d.surface_etablissement)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var W_CRIT = PDF_ANNEXE_CONTENT_WIDTH - PT(2200);
    function row(label, value) {
      return [pdfHeaderCell(label), pdfBodyCell(formatCrosstabValue(value), { center: true, bold: true })];
    }
    content.push(pdfFicheTitreSouligne('Checklist réglementaire (21 critères)'));
    content.push(pdfTable([W_CRIT, PT(2200)], [
      [pdfHeaderCell('Critère'), pdfHeaderCell('Avis')],
      row('1. Les emplacements réservés comme locaux fumeurs sont des salles closes, affectées à la consommation de tabac', d.critere_local_clos),
      row("2. Aucune prestation de service n’est délivrée dans la salle", d.critere_aucune_prestation),
      row("3. Prise en compte dans l’organisation qu’aucune tâche d’entretien et de maintenance ne puisse y être exécutée sans que l’air ait été renouvelé, en l’absence de tout occupant, pendant au moins une heure", d.critere_entretien_apres_renouvellement),
      row('4. Salle équipée d’un dispositif d’extraction d’air par ventilation mécanique', d.critere_ventilation_mecanique),
      row('5. Rejet d’air à l’extérieur', d.critere_rejet_exterieur),
      row('6. Rejet d’air à bonne distance des lieux de passage de personnes', d.critere_rejet_distance_passage),
      row('7. Rejet d’air à bonne distance des prises d’air frais ou des ouvertures', d.critere_rejet_distance_prises_air),
      row('8. Reprise totale (m³/h)', d.critere_reprise_totale),
      row('9. Taux de renouvellement d’air par ventilation mécanique (minimum : 10 fois le volume / h)', d.crit_renouvellement),
      row('10. La ventilation est entièrement indépendante du système de ventilation ou de climatisation d’air du bâtiment', d.critere_ventilation_independante),
      row("11. Le local est maintenu en dépression continue d’au moins cinq pascals par rapport aux pièces communicantes", d.critere_depression),
      row('12. Le local est doté de fermetures automatiques sans possibilité d’ouverture non intentionnelle', d.critere_fermetures_auto),
      row('13. La salle fumeur ne constitue pas un lieu de passage', d.critere_pas_lieu_passage),
      row('14-15. Le local présente une superficie au plus égale à 20 % de la superficie totale de l’établissement et inférieure à 35 m²', (d.crit_surface_35 === 'Non' || d.crit_ratio_20 === 'Non') ? 'Non' : ((d.crit_surface_35 === 'Oui' && d.crit_ratio_20 === 'Oui') ? 'Oui' : '')),
      row('16. L’installateur ou la personne assurant la maintenance du dispositif de ventilation mécanique atteste que celui-ci permet de respecter les exigences de ventilation', d.critere_attestation_installateur),
      row('17. Le responsable de l’établissement est tenu de produire cette attestation à l’occasion de tout contrôle : le document est en possession du chef d’établissement', d.critere_attestation_disponible),
      row('18. Le responsable de l’établissement est tenu de faire procéder à l’entretien régulier de la ventilation', d.critere_entretien_regulier),
      row('19. La mise à disposition d’un emplacement à la disposition des fumeurs et ses modalités de mise en œuvre sont soumises à la consultation du CHSCT (avant sa mise en œuvre, puis tous les 2 ans)', d.critere_consultation_chsct),
      row("20. Le panneau d’avertissement de la zone fumeur est présent", d.critere_panneau_zone_fumeur),
      row("21. Le panneau d’interdiction de fumer dans les autres zones est présent", d.critere_panneau_interdiction)
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport aux critères du code de la santé publique :', formatCrosstabValue(d.avis_csp)));
    content.push({ text: '', margin: [0, 0, 0, PT(60)] });
    content.push(pdfFicheBar('Observation'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));
  });
  return content;
}

// ————————————————————————————————————————————
// 5.11 — Gaz d'échappement
// ————————————————————————————————————————————
function pdfBuildAnnexeGazEchappement(list, logoDataUrl) {
  var titre = 'Gaz d’échappement', sousTitre = 'Captage des gaz d’échappement';
  var legal = [
    pdfLegalParagraph('REFERENTIELS', { bold: true, center: true, size: 20, after: 100 }),
    pdfLegalParagraph('Guide INRS ED6246 - Février 2021', { center: true, size: 18 }),
    pdfLegalParagraph('Prévention des expositions liées aux émissions des moteurs thermiques', { center: true, size: 18, after: 160 }),
    pdfLegalParagraph('L’Assurance Maladie / INRS', { center: true, size: 18 }),
    pdfLegalParagraph('Cahier des charges - Centres de contôle technique', { center: true, size: 18 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var typeVehiculeVal = d.type_vehicule === 'AUTRES' ? formatCrosstabValue(d.type_vehicule_autre) : formatCrosstabValue(d.type_vehicule);
    content.push(pdfFicheTitreSouligne('Type d’équipement'));
    content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
      [pdfHeaderCell('Type'), pdfBodyCell(typeVehiculeVal)],
      [pdfHeaderCell('Type de captage'), pdfBodyCell(formatCrosstabValue(d.type_captage))]
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Atelier', formatCrosstabValue(d.atelier)],
      ['Réf. de l’équipement et/ou implantation', formatCrosstabValue(d.reference_equipement)],
      ['Date du contrôle', formatCrosstabValue(d.date_controle)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var etatVisuelVal = formatCrosstabValue(d.etat_visuel_installations);
    if (Array.isArray(d.etat_visuel_installations) && d.etat_visuel_installations.indexOf('Autres') !== -1 && d.etat_visuel_si_autres) {
      etatVisuelVal += ' (' + d.etat_visuel_si_autres + ')';
    }
    content.push(pdfFicheTitreSouligne('Examen visuel de l’état des éléments de l’installation'));
    content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
      [pdfHeaderCell('Type de captage adapté à la situation'), pdfBodyCell(formatCrosstabValue(d.type_captage_adapte))],
      [pdfHeaderCell('État visuel des installations'), pdfBodyCell(etatVisuelVal)]
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(60)] });
    content.push(pdfFicheConclusionRow('Commentaire :', formatCrosstabValue(d.commentaire)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var vitesse = d.vitesse_mode === 'Grille de points' ? d.vitesse_moyenne_grille : d.vitesse;
    var cols = [
      ['Réseau d’air', 900], ['Vitesse (en m/s)', 1200], ['Débit mesuré (en m³/h)', 1400],
      ['Débit de référence (en m³/h)', 1400], ['Débit minimum préconisé INRS (en m³/h)', 1600], ['Débit minimum calculé * (en m³/h)', 1600]
    ];
    var vals = ['Extrait', formatCrosstabValue(vitesse), formatCrosstabValue(d.debit_mesure),
      formatCrosstabValue(d.debit_reference), formatCrosstabValue(d.debit_min_inrs), formatCrosstabValue(d.debit_min_calcule)];
    content.push(pdfFicheBar('Mesures de la vitesse'));
    content.push(pdfTable(cols.map(function (c) { return PT(c[1]); }), [
      cols.map(function (c) { return pdfHeaderCell(c[0]); }),
      cols.map(function (c, i) { return pdfBodyCell(vals[i], { center: true }); })
    ]));
    content.push({
      text: '*calculé à partir de la cylindrée du véhicule en litres : ' + formatCrosstabValue(d.cylindree) + ' et du régime du moteur en tours/min : ' + formatCrosstabValue(d.regime_moteur) + '.',
      italics: true, fontSize: FS(16), margin: [0, 0, 0, PT(120)]
    });

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport au débit préconisé par l’INRS :', formatCrosstabValue(d.avis_constructeur)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Observations'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));

    if (d.forme_section) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(pdfFicheBar('Mesure de la vitesse sur la surface de la bouche d’aspirationd’air extrait'));
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
        [pdfHeaderCell('Type de conduit'), pdfBodyCell(formatCrosstabValue(d.forme_section))],
        [pdfHeaderCell('Température dans le conduit (°C)'), pdfBodyCell(formatCrosstabValue(d.temperature_conduit))],
        [pdfHeaderCell('Pression statique dans le conduit (Pa)'), pdfBodyCell(formatCrosstabValue(d.pression_statique))],
        [pdfHeaderCell('Masse volumique dans les conditions réelles (kg/m³)'), pdfBodyCell(formatCrosstabValue(d.masse_volumique))]
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });

      var gaineLabel = d.forme_section === 'Rectangulaire' ? 'Gaine rectangulaire' : 'Gaine circualire';
      content.push(pdfFicheBar(gaineLabel));
      var dimRows = d.forme_section === 'Rectangulaire'
        ? [
            [pdfHeaderCell('Largeur (cm)'), pdfBodyCell(formatCrosstabValue(d.diametre_cote1))],
            [pdfHeaderCell('Longueur (cm)'), pdfBodyCell(formatCrosstabValue(d.cote2))]
          ]
        : [[pdfHeaderCell('Diamètre (cm)'), pdfBodyCell(formatCrosstabValue(d.diametre_cote1))]];
      dimRows.push([pdfHeaderCell('Vitesse moyenne (m/s)'), pdfBodyCell(formatCrosstabValue(vitesse))]);
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], dimRows));

      if (d.vitesse_mode === 'Grille de points' && Array.isArray(d.vitesse_grid)) {
        content.push({ text: '', margin: [0, 0, 0, PT(120)] });
        content.push(pdfFicheGrilleTable(d.vitesse_grid, d.vitesse_nb_axes, d.vitesse_nb_points));
      }
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.12 — Menuiserie (réseau d'aspiration)
// ————————————————————————————————————————————
function pdfBuildAnnexeMenuiserie(list, logoDataUrl) {
  var titre = 'Menuiserie', sousTitre = 'Réseau d’aspiration';
  var legal = [
    pdfLegalParagraph('RÉFÉRENTIEL', { bold: true, center: true, size: 20, after: 100 }),
    pdfLegalParagraph('Guide INRS ED6750 - Février 2011', { center: true, size: 18 }),
    pdfLegalParagraph('Seconde transformation du bois', { center: true, size: 18 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Localisation', formatCrosstabValue(d.localisation)],
      ["Référence du dispositif d’extraction", formatCrosstabValue(d.reference_equipement)],
      ['Nombre de machines reliées au dispositif', formatCrosstabValue(d.nb_machines_reliees)],
      ['Date du contrôle', formatCrosstabValue(d.date_controle)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    if (d.simultaneites) {
      content.push(pdfFicheBar('Simultanéités'));
      content.push(pdfFicheObservationBox(formatCrosstabValue(d.simultaneites)));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    var reseauForme = formatCrosstabValue(d.reseau_forme);
    if (Array.isArray(d.reseau_forme) && d.reseau_forme.indexOf('autres') !== -1 && d.reseau_forme_si_autres) {
      reseauForme += ' (' + d.reseau_forme_si_autres + ')';
    }
    content.push(pdfFicheTitreSouligne('Caractéristique du réseau'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Forme du réseau', reseauForme],
      ['Présence de trappes', formatCrosstabValue(d.presence_trappes)],
      ['Ouverture des trappes', formatCrosstabValue(d.ouverture_trappes)],
      ["Entrée d’air additionnelle extérieure", formatCrosstabValue(d.entree_air_additionnelle)],
      ['Réseau à débit', formatCrosstabValue(d.reseau_debit)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Dépoussiéreur'));
    if (d.afficher_depoussiereur === 'Oui') {
      content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
        ['Type de filtre', formatCrosstabValue(d.type_filtre)],
        ['Position', formatCrosstabValue(d.position)],
        ['État du filtre', formatCrosstabValue(d.etat_filtre)],
        ['Pertes de charge', formatCrosstabValue(d.perte_charge)]
      ])));
    } else {
      content.push(pdfFicheObservationBox('Ce dispositif ne comporte pas de dépoussiéreur.'));
    }
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Réseau d’air extrait'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Localisation de la mesure', formatCrosstabValue(d.mesure_localisation)],
      ['Débit de référence (m³/h)', formatCrosstabValue(d.valeur_reference_recommandee)],
      ['Débit année N-1 (m³/h)', formatCrosstabDebit(d.debit_annee_n1)],
      ['Débit année en cours (m³/h)', formatCrosstabDebit(d.debit_annee_en_cours)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport au débit de référence :', formatCrosstabValue(d.avis_constructeur)));
    content.push({ text: '', margin: [0, 0, 0, PT(60)] });
    content.push(pdfFicheBar('Observation'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));

    if (d.forme_section) {
      content.push({ text: '', pageBreak: 'before' });
      var vitesse = d.vitesse_mode === 'Grille de points' ? d.vitesse_moyenne_grille : d.vitesse;
      content.push(pdfFicheBar('Section de mesure'));
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
        [pdfHeaderCell('Température dans le conduit (°C)'), pdfBodyCell(formatCrosstabValue(d.temperature_conduit))],
        [pdfHeaderCell('Pression statique dans le conduit (Pa)'), pdfBodyCell(formatCrosstabValue(d.pression_statique))],
        [pdfHeaderCell('Masse volumique dans les conditions réelles (kg/m³)'), pdfBodyCell(formatCrosstabValue(d.masse_volumique))]
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });

      var gaineLabel = d.forme_section === 'Rectangulaire' ? 'Gaine rectangulaire' : 'Gaine circualire';
      content.push(pdfFicheBar(gaineLabel));
      var dimRows = d.forme_section === 'Rectangulaire'
        ? [
            [pdfHeaderCell('Largeur (cm)'), pdfBodyCell(formatCrosstabValue(d.diametre_cote1))],
            [pdfHeaderCell('Longueur (cm)'), pdfBodyCell(formatCrosstabValue(d.cote2))]
          ]
        : [[pdfHeaderCell('Diamètre (cm)'), pdfBodyCell(formatCrosstabValue(d.diametre_cote1))]];
      dimRows.push([pdfHeaderCell('Vitesse moyenne (m/s)'), pdfBodyCell(formatCrosstabValue(vitesse || d.vitesse))]);
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], dimRows));

      if (d.vitesse_mode === 'Grille de points' && Array.isArray(d.vitesse_grid)) {
        content.push({ text: '', margin: [0, 0, 0, PT(120)] });
        content.push(pdfFicheGrilleTable(d.vitesse_grid, d.vitesse_nb_axes, d.vitesse_nb_points));
      }
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.13 — Menuiserie (machines à bois)
// ————————————————————————————————————————————
function pdfBuildAnnexeMenuiserieMAB(list, logoDataUrl) {
  var titre = 'Machine à bois', sousTitre = 'Menuiserie (machines à bois)';
  var legal = [
    pdfLegalParagraph('RÉFÉRENTIEL', { bold: true, center: true, size: 20, after: 100 }),
    pdfLegalParagraph('Guide INRS ED6750 - Février 2011', { center: true, size: 18 }),
    pdfLegalParagraph('Seconde transformation du bois', { center: true, size: 18 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Référence de la machine à bois', formatCrosstabValue(d.reference_machine)],
      ['Date de contrôle', formatCrosstabValue(d.date_controle)],
      ['Type de machine à bois', formatCrosstabValue(d.type_machine)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('État visuel du réseau d’aspiration'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.etat_visuel_reseau)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    if (d.simultaneites) {
      content.push(pdfFicheBar('Simultanéités'));
      content.push(pdfFicheObservationBox(formatCrosstabValue(d.simultaneites)));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheBar('Mesure de la vitesse de transport'));
    var vCols = [['', 2400], ['Valeur mesurée', 1800], ['Valeur de référence', 1800], ['Valeur recommandée par l’INRS (ED750)', 2018], ['Avis', 1618]];
    var vVals = ['Vitesse moyenne (m/s)', formatCrosstabValue(d.vitesse_moyenne), formatCrosstabValue(d.vitesse_reference), formatCrosstabValue(d.vitesse_inrs_ed750), formatCrosstabValue(d.vitesse_avis)];
    content.push(pdfTable(vCols.map(function (c) { return PT(c[1]); }), [
      vCols.map(function (c) { return pdfHeaderCell(c[0]); }),
      [pdfHeaderCell(vVals[0])].concat(vVals.slice(1).map(function (v, i) { return pdfBodyCell(v, { center: true, bold: i === 3 }); }))
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Calcul du débit'));
    var dCols = [['', 2400], ['Valeur mesurée', 1800], ['Valeur de référence', 1800], ['Valeur recommandée par l’INRS (ED750)', 2018], ['Avis', 1618]];
    var dVals = ['Débit calculé (m³/h)', formatCrosstabValue(d.debit), formatCrosstabValue(d.debit_reference), formatCrosstabValue(d.debit_inrs_ed750), formatCrosstabValue(d.debit_avis)];
    content.push(pdfTable(dCols.map(function (c) { return PT(c[1]); }), [
      dCols.map(function (c) { return pdfHeaderCell(c[0]); }),
      [pdfHeaderCell(dVals[0])].concat(dVals.slice(1).map(function (v, i) { return pdfBodyCell(v, { center: true, bold: i === 3 }); }))
    ]));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport à la réglementation et/ou aux préconisations (dossier de valeurs de référence si existant, normes, guide INRS) :', formatCrosstabValue(d.conclusion_avis)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Observation'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));

    if (d.forme_conduit) {
      content.push({ text: '', pageBreak: 'before' });
      var vitesse = d.vitesse_mode === 'Grille de points' ? null : d.vitesse_directe;
      content.push(pdfFicheBar('Mesure de la vitesse et du débit d’air extrait'));
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
        [pdfHeaderCell('Type de conduit'), pdfBodyCell(formatCrosstabValue(d.forme_conduit))],
        [pdfHeaderCell('Température dans le conduit (°C)'), pdfBodyCell(formatCrosstabValue(d.temperature_conduit))],
        [pdfHeaderCell('Pression statique dans le conduit (Pa)'), pdfBodyCell(formatCrosstabValue(d.pression_statique))],
        [pdfHeaderCell('Masse volumique dans les conditions réelles (kg/m³)'), pdfBodyCell(formatCrosstabValue(d.masse_volumique))]
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });

      var gaineLabel = d.forme_conduit === 'Rectangulaire' ? 'Gaine rectangulaire' : 'Gaine circualire';
      content.push(pdfFicheBar(gaineLabel));
      var dimRows = d.forme_conduit === 'Rectangulaire'
        ? [
            [pdfHeaderCell('Largeur (cm)'), pdfBodyCell(formatCrosstabValue(d.diametre_cote1))],
            [pdfHeaderCell('Longueur (cm)'), pdfBodyCell(formatCrosstabValue(d.cote2))]
          ]
        : [[pdfHeaderCell('Diamètre (cm)'), pdfBodyCell(formatCrosstabValue(d.diametre_cote1))]];
      dimRows.push([pdfHeaderCell('Vitesse moyenne (m/s)'), pdfBodyCell(formatCrosstabValue(vitesse || d.vitesse_moyenne))]);
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], dimRows));

      if (d.vitesse_mode === 'Grille de points' && Array.isArray(d.vitesse_grid)) {
        content.push({ text: '', margin: [0, 0, 0, PT(120)] });
        content.push(pdfFicheGrilleTable(d.vitesse_grid, d.vitesse_nb_axes, d.vitesse_nb_points));
      }
      if (d.commentaire) {
        content.push({ text: '', margin: [0, 0, 0, PT(120)] });
        content.push(pdfFicheBar('Commentaire'));
        content.push(pdfFicheObservationBox(formatCrosstabValue(d.commentaire)));
      }
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.14 — Torches aspirantes (jusqu'à 10 points de mesure) — largeurs de colonnes rééchelonnées
// proportionnellement (somme d'origine 10336 → 9636) pour tenir dans PDF_ANNEXE_CONTENT_WIDTH,
// même correctif que le tableau Extracteur.
// ————————————————————————————————————————————
function pdfBuildAnnexeTorchesAspirantes(list, logoDataUrl) {
  var titre = 'Torche aspirante', sousTitre = 'Torches aspirantes de soudage';
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Activité et référence du local', formatCrosstabValue(d.activite_reference_local)],
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Date du contrôle', formatCrosstabValue(d.date_controle)],
      ["Réf. de l’équipement", formatCrosstabValue(d.reference_equipement)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var cols = [
      ['Point de mesure', 1305], ['Diamètre tube (mm)', 886], ['Vitesse au centre (m/s)', 886],
      ['Débit (m³/h)', 839], ['Valeur de référence (m³/h)', 979], ['Écart (%)', 699],
      ['Distance L (mm)', 839], ["Vitesse au point d’émission (m/s)", 979], ['Valeur préconisée (m/s)', 886], ['Constat', 1339]
    ];
    var rows = [cols.map(function (c) { return pdfHeaderCell(c[0]); })];
    for (var i = 1; i <= 10; i++) {
      var p = 'torche' + i;
      if (!d[p + '_point_mesure'] && d[p + '_debit'] === undefined) continue;
      var vals = [d[p + '_point_mesure'], d[p + '_diametre_tube'], d[p + '_vitesse_centre'], d[p + '_debit'],
        d[p + '_valeur_reference'], d[p + '_ecart_pct'], d[p + '_distance_l'], d[p + '_vitesse_point_emission'],
        d[p + '_valeur_preconisee'], d[p + '_constat']];
      rows.push(cols.map(function (c, ci) { return pdfBodyCell(formatCrosstabValue(vals[ci]), { center: true, bold: ci === 9 }); }));
    }
    if (rows.length > 1) {
      content.push(pdfFicheTitreSouligne('Points de mesure'));
      content.push(pdfTable(cols.map(function (c) { return PT(c[1]); }), rows));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Total débit (m³/h) :', formatCrosstabValue(d.total_debit)));
    content.push(pdfFicheConclusionRow('Avis par rapport aux valeurs de référence :', formatCrosstabValue(d.note_reference)));
    if (d.commentaire) {
      content.push({ text: '', margin: [0, 0, 0, PT(60)] });
      content.push(pdfFicheBar('Commentaire'));
      content.push(pdfFicheObservationBox(formatCrosstabValue(d.commentaire)));
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.15 — TTS (Traitement de surface)
// ————————————————————————————————————————————
function pdfBuildAnnexeTTS(list, logoDataUrl) {
  var titre = 'TTS', sousTitre = 'Traitement de surface';
  var legal = [
    pdfLegalParagraph('RÉFÉRENTIEL', { bold: true, center: true, size: 20, after: 100 }),
    pdfLegalParagraph('Guide INRS ED651 - Cuves et bains de traitement de surface', { center: true, size: 18 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Activité et référence du local', formatCrosstabValue(d.activite_reference_local)],
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Date de mesure', formatCrosstabValue(d.date_mesure)],
      ["Réf. de l’équipement et/ou implantation", formatCrosstabValue(d.reference_equipement)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var etatVisuel = formatCrosstabValue(d.etat_visuel_aspiration);
    if (Array.isArray(d.etat_visuel_aspiration) && d.etat_visuel_aspiration.indexOf('Autres') !== -1 && d.etat_visuel_si_autres) {
      etatVisuel += ' (' + d.etat_visuel_si_autres + ')';
    }
    content.push(pdfFicheTitreSouligne('Aspiration'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ["Type d’aspiration", formatCrosstabValue(d.aspiration_type)],
      ["État visuel de l’aspiration", etatVisuel],
      ['Test fumigène', formatCrosstabValue(d.test_fumigene)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Procédé'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Famille', formatCrosstabValue(d.procede_famille)],
      ['Type', formatCrosstabValue(d.procede_type)],
      ['Constituants dangereux', formatCrosstabValue(d.procede_constituants)],
      ["Conditions d’utilisation", formatCrosstabValue(d.procede_conditions)],
      ['Niveau vitesse de captage (V1 à V4)', formatCrosstabValue(d.procede_niveau_vitesse)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Caractéristiques de la cuve'));
    var cuveRows = [
      ['Type de ventilation', formatCrosstabValue(d.type_ventilation)],
      ['Type de cuve', formatCrosstabValue(d.type_cuve)],
      ['Forme de cuve', formatCrosstabValue(d.forme_cuve)],
      ['a / b / n (coefficients INRS)', formatCrosstabValue(d.coef_a) + ' / ' + formatCrosstabValue(d.coef_b) + ' / ' + formatCrosstabValue(d.coef_n)]
    ];
    if (d.forme_cuve === 'Circulaire') {
      cuveRows.push(['Diamètre de la cuve (m)', formatCrosstabValue(d.diametre_cuve)]);
    } else {
      cuveRows.push(['Longueur L (m)', formatCrosstabValue(d.longueur_l)]);
      cuveRows.push(['Largeur W (m)', formatCrosstabValue(d.largeur_l)]);
    }
    cuveRows.push(['Surface de la cuve (m²)', formatCrosstabValue(d.surface_cuve)]);
    cuveRows.push(['Surface des ouvertures So (m²)', formatCrosstabValue(d.surface_ouvertures)]);
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows(cuveRows)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheTitreSouligne('Débits'));
    var debitRows = [
      ['Vitesse de captage V (m/s)', formatCrosstabValue(d.vitesse)],
      ['Débit calculé Qr ou Qc (m³/h)', formatCrosstabValue(d.debit_calcule)],
      ['Débit Qr/10 ou Qc/10 (m³/h)', formatCrosstabValue(d.debit_qr10)]
    ];
    if (['Aspiration sous couvercle', 'Aspiration enveloppante', 'Aspiration tunnel'].indexOf(d.aspiration_type) !== -1) {
      debitRows.push(['Débit So × V (m³/h)', formatCrosstabValue(d.debit_so)]);
    }
    debitRows.push(['Débit minimum préconisé INRS (m³/h)', formatCrosstabValue(d.debit_min_inrs)]);
    debitRows.push(['Débit mesuré (m³/h)', formatCrosstabValue(d.debit_mesure)]);
    debitRows.push(['Débit de référence (m³/h)', formatCrosstabValue(d.debit_reference)]);
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows(debitRows)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport aux valeurs de référence :', formatCrosstabValue(d.avis)));
    content.push({ text: '', margin: [0, 0, 0, PT(60)] });
    content.push(pdfFicheBar('Observation'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));

    if (Array.isArray(d.mesure_mode) && d.mesure_mode.indexOf('Mesure dans les ouvertures') !== -1) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(pdfFicheTitreSouligne('Mesure dans les fentes'));
      content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
        ['Nombre de fentes', formatCrosstabValue(d.nb_fentes)],
        ['Longueur de la fente (m)', formatCrosstabValue(d.longueur_fente)],
        ['Largeur de la fente (m)', formatCrosstabValue(d.largeur_fente)],
        ["Surface totale d’aspiration (m²)", formatCrosstabValue(d.surface_totale_fentes)],
        ['Vitesse (m/s)', formatCrosstabValue(d.vitesse_fentes)],
        ['Débit mesuré (m³/h)', formatCrosstabValue(d.debit_mesure_fentes)],
        ['Débit de référence (m³/h)', formatCrosstabValue(d.debit_reference_fentes)],
        ['Avis par rapport à la valeur de référence', formatCrosstabValue(d.avis_fentes)]
      ])));
    }

    if (Array.isArray(d.mesure_mode) && d.mesure_mode.indexOf('Mesure dans le conduit') !== -1) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(pdfFicheTitreSouligne('Mesure dans le conduit'));
      content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
        ['Gaine', formatCrosstabValue(d.gaine)],
        ['Température dans le conduit (°C)', formatCrosstabValue(d.temperature_conduit)],
        ['Pression statique dans le conduit (Pa)', formatCrosstabValue(d.pression_statique)],
        ['Masse volumique dans les conditions réelles (kg/m³)', formatCrosstabValue(d.masse_volumique)]
      ])));
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.16 — Installations diverses / captage localisé (équipements)
// ————————————————————————————————————————————
function pdfBuildAnnexeInstallationsDiverses(list, logoDataUrl) {
  var titre = 'Équipement', sousTitre = 'Installations avec captage localisé';
  var legal = [
    pdfLegalParagraph('Méthodologie de vérification de la ventilation d’équipements divers', { bold: true, center: true, size: 20, after: 120 }),
    pdfLegalParagraph('Tests réalisés :', { size: 18, after: 40 }),
    pdfLegalParagraph('mesure de la vitesse de transport et comparaison avec les valeurs indiquées par le guide INRS ED 695', { size: 18, after: 40 }),
    pdfLegalParagraph('mesure de la vitesse au point d’émission et comparaison avec les valeurs indiquées par le guide INRS ED 695', { size: 18 })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200);
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Activité et référence du local', formatCrosstabValue(d.localisation)],
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Type d’installation', formatCrosstabValue(d.type_installation)],
      ['Date du contrôle', formatCrosstabValue(d.date_controle)],
      ['Réf. de l’équipement et/ou implantation', formatCrosstabValue(d.reference_equipement)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('État visuel du réseau d’aspiration'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.etat_visuel_reseau)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Test fumigène'));
    content.push(pdfFicheConclusionRow('Observation', formatCrosstabValue(d.test_fumigene)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var choix = d.mesures_choisies || [];
    var avecVt = choix.indexOf('Vitesse de transport') !== -1;
    if (choix.indexOf('Vitesse au point d’émission') !== -1 || choix.indexOf("Vitesse au point d'émission") !== -1) {
      var W = [2400, 1500, 1500, 1900, 1618, 1718];
      var avisTxt = formatCrosstabValue(d.avis_vpe);
      content.push(pdfFicheBar('Mesure de la vitesse au point d’émission'));
      content.push(pdfTable(W.map(PT), [
        [pdfHeaderCell(''), pdfHeaderCell('Valeur mesurée'), pdfHeaderCell('Valeur de référence'), pdfHeaderCell('Condition de dispersion du polluant'), pdfHeaderCell('Valeur recommandée par l’INRS (ED 695)'), pdfHeaderCell('Avis par rapport aux valeurs de référence')],
        [
          pdfHeaderCell('Vitesse (m/s)'),
          pdfBodyCell(formatCrosstabValue(d.vpe_mesuree), { center: true }),
          pdfBodyCell(formatCrosstabValue(d.vpe_reference), { center: true }),
          pdfBodyCell(formatCrosstabValue(d.vpe_conditions_dispersion), { center: true }),
          pdfBodyCell(formatCrosstabValue(d.vpe_inrs), { center: true }),
          pdfBodyCell(avisTxt, { center: true, bold: true })
        ]
      ]));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }
    if (avecVt) {
      content.push(pdfFicheVtTable(d));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport aux valeurs de référence :', formatCrosstabValue(d.avis)));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    content.push(pdfFicheBar('Observations'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));
    if (d.remarque) {
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
      content.push(pdfFicheBar('Commentaire / Information'));
      content.push(pdfFicheObservationBox(formatCrosstabValue(d.remarque)));
    }

    if (avecVt && (d.temperature_conduit || d.pression_statique || d.masse_volumique || d.gaine)) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(pdfFicheBar('Mesure de la vitesse de transport d’air extrait'));
      content.push(pdfTable([PT(4200), PDF_ANNEXE_CONTENT_WIDTH - PT(4200)], [
        [pdfHeaderCell('Gaine'), pdfBodyCell(formatCrosstabValue(d.gaine))],
        [pdfHeaderCell('Température dans le conduit (°C)'), pdfBodyCell(formatCrosstabValue(d.temperature_conduit))],
        [pdfHeaderCell('Pression statique dans le conduit (Pa)'), pdfBodyCell(formatCrosstabValue(d.pression_statique))],
        [pdfHeaderCell('Masse volumique dans les conditions réelles (kg/m³)'), pdfBodyCell(formatCrosstabValue(d.masse_volumique))]
      ]));
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.17 — Locaux de charge d'accumulateurs — grille de mesures rééchelonnée
// proportionnellement (somme d'origine 10340 → 9635) pour tenir dans PDF_ANNEXE_CONTENT_WIDTH.
// ————————————————————————————————————————————
function pdfBuildAnnexeLocauxCharge(list, logoDataUrl) {
  var titre = 'Local de charge', sousTitre = 'Locaux de charge d’accumulateurs';
  var legal = [
    pdfLegalParagraph('RÉFÉRENTIELS', { bold: true, center: true, size: 20, after: 100 }),
    pdfLegalParagraph('Guide INRS ED6120 - Avril 2018 : Charge des batteries d’accumulateurs au plomb', { center: true, size: 18 }),
    pdfLegalParagraph('Norme NF EN 62485-3 - Janvier 2015 : Exigences de sécurité pour les batteries d’accumulateurs et les installations de batteries', { center: true, size: 18 }),
    pdfLegalParagraph('Locaux concernés : locaux de charge de batteries de traction au plomb', { center: true, size: 18, italics: true })
  ];
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  content = content.concat(legal);
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var identTable = pdfTable([W_LABEL, W_IDENT - W_LABEL], pdfFicheIdentRows([
      ['Localisation', formatCrosstabValue(d.localisation)],
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Date de contrôle', formatCrosstabValue(d.date_controle)],
      ["Réf. de l’équipement", formatCrosstabValue(d.reference_equipement)]
    ]));
    content.push(pdfFicheTwoCol(identTable, pdfFichePhotoBox(d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var etatVisuel = formatCrosstabValue(d.etat_visuel);
    if (Array.isArray(d.etat_visuel) && d.etat_visuel.indexOf('Autres') !== -1 && d.si_autre) {
      etatVisuel += ' (' + d.si_autre + ')';
    }
    content.push(pdfFicheTitreSouligne('Ventilation'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Ventilation permanente', formatCrosstabValue(d.ventilation_permanente)],
      ['Ventilation asservie aux chargeurs', formatCrosstabValue(d.ventilation_asservie)],
      ['Débit variable', formatCrosstabValue(d.debit_variable)],
      ['Réglage du variateur', formatCrosstabValue(d.reglage_variateur)],
      ['État visuel des installations', etatVisuel]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    var chargeurs = Array.isArray(d.chargeurs) ? d.chargeurs : [];
    if (chargeurs.length > 0) {
      content.push(pdfFicheTitreSouligne('Calcul du débit nécessaire (chargeurs — guide INRS)'));
      var chCols = [['Nb', 1200], ['Tension de sortie (V)', 2600], ['Courant de sortie (A)', 2600], ['Débit (m³/h)', 2436]];
      var chRows = [chCols.map(function (c) { return pdfHeaderCell(c[0]); })];
      chargeurs.forEach(function (c) {
        var vals = [c.nb, c.tension, c.courant, (typeof chargerDebit === 'function') ? chargerDebit(c) : ''];
        chRows.push(chCols.map(function (col, i) { return pdfBodyCell(formatCrosstabValue(vals[i]), { center: true }); }));
      });
      content.push(pdfTable(chCols.map(function (c) { return PT(c[1]); }), chRows));
      content.push({ text: '', margin: [0, 0, 0, PT(60)] });
      content.push(pdfFicheConclusionRow('Débit recommandé par le guide INRS (m³/h) :', formatCrosstabValue(d.valeur_inrs)));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    var grilleRows = [];
    for (var i = 1; i <= 10; i++) {
      var p = 'grille' + i;
      if (d[p + '_largeur'] === undefined && d[p + '_diametre'] === undefined && d[p + '_valeur_mesuree'] === undefined) continue;
      grilleRows.push([i, d[p + '_largeur'], d[p + '_longueur'], d[p + '_diametre'], d[p + '_debit_cone'], d[p + '_valeur_mesuree'], d[p + '_debit_obtenu']]);
    }
    if (grilleRows.length > 0) {
      content.push(pdfFicheTitreSouligne('Calcul du débit (mesure sur les grilles)'));
      var glCols = [['N°', 652], ['Largeur (cm)', 1398], ['Longueur (cm)', 1398], ['Diamètre (cm)', 1398], ["Débit mesuré au cône (m³/h)", 1727], ['Valeur mesurée (m/s)', 1398], ['Débit obtenu (m³/h)', 1664]];
      var glRows = [glCols.map(function (c) { return pdfHeaderCell(c[0]); })];
      grilleRows.forEach(function (r) {
        glRows.push(glCols.map(function (c, i) { return pdfBodyCell(formatCrosstabValue(r[i]), { center: true }); }));
      });
      content.push(pdfTable(glCols.map(function (c) { return PT(c[1]); }), glRows));
      content.push({ text: '', margin: [0, 0, 0, PT(120)] });
    }

    content.push(pdfFicheTitreSouligne('Mesure du débit'));
    content.push(pdfTable([W_LABEL, PDF_ANNEXE_CONTENT_WIDTH - W_LABEL], pdfFicheIdentRows([
      ['Valeur de référence (m³/h)', formatCrosstabValue(d.valeur_reference)],
      ['Débit mesuré du local (m³/h)', formatCrosstabValue(d.debit_mesure_local)]
    ])));
    content.push({ text: '', margin: [0, 0, 0, PT(120)] });

    content.push(pdfFicheBar('Conclusion'));
    content.push(pdfFicheConclusionRow('Avis par rapport aux valeurs de référence :', formatCrosstabValue(d.avis)));
    content.push({ text: '', margin: [0, 0, 0, PT(60)] });
    content.push(pdfFicheBar('Observation'));
    content.push(pdfFicheObservationBox(formatCrosstabValue(d.observation)));
  });
  return content;
}

console.log('✓ Export PDF (fondations) chargé');
