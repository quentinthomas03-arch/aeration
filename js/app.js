// app.js - Point d'entrée application Contrôle Aération

function render() {
  var h = '';
  switch (state.view) {
    case 'home': h = renderHome(); break;
    case 'mission-form': h = renderMissionForm(); break;
    case 'select-installations': h = renderSelectInstallations(); break;
    case 'profil-technicien': h = renderProfilTechnicien(); break;
    case 'mission-detail': h = renderMissionDetail(); break;
    case 'type-list': h = renderTypeList(); break;
    case 'installation-form': h = renderInstallationForm(); break;
    case 'add-installation-picker': h = renderAddInstallationPicker(); break;
    case 'site-overview-group': h = renderSiteOverviewGroupFull(); break;
    case 'import-conflict': h = renderImportConflict(); break;
    default: h = renderHome();
  }
  document.getElementById('app').innerHTML = h;
  if (typeof hydratePhotoThumbnails === 'function') hydratePhotoThumbnails();
  if (typeof hydrateStorageIndicator === 'function') hydrateStorageIndicator();
}

// PWA - Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function (err) {
      console.log('[PWA] Erreur SW:', err);
    });
  });
}

// Bouton retour Android
window.addEventListener('popstate', function (event) {
  event.preventDefault();
  if (state.view === 'installation-form') state.view = 'type-list';
  else if (state.view === 'type-list') state.view = 'mission-detail';
  else if (state.view === 'add-installation-picker') state.view = 'mission-detail';
  else if (state.view === 'site-overview-group') state.view = 'mission-detail';
  else if (state.view === 'import-conflict') state.view = 'home';
  else if (state.view === 'select-installations') state.view = 'mission-detail';
  else if (state.view === 'mission-form') state.view = 'home';
  else if (state.view === 'mission-detail') state.view = 'home';
  else if (state.view === 'profil-technicien') state.view = 'home';
  else state.view = 'home';
  render();
});
history.pushState({ view: state.view }, '', '');

loadData();
render();

// Migration rétrocompatible des photos base64 brutes (voir js/photos.js migrateLegacyPhotos) — hors
// du chemin critique du premier rendu, ne relance un rendu que si une migration a eu lieu.
if (typeof migrateLegacyPhotos === 'function') {
  migrateLegacyPhotos().then(function (changed) { if (changed) render(); });
}

// Nom du dossier de sauvegarde auto déjà configuré (js/auto-backup.js) — hors du chemin critique
// du premier rendu, ne relance un rendu que si un dossier était déjà configuré.
if (typeof loadAutoBackupDirName === 'function') {
  loadAutoBackupDirName().then(function () { if (state._autoBackupDirName) render(); });
}

// Splash screen
setTimeout(function () {
  var splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(function () { splash.remove(); }, 600);
  }
}, 1400);
console.log('✓ App Contrôle Aération chargée');
