/* app.js: router (hash), nawigacja główna, wyszukiwarka, wylogowanie i start aplikacji. */
(function () {
  'use strict';
  const PH = window.PH;
  const { $, $$, esc } = PH;
  const S = PH.state;
  const api = PH.api;
  PH.view = $('#view');

  const NAV = [['library', 'Biblioteka', 'grid', '#/'], ['tasks', 'Zadania', 'tasks', '#/zadania'], ['archive', 'Archiwum', 'archive', '#/archiwum'], ['settings', 'Ustawienia', 'sliders', '#/ustawienia']];
  const TITLES = { library: 'ProjectHub', tasks: 'Zadania · ProjectHub', archive: 'Archiwum · ProjectHub', settings: 'Ustawienia · ProjectHub' };

  /* ---------- router ---------- */

  function parse(hash) {
    const parts = String(hash || '').replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { name: 'library' };
    if (parts[0] === 'zadania') return { name: 'tasks' };
    if (parts[0] === 'archiwum') return { name: 'archive' };
    if (parts[0] === 'ustawienia') return { name: 'settings' };
    if (parts[0] === 'projekt' && parts[1]) return { name: 'project', id: parts[1], tab: parts[2] };
    return { name: 'library' };
  }

  PH.go = function (hash, opts) {
    if (opts && opts.doc) PH.pendingDoc = opts.doc;
    if (location.hash === hash) render(); else location.hash = hash;
  };

  let first = true;
  function render() {
    const next = parse(location.hash), prev = PH.route;
    if (prev && prev.name === 'library') PH.libScroll = window.scrollY;
    PH.closeMenu();
    PH.onLeaveFns.splice(0).forEach(f => { try { f(); } catch (e) { console.error(e); } });
    next.restore = !!(prev && prev.name === 'project' && next.name === 'library');
    if (next.name === 'project' && PH.pendingDoc) { next.doc = PH.pendingDoc; PH.pendingDoc = null; }
    PH.route = next;

    const view = PH.view;
    view.classList.remove('view-enter');
    view.dataset.route = next.name;
    PH.views[next.name](next);
    void view.offsetWidth;
    view.classList.add('view-enter');
    window.scrollTo(0, next.restore ? (PH.libScroll || 0) : 0);

    const p = next.name === 'project' ? PH.find(next.id) : null;
    document.title = p ? p.name + ' · ProjectHub' : (TITLES[next.name] || 'ProjectHub');
    PH.updateNav();
    const ae = document.activeElement;
    if (!first && (!ae || ae === document.body || ae.closest('.mainnav') || ae.closest('.view'))) view.focus({ preventScroll: true });
    first = false;
  }
  window.addEventListener('hashchange', render);

  /* ---------- nawigacja główna ---------- */

  let navCache = '';
  PH.updateNav = function () {
    const live = S.projects.filter(p => !p.archived);
    const open = live.reduce((n, p) => n + p.tasks.filter(t => t.state !== 'done').length, 0);
    const arch = S.projects.length - live.length;
    let cur = PH.route ? PH.route.name : 'library';
    if (cur === 'project') { const p = PH.find(PH.route.id); cur = p && p.archived ? 'archive' : 'library'; }
    const html = NAV.map(n => {
      const count = n[0] === 'tasks' ? open : (n[0] === 'archive' ? arch : 0);
      return '<a class="navit' + (n[0] === cur ? ' on' : '') + '" href="' + n[3] + '"' + (n[0] === cur ? ' aria-current="page"' : '') + '>' + PH.icon(n[2]) +
        '<span class="nl">' + n[1] + '</span>' + (count ? '<em class="badge">' + count + '</em>' : '') + '</a>';
    }).join('');
    if (html !== navCache) { navCache = html; $('#topNav').innerHTML = html; $('#sideNav').innerHTML = html; }
  };

  /* ---------- góra: wyszukiwarka i przyciski ---------- */

  $('#q').addEventListener('input', e => {
    S.query = e.target.value;
    if (!PH.route || PH.route.name !== 'library') PH.go('#/'); else PH.libRerender();
  });
  $('#q').addEventListener('keydown', e => {
    if (e.key === 'Escape' && e.target.value) { e.target.value = ''; S.query = ''; if (PH.route && PH.route.name === 'library') PH.libRerender(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    $('#q').focus();
  });

  $('#btnAdd').addEventListener('click', () => PH.openForm(null));
  $('#btnScan').addEventListener('click', () => PH.openScan());
  $('#btnBackup').addEventListener('click', () => PH.openBackup());
  $('#btnLogout').addEventListener('click', async () => {
    try { await api.logout(); } catch (err) { /* i tak wracamy do logowania */ }
    location.href = 'login.html';
  });

  /* ---------- automatyczne wylogowanie po bezczynności ---------- */

  let idleT = 0, lastArm = 0;
  function armIdle(force) {
    const now = Date.now();
    if (!force && now - lastArm < 1000) return;
    lastArm = now;
    clearTimeout(idleT);
    const m = PH.settings.autoLogout;
    if (!m) return;
    idleT = setTimeout(async () => {
      try { await api.logout(); } catch (err) { /* j.w. */ }
      location.href = 'login.html';
    }, m * 60000);
  }
  ['pointerdown', 'keydown', 'scroll', 'pointermove'].forEach(ev => document.addEventListener(ev, () => armIdle(false), { passive: true, capture: true }));
  document.addEventListener('ph:settings', () => armIdle(true));

  /* ---------- start ---------- */

  async function init() {
    PH.fillIcons();
    try {
      const st = await api.authStatus();
      if (!st.authenticated) { location.replace('login.html'); return; }
      if (st.username) $('#logoutLbl').textContent = 'Wyloguj (' + st.username + ')';
      PH.features = Object.assign({}, PH.features, st.features || {});
      PH.limits = st.limits || PH.limits;
      PH.mode = st.mode || 'demo';
      PH.usage = st.usage || 0;
      PH.username = st.username || '';
      document.documentElement.dataset.mode = PH.mode;
      $('#btnScan').hidden = !PH.features.scan;
      await PH.loadServerSettings();
      S.projects = (await api.listProjects()).map(PH.normProject);
      armIdle(true);
      render();
    } catch (err) {
      PH.view.innerHTML = '<div class="page"><div class="empty"><h2>Nie udało się wczytać katalogu</h2><p>' + esc(err.message || 'Nieznany błąd.') +
        '</p><div class="empty-actions"><button class="btn btn-primary" type="button" id="btnRetry">Spróbuj ponownie</button></div></div></div>';
      $('#btnRetry').addEventListener('click', () => location.reload());
    }
  }
  init();
})();