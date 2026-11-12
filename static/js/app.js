/* app.js: hash router, main navigation, search, logging out and app start. */
(function () {
  'use strict';
  const PH = window.PH;
  const { $, $$, esc } = PH;
  const S = PH.state;
  const api = PH.api;
  PH.view = $('#view');

  const NAV = [['library', 'Library', 'grid', '#/'], ['tasks', 'Tasks', 'tasks', '#/zadania'], ['archive', 'Archive', 'archive', '#/archiwum'], ['settings', 'Settings', 'sliders', '#/ustawienia']];
  const TITLES = { library: 'ProjectHub', tasks: 'Tasks · ProjectHub', archive: 'Archive · ProjectHub', settings: 'Settings · ProjectHub' };

  /* ---------- router ---------- */

  function parse(hash) {
    const parts = String(hash || '').replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { name: 'library' };
    if (parts[0] === 'zadania') return { name: 'tasks' };
    if (parts[0] === 'archiwum') return { name: 'archive' };
    if (parts[0] === 'ustawienia') return { name: 'settings' };
    if (parts[0] === 'project' && parts[1]) return { name: 'project', id: parts[1], tab: parts[2] };
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

  /* ---------- main navigation ---------- */

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

  /* ---------- top: search and buttons ---------- */

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
    try { await api.logout(); } catch (err) { /* we go back to the login page either way */ }
    location.href = 'login.html';
  });

  /* ---------- automatic log out after inactivity ---------- */

  let idleT = 0, lastArm = 0;
  function armIdle(force) {
    const now = Date.now();
    if (!force && now - lastArm < 1000) return;
    lastArm = now;
    clearTimeout(idleT);
    const m = PH.settings.autoLogout;
    if (!m) return;
    idleT = setTimeout(async () => {
      try { await api.logout(); } catch (err) { /* same as above */ }
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
      if (st.username) $('#logoutLbl').textContent = 'Log out (' + st.username + ')';
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
      PH.view.innerHTML = '<div class="page"><div class="empty"><h2>Could not load the catalog</h2><p>' + esc(err.message || 'Unknown error.') +
        '</p><div class="empty-actions"><button class="btn btn-primary" type="button" id="btnRetry">Try again</button></div></div></div>';
      $('#btnRetry').addEventListener('click', () => location.reload());
    }
  }
  init();
})();