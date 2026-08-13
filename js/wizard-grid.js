// wizard-grid.js - Saisie point par point des grilles de mesure (chantier "pattern de saisie des
// grilles"), pour les champs de type 'grid' marqués `pointEntry: true` dans installations-schema.js.
// Remplace l'affichage en tableau dense par un point à la fois (gros input tap-friendly, cohérent
// avec le reste du wizard), avec un aperçu de la grille accessible pour visualiser l'ensemble et
// corriger un point déjà saisi.
//
// Réutilise updateGridCell (installations.js) pour écrire dans inst.data[key][r][c] — même fonction
// que l'ancien rendu dense (gwPassthrough), donc format de stockage garanti identique. C'est ce
// format que consomme ficheGrilleTable côté export Word (js/export-word.js), qui ne sait rien de la
// façon dont la grille a été saisie.

function gwGridMeta(f, inst) {
  var cols = Math.min(parseInt(inst.data[f.colsKey], 10) || 0, 5);
  var rows = Math.min(parseInt(inst.data[f.rowsKey], 10) || 0, 5);
  return { rows: rows, cols: cols, rowLabel: f.rowLabel || 'Axe', colLabel: f.colLabel || 'Point' };
}

function gwGridValue(inst, key, r, c) {
  var grid = Array.isArray(inst.data[key]) ? inst.data[key] : [];
  return (grid[r] && grid[r][c] !== undefined) ? grid[r][c] : '';
}

function gwGridPointKey(key) { return '_' + key + '_point'; }

function gwGridCurrentIndex(inst, key, total) {
  var idx = inst.data[gwGridPointKey(key)];
  if (typeof idx !== 'number' || idx < 0 || idx >= total) idx = 0;
  return idx;
}

function gwGridNav(typeId, key, delta, total) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  var idx = gwGridCurrentIndex(inst, key, total);
  idx = Math.max(0, Math.min(total - 1, idx + delta));
  inst.data[gwGridPointKey(key)] = idx;
  persistMissions();
  render();
}

function gwGridJumpTo(typeId, key, idx) {
  var m = getCurrentMission();
  var inst = m.installations[typeId][state.currentInstIndex];
  inst.data[gwGridPointKey(key)] = idx;
  state.gridRecap = null; // retour à la saisie point par point sur le point choisi
  persistMissions();
  render();
}

function gwGridToggleRecap(recapKey) {
  state.gridRecap = (state.gridRecap === recapKey) ? null : recapKey;
  render();
}

function gwGridNavRow(typeId, key, idx, total) {
  var h = '<div class="row" style="margin-top:10px;">';
  if (idx > 0) {
    h += '<button type="button" class="btn btn-gray" onclick="gwGridNav(\'' + typeId + '\',\'' + key + '\',-1,' + total + ');">' +
      ICONS.arrowLeft + ' Point précédent</button>';
  } else {
    h += '<button type="button" class="btn btn-gray" disabled>' + ICONS.arrowLeft + ' Premier point</button>';
  }
  if (idx < total - 1) {
    h += '<button type="button" class="btn btn-primary" onclick="gwGridNav(\'' + typeId + '\',\'' + key + '\',1,' + total + ');">Point suivant ' +
      ICONS.arrowRight + '</button>';
  } else {
    h += '<button type="button" class="btn btn-gray" disabled>' + ICONS.check + ' Dernier point de la grille</button>';
  }
  h += '</div>';
  return h;
}

function gwGridPointEntry(typeId, f, inst) {
  var meta = gwGridMeta(f, inst);
  if (!meta.rows || !meta.cols) {
    return '<div class="field-big"><label class="label">' + escapeHtml(f.label) + '</label>' +
      '<p class="subtitle" style="text-align:center;">Renseigne d’abord le nombre de ' +
      escapeHtml(meta.rowLabel.toLowerCase()) + '(s) et de ' + escapeHtml(meta.colLabel.toLowerCase()) + '(s) par ' +
      escapeHtml(meta.rowLabel.toLowerCase()) + '.</p></div>';
  }
  var total = meta.rows * meta.cols;
  var recapKey = typeId + ':' + f.key;
  if (state.gridRecap === recapKey) return gwGridRecap(typeId, f, inst, meta, total, recapKey);

  var idx = gwGridCurrentIndex(inst, f.key, total);
  var r = Math.floor(idx / meta.cols), c = idx % meta.cols;
  var val = gwGridValue(inst, f.key, r, c);
  var isEmpty = fieldEmptyValue(val); // '' vide ; '/' compte comme rempli (point exclu volontairement)
  var st = isEmpty ? 'required-empty' : 'required-filled';

  var h = '<div class="field-big"><label class="label">' + escapeHtml(f.label) + '</label>';
  h += '<div class="grid-point-dots">';
  for (var i = 0; i < total; i++) {
    var vv = gwGridValue(inst, f.key, Math.floor(i / meta.cols), i % meta.cols);
    var cls = 'grid-point-dot';
    if (i === idx) cls += ' current';
    else if (!fieldEmptyValue(vv)) cls += ' filled';
    h += '<span class="' + cls + '"></span>';
  }
  h += '</div>';
  h += '<div class="grid-point-caption">' + escapeHtml(meta.rowLabel) + ' ' + (r + 1) + ' · ' +
    escapeHtml(meta.colLabel) + ' ' + (c + 1) + ' sur ' + meta.cols + '</div>';
  h += '<input type="text" inputmode="decimal" class="input-big state-' + st + '" value="' + escapeHtml(val) +
    '" onchange="updateGridCell(\'' + typeId + '\',\'' + f.key + '\',' + r + ',' + c + ',this.value);">';
  h += fieldHint(st);
  h += '<div class="row" style="margin-top:10px;">';
  h += '<button type="button" class="btn btn-gray btn-small" onclick="updateGridCell(\'' + typeId + '\',\'' +
    f.key + '\',' + r + ',' + c + ',\'/\');render();">Exclure ce point (/)</button>';
  h += '<button type="button" class="btn btn-gray btn-small" onclick="gwGridToggleRecap(\'' + recapKey +
    '\');">⊞ Voir toute la grille</button>';
  h += '</div>';
  h += gwGridNavRow(typeId, f.key, idx, total);
  h += '</div>';
  return h;
}

// Aperçu compact : reprend le tableau dense existant, chaque cellule (remplie ou non) reste tappable
// pour aller saisir/corriger ce point précisément — pas seulement pour naviguer vers du vide.
function gwGridRecap(typeId, f, inst, meta, total, recapKey) {
  var idx = gwGridCurrentIndex(inst, f.key, total);
  var h = '<div class="field-big"><label class="label">' + escapeHtml(f.label) + ' — aperçu</label>';
  h += '<div style="overflow-x:auto;"><table class="grid-recap-table"><tr><th></th>';
  var c;
  for (c = 0; c < meta.cols; c++) h += '<th>' + escapeHtml(meta.colLabel) + ' ' + (c + 1) + '</th>';
  h += '</tr>';
  for (var r = 0; r < meta.rows; r++) {
    h += '<tr><th>' + escapeHtml(meta.rowLabel) + ' ' + (r + 1) + '</th>';
    for (c = 0; c < meta.cols; c++) {
      var i = r * meta.cols + c;
      var v = gwGridValue(inst, f.key, r, c);
      var filled = !fieldEmptyValue(v);
      var cls = 'grid-recap-cell' + (filled ? ' filled' : '') + (i === idx ? ' current' : '');
      h += '<td class="' + cls + '" onclick="gwGridJumpTo(\'' + typeId + '\',\'' + f.key + '\',' + i + ');">' +
        (filled ? escapeHtml(v) : '—') + '</td>';
    }
    h += '</tr>';
  }
  h += '</table></div>';
  h += '<button type="button" class="btn btn-gray btn-small mt-8" onclick="gwGridToggleRecap(\'' + recapKey + '\');">' +
    ICONS.arrowLeft + ' Retour à la saisie point par point</button>';
  h += '</div>';
  return h;
}

console.log('✓ Saisie de grille point par point chargée');
