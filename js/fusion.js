// fusion.js - Travailler à plusieurs sur un même site (chantier du 2026-10-03)
//
// Déroulé type : le technicien A prépare la mission et la transfère (.json) au technicien B ; chacun
// saisit ses bâtiments ; en fin de visite B renvoie son fichier, et A le FUSIONNE dans sa mission (au
// lieu de l'écraser ou d'en garder deux copies). Marche aussi avec deux missions créées séparément
// pour le même site : les installations de l'autre sont alors ajoutées, et les doublons probables
// (même type, même bâtiment, même nom) sont signalés.
//
// Règle pour une installation présente des deux côtés (même identifiant) : la version modifiée le plus
// récemment est gardée (inst.data._mod, posé à chaque saisie — cf. touchInstallation). Si les deux ont
// été modifiées, c'est signalé dans le bilan de fusion pour que le technicien vérifie.

// Horodatage de la dernière saisie d'une installation (méta-donnée « _ », ignorée partout ailleurs)
function touchInstallation(inst) {
  if (inst && inst.data) inst.data._mod = Date.now();
}

function installationSignature(data) {
  var copy = {};
  Object.keys(data || {}).sort().forEach(function (k) { if (k.charAt(0) !== '_') copy[k] = data[k]; });
  return JSON.stringify(copy);
}

function filledFieldCount(data) {
  return Object.keys(data || {}).filter(function (k) {
    var v = data[k];
    return k.charAt(0) !== '_' && v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && !v.length);
  }).length;
}

function fillEmptyFields(target, source) {
  if (!target || !source) return;
  Object.keys(source).forEach(function (k) {
    if ((target[k] === undefined || target[k] === '') && typeof source[k] !== 'object') target[k] = source[k];
  });
}

function mergeInstallationLabel(type, inst) {
  var title = overviewRowTitle({ type: type, inst: inst, idx: 0 }, 'batiment');
  return type.label + ' — ' + (inst.data.batiment ? inst.data.batiment + ' · ' : '') + title;
}

// Fusionne `incoming` dans `target` (modifié en place). Renvoie le bilan de la fusion.
function mergeMissionInto(target, incoming) {
  var report = { ajoutees: 0, misesAJour: 0, conservees: 0, identiques: 0, conflits: [], doublons: [] };
  INSTALLATION_TYPES.forEach(function (t) {
    var inc = (incoming.installations || {})[t.id] || [];
    if (!inc.length) return;
    if (!target.installations[t.id]) target.installations[t.id] = [];
    var list = target.installations[t.id];
    inc.forEach(function (ii) {
      var local = list.filter(function (x) { return x.id === ii.id; })[0];
      if (!local) {
        // Même installation créée des deux côtés indépendamment ? (même bâtiment et même nom)
        if (hasRealInstallationData(ii.data)) {
          var key = mergeInstallationLabel(t, ii);
          if (list.some(function (x) { return hasRealInstallationData(x.data) && mergeInstallationLabel(t, x) === key; })) report.doublons.push(key);
        }
        list.push(JSON.parse(JSON.stringify(ii)));
        report.ajoutees++;
        return;
      }
      if (installationSignature(local.data) === installationSignature(ii.data)) { report.identiques++; return; }
      var mL = local.data._mod || 0, mI = ii.data._mod || 0;
      var takeIncoming = (mL || mI) ? mI > mL : filledFieldCount(ii.data) > filledFieldCount(local.data);
      if (mL && mI && hasRealInstallationData(local.data) && hasRealInstallationData(ii.data)) {
        report.conflits.push(mergeInstallationLabel(t, takeIncoming ? ii : local) + (takeIncoming ? ' (version reçue gardée)' : ' (votre version gardée)'));
      }
      if (takeIncoming) { local.data = JSON.parse(JSON.stringify(ii.data)); report.misesAJour++; }
      else report.conservees++;
    });
  });

  // Données de mission : celles de la mission locale priment, les champs vides sont complétés
  target.typesSelectionnes = (target.typesSelectionnes || []).concat((incoming.typesSelectionnes || []).filter(function (x) {
    return (target.typesSelectionnes || []).indexOf(x) === -1;
  }));
  ['donneesInternes', 'infosClient', 'intervenantSite', 'infosSiteIntervention', 'descriptionLocaux'].forEach(function (k) {
    if (!target[k]) target[k] = {};
    fillEmptyFields(target[k], incoming[k]);
  });
  var ids = (target.appareilsMesure || []).map(function (a) { return a.id; });
  target.appareilsMesure = (target.appareilsMesure || []).concat((incoming.appareilsMesure || []).filter(function (a) { return ids.indexOf(a.id) === -1; }));
  if (target.documentsTransmis && incoming.documentsTransmis) {
    ['documents', 'notice'].forEach(function (k) {
      (target.documentsTransmis[k] || []).forEach(function (d, i) { fillEmptyFields(d, (incoming.documentsTransmis[k] || [])[i]); });
    });
    if (!target.documentsTransmis.observations) target.documentsTransmis.observations = incoming.documentsTransmis.observations || '';
  }
  if (incoming.compteRendu && !(target.compteRendu && target.compteRendu.signature)) target.compteRendu = incoming.compteRendu;
  // Plans du site (js/plans.js) : ceux du collègue absents de la mission locale sont ajoutés
  (incoming.plans || []).forEach(function (p) {
    if (!Array.isArray(target.plans)) target.plans = [];
    if (!target.plans.some(function (x) { return x.id === p.id; })) target.plans.push(JSON.parse(JSON.stringify(p)));
  });
  if (typeof docsFusionner === 'function') docsFusionner(target, incoming); // documents joints, schémas
  if (!target.notesSite && incoming.notesSite) target.notesSite = incoming.notesSite;
  if (incoming.relecture && (!target.relecture || (incoming.relecture.t || 0) > (target.relecture.t || 0))) target.relecture = incoming.relecture; // js/qualite.js
  return report;
}

function mergeReportText(r) {
  var lines = ['Fusion terminée :',
    '• ' + r.ajoutees + ' installation(s) ajoutée(s)',
    '• ' + r.misesAJour + ' mise(s) à jour avec la version reçue',
    '• ' + (r.conservees + r.identiques) + ' inchangée(s)'];
  if (r.conflits.length) {
    lines.push('', '⚠️ Modifiées sur les deux appareils (la plus récente est gardée, à vérifier) :');
    r.conflits.slice(0, 8).forEach(function (c) { lines.push('- ' + c); });
    if (r.conflits.length > 8) lines.push('- … et ' + (r.conflits.length - 8) + ' autre(s)');
  }
  if (r.doublons.length) {
    lines.push('', '⚠️ Doublons possibles (même bâtiment, même nom) — à supprimer si besoin :');
    r.doublons.slice(0, 8).forEach(function (c) { lines.push('- ' + c); });
    if (r.doublons.length > 8) lines.push('- … et ' + (r.doublons.length - 8) + ' autre(s)');
  }
  return lines.join('\n');
}

// Fusion effective + nettoyage des photos reçues non retenues (versions écartées)
function applyMerge(target, incoming) {
  var report = mergeMissionInto(target, incoming);
  persistMissions();
  if (typeof deleteMissionPhotoBlobs === 'function') deleteMissionPhotoBlobs(incoming);
  state.currentMissionId = target.id;
  state.view = 'mission-detail';
  render();
  alert(mergeReportText(report));
  return report;
}

// Menu « ⋯ » de la mission : fusionner le fichier d'un collègue, quel que soit son identifiant
function triggerMergeMission() {
  var input = document.getElementById('merge-mission-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.id = 'merge-mission-input';
    input.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) { mergeMissionFromText(ev.target.result); };
      reader.readAsText(file);
    };
    document.body.appendChild(input);
  }
  input.value = '';
  input.click();
}

function mergeMissionFromText(text) {
  var target = getCurrentMission();
  if (!target) return;
  var incoming;
  try { incoming = extractMissionFromImportData(JSON.parse(text)); } catch (e) { incoming = null; }
  if (!incoming || !incoming.installations) { alert('Format non reconnu.\n\nChoisissez un fichier de mission Contrôle Aération (.json).'); return; }
  normalizeMission(incoming);
  restoreMissionPhotosFromImport(incoming).then(function () { applyMerge(target, incoming); })
    .catch(function (err) { alert('Erreur lors de la fusion :\n\n' + err.message); });
}

console.log('✓ Fusion de missions chargée');
