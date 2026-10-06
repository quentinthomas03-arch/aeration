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

// Sites à 200 installations (ergonomie du 2026-10-05) :
//  - zoom (pincement à deux doigts, Ctrl + molette / pavé tactile sur PC, ou boutons − / + / Ajuster) :
//    le plan s'agrandit dans un cadre que l'on fait défiler au doigt, les épingles gardent leur taille ;
//    position et zoom conservés d'un rendu à l'autre ;
//  - les compteurs-filtres et la recherche de la vue d'ensemble s'appliquent aussi aux épingles ;
//  - placement à la chaîne par bâtiment : on choisit un bâtiment, l'appli propose ses installations à
//    placer une par une (« Passer » pour en laisser une de côté).
// Paliers des boutons ; le pincement donne n'importe quelle valeur entre le premier et le dernier
// (× 6 sur un téléphone ≈ la résolution de l'image, PLAN_MAX_DIMENSION)
var PLAN_ZOOMS = [1, 1.5, 2, 3, 4, 6];
var PLAN_ZOOM_MAX = PLAN_ZOOMS[PLAN_ZOOMS.length - 1];

function planZoomBorne(z) {
  z = Number(z);
  return isFinite(z) ? Math.max(1, Math.min(PLAN_ZOOM_MAX, z)) : 1;
}

function planZoomBarHtml(zoom) {
  return '<div class="plan-zoom-bar" id="plan-zoom-bar"><button type="button" class="btn btn-gray btn-small" aria-label="Dézoomer" onclick="planZoomer(-1);"' + (zoom <= 1 ? ' disabled' : '') + '>−</button>' +
    '<span class="plan-zoom-val">' + (zoom <= 1 ? 'Plan entier' : '× ' + String(Math.round(zoom * 10) / 10).replace('.', ',')) + '</span>' +
    '<button type="button" class="btn btn-gray btn-small" aria-label="Zoomer" onclick="planZoomer(1);"' + (zoom >= PLAN_ZOOM_MAX ? ' disabled' : '') + '>+</button>' +
    (zoom > 1 ? '<button type="button" class="btn btn-gray btn-small" onclick="planZoomer(0);">Ajuster</button>' : '') +
    '<span class="plan-zoom-astuce">Pincez pour zoomer</span></div>';
}

function planCle(it) { return it.type.id + ':' + it.idx; }

function planBatimentDe(it) {
  var d = it.inst.data || {}, b = String(d.batiment || '').trim() || 'Sans bâtiment', n = String(d.niveau || '').trim();
  return n ? b + ' · ' + n : b;
}

// Installations à placer, dans l'ordre de la vue d'ensemble, limitées au bâtiment choisi
function planAPlacer(m, bat) {
  return overviewOrderedItems(m).filter(function (it) { return !it.inst.data._plan && (!bat || planBatimentDe(it) === bat); });
}

function renderPlanView(m, items, visibles) {
  var plans = missionPlans(m);
  var h = '';
  if (!plans.length) {
    return '<div class="card plan-empty"><div class="plan-empty-icon">' + PLAN_ICON + '</div>' +
      '<p><b>Aucun plan pour ce site.</b></p><p class="subtitle">Prenez en photo le plan d’évacuation affiché sur place, ou importez le plan fourni par le client, puis placez chaque installation d’un toucher. L’année suivante, le plan et les emplacements seront repris.</p>' +
      planAddButtonHtml('btn btn-primary') + '</div>' + planSchemasBlock(m);
  }
  var plan = currentPlan(m);
  state.planCourant = plan.id;
  var placing = state.planPlacement && state.planPlacement.planId === plan.id;
  var cles = visibles ? visibles.map(planCle) : null;
  var placedAll = planPlacedItems(m, plan.id);
  // En placement, toutes les épingles restent visibles (on place par rapport aux autres)
  var placed = (placing || !cles) ? placedAll : placedAll.filter(function (p) { return cles.indexOf(planCle(p.it)) !== -1; });
  var zoom = planZoomBorne(state.planZoom);

  h += '<div class="plan-tabs">';
  plans.forEach(function (p) {
    h += '<button type="button" class="home-filter' + (p.id === plan.id ? ' active' : '') + '" onclick="state.planCourant=\'' + p.id + '\';state.planPlacement=null;state.planScroll=null;render();">' + escapeHtml(p.nom) + '</button>';
  });
  h += planAddButtonHtml('home-filter plan-add') + '</div>';

  h += planZoomBarHtml(zoom);

  h += '<div class="plan-viewport" id="plan-viewport" onscroll="planMemoriserScroll(this);">';
  // Beaucoup d'épingles en vue entière : épingles réduites (taille normale dès le zoom × 2)
  var dense = placed.length > 60 && zoom < 2;
  h += '<div class="plan-stage' + (placing ? ' placing' : '') + (dense ? ' plan-dense' : '') + '" data-nb-pins="' + placed.length + '" style="width:' + Math.round(zoom * 100) + '%;" onclick="planStageClick(event,\'' + plan.id + '\');">';
  h += plan.photoId ? '<img class="plan-img" alt="" data-photo-src="' + escapeHtml(plan.photoId) + '">' : '<img class="plan-img" alt="" src="' + planImageSrc(plan) + '">';
  placed.forEach(function (p) {
    var sel = placing ? state.planPlacement.key === planCle(p.it) : state.planFocus === planCle(p.it);
    h += '<button type="button" class="plan-pin ' + p.it.status.cls + (sel ? ' selected' : '') + '" style="left:' + (p.x * 100).toFixed(2) + '%;top:' + (p.y * 100).toFixed(2) + '%;" ' +
      'title="' + escapeHtml(p.it.type.label + ' — ' + overviewRowTitle(p.it)) + '" onclick="event.stopPropagation();planPinClick(\'' + p.it.type.id + '\',' + p.it.idx + ',\'' + plan.id + '\');">' + p.n + '</button>';
  });
  h += '</div></div>';

  if (placing) {
    var pp = state.planPlacement, bat = pp.bat || '';
    var toutes = planAPlacer(m, '');
    var restantes = planAPlacer(m, bat);
    var cible = items.filter(function (it) { return planCle(it) === pp.key; })[0];
    // Bâtiments qui ont encore des installations à placer
    var parBat = {};
    toutes.forEach(function (it) { var b = planBatimentDe(it); parBat[b] = (parBat[b] || 0) + 1; });
    var bats = Object.keys(parBat); // dans l'ordre de la vue d'ensemble (ordre de visite)
    if (bats.length > 1) {
      h += '<div class="plan-bats"><button type="button" class="home-filter' + (!bat ? ' active' : '') + '" onclick="planChoisirBatiment(\'\');">Tous (' + toutes.length + ')</button>';
      bats.forEach(function (b) {
        h += '<button type="button" class="home-filter' + (bat === b ? ' active' : '') + '" onclick="planChoisirBatiment(\'' + escapeHtml(jsSafeStr(b)) + '\');">' + escapeHtml(b) + ' (' + parBat[b] + ')</button>';
      });
      h += '</div>';
    }
    if (cible) {
      h += '<div class="plan-placing-bar"><div>Touchez le plan à l’emplacement de :</div><b>' + escapeHtml(cible.type.label + ' — ' + overviewRowTitle(cible)) + '</b>' +
        (cible.inst.data.batiment ? '<div class="subtitle">' + escapeHtml(cible.inst.data.batiment) + '</div>' : '') +
        (!cible.inst.data._plan && restantes.length > 1 ? '<button type="button" class="btn btn-gray btn-small" onclick="planPasser();">Passer</button>' : '') + '</div>';
    } else {
      h += '<div class="plan-placing-bar">' + (restantes.length ? 'Choisissez une installation à placer' : 'Toutes les installations' + (bat ? ' de ' + escapeHtml(bat) : '') + ' sont placées.') + '</div>';
    }
    h += '<p class="subtitle plan-info">' + restantes.length + ' à placer' + (bat ? ' dans ce bâtiment' : '') + '. Touchez une épingle pour la déplacer.</p>';
    h += '<select class="input" onchange="state.planPlacement.key=this.value;render();">';
    var opt = function (it, suffixe) {
      var k = planCle(it);
      return '<option value="' + k + '"' + (k === pp.key ? ' selected' : '') + '>' + escapeHtml(it.type.label + ' — ' + overviewRowTitle(it) + (!bat && it.inst.data.batiment ? ' (' + it.inst.data.batiment + ')' : '') + suffixe) + '</option>';
    };
    var dansBat = items.filter(function (it) { return !bat || planBatimentDe(it) === bat; });
    var nonPlacees = dansBat.filter(function (it) { return !it.inst.data._plan; });
    var deja = dansBat.filter(function (it) { return it.inst.data._plan; });
    h += '<option value="">—</option>';
    if (nonPlacees.length) h += '<optgroup label="À placer (' + nonPlacees.length + ')">' + nonPlacees.map(function (it) { return opt(it, ''); }).join('') + '</optgroup>';
    if (deja.length) h += '<optgroup label="Déjà placées (déplacer)">' + deja.map(function (it) { return opt(it, ' ✓'); }).join('') + '</optgroup>';
    h += '</select>';
    if (typeof creationRapideHtml === 'function') h += creationRapideHtml(m, 'plan', m.typesSelectionnes || []);
    h += '<div class="row" style="margin-top:8px;">';
    if (cible && cible.inst.data._plan) h += '<button class="btn btn-gray btn-small" onclick="planRetirer();">Retirer du plan</button>';
    h += '<button class="btn btn-primary btn-small" onclick="state.planPlacement=null;render();">' + ICONS.check + ' Terminer le placement</button></div>';
  } else {
    var filtreActif = cles && cles.length !== items.length;
    h += '<p class="subtitle plan-info">' + (filtreActif ? placed.length + ' épingle(s) affichée(s) avec ce filtre, sur ' + placedAll.length + ' placée(s).'
      : placedAll.length + ' installation(s) placée(s) sur ce plan sur ' + items.length + '.') + ' Touchez une épingle pour ouvrir sa fiche.</p>';
    h += '<div class="row plan-actions">';
    h += '<button class="btn btn-primary btn-small" onclick="planDemarrerPlacement(\'' + plan.id + '\');">' + PLAN_ICON + ' Placer des installations</button>';
    h += '<button class="btn btn-gray btn-small" onclick="planRenommer(\'' + plan.id + '\');">' + ICONS.edit + ' Renommer</button>';
    h += '<button class="btn btn-gray btn-small" onclick="planSupprimer(\'' + plan.id + '\');">' + ICONS.trash + ' Supprimer</button></div>';
  }
  return h + (placing ? '' : planSchemasBlock(m));
}

// Zoom : sens -1 / +1, 0 pour revenir au plan entier ; le centre de la vue reste au même endroit
// Après un pincement, palier suivant / précédent par rapport à la valeur courante
function planZoomer(sens) {
  var z = planZoomBorne(state.planZoom), nz = 1;
  if (sens > 0) nz = PLAN_ZOOMS.filter(function (v) { return v > z + 0.01; })[0] || PLAN_ZOOM_MAX;
  else if (sens < 0) nz = PLAN_ZOOMS.filter(function (v) { return v < z - 0.01; }).pop() || 1;
  var vp = document.getElementById('plan-viewport');
  if (vp && vp.scrollWidth) {
    var cx = (vp.scrollLeft + vp.clientWidth / 2) / vp.scrollWidth, cy = (vp.scrollTop + vp.clientHeight / 2) / vp.scrollHeight;
    state.planScroll = { cx: cx, cy: cy };
  }
  state.planZoom = nz;
  render();
}

// Zoom sans re-rendu (pincement, molette) : le point du plan sous (px, py) — coordonnées écran — reste
// sous le doigt. On agit directement sur la largeur du plan et le défilement du cadre ; pas de render()
// pour ne pas recharger l'image à chaque mouvement.
function planZoomVers(vp, z, px, py, ancre) {
  var stage = vp.querySelector('.plan-stage');
  if (!stage) return;
  z = planZoomBorne(z);
  var r = vp.getBoundingClientRect(), ox = px - r.left, oy = py - r.top;
  // ancre : position relative (0..1) dans le plan du point à garder sous le doigt
  if (!ancre) ancre = { x: (vp.scrollLeft + ox) / (vp.scrollWidth || 1), y: (vp.scrollTop + oy) / (vp.scrollHeight || 1) };
  stage.style.width = (z * 100) + '%';
  var nb = parseInt(stage.getAttribute('data-nb-pins'), 10) || 0;
  stage.classList.toggle('plan-dense', nb > 60 && z < 2);
  vp.scrollLeft = Math.max(0, ancre.x * vp.scrollWidth - ox);
  vp.scrollTop = Math.max(0, ancre.y * vp.scrollHeight - oy);
  state.planZoom = z;
  planMemoriserScroll(vp);
}

// Fin de geste : met à jour la barre de zoom (libellé, boutons) sans re-rendre la page
function planZoomBarMaj() {
  var bar = document.getElementById('plan-zoom-bar');
  if (bar) bar.outerHTML = planZoomBarHtml(planZoomBorne(state.planZoom));
}

// Pincement à deux doigts dans le cadre du plan. Le défilement à un doigt reste celui du navigateur
// (touch-action: pan-x pan-y) ; le zoom de la page entière est bloqué sur le plan.
function planInitGestes(vp) {
  if (vp._planGestes) return;
  vp._planGestes = true;
  var g = null, raf = 0, dernier = null;
  var dist = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  var milieu = function (t) { return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 }; };
  vp.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 2) return;
    var c = milieu(e.touches), r = vp.getBoundingClientRect();
    g = { d0: dist(e.touches), z0: planZoomBorne(state.planZoom),
      ancre: { x: (vp.scrollLeft + c.x - r.left) / (vp.scrollWidth || 1), y: (vp.scrollTop + c.y - r.top) / (vp.scrollHeight || 1) } };
  }, { passive: true });
  vp.addEventListener('touchmove', function (e) {
    if (!g || e.touches.length !== 2) return;
    e.preventDefault();
    // l'ancre suit le milieu des deux doigts : on peut zoomer et se déplacer dans le même geste
    dernier = { z: g.z0 * dist(e.touches) / g.d0, c: milieu(e.touches) };
    if (!raf) raf = requestAnimationFrame(function () {
      raf = 0;
      if (g && dernier) planZoomVers(vp, dernier.z, dernier.c.x, dernier.c.y, g.ancre);
    });
  }, { passive: false });
  var fin = function (e) {
    if (!g || e.touches.length >= 2) return;
    g = null; dernier = null;
    state._planPincementFin = Date.now(); // le doigt restant ne doit pas poser une épingle
    planZoomBarMaj();
  };
  vp.addEventListener('touchend', fin);
  vp.addEventListener('touchcancel', fin);
  // PC : Ctrl + molette, ou pincement du pavé tactile (que le navigateur traduit en Ctrl + molette)
  var tempo = 0;
  vp.addEventListener('wheel', function (e) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    planZoomVers(vp, planZoomBorne(state.planZoom) * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    clearTimeout(tempo);
    tempo = setTimeout(planZoomBarMaj, 150);
  }, { passive: false });
}

function planMemoriserScroll(vp) {
  if (!vp.scrollWidth) return;
  state.planScroll = { cx: (vp.scrollLeft + vp.clientWidth / 2) / vp.scrollWidth, cy: (vp.scrollTop + vp.clientHeight / 2) / vp.scrollHeight };
}

// Appelé après chaque rendu (js/app.js) : remet le plan zoomé à la même position. L'image peut ne pas
// être encore chargée (photo en IndexedDB) : on recommence à son chargement.
function planRestaurerScroll() {
  var vp = document.getElementById('plan-viewport'), s = state.planScroll;
  if (vp) planInitGestes(vp);
  if (!vp || !s) return;
  var appliquer = function () {
    vp.scrollLeft = Math.max(0, s.cx * vp.scrollWidth - vp.clientWidth / 2);
    vp.scrollTop = Math.max(0, s.cy * vp.scrollHeight - vp.clientHeight / 2);
  };
  appliquer();
  var img = vp.querySelector('.plan-img');
  if (img && !img.complete) img.addEventListener('load', appliquer, { once: true });
}

function planChoisirBatiment(bat) {
  var m = getCurrentMission(), pp = state.planPlacement;
  if (!pp) return;
  pp.bat = bat;
  var premiere = planAPlacer(m, bat)[0];
  pp.key = premiere ? planCle(premiere) : '';
  render();
}

// Laisser de côté l'installation proposée : on passe à la suivante du bâtiment (en boucle)
function planPasser() {
  var m = getCurrentMission(), pp = state.planPlacement;
  if (!pp) return;
  var liste = planAPlacer(m, pp.bat || '');
  var i = liste.map(planCle).indexOf(pp.key);
  var suivante = liste[(i + 1) % liste.length];
  pp.key = suivante ? planCle(suivante) : '';
  render();
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
    '<input type="file" accept="image/*,application/pdf,.pdf" style="display:none;" onchange="planAjouter(this);"></label>';
}

function planDemarrerPlacement(planId) {
  var m = getCurrentMission();
  var premiere = planAPlacer(m, '')[0];
  state.planPlacement = { planId: planId, bat: '', key: premiere ? planCle(premiere) : '' };
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
  if (state._planPincementFin && Date.now() - state._planPincementFin < 400) return;
  var m = getCurrentMission(), inst = planInstFromKey(m, p.key);
  if (!inst) return;
  var img = ev.currentTarget.querySelector('.plan-img');
  var r = (img || ev.currentTarget).getBoundingClientRect();
  var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  inst.data._plan = { id: planId, x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 };
  if (typeof touchInstallation === 'function') touchInstallation(inst);
  persistMissions();
  var suivante = planAPlacer(m, p.bat || '')[0];
  p.key = suivante ? planCle(suivante) : '';
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
  if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) { planAjouterPdf(file, m); return; } // plans du client en PDF
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

// Plans fournis en PDF par le client (2026-10-05) : chaque page devient un plan (20 pages au plus),
// nommée d'après le niveau lu dans la page quand il y figure (RDC, R+1, sous-sol, étage 2…).
var PLAN_PDF_MAX_PAGES = 20;
var PLAN_NIVEAU_RE = /(rez[\s-]*de[\s-]*chauss[ée]e|\bRDC\b|\bR\s?[+-]\s?\d+\b|sous[\s-]*sol(?:\s*-?\d+)?|niveau\s*-?\d+|\b\d+\s*(?:er|e|ème)\s*[ée]tage|[ée]tage\s*\d+|\bcombles?\b|\btoiture(?:[\s-]terrasse)?\b)/i;

function planNomDepuisTexte(txt) {
  var mm = String(txt || '').match(PLAN_NIVEAU_RE);
  if (!mm) return '';
  var s = mm[1].replace(/\s+/g, ' ').trim();
  if (/^rez/i.test(s)) return 'RDC';
  if (/^r\s?[+-]/i.test(s)) return s.replace(/\s/g, '').toUpperCase();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function planAjouterPdf(file, m) {
  var prog = typeof rapportProgres === 'function' ? rapportProgres : function () {};
  var fin = typeof rapportProgresFin === 'function' ? rapportProgresFin : function () {};
  prog('Lecture du plan PDF…');
  ensureLib('pdfjs').then(function () { return file.arrayBuffer(); }).then(function (buf) {
    return pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  }).then(function (doc) {
    var n = Math.min(doc.numPages, PLAN_PDF_MAX_PAGES), plans = missionPlans(m), crees = [], vus = {};
    var page = function (i) {
      if (i > n) return null;
      prog('Import du plan : page ' + i + ' / ' + n + '…');
      return doc.getPage(i).then(function (pg) {
        var vp1 = pg.getViewport({ scale: 1 }), scale = PLAN_MAX_DIMENSION / Math.max(vp1.width, vp1.height);
        var vp = pg.getViewport({ scale: scale }), c = document.createElement('canvas');
        c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); // fond blanc (PDF transparents)
        return Promise.all([pg.render({ canvasContext: ctx, viewport: vp }).promise, pg.getTextContent()]).then(function (r) {
          var txt = r[1].items.map(function (it) { return it.str; }).join(' ');
          return new Promise(function (ok, ko) { c.toBlob(function (b) { if (b) ok({ blob: b, txt: txt }); else ko(new Error('Conversion de la page ' + i + ' échouée')); }, 'image/jpeg', 0.82); });
        });
      }).then(function (res) {
        var photoId = generatePhotoId();
        return savePhotoBlob(photoId, res.blob).then(function () {
          var nom = planNomDepuisTexte(res.txt) || (n === 1 ? (plans.length ? 'Plan ' + (plans.length + 1) : 'Plan du site') : 'Plan page ' + i);
          if (vus[nom]) nom += ' (page ' + i + ')';
          vus[nom] = true;
          var plan = { id: 'pl_' + generateId() + '_' + i, nom: nom, photoId: photoId };
          plans.push(plan); crees.push(plan);
          return page(i + 1);
        });
      });
    };
    return page(1).then(function () {
      fin();
      if (!crees.length) return;
      state.planCourant = crees[0].id;
      state.overviewMode = 'plan';
      persistMissions();
      render();
      if (doc.numPages > PLAN_PDF_MAX_PAGES) alert('Le PDF compte ' + doc.numPages + ' pages : les ' + PLAN_PDF_MAX_PAGES + ' premières ont été importées.');
    });
  }).catch(function (err) { fin(); alert('Impossible d’importer ce PDF :\n\n' + err.message); });
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
        cell(p.it.status.nc ? 'Non contrôlée' : p.it.status.state === 'todo' ? 'À faire' : (p.it.inst.data[key] || 'À compléter'), { color: COLORS[p.it.status.cls] || '#333333', bold: p.it.status.cls === 'status-bad' })]);
    });
    content.push({ table: { headerRows: 1, widths: [24, 120, '*', 110, 110], body: body },
      layout: { hLineColor: function () { return '#B7D7F0'; }, vLineColor: function () { return '#B7D7F0'; }, hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } } });
  });
  return content;
}

console.log('✓ Plan du site chargé');
