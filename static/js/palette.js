/* palette.js: command palette (Ctrl+K): projects, run commands, docs and actions. */
(function () {
  'use strict';
  const PH = window.PH;
  const { $, esc, norm } = PH;
  const S = PH.state;

  const dlg = $('#paletteDlg'), input = $('#palInput'), listEl = $('#palList');
  const GROUPS = ['Actions', 'Go to', 'Projects', 'Run', 'Docs', 'Archive'];
  let items = [], shown = [], sel = 0;

  function build() {
    const out = [];
    const add = (group, label, ic, run, sub, kw) => out.push({ group, label, ic, run, sub: sub || '', hay: norm(label + ' ' + (sub || '') + ' ' + (kw || '')), nlabel: norm(label) });

    add('Actions', 'Add project', 'plus', () => PH.openForm(null), 'Type the name and path manually', 'nowy utworz');
    add('Actions', 'Scan folder', 'scan', () => PH.openScan(), 'Find projects on the Desktop or disk', 'import pulpit');
    add('Actions', 'Back up', 'backup', () => PH.openBackup(), 'Pack projects into a ZIP', 'kopia zapasowa archiwum zip');
    add('Actions', 'Show project sizes', 'disk', () => PH.openSizes(), 'Ranking of the largest folders', 'dysk miejsce');
    add('Actions', PH.settings.nav === 'top' ? 'Move the menu to the side' : 'Move the menu to the top', 'sliders', () => PH.setSetting('nav', PH.settings.nav === 'top' ? 'side' : 'top'), 'Position of the main navigation', 'nawigacja ustawienia');

    [['Library', '#/', 'grid'], ['Tasks', '#/zadania', 'tasks'], ['Archive', '#/archiwum', 'archive'], ['Settings', '#/ustawienia', 'sliders']]
      .forEach(n => add('Go to', n[0], n[2], () => PH.go(n[1])));

    S.projects.forEach(p => {
      const g = p.archived ? 'Archive' : 'Projects';
      add(g, p.name, 'folder', () => PH.go('#/projekt/' + p.id), p.category + ' · ' + PH.shortPath(p.path), [p.description, p.tech.join(' '), p.tags.join(' ')].join(' '));
      p.commands.forEach(c => add('Run', 'Run: ' + c.label, 'play', () => PH.runCommand(p.id, c.id), p.name + ' · ' + c.cmd));
      p.docs.forEach(d => add('Docs', d.title, 'book', () => PH.go('#/projekt/' + p.id + '/dokumentacja', { doc: d.id }), p.name));
    });
    return out;
  }

  function filter() {
    const q = norm(input.value.trim());
    if (!q) {
      const recent = items.filter(i => i.group === 'Projects').slice(0, 8);
      return items.filter(i => i.group === 'Actions' || i.group === 'Go to').concat(recent)
        .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group));
    }
    const toks = q.split(/\s+/);
    return items.map(i => {
      if (!toks.every(t => i.hay.indexOf(t) >= 0)) return null;
      const pos = i.nlabel.indexOf(toks[0]);
      return { i, score: pos === 0 ? 0 : (pos > 0 ? 1 : 2) };
    }).filter(Boolean)
      .sort((a, b) => a.score - b.score || GROUPS.indexOf(a.i.group) - GROUPS.indexOf(b.i.group))
      .slice(0, 40).map(x => x.i);
  }

  function paint() {
    shown = filter();
    if (sel >= shown.length) sel = Math.max(0, shown.length - 1);
    if (!shown.length) {
      listEl.innerHTML = '<p class="pal-empty">Nothing matches “' + esc(input.value.trim()) + '”. Try a project name, a technology or a command.</p>';
      input.removeAttribute('aria-activedescendant');
      return;
    }
    let html = '', last = '';
    shown.forEach((it, idx) => {
      if (PH.settings && !input.value.trim() && it.group !== last) html += '<div class="pal-group" role="presentation">' + it.group + '</div>';
      else if (input.value.trim() && it.group !== last) html += '<div class="pal-group" role="presentation">' + it.group + '</div>';
      last = it.group;
      html += '<button type="button" class="pal-it" role="option" id="pal-' + idx + '" data-i="' + idx + '" aria-selected="' + (idx === sel) + '">' + PH.icon(it.ic) +
        '<span class="pal-main"><span class="pal-label">' + esc(it.label) + '</span>' + (it.sub ? '<span class="pal-sub">' + esc(it.sub) + '</span>' : '') + '</span></button>';
    });
    listEl.innerHTML = html;
    input.setAttribute('aria-activedescendant', 'pal-' + sel);
  }

  function setSel(n, scroll) {
    if (!shown.length) return;
    sel = (n + shown.length) % shown.length;
    Array.from(listEl.querySelectorAll('.pal-it')).forEach((b, i) => b.setAttribute('aria-selected', String(i === sel)));
    input.setAttribute('aria-activedescendant', 'pal-' + sel);
    const el = $('#pal-' + sel);
    if (el && scroll) el.scrollIntoView({ block: 'nearest' });
  }

  function run(idx) {
    const it = shown[idx];
    if (!it) return;
    dlg.close();
    setTimeout(() => it.run(), 0);
  }

  PH.openPalette = function () {
    if (dlg.open) return;
    items = build();
    input.value = '';
    sel = 0;
    paint();
    dlg.showModal();
    input.focus();
  };

  input.addEventListener('input', () => { sel = 0; paint(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(sel + 1, true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(sel - 1, true); }
    else if (e.key === 'Home') { e.preventDefault(); setSel(0, true); }
    else if (e.key === 'End') { e.preventDefault(); setSel(shown.length - 1, true); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  });
  listEl.addEventListener('click', e => {
    const b = e.target.closest('.pal-it');
    if (b) run(+b.dataset.i);
  });
  listEl.addEventListener('mousemove', e => {
    const b = e.target.closest('.pal-it');
    if (b && +b.dataset.i !== sel) setSel(+b.dataset.i, false);
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dlg.open) dlg.close();
      else if (!document.querySelector('dialog[open]')) PH.openPalette();
    }
  });
  $('#btnPalette').addEventListener('click', () => PH.openPalette());
})();
