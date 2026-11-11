"""SQLite: konta, sesje i projekty."""
import json
import os
import sys
import sqlite3
import threading

BASE = os.path.dirname(os.path.abspath(__file__))
def _data_dir():
    if os.environ.get("PROJECTHUB_DATA"):
        return os.environ["PROJECTHUB_DATA"]
    if getattr(sys, "frozen", False):       # spakowany serwer: dane obok pliku .exe, nie w folderze tymczasowym
        return os.path.join(os.path.dirname(sys.executable), "data")
    return os.path.join(os.path.dirname(BASE), "data")


DATA_DIR = _data_dir()
DB_PATH = os.path.join(DATA_DIR, "projecthub.db")
LOCK = threading.RLock()
_conn = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pw_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Inne',
  status TEXT NOT NULL DEFAULT 'active',
  favorite INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  is_guide INTEGER NOT NULL DEFAULT 0,
  storage TEXT NOT NULL DEFAULT 'local',
  icon TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  tech TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  commands TEXT NOT NULL DEFAULT '[]',
  tasks TEXT NOT NULL DEFAULT '[]',
  docs TEXT NOT NULL DEFAULT '[]',
  images TEXT NOT NULL DEFAULT '[]',
  size_bytes INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  backed_up_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, position);
"""

JSON_FIELDS = ("tech", "tags", "commands", "tasks", "docs", "images")


def conn():
    global _conn
    if _conn is None:
        os.makedirs(DATA_DIR, exist_ok=True)
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA foreign_keys=ON")
        _conn.executescript(SCHEMA)
        have = {r["name"] for r in _conn.execute("PRAGMA table_info(projects)")}
        for name, ddl in (("storage", "TEXT NOT NULL DEFAULT 'local'"), ("icon", "TEXT NOT NULL DEFAULT ''"),
                          ("color", "TEXT NOT NULL DEFAULT ''")):
            if name not in have:  # migracja baz z wcześniejszych wersji
                _conn.execute("ALTER TABLE projects ADD COLUMN %s %s" % (name, ddl))
        try:
            os.chmod(DB_PATH, 0o600)
        except OSError:
            pass
    return _conn


def query(sql, args=()):
    with LOCK:
        return conn().execute(sql, args).fetchall()


def one(sql, args=()):
    with LOCK:
        return conn().execute(sql, args).fetchone()


def run(sql, args=()):
    with LOCK:
        return conn().execute(sql, args)


def transaction():
    """with db.transaction(): ... (BEGIN IMMEDIATE .. COMMIT)"""
    class T:
        def __enter__(self):
            LOCK.acquire()
            conn().execute("BEGIN IMMEDIATE")
        def __exit__(self, et, ev, tb):
            try:
                conn().execute("ROLLBACK" if et else "COMMIT")
            finally:
                LOCK.release()
            return False
    return T()


def ws_dir(uid, pid):
    """Folder z plikami projektu przechowywanego w ProjectHub."""
    return os.path.join(DATA_DIR, "workspaces", str(uid), pid)


def row_to_project(r):
    managed = r["storage"] == "managed"
    p = {
        "id": r["id"], "name": r["name"], "path": "" if managed else r["path"],
        "storage": r["storage"], "icon": r["icon"], "color": r["color"], "description": r["description"],
        "notes": r["notes"], "category": r["category"], "status": r["status"],
        "favorite": bool(r["favorite"]), "archived": bool(r["archived"]),
        "sizeBytes": r["size_bytes"], "updatedAt": r["updated_at"], "backedUpAt": r["backed_up_at"],
    }
    for f in JSON_FIELDS:
        try:
            p[f] = json.loads(r[f])
        except (TypeError, ValueError):
            p[f] = []
    p["images"] = [{"id": i["id"], "name": i["name"], "url": "/api/media/%s/%s" % (r["id"], i["id"])}
                   for i in p["images"]]
    return p