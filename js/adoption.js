// adoption.js - Prise en main sans formation (chantier du 2026-10-03)
//
//  - Visite guidée au premier lancement : 4 écrans courts (mission, saisie, vérification/bilan,
//    rapport), proposant ensuite la mission de démonstration. Relançable depuis le Guide.
//  - Nouveautés : après une mise à jour, une carte sur l'accueil résume ce qui a changé.

var APP_VERSION = '1.59';

// Du plus récent au plus ancien. Une entrée par version publiée aux techniciens.
var NOUVEAUTES = [
  { version: '1.59', date: '04/10/2026', items: [
    'Installation non contrôlée : choisissez le motif (accès impossible, à l’arrêt…) ; elle apparaît comme telle dans le rapport au lieu d’une fiche vide.',
    'Contre-visite (Bilan ou menu ⋯) : nouvelle mission avec seulement les installations non satisfaisantes, mesure initiale en N-1, rapport d’origine rappelé.',
    'Noms de bâtiments à harmoniser (« Bât B » / « Bâtiment B - Production ») proposés dans « Vérifier avant de partir ».',
    'Relecture (menu ⋯) : validation et commentaires par installation, puis « Rapport vérifié par … le … » dans le rapport.'
  ] },
  { version: '1.58', date: '04/10/2026', items: [
    'Créer les installations par quantités (menu ⋯ ou sélection des installations) : tapez le nombre par type dans le tableau, ou collez / importez un tableau Excel (type, nombre, bâtiment, nom). Tout est créé d’un coup, avec les quantités prévues au devis. Modèle Excel téléchargeable.'
  ] },
  { version: '1.57', date: '04/10/2026', items: [
    'Mesure très proche du seuil (à moins de 5 %) : signalée « à confirmer » sous l’objectif et dans « Vérifier avant de partir ».',
    'Point aberrant dans une grille (très différent des autres points) : signalé sous la grille, à revérifier avant de quitter le poste.',
    'Quantités prévues au devis (« Préparer la visite ») : l’écart avec les installations de la mission est signalé avant de partir.'
  ] },
  { version: '1.56', date: '04/10/2026', items: [
    'Bilan d’air neuf des CTA : dans la fiche d’une CTA, cochez les locaux qu’elle alimente ; l’air neuf mesuré est comparé au besoin réglementaire cumulé de ces locaux (R4222-6). Repris dans le rapport (4.4).',
    'Historique : la mesure principale de chaque installation est gardée de visite en visite et affichée en petite courbe dans la fiche.',
    'Calculette de terrain (bouton en haut des fiches et menu ⋯) : débit d’après la vitesse et la section, vitesse au tube de Pitot, renouvellement d’air, air neuf par occupant.'
  ] },
  { version: '1.55', date: '04/10/2026', items: [
    'Préparer la visite (menu ⋯) : notes pratiques du site et des installations, reprises l’an prochain et hors rapport ; matériel à emporter selon les installations ; étalonnage des appareils.',
    'Photo de l’an dernier affichée à côté du bouton photo, pour reprendre le même cadrage.',
    'Temps passé sur les fiches, par type, dans le Bilan (interne) : pour chiffrer la prochaine visite.',
    'Bilan du réseau sur le schéma : débit au ventilateur comparé à la somme des débits mesurés aux installations raccordées.'
  ] },
  { version: '1.54', date: '04/10/2026', items: [
    'Guide d’utilisation et visite guidée mis à jour : étiquettes QR, objectif avant la mesure, photos annotées et plaque, plan du site, schéma du réseau, documents du client, envoi par mail.'
  ] },
  { version: '1.53', date: '04/10/2026', items: [
    'Photo de la plaque signalétique : en bas de la fiche d’un équipement, photographiez la plaque (marque, modèle, débit nominal). Elle est reprise à la visite suivante, hors rapport.'
  ] },
  { version: '1.52', date: '04/10/2026', items: [
    'Nouvelle installation depuis le schéma de réseau ou le plan du site : type, nom et bâtiment, puis un toucher pour la placer. Elle rejoint la mission, à renseigner ensuite comme les autres.'
  ] },
  { version: '1.51', date: '04/10/2026', items: [
    'Schéma de réseau simplifié : installations, ventilateur, filtre, rejet et retour d’air. Les gaines se tracent en touchant le départ puis l’arrivée ; toucher une gaine crée un piquage (division vers plusieurs installations). Le sens de l’air et la couleur des gaines sont automatiques.'
  ] },
  { version: '1.50', date: '04/10/2026', items: [
    'Annoter une photo : bouton crayon sur chaque photo pour entourer, flécher ou écrire sur le défaut (3 couleurs). La photo annotée part dans le rapport ; l’original est conservé pour reprendre l’annotation.'
  ] },
  { version: '1.49', date: '04/10/2026', items: [
    'Étiquettes QR : avant la visite, imprimez depuis la mission (menu ⋯) une planche d’étiquettes, une par installation, avec son nom dessous. Collez-les sur site ; l’an prochain, « Scanner l’étiquette » (ou l’appareil photo du téléphone) ouvre directement la bonne fiche.'
  ] },
  { version: '1.48', date: '04/10/2026', items: [
    'Objectif avant la mesure : au-dessus de chaque champ de mesure, la valeur à atteindre pour un avis satisfaisant (déduite du calcul de l’appli), avec « atteint / non atteint » dès la saisie.'
  ] },
  { version: '1.47', date: '04/10/2026', items: [
    'Schéma de réseau refait : on choisit d’abord les types d’installations du réseau, puis on place les vraies installations d’un toucher (nom, numéro et couleur de l’avis repris).',
    'Numéros et noms sur chaque élément, couleurs au choix, gaines colorées selon leur rôle (aspiration, rejet, recyclage, air neuf), légende et nomenclature à l’écran et dans le rapport.'
  ] },
  { version: '1.46', date: '04/10/2026', items: [
    'Schémas de réseau : bouton « Dessiner un schéma de réseau » ajouté aussi dans l’onglet Plan de la mission.'
  ] },
  { version: '1.45', date: '04/10/2026', items: [
    'Sanitaires : un WC, une salle de bains ou de douches à usage individuel est comparé à 15 m³/h (article R4212-6), et non plus à 30 ou 45 m³/h.'
  ] },
  { version: '1.44', date: '04/10/2026', items: [
    'Envoyer par mail : le rapport PDF et le fichier de la mission (pour modifier sur ordinateur) partent dans un mail prêt (objet, texte, signature) ; choisissez Outlook puis le destinataire.'
  ] },
  { version: '1.43', date: '04/10/2026', items: [
    'Documents joints : dans les données de la mission, joignez photos, images ou PDF remis par le client (plan du réseau d’aspiration, schéma de l’installateur…). Ils sont annexés au rapport et repris à la visite suivante.',
    'Schéma de réseau : sans plan du client, dessinez le réseau sur site en quelques touchers (postes, captages, registres, filtre, ventilateur, rejet), reliez par des gaines fléchées et rattachez chaque poste à son installation.'
  ] },
  { version: '1.42', date: '04/10/2026', items: [
    'Plan du site : photographiez le plan d’évacuation, placez chaque installation d’un toucher. Les épingles prennent la couleur de l’avis, le plan apparaît dans le rapport et revient à la visite suivante.'
  ] },
  { version: '1.41', date: '04/10/2026', items: [
    'Couleurs de l’appli alignées sur le bleu SOCOTEC du rapport PDF.',
    'Nouvel en-tête de mission : client, site, date, technicien et anneau d’avancement.',
    'Listes : bande de couleur selon l’avis et barre d’avancement sous chaque bâtiment.'
  ] },
  { version: '1.40', date: '04/10/2026', items: [
    'Vue « Par type » : chaque ligne affiche le nom de l’installation, le bâtiment au-dessus.',
    'Bouton « Dupliquer » des listes plus grand et séparé de la flèche d’ouverture.',
    'Ouverture de l’appli sans attente : l’écran d’accueil animé ne s’affiche en entier qu’au premier lancement.'
  ] },
  { version: '1.39', date: '04/10/2026', items: [
    'Ouverture plus rapide : les modules PDF et Excel ne se chargent plus qu’au moment de s’en servir.',
    'Nouvel écran « À propos » (accueil) : version, réglementation, normes et guides INRS appliqués.'
  ] },
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
  { icon: 'map', titre: 'Le site sous les yeux',
    texte: 'Plan du site avec les installations épinglées, schéma du réseau (gaines, ventilateur, rejet), documents du client, étiquettes QR à coller : l’an prochain, un scan ouvre la bonne fiche. Au-dessus de chaque mesure, l’objectif à atteindre.' },
  { icon: 'check', titre: 'Avant de quitter le site',
    texte: '« Vérifier avant de partir » liste ce qui manque ou paraît incohérent. Le Bilan résume les avis et produit un compte rendu signé par le client sur l’écran.' },
  { icon: 'download', titre: 'Le rapport en un clic',
    texte: 'Rapport PDF au format Rapso, mail prêt dans Outlook (rapport + mission), export Excel. Tout est enregistré sur le téléphone et sauvegardé automatiquement à chaque installation terminée.' }
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
