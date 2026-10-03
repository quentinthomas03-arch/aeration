// Correspondances utilisées par compare.js, par feuille Rapso : colonnes de MESURE -> nos clés (input,
// prepare) et colonnes CALCULÉES par le Rapso -> nos champs calculés (compare). Les colonnes
// structurelles viennent de RAPSO_FIELD_MAP (js/rapso-import.js), qui n'importe jamais les mesures.
const splitList = v => v.split(';').map(x => x.trim()).filter(Boolean);
function fillGrid(list, rows, cols) {
  const vals = String(list || '').split(';'); const g = [];
  for (let r = 0; r < rows; r++) { g[r] = []; for (let c = 0; c < cols; c++) g[r][c] = (vals[r * cols + c] || '').trim(); }
  return g;
}
const lst = (row, col, l) => String(row[col(l)] || '').split(';').slice(1);
module.exports = {
  TAB_LOCAUX_CHARGE: {
    prepare(d, row, col) {
      const nb = lst(row, col, 'Nombre de chargeurs'), u = lst(row, col, 'Tension de sortie (V)'), i = lst(row, col, 'Courant de sortie (A)');
      d.chargeurs = nb.map((n, k) => ({ nb: n.trim(), tension: (u[k] || '').trim(), courant: (i[k] || '').trim() })).filter(c => c.nb);
      const L = lst(row, col, 'Largeur (cm)'), Lo = lst(row, col, 'Longueur (cm)'), D = lst(row, col, 'Diametre (cm)'), V = lst(row, col, 'Valeur mesurée (m/s)');
      for (let k = 0; k < 10; k++) {
        if (!(V[k] || '').trim()) continue;
        const p = 'grille' + (k + 1);
        d[p + '_largeur'] = (L[k] || '').trim(); d[p + '_longueur'] = (Lo[k] || '').trim(); d[p + '_diametre'] = (D[k] || '').trim(); d[p + '_valeur_mesuree'] = V[k].trim();
      }
    },
    compare: [['Valeur recommandée par le guide INRS', 'valeur_inrs', 'num'], ['Débit mesuré du local', 'debit_mesure_local', 'num'],
      ['Avis par rapport aux valeurs de référence', 'avis']],
    show: (r, c, d) => `[ch=${JSON.stringify(d.chargeurs)} ref=${d.valeur_reference}]`
  },
  TAB_ECHAP: {
    input: [['Vitesse (en m/s)_1', 'vitesse']],
    prepare(d) { d.vitesse_mode = 'Vitesse moyenne directe'; },
    compare: [['Surface (m²)_1', 'surface_m2', 'num'], ['Débit mesuré (en m³/h)_1', 'debit_mesure', 'num'],
      ['Débit minimum calculé (en m³/h)_1', 'debit_min_calcule', 'num'], ['Avis par rapport aux données constructeurs_1', 'avis_constructeur']],
    show: (r, c, d) => `[${d.forme_section} ${d.diametre_cote1} v=${d.vitesse} ref=${d.debit_reference} inrs=${d.debit_min_inrs} V=${d.cylindree} n=${d.regime_moteur}]`
  },
  TAB_MENUISERIE_MAB: {
    input: [['Vitesse moyenne (m/s)', 'vitesse_directe'], ['Type de conduit_1', 'forme_conduit'], ['Diamètre (cm)_2', 'diametre_cote1']],
    prepare(d) { d.vitesse_mode = 'Vitesse moyenne directe'; },
    compare: [["Valeur recommandée par l'INRS(ED 750)_1", 'vitesse_inrs_ed750', 'num'], ['Avis_1', 'vitesse_avis'],
      ['Débit (m3/h)', 'debit', 'num'], ["Valeur recommandée par l'INRS(ED 750)_2", 'debit_inrs_ed750', 'num'], ['Avis_2', 'debit_avis'],
      ['Avis par rapport aux valeurs de référence', 'conclusion_avis']],
    show: (r, c, d) => `[mach=${d.type_machine} v=${d.vitesse_directe} d=${d.diametre_cote1} ref=${d.vitesse_reference}/${d.debit_reference} etat=${JSON.stringify(d.etat_visuel_reseau)}]`
  },
  TAB_BOX_PREPA_PEINTURE: {
    prepare(d, row, col) {
      const g = l => String(row[col(l)] || '').trim();
      d.captage1_forme_conduit = g('Type de conduit_1');
      if (d.captage1_forme_conduit === 'Rectangulaire') { d.captage1_diametre_cote1 = g('Largeur (cm)_1'); d.captage1_cote2 = g('Longueur (cm)_1'); }
      d.captage1_vitesse_mode = 'Vitesse moyenne directe'; d.captage1_vitesse_directe = g('Vitesse moyenne_1');
    },
    compare: [['Débit mesuré_1', 'captage1_debit', 'num'], ["Débit d'extraction du box (m3/h)", 'debit_extraction_box', 'num'],
      ['Volume par heure', 'volume_par_heure', 'num'], ['Conclusion', 'conclusion_renouvellement'],
      ['Débit minimal (m3/h) pour 50 volumes/heure', 'debit_minimal_50vh', 'num'], ['Avis par rapport aux valeurs de référence', 'avis']],
    show: (r, c, d) => `[vn=${d.ventilation_naturelle} as=${d.asservissement} tv=${d.type_ventilation} vol=${d.volume_local}]`
  },
  TAB_CDP: {
    prepare(d, row, col) {
      const g = l => { try { return String(row[col(l)] || '').trim(); } catch (e) { return ''; } };
      const pick = (a, b) => g(a) || g(b);
      d.v1_mesuree = pick('Valeur mesurée_1', 'Valeur mesurée_3');
      d.v1_reference = pick('Valeur de référence_1', 'Valeur de référence_3');
      d.v1_valeur_recommandee = pick('Valeur recommandées par_1', 'Valeur recommandées par_3');
      d.v2_mesuree = pick('Valeur mesurée_2', 'Valeur mesurée_4');
      d.v2_reference = pick('Valeur de référence_2', 'Valeur de référence_4');
      d.v2_valeur_recommandee = pick('Valeur recommandées par_2', 'Valeur recommandées par_4');
      d.v2_active = d.v2_mesuree ? 'Oui' : 'Non';
      d.debit_mesure = g('Valeur mesurée (m3/h)_1');
      d.debit_reference = g('Valeur de référence_5');
      d._avis1 = pick('Avis par rapport aux valeurs de référence_1', 'Avis par rapport aux valeurs de référence_3');
      d._avis2 = pick('Avis par rapport aux valeurs de référence_2', 'Avis par rapport aux valeurs de référence_4');
      d.etat_visuel_cabine = /satisfaisant/i.test(g('Etat visuel de la cabine')) ? 'Satisfaisant' : (g('Etat visuel de la cabine') ? 'Non Satisfaisant' : '');
    },
    compare: [
      ['Avis_1', 'debit_avis'],
      ['Avis par rapport à la réglementation et/ou aux préconisations', 'conclusion']
    ],
    extra: [['_avis1', 'v1_avis'], ['_avis2', 'v2_avis']],
    show: (r, c, d) => `[v1=${d.v1_mesuree}/${d.v1_reference}/${d.v1_valeur_recommandee} a1=${d._avis1}→${d.v1_avis} v2=${d.v2_mesuree}/${d.v2_valeur_recommandee} a2=${d._avis2}→${d.v2_avis} deb=${d.debit_mesure} vis=${d.etat_visuel_cabine} filt=${d.etat_filtres} flux=${d.direction_flux||''}]`
  },
  TAB_CTA: {
    input: [['Vitesse (m/s)_1', 'neuf_vitesse'], ['Vitesse (m/s)_2', 'souf_vitesse'], ['Vitesse (m/s)_3', 'rep_vitesse']],
    compare: [
      ['Surface (m²)_1 (Réelle)', 'neuf_surface', 'num'], ['Débit année en cours (m3/h)_1 (Réel)', 'neuf_debit', 'num'],
      ['Surface (m²)_2 (Réelle)', 'souf_surface', 'num'], ['Débit année en cours (m3/h)_2 (Réel)', 'souf_debit', 'num'],
      ['Débit année en cours (m3/h)_3', 'rep_debit', 'num']
    ],
    show: (r, c, d) => `[neuf=${d.neuf_forme} ${d.neuf_diametre_cote1}x${d.neuf_cote2} v=${d.neuf_vitesse} | souf=${d.souf_forme} ${d.souf_diametre_cote1}x${d.souf_cote2} v=${d.souf_vitesse}]`
  },
  TAB_SORBONNE: {
    prepare(d, row, col) {
      const l = parseFloat(String(d.largeur_mm).replace(',', '.'));
      const n = l <= 610 ? 2 : l <= 1010 ? 3 : l <= 1410 ? 4 : l <= 1810 ? 5 : l <= 2210 ? 6 : 7;
      const pts = []; for (let i = 1; i <= 21; i++) { try { pts.push(String(row[col('Point ' + i)] || '').trim()); } catch (e) { break; } }
      d.grille = [0, 1, 2].map(r => pts.slice(r * n, r * n + n));
    },
    compare: [
      ["Surface de l'ouverture", 'surface_ouverture', 'num'],
      ['Valeur mesurées_1', 'vitesse_min_mesuree', 'num'], ['Valeur mesurées_2', 'vitesse_moy_mesuree', 'num'],
      ['Valeur mesurées_3', 'debit_mesure', 'num'],
      ['Valeurs norme_1', 'vitesse_min_norme_valeur'],
      ['par rapport aux valeurs de référence_1', 'vitesse_min_avis_reference'], ['par rapport aux valeurs normatives_1', 'vitesse_min_avis_norme'],
      ['par rapport aux valeurs de référence_2', 'vitesse_moy_avis_reference'], ['par rapport aux valeurs de référence_3', 'debit_avis_reference']
    ],
    show: (r, c, d) => `[annee=${d.annee_construction} l=${d.largeur_mm} grid=${JSON.stringify(d.grille)} glob=${r[c('Avis par rapport aux valeurs réglementaires')]}]`
  },
  TAB_HOTTE: {
    input: [['Mesurées choisis', 'mesures_choisies', splitList], ['Valeur recommandée', 'vt_mesuree']],
    prepare(d, row, col) {
      d.vpe_grid = fillGrid(row[col('Valeur mesurée pour chaque points')], parseInt(d.vpe_nb_points_hauteur) || 0, parseInt(d.vpe_nb_points_largeur) || 0);
    },
    compare: [
      ['Vitesse minimale (m/s)', 'vpe_min', 'num'], ['Vitesse moyenne (m/s)', 'vpe_moyenne', 'num'],
      ["Débit d'air extrait (m3/h)", 'vpe_debit', 'num'],
      ['Avis par rapport aux valeurs de référence_1', 'avis_vpe_min'], ['Avis par rapport aux valeurs de référence_2', 'avis_vpe_moy'],
      ['Avis par rapport aux valeurs de référence_3', 'avis_vt'], ['Avis par rapport aux valeurs de référence_4', 'conclusion']
    ],
    show: (r, c, d) => `[mes=${JSON.stringify(d.mesures_choisies)} grid=${JSON.stringify(d.vpe_grid)} ref=${d.vpe_min_reference}/${d.vpe_moy_reference} inrs=${d.vpe_min_inrs}/${d.vpe_moy_inrs} vt=${d.vt_mesuree||''} pol=${d.vt_type_polluant||''} op=${d.operateur_hors_volume||''}]`
  },
  Extracteur: {
    input: [['Vitesse (m/s)', 'vitesse'], ['Débit année N-1 (m3/h)', 'debit_annee_n1']],
    prepare(d) { d.vitesse_mode = 'Vitesse moyenne directe'; },
    compare: [
      ['Surface (m²)_1 (Réelle)', 'surface_m2', 'num'],
      ['Débit année en cours (m3/h)', 'debit_annee_en_cours', 'num'],
      ['Avis par rapport aux données constructeurs', 'avis_constructeur']
    ],
    show: (r, c, d) => `[forme=${d.forme_section} d1=${d.diametre_cote1} c2=${d.cote2} v=${d.vitesse} ref=${d.valeur_reference_recommandee||''}]`
  },
  BOA: {
    input: [['Vitesse moyenne mesurée en m/s', 'vitesse_moyenne'], ['Condition de Polluant_2', 'vitesse_captage'],
      ['Absence recyclage', 'recyclage'], ['Etat visuel', 'etat_visuel'], ['Etat des conduits aérauliques', 'etat_conduits'],
      ['Débit mesuré précédemment en m3/h', 'debit_precedent']],
    prepare(d) {
      if (d.diametre_bouche) d.forme_bouche = 'Circulaire';
      else if (d.largeur_bouche_ovale) d.forme_bouche = 'Ovale';
      else if (d.surface_bouche_autre) d.forme_bouche = 'Autre (surface connue)';
    },
    compare: [
      ['Débit calculé en m3/h', 'debit_calcule', 'num'],
      ['Distance maximun de captage_1', 'distance_max_captage', 'num'],
      ['Conclusion', 'conclusion_distance']
    ],
    show: (r, c, d) => `[bouche=${d.type_bouche}/${d.forme_bouche} db=${d.diametre_bouche||''} ov=${d.largeur_bouche_ovale||''}x${d.longueur_bouche_ovale||''} dc=${d.diametre_conduit} pt=${d.localisation_point_mesure} v=${d.vitesse_moyenne} vc=${d.vitesse_captage} du=${d.distance_utilisation} rec=${d.recyclage} adapt=${d.adapte_situation}]`
  },
  TAB_EQUIP: {
    input: [['Mesures réalisées : ', 'mesures_choisies', v => v.split(';').map(x => x.trim()).filter(Boolean)],
      ['Valeur mesurée_1', 'vpe_mesuree'], ['Valeur mesurée_2', 'vt_mesuree']],
    compare: [
      ['Avis par rapport aux valeurs de référence_1', 'avis_vpe'],
      ["Valeur recommandée par l'INRS(ED695)_2", 'vt_inrs'],
      ['Avis par rapport aux valeurs de référence_2', 'avis_vt'],
      ['Avis par rapport aux valeurs de référence_4', 'avis']
    ],
    show: (r, c, d) => `[mes=${JSON.stringify(d.mesures_choisies)} vpe=${d.vpe_mesuree||''} ref=${d.vpe_reference||''} inrs=${d.vpe_inrs||''} disp=${d.vpe_conditions_dispersion||''} vt=${d.vt_mesuree||''} pol=${d.vt_type_polluant||''} vtref=${d.vt_reference||''}]`
  },
  sanitaires: {
    input: [["Débit d'extraction (m3/h)", 'debit_mesure']],
    prepare(d) { d.chambre_erp_individuelle = d.nom_usage === 'chambre individuelle dans ERP' ? 'Oui' : 'Non'; },
    compare: [
      ["Débit min d'extraction requis (m3/h)", 'debit_min_reglementaire', 'num'],
      ['Type de ventilation', 'type_ventilation'],
      ['Avis par rapport aux valeurs réglementaires', 'avis']
    ],
    show: (r, c, d) => `[nom=${d.nom_usage} wc=${d.wc_urinoirs||''} dou=${d.douches||''} lav=${d.lavabos||''} deb=${d.debit_mesure}]`
  },
  'autres locaux': {
    input: [
      ['Débit total mesuré (m3/h)_1', 'debit_total_mesure'], ['Débit total mesuré (m3/h)_2', 'debit_total_mesure'],
      ['Débit soufflage mesuré (m3/h)', 'debit_soufflage'], ['Débit extraction mesuré (m3/h)', 'debit_extraction']
    ],
    compare: [
      ['type de ventilation', 'type_ventilation_libelle'],
      ["Débit minimum d'air neuf (m3/h)", 'debit_min_air_neuf', 'num'],
      ['Volume minimal (m3)', 'volume_min', 'num'],
      ['Avis par rapport aux valeurs réglementaires', 'avis']
    ],
    show: (r, c, d) => `[loc=${d.type_local} vent=${d.type_ventilation} vol=${d.volume} eff=${d.effectif} deb=${d.debit_total_mesure||d.debit_soufflage||''} pct=${d.pourcentage_air_neuf||''} ouv=${d.ouvrant_exterieur||''} ea=${d.entree_air_exterieur||''} eap=${d.entree_air_permanente||''}]`
  }
};
