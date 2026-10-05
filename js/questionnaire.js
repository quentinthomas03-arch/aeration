// questionnaire.js - Questionnaire à envoyer au client avant la visite (2026-10-05)
//
// Les informations qui manquent sur site (effectif des locaux, valeurs de référence, % d'air neuf des
// CTA, accès) sont demandées au client avant la visite, dans un classeur Excel tiré de la mission :
//  - feuille « Installations » : une ligne par installation, colonnes à remplir selon le type (effectif,
//    valeurs de référence du dossier de l'arrêté du 8 octobre 1987, % d'air neuf, remarque) ; « — »
//    quand la question ne concerne pas l'installation ;
//  - feuille « Site » : questions générales (contact, accès, horaires, plans, maintenance).
// Le client renvoie le classeur, le technicien l'importe : chaque réponse est proposée avec une case à
// cocher (une valeur déjà saisie dans la fiche n'est pas cochée d'office), rien n'est écrit sans lui.
// Les installations sont retrouvées par leur identifiant (colonne « Réf. appli », à ne pas modifier).

var QC_SANS_OBJET = '—';
var QC_NB_REFS = 3;
var QC_EFFECTIF = { bureaux: 'effectif', erp: 'travailleur', local_specifique: 'effectif', recyclage: 'effectif' };
var QC_AIR_NEUF = { bureaux: 'pourcentage_air_neuf', erp: 'pourcentage_air_neuf', cta: 'mode_fonctionnement' };
var QC_QUESTIONS_SITE = [
  'Interlocuteur sur place (nom, téléphone)',
  'Horaires d’accès et contraintes (badge, accueil, EPI, permis de travail)',
  'Accès aux installations en hauteur (nacelle, échelle, toiture)',
  'Plans disponibles (plan d’évacuation, plans des réseaux de ventilation)',
  'Société de maintenance des installations et date de la dernière intervention',
  'Travaux ou modifications depuis le dernier contrôle'
];

function qcCle(it) { return String(it.inst.id || (it.type.id + ':' + it.idx)); }

function qcEnTetes() {
  var h = ['Réf. appli (ne pas modifier)', 'Bâtiment', 'Type', 'Installation', 'Effectif (nombre de personnes dans le local)'];
  for (var i = 1; i <= QC_NB_REFS; i++) h.push('Valeur de référence ' + i + ' : grandeur', 'Valeur de référence ' + i + ' : valeur');
  h.push('% d’air neuf (soufflage / CTA)', 'Remarque du client');
  return h;
}

function qcLigne(it) {
  var t = it.type, d = it.inst.data;
  var row = [qcCle(it), d.batiment || '', t.label, overviewRowTitle(it)];
  var eff = QC_EFFECTIF[t.id];
  row.push(eff ? (d[eff] || '') : QC_SANS_OBJET);
  var refs = (typeof vrRefLignes === 'function') ? vrRefLignes(t) : [];
  for (var i = 0; i < QC_NB_REFS; i++) {
    var l = refs[i];
    if (l) {
      var v = String(d[l.ref] || '').trim();
      row.push(l.label + (l.unit ? ' (' + l.unit + ')' : ''), v && v !== '/' ? v : '');
    } else row.push(QC_SANS_OBJET, QC_SANS_OBJET);
  }
  var an = QC_AIR_NEUF[t.id];
  row.push(!an ? QC_SANS_OBJET : t.id === 'cta' ? (d.mode_fonctionnement === 'AIR NEUF UNIQUEMENT' ? '100' : '') : (d.pourcentage_air_neuf || ''));
  row.push('');
  return row;
}

function telechargerQuestionnaire() {
  if (!getCurrentMission()) return;
  ensureLib('xlsx').then(function () {
    var m = getCurrentMission(), di = m.donneesInternes || {}, items = overviewOrderedItems(m);
    var wb = XLSX.utils.book_new();
    var intro = [['Questionnaire préparatoire au contrôle de l’aération' + (missionNom(m) ? ' – ' + missionNom(m) : '')],
      ['Merci de compléter les cellules vides que vous connaissez, puis de nous renvoyer ce fichier. « — » : question sans objet pour cette installation.'],
      ['Valeurs de référence : celles de votre dossier de valeurs de référence (arrêté du 8 octobre 1987) ou de la conception de l’installation. Laissez vide si vous ne les avez pas.'],
      []];
    var rows = intro.concat([qcEnTetes()], items.map(qcLigne));
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 30 }, { wch: 16 }].concat(
      Array.apply(null, Array(QC_NB_REFS)).reduce(function (a) { return a.concat([{ wch: 34 }, { wch: 14 }]); }, []), [{ wch: 16 }, { wch: 40 }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Installations');
    var site = [['Question', 'Réponse']].concat(QC_QUESTIONS_SITE.map(function (q) { return [q, '']; }));
    var wss = XLSX.utils.aoa_to_sheet(site);
    wss['!cols'] = [{ wch: 70 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wss, 'Site');
    var nom = (di.referenceOffre || m.clientSite || 'Mission').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').trim();
    XLSX.writeFile(wb, nom + '_questionnaire_aeration.xlsx');
  }).catch(function (err) { alert(err.message); });
}

// Lignes des deux feuilles -> propositions [{ it, champ, label, valeur, existant, coche }] et réponses du site
function qcAnalyser(wb, m) {
  var items = overviewOrderedItems(m), parCle = {};
  items.forEach(function (it) { parCle[qcCle(it)] = it; });
  var props = [], site = [];
  var feuilleInst = wb.Sheets['Installations'] || wb.Sheets[wb.SheetNames[0]];
  var rows = XLSX.utils.sheet_to_json(feuilleInst, { header: 1, raw: false, defval: '' });
  var iEntete = rows.findIndex(function (r) { return String(r[0] || '').indexOf('Réf. appli') === 0; });
  if (iEntete === -1) throw new Error('Ce fichier n’est pas un questionnaire généré par l’appli (colonne « Réf. appli » introuvable).');
  var vide = function (v) { v = String(v || '').trim(); return !v || v === QC_SANS_OBJET; };
  var ajouter = function (it, champ, label, valeur) {
    var existant = String(it.inst.data[champ] || '').trim();
    if (existant === '/' ) existant = '';
    if (existant === String(valeur)) return;
    props.push({ it: it, champ: champ, label: label, valeur: String(valeur), existant: existant, coche: !existant });
  };
  rows.slice(iEntete + 1).forEach(function (r) {
    var it = parCle[String(r[0] || '').trim()];
    if (!it) return;
    var t = it.type, c = 4;
    if (QC_EFFECTIF[t.id] && !vide(r[c]) && !isNaN(vrNombre(r[c]))) ajouter(it, QC_EFFECTIF[t.id], 'Effectif', String(vrNombre(r[c])).replace('.', ','));
    var refs = (typeof vrRefLignes === 'function') ? vrRefLignes(t) : [];
    for (var i = 0; i < QC_NB_REFS; i++) {
      var val = r[5 + 2 * i + 1];
      if (refs[i] && !vide(val) && !isNaN(vrNombre(val))) ajouter(it, refs[i].ref, refs[i].label + (refs[i].unit ? ' (' + refs[i].unit + ')' : ''), String(vrNombre(val)).replace('.', ','));
    }
    var cAn = 5 + 2 * QC_NB_REFS, an = QC_AIR_NEUF[t.id], pct = vrNombre(r[cAn]);
    if (an && !vide(r[cAn]) && !isNaN(pct)) {
      if (t.id === 'cta') ajouter(it, an, 'Mode de fonctionnement', pct >= 100 ? 'AIR NEUF UNIQUEMENT' : 'AIR NEUF / AIR RECYCLE');
      else ajouter(it, an, '% d’air neuf', String(pct).replace('.', ','));
    }
    var rem = String(r[cAn + 1] || '').trim();
    if (rem) {
      var note = it.inst.data._note ? it.inst.data._note + ' — Client : ' + rem : 'Client : ' + rem;
      if ((it.inst.data._note || '').indexOf(rem) === -1) props.push({ it: it, champ: '_note', label: 'Note pour la visite (remarque du client)', valeur: note.slice(0, 500), existant: it.inst.data._note || '', coche: true, affiche: rem });
    }
  });
  if (wb.Sheets['Site']) {
    XLSX.utils.sheet_to_json(wb.Sheets['Site'], { header: 1, raw: false, defval: '' }).slice(1).forEach(function (r) {
      if (String(r[1] || '').trim()) site.push(String(r[0] || '').trim() + ' : ' + String(r[1]).trim());
    });
  }
  return { props: props, site: site };
}

function qcLireFichier(input) {
  var file = input.files && input.files[0];
  input.value = '';
  var m = getCurrentMission();
  if (!file || !m) return;
  ensureLib('xlsx').then(function () { return file.arrayBuffer(); }).then(function (buf) {
    var r = qcAnalyser(XLSX.read(new Uint8Array(buf), { type: 'array' }), m);
    state.qc = { props: r.props, site: r.site, siteCoche: r.site.length > 0 };
    state.qcInfo = (r.props.length || r.site.length)
      ? r.props.length + ' réponse(s) pour les installations' + (r.site.length ? ' et ' + r.site.length + ' sur le site' : '') + '. Vérifiez, décochez ce qui ne convient pas, puis appliquez.'
      : 'Aucune réponse nouvelle dans ce fichier.';
    render();
  }).catch(function (err) { alert('Fichier illisible :\n\n' + err.message); });
}

function qcCocher(i, on) {
  if (!state.qc) return;
  if (i === 'site') state.qc.siteCoche = on; else if (state.qc.props[i]) state.qc.props[i].coche = on;
}

function qcAppliquer() {
  var m = getCurrentMission(), q = state.qc;
  if (!m || !q) return;
  var n = 0, touches = {};
  q.props.forEach(function (p) {
    if (!p.coche) return;
    p.it.inst.data[p.champ] = p.valeur;
    touches[qcCle(p.it)] = p.it;
    n++;
  });
  Object.keys(touches).forEach(function (k) {
    var it = touches[k];
    if (typeof touchInstallation === 'function') touchInstallation(it.inst);
    if (typeof applyCalculations === 'function') applyCalculations(it.type.id, it.inst);
  });
  if (q.siteCoche && q.site.length) {
    var ajout = 'Questionnaire client :\n' + q.site.join('\n');
    m.notesSite = ((m.notesSite ? m.notesSite + '\n\n' : '') + ajout).slice(0, 2000);
  }
  persistMissions();
  state.qc = null;
  state.qcInfo = '';
  state.view = 'mission-detail';
  render();
  alert(n + ' réponse(s) reprise(s) dans ' + Object.keys(touches).length + ' installation(s)' + (q.siteCoche && q.site.length ? ', et les informations du site dans les notes de la visite.' : '.'));
}

function renderQuestionnaire() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; return renderHome(); }
  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(missionNom(m)) + '</button>';
  h += '<div class="card"><h1>' + ICONS.clipboard + ' Questionnaire client</h1>' +
    '<p class="subtitle">Avant la visite, envoyez au client un tableau Excel tiré de la mission : effectif des locaux, valeurs de référence, % d’air neuf des CTA, remarques, et quelques questions sur le site (contact, accès, plans). Il le remplit et vous le renvoie ; vous l’importez ici et cochez ce que vous reprenez.</p>' +
    '<div class="row"><button type="button" class="btn btn-primary btn-small" onclick="telechargerQuestionnaire();">' + ICONS.download + ' Télécharger le questionnaire</button>' +
    '<label class="btn btn-gray btn-small">' + ICONS.upload + ' Importer le questionnaire rempli<input type="file" accept=".xlsx,.xls" style="display:none;" onchange="qcLireFichier(this);"></label></div>' +
    (state.qcInfo ? '<p class="import-liste-info">' + escapeHtml(state.qcInfo) + '</p>' : '') + '</div>';
  var q = state.qc;
  if (q && (q.props.length || q.site.length)) {
    h += '<div class="card"><table class="liste-table vr-table"><thead><tr><th></th><th>Installation</th><th>Information</th><th>Réponse</th></tr></thead><tbody>';
    q.props.forEach(function (p, i) {
      h += '<tr><td><input type="checkbox"' + (p.coche ? ' checked' : '') + ' onchange="qcCocher(' + i + ',this.checked);" aria-label="Reprendre"></td>' +
        '<td>' + escapeHtml(vrTitre(p.it)) + (p.it.inst.data.batiment ? '<div class="subtitle">' + escapeHtml(p.it.inst.data.batiment) + '</div>' : '') + '</td>' +
        '<td>' + escapeHtml(p.label) + '</td><td><b>' + escapeHtml(p.affiche || p.valeur) + '</b>' +
        (p.existant && p.champ !== '_note' ? '<div class="subtitle">déjà saisi : ' + escapeHtml(p.existant) + '</div>' : '') + '</td></tr>';
    });
    if (q.site.length) {
      h += '<tr><td><input type="checkbox"' + (q.siteCoche ? ' checked' : '') + ' onchange="qcCocher(\'site\',this.checked);" aria-label="Reprendre"></td>' +
        '<td>Site</td><td>Notes de la visite</td><td>' + q.site.map(function (s) { return escapeHtml(s); }).join('<br>') + '</td></tr>';
    }
    h += '</tbody></table><button type="button" class="btn btn-primary" style="margin-top:12px;" onclick="qcAppliquer();">' + ICONS.check + ' Reprendre les réponses cochées</button></div>';
  }
  return h;
}

console.log('✓ Questionnaire client chargé');
