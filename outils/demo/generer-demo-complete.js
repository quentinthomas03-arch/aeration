// Génère la démo complète (assets/demo/mission-demo-complete.json) à partir de la démo de base
// (assets/demo/mission-demo.json, gardée telle quelle pour les tests automatiques) — 2026-10-06.
//   node outils/demo/generer-demo-complete.js
//
// Site FICTIF « INDUSTRIE EXEMPLE » : toutes les données ajoutées sont inventées (aucune donnée client).
// Objectif : montrer toute l'appli — les 23 types d'installations, des niveaux, une série de bureaux,
// des mesures bouche par bouche au cône, un double flux déséquilibré, des sanitaires individuels et
// collectifs, un local spécifique en extraction seule avec taux de renouvellement, une installation non
// contrôlée, des marques « à revoir », des notes de visite, des installations à faire et en cours.
// Les avis sont calculés par l'appli elle-même (applyCalculations), jamais écrits à la main.

const fs = require('fs'), path = require('path');
// Chargeur de l'appli commun aux outils (même code que le navigateur, sans navigateur)
const { APP, loadApp, initPdfAssets } = require('../charger-appli');

const ctx = loadApp();
const base = JSON.parse(fs.readFileSync(path.join(APP, 'assets/demo/mission-demo.json'), 'utf8'));
const m = JSON.parse(JSON.stringify(base.mission));
ctx.normalizeMission(m);
ctx.state.missions = [m]; ctx.state.currentMissionId = m.id;

let seq = 2000;
const nid = () => ++seq;
const A = 'Bâtiment A - Administratif', B = 'Bâtiment B - Production', C = 'Bâtiment C - Laboratoire',
  D = 'Bâtiment D - Finition', E = 'Bâtiment E - Maintenance', F = 'Bâtiment F - Menuiserie', G = 'Bâtiment G - Accueil et restaurant';

// Position sur le plan : autour des installations déjà placées du même bâtiment
const centres = {};
Object.keys(m.installations).forEach(t => (m.installations[t] || []).forEach(i => {
  const p = i.data._plan, b = i.data.batiment; if (!p || !b) return;
  (centres[b] = centres[b] || []).push(p);
}));
let jit = 0;
function placer(data) {
  const pts = centres[data.batiment]; if (!pts || !pts.length) return;
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  jit++;
  const a = jit * 2.4, r = 0.025 + (jit % 4) * 0.012;
  data._plan = { id: pts[0].id, x: Math.min(0.97, Math.max(0.03, +(cx + Math.cos(a) * r).toFixed(4))), y: Math.min(0.97, Math.max(0.03, +(cy + Math.sin(a) * r).toFixed(4))) };
}

function ajouter(typeId, data, opts) {
  opts = opts || {};
  const inst = { id: nid(), data: Object.assign({}, data) };
  if (opts.plan !== false) placer(inst.data);
  ctx.applyCalculations(typeId, inst);
  (m.installations[typeId] = m.installations[typeId] || []).push(inst);
  return inst;
}
function cloner(typeId, idx, modifs) {
  const src = JSON.parse(JSON.stringify(m.installations[typeId][idx].data));
  delete src._plan; delete src._qr; delete src.photo; delete src._plaque;
  return ajouter(typeId, Object.assign(src, modifs));
}
const date = '15/09/2026';

// ——— Niveaux sur les installations existantes ———
const niveaux = { 'Bureau administration': 'R+1', 'Salle de réunion': 'R+1', 'Réfectoire': 'RDC', 'Toilettes administration': 'RDC',
  'Laboratoire contrôle qualité': 'R+1', 'Sorbonne SO-01': 'R+1', 'Sorbonne SO-02': 'R+1', 'CTA-02 Laboratoire': 'Toiture' };
Object.keys(m.installations).forEach(t => (m.installations[t] || []).forEach(i => {
  const n = niveaux[i.data.reference_local || i.data.reference_equipement || i.data.repere];
  if (n) i.data.niveau = n;
}));

// ——— Bureaux : série au R+1 du bâtiment A (mesures au cône pour certains) ———
const serie = [
  ['Bureau 101', 2, 38, 'Extraction', 70], ['Bureau 102', 3, 42, 'Extraction', 52], ['Bureau 103', 1, 30, 'Extraction', 45],
  ['Bureau 104', 4, 55, 'Extraction', 95], ['Bureau 105', 2, 36, 'Extraction', 110], ['Bureau 106', 6, 48, 'Extraction', 90],
  ['Bureau 107', 2, 40, 'Nat avec ouvrants', null], ['Bureau 108', 3, 39, 'Nat avec ouvrants', null]
];
serie.forEach(([nom, eff, vol, vent, deb], i) => {
  const d = { batiment: A, niveau: 'R+1', reference_local: nom, type_local: 'Bureaux', effectif: String(eff), volume: String(vol), type_ventilation: vent, etat_bouches: 'En bon état' };
  if (vent === 'Extraction') {
    d.ouvrant_exterieur = 'Oui'; d.nombre_bouches = '2';
    if (i < 3) { // mesure bouche par bouche au cône K75 (coefficient 50)
      const v1 = deb / 2 / 50, v2 = deb / 2 / 50;
      d._bouchesMode = 'cone'; d._coneK = '50'; d._bouches = { debit_total_mesure: [String(+v1.toFixed(2)).replace('.', ','), String(+v2.toFixed(2)).replace('.', ',')] };
    }
    d.debit_total_mesure = String(deb);
  }
  ajouter('bureaux', d);
});
// Open space en double flux, soufflage et extraction déséquilibrés (alerte technique)
ajouter('bureaux', { batiment: A, niveau: 'R+2', reference_local: 'Open space R+2', type_local: 'Bureaux', effectif: '12', volume: '260', type_ventilation: 'Double flux',
  ouvrant_exterieur: 'Non', entree_air_exterieur: 'Non', debit_soufflage: '600', debit_extraction: '380', pourcentage_air_neuf: '100', nombre_bouches: '8', etat_bouches: 'En bon état',
  commentaire: 'Extraction nettement inférieure au soufflage : réglage du réseau à vérifier.' });
// Bureau à revoir (mesure douteuse) et bureau à faire
const aRevoir = ajouter('bureaux', { batiment: A, niveau: 'R+2', reference_local: 'Bureau direction', type_local: 'Bureaux', effectif: '1', volume: '45', type_ventilation: 'Extraction',
  ouvrant_exterieur: 'Oui', debit_total_mesure: '18', nombre_bouches: '1', etat_bouches: 'A réparer', commentaire: 'Bouche partiellement obstruée par un meuble.' });
aRevoir.data._aRevoir = true;
ajouter('bureaux', { batiment: A, niveau: 'R+2', reference_local: 'Salle de formation' });

// ——— Sanitaires : individuel isolé, bloc collectif, douches ———
ajouter('sanitaires', { batiment: A, niveau: 'R+1', repere: 'WC PMR direction', nom_usage: 'sanitaires Homme-PMR', chambre_erp_individuelle: 'Non', wc_urinoirs: '1', douches: '0', lavabos: '1',
  individuel_collectif: 'Individuel', debit_mesure: '22', nombre_bouches: '1', etat_bouches: 'En bon état', observation: 'Local privatif (bureau de direction).' });
ajouter('sanitaires', { batiment: A, niveau: 'R+1', repere: 'Bloc sanitaires R+1', nom_usage: 'sanitaires', chambre_erp_individuelle: 'Non', wc_urinoirs: '4', douches: '0', lavabos: '3',
  individuel_collectif: 'Collectif', debit_mesure: '128', nombre_bouches: '4', etat_bouches: 'En bon état', observation: 'RAS.' });
ajouter('sanitaires', { batiment: B, repere: 'Douches atelier', nom_usage: 'Douche Homme', chambre_erp_individuelle: 'Non', wc_urinoirs: '0', douches: '3', lavabos: '2',
  individuel_collectif: 'Collectif', debit_mesure: '62', nombre_bouches: '2', etat_bouches: 'A nettoyer', observation: 'Débit insuffisant pour 3 douches ; bouches encrassées.' });

// ——— ERP (bâtiment G) ———
ajouter('erp', { batiment: G, niveau: 'RDC', reference_local: 'Hall d’accueil', type_local: 'Locaux de Restauration, Vente ou Réunion', volume: '420', travailleur: '3', public: '15',
  type_ventilation: 'Soufflage', ouvrant_exterieur: 'Non', entree_air_exterieur: 'Oui', debit_total_mesure: '720', pourcentage_air_neuf: '100', nombre_bouches: '6', etat_bouches: 'En bon état', commentaire: 'RAS.' });
ajouter('erp', { batiment: G, niveau: 'RDC', reference_local: 'Restaurant d’entreprise', type_local: 'Locaux de Restauration, Vente ou Réunion', volume: '650', travailleur: '6', public: '80',
  type_ventilation: 'Double flux', ouvrant_exterieur: 'Oui', debit_soufflage: '1900', debit_extraction: '2100', pourcentage_air_neuf: '100', nombre_bouches: '12', etat_bouches: 'En bon état',
  commentaire: 'Soufflage et extraction équilibrés ; volume suffisant pour l’effectif de travailleurs.' });

// ——— Local fumeurs (bâtiment G) ———
const S = 'Satisfaisant', N = 'Non Satisfaisant';
ajouter('locaux_fumeurs', { batiment: G, niveau: 'RDC', localisation: 'Cour intérieure', reference_equipement: 'Fumoir du personnel', date_controle: date,
  critere_local_clos: S, critere_aucune_prestation: S, critere_entretien_apres_renouvellement: S, critere_pas_lieu_passage: S, critere_fermetures_auto: N,
  largeur: '3', longueur: '4', hauteur: '2,6', surface_etablissement: '1800',
  critere_ventilation_mecanique: S, critere_rejet_exterieur: S, critere_rejet_distance_passage: S, critere_rejet_distance_prises_air: S,
  debit_extraction: '420', critere_reprise_totale: S, critere_ventilation_independante: S, critere_depression: S,
  critere_attestation_installateur: S, critere_attestation_disponible: S, critere_entretien_regulier: S, critere_consultation_chsct: S,
  critere_panneau_zone_fumeur: S, critere_panneau_interdiction: S, observation: 'Ferme-porte automatique hors service.' });

// ——— Menuiserie (réseau d'aspiration, bâtiment F) ———
ajouter('menuiserie', { batiment: F, localisation: 'Atelier menuiserie', reference_equipement: 'Réseau d’aspiration principal (scie, raboteuse, toupie)', nb_machines_reliees: '6', date_controle: date,
  simultaneites: '3 machines au plus en fonctionnement simultané', reseau_forme: ['En épi'], presence_trappes: 'Oui', ouverture_trappes: 'Manuelle', entree_air_additionnelle: 'Non', reseau_debit: 'Fixe',
  afficher_depoussiereur: 'Oui', type_filtre: 'Manches', position: 'Extérieur', etat_filtre: 'Bon état', perte_charge: '850',
  mesure_localisation: 'Dans le conduit', forme_section: 'Circulaire', diametre_cote1: '35', vitesse_mode: 'Vitesse moyenne directe', vitesse: '21', temperature_conduit: '18', pression_statique: '-900',
  valeur_reference_recommandee: '7500', debit_annee_n1: '7200', observation: 'RAS.' });

// ——— Torches aspirantes (bâtiment E) ———
ajouter('torches_aspirantes', { activite_reference_local: 'Soudure de maintenance – atelier E', batiment: E, date_controle: date, reference_equipement: 'Torches aspirantes TA-01 à TA-03',
  nombre_points_mesure: '3', total_debit_n1: '190', commentaire: 'Torche n°3 : débit faible, tube d’aspiration à vérifier.',
  torche1_point_mesure: 'TA-01', torche1_diametre_tube: '24', torche1_vitesse_centre: '42', torche1_valeur_reference: '60', torche1_distance_l: '20',
  torche2_point_mesure: 'TA-02', torche2_diametre_tube: '24', torche2_vitesse_centre: '40', torche2_valeur_reference: '60', torche2_distance_l: '20',
  torche3_point_mesure: 'TA-03', torche3_diametre_tube: '24', torche3_vitesse_centre: '18', torche3_valeur_reference: '60', torche3_distance_l: '60' });

// ——— Traitement de surface (bâtiment D) ———
ajouter('tts', { activite_reference_local: 'Ligne de dégraissage alcalin', batiment: D, date_mesure: date, reference_equipement: 'Cuve de dégraissage TS-01',
  aspiration_type: 'Aspiration latérale sur cuve ouverte', mesure_mode: ['Mesure dans les ouvertures'], etat_visuel_aspiration: ['En bon état'], test_fumigene: 'Fumée bien captée par les fentes',
  procede_famille: 'Dégraissage', procede_type: 'Alcalin', procede_constituants: 'Soude, tensioactifs', procede_conditions: '60 °C', procede_niveau_vitesse: 'Moyen',
  type_ventilation: 'Extraction unilatérale', type_cuve: 'Cuve avec dosseret ou appuyée contre un mur', forme_cuve: 'Rectangulaire', coef_a: '0,5', coef_b: '0,25', coef_n: '1',
  longueur_l: '1,6', largeur_l: '0,8', surface_ouvertures: '0,16', vitesse: '8', debit_mesure_n1: '4600', debit_mesure: '4500', debit_reference: '/',
  nb_fentes: '2', longueur_fente: '160', largeur_fente: '5', vitesse_fentes: '7,5', debit_reference_fentes: '/', observation: 'RAS.' });

// ——— Captages INRS : décapage, fluides de coupe, postes aux solvants ———
ajouter('decapage', { batiment: D, reference_equipement: 'Cabine de grenaillage CG-01', date_controle: date, type_installation: 'Cabine de décapage au jet libre (opérateur à l’intérieur)',
  deplacement_air: 'Déplacement vertical de l’air (du plafond vers le sol)', longueur: '6', largeur: '4', hauteur: '4', debit_extrait: '10000', etat_depoussiereur: 'Bon état', observation: 'RAS.' });
ajouter('fluide_coupe', { batiment: B, reference_equipement: 'Centre d’usinage CU-02', date_controle: date, type_captage: 'Captage enveloppant (machine capotée)', depression_capot: '30',
  debit_mesure: '600', debit_reference: '/', traitement: 'Rejet à l’extérieur', brouillard: 'Aucun brouillard visible', observation: 'RAS.' });
ajouter('fluide_coupe', { batiment: B, reference_equipement: 'Tour numérique TN-01', date_controle: date, type_captage: 'Captage enveloppant (machine capotée)', depression_capot: '12',
  debit_mesure: '380', debit_reference: '/', traitement: 'Épurateur sur la machine rejetant dans l’atelier', brouillard: 'Aucun brouillard visible',
  observation: 'Dépression insuffisante au capot ; air épuré rejeté dans l’atelier.' });
ajouter('poste_solvant', { batiment: C, niveau: 'R+1', reference_equipement: 'Poste de nettoyage aux solvants PS-01', date_controle: date,
  type_dispositif: 'Enceinte ventilée (ouvertures de 10 cm au plus)', vitesse_moyenne: '0,55', observation: 'RAS.' });

// ——— Types déjà présents : quelques installations de plus, pour varier ———
cloner('cta', 0, { reference_equipement: 'CTA-03 Bureaux', batiment: A, niveau: 'Toiture', locaux_alimentes: 'Bureaux R+1 et R+2' });
cloner('extracteur', 0, { reference_equipement: 'Extracteur EX-02 local déchets', batiment: E, locaux_extraits: 'Local déchets' });
cloner('extracteur', 0, { reference_equipement: 'Extracteur EX-03 vestiaires', batiment: B, locaux_extraits: 'Vestiaires', debit_annee_en_cours: undefined });
cloner('hottes', 0, { reference_equipement: 'Cabine de meulage n°3', batiment: B });
cloner('sorbonnes', 0, { reference_equipement: 'Sorbonne SO-03', batiment: C, niveau: 'R+1' });
cloner('bras_aspiration', 0, { reference_equipement: 'Poste de soudure n°3', batiment: B });
cloner('bras_aspiration', 1, { reference_equipement: 'Poste de soudure maintenance', batiment: E });
cloner('installations_diverses', 0, { reference_equipement: 'Table aspirante de tri', batiment: B });
cloner('menuiserie_bis', 0, { batiment: F });
cloner('locaux_charge', 0, { batiment: E });
cloner('gaz_echappement', 0, { batiment: E, reference_equipement: 'Aspiration gaz d’échappement n°2' });
cloner('cabines_peinture', 0, { batiment: D, reference_equipement: 'Cabine de peinture CP-02' });
// Local spécifique en extraction seule, avec taux de renouvellement retenu et sa source
ajouter('local_specifique', { batiment: C, niveau: 'RDC', reference_local: 'Local de stockage des produits chimiques', activite: 'Stockage de solvants et de réactifs', polluant: 'Vapeurs de solvants',
  date_controle: date, mesures_realisees: 'Extraction seule', debit_extraction_generale: '650', valeur_reference_extraction: '600', volume: '60',
  taux_recommande: '10', referentiel_taux: 'Débits de conception du client (DOE)', observation: 'RAS.' });

// ——— Installation non contrôlée, notes de visite ———
const nc = cloner('hottes', 1, { reference_equipement: 'Hotte four de traitement thermique', batiment: B });
nc.data._nonControle = { motif: 'Installation à l’arrêt', precision: 'Four en maintenance le jour de la visite' };
m.notesSite = (m.notesSite ? m.notesSite + '\n' : '') + 'Badge à demander à l’accueil (bâtiment G). Accès toiture du bâtiment A par l’échelle à crinoline, clé au poste de garde.';
const cta3 = m.installations.cta[m.installations.cta.length - 1];
cta3.data._note = 'Prévoir la nacelle : CTA en toiture.';

// ——— Mission : tous les types, présentation ———
m.typesSelectionnes = ctx.INSTALLATION_TYPES.filter(t => t.implemented).map(t => t.id);
m.clientSite = m.infosClient && m.infosClient.nomEntreprise ? m.infosClient.nomEntreprise : m.clientSite;
Object.keys(m.installations).forEach(t => (m.installations[t] || []).forEach(i => ctx.applyCalculations(t, i)));

// ——— Contrôles : chaque type présent, avis calculés, rapport généré sans valeur mal formée ———
const resume = {};
let total = 0;
ctx.INSTALLATION_TYPES.forEach(t => {
  const l = m.installations[t.id] || [];
  total += l.length;
  resume[t.id] = l.map(i => ctx.installationStatus(t, i).text.replace('Terminé · ', '')).join(' | ');
  if (!l.length) throw new Error('Type sans installation : ' + t.id);
});
initPdfAssets(ctx);
const dd = ctx.pdfBuildRapportDocDefinition(m);
const mauvais = JSON.stringify(dd.content).match(/undefined|NaN/g);
if (mauvais) throw new Error('Valeurs mal formées dans le rapport : ' + mauvais.length);

const env = Object.assign({}, base, { _exportDate: new Date().toISOString(), _demo: true, mission: m });
fs.writeFileSync(path.join(APP, 'assets/demo/mission-demo-complete.json'), JSON.stringify(env));
console.log(total + ' installations, ' + ctx.INSTALLATION_TYPES.length + ' types');
Object.keys(resume).forEach(k => console.log('  ' + k.padEnd(24) + resume[k]));
