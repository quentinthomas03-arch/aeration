// report-shared.js - Configuration et helpers partagés par l'export PDF (js/export-pdf.js)
// Extrait de l'ancien export-word.js lors du retrait du Word (2026-09) : ce fichier ne contient que
// de la donnée/config pure (chemins d'assets, regroupement des annexes, formatage), aucun rendu.

var LOGO_PATH = 'assets/logo-socotec.jpg';
var BANNER_PATH = 'assets/report/banner-rapport.jpg';
var CTA_SCHEMA_PATH = 'assets/report/cta-schema.jpg'; // schéma "CTA type" fixe, extrait du PDF de référence
var CROSSTAB_GROUP_SIZE = 5; // nombre d'installations par page de tableau croisé (comme le PDF de référence)

// Les 18 types se regroupent en 9 sections d'annexes (5.1 à 5.9, comme dans le PDF de référence) —
// plusieurs types partagent une même page de garde de section (photo + bandeau pivoté).
// sommaireTitre : intitulé exact du sommaire (5.1 à 5.9), relevé sur le PDF de référence — distinct
// du "titre" affiché sur le bandeau pivoté de la page de garde de section, dont le libellé diffère
// (ex. "Vérification des centrales de traitement de l’air" sur le bandeau vs "5.3 CENTRALES DE
// TRAITEMENT DE L’AIR" au sommaire).
var SECTION_GROUPS = [
  { key: 'non_specifique', titre: 'Locaux à Pollution Spécifique / Non Spécifique', sommaireTitre: 'LOCAUX A POLLUTION NON SPECIFIQUE : BUREAUX, SALLES DE REUNION', types: ['bureaux', 'erp'], images: ['assets/report/divider-bureaux-1.jpg', 'assets/report/divider-bureaux-2.jpg'] },
  { key: 'sanitaires', titre: 'Sanitaires', sommaireTitre: 'SANITAIRES', types: ['sanitaires'], images: ['assets/report/divider-sanitaires.png'] },
  { key: 'cta', titre: 'Vérification des centrales de traitement de l’air', sommaireTitre: 'CENTRALES DE TRAITEMENT DE L’AIR', types: ['cta'], images: ['assets/report/divider-cta.jpg'] },
  { key: 'extracteur', titre: 'Vérification des extracteurs', sommaireTitre: 'EXTRACTEURS', types: ['extracteur'], images: ['assets/report/divider-extracteur.jpg'] },
  { key: 'sorbonnes', titre: 'Vérification des sorbonnes', sommaireTitre: 'SORBONNES', types: ['sorbonnes'], images: ['assets/report/divider-sorbonnes.png'] },
  { key: 'hottes', titre: 'Vérification des hottes et dosserets aspirants', sommaireTitre: 'HOTTES ET DOSSERETS ASPIRANTS', types: ['hottes'], images: ['assets/report/divider-hottes.png'] },
  { key: 'bras_aspiration', titre: 'Vérification des bras articulés', sommaireTitre: 'BRAS ARTICULES', types: ['bras_aspiration'], images: ['assets/report/divider-bras-aspiration.png'] },
  { key: 'captage_localise', titre: 'Vérification des équipements', sommaireTitre: 'INSTALLATIONS AVEC CAPTAGE LOCALISE', types: ['installations_diverses', 'gaz_echappement', 'menuiserie', 'menuiserie_bis', 'box_peinture', 'torches_aspirantes', 'tts', 'cabines_peinture', 'locaux_fumeurs'], images: ['assets/report/divider-installations-diverses.png'] },
  { key: 'locaux_charge', titre: 'Vérification des locaux de charge d’accumulateurs', sommaireTitre: 'LOCAUX DE CHARGE D’ACCUMULATEURS', types: ['locaux_charge'], images: ['assets/report/divider-locaux-charge-1.jpg', 'assets/report/divider-locaux-charge-2.jpg'] }
];
function sectionGroupForType(typeId) {
  for (var i = 0; i < SECTION_GROUPS.length; i++) {
    if (SECTION_GROUPS[i].types.indexOf(typeId) !== -1) return SECTION_GROUPS[i];
  }
  return null;
}

// Configuration de la "Synthèse du contrôle" (4.) par type d'installation, reconstituée depuis
// Conclusion.bas + CONSTANTE.bas (constantes Libelle_Conclusion_X_Y) du VBA d'origine.
// col1 = Bâtiment (ou Référence pour Menuiserie machines à bois), col2/col3 = colonnes d'identification
// complémentaires (facultatives selon le type), avis = champ «avis global» le plus représentatif
// disponible dans notre schéma, commentaire = champ commentaire/observation associé.
// Hottes -> 'conclusion' (pire des avis vitesse au point d'émission / vitesse de transport, cf.
// conclusionHotte() dans calculations.js) ; Torches aspirantes -> 'note_reference' (pire des constats
// des points de mesure renseignés, cf. calculations.js).
var SYNTHESE_CONFIG = {
  bureaux: { titre: 'Conclusion sur les contrôles des locaux à pollution non spécifique', col1: 'batiment', col1Label: 'Bâtiment', col2: 'type_local', col2Label: 'Type de local', col3: 'reference_local', col3Label: 'Nom du local', avis: 'avis', commentaire: 'commentaire' },
  sanitaires: { titre: 'Conclusion sur les sanitaires', col1: 'batiment', col1Label: 'Bâtiment', col2: 'repere', col2Label: 'Repère', col3: 'nom_usage', col3Label: 'Nom d’usage', avis: 'avis', commentaire: 'observation' },
  locaux_fumeurs: { titre: 'Conclusion sur les locaux fumeurs', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence de l’équipement', avis: 'avis_csp', commentaire: 'observation' },
  cta: { titre: 'Conclusion sur les CTA', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Réf. équipement et/ou implantation', avis: 'avis', commentaire: 'observation' },
  extracteur: { titre: 'Conclusion sur les extracteurs', col1: 'batiment', col1Label: 'Bâtiment', col2: 'locaux_extraits', col2Label: 'Réf. équipement et/ou implantation', avis: 'avis_constructeur', commentaire: 'observation' },
  erp: { titre: 'Conclusion sur les contrôles des locaux à pollution non spécifique dans un établissement recevant du public', col1: 'batiment', col1Label: 'Bâtiment', col2: 'type_local', col2Label: 'Type de local', avis: 'avis', commentaire: 'commentaire' },
  sorbonnes: { titre: 'Conclusion sur les Sorbonnes', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'vitesse_min_avis_norme', commentaire: 'commentaire' },
  hottes: { titre: 'Conclusion sur les hottes et dosserets aspirants', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'conclusion', commentaire: 'observation' },
  bras_aspiration: { titre: 'Conclusion sur les Bras Orientables Articulés', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence équipement', avis: 'conclusion_distance', commentaire: 'commentaire_1' },
  cabines_peinture: { titre: 'Conclusion sur les cabines de peinture', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Référence de l’équipement', col3: 'type_cabine', col3Label: 'Type de cabine', avis: 'conclusion', commentaire: 'observations' },
  installations_diverses: { titre: 'Conclusion sur les équipements divers', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Activité et référence du local', avis: 'avis', commentaire: 'observation' },
  gaz_echappement: { titre: 'Conclusion sur les captages de gaz d’échappement', col1: 'batiment', col1Label: 'Bâtiment', col2: 'atelier', col2Label: 'Atelier', col3: 'reference_equipement', col3Label: 'Réf. équipement et/ou implantation', avis: 'avis_constructeur', commentaire: 'observation' },
  menuiserie: { titre: 'Conclusion sur le débit global d’air extrait', col1: 'batiment', col1Label: 'Bâtiment', avis: 'avis_constructeur', commentaire: 'observation' },
  menuiserie_bis: { titre: 'Conclusion sur les machines à bois', col1: 'reference_machine', col1Label: 'Référence de la machine à bois', col2: 'type_machine', col2Label: 'Type de machine à bois', avis: 'conclusion_avis', commentaire: 'observation' },
  box_peinture: { titre: 'Conclusion sur les box de préparation de peinture', col1: 'batiment', col1Label: 'Bâtiment', col2: 'activite_reference_local', col2Label: 'Activité et référence du local', avis: 'avis', commentaire: 'observation' },
  torches_aspirantes: { titre: 'Conclusion sur les torches aspirantes', col1: 'batiment', col1Label: 'Bâtiment', col2: 'reference_equipement', col2Label: 'Réf. équipement', avis: 'note_reference', commentaire: 'commentaire' },
  locaux_charge: { titre: 'Conclusion sur les locaux de charge d’accumulateurs', col1: 'batiment', col1Label: 'Bâtiment', col2: 'localisation', col2Label: 'Réf. équipement', avis: 'avis', commentaire: 'observation' },
  tts: { titre: 'Conclusion sur les vérifications des traitements de surface', col1: 'batiment', col1Label: 'Bâtiment', col2: 'activite_reference_local', col2Label: 'Réf. équipement', avis: 'avis', commentaire: 'observation' }
};

// Types d'installations repris dans la phrase "Locaux à pollution spécifique" de la Description
// générale des locaux (2.1). Le VBA d'origine (Presentation_De_La_Mission.bas) excluait Bureaux, CTA,
// Extracteur et ERP de cette liste (locaux "à pollution non spécifique") — cohérent. Mais il oubliait
// aussi Menuiserie machines à bois, Torches aspirantes, Locaux de charge et TTS, ajoutés plus tard dans
// l'outil sans jamais avoir été raccordés à cette phrase (dette technique, confirmé avec Quentin le
// 09/07/2026 : comportement corrigé ici plutôt que reproduit à l'identique).
var TYPES_POLLUTION_NON_SPECIFIQUE = ['bureaux', 'cta', 'extracteur', 'erp'];

// Les champs de type grille/liste (points de mesure bruts) ne s'affichent pas tels quels dans le
// tableau croisé (comme dans le PDF d'origine, où seules les valeurs calculées apparaissent) —
// seules les valeurs simples (texte, nombre, sélection, case à cocher) sont affichées.
function formatCrosstabValue(val) {
  if (val === undefined || val === null || val === '') return '-';
  if (Array.isArray(val)) {
    if (val.length === 0) return '-';
    // grille (tableau de tableaux) : pas de représentation utile en colonne -> masquée
    if (Array.isArray(val[0])) return '-';
    return val.join(', ');
  }
  return String(val);
}

// Arrondi d'affichage uniquement (la valeur calculée en mémoire garde sa pleine précision pour les
// avis en aval) : le PDF de référence affiche les débits d'air (m³/h) sans décimale — cf. tableaux
// CTA/Extracteur du classeur VBA d'origine (Débit année en cours, Débit N-1).
function formatCrosstabDebit(val) {
  if (val === undefined || val === null || val === '') return '-';
  var n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? formatCrosstabValue(val) : String(Math.round(n));
}

console.log('✓ Configuration rapport (partagée) chargée');
