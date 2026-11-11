/* demo-data.js: dane przykładowe dla trybu podglądu (bez serwera).
   Nie jest używany, gdy front rozmawia z prawdziwym backendem. */
(function () {
  'use strict';

  const L = (...lines) => lines.join('\n');
  const uid = () => Math.random().toString(36).slice(2, 10);
  const DAY = 864e5;
  const isoAgo = d => new Date(Date.now() - d * DAY).toISOString();
  const MB = 1048576, GB = 1073741824;

  function shot(label, hue) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">' +
      '<rect width="320" height="240" fill="hsl(' + hue + ' 22% 13%)"/>' +
      '<rect x="18" y="18" width="284" height="26" rx="5" fill="hsl(' + hue + ' 38% 34%)"/>' +
      '<text x="30" y="36" font-family="sans-serif" font-size="13" fill="#fff">' + label + '</text>' +
      '<rect x="18" y="58" width="130" height="164" rx="6" fill="hsl(' + hue + ' 30% 24%)"/>' +
      '<rect x="162" y="58" width="140" height="74" rx="6" fill="hsl(' + hue + ' 48% 46%)"/>' +
      '<rect x="162" y="146" width="140" height="76" rx="6" fill="hsl(' + hue + ' 24% 20%)"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  const img = (name, hue) => ({ id: uid(), name, url: shot(name, hue) });

  /* ---------- projekty ---------- */

  function seed() {
    const P = o => Object.assign({
      id: uid(), description: '', notes: '', category: 'Inne', tech: [], tags: [],
      commands: [], tasks: [], docs: [], images: [], favorite: false, archived: false,
      status: 'active', sizeBytes: null, updatedAt: isoAgo(1), backedUpAt: null
    }, o);
    const T = (text, state) => ({ id: uid(), text, state });
    const C = (label, cmd) => ({ id: uid(), label, cmd });
    const D = (title, body) => ({ id: uid(), title, body });

    const docStart = L(
      '# Szybki start',
      '',
      'ProjectHub to lokalny katalog Twoich projektów. Ta strona pokazuje, jak wygląda dokumentacja zapisana wewnątrz projektu.',
      '',
      '> [!TIP]',
      '> Dokumentację piszesz w Markdownie. Zmiany zapisują się same, a spis treści po prawej buduje się z nagłówków.',
      '',
      '## Wymagania',
      '',
      '- Python 3.11 lub nowszy',
      '- Dysk z miejscem na kopie zapasowe',
      '- Przeglądarka z obsługą elementu `<dialog>`',
      '',
      '## Instalacja',
      '',
      '~~~bash',
      'python -m venv .venv',
      '.venv\\Scripts\\activate',
      'pip install -r requirements.txt',
      '~~~',
      '',
      '## Pierwsze uruchomienie',
      '',
      '1. Uruchom serwer poleceniem `python main.py`.',
      '2. Otwórz adres `http://127.0.0.1:8000` w przeglądarce.',
      '3. Załóż konto. Hasło zapisuje się wyłącznie jako hash.',
      '',
      '## Najczęstsze polecenia',
      '',
      '| Polecenie | Co robi |',
      '|---|---|',
      '| `python main.py` | uruchamia serwer lokalny |',
      '| `pytest -q` | uruchamia testy |',
      '| `python build.py` | buduje paczkę do wysłania |'
    );

    const docArch = L(
      '# Architektura',
      '',
      'Aplikacja ma trzy warstwy: przeglądarkę, serwer i bazę danych.',
      '',
      '## Warstwy',
      '',
      '| Warstwa | Technologia | Rola |',
      '|---|---|---|',
      '| Front | HTML, CSS, JavaScript | katalog, widok projektu, paleta poleceń |',
      '| Serwer | FastAPI | logowanie, API, uruchamianie poleceń |',
      '| Dane | SQLite | projekty, zadania, dokumentacja |',
      '',
      '## Przepływ zapytania',
      '',
      'Każde uruchomienie polecenia przechodzi przez serwer, który sprawdza, czy polecenie jest zapisane przy projekcie.',
      '',
      '~~~python',
      '@router.post("/api/projects/{project_id}/run")',
      'def run_project(project_id: int, body: RunBody, user=Depends(current_user)):',
      '    project = db.get_project(project_id)',
      '    command = project.find_command(body.command_id)  # tylko zapisane polecenia',
      '    if command is None:',
      '        raise HTTPException(404, "Nie ma takiego polecenia")',
      '    return runner.start(command, cwd=project.path)',
      '~~~',
      '',
      '> [!WARNING]',
      '> Serwer nasłuchuje wyłącznie na `127.0.0.1`. Nie zmieniaj tego na `0.0.0.0`, bo inne urządzenia w sieci mogłyby uruchamiać polecenia na Twoim komputerze.',
      '',
      '## Struktura katalogów',
      '',
      '~~~text',
      'projecthub/',
      '  main.py',
      '  app/',
      '    routes.py',
      '    auth.py',
      '    db.py',
      '  static/',
      '    index.html',
      '~~~'
    );

    const docSec = L(
      '# Bezpieczeństwo',
      '',
      'Lista kontrolna przed każdym wydaniem.',
      '',
      '- [x] hasła tylko jako hash (bcrypt lub argon2)',
      '- [x] nasłuch tylko na `127.0.0.1`',
      '- [x] uruchamiane są wyłącznie polecenia zapisane w bazie',
      '- [ ] ochrona CSRF dla każdego zapisu',
      '- [ ] ochrona przed wyjściem poza folder projektu w przeglądarce plików',
      '',
      '## Ochrona ścieżek',
      '',
      'Przy podglądzie plików ścieżka jest zawsze liczona względem folderu projektu. Wyjście poza niego kończy się błędem.',
      '',
      '~~~python',
      'def safe_join(root: Path, relative: str) -> Path:',
      '    target = (root / relative).resolve()',
      '    if root.resolve() not in target.parents and target != root.resolve():',
      '        raise HTTPException(400, "Ścieżka poza folderem projektu")',
      '    return target',
      '~~~',
      '',
      '> [!IMPORTANT]',
      '> Usuwanie projektu z katalogu nigdy nie usuwa plików z dysku.'
    );

    const demoNotes = L(
      '# Notatki robocze',
      '',
      '## Na teraz',
      '- [x] Ekran logowania',
      '- [x] Katalog z teczkami',
      '- [ ] Backend FastAPI',
      '- [ ] Backup do ZIP',
      '',
      '## Pomysły',
      '- **Paleta poleceń** pod `Ctrl+K`',
      '- Wklejanie zrzutów ekranu prosto do galerii',
      '- Wykluczenia przy backupie: `node_modules`, `.venv`',
      '',
      '> Najpierw front, potem serwer. Nie odwrotnie.',
      '',
      'Notatki edytujesz w trzech trybach: sam tekst, podział albo sam podgląd.'
    );

    const botDoc = L(
      '# Komendy bota',
      '',
      'Bot reaguje na polecenia zaczynające się od `/`.',
      '',
      '| Komenda | Opis |',
      '|---|---|',
      '| `/glosuj` | tworzy głosowanie z przyciskami |',
      '| `/przypomnij` | ustawia przypomnienie na wskazaną godzinę |',
      '| `/licznik` | pokazuje liczbę wiadomości z ostatniego tygodnia |',
      '',
      '> [!NOTE]',
      '> Token bota trzymaj w pliku `.env`. Nigdy nie wpisuj go w kod.'
    );

    return [
      P({
        id: 'demo-projecthub', name: 'ProjectHub (projekt demo)', path: 'D:\\Projekty\\projecthub', category: 'Narzędzia',
        description: 'Ten wpis pokazuje, jak wygląda w pełni opisany projekt: galeria, polecenia, zadania, notatki, dokumentacja i przeglądarka plików.',
        notes: demoNotes, tech: ['Python', 'FastAPI', 'SQLite'], tags: ['demo', 'narzędzie'],
        favorite: true, status: 'active', sizeBytes: 38 * MB, updatedAt: isoAgo(0), backedUpAt: isoAgo(0),
        commands: [C('Serwer', 'python main.py'), C('Testy', 'pytest -q'), C('Build', 'python build.py')],
        tasks: [T('Ekran logowania', 'done'), T('Katalog projektów', 'done'), T('Widok projektu jak w Steamie', 'doing'), T('Backend FastAPI', 'todo'), T('Backup do ZIP', 'todo'), T('Skanowanie pulpitu', 'todo')],
        docs: [D('Start', docStart), D('Architektura', docArch), D('Bezpieczeństwo', docSec)],
        images: [img('Katalog', 170), img('Widok projektu', 200), img('Dokumentacja', 300)]
      }),
      P({
        name: 'Bot do Discorda', path: 'C:\\Users\\Ty\\Desktop\\bot_discord', category: 'Boty i skrypty',
        description: 'Bot moderujący serwer znajomych: głosowania, przypomnienia i licznik wiadomości.',
        notes: L('Token trzymam w pliku `.env`, nie w kodzie.', '', '- [ ] komenda `/ranking`'),
        tech: ['Python', 'discord.py', 'SQLite'], tags: ['bot', 'serwer'], favorite: true, status: 'active',
        sizeBytes: Math.round(12.4 * MB), updatedAt: isoAgo(2), backedUpAt: isoAgo(3),
        commands: [C('Start', 'python bot.py'), C('Logi', 'python tail_logs.py')],
        tasks: [T('Komenda /ranking', 'doing'), T('Zapis głosowań do bazy', 'todo'), T('Poprawić przypomnienia', 'done')],
        docs: [D('Komendy bota', botDoc)], images: [img('Panel komend', 210)]
      }),
      P({
        name: 'Portfolio', path: 'D:\\Projekty\\portfolio', category: 'Strony WWW',
        description: 'Strona z moimi pracami i formularzem kontaktowym.',
        tech: ['HTML', 'CSS', 'JavaScript'], tags: ['osobiste'], favorite: true, status: 'idea',
        sizeBytes: Math.round(1.8 * GB), updatedAt: isoAgo(45), backedUpAt: isoAgo(40),
        tasks: [T('Wybrać układ strony głównej', 'todo'), T('Zdjęcia do galerii', 'todo')]
      }),
      P({
        name: 'Sklep rowerowy', path: 'C:\\Users\\Ty\\Desktop\\sklep_rowery', category: 'Strony WWW',
        description: 'Makieta sklepu z częściami rowerowymi dla znajomego. Koszyk działa tylko w przeglądarce.',
        notes: 'Klient chce wersję z filtrem po rozmiarze koła.',
        tech: ['HTML', 'CSS', 'JavaScript'], tags: ['zlecenie', 'makieta'], status: 'paused',
        sizeBytes: 214 * MB, updatedAt: isoAgo(6), backedUpAt: null,
        tasks: [T('Filtr po rozmiarze koła', 'todo'), T('Strona koszyka', 'doing')],
        images: [img('Strona główna', 28), img('Koszyk', 150)]
      }),
      P({
        name: 'Scraper ogłoszeń', path: 'D:\\Stare\\scraper_ogloszen', category: 'Boty i skrypty',
        description: 'Skrypt, który co godzinę sprawdza ogłoszenia i zapisuje nowe do pliku CSV.',
        tech: ['Python', 'BeautifulSoup'], tags: ['automatyzacja'], status: 'active',
        sizeBytes: Math.round(5.2 * MB), updatedAt: isoAgo(14), backedUpAt: isoAgo(21),
        commands: [C('Uruchom', 'python scraper.py')]
      }),
      P({
        name: 'Wąż', path: 'C:\\Users\\Ty\\Desktop\\snake', category: 'Gry',
        description: 'Klasyczny wąż na canvasie, z zapisem najlepszego wyniku.',
        tech: ['JavaScript', 'Canvas'], tags: ['gra', 'nauka'], status: 'done',
        sizeBytes: Math.round(1.1 * MB), updatedAt: isoAgo(30), backedUpAt: null,
        images: [img('Plansza', 120)]
      }),
      P({
        name: 'Budżet domowy', path: 'D:\\Projekty\\budzet_domowy', category: 'Dane',
        description: 'Notebook, który wczytuje wyciągi z banku i rysuje wydatki miesiąc po miesiącu.',
        tech: ['Python', 'pandas', 'Jupyter'], tags: ['finanse'], status: 'active',
        sizeBytes: 96 * MB, updatedAt: isoAgo(4), backedUpAt: isoAgo(1),
        tasks: [T('Kategorie wydatków', 'doing')], images: [img('Wydatki', 260)]
      }),
      P({
        name: 'Kalkulator walut', path: 'D:\\Stare\\kalkulator_walut', category: 'Narzędzia',
        description: 'Prosty przelicznik walut z kursami z NBP.',
        tech: ['Python'], tags: ['nauka'], status: 'done', archived: true,
        sizeBytes: Math.round(2.2 * MB), updatedAt: isoAgo(120), backedUpAt: isoAgo(118)
      }),
      P({
        name: 'Projekt ze szkoły', path: 'C:\\Users\\Ty\\Desktop\\stary_projekt_szkola', category: 'Inne',
        description: 'Strona na zaliczenie. Do wyrzucenia, ale wolę zachować.',
        tech: ['HTML'], tags: ['szkoła'], status: 'idea', archived: true,
        sizeBytes: 340 * MB, updatedAt: isoAgo(400), backedUpAt: null
      })
    ];
  }

  /* ---------- drzewo plików (do przeglądarki plików w demo) ---------- */

  const enc = s => new TextEncoder().encode(s).length;
  function hashStr(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

  function buildTree(p) {
    const root = { dir: true, children: {} };
    const add = (path, content) => {
      const parts = path.split('/');
      let n = root;
      for (let i = 0; i < parts.length - 1; i++) n = (n.children[parts[i]] = n.children[parts[i]] || { dir: true, children: {} });
      n.children[parts[parts.length - 1]] = { content, size: content.indexOf('__img:') === 0 ? 184320 : enc(content) };
    };
    const techs = p.tech.map(t => t.toLowerCase()).join(' ');
    const cmd = p.commands && p.commands[0] ? p.commands[0].cmd : 'python main.py';

    add('README.md', L('# ' + p.name, '', p.description || 'Opis projektu.', '', '## Uruchomienie', '', '~~~bash', cmd, '~~~', ''));
    add('.gitignore', L('__pycache__/', 'node_modules/', '.venv/', '.env', ''));

    if (p.id === 'demo-projecthub') {
      add('main.py', L('import uvicorn', '', 'if __name__ == "__main__":', '    # tylko lokalnie, nigdy 0.0.0.0', '    uvicorn.run("app.routes:app", host="127.0.0.1", port=8000, reload=True)', ''));
      add('requirements.txt', L('fastapi>=0.115', 'uvicorn>=0.30', 'bcrypt>=4.2', 'python-multipart>=0.0.9', ''));
      add('app/__init__.py', '');
      add('app/routes.py', L('from fastapi import FastAPI, Depends', 'from .auth import current_user', '', 'app = FastAPI(title="ProjectHub")', '', '@app.get("/api/projects")', 'def list_projects(user=Depends(current_user)):', '    return db.all_projects()', ''));
      add('app/auth.py', L('import bcrypt', '', 'def hash_password(plain: str) -> bytes:', '    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt())', '', 'def verify(plain: str, hashed: bytes) -> bool:', '    return bcrypt.checkpw(plain.encode(), hashed)', ''));
      add('app/db.py', L('import sqlite3', '', 'def connect():', '    conn = sqlite3.connect("projecthub.db")', '    conn.row_factory = sqlite3.Row', '    return conn', ''));
      add('static/index.html', L('<!doctype html>', '<html lang="pl">', '<head><title>ProjectHub</title></head>', '<body><main id="view"></main></body>', '</html>', ''));
      add('static/css/style.css', L(':root { --bg: #0E0C1A; --signal: #FFB65C; }', 'body { background: var(--bg); color: #EEEAFB; }', ''));
      add('static/js/app.js', L('// router i widoki', 'const view = document.querySelector("#view");', 'window.addEventListener("hashchange", render);', 'function render() { view.textContent = location.hash; }', ''));
      add('tests/test_api.py', L('def test_list_requires_login(client):', '    r = client.get("/api/projects")', '    assert r.status_code == 401', ''));
      add('docs/screenshot-katalog.png', '__img:170');
      add('docs/screenshot-projekt.png', '__img:200');
      return root;
    }

    if (/python|discord|pandas|beautifulsoup|jupyter/.test(techs)) {
      add('main.py', L('def main():', '    print("Start: ' + p.name + '")', '', 'if __name__ == "__main__":', '    main()', ''));
      add('requirements.txt', L('requests', ''));
      add('app/__init__.py', '');
      add('app/core.py', L('def run(config: dict) -> None:', '    """Główna logika projektu."""', '    ...', ''));
      add('tests/test_core.py', L('from app.core import run', '', 'def test_run_does_not_crash():', '    run({})', ''));
    }
    if (/html|css|javascript|canvas/.test(techs)) {
      add('index.html', L('<!doctype html>', '<html lang="pl">', '<head>', '  <meta charset="utf-8">', '  <title>' + p.name + '</title>', '  <link rel="stylesheet" href="css/style.css">', '</head>', '<body>', '  <script src="js/main.js"></script>', '</body>', '</html>', ''));
      add('css/style.css', L('body { margin: 0; font-family: sans-serif; }', ''));
      add('js/main.js', L('"use strict";', 'console.log("Start");', ''));
      add('assets/ekran.png', '__img:' + (hashStr(p.name) % 360));
    }
    return root;
  }

  window.PH_DEMO = { uid, shot, seed, buildTree, hashStr, isoAgo, MB, GB };
})();
