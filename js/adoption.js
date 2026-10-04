// adoption.js - Prise en main sans formation (chantier du 2026-10-03)
//
//  - Visite guidée au premier lancement : 4 écrans courts (mission, saisie, vérification/bilan,
//    rapport), proposant ensuite la mission de démonstration. Relançable depuis le Guide.
//  - Nouveautés : après une mise à jour, une carte sur l'accueil résume ce qui a changé.

var APP_VERSION = '1.37';

// Du plus récent au plus ancien. Une entrée par version publiée aux techniciens.
var NOUVEAUTES = [
  { version: '1.37', date: '03/10/2026', items: [
    'Trois nouveaux types d’après les guides INRS : décapage / grenaillage au jet libre (ED 768), machines-outils à fluide de coupe (ED 972), postes manuels aux solvants (ED 6049).',
    'Grilles de points : pavé numérique intégré, « Valider » passe au point suivant.',
    'Mode « Plein soleil » (bouton thème de l’accueil) : contraste maximal et boutons agrandis.',
    'Un pictogramme par type d’installation.'
  ] },
  { version: '1.36', date: '03/10/2026', items: [
    'Recyclage : surveillance obligatoire (R4222-16), renvoi interdit vers un local à pollution non spécifique (R4222-9), information du médecin du travail et du CSE (R4222-17).',
    'Local à pollution spécifique : sens de l’air vers les locaux voisins (R4212-5).',
    'Guide d’utilisation mis à jour avec toutes les fonctions.'
  ] },
  { version: '1.34', date: '03/10/2026', items: [
    'Nouveau type « Local à pollution spécifique » (laboratoire, atelier de soudure…) : extraction globale, air neuf par rapport au minimum réglementaire (R4222-11 / R4222-6), compensation.',
    'Nouveau type « Recyclage de l’air » : contrôle semestriel (concentration dans l’air recyclé, surveillance, épuration) et poussières du local (R4222-10 : 4 et 0,9 mg/m³).'
  ] },
  { version: '1.33', date: '03/10/2026', items: [
    'Relevé pour le dossier de valeurs de référence (arrêté du 8 octobre 1987) : à activer dans les infos mission quand la prestation est prévue au devis, puis menu « ⋯ ». Une fois validé par le client, ses valeurs servent de références à la visite suivante.'
  ] },
  { version: '1.32', date: '03/10/2026', items: [
    'Travail à plusieurs sur un site : chacun saisit ses bâtiments, puis « Fusionner le travail d’un collègue » (menu « ⋯ ») réunit tout dans une seule mission.'
  ] },
  { version: '1.31', date: '03/10/2026', items: [
    'Alerte sous le champ quand une mesure paraît inhabituelle (69 au lieu de 6,9…).',
    '« Vérifier avant de partir » signale aussi les incohérences : dates, avis, infos du rapport.',
    'Compte rendu de fin de visite signé par le client sur l’écran (depuis le Bilan).',
    'Envoi du rapport en un geste (mail, Teams…) et export Excel de la synthèse (menu « ⋯ »).',
    'Accueil : recherche, filtres en cours / terminées / archivées, avancement de chaque mission.'
  ] },
  { version: '1.30', date: '03/10/2026', items: [
    'Écran de mission allégé, avec un Bilan (anneau des avis, points non satisfaisants).',
    '« Terminé, installation suivante » pour enchaîner sans repasser par la liste.',
    'Avis mis à jour en direct en bas de chaque fiche.',
    'Thème sombre (bouton sur l’accueil) et bouton « Aujourd’hui » sur les dates.'
  ] }
];

var SEEN_VERSION_KEY = 'aeration_seen_version_v1';
var TOUR_DONE_KEY = 'aeration_tour_done_v1';

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

// === Nouveautés ===

function renderNouveautesCard() {
  var seen = lsGet(SEEN_VERSION_KEY);
  if (seen === APP_VERSION) return '';
  // Tout premier lancement : la visite guidée suffit, pas de « nouveautés » pour quelqu'un qui découvre
  if (!seen && !state.missions.length) { lsSet(SEEN_VERSION_KEY, APP_VERSION); return ''; }
  var news = NOUVEAUTES.filter(function (n) { return !seen || versionGreater(n.version, seen); });
  if (!news.length) { lsSet(SEEN_VERSION_KEY, APP_VERSION); return ''; }
  var h = '<div class="card news-card"><div class="news-head"><span class="news-badge">Nouveau</span>' +
    '<span class="news-title">Quoi de neuf dans l’appli</span></div><ul class="news-list">';
  news.forEach(function (n) { n.items.forEach(function (it) { h += '<li>' + escapeHtml(it) + '</li>'; }); });
  h += '</ul><button class="btn btn-gray btn-small" onclick="dismissNouveautes();">J’ai compris</button></div>';
  return h;
}

function versionGreater(a, b) {
  var pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

function dismissNouveautes() {
  lsSet(SEEN_VERSION_KEY, APP_VERSION);
  render();
}

function renderNouveautesHistorique() {
  var h = '<div class="section-title">Historique des nouveautés</div>';
  NOUVEAUTES.forEach(function (n) {
    h += '<div class="card"><div style="font-weight:600;">Version ' + escapeHtml(n.version) + ' <span class="subtitle">· ' + escapeHtml(n.date) + '</span></div><ul class="news-list">';
    n.items.forEach(function (it) { h += '<li>' + escapeHtml(it) + '</li>'; });
    h += '</ul></div>';
  });
  return h;
}

// === Visite guidée ===

var TOUR_STEPS = [
  { icon: 'building', titre: 'Une mission = une visite de site',
    texte: 'Créez une mission, ou repartez de la visite de l’an dernier (fichier JSON ou classeur Rapso) : bâtiments et installations sont repris, il ne reste qu’à mesurer.' },
  { icon: 'zap', titre: 'Une saisie guidée, étape par étape',
    texte: 'Chaque installation se remplit écran par écran. Les calculs sont automatiques, l’avis se met à jour en direct en bas de la fiche, et une valeur inhabituelle est signalée tout de suite.' },
  { icon: 'check', titre: 'Avant de quitter le site',
    texte: '« Vérifier avant de partir » liste ce qui manque ou paraît incohérent. Le Bilan résume les avis et produit un compte rendu signé par le client sur l’écran.' },
  { icon: 'download', titre: 'Le rapport en un clic',
    texte: 'Rapport PDF au format Rapso, envoi par mail ou Teams, export Excel. Tout est enregistré sur le téléphone et sauvegardé automatiquement à chaque installation terminée.' }
];

function shouldShowTour() {
  return !lsGet(TOUR_DONE_KEY) && !state.missions.length;
}

function startTour() {
  state.tourStep = 0;
  renderTour();
}

function renderTour() {
  var root = document.getElementById('tour-root');
  if (!root) { root = document.createElement('div'); root.id = 'tour-root'; document.body.appendChild(root); }
  if (typeof state.tourStep !== 'number') { root.innerHTML = ''; return; }
  var i = state.tourStep, s = TOUR_STEPS[i], last = i === TOUR_STEPS.length - 1;
  var dots = TOUR_STEPS.map(function (_, j) { return '<span class="tour-dot' + (j === i ? ' active' : '') + '"></span>'; }).join('');
  root.innerHTML = '<div class="tour-overlay"><div class="tour-card" role="dialog" aria-modal="true" aria-label="Visite guidée">' +
    '<div class="tour-icon">' + getIcon(s.icon) + '</div>' +
    '<div class="tour-step">' + (i + 1) + ' / ' + TOUR_STEPS.length + '</div>' +
    '<h2 class="tour-title">' + escapeHtml(s.titre) + '</h2><p class="tour-text">' + escapeHtml(s.texte) + '</p>' +
    '<div class="tour-dots">' + dots + '</div>' +
    (last
      ? '<button class="btn btn-primary" onclick="endTour(true);">' + ICONS.play + ' Essayer avec la mission de démo</button>' +
        '<button class="btn btn-gray" onclick="endTour(false);">Commencer</button>'
      : '<div class="row"><button class="btn btn-gray" onclick="endTour(false);">Passer</button>' +
        '<button class="btn btn-primary" onclick="state.tourStep++;renderTour();">Suivant ' + ICONS.arrowRight + '</button></div>') +
    '</div></div>';
}

function endTour(withDemo) {
  lsSet(TOUR_DONE_KEY, '1');
  lsSet(SEEN_VERSION_KEY, APP_VERSION);
  state.tourStep = null;
  renderTour();
  if (withDemo && typeof loadDemoMission === 'function') loadDemoMission();
  else render();
}

console.log('✓ Prise en main (visite guidée, nouveautés) chargée');
