// ed-reference.js - Aide-mémoire : guide INRS (ED) ou référentiel applicable à chaque type d'installation
// Ne recense que ce qui est explicitement cité dans installations-schema.js / export-word.js / calculations.js
// (cf. convention du projet : ne pas deviner un n° de guide non confirmé par une source fiable — voir
// aeration_word_export_schema_gaps, mémoire). Les types sans guide INRS identifié affichent leur base
// réelle (réglementaire, données constructeur, table INRS sans n° ED confirmé).
var ED_REFERENCE = {
  sorbonnes: {
    badge: 'ED 795', status: 'ok',
    note: 'Vitesses de face et débit comparés au guide INRS ED 795. Ouverture de travail selon Norme XP X15-203 (avant 01/2005) ou NF EN 14175-4 (après 01/2005).'
  },
  hottes: {
    badge: 'ED 695', status: 'ok',
    note: 'Vitesse au point d’émission et vitesse de transport comparées au guide INRS ED 695 (hottes et dosserets aspirants).'
  },
  installations_diverses: {
    badge: 'ED 695 (+ selon procédé)', status: 'ok',
    note: 'Captage localisé / équipements divers : vitesses comparées au guide INRS ED 695 (principes généraux). Selon le procédé rencontré, d’autres guides pratiques de ventilation peuvent s’appliquer à la place : ED 768 (décapage, désablage, dépolissage au jet libre en cabine), ED 972 (captage et traitement des aérosols de fluide de coupe), ED 6049 (poste d’utilisation manuelle de solvants).'
  },
  cabines_peinture: {
    badge: 'ED 839 / ED 928 / ED 906', status: 'ok',
    note: 'Peinture liquide : guide pratique de ventilation n°9.1 (ED 839). Peinture poudre : guide n°9.2 (ED 928). Pulvérisation de pièces lourdes ou encombrantes : guide n°9.3 (ED 906). Norme de sécurité NF EN 16985 (a remplacé les normes EN 12215/13355/12981 en 2019). À vérifier aussi : si le site est classé ICPE rubrique 2940, l’arrêté du 12/05/2020 fixe des prescriptions de ventilation propres à cette rubrique.'
  },
  menuiserie_bis: {
    badge: 'ED 750', status: 'ok',
    note: 'Vitesse et débit par machine à bois comparés au guide pratique de ventilation n°12 (ED 750, seconde transformation du bois) — vitesse de transport pneumatique des poussières de bois : 20 m/s.'
  },
  bureaux: {
    badge: 'Réglementaire', status: 'muted',
    note: 'Débit d’air neuf minimal fixé par le Code du travail — pas de guide INRS ED dédié.'
  },
  erp: {
    badge: 'Réglementaire', status: 'muted',
    note: 'Même base réglementaire que Bureaux (Code du travail) — pas de guide INRS ED dédié.'
  },
  sanitaires: {
    badge: 'Réglementaire', status: 'muted',
    note: 'Débit minimal réglementaire — pas de guide INRS ED dédié.'
  },
  locaux_fumeurs: {
    badge: 'Code santé publique', status: 'muted',
    note: 'Critères issus de la réglementation « locaux fumeurs » (Code de la santé publique) — pas de guide INRS ED dédié.'
  },
  cta: {
    badge: 'Données constructeur', status: 'muted',
    note: 'Comparaison aux données constructeur de la centrale — pas de guide INRS ED dédié.'
  },
  extracteur: {
    badge: 'Donnée de référence', status: 'muted',
    note: 'Comparaison à une valeur de référence ou au débit de l’année précédente — pas de guide INRS ED dédié.'
  },
  bras_aspiration: {
    badge: 'ED 695 / ED 657', status: 'ok',
    note: 'Distance et vitesse de captage calculées selon la formule générale du guide n°0 (ED 695, principes généraux). En cas de recyclage de l’air, les obligations réglementaires détaillées par le guide n°1 (ED 657) s’appliquent.'
  },
  gaz_echappement: {
    badge: 'ED 6246', status: 'ok',
    note: 'Guide INRS ED 6246 « Prévention des expositions liées aux émissions des moteurs thermiques » — débit minimum préconisé selon la cylindrée et le régime moteur.'
  },
  menuiserie: {
    badge: 'ED 750', status: 'ok',
    note: 'Même guide pratique de ventilation n°12 (ED 750, seconde transformation du bois) que Menuiserie (machines à bois) — fiche réseau commune à plusieurs machines.'
  },
  box_peinture: {
    badge: 'ED 6406', status: 'ok',
    note: 'Guide pratique de ventilation n°24 (ED 6406, Carrosserie) — enceintes de préparation de surface (ponçage, égrenage) et taux de renouvellement.'
  },
  torches_aspirantes: {
    badge: 'ED 668', status: 'ok',
    note: 'Torches de soudage aspirantes — guide pratique de ventilation n°7 (ED 668, opérations de soudage à l’arc et de coupage) : débit de référence par défaut de 100 m³/h par torche.'
  },
  locaux_charge: {
    badge: 'ED 6120', status: 'ok',
    note: 'Aide-mémoire technique ED 6120 « Charge des batteries d’accumulateurs au plomb — prévention du risque explosion » : calcul du débit de ventilation nécessaire par chargeur.'
  },
  tts: {
    badge: 'ED 651', status: 'ok',
    note: 'Guide pratique de ventilation n°2 (ED 651, cuves de traitement de surface) : coefficients a/b/n et vitesse de captage selon le type de cuve et de ventilation.'
  }
};

function getEdReferenceForType(typeId) {
  return ED_REFERENCE[typeId] || null;
}

function renderEdReferenceBadge(typeId) {
  var ref = getEdReferenceForType(typeId);
  if (!ref) return '';
  var h = '<div class="card ed-ref-inline">';
  h += '<span class="status-badge status-' + ref.status + ' ed-ref-pill">' + escapeHtml(ref.badge) + '</span>';
  h += '<span class="subtitle ed-ref-note">' + escapeHtml(ref.note) + '</span>';
  h += '</div>';
  return h;
}

function renderEdReference() {
  var h = '<button class="back-btn" onclick="state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  h += '<div class="card"><h1>' + ICONS.clipboard + ' Aide-mémoire ED</h1>' +
    '<p class="subtitle">Guide INRS (ED) ou référentiel applicable à chaque type d’installation</p></div>';
  h += '<div class="card"><p class="subtitle ed-ref-note">' +
    escapeHtml('À noter, de façon transversale (pas rattaché à un type précis) : le guide pratique de ventilation ED 6008 « Le dossier d’installation de ventilation » précise ce que doit contenir le dossier dont sont censées provenir les « valeurs de référence » comparées dans les fiches ci-dessous (rejoint la notice d’instruction de l’article R.4222-21, déjà suivie dans l’onglet Entrées de la mission).') +
    '</p></div>';

  INSTALLATION_TYPES.forEach(function (t) {
    var ref = getEdReferenceForType(t.id) || { badge: 'Non renseigné', status: 'muted', note: '' };
    h += '<div class="card">';
    h += '<div class="row" style="align-items:center;gap:12px;">';
    h += '<div class="nav-icon">' + getIcon(t.icon) + '</div>';
    h += '<div style="flex:1;">';
    h += '<div style="font-weight:600;">' + escapeHtml(t.label) + '</div>';
    h += '<span class="status-badge status-' + ref.status + ' ed-ref-pill" style="margin-top:4px;">' + escapeHtml(ref.badge) + '</span>';
    h += '</div></div>';
    if (ref.note) h += '<p class="subtitle ed-ref-note">' + escapeHtml(ref.note) + '</p>';
    h += '</div>';
  });

  return h;
}

console.log('✓ Aide-mémoire ED chargé');
