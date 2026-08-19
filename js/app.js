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
// Le SW ne s'active jamais tout seul (pas de skipWaiting() côté install, cf. sw.js) : on affiche un
// bandeau et c'est le technicien qui décide quand actualiser, pour ne jamais couper une saisie en
// cours sur le terrain. reg.update() est aussi relancé périodiquement + au retour au premier plan,
// car le navigateur ne vérifie une nouvelle version qu'à la navigation par défaut — un onglet PWA
// laissé ouvert toute une journée de contrôle ne le détecterait sinon jamais tout seul.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').then(function (reg) {
      setInterval(function () { reg.update(); }, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update();
      });
      // Un SW peut déjà être "waiting" au moment où cette page se charge (ex. l'utilisateur avait
      // fermé l'app avant de confirmer une mise à jour précédente) : 'updatefound' ne se redéclenche
      // pas dans ce cas, donc il faut vérifier explicitement ici, pas seulement via l'évènement.
      if (reg.waiting && navigator.serviceWorker.controller) showSwUpdateBanner(reg);
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showSwUpdateBanner(reg);
          }
        });
      });
    }).catch(function (err) {
      console.log('[PWA] Erreur SW:', err);
    });

    var reloadingAfterUpdate = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloadingAfterUpdate) return;
      reloadingAfterUpdate = true;
      window.location.reload();
    });
  });
}

function showSwUpdateBanner(reg) {
  if (document.getElementById('sw-update-banner')) return;
  var banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.className = 'sw-update-banner';
  banner.innerHTML = '<span>Nouvelle version disponible</span><button type="button" class="sw-update-btn">Actualiser</button>';
  banner.querySelector('button').addEventListener('click', function () {
    if (reg.waiting) reg.waiting.postMessage('skipWaiting');
  });
  document.body.appendChild(banner);
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
