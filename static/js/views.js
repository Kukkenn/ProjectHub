/* views.js: tasks board across all projects, archive and advanced settings. */
(function () {
  'use strict';
  const PH = window.PH;
  const { $, $$, esc, plural } = PH;
  const icon = PH.icon;
  const S = PH.state;

  /* =============== TASKS (kanban) =============== */

  const COLS = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];

  PH.views.tasks = function () {
    const view = PH.view;
    let filter = PH.taskFilter || '';
    let dragged = null;

    const live = () => S.projects.filter(p => !p.archived);
    const allTasks = () => {
      const out = [];
      live().forEach(p => {
        if (filter && p.id !== filter) return;
        p.tasks.forEach(t => out.push({ t, p }));
      });
      return out;
    };

    view.innerHTML =
      '<div class="tasks page"><section class="hero"><div><h1>Tasks</h1><div class="status" id="tkStatus"></div></div>' +
      '<div class="hero-tools"><label class="sort">Project <select id="tkProj"></select></label></div></section>' +
      '<form class="tk-add wide" id="tkAddForm"><select id="tkAddProj" aria-label="Project for the new task"></select>' +
      '<input id="tkAddIn" placeholder="New task and Enter" maxlength="200" autocomplete="off" aria-label="New task text"><button class="btn btn-primary" type="submit">Add task</button></form>' +
      '<div class="board" id="board"></div></div>';

    function fillSelects() {
      const ps = live();
      $('#tkProj').innerHTML = '<option value="">All projects</option>' + ps.map(p => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>').join('');
      $('#tkProj').value = filter;
      const keep = $('#tkAddProj').value;
      $('#tkAddProj').innerHTML = ps.map(p => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>').join('');
      $('#tkAddProj').value = filter || (ps.some(p => p.id === keep) ? keep : (ps[0] ? ps[0].id : ''));
    }

    function card(t, p) {
      return '<article class="kcard" draggable="true" data-id="' + esc(t.id) + '" data-p="' + esc(p.id) + '" style="' + PH.tabStyle(p) + '">' +
        '<p class="kc-text">' + esc(t.text) + '</p>' +
        '<div class="kc-meta"><button type="button" class="kc-proj" data-act="kc-open" title="Open project">' + esc(p.name) + '</button><span class="kc-btns">' +
        (t.state !== 'todo' ? '<button type="button" class="icon-btn" data-act="kc-left" aria-label="Move task “' + esc(t.text) + '” to: ' + (t.state === 'done' ? 'In progress' : 'To do') + '" title="Back">' + icon('back') + '</button>' : '') +
        (t.state !== 'done' ? '<button type="button" class="icon-btn" data-act="kc-right" aria-label="Move task “' + esc(t.text) + '” to: ' + (t.state === 'todo' ? 'In progress' : 'Done') + '" title="Forward">' + icon('next') + '</button>' : '') +
        '</span></div></article>';
    }

    function paintBoard() {
      const items = allTasks();
      const total = items.length, done = items.filter(x => x.t.state === 'done').length, open = total - done;
      $('#tkStatus').innerHTML = total
        ? '<span><b class="num" id="tkOpen" data-v="' + open + '">' + open + '</b> ' + plural(open, 'open task', 'open tasks', 'open tasks') + '</span><span>' + done + ' of ' + total + ' done</span>' +
          '<div class="prog wide-prog"><div class="bar go"><i style="--w:' + Math.round(done / total * 100) + '%"></i></div></div>'
        : '<span>No tasks. Add the first one below or in the Tasks tab of the chosen project.</span>';
      $('#board').innerHTML = COLS.map(([k, label]) => {
        const list = items.filter(x => x.t.state === k);
        return '<section class="col" data-state="' + k + '" aria-label="' + label + '"><h2>' + label + ' <em>' + list.length + '</em></h2>' +
          '<div class="col-body" data-state="' + k + '">' +
          (list.length ? list.map(x => card(x.t, x.p)).join('') : '<p class="col-empty">' + (k === 'todo' ? 'Nothing to do.' : k === 'doing' ? 'Drag a task you are working on here.' : 'Finished tasks land here.') + '</p>') +
          '</div></section>';
      }).join('');
    }

    async function move(pid, tid, state) {
      const p = PH.find(pid);
      if (!p) return;
      const t = p.tasks.find(x => x.id === tid);
      if (!t || t.state === state) return;
      const prev = p.tasks;
      const next = p.tasks.map(x => x.id === tid ? Object.assign({}, x, { state }) : x);
      PH.flip(['#board'], () => { p.tasks = next; paintBoard(); }, '.kcard', 'id');
      if (PH.updateNav) PH.updateNav();
      try { await PH.patch(pid, { tasks: next }); }
      catch (err) { p.tasks = prev; paintBoard(); if (PH.updateNav) PH.updateNav(); PH.toast(err.message, 'error'); }
    }

    fillSelects();
    paintBoard();

    $('#tkProj').addEventListener('change', e => {
      filter = e.target.value; PH.taskFilter = filter;
      PH.flip(['#board'], () => { fillSelects(); paintBoard(); }, '.kcard', 'id');
    });

    $('#tkAddForm').addEventListener('submit', async e => {
      e.preventDefault();
      const input = $('#tkAddIn'), text = input.value.trim(), pid = $('#tkAddProj').value;
      if (!pid) { PH.toast('First add a project for the task to go to.', 'error'); return; }
      if (!text) { input.focus(); return; }
      const p = PH.find(pid);
      const next = p.tasks.concat([{ id: PH.uid(), text, state: 'todo' }]);
      input.value = '';
      const prev = p.tasks;
      PH.flip(['#board'], () => { p.tasks = next; paintBoard(); }, '.kcard', 'id');
      if (PH.updateNav) PH.updateNav();
      try { await PH.patch(pid, { tasks: next }); }
      catch (err) { p.tasks = prev; paintBoard(); if (PH.updateNav) PH.updateNav(); PH.toast(err.message, 'error'); }
      input.focus();
    });

    $('#board').addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      const c = e.target.closest('.kcard');
      if (!b || !c) return;
      const p = PH.find(c.dataset.p), t = p && p.tasks.find(x => x.id === c.dataset.id);
      if (!t) return;
      if (b.dataset.act === 'kc-open') PH.go('#/projekt/' + p.id + '/zadania');
      else if (b.dataset.act === 'kc-right') move(p.id, t.id, t.state === 'todo' ? 'doing' : 'done');
      else if (b.dataset.act === 'kc-left') move(p.id, t.id, t.state === 'done' ? 'doing' : 'todo');
    });

    $('#board').addEventListener('dragstart', e => {
      const c = e.target.closest && e.target.closest('.kcard');
      if (!c) return;
      dragged = c;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', c.dataset.id); } catch (err) { /* same as above */ }
      requestAnimationFrame(() => c.classList.add('dragging'));
    });
    $('#board').addEventListener('dragover', e => {
      if (!dragged) return;
      const body = e.target.closest('.col-body');
      if (!body) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      $$('.col-body', $('#board')).forEach(b => b.classList.toggle('over', b === body));
    });
    $('#board').addEventListener('dragleave', e => {
      if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.col-body')) $$('.col-body', $('#board')).forEach(b => b.classList.remove('over'));
    });
    $('#board').addEventListener('drop', e => {
      if (!dragged) return;
      const body = e.target.closest('.col-body');
      e.preventDefault();
      $$('.col-body', $('#board')).forEach(b => b.classList.remove('over'));
      if (body) move(dragged.dataset.p, dragged.dataset.id, body.dataset.state);
    });
    $('#board').addEventListener('dragend', () => {
      if (dragged) dragged.classList.remove('dragging');
      dragged = null;
      $$('.col-body', $('#board')).forEach(b => b.classList.remove('over'));
    });

    PH.viewRefresh = () => { filter = PH.taskFilter || ''; fillSelects(); paintBoard(); };
    PH.onLeave(() => { PH.viewRefresh = null; });
  };

  /* =============== ARCHIVE =============== */

  PH.views.archive = function () {
    const view = PH.view;
    view.innerHTML = '<div class="lib page"><section class="hero"><div id="arTitle"></div></section><div id="arGrid" class="grid"></div></div>';
    function paint() {
      const list = S.projects.filter(p => p.archived);
      $('#arTitle').innerHTML = '<h1>Archive</h1><div class="status"><span><b class="num">' + list.length + '</b> ' + plural(list.length, 'project', 'projects', 'projects') + '</span>' +
        '<span class="recent">Projects that do not need to clutter the main list live here.</span></div>';
      const g = $('#arGrid');
      if (!list.length) {
        g.className = '';
        g.innerHTML = '<div class="empty"><h2>The archive is empty</h2><p>Move projects you are not working on but want to keep here, from the “More” menu on the project page. They disappear from the library, but nothing is lost.</p>' +
          '<div class="empty-actions"><a class="btn btn-primary" href="#/">Back to library</a></div></div>';
        return;
      }
      g.className = 'grid';
      g.innerHTML = list.map((p, i) => PH.tileHtml(p, i, { archive: true })).join('');
    }
    paint();
    PH.viewRefresh = paint;
    PH.onLeave(() => { PH.viewRefresh = null; });
  };

  /* =============== SETTINGS =============== */

  const ACCENTS = [['amber', 'Amber', '#FFB65C'], ['mint', 'Mint', '#6EE0B8'], ['rose', 'Rose', '#FF8FA3'], ['sky', 'Sky', '#6CC9F2'], ['violet', 'Violet', '#C79BFF']];


  const THEMES = [['night', 'Night', ['#0E0C1A', '#1D1936', '#FFB65C']], ['graphite', 'Graphite', ['#121315', '#212429', '#FFB65C']], ['ocean', 'Ocean', ['#07131C', '#112638', '#6CC9F2']],
    ['forest', 'Forest', ['#0A130F', '#15271E', '#6EE0B8']], ['dusk', 'Dusk', ['#1A0F18', '#301B28', '#FF8FA3']], ['light', 'Light', ['#F3F2FA', '#FFFFFF', '#D9780B']],
    ['paper', 'Paper', ['#F5F0E6', '#FFFDF8', '#B5541B']], ['auto', 'Match system', ['#0E0C1A', '#F3F2FA', '#8E9BFF']]];
  PH.views.settings = function () {
    const view = PH.view;
    const st = () => PH.settings;

    const row = (title, desc, ctl, id) =>
      '<div class="srow"' + (id ? ' id="' + id + '"' : '') + '><div class="stxt"><strong>' + title + '</strong><span>' + desc + '</span></div><div class="sctl">' + ctl + '</div></div>';
    const seg = (key, opts, num) => '<div class="seg" role="radiogroup" aria-label="' + esc(key) + '" data-key="' + key + '"' + (num ? ' data-num="1"' : '') + '>' +
      opts.map(o => '<button type="button" role="radio" data-v="' + o[0] + '" aria-checked="' + (String(st()[key]) === String(o[0])) + '">' + o[1] + '</button>').join('') + '</div>';
    const sw = (key, label) => '<button type="button" class="switch" role="switch" data-key="' + key + '" aria-checked="' + !!st()[key] + '" aria-label="' + esc(label) + '"><i></i></button>';
    const card = (title, intro, body, id) => '<section class="scard" id="' + id + '"><h2>' + title + '</h2><p class="hint">' + intro + '</p>' + body + '</section>';

    view.innerHTML =
      '<div class="settings page"><section class="hero"><div><h1>Settings</h1><div class="status"><span>Changes are saved immediately, in this browser only.</span></div></div>' +
      '<div class="hero-tools"><button class="btn" type="button" id="stReset">Reset to defaults</button></div></section>' +
      '<nav class="s-jump" aria-label="Settings sections">' +
      [['s-look', 'Look'], ['s-motion', 'Animacje'], ['s-lib', 'Library'], ['s-backup', 'Backup'], ['s-sec', 'Security'], ['s-acct', 'Account'], ['s-data', 'Data']].map(x => '<a href="#" data-jump="' + x[0] + '">' + x[1] + '</a>').join('') + '</nav>' +
      '<div class="s-grid">' +

      card('Look and navigation', 'Where the main menu is and what the folders look like.',
        row('Language', 'Interface language. Polish is switched on the fly from the built-in dictionary; the default is English.', seg('language', [['en', 'English'], ['pl', 'Polish']])) +
        row('Navigation position', 'Library, Tasks, Archive and Settings: at the top like in Steam, or in a narrow bar on the side.', seg('nav', [['top', 'Top'], ['side', 'Side']])) +
        row('Page theme', 'Colors of the whole app, including the light mode. “Match system” follows your device.',
          '<div class="theme-grid" role="radiogroup" aria-label="Page theme">' + THEMES.map(t =>
            '<button type="button" class="theme-card" role="radio" data-theme-pick="' + t[0] + '" aria-checked="' + (st().theme === t[0]) + '"><span class="sw">' + t[2].map(c => '<i style="background:' + c + '"></i>').join('') + '</span><span>' + t[1] + '</span></button>').join('') + '</div>') +
        row('Accent color', 'Main buttons, selections and highlights.',
          '<div class="swatches" role="radiogroup" aria-label="Accent color">' + ACCENTS.map(a =>
            '<button type="button" class="swatch" role="radio" data-accent="' + a[0] + '" aria-checked="' + (st().accent === a[0]) + '" aria-label="' + a[1] + '" title="' + a[1] + '" style="--sw:' + a[2] + '"><i></i><span>' + a[1] + '</span></button>').join('') +
            '<label class="swatch" role="radio" aria-checked="' + (st().accent === 'custom') + '" data-accent="custom" title="Custom color" style="--sw:' + esc(st().accentCustom) + '"><i></i><span>Custom</span><input type="color" id="stAccentC" value="' + esc(st().accentCustom) + '" aria-label="Custom accent color" style="position:absolute;opacity:0;width:0;height:0"></label></div>') +
        (PH.features.localPaths ? row('Adding projects from disk', 'What the app should do when you point to a folder: only remember the path (files stay put and changes show up right away), copy the files into ProjectHub (the original stays), or move them (after copying they vanish from the original folder, with a confirmation).', seg('importMode', [['path', 'Path only'], ['copy', 'Copy'], ['move', 'Move']])) : '') +
        row('Folder size', 'How many folders fit in a row.', seg('density', [['compact', 'Small'], ['normal', 'Medium'], ['roomy', 'Large']])), 's-look') +

      card('Animacje', 'Motion helps you see what changed. You can tone it down.',
        row('Animation level', 'Full: folders popping in, banner parallax, confetti. Reduced: only short transitions. Off: no motion.', seg('motion', [['full', 'Full'], ['low', 'Reduced'], ['off', 'Off']])) +
        row('Folder tilt', 'The folder slightly follows the cursor. Only works with full animations.', sw('tilt', 'Folders tilting toward the cursor')), 's-motion') +

      card('Library and projects', 'What you see on the list and how it is ordered.',
        row('Default sorting', 'You set the custom order by dragging folders.', '<select id="stSort" aria-label="Default sorting">' +
          [['manual', 'Custom order'], ['recent', 'Recently changed'], ['name', 'Name A to Z'], ['backup', 'No backup first'], ['size', 'Largest first']].map(o => '<option value="' + o[0] + '"' + (st().sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>') +
        row('Favorites on top', 'A separate favorites bar above the rest of the projects.', sw('favTop', 'Favorites on top')) +
        row('Size on the folder', 'Shows how much space the project folder takes.', sw('showSize', 'Show project size')) +
        row('Tab after opening a project', 'Where the project page starts.', '<select id="stTab" aria-label="Default project tab">' +
          [['przeglad', 'Overview'], ['zadania', 'Tasks'], ['notatki', 'Notes'], ['dokumentacja', 'Docs'], ['podglad', 'Preview'], ['pliki', 'Files']].map(o => '<option value="' + o[0] + '"' + (st().tabDefault === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>'), 's-lib') +

      card('Backup', 'Settings used in the backup dialog.',
        (PH.features.backupToPath ? row('Default destination folder', 'An external drive or a folder synced with the cloud.', '<input id="stDest" class="mono" placeholder="E:\\Backupy" value="' + esc(st().backupDest) + '" aria-label="Default backup folder" autocomplete="off" spellcheck="false">') : '') +
        row('Excluded folders', 'Folder names we do not pack into the ZIP. Usually shrinks the archive many times over.', '<div class="tags" id="stExTags"><ul class="tag-list"></ul><input placeholder="Add a name and press Enter" aria-label="Excluded folders" autocomplete="off"></div>') +
        row('Backup reminder', 'After how many days the backup on a folder turns amber.', '<div class="numfield"><input id="stWarn" type="number" min="1" max="365" value="' + st().backupWarnDays + '" aria-label="Days until the reminder"><span>days</span></div>'), 's-backup') +

      card('Security', 'Access to the catalog and care when deleting.',
        row('Automatic log out', 'After this many minutes without activity you return to the login screen.', seg('autoLogout', [[0, 'Never'], [5, '5 min'], [15, '15 min'], [30, '30 min'], [60, '60 min']], true)) +
        row('Ask before deleting', 'A confirmation dialog when deleting projects, photos and documentation pages. Files on disk are always safe.', sw('confirmDelete', 'Ask before deleting')), 's-sec') +

      card('Account', PH.mode === 'demo' ? 'Demo mode: the data lives only in this browser.' : 'Logged in as <strong>' + esc(PH.username || '') + '</strong>. Every account has its own projects, files and backups.',
        (PH.limits && PH.limits.quota ? row('Space used', 'Files uploaded to ProjectHub on this account.', '<div class="usage"><div class="usage-bar" style="--w:' + Math.min(100, Math.round(100 * (PH.usage || 0) / PH.limits.quota)) + '%"><i></i></div><span class="hint">' + PH.fmtSize(PH.usage || 0) + ' of ' + PH.fmtSize(PH.limits.quota) + '</span></div>') : '') +
        row('Change password', 'After the change the other sessions are logged out.', '<button class="btn" type="button" id="stPass">Change password</button>') +
        row('Account deletion', 'Deletes the account together with its projects and uploaded files. This cannot be undone. Make a backup first.', '<button class="btn btn-danger-quiet" type="button" id="stDelAcct">Delete account</button>'), 's-acct') +

      card('Data', 'A copy of the project database itself (without files from disk).',
        row('Export to a JSON file', 'Descriptions, notes, documentation, tasks and project settings. Photos in preview mode are inside the file.', '<button class="btn" type="button" id="stExport">' + icon('backup') + '<span>Download export</span></button>') +
        row('Import from a JSON file', 'Projects with the same identifier are updated, new ones are added.', '<label class="btn file-btn">' + icon('plus') + '<span>Choose file</span><input type="file" accept="application/json,.json" id="stImport" aria-label="Choose an export file"></label>') +
        row('Folder sizes', 'Recalculates how much space each project takes.', '<button class="btn" type="button" id="stSizes">' + icon('disk') + '<span>Recalculate sizes</span></button>') +
        (PH.api.MOCK ? row('Demo data', 'Removes the demo data from this browser and returns to the login screen.', '<button class="btn btn-danger-quiet" type="button" id="stDemo">Reset demo data</button>') : ''), 's-data') +

      '</div></div>';

    /* --- handlers --- */
    const exTags = PH.makeTags($('#stExTags'), arr => PH.setSetting('backupExclude', arr));
    exTags.set(st().backupExclude);

    $('.settings', view).addEventListener('click', e => {
      const s = e.target.closest('.seg[data-key] [data-v]');
      if (s) {
        const seg = s.parentElement, key = seg.dataset.key;
        const v = seg.dataset.num ? Number(s.dataset.v) : s.dataset.v;
        PH.setSetting(key, v);
        $$('[data-v]', seg).forEach(b => b.setAttribute('aria-checked', String(b === s)));
        if (key === 'nav') PH.toast(v === 'side' ? 'Menu moved to the side' : 'Menu moved to the top');
        return;
      }
      const sw = e.target.closest('.switch[data-key]');
      if (sw) {
        const next = sw.getAttribute('aria-checked') !== 'true';
        sw.setAttribute('aria-checked', String(next));
        PH.setSetting(sw.dataset.key, next);
        return;
      }
      const th = e.target.closest('[data-theme-pick]');
      if (th) {
        PH.setSetting('theme', th.dataset.themePick);
        $$('[data-theme-pick]', view).forEach(b => b.setAttribute('aria-checked', String(b === th)));
        return;
      }
      const ac = e.target.closest('[data-accent]');
      if (ac && ac.dataset.accent === 'custom') {
        if (e.target.id !== 'stAccentC') $('#stAccentC').click();
        return;
      }
      if (ac) {
        PH.setSetting('accent', ac.dataset.accent);
        $$('[data-accent]', view).forEach(b => b.setAttribute('aria-checked', String(b === ac)));
        return;
      }
      const j = e.target.closest('[data-jump]');
      if (j) { e.preventDefault(); const el = document.getElementById(j.dataset.jump); if (el) el.scrollIntoView({ behavior: PH.anim() ? 'smooth' : 'auto', block: 'start' }); return; }
    });
    $('#stAccentC').addEventListener('input', e => {
      PH.setSetting('accentCustom', e.target.value);
      PH.setSetting('accent', 'custom');
      $$('[data-accent]', view).forEach(b => b.setAttribute('aria-checked', String(b.dataset.accent === 'custom')));
      e.target.parentElement.style.setProperty('--sw', e.target.value);
    });
    $('#stPass').addEventListener('click', async () => {
      const cur = await PH.prompt('Change password', 'Current password', '', 'Forward', true);
      if (!cur) return;
      const nw = await PH.prompt('Change password', 'New password (min. 8 characters)', '', 'Change password', true);
      if (!nw) return;
      try { await PH.api.changePassword(cur, nw); PH.toast('The password has been changed'); }
      catch (err) { PH.toast(err.message, 'error'); }
    });
    $('#stDelAcct').addEventListener('click', async () => {
      if (!await PH.confirm('Delete the account?', 'All projects and uploaded files of this account will be gone for good. If you want to keep them, download a backup first.', 'Delete account')) return;
      const pw = await PH.prompt('Confirm with password', 'Account password', '', 'Delete account permanently', true);
      if (!pw) return;
      try { await PH.api.deleteAccount(pw); location.href = 'login.html'; }
      catch (err) { PH.toast(err.message, 'error'); }
    });
    $('#stSort').addEventListener('change', e => PH.setSetting('sort', e.target.value));
    $('#stTab').addEventListener('change', e => PH.setSetting('tabDefault', e.target.value));
    if ($('#stDest')) $('#stDest').addEventListener('change', e => PH.setSetting('backupDest', PH.cleanPath(e.target.value)));
    $('#stWarn').addEventListener('change', e => {
      let n = parseInt(e.target.value, 10);
      if (!(n >= 1)) n = PH.DEFAULTS.backupWarnDays;
      n = Math.min(365, n);
      e.target.value = n;
      PH.setSetting('backupWarnDays', n);
    });

    $('#stReset').addEventListener('click', async () => {
      if (!await PH.confirm('Reset settings to defaults?', 'Look, sorting, backup and security return to their initial values. Your projects are not affected.', 'Reset')) return;
      PH.resetSettings();
      PH.views.settings();
      PH.updateNav();
      PH.toast('Settings reset to defaults');
    });

    $('#stExport').addEventListener('click', e => PH.withBusy(e.currentTarget, 'Preparing…', async () => {
      const data = await PH.api.exportData();
      data.settings = PH.settings;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'projecthub-eksport-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      PH.toast('Export file downloaded');
    }));

    $('#stImport').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      let data;
      try { data = JSON.parse(await f.text()); } catch (err) { PH.toast('This file is not valid JSON.', 'error'); return; }
      try {
        const r = await PH.api.importData(data);
        S.projects = (await PH.api.listProjects()).map(PH.normProject);
        PH.updateNav();
        PH.toast('Imported ' + r.imported + ' ' + plural(r.imported, 'project', 'projects', 'projects'));
      } catch (err) { PH.toast(err.message, 'error'); }
    });

    $('#stSizes').addEventListener('click', e => PH.withBusy(e.currentTarget, 'Counting…', async () => {
      const r = await PH.api.refreshSizes();
      S.projects.forEach(p => { if (r.sizes && r.sizes[p.id] != null) p.sizeBytes = r.sizes[p.id]; });
      PH.toast('Project sizes recalculated');
    }));

    const demo = $('#stDemo');
    if (demo) demo.addEventListener('click', async () => {
      if (!await PH.confirm('Reset demo data?', 'The demo projects and account will be removed from this browser.', 'Reset')) return;
      PH.api.resetDemo();
      location.href = 'login.html';
    });

    PH.viewRefresh = null;
  };
})();
