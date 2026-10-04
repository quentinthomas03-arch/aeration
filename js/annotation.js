// annotation.js - Annoter une photo d'installation (chantier du 2026-10-04)
//
// Sur une photo, le technicien entoure ou flèche le défaut au doigt (bouche encrassée, gaine écrasée,
// filtre colmaté) et ajoute un court texte. La photo annotée remplace la photo dans la fiche et dans le
// rapport ; l'original est conservé à part (photo.orig) avec les tracés (photo.annot) pour pouvoir
// reprendre l'annotation plus tard, sans dégrader l'image à chaque retouche.
//
// Tracés en coordonnées relatives à l'image (0..1) : { t: 'cercle'|'fleche'|'trait'|'texte', c, p: [[x,y]…], s }.

var ANNOT_COULEURS = ['#e5484d', '#facc15', '#ffffff'];
var ANNOT_OUTILS = [
  { t: 'cercle', nom: 'Entourer', icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><ellipse cx="12" cy="12" rx="9" ry="7"/></svg>' },
  { t: 'fleche', nom: 'Flèche', icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20L19 5M11 5h8v8"/></svg>' },
  { t: 'trait', nom: 'Dessin', icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 17c3-6 5 2 8-3s5-6 10-4"/></svg>' },
  { t: 'texte', nom: 'Texte', icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 6V4h14v2M12 4v16M9 20h6"/></svg>' }
];

var _annot = null; // { typeId, key, photoId, img, formes, outil, couleur, enCours }

function annotPhotoRef(typeId, key, photoId) {
  var m = getCurrentMission(), inst = m && m.installations[typeId] && m.installations[typeId][state.currentInstIndex];
  var photos = inst && Array.isArray(inst.data[key]) ? inst.data[key] : [];
  return { inst: inst, p: photos.filter(function (x) { return x.id === photoId; })[0] || null };
}

function annoterPhoto(typeId, key, photoId) {
  var ref = annotPhotoRef(typeId, key, photoId);
  if (!ref.p) return;
  var source = ref.p.orig || ref.p.id;
  getPhotoBlob(source).then(function (b) {
    if (!b && ref.p.orig) return getPhotoBlob(ref.p.id);
    return b;
  }).then(function (blob) {
    if (!blob) { alert('Photo introuvable sur ce téléphone.'); return; }
    var url = URL.createObjectURL(blob), img = new Image();
    img.onload = function () {
      _annot = { typeId: typeId, key: key, photoId: photoId, img: img, url: url,
        formes: JSON.parse(JSON.stringify((ref.p.orig && ref.p.annot) || [])), outil: 'cercle', couleur: ANNOT_COULEURS[0], enCours: null };
      annotAfficher();
    };
    img.onerror = function () { URL.revokeObjectURL(url); alert('Photo illisible.'); };
    img.src = url;
  });
}

function annotAfficher() {
  var root = document.getElementById('annot-root');
  if (!root) { root = document.createElement('div'); root.id = 'annot-root'; document.body.appendChild(root); }
  var a = _annot;
  var h = '<div class="annot-ecran"><div class="annot-barre">' +
    '<button type="button" class="annot-btn" onclick="annotFermer(false);">Annuler</button><b>Annoter la photo</b>' +
    '<button type="button" class="annot-btn annot-ok" onclick="annotFermer(true);">Enregistrer</button></div>' +
    '<div class="annot-zone"><canvas id="annot-canvas"></canvas></div><div class="annot-outils">';
  ANNOT_OUTILS.forEach(function (o) {
    h += '<button type="button" class="annot-outil' + (a.outil === o.t ? ' active' : '') + '" onclick="_annot.outil=\'' + o.t + '\';annotAfficher();">' + o.icone + '<span>' + o.nom + '</span></button>';
  });
  h += '</div><div class="annot-outils">';
  ANNOT_COULEURS.forEach(function (c) {
    h += '<button type="button" class="annot-couleur' + (a.couleur === c ? ' active' : '') + '" style="background:' + c + ';" onclick="_annot.couleur=\'' + c + '\';annotAfficher();"></button>';
  });
  h += '<button type="button" class="annot-outil" onclick="_annot.formes.pop();annotDessiner();"' + '>↶<span>Retour</span></button>';
  h += '<button type="button" class="annot-outil" onclick="if(confirm(\'Effacer toutes les annotations ?\')){_annot.formes=[];annotDessiner();}">✕<span>Tout effacer</span></button>';
  h += '</div></div>';
  root.innerHTML = h;
  var canvas = document.getElementById('annot-canvas');
  var zone = canvas.parentNode, W = a.img.naturalWidth, H = a.img.naturalHeight;
  var maxW = zone.clientWidth || 360, maxH = zone.clientHeight || 480;
  var k = Math.min(maxW / W, maxH / H);
  canvas.width = Math.round(W * k); canvas.height = Math.round(H * k);
  canvas.onpointerdown = annotDebut;
  annotDessiner();
}

// Dessin de toutes les formes sur un contexte de taille w × h
function annotRendu(ctx, w, h, img, formes) {
  ctx.drawImage(img, 0, 0, w, h);
  var ep = Math.max(3, w * 0.008);
  formes.forEach(function (f) {
    ctx.save();
    ctx.strokeStyle = f.c; ctx.fillStyle = f.c; ctx.lineWidth = ep; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = ep * 1.2;
    var pts = f.p.map(function (q) { return [q[0] * w, q[1] * h]; });
    if (f.t === 'cercle' && pts.length >= 2) {
      var cx = (pts[0][0] + pts[1][0]) / 2, cy = (pts[0][1] + pts[1][1]) / 2;
      var rx = Math.max(ep, Math.abs(pts[1][0] - pts[0][0]) / 2), ry = Math.max(ep, Math.abs(pts[1][1] - pts[0][1]) / 2);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI); ctx.stroke();
    } else if (f.t === 'fleche' && pts.length >= 2) {
      var x1 = pts[0][0], y1 = pts[0][1], x2 = pts[1][0], y2 = pts[1][1], ang = Math.atan2(y2 - y1, x2 - x1), tete = ep * 4.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - tete * Math.cos(ang - 0.45), y2 - tete * Math.sin(ang - 0.45));
      ctx.lineTo(x2 - tete * Math.cos(ang + 0.45), y2 - tete * Math.sin(ang + 0.45));
      ctx.closePath(); ctx.fill();
    } else if (f.t === 'trait' && pts.length >= 2) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(function (q) { ctx.lineTo(q[0], q[1]); });
      ctx.stroke();
    } else if (f.t === 'texte' && f.s) {
      var taille = Math.max(14, w * 0.045);
      ctx.font = 'bold ' + Math.round(taille) + 'px Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.lineWidth = taille * 0.22; ctx.strokeStyle = f.c === '#ffffff' ? '#111111' : '#ffffff';
      ctx.strokeText(f.s, pts[0][0], pts[0][1]);
      ctx.fillText(f.s, pts[0][0], pts[0][1]);
    }
    ctx.restore();
  });
}

function annotDessiner() {
  var canvas = document.getElementById('annot-canvas');
  if (!canvas || !_annot) return;
  var formes = _annot.enCours ? _annot.formes.concat([_annot.enCours]) : _annot.formes;
  annotRendu(canvas.getContext('2d'), canvas.width, canvas.height, _annot.img, formes);
}

function annotPoint(ev, canvas) {
  var r = canvas.getBoundingClientRect();
  return [Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height))];
}

function annotDebut(ev) {
  var canvas = ev.currentTarget, a = _annot;
  if (!a) return;
  ev.preventDefault();
  var p0 = annotPoint(ev, canvas);
  if (a.outil === 'texte') {
    var s = prompt('Texte à afficher sur la photo :', '');
    if (s && s.trim()) { a.formes.push({ t: 'texte', c: a.couleur, p: [p0], s: s.trim().slice(0, 40) }); annotDessiner(); }
    return;
  }
  a.enCours = { t: a.outil, c: a.couleur, p: [p0, p0] };
  var move = function (mv) {
    var q = annotPoint(mv, canvas);
    if (a.outil === 'trait') a.enCours.p.push(q); else a.enCours.p[1] = q;
    annotDessiner();
  };
  var up = function () {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    var f = a.enCours;
    a.enCours = null;
    var d = Math.abs(f.p[f.p.length - 1][0] - f.p[0][0]) + Math.abs(f.p[f.p.length - 1][1] - f.p[0][1]);
    if (f.t === 'trait' ? f.p.length > 2 : d > 0.02) {
      if (f.t === 'trait') f.p = f.p.filter(function (q, i) { return i % 2 === 0 || i === f.p.length - 1; }); // allège le tracé
      a.formes.push(f);
    }
    annotDessiner();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

function annotFermer(enregistrer) {
  var a = _annot, root = document.getElementById('annot-root');
  _annot = null;
  if (root && root.parentNode) root.parentNode.removeChild(root);
  if (!a) return;
  if (!enregistrer) { URL.revokeObjectURL(a.url); return; }
  var ref = annotPhotoRef(a.typeId, a.key, a.photoId);
  if (!ref.p) { URL.revokeObjectURL(a.url); return; }
  // Image annotée en pleine résolution (celle de la photo enregistrée)
  var W = a.img.naturalWidth, H = a.img.naturalHeight;
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  annotRendu(c.getContext('2d'), W, H, a.img, a.formes);
  URL.revokeObjectURL(a.url);
  var p = ref.p, origPromise;
  if (!a.formes.length) {
    // Plus d'annotation : on remet l'original
    origPromise = p.orig ? getPhotoBlob(p.orig).then(function (b) {
      if (!b) return;
      var vieux = p.orig;
      return savePhotoBlob(p.id, b).then(function () { delete p.orig; delete p.annot; return deletePhotoBlob(vieux).catch(function () {}); });
    }) : Promise.resolve();
    origPromise.then(function () { annotApresEnregistrement(ref, p); });
    return;
  }
  // Première annotation : l'original est mis de côté sous un nouvel identifiant
  origPromise = p.orig ? Promise.resolve() : getPhotoBlob(p.id).then(function (b) {
    var id = generatePhotoId();
    return savePhotoBlob(id, b).then(function () { p.orig = id; });
  });
  origPromise.then(function () {
    return new Promise(function (resolve, reject) {
      c.toBlob(function (b) { if (b) resolve(b); else reject(new Error('Enregistrement de la photo annotée impossible')); }, 'image/jpeg', 0.85);
    });
  }).then(function (b) { return savePhotoBlob(p.id, b); }).then(function () {
    p.annot = a.formes;
    annotApresEnregistrement(ref, p);
  }).catch(function (err) { alert(err.message); });
}

function annotApresEnregistrement(ref, p) {
  if (typeof touchInstallation === 'function') touchInstallation(ref.inst);
  persistMissions();
  if (_photoObjectUrlCache[p.id]) { URL.revokeObjectURL(_photoObjectUrlCache[p.id]); delete _photoObjectUrlCache[p.id]; }
  render();
}

console.log('✓ Annotation des photos chargée');
