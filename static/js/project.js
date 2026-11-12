/* project.js: fullscreen project view (like a game page on Steam):
   banner from the first image, gallery, tasks, notes, documentation and file browser. */
(function () {
  'use strict';
  const PH = window.PH;
  const { $, $$, esc, plural } = PH;
  const icon = PH.icon;

  const TABS = [['przeglad', 'Overview', 'image'], ['zadania', 'Tasks', 'tasks'], ['notatki', 'Notes', 'note'], ['dokumentacja', 'Docs', 'book'], ['podglad', 'Preview', 'play'], ['pliki', 'Files', 'folder']];
  const visibleTabs = () => TABS.filter(t => t[0] !== 'podglad' || PH.features.preview);

  /* ---------- Markdown editor (notes and docs) ---------- */

  const TOOLS = [['h', 'Heading', 'H'], ['b', 'Bold (Ctrl+B)', 'B'], ['i', 'Italic (Ctrl+I)', 'I'], ['code', 'Code', '</>'], ['ul', 'List', 'List'], ['task', 'Task', 'Task'], ['quote', 'Quote', 'Quote'], ['link', 'Link', 'Link']];
  const MODES = [['edit', 'Edit'], ['split', 'Split'], ['preview', 'Preview']];

  function mdEditor(root, o) {
    let mode = o.mode || 'split';
    root.innerHTML =
      '<div class="ed" data-mode="' + mode + '"><div class="ed-bar"><div class="ed-tools" role="toolbar" aria-label="Formatting">' +
      TOOLS.map(t => '<button type="button" class="tool" data-fmt="' + t[0] + '" title="' + t[1] + '" aria-label="' + t[1] + '">' + t[2] + '</button>').join('') +
      '</div><div class="ed-right"><span class="save-state" role="status"></span><div class="seg seg-sm" role="radiogroup" aria-label="Editor mode">' +
      MODES.map(m => '<button type="button" role="radio" data-mode="' + m[0] + '" aria-checked="' + (m[0] === mode) + '">' + m[1] + '</button>').join('') +
      '</div></div></div><div class="ed-panes"><textarea class="ed-ta" spellcheck="false" aria-label="Markdown content" placeholder="' + esc(o.placeholder || 'Write in Markdown…') + '"></textarea>' +
      '<div class="ed-prev prose" aria-label="Preview"></div></div></div>';
    const el = $('.ed', root), ta = $('.ed-ta', root), prev = $('.ed-prev', root), state = $('.save-state', root);
    ta.value = o.value || '';
    const update = () => { prev.innerHTML = PH.md.render(ta.value).html || '<p class="muted">The preview will appear here once you start writing.</p>'; };
    update();

    const fire = () => { ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus(); };
    const wrap = (a, b, ph) => {
      const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph;
      ta.setRangeText(a + sel + b, s, e, 'end');
      ta.setSelectionRange(s + a.length, s + a.length + sel.length);
      fire();
    };
    const prefix = p => {
      const v = ta.value;
      const s = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
      let e = v.indexOf('\n', ta.selectionEnd);
      if (e < 0) e = v.length;
      const block = v.slice(s, e).split('\n').map(l => p + l).join('\n');
      ta.setRangeText(block, s, e, 'select');
      fire();
    };
    const fmt = k => {
      if (k === 'b') wrap('**', '**', 'text');
      else if (k === 'i') wrap('*', '*', 'text');
      else if (k === 'code') {
        const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
        if (sel.indexOf('\n') >= 0) wrap('~~~\n', '\n~~~', ''); else wrap('`', '`', 'code');
      }
      else if (k === 'h') prefix('## ');
      else if (k === 'ul') prefix('- ');
      else if (k === 'task') prefix('- [ ] ');
      else if (k === 'quote') prefix('> ');
      else if (k === 'link') {
        const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || 'link description';
        ta.setRangeText('[' + sel + '](https://)', s, e, 'end');
        const urlStart = s + sel.length + 3;
        ta.setSelectionRange(urlStart + 8, urlStart + 8);
        fire();
      }
    };
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-fmt]');
      if (t) { fmt(t.dataset.fmt); return; }
      const m = e.target.closest('[data-mode]');
      if (m) {
        mode = m.dataset.mode;
        el.dataset.mode = mode;
        $$('[data-mode]', root).forEach(b => b.setAttribute('aria-checked', String(b === m)));
        if (o.onMode) o.onMode(mode);
      }
    });
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'b') { e.preventDefault(); fmt('b'); }
        else if (e.key === 'i') { e.preventDefault(); fmt('i'); }
      }
    });
    ta.addEventListener('input', () => { update(); if (o.onInput) o.onInput(ta.value); });
    return {
      value: () => ta.value,
      focus: () => ta.focus(),
      state: txt => { state.textContent = txt; state.classList.toggle('ok', txt === 'Saved'); }
    };
  }

  /* ---------- view ---------- */

  PH.views.project = function (route) {
    const view = PH.view;
    const id = route.id;
    const cur = () => PH.find(id);
    if (!cur()) {
      view.innerHTML = '<div class="page"><div class="empty"><h2>Project not found</h2><p>This project was deleted or the address is wrong.</p><div class="empty-actions"><a class="btn btn-primary" href="#/">Back to library</a></div></div></div>';
      return;
    }

    let tab = visibleTabs().some(t => t[0] === route.tab) ? route.tab : (PH.settings.tabDefault || 'przeglad');
    let destroyTab = null, gi = 0, docSel = route.doc || null, bannerDone = false;

    view.innerHTML =
      '<div class="proj" id="proj"><section class="banner" id="banner" aria-label="Project banner"></section>' +
      '<div class="proj-body"><div class="proj-main"><div class="tabs" id="tabs" role="tablist" aria-label="Project sections"></div>' +
      '<div class="tabpanel" id="tabPanel" role="tabpanel" tabindex="-1"></div></div><aside class="proj-side" id="projSide" aria-label="Project info"></aside></div></div>';

    /* ----- banner ----- */

    const runLabel = c => (c.label && c.label.toLowerCase() !== 'run') ? 'Run: ' + esc(c.label) : 'Run';

    function runBtnHtml(p) {
      const cs = p.commands;
      if (!PH.features.run) return PH.features.preview ? '<button class="btn btn-lg btn-primary" type="button" data-act="goto-tab" data-tab="podglad">' + icon('play') + '<span>Live preview</span></button>' : '';
      if (!cs.length) return '<button class="btn btn-lg btn-primary" type="button" data-act="add-cmd">' + icon('plus') + '<span>Add command</span></button>';
      return '<div class="split"><button class="btn btn-lg btn-primary" type="button" data-act="run" data-cmd="' + esc(cs[0].id) + '">' + icon('play') + '<span>' + runLabel(cs[0]) + '</span></button>' +
        (cs.length > 1 ? '<button class="btn btn-lg btn-primary split-more" type="button" data-act="run-menu" aria-haspopup="menu" aria-label="Pick another command">' + icon('chev') + '</button>' : '') + '</div>';
    }

    function paintBanner() {
      const p = cur(), b = $('#banner'), st = PH.STATUS[p.status], hero = p.images[0];
      const words = p.name.split(/\s+/).map((w, i) => '<span class="w"><span style="--d:' + (i * 70) + 'ms">' + esc(w) + '</span></span>').join(' ');
      b.setAttribute('style', PH.tabStyle(p));
      b.classList.toggle('settled', bannerDone);
      b.innerHTML =
        '<div class="banner-bg">' + (hero ? '<img src="' + esc(hero.url) + '" alt="" draggable="false">' : '<div class="banner-ghost" aria-hidden="true">' + esc(PH.glyph(p)) + '</div>') + '</div>' +
        '<div class="banner-shade"></div>' +
        '<div class="banner-top"><a class="back" href="#/' + (p.archived ? 'archiwum' : '') + '">' + icon('back') + '<span>' + (p.archived ? 'Archive' : 'Library') + '</span></a></div>' +
        '<div class="banner-content"><div class="banner-meta"><span class="tab-pill">' + esc(p.category) + '</span><span class="st" style="--st:' + st.c + '">' + st.label + '</span>' +
        (p.archived ? '<span class="st st-arch">Archived</span>' : '') + '</div>' +
        '<h1 id="projTitle">' + words + '</h1>' +
        (p.description ? '<p class="banner-sub">' + esc(p.description) + '</p>' : '') +
        '<div class="banner-actions">' + runBtnHtml(p) +
        (PH.features.openFolder && p.storage === 'local' ? '<button class="btn btn-lg btn-glass" type="button" data-act="open-folder">' + icon('folder') + '<span>Open folder</span></button>' : '') +
        '<button class="btn btn-lg btn-glass btn-icon star-btn" type="button" data-act="star" aria-pressed="' + p.favorite + '" aria-label="' + (p.favorite ? 'Remove from favorites' : 'Add to favorites') + '" title="Favorite">' + icon('star') + '</button>' +
        '<button class="btn btn-lg btn-glass" type="button" data-act="edit">' + icon('edit') + '<span>Edit</span></button>' +
        '<button class="btn btn-lg btn-glass btn-icon" type="button" data-act="more" aria-haspopup="menu" aria-label="More options">' + icon('more') + '</button></div></div>';
      bannerDone = true;
      onScroll();
    }

    /* ----- side panel ----- */

    function paintSide() {
      const p = cur(), bk = PH.backupInfo(p);
      $('#projSide').innerHTML =
        '<div class="side-card"><div class="side-cover" style="' + PH.tabStyle(p) + '">' +
        (p.images[0] ? '<img src="' + esc(p.images[0].url) + '" alt="" draggable="false">' : '<span class="initials' + (p.icon ? ' is-emoji' : '') + '" aria-hidden="true">' + esc(PH.glyph(p)) + '</span>') + '</div>' +
        '<div class="side-body">' +
        '<p class="side-desc' + (p.description ? '' : ' muted') + '">' + (p.description ? esc(p.description) : 'No description. Add one when editing the project.') + '</p>' +
        '<dl class="kv">' +
        '<div><dt>Status</dt><dd><div class="st-pick" role="radiogroup" aria-label="Project status">' + PH.STATUS_ORDER.map(k =>
          '<button type="button" role="radio" data-act="status" data-v="' + k + '" aria-checked="' + (p.status === k) + '" style="--st:' + PH.STATUS[k].c + '"><i></i>' + PH.STATUS[k].label + '</button>').join('') + '</div></dd></div>' +
        '<div><dt>Category</dt><dd>' + esc(p.category) + '</dd></div>' +
        '<div><dt>Size</dt><dd>' + (p.sizeBytes ? PH.fmtSize(p.sizeBytes) : 'unknown') + '</dd></div>' +
        '<div><dt>Changed</dt><dd>' + esc(PH.ago(p.updatedAt) || '') + '</dd></div>' +
        '<div><dt>Backup</dt><dd><span class="bk bk-' + bk.cls + '">' + bk.text + '</span> <button class="linkish" type="button" data-act="backup">Make backup</button></dd></div></dl>' +
        (p.storage === 'local' ? '<div class="pathrow"><code>' + esc(p.path) + '</code><button class="icon-btn" type="button" data-act="copy-path" aria-label="Copy path" title="Copy path">' + icon('copy') + '</button></div>' : '<div class="pathrow managed"><span>' + icon('box') + ' Files stored in ProjectHub</span><a class="linkish" href="' + esc(PH.api.downloadUrl(p.id)) + '" download>Download ZIP</a></div>') +
        (p.tech.length ? '<div class="tagrow">' + p.tech.map(t => '<span>' + esc(t) + '</span>').join('') + '</div>' : '') +
        (p.tags.length ? '<div class="tagrow">' + p.tags.map(t => '<span class="tag-hash">' + esc(t) + '</span>').join('') + '</div>' : '') +
        '</div></div>';
    }

    /* ----- tabs ----- */

    function tabCount(k) {
      const p = cur();
      if (k === 'zadania') return p.tasks.filter(t => t.state !== 'done').length;
      if (k === 'dokumentacja') return p.docs.length;
      if (k === 'przeglad') return p.images.length;
      return 0;
    }
    function moveInd() {
      const tabs = $('#tabs'), on = tabs && $('[aria-selected="true"]', tabs);
      if (on) { tabs.style.setProperty('--ix', on.offsetLeft + 'px'); tabs.style.setProperty('--iw', on.offsetWidth + 'px'); }
    }
    function paintTabs() {
      $('#tabs').innerHTML = visibleTabs().map(t => {
        const n = tabCount(t[0]);
        return '<button type="button" role="tab" id="tab-' + t[0] + '" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '" aria-controls="tabPanel">' + icon(t[2]) + '<span>' + t[1] + '</span>' + (n ? '<em>' + n + '</em>' : '') + '</button>';
      }).join('') + '<i class="tab-ind" aria-hidden="true"></i>';
      moveInd();
    }

    const TABFN = { przeglad: tabOverview, zadania: tabTasks, notatki: tabNotes, dokumentacja: tabDocs, podglad: tabPreview, pliki: tabFiles };
    function mountTab() {
      if (destroyTab) { try { destroyTab(); } catch (e) { console.error(e); } destroyTab = null; }
      const panel = $('#tabPanel');
      panel.classList.remove('tab-enter');
      panel.innerHTML = '';
      void panel.offsetWidth;
      panel.classList.add('tab-enter');
      panel.setAttribute('aria-labelledby', 'tab-' + tab);
      destroyTab = TABFN[tab](panel) || null;
    }
    function setTab(t, silent) {
      if (!TABS.some(x => x[0] === t)) t = 'przeglad';
      if (t === tab && $('#tabPanel').firstChild) return;
      tab = t;
      paintTabs();
      mountTab();
      if (!silent) {
        try { history.replaceState(null, '', '#/projekt/' + encodeURIComponent(id) + '/' + t); } catch (e) { /* ditto */ }
        if (PH.route) PH.route.tab = t;
      }
    }
    PH.projectSetTab = (t, doc) => { if (doc) docSel = doc; if (t === tab && t === 'dokumentacja') mountTab(); else setTab(t); };

    /* ----- overview ----- */

    function tabOverview(panel) {
      const root = document.createElement('div');
      root.className = 'ov';
      panel.appendChild(root);
      root.innerHTML = '<section class="gal" id="gal" aria-label="Gallery"></section><div class="ov-cards" id="ovCards"></div>';

      function paintGal(dir) {
        const p = cur(), gal = $('#gal', root);
        if (!p.images.length) {
          gal.innerHTML = '<label class="gal-empty">' + icon('image') + '<strong>Add screenshots and mockups</strong><span>Drag files onto this page, paste them with Ctrl+V or click here.</span><input type="file" accept="image/*" multiple aria-label="Add images"></label>';
          return;
        }
        if (gi >= p.images.length) gi = p.images.length - 1;
        const im = p.images[gi];
        gal.innerHTML =
          '<div class="gal-main"><img class="bg" src="' + esc(im.url) + '" alt="" draggable="false"><img class="fg' + (dir ? ' slide-' + dir : '') + '" src="' + esc(im.url) + '" alt="' + esc(im.name) + '" draggable="false">' +
          '<button class="gal-hit" type="button" data-act="lightbox" aria-label="Enlarge image ' + esc(im.name) + '"></button>' +
          (p.images.length > 1 ? '<button class="gal-nav gal-prev" type="button" data-act="gal-prev" aria-label="Previous image">' + icon('back') + '</button><button class="gal-nav gal-next" type="button" data-act="gal-next" aria-label="Next image">' + icon('next') + '</button>' : '') +
          '<span class="gal-count">' + (gi + 1) + ' / ' + p.images.length + '</span></div>' +
          '<div class="gal-thumbs">' + p.images.map((x, i) =>
            '<div class="gthumb' + (i === gi ? ' on' : '') + '"><button type="button" class="gthumb-btn" data-act="gal-go" data-i="' + i + '" aria-label="Show image ' + esc(x.name) + '"><img src="' + esc(x.url) + '" alt="" draggable="false"></button>' +
            (i === 0 ? '<span class="gthumb-badge">Banner</span>' : '<button type="button" class="gthumb-cover" data-act="img-cover" data-img="' + esc(x.id) + '" title="Set as banner">Set banner</button>') +
            '<button type="button" class="gthumb-x" data-act="img-del" data-img="' + esc(x.id) + '" aria-label="Delete image ' + esc(x.name) + '">' + icon('x') + '</button></div>').join('') +
          '<label class="gthumb-add" title="Add images">' + icon('plus') + '<span>Add</span><input type="file" accept="image/*" multiple aria-label="Add images"></label></div>' +
          '<p class="hint">Drag images onto this page or paste them with Ctrl+V. The first image is the project banner.</p>';
      }

      function paintCards() {
        const p = cur(), done = p.tasks.filter(t => t.state === 'done').length, total = p.tasks.length;
        const next = p.tasks.filter(t => t.state !== 'done').sort((a, b) => (a.state === 'doing' ? -1 : 1) - (b.state === 'doing' ? -1 : 1)).slice(0, 4);
        $('#ovCards', root).innerHTML =
          (p.description ? '<section class="card"><h3>Description</h3><p class="card-text">' + esc(p.description) + '</p></section>' : '') +
          (PH.features.run ? '<section class="card"><div class="card-h"><h3>Commands</h3><button class="btn btn-quiet btn-sm" type="button" data-act="manage-cmds">' + (p.commands.length ? 'Manage' : 'Add') + '</button></div>' +
          (p.commands.length ? '<ul class="cmd-items">' + p.commands.map(c =>
            '<li><div class="cmd-info"><strong>' + esc(c.label) + '</strong><code>' + esc(c.cmd) + '</code></div>' +
            '<button class="icon-btn" type="button" data-act="copy-cmd" data-cmd="' + esc(c.id) + '" aria-label="Copy command ' + esc(c.label) + '">' + icon('copy') + '</button>' +
            '<button class="btn btn-sm" type="button" data-act="run" data-cmd="' + esc(c.id) + '">' + icon('play') + '<span>Run</span></button></li>').join('') + '</ul>'
            : '<p class="hint">Add commands, e.g. “Server” or “Tests”, to run the project with one click.</p>') + '</section>' : '') +
          '<section class="card"><div class="card-h"><h3>Tasks</h3><button class="btn btn-quiet btn-sm" type="button" data-act="goto-tab" data-tab="zadania">All</button></div>' +
          (total ? '<div class="prog"><div class="bar"><i style="--w:' + Math.round(done / total * 100) + '%"></i></div><span>' + done + ' of ' + total + ' done</span></div>' +
            (next.length ? '<ul class="mini-tasks">' + next.map(t => '<li class="' + t.state + '"><i></i>' + esc(t.text) + '</li>').join('') + '</ul>' : '<p class="hint">All done. Good job.</p>')
            : '<p class="hint">No tasks yet. Add the first one in the Tasks tab.</p>') + '</section>';
        requestAnimationFrame(() => $$('.bar', root).forEach(b => b.classList.add('go')));
      }
      paintGal(); paintCards();

      PH.projectRepaintOverview = () => { paintGal(); paintCards(); };
      PH.projectGalleryGo = dir => { const n = cur().images.length; if (n > 1) { gi = (gi + dir + n) % n; paintGal(dir > 0 ? 'r' : 'l'); } };

      root.addEventListener('click', async e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const p = cur();
        switch (b.dataset.act) {
          case 'gal-go': { const i = +b.dataset.i, dir = i > gi ? 'r' : 'l'; if (i !== gi) { gi = i; paintGal(dir); } break; }
          case 'gal-prev': PH.projectGalleryGo(-1); break;
          case 'gal-next': PH.projectGalleryGo(1); break;
          case 'lightbox': PH.openLightbox(p.images, gi); break;
          case 'img-del': {
            const im = p.images.find(x => x.id === b.dataset.img);
            if (!await PH.confirmDelete('Delete the image?', 'The image “' + (im ? im.name : '') + '” will disappear from this project\'s gallery.', 'Delete image')) break;
            try { PH.replaceProject(await PH.api.removeImage(id, b.dataset.img)); gi = Math.max(0, Math.min(gi, cur().images.length - 1)); afterImages(); PH.toast('Image deleted'); }
            catch (err) { PH.toast(err.message, 'error'); }
            break;
          }
          case 'img-cover':
            try { PH.replaceProject(await PH.api.setCover(id, b.dataset.img)); gi = 0; afterImages(); PH.toast('New banner set'); }
            catch (err) { PH.toast(err.message, 'error'); }
            break;
          case 'manage-cmds': PH.openForm(p, { focus: 'commands' }); break;
          case 'copy-cmd': { const c = p.commands.find(x => x.id === b.dataset.cmd); if (c) PH.copy(c.cmd, 'Command copied'); break; }
          case 'run': PH.runCommand(id, b.dataset.cmd, b); break;
          case 'goto-tab': setTab(b.dataset.tab); break;
        }
      });
      root.addEventListener('change', e => {
        if (e.target.matches('input[type="file"]')) { upload(Array.from(e.target.files)); e.target.value = ''; }
      });
      return () => { PH.projectRepaintOverview = null; PH.projectGalleryGo = null; };
    }

    function afterImages() {
      paintBanner(); paintSide(); paintTabs();
      if (tab === 'przeglad' && PH.projectRepaintOverview) PH.projectRepaintOverview();
      if (PH.updateNav) PH.updateNav();
    }

    async function upload(files) {
      const imgs = files.filter(f => /^image\//.test(f.type));
      if (!imgs.length) { PH.toast('Choose image files (PNG, JPG, WebP, GIF).', 'error'); return; }
      const before = cur().images.length;
      const gal = $('#gal');
      if (gal) gal.classList.add('busy');
      try {
        PH.replaceProject(await PH.api.addImages(id, imgs));
        gi = before;
        afterImages();
        PH.toast('Added ' + imgs.length + ' ' + plural(imgs.length, 'image', 'images', 'images'));
      } catch (err) { PH.toast(err.message, 'error'); if (gal) gal.classList.remove('busy'); }
    }

    /* ----- tasks ----- */

    function tabTasks(panel) {
      const root = document.createElement('div');
      root.className = 'tk';
      panel.appendChild(root);
      root.innerHTML =
        '<div class="tk-top"><div><h2>Tasks</h2><p class="hint" id="tkSum"></p></div><div class="prog tk-prog"><div class="bar"><i id="tkBar"></i></div></div></div>' +
        '<form class="tk-add" id="tkForm"><input id="tkIn" placeholder="Add a task and press Enter" maxlength="200" autocomplete="off" aria-label="New task"><button class="btn btn-primary" type="submit">Add</button></form>' +
        '<div id="tkList"></div>';

      function paint() {
        const p = cur(), tasks = p.tasks, done = tasks.filter(t => t.state === 'done').length;
        $('#tkSum', root).textContent = tasks.length ? done + ' of ' + tasks.length + ' done' : 'Start with your first task.';
        requestAnimationFrame(() => { const bar = $('#tkBar', root); if (bar) { bar.style.setProperty('--w', (tasks.length ? Math.round(done / tasks.length * 100) : 0) + '%'); bar.parentElement.classList.add('go'); } });
        const sec = (state, label) => {
          const list = tasks.filter(t => t.state === state);
          if (!list.length) return '';
          return '<section class="tk-sec"><h3>' + label + ' <em>' + list.length + '</em></h3><ul>' + list.map(t =>
            '<li class="tk-row st-' + t.state + '" data-id="' + esc(t.id) + '">' +
            '<button class="chk" type="button" data-act="tk-done" aria-pressed="' + (t.state === 'done') + '" aria-label="' + (t.state === 'done' ? 'Mark as not done: ' : 'Mark as done: ') + esc(t.text) + '">' + icon('check') + '</button>' +
            '<span class="tk-text" data-act="tk-rename" title="Double-click to rename">' + esc(t.text) + '</span>' +
            (t.state !== 'done' ? '<button class="icon-btn' + (t.state === 'doing' ? ' on' : '') + '" type="button" data-act="tk-doing" aria-pressed="' + (t.state === 'doing') + '" title="' + (t.state === 'doing' ? 'Move back to “To do”' : 'Mark as “In progress”') + '" aria-label="Mark as in progress: ' + esc(t.text) + '">' + icon('flag') + '</button>' : '') +
            '<button class="icon-btn" type="button" data-act="tk-del" aria-label="Delete task ' + esc(t.text) + '">' + icon('x') + '</button></li>').join('') + '</ul></section>';
        };
        $('#tkList', root).innerHTML = tasks.length ? sec('doing', 'In progress') + sec('todo', 'To do') + sec('done', 'Done') :
          '<div class="empty small"><h2>No tasks</h2><p>Type your first task above. Tasks from all projects appear together on the board in the Tasks tab at the top.</p></div>';
      }
      async function commit(next) {
        const prev = cur().tasks;
        PH.flip([$('#tkList', root)], () => { cur().tasks = next; paint(); }, '.tk-row', 'id');
        paintTabs();
        if (PH.updateNav) PH.updateNav();
        try { await PH.patch(id, { tasks: next }); }
        catch (err) { cur().tasks = prev; paint(); paintTabs(); if (PH.updateNav) PH.updateNav(); PH.toast(err.message, 'error'); }
      }
      paint();

      $('#tkForm', root).addEventListener('submit', e => {
        e.preventDefault();
        const input = $('#tkIn', root), text = input.value.trim();
        if (!text) return;
        input.value = '';
        commit(cur().tasks.concat([{ id: PH.uid(), text, state: 'todo' }]));
        input.focus();
      });
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        const row = e.target.closest('.tk-row');
        if (!b || !row) return;
        const tid = row.dataset.id, tasks = cur().tasks, t = tasks.find(x => x.id === tid);
        if (!t) return;
        const set = state => commit(tasks.map(x => x.id === tid ? Object.assign({}, x, { state }) : x));
        if (b.dataset.act === 'tk-done') set(t.state === 'done' ? 'todo' : 'done');
        else if (b.dataset.act === 'tk-doing') set(t.state === 'doing' ? 'todo' : 'doing');
        else if (b.dataset.act === 'tk-del') commit(tasks.filter(x => x.id !== tid));
      });
      root.addEventListener('dblclick', async e => {
        const tx = e.target.closest('[data-act="tk-rename"]');
        if (!tx) return;
        const row = tx.closest('.tk-row'), t = cur().tasks.find(x => x.id === row.dataset.id);
        const name = await PH.prompt('Rename task', 'Task text', t.text, 'Save');
        if (name) commit(cur().tasks.map(x => x.id === t.id ? Object.assign({}, x, { text: name }) : x));
      });
      return null;
    }

    /* ----- notes ----- */

    function tabNotes(panel) {
      const root = document.createElement('div');
      root.className = 'notes';
      panel.appendChild(root);
      root.innerHTML = '<div class="pane-head"><h2>Notes</h2><p class="hint">Markdown with a live preview. Saves automatically.</p></div><div id="edRoot"></div>';
      let dirty = false, ed;
      const save = PH.debounce(async () => {
        ed.state('Saving…');
        const val = ed.value();
        try { await PH.patch(id, { notes: val }); dirty = false; ed.state('Saved'); }
        catch (err) { ed.state('Not saved'); PH.toast(err.message, 'error'); }
      }, 800);
      ed = mdEditor($('#edRoot', root), {
        value: cur().notes, mode: PH.settings.notesMode,
        placeholder: 'What\'s done, what\'s left, where you keep keys and config…',
        onInput: () => { dirty = true; ed.state('Unsaved changes…'); save(); },
        onMode: m => PH.setSetting('notesMode', m)
      });
      return () => { if (dirty) save.flush(); else save.cancel(); };
    }

    /* ----- documentation ----- */

    function tabDocs(panel) {
      const root = document.createElement('div');
      root.className = 'docs';
      panel.appendChild(root);
      let edit = false, ed = null, dirty = false, spyOff = null;

      const saveDocs = PH.debounce(async () => {
        if (ed) ed.state('Saving…');
        try { await PH.patch(id, { docs: cur().docs }); dirty = false; if (ed) ed.state('Saved'); }
        catch (err) { if (ed) ed.state('Not saved'); PH.toast(err.message, 'error'); }
      }, 800);

      function paint(anim) {
        if (spyOff) { spyOff(); spyOff = null; }
        ed = null;
        const p = cur(), docs = p.docs;
        if (!docs.length) {
          root.className = 'docs docs-empty';
          root.innerHTML = '<div class="empty"><h2>Project documentation</h2><p>Keep instructions, architecture and decisions here. Pages are written in Markdown and the table of contents builds itself from headings.</p>' +
            '<div class="empty-actions"><button class="btn btn-primary" type="button" data-act="doc-new">New page</button><button class="btn" type="button" data-act="doc-template">Insert README template</button></div></div>';
          return;
        }
        root.className = 'docs';
        if (!docs.find(d => d.id === docSel)) docSel = docs[0].id;
        const i = docs.findIndex(d => d.id === docSel), d = docs[i];
        const r = PH.md.render(d.body);
        const prevD = docs[i - 1], nextD = docs[i + 1];
        root.innerHTML =
          '<nav class="docs-nav" aria-label="Documentation pages"><div class="docs-nav-h">Pages</div><ul>' +
          docs.map(x => '<li><button type="button" class="dn' + (x.id === docSel ? ' on' : '') + '" data-doc="' + esc(x.id) + '"' + (x.id === docSel ? ' aria-current="page"' : '') + '>' + esc(x.title) + '</button></li>').join('') +
          '</ul><button class="btn btn-quiet btn-sm" type="button" data-act="doc-new">' + icon('plus') + '<span>New page</span></button></nav>' +
          '<article class="docs-main' + (anim ? ' doc-enter' : '') + '"><div class="docs-bar"><span class="crumb">Docs <i>/</i> <b>' + esc(d.title) + '</b></span><div class="docs-actions">' +
          '<button class="btn btn-sm" type="button" data-act="doc-edit">' + icon(edit ? 'book' : 'edit') + '<span>' + (edit ? 'Done' : 'Edit') + '</span></button>' +
          '<button class="icon-btn" type="button" data-act="doc-rename" title="Rename page" aria-label="Rename page">' + icon('note') + '</button>' +
          '<button class="icon-btn" type="button" data-act="doc-copy" title="Copy as Markdown" aria-label="Copy as Markdown">' + icon('copy') + '</button>' +
          '<button class="icon-btn" type="button" data-act="doc-del" title="Delete page" aria-label="Delete page">' + icon('trash') + '</button></div></div>' +
          (edit ? '<div id="docEd"></div>' : '<div class="prose" id="docBody">' + r.html + '</div>' +
            '<div class="pager">' + (prevD ? '<button type="button" class="pg" data-doc="' + esc(prevD.id) + '"><small>Previous</small><span>' + esc(prevD.title) + '</span></button>' : '<span></span>') +
            (nextD ? '<button type="button" class="pg next" data-doc="' + esc(nextD.id) + '"><small>Next</small><span>' + esc(nextD.title) + '</span></button>' : '<span></span>') + '</div>') +
          '</article>' +
          '<aside class="docs-toc" aria-label="On this page">' + (!edit && r.toc.length ? '<div class="toc-h">On this page</div><ul>' + r.toc.map(t => '<li class="l' + t.level + '"><button type="button" data-toc="' + esc(t.id) + '">' + esc(t.text) + '</button></li>').join('') + '</ul>' : '') + '</aside>';
        if (edit) {
          ed = mdEditor($('#docEd', root), {
            value: d.body, mode: PH.settings.notesMode, placeholder: 'Write in Markdown. ## and ### headings will appear in the table of contents.',
            onInput: v => { d.body = v; dirty = true; ed.state('Unsaved changes…'); saveDocs(); },
            onMode: m => PH.setSetting('notesMode', m)
          });
        } else if (r.toc.length) setupSpy(r.toc);
      }

      function setupSpy(toc) {
        const links = $$('[data-toc]', root);
        let raf = 0;
        const run = () => {
          raf = 0;
          let active = toc[0].id;
          toc.forEach(t => { const el = document.getElementById(t.id); if (el && el.getBoundingClientRect().top < 140) active = t.id; });
          links.forEach(l => l.classList.toggle('on', l.dataset.toc === active));
        };
        const on = () => { if (!raf) raf = requestAnimationFrame(run); };
        window.addEventListener('scroll', on, { passive: true });
        run();
        spyOff = () => window.removeEventListener('scroll', on);
      }

      const select = idd => { docSel = idd; edit = false; paint(true); };
      paint(false);

      root.addEventListener('click', async e => {
        const dn = e.target.closest('[data-doc]');
        if (dn) { select(dn.dataset.doc); return; }
        const toc = e.target.closest('[data-toc]');
        if (toc) { const el = document.getElementById(toc.dataset.toc); if (el) el.scrollIntoView({ behavior: PH.anim() ? 'smooth' : 'auto', block: 'start' }); return; }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const p = cur(), d = p.docs.find(x => x.id === docSel);
        switch (b.dataset.act) {
          case 'doc-new': {
            const title = await PH.prompt('New page', 'Page title', '', 'Create');
            if (!title) break;
            const nd = { id: PH.uid(), title, body: '# ' + title + '\n\n' };
            cur().docs.push(nd);
            docSel = nd.id; edit = true;
            paint(true); saveDocs(); paintTabs();
            break;
          }
          case 'doc-template': {
            const nd = { id: PH.uid(), title: 'Start', body: '# Quick start\n\nA short description of the project.\n\n## Requirements\n\n- \n\n## Installation\n\n~~~bash\n\n~~~\n\n## Running\n\n1. \n' };
            cur().docs.push(nd);
            docSel = nd.id; edit = true;
            paint(true); saveDocs(); paintTabs();
            break;
          }
          case 'doc-edit':
            if (edit && dirty) saveDocs.flush();
            edit = !edit; paint(false);
            break;
          case 'doc-rename': {
            if (!d) break;
            const t = await PH.prompt('Rename page', 'Page title', d.title, 'Save');
            if (t) { d.title = t; paint(false); saveDocs(); }
            break;
          }
          case 'doc-copy': if (d) PH.copy(d.body, 'Page Markdown copied'); break;
          case 'doc-del': {
            if (!d) break;
            if (!await PH.confirmDelete('Delete the page?', 'The page “' + d.title + '” will disappear from this project\'s documentation.', 'Delete page')) break;
            cur().docs = cur().docs.filter(x => x.id !== d.id);
            docSel = null; edit = false;
            paint(true);
            saveDocs.flush(); paintTabs();
            break;
          }
        }
      });
      return () => { if (spyOff) spyOff(); if (dirty) saveDocs.flush(); else saveDocs.cancel(); };
    }


    /* ----- live preview ----- */

    function tabPreview(panel) {
      const root = document.createElement('div');
      root.className = 'pv';
      panel.appendChild(root);
      root.innerHTML = '<div class="pv-bar"><select id="pvFile" class="pv-file" aria-label="File to preview"></select>' +
        '<div class="seg seg-sm" role="radiogroup" aria-label="Width"><button type="button" role="radio" aria-checked="true" data-w="">Full</button><button type="button" role="radio" aria-checked="false" data-w="768px">Tablet</button><button type="button" role="radio" aria-checked="false" data-w="390px">Phone</button></div>' +
        '<label class="pv-live"><input type="checkbox" id="pvAuto" checked><span>Live refresh</span></label>' +
        '<button class="icon-btn" type="button" data-act="pv-reload" aria-label="Reload" title="Reload">' + icon('refresh') + '</button>' +
        '<a class="btn btn-sm" id="pvOpen" target="_blank" rel="noopener" href="#">' + icon('link') + '<span>New tab</span></a></div>' +
        '<div class="pv-stage" id="pvStage"><div class="pv-note" id="pvNote" hidden></div></div>' +
        '<p class="hint pad">Works like Live Server: file changes refresh the page by themselves. Page scripts are sandboxed and cannot access your account.</p>';
      let timer = null, sig = null, info = null, file = '', dead = false;

      const note = html => { const n = $('#pvNote', root); n.innerHTML = html; n.hidden = !html; };
      function frame(url) {
        let f = $('#pvFrame', root);
        if (!f) {
          f = document.createElement('iframe');
          f.id = 'pvFrame';
          f.title = 'Page preview';
          f.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals allow-downloads');
          $('#pvStage', root).appendChild(f);
        }
        f.src = url;
      }
      async function start(want) {
        try {
          const r = await PH.api.previewStart(id, want || '');
          if (dead) return;
          info = r;
          file = r.path;
          const sel = $('#pvFile', root);
          sel.innerHTML = r.files.length ? r.files.map(x => '<option value="' + esc(x) + '"' + (x === file ? ' selected' : '') + '>' + esc(x) + '</option>').join('') : '<option value="">(no HTML files)</option>';
          sel.disabled = !r.files.length;
          if (!r.files.length) { note('<strong>No HTML files.</strong> Add <code>index.html</code> in the Files tab' + (cur().storage === 'managed' ? ' or upload the site folder.' : '.')); return; }
          note('');
          $('#pvOpen', root).href = r.url;
          frame(r.url);
          sig = (await PH.api.signature(id)).sig;
        } catch (err) { if (!dead) note('<strong>Preview unavailable.</strong> ' + esc(err.message || '')); }
      }
      async function poll() {
        if (dead) return;
        if (!document.hidden && $('#pvAuto', root).checked && info) {
          try {
            const n = (await PH.api.signature(id)).sig;
            if (!dead && sig !== null && n !== sig) await start(info.files.includes(file) ? file : '');
            sig = n;
          } catch (e) { /* transient error, retry shortly */ }
        }
        if (!dead) timer = setTimeout(poll, 1200);
      }
      start('');
      timer = setTimeout(poll, 1200);

      root.addEventListener('change', e => { if (e.target.id === 'pvFile') start(e.target.value); });
      root.addEventListener('click', e => {
        const d = e.target.closest('[data-w]');
        if (d) {
          $$('[data-w]', root).forEach(b => b.setAttribute('aria-checked', String(b === d)));
          const st = $('#pvStage', root);
          st.style.setProperty('--pvw', d.dataset.w || '100%');
          st.classList.toggle('narrow', !!d.dataset.w);
          return;
        }
        if (e.target.closest('[data-act="pv-reload"]')) start($('#pvFile', root).value);
      });
      return () => { dead = true; clearTimeout(timer); };
    }

    /* ----- files ----- */

    const EXT_LANG = { py: 'python', js: 'js', json: 'json', css: 'css', html: 'html', sh: 'sh', bat: 'sh', ps1: 'sh', md: 'md', txt: '', csv: '', yml: '', yaml: '', ini: '', toml: '', env: '', gitignore: '' };

    function tabFiles(panel) {
      const root = document.createElement('div');
      root.className = 'fb';
      panel.appendChild(root);
      root.innerHTML = '<div class="fb-bar" id="fbBar"></div><div class="fb-cols"><div class="fb-list" id="fbList" aria-label="Files and folders"></div><div class="fb-prev" id="fbPrev"></div></div>';
      let path = '', token = 0, ptoken = 0;
      const managed = () => cur().storage === 'managed';
      const pick = document.createElement('input');
      pick.type = 'file'; pick.multiple = true; pick.hidden = true;
      root.appendChild(pick);

      const joined = n => (path ? path + '/' : '') + n;
      const skeleton = n => '<div class="skel">' + Array.from({ length: n }, (_, i) => '<i style="--i:' + i + '"></i>').join('') + '</div>';
      const placeholder = () => '<div class="fb-ph">' + icon('file') + '<p>Pick a file from the list to see its preview.</p></div>';

      function paintBar() {
        const segs = path ? path.split('/') : [];
        $('#fbBar', root).innerHTML = '<nav class="crumbs" aria-label="Path"><button type="button" data-path="">' + icon('folder') + '<span>' + esc(cur().name) + '</span></button>' +
          segs.map((s, i) => '<i>/</i><button type="button" data-path="' + esc(segs.slice(0, i + 1).join('/')) + '">' + esc(s) + '</button>').join('') + '</nav>' +
          '<div class="fb-tools">' + (managed() ? '<button class="btn btn-sm" type="button" data-act="fb-new">' + icon('plus') + '<span>New file</span></button>' +
            '<button class="btn btn-sm" type="button" data-act="fb-upload">' + icon('upload') + '<span>Upload files</span></button>' +
            '<a class="btn btn-sm" href="' + esc(PH.api.downloadUrl(id)) + '" download>' + icon('backup') + '<span>Download ZIP</span></a>' : '') +
          (PH.features.openFolder ? '<button class="btn btn-sm" type="button" data-act="fb-open">' + icon('folder') + '<span>Open in Explorer</span></button>' : '') + '</div>';
      }
      function errorBox(el, err) {
        el.innerHTML = '<div class="empty small"><h2>Could not load</h2><p>' + esc(err.message || 'Unknown error.') + '</p><div class="empty-actions"><button class="btn btn-sm" type="button" data-act="fb-retry">Try again</button></div></div>';
      }
      async function load(newPath) {
        const t = ++token;
        path = newPath;
        paintBar();
        $('#fbList', root).innerHTML = skeleton(7);
        $('#fbPrev', root).innerHTML = placeholder();
        try {
          const r = await PH.api.listFiles(id, path);
          if (t !== token) return;
          paintList(r.entries || []);
        } catch (err) { if (t === token) errorBox($('#fbList', root), err); }
      }
      function paintList(entries) {
        const rows = entries.map(en => {
          const isDir = en.type === 'dir', isImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(en.name);
          return '<li><button type="button" class="fb-row' + (isDir ? ' dir' : '') + '" data-name="' + esc(en.name) + '" data-type="' + en.type + '">' + icon(isDir ? 'folder' : (isImg ? 'image' : 'file')) +
            '<span class="fb-name">' + esc(en.name) + '</span><span class="fb-meta">' + (isDir ? '' : PH.fmtSize(en.size)) + '</span><span class="fb-date">' + esc(PH.ago(en.modified)) + '</span></button></li>';
        }).join('');
        $('#fbList', root).innerHTML = '<ul>' + (path ? '<li><button type="button" class="fb-row dir up" data-up="1">' + icon('back') + '<span class="fb-name">Up</span></button></li>' : '') + rows + '</ul>' +
          (entries.length ? '' : '<p class="hint pad">This folder is empty.</p>');
      }
      async function preview(name) {
        const t = ++ptoken, box = $('#fbPrev', root);
        $$('.fb-row', root).forEach(r => r.classList.toggle('on', r.dataset.name === name));
        box.innerHTML = skeleton(5);
        try {
          const f = await PH.api.readFile(id, joined(name));
          if (t !== ptoken) return;
          const ext = name.indexOf('.') >= 0 ? name.split('.').pop().toLowerCase() : '';
          const mg = managed() ? '<button class="icon-btn" type="button" data-act="fp-rename" aria-label="Rename" title="Rename">' + icon('edit') + '</button><button class="icon-btn" type="button" data-act="fp-delete" aria-label="Delete file" title="Delete file">' + icon('trash') + '</button>' : '';
          const ed = managed() && f.kind === 'text' && !f.truncated ? '<button class="btn btn-sm" type="button" data-act="fp-edit">' + icon('edit') + '<span>Edit</span></button>' : '';
          const head = '<div class="fp-head"><div><strong>' + esc(name) + '</strong><span>' + PH.fmtSize(f.size) + '</span></div><div class="fp-tools">' + ed + mg;
          box._name = name;
          if (f.kind === 'image') box.innerHTML = head + '</div></div><div class="fp-img"><img src="' + esc(f.url) + '" alt="' + esc(name) + '"></div>';
          else if (f.kind === 'binary') box.innerHTML = head + '</div></div><div class="fb-ph">' + icon('box') + '<p>This file type cannot be shown in the preview.</p></div>';
          else {
            const lang = EXT_LANG[ext];
            const asDoc = lang === 'md';
            const code = '<div class="code"><pre><code>' + PH.md.highlight(f.content, asDoc ? '' : lang) + '</code></pre></div>';
            box.innerHTML = head + (asDoc ? '<div class="seg seg-sm" role="radiogroup" aria-label="View"><button type="button" role="radio" aria-checked="true" data-view="doc">Preview</button><button type="button" role="radio" aria-checked="false" data-view="code">Code</button></div>' : '') +
              '<button class="icon-btn" type="button" data-act="fp-copy" aria-label="Copy contents" title="Copy contents">' + icon('copy') + '</button></div></div>' +
              (f.truncated ? '<p class="hint pad">Only the beginning of the file is shown.</p>' : '') +
              '<div class="fp-body">' + (asDoc ? '<div class="prose">' + PH.md.render(f.content).html + '</div>' : code) + '</div>';
            box._content = f.content;
            box._code = code;
            box._doc = asDoc ? '<div class="prose">' + PH.md.render(f.content).html + '</div>' : null;
          }
        } catch (err) { if (t === ptoken) errorBox(box, err); }
      }
      async function refreshProject() {
        try { PH.replaceProject((await PH.api.listProjects()).find(x => x.id === id)); } catch (e) { /* unimportant */ }
      }
      function editFile(name) {
        const box = $('#fbPrev', root);
        PH.api.readFile(id, joined(name)).then(f => {
          box._name = name;
          box.innerHTML = '<div class="fp-head"><div><strong>' + esc(name) + '</strong><span>editing</span></div><div class="fp-tools"><button class="btn btn-sm" type="button" data-act="fp-cancel">Cancel</button><button class="btn btn-sm btn-primary" type="button" data-act="fp-save">Save</button></div></div>' +
            '<textarea class="fp-edit" spellcheck="false" aria-label="File contents ' + esc(name) + '"></textarea>';
          const ta = $('textarea', box);
          ta.value = f.content;
          ta.focus();
          ta.addEventListener('keydown', ev => {
            if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); $('[data-act="fp-save"]', box).click(); }
            else if (ev.key === 'Tab' && !ev.shiftKey) { ev.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); }
          });
        }).catch(err => PH.toast(err.message, 'error'));
      }
      pick.addEventListener('change', async () => {
        const sel = PH.upload.fromInput(pick.files);
        pick.value = '';
        const prob = PH.upload.problem(sel);
        if (prob) { PH.toast(prob, 'error'); return; }
        if (!sel.entries.length && !sel.zip) { PH.toast('No files were selected.', 'error'); return; }
        try {
          const r = sel.zip ? await PH.api.uploadZip(id, sel.zip, false) : await PH.api.uploadFiles(id, sel.entries.map(en => ({ file: en.file, path: (path ? path + '/' : '') + en.file.name })), {});
          PH.replaceProject(r.project);
          PH.usage = (PH.usage || 0) + (sel.bytes || 0);
          PH.toast('Uploaded ' + r.saved + ' ' + PH.plural(r.saved, 'file', 'files', 'files') + (r.skipped ? ', skipped ' + r.skipped : ''));
          load(path);
        } catch (err) { PH.toast(err.message, 'error'); }
      });
      load('');

      root.addEventListener('click', async e => {
        const crumb = e.target.closest('[data-path]');
        if (crumb) { load(crumb.dataset.path); return; }
        const row = e.target.closest('.fb-row');
        if (row) {
          if (row.dataset.up) { load(path.split('/').slice(0, -1).join('/')); return; }
          if (row.dataset.type === 'dir') load(joined(row.dataset.name)); else preview(row.dataset.name);
          return;
        }
        const v = e.target.closest('[data-view]');
        if (v) {
          const box = $('#fbPrev', root);
          $$('[data-view]', box).forEach(b => b.setAttribute('aria-checked', String(b === v)));
          $('.fp-body', box).innerHTML = v.dataset.view === 'doc' ? box._doc : box._code;
          return;
        }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'fb-retry') load(path);
        else if (b.dataset.act === 'fp-copy') PH.copy($('#fbPrev', root)._content || '', 'File contents copied');
        else if (b.dataset.act === 'fb-new') {
          const n = await PH.prompt('New file', 'File name (e.g. index.html or css/style.css)', '', 'Create');
          if (!n) return;
          try { await PH.api.saveFile(id, joined(n.replace(/^\/+/, '')), ''); await refreshProject(); await load(path); preview(n.split('/')[0]); if (n.indexOf('/') < 0) editFile(n); }
          catch (err) { PH.toast(err.message, 'error'); }
        }
        else if (b.dataset.act === 'fb-upload') pick.click();
        else if (b.dataset.act === 'fp-edit') editFile($('#fbPrev', root)._name);
        else if (b.dataset.act === 'fp-rename') {
          const old = $('#fbPrev', root)._name;
          const n = await PH.prompt('Rename', 'New file name', old, 'Rename');
          if (!n || n === old) return;
          try { await PH.api.renameFile(id, joined(old), joined(n)); await load(path); preview(n); }
          catch (err) { PH.toast(err.message, 'error'); }
        }
        else if (b.dataset.act === 'fp-delete') {
          const nm = $('#fbPrev', root)._name;
          if (!(await PH.confirm('Delete the file?', 'The file “' + nm + '” will be deleted from the project. This cannot be undone.', 'Delete'))) return;
          try { await PH.api.deleteFile(id, joined(nm)); await refreshProject(); await load(path); PH.toast('Deleted ' + nm); }
          catch (err) { PH.toast(err.message, 'error'); }
        }
        else if (b.dataset.act === 'fp-save') {
          const box = $('#fbPrev', root), ta = $('textarea', box);
          PH.withBusy(b, 'Saving…', async () => { await PH.api.saveFile(id, joined(box._name), ta.value); PH.toast('Saved ' + box._name); await refreshProject(); preview(box._name); });
        }
        else if (b.dataset.act === 'fp-cancel') preview($('#fbPrev', root)._name);
        else if (b.dataset.act === 'fb-open') PH.withBusy(b, 'Opening…', async () => { const r = await PH.api.openFolder(id, path); PH.toast((r && r.message) || 'Folder opened'); });
      });
      return () => { token++; ptoken++; };
    }

    /* ----- banner and side panel actions ----- */

    $('#proj').addEventListener('click', async e => {
      const b = e.target.closest('[data-act]');
      if (!b || b.closest('.tabpanel')) return;
      const p = cur();
      switch (b.dataset.act) {
        case 'run': PH.runCommand(id, b.dataset.cmd, b); break;
        case 'run-menu':
          PH.menu(b.parentElement, p.commands.map(c => ({ label: c.label + ': ' + c.cmd, icon: 'play', onClick: () => PH.runCommand(id, c.id) })));
          break;
        case 'goto-tab': PH.projectSetTab(b.dataset.tab); break;
        case 'add-cmd': PH.openForm(p, { focus: 'commands' }); break;
        case 'open-folder': PH.withBusy(b, 'Opening…', async () => { const r = await PH.api.openFolder(id); PH.toast((r && r.message) || 'Project folder opened'); }); break;
        case 'star':
          try { await PH.patch(id, { favorite: !p.favorite }, { optimistic: true }); paintBanner(); PH.updateNav(); if (cur().favorite) { const sb = $('.star-btn'); if (sb) sb.classList.add('pop'); } }
          catch (err) { paintBanner(); PH.toast(err.message, 'error'); }
          break;
        case 'edit': PH.openForm(p); break;
        case 'more':
          PH.menu(b, [
            { label: 'Make backup', icon: 'backup', onClick: () => PH.openBackup([id]) },
            p.storage === 'local' ? { label: 'Copy path', icon: 'copy', onClick: () => PH.copy(p.path, 'Path copied') } : { label: 'Download ZIP', icon: 'backup', onClick: () => { location.href = PH.api.downloadUrl(id); } },
            { label: p.archived ? 'Restore from archive' : 'Move to archive', icon: 'archive', onClick: () => PH.archive(id, !p.archived) },
            { sep: true },
            { label: 'Remove from catalog', icon: 'trash', danger: true, onClick: () => PH.removeProject(id, '#/') }
          ]);
          break;
        case 'copy-path': PH.copy(p.path, 'Path copied'); break;
        case 'backup': PH.openBackup([id]); break;
        case 'status':
          try { await PH.patch(id, { status: b.dataset.v }, { optimistic: true }); paintBanner(); paintSide(); }
          catch (err) { paintSide(); PH.toast(err.message, 'error'); }
          break;
      }
    });
    $('#tabs').addEventListener('click', e => {
      const t = e.target.closest('[data-tab]');
      if (t) setTab(t.dataset.tab);
    });
    $('#tabs').addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = visibleTabs().findIndex(t => t[0] === tab);
      const vt = visibleTabs(), n = vt[(i + (e.key === 'ArrowRight' ? 1 : -1) + vt.length) % vt.length][0];
      setTab(n);
      const nb = $('#tab-' + n);
      if (nb) nb.focus();
    });

    /* ----- banner parallax ----- */

    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY, bg = $('.banner-bg'), ct = $('.banner-content');
        if (bg) bg.style.transform = PH.fx() ? 'translate3d(0,' + (Math.min(y, 380) * 0.3).toFixed(1) + 'px,0)' : '';
        if (ct) {
          ct.style.opacity = PH.anim() ? String(Math.max(0, 1 - y / 480)) : '';
          ct.style.transform = PH.fx() ? 'translateY(' + (Math.min(y, 480) * 0.1).toFixed(1) + 'px)' : '';
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', moveInd);

    /* ----- dragging and pasting images ----- */

    let depth = 0;
    const hasFiles = e => e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0;
    const ov = $('#dropOv');
    const ovOff = () => { depth = 0; ov.classList.remove('on'); };
    const onEnter = e => { if (hasFiles(e)) { depth++; ov.classList.add('on'); } };
    const onOver = e => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } };
    const onLeave = e => { if (hasFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) ovOff(); } };
    const onDrop = e => { if (!hasFiles(e)) return; e.preventDefault(); ovOff(); upload(Array.from(e.dataTransfer.files)); };
    const onPaste = e => {
      if (document.querySelector('dialog[open]')) return;
      const files = Array.from((e.clipboardData && e.clipboardData.files) || []).filter(f => /^image\//.test(f.type));
      if (!files.length) return;
      e.preventDefault();
      const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
      upload(files.map((f, i) => new File([f], 'screenshot-' + stamp + (files.length > 1 ? '-' + (i + 1) : '') + '.' + (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg'), { type: f.type })));
    };
    const onKey = e => {
      if (tab !== 'przeglad' || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight' && PH.projectGalleryGo) PH.projectGalleryGo(1);
      if (e.key === 'ArrowLeft' && PH.projectGalleryGo) PH.projectGalleryGo(-1);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKey);

    PH.viewRefresh = () => {
      if (!cur()) return;
      paintBanner(); paintSide(); paintTabs();
      if (tab === 'przeglad' || tab === 'zadania') mountTab();
    };
    PH.onLeave(() => {
      if (destroyTab) { try { destroyTab(); } catch (e) { console.error(e); } destroyTab = null; }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', moveInd);
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKey);
      ovOff();
      PH.viewRefresh = null; PH.projectSetTab = null; PH.projectRepaintOverview = null; PH.projectGalleryGo = null;
    });

    paintBanner();
    paintSide();
    paintTabs();
    mountTab();
  };
})();
