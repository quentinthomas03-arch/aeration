// aides-mesure.js - Aides au calcul sur site (2026-10-04)
//
//  - Débit bouche par bouche : dans un local (bureaux, ERP, local fumeurs), on saisit chaque bouche,
//    soit la vitesse lue au cône (débit = K du cône × vitesse), soit directement le débit ; l'appli
//    fait la somme dans le champ de débit et signale une bouche nettement plus faible que les autres
//    (bouche obstruée ou déréglée, à regarder sur place).
//    Saisie gardée dans inst.data._bouches = { cléDuChamp: ['1,2', '0,95', …] }, mode dans
//    inst.data._bouchesMode ('cone' ou 'debit'), K dans inst.data._coneK. Le dernier K saisi est
//    retenu sur l'appareil (c'est le cône du technicien) : AM_CONE_K_KEY.
//  - Diamètre d'après le tour du conduit : conduit contre un mur ou calorifugé, on mesure le tour au
//    mètre ruban ; diamètre = tour / π, moins deux fois l'épaisseur d'isolant s'il y en a.
//  - Données de la plaque (sous la photo de la plaque, js/plaque.js) : débit nominal et facteur K du
//    ventilateur. Débit mesuré en % du nominal ; débit d'après la pression lue sur la prise de mesure
//    du ventilateur : Q = K × √Δp. Gardées dans inst.data._nominal, _k, _kdp (reprises l'an prochain
//    pour _nominal et _k : c'est le même équipement).

// ————————————————————————————————————————————
// Débit bouche par bouche
// ————————————————————————————————————————————

var AM_BOUCHES = { bureaux: ['debit_total_mesure', 'debit_soufflage', 'debit_extraction'], erp: ['debit_total_mesure', 'debit_soufflage', 'debit_extraction'], locaux_fumeurs: ['debit_extraction'] };

function amFr(v, dec) {
  return (Math.round(v * Math.pow(10, dec || 0)) / Math.pow(10, dec || 0)).toString().replace('.', ',');
}

// Bouches nettement plus faibles que les autres : moins de la moitié de la médiane (3 bouches au moins)
function amBouchesFaibles(vals) {
  var nums = vals.map(num).filter(function (v) { return !isNaN(v); });
  if (nums.length < 3) return [];
  var tri = nums.slice().sort(function (a, b) { return a - b; }), mi = Math.floor(tri.length / 2);
  var med = tri.length % 2 ? tri[mi] : (tri[mi - 1] + tri[mi]) / 2, out = [];
  vals.forEach(function (v, i) { var n = num(v); if (!isNaN(n) && n < med / 2) out.push({ i: i, v: n, med: med }); });
  return out;
}

function amBouchesListe(inst, key) {
  return (inst.data._bouches && Array.isArray(inst.data._bouches[key])) ? inst.data._bouches[key] : null;
}

var AM_CONE_K_KEY = 'aeration_cone_k_v1';

function amConeKRetenu() {
  try { return localStorage.getItem(AM_CONE_K_KEY) || ''; } catch (e) { return ''; }
}

function amBouchesMode(inst) {
  return inst.data._bouchesMode === 'debit' ? 'debit' : 'cone';
}

// Débits des bouches (m³/h, NaN si vide) : K × vitesse au cône, ou débit saisi
function amBouchesDebits(inst, liste) {
  var cone = amBouchesMode(inst) === 'cone', k = num(inst.data._coneK);
  return liste.map(function (v) {
    var n = num(v);
    if (isNaN(n)) return NaN;
    return cone ? (k > 0 ? k * n : NaN) : n;
  });
}

// Recalcule le total d'un champ (et le nombre de bouches) puis enregistre et redessine
function amBouchesTotal(typeId, inst, key) {
  var liste = amBouchesListe(inst, key) || [];
  var debits = amBouchesDebits(inst, liste).filter(function (v) { return !isNaN(v); });
  if (key === 'debit_total_mesure' && debits.length && getInstallationType(typeId).fields.some(function (f) { return f.key === 'nombre_bouches'; })) inst.data.nombre_bouches = String(debits.length);
  return debits.length ? amFr(debits.reduce(function (a, b) { return a + b; }, 0), 0) : '';
}

function amBouchesMaj(typeId, key, liste, focusDernier) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  if (!inst.data._bouches || typeof inst.data._bouches !== 'object') inst.data._bouches = {};
  if (!inst.data._coneK && amConeKRetenu()) inst.data._coneK = amConeKRetenu();
  inst.data._bouches[key] = liste;
  updateInstallationField(typeId, key, amBouchesTotal(typeId, inst, key)); // somme, recalcul, rendu
  if (focusDernier) setTimeout(function () { var l = document.querySelectorAll('.am-bouche-input[data-k="' + key + '"]'); if (l.length) l[l.length - 1].focus(); }, 30);
}

// K du cône ou mode de saisie changé : tous les totaux de l'installation sont recalculés
function amBouchesReglage(typeId, quoi, v) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  if (quoi === 'k') {
    v = String(v).trim();
    inst.data._coneK = v;
    try { if (num(v) > 0) localStorage.setItem(AM_CONE_K_KEY, v); } catch (e) {}
  } else inst.data._bouchesMode = v;
  Object.keys(inst.data._bouches || {}).forEach(function (key) { inst.data[key] = amBouchesTotal(typeId, inst, key); });
  touchInstallation(inst);
  if (typeof applyCalculations === 'function') applyCalculations(typeId, inst);
  persistMissions(); render();
}

function amBoucheSaisie(typeId, key, i, v) {
  var inst = getCurrentInstallation(typeId), liste = (amBouchesListe(inst, key) || []).slice();
  liste[i] = String(v).trim();
  amBouchesMaj(typeId, key, liste, false);
}

function amBoucheAjouter(typeId, key) {
  var inst = getCurrentInstallation(typeId), liste = (amBouchesListe(inst, key) || []).slice();
  liste.push('');
  amBouchesMaj(typeId, key, liste, true);
}

function amBoucheRetirer(typeId, key, i) {
  var inst = getCurrentInstallation(typeId), liste = (amBouchesListe(inst, key) || []).slice();
  liste.splice(i, 1);
  amBouchesMaj(typeId, key, liste, false);
}

function amBouchesHtml(typeId, f, inst) {
  var liste = amBouchesListe(inst, f.key);
  if (!liste) {
    return '<button type="button" class="today-btn" onclick="amBoucheAjouter(\'' + typeId + '\',\'' + f.key + '\');">Mesurer au cône, bouche par bouche</button>';
  }
  var cone = amBouchesMode(inst) === 'cone', k = num(inst.data._coneK);
  var debits = amBouchesDebits(inst, liste), faibles = amBouchesFaibles(debits.map(function (v) { return isNaN(v) ? '' : String(v); }));
  var h = '<div class="am-bouches"><div class="am-mode">' +
    '<button type="button" class="cm-chip' + (cone ? ' actif' : '') + '" onclick="amBouchesReglage(\'' + typeId + '\',\'mode\',\'cone\');">Vitesse au cône</button>' +
    '<button type="button" class="cm-chip' + (cone ? '' : ' actif') + '" onclick="amBouchesReglage(\'' + typeId + '\',\'mode\',\'debit\');">Débit direct</button></div>';
  if (cone) {
    h += '<label class="am-plaque-champ"><span>Coefficient K du cône</span><span class="calc-saisie"><input type="text" inputmode="decimal" class="input" value="' + escapeHtml(inst.data._coneK || '') + '" placeholder="ex. 36" onchange="amBouchesReglage(\'' + typeId + '\',\'k\',this.value);"><em>m³/h par m/s</em></span></label>';
    if (!(k > 0)) h += '<div class="am-alerte">Saisissez le coefficient K de votre cône (sur le cône ou sa notice) : débit = K × vitesse.</div>';
  }
  liste.forEach(function (v, i) {
    var faible = faibles.some(function (x) { return x.i === i; });
    h += '<div class="am-bouche' + (faible ? ' faible' : '') + '"><span>Bouche ' + (i + 1) + '</span>' +
      '<input type="text" inputmode="decimal" class="input am-bouche-input" data-k="' + f.key + '" value="' + escapeHtml(v) + '" placeholder="' + (cone ? 'm/s' : 'm³/h') + '" onchange="amBoucheSaisie(\'' + typeId + '\',\'' + f.key + '\',' + i + ',this.value);">' +
      '<button type="button" class="am-retirer" aria-label="Retirer la bouche ' + (i + 1) + '" onclick="amBoucheRetirer(\'' + typeId + '\',\'' + f.key + '\',' + i + ');">✕</button>' +
      (cone && !isNaN(debits[i]) ? '<span class="am-debit">= ' + amFr(debits[i]) + ' m³/h</span>' : '') + '</div>';
  });
  h += '<button type="button" class="btn btn-gray btn-small" onclick="amBoucheAjouter(\'' + typeId + '\',\'' + f.key + '\');">' + ICONS.plus + ' Bouche suivante</button>';
  faibles.forEach(function (x) {
    h += '<div class="am-alerte">Bouche ' + (x.i + 1) + ' : ' + amFr(x.v) + ' m³/h, moins de la moitié des autres (médiane ' + amFr(x.med) + ' m³/h). Bouche obstruée, fermée ou déréglée ? À regarder avant de partir.</div>';
  });
  return h + '<div class="cm-src">Le débit ci-dessus est la somme des bouches' + (cone ? ' (K × vitesse de chaque bouche)' : '') + '.</div></div>';
}

// ————————————————————————————————————————————
// Diamètre d'après le tour du conduit
// ————————————————————————————————————————————

function amEstRond(f, inst) {
  var prefixe = f.key.replace(/(diametre_cote1|diametre_conduit)$/, '');
  var forme = inst.data[prefixe + 'forme_section'] || inst.data[prefixe + 'forme_conduit'] || '';
  return forme !== 'Rectangulaire';
}

function amDiametreDepuisTour(tour, isolant) {
  return tour / Math.PI - 2 * (isolant || 0);
}

function amTourConduit(typeId, key) {
  var t = prompt('Tour du conduit (cm), mesuré au mètre ruban :', '');
  if (t === null) return;
  var tour = num(t);
  if (isNaN(tour) || tour <= 0) { alert('Tour non reconnu.'); return; }
  var e = prompt('Épaisseur de l’isolant (cm), 0 si le conduit est nu :', '0');
  if (e === null) return;
  var d = amDiametreDepuisTour(tour, num(e) || 0);
  if (!(d > 0)) { alert('Épaisseur d’isolant trop grande pour ce tour.'); return; }
  gwField(typeId, key, amFr(d, 1));
}

// ————————————————————————————————————————————
// Point d'entrée sous un champ numérique (js/wizard-engine.js, gwBigNumber)
// ————————————————————————————————————————————

function aidesMesureHtml(typeId, f, inst) {
  if (AM_BOUCHES[typeId] && AM_BOUCHES[typeId].indexOf(f.key) !== -1) return amBouchesHtml(typeId, f, inst);
  if (/(^|_)diametre_cote1$|^diametre_conduit$/.test(f.key) && amEstRond(f, inst)) {
    return '<button type="button" class="today-btn" onclick="amTourConduit(\'' + typeId + '\',\'' + f.key + '\');">Calculer depuis le tour du conduit</button>';
  }
  return '';
}

// ————————————————————————————————————————————
// Données de la plaque : débit nominal, facteur K
// ————————————————————————————————————————————

function amSetMeta(typeId, k, v) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  v = String(v).trim();
  if (v) inst.data[k] = v; else delete inst.data[k];
  persistMissions(); render();
}

function amDebitK(k, dp) {
  return k * Math.sqrt(dp);
}

// Champ de débit de l'installation que le débit « facteur K » peut remplir (champ saisi, pas calculé)
function amChampDebitSaisi(typeId) {
  var champs = (typeof SCHEMA_DEBIT_CHAMPS !== 'undefined' && SCHEMA_DEBIT_CHAMPS[typeId]) || [];
  var t = getInstallationType(typeId);
  for (var i = 0; i < champs.length; i++) {
    var f = t.fields.filter(function (x) { return x.key === champs[i]; })[0];
    if (f && f.type === 'number') return f;
  }
  return null;
}

function plaqueDonneesHtml(typeId, inst) {
  if (!inst || (typeof PLAQUE_TYPES_EXCLUS !== 'undefined' && PLAQUE_TYPES_EXCLUS.indexOf(typeId) !== -1)) return '';
  var d = inst.data, nominal = num(d._nominal), k = num(d._k), dp = num(d._kdp);
  var mesure = (typeof schemaDebit === 'function') ? schemaDebit({ type: { id: typeId }, inst: inst }) : null;
  var champ = function (cle, label, unite, val) {
    return '<label class="am-plaque-champ"><span>' + label + '</span><span class="calc-saisie"><input type="text" inputmode="decimal" class="input" value="' + escapeHtml(val || '') + '" onchange="amSetMeta(\'' + typeId + '\',\'' + cle + '\',this.value);"><em>' + unite + '</em></span></label>';
  };
  var h = '<details class="card am-plaque"' + (d._nominal || d._k ? ' open' : '') + '><summary>Données de la plaque : débit nominal, facteur K</summary>';
  h += champ('_nominal', 'Débit nominal', 'm³/h', d._nominal);
  if (nominal > 0 && mesure) {
    var pct = Math.round(mesure / nominal * 100);
    h += '<div class="cm-res' + (pct < 80 ? ' alerte' : '') + '">Débit mesuré ' + amFr(mesure) + ' m³/h = <b>' + pct + ' % du nominal</b>.</div>';
  }
  h += champ('_k', 'Facteur K', '', d._k) + champ('_kdp', 'Pression lue à la prise du ventilateur', 'Pa', d._kdp);
  if (k > 0 && dp > 0) {
    var q = amDebitK(k, dp), cible = amChampDebitSaisi(typeId);
    h += '<div class="cm-res">Débit selon K : <b>' + amFr(q) + ' m³/h</b> (Q = K × √Δp)' + (nominal > 0 ? ', soit ' + Math.round(q / nominal * 100) + ' % du nominal' : '') + '.</div>';
    if (cible) h += '<button type="button" class="today-btn" onclick="gwField(\'' + typeId + '\',\'' + cible.key + '\',\'' + amFr(q) + '\');">Reprendre dans « ' + escapeHtml(cible.label) + ' »</button>';
  }
  return h + '<div class="cm-src">Facteur K donné par le constructeur pour un débit en m³/h (voir la plaque ou la notice). Repris à la visite suivante.</div></details>';
}

console.log('✓ Aides de mesure chargées');
