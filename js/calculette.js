// calculette.js - Calculette de terrain (chantier du 2026-10-04)
//
// Accessible depuis la fiche d'une installation et le menu de la mission : les calculs faits jusqu'ici
// de tête ou sur un coin de feuille. Résultats mis à jour à la frappe, rien n'est enregistré.
//  - Débit = vitesse × section (ronde ou rectangulaire)
//  - Vitesse d'après la pression dynamique (tube de Pitot) : v = √(2·Pd/ρ), ρ selon la température
//    (air sec, pression atmosphérique normale)
//  - Renouvellement d'air : débit / volume (vol/h), ou débit pour un taux donné
//  - Air neuf minimal par occupant (R4222-6) : 25 / 30 / 45 / 60 m³/h selon le local

var CALC_ONGLETS = [
  { k: 'debit', nom: 'Débit' }, { k: 'pitot', nom: 'Pitot' }, { k: 'renouv', nom: 'Vol/h' }, { k: 'airneuf', nom: 'Air neuf' }
];
var CALC_R4222_6 = [
  { v: 25, nom: 'Bureaux, locaux sans travail physique' },
  { v: 30, nom: 'Restauration, vente, réunion' },
  { v: 45, nom: 'Ateliers et locaux avec travail physique léger' },
  { v: 60, nom: 'Autres ateliers et locaux' }
];

function calcNum(id) {
  var el = document.getElementById(id);
  return el ? num(el.value) : NaN;
}

function calcFr(v, dec) {
  if (isNaN(v) || !isFinite(v)) return '—';
  return v.toLocaleString('fr-FR', { maximumFractionDigits: dec === undefined ? 2 : dec, minimumFractionDigits: 0 });
}

function calcChamp(id, label, unite, defaut) {
  return '<label class="calc-champ" for="' + id + '"><span>' + label + '</span><span class="calc-saisie"><input type="text" inputmode="decimal" class="input" id="' + id + '" value="' + (defaut || '') + '" oninput="calcMaj();">' +
    (unite ? '<em>' + unite + '</em>' : '') + '</span></label>';
}

function calculetteOuvrir() {
  state.calcOnglet = state.calcOnglet || 'debit';
  var root = document.getElementById('calc-root');
  if (!root) { root = document.createElement('div'); root.id = 'calc-root'; document.body.appendChild(root); }
  var o = state.calcOnglet, h = '<div class="calc-fond" onclick="if(event.target===this)calculetteFermer();"><div class="calc-boite" role="dialog" aria-label="Calculette de terrain">';
  h += '<div class="calc-tete"><b>Calculette</b><button type="button" class="btn btn-gray btn-small" onclick="calculetteFermer();">Fermer</button></div>';
  h += '<div class="calc-onglets">' + CALC_ONGLETS.map(function (x) {
    return '<button type="button" class="calc-onglet' + (x.k === o ? ' active' : '') + '" onclick="state.calcOnglet=\'' + x.k + '\';calculetteOuvrir();">' + x.nom + '</button>';
  }).join('') + '</div><div class="calc-corps">';
  if (o === 'debit') {
    h += '<div class="calc-choix"><label><input type="radio" name="calc-forme" id="calc-rond" checked onchange="calcMaj();"> Ronde</label><label><input type="radio" name="calc-forme" id="calc-rect" onchange="calcMaj();"> Rectangulaire</label></div>';
    h += calcChamp('calc-v', 'Vitesse moyenne', 'm/s') + calcChamp('calc-d1', 'Diamètre ou côté 1', 'cm') + calcChamp('calc-d2', 'Côté 2 (rectangulaire)', 'cm');
  } else if (o === 'pitot') {
    h += calcChamp('calc-pd', 'Pression dynamique', 'Pa') + calcChamp('calc-t', 'Température de l’air', '°C', '20');
  } else if (o === 'renouv') {
    h += calcChamp('calc-q', 'Débit', 'm³/h') + calcChamp('calc-vol', 'Volume du local', 'm³') + calcChamp('calc-taux', 'ou taux visé', 'vol/h');
  } else {
    h += calcChamp('calc-eff', 'Effectif', 'pers.');
    h += '<div class="calc-cats">' + CALC_R4222_6.map(function (c, i) {
      return '<label><input type="radio" name="calc-cat" id="calc-cat' + i + '" value="' + c.v + '"' + (i === 0 ? ' checked' : '') + ' onchange="calcMaj();"> ' + c.nom + ' — <b>' + c.v + ' m³/h</b></label>';
    }).join('') + '</div>';
  }
  h += '</div><div class="calc-resultat" id="calc-res" aria-live="polite"></div></div></div>';
  root.innerHTML = h;
  calcMaj();
}

function calcResultats(o, val) {
  if (o === 'debit') {
    var v = val.v, a = val.d1 / 100, b = val.d2 / 100;
    var s = val.rond ? Math.PI * a * a / 4 : a * b;
    return [{ l: 'Section', r: calcFr(s, 4) + ' m²' }, { l: 'Débit', r: calcFr(v * s * 3600, 0) + ' m³/h', fort: true }];
  }
  if (o === 'pitot') {
    var rho = 1.293 * 273.15 / (273.15 + (isNaN(val.t) ? 20 : val.t));
    return [{ l: 'Masse volumique de l’air', r: calcFr(rho, 3) + ' kg/m³' }, { l: 'Vitesse', r: calcFr(Math.sqrt(2 * val.pd / rho), 2) + ' m/s', fort: true }];
  }
  if (o === 'renouv') {
    var out = [{ l: 'Renouvellement', r: calcFr(val.q / val.vol, 1) + ' vol/h', fort: true }];
    if (!isNaN(val.taux)) out.push({ l: 'Débit pour ' + calcFr(val.taux, 1) + ' vol/h', r: calcFr(val.taux * val.vol, 0) + ' m³/h' });
    return out;
  }
  return [{ l: 'Air neuf minimal (R4222-6)', r: calcFr(val.eff * val.cat, 0) + ' m³/h', fort: true }];
}

function calcMaj() {
  var res = document.getElementById('calc-res');
  if (!res) return;
  var o = state.calcOnglet, val = {};
  if (o === 'debit') { val = { v: calcNum('calc-v'), d1: calcNum('calc-d1'), d2: calcNum('calc-d2'), rond: (document.getElementById('calc-rond') || {}).checked }; var d2 = document.getElementById('calc-d2'); if (d2) d2.closest('.calc-champ').style.opacity = val.rond ? '0.45' : '1'; }
  else if (o === 'pitot') val = { pd: calcNum('calc-pd'), t: calcNum('calc-t') };
  else if (o === 'renouv') val = { q: calcNum('calc-q'), vol: calcNum('calc-vol'), taux: calcNum('calc-taux') };
  else {
    var c = document.querySelector('input[name="calc-cat"]:checked');
    val = { eff: calcNum('calc-eff'), cat: c ? parseFloat(c.value) : 25 };
  }
  res.innerHTML = calcResultats(o, val).map(function (x) {
    return '<div class="calc-ligne' + (x.fort ? ' fort' : '') + '"><span>' + escapeHtml(x.l) + '</span><b>' + escapeHtml(x.r) + '</b></div>';
  }).join('');
}

function calculetteFermer() {
  var root = document.getElementById('calc-root');
  if (root) root.innerHTML = '';
}

function calculetteBoutonHtml() {
  return '<button type="button" class="btn btn-gray btn-small calc-bouton" aria-label="Calculette" title="Calculette" onclick="calculetteOuvrir();">' + ICONS.calc + '</button>';
}

console.log('✓ Calculette chargée');
