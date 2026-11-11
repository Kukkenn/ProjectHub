/* views.js: tablica zadań ze wszystkich projektów, archiwum i ustawienia zaawansowane. */
(function () {
  'use strict';
  const PH = window.PH;
  const { $, $$, esc, plural } = PH;
  const icon = PH.icon;
  const S = PH.state;

  /* =============== ZADANIA (kanban) =============== */

  const COLS = [['todo', 'Do zrobienia'], ['doing', 'W toku'], ['done', 'Zrobione']];

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
      '<div class="tasks page"><section class="hero"><div><h1>Zadania</h1><div class="status" id="tkStatus"></div></div>' +
      '<div class="hero-tools"><label class="sort">Projekt <select id="tkProj"></select></label></div></section>' +
      '<form class="tk-add wide" id="tkAddForm"><select id="tkAddProj" aria-label="Projekt nowego zadania"></select>' +
      '<input id="tkAddIn" placeholder="Nowe zadanie i Enter" maxlength="200" autocomplete="off" aria-label="Treść nowego zadania"><button class="btn btn-primary" type="submit">Dodaj zadanie</button></form>' +
      '<div class="board" id="board"></div></div>';

    function fillSelects() {
      const ps = live();
      $('#tkProj').innerHTML = '<option value="">Wszystkie projekty</option>' + ps.map(p => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>').join('');
      $('#tkProj').value = filter;
      const keep = $('#tkAddProj').value;
      $('#tkAddProj').innerHTML = ps.map(p => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>').join('');
      $('#tkAddProj').value = filter || (ps.some(p => p.id === keep) ? keep : (ps[0] ? ps[0].id : ''));
    }

    function card(t, p) {
      return '<article class="kcard" draggable="true" data-id="' + esc(t.id) + '" data-p="' + esc(p.id) + '" style="' + PH.tabStyle(p) + '">' +
        '<p class="kc-text">' + esc(t.text) + '</p>' +
        '<div class="kc-meta"><button type="button" class="kc-proj" data-act="kc-open" title="Otwórz projekt">' + esc(p.name) + '</button><span class="kc-btns">' +
        (t.state !== 'todo' ? '<button type="button" class="icon-btn" data-act="kc-left" aria-label="Przenieś zadanie „' + esc(t.text) + '” do: ' + (t.state === 'done' ? 'W toku' : 'Do zrobienia') + '" title="Cofnij">' + icon('back') + '</button>' : '') +
        (t.state !== 'done' ? '<button type="button" class="icon-btn" data-act="kc-right" aria-label="Przenieś zadanie „' + esc(t.text) + '” do: ' + (t.state === 'todo' ? 'W toku' : 'Zrobione') + '" title="Dalej">' + icon('next') + '</button>' : '') +
        '</span></div></article>';
    }

    function paintBoard() {
      const items = allTasks();
      const total = items.length, done = items.filter(x => x.t.state === 'done').length, open = total - done;
      $('#tkStatus').innerHTML = total
        ? '<span><b class="num" id="tkOpen" data-v="' + open + '">' + open + '</b> ' + plural(open, 'otwarte zadanie', 'otwarte zadania', 'otwartych zadań') + '</span><span>' + done + ' z ' + total + ' zrobione</span>' +
          '<div class="prog wide-prog"><div class="bar go"><i style="--w:' + Math.round(done / total * 100) + '%"></i></div></div>'
        : '<span>Brak zadań. Dodaj pierwsze poniżej albo w zakładce Zadania wybranego projektu.</span>';
      $('#board').innerHTML = COLS.map(([k, label]) => {
        const list = items.filter(x => x.t.state === k);
        return '<section class="col" data-state="' + k + '" aria-label="' + label + '"><h2>' + label + ' <em>' + list.length + '</em></h2>' +
          '<div class="col-body" data-state="' + k + '">' +
          (list.length ? list.map(x => card(x.t, x.p)).join('') : '<p class="col-empty">' + (k === 'todo' ? 'Nic do zrobienia.' : k === 'doing' ? 'Przeciągnij tu zadanie, które właśnie robisz.' : 'Tu trafią skończone zadania.') + '</p>') +
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
      if (!pid) { PH.toast('Najpierw dodaj projekt, do którego trafi zadanie.', 'error'); return; }
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
      try { e.dataTransfer.setData('text/plain', c.dataset.id); } catch (err) { /* j.w. */ }
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

  /* =============== ARCHIWUM =============== */

  PH.views.archive = function () {
    const view = PH.view;
    view.innerHTML = '<div class="lib page"><section class="hero"><div id="arTitle"></div></section><div id="arGrid" class="grid"></div></div>';
    function paint() {
      const list = S.projects.filter(p => p.archived);
      $('#arTitle').innerHTML = '<h1>Archiwum</h1><div class="status"><span><b class="num">' + list.length + '</b> ' + plural(list.length, 'projekt', 'projekty', 'projektów') + '</span>' +
        '<span class="recent">Tu leżą projekty, które nie przeszkadzają na głównej liście.</span></div>';
      const g = $('#arGrid');
      if (!list.length) {
        g.className = '';
        g.innerHTML = '<div class="empty"><h2>Archiwum jest puste</h2><p>Projekty, których nie rozwijasz, ale chcesz zachować, przenieś tu z menu „Więcej” na stronie projektu. Znikną z biblioteki, ale nic z nich nie przepadnie.</p>' +
          '<div class="empty-actions"><a class="btn btn-primary" href="#/">Wróć do biblioteki</a></div></div>';
        return;
      }
      g.className = 'grid';
      g.innerHTML = list.map((p, i) => PH.tileHtml(p, i, { archive: true })).join('');
    }
    paint();
    PH.viewRefresh = paint;
    PH.onLeave(() => { PH.viewRefresh = null; });
  };

  /* =============== USTAWIENIA =============== */

  const ACCENTS = [['amber', 'Bursztyn', '#FFB65C'], ['mint', 'Mięta', '#6EE0B8'], ['rose', 'Róż', '#FF8FA3'], ['sky', 'Niebo', '#6CC9F2'], ['violet', 'Fiolet', '#C79BFF']];


  const THEMES = [['night', 'Noc', ['#0E0C1A', '#1D1936', '#FFB65C']], ['graphite', 'Grafit', ['#121315', '#212429', '#FFB65C']], ['ocean', 'Ocean', ['#07131C', '#112638', '#6CC9F2']],
    ['forest', 'Las', ['#0A130F', '#15271E', '#6EE0B8']], ['dusk', 'Zmierzch', ['#1A0F18', '#301B28', '#FF8FA3']], ['light', 'Jasny', ['#F3F2FA', '#FFFFFF', '#D9780B']],
    ['paper', 'Papier', ['#F5F0E6', '#FFFDF8', '#B5541B']], ['auto', 'Jak system', ['#0E0C1A', '#F3F2FA', '#8E9BFF']]];
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
      '<div class="settings page"><section class="hero"><div><h1>Ustawienia</h1><div class="status"><span>Zmiany zapisują się od razu, tylko w tej przeglądarce.</span></div></div>' +
      '<div class="hero-tools"><button class="btn" type="button" id="stReset">Przywróć domyślne</button></div></section>' +
      '<nav class="s-jump" aria-label="Sekcje ustawień">' +
      [['s-look', 'Wygląd'], ['s-motion', 'Animacje'], ['s-lib', 'Biblioteka'], ['s-backup', 'Backup'], ['s-sec', 'Bezpieczeństwo'], ['s-acct', 'Konto'], ['s-data', 'Dane']].map(x => '<a href="#" data-jump="' + x[0] + '">' + x[1] + '</a>').join('') + '</nav>' +
      '<div class="s-grid">' +

      card('Wygląd i nawigacja', 'Gdzie jest menu główne i jak wyglądają teczki.',
        row('Położenie nawigacji', 'Biblioteka, Zadania, Archiwum i Ustawienia: u góry jak w Steamie albo w wąskim pasku z boku.', seg('nav', [['top', 'Na górze'], ['side', 'Z boku']])) +
        row('Motyw strony', 'Kolory całej aplikacji, także jasny tryb. „Jak system” przełącza się razem z Twoim urządzeniem.',
          '<div class="theme-grid" role="radiogroup" aria-label="Motyw strony">' + THEMES.map(t =>
            '<button type="button" class="theme-card" role="radio" data-theme-pick="' + t[0] + '" aria-checked="' + (st().theme === t[0]) + '"><span class="sw">' + t[2].map(c => '<i style="background:' + c + '"></i>').join('') + '</span><span>' + t[1] + '</span></button>').join('') + '</div>') +
        row('Kolor akcentu', 'Główne przyciski, zaznaczenia i podświetlenia.',
          '<div class="swatches" role="radiogroup" aria-label="Kolor akcentu">' + ACCENTS.map(a =>
            '<button type="button" class="swatch" role="radio" data-accent="' + a[0] + '" aria-checked="' + (st().accent === a[0]) + '" aria-label="' + a[1] + '" title="' + a[1] + '" style="--sw:' + a[2] + '"><i></i><span>' + a[1] + '</span></button>').join('') +
            '<label class="swatch" role="radio" aria-checked="' + (st().accent === 'custom') + '" data-accent="custom" title="Własny kolor" style="--sw:' + esc(st().accentCustom) + '"><i></i><span>Własny</span><input type="color" id="stAccentC" value="' + esc(st().accentCustom) + '" aria-label="Własny kolor akcentu" style="position:absolute;opacity:0;width:0;height:0"></label></div>') +
        (PH.features.localPaths ? row('Dodawanie projektów z dysku', 'Jak ma się zachować aplikacja, gdy wskażesz folder: tylko zapamiętać ścieżkę (pliki zostają, a zmiany w nich widać od razu), skopiować pliki do ProjectHub (oryginał zostaje) albo je przenieść (po kopiowaniu znikają z oryginalnego folderu, z potwierdzeniem).', seg('importMode', [['path', 'Tylko ścieżka'], ['copy', 'Kopiuj'], ['move', 'Przenieś']])) : '') +
        row('Rozmiar teczek', 'Ile teczek zmieści się w rzędzie.', seg('density', [['compact', 'Małe'], ['normal', 'Średnie'], ['roomy', 'Duże']])), 's-look') +

      card('Animacje', 'Ruch pomaga zorientować się, co się zmieniło. Możesz go ograniczyć.',
        row('Poziom animacji', 'Pełne: wskakiwanie teczek, paralaksa banera, konfetti. Ograniczone: tylko krótkie przejścia. Wyłączone: bez ruchu.', seg('motion', [['full', 'Pełne'], ['low', 'Ograniczone'], ['off', 'Wyłączone']])) +
        row('Przechylanie teczek', 'Teczka lekko podąża za kursorem. Działa tylko przy pełnych animacjach.', sw('tilt', 'Przechylanie teczek za kursorem')), 's-motion') +

      card('Biblioteka i projekty', 'Co widzisz na liście i jak się porządkuje.',
        row('Domyślne sortowanie', 'Własna kolejność ustawiasz, przeciągając teczki.', '<select id="stSort" aria-label="Domyślne sortowanie">' +
          [['manual', 'Własna kolejność'], ['recent', 'Ostatnio zmieniane'], ['name', 'Nazwa od A do Z'], ['backup', 'Najpierw bez backupu'], ['size', 'Największe najpierw']].map(o => '<option value="' + o[0] + '"' + (st().sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>') +
        row('Ulubione na górze', 'Oddzielny pasek ulubionych nad resztą projektów.', sw('favTop', 'Ulubione na górze')) +
        row('Rozmiar na teczce', 'Pokazuje, ile miejsca zajmuje folder projektu.', sw('showSize', 'Pokazuj rozmiar projektu')) +
        row('Zakładka po otwarciu projektu', 'Od czego zaczyna się strona projektu.', '<select id="stTab" aria-label="Domyślna zakładka projektu">' +
          [['przeglad', 'Przegląd'], ['zadania', 'Zadania'], ['notatki', 'Notatki'], ['dokumentacja', 'Dokumentacja'], ['podglad', 'Podgląd'], ['pliki', 'Pliki']].map(o => '<option value="' + o[0] + '"' + (st().tabDefault === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>'), 's-lib') +

      card('Backup', 'Ustawienia używane w oknie backupu.',
        (PH.features.backupToPath ? row('Domyślny folder docelowy', 'Dysk zewnętrzny albo folder synchronizowany z chmurą.', '<input id="stDest" class="mono" placeholder="E:\\Backupy" value="' + esc(st().backupDest) + '" aria-label="Domyślny folder backupu" autocomplete="off" spellcheck="false">') : '') +
        row('Pomijane foldery', 'Nazwy folderów, których nie pakujemy do ZIP. Zwykle zmniejsza to archiwum wiele razy.', '<div class="tags" id="stExTags"><ul class="tag-list"></ul><input placeholder="Dodaj nazwę i Enter" aria-label="Pomijane foldery" autocomplete="off"></div>') +
        row('Przypomnienie o backupie', 'Po ilu dniach backup w teczce zmienia kolor na bursztynowy.', '<div class="numfield"><input id="stWarn" type="number" min="1" max="365" value="' + st().backupWarnDays + '" aria-label="Liczba dni do przypomnienia"><span>dni</span></div>'), 's-backup') +

      card('Bezpieczeństwo', 'Dostęp do katalogu i ostrożność przy usuwaniu.',
        row('Automatyczne wylogowanie', 'Po tylu minutach bez ruchu wrócisz do ekranu logowania.', seg('autoLogout', [[0, 'Nigdy'], [5, '5 min'], [15, '15 min'], [30, '30 min'], [60, '60 min']], true)) +
        row('Pytaj przed usunięciem', 'Okno potwierdzenia przy usuwaniu projektów, zdjęć i stron dokumentacji. Pliki na dysku są zawsze bezpieczne.', sw('confirmDelete', 'Pytaj przed usunięciem')), 's-sec') +

      card('Konto', PH.mode === 'demo' ? 'Tryb demonstracyjny: dane są tylko w tej przeglądarce.' : 'Zalogowano jako <strong>' + esc(PH.username || '') + '</strong>. Każde konto ma własne projekty, pliki i kopie zapasowe.',
        (PH.limits && PH.limits.quota ? row('Zajęte miejsce', 'Pliki wgrane do ProjectHub na tym koncie.', '<div class="usage"><div class="usage-bar" style="--w:' + Math.min(100, Math.round(100 * (PH.usage || 0) / PH.limits.quota)) + '%"><i></i></div><span class="hint">' + PH.fmtSize(PH.usage || 0) + ' z ' + PH.fmtSize(PH.limits.quota) + '</span></div>') : '') +
        row('Zmiana hasła', 'Po zmianie pozostałe sesje zostaną wylogowane.', '<button class="btn" type="button" id="stPass">Zmień hasło</button>') +
        row('Usunięcie konta', 'Kasuje konto razem z projektami i wgranymi plikami. Nie da się tego cofnąć. Zrób wcześniej backup.', '<button class="btn btn-danger-quiet" type="button" id="stDelAcct">Usuń konto</button>'), 's-acct') +

      card('Dane', 'Kopia samej bazy projektów (bez plików z dysku).',
        row('Eksport do pliku JSON', 'Opisy, notatki, dokumentacja, zadania i ustawienia projektów. Zdjęcia w trybie podglądu są w środku pliku.', '<button class="btn" type="button" id="stExport">' + icon('backup') + '<span>Pobierz eksport</span></button>') +
        row('Import z pliku JSON', 'Projekty o tym samym identyfikatorze zostaną zaktualizowane, nowe zostaną dodane.', '<label class="btn file-btn">' + icon('plus') + '<span>Wybierz plik</span><input type="file" accept="application/json,.json" id="stImport" aria-label="Wybierz plik eksportu"></label>') +
        row('Rozmiary folderów', 'Przelicza, ile miejsca zajmuje każdy projekt.', '<button class="btn" type="button" id="stSizes">' + icon('disk') + '<span>Przelicz rozmiary</span></button>') +
        (PH.api.MOCK ? row('Dane demo', 'Usuwa dane demo z tej przeglądarki i wraca do ekranu logowania.', '<button class="btn btn-danger-quiet" type="button" id="stDemo">Zresetuj dane demo</button>') : ''), 's-data') +

      '</div></div>';

    /* --- obsługa --- */
    const exTags = PH.makeTags($('#stExTags'), arr => PH.setSetting('backupExclude', arr));
    exTags.set(st().backupExclude);

    $('.settings', view).addEventListener('click', e => {
      const s = e.target.closest('.seg[data-key] [data-v]');
      if (s) {
        const seg = s.parentElement, key = seg.dataset.key;
        const v = seg.dataset.num ? Number(s.dataset.v) : s.dataset.v;
        PH.setSetting(key, v);
        $$('[data-v]', seg).forEach(b => b.setAttribute('aria-checked', String(b === s)));
        if (key === 'nav') PH.toast(v === 'side' ? 'Menu przeniesione na bok' : 'Menu przeniesione na górę');
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
      const cur = await PH.prompt('Zmiana hasła', 'Obecne hasło', '', 'Dalej', true);
      if (!cur) return;
      const nw = await PH.prompt('Zmiana hasła', 'Nowe hasło (min. 8 znaków)', '', 'Zmień hasło', true);
      if (!nw) return;
      try { await PH.api.changePassword(cur, nw); PH.toast('Hasło zostało zmienione'); }
      catch (err) { PH.toast(err.message, 'error'); }
    });
    $('#stDelAcct').addEventListener('click', async () => {
      if (!await PH.confirm('Usunąć konto?', 'Wszystkie projekty i wgrane pliki tego konta znikną bezpowrotnie. Jeśli chcesz je zachować, najpierw pobierz backup.', 'Usuń konto')) return;
      const pw = await PH.prompt('Potwierdź hasłem', 'Hasło do konta', '', 'Usuń konto na stałe', true);
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
      if (!await PH.confirm('Przywrócić ustawienia domyślne?', 'Wygląd, sortowanie, backup i bezpieczeństwo wrócą do wartości początkowych. Twoich projektów to nie dotyczy.', 'Przywróć')) return;
      PH.resetSettings();
      PH.views.settings();
      PH.updateNav();
      PH.toast('Przywrócono ustawienia domyślne');
    });

    $('#stExport').addEventListener('click', e => PH.withBusy(e.currentTarget, 'Przygotowuję…', async () => {
      const data = await PH.api.exportData();
      data.settings = PH.settings;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'projecthub-eksport-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      PH.toast('Pobrano plik eksportu');
    }));

    $('#stImport').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      let data;
      try { data = JSON.parse(await f.text()); } catch (err) { PH.toast('Ten plik nie jest poprawnym JSON-em.', 'error'); return; }
      try {
        const r = await PH.api.importData(data);
        S.projects = (await PH.api.listProjects()).map(PH.normProject);
        PH.updateNav();
        PH.toast('Zaimportowano ' + r.imported + ' ' + plural(r.imported, 'projekt', 'projekty', 'projektów'));
      } catch (err) { PH.toast(err.message, 'error'); }
    });

    $('#stSizes').addEventListener('click', e => PH.withBusy(e.currentTarget, 'Liczenie…', async () => {
      const r = await PH.api.refreshSizes();
      S.projects.forEach(p => { if (r.sizes && r.sizes[p.id] != null) p.sizeBytes = r.sizes[p.id]; });
      PH.toast('Przeliczono rozmiary projektów');
    }));

    const demo = $('#stDemo');
    if (demo) demo.addEventListener('click', async () => {
      if (!await PH.confirm('Zresetować dane demo?', 'Projekty i konto demo zostaną usunięte z tej przeglądarki.', 'Zresetuj')) return;
      PH.api.resetDemo();
      location.href = 'login.html';
    });

    PH.viewRefresh = null;
  };
})();
