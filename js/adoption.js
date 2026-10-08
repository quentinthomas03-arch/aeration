// adoption.js - Prise en main sans formation (chantier du 2026-10-03)
//
//  - Visite guidée au premier lancement : 4 écrans courts (mission, saisie, vérification/bilan,
//    rapport), proposant ensuite la mission de démonstration. Relançable depuis le Guide.
//  - Nouveautés : après une mise à jour, une carte sur l'accueil résume ce qui a changé.

var APP_VERSION = '2.4';

// Du plus récent au plus ancien. Une entrée par version publiée aux techniciens.
var NOUVEAUTES = [
  { version: '2.4', date: '08/10/2026', items: [
    'Bureaux et salles de réunion : le commentaire réglementaire du Rapso est rédigé automatiquement (« Effectif : 3 personne (s) max », « Ce volume permet d’accueillir 5 occupant(s) »…), selon le volume ou le débit d’air neuf. Il s’affiche dans la fiche et dans le rapport, suivi de votre commentaire.'
  ] },
  { version: '2.3', date: '08/10/2026', items: [
    'Cabines de voiture, de camion et d’encombrant : comme dans le Rapso, mesure autour du véhicule ou de l’encombrant (10 points pour une voiture, 12, 14 ou 16 pour un camion selon sa longueur, 14 pour un encombrant), moyenne et minimum calculés, avec leurs avis.',
    'Cabines de voiture et de camion : la cabine vide n’est demandée que si l’on y peint aussi des subjectiles divers (« Objets peints »). Le rapport suit la même règle.',
    'Import d’un classeur Rapso : les mesures avec le véhicule ou l’encombrant et celles de la cabine vide arrivent chacune dans leur bloc ; la longueur du camion et les objets peints sont repris.'
  ] },
  { version: '2.2', date: '08/10/2026', items: [
    'Cabines de peinture : types Voiture, Camion et Fosse du Rapso, avec leur protocole de mesure (points autour du véhicule, ligne de points dans la fosse) et leur titre dans le rapport.',
    'Cabines de peinture : la valeur recommandée du Rapso (Norme 16985 ou guide INRS, selon le type de cabine, le flux, la zone et la pulvérisation) se reprend en un toucher sous le champ, avec sa référence.',
    'Décapage : sous le débit extrait, la durée attendue du test au fumigène (3 à 4 fois V/Q, INRS ED 768) pour vérifier le débit sur place, chronomètre en main.'
  ] },
  { version: '2.1', date: '08/10/2026', items: [
    'Mesure en conduit : si un tube de Pitot fait partie des appareils de la mission et qu’une vitesse moyenne est sous 4 m/s, l’appli le signale (erreur trop grande, préférer l’anémomètre — INRS ED 695).',
    'Cabines de peinture : un toucher règle la grille de saisie sur le nombre de points du protocole INRS (ED 839 / ED 928), calculé d’après les dimensions.',
    'Cabines de peinture : « Reprendre de… » recopie aussi le type de flux, la pulvérisation, la zone de travail, les valeurs recommandées et la norme d’une cabine voisine. Décapage, fluides de coupe, solvants, local spécifique et recyclage : reprise du bâtiment, de l’atelier et de la date.',
    'Import d’un classeur Rapso : la valeur recommandée des cabines et sa norme (« Norme 16985 ») arrivent dans les bons champs, y compris pour les cabines fermées.'
  ] },
  { version: '2.0', date: '08/10/2026', items: [
    '« Où et comment mesurer ? » sur toutes les installations de captage et de mesure de débit : cabines de peinture (points calculés d’après les dimensions, protocoles ED 839 et ED 928), cuves de traitement de surface, torches aspirantes, machines à bois (5 D / 3 D, ED 750), décapage, fluides de coupe, postes aux solvants, point d’émission des installations diverses, bouches et grilles (bureaux, ERP, sanitaires, locaux de charge…), réseaux de CTA.'
  ] },
  { version: '1.99', date: '08/10/2026', items: [
    'Sorbonnes, hottes, bras d’aspiration et mesures en conduit : à l’étape de mesure, « Où et comment mesurer ? » ouvre un schéma tracé avec les dimensions saisies (points de la sorbonne, quadrillage de la hotte, distance d’utilisation du bras, longueurs droites du conduit) et les consignes des guides INRS ED 795, ED 695 et ED 668.'
  ] },
  { version: '1.98', date: '07/10/2026', items: [
    'Questions fréquentes : 47 fiches (locaux et air neuf, sanitaires, captage, recyclage, par installation, dossier et contrôles), chacune avec sa source — Code du travail, arrêté du 8 octobre 1987, guides INRS — ou signalée « sans source extérieure ».',
    'Questions fréquentes : recherche par mot-clé de terrain (WC, CTA, soudage…) et mots proposés en un toucher.',
    'Questions fréquentes : WC fermés dans un bloc sanitaire (débit du bloc ou 30 m³/h par cabine) posé en question ouverte, à trancher par la DT.'
  ] },
  { version: '1.97', date: '07/10/2026', items: [
    'Questions fréquentes (accueil › FAQ) : les cas sur lesquels on hésite entre collègues, avec une réponse commune et sa source. Les réponses sans source extérieure sont signalées. Toutes sont à valider par la direction technique ; une nouvelle question se pose par mail.'
  ] },
  { version: '1.96', date: '07/10/2026', items: [
    'Dossier de valeurs de référence : quand la prestation est cochée, la pression statique dans le conduit est demandée (points caractéristiques exigés par l’arrêté) ; le contrôle annuel seul reste inchangé.',
    'Dossier de valeurs de référence : chaque installation indique son repère sur le plan du site et les schémas où elle figure ; plans et schémas sont joints en annexe.'
  ] },
  { version: '1.95', date: '07/10/2026', items: [
    'Recyclage : fiche du contrôle semestriel refaite (arrêté du 8 octobre 1987, art. 4.2 b ; INRS ED 6008) — moyennes des canaux du DustTrak, concentration comparée au 1/5 de la VLEP de chaque polluant, test des systèmes de surveillance exigé (non testé = ne peut se prononcer), contrôle précédent rappelé.',
    'Recyclage : rapport semestriel à part (menu ⋯), ou directement par « Rapport PDF » si la mission ne compte que du recyclage.',
    'Dossier de valeurs de référence : trois prestations — l’établir pour une installation existante, à la mise en service (avec le descriptif), ou analyser un dossier existant (complétude article par article, valeurs comparées aux mesures). Le dossier suit le guide INRS ED 6008 : valeurs de référence, consigne d’utilisation, mesures en cas de panne, dossier de maintenance.'
  ] },
  { version: '1.94', date: '07/10/2026', items: [
    'Toutes les installations : en haut d’une étape, « Reprendre de… » recopie en un toucher ce qui se répète d’une installation à l’autre pendant la visite (date, bâtiment, états visuels, test fumigène, conditions, valeurs de référence…), pris sur l’installation voisine. Les valeurs sont affichées avant d’être reprises ; jamais une mesure.'
  ] },
  { version: '1.93', date: '07/10/2026', items: [
    'Sorbonnes : l’étape « Contexte de mesures » a aussi son bouton de reprise (taille du local, paillasse, ouvrants, autres sorbonnes et dispositifs en fonctionnement), pris sur une autre sorbonne de la mission.'
  ] },
  { version: '1.92', date: '07/10/2026', items: [
    'Cabines de peinture : état visuel de la cabine et état des filtres reprennent les choix du Rapso (« Cabine encrassée », « Neuf », « Encrassé »…) au lieu d’un simple Satisfaisant / Non satisfaisant ; le rapport affiche le constat.'
  ] },
  { version: '1.91', date: '07/10/2026', items: [
    'Sorbonnes : à l’étape « Mesures ambiantes », un bouton reprend en un toucher la température, l’hygrométrie, la pression et les appareils saisis sur une autre sorbonne de la mission.',
    'Torches aspirantes : un seul point de mesure s’affiche tant que le nombre de points n’est pas choisi (au lieu de 10).'
  ] },
  { version: '1.90', date: '07/10/2026', items: [
    'Fiches réalignées sur le Rapso : la filtration de la CTA n’apparaît que si on l’affiche, les grilles des locaux de charge s’ajoutent une à une, le commentaire des bras ne s’ouvre que si le bras n’est pas adapté.',
    'Température et pression dans le conduit, commentaires et valeurs de l’an dernier : facultatifs, plus signalés « à saisir ».',
    'Listes déroulantes : la valeur imposée s’affiche à côté du choix (vitesse de captage des bras, plage INRS, vitesse de transport, débit des machines à bois). Bras : la vitesse de captage se remplit d’elle-même, avec la liste exacte du Rapso.'
  ] },
  { version: '1.89', date: '06/10/2026', items: [
    'Plan du site : zoomez en pinçant à deux doigts, le point sous les doigts reste en place (Ctrl + molette sur PC). Les boutons − / + restent disponibles.'
  ] },
  { version: '1.88', date: '06/10/2026', items: [
    'Sanitaires : WC / urinoirs, douches et lavabos laissés vides comptent pour 0 ; ils ne sont plus signalés « à saisir » ni manquants.'
  ] },
  { version: '1.87', date: '06/10/2026', items: [
    'Bâtiment : les bâtiments déjà saisis dans la mission sont proposés sous la case, en un toucher.',
    'Niveau : liste RDC, R+1 à R+5, puis R-1 à R-3 et Toiture, avec « Autre… » pour un cas particulier.'
  ] },
  { version: '1.86', date: '06/10/2026', items: [
    '« Ajouter une installation » est en haut de la vue d’ensemble (et « Ajouter » en haut de la liste d’un type) : plus besoin de redescendre toute la liste.'
  ] },
  { version: '1.85', date: '06/10/2026', items: [
    'Mission de démonstration complète : 65 installations sur les 23 types, avec niveaux, série de bureaux, mesures au cône, double flux, installation non contrôlée, marques « à revoir » et notes de visite.'
  ] },
  { version: '1.84', date: '05/10/2026', items: [
    'Plan du site : « Ajouter un plan » accepte un PDF du client ; chaque page devient un plan, nommé d’après le niveau quand il est indiqué (RDC, R+1, sous-sol…).'
  ] },
  { version: '1.83', date: '05/10/2026', items: [
    'Rapport des gros sites : photos préparées une à une et réduites à la taille utile (PDF environ trois fois plus léger, mémoire de la tablette épargnée), avec l’avancement affiché (« Préparation des photos 40 / 180 », puis mise en page).'
  ] },
  { version: '1.82', date: '05/10/2026', items: [
    'Données protégées : l’appli demande au navigateur de ne pas les effacer quand l’appareil manque de place.',
    'Accueil : rappel « Copie de sauvegarde conseillée » pour une mission modifiée et non envoyée depuis 6 h, avec un bouton pour l’envoyer (mail, OneDrive…).'
  ] },
  { version: '1.81', date: '05/10/2026', items: [
    'Plus rapide sur les gros sites : « Compléter à la suite » ne recalcule plus la vérification à chaque saisie.'
  ] },
  { version: '1.80', date: '05/10/2026', items: [
    '« Vérifier avant de partir » : doublons possibles (même type, même bâtiment, même nom).',
    '« Pour la prochaine visite » : notes proposées d’après la visite (non contrôlées, à revoir, bouches faibles), ajoutées d’un toucher aux notes reprises l’an prochain.'
  ] },
  { version: '1.79', date: '05/10/2026', items: [
    '« Vérifier avant de partir » : installations non satisfaisantes sans observation, à rédiger avant le rapport.',
    'Photos de la mission en un zip (menu « ⋯ ») : un dossier par bâtiment, photos nommées bâtiment – local – n°.',
    'Double flux : déséquilibre marqué entre soufflage et extraction signalé (indication technique).',
    'Modifications depuis la version précédente du rapport (menu « ⋯ ») : avis et valeurs changés, installations ajoutées ou retirées, en PDF.'
  ] },
  { version: '1.78', date: '05/10/2026', items: [
    'Haut de fiche allégé : flèches ‹ › et un seul bouton ⋯ (calculette, dupliquer, en série, à revoir, plan).',
    'Passage d’une étape à l’autre avec un léger glissement ; couleurs des avis harmonisées entre l’appli et les documents.'
  ] },
  { version: '1.77', date: '05/10/2026', items: [
    'Rapport : index des installations en dernière annexe (ordre alphabétique, bâtiment, niveau, n° sur le plan, avis, page).',
    'Synthèse par bâtiment pour le client (menu « ⋯ ») : PDF à part du rapport, bilan par bâtiment et points non satisfaisants.'
  ] },
  { version: '1.76', date: '05/10/2026', items: [
    '« Vérifier avant de partir » › « Compléter à la suite » : ouvre chaque fiche incomplète sur la case qui manque, puis passe à la suivante.',
    'Valeur déjà saisie remplacée ou effacée : un bandeau « Annuler » permet de la retrouver.'
  ] },
  { version: '1.75', date: '05/10/2026', items: [
    '« Terminé » signale les cases encore vides : un toucher amène à l’étape, ou « Terminer quand même ».',
    'Boutons − / + pour l’effectif, les WC, douches, lavabos et le nombre de bouches.',
    'Commentaire appliqué à d’autres fiches du même type (cases à cocher, « Tout le bâtiment »), ajouté à la suite d’un commentaire existant, annulable.',
    'Tablette ou téléphone à l’horizontale : liste des installations à gauche, fiche à droite.'
  ] },
  { version: '1.74', date: '05/10/2026', items: [
    'Touche Entrée : enregistre la valeur et passe à la case suivante, puis à l’étape suivante (s’arrête sur les boutons de choix à remplir, jamais sur « Terminé »). Aussi dans le tableau.',
    'Dans chaque bâtiment, les installations sont rangées par ordre alphabétique (Bureau 2 avant Bureau 10).',
    'Recherche : Entrée ouvre la fiche quand la recherche désigne une seule installation (« 104 » → Bureau 104).'
  ] },
  { version: '1.73', date: '05/10/2026', items: [
    'Flèches ‹ › en haut de chaque fiche : fiche précédente ou suivante, dans l’ordre de la liste.',
    'Ordre de visite des bâtiments (menu « ⋯ » de la mission) : la vue d’ensemble, « Suivante » et le plan suivent l’ordre choisi.',
    'Bilan : « Reste à faire par bâtiment », un toucher ouvre le bâtiment dans la vue d’ensemble.'
  ] },
  { version: '1.72', date: '05/10/2026', items: [
    'Saisie en tableau des bureaux, ERP et sanitaires (lien « Tableau » de la vue d’ensemble) : une ligne par local, saisie à la suite, avis mis à jour à chaque valeur.',
    'Niveau / étage dans l’identification de chaque installation ; la vue d’ensemble range un bâtiment par niveau.',
    '« Continuer » en tête de la vue d’ensemble : la dernière fiche ouverte, en un toucher.',
    '« Marquer à revoir » sur une fiche : filtre « À revoir » et rappel avant de partir.',
    '« En série » : plusieurs copies d’une installation, numérotées à la suite (Bureau 101 → 102, 103…).',
    '« Voir sur le plan » depuis une fiche placée.'
  ] },
  { version: '1.71', date: '05/10/2026', items: [
    'Questionnaire client avant la visite (menu « ⋯ » de la mission) : un Excel tiré de la mission (effectif des locaux, valeurs de référence, % d’air neuf, remarques, questions sur le site) ; rempli par le client puis importé, chaque réponse est proposée avec une case à cocher.'
  ] },
  { version: '1.70', date: '05/10/2026', items: [
    'Plan : zoom (− / + / Ajuster) en gardant sa position, épingles filtrées par les compteurs et la recherche, placement à la chaîne bâtiment par bâtiment avec « Passer ».'
  ] },
  { version: '1.69', date: '05/10/2026', items: [
    'Vue d’ensemble : les compteurs (À faire, En cours, Non satisf., Terminé) filtrent la liste d’un toucher ; un second toucher affiche tout.',
    'Grands bâtiments : installations rangées par type, dépliables sur place (plus d’écran « Voir tout »).',
    'Une fiche ouverte depuis la vue d’ensemble y revient, à la même position dans la liste.'
  ] },
  { version: '1.68', date: '05/10/2026', items: [
    '« Pourquoi cet avis ? » sous l’avis de chaque installation : ce qui a décidé le résultat, en clair (débit et minimum, volume qui compense, absence d’ouvrant, règle des 15 m³/h en sanitaires…).'
  ] },
  { version: '1.67', date: '05/10/2026', items: [
    'Mesure au cône : choisissez votre cône K35 (coeff. 22), K75 (coeff. 50) ou K120 (coeff. 135) en un geste ; un coefficient libre reste possible pour un cas particulier.'
  ] },
  { version: '1.66', date: '05/10/2026', items: [
    'Local à pollution spécifique : taux de renouvellement (débit extrait ÷ volume). Vous saisissez le taux que vous retenez pour l’activité et sa source, ou reprenez en un geste un taux déjà retenu sur un autre local ; sans taux recommandé, il reste informatif.'
  ] },
  { version: '1.65', date: '05/10/2026', items: [
    'Local à pollution spécifique : choisissez avant de mesurer ce que vous contrôlez (extraction, air neuf ou les deux) ; la partie compensation est retirée, la plaque signalétique n’est plus proposée.',
    'Bureaux, sanitaires et locaux spécifiques : débit bouche par bouche au cône, aux dimensions de la bouche (largeur × longueur ou diamètre, × vitesse) ou en débit direct.',
    'Listes : chaque installation affiche son local ou son repère (avec le bâtiment), et les missions la référence de l’offre (avec le client).',
    'Bureaux en soufflage ou double flux : l’absence d’ouvrant ne rend plus l’avis non satisfaisant ; % d’air neuf non saisi = tout l’air soufflé compté.',
    'Sanitaires : la limite de 15 m³/h « individuel » ne vaut plus que pour un local isolé (1 WC et/ou 1 douche).',
    'Plus de fichier .json ouvert à chaque installation terminée (sauvegarde auto seulement dans le dossier choisi sur ordinateur).'
  ] },
  { version: '1.64', date: '04/10/2026', items: [
    'Rapport précédent importé : les débits mesurés l’an dernier (CTA, extracteurs, hottes, captages) deviennent les valeurs N-1 des installations créées, avec l’historique.',
    'Importer le dossier de valeurs de référence du client (Excel, CSV ou PDF), menu « ⋯ » de la mission : chaque valeur est rapprochée de son installation et de son champ, vous cochez ce que vous reprenez.',
    'Constat rédigé aussi pour « Impossible de se prononcer » : valeurs de référence absentes et dossier à demander au chef d’établissement.'
  ] },
  { version: '1.63', date: '04/10/2026', items: [
    'Installation non satisfaisante : « Rédiger le constat à partir des mesures » écrit l’observation (mesure et objectif, état défavorable, bouche faible), à relire et compléter.',
    'Nouveau client : importez le rapport PDF du contrôle précédent dans « Créer les installations » ; l’appli y repère les installations (type, bâtiment, local) et vous relisez la liste avant de créer.'
  ] },
  { version: '1.62', date: '04/10/2026', items: [
    'Mesure au cône bouche par bouche (bureaux, ERP, locaux fumeurs) : saisissez la vitesse de chaque bouche, l’appli applique le K du cône (retenu d’une visite à l’autre), fait le total de la pièce et signale une bouche nettement plus faible que les autres.',
    'Diamètre d’un conduit rond calculé depuis son tour, mesuré au mètre ruban (isolant déduit).',
    'Sous la photo de la plaque : débit nominal (débit mesuré en % du nominal) et facteur K du ventilateur (Q = K × √Δp). Facteur K aussi dans la calculette.'
  ] },
  { version: '1.61', date: '04/10/2026', items: [
    'Conditions de mesure en haut de l’étape de mesure des installations de captage : points caractéristiques, mouvements d’air perturbateurs (arrêté du 8 octobre 1987, art. 4).',
    'Mesure en conduit : choisissez la distance au coude ou au registre en amont, l’appli estime l’erreur maximale du schéma de points et indique celui qui reste sous 5 % (INRS, PR 49).'
  ] },
  { version: '1.60', date: '04/10/2026', items: [
    'Positions des points de mesure sous les grilles : profondeur depuis la paroi dans un conduit rond (méthode des aires égales), distances aux bords pour un conduit rectangulaire ou une hotte.',
    'Étiquette QR d’une seule installation depuis sa fiche, et choix de la case de départ pour finir une planche déjà entamée.',
    'Visa du technicien : dessiné une fois dans le profil, il apparaît sur la page de garde du rapport et sur le compte rendu. « Validé par » reprend le relecteur.'
  ] },
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
