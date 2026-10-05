// missions.js - Écran d'accueil, création de mission et formulaire "Entrées"

function renderHome() {
  var h = '<div class="card"><h1>' + ICONS.zap + ' Contrôle Aération</h1><p class="subtitle">' + state.missions.length + ' mission(s)</p>' +
    renderStorageIndicatorPlaceholder() +
    (typeof renderAutoBackupFolderIndicator === 'function' ? renderAutoBackupFolderIndicator() : '') +
    (typeof renderAutoBackupIndicator === 'function' ? renderAutoBackupIndicator() : '') + '</div>';
  if (typeof renderNouveautesCard === 'function') h += renderNouveautesCard();
  h += '<button class="btn btn-primary" onclick="createMission();">' + ICONS.plus + ' Nouvelle mission</button>';
  h += '<button class="btn btn-gray" onclick="triggerImportMission();" style="margin-top:8px;">' + ICONS.upload + ' Reprendre une mission en cours (.json)</button>';

  // Regroupées sous une même carte : 2 façons de repartir d'un site déjà connu, différenciées par la
  // seule couleur du trait de l'icône (pas de badge — trop "app générée par IA", retour utilisateur du
  // 19/09/2026) ; la magenta de la charte, jusqu'ici inutilisée dans l'appli, sert ici de 2e accent.
  h += '<div class="section-title" style="margin-top:16px;">Reprendre un site existant</div>';
  h += '<div class="card home-action-group">';
  h += '<button type="button" class="home-action-row" onclick="triggerImportPreviousSite();">' +
    '<span class="home-action-row-icon" style="color:var(--primary);">' + ICONS.download + '</span>' +
    '<div><div class="home-action-row-title">Charger un site précédent</div><div class="home-action-row-sub">Préremplissage N-1, mesures vierges</div></div></button>';
  h += '<button type="button" class="home-action-row" onclick="triggerImportRapso();">' +
    '<span class="home-action-row-icon" style="color:var(--accent-magenta);">' +
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></span>' +
    '<div><div class="home-action-row-title">Importer un fichier Rapso (V29)</div><div class="home-action-row-sub">Ancien classeur Excel rempli</div></div></button>';
  h += '</div>';

  if (state.missions.length === 0) {
    h += '<div class="empty-state"><div class="empty-state-icon">' + ICONS.empty + '</div><p>Aucune mission pour l\u2019instant</p>' +
      '<button class="btn btn-gray" style="margin-top:12px;" onclick="loadDemoMission();">' + ICONS.play + ' D\u00e9couvrir avec une mission de d\u00e9monstration</button></div>';
  } else {
    h += renderHomeMissions();
  }

  // Barre d'icônes discrète pour les réglages/ressources peu fréquents, au lieu de boutons gris pleine
  // largeur qui rivalisaient visuellement avec les missions et les actions ci-dessus.
  h += '<div class="home-tabbar">';
  h += '<button type="button" class="home-tab-btn" onclick="state.view=\'profil-technicien\';render();">' + ICONS.user + '<span>Profil</span></button>';
  h += '<button type="button" class="home-tab-btn" onclick="state.view=\'guide-utilisation\';render();">' + ICONS.play + '<span>Guide</span></button>';
  h += '<button type="button" class="home-tab-btn" onclick="state.view=\'ed-reference\';render();">' + ICONS.clipboard + '<span>Aide-mémoire</span></button>';
  h += '<button type="button" class="home-tab-btn" onclick="cycleTheme();">' + THEME_ICON + '<span>' + themeLabel() + '</span></button>';
  h += '<button type="button" class="home-tab-btn" onclick="state.view=\'a-propos\';render();">' + APROPOS_ICON + '<span>À propos</span></button>';
  if (typeof isFsaSupported === 'function' && isFsaSupported()) {
    h += '<button type="button" class="home-tab-btn" onclick="chooseAutoBackupFolder();">' + ICONS.folder + '<span>Sauvegarde</span></button>';
  }
  h += '</div>';

  return h;
}

// === Liste des missions de l'accueil : recherche, filtres, avancement (ergonomie du 2026-10-03) ===

var ARCHIVE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></svg>';
var HOME_FILTERS = [
  { key: 'actives', label: 'Toutes' }, { key: 'encours', label: 'En cours' },
  { key: 'terminees', label: 'Terminées' }, { key: 'archivees', label: 'Archivées' }
];

function missionIsSetup(m) {
  return (!m.typesSelectionnes || m.typesSelectionnes.length === 0) && !m._selectionDejaValidee;
}

function missionProgress(m) {
  if (missionIsSetup(m)) return { status: 'setup', done: 0, total: 0 };
  var items = overviewOrderedItems(m);
  var done = items.filter(function (it) { return it.status.state === 'done'; }).length;
  var status = m.archived ? 'archivee' : (items.length && done === items.length ? 'terminee' : 'encours');
  return { status: status, done: done, total: items.length };
}

// Date de la mission pour le tri : 1re date des dates d'intervention, sinon date de contrôle, sinon création
function missionSortDate(m) {
  var d = (typeof datesInText === 'function') ? datesInText((m.donneesInternes || {}).datesIntervention || m.dateControle) : [];
  if (d.length) return Math.min.apply(null, d.map(Number));
  var c = Date.parse(m.createdAt || '');
  return isNaN(c) ? 0 : c;
}

function missionMatchesFilter(m, p, filter) {
  if (filter === 'archivees') return !!m.archived;
  if (m.archived) return false;
  if (filter === 'encours') return p.status === 'encours' || p.status === 'setup';
  if (filter === 'terminees') return p.status === 'terminee';
  return true;
}

function missionHaystack(m) {
  var di = m.donneesInternes || {}, ic = m.infosClient || {}, si = m.infosSiteIntervention || {};
  return [m.clientSite, di.referenceOffre, ic.nomEntreprise, si.siteIntervention, si.ville, ic.ville, di.numeroAffaire, di.numeroChrono].join(' ').toLowerCase();
}

var _homeSearchDebounceId = null;
function setHomeSearch(v) {
  state.homeSearch = v;
  if (_homeSearchDebounceId) clearTimeout(_homeSearchDebounceId);
  _homeSearchDebounceId = setTimeout(function () {
    _homeSearchDebounceId = null;
    render();
    var input = document.getElementById('home-search-input');
    if (input) { input.focus(); var pos = input.value.length; input.setSelectionRange(pos, pos); }
  }, 150);
}

function setHomeFilter(k) { state.homeFilter = k; render(); }

function toggleArchiveMission(id) {
  var m = state.missions.find(function (x) { return x.id === id; });
  if (!m) return;
  m.archived = !m.archived;
  persistMissions();
  render();
}

function renderHomeMissions() {
  var filter = state.homeFilter || 'actives';
  var term = (state.homeSearch || '').trim().toLowerCase();
  var rows = state.missions.map(function (m) { return { m: m, p: missionProgress(m), date: missionSortDate(m) }; });
  var count = {};
  HOME_FILTERS.forEach(function (f) { count[f.key] = rows.filter(function (r) { return missionMatchesFilter(r.m, r.p, f.key); }).length; });

  var h = '<div class="section-title" style="margin-top:16px;">Missions</div>';
  if (state.missions.length >= 4) {
    h += '<div class="overview-search"><span class="overview-search-icon">' + ICONS.search + '</span>' +
      '<input type="text" id="home-search-input" class="input overview-search-input" placeholder="Rechercher (client, site, ville, n° d’affaire)" value="' +
      escapeHtml(state.homeSearch || '') + '" oninput="setHomeSearch(this.value);"></div>';
  }
  h += '<div class="home-filters">';
  HOME_FILTERS.forEach(function (f) {
    if (f.key === 'archivees' && !count.archivees) return;
    h += '<button type="button" class="home-filter' + (filter === f.key ? ' active' : '') + '" onclick="setHomeFilter(\'' + f.key + '\');">' +
      f.label + ' <span>' + count[f.key] + '</span></button>';
  });
  h += '</div>';

  var shown = rows.filter(function (r) { return missionMatchesFilter(r.m, r.p, filter) && (!term || missionHaystack(r.m).indexOf(term) !== -1); });
  shown.sort(function (a, b) { return b.date - a.date || (b.m.id - a.m.id); });
  if (!shown.length) {
    h += '<div class="empty-state"><p>' + (term ? 'Aucune mission ne correspond à « ' + escapeHtml(state.homeSearch) + ' ».' : 'Aucune mission dans cette catégorie.') + '</p></div>';
  }
  shown.forEach(function (r) {
    var m = r.m, p = r.p;
    var targetView = p.status === 'setup' ? 'mission-form' : 'mission-detail';
    var pct = p.total ? Math.round(100 * p.done / p.total) : 0;
    var dateTxt = r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '';
    var chip = { setup: ['À compléter', 'status-warn'], encours: ['En cours', 'status-warn'], terminee: ['Terminée', 'status-ok'], archivee: ['Archivée', 'status-muted'] }[p.status];
    h += '<div class="nav-item mission-card" onclick="state.currentMissionId=' + m.id + ';state.view=\'' + targetView + '\';render();">';
    h += '<div class="nav-icon">' + ICONS.building + '</div>';
    h += '<div style="flex:1;min-width:0;"><div class="mission-card-title">' + escapeHtml(missionNom(m, 'Sans nom')) + '</div>';
    if (m.clientSite && missionNom(m) !== m.clientSite) h += '<div class="subtitle" style="font-weight:600;">' + escapeHtml(m.clientSite) + '</div>';
    h += '<div class="subtitle">' + (p.status === 'setup' ? 'Entrées à compléter' : p.done + '/' + p.total + ' installation(s) terminée(s)') + (dateTxt ? ' · ' + dateTxt : '') + '</div>';
    if (p.status !== 'setup') h += '<div class="mission-progress"><span style="width:' + pct + '%;"></span></div>';
    h += '<span class="appareil-badge ' + chip[1] + '" style="margin-top:6px;">' + chip[0] + '</span></div>';
    h += '<div class="mission-card-actions">';
    h += '<button class="mission-icon-btn" title="' + (m.archived ? 'Désarchiver' : 'Archiver') + '" aria-label="' + (m.archived ? 'Désarchiver' : 'Archiver') +
      '" onclick="event.stopPropagation();toggleArchiveMission(' + m.id + ');">' + ARCHIVE_ICON + '</button>';
    h += '<button class="agent-delete" aria-label="Supprimer" onclick="event.stopPropagation();deleteMission(' + m.id + ');">' + ICONS.trash + '</button>';
    h += '</div></div>';
  });
  return h;
}

// Nom affiché d'une mission (retour terrain du 2026-10-05) : la référence de l'offre, le nom du client
// passant en dessous ; à défaut, le nom du client
function missionNom(m, defaut) {
  var ref = String((m && m.donneesInternes && m.donneesInternes.referenceOffre) || '').trim();
  return ref || (m && m.clientSite) || defaut || 'Mission';
}

function createMission() {
  var m = createEmptyMission();
  state.missions.push(m);
  persistMissions();
  state.currentMissionId = m.id;
  state.view = 'mission-form';
  render();
}

function deleteMission(id) {
  if (!confirm('Supprimer cette mission et toutes ses installations ?')) return;
  var removed = state.missions.find(function (m) { return m.id === id; });
  state.missions = state.missions.filter(function (m) { return m.id !== id; });
  if (state.currentMissionId === id) state.currentMissionId = null;
  persistMissions();
  // Pas de "undo" ici (confirm() déjà demandé) : les photos peuvent être libérées immédiatement,
  // contrairement à deleteInstallation qui a une fenêtre d'annulation à respecter. Auparavant jamais
  // nettoyées, elles restaient orphelines dans IndexedDB indéfiniment (audit du 2026-09-18).
  if (removed && typeof deleteMissionPhotoBlobs === 'function') deleteMissionPhotoBlobs(removed);
  render();
}

function annulerNouvelleMission(id) {
  if (!confirm('Annuler la création de cette mission ? Les informations saisies seront perdues.')) return;
  state.missions = state.missions.filter(function (m) { return m.id !== id; });
  persistMissions();
  state.currentMissionId = null;
  state.view = 'home';
  render();
}

// ————————————————————————————————————————————
// Formulaire "Entrées" (informations de mission)
// ————————————————————————————————————————————

function renderMissionForm() {
  var m = getCurrentMission();
  if (!m) { state.view = 'home'; render(); return ''; }
  // Aligné sur selection-installations.js : une mission déjà validée (_selectionDejaValidee) ne doit
  // jamais redevenir "nouvelle" même si typesSelectionnes est temporairement vide (ex : changement de
  // type de mission qui purge la sélection) — sinon le bouton "Retour" devient "Annuler" et supprime
  // toute la mission (et ses installations déjà saisies) au lieu de revenir simplement en arrière.
  var isNew = (!m.typesSelectionnes || m.typesSelectionnes.length === 0) && !m._selectionDejaValidee;

  var h = '<button class="back-btn" onclick="' +
    (isNew ? 'annulerNouvelleMission(' + m.id + ');' : 'state.view=\'mission-detail\';render();') +
    '">' + ICONS.arrowLeft + ' ' + (isNew ? 'Annuler' : 'Retour') + '</button>';

  h += '<div class="card"><h1>' + ICONS.building + ' Informations de mission</h1><p class="subtitle">Onglet Entrées — à remplir avant le début de la mission</p></div>';

  h += '<button class="btn btn-blue btn-small" onclick="utiliserMonProfil();">' + ICONS.user + ' Utiliser mon profil technicien</button>';

  h += renderMissionSection('Données internes', 'donneesInternes', m, [
    { key: 'numeroAffaire', label: 'Numéro d\u2019affaire' },
    { key: 'referenceOffre', label: 'Référence de l\u2019offre' },
    { key: 'numeroChrono', label: 'Numéro Chrono' },
    { key: 'auteurRapport', label: 'Auteur du rapport' },
    { key: 'telAuteur', label: 'Tel de l\u2019auteur' },
    { key: 'mailAgenceAuteur', label: 'Mail agence ou auteur' },
    { key: 'datesIntervention', label: 'Date(s) d\u2019intervention' },
    { key: 'dateRapport', label: 'Date du rapport' },
    { key: 'natureRevision', label: 'Nature de la révision' }
  ]);

  h += renderMissionSection('Informations sur le client', 'infosClient', m, [
    { key: 'nomEntreprise', label: 'Nom de l\u2019entreprise' },
    { key: 'nomDemandeur', label: 'Nom du demandeur' },
    { key: 'adresse', label: 'Adresse' },
    { key: 'codePostal', label: 'Code postal' },
    { key: 'ville', label: 'Ville' },
    { key: 'tel', label: 'Tel' }
  ]);

  h += renderMissionSection('Intervenant sur site', 'intervenantSite', m, [
    { key: 'intervenant', label: 'Intervenant' },
    { key: 'agenceAuteur', label: 'Agence de l\u2019auteur' },
    { key: 'adresseAgence', label: 'Adresse de l\u2019agence' },
    { key: 'codePostal', label: 'Code postal' },
    { key: 'ville', label: 'Ville' }
  ]);

  h += '<button class="btn btn-gray btn-small" onclick="dupliquerInfosClient();">' + ICONS.copy + ' Dupliquer infos client \u2192 site d\u2019intervention</button>';

  h += renderMissionSection('Informations sur le site d\u2019intervention', 'infosSiteIntervention', m, [
    { key: 'siteIntervention', label: 'Site d\u2019intervention' },
    { key: 'nomContact', label: 'Nom du contact principal' },
    { key: 'adresseSite', label: 'Adresse du site' },
    { key: 'codePostal', label: 'Code postal' },
    { key: 'ville', label: 'Ville' },
    { key: 'telContact', label: 'Tel du contact' },
    { key: 'portableContact', label: 'Portable du contact' },
    { key: 'mailContact', label: 'Mail du contact' }
  ]);

  h += renderAppareilsMissionSection(m);
  if (typeof renderDvrMissionOption === 'function') h += renderDvrMissionOption(m);
  h += renderDocumentsTransmisSection(m);
  if (typeof renderDocumentsJointsSection === 'function') h += renderDocumentsJointsSection(m);
  h += renderDescriptionLocauxSection(m);

  if (isNew) {
    h += '<button class="btn btn-primary" style="margin-top:14px;" onclick="state.view=\'select-installations\';render();">' + ICONS.arrowRight + ' Continuer : sélection des installations</button>';
  } else {
    h += '<button class="btn btn-primary" style="margin-top:14px;" onclick="state.view=\'mission-detail\';render();">' + ICONS.check + ' Enregistrer</button>';
  }

  return h;
}

function renderMissionSection(title, section, m, fields) {
  var h = '<div class="card"><div class="section-title">' + escapeHtml(title) + '</div>';
  fields.forEach(function (f) {
    var val = (m[section] && m[section][f.key]) || '';
    h += '<div class="field"><label class="label">' + escapeHtml(f.label) + '</label>';
    h += '<input ' + inputKindAttrs(f.key) + ' class="input" value="' + escapeHtml(val) + '" onchange="updateMissionField(\'' + section + '\',\'' + f.key + '\',this.value);">';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

// Onglet "Entrées" — Documents transmis à SOCOTEC (feuille "Info" du fichier d'origine)
function renderDocumentsTransmisSection(m) {
  var dt = m.documentsTransmis || { documents: [], notice: [], observations: '' };
  var h = '<div class="card"><div class="section-title">Documents transmis à SOCOTEC</div>';

  dt.documents.forEach(function (doc, i) {
    h += '<div class="field"><label class="label">' + escapeHtml(doc.label) + '</label>';
    h += '<div class="row" style="gap:8px;align-items:flex-start;">';
    h += '<select class="input" style="max-width:120px;" onchange="updateDocumentTransmis(' + i + ',\'transmis\',this.value);">';
    ['', 'Oui', 'Non'].forEach(function (opt) {
      h += '<option value="' + opt + '"' + (doc.transmis === opt ? ' selected' : '') + '>' + (opt || '—') + '</option>';
    });
    h += '</select>';
    h += '<input type="text" class="input" placeholder="Commentaire" value="' + escapeHtml(doc.commentaire) + '" onchange="updateDocumentTransmis(' + i + ',\'commentaire\',this.value);">';
    h += '</div></div>';
  });

  h += '<div class="section-title" style="margin-top:12px;">Notice d\u2019instruction et consignes d\u2019utilisation (article R.4222-21)</div>';
  dt.notice.forEach(function (n, i) {
    h += '<div class="field"><label class="label">' + escapeHtml(n.label) + '</label>';
    h += '<div class="row" style="gap:8px;align-items:flex-start;">';
    h += '<select class="input" style="max-width:150px;" onchange="updateNoticeInstruction(' + i + ',\'presence\',this.value);">';
    ['', 'Présence', 'Absence', 'Sans objet'].forEach(function (opt) {
      h += '<option value="' + opt + '"' + (n.presence === opt ? ' selected' : '') + '>' + (opt || '—') + '</option>';
    });
    h += '</select>';
    h += '<input type="text" class="input" placeholder="Commentaire" value="' + escapeHtml(n.commentaire) + '" onchange="updateNoticeInstruction(' + i + ',\'commentaire\',this.value);">';
    h += '</div></div>';
  });

  h += '<div class="field"><label class="label">Observations</label>';
  h += '<textarea class="input" rows="3" onchange="updateMissionField(\'documentsTransmis\',\'observations\',this.value);">' + escapeHtml(dt.observations) + '</textarea></div>';

  h += '</div>';
  return h;
}

function updateDocumentTransmis(index, key, value) {
  var m = getCurrentMission();
  if (!m || !m.documentsTransmis) return;
  m.documentsTransmis.documents[index][key] = value;
  persistMissions();
}

function updateNoticeInstruction(index, key, value) {
  var m = getCurrentMission();
  if (!m || !m.documentsTransmis) return;
  m.documentsTransmis.notice[index][key] = value;
  persistMissions();
}

// Onglet "Entrées" — Description générale des locaux
function renderDescriptionLocauxSection(m) {
  var dl = m.descriptionLocaux || { locauxExclus: '' };
  var h = '<div class="card"><div class="section-title">Description générale des locaux</div>';
  h += '<div class="field"><label class="label">Locaux exclus de la prestation (optionnel)</label>';
  h += '<textarea class="input" rows="2" onchange="updateMissionField(\'descriptionLocaux\',\'locauxExclus\',this.value);">' + escapeHtml(dl.locauxExclus) + '</textarea></div>';
  h += '</div>';
  return h;
}

function updateMissionField(section, key, value) {
  var m = getCurrentMission();
  if (!m) return;
  if (!m[section]) m[section] = {};
  m[section][key] = value;

  // Synchronisation des champs "legacy" utilisés par l'accueil et l'export Word/JSON
  if (section === 'infosClient' && key === 'nomEntreprise') m.clientSite = value;
  if (section === 'donneesInternes' && key === 'auteurRapport') m.controleur = value;
  if (section === 'donneesInternes' && key === 'dateRapport') m.dateControle = value;

  persistMissions();
}

function dupliquerInfosClient() {
  var m = getCurrentMission();
  if (!m) return;
  if (!m.infosSiteIntervention) m.infosSiteIntervention = {};
  m.infosSiteIntervention.adresseSite = (m.infosClient && m.infosClient.adresse) || '';
  m.infosSiteIntervention.codePostal = (m.infosClient && m.infosClient.codePostal) || '';
  m.infosSiteIntervention.ville = (m.infosClient && m.infosClient.ville) || '';
  persistMissions();
  render();
}

function utiliserMonProfil() {
  var p = getProfilTechnicien();
  if (!p) { alert('Aucun profil enregistré pour l\u2019instant.\nOuvre "Mon profil technicien" depuis l\u2019accueil pour le créer une première fois.'); return; }
  var m = getCurrentMission();
  if (!m) return;
  m.donneesInternes.auteurRapport = p.nom || '';
  m.donneesInternes.telAuteur = p.tel || '';
  m.donneesInternes.mailAgenceAuteur = p.mail || '';
  m.intervenantSite.agenceAuteur = p.agence || '';
  m.intervenantSite.adresseAgence = p.adresse || '';
  m.intervenantSite.codePostal = p.codePostal || '';
  m.intervenantSite.ville = p.ville || '';
  m.controleur = p.nom || '';
  persistMissions();
  render();
}

console.log('✓ Missions chargé');
