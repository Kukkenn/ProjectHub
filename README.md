<div align="center">

# ProjectHub

**The local-first workspace manager & execution hub for developers.**

ProjectHub connects your scattered code repositories, local paths, dev commands, and notes into one unified, secure dashboard.

<br>

<p align="center">
  <a href="https://github.com/Kukkenn/projecthub"><img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/Kukkenn/projecthub"><img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="https://github.com/Kukkenn/projecthub"><img src="https://img.shields.io/badge/SQLite-WAL_Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite"></a>
  <a href="https://github.com/Kukkenn/projecthub"><img src="https://img.shields.io/badge/JavaScript-Vanilla_SPA-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"></a>
</p>

<p align="center">
  <a href="#-project-showcase">
    <img src="docs/screenshots/hero.png" alt="ProjectHub — Local-first · Self-hosted · Open source" width="850">
  </a>
</p>

</div>

---

> [!NOTE]
> **Local-First & Private:** ProjectHub runs locally on `127.0.0.1`. Your code, database records, and session history never leave your machine. (The UI loads its font from Google Fonts; no user data is sent there.)

---

## <img src="https://cdn.simpleicons.org/target/FFB65C" width="20" align="center"> &nbsp;Why ProjectHub?

Managing multiple active development projects across local directories often leads to terminal chaos, forgotten custom execution commands, scattered Markdown files, and unorganized screenshots.

ProjectHub bridges the gap between raw file explorers and heavy IDE workspace configurations by providing an independent execution, storage, and cataloging harness.

### Comparison: Traditional File Organization vs. ProjectHub

| Feature / Challenge | Traditional Folder Storage | Open Cloud Managers | ProjectHub (Local-First) |
| :--- | :--- | :--- | :--- |
| **Data Privacy** | Local, but unindexed | Cloud-dependent, remote host | **100% Local (SQLite + WAL)** |
| **Execution Control** | Manual terminal navigation | Not supported | **1-Click Custom Commands** |
| **Web Previewing** | Manual local server setup | Shared public links | **Tokenized CSP Sandbox** |
| **Documentation & Tasks** | Random scattered `.txt`/`.md` | Separate third-party apps | **Embedded Workspace Docs & Tasks** |
| **Backup Integrity** | Manual copying | Cloud subscription sync | **Automated 1-Click ZIP Archives** |

---

## <img src="https://cdn.simpleicons.org/lightning/FFB65C" width="20" align="center"> &nbsp;Key Features

* **Dual Storage Architecture:**
  * **Managed Workspace:** Upload project contents directly into ProjectHub's storage with built-in file tree inspection, text editor, and ZIP handlers.
  * **Local Pointer Mode:** Point directly to existing directories anywhere on your local system without moving or altering source files.
* **Command Automation:** Save per-project execution scripts (e.g. `npm run dev`, `python main.py`, `pytest`) and execute them with direct output isolation.
* **Token-Authenticated Web Previews:** Test frontend HTML/CSS/JS builds in an isolated sandbox environment protected with strict Content Security Policy (`CSP`) headers.
* **Directory Tech Scanner:** Scan system directories to automatically recognize project stacks (Python, Node.js, Rust, Go, Docker, C#) and batch-import project structures.
* **Security Hardening:** Built-in defenses against Zip-Slip exploits, path traversal attacks, rate-throttled login attempts (scrypt), and CSRF validation.

---

## <img src="https://cdn.simpleicons.org/rocket/FFB65C" width="20" align="center"> &nbsp;Getting Started

> [!WARNING]
> Running in **Hosted Mode** disables direct system path pointers and raw terminal executions for host security. Use **Managed Storage** when hosting remotely.

### Option 1: Standalone Build (.exe)

1. Download the latest `.exe` release package.
2. Launch `start.bat` or run `projecthub.exe`.
3. Open `http://127.0.0.1:8765` in your web browser.

### Option 2: Run From Source

```bash
# Clone repository
git clone https://github.com/Kukkenn/projecthub.git
cd projecthub

# Install required backend dependencies
pip install -r backend/requirements.txt

# Start local FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765
```

---

## <img src="https://cdn.simpleicons.org/stackblitz/FFB65C" width="20" align="center"> &nbsp;Project Structure

```text
projecthub/
├── backend/            # FastAPI Core Server & Business Logic
│   ├── accounts.py     # User creation, guide seeding & credentials
│   ├── config.py       # Global environment & feature switches
│   ├── db.py           # SQLite connection pool, WAL mode & migrations
│   ├── export.py       # ZIP archiving, metadata export & backup builder
│   ├── fsutil.py       # Safe path operations, directory sizing & sandbox rules
│   ├── guide.py        # Default guide project templates & pages
│   ├── main.py         # App entry point, FastAPI routing & security guards
│   ├── manage.py       # Database management & CLI admin routines
│   ├── requirements.txt
│   ├── run.py          # Standalone launcher script
│   ├── security.py     # Throttling, hashing & CSRF token generation
│   └── validate.py     # Input sanitation & schema validation
├── desktop/            # Desktop wrapper and packaging files
├── static/             # Frontend Single Page Application (SPA)
│   ├── index.html      # Main workspace dashboard layout
│   ├── login.html      # Authentication portal
│   ├── css/            # Modular stylesheets (project, style, themes, views)
│   └── js/             # SPA client modules (app, api, md, lib, upload, views...)
├── docs/               # Screenshots used in this README
├── Dockerfile          # Containerized deployment setup
├── docker-compose.yml  # Docker multi-container orchestration
├── Caddyfile           # Reverse proxy configuration
├── start.bat           # Windows 1-click execution script
└── start.sh            # Linux/macOS 1-click execution script
```

---

## <img src="https://cdn.simpleicons.org/googlechrome/FFB65C" width="20" align="center"> &nbsp;Project Showcase

### Every project. One place.
<p align="center">
  <img src="docs/screenshots/projects.png" alt="Every project. One place." width="800">
  <br>
  <em>Main dashboard with favorites, tags &amp; filters, and category pills.</em>
</p>

| Edit Files in the Browser | Docs in Markdown |
| :---: | :---: |
| <img src="docs/screenshots/edit-files.png" alt="Edit files in the browser" width="400"> | <img src="docs/screenshots/docs.png" alt="Docs in Markdown" width="400"> |
| *Built-in directory tree, text editor, upload and ZIP handlers.* | *Multi-page per-project documentation written in Markdown.* |

| Themes for Every Mood | Documentation Pages |
| :---: | :---: |
| <img src="docs/screenshots/themes.png" alt="Themes for every mood" width="400"> | <img src="docs/screenshots/docs-view.png" alt="Documentation page view" width="400"> |
| *Night, Ocean and Light themes across the whole app.* | *Getting-started pages with code blocks and callouts.* |

---

## <img src="https://cdn.simpleicons.org/github/FFB65C" width="20" align="center"> &nbsp;Star History

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=Kukkenn/projecthub&type=Date)](https://star-history.com/#Kukkenn/projecthub&Date)

</div>

---

## <img src="https://cdn.simpleicons.org/blueprint/FFB65C" width="20" align="center"> &nbsp;License

MIT © [Bartosz Grześkowiak (Kuke)](https://github.com/Kukkenn)
