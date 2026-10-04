// photos.js - Stockage des photos d'installation en IndexedDB (chantier "photos par installation")
//
// Jamais dans localStorage/le JSON de mission tel quel : inst.data.photo est un tableau de
// références légères [{id}, {id}] (1-2 photos), les octets vivent dans IndexedDB. Périmètre limité
// aux 12 types confirmés par preuve VBA directe (contrôle LabelPhoto + insere_image_ratio dans
// l'annexe Word) — voir l'inventaire fait avant ce chantier. Trois consommateurs :
//  - js/installations.js : galerie (miniatures, capture, suppression, visionneuse plein écran)
//  - js/export-pdf.js : résolution id -> dataURL juste avant de construire le PDF (pdfFichePhotoBox
//    attend toujours une chaîne base64 — adaptateur, pas de changement de mise en page)
//  - js/import-export.js : embarque les photos en base64 dans le JSON exporté/transféré, les
//    réimporte vers IndexedDB à la réception

var PHOTO_DB_NAME = 'aeration_photos_v1';
var PHOTO_STORE = 'photos';
var PHOTO_MAX_PER_INSTALLATION = 2;
var PHOTO_MAX_DIMENSION = 1280;
var PHOTO_JPEG_QUALITY = 0.72;

var _photoDbPromise = null;
function openPhotoDb() {
  if (_photoDbPromise) return _photoDbPromise;
  _photoDbPromise = new Promise(function (resolve, reject) {
    var req = indexedDB.open(PHOTO_DB_NAME, 1);
    req.onupgradeneeded = function () {
      if (!req.result.objectStoreNames.contains(PHOTO_STORE)) req.result.createObjectStore(PHOTO_STORE);
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
  return _photoDbPromise;
}

function savePhotoBlob(id, blob) {
  return openPhotoDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE, 'readwrite');
      tx.objectStore(PHOTO_STORE).put(blob, id);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function getPhotoBlob(id) {
  return openPhotoDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE, 'readonly');
      var req = tx.objectStore(PHOTO_STORE).get(id);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function deletePhotoBlob(id) {
  return openPhotoDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE, 'readwrite');
      tx.objectStore(PHOTO_STORE).delete(id);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function generatePhotoId() {
  return 'ph_' + generateId();
}

// Redimensionne (côté max PHOTO_MAX_DIMENSION) et recompresse en JPEG — une photo brute de
// smartphone (souvent 3-8 Mo) devient de l'ordre de 150-300 Ko.
function compressImageFile(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var w = img.naturalWidth, h = img.naturalHeight;
      var scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(w, h));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob); else reject(new Error('Compression de l’image échouée'));
      }, 'image/jpeg', PHOTO_JPEG_QUALITY);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

function blobToDataUrl(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(reader.error); };
    reader.readAsDataURL(blob);
  });
}

// Parcourt uniquement les types dont le schéma a réellement un champ type:'photo' (dérivé du
// schéma, pas une liste à maintenir à part) — callback(inst, typeId) pour chaque installation de
// ces types.
function forEachInstallationPhotoField(mission, callback) {
  if (!mission || !mission.installations) return;
  INSTALLATION_TYPES.forEach(function (t) {
    if (!t.fields.some(function (f) { return f.type === 'photo'; })) return;
    (mission.installations[t.id] || []).forEach(function (inst) { callback(inst, t.id); });
  });
}

// Migration rétrocompatible (⚠️ BUG CORRIGÉ) : avant ce chantier, le champ photo stockait la photo
// brute non compressée en base64 directement dans inst.data.photo — donc dans le JSON de mission
// persisté en localStorage, exactement le risque de saturation que ce chantier corrige. Tout dossier
// existant avec une telle chaîne est basculé vers IndexedDB au chargement, sans perte : la photo est
// convertie en blob, sauvegardée, et le champ redevient une référence légère [{id}]. Idempotent, sûr
// à rappeler (ne fait rien si aucune chaîne base64 n'est trouvée).
function migrateLegacyPhotos() {
  var changed = false;
  var jobs = [];
  (state.missions || []).forEach(function (m) {
    forEachInstallationPhotoField(m, function (inst) {
      var v = inst.data && inst.data.photo;
      if (typeof v !== 'string' || v.indexOf('data:') !== 0) return;
      jobs.push(
        fetch(v).then(function (r) { return r.blob(); }).then(function (blob) {
          var id = generatePhotoId();
          return savePhotoBlob(id, blob).then(function () {
            inst.data.photo = [{ id: id }];
            changed = true;
          });
        }).catch(function () {
          // Photo illisible/corrompue : on l'efface plutôt que de laisser une chaîne base64
          // bloquée dans le JSON de mission indéfiniment.
          inst.data.photo = [];
          changed = true;
        })
      );
    });
  });
  if (!jobs.length) return Promise.resolve(false);
  return Promise.all(jobs).then(function () {
    if (changed) persistMissions();
    return changed;
  });
}

// Adaptateur export PDF (js/export-pdf.js exportRapportPdf) : pdfFichePhotoBox attend toujours une
// chaîne base64 exploitable directement — seule la façon dont l'octet est obtenu change (résolution
// IndexedDB au lieu d'une lecture directe du champ). Ne mute jamais la mission réelle : travaille sur
// un clone, et ne garde que la 1re photo (pdfFichePhotoBox n'affiche qu'une seule image par installation).
function resolveMissionPhotos(m) {
  var clone = JSON.parse(JSON.stringify(m));
  var jobs = [];
  forEachInstallationPhotoField(clone, function (inst) {
    var photos = Array.isArray(inst.data.photo) ? inst.data.photo : [];
    if (!photos.length) { inst.data.photo = ''; return; }
    jobs.push(
      getPhotoBlob(photos[0].id)
        .then(function (blob) { return blob ? blobToDataUrl(blob) : null; })
        .then(function (dataUrl) { inst.data.photo = dataUrl || ''; })
        .catch(function () { inst.data.photo = ''; })
    );
  });
  return Promise.all(jobs).then(function () { return clone; });
}

// Export/transfert JSON (js/import-export.js) : embarque les photos en base64 À CÔTÉ de la
// référence (id conservé), dans un clone — jamais dans la mission réelle tenue en mémoire/
// localStorage, qui garde toujours la forme légère [{id}].
function resolveMissionPhotosForExport(m) {
  var clone = JSON.parse(JSON.stringify(m));
  var jobs = [];
  forEachInstallationPhotoField(clone, function (inst) {
    var photos = Array.isArray(inst.data.photo) ? inst.data.photo : [];
    photos.forEach(function (p) {
      jobs.push(
        getPhotoBlob(p.id)
          .then(function (blob) { return blob ? blobToDataUrl(blob) : null; })
          .then(function (dataUrl) { if (dataUrl) p.dataUrl = dataUrl; })
          .catch(function () {})
      );
    });
  });
  if (typeof planImagesForExport === 'function') jobs.push(planImagesForExport(clone)); // plans du site (js/plans.js)
  if (typeof docsImagesForExport === 'function') jobs.push(docsImagesForExport(clone)); // documents joints et schémas (js/documents-joints.js)
  return Promise.all(jobs).then(function () { return clone; });
}

// Import JSON (js/import-export.js) : réécrit les photos embarquées en base64 vers IndexedDB, puis
// ne garde que la référence {id} dans la mission — jamais la photo elle-même une fois réimportée.
// Chaque photo embarquée reçoit un id NEUF (⚠️ BUG CORRIGÉ le 2026-10-03) : en gardant l'id d'origine,
// réimporter une mission déjà présente sur l'appareil faisait partager les mêmes blobs aux deux
// versions — « Annuler » supprimait alors les photos de la mission existante, et « Écraser » celles
// de la mission tout juste importée.
function restoreMissionPhotosFromImport(mission) {
  var jobs = [];
  forEachInstallationPhotoField(mission, function (inst) {
    var photos = Array.isArray(inst.data.photo) ? inst.data.photo : [];
    inst.data.photo = photos.map(function (p) {
      if (!p || !p.id) return null;
      if (!p.dataUrl) return { id: p.id }; // photo non embarquée : simple référence, conservée telle quelle
      var ref = { id: generatePhotoId() };
      jobs.push(
        fetch(p.dataUrl).then(function (r) { return r.blob(); })
          .then(function (blob) { return savePhotoBlob(ref.id, blob); })
          .catch(function () {})
      );
      return ref;
    }).filter(Boolean);
  });
  if (typeof planImagesFromImport === 'function') jobs.push(planImagesFromImport(mission)); // plans du site (js/plans.js)
  if (typeof docsImagesFromImport === 'function') jobs.push(docsImagesFromImport(mission)); // documents joints et schémas
  return Promise.all(jobs).then(function () { return mission; });
}

// Ids de photos encore référencés par les missions de l'appareil (+ missions pas encore enregistrées,
// ex. celle en cours d'import) : une suppression ne touche jamais un blob qu'une autre mission utilise.
function referencedPhotoIds(extraMissions) {
  var ids = {};
  (state.missions || []).concat(extraMissions || []).forEach(function (m) {
    forEachInstallationPhotoField(m, function (inst) {
      (inst && inst.data && Array.isArray(inst.data.photo) ? inst.data.photo : []).forEach(function (p) {
        if (p && p.id) ids[p.id] = true;
        if (p && p.orig) ids[p.orig] = true; // original d'une photo annotée (js/annotation.js)
      });
    });
    (Array.isArray(m.plans) ? m.plans : []).forEach(function (p) { if (p && p.photoId) ids[p.photoId] = true; });
    if (typeof docsPhotoIds === 'function') docsPhotoIds(m).forEach(function (id) { ids[id] = true; });
  });
  return ids;
}

// Supprime de IndexedDB toutes les photos référencées par une mission entière — à appeler avant de
// retirer la mission de state.missions (deleteMission). Auparavant jamais appelé à la suppression :
// les blobs restaient orphelins indéfiniment, rongeant la marge de stockage (fuite trouvée lors de
// l'audit du 2026-09-18). À appeler APRÈS avoir retiré la mission de state.missions : tout id encore
// référencé ailleurs (state.missions ou keepMissions) est épargné.
function deleteMissionPhotoBlobs(mission, keepMissions) {
  var keep = referencedPhotoIds(keepMissions);
  var ids = [];
  forEachInstallationPhotoField(mission, function (inst) {
    (Array.isArray(inst.data.photo) ? inst.data.photo : []).forEach(function (p) {
      if (p && p.id && !keep[p.id]) ids.push(p.id);
      if (p && p.orig && !keep[p.orig]) ids.push(p.orig);
    });
  });
  (Array.isArray(mission.plans) ? mission.plans : []).forEach(function (p) { if (p && p.photoId && !keep[p.photoId]) ids.push(p.photoId); });
  if (typeof docsPhotoIds === 'function') docsPhotoIds(mission).forEach(function (id) { if (!keep[id] && ids.indexOf(id) === -1) ids.push(id); });
  return Promise.all(ids.map(function (id) { return deletePhotoBlob(id).catch(function () {}); }));
}

// Supprime de IndexedDB les photos référencées par une seule installation — à appeler avant de la
// retirer d'une mission (deleteInstallation), même raison que deleteMissionPhotoBlobs ci-dessus.
function deleteInstallationPhotoBlobs(inst) {
  var keep = referencedPhotoIds();
  var photos = (inst && inst.data && Array.isArray(inst.data.photo)) ? inst.data.photo : [];
  return Promise.all(photos.map(function (p) {
    if (p && p.orig && !keep[p.orig]) deletePhotoBlob(p.orig).catch(function () {});
    return (p && p.id && !keep[p.id]) ? deletePhotoBlob(p.id).catch(function () {}) : Promise.resolve();
  }));
}

// === Galerie (js/installations.js renderFieldInput) : miniatures, capture, suppression, visionneuse ===

var _photoObjectUrlCache = {};

// À appeler après chaque rendu (js/app.js render()) : les <img data-photo-src="id"> posées par le
// rendu HTML synchrone n'ont pas encore leur src, IndexedDB étant asynchrone. Mise en cache des
// URL objet en mémoire pour ne pas relire IndexedDB à chaque re-rendu (le formulaire de saisie
// déclenche un render() à chaque champ modifié).
function hydratePhotoThumbnails() {
  var imgs = document.querySelectorAll('img[data-photo-src]');
  imgs.forEach(function (img) {
    var id = img.getAttribute('data-photo-src');
    img.removeAttribute('data-photo-src');
    if (_photoObjectUrlCache[id]) { img.src = _photoObjectUrlCache[id]; return; }
    getPhotoBlob(id).then(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      _photoObjectUrlCache[id] = url;
      img.src = url;
    });
  });
}

function openPhotoViewer(id) {
  var show = function (url) {
    var el = document.getElementById('photo-viewer-root');
    if (!el) return;
    el.innerHTML = '<div class="photo-viewer" onclick="closePhotoViewer();">' +
      '<img src="' + url + '" onclick="event.stopPropagation();"></div>';
  };
  if (_photoObjectUrlCache[id]) { show(_photoObjectUrlCache[id]); return; }
  getPhotoBlob(id).then(function (blob) {
    if (!blob) return;
    var url = URL.createObjectURL(blob);
    _photoObjectUrlCache[id] = url;
    show(url);
  });
}

function closePhotoViewer() {
  var el = document.getElementById('photo-viewer-root');
  if (el) el.innerHTML = '';
}

console.log('✓ Photos (IndexedDB) chargé');
