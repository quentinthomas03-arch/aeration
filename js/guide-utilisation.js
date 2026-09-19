// guide-utilisation.js - Guide d'utilisation de l'application (accueil > Guide)
// Ne décrit que des fonctionnalités réellement implémentées (voir chaque étape ci-dessous) : pas de
// mode d'emploi générique, pour rester fiable si l'appli évolue sans que ce guide soit mis à jour.
var GUIDE_UTILISATION_ETAPES = [
  {
    icon: 'plus',
    titre: '1. Créer une mission',
    texte: 'Depuis l’accueil, « Nouvelle mission » puis renseignez les informations générales (onglet Entrées : client, site, intervenant...).'
  },
  {
    icon: 'list',
    titre: '2. Choisir les installations à contrôler',
    texte: 'Sélectionnez les types d’installations présentes sur le site (CTA, sanitaires, hottes, sorbonnes...) puis ajoutez chaque installation une à une.'
  },
  {
    icon: 'edit',
    titre: '3. Remplir chaque installation',
    texte: 'Un assistant pas-à-pas découpe la saisie en courtes étapes. Le menu déroulant en haut de l’écran (à la place de « Étape X / N ») permet de sauter directement à une étape précise sans repasser par toutes les autres.'
  },
  {
    icon: 'copy',
    titre: '4. Gagner du temps sur les données non mesurées',
    texte: 'Trois raccourcis, à utiliser selon le cas : « Dupliquer » sur une installation pour recopier ses données structurelles vers une installation similaire du même type ; « Charger un site précédent » pour repartir d’une mission antérieure (préremplissage N-1, mesures laissées vierges) ; « Importer un fichier Rapso (V29) » pour repartir d’un ancien classeur Excel déjà rempli. Dans les trois cas, seules les données de structure sont reprises — jamais les mesures, toujours à refaire sur site.'
  },
  {
    icon: 'building',
    titre: '5. Suivre l’avancement',
    texte: 'La vue d’ensemble d’un site liste toutes les installations, avec recherche et regroupement par bâtiment ou par type, pour se repérer même sur un site avec de nombreuses installations.'
  },
  {
    icon: 'flask',
    titre: '6. Générer le rapport',
    texte: 'Depuis la fiche mission, « Rapport PDF » génère directement le rapport complet — aucune étape intermédiaire dans un autre logiciel.'
  }
];

function renderGuideUtilisation() {
  var h = '<button class="back-btn" onclick="state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  h += '<div class="card"><h1>' + ICONS.play + ' Guide d’utilisation</h1>' +
    '<p class="subtitle">Le déroulé d’une mission, du premier écran au rapport final</p></div>';

  GUIDE_UTILISATION_ETAPES.forEach(function (e) {
    h += '<div class="card">';
    h += '<div class="row" style="align-items:center;gap:12px;">';
    h += '<div class="nav-icon">' + getIcon(e.icon) + '</div>';
    h += '<div style="flex:1;font-weight:600;">' + escapeHtml(e.titre) + '</div>';
    h += '</div>';
    h += '<p class="subtitle" style="margin-top:8px;">' + escapeHtml(e.texte) + '</p>';
    h += '</div>';
  });

  return h;
}

console.log('✓ Guide d’utilisation chargé');
