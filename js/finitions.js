// finitions.js - Positions des points de mesure, étiquette à l'unité, visa du technicien (2026-10-04)
//
//  - Positions des points : sous une grille de vitesses, où placer la sonde, calculé à partir des
//    dimensions saisies. Conduit rond : méthode des aires égales (chaque point au centre d'un anneau
//    d'aire égale), profondeur depuis la paroi le long de chaque diamètre. Conduit rectangulaire ou
//    façade de hotte : centre de rectangles égaux, distances aux bords.
//  - Étiquette QR d'une seule installation (étiquette abîmée, installation ajoutée), avec choix de la
//    case de départ sur une planche déjà entamée (js/qr.js).
//  - Visa du technicien : signature dessinée une fois dans le profil, reprise sur la page de garde du
//    rapport (« Rédigé par ») et sur le compte rendu de fin de visite.

// ————————————————————————————————————————————
// Positions des points de mesure
// ————————————————————————————————————————————

// Dimensions de la zone de mesure d'une grille : { forme: 'rond'|'rect', a, b, unite, rows, cols } ou null
function pointsZone(typeId, f, inst) {
  var d = inst.data, rows = parseInt(d[f.rowsKey], 10) || 0, cols = parseInt(d[f.colsKey], 10) || 0;
  if (!rows || !cols) return null;
  if (typeId === 'hottes') {
    var l = num(d.vpe_largeur_cm), hh = num(d.vpe_hauteur_cm);
    return l > 0 && hh > 0 ? { forme: 'rect', a: l, b: hh, unite: 'cm', rows: rows, cols: cols, libelle: 'façade de la hotte' } : null;
  }
  if (!/vitesse_grid$/.test(f.key) || typeId === 'cabines_peinture') return null;
  var prefixe = f.key.replace(/vitesse_grid$/, ''), c1 = num(d[prefixe + 'diametre_cote1']), c2 = num(d[prefixe + 'cote2']);
  if (!(c1 > 0)) return null;
  if (c2 > 0) return { forme: 'rect', a: c1, b: c2, unite: 'cm', rows: rows, cols: cols, libelle: 'section du conduit' };
  return { forme: 'rond', a: c1, unite: 'cm', rows: rows, cols: cols, libelle: 'conduit circulaire' };
}

// Conduit rond, n points par diamètre (n pair) : distances depuis la paroi, aires égales
function pointsRond(D, n) {
  if (n % 2) return null;
  var R = D / 2, k = n / 2, r = [];
  for (var i = 1; i <= k; i++) r.push(R * Math.sqrt((2 * i - 1) / (2 * k)));
  var out = r.slice().reverse().map(function (x) { return R - x; }).concat(r.map(function (x) { return R + x; }));
  return out.map(function (x) { return Math.round(x * 10) / 10; });
}

function pointsRect(longueur, n) {
  var out = [];
  for (var i = 0; i < n; i++) out.push(Math.round((i + 0.5) * longueur / n * 10) / 10);
  return out;
}

function positionsPointsHtml(typeId, f, inst) {
  var z = pointsZone(typeId, f, inst);
  if (!z) return '';
  var fr = function (v) { return String(v).replace('.', ','); };
  var h = '<details class="positions-points"><summary>Positions des points de mesure (' + escapeHtml(z.libelle) + ')</summary>';
  if (z.forme === 'rond') {
    var p = pointsRond(z.a, z.cols);
    if (!p) return h + '<p class="subtitle">Choisissez un nombre pair de points par axe pour la méthode des aires égales.</p></details>';
    var S = 150, R = 60, cx = 75, cy = 75;
    var svg = '<svg viewBox="0 0 ' + S + ' ' + S + '" class="positions-svg"><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="currentColor" stroke-width="2"/>';
    for (var axe = 0; axe < Math.min(z.rows, 4); axe++) {
      var ang = Math.PI * axe / Math.min(z.rows, 4), dx = Math.cos(ang), dy = Math.sin(ang);
      svg += '<line x1="' + (cx - dx * R) + '" y1="' + (cy - dy * R) + '" x2="' + (cx + dx * R) + '" y2="' + (cy + dy * R) + '" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 3"/>';
      p.forEach(function (x) { var t = x / z.a * 2 * R - R; svg += '<circle cx="' + (cx + dx * t) + '" cy="' + (cy + dy * t) + '" r="3.2" fill="#0082DE"/>'; });
    }
    svg += '</svg>';
    h += '<div class="positions-corps">' + svg + '<div><p class="subtitle">Ø ' + fr(z.a) + ' cm, ' + z.rows + ' diamètre(s) à ' + (z.rows > 1 ? Math.round(180 / z.rows) + '°' : '') + ', ' + z.cols + ' points par diamètre. Profondeur depuis la paroi (méthode des aires égales) :</p>' +
      '<table class="positions-table"><tbody>' + p.map(function (x, i) { return '<tr><td>Point ' + (i + 1) + '</td><td><b>' + fr(x) + ' cm</b></td></tr>'; }).join('') + '</tbody></table></div></div>';
  } else {
    var px = pointsRect(z.a, z.cols), py = pointsRect(z.b, z.rows);
    var W = 160, Hh = Math.max(60, Math.min(160, W * z.b / z.a));
    var svg2 = '<svg viewBox="0 0 ' + (W + 10) + ' ' + (Hh + 10) + '" class="positions-svg"><rect x="5" y="5" width="' + W + '" height="' + Hh + '" fill="none" stroke="currentColor" stroke-width="2"/>';
    px.forEach(function (x) { py.forEach(function (y) { svg2 += '<circle cx="' + (5 + x / z.a * W) + '" cy="' + (5 + y / z.b * Hh) + '" r="3.2" fill="#0082DE"/>'; }); });
    svg2 += '</svg>';
    h += '<div class="positions-corps">' + svg2 + '<div><p class="subtitle">' + fr(z.a) + ' × ' + fr(z.b) + ' cm, ' + z.cols + ' × ' + z.rows + ' points, chacun au centre d’un rectangle égal.</p>' +
      '<table class="positions-table"><tbody><tr><td>Depuis le bord gauche</td><td><b>' + px.map(fr).join(' · ') + ' cm</b></td></tr><tr><td>Depuis le bord haut</td><td><b>' + py.map(fr).join(' · ') + ' cm</b></td></tr></tbody></table></div></div>';
  }
  return h + '</details>';
}

// ————————————————————————————————————————————
// Étiquette QR d'une installation
// ————————————————————————————————————————————

function etiquetteFicheHtml(typeId, inst) {
  if (!inst || typeof imprimerEtiquettesQr !== 'function') return '';
  return '<button type="button" class="btn btn-gray btn-small etiquette-btn" onclick="imprimerEtiquetteInstallation(\'' + typeId + '\');">' + ICONS.tag + (inst.data._qr ? ' Réimprimer l’étiquette QR' : ' Imprimer l’étiquette QR') + '</button>';
}

function imprimerEtiquetteInstallation(typeId) {
  var m = getCurrentMission(), it = overviewOrderedItems(m).filter(function (x) { return x.type.id === typeId && x.idx === state.currentInstIndex; })[0];
  if (it) imprimerEtiquettesQr({ items: [it] });
}

// ————————————————————————————————————————————
// Visa du technicien
// ————————————————————————————————————————————

var VISA_KEY = 'aeration_visa_technicien_v1';

function getVisa() {
  try { var v = localStorage.getItem(VISA_KEY); return v && v.indexOf('data:image/png') === 0 ? v : ''; } catch (e) { return ''; }
}

function setVisa(v) {
  try { if (v) localStorage.setItem(VISA_KEY, v); else localStorage.removeItem(VISA_KEY); } catch (e) {}
}

function visaProfilHtml() {
  return '<div class="card"><div class="section-title">Mon visa (signature)</div><p class="subtitle">Dessinez-le une fois : il apparaît sur la page de garde du rapport (« Rédigé par ») et sur le compte rendu de fin de visite.</p>' +
    '<div class="signature-wrap"><canvas id="visa-pad" class="signature-pad"></canvas>' + (getVisa() ? '' : '<div class="signature-hint">Signer ici avec le doigt</div>') + '</div>' +
    '<button type="button" class="btn btn-gray btn-small" style="margin-top:6px;" onclick="setVisa(\'\');render();">Effacer le visa</button></div>';
}

// Pavé du visa (même principe que la signature du client, js/sorties.js)
function initVisaPad() {
  var canvas = document.getElementById('visa-pad');
  if (!canvas || canvas._init) return;
  canvas._init = true;
  var ratio = window.devicePixelRatio || 1, w = canvas.clientWidth, hgt = canvas.clientHeight;
  canvas.width = w * ratio; canvas.height = hgt * ratio;
  var ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt);
  ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0c1220';
  var v = getVisa();
  if (v) { var img = new Image(); img.onload = function () { ctx.drawImage(img, 0, 0, w, hgt); }; img.src = v; }
  var dessin = false, last = null;
  var pos = function (e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', function (e) {
    dessin = true; last = pos(e); canvas.setPointerCapture(e.pointerId);
    var hint = canvas.parentNode.querySelector('.signature-hint'); if (hint) hint.style.display = 'none';
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dessin) return;
    var p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p; e.preventDefault();
  });
  var fin = function () { if (!dessin) return; dessin = false; setVisa(canvas.toDataURL('image/png')); };
  canvas.addEventListener('pointerup', fin);
  canvas.addEventListener('pointercancel', fin);
}

console.log('✓ Finitions chargées');
