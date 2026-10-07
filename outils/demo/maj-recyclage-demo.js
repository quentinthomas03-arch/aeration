// Met la fiche « Recyclage » de la démo de base au modèle du contrôle semestriel (2026-10-07) :
// mesure au photomètre (DustTrak) en gaine, test des systèmes de surveillance, conditions de l'ED 6008.
// Données FICTIVES. Les avis sont recalculés par l'appli (applyCalculations), jamais écrits à la main.
//   node outils/demo/maj-recyclage-demo.js   puis   node outils/demo/generer-demo-complete.js
const fs = require('fs'), path = require('path');
const { APP, loadApp } = require('../charger-appli');
const ctx = loadApp();
const fichier = path.join(APP, 'assets/demo/mission-demo.json');
const env = JSON.parse(fs.readFileSync(fichier, 'utf8'));
const list = env.mission.installations.recyclage || [];
list.forEach(inst => {
  const d = inst.data;
  ['conc_gaine', 'fraction_gaine', 'surveillance_etat', 'vlep', 'polluant_precision'].forEach(k => delete d[k]);
  Object.assign(d, {
    nature_polluant: ctx.RC_AGENT, agent1_nom: 'Poussières de bois', agent1_vlep: '1', agent1_fraction: 'Inhalable',
    periode_recyclage: 'Seulement en période de chauffage ou de climatisation', derivation_exterieur: 'Oui', polluants_connus: 'Oui',
    perte_charge_max: '1500',
    systemes_surveillance: ['Pressostat / alarme de colmatage'], surveillance_test: ctx.RC_TESTS[0],
    surveillance_test_methode: 'Simulation de colmatage par obturation partielle de l’entrée du filtre',
    surveillance_etalonnage: '03/2026, mainteneur du dépoussiéreur',
    methode_mesure: ctx.RC_PHOTOMETRE, point_mesure_gaine: 'Dans la gaine de recyclage', regime_mesure: 'Procédé en production, recyclage en service',
    heure_debut: '09:10', heure_fin: '09:40',
    dt_total: '0,15', dt_pm10: '0,12', dt_resp: '0,05', dt_pm25: '0,03', dt_pm1: '0,02',
    conc_inhalable_gaine_n1: '0,12', conc_alveolaire_gaine_n1: '0,04'
  });
  ctx.applyCalculations('recyclage', inst);
  console.log(d.reference_equipement, '→', d.avis_cinquieme, '/', d.avis_surveillance, '/', d.avis);
});
fs.writeFileSync(fichier, JSON.stringify(env));
