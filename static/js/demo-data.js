/* demo-data.js: sample data for preview mode (no server).
   Not used when the front end talks to a real backend. */
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

  /* ---------- projects ---------- */

  function seed() {
    const P = o => Object.assign({
      id: uid(), description: '', notes: '', category: 'Other', tech: [], tags: [],
      commands: [], tasks: [], docs: [], images: [], favorite: false, archived: false,
      status: 'active', sizeBytes: null, updatedAt: isoAgo(1), backedUpAt: null
    }, o);
    const T = (text, state) => ({ id: uid(), text, state });
    const C = (label, cmd) => ({ id: uid(), label, cmd });
    const D = (title, body) => ({ id: uid(), title, body });

    const docStart = L(
      '# Quick start',
      '',
      'ProjectHub is a local catalog of your projects. This page shows what documentation stored inside a project looks like.',
      '',
      '> [!TIP]',
      '> You write documentation in Markdown. Changes save themselves, and the table of contents on the right is built from headings.',
      '',
      '## Requirements',
      '',
      '- Python 3.11 or newer',
      '- A disk with room for backups',
      '- A browser with `<dialog>` support',
      '',
      '## Installation',
      '',
      '~~~bash',
      'python -m venv .venv',
      '.venv\\Scripts\\activate',
      'pip install -r requirements.txt',
      '~~~',
      '',
      '## First run',
      '',
      '1. Start the server with `python main.py`.',
      '2. Open `http://127.0.0.1:8000` in the browser.',
      '3. Create an account. The password is stored only as a hash.',
      '',
      '## Common commands',
      '',
      '| Command | What it does |',
      '|---|---|',
      '| `python main.py` | starts the local server |',
      '| `pytest -q` | runs the tests |',
      '| `python build.py` | builds a package to ship |'
    );

    const docArch = L(
      '# Architecture',
      '',
      'The app has three layers: the browser, the server and the database.',
      '',
      '## Layers',
      '',
      '| Layer | Technology | Role |',
      '|---|---|---|',
      '| Front end | HTML, CSS, JavaScript | catalog, project view, command palette |',
      '| Server | FastAPI | login, API, running commands |',
      '| Data | SQLite | projects, tasks, documentation |',
      '',
      '## Request flow',
      '',
      'Every command run goes through the server, which checks whether the command is stored with the project.',
      '',
      '~~~python',
      '@router.post("/api/projects/{project_id}/run")',
      'def run_project(project_id: int, body: RunBody, user=Depends(current_user)):',
      '    project = db.get_project(project_id)',
      '    command = project.find_command(body.command_id)  # only stored commands',
      '    if command is None:',
      '        raise HTTPException(404, "No such command")',
      '    return runner.start(command, cwd=project.path)',
      '~~~',
      '',
      '> [!WARNING]',
      '> The server listens on `127.0.0.1` only. Do not change it to `0.0.0.0`, or other devices on the network could run commands on your computer.',
      '',
      '## Directory structure',
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
      '# Security',
      '',
      'A checklist to go through before every release.',
      '',
      '- [x] passwords only as hashes (bcrypt or argon2)',
      '- [x] listen on `127.0.0.1` only',
      '- [x] only commands stored in the database are executed',
      '- [ ] CSRF protection for every write',
      '- [ ] protection against escaping the project folder in the file browser',
      '',
      '## Path protection',
      '',
      'When previewing files, the path is always resolved relative to the project folder. Escaping it results in an error.',
      '',
      '~~~python',
      'def safe_join(root: Path, relative: str) -> Path:',
      '    target = (root / relative).resolve()',
      '    if root.resolve() not in target.parents and target != root.resolve():',
      '        raise HTTPException(400, "Path outside the project folder")',
      '    return target',
      '~~~',
      '',
      '> [!IMPORTANT]',
      '> Removing a project from the catalog never deletes files from disk.'
    );

    const demoNotes = L(
      '# Working notes',
      '',
      '## Right now',
      '- [x] Login screen',
      '- [x] Catalog with folders',
      '- [ ] FastAPI backend',
      '- [ ] ZIP backup',
      '',
      '## Ideas',
      '- **Command palette** under `Ctrl+K`',
      '- Pasting screenshots straight into the gallery',
      '- Backup exclusions: `node_modules`, `.venv`',
      '',
      '> Front end first, then the server. Not the other way around.',
      '',
      'You edit notes in three modes: text only, split, or preview only.'
    );

    const botDoc = L(
      '# Bot commands',
      '',
      'The bot reacts to commands starting with `/`.',
      '',
      '| Command | Description |',
      '|---|---|',
      '| `/vote` | creates a poll with buttons |',
      '| `/remind` | sets a reminder for a given time |',
      '| `/count` | shows the number of messages from the last week |',
      '',
      '> [!NOTE]',
      '> Keep the bot token in a `.env` file. Never type it into the code.'
    );

    return [
      P({
        id: 'demo-projecthub', name: 'ProjectHub (demo project)', path: 'D:\\Projects\\projecthub', category: 'Tools',
        description: 'This entry shows what a fully described project looks like: gallery, commands, tasks, notes, documentation and a file browser.',
        notes: demoNotes, tech: ['Python', 'FastAPI', 'SQLite'], tags: ['demo', 'tool'],
        favorite: true, status: 'active', sizeBytes: 38 * MB, updatedAt: isoAgo(0), backedUpAt: isoAgo(0),
        commands: [C('Server', 'python main.py'), C('Tests', 'pytest -q'), C('Build', 'python build.py')],
        tasks: [T('Login screen', 'done'), T('Project catalog', 'done'), T('Steam-style project view', 'doing'), T('FastAPI backend', 'todo'), T('ZIP backup', 'todo'), T('Desktop scanning', 'todo'), T('Write the release notes', 'todo'), T('Tidy the CSS variables', 'doing'), T('Record a short demo video', 'todo')],
        docs: [D('Start', docStart), D('Architecture', docArch), D('Security', docSec)],
        images: [img('Library', 170), img('Project view', 200), img('Documentation', 300)]
      }),
      P({
        name: 'Discord bot', path: 'C:\\Users\\Ty\\Desktop\\bot_discord', category: 'Bots and scripts',
        description: 'A moderation bot for a friends\' server: polls, reminders and a message counter.',
        notes: L('I keep the token in a `.env` file, not in the code.', '', '- [ ] `/leaderboard` command'),
        tech: ['Python', 'discord.py', 'SQLite'], tags: ['bot', 'server'], favorite: true, status: 'active',
        sizeBytes: Math.round(12.4 * MB), updatedAt: isoAgo(2), backedUpAt: isoAgo(3),
        commands: [C('Start', 'python bot.py'), C('Logs', 'python tail_logs.py')],
        tasks: [T('/leaderboard command', 'doing'), T('Store polls in the database', 'todo'), T('Fix the reminders', 'done'), T('Add slash-command cooldowns', 'todo'), T('Migrate the bot to a VPS', 'todo')],
        docs: [D('Bot commands', botDoc)], images: [img('Command panel', 210)]
      }),
      P({
        name: 'Portfolio', path: 'D:\\Projects\\portfolio', category: 'Websites',
        description: 'A page with my work and a contact form.',
        tech: ['HTML', 'CSS', 'JavaScript'], tags: ['personal'], favorite: true, status: 'idea',
        sizeBytes: Math.round(1.8 * GB), updatedAt: isoAgo(45), backedUpAt: isoAgo(40),
        tasks: [T('Pick the home page layout', 'todo'), T('Photos for the gallery', 'todo'), T('Hook up the contact form', 'doing'), T('Buy the domain', 'todo')]
      }),
      P({
        name: 'Bike shop', path: 'C:\\Users\\Ty\\Desktop\\sklep_rowery', category: 'Websites',
        description: 'A mockup of a bike parts shop for a friend. The cart only works in the browser.',
        notes: 'The client wants a version with a wheel-size filter.',
        tech: ['HTML', 'CSS', 'JavaScript'], tags: ['client work', 'mockup'], status: 'paused',
        sizeBytes: 214 * MB, updatedAt: isoAgo(6), backedUpAt: null,
        tasks: [T('Wheel size filter', 'todo'), T('Cart page', 'doing'), T('Ask the client about the logo', 'todo'), T('Responsive navigation', 'todo')],
        images: [img('Home page', 28), img('Cart', 150)]
      }),
      P({
        name: 'Listings scraper', path: 'D:\\Stare\\scraper_ogloszen', category: 'Bots and scripts',
        description: 'A script that checks listings every hour and saves new ones to a CSV file.',
        tech: ['Python', 'BeautifulSoup'], tags: ['automation'], status: 'active',
        sizeBytes: Math.round(5.2 * MB), updatedAt: isoAgo(14), backedUpAt: isoAgo(21),
        commands: [C('Run', 'python scraper.py')]
      }),
      P({
        name: 'Snake', path: 'C:\\Users\\Ty\\Desktop\\snake', category: 'Games',
        description: 'The classic snake on a canvas, with a high-score save.',
        tech: ['JavaScript', 'Canvas'], tags: ['game', 'learning'], status: 'done',
        sizeBytes: Math.round(1.1 * MB), updatedAt: isoAgo(30), backedUpAt: null,
        images: [img('Board', 120)]
      }),
      P({
        name: 'Home budget', path: 'D:\\Projects\\home_budget', category: 'Data',
        description: 'A notebook that loads bank statements and plots spending month by month.',
        tech: ['Python', 'pandas', 'Jupyter'], tags: ['finance'], status: 'active',
        sizeBytes: 96 * MB, updatedAt: isoAgo(4), backedUpAt: isoAgo(1),
        tasks: [T('Spending categories', 'doing'), T('Import the CSV export', 'todo'), T('Add a monthly budget cap', 'todo')], images: [img('Spending', 260)]
      }),
      P({
        name: 'Currency converter', path: 'D:\\Stare\\kalkulator_walut', category: 'Tools',
        description: 'A simple currency converter with rates from the national bank.',
        tech: ['Python'], tags: ['learning'], status: 'done', archived: true,
        sizeBytes: Math.round(2.2 * MB), updatedAt: isoAgo(120), backedUpAt: isoAgo(118)
      }),
      P({
        name: 'School project', path: 'C:\\Users\\Ty\\Desktop\\stary_projekt_szkola', category: 'Other',
        description: 'A page made for a class grade. Due for deletion, but I\'d rather keep it.',
        tech: ['HTML'], tags: ['school'], status: 'idea', archived: true,
        sizeBytes: 340 * MB, updatedAt: isoAgo(400), backedUpAt: null
      })
    ];
  }

  /* ---------- file tree (for the demo file browser) ---------- */

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

    add('README.md', L('# ' + p.name, '', p.description || 'Project description.', '', '## Running', '', '~~~bash', cmd, '~~~', ''));
    add('.gitignore', L('__pycache__/', 'node_modules/', '.venv/', '.env', ''));

    if (p.id === 'demo-projecthub') {
      add('main.py', L('import uvicorn', '', 'if __name__ == "__main__":', '    # local only, never 0.0.0.0', '    uvicorn.run("app.routes:app", host="127.0.0.1", port=8000, reload=True)', ''));
      add('requirements.txt', L('fastapi>=0.115', 'uvicorn>=0.30', 'bcrypt>=4.2', 'python-multipart>=0.0.9', ''));
      add('app/__init__.py', '');
      add('app/routes.py', L('from fastapi import FastAPI, Depends', 'from .auth import current_user', '', 'app = FastAPI(title="ProjectHub")', '', '@app.get("/api/projects")', 'def list_projects(user=Depends(current_user)):', '    return db.all_projects()', ''));
      add('app/auth.py', L('import bcrypt', '', 'def hash_password(plain: str) -> bytes:', '    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt())', '', 'def verify(plain: str, hashed: bytes) -> bool:', '    return bcrypt.checkpw(plain.encode(), hashed)', ''));
      add('app/db.py', L('import sqlite3', '', 'def connect():', '    conn = sqlite3.connect("projecthub.db")', '    conn.row_factory = sqlite3.Row', '    return conn', ''));
      add('static/index.html', L('<!doctype html>', '<html lang="pl">', '<head><title>ProjectHub</title></head>', '<body><main id="view"></main></body>', '</html>', ''));
      add('static/css/style.css', L(':root { --bg: #0E0C1A; --signal: #FFB65C; }', 'body { background: var(--bg); color: #EEEAFB; }', ''));
      add('static/js/app.js', L('// router and views', 'const view = document.querySelector("#view");', 'window.addEventListener("hashchange", render);', 'function render() { view.textContent = location.hash; }', ''));
      add('tests/test_api.py', L('def test_list_requires_login(client):', '    r = client.get("/api/projects")', '    assert r.status_code == 401', ''));
      add('docs/screenshot-katalog.png', '__img:170');
      add('docs/screenshot-projekt.png', '__img:200');
      return root;
    }

    if (/python|discord|pandas|beautifulsoup|jupyter/.test(techs)) {
      add('main.py', L('def main():', '    print("Start: ' + p.name + '")', '', 'if __name__ == "__main__":', '    main()', ''));
      add('requirements.txt', L('requests', ''));
      add('app/__init__.py', '');
      add('app/core.py', L('def run(config: dict) -> None:', '    """Main project logic."""', '    ...', ''));
      add('tests/test_core.py', L('from app.core import run', '', 'def test_run_does_not_crash():', '    run({})', ''));
    }
    if (/html|css|javascript|canvas/.test(techs)) {
      add('index.html', L('<!doctype html>', '<html lang="pl">', '<head>', '  <meta charset="utf-8">', '  <title>' + p.name + '</title>', '  <link rel="stylesheet" href="css/style.css">', '</head>', '<body>', '  <script src="js/main.js"></script>', '</body>', '</html>', ''));
      add('css/style.css', L('body { margin: 0; font-family: sans-serif; }', ''));
      add('js/main.js', L('"use strict";', 'console.log("Start");', ''));
      add('assets/screen.png', '__img:' + (hashStr(p.name) % 360));
    }
    return root;
  }

  window.PH_DEMO = { uid, shot, seed, buildTree, hashStr, isoAgo, MB, GB };
})();
