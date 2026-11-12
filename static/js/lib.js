/* lib.js: shared utilities: settings, icons, project data, dialogs, menus, animations. */
(function () {
  'use strict';
  const PH = (window.PH = window.PH || {});
  PH.api = window.PH_API;
  PH.views = {};

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? few : many;
  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  const uid = () => Math.random().toString(36).slice(2, 10);
  Object.assign(PH, { $, $$, esc, plural, norm, uid });

  /* ---------- icons ---------- */

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
    tasks: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
    sliders: '<path d="M4 7h9M18 7h2M4 17h2M11 17h9"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="8.5" cy="17" r="2.3"/>',
    scan: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="2.5"/><path d="m14 15 2.2 2.2"/>',
    backup: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"/>',
    logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/>',
    cmd: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    play: '<path d="M7 5v14l12-7z"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
    note: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5M14 3v5h5"/>',
    book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    disk: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="m4 8 8 4 8-4M12 12v8"/>',
    flag: '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    link: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    upload: '<path d="M12 16V5m0 0-4 4m4-4 4 4M5 19h14"/>'
  };
  PH.icon = (name, cls) => '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  /* swaps icons into static HTML: <span class="ico-slot" data-icon="plus"></span> */
  PH.fillIcons = function (root) {
    $$('.ico-slot[data-icon]', root || document).forEach(s => { s.outerHTML = PH.icon(s.dataset.icon); });
  };

  /* ---------- settings ---------- */

  const SKEY = 'ph_settings';
  let reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* same as above */ }
  const DEFAULTS = {
    theme: 'night', accentCustom: '#FFB65C', nav: 'top', accent: 'amber', density: 'normal', motion: reduced ? 'low' : 'full', tilt: true,
    sort: 'manual', importMode: 'path', favTop: true, showSize: true, tabDefault: 'przeglad', confirmDelete: true,
    backupDest: '', backupExclude: ['node_modules', '.venv', '__pycache__'], backupWarnDays: 14,
    autoLogout: 0, notesMode: 'split', language: 'en'
  };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SKEY) || '{}') || {}; } catch (e) { saved = {}; }
  PH.settings = Object.assign({}, DEFAULTS, saved);
  PH.DEFAULTS = DEFAULTS;
  PH.features = { run: true, scan: true, localPaths: true, openFolder: true, backupToPath: true, upload: false, preview: false };
  PH.limits = { quota: 0, maxFile: 0, maxFiles: 0, maxZip: 0 };
  PH.mode = 'demo';
  try {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (PH.settings.theme === 'auto') PH.applySettings(); });
  } catch (e) { /* old browsers */ }

  PH.applySettings = function () {
    const d = document.documentElement, s = PH.settings;
    d.dataset.nav = s.nav;
    d.dataset.accent = s.accent;
    d.dataset.motion = s.motion;
    let theme = s.theme;
    if (theme === 'auto') {
      let light = false;
      try { light = matchMedia('(prefers-color-scheme: light)').matches; } catch (e) { /* same as above */ }
      theme = light ? 'light' : 'night';
    }
    d.dataset.theme = theme;
    ['--signal', '--on-signal', '--signal-d'].forEach(v => d.style.removeProperty(v));
    if (s.accent === 'custom' && /^#[0-9a-f]{6}$/i.test(s.accentCustom || '')) {
      const n = parseInt(s.accentCustom.slice(1), 16), lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
      d.style.setProperty('--signal', s.accentCustom);
      d.style.setProperty('--on-signal', lum > 150 ? '#1A1405' : '#FFFFFF');
      d.style.setProperty('--signal-d', 'color-mix(in srgb, ' + s.accentCustom + ' 78%, white)');
    }
    d.style.setProperty('--card-min', { compact: '236px', normal: '300px', roomy: '380px' }[s.density] || '300px');
  };
  /* settings are also saved on the server (per account) so they survive a port, browser or window change */
  let pushTimer = null;
  function pushSettings() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { try { PH.api.saveSettings(PH.settings).catch(() => {}); } catch (e) { /* demo mode */ } }, 500);
  }
  PH.loadServerSettings = async function () {
    try {
      const r = await PH.api.getSettings();
      if (r && r.settings) {
        PH.settings = Object.assign({}, DEFAULTS, r.settings);
        try { localStorage.setItem(SKEY, JSON.stringify(PH.settings)); } catch (e) { /* same as above */ }
        PH.applySettings();
      } else if (Object.keys(saved).length) {
        pushSettings();                      // first time: send what was saved in the browser
      }
    } catch (e) { /* no server: keep the browser settings */ }
  };
  PH.setSetting = function (k, v) {
    PH.settings[k] = v;
    try { localStorage.setItem(SKEY, JSON.stringify(PH.settings)); } catch (e) { /* same as above */ }
    pushSettings();
    PH.applySettings();
    document.dispatchEvent(new CustomEvent('ph:settings', { detail: { key: k } }));
  };
  PH.resetSettings = function () {
    PH.settings = Object.assign({}, DEFAULTS);
    try { localStorage.removeItem(SKEY); } catch (e) { /* same as above */ }
    pushSettings();
    PH.applySettings();
    document.dispatchEvent(new CustomEvent('ph:settings', { detail: { key: '*' } }));
  };
  PH.fx = () => PH.settings.motion === 'full';
  PH.anim = () => PH.settings.motion !== 'off';
  PH.applySettings();

  /* ---------- constants and formatting ---------- */

  PH.STATUS = {
    idea: { label: 'Idea', c: 'var(--c4)' },
    active: { label: 'In progress', c: 'var(--c6)' },
    paused: { label: 'Paused', c: 'var(--c5)' },
    done: { label: 'Done', c: 'var(--c3)' }
  };
  PH.STATUS_ORDER = ['idea', 'active', 'paused', 'done'];
  PH.TASK = { todo: 'To do', doing: 'In progress', done: 'Done' };
  PH.TASK_ORDER = ['todo', 'doing', 'done'];

  let catColors = {};
  try { catColors = JSON.parse(localStorage.getItem('ph_catcolors') || '{}') || {}; } catch (e) { catColors = {}; }
  PH.tabVar = function (name) {
    const key = String(name || 'Other');
    if (!(key in catColors)) {
      const used = Object.values(catColors);
      let i = 0;
      while (i < 8 && used.indexOf(i) >= 0) i++;
      catColors[key] = i < 8 ? i : used.length % 8;
      try { localStorage.setItem('ph_catcolors', JSON.stringify(catColors)); } catch (e) { /* same as above */ }
    }
    return 'var(--c' + catColors[key] + ')';
  };

  /* Project color and icon: custom ones, falling back to the category color and initials. */
  PH.tabStyle = function (p) {
    if (p && /^#[0-9a-f]{6}$/i.test(p.color || '')) {
      const n = parseInt(p.color.slice(1), 16), lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
      return '--tab:' + p.color + ';--on-tab:' + (lum > 150 ? '#14112A' : '#FFFFFF');
    }
    return '--tab:' + PH.tabVar(p ? p.category : 'Other');
  };
  PH.glyph = function (p) { return p && p.icon ? p.icon : PH.initials(p ? p.name : '?'); };

  PH.initials = function (name) {
    const words = String(name).replace(/\([^)]*\)/g, ' ').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const a = words[0] ? Array.from(words[0])[0] : '?';
    const b = words[1] ? Array.from(words[1])[0] : (words[0] ? Array.from(words[0])[1] || '' : '');
    return (a + b).toUpperCase();
  };

  PH.fmtSize = function (bytes) {
    if (bytes == null) return '';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = bytes, i = 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return v.toLocaleString('en-US', { maximumFractionDigits: v >= 100 || i === 0 ? 0 : 1 }) + ' ' + u[i];
  };
  PH.fmtDate = iso => new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  PH.daysAgo = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null;
  PH.ago = function (iso) {
    const d = PH.daysAgo(iso);
    if (d === null) return '';
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 31) return d + ' days ago';
    const m = Math.floor(d / 30);
    return m < 12 ? m + ' ' + plural(m, 'month', 'months', 'months') + ' ago' : 'over a year ago';
  };
  PH.backupInfo = function (p) {
    const d = PH.daysAgo(p.backedUpAt);
    if (d === null) return { cls: 'none', text: 'no backup' };
    if (d <= 0) return { cls: 'ok', text: 'backed up today' };
    return { cls: d <= PH.settings.backupWarnDays ? 'ok' : 'old', text: d === 1 ? 'backed up yesterday' : 'backup ' + d + ' days ago' };
  };
  PH.shortPath = function (p) {
    const parts = p.split(/[\\/]+/).filter(Boolean);
    return parts.length <= 2 ? p : '…\\' + parts.slice(-2).join('\\');
  };
  PH.cleanPath = s => s.trim().replace(/^["']+|["']+$/g, '').trim();
  PH.normPath = s => s.trim().replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();

  /* ---------- project data ---------- */

  PH.state = {
    projects: [], query: '', category: null, techs: new Set(), statuses: new Set(), noBackup: false, firstPaint: true
  };
  const S = PH.state;

  PH.normProject = function (p) {
    const o = Object.assign({
      description: '', notes: '', category: 'Other', tech: [], tags: [], images: [], commands: [], tasks: [], docs: [],
      favorite: false, archived: false, status: 'active', sizeBytes: null, backedUpAt: null
    }, p);
    ['tech', 'tags', 'images', 'commands', 'tasks', 'docs'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
    if (!PH.STATUS[o.status]) o.status = 'active';
    return o;
  };
  PH.find = id => S.projects.find(p => p.id === id);
  PH.replaceProject = function (raw) {
    const p = PH.normProject(raw);
    const i = S.projects.findIndex(x => x.id === p.id);
    if (i >= 0) S.projects[i] = p; else S.projects.unshift(p);
    return p;
  };
  PH.patch = async function (id, fields, opts) {
    opts = opts || {};
    const cur = PH.find(id);
    if (!cur) throw new Error('Project not found.');
    const prev = {};
    if (opts.optimistic) {
      Object.keys(fields).forEach(k => { prev[k] = cur[k]; });
      Object.assign(cur, fields);
    }
    try {
      const upd = await PH.api.patchProject(id, fields);
      return PH.replaceProject(upd);
    } catch (err) {
      if (opts.optimistic) Object.assign(cur, prev);
      throw err;
    }
  };
  /* called after every data change: refreshes the active view and navigation */
  PH.dataChanged = function () {
    if (PH.updateNav) PH.updateNav();
    if (PH.viewRefresh) PH.viewRefresh();
  };
  PH.onLeaveFns = [];
  PH.onLeave = fn => { PH.onLeaveFns.push(fn); };

  /* ---------- messages ---------- */

  let toastTimer;
  PH.toast = function (msg, kind) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('error', kind === 'error');
    try { if (!t.matches(':popover-open')) t.showPopover(); } catch (e) { /* old browser */ }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { try { t.hidePopover(); } catch (e) { /* same as above */ } }, kind === 'error' ? 6500 : 3200);
  };
  PH.showErr = function (sel, msg) {
    const el = $(sel);
    el.textContent = msg;
    el.hidden = !msg;
  };
  PH.withBusy = async function (btn, label, fn) {
    const old = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = label;
    try { return await fn(); }
    catch (err) { PH.toast(err.message || 'Something went wrong.', 'error'); }
    finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = old; } }
  };

  PH.confirm = function (title, msg, okLabel) {
    return new Promise(resolve => {
      const d = $('#confirmDlg');
      $('#confirmTitle').textContent = title;
      $('#confirmMsg').textContent = msg;
      $('#confirmOk').textContent = okLabel;
      d.returnValue = '';
      d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
      d.showModal();
    });
  };
  PH.confirmDelete = async function (title, msg, okLabel) {
    return PH.settings.confirmDelete ? PH.confirm(title, msg, okLabel) : true;
  };
  PH.prompt = function (title, label, value, okLabel, secret) {
    return new Promise(resolve => {
      const d = $('#promptDlg'), input = $('#promptInput');
      $('#promptTitle').textContent = title;
      $('#promptLabel').textContent = label;
      $('#promptOk').textContent = okLabel || 'Save';
      input.type = secret ? 'password' : 'text';
      input.autocomplete = secret ? 'current-password' : 'off';
      input.value = value || '';
      d.returnValue = '';
      d.addEventListener('close', () => { const v = secret ? input.value : input.value.trim(); input.type = 'text'; input.value = ''; resolve(d.returnValue === 'ok' && v ? v : null); }, { once: true });
      d.showModal();
      input.focus();
      input.select();
    });
  };

  /* ---------- context menu ---------- */

  let openMenuEl = null, menuOff = null;
  PH.closeMenu = function () {
    if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; }
    if (menuOff) { menuOff(); menuOff = null; }
  };
  PH.menu = function (anchor, items) {
    PH.closeMenu();
    const m = document.createElement('div');
    m.className = 'menu';
    m.setAttribute('role', 'menu');
    m.innerHTML = items.map((it, i) => it.sep ? '<hr>' :
      '<button type="button" role="menuitem" class="menu-it' + (it.danger ? ' danger' : '') + '" data-i="' + i + '">' +
      (it.icon ? PH.icon(it.icon) : '') + '<span>' + esc(it.label) + '</span>' + (it.hint ? '<kbd>' + esc(it.hint) + '</kbd>' : '') + '</button>').join('');
    (anchor.closest('dialog') || document.body).appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.minWidth = Math.max(r.width, 210) + 'px';
    let left = Math.min(r.left, innerWidth - m.offsetWidth - 12);
    if (r.right - m.offsetWidth > 12 && r.left + m.offsetWidth > innerWidth - 12) left = r.right - m.offsetWidth;
    let top = r.bottom + 6;
    if (top + m.offsetHeight > innerHeight - 12) top = Math.max(12, r.top - m.offsetHeight - 6);
    m.style.left = Math.max(12, left) + 'px';
    m.style.top = top + 'px';
    openMenuEl = m;
    const btns = $$('.menu-it', m);
    if (btns[0]) btns[0].focus();
    m.addEventListener('click', e => {
      const b = e.target.closest('.menu-it');
      if (!b) return;
      const it = items[+b.dataset.i];
      PH.closeMenu();
      if (it && it.onClick) it.onClick();
    });
    const onDown = e => { if (!m.contains(e.target) && !anchor.contains(e.target)) PH.closeMenu(); };
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); PH.closeMenu(); anchor.focus(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = btns.indexOf(document.activeElement);
        btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length].focus();
      }
    };
    setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0);
    document.addEventListener('keydown', onKey, true);
    menuOff = () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey, true); };
  };

  /* ---------- tags (chip field) ---------- */

  PH.makeTags = function (root, onChange) {
    const list = $('.tag-list', root), input = $('input', root);
    let items = [];
    const paint = () => {
      list.innerHTML = items.map((t, i) =>
        '<li><span>' + esc(t) + '</span><button type="button" data-rm="' + i + '" aria-label="Remove ' + esc(t) + '">×</button></li>').join('');
    };
    const changed = () => { if (onChange) onChange(items.slice()); };
    const add = raw => {
      raw.split(',').map(s => s.trim()).filter(Boolean).forEach(t => {
        if (!items.some(x => x.toLowerCase() === t.toLowerCase())) items.push(t);
      });
      input.value = '';
      paint();
      changed();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input.value); }
      else if (e.key === 'Backspace' && !input.value && items.length) { items.pop(); paint(); changed(); }
    });
    input.addEventListener('blur', () => { if (input.value.trim()) add(input.value); });
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-rm]');
      if (b) { items.splice(+b.dataset.rm, 1); paint(); changed(); input.focus(); }
      else if (!e.target.closest('input')) input.focus();
    });
    return {
      get() { if (input.value.trim()) add(input.value); return items.slice(); },
      set(arr) { items = arr.slice(); input.value = ''; paint(); }
    };
  };

  /* ---------- animations ---------- */

  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  PH.EASE = EASE;

  /* FLIP: remembers element positions, applies the change and smoothly moves them to their new spots */
  PH.flip = function (roots, mutate, sel, key) {
    sel = sel || '.tile';
    key = key || 'id';
    const rs = () => roots.map(r => (typeof r === 'string' ? $(r) : r)).filter(Boolean);
    const before = new Map();
    if (PH.anim()) rs().forEach(r => $$(sel, r).forEach(t => before.set(t.dataset[key], t.getBoundingClientRect())));
    mutate();
    if (!PH.anim()) return;
    let n = 0;
    rs().forEach(r => $$(sel, r).forEach(t => {
      const b = before.get(t.dataset[key]);
      if (b) {
        const a = t.getBoundingClientRect();
        const dx = b.left - a.left, dy = b.top - a.top;
        if (Math.abs(dx) + Math.abs(dy) > 2) t.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 420, easing: EASE });
      } else if (before.size) {
        t.animate([{ opacity: 0, transform: 'scale(.94) translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: Math.min(n++, 10) * 28, easing: EASE, fill: 'backwards' });
      }
    }));
  };

  PH.countUp = function (el, to, ms) {
    if (!el) return;
    if (!PH.anim() || to === 0) { el.textContent = to; return; }
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (from === to) { el.textContent = to; return; }
    const t0 = performance.now(), dur = ms || 700;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && el.isConnected) requestAnimationFrame(step); else el.textContent = to;
    };
    requestAnimationFrame(step);
  };

  PH.confetti = function (x, y) {
    if (!PH.fx()) return;
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    cv.width = innerWidth; cv.height = innerHeight;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cols = ['#FFB65C', '#8E9BFF', '#FF8FA3', '#6EE0B8', '#C79BFF', '#F2E072', '#6CC9F2'];
    const ps = Array.from({ length: 90 }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 6 + Math.random() * 9;
      return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] };
    });
    const t0 = performance.now();
    const tick = now => {
      const t = now - t0;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => {
        p.vy += 0.32; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / 1900);
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (t < 1900) requestAnimationFrame(tick); else cv.remove();
    };
    requestAnimationFrame(tick);
  };

  /* folders tilting toward the cursor */
  let lastTilt = null;
  const resetTilt = el => { if (el) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.classList.remove('tilting'); } };
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const t = (PH.fx() && PH.settings.tilt) ? e.target.closest && e.target.closest('.lib .tile:not(.dragging)') : null;
    if (lastTilt && lastTilt !== t) resetTilt(lastTilt);
    lastTilt = t;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    t.classList.add('tilting');
    t.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
    t.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
    t.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(0) + '%');
    t.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(0) + '%');
  });
  document.addEventListener('pointerleave', () => { resetTilt(lastTilt); lastTilt = null; }, true);

  /* ---------- photo lightbox ---------- */

  const lb = { imgs: [], i: 0 };
  function showLb() {
    const im = lb.imgs[lb.i];
    $('#lbImg').src = im.url;
    $('#lbImg').alt = im.name;
    $('#lbCap').textContent = im.name + ' (' + (lb.i + 1) + ' of ' + lb.imgs.length + ')';
    $$('[data-lb="prev"], [data-lb="next"]').forEach(b => { b.hidden = lb.imgs.length < 2; });
  }
  function stepLb(dir) {
    if (lb.imgs.length < 2) return;
    lb.i = (lb.i + dir + lb.imgs.length) % lb.imgs.length;
    showLb();
  }
  PH.openLightbox = function (imgs, i) {
    lb.imgs = imgs; lb.i = i;
    showLb();
    const d = $('#lightbox');
    if (!d.open) d.showModal();
  };
  $('#lightbox').addEventListener('click', e => {
    const b = e.target.closest('[data-lb]');
    if (b) {
      if (b.dataset.lb === 'close') $('#lightbox').close();
      else stepLb(b.dataset.lb === 'next' ? 1 : -1);
    } else if (e.target === $('#lightbox') || e.target.classList.contains('lb-stage')) $('#lightbox').close();
  });
  $('#lightbox').addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') stepLb(1);
    if (e.key === 'ArrowLeft') stepLb(-1);
  });

  /* closing dialogs: button, backdrop */
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d && d.id !== 'confirmDlg' && d.id !== 'promptDlg' && d.id !== 'lightbox') d.close();
      if (e.target.closest('[data-close]')) d.close();
    });
  });

  /* copying code blocks in Markdown content */
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const code = b.closest('.code') && $('code', b.closest('.code'));
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent);
      b.textContent = 'Copied';
      setTimeout(() => { b.textContent = 'Copy'; }, 1400);
    } catch (err) { PH.toast('Could not copy. Select the code and copy it manually.', 'error'); }
  });

  PH.copy = async function (text, okMsg) {
    try { await navigator.clipboard.writeText(text); PH.toast(okMsg || 'Copied'); }
    catch (err) { PH.toast('Could not copy. Select the text and copy it manually.', 'error'); }
  };

  PH.debounce = function (fn, ms) {
    let t;
    const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    f.flush = (...a) => { clearTimeout(t); fn(...a); };
    f.cancel = () => clearTimeout(t);
    return f;
  };
})();