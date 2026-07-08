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
    default: h = renderHome();
  }
  document.getElementById('app').innerHTML = h;
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

// Splash screen
setTimeout(function () {
  var splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(function () { splash.remove(); }, 600);
  }
}, 1400);
console.log('✓ App Contrôle Aération chargée');
