// import-liste.js - Créer les installations d'une mission depuis un tableau Excel (chantier du 2026-10-04)
//
// Comme dans l'appli VLEP : le technicien colle les lignes copiées dans Excel (ou importe le fichier
// .xlsx / .csv). Colonnes : Type d'installation | Nombre | Bâtiment | Nom ou repère (seul le type est
// obligatoire). L'appli reconnaît le type, montre un aperçu, puis crée toutes les installations d'un
// coup ; les quantités peuvent aussi devenir les quantités prévues au devis (js/visite.js).

// Mots courants -> type d'installation (en plus du libellé et de l'identifiant de chaque type)
var LISTE_SYNONYMES = {
  'bureau': 'bureaux', 'salle de reunion': 'bureaux', 'refectoire': 'bureaux',
  'sanitaire': 'sanitaires', 'wc': 'sanitaires', 'toilettes': 'sanitaires', 'douche': 'sanitaires', 'vestiaire': 'sanitaires',
  'centrale de traitement d air': 'cta', 'caisson': 'cta',
  'hotte': 'hottes', 'sorbonne': 'sorbonnes', 'bras': 'bras_aspiration', 'bras d aspiration': 'bras_aspiration',
  'cabine de peinture': 'cabines_peinture', 'cabine peinture': 'cabines_peinture', 'box peinture': 'box_peinture', 'box de preparation': 'box_peinture',
  'machine a bois': 'menuiserie_bis', 'machines a bois': 'menuiserie_bis', 'reseau menuiserie': 'menuiserie', 'aspiration menuiserie': 'menuiserie',
  'gaz d echappement': 'gaz_echappement', 'echappement': 'gaz_echappement', 'local de charge': 'locaux_charge', 'charge batteries': 'locaux_charge',
  'local fumeur': 'locaux_fumeurs', 'fumeur': 'locaux_fumeurs', 'laboratoire': 'local_specifique', 'atelier': 'local_specifique',
  'local a pollution specifique': 'local_specifique', 'recyclage': 'recyclage', 'depoussiereur': 'recyclage',
  'grenaillage': 'decapage', 'sablage': 'decapage', 'decapage': 'decapage', 'fluide de coupe': 'fluide_coupe', 'machine outil': 'fluide_coupe',
  'solvant': 'poste_solvant', 'poste solvant': 'poste_solvant'
};

function listeNorm(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

// Type d'installation reconnu dans une cellule (ou null)
function listeType(cell) {
  var c = listeNorm(cell);
  if (!c) return null;
  var types = INSTALLATION_TYPES.filter(function (t) { return t.implemented !== false; });
  var exact = types.filter(function (t) { return listeNorm(t.id) === c || listeNorm(t.label) === c || listeNorm(t.label.replace(/\s*\(.*\)\s*$/, '')) === c; })[0];
  if (exact) return exact;
  var sing = c.replace(/s\b/g, '');
  var syn = Object.keys(LISTE_SYNONYMES).sort(function (a, b) { return b.length - a.length; })
    .filter(function (k) { return c.indexOf(k) !== -1 || sing.indexOf(k.replace(/s\b/g, '')) !== -1; })[0];
  if (syn) return getInstallationType(LISTE_SYNONYMES[syn]) || null;
  // Début du libellé, en mots entiers (« Hotte » -> « Hottes », mais pas « Machin » -> « Machines-outils »)
  return types.filter(function (t) {
    var l = listeNorm(t.label.replace(/\s*\(.*\)\s*$/, ''));
    return (l.indexOf(c) === 0 && /^(s?( |$))/.test(l.slice(c.length))) || (c.indexOf(l) === 0 && /^( |$)/.test(c.slice(l.length)));
  })[0] || null;
}

// Tableau (lignes de cellules) -> lignes reconnues
function listeAnalyser(rows) {
  rows = (rows || []).filter(function (r) { return r && r.some(function (c) { return String(c === undefined || c === null ? '' : c).trim(); }); });
  if (!rows.length) return [];
  var col = { type: 0, nb: 1, bat: 2, nom: 3 }, debut = 0;
  var tete = rows[0].map(listeNorm);
  if (tete.some(function (x) { return /type|installation/.test(x); })) {
    debut = 1;
    tete.forEach(function (x, i) {
      if (/type|installation/.test(x) && col._t === undefined) { col.type = i; col._t = 1; }
      else if (/nombre|nb|quantite|qte/.test(x)) col.nb = i;
      else if (/batiment|bat|zone|site/.test(x)) col.bat = i;
      else if (/nom|repere|designation|reference|local/.test(x)) col.nom = i;
    });
  }
  return rows.slice(debut).map(function (r) {
    var cell = function (i) { return i === undefined || r[i] === undefined || r[i] === null ? '' : String(r[i]).trim(); };
    var nbTexte = cell(col.nb), nb = parseInt(nbTexte, 10);
    return { texte: cell(col.type), type: listeType(cell(col.type)), nb: nb > 0 ? Math.min(nb, 200) : 1, bat: cell(col.bat).slice(0, 60), nom: cell(col.nom).slice(0, 60) };
  }).filter(function (l) { return l.texte; });
}

function listeDepuisTexte(txt) {
  var lignes = String(txt || '').replace(/\r/g, '').split('\n');
  var sep = lignes.some(function (l) { return l.indexOf('\t') !== -1; }) ? '\t' : (lignes.some(function (l) { return l.indexOf(';') !== -1; }) ? ';' : ',');
  return listeAnalyser(lignes.map(function (l) { return l.split(sep); }));
}

// ————————————————————————————————————————————
// Écran
// ————————————————————————————————————————————

function renderImportListe() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; return renderHome(); }
  var lignes = state.importListe || [];
  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(missionNom(m)) + '</button>';
  h += renderQuantitesRapides(m);
  h += '<div class="card"><h1>' + ICONS.list + ' Ou depuis un tableau Excel</h1>' +
    '<p class="subtitle">Colonnes : <b>Type d’installation</b> | Nombre | Bâtiment | Nom ou repère. Seul le type est obligatoire ; une ligne sans nombre crée une installation.</p>' +
    '<div class="row import-liste-actions"><button type="button" class="btn btn-gray btn-small" onclick="listeTelechargerModele();">' + ICONS.download + ' Télécharger le modèle Excel</button>' +
    '<label class="btn btn-gray btn-small">' + ICONS.upload + ' Importer un fichier (.xlsx, .csv)<input type="file" accept=".xlsx,.xls,.csv" style="display:none;" onchange="listeLireFichier(this);"></label></div></div>';
  h += '<div class="card"><label class="label" for="liste-coller">Ou collez ici les lignes copiées dans Excel</label>' +
    '<textarea class="input" id="liste-coller" rows="5" placeholder="Sorbonne&#9;3&#9;Bâtiment C&#10;Hotte&#9;2&#9;Bâtiment B&#10;CTA&#9;1&#9;Toiture&#9;CTA-01" oninput="state.importListe=listeDepuisTexte(this.value);listeMajApercu();">' + escapeHtml(state.importListeTexte || '') + '</textarea></div>';
  h += '<div class="card"><h1>' + ICONS.upload + ' Ou depuis le rapport du contrôle précédent</h1>' +
    '<p class="subtitle">Nouveau client : importez le rapport PDF de l’an dernier, même d’un autre organisme. L’appli y repère les installations (type, bâtiment, local) ; vous relisez la liste avant de créer. Le fichier reste sur l’appareil.</p>' +
    '<label class="btn btn-gray btn-small">' + ICONS.upload + ' Importer le rapport PDF<input type="file" accept="application/pdf,.pdf" style="display:none;" onchange="listeLireRapportPdf(this);"></label>' +
    (state.importListeInfo ? '<p class="import-liste-info">' + escapeHtml(state.importListeInfo) + '</p>' : '') + '</div>';
  h += '<div id="liste-apercu">' + listeApercuHtml(m, lignes) + '</div>';
  return h;
}

function listeApercuHtml(m, lignes) {
  if (!lignes.length) return '';
  var ok = lignes.filter(function (l) { return l.type; }), total = ok.reduce(function (s, l) { return s + l.nb; }, 0);
  var h = '<div class="card"><div class="section-title">Aperçu</div><table class="liste-table"><thead><tr><th>Type reconnu</th><th>Nb</th><th>Bâtiment</th><th>Nom</th><th></th></tr></thead><tbody>';
  lignes.forEach(function (l, i) {
    h += '<tr class="' + (l.type ? '' : 'liste-ko') + '"><td>' + (l.type ? escapeHtml(l.type.label) : '✗ « ' + escapeHtml(l.texte) + ' » non reconnu') + '</td><td>' + l.nb + '</td><td>' + escapeHtml(l.bat) + '</td><td>' + escapeHtml(l.nom) + (l.n1 ? '<div class="subtitle">N-1 : ' + escapeHtml(String(l.n1).replace('.', ',')) + ' m³/h</div>' : '') + '</td>' +
      '<td><button type="button" class="liste-retirer" aria-label="Retirer la ligne" onclick="listeRetirerLigne(' + i + ');">✕</button></td></tr>';
  });
  h += '</tbody></table>';
  if (ok.length < lignes.length) h += '<p class="subtitle">Les lignes non reconnues seront ignorées : corrigez le type (voir la feuille « Types possibles » du modèle).</p>';
  h += '<label class="doc-check"><input type="checkbox" id="liste-devis" checked> Reprendre ces quantités comme quantités prévues au devis</label>';
  h += '<button type="button" class="btn btn-primary"' + (total ? '' : ' disabled') + ' onclick="listeCreer();">' + ICONS.check + ' Créer ' + total + ' installation' + (total > 1 ? 's' : '') + '</button></div>';
  return h;
}

function listeRetirerLigne(i) {
  if (!state.importListe) return;
  state.importListe.splice(i, 1);
  listeMajApercu();
}

function listeMajApercu() {
  var el = document.getElementById('liste-apercu'), ta = document.getElementById('liste-coller');
  if (ta) state.importListeTexte = ta.value;
  if (el) el.innerHTML = listeApercuHtml(getCurrentMission(), state.importListe || []);
}

function listeLireFichier(input) {
  var file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  var lire = /\.csv$/i.test(file.name)
    ? file.text().then(function (t) { return listeDepuisTexte(t); })
    : ensureLib('xlsx').then(function () { return file.arrayBuffer(); }).then(function (buf) {
      var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      return listeAnalyser(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }));
    });
  lire.then(function (lignes) {
    state.importListe = lignes;
    state.importListeTexte = '';
    render();
  }).catch(function (err) { alert('Fichier illisible :\n\n' + err.message); });
}

// Tableau de saisie directe : une ligne par type, nombre et bâtiment
function renderQuantitesRapides(m) {
  var types = INSTALLATION_TYPES.filter(function (t) { return t.implemented !== false; });
  var choisis = m.typesSelectionnes || [];
  types.sort(function (a, b) { return (choisis.indexOf(a.id) === -1) - (choisis.indexOf(b.id) === -1); }); // types de la mission en premier
  var h = '<div class="card"><h1>' + ICONS.plus + ' Créer les installations par quantités</h1>' +
    '<p class="subtitle">Indiquez le nombre d’installations de chaque type (et le bâtiment si vous le connaissez) : elles sont toutes créées d’un coup, numérotées, à renseigner ensuite.</p>';
  h += '<div class="quantites-table"><div class="quantites-tete"><span>Type</span><span>Nombre</span><span>Bâtiment</span></div>';
  types.forEach(function (t) {
    var deja = (m.installations[t.id] || []).length;
    h += '<div class="quantites-ligne"><label for="qte-' + t.id + '">' + escapeHtml(t.label) + (deja ? '<span class="subtitle"> · ' + deja + ' déjà</span>' : '') + '</label>' +
      '<input type="text" inputmode="numeric" class="input" id="qte-' + t.id + '" placeholder="0" oninput="quantitesMaj();">' +
      '<input type="text" class="input" id="qbat-' + t.id + '" placeholder="Bâtiment" list="qbats"></div>';
  });
  h += '</div><datalist id="qbats">' + ((typeof creationBatiments === 'function') ? creationBatiments(m) : []).map(function (b) { return '<option value="' + escapeHtml(b) + '">'; }).join('') + '</datalist>';
  h += '<div class="quantites-actions"><label class="doc-check"><input type="checkbox" id="qte-devis" checked> Reprendre ces quantités comme quantités prévues au devis</label>';
  h += '<button type="button" class="btn btn-primary" id="qte-creer" disabled onclick="quantitesCreer();">' + ICONS.check + ' Créer les installations</button></div></div>';
  return h;
}

function quantitesLignes() {
  return INSTALLATION_TYPES.filter(function (t) { return t.implemented !== false; }).map(function (t) {
    var n = parseInt(((document.getElementById('qte-' + t.id) || {}).value || '').trim(), 10);
    return n > 0 ? { texte: t.label, type: t, nb: Math.min(n, 200), bat: String((document.getElementById('qbat-' + t.id) || {}).value || '').trim().slice(0, 60), nom: '' } : null;
  }).filter(Boolean);
}

function quantitesMaj() {
  var total = quantitesLignes().reduce(function (s, l) { return s + l.nb; }, 0), b = document.getElementById('qte-creer');
  if (b) { b.disabled = !total; b.innerHTML = ICONS.check + (total ? ' Créer ' + total + ' installation' + (total > 1 ? 's' : '') : ' Créer les installations'); }
}

function quantitesCreer() {
  listeCreerLignes(quantitesLignes(), (document.getElementById('qte-devis') || {}).checked);
}

function listeCreer() {
  listeCreerLignes((state.importListe || []).filter(function (l) { return l.type; }), (document.getElementById('liste-devis') || {}).checked);
}

function listeCreerLignes(lignes, devis) {
  var m = getCurrentMission();
  if (!m || !lignes.length || typeof creationRapideCreer !== 'function') return;
  var parType = {}, total = 0;
  lignes.forEach(function (l) {
    var deja = (m.installations[l.type.id] || []).length;
    for (var i = 1; i <= l.nb; i++) {
      var nom = l.nom ? (l.nb > 1 ? l.nom + ' ' + i : l.nom) : 'n°' + (deja + i);
      var cle = creationRapideCreer(m, l.type, nom, l.bat);
      // Valeurs de l'an dernier lues dans le rapport précédent (js/import-rapport-pdf.js)
      if (l.data && l.nb === 1 && cle) { var inst = m.installations[l.type.id][parseInt(cle.split(':')[1], 10)]; Object.keys(l.data).forEach(function (k) { inst.data[k] = JSON.parse(JSON.stringify(l.data[k])); }); }
      total++;
    }
    parType[l.type.id] = (parType[l.type.id] || 0) + l.nb;
  });
  if (devis) {
    m.devis = m.devis || {};
    Object.keys(parType).forEach(function (k) { m.devis[k] = parType[k]; });
  }
  if (!m.typeMission) m.typeMission = 'globale';
  persistMissions();
  state.importListe = null;
  state.importListeTexte = '';
  state.importListeInfo = '';
  state.view = 'mission-detail';
  render();
  alert(total + ' installation(s) créée(s) (' + Object.keys(parType).length + ' type(s)).' + (devis ? '\n\nQuantités reprises comme quantités prévues au devis.' : ''));
}

function listeTelechargerModele() {
  ensureLib('xlsx').then(function () {
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet([
      ['Type d’installation', 'Nombre', 'Bâtiment', 'Nom ou repère'],
      ['Sorbonnes', 3, 'Bâtiment C - Laboratoire', 'Sorbonne SO'],
      ['Hottes', 2, 'Bâtiment B - Production', ''],
      ['CTA (Centrale de traitement d’air)', 1, 'Toiture', 'CTA-01'],
      ['Bureaux / Salles de réunion', 6, 'Bâtiment A', '']
    ]);
    ws['!cols'] = [{ wch: 44 }, { wch: 9 }, { wch: 28 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Installations');
    var types = XLSX.utils.aoa_to_sheet([['Types possibles (colonne A)']].concat(
      INSTALLATION_TYPES.filter(function (t) { return t.implemented !== false; }).map(function (t) { return [t.label]; })));
    types['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, types, 'Types possibles');
    XLSX.writeFile(wb, 'Modele_installations_aeration.xlsx');
  }).catch(function (err) { alert(err.message); });
}

console.log('✓ Import de liste d’installations chargé');
