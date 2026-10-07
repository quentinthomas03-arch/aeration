// Dossier des calculs de l'appli Aération, pour validation par la direction technique.
//   node outils/doc-calculs/generer.js
// Produit « Documents DT/Calculs de l'appli Aération.pdf ».
//
// Chaque formule ci-dessous est la transcription en clair d'une règle de js/calculations.js (et de
// js/locaux-specifiques.js, js/captages-inrs.js pour les types hors Rapso). Les EXEMPLES, eux, ne sont
// pas recopiés à la main : ils sont recalculés à chaque génération par le code de l'appli
// (applyCalculations), comme sur la tablette. À regénérer après toute modification d'un calcul, avec
// la non-régression face au Rapso (outils/non-regression-rapso/compare.js) dont le bilan est repris.

const fs = require('fs'), path = require('path'), cp = require('child_process');
const { APP, loadApp, pdfBuffer } = require('../charger-appli');

const ctx = loadApp();
const BLEU = '#0082DE', BLEU_PALE = '#E8F3FC', ORANGE_PALE = '#FFF1DC', GRIS = '#5B6573';

// ————————————————————————————————————————————
// Origines
// ————————————————————————————————————————————
const RAPSO = 'Rapso V29 (VBA)';
const LISTE = 'Rapso V29 (feuille LISTE)';
const APPLI = 'Ajout de l’appli — à valider';

// ————————————————————————————————————————————
// Contenu : principes communs
// ————————————————————————————————————————————
const PRINCIPES = [
  ['Saisie des nombres', 'Virgule ou point acceptés (« 2,5 » = 2.5). Une case vide n’est jamais comptée comme zéro, sauf mention contraire (WC, douches, lavabos des sanitaires).', 'Appli'],
  ['Surface d’une section', 'Circulaire : π × (D / 100)² / 4. Rectangulaire : (côté 1 / 100) × (côté 2 / 100). Dimensions saisies en cm, surface en m².', RAPSO],
  ['Débit', 'Débit (m³/h) = surface (m²) × vitesse (m/s) × 3 600.', RAPSO],
  ['Masse volumique', 'ρ = 1,293 × 273 / (273 + T) × (101 300 + P) / 101 300, T en °C, P = pression statique en Pa. Information affichée, elle n’intervient pas dans le débit.', RAPSO],
  ['Grille de points', 'Moyenne et minimum des points saisis. Toutes les cases doivent être remplies : « / » exclut un point, une case vide rend le résultat impossible. Jusqu’à 7 colonnes.', RAPSO],
  ['Valeur de référence', 'Une mesure est satisfaisante si elle atteint 80 % de la valeur de référence (mesure ≥ 0,8 × référence). « / » = pas de référence : on compare alors à la valeur recommandée (INRS, norme) quand le type en prévoit une.', RAPSO],
  ['Arrondis', 'Les valeurs affichées sont arrondies (2 décimales en général, 4 pour les surfaces, unité pour certains débits comme dans le Rapso). Les calculs en chaîne utilisent la valeur en pleine précision, pas la valeur arrondie affichée.', RAPSO],
  ['Avis à plusieurs critères', 'L’avis d’ensemble est le moins favorable : « Impossible de se prononcer » l’emporte sur « Non satisfaisant », qui l’emporte sur « Satisfaisant » (sauf mention contraire).', RAPSO],
  ['Données de l’an dernier', 'Les valeurs N-1 servent seulement à afficher l’évolution et à signaler un écart fort ; elles n’entrent dans aucun avis.', 'Appli']
];

// ————————————————————————————————————————————
// Contenu : par type. regles = [grandeur, calcul, origine]
// exemple = données d'entrée (clés du schéma), sorties = clés calculées à montrer ('clé' ou ['clé', 'libellé'])
// ————————————————————————————————————————————
const TYPES = [
  { id: 'bureaux', titre: 'Bureaux, salles de réunion (locaux à pollution non spécifique)', regles: [
    ['Volume minimal', 'Volume par occupant × effectif (table « Type de local », annexe A).', RAPSO],
    ['Débit minimal d’air neuf', 'Débit par occupant × effectif (Code du travail R4222-6, table annexe A).', RAPSO],
    ['Air neuf introduit', 'Extraction : débit total mesuré. Soufflage : débit total × % d’air neuf. Double flux : débit soufflé × % d’air neuf.', RAPSO],
    ['% d’air neuf non renseigné', 'En soufflage / double flux, tout l’air soufflé est compté comme air neuf (100 %).', APPLI + ' (retour terrain du 05/10/2026)'],
    ['Avis — ventilation naturelle', 'Satisfaisant si volume du local ≥ volume minimal. « Sans ouvrants » et pas d’entrée d’air permanente = Non satisfaisant.', RAPSO],
    ['Avis — ventilation mécanique', 'Satisfaisant si air neuf ≥ débit minimal ; sinon satisfaisant quand même si volume ≥ volume minimal. Débit non mesuré : jugé sur le volume.', RAPSO],
    ['Extraction sans entrée d’air', 'Extraction, sans ouvrant ni entrée d’air sur l’extérieur (réponses « Non ») = Non satisfaisant. Ne s’applique pas en soufflage ni en double flux.', RAPSO + ' ; limité à l’extraction le 05/10/2026'],
    ['Local occupé occasionnellement', 'Avis « Sans objet ».', RAPSO]
  ], exemple: { type_local: 'Bureaux', effectif: '4', volume: '45', type_ventilation: 'Extraction', ouvrant_exterieur: 'Oui', debit_total_mesure: '110' },
  sorties: ['volume_min', 'debit_min_air_neuf', 'debit_air_neuf_introduit', 'type_ventilation_libelle', 'avis'] },

  { id: 'erp', titre: 'ERP (établissements recevant du public)', regles: [
    ['Débit minimal d’air neuf', 'Débit par occupant × (travailleurs + public), table annexe A.', RAPSO],
    ['Volume minimal', 'Volume par occupant × travailleurs.', RAPSO],
    ['Chambre d’hébergement de 1 ou 2 personnes', 'Débit minimal forfaitaire de 30 m³/h par local (Règlement sanitaire départemental type, art. 64).', APPLI],
    ['Hébergement collectif (plus de 3 personnes)', '18 m³/h par occupant, pas de volume minimal.', APPLI],
    ['Avis', 'Mêmes règles que les bureaux (ventilation naturelle : volume ; mécanique : débit, puis volume).', RAPSO + ' ; aligné sur les bureaux le 18/09/2026']
  ], exemple: { type_local: 'Locaux de Restauration, Vente ou Réunion', travailleur: '6', public: '40', volume: '600', type_ventilation: 'Double flux', debit_soufflage: '1500', pourcentage_air_neuf: '100' },
  sorties: ['debit_min_air_neuf', 'volume_min', 'debit_air_neuf_introduit', 'avis'] },

  { id: 'sanitaires', titre: 'Sanitaires', regles: [
    ['Débit minimal d’extraction', 'Code du travail R4212-6, logique du Rapso : 1 WC ou urinoir = 30 m³/h ; 1 douche = 45 m³/h ; plusieurs = 30 + 15 × (WC + douches) ; lavabos groupés (2 et plus) = 10 + 5 × nombre, ajoutés au reste. Cases vides = 0.', RAPSO],
    ['Local à usage individuel', '1 WC et/ou 1 douche au plus, coché « Individuel » : 15 m³/h (R4212-6, renvoi **).', APPLI + ' (demande du 04/10/2026)'],
    ['Chambre individuelle dans un ERP', '15 m³/h.', APPLI],
    ['Type de ventilation', 'Débit mesuré > 0 : « Mécanique », sinon « Absence de ventilation ».', RAPSO],
    ['Avis', 'Satisfaisant si débit mesuré ≥ débit minimal. Un seul lavabo (minimum 0) : Satisfaisant.', RAPSO]
  ], exemple: { wc_urinoirs: '3', douches: '0', lavabos: '2', individuel_collectif: 'Collectif', debit_mesure: '95' },
  sorties: ['debit_min_reglementaire', 'type_ventilation', 'avis'] },

  { id: 'locaux_fumeurs', titre: 'Locaux fumeurs', regles: [
    ['Surface, volume', 'Largeur × longueur ; × hauteur.', RAPSO],
    ['Critère surface', 'Surface < 35 m².', RAPSO + ' (Code de la santé publique R3512-4)'],
    ['Critère 20 %', 'Surface ≤ 20 % de la superficie totale de l’établissement.', RAPSO],
    ['Taux de renouvellement', 'Débit d’extraction / volume ; critère : ≥ 10 vol/h.', RAPSO],
    ['Avis', 'Non satisfaisant dès qu’un des 21 critères est « Non satisfaisant » (ou un critère chiffré non respecté), sinon Satisfaisant.', RAPSO],
    ['Critère non renseigné', 'Ignoré. Le Rapso le compte comme un échec (bouton resté sur « ? »).', APPLI]
  ], exemple: { largeur: '3', longueur: '4', hauteur: '2.5', surface_etablissement: '800', debit_extraction: '380', critere_local_clos: 'Satisfaisant' },
  sorties: ['surface', 'volume', 'crit_surface_35', 'crit_ratio_20', 'taux_renouvellement', 'crit_renouvellement', 'avis_csp'] },

  { id: 'cta', titre: 'CTA (centrales de traitement d’air)', regles: [
    ['Surface, débit de chaque réseau', 'Neuf, soufflé, repris (si mesuré) : surface de la section × vitesse × 3 600.', RAPSO],
    ['Avis', 'Choisi par le technicien (Satisfaisant / Non satisfaisant / Impossible de se prononcer), comme dans le Rapso : les données constructeur manquent souvent.', RAPSO]
  ], exemple: { neuf_forme: 'Rectangulaire', neuf_diametre_cote1: '50', neuf_cote2: '40', neuf_vitesse: '3.2', souf_forme: 'Circulaire', souf_diametre_cote1: '45', souf_vitesse: '5.1' },
  sorties: [['neuf_surface', 'Air neuf — surface (m²)'], ['neuf_debit', 'Air neuf — débit (m³/h)'], ['souf_surface', 'Soufflage — surface (m²)'], ['souf_debit', 'Soufflage — débit (m³/h)']] },

  { id: 'extracteur', titre: 'Extracteurs', regles: [
    ['Surface, vitesse, débit', 'Surface de la section ; vitesse directe ou moyenne de la grille de points ; débit = surface × vitesse × 3 600.', RAPSO],
    ['Taux de renouvellement (si affiché)', 'Débit / volume du local ; satisfaisant si ≥ valeur recommandée saisie.', RAPSO],
    ['Avis', 'Débit ≥ 0,8 × valeur de référence ; combiné au taux de renouvellement s’il est affiché (le moins favorable).', RAPSO + ' ; combinaison corrigée le 18/09/2026']
  ], exemple: { forme_section: 'Circulaire', diametre_cote1: '31.5', vitesse_mode: 'Vitesse moyenne directe', vitesse: '6.4', valeur_reference_recommandee: '1800', afficher_taux: 'Oui', volume_local: '250', valeur_recommandee: '6' },
  sorties: ['surface_m2', 'debit_annee_en_cours', 'volume_par_heure', 'conclusion_taux', 'avis_constructeur'] },

  { id: 'sorbonnes', titre: 'Sorbonnes de laboratoire', regles: [
    ['Hauteur d’ouverture h', 'Avant 2005 (XP X15-203) : 400 mm ; après 2005 (NF EN 14175-4) : 500 mm ; sinon valeur saisie.', RAPSO],
    ['Surface de l’ouverture', 'Largeur (mm) / 1 000 × h (mm) / 1 000.', RAPSO],
    ['Grille de mesure', '3 lignes ; colonnes selon la largeur : ≤ 610 mm : 2 ; ≤ 1 010 : 3 ; ≤ 1 410 : 4 ; ≤ 1 810 : 5 ; ≤ 2 210 : 6 ; au-delà : 7 (schéma INRS ED 795). Espacements : (largeur − 200) / (colonnes − 1) et (h − 200) / 2.', RAPSO],
    ['Vitesses, débit', 'Minimum et moyenne de la grille ; débit = surface × moyenne non arrondie × 3 600.', RAPSO],
    ['Avis vitesse minimale / norme', 'Vitesse minimale ≥ 0,4 m/s, pour toutes les sorbonnes, modifiable.', RAPSO + ' — décision du 03/10/2026'],
    ['Avis par rapport aux références', 'Mesure ≥ 0,8 × référence ; sans référence : « Sans objet - Absence de Val. de Réf. ».', RAPSO]
  ], exemple: { annee_construction: 'Après janvier 2005 - Norme NF EN 14175-4 (h=500mm)', largeur_mm: '1500', grille: [['0.52', '0.48', '0.55', '0.50', '0.47'], ['0.45', '0.51', '0.53', '0.49', '0.46'], ['0.44', '0.50', '0.52', '0.48', '0.43']], vitesse_min_reference: '/', vitesse_moy_reference: '0.5', debit_reference: '/' },
  sorties: ['h_mm', 'surface_ouverture', 'nb_colonnes', 'espace_horizontal', 'espace_vertical', 'vitesse_min_mesuree', 'vitesse_moy_mesuree', 'debit_mesure', 'vitesse_min_avis_norme', 'vitesse_moy_avis_reference', 'debit_avis_reference'] },

  { id: 'hottes', titre: 'Hottes', regles: [
    ['Vitesse au point d’émission', 'Grille de points sur la face de la hotte : minimum et moyenne.', RAPSO],
    ['Débit extrait', '(largeur / 100) × (hauteur / 100) × vitesse moyenne non arrondie × 3 600.', RAPSO],
    ['Avis vitesses minimale et moyenne', 'Mesure ≥ 0,8 × référence ; référence « / » : mesure ≥ valeur recommandée INRS saisie.', RAPSO],
    ['Vitesse de transport recommandée', 'Selon le type de polluant (INRS ED 695, tableau VI) : fumées 7 à 10 m/s, poussières très fines 10 à 13, sèches 13 à 18, industrielles moyennes 18 à 20, lourdes 20 à 23, lourdes ou humides > 23, gaz et vapeurs : pas de minimum.', RAPSO + ' ; valeurs vérifiées sur l’ED 695 (2022)'],
    ['Avis vitesse de transport', 'Avec référence : mesure ≥ 0,8 × référence. Sans référence : mesure ≥ borne basse de la plage (« > 23 » : strictement au-dessus). Gaz et vapeurs : sans objet.', RAPSO],
    ['Conclusion', 'Le moins favorable des avis des mesures choisies.', RAPSO]
  ], exemple: { mesures_choisies: ["Vitesse au point d'émission", 'Vitesse de transport'], vpe_largeur_cm: '120', vpe_hauteur_cm: '60', vpe_nb_points_largeur: '3', vpe_nb_points_hauteur: '2', vpe_grid: [['0.62', '0.58', '0.55'], ['0.51', '0.60', '0.57']], vpe_min_reference: '/', vpe_min_inrs: '0.5', vpe_moy_reference: '/', vpe_moy_inrs: '0.5', vt_type_polluant: 'Fumées', vt_mesuree: '8.2', vt_reference: '/' },
  sorties: ['vpe_min', 'vpe_moyenne', 'vpe_debit', 'avis_vpe_min', 'avis_vpe_moy', 'vt_inrs', 'avis_vt', ['conclusion', 'Conclusion']] },

  { id: 'bras_aspiration', titre: 'Bras d’aspiration (bras orientables articulés)', regles: [
    ['Vitesse de captage recherchée', 'Imposée par la condition de dispersion choisie : émission sans vitesse initiale en air calme 0,25 m/s ; faible vitesse en air modérément calme 0,5 ; génération active en zone agitée 1 ; grande vitesse initiale 2,5 ; gaz et vapeurs : saisie du technicien.', LISTE + ' (LISTBOX_BOA_1_6)'],
    ['Surface de la bouche', 'Circulaire π × (D / 200)² ; ovale π × (l / 200) × (L / 200) ; autre : surface saisie.', RAPSO],
    ['Débit calculé', 'Surface × vitesse moyenne × 3 600, arrondi à l’unité.', RAPSO],
    ['Distance maximale de captage x', 'Formules INRS du captage ponctuel, Q en m³/s, A = surface : sans collerette Q = Vc (10x² + A) ; avec collerette Q = 0,75 Vc (10x² + A) ; reposant sur un plan : 5x² au lieu de 10x². Donc x = √((Q / (f × Vc) − A) / n), en cm, arrondi.', RAPSO],
    ['« Sans collerette reposant sur un plan »', 'Formule par analogie : aucun cas réel dans les classeurs fournis.', APPLI],
    ['Conclusion', 'Satisfaisant si distance d’utilisation < distance maximale (strictement). Recyclage = Oui : toujours Non satisfaisant.', RAPSO],
    ['Évolution', '(débit − débit précédent) / débit précédent × 100.', RAPSO]
  ], exemple: { conditions_dispersion: 'Emission à faible vitesse en air modérément calme', type_bouche: 'Avec collerette', forme_bouche: 'Circulaire', diametre_bouche: '15', vitesse_moyenne: '8.4', distance_utilisation: '20', recyclage: 'Non', debit_precedent: '560' },
  sorties: ['vitesse_captage', 'surface_bouche', 'debit_calcule', 'distance_max_captage', 'conclusion_distance', 'evolution_pct'] },

  { id: 'cabines_peinture', titre: 'Cabines de peinture', regles: [
    ['Vitesse moyenne de la grille', 'Moyenne des points de mesure.', RAPSO],
    ['Avis vitesses (V1 et V2 si ajoutée)', 'Mesure ≥ 0,8 × référence ; référence « / » : mesure ≥ valeur recommandée saisie (norme NF EN 16985, guides INRS ED 835 / ED 928).', RAPSO],
    ['Avis débit', 'Débit ≥ 0,8 × référence ; sans référence : « Sans objet ».', RAPSO],
    ['Conclusion', 'Le moins favorable des avis ; vitesse saisie mais débit non mesuré : Impossible de se prononcer.', RAPSO]
  ], exemple: { vitesse_nb_axes: '2', vitesse_nb_points: '3', vitesse_grid: [['0.42', '0.38', '0.40'], ['0.36', '0.41', '0.39']], v1_mesuree: '0.39', v1_reference: '/', v1_valeur_recommandee: '0.3', debit_mesure: '28000', debit_reference: '30000' },
  sorties: ['vitesse_moyenne_grille', ['v1_avis', 'Avis vitesse V1'], ['debit_avis', 'Avis débit'], ['conclusion', 'Conclusion']] },

  { id: 'installations_diverses', titre: 'Installations diverses (captages)', regles: [
    ['Vitesse au point d’émission', 'Avis : mesure ≥ 0,8 × référence ; référence « / » : mesure ≥ valeur recommandée saisie. La liste des conditions de dispersion affiche la plage INRS (0,25 à 0,5 m/s, etc.).', RAPSO + ' ; plages : ' + LISTE],
    ['Vitesse de transport', 'Mêmes règles que les hottes (table INRS ED 695).', RAPSO],
    ['Débit dans le conduit de transport', 'Surface de la section × vitesse de transport mesurée × 3 600.', RAPSO],
    ['Avis', 'Le moins favorable des avis des mesures choisies.', RAPSO]
  ], exemple: { mesures_choisies: ["Vitesse au point d'émission", 'Vitesse de transport'], vpe_mesuree: '0.45', vpe_reference: '/', vpe_inrs: '0.5', vt_type_polluant: 'Poussières industrielles moyennes', vt_mesuree: '19.5', vt_reference: '/', forme_section: 'Circulaire', diametre_cote1: '20' },
  sorties: ['avis_vpe', 'vt_inrs', 'avis_vt', 'debit_vt', 'avis'] },

  { id: 'gaz_echappement', titre: 'Captage des gaz d’échappement', regles: [
    ['Surface, débit mesuré', 'Surface de la section × vitesse (directe ou moyenne de grille) × 3 600.', RAPSO],
    ['Débit minimal calculé', '1,2 × cylindrée (L) × 0,0363 × régime (tr/min).', RAPSO],
    ['Avis', 'Satisfaisant si le débit atteint chacune des valeurs connues : 0,8 × référence, débit minimal INRS saisi, débit minimal calculé.', RAPSO]
  ], exemple: { forme_section: 'Circulaire', diametre_cote1: '10', vitesse_mode: 'Vitesse moyenne directe', vitesse: '15', debit_reference: '/', debit_min_inrs: '300', cylindree: '2', regime_moteur: '1500' },
  sorties: ['surface_m2', 'debit_mesure', 'debit_min_calcule', 'avis_constructeur'] },

  { id: 'menuiserie', titre: 'Menuiserie — réseau d’aspiration', regles: [
    ['Surface, débit', 'Surface de la section × vitesse (directe ou moyenne de grille) × 3 600.', RAPSO],
    ['Avis', 'Débit ≥ 0,8 × valeur de référence.', RAPSO]
  ], exemple: { forme_section: 'Circulaire', diametre_cote1: '40', vitesse_mode: 'Vitesse moyenne directe', vitesse: '21', valeur_reference_recommandee: '9000' },
  sorties: ['surface_m2', 'debit_annee_en_cours', 'avis_constructeur'] },

  { id: 'menuiserie_bis', titre: 'Menuiserie — machines à bois', regles: [
    ['Vitesse, débit', 'Vitesse directe ou moyenne de grille ; débit = surface × vitesse × 3 600 (2 décimales).', RAPSO],
    ['Valeurs recommandées', 'Vitesse 20 m/s ; débit selon le type de machine (table annexe A, INRS ED 750).', LISTE],
    ['Avis vitesse', 'Avec référence : vitesse ≥ 0,8 × référence. Sans référence : vitesse ≥ 20 m/s (sans le coefficient 0,8).', RAPSO + ' (vérifié sur 18 machines réelles)'],
    ['Avis débit sans référence', 'Débit ≥ valeur de la table, sans coefficient 0,8, par analogie avec la vitesse : aucun cas réel ne permet de trancher.', APPLI],
    ['Conclusion', 'Satisfaisant si vitesse et débit sont satisfaisants.', RAPSO]
  ], exemple: { type_machine: 'Scie circulaire de diamètre <315mm', forme_conduit: 'Circulaire', diametre_cote1: '12', vitesse_mode: 'Vitesse moyenne directe', vitesse_directe: '22.5', vitesse_reference: '/', debit_reference: '/' },
  sorties: ['surface_m2', 'vitesse_moyenne', 'debit', ['vitesse_avis', 'Avis vitesse'], ['debit_inrs_ed750', 'Débit recommandé INRS ED 750 (m³/h)'], ['debit_avis', 'Avis débit'], ['conclusion_avis', 'Conclusion']] },

  { id: 'box_peinture', titre: 'Box de préparation peinture', regles: [
    ['Débit de chaque captage', 'Surface de la section × vitesse × 3 600, arrondi à l’unité.', RAPSO],
    ['Débit du box, taux', 'Somme des captages ; volume par heure = débit / volume du local ; débit minimal = 50 × volume.', RAPSO],
    ['Avis renouvellement', 'Satisfaisant si strictement plus de 50 vol/h.', RAPSO],
    ['Avis', 'Le moins favorable de : ventilation naturelle (ouvertures haute et basse opposées), asservissement à la présence de l’opérateur, captage localisé, renouvellement. Une réponse manquante = Impossible de se prononcer.', RAPSO]
  ], exemple: { nombre_captage: '1', captage1_forme_conduit: 'Circulaire', captage1_diametre_cote1: '25', captage1_vitesse_mode: 'Vitesse moyenne directe', captage1_vitesse_directe: '9.5', volume_local: '30', ventilation_naturelle: 'Présence d’ouvertures haute et basse, diamétralement opposées', asservissement: 'Ventilation mécanique asservie à la présence de l’opérateur', type_ventilation: 'Le renouvellement d’air du local est assuré par un captage localisé' },
  sorties: ['captage1_surface', 'captage1_debit', 'debit_extraction_box', 'volume_par_heure', 'debit_minimal_50vh', 'conclusion_renouvellement', 'avis'] },

  { id: 'torches_aspirantes', titre: 'Torches aspirantes', regles: [
    ['Débit d’un point', 'Vitesse au centre × 0,89 × π × (D / 2 / 1 000)² × 3 600, D en mm, arrondi à l’unité.', RAPSO],
    ['Écart', '(débit − référence) / référence × 100 ; référence vide : 100 m³/h (INRS).', RAPSO],
    ['Constat d’un point', 'Satisfaisant si débit ≥ 0,8 × référence ; sinon, si la distance L est connue, vitesse au point d’émission = (débit / 3 600) / (4π (L / 1 000)²) : satisfaisant si > 0,25 m/s.', RAPSO],
    ['Total, avis', 'Somme des débits des points ; avis = le moins favorable des constats.', RAPSO]
  ], exemple: { nombre_points_mesure: '2', torche1_diametre_tube: '22', torche1_vitesse_centre: '95', torche2_diametre_tube: '22', torche2_vitesse_centre: '55', torche2_distance_l: '40' },
  sorties: [['torche1_debit', 'Point 1 — débit (m³/h)'], ['torche1_ecart_pct', 'Point 1 — écart à 100 m³/h (%)'], ['torche1_constat', 'Point 1 — constat'], ['torche2_debit', 'Point 2 — débit (m³/h)'], ['torche2_vitesse_point_emission', 'Point 2 — vitesse au point d’émission (m/s)'], ['torche2_constat', 'Point 2 — constat (rattrapé par la vitesse)'], 'total_debit', ['note_reference', 'Avis']] },

  { id: 'locaux_charge', titre: 'Locaux de charge de batteries', regles: [
    ['Débit d’une grille', 'Débit mesuré au cône s’il est saisi ; sinon surface (L × l, ou π (D / 200)²) × vitesse × 3 600.', RAPSO],
    ['Débit recommandé (guide INRS)', 'Pour chaque ligne de chargeurs : arrondi(0,055 × (I / 2) × (U × 0,4) × nombre) × 4. Somme des lignes.', RAPSO + ' (vérifié sur données réelles)'],
    ['Avis', 'Débit du local (somme des grilles) ≥ 0,8 × référence ; sans référence : ≥ débit recommandé.', RAPSO]
  ], exemple: { chargeurs: [{ nb: '4', tension: '48', courant: '60' }], grille1_largeur: '40', grille1_longueur: '30', grille1_valeur_mesuree: '2.1', grille2_debit_cone: '650', valeur_reference: '/' },
  sorties: [['grille1_debit_obtenu', 'Grille 1 — débit (m³/h)'], ['grille2_debit_obtenu', 'Grille 2 — débit au cône (m³/h)'], 'valeur_inrs', 'debit_mesure_local', 'avis'] },

  { id: 'tts', titre: 'Cuves de traitement de surface (TTS)', regles: [
    ['Surface de la cuve', 'Circulaire π D² / 4 ; rectangulaire L × W.', RAPSO],
    ['Débit calculé (guide INRS ED 651)', 'Rectangulaire : Qr = L × W × a × (W / (n × L))^b × V × 3 600. Circulaire : Qc = Sc × a × (1 / n)^b × V × 3 600. Coefficients a, b, n et vitesse V lus dans les tables INRS.', RAPSO],
    ['Débit minimal INRS', 'Sous couvercle, enveloppante, tunnel : le plus grand de So × V × 3 600 et Q / 10. Sinon Q / 10.', RAPSO],
    ['Fentes', 'Surface = nombre × longueur × largeur ; débit = surface × vitesse × 3 600 ; avis : ≥ 0,8 × référence, sinon ≥ débit minimal INRS.', RAPSO],
    ['Avis', 'Débit mesuré > Q / 10, ≥ débit minimal INRS et ≥ 0,8 × référence si elle existe.', RAPSO]
  ], exemple: { aspiration_type: 'Aspiration latérale sur cuve ouverte', forme_cuve: 'Rectangulaire', longueur_l: '1.5', largeur_l: '0.8', coef_a: '1', coef_b: '0.2', coef_n: '1', vitesse: '0.4', debit_mesure: '2100', debit_reference: '/' },
  sorties: ['surface_cuve', 'debit_calcule', 'debit_qr10', 'debit_min_inrs', 'avis'], note: 'Coefficients a, b, n et vitesse V pris pour l’exemple ; sur site, le technicien les lit dans les tables du guide ED 651.' }
];

// Types ajoutés à l'appli, absents du Rapso
const HORS_RAPSO = [
  { id: 'local_specifique', titre: 'Local à pollution spécifique (extraction / air neuf)', regles: [
    ['Débit global extrait', 'Débit des captages + extraction générale.', 'Arrêté du 8 octobre 1987, art. 4'],
    ['Avis extraction', 'Débit ≥ 0,8 × valeur de référence ; sans référence : « Sans objet ».', 'Règle du Rapso appliquée'],
    ['Taux de renouvellement', 'Débit / volume ; avis seulement si le technicien saisit un taux recommandé et sa source (aucun taux réglementaire).', 'Appli'],
    ['Débit minimal d’air neuf', 'Débit par occupant (R4222-6) × (occupants du local + occupants des locaux d’où vient l’air).', 'Code du travail R4222-11'],
    ['Avis', 'Le moins favorable des avis contrôlés.', 'Appli']
  ], exemple: { mesures_realisees: '', debit_captages: '1200', debit_extraction_generale: '800', valeur_reference_extraction: '2200', volume: '300', type_local: 'Ateliers ou Locaux avec Travail Physique Léger', effectif: '6', mode_air_neuf: '', debit_air_neuf: '300' },
  sorties: ['debit_global_extrait', 'avis_extraction', 'taux_renouvellement', 'debit_min_air_neuf', 'avis_air_neuf', 'avis'] },
  { id: 'recyclage', titre: 'Recyclage de l’air (contrôle semestriel)', regles: [
    ['Destination de l’air', 'Même local : satisfaisant ; vers un local à pollution non spécifique : non satisfaisant (R4222-9) ; autre local spécifique : selon même nature de polluant.', 'Code du travail R4222-9 et R4222-14'],
    ['Concentration retenue en gaine', 'Photomètre (DustTrak) : fraction alvéolaire = moyenne du canal RESP, fraction inhalable = moyenne du canal TOTAL (majorant), multipliées par le facteur de correction s’il y en a un (sinon 1). Gravimétrie : valeurs saisies.', 'Appli — à valider'],
    ['Concentration / 1/5 de la VLEP', 'Chaque polluant ≤ VLEP 8 h / 5 : poussières sans effet spécifique 0,8 mg/m³ (inhalable) et 0,18 mg/m³ (alvéolaire), d’après R4222-10 ; agents à effet spécifique : VLEP saisie, comparée à leur mesure ou, à défaut, à la fraction de poussières correspondante.', 'Arrêté du 8 octobre 1987, art. 4.2 b ; INRS ED 6008'],
    ['Concentration / dossier', 'Fraction inhalable ≤ valeur de référence du dossier, si elle existe.', 'Arrêté du 8 octobre 1987, art. 4.1'],
    ['Systèmes de surveillance', 'Testés et fonctionnels : satisfaisant ; un système ne réagit pas ou aucun système : non satisfaisant (R4222-16) ; non testés : impossible de se prononcer.', 'Arrêté du 8 octobre 1987, art. 4.2 b'],
    ['Perte de charge', 'Relevée ≤ maximale admissible (constructeur ou dossier), si les deux sont connues.', 'Appli'],
    ['Conditions recommandées', 'Recyclage seulement en période de chauffage ou de climatisation, dérivation vers l’extérieur, polluants tous identifiés : avis à part, hors avis réglementaire.', 'INRS ED 6008'],
    ['Atmosphère (si mesurée)', 'Poussières sans effet spécifique : inhalable ≤ 4 mg/m³, alvéolaire ≤ 0,9 mg/m³ ; sinon ≤ VLEP saisie. Mesure sur 8 h exigée.', 'Code du travail R4222-10 et R4222-14'],
    ['Avis', 'Le moins favorable de : destination, concentration (1/5 VLEP et dossier), surveillance, état de l’épurateur, perte de charge, information médecin / CSE (R4222-17), air neuf et atmosphère s’ils sont relevés. Prochain contrôle : + 6 mois.', 'Code du travail ; arrêté du 8 octobre 1987']
  ], exemple: { nature_polluant: 'Poussières sans effet spécifique', destination: 'Dans le même local', methode_mesure: 'Photomètre à lecture directe (DustTrak)', dt_total: '0,30', dt_resp: '0,12', dt_facteur: '1,5', surveillance_test: 'Testés : alarme ou signal déclenché', etat_epurateur: 'Bon état', information_medecin_cse: 'Oui', date_controle: '15/09/2026' },
  sorties: ['conc_inhalable_gaine', 'conc_alveolaire_gaine', 'avis_cinquieme', 'avis_surveillance', 'avis', 'prochain_controle'] },
  { id: 'decapage', titre: 'Décapage, grenaillage au jet libre', regles: [
    ['Débit minimal d’une cabine', 'Section × 400 m³/h par m² (flux vertical, section = L × l) ou × 1 000 (flux horizontal, section = l × H).', 'INRS ED 768'],
    ['Grande cabine (H ≥ 7 m ou L ≥ 15 m)', 'Taux de renouvellement > 80 vol/h (> 120 pour les opérations très polluantes).', 'INRS ED 768'],
    ['Caisson à manchons, conduit', 'Vitesse dans les ouvertures ≥ 3 m/s ; vitesse dans le conduit ≥ 20 m/s.', 'INRS ED 768']
  ] },
  { id: 'fluide_coupe', titre: 'Machines-outils (fluides de coupe)', regles: [
    ['Captage', 'Aucun captage : non satisfaisant (R4222-12). Dépression dans le capot ≥ 20 Pa.', 'INRS ED 972'],
    ['Traitement', 'Rejet extérieur : satisfaisant ; épurateur rejetant dans l’atelier : non satisfaisant ; recyclage : ≤ 0,1 mg/m³ en aval.', 'INRS ED 972'],
    ['Atmosphère', 'Brouillard visible : non satisfaisant ; concentration (8 h) ≤ 0,5 mg/m³.', 'INRS ED 972']
  ] },
  { id: 'poste_solvant', titre: 'Poste manuel aux solvants', regles: [
    ['Vitesse recommandée', 'Enceinte (ouvertures ≤ 10 cm) 0,5 m/s ; enceinte (> 10 cm) 0,65 ; table aspirante 0,5 et aucun point sous 0,4 ; bac à fentes 0,25 au point le plus éloigné.', 'INRS ED 6049'],
    ['Avis', 'Le moins favorable de la vitesse, du débit (0,8 × référence) et du test fumigène.', 'INRS ED 6049']
  ] }
];

// ————————————————————————————————————————————
// Calcul des exemples par le code de l'appli
// ————————————————————————————————————————————
function libelle(typeId, key) {
  const t = ctx.getInstallationType(typeId);
  const f = t && t.fields.find(x => x.key === key);
  if (f) return f.label;
  const m = /^(torche|grille|captage)(\d+)_(.+)$/.exec(key);
  if (m) {
    const g = t && t.fields.find(x => x.key === m[1] + '1_' + m[3]);
    const nom = { torche: 'Point', grille: 'Grille', captage: 'Captage' }[m[1]];
    return nom + ' ' + m[2] + ' — ' + (g ? g.label : m[3]);
  }
  return key;
}

function valeurTexte(v) {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) {
    if (v.length && Array.isArray(v[0])) return v.map(r => r.map(x => String(x).replace('.', ',')).join(' ; ')).join(' / ');
    if (v.length && typeof v[0] === 'object') return v.map(c => c.nb + ' × ' + c.tension + ' V, ' + c.courant + ' A').join(' ; ');
    return v.join(', ');
  }
  return ctx.frDisplay ? ctx.frDisplay(v) : String(v).replace('.', ',');
}

function exemple(typeId, data, sorties) {
  const inst = { data: JSON.parse(JSON.stringify(data)) };
  ctx.applyCalculations(typeId, inst);
  return {
    entrees: Object.keys(data).filter(k => data[k] !== '').map(k => [libelle(typeId, k), valeurTexte(data[k])]),
    resultats: sorties.map(k => Array.isArray(k) ? [k[1], valeurTexte(inst.data[k[0]])] : [libelle(typeId, k), valeurTexte(inst.data[k])])
  };
}

// ————————————————————————————————————————————
// Mise en page pdfmake
// ————————————————————————————————————————————
const th = t => ({ text: t, bold: true, color: 'white', fillColor: BLEU, fontSize: 8.5, margin: [3, 3, 3, 3] });
const td = (t, o) => Object.assign({ text: t, fontSize: 8.5, margin: [3, 2.5, 3, 2.5] }, o || {});
const grille = { hLineColor: () => '#B7D7F0', vLineColor: () => '#B7D7F0', hLineWidth: () => 0.6, vLineWidth: () => 0.6 };
const aValider = o => /à valider/.test(o);

function tableRegles(regles) {
  return { table: { headerRows: 1, widths: [110, '*', 120], dontBreakRows: true,
    body: [[th('Grandeur'), th('Calcul ou règle'), th('Origine')]].concat(regles.map(r => {
      const fill = aValider(r[2]) ? ORANGE_PALE : null;
      return [td(r[0], { bold: true, fillColor: fill }), td(r[1], { fillColor: fill }), td(r[2], { color: GRIS, fillColor: fill })];
    })) }, layout: grille, margin: [0, 0, 0, 8] };
}

function tableExemple(ex) {
  const col = (titre, rows) => ({ width: '*', stack: [
    { text: titre, bold: true, fontSize: 8.5, color: BLEU, margin: [0, 0, 0, 3] },
    { table: { widths: ['*', 90], body: rows.map(r => [td(r[0]), td(r[1], { alignment: 'right', bold: titre === 'Résultats de l’appli' })]) }, layout: grille }
  ] });
  return { columns: [col('Données saisies', ex.entrees), col('Résultats de l’appli', ex.resultats)], columnGap: 12, margin: [0, 0, 0, 6] };
}

function sectionType(t, num, horsRapso) {
  const out = [{ text: num + '. ' + t.titre, style: 'h2', pageBreak: 'before', tocItem: true }];
  out.push(tableRegles(t.regles));
  if (t.exemple) {
    out.push({ text: 'Exemple calculé par l’appli', style: 'h3' });
    out.push(tableExemple(exemple(t.id, t.exemple, t.sorties)));
    if (t.note) out.push({ text: t.note, fontSize: 8, italics: true, color: GRIS });
  }
  return out;
}

// Non-régression face au Rapso : relancée à chaque génération si le cache des classeurs est présent
function bilanRapso() {
  const script = path.join(APP, 'outils/non-regression-rapso/compare.js');
  if (!fs.existsSync(path.join(APP, 'outils/non-regression-rapso/rows'))) return null;
  const sortie = cp.execFileSync(process.execPath, [script], { cwd: APP, encoding: 'utf8', maxBuffer: 1 << 26 });
  const NOMS = { 'autres locaux': 'Bureaux', sanitaires: 'Sanitaires', TAB_CTA: 'CTA', Extracteur: 'Extracteurs', TAB_SORBONNE: 'Sorbonnes', TAB_HOTTE: 'Hottes',
    BOA: 'Bras d’aspiration', TAB_CDP: 'Cabines de peinture', TAB_EQUIP: 'Installations diverses', TAB_ECHAP: 'Gaz d’échappement',
    TAB_MENUISERIE_MAB: 'Machines à bois', TAB_BOX_PREPA_PEINTURE: 'Box peinture', TAB_LOCAUX_CHARGE: 'Locaux de charge' };
  const par = {};
  sortie.split('\n').forEach(l => {
    const m = /^. (.+?) › .+? : (\d+) ok, (\d+) écarts/.exec(l);
    if (!m) return;
    const k = NOMS[m[1]] || m[1];
    par[k] = par[k] || [0, 0];
    par[k][0] += +m[2]; par[k][1] += +m[3];
  });
  return par;
}

const EXPLICATIONS_ECARTS = [
  ['Sanitaires (29)', 'Tous dans un même classeur où les avis ont été forcés à la main, incohérents avec les saisies.'],
  ['Bras d’aspiration (7)', 'Fiches incomplètes dans le classeur source (bouche non renseignée) : le Rapso conclut, l’appli répond « Impossible de se prononcer ».'],
  ['Cabines de peinture (2)', 'Ancien classeur V27, dont la règle « débit non mesuré » diffère du V29.'],
  ['Hottes (2), machines à bois (2), gaz d’échappement (1), box (1)', 'Fiche incomplète, valeur INRS effacée à la main, « / » au lieu de vide, libellé de conclusion différent.']
];

function construire() {
  const date = new Date().toLocaleDateString('fr-FR');
  const content = [];
  content.push({ text: 'Calculs de l’appli Aération', style: 'titre' });
  content.push({ text: 'Dossier de validation pour la direction technique', fontSize: 13, color: GRIS, margin: [0, 0, 0, 14] });
  content.push({ text: 'Version de l’appli ' + ctx.APP_VERSION + ' — document généré le ' + date + ' à partir du code de calcul de l’appli.', fontSize: 9, color: GRIS, margin: [0, 0, 0, 14] });
  content.push({ text: 'Comment lire ce document', style: 'h3' });
  content.push({ ul: [
    'Chaque type d’installation a un tableau « grandeur, calcul, origine ». L’origine indique si la règle reprend le Rapso V29 (code VBA ou listes du classeur), un texte (Code du travail, guide INRS) ou un ajout de l’appli.',
    { text: [{ text: 'Les lignes sur fond orangé', bold: true }, ' sont des règles propres à l’appli ou qui s’écartent du Rapso : ce sont elles qu’il faut valider. Elles sont reprises au chapitre « Points soumis à validation ».'] },
    'Les exemples ne sont pas écrits à la main : ils sont recalculés par le code de l’appli à chaque génération du document, exactement comme sur la tablette.',
    'Le chapitre « Comparaison au Rapso » donne le résultat de la vérification automatique sur des classeurs Rapso réels remplis.'
  ], fontSize: 9, margin: [0, 0, 0, 10] });
  content.push({ toc: { title: { text: 'Sommaire', style: 'h3' }, textStyle: { fontSize: 9 } } });

  // 1. Principes
  content.push({ text: '1. Principes communs à toutes les installations', style: 'h2', pageBreak: 'before', tocItem: true });
  content.push(tableRegles(PRINCIPES));

  // 2. Comparaison au Rapso
  const bilan = bilanRapso();
  content.push({ text: '2. Comparaison au Rapso sur des classeurs réels', style: 'h2', tocItem: true, pageBreak: 'before' });
  if (bilan) {
    const tot = Object.values(bilan).reduce((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]);
    content.push({ text: 'Chaque ligne des classeurs Rapso remplis disponibles (11 classeurs V27 et V29) est ressaisie dans l’appli ; les valeurs calculées par l’appli sont comparées à celles calculées par le Rapso. Résultat : ' + tot[0].toLocaleString('fr-FR') + ' valeurs identiques, ' + tot[1] + ' écarts, tous expliqués ci-dessous.', fontSize: 9, margin: [0, 0, 0, 6] });
    content.push({ table: { headerRows: 1, widths: ['*', 90, 90], body: [[th('Installation'), th('Valeurs identiques'), th('Écarts')]].concat(
      Object.keys(bilan).map(k => [td(k), td(bilan[k][0].toLocaleString('fr-FR'), { alignment: 'right' }), td(String(bilan[k][1]), { alignment: 'right' })])) }, layout: grille, margin: [0, 0, 0, 8] });
    content.push({ text: 'Explication des écarts', style: 'h3' });
    content.push({ table: { widths: [150, '*'], body: EXPLICATIONS_ECARTS.map(r => [td(r[0], { bold: true }), td(r[1])]) }, layout: grille, margin: [0, 0, 0, 6] });
    content.push({ text: 'Non couverts faute de classeur rempli : menuiserie (réseau), torches aspirantes, TTS, locaux fumeurs, ERP. Leurs formules viennent du code VBA mais n’ont pas pu être comparées à un résultat réel du Rapso.', fontSize: 9, italics: true, color: GRIS });
  } else {
    content.push({ text: 'Classeurs de comparaison absents sur ce poste : chapitre non généré.', fontSize: 9, italics: true });
  }

  // 3+. Types du Rapso
  TYPES.forEach((t, i) => content.push.apply(content, sectionType(t, i + 3)));

  // Types hors Rapso
  const n0 = TYPES.length + 3;
  content.push({ text: n0 + '. Types ajoutés par l’appli, absents du Rapso', style: 'h2', pageBreak: 'before', tocItem: true });
  content.push({ text: 'Ces cinq types n’existent pas dans le Rapso. Leurs critères sont tirés de textes cités (Code du travail, arrêté du 8 octobre 1987, guides INRS). Leur maintien dans l’appli est en attente de décision.', fontSize: 9, margin: [0, 0, 0, 8], fillColor: ORANGE_PALE });
  HORS_RAPSO.forEach(t => {
    content.push({ text: t.titre, style: 'h3' });
    content.push(tableRegles(t.regles));
    if (t.exemple) content.push(tableExemple(exemple(t.id, t.exemple, t.sorties)));
  });

  // Points soumis à validation
  content.push({ text: (n0 + 1) + '. Points soumis à validation', style: 'h2', pageBreak: 'before', tocItem: true });
  content.push({ text: 'Règles propres à l’appli ou qui s’écartent du Rapso, à confirmer ou à corriger :', fontSize: 9, margin: [0, 0, 0, 6] });
  const points = [];
  TYPES.forEach(t => t.regles.forEach(r => { if (aValider(r[2])) points.push([t.titre, r[0], r[1]]); }));
  points.push(['Sorbonnes', 'Seuil de 0,4 m/s pour toutes les sorbonnes', 'Le guide INRS ED 795 ne le prévoit que pour les sorbonnes d’avant 2005 ; l’appli suit le Rapso (0,4 pour toutes, modifiable) par décision du 03/10/2026.']);
  points.push(['Tous types', 'Cinq types hors Rapso', 'Local à pollution spécifique, recyclage, fluides de coupe, poste solvants, décapage : à garder ou à retirer.']);
  content.push({ table: { headerRows: 1, widths: [100, 120, '*'], body: [[th('Installation'), th('Règle'), th('Détail')]].concat(points.map(p => [td(p[0], { bold: true }), td(p[1]), td(p[2])])) }, layout: grille });

  // Annexe A : tables
  content.push({ text: 'Annexe A. Tables de référence utilisées', style: 'h2', pageBreak: 'before', tocItem: true });
  content.push({ text: 'Type de local (bureaux, ERP) — Code du travail R4222-6, feuille du Rapso (ligne hébergement collectif : ajout de l’appli)', style: 'h3' });
  content.push({ table: { headerRows: 1, widths: ['*', 100, 110], body: [[th('Type de local'), th('Volume / occupant (m³)'), th('Débit / occupant (m³/h)')]].concat(
    Object.keys(ctx.LOCAL_LPNS).map(k => [td(k), td(ctx.LOCAL_LPNS[k].vol === null ? '—' : String(ctx.LOCAL_LPNS[k].vol), { alignment: 'right' }), td(ctx.LOCAL_LPNS[k].debit === null ? '—' : String(ctx.LOCAL_LPNS[k].debit), { alignment: 'right' })])) }, layout: grille, margin: [0, 0, 0, 8] });
  content.push({ text: 'Machines à bois — débit recommandé (INRS ED 750, feuille LISTE du Rapso)', style: 'h3' });
  content.push({ table: { headerRows: 1, widths: ['*', 100], body: [[th('Machine'), th('Débit (m³/h)')]].concat(
    Object.keys(ctx.MACHINE_BOIS_DEBIT_REF).map(k => [td(k), td(ctx.MACHINE_BOIS_DEBIT_REF[k] === null ? '/' : String(ctx.MACHINE_BOIS_DEBIT_REF[k]), { alignment: 'right' })])) }, layout: grille, margin: [0, 0, 0, 8] });
  content.push({ text: 'Conditions de dispersion du polluant (feuille LISTE du Rapso)', style: 'h3' });
  content.push({ table: { headerRows: 1, widths: ['*', 110, 110], body: [[th('Condition'), th('Bras : vitesse imposée'), th('Installations diverses')]].concat(
    Object.keys(ctx.BOA_VITESSE_CAPTAGE).map(k => [td(k), td(ctx.BOA_VITESSE_CAPTAGE_TEXTE[k]), td(ctx.EQUIP_VITESSE_EMISSION[k] || '—')])) }, layout: grille });

  return {
    pageSize: 'A4', pageMargins: [36, 40, 36, 40],
    defaultStyle: { font: 'Arial', fontSize: 9, lineHeight: 1.15 },
    styles: { titre: { fontSize: 22, bold: true, color: BLEU, margin: [0, 120, 0, 4] }, h2: { fontSize: 13, bold: true, color: BLEU, margin: [0, 0, 0, 8] }, h3: { fontSize: 10, bold: true, margin: [0, 6, 0, 4] } },
    footer: (page, pages) => ({ text: 'Calculs de l’appli Aération — v' + ctx.APP_VERSION + ' — page ' + page + ' / ' + pages, alignment: 'center', fontSize: 7.5, color: GRIS, margin: [0, 12, 0, 0] }),
    content
  };
}

(async () => {
  const dd = construire();
  const buf = await pdfBuffer(ctx.pdfMake.createPdf(dd));
  const dossier = path.join(APP, 'Documents DT');
  if (!fs.existsSync(dossier)) fs.mkdirSync(dossier);
  const sortie = path.join(dossier, 'Calculs de l’appli Aération.pdf');
  fs.writeFileSync(sortie, buf);
  console.log('✓ ' + path.relative(APP, sortie) + ' (' + Math.round(buf.length / 1024) + ' Ko)');
  if (process.argv.includes('--exemples')) {
    TYPES.concat(HORS_RAPSO).filter(t => t.exemple).forEach(t => {
      const ex = exemple(t.id, t.exemple, t.sorties);
      console.log('\n' + t.id + '\n  ' + ex.resultats.map(r => r[0] + ' = ' + r[1]).join('\n  '));
    });
  }
})().catch(e => { console.error(e); process.exit(1); });
