// terrain-assist.js - Aides à la saisie terrain (chantier "aides terrain", 2026-10)
// Quatre fonctions indépendantes, branchées sur les écrans existants sans changer le format des
// données d'installation :
//   1. Phrases types : insertion en un geste dans les champs remarque/observation/commentaire.
//   2. Écart N-1 : alerte sous une mesure qui s'écarte fortement de la valeur de l'an dernier.
//   3. Vérification avant départ : écran listant ce qui manque encore sur le site.
//   4. Appareils de mesure : déclarés une fois dans le profil, choisis par mission, repris dans le
//      rapport PDF avec leur date d'étalonnage.

// ————————————————————————————————————————————
// 1. Phrases types
// ————————————————————————————————————————————

// Seuls les champs de remarque libre reçoivent des phrases types — pas les textarea descriptifs
// (activite_reference_local, reference_equipement, simultaneites) qui décrivent l'installation.
var PHRASES_FIELD_KEY_PATTERN = /^(observation|observations|observation_visuel|commentaire|commentaire_\d|remarque|conclusion)$/;

function isRemarkField(f) {
  return f.type === 'textarea' && PHRASES_FIELD_KEY_PATTERN.test(f.key);
}

// Jeu de départ volontairement court, à enrichir : chaque technicien ajoute ses propres phrases
// (stockées sur son appareil, cf. PHRASES_PERSO_KEY).
var PHRASES_TYPES_COMMUNES = [
  'RAS.',
  'Installation en bon état apparent.',
  'Installation à l’arrêt le jour du contrôle : mesure non réalisée.',
  'Point de mesure inaccessible : mesure non réalisée.',
  'Dossier de valeurs de référence non communiqué.'
];

var PHRASES_TYPES_PAR_TYPE = {
  bureaux: ['Bouches encrassées : nettoyage à prévoir.', 'Débit d’air neuf insuffisant au regard de l’effectif constaté.', 'Bouche d’extraction obstruée.'],
  erp: ['Bouches encrassées : nettoyage à prévoir.', 'Débit d’air neuf insuffisant au regard de l’effectif constaté.', 'Bouche d’extraction obstruée.'],
  sanitaires: ['Bouche d’extraction encrassée : nettoyage à prévoir.', 'Absence de bouche d’extraction.', 'Bouche d’extraction obstruée.'],
  locaux_fumeurs: ['Local en surpression par rapport aux locaux adjacents.', 'Porte du local maintenue ouverte.'],
  cta: ['Filtres encrassés : remplacement à prévoir.', 'Courroie du ventilateur usée : remplacement à prévoir.', 'Fiche de maintenance absente sur la CTA.', 'Prise d’air neuf à proximité d’une source de pollution.'],
  extracteur: ['Rejet à proximité d’une prise d’air neuf.', 'Débit en baisse par rapport à l’année précédente : vérifier le ventilateur.'],
  sorbonnes: ['Sorbonne encombrée : désencombrer le plan de travail.', 'Châssis ouvert au-delà de la hauteur de travail.', 'Dispositif d’alarme absent ou hors service.'],
  hottes: ['Vitesse au point d’émission insuffisante : vérifier le ventilateur et l’état du réseau.', 'Filtres à graisse encrassés : nettoyage à prévoir.', 'Hotte trop éloignée de la source d’émission.'],
  bras_aspiration: ['Bras utilisé trop loin de la source d’émission.', 'Bras difficile à positionner : vérifier les articulations.', 'Flexible endommagé : remplacement à prévoir.'],
  cabines_peinture: ['Filtres de la cabine encrassés : remplacement à prévoir.', 'Présence de zones mortes au test fumigène.', 'Portes de la cabine laissées ouvertes en fonctionnement.'],
  box_peinture: ['Filtres encrassés : remplacement à prévoir.', 'Présence de zones mortes au test fumigène.'],
  installations_diverses: ['Vitesse au point d’émission insuffisante : vérifier le ventilateur et l’état du réseau.', 'Captage trop éloigné de la source d’émission.'],
  gaz_echappement: ['Embout de captage endommagé : remplacement à prévoir.', 'Flexible endommagé : remplacement à prévoir.'],
  menuiserie: ['Dépoussiéreur : vérifier l’état des manches filtrantes.', 'Clapets de machines à l’arrêt restés ouverts.', 'Fuites constatées sur le réseau.'],
  menuiserie_bis: ['Capotage de la machine incomplet.', 'Flexible de raccordement endommagé.'],
  torches_aspirantes: ['Buse de la torche encrassée : nettoyage à prévoir.', 'Flexible d’aspiration endommagé.'],
  locaux_charge: ['Grilles de ventilation obstruées.', 'Ventilation mécanique asservie à la charge.'],
  tts: ['Captage en bord de cuve obstrué.', 'Couvercle de cuve absent.']
};

var PHRASES_PERSO_KEY = 'aeration_phrases_perso_v1';

function getPhrasesPerso() {
  try {
    var p = JSON.parse(localStorage.getItem(PHRASES_PERSO_KEY) || '{}');
    return (p && typeof p === 'object') ? p : {};
  } catch (e) { return {}; }
}

function phrasesForType(typeId) {
  return {
    defaut: PHRASES_TYPES_COMMUNES.concat(PHRASES_TYPES_PAR_TYPE[typeId] || []),
    perso: getPhrasesPerso()[typeId] || []
  };
}

// Panneau replié par défaut (un seul ouvert à la fois, jamais persisté) : un bouton discret sous
// le champ, pour ne pas alourdir l'écran quand le technicien n'en a pas besoin.
function phrasesTypesHtml(typeId, f) {
  if (!isRemarkField(f)) return '';
  var openKey = typeId + ':' + f.key;
  var isOpen = state.phrasesOpen === openKey;
  var h = '<div class="phrases-types">';
  h += '<button type="button" class="phrases-toggle" onclick="togglePhrasesTypes(\'' + typeId + '\',\'' + f.key + '\');">' +
    ICONS.list + ' Phrases types' + (isOpen ? ' ▴' : ' ▾') + '</button>';
  if (isOpen) {
    var p = phrasesForType(typeId);
    h += '<div class="phrases-chips">';
    p.defaut.forEach(function (txt, i) {
      h += '<button type="button" class="phrase-chip" onclick="insertPhraseType(\'' + typeId + '\',\'' + f.key + '\',\'d\',' + i + ');">' + escapeHtml(txt) + '</button>';
    });
    p.perso.forEach(function (txt, i) {
      h += '<span class="phrase-chip phrase-chip-perso"><span onclick="insertPhraseType(\'' + typeId + '\',\'' + f.key + '\',\'p\',' + i + ');">' + escapeHtml(txt) + '</span>' +
        '<button type="button" class="phrase-chip-del" title="Supprimer cette phrase" onclick="deletePhrasePerso(\'' + typeId + '\',' + i + ');">×</button></span>';
    });
    h += '<button type="button" class="phrase-chip phrase-chip-add" onclick="addPhrasePerso(\'' + typeId + '\');">' + ICONS.plus + ' Ma phrase</button>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}

function togglePhrasesTypes(typeId, key) {
  var k = typeId + ':' + key;
  state.phrasesOpen = (state.phrasesOpen === k) ? null : k;
  render();
}

// Ajoute la phrase à la suite du texte existant (jamais d'écrasement), sur une nouvelle ligne.
function insertPhraseType(typeId, key, source, idx) {
  var p = phrasesForType(typeId);
  var txt = (source === 'p' ? p.perso : p.defaut)[idx];
  var inst = getCurrentInstallation(typeId);
  if (!inst || !txt) return;
  var cur = inst.data[key] ? String(inst.data[key]) : '';
  if (cur.indexOf(txt) !== -1) return; // déjà présente : un double tap ne la duplique pas
  updateInstallationField(typeId, key, cur ? cur.replace(/\s+$/, '') + '\n' + txt : txt);
}

function addPhrasePerso(typeId) {
  var t = getInstallationType(typeId);
  var txt = prompt('Nouvelle phrase type pour « ' + (t ? t.label : typeId) + ' » :');
  if (!txt || !txt.trim()) return;
  var all = getPhrasesPerso();
  all[typeId] = (all[typeId] || []).concat([txt.trim()]);
  saveData(PHRASES_PERSO_KEY, all);
  render();
}

function deletePhrasePerso(typeId, idx) {
  var all = getPhrasesPerso();
  if (!all[typeId] || !all[typeId][idx]) return;
  if (!confirm('Supprimer la phrase « ' + all[typeId][idx] + ' » ?')) return;
  all[typeId].splice(idx, 1);
  saveData(PHRASES_PERSO_KEY, all);
  render();
}

// ————————————————————————————————————————————
// 2. Écart avec l'année précédente
// ————————————————————————————————————————————

// Au-delà de 30 % d'écart, la mesure est signalée : faute de frappe probable (45 au lieu de 4,5)
// ou vraie dérive de l'installation — dans les deux cas, à revérifier tant qu'on est sur place.
var N1_ECART_SEUIL = 0.30;

function parseMesure(v) {
  if (v === undefined || v === null || v === '') return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

// Renvoie null si la comparaison n'a pas de sens : une des deux valeurs absente ou nulle — un débit
// calculé vaut 0 tant que la section ou la vitesse n'est pas saisie, ce qui donnerait une fausse
// alerte "−100 %" en pleine saisie.
function n1Ecart(cur, n1) {
  var c = parseMesure(cur), p = parseMesure(n1);
  if (isNaN(c) || isNaN(p) || c === 0 || p === 0) return null;
  var pct = (c - p) / Math.abs(p);
  return { pct: pct, fort: Math.abs(pct) >= N1_ECART_SEUIL };
}

function formatEcartPct(pct) {
  var v = Math.round(pct * 100);
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' %';
}

// ————————————————————————————————————————————
// 3. Vérification avant de quitter le site
// ————————————————————————————————————————————

// Mêmes règles que l'état "À saisir" des écrans en étapes (fieldState) : tout champ visible, non
// calculé et non optionnel est attendu. Sont en plus écartés : les champs de remarque libre (souvent
// vides à juste titre) et les valeurs N-1 (vides tant qu'il n'y a pas d'historique sur le site).
function verifMissingFields(t, inst) {
  var n1Keys = n1PairedFieldKeys(t.id);
  var n1Only = {};
  (N1_COMPARISON_FIELDS[t.id] || []).forEach(function (p) { n1Only[p.n1] = true; });
  var missing = [];
  function check(f, stepIdx, stepTitle) {
    if (!f || f.type === 'section' || f.type === 'computed') return;
    if (f.optional && !(typeof dvrExigeChamp === 'function' && dvrExigeChamp(f))) return; // pression statique : dossier de valeurs de référence
    if (isRemarkField(f) || n1Only[f.key]) return;
    if (f.showIf && !evalShowIf(f.showIf, inst.data)) return;
    if (fieldEmptyValue(inst.data[f.key])) missing.push({ label: f.label, stepIdx: stepIdx, stepTitle: stepTitle });
  }
  var steps = (typeof WIZARD_STEPS !== 'undefined' && WIZARD_STEPS[t.id]) || null;
  if (steps) {
    steps.forEach(function (s, i) {
      if (!gwStepVisible(t.id, s, inst)) return;
      gwStepFields(t.id, s).forEach(function (f) { check(f, i, s.title); });
    });
  } else {
    t.fields.forEach(function (f) { check(f, null, null); });
  }
  return missing;
}

function verifEcarts(t, inst) {
  var out = [];
  (N1_COMPARISON_FIELDS[t.id] || []).forEach(function (pair) {
    var e = n1Ecart(inst.data[pair.current], inst.data[pair.n1]);
    if (!e || !e.fort) return;
    var f = t.fields.find(function (x) { return x.key === pair.current; });
    out.push({ label: f ? f.label : pair.current, cur: inst.data[pair.current], n1: inst.data[pair.n1], pct: e.pct });
  });
  return out;
}

function computeVerification(m) {
  var typesAffiches = INSTALLATION_TYPES.filter(function (t) { return (m.typesSelectionnes || []).indexOf(t.id) !== -1; });
  var items = listAllInstallations(m, typesAffiches).map(function (it) {
    var notStarted = it.status.state === 'todo', nc = !!it.status.nc; // non contrôlée (js/qualite.js) : rien à compléter
    return {
      it: it,
      notStarted: notStarted,
      missing: notStarted || nc ? [] : verifMissingFields(it.type, it.inst),
      ecarts: notStarted || nc ? [] : verifEcarts(it.type, it.inst),
      anomalies: notStarted || nc ? [] : installationAnomalies(it.type, it.inst, m),
      aRevoir: !!(it.inst.data && it.inst.data._aRevoir) // marque posée sur la fiche (js/grands-sites.js)
    };
  });

  var missionIssues = [];
  var appareils = m.appareilsMesure || [];
  if (!appareils.length) {
    missionIssues.push('Aucun appareil de mesure choisi pour cette mission (Infos mission).');
  } else {
    appareils.forEach(function (a) {
      if (etalonnageStatut(a) === 'expire') missionIssues.push('Étalonnage dépassé : ' + appareilLibelle(a) + '.');
    });
  }
  if (!items.length) missionIssues.push('Aucune installation saisie.');
  missionIssues = missionIssues.concat(missionCoherenceIssues(m));
  if (typeof devisEcarts === 'function') missionIssues = missionIssues.concat(devisEcarts(m)); // quantités du devis (js/visite.js)
  return { items: items, missionIssues: missionIssues };
}

function verifInstallationTitle(it) {
  var parts = [];
  var bat = it.inst.data && it.inst.data.batiment;
  if (bat) parts.push(bat);
  var nom = overviewRowTitle(it, 'batiment');
  if (nom && nom !== bat) parts.push(nom);
  return parts.join(' · ') || ('#' + (it.idx + 1));
}

var VERIF_MAX_CHAMPS = 6;

function renderVerificationDepart() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  var v = computeVerification(m);
  var aCompleter = v.items.filter(function (x) { return x.notStarted || x.missing.length; });
  var avecEcart = v.items.filter(function (x) { return x.ecarts.length || x.anomalies.length || x.aRevoir; });

  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' Vue d’ensemble</button>';
  h += '<div class="card"><h1>' + ICONS.check + ' Vérifier avant de partir</h1>' +
    '<p class="subtitle">Ce qui manque encore sur le site, tant qu’il est temps de refaire une mesure.</p></div>';

  h += '<div class="stat-tiles">' +
    statTile(v.items.length - aCompleter.length, 'Complètes', 'status-ok') +
    statTile(aCompleter.length, 'À compléter', aCompleter.length ? 'status-warn' : 'status-muted') +
    statTile(avecEcart.length, 'À revérifier', avecEcart.length ? 'status-bad' : 'status-muted') +
    '</div>';

  if (v.missionIssues.length) {
    h += '<div class="card verif-card"><div class="section-title">Mission</div>';
    v.missionIssues.forEach(function (msg) {
      h += '<div class="verif-line verif-line-warn" onclick="state.view=\'mission-form\';render();">' + escapeHtml(msg) + '</div>';
    });
    h += '</div>';
  }

  var nParcours = typeof parcoursCompte === 'function' ? parcoursCompte(m, v) : 0;
  if (nParcours) {
    h += '<button type="button" class="btn btn-primary" onclick="parcoursDemarrer();">Compléter à la suite (' + nParcours + ' fiche(s))</button>'; // js/fiche-plus.js
  }
  if (typeof observationsARedigerHtml === 'function') h += observationsARedigerHtml(m); // observations à rédiger (js/rapport-plus.js)
  if (typeof doublonsHtml === 'function') h += doublonsHtml(m); // doublons possibles (js/rapport-plus.js)
  if (typeof harmonisationHtml === 'function') h += harmonisationHtml(m); // noms de bâtiments (js/qualite.js)

  if (!aCompleter.length && !avecEcart.length && !v.missionIssues.length && !(typeof observationsARediger === 'function' && observationsARediger(m).length) &&
    !(typeof doublonsPossibles === 'function' && doublonsPossibles(m).length)) {
    h += '<div class="card verif-ok">' + ICONS.check + ' Tout est complet. Vous pouvez quitter le site.</div>';
    return h + (typeof memoireHtml === 'function' ? memoireHtml(m) : ''); // notes pour la visite suivante (js/rapport-plus.js)
  }

  v.items.forEach(function (x) {
    if (!x.notStarted && !x.missing.length && !x.ecarts.length && !x.anomalies.length && !x.aRevoir) return;
    var it = x.it;
    h += '<div class="card verif-card">';
    h += '<div class="verif-head" onclick="openVerificationTarget(\'' + it.type.id + '\',' + it.idx + ',null);">' +
      '<div><div class="overview-row-kicker">' + escapeHtml(it.type.label) + '</div>' +
      '<div class="overview-row-title">' + escapeHtml(verifInstallationTitle(it)) + '</div></div>' + ICONS.chevronRight + '</div>';
    if (x.aRevoir) {
      h += '<div class="verif-line verif-line-bad" onclick="openVerificationTarget(\'' + it.type.id + '\',' + it.idx + ',null);">Marquée « à revoir »</div>';
    }
    if (x.notStarted) {
      h += '<div class="verif-line verif-line-warn" onclick="openVerificationTarget(\'' + it.type.id + '\',' + it.idx + ',null);">Installation non commencée</div>';
    }
    x.ecarts.forEach(function (e) {
      h += '<div class="verif-line verif-line-bad">' + escapeHtml(e.label) + ' : ' + escapeHtml(frDisplay(e.cur)) +
        ' (N-1 : ' + escapeHtml(frDisplay(e.n1)) + ', écart ' + formatEcartPct(e.pct) + ')</div>';
    });
    // Valeurs inhabituelles et incohérences (js/controles.js) : à revérifier, pas forcément fausses
    x.anomalies.forEach(function (a) {
      h += '<div class="verif-line verif-line-bad verif-line-link" onclick="openVerificationTarget(\'' + it.type.id + '\',' + it.idx + ',' +
        (a.stepIdx === null ? 'null' : a.stepIdx) + ');">' + escapeHtml(a.label) + ' — ' + escapeHtml(a.message) + '</div>';
    });
    x.missing.slice(0, VERIF_MAX_CHAMPS).forEach(function (f) {
      h += '<div class="verif-line" onclick="openVerificationTarget(\'' + it.type.id + '\',' + it.idx + ',' +
        (f.stepIdx === null ? 'null' : f.stepIdx) + ');">' + escapeHtml(f.label) +
        (f.stepTitle ? ' <span class="verif-step">' + escapeHtml(f.stepTitle) + '</span>' : '') + '</div>';
    });
    if (x.missing.length > VERIF_MAX_CHAMPS) {
      h += '<div class="verif-more">+ ' + (x.missing.length - VERIF_MAX_CHAMPS) + ' autre(s) champ(s) à saisir</div>';
    }
    h += '</div>';
  });
  return h + (typeof memoireHtml === 'function' ? memoireHtml(m) : ''); // notes pour la visite suivante (js/rapport-plus.js)
}

// Ouvre l'installation directement sur l'étape du champ manquant : _step est la même méta-donnée
// que celle utilisée par les écrans en étapes pour reprendre au bon endroit.
function openVerificationTarget(typeId, idx, stepIdx) {
  var m = getCurrentMission();
  var inst = m && m.installations[typeId] && m.installations[typeId][idx];
  if (!inst) return;
  if (typeof stepIdx === 'number') { inst.data._step = stepIdx; persistMissions(); }
  if (typeof _gwLoadedInstKey !== 'undefined') _gwLoadedInstKey = null;
  if (typeof _sanitairesLoadedInstKey !== 'undefined') _sanitairesLoadedInstKey = null;
  openOverviewInstallation(typeId, idx);
}

// ————————————————————————————————————————————
// 4. Appareils de mesure
// ————————————————————————————————————————————

// Liste propre à l'appareil du technicien (comme son profil) ; chaque mission en garde une copie
// figée au moment du choix (m.appareilsMesure), pour que le rapport reste juste même si la date
// d'étalonnage est mise à jour plus tard dans le profil.
var APPAREILS_KEY = 'aeration_appareils_v1';
var APPAREIL_DESIGNATIONS = ['Anémomètre à fil chaud', 'Anémomètre à hélice', 'Tube de Pitot', 'Manomètre', 'Sonde de température', 'Thermo-hygromètre', 'Baromètre', 'Cône de mesure de débit', 'Générateur de fumée'];
var APPAREIL_VALIDITES = [12, 24, 36];

function getAppareils() {
  try {
    var a = JSON.parse(localStorage.getItem(APPAREILS_KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}

function saveAppareils(list) { saveData(APPAREILS_KEY, list); }

function appareilLibelle(a) {
  var nom = [a.designation, a.marqueModele].filter(Boolean).join(' ');
  return (nom || 'Appareil') + (a.numero ? ' n°' + a.numero : '');
}

// Libellé court pour le champ "Appareils de mesure utilisés" des fiches (ex : "KIMO n°24446").
function appareilLibelleCourt(a) {
  return (a.marqueModele || a.designation || 'Appareil') + (a.numero ? ' n°' + a.numero : '');
}

function etalonnageEcheance(a) {
  if (!a.dateEtalonnage) return null;
  var d = new Date(a.dateEtalonnage + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + (parseInt(a.validiteMois, 10) || 12));
  return d;
}

// 'expire' | 'bientot' (moins de 30 jours) | 'ok' | 'inconnu' (pas de date saisie)
function etalonnageStatut(a, now) {
  var ech = etalonnageEcheance(a);
  if (!ech) return 'inconnu';
  now = now || new Date();
  if (ech < now) return 'expire';
  if (ech - now < 30 * 24 * 3600 * 1000) return 'bientot';
  return 'ok';
}

function formatDateFr(iso) {
  if (!iso) return '';
  var p = String(iso).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso);
}

function etalonnageBadge(a) {
  var st = etalonnageStatut(a);
  var ech = etalonnageEcheance(a);
  if (st === 'inconnu') return '<span class="appareil-badge status-muted">Date d’étalonnage non saisie</span>';
  var txt = 'Valide jusqu’au ' + ech.toLocaleDateString('fr-FR');
  if (st === 'expire') return '<span class="appareil-badge status-bad">Étalonnage dépassé depuis le ' + ech.toLocaleDateString('fr-FR') + '</span>';
  if (st === 'bientot') return '<span class="appareil-badge status-warn">' + txt + '</span>';
  return '<span class="appareil-badge status-ok">' + txt + '</span>';
}

// --- Profil : gestion de la liste d'appareils ---

function renderAppareilsProfil() {
  var list = getAppareils();
  var h = '<div class="card"><div class="section-title">Mes appareils de mesure</div>';
  h += '<p class="subtitle">Choisis ensuite ceux utilisés dans chaque mission (Infos mission). Ils apparaissent dans le rapport avec leur date d’étalonnage.</p>';
  h += '<datalist id="appareil-designations">' + APPAREIL_DESIGNATIONS.map(function (d) { return '<option value="' + escapeHtml(d) + '">'; }).join('') + '</datalist>';
  list.forEach(function (a, i) {
    h += '<div class="appareil-edit">';
    h += '<div class="appareil-edit-head">' + etalonnageBadge(a) +
      '<button type="button" class="agent-delete" title="Supprimer cet appareil" onclick="deleteAppareil(' + i + ');">' + ICONS.trash + '</button></div>';
    h += appareilInput(i, 'designation', 'Matériel', a.designation, 'text', 'list="appareil-designations"');
    h += appareilInput(i, 'marqueModele', 'Marque / modèle', a.marqueModele, 'text');
    h += appareilInput(i, 'numero', 'N° d’identification', a.numero, 'text');
    h += appareilInput(i, 'dateEtalonnage', 'Date du dernier étalonnage', a.dateEtalonnage, 'date');
    h += '<div class="field"><label class="label">Validité de l’étalonnage</label><select class="input" onchange="updateAppareil(' + i + ',\'validiteMois\',this.value);">';
    APPAREIL_VALIDITES.forEach(function (mo) {
      h += '<option value="' + mo + '"' + (String(a.validiteMois || 12) === String(mo) ? ' selected' : '') + '>' + (mo / 12) + ' an' + (mo > 12 ? 's' : '') + '</option>';
    });
    h += '</select></div></div>';
  });
  h += '<button class="btn btn-gray btn-small" onclick="addAppareil();">' + ICONS.plus + ' Ajouter un appareil</button>';
  h += '</div>';
  return h;
}

function appareilInput(i, key, label, val, type, extra) {
  return '<div class="field"><label class="label">' + escapeHtml(label) + '</label>' +
    '<input type="' + type + '" class="input" ' + (extra || '') + ' value="' + escapeHtml(val || '') +
    '" onchange="updateAppareil(' + i + ',\'' + key + '\',this.value);"></div>';
}

function addAppareil() {
  var list = getAppareils();
  list.push({ id: generateId(), designation: '', marqueModele: '', numero: '', dateEtalonnage: '', validiteMois: 12 });
  saveAppareils(list);
  render();
}

function updateAppareil(i, key, value) {
  var list = getAppareils();
  if (!list[i]) return;
  list[i][key] = (key === 'validiteMois') ? parseInt(value, 10) : value;
  saveAppareils(list);
  render();
}

function deleteAppareil(i) {
  var list = getAppareils();
  if (!list[i] || !confirm('Supprimer « ' + appareilLibelle(list[i]) + ' » de vos appareils ?')) return;
  list.splice(i, 1);
  saveAppareils(list);
  render();
}

// --- Mission : choix des appareils utilisés ---

function renderAppareilsMissionSection(m) {
  var profil = getAppareils();
  var choisis = m.appareilsMesure || [];
  var choisisIds = {};
  choisis.forEach(function (a) { choisisIds[a.id] = true; });

  var h = '<div class="card"><div class="section-title">Appareils de mesure utilisés</div>';
  if (!profil.length && !choisis.length) {
    h += '<p class="subtitle">Aucun appareil enregistré. Déclare tes appareils une fois dans ton profil technicien.</p>';
    h += '<button class="btn btn-gray btn-small" onclick="state.view=\'profil-technicien\';render();">' + ICONS.user + ' Mon profil technicien</button>';
    return h + '</div>';
  }
  profil.forEach(function (a) {
    var on = !!choisisIds[a.id];
    h += '<label class="appareil-choice"><input type="checkbox"' + (on ? ' checked' : '') +
      ' onchange="toggleAppareilMission(' + a.id + ',this.checked);"><span><span class="appareil-choice-nom">' +
      escapeHtml(appareilLibelle(a)) + '</span>' + etalonnageBadge(a) + '</span></label>';
  });
  // Appareils présents dans la mission mais pas dans ce profil (mission reçue d'un autre appareil)
  var profilIds = {};
  profil.forEach(function (a) { profilIds[a.id] = true; });
  choisis.filter(function (a) { return !profilIds[a.id]; }).forEach(function (a) {
    h += '<label class="appareil-choice"><input type="checkbox" checked onchange="toggleAppareilMission(' + a.id + ',this.checked);">' +
      '<span><span class="appareil-choice-nom">' + escapeHtml(appareilLibelle(a)) + '</span>' + etalonnageBadge(a) + '</span></label>';
  });
  h += '</div>';
  return h;
}

function toggleAppareilMission(id, on) {
  var m = getCurrentMission();
  if (!m) return;
  if (!Array.isArray(m.appareilsMesure)) m.appareilsMesure = [];
  m.appareilsMesure = m.appareilsMesure.filter(function (a) { return a.id !== id; });
  if (on) {
    var src = getAppareils().find(function (a) { return a.id === id; });
    if (src) m.appareilsMesure.push(JSON.parse(JSON.stringify(src)));
  }
  persistMissions();
  render();
}

// Bouton sous le champ texte "Appareils de mesure utilisés" des fiches (sorbonnes) : reprend en un
// geste les appareils choisis pour la mission.
function appareilsRepriseHtml(typeId, f, inst) {
  if (f.key !== 'appareils_mesure') return '';
  var m = getCurrentMission();
  var list = (m && m.appareilsMesure) || [];
  if (!list.length) return '';
  var txt = list.map(appareilLibelleCourt).join(' / ');
  if (inst.data[f.key] === txt) return '';
  return '<button type="button" class="phrases-toggle" onclick="updateInstallationField(\'' + typeId + '\',\'' + f.key +
    '\',(getCurrentMission().appareilsMesure||[]).map(appareilLibelleCourt).join(\' / \'));">' + ICONS.copy +
    ' Reprendre les appareils de la mission : ' + escapeHtml(txt) + '</button>';
}

// Reprise depuis une installation voisine de la mission (2026-10-07). En tête d'une étape, un bouton
// reprend en un geste les champs qui se répètent d'une installation à l'autre pendant une même visite :
// date, bâtiment, constats, contexte, valeurs de référence. Listes établies sur les classeurs Rapso
// réels (part des installations voisines ayant la même valeur : « Individuel ou collectif » 100 %,
// état visuel et test fumigène des bras 99 %, date du contrôle 89 à 100 %…). Jamais une mesure ni un
// avis. Bouton plutôt que préremplissage : le technicien voit les valeurs avant de les reprendre ; il
// n'apparaît que s'il évite au moins 2 saisies. Jamais d'une année sur l'autre (même visite seulement).
// Sanitaires absents : chaque champ concerné s'y règle déjà en un toucher.
var REPRISE_VOISINE = {
  bureaux: ['batiment', 'type_local', 'type_ventilation', 'ouvrant_exterieur', 'entree_air_exterieur', 'entree_air_permanente', 'pourcentage_air_neuf', 'etat_bouches'],
  erp: ['batiment', 'type_local', 'type_ventilation', 'ouvrant_exterieur', 'entree_air_exterieur', 'entree_air_permanente', 'pourcentage_air_neuf', 'etat_bouches'],
  locaux_fumeurs: ['batiment', 'date_controle'],
  cta: ['batiment', 'date_controle', 'mode_fonctionnement', 'etat_general', 'prise_air_neuf', 'batterie_froide', 'batterie_chaude', 'canalisations_gaines',
    'ventilateur_courroie', 'fiche_maintenance', 'afficher_filtration', 'filt_pre_etat', 'filt_pre_type', 'filt_pre_classe', 'filt_filtre_etat',
    'filt_filtre_type', 'filt_filtre_classe', 'filt_absolu_etat', 'filt_absolu_type', 'filt_absolu_classe', 'mesure_debit'],
  extracteur: ['batiment', 'date_controle', 'mesure_debit', 'forme_section', 'vitesse_mode', 'afficher_taux'],
  sorbonnes: ['batiment', 'date_controle', 'temperature', 'hygrometrie', 'pression_atmospherique', 'difference_pression', 'appareils_mesure',
    'local', 'paillasse', 'ouvrants', 'autres_sorbonnes', 'autres_dispositifs', 'zones_turbulentes', 'zones_mortes', 'perturbations',
    'verrouillage_paroi', 'parachute_paroi', 'mesure_vitesse_frontale', 'alarme_sonore', 'alarme_visuelle', 'eclairage_interieur',
    'vitesse_min_reference', 'vitesse_moy_reference', 'debit_reference'],
  hottes: ['batiment', 'localisation', 'date_mesure', 'etat_visuel_reseau', 'test_fumigene', 'mesures_choisies', 'vpe_min_reference', 'vpe_min_inrs',
    'vpe_moy_reference', 'vpe_moy_inrs', 'operateur_hors_volume', 'vt_type_polluant', 'vt_reference'],
  bras_aspiration: ['batiment', 'activite', 'atelier', 'adapte_situation', 'recyclage', 'etat_visuel', 'etat_conduits', 'test_fumigene', 'conditions_dispersion'],
  // Cabines (2026-10-08) : type de flux 4/4 cabines voisines, pulvérisation et zone de travail identiques
  // quand renseignées, valeurs recommandées et « Norme 16985 » 100 % (classeurs et rapports réels)
  cabines_peinture: ['batiment', 'date_controle', 'type_flux', 'pulverisation', 'zone_travail', 'v1_reference', 'v1_valeur_recommandee', 'v1_recommandee_par',
    'v2_active', 'v2_reference', 'v2_valeur_recommandee', 'v2_recommandee_par', 'vehicules_subjectiles',
    'avec_moy_reference', 'avec_moy_reco', 'avec_min_reference', 'avec_min_reco', 'avec_recommandee_par'],
  installations_diverses: ['batiment', 'localisation', 'date_controle', 'etat_visuel_reseau', 'test_fumigene', 'mesures_choisies', 'vpe_conditions_dispersion',
    'vpe_reference', 'vpe_inrs', 'vt_type_polluant', 'vt_reference'],
  gaz_echappement: ['batiment', 'atelier', 'date_controle'],
  menuiserie: ['batiment', 'localisation', 'date_controle'],
  menuiserie_bis: ['date_controle', 'simultaneites', 'vitesse_reference', 'debit_reference', 'etat_visuel_reseau', 'forme_conduit', 'vitesse_mode', 'temperature_conduit'],
  box_peinture: ['batiment', 'date_controle'],
  torches_aspirantes: ['batiment', 'date_controle'],
  locaux_charge: ['batiment', 'date_controle'],
  tts: ['batiment', 'date_mesure'],
  // Types hors Rapso (2026-10-08) : aucune donnée réelle ; seulement l'identification, qui se répète sur
  // tous les types du Rapso (date du contrôle 89 à 100 %, bâtiment et atelier repris partout)
  decapage: ['batiment', 'localisation', 'date_controle'],
  fluide_coupe: ['batiment', 'localisation', 'date_controle'],
  poste_solvant: ['batiment', 'localisation', 'date_controle'],
  local_specifique: ['batiment', 'date_controle'],
  recyclage: ['batiment', 'localisation', 'date_controle']
};
var REPRISE_UNITES = { temperature: ' °C', hygrometrie: ' %', pression_atmospherique: ' hPa', difference_pression: ' Pa', temperature_conduit: ' °C', pourcentage_air_neuf: ' %' };

// Champs de l'étape à reprendre, et installation voisine qui les a : la plus proche avant, sinon après
function repriseVoisine(m, typeId, idx, step) {
  var liste = REPRISE_VOISINE[typeId], steps = WIZARD_STEPS[typeId];
  if (!liste || !steps || !steps[step]) return null;
  var champs = steps[step].fields.filter(function (k) { return liste.indexOf(k) !== -1; });
  if (champs.length < 2) return null;
  var list = (m && m.installations[typeId]) || [], inst = list[idx];
  if (!inst) return null;
  var t = getInstallationType(typeId);
  var visible = function (k) { var f = t.fields.find(function (x) { return x.key === k; }); return f && (!f.showIf || evalShowIf(f.showIf, inst.data)); };
  var gain = function (d) {
    return champs.filter(function (k) { return !fieldEmptyValue(d[k]) && JSON.stringify(d[k]) !== JSON.stringify(inst.data[k]) && visible(k); });
  };
  var essai = function (i) { var g = list[i] && i !== idx ? gain(list[i].data) : []; return g.length >= 2 ? { src: i, champs: g } : null; };
  for (var i = idx - 1; i >= 0; i--) { var r = essai(i); if (r) return r; }
  for (var j = idx + 1; j < list.length; j++) { var r2 = essai(j); if (r2) return r2; }
  return null;
}

function repriseValeurTexte(typeId, k, v) {
  if (Array.isArray(v)) return v.join(', ');
  if (v === 'Oui' || v === 'Non' || v === '/') {
    var f = getInstallationType(typeId).fields.find(function (x) { return x.key === k; });
    // Libellé sans l'unité ou la consigne finale entre parenthèses
    return (f ? f.label.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase() : k) + ' : ' + v.toLowerCase();
  }
  return frDisplay(v) + (REPRISE_UNITES[k] && /\d/.test(v) ? REPRISE_UNITES[k] : '');
}

function repriseVoisineHtml(typeId, steps, step, inst) {
  var m = getCurrentMission(), r = repriseVoisine(m, typeId, state.currentInstIndex, step);
  if (!r) return '';
  var src = m.installations[typeId][r.src];
  var resume = r.champs.map(function (k) { return repriseValeurTexte(typeId, k, src.data[k]); }).join(' · ');
  var nom = overviewRowTitle({ type: getInstallationType(typeId), inst: src, idx: r.src });
  return '<button type="button" class="phrases-toggle" style="margin-bottom:10px;" onclick="repriseVoisineAppliquer(\'' + typeId + '\',' + r.src + ',' + step + ');">' + ICONS.copy +
    ' Reprendre de ' + escapeHtml(nom) + ' : ' + escapeHtml(resume) + '</button>';
}

function repriseVoisineAppliquer(typeId, src, step) {
  var m = getCurrentMission(), r = repriseVoisine(m, typeId, state.currentInstIndex, step);
  if (!r || r.src !== src) return;
  var inst = m.installations[typeId][state.currentInstIndex], d = m.installations[typeId][src].data;
  r.champs.forEach(function (k) { inst.data[k] = Array.isArray(d[k]) ? d[k].slice() : d[k]; });
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  if (typeof touchInstallation === 'function') touchInstallation(inst);
  persistMissions();
  render();
}

console.log('✓ Aides terrain chargées');
