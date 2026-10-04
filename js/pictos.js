// pictos.js - Un pictogramme par type d'installation (chantier esthétique du 2026-10-03)
// Auparavant les 23 types se partageaient 5 icônes génériques (bâtiment, outil, éclair, flacon,
// goutte) : impossible de reconnaître un type d'un coup d'œil dans la sélection ou la vue d'ensemble.
// Même style que la bibliothèque ICONS (trait 2 px, 24 × 24, couleur du texte). Chargé après tous les
// modules qui déclarent des types, il remplace leur `icon` par le pictogramme dédié.

var PICTOS = {
  bureaux: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/>',
  sanitaires: '<path d="M4 10h8a4 4 0 0 1 4 4v1"/><path d="M8 6v4M5 6h6"/><path d="M16 19.5a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3s1.5 2 1.5 3z"/>',
  locaux_fumeurs: '<rect x="2" y="13" width="16" height="4" rx="1"/><path d="M14 13v4M20 13v4M18 6c0 2 2 2 2 4M21 5c0 2 1 2 1 4"/>',
  cta: '<rect x="2" y="6" width="20" height="12" rx="1"/><circle cx="15" cy="12" r="3"/><path d="M6 9v6M9 9v6"/>',
  extracteur: '<circle cx="12" cy="12" r="9"/><path d="M12 12c0-3 1-5 3-5M12 12c3 0 5 1 5 3M12 12c0 3-1 5-3 5M12 12c-3 0-5-1-5-3"/>',
  erp: '<path d="M3 21V9l9-5 9 5v12"/><circle cx="12" cy="12" r="2"/><path d="M8 21v-2a4 4 0 0 1 8 0v2"/>',
  sorbonnes: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18"/><path d="M10 12v3l-2 4h8l-2-4v-3"/>',
  hottes: '<path d="M9 3h6v4l6 6H3l6-6z"/><path d="M3 13v2h18v-2M7 19h10"/>',
  bras_aspiration: '<circle cx="5" cy="20" r="1.5"/><path d="M5 18.5V12l7-6 6 4"/><path d="M16 9l4 5-3 2"/>',
  cabines_peinture: '<path d="M4 9h9v4H4z"/><path d="M8 13v6h3M13 10h3"/><path d="M18 7l3-2M18 11h3M18 15l3 2"/>',
  installations_diverses: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  local_specifique: '<path d="M3 21V5h12v16"/><path d="M15 12h6M18 9l3 3-3 3M7 9h4"/>',
  recyclage: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  fluide_coupe: '<path d="M8 3h8v6H8z"/><path d="M12 9v6l-1 2"/><path d="M6 18a2 2 0 0 0 4 0c0-1.5-2-3.5-2-3.5S6 16.5 6 18z"/><path d="M15 21h6"/>',
  poste_solvant: '<path d="M10 2h4v4l3 3v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l3-3z"/><path d="M7 13h10"/>',
  decapage: '<path d="M3 10h8v4H3z"/><path d="M11 11l4-1v4l-4-1"/><path d="M18 8h.01M21 10h.01M19 12h.01M21 14h.01M18 16h.01"/>',
  gaz_echappement: '<path d="M3 13l2-5h10l3 5"/><rect x="2" y="13" width="17" height="4" rx="1"/><circle cx="6" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/><path d="M20 15h2"/>',
  menuiserie: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4l2-2M20 12l2 2M12 20l-2 2M4 12l-2-2"/>',
  menuiserie_bis: '<path d="M12 3l6 8H6z"/><path d="M12 8l7 9H5z"/><path d="M12 17v4"/>',
  box_peinture: '<path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M5 8l2-4h10l2 4M12 12v4"/>',
  torches_aspirantes: '<path d="M3 21l7-7"/><path d="M10 14l6-6 3 3-6 6z"/><path d="M19 11l2 2M17 3l1 3M21 6l-3 1"/>',
  locaux_charge: '<rect x="3" y="7" width="16" height="12" rx="1"/><path d="M19 11h2v4h-2M8 13h4M10 11v4"/>',
  tts: '<path d="M3 8v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8"/><path d="M3 12c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/><path d="M8 4v4M16 4v4"/>'
};

(function applyPictos() {
  INSTALLATION_TYPES.forEach(function (t) {
    if (!PICTOS[t.id]) return;
    var name = 'picto_' + t.id;
    ICONS[name] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + PICTOS[t.id] + '</svg>';
    t.icon = name;
  });
})();

console.log('✓ Pictogrammes des types chargés');
