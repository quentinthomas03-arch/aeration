// schemas.js - Schéma de réseau dessiné sur site (chantier du 2026-10-04, version 3 « simple à lire,
// simple à faire » demandée par Quentin)
//
// But : montrer comment est fait le système (quelles installations, sur quel ventilateur, où va
// l'air), clair pour le lecteur du rapport et pour le technicien l'année suivante. Pas de cotes ni
// de réglages : les mesures sont dans le rapport.
//
//  - 5 éléments : Installation (choisie dans la mission, porte son numéro et la couleur de son avis),
//    Ventilateur, Filtre / dépoussiéreur, Rejet extérieur, Retour d'air (recyclage).
//  - Gaines tracées en touchant le départ puis l'arrivée ; les tronçons sont horizontaux / verticaux
//    (coude automatique) ; toucher le fond fait un angle ; toucher une gaine crée un piquage (division
//    vers plusieurs installations).
//  - Sens de l'air et couleur des gaines déduits du réseau : vers le ventilateur = aspiration (bleu),
//    du ventilateur vers le rejet = refoulement (violet), vers un retour d'air = recyclage (vert).
//
// Données : m.schemas = [{ id, nom, ratio, fondPhotoId|null, rapport, types, v: 3, elements: [{ id,
// k, x, y, inst, t }], liens: [{ id, a, b }] }] — x, y entre 0 et 1 ; k parmi SCHEMA_ELEMENTS ; inst =
// id de l'installation reliée ; t = libellé (anciens schémas seulement). Les schémas des versions 1-2
// sont convertis (schemaMigrer). SVG produit ici (textes échappés, éléments pris dans une liste fermée).

var SCHEMA_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="15" width="6" height="6" rx="1"/><circle cx="18" cy="6" r="3.5"/><path d="M5 15V9h10M18 9.5V21"/></svg>';
var SCHEMA_W = 1000, SCHEMA_S = 40, SCHEMA_INST_W = 290, SCHEMA_INST_H = 96; // tailles pensées pour un écran de téléphone
var SCHEMA_ENCRE = '#22313f';
var SCHEMA_ELEMENTS = [
  { k: 'inst', nom: 'Installation contrôlée', court: 'Installation' },
  { k: 'ventilateur', nom: 'Ventilateur', court: 'Ventilateur' },
  { k: 'filtre', nom: 'Filtre / dépoussiéreur', court: 'Filtre' },
  { k: 'rejet', nom: 'Rejet extérieur', court: 'Rejet' },
  { k: 'recyclage', nom: 'Retour d’air (recyclage)', court: 'Retour d’air' },
  { k: 'noeud', nom: 'Piquage', court: '' }
];
var SCHEMA_GAINES = {
  aspiration: { nom: 'Aspiration', couleur: '#0082DE' },
  refoulement: { nom: 'Refoulement vers l’extérieur', couleur: '#7C3AED' },
  recyclage: { nom: 'Retour d’air (recyclage)', couleur: '#0F9488' }
};
var SCHEMA_AVIS = [
  { cls: 'status-ok', nom: 'Satisfaisant' }, { cls: 'status-bad', nom: 'Non satisfaisant' },
  { cls: 'status-warn', nom: 'En cours / à compléter' }, { cls: 'status-muted', nom: 'À faire' }
];
var SCHEMA_FONDS_AVIS = { 'status-ok': '#E3F5EA', 'status-bad': '#FCE4E4', 'status-warn': '#FDF0DC', 'status-muted': '#EEF1F4' };

function schemaElement(k) {
  return SCHEMA_ELEMENTS.filter(function (s) { return s.k === k; })[0] || null;
}

function missionSchemas(m) {
  if (!Array.isArray(m.schemas)) m.schemas = [];
  m.schemas.forEach(schemaMigrer);
  return m.schemas;
}

function schemaCourant(m) {
  return missionSchemas(m).filter(function (s) { return s.id === state.schemaId; })[0] || null;
}

function schemaH(s) { return Math.round(SCHEMA_W * (s.ratio || 0.7)); }

// Schémas des versions 1-2 : postes et captages -> installations, registres et points de mesure ->
// simples piquages (le réseau reste relié), textes libres supprimés
function schemaMigrer(s) {
  if (!s) return s;
  if (s.v === 3) {
    // Élément de type inconnu (fichier reçu d'un tiers) : neutralisé en simple piquage
    (s.elements || []).forEach(function (e) { if (!schemaElement(e.k)) e.k = 'noeud'; });
    return s;
  }
  var supprimes = {};
  s.elements = (s.elements || []).filter(function (e) {
    if (e.k === 'note') { supprimes[e.id] = true; return false; }
    return true;
  }).map(function (e) {
    var k = e.k;
    if (k === 'poste' || k === 'captage') k = 'inst';
    else if (k === 'registre' || k === 'mesure') k = 'noeud';
    else if (!schemaElement(k)) k = 'noeud';
    return { id: e.id, k: k, x: e.x, y: e.y, inst: e.inst || null, t: k === 'inst' && !e.inst ? String(e.t || '').slice(0, 40) : '' };
  });
  s.liens = (s.liens || []).filter(function (l) { return !supprimes[l.a] && !supprimes[l.b]; }).map(function (l) { return { id: l.id, a: l.a, b: l.b }; });
  s.v = 3;
  return s;
}

// ————————————————————————————————————————————
// Géométrie : tracé des gaines en tronçons horizontaux / verticaux
// ————————————————————————————————————————————

function schemaPos(s, e) { return [e.x * SCHEMA_W, e.y * schemaH(s)]; }

// Gaine de a vers b : droite si alignés, sinon horizontale puis verticale (coude)
function schemaRoute(s, a, b) {
  var p = schemaPos(s, a), q = schemaPos(s, b);
  if (Math.abs(p[0] - q[0]) < 2 || Math.abs(p[1] - q[1]) < 2) return [p, q];
  return [p, [q[0], p[1]], q];
}

function schemaProjeter(pts, x, y) {
  var best = null;
  for (var i = 0; i < pts.length - 1; i++) {
    var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    var t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) : 0;
    var px = a[0] + t * dx, py = a[1] + t * dy, d = (px - x) * (px - x) + (py - y) * (py - y);
    if (!best || d < best.d) best = { x: px, y: py, d: d };
  }
  return best;
}

function schemaParId(s) {
  var o = {};
  (s.elements || []).forEach(function (e) { o[e.id] = e; });
  return o;
}

function schemaVoisins(s) {
  var adj = {};
  (s.elements || []).forEach(function (e) { adj[e.id] = []; });
  (s.liens || []).forEach(function (l) {
    if (adj[l.a] && adj[l.b]) { adj[l.a].push({ l: l, o: l.b }); adj[l.b].push({ l: l, o: l.a }); }
  });
  return adj;
}

// ————————————————————————————————————————————
// Sens de l'air et rôle des gaines, déduits du réseau
// ————————————————————————————————————————————

// Type d'installation relié à un élément (renseigné par schemaOrientationPour, sinon inconnu)
var _schemaTypesInst = {};
function schemaInstEstRecyclage(e) {
  return /recyclage/.test(_schemaTypesInst[e.inst] || '');
}

// Renvoie { idLien: { de, vers, genre } } (de -> vers = sens de l'air ; null si indéterminé)
function schemaOrientation(s) {
  var par = schemaParId(s), adj = schemaVoisins(s), out = {};
  var estVentil = function (id) { return par[id] && par[id].k === 'ventilateur'; };
  var orienterDepuis = function (racine, premier, cote) {
    // Parcours en largeur depuis le ventilateur (ou la racine), sans traverser un autre ventilateur
    var dist = {}, parent = {}, ordre = [racine], file = [];
    dist[racine] = 0;
    var entrer = function (v, depuis) { dist[v.o] = dist[depuis] + 1; parent[v.o] = { n: depuis, l: v.l }; file.push(v.o); ordre.push(v.o); };
    if (premier) entrer(premier, racine);
    else adj[racine].forEach(function (v) { if (dist[v.o] === undefined) entrer(v, racine); });
    while (file.length) {
      var n = file.shift();
      if (estVentil(n) && n !== racine) continue;
      adj[n].forEach(function (v) { if (dist[v.o] === undefined) entrer(v, n); });
    }
    // Refoulement : une branche qui ne mène qu'à des retours d'air est en recyclage
    var drapeaux = {};
    ordre.slice().sort(function (x, y) { return dist[y] - dist[x]; }).forEach(function (n) {
      var e = par[n], f = drapeaux[n] || 0;
      if (e && e.k === 'rejet') f |= 1;
      if (e && e.k === 'recyclage') f |= 2;
      drapeaux[n] = f;
      if (parent[n]) drapeaux[parent[n].n] = (drapeaux[parent[n].n] || 0) | f;
    });
    Object.keys(dist).forEach(function (n) {
      if (estVentil(n) && n !== racine) return;
      adj[n].forEach(function (v) {
        if (out[v.l.id] || dist[v.o] === undefined) return;
        if (n === racine && premier && v.l.id !== premier.l.id) return; // autre côté du ventilateur
        var proche = dist[n] <= dist[v.o] ? n : v.o, loin = proche === n ? v.o : n;
        var genre = 'aspiration';
        if (cote === 'ref') genre = (drapeaux[loin] === 2) ? 'recyclage' : 'refoulement';
        out[v.l.id] = cote === 'ref' ? { de: proche, vers: loin, genre: genre } : { de: loin, vers: proche, genre: genre };
      });
    });
  };
  (s.elements || []).filter(function (e) { return e.k === 'ventilateur'; }).forEach(function (f) {
    adj[f.id].forEach(function (v) {
      if (out[v.l.id]) return;
      // Ce côté du ventilateur mène-t-il à des installations (aspiration) ou au rejet (refoulement) ?
      // (une installation de recyclage, ex. un dépoussiéreur contrôlé, peut être côté refoulement)
      var vus = {}, file = [v.o], kinds = {};
      vus[f.id] = true; vus[v.o] = true;
      while (file.length) {
        var n = file.shift();
        if (par[n]) {
          kinds[par[n].k] = true;
          if (par[n].k === 'inst' && !schemaInstEstRecyclage(par[n])) kinds.captage = true;
        }
        if (estVentil(n)) continue;
        adj[n].forEach(function (w) { if (!vus[w.o]) { vus[w.o] = true; file.push(w.o); } });
      }
      var cote = (kinds.rejet || kinds.recyclage) && !kinds.captage ? 'ref' : 'asp';
      orienterDepuis(f.id, v, cote);
    });
  });
  // Réseau sans ventilateur : l'air va vers le filtre ou le rejet s'il y en a un
  (s.liens || []).forEach(function (l) {
    if (out[l.id]) return;
    var vus = {}, file = [l.a], racine = null;
    vus[l.a] = true;
    while (file.length) {
      var n = file.shift();
      if (par[n] && !racine && /filtre|rejet|recyclage/.test(par[n].k)) racine = n;
      (adj[n] || []).forEach(function (w) { if (!vus[w.o]) { vus[w.o] = true; file.push(w.o); } });
    }
    if (racine) orienterDepuis(racine, null, 'asp');
    if (!out[l.id]) out[l.id] = { de: null, vers: null, genre: 'aspiration' };
  });
  return out;
}

// ————————————————————————————————————————————
// Installations, numéros, avis
// ————————————————————————————————————————————

function schemaInstallations(m) {
  return (typeof overviewOrderedItems === 'function') ? overviewOrderedItems(m) : [];
}

function schemaItemsParId(m) {
  var map = {};
  schemaInstallations(m).forEach(function (it) { if (it.inst.id) { map[it.inst.id] = it; _schemaTypesInst[it.inst.id] = it.type.id; } });
  return map;
}

// Numéros des installations du schéma (1, 2, 3… dans l'ordre de lecture : de gauche à droite par
// colonnes, puis de haut en bas)
function schemaNumeros(m, s) {
  var out = {};
  (s.elements || []).filter(function (e) { return e.k === 'inst'; })
    .sort(function (a, b) { return Math.round(a.x * 8) - Math.round(b.x * 8) || a.y - b.y; })
    .forEach(function (e, i) { out[e.id] = i + 1; });
  return out;
}

function schemaAvisTexte(it) {
  if (!it) return '';
  if (it.status.state === 'todo') return 'À faire';
  var key = resolveAvisFieldKey(it.type);
  return it.inst.data[key] || 'À compléter';
}

function schemaNomInst(e, it) {
  return it ? String(overviewRowTitle(it)) : (e.t || 'Poste non relié');
}

// Nomenclature : installations du schéma, par numéro
function schemaNomenclature(m, s) {
  var items = schemaItemsParId(m), nums = schemaNumeros(m, s);
  return (s.elements || []).filter(function (e) { return e.k === 'inst'; })
    .map(function (e) { return { e: e, n: nums[e.id], it: e.inst !== null ? items[e.inst] || null : null }; })
    .sort(function (a, b) { return a.n - b.n; });
}

// ————————————————————————————————————————————
// Bilan du réseau : débit au ventilateur / somme des débits mesurés aux captages
// ————————————————————————————————————————————

// Champ du débit mesuré (m³/h) de chaque type, dans l'ordre de préférence
var SCHEMA_DEBIT_CHAMPS = {
  extracteur: ['debit_annee_en_cours'], cta: ['rep_debit', 'souf_debit'], menuiserie: ['debit_annee_en_cours'],
  menuiserie_bis: ['debit'], hottes: ['vpe_debit'], sorbonnes: ['debit_mesure'], bras_aspiration: ['debit_calcule'],
  cabines_peinture: ['debit_mesure'], box_peinture: ['debit_extraction_box'], gaz_echappement: ['debit_mesure'],
  installations_diverses: ['debit_vt'], fluide_coupe: ['debit_mesure'], poste_solvant: ['debit_mesure'],
  decapage: ['debit_extrait'], recyclage: ['debit_recycle'], local_specifique: ['debit_global_extrait']
};

function schemaDebit(it) {
  if (!it) return null;
  var champs = SCHEMA_DEBIT_CHAMPS[it.type.id] || [];
  for (var i = 0; i < champs.length; i++) {
    var v = num(it.inst.data[champs[i]]);
    if (!isNaN(v) && v > 0) return v;
  }
  return null;
}

// Pour chaque ventilateur relié à une installation mesurée : { fan, it, qv, qc, n, sansDebit, ecart }
function schemaBilanReseau(m, s) {
  var items = schemaItemsParId(m), par = schemaParId(s), adj = schemaVoisins(s), orient = schemaOrientation(s), out = [];
  (s.elements || []).filter(function (e) { return e.k === 'ventilateur' && e.inst !== null && e.inst !== undefined && items[e.inst]; }).forEach(function (f) {
    var it = items[f.inst], qv = schemaDebit(it);
    if (qv === null) return;
    // Installations du côté aspiration de ce ventilateur (sans traverser un autre ventilateur)
    var vus = {}, file = [f.id], qc = 0, n = 0, sansDebit = [];
    vus[f.id] = true;
    while (file.length) {
      var id = file.shift();
      (adj[id] || []).forEach(function (v) {
        if (vus[v.o] || !orient[v.l.id] || orient[v.l.id].genre !== 'aspiration') return;
        vus[v.o] = true;
        var e = par[v.o];
        if (!e || e.k === 'ventilateur') return;
        if (e.k === 'inst' && e.inst !== f.inst) {
          var q = schemaDebit(items[e.inst]);
          if (q === null) sansDebit.push(schemaNomInst(e, items[e.inst] || null)); else { qc += q; n++; }
        }
        file.push(v.o);
      });
    }
    if (!n) return;
    out.push({ fan: f, it: it, qv: qv, qc: qc, n: n, sansDebit: sansDebit, ecart: (qv - qc) / qv });
  });
  return out;
}

function schemaBilanTexte(b) {
  var fr = function (v) { return Math.round(v).toLocaleString('fr-FR'); };
  var pct = Math.round(Math.abs(b.ecart) * 100);
  var t = 'Ventilateur (' + overviewRowTitle(b.it) + ') : ' + fr(b.qv) + ' m³/h. Somme des débits mesurés aux ' + b.n + ' installation(s) raccordée(s) : ' + fr(b.qc) + ' m³/h';
  t += pct < 10 ? ', cohérente (écart de ' + pct + ' %).' : ' (' + (b.ecart > 0 ? 'inférieure' : 'supérieure') + ' de ' + pct + ' %).';
  if (b.sansDebit.length) t += ' Sans débit mesuré : ' + b.sansDebit.join(', ') + '.';
  if (pct >= 10) t += ' Écart à examiner : captages ou ouvertures non relevés, fuites, mesures faites à des moments différents.';
  return t;
}

// ————————————————————————————————————————————
// Dessin
// ————————————————————————————————————————————

function schemaSymboleSvg(k, couleur) {
  var S = SCHEMA_S, c = couleur || SCHEMA_ENCRE;
  switch (k) {
    case 'ventilateur': return '<circle r="' + S + '" fill="#ffffff" stroke="' + c + '" stroke-width="5"/><path d="M' + -S * 0.42 + ' ' + -S * 0.55 + ' L' + S * 0.62 + ' 0 L' + -S * 0.42 + ' ' + S * 0.55 + ' Z" fill="' + c + '"/>';
    case 'filtre': return '<rect x="' + -S + '" y="' + -S * 0.85 + '" width="' + 2 * S + '" height="' + 1.7 * S + '" rx="3" fill="#ffffff" stroke="' + c + '" stroke-width="5"/><path d="M' + -S + ' ' + -S * 0.85 + ' L' + S + ' ' + S * 0.85 + ' M' + -S + ' ' + S * 0.85 + ' L' + S + ' ' + -S * 0.85 + '" stroke="' + c + '" stroke-width="3"/>';
    case 'rejet': return '<circle r="' + S + '" fill="#F3EEFF" stroke="#7C3AED" stroke-width="4"/><path d="M0 ' + S * 0.55 + ' V' + -S * 0.45 + ' M' + -S * 0.45 + ' ' + -S * 0.05 + ' L0 ' + -S * 0.55 + ' L' + S * 0.45 + ' ' + -S * 0.05 + '" stroke="#7C3AED" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'recyclage': return '<circle r="' + S + '" fill="#E6F6F3" stroke="#0F9488" stroke-width="4"/><path d="M' + S * 0.5 + ' ' + -S * 0.1 + ' A' + S * 0.5 + ' ' + S * 0.5 + ' 0 1 1 ' + S * 0.12 + ' ' + -S * 0.48 + '" stroke="#0F9488" stroke-width="4.5" fill="none"/><path d="M' + S * 0.02 + ' ' + -S * 0.72 + ' L' + S * 0.42 + ' ' + -S * 0.48 + ' L' + S * 0.02 + ' ' + -S * 0.22 + ' Z" fill="#0F9488"/>';
    case 'inst': return '<rect x="' + -S * 0.9 + '" y="' + -S * 0.6 + '" width="' + S * 1.8 + '" height="' + S * 1.2 + '" rx="5" fill="#EEF4FB" stroke="' + c + '" stroke-width="4"/>';
  }
  return '';
}

function schemaIconeOutil(k) {
  return '<svg viewBox="-36 -36 72 72" class="schema-outil-icone">' + schemaSymboleSvg(k) + '</svg>';
}

function schemaIconeGaine(genre, taille) {
  var c = (SCHEMA_GAINES[genre] || SCHEMA_GAINES.aspiration).couleur;
  return '<svg viewBox="0 0 60 24" class="schema-icone-gaine"' + (taille ? ' width="' + taille + '"' : '') + '><path d="M4 12 H56" stroke="' + c + '" stroke-width="6" stroke-linecap="round"/><path d="M26 5 L38 12 L26 19 Z" fill="' + c + '"/></svg>';
}

function schemaTronquer(t, n) {
  t = String(t || '');
  return t.length > n ? t.slice(0, n - 1).replace(/[\s:,;–-]+$/, '') + '…' : t;
}

// Éléments présents (légende)
function schemaLegendeContenu(m, s) {
  var items = schemaItemsParId(m), orient = schemaOrientation(s), kinds = {}, genres = {}, avis = {};
  (s.elements || []).forEach(function (e) {
    if (e.k !== 'noeud' && e.k !== 'inst') kinds[e.k] = true;
    var it = e.k === 'inst' && e.inst !== null ? items[e.inst] : null;
    if (it) avis[it.status.cls] = true;
  });
  Object.keys(orient).forEach(function (id) { genres[orient[id].genre] = true; });
  return {
    kinds: SCHEMA_ELEMENTS.filter(function (x) { return kinds[x.k]; }).map(function (x) { return x.k; }),
    gaines: Object.keys(SCHEMA_GAINES).filter(function (g) { return genres[g]; }),
    avis: SCHEMA_AVIS.filter(function (a) { return avis[a.cls]; })
  };
}

// SVG du schéma. opts.edition : éléments sélectionnables ; opts.legende : bandeau de légende (rapport)
function schemaSvg(m, s, opts) {
  opts = opts || {};
  schemaMigrer(s);
  var H = schemaH(s), items = schemaItemsParId(m), par = schemaParId(s), adj = schemaVoisins(s);
  var orient = schemaOrientation(s), nums = schemaNumeros(m, s);
  var leg = opts.legende ? schemaLegendeContenu(m, s) : null, rangs = [], legH = 0;
  if (leg) {
    if (leg.gaines.length) rangs.push({ titre: 'Gaines (la flèche indique le sens de l’air)', items: leg.gaines.map(function (g) { return { g: g, nom: SCHEMA_GAINES[g].nom }; }) });
    if (leg.kinds.length) rangs.push({ titre: 'Équipements', items: leg.kinds.map(function (k) { return { k: k, nom: schemaElement(k).nom }; }) });
    if (leg.avis.length) rangs.push({ titre: 'Avis des installations contrôlées', items: leg.avis.map(function (a) { return { cls: a.cls, nom: a.nom }; }) });
    rangs.forEach(function (r) { r.lignes = Math.ceil(r.items.length / 3); legH += 30 + r.lignes * 44; });
    if (legH) legH += 14;
  }
  var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SCHEMA_W + ' ' + (H + legH) + '"' +
    (opts.taille ? ' width="' + opts.taille + '" height="' + Math.round(opts.taille * (H + legH) / SCHEMA_W) + '"' : '') +
    ' font-family="Arial, sans-serif" class="schema-svg">';
  if (opts.fondBlanc) h += '<rect width="' + SCHEMA_W + '" height="' + (H + legH) + '" fill="#ffffff"/>';
  var sel = opts.edition && state.schemaSel;

  // Gaines
  (s.liens || []).forEach(function (l) {
    var a = par[l.a], b = par[l.b];
    if (!a || !b) return;
    var o = orient[l.id] || { genre: 'aspiration' }, coul = SCHEMA_GAINES[o.genre].couleur;
    var pts = schemaRoute(s, a, b), d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
    var on = sel && sel.type === 'lien' && sel.id === l.id, attr = opts.edition ? ' data-lien="' + escapeHtml(l.id) + '"' : '';
    if (opts.edition) h += '<path' + attr + ' d="' + d + '" stroke="transparent" stroke-width="48" fill="none"/>';
    if (on) h += '<path d="' + d + '" stroke="rgba(0,130,222,0.28)" stroke-width="32" fill="none" stroke-linejoin="round" stroke-linecap="round"/>';
    h += '<path' + attr + ' d="' + d + '" stroke="' + coul + '" stroke-width="12" fill="none" stroke-linejoin="round" stroke-linecap="round"/>';
    // Flèche au milieu du plus long tronçon, dans le sens de l'air
    if (o.de) {
      var seq = o.de === l.a ? pts : pts.slice().reverse(), lg = -1, mid = null, ang = 0;
      for (var i = 0; i < seq.length - 1; i++) {
        var dx = seq[i + 1][0] - seq[i][0], dy = seq[i + 1][1] - seq[i][1], len = Math.sqrt(dx * dx + dy * dy);
        if (len > lg) { lg = len; mid = [(seq[i][0] + seq[i + 1][0]) / 2, (seq[i][1] + seq[i + 1][1]) / 2]; ang = Math.atan2(dy, dx) * 180 / Math.PI; }
      }
      if (lg > 60) h += '<path d="M-16 -16 L16 0 L-16 16 Z" fill="' + coul + '" stroke="#ffffff" stroke-width="3" transform="translate(' + mid[0].toFixed(1) + ' ' + mid[1].toFixed(1) + ') rotate(' + ang.toFixed(1) + ')"/>';
    }
  });

  // Éléments
  (s.elements || []).forEach(function (e) {
    var p = schemaPos(s, e), on = sel && sel.type === 'el' && sel.id === e.id;
    var depart = opts.edition && state.schemaTraceDepuis === e.id;
    var attr = opts.edition ? ' data-el="' + escapeHtml(e.id) + '"' : '';
    h += '<g' + attr + ' transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')">';
    if (e.k === 'noeud') {
      var piquage = (adj[e.id] || []).length >= 3;
      if (on || depart) h += '<circle r="30" fill="rgba(0,130,222,0.18)" stroke="#0082DE" stroke-width="4"' + (depart ? ' stroke-dasharray="8 5"' : '') + '/>';
      if (opts.edition) h += '<circle r="30" fill="transparent"/>';
      if (piquage || opts.edition) h += '<circle r="' + (piquage ? 13 : 9) + '" fill="' + (piquage ? '#0b4f8a' : '#ffffff') + '" stroke="#0b4f8a" stroke-width="4"/>';
    } else if (e.k === 'inst') {
      var it = e.inst !== null ? items[e.inst] : null, cls = it ? it.status.cls : 'status-muted';
      var trait = it ? (PLAN_PIN_COLORS[cls] || SCHEMA_ENCRE) : '#8a94a3', W2 = SCHEMA_INST_W / 2, H2 = SCHEMA_INST_H / 2;
      if (on || depart) h += '<rect x="' + (-W2 - 10) + '" y="' + (-H2 - 10) + '" width="' + (SCHEMA_INST_W + 20) + '" height="' + (SCHEMA_INST_H + 20) + '" rx="12" fill="rgba(0,130,222,0.15)" stroke="#0082DE" stroke-width="3"' + (depart ? ' stroke-dasharray="6 4"' : '') + '/>';
      h += '<rect x="' + -W2 + '" y="' + -H2 + '" width="' + SCHEMA_INST_W + '" height="' + SCHEMA_INST_H + '" rx="8" fill="' + (SCHEMA_FONDS_AVIS[cls] || '#ffffff') + '" stroke="' + trait + '" stroke-width="4"/>';
      h += '<circle cx="' + (-W2 + 34) + '" cy="0" r="25" fill="' + trait + '"/><text x="' + (-W2 + 34) + '" y="10" text-anchor="middle" font-size="29" font-weight="700" fill="#ffffff">' + (nums[e.id] || '') + '</text>';
      h += '<text x="' + (-W2 + 68) + '" y="' + (it ? -5 : 9) + '" font-size="26" font-weight="700" fill="' + SCHEMA_ENCRE + '">' + escapeHtml(schemaTronquer(schemaNomInst(e, it), 15)) + '</text>';
      if (it) h += '<text x="' + (-W2 + 68) + '" y="27" font-size="21" fill="#4b5a6a">' + escapeHtml(schemaTronquer(it.type.label.replace(/\s*\(.*\)\s*$/, ''), 17)) + '</text>';
    } else {
      if (on || depart) h += '<circle r="' + (SCHEMA_S + 13) + '" fill="rgba(0,130,222,0.15)" stroke="#0082DE" stroke-width="3"' + (depart ? ' stroke-dasharray="6 4"' : '') + '/>';
      if (opts.edition) h += '<circle r="' + (SCHEMA_S + 10) + '" fill="transparent"/>';
      h += schemaSymboleSvg(e.k);
      h += '<text y="' + (SCHEMA_S + 32) + '" text-anchor="middle" font-size="25" font-weight="700" fill="' + SCHEMA_ENCRE + '" stroke="#ffffff" stroke-width="7" paint-order="stroke">' + escapeHtml(schemaElement(e.k).court) + '</text>';
      var ventInst = e.k === 'ventilateur' && e.inst !== null && e.inst !== undefined ? items[e.inst] : null;
      if (ventInst) h += '<text y="' + (SCHEMA_S + 58) + '" text-anchor="middle" font-size="19" fill="#4b5a6a" stroke="#ffffff" stroke-width="6" paint-order="stroke">' + escapeHtml(schemaTronquer(overviewRowTitle(ventInst), 20)) + '</text>';
    }
    h += '</g>';
  });

  if (legH) {
    var y0 = H + 8;
    h += '<rect x="0" y="' + H + '" width="' + SCHEMA_W + '" height="' + legH + '" fill="#f4f7fa"/><path d="M0 ' + H + ' H' + SCHEMA_W + '" stroke="#c9d4df" stroke-width="2"/>';
    rangs.forEach(function (r) {
      h += '<text x="18" y="' + (y0 + 22) + '" font-size="15" font-weight="700" fill="#005499">' + escapeHtml(r.titre) + '</text>';
      r.items.forEach(function (it, i) {
        var cx = 46 + (i % 3) * 320, cy = y0 + 52 + Math.floor(i / 3) * 44;
        if (it.g) {
          var c = SCHEMA_GAINES[it.g].couleur;
          h += '<path d="M' + (cx - 28) + ' ' + cy + ' H' + (cx + 24) + '" stroke="' + c + '" stroke-width="8" stroke-linecap="round"/><path d="M' + (cx - 8) + ' ' + (cy - 10) + ' L' + (cx + 10) + ' ' + cy + ' L' + (cx - 8) + ' ' + (cy + 10) + ' Z" fill="' + c + '" stroke="#ffffff" stroke-width="2"/>';
        } else if (it.k) h += '<g transform="translate(' + cx + ' ' + cy + ') scale(0.45)">' + schemaSymboleSvg(it.k) + '</g>';
        else h += '<rect x="' + (cx - 20) + '" y="' + (cy - 13) + '" width="40" height="26" rx="5" fill="' + SCHEMA_FONDS_AVIS[it.cls] + '" stroke="' + (PLAN_PIN_COLORS[it.cls] || SCHEMA_ENCRE) + '" stroke-width="3"/>';
        h += '<text x="' + (cx + 36) + '" y="' + (cy + 5) + '" font-size="15" fill="' + SCHEMA_ENCRE + '">' + escapeHtml(it.nom) + '</text>';
      });
      y0 += 30 + r.lignes * 44;
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
    var n = (s.elements || []).filter(function (e) { return e.k === 'inst'; }).length;
    h += '<div class="doc-joint"><div class="doc-joint-head" onclick="schemaOuvrir(' + i + ');">';
    h += '<span class="doc-thumb schema-thumb">' + schemaSvg(m, s, { fondBlanc: true }) + '</span>';
    h += '<div class="doc-joint-meta"><div class="doc-joint-nom">' + escapeHtml(s.nom) + '</div><div class="subtitle">Schéma de réseau · ' +
      n + ' installation(s)' + (s.rapport === false ? ' · hors rapport' : '') + '</div></div>';
    h += '<span class="doc-joint-chevron">›</span></div></div>';
  });
  return h + '</div>';
}

function schemaNouveau(fondPhotoId) {
  var m = getCurrentMission();
  if (!m) return;
  var creer = function (ratio) {
    // types: null -> l'éditeur demande d'abord quels types d'installations ce réseau dessert
    var s = { id: 'sc_' + generateId(), nom: 'Réseau ' + (missionSchemas(m).length + 1), ratio: ratio, fondPhotoId: fondPhotoId || null,
      rapport: true, v: 3, types: schemaInstallations(m).length ? null : [], elements: [], liens: [] };
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
  state.schemaTraceDepuis = null;
  state.schemaHistorique = [];
  state.schemaChoixTypes = false;
  state.creationRapide = null;
  var typesMission = schemaTypesDeLaMission(m);
  state.schemaTypesChoix = Array.isArray(s.types) ? s.types.slice() : (typesMission.length === 1 ? [typesMission[0].type.id] : []);
  state.schemaRetour = state.view === 'mission-detail' ? 'mission-detail' : 'mission-form'; // ouvert depuis la vue Plan ou les données de la mission
  schemaOutilDeDepart(m, s);
  state.view = 'schema-editor';
  render();
  window.scrollTo(0, 0);
}

// ————————————————————————————————————————————
// Types d'installations du réseau (étape préalable)
// ————————————————————————————————————————————

function schemaInstallationsDuSchema(m, s) {
  var items = schemaInstallations(m);
  if (!s || !Array.isArray(s.types) || !s.types.length) return items;
  return items.filter(function (it) { return s.types.indexOf(it.type.id) !== -1; });
}

function schemaOutilDeDepart(m, s) {
  var reste = schemaInstallationsDuSchema(m, s).some(function (it) { return !schemaInstallationPlacee(s, it.inst.id); });
  if (reste && !(s.elements || []).some(function (e) { return e.k === 'inst'; })) {
    state.schemaOutil = 'installation';
    state.schemaInstCible = schemaProchaineInstallation(m, s);
  } else state.schemaOutil = (s.elements || []).length ? 'gaine' : 'ventilateur';
}

function schemaTypesDeLaMission(m) {
  var out = [], parId = {};
  schemaInstallations(m).forEach(function (it) {
    if (!parId[it.type.id]) { parId[it.type.id] = { type: it.type, n: 0 }; out.push(parId[it.type.id]); }
    parId[it.type.id].n++;
  });
  return out;
}

function renderSchemaChoixTypes(m, s) {
  var types = schemaTypesDeLaMission(m), choisis = state.schemaTypesChoix || [];
  var h = '<button class="back-btn" onclick="schemaFermer();">' + ICONS.arrowLeft + ' ' + (state.schemaRetour === 'mission-detail' ? 'Plan du site' : 'Documents de la mission') + '</button>';
  h += '<div class="card"><h1>' + SCHEMA_ICON + ' Schéma de réseau</h1>' +
    '<p class="subtitle">Quelles installations ce réseau dessert-il ? Souvent un seul type (ex. les machines à bois d’une menuiserie), parfois plusieurs. Seules ces installations vous seront proposées.</p>';
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
  if (avant === null && /^Réseau \d+$/.test(s.nom) && s.types.length === 1) {
    var t = INSTALLATION_TYPES.filter(function (x) { return x.id === s.types[0]; })[0];
    if (t) s.nom = ('Réseau — ' + t.label).slice(0, 80);
  }
  persistMissions();
  state.schemaTypesChoix = null;
  state.schemaChoixTypes = false;
  schemaOutilDeDepart(m, s);
  render();
}

function schemaModifierTypes() {
  var s = schemaCourant(getCurrentMission());
  if (!s) return;
  state.schemaTypesChoix = Array.isArray(s.types) ? s.types.slice() : [];
  state.schemaChoixTypes = true;
  render();
}

// ————————————————————————————————————————————
// Placement des installations
// ————————————————————————————————————————————

function schemaInstallationPlacee(s, instId) {
  return (s.elements || []).some(function (e) { return e.k === 'inst' && e.inst === instId; });
}

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

// ————————————————————————————————————————————
// Éditeur
// ————————————————————————————————————————————

function renderSchemaEditor() {
  var m = getCurrentMission(), s = m && schemaCourant(m);
  if (!s) { state.view = m ? 'mission-form' : 'home'; return m ? renderMissionForm() : renderHome(); }
  if (s.types === null || state.schemaChoixTypes) return renderSchemaChoixTypes(m, s);
  var outil = state.schemaOutil || 'gaine';
  var h = '<button class="back-btn" onclick="schemaFermer();">' + ICONS.arrowLeft + ' ' + (state.schemaRetour === 'mission-detail' ? 'Plan du site' : 'Documents de la mission') + '</button>';
  h += '<div class="card schema-entete"><div class="schema-titre">' + SCHEMA_ICON + '<b>' + escapeHtml(s.nom) + '</b></div>' +
    '<button class="btn btn-gray btn-small" onclick="schemaRenommer();">' + ICONS.edit + ' Renommer</button></div>';

  var bouton = function (k, icone, libelle, cls) {
    return '<button type="button" class="schema-outil' + (cls || '') + (outil === k ? ' active' : '') + '" onclick="schemaChoisirOutil(\'' + k + '\');">' + icone + escapeHtml(libelle) + '</button>';
  };
  h += '<div class="schema-outils">';
  h += bouton('installation', schemaIconeOutil('inst'), 'Installation', ' schema-outil-inst');
  h += bouton('gaine', schemaIconeGaine('aspiration', 30).replace('class="schema-icone-gaine"', 'class="schema-outil-icone"'), 'Gaine');
  ['ventilateur', 'filtre', 'rejet', 'recyclage'].forEach(function (k) { h += bouton(k, schemaIconeOutil(k), schemaElement(k).court); });
  h += bouton('select', '<svg viewBox="0 0 24 24" class="schema-outil-icone" fill="none" stroke="' + SCHEMA_ENCRE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>', 'Modifier');
  h += '</div>';

  h += renderSchemaConsigne(m, s, outil);

  h += '<div class="schema-stage' + (s.fondPhotoId ? ' avec-fond' : '') + '" style="aspect-ratio:' + SCHEMA_W + ' / ' + schemaH(s) + ';">';
  if (s.fondPhotoId) h += '<img class="schema-fond" alt="" data-photo-src="' + escapeHtml(s.fondPhotoId) + '">';
  h += '<div class="schema-dessin" onpointerdown="schemaPointerDown(event);">' + schemaSvg(m, s, { edition: true }) + '</div></div>';

  h += renderSchemaSelection(m, s);
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

// Consigne de l'outil en cours (au-dessus du schéma)
function renderSchemaConsigne(m, s, outil) {
  if (outil === 'installation') {
    // Toutes les installations du site peuvent être ajoutées : celles des types du réseau d'abord
    var duReseau = schemaInstallationsDuSchema(m, s), autres = schemaInstallations(m).filter(function (it) { return duReseau.indexOf(it) === -1; });
    var cible = schemaItemDeCle(m, state.schemaInstCible);
    var h = '<div class="card schema-placement"><div class="label">Ajouter une installation au schéma</div>';
    var typesReseau = Array.isArray(s.types) && s.types.length ? s.types : [];
    if (!state.creationType && typesReseau.length) state.creationType = typesReseau[0];
    var creation = (typeof creationRapideHtml === 'function') ? creationRapideHtml(m, 'schema', INSTALLATION_TYPES.map(function (t) { return t.id; })) : '';
    if (!duReseau.length && !autres.length) return h + '<p class="subtitle">Aucune installation dans la mission pour l’instant.</p>' + creation + '</div>';
    h += '<select class="input" onchange="state.schemaInstCible=this.value;render();"><option value="">— choisir l’installation —</option>';
    var groupes = function (items, prefixe) {
      var parBat = {}, ordre = [];
      items.forEach(function (it) {
        var b = it.inst.data.batiment || 'Sans bâtiment';
        if (!parBat[b]) { parBat[b] = []; ordre.push(b); }
        parBat[b].push(it);
      });
      ordre.forEach(function (b) {
        h += '<optgroup label="' + escapeHtml(prefixe + b) + '">';
        parBat[b].forEach(function (it) {
          var k = it.type.id + ':' + it.idx;
          h += '<option value="' + k + '"' + (k === state.schemaInstCible ? ' selected' : '') + '>' + (schemaInstallationPlacee(s, it.inst.id) ? '✓ ' : '') + escapeHtml(it.type.label + ' — ' + overviewRowTitle(it)) + '</option>';
        });
        h += '</optgroup>';
      });
    };
    groupes(duReseau, autres.length && typesReseau.length ? 'Réseau · ' : '');
    if (typesReseau.length) groupes(autres, 'Autres installations · ');
    h += '</select>';
    if (cible) h += '<div class="schema-consigne">' + (schemaInstallationPlacee(s, cible.inst.id) ? 'Déjà sur le schéma : touchez pour la <b>déplacer</b> : ' : 'Touchez le schéma pour placer : ') + '<b>' + escapeHtml(overviewRowTitle(cible)) + '</b></div>';
    else h += '<div class="schema-consigne">Choisissez une installation dans la liste, puis touchez le schéma à son emplacement.</div>';
    return h + creation + '</div>';
  }
  var txt;
  if (outil === 'gaine') {
    txt = state.schemaTraceDepuis
      ? 'Touchez l’arrivée (ventilateur, filtre, rejet…). Toucher le fond fait un angle, toucher une autre gaine s’y raccorde. <button type="button" class="btn btn-gray btn-small" onclick="state.schemaTraceDepuis=null;render();">Arrêter</button>'
      : 'Touchez le départ de la gaine (une installation…), puis son arrivée. Pour une <b>division</b>, touchez d’abord la gaine existante : un piquage se crée et la nouvelle gaine en part.';
  } else if (outil === 'select') txt = 'Touchez un élément ou une gaine pour le voir ou le supprimer ; faites glisser un élément pour le déplacer.';
  else txt = 'Touchez le schéma pour placer : <b>' + escapeHtml(schemaElement(outil).nom) + '</b>.';
  // Ajouter une installation reste à portée de main quel que soit l'outil
  if (!state.schemaTraceDepuis) txt += '<div class="schema-ajout-inst"><button type="button" class="btn btn-gray btn-small" onclick="schemaChoisirOutil(\'installation\');">' + ICONS.plus + ' Ajouter une installation</button></div>';
  return '<div class="schema-consigne schema-consigne-seule">' + txt + '</div>';
}

function renderSchemaSelection(m, s) {
  var sel = state.schemaSel;
  if (!sel) return '';
  var h = '<div class="card schema-panneau">';
  if (sel.type === 'lien') {
    var o = schemaOrientation(s)[sel.id];
    if (!o) return '';
    h += '<div class="schema-panneau-titre">' + schemaIconeGaine(o.genre, 40) + '<b>Gaine — ' + escapeHtml(SCHEMA_GAINES[o.genre].nom) + '</b></div>';
    h += '<p class="subtitle">Sens et couleur déduits du réseau (vers le ventilateur = aspiration).</p>';
    h += '<div class="row"><button class="btn btn-gray btn-small" onclick="schemaSupprimerSelection();">' + ICONS.trash + ' Supprimer la gaine</button></div>';
    return h + '</div>';
  }
  var e = schemaParId(s)[sel.id];
  if (!e) return '';
  if (e.k === 'inst') {
    var it = e.inst !== null ? schemaItemsParId(m)[e.inst] : null, n = schemaNumeros(m, s)[e.id];
    h += '<div class="schema-panneau-titre"><span class="schema-num ' + (it ? it.status.cls : '') + '">' + n + '</span><b>' + escapeHtml(schemaNomInst(e, it)) + '</b></div>';
    if (it) {
      h += '<div class="schema-lien-inst ' + it.status.cls + '"><span class="schema-pastille"></span><span>' + escapeHtml(it.type.label) +
        (it.inst.data.batiment ? ' · ' + escapeHtml(it.inst.data.batiment) : '') + ' · ' + escapeHtml(it.status.text) + '</span>' +
        '<button type="button" class="btn btn-gray btn-small" onclick="schemaOuvrirFiche(\'' + it.type.id + '\',' + it.idx + ');">Ouvrir la fiche</button></div>';
    } else h += '<p class="subtitle">Poste d’un ancien schéma, non relié à une installation de la mission.</p>';
  } else {
    h += '<div class="schema-panneau-titre">' + (e.k === 'noeud' ? '' : schemaIconeOutil(e.k)) + '<b>' + escapeHtml(e.k === 'noeud' ? 'Piquage / angle de gaine' : schemaElement(e.k).nom) + '</b></div>';
    if (e.k === 'ventilateur') {
      var avecDebit = schemaInstallations(m).filter(function (x) { return SCHEMA_DEBIT_CHAMPS[x.type.id]; });
      h += '<div class="field"><label class="label" for="vent-inst">Installation contrôlée de ce ventilateur (pour le bilan du réseau)</label><select class="input" id="vent-inst" onchange="schemaLierVentilateur(this.value);"><option value="">— aucune —</option>';
      avecDebit.forEach(function (x) {
        h += '<option value="' + x.type.id + ':' + x.idx + '"' + (e.inst === x.inst.id ? ' selected' : '') + '>' + escapeHtml(docInstallationLabel(x)) + (schemaDebit(x) !== null ? ' · ' + Math.round(schemaDebit(x)).toLocaleString('fr-FR') + ' m³/h' : '') + '</option>';
      });
      h += '</select><div class="subtitle">Le débit mesuré au ventilateur est comparé à la somme des débits des installations qu’il aspire.</div></div>';
    }
  }
  h += '<div class="row" style="margin-top:8px;">';
  h += '<button class="btn btn-gray btn-small" onclick="state.schemaOutil=\'gaine\';state.schemaTraceDepuis=state.schemaSel.id;state.schemaSel=null;render();">Tirer une gaine d’ici</button>';
  h += '<button class="btn btn-gray btn-small" onclick="schemaSupprimerSelection();">' + ICONS.trash + ' Supprimer</button></div>';
  return h + '</div>';
}

// Légende et nomenclature sous le schéma (toucher une ligne sélectionne l'installation)
function renderSchemaLegende(m, s) {
  var leg = schemaLegendeContenu(m, s), nom = schemaNomenclature(m, s);
  if (!leg.kinds.length && !leg.gaines.length && !nom.length) return '';
  var h = '';
  schemaBilanReseau(m, s).forEach(function (b) {
    var pct = Math.round(Math.abs(b.ecart) * 100);
    h += '<div class="card schema-bilan ' + (pct < 10 ? 'ok' : 'ecart') + '"><div class="section-title">Bilan du réseau</div><p>' + escapeHtml(schemaBilanTexte(b)) + '</p></div>';
  });
  h += '<div class="card schema-legende"><div class="section-title">Légende</div><div class="schema-legende-items">';
  leg.gaines.forEach(function (g) { h += '<span class="schema-legende-item">' + schemaIconeGaine(g, 34) + escapeHtml(SCHEMA_GAINES[g].nom) + '</span>'; });
  leg.kinds.forEach(function (k) { h += '<span class="schema-legende-item">' + schemaIconeOutil(k) + escapeHtml(schemaElement(k).nom) + '</span>'; });
  h += '</div>';
  if (nom.length) {
    h += '<div class="schema-nomenclature">';
    nom.forEach(function (r) {
      h += '<button type="button" class="schema-nom-ligne" onclick="state.schemaSel={type:\'el\',id:\'' + escapeHtml(r.e.id) + '\'};state.schemaOutil=\'select\';render();">' +
        '<span class="schema-num ' + (r.it ? r.it.status.cls : '') + '">' + r.n + '</span>' +
        '<span class="schema-nom-texte"><b>' + escapeHtml(schemaNomInst(r.e, r.it)) + '</b><span class="subtitle">' +
        (r.it ? escapeHtml(r.it.type.label + ' · ' + schemaAvisTexte(r.it)) : 'non relié') + '</span></span></button>';
    });
    h += '</div>';
  }
  return h + '</div>';
}

function schemaLierVentilateur(key) {
  var m = getCurrentMission(), it = key ? schemaItemDeCle(m, key) : null, sel = state.schemaSel;
  schemaMaj(function (s) { var e = sel && schemaParId(s)[sel.id]; if (e && e.k === 'ventilateur') e.inst = it ? it.inst.id : null; });
}

function schemaOuvrirFiche(typeId, idx) {
  state.schemaSel = null;
  openOverviewInstallation(typeId, idx);
}

function schemaFermer() {
  state.view = state.schemaRetour || 'mission-form';
  state.schemaSel = null;
  state.schemaTraceDepuis = null;
  render();
}

function schemaChoisirOutil(k) {
  state.schemaOutil = k;
  state.schemaTraceDepuis = null;
  state.schemaSel = null;
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
  state.schemaTraceDepuis = null;
  persistMissions();
  render();
}

// Position touchée, en unités du schéma
function schemaPointVue(ev, svg, s) {
  var r = svg.getBoundingClientRect();
  return [Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)) * SCHEMA_W, Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)) * schemaH(s)];
}

function schemaNorm(s, x, y) {
  return { x: Math.round(Math.min(1, Math.max(0, x / SCHEMA_W)) * 10000) / 10000, y: Math.round(Math.min(1, Math.max(0, y / schemaH(s))) * 10000) / 10000 };
}

var _schemaCompteur = 0;
function schemaNouvelId(p) { return p + generateId() + '_' + (++_schemaCompteur); }

// Toucher une gaine : un piquage est inséré à l'endroit touché (la gaine est coupée en deux)
function schemaCreerPiquage(s, lienId, x, y) {
  var par = schemaParId(s), l = (s.liens || []).filter(function (z) { return z.id === lienId; })[0];
  if (!l || !par[l.a] || !par[l.b]) return null;
  var pr = schemaProjeter(schemaRoute(s, par[l.a], par[l.b]), x, y), pos = schemaNorm(s, pr.x, pr.y);
  var n = { id: schemaNouvelId('n_'), k: 'noeud', x: pos.x, y: pos.y, inst: null, t: '' };
  s.elements.push(n);
  s.liens = s.liens.filter(function (z) { return z.id !== l.id; });
  s.liens.push({ id: schemaNouvelId('l_'), a: l.a, b: n.id }, { id: schemaNouvelId('l_'), a: n.id, b: l.b });
  return n.id;
}

function schemaRelier(s, a, b) {
  if (!a || !b || a === b) return;
  if (s.liens.some(function (l) { return (l.a === a && l.b === b) || (l.a === b && l.b === a); })) return;
  s.liens.push({ id: schemaNouvelId('l_'), a: a, b: b });
}

function schemaPointerDown(ev) {
  var svg = ev.currentTarget.querySelector('svg');
  if (!svg) return;
  var m = getCurrentMission(), s = schemaCourant(m);
  var cible = ev.target.closest ? ev.target.closest('[data-el],[data-lien]') : null;
  var outil = state.schemaOutil || 'gaine';
  var elId = cible && cible.getAttribute('data-el'), lienId = cible && cible.getAttribute('data-lien');
  var pv = schemaPointVue(ev, svg, s);

  if (outil === 'gaine') {
    var depuis = state.schemaTraceDepuis;
    if (elId) {
      if (!depuis) { state.schemaTraceDepuis = elId; render(); return; }
      if (depuis === elId) { state.schemaTraceDepuis = null; render(); return; }
      var arrivee = schemaParId(s)[elId];
      // Arrivée sur un équipement ou une installation : la gaine est finie ; sur un angle, on continue
      state.schemaTraceDepuis = arrivee && arrivee.k === 'noeud' ? elId : null;
      schemaMaj(function (s) { schemaRelier(s, depuis, elId); });
      return;
    }
    if (lienId) {
      var nouveau = null;
      state.schemaHistorique = (state.schemaHistorique || []).concat([JSON.stringify(s)]).slice(-40);
      nouveau = schemaCreerPiquage(s, lienId, pv[0], pv[1]);
      if (depuis && nouveau) schemaRelier(s, depuis, nouveau);
      state.schemaTraceDepuis = depuis ? null : nouveau; // départ d'une division, ou raccordement terminé
      persistMissions();
      render();
      return;
    }
    if (depuis) {
      // Angle : aligné horizontalement ou verticalement sur le point de départ
      var d = schemaParId(s)[depuis], dp = schemaPos(s, d), x = pv[0], y = pv[1];
      if (Math.abs(x - dp[0]) > Math.abs(y - dp[1])) y = dp[1]; else x = dp[0];
      var id = schemaNouvelId('n_'), pos = schemaNorm(s, x, y);
      state.schemaTraceDepuis = id;
      schemaMaj(function (s) { s.elements.push({ id: id, k: 'noeud', x: pos.x, y: pos.y, inst: null, t: '' }); schemaRelier(s, depuis, id); });
    }
    return;
  }
  if (elId) {
    ev.preventDefault();
    schemaDemarrerGlisser(ev, svg, s, elId);
    return;
  }
  if (lienId) {
    state.schemaSel = { type: 'lien', id: lienId };
    if (outil !== 'select') state.schemaOutil = 'select';
    render();
    return;
  }
  var p = schemaNorm(s, pv[0], pv[1]);
  if (outil === 'installation') {
    var it = schemaItemDeCle(m, state.schemaInstCible);
    if (!it) return;
    schemaMaj(function (s) {
      var exist = s.elements.filter(function (e) { return e.k === 'inst' && e.inst === it.inst.id; })[0];
      if (exist) { exist.x = p.x; exist.y = p.y; }
      else s.elements.push({ id: schemaNouvelId('e_'), k: 'inst', x: p.x, y: p.y, inst: it.inst.id, t: '' });
      state.schemaInstCible = schemaProchaineInstallation(m, s, it);
    });
    return;
  }
  if (schemaElement(outil) && outil !== 'noeud' && outil !== 'inst') {
    var nid = schemaNouvelId('e_');
    schemaMaj(function (s) { s.elements.push({ id: nid, k: outil, x: p.x, y: p.y, inst: null, t: '' }); });
    return;
  }
  state.schemaSel = null;
  render();
}

// Glisser un élément : déplacement affiché en direct, enregistré au relâcher ; un simple toucher le sélectionne
function schemaDemarrerGlisser(ev, svg, s, elId) {
  var e = schemaParId(s)[elId];
  if (!e) return;
  var g = svg.querySelector('[data-el="' + elId.replace(/"/g, '') + '"]');
  var x0 = ev.clientX, y0 = ev.clientY, bouge = false, pos = null;
  var move = function (mv) {
    if (!bouge && Math.abs(mv.clientX - x0) + Math.abs(mv.clientY - y0) < 6) return;
    bouge = true;
    var pv = schemaPointVue(mv, svg, s);
    pos = schemaNorm(s, pv[0], pv[1]);
    if (g) g.setAttribute('transform', 'translate(' + pv[0].toFixed(1) + ' ' + pv[1].toFixed(1) + ')');
  };
  var up = function () {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    state.schemaSel = { type: 'el', id: elId };
    if (bouge && pos) {
      schemaMaj(function (s) { var el = schemaParId(s)[elId]; if (el) { el.x = pos.x; el.y = pos.y; } });
    } else render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

// Supprime un élément ou une gaine ; un piquage à deux gaines est fusionné, les angles isolés retirés
function schemaSupprimerDe(s, sel) {
  if (sel.type === 'lien') s.liens = s.liens.filter(function (l) { return l.id !== sel.id; });
  else {
    var e = schemaParId(s)[sel.id];
    if (!e) return;
    var lies = s.liens.filter(function (l) { return l.a === e.id || l.b === e.id; });
    s.elements = s.elements.filter(function (x) { return x.id !== e.id; });
    s.liens = s.liens.filter(function (l) { return l.a !== e.id && l.b !== e.id; });
    if (e.k === 'noeud' && lies.length === 2) {
      var a = lies[0].a === e.id ? lies[0].b : lies[0].a, b = lies[1].a === e.id ? lies[1].b : lies[1].a;
      schemaRelier(s, a, b);
    }
  }
  // Angles et piquages restés seuls
  var change = true;
  while (change) {
    change = false;
    var adj = schemaVoisins(s);
    s.elements = s.elements.filter(function (x) {
      if (x.k === 'noeud' && (adj[x.id] || []).length === 0) { change = true; return false; }
      return true;
    });
  }
}

function schemaSupprimerSelection() {
  var sel = state.schemaSel;
  if (!sel) return;
  state.schemaSel = null;
  schemaMaj(function (s) { schemaSupprimerDe(s, sel); });
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
    schemaBilanReseau(m, s).forEach(function (b) {
      page.stack.push({ text: [{ text: 'Bilan du réseau : ', bold: true }, schemaBilanTexte(b)], fontSize: 8.5, margin: [0, 0, 0, 8] });
    });
    var nom = schemaNomenclature(m, s);
    if (nom.length) {
      var head = function (t) { return pdfDocsCell(t, { bold: true, color: 'white', fillColor: '#0082DE' }); };
      var COLORS = { 'status-ok': '#166534', 'status-bad': '#B42318', 'status-warn': '#92400E' };
      var body = [[head('N°'), head('Installation'), head('Bâtiment'), head('Avis')]];
      nom.forEach(function (r) {
        var it = r.it;
        body.push([pdfDocsCell(r.n, { alignment: 'center', bold: true }),
          pdfDocsCell(it ? it.type.label + ' — ' + overviewRowTitle(it) : schemaNomInst(r.e, null)),
          pdfDocsCell(it ? it.inst.data.batiment : ''),
          pdfDocsCell(it ? schemaAvisTexte(it) : '', it ? { color: COLORS[it.status.cls] || '#333333', bold: it.status.cls === 'status-bad' } : {})]);
      });
      page.stack.push({ table: { headerRows: 1, widths: [30, '*', 120, 110], body: body }, layout: PDF_DOCS_LAYOUT });
    }
    content.push(page);
  });
  return content;
}

console.log('✓ Schémas de réseau chargés');
