<div align="center">

<img src="docs/assets/logo.png" alt="ProjectHub Logo" width="120" height="120">

# ProjectHub

<p align="center">
  <b>An end-to-end local workspace & project catalog designed to eliminate digital clutter.</b>
</p>

<p align="center">
  <a href="#-key-features">Features</a> &nbsp;&bull;&nbsp;
  <a href="#-architecture--problems-solved">Architecture</a> &nbsp;&bull;&nbsp;
  <a href="#-getting-started">Installation</a> &nbsp;&bull;&nbsp;
  <a href="#-project-showcase">Showcase</a> &nbsp;&bull;&nbsp;
  <a href="#-license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11%20%7C%203.12-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python Version">
  <img src="https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/SQLite-WAL-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License">
</p>

</div>

---

## 🚀 Overview

Managing multiple development environments, scripts, and local repositories often results in fragmented notes, lost CLI commands, and broken directory structures. **ProjectHub** acts as a centralized dashboard and execution control center that unifies local path references and managed project files into a single, clean workspace.

---

## 💡 Problems Solved

| Problem | ProjectHub Solution |
| :--- | :--- |
| **Directory Chaos** | Centralizes scattered local projects and managed workspaces into a single interface with custom color tags and categorization. |
| **Command Fatigue** | Eliminates the need to memorize project-specific launch scripts. Define custom CLI commands and trigger them instantly. |
| **Unsafe Previews** | Provides a token-authenticated, sandboxed HTML/JS preview runner with strict Content Security Policy (CSP) headers. |
| **Documentation Scatter** | Replaces random text files with embedded multi-page Markdown documentation and interactive task checklists per project. |
| **Data Loss Risk** | Features automated single-click ZIP exports and direct background backups to external drives or cloud sync folders. |

---

## ✨ Key Features

* **Dual Storage Architecture:** Choose between *Managed Storage* (fully uploaded and indexed within ProjectHub) or *Local Mode* (direct pointer to existing system paths).
* **Directory Scanner:** Automatically crawl local system directories, detect tech stacks (Python, Node.js, Rust, Go, Docker, C#), and batch-import repositories.
* **Isolated Live Previews:** Test web builds safely via short-lived, sandboxed URLs that prevent cookie leakage and unauthorized API access.
* **Robust Security Model:** Built-in protection against Zip-Slip vulnerabilities, path traversal exploits, CSRF attacks, and brute-force login attempts via request throttling.
* **Media & Screenshot Gallery:** Integrated image management for UI captures and visual progress tracking equipped with Lightbox support.

---

## 🛠️ Tech Stack

* **Backend:** Python, FastAPI, Starlette, SQLite (WAL mode, thread-safe connections)
* **Frontend:** Vanilla JavaScript (SPA architecture), HTML5, CSS3 Custom Properties
* **Deployment:** Standalone local executable (`.exe`) or manual multi-platform server runtime

---

## 📂 Project Structure

```text
projecthub/
├── backend/            # FastAPI core server and business logic
│   ├── main.py         # Application entry point, routing & security middleware
│   ├── db.py           # SQLite connection pool, WAL setup & schema migrations
│   ├── fsutil.py       # Safe path validation, directory sizing & sandbox rules
│   ├── accounts.py     # User authentication, sessions & guide initialization
│   ├── export.py       # ZIP archiving, metadata export & backup builder
│   └── security.py     # Rate-limiting, password hashing & CSRF tokens
├── static/             # Client-side Single Page Application (SPA)
│   ├── css/            # Modular stylesheets, theme definitions & layout grid
│   ├── js/             # SPA router, API client, state manager & Markdown engine
│   ├── index.html      # Main dashboard layout
│   └── login.html      # Authentication portal
├── data/               # Local SQLite database & managed workspace files
└── requirements.txt    # Python runtime dependencies
