// conditions-mesure.js - Rappel des conditions de mesure en haut de l'étape de mesure (2026-10-04)
//
// Deux rappels, chacun tiré d'un texte vérifié (aucune consigne inventée) :
//  - Installations de captage (locaux à pollution spécifique) : mesurer aux points caractéristiques
//    de l'installation et noter les mouvements d'air perturbateurs. Arrêté du 8 octobre 1987, art. 4.
//  - Mesure dans un conduit : incertitude maximale estimée selon la distance à la singularité amont
//    (coude, registre, piquage) et le schéma de points, modèle de l'INRS : F. Bonthoux, J.-R. Fontaine,
//    « Mesure des débits d'air en conduit - incertitude liée au nombre et à la position des points de
//    mesures », Hygiène et sécurité du travail n° 227, PR 49, 2012. Validé jusqu'à 2 traverses et 10
//    points par traverse, de 2 à 50 diamètres.
//
// La distance choisie est rangée dans inst.data._ld (métadonnée, reprise à la visite suivante : le
// point de mesure ne bouge pas d'une année sur l'autre).

var CM_TYPES_CAPTAGE = ['extracteur', 'hottes', 'bras_aspiration', 'cabines_peinture', 'installations_diverses', 'gaz_echappement',
  'menuiserie', 'menuiserie_bis', 'box_peinture', 'torches_aspirantes', 'tts', 'sorbonnes', 'locaux_charge'];
var CM_TITRE_MESURE = /vitesse|débit|mesure|vpe|grille|captage n°/i;
var CM_DISTANCES = [2, 4, 6, 10, 20, 50]; // en diamètres, colonnes du tableau VI de l'article
// Schémas de points étudiés par l'INRS (tableau VI) : k traverses × p points
var CM_SCHEMAS = [[1, 1], [1, 2], [2, 2], [1, 6], [1, 10], [2, 6], [2, 10]];

// Erreur maximale estimée sur la vitesse moyenne, en % (formule de l'article)
function cmErreurMax(ld, k, p) {
  return 0.7 * 100 / Math.pow(ld, 0.7) / k / (6 * (1 - Math.exp(-p / 6)));
}

// Plus petit schéma du tableau VI qui reste à 5 % ou moins à cette distance
function cmSchemaConseille(ld) {
  for (var i = 0; i < CM_SCHEMAS.length; i++) {
    if (Math.round(cmErreurMax(ld, CM_SCHEMAS[i][0], CM_SCHEMAS[i][1])) <= 5) return CM_SCHEMAS[i];
  }
  return null;
}

function cmSchemaTexte(s) {
  return s[0] === 1 ? (s[1] === 1 ? '1 point' : '1 diamètre de ' + s[1] + ' points') : s[0] + ' diamètres de ' + s[1] + ' points';
}

// Champ de grille de vitesse en conduit présent dans l'étape (extracteur, menuiserie, captageN_… …)
function cmChampConduit(typeId, fields) {
  if (typeId === 'cabines_peinture') return null; // grille en façade de cabine, pas en conduit
  return fields.filter(function (f) { return /vitesse_mode$/.test(f.key); })[0] || null;
}

function cmSetDistance(typeId, v) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  if (inst.data._ld === v) delete inst.data._ld; else inst.data._ld = v;
  persistMissions(); render();
}

function cmConduitHtml(typeId, fMode, inst) {
  var d = inst.data, prefixe = fMode.key.replace(/vitesse_mode$/, ''), ld = d._ld;
  var h = '<div class="cm-conduit"><div class="cm-q">Distance entre le point de mesure et le coude, registre ou piquage le plus proche en amont :</div><div class="cm-chips">';
  h += '<button type="button" class="cm-chip' + (ld === 1 ? ' actif' : '') + '" onclick="cmSetDistance(\'' + typeId + '\',1);">&lt; 2 D</button>';
  CM_DISTANCES.forEach(function (v) {
    h += '<button type="button" class="cm-chip' + (ld === v ? ' actif' : '') + '" onclick="cmSetDistance(\'' + typeId + '\',' + v + ');">' + (v === 50 ? '50 D et +' : v + ' D') + '</button>';
  });
  h += '</div>';
  if (ld === 1) {
    h += '<div class="cm-res alerte">Moins de 2 diamètres : incertitude non estimable. Si possible, mesurer plus loin de la singularité.</div>';
  } else if (ld) {
    var conseil = cmSchemaConseille(ld);
    var grille = d[prefixe + 'vitesse_mode'] === 'Grille de points';
    var k = parseInt(d[prefixe + 'vitesse_nb_axes'], 10) || 0, p = parseInt(d[prefixe + 'vitesse_nb_points'], 10) || 0;
    if (grille && k && p) {
      var e = Math.round(cmErreurMax(ld, Math.min(k, 2), Math.min(p, 10)));
      h += '<div class="cm-res' + (e > 5 ? ' alerte' : ' ok') + '">Avec ' + cmSchemaTexte([k, p]) + ' : erreur maximale estimée <b>' + e + ' %</b>' +
        (e > 5 && conseil ? '. Pour rester sous 5 % : <b>' + cmSchemaTexte(conseil) + '</b>.' : '.') + '</div>';
    } else if (conseil) {
      h += '<div class="cm-res">Pour rester sous 5 % à cette distance : <b>' + cmSchemaTexte(conseil) + '</b>' + (ld < 10 ? ' (pas de mesure en un seul point à moins de 10 D)' : '') + '.</div>';
    }
  }
  return h + '<div class="cm-src">Source : INRS, HST n° 227, PR 49 (2012)</div></div>';
}

function conditionsMesureHtml(typeId, steps, step, inst) {
  if (CM_TYPES_CAPTAGE.indexOf(typeId) < 0 || !steps || !steps[step]) return '';
  var fields = gwStepFields(typeId, steps[step]).filter(function (f) { return !f.showIf || evalShowIf(f.showIf, inst.data); });
  var fMode = cmChampConduit(typeId, gwStepFields(typeId, steps[step]));
  // Rappel général : seulement sur la première étape de mesure visible du type
  var premiere = -1;
  gwVisibleStepIndices(typeId, inst).some(function (i) { if (CM_TITRE_MESURE.test(steps[i].title)) { premiere = i; return true; } return false; });
  var h = '';
  if (premiere === step) {
    h += '<li>Mesurer aux points caractéristiques de l’installation : mêmes emplacements que la valeur de référence ou la visite précédente.</li>' +
      '<li>Noter tout mouvement d’air perturbateur près du captage (porte, fenêtre, ventilateur, courant d’air) : il peut réduire l’efficacité du captage.</li>';
    if (typeId === 'sorbonnes' && inst.data.h_mm) h += '<li>Guillotine à la hauteur retenue pour l’ouverture de travail : <b>' + escapeHtml(String(inst.data.h_mm)) + ' mm</b>.</li>';
  }
  var conduit = fMode && fields.length ? cmConduitHtml(typeId, fMode, inst) : '';
  if (!h && !conduit) return '';
  return '<details class="conditions-mesure"' + (h || !inst.data._ld ? ' open' : '') + '><summary>Conditions de mesure</summary>' +
    (h ? '<ul>' + h + '</ul><div class="cm-src">Arrêté du 8 octobre 1987, art. 4</div>' : '') + conduit + '</details>';
}

console.log('✓ Conditions de mesure chargées');
