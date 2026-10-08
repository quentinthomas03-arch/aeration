// ou-mesurer.js - « Où et comment mesurer ? » : schéma explicatif à l'étape de mesure (2026-10-08)
//
// Un bouton en haut de l'étape ouvre un schéma tracé avec les dimensions déjà saisies (exemple
// signalé tant qu'elles manquent) et quelques consignes. Aucune saisie en plus. Chaque consigne vient
// d'un guide INRS rangé dans « GUIDES PAR INSTALLATIONS/ » (source affichée sous les consignes) ; ce
// qui décrit un calcul de l'appli est dit comme tel.
//  - sorbonne : ED 795, annexe Méthodes d'essai, § 2.1 et 2.2 — points à 100 mm des bords (calcul
//    de l'appli, repris du Rapso).
//  - hotte : ED 695, § 3.2.1 (principe III) et § 10.3.2.
//  - bras : ED 668, § 4.1 et 4.7.
//  - conduit : ED 695, § 10.3.1 (20 D / 5 D) ; machines à bois : ED 750, § 4.2 (5 D / 3 D, trous de
//    8 à 10 mm) ; décapage : ED 768, § 5.1 (NF X 10-112, au moins 2 diamètres).
//  - cabine de peinture : ED 839, § 10.3 (liquide) et ED 928, § 10.3 (poudre) — positions des points
//    calculées d'après ces règles et les dimensions saisies.
//  - cuve de traitement de surface : ED 651, § 2.3 et « Contrôle d'un système de ventilation » (renvoi
//    au guide n° 0), ED 695, § 10.3.2.
//  - torche aspirante : ED 668, § 4.2 et dossier technique 2 (mesure dans un conduit lisse).
//  - point d'émission (installations diverses) : ED 695, dispositifs inducteurs et tableau XIII.
//  - bouche ou grille (bureaux, ERP, sanitaires, locaux fumeurs, local spécifique, locaux de charge,
//    CTA et menuiserie mesurées sur la grille) : ED 695, définitions et § 10.3.2.
//  - décapage : ED 768, § 4.3, 4.7.1, 5.1 et 6.1 ; fluide de coupe : ED 972, § 7.1.1 et 8.4 ; poste
//    aux solvants : ED 6049, § 5.1, 5.2 et 5.4.

var OM_BLEU = '#0082DE', OM_ROUGE = '#E5484D', OM_GRIS = '#94A3B8';
var OM_TYPES_BOIS = ['menuiserie', 'menuiserie_bis'];

// ————————————————————————————————————————————
// Contenu des fiches : { titre, consignes, source } (d = données de l'installation)
// ————————————————————————————————————————————

var OM_FICHES = {
  sorbonne: {
    titre: 'Sorbonne : où et comment mesurer',
    consignes: [
      'Guillotine réglée à l’ouverture de travail : 500 mm, ou sa valeur maximale si elle est inférieure.',
      'Sonde dans le plan de l’ouverture : seule la vitesse horizontale, perpendiculaire à la façade, compte.',
      'En chaque point, la norme prévoit au moins 60 s de relevé (une valeur par seconde au moins) : garder la moyenne.',
      'Anémomètre thermique à petite sonde directionnelle (exigé pour la réception ; micromoulinet exclu).',
      'Sorbonne encombrée : décrire l’encombrement ; s’il nuit à la sorbonne, mesurer après rangement.',
      'Fumigène dirigé vers le plafond, dans les conditions habituelles de travail (sorbonnes voisines, portes, ventilation du local notées).'
    ],
    source: 'INRS ED 795, annexe Méthodes d’essai, § 2.1 et 2.2 (NF EN 14175-3)'
  },
  hotte: {
    titre: 'Hotte : où et comment mesurer',
    consignes: [
      'Mesurer dans le plan d’ouverture de la hotte, aux points d’un quadrillage régulier : un point au centre de chaque case.',
      'Le type de bouche, une grille ou des fentes, l’anémomètre et sa distance à l’ouverture changent la lecture (erreur pouvant dépasser 50 %) : sonde toujours dans le même plan, d’une visite à l’autre.',
      'L’air propre va de l’opérateur vers la source puis vers la hotte : l’opérateur ne doit jamais être entre la source et le captage.'
    ],
    source: 'INRS ED 695, § 3.2.1 (principe III) et § 10.3.2'
  },
  bras: {
    titre: 'Bras d’aspiration : où et comment mesurer',
    consignes: [
      'Vitesse moyenne lue à la bouche : l’appli en déduit le débit (surface de la bouche × vitesse).',
      'Distance d’utilisation : du centre de la bouche au point d’émission, bras placé là où l’opérateur le met vraiment pour travailler.',
      'Mesurer dans les conditions réelles de travail, le dispositif de captage en place.',
      'Au-delà de la distance maximum calculée, la vitesse au point d’émission n’atteint plus la vitesse de captage : l’efficacité chute vite (à 1 000 m³/h, en général au-delà de 20 cm).'
    ],
    source: 'INRS ED 668, § 4.1 et 4.7'
  },
  conduit: function (d, typeId) {
    if (OM_TYPES_BOIS.indexOf(typeId) >= 0) return {
      titre: 'Conduit d’aspiration (bois) : où et comment mesurer',
      consignes: [
        'Au voisinage de la section de mesure, l’écoulement doit être parallèle à l’axe du conduit : au moins 5 diamètres de longueur droite avant la section et 3 après (un tronçon droit de 8 diamètres suffit).',
        'Prises de mesure : trous de 8 à 10 mm selon le diamètre du conduit.',
        'Débit extrait de chaque machine mesuré dans des conditions de fonctionnement notées (taux d’utilisation, machines les plus polluantes en marche) : renseigner les simultanéités.',
        'Explorer un ou deux diamètres ; en saisie point par point, positions des points sous la grille.'
      ],
      source: 'INRS ED 750, § 4.2 (réseaux de transport, prises de mesure) et dossier de valeurs de référence'
    };
    var c = {
      titre: 'Conduit : où et comment mesurer',
      consignes: [
        'Idéalement, plus de 20 diamètres de longueur droite avant le point de mesure et plus de 5 après, sans coude, registre ni piquage. Sinon, mesurer le plus loin possible de la singularité (les puces « distance » des conditions de mesure, quand elles sont là, donnent le nombre de points).',
        'Explorer un ou deux diamètres ; en saisie point par point, positions des points sous la grille.',
        'Trou net, sans bavure ; sonde de diamètre inférieur à D/50 ; tube de Pitot parallèle à l’axe du conduit.',
        'Tube de Pitot : de préférence au-dessus de 4 m/s de vitesse moyenne (en dessous, l’erreur devient trop grande).',
        'Écoulement peu fluctuant et sans giration.'
      ],
      source: 'INRS ED 695, § 10.3.1'
    };
    if (typeId === 'decapage') {
      c.consignes.push('Méthode normalisée (NF X 10-112) : pressions dynamiques en plusieurs points d’au moins 2 diamètres. Une mesure simplifiée en un point peut se tromper de 25 à 30 % si elle n’a pas été calée sur la méthode normalisée à la réception.');
      c.source += ' ; ED 768, § 5.1';
    }
    return c;
  },
  cabine: function (d) {
    var p = omCabineCas(d), c = { titre: 'Cabine de peinture : où et comment mesurer' };
    var appareil = 'Anémomètre directionnel lisant de 0,10 à 1 m/s à ± 0,05 m/s ; en chaque point, moyenne sur 60 s, sur 200 s si la ventilation est instable.';
    if (p.vehicule) {
      c.consignes = [p.camion
        ? 'Véhicule long : points répartis autour du camion, à 0,50 m de ses parois et à 1,50 m du sol ; 2 points à l’avant, 2 à l’arrière ; sur les côtés, 1,50 à 2 m entre les points.'
        : 'Véhicule de tourisme : 10 points autour de la voiture (3 par côté, 2 à l’avant, 2 à l’arrière), à 0,50 m de ses parois et à 0,90 m du sol.',
        'Si la cabine est aussi mesurée vide : points à 0,90 m du sol, à 0,50 m au moins des parois, ' + (p.camion ? '2 m' : '1,50 m') + ' au plus entre deux points.',
        appareil, 'Critère du guide : moyenne d’au moins 0,40 m/s, aucun point sous 0,30 m/s.'];
      c.source = 'INRS ED 839, § 10.3 et 10.3.1' + (p.camion ? ' (écart de 2 m en cabine vide : règle du Rapso)' : '');
      return c;
    }
    if (p.fosse) {
      c.consignes = ['Points sur une ligne le long de la fosse, à 1 m de son fond (exemple du guide), 1,50 m au plus entre deux points (Rapso).',
        'En chaque point, moyenne sur 60 s.', appareil];
      c.source = 'INRS ED 906, dossier technique (mesures dans la fosse) ; ED 839, § 10.3';
      return c;
    }
    if (p.vertical && !p.poudre) {
      c.consignes = ['Cabine vide. Points à 0,90 m du sol de la cabine, jamais à moins de 0,50 m des parois.',
        'Quadrillage établi à partir du centre du sol de la cabine, ' + (p.pas === 2 ? '2 m au plus entre deux points pour une cabine d’encombrant (règle du Rapso ; 1,50 m dans le guide).' : '1,50 m au plus entre deux points.'),
        'Cabine pour véhicules de tourisme : 10 points autour du véhicule (3 par côté, 2 à l’avant, 2 à l’arrière), à 0,50 m de ses parois et 0,90 m du sol. Véhicules longs : à 1,50 m du sol, 1,50 à 2 m entre les points sur les côtés.',
        appareil, 'Critère du guide : aucun point sous 0,30 m/s (véhicules : moyenne d’au moins 0,40 m/s).'];
      c.source = 'INRS ED 839, § 10.3 et 10.3.1';
    } else if (p.vertical) {
      c.consignes = ['Cabine vide. Points à 1 m du sol, en excluant une bande de 0,25 m le long des parois.',
        'Surface restante divisée en rectangles égaux de 1 à 2,25 m² ; un point au centre de chacun, l’écart entre deux points le plus proche possible de 1,50 m sans l’atteindre ; au moins 2 points en largeur et 2 en longueur.',
        appareil, 'Critère du guide : flux homogène descendant, toutes les mesures au-dessus de 0,30 m/s.'];
      c.source = 'INRS ED 928, § 10.3 et 10.3.1';
    } else if (p.poudre && p.ouverte) {
      c.consignes = ['Mesurer dans le plan de l’ouverture où travaille le peintre.',
        'Un point au centre de rectangles de moins de 0,60 m de côté, régulièrement répartis dans l’ouverture.',
        appareil, 'Critère du guide : flux homogène entrant, toutes les mesures au-dessus de 0,50 m/s.'];
      c.source = 'INRS ED 928, § 10.3 et 10.3.3';
    } else {
      c.consignes = ['Cabine vide. Au moins 9 points régulièrement répartis dans la section de la cabine : 3 en hauteur, 3 en largeur.',
        'Plan de mesure : celui où évolue le peintre s’il travaille dans la cabine, le plan d’ouverture s’il travaille devant.',
        appareil, p.poudre ? 'Critère du guide : flux homogène, toutes les mesures au-dessus de 0,50 m/s.'
          : 'Critère du guide : moyenne d’au moins 0,5 m/s, aucun point sous 0,4 m/s.'];
      c.source = p.poudre ? 'INRS ED 928, § 10.3 et 10.3.2' : 'INRS ED 839, § 10.3 et 10.3.2';
    }
    return c;
  },
  cuve: {
    titre: 'Cuve de traitement de surface : où et comment mesurer',
    consignes: [
      'Mesure dans les fentes : relever la vitesse en plusieurs points répartis sur toute la longueur de chaque fente, sonde dans le plan de la fente. Une mauvaise répartition du débit le long de la fente est une cause fréquente de mauvais fonctionnement.',
      'Vitesse moyenne = moyenne arithmétique des points ; une grille, des fentes, l’anémomètre et sa distance à l’ouverture changent la lecture (erreur pouvant dépasser 50 %).',
      'L’appli calcule le débit : surface totale des fentes × vitesse moyenne.',
      'Pour les méthodes de contrôle, le guide des cuves renvoie au guide de ventilation n° 0 (ED 695) : mesure dans le conduit si les longueurs droites le permettent.'
    ],
    source: 'INRS ED 651, § 2.3 et « Contrôle d’un système de ventilation » ; ED 695, § 10.3.2'
  },
  torche: {
    titre: 'Torche aspirante : où et comment mesurer',
    consignes: [
      'Vitesse lue au centre du tube, sonde dans l’axe : l’appli en déduit le débit (0,89 × vitesse au centre × section du tube, calcul repris du Rapso).',
      'Exemple du guide : mesure dans un tronçon de conduit lisse placé entre le flexible raccordé à la torche et l’aspiration.',
      'Débit attendu : plus de 100 m³/h par torche.',
      'Distance L : de l’orifice d’aspiration de la torche au point de soudage ; l’appli en déduit la vitesse au point d’émission.',
      'Mesurer dans des conditions représentatives de l’activité.'
    ],
    source: 'INRS ED 668, § 4.2 et dossier technique 2'
  },
  emission: {
    titre: 'Vitesse au point d’émission : où mesurer',
    consignes: [
      'Mesurer au point d’émission le plus éloigné du dispositif de captage : la vitesse y doit atteindre la valeur minimale (tableau III).',
      'Mesure directe à l’anémomètre.',
      'Noter les courants d’air perturbateurs : ils imposent une vitesse de captage plus élevée.',
      'L’opérateur ne doit jamais être entre la source et le captage.'
    ],
    source: 'INRS ED 695, dispositifs inducteurs (tableau III), tableau XIII et § 3.2.1 (principe III)'
  },
  bouche: {
    titre: 'Bouche ou grille : où et comment mesurer',
    consignes: [
      'Au cône : le cône couvre toute la bouche ; débit = coefficient du cône × vitesse lue (calcul de l’appli).',
      'À l’anémomètre : quadrillage de la bouche, vitesse moyenne = moyenne arithmétique des points ; l’appli multiplie par la surface.',
      'Dimensions de la bouche : section totale, mesurée à l’intérieur du cadre.',
      'Tenir compte du type de bouche (extraction ou soufflage), des grilles ou fentes, de l’anémomètre et de sa distance à la bouche : sans ces précautions, l’erreur sur le débit peut dépasser 50 %.'
    ],
    source: 'INRS ED 695, définitions et § 10.3.2'
  },
  decapage: function (d) {
    if (d.type_installation === DEC_CAISSON) return {
      titre: 'Caisson de grenaillage : où et comment mesurer',
      consignes: [
        'Vitesse moyenne de l’air dans les ouvertures (manchons) : au moins 3 m/s, pour que les plus fines particules ne sortent pas.',
        'Caisson maintenu en forte dépression pendant toute la durée du traitement : mesurer en fonctionnement.',
        'Conduit d’extraction : au moins 20 m/s pour éviter les dépôts.'
      ],
      source: 'INRS ED 768, § 4.7.1 et 6.1'
    };
    return {
      titre: 'Cabine de décapage : où et comment mesurer',
      consignes: [
        'Section à ventiler : longueur × largeur si l’air se déplace verticalement dans la zone de travail ; largeur × hauteur s’il se déplace horizontalement.',
        'Avant toute mesure : fumigène en grande quantité et chronomètre. Le retour à l’atmosphère initiale prend environ 3 à 4 fois t = V/Q (V volume, Q débit) : ordre de grandeur du débit.',
        'Débit : de préférence par exploration du champ des vitesses au tube de Pitot sur au moins 2 diamètres du conduit (NF X 10-112). Une mesure simplifiée en un point peut se tromper de 25 à 30 % si elle n’a pas été calée à la réception.'
      ],
      source: 'INRS ED 768, § 4.3 et 5.1'
    };
  },
  fluide: {
    titre: 'Machine-outil capotée : où et comment mesurer',
    consignes: [
      'Dépression dans le capot : prise de pression sur le capot, mesurée machine arrêtée (pour éviter les projections).',
      'Vitesses dans les ouvertures du capot : mesurées machine en fonctionnement.',
      'Débit : pressions statiques ou vitesses dans les conduits ; à défaut, vitesses dans les ouvertures.'
    ],
    source: 'INRS ED 972, § 7.1.1 (tableau I) et 8.4'
  },
  solvant: function (d) {
    var t = d.type_dispositif || '';
    if (t === PS_DISPOSITIFS[2]) return {
      titre: 'Table aspirante / dosseret : où et comment mesurer',
      consignes: ['Vitesse moyenne au droit de l’ouverture : relever plusieurs points répartis sur toute l’ouverture.',
        'Le flux doit être homogène, sans point sous 0,4 m/s : noter la vitesse la plus faible.',
        'Protocole de mesure : celui des cabines d’application de peinture liquide (ED 839, § 10.3).'],
      source: 'INRS ED 6049, § 5.2'
    };
    if (t === PS_DISPOSITIFS[3]) return {
      titre: 'Bac à fentes d’aspiration : où et comment mesurer',
      consignes: ['Vitesse au point de la surface émissive le plus éloigné des fentes : par exemple au milieu du bac s’il est rectangulaire.',
        'Vérifier aussi la répartition le long de chaque fente (plusieurs points sur sa longueur).'],
      source: 'INRS ED 6049, § 5.4'
    };
    return {
      titre: 'Enceinte ventilée : où et comment mesurer',
      consignes: ['Les ouvertures sont les espaces libres entre la cuve et le couvercle : y mesurer la vitesse moyenne.',
        'Largeur moyenne des ouvertures e : 10 cm au plus, au moins 0,5 m/s ; plus de 10 cm, au moins 0,65 m/s.',
        'Débit = surface totale des ouvertures × vitesse moyenne.'],
      source: 'INRS ED 6049, § 5.1'
    };
  }
};

function omContenu(k, d, typeId) {
  var f = OM_FICHES[k];
  return typeof f === 'function' ? f(d, typeId) : f;
}

// ————————————————————————————————————————————
// Fiches proposées sur l'étape affichée : [{ k, pre }] (pre = préfixe des champs du conduit ou de la grille)
// ————————————————————————————————————————————

function omFichesEtape(typeId, steps, step, inst) {
  if (!steps || !steps[step]) return [];
  var d = inst.data;
  var keys = gwStepFields(typeId, steps[step]).filter(function (f) { return !f.showIf || evalShowIf(f.showIf, d); })
    .map(function (f) { return f.key; });
  var a = function (k) { return keys.indexOf(k) >= 0; }, out = [];
  var ajoute = function (k, pre) { if (!out.some(function (o) { return o.k === k; })) out.push({ k: k, pre: pre || '' }); };
  if (typeId === 'sorbonnes' && (a('grille') || a('perturbations'))) ajoute('sorbonne');
  if (typeId === 'hottes' && a('vpe_grid')) ajoute('hotte');
  if (typeId === 'bras_aspiration' && (a('vitesse_moyenne') || a('test_fumigene'))) ajoute('bras');
  if (typeId === 'cabines_peinture' && (a('vitesse_grid') || a('largeur_cabine'))) ajoute('cabine');
  if (typeId === 'tts' && a('vitesse_fentes')) ajoute('cuve');
  if (typeId === 'installations_diverses' && a('vpe_mesuree')) ajoute('emission');
  if (typeId === 'decapage' && (a('longueur') || a('debit_extrait') || a('vitesse_ouvertures'))) ajoute('decapage');
  if (typeId === 'fluide_coupe' && a('depression_capot')) ajoute('fluide');
  if (typeId === 'poste_solvant' && a('type_dispositif') && d.type_dispositif) ajoute('solvant');
  keys.forEach(function (k) {
    var m = /^(torche\d+_)vitesse_centre$/.exec(k);
    if (m) ajoute('torche', m[1]);
    m = /^(grille\d+_)largeur$/.exec(k);
    if (m && typeId === 'locaux_charge') ajoute('bouche', m[1]);
  });
  if (typeof AM_BOUCHES !== 'undefined' && AM_BOUCHES[typeId] && AM_BOUCHES[typeId].some(a)) ajoute('bouche');
  // Conduits : « Saisie de la vitesse », vitesse de transport, réseaux de la CTA, conduit du décapage
  var grilleSurface = (typeId === 'cta' || typeId === 'menuiserie') && /grille/i.test(d.mesure_debit || d.mesure_localisation || '');
  keys.forEach(function (k) {
    var m = /^(.*)vitesse_mode$/.exec(k) || (typeId === 'cta' && /^((?:neuf|souf|rep)_)vitesse$/.exec(k));
    if (m && typeId !== 'cabines_peinture') ajoute(grilleSurface ? 'bouche' : 'conduit', m[1]);
  });
  if (a('vt_mesuree') || (typeId === 'decapage' && a('vitesse_conduit'))) ajoute('conduit');
  return out;
}

var OM_COURT = { sorbonne: 'sorbonne', hotte: 'hotte', bras: 'bras', conduit: 'conduit', cabine: 'cabine', cuve: 'fentes',
  torche: 'torche', emission: 'point d’émission', bouche: 'bouche', decapage: 'cabine', fluide: 'capot', solvant: 'poste' };

function omBoutonsHtml(typeId, fiches) {
  if (!fiches.length) return '';
  return '<div class="om-btns">' + fiches.map(function (o) {
    return '<button type="button" class="om-btn" onclick="omOuvrir(\'' + typeId + '\',\'' + o.k + '\',\'' + escapeHtml(o.pre || '') + '\');">' + OM_ICONE +
      ' Où et comment mesurer ?' + (fiches.length > 1 ? ' (' + OM_COURT[o.k] + ')' : '') + '</button>';
  }).join('') + '</div>';
}

function ouMesurerHtml(typeId, steps, step, inst) {
  var fiches = omFichesEtape(typeId, steps, step, inst);
  var h = omBoutonsHtml(typeId, fiches);
  if (fiches.some(function (o) { return o.k === 'cabine'; })) h += omCabineGrilleBoutonHtml(inst.data);
  return h;
}

// ————————————————————————————————————————————
// Cabine de peinture : la grille de saisie prend en un toucher le nombre de points du protocole
// ————————————————————————————————————————————

// { axes, points } du protocole d'après les dimensions saisies, ou null (dimensions manquantes, cas
// sans règle complète — cabine ouverte en poudre : hauteur inconnue — ou plus de points que la grille)
function omCabineGrilleProtocole(d) {
  var p = omCabineCas(d), l = num(d.largeur_cabine), L = num(d.longueur_cabine), g;
  if (p.fosse) {
    if (!(L > 0)) return null;
    g = { axes: 1, points: omCabinePositions(L, false, 1.5).length };
  } else if (p.vertical) {
    if (!(l > 0 && L > 0)) return null;
    g = { axes: omCabinePositions(L, p.poudre, p.pas).length, points: omCabinePositions(l, p.poudre, p.pas).length };
  } else {
    if (p.poudre && p.ouverte) return null;
    g = { axes: 3, points: 3 }; // 9 points au minimum : 3 en hauteur, 3 en largeur
  }
  return g.axes <= GRID_MAX && g.points <= GRID_MAX ? g : null;
}

function omCabineGrilleBoutonHtml(d) {
  var g = omCabineGrilleProtocole(d);
  var a = parseInt(d.vitesse_nb_axes, 10), p = parseInt(d.vitesse_nb_points, 10);
  // Grille déjà au protocole, dans un sens ou dans l'autre (axes en largeur ou en longueur) : rien à proposer
  if (!g || (a === g.axes && p === g.points) || (a === g.points && p === g.axes)) return '';
  return '<div class="om-btns"><button type="button" class="om-btn" onclick="omCabineAppliquerGrille();">' + ICONS.check +
    ' Grille du protocole : ' + g.axes + ' axes × ' + g.points + ' points</button></div>';
}

function omCabineAppliquerGrille() {
  var inst = getCurrentInstallation('cabines_peinture'), g = inst && omCabineGrilleProtocole(inst.data);
  if (!g) return;
  var d = inst.data, deja = Array.isArray(d.vitesse_grid) && d.vitesse_grid.some(function (r) { return Array.isArray(r) && r.some(function (c) { return String(c || '').trim(); }); });
  if (deja && !confirm('Des vitesses sont déjà saisies dans la grille. Passer à ' + g.axes + ' axes × ' + g.points + ' points ?')) return;
  d.vitesse_nb_axes = String(g.axes);
  updateInstallationField('cabines_peinture', 'vitesse_nb_points', String(g.points));
}

// ————————————————————————————————————————————
// Cabine de peinture : valeur recommandée du Rapso en un toucher
// ————————————————————————————————————————————

// Feuille LISTE du Rapso V29, plage Criteres_CDP_1_10 (lue le 2026-10-08) : critère → [V moyenne, V minimale]
// avec le véhicule ou l'encombrant, puis [V moyenne, V minimale] cabine vide. '' = sans objet, '/' = pas de valeur.
var OM_CDP_CRITERES = {
  '/CDP Voiture/Norme 16985/subjectiles industriels divers/': ['0,3', '0,25', '0,3', '0,25'],
  '/CDP Voiture/Norme 16985/véhicules/': ['0,3', '0,25', '', ''],
  '/CDP Voiture/Guide INRS/subjectiles industriels divers/': ['0,4', '0,3', '/', '0,3'],
  '/CDP Voiture/Guide INRS/véhicules/': ['0,4', '0,3', '', ''],
  '/CDP Camion/Norme 16985/subjectiles industriels divers/': ['0,3', '0,25', '0,3', '0,25'],
  '/CDP Camion/Norme 16985/véhicules/': ['0,3', '0,25', '', ''],
  '/CDP Camion/Guide INRS/subjectiles industriels divers/': ['0,4', '0,3', '/', '0,3'],
  '/CDP Camion/Guide INRS/véhicules/': ['0,4', '0,3', '', ''],
  '/CDP Ouverte/Norme 16985/Horizontale/Intérieure/Liquide/': ['', '', '0,5', '0,4'],
  '/CDP Ouverte/Norme 16985/Horizontale/Intérieure/Poudre/': ['', '', '0,5', '0,4'],
  '/CDP Ouverte/Norme 16985/Horizontale/Extérieure/Liquide/': ['', '', '0,5', '0,4'],
  '/CDP Ouverte/Norme 16985/Horizontale/Extérieure/Poudre/': ['', '', '0,5', '0,4'],
  '/CDP Ouverte/Norme 16985/Verticale/Intérieure/Liquide/': ['', '', '0,3', '0,25'],
  '/CDP Ouverte/Norme 16985/Verticale/Intérieure/Poudre/': ['', '', '0,3', '0,25'],
  '/CDP Ouverte/Norme 16985/Verticale/Extérieure/Liquide/': ['', '', '0,4', '0,3'],
  '/CDP Ouverte/Norme 16985/Verticale/Extérieure/Poudre/': ['', '', '0,4', '0,3'],
  '/CDP Ouverte/Guide INRS/Horizontale/Intérieure/Liquide/': ['', '', '0,5', '0,4'],
  '/CDP Ouverte/Guide INRS/Horizontale/Intérieure/Poudre/': ['', '', '/', '0,5'],
  '/CDP Ouverte/Guide INRS/Horizontale/Extérieure/Liquide/': ['', '', '0,5', '0,4'],
  '/CDP Ouverte/Guide INRS/Horizontale/Extérieure/Poudre/': ['', '', '/', '0,5'],
  '/CDP Ouverte/Guide INRS/Verticale/Intérieure/Liquide/': ['', '', '/', '0,3'],
  '/CDP Ouverte/Guide INRS/Verticale/Intérieure/Poudre/': ['', '', '/', '0,3'],
  '/CDP Ouverte/Guide INRS/Verticale/Extérieure/Liquide/': ['', '', '/', '0,5'],
  '/CDP Ouverte/Guide INRS/Verticale/Extérieure/Poudre/': ['', '', '/', '0,5'],
  '/CDP Fermee/Norme 16985/Horizontale/Liquide/': ['', '', '0,5', '0,4'],
  '/CDP Fermee/Norme 16985/Horizontale/Poudre/': ['', '', '0,5', '0,4'],
  '/CDP Fermee/Norme 16985/Verticale/Liquide/': ['', '', '0,3', '0,25'],
  '/CDP Fermee/Norme 16985/Verticale/Poudre/': ['', '', '0,3', '0,25'],
  '/CDP Fermee/Guide INRS/Horizontale/Liquide/': ['', '', '0,5', '0,4'],
  '/CDP Fermee/Guide INRS/Horizontale/Poudre/': ['', '', '/', '0,5'],
  '/CDP Fermee/Guide INRS/Verticale/Liquide/': ['', '', '/', '0,3'],
  '/CDP Fermee/Guide INRS/Verticale/Poudre/': ['', '', '/', '0,3'],
  '/CDP Encombrant/Norme 16985/': ['0,3', '0,25', '0,3', '0,25'],
  '/CDP Encombrant/Guide INRS/': ['0,4', '0,3', '0,4', '0,3'],
  '/CDP Fosse/Norme 16985/Descendant/': ['', '', '0,3', '0,25'],
  '/CDP Fosse/Guide INRS/Descendant/': ['', '', '0,4', '0,3'],
  '/CDP Fosse/Norme 16985/Ascendant/': ['', '', '0,7', '0,25'],
  '/CDP Fosse/Guide INRS/Ascendant/': ['', '', '0,7', '0,3']
};
var OM_CDP_TYPES = { 'Voiture': 'CDP Voiture', 'Camion': 'CDP Camion', 'Ouverte': 'CDP Ouverte', 'Fermée': 'CDP Fermee', 'Encombrant': 'CDP Encombrant', 'Fosse': 'CDP Fosse' };

// Propositions pour la vitesse moyenne (rang 0) ou minimale (rang 1) : [{ par, valeur, precision }]
function omCdpPropositions(d, rang) {
  var t = OM_CDP_TYPES[d.type_cabine || ''];
  if (!t) return [];
  var zone = /ext/i.test(d.zone_travail || '') ? 'Extérieure' : /int/i.test(d.zone_travail || '') ? 'Intérieure' : '';
  var veh = /v[ée]hicule/i.test(d.zone_travail || '') ? ['véhicules'] : /subjectile/i.test(d.zone_travail || '') ? ['subjectiles industriels divers'] : ['subjectiles industriels divers', 'véhicules'];
  var guide = d.type_cabine === 'Encombrant' ? 'Guide INRS ED 906' : d.pulverisation === 'Poudre' ? 'Guide INRS ED 928' : 'Guide INRS ED 839';
  var out = [];
  ['Norme 16985', 'Guide INRS'].forEach(function (ref) {
    var variantes = [];
    if (t === 'CDP Voiture' || t === 'CDP Camion') veh.forEach(function (v) { variantes.push([v + '/', veh.length > 1 ? v : '']); });
    else if (t === 'CDP Ouverte') { if (d.type_flux && zone && d.pulverisation) variantes.push([d.type_flux + '/' + zone + '/' + d.pulverisation + '/', '']); }
    else if (t === 'CDP Fermee') { if (d.type_flux && d.pulverisation) variantes.push([d.type_flux + '/' + d.pulverisation + '/', '']); }
    else if (t === 'CDP Fosse') ['Descendant', 'Ascendant'].forEach(function (v) { variantes.push([v + '/', 'flux ' + v.toLowerCase()]); });
    else variantes.push(['', '']);
    variantes.forEach(function (v) {
      var ligne = OM_CDP_CRITERES['/' + t + '/' + ref + '/' + v[0]];
      if (!ligne) return;
      var val = ligne[rang] || ligne[rang + 2]; // avec le véhicule / l'encombrant, sinon cabine vide
      if (val && val !== '/') out.push({ par: ref === 'Guide INRS' ? guide : ref, valeur: val, precision: v[1] });
    });
  });
  return out;
}

function omCdpRecoHtml(typeId, f, inst) {
  var rang = f.key === 'v1_valeur_recommandee' ? 0 : f.key === 'v2_valeur_recommandee' ? 1 : -1;
  if (typeId !== 'cabines_peinture' || rang < 0) return '';
  var d = inst.data, pre = rang ? 'v2_' : 'v1_', props = omCdpPropositions(d, rang);
  props = props.filter(function (p) { return !(String(d[pre + 'valeur_recommandee']) === p.valeur && d[pre + 'recommandee_par'] === p.par); });
  if (!props.length) return '';
  return '<div class="om-reco">' + props.map(function (p) {
    return '<button type="button" class="phrases-toggle" onclick="omCdpAppliquer(\'' + pre + '\',\'' + p.valeur + '\',\'' + escapeHtml(p.par) + '\');">' + ICONS.copy + ' ' +
      escapeHtml(p.par) + (p.precision ? ' (' + escapeHtml(p.precision) + ')' : '') + ' : ' + p.valeur + ' m/s</button>';
  }).join('') + '</div>';
}

function omCdpAppliquer(pre, valeur, par) {
  var inst = getCurrentInstallation('cabines_peinture');
  if (!inst) return;
  inst.data[pre + 'recommandee_par'] = par;
  updateInstallationField('cabines_peinture', pre + 'valeur_recommandee', valeur);
}

// ————————————————————————————————————————————
// Décapage : durée attendue du test au fumigène (INRS ED 768, § 5.1)
// ————————————————————————————————————————————

function omDecapageFumigeneHtml(typeId, f, inst) {
  if (typeId !== 'decapage' || f.key !== 'debit_extrait') return '';
  var d = inst.data, V = num(d.longueur) * num(d.largeur) * num(d.hauteur), Q = num(d.debit_extrait);
  if (!(V > 0 && Q > 0)) return '';
  var t = V / Q * 3600, fmt = function (s) { return 4 * t < 300 ? Math.round(s) + ' s' : omFr(s / 60, 1) + ' min'; }; // même unité pour les deux bornes
  return '<div class="field-hint">' + ICONS.clock + ' Test au fumigène : avec ce débit, l’atmosphère devrait revenir à l’état initial en ' + fmt(3 * t) + ' à ' + fmt(4 * t) +
    ' environ (3 à 4 fois V/Q, si l’air est bien brassé — INRS ED 768, § 5.1). Un temps très différent indique un débit réel différent de celui saisi.</div>';
}

// Aides sous un champ numérique de la fiche (js/wizard-engine.js)
function omAideChampHtml(typeId, f, inst) {
  return pitotAlerteHtml(typeId, f, inst) + omCdpRecoHtml(typeId, f, inst) + omDecapageFumigeneHtml(typeId, f, inst);
}

// ————————————————————————————————————————————
// Tube de Pitot sous 4 m/s (INRS ED 695, § 10.3.1)
// ————————————————————————————————————————————

// Préfixe du conduit si ce champ est une vitesse moyenne en conduit, sinon null
function omVitesseConduitPrefixe(typeId, key, d) {
  if (typeId === 'cta' || typeId === 'menuiserie') {
    if (/grille/i.test(d.mesure_debit || d.mesure_localisation || '')) return null; // mesure sur la grille
  }
  if (/^(vt_mesuree|vitesse_conduit|vitesse_directe)$/.test(key)) return '';
  if (typeId === 'cta') { var c = /^((?:neuf|souf|rep)_)vitesse$/.exec(key); return c ? c[1] : null; }
  var m = /^(.*)vitesse(_grid)?$/.exec(key);
  if (!m || typeId === 'cabines_peinture') return null;
  var t = getInstallationType(typeId);
  return t && t.fields.some(function (f) { return f.key === m[1] + 'vitesse_mode'; }) ? m[1] : null;
}

function omPitotMission() {
  var m = typeof getCurrentMission === 'function' ? getCurrentMission() : null;
  return !!(m && (m.appareilsMesure || []).some(function (a) { return /pitot/i.test((a.designation || '') + ' ' + (a.marqueModele || '')); }));
}

// Sous un champ de vitesse en conduit (ou sous sa grille : moyenne calculée)
function pitotAlerteHtml(typeId, f, inst) {
  var d = inst.data, pre = omVitesseConduitPrefixe(typeId, f.key, d);
  if (pre === null || !omPitotMission()) return '';
  var s = f.type === 'grid' ? gridStats(d[f.key], d[f.rowsKey], d[f.colsKey]) : null;
  var v = f.type === 'grid' ? (s && !s.incomplete ? s.moyenne : NaN) : num(d[f.key]);
  if (!(v > 0 && v < 4)) return '';
  return '<div class="field-hint field-hint-warn">' + ICONS.zap + ' Si cette vitesse a été lue au tube de Pitot : sous 4 m/s, la pression dynamique devient trop faible et l’erreur trop grande. Préférer l’anémomètre (INRS ED 695, § 10.3.1).</div>';
}

var OM_ICONE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M12 11v5"/></svg>';

// ————————————————————————————————————————————
// Petits outils de dessin
// ————————————————————————————————————————————

function omFr(v, dec) {
  var p = Math.pow(10, dec || 0);
  return String(Math.round(v * p) / p).replace('.', ',');
}

function omTxt(x, y, t, opt) {
  opt = opt || {};
  return '<text x="' + x + '" y="' + y + '" font-size="' + (opt.taille || 11) + '" text-anchor="' + (opt.ancre || 'middle') + '"' +
    (opt.gras ? ' font-weight="700"' : '') + ' fill="' + (opt.couleur || 'currentColor') + '">' + escapeHtml(t) + '</text>';
}

function omLigne(x1, y1, x2, y2, opt) {
  opt = opt || {};
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (opt.couleur || 'currentColor') +
    '" stroke-width="' + (opt.ep || 1) + '"' + (opt.tirets ? ' stroke-dasharray="4 3"' : '') + (opt.fleches ? ' marker-start="url(#om-f)" marker-end="url(#om-f)"' : '') +
    (opt.fleche ? ' marker-end="url(#om-f)"' : '') + '/>';
}

function omPoint(x, y, couleur, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 4) + '" fill="' + (couleur || OM_BLEU) + '"/>'; }

function omRect(x, y, w, h, opt) {
  opt = opt || {};
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (opt.fond || 'none') + '"' +
    (opt.opacite ? ' fill-opacity="' + opt.opacite + '"' : '') + ' stroke="' + (opt.couleur || 'currentColor') + '" stroke-width="' + (opt.ep || 2) + '"' +
    (opt.tirets ? ' stroke-dasharray="4 3"' : '') + '/>';
}

function omSonde(x, y, versGauche) {
  var w = 24;
  return versGauche ? '<rect x="' + x + '" y="' + (y - 3) + '" width="' + w + '" height="6" rx="2" fill="' + OM_BLEU + '"/>' + omLigne(x, y, x - 14, y, { couleur: OM_BLEU, ep: 2 })
    : '<rect x="' + (x - w) + '" y="' + (y - 3) + '" width="' + w + '" height="6" rx="2" fill="' + OM_BLEU + '"/>' + omLigne(x, y, x + 14, y, { couleur: OM_BLEU, ep: 2 });
}

function omSvg(w, h, corps) {
  return '<svg class="om-svg" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg"><defs><marker id="om-f" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>' + corps + '</svg>';
}

// ————————————————————————————————————————————
// Schémas
// ————————————————————————————————————————————

// Sorbonne, vue de face : ouverture l × h, 3 lignes et n colonnes à 100 mm des bords (calcul de l'appli)
function omSchemaSorbonne(d) {
  var l = num(d.largeur_mm), h = num(d.h_mm), n = parseInt(d.nb_colonnes, 10), exemple = !(l > 200 && h > 200 && n > 1);
  if (exemple) { l = 1200; h = 500; n = 4; }
  var X = 40, W = 260, Ho = Math.max(60, Math.min(140, W * h / l)), Yb = 196, Yo = Yb - Ho;
  var s = '<rect x="24" y="8" width="300" height="' + (Yb - 4) + '" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>';
  s += '<rect x="' + X + '" y="16" width="' + W + '" height="' + (Yo - 16) + '" fill="' + OM_GRIS + '" fill-opacity="0.25" stroke="currentColor"/>';
  s += omTxt(X + W / 2, (16 + Yo) / 2 + 4, 'Guillotine');
  s += '<rect x="' + X + '" y="' + Yo + '" width="' + W + '" height="' + Ho + '" fill="' + OM_BLEU + '" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5"/>';
  s += omLigne(20, Yb, 320, Yb, { ep: 2.5 }) + omTxt(170, Yb + 14, 'Plan de travail', { taille: 10 });
  var px = [], py = [100, h / 2, h - 100], esp = (l - 200) / (n - 1);
  for (var i = 0; i < n; i++) px.push(X + (100 + i * esp) / l * W);
  py = py.map(function (y) { return Yo + y / h * Ho; });
  px.forEach(function (x, i) { s += omTxt(x, Yo - 4, 'C' + (i + 1), { taille: 9 }); py.forEach(function (y) { s += omPoint(x, y); }); });
  py.forEach(function (y, j) { s += omTxt(X + W + 4, y + 3, 'L' + (j + 1), { taille: 9, ancre: 'start' }); });
  s += omLigne(X - 10, Yo, X - 10, Yb, { fleches: true }) + '<text x="10" y="' + ((Yo + Yb) / 2) + '" font-size="10" text-anchor="middle" fill="currentColor" transform="rotate(-90 10 ' + ((Yo + Yb) / 2) + ')">h = ' + omFr(h) + ' mm</text>';
  s += omLigne(X, Yb + 22, X + W, Yb + 22, { fleches: true }) + omTxt(X + W / 2, Yb + 36, 'l = ' + omFr(l) + ' mm', { taille: 10 });
  if (n > 1) s += omTxt((px[0] + px[1]) / 2, py[0] + 14, omFr(esp) + ' mm', { taille: 9, couleur: OM_BLEU });
  return { svg: omSvg(340, 244, s), legende: (exemple ? 'Exemple (1 200 × 500 mm) : la largeur et l’ouverture saisies remplacent l’exemple. ' : '') +
    n + ' colonnes × 3 lignes, à 100 mm des bords' + ', espacées de ' + omFr(esp) + ' mm en largeur et ' + omFr((h - 200) / 2) + ' mm en hauteur. C1 à gauche, L1 en haut (vue de face).' };
}

// Façade quadrillée (hotte, table aspirante, bouche) : nc × nr points au centre de cases égales
function omFacade(X, Y, W, Hh, nc, nr) {
  var s = '<rect x="' + X + '" y="' + Y + '" width="' + W + '" height="' + Hh + '" fill="' + OM_BLEU + '" fill-opacity="0.07" stroke="currentColor" stroke-width="2"/>';
  for (var i = 1; i < nc; i++) s += omLigne(X + i * W / nc, Y, X + i * W / nc, Y + Hh, { tirets: true, couleur: OM_GRIS });
  for (var j = 1; j < nr; j++) s += omLigne(X, Y + j * Hh / nr, X + W, Y + j * Hh / nr, { tirets: true, couleur: OM_GRIS });
  var rp = Math.max(1.5, Math.min(4, W / nc / 3, Hh / nr / 3));
  for (i = 0; i < nc; i++) for (j = 0; j < nr; j++) s += omPoint(X + (i + 0.5) * W / nc, Y + (j + 0.5) * Hh / nr, OM_BLEU, rp);
  return s;
}

// Hotte : façade quadrillée + vue de côté
function omSchemaHotte(d) {
  var L = num(d.vpe_largeur_cm), H = num(d.vpe_hauteur_cm), nc = parseInt(d.vpe_nb_points_largeur, 10), nr = parseInt(d.vpe_nb_points_hauteur, 10);
  var exemple = !(L > 0 && H > 0 && nc > 0 && nr > 0);
  if (exemple) { L = 100; H = 50; nc = 3; nr = 2; }
  var W = 240, Hh = Math.max(40, Math.min(120, W * H / L)), X = 60, Y = 24, s = '';
  s += omTxt(170, 12, 'Face de la hotte', { gras: true, taille: 10 });
  s += omFacade(X, Y, W, Hh, nc, nr);
  s += omLigne(X, Y + Hh + 10, X + W, Y + Hh + 10, { fleches: true }) + omTxt(X + W / 2, Y + Hh + 23, omFr(L, 1) + ' cm', { taille: 10 });
  s += omLigne(X - 8, Y, X - 8, Y + Hh, { fleches: true }) + omTxt(X - 12, Y + Hh / 2 + 4, omFr(H, 1) + ' cm', { taille: 10, ancre: 'end' });
  // Vue de côté : hotte au mur à gauche, ouverture vers la droite, source sur la table, opérateur en face
  var Y0 = Y + Hh + 50;
  s += omTxt(170, Y0 - 8, 'Vue de côté', { gras: true, taille: 10 });
  s += omLigne(30, Y0, 30, Y0 + 130, { ep: 2 });
  s += '<path d="M30 ' + (Y0 + 5) + ' L90 ' + (Y0 + 25) + ' L90 ' + (Y0 + 80) + ' L30 ' + (Y0 + 100) + ' Z" fill="' + OM_GRIS + '" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>';
  s += omLigne(90, Y0 + 12, 90, Y0 + 92, { tirets: true, couleur: OM_BLEU, ep: 1.5 }) + omTxt(96, Y0 + 14, 'plan d’ouverture', { taille: 10, couleur: OM_BLEU, ancre: 'start' });
  s += omSonde(122, Y0 + 50, true) + omTxt(154, Y0 + 54, 'sonde', { taille: 10, couleur: OM_BLEU, ancre: 'start' });
  s += omLigne(30, Y0 + 130, 320, Y0 + 130, { ep: 2 });
  s += '<circle cx="150" cy="' + (Y0 + 123) + '" r="6" fill="' + OM_ROUGE + '"/>' + omTxt(150, Y0 + 145, 'source', { taille: 10, couleur: OM_ROUGE });
  s += '<circle cx="270" cy="' + (Y0 + 66) + '" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>' + omLigne(270, Y0 + 75, 270, Y0 + 128, { ep: 1.5 });
  s += omTxt(270, Y0 + 145, 'opérateur', { taille: 10 });
  s += omLigne(255, Y0 + 100, 166, Y0 + 118, { fleche: true, couleur: OM_GRIS, ep: 1.5 }) + omLigne(140, Y0 + 114, 98, Y0 + 72, { fleche: true, couleur: OM_GRIS, ep: 1.5 });
  return { svg: omSvg(340, Y0 + 152, s), legende: (exemple ? 'Exemple (100 × 50 cm, 3 × 2 points) : les dimensions et le nombre de points saisis remplacent l’exemple. ' : '') +
    nc + ' × ' + nr + ' points, distances exactes dans « Positions des points de mesure » sous la grille. Flèches grises : sens de l’air, de l’opérateur vers la source puis vers la hotte.' };
}

// Bras d'aspiration, vue de côté
function omSchemaBras(d) {
  var du = num(d.distance_utilisation), dm = num(d.distance_max_captage), vc = num(d.vitesse_captage);
  var exemple = !(du > 0);
  if (exemple) du = 15;
  var cx = 170, yf = 96, ref = Math.max(du, dm > 0 ? dm : 0, 8) * 1.1, sc = 110 / ref, s = '';
  var collerette = /^Avec collerette/.test(d.type_bouche || '');
  s += '<path d="M40 8 L40 46 L' + cx + ' 46 L' + cx + ' 70" fill="none" stroke="currentColor" stroke-width="12" stroke-opacity="0.35" stroke-linejoin="round"/>';
  s += '<path d="M' + (cx - 8) + ' 70 L' + (cx + 8) + ' 70 L' + (cx + 22) + ' ' + yf + ' L' + (cx - 22) + ' ' + yf + ' Z" fill="' + OM_GRIS + '" fill-opacity="0.4" stroke="currentColor" stroke-width="1.5"/>';
  if (collerette) s += omLigne(cx - 46, yf, cx + 46, yf, { ep: 3 });
  s += omLigne(cx - 30, yf + 1, cx + 30, yf + 1, { tirets: true, couleur: OM_BLEU, ep: 1.5 });
  s += omSonde(cx + 34, yf, true);
  s += omTxt(cx + 62, yf - 6, 'vitesse lue à la bouche', { taille: 10, couleur: OM_BLEU, ancre: 'start' });
  if (dm > 0) {
    var r = dm * sc;
    s += '<path d="M' + (cx - r) + ' ' + yf + ' A' + r + ' ' + r + ' 0 0 0 ' + (cx + r) + ' ' + yf + '" fill="' + OM_BLEU + '" fill-opacity="0.06" stroke="' + OM_BLEU + '" stroke-dasharray="4 3"/>';
    s += omTxt(cx + r * 0.71 + 6, yf + r * 0.71 + 6, 'distance max ' + omFr(dm) + ' cm', { taille: 10, couleur: OM_BLEU, ancre: 'start' });
  }
  var ye = yf + du * sc;
  s += omLigne(40, ye + 6, 320, ye + 6, { ep: 2 }) + omTxt(300, ye + 20, 'pièce', { taille: 10 });
  s += '<circle cx="' + cx + '" cy="' + ye + '" r="5" fill="' + OM_ROUGE + '"/>' + omTxt(cx - 10, ye + 20, 'point d’émission', { taille: 10, couleur: OM_ROUGE, ancre: 'end' });
  s += omLigne(cx - 60, yf, cx - 60, ye, { fleches: true }) + omLigne(cx - 64, yf, cx - 30, yf, { couleur: OM_GRIS }) + omLigne(cx - 64, ye, cx - 6, ye, { couleur: OM_GRIS });
  s += omTxt(cx - 66, (yf + ye) / 2 + 4, 'x = ' + omFr(du) + ' cm', { taille: 10, ancre: 'end' });
  return { svg: omSvg(340, ye + 30, s), legende: (exemple ? 'Exemple (15 cm) : la distance d’utilisation saisie remplace l’exemple. ' : '') +
    'x : distance d’utilisation, du centre de la bouche au point d’émission.' +
    (dm > 0 ? ' Zone bleue : jusqu’à la distance maximum calculée, la vitesse atteint ' + (vc > 0 ? omFr(vc, 2) + ' m/s' : 'la vitesse de captage') + ' au point d’émission.' : '') +
    (collerette ? ' Bouche avec collerette.' : '') };
}

// Conduit, vue de côté + section explorée (pre : préfixe des champs du conduit)
function omSchemaConduit(d, typeId, pre) {
  pre = pre || '';
  var axes = parseInt(d[pre + 'vitesse_nb_axes'], 10), D = num(d[pre + 'diametre_cote1']), c2 = num(d[pre + 'cote2']);
  var bois = OM_TYPES_BOIS.indexOf(typeId) >= 0, amont = bois ? 5 : 20, aval = bois ? 3 : 5;
  var s = '', y1 = 40, y2 = 72;
  s += '<path d="M14 8 L14 ' + y2 + ' Q14 ' + y2 + ' 30 ' + y2 + ' L330 ' + y2 + ' M46 8 L46 ' + (y1 - 8) + ' Q46 ' + y1 + ' 56 ' + y1 + ' L330 ' + y1 + '" fill="none" stroke="currentColor" stroke-width="2"/>';
  s += omTxt(54, 20, 'coude', { taille: 10, ancre: 'start' });
  // coupure : longueur réelle bien plus grande que dessinée
  s += '<path d="M104 ' + (y1 - 6) + ' l6 6 l-6 6 M112 ' + (y1 - 6) + ' l6 6 l-6 6 M104 ' + (y2 - 6) + ' l6 6 l-6 6 M112 ' + (y2 - 6) + ' l6 6 l-6 6" fill="none" stroke="currentColor"/>';
  s += omLigne(206, y1 - 26, 206, y2 - 4, { ep: 3, couleur: OM_BLEU }) + omTxt(206, y1 - 30, 'sonde', { taille: 9, couleur: OM_BLEU });
  s += '<rect x="300" y="' + (y1 + 2) + '" width="4" height="' + (y2 - y1 - 4) + '" fill="currentColor" transform="rotate(25 302 ' + ((y1 + y2) / 2) + ')"/>' + omTxt(302, y1 - 8, 'registre', { taille: 9 });
  s += omLigne(56, y2 + 14, 204, y2 + 14, { fleches: true }) + omTxt(130, y2 + 28, (bois ? '≥ ' : '> ') + amont + ' D sans singularité', { taille: 10 });
  s += omLigne(208, y2 + 14, 296, y2 + 14, { fleches: true }) + omTxt(252, y2 + 28, (bois ? '≥ ' : '> ') + aval + ' D', { taille: 10 });
  s += omTxt(170, y1 + 20, 'air →', { taille: 10, couleur: OM_GRIS });
  var sx = 170, sy = 158, R = 34, nb = axes > 1 ? 2 : 1;
  s += omTxt(sx, 118, 'Section au point de mesure', { gras: true, taille: 10 });
  if (c2 > 0) {
    s += '<rect x="' + (sx - 48) + '" y="' + (sy - 30) + '" width="96" height="60" fill="none" stroke="currentColor" stroke-width="2"/>';
  } else {
    s += '<circle cx="' + sx + '" cy="' + sy + '" r="' + R + '" fill="none" stroke="currentColor" stroke-width="2"/>';
    s += omLigne(sx - R, sy, sx + R, sy, { tirets: true, couleur: OM_BLEU, ep: 1.5 });
    if (nb === 2) s += omLigne(sx, sy - R, sx, sy + R, { tirets: true, couleur: OM_BLEU, ep: 1.5 });
  }
  if (D > 0) s += omTxt(sx + 56, sy + 4, (c2 > 0 ? omFr(D, 1) + ' × ' + omFr(c2, 1) : 'Ø ' + omFr(D, 1)) + ' cm', { taille: 10, ancre: 'start' });
  return { svg: omSvg(340, 200, s), legende: 'D : diamètre du conduit au point de mesure. Les longueurs ne sont pas à l’échelle.' +
    (D > 0 && !(c2 > 0) ? ' Ici ' + amont + ' D = ' + omFr(amont * D / 100, 1) + ' m et ' + aval + ' D = ' + omFr(aval * D / 100, 1) + ' m.' : '') };
}

// Cabine de peinture : cas du protocole et positions des points le long d'une dimension (m).
// Écart maximal entre deux points de la cabine vide : 1,50 m (ED 839), 2 m pour les cabines de camion
// et d'encombrant comme le Rapso (Inserer_Annexes, DistanceEntreDeuxPoint). Fosse : une seule ligne de
// points le long de la fosse (Rapso).
function omCabineCas(d) {
  var t = d.type_cabine || '';
  return { poudre: d.pulverisation === 'Poudre', vertical: d.type_flux !== 'Horizontale' || t === 'Fosse', ouverte: t === 'Ouverte',
    vehicule: t === 'Voiture' || t === 'Camion', camion: t === 'Camion', fosse: t === 'Fosse', pas: (t === 'Camion' || t === 'Encombrant') ? 2 : 1.5 };
}

function omCabinePositions(dim, poudre, pas) {
  pas = pas || 1.5;
  var out = [], i, n;
  if (poudre) { // bande de 0,25 m exclue, centres de rectangles, écart < 1,50 m, 2 points au moins
    var u = dim - 0.5;
    if (!(u > 0)) return [dim / 2];
    n = Math.max(2, Math.floor(u / 1.5) + 1);
    for (i = 0; i < n; i++) out.push(0.25 + (i + 0.5) * u / n);
    return out;
  }
  if (dim <= 1) return [dim / 2]; // liquide : 0,50 m au moins des parois, 1,50 m (ou 2 m) au plus entre deux points
  n = Math.ceil((dim - 1) / pas - 1e-9) + 1;
  for (i = 0; i < n; i++) out.push(n === 1 ? dim / 2 : 0.5 + i * (dim - 1) / (n - 1));
  return out;
}

function omSchemaCabine(d) {
  var p = omCabineCas(d), l = num(d.largeur_cabine), L = num(d.longueur_cabine), s = '';
  var exemple = p.vertical ? !(l > 0 && L > 0) : !(l > 0);
  if (exemple) { l = 4; L = 6; }
  if (!(L > 0)) L = 6;
  var fr2 = function (v) { return omFr(v, 2); };
  if (p.vehicule) return omSchemaCabineVehicule(p);
  if (p.fosse) return omSchemaFosse(d);
  if (p.vertical) {
    var W = 260, Hh = Math.max(80, Math.min(200, W * l / L)), X = 50, Y = 24;
    var pl = omCabinePositions(L, p.poudre, p.pas), pw = omCabinePositions(l, p.poudre, p.pas), marge = p.poudre ? 0.25 : 0.5;
    s += omTxt(X + W / 2, 12, 'Vue de dessus : sol de la cabine vide', { gras: true, taille: 10 });
    s += omRect(X, Y, W, Hh, { fond: OM_BLEU, opacite: 0.05 });
    var mx = marge / L * W, my = marge / l * Hh;
    s += omRect(X + mx, Y + my, W - 2 * mx, Hh - 2 * my, { couleur: OM_GRIS, ep: 1, tirets: true });
    pl.forEach(function (x) { pw.forEach(function (y) { s += omPoint(X + x / L * W, Y + y / l * Hh); }); });
    s += omLigne(X, Y + Hh + 10, X + W, Y + Hh + 10, { fleches: true }) + omTxt(X + W / 2, Y + Hh + 23, 'longueur ' + fr2(L) + ' m', { taille: 10 });
    s += omLigne(X - 8, Y, X - 8, Y + Hh, { fleches: true }) + '<text x="22" y="' + (Y + Hh / 2) + '" font-size="10" text-anchor="middle" fill="currentColor" transform="rotate(-90 22 ' + (Y + Hh / 2) + ')">largeur ' + fr2(l) + ' m</text>';
    return { svg: omSvg(340, Y + Hh + 30, s), legende: (exemple ? 'Exemple (4 × 6 m) : la largeur et la longueur saisies remplacent l’exemple. ' : '') +
      pl.length + ' × ' + pw.length + ' points à ' + (p.poudre ? '1 m' : '0,90 m') + ' du sol (cadre pointillé : ' + omFr(marge, 2) + ' m des parois). ' +
      'En longueur, depuis une paroi : ' + pl.map(fr2).join(' · ') + ' m ; en largeur : ' + pw.map(fr2).join(' · ') + ' m. ' +
      'Dans la grille : par exemple ' + pl.length + ' axes de ' + pw.length + ' points.' };
  }
  // Ventilation horizontale : section verticale (plan d'évolution ou d'ouverture)
  var Wv = 240, Hv = 130, Xv = 60, Yv = 26, nc = 3, nr = 3, larg = '';
  if (p.poudre && p.ouverte) { nc = Math.max(1, Math.floor(l / 0.6) + 1); larg = ' : ' + nc + ' points en largeur'; nr = 0; }
  s += omTxt(Xv + Wv / 2, 12, p.ouverte ? 'Plan d’ouverture de la cabine' : 'Section de la cabine vide, plan où évolue le peintre', { gras: true, taille: 10 });
  s += omFacade(Xv, Yv, Wv, Hv, nc, nr || 3);
  s += omLigne(Xv, Yv + Hv + 10, Xv + Wv, Yv + Hv + 10, { fleches: true }) + omTxt(Xv + Wv / 2, Yv + Hv + 23, 'largeur ' + fr2(l) + ' m', { taille: 10 });
  s += '<text x="40" y="' + (Yv + Hv / 2) + '" font-size="10" text-anchor="middle" fill="currentColor" transform="rotate(-90 40 ' + (Yv + Hv / 2) + ')">hauteur</text>';
  return { svg: omSvg(340, Yv + Hv + 30, s), legende: (exemple ? 'Exemple (4 m de large) : la largeur saisie remplace l’exemple. ' : '') +
    (nr === 0 ? 'Cases de moins de 0,60 m de côté' + larg + ' ; en hauteur, même règle.' : '3 × 3 points au moins, un au centre de chaque case.') + ' Air perpendiculaire au plan de mesure.' };
}

// Cabine pour voiture ou camion, vue de dessus : points autour du véhicule (ED 839, § 10.3.1)
function omSchemaCabineVehicule(p) {
  var s = '', X = 30, Y = 26, W = 280, H = 150;
  s += omTxt(170, 12, p.camion ? 'Vue de dessus : cabine avec le camion' : 'Vue de dessus : cabine avec la voiture', { gras: true, taille: 10 });
  s += omRect(X, Y, W, H, { fond: OM_BLEU, opacite: 0.05 });
  var vx = p.camion ? 70 : 105, vw = p.camion ? 200 : 130, vy = Y + 50, vh = 50, m = 18; // véhicule et écart de 0,50 m dessiné
  s += '<rect x="' + vx + '" y="' + vy + '" width="' + vw + '" height="' + vh + '" rx="10" fill="' + OM_GRIS + '" fill-opacity="0.35" stroke="currentColor" stroke-width="1.5"/>';
  s += omTxt(vx + vw / 2, vy + vh / 2 + 4, p.camion ? 'camion' : 'voiture', { taille: 10 });
  var cotes = p.camion ? 5 : 3, pts = [];
  for (var i = 0; i < cotes; i++) { var x = vx + (i + 0.5) * vw / cotes; pts.push([x, vy - m], [x, vy + vh + m]); }
  pts.push([vx - m, vy + 14], [vx - m, vy + vh - 14], [vx + vw + m, vy + 14], [vx + vw + m, vy + vh - 14]);
  pts.forEach(function (q) { s += omPoint(q[0], q[1]); });
  s += omLigne(vx, vy - m, vx, vy, { couleur: OM_GRIS }) + omTxt(vx - 4, vy - m + 4, '0,50 m', { taille: 9, ancre: 'end', couleur: OM_BLEU });
  return { svg: omSvg(340, Y + H + 8, s), legende: p.camion
    ? 'Points à 0,50 m du camion et à 1,50 m du sol : 2 à l’avant, 2 à l’arrière, 1,50 à 2 m entre les points sur les côtés (le Rapso en prévoit 12, 14 ou 16 selon la longueur du camion : moins de 10 m, 10 à 12 m, 12 à 14 m).'
    : '10 points à 0,50 m de la voiture et à 0,90 m du sol : 3 de chaque côté, 2 à l’avant, 2 à l’arrière.' };
}

// Fosse, vue de dessus : une ligne de points le long de la fosse, à 1 m de son fond
function omSchemaFosse(d) {
  var L = num(d.longueur_cabine), exemple = !(L > 0), s = '';
  if (exemple) L = 8;
  var pos = omCabinePositions(L, false, 1.5), X = 30, Y = 34, W = 280, H = 50;
  s += omTxt(170, 12, 'Vue de dessus de la fosse', { gras: true, taille: 10 });
  s += omRect(X, Y, W, H, { fond: OM_GRIS, opacite: 0.2 });
  pos.forEach(function (x) { s += omPoint(X + x / L * W, Y + H / 2); });
  s += omLigne(X, Y + H + 10, X + W, Y + H + 10, { fleches: true }) + omTxt(X + W / 2, Y + H + 23, 'longueur ' + omFr(L, 2) + ' m', { taille: 10 });
  return { svg: omSvg(340, Y + H + 30, s), legende: (exemple ? 'Exemple (8 m) : la longueur saisie remplace l’exemple. ' : '') +
    pos.length + ' points sur une ligne, à 1 m du fond de la fosse, depuis une extrémité : ' + pos.map(function (v) { return omFr(v, 2); }).join(' · ') + ' m.' };
}

// Cuve de traitement de surface, vue de dessus : fentes le long du grand côté
function omSchemaCuve(d) {
  var L = num(d.longueur_l), W = num(d.largeur_l), nf = parseInt(d.nb_fentes, 10), bi = d.type_ventilation === 'Extraction bilatérale';
  var exemple = !(L > 0 && W > 0);
  if (exemple) { L = 2; W = 0.8; }
  var Wd = 210, Hd = Math.max(50, Math.min(130, Wd * W / L)), X = 80, Y = 34, s = '';
  s += omTxt(X + Wd / 2, 12, 'Vue de dessus de la cuve', { gras: true, taille: 10 });
  s += omRect(X, Y, Wd, Hd, { fond: OM_GRIS, opacite: 0.15 });
  s += omTxt(X + Wd / 2, Y + Hd / 2 + 4, 'bain', { taille: 10, couleur: OM_GRIS });
  var fente = function (y) {
    var r = '<rect x="' + X + '" y="' + (y - 4) + '" width="' + Wd + '" height="8" fill="currentColor" fill-opacity="0.35"/>';
    for (var i = 0; i < 6; i++) r += omPoint(X + (i + 0.5) * Wd / 6, y, OM_BLEU, 3.5);
    return r;
  };
  s += fente(Y - 6);
  if (bi) s += fente(Y + Hd + 6);
  s += omTxt(X + Wd + 4, Y - 2, 'fente', { taille: 10, ancre: 'start' });
  s += omLigne(X, Y + Hd + (bi ? 20 : 12), X + Wd, Y + Hd + (bi ? 20 : 12), { fleches: true }) + omTxt(X + Wd / 2, Y + Hd + (bi ? 33 : 25), 'L = ' + omFr(L, 2) + ' m', { taille: 10 });
  s += omLigne(X - 8, Y, X - 8, Y + Hd, { fleches: true }) + omTxt(X - 12, Y + Hd / 2 + 4, 'W = ' + omFr(W, 2) + ' m', { taille: 10, ancre: 'end' });
  return { svg: omSvg(340, Y + Hd + (bi ? 40 : 32), s), legende: (exemple ? 'Exemple (2 × 0,8 m) : les dimensions saisies remplacent l’exemple. ' : '') +
    (bi ? 'Extraction bilatérale : fentes sur les deux grands côtés. ' : 'Extraction unilatérale. ') +
    'Points bleus : relevés répartis sur toute la longueur de chaque fente' + (nf > 0 ? ' (' + nf + ' fente' + (nf > 1 ? 's' : '') + ' saisie' + (nf > 1 ? 's' : '') + ')' : '') + '.' };
}

// Torche aspirante : buse, orifice d'aspiration, tube de mesure
function omSchemaTorche(d, typeId, pre) {
  var D = num(d[pre + 'diametre_tube']), Lmm = num(d[pre + 'distance_l']), s = '';
  // torche inclinée vers la pièce
  s += '<path d="M40 30 L150 92" stroke="currentColor" stroke-width="14" stroke-opacity="0.35" stroke-linecap="round"/>';
  s += '<path d="M150 92 L176 108" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>';
  s += '<circle cx="150" cy="92" r="5" fill="none" stroke="' + OM_BLEU + '" stroke-width="2"/>' + omTxt(140, 112, 'orifice d’aspiration', { taille: 10, couleur: OM_BLEU, ancre: 'end' });
  s += omLigne(20, 132, 320, 132, { ep: 2 }) + omTxt(300, 146, 'pièce', { taille: 10 });
  s += '<circle cx="186" cy="128" r="5" fill="' + OM_ROUGE + '"/>' + omTxt(196, 124, 'point de soudage', { taille: 10, couleur: OM_ROUGE, ancre: 'start' });
  s += omLigne(150, 92, 184, 124, { fleches: true, tirets: true }) + omTxt(164, 122, 'L', { taille: 11, gras: true, ancre: 'end' });
  // tronçon de mesure : tube lisse avec sonde au centre
  var y0 = 180;
  s += omTxt(170, y0 - 14, 'Tube de mesure (vue en coupe)', { gras: true, taille: 10 });
  s += omLigne(60, y0, 280, y0, { ep: 2 }) + omLigne(60, y0 + 30, 280, y0 + 30, { ep: 2 });
  s += omLigne(20, y0 + 15, 60, y0 + 15, { ep: 8, couleur: OM_GRIS }) + omTxt(40, y0 + 4, 'flexible', { taille: 9 });
  s += omLigne(170, y0 - 6, 170, y0 + 15, { ep: 3, couleur: OM_BLEU }) + omPoint(170, y0 + 15) + omTxt(176, y0 + 46, 'sonde au centre du tube', { taille: 10, couleur: OM_BLEU });
  s += omTxt(300, y0 + 19, 'Ø ' + (D > 0 ? omFr(D) + ' mm' : '?'), { taille: 10 });
  return { svg: omSvg(340, y0 + 56, s), legende: 'L : distance de l’orifice d’aspiration au point de soudage' + (Lmm > 0 ? ' (' + omFr(Lmm) + ' mm saisis)' : '') +
    '. Vitesse lue au centre du tube de mesure' + (D > 0 ? ' de ' + omFr(D) + ' mm' : '') + '.' };
}

// Point d'émission le plus éloigné du captage
function omSchemaEmission() {
  var s = '';
  s += omLigne(30, 20, 30, 150, { ep: 2 });
  s += '<path d="M30 40 L80 55 L80 115 L30 130 Z" fill="' + OM_GRIS + '" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>' + omTxt(55, 30, 'captage', { taille: 10 });
  s += omLigne(30, 150, 320, 150, { ep: 2 });
  s += '<rect x="120" y="128" width="150" height="22" fill="' + OM_ROUGE + '" fill-opacity="0.12" stroke="' + OM_ROUGE + '" stroke-dasharray="4 3"/>';
  s += omTxt(195, 166, 'zone d’émission', { taille: 10, couleur: OM_ROUGE });
  [140, 175, 210].forEach(function (x) { s += '<circle cx="' + x + '" cy="139" r="4" fill="' + OM_ROUGE + '" fill-opacity="0.5"/>'; });
  s += '<circle cx="255" cy="139" r="6" fill="' + OM_ROUGE + '"/>';
  s += omSonde(255, 110, false) + omLigne(255, 110, 255, 133, { couleur: OM_BLEU, ep: 1.5 });
  s += omTxt(318, 96, 'mesure ici : point le plus éloigné', { taille: 10, couleur: OM_BLEU, ancre: 'end' });
  s += omLigne(240, 128, 92, 90, { fleche: true, couleur: OM_GRIS, ep: 1.5 });
  return { svg: omSvg(340, 176, s), legende: 'La vitesse induite diminue vite avec la distance : le point d’émission le plus éloigné du captage est le plus défavorable.' };
}

// Bouche ou grille : face (section totale à l'intérieur du cadre) et cône
function omSchemaBouche(d, typeId, pre) {
  var a = num(d[pre + 'largeur']), b = num(d[pre + 'longueur']), s = '';
  var X = 30, Y = 28, W = 130, H = 90;
  s += omTxt(X + W / 2, 14, 'Face de la bouche', { gras: true, taille: 10 });
  s += omRect(X - 8, Y - 8, W + 16, H + 16, { ep: 4, couleur: OM_GRIS });
  s += omFacade(X, Y, W, H, 3, 2);
  s += omLigne(X, Y + H + 18, X + W, Y + H + 18, { fleches: true }) + omTxt(X + W / 2, Y + H + 31, 'intérieur du cadre', { taille: 10 });
  // cône posé sur la bouche
  var cx = 250, yb = Y + 6;
  s += omTxt(cx, 14, 'Au cône', { gras: true, taille: 10 });
  s += omLigne(cx - 50, yb, cx + 50, yb, { ep: 4, couleur: OM_GRIS }) + omTxt(cx + 56, yb + 4, 'bouche', { taille: 9, ancre: 'start' });
  s += '<path d="M' + (cx - 54) + ' ' + (yb + 2) + ' L' + (cx + 54) + ' ' + (yb + 2) + ' L' + (cx + 14) + ' ' + (yb + 70) + ' L' + (cx - 14) + ' ' + (yb + 70) + ' Z" fill="' + OM_BLEU + '" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5"/>';
  s += '<rect x="' + (cx - 14) + '" y="' + (yb + 70) + '" width="28" height="22" fill="none" stroke="currentColor" stroke-width="1.5"/>' + omPoint(cx, yb + 81);
  s += omTxt(cx, yb + 106, 'cône couvrant toute la bouche', { taille: 10, couleur: OM_BLEU });
  var dims = a > 0 && b > 0 ? ' Dimensions saisies : ' + omFr(a, 1) + ' × ' + omFr(b, 1) + ' cm.' : '';
  return { svg: omSvg(340, Y + H + 40, s), legende: 'À l’anémomètre : un point au centre de chaque case. Au cône : la vitesse est lue à la sortie du cône.' + dims };
}

// Décapage : section à ventiler (cabine) ou caisson à manchons
function omSchemaDecapage(d) {
  var s = '';
  if (d.type_installation === DEC_CAISSON) {
    s += omTxt(170, 14, 'Face du caisson de grenaillage', { gras: true, taille: 10 });
    s += omRect(60, 26, 220, 110, { fond: OM_GRIS, opacite: 0.15 });
    [130, 210].forEach(function (x) {
      s += '<circle cx="' + x + '" cy="80" r="22" fill="none" stroke="currentColor" stroke-width="2"/>';
      s += omPoint(x, 80) + omPoint(x - 11, 80, OM_BLEU, 3) + omPoint(x + 11, 80, OM_BLEU, 3);
    });
    s += omTxt(170, 156, 'Manchons : vitesse dans le plan des ouvertures', { taille: 10, couleur: OM_BLEU });
    return { svg: omSvg(340, 166, s), legende: 'Points bleus : vitesse relevée dans le plan de chaque ouverture, caisson en fonctionnement.' };
  }
  var vert = d.deplacement_air !== DEC_HORIZONTAL, L = num(d.longueur), l = num(d.largeur), h = num(d.hauteur);
  var a = vert ? L : l, b = vert ? l : h, exemple = !(a > 0 && b > 0);
  if (exemple) { a = vert ? 6 : 4; b = vert ? 4 : 3; }
  var W = 220, H = Math.max(60, Math.min(140, W * b / a)), X = 70, Y = 26;
  s += omTxt(X + W / 2, 12, vert ? 'Section à ventiler : vue de dessus (L × l)' : 'Section à ventiler : face (l × h)', { gras: true, taille: 10 });
  s += omRect(X, Y, W, H, { fond: OM_BLEU, opacite: 0.08 });
  for (var i = 0; i < 4; i++) {
    var x = X + (i + 0.5) * W / 4;
    s += vert ? '<circle cx="' + x + '" cy="' + (Y + H / 2) + '" r="7" fill="none" stroke="' + OM_GRIS + '" stroke-width="1.5"/>' + omPoint(x, Y + H / 2, OM_GRIS, 2)
      : omLigne(x - 14, Y + H / 2, x + 10, Y + H / 2, { fleche: true, couleur: OM_GRIS, ep: 1.5 });
  }
  s += omLigne(X, Y + H + 10, X + W, Y + H + 10, { fleches: true }) + omTxt(X + W / 2, Y + H + 23, (vert ? 'longueur ' : 'largeur ') + omFr(a, 2) + ' m', { taille: 10 });
  s += omLigne(X - 8, Y, X - 8, Y + H, { fleches: true }) + omTxt(X - 12, Y + H / 2 + 4, (vert ? 'l ' : 'h ') + omFr(b, 2) + ' m', { taille: 10, ancre: 'end' });
  return { svg: omSvg(340, Y + H + 30, s), legende: (exemple ? 'Exemple : les dimensions saisies remplacent l’exemple. ' : '') +
    (vert ? 'Air vertical (cercles : air descendant) : section = longueur × largeur = ' : 'Air horizontal (flèches) : section = largeur × hauteur = ') + omFr(a * b, 2) + ' m².' };
}

// Machine capotée : prise de pression et ouvertures
function omSchemaFluide() {
  var s = '';
  s += omRect(60, 40, 200, 110, { fond: OM_GRIS, opacite: 0.15 }) + omTxt(160, 100, 'capot', { taille: 11, couleur: OM_GRIS });
  s += '<rect x="90" y="120" width="60" height="30" fill="' + OM_BLEU + '" fill-opacity="0.1" stroke="' + OM_BLEU + '" stroke-dasharray="4 3"/>';
  s += omTxt(120, 168, 'ouverture', { taille: 10, couleur: OM_BLEU });
  s += omSonde(178, 135, true) + omTxt(208, 132, 'vitesse : machine en marche', { taille: 9, couleur: OM_BLEU, ancre: 'start' });
  s += omLigne(160, 40, 160, 14, { ep: 10, couleur: OM_GRIS }) + omTxt(172, 18, 'extraction', { taille: 9, ancre: 'start' });
  s += omPoint(240, 52, OM_ROUGE, 4) + omLigne(240, 52, 300, 30, { couleur: OM_ROUGE }) + '<circle cx="306" cy="26" r="10" fill="none" stroke="' + OM_ROUGE + '" stroke-width="1.5"/>';
  s += omTxt(232, 70, 'pression : machine arrêtée', { taille: 9, couleur: OM_ROUGE, ancre: 'end' });
  return { svg: omSvg(340, 178, s), legende: 'Point rouge : prise de pression sur le capot (manomètre). Pointillés bleus : ouverture du capot où lire la vitesse.' };
}

// Poste aux solvants selon le dispositif
function omSchemaSolvant(d) {
  var t = d.type_dispositif || '', s = '';
  if (t === PS_DISPOSITIFS[2]) {
    s += omTxt(170, 12, 'Ouverture de la table / du dosseret', { gras: true, taille: 10 });
    s += omFacade(50, 24, 240, 90, 4, 2);
    return { svg: omSvg(340, 124, s), legende: 'Plusieurs points répartis sur toute l’ouverture ; noter la moyenne et la plus faible.' };
  }
  if (t === PS_DISPOSITIFS[3]) {
    s += omTxt(170, 12, 'Vue de dessus du bac', { gras: true, taille: 10 });
    s += omRect(60, 34, 220, 100, { fond: OM_GRIS, opacite: 0.15 });
    s += '<rect x="60" y="24" width="220" height="8" fill="currentColor" fill-opacity="0.35"/>' + '<rect x="60" y="136" width="220" height="8" fill="currentColor" fill-opacity="0.35"/>';
    s += omTxt(286, 31, 'fentes', { taille: 9, ancre: 'start' });
    s += omPoint(170, 84, OM_BLEU, 6) + omTxt(170, 106, 'point le plus éloigné des fentes', { taille: 10, couleur: OM_BLEU });
    return { svg: omSvg(340, 152, s), legende: 'Bac rectangulaire avec fentes de part et d’autre : le point le plus éloigné est au milieu du bac.' };
  }
  s += omTxt(170, 12, 'Cuve sous couvercle (coupe)', { gras: true, taille: 10 });
  s += '<path d="M80 60 L80 150 L260 150 L260 60" fill="' + OM_GRIS + '" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>';
  s += omLigne(70, 40, 270, 40, { ep: 5 }) + omTxt(170, 32, 'couvercle', { taille: 10 });
  s += omLigne(270, 43, 270, 60, { fleches: true }) + omTxt(276, 54, 'e', { taille: 11, gras: true, ancre: 'start' });
  s += omSonde(110, 50, true) + omTxt(140, 66, 'vitesse dans l’ouverture', { taille: 10, couleur: OM_BLEU, ancre: 'start' });
  return { svg: omSvg(340, 160, s), legende: 'e : largeur moyenne de l’espace libre entre la cuve et le couvercle.' };
}

var OM_SCHEMAS = { sorbonne: omSchemaSorbonne, hotte: omSchemaHotte, bras: omSchemaBras, conduit: omSchemaConduit, cabine: omSchemaCabine,
  cuve: omSchemaCuve, torche: omSchemaTorche, emission: omSchemaEmission, bouche: omSchemaBouche, decapage: omSchemaDecapage,
  fluide: omSchemaFluide, solvant: omSchemaSolvant };

// ————————————————————————————————————————————
// Fenêtre
// ————————————————————————————————————————————

function omOuvrir(typeId, k, pre) {
  var inst = getCurrentInstallation(typeId), d = inst && inst.data;
  if (!d || !OM_FICHES[k]) return;
  var fiche = omContenu(k, d, typeId), sch = OM_SCHEMAS[k](d, typeId, pre || '');
  var root = document.getElementById('om-root');
  if (!root) { root = document.createElement('div'); root.id = 'om-root'; document.body.appendChild(root); }
  root.innerHTML = '<div class="tour-overlay om-overlay" onclick="if(event.target===this)omFermer();"><div class="om-card" role="dialog" aria-modal="true" aria-label="' + escapeHtml(fiche.titre) + '">' +
    '<div class="om-tete"><h2>' + escapeHtml(fiche.titre) + '</h2><button type="button" class="om-x" aria-label="Fermer" onclick="omFermer();">×</button></div>' +
    sch.svg + '<p class="om-legende">' + escapeHtml(sch.legende) + '</p>' +
    '<ul class="om-liste">' + fiche.consignes.map(function (c) { return '<li>' + escapeHtml(c) + '</li>'; }).join('') + '</ul>' +
    '<div class="cm-src">Source : ' + escapeHtml(fiche.source) + '</div>' +
    '<button type="button" class="btn btn-primary" style="margin-top:10px;" onclick="omFermer();">Compris</button></div></div>';
}

function omFermer() {
  var root = document.getElementById('om-root');
  if (root) root.innerHTML = '';
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') omFermer(); });
}

console.log('✓ Où et comment mesurer chargé');
