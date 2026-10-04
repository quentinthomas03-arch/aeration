// guide-utilisation.js - Guide d'utilisation de l'application (accueil > Guide)
// Ne décrit que des fonctionnalités réellement implémentées (voir chaque étape ci-dessous) : pas de
// mode d'emploi générique, pour rester fiable si l'appli évolue sans que ce guide soit mis à jour.
var GUIDE_UTILISATION_ETAPES = [
  {
    icon: 'plus',
    titre: '1. Créer ou reprendre une mission',
    texte: '« Nouvelle mission » puis les informations générales (client, site, n° d’affaire, dates). Pour un site déjà suivi : « Charger un site précédent » (mission de l’an dernier) ou « Importer un fichier Rapso (V29) ». Seules les données de structure sont reprises, jamais les mesures. L’accueil classe les missions (en cours, terminées, archivées) avec une recherche par client, site ou n° d’affaire.'
  },
  {
    icon: 'list',
    titre: '2. Choisir les installations à contrôler',
    texte: 'Sélectionnez les types présents sur le site, puis ajoutez chaque installation. Pour un laboratoire ou un atelier (soudure, peinture…), le type « Local à pollution spécifique » fait le bilan du local : air neuf par rapport au minimum réglementaire (R4222-11 et R4222-6), débit global extrait, compensation. Une installation qui recycle l’air se contrôle avec le type « Recyclage de l’air » (contrôle semestriel). Trois types suivent les guides INRS : décapage / grenaillage au jet libre (ED 768), machines-outils à fluide de coupe (ED 972), postes manuels aux solvants (ED 6049).'
  },
  {
    icon: 'edit',
    titre: '3. Remplir chaque installation',
    texte: 'La saisie se fait écran par écran ; le menu en haut permet de sauter à une étape. Les calculs sont automatiques et l’avis se met à jour en bas de la fiche, avec le critère en cause. Une valeur inhabituelle (69 au lieu de 6,9…) ou un écart de plus de 30 % avec l’an dernier est signalé sous le champ. Les grilles de points se saisissent au pavé numérique intégré (« Valider » passe au point suivant). « Aujourd’hui » remplit la date, « Phrases types » insère une observation, « Dupliquer » recopie la structure d’une installation semblable. En fin de fiche, « Terminé, installation suivante » enchaîne directement.'
  },
  {
    icon: 'building',
    titre: '4. Suivre l’avancement',
    texte: 'La fiche mission liste toutes les installations par bâtiment ou par type, avec leur statut et une recherche. Le « Bilan » résume les avis (part satisfaisante, répartition par type, points non satisfaisants).'
  },
  {
    icon: 'check',
    titre: '5. Vérifier avant de quitter le site',
    texte: 'Menu « ⋯ » > « Vérifier avant de partir » : installations non commencées, champs encore vides, valeurs inhabituelles, dates incohérentes, avis contredit par un critère calculé, infos de mission manquantes pour le rapport. Un tap ouvre la bonne étape.'
  },
  {
    icon: 'tool',
    titre: '6. Déclarer ses appareils de mesure',
    texte: 'Dans « Profil », enregistrez vos appareils (n° d’identification, date d’étalonnage). Cochez ceux utilisés dans « Infos mission » : ils apparaissent dans le rapport, et un étalonnage dépassé est signalé.'
  },
  {
    icon: 'edit',
    titre: '7. Remettre un compte rendu au client',
    texte: 'Depuis le Bilan : « Compte rendu de fin de visite ». Synthèse, points non satisfaisants, remarques, puis signature du client au doigt. Le document précise qu’il ne remplace pas le rapport de contrôle.'
  },
  {
    icon: 'flask',
    titre: '8. Générer et envoyer le rapport',
    texte: '« Rapport PDF » produit le rapport complet. Le menu « ⋯ » permet aussi de l’envoyer (mail, Teams…), d’exporter la synthèse en Excel et de transférer la mission en fichier .json.'
  },
  {
    icon: 'clipboard',
    titre: '9. Relevé des valeurs de référence (prestation optionnelle)',
    texte: 'Si la prestation est prévue au devis, cochez-la dans « Infos mission ». Le menu « ⋯ » propose alors le relevé pour le dossier de valeurs de référence (arrêté du 8 octobre 1987) : une valeur mesurée n’est proposée que si elle est satisfaisante, sinon le minimum réglementaire. Une fois le relevé signé par le client, indiquez la date de validation : ses valeurs serviront de références à la visite suivante.'
  },
  {
    icon: 'merge',
    titre: '10. Travailler à plusieurs sur un site',
    texte: 'Transférez la mission (menu « ⋯ », fichier .json) à votre collègue ; chacun saisit ses bâtiments. En fin de visite, « Fusionner le travail d’un collègue » réunit tout dans votre mission et signale les installations modifiées des deux côtés.'
  },
  {
    icon: 'database',
    titre: '11. Sauvegarde et sécurité des données',
    texte: 'Les données restent sur le téléphone. À chaque installation terminée, une sauvegarde automatique est enregistrée (dossier choisi via « Sauvegarde » sur ordinateur, téléchargements sur téléphone). Un bandeau prévient si l’espace est plein ou si l’appli est ouverte dans deux onglets. Ne videz pas les données du navigateur sans avoir exporté vos missions.'
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

  h += '<div class="card"><div style="font-weight:600;">Mission de démonstration</div>' +
    '<p class="subtitle" style="margin-top:8px;">Un site fictif complet (13 types d’installations, mesures et avis renseignés) pour découvrir l’appli ou la présenter, et générer un rapport d’exemple. Un bureau reste à mesurer pour essayer la saisie.</p>' +
    '<button class="btn btn-primary" style="margin-top:8px;" onclick="loadDemoMission();">' + ICONS.play + ' Charger la mission de démonstration</button>' +
    '<button class="btn btn-gray" onclick="startTour();">Revoir la visite guidée</button></div>';
  if (typeof renderNouveautesHistorique === 'function') h += renderNouveautesHistorique();

  return h;
}

console.log('✓ Guide d’utilisation chargé');
