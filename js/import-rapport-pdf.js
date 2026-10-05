// import-rapport-pdf.js - Nouveau client : reprendre la liste des installations du rapport PDF du
// contrôle précédent (autre organisme ou ancien rapport), 2026-10-04.
//
// Le texte du PDF est lu sur l'appareil (pdf.js, rien n'est envoyé). On suit les titres en majuscules
// qui nomment un type d'installation (« VERIFICATION DES HOTTES », « CAPTAGE DES GAZ
// D'ECHAPPEMENT »…) ; dans les annexes, chaque ligne « Bâtiment » d'une fiche compte pour une
// installation du type en cours, avec son local ou sa référence comme nom. Le résultat arrive dans
// l'aperçu de création (js/import-liste.js) : le technicien retire les lignes en trop avant de créer.
// Les rapports des organismes ne suivent pas tous la même mise en page : c'est une aide, à relire.
// Valeurs de l'an dernier : dans les fiches à une installation (captages, hottes, extracteurs…), le
// débit mesuré devient la valeur N-1 de l'installation créée (champ « année N-1 » et historique) ; les
// fiches en colonnes (bureaux, sanitaires) ne sont pas reprises, trop ambiguës.

// Lignes de texte d'un PDF : [{ p: page, s: 'cellule | cellule' }]
function rapportPdfLignes(buf) {
  return ensureLib('pdfjs').then(function () {
    return pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  }).then(function (doc) {
    var out = [], p = 1;
    var page = function () {
      if (p > doc.numPages) return out;
      return doc.getPage(p).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
        var rows = {};
        tc.items.forEach(function (it) {
          if (!it.str || !it.str.trim()) return;
          var y = Math.round(it.transform[5] / 3);
          (rows[y] = rows[y] || []).push({ x: it.transform[4], w: it.width || 0, s: it.str.trim() });
        });
        // Mots d'une même cellule (écart de moins de 4 points) réunis par une espace, cellules séparées par « | »
        Object.keys(rows).sort(function (a, b) { return b - a; }).forEach(function (y) {
          var txt = '', fin = null;
          rows[y].sort(function (a, b) { return a.x - b.x; }).forEach(function (r) {
            txt += fin === null ? r.s : (r.x - fin < 4 && r.w ? ' ' : ' | ') + r.s;
            fin = r.x + r.w;
          });
          out.push({ p: p, s: txt });
        });
        p++;
        return page();
      });
    };
    return page();
  });
}

function rapportMajuscules(s) {
  var t = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  return t.length > 5 && t.replace(/[^A-ZÀ-Ý]/g, '').length / t.length > 0.7;
}

// Valeur d'une ligne « Libellé : | valeur » (ou valeur sur la ligne suivante)
function rapportValeur(lignes, i, re) {
  var s = lignes[i].s.replace(re, '').replace(/^[\s:|]+/, '').trim();
  if (!s && lignes[i + 1] && lignes[i + 1].p === lignes[i].p && lignes[i + 1].s.indexOf('|') === -1 && !rapportMajuscules(lignes[i + 1].s)) s = lignes[i + 1].s.trim();
  return s.replace(/\s*\|\s*/g, ' ').trim();
}

var RAPPORT_BAT = /^(bâtiment|batiment|bât\.?)\s*:?/i;
var RAPPORT_NOM = /^(activité et référence du local|localisation|local|emplacement|repère|désignation)\s*:?/i;
var RAPPORT_REF = /^(ref\.? de l'équipement|réf\.? de l'équipement|référence de l'équipement|ref\.? de)\s*:?/i;
var RAPPORT_ENTETE = /référence|type de|commentaire|avis|activité|^dimension|implantation/i;

// Intitulés de section propres aux rapports (en plus des synonymes de js/import-liste.js)
var RAPPORT_SYNONYMES = {
  'pollution non specifique': 'bureaux', 'equipements divers': 'installations_diverses', 'captages divers': 'installations_diverses',
  'bras orientable': 'bras_aspiration', 'locaux de charge': 'locaux_charge', 'extracteur': 'extracteur', 'ventilateur': 'extracteur',
  'centrale de traitement': 'cta', 'cabines de peinture': 'cabines_peinture', 'machines a bois': 'menuiserie_bis', 'traitement de surface': 'tts',
  'torche': 'torches_aspirantes'
};
var RAPPORT_AVIS = /^(non satisfaisant|satisfaisant|sans objet|conforme|non conforme|insuffisant|impossible de se prononcer|non contr[ôo]l[ée]e?|non v[ée]rifi[ée]e?|non applicable)$/i;

// Le mot-clé qui apparaît en premier dans l'intitulé l'emporte (« Sorbonnes de laboratoire » -> sorbonnes)
function rapportType(txt) {
  var n = listeNorm(txt), sing = n.replace(/s\b/g, ''), dico = Object.assign({}, LISTE_SYNONYMES, RAPPORT_SYNONYMES), best = null;
  INSTALLATION_TYPES.forEach(function (t) { var k = listeNorm(t.label.replace(/\s*\(.*\)\s*$/, '')); if (k && !dico[k]) dico[k] = t.id; });
  Object.keys(dico).forEach(function (k) {
    var ks = k.replace(/s\b/g, ''), pos = (' ' + sing).indexOf(' ' + ks); // en début de mot
    if (pos === -1) return;
    if (!best || pos < best.pos || (pos === best.pos && ks.length > best.len)) best = { pos: pos, len: ks.length, id: dico[k] };
  });
  return best ? getInstallationType(best.id) : listeType(txt);
}

// Tableaux de synthèse : « Conclusion sur les sorbonnes » puis une ligne par installation avec son avis
function rapportSynthese(lignes, fin) {
  var type = null, out = [];
  for (var i = 0; i < fin; i++) {
    var s = lignes[i].s.trim(), titre = s.match(/^(conclusion|synth[eè]se|r[ée]sultats?)\s+(sur|des|du|de la|pour)\s+(.+)$/i);
    if (titre && s.indexOf('|') === -1) { type = rapportType(titre[3]); continue; }
    if (!type) continue;
    var cells = s.split(/\s*\|\s*/), iAvis = -1;
    cells.forEach(function (c, k) { if (iAvis < 0 && RAPPORT_AVIS.test(c)) iAvis = k; });
    if (iAvis < 1) continue;
    var avant = cells.slice(0, iAvis);
    out.push({ texte: type.label, type: type, nb: 1, bat: avant[0].slice(0, 60), nom: avant.slice(1).join(' – ').slice(0, 60) });
  }
  return out;
}

// Fiches des annexes : titre de type puis ligne « Bâtiment | valeur » (une installation par fiche)
function rapportFiches(lignes, debut) {
  var typeCourant = null, fiches = [], typesVus = [];
  for (var i = debut; i < lignes.length; i++) {
    var s = lignes[i].s.trim(), prec = i > 0 ? lignes[i - 1].s : '';
    var titre = s.length < 100 && !/\.{4}|…|a[ée]ration et assainissement|synth[eè]se|sommaire/i.test(s) &&
      (rapportMajuscules(s) || (s.indexOf('|') === -1 && s.length < 45 && /a[ée]ration et assainissement/i.test(prec)));
    if (titre) {
      var t = rapportType(s.replace(/\(.*\)/g, ''));
      if (t) { typeCourant = t; if (typesVus.indexOf(t) === -1) typesVus.push(t); }
      continue;
    }
    if (!typeCourant || !RAPPORT_BAT.test(s)) continue;
    var bat = rapportValeur(lignes, i, RAPPORT_BAT);
    if (!bat || RAPPORT_ENTETE.test(bat)) continue; // en-tête de tableau, pas une fiche
    var nom = '', ref = '';
    for (var j = Math.max(debut, i - 6); j < Math.min(lignes.length, i + 8); j++) {
      if (lignes[j].p !== lignes[i].p || j === i) continue;
      if (!nom && RAPPORT_NOM.test(lignes[j].s)) nom = rapportValeur(lignes, j, RAPPORT_NOM);
      if (!ref && RAPPORT_REF.test(lignes[j].s)) ref = rapportValeur(lignes, j, RAPPORT_REF);
    }
    nom = [nom, ref].map(function (x) { return x.replace(/\s+(dimension|et\/ou implantation)\b.*$/i, ''); }) // en-têtes de colonne voisines
      .filter(function (x) { return x && !RAPPORT_ENTETE.test(x); }).join(' – ');
    var f = { texte: typeCourant.label, type: typeCourant, nb: 1, bat: bat.slice(0, 60), nom: nom.slice(0, 60), p: lignes[i].p, i: i };
    var der = fiches[fiches.length - 1]; // même fiche sur deux pages
    if (der && der.type === f.type && der.bat === f.bat && der.nom === f.nom && f.p - der.p <= 1) continue;
    fiches.push(f);
  }
  // Débits mesurés de chaque fiche, cherchés jusqu'à la fiche suivante
  fiches.forEach(function (f, k) {
    var fin = k + 1 < fiches.length ? fiches[k + 1].i : Math.min(lignes.length, f.i + 150);
    for (var j = f.i; j < fin; j++) {
      var d = rapportDebitMesure(lignes[j].s);
      if (d) (f.debits = f.debits || []).push(d);
    }
  });
  return { fiches: fiches, typesVus: typesVus };
}

function rapportNombre(c) {
  var v = String(c).replace(/\s/g, '').replace(',', '.');
  return /^\d+(\.\d+)?$/.test(v) ? parseFloat(v) : NaN;
}

// Débit mesuré lu sur une ligne : { v, lib } ou null.
//  - « Débit d'air extrait (m3/h) | 1327,04 » (une seule valeur : pas une fiche en colonnes) ;
//  - ligne de tableau de conduit (« Extrait | Circulaire | 70 | / | 0,38 | 15,9 | - | 23830 | 22029 ») :
//    le débit mesuré est la cellule égale à surface × vitesse × 3600, quel que soit l'ordre des colonnes.
var RAPPORT_DEBIT = /^d[ée]bit\b[^|]*\(m[3³]\s*\/\s*h\)/i;
var RAPPORT_DEBIT_EXCLU = /th[ée]orique|pr[ée]conis|r[ée]f[ée]rence|minimal|inrs|recommand|n-1|pr[ée]c[ée]dent|calcul/i;
function rapportDebitMesure(s) {
  var cells = s.split(/\s*\|\s*/);
  if (cells.length === 2 && RAPPORT_DEBIT.test(cells[0]) && !RAPPORT_DEBIT_EXCLU.test(cells[0])) {
    var v = rapportNombre(cells[1]);
    return v > 0 ? { v: Math.round(v * 100) / 100, lib: '' } : null;
  }
  var nums = cells.map(rapportNombre);
  if (nums.filter(function (x) { return !isNaN(x); }).length < 3) return null;
  for (var i = 0; i < nums.length; i++) {
    if (!(nums[i] > 0 && nums[i] < 10)) continue; // surface (m²)
    for (var j = i + 1; j < nums.length; j++) {
      if (!(nums[j] > 0 && nums[j] < 60)) continue; // vitesse (m/s)
      var q = nums[i] * nums[j] * 3600;
      for (var k = j + 1; k < nums.length; k++) {
        if (nums[k] > 0 && Math.abs(nums[k] - q) / q < 0.03) return { v: Math.round(nums[k] * 100) / 100, lib: listeNorm(cells[0]) };
      }
    }
  }
  return null;
}

// Champs « valeur N-1 » du débit pour un type (N1_COMPARISON_FIELDS) ; CTA : selon la ligne (neuf…)
function rapportChampN1(typeId, lib) {
  if (typeId === 'bras_aspiration') return 'debit_precedent';
  if (typeId === 'cta') return /neuf/.test(lib || '') ? 'neuf_debit_n1' : /souffl/.test(lib || '') ? 'souf_debit_n1' : /repris|reprise/.test(lib || '') ? 'rep_debit_n1' : null;
  var pairs = (typeof N1_COMPARISON_FIELDS !== 'undefined' && N1_COMPARISON_FIELDS[typeId]) || [];
  var p = pairs.filter(function (x) { return /debit/.test(x.current); })[0];
  return p ? p.n1 : null;
}

// Données N-1 d'une installation : champs N-1 et historique (js/bilans.js) pour la mesure suivie
function rapportDonneesN1(typeId, debits, annee) {
  var d = {}, h = (typeof histoChamp === 'function') ? histoChamp(typeId) : null, n = 0;
  (debits || []).forEach(function (x) {
    var champ = rapportChampN1(typeId, x.lib);
    if (!champ || d[champ] !== undefined) return;
    d[champ] = String(x.v).replace('.', ',');
    n++;
    if (annee && h && h.n1 === champ) d._histo = [{ a: annee, v: x.v }];
  });
  return n ? d : null;
}

// Année du contrôle décrit par le rapport
function rapportAnnee(lignes) {
  for (var i = 0; i < Math.min(lignes.length, 200); i++) {
    var m = lignes[i].s.match(/(r[ée]alis[ée]e?|date (du contr[ôo]le|de l'intervention|d'intervention|de la visite|de mesure))[^|]{0,40}?(20\d{2})/i);
    if (m) return parseInt(m[3], 10);
  }
  return null;
}

// Lignes [{ texte, type, nb, bat, nom }] pour l'aperçu de js/import-liste.js. La synthèse fait foi
// (une ligne par installation, avec son avis) ; les fiches complètent les types qui n'y figurent pas.
function rapportAnalyser(lignes) {
  var debut = 0;
  lignes.forEach(function (l, i) { if (!debut && /^annexes?$/i.test(l.s.trim()) && l.p > 1) debut = i; });
  var synth = rapportSynthese(lignes, debut || lignes.length);
  var f = rapportFiches(lignes, debut), dans = {}, nS = {}, nF = {};
  synth.forEach(function (l) { nS[l.type.id] = (nS[l.type.id] || 0) + 1; });
  f.fiches.forEach(function (l) { nF[l.type.id] = (nF[l.type.id] || 0) + 1; });
  // Par type, la source qui compte le plus d'installations (une ligne de synthèse peut être illisible)
  var out = synth.filter(function (l) { return (nS[l.type.id] || 0) >= (nF[l.type.id] || 0); })
    .concat(f.fiches.filter(function (l) { return (nF[l.type.id] || 0) > (nS[l.type.id] || 0); }));
  out.forEach(function (l) { dans[l.type.id] = true; });
  // Débit N-1 : fiche de la même installation (même bâtiment et nom proche), sinon dans l'ordre
  var annee = rapportAnnee(lignes), norm = function (x) { return listeNorm(x || ''); };
  var parType = {};
  f.fiches.forEach(function (l) { (parType[l.type.id] = parType[l.type.id] || []).push(l); });
  var lignesType = {};
  out.forEach(function (l) { (lignesType[l.type.id] = lignesType[l.type.id] || []).push(l); });
  Object.keys(lignesType).forEach(function (tid) {
    var fl = (parType[tid] || []).filter(function (x) { return x.debits; }), rows = lignesType[tid], pris = [];
    rows.forEach(function (r, k) {
      var cand = r.debits !== undefined ? r : fl.filter(function (x) {
        if (pris.indexOf(x) !== -1 || norm(x.bat) !== norm(r.bat)) return false;
        var a = norm(x.nom), b = norm(r.nom);
        return a && b && (a.indexOf(b) !== -1 || b.indexOf(a) !== -1);
      })[0];
      if (!cand && (parType[tid] || []).length === rows.length) cand = parType[tid][k]; // même nombre : même ordre
      if (cand && cand.debits && pris.indexOf(cand) === -1) {
        pris.push(cand);
        var d = rapportDonneesN1(tid, cand.debits, annee);
        if (d) { r.data = d; r.n1 = cand.debits[0].v; }
      }
    });
  });
  out.forEach(function (l) { delete l.p; delete l.i; delete l.debits; });
  // Types rencontrés sans aucune installation lisible : une ligne à compléter
  f.typesVus.forEach(function (t) { if (!dans[t.id]) out.push({ texte: t.label, type: t, nb: 1, bat: '', nom: '' }); });
  return out;
}

function listeLireRapportPdf(input) {
  var file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  state.importListeInfo = 'Lecture du rapport…';
  render();
  file.arrayBuffer().then(rapportPdfLignes).then(function (lignes) {
    var res = rapportAnalyser(lignes);
    state.importListe = res;
    state.importListeTexte = '';
    state.importListeInfo = res.length
      ? res.length + ' installation(s) trouvée(s) dans « ' + file.name + ' ». Relisez la liste et retirez les lignes en trop (✕) avant de créer.'
      : 'Aucune installation reconnue dans ce rapport : utilisez le tableau ci-dessus.';
    render();
  }).catch(function (err) { state.importListeInfo = ''; render(); alert('Rapport illisible :\n\n' + err.message); });
}

console.log('✓ Import de rapport PDF chargé');
