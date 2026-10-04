// schemas.js - Schéma de réseau dessiné sur site (chantier du 2026-10-04, refondu le même jour)
//
// Quand le client n'a pas de plan de son réseau d'aspiration ou d'extraction, le technicien le
// schématise en quelques touchers :
//  - « Installation » : il choisit une installation déjà saisie et touche le schéma ; le symbole posé
//    lui est relié (nom, numéro, couleur de l'avis) et l'appli propose aussitôt la suivante ;
//  - symboles libres (poste, captage, registre, filtre, ventilateur, rejet, retour d'air, point de
//    mesure, texte), chacun avec un numéro (automatique, modifiable), un nom et une couleur ;
//  - gaines tracées d'un élément au suivant dans le sens de l'air, colorées selon leur rôle
//    (aspiration, rejet, recyclage, air neuf), avec un repère facultatif (ex. Ø200).
// Une légende (symboles, gaines, avis, nomenclature) accompagne le schéma à l'écran et dans le
// rapport. Le schéma peut compléter un plan du client (document joint pris comme fond). Il est annexé
// au rapport comme schéma de principe, sans valeur de plan d'exécution, et repris à la visite suivante.
//
// Données : m.schemas = [{ id, nom, ratio, fondPhotoId|null, rapport, elements: [{ id, k, x, y, n, t,
// c, inst }], liens: [{ id, a, b, g, t }] }] — x, y entre 0 et 1 ; k parmi SCHEMA_SYMBOLES ; n numéro,
// t nom, c couleur (clé de SCHEMA_COULEURS) ; inst = id de l'installation reliée ; un lien va de a vers
// b dans le sens de l'air, g parmi SCHEMA_GAINES. Le SVG est produit ici (textes échappés, symboles,
// couleurs et gaines pris dans des listes fermées — cf. docsNormaliser, js/documents-joints.js).

var SCHEMA_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="15" width="6" height="6" rx="1"/><circle cx="18" cy="6" r="3.5"/><path d="M5 15V9h10M18 9.5V21"/></svg>';
var SCHEMA_W = 1000, SCHEMA_S = 34; // largeur du repère, demi-taille d'un symbole
var SCHEMA_ENCRE = '#22313f', SCHEMA_MARINE = '#005499';
var SCHEMA_SYMBOLES = [
  { k: 'poste', nom: 'Poste / machine', court: 'Poste', fond: '#DCEBFA', pre: '' },
  { k: 'captage', nom: 'Captage / hotte', court: 'Captage', fond: '#D9F2EE', pre: '' },
  { k: 'registre', nom: 'Registre / clapet', court: 'Registre', fond: '#FFFFFF', pre: 'R' },
  { k: 'filtre', nom: 'Filtre / dépoussiéreur', court: 'Filtre', fond: '#FFE8CC', pre: 'F' },
  { k: 'ventilateur', nom: 'Ventilateur', court: 'Ventilateur', fond: '#E9E1FB', pre: 'V' },
  { k: 'rejet', nom: 'Rejet extérieur', court: 'Rejet', fond: null, pre: null },
  { k: 'recyclage', nom: 'Retour d’air (recyclage)', court: 'Retour d’air', fond: null, pre: null },
  { k: 'mesure', nom: 'Point de mesure', court: 'Mesure', fond: '#FFF3BF', pre: 'M' },
  { k: 'note', nom: 'Texte libre', court: 'Texte', fond: null, pre: null }
];
var SCHEMA_COULEURS = {
  bleu: '#DCEBFA', vert: '#DDF3E4', jaune: '#FFF3BF', orange: '#FFE2C6', rouge: '#FBD9D9', violet: '#E9E1FB', gris: '#ECEFF3'
};
var SCHEMA_GAINES = [
  { g: 'aspiration', nom: 'Aspiration / extraction', couleur: '#0082DE' },
  { g: 'rejet', nom: 'Rejet (refoulement)', couleur: '#7C3AED' },
  { g: 'recyclage', nom: 'Recyclage / retour d’air', couleur: '#0F9488' },
  { g: 'air_neuf', nom: 'Air neuf / soufflage', couleur: '#00ACE8' }
];
var SCHEMA_AVIS = [
  { cls: 'status-ok', nom: 'Satisfaisant' }, { cls: 'status-bad', nom: 'Non satisfaisant' },
  { cls: 'status-warn', nom: 'En cours / à compléter' }, { cls: 'status-muted', nom: 'À faire' }
];

function schemaSymbole(k) {
  return SCHEMA_SYMBOLES.filter(function (s) { return s.k === k; })[0] || null;
}
function schemaGaine(g) {
  return SCHEMA_GAINES.filter(function (x) { return x.g === g; })[0] || SCHEMA_GAINES[0];
}

function missionSchemas(m) {
  if (!Array.isArray(m.schemas)) m.schemas = [];
  return m.schemas;
}

function schemaCourant(m) {
  return missionSchemas(m).filter(function (s) { return s.id === state.schemaId; })[0] || null;
}

function schemaH(s) { return Math.round(SCHEMA_W * (s.ratio || 0.7)); }

// Symbole posé pour une installation selon son type (captages, ventilation, recyclage, sinon poste)
function schemaKindPourType(typeId) {
  if (/hotte|sorbonne|bras|captage|cabine|box|echap|decapage|fluide|solvant|torche|tts/.test(typeId)) return 'captage';
  if (/cta|extracteur/.test(typeId)) return 'ventilateur';
  if (/recyclage/.test(typeId)) return 'filtre';
  return 'poste';
}

// Numéro suivant pour un symbole : 1, 2, 3… pour postes et captages ; R1, F1, V1, M1… pour les autres
function schemaNumeroSuivant(s, k) {
  var sym = schemaSymbole(k);
  if (!sym || sym.pre === null) return '';
  var memeSerie = function (e) { var x = schemaSymbole(e.k); return x && x.pre === sym.pre; };
  var max = 0;
  (s.elements || []).forEach(function (e) {
    if (!memeSerie(e) || !e.n) return;
    var mm = String(e.n).match(sym.pre ? new RegExp('^' + sym.pre + '(\\d+)$', 'i') : /^(\d+)$/);
    if (mm) max = Math.max(max, parseInt(mm[1], 10));
  });
  return sym.pre + (max + 1);
}

// Dessin d'un symbole centré en (0,0) : trait de la couleur donnée, fond coloré
function schemaSymboleSvg(k, trait, fond) {
  var S = SCHEMA_S, c = trait || SCHEMA_ENCRE;
  var sym = schemaSymbole(k), f = fond || (sym && sym.fond) || '#ffffff';
  var st = ' fill="' + f + '" stroke="' + c + '" stroke-width="4" stroke-linejoin="round"';
  switch (k) {
    case 'poste': return '<rect x="' + -S + '" y="' + -S + '" width="' + 2 * S + '" height="' + 2 * S + '" rx="6"' + st + '/><path d="M' + -S * 0.5 + ' ' + S * 0.4 + 'h' + S + '" stroke="' + c + '" stroke-width="4"/>';
    case 'captage': return '<path d="M' + -S * 1.1 + ' ' + S * 0.7 + ' L' + -S * 0.4 + ' ' + -S * 0.7 + ' H' + S * 0.4 + ' L' + S * 1.1 + ' ' + S * 0.7 + ' Z"' + st + '/>';
    case 'registre': return '<circle r="' + S * 0.8 + '"' + st + '/><path d="M' + -S * 0.8 + ' ' + S * 0.8 + ' L' + S * 0.8 + ' ' + -S * 0.8 + '" stroke="' + c + '" stroke-width="4"/>';
    case 'filtre': return '<rect x="' + -S * 1.1 + '" y="' + -S * 0.85 + '" width="' + 2.2 * S + '" height="' + 1.7 * S + '" rx="3"' + st + '/><path d="M' + -S * 1.1 + ' ' + -S * 0.85 + ' L' + S * 1.1 + ' ' + S * 0.85 + ' M' + -S * 1.1 + ' ' + S * 0.85 + ' L' + S * 1.1 + ' ' + -S * 0.85 + '" stroke="' + c + '" stroke-width="3" fill="none"/>';
    case 'ventilateur': return '<circle r="' + S + '"' + st + '/><path d="M' + -S * 0.45 + ' ' + -S * 0.55 + ' L' + S * 0.6 + ' 0 L' + -S * 0.45 + ' ' + S * 0.55 + ' Z" fill="' + c + '"/>';
    case 'rejet': return '<path d="M0 ' + S + ' V' + -S * 0.5 + ' M' + -S * 0.65 + ' ' + -S * 0.1 + ' L0 ' + -S + ' L' + S * 0.65 + ' ' + -S * 0.1 + '" stroke="' + (trait || '#7C3AED') + '" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'recyclage': return '<path d="M' + S * 0.75 + ' ' + -S * 0.2 + ' A' + S * 0.75 + ' ' + S * 0.75 + ' 0 1 1 ' + S * 0.2 + ' ' + -S * 0.72 + '" stroke="' + (trait || '#0F9488') + '" stroke-width="5" fill="none"/><path d="M' + S * 0.05 + ' ' + -S + ' L' + S * 0.6 + ' ' + -S * 0.72 + ' L' + S * 0.05 + ' ' + -S * 0.4 + ' Z" fill="' + (trait || '#0F9488') + '"/>';
    case 'mesure': return '<path d="M0 ' + -S * 0.8 + ' L' + S * 0.8 + ' 0 L0 ' + S * 0.8 + ' L' + -S * 0.8 + ' 0 Z"' + st + '/><circle r="' + S * 0.18 + '" fill="' + c + '"/>';
    case 'note': return '<rect x="' + -S * 0.5 + '" y="' + -S * 0.5 + '" width="' + S + '" height="' + S + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-dasharray="4 3"/>';
  }
  return '';
}

function schemaIconeOutil(k) {
  return '<svg viewBox="-34 -34 68 68" class="schema-outil-icone">' + schemaSymboleSvg(k) + '</svg>';
}

function schemaIconeGaine(g, taille) {
  var c = schemaGaine(g).couleur;
  return '<svg viewBox="0 0 60 24" class="schema-icone-gaine"' + (taille ? ' width="' + taille + '"' : '') + '><path d="M4 12 H56" stroke="' + c + '" stroke-width="6" stroke-linecap="round"/><path d="M26 5 L38 12 L26 19 Z" fill="' + c + '"/></svg>';
}

// Installations de la mission (ordre de la vue d'ensemble), indexées par id
function schemaItemsParId(m) {
  var map = {};
  ((typeof overviewOrderedItems === 'function') ? overviewOrderedItems(m) : []).forEach(function (it) { if (it.inst.id) map[it.inst.id] = it; });
  return map;
}

function schemaStatutCls(e, items) {
  var it = e.inst && items[e.inst];
  return it ? it.status.cls : null;
}

function schemaElementCouleur(e, items) {
  var cls = schemaStatutCls(e, items);
  return cls ? (PLAN_PIN_COLORS[cls] || SCHEMA_ENCRE) : SCHEMA_ENCRE;
}

function schemaAvisTexte(it) {
  if (!it) return '';
  if (it.status.state === 'todo') return 'À faire';
  var key = resolveAvisFieldKey(it.type);
  return it.inst.data[key] || 'À compléter';
}

// Badge du numéro (couleur de l'avis si l'élément est relié à une installation)
function schemaBadgeSvg(n, couleur) {
  var txt = String(n), w = Math.max(38, 16 * txt.length + 16);
  return '<g transform="translate(' + (SCHEMA_S * 0.95) + ' ' + (-SCHEMA_S * 0.95) + ')"><rect x="' + (-w / 2) + '" y="-19" width="' + w + '" height="38" rx="19" fill="' + couleur + '" stroke="#ffffff" stroke-width="3"/>' +
    '<text y="8" text-anchor="middle" font-size="22" font-weight="700" fill="#ffffff">' + escapeHtml(txt) + '</text></g>';
}

// Éléments utilisés (pour la légende)
function schemaLegendeContenu(m, s) {
  var items = schemaItemsParId(m), kinds = [], gaines = [], avis = [];
  (s.elements || []).forEach(function (e) {
    if (e.k !== 'note' && schemaSymbole(e.k) && kinds.indexOf(e.k) === -1) kinds.push(e.k);
    var cls = schemaStatutCls(e, items);
    if (cls && avis.indexOf(cls) === -1) avis.push(cls);
  });
  (s.liens || []).forEach(function (l) { var g = schemaGaine(l.g).g; if (gaines.indexOf(g) === -1) gaines.push(g); });
  return {
    kinds: SCHEMA_SYMBOLES.filter(function (x) { return kinds.indexOf(x.k) !== -1; }).map(function (x) { return x.k; }),
    gaines: SCHEMA_GAINES.filter(function (x) { return gaines.indexOf(x.g) !== -1; }).map(function (x) { return x.g; }),
    avis: SCHEMA_AVIS.filter(function (x) { return avis.indexOf(x.cls) !== -1; })
  };
}

// Nomenclature : éléments numérotés ou nommés, triés par numéro
function schemaNomenclature(m, s) {
  var items = schemaItemsParId(m);
  var cle = function (n) { var mm = String(n || '').match(/^([A-Za-z]*)(\d+)/); return mm ? [mm[1].toUpperCase(), parseInt(mm[2], 10)] : ['~', 0]; };
  return (s.elements || []).filter(function (e) { return e.k !== 'note' && (e.n || e.t || e.inst); })
    .map(function (e) { return { e: e, it: e.inst ? items[e.inst] : null }; })
    .sort(function (a, b) {
      var ka = cle(a.e.n), kb = cle(b.e.n);
      return ka[0] < kb[0] ? -1 : ka[0] > kb[0] ? 1 : ka[1] - kb[1];
    });
}

// SVG du schéma. opts.edition : éléments sélectionnables ; opts.legende : bandeau de légende (rapport)
function schemaSvg(m, s, opts) {
  opts = opts || {};
  var H = schemaH(s), items = schemaItemsParId(m);
  var parId = {};
  (s.elements || []).forEach(function (e) { parId[e.id] = e; });
  var leg = opts.legende ? schemaLegendeContenu(m, s) : null, legH = 0, rangs = [];
  if (leg) {
    if (leg.kinds.length) rangs.push({ titre: 'Symboles', items: leg.kinds.map(function (k) { return { k: k, nom: schemaSymbole(k).nom }; }) });
    if (leg.gaines.length) rangs.push({ titre: 'Gaines (flèche = sens de l’air)', items: leg.gaines.map(function (g) { return { g: g, nom: schemaGaine(g).nom }; }) });
    if (leg.avis.length) rangs.push({ titre: 'Avis des installations contrôlées (couleur du numéro)', items: leg.avis.map(function (a) { return { cls: a.cls, nom: a.nom }; }) });
    rangs.forEach(function (r) { r.lignes = Math.ceil(r.items.length / 4); legH += 30 + r.lignes * 46; });
    if (legH) legH += 16;
  }
  var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SCHEMA_W + ' ' + (H + legH) + '"' +
    (opts.taille ? ' width="' + opts.taille + '" height="' + Math.round(opts.taille * (H + legH) / SCHEMA_W) + '"' : '') +
    ' font-family="Arial, sans-serif" class="schema-svg">';
  h += '<defs>' + SCHEMA_GAINES.map(function (g) {
    return '<marker id="schema-fleche-' + g.g + '" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="' + g.couleur + '"/></marker>';
  }).join('') + '</defs>';
  if (opts.fondBlanc) h += '<rect width="' + SCHEMA_W + '" height="' + (H + legH) + '" fill="#ffffff"/>';
  var sel = opts.edition && state.schemaSel;

  (s.liens || []).forEach(function (l) {
    var a = parId[l.a], b = parId[l.b];
    if (!a || !b) return;
    var gaine = schemaGaine(l.g);
    var x1 = a.x * SCHEMA_W, y1 = a.y * H, x2 = b.x * SCHEMA_W, y2 = b.y * H;
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, on = sel && sel.type === 'lien' && sel.id === l.id;
    var attr = opts.edition ? ' data-lien="' + escapeHtml(l.id) + '"' : '';
    if (opts.edition) h += '<path' + attr + ' d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="transparent" stroke-width="34"/>';
    if (on) h += '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="rgba(0,130,222,0.25)" stroke-width="22" stroke-linecap="round"/>';
    h += '<path' + attr + ' d="M' + x1 + ' ' + y1 + ' L' + mx + ' ' + my + ' L' + x2 + ' ' + y2 + '" stroke="' + gaine.couleur + '" stroke-width="7" fill="none" stroke-linecap="round" marker-mid="url(#schema-fleche-' + gaine.g + ')"/>';
    if (l.t) {
      var ang = Math.atan2(y2 - y1, x2 - x1), ox = -Math.sin(ang) * 22, oy = Math.cos(ang) * 22;
      h += '<text x="' + (mx + ox).toFixed(1) + '" y="' + (my + oy + 6).toFixed(1) + '" text-anchor="middle" font-size="17" font-weight="700" fill="' + gaine.couleur + '" stroke="#ffffff" stroke-width="5" paint-order="stroke">' + escapeHtml(l.t) + '</text>';
    }
  });

  (s.elements || []).forEach(function (e) {
    var sym = schemaSymbole(e.k);
    if (!sym) return;
    var x = e.x * SCHEMA_W, y = e.y * H, on = sel && sel.type === 'el' && sel.id === e.id;
    var depart = opts.edition && state.schemaLienDepuis === e.id;
    var cls = schemaStatutCls(e, items);
    h += '<g' + (opts.edition ? ' data-el="' + escapeHtml(e.id) + '"' : '') + ' transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')">';
    if (on || depart) h += '<circle r="' + (SCHEMA_S + 14) + '" fill="rgba(0,130,222,0.15)" stroke="#0082DE" stroke-width="3"' + (depart ? ' stroke-dasharray="6 4"' : '') + '/>';
    if (opts.edition) h += '<circle r="' + (SCHEMA_S + 10) + '" fill="transparent"/>';
    if (cls && e.k !== 'note') h += '<circle r="' + (SCHEMA_S + 8) + '" fill="none" stroke="' + (PLAN_PIN_COLORS[cls] || SCHEMA_ENCRE) + '" stroke-width="5"/>';
    if (e.k !== 'note' || opts.edition) h += schemaSymboleSvg(e.k, null, SCHEMA_COULEURS[e.c]); // cadre du texte libre : à l'écran seulement
    if (e.n && e.k !== 'note') h += schemaBadgeSvg(e.n, cls ? (PLAN_PIN_COLORS[cls] || SCHEMA_MARINE) : SCHEMA_MARINE);
    if (e.t) {
      // Sur le dessin, nom abrégé (le nom complet figure dans la nomenclature)
      var ty = e.k === 'note' ? 9 : SCHEMA_S + (cls ? 38 : 31), lib = String(e.t);
      if (e.k !== 'note' && lib.length > 24) lib = lib.slice(0, 22).replace(/[\s:,;–-]+$/, '') + '…';
      h += '<text y="' + ty + '" text-anchor="middle" font-size="' + (e.k === 'note' ? 26 : 24) + '" font-weight="700" fill="' + SCHEMA_ENCRE + '" stroke="#ffffff" stroke-width="7" paint-order="stroke">' + escapeHtml(lib) + '</text>';
    }
    h += '</g>';
  });

  if (legH) {
    var y0 = H + 8;
    h += '<rect x="0" y="' + H + '" width="' + SCHEMA_W + '" height="' + legH + '" fill="#f4f7fa"/><path d="M0 ' + H + ' H' + SCHEMA_W + '" stroke="#c9d4df" stroke-width="2"/>';
    rangs.forEach(function (r) {
      h += '<text x="18" y="' + (y0 + 22) + '" font-size="15" font-weight="700" fill="' + SCHEMA_MARINE + '">' + escapeHtml(r.titre) + '</text>';
      r.items.forEach(function (it, i) {
        var cx = 44 + (i % 4) * 240, cy = y0 + 54 + Math.floor(i / 4) * 46;
        if (it.k) h += '<g transform="translate(' + cx + ' ' + cy + ') scale(0.62)">' + schemaSymboleSvg(it.k) + '</g>';
        else if (it.g) h += '<path d="M' + (cx - 26) + ' ' + cy + ' H' + (cx + 22) + '" stroke="' + schemaGaine(it.g).couleur + '" stroke-width="7" stroke-linecap="round"/><path d="M' + (cx - 6) + ' ' + (cy - 8) + ' L' + (cx + 8) + ' ' + cy + ' L' + (cx - 6) + ' ' + (cy + 8) + ' Z" fill="' + schemaGaine(it.g).couleur + '"/>';
        else h += '<circle cx="' + cx + '" cy="' + cy + '" r="13" fill="' + (PLAN_PIN_COLORS[it.cls] || SCHEMA_ENCRE) + '"/>';
        h += '<text x="' + (cx + 32) + '" y="' + (cy + 5) + '" font-size="15" fill="' + SCHEMA_ENCRE + '">' + escapeHtml(it.nom) + '</text>';
      });
      y0 += 30 + r.lignes * 46;
    });
  }
  return h + '</svg>';
}

// ————————————————————————————————————————————
// Liste des schémas (carte « Plans, schémas et documents joints » et onglet Plan)
// ————————————————————————————————————————————

function renderSchemasList(m) {
  var list = missionSchemas(m);
  if (!list.length) return '';
  var h = '<div class="schemas-liste">';
  list.forEach(function (s, i) {
    var relies = (s.elements || []).filter(function (e) { return e.inst; }).length;
    h += '<div class="doc-joint"><div class="doc-joint-head" onclick="schemaOuvrir(' + i + ');">';
    h += '<span class="doc-thumb schema-thumb">' + schemaSvg(m, s, { fondBlanc: true }) + '</span>';
    h += '<div class="doc-joint-meta"><div class="doc-joint-nom">' + escapeHtml(s.nom) + '</div><div class="subtitle">Schéma dessiné · ' +
      (s.elements || []).length + ' élément(s)' + (relies ? ' · ' + relies + ' installation(s) reliée(s)' : '') + (s.rapport === false ? ' · hors rapport' : '') + '</div></div>';
    h += '<span class="doc-joint-chevron">›</span></div></div>';
  });
  return h + '</div>';
}

function schemaNouveau(fondPhotoId) {
  var m = getCurrentMission();
  if (!m) return;
  var creer = function (ratio) {
    // types: null -> l'éditeur demande d'abord quels types d'installations ce réseau regroupe
    var s = { id: 'sc_' + generateId(), nom: 'Réseau ' + (missionSchemas(m).length + 1), ratio: ratio, fondPhotoId: fondPhotoId || null,
      rapport: true, types: schemaInstallations(m).length ? null : [], elements: [], liens: [] };
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
  var m = getCurrentMission(), s = missionSchemas(m)[i];
  if (!s) return;
  state.schemaId = s.id;
  state.schemaSel = null;
  state.schemaLienDepuis = null;
  state.schemaHistorique = [];
  state.schemaChoixTypes = false;
  // Choix des types : présélection quand la mission n'en compte qu'un
  var typesMission = schemaTypesDeLaMission(m);
  state.schemaTypesChoix = Array.isArray(s.types) ? s.types.slice() : (typesMission.length === 1 ? [typesMission[0].type.id] : []);
  state.schemaRetour = state.view === 'mission-detail' ? 'mission-detail' : 'mission-form'; // ouvert depuis la vue Plan ou les données de la mission
  schemaOutilDeDepart(m, s);
  state.view = 'schema-editor';
  render();
  window.scrollTo(0, 0);
}

// ————————————————————————————————————————————
// Installations du site à placer sur le schéma
// ————————————————————————————————————————————

function schemaInstallations(m) {
  return (typeof overviewOrderedItems === 'function') ? overviewOrderedItems(m) : [];
}

// Installations proposées pour ce schéma : celles des types choisis à la création (s.types vide ou
// absent = toutes, ex. schémas antérieurs)
function schemaInstallationsDuSchema(m, s) {
  var items = schemaInstallations(m);
  if (!s || !Array.isArray(s.types) || !s.types.length) return items;
  return items.filter(function (it) { return s.types.indexOf(it.type.id) !== -1; });
}

// Schéma vide : on commence par placer les installations des types choisis, s'il y en a
function schemaOutilDeDepart(m, s) {
  if (s.elements.length) state.schemaOutil = 'select';
  else if (schemaInstallationsDuSchema(m, s).length) { state.schemaOutil = 'installation'; state.schemaInstCible = schemaProchaineInstallation(m, s); }
  else state.schemaOutil = 'poste';
}

// Types d'installations présents dans la mission, avec leur nombre
function schemaTypesDeLaMission(m) {
  var out = [], parId = {};
  schemaInstallations(m).forEach(function (it) {
    if (!parId[it.type.id]) { parId[it.type.id] = { type: it.type, n: 0 }; out.push(parId[it.type.id]); }
    parId[it.type.id].n++;
  });
  return out;
}

// Étape préalable : « Quelles installations ce réseau regroupe-t-il ? »
function renderSchemaChoixTypes(m, s) {
  var types = schemaTypesDeLaMission(m), choisis = state.schemaTypesChoix || [];
  var h = '<button class="back-btn" onclick="schemaFermer();">' + ICONS.arrowLeft + ' ' + (state.schemaRetour === 'mission-detail' ? 'Plan du site' : 'Documents de la mission') + '</button>';
  h += '<div class="card"><h1>' + SCHEMA_ICON + ' Nouveau schéma de réseau</h1>' +
    '<p class="subtitle">Quelles installations ce réseau regroupe-t-il ? Souvent un seul type (ex. les machines à bois d’une menuiserie), parfois plusieurs. Seules ces installations vous seront proposées sur le schéma.</p>';
  h += '<div class="schema-types">';
  types.forEach(function (x) {
    var on = choisis.indexOf(x.type.id) !== -1;
    h += '<button type="button" class="schema-type' + (on ? ' active' : '') + '" onclick="schemaBasculerType(\'' + x.type.id + '\');">' +
      '<span class="schema-type-coche">' + (on ? '✓' : '') + '</span><span class="schema-type-nom">' + escapeHtml(x.type.label) + '</span>' +
      '<span class="schema-type-nb">' + x.n + '</span></button>';
  });
  h += '</div>';
  h += '<div class="schema-types-actions"><button class="btn btn-primary" onclick="schemaValiderTypes(false);"' + (choisis.length ? '' : ' disabled') + '>' + ICONS.check + ' Continuer' +
    (choisis.length ? ' (' + schemaInstallations(m).filter(function (it) { return choisis.indexOf(it.type.id) !== -1; }).length + ' installation(s))' : '') + '</button>';
  h += '<button class="btn btn-gray btn-small" style="margin-top:8px;" onclick="schemaValiderTypes(true);">Proposer toutes les installations du site</button></div>';
  return h + '</div>';
}

function schemaBasculerType(typeId) {
  var c = (state.schemaTypesChoix || []).slice(), i = c.indexOf(typeId);
  if (i === -1) c.push(typeId); else c.splice(i, 1);
  state.schemaTypesChoix = c;
  render();
}

function schemaValiderTypes(toutes) {
  var m = getCurrentMission(), s = schemaCourant(m);
  if (!s) return;
  var avant = s.types;
  s.types = toutes ? [] : (state.schemaTypesChoix || []).slice();
  // Nom par défaut d'après le type choisi (« Réseau — Menuiserie (machines à bois) »)
  if (avant === null && /^Réseau \d+$/.test(s.nom) && s.types.length === 1) {
    var t = INSTALLATION_TYPES.filter(function (x) { return x.id === s.types[0]; })[0];
    if (t) s.nom = ('Réseau — ' + t.label).slice(0, 80);
  }
  persistMissions();
  state.schemaTypesChoix = null;
  state.schemaChoixTypes = false;
  if (!s.elements.length) schemaOutilDeDepart(m, s);
  else if (!schemaItemDeCle(m, state.schemaInstCible)) state.schemaInstCible = schemaProchaineInstallation(m, s);
  render();
}

function schemaModifierTypes() {
  var s = schemaCourant(getCurrentMission());
  if (!s) return;
  state.schemaTypesChoix = Array.isArray(s.types) ? s.types.slice() : [];
  state.schemaChoixTypes = true;
  render();
}

function schemaInstallationPlacee(s, instId) {
  return (s.elements || []).some(function (e) { return e.inst === instId; });
}

// Clé de l'installation suivante pas encore sur le schéma (même bâtiment que la dernière placée d'abord)
function schemaProchaineInstallation(m, s, apres) {
  var items = schemaInstallationsDuSchema(m, s).filter(function (it) { return !schemaInstallationPlacee(s, it.inst.id); });
  if (!items.length) return '';
  var bat = apres && apres.inst.data.batiment;
  var memeBat = bat ? items.filter(function (it) { return it.inst.data.batiment === bat; }) : [];
  var it = memeBat[0] || items[0];
  return it.type.id + ':' + it.idx;
}

function schemaItemDeCle(m, key) {
  var p = String(key || '').split(':');
  return schemaInstallations(m).filter(function (it) { return it.type.id === p[0] && it.idx === parseInt(p[1], 10); })[0] || null;
}

function renderSchemaPlacementInstallation(m, s) {
  var items = schemaInstallationsDuSchema(m, s);
  var cible = schemaItemDeCle(m, state.schemaInstCible);
  var h = '<div class="card schema-placement">';
  var libTypes = Array.isArray(s.types) && s.types.length ? INSTALLATION_TYPES.filter(function (t) { return s.types.indexOf(t.id) !== -1; }).map(function (t) { return t.label; }).join(', ') : 'toutes les installations du site';
  h += '<div class="schema-types-resume"><span>Réseau : <b>' + escapeHtml(libTypes) + '</b></span><button type="button" class="btn btn-gray btn-small" onclick="schemaModifierTypes();">Modifier</button></div>';
  if (!items.length) return h + '<p class="subtitle">Aucune installation de ce type saisie dans la mission pour l’instant. Ajoutez-les depuis l’écran de la mission, ou posez des symboles libres.</p></div>';
  h += '<div class="label">Installation à placer</div>';
  h += '<select class="input" onchange="state.schemaInstCible=this.value;render();"><option value="">— choisir —</option>';
  var parBat = {}, ordre = [];
  items.forEach(function (it) {
    var b = it.inst.data.batiment || 'Sans bâtiment';
    if (!parBat[b]) { parBat[b] = []; ordre.push(b); }
    parBat[b].push(it);
  });
  ordre.forEach(function (b) {
    h += '<optgroup label="' + escapeHtml(b) + '">';
    parBat[b].forEach(function (it) {
      var k = it.type.id + ':' + it.idx, place = schemaInstallationPlacee(s, it.inst.id);
      h += '<option value="' + k + '"' + (k === state.schemaInstCible ? ' selected' : '') + '>' + (place ? '✓ ' : '') + escapeHtml(it.type.label + ' — ' + overviewRowTitle(it)) + '</option>';
    });
    h += '</optgroup>';
  });
  h += '</select>';
  if (cible) {
    var place = schemaInstallationPlacee(s, cible.inst.id);
    h += '<div class="schema-placement-cible ' + cible.status.cls + '">' + schemaIconeOutil(schemaKindPourType(cible.type.id)) +
      '<span>' + (place ? 'Déjà sur le schéma — touchez pour en poser une autre fois : ' : 'Touchez le schéma pour placer : ') + '<b>' + escapeHtml(overviewRowTitle(cible)) + '</b>' +
      '<span class="subtitle"> · ' + escapeHtml(cible.type.label) + ' · ' + escapeHtml(cible.status.text) + '</span></span></div>';
  }
  var nb = items.filter(function (it) { return schemaInstallationPlacee(s, it.inst.id); }).length;
  h += '<div class="subtitle" style="margin-top:6px;">' + nb + ' installation(s) sur ' + items.length + ' placée(s) sur ce schéma.</div>';
  return h + '</div>';
}

// ————————————————————————————————————————————
// Éditeur
// ————————————————————————————————————————————

function renderSchemaEditor() {
  var m = getCurrentMission(), s = m && schemaCourant(m);
  if (!s) { state.view = m ? 'mission-form' : 'home'; return m ? renderMissionForm() : renderHome(); }
  if (s.types === null || state.schemaChoixTypes) return renderSchemaChoixTypes(m, s);
  var outil = state.schemaOutil || 'select';
  var h = '<button class="back-btn" onclick="schemaFermer();">' + ICONS.arrowLeft + ' ' + (state.schemaRetour === 'mission-detail' ? 'Plan du site' : 'Documents de la mission') + '</button>';
  h += '<div class="card schema-entete"><div class="schema-titre">' + SCHEMA_ICON + '<b>' + escapeHtml(s.nom) + '</b></div>' +
    '<button class="btn btn-gray btn-small" onclick="schemaRenommer();">' + ICONS.edit + ' Renommer</button></div>';

  var bouton = function (k, icone, libelle, extraCls) {
    return '<button type="button" class="schema-outil' + (extraCls || '') + (outil === k ? ' active' : '') + '" onclick="schemaChoisirOutil(\'' + k + '\');">' + icone + escapeHtml(libelle) + '</button>';
  };
  h += '<div class="schema-outils">';
  h += bouton('installation', '<svg viewBox="0 0 24 24" class="schema-outil-icone" fill="none" stroke="#0082DE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>', 'Installation', ' schema-outil-inst');
  h += bouton('lien', schemaIconeGaine('aspiration', 30).replace('class="schema-icone-gaine"', 'class="schema-outil-icone"'), 'Gaine');
  h += bouton('select', '<svg viewBox="0 0 24 24" class="schema-outil-icone" fill="none" stroke="' + SCHEMA_ENCRE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>', 'Déplacer');
  SCHEMA_SYMBOLES.forEach(function (sym) { h += bouton(sym.k, schemaIconeOutil(sym.k), sym.court); });
  h += '</div>';

  if (outil === 'installation') h += renderSchemaPlacementInstallation(m, s);

  h += '<div class="schema-stage' + (s.fondPhotoId ? ' avec-fond' : '') + '" style="aspect-ratio:' + SCHEMA_W + ' / ' + schemaH(s) + ';">';
  if (s.fondPhotoId) h += '<img class="schema-fond" alt="" data-photo-src="' + escapeHtml(s.fondPhotoId) + '">';
  h += '<div class="schema-dessin" onpointerdown="schemaPointerDown(event);">' + schemaSvg(m, s, { edition: true }) + '</div></div>';

  h += renderSchemaPanneau(m, s, outil);
  h += renderSchemaLegende(m, s);

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
    if (e) return h + renderSchemaPanneauElement(m, s, e) + '</div>';
  }
  if (sel && sel.type === 'lien') {
    var l = (s.liens || []).filter(function (x) { return x.id === sel.id; })[0];
    if (l) {
      h += '<div class="schema-panneau-titre">' + schemaIconeGaine(l.g, 40) + '<b>Gaine</b><span class="subtitle">la flèche indique le sens de l’air</span></div>';
      h += '<div class="label">Rôle de la gaine</div><div class="schema-choix">';
      SCHEMA_GAINES.forEach(function (g) {
        h += '<button type="button" class="schema-choix-btn' + (schemaGaine(l.g).g === g.g ? ' active' : '') + '" onclick="schemaMajLien(\'g\',\'' + g.g + '\');">' + schemaIconeGaine(g.g, 34) + escapeHtml(g.nom) + '</button>';
      });
      h += '</div>';
      h += '<div class="field"><label class="label">Repère sur la gaine (facultatif)</label><input type="text" class="input" maxlength="20" value="' + escapeHtml(l.t || '') + '" placeholder="ex. Ø200, gaine G1…" onchange="schemaMajLien(\'t\',this.value);"></div>';
      h += '<div class="row"><button class="btn btn-gray btn-small" onclick="schemaInverserLien();">⇄ Inverser le sens</button>';
      h += '<button class="btn btn-gray btn-small" onclick="schemaSupprimerSelection();">' + ICONS.trash + ' Supprimer</button></div>';
      return h + '</div>';
    }
  }
  var aide;
  if (outil === 'installation') aide = 'Choisissez une installation, puis touchez le schéma à son emplacement : le symbole est relié à l’installation (nom, numéro, couleur de l’avis) et la suivante est proposée.';
  else if (outil === 'select') aide = 'Touchez un élément ou une gaine pour le modifier (numéro, nom, couleur, installation reliée), faites-le glisser pour le déplacer.';
  else if (outil === 'lien') aide = state.schemaLienDepuis ? 'Touchez l’élément suivant dans le sens de l’air : la gaine se trace, et on continue depuis lui. Touchez le fond pour arrêter.' : 'Touchez l’élément d’où part l’air, puis le suivant : la gaine se trace dans le sens de l’air. Sa couleur se choisit en la touchant.';
  else aide = 'Touchez le schéma pour poser « ' + schemaSymbole(outil).nom + ' » (numéroté automatiquement). Recommencez autant de fois que nécessaire, puis reliez avec l’outil Gaine.';
  return h + '<p class="subtitle schema-aide">' + aide + '</p></div>';
}

function renderSchemaPanneauElement(m, s, e) {
  var parId = schemaItemsParId(m), it = e.inst ? parId[e.inst] : null;
  var items = schemaInstallationsDuSchema(m, s);
  if (it && items.indexOf(it) === -1 && !items.some(function (x) { return x.inst.id === it.inst.id; })) items = [it].concat(items);
  var h = '<div class="schema-panneau-titre">' + schemaIconeOutil(e.k) + '<select class="input schema-kind" onchange="schemaMajElement(\'k\',this.value);">';
  SCHEMA_SYMBOLES.forEach(function (sym) { h += '<option value="' + sym.k + '"' + (sym.k === e.k ? ' selected' : '') + '>' + escapeHtml(sym.nom) + '</option>'; });
  h += '</select></div>';
  if (e.k === 'note') {
    h += '<div class="field"><label class="label">Texte</label><input type="text" class="input" maxlength="40" value="' + escapeHtml(e.t || '') + '" onchange="schemaMajElement(\'t\',this.value);"></div>';
  } else {
    h += '<div class="schema-num-nom"><div class="field"><label class="label">N°</label><input type="text" class="input" maxlength="8" value="' + escapeHtml(e.n || '') + '" placeholder="1, R2…" onchange="schemaMajElement(\'n\',this.value);"></div>' +
      '<div class="field"><label class="label">Nom affiché</label><input type="text" class="input" maxlength="40" value="' + escapeHtml(e.t || '') + '" placeholder="ex. Raboteuse, cyclone…" onchange="schemaMajElement(\'t\',this.value);"></div></div>';
    h += '<div class="field"><label class="label">Installation contrôlée reliée</label><select class="input" onchange="schemaLierInstallation(this.value);"><option value="">— aucune —</option>';
    items.forEach(function (x) {
      h += '<option value="' + x.type.id + ':' + x.idx + '"' + (e.inst && e.inst === x.inst.id ? ' selected' : '') + '>' + escapeHtml(docInstallationLabel(x)) + '</option>';
    });
    h += '</select>';
    if (it) {
      h += '<div class="schema-lien-inst ' + it.status.cls + '"><span class="schema-pastille"></span><span><b>' + escapeHtml(it.type.label) + '</b> · ' + escapeHtml(it.status.text) + '</span>' +
        '<button type="button" class="btn btn-gray btn-small" onclick="schemaOuvrirFiche(\'' + it.type.id + '\',' + it.idx + ');">Ouvrir la fiche</button></div>';
    } else h += '<div class="subtitle">Reliez le symbole à son installation : il prend la couleur de l’avis et figure dans la nomenclature.</div>';
    h += '</div>';
    if (schemaSymbole(e.k).fond) {
      h += '<div class="label">Couleur</div><div class="schema-couleurs">';
      h += '<button type="button" class="schema-couleur auto' + (!e.c ? ' active' : '') + '" title="Couleur du symbole" style="background:' + schemaSymbole(e.k).fond + ';" onclick="schemaMajElement(\'c\',\'\');">A</button>';
      Object.keys(SCHEMA_COULEURS).forEach(function (c) {
        h += '<button type="button" class="schema-couleur' + (e.c === c ? ' active' : '') + '" title="' + c + '" style="background:' + SCHEMA_COULEURS[c] + ';" onclick="schemaMajElement(\'c\',\'' + c + '\');"></button>';
      });
      h += '</div>';
    }
  }
  h += '<div class="row" style="margin-top:10px;">';
  if (e.k !== 'note') h += '<button class="btn btn-gray btn-small" onclick="state.schemaOutil=\'lien\';state.schemaLienDepuis=state.schemaSel.id;render();">Tirer une gaine d’ici</button>';
  h += '<button class="btn btn-gray btn-small" onclick="schemaSupprimerSelection();">' + ICONS.trash + ' Supprimer</button></div>';
  return h;
}

// Légende et nomenclature sous le schéma (toucher une ligne sélectionne l'élément)
function renderSchemaLegende(m, s) {
  var leg = schemaLegendeContenu(m, s), nom = schemaNomenclature(m, s);
  if (!leg.kinds.length && !leg.gaines.length && !nom.length) return '';
  var h = '<div class="card schema-legende"><div class="section-title">Légende</div>';
  var groupe = function (titre, html) { if (html) h += '<div class="label schema-legende-titre">' + titre + '</div><div class="schema-legende-items">' + html + '</div>'; };
  groupe('Symboles', leg.kinds.map(function (k) { return '<span class="schema-legende-item">' + schemaIconeOutil(k) + escapeHtml(schemaSymbole(k).nom) + '</span>'; }).join(''));
  groupe('Gaines (flèche = sens de l’air)', leg.gaines.map(function (g) { return '<span class="schema-legende-item">' + schemaIconeGaine(g, 34) + escapeHtml(schemaGaine(g).nom) + '</span>'; }).join(''));
  groupe('Avis des installations (couleur du numéro)', leg.avis.map(function (a) { return '<span class="schema-legende-item"><span class="schema-pastille ' + a.cls + '"></span>' + escapeHtml(a.nom) + '</span>'; }).join(''));
  if (nom.length) {
    h += '<div class="label" style="margin-top:10px;">Nomenclature</div><div class="schema-nomenclature">';
    nom.forEach(function (r) {
      var cls = r.it ? r.it.status.cls : '';
      h += '<button type="button" class="schema-nom-ligne" onclick="state.schemaSel={type:\'el\',id:\'' + escapeHtml(r.e.id) + '\'};state.schemaOutil=\'select\';render();">' +
        '<span class="schema-num ' + cls + '">' + escapeHtml(r.e.n || '–') + '</span>' +
        '<span class="schema-nom-texte"><b>' + escapeHtml(r.e.t || schemaSymbole(r.e.k).nom) + '</b><span class="subtitle">' + escapeHtml(schemaSymbole(r.e.k).nom) +
        (r.it ? ' · ' + escapeHtml(r.it.type.label + ' — ' + schemaAvisTexte(r.it)) : '') + '</span></span></button>';
    });
    h += '</div>';
  }
  return h + '</div>';
}

function schemaOuvrirFiche(typeId, idx) {
  state.schemaSel = null;
  openOverviewInstallation(typeId, idx);
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
  if (k === 'installation') {
    var m = getCurrentMission(), s = schemaCourant(m);
    if (s && !schemaItemDeCle(m, state.schemaInstCible)) state.schemaInstCible = schemaProchaineInstallation(m, s);
  }
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

// Rôle d'une gaine déduit des éléments qu'elle relie (modifiable ensuite)
function schemaGaineDeduite(a, b) {
  if (b.k === 'rejet' || a.k === 'ventilateur') return 'rejet';
  if (b.k === 'recyclage' || a.k === 'recyclage') return 'recyclage';
  return 'aspiration';
}

function schemaPointerDown(ev) {
  var svg = ev.currentTarget.querySelector('svg');
  if (!svg) return;
  var m = getCurrentMission(), s = schemaCourant(m);
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
      var ea = s.elements.filter(function (x) { return x.id === de; })[0], eb = s.elements.filter(function (x) { return x.id === elId; })[0];
      schemaMaj(function (s) { s.liens.push({ id: 'l_' + generateId(), a: de, b: elId, g: schemaGaineDeduite(ea, eb), t: '' }); });
      return;
    }
    ev.preventDefault();
    schemaDemarrerGlisser(ev, svg, s, elId);
    return;
  }
  if (lienId) {
    state.schemaSel = { type: 'lien', id: lienId };
    state.schemaLienDepuis = null;
    if (outil !== 'select') state.schemaOutil = 'select';
    render();
    return;
  }
  // Fond du schéma
  var p = schemaPosition(ev, svg), id = 'e_' + generateId();
  var pos = { x: Math.round(p.x * 10000) / 10000, y: Math.round(p.y * 10000) / 10000 };
  if (outil === 'installation') {
    var it = schemaItemDeCle(m, state.schemaInstCible);
    if (!it) return;
    var k = schemaKindPourType(it.type.id);
    schemaMaj(function (s) {
      s.elements.push({ id: id, k: k, x: pos.x, y: pos.y, n: schemaNumeroSuivant(s, k), t: String(overviewRowTitle(it)).slice(0, 40), c: '', inst: it.inst.id });
      state.schemaInstCible = schemaProchaineInstallation(m, s, it);
    });
    return;
  }
  if (outil !== 'select' && outil !== 'lien' && schemaSymbole(outil)) {
    schemaMaj(function (s) {
      s.elements.push({ id: id, k: outil, x: pos.x, y: pos.y, n: schemaNumeroSuivant(s, outil), t: outil === 'note' ? 'Texte' : '', c: '', inst: null });
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
    state.schemaSel = { type: 'el', id: elId };
    if (state.schemaOutil !== 'select') state.schemaOutil = 'select';
    if (bouge && pos) {
      schemaMaj(function (s) {
        var el = s.elements.filter(function (x) { return x.id === elId; })[0];
        if (el) { el.x = Math.round(pos.x * 10000) / 10000; el.y = Math.round(pos.y * 10000) / 10000; }
      });
    } else render();
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
  schemaMaj(function (s) {
    var e = schemaElementSelectionne(s);
    if (!e) return;
    if (key === 'k') { if (schemaSymbole(value)) e.k = value; return; }
    if (key === 'c') { e.c = SCHEMA_COULEURS[value] ? value : ''; return; }
    e[key] = String(value || '').trim().slice(0, key === 'n' ? 8 : 40);
  });
}

function schemaMajLien(key, value) {
  var sel = state.schemaSel;
  schemaMaj(function (s) {
    s.liens.forEach(function (l) {
      if (!sel || l.id !== sel.id) return;
      if (key === 'g') l.g = schemaGaine(value).g;
      else l.t = String(value || '').trim().slice(0, 20);
    });
  });
}

function schemaLierInstallation(key) {
  var m = getCurrentMission();
  var it = key ? schemaItemDeCle(m, key) : null;
  schemaMaj(function (s) {
    var e = schemaElementSelectionne(s);
    if (!e) return;
    e.inst = it ? it.inst.id : null;
    if (it && !e.t) e.t = String(overviewRowTitle(it)).slice(0, 40);
    if (it && !e.n) e.n = schemaNumeroSuivant(s, e.k);
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
  var content = [], first = true;
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
    var nom = schemaNomenclature(m, s);
    if (nom.length) {
      var head = function (t) { return pdfDocsCell(t, { bold: true, color: 'white', fillColor: '#0082DE' }); };
      var COLORS = { 'status-ok': '#166534', 'status-bad': '#B42318', 'status-warn': '#92400E' };
      var body = [[head('N°'), head('Désignation'), head('Élément'), head('Installation contrôlée'), head('Avis')]];
      nom.forEach(function (r) {
        var it = r.it;
        body.push([pdfDocsCell(r.e.n, { alignment: 'center', bold: true }), pdfDocsCell(r.e.t), pdfDocsCell(schemaSymbole(r.e.k).nom),
          pdfDocsCell(it ? it.type.label + ' — ' + overviewRowTitle(it) + (it.inst.data.batiment ? ' (' + it.inst.data.batiment + ')' : '') : ''),
          pdfDocsCell(it ? schemaAvisTexte(it) : '', it ? { color: COLORS[it.status.cls] || '#333333', bold: it.status.cls === 'status-bad' } : {})]);
      });
      page.stack.push({ text: 'Nomenclature', bold: true, fontSize: 9.5, margin: [0, 2, 0, 4] });
      page.stack.push({ table: { headerRows: 1, widths: [34, 110, 90, '*', 100], body: body }, layout: PDF_DOCS_LAYOUT });
    }
    content.push(page);
  });
  return content;
}

console.log('✓ Schémas de réseau chargés');
