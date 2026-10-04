// guide-utilisation.js - Guide d'utilisation de l'application (accueil > Guide)
// Ne décrit que des fonctionnalités réellement implémentées (voir chaque étape ci-dessous) : pas de
// mode d'emploi générique, pour rester fiable si l'appli évolue sans que ce guide soit mis à jour.
var GUIDE_UTILISATION_ETAPES = [
  {
    icon: 'plus',
    titre: '1. Créer ou reprendre une mission',
    texte: '« Nouvelle mission » puis les informations générales (client, site, n° d’affaire, dates). Pour un site déjà suivi : « Charger un site précédent » (fichier de la mission de l’an dernier) ou « Importer un fichier Rapso (V29) ». Reviennent les installations, le plan, les schémas, les documents, les étiquettes QR, les notes pratiques, les photos de plaque et de l’an dernier, l’historique des mesures ; les mesures, elles, repartent à zéro.'
  },
  {
    icon: 'list',
    titre: '2. Créer les installations',
    texte: '« Sélection des installations » : cochez les types présents sur le site. Pour tout créer d’un coup : « Créer les installations par quantités » (menu ⋯) — tapez le nombre par type dans le tableau, ou collez les lignes d’un tableau Excel (type, nombre, bâtiment, nom), ou importez le fichier ; un modèle Excel est fourni. Pour un laboratoire ou un atelier, le type « Local à pollution spécifique » ; pour une installation qui recycle l’air, « Recyclage de l’air » ; trois types suivent les guides INRS (décapage ED 768, fluides de coupe ED 972, postes aux solvants ED 6049).'
  },
  {
    icon: 'clipboard',
    titre: '3. Préparer la visite',
    texte: 'Menu ⋯ › « Préparer la visite » : notes pratiques du site (accès, clés, nacelle, horaires, contact ; hors rapport, reprises l’an prochain), quantités prévues au devis, matériel à emporter déduit des mesures prévues dans les fiches, étalonnage des appareils. Au bureau (pas d’imprimante sur site), « Imprimer les étiquettes QR » : une planche A4 de 3 × 7 étiquettes (type Avery L7160), une par installation, avec son nom pour savoir où la coller.'
  },
  {
    icon: 'search',
    titre: '4. Retrouver une installation sur site',
    texte: '« Scanner l’étiquette d’une installation » en haut de la mission (ou l’appareil photo du téléphone, ou la référence imprimée sous le QR) ouvre directement la bonne fiche. Sinon : la liste par bâtiment ou par type, la recherche, ou l’onglet « Plan » et ses épingles.'
  },
  {
    icon: 'edit',
    titre: '5. Remplir une fiche',
    texte: 'La saisie se fait écran par écran ; le menu en haut permet de sauter à une étape. Au-dessus de chaque mesure, l’objectif à atteindre (« ≥ 20 m/s »…), avec « atteint / non atteint » dès la saisie. L’avis se met à jour en bas de la fiche avec le critère en cause. Pavé numérique intégré pour les grilles, « Aujourd’hui » pour la date, « Phrases types » pour les observations, « Dupliquer » pour une installation semblable, calculette (débit, Pitot, renouvellement, air neuf par occupant) en haut de la fiche. « Terminé, installation suivante » enchaîne.'
  },
  {
    icon: 'check',
    titre: '6. Contrôles automatiques des mesures',
    texte: 'Sont signalés sous le champ : une valeur inhabituelle (virgule oubliée, unité confondue), un écart de plus de 30 % avec l’an dernier, une mesure à moins de 5 % du seuil (« à confirmer »), un point de grille très différent des autres (« à revérifier »). Sous la fiche, une courbe montre l’évolution de la mesure principale sur les visites précédentes.'
  },
  {
    icon: 'tool',
    titre: '7. Installation non contrôlée',
    texte: 'En bas de la fiche, « Installation non contrôlée ? » : choisissez le motif (accès impossible, à l’arrêt, démontée, absence du client, sécurité…) et une précision. Elle compte comme terminée, n’apparaît plus dans « à compléter » et figure dans le rapport comme non contrôlée, avec son motif, au lieu d’une fiche vide.'
  },
  {
    icon: 'camera',
    titre: '8. Photos, plaque et notes',
    texte: 'Le crayon sur une photo permet de l’annoter au doigt (entourer, flécher, écrire) ; l’original est conservé. À la visite suivante, la photo de l’an dernier (repère « N-1 ») aide à reprendre le même cadrage. En bas de la fiche d’un équipement : « Photographier la plaque signalétique » (marque, modèle, débit nominal, hors rapport) et « Note pour la prochaine visite », rappelée en tête de fiche l’année suivante.'
  },
  {
    icon: 'map',
    titre: '9. Plan du site',
    texte: 'Onglet « Plan » : photographiez le plan d’évacuation ou importez celui du client, puis « Placer des installations » et touchez le plan pour chacune. Les épingles prennent la couleur de l’avis ; toucher une épingle ouvre la fiche. Une installation découverte sur place se crée sans quitter le plan. Le plan figure dans le rapport (4.2).'
  },
  {
    icon: 'share',
    titre: '10. Schéma du réseau',
    texte: 'Onglet « Plan » ou infos de la mission : « Dessiner un schéma de réseau ». Choisissez les types desservis, placez les installations (outil « Installation », y compris une nouvelle), le ventilateur, le filtre, le rejet ou le retour d’air, puis les gaines : départ puis arrivée ; toucher une gaine crée un piquage. Sens de l’air et couleurs automatiques. En reliant le ventilateur à son installation, le bilan du réseau compare son débit à la somme des débits raccordés. Rapport (4.3).'
  },
  {
    icon: 'zap',
    titre: '11. Bilan d’air neuf des CTA',
    texte: 'En bas de la fiche d’une CTA, « Locaux alimentés » : cochez les bureaux, ERP ou locaux spécifiques qu’elle dessert. L’air neuf de la CTA est comparé au besoin réglementaire cumulé de ces locaux (R4222-6). Rapport (4.4).'
  },
  {
    icon: 'paperclip',
    titre: '12. Documents du client',
    texte: 'Infos mission › « Plans, schémas et documents joints » : photographiez ou joignez les documents remis (image ou PDF, 12 pages maximum) et cochez les installations concernées. Liste dans le rapport (3.3) et pages en annexe. « Compléter ce plan » dessine un schéma par-dessus.'
  },
  {
    icon: 'check',
    titre: '13. Vérifier avant de quitter le site',
    texte: 'Menu ⋯ › « Vérifier avant de partir » : installations non commencées, champs vides, contrôles automatiques à revoir, écart avec le devis, commentaires de relecture à traiter, noms de bâtiments à harmoniser (« Bât B » / « Bâtiment B - Production » : un bouton les unifie), infos de mission manquantes. Un toucher ouvre la bonne étape.'
  },
  {
    icon: 'building',
    titre: '14. Suivre l’avancement',
    texte: 'La fiche mission liste les installations par bâtiment, par type ou sur le plan, avec leur statut. Le « Bilan » résume les avis et, pour un usage interne, le temps passé sur les fiches par type (et celui de la visite précédente) pour chiffrer la prochaine visite.'
  },
  {
    icon: 'edit',
    titre: '15. Compte rendu de fin de visite',
    texte: 'Depuis le Bilan : synthèse, points non satisfaisants, remarques, puis signature du client au doigt. Le document précise qu’il ne remplace pas le rapport.'
  },
  {
    icon: 'flask',
    titre: '16. Rapport et envoi',
    texte: '« Rapport PDF » produit le rapport complet. Menu ⋯ › « Envoyer par mail : rapport PDF + mission » prépare un mail (objet, texte, signature, deux fichiers joints) ; choisissez Outlook puis le destinataire. Le fichier .json permet de reprendre la mission sur ordinateur (« Importer une mission »). Synthèse Excel depuis le Bilan.'
  },
  {
    icon: 'check',
    titre: '17. Relecture par un collègue',
    texte: 'Transférez la mission au relecteur. Il ouvre menu ⋯ › « Relire la mission » : il valide chaque installation ou laisse un commentaire, puis « Relecture terminée ». Vous fusionnez son fichier : ses commentaires apparaissent en tête des fiches et dans « Vérifier avant de partir », et le rapport porte « Rapport vérifié par … le … ».'
  },
  {
    icon: 'copy',
    titre: '18. Contre-visite',
    texte: 'Après travaux, depuis le Bilan ou le menu ⋯ : « Créer une contre-visite ». Une nouvelle mission reprend uniquement les installations non satisfaisantes, avec la mesure de la visite en « N-1 » ; le rapport rappelle le rapport d’origine.'
  },
  {
    icon: 'clipboard',
    titre: '19. Relevé des valeurs de référence (option)',
    texte: 'Si la prestation est prévue au devis, cochez-la dans « Infos mission ». Le menu ⋯ propose le relevé pour le dossier de valeurs de référence (arrêté du 8 octobre 1987) : une valeur n’est proposée que si elle est satisfaisante, sinon le minimum réglementaire. Une fois validé par le client, il sert de référence à la visite suivante.'
  },
  {
    icon: 'merge',
    titre: '20. Travailler à plusieurs',
    texte: '« Transférer la mission seule » à votre collègue ; chacun saisit ses bâtiments. En fin de visite, « Fusionner le travail d’un collègue » réunit tout (plans, schémas, documents, relecture compris) et signale les installations modifiées des deux côtés.'
  },
  {
    icon: 'database',
    titre: '21. Sauvegarde et données',
    texte: 'Les données restent sur le téléphone, rien n’est envoyé sur un serveur. À chaque installation terminée, une sauvegarde automatique est enregistrée. Un bandeau prévient si l’espace est plein ou si l’appli est ouverte dans deux onglets. Ne videz pas les données du navigateur sans avoir exporté vos missions.'
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
    '<p class="subtitle" style="margin-top:8px;">Un site fictif complet (installations de tous les types, mesures et avis renseignés, plan du site, schéma du réseau d’aspiration de la menuiserie) pour découvrir l’appli ou la présenter, et générer un rapport d’exemple. Un bureau reste à mesurer pour essayer la saisie.</p>' +
    '<button class="btn btn-primary" style="margin-top:8px;" onclick="loadDemoMission();">' + ICONS.play + ' Charger la mission de démonstration</button>' +
    '<button class="btn btn-gray" onclick="startTour();">Revoir la visite guidée</button></div>';
  if (typeof renderNouveautesHistorique === 'function') h += renderNouveautesHistorique();

  return h;
}

console.log('✓ Guide d’utilisation chargé');
