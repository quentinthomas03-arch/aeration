// export-word.js - Export du rapport de contrôle aération en Word (.docx)
// Reproduit la structure du rapport SOCOTEC d'origine (modules VBA F_P0 / Presentation_De_La_Mission /
// Documents_Transmis / Sommaire). Lot 1 : page de garde, sommaire, présentation de la mission,
// description générale des locaux, documents transmis à SOCOTEC.
// Les lots suivants ajouteront : 4. Synthèse du contrôle, 5. Annexes (détail par installation).

var BLUE = '0B72B5';        // titres
var TABLE_HEADER_BLUE = '29ABE2'; // en-têtes de tableaux (proche de l'identité SOCOTEC)
var LIGHT = 'DEEAF6';       // cases cochées / fonds clairs
var LOGO_PATH = 'assets/logo-socotec.jpg';

// Configuration de la "Synthèse du contrôle" (4.) par type d'installation, reconstituée depuis
// Conclusion.bas + CONSTANTE.bas (constantes Libelle_Conclusion_X_Y) du VBA d'origine.
// col1 = Bâtiment (ou Référence pour Menuiserie machines à bois), col2/col3 = colonnes d'identification
// complémentaires (facultatives selon le type), avis = champ \u00abavis global\u00bb le plus représentatif
// disponible dans notre schéma, commentaire = champ commentaire/observation associé.
// Certains mappings sont des meilleures estimations (types sans avis global unique dans le schéma
// actuel : Hottes, Torches aspirantes) — à valider avec Quentin.
var SYNTHESE_CONFIG = {
  bureaux: { titre: 'Conclusion sur les contrôles des locaux à pollution non spécifique', col1: 'batiment', col1Label: 'Bâtiment', col2: 'type_local', col2Label: 'Type de local', col3: 'reference_local', col3Label: 'Nom du local', avis: 'avis', commentaire: 'commentaire' },
  sanitaires: { titre: 'Conclusion sur les sanitaires', col1: 'batiment', col1Label: 'Bâtiment', col2: 'repere', col2Label: 'Repère', col3: 'nom_usage', col3Label: 'Nom d\u2019usage', avis: 'avis', commentaire: 'observation' },
  locaux_fumeurs: { titre: 'Conclusion sur les locaux fumeurs', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence de l\u2019équipement', avis: 'avis_csp', commentaire: 'observation' },
  cta: { titre: 'Conclusion sur les CTA', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Réf. équipement et/ou implantation', avis: 'avis', commentaire: 'observation' },
  extracteur: { titre: 'Conclusion sur les extracteurs', col1: 'batiment', col1Label: 'Bâtiment', col2: 'locaux_extraits', col2Label: 'Réf. équipement et/ou implantation', avis: 'avis_constructeur', commentaire: 'observation' },
  erp: { titre: 'Conclusion sur les contrôles des locaux à pollution non spécifique dans un établissement recevant du public', col1: 'batiment', col1Label: 'Bâtiment', col2: 'type_local', col2Label: 'Type de local', avis: 'avis', commentaire: 'commentaire' },
  sorbonnes: { titre: 'Conclusion sur les Sorbonnes', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'conclusion', commentaire: 'commentaire' },
  hottes: { titre: 'Conclusion sur les hottes et dosserets aspirants', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'avis_vt', commentaire: 'observation' },
  bras_aspiration: { titre: 'Conclusion sur les Bras Orientables Articulés', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence équipement', avis: 'conclusion', commentaire: 'commentaire_1' },
  cabines_peinture: { titre: 'Conclusion sur les cabines de peinture', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Description de la cabine', avis: 'conclusion', commentaire: 'observations' },
  installations_diverses: { titre: 'Conclusion sur les équipements divers', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'avis', commentaire: 'observation' },
  gaz_echappement: { titre: 'Conclusion sur les captages de gaz d\u2019échappement', col1: 'batiment', col1Label: 'Bâtiment/Atelier', col2: 'reference_equipement', col2Label: 'Réf. équipement et/ou implantation', avis: 'avis_constructeur', commentaire: 'observation' },
  menuiserie: { titre: 'Conclusion sur le débit global d\u2019air extrait', col1: 'batiment', col1Label: 'Bâtiment', avis: 'avis_constructeur', commentaire: 'observation' },
  menuiserie_bis: { titre: 'Conclusion sur les machines à bois', col1: 'reference_machine', col1Label: 'Référence de la machine à bois', col2: 'type_machine', col2Label: 'Type de machine à bois', avis: 'conclusion_avis', commentaire: 'observation' },
  box_peinture: { titre: 'Conclusion sur les box de préparation de peinture', col1: 'batiment', col1Label: 'Bâtiment', col2: 'activite_reference_local', col2Label: 'Activité et référence du local', avis: 'avis', commentaire: 'observation' },
  torches_aspirantes: { titre: 'Conclusion sur les torches aspirantes', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Réf. équipement', avis: 'note_reference', commentaire: null },
  locaux_charge: { titre: 'Conclusion sur les locaux de charge d\u2019accumulateurs', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Réf. équipement', avis: 'avis', commentaire: 'observation' },
  tts: { titre: 'Conclusion sur les vérifications des traitements de surface', col1: 'batiment', col1Label: 'Bâtiment', col2: 'activite_reference_local', col2Label: 'Réf. équipement', avis: 'avis', commentaire: 'observation' }
};

// Types d'installations repris dans la phrase "Locaux à pollution spécifique" de la Description
// générale des locaux (2.1). Le VBA d'origine (Presentation_De_La_Mission.bas) excluait Bureaux, CTA,
// Extracteur et ERP de cette liste (locaux "à pollution non spécifique") — cohérent. Mais il oubliait
// aussi Menuiserie machines à bois, Torches aspirantes, Locaux de charge et TTS, ajoutés plus tard dans
// l'outil sans jamais avoir été raccordés à cette phrase (dette technique, confirmé avec Quentin le
// 09/07/2026 : comportement corrigé ici plutôt que reproduit à l'identique).
var TYPES_POLLUTION_NON_SPECIFIQUE = ['bureaux', 'cta', 'extracteur', 'erp'];

function exportRapportWord() {
  var m = getCurrentMission();
  if (!m) { alert('Aucune mission sélectionnée'); return; }
  if (typeof docx === 'undefined') {
    alert('Bibliothèque Word non chargée. Rechargez l\u2019application.');
    return;
  }

  fetch(LOGO_PATH).then(function (r) {
    if (!r.ok) throw new Error('logo introuvable');
    return r.arrayBuffer();
  }).catch(function () {
    return null; // pas de logo : le rapport se génère quand même
  }).then(function (logoBuf) {
    try {
      var doc = buildRapportDoc(m, logoBuf);
      docx.Packer.toBlob(doc).then(function (blob) {
        var rawName = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ef\u00ee\u00f4\u00f9\u00fb\u00fc\u00e7\s-]/g, '').trim();
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = rawName + '_controle_aeration.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }).catch(function (err) {
        alert('Erreur lors de la génération du document Word.\n' + err.message);
      });
    } catch (err) {
      alert('Erreur lors de l\u2019export Word.\n' + err.message);
    }
  });
}

// ————————————————————————————————————————————
// Construction du document
// ————————————————————————————————————————————

function buildRapportDoc(m, logoBuf) {
  var D = docx;
  var di = m.donneesInternes || {};
  var ic = m.infosClient || {};
  var is = m.intervenantSite || {};
  var isi = m.infosSiteIntervention || {};

  var children = [];

  children = children.concat(buildPageDeGarde(D, m, di, ic, is, isi, logoBuf));
  children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

  children = children.concat(buildSommaire(D));
  children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

  children = children.concat(buildPresentationMission(D, m, di, ic, isi));
  children = children.concat(buildDescriptionLocaux(D, m));
  children = children.concat(buildDocumentsTransmis(D, m));

  children = children.concat(buildSyntheseControle(D, m));

  // — Lots suivants (à venir) —
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new D.TextRun({ text: '5. ANNEXES', bold: true, color: BLUE })]
  }));
  children.push(new D.Paragraph({
    children: [new D.TextRun({ text: 'Détail par installation — version provisoire (dump champ/valeur). Sera remplacé lot par lot par la mise en forme définitive (tableaux comparatifs par type, extraits du Code du travail).', italics: true, size: 20 })]
  }));
  children = children.concat(buildAnnexesProvisoires(D, m));

  var footerDefault = new D.Footer({ children: [buildFooterParagraph(D, di)] });
  var footerFirst = new D.Footer({
    children: [new D.Paragraph({
      tabStops: [{ type: D.TabStopType.RIGHT, position: 9638 }],
      children: [
        new D.TextRun({ text: 'SOCOTEC ENVIRONNEMENT', size: 16, color: '666666' }),
        new D.TextRun({ text: '\t', size: 16 }),
        new D.TextRun({ text: 'Nombre de pages : ', size: 16, color: '666666' }),
        new D.TextRun({ children: [D.PageNumber.TOTAL_PAGES], size: 16, color: '666666' }),
        new D.TextRun({ text: ' pages (annexes comprises)', size: 16, color: '666666' })
      ]
    })]
  });

  return new D.Document({
    sections: [{
      properties: {
        titlePage: true,
        page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } }
      },
      footers: { default: footerDefault, first: footerFirst },
      children: children
    }]
  });
}

function buildFooterParagraph(D, di) {
  return new D.Paragraph({
    tabStops: [
      { type: D.TabStopType.CENTER, position: 4819 },
      { type: D.TabStopType.RIGHT, position: 9638 }
    ],
    children: [
      new D.TextRun({ text: 'N\u00b0 d\u2019Affaire : ' + (di.numeroAffaire || '\u2014'), size: 16, color: '666666' }),
      new D.TextRun({ text: '\t', size: 16 }),
      new D.TextRun({ text: 'N\u00b0 Chrono : ' + (di.numeroChrono || '\u2014'), size: 16, color: '666666' }),
      new D.TextRun({ text: '\t', size: 16 }),
      new D.TextRun({ children: [D.PageNumber.CURRENT], size: 16, color: '666666' }),
      new D.TextRun({ text: '/', size: 16, color: '666666' }),
      new D.TextRun({ children: [D.PageNumber.TOTAL_PAGES], size: 16, color: '666666' })
    ]
  });
}

// ————————————————————————————————————————————
// Page de garde (F_Page_De_Garde / PDG_1..17)
// ————————————————————————————————————————————

function buildPageDeGarde(D, m, di, ic, is, isi, logoBuf) {
  var children = [];

  if (logoBuf) {
    children.push(new D.Paragraph({
      spacing: { after: 360 },
      children: [new D.ImageRun({ data: logoBuf, type: 'jpg', transformation: { width: 105, height: 100 } })]
    }));
  }

  // Bloc client (haut de page, aligné comme dans l'original)
  children.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: ic.nomEntreprise || '\u2014', bold: true, size: 22 })] }));
  children.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: 'A l\u2019attention de ' + (ic.nomDemandeur || '\u2014'), size: 20 })] }));
  children.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: ic.adresse || '', size: 20 })] }));
  children.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, spacing: { after: 480 }, children: [new D.TextRun({ text: (ic.codePostal || '') + ' ' + (ic.ville || ''), size: 20 })] }));

  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER,
    spacing: { before: 480, after: 480 },
    children: [new D.TextRun({ text: 'CONTR\u00d4LE DE L\u2019AERATION ET DE L\u2019ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, size: 32, color: BLUE })]
  }));

  var nomAuteur = di.auteurRapport || is.intervenant || '\u2014';
  children.push(threeColBlock(D, ['Intervention sur site r\u00e9alis\u00e9e par', 'R\u00e9dig\u00e9 par', 'Valid\u00e9 par'], [nomAuteur, nomAuteur, nomAuteur]));
  children.push(new D.Paragraph({ text: '', spacing: { after: 240 } }));
  children.push(threeColBlock(D, ['Date d\u2019\u00e9dition du rapport', 'R\u00e9f\u00e9rence du rapport (chrono)', 'Nature de la r\u00e9vision'],
    [di.dateRapport || '\u2014', di.numeroChrono || '\u2014', di.natureRevision || 'Version initiale']));

  children.push(new D.Paragraph({ spacing: { before: 480 }, children: [new D.TextRun({ text: 'N\u00b0 d\u2019Affaire : ' + (di.numeroAffaire || '\u2014'), bold: true, size: 20 })] }));
  children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Mission r\u00e9alis\u00e9e ' + (di.datesIntervention ? ('le/du ' + di.datesIntervention) : '\u2014'), size: 20 })] }));

  children.push(new D.Paragraph({
    spacing: { before: 480, after: 480 },
    children: [new D.TextRun({ text: 'La reproduction de ce document n\u2019est autoris\u00e9e que sous sa forme int\u00e9grale.', italics: true, size: 18 })]
  }));

  children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'SOCOTEC ENVIRONNEMENT', bold: true, size: 20 })] }));
  children.push(new D.Paragraph({ children: [new D.TextRun({ text: is.agenceAuteur || '\u2014', size: 18 })] }));
  children.push(new D.Paragraph({ children: [new D.TextRun({ text: is.adresseAgence || '', size: 18 })] }));
  children.push(new D.Paragraph({ children: [new D.TextRun({ text: (is.codePostal || '') + ' ' + (is.ville || ''), size: 18 })] }));

  return children;
}

function threeColBlock(D, labels, values) {
  var W = 3212;
  function cell(text, bold, size, color) {
    return new D.TableCell({
      width: { size: W, type: D.WidthType.DXA },
      borders: NO_BORDERS(D),
      children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: text, bold: !!bold, size: size || 20, color: color })] })]
    });
  }
  return new D.Table({
    width: { size: 9636, type: D.WidthType.DXA },
    columnWidths: [W, W, W],
    rows: [
      new D.TableRow({ children: [cell(labels[0], false, 18, '555555'), cell(labels[1], false, 18, '555555'), cell(labels[2], false, 18, '555555')] }),
      new D.TableRow({ children: [cell(values[0], true), cell(values[1], true), cell(values[2], true)] })
    ]
  });
}

function NO_BORDERS(D) {
  var none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none };
}

// ————————————————————————————————————————————
// Sommaire (Sommaire.bas) — table des matières dynamique Word
// ————————————————————————————————————————————

function buildSommaire(D) {
  return [
    new D.Paragraph({
      alignment: D.AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new D.TextRun({ text: 'SOMMAIRE', bold: true, size: 32, color: BLUE })]
    }),
    new D.TableOfContents('Sommaire', { hyperlink: true, headingStyleRange: '1-3' }),
    new D.Paragraph({
      spacing: { before: 240 },
      children: [new D.TextRun({ text: '(Clic droit sur le sommaire ci-dessus \u2192 \u00ab Mettre \u00e0 jour les champs \u00bb pour actualiser la pagination \u00e0 l\u2019ouverture du document.)', italics: true, size: 16, color: '888888' })]
    })
  ];
}

// ————————————————————————————————————————————
// 1. Présentation de la mission (Presentation_De_La_Mission.bas)
// ————————————————————————————————————————————

function buildPresentationMission(D, m, di, ic, isi) {
  var children = [];

  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [new D.TextRun({ text: '1. PRESENTATION DE LA MISSION', bold: true, color: BLUE })]
  }));

  children.push(subHeading(D, 'Objectif'));
  var nomSite = ic.nomEntreprise || '\u2014';
  children.push(new D.Paragraph({
    spacing: { after: 240 },
    children: [new D.TextRun({
      text: 'Ce rapport pr\u00e9sente les r\u00e9sultats de la v\u00e9rification de l\u2019a\u00e9ration et de l\u2019assainissement des locaux de travail r\u00e9alis\u00e9e sur le site ' + nomSite + ', selon le contrat r\u00e9f\u00e9renc\u00e9 ' + nomSite + '.',
      size: 20
    })]
  }));

  children.push(subHeading(D, 'Demandeur'));
  children.push(labelValueLine(D, 'Nom du demandeur : ', ic.nomDemandeur || '\u2014'));
  children.push(labelValueLine(D, 'Adresse du demandeur : ', ic.nomEntreprise || ''));
  children.push(new D.Paragraph({ indent: { left: 1600 }, children: [new D.TextRun({ text: ic.adresse || '', size: 20 })] }));
  children.push(new D.Paragraph({ spacing: { after: 240 }, indent: { left: 1600 }, children: [new D.TextRun({ text: (ic.codePostal || '') + ' ' + (ic.ville || ''), size: 20 })] }));

  children.push(subHeading(D, 'Site d\u2019intervention'));
  children.push(labelValueLine(D, 'Nom du site : ', isi.siteIntervention || ic.nomEntreprise || '\u2014'));
  children.push(labelValueLine(D, 'Adresse du site : ', isi.adresseSite || ''));
  children.push(new D.Paragraph({ spacing: { after: 240 }, indent: { left: 1600 }, children: [new D.TextRun({ text: (isi.codePostal || '') + ' ' + (isi.ville || ''), size: 20 })] }));

  children.push(subHeading(D, 'R\u00e9f\u00e9rentiel'));
  ['Articles R.4212 du code du travail,', 'Articles R.4222 du code du travail,',
   'Arr\u00eat\u00e9 du 8 octobre 1987 relatif au contr\u00f4le p\u00e9riodique des installations d\u2019a\u00e9ration et d\u2019assainissement des locaux de travail.'
  ].forEach(function (t) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: '-    ' + t, size: 20 })] }));
  });

  return children;
}

function subHeading(D, text) {
  return new D.Paragraph({
    spacing: { before: 180, after: 60 },
    children: [new D.TextRun({ text: text, bold: true, size: 20 })]
  });
}

function labelValueLine(D, label, value) {
  return new D.Paragraph({
    indent: { left: 1600, hanging: 1600 },
    children: [new D.TextRun({ text: label, size: 20 }), new D.TextRun({ text: value, size: 20 })]
  });
}

// ————————————————————————————————————————————
// 2. Description générale des locaux
// ————————————————————————————————————————————

function buildDescriptionLocaux(D, m) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new D.TextRun({ text: '2. DESCRIPTION GENERALE DES LOCAUX', bold: true, color: BLUE })]
  }));
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_2,
    spacing: { after: 120 },
    children: [new D.TextRun({ text: '2.1 DESCRIPTION DES LOCAUX CONTR\u00d4L\u00c9S', bold: true, color: BLUE, size: 22 })]
  }));
  children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Les locaux contr\u00f4l\u00e9s sont les suivants :', size: 20 })] }));

  var selectionnes = m.typesSelectionnes || [];
  var aNonSpecifique = selectionnes.indexOf('bureaux') !== -1;
  var specifiques = selectionnes.filter(function (id) { return TYPES_POLLUTION_NON_SPECIFIQUE.indexOf(id) === -1; });
  var labelsSpecifiques = specifiques.map(function (id) {
    var t = INSTALLATION_TYPES.filter(function (x) { return x.id === id; })[0];
    return t ? t.label.toLowerCase() : id;
  });

  if (aNonSpecifique) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: '-    Locaux \u00e0 pollution non sp\u00e9cifique : ensemble des bureaux, salles de r\u00e9union', size: 20 })] }));
  }
  if (labelsSpecifiques.length > 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: '-    Locaux \u00e0 pollution sp\u00e9cifique : ' + labelsSpecifiques.join(', '), size: 20 })] }));
  }

  var locauxExclus = (m.descriptionLocaux && m.descriptionLocaux.locauxExclus) || '';
  if (locauxExclus) {
    children.push(new D.Paragraph({ spacing: { before: 120 }, children: [new D.TextRun({ text: 'Les locaux suivants sont exclus de la prestation :', size: 20 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: locauxExclus, size: 20 })] }));
  }

  return children;
}

// ————————————————————————————————————————————
// 3. Documents transmis à SOCOTEC (Documents_Transmis.bas)
// ————————————————————————————————————————————

function buildDocumentsTransmis(D, m) {
  var dt = m.documentsTransmis || { documents: [], notice: [], observations: '' };
  var children = [];

  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new D.TextRun({ text: '3. DOCUMENTS TRANSMIS A SOCOTEC', bold: true, color: BLUE })]
  }));
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_2,
    spacing: { after: 120 },
    children: [new D.TextRun({ text: '3.1 LISTE DES DOCUMENTS TRANSMIS A SOCOTEC', bold: true, color: BLUE, size: 22 })]
  }));

  children.push(docsTable(D, dt.documents));

  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new D.TextRun({ text: '3.2 NOTICE D\u2019INSTRUCTION ET CONSIGNES D\u2019UTILISATION', bold: true, color: BLUE, size: 22 })]
  }));

  children.push(noticeTable(D, dt.notice));

  children.push(new D.Paragraph({
    spacing: { before: 240 },
    children: [new D.TextRun({ text: 'Observations', bold: true, size: 20 })]
  }));
  children.push(new D.Paragraph({ children: [new D.TextRun({ text: dt.observations || '\u2014', size: 20 })] }));

  return children;
}

function headerCell(D, text, width, colSpan) {
  return new D.TableCell({
    width: { size: width, type: D.WidthType.DXA },
    columnSpan: colSpan || 1,
    shading: { fill: TABLE_HEADER_BLUE, type: D.ShadingType.CLEAR },
    verticalAlign: D.VerticalAlign.CENTER,
    children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: text, bold: true, size: 18, color: 'FFFFFF' })] })]
  });
}

function bodyCell(D, text, width, opts) {
  opts = opts || {};
  return new D.TableCell({
    width: { size: width, type: D.WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: D.ShadingType.CLEAR } : undefined,
    verticalAlign: D.VerticalAlign.CENTER,
    children: [new D.Paragraph({ alignment: opts.center ? D.AlignmentType.CENTER : D.AlignmentType.LEFT, children: [new D.TextRun({ text: text, size: 18, bold: !!opts.bold, color: opts.color })] })]
  });
}

function docsTable(D, documents) {
  var W_NATURE = 4200, W_OUI = 900, W_NON = 900, W_COM = 3636;
  var rows = [];
  rows.push(new D.TableRow({ children: [
    headerCell(D, 'Nature du document', W_NATURE),
    headerCell(D, 'Transmis ou disponible sur site', W_OUI + W_NON, 2),
    headerCell(D, 'Commentaire', W_COM)
  ] }));
  rows.push(new D.TableRow({ children: [
    bodyCell(D, '', W_NATURE),
    headerCell(D, 'Oui', W_OUI),
    headerCell(D, 'Non', W_NON),
    bodyCell(D, '', W_COM)
  ] }));
  (documents || []).forEach(function (doc) {
    rows.push(new D.TableRow({ children: [
      bodyCell(D, doc.label, W_NATURE),
      bodyCell(D, doc.transmis === 'Oui' ? 'X' : '', W_OUI, { center: true, fill: doc.transmis === 'Oui' ? LIGHT : undefined }),
      bodyCell(D, doc.transmis === 'Non' ? 'X' : '', W_NON, { center: true, fill: doc.transmis === 'Non' ? LIGHT : undefined }),
      bodyCell(D, doc.commentaire || '-', W_COM)
    ] }));
  });
  return new D.Table({ width: { size: W_NATURE + W_OUI + W_NON + W_COM, type: D.WidthType.DXA }, rows: rows });
}

function noticeTable(D, notice) {
  var W_ART = 1400, W_CONF = 2800, W_P = 900, W_A = 900, W_SO = 900, W_COM = 3038;
  var rows = [];
  rows.push(new D.TableRow({ children: [
    headerCell(D, 'Article', W_ART),
    headerCell(D, 'Conformit\u00e9 \u00e0 l\u2019article R.4222-21 du code du travail', W_CONF),
    headerCell(D, 'Pr\u00e9sence', W_P),
    headerCell(D, 'Absence', W_A),
    headerCell(D, 'Sans objet', W_SO),
    headerCell(D, 'Commentaire', W_COM)
  ] }));
  (notice || []).forEach(function (n) {
    rows.push(new D.TableRow({ children: [
      bodyCell(D, 'R4222-21', W_ART, { center: true }),
      bodyCell(D, n.label, W_CONF, { bold: true }),
      bodyCell(D, n.presence === 'Pr\u00e9sence' ? 'X' : '', W_P, { center: true, fill: n.presence === 'Pr\u00e9sence' ? LIGHT : undefined }),
      bodyCell(D, n.presence === 'Absence' ? 'X' : '', W_A, { center: true, fill: n.presence === 'Absence' ? LIGHT : undefined }),
      bodyCell(D, n.presence === 'Sans objet' ? 'X' : '', W_SO, { center: true, fill: n.presence === 'Sans objet' ? LIGHT : undefined }),
      bodyCell(D, n.commentaire || '-', W_COM)
    ] }));
  });
  return new D.Table({ width: { size: W_ART + W_CONF + W_P + W_A + W_SO + W_COM, type: D.WidthType.DXA }, rows: rows });
}

// ————————————————————————————————————————————
// 4. Synthèse du contrôle (Conclusion.bas)
// ————————————————————————————————————————————

function buildSyntheseControle(D, m) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new D.TextRun({ text: '4. SYNTHESE DU CONTROLE', bold: true, color: BLUE })]
  }));

  var hasContent = false;

  INSTALLATION_TYPES.forEach(function (t) {
    var list = (m.installations && m.installations[t.id]) || [];
    var cfg = SYNTHESE_CONFIG[t.id];
    if (list.length === 0 || !cfg) return;
    hasContent = true;

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2,
      spacing: { before: 280, after: 100 },
      children: [new D.TextRun({ text: cfg.titre, bold: true, color: BLUE, size: 22 })]
    }));

    children.push(syntheseTable(D, cfg, list));
  });

  if (!hasContent) {
    children.push(new D.Paragraph({
      children: [new D.TextRun({ text: 'Aucune installation renseignée.', italics: true, size: 20 })]
    }));
  }

  return children;
}

function avisColor(text) {
  if (text === 'Satisfaisant' || text === 'Conforme') return { fill: 'DCFCE7', color: '166534' };
  if (text === 'Non Satisfaisant' || text === 'Non Conforme') return { fill: 'FEE2E2', color: '991B1B' };
  if (text === 'Impossible de se prononcer') return { fill: 'FEF3C7', color: '92400E' };
  return null;
}

function syntheseTable(D, cfg, list) {
  var hasCol2 = !!cfg.col2, hasCol3 = !!cfg.col3;
  var W_TOTAL = 9636;
  var nCols = 2 + (hasCol2 ? 1 : 0) + (hasCol3 ? 1 : 0); // col1 + [col2] + [col3] + avis + commentaire (avis/commentaire comptés après)
  var widths = [];
  var headers = [{ text: cfg.col1Label, key: cfg.col1 }];
  if (hasCol2) headers.push({ text: cfg.col2Label, key: cfg.col2 });
  if (hasCol3) headers.push({ text: cfg.col3Label, key: cfg.col3 });
  headers.push({ text: 'Avis par rapport aux valeurs recommandées', key: cfg.avis, isAvis: true });
  headers.push({ text: 'Commentaire', key: cfg.commentaire });

  var idColsCount = headers.length - 2; // colonnes d'identification (hors avis/commentaire)
  var idColWidth = Math.round(W_TOTAL * 0.22);
  var avisColWidth = Math.round(W_TOTAL * (idColsCount === 1 ? 0.30 : 0.22));
  var comColWidth = W_TOTAL - idColWidth * idColsCount - avisColWidth;

  var rows = [];
  rows.push(new D.TableRow({ children: headers.map(function (h, i) {
    var w = h.isAvis ? avisColWidth : (i === headers.length - 1 ? comColWidth : idColWidth);
    return headerCell(D, h.text, w);
  }) }));

  list.forEach(function (inst) {
    rows.push(new D.TableRow({ children: headers.map(function (h, i) {
      var w = h.isAvis ? avisColWidth : (i === headers.length - 1 ? comColWidth : idColWidth);
      var val = h.key ? inst.data[h.key] : undefined;
      var text = (val === undefined || val === null || val === '') ? '-' : String(val);
      if (h.isAvis) {
        var c = avisColor(text);
        return bodyCell(D, text, w, { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined });
      }
      return bodyCell(D, text, w);
    }) }));
  });

  return new D.Table({ width: { size: W_TOTAL, type: D.WidthType.DXA }, rows: rows });
}


function buildAnnexesProvisoires(D, m) {
  var children = [];
  var borders = {
    top: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE },
    bottom: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE },
    left: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE },
    right: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE }
  };

  function labelCell(text) {
    return new D.TableCell({
      width: { size: 3800, type: D.WidthType.DXA }, borders: borders,
      shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR },
      children: [new D.Paragraph({ children: [new D.TextRun({ text: text, bold: true, size: 18 })] })]
    });
  }
  function valueCell(text) {
    return new D.TableCell({
      width: { size: 5560, type: D.WidthType.DXA }, borders: borders,
      children: [new D.Paragraph({ children: [new D.TextRun({ text: text, size: 18 })] })]
    });
  }
  function sectionRow(text) {
    return new D.TableRow({ children: [new D.TableCell({
      columnSpan: 2, width: { size: 9360, type: D.WidthType.DXA }, borders: borders,
      shading: { fill: BLUE, type: D.ShadingType.CLEAR },
      children: [new D.Paragraph({ children: [new D.TextRun({ text: text, bold: true, size: 18, color: 'FFFFFF' })] })]
    })] });
  }

  INSTALLATION_TYPES.forEach(function (t) {
    var list = (m.installations && m.installations[t.id]) || [];
    if (list.length === 0) return;

    children.push(new D.Paragraph({
      spacing: { before: 360, after: 120 },
      children: [new D.TextRun({ text: t.label + ' (' + list.length + ')', bold: true, size: 26, color: BLUE })]
    }));

    list.forEach(function (inst, idx) {
      var rows = [];
      t.fields.forEach(function (f) {
        if (f.type === 'photo') return;
        if (f.type === 'section') { var r = sectionRow(f.label); r.__section = true; rows.push(r); return; }
        var val = inst.data[f.key];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return;
        if (Array.isArray(val)) val = val.join(', ');
        rows.push(new D.TableRow({ children: [labelCell(f.label), valueCell(String(val))] }));
      });
      var finalRows = [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].__section && (i === rows.length - 1 || rows[i + 1].__section)) continue;
        finalRows.push(rows[i]);
      }
      if (finalRows.length === 0) return;
      children.push(new D.Paragraph({
        spacing: { before: 120, after: 60 },
        children: [new D.TextRun({ text: 'Installation ' + (idx + 1), bold: true, size: 20 })]
      }));
      children.push(new D.Table({ width: { size: 9360, type: D.WidthType.DXA }, columnWidths: [3800, 5560], rows: finalRows }));
    });
  });

  return children;
}

console.log('\u2713 Export Word charg\u00e9');
