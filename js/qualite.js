// qualite.js - Qualité du contrôle et du rapport (chantier du 2026-10-04)
//
//  1. Installation non contrôlée : motif (accès impossible, à l'arrêt…) au lieu d'une fiche vide.
//     inst.data._nonControle = { motif, precision }. Comptée « terminée », jamais dans « à compléter » ;
//     dans le rapport : « Non contrôlée » dans la synthèse, liste avec motif, pas de fiche en annexe.
//  2. Contre-visite : nouvelle mission ne reprenant que les installations non satisfaisantes, avec la
//     mesure initiale en N-1 ; le rapport rappelle le rapport d'origine (m.contreVisite).
//  3. Harmonisation des noms de bâtiments (« Bât B », « Bâtiment B - Production »…), proposée dans
//     « Vérifier avant de partir ».
//  4. Relecture : un collègue ou un responsable valide chaque installation ou laisse un commentaire
//     (inst.data._relecture = { ok, c }), puis déclare la relecture terminée (m.relecture) : le rapport
//     porte alors « Rapport vérifié par … le … ». Le circuit passe par le transfert et la fusion.

// ————————————————————————————————————————————
// 1. Installation non contrôlée
// ————————————————————————————————————————————

var NC_MOTIFS = ['Accès impossible', 'Installation à l’arrêt ou hors service', 'Installation démontée ou supprimée', 'Absence ou refus du client', 'Conditions de sécurité non réunies', 'Autre'];

function ncDe(inst) {
  return inst && inst.data && inst.data._nonControle ? inst.data._nonControle : null;
}

function ncTexte(nc) {
  return nc ? nc.motif + (nc.precision ? ' (' + nc.precision + ')' : '') : '';
}

function ncBandeauHtml(typeId, inst) {
  var nc = ncDe(inst);
  if (!nc) return '';
  return '<div class="nc-bandeau"><b>Installation non contrôlée</b> · ' + escapeHtml(ncTexte(nc)) +
    '<span class="nc-actions"><button type="button" class="btn btn-gray btn-small" onclick="state.ncOuvert=\'' + typeId + ':\'+state.currentInstIndex;render();">Modifier</button>' +
    '<button type="button" class="btn btn-gray btn-small" onclick="ncAnnuler(\'' + typeId + '\');">Annuler</button></span></div>';
}

function ncChampHtml(typeId, inst) {
  if (!inst) return '';
  var cle = typeId + ':' + state.currentInstIndex, nc = ncDe(inst);
  if (state.ncOuvert !== cle) {
    return nc ? '' : '<button type="button" class="btn btn-gray btn-small nc-lien" onclick="state.ncOuvert=\'' + cle + '\';render();">Installation non contrôlée ?</button>';
  }
  var h = '<div class="card nc-form"><div class="section-title">Installation non contrôlée</div><p class="subtitle">Elle figurera dans le rapport comme non contrôlée, avec ce motif.</p>';
  NC_MOTIFS.forEach(function (mo, i) {
    h += '<label class="doc-check"><input type="radio" name="nc-motif" id="nc-m' + i + '" value="' + escapeHtml(mo) + '"' + ((nc ? nc.motif === mo : i === 0) ? ' checked' : '') + '> ' + escapeHtml(mo) + '</label>';
  });
  h += '<input type="text" class="input" id="nc-precision" maxlength="200" placeholder="Précision (facultatif) : ex. toiture sans accès sécurisé" value="' + escapeHtml(nc ? nc.precision : '') + '">';
  h += '<div class="row"><button type="button" class="btn btn-gray btn-small" onclick="state.ncOuvert=null;render();">Annuler</button>' +
    '<button type="button" class="btn btn-primary btn-small" onclick="ncValider(\'' + typeId + '\');">' + ICONS.check + ' Valider</button></div></div>';
  return h;
}

function ncInst(typeId) {
  var m = getCurrentMission();
  return m && m.installations[typeId] ? m.installations[typeId][state.currentInstIndex] : null;
}

function ncValider(typeId) {
  var inst = ncInst(typeId), r = document.querySelector('input[name="nc-motif"]:checked');
  if (!inst || !r) return;
  inst.data._nonControle = { motif: r.value, precision: String((document.getElementById('nc-precision') || {}).value || '').trim().slice(0, 200) };
  if (typeof touchInstallation === 'function') touchInstallation(inst);
  state.ncOuvert = null;
  persistMissions();
  render();
}

function ncAnnuler(typeId) {
  var inst = ncInst(typeId);
  if (!inst) return;
  delete inst.data._nonControle;
  if (typeof touchInstallation === 'function') touchInstallation(inst);
  persistMissions();
  render();
}

// Rapport : liste des installations non contrôlées, à la suite de la synthèse
function pdfNonControlees(m) {
  var nc = overviewOrderedItems(m).filter(function (it) { return ncDe(it.inst); });
  if (!nc.length) return [];
  var cell = function (t, o) { return Object.assign({ text: t === undefined || t === null || t === '' ? '-' : String(t), fontSize: 9, margin: [3, 2, 3, 2] }, o || {}); };
  var head = function (t) { return cell(t, { bold: true, color: 'white', fillColor: '#0082DE' }); };
  var body = [[head('Type'), head('Installation'), head('Bâtiment'), head('Motif')]];
  nc.forEach(function (it) { body.push([cell(it.type.label), cell(overviewRowTitle(it)), cell(it.inst.data.batiment), cell(ncTexte(ncDe(it.inst)))]); });
  return [{ text: 'INSTALLATIONS NON CONTRÔLÉES', bold: true, color: '#00B0F0', fontSize: 12, margin: [0, 10, 0, 6] },
    { text: 'Installations prévues mais non contrôlées lors de la visite, avec le motif relevé sur site.', fontSize: 9, italics: true, margin: [0, 0, 0, 6] },
    { table: { headerRows: 1, widths: [150, '*', 150, 220], body: body, dontBreakRows: true },
      layout: { hLineColor: function () { return '#B7D7F0'; }, vLineColor: function () { return '#B7D7F0'; }, hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } } }];
}

// ————————————————————————————————————————————
// 2. Contre-visite
// ————————————————————————————————————————————

function contreVisiteInstallations(m) {
  return overviewOrderedItems(m).filter(function (it) { return it.status.cls === 'status-bad' && !ncDe(it.inst); });
}

function creerContreVisite() {
  var m = getCurrentMission();
  if (!m) return;
  var ns = contreVisiteInstallations(m);
  if (!ns.length) { alert('Aucune installation non satisfaisante dans cette mission.'); return; }
  if (!confirm('Créer une contre-visite pour les ' + ns.length + ' installation(s) non satisfaisante(s) ?\n\nUne nouvelle mission est créée ; la mesure de cette visite apparaît en « N-1 » dans chaque fiche.')) return;
  var nm = contreVisiteCreer(m);
  state.missions.push(nm);
  persistMissions();
  state.currentMissionId = nm.id;
  state.view = 'mission-form';
  render();
}

// Nouvelle mission : seulement les installations non satisfaisantes, reprises comme une visite suivante
function contreVisiteCreer(m) {
  var garder = {};
  contreVisiteInstallations(m).forEach(function (it) { garder[it.inst.id] = true; });
  var source = JSON.parse(JSON.stringify(m));
  Object.keys(source.installations || {}).forEach(function (t) {
    source.installations[t] = (source.installations[t] || []).filter(function (inst) { return garder[inst.id]; });
  });
  source.typesSelectionnes = (m.typesSelectionnes || []).filter(function (t) { return (source.installations[t] || []).length; });
  var nm = createMissionFromPreviousSite(source);
  var di = m.donneesInternes || {};
  nm.donneesInternes = nm.donneesInternes || {};
  ['numeroAffaire', 'agence', 'auteurRapport'].forEach(function (k) { if (di[k] && !nm.donneesInternes[k]) nm.donneesInternes[k] = di[k]; });
  nm.clientSite = m.clientSite || nm.clientSite;
  nm.contreVisite = { affaire: di.numeroAffaire || '', chrono: di.numeroChrono || '', date: di.datesIntervention || m.dateControle || '', n: Object.keys(garder).length };
  return nm;
}

// ————————————————————————————————————————————
// 3. Harmonisation des noms de bâtiments
// ————————————————————————————————————————————

function batimentCle(nom) {
  return String(nom || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\b(batiments?|bat|bati|bt)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

// Groupes de noms qui désignent probablement le même bâtiment : [{ noms: [{ nom, n }], cible }]
function batimentsSimilaires(m) {
  var compte = {};
  Object.keys(m.installations || {}).forEach(function (t) {
    (m.installations[t] || []).forEach(function (inst) {
      var b = inst.data && inst.data.batiment ? String(inst.data.batiment).trim() : '';
      if (b) compte[b] = (compte[b] || 0) + 1;
    });
  });
  var noms = Object.keys(compte), parent = {};
  var trouver = function (x) { while (parent[x] !== x) x = parent[x]; return x; };
  noms.forEach(function (n) { parent[n] = n; });
  var proches = function (a, b) {
    var ka = batimentCle(a), kb = batimentCle(b);
    return !!ka && !!kb && (ka === kb || kb.indexOf(ka + ' ') === 0 || ka.indexOf(kb + ' ') === 0);
  };
  for (var i = 0; i < noms.length; i++) for (var j = i + 1; j < noms.length; j++) {
    if (proches(noms[i], noms[j])) parent[trouver(noms[j])] = trouver(noms[i]);
  }
  var groupes = {};
  noms.forEach(function (n) { (groupes[trouver(n)] = groupes[trouver(n)] || []).push({ nom: n, n: compte[n] }); });
  return Object.keys(groupes).map(function (k) { return groupes[k]; }).filter(function (g) { return g.length > 1; }).map(function (g) {
    g.sort(function (a, b) { return b.n - a.n || b.nom.length - a.nom.length; });
    return { noms: g, cible: g[0].nom };
  });
}

function harmonisationHtml(m) {
  var groupes = batimentsSimilaires(m);
  if (!groupes.length) return '';
  var h = '<div class="card verif-card"><div class="section-title">Noms de bâtiments à harmoniser</div><p class="subtitle">Ces noms semblent désigner le même bâtiment : choisissez le nom à garder.</p>';
  groupes.forEach(function (g, i) {
    h += '<div class="harmo-groupe"><div class="harmo-noms">' + g.noms.map(function (x) { return '« ' + escapeHtml(x.nom) + ' » (' + x.n + ')'; }).join(', ') + '</div>' +
      '<div class="row"><select class="input" id="harmo-' + i + '">' + g.noms.map(function (x) { return '<option value="' + escapeHtml(x.nom) + '"' + (x.nom === g.cible ? ' selected' : '') + '>' + escapeHtml(x.nom) + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="btn btn-primary btn-small" onclick="harmoniserBatiments(' + i + ');">Unifier</button></div></div>';
  });
  return h + '</div>';
}

function harmoniserBatiments(i) {
  var m = getCurrentMission(), g = batimentsSimilaires(m)[i], sel = document.getElementById('harmo-' + i);
  if (!g || !sel) return;
  harmoniserVers(m, g.noms.map(function (x) { return x.nom; }), sel.value);
  persistMissions();
  render();
}

function harmoniserVers(m, noms, cible) {
  var n = 0;
  Object.keys(m.installations || {}).forEach(function (t) {
    (m.installations[t] || []).forEach(function (inst) {
      var b = inst.data && inst.data.batiment ? String(inst.data.batiment).trim() : '';
      if (b && b !== cible && noms.indexOf(b) !== -1) { inst.data.batiment = cible; if (typeof touchInstallation === 'function') touchInstallation(inst); n++; }
    });
  });
  return n;
}

// ————————————————————————————————————————————
// 4. Relecture
// ————————————————————————————————————————————

function relectureDe(inst) {
  return inst && inst.data && inst.data._relecture ? inst.data._relecture : null;
}

function renderRelecture() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; return renderHome(); }
  var items = overviewOrderedItems(m), p = (typeof getProfilTechnicien === 'function' && getProfilTechnicien()) || {};
  var valides = items.filter(function (it) { var r = relectureDe(it.inst); return r && r.ok; }).length;
  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(missionNom(m)) + '</button>';
  h += '<div class="card"><h1>' + ICONS.check + ' Relecture de la mission</h1><p class="subtitle">Validez chaque installation ou laissez un commentaire au technicien. Renvoyez-lui ensuite la mission (fichier .json) : il la fusionne et voit vos remarques dans les fiches.</p>';
  if (m.relecture && m.relecture.statut === 'validee') h += '<div class="relecture-ok">' + ICONS.check + ' Relecture terminée par ' + escapeHtml(m.relecture.par) + ' le ' + escapeHtml(m.relecture.date) + '</div>';
  h += '<div class="relecture-compte">' + valides + ' / ' + items.length + ' installation(s) validée(s)</div></div>';
  items.forEach(function (it) {
    var r = relectureDe(it.inst) || {}, cle = it.type.id + '\',' + it.idx;
    h += '<div class="card relecture-item' + (r.ok ? ' ok' : (r.c ? ' remarque' : '')) + '">' +
      '<div class="relecture-tete" onclick="openOverviewInstallation(\'' + cle + ');"><div><div class="overview-row-kicker">' + escapeHtml(it.type.label) + (it.inst.data.batiment ? ' · ' + escapeHtml(it.inst.data.batiment) : '') + '</div>' +
      '<div class="overview-row-title">' + escapeHtml(overviewRowTitle(it)) + '</div><div class="subtitle ' + it.status.cls + '-texte">' + escapeHtml(it.status.text) + '</div></div>' + ICONS.chevronRight + '</div>' +
      '<textarea class="input" rows="2" maxlength="500" placeholder="Commentaire pour le technicien (facultatif)" onchange="relectureMaj(\'' + cle + ',\'c\',this.value);">' + escapeHtml(r.c || '') + '</textarea>' +
      '<button type="button" class="btn btn-small ' + (r.ok ? 'btn-primary' : 'btn-gray') + '" onclick="relectureMaj(\'' + cle + ',\'ok\',' + (r.ok ? 'false' : 'true') + ');">' + ICONS.check + (r.ok ? ' Validée' : ' Valider') + '</button></div>';
  });
  h += '<div class="card"><label class="label" for="relecteur">Relu par</label><input type="text" class="input" id="relecteur" maxlength="80" value="' + escapeHtml((m.relecture && m.relecture.par) || p.nom || '') + '">' +
    '<button type="button" class="btn btn-primary" onclick="relectureTerminer();">' + ICONS.check + ' Relecture terminée : rapport vérifié</button></div>';
  return h;
}

function relectureMaj(typeId, idx, cle, valeur) {
  var m = getCurrentMission(), inst = m && m.installations[typeId] && m.installations[typeId][idx];
  if (!inst) return;
  var r = inst.data._relecture || { ok: false, c: '' };
  if (cle === 'ok') r.ok = !!valeur; else r.c = String(valeur || '').trim().slice(0, 500);
  if (!r.ok && !r.c) delete inst.data._relecture; else inst.data._relecture = r;
  if (typeof touchInstallation === 'function') touchInstallation(inst);
  persistMissions();
  if (cle === 'ok') render();
}

function relectureTerminer() {
  var m = getCurrentMission();
  if (!m) return;
  var par = String((document.getElementById('relecteur') || {}).value || '').trim().slice(0, 80);
  if (!par) { alert('Indiquez le nom du relecteur.'); return; }
  var items = overviewOrderedItems(m), restants = items.filter(function (it) { var r = relectureDe(it.inst); return !(r && r.ok); }).length;
  if (restants && !confirm(restants + ' installation(s) non validée(s). Déclarer quand même la relecture terminée ?')) return;
  m.relecture = { par: par, date: new Date().toLocaleDateString('fr-FR'), t: Date.now(), statut: 'validee' };
  persistMissions();
  render();
}

// Fiche : commentaire du relecteur en tête
function relectureBandeauHtml(inst) {
  var r = relectureDe(inst);
  if (!r || r.ok || !r.c) return '';
  return '<div class="relecture-bandeau"><b>Relecture :</b> ' + escapeHtml(r.c) + '</div>';
}

// « Vérifier avant de partir » (appelé par installationAnomalies, js/controles.js)
function relectureAnomalies(t, inst) {
  var r = relectureDe(inst);
  return r && !r.ok && r.c ? [{ label: 'Relecture', message: r.c, stepIdx: null }] : [];
}

// Rapport : mentions en tête de la présentation (contre-visite, rapport vérifié)
function pdfMentionsQualite(m) {
  var out = [];
  if (m.contreVisite) {
    var cv = m.contreVisite;
    out.push({ text: 'Contre-visite faisant suite au rapport' + (cv.affaire ? ' (affaire ' + cv.affaire + (cv.chrono ? ', chrono ' + cv.chrono : '') + ')' : '') + (cv.date ? ' de la visite du ' + cv.date : '') +
      ' : seules les installations jugées non satisfaisantes lors de cette visite ont été contrôlées de nouveau.', fontSize: 10, bold: true, color: '#005499', margin: [0, 6, 0, 6] });
  }
  if (m.relecture && m.relecture.statut === 'validee') {
    out.push({ text: 'Rapport vérifié par ' + m.relecture.par + ' le ' + m.relecture.date + '.', fontSize: 10, italics: true, margin: [0, 0, 0, 6] });
  }
  return out;
}

console.log('✓ Qualité du contrôle chargée');
