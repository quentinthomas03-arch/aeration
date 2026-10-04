// documents-joints.js - Plans, schémas et documents joints à la mission (chantier du 2026-10-04)
//
// Dans « Documents transmis », le technicien joint ce que le client lui remet : photos, images, PDF
// (plan du réseau d'aspiration d'une menuiserie, schéma de l'installateur, notice…). Chaque document
// peut être rattaché aux installations qu'il concerne, figure en annexe du rapport et revient à la
// visite suivante (un plan de réseau ne change pas d'une année sur l'autre).
//
// Un PDF est converti en images page par page à l'ajout (pdf.js, chargé à la demande) : le moteur du
// rapport (pdfmake) ne sait pas insérer un PDF, et des images s'affichent, s'exportent et se fusionnent
// comme les photos. Nombre de pages limité pour ne pas alourdir le rapport ni le stockage.
//
// Données : m.documentsJoints = [{ id, nom, source: 'image'|'pdf', pages: [photoId…], instIds: [],
// rapport: true }] ; images en IndexedDB comme les photos. Export .json : images embarquées dans
// m.imagesJointes = { photoId: dataUrl } (aussi utilisé par js/schemas.js pour le fond d'un schéma).

var DOC_MAX_PAGES = 12;
var DOC_PAGE_MAX_DIMENSION = 2000;
var DOC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg>';

if (typeof LAZY_LIBS !== 'undefined') {
  LAZY_LIBS.pdfjs = { label: 'Préparation de la lecture des PDF…', scripts: ['js/pdf.min.js'],
    ready: function () { return typeof pdfjsLib !== 'undefined'; } };
}

function missionDocsJoints(m) {
  if (!Array.isArray(m.documentsJoints)) m.documentsJoints = [];
  return m.documentsJoints;
}

function docJointById(m, id) {
  return missionDocsJoints(m).filter(function (d) { return d.id === id; })[0] || null;
}

// Installations de la mission, dans l'ordre de la vue d'ensemble, pour les rattachements
function docInstallationsList(m) {
  return (typeof overviewOrderedItems === 'function') ? overviewOrderedItems(m) : [];
}

function docInstallationLabel(it) {
  return it.type.label + ' — ' + overviewRowTitle(it) + (it.inst.data.batiment ? ' (' + it.inst.data.batiment + ')' : '');
}

function docInstallationsLabels(m, instIds) {
  var ids = instIds || [];
  return docInstallationsList(m).filter(function (it) { return ids.indexOf(it.inst.id) !== -1; }).map(docInstallationLabel);
}

// ————————————————————————————————————————————
// Écran « Entrées » : carte « Documents joints »
// ————————————————————————————————————————————

function renderDocumentsJointsSection(m) {
  var docs = missionDocsJoints(m);
  var h = '<div class="card docs-joints"><div class="section-title">Plans, schémas et documents joints</div>';
  h += '<p class="subtitle">Plan du réseau d’aspiration, schéma de l’installateur, notice… : photographiez-le ou joignez le fichier (image ou PDF). Il sera annexé au rapport et repris à la visite suivante.</p>';
  if (!docs.length) h += '<p class="subtitle docs-empty">Aucun document joint.</p>';
  docs.forEach(function (d) {
    var open = state.docJointOuvert === d.id;
    h += '<div class="doc-joint' + (open ? ' open' : '') + '">';
    h += '<div class="doc-joint-head" onclick="state.docJointOuvert=' + (open ? 'null' : '\'' + d.id + '\'') + ';render();">';
    h += d.pages[0] ? '<img class="doc-thumb" alt="" data-photo-src="' + escapeHtml(d.pages[0]) + '">' : '<span class="doc-thumb"></span>';
    var liees = docInstallationsLabels(m, d.instIds);
    h += '<div class="doc-joint-meta"><div class="doc-joint-nom">' + escapeHtml(d.nom) + '</div>' +
      '<div class="subtitle">' + (d.source === 'pdf' ? 'PDF · ' : '') + d.pages.length + ' page' + (d.pages.length > 1 ? 's' : '') +
      (d.rapport === false ? ' · hors rapport' : '') + (liees.length ? ' · ' + liees.length + ' installation' + (liees.length > 1 ? 's' : '') : '') + '</div></div>';
    h += '<span class="doc-joint-chevron">' + (open ? '▴' : '▾') + '</span></div>';
    if (open) h += renderDocJointDetail(m, d);
    h += '</div>';
  });
  h += '<div class="row docs-actions">';
  h += '<label class="btn btn-primary btn-small plan-add-label">' + DOC_ICON + ' Joindre une photo, une image ou un PDF' +
    '<input type="file" accept="image/*,application/pdf,.pdf" multiple style="display:none;" onchange="docJoindre(this);"></label>';
  if (typeof schemaNouveau === 'function') h += '<button type="button" class="btn btn-gray btn-small" onclick="schemaNouveau();">' + SCHEMA_ICON + ' Dessiner un schéma de réseau</button>';
  h += '</div>';
  if (typeof renderSchemasList === 'function') h += renderSchemasList(m);
  h += '</div>';
  return h;
}

function renderDocJointDetail(m, d) {
  var h = '<div class="doc-joint-detail">';
  h += '<div class="doc-pages">';
  d.pages.forEach(function (pid, i) {
    h += '<img class="doc-page" alt="Page ' + (i + 1) + '" data-photo-src="' + escapeHtml(pid) + '" onclick="openPhotoViewer(\'' + escapeHtml(pid) + '\');">';
  });
  h += '</div>';
  h += '<label class="doc-check"><input type="checkbox"' + (d.rapport !== false ? ' checked' : '') + ' onchange="docMaj(\'' + d.id + '\',\'rapport\',this.checked);"> Annexer au rapport</label>';
  var items = docInstallationsList(m);
  if (items.length) {
    h += '<div class="label" style="margin-top:8px;">Installations concernées</div><div class="doc-insts">';
    items.forEach(function (it) {
      var on = (d.instIds || []).indexOf(it.inst.id) !== -1;
      h += '<label class="doc-check"><input type="checkbox"' + (on ? ' checked' : '') + ' onchange="docLierInstallation(\'' + d.id + '\',\'' + it.type.id + '\',' + it.idx + ',this.checked);"> ' + escapeHtml(docInstallationLabel(it)) + '</label>';
    });
    h += '</div>';
  }
  h += '<div class="row" style="margin-top:10px;">';
  if (typeof schemaNouveau === 'function') h += '<button type="button" class="btn btn-gray btn-small" onclick="schemaNouveau(\'' + escapeHtml(d.pages[0] || '') + '\');">' + SCHEMA_ICON + ' Compléter ce plan</button>';
  h += '<button type="button" class="btn btn-gray btn-small" onclick="docRenommer(\'' + d.id + '\');">' + ICONS.edit + ' Renommer</button>';
  h += '<button type="button" class="btn btn-gray btn-small" onclick="docSupprimer(\'' + d.id + '\');">' + ICONS.trash + ' Supprimer</button>';
  h += '</div></div>';
  return h;
}

function docMaj(id, key, value) {
  var d = docJointById(getCurrentMission(), id);
  if (!d) return;
  d[key] = value;
  persistMissions();
  render();
}

function docLierInstallation(id, typeId, idx, on) {
  var m = getCurrentMission(), d = docJointById(m, id), inst = (m.installations[typeId] || [])[idx];
  if (!d || !inst || !inst.id) return;
  var instId = inst.id;
  d.instIds = (d.instIds || []).filter(function (x) { return x !== instId; });
  if (on) d.instIds.push(instId);
  persistMissions();
}

function docRenommer(id) {
  var d = docJointById(getCurrentMission(), id);
  if (!d) return;
  var nom = prompt('Nom du document (ex. « Réseau d’aspiration — menuiserie ») :', d.nom);
  if (nom === null || !String(nom).trim()) return;
  d.nom = String(nom).trim().slice(0, 80);
  persistMissions();
  render();
}

function docSupprimer(id) {
  var m = getCurrentMission(), d = docJointById(m, id);
  if (!d || !confirm('Supprimer « ' + d.nom + ' » ?')) return;
  m.documentsJoints = missionDocsJoints(m).filter(function (x) { return x.id !== id; });
  persistMissions();
  var refs = (typeof referencedPhotoIds === 'function') ? referencedPhotoIds() : {};
  d.pages.forEach(function (pid) { if (!refs[pid]) deletePhotoBlob(pid).catch(function () {}); });
  state.docJointOuvert = null;
  render();
}

// ————————————————————————————————————————————
// Ajout : images compressées, PDF convertis page par page
// ————————————————————————————————————————————

function docJoindre(input) {
  var files = Array.prototype.slice.call(input.files || []);
  input.value = '';
  if (!files.length) return;
  var m = getCurrentMission();
  var avertissements = [];
  files.reduce(function (p, file) {
    return p.then(function () {
      var isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      var job = isPdf ? docPdfEnImages(file, avertissements) : planCompresser(file).then(function (b) { return [b]; });
      return job.then(function (blobs) {
        var pages = blobs.map(function () { return generatePhotoId(); });
        return Promise.all(blobs.map(function (b, i) { return savePhotoBlob(pages[i], b); })).then(function () {
          var d = { id: 'dj_' + generateId(), nom: String(file.name || 'Document').replace(/\.[^.]+$/, '').slice(0, 80) || 'Document',
            source: isPdf ? 'pdf' : 'image', pages: pages, instIds: [], rapport: true };
          missionDocsJoints(m).push(d);
          state.docJointOuvert = d.id;
          persistMissions();
          render();
        });
      }).catch(function (err) { avertissements.push('« ' + file.name + ' » : ' + err.message); });
    });
  }, Promise.resolve()).then(function () {
    if (avertissements.length) alert(avertissements.join('\n\n'));
  });
}

function docPdfEnImages(file, avertissements) {
  return ensureLib('pdfjs').then(function () {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
    return file.arrayBuffer();
  }).then(function (buf) {
    // isEvalSupported: false — un PDF reçu d'un tiers ne doit jamais pouvoir exécuter de code
    return pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  }).then(function (pdf) {
    var n = Math.min(pdf.numPages, DOC_MAX_PAGES);
    if (pdf.numPages > DOC_MAX_PAGES) avertissements.push('« ' + file.name + ' » : ' + pdf.numPages + ' pages, seules les ' + DOC_MAX_PAGES + ' premières sont jointes.');
    var blobs = [];
    var next = function (i) {
      if (i > n) return Promise.resolve(blobs);
      return pdf.getPage(i).then(function (page) {
        var v1 = page.getViewport({ scale: 1 });
        var scale = Math.min(3, DOC_PAGE_MAX_DIMENSION / Math.max(v1.width, v1.height));
        var vp = page.getViewport({ scale: scale });
        var c = document.createElement('canvas');
        c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
        // intent 'print' : rendu d'une traite, sans requestAnimationFrame (qui s'arrête si l'appli
        // passe en arrière-plan pendant la conversion) ; imprime aussi les champs de formulaire
        return page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise.then(function () {
          return new Promise(function (resolve, reject) {
            c.toBlob(function (b) { if (b) resolve(b); else reject(new Error('Conversion de la page ' + i + ' échouée')); }, 'image/jpeg', 0.82);
          });
        });
      }).then(function (b) { blobs.push(b); return next(i + 1); });
    };
    return next(1);
  }).catch(function (err) {
    throw new Error(/password/i.test(err && err.name || '') ? 'PDF protégé par un mot de passe.' : (err && err.message) || 'PDF illisible.');
  });
}

// Identifiants réutilisés dans des attributs onclick : un fichier .json reçu d'un tiers ne doit pas
// pouvoir y glisser de code (appelé par normalizeMission, js/state.js)
var DOC_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
function docsNormaliser(m) {
  var ok = function (id) { return typeof id === 'string' && DOC_ID_RE.test(id); };
  // Identifiant d'installation : nombre (generateId) ou texte (anciennes missions), jamais injecté dans la page
  var instIdOk = function (id) { return (typeof id === 'number' && isFinite(id)) || (typeof id === 'string' && id.length < 80); };
  if (Array.isArray(m.plans)) m.plans = m.plans.filter(function (p) { return p && ok(p.id) && (!p.photoId || ok(p.photoId)); });
  if (m.documentsJoints !== undefined) {
    m.documentsJoints = (Array.isArray(m.documentsJoints) ? m.documentsJoints : []).filter(function (d) { return d && ok(d.id) && Array.isArray(d.pages); });
    m.documentsJoints.forEach(function (d) {
      d.nom = String(d.nom || 'Document').slice(0, 80);
      d.pages = d.pages.filter(ok);
      d.instIds = (Array.isArray(d.instIds) ? d.instIds : []).filter(instIdOk);
    });
  }
  if (m.schemas !== undefined) {
    m.schemas = (Array.isArray(m.schemas) ? m.schemas : []).filter(function (s) { return s && ok(s.id); });
    m.schemas.forEach(function (s) {
      s.nom = String(s.nom || 'Schéma').slice(0, 80);
      s.ratio = Math.min(2, Math.max(0.3, Number(s.ratio) || 0.7));
      if (s.fondPhotoId && !ok(s.fondPhotoId)) s.fondPhotoId = null;
      var num = function (v) { v = Number(v); return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5; };
      s.elements = (Array.isArray(s.elements) ? s.elements : []).filter(function (e) { return e && ok(e.id) && typeof e.k === 'string'; })
        .map(function (e) { return { id: e.id, k: e.k, x: num(e.x), y: num(e.y), t: String(e.t || '').slice(0, 40), inst: instIdOk(e.inst) ? e.inst : null }; });
      s.liens = (Array.isArray(s.liens) ? s.liens : []).filter(function (l) { return l && ok(l.id) && typeof l.a === 'string' && typeof l.b === 'string'; });
    });
  }
}

// ————————————————————————————————————————————
// Export / import / suppression (js/photos.js), visite suivante (js/state.js), fusion (js/fusion.js)
// ————————————————————————————————————————————

// Toutes les images rattachées à la mission hors photos d'installations et plans du site
function docsPhotoIds(m) {
  var ids = [];
  missionDocsJoints(m).forEach(function (d) { (d.pages || []).forEach(function (p) { if (p) ids.push(p); }); });
  if (Array.isArray(m.schemas)) m.schemas.forEach(function (s) { if (s && s.fondPhotoId) ids.push(s.fondPhotoId); });
  return ids;
}

function docsImagesForExport(clone) {
  var ids = docsPhotoIds(clone).filter(function (id, i, a) { return a.indexOf(id) === i; });
  if (!ids.length) return Promise.resolve();
  clone.imagesJointes = {};
  return Promise.all(ids.map(function (id) {
    return getPhotoBlob(id).then(function (b) { return b ? blobToDataUrl(b) : null; })
      .then(function (u) { if (u) clone.imagesJointes[id] = u; }).catch(function () {});
  }));
}

// Images réécrites en IndexedDB sous des identifiants neufs (comme les photos), références remises à jour
function docsImagesFromImport(mission) {
  var emb = mission.imagesJointes;
  delete mission.imagesJointes;
  if (!emb || typeof emb !== 'object') return Promise.resolve();
  var map = {};
  return Promise.all(Object.keys(emb).map(function (oldId) {
    var u = emb[oldId];
    if (typeof u !== 'string' || u.indexOf('data:image/') !== 0) return null;
    var id = generatePhotoId();
    return fetch(u).then(function (r) { return r.blob(); }).then(function (b) { return savePhotoBlob(id, b); })
      .then(function () { map[oldId] = id; }).catch(function () {});
  })).then(function () {
    missionDocsJoints(mission).forEach(function (d) { d.pages = (d.pages || []).map(function (p) { return map[p] || p; }); });
    if (Array.isArray(mission.schemas)) mission.schemas.forEach(function (s) { if (s.fondPhotoId && map[s.fondPhotoId]) s.fondPhotoId = map[s.fondPhotoId]; });
  });
}

// Visite suivante : documents et schémas repris, rattachements remis sur les nouvelles installations
function docsReprendrePourVisiteSuivante(m, source, idMap) {
  var remap = function (id) { return idMap[id]; };
  m.documentsJoints = JSON.parse(JSON.stringify(source.documentsJoints || [])).map(function (d) {
    d.instIds = (d.instIds || []).map(remap).filter(Boolean);
    return d;
  });
  m.schemas = JSON.parse(JSON.stringify(source.schemas || [])).map(function (s) {
    (s.elements || []).forEach(function (e) { if (e.inst) e.inst = remap(e.inst) || null; });
    return s;
  });
}

function docsFusionner(target, incoming) {
  ['documentsJoints', 'schemas'].forEach(function (k) {
    (incoming[k] || []).forEach(function (x) {
      if (!Array.isArray(target[k])) target[k] = [];
      if (!target[k].some(function (y) { return y.id === x.id; })) target[k].push(JSON.parse(JSON.stringify(x)));
    });
  });
}

// ————————————————————————————————————————————
// Rapport PDF : « 3.3 Documents joints » (liste) et annexe avec les pages
// ————————————————————————————————————————————

function docsPourRapport(m) {
  return missionDocsJoints(m).filter(function (d) { return d.rapport !== false && d.pages && d.pages.length; });
}

// Pages en data URL avec leurs dimensions (orientation de la page du rapport)
function docImageAsset(photoId) {
  return getPhotoBlob(photoId).then(function (b) { return b ? blobToDataUrl(b) : null; }).then(function (u) {
    if (!u) return null;
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve({ url: u, w: img.naturalWidth || 1, h: img.naturalHeight || 1 }); };
      img.onerror = function () { resolve(null); };
      img.src = u;
    });
  }).catch(function () { return null; });
}

function buildDocsJointsAssets(m) {
  var out = {};
  if (typeof document === 'undefined') return Promise.resolve(out);
  var ids = [];
  docsPourRapport(m).forEach(function (d) { ids = ids.concat(d.pages); });
  return Promise.all(ids.map(function (id) { return docImageAsset(id).then(function (a) { if (a) out[id] = a; }); }))
    .then(function () { return out; });
}

function pdfDocsCell(t, o) {
  return Object.assign({ text: t === undefined || t === null || t === '' ? '-' : String(t), fontSize: 8, margin: [3, 2, 3, 2] }, o || {});
}
var PDF_DOCS_LAYOUT = { hLineColor: function () { return '#B7D7F0'; }, vLineColor: function () { return '#B7D7F0'; },
  hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } };

function pdfBuildDocsJointsListe(m, numAnnexe) {
  var docs = docsPourRapport(m);
  if (!docs.length) return [];
  var head = function (t) { return pdfDocsCell(t, { bold: true, color: 'white', fillColor: '#0082DE' }); };
  var body = [[head('N°'), head('Document'), head('Pages'), head('Installations concernées')]];
  docs.forEach(function (d, i) {
    body.push([pdfDocsCell(i + 1, { alignment: 'center', bold: true }), pdfDocsCell(d.nom + (d.source === 'pdf' ? ' (PDF)' : '')),
      pdfDocsCell(d.pages.length, { alignment: 'center' }), pdfDocsCell(docInstallationsLabels(m, d.instIds).join('\n'))]);
  });
  return [
    Object.assign(pdfHeading2('3.3 DOCUMENTS JOINTS'), { margin: [0, 34, 0, 10] }),
    { text: 'Documents remis par le client ou établis sur site, reproduits en annexe' + (numAnnexe ? ' (' + numAnnexe + ')' : '') + '. SOCOTEC n’en garantit ni l’exactitude ni l’exhaustivité.', fontSize: 8.5, italics: true, margin: [0, 0, 0, 6] },
    { table: { headerRows: 1, widths: [24, '*', 40, '*'], body: body }, layout: PDF_DOCS_LAYOUT }
  ];
}

function pdfBuildDocsJointsAnnexe(m, titre) {
  var docs = docsPourRapport(m), assets = (typeof PDF_ASSETS !== 'undefined' && PDF_ASSETS.docs) || {};
  var content = [], first = true;
  docs.forEach(function (d, i) {
    d.pages.forEach(function (pid, p) {
      var a = assets[pid];
      if (!a) return;
      var landscape = a.w > a.h;
      var page = { stack: [], pageBreak: 'before', pageOrientation: landscape ? 'landscape' : 'portrait' };
      if (first) { page.stack.push(pdfTocMarker(titre, 2)); first = false; }
      page.stack.push({ text: titre + ' — Document n° ' + (i + 1) + ' : ' + d.nom + (d.pages.length > 1 ? ' (page ' + (p + 1) + '/' + d.pages.length + ')' : ''),
        bold: true, color: '#00B0F0', fontSize: 10.5, margin: [0, 30, 0, 8] });
      page.stack.push({ image: a.url, fit: landscape ? [770, 450] : [520, 700], alignment: 'center' });
      content.push(page);
    });
  });
  return content;
}

console.log('✓ Documents joints chargés');
