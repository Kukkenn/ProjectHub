"""Konta użytkowników: tworzenie (z projektem-przewodnikiem), zmiana hasła, usuwanie."""
import datetime
import json
import os
import re
import shutil
import sqlite3

import db
import guide
import security

USERNAME_RE = re.compile(r"^[\w.\-]{3,40}$")


class AccountError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message, self.status = message, status


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def check_credentials(username, password):
    if not USERNAME_RE.match(username):
        raise AccountError("Login ma 3 do 40 znaków: litery, cyfry, kropka, myślnik lub podkreślenie.")
    check_password(password)


def check_password(password):
    if len(password) < 8:
        raise AccountError("Hasło jest za krótkie. Użyj co najmniej 8 znaków.")
    if len(password) > 200:
        raise AccountError("Hasło jest za długie.")


def seed_guide(user_id):
    """Każde nowe konto dostaje projekt-przewodnik: strony w bazie i pliki .md w folderze projektu."""
    pid = "przewodnik-%d" % user_id
    folder = db.ws_dir(user_id, pid)
    os.makedirs(folder, exist_ok=True)
    readme = ["# %s\n" % guide.PROJECT_NAME, guide.DESCRIPTION + "\n", "## Spis stron\n"]
    size = 0
    for n, (page_id, title, text) in enumerate(guide.PAGES, 1):
        fn = "%02d-%s.md" % (n, page_id)
        with open(os.path.join(folder, fn), "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        size += len(text.encode("utf-8"))
        readme.append("%d. [%s](%s)" % (n, title, fn))
    body = "\n".join(readme) + "\n"
    with open(os.path.join(folder, "README.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write(body)
    t = now_iso()
    pos = db.one("SELECT COALESCE(MIN(position), 1) - 1 AS p FROM projects WHERE user_id = ?", (user_id,))["p"]
    db.run(
        "INSERT INTO projects (id, user_id, position, name, path, storage, icon, description, notes, category, status,"
        " favorite, is_guide, tech, tags, commands, tasks, docs, images, size_bytes, created_at, updated_at)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (pid, user_id, pos, guide.PROJECT_NAME, "", "managed", "📘", guide.DESCRIPTION, guide.NOTES, guide.CATEGORY,
         "active", 1, 1, json.dumps(guide.TECH), json.dumps(guide.TAGS), json.dumps(guide.COMMANDS),
         json.dumps([{"id": i, "text": x, "state": s} for i, x, s in guide.TASKS], ensure_ascii=False),
         json.dumps([{"id": i, "title": x, "body": b} for i, x, b in guide.PAGES], ensure_ascii=False),
         "[]", size + len(body), t, t))


def create_user(username, password, only_first=False):
    """Zwraca id nowego konta. only_first: tylko gdy nie ma jeszcze żadnych kont."""
    username = (username or "").strip()
    check_credentials(username, password)
    ph = security.hash_password(password)
    with db.transaction():
        if only_first and db.one("SELECT 1 FROM users LIMIT 1"):
            raise AccountError("Rejestracja jest wyłączona. Poproś administratora o konto.", 403)
        try:
            cur = db.run("INSERT INTO users (username, pw_hash, created_at) VALUES (?,?,?)", (username, ph, now_iso()))
        except sqlite3.IntegrityError:
            raise AccountError("Taki login już istnieje. Wybierz inny.", 409)
        uid = cur.lastrowid
        seed_guide(uid)
    return uid


def set_password(user_id, new_password):
    check_password(new_password)
    db.run("UPDATE users SET pw_hash = ? WHERE id = ?", (security.hash_password(new_password), user_id))


def delete_user(user_id):
    """Usuwa konto razem z projektami i ich plikami w ProjectHub. Pliki z dysku (projekty lokalne) zostają."""
    db.run("DELETE FROM users WHERE id = ?", (user_id,))  # kaskadowo: projekty i sesje
    for sub in ("workspaces", "uploads", "guide"):
        shutil.rmtree(os.path.join(db.DATA_DIR, sub, str(user_id)), ignore_errors=True)
