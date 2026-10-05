// pourquoi-avis.js - « Pourquoi cet avis ? » sous l'avis d'une installation (2026-10-05)
//
// Explique en clair ce qui a décidé l'avis, pour que le technicien repère sur place une saisie qui fausse
// le résultat (ex. bureaux tous non satisfaisants à cause des ouvrants, 15 m³/h appliqués à un bloc
// sanitaire). Les explications des bureaux, ERP, sanitaires et locaux spécifiques suivent pas à pas les
// règles de js/calculations.js et js/locaux-specifiques.js : toute modification d'une règle se reporte ici.
// Les autres types listent leurs critères évalués.

function pqFr(v, dec) {
  var p = Math.pow(10, dec === undefined ? 1 : dec);
  return String(Math.round(v * p) / p).replace('.', ',');
}

function pqCompare(a, b) { return a >= b ? '≥' : '<'; }

// Bureaux et ERP (même logique, l'effectif diffère)
function pqLocaux(typeId, d) {
  var L = [];
  if (d.type_local === 'Local occupé occasionnellement') return ['Local occupé occasionnellement : pas de minimum réglementaire, avis sans objet.'];
  if (!d.type_local) L.push('Type de local non choisi.');
  if (!d.type_ventilation) L.push('Type de ventilation non choisi.');
  if (L.length) return L;
  var erp = typeId === 'erp';
  var nb = erp ? num(d.travailleur) + (isNaN(num(d.public)) ? 0 : num(d.public)) : num(d.effectif);
  var nbVol = erp ? num(d.travailleur) : num(d.effectif);
  if (isNaN(nbVol)) return [erp ? 'Nombre de travailleurs non renseigné.' : 'Effectif non renseigné.'];
  var t = LOCAL_LPNS[d.type_local] || {}, vol = num(d.volume), volMin = num(d.volume_min), vt = d.type_ventilation;
  var phraseVolume = function () {
    if (isNaN(vol) || isNaN(volMin)) return 'Volume du local non renseigné : impossible de comparer au volume minimal.';
    return 'Volume du local ' + pqFr(vol) + ' m³ ' + pqCompare(vol, volMin) + ' volume minimal ' + pqFr(volMin) + ' m³' +
      (t.vol ? ' (' + t.vol + ' m³ × ' + nbVol + ' personne' + (nbVol > 1 ? 's' : '') + ')' : '') + '.';
  };

  if (vt === 'Nat sans ouvrants' && d.entree_air_permanente === 'Non') return ['Ventilation naturelle sans ouvrant ni entrée d’air permanente : aucun renouvellement d’air, non satisfaisant.'];
  if (vt === 'Nat sans ouvrants' || vt === 'Nat avec ouvrants') return ['Ventilation naturelle : seul le volume du local compte.', phraseVolume()];
  if (vt === 'Extraction' && d.ouvrant_exterieur === 'Non' && d.entree_air_exterieur === 'Non') {
    return ['Extraction sans ouvrant ni entrée d’air donnant sur l’extérieur : l’air extrait ne vient pas de l’extérieur, il n’y a pas d’apport d’air neuf. Non satisfaisant, quel que soit le débit.'];
  }

  var min = num(d.debit_min_air_neuf);
  if (isNaN(min)) return ['Air neuf minimal non calculable (type de local ou effectif à compléter).'];
  if (erp && LOCAL_LPNS_FORFAIT.hasOwnProperty(d.type_local)) L.push('Air neuf minimal : ' + pqFr(min, 0) + ' m³/h, forfait par local.');
  else L.push('Air neuf minimal : ' + t.debit + ' m³/h × ' + nb + ' personne' + (nb > 1 ? 's' : '') + ' = ' + pqFr(min, 0) + ' m³/h (R4222-6).');

  var mesure;
  if (vt === 'Extraction') {
    mesure = num(d.debit_total_mesure);
    if (!isNaN(mesure)) L.push('Extraction : le débit extrait (' + pqFr(mesure, 0) + ' m³/h) est compté comme air neuf.');
  } else {
    var base = vt === 'Double flux' ? num(d.debit_soufflage) : num(d.debit_total_mesure), pct = num(d.pourcentage_air_neuf);
    mesure = debitAirNeufMesure(d);
    if (!isNaN(mesure)) {
      L.push('Air neuf introduit : ' + pqFr(mesure, 0) + ' m³/h' + (isNaN(pct)
        ? ' (% d’air neuf non saisi : tout l’air soufflé est compté comme air neuf).'
        : ' (' + pqFr(base, 0) + ' m³/h soufflés × ' + pqFr(pct) + ' % d’air neuf).'));
    }
  }
  if (isNaN(mesure)) return L.concat(['Débit d’air neuf non mesuré : l’avis se fait sur le volume seul.', phraseVolume()]);
  if (mesure >= min) return L.concat([pqFr(mesure, 0) + ' ≥ ' + pqFr(min, 0) + ' m³/h : air neuf suffisant.']);
  L.push(pqFr(mesure, 0) + ' < ' + pqFr(min, 0) + ' m³/h : air neuf insuffisant.');
  if (!isNaN(vol) && !isNaN(volMin) && vol >= volMin) return L.concat([phraseVolume(), 'Le volume du local compense le débit insuffisant : satisfaisant (règle du Rapso).']);
  return L.concat([phraseVolume(), 'Ni le débit ni le volume ne suffisent : non satisfaisant.']);
}

function pqSanitaires(d) {
  var L = [];
  if (d.debit_mesure === undefined || d.debit_mesure === null || d.debit_mesure === '') return ['Débit d’extraction non mesuré.'];
  var w = num(d.wc_urinoirs) || 0, dch = num(d.douches) || 0, lav = num(d.lavabos) || 0;
  var ref = num(d.debit_min_reglementaire), v = num(d.debit_mesure);
  if (d.chambre_erp_individuelle === 'Oui') L.push('Chambre individuelle dans un ERP : minimum limité à 15 m³/h.');
  else {
    L.push('Équipements : ' + w + ' WC/urinoir(s), ' + dch + ' douche(s), ' + lav + ' lavabo(s).');
    if (d.individuel_collectif === 'Individuel' && (w > 0 || dch > 0) && w <= 1 && dch <= 1) {
      L.push('Local individuel isolé (1 WC et/ou 1 douche au plus) : minimum limité à 15 m³/h (R4212-6). À cocher seulement pour un local privatif, pas pour un WC ouvert à tous.');
    } else if (d.individuel_collectif === 'Individuel') {
      L.push('Coché « Individuel », mais les équipements sont groupés : le minimum du tableau s’applique.');
    }
  }
  if (lav === 1 && ref === 0) return L.concat(['Un lavabo seul : pas de minimum réglementaire, satisfaisant.']);
  if (ref === 0) return L.concat(['Aucun WC, urinoir ou douche saisi : pas de minimum calculable.']);
  if (isNaN(v) || isNaN(ref)) return L.concat(['Débit ou minimum non calculable.']);
  L.push('Minimum réglementaire : ' + pqFr(ref, 0) + ' m³/h (R4212-6).');
  L.push('Débit extrait ' + pqFr(v, 0) + ' ' + pqCompare(v, ref) + ' ' + pqFr(ref, 0) + ' m³/h : ' + (v >= ref ? 'suffisant.' : 'insuffisant.'));
  return L;
}

function pqLocalSpecifique(d) {
  var L = [];
  L.push('Mesures réalisées : ' + (d.mesures_realisees || 'extraction et air neuf') + '.');
  if (lsAvecExtraction(d)) {
    var e = num(d.debit_global_extrait), r = String(d.valeur_reference_extraction || '').trim();
    if (isNaN(e)) L.push('Extraction : débit global non mesuré.');
    else if (!r || r === '/' || r === '-') L.push('Extraction : ' + pqFr(e, 0) + ' m³/h relevés, sans valeur de référence du client : pas d’avis sur ce point.');
    else {
      var rv = num(r);
      if (isNaN(rv)) L.push('Extraction : valeur de référence illisible.');
      else L.push('Extraction : ' + pqFr(e, 0) + ' m³/h ' + pqCompare(e, rv * POURCENTAGE_REF) + ' ' + pqFr(rv * POURCENTAGE_REF, 0) + ' m³/h (80 % de la référence de ' + pqFr(rv, 0) + ' m³/h) : ' + (e >= rv * POURCENTAGE_REF ? 'suffisant.' : 'insuffisant.'));
    }
    var tx = num(d.taux_renouvellement), rec = num(d.taux_recommande);
    if (!isNaN(tx) && !isNaN(rec)) L.push('Taux de renouvellement ' + pqFr(tx) + ' ' + pqCompare(tx, rec) + ' ' + pqFr(rec) + ' vol/h retenus' + (d.referentiel_taux ? ' (' + d.referentiel_taux + ')' : ' (source non indiquée)') + '.');
    else if (!isNaN(tx)) L.push('Taux de renouvellement ' + pqFr(tx) + ' vol/h : informatif (aucun taux recommandé saisi).');
  }
  if (lsAvecAirNeuf(d)) {
    var min = num(d.debit_min_air_neuf), q = num(d.debit_air_neuf), t = LOCAL_LPNS[d.type_local];
    if (d.mode_air_neuf === 'Entrées d’air naturelles (non mesurables)') L.push('Air neuf par entrées d’air naturelles : non mesurable, impossible de se prononcer.');
    else if (isNaN(min)) L.push('Air neuf minimal non calculable (désignation du local ou effectif à compléter).');
    else {
      var occ = num(d.effectif) + (isNaN(num(d.occupants_autres_locaux)) ? 0 : num(d.occupants_autres_locaux));
      L.push('Air neuf minimal : ' + (t ? t.debit : '?') + ' m³/h × ' + occ + ' personne' + (occ > 1 ? 's' : '') + ' = ' + pqFr(min, 0) + ' m³/h (R4222-6 et R4222-11).');
      if (isNaN(q)) L.push('Débit d’air neuf non mesuré.');
      else L.push('Air neuf introduit ' + pqFr(q, 0) + ' ' + pqCompare(q, min) + ' ' + pqFr(min, 0) + ' m³/h : ' + (q >= min ? 'suffisant.' : 'insuffisant.'));
    }
    L.push('Local à pollution spécifique : le volume du local ne compense pas un air neuf insuffisant.');
  }
  L.push('L’avis retient le critère le plus défavorable.');
  return L;
}

// Autres types : les critères évalués de la fiche
function pqGenerique(type, inst, avisKey) {
  var L = [];
  type.fields.forEach(function (f) {
    if (f.type !== 'computed' || f.key === avisKey) return;
    if (f.showIf && !evalShowIf(f.showIf, inst.data)) return;
    var v = inst.data[f.key];
    if (typeof v !== 'string' || !/^(Satisfaisant|Non Satisfaisant|Impossible de se prononcer|Sans [Oo]bjet)/.test(v)) return;
    L.push((typeof reasonLabel === 'function' ? reasonLabel(type, f) : f.label) + ' : ' + v + '.');
  });
  return L.length ? ['Critères évalués :'].concat(L) : [];
}

function pourquoiAvis(typeId, inst) {
  var type = getInstallationType(typeId), d = inst && inst.data;
  if (!type || !d) return [];
  if (typeId === 'bureaux' || typeId === 'erp') return pqLocaux(typeId, d);
  if (typeId === 'sanitaires') return pqSanitaires(d);
  if (typeId === 'local_specifique') return pqLocalSpecifique(d);
  return pqGenerique(type, inst, resolveAvisFieldKey(type));
}

function pourquoiAvisHtml(typeId, inst) {
  if (!inst || !hasRealInstallationData(inst.data)) return '';
  var L = pourquoiAvis(typeId, inst);
  if (!L.length) return '';
  return '<details class="pourquoi-avis"><summary>Pourquoi cet avis ?</summary><ul>' +
    L.map(function (x) { return '<li>' + escapeHtml(x) + '</li>'; }).join('') + '</ul></details>';
}

console.log('✓ Pourquoi cet avis chargé');
