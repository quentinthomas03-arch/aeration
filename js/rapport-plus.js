// rapport-plus.js - Avant et après le rapport (2026-10-05)
//
//  - Observations à rédiger : installations non satisfaisantes sans observation (champ commentaire de
//    la synthèse, SYNTHESE_CONFIG), rappelées dans « Vérifier avant de partir », ouverture sur l'étape.
//  - Photos de la mission en un zip : un dossier par bâtiment, photos nommées « Bâtiment – local – n° ».
//    Zip écrit ici (stockage sans compression : les JPEG sont déjà compressés), pas de bibliothèque.
//  - Équilibre soufflage / extraction en double flux : écart marqué signalé (indication technique,
//    pas un avis réglementaire), sous le champ et dans « Vérifier avant de partir ».
//  - Modifications entre deux versions du rapport : à chaque édition du rapport, une copie des valeurs
//    est gardée par version (« Nature de la révision ») ; l'appli compare l'état actuel à la version
//    précédente (avis, valeurs, installations ajoutées ou retirées). Deux versions gardées au plus.

// ————————————————————————————————————————————
// 1. Observations à rédiger
// ————————————————————————————————————————————

function observationsARediger(m) {
  var sel = m.typesSelectionnes || [];
  var items = listAllInstallations(m, INSTALLATION_TYPES.filter(function (t) { return sel.indexOf(t.id) !== -1; }));
  return items.filter(function (it) {
    if (it.status.cls !== 'status-bad' || it.status.nc) return false;
    var cfg = (typeof SYNTHESE_CONFIG !== 'undefined' && SYNTHESE_CONFIG[it.type.id]) || {};
    if (!cfg.commentaire) return false;
    var v = String(it.inst.data[cfg.commentaire] || '').trim();
    return !v || v === '/' || v === '-';
  }).map(function (it) {
    var key = SYNTHESE_CONFIG[it.type.id].commentaire;
    return { it: it, stepIdx: typeof fieldStepIndex === 'function' ? fieldStepIndex(it.type.id, key) : null };
  });
}

function observationsARedigerHtml(m) {
  var list = observationsARediger(m);
  if (!list.length) return '';
  var h = '<div class="card verif-card"><div class="section-title">Observations à rédiger (' + list.length + ')</div>' +
    '<p class="subtitle">Installations non satisfaisantes sans observation : le rapport ne dirait pas pourquoi. « Rédiger le constat à partir des mesures » est sous le commentaire.</p>';
  list.forEach(function (x) {
    var it = x.it;
    h += '<div class="verif-line verif-line-bad verif-line-link" onclick="openVerificationTarget(\'' + it.type.id + '\',' + it.idx + ',' + (x.stepIdx === null ? 'null' : x.stepIdx) + ');">' +
      escapeHtml(it.type.label.replace(/\s*\(.*\)\s*$/, '') + ' — ' + overviewRowTitle(it) + (it.inst.data.batiment ? ' (' + it.inst.data.batiment + ')' : '')) + '</div>';
  });
  return h + '</div>';
}

// ————————————————————————————————————————————
// 2. Photos en zip
// ————————————————————————————————————————————

var _crcTable = null;
function crc32(u8) {
  if (!_crcTable) {
    _crcTable = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; _crcTable[n] = c >>> 0; }
  }
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < u8.length; i++) crc = _crcTable[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// fichiers : [{ nom: 'dossier/fichier.jpg', data: Uint8Array }] -> Blob zip (sans compression, noms UTF-8)
function zipCreer(fichiers) {
  var enc = new TextEncoder(), parts = [], central = [], offset = 0;
  var d = new Date(), heure = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  fichiers.forEach(function (f) {
    var nom = enc.encode(f.nom), crc = crc32(f.data), taille = f.data.length;
    var lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, heure, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, taille, true); lh.setUint32(22, taille, true); lh.setUint16(26, nom.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, nom, f.data);
    var ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, heure, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true); ch.setUint32(20, taille, true); ch.setUint32(24, taille, true);
    ch.setUint16(28, nom.length, true); ch.setUint32(42, offset, true);
    central.push(ch.buffer, nom);
    offset += 30 + nom.length + taille;
  });
  var tailleCentral = central.reduce(function (s, p) { return s + (p.byteLength !== undefined ? p.byteLength : p.length); }, 0);
  var fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true); fin.setUint32(16, offset, true);
  return new Blob(parts.concat(central, [fin.buffer]), { type: 'application/zip' });
}

function nomFichierPropre(s) {
  return String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'sans nom';
}

// Photos du rapport (champs photo des fiches) : [{ dossier, nom, id }]
function photosDeLaMission(m) {
  var out = [], vus = {};
  overviewOrderedItems(m).forEach(function (it) {
    var n = 0;
    it.type.fields.forEach(function (f) {
      if (f.type !== 'photo') return;
      var v = it.inst.data[f.key], liste = Array.isArray(v) ? v : (v ? [v] : []);
      liste.forEach(function (p) {
        var id = p && typeof p === 'object' ? p.id : null;
        if (!id || vus[id]) return;
        vus[id] = true;
        n++;
        var bat = it.inst.data.batiment || 'Sans bâtiment';
        out.push({ dossier: nomFichierPropre(bat), nom: nomFichierPropre([bat, it.inst.data.niveau, overviewRowTitle(it)].filter(Boolean).join(' – ')) + ' – ' + n, id: id });
      });
    });
  });
  return out;
}

function exporterPhotosZip() {
  var m = getCurrentMission();
  if (!m) return;
  var photos = photosDeLaMission(m);
  if (!photos.length) { alert('Aucune photo dans les fiches de cette mission.'); return; }
  var noms = {};
  Promise.all(photos.map(function (p) {
    return getPhotoBlob(p.id).then(function (b) { return b ? b.arrayBuffer().then(function (buf) { return { p: p, data: new Uint8Array(buf), type: b.type }; }) : null; })
      .catch(function () { return null; });
  })).then(function (res) {
    var fichiers = res.filter(Boolean).map(function (r) {
      var ext = /png/.test(r.type) ? '.png' : '.jpg', nom = r.p.dossier + '/' + r.p.nom + ext;
      while (noms[nom]) nom = nom.replace(/(\.\w+)$/, '-bis$1');
      noms[nom] = true;
      return { nom: nom, data: r.data };
    });
    if (!fichiers.length) { alert('Les photos n’ont pas pu être lues sur cet appareil.'); return; }
    var base = nomFichierPropre((m.donneesInternes && m.donneesInternes.referenceOffre) || m.clientSite || 'Mission');
    downloadBlob(zipCreer(fichiers), base + '_photos.zip');
    if (fichiers.length < photos.length) alert((photos.length - fichiers.length) + ' photo(s) introuvable(s) sur cet appareil n’ont pas été ajoutées au zip.');
  });
}

// ————————————————————————————————————————————
// 4. Équilibre soufflage / extraction (double flux)
// ————————————————————————————————————————————

var EQUILIBRE_ECART = 0.3; // écart relatif signalé : 30 % (même seuil que l'écart avec l'année précédente)

function equilibreDoubleFlux(d) {
  if (d.type_ventilation !== 'Double flux') return null;
  var s = num(d.debit_soufflage), e = num(d.debit_extraction);
  if (!(s > 0) || !(e > 0)) return null;
  var r = e / s;
  if (r >= 1 - EQUILIBRE_ECART && r <= 1 + EQUILIBRE_ECART) return null;
  var fr = function (v) { return String(Math.round(v)); };
  return 'Extraction ' + fr(e) + ' m³/h, soufflage ' + fr(s) + ' m³/h : ' + (r < 1
    ? 'le local est en surpression (extraction = ' + Math.round(r * 100) + ' % du soufflage)'
    : 'le local est en forte dépression (extraction = ' + Math.round(r * 100) + ' % du soufflage)') + '. Indication technique à vérifier (réglage, bouche fermée, filtre).';
}

function equilibreAnomalies(t, inst) {
  if (t.id !== 'bureaux' && t.id !== 'erp') return [];
  var msg = equilibreDoubleFlux(inst.data || {});
  return msg ? [{ label: 'Équilibre soufflage / extraction', message: msg, stepIdx: typeof fieldStepIndex === 'function' ? fieldStepIndex(t.id, 'debit_extraction') : null }] : [];
}

function equilibreHintHtml(typeId, f) {
  if ((typeId !== 'bureaux' && typeId !== 'erp') || f.key !== 'debit_extraction') return '';
  var inst = getCurrentInstallation(typeId), msg = inst && equilibreDoubleFlux(inst.data);
  return msg ? '<div class="field-hint field-hint-warn">' + ICONS.zap + ' ' + escapeHtml(msg) + '</div>' : '';
}

// ————————————————————————————————————————————
// 5. Modifications entre deux versions du rapport
// ————————————————————————————————————————————

var VERSIONS_RAPPORT_MAX = 2; // version en cours + précédente : place limitée du navigateur

function rapportCopieValeurs(m) {
  var out = {};
  overviewOrderedItems(m).forEach(function (it) {
    var d = it.inst.data || {}, v = {}, key = resolveAvisFieldKey(it.type);
    it.type.fields.forEach(function (f) {
      if (f.type === 'section' || f.type === 'photo' || (f.type === 'computed' && f.key !== key)) return;
      var x = d[f.key];
      if (x === undefined || x === null || x === '') return;
      v[f.key] = typeof x === 'object' ? JSON.stringify(x) : String(x);
    });
    out[it.inst.id] = { t: it.type.id, nom: overviewRowTitle(it), bat: d.batiment || '', avis: d._nonControle ? 'Non contrôlée' : (d[key] || ''), v: v };
  });
  return out;
}

function rapportNature(m) { return String((m.donneesInternes && m.donneesInternes.natureRevision) || 'Version initiale').trim(); }

// Appelé à chaque édition du rapport : une copie par version (la même version rééditée remplace sa copie)
function rapportMemoriserVersion(m) {
  if (!m) return;
  var nature = rapportNature(m), list = Array.isArray(m._versionsRapport) ? m._versionsRapport : [];
  var copie = { nature: nature, date: new Date().toISOString(), inst: rapportCopieValeurs(m) };
  if (list.length && list[list.length - 1].nature === nature) list[list.length - 1] = copie; else list.push(copie);
  m._versionsRapport = list.slice(-VERSIONS_RAPPORT_MAX);
  persistMissions();
}

function rapportVersionPrecedente(m) {
  var nature = rapportNature(m), list = m._versionsRapport || [];
  for (var i = list.length - 1; i >= 0; i--) if (list[i].nature !== nature) return list[i];
  return null;
}

function rapportModifications(m) {
  var ref = rapportVersionPrecedente(m);
  if (!ref) return null;
  var actuel = rapportCopieValeurs(m), lignes = [];
  var libelle = function (typeId, k) { var t = getInstallationType(typeId), f = t && t.fields.find(function (x) { return x.key === k; }); return f ? f.label : k; };
  var court = function (s) { s = String(s); return s.length > 60 ? s.slice(0, 57) + '…' : s; };
  Object.keys(actuel).forEach(function (id) {
    var a = actuel[id], r = ref.inst[id], t = getInstallationType(a.t), titre = (t ? t.label.replace(/\s*\(.*\)\s*$/, '') : a.t) + ' — ' + a.nom + (a.bat ? ' (' + a.bat + ')' : '');
    if (!r) { lignes.push({ titre: titre, changements: ['Installation ajoutée' + (a.avis ? ' · avis : ' + a.avis : '')], avis: true }); return; }
    var ch = [], avisChange = (r.avis || '') !== (a.avis || '');
    if (avisChange) ch.push('Avis : ' + (r.avis || '—') + ' → ' + (a.avis || '—'));
    var cles = {};
    Object.keys(a.v).concat(Object.keys(r.v)).forEach(function (k) { cles[k] = true; });
    Object.keys(cles).forEach(function (k) {
      if (k === resolveAvisFieldKey(t)) return;
      var av = a.v[k] || '', rv = r.v[k] || '';
      if (av !== rv) ch.push(libelle(a.t, k) + ' : ' + (rv ? court(rv) : '—') + ' → ' + (av ? court(av) : '—'));
    });
    if (ch.length) lignes.push({ titre: titre, changements: ch, avis: avisChange });
  });
  Object.keys(ref.inst).forEach(function (id) {
    if (actuel[id]) return;
    var r = ref.inst[id], t = getInstallationType(r.t);
    lignes.push({ titre: (t ? t.label.replace(/\s*\(.*\)\s*$/, '') : r.t) + ' — ' + r.nom + (r.bat ? ' (' + r.bat + ')' : ''), changements: ['Installation retirée'], avis: true });
  });
  lignes.sort(function (x, y) { return (y.avis ? 1 : 0) - (x.avis ? 1 : 0); }); // avis modifiés en premier
  return { ref: ref, nature: rapportNature(m), lignes: lignes };
}

function renderModifsRapport() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; return renderHome(); }
  var res = rapportModifications(m);
  var h = '<button class="back-btn" onclick="state.view=\'mission-detail\';render();">' + ICONS.arrowLeft + ' ' + escapeHtml(missionNom(m)) + '</button>';
  h += '<div class="card"><h1>' + ICONS.list + ' Modifications du rapport</h1>';
  if (!res) {
    return h + '<p class="subtitle">Pas encore de version précédente à comparer. L’appli garde une copie des valeurs à chaque édition du rapport PDF : éditez le rapport, puis changez « Nature de la révision » (Infos mission) avant de le rééditer ; les modifications apparaîtront ici.</p></div>';
  }
  var d = new Date(res.ref.date);
  h += '<p class="subtitle">Depuis « ' + escapeHtml(res.ref.nature) + ' » (édité le ' + d.toLocaleDateString('fr-FR') + ') jusqu’à l’état actuel (« ' + escapeHtml(res.nature) + ' ») : ' +
    res.lignes.length + ' installation(s) modifiée(s).</p>' +
    (res.lignes.length ? '<button type="button" class="btn btn-gray btn-small" onclick="exporterModifsRapport();">' + ICONS.download + ' Télécharger (PDF)</button>' : '') + '</div>';
  if (!res.lignes.length) return h + '<div class="card verif-ok">' + ICONS.check + ' Aucune modification depuis la version précédente.</div>';
  res.lignes.forEach(function (l) {
    h += '<div class="card verif-card"><div class="overview-row-title">' + escapeHtml(l.titre) + '</div>';
    l.changements.forEach(function (c, i) { h += '<div class="verif-line' + (i === 0 && l.avis ? ' verif-line-bad' : '') + '">' + escapeHtml(c) + '</div>'; });
    h += '</div>';
  });
  return h;
}

function exporterModifsRapport() {
  var m = getCurrentMission(), res = m && rapportModifications(m);
  if (!res) return;
  var di = m.donneesInternes || {}, BLUE = '#0082DE';
  ensureLib('pdf').then(function () {
    var content = [{ text: 'MODIFICATIONS DU RAPPORT', bold: true, fontSize: 14, color: BLUE },
      { text: (m.clientSite || '') + (di.numeroChrono ? ' · chrono ' + di.numeroChrono : ''), fontSize: 10, margin: [0, 2, 0, 4] },
      { text: '« ' + res.ref.nature + ' » (' + new Date(res.ref.date).toLocaleDateString('fr-FR') + ') → « ' + res.nature + ' »', fontSize: 10, color: '#333', margin: [0, 0, 0, 12] }];
    res.lignes.forEach(function (l) {
      content.push({ text: l.titre, bold: true, fontSize: 10, margin: [0, 6, 0, 2] });
      content.push({ ul: l.changements.map(function (c) { return { text: c, fontSize: 9 }; }), margin: [0, 0, 0, 4] });
    });
    var name = nomFichierPropre(di.referenceOffre || m.clientSite || 'Mission') + '_modifications_rapport.pdf';
    pdfMake.createPdf({ pageSize: 'A4', pageMargins: [36, 30, 36, 36], defaultStyle: { font: 'Arial', fontSize: 10 }, content: content }).download(name);
  }).catch(function (err) { alert(err.message); });
}

// ————————————————————————————————————————————
// Doublons possibles (même type, même bâtiment, même nom)
// ————————————————————————————————————————————

function doublonsPossibles(m) {
  var sel = m.typesSelectionnes || [], groupes = {};
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); };
  listAllInstallations(m, INSTALLATION_TYPES.filter(function (t) { return sel.indexOf(t.id) !== -1; })).forEach(function (it) {
    var nom = overviewRowTitle(it);
    if (/^#\d+$/.test(nom)) return; // fiche sans nom : rien à comparer
    var cle = it.type.id + '|' + norm(it.inst.data.batiment) + '|' + norm(it.inst.data.niveau) + '|' + norm(nom);
    (groupes[cle] = groupes[cle] || []).push(it);
  });
  return Object.keys(groupes).map(function (k) { return groupes[k]; }).filter(function (g) { return g.length > 1; });
}

function doublonsHtml(m) {
  var gr = doublonsPossibles(m);
  if (!gr.length) return '';
  var h = '<div class="card verif-card"><div class="section-title">Doublons possibles (' + gr.length + ')</div>' +
    '<p class="subtitle">Même type, même bâtiment, même nom : renommez ou supprimez la fiche en trop avant le rapport.</p>';
  gr.forEach(function (g) {
    h += '<div class="verif-line verif-line-bad">' + escapeHtml(g[0].type.label.replace(/\s*\(.*\)\s*$/, '') + ' — ' + overviewRowTitle(g[0]) + (g[0].inst.data.batiment ? ' (' + g[0].inst.data.batiment + ')' : '')) + ' : ' + g.length + ' fiches</div>';
    g.forEach(function (it, i) {
      h += '<div class="verif-line verif-line-link" onclick="openVerificationTarget(\'' + it.type.id + '\',' + it.idx + ',null);">Fiche ' + (i + 1) + ' · ' + escapeHtml(it.status.text) + '</div>';
    });
  });
  return h + '</div>';
}

// ————————————————————————————————————————————
// Notes proposées pour la visite suivante
// ————————————————————————————————————————————

function memoireAnnee(m) {
  var di = m.donneesInternes || {}, d = (typeof datesInText === 'function' ? datesInText(di.datesIntervention || m.dateControle || '') : [])[0];
  return String((d || new Date()).getFullYear());
}

// Propositions tirées de la mission : non contrôlées, marques « à revoir », bouches faibles
function memoirePropositions(m) {
  var an = memoireAnnee(m), out = [];
  overviewOrderedItems(m).forEach(function (it) {
    var d = it.inst.data || {}, textes = [];
    if (d._nonControle) textes.push('Non contrôlée en ' + an + ' : ' + d._nonControle.motif + (d._nonControle.precision ? ' (' + d._nonControle.precision + ')' : '') + '.');
    if (d._aRevoir) textes.push('Marquée « à revoir » en ' + an + ' : vérifier ce point en premier.');
    if (d._bouches && typeof amBouchesFaibles === 'function' && typeof amBouchesDebits === 'function') {
      Object.keys(d._bouches).forEach(function (cle) {
        var liste = d._bouches[cle];
        if (!Array.isArray(liste)) return;
        var debits = amBouchesDebits(it.inst, liste, cle);
        amBouchesFaibles(debits.map(function (v) { return isNaN(v) ? '' : String(v); })).forEach(function (x) {
          textes.push('Bouche ' + (x.i + 1) + ' faible en ' + an + ' (' + Math.round(x.v) + ' m³/h, médiane ' + Math.round(x.med) + ').');
        });
      });
    }
    textes.forEach(function (t) {
      if (String(d._note || '').indexOf(t) !== -1) return; // déjà dans la note
      out.push({ it: it, texte: t, coche: true });
    });
  });
  return out;
}

function memoireHtml(m) {
  if (!state.memoire || state.memoire.mission !== m.id) state.memoire = { mission: m.id, props: memoirePropositions(m) };
  var props = state.memoire.props;
  if (!props.length) return '';
  var h = '<div class="card verif-card"><div class="section-title">Pour la prochaine visite (' + props.length + ')</div>' +
    '<p class="subtitle">Notes proposées d’après la visite. Cochées, elles s’ajoutent à la note de chaque installation et seront affichées en tête de fiche l’an prochain (hors rapport).</p>';
  props.forEach(function (p, i) {
    h += '<label class="fp-com-ligne"><input type="checkbox"' + (p.coche ? ' checked' : '') + ' onchange="state.memoire.props[' + i + '].coche=this.checked;">' +
      '<span><b>' + escapeHtml(overviewRowTitle(p.it)) + '</b>' + (p.it.inst.data.batiment ? ' <span class="subtitle">· ' + escapeHtml(p.it.inst.data.batiment) + '</span>' : '') + '<br>' + escapeHtml(p.texte) + '</span></label>';
  });
  return h + '<button type="button" class="btn btn-primary btn-small" onclick="memoireAppliquer();">Ajouter aux notes de la visite suivante</button></div>';
}

function memoireAppliquer() {
  var m = getCurrentMission(), q = state.memoire;
  if (!m || !q) return;
  var n = 0, avant = [];
  q.props.forEach(function (p) {
    if (!p.coche) return;
    var d = p.it.inst.data, deja = String(d._note || '').trim();
    if (deja.indexOf(p.texte) !== -1) return;
    avant.push({ data: d, note: d._note });
    d._note = ((deja ? deja + ' ' : '') + p.texte).slice(0, 500);
    n++;
  });
  persistMissions();
  state.memoire = null;
  render();
  if (n && typeof scheduleUndo === 'function') scheduleUndo(n + ' note(s) ajoutée(s) pour la visite suivante.', function () {
    avant.reverse().forEach(function (a) { if (a.note === undefined) delete a.data._note; else a.data._note = a.note; });
    state.memoire = null;
    persistMissions();
  });
}

console.log('✓ Observations à rédiger, photos en zip, équilibre double flux, versions du rapport, doublons, notes pour la visite suivante chargés');
