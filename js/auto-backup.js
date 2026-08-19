// auto-backup.js - Sauvegarde automatique redondante après chaque installation "Terminé"
//
// Filet de sécurité indépendant du transfert manuel existant (js/import-export.js
// shareOrExportMission) : si le stockage du navigateur est vidé (nettoyage cache, mise à jour
// système, bug navigateur), un export JSON horodaté existe déjà quelque part en dehors du
// navigateur. Réutilise buildMissionExportBlob/downloadBlob (js/import-export.js) — même format
// de fichier, même résolution des photos IndexedDB en base64.
//
// Deux chemins d'écriture, choisis par détection de fonctionnalité :
//  - File System Access API (Chrome/Edge/Opera DESKTOP uniquement — absente de Firefox, Safari
//    desktop/iOS et Chrome Android : voir proposition technique validée avant ce chantier) : le
//    technicien choisit un dossier une fois (chooseAutoBackupFolder, geste utilisateur), le handle
//    est conservé dans IndexedDB et réutilisé silencieusement tant que la permission reste
//    accordée (queryPermission ne redemande jamais de geste ; requestPermission n'est volontairement
//    jamais appelé depuis le déclenchement automatique pour ne pas faire surgir un prompt navigateur
//    hors contexte — seul un nouveau chooseAutoBackupFolder, initié par le technicien, peut ré-
//    accorder l'accès).
//  - Repli universel (mobile inclus) : téléchargement silencieux classique vers le dossier de
//    téléchargements par défaut, via downloadBlob — déjà utilisé par l'export manuel.
//
// Jamais de popup/alert à chaque sauvegarde (succès ou échec) : seul un indicateur discret
// ("Dernière sauvegarde auto : il y a Xmin", accueil) reflète l'état, cf. renderAutoBackupIndicator.

var AUTO_BACKUP_DB_NAME = 'aeration_backup_v1';
var AUTO_BACKUP_STORE = 'meta';
var AUTO_BACKUP_DIR_KEY = 'dirHandle';
var AUTO_BACKUP_LAST_RUN_KEY = 'aeration_last_autobackup_v1';

var _autoBackupDbPromise = null;
function openAutoBackupDb() {
  if (_autoBackupDbPromise) return _autoBackupDbPromise;
  _autoBackupDbPromise = new Promise(function (resolve, reject) {
    var req = indexedDB.open(AUTO_BACKUP_DB_NAME, 1);
    req.onupgradeneeded = function () {
      if (!req.result.objectStoreNames.contains(AUTO_BACKUP_STORE)) req.result.createObjectStore(AUTO_BACKUP_STORE);
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
  return _autoBackupDbPromise;
}

function idbGet(store, key) {
  return openAutoBackupDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, 'readonly');
      var req = tx.objectStore(store).get(key);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function idbSet(store, key, value) {
  return openAutoBackupDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function isFsaSupported() {
  return typeof window.showDirectoryPicker === 'function';
}

// Geste utilisateur requis (bouton dédié, cf. renderHome) — c'est le seul moment où l'on demande
// explicitement la permission d'écriture, jamais depuis le déclenchement automatique silencieux.
function chooseAutoBackupFolder() {
  if (!isFsaSupported()) return;
  window.showDirectoryPicker({ mode: 'readwrite' }).then(function (handle) {
    return idbSet(AUTO_BACKUP_STORE, AUTO_BACKUP_DIR_KEY, handle).then(function () {
      state._autoBackupDirName = handle.name;
      render();
    });
  }).catch(function (err) {
    if (err && err.name === 'AbortError') return; // annulé par le technicien, rien à faire
    alert('Impossible de sélectionner ce dossier :\n\n' + err.message);
  });
}

// Lecture au démarrage (js/app.js) : affiche le nom du dossier déjà configuré sans redemander de
// permission (le simple nom du handle est lisible même si la permission a expiré entre-temps).
function loadAutoBackupDirName() {
  return idbGet(AUTO_BACKUP_STORE, AUTO_BACKUP_DIR_KEY).then(function (handle) {
    if (handle && handle.name) state._autoBackupDirName = handle.name;
  }).catch(function () {});
}

// Ne redemande jamais de permission (requestPermission) depuis ce chemin silencieux — uniquement
// queryPermission, qui ne déclenche aucun prompt. Résout null si l'API est absente, si aucun
// dossier n'est configuré, ou si la permission n'est plus accordée (dossier supprimé, révoquée...).
function getVerifiedBackupDirHandle() {
  if (!isFsaSupported()) return Promise.resolve(null);
  return idbGet(AUTO_BACKUP_STORE, AUTO_BACKUP_DIR_KEY).then(function (handle) {
    if (!handle) return null;
    return handle.queryPermission({ mode: 'readwrite' }).then(function (perm) {
      return perm === 'granted' ? handle : null;
    }).catch(function () { return null; });
  });
}

function writeToBackupDir(dirHandle, filename, blob) {
  return dirHandle.getFileHandle(filename, { create: true })
    .then(function (fileHandle) { return fileHandle.createWritable(); })
    .then(function (writable) { return writable.write(blob).then(function () { return writable.close(); }); });
}

function autoBackupFilename(m) {
  var safeName = (m.clientSite || 'mission').toLowerCase()
    .replace(/[^a-z0-9à-ÿ _-]/g, '').replace(/\s+/g, '-').substring(0, 30) || 'mission';
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  return 'mission-' + safeName + '-' + stamp + '.json';
}

// Point d'entrée appelé après chaque installation marquée "Terminé" (js/installations.js,
// js/wizard-engine.js, js/wizard-sanitaires.js). Ne bloque jamais la navigation : la vue a déjà
// changé quand cette fonction s'exécute, tout ici se passe en tâche de fond.
function scheduleAutoBackup() {
  var m = getCurrentMission();
  if (!m || typeof buildMissionExportBlob !== 'function') return;
  var filename = autoBackupFilename(m);

  buildMissionExportBlob(m).then(function (built) {
    return getVerifiedBackupDirHandle().then(function (dirHandle) {
      if (!dirHandle) { downloadBlob(built.blob, filename); return; }
      return writeToBackupDir(dirHandle, filename, built.blob).catch(function () {
        downloadBlob(built.blob, filename); // dossier supprimé/permission perdue entre-temps
      });
    });
  }).then(function () {
    saveData(AUTO_BACKUP_LAST_RUN_KEY, Date.now());
    refreshAutoBackupIndicator();
  }).catch(function (err) {
    console.log('[auto-backup] échec silencieux :', err && err.message);
  });
}

// === Indicateurs discrets (accueil, js/missions.js renderHome) ===

function formatAutoBackupAge(ts) {
  var minutes = Math.round((Date.now() - ts) / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return 'il y a ' + minutes + ' min';
  var hours = Math.round(minutes / 60);
  if (hours < 24) return 'il y a ' + hours + ' h';
  return 'il y a ' + Math.round(hours / 24) + ' j';
}

function renderAutoBackupIndicator() {
  var ts = null;
  try { var raw = localStorage.getItem(AUTO_BACKUP_LAST_RUN_KEY); if (raw) ts = JSON.parse(raw); } catch (e) {}
  if (!ts) return '';
  return '<div class="subtitle" id="auto-backup-indicator-root" style="margin-top:6px;">' + ICONS.check + ' Dernière sauvegarde auto : ' + formatAutoBackupAge(ts) + '</div>';
}

function refreshAutoBackupIndicator() {
  var el = document.getElementById('auto-backup-indicator-root');
  if (!el) return; // pas sur l'accueil : redevient à jour au prochain passage (renderHome relit le timestamp)
  el.outerHTML = renderAutoBackupIndicator();
}

// Bouton de configuration (accueil) — masqué entièrement hors Chrome/Edge/Opera desktop, seules
// plateformes où File System Access est disponible (cf. commentaire d'en-tête).
function renderAutoBackupFolderButton() {
  if (!isFsaSupported()) return '';
  var label = state._autoBackupDirName
    ? 'Dossier de sauvegarde auto : ' + state._autoBackupDirName + ' (changer)'
    : 'Choisir un dossier de sauvegarde automatique';
  return '<button class="btn btn-gray btn-small" onclick="chooseAutoBackupFolder();" style="margin-top:8px;">' +
    ICONS.folder + ' ' + escapeHtml(label) + '</button>';
}

console.log('✓ Sauvegarde automatique chargée');
