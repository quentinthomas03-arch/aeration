// schemas.js - Schéma de réseau dessiné sur site (chantier du 2026-10-04)
//
// Quand le client n'a pas de plan de son réseau d'aspiration ou d'extraction, le technicien le
// schématise en quelques touchers : il pose des symboles (poste ou machine, captage, registre, filtre,
// ventilateur, rejet, retour d'air, point de mesure), les relie par des gaines (le sens de l'air est
// fléché) et rattache chaque poste à l'installation contrôlée : le symbole prend la couleur de l'avis.
// Le schéma peut aussi compléter un plan du client (document joint pris comme fond). Il est annexé au
// rapport comme schéma de principe, sans valeur de plan d'exécution, et repris à la visite suivante.
//
// Données : m.schemas = [{ id, nom, ratio, fondPhotoId|null, rapport, elements: [{ id, k, x, y, t,
// inst }], liens: [{ id, a, b }] }] — x, y entre 0 et 1 ; k parmi SCHEMA_SYMBOLES ; inst = id de
// l'installation reliée ; un lien va de a vers b dans le sens de l'air. Le schéma est dessiné en SVG
// produit ici (libellés échappés, types de symboles pris dans une liste fermée).

var SCHEMA_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="15" width="6" height="6" rx="1"/><circle cx="18" cy="6" r="3.5"/><path d="M5 15V9h10M18 9.5V21"/></svg>';
var SCHEMA_W = 1000, SCHEMA_S = 28; // largeur du repère, demi-taille d'un symbole
var SCHEMA_ENCRE = '#22313f';
var SCHEMA_SYMBOLES = [
  { k: 'poste', nom: 'Poste / machine' },
  { k: 'captage', nom: 'Captage / hotte' },
  { k: 'registre', nom: 'Registre / clapet' },
  { k: 'filtre', nom: 'Filtre / dépoussiéreur' },
  { k: 'ventilateur', nom: 'Ventilateur' },
  { k: 'rejet', nom: 'Rejet extérieur' },
  { k: 'recyclage', nom: 'Retour d’air (recyclage)' },
  { k: 'mesure', nom: 'Point de mesure' },
  { k: 'note', nom: 'Texte libre' }
];

function schemaSymbole(k) {
  return SCHEMA_SYMBOLES.filter(function (s) { return s.k === k; })[0] || null;
}

function missionSchemas(m) {
  if (!Array.isArray(m.schemas)) m.schemas = [];
  return m.schemas;
}

function schemaCourant(m) {
  return missionSchemas(m).filter(function (s) { return s.id === state.schemaId; })[0] || null;
}

function schemaH(s) { return Math.round(SCHEMA_W * (s.ratio || 0.7)); }

// Dessin d'un symbole centré en (0,0), trait de la couleur donnée
function schemaSymboleSvg(k, couleur) {
  var S = SCHEMA_S, c = couleur || SCHEMA_ENCRE;
  var st = ' fill="#ffffff" stroke="' + c + '" stroke-width="4" stroke-linejoin="round"';
  switch (k) {
    case 'poste': return '<rect x="' + -S + '" y="' + -S + '" width="' + 2 * S + '" height="' + 2 * S + '" rx="4"' + st + '/><path d="M' + -S * 0.5 + ' ' + S * 0.35 + 'h' + S + '" stroke="' + c + '" stroke-width="4"/>';
    case 'captage': return '<path d="M' + -S + ' ' + S * 0.7 + ' L' + -S * 0.4 + ' ' + -S * 0.7 + ' H' + S * 0.4 + ' L' + S + ' ' + S * 0.7 + ' Z"' + st + '/>';
    case 'registre': return '<circle r="' + S * 0.8 + '"' + st + '/><path d="M' + -S * 0.8 + ' ' + S * 0.8 + ' L' + S * 0.8 + ' ' + -S * 0.8 + '" stroke="' + c + '" stroke-width="4"/>';
    case 'filtre': return '<rect x="' + -S + '" y="' + -S * 0.8 + '" width="' + 2 * S + '" height="' + 1.6 * S + '"' + st + '/><path d="M' + -S + ' ' + -S * 0.8 + ' L' + S + ' ' + S * 0.8 + ' M' + -S + ' ' + S * 0.8 + ' L' + S + ' ' + -S * 0.8 + '" stroke="' + c + '" stroke-width="3" fill="none"/>';
    case 'ventilateur': return '<circle r="' + S + '"' + st + '/><path d="M' + -S * 0.45 + ' ' + -S * 0.55 + ' L' + S * 0.6 + ' 0 L' + -S * 0.45 + ' ' + S * 0.55 + ' Z" fill="' + c + '"/>';
    case 'rejet': return '<path d="M0 ' + S + ' V' + -S * 0.5 + ' M' + -S * 0.6 + ' ' + -S * 0.1 + ' L0 ' + -S + ' L' + S * 0.6 + ' ' + -S * 0.1 + '" stroke="' + c + '" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'recyclage': return '<path d="M' + S * 0.75 + ' ' + -S * 0.2 + ' A' + S * 0.75 + ' ' + S * 0.75 + ' 0 1 1 ' + S * 0.2 + ' ' + -S * 0.72 + '" stroke="' + c + '" stroke-width="4" fill="none"/><path d="M' + S * 0.05 + ' ' + -S + ' L' + S * 0.55 + ' ' + -S * 0.72 + ' L' + S * 0.05 + ' ' + -S * 0.4 + ' Z" fill="' + c + '"/>';
    case 'mesure': return '<path d="M0 ' + -S * 0.75 + ' L' + S * 0.75 + ' 0 L0 ' + S * 0.75 + ' L' + -S * 0.75 + ' 0 Z"' + st + '/><circle r="' + S * 0.18 + '" fill="' + c + '"/>';
    case 'note': return '<rect x="' + -S * 0.5 + '" y="' + -S * 0.5 + '" width="' + S + '" height="' + S + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-dasharray="4 3"/>';
  }
  return '';
}

function schemaIconeOutil(k) {
  return '<svg viewBox="-30 -30 60 60" class="schema-outil-icone">' + schemaSymboleSvg(k) + '</svg>';
}

// Installations de la mission (ordre de la vue d'ensemble), indexées par id
function schemaItemsParId(m) {
  var map = {};
  ((typeof overviewOrderedItems === 'function') ? overviewOrderedItems(m) : []).forEach(function (it) { if (it.inst.id) map[it.inst.id] = it; });
  return map;
}

function schemaElementCouleur(e, items) {
  var it = e.inst && items[e.inst];
  return it ? (PLAN_PIN_COLORS[it.status.cls] || SCHEMA_ENCRE) : SCHEMA_ENCRE;
}

// SVG du schéma. opts.edition : éléments sélectionnables ; opts.legende : bandeau de légende (rapport)
function schemaSvg(m, s, opts) {
  opts = opts || {};
  var H = schemaH(s), items = schemaItemsParId(m);
  var parId = {};
  (s.elements || []).forEach(function (e) { parId[e.id] = e; });
  var legH = 0, usedKinds = [];
  if (opts.legende) {
    (s.elements || []).forEach(function (e) { if (e.k !== 'note' && usedKinds.indexOf(e.k) === -1 && schemaSymbole(e.k)) usedKinds.push(e.k); });
    legH = usedKinds.length ? 34 + Math.ceil(usedKinds.length / 4) * 44 : 0;
  }
  var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SCHEMA_W + ' ' + (H + legH) + '"' +
    (opts.taille ? ' width="' + opts.taille + '" height="' + Math.round(opts.taille * (H + legH) / SCHEMA_W) + '"' : '') +
    ' font-family="Arial, sans-serif" class="schema-svg">';
  h += '<defs><marker id="schema-fleche" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">' +
    '<path d="M0 0 L10 5 L0 10 Z" fill="' + SCHEMA_ENCRE + '"/></marker></defs>';
  if (opts.fondBlanc) h += '<rect width="' + SCHEMA_W + '" height="' + (H + legH) + '" fill="#ffffff"/>';
  var sel = opts.edition && state.schemaSel;
  (s.liens || []).forEach(function (l) {
    var a = parId[l.a], b = parId[l.b];
    if (!a || !b) return;
    var x1 = a.x * SCHEMA_W, y1 = a.y * H, x2 = b.x * SCHEMA_W, y2 = b.y * H;
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, on = sel && sel.type === 'lien' && sel.id === l.id;
    if (opts.edition) h += '<path data-lien="' + escapeHtml(l.id) + '" d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="transparent" stroke-width="30"/>';
    h += '<path' + (opts.edition ? ' data-lien="' + escapeHtml(l.id) + '"' : '') + ' d="M' + x1 + ' ' + y1 + ' L' + mx + ' ' + my + ' L' + x2 + ' ' + y2 + '" stroke="' + (on ? '#0082DE' : SCHEMA_ENCRE) + '" stroke-width="' + (on ? 9 : 6) + '" fill="none" stroke-linecap="round" marker-mid="url(#schema-fleche)"/>';
  });
  (s.elements || []).forEach(function (e) {
    var sym = schemaSymbole(e.k);
    if (!sym) return;
    var x = e.x * SCHEMA_W, y = e.y * H, on = sel && sel.type === 'el' && sel.id === e.id;
    var depart = opts.edition && state.schemaLienDepuis === e.id;
    h += '<g' + (opts.edition ? ' data-el="' + escapeHtml(e.id) + '"' : '') + ' transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')">';
    if (on || depart) h += '<circle r="' + (SCHEMA_S + 10) + '" fill="rgba(0,130,222,0.15)" stroke="#0082DE" stroke-width="3"' + (depart ? ' stroke-dasharray="6 4"' : '') + '/>';
    if (opts.edition) h += '<circle r="' + (SCHEMA_S + 8) + '" fill="transparent"/>';
    if (e.k !== 'note' || opts.edition) h += schemaSymboleSvg(e.k, schemaElementCouleur(e, items)); // cadre du texte libre : à l'écran seulement
    if (e.t) {
      var ty = e.k === 'note' ? 8 : SCHEMA_S + 26;
      h += '<text y="' + ty + '" text-anchor="middle" font-size="' + (e.k === 'note' ? 24 : 21) + '" font-weight="700" fill="' + SCHEMA_ENCRE + '" stroke="#ffffff" stroke-width="6" paint-order="stroke">' + escapeHtml(e.t) + '</text>';
    }
    h += '</g>';
  });
  if (legH) {
    h += '<rect x="0" y="' + H + '" width="' + SCHEMA_W + '" height="' + legH + '" fill="#f4f7fa"/>';
    h += '<text x="16" y="' + (H + 24) + '" font-size="15" font-weight="700" fill="' + SCHEMA_ENCRE + '">Légende — schéma de principe, le sens de l’air est fléché sur les gaines</text>';
    usedKinds.forEach(function (k, i) {
      var cx = 40 + (i % 4) * 245, cy = H + 58 + Math.floor(i / 4) * 44;
      h += '<g transform="translate(' + cx + ' ' + cy + ') scale(0.7)">' + schemaSymboleSvg(k) + '</g>';
      h += '<text x="' + (cx + 28) + '" y="' + (cy + 5) + '" font-size="14" fill="' + SCHEMA_ENCRE + '">' + escapeHtml(schemaSymbole(k).nom) + '</text>';
    });
  }
  return h + '</svg>';
}

// ————————————————————————————————————————————
// Liste des schémas (carte « Plans, schémas et documents joints »)
// ————————————————————————————————————————————

function renderSchemasList(m) {
  var list = missionSchemas(m);
  if (!list.length) return '';
  var h = '<div class="schemas-liste">';
  list.forEach(function (s, i) {
    h += '<div class="doc-joint"><div class="doc-joint-head" onclick="schemaOuvrir(' + i + ');">';
    h += '<span class="doc-thumb schema-thumb">' + schemaSvg(m, s, { fondBlanc: true }) + '</span>';
    h += '<div class="doc-joint-meta"><div class="doc-joint-nom">' + escapeHtml(s.nom) + '</div><div class="subtitle">Schéma dessiné · ' +
      (s.elements || []).length + ' élément(s)' + (s.rapport === false ? ' · hors rapport' : '') + '</div></div>';
    h += '<span class="doc-joint-chevron">›</span></div></div>';
  });
  return h + '</div>';
}

function schemaNouveau(fondPhotoId) {
  var m = getCurrentMission();
  if (!m) return;
  var creer = function (ratio) {
    var s = { id: 'sc_' + generateId(), nom: 'Réseau ' + (missionSchemas(m).length + 1), ratio: ratio, fondPhotoId: fondPhotoId || null,
      rapport: true, elements: [], liens: [] };
    missionSchemas(m).push(s);
    persistMissions();
    schemaOuvrir(missionSchemas(m).length - 1);
  };
  if (!fondPhotoId) { creer(0.7); return; }
  getPhotoBlob(fondPhotoId).then(function (b) {
    if (!b) { creer(0.7); return; }
    var url = URL.createObjectURL(b), img = new Image();
    img.onload = function () { URL.revokeObjectURL(url); creer(Math.min(2, Math.max(0.3, (img.naturalHeight || 7) / (img.naturalWidth || 10)))); };
    img.onerror = function () { URL.revokeObjectURL(url); creer(0.7); };
    img.src = url;
  });
}

function schemaOuvrir(i) {
  var s = missionSchemas(getCurrentMission())[i];
  if (!s) return;
  state.schemaId = s.id;
  state.schemaOutil = s.elements.length ? 'select' : 'poste';
  state.schemaSel = null;
  state.schemaLienDepuis = null;
  state.schemaHistorique = [];
  state.schemaRetour = state.view === 'mission-detail' ? 'mission-detail' : 'mission-form'; // ouvert depuis la vue Plan ou les données de la mission
  state.view = 'schema-editor';
  render();
  window.scrollTo(0, 0);
}

// ————————————————————————————————————————————
// Éditeur
// ————————————————————————————————————————————

function renderSchemaEditor() {
  var m = getCurrentMission(), s = m && schemaCourant(m);
  if (!s) { state.view = m ? 'mission-form' : 'home'; return m ? renderMissionForm() : renderHome(); }
  var outil = state.schemaOutil || 'select';
  var h = '<button class="back-btn" onclick="schemaFermer();">' + ICONS.arrowLeft + ' ' + (state.schemaRetour === 'mission-detail' ? 'Plan du site' : 'Documents de la mission') + '</button>';
  h += '<div class="card schema-entete"><div class="schema-titre">' + SCHEMA_ICON + '<b>' + escapeHtml(s.nom) + '</b></div>' +
    '<button class="btn btn-gray btn-small" onclick="schemaRenommer();">' + ICONS.edit + ' Renommer</button></div>';

  h += '<div class="schema-outils">';
  h += '<button type="button" class="schema-outil' + (outil === 'select' ? ' active' : '') + '" onclick="schemaChoisirOutil(\'select\');"><svg viewBox="0 0 24 24" class="schema-outil-icone" fill="none" stroke="' + SCHEMA_ENCRE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>Déplacer</button>';
  h += '<button type="button" class="schema-outil' + (outil === 'lien' ? ' active' : '') + '" onclick="schemaChoisirOutil(\'lien\');"><svg viewBox="0 0 60 60" class="schema-outil-icone"><path d="M8 48 L30 30 L52 12" stroke="' + SCHEMA_ENCRE + '" stroke-width="6" fill="none" stroke-linecap="round" marker-mid="url(#schema-fleche-outil)"/><defs><marker id="schema-fleche-outil" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="' + SCHEMA_ENCRE + '"/></marker></defs></svg>Gaine</button>';
  SCHEMA_SYMBOLES.forEach(function (sym) {
    h += '<button type="button" class="schema-outil' + (outil === sym.k ? ' active' : '') + '" onclick="schemaChoisirOutil(\'' + sym.k + '\');">' + schemaIconeOutil(sym.k) + escapeHtml(sym.nom.split(' / ')[0].replace(' (recyclage)', '')) + '</button>';
  });
  h += '</div>';

  h += '<div class="schema-stage' + (s.fondPhotoId ? ' avec-fond' : '') + '" style="aspect-ratio:' + SCHEMA_W + ' / ' + schemaH(s) + ';">';
  if (s.fondPhotoId) h += '<img class="schema-fond" alt="" data-photo-src="' + escapeHtml(s.fondPhotoId) + '">';
  h += '<div class="schema-dessin" onpointerdown="schemaPointerDown(event);">' + schemaSvg(m, s, { edition: true }) + '</div></div>';

  h += renderSchemaPanneau(m, s, outil);

  h += '<div class="row" style="margin-top:12px;">';
  h += '<button class="btn btn-gray btn-small" onclick="schemaAnnuler();"' + ((state.schemaHistorique || []).length ? '' : ' disabled') + '>↶ Annuler</button>';
  h += '<label class="doc-check schema-rapport"><input type="checkbox"' + (s.rapport !== false ? ' checked' : '') + ' onchange="schemaRapport(this.checked);"> Annexer au rapport</label>';
  h += '</div>';
  h += '<div class="row" style="margin-top:8px;">';
  h += '<button class="btn btn-gray btn-small" onclick="schemaSupprimer();">' + ICONS.trash + ' Supprimer le schéma</button>';
  h += '<button class="btn btn-primary btn-small" onclick="schemaFermer();">' + ICONS.check + ' Terminer</button></div>';
  return h;
}

function renderSchemaPanneau(m, s, outil) {
  var sel = state.schemaSel, h = '<div class="card schema-panneau">';
  if (sel && sel.type === 'el') {
    var e = (s.elements || []).filter(function (x) { return x.id === sel.id; })[0];
    if (e) {
      var sym = schemaSymbole(e.k);
      h += '<div class="schema-panneau-titre">' + schemaIconeOutil(e.k) + '<b>' + escapeHtml(sym ? sym.nom : '') + '</b></div>';
      h += '<div class="field"><label class="label">Repère affiché</label><input type="text" class="input" maxlength="40" value="' + escapeHtml(e.t || '') + '" placeholder="ex. Raboteuse, R1, Cyclone…" onchange="schemaMajElement(\'t\',this.value);"></div>';
      if (e.k !== 'note') {
        var items = (typeof overviewOrderedItems === 'function') ? overviewOrderedItems(m) : [];
        h += '<div class="field"><label class="label">Installation contrôlée correspondante</label><select class="input" onchange="schemaLierInstallation(this.value);"><option value="">— aucune —</option>';
        items.forEach(function (it, i) {
          h += '<option value="' + i + '"' + (e.inst && e.inst === it.inst.id ? ' selected' : '') + '>' + escapeHtml(docInstallationLabel(it)) + '</option>';
        });
        h += '</select><div class="subtitle">Le symbole prend la couleur de l’avis de l’installation.</div></div>';
      }
      h += '<div class="row">';
      if (e.k !== 'note') h += '<button class="btn btn-gray btn-small" onclick="state.schemaOutil=\'lien\';state.schemaLienDepuis=state.schemaSel.id;render();">Tirer une gaine d’ici</button>';
      h += '<button class="btn btn-gray btn-small" onclick="schemaSupprimerSelection();">' + ICONS.trash + ' Supprimer</button></div>';
      return h + '</div>';
    }
  }
  if (sel && sel.type === 'lien') {
    h += '<div class="schema-panneau-titre"><b>Gaine</b></div><p class="subtitle">La flèche indique le sens de l’air.</p><div class="row">';
    h += '<button class="btn btn-gray btn-small" onclick="schemaInverserLien();">⇄ Inverser le sens</button>';
    h += '<button class="btn btn-gray btn-small" onclick="schemaSupprimerSelection();">' + ICONS.trash + ' Supprimer</button></div>';
    return h + '</div>';
  }
  var aide;
  if (outil === 'select') aide = 'Touchez un élément pour le modifier, faites-le glisser pour le déplacer.';
  else if (outil === 'lien') aide = state.schemaLienDepuis ? 'Touchez l’élément suivant dans le sens de l’air : la gaine se trace, et on continue depuis lui. Touchez le fond pour arrêter.' : 'Touchez l’élément d’où part l’air, puis le suivant : la gaine se trace dans le sens de l’air.';
  else aide = 'Touchez le schéma pour poser « ' + schemaSymbole(outil).nom + ' ». Recommencez autant de fois que nécessaire, puis reliez avec l’outil Gaine.';
  return h + '<p class="subtitle schema-aide">' + aide + '</p></div>';
}

function schemaFermer() {
  state.view = state.schemaRetour || 'mission-form';
  state.schemaSel = null;
  render();
}

function schemaChoisirOutil(k) {
  state.schemaOutil = k;
  state.schemaLienDepuis = null;
  if (k !== 'select') state.schemaSel = null;
  render();
}

// Modifie le schéma courant avec mémorisation pour « Annuler »
function schemaMaj(fn) {
  var s = schemaCourant(getCurrentMission());
  if (!s) return;
  state.schemaHistorique = (state.schemaHistorique || []).concat([JSON.stringify(s)]).slice(-40);
  fn(s);
  persistMissions();
  render();
}

function schemaAnnuler() {
  var m = getCurrentMission(), hist = state.schemaHistorique || [];
  if (!hist.length) return;
  var prev = JSON.parse(hist.pop());
  m.schemas = missionSchemas(m).map(function (s) { return s.id === prev.id ? prev : s; });
  state.schemaSel = null;
  state.schemaLienDepuis = null;
  persistMissions();
  render();
}

function schemaPosition(ev, svg) {
  var r = svg.getBoundingClientRect();
  return { x: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)) };
}

function schemaPointerDown(ev) {
  var svg = ev.currentTarget.querySelector('svg');
  if (!svg) return;
  var s = schemaCourant(getCurrentMission());
  var cible = ev.target.closest ? ev.target.closest('[data-el],[data-lien]') : null;
  var outil = state.schemaOutil || 'select';
  var elId = cible && cible.getAttribute('data-el'), lienId = cible && cible.getAttribute('data-lien');

  if (elId) {
    if (outil === 'lien') {
      var de = state.schemaLienDepuis;
      if (!de) { state.schemaLienDepuis = elId; render(); return; }
      if (de === elId) { state.schemaLienDepuis = null; render(); return; }
      var existe = (s.liens || []).some(function (l) { return (l.a === de && l.b === elId) || (l.a === elId && l.b === de); });
      state.schemaLienDepuis = elId;
      if (existe) { render(); return; }
      schemaMaj(function (s) { s.liens.push({ id: 'l_' + generateId(), a: de, b: elId }); });
      return;
    }
    ev.preventDefault();
    schemaDemarrerGlisser(ev, svg, s, elId);
    return;
  }
  if (lienId) {
    state.schemaSel = { type: 'lien', id: lienId };
    state.schemaLienDepuis = null;
    render();
    return;
  }
  // Fond du schéma
  if (outil !== 'select' && outil !== 'lien' && schemaSymbole(outil)) {
    var p = schemaPosition(ev, svg), id = 'e_' + generateId();
    schemaMaj(function (s) {
      s.elements.push({ id: id, k: outil, x: Math.round(p.x * 10000) / 10000, y: Math.round(p.y * 10000) / 10000, t: outil === 'note' ? 'Texte' : '', inst: null });
    });
    state.schemaSel = { type: 'el', id: id };
    if (outil === 'note') { state.schemaOutil = 'select'; }
    render();
    return;
  }
  state.schemaSel = null;
  state.schemaLienDepuis = null;
  render();
}

// Glisser un élément : déplacement affiché en direct, enregistré au relâcher ; un simple toucher le sélectionne
function schemaDemarrerGlisser(ev, svg, s, elId) {
  var e = s.elements.filter(function (x) { return x.id === elId; })[0];
  if (!e) return;
  var g = svg.querySelector('[data-el="' + elId.replace(/"/g, '') + '"]');
  var x0 = ev.clientX, y0 = ev.clientY, bouge = false, H = schemaH(s), pos = null;
  var move = function (mv) {
    if (!bouge && Math.abs(mv.clientX - x0) + Math.abs(mv.clientY - y0) < 6) return;
    bouge = true;
    pos = schemaPosition(mv, svg);
    if (g) g.setAttribute('transform', 'translate(' + (pos.x * SCHEMA_W).toFixed(1) + ' ' + (pos.y * H).toFixed(1) + ')');
  };
  var up = function () {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    if (bouge && pos) {
      state.schemaSel = { type: 'el', id: elId };
      schemaMaj(function (s) {
        var el = s.elements.filter(function (x) { return x.id === elId; })[0];
        if (el) { el.x = Math.round(pos.x * 10000) / 10000; el.y = Math.round(pos.y * 10000) / 10000; }
      });
    } else {
      state.schemaSel = { type: 'el', id: elId };
      render();
    }
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

function schemaElementSelectionne(s) {
  var sel = state.schemaSel;
  return sel && sel.type === 'el' ? s.elements.filter(function (x) { return x.id === sel.id; })[0] : null;
}

function schemaMajElement(key, value) {
  schemaMaj(function (s) { var e = schemaElementSelectionne(s); if (e) e[key] = String(value || '').trim().slice(0, 40); });
}

function schemaLierInstallation(idx) {
  var m = getCurrentMission(), items = (typeof overviewOrderedItems === 'function') ? overviewOrderedItems(m) : [];
  var it = idx === '' ? null : items[parseInt(idx, 10)];
  schemaMaj(function (s) {
    var e = schemaElementSelectionne(s);
    if (!e) return;
    e.inst = it ? it.inst.id : null;
    if (it && !e.t) e.t = String(overviewRowTitle(it)).slice(0, 40);
  });
}

function schemaSupprimerSelection() {
  var sel = state.schemaSel;
  if (!sel) return;
  state.schemaSel = null;
  schemaMaj(function (s) {
    if (sel.type === 'el') {
      s.elements = s.elements.filter(function (x) { return x.id !== sel.id; });
      s.liens = s.liens.filter(function (l) { return l.a !== sel.id && l.b !== sel.id; });
    } else s.liens = s.liens.filter(function (l) { return l.id !== sel.id; });
  });
}

function schemaInverserLien() {
  var sel = state.schemaSel;
  schemaMaj(function (s) { s.liens.forEach(function (l) { if (sel && l.id === sel.id) { var a = l.a; l.a = l.b; l.b = a; } }); });
}

function schemaRapport(on) {
  schemaMaj(function (s) { s.rapport = !!on; });
}

function schemaRenommer() {
  var s = schemaCourant(getCurrentMission());
  if (!s) return;
  var nom = prompt('Nom du schéma (ex. « Aspiration centralisée — menuiserie ») :', s.nom);
  if (nom === null || !String(nom).trim()) return;
  schemaMaj(function (s) { s.nom = String(nom).trim().slice(0, 80); });
}

function schemaSupprimer() {
  var m = getCurrentMission(), s = schemaCourant(m);
  if (!s || !confirm('Supprimer le schéma « ' + s.nom + ' » ?')) return;
  m.schemas = missionSchemas(m).filter(function (x) { return x.id !== s.id; });
  persistMissions();
  state.view = state.schemaRetour || 'mission-form';
  render();
}

// ————————————————————————————————————————————
// Rapport PDF : « 4.3 Schémas des réseaux »
// ————————————————————————————————————————————

function schemasPourRapport(m) {
  return missionSchemas(m).filter(function (s) { return s.rapport !== false && (s.elements || []).length; });
}

function schemaCompositeDataUrl(m, s) {
  if (typeof document === 'undefined') return Promise.resolve(null);
  var svg = schemaSvg(m, s, { legende: true, taille: 1800 });
  var fondP = s.fondPhotoId ? getPhotoBlob(s.fondPhotoId).then(function (b) { return b ? URL.createObjectURL(b) : null; }).catch(function () { return null; }) : Promise.resolve(null);
  var charger = function (src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  };
  return fondP.then(function (fondUrl) {
    return Promise.all([charger(fondUrl), charger('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))]).then(function (imgs) {
      if (fondUrl) URL.revokeObjectURL(fondUrl);
      var dessin = imgs[1];
      if (!dessin) return null;
      var W = 1800, H = Math.round(W * schemaH(s) / SCHEMA_W), Ht = dessin.naturalHeight ? Math.round(W * dessin.naturalHeight / dessin.naturalWidth) : H;
      var c = document.createElement('canvas');
      c.width = W; c.height = Ht;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, Ht);
      if (imgs[0]) { ctx.globalAlpha = 0.85; ctx.drawImage(imgs[0], 0, 0, W, H); ctx.globalAlpha = 1; }
      else {
        ctx.strokeStyle = '#e6ebf0'; ctx.lineWidth = 2;
        for (var gx = 0; gx <= W; gx += 72) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
        for (var gy = 0; gy <= H; gy += 72) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      }
      ctx.drawImage(dessin, 0, 0, W, Ht);
      return { url: c.toDataURL('image/jpeg', 0.88), w: W, h: Ht };
    });
  }).catch(function () { return null; });
}

function buildSchemaComposites(m) {
  var out = {};
  return Promise.all(schemasPourRapport(m).map(function (s) {
    return schemaCompositeDataUrl(m, s).then(function (a) { if (a) out[s.id] = a; });
  })).then(function () { return out; });
}

function pdfBuildSchemas(m) {
  var assets = (typeof PDF_ASSETS !== 'undefined' && PDF_ASSETS.schemas) || {};
  var content = [], first = true, items = schemaItemsParId(m);
  schemasPourRapport(m).forEach(function (s) {
    var a = assets[s.id];
    if (!a) return;
    var landscape = a.w > a.h * 1.15;
    var page = { stack: [], pageBreak: 'before', pageOrientation: landscape ? 'landscape' : 'portrait' };
    page.stack.push({ text: first ? '4.3 SCHEMAS DES RESEAUX' : '', bold: true, color: '#00B0F0', fontSize: 12, margin: [0, 30, 0, 6] });
    first = false;
    page.stack.push({ text: s.nom, bold: true, fontSize: 10.5, margin: [0, 0, 0, 2] });
    page.stack.push({ text: 'Schéma de principe établi sur site par le technicien SOCOTEC à partir des constatations visuelles, sans valeur de plan d’exécution ni de plan de récolement.', fontSize: 8, italics: true, margin: [0, 0, 0, 8] });
    page.stack.push({ image: a.url, fit: landscape ? [770, 330] : [520, 470], alignment: 'center', margin: [0, 0, 0, 10] });
    var lies = (s.elements || []).filter(function (e) { return e.inst && items[e.inst]; });
    if (lies.length) {
      var head = function (t) { return pdfDocsCell(t, { bold: true, color: 'white', fillColor: '#0082DE' }); };
      var COLORS = { 'status-ok': '#166534', 'status-bad': '#B42318', 'status-warn': '#92400E' };
      var body = [[head('Repère'), head('Installation contrôlée'), head('Bâtiment'), head('Avis')]];
      lies.forEach(function (e) {
        var it = items[e.inst], key = resolveAvisFieldKey(it.type);
        body.push([pdfDocsCell(e.t), pdfDocsCell(it.type.label + ' — ' + overviewRowTitle(it)), pdfDocsCell(it.inst.data.batiment),
          pdfDocsCell(it.status.state === 'todo' ? 'À faire' : (it.inst.data[key] || 'À compléter'), { color: COLORS[it.status.cls] || '#333333', bold: it.status.cls === 'status-bad' })]);
      });
      page.stack.push({ table: { headerRows: 1, widths: [90, '*', 110, 110], body: body }, layout: PDF_DOCS_LAYOUT });
    }
    content.push(page);
  });
  return content;
}

console.log('✓ Schémas de réseau chargés');
