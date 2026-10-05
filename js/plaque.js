// plaque.js - Photo de la plaque signalétique d'un équipement (chantier du 2026-10-04)
//
// En bas de la fiche d'un équipement (CTA, extracteur, hotte, cabine…), un emplacement dédié pour
// photographier la plaque signalétique (marque, modèle, débit nominal). Elle est reprise à la visite
// suivante : le technicien relit les données constructeur sans remonter sur l'échelle. Ce n'est pas
// une photo du rapport : méta-donnée inst.data._plaque (identifiant de l'image en IndexedDB).

// Locaux sans plaque signalétique à photographier
var PLAQUE_TYPES_EXCLUS = ['bureaux', 'sanitaires', 'erp', 'locaux_fumeurs', 'local_specifique']; // mesures aux bouches d'un local : pas de plaque

function plaqueHtml(typeId, inst) {
  if (!inst || PLAQUE_TYPES_EXCLUS.indexOf(typeId) !== -1) return '';
  var id = inst.data._plaque;
  var h = '<div class="card plaque-carte">';
  if (id) {
    h += '<img class="plaque-vignette" alt="Plaque signalétique" data-photo-src="' + escapeHtml(id) + '" onclick="openPhotoViewer(\'' + escapeHtml(id) + '\');">' +
      '<div class="plaque-texte"><b>Plaque signalétique</b><span class="subtitle">Touchez la photo pour l’agrandir. Reprise à la visite suivante.</span></div>' +
      '<div class="plaque-actions"><label class="btn btn-gray btn-small">Reprendre<input type="file" accept="image/*" capture="environment" style="display:none;" onchange="plaqueAjouter(\'' + typeId + '\',this);"></label>' +
      '<button type="button" class="btn btn-gray btn-small" onclick="plaqueSupprimer(\'' + typeId + '\');">' + ICONS.trash + '</button></div>';
  } else {
    h += '<label class="plaque-ajout">' + ICONS.plus + '<span><b>Photographier la plaque signalétique</b><span class="subtitle">Marque, modèle, débit nominal : reprise l’an prochain, hors rapport.</span></span>' +
      '<input type="file" accept="image/*" capture="environment" style="display:none;" onchange="plaqueAjouter(\'' + typeId + '\',this);"></label>';
  }
  return h + '</div>';
}

function plaqueInstCourante(typeId) {
  var m = getCurrentMission();
  return m && m.installations[typeId] ? m.installations[typeId][state.currentInstIndex] : null;
}

function plaqueAjouter(typeId, input) {
  var file = input.files && input.files[0];
  input.value = '';
  var inst = plaqueInstCourante(typeId);
  if (!file || !inst) return;
  compressImageFile(file).then(function (blob) {
    var id = generatePhotoId(), ancien = inst.data._plaque;
    return savePhotoBlob(id, blob).then(function () {
      inst.data._plaque = id;
      persistMissions();
      if (ancien && typeof referencedPhotoIds === 'function' && !referencedPhotoIds()[ancien]) deletePhotoBlob(ancien).catch(function () {});
      render();
    });
  }).catch(function (err) { alert('Impossible d’enregistrer la photo :\n\n' + err.message); });
}

function plaqueSupprimer(typeId) {
  var inst = plaqueInstCourante(typeId);
  if (!inst || !inst.data._plaque || !confirm('Supprimer la photo de la plaque ?')) return;
  var ancien = inst.data._plaque;
  delete inst.data._plaque;
  persistMissions();
  if (typeof referencedPhotoIds === 'function' && !referencedPhotoIds()[ancien]) deletePhotoBlob(ancien).catch(function () {});
  render();
}

// Identifiants des photos de plaque d'une mission (export, suppression : js/documents-joints.js)
// (aussi la photo de la visite précédente, _photoN1)
var PHOTOS_META = ['_plaque', '_photoN1'];
function plaquePhotoIds(m) {
  var ids = [];
  Object.keys(m.installations || {}).forEach(function (t) {
    (m.installations[t] || []).forEach(function (inst) {
      PHOTOS_META.forEach(function (k) { if (inst && inst.data && inst.data[k]) ids.push(inst.data[k]); });
    });
  });
  return ids;
}

// « Charger un site précédent » : la première photo de chaque installation de l'an dernier devient sa
// photo N-1 (pour reprendre le même cadrage) ; les autres photos ne sont pas reprises
function photosN1FromImport(source) {
  var jobs = [];
  Object.keys(source.installations || {}).forEach(function (t) {
    (source.installations[t] || []).forEach(function (inst) {
      var p = inst && inst.data && Array.isArray(inst.data.photo) ? inst.data.photo[0] : null;
      if (!p || typeof p.dataUrl !== 'string' || p.dataUrl.indexOf('data:image/') !== 0) return;
      var id = generatePhotoId();
      jobs.push(fetch(p.dataUrl).then(function (r) { return r.blob(); }).then(function (b) { return savePhotoBlob(id, b); })
        .then(function () { inst.data._photoN1 = id; }).catch(function () {}));
    });
  });
  return Promise.all(jobs);
}

console.log('✓ Photo de plaque signalétique chargée');
