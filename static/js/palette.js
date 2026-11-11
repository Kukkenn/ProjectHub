/* palette.js: paleta poleceń (Ctrl+K): projekty, polecenia uruchomienia, dokumentacja i akcje. */
(function () {
  'use strict';
  const PH = window.PH;
  const { $, esc, norm } = PH;
  const S = PH.state;

  const dlg = $('#paletteDlg'), input = $('#palInput'), listEl = $('#palList');
  const GROUPS = ['Akcje', 'Przejdź do', 'Projekty', 'Uruchom', 'Dokumentacja', 'Archiwum'];
  let items = [], shown = [], sel = 0;

  function build() {
    const out = [];
    const add = (group, label, ic, run, sub, kw) => out.push({ group, label, ic, run, sub: sub || '', hay: norm(label + ' ' + (sub || '') + ' ' + (kw || '')), nlabel: norm(label) });

    add('Akcje', 'Dodaj projekt', 'plus', () => PH.openForm(null), 'Ręcznie wpisz nazwę i ścieżkę', 'nowy utworz');
    add('Akcje', 'Skanuj folder', 'scan', () => PH.openScan(), 'Znajdź projekty na Pulpicie lub dysku', 'import pulpit');
    add('Akcje', 'Zrób backup', 'backup', () => PH.openBackup(), 'Spakuj projekty do ZIP', 'kopia zapasowa archiwum zip');
    add('Akcje', 'Pokaż rozmiary projektów', 'disk', () => PH.openSizes(), 'Ranking największych folderów', 'dysk miejsce');
    add('Akcje', PH.settings.nav === 'top' ? 'Przenieś menu na bok' : 'Przenieś menu na górę', 'sliders', () => PH.setSetting('nav', PH.settings.nav === 'top' ? 'side' : 'top'), 'Położenie głównej nawigacji', 'nawigacja ustawienia');

    [['Biblioteka', '#/', 'grid'], ['Zadania', '#/zadania', 'tasks'], ['Archiwum', '#/archiwum', 'archive'], ['Ustawienia', '#/ustawienia', 'sliders']]
      .forEach(n => add('Przejdź do', n[0], n[2], () => PH.go(n[1])));

    S.projects.forEach(p => {
      const g = p.archived ? 'Archiwum' : 'Projekty';
      add(g, p.name, 'folder', () => PH.go('#/projekt/' + p.id), p.category + ' · ' + PH.shortPath(p.path), [p.description, p.tech.join(' '), p.tags.join(' ')].join(' '));
      p.commands.forEach(c => add('Uruchom', 'Uruchom: ' + c.label, 'play', () => PH.runCommand(p.id, c.id), p.name + ' · ' + c.cmd));
      p.docs.forEach(d => add('Dokumentacja', d.title, 'book', () => PH.go('#/projekt/' + p.id + '/dokumentacja', { doc: d.id }), p.name));
    });
    return out;
  }

  function filter() {
    const q = norm(input.value.trim());
    if (!q) {
      const recent = items.filter(i => i.group === 'Projekty').slice(0, 8);
      return items.filter(i => i.group === 'Akcje' || i.group === 'Przejdź do').concat(recent)
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
      listEl.innerHTML = '<p class="pal-empty">Nic nie pasuje do „' + esc(input.value.trim()) + '”. Spróbuj nazwy projektu, technologii albo polecenia.</p>';
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
