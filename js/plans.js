// plans.js - Plan du site avec les installations épinglées (chantier du 2026-10-04)
//
// Le technicien photographie le plan d'évacuation (ou importe le plan du client) et touche le plan
// pour placer chaque installation. Les épingles prennent la couleur de l'avis ; toucher une épingle
// ouvre la fiche. Le plan et les épingles suivent la mission partout : transfert .json, fusion,
// préremplissage de la visite suivante (« Charger un site précédent »), et page « Plan du site » du
// rapport PDF. Utile surtout l'année suivante, ou pour un technicien qui ne connaît pas le site.
//
// Données : m.plans = [{ id, nom, photoId } | { id, nom, svg }] (image du plan en IndexedDB comme les
// photos, ou SVG pour la mission de démonstration) ; position d'une installation dans
// inst.data._plan = { id: planId, x, y } (x, y entre 0 et 1, relatifs à l'image). Préfixe « _ » :
// méta-donnée, jamais un champ du rapport. Un SVG est toujours affiché via <img> (jamais injecté dans
// la page) : un fichier .json reçu d'un tiers ne peut donc pas exécuter de script.

var PLAN_MAX_DIMENSION = 2200;
var PLAN_PIN_COLORS = { 'status-ok': '#16a34a', 'status-bad': '#e5484d', 'status-warn': '#d97706', 'status-muted': '#8a94a3' };
var PLAN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>';

function missionPlans(m) {
  if (!Array.isArray(m.plans)) m.plans = [];
  return m.plans;
}

function planImageSrc(plan) {
  if (plan.svg) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(plan.svg);
  return '';
}

// Installations de la mission placées sur un plan, dans l'ordre de la vue d'ensemble : leur rang
// donne le numéro de l'épingle (le même dans l'appli et dans le rapport).
function planPlacedItems(m, planId) {
  var items = (typeof overviewOrderedItems === 'function') ? overviewOrderedItems(m) : [];
  return items.filter(function (it) { var p = it.inst.data && it.inst.data._plan; return p && p.id === planId; })
    .map(function (it, i) { return { it: it, n: i + 1, x: it.inst.data._plan.x, y: it.inst.data._plan.y }; });
}

function currentPlan(m) {
  var plans = missionPlans(m);
  if (!plans.length) return null;
  return plans.filter(function (p) { return p.id === state.planCourant; })[0] || plans[0];
}

// ————————————————————————————————————————————
// Vue « Plan » de la vue d'ensemble
// ————————————————————————————————————————————

function renderPlanView(m, items) {
  var plans = missionPlans(m);
  var h = '';
  if (!plans.length) {
    return '<div class="card plan-empty"><div class="plan-empty-icon">' + PLAN_ICON + '</div>' +
      '<p><b>Aucun plan pour ce site.</b></p><p class="subtitle">Prenez en photo le plan d’évacuation affiché sur place, ou importez le plan fourni par le client, puis placez chaque installation d’un toucher. L’année suivante, le plan et les emplacements seront repris.</p>' +
      planAddButtonHtml('btn btn-primary') + '</div>' + planSchemasBlock(m);
  }
  var plan = currentPlan(m);
  state.planCourant = plan.id;
  var placed = planPlacedItems(m, plan.id);
  var placing = state.planPlacement && state.planPlacement.planId === plan.id;

  h += '<div class="plan-tabs">';
  plans.forEach(function (p) {
    h += '<button type="button" class="home-filter' + (p.id === plan.id ? ' active' : '') + '" onclick="state.planCourant=\'' + p.id + '\';state.planPlacement=null;render();">' + escapeHtml(p.nom) + '</button>';
  });
  h += planAddButtonHtml('home-filter plan-add') + '</div>';

  h += '<div class="plan-stage' + (placing ? ' placing' : '') + '" onclick="planStageClick(event,\'' + plan.id + '\');">';
  h += plan.photoId ? '<img class="plan-img" alt="" data-photo-src="' + escapeHtml(plan.photoId) + '">' : '<img class="plan-img" alt="" src="' + planImageSrc(plan) + '">';
  placed.forEach(function (p) {
    var sel = placing && state.planPlacement.key === p.it.type.id + ':' + p.it.idx;
    h += '<button type="button" class="plan-pin ' + p.it.status.cls + (sel ? ' selected' : '') + '" style="left:' + (p.x * 100).toFixed(2) + '%;top:' + (p.y * 100).toFixed(2) + '%;" ' +
      'title="' + escapeHtml(p.it.type.label + ' — ' + overviewRowTitle(p.it)) + '" onclick="event.stopPropagation();planPinClick(\'' + p.it.type.id + '\',' + p.it.idx + ',\'' + plan.id + '\');">' + p.n + '</button>';
  });
  h += '</div>';

  if (placing) {
    var cible = items.filter(function (it) { return it.type.id + ':' + it.idx === state.planPlacement.key; })[0];
    h += '<div class="plan-placing-bar">' + (cible ? 'Touchez le plan à l’emplacement de : <b>' + escapeHtml(cible.type.label + ' — ' + overviewRowTitle(cible)) + '</b>' : 'Choisissez une installation à placer') + '</div>';
    h += '<select class="input" onchange="state.planPlacement.key=this.value;render();">';
    var nonPlacees = items.filter(function (it) { return !(it.inst.data._plan); });
    var opt = function (it, suffixe) {
      var k = it.type.id + ':' + it.idx;
      return '<option value="' + k + '"' + (k === state.planPlacement.key ? ' selected' : '') + '>' + escapeHtml(it.type.label + ' — ' + overviewRowTitle(it) + (it.inst.data.batiment ? ' (' + it.inst.data.batiment + ')' : '') + suffixe) + '</option>';
    };
    h += '<option value="">—</option>';
    if (nonPlacees.length) h += '<optgroup label="À placer (' + nonPlacees.length + ')">' + nonPlacees.map(function (it) { return opt(it, ''); }).join('') + '</optgroup>';
    var deja = items.filter(function (it) { return it.inst.data._plan; });
    if (deja.length) h += '<optgroup label="Déjà placées (déplacer)">' + deja.map(function (it) { return opt(it, ' ✓'); }).join('') + '</optgroup>';
    h += '</select>';
    if (typeof creationRapideHtml === 'function') h += creationRapideHtml(m, 'plan', m.typesSelectionnes || []);
    h += '<div class="row" style="margin-top:8px;">';
    if (cible && cible.inst.data._plan) h += '<button class="btn btn-gray btn-small" onclick="planRetirer();">Retirer du plan</button>';
    h += '<button class="btn btn-primary btn-small" onclick="state.planPlacement=null;render();">' + ICONS.check + ' Terminer le placement</button></div>';
  } else {
    h += '<p class="subtitle plan-info">' + placed.length + ' installation(s) placée(s) sur ce plan sur ' + items.length + '. Touchez une épingle pour ouvrir sa fiche.</p>';
    h += '<div class="row plan-actions">';
    h += '<button class="btn btn-primary btn-small" onclick="planDemarrerPlacement(\'' + plan.id + '\');">' + PLAN_ICON + ' Placer des installations</button>';
    h += '<button class="btn btn-gray btn-small" onclick="planRenommer(\'' + plan.id + '\');">' + ICONS.edit + ' Renommer</button>';
    h += '<button class="btn btn-gray btn-small" onclick="planSupprimer(\'' + plan.id + '\');">' + ICONS.trash + ' Supprimer</button></div>';
  }
  return h + (placing ? '' : planSchemasBlock(m));
}

// Raccourci vers les schémas de réseau (js/schemas.js), aussi accessibles depuis les données de la mission
function planSchemasBlock(m) {
  if (typeof schemaNouveau !== 'function') return '';
  return '<div class="card plan-schemas"><div class="section-title">' + SCHEMA_ICON + ' Schémas de réseau</div>' +
    '<p class="subtitle">Pas de plan du réseau d’aspiration ou d’extraction ? Dessinez-le sur place : postes, gaines, filtre, ventilateur, rejet… et reliez chaque poste à son installation.</p>' +
    renderSchemasList(m) +
    '<button type="button" class="btn btn-primary btn-small" onclick="schemaNouveau();">' + ICONS.plus + ' Dessiner un schéma de réseau</button></div>';
}

function planAddButtonHtml(cls) {
  return '<label class="' + cls + ' plan-add-label">' + ICONS.plus + ' Ajouter un plan' +
    '<input type="file" accept="image/*" style="display:none;" onchange="planAjouter(this);"></label>';
}

function planDemarrerPlacement(planId) {
  var m = getCurrentMission();
  var items = overviewOrderedItems(m);
  var premiere = items.filter(function (it) { return !it.inst.data._plan; })[0];
  state.planPlacement = { planId: planId, key: premiere ? premiere.type.id + ':' + premiere.idx : '' };
  render();
}

function planInstFromKey(m, key) {
  var parts = String(key || '').split(':');
  var list = m.installations[parts[0]];
  return list ? list[parseInt(parts[1], 10)] : null;
}

// Toucher le plan en mode placement : pose l'épingle de l'installation choisie, puis passe à la
// suivante non placée (placement d'un site entier en quelques touchers)
function planStageClick(ev, planId) {
  var p = state.planPlacement;
  if (!p || p.planId !== planId || !p.key) return;
  var m = getCurrentMission(), inst = planInstFromKey(m, p.key);
  if (!inst) return;
  var img = ev.currentTarget.querySelector('.plan-img');
  var r = (img || ev.currentTarget).getBoundingClientRect();
  var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  inst.data._plan = { id: planId, x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 };
  if (typeof touchInstallation === 'function') touchInstallation(inst);
  persistMissions();
  var suivante = overviewOrderedItems(m).filter(function (it) { return !it.inst.data._plan; })[0];
  p.key = suivante ? suivante.type.id + ':' + suivante.idx : '';
  render();
}

function planPinClick(typeId, idx, planId) {
  if (state.planPlacement && state.planPlacement.planId === planId) {
    state.planPlacement.key = typeId + ':' + idx; // sélectionne l'installation pour la déplacer
    render();
    return;
  }
  openOverviewInstallation(typeId, idx);
}

function planRetirer() {
  var m = getCurrentMission(), inst = planInstFromKey(m, state.planPlacement && state.planPlacement.key);
  if (!inst) return;
  delete inst.data._plan;
  persistMissions();
  render();
}

function planAjouter(input) {
  var file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  var m = getCurrentMission();
  planCompresser(file).then(function (blob) {
    var photoId = generatePhotoId();
    return savePhotoBlob(photoId, blob).then(function () {
      var plans = missionPlans(m);
      var plan = { id: 'pl_' + generateId(), nom: plans.length ? 'Plan ' + (plans.length + 1) : 'Plan du site', photoId: photoId };
      plans.push(plan);
      state.planCourant = plan.id;
      state.overviewMode = 'plan';
      persistMissions();
      render();
    });
  }).catch(function (err) { alert('Impossible d’ajouter le plan :\n\n' + err.message); });
}

// Comme compressImageFile (js/photos.js), mais en plus grand : un plan doit rester lisible
function planCompresser(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var scale = Math.min(1, PLAN_MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * scale)); c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(function (b) { if (b) resolve(b); else reject(new Error('Compression du plan échouée')); }, 'image/jpeg', 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

function planRenommer(planId) {
  var m = getCurrentMission(), plan = missionPlans(m).filter(function (p) { return p.id === planId; })[0];
  if (!plan) return;
  var nom = prompt('Nom du plan (ex. « Bâtiment B — rez-de-chaussée ») :', plan.nom);
  if (nom === null || !String(nom).trim()) return;
  plan.nom = String(nom).trim().slice(0, 60);
  persistMissions();
  render();
}

function planSupprimer(planId) {
  var m = getCurrentMission(), plans = missionPlans(m);
  var plan = plans.filter(function (p) { return p.id === planId; })[0];
  if (!plan || !confirm('Supprimer ce plan ? Les installations qui y sont placées perdront leur emplacement.')) return;
  m.plans = plans.filter(function (p) { return p.id !== planId; });
  Object.keys(m.installations).forEach(function (t) {
    (m.installations[t] || []).forEach(function (inst) { if (inst.data && inst.data._plan && inst.data._plan.id === planId) delete inst.data._plan; });
  });
  persistMissions();
  if (plan.photoId && typeof referencedPhotoIds === 'function' && !referencedPhotoIds()[plan.photoId]) deletePhotoBlob(plan.photoId).catch(function () {});
  state.planPlacement = null;
  render();
}

// ————————————————————————————————————————————
// Images des plans : export / import / suppression (js/photos.js) et visite suivante (js/state.js)
// ————————————————————————————————————————————

function planPhotoIds(m) {
  return missionPlans(m).map(function (p) { return p.photoId; }).filter(Boolean);
}

// Export .json : image du plan embarquée en base64 à côté de sa référence (clone uniquement)
function planImagesForExport(clone) {
  return Promise.all(missionPlans(clone).map(function (p) {
    if (!p.photoId) return null;
    return getPhotoBlob(p.photoId).then(function (b) { return b ? blobToDataUrl(b) : null; })
      .then(function (u) { if (u) p.dataUrl = u; }).catch(function () {});
  }));
}

// Import .json : image réécrite en IndexedDB sous un identifiant neuf (même raison que les photos)
function planImagesFromImport(mission) {
  return Promise.all(missionPlans(mission).map(function (p) {
    if (!p.dataUrl) return null;
    var dataUrl = p.dataUrl, id = generatePhotoId();
    delete p.dataUrl;
    return fetch(dataUrl).then(function (r) { return r.blob(); })
      .then(function (b) { return savePhotoBlob(id, b); }).then(function () { p.photoId = id; }).catch(function () {});
  }));
}

// ————————————————————————————————————————————
// Rapport PDF : page « 4.2 Plan du site »
// ————————————————————————————————————————————

// Image du plan avec ses épingles numérotées, dessinée sur un canvas (navigateur uniquement)
function planCompositeDataUrl(m, plan) {
  var placed = planPlacedItems(m, plan.id);
  if (!placed.length) return Promise.resolve(null);
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  var srcP = plan.photoId ? getPhotoBlob(plan.photoId).then(function (b) { return b ? URL.createObjectURL(b) : null; }) : Promise.resolve(planImageSrc(plan));
  return srcP.then(function (src) {
    if (!src) return null;
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var W = Math.min(img.naturalWidth || 1600, 1800), H = Math.round(W * (img.naturalHeight || 1000) / (img.naturalWidth || 1600));
        canvas.width = W; canvas.height = H;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        var r = Math.max(14, W * 0.016);
        placed.forEach(function (p) {
          var x = p.x * W, y = p.y * H;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.fillStyle = PLAN_PIN_COLORS[p.it.status.cls] || PLAN_PIN_COLORS['status-muted']; ctx.fill();
          ctx.lineWidth = r * 0.22; ctx.strokeStyle = '#ffffff'; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.font = 'bold ' + Math.round(r * 1.05) + 'px Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(p.n), x, y + 1);
        });
        if (src.indexOf('blob:') === 0) URL.revokeObjectURL(src);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }).catch(function () { return null; });
}

function buildPlanComposites(m) {
  var out = {};
  if (typeof document === 'undefined') return Promise.resolve(out);
  return Promise.all(missionPlans(m).map(function (p) {
    return planCompositeDataUrl(m, p).then(function (u) { if (u) out[p.id] = u; });
  })).then(function () { return out; });
}

function pdfBuildPlansSite(m) {
  var content = [], first = true;
  var composites = (typeof PDF_ASSETS !== 'undefined' && PDF_ASSETS.plans) || {};
  missionPlans(m).forEach(function (plan) {
    var placed = planPlacedItems(m, plan.id);
    if (!placed.length || !composites[plan.id]) return;
    content.push({ text: first ? '4.2 PLAN DU SITE' : '', bold: true, color: '#00B0F0', fontSize: 12, margin: [0, 30, 0, 10],
      pageBreak: 'before', pageOrientation: 'portrait' });
    first = false;
    content.push({ text: plan.nom + ' — emplacement des installations contrôlées', bold: true, fontSize: 10.5, margin: [0, 0, 0, 8] });
    content.push({ image: composites[plan.id], fit: [540, 430], alignment: 'center', margin: [0, 0, 0, 10] });
    var cell = function (t, o) { return Object.assign({ text: t === undefined || t === null || t === '' ? '-' : String(t), fontSize: 8, margin: [3, 2, 3, 2] }, o || {}); };
    var head = function (t) { return cell(t, { bold: true, color: 'white', fillColor: '#0082DE' }); };
    var COLORS = { 'status-ok': '#166534', 'status-bad': '#B42318', 'status-warn': '#92400E' };
    var body = [[head('N°'), head('Installation'), head('Désignation'), head('Bâtiment'), head('Avis')]];
    placed.forEach(function (p) {
      var key = resolveAvisFieldKey(p.it.type);
      body.push([cell(p.n, { alignment: 'center', bold: true }), cell(p.it.type.label), cell(overviewRowTitle(p.it)), cell(p.it.inst.data.batiment),
        cell(p.it.status.state === 'todo' ? 'À faire' : (p.it.inst.data[key] || 'À compléter'), { color: COLORS[p.it.status.cls] || '#333333', bold: p.it.status.cls === 'status-bad' })]);
    });
    content.push({ table: { headerRows: 1, widths: [24, 120, '*', 110, 110], body: body },
      layout: { hLineColor: function () { return '#B7D7F0'; }, vLineColor: function () { return '#B7D7F0'; }, hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } } });
  });
  return content;
}

console.log('✓ Plan du site chargé');
