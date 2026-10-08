// a-propos.js - Écran « À propos » : version, référentiels appliqués, données, bibliothèques
// (chantier du 2026-10-04). But : savoir sur quelle base un avis est rendu, et que les textes sont à jour.
// À tenir à jour à chaque évolution d'un critère (voir NOTICE-TECHNIQUE.md).

var APROPOS = {
  conception: 'Quentin Thomas',
  referent: 'À désigner par la direction technique',
  relectureTextes: '03/10/2026',
  reglementation: [
    ['Code du travail, articles R4212-1 à R4212-7', 'Conception des installations, débits minimaux des locaux sanitaires (R4212-6), notice d’instructions (R4212-7)'],
    ['Code du travail, articles R4222-1 à R4222-26', 'Aération et assainissement des locaux de travail : air neuf (R4222-6, R4222-11), pollution spécifique, recyclage (R4222-8, R4222-9, R4222-14 à R4222-17)'],
    ['Code du travail, article R4222-10', 'Poussières sans effet spécifique : 4 mg/m³ (inhalable) et 0,9 mg/m³ (alvéolaire), depuis le 1er juillet 2023 (décret 2021-1763)'],
    ['Arrêté du 8 octobre 1987', 'Contrôle périodique : dossier de valeurs de référence (art. 2 à 4), contrôles annuels et semestriels'],
    ['Code de la santé publique', 'Emplacements réservés aux fumeurs'],
    ['Règlement sanitaire départemental type, article 64', 'Débits des établissements recevant du public']
  ],
  normes: [
    ['NF EN 14175-4 et XP X15-203', 'Sorbonnes de laboratoire'],
    ['NF EN 16985', 'Cabines de pulvérisation de peinture'],
    ['NF T 35-014', 'Box de préparation des peintures'],
    ['NF EN 62485-3', 'Locaux de charge de batteries d’accumulateurs']
  ],
  guides: [
    ['ED 695', 'Principes généraux de ventilation (2022)'],
    ['ED 657', 'L’assainissement de l’air des locaux de travail (2022)'],
    ['ED 795', 'Sorbonnes de laboratoire'],
    ['ED 750', 'Seconde transformation du bois'],
    ['ED 839', 'Cabines d’application par pulvérisation de produits liquides'],
    ['ED 928', 'Cabines d’application par projection de peintures en poudre'],
    ['ED 906', 'Pulvérisation de produits liquides sur objets lourds ou encombrants'],
    ['ED 651', 'Cuves de traitement de surfaces'],
    ['ED 668', 'Opérations de soudage à l’arc et de coupage'],
    ['ED 768', 'Décapage, désablage, dépolissage au jet libre en cabine'],
    ['ED 972', 'Captage et traitement des aérosols de fluides de coupe'],
    ['ED 6049', 'Poste d’utilisation manuelle de solvants'],
    ['ED 6120', 'Charge des batteries d’accumulateurs au plomb (avril 2018)'],
    ['ED 6246', 'Émissions des moteurs thermiques (février 2021)']
  ],
  bibliotheques: [
    ['pdfmake', 'génération du rapport PDF — licence MIT'],
    ['SheetJS Community Edition', 'lecture des classeurs Rapso et export Excel — licence Apache 2.0'],
    ['Arimo', 'police métriquement compatible Arial — licence Apache 2.0']
  ]
};

var APROPOS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>';

function aproposList(rows) {
  return '<dl class="apropos-list">' + rows.map(function (r) {
    return '<div class="apropos-row"><dt>' + escapeHtml(r[0]) + '</dt><dd>' + escapeHtml(r[1]) + '</dd></div>';
  }).join('') + '</dl>';
}

function renderAPropos() {
  var version = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '';
  var date = (typeof NOUVEAUTES !== 'undefined' && NOUVEAUTES[0]) ? NOUVEAUTES[0].date : '';
  var h = '<button class="back-btn" onclick="state.view=\'home\';render();">' + ICONS.arrowLeft + ' Accueil</button>';
  h += '<div class="card apropos-head"><h1>' + APROPOS_ICON + ' Contrôle Aération</h1>' +
    '<p class="subtitle">Contrôle périodique de l’aération et de l’assainissement des locaux de travail</p>' +
    '<div class="apropos-meta"><span>Version <b>' + escapeHtml(version) + '</b></span>' + (date ? '<span>Mise à jour du <b>' + escapeHtml(date) + '</b></span>' : '') +
    '<span>Textes relus le <b>' + escapeHtml(APROPOS.relectureTextes) + '</b></span></div></div>';

  h += '<div class="section-title">Réglementation appliquée</div><div class="card">' + aproposList(APROPOS.reglementation) + '</div>';
  h += '<div class="section-title">Normes</div><div class="card">' + aproposList(APROPOS.normes) + '</div>';
  h += '<div class="section-title">Guides pratiques de ventilation de l’INRS</div><div class="card">' + aproposList(APROPOS.guides) +
    '<p class="subtitle" style="margin-top:8px;">Les valeurs tirées des guides INRS sont des valeurs recommandées : les fiches le précisent et les avis sont rendus « par rapport aux valeurs recommandées ».</p></div>';
  h += '<div class="section-title">Méthode</div><div class="card"><p class="apropos-text">Les calculs reprennent ceux de l’outil Excel d’origine (Rapso Aération V29) et sont comparés automatiquement à des classeurs Rapso réels. ' +
    'Une valeur n’est jamais jugée sur un seuil sans texte vérifié ; sans règle écrite, l’appli demande un constat au technicien.</p></div>';
  h += '<div class="section-title">Données</div><div class="card"><p class="apropos-text">Les missions et les photos restent sur cet appareil : rien n’est envoyé sur un serveur. ' +
    'Une sauvegarde automatique est enregistrée à chaque installation terminée, et chaque mission peut être exportée en fichier.</p></div>';
  h += '<div class="section-title">Contacts</div><div class="card">' + aproposList([['Conception', APROPOS.conception], ['Référent', APROPOS.referent]]) + '</div>';
  h += '<div class="section-title">Bibliothèques utilisées</div><div class="card">' + aproposList(APROPOS.bibliotheques) + '</div>';
  return h;
}

console.log('✓ Écran À propos chargé');
