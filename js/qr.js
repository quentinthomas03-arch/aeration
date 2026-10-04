// qr.js - Étiquettes QR sur les installations (chantier du 2026-10-04)
//
// Avant la visite (au bureau : pas d'imprimante sur site), le technicien imprime depuis la mission une
// planche d'étiquettes, une par installation : QR code + nom de l'installation en gros, type et
// bâtiment, pour savoir où coller chacune. Sur site, il les colle sur la hotte, la CTA, la machine…
// L'année suivante, il scanne l'étiquette (bouton « Scanner une étiquette » de la mission, ou
// simplement l'appareil photo du téléphone) et la bonne fiche s'ouvre, préremplie avec l'an dernier.
//
// Chaque installation reçoit un code aléatoire inst.data._qr (méta-donnée « _ », jamais dans le
// rapport), repris à la visite suivante comme l'emplacement sur le plan, jamais recopié par
// « Dupliquer ». Le QR contient l'adresse de l'appli suivie de ?qr=CODE : aucune donnée du client.

var QR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I : lisible si on doit le taper
var QR_CODE_RE = /^[A-Z2-9]{8}$/;
var QR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v1M14 20h1M17 20h4v-3"/></svg>';

function qrNouveauCode() {
  var b = new Uint8Array(8), s = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (var i = 0; i < 8; i++) b[i] = Math.floor(Math.random() * 256);
  for (var j = 0; j < 8; j++) s += QR_ALPHABET.charAt(b[j] % QR_ALPHABET.length);
  return s;
}

// Codes déjà attribués dans toutes les missions (un code ne désigne qu'une installation physique,
// présente dans plusieurs missions successives du même site)
function qrCodesUtilises() {
  var used = {};
  (state.missions || []).forEach(function (m) {
    Object.keys(m.installations || {}).forEach(function (t) {
      (m.installations[t] || []).forEach(function (inst) { if (inst.data && inst.data._qr) used[inst.data._qr] = true; });
    });
  });
  return used;
}

function qrCodeInstallation(inst, used) {
  if (inst.data._qr && QR_CODE_RE.test(inst.data._qr)) return inst.data._qr;
  var c;
  do { c = qrNouveauCode(); } while (used && used[c]);
  if (used) used[c] = true;
  inst.data._qr = c;
  return c;
}

// Adresse de l'appli (là où elle est installée) + ?qr=CODE : l'appareil photo du téléphone ouvre
// directement l'appli sur l'installation
function qrUrl(code) {
  var base = (typeof location !== 'undefined' && /^https?:/.test(location.protocol)) ? location.origin + location.pathname.replace(/index\.html$/, '') : '';
  return base + '?qr=' + code;
}

// Extrait le code d'un QR scanné (adresse ?qr=CODE) ou d'une saisie manuelle
function qrExtraireCode(texte) {
  var t = String(texte || '').trim().toUpperCase();
  var m = t.match(/[?&]QR=([A-Z2-9]{8})\b/);
  if (m) return m[1];
  t = t.replace(/[\s-]/g, '');
  return QR_CODE_RE.test(t) ? t : null;
}

// Assainit les codes d'une mission (fichier .json reçu d'un tiers) — appelé par normalizeMission
function qrNormaliser(m) {
  Object.keys(m.installations || {}).forEach(function (t) {
    (m.installations[t] || []).forEach(function (inst) {
      if (inst && inst.data && inst.data._qr !== undefined && !QR_CODE_RE.test(String(inst.data._qr))) delete inst.data._qr;
    });
  });
}

function qrMissionALesEtiquettes(m) {
  return Object.keys(m.installations || {}).some(function (t) {
    return (m.installations[t] || []).some(function (inst) { return inst.data && inst.data._qr; });
  });
}

// ————————————————————————————————————————————
// Planche d'étiquettes (PDF A4, 3 × 7 étiquettes de 63,5 × 38,1 mm, type Avery L7160 / J8160)
// ————————————————————————————————————————————

var QR_PLANCHE = { cols: 3, rows: 7, w: 180, h: 108, left: 20.4, top: 43, gapX: 7.1, gapY: 0 };

function qrEtiquettesDocDefinition(m, items) {
  var P = QR_PLANCHE, parPage = P.cols * P.rows, content = [];
  var site = m.clientSite || (m.infosSiteIntervention && m.infosSiteIntervention.siteIntervention) || '';
  items.forEach(function (it, i) {
    var pos = i % parPage, col = pos % P.cols, row = Math.floor(pos / P.cols);
    var x = P.left + col * (P.w + P.gapX), y = P.top + row * (P.h + P.gapY);
    var code = it.inst.data._qr, nom = overviewRowTitle(it), bat = it.inst.data.batiment || '';
    var bloc = { stack: [], absolutePosition: { x: x, y: y } };
    if (pos === 0 && i > 0) bloc.pageBreak = 'before';
    // Largeurs fixes : sinon un libellé long déborde sur l'étiquette voisine
    var lw = P.w - 16, qrw = 70, tw = lw - qrw - 6;
    var typeLib = it.type.label.replace(/\s*\(.*\)\s*$/, '');
    bloc.stack.push({
      columns: [
        { width: qrw, stack: [{ qr: qrUrl(code), fit: qrw, eccLevel: 'M' }] },
        { width: tw, margin: [6, 0, 0, 0], stack: [
          { text: 'SOCOTEC · Aération', fontSize: 6.5, color: '#0082DE', bold: true },
          { text: typeLib.length > 34 ? typeLib.slice(0, 33) + '…' : typeLib, fontSize: 7, color: '#333333', margin: [0, 2, 0, 0] },
          bat ? { text: bat.length > 34 ? bat.slice(0, 33) + '…' : bat, fontSize: 6.5, color: '#555555', margin: [0, 1, 0, 0] } : { text: '' },
          { text: 'Réf. ' + code.slice(0, 4) + '-' + code.slice(4), fontSize: 6.5, color: '#777777', margin: [0, 3, 0, 0] }
        ] }
      ],
      margin: [8, 7, 8, 0]
    });
    // Nom de l'installation en gros, sous le QR : là où coller l'étiquette
    bloc.stack.push({ columns: [{ width: lw, text: nom.length > 52 ? nom.slice(0, 50) + '…' : nom, fontSize: 10.5, bold: true, lineHeight: 0.95 }], margin: [8, 3, 8, 0] });
    content.push(bloc);
  });
  return {
    pageSize: 'A4', pageMargins: [0, 0, 0, 0],
    info: { title: 'Étiquettes QR — ' + site },
    defaultStyle: { font: (typeof pdfMake !== 'undefined' && pdfMake.fonts && pdfMake.fonts.Arial) ? 'Arial' : 'Roboto' },
    content: content.length ? content : [{ text: 'Aucune installation.' }]
  };
}

function imprimerEtiquettesQr() {
  var m = getCurrentMission();
  if (!m) return;
  var items = overviewOrderedItems(m);
  if (!items.length) { alert('Aucune installation dans cette mission : ajoutez-les d’abord (ou chargez le site précédent).'); return; }
  var nouveaux = items.filter(function (it) { return !it.inst.data._qr; }).length;
  var used = qrCodesUtilises();
  items.forEach(function (it) { qrCodeInstallation(it.inst, used); });
  if (nouveaux) persistMissions();
  ensureLib('pdf').then(function () {
    var site = (m.clientSite || 'site').replace(/[^a-zA-Z0-9à-ÿ _-]/g, '').replace(/\s+/g, '_').slice(0, 40);
    pdfMake.createPdf(qrEtiquettesDocDefinition(m, items)).download('Etiquettes_QR_' + site + '.pdf');
    alert(items.length + ' étiquette(s) sur ' + Math.ceil(items.length / (QR_PLANCHE.cols * QR_PLANCHE.rows)) + ' planche(s) A4.\n\n' +
      'À imprimer à 100 % (sans ajustement) sur des étiquettes 63,5 × 38,1 mm (3 × 7 par page, type Avery L7160), ou sur papier puis découper.\n\n' +
      'Sur site, collez chaque étiquette sur l’installation dont le nom figure dessous. L’an prochain, scannez-la pour ouvrir directement sa fiche.');
  }).catch(function (err) { alert(err.message); });
}

// ————————————————————————————————————————————
// Ouverture d'une installation à partir d'un code
// ————————————————————————————————————————————

function qrTrouver(code) {
  var trouve = [];
  (state.missions || []).forEach(function (m) {
    Object.keys(m.installations || {}).forEach(function (t) {
      (m.installations[t] || []).forEach(function (inst, idx) {
        if (inst.data && inst.data._qr === code) trouve.push({ m: m, typeId: t, idx: idx });
      });
    });
  });
  var cur = state.currentMissionId;
  trouve.sort(function (a, b) {
    if ((a.m.id === cur) !== (b.m.id === cur)) return a.m.id === cur ? -1 : 1;
    return String(b.m.createdAt || '').localeCompare(String(a.m.createdAt || ''));
  });
  return trouve[0] || null;
}

function qrOuvrirCode(texte) {
  var code = qrExtraireCode(texte);
  if (!code) { alert('Code non reconnu. Une étiquette Contrôle aération porte une référence de 8 caractères (ex. ABCD-2345).'); return false; }
  var r = qrTrouver(code);
  if (!r) {
    alert('Étiquette ' + code.slice(0, 4) + '-' + code.slice(4) + ' inconnue sur ce téléphone.\n\n' +
      'Ouvrez ou importez d’abord la mission de ce site (ou « Charger un site précédent »), puis scannez à nouveau.');
    return false;
  }
  if (r.m.id !== state.currentMissionId && state.currentMissionId && !confirm('Cette étiquette appartient à la mission « ' + (r.m.clientSite || 'sans nom') + ' ». L’ouvrir ?')) return false;
  state.currentMissionId = r.m.id;
  openOverviewInstallation(r.typeId, r.idx);
  return true;
}

// ————————————————————————————————————————————
// Scanner intégré (caméra + BarcodeDetector, Chrome Android) avec repli sur la saisie du code
// ————————————————————————————————————————————

var _qrScan = null;

function renderQrScanBouton(m) {
  if (!qrMissionALesEtiquettes(m)) return '';
  return '<button type="button" class="btn btn-primary qr-scan-btn" onclick="qrScannerOuvrir();">' + QR_ICON + ' Scanner l’étiquette d’une installation</button>';
}

function qrScannerOuvrir() {
  qrScannerFermer();
  var root = document.createElement('div');
  root.id = 'qr-scanner';
  root.className = 'qr-scanner';
  var dispo = typeof window.BarcodeDetector !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  root.innerHTML = '<div class="qr-scanner-boite">' +
    '<div class="qr-scanner-titre">' + QR_ICON + ' Scanner une étiquette</div>' +
    (dispo ? '<div class="qr-video-cadre"><video id="qr-video" playsinline muted></video><div class="qr-viseur"></div></div><p class="subtitle" id="qr-scan-etat">Visez le QR code de l’étiquette…</p>'
      : '<p class="subtitle">Le scanner intégré n’est pas disponible sur ce navigateur. Utilisez l’appareil photo du téléphone : l’étiquette ouvre directement l’installation. Ou tapez la référence imprimée sous le QR :</p>') +
    '<div class="qr-saisie"><input type="text" class="input" id="qr-code-saisi" placeholder="Référence (ex. ABCD-2345)" autocapitalize="characters" maxlength="12">' +
    '<button type="button" class="btn btn-gray btn-small" onclick="qrValiderSaisie();">Ouvrir</button></div>' +
    '<button type="button" class="btn btn-gray" onclick="qrScannerFermer();">Fermer</button></div>';
  document.body.appendChild(root);
  if (!dispo) return;
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (stream) {
    var video = document.getElementById('qr-video');
    if (!video) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
    video.srcObject = stream;
    video.play();
    var detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    _qrScan = { stream: stream, timer: null };
    var boucle = function () {
      if (!_qrScan) return;
      detector.detect(video).then(function (codes) {
        var c = codes && codes[0] && codes[0].rawValue;
        if (c && qrExtraireCode(c)) {
          if (navigator.vibrate) navigator.vibrate(80);
          qrScannerFermer();
          qrOuvrirCode(c);
          return;
        }
        if (_qrScan) _qrScan.timer = setTimeout(boucle, 250);
      }).catch(function () { if (_qrScan) _qrScan.timer = setTimeout(boucle, 400); });
    };
    boucle();
  }).catch(function () {
    var etat = document.getElementById('qr-scan-etat');
    if (etat) etat.textContent = 'Caméra non autorisée : autorisez-la dans le navigateur, ou tapez la référence imprimée sous le QR.';
  });
}

function qrValiderSaisie() {
  var input = document.getElementById('qr-code-saisi');
  var v = input ? input.value : '';
  if (!qrExtraireCode(v)) { alert('Référence non reconnue (8 caractères, ex. ABCD-2345).'); return; }
  qrScannerFermer();
  qrOuvrirCode(v);
}

function qrScannerFermer() {
  if (_qrScan) {
    if (_qrScan.timer) clearTimeout(_qrScan.timer);
    _qrScan.stream.getTracks().forEach(function (t) { t.stop(); });
    _qrScan = null;
  }
  var el = typeof document !== 'undefined' && document.getElementById && document.getElementById('qr-scanner');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// Appli ouverte par l'appareil photo du téléphone (adresse ?qr=CODE) : on ouvre l'installation
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('load', function () {
    var m = /[?&]qr=([A-Za-z2-9]{8})\b/.exec(location.search || '');
    if (!m) return;
    try { history.replaceState(history.state, '', location.pathname); } catch (e) {}
    setTimeout(function () { qrOuvrirCode(m[1]); }, 50);
  });
}

console.log('✓ Étiquettes QR chargées');
