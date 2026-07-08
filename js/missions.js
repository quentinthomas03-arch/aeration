// missions.js - Écran d'accueil, création de mission et formulaire "Entrées"

function renderHome() {
  var h = '<div class="card"><h1>' + ICONS.zap + ' Contrôle Aération</h1><p class="subtitle">' + state.missions.length + ' mission(s)</p></div>';
  h += '<button class="btn btn-primary" onclick="createMission();">' + ICONS.plus + ' Nouvelle mission</button>';
  h += '<button class="btn btn-gray" onclick="triggerImportMission();" style="margin-top:8px;">' + ICONS.upload + ' Importer une mission (.json)</button>';
  h += '<button class="btn btn-gray" onclick="state.view=\'profil-technicien\';render();" style="margin-top:8px;">' + ICONS.user + ' Mon profil technicien</button>';

  if (state.missions.length === 0) {
    h += '<div class="empty-state"><div class="empty-state-icon">' + ICONS.empty + '</div><p>Aucune mission pour l\u2019instant</p></div>';
  }

  state.missions.slice().reverse().forEach(function (m) {
    var totalInst = 0;
    Object.keys(m.installations || {}).forEach(function (k) { totalInst += m.installations[k].length; });
    var incomplete = !m.typesSelectionnes || m.typesSelectionnes.length === 0;
    var targetView = incomplete ? 'mission-form' : 'mission-detail';
    h += '<div class="nav-item" onclick="state.currentMissionId=' + m.id + ';state.view=\'' + targetView + '\';render();">';
    h += '<div class="nav-icon">' + ICONS.building + '</div>';
    h += '<div style="flex:1;"><div style="font-weight:600;">' + escapeHtml(m.clientSite || 'Sans nom') + '</div>';
    h += '<div class="subtitle">' + (incomplete ? 'À compléter (Entrées)' : (totalInst + ' installation(s) renseignée(s)')) + '</div></div>';
    h += '<button class="agent-delete" onclick="event.stopPropagation();deleteMission(' + m.id + ');">' + ICONS.trash + '</button>';
    h += '</div>';
  });

  return h;
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
  state.missions = state.missions.filter(function (m) { return m.id !== id; });
  persistMissions();
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
  var isNew = !m.typesSelectionnes || m.typesSelectionnes.length === 0;

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
    { key: 'dateRapport', label: 'Date du rapport' }
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
    h += '<input type="text" class="input" value="' + escapeHtml(val) + '" onchange="updateMissionField(\'' + section + '\',\'' + f.key + '\',this.value);">';
    h += '</div>';
  });
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
