// guide-utilisation.js - Guide d'utilisation de l'application (accueil > Guide)
// Ne décrit que des fonctionnalités réellement implémentées (voir chaque étape ci-dessous) : pas de
// mode d'emploi générique, pour rester fiable si l'appli évolue sans que ce guide soit mis à jour.
var GUIDE_UTILISATION_ETAPES = [
  {
    icon: 'plus',
    titre: '1. Créer ou reprendre une mission',
    texte: '« Nouvelle mission » puis les informations générales (client, site, n° d’affaire, dates). Pour un site déjà suivi : « Charger un site précédent » (mission de l’an dernier) ou « Importer un fichier Rapso (V29) ». Seules les données de structure sont reprises, jamais les mesures ; le plan du site, les schémas, les documents joints, les étiquettes QR et les photos de plaque reviennent aussi. L’accueil classe les missions (en cours, terminées, archivées) avec une recherche par client, site ou n° d’affaire.'
  },
  {
    icon: 'list',
    titre: '2. Choisir les installations à contrôler',
    texte: 'Sélectionnez les types présents sur le site, puis ajoutez chaque installation, ou créez-les toutes d’un coup avec « Créer les installations par quantités » : tapez le nombre par type dans le tableau, ou collez les lignes d’un tableau Excel (type, nombre, bâtiment, nom) ou importez le fichier ; un modèle Excel est fourni. Pour un laboratoire ou un atelier (soudure, peinture…), le type « Local à pollution spécifique » fait le bilan du local : air neuf par rapport au minimum réglementaire (R4222-11 et R4222-6), débit global extrait, compensation. Une installation qui recycle l’air se contrôle avec le type « Recyclage de l’air » (contrôle semestriel). Trois types suivent les guides INRS : décapage / grenaillage au jet libre (ED 768), machines-outils à fluide de coupe (ED 972), postes manuels aux solvants (ED 6049).'
  },
  {
    icon: 'tag',
    titre: '3. Avant la visite : préparer, imprimer les étiquettes',
    texte: 'Menu « ⋯ » > « Préparer la visite » : notes pratiques du site (accès, clés, nacelle, horaires, contact ; hors rapport, reprises l’an prochain), matériel à emporter déduit des mesures prévues dans les fiches, étalonnage des appareils, quantités prévues au devis (l’écart est signalé avant de partir). Au bureau (pas d’imprimante sur site), « Imprimer les étiquettes QR » : une planche A4 de 3 × 7 étiquettes (type Avery L7160), une par installation, avec son nom en gros pour savoir où la coller. L’année suivante, « Scanner l’étiquette d’une installation » en haut de la mission (ou l’appareil photo du téléphone) ouvre directement la bonne fiche ; la référence imprimée sous le QR peut aussi être tapée.'
  },
  {
    icon: 'edit',
    titre: '4. Remplir chaque installation',
    texte: 'La saisie se fait écran par écran ; le menu en haut permet de sauter à une étape. Au-dessus de chaque mesure, l’objectif à atteindre est affiché (« ≥ 20 m/s », « ≥ 60 m³/h »…), avec « atteint / non atteint » dès la saisie ; il est déduit du calcul de l’appli et des données déjà saisies. L’avis se met à jour en bas de la fiche, avec le critère en cause. Une valeur inhabituelle, un écart de plus de 30 % avec l’an dernier, une mesure à moins de 5 % du seuil ou un point de grille très différent des autres est signalé : à confirmer avant de quitter le poste. Les grilles de points se saisissent au pavé numérique intégré. « Aujourd’hui » remplit la date, « Phrases types » insère une observation, « Dupliquer » recopie la structure d’une installation semblable ; à côté, la calculette fait les calculs de terrain (débit d’après la vitesse et la section, Pitot, renouvellement, air neuf par occupant). Sous la fiche, une courbe montre l’évolution de la mesure principale sur les visites précédentes ; dans une CTA, cochez les locaux alimentés pour comparer son air neuf au besoin cumulé de ces locaux. En fin de fiche, « Terminé, installation suivante » enchaîne directement.'
  },
  {
    icon: 'camera',
    titre: '5. Photos et plaque signalétique',
    texte: 'Le crayon sur une photo permet de l’annoter au doigt : entourer, flécher ou écrire sur le défaut (3 couleurs). La photo annotée part dans le rapport, l’original est conservé pour reprendre l’annotation. À la visite suivante, la photo de l’an dernier s’affiche (repère « N-1 ») pour reprendre le même cadrage. En bas de chaque fiche, « Note pour la prochaine visite » garde une info pratique, rappelée en tête de fiche l’année suivante. En bas de la fiche d’un équipement, « Photographier la plaque signalétique » garde la marque, le modèle et le débit nominal : la photo est reprise l’an prochain, hors rapport.'
  },
  {
    icon: 'building',
    titre: '6. Suivre l’avancement',
    texte: 'La fiche mission liste toutes les installations par bâtiment ou par type, avec leur statut et une recherche. Le « Bilan » résume les avis (part satisfaisante, répartition par type, points non satisfaisants) et, pour un usage interne, le temps passé sur les fiches par type d’installation, avec celui de la visite précédente : utile pour chiffrer la prochaine visite.'
  },
  {
    icon: 'map',
    titre: '7. Plan du site',
    texte: 'Onglet « Plan » de la mission : photographiez le plan d’évacuation ou importez le plan du client, puis « Placer des installations » et touchez le plan pour chacune. Les épingles prennent la couleur de l’avis ; toucher une épingle ouvre la fiche. Une installation découverte sur place se crée sans quitter le plan (« Nouvelle installation »). Le plan figure dans le rapport (4.2) et revient l’année suivante.'
  },
  {
    icon: 'share',
    titre: '8. Schéma du réseau',
    texte: 'Dans l’onglet « Plan » ou les infos de la mission : « Dessiner un schéma de réseau ». Choisissez les types d’installations desservies, placez-les (outil « Installation »), ajoutez le ventilateur, le filtre, le rejet ou le retour d’air, puis tracez les gaines : touchez le départ puis l’arrivée ; toucher une gaine crée un piquage pour une division. Le sens de l’air et la couleur des gaines (aspiration, refoulement, recyclage) sont automatiques. En reliant le ventilateur à son installation contrôlée, l’appli compare le débit au ventilateur à la somme des débits mesurés aux installations raccordées (bilan du réseau). Le schéma figure dans le rapport (4.3) comme schéma de principe.'
  },
  {
    icon: 'paperclip',
    titre: '9. Documents du client',
    texte: 'Infos mission > « Plans, schémas et documents joints » : photographiez ou joignez les documents remis (image ou PDF, 12 pages maximum par PDF) et cochez les installations concernées. Ils sont listés dans le rapport (3.3), reproduits en dernière annexe, et repris à la visite suivante. « Compléter ce plan » dessine un schéma par-dessus un plan du client.'
  },
  {
    icon: 'check',
    titre: '10. Vérifier avant de quitter le site',
    texte: 'Menu « ⋯ » > « Vérifier avant de partir » : installations non commencées, champs encore vides, valeurs inhabituelles, dates incohérentes, avis contredit par un critère calculé, infos de mission manquantes pour le rapport. Un tap ouvre la bonne étape.'
  },
  {
    icon: 'tool',
    titre: '11. Déclarer ses appareils de mesure',
    texte: 'Dans « Profil », enregistrez vos appareils (n° d’identification, date d’étalonnage). Cochez ceux utilisés dans « Infos mission » : ils apparaissent dans le rapport, et un étalonnage dépassé est signalé.'
  },
  {
    icon: 'edit',
    titre: '12. Remettre un compte rendu au client',
    texte: 'Depuis le Bilan : « Compte rendu de fin de visite ». Synthèse, points non satisfaisants, remarques, puis signature du client au doigt. Le document précise qu’il ne remplace pas le rapport de contrôle.'
  },
  {
    icon: 'flask',
    titre: '13. Générer et envoyer le rapport',
    texte: '« Rapport PDF » produit le rapport complet. Menu « ⋯ » : « Envoyer par mail : rapport PDF + mission » prépare un mail (objet, texte, signature, les deux fichiers joints) ; choisissez Outlook puis le destinataire. Le fichier .json permet de reprendre la mission sur ordinateur (« Importer une mission »). Le menu permet aussi d’envoyer le rapport seul et d’exporter la synthèse en Excel.'
  },
  {
    icon: 'clipboard',
    titre: '14. Relevé des valeurs de référence (prestation optionnelle)',
    texte: 'Si la prestation est prévue au devis, cochez-la dans « Infos mission ». Le menu « ⋯ » propose alors le relevé pour le dossier de valeurs de référence (arrêté du 8 octobre 1987) : une valeur mesurée n’est proposée que si elle est satisfaisante, sinon le minimum réglementaire. Une fois le relevé signé par le client, indiquez la date de validation : ses valeurs serviront de références à la visite suivante.'
  },
  {
    icon: 'merge',
    titre: '15. Travailler à plusieurs sur un site',
    texte: 'Transférez la mission (menu « ⋯ », « Transférer la mission seule ») à votre collègue ; chacun saisit ses bâtiments. En fin de visite, « Fusionner le travail d’un collègue » réunit tout dans votre mission (plans, schémas et documents compris) et signale les installations modifiées des deux côtés.'
  },
  {
    icon: 'database',
    titre: '16. Sauvegarde et sécurité des données',
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
    '<p class="subtitle" style="margin-top:8px;">Un site fictif complet (installations de tous les types, mesures et avis renseignés, plan du site, schéma du réseau d’aspiration de la menuiserie) pour découvrir l’appli ou la présenter, et générer un rapport d’exemple. Un bureau reste à mesurer pour essayer la saisie.</p>' +
    '<button class="btn btn-primary" style="margin-top:8px;" onclick="loadDemoMission();">' + ICONS.play + ' Charger la mission de démonstration</button>' +
    '<button class="btn btn-gray" onclick="startTour();">Revoir la visite guidée</button></div>';
  if (typeof renderNouveautesHistorique === 'function') h += renderNouveautesHistorique();

  return h;
}

console.log('✓ Guide d’utilisation chargé');
