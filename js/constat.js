// constat.js - Constat rédigé à partir des données saisies (2026-10-04)
//
// Sur une installation non satisfaisante, « Rédiger le constat » écrit dans le champ d'observation un
// texte factuel tiré de la fiche : chaque mesure qui n'atteint pas son objectif (objectif déduit du
// calcul de l'appli, js/seuils.js), les états constatés défavorables (« A réparer »…), une bouche
// nettement plus faible que les autres (js/aides-mesure.js). Aucune recommandation d'entreprise ni de
// produit : le technicien relit et complète.
// Avis « Impossible de se prononcer » : les valeurs de référence absentes (champs « ref » de
// js/dvr.js) et le dossier de valeurs de référence à demander (arrêté du 8 octobre 1987, art. 2), ou les
// critères sans conclusion.

var CONSTAT_CHAMPS_PRIORITE = ['observation', 'observations', 'conclusion', 'remarque', 'commentaire', 'commentaire_2', 'commentaire_1'];
var CONSTAT_ETAT_DEFAVORABLE = /réparer|nettoyer|mauvais|dégradé|détérioré|colmaté|encrassé|encombré|déficient|empêchant|hors service|non conforme|insuffisant/i;

var CONSTAT_IDSP = 'Impossible de se prononcer';

function constatEstNonSatisfaisant(type, inst) {
  var key = (typeof resolveAvisFieldKey === 'function') ? resolveAvisFieldKey(type) : null;
  if (key && (statusClass(inst.data[key]) === 'status-bad' || inst.data[key] === CONSTAT_IDSP)) return true;
  return type.fields.some(function (f) {
    return f.type === 'computed' && (!f.showIf || evalShowIf(f.showIf, inst.data)) && (statusClass(inst.data[f.key]) === 'status-bad' || inst.data[f.key] === CONSTAT_IDSP);
  });
}

// « Impossible de se prononcer » : valeurs de référence absentes, sinon critères sans conclusion
function constatPhrasesIdsp(type, inst) {
  var visible = function (f) { return !f.showIf || evalShowIf(f.showIf, inst.data); };
  var critIdsp = type.fields.filter(function (f) { return f.type === 'computed' && visible(f) && inst.data[f.key] === CONSTAT_IDSP; });
  if (!critIdsp.length) return [];
  var cfg = (typeof DVR_CONFIG !== 'undefined' && DVR_CONFIG[type.id]) || { lignes: [] }, manquantes = [];
  cfg.lignes.forEach(function (l) {
    if (!l.ref) return;
    var f = type.fields.filter(function (x) { return x.key === l.ref; })[0];
    var v = inst.data[l.ref];
    if (f && visible(f) && (v === undefined || v === null || String(v).trim() === '' || String(v).trim() === '/')) manquantes.push(l.label.charAt(0).toLowerCase() + l.label.slice(1));
  });
  if (manquantes.length) {
    return ['Impossible de se prononcer en l’absence de valeur de référence (' + manquantes.filter(function (x, i) { return manquantes.indexOf(x) === i; }).join(', ') +
      '). Le dossier de valeurs de référence de l’installation (arrêté du 8 octobre 1987) est à demander au chef d’établissement.'];
  }
  var libs = critIdsp.map(function (f) { return constatCritere(type, inst, f); }).filter(function (r, i, a) { return a.indexOf(r) === i && !/^par rapport/i.test(r); });
  return libs.length ? ['Impossible de se prononcer : ' + libs.join(' ; ') + ' (données insuffisantes pour conclure).'] : [];
}

// Champ qui reçoit le constat : le premier champ de remarque visible, par ordre de priorité
function constatChamp(type, inst) {
  for (var i = 0; i < CONSTAT_CHAMPS_PRIORITE.length; i++) {
    var f = type.fields.filter(function (x) { return x.key === CONSTAT_CHAMPS_PRIORITE[i]; })[0];
    if (f && f.type === 'textarea' && (!f.showIf || evalShowIf(f.showIf, inst.data))) return f;
  }
  return null;
}

function constatLibelle(f, typeId) {
  var lib = String(f.label).replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+—.*$/, '').trim();
  // Libellé trop vague (« Valeur mesurée », « Vitesse ») : titre de l'étape qui porte le champ
  if (/^(valeur mesurée|valeur|vitesse|débit|mesure)$/i.test(lib) && typeof WIZARD_STEPS !== 'undefined' && WIZARD_STEPS[typeId]) {
    var step = WIZARD_STEPS[typeId].filter(function (st) { return st.fields.indexOf(f.key) !== -1; })[0];
    var titre = step ? step.title.replace(/\s*\(optionnel\)\s*$/i, '').replace(/\s+—.*$/, '') : '';
    if (titre && titre.toLowerCase() !== lib.toLowerCase() && !/^(identification|constat|mesures?)$/i.test(titre)) lib = titre + (/^valeur/i.test(lib) ? '' : ' (' + lib.toLowerCase() + ')');
  }
  return lib;
}

// Valeur d'un choix, en minuscule et accentuée (« A nettoyer » -> « à nettoyer »)
function constatValeurChoix(val) {
  var v = val.replace(/^A /, 'à ');
  return v.charAt(0).toLowerCase() + v.slice(1);
}

// Critère d'avis X_avis_Y : valeur mesurée X_mesuree et valeur visée X_Y_valeur / X_Y (sorbonnes…)
function constatCritere(type, inst, f) {
  var lib = String(f.label).split(/\s+—\s+/)[0].replace(/^Avis\s+/i, '').replace(/\s*\(.*\)\s*$/, '');
  lib = (/^(avis|conclusion)$/i.test(lib) && typeof reasonLabel === 'function') ? reasonLabel(type, f) : lib;
  var m = f.key.match(/^(.*_)avis_(.+)$/), txt = lib.charAt(0).toLowerCase() + lib.slice(1);
  if (m) {
    var d = inst.data, mes = num(d[m[1] + 'mesuree'] !== undefined ? d[m[1] + 'mesuree'] : d[m[1] + 'mesure']);
    var vise = num(d[m[1] + m[2] + '_valeur'] !== undefined ? d[m[1] + m[2] + '_valeur'] : d[m[1] + m[2]]);
    var fMes = type.fields.filter(function (x) { return x.key === m[1] + 'mesuree' || x.key === m[1] + 'mesure'; })[0];
    var u = fMes ? seuilUnite(fMes.label) : '';
    if (!isNaN(mes) && mes !== null && !isNaN(vise) && vise !== null) txt += ' ' + seuilFr(seuilArrondi(mes)) + u + ' pour ' + seuilFr(seuilArrondi(vise)) + u + ' attendu';
  }
  var ref = String(f.label).split(/\s+—\s+/)[1];
  return txt + (ref && /ED\s?\d|NF|XP|R\d{4}/.test(ref) ? ' (' + ref.replace(/^Avis\s*\/\s*/i, '') + ')' : '');
}

// Phrases du constat (tableau de chaînes)
function constatPhrases(typeId, inst) {
  var type = getInstallationType(typeId), out = [];
  if (!type || !inst) return out;
  var visible = function (f) { return !f.showIf || evalShowIf(f.showIf, inst.data); };
  // Mesures sous (ou au-dessus de) l'objectif
  type.fields.forEach(function (f) {
    if (f.type !== 'number' || !visible(f) || typeof seuilsPourChamp !== 'function') return;
    var brut = inst.data[f.key];
    if (brut === undefined || brut === null || String(brut).trim() === '') return;
    var v = num(brut);
    if (isNaN(v) || v === null) return;
    seuilsPourChamp(typeId, f, inst).filter(function (s) { return s.ok === false; }).slice(0, 1).forEach(function (s) {
      out.push(constatLibelle(f, typeId) + ' : ' + seuilFr(seuilArrondi(v)) + seuilUnite(f.label) + ', pour un objectif ' + s.texte +
        (s.libelle ? ' (' + s.libelle.charAt(0).toLowerCase() + s.libelle.slice(1) + ')' : '') + '.');
    });
  });
  // Avis « Impossible de se prononcer »
  if (!out.length) out = out.concat(constatPhrasesIdsp(type, inst));
  // Critères non satisfaisants sans mesure directe (grille, critère qualitatif)
  if (!out.length) {
    var raisons = type.fields.filter(function (f) { return f.type === 'computed' && visible(f) && statusClass(inst.data[f.key]) === 'status-bad'; })
      .map(function (f) { return constatCritere(type, inst, f); });
    raisons = raisons.filter(function (r, i) { return raisons.indexOf(r) === i && !/^par rapport/i.test(r); });
    if (raisons.length) out.push('Non satisfaisant : ' + raisons.join(' ; ') + '.');
  }
  // États constatés défavorables
  type.fields.forEach(function (f) {
    if ((f.type !== 'select' && f.type !== 'toggle') || !visible(f)) return;
    var val = inst.data[f.key];
    if (typeof val === 'string' && CONSTAT_ETAT_DEFAVORABLE.test(val)) out.push(constatLibelle(f, typeId) + ' : ' + constatValeurChoix(val).replace(/\.$/, '') + '.');
  });
  // Bouches nettement plus faibles (mesure au cône, js/aides-mesure.js)
  if (inst.data._bouches && typeof amBouchesDebits === 'function') {
    Object.keys(inst.data._bouches).forEach(function (k) {
      var liste = inst.data._bouches[k];
      if (!Array.isArray(liste)) return;
      var debits = amBouchesDebits(inst, liste);
      amBouchesFaibles(debits.map(function (v) { return isNaN(v) ? '' : String(v); })).forEach(function (x) {
        out.push('Bouche ' + (x.i + 1) + ' : ' + amFr(x.v) + ' m³/h, nettement plus faible que les autres bouches du local (médiane ' + amFr(x.med) + ' m³/h).');
      });
    });
  }
  return out;
}

function constatTexte(typeId, inst) {
  return constatPhrases(typeId, inst).join('\n');
}

function constatRediger(typeId, key) {
  var inst = getCurrentInstallation(typeId);
  if (!inst) return;
  var texte = constatTexte(typeId, inst);
  if (!texte) { alert('Rien à signaler dans les données saisies : complétez le constat à la main.'); return; }
  var actuel = String(inst.data[key] || '').trim();
  if (actuel.indexOf(texte) !== -1) return;
  gwField(typeId, key, actuel ? actuel + '\n' + texte : texte);
}

// Bouton sous le champ d'observation (js/wizard-engine.js, gwTextarea)
function constatBoutonHtml(typeId, f, inst) {
  var type = getInstallationType(typeId);
  if (!type || !constatEstNonSatisfaisant(type, inst)) return '';
  var champ = constatChamp(type, inst);
  if (!champ || champ.key !== f.key || !constatPhrases(typeId, inst).length) return ''; // avis saisi à la main : rien à rédiger
  return '<button type="button" class="today-btn constat-btn" onclick="constatRediger(\'' + typeId + '\',\'' + f.key + '\');">Rédiger le constat à partir des mesures</button>';
}

console.log('✓ Constat chargé');
