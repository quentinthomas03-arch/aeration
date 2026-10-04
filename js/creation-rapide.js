// creation-rapide.js - Créer une installation sans quitter le schéma de réseau ou le plan du site
// (chantier du 2026-10-04)
//
// Sur place, le technicien découvre une machine ou une hotte qui n'est pas encore dans la mission :
// depuis le schéma (outil « Installation ») ou le plan (placement), « Nouvelle installation » demande
// juste le type, le nom et le bâtiment, crée l'installation (statut « À faire », à renseigner ensuite
// comme les autres) et la propose aussitôt au placement.

// Champ qui porte le nom d'une installation selon son type (même ordre que overviewRowTitle)
function creationChampNom(type) {
  var keys = (typeof OVERVIEW_TITLE_KEYS !== 'undefined') ? OVERVIEW_TITLE_KEYS : [];
  for (var i = 0; i < keys.length; i++) {
    if (type.fields.some(function (f) { return f.key === keys[i]; })) return keys[i];
  }
  var f = type.fields.filter(function (x) { return x.type === 'text' && x.key !== 'batiment' && !/date/.test(x.key); })[0];
  return f ? f.key : null;
}

function creationBatiments(m) {
  var vus = {};
  Object.keys(m.installations || {}).forEach(function (t) {
    (m.installations[t] || []).forEach(function (inst) { var b = inst.data && inst.data.batiment; if (b) vus[String(b).trim()] = true; });
  });
  return Object.keys(vus).sort();
}

// Bloc « Nouvelle installation » : bouton, ou formulaire compact une fois ouvert.
// ctx = 'schema' | 'plan' ; typeIds = types proposés
function creationRapideHtml(m, ctx, typeIds) {
  var types = INSTALLATION_TYPES.filter(function (t) { return typeIds.indexOf(t.id) !== -1 && t.implemented !== false; });
  if (!types.length) return '';
  if (state.creationRapide !== ctx) {
    return '<button type="button" class="btn btn-gray btn-small creation-rapide-btn" onclick="state.creationRapide=\'' + ctx + '\';render();">' + ICONS.plus + ' Nouvelle installation (pas encore dans la mission)</button>';
  }
  var h = '<div class="creation-rapide"><div class="label">Nouvelle installation</div>';
  if (types.length > 1) {
    h += '<select class="input" id="cr-type">';
    types.forEach(function (t) { h += '<option value="' + t.id + '"' + (t.id === state.creationType ? ' selected' : '') + '>' + escapeHtml(t.label) + '</option>'; });
    h += '</select>';
  } else h += '<input type="hidden" id="cr-type" value="' + types[0].id + '"><div class="subtitle">' + escapeHtml(types[0].label) + '</div>';
  h += '<input type="text" class="input" id="cr-nom" maxlength="60" placeholder="Nom (ex. Hotte H4, Raboteuse…)">';
  h += '<input type="text" class="input" id="cr-bat" maxlength="60" list="cr-bats" placeholder="Bâtiment" value="' + escapeHtml(state.creationBat || '') + '">';
  h += '<datalist id="cr-bats">' + creationBatiments(m).map(function (b) { return '<option value="' + escapeHtml(b) + '">'; }).join('') + '</datalist>';
  h += '<div class="row"><button type="button" class="btn btn-gray btn-small" onclick="state.creationRapide=null;render();">Annuler</button>' +
    '<button type="button" class="btn btn-primary btn-small" onclick="creationRapideValider(\'' + ctx + '\');">' + ICONS.check + ' Créer et placer</button></div>';
  return h + '</div>';
}

function creationRapideValider(ctx) {
  var m = getCurrentMission();
  var typeId = (document.getElementById('cr-type') || {}).value;
  var nom = String((document.getElementById('cr-nom') || {}).value || '').trim().slice(0, 60);
  var bat = String((document.getElementById('cr-bat') || {}).value || '').trim().slice(0, 60);
  var type = typeId && getInstallationType(typeId);
  if (!m || !type) return;
  if (!nom) { alert('Donnez un nom à l’installation (ex. « Hotte H4 »), pour la retrouver dans la mission.'); return; }
  var key = creationRapideCreer(m, type, nom, bat);
  state.creationRapide = null;
  state.creationType = typeId;
  state.creationBat = bat;
  if (ctx === 'schema') state.schemaInstCible = key;
  else if (ctx === 'plan' && state.planPlacement) state.planPlacement.key = key;
  render();
}

// Crée l'installation et renvoie sa clé « typeId:index »
function creationRapideCreer(m, type, nom, bat) {
  var data = {}, champ = creationChampNom(type);
  if (champ) data[champ] = nom;
  if (bat && type.fields.some(function (f) { return f.key === 'batiment'; })) data.batiment = bat;
  if (!m.installations[type.id]) m.installations[type.id] = [];
  var inst = { id: generateId(), data: data };
  m.installations[type.id].push(inst);
  if ((m.typesSelectionnes || []).indexOf(type.id) === -1) m.typesSelectionnes = (m.typesSelectionnes || []).concat([type.id]);
  if (typeof touchInstallation === 'function') touchInstallation(inst);
  persistMissions();
  return type.id + ':' + (m.installations[type.id].length - 1);
}

console.log('✓ Création rapide d’installation chargée');
