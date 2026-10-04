# Appli Contrôle Aération — notice de reprise

Pour la personne qui maintiendra l'appli. Elle décrit comment l'appli est construite, comment la tester,
et comment la faire évoluer sans casser les rapports.

## En bref

- Application web installable sur téléphone (PWA), en JavaScript sans framework ni étape de compilation.
  Les fichiers du dépôt sont servis tels quels.
- Fonctionne hors ligne : `sw.js` met en cache l'appli au premier chargement.
- Les données restent sur l'appareil du technicien (navigateur). Rien n'est envoyé sur un serveur.
- Le rapport PDF est produit dans le navigateur avec pdfmake (`js/export-pdf.js`), au format du Rapso
  (outil Excel/VBA d'origine, dont les modules VBA exportés sont dans `rapso_modules/`).

Lancer en local, depuis ce dossier :

```bash
python -m http.server 8129
```

puis ouvrir `http://localhost:8129`.

## Avant chaque livraison

```bash
node outils/tests/run.js
```

37 tests, environ 10 secondes, code de sortie 1 au moindre échec. Ils chargent les scripts dans l'ordre
d'`index.html`, sans navigateur, et vérifient la mission de démonstration, le rapport PDF, le compte rendu,
l'export Excel, le relevé de valeurs de référence, les contrôles, la fusion, le plan du site, les schémas
de réseau, les documents joints, les étiquettes QR, les objectifs avant mesure, et les calculs face au Rapso.
Un test vérifie aussi que `APP_VERSION`, `CACHE_NAME` (sw.js) et la première entrée des Nouveautés
concordent, et que chaque script d'`index.html` est dans le pré-cache de `sw.js` : un oubli de version
empêcherait les téléphones de voir la mise à jour.

Puis, pour publier une nouvelle version aux techniciens :

1. Incrémenter `CACHE_NAME` dans `sw.js` (sinon les téléphones gardent l'ancienne version).
2. Ajouter tout nouveau fichier à la liste de pré-cache de `sw.js` et à `index.html`.
3. Incrémenter `APP_VERSION` et ajouter une entrée en tête de `NOUVEAUTES` dans `js/adoption.js` :
   les techniciens la verront sur l'accueil après la mise à jour.
4. Si un critère ou un texte a changé, mettre à jour la liste et la date de relecture dans `js/a-propos.js`.

Si un changement modifie volontairement la mission de démonstration ou un résultat de calcul, mettre à
jour les valeurs attendues dans `outils/tests/run.js` dans le même commit, en expliquant pourquoi.

## Non-régression face au Rapso

`outils/non-regression-rapso/` rejoue les lignes de vrais classeurs Rapso remplis dans nos calculs et
compare aux valeurs calculées par Excel.

```bash
node outils/non-regression-rapso/dump.js
```

```bash
node outils/non-regression-rapso/compare.js
```

`dump.js` lit les `.xlsb` de `rapso-exemples-remplis/` et produit un cache `rows/`. Ces deux dossiers
contiennent des données clients : ils sont exclus de git (`.gitignore`) et ne doivent jamais être poussés.
Au 3 octobre 2026 : 12 rubriques en écart, toutes expliquées (saisie incohérente dans un classeur source,
ancienne version V27, fiches incomplètes). Le test automatique échoue s'il y en a davantage.

## Organisation du code

Ordre de chargement : celui des balises `<script>` d'`index.html`. Les fonctions sont globales.
Les bibliothèques lourdes (pdfmake, polices, SheetJS, pdf.js) ne sont pas dans `index.html` : toute fonction
qui les utilise passe d'abord par `ensureLib()` (`js/lazy-libs.js`). Elles restent dans le pré-cache de `sw.js`.
pdf.js (lecture des PDF joints) est appelé avec `isEvalSupported: false` et en rendu « print » : un PDF reçu
d'un tiers ne peut pas exécuter de code, et la conversion ne dépend pas de l'affichage de l'écran.

| Fichier | Rôle |
|---|---|
| `state.js` | État de l'appli, sauvegarde locale, migrations au chargement (`normalizeMission`), préremplissage N-1 |
| `installations-schema.js` | Les types d'installation et leurs champs (`INSTALLATION_TYPES`) |
| `calculations.js` | Formules par type (`CALC_RULES`), appliquées par `applyCalculations` |
| `wizard-steps.js` | Découpage de chaque type en étapes de saisie (`WIZARD_STEPS`) |
| `wizard-engine.js`, `wizard-grid.js`, `wizard-sanitaires.js` | Écrans de saisie en étapes |
| `installations.js` | Écran mission, rendu générique des champs, enregistrement d'une saisie |
| `site-overview.js` | Vue d'ensemble (statuts, regroupements) |
| `missions.js`, `selection-installations.js`, `profil-technicien.js` | Accueil, infos mission, sélection des types, profil |
| `report-shared.js` | Sections du rapport (`SECTION_GROUPS`), colonnes de la synthèse (`SYNTHESE_CONFIG`) |
| `export-pdf.js` | Mise en page du rapport, une fonction par fiche (`PDF_ANNEXES_FIDELES`) |
| `controles.js` | Valeurs inhabituelles, cohérence des dates et des avis |
| `terrain-assist.js` | Phrases types, écarts N-1, « Vérifier avant de partir », appareils de mesure |
| `ergonomie.js` | Affichage des résultats, avis en direct, enchaînement des fiches, Bilan, thème sombre |
| `dvr.js` | Relevé pour le dossier de valeurs de référence |
| `locaux-specifiques.js` | Types « Local à pollution spécifique » et « Recyclage de l'air » (module autonome) |
| `captages-inrs.js` | Types décapage au jet libre (ED 768), fluides de coupe (ED 972), postes aux solvants (ED 6049) |
| `pictos.js` | Un pictogramme par type d'installation (chargé après tous les modules de types) |
| `sorties.js` | Compte rendu signé, envoi du PDF, export Excel |
| `fusion.js` | Fusion des missions de deux techniciens |
| `import-export.js`, `rapso-import.js` | Transfert JSON, mission de démonstration, import de classeurs Rapso |
| `photos.js`, `auto-backup.js`, `storage-indicator.js` | Photos (IndexedDB), sauvegarde automatique, espace utilisé |
| `adoption.js`, `guide-utilisation.js`, `ed-reference.js` | Nouveautés, visite guidée, guide, aide-mémoire des guides INRS |
| `a-propos.js` | Écran « À propos » : version et liste des textes, normes et guides appliqués (à tenir à jour) |
| `lazy-libs.js` | Chargement à la demande de pdfmake, des polices et de SheetJS (`ensureLib('pdf')`, `ensureLib('xlsx')`) |
| `plans.js` | Plan du site : épingles des installations, page 4.2 du rapport |
| `documents-joints.js` | Documents du client (images, PDF convertis en images), liste 3.3 et annexe ; export, import et assainissement des images jointes (`docsNormaliser`) |
| `schemas.js` | Schéma de réseau : éléments, gaines, piquages, sens de l'air déduit du ventilateur (`schemaOrientation`), page 4.3 |
| `creation-rapide.js` | Créer une installation depuis le schéma ou le plan |
| `seuils.js` | Objectif affiché avant une mesure, déduit des formules (`CALC_RULES`) en essayant des valeurs |
| `qr.js` | Étiquettes QR (planche PDF), scanner intégré, ouverture par l'adresse `?qr=CODE` |
| `annotation.js` | Annotation des photos (original conservé) |
| `plaque.js` | Photo de la plaque signalétique d'un équipement |

## Données

- Missions : `localStorage`, clé `aeration_missions_v1` (tableau de missions).
  Une mission contient `installations[typeId] = [{ id, data }]`.
- Photos : IndexedDB `aeration_photos_v1`. La mission ne garde qu'une référence `[{ id }]`.
  Les photos sont intégrées en base64 seulement dans les fichiers exportés.
- Les clés de `data` qui commencent par `_` sont des méta-données, jamais des champs de rapport :
  `_step`, `_mod` (écran, fusion), `_plan` (épingle sur le plan), `_qr` (code de l'étiquette),
  `_plaque` (photo de la plaque). `_plan`, `_qr` et `_plaque` sont repris à la visite suivante ;
  « Dupliquer » ne recopie jamais les clés `_`.
- Une photo annotée garde l'original sous `photo[i].orig` et les tracés sous `photo[i].annot`.
- Au niveau de la mission : `plans`, `documentsJoints`, `schemas` (identifiants d'installation dans
  `instIds` / `elements[].inst`, remis à jour à la visite suivante). Dans un fichier exporté, les images
  des documents, des fonds de schéma et des plaques sont dans `imagesJointes` (identifiant -> base64).
- Tout identifiant réutilisé dans un `onclick` est validé à l'import (`docsNormaliser`, `qrNormaliser`) :
  un fichier .json reçu d'un tiers ne doit pas pouvoir injecter de code.
- Une sauvegarde illisible n'est jamais écrasée : elle est mise de côté sous `aeration_missions_v1_illisible_<date>`.

## Faire évoluer

### Modifier un calcul

1. Modifier la règle dans `CALC_RULES` (`calculations.js`). `decimals` fixe l'arrondi d'affichage ;
   utiliser `exactOr(x, d, clé)` pour enchaîner les calculs en pleine précision.
2. Lancer `compare.js` puis `run.js`.
3. Si des dossiers déjà saisis doivent être recalculés, ajouter une migration dans `normalizeMission`.

### Ajouter un type d'installation

Le plus simple est de suivre `js/locaux-specifiques.js`, qui déclare tout au même endroit :
schéma, étapes, formules, section et intercalaire du rapport, colonnes de la synthèse, référentiel,
lignes du relevé de valeurs de référence, et fiche PDF. Ajouter ensuite le fichier à `index.html`
et `sw.js`, puis des tests dans `outils/tests/run.js`.

### Ajouter une valeur limite ou un critère réglementaire

- Ne jamais coder un seuil sans texte vérifié : citer l'article dans un commentaire et dans la fiche PDF.
- Les textes évoluent : par exemple, les seuils de poussières de l'article R4222-10 sont passés à
  4 et 0,9 mg/m³ le 1er juillet 2023.
- Sans règle écrite, laisser un constat du technicien plutôt qu'un avis automatique.

## Règles à respecter

- **Impartialité** : l'appli constate et compare à des références. Elle ne recommande ni entreprise ni produit.
  Dans le relevé de valeurs de référence, une valeur mesurée non satisfaisante n'est jamais proposée comme
  référence (test automatique).
- **Saisie terrain** : champs numériques en `type="text" inputmode="decimal"` (jamais `type="number"`, qui
  n'affiche pas « 15,9 ») ; lire les nombres avec `num()`, qui accepte la virgule ; dates au format jj/mm/aaaa.
- **Options de listes** : elles utilisent l'apostrophe typographique ( ’ ). L'import Rapso les recale
  (`rapsoSnapToOptions`) ; un nouvel import doit faire de même.
- **Données clients** : jamais dans git (classeurs, PDF de rapports, caches). La mission de démonstration
  est fictive et anonymisée.

## Points ouverts

Voir la fiche « Points à arbitrer par la direction technique ». Les principaux :
seuil des sorbonnes, règle des 80 %, envoi direct via le Microsoft 365 SOCOTEC (à valider par la DSI),
stockage des données, filtres de rechange et humidificateur des CTA,
et 5 types d'installation dont l'import Rapso n'a jamais été vérifié sur un vrai classeur
(menuiserie réseau, torches, traitement de surface, locaux fumeurs, ERP).
Réglé : sanitaires à usage individuel à 15 m³/h (R4212-6), appliqué depuis la version 1.45.

Fonctions testées sans vrai téléphone (gestes simulés) : tracé du schéma et annotation au doigt, scanner
QR intégré (Chrome Android uniquement ; ailleurs, appareil photo ou saisie de la référence), envoi vers
Outlook par le partage du téléphone.
