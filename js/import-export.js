// import-export.js - Export/Import de missions en JSON
// Permet de transférer une mission d'un appareil à un autre (fichier .json), y compris une mission
// EN COURS (statuts, étape en cours par installation — inst.data._step est un champ de donnée normal,
// donc déjà inclus sans traitement particulier).

// Chantier "photos par installation" : les photos ne vivent qu'en IndexedDB (inst.data.photo n'est
// qu'une référence [{id}]) — resolveMissionPhotosForExport (js/photos.js) les embarque en base64
// dans un CLONE juste pour ce fichier exporté, sans jamais toucher à la mission réelle en mémoire/
// localStorage, qui garde toujours la forme légère. D'où le passage en asynchrone.
function buildMissionExportBlob(m) {
  return resolveMissionPhotosForExport(m).then(function (missionWithPhotos) {
    var exportData = {
      _format: 'AERATION_Mission_JSON',
      _version: '1.0',
      _exportDate: new Date().toISOString(),
      mission: missionWithPhotos
    };
    var safeName = (m.clientSite || 'mission').replace(/[^a-zA-Z0-9à-ÿ _-]/g, '').replace(/\s+/g, '_').substring(0, 40);
    var filename = 'AERATION_' + safeName + '_' + String(m.id).slice(-6) + '.json';
    return { blob: new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }), filename: filename };
  });
}

function downloadBlob(blob, filename) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// Chromium (Android inclus) refuse navigator.share() au-delà de 50 Mo / 10 fichiers, en politique
// délibérée de son implémentation (issues.chromium.org #40601470, #408128761) — pas une limite
// universelle (Safari iOS accepte des fichiers bien plus gros), mais Android/Chrome est la
// plateforme la plus probable sur le terrain, donc la plus contraignante à respecter. Vérifié sur ce
// poste (Chrome desktop) : canShare() n'y applique pas ce plafond — la politique est spécifique à
// l'implémentation mobile et ne se reproduit pas depuis un test desktop, d'où une marge de sécurité
// (40 Mo) plutôt que de coller exactement à 50. Au-delà, plutôt qu'un échec silencieux et déroutant
// (la feuille de partage ne s'ouvre pas, sans explication), on prévient et on bascule direct sur le
// téléchargement classique.
var SHARE_SIZE_WARN_THRESHOLD = 40 * 1024 * 1024;

// Partage natif (mobile, Web Share API niveau 2 avec fichiers) si disponible, sinon téléchargement
// classique. Le partage échoue silencieusement si l'utilisateur annule (AbortError) ; toute autre
// erreur retombe sur le téléchargement pour ne jamais bloquer le transfert.
function shareOrExportMission(id) {
  var m = state.missions.find(function (x) { return x.id === id; });
  if (!m) { alert('Mission introuvable'); return; }

  buildMissionExportBlob(m).then(function (built) {
    if (built.blob.size > SHARE_SIZE_WARN_THRESHOLD) {
      alert('Ce fichier est volumineux (' + Math.round(built.blob.size / 1024 / 1024) + ' Mo, photos incluses) : ' +
        'le partage direct entre appareils n’est pas garanti au-delà de 40-50 Mo selon le téléphone.\n\n' +
        'Le fichier va être téléchargé — transférez-le ensuite manuellement (câble, cloud...).');
      downloadBlob(built.blob, built.filename);
      return;
    }

    var file = null;
    try { file = new File([built.blob], built.filename, { type: 'application/json' }); } catch (e) { file = null; }
    // Mail prêt (objet, texte, pièce jointe) : le technicien choisit Outlook puis le destinataire
    var draft = (typeof missionTransfertMailDraft === 'function') ? missionTransfertMailDraft(m, built.filename)
      : { to: '', subject: 'Mission ' + (m.clientSite || 'Aération'), body: 'Export mission Contrôle Aération' };
    var pending = { blob: built.blob, filename: built.filename, mime: 'application/json', draft: draft };

    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: draft.subject, text: draft.body }).catch(function (err) {
        if (err && err.name === 'AbortError') return; // annulé par l'utilisateur, rien à faire
        // Préparation trop longue (photos) : le navigateur exige un nouveau toucher -> bandeau « Envoyer »
        if (err && err.name === 'NotAllowedError' && typeof offerFileShare === 'function') { offerFileShare(built.blob, built.filename, 'application/json', draft); return; }
        if (typeof fallbackMailWithDownload === 'function') fallbackMailWithDownload(pending); else downloadBlob(built.blob, built.filename);
      });
      return;
    }
    // Ordinateur : fichier téléchargé + brouillon de mail (Outlook) à compléter avec la pièce jointe
    if (typeof fallbackMailWithDownload === 'function') fallbackMailWithDownload(pending); else downloadBlob(built.blob, built.filename);
  }).catch(function (err) {
    alert('Erreur lors de la préparation de l’export :\n\n' + err.message);
  });
}

function triggerImportMission() {
  var input = document.getElementById('import-mission-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.id = 'import-mission-input';
    input.onchange = handleImportMission;
    document.body.appendChild(input);
  }
  input.value = '';
  input.click();
}

function handleImportMission(event) {
  var file = event.target ? event.target.files[0] : null;
  if (!file) return;
  if (!file.name.endsWith('.json')) { alert('Veuillez sélectionner un fichier .json'); return; }
  var reader = new FileReader();
  reader.onload = function (e) { importMissionFromText(e.target.result); };
  reader.readAsText(file);
}

// Détecte le format d'un JSON importé (enveloppe AERATION_Mission_JSON ou mission brute), utilisé
// aussi bien par le transfert de mission (reprise à l'identique) que par le chargement d'un site
// précédent pour préremplissage N-1 (reprise de structure seulement, cf. importPreviousSiteFromText).
function extractMissionFromImportData(data) {
  if (data._format === 'AERATION_Mission_JSON' && data.mission) return data.mission;
  if (data.id && data.installations) return data;
  return null;
}

function importMissionFromText(text) {
  try {
    var data = JSON.parse(text);
    var mission = extractMissionFromImportData(data);
    if (!mission) { alert('Format non reconnu.\n\nAssurez-vous d’importer une mission Contrôle Aération.'); return; }

    // compléter les types manquants (si le schéma a évolué depuis l'export)
    INSTALLATION_TYPES.forEach(function (t) {
      if (!mission.installations[t.id]) mission.installations[t.id] = [];
    });
    normalizeMission(mission);

    // Chantier "photos par installation" : les photos voyagent en base64 À CÔTÉ de la référence
    // dans le JSON exporté (resolveMissionPhotosForExport, js/photos.js) — on les réécrit vers
    // IndexedDB puis on ne garde que la référence légère {id}, jamais la photo elle-même dans la
    // mission tenue en mémoire/localStorage après import.
    restoreMissionPhotosFromImport(mission).then(function () {
      var existing = state.missions.find(function (m) { return m.id === mission.id; });
      if (existing) {
        // Conflit d'id : jamais de fusion silencieuse — l'utilisateur choisit explicitement
        // (écraser / garder les deux / annuler) sur un écran dédié, cf. renderImportConflict.
        state.pendingImport = { incoming: mission, existing: existing };
        state.view = 'import-conflict';
        render();
        return;
      }
      finishImportMission(mission);
    }).catch(function (err) {
      alert('Erreur lors de l’import (photos) :\n\n' + err.message);
    });
  } catch (err) {
    alert('Erreur lors de l’import :\n\n' + err.message);
  }
}

function finishImportMission(mission) {
  state.missions.push(mission);
  persistMissions();
  render();
  var total = 0;
  Object.keys(mission.installations).forEach(function (k) { total += mission.installations[k].length; });
  alert('Mission importée avec succès !\n\n' + (mission.clientSite || 'Sans nom') + '\n' + total + ' installation(s)');
}

function resolveImportConflict(action) {
  var pending = state.pendingImport;
  if (!pending) return;
  state.pendingImport = null;

  if (action === 'cancel') {
    // restoreMissionPhotosFromImport (appelé avant l'affichage de cet écran, dans
    // importMissionFromText) a déjà écrit les photos de la mission entrante dans IndexedDB —
    // annuler l'import doit aussi les libérer, sinon elles restent orphelines indéfiniment
    // (audit du 2026-09-18).
    if (typeof deleteMissionPhotoBlobs === 'function') deleteMissionPhotoBlobs(pending.incoming);
    state.view = 'home';
    render();
    return;
  }

  if (action === 'overwrite') {
    // Même raison : les photos de l'ancienne version écrasée doivent être libérées, pas seulement
    // conservées orphelines dans IndexedDB.
    // Retirée de state.missions d'abord : deleteMissionPhotoBlobs épargne tout id encore référencé.
    state.missions = state.missions.filter(function (m) { return m.id !== pending.existing.id; });
    if (typeof deleteMissionPhotoBlobs === 'function') deleteMissionPhotoBlobs(pending.existing, [pending.incoming]);
    finishImportMission(pending.incoming);
    return;
  }

  if (action === 'merge') {
    // Travail à plusieurs (js/fusion.js) : les installations de l'autre appareil sont ajoutées, la
    // version la plus récente gardée quand une installation existe des deux côtés.
    applyMerge(pending.existing, pending.incoming);
    return;
  }

  if (action === 'keep-both') {
    pending.incoming.id = generateId();
    pending.incoming.clientSite = (pending.incoming.clientSite || 'Sans nom') + ' (copie importée)';
    // Régénère aussi les id des installations (pas seulement celui de la mission) : sans ça, une
    // installation de la copie partage le même id qu'une installation de la mission déjà présente,
    // ce qui peut provoquer une collision dans un cache indexé par id (ex. l'étape en cours du
    // wizard sanitaires, js/wizard-sanitaires.js) si les deux sont ouvertes dans la même session
    // (audit du 2026-09-18).
    Object.keys(pending.incoming.installations || {}).forEach(function (typeId) {
      pending.incoming.installations[typeId].forEach(function (inst) { inst.id = generateId(); });
    });
    finishImportMission(pending.incoming);
    return;
  }
}

// ————————————————————————————————————————————
// Charger un site précédent pour préremplissage N-1 — usage distinct du transfert de mission
// ci-dessus : on ne reprend PAS la mission à l'identique (pas de conflit d'id possible, une mission
// neuve est toujours créée), seulement sa structure (bâtiments, installations, noms, emplacements)
// avec les mesures vierges et les champs N-1 des 4 types identifiés (js/installations-schema.js
// N1_COMPARISON_FIELDS) préremplis depuis les valeurs mesurées de la mission source. Construction de
// la mission déléguée à createMissionFromPreviousSite (js/state.js).
// ————————————————————————————————————————————

function triggerImportPreviousSite() {
  var input = document.getElementById('import-previous-site-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.id = 'import-previous-site-input';
    input.onchange = handleImportPreviousSite;
    document.body.appendChild(input);
  }
  input.value = '';
  input.click();
}

function handleImportPreviousSite(event) {
  var file = event.target ? event.target.files[0] : null;
  if (!file) return;
  if (!file.name.endsWith('.json')) { alert('Veuillez sélectionner un fichier .json'); return; }
  var reader = new FileReader();
  reader.onload = function (e) { importPreviousSiteFromText(e.target.result); };
  reader.readAsText(file);
}

function importPreviousSiteFromText(text) {
  try {
    var data = JSON.parse(text);
    var source = extractMissionFromImportData(data);
    if (!source) { alert('Format non reconnu.\n\nAssurez-vous d’importer un fichier de mission Contrôle Aération.'); return; }
    INSTALLATION_TYPES.forEach(function (t) {
      if (!source.installations[t.id]) source.installations[t.id] = [];
    });

    // Pas de restoreMissionPhotosFromImport ici (contrairement à importMissionFromText) :
    // createMissionFromPreviousSite exclut déjà les champs photo de la reprise de structure (une
    // photo est propre à une visite précise, jamais une référence à reconduire d'un site à
    // l'autre). Seules les images des plans du site sont reprises : le plan, lui, ne change pas.
    var restorePlans = Promise.all([
      (typeof planImagesFromImport === 'function') ? planImagesFromImport(source) : null,
      (typeof docsImagesFromImport === 'function') ? docsImagesFromImport(source) : null // documents joints, schémas
    ]);
    restorePlans.then(function () { finishImportPreviousSite(source); })
      .catch(function (err) { alert('Erreur lors du chargement :\n\n' + err.message); });
  } catch (err) {
    alert('Erreur lors du chargement :\n\n' + err.message);
  }
}

function finishImportPreviousSite(source) {
  try {
    var m = createMissionFromPreviousSite(source);
    state.missions.push(m);
    persistMissions();
    state.currentMissionId = m.id;
    state.view = 'mission-form';
    render();

    var total = 0;
    Object.keys(m.installations).forEach(function (k) { total += m.installations[k].length; });
    alert('Structure du site reprise avec succès !\n\n' + (m.clientSite || 'Sans nom') + '\n' + total +
      ' installation(s) — mesures vierges, valeurs N-1 préremplies quand disponibles.');
  } catch (err) {
    alert('Erreur lors du chargement :\n\n' + err.message);
  }
}

// ————————————————————————————————————————————
// Importer un fichier Rapso V29 rempli (.xlsb/.xlsx) — même finalité que "Charger un site précédent"
// (préremplir une mission neuve avec les données non-mesure d'un site déjà suivi), mais depuis
// l'ancien outil Excel/VBA plutôt que depuis un export JSON de cette app. Pensé pour la phase
// d'adoption : une équipe qui a déjà des sites dans Rapso ne doit pas avoir à tout ressaisir pour
// commencer à utiliser l'app. js/rapso-import.js fait la traduction classeur → objet "source" au
// même format qu'une mission ; le reste du pipeline (createMissionFromPreviousSite, js/state.js) est
// rigoureusement le même que pour le préremplissage N-1 — mêmes garanties de sécurité (jamais une
// mesure, toujours vérifié par le technicien).
// ————————————————————————————————————————————

function triggerImportRapso() {
  ensureLib('xlsx').catch(function () {}); // préchargement pendant que le technicien choisit son fichier
  var input = document.getElementById('import-rapso-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsb,.xlsx,.xls';
    input.style.display = 'none';
    input.id = 'import-rapso-input';
    input.onchange = handleImportRapso;
    document.body.appendChild(input);
  }
  input.value = '';
  input.click();
}

function handleImportRapso(event) {
  var file = event.target ? event.target.files[0] : null;
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) { importRapsoFromArrayBuffer(e.target.result, file.name); };
  reader.onerror = function () { alert('Erreur de lecture du fichier.'); };
  reader.readAsArrayBuffer(file);
}

function importRapsoFromArrayBuffer(buf, fileName) {
  ensureLib('xlsx').then(function () { importRapsoLoaded(buf, fileName); })
    .catch(function (err) { alert('Erreur lors de la lecture du fichier Rapso :\n\n' + err.message); });
}

function importRapsoLoaded(buf, fileName) {
  try {
    var workbook = XLSX.read(buf, { type: 'array' });
    var result = rapsoWorkbookToSourceMission(workbook, { clientSite: fileName.replace(/\.(xlsb|xlsx|xls)$/i, '') });
    var totalFound = 0;
    Object.keys(result.typesFound).forEach(function (k) { totalFound += result.typesFound[k]; });
    if (totalFound === 0) {
      alert('Aucune donnée reconnue dans ce fichier.\n\nVérifiez qu’il s’agit bien d’un classeur Rapso Aération (V27/V29) rempli.');
      return;
    }

    var m = createMissionFromPreviousSite(result.source);
    state.missions.push(m);
    persistMissions();
    state.currentMissionId = m.id;
    state.view = 'mission-form';
    render();

    var total = 0;
    Object.keys(m.installations).forEach(function (k) { total += m.installations[k].length; });
    var detail = Object.keys(result.typesFound).map(function (t) {
      var label = (getInstallationType(t) || {}).label || t;
      return '- ' + label + ' : ' + result.typesFound[t];
    }).join('\n');
    var warn = result.typesNonVerifies.length
      ? '\n\n⚠️ Types repérés mais jamais confirmés sur un vrai fichier Rapso, à vérifier avec plus d’attention : ' +
        result.typesNonVerifies.map(function (t) { return (getInstallationType(t) || {}).label || t; }).join(', ')
      : '';
    alert('Fichier Rapso importé avec succès !\n\n' + (m.clientSite || 'Sans nom') + '\n' + total +
      ' installation(s) reprise(s) — mesures vierges, données à vérifier avant contrôle :\n\n' + detail + warn);
  } catch (err) {
    alert('Erreur lors de la lecture du fichier Rapso :\n\n' + err.message);
  }
}

// ————————————————————————————————————————————
// Mission de démonstration (présentation de l'appli, formation) : site FICTIF « INDUSTRIE EXEMPLE »,
// 23 installations sur 13 types avec des mesures réalistes (reprises de missions réelles, tout texte
// identifiant remplacé), plus un bureau identifié mais non mesuré pour montrer la saisie en direct.
// Chargée comme une mission neuve à chaque fois (nouveaux id) : on peut la modifier, la supprimer et
// la recharger sans conflit. Fichier embarqué dans le cache hors ligne (sw.js).
// ————————————————————————————————————————————
var DEMO_MISSION_PATH = 'assets/demo/mission-demo.json';

function loadDemoMission() {
  fetch(DEMO_MISSION_PATH).then(function (r) {
    if (!r.ok) throw new Error('fichier de démonstration introuvable (' + r.status + ')');
    return r.json();
  }).then(function (data) {
    var m = extractMissionFromImportData(data);
    if (!m) throw new Error('format non reconnu');
    m.id = generateId();
    m.createdAt = new Date().toISOString();
    var idMap = {};
    INSTALLATION_TYPES.forEach(function (t) {
      if (!m.installations[t.id]) m.installations[t.id] = [];
      m.installations[t.id].forEach(function (inst) { var nid = generateId(); idMap[inst.id] = nid; inst.id = nid; });
    });
    // Rattachements du schéma de réseau de la démo remis sur les nouveaux identifiants
    if (typeof docsReprendrePourVisiteSuivante === 'function') docsReprendrePourVisiteSuivante(m, JSON.parse(JSON.stringify(m)), idMap);
    normalizeMission(m);
    return addDemoPhotos(m).then(function () {
      state.missions.push(m);
      persistMissions();
      state.currentMissionId = m.id;
      state.view = 'mission-detail';
      render();
    });
  }).catch(function (err) {
    alert('Impossible de charger la mission de démonstration :\n\n' + err.message);
  });
}

// Photos de démonstration : une image neutre, clairement marquée « Photo de démonstration », avec le
// pictogramme du type et le nom de l'installation. Les images des pages intercalaires restent réservées
// à la présentation du rapport (retour de Quentin du 2026-10-04 : les réutiliser comme photos
// d'installation brouillait les deux). En cas d'échec (hors ligne, quota), la démo se charge sans photo.
var DEMO_PHOTO_W = 1200, DEMO_PHOTO_H = 900;

function demoPhotoBlob(type, inst) {
  return new Promise(function (resolve, reject) {
    var canvas = document.createElement('canvas');
    canvas.width = DEMO_PHOTO_W; canvas.height = DEMO_PHOTO_H;
    var ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('canvas indisponible')); return; }
    ctx.fillStyle = '#e9eef3'; ctx.fillRect(0, 0, DEMO_PHOTO_W, DEMO_PHOTO_H);
    ctx.strokeStyle = '#b8c4d0'; ctx.lineWidth = 6; ctx.setLineDash([24, 16]);
    ctx.strokeRect(30, 30, DEMO_PHOTO_W - 60, DEMO_PHOTO_H - 60);
    var title = overviewRowTitle({ type: type, inst: inst, idx: 0 }, 'batiment');
    var finish = function () {
      ctx.fillStyle = '#3d4a58'; ctx.textAlign = 'center';
      ctx.font = 'bold 56px Arial, sans-serif';
      ctx.fillText('Photo de démonstration', DEMO_PHOTO_W / 2, 600);
      ctx.font = '40px Arial, sans-serif'; ctx.fillStyle = '#5a6878';
      ctx.fillText(String(type.label).slice(0, 48), DEMO_PHOTO_W / 2, 670);
      ctx.fillText(String(title).slice(0, 48), DEMO_PHOTO_W / 2, 730);
      canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('image non générée')); }, 'image/jpeg', 0.8);
    };
    // Pictogramme du type (js/pictos.js), dessiné en grand au-dessus du texte
    var svg = (typeof getIcon === 'function') ? getIcon(type.icon) : '';
    if (!svg) { finish(); return; }
    var img = new Image();
    img.onload = function () { ctx.drawImage(img, DEMO_PHOTO_W / 2 - 150, 170, 300, 300); finish(); };
    img.onerror = finish;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('stroke="currentColor"', 'stroke="#7a8796"').replace('<svg ', '<svg width="300" height="300" '));
  });
}

function addDemoPhotos(m) {
  var jobs = [];
  forEachInstallationPhotoField(m, function (inst, typeId) {
    if (!hasRealInstallationData(inst.data) || (Array.isArray(inst.data.photo) && inst.data.photo.length)) return;
    var type = getInstallationType(typeId);
    if (!type) return;
    jobs.push(demoPhotoBlob(type, inst).then(function (blob) {
      var id = generatePhotoId();
      return savePhotoBlob(id, blob).then(function () { inst.data.photo = [{ id: id }]; });
    }).catch(function () {}));
  });
  return Promise.all(jobs);
}

function renderImportConflict() {
  var pending = state.pendingImport;
  if (!pending) { state.view = 'home'; render(); return ''; }
  var existing = pending.existing, incoming = pending.incoming;

  function countInst(m) {
    var total = 0;
    Object.keys(m.installations || {}).forEach(function (k) { total += (m.installations[k] || []).length; });
    return total;
  }
  function summaryCard(title, m) {
    var dateStr = m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : '';
    return '<div class="card"><div class="section-title">' + escapeHtml(title) + '</div>' +
      '<div style="font-weight:600;">' + escapeHtml(m.clientSite || 'Sans nom') + '</div>' +
      '<div class="subtitle">' + countInst(m) + ' installation(s)' + (dateStr ? ' · créée le ' + escapeHtml(dateStr) : '') + '</div></div>';
  }

  var h = '<div class="card"><h1>' + ICONS.upload + ' Mission déjà présente</h1>' +
    '<p class="subtitle">Une mission avec le même identifiant existe déjà sur cet appareil. Que veux-tu faire ?</p></div>';
  h += summaryCard('Mission actuelle sur cet appareil', existing);
  h += summaryCard('Mission à importer', incoming);
  h += '<button class="btn btn-primary" onclick="resolveImportConflict(\'merge\');">' + ICONS.merge + ' Fusionner (travail à plusieurs)</button>';
  h += '<p class="subtitle" style="margin:-2px 4px 10px;">Ajoute les installations saisies sur l’autre appareil ; si une installation a été modifiée des deux côtés, la version la plus récente est gardée.</p>';
  h += '<button class="btn btn-gray" onclick="resolveImportConflict(\'overwrite\');">' + ICONS.check + ' Écraser la mission existante</button>';
  h += '<button class="btn btn-gray" onclick="resolveImportConflict(\'keep-both\');">' + ICONS.copy + ' Garder les deux (créer une copie)</button>';
  h += '<button class="btn btn-gray" onclick="resolveImportConflict(\'cancel\');">Annuler</button>';
  return h;
}

console.log('✓ Import/Export chargé');
