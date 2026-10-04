// dvr.js - Relevé pour l'établissement du dossier de valeurs de référence (chantier du 2026-10-03)
//
// Cadre (arrêté du 8 octobre 1987) : le dossier de valeurs de référence fixe « les caractéristiques
// qualitatives et quantitatives de l'installation qui garantissent le respect des spécifications
// réglementaires et permettent les contrôles ultérieurs par comparaison » (art. 2 a). Pour les
// installations existantes, il peut être établi « lors de contrôles à l'initiative du chef
// d'établissement ». Contenu : art. 3 (pollution non spécifique), art. 4 (pollution spécifique).
//
// SOCOTEC relève et propose, le chef d'établissement valide et adopte. Règle éthique (décision du
// 2026-10-03) : une valeur relevée n'est proposée comme référence que si l'installation satisfait au
// critère applicable ; sinon on propose le minimum réglementaire/normatif, ou la valeur reste à définir
// par le maître d'ouvrage — jamais une valeur de fonctionnement défaillant érigée en référence.
//
// Prestation optionnelle par mission (m.dvr.actif, cochée quand elle est prévue au devis). Document PDF
// distinct du rapport de contrôle. Une fois le relevé validé par le client (m.dvr.valideLe), ses valeurs
// alimentent les champs « référence » lors du préremplissage de la visite suivante.

var DVR_CATEGORIES = [
  { key: 'ns', titre: 'Locaux à pollution non spécifique', article: 'arrêté du 8 octobre 1987, art. 3' },
  { key: 'sp', titre: 'Locaux à pollution spécifique', article: 'arrêté du 8 octobre 1987, art. 4' },
  { key: 'autre', titre: 'Locaux fumeurs', article: 'Code de la santé publique' }
];

// Lignes du relevé par type. role : 'releve' (valeur mesurée, proposée si satisfaisante),
// 'mini' (le minimum réglementaire lui-même), 'point' (point caractéristique associé au débit :
// proposé si l'installation est satisfaisante), 'adefinir' (donnée à reporter par le maître d'ouvrage).
// mini : champ du minimum réglementaire/normatif ; avis : avis propre à la ligne (sinon avis global) ;
// ref : champ « référence » de la fiche, rempli l'année suivante une fois le relevé validé.
var DVR_POINTS_CONDUIT = [
  { label: 'Vitesse d’air au point de mesure (conduit)', mesure: 'vitesse', unit: 'm/s', role: 'point' },
  { label: 'Pression statique au point de mesure', mesure: 'pression_statique', unit: 'Pa', role: 'point' }
];
var DVR_CONFIG = {
  bureaux: { cat: 'ns', lignes: [
    { label: 'Débit minimal d’air neuf du local', role: 'mini', mini: 'debit_min_air_neuf', unit: 'm³/h' },
    { label: 'Débit d’air neuf relevé (point de comparaison)', mesure: 'debit_air_neuf_introduit', role: 'point', unit: 'm³/h' }
  ] },
  erp: { cat: 'ns', lignes: [
    { label: 'Débit minimal d’air neuf du local', role: 'mini', mini: 'debit_min_air_neuf', unit: 'm³/h' },
    { label: 'Débit d’air neuf relevé (point de comparaison)', mesure: 'debit_air_neuf_introduit', role: 'point', unit: 'm³/h' }
  ] },
  cta: { cat: 'ns', filtres: true, lignes: [
    { label: 'Débit d’air neuf', mesure: 'neuf_debit', mini: 'neuf_reference', miniLabel: 'Valeur de conception', unit: 'm³/h', ref: 'neuf_reference' },
    { label: 'Débit d’air soufflé', mesure: 'souf_debit', mini: 'souf_reference', miniLabel: 'Valeur de conception', unit: 'm³/h', ref: 'souf_reference' },
    { label: 'Débit d’air repris', mesure: 'rep_debit', mini: 'rep_reference', miniLabel: 'Valeur de conception', unit: 'm³/h', ref: 'rep_reference' },
    { label: 'Vitesse dans le conduit d’air neuf', mesure: 'neuf_vitesse', unit: 'm/s', role: 'point' },
    { label: 'Pression statique dans le conduit d’air neuf', mesure: 'neuf_pression_statique', unit: 'Pa', role: 'point' },
    { label: 'Vitesse dans le conduit d’air soufflé', mesure: 'souf_vitesse', unit: 'm/s', role: 'point' },
    { label: 'Pression statique dans le conduit d’air soufflé', mesure: 'souf_pression_statique', unit: 'Pa', role: 'point' }
  ] },
  // Code du travail R4222-3 : les locaux sanitaires sont des locaux à pollution spécifique
  sanitaires: { cat: 'sp', polluant: 'Odeurs et humidité (locaux sanitaires)', lignes: [
    { label: 'Débit minimal réglementaire', role: 'mini', mini: 'debit_min_reglementaire', unit: 'm³/h' },
    { label: 'Débit d’air extrait relevé (point de comparaison)', mesure: 'debit_mesure', role: 'point', unit: 'm³/h' }
  ] },
  locaux_fumeurs: { cat: 'autre', lignes: [
    { label: 'Débit d’air extrait', mesure: 'debit_extraction', unit: 'm³/h' },
    { label: 'Taux de renouvellement', mesure: 'taux_renouvellement', unit: 'vol/h' }
  ] },
  extracteur: { cat: 'sp', polluant: 'Selon l’activité du local', lignes: [
    { label: 'Débit global d’air extrait', mesure: 'debit_annee_en_cours', mini: 'valeur_reference_recommandee', miniLabel: 'Valeur de référence ou recommandée', unit: 'm³/h', ref: 'valeur_reference_recommandee' }
  ].concat(DVR_POINTS_CONDUIT) },
  sorbonnes: { cat: 'sp', polluant: 'Vapeurs et gaz des produits chimiques manipulés', lignes: [
    { label: 'Vitesse frontale minimale', mesure: 'vitesse_min_mesuree', mini: 'vitesse_min_norme_valeur', miniLabel: 'Valeur normative', avis: 'vitesse_min_avis_norme', unit: 'm/s', ref: 'vitesse_min_reference' },
    { label: 'Vitesse frontale moyenne', mesure: 'vitesse_moy_mesuree', role: 'point', unit: 'm/s', ref: 'vitesse_moy_reference' },
    { label: 'Débit d’air extrait', mesure: 'debit_mesure', role: 'point', unit: 'm³/h', ref: 'debit_reference' }
  ] },
  hottes: { cat: 'sp', polluant: 'Selon le procédé (poussières, fumées, vapeurs)', lignes: [
    { label: 'Vitesse minimale dans le plan d’ouverture', mesure: 'vpe_min', mini: 'vpe_min_inrs', miniLabel: 'Valeur recommandée (INRS)', avis: 'avis_vpe_min', unit: 'm/s', ref: 'vpe_min_reference' },
    { label: 'Vitesse moyenne dans le plan d’ouverture', mesure: 'vpe_moyenne', mini: 'vpe_moy_inrs', miniLabel: 'Valeur recommandée (INRS)', avis: 'avis_vpe_moy', unit: 'm/s', ref: 'vpe_moy_reference' },
    { label: 'Débit d’air extrait', mesure: 'vpe_debit', role: 'point', unit: 'm³/h' },
    { label: 'Vitesse de transport', mesure: 'vt_mesuree', mini: 'vt_inrs', miniLabel: 'Valeur recommandée (INRS)', avis: 'avis_vt', unit: 'm/s', ref: 'vt_reference' }
  ] },
  bras_aspiration: { cat: 'sp', polluant: 'Fumées de soudage', polluantChamp: 'activite', lignes: [
    { label: 'Vitesse dans la bouche d’aspiration', mesure: 'vitesse_moyenne', role: 'point', unit: 'm/s' },
    { label: 'Débit d’air extrait', mesure: 'debit_calcule', role: 'point', unit: 'm³/h' },
    { label: 'Distance maximale de captage', mesure: 'distance_max_captage', role: 'point', unit: 'cm' }
  ] },
  cabines_peinture: { cat: 'sp', polluant: 'Aérosols de peinture et solvants', lignes: [
    { label: 'Vitesse moyenne de l’air dans la cabine', mesure: 'v1_mesuree', mini: 'v1_valeur_recommandee', miniLabel: 'Valeur recommandée', avis: 'v1_avis', unit: 'm/s', ref: 'v1_reference' },
    { label: 'Vitesse minimale de l’air dans la cabine', mesure: 'v2_mesuree', mini: 'v2_valeur_recommandee', miniLabel: 'Valeur recommandée', avis: 'v2_avis', unit: 'm/s', ref: 'v2_reference' },
    { label: 'Débit d’air extrait', mesure: 'debit_mesure', avis: 'debit_avis', unit: 'm³/h', ref: 'debit_reference' },
    { label: 'Pression statique au point de mesure', mesure: 'pression_statique', unit: 'Pa', role: 'point' }
  ] },
  installations_diverses: { cat: 'sp', polluant: 'Selon le procédé', lignes: [
    { label: 'Vitesse au point d’émission', mesure: 'vpe_mesuree', mini: 'vpe_inrs', miniLabel: 'Valeur recommandée (INRS)', avis: 'avis_vpe', unit: 'm/s', ref: 'vpe_reference' },
    { label: 'Vitesse de transport', mesure: 'vt_mesuree', mini: 'vt_inrs', miniLabel: 'Valeur recommandée (INRS)', avis: 'avis_vt', unit: 'm/s', ref: 'vt_reference' },
    { label: 'Débit d’air extrait', mesure: 'debit_vt', role: 'point', unit: 'm³/h' },
    { label: 'Pression statique au point de mesure', mesure: 'pression_statique', unit: 'Pa', role: 'point' }
  ] },
  gaz_echappement: { cat: 'sp', polluant: 'Gaz d’échappement des moteurs (CO, NOx, particules)', lignes: [
    { label: 'Débit d’air extrait', mesure: 'debit_mesure', mini: 'debit_min_inrs', miniLabel: 'Débit préconisé (INRS)', unit: 'm³/h', ref: 'debit_reference' }
  ].concat(DVR_POINTS_CONDUIT) },
  menuiserie: { cat: 'sp', polluant: 'Poussières de bois', lignes: [
    { label: 'Débit global d’air extrait du réseau', mesure: 'debit_annee_en_cours', mini: 'valeur_reference_recommandee', miniLabel: 'Valeur de référence ou recommandée', unit: 'm³/h', ref: 'valeur_reference_recommandee' }
  ].concat(DVR_POINTS_CONDUIT) },
  menuiserie_bis: { cat: 'sp', polluant: 'Poussières de bois', lignes: [
    { label: 'Vitesse de transport', mesure: 'vitesse_moyenne', mini: 'vitesse_inrs_ed750', miniLabel: 'Valeur recommandée (ED 750)', avis: 'vitesse_avis', unit: 'm/s', ref: 'vitesse_reference' },
    { label: 'Débit d’air extrait', mesure: 'debit', mini: 'debit_inrs_ed750', miniLabel: 'Valeur recommandée (ED 750)', avis: 'debit_avis', unit: 'm³/h', ref: 'debit_reference' },
    { label: 'Pression statique au point de mesure', mesure: 'pression_statique', unit: 'Pa', role: 'point' }
  ] },
  box_peinture: { cat: 'sp', polluant: 'Solvants (préparation des peintures)', lignes: [
    { label: 'Débit d’extraction du box', mesure: 'debit_extraction_box', mini: 'debit_minimal_50vh', miniLabel: 'Minimum normatif (50 vol/h)', avis: 'conclusion_renouvellement', unit: 'm³/h' },
    { label: 'Vitesse dans le conduit du captage n°1', mesure: 'captage1_vitesse_moyenne', role: 'point', unit: 'm/s' },
    { label: 'Pression statique du captage n°1', mesure: 'captage1_pression_statique', role: 'point', unit: 'Pa' }
  ] },
  torches_aspirantes: { cat: 'sp', polluant: 'Fumées de soudage', lignes: [
    { label: 'Débit total extrait', mesure: 'total_debit', role: 'point', unit: 'm³/h' }
  ] },
  locaux_charge: { cat: 'sp', polluant: 'Hydrogène dégagé pendant la charge', lignes: [
    { label: 'Débit d’air extrait du local', mesure: 'debit_mesure_local', mini: 'valeur_inrs', miniLabel: 'Débit préconisé (INRS)', unit: 'm³/h', ref: 'valeur_reference' }
  ] },
  tts: { cat: 'sp', polluant: 'Vapeurs et aérosols des bains de traitement', lignes: [
    { label: 'Débit d’air extrait', mesure: 'debit_mesure', mini: 'debit_min_inrs', miniLabel: 'Débit minimal (INRS)', unit: 'm³/h', ref: 'debit_reference' },
    { label: 'Débit d’air extrait par les fentes', mesure: 'debit_mesure_fentes', avis: 'avis_fentes', role: 'point', unit: 'm³/h', ref: 'debit_reference_fentes' },
    { label: 'Pression statique au point de mesure', mesure: 'pression_statique', unit: 'Pa', role: 'point' }
  ] }
};

var DVR_FILTRES = [['pre', 'Pré-filtre'], ['filtre', 'Filtre'], ['absolu', 'Filtre absolu']];

function dvrNum(v) {
  if (v === undefined || v === null || v === '') return null;
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function dvrFmt(v, unit) {
  var n = dvrNum(v);
  if (n === null) return '';
  var f = (unit === 'm³/h') ? 1 : 100;
  return frDisplay(String(Math.round(n * f) / f));
}

// Origines possibles d'une valeur proposée
var DVR_ORIGINE = { releve: 'Valeur relevée', mini: 'Minimum réglementaire ou normatif', adefinir: 'À définir par le maître d’ouvrage', so: 'Sans objet' };

// Proposition pour une ligne : { releve, propose, origine, note }
function dvrLigne(t, inst, ligne) {
  var d = inst.data;
  var avisGlobal = d[resolveAvisFieldKey(t)];
  var releve = ligne.mesure ? dvrFmt(d[ligne.mesure], ligne.unit) : '';
  var mini = ligne.mini ? dvrFmt(d[ligne.mini], ligne.unit) : '';
  var miniLabel = ligne.miniLabel || DVR_ORIGINE.mini;
  var avis = ligne.avis ? d[ligne.avis] : avisGlobal;
  if (typeof avisGlobal === 'string' && /^Sans Objet/i.test(avisGlobal) && !ligne.avis) {
    return { releve: releve, propose: '', origine: 'so', label: DVR_ORIGINE.so };
  }
  if (ligne.role === 'mini') {
    return mini ? { releve: '', propose: mini, origine: 'mini', label: miniLabel } : { releve: '', propose: '', origine: 'adefinir', label: DVR_ORIGINE.adefinir };
  }
  if (ligne.role === 'adefinir') return { releve: releve, propose: '', origine: 'adefinir', label: DVR_ORIGINE.adefinir };
  if (releve && avis === 'Satisfaisant') return { releve: releve, propose: releve, origine: 'releve', label: DVR_ORIGINE.releve };
  // Installation (ou critère) non satisfaisant(e) ou indéterminé(e) : jamais la valeur relevée
  if (mini && ligne.role !== 'point') return { releve: releve, propose: mini, origine: 'mini', label: miniLabel };
  return { releve: releve, propose: '', origine: 'adefinir', label: DVR_ORIGINE.adefinir + (releve ? ' après remise en conformité' : '') };
}

function dvrData(m) {
  if (!m.dvr) m.dvr = { actif: false, polluants: {}, exclus: {}, valideLe: '', valeurs: null };
  if (!m.dvr.polluants) m.dvr.polluants = {};
  if (!m.dvr.exclus) m.dvr.exclus = {};
  return m.dvr;
}

function dvrPolluant(m, t, inst) {
  var cfg = DVR_CONFIG[t.id] || {};
  var dv = dvrData(m);
  if (dv.polluants[inst.id]) return dv.polluants[inst.id];
  var act = cfg.polluantChamp ? String(inst.data[cfg.polluantChamp] || '').trim() : '';
  if (act && !/^[\/-]$/.test(act)) return 'Selon l’activité : ' + act;
  return cfg.polluant || '';
}

// Toutes les installations relevables de la mission, groupées par catégorie
function dvrItems(m) {
  return overviewOrderedItems(m).filter(function (it) {
    return DVR_CONFIG[it.type.id] && it.status.state === 'done' && !it.status.nc;
  }).map(function (it) {
    var cfg = DVR_CONFIG[it.type.id];
    var lignes = cfg.lignes.map(function (l) { return { def: l, val: dvrLigne(it.type, it.inst, l) }; })
      .filter(function (x) { return x.val.releve || x.val.propose || x.def.role === 'mini'; });
    return { it: it, cfg: cfg, lignes: lignes };
  });
}

function setDvrActif(on) {
  var m = getCurrentMission();
  if (!m) return;
  dvrData(m).actif = !!on;
  persistMissions();
  render();
}

function updateDvrPolluant(instId, value) {
  var m = getCurrentMission();
  if (!m) return;
  dvrData(m).polluants[instId] = value;
  persistMissions();
}

function toggleDvrExclu(instId) {
  var m = getCurrentMission();
  if (!m) return;
  var dv = dvrData(m);
  if (dv.exclus[instId]) delete dv.exclus[instId]; else dv.exclus[instId] = true;
  persistMissions();
  render();
}

// Validation par le client : fige les valeurs proposées (reprises à la visite suivante)
function setDvrValidation(dateStr) {
  var m = getCurrentMission();
  if (!m) return;
  var dv = dvrData(m);
  dv.valideLe = String(dateStr || '').trim();
  dv.valeurs = dv.valideLe ? dvrSnapshot(m) : null;
  persistMissions();
  render();
}

function dvrSnapshot(m) {
  var dv = dvrData(m), out = {};
  dvrItems(m).forEach(function (x) {
    if (dv.exclus[x.it.inst.id]) return;
    x.lignes.forEach(function (l) {
      if (l.def.ref && l.val.propose) (out[x.it.inst.id] = out[x.it.inst.id] || {})[l.def.ref] = l.val.propose;
    });
  });
  return out;
}

// Préremplissage N-1 (js/state.js createMissionFromPreviousSite) : les valeurs du relevé validé
// deviennent les valeurs de référence de la nouvelle visite (sans écraser une référence déjà saisie).
function dvrReferencesFor(source, sourceInst) {
  var dv = source && source.dvr;
  if (!dv || !dv.valideLe || !dv.valeurs || !sourceInst) return null;
  return dv.valeurs[sourceInst.id] || null;
}

// ————————————————————————————————————————————
// Écran
// ————————————————————————————————————————————

function renderDvrMissionOption(m) {
  var dv = dvrData(m);
  return '<div class="card"><div class="section-title">Prestation complémentaire</div>' +
    '<label class="appareil-choice"><input type="checkbox"' + (dv.actif ? ' checked' : '') + ' onchange="setDvrActif(this.checked);">' +
    '<span><span class="appareil-choice-nom">Relevé pour le dossier de valeurs de référence</span>' +
    '<span class="subtitle">À cocher si la prestation est prévue au devis (arrêté du 8 octobre 1987, art. 2 à 4). Document distinct du rapport.</span></span></label></div>';
}

function renderDvr() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  var dv = dvrData(m);
  var items = dvrItems(m);
  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(m.clientSite || 'Mission') + '</button>';
  h += '<div class="card"><h1>' + ICONS.clipboard + ' Valeurs de référence</h1>' +
    '<p class="subtitle">Relevé pour l’établissement du dossier de valeurs de référence (arrêté du 8 octobre 1987). SOCOTEC relève et propose ; le chef d’établissement valide et l’intègre à la notice d’instructions.</p></div>';
  h += '<div class="card dvr-regle"><b>Règle appliquée :</b> une valeur relevée n’est proposée comme référence que si le critère est satisfaisant. ' +
    'Sinon, le minimum réglementaire ou normatif est proposé, ou la valeur reste à définir par le maître d’ouvrage après remise en conformité.</div>';
  if (!items.length) return h + '<div class="empty-state"><p>Aucune installation mesurée pour l’instant.</p></div>';

  DVR_CATEGORIES.forEach(function (cat) {
    var list = items.filter(function (x) { return x.cfg.cat === cat.key; });
    if (!list.length) return;
    h += '<div class="section-title">' + escapeHtml(cat.titre) + ' <span class="subtitle" style="text-transform:none;">· ' + escapeHtml(cat.article) + '</span></div>';
    list.forEach(function (x) {
      var inst = x.it.inst, exclu = !!dv.exclus[inst.id];
      h += '<div class="card dvr-item' + (exclu ? ' dvr-exclu' : '') + '">';
      h += '<div class="dvr-head"><div><div class="overview-row-kicker">' + escapeHtml(x.it.type.label) + '</div>' +
        '<div class="overview-row-title">' + escapeHtml(verifInstallationTitle(x.it)) + '</div></div>' +
        '<button class="btn btn-gray btn-small" onclick="toggleDvrExclu(' + inst.id + ');">' + (exclu ? 'Inclure' : 'Exclure') + '</button></div>';
      if (!exclu) {
        if (x.cfg.cat === 'sp') {
          h += '<div class="field" style="margin-top:8px;"><label class="label">Polluant(s) représentatif(s)</label>' +
            '<input type="text" class="input" value="' + escapeHtml(dvrPolluant(m, x.it.type, inst)) + '" onchange="updateDvrPolluant(' + inst.id + ',this.value);"></div>';
        }
        h += '<div class="dvr-lignes">';
        x.lignes.forEach(function (l) {
          h += '<div class="dvr-ligne"><div class="dvr-ligne-label">' + escapeHtml(l.def.label) + '</div>' +
            '<div class="dvr-ligne-vals">' + (l.val.releve ? '<span class="subtitle">relevé ' + escapeHtml(l.val.releve) + ' ' + escapeHtml(l.def.unit || '') + '</span>' : '') +
            '<span class="dvr-propose dvr-' + l.val.origine + '">' + (l.val.propose ? escapeHtml(l.val.propose) + ' ' + escapeHtml(l.def.unit || '') : '—') + '</span></div>' +
            '<div class="dvr-origine">' + escapeHtml(l.val.label) + '</div></div>';
        });
        h += '</div>';
      }
      h += '</div>';
    });
  });

  h += '<div class="card"><div class="section-title" style="margin-top:0;">Validation par le client</div>' +
    '<p class="subtitle">Une fois le relevé signé par le chef d’établissement, indiquez la date : les valeurs seront reprises comme références lors de la prochaine visite (« Charger un site précédent »).</p>' +
    '<div class="row" style="align-items:center;margin-top:8px;"><input type="text" inputmode="numeric" class="input" style="flex:1;" placeholder="jj/mm/aaaa" value="' + escapeHtml(dv.valideLe || '') + '" onchange="setDvrValidation(this.value);">' +
    (dv.valideLe ? '' : '<button class="btn btn-gray btn-small" onclick="setDvrValidation(todayFr());">Aujourd’hui</button>') + '</div>' +
    (dv.valideLe ? '<div class="appareil-badge status-ok" style="margin-top:8px;">Relevé validé le ' + escapeHtml(dv.valideLe) + '</div>' : '') + '</div>';
  h += '<button class="btn btn-primary" onclick="exportDvrPdf(false);">' + ICONS.download + ' Télécharger le relevé (PDF)</button>';
  h += '<button class="btn btn-gray" onclick="exportDvrPdf(true);">' + ICONS.upload + ' Envoyer le relevé</button>';
  return h;
}

// ————————————————————————————————————————————
// Document PDF
// ————————————————————————————————————————————

function dvrDocDefinition(m, logo) {
  var dv = dvrData(m);
  var di = m.donneesInternes || {}, ic = m.infosClient || {}, si = m.infosSiteIntervention || {};
  var BLUE = '#0082DE';
  var COLORS = { releve: '#166534', mini: '#92400E', adefinir: '#555555', so: '#555555' };
  var cell = function (t, o) { return Object.assign({ text: t === undefined || t === null || t === '' ? '-' : String(t), fontSize: 8, margin: [3, 2, 3, 2] }, o || {}); };
  var head = function (t, o) { return cell(t, Object.assign({ bold: true, color: 'white', fillColor: BLUE }, o || {})); };
  var layout = { hLineColor: function () { return '#B7D7F0'; }, vLineColor: function () { return '#B7D7F0'; }, hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } };
  var dateVisite = di.datesIntervention || m.dateControle || '';

  var content = [];
  content.push({ columns: [
    logo ? { image: logo, width: 46 } : { text: '' },
    { stack: [{ text: 'RELEVÉ POUR L’ÉTABLISSEMENT DU DOSSIER DE VALEURS DE RÉFÉRENCE', bold: true, fontSize: 12.5, color: BLUE },
      { text: 'Installations d’aération et d’assainissement des locaux de travail — arrêté du 8 octobre 1987', fontSize: 9, color: '#333' }], margin: [12, 6, 0, 0] }
  ], margin: [0, 0, 0, 10] });
  content.push({ table: { widths: [110, '*'], body: [
    [head('Établissement'), cell(ic.nomEntreprise || m.clientSite)],
    [head('Site'), cell([si.siteIntervention, [si.adresseSite, si.codePostal, si.ville].filter(Boolean).join(' ')].filter(Boolean).join(' – '))],
    [head('Date(s) du relevé'), cell(dateVisite)],
    [head('Relevé effectué par'), cell((di.auteurRapport || m.controleur || '') + ' — SOCOTEC')],
    [head('N° d’affaire'), cell(di.numeroAffaire)]
  ] }, layout: layout, margin: [0, 0, 0, 10] });

  content.push({ text: 'Cadre', bold: true, fontSize: 10, color: BLUE, margin: [0, 0, 0, 3] });
  content.push({ text: 'Le dossier de valeurs de référence fixe les caractéristiques qualitatives et quantitatives de l’installation qui garantissent le respect des spécifications réglementaires et permettent les contrôles ultérieurs par comparaison (arrêté du 8 octobre 1987, art. 2). Pour une installation existante, il peut être établi lors de contrôles à l’initiative du chef d’établissement. ' +
    'Le présent document rassemble les valeurs relevées par SOCOTEC lors du contrôle' + (dateVisite ? ' du ' + dateVisite : '') + '. Il appartient au chef d’établissement de les valider et de les intégrer à la notice d’instructions de l’installation.', fontSize: 8.5, alignment: 'justify', margin: [0, 0, 0, 6] });
  content.push({ text: [{ text: 'Règle d’établissement : ', bold: true }, 'une valeur relevée n’est proposée comme référence que lorsque le critère applicable (exigence réglementaire, valeur normative ou recommandée) est satisfait. Dans le cas contraire, la valeur proposée est le minimum réglementaire ou normatif applicable ; à défaut, elle est à définir par le maître d’ouvrage après remise en conformité. Les vitesses et pressions sont associées aux débits relevés, aux points de mesure décrits dans le rapport de contrôle.'],
    fontSize: 8.5, alignment: 'justify', margin: [0, 0, 0, 10] });

  var items = dvrItems(m).filter(function (x) { return !dv.exclus[x.it.inst.id]; });
  DVR_CATEGORIES.forEach(function (cat) {
    var list = items.filter(function (x) { return x.cfg.cat === cat.key; });
    if (!list.length) return;
    content.push({ text: cat.titre + ' (' + cat.article + ')', bold: true, fontSize: 10.5, color: BLUE, margin: [0, 6, 0, 4] });
    list.forEach(function (x) {
      var inst = x.it.inst, block = [];
      block.push({ text: [{ text: x.it.type.label, bold: true }, ' — ' + verifInstallationTitle(x.it)], fontSize: 9, margin: [0, 4, 0, 2] });
      if (x.cfg.cat === 'sp') {
        var refEd = (typeof getEdReferenceForType === 'function' && getEdReferenceForType(x.it.type.id)) || null;
        block.push({ text: [{ text: 'Polluant(s) représentatif(s) : ', bold: true }, dvrPolluant(m, x.it.type, inst) || 'à préciser par le chef d’établissement',
          refEd && refEd.badge ? { text: '   ·   Efficacité de captage : par conformité au référentiel ' + refEd.badge + ' (débits et géométrie du captage)' } : ''], fontSize: 8, margin: [0, 0, 0, 3] });
      }
      var body = [[head('Grandeur'), head('Valeur relevée', { alignment: 'center' }), head('Valeur de référence proposée', { alignment: 'center' }), head('Origine')]];
      x.lignes.forEach(function (l) {
        var u = l.def.unit ? ' ' + l.def.unit : '';
        body.push([cell(l.def.label), cell(l.val.releve ? l.val.releve + u : '-', { alignment: 'center' }),
          cell(l.val.propose ? l.val.propose + u : '-', { alignment: 'center', bold: !!l.val.propose }),
          cell(l.val.label, { color: COLORS[l.val.origine] || '#333', italics: l.val.origine === 'adefinir' })]);
      });
      if (x.cfg.filtres) {
        DVR_FILTRES.forEach(function (f) {
          var classe = inst.data['filt_' + f[0] + '_classe'], type = inst.data['filt_' + f[0] + '_type'], pdc = inst.data['filt_' + f[0] + '_perte_charge'];
          if (!classe && !type && !pdc) return;
          body.push([cell(f[1] + ' — type et classe d’efficacité'), cell([type, classe].filter(Boolean).join(' · ') || '-', { alignment: 'center' }),
            cell([type, classe].filter(Boolean).join(' · ') || '-', { alignment: 'center', bold: true }), cell('Filtre en place (relevé)', { color: COLORS.releve })]);
          body.push([cell(f[1] + ' — perte de charge initiale / maximale admise'), cell(dvrFmt(pdc) ? dvrFmt(pdc) + ' Pa' : '-', { alignment: 'center' }), cell('-', { alignment: 'center' }),
            cell('Donnée constructeur à reporter', { color: COLORS.adefinir, italics: true })]);
        });
      }
      block.push({ table: { headerRows: 1, widths: ['*', 75, 95, 140], body: body }, layout: layout });
      content.push({ stack: block, unbreakable: true, margin: [0, 0, 0, 6] });
    });
  });

  content.push({ unbreakable: true, stack: [
    { text: 'Validation par le chef d’établissement', bold: true, fontSize: 10.5, color: BLUE, margin: [0, 12, 0, 4] },
    { text: 'Les valeurs proposées ci-dessus sont adoptées comme valeurs de référence de l’installation et intégrées à la notice d’instructions (arrêté du 8 octobre 1987, art. 2).', fontSize: 8.5, margin: [0, 0, 0, 6] },
    { table: { widths: ['*', '*', 90, 150], body: [[head('Nom'), head('Fonction'), head('Date'), head('Signature')],
      [cell(' ', { margin: [3, 18, 3, 18] }), cell(' '), cell(dv.valideLe || ' '), cell(' ')]] }, layout: layout }
  ] });

  return {
    pageSize: 'A4', pageMargins: [36, 30, 36, 36],
    defaultStyle: { font: 'Arial', fontSize: 9 },
    info: { title: 'Relevé des valeurs de référence – ' + (m.clientSite || '') },
    footer: function (page, pages) {
      return { columns: [{ text: di.numeroAffaire ? 'N° d’affaire : ' + di.numeroAffaire : '', fontSize: 7, color: '#777' },
        { text: page + '/' + pages, alignment: 'right', fontSize: 7, color: '#777' }], margin: [36, 12, 36, 0] };
    },
    content: content
  };
}

function exportDvrPdf(share) {
  var m = getCurrentMission();
  if (!m) return;
  ensureLib('pdf').then(function () { return pdfFetchAsDataUrl(LOGO_PATH); }).then(function (logo) {
    var pdf = pdfMake.createPdf(dvrDocDefinition(m, logo));
    var name = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').trim() + '_releve_valeurs_reference.pdf';
    if (share) offerPdfShare(pdf, name, missionMailDraft(m, 'Relevé des valeurs de référence'));
    else pdf.download(name);
  }).catch(function (err) { alert('Erreur lors de la génération du relevé.\n' + err.message); });
}

console.log('✓ Relevé des valeurs de référence chargé');
