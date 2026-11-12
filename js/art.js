/* AIR NOIR — aircraft artwork from the client's photograph (nude beige long-range jet, top view, nose up).
   jetTop(): the photographic cut-out.  blueprint(): floor plan traced from the same outline, so the two align. */
(function () {
  // Photo geometry: 756 x 780 units; cabin runs roughly x 345–410, y 90–430.
  function jetTop(opts) {
    opts = opts || {};
    const src = opts.small ? 'assets/jet-top-sm.webp' : 'assets/jet-top.webp';
    return `<img class="jet-img ${opts.cls || ''}" src="${src}" alt="${opts.label || 'Nude beige long-range business jet, top view'}" width="2400" height="2479" decoding="async" ${opts.small ? 'loading="lazy"' : ''}>`;
  }

  // Floor plan drawn from the photo's own outline (assets/jet-blueprint.webp) and used as a mask,
  // so its colour follows CSS `color` and can shift from gold to ink during the hand-off.
  function blueprint(opts) {
    opts = opts || {};
    return `<div class="bp-mask ${opts.cls || ''}" role="img" aria-label="Cabin floor plan: club, conference, divan, stateroom and lavatory"></div>`;
  }

  // Small gold line icons for the experience section.
  const icons = {
    dining: '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="60" cy="64" r="30"/><circle cx="60" cy="64" r="20"/><path d="M18 34v22m-6-22v14a6 6 0 0 0 12 0V34M18 56v40M102 34c-8 6-8 26 0 30v32"/></svg>',
    concierge: '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="60" cy="60" r="40"/><path d="M60 28v32l20 12"/><path d="M60 14v6M60 100v6M14 60h6M100 60h6"/></svg>',
    pets: '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.2"><ellipse cx="60" cy="76" rx="20" ry="17"/><ellipse cx="34" cy="50" rx="8" ry="11"/><ellipse cx="86" cy="50" rx="8" ry="11"/><ellipse cx="48" cy="32" rx="7" ry="10"/><ellipse cx="72" cy="32" rx="7" ry="10"/></svg>',
    suite: '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="16" y="50" width="88" height="34" rx="4"/><path d="M16 84v12M104 84v12M16 62h88"/><rect x="24" y="40" width="26" height="14" rx="4"/><path d="M70 22a18 18 0 1 0 22 22 14 14 0 1 1-22-22z"/></svg>'
  };

  window.AN_ART = { jetTop, blueprint, icons };
})();
