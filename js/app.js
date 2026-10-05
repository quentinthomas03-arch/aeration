// app.js - Point d'entrée application Contrôle Aération

function render() {
  var h = '';
  if (typeof chronoTick === 'function') chronoTick(); // temps passé par installation (js/temps.js)
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
    case 'ed-reference': h = renderEdReference(); break;
    case 'guide-utilisation': h = renderGuideUtilisation(); break;
    case 'verification-depart': h = renderVerificationDepart(); break;
    case 'bilan': h = renderBilan(); break;
    case 'compte-rendu': h = renderCompteRendu(); break;
    case 'dvr': h = renderDvr(); break;
    case 'a-propos': h = renderAPropos(); break;
    case 'preparation': h = renderPreparation(); break;
    case 'import-liste': h = renderImportListe(); break;
    case 'valeurs-ref': h = renderValeursReference(); break;
    case 'relecture': h = renderRelecture(); break;
    case 'schema-editor': h = renderSchemaEditor(); break;
    default: h = renderHome();
  }
  document.getElementById('app').innerHTML = h;
  if (typeof hydratePhotoThumbnails === 'function') hydratePhotoThumbnails();
  if (state.view === 'profil-technicien' && typeof initVisaPad === 'function') initVisaPad(); // visa (js/finitions.js)
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

// Appelé par saveData() (js/state.js) en cas d'échec d'écriture localStorage (quota dépassé le plus
// souvent) — auparavant complètement silencieux : la dernière saisie était perdue sans aucun
// avertissement (audit du 2026-09-18). Un seul bandeau à la fois, non auto-masqué : l'utilisateur doit
// le fermer lui-même après avoir libéré de la place, pour ne pas laisser croire que c'est résolu tout seul.
function showStorageErrorBanner() {
  if (document.getElementById('storage-error-banner')) return;
  var banner = document.createElement('div');
  banner.id = 'storage-error-banner';
  banner.className = 'storage-error-banner';
  banner.innerHTML = '<span>' + ICONS.database + ' Espace de stockage insuffisant — la dernière modification n’a PAS été enregistrée. Exportez puis supprimez d’anciennes missions.</span><button type="button" class="storage-error-banner-btn">Fermer</button>';
  banner.querySelector('button').addEventListener('click', function () {
    banner.remove();
  });
  document.body.appendChild(banner);
}

// Bandeau d'alerte données persistant (même style que le bandeau de stockage) : données illisibles
// mises de côté, onglet périmé (js/state.js). Le bouton déclenche l'action proposée.
function showDataAlertBanner(id, message, buttonLabel, onClick) {
  if (!document.body) { document.addEventListener('DOMContentLoaded', function () { showDataAlertBanner(id, message, buttonLabel, onClick); }); return; }
  if (document.getElementById(id)) return;
  var banner = document.createElement('div');
  banner.id = id;
  banner.className = 'storage-error-banner';
  banner.innerHTML = '<span>' + ICONS.database + ' ' + escapeHtml(message) + '</span><button type="button" class="storage-error-banner-btn"></button>';
  var btn = banner.querySelector('button');
  btn.textContent = buttonLabel;
  btn.addEventListener('click', onClick);
  document.body.appendChild(banner);
}

// Les champs n'enregistrent qu'à l'évènement "change" (sortie du champ). Un technicien qui saisit une
// valeur puis verrouille le téléphone ou change d'appli ne quitte jamais le champ, et Android peut
// tuer la page en arrière-plan : la dernière saisie était perdue. On force la validation du champ
// actif dès que la page passe en arrière-plan (blur déclenche "change" de façon synchrone).
function flushPendingInput() {
  var el = document.activeElement;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) el.blur();
}
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') flushPendingInput();
});
window.addEventListener('pagehide', flushPendingInput);

// Bouton retour Android
window.addEventListener('popstate', function (event) {
  event.preventDefault();
  if (state.view === 'installation-form') state.view = 'type-list';
  else if (state.view === 'type-list') state.view = 'mission-detail';
  else if (state.view === 'add-installation-picker') state.view = 'mission-detail';
  else if (state.view === 'site-overview-group') state.view = 'mission-detail';
  else if (state.view === 'verification-depart') state.view = 'mission-detail';
  else if (state.view === 'bilan') state.view = 'mission-detail';
  else if (state.view === 'compte-rendu') state.view = 'bilan';
  else if (state.view === 'dvr') state.view = 'mission-detail';
  else if (state.view === 'a-propos') state.view = 'home';
  else if (state.view === 'preparation') state.view = 'mission-detail';
  else if (state.view === 'import-liste' || state.view === 'valeurs-ref') state.view = 'mission-detail';
  else if (state.view === 'relecture') state.view = 'mission-detail';
  else if (state.view === 'schema-editor') state.view = 'mission-form';
  else if (state.view === 'import-conflict') state.view = 'home';
  else if (state.view === 'ed-reference') state.view = 'home';
  else if (state.view === 'guide-utilisation') state.view = 'home';
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
if (typeof shouldShowTour === 'function' && shouldShowTour()) startTour();

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

// Splash screen : animation complète au tout premier lancement, à peine visible ensuite (il imposait
// 1,4 s d'attente à chaque ouverture alors que l'appli est prête bien avant — ergonomie du 2026-10-04).
(function () {
  var SPLASH_KEY = 'aeration_splash_vu_v1', dejaVu = false;
  try { dejaVu = !!localStorage.getItem(SPLASH_KEY); localStorage.setItem(SPLASH_KEY, '1'); } catch (e) {}
  setTimeout(function () {
    var splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(function () { splash.remove(); }, dejaVu ? 250 : 600);
    }
  }, dejaVu ? 150 : 1400);
})();
console.log('✓ App Contrôle Aération chargée');
