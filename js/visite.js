// visite.js - Préparer la visite : notes pratiques et matériel à emporter (chantier du 2026-10-04)
//
//  - Notes pour la prochaine visite : sur la mission (m.notesSite) et sur chaque installation
//    (inst.data._note). Infos pratiques (clé, nacelle, horaires, contact) : jamais dans le rapport,
//    reprises à la visite suivante et affichées en tête de mission et de fiche.
//  - Matériel à emporter : déduit des mesures prévues dans les fiches des installations de la mission
//    (champs de vitesse, de pression, de concentration…), avec l'étalonnage des appareils du profil.
//    Case à cocher au départ du bureau (m._materiel, propre à la visite).

// ————————————————————————————————————————————
// Notes
// ————————————————————————————————————————————

function notesSiteCarteHtml(m) {
  if (!m.notesSite) return '';
  return '<div class="card notes-carte"><div class="notes-titre">' + ICONS.clipboard + '<b>Notes pour cette visite</b>' +
    '<button type="button" class="btn btn-gray btn-small" onclick="state.view=\'preparation\';render();">Modifier</button></div>' +
    '<div class="notes-texte">' + escapeHtml(m.notesSite) + '</div></div>';
}

function majNotesSite(v) {
  var m = getCurrentMission();
  if (!m) return;
  m.notesSite = String(v || '').slice(0, 2000);
  persistMissions();
}

// Fiche d'installation : rappel en tête, champ en bas
function noteInstallationBandeauHtml(inst) {
  if (!inst || !inst.data._note) return '';
  return '<div class="note-bandeau">' + ICONS.clipboard + '<span><b>Note pour la visite :</b> ' + escapeHtml(inst.data._note) + '</span></div>';
}

function noteInstallationChampHtml(typeId, inst) {
  if (!inst) return '';
  var ouvert = inst.data._note || state.noteOuverte === typeId + ':' + state.currentInstIndex;
  if (!ouvert) {
    return '<button type="button" class="btn btn-gray btn-small note-ajout" onclick="state.noteOuverte=\'' + typeId + ':\'+state.currentInstIndex;render();">' + ICONS.plus + ' Note pour la prochaine visite</button>';
  }
  return '<div class="card note-champ"><label class="label" for="note-inst">Note pour la prochaine visite (hors rapport)</label>' +
    '<textarea class="input" id="note-inst" rows="2" maxlength="500" placeholder="Accès, clé, nacelle, horaire, contact…" onchange="majNoteInstallation(\'' + typeId + '\',this.value);">' + escapeHtml(inst.data._note || '') + '</textarea></div>';
}

function majNoteInstallation(typeId, v) {
  var m = getCurrentMission(), inst = m && m.installations[typeId] && m.installations[typeId][state.currentInstIndex];
  if (!inst) return;
  var t = String(v || '').trim().slice(0, 500);
  if (t) inst.data._note = t; else delete inst.data._note;
  persistMissions();
  render();
}

// ————————————————————————————————————————————
// Matériel à emporter, déduit des mesures prévues dans les fiches
// ————————————————————————————————————————————

var MATERIEL = [
  { k: 'anemometre', nom: 'Anémomètre', detail: 'vitesses d’air (grilles de points, conduits, ouvertures)' },
  { k: 'debit', nom: 'Cône de mesure de débit ou balomètre', detail: 'débits aux bouches et grilles' },
  { k: 'manometre', nom: 'Manomètre différentiel', detail: 'pressions statiques, pertes de charge, dépressions' },
  { k: 'thermometre', nom: 'Thermomètre', detail: 'température dans le conduit ou du local' },
  { k: 'ambiance', nom: 'Hygromètre et baromètre', detail: 'conditions ambiantes des sorbonnes' },
  { k: 'fumigene', nom: 'Générateur de fumée', detail: 'test au fumigène' },
  { k: 'concentration', nom: 'Mesure ou prélèvement des concentrations', detail: 'poussières, aérosols (recyclage, fluides de coupe)' },
  { k: 'metre', nom: 'Mètre ou télémètre', detail: 'dimensions des ouvertures, conduits et locaux' }
];
var MATERIEL_TYPES_DEBIT_BOUCHES = ['bureaux', 'erp', 'sanitaires', 'local_specifique', 'locaux_fumeurs'];

// Matériel requis par un type d'après ses champs de saisie : { cle: true }
function materielPourType(t) {
  var out = {};
  var etapes = (typeof WIZARD_STEPS !== 'undefined' && WIZARD_STEPS[t.id]) || [];
  t.fields.forEach(function (f) {
    if (f.type !== 'number' && f.type !== 'grid') return;
    var k = f.key, lab = String(f.label || '');
    if (/_n1$|reference|recommand|inrs|vlep|effectif|nb_|nombre|precedent/.test(k)) return;
    if (/m\/s/.test(lab)) out.anemometre = true;
    if (/debit_cone/.test(k) || (MATERIEL_TYPES_DEBIT_BOUCHES.indexOf(t.id) !== -1 && /^debit/.test(k))) out.debit = true;
    if (/pression_statique|perte_charge|depression|difference_pression/.test(k)) out.manometre = true;
    if (/temperature/.test(k)) out.thermometre = true;
    if (/hygrometrie|pression_atmospherique/.test(k)) out.ambiance = true;
    if (/^conc_/.test(k)) out.concentration = true;
    if (/largeur|longueur|hauteur|diametre|cote|_mm/.test(k)) out.metre = true;
  });
  if (etapes.some(function (s) { return /fumig/i.test(s.title); })) out.fumigene = true;
  return out;
}

function materielMission(m) {
  var parCle = {};
  INSTALLATION_TYPES.forEach(function (t) {
    if (!(m.installations[t.id] || []).length) return;
    var req = materielPourType(t);
    Object.keys(req).forEach(function (k) { (parCle[k] = parCle[k] || []).push(t.label.replace(/\s*\(.*\)\s*$/, '')); });
  });
  return MATERIEL.filter(function (x) { return parCle[x.k]; }).map(function (x) { return { k: x.k, nom: x.nom, detail: x.detail, types: parCle[x.k] }; });
}

// ————————————————————————————————————————————
// Écran « Préparer la visite »
// ————————————————————————————————————————————

function renderPreparation() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; return renderHome(); }
  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(m.clientSite || 'Mission') + '</button>';
  h += '<div class="card"><h1>' + ICONS.clipboard + ' Préparer la visite</h1><p class="subtitle">Avant de partir du bureau : notes pratiques, matériel, appareils, étiquettes.</p></div>';

  h += '<div class="card"><div class="section-title">Notes pour la visite</div>' +
    '<p class="subtitle">Accès, clés, nacelle, horaires, interlocuteur… Hors rapport, reprises l’année suivante.</p>' +
    '<textarea class="input" id="notes-site" rows="4" maxlength="2000" placeholder="Ex. : badge à l’accueil, toiture par l’échelle du bâtiment B, cabine de peinture à mesurer avant 10 h" onchange="majNotesSite(this.value);">' + escapeHtml(m.notesSite || '') + '</textarea></div>';

  var notes = overviewOrderedItems(m).filter(function (it) { return it.inst.data._note; });
  if (notes.length) {
    h += '<div class="card"><div class="section-title">Notes sur les installations</div><div class="prep-notes">';
    notes.forEach(function (it) {
      h += '<button type="button" class="prep-note" onclick="openOverviewInstallation(\'' + it.type.id + '\',' + it.idx + ');"><b>' + escapeHtml(overviewRowTitle(it)) + '</b><span class="subtitle">' + escapeHtml(it.inst.data._note) + '</span></button>';
    });
    h += '</div></div>';
  }

  var mat = materielMission(m), coche = m._materiel || {};
  h += '<div class="card"><div class="section-title">Matériel à emporter</div><p class="subtitle">D’après les mesures prévues dans les fiches des installations de la mission.</p>';
  if (!mat.length) h += '<p class="subtitle">Aucune installation sélectionnée.</p>';
  mat.forEach(function (x) {
    h += '<label class="prep-item"><input type="checkbox" id="mat-' + x.k + '"' + (coche[x.k] ? ' checked' : '') + ' onchange="cocherMateriel(\'' + x.k + '\',this.checked);">' +
      '<span><b>' + escapeHtml(x.nom) + '</b><span class="subtitle">' + escapeHtml(x.detail) + ' · ' + escapeHtml(x.types.join(', ')) + '</span></span></label>';
  });
  h += '</div>';

  // Appareils choisis pour la mission, sinon ceux du profil
  var choisis = Array.isArray(m.appareilsMesure) ? m.appareilsMesure : [];
  var appareils = choisis.length ? choisis : ((typeof getAppareils === 'function') ? getAppareils() : []);
  h += '<div class="card"><div class="section-title">Appareils de mesure' + (choisis.length ? ' de la mission' : '') + '</div>';
  if (!appareils.length) h += '<p class="subtitle">Aucun appareil dans votre profil. Ajoutez-les dans « Profil » pour suivre leur étalonnage.</p>';
  appareils.forEach(function (a) {
    h += '<div class="prep-appareil"><span>' + escapeHtml(appareilLibelle(a)) + '</span>' + etalonnageBadge(a) + '</div>';
  });
  h += '</div>';

  if (typeof imprimerEtiquettesQr === 'function') {
    h += '<button class="btn btn-gray" onclick="imprimerEtiquettesQr();">' + ICONS.tag + ' Imprimer les étiquettes QR</button>';
  }
  return h;
}

function cocherMateriel(k, on) {
  var m = getCurrentMission();
  if (!m) return;
  m._materiel = m._materiel || {};
  if (on) m._materiel[k] = true; else delete m._materiel[k];
  persistMissions();
}

console.log('✓ Préparation de visite chargée');
