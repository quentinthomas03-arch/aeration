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

// Mise en page alignée sur le PDF Rapso réel (comparaison page à page du 2026-10-03, rapport EMFI
// Haguenau) : marges étroites, zone utile de 540 pt (x = 27 à 567) au lieu des 481,8 pt (9636 twips)
// de l'ancien gabarit Word. Toutes les largeurs exprimées en twips sont mises à l'échelle par PT() ;
// PTR() garde l'échelle d'origine pour la page de garde, qui conserve les marges larges du Rapso.
var PDF_PAGE_MARGINS = [27, 43, 28, 48];
var PDF_SCALE = 540 / (9636 / 20);
function PT(twips) { return twips / 20 * PDF_SCALE; }
function PTR(twips) { return twips / 20; }
function FS(halfPoints) { return halfPoints / 2; }

var PDF_BLUE = '#000000';
var PDF_ACCENT = '#00ACE8';
var PDF_NAVY = '#005399';
var PDF_TABLE_HEADER_BLUE = '#0082DE';
var PDF_DIVIDER_BLUE = '#0082D1';   // bandeau des pages intercalaires de section (Rapso)
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
var PDF_ANNEXE_CONTENT_WIDTH = 540;
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
    paddingTop: function () { return 3; },
    paddingBottom: function () { return 3; }
  };
}

// widths: tableau de largeurs en points ('*' autorisé). body: tableau de lignes (chaque ligne = tableau
// de cellules, avec des {} pour les emplacements couverts par un colSpan précédent — convention pdfmake).
function pdfTable(widths, body, opts) {
  opts = opts || {};
  // pdfmake AJOUTE le padding (2 + 2) et le trait (0,5) à chaque largeur déclarée : on les retire ici
  // pour que la somme des largeurs corresponde à la largeur réellement occupée sur la page (cf.
  // commentaire de PDF_ANNEXE_CONTENT_WIDTH). Sans bordure, pdfmake n'ajoute que son padding interne.
  var inset = opts.noBorders ? 0 : 4.5;
  widths = widths.map(function (w) { return typeof w === 'number' ? Math.max(1, w - inset) : w; });
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
  var c = { text: text, bold: !!opts.bold, fontSize: opts.size || 9.5, color: '#FFFFFF', fillColor: PDF_TABLE_HEADER_BLUE, alignment: opts.left ? 'left' : 'center' };
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

// Nombre "pur" stocké avec un point (ex. "0.4418") -> virgule, comme le Rapso. Ne touche ni aux
// textes mixtes ("14.4 cm"), ni aux dates.
function pdfFrNumber(text) {
  return (typeof text === 'string' && /^-?\d+\.\d+$/.test(text)) ? text.replace('.', ',') : text;
}

function pdfBodyCell(text, opts) {
  opts = opts || {};
  var c = { text: pdfFrNumber(text), fontSize: opts.size || 9.5, bold: !!opts.bold, color: opts.color || '#000000', alignment: opts.center ? 'center' : 'left' };
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
  var H = function (t, extra) { return Object.assign({ text: t, bold: true, fontSize: 10, color: '#FFFFFF', fillColor: PDF_ACCENT, alignment: 'center' }, extra || {}); };
  var C = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [2, 10, 2, 10] }, extra || {}); };
  var body = [
    [H('Nature du document', { rowSpan: 2, margin: [0, 18, 0, 0] }), H('Transmis ou disponible sur site', { colSpan: 2, margin: [0, 6, 0, 2] }), {}, H('Commentaire', { rowSpan: 2, margin: [0, 18, 0, 0] })],
    [{}, H('Oui'), H('Non'), {}]
  ];
  (documents || []).forEach(function (doc) {
    body.push([C(doc.label), C(doc.transmis === 'Oui' ? 'X' : ''), C(doc.transmis === 'Non' ? 'X' : ''), C(doc.commentaire || '-')]);
  });
  return pdfTable([200, 46, 46, 248], body);
}

function pdfVerticalHeader(text) {
  return { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="58"><text x="0" y="0" transform="translate(18,56) rotate(-90)" fill="#FFFFFF" font-family="Arial" font-weight="bold" font-size="10">' + text + '</text></svg>', width: 28, height: 58, alignment: 'center' };
}

function pdfNoticeTable(notice, observations) {
  var H = function (t, extra) { return Object.assign({ text: t, bold: true, fontSize: 10, color: '#FFFFFF', fillColor: PDF_ACCENT, alignment: 'center' }, extra || {}); };
  var C = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [2, 10, 2, 10] }, extra || {}); };
  var X = function (on) { return C(on ? 'X' : '', { fillColor: PDF_LIGHT, bold: true }); };
  var body = [[H('Article', { margin: [0, 24, 0, 0] }), H('Conformité à l\'article R.4222-21 du code du travail', { margin: [0, 10, 0, 0] }),
    Object.assign(pdfVerticalHeader('Présence'), { fillColor: PDF_ACCENT }), Object.assign(pdfVerticalHeader('Absence'), { fillColor: PDF_ACCENT }),
    Object.assign(pdfVerticalHeader('Sans objet'), { fillColor: PDF_ACCENT }), H('Commentaire', { margin: [0, 24, 0, 0] })]];
  (notice || []).forEach(function (n, i) {
    body.push([C(i === 0 ? 'R4222-21' : ''), C(n.label, { bold: true }), X(n.presence === 'Présence'), X(n.presence === 'Absence'), X(n.presence === 'Sans objet'), C(n.commentaire || '-')]);
  });
  body.push([{ text: 'Observations', bold: true, fontSize: 8.5, color: '#FFFFFF', fillColor: PDF_ACCENT, colSpan: 6 }, {}, {}, {}, {}, {}]);
  body.push([{ text: observations || '-', fontSize: 9.5, colSpan: 6, margin: [2, 14, 2, 14] }, {}, {}, {}, {}, {}]);
  return pdfTable([58, 122, 36, 36, 36, 252], body);
}

// Tableau de synthèse au format PAYSAGE, géométrie relevée sur le Rapso réel (2026-10-03) : 782 pt
// de large, colonnes d'identification sur 347 pt (3 × ~116), avis 184 pt, commentaire 251 pt ;
// bandeau titre bleu marine 12 pt gras, en-têtes 11 pt normaux, corps 10 pt, avis = fond coloré.
function pdfSyntheseTable(cfg, list) {
  var headers = [{ text: cfg.col1Label, key: cfg.col1 }];
  if (cfg.col2) headers.push({ text: cfg.col2Label, key: cfg.col2 });
  if (cfg.col3) headers.push({ text: cfg.col3Label, key: cfg.col3 });
  var idCount = headers.length;
  headers.push({ text: 'Avis par rapport aux valeurs recommandées', key: cfg.avis, isAvis: true });
  headers.push({ text: 'Commentaire', key: cfg.commentaire, isComment: true });
  var widths = headers.map(function (h) { return h.isAvis ? 184 : (h.isComment ? 251 : 347 / idCount); });

  var body = [];
  body.push([{ text: cfg.titre, bold: true, fontSize: 12, color: '#FFFFFF', fillColor: PDF_NAVY, alignment: 'center', margin: [0, 4, 0, 4], colSpan: headers.length }]
    .concat(pdfSpanFillers(headers.length)));
  body.push(headers.map(function (h) {
    return { text: h.text, fontSize: 11, color: '#FFFFFF', fillColor: PDF_TABLE_HEADER_BLUE, alignment: 'center', margin: [0, 6, 0, 6] };
  }));
  list.forEach(function (inst) {
    var nc = inst.data && inst.data._nonControle; // installation non contrôlée (js/qualite.js)
    body.push(headers.map(function (h) {
      var val = h.key ? inst.data[h.key] : undefined;
      if (nc && h.isAvis) val = 'Non contrôlée';
      if (nc && h.isComment) val = 'Motif : ' + nc.motif + (nc.precision ? ' (' + nc.precision + ')' : '');
      var text = (val === undefined || val === null || val === '') ? '-' : String(val);
      if (h.isAvis) return pdfBodyCell(text, { center: true, size: 10, fill: pdfAvisColor(text) });
      return pdfBodyCell(text, { center: !h.isComment, size: 10 });
    }));
  });
  // headerRows + keepWithHeaderRows : jamais de bandeau titre orphelin en bas de page.
  var t = pdfTable(widths, body, { margin: [0, 0, 0, 22], headerRows: 2 });
  t.table.keepWithHeaderRows = 1;
  t.table.dontBreakRows = true;
  t.layout.paddingTop = function () { return 1; };
  t.layout.paddingBottom = function () { return 1; };
  t.layout.hLineColor = function () { return '#00AFEF'; };
  t.layout.vLineColor = function () { return '#00AFEF'; };
  return t;
}

// ————————————————————————————————————————————
// Annexes : en-tête de page, tableau croisé (colonnes = installations)
// ————————————————————————————————————————————

function pdfAnnexePageHeader(titre, sousTitre, logoDataUrl) {
  var W_LOGO = 50, W_BAR = PDF_ANNEXE_CONTENT_WIDTH - W_LOGO;
  var logoCell = logoDataUrl ? { image: logoDataUrl, width: 41, height: 38, margin: [3, 0, 0, 0] } : { text: '' };
  var barCell = {
    fillColor: PDF_TABLE_HEADER_BLUE,
    margin: [0, 6, 0, 6],
    stack: [
      { text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, fontSize: 10, color: '#FFFFFF', alignment: 'center' },
      { text: sousTitre, bold: true, fontSize: 9, color: '#FFFFFF', alignment: 'center', margin: [0, 2, 0, 0] }
    ]
  };
  return {
    table: { widths: [W_LOGO - 4, W_BAR - 4], body: [[logoCell, barCell]] },
    layout: { hLineWidth: function () { return 0; }, vLineWidth: function () { return 0; },
      paddingLeft: function () { return 0; }, paddingRight: function () { return 0; },
      paddingTop: function () { return 0; }, paddingBottom: function () { return 0; } },
    margin: [0, 0, 0, 12]
  };
}

// Page intercalaire de section (5.1 à 5.9) : photo(s) à gauche, bandeau plein hauteur à droite. Le
// texte pivoté (bas -> haut) du PDF de référence est reproduit en SVG, pdfmake ne supportant pas la
// rotation de texte nativement.
function pdfSectionDividerPage(titre, imgDataUrls, sommaireHeading, group) {
  var out = [];
  if (sommaireHeading) {
    // Entrée de sommaire (5.x) : ancrée ici pour que la table des matières pointe sur cette page,
    // texte visuellement quasi invisible (blanc, taille 1) - fidèle à l'esprit du PDF de référence.
    out.push(pdfTocMarker(sommaireHeading, 2));
  }
  // Positions relevées sur le PDF Rapso réel (page intercalaire "Locaux à pollution non spécifique") :
  // bandeau x 464 -> 567, y 43 -> 795 ; photos d'environ 232 × 160 pt, la 1re en haut à gauche, la 2e
  // décalée vers la droite plus bas. absolutePosition : indépendant du flux, comme dans le Rapso.
  var photos = (imgDataUrls || []).filter(Boolean);
  var POS = (group && group.divPhotos) || [{ x: 57, y: 213, w: 231, h: 162 }, { x: 103, y: 499, w: 233, h: 157 }];
  photos.slice(0, POS.length).forEach(function (url, i) {
    out.push({ image: url, fit: [POS[i].w, POS[i].h], absolutePosition: { x: POS[i].x, y: POS[i].y } });
  });
  var BAR_W = 103, BAR_H = 752;
  var sousLignes = (group && group.divTitres) || [titre];
  var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  var barSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + BAR_W + '" height="' + BAR_H + '">' +
    '<rect width="' + BAR_W + '" height="' + BAR_H + '" fill="' + PDF_DIVIDER_BLUE + '"/>' +
    '<text x="0" y="0" text-anchor="middle" transform="translate(48,' + (BAR_H / 2) + ') rotate(-90)" fill="#FFFFFF" font-family="Arial" font-weight="bold" font-size="24">AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL</text>' +
    sousLignes.map(function (ligne, i) {
      return '<text x="0" y="0" text-anchor="middle" transform="translate(' + (sousLignes.length > 1 ? 74 + i * 24 : 79) + ',' + (BAR_H / 2) + ') rotate(-90)" fill="#FFFFFF" font-family="Arial" font-weight="bold" font-size="' + (sousLignes.length > 1 ? 21 : 22) + '">' + esc(ligne) + '</text>';
    }).join('') +
    '</svg>';
  out.push({ svg: barSvg, width: BAR_W, height: BAR_H, absolutePosition: { x: 464, y: 43 } });
  // Encadré de référentiels de l'intercalaire (gaz, menuiserie, box, locaux de charge), comme le Rapso.
  if (group && group.divNote) {
    var n = group.divNote;
    out.push({ table: { widths: [n.w - 8], body: [[{ fillColor: '#F1F2F1', margin: [26, 10, 10, 10], stack: n.lines.map(function (l, i) {
      return { text: l || ' ', fontSize: 10.5, decoration: i === 0 ? 'underline' : undefined };
    }) }]] }, layout: 'noBorders', absolutePosition: { x: n.x, y: n.y } });
  }
  // Le flux de la page doit contenir au moins un élément non absolu pour que la page existe.
  out.push({ text: ' ', fontSize: 1 });
  return out;
}

// Tableau croisé (bureaux, sanitaires...) d'après le Rapso réel : colonne de libellés bleue (texte
// normal, aligné à gauche) sur toute la hauteur ; dans le bloc d'identification ce sont les VALEURS
// qui sont sur fond gris (#7F807F, texte blanc) ; bandeaux de sous-section bleu marine.
var PDF_CROSSTAB_LABEL_W = 129, PDF_CROSSTAB_COL_W = 77;

var PDF_CROSSTAB_IDENTITY_KEYS = { batiment: true, reference_local: true, repere: true, type_local: true, nom_usage: true };

function pdfCrosstabRows(rows, group) {
  var out = [];
  rows.forEach(function (r) {
    var inIdentityBlock = !!PDF_CROSSTAB_IDENTITY_KEYS[r.key];
    if (r.subheader) {
      out.push([{ text: r.subheader, bold: true, fontSize: 11, color: '#FFFFFF', fillColor: PDF_NAVY, alignment: 'center', colSpan: group.length + 1 }]
        .concat(pdfSpanFillers(group.length + 1)));
      return;
    }
    var row = [{ text: r.label, bold: true, fontSize: 10, color: '#FFFFFF', fillColor: PDF_ACCENT, margin: [6, 4, 0, 4] }];
    group.forEach(function (inst) {
      var val = formatCrosstabValue(inst.data[r.key]);
      var c = pdfBodyCell(val, { center: true, size: 9, bold: !!r.isAvis });
      c.margin = [0, 4, 0, 4];
      if (inIdentityBlock) { c.fillColor = '#7F807F'; c.color = '#FFFFFF'; }
      row.push(c);
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
    // Largeurs fixes du Rapso (libellés 129 pt, 77 pt par local), quel que soit le nombre de locaux.
    var widths = [PDF_CROSSTAB_LABEL_W].concat(group.map(function () { return PDF_CROSSTAB_COL_W; }));
    content.push(pdfTable(widths, pdfCrosstabRows(rows, group)));
  }
  return content;
}

// ————————————————————————————————————————————
// "Fiche équipement" (une page par installation, avec photo)
// ————————————————————————————————————————————

// Lignes serrées (padding vertical 1 pt) pour les fiches qui reproduisent des maquettes Rapso denses.
function pdfTight(t) {
  t.layout.paddingTop = function () { return 1; };
  t.layout.paddingBottom = function () { return 1; };
  return t;
}

// Schéma "Mesure dans le plan d'ouverture" d'une hotte, dessiné comme dans le Rapso (EMFI Haguenau
// p. 64) : cadre, une case par point (valeur mesurée), cotes en hauteur (à gauche, du bas vers le
// haut) et en largeur (en bas). La ligne 0 de vpe_grid est la plus basse (1re position en hauteur).
function pdfHottePlanSvg(d) {
  var nbH = Math.min(parseInt(d.vpe_nb_points_hauteur, 10) || 0, 5), nbL = Math.min(parseInt(d.vpe_nb_points_largeur, 10) || 0, 5);
  if (!nbH || !nbL) return null;
  var H = parseFloat(String(d.vpe_hauteur_cm || '').replace(',', '.')), Lg = parseFloat(String(d.vpe_largeur_cm || '').replace(',', '.'));
  var esc = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  var fmt = function (x) { return (Math.round(x * 10) / 10).toFixed(1); };
  var W = 540, X0 = 154, ROW = 39, TOP = 14, BOX_W = 51, BOX_H = 26, COL = 77, BX0 = 180;
  var frameBottom = TOP + nbH * ROW;
  var dimTop = frameBottom + 20, h = dimTop + nbL * 12 + 6;
  var out = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + h + '">'];
  out.push('<path d="M' + X0 + ' ' + (frameBottom + 2) + ' V0 H' + W + ' M' + X0 + ' ' + (frameBottom + 2) + ' H' + W + '" stroke="#000" stroke-width="1" fill="none"/>');
  for (var r = 0; r < nbH; r++) {
    var y = frameBottom - (r + 1) * ROW + (ROW - BOX_H) / 2;   // r = 0 en bas
    var cy = y + BOX_H / 2;
    out.push('<line x1="' + (X0 - 26) + '" y1="' + cy + '" x2="' + BX0 + '" y2="' + cy + '" stroke="' + PDF_TABLE_HEADER_BLUE + '" stroke-width="1.5" stroke-dasharray="6,3,2,3"/>');
    for (var c = 0; c < nbL; c++) {
      var x = BX0 + c * COL;
      var g = d.vpe_grid && d.vpe_grid[r] && d.vpe_grid[r][c];
      out.push('<rect x="' + x + '" y="' + y + '" width="' + BOX_W + '" height="' + BOX_H + '" fill="#FFFFFF" stroke="#000" stroke-width="0.75"/>');
      out.push('<text x="' + (x + BOX_W / 2) + '" y="' + (cy + 4) + '" text-anchor="middle" font-family="Arial" font-size="10">' + esc(pdfFrNumber((g === undefined || g === '') ? '-' : String(g))) + '</text>');
    }
    // cote en hauteur : flèche verticale du bas du cadre jusqu'à la ligne, libellé pivoté
    var ax = X0 - 26 * (r + 1);
    out.push('<line x1="' + ax + '" y1="' + (frameBottom + 2) + '" x2="' + ax + '" y2="' + cy + '" stroke="#9DC3E6" stroke-width="0.75"/>');
    if (!isNaN(H)) out.push('<text x="0" y="0" text-anchor="middle" transform="translate(' + (ax - 4) + ',' + ((frameBottom + cy) / 2) + ') rotate(-90)" font-family="Arial" font-size="9">' + fmt((r + 0.5) * H / nbH) + ' cm</text>');
  }
  for (var c2 = 0; c2 < nbL; c2++) {
    var cx = BX0 + c2 * COL + BOX_W / 2, yy = dimTop + c2 * 12;
    out.push('<line x1="' + cx + '" y1="' + (frameBottom - (ROW - BOX_H) / 2) + '" x2="' + cx + '" y2="' + yy + '" stroke="' + PDF_TABLE_HEADER_BLUE + '" stroke-width="1.5" stroke-dasharray="6,3"/>');
    out.push('<line x1="' + X0 + '" y1="' + yy + '" x2="' + cx + '" y2="' + yy + '" stroke="#9DC3E6" stroke-width="0.75"/>');
    if (!isNaN(Lg)) out.push('<text x="' + ((X0 + cx) / 2 + 4) + '" y="' + (yy - 2) + '" text-anchor="middle" font-family="Arial" font-size="9">' + fmt((c2 + 0.5) * Lg / nbL) + ' cm</text>');
  }
  out.push('</svg>');
  return { svg: out.join(''), width: W, height: h };
}

// ————————————————————————————————————————————
// Bloc "Mesure de la vitesse dans le conduit" commun à toutes les fiches (CTA, extracteur,
// équipements, machines à bois, gaz d'échappement...) — maquette du Rapso réel (EMFI Haguenau
// p. 29/31) : effluent, gaine, grille des points avec leur distance à la paroi, valeur mesurée.
// ————————————————————————————————————————————

// Positions des 7 points d'un axe de gaine circulaire, en fraction du diamètre (méthode du Rapso).
var PDF_CONDUIT_FRACTIONS_CIRC = [0.04, 0.13, 0.26, 0.5, 0.74, 0.87, 0.96];

function pdfConduitPos(x, dec) { var f = Math.pow(10, dec === undefined ? 1 : dec); return pdfFrNumber(String(Math.round(x * f) / f)); }

// o : { titre, forme, temperature, pression, masse, d1, d2, vitesse, grid, nbAxes, nbPoints, observation }
function pdfConduitBlock(o) {
  var v = formatCrosstabValue, out = [];
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 9.7 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 9.7 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var place = function (t, ind) { t.margin = [8 + (ind || 0), 0, 0, 0]; return pdfTight(t); };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };

  out.push(place(pdfTable([524], [[L(o.titre)]])));
  out.push(gap(12));
  out.push(place(pdfTable([200, 250, 74], [
    [L('Type de conduit', { bold: true }), L('Effluent', { bold: true, colSpan: 2 }), {}],
    [V(v(o.forme), { rowSpan: 3 }), L('Température dans le conduit (°C)'), V(v(o.temperature), { fontSize: 10.7 })],
    [{}, L('Pression statique dans le conduit (Pa)'), V(v(o.pression), { fontSize: 10.7 })],
    [{}, L('Masse volumique dans les conditions réelles (kg/m3)'), V(v(o.masse), { fontSize: 10.7 })]
  ])));
  out.push(gap(12));

  var rect = o.forme === 'Rectangulaire';
  out.push(place(pdfTable([524], [[L(rect ? 'Gaine rectangulaire' : 'Gaine circulaire')]])));
  out.push(gap(12));

  // Grille : saisie point par point si disponible, sinon la vitesse moyenne directe au point
  // central (1re ligne, colonne du milieu), les autres points "/" — exactement comme le Rapso.
  var nbAxes = parseInt(o.nbAxes, 10), nbPts = parseInt(o.nbPoints, 10);
  var hasGrid = Array.isArray(o.grid) && nbAxes > 0 && nbPts > 0;
  var rows = rect ? (hasGrid ? Math.min(nbAxes, GRID_MAX) : 5) : 2;
  var cols = rect ? (hasGrid ? Math.min(nbPts, GRID_MAX) : 5) : (hasGrid ? Math.min(nbPts, GRID_MAX) : 7);
  if (!rect && hasGrid) rows = Math.min(nbAxes, GRID_MAX);
  var cell = function (r, c) {
    if (hasGrid) { var g = o.grid[r] && o.grid[r][c]; return (g === undefined || g === '') ? '/' : String(g); }
    return (r === 0 && c === Math.floor(cols / 2)) ? v(o.vitesse) : '/';
  };
  var d1 = parseFloat(String(o.d1 || '').replace(',', '.')), d2 = parseFloat(String(o.d2 || '').replace(',', '.'));
  // Box de peinture : le Rapso appelle « Largeur » le côté 1 et répartit les colonnes sur le côté 2.
  if (o.largeurD1) { var tmp = d1; d1 = d2; d2 = tmp; var t2 = o.d1; o = Object.assign({}, o, { d1: o.d2, d2: t2 }); }
  var colPos = function (c) {
    if (rect) return isNaN(d1) ? '' : pdfConduitPos((c + 0.5) * d1 / cols, o.posDec);
    if (isNaN(d1)) return '';
    var f = cols === 7 ? PDF_CONDUIT_FRACTIONS_CIRC[c] : (c + 0.5) / cols;
    // Le Rapso calcule la 2e moitié de l'axe par symétrie (D - position arrondie) : 75 - 9,8 = 65,2.
    if (cols === 7 && c > 3 && o.posDec !== 0) return pdfConduitPos(d1 - Math.round(PDF_CONDUIT_FRACTIONS_CIRC[6 - c] * d1 * 10) / 10);
    return pdfConduitPos(f * d1, o.posDec);
  };
  var rowPos = function (r) { return isNaN(d2) ? '' : pdfConduitPos((r + 0.5) * d2 / rows, o.posDec); };
  var colW = Math.min(50, (rect ? 324 : 399) / cols);

  var mesure = pdfTable([125, 125, 274], [
    [{ text: '', border: [false, false, false, false] }, L('Valeur mesurée', { fontSize: 10.7, margin: [0, 4, 0, 4] }), V(v(o.observation), { rowSpan: 2, alignment: 'left', margin: [4, 12, 4, 0] })],
    [L('Vitesse moyenne(m/s)', { fontSize: 10.7, margin: [0, 4, 0, 4] }), V(v(o.vitesse), { fontSize: 10.7, margin: [0, 4, 0, 4] }), o.debitRow ? { text: '', border: [true, false, true, false] } : {}]
  ].concat(o.debitRow ? [[L('Débit (m3/h)', { fontSize: 10.7, margin: [0, 4, 0, 4] }), V(v(o.debit), { fontSize: 10.7, margin: [0, 4, 0, 4] }), { text: '', border: [true, false, true, true] }]] : []));
  // Box : l'observation couvre les lignes vitesse et débit.
  if (o.debitRow) { mesure.table.body[0][2].rowSpan = 3; }

  if (rect) {
    var gridBody = [[L('')].concat(Array.apply(null, Array(cols)).map(function (_, c) { return L(colPos(c)); }))];
    for (var r = 0; r < rows; r++) {
      gridBody.push([L(rowPos(r))].concat(Array.apply(null, Array(cols)).map(function (_, c) { return V(cell(r, c)); })));
    }
    out.push({ columns: [
      { width: 175, stack: [pdfTight(pdfTable([125, 50], [
        [L('Largeur(cm)'), V(v(o.d2))], [L('Longueur(cm)'), V(v(o.d1))],
        [L('Nombre d\'axes'), V(hasGrid ? String(rows) : '5')], [L('Nombre de points'), V(hasGrid ? String(cols) : '5')],
        [L('Nombre de points total'), V(String(rows * cols))]
      ]))] },
      { width: 75 + colW * cols, stack: [pdfTight(pdfTable([75].concat(Array(cols).fill(colW)), gridBody))] }
    ], columnGap: 25, margin: [8, 0, 0, 0] });
    out.push(gap(28));
    out.push(place(mesure));
  } else {
    out.push({ columns: [
      { width: 175, stack: [pdfTight(pdfTable([125, 50], [[L(o.cta ? 'Diamètre(cm)' : 'Diamètre (cm)'), V(v(o.d1))]]))] },
      { width: 224, stack: [pdfTight(pdfTable([125, 99], [
        [{ text: '', border: [false, false, false, false] }, L('Valeur mesurée', { fontSize: 10.7, margin: [0, 4, 0, 4] })],
        [L('Vitesse moyenne(m/s)', { fontSize: 10.7, margin: [0, 4, 0, 4] }), V(v(o.vitesse), { fontSize: 10.7, margin: [0, 4, 0, 4] })]
      ].concat(o.debit !== undefined && o.debit !== '' ? [[L('Débit (m3/h)', { fontSize: 10.7, margin: [0, 4, 0, 4] }), V(v(o.debit), { fontSize: 10.7, margin: [0, 4, 0, 4] })]] : [])))] }
    ], columnGap: 125, margin: [8, 0, 0, 0] });
    out.push(gap(12));
    // Libellés propres à chaque fiche dans le Rapso : « paroi(mm) » pour la CTA, « paroi (cm) » ailleurs.
    var cbody = [[L(o.paroiLabel || (o.cta ? 'Distance / paroi(mm)' : 'Distance / paroi (cm)'))].concat(Array.apply(null, Array(cols)).map(function (_, c) { return L(colPos(c)); }))];
    for (var a = 0; a < rows; a++) {
      cbody.push([L('Axe ' + (a + 1))].concat(Array.apply(null, Array(cols)).map(function (_, c) { return V(cell(a, c)); })));
    }
    out.push(place(pdfTable([125].concat(Array(cols).fill(colW)), cbody)));
  }
  return out;
}


// Page de méthodologie au style du Rapso (EMFI Haguenau p. 50, 62, 82) : logo en haut à gauche,
// titre bleu marine centré, texte bleu marine 11 pt sans encadré, illustration éventuelle. Reprend
// les paragraphes non gras de "legal" (les titres en gras sont remplacés par opts.titre).
var PDF_METHODO_BLUE = '#005499';
function pdfMethodoPage(legal, opts) {
  var out = [];
  if (PDF_ASSETS.logo) out.push({ image: PDF_ASSETS.logo, width: 74, height: 70, absolutePosition: { x: 33, y: 45 } });
  out.push({ text: opts.titre, fontSize: opts.titleSize || 15, color: opts.titleColor || PDF_METHODO_BLUE, alignment: 'center', margin: [90, 18, 20, 0] });
  var paras = [];
  (legal || []).forEach(function (n) {
    var cell = n && n.table && n.table.body && n.table.body[0] && n.table.body[0][0];
    if (cell && cell.text && !cell.bold) paras.push(String(cell.text));
  });
  paras.forEach(function (p, i) {
    out.push({ text: p, fontSize: 11, color: PDF_METHODO_BLUE, margin: [3, i === 0 ? (opts.titre.indexOf('\n') !== -1 ? 30 : 48) : 4, 10, 0] });
  });
  if (opts.image && PDF_ASSETS.methodo && PDF_ASSETS.methodo[opts.image.key]) {
    out.push({ image: PDF_ASSETS.methodo[opts.image.key], width: opts.image.w, height: opts.image.h, absolutePosition: { x: opts.image.x, y: opts.image.y } });
  }
  return out;
}

function pdfFicheBar(text, widthPt) {
  return pdfTable([widthPt || PDF_ANNEXE_CONTENT_WIDTH], [[pdfHeaderCell(text)]], { margin: [0, 0, 0, 0] });
}

// Retourne des LIGNES (pas une table complète) : l'appelant les enveloppe avec pdfTable([labelW,valW], ...).
function pdfFicheIdentRows(pairs) {
  return pairs.map(function (p) { return [pdfHeaderCell(p[0], { left: true }), pdfBodyCell(p[1] || '-', { center: true })]; });
}

function pdfFichePhotoBox(dataUrl, widthPt) {
  // Cadre photo du Rapso : ~232 × 196 pt, photo centrée.
  var imgCell = dataUrl
    ? { image: dataUrl, fit: [widthPt - 12, 170], alignment: 'center', margin: [0, 4, 0, 4] }
    : { text: '', margin: [0, 84, 0, 84] };
  return pdfTable([widthPt], [[pdfHeaderCell('Photo de l’équipement')], [imgCell]]);
}

function pdfFicheTwoCol(leftContent, rightContent, leftWidthPt, rightWidthPt) {
  // Deux blocs séparés par l'espace du Rapso (24 pt), sans padding parasite autour.
  return { columns: [{ width: leftWidthPt, stack: [leftContent] }, { width: rightWidthPt, stack: [rightContent] }], columnGap: 24 };
}

function pdfFicheConclusionRow(label, value, widthPt) {
  widthPt = widthPt || PDF_ANNEXE_CONTENT_WIDTH;
  return pdfTable([widthPt - PT(2400), PT(2400)], [[pdfBodyCell(label, { center: true }), pdfBodyCell(value || '-', { center: true })]]);
}

function pdfFicheObservationBox(text, widthPt) {
  var cell = pdfBodyCell(text || '-', { center: true });
  cell.margin = [4, 8, 4, 8]; // le Rapso laisse un cadre d'observation aéré, texte centré
  return pdfTable([widthPt || PDF_ANNEXE_CONTENT_WIDTH], [[cell]]);
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
  var rows = Math.min(parseInt(nbAxes, 10) || 0, GRID_MAX);
  var cols = Math.min(parseInt(nbPoints, 10) || 0, GRID_MAX);
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
  var v = formatCrosstabValue;
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [1, 2, 1, 2] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [1, 2, 1, 2] }, extra || {}); };
  var out = [
    pdfTight(pdfTable([540], [[L('Mesure de la vitesse de transport', { fontSize: 11, margin: [1, 0, 1, 0] })]])),
    { text: '', margin: [0, 0, 0, 12] },
    pdfTight(pdfTable([129, 77, 77, 51, 103, 103], [
      [{ text: '', border: [false, false, false, false] }, L('Valeur mesurée', { margin: [1, 9, 1, 9] }), L('Type de polluants'), L('Valeur de référence'),
        L('Valeur recommandée par l\'INRS(ED 695)'), L('Avis par rapport aux valeurs de référence')],
      [L('Vitesse moyenne(m/s)', { margin: [1, 12, 1, 12] }), V(v(d.vt_mesuree), { margin: [1, 12, 1, 12] }), V(v(d.vt_type_polluant)), V(v(d.vt_reference), { margin: [1, 12, 1, 12] }),
        V(v(d.vt_inrs), { margin: [1, 12, 1, 12] }), V(v(d.avis_vt), { margin: [1, 12, 1, 12] })]
    ].concat(d.debit_vt !== undefined && d.debit_vt !== '' ? [[L('Débit (m3/h)', { margin: [1, 6, 1, 6] }), V(v(d.debit_vt), { margin: [1, 6, 1, 6] }),
      { text: '', border: [true, false, false, false], colSpan: 4 }, {}, {}, {}]] : [])))
  ];
  return { stack: out };
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
      var W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT - 24;
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

// Page de garde : reproduite à la position près d'après le PDF Rapso réel (relevé du 2026-10-03,
// rapport EMFI Haguenau) — d'où les absolutePosition, la page de garde du Rapso n'étant pas un flux
// de texte mais une maquette fixe. Bloc utile x 56 -> 538 (482 pt).
var PDF_COVER_X = 56, PDF_COVER_W = 482;

function pdfThreeColBlock(labels, values, y) {
  var W = [176, 130, 176];
  function headCell(text) { return { text: text, bold: true, fontSize: 8.6, color: '#FFFFFF', fillColor: PDF_ACCENT, alignment: 'center', margin: [0, 11, 0, 11] }; }
  function valCell(text) {
    if (text && typeof text === 'object') return text; // cellule déjà construite (visa du technicien)
    return { text: text, fontSize: 9.6, alignment: 'center', margin: [0, 17, 0, 17] };
  }
  var t = pdfTable(W, [
    [headCell(labels[0]), headCell(labels[1]), headCell(labels[2])],
    [valCell(values[0]), valCell(values[1]), valCell(values[2])]
  ]);
  t.absolutePosition = { x: PDF_COVER_X, y: y };
  return t;
}

function pdfBuildPageDeGarde(m, di, ic, is, isi, logoDataUrl, bannerDataUrl) {
  var content = [];
  var at = function (node, x, y) { node.absolutePosition = { x: x, y: y }; return node; };

  if (bannerDataUrl) content.push(at({ image: bannerDataUrl, width: 399, height: 56 }, PDF_COVER_X, 53));
  if (logoDataUrl) content.push(at({ image: logoDataUrl, width: 60, height: 58 }, 467, 52));
  content.push(at({ text: 'Rapport d\'intervention', bold: true, fontSize: 23, color: '#FFFFFF' }, 70, 66));

  content.push(at({ stack: [
    { text: ic.nomEntreprise || '—', bold: true, fontSize: 11.5 },
    { text: 'A l\'attention de  ' + (ic.nomDemandeur || '—'), fontSize: 9.6 },
    { text: ic.adresse || '', fontSize: 9.6 },
    { text: ((ic.codePostal || '') + ' ' + (ic.ville || '')).trim(), fontSize: 9.6 }
  ], width: 232 }, 306, 128));

  content.push(at({ text: 'CONTRÔLE DE L\'AERATION ET DE L\'ASSAINISSEMENT\nDES LOCAUX DE TRAVAIL', bold: true, fontSize: 13.4,
    alignment: 'center', width: PDF_COVER_W, lineHeight: 1.1 }, PDF_COVER_X, 242));

  var nomAuteur = di.auteurRapport || is.intervenant || '—';
  // Visa du technicien (js/finitions.js) et relecteur (js/qualite.js) quand ils existent
  var visa = (typeof getVisa === 'function') ? getVisa() : '';
  var redige = visa ? { stack: [{ text: nomAuteur, fontSize: 9.6, alignment: 'center' }, { image: visa, fit: [110, 24], alignment: 'center', margin: [0, 2, 0, 0] }], margin: [0, 6, 0, 4] } : nomAuteur;
  var valide = (m.relecture && m.relecture.statut === 'validee' && m.relecture.par) ? m.relecture.par : nomAuteur;
  content.push(pdfThreeColBlock(['Intervention sur site réalisée par', 'Rédigé par', 'Validé par'], [nomAuteur, redige, valide], 333));
  content.push(pdfThreeColBlock(['Date d\'édition du rapport', 'Référence du rapport (chrono)', 'Nature de la révision'],
    [di.dateRapport || '—', di.numeroChrono || '—', di.natureRevision || 'Version initiale'], 446));

  // Bandeau "N° d'affaire" : fond #00AFEF, texte d'avertissement en noir dans le Rapso.
  content.push(at({ table: { widths: [PDF_COVER_W - 8], body: [[{
    stack: [
      { text: 'N° d\'Affaire : ' + (di.numeroAffaire || '—'), bold: true, fontSize: 8.6, color: '#FFFFFF' },
      { text: 'Mission réalisée ' + (di.datesIntervention ? ('du ' + di.datesIntervention) : '—'), bold: true, fontSize: 8.6, color: '#FFFFFF' },
      { text: '  La reproduction de ce document n’est autorisée que sous sa forme intégrale.', fontSize: 7.7, margin: [0, 14, 0, 0] }
    ], fillColor: '#00AFEF', margin: [10, 13, 10, 26]
  }]] }, layout: 'noBorders' }, PDF_COVER_X, 583));

  content.push(at({ stack: [
    { text: 'SOCOTEC ENVIRONNEMENT', fontSize: 9.6 },
    { text: is.agenceAuteur || '—', fontSize: 8.6 },
    { text: is.adresseAgence || '', fontSize: 8.6 },
    { text: ((is.codePostal || '') + ' ' + (is.ville || '')).trim(), fontSize: 8.6 },
    { text: di.telAuteur ? 'Tél : ' + di.telAuteur : '', fontSize: 8.6 }
  ], width: 290 }, 58, 683));
  // Cadre "Nombre de pages" : le total est inconnu à ce stade (pdfmake), il est écrit par le pied de
  // page de la page 1 (pdfBuildFooter) à cette même position — ici seulement le cadre.
  content.push(at({ canvas: [{ type: 'rect', x: 0, y: 0, w: 176, h: 50, lineColor: PDF_ACCENT, lineWidth: 0.75 }] }, 362, 695));

  content.push(at({ stack: [
    { text: 'SOCOTEC ENVIRONNEMENT - S.A.S au capital de 436 960 euros - 834 096 497 RCS Versailles', fontSize: 6.7 },
    { text: 'Siège social : 5, place des Frères Montgolfier- CS 20732 - Guyancourt - ', fontSize: 6.7, margin: [0, 4, 0, 0] },
    { text: [{ text: '78182 St-Quentin-en-Yvelines Cedex - FRANCE ' }, { text: 'www.socotec.fr', color: PDF_ACCENT, bold: true }], fontSize: 6.7, margin: [0, 4, 0, 0] }
  ], width: 400 }, 58, 760));

  // Élément de flux : sans lui la page n'aurait aucun contenu "réel" et pdfmake la fusionnerait.
  content.push({ text: ' ', fontSize: 1 });
  return content;
}

// ————————————————————————————————————————————
// 1. Présentation / 2. Description locaux / 3. Documents transmis / 4. Synthèse
// ————————————————————————————————————————————

// Entrée de sommaire invisible avec points de conduite ("1. PRESENTATION ......... 3"), comme le
// Rapso : pdfmake reprend tel quel le texte de l'élément marqué tocItem et ne sait pas tracer de
// points de suite, on les ajoute donc au texte en estimant sa largeur (Arial : ~0,6 em par lettre
// capitale en gras, 0,55 em en normal ; un point = 0,28 em), avec une marge pour ne jamais passer à
// la ligne.
function pdfTocMarker(text, level) {
  var size = level === 1 ? 12 : 9.5, bold = level === 1;
  var avail = 468, charW = (bold ? 0.64 : 0.58) * size, dotW = 0.278 * size;
  var dots = Math.max(3, Math.floor((avail - text.length * charW) / dotW * 0.92));
  return { text: text + ' ' + new Array(dots + 1).join('.'), fontSize: 0.5, color: '#FFFFFF', tocItem: 'mainToc',
    tocStyle: { fontSize: size, bold: bold }, tocNumberStyle: { fontSize: size, bold: bold },
    tocMargin: level === 1 ? [0, 12, 0, 0] : [0, 1, 0, 0] };
}

// Titres du Rapso : "1.    PRESENTATION DE LA MISSION" (14 pt) et "2.1    DESCRIPTION..." (12 pt bleu).
function pdfHeading1(text, opts) {
  opts = opts || {};
  var shown = text.replace(/^(\d+)\.\s*/, '$1.    ');
  var h = { stack: [pdfTocMarker(text, 1), { text: shown, bold: true, color: PDF_BLUE, fontSize: 14, margin: [0, opts.top !== undefined ? opts.top : 46, 0, 16] }] };
  if (opts.pageBreak) h.pageBreak = 'before';
  return h;
}
function pdfHeading2(text) {
  return { text: text.replace(/^(\d+\.\d+)\s*/, '$1    '), bold: true, color: PDF_ACCENT, fontSize: 12, margin: [0, 4, 0, 14] };
}
function pdfSubHeading(text) {
  return { text: text, bold: true, fontSize: 10, margin: [0, 14, 0, 2] };
}
// Libellé à gauche, valeur alignée à 147 pt (colonnes du Rapso, section 1).
function pdfLabelValueLine(label, value) {
  return { columns: [{ width: 147, text: label, fontSize: 10 }, { width: '*', text: value, fontSize: 10 }] };
}

function pdfBuildPresentationMission(m, di, ic, isi) {
  var content = [];
  content.push(pdfHeading1('1. PRESENTATION DE LA MISSION', { top: 30 }));
  if (typeof pdfMentionsQualite === 'function') content = content.concat(pdfMentionsQualite(m)); // contre-visite, rapport vérifié (js/qualite.js)
  content.push(pdfSubHeading('Objectif'));
  var nomSite = ic.nomEntreprise || '—';
  content.push({ text: 'Ce rapport présente les résultats de la vérification de l’aération et de l’assainissement des locaux de travail réalisée sur le site ' + nomSite + ', selon le contrat référencé ' + nomSite + '.', fontSize: 10, margin: [0, 10, 0, 10] });

  content.push(pdfSubHeading('Demandeur'));
  content.push(pdfLabelValueLine('Nom du demandeur :', ic.nomDemandeur || '—'));
  content.push(pdfLabelValueLine('Adresse du demandeur :', [ic.nomEntreprise, ic.adresse, ((ic.codePostal || '') + ' ' + (ic.ville || '')).trim()].filter(Boolean).join('\n')));

  content.push(pdfSubHeading('Site d’intervention'));
  content.push(pdfLabelValueLine('Nom du site :', isi.siteIntervention || ic.nomEntreprise || '—'));
  content.push(pdfLabelValueLine('Adresse du site :', [isi.adresseSite, ((isi.codePostal || '') + ' ' + (isi.ville || '')).trim()].filter(Boolean).join('\n')));

  content.push(pdfSubHeading('Référentiel'));
  ['Articles R.4212 du code du travail,', 'Articles R.4222 du code du travail,',
    'Arrêté du 8 octobre 1987 relatif au contrôle périodique des installations d’aération et d’assainissement des locaux de travail.'
  ].forEach(function (t) { content.push({ text: '-      ' + t, fontSize: 10 }); });

  // Matériel de mesure (js/terrain-assist.js) : n'apparaît que si des appareils ont été choisis pour
  // la mission — un rapport sans appareils déclarés reste identique à la mise en page d'origine.
  var appareils = m.appareilsMesure || [];
  if (appareils.length) {
    content.push(pdfSubHeading('Matériel de mesure utilisé'));
    var body = [[pdfHeaderCell('Matériel'), pdfHeaderCell('Marque / modèle'), pdfHeaderCell('N° d’identification'),
      pdfHeaderCell('Date du dernier étalonnage'), pdfHeaderCell('Validité')]];
    appareils.forEach(function (a) {
      var mois = parseInt(a.validiteMois, 10) || 12;
      body.push([pdfBodyCell(a.designation || '—'), pdfBodyCell(a.marqueModele || '—'), pdfBodyCell(a.numero || '—', { center: true }),
        pdfBodyCell(formatDateFr(a.dateEtalonnage) || '—', { center: true }),
        pdfBodyCell((mois % 12 === 0 ? (mois / 12) + ' an' + (mois > 12 ? 's' : '') : mois + ' mois'), { center: true })]);
    });
    content.push(pdfTable(['*', '*', '*', '*', 50], body, { headerRows: 1 }));
  }

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
  content.push(pdfHeading1('3. DOCUMENTS TRANSMIS A SOCOTEC', { pageBreak: true, top: 30 }));
  content.push(pdfHeading2('3.1 LISTE DES DOCUMENTS TRANSMIS A SOCOTEC'));
  content.push(pdfDocsTable(dt.documents));
  content.push(Object.assign(pdfHeading2('3.2 NOTICE D\'INSTRUCTION ET CONSIGNES D\'UTILISATION'), { margin: [0, 34, 0, 14] }));
  content.push(pdfNoticeTable(dt.notice, dt.observations));
  if (typeof pdfBuildDocsJointsListe === 'function') content = content.concat(pdfBuildDocsJointsListe(m)); // 3.3 (js/documents-joints.js)
  return content;
}

function pdfBuildSyntheseControle(m) {
  var content = [];
  content.push(pdfHeading1('4. SYNTHESE DU CONTROLE', { pageBreak: true, top: 30 }));
  content.push({ text: 'Locaux à pollution non spécifique :', bold: true, fontSize: FS(20), margin: [0, 0, 0, PT(60)] });
  content.push({ text: 'En présence du Dossier de Valeurs de Références, SOCOTEC compare les valeurs mesurées à celles-ci. En l’absence de ce Dossier, SOCOTEC évalue les conditions minimales de renouvellement d’air prescrites par l’article R.4222-6 du Code du Travail et par le règlement sanitaire départemental type sur la base des effectifs constatés ou estimés in situ pour chaque local, au moment du contrôle, et les compare aux valeurs mesurées.', fontSize: FS(20), margin: [0, 0, 0, PT(200)] });
  content.push({ text: 'Locaux à pollution spécifique :', bold: true, fontSize: FS(20), margin: [0, 0, 0, PT(60)] });
  content.push({ text: 'En présence du Dossier de Valeurs de Références, SOCOTEC compare les valeurs mesurées à celles-ci. En l’absence de celui-ci, SOCOTEC compare les valeurs mesurées à celles prescrites par l’article R.4212-6 du Code du Travail pour ce qui concerne les sanitaires et à celles prescrites par les normes ou les guides de l’INRS pour l’ensemble des locaux ou installations à pollution spécifique.', fontSize: FS(20), margin: [0, 0, 0, PT(240)] });
  // Les tableaux de synthèse sont au format paysage dans le Rapso (pages dédiées).
  content.push({ text: '4.1 SYNTHESE DU CONTRÔLE', bold: true, color: '#00B0F0', fontSize: 12, margin: [0, 48, 0, 28],
    pageBreak: 'before', pageOrientation: 'landscape' });

  var hasContent = false;
  INSTALLATION_TYPES.forEach(function (t) {
    var list = (m.installations && m.installations[t.id]) || [];
    var cfg = SYNTHESE_CONFIG[t.id];
    if (list.length === 0 || !cfg) return;
    hasContent = true;
    content.push(pdfSyntheseTable(cfg, list));
  });
  if (!hasContent) content.push({ text: 'Aucune installation renseignée.', italics: true, fontSize: FS(20) });
  if (typeof pdfNonControlees === 'function') content = content.concat(pdfNonControlees(m)); // installations non contrôlées (js/qualite.js)
  return content;
}

function pdfBuildSommaire() {
  return [
    { text: 'SOMMAIRE', bold: true, fontSize: 12, color: PDF_BLUE, alignment: 'center', margin: [0, 54, 60, 6] },
    { toc: { id: 'mainToc' }, margin: [0, 0, 40, 0] }
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
  return pdfCrosstabSection('Bureaux', 'locaux à pollution non spécifique', legal, rows, list, logoDataUrl);
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
  return pdfCrosstabSection('Sanitaires', 'SANITAIRES', legal, rows, list, logoDataUrl);
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
  var titre = 'Extracteur', sousTitre = 'Extracteur';
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT - 24;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    // Maquette du Rapso (EMFI Haguenau p. 41) : identification 284 pt, cadre photo 231 pt.
    var v = formatCrosstabValue;
    var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10, left: true }), { margin: [6, 0, 2, 0] }, extra || {}); };
    var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [2, 0, 2, 0] }, extra || {}); };
    var tall = function (h) { return { margin: [6, h, 2, h] }; };
    var ident = pdfTight(pdfTable([78, 25, 181], [
      [L('Bâtiment', tall(5)), V(v(d.batiment), { colSpan: 2, margin: [2, 5, 2, 5] }), {}],
      [L('Locaux extraits', tall(12)), V(v(d.locaux_extraits), { colSpan: 2, margin: [2, 12, 2, 12] }), {}],
      [L('Date du contrôle', { fontSize: 9, margin: [3, 6, 0, 6] }), V(v(d.date_controle), { colSpan: 2, margin: [2, 6, 2, 6] }), {}],
      [L('Ref. de l\'équipement et/ou Implantation', { colSpan: 2, margin: [6, 6, 2, 6] }), {}, V(v(d.reference_equipement), { margin: [2, 12, 2, 6] })]
    ]));
    content.push({ columns: [
      { width: 284, stack: [ident] },
      { width: 231, stack: [pdfFichePhotoBox(d.photo, 231)] }
    ], columnGap: 25 });
    content.push({ text: '', margin: [0, 0, 0, 13] });

    var vitesse = d.vitesse_mode === 'Grille de points' ? d.vitesse_moyenne_grille : d.vitesse;
    var surf = d.surface_m2, surf2 = (surf === undefined || surf === '' || isNaN(parseFloat(surf))) ? v(surf) : String(Math.round(parseFloat(surf) * 100) / 100);
    var H = function (t) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [1, 6, 1, 6] }); };
    content.push(pdfTight(pdfTable([52, 77, 51, 51, 52, 52, 76, 77, 52], [
      [L('Mesures de vitesse', { colSpan: 2, alignment: 'center', margin: [2, 6, 2, 6] }), {}, V(v(d.mesure_debit), { colSpan: 7, margin: [2, 6, 2, 6] }), {}, {}, {}, {}, {}, {}],
      [H('Réseau d\'air'), H('Forme de la section'), H('Diamètre ou Côté 1 (en cm)'), H('Côté 2 (en cm)'), H('Surface (en m²)'),
        H('Vitesse (en m/s)'), H('Valeur de référence ou recommandée (en m³/h)'), H('Débit année N-1 (en m³/h)'), H('Débit année en cours (en m³/h)')],
      [V('Extrait'), V(v(d.forme_section)), V(v(d.diametre_cote1)), V(v(d.cote2)), V(surf2), V(v(vitesse)),
        V(v(d.valeur_reference_recommandee)), V(formatCrosstabDebit(d.debit_annee_n1)), V(formatCrosstabDebit(d.debit_annee_en_cours))]
    ])));
    content.push({ text: '', margin: [0, 0, 0, 13] });
    content.push(pdfTight(pdfTable([411, 129], [
      [L('Conclusion', { colSpan: 2, alignment: 'center' }), {}],
      [V('Avis par rapport à la valeur de recommandée :', { margin: [2, 7, 2, 7] }), V(v(d.avis_constructeur), { margin: [0, 7, 0, 7], fontSize: 9.5 })]
    ])));
    content.push({ text: '', margin: [0, 0, 0, 13] });
    content.push(pdfTight(pdfTable([540], [
      [L('Observations', { alignment: 'center' })],
      [V(v(d.observation), { margin: [6, 12, 6, 12] })]
    ])));

    if (d.forme_section) {
      content.push({ text: '', pageBreak: 'before' });
      // Bloc conduit commun, maquette du Rapso (cf. pdfConduitBlock).
      content = content.concat(pdfConduitBlock({
        titre: d.mesure_debit === 'Sur la surface de la grille' ? 'Mesure de la vitesse sur la surface de la grille d\'air extrait' : 'Mesure de la vitesse dans le conduit d\'air extrait',
        forme: d.forme_section, temperature: d.temperature_conduit, pression: d.pression_statique, masse: d.masse_volumique,
        d1: d.diametre_cote1, d2: d.cote2, vitesse: vitesse,
        grid: d.vitesse_mode === 'Grille de points' ? d.vitesse_grid : null, nbAxes: d.vitesse_nb_axes, nbPoints: d.vitesse_nb_points
      }));
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.6 — Hottes (guide INRS ED 695)
// ————————————————————————————————————————————
function pdfBuildAnnexeHottes(list, logoDataUrl) {
  var titre = 'Hottes', sousTitre = 'HOTTE A VENTILATION HORIZONTALE (GUIDE INRS ED 695)';
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
  content = content.concat(pdfMethodoPage(legal, { titre: 'Méthodologie de vérification de l\'aspiration des hottes', titleSize: 11, titleColor: '#003F73', image: { key: 'hottes', x: 43, y: 215, w: 377, h: 179 } }));
  content.push({ text: '', pageBreak: 'after' });
  // Maquette du Rapso réel (EMFI Haguenau p. 63-64).
  var v = formatCrosstabValue;
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var NONE = [false, false, false, false];
  var t = function (w, body) { return pdfTight(pdfTable(w, body)); };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var choix = d.mesures_choisies || [];
    var avecVpe = choix.indexOf('Vitesse au point d’émission') !== -1 || choix.indexOf("Vitesse au point d'émission") !== -1;
    var avecVt = choix.indexOf('Vitesse de transport') !== -1;
    var choixTxt = choix.length ? choix.join(' ; ') : '-';

    content.push(t([155, 205, 51, 129], [
      [L('Activité et référence du local', { margin: [1, 6, 1, 6] }), V(v(d.localisation), { margin: [1, 6, 1, 6] }), L('Bâtiment :', { margin: [0, 12, 0, 0], fontSize: 9 }), V(v(d.batiment), { margin: [1, 12, 1, 0] })]
    ]));
    content.push(t([155, 155, 77, 153], [
      [L('Date d\'installation', { margin: [1, 6, 1, 6] }), V(v(d.date_installation), { margin: [1, 6, 1, 6] }),
        L('Ref. de l\'équipement :', { rowSpan: 2, margin: [1, 14, 1, 0] }), V(v(d.reference_equipement), { rowSpan: 2, margin: [1, 18, 1, 0] })],
      [L('Mesures réalisées :', { margin: [1, 6, 1, 6] }), V(choixTxt, { margin: [1, 6, 1, 6] }), {}, {}]
    ]));
    content.push(gap(12));

    var photo = d.photo ? { image: d.photo, fit: [300, 170], alignment: 'center', margin: [0, 4, 0, 4] } : { text: '', margin: [0, 84, 0, 84] };
    content.push({ columns: [
      { width: 309, stack: [
        { table: { widths: [202], body: [[L('Photo de l\'équipement')]] }, layout: pdfBorderedLayout() },
        { table: { widths: [304], body: [[photo]] }, layout: pdfBorderedLayout() }
      ] },
      { width: 231, stack: [
        gap(14),
        t([231], [[L('Etat  visuel du réseau d\'aspiration')], [V(v(d.etat_visuel_reseau), { margin: [2, 30, 2, 30] })]]),
        t([77, 154], [[L('Test fumigène', { colSpan: 2 }), {}], [L('Observation', { margin: [1, 6, 1, 6] }), V(v(d.test_fumigene), { alignment: 'left', margin: [8, 6, 1, 6] })]])
      ] }
    ] });
    content.push(gap(24));

    if (avecVpe) {
      content.push(t([540], [[L('Mesure de la vitesse au point d\'émission', { fontSize: 11 })]]));
      content.push(gap(12));
      content.push(t([129, 77, 129, 77, 128], [
        [{ text: '', border: NONE }, L('Valeurs mesurées'), L('Valeurs recommandées par l\'INRS (ED 695)'), L('Valeurs de référence'), L('Avis par rapport aux valeurs de référence')],
        [L('Vitesse minimale (m/s)'), V(v(d.vpe_min)), V(v(d.vpe_min_inrs)), V(v(d.vpe_min_reference)), V(v(d.avis_vpe_min))],
        [L('Vitesse moyenne(m/s)'), V(v(d.vpe_moyenne)), V(v(d.vpe_moy_inrs)), V(v(d.vpe_moy_reference)), V(v(d.avis_vpe_moy))],
        [L('Débit d\'air extrait (m3/h)'), V(v(d.vpe_debit)), { text: '', border: [true, false, false, false], colSpan: 3 }, {}, {}]
      ]));
      content.push(gap(24));
    }
    if (avecVt) {
      content.push(pdfFicheVtTable(d));
      content.push(gap(24));
    }

    content.push(t([540], [[L('Conclusion')]]));
    content.push(gap(12));
    content.push(t([385, 155], [[V('Avis par rapport à la réglementation  et/ou aux préconisations (dossier de valeurs de référence si existant, normes, guide INRS) :', { alignment: 'left', margin: [8, 2, 4, 2] }),
      V(v(d.conclusion), { margin: [1, 7, 1, 7] })]]));
    content.push(gap(12));
    content.push(t([540], [[L('Observation')], [V(v(d.observation), { alignment: 'left', margin: [8, 10, 4, 10] })]]));

    if (avecVpe && (d.vpe_largeur_cm || d.vpe_hauteur_cm)) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(t([540], [[L('Mesure dans le plan d\'ouverture')]]));
      content.push(gap(24));
      content.push(t([104, 76, 204, 156], [
        [L('Largeur L (cm) :'), V(v(d.vpe_largeur_cm)), L('L\'opérateur est situé en dehors du volume entre le point d\'émission et le captage :', { rowSpan: 2 }), V(v(d.operateur_hors_volume), { rowSpan: 2, margin: [1, 6, 1, 0] })],
        [L('Hauteur h (cm) :'), V(v(d.vpe_hauteur_cm)), {}, {}]
      ]));
      content.push(gap(14));
      var plan = pdfHottePlanSvg(d);
      if (plan) content.push(plan);
      content.push(gap(14));
      content.push(t([104, 102], [
        [{ text: '', border: NONE }, L('Valeurs mesurées (m/s)')],
        [L('Vitesse minimale'), V(v(d.vpe_min))],
        [L('Vitesse moyenne'), V(v(d.vpe_moyenne))]
      ]));
      content.push(gap(14));
      content.push(t([206, 52], [[L('Débit d\'air extrait (m³/h)'), V(v(d.vpe_debit))]]));
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.7 — Bras d'aspiration articulés
// ————————————————————————————————————————————
// Bras articulé : maquette reproduite d'après le PDF Rapso réel (relevé du 2026-10-03, EMFI
// Haguenau p. 72). Bloc utile décalé de 26 pt (x 53 -> 567), identification en texte (libellés
// soulignés alignés à droite), cadre photo nu en haut à droite, captage + commentaire côte à côte.
var PDF_BOA_INDENT = 26, PDF_BOA_W = 514;

function pdfBoaTitre(text, opts) {
  opts = opts || {};
  return { text: text, bold: opts.bold !== false, fontSize: opts.size || 10, decoration: 'underline',
    margin: [PDF_BOA_INDENT + 2, opts.top !== undefined ? opts.top : 14, 0, 4] };
}

function pdfBoaLabelValueTable(rows, labelW, valueW) {
  return pdfTable([labelW, valueW], rows.map(function (r) {
    return [pdfHeaderCell(r[0], { size: r[2] || 10 }), pdfBodyCell(r[1], { center: true, size: 10 })];
  }));
}

function pdfBuildAnnexeBrasAspiration(list, logoDataUrl) {
  var titre = 'Bras articulé', sousTitre = 'BRAS ARTICULE';
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  var v = formatCrosstabValue;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    // Identification (texte) + cadre photo 231 × 130 sans bandeau
    var identLine = function (label, value, underline) {
      return { columns: [
        { width: 127, text: label, alignment: 'right', fontSize: 10, decoration: underline ? 'underline' : undefined },
        { width: '*', text: value, fontSize: 10, margin: [4, 0, 0, 0] }
      ], margin: [0, 0, 0, 2] };
    };
    var photo = d.photo
      ? { image: d.photo, fit: [227, 126], alignment: 'center', margin: [0, 2, 0, 2] }
      : { text: '', margin: [0, 60, 0, 60] };
    content.push({ columns: [
      { width: 300, stack: [
        { text: 'Identification du bras Aspirant', bold: true, fontSize: 10, decoration: 'underline', margin: [28, 14, 0, 12] },
        identLine('Batiment:', v(d.batiment), true),
        identLine('Activité:', v(d.activite), true),
        identLine('Atelier:', v(d.atelier), true),
        identLine('Référence de l\'équipement :', v(d.reference_equipement), false),
        // Titre placé dans la colonne gauche : dans le Rapso il est à hauteur du bas du cadre photo.
        { text: 'Examen visuel de l\'état des éléments de l\'installation', bold: true, fontSize: 10, decoration: 'underline', margin: [28, 14, 0, 0] }
      ] },
      { width: 231, table: { widths: [223], body: [[photo]] }, layout: pdfBorderedLayout() }
    ], columnGap: 9, margin: [0, 0, 0, 0] });

    content.push(pdfBoaTitre('Captage', { bold: false, top: 4 }));
    content.push({ columns: [
      { width: 206, stack: [pdfBoaLabelValueTable([
        ['Adapté à la situation', v(d.adapte_situation)], ['Etat visuel', v(d.etat_visuel)],
        ['Etat des conduits aérauliques', v(d.etat_conduits)], ['Recyclage', v(d.recyclage)]
      ], 103, 103)] },
      { width: '*', stack: [
        { text: 'Commentaire :', bold: true, fontSize: 10, decoration: 'underline' },
        { text: v(d.commentaire_1), fontSize: 10, margin: [0, 2, 0, 0] }
      ] }
    ], columnGap: 25, margin: [PDF_BOA_INDENT, 0, 0, 0] });

    content.push(pdfBoaTitre('Test fumigène', { bold: false, top: 18 }));
    content.push({ columns: [
      { width: 206, stack: [pdfBoaLabelValueTable([['Visualisation fumigène à 20 cm', v(d.test_fumigene), 9]], 103, 103)] },
      { width: 283, stack: [pdfTable([283], [
        [pdfHeaderCell('Conditions de dispersion du polluant', { size: 10 })],
        [Object.assign(pdfBodyCell(v(d.conditions_dispersion), { center: true, size: 10 }), { margin: [0, 4, 0, 4] })]
      ])] }
    ], columnGap: 25, margin: [PDF_BOA_INDENT, 0, 0, 0] });

    var estCone = !!d.diametre_bras_cone;
    var hdr = function (t) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [0, 2, 0, 2] }); };
    var val = function (t) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [0, 2, 0, 2] }); };
    if (!estCone) {
      content.push(pdfBoaTitre('Dimensionnement', { top: 18 }));
      var ov = d.forme_bouche === 'Ovale';
      var dimT = pdfTable([154, 77, 51.5, 51.5, 103, 77], [
        [hdr('Type de bouche d\'aspiration'), hdr('Diamètre de la bouche (cm)'), Object.assign(hdr('Longueur et largeur de la bouche si ovale (cm)'), { colSpan: 2 }), {},
          hdr('Surface de la bouche pour les autres cas (m2)'), hdr('Diamètre du conduit (cm)')],
        [val(v(d.type_bouche)), val(d.forme_bouche === 'Circulaire' ? v(d.diametre_bouche) : '-'),
          val(ov ? v(d.longueur_bouche_ovale) : '-'), val(ov ? v(d.largeur_bouche_ovale) : '-'),
          val(d.forme_bouche === 'Autre (surface connue)' ? v(d.surface_bouche_autre) : '-'), val(v(d.diametre_conduit))]
      ]);
      dimT.margin = [PDF_BOA_INDENT, 0, 0, 0];
      content.push(dimT);
    }

    content.push(pdfBoaTitre('Résultats des mesures de vitesse et de débit d\'air', { top: 18 }));
    var seuil = v(d.vitesse_captage);
    var resT = estCone
      ? pdfTable([90, 86, 86, 70, 102, 80], [
        [hdr('Zone de la prise de mesure'), hdr('Diamètre du bras au niveau du cône en (cm)'), hdr('Vitesse moyenne mesurée en m/s'), hdr('Débit calculé en m3/h'),
          hdr('Distance maximum de captage à ' + seuil + ' m/s* en cm'), hdr('Distance d\'utilisation en cm')],
        [val(v(d.localisation_point_mesure)), val(v(d.diametre_bras_cone)), val(v(d.vitesse_moyenne)), val(v(d.debit_calcule)), val(v(d.distance_max_captage)), val(v(d.distance_utilisation))]
      ])
      : pdfTable([103, 103, 77, 128, 103], [
        [hdr('Zone de la prise de mesure'), hdr('Vitesse moyenne mesurée en m/s'), hdr('Débit calculé en m3/h'),
          hdr('Distance maximum de captage à ' + seuil + ' m/s* en cm'), hdr('Distance d\'utilisation en cm')],
        [val(v(d.localisation_point_mesure)), val(v(d.vitesse_moyenne)), val(v(d.debit_calcule)), val(v(d.distance_max_captage)), val(v(d.distance_utilisation))]
      ]);
    resT.margin = [PDF_BOA_INDENT, 0, 0, 0];
    content.push(resT);

    if (d.debit_precedent) {
      content.push(pdfBoaTitre('Evolution des valeurs par rapport aux mesures précédentes', { top: 18 }));
      var evoT = pdfTable([128, 128, 77, 181], [
        [hdr('Débit mesuré précédemment en m3/h'), hdr('Débit mesurés cette année en m3/h'), hdr('Evolution en %'), hdr('Commentaire')],
        [val(v(d.debit_precedent)), val(v(d.debit_calcule)), val(v(d.evolution_pct)), val(v(d.commentaire_2))]
      ]);
      evoT.margin = [PDF_BOA_INDENT, 0, 0, 0];
      content.push(evoT);
    }

    content.push({ text: 'Conclusion:', bold: true, fontSize: 11, decoration: 'underline', margin: [PDF_BOA_INDENT + 2, 20, 0, 1] });
    var phrase = d.recyclage === 'Oui'
      ? 'Le bras aspirant recycle l\'air dans le local, ce qui est Non Satisfaisant.'
      : 'le bras aspirant permet un captage efficace des polluants à une distance de ' + v(d.distance_max_captage) +
        ' cm ce qui est ' + v(d.conclusion_distance) + ' par rapport à la distance d\'utilisation.';
    content.push({ text: phrase, bold: true, fontSize: 10, margin: [PDF_BOA_INDENT + 2, 0, 0, 0] });

    if (d.conclusion) {
      content.push(pdfBoaTitre('Explication/remarque:', { top: 14 }));
      content.push({ text: d.conclusion, fontSize: 10, margin: [PDF_BOA_INDENT + 2, 0, 0, 0] });
    }
    if (d.recyclage === 'Oui') {
      content.push({ text: 'Non respect du code du travail pour le recyclage', fontSize: 10, margin: [PDF_BOA_INDENT + 2, 8, 0, 0] });
      content.push({ text: '- absence d’un système de surveillance permettant de déceler les défauts des dispositifs d’épuration.', fontSize: 10, margin: [PDF_BOA_INDENT + 2, 0, 0, 0] });
      content.push({ text: '- absence de contrôle de la concentration en polluant dans l’air recyclé', fontSize: 10, margin: [PDF_BOA_INDENT + 2, 0, 0, 0] });
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
var PDF_ASSETS = { logo: null, banner: null, dividers: {}, ctaSchema: null, sorbonneSchema: null, methodo: {} };

function pdfBuildAnnexeForType(t, list) {
  if (PDF_ANNEXES_FIDELES[t.id]) return PDF_ANNEXES_FIDELES[t.id](list);
  var group = sectionGroupForType(t.id);
  return pdfBuildAnnexeFicheGenerique(t.id, t.label, (group && group.titre) || t.label, null, list, PDF_ASSETS.logo);
}

function pdfBuildFooter(di) {
  return function (currentPage, pageCount, pageSize) {
    if (currentPage === 1) {
      // Marge haute négative : le pied de page commence à y = 842 - 48 = 794, on remonte jusqu'au
      // cadre dessiné par pdfBuildPageDeGarde (y = 710), seul endroit où le total de pages est connu.
      return { stack: [
        { text: 'Nombre de pages : ' + pageCount + ' pages', fontSize: 7.7, margin: [371, -84, 0, 0] },
        { text: '(annexes comprises)', fontSize: 7.7, margin: [364, 3, 0, 0] }
      ] };
    }
    // Positions du Rapso : affaire à x 18, chrono à x 238 (portrait) / 361 (paysage), n° de page
    // aligné à droite à 15-18 pt du bord.
    var w = pageSize.width, landscape = w > pageSize.height;
    return {
      margin: [18, 14, landscape ? 18 : 15, 0],
      columns: [
        { text: 'N° d’Affaire : ' + (di.numeroAffaire || '—'), fontSize: 9.5, width: (landscape ? 361 : 238) - 18 },
        { text: 'N° Chrono : ' + (di.numeroChrono || '—'), fontSize: 9.5, width: '*' },
        { text: currentPage + '/' + pageCount, fontSize: 9.5, alignment: 'right', width: 40 }
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
  if (typeof pdfBuildPlansSite === 'function') content = content.concat(pdfBuildPlansSite(m)); // 4.2 Plan du site (js/plans.js)
  if (typeof pdfBuildSchemas === 'function') content = content.concat(pdfBuildSchemas(m)); // 4.3 Schémas des réseaux (js/schemas.js)
  if (typeof pdfBuildBilansCta === 'function') content = content.concat(pdfBuildBilansCta(m)); // 4.4 Bilan d'air neuf des CTA (js/bilans.js)

  // Page de titre "ANNEXES" à part entière (grand mot centré verticalement, comme le PDF de
  // référence) plutôt qu'un simple titre en haut de page — corrigé lors de la comparaison avec un
  // vrai rapport de référence (audit du 2026-09-18, retour utilisateur). L'entrée de sommaire ("5.
  // ANNEXES") est un marqueur séparé quasi invisible, même technique que pdfSectionDividerPage :
  // pdfmake reprend tel quel le texte d'un tocItem, qui doit donc rester distinct du gros mot affiché.
  content.push(Object.assign(pdfTocMarker('5. ANNEXES', 1), { pageBreak: 'before', pageOrientation: 'portrait' }));
  content.push({ text: 'ANNEXES', bold: true, color: PDF_ACCENT, fontSize: 40, alignment: 'center', margin: [0, 320, 0, 0] });

  var seenSectionGroups = {}, nbSections = 0;
  INSTALLATION_TYPES.forEach(function (t) {
    // Pas de fiche en annexe pour une installation non contrôlée (js/qualite.js)
    var list = ((m.installations && m.installations[t.id]) || []).filter(function (inst) { return !(inst.data && inst.data._nonControle); });
    if (list.length === 0) return;

    var group = sectionGroupForType(t.id);
    if (group && !seenSectionGroups[group.key]) {
      seenSectionGroups[group.key] = true;
      content.push({ text: '', pageBreak: 'before' });
      var groupNum = ++nbSections; // numérotation continue des sections présentes, comme le Rapso (5.1, 5.2, 5.3...)
      content = content.concat(pdfSectionDividerPage(group.titre, PDF_ASSETS.dividers[group.key], '5.' + groupNum + ' ' + group.sommaireTitre, group));
    }
    content.push({ text: '', pageBreak: 'before' });
    // Repères de page des fiches pour l'index des installations (js/index-synthese.js)
    content = content.concat(typeof pdfAnnexeAvecAncres === 'function' ? pdfAnnexeAvecAncres(t, list) : pdfBuildAnnexeForType(t, list));
  });
  // Documents joints (js/documents-joints.js)
  var docsJoints = typeof pdfBuildDocsJointsAnnexe === 'function' ? pdfBuildDocsJointsAnnexe(m, '5.' + (nbSections + 1) + ' DOCUMENTS JOINTS') : [];
  content = content.concat(docsJoints);
  // Dernière annexe : index des installations par ordre alphabétique (js/index-synthese.js)
  if (typeof pdfBuildIndexInstallations === 'function') content = content.concat(pdfBuildIndexInstallations(m, '5.' + (nbSections + (docsJoints.length ? 2 : 1)) + ' INDEX DES INSTALLATIONS'));

  // Images répétées (logo sur chaque page, schémas, photos d'intercalaires) : déclarées une seule fois
  // dans "images" et référencées par clé — pdfmake intégrerait sinon une copie par occurrence (+500 Ko
  // pour 5 sorbonnes, constaté le 2026-10-03).
  var images = {}, keyOf = {}, nImg = 0;
  [PDF_ASSETS.logo, PDF_ASSETS.banner, PDF_ASSETS.ctaSchema, PDF_ASSETS.sorbonneSchema].concat(
    Object.keys(PDF_ASSETS.methodo || {}).map(function (k) { return PDF_ASSETS.methodo[k]; })).concat(
    Object.keys(PDF_ASSETS.dividers || {}).reduce(function (acc, k) { return acc.concat(PDF_ASSETS.dividers[k] || []); }, [])
  ).forEach(function (url) {
    if (url && !keyOf[url]) { keyOf[url] = 'img' + (nImg++); images[keyOf[url]] = url; }
  });
  (function walk(node) {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    if (typeof node.image === 'string' && keyOf[node.image]) node.image = keyOf[node.image];
    Object.keys(node).forEach(function (k) { if (k !== 'image' && node[k] && typeof node[k] === 'object') walk(node[k]); });
  })(content);

  return {
    pageSize: 'A4',
    images: images,
    pageMargins: PDF_PAGE_MARGINS,
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
  rapportProgres('Préparation du rapport…');
  buildRapportPdf(m).then(function (r) { r.pdf.download(r.filename); })
    .catch(function (err) { rapportProgresFin(); alert('Erreur lors de l’export PDF.\n' + err.message); });
}

// Construit le rapport (images chargées, mise en page pdfmake) sans le télécharger : utilisé par
// l'export (download) et par l'envoi (getBlob + partage natif, js/sorties.js).
// Message d'avancement pendant la préparation du rapport (photos, puis mise en page). La mise en page
// pdfmake bloque l'écran : on laisse le temps au message de s'afficher avant de la lancer.
var _rapportProgresEl = null;
function rapportProgres(txt) {
  if (typeof document === 'undefined' || !document.body || !document.body.appendChild) return;
  if (!_rapportProgresEl) { _rapportProgresEl = document.createElement('div'); _rapportProgresEl.className = 'sw-update-banner lib-loading'; document.body.appendChild(_rapportProgresEl); }
  _rapportProgresEl.innerHTML = '<span>' + txt + '</span>';
}
function rapportProgresFin() {
  if (_rapportProgresEl && _rapportProgresEl.parentNode) _rapportProgresEl.parentNode.removeChild(_rapportProgresEl);
  _rapportProgresEl = null;
}
function rapportPdfAvecProgres(pdf, nb) {
  ['download', 'getBlob', 'getBuffer', 'getBase64', 'getDataUrl'].forEach(function (meth) {
    if (typeof pdf[meth] !== 'function') return;
    var orig = pdf[meth].bind(pdf);
    pdf[meth] = function () {
      var args = Array.prototype.slice.call(arguments), cbIdx = meth === 'download' ? 1 : 0, cb = args[cbIdx];
      rapportProgres('Mise en page du rapport' + (nb > 80 ? ' (' + nb + ' installations, cela peut prendre une minute)' : '') + '…');
      args[cbIdx] = function () { rapportProgresFin(); if (typeof cb === 'function') return cb.apply(this, arguments); };
      if (meth === 'download' && typeof args[0] !== 'string') args[0] = undefined;
      setTimeout(function () { try { orig.apply(null, args); } catch (e) { rapportProgresFin(); throw e; } }, 60);
    };
  });
  return pdf;
}

function buildRapportPdf(m) {
  return ensureLib('pdf')
    .then(function () { return (typeof buildPlanComposites === 'function') ? buildPlanComposites(m) : {}; })
    .then(function (plans) {
      PDF_ASSETS.plans = plans;
      return Promise.all([
        (typeof buildDocsJointsAssets === 'function') ? buildDocsJointsAssets(m) : {},
        (typeof buildSchemaComposites === 'function') ? buildSchemaComposites(m) : {}
      ]);
    })
    .then(function (r) { PDF_ASSETS.docs = r[0]; PDF_ASSETS.schemas = r[1]; return buildRapportPdfLoaded(m); })
    .then(function (res) { if (typeof rapportMemoriserVersion === 'function') rapportMemoriserVersion(m); return res; }); // versions du rapport (js/rapport-plus.js)
}

function buildRapportPdfLoaded(m) {

  var sectionImagePaths = [];
  var sectionImageCounts = SECTION_GROUPS.map(function (g) { return g.images.length; });
  SECTION_GROUPS.forEach(function (g) { sectionImagePaths = sectionImagePaths.concat(g.images); });

  return Promise.all([resolveMissionPhotos(m, function (n, total) { rapportProgres('Préparation des photos ' + n + ' / ' + total + '…'); }), pdfFetchAsDataUrl(LOGO_PATH), pdfFetchAsDataUrl(BANNER_PATH), pdfFetchAsDataUrl(CTA_SCHEMA_PATH), pdfFetchAsDataUrl(SORBONNE_SCHEMA_PATH)].concat(sectionImagePaths.map(pdfFetchAsDataUrl)).concat(Object.keys(METHODO_IMAGES).map(function (k) { return pdfFetchAsDataUrl(METHODO_IMAGES[k]); })))
    .then(function (bufs) {
      var resolvedM = bufs[0];
      PDF_ASSETS.logo = bufs[1];
      PDF_ASSETS.banner = bufs[2];
      PDF_ASSETS.ctaSchema = bufs[3];
      PDF_ASSETS.sorbonneSchema = bufs[4];
      PDF_ASSETS.dividers = {};
      var cursor = 5;
      SECTION_GROUPS.forEach(function (g, i) {
        PDF_ASSETS.dividers[g.key] = bufs.slice(cursor, cursor + sectionImageCounts[i]);
        cursor += sectionImageCounts[i];
      });
      PDF_ASSETS.methodo = {};
      Object.keys(METHODO_IMAGES).forEach(function (k) { PDF_ASSETS.methodo[k] = bufs[cursor++]; });
      var docDefinition = pdfBuildRapportDocDefinition(resolvedM);
      var rawName = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').trim();
      rapportProgresFin();
      return { pdf: rapportPdfAvecProgres(pdfMake.createPdf(docDefinition), overviewOrderedItems(m).length), filename: rawName + '_controle_aeration.pdf' };
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
  var titre = 'CTA', sousTitre = 'CENTRALE DE TRAITEMENT D\'AIR';
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
  content = content.concat(pdfMethodoPage(legal, { titre: 'Méthodologie de vérification des\nCentrales de Traitement d\'Air' }));
  content.push({ text: '', pageBreak: 'after' });
  var W_LABEL = PT(3200);
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    // Maquette du Rapso (EMFI Haguenau p. 28) : bloc de 524 pt décalé de 8 pt, police 9,7 pt.
    var v = formatCrosstabValue, IND = [8, 0, 0, 0];
    var L = function (t, size) { return Object.assign(pdfHeaderCell(t, { size: size || 9.7 }), { margin: [1, 0, 1, 0] }); };
    var V = function (t, size) { return Object.assign(pdfBodyCell(t, { center: true, size: size || 9.7 }), { margin: [1, 0, 1, 0] }); };
    var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };

    var ident = pdfTable([75, 200, 50, 75, 124], [
      [L('Bâtiment'), Object.assign(V(v(d.batiment), 10.7), { colSpan: 2 }), {}, L('Localisation'), V(v(d.localisation))],
      [L('Mode de fonctionnement', 8.8), V(v(d.mode_fonctionnement), 10.7),
        Object.assign(L('Ref. de l\'équipement et/ou Implantation'), { colSpan: 2, rowSpan: 3 }), {},
        Object.assign(V(v(d.reference_equipement)), { rowSpan: 3 })],
      [L('Locaux alimentés'), V(v(d.locaux_alimentes), 10.7), {}, {}, {}],
      [L('Date du contrôle', 8.8), V(v(d.date_controle)), {}, {}, {}]
    ]);
    ident.margin = IND;
    pdfTight(ident);
    content.push(ident);
    content.push(gap(12));

    if (d.afficher_filtration === 'Oui') {
      var fcol = function (prefix) {
        return [v(d[prefix + '_etat']), v(d[prefix + '_type']), v(d[prefix + '_nombre_dimensions']), v(d[prefix + '_classe']),
          d[prefix + '_perte_charge'] !== undefined ? v(d[prefix + '_perte_charge']) : '-'];
      };
      var pre = fcol('filt_pre'), fil = fcol('filt_filtre'), abs = fcol('filt_absolu');
      var frows = [[L('FILTRATION'), L('Pré-filtre'), L('Filtre'), L('Filtre absolu')]];
      ['Etat', 'Type (cellules, poches, ...)', 'Nombre / Dimensions', 'Classe d\'efficacité', 'Perte de charge (Pa)'].forEach(function (lab, i) {
        frows.push([L(lab), V(pre[i]), V(fil[i]), V(abs[i])]);
      });
      var ft = pdfTable([175, 100, 100, 149], frows);
      ft.margin = IND;
    pdfTight(ft);
      content.push(ft);
      content.push(gap(12));
    }

    var maint = d.fiche_maintenance === 'Dernière intervention de maintenance';
    var et = pdfTable([225, 225, 74], [
      [Object.assign(L('Etat du reste de l\'installation'), { colSpan: 3 }), {}, {}],
      [L('Etat général (propreté, corrosion, chocs, etc.)'), Object.assign(V(v(d.etat_general)), { colSpan: 2 }), {}],
      [L('Prise d\'air neuf'), Object.assign(V(v(d.prise_air_neuf)), { colSpan: 2 }), {}],
      [L('Batterie(s) chaude(s)'), Object.assign(V(v(d.batterie_chaude)), { colSpan: 2 }), {}],
      [L('Batterie(s) froide(s)'), Object.assign(V(v(d.batterie_froide)), { colSpan: 2 }), {}],
      [L('Canalisations / Gaines'), Object.assign(V(v(d.canalisations_gaines)), { colSpan: 2 }), {}],
      [L('Ventilateur / Courroie'), Object.assign(V(v(d.ventilateur_courroie)), { colSpan: 2 }), {}],
      maint
        ? [L('Fiche de Maintenance'), V(v(d.fiche_maintenance)), V(v(d.date_derniere_maintenance))]
        : [L('Fiche de Maintenance'), Object.assign(V(v(d.fiche_maintenance)), { colSpan: 2 }), {}]
    ]);
    et.margin = IND;
    pdfTight(et);
    content.push(et);
    content.push(gap(12));

    var reseau = function (label, prefix, actif) {
      if (!actif) return [V(label), V('-'), V('-'), V('-'), V('-'), V('-'), V('-'), V('-'), V('-')];
      var surf = d[prefix + '_surface'];
      var surf2 = (surf === undefined || surf === '' || isNaN(parseFloat(surf))) ? v(surf) : String(Math.round(parseFloat(surf) * 100) / 100);
      return [V(label), V(v(d[prefix + '_forme'])), V(v(d[prefix + '_diametre_cote1'])), V(v(d[prefix + '_cote2'])), V(surf2),
        V(v(d[prefix + '_vitesse'])), V(v(d[prefix + '_reference'])), V(formatCrosstabDebit(d[prefix + '_debit_n1'])), V(formatCrosstabDebit(d[prefix + '_debit']))];
    };
    var mt = pdfTable([50, 75, 50, 50, 50, 50, 75, 75, 49], [
      [Object.assign(L('Mesures de vitesse'), { colSpan: 2 }), {}, Object.assign(V(v(d.mesure_debit)), { colSpan: 7, alignment: 'left' }), {}, {}, {}, {}, {}, {}],
      [L('Réseau d\'air'), L('Forme de la section'), L('Diamètre ou Côté 1 (en cm)'), L('Côté 2 (en cm)'), L('Surface (en m²)'),
        L('Vitesse (en m/s)'), L('Débit de référence (en m³/h)'), L('Débit année N-1 (en m³/h)'), L('Débit année en cours (en m³/h)')],
      reseau('Neuf', 'neuf', !!d.neuf_forme),
      reseau('Soufflé', 'souf', !!d.souf_forme),
      reseau('Repris', 'rep', d.rep_active === 'Oui' && !!d.rep_forme)
    ]);
    mt.margin = IND;
    pdfTight(mt);
    content.push(mt);
    content.push(gap(12));

    var cc = pdfTable([400, 124], [
      [Object.assign(L('Conclusion'), { colSpan: 2 }), {}],
      [Object.assign(V('Avis par rapport aux données constructeurs :'), { margin: [2, 6, 2, 6] }), Object.assign(V(v(d.avis)), { margin: [2, 6, 2, 6] })]
    ]);
    cc.margin = IND;
    pdfTight(cc);
    content.push(cc);
    content.push(gap(12));
    var ob = pdfTable([524], [[L('Observations')], [Object.assign(V(v(d.observation)), { margin: [6, 6, 6, 6] })]]);
    ob.margin = IND;
    pdfTight(ob);
    content.push(ob);

    // Schéma à position fixe en bas de page, comme le Rapso (x 134, y 648) : une observation longue
    // passe dessous plutôt que de renvoyer le schéma seul sur une page.
    if (ctaSchemaDataUrl) content.push({ image: ctaSchemaDataUrl, width: 376, height: 144, absolutePosition: { x: 134, y: 648 } });

    var reseauxPage2 = ['neuf', 'souf', 'rep'].filter(function (p) {
      if (p === 'rep' && d.rep_active !== 'Oui') return false;
      return !!d[p + '_forme'];
    });
    if (reseauxPage2.length) {
      content.push({ text: '', pageBreak: 'before' });
      reseauxPage2.forEach(function (prefix, ri) {
        if (ri > 0) content.push({ text: '', margin: [0, 0, 0, 40] });
        var label = prefix === 'neuf' ? 'neuf' : (prefix === 'souf' ? 'soufflé' : 'repris');
        var surGrille = d.mesure_debit === 'Sur la surface de la grille';
        content = content.concat(pdfConduitBlock({
          titre: 'Mesure de la vitesse ' + (surGrille ? 'sur la surface de la grille d\'air ' : 'dans le conduit d\'air ') + label,
          forme: d[prefix + '_forme'], temperature: d[prefix + '_temperature_conduit'], pression: d[prefix + '_pression_statique'],
          masse: d[prefix + '_masse_volumique'], d1: d[prefix + '_diametre_cote1'], d2: d[prefix + '_cote2'], vitesse: d[prefix + '_vitesse'], cta: true
        }));
      });
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.5 — Sorbonnes
// ————————————————————————————————————————————
function pdfBuildAnnexeSorbonnes(list, logoDataUrl) {
  var titre = 'Sorbonne', sousTitre = 'VERIFICATION DES SORBONNES';
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
  content = content.concat(pdfMethodoPage(legal, { titre: 'Méthodologie de vérification des sorbonnes' }));
  content.push({ text: '', pageBreak: 'after' });
  // Maquette du Rapso réel sur deux pages (EMFI Haguenau p. 51-52), bloc x 30 -> 564 (534 pt).
  var v = formatCrosstabValue;
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var N = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10, fill: PDF_NAVY }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var NONE = [false, false, false, false];
  var t = function (w, body, ind) { var x = pdfTight(pdfTable(w, body)); x.margin = [ind === undefined ? 3 : ind, 0, 0, 0]; return x; };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    // Identification sur deux lignes
    content.push(t([153, 203, 51, 127], [[L('Activité et référence du local', { margin: [1, 6, 1, 6] }), V(v(d.localisation), { margin: [1, 6, 1, 6] }),
      L('Bâtiment :', { margin: [0, 6, 0, 6], fontSize: 9 }), V(v(d.batiment), { margin: [1, 6, 1, 6] })]]));
    content.push(t([153, 101, 128, 152], [[L('Date de mesures :'), V(v(d.date_controle)), L('Ref. de l\'équipement :'), V(v(d.reference_equipement), { margin: [1, 4, 1, 4] })]]));
    content.push(gap(10));

    // Photo à gauche, contexte de mesures à droite
    var ctx = function (label, value, wide) {
      return t(wide ? [179, 50] : [77, 127], [[L(label, wide ? { fontSize: 7.5 } : {}), V(value)]], 0);
    };
    var photo = d.photo ? { image: d.photo, fit: [297, 170], alignment: 'center', margin: [0, 4, 0, 4] } : { text: '', margin: [0, 84, 0, 84] };
    content.push({ columns: [
      { width: 305, stack: [
        { table: { widths: [200], body: [[L('Photo de l\'équipement')]] }, layout: pdfBorderedLayout() },
        { table: { widths: [297], body: [[photo]] }, layout: pdfBorderedLayout() }
      ] },
      { width: 229, stack: [
        { text: 'Contexte de mesures :', bold: true, fontSize: 10, margin: [2, 10, 0, 12] },
        ctx('Local', v(d.local)), gap(11), ctx('Paillasse', v(d.paillasse)), gap(11),
        ctx('Obstacle gênant la réalisation d\'un point', v(d.obstacle_point_mesure), true), gap(11),
        ctx('Autre(s) sorbonne(s) en fonctionnement', v(d.autres_sorbonnes), true), gap(11),
        ctx('Ouvrants', v(d.ouvrants)), gap(11),
        ctx('Autre(s) dispositif(s) de ventilation', v(d.autres_dispositifs), true)
      ] }
    ], columnGap: 0, margin: [3, 0, 0, 0] });
    content.push(gap(14));

    // Mesures d'ambiance
    content.push(t([101, 103, 101, 102, 127], [
      [{ text: 'Mesures :', bold: true, fontSize: 10, colSpan: 2, border: NONE, margin: [12, 24, 0, 0] }, {},
        L('Pression atmosphérique (Pa)', { rowSpan: 2, margin: [1, 14, 1, 0] }),
        L('Différence de pression (Pa) entre le local et son environnement', { rowSpan: 2, margin: [1, 2, 1, 0] }),
        L('Appareils de mesure utilisés', { rowSpan: 2, margin: [1, 14, 1, 0] })],
      [L('Température (°C)'), L('Hygrométrie (%)'), {}, {}, {}],
      [V(v(d.temperature), { margin: [1, 6, 1, 6] }), V(v(d.hygrometrie), { margin: [1, 6, 1, 6] }), V(v(d.pression_atmospherique), { margin: [1, 6, 1, 6] }),
        V(v(d.difference_pression), { margin: [1, 6, 1, 6] }), V(v(d.appareils_mesure), { margin: [1, 6, 1, 6] })]
    ]));
    content.push(gap(16));

    // Test au fumigène + remarques
    content.push({ columns: [
      { width: 305, stack: [
        { text: 'Test au fumigène :', bold: true, fontSize: 10 },
        { text: 'visualisation des déplacements d\'air autour de l\'ouverture de travail', italics: true, fontSize: 8, alignment: 'center', margin: [0, 2, 150, 0] }
      ] },
      { width: 229, stack: [t([102, 127], [[L('Remarques complémentaires :', { margin: [1, 7, 1, 7] }), V(v(d.remarques_complementaires), { alignment: 'left', margin: [6, 12, 1, 7] })]], 0)] }
    ], margin: [3, 0, 0, 0] });
    content.push(gap(10));

    // Bas de page : constats du fumigène (gauche) / ouverture de travail (droite)
    var avant = d.annee_construction === 'Avant janvier 2005 - Norme XP X15-203 (h=400mm)';
    var apres = d.annee_construction === 'Après janvier 2005 - Norme NF EN 14175-4 (h=500mm)';
    var esp = function (x) { var n = parseFloat(x); return isNaN(n) ? v(x) : String(Math.round(n * 100) / 100); };
    content.push({ columns: [
      { width: 382, stack: [
        gap(12),
        t([153, 51], [[L('Présence de zones turbulentes'), V(v(d.zones_turbulentes))]], 0), gap(12),
        t([153, 51], [[L('Présence de zones mortes'), V(v(d.zones_mortes))]], 0), gap(12),
        t([153, 51], [[L('Le test au fumigène met-il en évidence des perturbations susceptibles de gêner le bon fonctionnement de la sorbonne ?'), V(v(d.perturbations), { margin: [1, 18, 1, 18] })]], 0),
        t([51, 102, 102, 51, 50], [
          [L('si oui :', { fontSize: 9 }), L('Mesures de vitesse d\'air du local (à 40cm devant la sorbonne; h : 90 puis 140 cm)', { rowSpan: 4, fontSize: 9 }),
            L('Recommandation : <0.2 m/s', { colSpan: 3 }), {}, {}],
          [{ text: '', border: NONE }, {}, L('Distances'), L('90 cm'), L('140 cm')],
          [{ text: '', border: NONE }, {}, L('Vitesses  (m/s)', { rowSpan: 2, margin: [1, 6, 1, 0] }), V(v(d.v90_mesuree), { rowSpan: 2, margin: [1, 6, 1, 0] }), V(v(d.v140_mesuree), { rowSpan: 2, margin: [1, 6, 1, 0] })],
          [{ text: '', border: NONE }, {}, {}, {}, {}]
        ], 0)
      ] },
      { width: 152, stack: [
        t([102, 50], [[L('Largeur (mm)'), V(v(d.largeur_mm))]], 0), gap(12),
        t([102, 50], [
          [L('Ouverture de travail h (mm) en fonction de l\'année de construction de la sorbonne', { colSpan: 2, margin: [1, 6, 1, 6] }), {}],
          [V('Avant janvier 2005 - Norme XP X15-203', { margin: [1, 8, 1, 8] }), V(avant ? '400' : '-', { margin: [1, 14, 1, 14] })],
          [V('Après janvier 2005 - Norme NF EN 14175-4', { margin: [1, 3, 1, 3] }), V(apres ? '500' : (avant ? '-' : v(d.h_mm)), { margin: [1, 10, 1, 10] })],
          [L('Surface de l\'ouverture', { margin: [1, 4, 1, 4] }), V(v(d.surface_ouverture), { margin: [1, 4, 1, 4] })],
          [L('Espace horizontal l entre 2 points (mm)', { fontSize: 8 }), V(esp(d.espace_horizontal))],
          [L('Espace vertical h entre 2 points (mm)', { fontSize: 8 }), V(esp(d.espace_vertical))]
        ], 0)
      ] }
    ], margin: [3, 0, 0, 0] });

    // ——— Page 2 ———
    content.push({ text: '', pageBreak: 'before' });
    content.push({ text: 'Dispositif de sécurité sur la sorbonne :', bold: true, fontSize: 10, margin: [25, 28, 0, 14] });
    [['Verrouillage de la paroi vitrée (butée)', d.verrouillage_paroi], ['Parachute sur la paroi vitrée', d.parachute_paroi],
      ['Mesure de la vitesse frontale', d.mesure_vitesse_frontale], ['Alarme sonore', d.alarme_sonore],
      ['Alarme visuelle', d.alarme_visuelle], ['Eclairage à l\'intérieur du volume', d.eclairage_interieur]].forEach(function (r, i) {
      if (i > 0) content.push(gap(12));
      content.push(t([229, 127], [[L(r[0]), V(v(r[1]))]]));
    });
    if (PDF_ASSETS.sorbonneSchema) {
      content.push(gap(34));
      content.push({ image: PDF_ASSETS.sorbonneSchema, width: 468, margin: [46, 0, 0, 0] });
    }

    // Relevé numéroté colonne par colonne (points 1-2-3 = 1re colonne), comme le schéma du Rapso
    var nbL = parseInt(d.nb_lignes, 10) || 3, nbC = parseInt(d.nb_colonnes, 10) || 0;
    if (Array.isArray(d.grille) && nbC) {
      content.push({ text: 'Relevé des vitesses mesurées', bold: true, fontSize: 10, alignment: 'center', margin: [28, 10, 534 - 334, 2] });
      var rel = [];
      for (var r = 0; r < nbL; r++) {
        var nums = [L('N° du point', { fillColor: '#D8D9D8', color: '#000000' })], vits = [L('Vitesse (m/s)')];
        for (var c = 0; c < nbC; c++) {
          nums.push(N(String(c * nbL + r + 1)));
          var g = d.grille[r] && d.grille[r][c];
          vits.push(V((g === undefined || g === '') ? '-' : String(g)));
        }
        rel.push(nums, vits);
      }
      content.push(t([102].concat(Array(nbC).fill(51)), rel, 28));
    }
    content.push(gap(14));

    var A = function (x) { return V(v(x)); };
    content.push(t([127, 51, 51, 51, 127, 127], [
      [{ text: '', border: [false, false, true, false] }, N('Valeurs mesurées', { rowSpan: 2, margin: [1, 8, 1, 0] }), N('Valeurs de référence', { rowSpan: 2, margin: [1, 8, 1, 0] }),
        N('Valeurs normes', { rowSpan: 2, margin: [1, 8, 1, 0] }), N('Avis', { colSpan: 2, margin: [1, 4, 1, 4] }), {}],
      [{ text: '', border: [false, false, true, false] }, {}, {}, {}, N('par rapport aux valeurs de référence'), N('par rapport aux valeurs normatives')],
      [N('Vitesse minimale (m/s)', { margin: [1, 6, 1, 6] }), A(d.vitesse_min_mesuree), A(d.vitesse_min_reference), A(d.vitesse_min_norme_valeur), A(d.vitesse_min_avis_reference), A(d.vitesse_min_avis_norme)],
      [N('Vitesse moyenne (m/s)', { margin: [1, 6, 1, 6] }), A(d.vitesse_moy_mesuree), A(d.vitesse_moy_reference), V('/'), A(d.vitesse_moy_avis_reference), V('/')],
      [N('Débit d\'air extrait (m³/h)', { margin: [1, 6, 1, 6] }), A(d.debit_mesure), A(d.debit_reference), V('-'), A(d.debit_avis_reference), A(d.debit_avis_reference)]
    ]));
    // Le commentaire n'est pas repris sur la fiche par le Rapso (seulement dans la synthèse).
  });
  return content;
}

// ————————————————————————————————————————————
// 5.8 — Cabines de peinture (dans le groupe "Installations avec captage localisé")
// ————————————————————————————————————————————
var PDF_TITRES_CABINE = {
  'Ouverte': 'CABINE DE PEINTURE OUVERTE',
  'Fermée': 'CABINE DE PEINTURE FERMEE',
  'Semi-fermée': 'CABINE DE PEINTURE SEMI-FERMEE',
  'Encombrant': 'CABINE DE PEINTURE D\'ENCOMBRANT'
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
  content = content.concat(pdfMethodoPage(legal, { titre: 'Méthodologie de vérification de la\nventilation des cabines de peinture' }));
  content.push({ text: '', pageBreak: 'after' });
  // Maquette du Rapso réel (Nord Réducteurs p. 29-30), bloc x 27 -> 541 (514 pt).
  var v = formatCrosstabValue;
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var NONE = [false, false, false, false];
  var t = function (w, body) { return pdfTight(pdfTable(w, body)); };
  var bar = function (txt, w) { return t([w || 514], [[L(txt, { fontSize: 10.5 })]]); };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };
  var m6 = { margin: [1, 6, 1, 6] }, m12 = { margin: [1, 12, 1, 12] };

  function pdfCabineVitesseTable(d) {
    var par = d.v1_recommandee_par ? 'par ' + d.v1_recommandee_par : 'par la Norme 16985';
    var rows = [[{ text: '', border: NONE }, L('Valeurs mesurées', m12), L('Valeurs de référence', m12), L('Valeurs recommandées ' + par, { fontSize: 8, margin: [1, 8, 1, 8] }),
      L('Avis par rappport aux valeurs de référence', m6)]];
    rows.push([L('Vitesse moyenne (m/s)', { margin: [1, 1, 1, 1] }), V(v(d.v1_mesuree), m6), V(v(d.v1_reference), m6), V(v(d.v1_valeur_recommandee), m6), V(v(d.v1_avis), m6)]);
    if (d.v2_active === 'Oui') {
      rows.push([L('Vitesse minimale (m/s)', { margin: [1, 1, 1, 1] }), V(v(d.v2_mesuree), m6), V(v(d.v2_reference), m6), V(v(d.v2_valeur_recommandee), m6), V(v(d.v2_avis), m6)]);
    }
    return t([78, 102, 103, 102, 129], rows);
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    var sousTitre = PDF_TITRES_CABINE[d.type_cabine] || 'CABINE DE PEINTURE';
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    content.push(t([78, 256, 77, 103], [
      [L('Marque', m6), V(v(d.marque), m6), L('Emplacement', m6), V(v(d.batiment), Object.assign({ alignment: 'left' }, m6))],
      [L('Date du contrôle', { margin: [1, 0, 1, 12] }), V(v(d.date_controle), m6), L('description de la cabine', { margin: [1, 4, 1, 4], rowSpan: 2 }), V(v(d.reference_equipement), { alignment: 'left', margin: [1, 4, 1, 4], rowSpan: 2 })],
      [{ text: '', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }, {}, {}]
    ]));
    content.push(gap(12));

    var photo = d.photo ? { image: d.photo, fit: [226, 190], alignment: 'center', margin: [0, 2, 0, 2] } : { text: '', margin: [0, 70, 0, 70] };
    content.push({ columns: [
      { width: 231, stack: [
        { table: { widths: [125], body: [[L('Photo de l\'installation')]] }, layout: pdfBorderedLayout() },
        { table: { widths: [227], body: [[photo]] }, layout: pdfBorderedLayout() }
      ] },
      { width: 283, stack: [t([78, 76, 77, 52], [
        [L('Type de flux', m6), V(v(d.type_flux), Object.assign({ colSpan: 3 }, m6)), {}, {}],
        [L('Nature des produits à peindre', { margin: [1, 2, 1, 2] }), V(v(d.nature_produits), Object.assign({ colSpan: 3, fontSize: 11 }, m12)), {}, {}],
        [L('Pulvérisation', m12), V(v(d.pulverisation), m12), L('Zone de travail', m12), V(v(d.zone_travail), m12)],
        [L('Etat visuel de la cabine', { colSpan: 4, fontSize: 10.5 }), {}, {}, {}],
        [V(v(d.etat_visuel_cabine), { colSpan: 4, margin: [1, 14, 1, 14] }), {}, {}, {}]
      ])] }
    ], columnGap: 0 });
    content.push(t([231, 283], [
      [L('Test fumigène', { colSpan: 2, fontSize: 10.5 }), {}],
      [L('Vérification de la direction du flux', m6), V(v(d.direction_flux), m6)],
      [L('Etat des filtres', m6), V(v(d.etat_filtres), m6)]
    ]));
    content.push(bar('Vitesse d\'air dans la cabine vide'));
    content.push(gap(12));
    content.push(pdfCabineVitesseTable(d));
    content.push(gap(12));
    content.push(bar('Débit d\'air dans la cabine vide'));
    content.push(gap(12));
    content.push(t([78, 102, 103, 129], [
      [{ text: '', border: NONE }, L('Valeurs mesurées', m12), L('Valeurs de référence', m12), L('Avis par rappport aux valeurs de référence', m6)],
      [L('Debit (m3/h)', m6), V(v(d.debit_mesure), m6), V(v(d.debit_reference), m6), V(v(d.debit_avis), m6)]
    ]));

    // ——— Page 2 : conclusion, observation, mesure de la cabine vide ———
    content.push({ text: '', pageBreak: 'before' });
    content.push(bar('Conclusion'));
    content.push(gap(12));
    content.push(t([78, 256, 180], [
      [L('Avis par rapport à la réglementation et/ou aux préconisations (dossier de valeurs de référence si existant, norme 16985, guide INRS) vis-à-vis des cabines de peinture :', { colSpan: 2 }), {},
        V(v(d.conclusion), { alignment: 'left', margin: [4, 12, 1, 12] })],
      [L('Observation', { margin: [1, 12, 1, 12] }), V(v(d.observations), { colSpan: 2, alignment: 'left', margin: [4, 12, 4, 12] }), {}]
    ]));
    if (d.largeur_cabine || d.longueur_cabine) {
      content.push(gap(24));
      content.push(bar('Mesure de la cabine vide'));
      content.push(gap(12));
      content.push(t([78, 77], [[L('Hauteur(m)'), V(v(d.largeur_cabine))], [L('Longueur(m)'), V(v(d.longueur_cabine))]]));
      content.push(gap(36));
      // Grille : positions en longueur (colonnes) et en hauteur (lignes, du haut vers le bas), comme le Rapso
      var nbA = parseInt(d.vitesse_nb_axes, 10) || 0, nbP = parseInt(d.vitesse_nb_points, 10) || 0;
      var H = parseFloat(String(d.largeur_cabine || '').replace(',', '.')), Lg = parseFloat(String(d.longueur_cabine || '').replace(',', '.'));
      if (Array.isArray(d.vitesse_grid) && nbA && nbP) {
        var pos = function (x) { return pdfFrNumber(String(Math.round(x * 100) / 100)); };
        var body = [[L('L/l')].concat(Array.apply(null, Array(nbP)).map(function (_, c) { return L(isNaN(Lg) ? '' : pos((c + 0.5) * Lg / nbP)); }))];
        for (var r = 0; r < nbA; r++) {
          body.push([L(isNaN(H) ? '' : pos((nbA - r - 0.5) * H / nbA))].concat(Array.apply(null, Array(nbP)).map(function (_, c) {
            var g = d.vitesse_grid[r] && d.vitesse_grid[r][c]; return V((g === undefined || g === '') ? '-' : String(g));
          })));
        }
        content.push(t([26].concat(Array(nbP).fill(26)), body));
        content.push(gap(24));
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
  var titre = 'Box préparation peinture', sousTitre = 'BOX DE PREPARATION DES PEINTURES';
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
  // Référentiel : affiché sur la page intercalaire de la section (cf. SECTION_GROUPS.divNote).
  // Maquette du Rapso réel (Nord Réducteurs p. 39-41).
  var v = formatCrosstabValue;
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var NONE = [false, false, false, false];
  var t = function (w, body, ind) { var x = pdfTight(pdfTable(w, body)); if (ind) x.margin = [ind, 0, 0, 0]; return x; };
  var bar = function (txt) { return t([540], [[L(txt, { fontSize: 11 })]]); };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };
  var m6 = { margin: [1, 6, 1, 6] }, m12 = { margin: [1, 12, 1, 12] };
  // Verdict de chaque critère, affiché en préfixe comme dans le Rapso ("Satisfaisant : ...").
  var apos = function (x) { return String(x || '').replace(/[’']/g, "'").trim(); };
  var avec = function (val, bon) { return val ? ((apos(val) === apos(bon) ? 'Satisfaisant' : 'Non satisfaisant') + ' : ' + val) : '-'; };
  list.forEach(function (inst, idx) {
    var d = inst.data;
    var n = Math.min(parseInt(d.nombre_captage, 10) || 0, 4);
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    content.push({ columns: [
      { width: 309, stack: [t([155, 154], [
        [L('Activité et référence du local', m6), V(v(d.activite_reference_local), Object.assign({ bold: true }, m6))],
        [L('Date de contrôle'), V(v(d.date_controle), { bold: true })],
        [L('Mesures réalisées :', m12), V('Débits des captages\nVitesse d\'extraction', { fontSize: 11, margin: [1, 4, 1, 4] })],
        [L('Nombre de captage présent dans le box', { alignment: 'left', margin: [4, 1, 1, 1] }), V(String(n), Object.assign({ bold: true }, m6))]
      ])] },
      { width: 231, stack: [t([77, 154], [[L('Bâtiment :', m12), V(v(d.batiment), Object.assign({ bold: true }, m12))]])] }
    ] });
    content.push(gap(12));

    var etat = v(d.etat_visuel_installations);
    var photo = d.photo ? { image: d.photo, fit: [300, 170], alignment: 'center', margin: [0, 2, 0, 2] } : { text: '', margin: [0, 84, 0, 84] };
    content.push({ columns: [
      { width: 309, stack: [
        { table: { widths: [202], body: [[L('Photo de l\'équipement', { fontSize: 11 })]] }, layout: pdfBorderedLayout() },
        { table: { widths: [304], body: [[photo]] }, layout: pdfBorderedLayout() }
      ] },
      { width: 231, stack: [
        t([231], [[L('Etat  visuel des installations', { fontSize: 11 })], [V(etat, { margin: [2, 18, 2, 18] })]]),
        gap(26),
        t([231], [[L('Principe de ventilation', { fontSize: 11 })], [V(avec(d.type_ventilation, 'Le renouvellement d’air du local est assuré par un captage localisé'), { alignment: 'left', margin: [6, 30, 4, 30] })]])
      ] }
    ] });
    content.push(gap(24));

    content.push(bar('Caractéristiques de la ventilation'));
    content.push(gap(12));
    var concl = d.conclusion_renouvellement === 'Non Satisfaisant' ? 'Non satisfaisant\n< 50 Volumes par heure' : v(d.conclusion_renouvellement);
    content.push(t([129, 103, 51, 103, 51, 103], [
      [L('Ventilation naturelle permanente', { margin: [1, 2, 1, 2] }), V(avec(d.ventilation_naturelle, 'Présence d’ouvertures haute et basse, diamétralement opposées'), { colSpan: 5, alignment: 'left', margin: [6, 6, 1, 6] }), {}, {}, {}, {}],
      [L('Asservissement', m6), V(avec(d.asservissement, 'Ventilation mécanique asservie à la présence de l’opérateur'), { colSpan: 5, alignment: 'left', margin: [6, 6, 1, 6] }), {}, {}, {}, {}],
      [L('Taux de renouvellement', m12), V('Volume du local (m3)', m12), V(v(d.volume_local), m12), V('Volume par heure', m12), V(v(d.volume_par_heure), m12), V(concl, { margin: [1, 2, 1, 2] })]
    ]));

    // ——— Page 2 : vitesses et débits par captage, conclusion, observation, mesures dans le conduit ———
    content.push({ text: '', pageBreak: 'before' });
    content.push(bar('Mesure de la vitesse d\'extraction'));
    content.push(gap(14));
    var caps = [];
    for (var c = 1; c <= n; c++) caps.push(c);
    if (caps.length) {
      content.push(t([78].concat(caps.map(function () { return 77; })), [
        [{ text: '', border: NONE }].concat(caps.map(function (c) { return L('Captage n°' + c, m6); })),
        [L('Vitesse moyenne(m/s)', m6)].concat(caps.map(function (c) { return V(v(d['captage' + c + '_vitesse_moyenne']), m12); })),
        [L('Débit mesuré (m3/h)', m6)].concat(caps.map(function (c) { return V(v(d['captage' + c + '_debit']), m12); }))
      ], 26));
      content.push(gap(12));
    }
    content.push(t([104, 78, 128, 103], [[L('Débit d\'extraction du box', { margin: [1, 2, 1, 2] }), V(v(d.debit_extraction_box), m6),
      L('Débit minimal (m3/h) pour 50 volumes/heure', { margin: [1, 2, 1, 2] }), V(v(d.debit_minimal_50vh), m6)]], 26));
    content.push(gap(48));
    content.push(bar('Conclusion'));
    content.push(gap(12));
    content.push(t([386, 154], [[V('Avis par rapport à la réglementation  et/ou aux préconisations (dossier de valeurs de référence si existant, normes, guide INRS) :', { alignment: 'left', margin: [6, 2, 4, 2] }),
      V(v(d.avis), { margin: [1, 7, 1, 7] })]]));
    content.push(gap(12));
    content.push(t([540], [[L('Observation', { fontSize: 11 })], [V(v(d.observation), { alignment: 'left', margin: [8, 10, 4, 10] })]]));

    caps.forEach(function (c) {
      var p = 'captage' + c;
      if (!d[p + '_forme_conduit']) return;
      var vit = d[p + '_vitesse_mode'] === 'Grille de points' ? d[p + '_vitesse_moyenne'] : d[p + '_vitesse_directe'];
      content.push({ stack: [gap(24)].concat(pdfConduitBlock({
        titre: 'Mesure de la vitesse d\'extraction ' + c,
        forme: d[p + '_forme_conduit'], temperature: d[p + '_temperature'], pression: d[p + '_pression_statique'], masse: d[p + '_masse_volumique'],
        d1: d[p + '_diametre_cote1'], d2: d[p + '_cote2'], vitesse: vit || d[p + '_vitesse_moyenne'], debit: d[p + '_debit'],
        grid: d[p + '_vitesse_mode'] === 'Grille de points' ? d[p + '_vitesse_grid'] : null, nbAxes: d[p + '_vitesse_nb_axes'], nbPoints: d[p + '_vitesse_nb_points'],
        posDec: 0, largeurD1: true, debitRow: true
      })), unbreakable: true });
    });
    if (d.commentaire) {
      content.push(gap(24));
      content.push(t([540], [[L('Commentaire / Information')], [V(v(d.commentaire), { alignment: 'left', margin: [8, 14, 4, 14] })]]));
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
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT - 24;

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
  var titre = 'Gaz d’échappement', sousTitre = 'Captage des gaz d\'échappement';
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
  // Référentiels : affichés sur la page intercalaire de la section (cf. SECTION_GROUPS.divNote).
  // Maquette du Rapso réel sur deux pages (Verdun p. 166-167).
  var v = formatCrosstabValue;
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var t = function (w, body, ind) { var x = pdfTight(pdfTable(w, body)); if (ind) x.margin = [ind, 0, 0, 0]; return x; };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };
  var m6 = { margin: [1, 6, 1, 6] }, m12 = { margin: [1, 12, 1, 12] };
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var typeVehicule = d.type_vehicule === 'AUTRES' ? v(d.type_vehicule_autre) : v(d.type_vehicule);
    var photo = d.photo ? { image: d.photo, fit: [227, 180], alignment: 'center', margin: [0, 2, 0, 2] } : { text: '', margin: [0, 88, 0, 88] };
    content.push({ columns: [
      { width: 284, stack: [
        t([78, 206], [
          [L('Bâtiment', m6), V(v(d.batiment), m6)], [L('Atelier', m6), V(v(d.atelier), m6)],
          [L('Ref. de l\'équipement et/ou Implantation', m6), V(v(d.reference_equipement), m12)], [L('Date du contrôle', m6), V(v(d.date_controle), m6)]
        ]),
        gap(12),
        t([284], [[L('Type d\'équipement')], [V(typeVehicule, Object.assign({ fontSize: 11 }, m6))], [V(v(d.type_captage), m6)]])
      ] },
      { width: 232, stack: [
        { table: { widths: [228], body: [[L('Photo de l\'équipement')], [photo]] }, layout: pdfBorderedLayout() }
      ] }
    ], columnGap: 24 });

    var etat = v(d.etat_visuel_installations);
    content.push({ text: 'Examen visuel de l\'état des éléments de l\'installation', bold: true, fontSize: 10, margin: [2, 18, 0, 10] });
    content.push({ columns: [
      { width: 232, stack: [t([105, 127], [
        [L('Type de captage adapté à la situation', { margin: [1, 2, 1, 2] }), V(v(d.type_captage_adapte), m6)],
        [L('Etat visuel des installations', { margin: [1, 18, 1, 18] }), V(etat, { margin: [1, 24, 1, 24] })]
      ])] },
      { width: '*', stack: [
        { text: 'Commentaire :', bold: true, fontSize: 10 },
        { text: v(d.etat_visuel_si_autres), fontSize: 10, margin: [0, 2, 0, 0] }
      ] }
    ], columnGap: 27 });
    content.push(gap(14));

    var vitesse = d.vitesse_mode === 'Grille de points' ? d.vitesse_moyenne_grille : d.vitesse;
    content.push(t([127, 413], [[L('Mesures de la vitesse', m6), V(d.mesure_bouche === undefined ? 'sur la surface de la bouche d\'aspiration' : v(d.mesure_bouche), m6)]]));
    content.push(t([52, 79, 79, 78, 78, 80], [
      [L('Réseau d\'air', { margin: [1, 12, 1, 12] }), L('Vitesse (en m/s)', { margin: [1, 12, 1, 12] }), L('Débit mesuré (en m³/h)', { margin: [1, 12, 1, 12] }),
        L('Débit de référence (en m³/h)', { margin: [1, 6, 1, 6] }), L('Débit minimum préconisé INRS (en m³/h)'), L('Débit minimum calculé * (en m³/h)', { margin: [1, 6, 1, 6] })],
      [V('Extrait', m6), V(v(vitesse), m6), V(formatCrosstabDebit(d.debit_mesure), m6), V(v(d.debit_reference), m6), V(v(d.debit_min_inrs), m6), V(v(d.debit_min_calcule), m6)]
    ], 53));
    content.push({ text: '*calculé à partir de la cylindrée du véhicule en litres : ' + v(d.cylindree) + ' et du régime du moteur en tours/min : ' + v(d.regime_moteur) + '.',
      fontSize: 7.5, margin: [55, 2, 0, 18] });
    content.push(t([413, 127], [[L('Conclusion', { colSpan: 2 }), {}], [V('Avis par rapport à la valeur attendue', m6), V(v(d.avis_constructeur), m6)]]));
    content.push(gap(24));
    content.push(t([540], [[L('Observations')], [V(v(d.observation), { margin: [6, 12, 6, 12] })]]));

    // ——— Page 2 : mesure dans le conduit + commentaire ———
    if (d.forme_section) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(gap(10));
      content = content.concat(pdfConduitBlock({
        titre: 'Mesure de la vitesse sur la surface de la bouche d\'aspiration d\'air extrait',
        forme: d.forme_section, temperature: d.temperature_conduit, pression: d.pression_statique, masse: d.masse_volumique,
        d1: d.diametre_cote1, d2: d.cote2, vitesse: vitesse,
        grid: d.vitesse_mode === 'Grille de points' ? d.vitesse_grid : null, nbAxes: d.vitesse_nb_axes, nbPoints: d.vitesse_nb_points,
        paroiLabel: 'Distance / paroi (mm)'
      }));
      content.push(gap(36));
      content.push(t([540], [[L('Commentaire / Information')], [V(v(d.commentaire), { alignment: 'left', margin: [8, 28, 4, 28] })]]));
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.12 — Menuiserie (réseau d'aspiration)
// ————————————————————————————————————————————
function pdfBuildAnnexeMenuiserie(list, logoDataUrl) {
  var titre = 'Menuiserie', sousTitre = 'Machine à bois extracteur';
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
  // Référentiels : affichés sur la page intercalaire de la section (cf. SECTION_GROUPS.divNote).
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT - 24;
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
      // Bloc conduit commun, maquette du Rapso (cf. pdfConduitBlock).
      content = content.concat(pdfConduitBlock({
        titre: 'Section de mesure',
        forme: d.forme_section, temperature: d.temperature_conduit, pression: d.pression_statique, masse: d.masse_volumique,
        d1: d.diametre_cote1, d2: d.cote2, vitesse: vitesse || d.vitesse,
        grid: d.vitesse_mode === 'Grille de points' ? d.vitesse_grid : null, nbAxes: d.vitesse_nb_axes, nbPoints: d.vitesse_nb_points
      }));
    }
  });
  return content;
}

// ————————————————————————————————————————————
// 5.13 — Menuiserie (machines à bois)
// ————————————————————————————————————————————
function pdfBuildAnnexeMenuiserieMAB(list, logoDataUrl) {
  var titre = 'Machine à bois', sousTitre = 'Machine à bois';
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
  // Référentiels : affichés sur la page intercalaire de la section (cf. SECTION_GROUPS.divNote).
  // Maquette du Rapso réel sur deux pages (Verdun p. 170-171).
  var v = formatCrosstabValue;
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var NONE = [false, false, false, false];
  var t = function (w, body) { return pdfTight(pdfTable(w, body)); };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };
  var big = { margin: [1, 12, 1, 12] };
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    content.push(t([155, 205, 51, 129], [
      [L('Référence de la machine à bois', { margin: [1, 6, 1, 6] }), V(v(d.reference_machine), { margin: [1, 6, 1, 6] }), L('Date de contrôle', { fontSize: 9.5 }), V(v(d.date_controle), { margin: [1, 6, 1, 6] })],
      [L('Type de machine à bois', { margin: [1, 6, 1, 6] }), V(v(d.type_machine), { margin: [1, 6, 1, 6] }), { text: '', border: [true, false, false, false], colSpan: 2 }, {}]
    ]));
    content.push(gap(24));

    var photo = d.photo ? { image: d.photo, fit: [300, 210], alignment: 'center', margin: [0, 2, 0, 2] } : { text: '', margin: [0, 104, 0, 104] };
    content.push({ columns: [
      { width: 308, stack: [
        { table: { widths: [206], body: [[L('Photo de l\'équipement')]] }, layout: pdfBorderedLayout() },
        { table: { widths: [303], body: [[photo]] }, layout: pdfBorderedLayout() }
      ] },
      { width: 232, stack: [
        gap(14),
        t([232], [[L('Etat  visuel du réseau d\'aspiration', { fontSize: 11 })], [V(v(d.etat_visuel_reseau), { margin: [2, 10, 2, 10] })]]),
        gap(26),
        t([232], [[L('Conditions de mesure', { fontSize: 11 })], [V(v(d.simultaneites), { alignment: 'left', margin: [6, 54, 4, 54] })]])
      ] }
    ] });
    content.push(gap(28));

    content.push(t([540], [[L('Mesure de la vitesse de transport', { fontSize: 11 })]]));
    content.push(gap(14));
    content.push(t([127, 78, 78, 51, 103, 103], [
      [{ text: '', border: NONE }, L('Valeur mesurée', big), L('Type de polluants', { margin: [1, 6, 1, 6] }), L('Valeur de référence', { margin: [1, 6, 1, 6] }),
        L('Valeur recommandée par l\'INRS(ED750)', { margin: [1, 6, 1, 6] }), L('Avis par rapport aux valeurs de référence', { margin: [1, 6, 1, 6] })],
      [L('Vitesse moyenne(m/s)', big), V(v(d.vitesse_moyenne), big), V('-', big), V(v(d.vitesse_reference), big), V(v(d.vitesse_inrs_ed750), big), V(v(d.vitesse_avis), big)]
    ]));
    content.push(gap(24));
    content.push(t([463], [[L('Calcul du débit', { fontSize: 11 })]]));
    content.push(gap(14));
    content.push(t([127, 78, 52, 103, 103], [
      [{ text: '', border: NONE }, L('Valeur mesurée', big), L('Valeur de référence', { margin: [1, 6, 1, 6] }), L('Valeur recommandée par l\'INRS(ED750)', { margin: [1, 6, 1, 6] }),
        L('Avis par rapport aux valeurs de référence', { margin: [1, 6, 1, 6] })],
      [L('Débit calculé (m3/h)', { fontSize: 11, margin: [1, 12, 1, 12] }), V(v(d.debit), big), V(v(d.debit_reference), big), V(v(d.debit_inrs_ed750), big), V(v(d.debit_avis), big)]
    ]));
    content.push(gap(24));
    content.push(t([540], [[L('Conclusion', { fontSize: 11 })]]));
    content.push(gap(14));
    content.push(t([386, 154], [[V('Avis par rapport à la réglementation  et/ou aux préconisations (dossier de valeurs de référence si existant, normes, guide INRS) :', { alignment: 'left', margin: [4, 2, 4, 2] }),
      V(v(d.conclusion_avis), { margin: [1, 7, 1, 7] })]]));

    // ——— Page 2 : observation puis mesure dans le conduit ———
    content.push({ text: '', pageBreak: 'before' });
    content.push(t([540], [[L('Observation')], [V(v(d.observation), { alignment: 'left', margin: [8, 2, 4, 2] })]]));
    if (d.forme_conduit) {
      var vitesse = d.vitesse_mode === 'Grille de points' ? null : d.vitesse_directe;
      content = content.concat(pdfConduitBlock({
        titre: 'Mesure de la vitesse de transport',
        forme: d.forme_conduit, temperature: d.temperature_conduit, pression: d.pression_statique, masse: d.masse_volumique,
        d1: d.diametre_cote1, d2: d.cote2, vitesse: vitesse || d.vitesse_moyenne, debit: d.debit,
        grid: d.vitesse_mode === 'Grille de points' ? d.vitesse_grid : null, nbAxes: d.vitesse_nb_axes, nbPoints: d.vitesse_nb_points,
        posDec: 0
      }));
    }
    if (d.commentaire) {
      content.push(gap(24));
      content.push(t([540], [[L('Commentaire / Information')], [V(v(d.commentaire), { alignment: 'left', margin: [8, 14, 4, 14] })]]));
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
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT - 24;
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
    // Bornée sur nombre_points_mesure (même correction que calculations.js total_debit) : un point
    // masqué du wizard après une baisse du compteur ne doit pas non plus réapparaître dans le rapport.
    var nPointsMesure = d.nombre_points_mesure ? (parseInt(d.nombre_points_mesure, 10) || 0) : 10;
    for (var i = 1; i <= nPointsMesure; i++) {
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
  var W_LABEL = PT(3200), W_IDENT = PT(5200), W_PHOTO = PDF_ANNEXE_CONTENT_WIDTH - W_IDENT - 24;
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
  var titre = 'Équipement', sousTitre = 'EQUIPEMENTS DIVERS';
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
  content = content.concat(pdfMethodoPage(legal, { titre: 'Méthodologie de vérification de la ventilation\nd\'équipements divers', image: { key: 'equipements', x: 84, y: 186, w: 214, h: 356 } }));
  content.push({ text: '', pageBreak: 'after' });
  // Maquette du Rapso réel sur deux pages (EMFI Haguenau p. 83-84).
  var v = formatCrosstabValue;
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var B = function (t, extra) { return V(t, Object.assign({ bold: true }, extra || {})); };
  var NONE = [false, false, false, false];
  var t = function (w, body) { return pdfTight(pdfTable(w, body)); };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    var choix = d.mesures_choisies || [];
    var avecVpe = choix.indexOf('Vitesse au point d’émission') !== -1 || choix.indexOf("Vitesse au point d'émission") !== -1;
    var avecVt = choix.indexOf('Vitesse de transport') !== -1;

    content.push(t([155, 205, 51, 129], [
      [L('Activité et référence du local', { margin: [1, 6, 1, 6] }), B(v(d.localisation), { margin: [1, 6, 1, 6] }), L('Bâtiment :', { margin: [0, 12, 0, 0], fontSize: 9 }), B(v(d.batiment), { margin: [1, 12, 1, 0] })]
    ]));
    content.push(t([155, 155, 77, 153], [
      [L('Date de contrôle'), B(v(d.date_controle)), L('Ref. de l\'équipement :', { rowSpan: 2, margin: [1, 10, 1, 0] }), B(v(d.reference_equipement), { rowSpan: 2, margin: [1, 4, 1, 4] })],
      [L('Mesures réalisées :', { margin: [1, 8, 1, 8] }), V(choix.length ? choix.join('\n') : '-', { margin: [1, 4, 1, 4] }), {}, {}]
    ]));
    content.push(gap(12));

    var photo = d.photo ? { image: d.photo, fit: [300, 170], alignment: 'center', margin: [0, 4, 0, 4] } : { text: '', margin: [0, 84, 0, 84] };
    content.push({ columns: [
      { width: 309, stack: [
        { table: { widths: [202], body: [[L('Photo de l\'équipement')]] }, layout: pdfBorderedLayout() },
        { table: { widths: [304], body: [[photo]] }, layout: pdfBorderedLayout() }
      ] },
      { width: 231, stack: [
        t([231], [[L('Etat  visuel du réseau d\'aspiration', { fontSize: 11 })], [V(v(d.etat_visuel_reseau), { margin: [2, 30, 2, 30] })]]),
        t([77, 154], [[L('Test fumigène', { colSpan: 2, fontSize: 11 }), {}], [L('Observation', { fontSize: 11, margin: [1, 6, 1, 6] }), V(v(d.test_fumigene), { margin: [1, 6, 1, 6] })]])
      ] }
    ] });
    content.push(gap(24));

    if (avecVpe) {
      content.push(t([540], [[L('Mesure de la vitesse au point d\'émission', { fontSize: 11 })]]));
      content.push(gap(12));
      content.push(t([78, 51, 51, 154, 103, 103], [
        [{ text: '', border: NONE }, L('Valeur mesurée', { margin: [1, 2, 1, 2] }), L('Valeur de référence', { margin: [1, 2, 1, 2] }), L('Condition de dispersion du polluant', { margin: [1, 2, 1, 2] }),
          L('Valeur recommandée par l\'INRS(ED695)', { margin: [1, 2, 1, 2] }), L('Avis par rapport aux valeurs de référence', { margin: [1, 2, 1, 2] })],
        [L('Vitesse (m/s)', { margin: [1, 12, 1, 12] }), V(v(d.vpe_mesuree), { margin: [1, 12, 1, 12] }), V(v(d.vpe_reference), { margin: [1, 12, 1, 12] }),
          V(v(d.vpe_conditions_dispersion), { margin: [1, 6, 1, 6] }), V(v(d.vpe_inrs), { margin: [1, 12, 1, 12] }), V(v(d.avis_vpe), { margin: [1, 12, 1, 12] })]
      ]));
      content.push(gap(24));
    }
    if (avecVt) content.push(pdfFicheVtTable(d));

    // ——— Page 2 ———
    content.push({ text: '', pageBreak: 'before' });
    content.push(t([540], [[L('Conclusion', { fontSize: 11 })]]));
    content.push(gap(12));
    content.push(t([385, 155], [[V('Avis par rapport à la réglementation  et/ou aux préconisations (dossier de valeurs de référence si existant, normes, guide INRS) :', { margin: [4, 2, 4, 2] }),
      V(v(d.avis), { margin: [1, 7, 1, 7] })]]));
    content.push(gap(12));
    content.push(t([540], [[L('Observation')], [V(v(d.observation), { alignment: 'left', margin: [8, 10, 4, 10] })]]));
    if (avecVt) {
      content.push(gap(60));
      content = content.concat(pdfConduitBlock({
        titre: 'Mesure de la vitesse de transport', forme: d.forme_section || d.gaine, temperature: d.temperature_conduit,
        pression: d.pression_statique, masse: d.masse_volumique, vitesse: d.vt_mesuree,
        d1: d.diametre_cote1, d2: d.cote2, debit: d.debit_vt
      }));
    }
    content.push(gap(36));
    content.push(t([540], [[L('Commentaire / Information')], [V(v(d.remarque), { alignment: 'left', margin: [8, 14, 4, 14] })]]));
  });
  return content;
}

// ————————————————————————————————————————————
// 5.17 — Locaux de charge d'accumulateurs — grille de mesures rééchelonnée
// proportionnellement (somme d'origine 10340 → 9635) pour tenir dans PDF_ANNEXE_CONTENT_WIDTH.
// ————————————————————————————————————————————
function pdfBuildAnnexeLocauxCharge(list, logoDataUrl) {
  // Maquette du Rapso réel (EMFI Haguenau p. 96-98). Les référentiels figurent sur la page
  // intercalaire de la section (cf. pdfSectionDividerPage), plus sur une page à part.
  var titre = 'Local de charge', sousTitre = 'LOCAUX DE CHARGE D\'ACCUMULATEURS';
  var content = [];
  if (!list || list.length === 0) {
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));
    content.push({ text: 'Aucun local renseigné.', italics: true, fontSize: FS(20) });
    return content;
  }
  var v = formatCrosstabValue;
  var L = function (t, extra) { return Object.assign(pdfHeaderCell(t, { size: 11 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var V = function (t, extra) { return Object.assign(pdfBodyCell(t, { center: true, size: 10 }), { margin: [1, 0, 1, 0] }, extra || {}); };
  var B = function (t, extra) { return V(t, Object.assign({ bold: true }, extra || {})); };
  var NONE = [false, false, false, false];
  var t = function (w, body, ind) { var x = pdfTight(pdfTable(w, body)); if (ind) x.margin = [ind, 0, 0, 0]; return x; };
  var bar = function (text) { return t([540], [[L(text)]]); };
  var gap = function (h) { return { text: '', margin: [0, 0, 0, h] }; };
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logoDataUrl));

    content.push(t([155, 154, 77, 154], [
      [L('Localisation :', { margin: [1, 6, 1, 6] }), B(v(d.localisation), { margin: [1, 6, 1, 6] }), L('Bâtiment :', { margin: [1, 6, 1, 6] }), B(v(d.batiment), { margin: [1, 6, 1, 6] })],
      [L('Ref. de l\'équipement :', { margin: [1, 6, 1, 6] }), B(v(d.reference_equipement)), L('Date de contrôle :'), B(v(d.date_controle), { margin: [1, 6, 1, 6] })]
    ]));
    content.push(gap(12));

    var etat = v(d.etat_visuel);
    if (Array.isArray(d.etat_visuel) && d.etat_visuel.indexOf('Autres') !== -1 && d.si_autre) etat += ' (' + d.si_autre + ')';
    var photo = d.photo ? { image: d.photo, fit: [300, 210], alignment: 'center', margin: [0, 4, 0, 4] } : { text: '', margin: [0, 100, 0, 100] };
    content.push({ columns: [
      { width: 309, stack: [
        { table: { widths: [305], body: [[L('Photo du local')]] }, layout: pdfBorderedLayout() },
        { table: { widths: [304], body: [[photo]] }, layout: pdfBorderedLayout() }
      ] },
      { width: 231, stack: [t([154, 77], [
        [L('Ventilation permanente', { margin: [1, 12, 1, 12] }), V(v(d.ventilation_permanente), { margin: [1, 12, 1, 12] })],
        [L('Ventilation asservie aux chargeurs', { margin: [1, 6, 1, 6] }), V(v(d.ventilation_asservie), { margin: [1, 12, 1, 12] })],
        [L('Débit variable', { margin: [1, 6, 1, 6] }), V(v(d.debit_variable), { margin: [1, 6, 1, 6] })],
        [L('Réglage du variateur', { margin: [1, 18, 1, 18] }), V(v(d.reglage_variateur), { margin: [1, 18, 1, 18] })],
        [L('Etat visuel des installations', { margin: [1, 18, 1, 18] }), V(etat, { margin: [1, 18, 1, 18] })]
      ])] }
    ] });
    content.push(gap(12));

    content.push(bar('Mesure du Débit'));
    content.push(gap(12));
    content.push(t([78, 77, 154, 77, 154], [
      [{ text: '', border: NONE }, L('Valeur de référence', { margin: [1, 6, 1, 6] }), L('Valeur recommandée par le guide INRS', { margin: [1, 6, 1, 6] }),
        L('Débit mesuré du local', { margin: [1, 6, 1, 6] }), L('Avis par rapport aux valeurs de référence', { margin: [1, 6, 1, 6] })],
      [L('Débit (m3/h)', { margin: [1, 6, 1, 6] }), V(v(d.valeur_reference), { margin: [1, 6, 1, 6] }), V(v(d.valeur_inrs), { margin: [1, 6, 1, 6] }),
        V(v(d.debit_mesure_local), { margin: [1, 6, 1, 6] }), V(v(d.avis), { margin: [1, 6, 1, 6] })]
    ]));
    content.push(gap(12));
    content.push(t([386, 154], [
      [L('Conclusion', { colSpan: 2 }), {}],
      [V('Le dispositif doit satisfaire aux préconisations indiquées par l\'INRS.', { margin: [1, 6, 1, 6] }), V(v(d.avis), { margin: [1, 6, 1, 6] })]
    ]));
    content.push(gap(12));
    content.push(t([540], [[L('Observations')], [V(v(d.observation), { alignment: 'left', margin: [8, 2, 4, 76] })]]));

    // ——— Calcul du débit (mesure sur les grilles) puis débit nécessaire (chargeurs) ———
    var grilles = [];
    for (var g = 1; g <= 10; g++) {
      var pg = 'grille' + g;
      if (d[pg + '_valeur_mesuree'] || d[pg + '_debit_cone'] || d[pg + '_largeur'] || d[pg + '_diametre']) grilles.push(pg);
    }
    var chargeurs = Array.isArray(d.chargeurs) ? d.chargeurs.filter(function (c) { return c && (c.nb || c.tension || c.courant); }) : [];
    if (grilles.length || chargeurs.length) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(bar('Calcul du Débit'));
      content.push(gap(12));
      content.push(t([104, 51], [[L('Nombre de Grilles:', { fontSize: 9, margin: [1, 6, 1, 6] }), V(String(grilles.length), { margin: [1, 6, 1, 6] })]]));
      grilles.forEach(function (pg, gi) {
        content.push(gap(12));
        content.push(bar('Grille ' + (gi + 1)));
        content.push(gap(12));
        content.push({ columns: [
          { width: 104, stack: [t([104], [[L('Dimension(cm)', { margin: [1, 6, 1, 6] })]])] },
          { width: 385, stack: [t([77, 77, 77, 154], [
            [L('Largeur', { margin: [1, 6, 1, 6] }), L('Longueur', { margin: [1, 6, 1, 6] }), L('Diamètre', { margin: [1, 6, 1, 6] }), L('Débit mesuré à l\'aide d\'un cône')],
            [V(v(d[pg + '_largeur'])), V(v(d[pg + '_longueur'])), V(v(d[pg + '_diametre'])), V(v(d[pg + '_debit_cone']))]
          ])] }
        ], columnGap: 51 });
        content.push(gap(12));
        content.push(t([103, 103, 103], [
          [{ text: '', border: NONE }, L('Vitesse mesurée(m/s)', { margin: [1, 2, 1, 2] }), L('Débit obtenu(m3/h)', { margin: [1, 8, 1, 8] })],
          [L('Valeurs', { margin: [1, 6, 1, 6] }), V(v(d[pg + '_valeur_mesuree']), { margin: [1, 6, 1, 6] }), V(v(d[pg + '_debit_obtenu']), { margin: [1, 6, 1, 6] })]
        ], 52));
      });
      if (chargeurs.length) {
        var total = chargeurs.reduce(function (acc, c) { var n = parseFloat(c.nb); return acc + (isNaN(n) ? 0 : n); }, 0);
        content.push(gap(12));
        content.push(bar('Calcul du Débit nécessaire'));
        content.push(gap(12));
        content.push(t([155, 51], [[L('Nombre de chargeurs', { margin: [1, 6, 1, 6] }), V(String(total), { margin: [1, 6, 1, 6] })]]));
        chargeurs.forEach(function (c, ci) {
          var bloc = [
            gap(12), bar('Chargeurs type ' + (ci + 1)), gap(12),
            { columns: [
              { width: 206, stack: [t([129, 77], [[L('Nombre'), V(v(c.nb))], [L('Tension de sortie (V)'), V(v(c.tension))], [L('Courant de sortie (A)'), V(v(c.courant))]])] },
              { width: 206, stack: [t([129, 77], [[L('Débit théorique(m3/h)', { margin: [1, 8, 1, 8] }), V(v(chargerDebit(c)), { margin: [1, 8, 1, 8] })]])] }
            ], columnGap: 51 }
          ];
          content.push({ stack: bloc, unbreakable: true });
        });
      }
    }
  });
  return content;
}

console.log('✓ Export PDF (fondations) chargé');
