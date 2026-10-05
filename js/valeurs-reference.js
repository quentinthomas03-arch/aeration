// valeurs-reference.js - Importer le dossier de valeurs de référence du client (2026-10-04)
//
// Le client remet son dossier de valeurs de référence (arrêté du 8 octobre 1987, art. 2 à 4) en Excel,
// CSV ou PDF. L'appli rapproche chaque ligne d'une installation de la mission (nom, repère ou local
// cité sur la ligne, ou dans un titre de bloc au-dessus) et du bon champ « référence » de la fiche
// (champs ref de js/dvr.js), d'après l'unité (m³/h, m/s) et les mots de l'intitulé (minimale,
// moyenne, transport, neuf…). Le technicien coche ce qu'il reprend : rien n'est écrit sans lui, et une
// référence déjà saisie n'est pas cochée d'office.

var VR_MOTS_VIDES = /^(d|de|du|des|l|la|le|les|dans|au|aux|en|par|et|air|valeur|valeurs|reference|references)$/;

function vrRefLignes(type) {
  var cfg = (typeof DVR_CONFIG !== 'undefined' && DVR_CONFIG[type.id]) || null;
  if (!cfg) return [];
  return cfg.lignes.filter(function (l) { return l.ref && type.fields.some(function (f) { return f.key === l.ref; }); });
}

// Noms sous lesquels une installation peut être citée (repère, local, référence…)
function vrNoms(inst) {
  var keys = (typeof OVERVIEW_TITLE_KEYS !== 'undefined') ? OVERVIEW_TITLE_KEYS : [];
  return keys.map(function (k) { return listeNorm(inst.data[k] || ''); }).filter(function (n) { return n.length >= 3 && !/^n ?\d+$/.test(n); });
}

function vrTitre(it) {
  var keys = (typeof OVERVIEW_TITLE_KEYS !== 'undefined') ? OVERVIEW_TITLE_KEYS : [];
  for (var i = 0; i < keys.length; i++) { var v = it.inst.data[keys[i]]; if (v && String(v).trim()) return it.type.label + ' – ' + String(v).trim(); }
  return it.type.label + ' n°' + (it.idx + 1);
}

function vrUnite(txt) {
  var t = String(txt || '').toLowerCase();
  if (/m\s*[3³]\s*\/\s*h/.test(t)) return 'm³/h';
  if (/m\s*\/\s*s\b/.test(t)) return 'm/s';
  return '';
}

function vrNombre(c) {
  var v = String(c === undefined || c === null ? '' : c).replace(/m\s*[3³]\s*\/\s*h|m\s*\/\s*s/gi, '').replace(/\s/g, '').replace(',', '.');
  return /^\d+(\.\d+)?$/.test(v) ? parseFloat(v) : NaN;
}

function vrMots(label) {
  return listeNorm(label).split(' ').filter(function (w) { return w.length > 2 && !VR_MOTS_VIDES.test(w); });
}

// Tous les mots des intitulés de référence (débit, vitesse, minimale, neuf, transport…)
var _vrGrandeurs = null;
function vrMotsGrandeur() {
  if (_vrGrandeurs) return _vrGrandeurs;
  var s = {};
  Object.keys(typeof DVR_CONFIG !== 'undefined' ? DVR_CONFIG : {}).forEach(function (t) {
    DVR_CONFIG[t].lignes.forEach(function (l) { vrMots(l.label).forEach(function (w) { s[w] = true; }); });
  });
  _vrGrandeurs = Object.keys(s);
  return _vrGrandeurs;
}

// Lignes du fichier (tableaux de cellules) -> propositions [{ it, ligne, valeur, existant, coche }]
function vrAnalyser(rows, m) {
  var items = overviewOrderedItems(m).filter(function (it) { return vrRefLignes(it.type).length; });
  var noms = items.map(function (it) { return vrNoms(it.inst); });
  var courant = null, entete = [], out = [], vu = {};
  rows.forEach(function (cells) {
    cells = (cells || []).map(function (c) { return String(c === undefined || c === null ? '' : c).trim(); });
    var texte = ' ' + listeNorm(cells.join(' ')) + ' ';
    if (!texte.trim()) return;
    var nums = cells.map(vrNombre);
    var nbNum = nums.filter(function (x) { return !isNaN(x); }).length;
    // Titre de bloc qui commence par un type d'installation (« Box préparation peinture — … ») : seules
    // les installations de ce type peuvent correspondre
    var typeTitre = null;
    if (!nbNum) {
      var debut = texte.trim();
      var lgT = 0; // libellé complet le plus long (« Menuiserie (machines à bois) » avant « Menuiserie »)
      INSTALLATION_TYPES.forEach(function (t) {
        [listeNorm(t.label), listeNorm(t.label.replace(/\s*\(.*\)\s*$/, ''))].forEach(function (l) {
          if (l && l.length > lgT && debut.indexOf(l) === 0) { typeTitre = t; lgT = l.length; }
        });
      });
    }
    // Installation citée sur la ligne : le nom le plus long trouvé en mots entiers
    var trouve = null, lg = 0;
    items.forEach(function (it, k) {
      if (typeTitre && it.type.id !== typeTitre.id) return;
      noms[k].forEach(function (n) { if (n.length > lg && texte.indexOf(' ' + n + ' ') !== -1) { trouve = it; lg = n.length; } });
    });
    if (trouve) courant = trouve;
    else if (typeTitre) courant = null; // bloc d'une installation non reconnue : ne rien lui attribuer
    if (!nbNum) { if (!trouve && cells.filter(Boolean).length >= 2) entete = cells; return; } // ligne d'en-tête
    var it = trouve || courant;
    if (!it) return;
    var refs = vrRefLignes(it.type);
    // Une colonne « référence » dans l'en-tête : seules ses valeurs comptent (pas les valeurs relevées)
    var colRef = entete.some(function (e) { return /r[ée]f[ée]rence|retenue|consigne/i.test(e) && !/relev|mesur/i.test(e); });
    nums.forEach(function (v, c) {
      if (isNaN(v) || v <= 0) return;
      var col = entete[c] || '';
      if (/date|ann[ée]e|n°|num|rep[èe]re|nombre|nb\b/i.test(col)) return;
      if (/relev|mesur|constat/i.test(col) || (colRef && !/r[ée]f[ée]rence|retenue|consigne/i.test(col))) return;
      var unite = vrUnite(col) || vrUnite(cells[c]) || vrUnite(cells.join(' ')) || (v >= 50 ? 'm³/h' : 'm/s');
      var ctx = ' ' + listeNorm(col + ' ' + cells.filter(function (x, k) { return k !== c && isNaN(nums[k]); }).join(' ')) + ' ';
      var cands = refs.filter(function (l) { return l.unit === unite; });
      if (!cands.length) return;
      // Score : mots de l'intitulé du champ présents, moins les mots de grandeur du contexte qui n'y
      // sont pas (« Débit minimal d'air neuf » ne va pas dans « Débit global d'air extrait »)
      var grandeurs = vrMotsGrandeur().filter(function (w) { return ctx.indexOf(' ' + w) !== -1; });
      var best = null, score = -99, egal = false;
      cands.forEach(function (l) {
        var mots = vrMots(l.label);
        var sc = mots.filter(function (w) { return ctx.indexOf(' ' + w) !== -1; }).length - 0.5 * grandeurs.filter(function (w) { return mots.indexOf(w) === -1; }).length;
        if (sc > score) { best = l; score = sc; egal = false; } else if (sc === score) egal = true;
      });
      if (egal && cands.length > 1) return; // impossible de choisir le champ : rien proposé
      if (grandeurs.length && score <= 0) return; // la ligne décrit une autre grandeur
      var cle = it.type.id + ':' + it.idx + ':' + best.ref;
      if (vu[cle]) return;
      vu[cle] = true;
      var existant = it.inst.data[best.ref];
      var vide = existant === undefined || existant === null || String(existant).trim() === '' || String(existant).trim() === '/';
      out.push({ it: it, ligne: best, valeur: String(Math.round(v * 1000) / 1000).replace('.', ','), existant: vide ? '' : String(existant), coche: vide });
    });
  });
  return out;
}

function vrLireFichier(input) {
  var file = input.files && input.files[0];
  input.value = '';
  var m = getCurrentMission();
  if (!file || !m) return;
  state.vrInfo = 'Lecture du fichier…';
  render();
  var lire;
  if (/\.pdf$/i.test(file.name)) {
    lire = file.arrayBuffer().then(rapportPdfLignes).then(function (lignes) { return lignes.map(function (l) { return l.s.split(/\s*\|\s*/); }); });
  } else if (/\.csv$/i.test(file.name)) {
    lire = file.text().then(function (t) {
      var sep = t.indexOf(';') !== -1 ? ';' : (t.indexOf('\t') !== -1 ? '\t' : ',');
      return t.replace(/\r/g, '').split('\n').map(function (l) { return l.split(sep); });
    });
  } else {
    lire = ensureLib('xlsx').then(function () { return file.arrayBuffer(); }).then(function (buf) {
      var wb = XLSX.read(new Uint8Array(buf), { type: 'array' }), rows = [];
      wb.SheetNames.forEach(function (n) { rows = rows.concat(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' })); });
      return rows;
    });
  }
  lire.then(function (rows) {
    state.vrPropositions = vrAnalyser(rows, m);
    state.vrInfo = state.vrPropositions.length
      ? state.vrPropositions.length + ' valeur(s) de référence rapprochée(s) des installations de la mission. Vérifiez, décochez ce qui ne convient pas, puis appliquez.'
      : 'Aucune valeur rapprochée : les noms des installations du dossier ne correspondent pas à ceux de la mission, ou les unités manquent.';
    render();
  }).catch(function (err) { state.vrInfo = ''; render(); alert('Fichier illisible :\n\n' + err.message); });
}

function vrCocher(i, on) {
  if (state.vrPropositions && state.vrPropositions[i]) state.vrPropositions[i].coche = on;
}

function vrAppliquer() {
  var m = getCurrentMission(), n = 0, touches = {};
  (state.vrPropositions || []).forEach(function (p) {
    if (!p.coche) return;
    p.it.inst.data[p.ligne.ref] = p.valeur;
    touches[p.it.type.id + ':' + p.it.idx] = p.it;
    n++;
  });
  Object.keys(touches).forEach(function (k) {
    var it = touches[k];
    if (typeof touchInstallation === 'function') touchInstallation(it.inst);
    if (typeof applyCalculations === 'function') applyCalculations(it.type.id, it.inst);
  });
  persistMissions();
  state.vrPropositions = null;
  state.vrInfo = '';
  state.view = 'mission-detail';
  render();
  alert(n + ' valeur(s) de référence reprise(s) dans ' + Object.keys(touches).length + ' installation(s).');
}

function renderValeursReference() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; return renderHome(); }
  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(missionNom(m)) + '</button>';
  h += '<div class="card"><h1>' + ICONS.clipboard + ' Valeurs de référence du client</h1>' +
    '<p class="subtitle">Importez le dossier de valeurs de référence remis par le client (Excel, CSV ou PDF). L’appli rapproche chaque valeur d’une installation de la mission et du bon champ « référence » ; vous cochez ce que vous reprenez. Le fichier reste sur l’appareil.</p>' +
    '<label class="btn btn-gray btn-small">' + ICONS.upload + ' Importer le dossier<input type="file" accept=".xlsx,.xls,.csv,.pdf,application/pdf" style="display:none;" onchange="vrLireFichier(this);"></label>' +
    (state.vrInfo ? '<p class="import-liste-info">' + escapeHtml(state.vrInfo) + '</p>' : '') + '</div>';
  var props = state.vrPropositions || [];
  if (props.length) {
    h += '<div class="card"><table class="liste-table vr-table"><thead><tr><th></th><th>Installation</th><th>Référence</th><th>Valeur</th></tr></thead><tbody>';
    props.forEach(function (p, i) {
      h += '<tr><td><input type="checkbox"' + (p.coche ? ' checked' : '') + ' onchange="vrCocher(' + i + ',this.checked);" aria-label="Reprendre"></td>' +
        '<td>' + escapeHtml(vrTitre(p.it)) + '</td><td>' + escapeHtml(p.ligne.label) + '</td><td><b>' + escapeHtml(p.valeur) + ' ' + escapeHtml(p.ligne.unit) + '</b>' +
        (p.existant ? '<div class="subtitle">déjà saisi : ' + escapeHtml(p.existant) + '</div>' : '') + '</td></tr>';
    });
    h += '</tbody></table><button type="button" class="btn btn-primary" style="margin-top:12px;" onclick="vrAppliquer();">' + ICONS.check + ' Reprendre les valeurs cochées</button></div>';
  }
  return h;
}

console.log('✓ Import des valeurs de référence chargé');
