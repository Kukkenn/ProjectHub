/* Ustawia motyw i kolor akcentu zanim pojawi się strona (bez mignięcia). Klucze jak w lib.js: ph_settings. */
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('ph_settings') || '{}');
    var root = document.documentElement;
    var theme = s.theme || 'night';
    if (theme === 'auto') theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'night';
    root.setAttribute('data-theme', theme);
    if (s.accent) root.setAttribute('data-accent', s.accent);
    if (s.nav) root.setAttribute('data-nav', s.nav);
    if (s.motion) root.setAttribute('data-motion', s.motion);
    if (s.accent === 'custom' && /^#[0-9a-f]{6}$/i.test(s.accentCustom || '')) {
      root.style.setProperty('--signal', s.accentCustom);
      var n = parseInt(s.accentCustom.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      root.style.setProperty('--on-signal', (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1A1405' : '#FFFFFF');
      root.style.setProperty('--signal-d', 'color-mix(in srgb, ' + s.accentCustom + ' 78%, white)');
    }
  } catch (e) { /* bez zapamiętanych ustawień */ }
})();
