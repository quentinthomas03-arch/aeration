// bilans.js - Bilan d'air neuf des CTA et historique des mesures (chantier du 2026-10-04)
//
//  - Bilan d'air neuf d'une CTA : on coche, dans la fiche de la CTA, les locaux qu'elle alimente
//    (bureaux, ERP, locaux à pollution spécifique). L'appli compare l'air neuf mesuré à la CTA au
//    besoin réglementaire cumulé de ces locaux (R4222-6, déjà calculé dans chaque fiche) et à l'air neuf
//    mesuré dans les locaux. Simple constat, affiché dans la fiche et dans le rapport (4.4).
//    Données : inst.data._alimente = [id d'installation] sur la CTA.
//  - Historique : la mesure principale de chaque installation est conservée d'une visite à l'autre
//    (inst.data._histo = [{ a: année, v: valeur }]) et affichée en petite courbe dans la fiche.

var BILAN_TYPES_LOCAUX = ['bureaux', 'erp', 'local_specifique'];

function bilanAirNeufCta(inst) {
  var d = inst.data || {}, v = num(d.neuf_debit);
  if (!isNaN(v) && v > 0) return { v: v, source: 'mesuré sur le réseau d’air neuf' };
  // CTA tout air neuf : le débit soufflé est de l'air neuf
  var s = num(d.souf_debit);
  if (/AIR NEUF UNIQUEMENT/i.test(String(d.mode_fonctionnement || '')) && !isNaN(s) && s > 0) return { v: s, source: 'débit soufflé d’une CTA tout air neuf' };
  return null;
}

function bilanBesoinLocal(it) {
  var v = num(it.inst.data.debit_min_air_neuf);
  return !isNaN(v) && v > 0 ? v : null;
}

function bilanMesureLocal(it) {
  var d = it.inst.data, v = num(it.type.id === 'local_specifique' ? d.debit_air_neuf : d.debit_air_neuf_introduit);
  return !isNaN(v) ? v : null;
}

// { cta: it, an, locaux: [it], besoin, nBesoin, mesure, nMesure, sansBesoin: [noms] } ou null
function bilanCta(m, ctaIt) {
  var ids = Array.isArray(ctaIt.inst.data._alimente) ? ctaIt.inst.data._alimente : [];
  if (!ids.length) return null;
  var items = overviewOrderedItems(m).filter(function (it) { return ids.indexOf(it.inst.id) !== -1; });
  var r = { cta: ctaIt, an: bilanAirNeufCta(ctaIt.inst), locaux: items, besoin: 0, nBesoin: 0, mesure: 0, nMesure: 0, sansBesoin: [] };
  items.forEach(function (it) {
    var b = bilanBesoinLocal(it), q = bilanMesureLocal(it);
    if (b === null) r.sansBesoin.push(overviewRowTitle(it)); else { r.besoin += b; r.nBesoin++; }
    if (q !== null) { r.mesure += q; r.nMesure++; }
  });
  return r;
}

function bilanCtaTexte(r) {
  var fr = function (v) { return Math.round(v).toLocaleString('fr-FR'); };
  var n = r.locaux.length, pl = function (k, s, p) { return k > 1 ? p : s; };
  var t = r.an ? 'Air neuf de la CTA : ' + fr(r.an.v) + ' m³/h, ' + r.an.source + '. ' : 'Air neuf de la CTA non mesuré. ';
  if (r.nBesoin) {
    t += 'Besoin réglementaire cumulé (R4222-6) : ' + fr(r.besoin) + ' m³/h pour ' + r.nBesoin + ' ' + pl(r.nBesoin, 'local', 'locaux') +
      (r.nBesoin < n ? ' sur les ' + n + ' alimentés' : ' ' + pl(r.nBesoin, 'alimenté', 'alimentés')) + '. ';
  } else t += n + ' ' + pl(n, 'local alimenté', 'locaux alimentés') + ', besoin non calculé. ';
  if (r.nMesure) t += 'Air neuf mesuré dans ' + pl(r.nMesure, 'ce local', 'ces locaux') + ' : ' + fr(r.mesure) + ' m³/h. ';
  if (r.an && r.nBesoin) {
    t += r.an.v >= r.besoin ? 'L’air neuf de la CTA couvre ce besoin.'
      : 'L’air neuf de la CTA est inférieur à ce besoin de ' + Math.round((r.besoin - r.an.v) / r.besoin * 100) + ' %.';
  }
  if (r.sansBesoin.length) t += ' Besoin non calculé (effectif ou volume à saisir) : ' + r.sansBesoin.join(', ') + '.';
  return t.trim();
}

// Carte de la fiche CTA : choix des locaux alimentés et bilan
function bilanCtaCarteHtml(typeId, inst) {
  if (typeId !== 'cta' || !inst) return '';
  var m = getCurrentMission();
  var it = overviewOrderedItems(m).filter(function (x) { return x.inst === inst; })[0];
  if (!it) return '';
  var candidats = overviewOrderedItems(m).filter(function (x) { return BILAN_TYPES_LOCAUX.indexOf(x.type.id) !== -1; });
  var ids = Array.isArray(inst.data._alimente) ? inst.data._alimente : [];
  var ouvert = state.bilanCtaOuvert === inst.id;
  var h = '<div class="card bilan-cta"><div class="section-title">Bilan d’air neuf de la CTA</div>';
  var r = bilanCta(m, it);
  if (r) h += '<p class="bilan-cta-texte">' + escapeHtml(bilanCtaTexte(r)) + '</p>';
  else h += '<p class="subtitle">Cochez les locaux alimentés par cette CTA : l’appli compare son air neuf au besoin réglementaire cumulé de ces locaux.</p>';
  if (!candidats.length) return h + '<p class="subtitle">Aucun bureau, ERP ou local spécifique dans la mission.</p></div>';
  if (!ouvert) {
    return h + '<button type="button" class="btn btn-gray btn-small" onclick="state.bilanCtaOuvert=' + JSON.stringify(inst.id).replace(/"/g, '&quot;') + ';render();">' + ICONS.list + ' Locaux alimentés (' + ids.length + ')</button></div>';
  }
  h += '<div class="bilan-cta-liste">';
  candidats.forEach(function (x) {
    var on = ids.indexOf(x.inst.id) !== -1;
    h += '<label class="doc-check"><input type="checkbox"' + (on ? ' checked' : '') + ' onchange="bilanCtaCocher(\'' + x.type.id + '\',' + x.idx + ',this.checked);"> ' +
      escapeHtml(x.type.label.replace(/\s*\(.*\)\s*$/, '') + ' — ' + overviewRowTitle(x) + (x.inst.data.batiment ? ' (' + x.inst.data.batiment + ')' : '')) + '</label>';
  });
  h += '</div><button type="button" class="btn btn-primary btn-small" style="margin-top:8px;" onclick="state.bilanCtaOuvert=null;render();">' + ICONS.check + ' Terminé</button>';
  return h + '</div>';
}

function bilanCtaCocher(typeId, idx, on) {
  var m = getCurrentMission(), cta = m.installations.cta && m.installations.cta[state.currentInstIndex], local = m.installations[typeId] && m.installations[typeId][idx];
  if (!cta || !local) return;
  var ids = (Array.isArray(cta.data._alimente) ? cta.data._alimente : []).filter(function (x) { return x !== local.id; });
  if (on) ids.push(local.id);
  cta.data._alimente = ids;
  persistMissions();
  render();
}

// Rapport : « 4.4 Bilan d'air neuf des CTA » (seulement si une CTA a des locaux cochés)
function pdfBuildBilansCta(m) {
  var lignes = overviewOrderedItems(m).filter(function (it) { return it.type.id === 'cta'; })
    .map(function (it) { return bilanCta(m, it); }).filter(Boolean);
  if (!lignes.length) return [];
  var content = [{ text: '4.4 BILAN D’AIR NEUF DES CENTRALES DE TRAITEMENT D’AIR', bold: true, color: '#00B0F0', fontSize: 12, margin: [0, 30, 0, 6], pageBreak: 'before', pageOrientation: 'portrait' },
    { text: 'Comparaison de l’air neuf mesuré à chaque CTA avec le besoin réglementaire cumulé des locaux qu’elle alimente (article R4222-6 du Code du travail, selon l’effectif relevé dans chaque local). Constat à titre indicatif : chaque local reste jugé sur ses propres mesures.', fontSize: 8.5, italics: true, margin: [0, 0, 0, 10] }];
  lignes.forEach(function (r) {
    content.push({ text: r.cta.type.label.replace(/\s*\(.*\)\s*$/, '') + ' — ' + overviewRowTitle(r.cta), bold: true, fontSize: 10, margin: [0, 6, 0, 2] });
    content.push({ text: bilanCtaTexte(r), fontSize: 9, margin: [0, 0, 0, 4] });
  });
  return content;
}

// ————————————————————————————————————————————
// Historique des mesures
// ————————————————————————————————————————————

// Mesure suivie pour un type : la première comparée à l'an dernier, sinon le débit du bilan de réseau
function histoChamp(typeId) {
  var pairs = (typeof N1_COMPARISON_FIELDS !== 'undefined' && N1_COMPARISON_FIELDS[typeId]) || [];
  if (pairs.length) return { key: pairs[0].current, n1: pairs[0].n1 };
  var d = (typeof SCHEMA_DEBIT_CHAMPS !== 'undefined' && SCHEMA_DEBIT_CHAMPS[typeId]) || [];
  return d.length ? { key: d[0], n1: null } : null;
}

function histoAnnee(d, m) {
  var t = String((d && (d.date_controle || d.date_mesure)) || (m && (m.dateControle || (m.donneesInternes && m.donneesInternes.datesIntervention))) || '');
  var a = t.match(/(20\d\d)/);
  if (a) return parseInt(a[1], 10);
  var c = m && m.createdAt ? new Date(m.createdAt) : null;
  return c && !isNaN(c.getTime()) ? c.getFullYear() : null;
}

// Visite suivante : l'historique de l'an dernier + sa mesure (appelé par createMissionFromPreviousSite)
function histoPourVisiteSuivante(typeId, src, source) {
  var ch = histoChamp(typeId), out = Array.isArray(src._histo) ? src._histo.slice() : [];
  if (!ch) return out;
  var v = num(src[ch.key]), a = histoAnnee(src, source);
  if (!isNaN(v) && a) {
    out = out.filter(function (p) { return p.a !== a; });
    out.push({ a: a, v: Math.round(v * 100) / 100 });
  }
  return out.sort(function (x, y) { return x.a - y.a; }).slice(-8);
}

function histoCarteHtml(typeId, inst) {
  var ch = histoChamp(typeId);
  if (!ch || !inst) return '';
  var d = inst.data, pts = (Array.isArray(d._histo) ? d._histo : []).map(function (p) { return { lib: String(p.a), v: num(p.v) }; });
  if (!pts.length && ch.n1 && !isNaN(num(d[ch.n1]))) pts.push({ lib: 'N-1', v: num(d[ch.n1]) });
  pts = pts.filter(function (p) { return !isNaN(p.v); });
  if (!pts.length) return '';
  var cur = num(d[ch.key]), m = getCurrentMission();
  pts.push({ lib: String(histoAnnee(d, m) || 'Cette année'), v: isNaN(cur) ? null : cur, courant: true });
  var t = getInstallationType(typeId), f = t.fields.filter(function (x) { return x.key === ch.key; })[0];
  var label = f ? f.label : ch.key, unite = (label.match(/\(([^()]*)\)\s*$/) || [])[1] || '';
  var vals = pts.filter(function (p) { return p.v !== null; }).map(function (p) { return p.v; });
  var max = Math.max.apply(null, vals.concat([1]));
  var W = 300, H = 92, pas = W / pts.length, bw = Math.min(46, pas * 0.6);
  var svg = '<svg viewBox="0 0 ' + W + ' ' + (H + 34) + '" class="histo-svg" role="img" aria-label="Évolution sur les visites">';
  pts.forEach(function (p, i) {
    var x = pas * i + (pas - bw) / 2, hgt = p.v === null ? 0 : Math.max(2, p.v / max * H);
    svg += p.v === null ? '<rect x="' + x + '" y="' + (H - 2) + '" width="' + bw + '" height="2" fill="#c9d4df"/>'
      : '<rect x="' + x + '" y="' + (H - hgt) + '" width="' + bw + '" height="' + hgt + '" rx="3" fill="' + (p.courant ? '#0082DE' : '#9fb7cc') + '"/>';
    svg += '<text x="' + (x + bw / 2) + '" y="' + (H + 14) + '" text-anchor="middle" font-size="11" fill="currentColor">' + escapeHtml(p.lib) + '</text>';
    svg += '<text x="' + (x + bw / 2) + '" y="' + (H + 28) + '" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">' + (p.v === null ? '—' : escapeHtml(frDisplay(String(Math.round(p.v * 100) / 100)))) + '</text>';
  });
  svg += '</svg>';
  return '<div class="card histo-carte"><div class="section-title">Évolution : ' + escapeHtml(label.replace(/\s*\([^()]*\)\s*$/, '')) + (unite ? ' (' + escapeHtml(unite) + ')' : '') + '</div>' + svg + '</div>';
}

console.log('✓ Bilans CTA et historique chargés');
