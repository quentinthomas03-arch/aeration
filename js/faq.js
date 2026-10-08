// faq.js - Questions fréquentes : cas tranchés pour les techniciens (2026-10-07)
//
// But : que tous les techniciens appliquent la même réponse aux questions sur lesquelles on se
// contredit entre collègues. Pas d'IA : des réponses écrites, sourcées, validées par la direction
// technique. Livrées avec l'appli (rien ne part sur un serveur) ; une nouvelle question se pose par mail
// au référent, et la réponse validée arrive avec la version suivante.
//
// Chaque fiche : q (question telle qu'on se la pose sur site), r (réponse en une phrase), pourquoi,
// source, nature, mots (mots-clés et synonymes de terrain pour la recherche), appli (ce que fait déjà
// l'appli, si la réponse est une règle de calcul), ouvert (question sans source qui tranche, à trancher
// par la DT), valide ('' tant que la DT n'a pas validé la fiche ; sinon « jj/mm/aaaa »).
//
// Sources relues le 2026-10-07 : Code du travail R4212-5 à R4212-7, R4222-1 à R4222-21 (code.travail.
// gouv.fr) ; arrêté du 8 octobre 1987, art. 3 et 4 ; guides INRS ED 6008, ED 695, ED 795, ED 668, ED 839,
// ED 750 (dossier « GUIDES PAR INSTALLATIONS »). N'ajouter que des réponses dont la source a été lue.

var FAQ_THEMES = ['Locaux et air neuf', 'Sanitaires', 'Captage', 'Recyclage', 'Par installation', 'Dossier et contrôles', 'Avis et méthode'];

// texte : la réponse s'appuie sur une source extérieure (Code du travail, arrêté, guide INRS) ;
// interne : pratique du Rapso ou de l'appli, sans source extérieure — signalée comme telle (demande de
// Quentin, 2026-10-07 : « si c'est pas sourcé, indiquer que c'est une proposition à valider par la DT »)
var FAQ_NATURES = { texte: 'Source extérieure', interne: 'Pratique interne, sans source extérieure' };

// Mots-clés proposés sous la recherche (un toucher remplit la recherche)
var FAQ_MOTS_RAPIDES = ['WC', 'douche', 'bureau', 'CTA', 'recyclage', 'captage', 'bras', 'soudage', 'sorbonne', 'peinture', 'bois', 'compensation', 'valeur de référence', 'pression statique'];

var FAQ_CAS = [
  // ——— Locaux et air neuf ———
  { id: 'debits-r4222-6', theme: 'Locaux et air neuf', nature: 'texte', mots: 'air neuf débit occupant bureau atelier restaurant réunion 25 30 45 60',
    q: 'Quel débit minimal d’air neuf par occupant en ventilation mécanique ?',
    r: '25 m³/h par occupant (bureaux, locaux sans travail physique), 30 (restauration, vente, réunion), 45 (ateliers à travail physique léger), 60 (autres ateliers).',
    pourquoi: 'Ce sont les minimums des locaux à pollution non spécifique ventilés mécaniquement ; ils s’appliquent aussi, au moins, aux locaux à pollution spécifique (R4222-11).',
    source: 'Code du travail R4222-6',
    appli: 'Bureaux, ERP, locaux spécifiques : débit minimal calculé d’après le type de local et l’effectif.' },
  { id: 'ventilation-naturelle', theme: 'Locaux et air neuf', nature: 'texte', mots: 'naturelle fenêtre ouvrant volume 15 24 m3 occupant aération',
    q: 'Un bureau sans ventilation mécanique, aéré par les fenêtres, est-il conforme ?',
    r: 'Oui si ses ouvrants donnent directement sur l’extérieur et si le volume atteint 15 m³ par occupant (bureaux, travail physique léger) ou 24 m³ (autres locaux).',
    pourquoi: 'La ventilation naturelle permanente est admise pour les locaux à pollution non spécifique, à condition que les dispositifs d’ouverture soient accessibles aux occupants.',
    source: 'Code du travail R4222-4 et R4222-5',
    appli: 'Bureaux et ERP en ventilation naturelle : l’avis est jugé sur le volume du local.' },
  { id: 'ouvrants-accessibles', theme: 'Locaux et air neuf', nature: 'texte', mots: 'ouvrant fenêtre commande accessible naturelle',
    q: 'Des fenêtres qu’on ne peut pas ouvrir sans outil comptent-elles pour la ventilation naturelle ?',
    r: 'Non : en ventilation naturelle permanente, les ouvrants doivent donner directement sur l’extérieur et leurs commandes être accessibles aux occupants.',
    pourquoi: 'Sinon le local n’a pas d’aération effective par ses ouvrants : il relève de la ventilation mécanique ou il n’est pas aéré.',
    source: 'Code du travail R4222-4' },
  { id: 'circulation-episodique', theme: 'Locaux et air neuf', nature: 'texte', mots: 'couloir circulation dégagement archive local technique occasionnel épisodique',
    q: 'Un couloir ou un local d’archives sans bouche d’air : non conforme ?',
    r: 'Non : les locaux de circulation et ceux occupés de manière épisodique peuvent être ventilés par les locaux adjacents à pollution non spécifique sur lesquels ils ouvrent.',
    pourquoi: 'Le choix « local occupé occasionnellement » se justifie dans l’observation (fréquence et durée de présence constatées).',
    source: 'Code du travail R4222-7',
    appli: 'Type « Local occupé occasionnellement » : avis « Sans objet ».' },
  { id: 'bureau-climatise', theme: 'Locaux et air neuf', nature: 'texte', mots: 'climatisation climatisé bureau pollution non spécifique',
    q: 'Un bureau climatisé, c’est un local à pollution spécifique ?',
    r: 'Non : un bureau climatisé reste un local à pollution non spécifique.',
    pourquoi: 'La pollution y est liée à la seule présence humaine ; la climatisation ne change pas la catégorie du local.',
    source: 'INRS ED 6008 (2023), chap. 1, § 1.1 ; Code du travail R4222-3' },
  { id: 'specifique-air-neuf', theme: 'Locaux et air neuf', nature: 'texte', mots: 'pollution spécifique atelier air neuf minimum occupants',
    q: 'Dans un atelier à pollution spécifique, faut-il aussi respecter un débit d’air neuf ?',
    r: 'Oui : le débit est déterminé selon les polluants, mais l’air neuf ne peut être inférieur aux minimums de l’article R4222-6, en comptant les occupants des locaux à pollution non spécifique d’où provient l’air.',
    pourquoi: 'La ventilation d’un local à pollution spécifique doit traiter à la fois les polluants et la présence humaine.',
    source: 'Code du travail R4222-11',
    appli: 'Local à pollution spécifique : débit minimal d’air neuf calculé avec les occupants des autres locaux.' },
  { id: 'air-recycle-pas-air-neuf', theme: 'Locaux et air neuf', nature: 'texte', mots: 'air recyclé air neuf débit CTA pourcentage',
    q: 'L’air recyclé par une CTA compte-t-il dans le débit d’air neuf ?',
    r: 'Non : seul l’air neuf compte pour les minimums de l’article R4222-6 ; l’air recyclé n’entre pas dans ce calcul.',
    pourquoi: 'D’où l’importance du pourcentage d’air neuf relevé sur la CTA.',
    source: 'Code du travail R4222-8',
    appli: 'Bureaux en soufflage ou double flux : air neuf = débit × % d’air neuf.' },
  { id: 'filtre-air-neuf', theme: 'Locaux et air neuf', nature: 'texte', mots: 'filtre air neuf CTA poussière filtration maître d ouvrage',
    q: 'L’air neuf d’une CTA doit-il être filtré ?',
    r: 'Oui lorsque l’introduction est mécanique et qu’il existe un risque de pollution de l’air neuf par des particules solides.',
    pourquoi: 'C’est une obligation de conception du maître d’ouvrage pour les locaux à pollution non spécifique ; il doit aussi empêcher l’air pollué des locaux à pollution spécifique d’y pénétrer.',
    source: 'Code du travail R4212-5' },
  { id: 'air-pollue-vers-bureaux', theme: 'Locaux et air neuf', nature: 'texte', mots: 'transfert air pollué atelier bureau dépression surpression porte',
    q: 'L’air d’un atelier peut-il passer vers des bureaux par une porte ou un transfert ?',
    r: 'Non : des mesures doivent empêcher l’air pollué des locaux à pollution spécifique de pénétrer dans les locaux à pollution non spécifique.',
    pourquoi: 'En pratique, les locaux où se dégagent des produits toxiques sont maintenus en légère dépression par rapport aux locaux voisins (INRS ED 695).',
    source: 'Code du travail R4212-5 ; INRS ED 695, § rejet et compensation' },

  // ——— Sanitaires ———
  { id: 'sanitaires-cuisines', theme: 'Sanitaires', nature: 'texte', mots: 'sanitaire cuisine WC toilettes pollution spécifique',
    q: 'Les sanitaires et les cuisines, pollution spécifique ou non ?',
    r: 'Pollution spécifique : les locaux sanitaires et les cuisines sont des locaux à pollution spécifique.',
    pourquoi: 'Ils sont contrôlés avec les règles des locaux à pollution spécifique (débits minimaux de l’article R4212-6 pour les sanitaires).',
    source: 'Code du travail R4222-3 ; INRS ED 6008, chap. 1, § 1.2',
    appli: 'Les sanitaires sont classés en pollution spécifique dans le rapport et le dossier de valeurs de référence.' },
  { id: 'sanitaires-tableau', theme: 'Sanitaires', nature: 'texte', mots: 'WC toilettes cabinet aisances douche salle de bains lavabo débit 30 45 60 15N 5N',
    q: 'Quels débits minimaux d’extraction pour les sanitaires ?',
    r: 'Cabinet d’aisances isolé 30 m³/h ; salle de bains ou de douches isolée 45 ; salle de bains ou de douches commune avec un cabinet d’aisances 60 ; bains, douches et cabinets d’aisances groupés 30 + 15 N ; lavabos groupés 10 + 5 N (N : nombre d’équipements dans le local).',
    pourquoi: 'Le débit est fixé par local, d’après les équipements qu’il contient.',
    source: 'Code du travail R4212-6',
    appli: 'Fiche sanitaires : débit minimal calculé d’après le nombre de WC, douches et lavabos.' },
  { id: 'sanitaire-individuel', theme: 'Sanitaires', nature: 'texte', mots: 'WC individuel privatif 15 usage collectif douche bureau direction',
    q: 'Un WC à usage individuel (bureau de direction, chambre) : 30 ou 15 m³/h ?',
    r: '15 m³/h si le local n’est pas à usage collectif (cabinet d’aisances, salle de bains ou de douches, avec ou sans cabinet d’aisances).',
    pourquoi: 'Le texte prévoit ce débit réduit pour les locaux sanitaires qui ne sont pas à usage collectif. Le Rapso ne l’appliquait pas.',
    source: 'Code du travail R4212-6, renvoi (**)',
    appli: 'Fiche sanitaires : « Individuel » sur un local d’un WC et/ou une douche.' },
  { id: 'wc-cabines-bloc', theme: 'Sanitaires', nature: 'interne', ouvert: true, mots: 'WC cabine fermée bloc sanitaire groupés isolé 30 15N concurrent',
    q: 'Des cabines de WC fermées dans un bloc sanitaire : un débit global pour le bloc, ou 30 m³/h par cabine ?',
    r: 'Pratique SOCOTEC : le bloc est un local, on applique la formule des cabinets groupés (30 + 15 N, N = nombre d’équipements du bloc). D’autres organismes comptent chaque cabine fermée comme un cabinet isolé (30 m³/h chacune). Exemple pour 4 WC : 90 m³/h contre 120 m³/h.',
    pourquoi: 'Le texte fixe 30 m³/h pour un « cabinet d’aisances isolé » et 30 + 15 N pour des cabinets « groupés », N étant le nombre d’équipements « dans le local » ; il ne précise pas si une cabine fermée à l’intérieur d’un bloc est un local isolé. Aucune source consultée ne tranche.',
    source: 'Code du travail R4212-6 (texte du tableau) ; interprétation à trancher par la DT' },

  // ——— Captage ———
  { id: 'hierarchie-captage', theme: 'Captage', nature: 'texte', mots: 'suppression captage source ventilation générale priorité',
    q: 'Une ventilation générale suffit-elle dans un atelier où se dégagent des fumées ou des vapeurs ?',
    r: 'Non, en principe : les émissions doivent d’abord être supprimées si le procédé le permet, sinon captées au plus près de leur source ; la ventilation générale n’évacue que ce qui ne peut pas être capté.',
    pourquoi: 'C’est l’ordre de priorité fixé par le Code du travail pour les gaz, vapeurs et aérosols dangereux.',
    source: 'Code du travail R4222-12 ; INRS ED 6008, chap. 1, § 2' },
  { id: 'types-captage', theme: 'Captage', nature: 'texte', mots: 'enveloppant inducteur récepteur hotte cabine enceinte bras type captage',
    q: 'Enveloppant, inducteur, récepteur : comment les distinguer, et lequel préférer ?',
    r: 'Enveloppant : il entoure la source (enceinte, cabine) ; inducteur : placé près de la source, il crée une vitesse au point d’émission (bouche, fente, bras) ; récepteur : il recueille un polluant entraîné vers lui par le procédé (hotte au-dessus d’une source chaude). Ordre de préférence : enveloppant, puis inducteur, puis récepteur.',
    pourquoi: 'Chaque type fonctionne selon ses propres principes : on ne contrôle pas l’un avec les critères d’un autre.',
    source: 'INRS ED 695 (2022), chapitre « Dispositifs de captage »' },
  { id: 'critere-inducteur', theme: 'Captage', nature: 'texte', mots: 'inducteur bouche bras vitesse point émission gaine critère',
    q: 'Pour un captage inducteur, je contrôle la vitesse dans la bouche ou au point d’émission ?',
    r: 'Au point d’émission : la vitesse dans l’ouverture du dispositif ou dans les canalisations ne peut en aucun cas constituer un critère de captage.',
    pourquoi: 'La vitesse induite décroît très vite avec la distance : à une distance égale au diamètre de la bouche, il ne reste dans l’axe qu’environ 7 % de la vitesse d’entrée sans collerette, 10 % avec collerette.',
    source: 'INRS ED 695, chapitre « Dispositifs de captage inducteurs »',
    appli: 'Bras d’aspiration : distance maximale de captage calculée et comparée à la distance d’utilisation.' },
  { id: 'vitesses-captage', theme: 'Captage', nature: 'texte', mots: 'vitesse captage soudage meulage dégraissage décapage fût condition dispersion',
    q: 'Quelle vitesse de captage viser selon le procédé ?',
    r: 'Émission sans vitesse en air calme (évaporation, dégraissage) 0,25 à 0,5 m/s ; faible vitesse en air modérément calme (soudage, décapage, traitements de surface) 0,5 à 1 ; génération active en zone agitée (remplissage continu, ensachage) 1 à 2,5 ; grande vitesse initiale (meulage, décapage à l’abrasif) 2,5 à 10.',
    pourquoi: 'La vitesse doit entraîner le polluant malgré les courants d’air ; elle est à majorer en présence de courants d’air perturbateurs.',
    source: 'INRS ED 695, tableau III',
    appli: 'Bras d’aspiration et installations diverses : vitesse affichée à côté de chaque condition de dispersion.' },
  { id: 'captage-recepteur', theme: 'Captage', nature: 'texte', mots: 'hotte récepteur dôme source chaude meulage courant d air',
    q: 'Une hotte au-dessus d’une source chaude se contrôle-t-elle par la vitesse de captage ?',
    r: 'Non : pour un captage récepteur, les notions de vitesse de captage et de surfaces d’égale vitesse ne jouent aucun rôle ; le polluant doit être entraîné spontanément vers le dispositif.',
    pourquoi: 'Ces dispositifs sont très sensibles aux courants d’air ; pour le meulage, un récepteur ne retient que les grosses particules, pas les particules respirables.',
    source: 'INRS ED 695, chapitre « Dispositifs de captage récepteurs »' },
  { id: 'compensation', theme: 'Captage', nature: 'texte', mots: 'compensation air introduit entrée d air dépression porte ventilateur efficacité',
    q: 'Un atelier sans entrée d’air de compensation : est-ce un problème pour le captage ?',
    r: 'Oui : l’air extrait doit être compensé par un débit équivalent ; un manque de compensation met l’atelier en dépression, réduit les débits des ventilateurs et l’efficacité des captages.',
    pourquoi: 'Les entrées d’air de compensation doivent être conçues pour ne pas réduire l’efficacité du captage (courants d’air, inconfort).',
    source: 'Code du travail R4222-13 ; INRS ED 695, § 7.1 « Rôle de la compensation »' },
  { id: 'alarme-captage', theme: 'Captage', nature: 'texte', mots: 'alarme dysfonctionnement captage signal automatique',
    q: 'Une installation de captage doit-elle avoir une alarme ?',
    r: 'Oui lorsque son dysfonctionnement n’est pas perceptible par les occupants : un dispositif d’alerte automatique doit le signaler.',
    pourquoi: 'Les installations doivent aussi garantir qu’en aucun point les concentrations ne soient dangereuses, sous les valeurs limites d’exposition.',
    source: 'Code du travail R4222-13' },
  { id: 'rejet-prise-air-neuf', theme: 'Captage', nature: 'texte', mots: 'rejet cheminée prise air neuf toiture vent',
    q: 'Le rejet d’un extracteur est juste à côté d’une prise d’air neuf : à signaler ?',
    r: 'Oui : l’air pollué doit être rejeté en dehors des zones de prise d’air neuf (cheminée de hauteur suffisante, compte tenu du vent et du relief).',
    pourquoi: 'Sinon une partie des polluants est réintroduite dans les locaux.',
    source: 'INRS ED 695, § 6 « Rejet »' },

  // ——— Recyclage ———
  { id: 'air-repris-meme-local', theme: 'Recyclage', nature: 'texte', mots: 'CTA reprise air repris recyclage bureau même local',
    q: 'Une CTA reprend l’air d’un bureau et le resouffle dans le même bureau après traitement : c’est du recyclage ?',
    r: 'Au sens des règles du recyclage des locaux à pollution spécifique, non : l’air pris hors des points de captage et réintroduit dans le même local après conditionnement thermique n’est pas considéré comme de l’air recyclé.',
    pourquoi: 'Le Code du travail définit l’air recyclé comme l’air pris et réintroduit dans un local ; le guide INRS précise que la reprise hors captage dans le même local, après traitement thermique, n’en relève pas. Cet air ne compte pas pour autant dans l’air neuf.',
    source: 'Code du travail R4222-3 et R4222-8 ; INRS ED 6008, annexe « Vocabulaire technique »' },
  { id: 'recyclage-local-non-specifique', theme: 'Recyclage', nature: 'texte', mots: 'recyclage bureau atelier épuré renvoyé dépoussiéreur',
    q: 'L’air épuré d’un atelier peut-il être renvoyé dans des bureaux ?',
    r: 'Non : il est interdit d’envoyer après recyclage dans un local à pollution non spécifique l’air pollué d’un local à pollution spécifique.',
    pourquoi: 'L’air ne peut être recyclé que s’il est efficacement épuré, et envoyé dans d’autres locaux que si la pollution y est de même nature.',
    source: 'Code du travail R4222-9 et R4222-14',
    appli: 'Fiche recyclage : « Vers un local à pollution non spécifique » donne un avis non satisfaisant.' },
  { id: 'recyclage-cinquieme', theme: 'Recyclage', nature: 'texte', mots: 'recyclage gaine concentration VLEP cinquième DustTrak poussière',
    q: 'À quelle valeur compare-t-on la concentration mesurée dans la gaine de recyclage ?',
    r: 'Au cinquième de la VLEP de chaque polluant : pour les poussières sans effet spécifique, 0,8 mg/m³ (poussières totales, fraction inhalable) et 0,18 mg/m³ (fraction alvéolaire).',
    pourquoi: 'Le guide INRS fixe la concentration de chaque polluant dans les conduits de recyclage au plus au cinquième de sa valeur limite. Pour les poussières sans effet spécifique, l’article R4222-10 fixe 4 mg/m³ (poussières totales) et 0,9 mg/m³ (poussières alvéolaires) sur 8 heures, en vigueur depuis le 1er juillet 2023.',
    source: 'INRS ED 6008, chap. 1, § 2 ; Code du travail R4222-10 ; arrêté du 8 octobre 1987, art. 4.2 b',
    appli: 'Fiche recyclage : avis « concentrations au plus égales au 1/5 de la VLEP ».' },
  { id: 'recyclage-defaillance', theme: 'Recyclage', nature: 'texte', mots: 'recyclage panne défaillance filtre arrêt surveillance',
    q: 'Le filtre du recyclage est défaillant : que doit faire l’employeur ?',
    r: 'Arrêter le recyclage : en cas de défaillance du système d’épuration ou de filtration, le recyclage est interrompu ; la surveillance obligatoire doit permettre de déceler ces défauts.',
    pourquoi: 'L’air envoyé après recyclage dans les locaux à pollution non spécifique est filtré ; dans les locaux à pollution spécifique, les valeurs limites doivent rester respectées, au besoin en arrêtant le recyclage.',
    source: 'Code du travail R4222-8 et R4222-16' },
  { id: 'recyclage-surveillance-non-testee', theme: 'Recyclage', nature: 'interne', mots: 'surveillance alarme colmatage pressostat test recyclage',
    q: 'L’alarme de colmatage n’a pas pu être testée : la surveillance est-elle conforme ?',
    r: 'On ne peut pas se prononcer : un système qui n’a pas été testé n’est pas déclaré conforme.',
    pourquoi: 'L’arrêté demande, tous les six mois, le contrôle de tous les systèmes de surveillance ; sans test, ce contrôle n’est pas fait. La raison (accès, production) s’écrit dans l’observation.',
    source: 'Base : arrêté du 8 octobre 1987, art. 4.2 b ; Code du travail R4222-16. Conclusion « ne peut se prononcer » : pratique de l’appli',
    appli: 'Fiche recyclage : « Non testés » donne « Impossible de se prononcer ».' },
  { id: 'recyclage-information', theme: 'Recyclage', nature: 'texte', mots: 'recyclage médecin du travail CSE information consultation',
    q: 'Le médecin du travail et le CSE doivent-ils être informés du recyclage ?',
    r: 'Oui : les conditions du recyclage leur sont portées à connaissance, et ils sont consultés sur toute nouvelle installation ou modification des conditions de recyclage.',
    pourquoi: 'Le contrôleur vérifie que cette information a été faite.',
    source: 'Code du travail R4222-17',
    appli: 'Fiche recyclage : information du médecin et du CSE.' },
  { id: 'recyclage-toxiques', theme: 'Recyclage', nature: 'texte', mots: 'recyclage toxique cancérogène épuration récupération chaleur',
    q: 'Peut-on recycler l’air chargé de polluants très toxiques ?',
    r: 'Le guide INRS recommande d’écarter le recyclage en présence de polluants particulièrement toxiques ; le recyclage n’est possible que si tous les polluants sont connus et épurés.',
    pourquoi: 'La qualité de l’air recyclé dépend d’une épuration toujours délicate. Des textes particuliers peuvent aussi interdire ou limiter le recyclage pour certaines substances ou certains locaux.',
    source: 'INRS ED 695, § 6 ; INRS ED 6008, chap. 1, § 2 ; Code du travail R4222-15' },

  // ——— Par installation ———
  { id: 'sorbonne-04', theme: 'Par installation', nature: 'texte', mots: 'sorbonne vitesse frontale 0,4 2005 XP X 15-203 14175 laboratoire',
    q: 'Sorbonne installée après 2005 : applique-t-on aussi le seuil de 0,4 m/s ?',
    r: 'Oui pour les sorbonnes « classiques » : le guide INRS recommande une vitesse d’air frontale d’au moins 0,4 m/s en chaque point, quelle que soit l’année de construction.',
    pourquoi: 'Les normes européennes ne fixent pas de seuil ; le guide ajoute ce seuil de vitesse pour les sorbonnes classiques, y compris celles réceptionnées selon NF EN 14175-4 et XP X 15-206. Les sorbonnes à insufflation d’air (vitesses d’entrée inférieures à 0,4 m/s) en sont exclues.',
    source: 'INRS ED 795, tableau 1 et § réception et sorbonnes existantes',
    appli: 'Sorbonnes : seuil de 0,4 m/s par défaut, modifiable.' },
  { id: 'sorbonne-degradation', theme: 'Par installation', nature: 'texte', mots: 'sorbonne baisse 30 % référence confinement',
    q: 'Une sorbonne a perdu de la vitesse par rapport à sa valeur de référence : à partir de quand s’inquiéter ?',
    r: 'Pour une sorbonne réceptionnée selon la norme XP X 15-203, une baisse d’environ 30 % en un point par rapport à la valeur de référence est significative : un mesurage du confinement est alors nécessaire.',
    pourquoi: 'Les vitesses frontales servent à suivre la dérive des performances entre deux essais de confinement.',
    source: 'INRS ED 795, § sorbonnes existantes' },
  { id: 'soudage-vitesse', theme: 'Par installation', nature: 'texte', mots: 'soudage bras torche vitesse 0,5 point de soudure distance 20 cm',
    q: 'Quelle vitesse viser au point de soudage, et jusqu’où un bras reste-t-il efficace ?',
    r: '0,5 m/s au point d’émission ; avec un débit de 1 000 m³/h, l’efficacité d’un captage localisé chute en général au-delà de 20 cm.',
    pourquoi: 'La vitesse induite décroît très vite avec la distance : le bras doit être rapproché du point de soudage. Le seuil de 0,4 m/s de la norme NF EN ISO 15012-2 est jugé trop faible par l’INRS face à des courants d’air d’environ 0,3 m/s.',
    source: 'INRS ED 668 (soudage à l’arc et coupage), § captage localisé',
    appli: 'Bras d’aspiration : distance maximale de captage comparée à la distance d’utilisation.' },
  { id: 'cabine-peinture-vitesse', theme: 'Par installation', nature: 'texte', mots: 'cabine peinture vitesse 0,5 0,4 horizontale ouverte pulvérisation',
    q: 'Cabine de peinture ouverte à ventilation horizontale : quel critère de vitesse ?',
    r: 'Vitesse moyenne d’au moins 0,5 m/s dans le plan de travail du peintre, et aucun point de mesure sous 0,4 m/s.',
    pourquoi: 'Le même critère s’applique aux cabines ouvertes et aux cabines à ventilation horizontale décrites par le guide.',
    source: 'INRS ED 839, § 4.3.1.3 et 4.3.2.2' },
  { id: 'cabine-peinture-recyclage', theme: 'Par installation', nature: 'texte', mots: 'cabine peinture recyclage séchage application pistolage',
    q: 'Une cabine de peinture peut-elle recycler l’air pendant l’application ?',
    r: 'Non : un dispositif doit rendre impossible le recyclage pendant la phase d’application, l’opérateur devant rester dans un flux d’air neuf.',
    pourquoi: 'Le recyclage n’est envisageable qu’en phase de séchage.',
    source: 'INRS ED 839, § cabines à ventilation verticale et § 5.5' },
  { id: 'box-peinture', theme: 'Par installation', nature: 'texte', mots: 'box préparation peinture 50 volumes heure renouvellement asservie',
    q: 'Quel débit pour un box de préparation des peintures ?',
    r: 'Au moins 50 renouvellements du volume par heure (1 000 m³/h pour un box de 20 m³), par captage localisé asservi à la présence de l’opérateur, avec des ouvertures hautes et basses opposées.',
    pourquoi: 'Ce sont les recommandations du guide pour les locaux annexes des cabines de peinture (norme NF T 35-014).',
    source: 'INRS ED 839, § locaux annexes des cabines (box de préparation)' },
  { id: 'bois-transport', theme: 'Par installation', nature: 'texte', mots: 'bois menuiserie vitesse transport 20 m/s conduit dépôt',
    q: 'Quelle vitesse de transport dans les conduits d’une aspiration de menuiserie ?',
    r: '20 m/s, pour éviter les dépôts de poussières dans les conduits.',
    pourquoi: 'Au-delà, le bruit et la consommation du ventilateur augmentent fortement (proportionnelle au cube de la vitesse).',
    source: 'INRS ED 750 (seconde transformation du bois)',
    appli: 'Machines à bois : vitesse comparée à 20 m/s.' },

  // ——— Dossier et contrôles ———
  { id: 'installation-nouvelle-existante', theme: 'Dossier et contrôles', nature: 'texte', mots: 'nouvelle existante 1988 modification dossier installation',
    q: 'Comment savoir si une installation est « nouvelle » ou « existante » ?',
    r: 'Est nouvelle toute installation réalisée ou modifiée de façon notable après le 1er avril 1988 ; les autres sont existantes.',
    pourquoi: 'Le 1er avril 1988 est la date d’application de l’arrêté du 8 octobre 1987. La catégorie fixe le contenu du dossier d’installation attendu.',
    source: 'INRS ED 6008, chap. 2' },
  { id: 'dossier-existante', theme: 'Dossier et contrôles', nature: 'texte', mots: 'notice instructions dossier valeurs de référence consigne existante',
    q: 'Pour une installation existante, faut-il demander la notice d’instructions ?',
    r: 'Non : pour une installation existante, le dossier comprend le dossier de valeurs de référence et la consigne d’utilisation, établis par le chef d’établissement.',
    pourquoi: 'La notice d’instructions (descriptif et valeurs de référence) est due par le maître d’ouvrage pour les installations nouvelles. Pour une installation existante, les valeurs de référence sont établies à partir des premiers contrôles réalisés à l’initiative du chef d’établissement.',
    source: 'INRS ED 6008, chap. 2, § 1.2 ; Code du travail R4212-7',
    appli: 'Analyse d’un dossier existant : la notice peut être cochée « sans objet ».' },
  { id: 'notice-contenu', theme: 'Dossier et contrôles', nature: 'texte', mots: 'notice instructions maître d ouvrage contenu entretien',
    q: 'Que doit contenir la notice d’instructions du maître d’ouvrage ?',
    r: 'Les dispositions prises pour la ventilation et l’assainissement, et les informations nécessaires à l’entretien, au contrôle de leur efficacité et à l’établissement de la consigne d’utilisation.',
    pourquoi: 'Elle est transmise à l’employeur ; elle contient le dossier de valeurs de référence.',
    source: 'Code du travail R4212-7 ; INRS ED 6008, chap. 2' },
  { id: 'consigne-avis', theme: 'Dossier et contrôles', nature: 'texte', mots: 'consigne utilisation médecin CSE avis panne',
    q: 'Qui valide la consigne d’utilisation des installations ?',
    r: 'L’employeur l’établit ; elle est soumise à l’avis du médecin du travail et du comité social et économique.',
    pourquoi: 'Elle décrit les dispositions prises pour la ventilation et la conduite à tenir en cas de panne.',
    source: 'Code du travail R4222-21' },
  { id: 'dossier-delai', theme: 'Dossier et contrôles', nature: 'texte', mots: 'délai mise en service un mois dossier valeurs de référence',
    q: 'Dans quel délai le dossier de valeurs de référence d’une installation neuve doit-il être établi ?',
    r: 'Au plus tard un mois après la mise en service de l’installation.',
    pourquoi: 'Les valeurs de référence caractérisent l’installation par ses paramètres initiaux, réputés satisfaisants, et servent de base aux contrôles périodiques.',
    source: 'INRS ED 6008, chap. 2, § 1.1.1' },
  { id: 'periodicite', theme: 'Dossier et contrôles', nature: 'texte', mots: 'périodicité annuel semestriel fréquence contrôle',
    q: 'Tous les combien faut-il contrôler les installations ?',
    r: 'Au moins une fois par an ; au moins tous les six mois pour les installations avec recyclage (concentration dans la gaine et systèmes de surveillance).',
    pourquoi: 'L’employeur maintient les installations en bon état et en assure régulièrement le contrôle ; les résultats sont portés au dossier de maintenance.',
    source: 'Arrêté du 8 octobre 1987, art. 2 b, 3.2, 4.2 a et 4.2 b ; Code du travail R4222-20' },
  { id: 'filtres-rechange', theme: 'Dossier et contrôles', nature: 'texte', mots: 'filtre rechange CTA classe efficacité perte de charge contrôle annuel',
    q: 'Faut-il vérifier les filtres de rechange des CTA lors du contrôle annuel ?',
    r: 'Oui : leur présence et leur conformité à la fourniture initiale (caractéristiques, classe d’efficacité, dimensions, perte de charge) font partie du contrôle annuel des locaux à pollution non spécifique.',
    pourquoi: 'L’examen de l’état des éléments de l’installation porte « plus particulièrement » sur ces filtres.',
    source: 'Arrêté du 8 octobre 1987, art. 3.2' },
  { id: 'pression-statique-suivi', theme: 'Dossier et contrôles', nature: 'texte', mots: 'pression statique débit suivi formule référence contrôle',
    q: 'Peut-on vérifier un débit avec la seule pression statique ?',
    r: 'Oui, si une pression statique de référence a été associée au débit au même point : Q = Qréf × √(P / Préf).',
    pourquoi: 'C’est pourquoi le dossier de valeurs de référence associe des pressions statiques ou des vitesses aux débits, en des points caractéristiques.',
    source: 'INRS ED 6008, tableau XVIII ; arrêté du 8 octobre 1987, art. 3.1 et 4.1',
    appli: 'Dossier de valeurs de référence : pression statique demandée et formule rappelée.' },
  { id: 'controle-prescrit', theme: 'Dossier et contrôles', nature: 'texte', mots: 'inspecteur travail prescrit organisme accrédité Cofrac',
    q: 'L’inspecteur du travail demande un contrôle : n’importe quel organisme peut-il le faire ?',
    r: 'Non : il doit être fait par un organisme accrédité, choisi sur la liste du Cofrac (ou mentionné à l’article R4724-1), saisi dans les quinze jours ; les résultats sont transmis dans les dix jours.',
    pourquoi: 'Ces contrôles prescrits sont distincts des contrôles périodiques ; leur contenu est fixé par l’arrêté du 20 décembre 2021.',
    source: 'INRS ED 6008, chap. 3 ; Code du travail R4722-12' },

  // ——— Avis et méthode (pratiques internes, signalées) ———
  { id: 'sans-reference', theme: 'Avis et méthode', nature: 'interne', mots: 'valeur de référence absente minimum réglementaire impossible de se prononcer',
    q: 'Le client n’a pas de valeurs de référence : à quoi compare-t-on les mesures ?',
    r: 'Aux minimums réglementaires (air neuf de l’article R4222-6, sanitaires de l’article R4212-6) et, pour les installations de captage, aux valeurs des normes et des guides INRS.',
    pourquoi: 'C’est la méthode écrite dans la synthèse du rapport. Quand aucune valeur ne s’applique, l’avis est « impossible de se prononcer » et le dossier de valeurs de référence est à demander (arrêté du 8 octobre 1987, art. 2).',
    source: 'Méthode du rapport SOCOTEC (chap. 4 « Synthèse du contrôle »)' },
  { id: 'quatre-vingts-pourcent', theme: 'Avis et méthode', nature: 'interne', mots: '80 % valeur de référence tolérance satisfaisant',
    q: 'La mesure est un peu sous la valeur de référence : satisfaisant ou non ?',
    r: 'Satisfaisant si la mesure atteint au moins 80 % de la valeur de référence.',
    pourquoi: 'C’est la règle du Rapso, reprise par l’appli pour toutes les comparaisons à une valeur de référence. Sans référence, on compare à la valeur réglementaire ou recommandée, sans ce coefficient.',
    source: 'Rapso V29 (code VBA)',
    appli: 'Appliqué automatiquement ; voir le dossier des calculs remis à la DT.' },
  { id: 'debit-volume', theme: 'Avis et méthode', nature: 'interne', mots: 'débit insuffisant volume local compense bureau',
    q: 'Bureau en ventilation mécanique : le débit d’air neuf est insuffisant mais le local est grand. Quel avis ?',
    r: 'Satisfaisant si le volume du local atteint le volume minimal par occupant de la table ; sinon non satisfaisant.',
    pourquoi: 'C’est la règle du Rapso : le volume du local peut compenser un débit insuffisant pour l’effectif présent. Les volumes de l’article R4222-5 visent la ventilation naturelle ; leur usage en ventilation mécanique est une pratique.',
    source: 'Rapso V29 (code VBA, feuille « autres locaux »)',
    appli: '« Pourquoi cet avis ? » sous l’avis du local détaille le calcul.' }
];

function faqNormalise(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

// Fiches correspondant à la recherche (tous les mots, dans la question, la réponse, la source ou les
// mots-clés) et au thème
function faqFiltrer(texte, theme) {
  var mots = faqNormalise(texte).split(/\s+/).filter(function (x) { return x.length > 1; });
  return FAQ_CAS.filter(function (c) {
    if (theme && c.theme !== theme) return false;
    var tout = faqNormalise([c.q, c.r, c.pourquoi, c.source, c.appli, c.theme, c.mots].join(' '));
    return mots.every(function (mo) { return tout.indexOf(mo) !== -1; });
  });
}

function faqMailQuestion() {
  var sujet = 'Aération — question à trancher (FAQ de l’appli)';
  var corps = 'Question :\n\n\nContexte (type d’installation, situation rencontrée) :\n\n\nCe que j’ai fait / ce que fait mon collègue :\n\n';
  location.href = 'mailto:?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);
}

function faqChercher(mot) {
  state.faqRecherche = mot;
  render();
}

function renderFaq() {
  var recherche = state.faqRecherche || '', theme = state.faqTheme || '';
  var liste = faqFiltrer(recherche, theme);
  var h = '<button class="back-btn" onclick="state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  h += '<div class="card"><h1>' + ICONS.clipboard + ' Questions fréquentes</h1>' +
    '<p class="subtitle">' + FAQ_CAS.length + ' cas sur lesquels on hésite, avec une réponse commune et sa source. Réponses proposées à la direction technique, qui les valide et les complète.</p>' +
    '<input type="search" class="input" style="margin-top:8px;" placeholder="Mot-clé : WC, CTA, soudage, recyclage…" value="' + escapeHtml(recherche) + '" ' +
    'oninput="state.faqRecherche=this.value;faqRafraichir();">' +
    '<div class="faq-mots">' + FAQ_MOTS_RAPIDES.map(function (mo) {
      return '<button type="button" class="faq-mot' + (faqNormalise(recherche) === faqNormalise(mo) ? ' active' : '') + '" onclick="faqChercher(\'' + escapeHtml(jsSafeStr(mo)) + '\');">' + escapeHtml(mo) + '</button>';
    }).join('') + (recherche ? '<button type="button" class="faq-mot" onclick="faqChercher(\'\');">✕ effacer</button>' : '') + '</div></div>';
  h += '<div class="row" style="flex-wrap:wrap;gap:6px;margin:0 0 8px;">' +
    [''].concat(FAQ_THEMES).map(function (t) {
      return '<button type="button" class="home-filter' + (theme === t ? ' active' : '') + '" onclick="state.faqTheme=\'' + escapeHtml(jsSafeStr(t)) + '\';render();">' + escapeHtml(t || 'Tous') + '</button>';
    }).join('') + '</div>';
  h += '<div id="faq-liste">' + faqListeHtml(liste) + '</div>';
  h += '<div class="card"><p class="subtitle">Une question qui n’est pas ici, ou une réponse qui ne vous convient pas ? Elle est envoyée au référent, qui la fait trancher ; la réponse arrive avec une prochaine version de l’appli.</p>' +
    '<button class="btn btn-gray" onclick="faqMailQuestion();">' + ICONS.upload + ' Poser une question à trancher</button></div>';
  return h;
}

function faqStatut(c) {
  if (c.valide) return 'Validé par la DT le ' + c.valide;
  if (c.ouvert) return 'Question ouverte : aucune source ne tranche, à trancher par la DT';
  return c.nature === 'interne' ? 'Proposition interne, sans source extérieure : à valider par la DT' : 'Proposition, à valider par la DT';
}

function faqListeHtml(liste) {
  if (!liste.length) return '<div class="empty-state"><p>Aucune question ne correspond. Posez-la au référent (bouton en bas de page).</p></div>';
  return '<p class="subtitle" style="margin:0 4px 6px;">' + liste.length + ' question(s)</p>' + liste.map(function (c) {
    return '<details class="card faq-cas"><summary><b>' + escapeHtml(c.q) + '</b>' + (c.ouvert ? ' <span class="faq-pastille faq-ouvert">Question ouverte</span>' : '') + '</summary>' +
      '<p class="faq-reponse">' + escapeHtml(c.r) + '</p>' +
      '<p class="subtitle">' + escapeHtml(c.pourquoi) + '</p>' +
      (c.appli ? '<p class="subtitle"><b>Dans l’appli :</b> ' + escapeHtml(c.appli) + '</p>' : '') +
      '<p class="faq-source"><span class="faq-pastille faq-' + c.nature + '">' + escapeHtml(FAQ_NATURES[c.nature] || '') + '</span> ' + escapeHtml(c.source) + '</p>' +
      '<p class="faq-statut' + (c.valide ? ' faq-valide' : '') + '">' + escapeHtml(faqStatut(c)) + '</p></details>';
  }).join('');
}

// Recherche en direct sans re-rendre la page (le champ garde le focus)
function faqRafraichir() {
  var el = document.getElementById('faq-liste');
  if (el) el.innerHTML = faqListeHtml(faqFiltrer(state.faqRecherche || '', state.faqTheme || ''));
}

console.log('✓ Questions fréquentes chargées (' + FAQ_CAS.length + ' fiches)');
