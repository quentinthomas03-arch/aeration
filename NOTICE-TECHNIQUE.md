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

27 tests, environ 10 secondes, code de sortie 1 au moindre échec. Ils chargent les scripts dans l'ordre
d'`index.html`, sans navigateur, et vérifient la mission de démonstration, le rapport PDF, le compte rendu,
l'export Excel, le relevé de valeurs de référence, les contrôles, la fusion, et les calculs face au Rapso.

Puis, pour publier une nouvelle version aux techniciens :

1. Incrémenter `CACHE_NAME` dans `sw.js` (sinon les téléphones gardent l'ancienne version).
2. Ajouter tout nouveau fichier à la liste de pré-cache de `sw.js` et à `index.html`.
3. Incrémenter `APP_VERSION` et ajouter une entrée en tête de `NOUVEAUTES` dans `js/adoption.js` :
   les techniciens la verront sur l'accueil après la mise à jour.

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

## Données

- Missions : `localStorage`, clé `aeration_missions_v1` (tableau de missions).
  Une mission contient `installations[typeId] = [{ id, data }]`.
- Photos : IndexedDB `aeration_photos_v1`. La mission ne garde qu'une référence `[{ id }]`.
  Les photos sont intégrées en base64 seulement dans les fichiers exportés.
- Les clés de `data` qui commencent par `_` sont des méta-données d'écran (`_step`, `_mod`), jamais des
  champs de rapport.
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
seuil des sorbonnes, règle des 80 %, envoi direct du rapport, stockage des données,
et 5 types d'installation dont l'import Rapso n'a jamais été vérifié sur un vrai classeur
(menuiserie réseau, torches, traitement de surface, locaux fumeurs, ERP).
