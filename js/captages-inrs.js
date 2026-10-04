// captages-inrs.js - Trois types d'installation tirés des guides pratiques de ventilation de l'INRS
// (chantier du 2026-10-03, guides rangés dans « GUIDES PAR INSTALLATIONS/ »). Absents du Rapso.
//
// 1. Décapage, désablage, grenaillage au jet libre (decapage) — guide ED 768 (n° 14) :
//    - cabine : débit extrait ≥ 400 m³/h par m² de section (déplacement vertical de l'air, section =
//      longueur × largeur) ou ≥ 1 000 m³/h par m² (déplacement horizontal, section = largeur × hauteur) ;
//    - grande cabine (hauteur ≥ 7 m ou longueur ≥ 15 m) : taux de renouvellement (débit introduit /
//      volume) > 80 vol/h, > 120 pour les opérations très polluantes ;
//    - caisson de grenaillage à manchons : vitesse dans les ouvertures au moins 3 m/s ;
//    - conduits : vitesse minimale 20 m/s pour éviter les dépôts.
// 2. Machines-outils et fluides de coupe (fluide_coupe) — guide ED 972 (n° 6) :
//    - captage enveloppant à privilégier, dépression dans le capot de l'ordre de 20 à 50 Pa ;
//    - objectif de concentration en aérosol dans l'air inhalé : 0,5 mg/m³ (fraction inhalable) ;
//    - recyclage : en aval de l'épurateur, au plus le cinquième de cette valeur (0,1 mg/m³) ; les
//      épurateurs montés sur la machine et rejetant dans l'atelier sont « formellement déconseillés »
//      (et ne permettent pas la surveillance imposée par R4222-16).
// 3. Poste d'utilisation manuelle de solvants (poste_solvant) — guide ED 6049 (n° 20) :
//    - enceinte ventilée : vitesse moyenne aux ouvertures ≥ 0,5 m/s si leur largeur est ≤ 10 cm,
//      ≥ 0,65 m/s au-delà ;
//    - table aspirante / dosseret : vitesse moyenne au droit de l'ouverture 0,5 m/s, aucun point
//      sous 0,4 m/s ;
//    - bac avec fentes : au moins 0,25 m/s au point de la surface émissive le plus éloigné des fentes.
//
// Ce sont des valeurs recommandées par l'INRS (pas des valeurs réglementaires) : la fiche le dit, et les
// avis sont formulés « par rapport aux valeurs recommandées ». S'appuie sur les helpers de
// js/locaux-specifiques.js (worstAvis, avisVersReference, pdfLsHelpers, pdfLsIdent).

var ETATS_EPURATEUR = ['Bon état', 'Colmaté / encrassé', 'Fuite ou défaut constaté'];

function seuilAvis(val, mini) {
  var v = num(val);
  if (isNaN(v)) return 'Impossible de se prononcer';
  return v >= mini ? 'Satisfaisant' : 'Non Satisfaisant';
}

function etatAvis(v) {
  if (!v) return 'Impossible de se prononcer';
  return v === ETATS_EPURATEUR[0] ? 'Satisfaisant' : 'Non Satisfaisant';
}

// ————————————————————————————————————————————
// 1. Décapage / grenaillage au jet libre (ED 768)
// ————————————————————————————————————————————

var DEC_CABINE = 'Cabine de décapage au jet libre (opérateur à l’intérieur)';
var DEC_CAISSON = 'Caisson de grenaillage (manipulation par manchons)';
var DEC_VERTICAL = 'Déplacement vertical de l’air (du plafond vers le sol)';
var DEC_HORIZONTAL = 'Déplacement horizontal de l’air';

var TYPE_DECAPAGE = {
  id: 'decapage', label: 'Décapage / grenaillage au jet libre', icon: 'tool', implemented: true,
  fields: [
    { key: 'batiment', label: 'Bâtiment', type: 'text' },
    { key: 'localisation', label: 'Atelier', type: 'text' },
    { key: 'reference_equipement', label: 'Cabine ou caisson', type: 'text' },
    { key: 'date_controle', label: 'Date de Contrôle', type: 'text' },
    { key: 'photo', label: 'Photo', type: 'photo' },
    { key: 'type_installation', label: 'Type d’installation', type: 'select', options: [DEC_CABINE, DEC_CAISSON] },

    { key: 'section_cabine', label: 'Cabine (guide INRS ED 768)', type: 'section' },
    { key: 'deplacement_air', label: 'Déplacement de l’air dans la zone de travail', type: 'select', options: [DEC_VERTICAL, DEC_HORIZONTAL],
      showIf: { key: 'type_installation', equals: DEC_CABINE } },
    { key: 'longueur', label: 'Longueur de la cabine (m)', type: 'number', showIf: { key: 'type_installation', equals: DEC_CABINE } },
    { key: 'largeur', label: 'Largeur de la cabine (m)', type: 'number', showIf: { key: 'type_installation', equals: DEC_CABINE } },
    { key: 'hauteur', label: 'Hauteur de la cabine (m)', type: 'number', showIf: { key: 'type_installation', equals: DEC_CABINE } },
    { key: 'section_ventilee', label: 'Section à ventiler (m²)', type: 'computed', showIf: { key: 'type_installation', equals: DEC_CABINE } },
    { key: 'debit_minimal', label: 'Débit minimal recommandé (ED 768, m³/h)', type: 'computed', showIf: { key: 'type_installation', equals: DEC_CABINE } },
    { key: 'debit_extrait', label: 'Débit d’air extrait mesuré (m³/h)', type: 'number', showIf: { key: 'type_installation', equals: DEC_CABINE } },
    { key: 'avis_debit', label: 'Avis débit extrait / valeur recommandée', type: 'computed', showIf: { key: 'type_installation', equals: DEC_CABINE } },
    { key: 'grande_cabine', label: 'Grande cabine (hauteur ≥ 7 m ou longueur ≥ 15 m)', type: 'computed', showIf: { key: 'type_installation', equals: DEC_CABINE } },
    { key: 'operations_tres_polluantes', label: 'Opérations très polluantes', type: 'toggle', options: ['Oui', 'Non'], showIf: { key: 'grande_cabine', equals: 'Oui' } },
    { key: 'debit_introduit', label: 'Débit d’air introduit dans la cabine (m³/h)', type: 'number', showIf: { key: 'grande_cabine', equals: 'Oui' } },
    { key: 'taux_renouvellement', label: 'Taux de renouvellement (vol/h)', type: 'computed', showIf: { key: 'grande_cabine', equals: 'Oui' } },
    { key: 'avis_taux', label: 'Avis taux de renouvellement (> 80 ou > 120 vol/h)', type: 'computed', showIf: { key: 'grande_cabine', equals: 'Oui' } },

    { key: 'section_caisson', label: 'Caisson de grenaillage (guide INRS ED 768)', type: 'section' },
    { key: 'vitesse_ouvertures', label: 'Vitesse moyenne de l’air dans les ouvertures (m/s)', type: 'number', showIf: { key: 'type_installation', equals: DEC_CAISSON } },
    { key: 'avis_ouvertures', label: 'Avis vitesse dans les ouvertures (≥ 3 m/s)', type: 'computed', showIf: { key: 'type_installation', equals: DEC_CAISSON } },

    { key: 'section_reseau', label: 'Réseau et dépoussiérage', type: 'section' },
    { key: 'vitesse_conduit', label: 'Vitesse de l’air dans le conduit d’extraction (m/s)', type: 'number', optional: true },
    { key: 'avis_conduit', label: 'Avis vitesse dans le conduit (≥ 20 m/s)', type: 'computed' },
    { key: 'etat_depoussiereur', label: 'État du dépoussiéreur', type: 'select', options: ETATS_EPURATEUR },
    { key: 'rejet', label: 'Rejet de l’air épuré', type: 'select', options: ['Rejet à l’extérieur', 'Recyclage (voir la fiche « Recyclage de l’air »)'] },

    { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
    { key: 'avis', label: 'Avis par rapport aux valeurs recommandées', type: 'computed' },
    { key: 'observation', label: 'Observation', type: 'textarea' }
  ]
};

var CALC_DECAPAGE = [
  { target: 'section_ventilee', decimals: 2, fn: function (d) {
      if (d.type_installation !== DEC_CABINE) return '';
      var L = num(d.longueur), l = num(d.largeur), H = num(d.hauteur);
      if (d.deplacement_air === DEC_VERTICAL) return (isNaN(L) || isNaN(l)) ? '' : L * l;
      if (d.deplacement_air === DEC_HORIZONTAL) return (isNaN(l) || isNaN(H)) ? '' : l * H;
      return '';
    } },
  { target: 'debit_minimal', decimals: 0, fn: function (d, x) {
      var s = exactOr(x, d, 'section_ventilee');
      if (isNaN(s)) return '';
      return s * (d.deplacement_air === DEC_HORIZONTAL ? 1000 : 400);
    } },
  { target: 'avis_debit', fn: function (d) {
      if (d.type_installation !== DEC_CABINE) return '';
      var m = num(d.debit_minimal);
      return isNaN(m) ? 'Impossible de se prononcer' : seuilAvis(d.debit_extrait, m);
    } },
  { target: 'grande_cabine', fn: function (d) {
      if (d.type_installation !== DEC_CABINE) return '';
      var L = num(d.longueur), H = num(d.hauteur);
      if (isNaN(L) && isNaN(H)) return '';
      return ((!isNaN(H) && H >= 7) || (!isNaN(L) && L >= 15)) ? 'Oui' : 'Non';
    } },
  { target: 'taux_renouvellement', decimals: 0, fn: function (d) {
      if (d.grande_cabine !== 'Oui') return '';
      var q = num(d.debit_introduit), v = num(d.longueur) * num(d.largeur) * num(d.hauteur);
      return (isNaN(q) || isNaN(v) || v === 0) ? '' : q / v;
    } },
  { target: 'avis_taux', fn: function (d) {
      if (d.grande_cabine !== 'Oui') return '';
      var t = num(d.taux_renouvellement);
      if (isNaN(t)) return 'Impossible de se prononcer';
      return t > (d.operations_tres_polluantes === 'Oui' ? 120 : 80) ? 'Satisfaisant' : 'Non Satisfaisant';
    } },
  { target: 'avis_ouvertures', fn: function (d) {
      return d.type_installation === DEC_CAISSON ? seuilAvis(d.vitesse_ouvertures, 3) : '';
    } },
  { target: 'avis_conduit', fn: function (d) {
      return String(d.vitesse_conduit || '').trim() ? seuilAvis(d.vitesse_conduit, 20) : '';
    } },
  { target: 'avis', fn: function (d) {
      if (!d.type_installation) return 'Impossible de se prononcer';
      var l = d.type_installation === DEC_CABINE ? [d.avis_debit, d.avis_taux] : [d.avis_ouvertures];
      return worstAvis(l.concat([d.avis_conduit, etatAvis(d.etat_depoussiereur)]));
    } }
];

// ————————————————————————————————————————————
// 2. Machines-outils et fluides de coupe (ED 972)
// ————————————————————————————————————————————

var FC_ENVELOPPANT = 'Captage enveloppant (machine capotée)';
var FC_TRAITEMENTS = ['Rejet à l’extérieur', 'Recyclage centralisé avec by-pass vers l’extérieur', 'Épurateur sur la machine rejetant dans l’atelier'];

var TYPE_FLUIDE_COUPE = {
  id: 'fluide_coupe', label: 'Machines-outils (fluides de coupe)', icon: 'tool', implemented: true,
  fields: [
    { key: 'batiment', label: 'Bâtiment', type: 'text' },
    { key: 'localisation', label: 'Atelier', type: 'text' },
    { key: 'reference_machine', label: 'Machine', type: 'text' },
    { key: 'date_controle', label: 'Date de Contrôle', type: 'text' },
    { key: 'photo', label: 'Photo', type: 'photo' },
    { key: 'type_fluide', label: 'Fluide de coupe', type: 'select', options: ['Huile entière', 'Fluide aqueux (émulsion, solution)'] },

    { key: 'section_captage', label: 'Captage (guide INRS ED 972)', type: 'section' },
    { key: 'type_captage', label: 'Dispositif de captage', type: 'select', options: [FC_ENVELOPPANT, 'Captage inducteur (capotage impossible)', 'Aucun captage'] },
    { key: 'depression_capot', label: 'Dépression mesurée dans le capot (Pa)', type: 'number', optional: true, showIf: { key: 'type_captage', equals: FC_ENVELOPPANT } },
    { key: 'avis_capot', label: 'Avis dépression du capot (de l’ordre de 20 à 50 Pa)', type: 'computed', showIf: { key: 'type_captage', equals: FC_ENVELOPPANT } },
    { key: 'ouverture_capot', label: 'Ouverture du capot', type: 'select', options: ['Ouverture temporisée (balayage du capot)', 'Ouverture immédiate'],
      showIf: { key: 'type_captage', equals: FC_ENVELOPPANT } },
    { key: 'debit_mesure', label: 'Débit d’air extrait mesuré (m³/h)', type: 'number' },
    { key: 'debit_reference', label: 'Débit de référence (m³/h, « / » si aucun)', type: 'text' },
    { key: 'avis_debit', label: 'Avis débit / valeur de référence', type: 'computed' },
    { key: 'avis_captage', label: 'Avis captage', type: 'computed' },

    { key: 'section_traitement', label: 'Traitement de l’air capté', type: 'section' },
    { key: 'traitement', label: 'Devenir de l’air capté', type: 'select', options: FC_TRAITEMENTS },
    { key: 'conc_aval', label: 'Concentration en aérosol en aval de l’épurateur (mg/m³)', type: 'number', optional: true,
      showIf: { key: 'traitement', in: [FC_TRAITEMENTS[1], FC_TRAITEMENTS[2]] } },
    { key: 'avis_traitement', label: 'Avis traitement (aval ≤ 0,1 mg/m³ en cas de recyclage)', type: 'computed' },

    { key: 'section_atelier', label: 'Atmosphère de l’atelier', type: 'section' },
    { key: 'brouillard', label: 'Brouillard d’huile dans l’atelier', type: 'select', options: ['Aucun brouillard visible', 'Brouillard visible'] },
    { key: 'conc_atelier', label: 'Concentration en aérosol, fraction inhalable (mg/m³)', type: 'number', optional: true },
    { key: 'mesure_8h', label: 'Mesure représentative d’une moyenne sur 8 heures', type: 'toggle', options: ['Oui', 'Non'], optional: true },
    { key: 'avis_atelier', label: 'Avis atmosphère (objectif 0,5 mg/m³)', type: 'computed' },

    { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
    { key: 'avis', label: 'Avis par rapport aux valeurs recommandées', type: 'computed' },
    { key: 'observation', label: 'Observation', type: 'textarea' }
  ]
};

var CALC_FLUIDE_COUPE = [
  { target: 'avis_capot', fn: function (d) {
      if (d.type_captage !== FC_ENVELOPPANT || !String(d.depression_capot || '').trim()) return '';
      return seuilAvis(Math.abs(num(d.depression_capot)), 20);
    } },
  { target: 'avis_debit', fn: function (d) { return avisVersReference(d.debit_mesure, d.debit_reference); } },
  { target: 'avis_captage', fn: function (d) {
      if (!d.type_captage) return 'Impossible de se prononcer';
      if (d.type_captage === 'Aucun captage') return 'Non Satisfaisant'; // R4222-12 : captage à la source
      return 'Satisfaisant';
    } },
  { target: 'avis_traitement', fn: function (d) {
      if (!d.traitement) return 'Impossible de se prononcer';
      if (d.traitement === FC_TRAITEMENTS[0]) return 'Satisfaisant';
      if (d.traitement === FC_TRAITEMENTS[2]) return 'Non Satisfaisant';
      var c = num(d.conc_aval);
      if (isNaN(c)) return 'Impossible de se prononcer';
      return c <= 0.1 ? 'Satisfaisant' : 'Non Satisfaisant';
    } },
  { target: 'avis_atelier', fn: function (d) {
      if (d.brouillard === 'Brouillard visible') return 'Non Satisfaisant';
      var c = num(d.conc_atelier);
      if (isNaN(c)) return d.brouillard ? 'Satisfaisant' : 'Impossible de se prononcer';
      if (d.mesure_8h !== 'Oui') return 'Impossible de se prononcer';
      return c <= 0.5 ? 'Satisfaisant' : 'Non Satisfaisant';
    } },
  { target: 'avis', fn: function (d) {
      return worstAvis([d.avis_captage, d.avis_capot, d.avis_debit, d.avis_traitement, d.avis_atelier]);
    } }
];

// ————————————————————————————————————————————
// 3. Poste d'utilisation manuelle de solvants (ED 6049)
// ————————————————————————————————————————————

var PS_DISPOSITIFS = ['Enceinte ventilée (ouvertures de 10 cm au plus)', 'Enceinte ventilée (ouvertures de plus de 10 cm)',
  'Table aspirante / dosseret', 'Bac ou récipient avec fentes d’aspiration'];
var PS_SEUILS = {};
PS_SEUILS[PS_DISPOSITIFS[0]] = 0.5; PS_SEUILS[PS_DISPOSITIFS[1]] = 0.65; PS_SEUILS[PS_DISPOSITIFS[2]] = 0.5; PS_SEUILS[PS_DISPOSITIFS[3]] = 0.25;

var TYPE_POSTE_SOLVANT = {
  id: 'poste_solvant', label: 'Poste manuel aux solvants', icon: 'tool', implemented: true,
  fields: [
    { key: 'batiment', label: 'Bâtiment', type: 'text' },
    { key: 'localisation', label: 'Atelier', type: 'text' },
    { key: 'reference_equipement', label: 'Poste (nettoyage, mélange, encollage…)', type: 'text' },
    { key: 'solvant', label: 'Solvant(s) utilisé(s)', type: 'text' },
    { key: 'date_controle', label: 'Date de Contrôle', type: 'text' },
    { key: 'photo', label: 'Photo', type: 'photo' },

    { key: 'section_captage', label: 'Captage (guide INRS ED 6049)', type: 'section' },
    { key: 'type_dispositif', label: 'Dispositif de captage', type: 'select', options: PS_DISPOSITIFS },
    { key: 'vitesse_moyenne', label: 'Vitesse moyenne aux ouvertures / au droit de l’ouverture (m/s)', type: 'number',
      showIf: { key: 'type_dispositif', in: [PS_DISPOSITIFS[0], PS_DISPOSITIFS[1], PS_DISPOSITIFS[2]] } },
    { key: 'vitesse_minimale', label: 'Vitesse la plus faible mesurée sur l’ouverture (m/s)', type: 'number',
      showIf: { key: 'type_dispositif', equals: PS_DISPOSITIFS[2] } },
    { key: 'vitesse_point_eloigne', label: 'Vitesse au point de la surface le plus éloigné des fentes (m/s)', type: 'number',
      showIf: { key: 'type_dispositif', equals: PS_DISPOSITIFS[3] } },
    { key: 'valeur_recommandee', label: 'Valeur recommandée (ED 6049, m/s)', type: 'computed' },
    { key: 'avis_vitesse', label: 'Avis vitesse / valeur recommandée', type: 'computed' },
    { key: 'debit_mesure', label: 'Débit d’air extrait mesuré (m³/h)', type: 'number', optional: true },
    { key: 'debit_reference', label: 'Débit de référence (m³/h, « / » si aucun)', type: 'text', optional: true },
    { key: 'avis_debit', label: 'Avis débit / valeur de référence', type: 'computed' },
    { key: 'test_fumigene', label: 'Test fumigène', type: 'select', options: ['Polluants entièrement captés', 'Fuites hors du captage', 'Non réalisé'] },

    { key: 'section_conclusion', label: 'Conclusion', type: 'section' },
    { key: 'avis', label: 'Avis par rapport aux valeurs recommandées', type: 'computed' },
    { key: 'observation', label: 'Observation', type: 'textarea' }
  ]
};

var CALC_POSTE_SOLVANT = [
  { target: 'valeur_recommandee', fn: function (d) { return PS_SEUILS[d.type_dispositif] !== undefined ? frDisplay(PS_SEUILS[d.type_dispositif]) : ''; } },
  { target: 'avis_vitesse', fn: function (d) {
      var s = PS_SEUILS[d.type_dispositif];
      if (s === undefined) return 'Impossible de se prononcer';
      if (d.type_dispositif === PS_DISPOSITIFS[3]) return seuilAvis(d.vitesse_point_eloigne, s);
      var a = seuilAvis(d.vitesse_moyenne, s);
      // Table aspirante / dosseret : flux homogène, aucun point sous 0,4 m/s
      if (d.type_dispositif === PS_DISPOSITIFS[2] && String(d.vitesse_minimale || '').trim()) a = worstAvis([a, seuilAvis(d.vitesse_minimale, 0.4)]);
      return a;
    } },
  { target: 'avis_debit', fn: function (d) { return String(d.debit_mesure || '').trim() ? avisVersReference(d.debit_mesure, d.debit_reference) : ''; } },
  { target: 'avis', fn: function (d) {
      var fum = d.test_fumigene === 'Fuites hors du captage' ? 'Non Satisfaisant' : '';
      return worstAvis([d.avis_vitesse, d.avis_debit, fum]);
    } }
];

// ————————————————————————————————————————————
// Fiches PDF
// ————————————————————————————————————————————

// Fiche générique en sections : rows = [libellé, valeur, estUnAvis]
function pdfBuildFicheSections(titre, sousTitre, logo, list, identRows, sections, conclusion) {
  var content = [], H = pdfLsHelpers();
  (list || []).forEach(function (inst, idx) {
    var d = inst.data;
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(pdfAnnexePageHeader(titre, sousTitre, logo));
    content.push(pdfLsIdent(H, identRows(d), d.photo));
    sections(d).forEach(function (s) {
      var rows = s.rows.filter(function (r) { return r && !(r[3] && (r[1] === '' || r[1] === undefined)); });
      if (!rows.length) return;
      content.push(H.gap(8));
      content.push(H.bar(s.titre));
      content.push(H.t([270, 270], rows.map(function (r) { return [H.L(r[0]), r[2] ? H.avis(r[1]) : H.V(r[1])]; })));
    });
    content.push(H.gap(10));
    content.push(H.t([386, 154], [[H.V(conclusion, { alignment: 'left' }), H.avis(d.avis)]]));
    content.push(H.gap(8));
    content.push(H.t([540], [[H.L('Observation')], [H.V(H.v(d.observation), { alignment: 'left', margin: [6, 8, 6, 8] })]]));
  });
  return content;
}

function pdfBuildAnnexeDecapage(list, logo) {
  var H = pdfLsHelpers();
  return pdfBuildFicheSections('Décapage au jet libre', 'DÉCAPAGE, DÉSABLAGE, GRENAILLAGE AU JET LIBRE', logo, list,
    function (d) { return [['Bâtiment', d.batiment, true], ['Atelier', d.localisation], ['Cabine ou caisson', d.reference_equipement, true], ['Type d’installation', d.type_installation], ['Date du contrôle', d.date_controle]]; },
    function (d) {
      var cab = d.type_installation === DEC_CABINE;
      return [
        { titre: 'Cabine (guide INRS ED 768 : 400 m³/h par m² en flux vertical, 1 000 m³/h par m² en flux horizontal)', rows: cab ? [
          ['Déplacement de l’air', d.deplacement_air], ['Dimensions (L × l × H)', [d.longueur, d.largeur, d.hauteur].map(H.v).join(' × ') + ' m'],
          ['Section à ventiler', H.u(d.section_ventilee, 'm²')], ['Débit minimal recommandé', H.u(d.debit_minimal, 'm³/h')],
          ['Débit d’air extrait mesuré', H.u(d.debit_extrait, 'm³/h')], ['Avis débit extrait', d.avis_debit, true],
          d.grande_cabine === 'Oui' ? ['Taux de renouvellement (grande cabine, > ' + (d.operations_tres_polluantes === 'Oui' ? '120' : '80') + ' vol/h)', H.u(d.taux_renouvellement, 'vol/h')] : null,
          d.grande_cabine === 'Oui' ? ['Avis taux de renouvellement', d.avis_taux, true] : null
        ] : [] },
        { titre: 'Caisson de grenaillage (guide INRS ED 768 : au moins 3 m/s dans les ouvertures)', rows: cab ? [] : [
          ['Vitesse moyenne dans les ouvertures', H.u(d.vitesse_ouvertures, 'm/s')], ['Avis vitesse dans les ouvertures', d.avis_ouvertures, true]
        ] },
        { titre: 'Réseau et dépoussiérage', rows: [
          ['Vitesse dans le conduit d’extraction (≥ 20 m/s)', H.u(d.vitesse_conduit, 'm/s')], ['Avis vitesse dans le conduit', d.avis_conduit, true, true],
          ['État du dépoussiéreur', d.etat_depoussiereur], ['Rejet de l’air épuré', d.rejet]
        ] }
      ];
    }, 'Avis par rapport aux valeurs recommandées par le guide INRS ED 768 (décapage, désablage, dépolissage au jet libre en cabine) :');
}

function pdfBuildAnnexeFluideCoupe(list, logo) {
  var H = pdfLsHelpers();
  return pdfBuildFicheSections('Machines-outils', 'CAPTAGE DES AÉROSOLS DE FLUIDES DE COUPE', logo, list,
    function (d) { return [['Bâtiment', d.batiment, true], ['Atelier', d.localisation], ['Machine', d.reference_machine, true], ['Fluide de coupe', d.type_fluide], ['Date du contrôle', d.date_controle]]; },
    function (d) {
      var env = d.type_captage === FC_ENVELOPPANT;
      return [
        { titre: 'Captage (guide INRS ED 972 ; Code du travail, art. R4222-12)', rows: [
          ['Dispositif de captage', d.type_captage],
          env ? ['Dépression dans le capot (de l’ordre de 20 à 50 Pa)', H.u(d.depression_capot, 'Pa')] : null,
          env ? ['Avis dépression du capot', d.avis_capot, true, true] : null,
          env ? ['Ouverture du capot', d.ouverture_capot] : null,
          ['Débit d’air extrait mesuré', H.u(d.debit_mesure, 'm³/h')], ['Débit de référence', H.u(d.debit_reference, 'm³/h')],
          ['Avis débit / valeur de référence', d.avis_debit, true], ['Avis captage', d.avis_captage, true]
        ] },
        { titre: 'Traitement de l’air capté (recyclage : au plus 0,1 mg/m³ en aval de l’épurateur)', rows: [
          ['Devenir de l’air capté', d.traitement],
          d.traitement && d.traitement !== FC_TRAITEMENTS[0] ? ['Concentration en aval de l’épurateur', H.u(d.conc_aval, 'mg/m³')] : null,
          ['Avis traitement', d.avis_traitement, true]
        ] },
        { titre: 'Atmosphère de l’atelier (objectif ED 972 : 0,5 mg/m³, fraction inhalable)', rows: [
          ['Brouillard d’huile dans l’atelier', d.brouillard], ['Concentration en aérosol (fraction inhalable)', H.u(d.conc_atelier, 'mg/m³')],
          ['Mesure représentative d’une moyenne sur 8 h', d.mesure_8h], ['Avis atmosphère', d.avis_atelier, true]
        ] }
      ];
    }, 'Avis par rapport aux valeurs recommandées par le guide INRS ED 972 (captage et traitement des aérosols de fluides de coupe) :');
}

function pdfBuildAnnexePosteSolvant(list, logo) {
  var H = pdfLsHelpers();
  return pdfBuildFicheSections('Poste manuel aux solvants', 'POSTE D’UTILISATION MANUELLE DE SOLVANTS', logo, list,
    function (d) { return [['Bâtiment', d.batiment, true], ['Atelier', d.localisation], ['Poste', d.reference_equipement, true], ['Solvant(s)', d.solvant], ['Date du contrôle', d.date_controle]]; },
    function (d) {
      var bac = d.type_dispositif === PS_DISPOSITIFS[3], table = d.type_dispositif === PS_DISPOSITIFS[2];
      return [
        { titre: 'Captage (guide INRS ED 6049)', rows: [
          ['Dispositif de captage', d.type_dispositif],
          bac ? null : ['Vitesse moyenne aux ouvertures', H.u(d.vitesse_moyenne, 'm/s')],
          table ? ['Vitesse la plus faible sur l’ouverture (aucun point sous 0,4 m/s)', H.u(d.vitesse_minimale, 'm/s')] : null,
          bac ? ['Vitesse au point le plus éloigné des fentes', H.u(d.vitesse_point_eloigne, 'm/s')] : null,
          ['Valeur recommandée', H.u(d.valeur_recommandee, 'm/s')], ['Avis vitesse / valeur recommandée', d.avis_vitesse, true],
          ['Débit d’air extrait mesuré', H.u(d.debit_mesure, 'm³/h')], ['Débit de référence', H.u(d.debit_reference, 'm³/h')],
          ['Avis débit / valeur de référence', d.avis_debit, true, true], ['Test fumigène', d.test_fumigene]
        ] }
      ];
    }, 'Avis par rapport aux valeurs recommandées par le guide INRS ED 6049 (poste d’utilisation manuelle de solvants) :');
}

// ————————————————————————————————————————————
// Enregistrement auprès de l'appli
// ————————————————————————————————————————————

(function registerCaptagesInrs() {
  var at = INSTALLATION_TYPES.findIndex(function (t) { return t.id === 'recyclage'; });
  if (at === -1) at = INSTALLATION_TYPES.findIndex(function (t) { return t.id === 'installations_diverses'; });
  INSTALLATION_TYPES.splice(at + 1, 0, TYPE_FLUIDE_COUPE, TYPE_POSTE_SOLVANT, TYPE_DECAPAGE);

  CALC_RULES.decapage = CALC_DECAPAGE;
  CALC_RULES.fluide_coupe = CALC_FLUIDE_COUPE;
  CALC_RULES.poste_solvant = CALC_POSTE_SOLVANT;

  if (typeof WIZARD_STEPS !== 'undefined') {
    WIZARD_STEPS.decapage = [
      { title: 'Identification', fields: ['batiment', 'localisation', 'reference_equipement', 'date_controle', 'photo', 'type_installation'] },
      { title: 'Cabine — dimensions', fields: ['deplacement_air', 'longueur', 'largeur', 'hauteur', 'section_ventilee', 'debit_minimal'] },
      { title: 'Cabine — débits', fields: ['debit_extrait', 'avis_debit', 'grande_cabine', 'operations_tres_polluantes', 'debit_introduit', 'taux_renouvellement', 'avis_taux'] },
      { title: 'Caisson — ouvertures', fields: ['vitesse_ouvertures', 'avis_ouvertures'] },
      { title: 'Réseau & dépoussiérage', fields: ['vitesse_conduit', 'avis_conduit', 'etat_depoussiereur', 'rejet'] },
      { title: 'Conclusion', fields: ['avis', 'observation'] }
    ];
    WIZARD_STEPS.fluide_coupe = [
      { title: 'Identification', fields: ['batiment', 'localisation', 'reference_machine', 'date_controle', 'photo', 'type_fluide'] },
      { title: 'Captage', fields: ['type_captage', 'depression_capot', 'avis_capot', 'ouverture_capot', 'debit_mesure', 'debit_reference', 'avis_debit', 'avis_captage'] },
      { title: 'Traitement de l’air', fields: ['traitement', 'conc_aval', 'avis_traitement'] },
      { title: 'Atmosphère de l’atelier', fields: ['brouillard', 'conc_atelier', 'mesure_8h', 'avis_atelier'] },
      { title: 'Conclusion', fields: ['avis', 'observation'] }
    ];
    WIZARD_STEPS.poste_solvant = [
      { title: 'Identification', fields: ['batiment', 'localisation', 'reference_equipement', 'solvant', 'date_controle', 'photo'] },
      { title: 'Captage', fields: ['type_dispositif', 'vitesse_moyenne', 'vitesse_minimale', 'vitesse_point_eloigne', 'valeur_recommandee', 'avis_vitesse'] },
      { title: 'Débit & test fumigène', fields: ['debit_mesure', 'debit_reference', 'avis_debit', 'test_fumigene'] },
      { title: 'Conclusion', fields: ['avis', 'observation'] }
    ];
  }
  if (typeof DUPLICATION_EXTRA_KEEP_STEPS !== 'undefined') {
    DUPLICATION_EXTRA_KEEP_STEPS.decapage = ['Cabine — dimensions'];
    DUPLICATION_EXTRA_KEEP_STEPS.fluide_coupe = [];
    DUPLICATION_EXTRA_KEEP_STEPS.poste_solvant = [];
  }

  if (typeof SECTION_GROUPS !== 'undefined') {
    // Fluides de coupe et postes aux solvants : captage localisé, même section que les équipements divers
    var cl = SECTION_GROUPS.find(function (g) { return g.key === 'captage_localise'; });
    if (cl) cl.types.push('fluide_coupe', 'poste_solvant');
    var gi = SECTION_GROUPS.findIndex(function (g) { return g.key === 'cabines_peinture'; });
    SECTION_GROUPS.splice(gi + 1, 0, { key: 'decapage', titre: 'Décapage au jet libre', sommaireTitre: 'DECAPAGE, DESABLAGE, GRENAILLAGE AU JET LIBRE', types: ['decapage'],
      images: ['assets/report/divider-installations-diverses.png'], divTitres: ['DECAPAGE AU JET LIBRE'], divPhotos: [{ x: 78, y: 260, w: 338, h: 270 }],
      divNote: { x: 60, y: 600, w: 380, lines: ['REFERENTIEL', '', 'Guide INRS ED 768 — Guide pratique de ventilation n° 14', 'Décapage, désablage, dépolissage au jet libre en cabine'] } });
  }
  if (typeof SYNTHESE_CONFIG !== 'undefined') {
    SYNTHESE_CONFIG.decapage = { titre: 'Conclusion sur les installations de décapage au jet libre', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Cabine ou caisson', col3: 'type_installation', col3Label: 'Type', avis: 'avis', commentaire: 'observation' };
    SYNTHESE_CONFIG.fluide_coupe = { titre: 'Conclusion sur les machines-outils (fluides de coupe)', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_machine', col2Label: 'Machine', col3: 'type_captage', col3Label: 'Captage', avis: 'avis', commentaire: 'observation' };
    SYNTHESE_CONFIG.poste_solvant = { titre: 'Conclusion sur les postes manuels aux solvants', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Poste', col3: 'type_dispositif', col3Label: 'Dispositif', avis: 'avis', commentaire: 'observation' };
  }
  if (typeof ED_REFERENCE !== 'undefined') {
    ED_REFERENCE.decapage = { badge: 'ED 768', status: 'ok', note: 'Guide pratique de ventilation n° 14 : 400 m³/h par m² (flux vertical) ou 1 000 m³/h par m² (flux horizontal) ; grandes cabines > 80 vol/h (120 si très polluant) ; caisson : 3 m/s aux ouvertures ; conduits ≥ 20 m/s.' };
    ED_REFERENCE.fluide_coupe = { badge: 'ED 972', status: 'ok', note: 'Guide pratique de ventilation n° 6 : captage enveloppant (dépression de l’ordre de 20 à 50 Pa) ; objectif 0,5 mg/m³ dans l’air inhalé ; recyclage : ≤ 0,1 mg/m³ en aval de l’épurateur.' };
    ED_REFERENCE.poste_solvant = { badge: 'ED 6049', status: 'ok', note: 'Guide pratique de ventilation n° 20 : enceinte 0,5 m/s (0,65 m/s si ouvertures > 10 cm) ; dosseret 0,5 m/s, aucun point sous 0,4 m/s ; bac à fentes 0,25 m/s au point le plus éloigné.' };
  }
  if (typeof DVR_CONFIG !== 'undefined') {
    DVR_CONFIG.decapage = { cat: 'sp', polluant: 'Poussières d’abrasif et de revêtement décapé', lignes: [
      { label: 'Débit d’air extrait de la cabine', mesure: 'debit_extrait', mini: 'debit_minimal', miniLabel: 'Valeur recommandée (ED 768)', avis: 'avis_debit', unit: 'm³/h' },
      { label: 'Vitesse dans les ouvertures du caisson', mesure: 'vitesse_ouvertures', avis: 'avis_ouvertures', unit: 'm/s' },
      { label: 'Vitesse dans le conduit d’extraction', mesure: 'vitesse_conduit', role: 'point', unit: 'm/s' }
    ] };
    DVR_CONFIG.fluide_coupe = { cat: 'sp', polluant: 'Aérosols de fluide de coupe', lignes: [
      { label: 'Débit d’air extrait de la machine', mesure: 'debit_mesure', role: 'point', unit: 'm³/h', ref: 'debit_reference' },
      { label: 'Dépression dans le capot', mesure: 'depression_capot', avis: 'avis_capot', unit: 'Pa' }
    ] };
    DVR_CONFIG.poste_solvant = { cat: 'sp', polluant: 'Vapeurs de solvants', lignes: [
      { label: 'Vitesse moyenne aux ouvertures', mesure: 'vitesse_moyenne', mini: 'valeur_recommandee', miniLabel: 'Valeur recommandée (ED 6049)', avis: 'avis_vitesse', unit: 'm/s' },
      { label: 'Débit d’air extrait', mesure: 'debit_mesure', role: 'point', unit: 'm³/h', ref: 'debit_reference' }
    ] };
  }
  if (typeof PDF_ANNEXES_FIDELES !== 'undefined') {
    PDF_ANNEXES_FIDELES.decapage = function (list) { return pdfBuildAnnexeDecapage(list, PDF_ASSETS.logo); };
    PDF_ANNEXES_FIDELES.fluide_coupe = function (list) { return pdfBuildAnnexeFluideCoupe(list, PDF_ASSETS.logo); };
    PDF_ANNEXES_FIDELES.poste_solvant = function (list) { return pdfBuildAnnexePosteSolvant(list, PDF_ASSETS.logo); };
  }
})();

console.log('✓ Captages INRS (décapage, fluides de coupe, solvants) chargés');
