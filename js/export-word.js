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
  sorbonnes: { titre: 'Conclusion sur les Sorbonnes', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'vitesse_min_avis_norme', commentaire: 'commentaire' },
  hottes: { titre: 'Conclusion sur les hottes et dosserets aspirants', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'avis_vt', commentaire: 'observation' },
  bras_aspiration: { titre: 'Conclusion sur les Bras Orientables Articulés', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence équipement', avis: 'conclusion', commentaire: 'commentaire_1' },
  cabines_peinture: { titre: 'Conclusion sur les cabines de peinture', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence de l\u2019équipement', col3: 'type_cabine', col3Label: 'Type de cabine', avis: 'conclusion', commentaire: 'observations' },
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

  var portrait = [];

  portrait = portrait.concat(buildPageDeGarde(D, m, di, ic, is, isi, logoBuf));
  portrait.push(new D.Paragraph({ children: [new D.PageBreak()] }));

  portrait = portrait.concat(buildSommaire(D));
  portrait.push(new D.Paragraph({ children: [new D.PageBreak()] }));

  portrait = portrait.concat(buildPresentationMission(D, m, di, ic, isi));
  portrait = portrait.concat(buildDescriptionLocaux(D, m));
  portrait = portrait.concat(buildDocumentsTransmis(D, m));
  portrait = portrait.concat(buildSyntheseControle(D, m));

  var landscape = [];
  landscape.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 120 },
    children: [new D.TextRun({ text: '5. ANNEXES', bold: true, color: BLUE })]
  }));

  // Types dont l'annexe fidèle (tableau croisé + extraits du Code du travail) est prête.
  // Les autres restent en dump provisoire champ/valeur en attendant leur lot.
  var ANNEXES_FIDELES = { bureaux: buildAnnexeBureaux, sanitaires: buildAnnexeSanitaires, cta: buildAnnexeCTA, extracteur: buildAnnexeExtracteur, hottes: buildAnnexeHottes, bras_aspiration: buildAnnexeBrasAspiration, installations_diverses: buildAnnexeInstallationsDiverses, locaux_charge: buildAnnexeLocauxCharge, sorbonnes: buildAnnexeSorbonnes, cabines_peinture: buildAnnexeCabinesPeinture, box_peinture: buildAnnexeBoxPeinture, erp: buildAnnexeERP, menuiserie_bis: buildAnnexeMenuiserieMAB };

  INSTALLATION_TYPES.forEach(function (t) {
    var list = (m.installations && m.installations[t.id]) || [];
    if (list.length === 0) return;
    if (ANNEXES_FIDELES[t.id]) {
      landscape.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      landscape = landscape.concat(ANNEXES_FIDELES[t.id](D, list));
    } else {
      landscape.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      landscape = landscape.concat(buildAnnexeProvisoire(D, t, list));
    }
  });

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
    sections: [
      {
        properties: {
          titlePage: true,
          page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } }
        },
        footers: { default: footerDefault, first: footerFirst },
        children: portrait
      },
      {
        properties: {
          page: {
            size: { orientation: D.PageOrientation.LANDSCAPE },
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        footers: { default: footerDefault },
        children: landscape
      }
    ]
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


// ————————————————————————————————————————————
// 5. Annexes — utilitaire tableau croisé (colonnes = installations, lignes = champs)
// Fidèle à la mise en page Excel d'origine (Inserer_Annexes.bas)
// ————————————————————————————————————————————

var CROSSTAB_GROUP_SIZE = 5; // nombre de locaux/équipements par page, comme dans l'original

function crosstabSection(D, titre, sousTitre, legalParagraphs, rows, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    alignment: D.AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new D.TextRun({ text: sousTitre, italics: true, size: 20, color: '555555' })]
  }));

  if (legalParagraphs && legalParagraphs.length) {
    children.push(new D.Paragraph({
      alignment: D.AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new D.TextRun({ text: 'Extraits du Code du Travail', bold: true, size: 22, color: BLUE })]
    }));
    children = children.concat(legalParagraphs);
    children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
  }

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun local renseigné.', italics: true, size: 20 })] }));
    return children;
  }

  for (var g = 0; g < list.length; g += CROSSTAB_GROUP_SIZE) {
    var group = list.slice(g, g + CROSSTAB_GROUP_SIZE);
    if (g > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    children.push(new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: crosstabRows(D, rows, group) }));
  }

  return children;
}

function crosstabRows(D, rows, group) {
  var W_LABEL = 2400;
  var W_COL = Math.floor((15298 - W_LABEL) / group.length);
  var out = [];

  rows.forEach(function (r) {
    if (r.subheader) {
      out.push(new D.TableRow({ children: [
        headerCell(D, '', W_LABEL)
      ].concat(group.map(function () { return headerCell(D, r.subheader, W_COL); })) }));
      return;
    }
    out.push(new D.TableRow({ children: [
      new D.TableCell({
        width: { size: W_LABEL, type: D.WidthType.DXA },
        shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR },
        verticalAlign: D.VerticalAlign.CENTER,
        children: [new D.Paragraph({ children: [new D.TextRun({ text: r.label, bold: true, size: 16 })] })]
      })
    ].concat(group.map(function (inst) {
      var val = inst.data[r.key];
      var text = (val === undefined || val === null || val === '') ? '-' : String(val);
      var opts = { center: true };
      if (r.isAvis) { var c = avisColor(text); if (c) { opts.fill = c.fill; opts.color = c.color; opts.bold = true; } }
      return bodyCellSmall(D, text, W_COL, opts);
    })) }));
  });

  return out;
}

function bodyCellSmall(D, text, width, opts) {
  opts = opts || {};
  return new D.TableCell({
    width: { size: width, type: D.WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: D.ShadingType.CLEAR } : undefined,
    verticalAlign: D.VerticalAlign.CENTER,
    children: [new D.Paragraph({ alignment: opts.center ? D.AlignmentType.CENTER : D.AlignmentType.LEFT, children: [new D.TextRun({ text: text, size: 16, bold: !!opts.bold, color: opts.color })] })]
  });
}

function legalParagraph(text, opts) {
  opts = opts || {};
  return new docx.Paragraph({
    alignment: opts.center ? docx.AlignmentType.CENTER : docx.AlignmentType.JUSTIFIED,
    spacing: { after: opts.after !== undefined ? opts.after : 120 },
    children: [new docx.TextRun({ text: text, bold: !!opts.bold, italics: !!opts.italics, size: opts.size || 19, underline: opts.underline ? {} : undefined })]
  });
}

// 5.1 — Bureaux / Salles de réunion (Inserer_Annexe_1, Articles R.4222-5 et R.4222-6)
function buildAnnexeBureaux(D, list) {
  var legal = [
    legalParagraph('Article R4222-5', { bold: true, center: true, size: 20 }),
    legalParagraph('Créé par Décret n°2008-244 du 7 mars 2008 - art. (V)', { italics: true, center: true, size: 16, after: 160 }),
    legalParagraph('L\u2019aération par ventilation naturelle, assurée exclusivement par ouverture de fenêtres ou autres ouvrants donnant directement sur l\u2019extérieur, est autorisée lorsque le volume par occupant est égal ou supérieur à :'),
    legalParagraph('1° / 15 m³ pour les bureaux et les locaux où est accompli un travail physique léger ;'),
    legalParagraph('2° / 24 m³ pour les autres locaux.', { after: 280 }),
    legalParagraph('Article R4222-6', { bold: true, center: true, size: 20 }),
    legalParagraph('Créé par Décret n°2008-244 du 7 mars 2008 - art. (V)', { italics: true, center: true, size: 16, after: 160 }),
    legalParagraph('Lorsque l\u2019aération est assurée par ventilation mécanique, le débit minimal d\u2019air neuf à introduire par occupant est fixé dans le tableau suivant :', { after: 160 }),
    new D.Table({
      width: { size: 8000, type: D.WidthType.DXA },
      alignment: D.AlignmentType.CENTER,
      rows: [
        new D.TableRow({ children: [headerCell(D, 'DESIGNATION DES LOCAUX', 5600), headerCell(D, 'DEBIT MINIMAL (m³/h/occupant)', 2400)] }),
        new D.TableRow({ children: [bodyCell(D, 'Bureaux, locaux sans travail physique', 5600), bodyCell(D, '25', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux de restauration, locaux de vente, locaux de réunion', 5600), bodyCell(D, '30', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Ateliers et locaux avec travail physique léger', 5600), bodyCell(D, '45', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Autres ateliers et locaux', 5600), bodyCell(D, '60', 2400, { center: true })] })
      ]
    })
  ];

  var rows = [
    { label: 'Bâtiment', key: 'batiment' },
    { label: 'Référence du local', key: 'reference_local' },
    { label: 'Type de local', key: 'type_local' },
    { label: 'Ventilation', key: 'type_ventilation' },
    { label: 'Volume (m³)', key: 'volume' },
    { label: 'Effectif', key: 'effectif' },
    { label: 'Présence d\u2019ouvrant donnant directement sur l\u2019extérieur', key: 'ouvrant_exterieur' },
    { subheader: 'Extraction / Soufflage' },
    { label: 'Débit total mesuré (m³/h)', key: 'debit_total_mesure' },
    { label: 'Débit soufflage mesuré (m³/h)', key: 'debit_soufflage' },
    { label: 'Débit extraction mesuré (m³/h)', key: 'debit_extraction' },
    { label: 'Nombre de bouches', key: 'nombre_bouches' },
    { label: 'Pourcentage d\u2019air neuf (%)', key: 'pourcentage_air_neuf' },
    { label: 'Débit d\u2019air neuf introduit (m³/h)', key: 'debit_air_neuf_introduit' },
    { label: 'État des bouches', key: 'etat_bouches' },
    { subheader: 'Constat' },
    { label: 'Débit minimum d\u2019air neuf à respecter (m³/h)', key: 'debit_min_air_neuf' },
    { label: 'Volume minimal à respecter (m³)', key: 'volume_min' },
    { label: 'Avis par rapport aux valeurs réglementaires', key: 'avis', isAvis: true },
    { label: 'Commentaire', key: 'commentaire' }
  ];

  return crosstabSection(D, 'Bureaux', 'Locaux à pollution non spécifique', legal, rows, list);
}

// 5.2 — Sanitaires (Inserer_Annexe_2, Article R.4212-6)
function buildAnnexeSanitaires(D, list) {
  var legal = [
    legalParagraph('Article R4212-6', { bold: true, center: true, size: 20 }),
    legalParagraph('Créé par Décret n°2008-244 du 7 mars 2008 - art. (V)', { italics: true, center: true, size: 16, after: 160 }),
    legalParagraph('Le maître d\u2019ouvrage prévoit dans les locaux sanitaires l\u2019introduction d\u2019un débit minimal d\u2019air déterminé par le tableau suivant :', { after: 160 }),
    new D.Table({
      width: { size: 8600, type: D.WidthType.DXA },
      alignment: D.AlignmentType.CENTER,
      rows: [
        new D.TableRow({ children: [headerCell(D, 'DÉSIGNATION DES LOCAUX', 5600), headerCell(D, 'DÉBIT MINIMAL d\u2019air introduit (m³/h et par local)', 3000)] }),
        new D.TableRow({ children: [bodyCell(D, 'Cabinet d\u2019aisances isolé (**)', 5600), bodyCell(D, '30', 3000, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Salle de bains ou de douches isolée (**)', 5600), bodyCell(D, '45', 3000, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Commune avec un cabinet d\u2019aisances', 5600), bodyCell(D, '60', 3000, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Bains, douches et cabinets d\u2019aisances groupés', 5600), bodyCell(D, '30 + 15 N (*)', 3000, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Lavabos groupés', 5600), bodyCell(D, '10 + 5 N (*)', 3000, { center: true })] })
      ]
    }),
    legalParagraph('N (*) : nombre d\u2019équipements dans le local', { size: 16, after: 60 }),
    legalParagraph('(**) : pour un cabinet d\u2019aisances, une salle de bains ou de douches avec ou sans cabinet d\u2019aisances, le débit minimal d\u2019air introduit peut être limité à 15 mètres cubes par heure si ce local n\u2019est pas à usage collectif.', { size: 16 })
  ];

  var rows = [
    { label: 'Bâtiment', key: 'batiment' },
    { label: 'Référence du local', key: 'repere' },
    { label: 'Type de local', key: 'nom_usage' },
    { subheader: 'Type d\u2019équipement' },
    { label: 'WC/Urinoirs', key: 'wc_urinoirs' },
    { label: 'Douches', key: 'douches' },
    { label: 'Lavabos', key: 'lavabos' },
    { label: 'Individuel ou Collectif', key: 'individuel_collectif' },
    { subheader: 'Extraction' },
    { label: 'Débit total mesuré (m³/h)', key: 'debit_mesure' },
    { label: 'Nombre de bouches', key: 'nombre_bouches' },
    { subheader: 'Constat' },
    { label: 'État des bouches', key: 'etat_bouches' },
    { label: 'Type de ventilation', key: 'type_ventilation' },
    { label: 'Débit minimum d\u2019extraction requis (m³/h)', key: 'debit_min_reglementaire' },
    { label: 'Avis par rapport aux valeurs réglementaires', key: 'avis', isAvis: true },
    { label: 'Commentaires', key: 'observation' }
  ];

  return crosstabSection(D, 'Sanitaires', 'Sanitaires', legal, rows, list);
}

// 5.3 — Centrales de traitement de l'air (Inserer_Annexe_4)
// Contrairement à Bureaux/Sanitaires, ce type n'utilise pas le format "tableau croisé" (colonnes = locaux) :
// chaque CTA occupe son propre bloc complet (ModeleConclusion=2 dans le VBA d'origine). Pas d'extrait du
// Code du Travail : l'avis CTA est une appréciation manuelle du technicien (pas de seuil réglementaire
// unique), faute de valeur de référence constructeur systématique.
function buildAnnexeCTA(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    alignment: D.AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new D.TextRun({ text: 'Vérification des centrales de traitement de l\u2019air', italics: true, size: 20, color: '555555' })]
  }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucune CTA renseignée.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'CENTRALE DE TRAITEMENT D\u2019AIR' + (d.reference_equipement ? ' \u2014 ' + d.reference_equipement : ''), bold: true, color: BLUE, size: 24 })]
    }));

    children.push(infoTable(D, [
      ['Bâtiment', d.batiment, 'Marque', d.marque],
      ['Localisation', d.localisation, 'Mode de fonctionnement', d.mode_fonctionnement],
      ['Locaux alimentés', d.locaux_alimentes, 'Réf. équipement / implantation', d.reference_equipement],
      ['Date du contrôle', d.date_controle, '', '']
    ]));

    if (d.afficher_filtration === 'Oui') {
      children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Filtration', bold: true, size: 20, color: BLUE })] }));
      children.push(filtrationTable(D, d));
    }

    children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'État du reste de l\u2019installation', bold: true, size: 20, color: BLUE })] }));
    children.push(etatInstallationTable(D, d));

    children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Mesures de vitesse dans le conduit', bold: true, size: 20, color: BLUE })] }));
    children.push(reseauxTable(D, d));

    children.push(new D.Paragraph({ spacing: { before: 200, after: 40 }, children: [new D.TextRun({ text: 'Conclusion', bold: true, size: 20, color: BLUE })] }));
    var c = avisColor(d.avis);
    children.push(new D.Table({
      width: { size: 15298, type: D.WidthType.DXA },
      rows: [new D.TableRow({ children: [
        headerCell(D, 'Avis par rapport aux données constructeurs', 8000),
        bodyCell(D, d.avis || '-', 7298, { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined })
      ] })]
    }));
    children.push(new D.Paragraph({ spacing: { before: 120, after: 40 }, children: [new D.TextRun({ text: 'Observations', bold: true, size: 18 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.observation || '-', size: 18 })] }));
  });

  return children;
}

function infoTable(D, rows) {
  var W = [2600, 5049, 2600, 5049];
  return new D.Table({
    width: { size: 15298, type: D.WidthType.DXA },
    rows: rows.map(function (r) {
      return new D.TableRow({ children: [
        headerCell(D, r[0], W[0]), bodyCell(D, r[1] ? String(r[1]) : '-', W[1]),
        headerCell(D, r[2], W[2]), bodyCell(D, r[3] ? String(r[3]) : '-', W[3])
      ] });
    })
  });
}

function filtrationTable(D, d) {
  var W_LABEL = 2800, W_COL = (15298 - W_LABEL) / 3;
  function row(label, key) {
    var pre = d['filt_pre_' + key], filtre = d['filt_filtre_' + key];
    var preText = (pre === undefined || pre === null || pre === '') ? '-' : String(pre);
    var filtreText = (filtre === undefined || filtre === null || filtre === '') ? '-' : String(filtre);
    var absolu = d['filt_absolu_' + key];
    var absoluText = key === 'perte_charge' ? 'n/a' : ((absolu === undefined || absolu === null || absolu === '') ? '-' : String(absolu));
    return new D.TableRow({ children: [
      new D.TableCell({ width: { size: W_LABEL, type: D.WidthType.DXA }, shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR }, verticalAlign: D.VerticalAlign.CENTER, children: [new D.Paragraph({ children: [new D.TextRun({ text: label, bold: true, size: 16 })] })] }),
      bodyCellSmall(D, preText, W_COL, { center: true }),
      bodyCellSmall(D, filtreText, W_COL, { center: true }),
      bodyCellSmall(D, absoluText, W_COL, { center: true })
    ] });
  }
  return new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: [
    new D.TableRow({ children: [headerCell(D, '', W_LABEL), headerCell(D, 'Pré-filtre', W_COL), headerCell(D, 'Filtre', W_COL), headerCell(D, 'Filtre absolu', W_COL)] }),
    row('État', 'etat'),
    row('Type', 'type'),
    row('Nombre / Dimensions', 'nombre_dimensions'),
    row('Classe d\u2019efficacité', 'classe'),
    row('Perte de charge (Pa)', 'perte_charge')
  ] });
}

function etatInstallationTable(D, d) {
  var W_LABEL = 5000, W_VAL = 10298;
  function row(label, key) {
    var v = d[key];
    var text = (v === undefined || v === null || v === '') ? '-' : String(v);
    return new D.TableRow({ children: [
      new D.TableCell({ width: { size: W_LABEL, type: D.WidthType.DXA }, shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR }, verticalAlign: D.VerticalAlign.CENTER, children: [new D.Paragraph({ children: [new D.TextRun({ text: label, bold: true, size: 16 })] })] }),
      bodyCellSmall(D, text, W_VAL)
    ] });
  }
  var rows = [
    row('État général (propreté, corrosion, chocs, etc.)', 'etat_general'),
    row('Prise d\u2019air neuf', 'prise_air_neuf'),
    row('Batterie(s) froide(s)', 'batterie_froide'),
    row('Batterie(s) chaude(s)', 'batterie_chaude'),
    row('Canalisations / Gaines', 'canalisations_gaines'),
    row('Ventilateur / Courroie', 'ventilateur_courroie')
  ];
  var maintenance = d.fiche_maintenance === 'Dernière intervention de maintenance'
    ? d.fiche_maintenance + (d.date_derniere_maintenance ? ' : ' + d.date_derniere_maintenance : '')
    : (d.fiche_maintenance || '-');
  rows.push(new D.TableRow({ children: [
    new D.TableCell({ width: { size: W_LABEL, type: D.WidthType.DXA }, shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR }, verticalAlign: D.VerticalAlign.CENTER, children: [new D.Paragraph({ children: [new D.TextRun({ text: 'Fiche de Maintenance', bold: true, size: 16 })] })] }),
    bodyCellSmall(D, maintenance, W_VAL)
  ] }));
  return new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: rows });
}

function reseauxTable(D, d) {
  var W = [1800, 1800, 1800, 1800, 1800, 1800, 1800, 1949, 1749];
  var head = ['Réseau d\u2019air', 'Forme', 'Diamètre / côté 1 (cm)', 'Côté 2 (cm)', 'Surface (m²)', 'Vitesse (m/s)', 'Débit de référence (m³/h)', 'Débit année N-1 (m³/h)', 'Débit année en cours (m³/h)'];
  var rows = [new D.TableRow({ children: head.map(function (h, i) { return headerCell(D, h, W[i]); }) })];

  [['Neuf', 'neuf'], ['Soufflé', 'souf'], ['Repris', 'rep']].forEach(function (pair) {
    var label = pair[0], p = pair[1];
    if (p === 'rep' && d.rep_active !== 'Oui') return;
    var vals = [label, d[p + '_forme'], d[p + '_diametre_cote1'], d[p + '_cote2'], d[p + '_surface'], d[p + '_vitesse'], d[p + '_reference'], d[p + '_debit_n1'], d[p + '_debit']];
    rows.push(new D.TableRow({ children: vals.map(function (v, i) {
      var text = (v === undefined || v === null || v === '') ? '-' : String(v);
      return bodyCellSmall(D, text, W[i], { center: i > 0 });
    }) }));
  });

  return new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: rows });
}

// 5.4 — Extracteurs (Inserer_Annexe_5). Même paradigme que CTA (bloc par installation, pas de tableau croisé).
function buildAnnexeExtracteur(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    alignment: D.AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new D.TextRun({ text: 'Extracteurs', italics: true, size: 20, color: '555555' })]
  }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun extracteur renseigné.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'Extracteur' + (d.reference_equipement ? ' \u2014 ' + d.reference_equipement : ''), bold: true, color: BLUE, size: 24 })]
    }));

    children.push(infoTable(D, [
      ['Bâtiment', d.batiment, 'Date du contrôle', d.date_controle],
      ['Locaux extraits', d.locaux_extraits, 'Réf. équipement / implantation', d.reference_equipement]
    ]));

    children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Mesures de vitesse', bold: true, size: 20, color: BLUE })] }));
    var vitesse = (d.vitesse_mode === 'Grille de points') ? d.vitesse_moyenne_grille : d.vitesse;
    children.push(reseauSimpleTable(D, [{
      label: 'Extrait', forme: d.forme_section, cote1: d.diametre_cote1, cote2: d.cote2, surface: d.surface_m2,
      vitesse: vitesse, reference: d.valeur_reference_recommandee, debitN1: d.debit_annee_n1, debit: d.debit_annee_en_cours
    }]));

    if (d.afficher_taux === 'Oui') {
      children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Taux de renouvellement du local', bold: true, size: 20, color: BLUE })] }));
      children.push(infoTable(D, [
        ['Volume du local (m³)', d.volume_local, 'Référentiel', d.referentiel],
        ['Volume par heure (vol/h)', d.volume_par_heure, 'Valeur recommandée (vol/h)', d.valeur_recommandee]
      ]));
      var ct = avisColor(d.conclusion_taux);
      children.push(new D.Table({
        width: { size: 15298, type: D.WidthType.DXA },
        rows: [new D.TableRow({ children: [headerCell(D, 'Conclusion taux de renouvellement', 8000), bodyCell(D, d.conclusion_taux || '-', 7298, { center: true, bold: true, fill: ct ? ct.fill : undefined, color: ct ? ct.color : undefined })] })]
      }));
    }

    children.push(new D.Paragraph({ spacing: { before: 200, after: 40 }, children: [new D.TextRun({ text: 'Conclusion', bold: true, size: 20, color: BLUE })] }));
    var c = avisColor(d.avis_constructeur);
    children.push(new D.Table({
      width: { size: 15298, type: D.WidthType.DXA },
      rows: [new D.TableRow({ children: [
        headerCell(D, 'Avis par rapport à la valeur recommandée', 8000),
        bodyCell(D, d.avis_constructeur || '-', 7298, { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined })
      ] })]
    }));
    children.push(new D.Paragraph({ spacing: { before: 120, after: 40 }, children: [new D.TextRun({ text: 'Observations', bold: true, size: 18 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.observation || '-', size: 18 })] }));
  });

  return children;
}

// Tableau générique "réseau(x) mesuré(s)" à une seule ligne (utilisé par Extracteur, Gaz d'échappement, etc.)
function reseauSimpleTable(D, reseaux) {
  var W = [1800, 1800, 1900, 1800, 1800, 1800, 1800, 1949, 1449];
  var head = ['Réseau d\u2019air', 'Forme', 'Diamètre / côté 1 (cm)', 'Côté 2 (cm)', 'Surface (m²)', 'Vitesse (m/s)', 'Valeur de référence (m³/h)', 'Débit année N-1 (m³/h)', 'Débit année en cours (m³/h)'];
  var rows = [new D.TableRow({ children: head.map(function (h, i) { return headerCell(D, h, W[i]); }) })];
  reseaux.forEach(function (r) {
    var vals = [r.label, r.forme, r.cote1, r.cote2, r.surface, r.vitesse, r.reference, r.debitN1, r.debit];
    rows.push(new D.TableRow({ children: vals.map(function (v, i) {
      var text = (v === undefined || v === null || v === '') ? '-' : String(v);
      return bodyCellSmall(D, text, W[i], { center: i > 0 });
    }) }));
  });
  return new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: rows });
}

// 5.6 — Hottes (Inserer_Annexe_8, guide INRS ED 695)
function buildAnnexeHottes(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 240 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 200 },
    children: [new D.TextRun({ text: 'Hotte à ventilation horizontale (guide INRS ED 695)', italics: true, size: 20, color: '555555' })]
  }));
  children.push(legalParagraph('Tests réalisés : mesure de la vitesse de transport et/ou mesure de la vitesse en sortie de hotte, comparées aux valeurs indiquées dans le guide INRS ED 695.', { center: true, size: 18, after: 200 }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucune hotte renseignée.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2, spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'Hotte' + (d.reference_equipement ? ' \u2014 ' + d.reference_equipement : ''), bold: true, color: BLUE, size: 24 })]
    }));

    children.push(infoTable(D, [
      ['Bâtiment', d.batiment, 'Activité et référence du local', d.localisation],
      ['Date d\u2019installation', d.date_installation, 'Date de mesure', d.date_mesure],
      ['État visuel du réseau d\u2019aspiration', d.etat_visuel_reseau, 'Test fumigène', d.test_fumigene]
    ]));

    var mesures = d.mesures_choisies || [];
    if (mesures.indexOf('Vitesse au point d\u2019émission') !== -1) {
      children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Mesure de la vitesse au point d\u2019émission', bold: true, size: 20, color: BLUE })] }));
      children.push(vpeTable(D, [
        ['Vitesse minimale (m/s)', d.vpe_min, d.vpe_min_inrs, d.vpe_min_reference, d.avis_vpe_min],
        ['Vitesse moyenne (m/s)', d.vpe_moyenne, d.vpe_moy_inrs, d.vpe_moy_reference, d.avis_vpe_moy]
      ]));
      children.push(new D.Paragraph({ spacing: { before: 100 }, children: [new D.TextRun({ text: 'Débit d\u2019air extrait (m³/h) : ' + (d.vpe_debit || '-'), size: 18, bold: true })] }));
      if (d.vpe_grid && d.vpe_nb_points_largeur && d.vpe_nb_points_hauteur) {
        children.push(new D.Paragraph({ spacing: { before: 160, after: 60 }, children: [new D.TextRun({ text: 'Relevé des vitesses mesurées dans le plan d\u2019ouverture — Largeur ' + (d.vpe_largeur_cm || '-') + ' cm \u00d7 Hauteur ' + (d.vpe_hauteur_cm || '-') + ' cm', size: 16, italics: true })] }));
        children.push(measurementGridTable(D, d.vpe_grid));
      }
    }
    if (mesures.indexOf('Vitesse de transport') !== -1) {
      children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Mesure de la vitesse de transport', bold: true, size: 20, color: BLUE })] }));
      children.push(vpeTable(D, [['Vitesse de transport (m/s)', d.vt_mesuree, d.vt_inrs, d.vt_reference, d.avis_vt]]));
    }

    children.push(new D.Paragraph({ spacing: { before: 200, after: 40 }, children: [new D.TextRun({ text: 'Conclusion', bold: true, size: 20, color: BLUE })] }));
    var c = avisColor(d.conclusion);
    children.push(new D.Table({
      width: { size: 15298, type: D.WidthType.DXA },
      rows: [new D.TableRow({ children: [
        headerCell(D, 'Avis par rapport à la réglementation et/ou aux préconisations', 8000),
        bodyCell(D, d.conclusion || '-', 7298, { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined })
      ] })]
    }));
    children.push(new D.Paragraph({ spacing: { before: 120, after: 40 }, children: [new D.TextRun({ text: 'Observation', bold: true, size: 18 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.observation || '-', size: 18 })] }));
  });

  return children;
}

function vpeTable(D, rows) {
  var W = [3800, 2800, 3800, 2800, 2098];
  var head = ['', 'Valeurs mesurées', 'Valeurs recommandées INRS', 'Valeurs de référence', 'Avis'];
  var out = [new D.TableRow({ children: head.map(function (h, i) { return headerCell(D, h, W[i]); }) })];
  rows.forEach(function (r) {
    var c = avisColor(r[4]);
    out.push(new D.TableRow({ children: [
      new D.TableCell({ width: { size: W[0], type: D.WidthType.DXA }, shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR }, verticalAlign: D.VerticalAlign.CENTER, children: [new D.Paragraph({ children: [new D.TextRun({ text: r[0], bold: true, size: 16 })] })] }),
      bodyCellSmall(D, r[1] !== undefined && r[1] !== '' ? String(r[1]) : '-', W[1], { center: true }),
      bodyCellSmall(D, r[2] !== undefined && r[2] !== '' ? String(r[2]) : '-', W[2], { center: true }),
      bodyCellSmall(D, r[3] !== undefined && r[3] !== '' ? String(r[3]) : '-', W[3], { center: true }),
      bodyCellSmall(D, r[4] || '-', W[4], { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined })
    ] }));
  });
  return new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: out });
}

// Tableau brut d'une grille de points de mesure (lignes × colonnes), sans en-têtes de dimension
function measurementGridTable(D, grid) {
  var nRows = grid.length, nCols = grid[0] ? grid[0].length : 0;
  if (nCols === 0) return new D.Paragraph({ children: [new D.TextRun({ text: 'Grille vide', italics: true, size: 16 })] });
  var W = Math.floor(15298 / nCols);
  var rows = [];
  for (var i = 0; i < nRows; i++) {
    var cells = [];
    for (var j = 0; j < nCols; j++) {
      var v = grid[i][j];
      cells.push(bodyCellSmall(D, (v === undefined || v === null || v === '') ? '-' : String(v), W, { center: true }));
    }
    rows.push(new D.TableRow({ children: cells }));
  }
  return new D.Table({ width: { size: W * nCols, type: D.WidthType.DXA }, rows: rows });
}

// 5.7 — Bras d'aspiration articulés (Inserer_Annexe_9)
function buildAnnexeBrasAspiration(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 240 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 240 },
    children: [new D.TextRun({ text: 'Bras articulé', italics: true, size: 20, color: '555555' })]
  }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun bras articulé renseigné.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2, spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'Bras articulé' + (d.reference_equipement ? ' \u2014 ' + d.reference_equipement : ''), bold: true, color: BLUE, size: 24 })]
    }));

    children.push(new D.Paragraph({ spacing: { after: 80 }, children: [new D.TextRun({ text: 'Identification du bras aspirant', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [
      ['Bâtiment', d.batiment, 'Atelier', d.atelier],
      ['Activité', d.activite, 'Référence de l\u2019équipement', d.reference_equipement]
    ]));

    children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Examen visuel de l\u2019état des éléments de l\u2019installation', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [
      ['Adapté à la situation', d.adapte_situation, 'Recyclage', d.recyclage],
      ['État visuel', d.etat_visuel, 'État des conduits aérauliques', d.etat_conduits],
      ['Test fumigène', d.test_fumigene, 'Conditions de dispersion du polluant', d.conditions_dispersion],
      ['Commentaire', d.commentaire_1, '', '']
    ]));

    children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Dimensionnement', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [
      ['Type de bouche d\u2019aspiration', d.type_bouche, 'Diamètre du conduit (cm)', d.diametre_conduit],
      ['Diamètre de la bouche (cm)', d.diametre_bouche, 'Longueur × largeur si ovale (cm)', (d.longueur_bouche_ovale || d.largeur_bouche_ovale) ? (d.longueur_bouche_ovale || '-') + ' × ' + (d.largeur_bouche_ovale || '-') : '-'],
      ['Surface de la bouche (m²)', d.surface_bouche, '', '']
    ]));

    children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Résultats des mesures de vitesse et de débit d\u2019air', bold: true, size: 20, color: BLUE })] }));
    var W = [3060, 3060, 3060, 3059, 3059];
    var head = ['Vitesse moyenne mesurée (m/s)', 'Débit calculé (m³/h)', 'Distance maximum de captage à 0,5 m/s (cm)', 'Distance d\u2019utilisation (cm)', 'Avis'];
    var c = avisColor(d.conclusion_distance);
    children.push(new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: [
      new D.TableRow({ children: head.map(function (h, i) { return headerCell(D, h, W[i]); }) }),
      new D.TableRow({ children: [
        bodyCellSmall(D, d.vitesse_moyenne !== undefined ? String(d.vitesse_moyenne) : '-', W[0], { center: true }),
        bodyCellSmall(D, d.debit_calcule !== undefined ? String(d.debit_calcule) : '-', W[1], { center: true }),
        bodyCellSmall(D, d.distance_max_captage !== undefined ? String(d.distance_max_captage) : '-', W[2], { center: true }),
        bodyCellSmall(D, d.distance_utilisation !== undefined ? String(d.distance_utilisation) : '-', W[3], { center: true }),
        bodyCellSmall(D, d.conclusion_distance || '-', W[4], { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined })
      ] })
    ] }));

    children.push(new D.Paragraph({ spacing: { before: 200, after: 40 }, children: [new D.TextRun({ text: 'Conclusion', bold: true, size: 20, color: BLUE })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.conclusion || '-', size: 18 })] }));
  });

  return children;
}

// 5.8 — Installations avec captage localisé / équipements divers (Inserer_Annexe_11, guide INRS ED 695)
function buildAnnexeInstallationsDiverses(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 240 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 200 },
    children: [new D.TextRun({ text: 'Équipements divers', italics: true, size: 20, color: '555555' })]
  }));
  children.push(legalParagraph('Tests réalisés : mesure de la vitesse de transport et/ou mesure de la vitesse au point d\u2019émission, comparées aux valeurs indiquées par le guide INRS ED 695.', { center: true, size: 18, after: 200 }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun équipement renseigné.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2, spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'Équipement' + (d.reference_equipement ? ' \u2014 ' + d.reference_equipement : ''), bold: true, color: BLUE, size: 24 })]
    }));

    children.push(infoTable(D, [
      ['Bâtiment', d.batiment, 'Activité et référence du local', d.localisation],
      ['Réf. équipement', d.reference_equipement, 'État visuel du réseau d\u2019aspiration', d.etat_visuel_reseau],
      ['Test fumigène', d.test_fumigene, '', '']
    ]));

    var mesures = d.mesures_choisies || [];
    if (mesures.indexOf('Vitesse au point d\u2019émission') !== -1) {
      children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Mesure de la vitesse au point d\u2019émission', bold: true, size: 20, color: BLUE })] }));
      children.push(vpeTable(D, [['Vitesse (m/s)', d.vpe_mesuree, d.vpe_inrs, d.vpe_reference, d.avis_vpe]]));
    }
    if (mesures.indexOf('Vitesse de transport') !== -1) {
      children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Mesure de la vitesse de transport', bold: true, size: 20, color: BLUE })] }));
      children.push(new D.Paragraph({ spacing: { after: 60 }, children: [new D.TextRun({ text: 'Type de polluants : ' + (d.vt_type_polluant || '-'), size: 18 })] }));
      children.push(vpeTable(D, [['Vitesse (m/s)', d.vt_mesuree, d.vt_inrs, d.vt_reference, d.avis_vt]]));
    }

    children.push(new D.Paragraph({ spacing: { before: 200, after: 40 }, children: [new D.TextRun({ text: 'Conclusion', bold: true, size: 20, color: BLUE })] }));
    var c = avisColor(d.avis);
    children.push(new D.Table({
      width: { size: 15298, type: D.WidthType.DXA },
      rows: [new D.TableRow({ children: [
        headerCell(D, 'Avis par rapport à la réglementation et/ou aux préconisations', 8000),
        bodyCell(D, d.avis || '-', 7298, { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined })
      ] })]
    }));
    children.push(new D.Paragraph({ spacing: { before: 120, after: 40 }, children: [new D.TextRun({ text: 'Observation', bold: true, size: 18 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.observation || '-', size: 18 })] }));
    if (d.remarque) {
      children.push(new D.Paragraph({ spacing: { before: 80 }, children: [new D.TextRun({ text: 'Remarque : ' + d.remarque, size: 16, italics: true })] }));
    }
  });

  return children;
}

// 5.9 — Locaux de charge d'accumulateurs (Inserer_Annexe_16, guide INRS ED6120 / NF EN 62485-3)
function buildAnnexeLocauxCharge(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 200 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 200 },
    children: [new D.TextRun({ text: 'Locaux de charge d\u2019accumulateurs', italics: true, size: 20, color: '555555' })]
  }));
  children.push(legalParagraph('RÉFÉRENTIELS', { bold: true, center: true, size: 20, after: 100 }));
  children.push(legalParagraph('Guide INRS ED6120 - Avril 2018 : Charge des batteries d\u2019accumulateurs au plomb', { center: true, size: 18 }));
  children.push(legalParagraph('Norme NF EN 62485-3 - Janvier 2015 : Exigences de sécurité pour les batteries d\u2019accumulateurs et les installations de batteries', { center: true, size: 18, after: 160 }));
  children.push(legalParagraph('Locaux concernés : locaux de charge de batteries de traction au plomb', { center: true, size: 18, italics: true }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun local de charge renseigné.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2, spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'Local de charge' + (d.reference_equipement ? ' \u2014 ' + d.reference_equipement : ''), bold: true, color: BLUE, size: 24 })]
    }));

    children.push(infoTable(D, [
      ['Localisation', d.localisation, 'Bâtiment', d.batiment],
      ['Réf. de l\u2019équipement', d.reference_equipement, 'Date de contrôle', d.date_controle],
      ['Ventilation permanente', d.ventilation_permanente, 'Ventilation asservie aux chargeurs', d.ventilation_asservie],
      ['Débit variable', d.debit_variable, 'Réglage du variateur', d.reglage_variateur],
      ['État visuel des installations', Array.isArray(d.etat_visuel) ? d.etat_visuel.join(', ') : d.etat_visuel, '', '']
    ]));

    children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Mesure du débit', bold: true, size: 20, color: BLUE })] }));
    var W = [3825, 3825, 3824, 3824];
    var c = avisColor(d.avis);
    children.push(new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: [
      new D.TableRow({ children: [
        headerCell(D, 'Valeur de référence (m³/h)', W[0]), headerCell(D, 'Valeur recommandée guide INRS (m³/h)', W[1]),
        headerCell(D, 'Débit mesuré du local (m³/h)', W[2]), headerCell(D, 'Avis', W[3])
      ] }),
      new D.TableRow({ children: [
        bodyCellSmall(D, d.valeur_reference || '/', W[0], { center: true }),
        bodyCellSmall(D, d.valeur_inrs !== undefined ? String(d.valeur_inrs) : '-', W[1], { center: true }),
        bodyCellSmall(D, d.debit_mesure_local !== undefined ? String(d.debit_mesure_local) : '-', W[2], { center: true }),
        bodyCellSmall(D, d.avis || '-', W[3], { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined })
      ] })
    ] }));

    children.push(new D.Paragraph({ spacing: { before: 160, after: 40 }, children: [new D.TextRun({ text: 'Conclusion : Le dispositif doit satisfaire aux préconisations indiquées par l\u2019INRS.', bold: true, size: 18 })] }));
    children.push(new D.Paragraph({ spacing: { before: 80, after: 40 }, children: [new D.TextRun({ text: 'Observations', bold: true, size: 18 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.observation || '-', size: 18 })] }));

    // Calcul du débit — grilles
    var grilles = [];
    for (var i = 1; i <= 10; i++) {
      if (d['grille' + i + '_debit_obtenu'] !== undefined && d['grille' + i + '_debit_obtenu'] !== '') grilles.push(i);
    }
    if (grilles.length > 0) {
      children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Calcul du débit \u2014 mesure sur les grilles', bold: true, size: 20, color: BLUE })] }));
      var GW = [1913, 1913, 1913, 1912, 1912, 1912, 1913, 1912];
      var ghead = ['Grille', 'Largeur (cm)', 'Longueur (cm)', 'Diamètre (cm)', 'Débit mesuré au cône (m³/h)', 'Vitesse mesurée (m/s)', 'Débit obtenu (m³/h)', ''];
      var grows = [new D.TableRow({ children: ghead.map(function (h, i2) { return headerCell(D, h, GW[i2]); }) })];
      grilles.forEach(function (i2) {
        var p = 'grille' + i2;
        var vals = ['n°' + i2, d[p + '_largeur'], d[p + '_longueur'], d[p + '_diametre'], d[p + '_debit_cone'], d[p + '_valeur_mesuree'], d[p + '_debit_obtenu'], ''];
        grows.push(new D.TableRow({ children: vals.map(function (v, i3) {
          var text = (v === undefined || v === null || v === '') ? '-' : String(v);
          return bodyCellSmall(D, text, GW[i3], { center: i3 > 0 });
        }) }));
      });
      children.push(new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: grows }));
    }

    // Calcul du débit nécessaire — chargeurs
    var chargeurs = Array.isArray(d.chargeurs) ? d.chargeurs : [];
    if (chargeurs.length > 0) {
      children.push(new D.Paragraph({ spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: 'Calcul du débit nécessaire \u2014 chargeurs (guide INRS)', bold: true, size: 20, color: BLUE })] }));
      var CW = [1275, 3230, 3230, 3230, 3230, 3103];
      var chead = ['Type', 'Nombre', 'Tension de sortie (V)', 'Courant de sortie (A)', 'Débit théorique (m³/h)', ''];
      var crows = [new D.TableRow({ children: chead.map(function (h, i2) { return headerCell(D, h, CW[i2]); }) })];
      chargeurs.forEach(function (ch, i2) {
        var deb = chargerDebit(ch);
        var vals = ['Type ' + (i2 + 1), ch.nb, ch.tension, ch.courant, deb !== '' ? deb : '-', ''];
        crows.push(new D.TableRow({ children: vals.map(function (v, i3) {
          var text = (v === undefined || v === null || v === '') ? '-' : String(v);
          return bodyCellSmall(D, text, CW[i3], { center: i3 > 0 });
        }) }));
      });
      children.push(new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: crows }));
    }
  });

  return children;
}

// 5.5 — Sorbonnes (Inserer_Annexe_7, guide INRS ED795 / normes XP X15-203 et NF EN 14175-4)
function buildAnnexeSorbonnes(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 240 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 240 },
    children: [new D.TextRun({ text: 'Sorbonnes', italics: true, size: 20, color: '555555' })]
  }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucune sorbonne renseignée.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2, spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'Sorbonne' + (d.reference_equipement ? ' \u2014 ' + d.reference_equipement : ''), bold: true, color: BLUE, size: 24 })]
    }));

    children.push(infoTable(D, [
      ['Bâtiment', d.batiment, 'Activité et référence du local', d.localisation],
      ['Date du contrôle', d.date_controle, 'Réf. équipement', d.reference_equipement]
    ]));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Mesures et contexte', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [
      ['Température (°C)', d.temperature, 'Hygrométrie (%)', d.hygrometrie],
      ['Pression atmosphérique (hPa)', d.pression_atmospherique, 'Différence de pression (Pa)', d.difference_pression],
      ['Appareils de mesure', d.appareils_mesure, 'Local', d.local],
      ['Paillasse', d.paillasse, 'Ouvrants', d.ouvrants],
      ['Obstacle gênant un point', d.obstacle_point_mesure, 'Autre(s) sorbonne(s) en fonctionnement', d.autres_sorbonnes],
      ['Autre(s) dispositif(s) de ventilation', d.autres_dispositifs, 'Remarques complémentaires', d.remarques_complementaires]
    ]));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Test au fumigène', bold: true, size: 20, color: BLUE })] }));
    var fumRows = [
      ['Présence de zones turbulentes', d.zones_turbulentes, 'Présence de zones mortes', d.zones_mortes],
      ['Perturbations constatées', d.perturbations, '', '']
    ];
    if (d.perturbations === 'Non') {
      fumRows.push(['Vitesse à 90 cm (m/s)', d.v90_mesuree, 'Vitesse à 140 cm (m/s)', d.v140_mesuree]);
    }
    children.push(infoTable(D, fumRows));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Ouverture de travail', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [
      ['Largeur (mm)', d.largeur_mm, 'h (mm)', d.h_mm],
      ['Norme applicable', d.annee_construction, 'Surface de l\u2019ouverture (m²)', d.surface_ouverture],
      ['Espace horizontal entre 2 points (mm)', d.espace_horizontal, 'Espace vertical entre 2 points (mm)', d.espace_vertical]
    ]));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Dispositif de sécurité', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [
      ['Verrouillage de la paroi vitrée (butée)', d.verrouillage_paroi, 'Parachute sur la paroi vitrée', d.parachute_paroi],
      ['Mesure de la vitesse frontale', d.mesure_vitesse_frontale, 'Alarme sonore', d.alarme_sonore],
      ['Alarme visuelle', d.alarme_visuelle, 'Eclairage à l\u2019intérieur du volume', d.eclairage_interieur]
    ]));

    if (d.grille && d.nb_colonnes && d.nb_lignes) {
      children.push(new D.Paragraph({ spacing: { before: 180, after: 60 }, children: [new D.TextRun({ text: 'Relevé des vitesses mesurées dans le plan d\u2019ouverture', bold: true, size: 20, color: BLUE })] }));
      children.push(measurementGridTable(D, d.grille));
    }

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Résultats (guide INRS ED 795)', bold: true, size: 20, color: BLUE })] }));
    children.push(sorbonneResultatsTable(D, [
      ['Vitesse minimale (m/s)', d.vitesse_min_mesuree, d.vitesse_min_reference, '0,4', d.vitesse_min_avis_reference, d.vitesse_min_avis_norme],
      ['Vitesse moyenne (m/s)', d.vitesse_moy_mesuree, d.vitesse_moy_reference, '/', d.vitesse_moy_avis_reference, '/'],
      ['Débit d\u2019air extrait (m³/h)', d.debit_mesure, d.debit_reference, '/', d.debit_avis_reference, '/']
    ]));

    children.push(new D.Paragraph({ spacing: { before: 160, after: 40 }, children: [new D.TextRun({ text: 'Commentaire', bold: true, size: 18 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.commentaire || '-', size: 18 })] }));
  });

  return children;
}

function sorbonneResultatsTable(D, rows) {
  var W = [2600, 2140, 2140, 2140, 3139, 3139];
  var head = ['', 'Valeurs mesurées', 'Valeurs de référence', 'Recommandations ED795', 'Avis / valeurs de référence', 'Avis / ED795 de l\u2019INRS'];
  var out = [new D.TableRow({ children: head.map(function (h, i) { return headerCell(D, h, W[i]); }) })];
  rows.forEach(function (r) {
    var c1 = avisColor(r[4]), c2 = avisColor(r[5]);
    out.push(new D.TableRow({ children: [
      new D.TableCell({ width: { size: W[0], type: D.WidthType.DXA }, shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR }, verticalAlign: D.VerticalAlign.CENTER, children: [new D.Paragraph({ children: [new D.TextRun({ text: r[0], bold: true, size: 16 })] })] }),
      bodyCellSmall(D, r[1] !== undefined && r[1] !== '' ? String(r[1]) : '-', W[1], { center: true }),
      bodyCellSmall(D, r[2] !== undefined && r[2] !== '' ? String(r[2]) : '-', W[2], { center: true }),
      bodyCellSmall(D, r[3] !== undefined && r[3] !== '' ? String(r[3]) : '-', W[3], { center: true }),
      bodyCellSmall(D, r[4] || '-', W[4], { center: true, bold: true, fill: c1 ? c1.fill : undefined, color: c1 ? c1.color : undefined }),
      bodyCellSmall(D, r[5] || '-', W[5], { center: true, bold: true, fill: c2 ? c2.fill : undefined, color: c2 ? c2.color : undefined })
    ] }));
  });
  return new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: out });
}

// 5.x — Cabines de peinture (Inserer_Annexe_10, guide INRS ED 835/ED 928, norme 16985)
function buildAnnexeCabinesPeinture(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 200 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 200 },
    children: [new D.TextRun({ text: 'Vérification des cabines de peinture', italics: true, size: 20, color: '555555' })]
  }));
  children.push(legalParagraph('Méthodologie de vérification de la ventilation des cabines de peinture', { bold: true, center: true, size: 20, after: 120 }));
  children.push(legalParagraph('Ventilation verticale : mesures réalisées à 1 m du sol, aux points indiqués dans les fiches annexes.', { after: 60 }));
  children.push(legalParagraph('Ventilation horizontale : mesures réalisées dans le plan de travail du peintre — vérifier qu\u2019il ne se trouve pas entre le pulvérisateur et l\u2019objet à peindre.', { after: 160 }));
  children.push(legalParagraph('Les valeurs mesurées sont comparées à celles des guides INRS ED 835 (peintures liquides) et ED 928 (peintures poudre) ou, éventuellement, à celles de la norme 16985.', { after: 100 }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucune cabine de peinture renseignée.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2, spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'Cabine de peinture' + (d.type_cabine ? ' ' + d.type_cabine.toUpperCase() : '') + (d.reference_equipement ? ' \u2014 ' + d.reference_equipement : ''), bold: true, color: BLUE, size: 24 })]
    }));

    children.push(infoTable(D, [
      ['Marque', d.marque, 'Emplacement', d.batiment],
      ['Date du contrôle', d.date_controle, 'Description de la cabine', d.reference_equipement],
      ['Type de flux', d.type_flux, 'Pulvérisation', d.pulverisation],
      ['Nature des produits à peindre', d.nature_produits, 'Zone de travail', d.zone_travail]
    ]));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'État visuel de la cabine / Test fumigène', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [
      ['État visuel de la cabine', d.etat_visuel_cabine, 'État des filtres', d.etat_filtres],
      ['Vérification de la direction du flux', d.direction_flux, 'Avis / Code de la santé publique', d.avis_csp]
    ]));
    if (d.observation_visuel) {
      children.push(new D.Paragraph({ spacing: { before: 60 }, children: [new D.TextRun({ text: 'Observation : ' + d.observation_visuel, size: 18 })] }));
    }

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Mesure de la cabine vide', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [['Largeur (m)', d.largeur_cabine, 'Longueur (m)', d.longueur_cabine]]));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Vitesse d\u2019air dans la cabine vide', bold: true, size: 20, color: BLUE })] }));
    var vRows = [['Vitesse moyenne (m/s)', d.v1_mesuree, d.v1_reference, d.v1_valeur_recommandee, d.v1_avis]];
    if (d.v2_active === 'Oui') vRows.push(['Vitesse minimale (m/s)', d.v2_mesuree, d.v2_reference, d.v2_valeur_recommandee, d.v2_avis]);
    children.push(vpeTable(D, vRows));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Débit d\u2019air dans la cabine vide', bold: true, size: 20, color: BLUE })] }));
    children.push(vpeTable(D, [['Débit (m³/h)', d.debit_mesure, '', d.debit_reference, d.debit_avis]]));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 40 }, children: [new D.TextRun({ text: 'Conclusion', bold: true, size: 20, color: BLUE })] }));
    var c = avisColor(d.conclusion);
    children.push(new D.Table({
      width: { size: 15298, type: D.WidthType.DXA },
      rows: [new D.TableRow({ children: [
        headerCell(D, 'Avis par rapport à la réglementation et/ou aux préconisations vis-à-vis des cabines de peinture', 8000),
        bodyCell(D, d.conclusion || '-', 7298, { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined })
      ] })]
    }));
    children.push(new D.Paragraph({ spacing: { before: 120, after: 40 }, children: [new D.TextRun({ text: 'Observation', bold: true, size: 18 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.observations || '-', size: 18 })] }));
  });

  return children;
}

// 5.x — Box de préparation des peintures (Inserer_Annexe_14, norme NF T 35-014)
function buildAnnexeBoxPeinture(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 200 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 200 },
    children: [new D.TextRun({ text: 'Box de préparation des peintures', italics: true, size: 20, color: '555555' })]
  }));
  children.push(legalParagraph('RÉFÉRENTIEL', { bold: true, center: true, underline: true, size: 20, after: 100 }));
  children.push(legalParagraph('NF T 35-014, Décembre 2004 — Box de préparation des peintures', { center: true, size: 18 }));
  children.push(legalParagraph('Taux de renouvellement minimum préconisé : 50 volumes/heure', { center: true, size: 18, after: 100 }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun box de préparation de peinture renseigné.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2, spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'Box de préparation des peintures', bold: true, color: BLUE, size: 24 })]
    }));

    children.push(infoTable(D, [
      ['Activité et référence du local', d.activite_reference_local, 'Bâtiment', d.batiment],
      ['Date du contrôle', d.date_controle, 'Nombre de captage présent', d.nombre_captage]
    ]));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'État visuel des installations', bold: true, size: 20, color: BLUE })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: Array.isArray(d.etat_visuel_installations) ? d.etat_visuel_installations.join(', ') : (d.etat_visuel_installations || '-'), size: 18 })] }));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Caractéristiques de la ventilation', bold: true, size: 20, color: BLUE })] }));
    var W = [5100, 10198];
    function longRow(label, val) {
      return new D.TableRow({ children: [
        new D.TableCell({ width: { size: W[0], type: D.WidthType.DXA }, shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR }, verticalAlign: D.VerticalAlign.CENTER, children: [new D.Paragraph({ children: [new D.TextRun({ text: label, bold: true, size: 16 })] })] }),
        bodyCellSmall(D, val || '-', W[1])
      ] });
    }
    children.push(new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: [
      longRow('Ventilation naturelle permanente', d.ventilation_naturelle),
      longRow('Asservissement', d.asservissement),
      longRow('Type de ventilation', d.type_ventilation)
    ] }));

    children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Taux de renouvellement', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [
      ['Volume du local (m³)', d.volume_local, 'Débit d\u2019extraction du box (m³/h)', d.debit_extraction_box],
      ['Volume par heure (vol/h)', d.volume_par_heure, 'Débit minimal pour 50 vol/h (m³/h)', d.debit_minimal_50vh]
    ]));
    var cr = avisColor(d.conclusion_renouvellement);
    children.push(new D.Table({
      width: { size: 15298, type: D.WidthType.DXA },
      rows: [new D.TableRow({ children: [
        headerCell(D, 'Conclusion \u2014 taux de renouvellement', 8000),
        bodyCell(D, d.conclusion_renouvellement || '-', 7298, { center: true, bold: true, fill: cr ? cr.fill : undefined, color: cr ? cr.color : undefined })
      ] })]
    }));

    // Détail des captages (si renseignés)
    var nCaptages = parseInt(d.nombre_captage, 10) || 0;
    if (nCaptages > 0) {
      children.push(new D.Paragraph({ spacing: { before: 180, after: 80 }, children: [new D.TextRun({ text: 'Captages', bold: true, size: 20, color: BLUE })] }));
      var CW = [1912, 1912, 1912, 1912, 1913, 1913, 1912, 1912];
      var chead = ['Captage', 'Forme', 'Diamètre / côté 1 (cm)', 'Côté 2 (cm)', 'Surface (m²)', 'Vitesse (m/s)', 'Débit référence (m³/h)', 'Débit mesuré (m³/h)'];
      var crows = [new D.TableRow({ children: chead.map(function (h, i) { return headerCell(D, h, CW[i]); }) })];
      for (var i = 1; i <= nCaptages; i++) {
        var p = 'captage' + i;
        var vals = ['n°' + i, d[p + '_forme'], d[p + '_diametre_cote1'], d[p + '_cote2'], d[p + '_surface'], d[p + '_vitesse'], d[p + '_reference'], d[p + '_debit']];
        crows.push(new D.TableRow({ children: vals.map(function (v, i2) {
          var text = (v === undefined || v === null || v === '') ? '-' : String(v);
          return bodyCellSmall(D, text, CW[i2], { center: i2 > 0 });
        }) }));
      }
      children.push(new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: crows }));
    }

    children.push(new D.Paragraph({ spacing: { before: 180, after: 40 }, children: [new D.TextRun({ text: 'Conclusion', bold: true, size: 20, color: BLUE })] }));
    var c = avisColor(d.avis);
    children.push(new D.Table({
      width: { size: 15298, type: D.WidthType.DXA },
      rows: [new D.TableRow({ children: [
        headerCell(D, 'Avis par rapport à la réglementation et/ou aux préconisations', 8000),
        bodyCell(D, d.avis || '-', 7298, { center: true, bold: true, fill: c ? c.fill : undefined, color: c ? c.color : undefined })
      ] })]
    }));
    children.push(new D.Paragraph({ spacing: { before: 120, after: 40 }, children: [new D.TextRun({ text: 'Observation', bold: true, size: 18 })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.observation || '-', size: 18 })] }));
    if (d.commentaire) {
      children.push(new D.Paragraph({ spacing: { before: 80, after: 40 }, children: [new D.TextRun({ text: 'Commentaire / Informations', bold: true, size: 18 })] }));
      children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.commentaire, size: 18 })] }));
    }
  });

  return children;
}

// 5.x — ERP / Locaux à pollution non spécifique des établissements recevant du public
// (Inserer_Annexe_6, Articles R4222-5/R4222-6 + Règlement Sanitaire Départemental type Art. 64/66)
function buildAnnexeERP(D, list) {
  var legal = [
    legalParagraph('Article R4222-5', { bold: true, center: true, size: 20 }),
    legalParagraph('Créé par Décret n°2008-244 du 7 mars 2008 - art. (V)', { italics: true, center: true, size: 16, after: 160 }),
    legalParagraph('L\u2019aération par ventilation naturelle, assurée exclusivement par ouverture de fenêtres ou autres ouvrants donnant directement sur l\u2019extérieur, est autorisée lorsque le volume par occupant est égal ou supérieur à :'),
    legalParagraph('1° / 15 m³ pour les bureaux et les locaux où est accompli un travail physique léger ;'),
    legalParagraph('2° / 24 m³ pour les autres locaux.', { after: 280 }),
    legalParagraph('Article R4222-6', { bold: true, center: true, size: 20 }),
    legalParagraph('Créé par Décret n°2008-244 du 7 mars 2008 - art. (V)', { italics: true, center: true, size: 16, after: 160 }),
    legalParagraph('Lorsque l\u2019aération est assurée par ventilation mécanique, le débit minimal d\u2019air neuf à introduire par occupant est fixé dans le tableau suivant :', { after: 160 }),
    new D.Table({
      width: { size: 8000, type: D.WidthType.DXA },
      alignment: D.AlignmentType.CENTER,
      rows: [
        new D.TableRow({ children: [headerCell(D, 'DESIGNATION DES LOCAUX', 5600), headerCell(D, 'DEBIT MINIMAL (m³/h/occupant)', 2400)] }),
        new D.TableRow({ children: [bodyCell(D, 'Bureaux, locaux sans travail physique', 5600), bodyCell(D, '25', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux de restauration, locaux de vente, locaux de réunion', 5600), bodyCell(D, '30', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Ateliers et locaux avec travail physique léger', 5600), bodyCell(D, '45', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Autres ateliers et locaux', 5600), bodyCell(D, '60', 2400, { center: true })] })
      ]
    }),
    new D.Paragraph({ children: [new D.PageBreak()] }),
    legalParagraph('Extraits du Règlement Sanitaire Départemental type', { bold: true, center: true, size: 20 }),
    legalParagraph('Les valeurs ci-après s\u2019appliquent uniquement au public dans les locaux à pollution non spécifique :', { after: 160 }),
    legalParagraph('Article 64', { bold: true, size: 18, after: 80 }),
    legalParagraph('Lorsque l\u2019aération est assurée par ventilation mécanique, le débit minimal d\u2019air neuf à introduire par occupant est fixé dans le tableau suivant :', { after: 160 }),
    new D.Table({
      width: { size: 15298, type: D.WidthType.DXA },
      rows: [
        new D.TableRow({ children: [headerCell(D, 'DESIGNATION DES LOCAUX', 11700), headerCell(D, 'DEBIT MINIMAL (m³/h)', 3598)] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux d\u2019enseignement : classes, salles d\u2019études, laboratoires (hors pollution spécifique) — maternelles, primaires et secondaires du 1er cycle', 11700), bodyCell(D, '15', 3598, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux d\u2019enseignement : secondaires du 2e cycle et universitaires, ateliers', 11700), bodyCell(D, '18', 3598, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux de vente : boutiques, supermarchés', 11700), bodyCell(D, '18', 3598, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux de restauration : cafés, bars, restaurants, cantines, salles à manger', 11700), bodyCell(D, '18', 3598, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Bureaux et locaux assimilés : locaux d\u2019accueil, bibliothèques, bureaux de poste, banques', 11700), bodyCell(D, '18', 3598, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux de réunions : salles de réunions, de spectacles, de culte, clubs, foyers', 11700), bodyCell(D, '18', 3598, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux d\u2019hébergement : chambres collectives (plus de trois personnes) (1), dortoirs, cellules, salles de repos', 11700), bodyCell(D, '18', 3598, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux à usage sportif : par sportif, dans une piscine', 11700), bodyCell(D, '22', 3598, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux à usage sportif : par sportif', 11700), bodyCell(D, '25', 3598, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux à usage sportif : par spectateur', 11700), bodyCell(D, '18', 3598, { center: true })] })
      ]
    }),
    legalParagraph('(1) Pour les chambres de moins de trois personnes, le débit minimal à prévoir est de 30 m³/heure par local.', { italics: true, size: 16, after: 240 }),
    legalParagraph('Article 66', { bold: true, size: 18, after: 80 }),
    legalParagraph('L\u2019aération par ventilation naturelle, assurée exclusivement par ouverture de fenêtres ou autres ouvrants donnant directement sur l\u2019extérieur, est autorisée lorsque le volume par occupant est égal ou supérieur à 6 m³ pour les locaux à pollution non spécifique tels que salles de réunion, de spectacles, de culte, clubs, foyers, dans les locaux de vente tels que boutiques, supermarchés, et dans les locaux de restauration tels que cafés, bars, restaurants, cantines, salles à manger.')
  ];

  var rows = [
    { label: 'Bâtiment', key: 'batiment' },
    { label: 'Référence du local', key: 'reference_local' },
    { label: 'Type de local', key: 'type_local' },
    { label: 'Ventilation', key: 'type_ventilation' },
    { label: 'Volume (m³)', key: 'volume' },
    { label: 'Travailleur', key: 'travailleur' },
    { label: 'Public', key: 'public' },
    { subheader: 'Extraction' },
    { label: 'Débit total mesuré (m³/h)', key: 'debit_total_mesure' },
    { label: 'Présence d\u2019ouvrant donnant directement sur l\u2019extérieur', key: 'ouvrant_exterieur' },
    { label: 'Présence d\u2019entrée d\u2019air donnant directement sur l\u2019extérieur', key: 'entree_air_exterieur' },
    { subheader: 'Soufflage' },
    { label: 'Débit total (m³/h)', key: 'debit_soufflage' },
    { label: 'Débit d\u2019air neuf introduit (m³/h)', key: 'debit_air_neuf_introduit' },
    { label: 'Pourcentage d\u2019air neuf (%)', key: 'pourcentage_air_neuf' },
    { label: 'Nombre de bouches', key: 'nombre_bouches' },
    { label: 'État des bouches', key: 'etat_bouches' },
    { subheader: 'Constat' },
    { label: 'Type de ventilation', key: 'type_ventilation_libelle' },
    { label: 'Débit minimum d\u2019air neuf (m³/h)', key: 'debit_min_air_neuf' },
    { label: 'Volume minimal (m³)', key: 'volume_min' },
    { label: 'Avis par rapport aux valeurs réglementaires', key: 'avis', isAvis: true }
  ];

  return crosstabSection(D, 'ERP', 'locaux à pollution non spécifique', legal, rows, list);
}

// 5.x — Menuiserie (machines à bois) — Inserer_Annexe_13bis. Une fiche par machine (pas de tableau
// croisé) : identification, état visuel, conditions de mesure, vitesse de transport, débit, conclusion,
// puis le détail du relevé (gaine, grille de points le cas échéant).
function buildAnnexeMenuiserieMAB(D, list) {
  var children = [];
  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 240 },
    children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, color: BLUE, size: 24 })]
  }));
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 240 },
    children: [new D.TextRun({ text: 'Menuiserie \u2014 Machine à bois', italics: true, size: 20, color: '555555' })]
  }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucune machine à bois renseignée.', italics: true, size: 20 })] }));
    return children;
  }

  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    children.push(new D.Paragraph({
      heading: D.HeadingLevel.HEADING_2, spacing: { before: 120, after: 120 },
      children: [new D.TextRun({ text: 'Machine à bois' + (d.reference_machine ? ' \u2014 ' + d.reference_machine : ''), bold: true, color: BLUE, size: 24 })]
    }));

    children.push(infoTable(D, [
      ['Référence de la machine à bois', d.reference_machine, 'Date de contrôle', d.date_controle],
      ['Type de machine à bois', d.type_machine, '', '']
    ]));

    if (d.photo) {
      children.push(new D.Paragraph({ spacing: { before: 160, after: 80 }, children: [new D.TextRun({ text: 'Photo de l\u2019équipement', bold: true, size: 20, color: BLUE })] }));
      children.push(new D.Paragraph({ children: [new D.ImageRun({ data: d.photo, transformation: { width: 380, height: 260 } })] }));
    }

    children.push(new D.Paragraph({ spacing: { before: 160, after: 80 }, children: [new D.TextRun({ text: 'État visuel du réseau d\u2019aspiration', bold: true, size: 20, color: BLUE })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: Array.isArray(d.etat_visuel_reseau) ? d.etat_visuel_reseau.join(', ') || '-' : (d.etat_visuel_reseau || '-'), size: 18 })] }));

    children.push(new D.Paragraph({ spacing: { before: 160, after: 80 }, children: [new D.TextRun({ text: 'Conditions de mesure', bold: true, size: 20, color: BLUE })] }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: d.simultaneites || '-', size: 18 })] }));

    children.push(new D.Paragraph({ spacing: { before: 160, after: 80 }, children: [new D.TextRun({ text: 'Mesure de la vitesse de transport', bold: true, size: 20, color: BLUE })] }));
    children.push(vitesseDebitTable(D, [
      ['Vitesse moyenne (m/s)', d.vitesse_moyenne, d.vitesse_reference, d.vitesse_inrs_ed750, d.vitesse_avis]
    ]));

    children.push(new D.Paragraph({ spacing: { before: 160, after: 80 }, children: [new D.TextRun({ text: 'Calcul du débit', bold: true, size: 20, color: BLUE })] }));
    children.push(vitesseDebitTable(D, [
      ['Débit calculé (m³/h)', d.debit, d.debit_reference, d.debit_inrs_ed750, d.debit_avis]
    ]));

    children.push(new D.Paragraph({ spacing: { before: 160, after: 40 }, children: [new D.TextRun({ text: 'Conclusion', bold: true, size: 20, color: BLUE })] }));
    var avisConcl = d.conclusion_avis; var col = avisColor(avisConcl);
    children.push(new D.Paragraph({ spacing: { after: 80 }, children: [new D.TextRun({ text: avisConcl || '-', bold: !!col, color: col ? col.color : undefined, size: 18 })] }));
    if (d.observation) {
      children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Observation : ' + d.observation, size: 18, italics: true })] }));
    }

    children.push(new D.Paragraph({ spacing: { before: 160, after: 80 }, children: [new D.TextRun({ text: 'Mesure de la vitesse et du débit d\u2019air extrait \u2014 détail', bold: true, size: 20, color: BLUE })] }));
    children.push(infoTable(D, [
      ['Type de conduit', d.forme_conduit, 'Diamètre / côté 1 (cm)', d.diametre_cote1],
      ['Côté 2 (cm)', d.forme_conduit === 'Rectangulaire' ? d.cote2 : '-', 'Surface (m²)', d.surface_m2],
      ['Température dans le conduit (°C)', d.temperature_conduit, 'Pression statique (Pa)', d.pression_statique],
      ['Masse volumique (kg/m³)', d.masse_volumique, 'Saisie de la vitesse', d.vitesse_mode]
    ]));

    if (d.vitesse_mode === 'Grille de points' && d.vitesse_grid) {
      children.push(new D.Paragraph({ spacing: { before: 120, after: 60 }, children: [new D.TextRun({ text: 'Grille de points (m/s)', bold: true, size: 18 })] }));
      children.push(measurementGridTable(D, d.vitesse_grid));
    }
  });

  return children;
}

function vitesseDebitTable(D, rows) {
  var W = [4000, 2825, 2825, 2825, 2823];
  var head = ['', 'Valeur mesurée', 'Valeur de référence', 'Valeur recommandée (INRS ED750)', 'Avis'];
  var out = [new D.TableRow({ children: head.map(function (h, i) { return headerCell(D, h, W[i]); }) })];
  rows.forEach(function (r) {
    var col = avisColor(r[4]);
    out.push(new D.TableRow({ children: [
      new D.TableCell({ width: { size: W[0], type: D.WidthType.DXA }, shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR }, verticalAlign: D.VerticalAlign.CENTER, children: [new D.Paragraph({ children: [new D.TextRun({ text: r[0], bold: true, size: 16 })] })] }),
      bodyCellSmall(D, r[1] !== undefined && r[1] !== '' ? String(r[1]) : '-', W[1], { center: true }),
      bodyCellSmall(D, r[2] !== undefined && r[2] !== '' ? String(r[2]) : '-', W[2], { center: true }),
      bodyCellSmall(D, r[3] !== undefined && r[3] !== '' ? String(r[3]) : '-', W[3], { center: true }),
      bodyCellSmall(D, r[4] || '-', W[4], { center: true, bold: !!col, fill: col ? col.fill : undefined, color: col ? col.color : undefined })
    ] }));
  });
  return new D.Table({ width: { size: 15298, type: D.WidthType.DXA }, rows: out });
}

function buildAnnexeProvisoire(D, t, list) {
  var children = [];
  var borders = {
    top: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE },
    bottom: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE },
    left: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE },
    right: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE }
  };
  var W_LABEL = 4800, W_VALUE = 9800;

  function labelCell(text) {
    return new D.TableCell({
      width: { size: W_LABEL, type: D.WidthType.DXA }, borders: borders,
      shading: { fill: 'E8F1F8', type: D.ShadingType.CLEAR },
      children: [new D.Paragraph({ children: [new D.TextRun({ text: text, bold: true, size: 18 })] })]
    });
  }
  function valueCell(text) {
    return new D.TableCell({
      width: { size: W_VALUE, type: D.WidthType.DXA }, borders: borders,
      children: [new D.Paragraph({ children: [new D.TextRun({ text: text, size: 18 })] })]
    });
  }
  function sectionRow(text) {
    return new D.TableRow({ children: [new D.TableCell({
      columnSpan: 2, width: { size: W_LABEL + W_VALUE, type: D.WidthType.DXA }, borders: borders,
      shading: { fill: BLUE, type: D.ShadingType.CLEAR },
      children: [new D.Paragraph({ children: [new D.TextRun({ text: text, bold: true, size: 18, color: 'FFFFFF' })] })]
    })] });
  }

  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_2,
    spacing: { before: 120, after: 120 },
    children: [new D.TextRun({ text: t.label + ' (' + list.length + ') \u2014 version provisoire', bold: true, color: BLUE, size: 24 })]
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
    children.push(new D.Table({ width: { size: W_LABEL + W_VALUE, type: D.WidthType.DXA }, columnWidths: [W_LABEL, W_VALUE], rows: finalRows }));
  });

  return children;
}

console.log('\u2713 Export Word charg\u00e9');
