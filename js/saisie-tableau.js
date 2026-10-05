// saisie-tableau.js - Saisie en tableau des locaux en série (2026-10-05)
//
// Pour 40 bureaux ou 30 sanitaires d'un bâtiment : une ligne par local, les valeurs en colonnes, saisies
// à la suite comme dans un tableur, sans ouvrir chaque fiche. L'avis de la ligne se met à jour à chaque
// valeur. Une saisie de texte ou de nombre ne redessine pas l'écran (le clavier et la case suivante
// restent en place) ; un choix dans une liste redessine le tableau (les cases sans objet changent).
// La fiche complète reste à un toucher (bouton › de la ligne) pour ce que le tableau ne montre pas.

var TB_COLONNES = {
  bureaux: [
    { k: 'reference_local', l: 'Local' },
    { k: 'type_local', l: 'Type de local' },
    { k: 'effectif', l: 'Effectif' },
    { k: 'volume', l: 'Volume (m³)' },
    { k: 'type_ventilation', l: 'Ventilation' },
    { k: 'debit_total_mesure', l: 'Débit (m³/h)' },
    { k: 'pourcentage_air_neuf', l: '% air neuf' }
  ],
  erp: [
    { k: 'reference_local', l: 'Local' },
    { k: 'type_local', l: 'Type de local' },
    { k: 'travailleur', l: 'Travailleurs' },
    { k: 'public', l: 'Public' },
    { k: 'volume', l: 'Volume (m³)' },
    { k: 'type_ventilation', l: 'Ventilation' },
    { k: 'debit_total_mesure', l: 'Débit (m³/h)' },
    { k: 'pourcentage_air_neuf', l: '% air neuf' }
  ],
  sanitaires: [
    { k: 'repere', l: 'Repère' },
    { k: 'wc_urinoirs', l: 'WC / urinoirs' },
    { k: 'douches', l: 'Douches' },
    { k: 'lavabos', l: 'Lavabos' },
    { k: 'individuel_collectif', l: 'Individuel / collectif' },
    { k: 'debit_mesure', l: 'Débit extrait (m³/h)' }
  ]
};

function tbTypePossible(typeId) { return !!TB_COLONNES[typeId]; }

function ouvrirTableau(typeId, bat, niveau) {
  state.tableau = { typeId: typeId, bat: bat === undefined ? null : bat, niveau: niveau === undefined ? null : niveau };
  state.retourTableau = state.view;
  state.view = 'saisie-tableau';
  window.scrollTo(0, 0);
  render();
}

function tbLignes(m, tb) {
  return (m.installations[tb.typeId] || []).map(function (inst, idx) { return { inst: inst, idx: idx }; })
    .filter(function (x) {
      return (tb.bat === null || String(x.inst.data.batiment || '').trim() === tb.bat) &&
        (tb.niveau === null || tb.niveau === undefined || String(x.inst.data.niveau || '').trim() === tb.niveau);
    });
}

function tbChamp(t, k) { return t.fields.find(function (f) { return f.key === k; }); }

function tbCelluleHtml(t, x, col) {
  var f = tbChamp(t, col.k), d = x.inst.data;
  if (!f) return '<td></td>';
  if (f.showIf && !evalShowIf(f.showIf, d)) return '<td class="tb-so">—</td>';
  var v = d[col.k] === undefined || d[col.k] === null ? '' : String(d[col.k]);
  var appel = 'tbSaisir(' + x.idx + ',\'' + col.k + '\',this';
  if (f.type === 'select' || f.type === 'toggle') {
    return '<td><select class="tb-input" onchange="' + appel + ',true);"><option value=""></option>' + (f.options || []).map(function (o) {
      return '<option' + (o === v ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
    }).join('') + '</select></td>';
  }
  return '<td><input class="tb-input' + (f.type === 'number' ? ' tb-num' : '') + '" type="text"' + (f.type === 'number' ? ' inputmode="decimal"' : '') +
    ' value="' + escapeHtml(v) + '" enterkeyhint="next" onchange="' + appel + ',false);"></td>';
}

function tbAvisHtml(t, inst) {
  var key = resolveAvisFieldKey(t), v = inst.data[key] || '';
  var cls = v ? statusClass(v) : 'status-muted';
  return '<span class="status-dot ' + cls + '"></span><span>' + escapeHtml(v ? v.replace('Impossible de se prononcer', 'À compléter') : '—') + '</span>';
}

function tbSaisir(idx, k, el, redessiner) {
  var m = getCurrentMission(), tb = state.tableau, inst = m && m.installations[tb.typeId][idx];
  if (!inst) return;
  var v = String(el.value).trim();
  var info = typeof ficheSaisie === 'function' ? ficheSaisie(tb.typeId, k, v, idx) : null; // valeur remplacée : « Annuler » (js/fiche-plus.js)
  if (v) inst.data[k] = v; else delete inst.data[k];
  if (info) ficheProposerAnnulation(tb.typeId, k, info);
  if (typeof touchInstallation === 'function') touchInstallation(inst);
  applyCalculations(tb.typeId, inst);
  persistMissions();
  if (redessiner) { render(); return; }
  var cell = document.getElementById('tb-avis-' + idx);
  if (cell) cell.innerHTML = tbAvisHtml(getInstallationType(tb.typeId), inst);
}

function tbAjouterLigne() {
  var m = getCurrentMission(), tb = state.tableau;
  if (!m.installations[tb.typeId]) m.installations[tb.typeId] = [];
  var data = {};
  if (tb.bat) data.batiment = tb.bat;
  if (tb.niveau) data.niveau = tb.niveau;
  // Le type de local et la ventilation de la ligne précédente sont repris (locaux en série)
  var lignes = tbLignes(m, tb), prec = lignes.length ? lignes[lignes.length - 1].inst.data : null;
  if (prec) ['niveau', 'type_local', 'type_ventilation', 'individuel_collectif'].forEach(function (k) { if (prec[k]) data[k] = prec[k]; });
  var inst = { id: generateId(), data: data };
  applyCalculations(tb.typeId, inst);
  m.installations[tb.typeId].push(inst);
  persistMissions();
  render();
  setTimeout(function () { var l = document.querySelectorAll('.tb-table tbody tr'); if (l.length) { var i = l[l.length - 1].querySelector('.tb-input'); if (i) i.focus(); } }, 30);
}

function tbOuvrirFiche(idx) {
  state.retourVue = 'saisie-tableau';
  state.currentTypeId = state.tableau.typeId;
  state.currentInstIndex = idx;
  state.currentStep = 0;
  state.view = 'installation-form';
  render();
}

function renderSaisieTableau() {
  var m = getCurrentMission(), tb = state.tableau;
  if (!m || !tb || !TB_COLONNES[tb.typeId]) { state.view = 'mission-detail'; return renderMissionDetail(); }
  var t = getInstallationType(tb.typeId), cols = TB_COLONNES[tb.typeId], lignes = tbLignes(m, tb);
  if (tb.bat === null) {
    var avecNiveau = lignes.some(function (x) { return x.inst.data.niveau; });
    cols = [cols[0], { k: 'batiment', l: 'Bâtiment' }].concat(avecNiveau ? [{ k: 'niveau', l: 'Niveau' }] : [], cols.slice(1));
  }
  var retour = state.retourTableau === 'type-list' ? 'type-list' : 'mission-detail';
  var h = '<button class="back-btn" onclick="state.view=\'' + retour + '\';render();">' + ICONS.arrowLeft + ' ' + (retour === 'type-list' ? escapeHtml(t.label) : 'Vue d’ensemble') + '</button>';
  var faits = lignes.filter(function (x) { return installationStatus(t, x.inst).state === 'done'; }).length;
  h += '<div class="card"><h1>' + getIcon(t.icon) + ' ' + escapeHtml(t.label) + '</h1><p class="subtitle">' + (tb.bat ? escapeHtml(tb.bat) + (tb.niveau ? ', niveau ' + escapeHtml(tb.niveau) : '') + ' · ' : '') +
    lignes.length + ' ligne(s), ' + faits + ' terminée(s). Saisissez à la suite ; touchez › pour la fiche complète (photos, bouches, double flux…).</p></div>';
  h += '<div class="tb-scroll"><table class="tb-table"><thead><tr>' + cols.map(function (c, i) { return '<th' + (i === 0 ? ' class="tb-col1"' : '') + '>' + escapeHtml(c.l) + '</th>'; }).join('') +
    '<th>Avis</th><th></th></tr></thead><tbody>';
  lignes.forEach(function (x) {
    h += '<tr>' + cols.map(function (c, i) { return tbCelluleHtml(t, x, c).replace('<td', i === 0 ? '<td class="tb-col1"' : '<td'); }).join('') +
      '<td class="tb-avis" id="tb-avis-' + x.idx + '">' + tbAvisHtml(t, x.inst) + '</td>' +
      '<td><button type="button" class="tb-fiche" aria-label="Ouvrir la fiche" onclick="tbOuvrirFiche(' + x.idx + ');">' + ICONS.chevronRight + '</button></td></tr>';
  });
  h += '</tbody></table></div>';
  h += '<button type="button" class="btn btn-gray" onclick="tbAjouterLigne();">' + ICONS.plus + ' Ajouter une ligne</button>';
  return h;
}

console.log('✓ Saisie en tableau chargée');
