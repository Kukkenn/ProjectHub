/* library.js: library view (grid of folders), project form, scanning, backup, sizes. */
(function () {
  'use strict';
  const PH = window.PH;
  const { $, $$, esc, plural, norm } = PH;
  const icon = PH.icon;
  const S = PH.state;

  /* ---------- filtering and sorting ---------- */

  function visible() {
    const q = norm(S.query.trim());
    const list = S.projects.filter(p => {
      if (p.archived) return false;
      if (S.category && p.category !== S.category) return false;
      if (S.noBackup && p.backedUpAt) return false;
      if (S.statuses.size && !S.statuses.has(p.status)) return false;
      for (const t of S.techs) if (p.tech.indexOf(t) < 0) return false;
      if (!q) return true;
      return norm([p.name, p.description, p.path, p.category, PH.STATUS[p.status].label].concat(p.tech, p.tags).join('\n')).indexOf(q) >= 0;
    });
    const byName = (a, b) => a.name.localeCompare(b.name, 'pl');
    const sort = PH.settings.sort;
    if (sort === 'name') list.sort(byName);
    else if (sort === 'recent') list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    else if (sort === 'size') list.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0) || byName(a, b));
    else if (sort === 'backup') {
      list.sort((a, b) => {
        const x = a.backedUpAt ? new Date(a.backedUpAt).getTime() : -Infinity;
        const y = b.backedUpAt ? new Date(b.backedUpAt).getTime() : -Infinity;
        return x - y || byName(a, b);
      });
    }
    return list;
  }

  /* ---------- tile ---------- */

  PH.tileHtml = function (p, i, o) {
    o = o || {};
    const b = PH.backupInfo(p), st = PH.STATUS[p.status];
    const shown = p.tech.slice(0, 3), extra = p.tech.length - shown.length;
    const open = p.tasks.filter(t => t.state !== 'done').length;
    const cover = p.images.length
      ? '<img src="' + esc(p.images[0].url) + '" alt="" loading="lazy" draggable="false">' + (p.images.length > 1 ? '<span class="img-count">' + p.images.length + ' ' + plural(p.images.length, 'photo', 'photos', 'photos') + '</span>' : '')
      : '<span class="initials' + (p.icon ? ' is-emoji' : '') + '" aria-hidden="true">' + esc(PH.glyph(p)) + '</span>';
    return '<article class="tile' + (o.archive ? ' is-archived' : '') + '" data-id="' + esc(p.id) + '" style="' + PH.tabStyle(p) + ';--i:' + i + '"' + (o.drag ? ' draggable="true"' : '') + '>' +
      '<span class="tile-tab">' + esc(p.category) + '</span>' +
      '<div class="tile-cover">' + cover +
      '<span class="st" style="--st:' + st.c + '">' + st.label + '</span>' +
      (o.archive ? '' : '<button class="star" type="button" data-act="star" aria-pressed="' + p.favorite + '" aria-label="' + (p.favorite ? 'Remove from favorites: ' : 'Add to favorites: ') + esc(p.name) + '">' + icon('star') + '</button>') +
      '</div>' +
      '<div class="tile-body">' +
      '<h3><button class="tile-open" type="button">' + esc(p.name) + '</button></h3>' +
      '<p class="desc' + (p.description ? '' : ' muted') + '">' + (p.description ? esc(p.description) : 'No description') + '</p>' +
      (shown.length ? '<ul class="techs">' + shown.map(t => '<li>' + esc(t) + '</li>').join('') + (extra > 0 ? '<li>+' + extra + '</li>' : '') + '</ul>' : '') +
      '<div class="foot"><span class="path" title="' + esc(p.storage === 'local' ? p.path : 'Files in ProjectHub') + '">' + (p.storage === 'local' ? esc(PH.shortPath(p.path)) : 'Uploaded project') + '</span>' +
      (open && !o.archive ? '<span class="open-n" title="Open tasks">' + icon('tasks') + open + '</span>' : '') +
      (PH.settings.showSize && p.sizeBytes ? '<span class="sz">' + PH.fmtSize(p.sizeBytes) + '</span>' : '') +
      '<span class="bk bk-' + b.cls + '">' + b.text + '</span></div>' +
      (o.archive ? '<div class="tile-actions"><button class="btn" type="button" data-act="unarchive">Restore</button><button class="btn btn-danger-quiet" type="button" data-act="remove">Remove from catalog</button></div>' : '') +
      '</div></article>';
  };

  /* ---------- skeleton and rendering ---------- */

  const SORTS = [['manual', 'Custom order'], ['recent', 'Recently changed'], ['name', 'Name A to Z'], ['backup', 'Missing backup first'], ['size', 'Largest first']];

  PH.views.library = function (route) {
    const view = PH.view;
    view.innerHTML =
      '<div class="lib page">' +
      '<div id="demoBar"></div>' +
      '<section class="hero"><div id="titleBox"></div>' +
      '<div class="hero-tools"><button class="btn" type="button" id="btnSizes">' + icon('disk') + '<span>Sizes</span></button>' +
      '<label class="sort">Sort <select id="sort">' + SORTS.map(s => '<option value="' + s[0] + '">' + s[1] + '</option>').join('') + '</select></label></div></section>' +
      '<nav class="rail" id="catRail" aria-label="Categories"></nav>' +
      '<div class="filters" id="statusRow" role="group" aria-label="Status"></div>' +
      '<div class="filters" id="techRow" role="group" aria-label="Technologies"></div>' +
      '<section class="fav" id="favSection" hidden><h2 class="sec-title">' + icon('star', 'fav-ico') + '<span>Favorites</span><em id="favCount"></em></h2><div id="favRow" class="fav-row"></div></section>' +
      '<section class="all"><h2 class="sec-title" id="allTitle" hidden></h2><div id="grid" class="grid"></div></section>' +
      '</div>';
    $('#sort').value = PH.settings.sort;
    renderDemoBar();
    renderRails();
    renderHero();
    renderGrids(true);
    PH.viewRefresh = () => { renderRails(); renderHero(); renderGrids(); };
    PH.onLeave(() => { PH.viewRefresh = null; });
  };

  function renderDemoBar() {
    $('#demoBar').innerHTML = PH.api.MOCK
      ? '<div class="demo"><p>Preview mode. Data is saved only in this browser, and running commands, Explorer, files and backup only pretend to work.</p><button class="btn btn-quiet" type="button" data-act="reset-demo">Reset demo data</button></div>'
      : '';
  }

  function renderRails() {
    const live = S.projects.filter(p => !p.archived);
    const cats = new Map(), techs = new Map(), sts = new Map();
    live.forEach(p => {
      cats.set(p.category, (cats.get(p.category) || 0) + 1);
      sts.set(p.status, (sts.get(p.status) || 0) + 1);
      p.tech.forEach(t => techs.set(t, (techs.get(t) || 0) + 1));
    });
    if (S.category && !cats.has(S.category)) S.category = null;
    for (const t of Array.from(S.techs)) if (!techs.has(t)) S.techs.delete(t);
    for (const t of Array.from(S.statuses)) if (!sts.has(t)) S.statuses.delete(t);
    const byCount = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl');

    const rail = $('#catRail');
    if (!rail) return;
    rail.style.setProperty('--rail', S.category ? PH.tabVar(S.category) : 'var(--line)');
    rail.innerHTML =
      '<button class="cat" type="button" data-cat="" aria-pressed="' + !S.category + '"><span>All</span><span class="n">' + live.length + '</span></button>' +
      Array.from(cats.entries()).sort(byCount).map(([c, n]) =>
        '<button class="cat" type="button" data-cat="' + esc(c) + '" aria-pressed="' + (S.category === c) + '" style="--c:' + PH.tabVar(c) + '"><span class="sw"></span><span>' + esc(c) + '</span><span class="n">' + n + '</span></button>').join('');

    $('#statusRow').innerHTML = '<span class="filters-label">Status</span>' + PH.STATUS_ORDER.filter(k => sts.has(k)).map(k =>
      '<button class="chip chip-st" type="button" data-status="' + k + '" aria-pressed="' + S.statuses.has(k) + '" style="--st:' + PH.STATUS[k].c + '"><i></i>' + PH.STATUS[k].label + '<span>' + sts.get(k) + '</span></button>').join('');

    const techRows = Array.from(techs.entries()).sort(byCount);
    $('#techRow').innerHTML = techRows.length
      ? '<span class="filters-label">Technologies</span>' + techRows.map(([t, n]) =>
        '<button class="chip" type="button" data-tech="' + esc(t) + '" aria-pressed="' + S.techs.has(t) + '">' + esc(t) + '<span>' + n + '</span></button>').join('')
      : '';

    $('#catList').innerHTML = Array.from(cats.keys()).map(c => '<option value="' + esc(c) + '"></option>').join('');
  }

  function renderHero() {
    const box = $('#titleBox');
    if (!box) return;
    const live = S.projects.filter(p => !p.archived);
    const list = visible();
    const total = live.length;
    const filtered = !!(S.category || S.techs.size || S.statuses.size || S.query.trim() || S.noBackup);
    const unsaved = live.filter(p => !p.backedUpAt).length;
    const recent = live.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    const first = !box.firstChild;

    box.innerHTML =
      '<h1>' + esc(S.category || 'Your projects') + '</h1>' +
      '<div class="status"><span><b class="num" id="numTotal" data-v="' + (first ? 0 : (filtered ? list.length : total)) + '">' + (first ? 0 : (filtered ? list.length : total)) + '</b> ' + (filtered ? 'of ' + total + ' ' : '') + plural(total, 'project', 'projects', 'projects') + '</span>' +
      (unsaved ? '<button class="flag" type="button" data-act="nobackup" aria-pressed="' + S.noBackup + '">' + unsaved + ' without backup</button>' : '') +
      (recent ? '<span class="recent">Last changed: <button class="linkish" type="button" data-act="open-project" data-id="' + esc(recent.id) + '">' + esc(recent.name) + '</button></span>' : '') +
      (filtered ? '<button class="btn btn-quiet" type="button" data-act="clear">Clear filters</button>' : '') + '</div>';
    if (first) PH.countUp($('#numTotal'), filtered ? list.length : total);
    $('#sort').value = PH.settings.sort;
  }

  function renderGrids(initial) {
    const grid = $('#grid');
    if (!grid) return;
    const list = visible();
    const live = S.projects.filter(p => !p.archived);
    const manual = PH.settings.sort === 'manual';
    const favs = PH.settings.favTop ? list.filter(p => p.favorite) : [];
    const rest = PH.settings.favTop ? list.filter(p => !p.favorite) : list;
    const settle = initial && S.firstPaint && PH.anim();

    PH.flip(['#favRow', '#grid'], () => {
      $('#favSection').hidden = !favs.length;
      $('#favCount').textContent = favs.length;
      $('#favRow').className = 'fav-row' + (settle ? ' settle' : '');
      $('#favRow').innerHTML = favs.map((p, i) => PH.tileHtml(p, i, { drag: manual })).join('');

      const t = $('#allTitle');
      t.hidden = !favs.length || !rest.length;
      t.textContent = 'Other projects';

      if (!live.length) {
        grid.className = '';
        grid.innerHTML = '<div class="empty"><h2>Your catalog is still empty</h2><p>Scan a folder, such as your Desktop, and pick which subfolders are projects. You can also add a project manually.</p>' +
          '<div class="empty-actions"><button class="btn btn-primary" type="button" data-act="scan">Scan a folder</button><button class="btn" type="button" data-act="add">Add project</button></div></div>';
      } else if (!list.length) {
        grid.className = '';
        grid.innerHTML = '<div class="empty"><h2>Nothing matches these filters</h2><p>Change the search phrase or remove the active filters.</p>' +
          '<div class="empty-actions"><button class="btn btn-primary" type="button" data-act="clear">Clear filters</button></div></div>';
      } else {
        grid.className = 'grid' + (settle ? ' settle' : '');
        grid.innerHTML = rest.map((p, i) => PH.tileHtml(p, i + favs.length, { drag: manual })).join('');
      }
    });
    if (settle) S.firstPaint = false;
    $('#favRow').classList.toggle('can-drag', manual);
    grid.classList.toggle('can-drag', manual);
  }

  /* ---------- view events ---------- */

  function rerenderAll() { renderRails(); renderHero(); renderGrids(); }
  PH.libRerender = () => { if ($('#grid')) rerenderAll(); };

  PH.libActions = function (e) {
    const b = e.target.closest('[data-act]');
    if (!b) return false;
    switch (b.dataset.act) {
      case 'clear': S.category = null; S.techs.clear(); S.statuses.clear(); S.noBackup = false; S.query = ''; $('#q').value = ''; rerenderAll(); return true;
      case 'nobackup': S.noBackup = !S.noBackup; rerenderAll(); return true;
      case 'open-project': PH.go('#/projekt/' + b.dataset.id); return true;
      case 'add': PH.openForm(null); return true;
      case 'scan': PH.openScan(); return true;
      case 'reset-demo': PH.api.resetDemo(); location.href = 'login.html'; return true;
      default: return false;
    }
  };

  document.addEventListener('click', e => {
    const view = PH.view;
    if (!view || !view.contains(e.target)) return;

    /* archive and library tiles share the same actions */
    const tile = e.target.closest('.tile');
    const act = e.target.closest('[data-act]');

    if (e.target.closest('.lib')) {
      const cat = e.target.closest('[data-cat]');
      if (cat && cat.closest('#catRail')) { S.category = cat.dataset.cat || null; rerenderAll(); return; }
      const tech = e.target.closest('[data-tech]');
      if (tech) { const t = tech.dataset.tech; if (S.techs.has(t)) S.techs.delete(t); else S.techs.add(t); rerenderAll(); return; }
      const st = e.target.closest('[data-status]');
      if (st) { const t = st.dataset.status; if (S.statuses.has(t)) S.statuses.delete(t); else S.statuses.add(t); rerenderAll(); return; }

      if (tile && act && act.dataset.act === 'star') {
        const p = PH.find(tile.dataset.id);
        if (!p) return;
        const willBe = !p.favorite;
        p.favorite = willBe;
        renderHero();
        renderGrids();
        const el = $('.tile[data-id="' + CSS.escape(p.id) + '"] .star');
        if (el && willBe) el.classList.add('pop');
        PH.patch(p.id, { favorite: willBe }).then(() => PH.updateNav()).catch(err => {
          p.favorite = !willBe;
          renderGrids();
          PH.toast(err.message, 'error');
        });
        return;
      }
    }
    if (tile && act && act.dataset.act === 'unarchive') { PH.archive(tile.dataset.id, false); return; }
    if (tile && act && act.dataset.act === 'remove') { PH.removeProject(tile.dataset.id); return; }
    if (tile && e.target.closest('.tile-open')) { PH.go('#/projekt/' + tile.dataset.id); return; }
    if (act && e.target.closest('.lib')) PH.libActions(e);
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'sort') { PH.setSetting('sort', e.target.value); renderGrids(); }
  });

  /* ---------- dragging folders (custom order) ---------- */

  let dragEl = null, lastSwap = 0;

  function applyGroupOrder(ids) {
    const set = new Set(ids);
    const slots = [];
    S.projects.forEach((p, i) => { if (set.has(p.id)) slots.push(i); });
    const byId = new Map(S.projects.map(p => [p.id, p]));
    const next = S.projects.slice();
    slots.forEach((slot, k) => { next[slot] = byId.get(ids[k]); });
    S.projects = next;
  }

  document.addEventListener('dragstart', e => {
    const t = e.target.closest && e.target.closest('.lib .tile[draggable="true"]');
    if (!t) return;
    dragEl = t;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', t.dataset.id); } catch (err) { /* ditto */ }
    requestAnimationFrame(() => t.classList.add('dragging'));
  });
  document.addEventListener('dragover', e => {
    if (!dragEl) return;
    const cont = e.target.closest && e.target.closest('.grid, .fav-row');
    if (!cont || cont !== dragEl.parentElement) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const over = e.target.closest('.tile');
    if (!over || over === dragEl || Date.now() - lastSwap < 140) return;
    const r = over.getBoundingClientRect();
    const before = e.clientX < r.left + r.width / 2;
    const ref = before ? over : over.nextElementSibling;
    if (ref === dragEl || (ref === dragEl.nextElementSibling && !before)) return;
    lastSwap = Date.now();
    PH.flip([cont], () => cont.insertBefore(dragEl, ref));
  });
  document.addEventListener('drop', e => { if (dragEl) e.preventDefault(); });
  document.addEventListener('dragend', e => {
    if (!dragEl) return;
    const el = dragEl, cont = el.parentElement;
    dragEl = null;
    el.classList.remove('dragging');
    if (!cont || e.dataTransfer.dropEffect === 'none') { renderGrids(); return; }
    const ids = $$('.tile', cont).map(t => t.dataset.id);
    applyGroupOrder(ids);
    PH.api.reorder(S.projects.map(p => p.id)).catch(err => PH.toast('Could not save the order: ' + err.message, 'error'));
  });

  /* ---------- shared actions ---------- */

  PH.archive = async function (id, flag) {
    const p = PH.find(id);
    if (!p) return;
    try {
      await PH.patch(id, { archived: flag }, { optimistic: true });
      PH.toast(flag ? 'Moved “' + p.name + '” to the archive' : 'Restored “' + p.name + '” to the library');
      PH.dataChanged();
    } catch (err) { PH.toast(err.message, 'error'); }
  };

  PH.removeProject = async function (id, afterRoute) {
    const p = PH.find(id);
    if (!p) return;
    const yes = await PH.confirmDelete('Remove the project from the catalog?', '“' + p.name + '” will disappear from the catalog. The folder and files on disk stay untouched.', 'Remove from catalog');
    if (!yes) return;
    try {
      await PH.api.deleteProject(id);
      S.projects = S.projects.filter(x => x.id !== id);
      PH.toast('Removed “' + p.name + '” from the catalog');
      if (afterRoute) PH.go(afterRoute); else PH.dataChanged();
    } catch (err) { PH.toast(err.message, 'error'); }
  };

  PH.runCommand = async function (projectId, commandId, btn) {
    const p = PH.find(projectId);
    if (!p) return;
    const go = async () => {
      const r = await PH.api.runProject(projectId, commandId);
      PH.toast((r && r.message) || 'Ran “' + p.name + '”');
    };
    if (btn) await PH.withBusy(btn, 'Running…', go);
    else { try { await go(); } catch (err) { PH.toast(err.message, 'error'); } }
  };

  /* ---------- project form ---------- */

  const techTags = PH.makeTags($('#techBox'));
  const otherTags = PH.makeTags($('#tagBox'));
  let formStatus = 'active';

  function paintStatusSeg() {
    $('#f-status').innerHTML = PH.STATUS_ORDER.map(k =>
      '<button type="button" role="radio" aria-checked="' + (formStatus === k) + '" data-v="' + k + '" style="--st:' + PH.STATUS[k].c + '"><i></i>' + PH.STATUS[k].label + '</button>').join('');
  }
  $('#f-status').addEventListener('click', e => {
    const b = e.target.closest('[data-v]');
    if (b) { formStatus = b.dataset.v; paintStatusSeg(); }
  });

  function cmdRow(c) {
    return '<div class="cmd-row" data-id="' + esc(c.id || PH.uid()) + '">' +
      '<input class="cmd-label" placeholder="Name (e.g. Server)" value="' + esc(c.label || '') + '" aria-label="Command name" maxlength="40" autocomplete="off">' +
      '<input class="cmd-cmd mono" placeholder="python main.py" value="' + esc(c.cmd || '') + '" aria-label="Command" autocomplete="off" spellcheck="false">' +
      '<button type="button" class="icon-btn" data-rm-cmd aria-label="Remove command">' + icon('x') + '</button></div>';
  }
  $('#f-cmd-add').addEventListener('click', () => {
    $('#f-cmds').insertAdjacentHTML('beforeend', cmdRow({}));
    const rows = $$('.cmd-row', $('#f-cmds'));
    rows[rows.length - 1].querySelector('.cmd-label').focus();
  });
  $('#f-cmds').addEventListener('click', e => {
    const b = e.target.closest('[data-rm-cmd]');
    if (b) b.closest('.cmd-row').remove();
  });

  /* ---------- project form: file source, icon, color ---------- */

  const COLORS = ['#FF8FA3', '#FFB65C', '#F2D45C', '#6EE0B8', '#6CC9F2', '#8E9BFF', '#C79BFF', '#F58BD8', '#A3E36A', '#FF7A59'];
  const ICONS = ['📁', '🚀', '🌐', '🎮', '🤖', '🛒', '📊', '🎨', '🧪', '📱', '🐍', '⚡'];
  let formSource = 'managed', formIcon = '', formColor = '', picked = null, editing = null, saving = false;

  function paintSource() {
    const canUp = PH.features.upload, canLocal = PH.features.localPaths;
    $$('#f-source button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === formSource)));
    $('#f-source-box').hidden = !!editing || !(canUp && canLocal);
    $('#f-upload-box').hidden = !!editing || formSource !== 'managed';
    $('#f-path-box').hidden = formSource !== 'local';
    $('#f-managed-note').hidden = !(editing && editing.storage === 'managed');
    $('#f-cmd-box').hidden = !PH.features.run;
    const im = PH.settings.importMode;
    $('#f-import-hint').hidden = !!editing || formSource !== 'local' || im === 'path';
    $('#f-import-hint').textContent = im === 'move'
      ? 'Mode from Settings: MOVE. Files will go into ProjectHub and the copied files will disappear from that folder (I will ask for confirmation).'
      : 'Mode from Settings: COPY. Files will be copied into ProjectHub, the originals stay on disk.';
    const L = PH.limits || {};
    $('#f-up-hint').textContent = 'Skipping the node_modules, .git, .venv and __pycache__ folders.' +
      (L.maxFile ? ' Limits: file ' + PH.fmtSize(L.maxFile) + ', ' + L.maxFiles + ' files per project' + (L.quota ? ', ' + PH.fmtSize(L.quota) + ' per account' : '') + '.' : '');
  }
  function paintPicked() {
    $('#f-sum').innerHTML = picked ? PH.upload.describe(picked) : '<span class="muted">You can also create an empty project and add files later.</span>';
    $('#f-dz').classList.toggle('has', !!picked && (picked.zip || picked.entries.length));
  }
  function paintIconColor() {
    $('#f-icon').value = formIcon;
    $('#f-icons').innerHTML = ICONS.map(i => '<button type="button" class="ic-pick" data-i="' + i + '" aria-pressed="' + (i === formIcon) + '">' + i + '</button>').join('');
    $('#f-colors').innerHTML = '<button type="button" class="swatch" role="radio" data-c="" aria-checked="' + (!formColor) + '" style="--sw:var(--tab-auto,#8E9BFF)"><i></i>Auto</button>' +
      COLORS.map(c => '<button type="button" class="swatch dot" role="radio" data-c="' + c + '" aria-checked="' + (formColor === c) + '" aria-label="Color ' + c + '" style="--sw:' + c + '"><i></i></button>').join('') +
      '<label class="swatch dot custom" aria-label="Custom color"><i style="background:' + (formColor && COLORS.indexOf(formColor) < 0 ? formColor : 'conic-gradient(#f66,#fc6,#6f9,#6cf,#c6f,#f66)') + '"></i><input type="color" id="f-color-custom" value="' + (formColor || '#8e9bff') + '"></label>';
  }
  $('#f-source').addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (b) { formSource = b.dataset.v; paintSource(); }
  });
  $('#f-icons').addEventListener('click', e => {
    const b = e.target.closest('.ic-pick');
    if (b) { formIcon = formIcon === b.dataset.i ? '' : b.dataset.i; paintIconColor(); }
  });
  $('#f-icon').addEventListener('input', e => { formIcon = Array.from(e.target.value.trim()).slice(0, 2).join(''); $$('#f-icons .ic-pick').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.i === formIcon))); });
  $('#f-colors').addEventListener('click', e => {
    const b = e.target.closest('button[data-c]');
    if (b) { formColor = b.dataset.c; paintIconColor(); }
  });
  $('#f-colors').addEventListener('input', e => {
    if (e.target.id === 'f-color-custom') { formColor = e.target.value; $$('#f-colors [data-c]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.c === formColor))); e.target.previousElementSibling.style.background = formColor; }
  });

  function setPicked(sel) {
    picked = sel;
    if (sel && !$('#f-name').value.trim() && sel.rootName) $('#f-name').value = sel.rootName;
    paintPicked();
    const prob = sel ? PH.upload.problem(sel) : '';
    PH.showErr('#f-error', prob);
  }
  $('#f-pick-dir').addEventListener('click', () => $('#f-in-dir').click());
  $('#f-pick-files').addEventListener('click', () => $('#f-in-files').click());
  $('#f-pick-zip').addEventListener('click', () => $('#f-in-zip').click());
  ['f-in-dir', 'f-in-files', 'f-in-zip'].forEach(id => $('#' + id).addEventListener('change', e => {
    if (e.target.files.length) setPicked(PH.upload.fromInput(e.target.files));
    e.target.value = '';
  }));
  const dz = $('#f-dz');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0) { e.preventDefault(); dz.classList.add('over'); } }));
  dz.addEventListener('dragleave', e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('over'); });
  dz.addEventListener('drop', async e => {
    e.preventDefault(); e.stopPropagation();
    dz.classList.remove('over');
    try { setPicked(await PH.upload.fromDrop(e.dataTransfer)); } catch (err) { PH.showErr('#f-error', 'Could not read the dropped files.'); }
  });

  PH.openForm = function (p, opts) {
    opts = opts || {};
    editing = p || null;
    picked = null;
    saving = false;
    formSource = p ? p.storage : (PH.features.upload ? 'managed' : 'local');
    formIcon = p ? (p.icon || '') : '';
    formColor = p ? (p.color || '') : '';
    $('#formTitle').textContent = p ? 'Edit project' : 'Add project';
    $('#f-submit').textContent = p ? 'Save changes' : 'Add project';
    $('#f-id').value = p ? p.id : '';
    $('#f-name').value = p ? p.name : '';
    $('#f-path').value = p ? p.path : '';
    $('#f-desc').value = p ? p.description : '';
    $('#f-cat').value = p ? p.category : (S.category || '');
    formStatus = p ? p.status : 'active';
    paintStatusSeg();
    paintSource();
    paintPicked();
    paintIconColor();
    $('#f-prog').hidden = true;
    $('#f-cmds').innerHTML = (p ? p.commands : []).map(cmdRow).join('');
    techTags.set(p ? p.tech : []);
    otherTags.set(p ? p.tags : []);
    PH.showErr('#f-error', '');
    $('#formDlg').showModal();
    if (opts.focus === 'commands' && PH.features.run) {
      if (!$$('.cmd-row', $('#f-cmds')).length) $('#f-cmd-add').click();
      else $('#f-cmds .cmd-label').focus();
    } else $('#f-name').focus();
  };

  function setProgress(f) {
    $('#f-prog').hidden = false;
    $('#f-prog').style.setProperty('--w', Math.round(f * 100) + '%');
  }

  $('#projectForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (saving) return;
    const id = $('#f-id').value;
    const commands = PH.features.run ? $$('.cmd-row', $('#f-cmds')).map(r => {
      const cmd = $('.cmd-cmd', r).value.trim();
      let label = $('.cmd-label', r).value.trim();
      if (!label) label = cmd.split(/\s+/).slice(0, 2).join(' ');
      return { id: r.dataset.id, label, cmd };
    }).filter(c => c.cmd) : undefined;
    const data = {
      name: $('#f-name').value.trim(),
      description: $('#f-desc').value.trim(),
      category: $('#f-cat').value.trim() || 'Other',
      status: formStatus,
      icon: formIcon,
      color: formColor,
      tech: techTags.get(),
      tags: otherTags.get()
    };
    if (commands) data.commands = commands;
    const local = formSource === 'local';
    const mode = PH.settings.importMode;
    const importing = local && !id && mode !== 'path';
    if (!id) data.storage = local && !importing ? 'local' : 'managed';
    const srcPath = local ? PH.cleanPath($('#f-path').value) : '';
    if (local && !importing) data.path = srcPath;
    if (id) data.id = id;

    if (!data.name) { PH.showErr('#f-error', 'Enter the project name.'); $('#f-name').focus(); return; }
    if (local && !srcPath) { PH.showErr('#f-error', 'Enter the path to the project folder.'); $('#f-path').focus(); return; }
    if (local && !importing) {
      const dup = S.projects.find(p => p.id !== id && p.storage === 'local' && PH.normPath(p.path) === PH.normPath(data.path));
      if (dup) { PH.showErr('#f-error', 'This folder is already in the catalog as “' + dup.name + '”.'); $('#f-path').focus(); return; }
    }
    const prob = !id && picked ? PH.upload.problem(picked) : '';
    if (prob) { PH.showErr('#f-error', prob); return; }
    PH.showErr('#f-error', '');
    if (importing && mode === 'move' && !(await PH.confirm('Move the files into ProjectHub?', 'I will copy the files from “' + srcPath + '”, and after a successful copy I will delete the copied files from that folder. Skipped folders (e.g. node_modules) stay in place. Make a backup if this is the only copy.', 'Move'))) return;

    const btn = $('#f-submit');
    const label = btn.textContent;
    saving = true;
    btn.disabled = true;
    btn.textContent = 'Saving…';
    let created = null;
    try {
      let saved = PH.replaceProject(await PH.api.saveProject(data));
      created = saved;
      if (importing) {
        btn.textContent = mode === 'move' ? 'Moving files…' : 'Copying files…';
        try {
          const r = await PH.api.importPath(saved.id, srcPath, mode === 'move');
          saved = PH.replaceProject(r.project);
          created = saved;
          PH.toast((mode === 'move' ? 'Moved ' : 'Copied ') + r.saved + ' ' + PH.plural(r.saved, 'file', 'files', 'files') + (r.skipped ? ', skipped ' + r.skipped : ''));
        } catch (err) {
          try { await PH.api.deleteProject(saved.id); S.projects = S.projects.filter(x => x.id !== saved.id); } catch (e2) { /* the empty project stays, you can remove it manually */ }
          created = null;
          throw err;
        }
      }
      const hasFiles = !id && picked && (picked.zip || picked.entries.length);
      if (hasFiles) {
        btn.textContent = 'Uploading files…';
        setProgress(0);
        const r = picked.zip
          ? await PH.api.uploadZip(saved.id, picked.zip, !data.description, setProgress)
          : await PH.api.uploadFiles(saved.id, picked.entries, { onProgress: setProgress });
        saved = PH.replaceProject(r.project);
        if (r.skipped) PH.toast('Uploaded ' + r.saved + ' ' + PH.plural(r.saved, 'file', 'files', 'files') + ', skipped ' + r.skipped + '.');
        PH.usage = (PH.usage || 0) + (picked.bytes || 0);
      }
      $('#formDlg').close();
      PH.toast(id ? 'Saved changes to “' + saved.name + '”' : 'Added “' + saved.name + '”');
      PH.dataChanged();
    } catch (err) {
      if (created) {
        $('#formDlg').close();
        PH.dataChanged();
        PH.toast('Project “' + created.name + '” was created, but the files were not uploaded: ' + err.message + ' You can add them in the Files tab.', 'error');
      } else PH.showErr('#f-error', err.message);
    } finally {
      saving = false;
      btn.disabled = false;
      btn.textContent = label;
    }
  });

  /* ---------- scanning ---------- */

  let scanFolders = [];
  const updateScanCount = () => {
    const n = $$('#s-results input[data-i]:checked').length;
    $('#s-count').textContent = scanFolders.length ? 'Selected ' + n + ' of ' + scanFolders.length : '';
    $('#s-import').disabled = n === 0;
  };
  function renderScan() {
    const known = new Set(S.projects.map(p => PH.normPath(p.path)));
    const box = $('#s-results');
    if (!scanFolders.length) { box.innerHTML = '<p class="hint">There are no subfolders to import in this folder.</p>'; updateScanCount(); return; }
    box.innerHTML =
      '<div class="list-tools"><span class="label">Found folders</span><button type="button" class="btn btn-quiet" data-scan="all">Select new</button></div>' +
      '<ul class="checklist">' + scanFolders.map((f, i) => {
        const isKnown = known.has(PH.normPath(f.path));
        return '<li><label><input type="checkbox" data-i="' + i + '"' + (isKnown ? ' disabled' : ' checked') + '>' +
          '<span class="ck-main"><span class="ck-name">' + esc(f.name) + '</span><span class="ck-sub" title="' + esc(f.path) + '">' + esc(f.path) + '</span></span>' +
          '<span class="ck-meta">' + (isKnown ? 'already in catalog' : esc((f.tech || []).join(', ')) + (f.files != null ? ((f.tech && f.tech.length) ? ', ' : '') + f.files + ' ' + plural(f.files, 'file', 'files', 'files') : '')) + '</span></label></li>';
      }).join('') + '</ul>' +
      '<div class="field" style="margin-top:14px"><label for="s-cat">Category for imported projects</label><input id="s-cat" list="catList" placeholder="Other" autocomplete="off"></div>';
    updateScanCount();
  }
  PH.openScan = function () {
    scanFolders = [];
    $('#s-results').innerHTML = '';
    PH.showErr('#s-error', '');
    updateScanCount();
    $('#scanDlg').showModal();
    $('#s-path').focus();
  };
  $('#scanForm').addEventListener('submit', async e => {
    e.preventDefault();
    const path = PH.cleanPath($('#s-path').value);
    if (!path) { PH.showErr('#s-error', 'Enter the path of the folder you want to scan.'); $('#s-path').focus(); return; }
    PH.showErr('#s-error', '');
    const btn = $('#s-go');
    btn.disabled = true; btn.textContent = 'Scanning…';
    try { scanFolders = (await PH.api.scan(path)).folders || []; renderScan(); }
    catch (err) { scanFolders = []; $('#s-results').innerHTML = ''; updateScanCount(); PH.showErr('#s-error', err.message); }
    finally { btn.disabled = false; btn.textContent = 'Scan'; }
  });
  $('#s-results').addEventListener('change', e => { if (e.target.matches('input[data-i]')) updateScanCount(); });
  $('#s-results').addEventListener('click', e => {
    if (e.target.closest('[data-scan="all"]')) { $$('#s-results input[data-i]:not(:disabled)').forEach(i => { i.checked = true; }); updateScanCount(); }
  });
  $('#s-import').addEventListener('click', async () => {
    const picks = $$('#s-results input[data-i]:checked').map(i => scanFolders[+i.dataset.i]);
    if (!picks.length) return;
    const cat = ($('#s-cat') ? $('#s-cat').value.trim() : '') || 'Other';
    const btn = $('#s-import');
    btn.disabled = true; btn.textContent = 'Importing…';
    let ok = 0, lastErr = '';
    for (const f of picks) {
      try { PH.replaceProject(await PH.api.saveProject({ name: f.name, storage: 'local', path: f.path, description: '', category: cat, status: 'idea', tech: f.tech || [], tags: [], commands: [] })); ok++; }
      catch (err) { lastErr = err.message; }
    }
    btn.textContent = 'Import selected';
    PH.dataChanged();
    if (ok) {
      $('#scanDlg').close();
      PH.toast('Imported ' + ok + ' ' + plural(ok, 'project', 'projects', 'projects') + (ok < picks.length ? '. Could not add the rest: ' + lastErr : ''), ok < picks.length ? 'error' : undefined);
    } else { btn.disabled = false; PH.showErr('#s-error', lastErr || 'Could not import the projects.'); }
  });

  /* ---------- backup ---------- */

  const updateBackupCount = () => {
    const live = S.projects.filter(p => !p.archived).length;
    $('#b-count').textContent = 'Selected ' + $$('#b-list input:checked').length + ' of ' + live;
  };
  PH.openBackup = function (preselect) {
    const live = S.projects.filter(p => !p.archived);
    if (!live.length) { PH.toast('First add a project you want to back up.', 'error'); return; }
    const ids = new Set(preselect || live.map(p => p.id));
    $('#b-list').innerHTML = live.map(p => {
      const b = PH.backupInfo(p);
      return '<li><label><input type="checkbox" value="' + esc(p.id) + '"' + (ids.has(p.id) ? ' checked' : '') + '>' +
        '<span class="ck-main"><span class="ck-name">' + esc(p.name) + '</span><span class="ck-sub">' + esc(p.path) + '</span></span>' +
        '<span class="ck-meta">' + b.text + '</span></label></li>';
    }).join('');
    let dest = PH.settings.backupDest;
    if (!dest) { try { dest = localStorage.getItem('ph_backup_dest') || ''; } catch (e) { /* ditto */ } }
    $('#b-dest').value = dest;
    const toPath = PH.features.backupToPath;
    $('#b-dest-box').hidden = !toPath;
    $('#b-go').hidden = !toPath;
    $('#b-dl').classList.toggle('btn-primary', !toPath);
    $('#b-lead').innerHTML = toPath ? 'Each selected project goes into a separate ZIP file with a date in the name, e.g. <code id="b-example">project-name-' + new Date().toISOString().slice(0, 10) + '.zip</code>. Inside is a <code>PROJECTHUB-INFO</code> folder with the description, notes, tasks and documentation.' : 'Selected projects are downloaded as one ZIP file (files + a <code>PROJECTHUB-INFO</code> folder with description, notes, tasks, documentation and images).';
    const ex = PH.settings.backupExclude;
    $('#b-exclude').textContent = ex.length ? 'Excluded folders: ' + ex.join(', ') + ' (you can change this in settings).' : '';
    $('#b-results').innerHTML = '';
    $('#b-all').textContent = ids.size >= live.length ? 'Deselect all' : 'Select all';
    PH.showErr('#b-error', '');
    updateBackupCount();
    $('#backupDlg').showModal();
    if (toPath) $('#b-dest').focus();
  };
  $('#b-dl').addEventListener('click', () => {
    const ids = $$('#b-list input:checked').map(i => i.value);
    if (!ids.length) { PH.showErr('#b-error', 'Select at least one project.'); return; }
    PH.showErr('#b-error', '');
    const a = document.createElement('a');
    a.href = ids.length === 1 ? PH.api.downloadUrl(ids[0]) : PH.api.backupDownloadUrl(ids);
    a.download = '';
    document.body.appendChild(a); a.click(); a.remove();
    PH.toast('ZIP download started');
  });
  $('#b-list').addEventListener('change', updateBackupCount);
  $('#b-all').addEventListener('click', () => {
    const boxes = $$('#b-list input');
    const all = boxes.every(b => b.checked);
    boxes.forEach(b => { b.checked = !all; });
    $('#b-all').textContent = all ? 'Select all' : 'Deselect all';
    updateBackupCount();
  });
  $('#backupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const ids = $$('#b-list input:checked').map(i => i.value);
    if (!PH.features.backupToPath) { $('#b-dl').click(); return; }
    const dest = PH.cleanPath($('#b-dest').value);
    if (!dest) { PH.showErr('#b-error', 'Enter the destination folder, e.g. E:\\Backups.'); $('#b-dest').focus(); return; }
    if (!ids.length) { PH.showErr('#b-error', 'Select at least one project.'); return; }
    PH.showErr('#b-error', '');
    const btn = $('#b-go');
    btn.disabled = true; btn.textContent = 'Creating archives…';
    try {
      const r = await PH.api.backup(ids, dest, PH.settings.backupExclude);
      try { localStorage.setItem('ph_backup_dest', dest); } catch (err) { /* ditto */ }
      const results = r.results || [];
      results.forEach(x => { const p = PH.find(x.id); if (x.ok && p) p.backedUpAt = x.backedUpAt || new Date().toISOString(); });
      PH.dataChanged();
      const okN = results.filter(x => x.ok).length;
      $('#b-results').innerHTML = '<ul class="results">' + results.map(x => {
        const p = PH.find(x.id);
        const name = p ? p.name : x.id;
        return x.ok
          ? '<li><strong>' + esc(name) + ' <span class="ok">done</span></strong><code>' + esc(x.file) + '</code></li>'
          : '<li class="fail"><strong>' + esc(name) + ' <span class="bad">error</span></strong><span>' + esc(x.error || 'Could not create the archive.') + '</span></li>';
      }).join('') + '</ul>';
      $('#b-results').scrollIntoView({ block: 'nearest' });
      PH.toast('Created ' + okN + ' of ' + results.length + ' ' + plural(results.length, 'archive', 'archives', 'archives'), okN < results.length ? 'error' : undefined);
      if (okN) { const rc = btn.getBoundingClientRect(); PH.confetti(rc.left + rc.width / 2, rc.top); }
    } catch (err) { PH.showErr('#b-error', err.message); }
    finally { btn.disabled = false; btn.textContent = 'Save to folder'; }
  });

  /* ---------- project sizes (ranking) ---------- */

  function paintSizes(animate) {
    const live = S.projects.filter(p => !p.archived && p.sizeBytes).sort((a, b) => b.sizeBytes - a.sizeBytes);
    const total = live.reduce((s, p) => s + p.sizeBytes, 0);
    const max = live.length ? live[0].sizeBytes : 1;
    $('#sizesBody').innerHTML = live.length
      ? '<p class="size-total"><strong>' + PH.fmtSize(total) + '</strong> across ' + live.length + ' ' + plural(live.length, 'project', 'projects', 'projects') + '</p>' +
        '<ol class="size-list">' + live.map((p, i) =>
          '<li><button type="button" class="size-row" data-id="' + esc(p.id) + '" title="' + esc(p.name + ': ' + PH.fmtSize(p.sizeBytes) + ' (' + Math.round(p.sizeBytes / total * 100) + '% of total)') + '">' +
          '<span class="size-name">' + esc(p.name) + '</span>' +
          '<span class="size-bar"><i style="--w:' + (p.sizeBytes / max * 100).toFixed(1) + '%;--d:' + (animate ? i * 55 : 0) + 'ms"></i></span>' +
          '<span class="size-val">' + PH.fmtSize(p.sizeBytes) + '</span></button></li>').join('') + '</ol>'
      : '<p class="lead">Folder sizes are not known yet. Press “Recalculate sizes”.</p>';
    $('#sizesHint').textContent = 'The largest projects are the easiest ones to back up or move to an external drive.';
    requestAnimationFrame(() => $('#sizesBody').classList.add('go'));
  }
  PH.openSizes = function () {
    $('#sizesBody').classList.remove('go');
    paintSizes(true);
    $('#sizesDlg').showModal();
  };
  $('#sizesGo').addEventListener('click', async () => {
    const btn = $('#sizesGo');
    await PH.withBusy(btn, 'Counting…', async () => {
      const r = await PH.api.refreshSizes();
      S.projects.forEach(p => { if (r.sizes && r.sizes[p.id] != null) p.sizeBytes = r.sizes[p.id]; });
      $('#sizesBody').classList.remove('go');
      paintSizes(true);
      PH.dataChanged();
    });
  });
  $('#sizesBody').addEventListener('click', e => {
    const b = e.target.closest('.size-row');
    if (b) { $('#sizesDlg').close(); PH.go('#/projekt/' + b.dataset.id); }
  });
  document.addEventListener('click', e => { if (e.target.closest('#btnSizes')) PH.openSizes(); });
})();
