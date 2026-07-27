// export-word.js - Export du rapport de contrôle aération en Word (.docx)
// Reproduit la structure du rapport SOCOTEC d'origine (modules VBA F_P0 / Presentation_De_La_Mission /
// Documents_Transmis / Sommaire). Lot 1 : page de garde, sommaire, présentation de la mission,
// description générale des locaux, documents transmis à SOCOTEC.
// Les lots suivants ajouteront : 4. Synthèse du contrôle, 5. Annexes (détail par installation).

// Palette relevée sur les rapports de référence SOCOTEC (extraction directe des couleurs de
// remplissage/texte du PDF d'origine) — à respecter à l'identique, ce ne sont pas des choix libres.
var BLUE = '000000';        // titres de niveau 1 (noir dans le PDF d'origine, pas bleu)
var ACCENT = '00ACE8';       // cyan — sous-titres (x.y), bordures de tableaux, bandeaux de page d'annexe
var NAVY = '005399';         // bleu marine — bandeaux de titre de tableau / bandeaux de section
var TABLE_HEADER_BLUE = '0082DE'; // bleu moyen — ligne d'en-têtes de colonnes
var AVIS_GREEN = '95C918';    // fond avis Satisfaisant / Conforme
var AVIS_AMBER = 'FFC000';    // fond avis Non Satisfaisant / Non Conforme
var LEGAL_GRAY = 'E6E6E6';    // fond des encarts "Extraits du Code du Travail"
var GRAY_IDENTITY = '808080'; // fond des lignes d'identification (Bâtiment, Référence, Type) dans les tableaux croisés
var LIGHT = 'DEEAF6';       // cases cochées / fonds clairs
var LOGO_PATH = 'assets/logo-socotec.jpg';
var BANNER_PATH = 'assets/report/banner-rapport.jpg';
var CROSSTAB_GROUP_SIZE = 5; // nombre d'installations par page de tableau croisé (comme le PDF de référence)
// Largeur de contenu utile en section portrait (A4 11906 twips - 2x1134 de marge) — les pages d'annexes
// du PDF de référence sont en portrait, pas en paysage : tous les tableaux/bandeaux d'annexe doivent
// tenir dans cette largeur, pas dans celle d'une page paysage.
var ANNEXE_CONTENT_WIDTH = 9636;

// Les 18 types se regroupent en 9 sections d'annexes (5.1 à 5.9, comme dans le PDF de référence) —
// plusieurs types partagent une même page de garde de section (photo + bandeau pivoté).
var SECTION_GROUPS = [
  { key: 'non_specifique', titre: 'Locaux à Pollution Spécifique / Non Spécifique', types: ['bureaux', 'erp'], images: ['assets/report/divider-bureaux-1.jpg', 'assets/report/divider-bureaux-2.jpg'] },
  { key: 'sanitaires', titre: 'Sanitaires', types: ['sanitaires'], images: ['assets/report/divider-sanitaires.png'] },
  { key: 'cta', titre: 'Vérification des centrales de traitement de l’air', types: ['cta'], images: ['assets/report/divider-cta.jpg'] },
  { key: 'extracteur', titre: 'Vérification des extracteurs', types: ['extracteur'], images: ['assets/report/divider-extracteur.jpg'] },
  { key: 'sorbonnes', titre: 'Vérification des sorbonnes', types: ['sorbonnes'], images: ['assets/report/divider-sorbonnes.png'] },
  { key: 'hottes', titre: 'Vérification des hottes et dosserets aspirants', types: ['hottes'], images: ['assets/report/divider-hottes.png'] },
  { key: 'bras_aspiration', titre: 'Vérification des bras articulés', types: ['bras_aspiration'], images: ['assets/report/divider-bras-aspiration.png'] },
  { key: 'captage_localise', titre: 'Vérification des équipements', types: ['installations_diverses', 'gaz_echappement', 'menuiserie', 'menuiserie_bis', 'box_peinture', 'torches_aspirantes', 'tts', 'cabines_peinture', 'locaux_fumeurs'], images: ['assets/report/divider-installations-diverses.png'] },
  { key: 'locaux_charge', titre: 'Vérification des locaux de charge d’accumulateurs', types: ['locaux_charge'], images: ['assets/report/divider-locaux-charge-1.jpg', 'assets/report/divider-locaux-charge-2.jpg'] }
];
function imageTypeFromPath(path) {
  return /\.png$/i.test(path) ? 'png' : 'jpg';
}
function sectionGroupForType(typeId) {
  for (var i = 0; i < SECTION_GROUPS.length; i++) {
    if (SECTION_GROUPS[i].types.indexOf(typeId) !== -1) return SECTION_GROUPS[i];
  }
  return null;
}

// Bordures cyan (ACCENT) utilisées sur les tableaux du rapport, épaisseur relevée sur le PDF de référence
var TABLE_BORDERS = { style: 'single', size: 4, color: ACCENT };
function CELL_BORDERS(D) {
  var b = { style: D.BorderStyle.SINGLE, size: 4, color: ACCENT };
  return { top: b, bottom: b, left: b, right: b };
}

// Configuration de la "Synthèse du contrôle" (4.) par type d'installation, reconstituée depuis
// Conclusion.bas + CONSTANTE.bas (constantes Libelle_Conclusion_X_Y) du VBA d'origine.
// col1 = Bâtiment (ou Référence pour Menuiserie machines à bois), col2/col3 = colonnes d'identification
// complémentaires (facultatives selon le type), avis = champ \u00abavis global\u00bb le plus représentatif
// disponible dans notre schéma, commentaire = champ commentaire/observation associé.
// Hottes -> 'conclusion' (pire des avis vitesse au point d'émission / vitesse de transport, cf.
// conclusionHotte() dans calculations.js) ; Torches aspirantes -> 'note_reference' (pire des constats
// des points de mesure renseignés, cf. calculations.js).
var SYNTHESE_CONFIG = {
  bureaux: { titre: 'Conclusion sur les contrôles des locaux à pollution non spécifique', col1: 'batiment', col1Label: 'Bâtiment', col2: 'type_local', col2Label: 'Type de local', col3: 'reference_local', col3Label: 'Nom du local', avis: 'avis', commentaire: 'commentaire' },
  sanitaires: { titre: 'Conclusion sur les sanitaires', col1: 'batiment', col1Label: 'Bâtiment', col2: 'repere', col2Label: 'Repère', col3: 'nom_usage', col3Label: 'Nom d\u2019usage', avis: 'avis', commentaire: 'observation' },
  locaux_fumeurs: { titre: 'Conclusion sur les locaux fumeurs', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence de l\u2019équipement', avis: 'avis_csp', commentaire: 'observation' },
  cta: { titre: 'Conclusion sur les CTA', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Réf. équipement et/ou implantation', avis: 'avis', commentaire: 'observation' },
  extracteur: { titre: 'Conclusion sur les extracteurs', col1: 'batiment', col1Label: 'Bâtiment', col2: 'locaux_extraits', col2Label: 'Réf. équipement et/ou implantation', avis: 'avis_constructeur', commentaire: 'observation' },
  erp: { titre: 'Conclusion sur les contrôles des locaux à pollution non spécifique dans un établissement recevant du public', col1: 'batiment', col1Label: 'Bâtiment', col2: 'type_local', col2Label: 'Type de local', avis: 'avis', commentaire: 'commentaire' },
  sorbonnes: { titre: 'Conclusion sur les Sorbonnes', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'vitesse_min_avis_norme', commentaire: 'commentaire' },
  hottes: { titre: 'Conclusion sur les hottes et dosserets aspirants', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'conclusion', commentaire: 'observation' },
  bras_aspiration: { titre: 'Conclusion sur les Bras Orientables Articulés', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence équipement', avis: 'conclusion', commentaire: 'commentaire_1' },
  cabines_peinture: { titre: 'Conclusion sur les cabines de peinture', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence de l\u2019équipement', col3: 'type_cabine', col3Label: 'Type de cabine', avis: 'conclusion', commentaire: 'observations' },
  installations_diverses: { titre: 'Conclusion sur les équipements divers', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'avis', commentaire: 'observation' },
  gaz_echappement: { titre: 'Conclusion sur les captages de gaz d\u2019échappement', col1: 'batiment', col1Label: 'Bâtiment', col2: 'atelier', col2Label: 'Atelier', col3: 'reference_equipement', col3Label: 'Réf. équipement et/ou implantation', avis: 'avis_constructeur', commentaire: 'observation' },
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

  function fetchAsset(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error('asset introuvable: ' + path);
      return r.arrayBuffer();
    }).catch(function () {
      return null; // asset manquant : le rapport se génère quand même, sans cette image
    });
  }

  var sectionImagePaths = []; // à plat : [g0img0, g0img1, g1img0, ...]
  var sectionImageCounts = SECTION_GROUPS.map(function (g) { return g.images.length; });
  SECTION_GROUPS.forEach(function (g) { sectionImagePaths = sectionImagePaths.concat(g.images); });
  Promise.all([fetchAsset(LOGO_PATH), fetchAsset(BANNER_PATH)].concat(sectionImagePaths.map(fetchAsset))).then(function (bufs) {
    var logoBuf = bufs[0], bannerBuf = bufs[1];
    var dividerBufs = {};
    var cursor = 2;
    SECTION_GROUPS.forEach(function (g, i) {
      dividerBufs[g.key] = bufs.slice(cursor, cursor + sectionImageCounts[i]);
      cursor += sectionImageCounts[i];
    });
    try {
      var doc = buildRapportDoc(m, logoBuf, bannerBuf, dividerBufs);
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

function buildRapportDoc(m, logoBuf, bannerBuf, dividerBufs) {
  dividerBufs = dividerBufs || {};
  var D = docx;
  var di = m.donneesInternes || {};
  var ic = m.infosClient || {};
  var is = m.intervenantSite || {};
  var isi = m.infosSiteIntervention || {};

  var portrait = [];

  portrait = portrait.concat(buildPageDeGarde(D, m, di, ic, is, isi, logoBuf, bannerBuf));
  portrait.push(new D.Paragraph({ children: [new D.PageBreak()] }));

  portrait = portrait.concat(buildSommaire(D));
  portrait.push(new D.Paragraph({ children: [new D.PageBreak()] }));

  portrait = portrait.concat(buildPresentationMission(D, m, di, ic, isi));
  portrait = portrait.concat(buildDescriptionLocaux(D, m));
  portrait = portrait.concat(buildDocumentsTransmis(D, m));
  portrait = portrait.concat(buildSyntheseControle(D, m));

  var annexes = [];
  annexes.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 120 },
    children: [new D.TextRun({ text: '5. ANNEXES', bold: true, color: BLUE })]
  }));

  // Tous les 18 types ont désormais une annexe fidèle (tableau croisé ou fiche détaillée par
  // installation). buildAnnexeProvisoire reste en filet de sécurité pour un futur type sans builder.
  var ANNEXES_FIDELES = { bureaux: buildAnnexeBureaux, sanitaires: buildAnnexeSanitaires, locaux_fumeurs: buildAnnexeLocauxFumeurs, cta: buildAnnexeCTA, extracteur: buildAnnexeExtracteur, hottes: buildAnnexeHottes, bras_aspiration: buildAnnexeBrasAspiration, installations_diverses: buildAnnexeInstallationsDiverses, gaz_echappement: buildAnnexeGazEchappement, menuiserie: buildAnnexeMenuiserie, locaux_charge: buildAnnexeLocauxCharge, sorbonnes: buildAnnexeSorbonnes, cabines_peinture: buildAnnexeCabinesPeinture, box_peinture: buildAnnexeBoxPeinture, erp: buildAnnexeERP, menuiserie_bis: buildAnnexeMenuiserieMAB, torches_aspirantes: buildAnnexeTorchesAspirantes, tts: buildAnnexeTTS };

  var seenSectionGroups = {};
  INSTALLATION_TYPES.forEach(function (t) {
    var list = (m.installations && m.installations[t.id]) || [];
    if (list.length === 0) return;

    var group = sectionGroupForType(t.id);
    if (group && !seenSectionGroups[group.key]) {
      seenSectionGroups[group.key] = true;
      annexes.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      annexes = annexes.concat(sectionDividerPage(D, group.titre, dividerBufs[group.key], group.images));
    }

    if (ANNEXES_FIDELES[t.id]) {
      annexes.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      annexes = annexes.concat(ANNEXES_FIDELES[t.id](D, list, logoBuf));
    } else {
      annexes.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      annexes = annexes.concat(buildAnnexeProvisoire(D, t, list));
    }
  });

  var footerDefault = new D.Footer({ children: [buildFooterParagraph(D, di)] });
  var footerFirst = new D.Footer({
    children: [new D.Paragraph({
      tabStops: [{ type: D.TabStopType.RIGHT, position: 9638 }],
      children: [
        new D.TextRun({ text: 'SOCOTEC ENVIRONNEMENT', font: 'Calibri', size: 22 }),
        new D.TextRun({ text: '\t', font: 'Calibri', size: 22 }),
        new D.TextRun({ text: 'Nombre de pages : ', font: 'Calibri', size: 22 }),
        new D.TextRun({ children: [D.PageNumber.TOTAL_PAGES], font: 'Calibri', size: 22 }),
        new D.TextRun({ text: ' pages (annexes comprises)', font: 'Calibri', size: 22 })
      ]
    })]
  });

  return new D.Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 20 } },
        heading1: { run: { font: 'Arial', bold: true, size: 28, color: BLUE } },
        heading2: { run: { font: 'Arial', bold: true, size: 22, color: ACCENT } }
      },
      paragraphStyles: [
        { id: 'TOC1', name: 'TOC 1', basedOn: 'Normal', next: 'Normal',
          run: { font: 'Arial', bold: true, size: 22, color: BLUE } },
        { id: 'TOC2', name: 'TOC 2', basedOn: 'Normal', next: 'Normal',
          run: { font: 'Arial', size: 20, color: BLUE } },
        { id: 'TOC3', name: 'TOC 3', basedOn: 'Normal', next: 'Normal',
          run: { font: 'Arial', size: 18, color: BLUE } }
      ]
    },
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
          page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } }
        },
        footers: { default: footerDefault },
        children: annexes
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
      new D.TextRun({ text: 'N\u00b0 d\u2019Affaire : ' + (di.numeroAffaire || '\u2014'), font: 'Calibri', size: 22 }),
      new D.TextRun({ text: '\t', font: 'Calibri', size: 22 }),
      new D.TextRun({ text: 'N\u00b0 Chrono : ' + (di.numeroChrono || '\u2014'), font: 'Calibri', size: 22 }),
      new D.TextRun({ text: '\t', font: 'Calibri', size: 22 }),
      new D.TextRun({ children: [D.PageNumber.CURRENT], font: 'Calibri', size: 22 }),
      new D.TextRun({ text: '/', font: 'Calibri', size: 22 }),
      new D.TextRun({ children: [D.PageNumber.TOTAL_PAGES], font: 'Calibri', size: 22 })
    ]
  });
}

// ————————————————————————————————————————————
// Page de garde (F_Page_De_Garde / PDG_1..17)
// ————————————————————————————————————————————

function buildPageDeGarde(D, m, di, ic, is, isi, logoBuf, bannerBuf) {
  var children = [];

  // Bandeau "Rapport d'intervention" (image d'origine extraite du gabarit SOCOTEC) + logo à droite
  if (bannerBuf || logoBuf) {
    children.push(new D.Table({
      width: { size: 9636, type: D.WidthType.DXA },
      borders: NO_BORDERS(D),
      columnWidths: [7200, 2436],
      rows: [new D.TableRow({ children: [
        new D.TableCell({
          width: { size: 7200, type: D.WidthType.DXA }, borders: NO_BORDERS(D),
          children: [bannerBuf ? new D.Paragraph({ children: [new D.ImageRun({ data: bannerBuf, type: 'jpg', transformation: { width: 320, height: 42 } })] }) : new D.Paragraph({ text: '' })]
        }),
        new D.TableCell({
          width: { size: 2436, type: D.WidthType.DXA }, borders: NO_BORDERS(D),
          verticalAlign: D.VerticalAlign.CENTER,
          children: [logoBuf ? new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.ImageRun({ data: logoBuf, type: 'jpg', transformation: { width: 84, height: 80 } })] }) : new D.Paragraph({ text: '' })]
        })
      ] })]
    }));
    children.push(new D.Paragraph({ text: '', spacing: { after: 300 } }));
  }

  // Bloc client (haut de page, aligné comme dans l'original)
  children.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: ic.nomEntreprise || '—', bold: true, size: 22 })] }));
  children.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: 'A l’attention de ' + (ic.nomDemandeur || '—'), size: 20 })] }));
  children.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: ic.adresse || '', size: 20 })] }));
  children.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, spacing: { after: 480 }, children: [new D.TextRun({ text: (ic.codePostal || '') + ' ' + (ic.ville || ''), size: 20 })] }));

  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER,
    spacing: { before: 480, after: 480 },
    children: [new D.TextRun({ text: 'CONTRÔLE DE L’AERATION ET DE L’ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, size: 27 })]
  }));

  var nomAuteur = di.auteurRapport || is.intervenant || '—';
  children.push(threeColBlock(D, ['Intervention sur site réalisée par', 'Rédigé par', 'Validé par'], [nomAuteur, nomAuteur, nomAuteur]));
  children.push(new D.Paragraph({ text: '', spacing: { after: 240 } }));
  children.push(threeColBlock(D, ['Date d’édition du rapport', 'Référence du rapport (chrono)', 'Nature de la révision'],
    [di.dateRapport || '—', di.numeroChrono || '—', di.natureRevision || 'Version initiale']));

  children.push(new D.Paragraph({ spacing: { before: 480 } }));
  children.push(new D.Paragraph({
    shading: { fill: ACCENT, type: D.ShadingType.CLEAR }, spacing: { after: 0 },
    children: [new D.TextRun({ text: '  N° d’Affaire : ' + (di.numeroAffaire || '—'), bold: true, size: 20, color: 'FFFFFF' })]
  }));
  children.push(new D.Paragraph({
    shading: { fill: ACCENT, type: D.ShadingType.CLEAR }, spacing: { after: 0 },
    children: [new D.TextRun({ text: '  Mission réalisée ' + (di.datesIntervention ? ('le/du ' + di.datesIntervention) : '—'), bold: true, size: 20, color: 'FFFFFF' })]
  }));
  children.push(new D.Paragraph({ shading: { fill: ACCENT, type: D.ShadingType.CLEAR }, spacing: { after: 0 }, children: [new D.TextRun({ text: ' ', size: 12 })] }));
  children.push(new D.Paragraph({
    shading: { fill: ACCENT, type: D.ShadingType.CLEAR }, spacing: { after: 0 },
    children: [new D.TextRun({ text: '  La reproduction de ce document n’est autorisée que sous sa forme intégrale.', italics: true, size: 18, color: 'FFFFFF' })]
  }));
  children.push(new D.Paragraph({ text: '', spacing: { after: 300 } }));

  children.push(new D.Table({
    width: { size: 9636, type: D.WidthType.DXA },
    borders: NO_BORDERS(D),
    columnWidths: [6636, 3000],
    rows: [new D.TableRow({ children: [
      new D.TableCell({
        width: { size: 6636, type: D.WidthType.DXA }, borders: NO_BORDERS(D),
        children: [
          new D.Paragraph({ children: [new D.TextRun({ text: 'SOCOTEC ENVIRONNEMENT', bold: true, size: 20 })] }),
          new D.Paragraph({ children: [new D.TextRun({ text: is.agenceAuteur || '—', size: 18 })] }),
          new D.Paragraph({ children: [new D.TextRun({ text: is.adresseAgence || '', size: 18 })] }),
          new D.Paragraph({ children: [new D.TextRun({ text: (is.codePostal || '') + ' ' + (is.ville || ''), size: 18 })] })
        ]
      }),
      new D.TableCell({
        width: { size: 3000, type: D.WidthType.DXA },
        borders: CELL_BORDERS(D),
        verticalAlign: D.VerticalAlign.CENTER,
        children: [
          new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: 'Nombre de pages : ', size: 16 }), new D.TextRun({ children: [D.PageNumber.TOTAL_PAGES], size: 16 }), new D.TextRun({ text: ' pages', size: 16 })] }),
          new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: '(annexes comprises)', size: 16 })] })
        ]
      })
    ] })]
  }));

  children.push(new D.Paragraph({
    spacing: { before: 300 },
    children: [new D.TextRun({ text: 'SOCOTEC ENVIRONNEMENT - S.A.S au capital de 436 960 euros - 834 096 497 RCS Versailles', size: 14, color: '444444' })]
  }));
  children.push(new D.Paragraph({
    children: [new D.TextRun({ text: 'Siège social : 5, place des Frères Montgolfier - CS 20732 - Guyancourt - 78182 St-Quentin-en-Yvelines Cedex - FRANCE ', size: 14, color: '444444' }),
      new D.TextRun({ text: 'www.socotec.fr', size: 14, bold: true, color: ACCENT })]
  }));

  return children;
}

function threeColBlock(D, labels, values) {
  var W = 3212;
  function headCell(text) {
    return new D.TableCell({
      width: { size: W, type: D.WidthType.DXA },
      shading: { fill: ACCENT, type: D.ShadingType.CLEAR },
      borders: CELL_BORDERS(D),
      verticalAlign: D.VerticalAlign.CENTER,
      children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: text, bold: true, size: 18, color: 'FFFFFF' })] })]
    });
  }
  function valCell(text) {
    return new D.TableCell({
      width: { size: W, type: D.WidthType.DXA },
      shading: { fill: 'FFFFFF', type: D.ShadingType.CLEAR },
      borders: CELL_BORDERS(D),
      verticalAlign: D.VerticalAlign.CENTER,
      children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: text, size: 20 })] })]
    });
  }
  return new D.Table({
    width: { size: 9636, type: D.WidthType.DXA },
    columnWidths: [W, W, W],
    rows: [
      new D.TableRow({ children: [headCell(labels[0]), headCell(labels[1]), headCell(labels[2])] }),
      new D.TableRow({ children: [valCell(values[0]), valCell(values[1]), valCell(values[2])] })
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
    children: [new D.TextRun({ text: '2.1 DESCRIPTION DES LOCAUX CONTR\u00d4L\u00c9S', bold: true, color: ACCENT, size: 22 })]
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
    children: [new D.TextRun({ text: '3.1 LISTE DES DOCUMENTS TRANSMIS A SOCOTEC', bold: true, color: ACCENT, size: 22 })]
  }));

  children.push(docsTable(D, dt.documents));

  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new D.TextRun({ text: '3.2 NOTICE D\u2019INSTRUCTION ET CONSIGNES D\u2019UTILISATION', bold: true, color: ACCENT, size: 22 })]
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
    borders: CELL_BORDERS(D),
    verticalAlign: D.VerticalAlign.CENTER,
    children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: text, bold: true, size: 18, color: 'FFFFFF' })] })]
  });
}

function titleBarCell(D, text, width, colSpan) {
  return new D.TableCell({
    width: { size: width, type: D.WidthType.DXA },
    columnSpan: colSpan || 1,
    shading: { fill: NAVY, type: D.ShadingType.CLEAR },
    borders: CELL_BORDERS(D),
    verticalAlign: D.VerticalAlign.CENTER,
    children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: text, bold: true, size: 20, color: 'FFFFFF' })] })]
  });
}

function bodyCell(D, text, width, opts) {
  opts = opts || {};
  return new D.TableCell({
    width: { size: width, type: D.WidthType.DXA },
    columnSpan: opts.colSpan || 1,
    shading: { fill: opts.fill || 'FFFFFF', type: D.ShadingType.CLEAR },
    borders: CELL_BORDERS(D),
    verticalAlign: D.VerticalAlign.CENTER,
    children: [new D.Paragraph({ alignment: opts.center ? D.AlignmentType.CENTER : D.AlignmentType.LEFT, children: [new D.TextRun({ text: text, size: 18, bold: !!opts.bold, color: opts.color || '000000' })] })]
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

  children.push(new D.Paragraph({ spacing: { after: 60 }, children: [new D.TextRun({ text: 'Locaux à pollution non spécifique :', bold: true, size: 20 })] }));
  children.push(new D.Paragraph({ spacing: { after: 200 }, children: [new D.TextRun({
    text: 'En présence du Dossier de Valeurs de Références, SOCOTEC compare les valeurs mesurées à celles-ci. En l’absence de ce Dossier, SOCOTEC évalue les conditions minimales de renouvellement d’air prescrites par l’article R.4222-6 du Code du Travail et par le règlement sanitaire départemental type sur la base des effectifs constatés ou estimés in situ pour chaque local, au moment du contrôle, et les compare aux valeurs mesurées.',
    size: 20
  })] }));
  children.push(new D.Paragraph({ spacing: { after: 60 }, children: [new D.TextRun({ text: 'Locaux à pollution spécifique :', bold: true, size: 20 })] }));
  children.push(new D.Paragraph({ spacing: { after: 240 }, children: [new D.TextRun({
    text: 'En présence du Dossier de Valeurs de Références, SOCOTEC compare les valeurs mesurées à celles-ci. En l’absence de celui-ci, SOCOTEC compare les valeurs mesurées à celles prescrites par l’article R.4212-6 du Code du Travail pour ce qui concerne les sanitaires et à celles prescrites par les normes ou les guides de l’INRS pour l’ensemble des locaux ou installations à pollution spécifique.',
    size: 20
  })] }));

  children.push(new D.Paragraph({
    heading: D.HeadingLevel.HEADING_2,
    spacing: { before: 120, after: 160 },
    children: [new D.TextRun({ text: '4.1 SYNTHESE DU CONTRÔLE', bold: true, color: ACCENT, size: 22 })]
  }));

  var hasContent = false;

  INSTALLATION_TYPES.forEach(function (t) {
    var list = (m.installations && m.installations[t.id]) || [];
    var cfg = SYNTHESE_CONFIG[t.id];
    if (list.length === 0 || !cfg) return;
    hasContent = true;

    children.push(syntheseTable(D, cfg, list));
    children.push(new D.Paragraph({ text: '', spacing: { after: 200 } }));
  });

  if (!hasContent) {
    children.push(new D.Paragraph({
      children: [new D.TextRun({ text: 'Aucune installation renseignée.', italics: true, size: 20 })]
    }));
  }

  return children;
}

function avisColor(text) {
  if (text === 'Satisfaisant' || text === 'Conforme') return { fill: AVIS_GREEN };
  if (text === 'Non Satisfaisant' || text === 'Non Conforme') return { fill: AVIS_AMBER };
  // "Impossible de se prononcer", "Sans Objet", etc. : pas de couleur, comme dans le PDF de référence
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
  rows.push(new D.TableRow({ children: [titleBarCell(D, cfg.titre, W_TOTAL, headers.length)] }));
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
        return bodyCell(D, text, w, { center: true, bold: true, fill: c ? c.fill : undefined });
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

// Page de garde de section (une par groupe de 5.1 à 5.9), en portrait : une ou deux photos empilées
// à gauche, bandeau cyan étroit pleine hauteur à droite (texte pivoté bas-haut) — fidèle à la page
// intercalaire du PDF de référence (bandeau sur toute la hauteur de page, pas juste la hauteur photo).
function sectionDividerPage(D, titre, imgBufs, imagePaths) {
  var W_BAR = 1700, W_PHOTO = ANNEXE_CONTENT_WIDTH - W_BAR;
  imgBufs = imgBufs || [];
  imagePaths = imagePaths || [];
  var photoChildren = [];
  imgBufs.forEach(function (buf, i) {
    if (!buf) return;
    photoChildren.push(new D.Paragraph({
      alignment: D.AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new D.ImageRun({ data: buf, type: imageTypeFromPath(imagePaths[i] || ''), transformation: { width: 260, height: 200 } })]
    }));
  });
  if (photoChildren.length === 0) photoChildren.push(new D.Paragraph({ text: '' }));

  var photoCell = new D.TableCell({
    width: { size: W_PHOTO, type: D.WidthType.DXA },
    borders: NO_BORDERS(D),
    verticalAlign: D.VerticalAlign.CENTER,
    children: photoChildren
  });
  var barCell = new D.TableCell({
    width: { size: W_BAR, type: D.WidthType.DXA },
    shading: { fill: ACCENT, type: D.ShadingType.CLEAR },
    verticalAlign: D.VerticalAlign.CENTER,
    textDirection: D.TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
    margins: { top: 400, bottom: 400, left: 200, right: 200 },
    children: [
      new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, size: 28, color: 'FFFFFF' })] }),
      new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 200 }, children: [new D.TextRun({ text: titre, bold: true, size: 26, color: 'FFFFFF' })] })
    ]
  });
  return [
    new D.Table({
      width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA },
      borders: NO_BORDERS(D),
      rows: [new D.TableRow({ height: { value: 13500, rule: D.HeightRule.ATLEAST }, children: [photoCell, barCell] })]
    })
  ];
}

// Bandeau d'en-tête de page d'annexe : logo à gauche + bandeau cyan (titre + sous-titre) à droite,
// fidèle à l'en-tête répété sur chaque page de tableau croisé du PDF de référence.
function annexePageHeader(D, titre, sousTitre, logoBuf) {
  var W_LOGO = 1100, W_BAR = ANNEXE_CONTENT_WIDTH - W_LOGO;
  var logoCell = new D.TableCell({
    width: { size: W_LOGO, type: D.WidthType.DXA },
    borders: NO_BORDERS(D),
    verticalAlign: D.VerticalAlign.CENTER,
    children: [logoBuf
      ? new D.Paragraph({ children: [new D.ImageRun({ data: logoBuf, type: 'jpg', transformation: { width: 70, height: 67 } })] })
      : new D.Paragraph({ text: '' })]
  });
  var barCell = new D.TableCell({
    width: { size: W_BAR, type: D.WidthType.DXA },
    shading: { fill: ACCENT, type: D.ShadingType.CLEAR },
    verticalAlign: D.VerticalAlign.CENTER,
    children: [
      new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: 'AERATION ET ASSAINISSEMENT DES LOCAUX DE TRAVAIL', bold: true, size: 24, color: 'FFFFFF' })] }),
      new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: sousTitre, bold: true, size: 22, color: 'FFFFFF' })] })
    ]
  });
  return new D.Table({
    width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA },
    borders: NO_BORDERS(D),
    rows: [new D.TableRow({ children: [logoCell, barCell] })]
  });
}

function crosstabSection(D, titre, sousTitre, legalParagraphs, rows, list, logoBuf) {
  var children = [];

  // Page "Extraits du Code du Travail" : pas de bandeau d'en-tête, fidèle au PDF de référence.
  if (legalParagraphs && legalParagraphs.length) {
    children.push(new D.Paragraph({
      spacing: { after: 160 },
      children: [new D.TextRun({ text: 'Extraits du Code du Travail', bold: true, size: 22 })]
    }));
    children = children.concat(legalParagraphs);
    children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
  }

  children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
  children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

  if (!list || list.length === 0) {
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun local renseigné.', italics: true, size: 20 })] }));
    return children;
  }

  for (var g = 0; g < list.length; g += CROSSTAB_GROUP_SIZE) {
    var group = list.slice(g, g + CROSSTAB_GROUP_SIZE);
    if (g > 0) {
      children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
      children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    }
    children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: crosstabRows(D, rows, group) }));
  }

  return children;
}

function crosstabRows(D, rows, group) {
  var W_LABEL = 2400;
  var W_COL = Math.floor((ANNEXE_CONTENT_WIDTH - W_LABEL) / group.length);
  var out = [];
  var inIdentityBlock = true; // les 1res lignes (avant le 1er sous-titre) sont les champs d'identification -> gris

  rows.forEach(function (r) {
    if (r.subheader) {
      inIdentityBlock = false;
      out.push(new D.TableRow({ children: [
        new D.TableCell({
          width: { size: W_LABEL, type: D.WidthType.DXA },
          shading: { fill: NAVY, type: D.ShadingType.CLEAR },
          borders: CELL_BORDERS(D),
          children: [new D.Paragraph({ children: [new D.TextRun({ text: '', size: 22 })] })]
        }),
        new D.TableCell({
          columnSpan: group.length,
          width: { size: W_COL * group.length, type: D.WidthType.DXA },
          shading: { fill: NAVY, type: D.ShadingType.CLEAR },
          borders: CELL_BORDERS(D),
          verticalAlign: D.VerticalAlign.CENTER,
          children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: r.subheader, bold: true, size: 22, color: 'FFFFFF' })] })]
        })
      ] }));
      return;
    }
    var labelFill = inIdentityBlock ? GRAY_IDENTITY : TABLE_HEADER_BLUE;
    out.push(new D.TableRow({ children: [
      new D.TableCell({
        width: { size: W_LABEL, type: D.WidthType.DXA },
        shading: { fill: labelFill, type: D.ShadingType.CLEAR },
        borders: CELL_BORDERS(D),
        verticalAlign: D.VerticalAlign.CENTER,
        children: [new D.Paragraph({ children: [new D.TextRun({ text: r.label, bold: true, size: 20, color: 'FFFFFF' })] })]
      })
    ].concat(group.map(function (inst) {
      var val = formatCrosstabValue(inst.data[r.key]);
      var opts = { center: true };
      if (r.isAvis) { var c = avisColor(val); if (c) { opts.fill = c.fill; opts.bold = true; } }
      return bodyCellSmall(D, val, W_COL, opts);
    })) }));
  });

  return out;
}

// Les champs de type grille/liste (points de mesure bruts) ne s'affichent pas tels quels dans le
// tableau croisé (comme dans le PDF d'origine, où seules les valeurs calculées apparaissent) —
// seules les valeurs simples (texte, nombre, sélection, case à cocher) sont affichées.
function formatCrosstabValue(val) {
  if (val === undefined || val === null || val === '') return '-';
  if (Array.isArray(val)) {
    if (val.length === 0) return '-';
    // grille (tableau de tableaux) : pas de représentation utile en colonne -> masquée
    if (Array.isArray(val[0])) return '-';
    return val.join(', ');
  }
  return String(val);
}

function bodyCellSmall(D, text, width, opts) {
  opts = opts || {};
  return new D.TableCell({
    width: { size: width, type: D.WidthType.DXA },
    shading: { fill: opts.fill || 'FFFFFF', type: D.ShadingType.CLEAR },
    borders: CELL_BORDERS(D),
    verticalAlign: D.VerticalAlign.CENTER,
    children: [new D.Paragraph({ alignment: opts.center ? D.AlignmentType.CENTER : D.AlignmentType.LEFT, children: [new D.TextRun({ text: text, size: 18, bold: !!opts.bold, color: opts.color || '000000' })] })]
  });
}

// ————————————————————————————————————————————
// "Fiche équipement" (une page par installation, avec photo) : Extracteur, Hottes, Bras articulé,
// Sorbonnes, Locaux de charge et Installations diverses utilisent chacun une fiche dédiée dans le
// PDF de référence (au lieu du tableau croisé) — boîte à outils commune pour ces mises en page.
// ————————————————————————————————————————————

function dataUrlToBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  var comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  try {
    var bin = atob(dataUrl.slice(comma + 1));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch (e) { return null; }
}
function photoImageType(dataUrl) {
  if (/^data:image\/png/i.test(dataUrl)) return 'png';
  if (/^data:image\/gif/i.test(dataUrl)) return 'gif';
  if (/^data:image\/bmp/i.test(dataUrl)) return 'bmp';
  return 'jpg';
}

// Bandeau de titre pleine largeur (bleu moyen), utilisé pour "Photo de l'équipement", "Mesures de...",
// "Conclusion", "Observations" — fidèle aux bandeaux de section des fiches du PDF de référence.
function ficheBar(D, text, width) {
  return new D.Table({
    width: { size: width || ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA },
    rows: [new D.TableRow({ children: [headerCell(D, text, width || ANNEXE_CONTENT_WIDTH)] })]
  });
}

// Bloc d'identification : liste de paires [label, valeur] empilées, label en cyan/blanc, valeur en blanc.
function ficheIdentRows(D, pairs, labelWidth, valueWidth) {
  return pairs.map(function (p) {
    return new D.TableRow({ children: [headerCell(D, p[0], labelWidth), bodyCell(D, p[1] || '-', valueWidth)] });
  });
}

// Boîte photo : bandeau "Photo de l'équipement" + image si présente, sinon case vide bordée.
function fichePhotoBox(D, dataUrl, width) {
  var rows = [new D.TableRow({ children: [headerCell(D, 'Photo de l’équipement', width)] })];
  var bytes = dataUrlToBytes(dataUrl);
  var photoParagraph = bytes
    ? new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.ImageRun({ data: bytes, type: photoImageType(dataUrl), transformation: { width: 260, height: 195 } })] })
    : new D.Paragraph({ text: '', spacing: { after: 2000 } });
  rows.push(new D.TableRow({ children: [new D.TableCell({
    width: { size: width, type: D.WidthType.DXA },
    borders: CELL_BORDERS(D),
    children: [photoParagraph]
  })] }));
  return new D.Table({ width: { size: width, type: D.WidthType.DXA }, rows: rows });
}

// Deux blocs côte à côte (ex : identification à gauche, photo à droite) dans une table sans bordure.
function ficheTwoCol(D, leftTable, rightTable, leftWidth, rightWidth) {
  return new D.Table({
    width: { size: leftWidth + rightWidth, type: D.WidthType.DXA },
    borders: NO_BORDERS(D),
    columnWidths: [leftWidth, rightWidth],
    rows: [new D.TableRow({ children: [
      new D.TableCell({ width: { size: leftWidth, type: D.WidthType.DXA }, borders: NO_BORDERS(D), children: [leftTable] }),
      new D.TableCell({ width: { size: rightWidth, type: D.WidthType.DXA }, borders: NO_BORDERS(D), children: [rightTable] })
    ] })]
  });
}

// Bandeau "Conclusion" ou "Observations" : bandeau de titre + une ligne label/valeur ou un paragraphe libre.
function ficheConclusionRow(D, label, value) {
  var avis = avisColor(value);
  return new D.Table({
    width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA },
    rows: [new D.TableRow({ children: [
      bodyCell(D, label, ANNEXE_CONTENT_WIDTH - 2400),
      bodyCell(D, value || '-', 2400, { center: true, bold: true, fill: avis ? avis.fill : undefined })
    ] })]
  });
}
function ficheObservationBox(D, text) {
  return new D.Table({
    width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA },
    rows: [new D.TableRow({ children: [bodyCell(D, text || '-', ANNEXE_CONTENT_WIDTH)] })]
  });
}

function legalParagraph(text, opts) {
  opts = opts || {};
  return new docx.Paragraph({
    shading: { fill: LEGAL_GRAY, type: docx.ShadingType.CLEAR },
    alignment: opts.center ? docx.AlignmentType.CENTER : docx.AlignmentType.JUSTIFIED,
    spacing: { after: opts.after !== undefined ? opts.after : 0, line: 280 },
    children: [new docx.TextRun({ text: text, bold: !!opts.bold, italics: !!opts.italics, size: opts.size || 19, underline: opts.underline ? {} : undefined })]
  });
}

// Constructeur générique de "fiche équipement" (une page par installation, avec photo si le schéma en
// a une) — schéma-piloté comme buildAnnexeGeneric, mais en mise en page fiche (une colonne, empilée)
// au lieu de tableau croisé. Fidèle à l'esprit du PDF de référence (bandeaux de section, identification
// + photo en haut) même si la mise en page exacte des tableaux de mesure bespoke de chaque type n'est
// pas reproduite au pixel près — utilisé pour les types dont la fiche exacte n'a pas été vérifiée page
// par page contre le PDF de référence.
function buildAnnexeFicheGenerique(D, typeId, titre, sousTitre, legal, list, logoBuf) {
  var t = getInstallationType(typeId);
  var children = [];
  if (legal && legal.length) {
    children = children.concat(legal);
    children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
  }

  if (!list || list.length === 0) {
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun local renseigné.', italics: true, size: 20 })] }));
    return children;
  }

  var photoField = t.fields.filter(function (f) { return f.type === 'photo'; })[0];
  var W_LABEL = 3200;

  list.forEach(function (inst, idx) {
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    var identPairs = [];
    var i = 0;
    while (i < t.fields.length && t.fields[i].type !== 'section') {
      var idf = t.fields[i];
      if (idf.type !== 'photo' && (!idf.showIf || evalShowIf(idf.showIf, inst.data))) {
        identPairs.push([idf.label, formatCrosstabValue(inst.data[idf.key])]);
      }
      i++;
    }
    var W_IDENT = photoField ? 5200 : ANNEXE_CONTENT_WIDTH;
    var identTable = new D.Table({ width: { size: W_IDENT, type: D.WidthType.DXA }, rows: ficheIdentRows(D, identPairs, W_LABEL, W_IDENT - W_LABEL) });
    if (photoField) {
      var W_PHOTO = ANNEXE_CONTENT_WIDTH - W_IDENT;
      children.push(ficheTwoCol(D, identTable, fichePhotoBox(D, inst.data[photoField.key], W_PHOTO), W_IDENT, W_PHOTO));
    } else {
      children.push(identTable);
    }

    var rows = [];
    for (; i < t.fields.length; i++) {
      var f = t.fields[i];
      if (f.showIf && !evalShowIf(f.showIf, inst.data)) continue;
      if (f.type === 'photo' || f.type === 'grid' || f.type === 'charger-list') continue;
      if (f.type === 'section') {
        if (rows.length) { children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: rows })); rows = []; }
        children.push(new D.Paragraph({ text: '', spacing: { after: 100 } }));
        children.push(ficheBar(D, f.label));
        continue;
      }
      var val = formatCrosstabValue(inst.data[f.key]);
      var opts = {};
      if (f.type === 'computed') { var c = avisColor(val); if (c) opts = { center: true, bold: true, fill: c.fill }; }
      rows.push(new D.TableRow({ children: [headerCell(D, f.label, W_LABEL), bodyCell(D, val, ANNEXE_CONTENT_WIDTH - W_LABEL, opts)] }));
    }
    if (rows.length) children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: rows }));
  });

  return children;
}

// 5.1 — Bureaux / Salles de réunion (Inserer_Annexe_1, Articles R.4222-5 et R.4222-6)
function buildAnnexeBureaux(D, list, logoBuf) {
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

  return crosstabSection(D, 'Bureaux', 'Locaux à pollution non spécifique', legal, rows, list, logoBuf);
}

// 5.2 — Sanitaires (Inserer_Annexe_2, Article R.4212-6)
function buildAnnexeSanitaires(D, list, logoBuf) {
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

  return crosstabSection(D, 'Sanitaires', 'Sanitaires', legal, rows, list, logoBuf);
}

// 5.3 — Centrales de traitement de l'air (Inserer_Annexe_4)
// Contrairement à Bureaux/Sanitaires, ce type n'utilise pas le format "tableau croisé" (colonnes = locaux) :
// chaque CTA occupe son propre bloc complet (ModeleConclusion=2 dans le VBA d'origine). Pas d'extrait du
// Code du Travail : l'avis CTA est une appréciation manuelle du technicien (pas de seuil réglementaire
// unique), faute de valeur de référence constructeur systématique.
// Une ligne du tableau "Mesures de vitesse" CTA (r\u00e9seaux neuf / souffl\u00e9 / repris \u2014 m\u00eames 9 colonnes
// que le tableau Extracteur), fid\u00e8le au PDF de r\u00e9f\u00e9rence.
function ficheCtaReseauRow(D, label, d, prefix, cols) {
  var vals = [label, formatCrosstabValue(d[prefix + '_forme']), formatCrosstabValue(d[prefix + '_diametre_cote1']),
    formatCrosstabValue(d[prefix + '_cote2']), formatCrosstabValue(d[prefix + '_surface']), formatCrosstabValue(d[prefix + '_vitesse']),
    formatCrosstabValue(d[prefix + '_reference']), formatCrosstabValue(d[prefix + '_debit_n1']), formatCrosstabValue(d[prefix + '_debit'])];
  return new D.TableRow({ children: cols.map(function (c, i) { return bodyCell(D, vals[i], c[1], { center: true }); }) });
}

function buildAnnexeCTA(D, list, logoBuf) {
  var titre = 'CTA', sousTitre = 'Centrales de traitement de l\u2019air';
  var children = [];
  if (!list || list.length === 0) {
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun local renseign\u00e9.', italics: true, size: 20 })] }));
    return children;
  }
  var W_LABEL = 3200;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: ficheIdentRows(D, [
      ['B\u00e2timent', formatCrosstabValue(d.batiment)],
      ['Marque', formatCrosstabValue(d.marque)],
      ['Localisation', formatCrosstabValue(d.localisation)],
      ['Locaux aliment\u00e9s', formatCrosstabValue(d.locaux_alimentes)],
      ['Date du contr\u00f4le', formatCrosstabValue(d.date_controle)],
      ['R\u00e9f. de l\u2019\u00e9quipement et/ou Implantation', formatCrosstabValue(d.reference_equipement)],
      ['Mode de fonctionnement', formatCrosstabValue(d.mode_fonctionnement)]
    ], W_LABEL, ANNEXE_CONTENT_WIDTH - W_LABEL) }));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    children.push(ficheBar(D, '\u00c9tat du reste de l\u2019installation'));
    var etatPairs = [
      ['\u00c9tat g\u00e9n\u00e9ral (propret\u00e9, corrosion, chocs, etc.)', formatCrosstabValue(d.etat_general)],
      ['Prise d\u2019air neuf', formatCrosstabValue(d.prise_air_neuf)],
      ['Batterie(s) froide(s)', formatCrosstabValue(d.batterie_froide)],
      ['Batterie(s) chaude(s)', formatCrosstabValue(d.batterie_chaude)],
      ['Canalisations / Gaines', formatCrosstabValue(d.canalisations_gaines)],
      ['Ventilateur / Courroie', formatCrosstabValue(d.ventilateur_courroie)],
      ['Fiche de Maintenance', formatCrosstabValue(d.fiche_maintenance)]
    ];
    if (d.fiche_maintenance === 'Derni\u00e8re intervention de maintenance') {
      etatPairs.push(['Date de la derni\u00e8re intervention de maintenance', formatCrosstabValue(d.date_derniere_maintenance)]);
    }
    children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: ficheIdentRows(D, etatPairs, W_LABEL, ANNEXE_CONTENT_WIDTH - W_LABEL) }));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    if (d.afficher_filtration === 'Oui') {
      var FW = [2400, 2412, 2412, 2412];
      function filtreCol(prefix) {
        return [formatCrosstabValue(d[prefix + '_etat']), formatCrosstabValue(d[prefix + '_type']), formatCrosstabValue(d[prefix + '_nombre_dimensions']), formatCrosstabValue(d[prefix + '_classe']), d[prefix + '_perte_charge'] !== undefined ? formatCrosstabValue(d[prefix + '_perte_charge']) : '-'];
      }
      var pre = filtreCol('filt_pre'), filtre = filtreCol('filt_filtre'), absolu = filtreCol('filt_absolu');
      var filtreLabels = ['\u00c9tat', 'Type (cellules, poches, ...)', 'Nombre / Dimensions', 'Classe d\u2019efficacit\u00e9', 'Perte de charge (Pa)'];
      children.push(ficheBar(D, 'Filtration'));
      var filtreRows = [new D.TableRow({ children: [headerCell(D, '', FW[0]), headerCell(D, 'Pr\u00e9-filtre', FW[1]), headerCell(D, 'Filtre', FW[2]), headerCell(D, 'Filtre absolu', FW[3])] })];
      filtreLabels.forEach(function (lab, i) {
        filtreRows.push(new D.TableRow({ children: [headerCell(D, lab, FW[0]), bodyCell(D, pre[i], FW[1], { center: true }), bodyCell(D, filtre[i], FW[2], { center: true }), bodyCell(D, absolu[i], FW[3], { center: true })] }));
      });
      children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: filtreRows }));
      children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    }

    var cols = [
      ['R\u00e9seau d\u2019air', 900], ['Forme de la section', 1300], ['Diam\u00e8tre ou C\u00f4t\u00e9 1 (cm)', 1100],
      ['C\u00f4t\u00e9 2 (cm)', 900], ['Surface (m\u00b2)', 900], ['Vitesse (m/s)', 900],
      ['D\u00e9bit de r\u00e9f\u00e9rence (m\u00b3/h)', 1400], ['D\u00e9bit ann\u00e9e N-1 (m\u00b3/h)', 1118], ['D\u00e9bit ann\u00e9e en cours (m\u00b3/h)', 1118]
    ];
    var reseauRows = [new D.TableRow({ children: cols.map(function (c) { return headerCell(D, c[0], c[1]); }) })];
    reseauRows.push(ficheCtaReseauRow(D, 'Neuf', d, 'neuf', cols));
    reseauRows.push(ficheCtaReseauRow(D, 'Souffl\u00e9', d, 'souf', cols));
    if (d.rep_active === 'Oui') reseauRows.push(ficheCtaReseauRow(D, 'Repris', d, 'rep', cols));
    children.push(ficheBar(D, 'Mesures de vitesse'));
    children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: reseauRows }));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    children.push(ficheBar(D, 'Conclusion'));
    children.push(ficheConclusionRow(D, 'Avis par rapport aux donn\u00e9es constructeurs :', formatCrosstabValue(d.avis)));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(ficheBar(D, 'Observations'));
    children.push(ficheObservationBox(D, formatCrosstabValue(d.observation)));
  });
  return children;
}










// 5.4 — Extracteurs (Inserer_Annexe_5). Même paradigme que CTA (bloc par installation, pas de tableau croisé).
function buildAnnexeExtracteur(D, list, logoBuf) {
  var titre = 'Extracteur', sousTitre = 'Extracteurs';
  var children = [];
  if (!list || list.length === 0) {
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun local renseigné.', italics: true, size: 20 })] }));
    return children;
  }
  var W_LABEL = 3200, W_IDENT = 5200, W_PHOTO = ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    var identTable = new D.Table({ width: { size: W_IDENT, type: D.WidthType.DXA }, rows: ficheIdentRows(D, [
      ['Bâtiment', formatCrosstabValue(d.batiment)],
      ['Locaux extraits', formatCrosstabValue(d.locaux_extraits)],
      ['Date du contrôle', formatCrosstabValue(d.date_controle)],
      ['Réf. de l’équipement et/ou implantation', formatCrosstabValue(d.reference_equipement)]
    ], W_LABEL, W_IDENT - W_LABEL) });
    children.push(ficheTwoCol(D, identTable, fichePhotoBox(D, d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    var vitesse = d.vitesse_mode === 'Grille de points' ? d.vitesse_moyenne_grille : d.vitesse;
    var cols = [
      ['Réseau d’air', 900], ['Forme de la section', 1300], ['Diamètre ou Côté 1 (cm)', 1100],
      ['Côté 2 (cm)', 900], ['Surface (m²)', 900], ['Vitesse (m/s)', 900],
      ['Valeur de référence ou recommandée (m³/h)', 1400], ['Débit année N-1 (m³/h)', 1118], ['Débit année en cours (m³/h)', 1118]
    ];
    var vals = ['Extrait', formatCrosstabValue(d.forme_section), formatCrosstabValue(d.diametre_cote1),
      formatCrosstabValue(d.cote2), formatCrosstabValue(d.surface_m2), formatCrosstabValue(vitesse),
      formatCrosstabValue(d.valeur_reference_recommandee), formatCrosstabValue(d.debit_annee_n1), formatCrosstabValue(d.debit_annee_en_cours)];
    children.push(ficheBar(D, 'Mesures de vitesse'));
    children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: [
      new D.TableRow({ children: cols.map(function (c) { return headerCell(D, c[0], c[1]); }) }),
      new D.TableRow({ children: cols.map(function (c, i) { return bodyCell(D, vals[i], c[1], { center: true }); }) })
    ] }));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(ficheBar(D, 'Conclusion'));
    children.push(ficheConclusionRow(D, 'Avis par rapport à la valeur de recommandée :', formatCrosstabValue(d.avis_constructeur)));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(ficheBar(D, 'Observations'));
    children.push(ficheObservationBox(D, formatCrosstabValue(d.observation)));
  });
  return children;
}

// Tableau "Mesure de la vitesse de transport" — mêmes clés de champ (vt_*) pour Hottes et
// Installations diverses, fidèle au PDF de référence.
function ficheVtTable(D, d) {
  var W = [2400, 1800, 1900, 1918, 1618];
  var avisTxt = formatCrosstabValue(d.avis_vt);
  var c = avisColor(avisTxt);
  return new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: [
    new D.TableRow({ children: [headerCell(D, '', W[0]), headerCell(D, 'Valeur mesurée', W[1]), headerCell(D, 'Type de polluants', W[2]), headerCell(D, 'Valeur recommandée par l’INRS (ED 695)', W[3]), headerCell(D, 'Avis par rapport aux valeurs de référence', W[4])] }),
    new D.TableRow({ children: [
      headerCell(D, 'Vitesse moyenne (m/s)', W[0]),
      bodyCell(D, formatCrosstabValue(d.vt_mesuree), W[1], { center: true }),
      bodyCell(D, formatCrosstabValue(d.vt_type_polluant), W[2], { center: true }),
      bodyCell(D, formatCrosstabValue(d.vt_inrs), W[3], { center: true }),
      bodyCell(D, avisTxt, W[4], { center: true, bold: true, fill: c ? c.fill : undefined })
    ] })
  ] });
}


// Tableau générique "réseau(x) mesuré(s)" à une seule ligne (utilisé par Extracteur, Gaz d'échappement, etc.)


// 5.6 — Hottes (Inserer_Annexe_8, guide INRS ED 695)
function buildAnnexeHottes(D, list, logoBuf) {
  var titre = 'Hottes', sousTitre = 'Hottes et dosserets aspirants (guide INRS ED 695)';
  var children = [];
  if (!list || list.length === 0) {
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun local renseign\u00e9.', italics: true, size: 20 })] }));
    return children;
  }
  var W_LABEL = 3200, W_IDENT = 5200, W_PHOTO = ANNEXE_CONTENT_WIDTH - W_IDENT;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    var identTable = new D.Table({ width: { size: W_IDENT, type: D.WidthType.DXA }, rows: ficheIdentRows(D, [
      ['B\u00e2timent', formatCrosstabValue(d.batiment)],
      ['Localisation', formatCrosstabValue(d.localisation)],
      ['Date d\u2019installation', formatCrosstabValue(d.date_installation)],
      ['R\u00e9f. de l\u2019\u00e9quipement et/ou implantation', formatCrosstabValue(d.reference_equipement)]
    ], W_LABEL, W_IDENT - W_LABEL) });
    children.push(ficheTwoCol(D, identTable, fichePhotoBox(D, d.photo, W_PHOTO), W_IDENT, W_PHOTO));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    children.push(ficheBar(D, '\u00c9tat visuel du r\u00e9seau d\u2019aspiration'));
    children.push(ficheObservationBox(D, formatCrosstabValue(d.etat_visuel_reseau)));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(ficheBar(D, 'Test fumig\u00e8ne'));
    children.push(ficheConclusionRow(D, 'Observation', formatCrosstabValue(d.test_fumigene)));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    var choix = d.mesures_choisies || [];
    if (choix.indexOf('Vitesse au point d\u2019\u00e9mission') !== -1 || choix.indexOf("Vitesse au point d'\u00e9mission") !== -1) {
      var W = [2400, 1812, 1812, 1812, 1800];
      children.push(ficheBar(D, 'Mesure de la vitesse au point d\u2019\u00e9mission'));
      children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: [
        new D.TableRow({ children: [headerCell(D, '', W[0]), headerCell(D, 'Valeurs mesur\u00e9es', W[1]), headerCell(D, 'Valeurs recommand\u00e9es par l\u2019INRS (ED 695)', W[2]), headerCell(D, 'Valeurs de r\u00e9f\u00e9rence', W[3]), headerCell(D, 'Avis par rapport aux valeurs de r\u00e9f\u00e9rence', W[4])] }),
        new D.TableRow({ children: (function () {
          var v = formatCrosstabValue(d.avis_vpe_min), c = avisColor(v);
          return [headerCell(D, 'Vitesse minimale (m/s)', W[0]), bodyCell(D, formatCrosstabValue(d.vpe_min), W[1], { center: true }), bodyCell(D, formatCrosstabValue(d.vpe_min_inrs), W[2], { center: true }), bodyCell(D, formatCrosstabValue(d.vpe_min_reference), W[3], { center: true }), bodyCell(D, v, W[4], { center: true, bold: true, fill: c ? c.fill : undefined })];
        })() }),
        new D.TableRow({ children: (function () {
          var v = formatCrosstabValue(d.avis_vpe_moy), c = avisColor(v);
          return [headerCell(D, 'Vitesse moyenne (m/s)', W[0]), bodyCell(D, formatCrosstabValue(d.vpe_moyenne), W[1], { center: true }), bodyCell(D, formatCrosstabValue(d.vpe_moy_inrs), W[2], { center: true }), bodyCell(D, formatCrosstabValue(d.vpe_moy_reference), W[3], { center: true }), bodyCell(D, v, W[4], { center: true, bold: true, fill: c ? c.fill : undefined })];
        })() }),
        new D.TableRow({ children: [headerCell(D, 'D\u00e9bit d\u2019air extrait (m\u00b3/h)', W[0]), bodyCell(D, formatCrosstabValue(d.vpe_debit), W[1] + W[2] + W[3] + W[4], { center: true, colSpan: 4 })] })
      ] }));
      children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    }
    if (choix.indexOf('Vitesse de transport') !== -1) {
      children.push(ficheVtTable(D, d));
      children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    }

    children.push(ficheBar(D, 'Conclusion'));
    children.push(ficheConclusionRow(D, 'Avis par rapport \u00e0 la r\u00e9glementation et/ou aux pr\u00e9conisations (dossier de valeurs de r\u00e9f\u00e9rence si existant, normes, guide INRS) :', formatCrosstabValue(d.conclusion)));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(ficheBar(D, 'Observation'));
    children.push(ficheObservationBox(D, formatCrosstabValue(d.observation)));
  });
  return children;
}




// Tableau brut d'une grille de points de mesure (lignes × colonnes), sans en-têtes de dimension


// 5.7 — Bras d'aspiration articulés (Inserer_Annexe_9)
function buildAnnexeBrasAspiration(D, list, logoBuf) {
  return buildAnnexeFicheGenerique(D, 'bras_aspiration', 'Bras articul\u00e9', 'Bras articul\u00e9s', null, list, logoBuf);
}


// 5.8 — Installations avec captage localisé / équipements divers (Inserer_Annexe_11, guide INRS ED 695)
function buildAnnexeInstallationsDiverses(D, list, logoBuf) {
  var titre = '\u00c9quipement', sousTitre = 'Installations avec captage localis\u00e9';
  var children = [];
  if (!list || list.length === 0) {
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: 'Aucun local renseign\u00e9.', italics: true, size: 20 })] }));
    return children;
  }
  var W_LABEL = 3200;
  list.forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    children.push(annexePageHeader(D, titre, sousTitre, logoBuf));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: ficheIdentRows(D, [
      ['Activit\u00e9 et r\u00e9f\u00e9rence du local', formatCrosstabValue(d.localisation)],
      ['B\u00e2timent', formatCrosstabValue(d.batiment)],
      ['Type d\u2019installation', formatCrosstabValue(d.type_installation)],
      ['R\u00e9f. de l\u2019\u00e9quipement et/ou implantation', formatCrosstabValue(d.reference_equipement)]
    ], W_LABEL, ANNEXE_CONTENT_WIDTH - W_LABEL) }));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    children.push(ficheBar(D, '\u00c9tat visuel du r\u00e9seau d\u2019aspiration'));
    children.push(ficheObservationBox(D, formatCrosstabValue(d.etat_visuel_reseau)));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(ficheBar(D, 'Test fumig\u00e8ne'));
    children.push(ficheConclusionRow(D, 'Observation', formatCrosstabValue(d.test_fumigene)));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));

    var choix = d.mesures_choisies || [];
    if (choix.indexOf('Vitesse au point d\u2019\u00e9mission') !== -1 || choix.indexOf("Vitesse au point d'\u00e9mission") !== -1) {
      var W = [2400, 1800, 1900, 1918, 1618];
      var avisTxt = formatCrosstabValue(d.avis_vpe), c = avisColor(avisTxt);
      children.push(ficheBar(D, 'Mesure de la vitesse au point d\u2019\u00e9mission'));
      children.push(new D.Table({ width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA }, rows: [
        new D.TableRow({ children: [headerCell(D, '', W[0]), headerCell(D, 'Valeur mesur\u00e9e', W[1]), headerCell(D, 'Condition de dispersion du polluant', W[2]), headerCell(D, 'Valeur recommand\u00e9e par l\u2019INRS (ED 695)', W[3]), headerCell(D, 'Avis par rapport aux valeurs de r\u00e9f\u00e9rence', W[4])] }),
        new D.TableRow({ children: [
          headerCell(D, 'Vitesse (m/s)', W[0]),
          bodyCell(D, formatCrosstabValue(d.vpe_mesuree), W[1], { center: true }),
          bodyCell(D, formatCrosstabValue(d.vpe_conditions_dispersion), W[2], { center: true }),
          bodyCell(D, formatCrosstabValue(d.vpe_inrs), W[3], { center: true }),
          bodyCell(D, avisTxt, W[4], { center: true, bold: true, fill: c ? c.fill : undefined })
        ] })
      ] }));
      children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    }
    if (choix.indexOf('Vitesse de transport') !== -1) {
      children.push(ficheVtTable(D, d));
      children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    }

    children.push(ficheBar(D, 'Conclusion'));
    children.push(ficheConclusionRow(D, 'Avis par rapport aux valeurs de r\u00e9f\u00e9rence :', formatCrosstabValue(d.avis)));
    children.push(new D.Paragraph({ text: '', spacing: { after: 120 } }));
    children.push(ficheBar(D, 'Observations'));
    children.push(ficheObservationBox(D, formatCrosstabValue(d.observation)));
  });
  return children;
}


// 5.9 — Locaux de charge d'accumulateurs (Inserer_Annexe_16, guide INRS ED6120 / NF EN 62485-3)
function buildAnnexeLocauxCharge(D, list, logoBuf) {
  var legal = [legalParagraph('R\u00c9F\u00c9RENTIELS', { bold: true, center: true, size: 20, after: 100 }),legalParagraph('Guide INRS ED6120 - Avril 2018 : Charge des batteries d\u2019accumulateurs au plomb', { center: true, size: 18 }),legalParagraph('Norme NF EN 62485-3 - Janvier 2015 : Exigences de s\u00e9curit\u00e9 pour les batteries d\u2019accumulateurs et les installations de batteries', { center: true, size: 18 }),legalParagraph('Locaux concern\u00e9s : locaux de charge de batteries de traction au plomb', { center: true, size: 18, italics: true })];
  return buildAnnexeFicheGenerique(D, 'locaux_charge', 'Local de charge', 'Locaux de charge d\u2019accumulateurs', legal, list, logoBuf);
}


// 5.5 — Sorbonnes (Inserer_Annexe_7, guide INRS ED795 / normes XP X15-203 et NF EN 14175-4)
function buildAnnexeSorbonnes(D, list, logoBuf) {
  var legal = [legalParagraph('Tests r\u00e9alis\u00e9s : mesure de la vitesse de transport et/ou mesure de la vitesse au point d\u2019\u00e9mission, compar\u00e9es aux valeurs indiqu\u00e9es par le guide INRS ED 695.', { center: true, size: 18 })];
  return buildAnnexeFicheGenerique(D, 'sorbonnes', 'Sorbonne', 'Sorbonnes', legal, list, logoBuf);
}




// 5.x — Cabines de peinture (Inserer_Annexe_10, guide INRS ED 835/ED 928, norme 16985)
function buildAnnexeCabinesPeinture(D, list, logoBuf) {
  var legal = [legalParagraph('M\u00e9thodologie de v\u00e9rification de la ventilation des cabines de peinture', { bold: true, center: true, size: 20, after: 120 }),legalParagraph('Ventilation verticale : mesures r\u00e9alis\u00e9es \u00e0 1 m du sol, aux points indiqu\u00e9s dans les fiches annexes.', { after: 60 }),legalParagraph('Ventilation horizontale : mesures r\u00e9alis\u00e9es dans le plan de travail du peintre \u2014 v\u00e9rifier qu\u2019il ne se trouve pas entre le pulv\u00e9risateur et l\u2019objet \u00e0 peindre.', { after: 160 }),legalParagraph('Les valeurs mesur\u00e9es sont compar\u00e9es \u00e0 celles des guides INRS ED 835 (peintures liquides) et ED 928 (peintures poudre) ou, \u00e9ventuellement, \u00e0 celles de la norme 16985.', { after: 100 })];
  return buildAnnexeFicheGenerique(D, 'cabines_peinture', 'Cabine de peinture', 'Installations avec captage localis\u00e9', legal, list, logoBuf);
}


// 5.x — Box de préparation des peintures (Inserer_Annexe_14, norme NF T 35-014)
function buildAnnexeBoxPeinture(D, list, logoBuf) {
  var legal = [legalParagraph('R\u00c9F\u00c9RENTIEL', { bold: true, center: true, underline: true, size: 20, after: 100 }),legalParagraph('NF T 35-014, D\u00e9cembre 2004 \u2014 Box de pr\u00e9paration des peintures', { center: true, size: 18 }),legalParagraph('Taux de renouvellement minimum pr\u00e9conis\u00e9 : 50 volumes/heure', { center: true, size: 18, after: 100 })];
  return buildAnnexeFicheGenerique(D, 'box_peinture', 'Box pr\u00e9paration peinture', 'Installations avec captage localis\u00e9', legal, list, logoBuf);
}


// 5.x — ERP / Locaux à pollution non spécifique des établissements recevant du public
// (Inserer_Annexe_6, Articles R4222-5/R4222-6 + Règlement Sanitaire Départemental type Art. 64/66)
function buildAnnexeERP(D, list, logoBuf) {
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
      width: { size: ANNEXE_CONTENT_WIDTH, type: D.WidthType.DXA },
      rows: [
        new D.TableRow({ children: [headerCell(D, 'DESIGNATION DES LOCAUX', 7236), headerCell(D, 'DEBIT MINIMAL (m³/h)', 2400)] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux d\u2019enseignement : classes, salles d\u2019études, laboratoires (hors pollution spécifique) — maternelles, primaires et secondaires du 1er cycle', 7236), bodyCell(D, '15', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux d\u2019enseignement : secondaires du 2e cycle et universitaires, ateliers', 7236), bodyCell(D, '18', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux de vente : boutiques, supermarchés', 7236), bodyCell(D, '18', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux de restauration : cafés, bars, restaurants, cantines, salles à manger', 7236), bodyCell(D, '18', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Bureaux et locaux assimilés : locaux d\u2019accueil, bibliothèques, bureaux de poste, banques', 7236), bodyCell(D, '18', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux de réunions : salles de réunions, de spectacles, de culte, clubs, foyers', 7236), bodyCell(D, '18', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux d\u2019hébergement : chambres collectives (plus de trois personnes) (1), dortoirs, cellules, salles de repos', 7236), bodyCell(D, '18', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux à usage sportif : par sportif, dans une piscine', 7236), bodyCell(D, '22', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux à usage sportif : par sportif', 7236), bodyCell(D, '25', 2400, { center: true })] }),
        new D.TableRow({ children: [bodyCell(D, 'Locaux à usage sportif : par spectateur', 7236), bodyCell(D, '18', 2400, { center: true })] })
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
    { subheader: 'Extraction / Soufflage' },
    { label: 'Débit total mesuré (m³/h)', key: 'debit_total_mesure' },
    { label: 'Présence d\u2019ouvrant donnant directement sur l\u2019extérieur', key: 'ouvrant_exterieur' },
    { label: 'Présence d\u2019entrée d\u2019air donnant directement sur l\u2019extérieur', key: 'entree_air_exterieur' },
    { label: 'Pourcentage d\u2019air neuf (%)', key: 'pourcentage_air_neuf' },
    { label: 'Nombre de bouches', key: 'nombre_bouches' },
    { label: 'État des bouches', key: 'etat_bouches' },
    { subheader: 'Double flux' },
    { label: 'Débit soufflage mesuré (m³/h)', key: 'debit_soufflage' },
    { label: 'Débit extraction mesuré (m³/h)', key: 'debit_extraction' },
    { label: 'Débit d\u2019air neuf introduit (m³/h)', key: 'debit_air_neuf_introduit' },
    { subheader: 'Constat' },
    { label: 'Type de ventilation', key: 'type_ventilation_libelle' },
    { label: 'Débit minimum d\u2019air neuf (m³/h)', key: 'debit_min_air_neuf' },
    { label: 'Volume minimal (m³)', key: 'volume_min' },
    { label: 'Avis par rapport aux valeurs réglementaires', key: 'avis', isAvis: true }
  ];

  return crosstabSection(D, 'ERP', 'locaux à pollution non spécifique', legal, rows, list, logoBuf);
}

// 5.x — Menuiserie (machines à bois) — Inserer_Annexe_13bis. Une fiche par machine (pas de tableau
// croisé) : identification, état visuel, conditions de mesure, vitesse de transport, débit, conclusion,
// puis le détail du relevé (gaine, grille de points le cas échéant).
function buildAnnexeMenuiserieMAB(D, list, logoBuf) {
  return buildAnnexeFicheGenerique(D, 'menuiserie_bis', 'Machine \u00e0 bois', 'Installations avec captage localis\u00e9', null, list, logoBuf);
}




// 5.x — Locaux fumeurs (Inserer_Annexe_3, critères code de la santé publique)
function buildAnnexeLocauxFumeurs(D, list, logoBuf) {
  var legal = [legalParagraph('Extraits du R\u00e8glement Sanitaire D\u00e9partemental type', { bold: true, center: true, size: 20 }),legalParagraph('Les valeurs ci-apr\u00e8s s\u2019appliquent uniquement au public dans les locaux \u00e0 pollution non sp\u00e9cifique :', { after: 100 }),legalParagraph('Crit\u00e8res retenus pour l\u2019avis : superficie du local inf\u00e9rieure \u00e0 35 m\u00b2, superficie inf\u00e9rieure ou \u00e9gale \u00e0 20 % de la superficie totale de l\u2019\u00e9tablissement, taux de renouvellement d\u2019air sup\u00e9rieur ou \u00e9gal \u00e0 10 volumes/heure.', { after: 100 })];
  return buildAnnexeFicheGenerique(D, 'locaux_fumeurs', 'Local fumeurs', 'Locaux fumeurs', legal, list, logoBuf);
}


// 5.x — Gaz d'échappement (Inserer_Annexe_12, guide INRS)
function buildAnnexeGazEchappement(D, list, logoBuf) {
  return buildAnnexeFicheGenerique(D, 'gaz_echappement', 'Gaz d\u2019\u00e9chappement', 'Installations avec captage localis\u00e9', null, list, logoBuf);
}


// 5.x — Menuiserie, réseau d'aspiration (Inserer_Annexe_13, débit global d'air extrait)
function buildAnnexeMenuiserie(D, list, logoBuf) {
  return buildAnnexeFicheGenerique(D, 'menuiserie', 'Menuiserie', 'Installations avec captage localis\u00e9', null, list, logoBuf);
}


// 5.x — Torches aspirantes (Inserer_Annexe_15) — jusqu'à 10 points de mesure par installation
function buildAnnexeTorchesAspirantes(D, list, logoBuf) {
  return buildAnnexeFicheGenerique(D, 'torches_aspirantes', 'Torche aspirante', 'Installations avec captage localis\u00e9', null, list, logoBuf);
}


// 5.x — TTS, traitement de surface (Inserer_Annexe_17)
function buildAnnexeTTS(D, list, logoBuf) {
  return buildAnnexeFicheGenerique(D, 'tts', 'TTS', 'Installations avec captage localis\u00e9', null, list, logoBuf);
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
