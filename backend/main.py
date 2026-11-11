"""ProjectHub: serwer (FastAPI + SQLite). Tryb lokalny słucha tylko na 127.0.0.1; tryb hosted jest dla serwera z HTTPS."""
import hashlib
import hmac
import json
import mimetypes
import os
import sys
import re
import secrets
import tempfile
import time
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Request
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from starlette.responses import FileResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from starlette.staticfiles import StaticFiles

import accounts
import config
import db
import export
import fsutil
import security
from accounts import now_iso
from validate import clean_project

BASE = os.path.dirname(os.path.abspath(__file__))
def _find_static():
    if os.environ.get("PROJECTHUB_STATIC"):
        return os.environ["PROJECTHUB_STATIC"]
    if getattr(sys, "frozen", False):       # spakowany serwer: folder static leży obok pliku .exe
        near = os.path.join(os.path.dirname(sys.executable), "static")
        if os.path.isdir(near):
            return near
    return os.path.join(os.path.dirname(BASE), "static")


STATIC = _find_static()
SESSION_DAYS = 7
COOKIE = "ph_session"
LOOPBACK = {"127.0.0.1", "localhost", "::1"}
MAX_JSON = 12 * 1024 * 1024
MAX_IMG = 8 * 1024 * 1024
MAX_PROJECTS = 300
MAX_BATCH = 120 * 1024 * 1024
DEFAULT_EXCLUDE = ["node_modules", ".venv", "__pycache__"]
PREVIEW_TTL = 2 * 3600

app = FastAPI(title="ProjectHub", docs_url=None, redoc_url=None, openapi_url=None)
login_throttle = security.Throttle(limit=5, window=300)
user_throttle = security.Throttle(limit=10, window=900)
reg_throttle = security.Throttle(limit=10, window=3600)


def fail(status, message):
    return HTTPException(status_code=status, detail=message)


def fs_fail(e):
    return fail(e.status, e.message)


# ------------------------------------------------------------------ zabezpieczenia

CSP = ("default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-src 'self'; "
       "frame-ancestors 'none'; base-uri 'none'; form-action 'self'")


def host_ok(request):
    raw = (request.headers.get("host") or "").lower()
    host = raw[1:raw.index("]")] if raw.startswith("[") and "]" in raw else raw.split(":")[0]
    if config.ALLOWED_HOSTS:
        return host in config.ALLOWED_HOSTS or raw in config.ALLOWED_HOSTS
    if config.HOSTED:
        return True
    return host in LOOPBACK


@app.middleware("http")
async def guard(request: Request, call_next):
    if request.url.path != "/api/health" and not host_ok(request):
        return JSONResponse({"detail": "Niedozwolony adres hosta."}, status_code=400)
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        if origin:
            if origin == "null" or re.sub(r"^https?://", "", origin).lower() != (request.headers.get("host") or "").lower():
                return JSONResponse({"detail": "Żądanie z innego źródła zostało odrzucone."}, status_code=403)
        try:
            if int(request.headers.get("content-length") or 0) > MAX_BATCH + MAX_JSON:
                return JSONResponse({"detail": "Żądanie jest za duże."}, status_code=413)
        except ValueError:
            pass
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault("Content-Security-Policy", CSP)
    if config.HTTPS:
        resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
    path = request.url.path
    if path.startswith("/api/"):
        resp.headers["Cache-Control"] = "private, max-age=3600" if "/media/" in path else "no-store"
    return resp


def client_key(request: Request):
    if config.TRUST_PROXY:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[-1].strip()
    return request.client.host if request.client else "?"


async def body(request: Request):
    try:
        raw = await request.body()
        if len(raw) > MAX_JSON:
            raise fail(413, "Dane są za duże.")
        data = json.loads(raw or b"{}")
    except HTTPException:
        raise
    except ValueError:
        raise fail(400, "Nieprawidłowe dane (oczekiwano JSON).")
    if not isinstance(data, dict):
        raise fail(400, "Nieprawidłowe dane (oczekiwano obiektu JSON).")
    return data


def current_session(request: Request):
    tok = request.cookies.get(COOKIE)
    if not tok:
        return None
    r = db.one("SELECT s.*, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?",
               (security.token_hash(tok),))
    if not r:
        return None
    if r["expires_at"] < time.time():
        db.run("DELETE FROM sessions WHERE token_hash = ?", (r["token_hash"],))
        return None
    return r


def auth(request: Request):
    """Wymaga zalogowania; przy zapisie sprawdza token CSRF."""
    s = current_session(request)
    if not s:
        raise fail(401, "Zaloguj się, żeby kontynuować.")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        sent = request.headers.get("x-csrf-token") or ""
        if not hmac.compare_digest(sent.encode(), s["csrf"].encode()):
            raise fail(403, "Nieprawidłowy token zabezpieczający. Odśwież stronę i spróbuj ponownie.")
    return s


def need(feature, message):
    if not config.FEATURES.get(feature):
        raise fail(403, message)


def start_session(request: Request, resp: Response, user_id: int):
    tok, csrf = security.new_token(), security.new_token()
    db.run("DELETE FROM sessions WHERE expires_at < ?", (time.time(),))
    db.run("INSERT INTO sessions (token_hash, user_id, csrf, created_at, expires_at) VALUES (?,?,?,?,?)",
           (security.token_hash(tok), user_id, csrf, now_iso(), time.time() + SESSION_DAYS * 86400))
    age = SESSION_DAYS * 86400
    secure = config.HTTPS or (config.TRUST_PROXY and request.headers.get("x-forwarded-proto") == "https")
    resp.set_cookie(COOKIE, tok, max_age=age, httponly=True, samesite="strict", path="/", secure=secure)
    resp.set_cookie("csrf_token", csrf, max_age=age, httponly=False, samesite="strict", path="/", secure=secure)


# ------------------------------------------------------------------ konto

def usage_of(uid):
    managed = db.one("SELECT COALESCE(SUM(size_bytes), 0) AS n FROM projects WHERE user_id = ? AND storage = 'managed'", (uid,))["n"]
    up = os.path.join(db.DATA_DIR, "uploads", str(uid))
    return managed + (fsutil.dir_size(up, time.monotonic() + 5) if os.path.isdir(up) else 0)


def limits_info():
    return {"quota": config.QUOTA, "maxFile": config.MAX_FILE, "maxFiles": config.MAX_FILES, "maxZip": config.MAX_ZIP}


@app.get("/api/settings")
async def get_settings(request: Request):
    s = auth(request)
    r = db.one("SELECT data FROM user_settings WHERE user_id = ?", (s["user_id"],))
    try:
        return {"settings": json.loads(r["data"]) if r else None}
    except ValueError:
        return {"settings": None}


@app.put("/api/settings")
async def put_settings(request: Request):
    """Ustawienia wyglądu i zachowania zapisane przy koncie (przeżywają zmianę portu i przeglądarki)."""
    s = auth(request)
    data = (await body(request)).get("settings")
    if not isinstance(data, dict) or len(data) > 60 or not all(isinstance(k, str) and len(k) <= 40 for k in data):
        raise fail(400, "Niepoprawne ustawienia.")
    raw = json.dumps(data, ensure_ascii=False)
    if len(raw) > 16000:
        raise fail(400, "Ustawienia są za duże.")
    db.run("INSERT INTO user_settings (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data",
           (s["user_id"], raw))
    return {"ok": True}


@app.get("/api/auth/status")
async def auth_status(request: Request):
    s = current_session(request)
    has_users = db.one("SELECT 1 FROM users LIMIT 1") is not None
    out = {"configured": has_users, "authenticated": bool(s), "username": s["username"] if s else None,
           "mode": config.MODE, "registration": "open" if (config.REGISTRATION == "open" or not has_users) else "closed",
           "features": config.FEATURES, "limits": limits_info()}
    if s:
        out["usage"] = usage_of(s["user_id"])
    return out


async def register(request: Request):
    d = await body(request)
    key = client_key(request)
    wait = reg_throttle.wait(key)
    if wait:
        raise fail(429, "Za dużo prób zakładania kont. Spróbuj ponownie za %d s." % wait)
    reg_throttle.fail(key)
    try:
        uid = await run_in_threadpool(accounts.create_user, str(d.get("username") or ""), str(d.get("password") or ""),
                                      config.REGISTRATION == "closed")
    except accounts.AccountError as e:
        raise fail(e.status, e.message)
    resp = JSONResponse({"ok": True, "username": str(d.get("username")).strip()})
    start_session(request, resp, uid)
    return resp


app.post("/api/auth/register")(register)
app.post("/api/auth/setup")(register)  # nazwa ze starszych wersji interfejsu


@app.post("/api/auth/login")
async def auth_login(request: Request):
    d = await body(request)
    key = client_key(request)
    username, password = str(d.get("username") or "").strip(), str(d.get("password") or "")
    ukey = "u:" + username.lower()
    wait = max(login_throttle.wait(key), user_throttle.wait(ukey))
    if wait:
        raise fail(429, "Za dużo nieudanych prób. Spróbuj ponownie za %d s." % wait)
    u = db.one("SELECT * FROM users WHERE username = ?", (username,))
    ok = await run_in_threadpool(security.verify_password, password[:200], u["pw_hash"] if u else security.DUMMY_HASH)
    if not u or not ok:
        login_throttle.fail(key)
        user_throttle.fail(ukey)
        raise fail(401, "Nieprawidłowy login lub hasło.")
    login_throttle.reset(key)
    user_throttle.reset(ukey)
    resp = JSONResponse({"ok": True, "username": u["username"]})
    start_session(request, resp, u["id"])
    return resp


@app.post("/api/auth/logout")
async def auth_logout(request: Request):
    tok = request.cookies.get(COOKIE)
    if current_session(request):
        auth(request)
        db.run("DELETE FROM sessions WHERE token_hash = ?", (security.token_hash(tok),))
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE, path="/")
    resp.delete_cookie("csrf_token", path="/")
    return resp


async def verify_current(request, s, password):
    ukey = "u:" + s["username"].lower()
    wait = user_throttle.wait(ukey)
    if wait:
        raise fail(429, "Za dużo nieudanych prób. Spróbuj ponownie za %d s." % wait)
    u = db.one("SELECT * FROM users WHERE id = ?", (s["user_id"],))
    if not await run_in_threadpool(security.verify_password, str(password or "")[:200], u["pw_hash"]):
        user_throttle.fail(ukey)
        raise fail(403, "Hasło jest nieprawidłowe.")
    user_throttle.reset(ukey)


@app.post("/api/account/password")
async def change_password(request: Request):
    s = auth(request)
    d = await body(request)
    await verify_current(request, s, d.get("current"))
    try:
        await run_in_threadpool(accounts.set_password, s["user_id"], str(d.get("new") or ""))
    except accounts.AccountError as e:
        raise fail(e.status, e.message)
    db.run("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?",
           (s["user_id"], security.token_hash(request.cookies.get(COOKIE))))
    return {"ok": True}


@app.delete("/api/account")
async def delete_account(request: Request):
    s = auth(request)
    await verify_current(request, s, (await body(request)).get("password"))
    await run_in_threadpool(accounts.delete_user, s["user_id"])
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE, path="/")
    resp.delete_cookie("csrf_token", path="/")
    return resp


# ------------------------------------------------------------------ projekty

COLS = {"name": "name", "path": "path", "description": "description", "notes": "notes", "category": "category",
        "status": "status", "favorite": "favorite", "archived": "archived", "tech": "tech", "tags": "tags",
        "commands": "commands", "tasks": "tasks", "docs": "docs", "icon": "icon", "color": "color", "storage": "storage"}


def get_row(uid, pid):
    r = db.one("SELECT * FROM projects WHERE id = ? AND user_id = ?", (pid, uid))
    if not r:
        raise fail(404, "Nie znaleziono projektu.")
    return r


def encode(fields):
    return {COLS[k]: (json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v) for k, v in fields.items()}


def new_id():
    return secrets.token_hex(5)


def root_of(r):
    """Folder z plikami projektu: w ProjectHub (managed) albo wskazany ścieżką (local, tylko tryb lokalny)."""
    if r["storage"] == "managed":
        d = db.ws_dir(r["user_id"], r["id"])
        os.makedirs(d, exist_ok=True)
        return os.path.realpath(d)
    need("localPaths", "Projekty wskazujące folder na dysku są wyłączone w trybie serwera. Prześlij pliki do ProjectHub.")
    return fsutil.project_root(r["path"])


def require_managed(r):
    if r["storage"] != "managed":
        raise fail(400, "To działa tylko dla projektów przechowywanych w ProjectHub (nie dla folderu wskazanego ścieżką).")


def check_quota(uid, extra=0):
    if config.QUOTA and usage_of(uid) + extra > config.QUOTA:
        raise fail(413, "Przekroczono limit miejsca na dane (%d MB)." % (config.QUOTA // config.MB))


def refresh_size(r):
    n = fsutil.dir_size(root_of(r), time.monotonic() + 30)
    db.run("UPDATE projects SET size_bytes = ?, updated_at = ? WHERE id = ?", (n, now_iso(), r["id"]))
    return n


def insert_project(uid, f, pid=None):
    pid = pid or new_id()
    t = now_iso()
    pos = db.one("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM projects WHERE user_id = ?", (uid,))["p"]
    cols = {"id": pid, "user_id": uid, "position": pos, "created_at": t, "updated_at": t}
    cols.update(f)
    db.run("INSERT INTO projects (%s) VALUES (%s)" % (",".join(cols), ",".join("?" * len(cols))), tuple(cols.values()))
    return pid


@app.get("/api/projects")
async def list_projects(request: Request):
    s = auth(request)
    return [db.row_to_project(r) for r in db.query(
        "SELECT * FROM projects WHERE user_id = ? ORDER BY position, created_at", (s["user_id"],))]


@app.put("/api/projects/order")
async def reorder(request: Request):
    s = auth(request)
    ids = (await body(request)).get("ids")
    if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
        raise fail(400, "Nieprawidłowa lista projektów.")
    mine = {r["id"] for r in db.query("SELECT id FROM projects WHERE user_id = ?", (s["user_id"],))}
    order = [i for i in dict.fromkeys(ids) if i in mine]
    order += sorted(mine - set(order))
    with db.transaction():
        for n, i in enumerate(order):
            db.run("UPDATE projects SET position = ? WHERE id = ? AND user_id = ?", (n, i, s["user_id"]))
    return {"ok": True}


@app.post("/api/projects")
async def create_project(request: Request):
    s = auth(request)
    data = await body(request)
    if db.one("SELECT COUNT(*) AS n FROM projects WHERE user_id = ?", (s["user_id"],))["n"] >= MAX_PROJECTS:
        raise fail(400, "Osiągnięto limit %d projektów." % MAX_PROJECTS)
    storage = data.get("storage")
    if storage not in ("local", "managed"):
        storage = "local" if (data.get("path") and config.FEATURES["localPaths"]) else "managed"
    if storage == "local":
        need("localPaths", "Projekty wskazujące folder na dysku są wyłączone w trybie serwera. Prześlij pliki do ProjectHub.")
    try:
        f = clean_project(data, partial=False, require_path=(storage == "local"))
    except ValueError as e:
        raise fail(400, str(e))
    f["storage"] = storage
    f.setdefault("status", "active")
    f["path"] = fsutil.normalize_project_path(f["path"]) if storage == "local" else ""
    if not config.FEATURES["run"]:
        f.pop("commands", None)
    pid = insert_project(s["user_id"], encode(f))
    if storage == "managed":
        os.makedirs(db.ws_dir(s["user_id"], pid), exist_ok=True)
    return db.row_to_project(get_row(s["user_id"], pid))


@app.put("/api/projects/{pid}")
async def update_project(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    data = await body(request)
    try:
        f = clean_project(data, partial=True, require_path=(r["storage"] == "local"))
    except ValueError as e:
        raise fail(400, str(e))
    if "path" in f:
        f["path"] = fsutil.normalize_project_path(f["path"])
    if f:
        touch = set(f) - {"favorite", "status", "archived"}
        f = encode(f)
        if touch:
            f["updated_at"] = now_iso()
        db.run("UPDATE projects SET %s WHERE id = ? AND user_id = ?" % ",".join(k + " = ?" for k in f),
               tuple(f.values()) + (pid, s["user_id"]))
    return db.row_to_project(get_row(s["user_id"], pid))


@app.delete("/api/projects/{pid}")
async def delete_project(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    if r["is_guide"]:
        raise fail(400, "Przewodnika nie można usunąć. Jeśli Ci przeszkadza, przenieś go do archiwum.")
    # Pliki wskazane ścieżką (projekty lokalne) zostają nietknięte. Usuwamy wpis oraz kopie przechowywane w ProjectHub.
    db.run("DELETE FROM projects WHERE id = ? AND user_id = ?", (pid, s["user_id"]))
    import shutil
    shutil.rmtree(os.path.join(db.DATA_DIR, "uploads", str(s["user_id"]), pid), ignore_errors=True)
    shutil.rmtree(db.ws_dir(s["user_id"], pid), ignore_errors=True)
    return {"ok": True}


@app.post("/api/projects/{pid}/run")
async def run_project(request: Request, pid: str):
    s = auth(request)
    need("run", "Uruchamianie poleceń jest wyłączone w trybie serwera.")
    r = get_row(s["user_id"], pid)
    cid = (await body(request)).get("commandId")
    cmd = next((c for c in json.loads(r["commands"]) if c["id"] == cid), None)
    if not cmd:
        raise fail(404, "Nie ma takiego polecenia w tym projekcie.")
    try:
        fsutil.run_command(cmd["cmd"], root_of(r))
    except fsutil.FsError as e:
        raise fs_fail(e)
    except OSError as e:
        raise fail(500, "Nie udało się uruchomić polecenia: %s" % e)
    return {"message": "Uruchomiono „%s”." % cmd["label"]}


@app.post("/api/projects/{pid}/open")
async def open_project(request: Request, pid: str):
    s = auth(request)
    need("openFolder", "Otwieranie folderów jest wyłączone w trybie serwera.")
    r = get_row(s["user_id"], pid)
    try:
        full = fsutil.safe_join(root_of(r), str((await body(request)).get("path") or ""))
        if not os.path.isdir(full):
            raise fsutil.FsError("To nie jest folder.")
        fsutil.open_in_explorer(full)
    except fsutil.FsError as e:
        raise fs_fail(e)
    except OSError as e:
        raise fail(500, "Nie udało się otworzyć folderu: %s" % e)
    return {"message": "Otwarto folder w Eksploratorze."}


# ------------------------------------------------------------------ zdjęcia galerii

SIGNATURES = [(b"\x89PNG\r\n\x1a\n", ".png", "image/png"), (b"\xff\xd8\xff", ".jpg", "image/jpeg"),
              (b"GIF87a", ".gif", "image/gif"), (b"GIF89a", ".gif", "image/gif")]


def sniff(data: bytes):
    for sig, ext, mime in SIGNATURES:
        if data.startswith(sig):
            return ext, mime
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp", "image/webp"
    return None


def image_path(uid, pid, img):
    return os.path.join(db.DATA_DIR, "uploads", str(uid), pid, img["id"] + img.get("ext", ".png"))


@app.post("/api/projects/{pid}/images")
async def add_images(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    form = await request.form()
    files = [f for f in form.getlist("files") if hasattr(f, "read")]
    if not files:
        raise fail(400, "Nie wybrano żadnych plików.")
    if len(files) > 12:
        raise fail(400, "Naraz można dodać najwyżej 12 zdjęć.")
    imgs = json.loads(r["images"])
    if len(imgs) + len(files) > 40:
        raise fail(400, "Projekt może mieć najwyżej 40 zdjęć.")
    items = []
    for f in files:
        data = await f.read(MAX_IMG + 1)
        if len(data) > MAX_IMG:
            raise fail(413, "Zdjęcie „%s” jest za duże (maksymalnie 8 MB)." % (f.filename or "plik"))
        name = re.sub(r"[\x00-\x1f]", "", os.path.basename((f.filename or "").replace("\\", "/")))[:80] or "wklejone-zdjecie"
        items.append((name, data))
    check_quota(s["user_id"], sum(len(d) for _n, d in items))
    folder = os.path.join(db.DATA_DIR, "uploads", str(s["user_id"]), pid)
    os.makedirs(folder, exist_ok=True)
    for name, data in items:
        kind = sniff(data)
        if not kind:
            raise fail(400, "Plik „%s” nie jest obsługiwanym zdjęciem (PNG, JPG, WebP, GIF)." % name)
        iid = secrets.token_hex(4)
        with open(os.path.join(folder, iid + kind[0]), "wb") as fh:
            fh.write(data)
        imgs.append({"id": iid, "name": name, "ext": kind[0]})
    db.run("UPDATE projects SET images = ?, updated_at = ? WHERE id = ?", (json.dumps(imgs), now_iso(), pid))
    return db.row_to_project(get_row(s["user_id"], pid))


def find_image(r, iid):
    imgs = json.loads(r["images"])
    img = next((i for i in imgs if i["id"] == iid), None)
    if not img:
        raise fail(404, "Nie znaleziono zdjęcia.")
    return imgs, img


@app.delete("/api/projects/{pid}/images/{iid}")
async def delete_image(request: Request, pid: str, iid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    imgs, img = find_image(r, iid)
    try:
        os.remove(image_path(s["user_id"], pid, img))
    except OSError:
        pass
    db.run("UPDATE projects SET images = ?, updated_at = ? WHERE id = ?",
           (json.dumps([i for i in imgs if i["id"] != iid]), now_iso(), pid))
    return db.row_to_project(get_row(s["user_id"], pid))


@app.post("/api/projects/{pid}/images/{iid}/cover")
async def cover_image(request: Request, pid: str, iid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    imgs, img = find_image(r, iid)
    imgs.remove(img)
    imgs.insert(0, img)
    db.run("UPDATE projects SET images = ?, updated_at = ? WHERE id = ?", (json.dumps(imgs), now_iso(), pid))
    return db.row_to_project(get_row(s["user_id"], pid))


@app.get("/api/media/{pid}/{iid}")
async def media(request: Request, pid: str, iid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    _imgs, img = find_image(r, iid)
    path = image_path(s["user_id"], pid, img)
    if not os.path.isfile(path):
        raise fail(404, "Nie znaleziono zdjęcia.")
    mime = {".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp"}.get(img.get("ext"), "application/octet-stream")
    return FileResponse(path, media_type=mime)


# ------------------------------------------------------------------ pliki projektu

@app.get("/api/projects/{pid}/files")
async def project_files(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    try:
        return await run_in_threadpool(fsutil.list_dir, root_of(r), request.query_params.get("path", ""))
    except fsutil.FsError as e:
        raise fs_fail(e)


@app.get("/api/projects/{pid}/file")
async def project_file(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    try:
        return await run_in_threadpool(fsutil.read_file, root_of(r), request.query_params.get("path", ""), pid)
    except fsutil.FsError as e:
        raise fs_fail(e)
    except OSError as e:
        raise fail(500, "Nie udało się odczytać pliku: %s" % e)


@app.get("/api/projects/{pid}/raw")
async def project_raw(request: Request, pid: str):
    """Serwuje wyłącznie obrazy rastrowe z folderu projektu (bez SVG, który mógłby zawierać skrypty)."""
    s = auth(request)
    r = get_row(s["user_id"], pid)
    try:
        full = fsutil.safe_join(root_of(r), request.query_params.get("path", ""))
    except fsutil.FsError as e:
        raise fs_fail(e)
    mime = fsutil.IMAGE_EXT.get(os.path.splitext(full)[1].lower())
    if not mime or not os.path.isfile(full):
        raise fail(404, "Nie znaleziono obrazu.")
    return FileResponse(full, media_type=mime, headers={"Content-Security-Policy": "sandbox"})


@app.put("/api/projects/{pid}/file")
async def save_file(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    require_managed(r)
    d = await body(request)
    content = d.get("content")
    if not isinstance(content, str) or len(content.encode("utf-8")) > 2 * 1024 * 1024:
        raise fail(400, "Plik tekstowy może mieć najwyżej 2 MB.")
    try:
        parts = fsutil.rel_parts(str(d.get("path") or ""))
        root = root_of(r)
        full = fsutil.safe_join(root, "/".join(parts))
        if any(p in fsutil.SKIP_DIRS for p in parts[:-1]):
            raise fsutil.FsError("Ten folder jest pomijany w projektach.")
        if not os.path.exists(full) and fsutil.count_files(root) >= config.MAX_FILES:
            raise fsutil.FsError("Projekt może mieć najwyżej %d plików." % config.MAX_FILES, 413)
    except fsutil.FsError as e:
        raise fs_fail(e)
    check_quota(s["user_id"], len(content.encode("utf-8")))
    try:
        import io
        await run_in_threadpool(fsutil.copy_limited, io.BytesIO(content.encode("utf-8")), full, 2 * 1024 * 1024)
    except fsutil.FsError as e:
        raise fs_fail(e)
    await run_in_threadpool(refresh_size, r)
    return {"ok": True}


@app.delete("/api/projects/{pid}/file")
async def delete_file(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    require_managed(r)
    try:
        await run_in_threadpool(fsutil.delete_path, root_of(r), request.query_params.get("path", ""))
    except fsutil.FsError as e:
        raise fs_fail(e)
    await run_in_threadpool(refresh_size, r)
    return {"ok": True}


@app.post("/api/projects/{pid}/rename")
async def rename_file(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    require_managed(r)
    d = await body(request)
    try:
        await run_in_threadpool(fsutil.rename_path, root_of(r), str(d.get("from") or ""), str(d.get("to") or ""))
    except fsutil.FsError as e:
        raise fs_fail(e)
    return {"ok": True}


def do_upload(root, items, base_parts, budget):
    saved = skipped = written = 0
    err = None
    count = fsutil.count_files(root)
    for f, name in items:
        try:
            parts = base_parts + fsutil.rel_parts(name)
            if any(p in fsutil.SKIP_DIRS for p in parts[:-1]):
                raise fsutil.FsError("pominięty folder")
            full = fsutil.safe_join(root, "/".join(parts))
        except fsutil.FsError:
            skipped += 1
            continue
        if not os.path.isfile(full):
            if count >= config.MAX_FILES:
                err = "Projekt może mieć najwyżej %d plików." % config.MAX_FILES
                break
            count += 1
        try:
            f.file.seek(0)
            n = fsutil.copy_limited(f.file, full, config.MAX_FILE)
        except fsutil.FsError:
            skipped += 1
            continue
        except OSError:
            skipped += 1
            continue
        written += n
        saved += 1
        if budget is not None and written > budget:
            try:
                os.remove(full)
            except OSError:
                pass
            err = "Przekroczono limit miejsca na dane (%d MB)." % (config.QUOTA // config.MB)
            saved -= 1
            break
    return saved, skipped, err


@app.post("/api/projects/{pid}/upload")
async def upload(request: Request, pid: str):
    """Wgrywa pliki (też całe foldery: pole `paths` niesie ścieżki względne) do projektu w ProjectHub."""
    s = auth(request)
    r = get_row(s["user_id"], pid)
    require_managed(r)
    form = await request.form()
    files = [f for f in form.getlist("files") if hasattr(f, "read")]
    try:
        paths = json.loads(form.get("paths") or "[]")
    except ValueError:
        paths = []
    if not files or not isinstance(paths, list) or len(paths) != len(files):
        raise fail(400, "Nie wybrano plików albo lista ścieżek jest nieprawidłowa.")
    if len(files) > 400:
        raise fail(400, "Naraz można wgrać najwyżej 400 plików. Interfejs dzieli duże foldery automatycznie.")
    try:
        base_parts = fsutil.rel_parts(str(form.get("base"))) if form.get("base") else []
    except fsutil.FsError as e:
        raise fs_fail(e)
    root = root_of(r)
    budget = max(0, config.QUOTA - usage_of(s["user_id"])) if config.QUOTA else None
    saved, skipped, err = await run_in_threadpool(do_upload, root, [(f, str(p)) for f, p in zip(files, paths)], base_parts, budget)
    await run_in_threadpool(refresh_size, r)
    if err:
        raise fail(413, err)
    return {"project": db.row_to_project(get_row(s["user_id"], pid)), "saved": saved, "skipped": skipped}


@app.post("/api/projects/{pid}/upload-zip")
async def upload_zip(request: Request, pid: str):
    """Rozpakowuje ZIP do projektu w ProjectHub (z ochroną przed zip-slip i bombami). Opcja restore=1 odtwarza opisy z kopii."""
    s = auth(request)
    r = get_row(s["user_id"], pid)
    require_managed(r)
    form = await request.form()
    f = form.get("file")
    if not f or not hasattr(f, "read"):
        raise fail(400, "Nie wybrano pliku ZIP.")
    os.makedirs(os.path.join(db.DATA_DIR, "tmp"), exist_ok=True)
    fd, tmp = tempfile.mkstemp(suffix=".zip", dir=os.path.join(db.DATA_DIR, "tmp"))
    os.close(fd)
    try:
        f.file.seek(0)
        try:
            await run_in_threadpool(fsutil.copy_limited, f.file, tmp, config.MAX_ZIP)
        except fsutil.FsError as e:
            raise fs_fail(e)
        root = root_of(r)
        budget = max(0, config.QUOTA - usage_of(s["user_id"])) if config.QUOTA else None
        try:
            saved, skipped, info = await run_in_threadpool(fsutil.extract_zip, tmp, root, budget, config.MAX_FILES,
                                                           fsutil.count_files(root))
        except fsutil.FsError as e:
            await run_in_threadpool(refresh_size, r)
            raise fs_fail(e)
        except Exception:
            raise fail(400, "To nie jest poprawny plik ZIP.")
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass
    if info and form.get("restore") == "1":
        try:
            meta = json.loads(info.decode("utf-8"))
            # Nie przywracaj poleceń uruchamiania z obcego archiwum: zapisany
            # backup mógł pochodzić od innej osoby, a „Uruchom” wykonuje kod.
            keep = {k: meta[k] for k in ("description", "notes", "category", "tags", "tech", "status", "tasks", "docs",
                                          "icon", "color") if k in meta}
            if not config.FEATURES["run"]:
                keep.pop("commands", None)
            fields = encode(clean_project(keep, partial=True, require_path=False))
            if fields:
                db.run("UPDATE projects SET %s WHERE id = ?" % ",".join(k + " = ?" for k in fields), tuple(fields.values()) + (pid,))
        except (ValueError, UnicodeDecodeError, TypeError):
            pass
    await run_in_threadpool(refresh_size, r)
    return {"project": db.row_to_project(get_row(s["user_id"], pid)), "saved": saved, "skipped": skipped}


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.post("/api/projects/{pid}/import-path")
async def import_path(request: Request, pid: str):
    """Kopiuje (albo przenosi) folder z dysku do projektu w ProjectHub. Tylko tryb lokalny."""
    s = auth(request)
    need("localPaths", "Import z dysku jest wyłączony w trybie serwera. Prześlij pliki przeglądarką.")
    r = get_row(s["user_id"], pid)
    require_managed(r)
    data = await body(request)
    src = str(data.get("from") or "").strip().strip('"')
    if not src:
        raise fail(400, "Podaj folder, z którego mam skopiować pliki.")
    move = bool(data.get("move"))
    root = root_of(r)
    budget = max(0, config.QUOTA - usage_of(s["user_id"])) if config.QUOTA else None
    try:
        saved, skipped, size, removed = await run_in_threadpool(
            fsutil.import_folder, src, root, budget, config.MAX_FILES, config.MAX_FILE, move, db.DATA_DIR)
    except fsutil.FsError as e:
        raise fs_fail(e)
    await run_in_threadpool(refresh_size, r)
    return {"project": db.row_to_project(get_row(s["user_id"], pid)), "saved": saved, "skipped": skipped, "removed": removed}


# ------------------------------------------------------------------ podgląd na żywo

def secret_key():
    path = os.path.join(db.DATA_DIR, "secret.key")
    if not os.path.exists(path):
        os.makedirs(db.DATA_DIR, exist_ok=True)
        with open(path, "w") as f:
            f.write(secrets.token_hex(32))
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass
    with open(path) as f:
        return f.read().strip().encode()


def sign(msg):
    return hmac.new(secret_key(), msg.encode(), hashlib.sha256).hexdigest()[:32]


def make_token(pid, uid):
    msg = "%s.%d.%d" % (pid, uid, int(time.time()) + PREVIEW_TTL)
    return msg + "." + sign(msg)


def read_token(tok):
    parts = tok.split(".")
    if len(parts) != 4:
        return None
    pid, uid, exp, sig = parts
    if not hmac.compare_digest(sig, sign("%s.%s.%s" % (pid, uid, exp))):
        return None
    try:
        if int(exp) < time.time():
            return None
        return pid, int(uid)
    except ValueError:
        return None


@app.post("/api/projects/{pid}/preview")
async def preview_start(request: Request, pid: str):
    """Zwraca adres podglądu (token w ścieżce, żeby względne linki w stronie działały) i listę plików HTML."""
    s = auth(request)
    r = get_row(s["user_id"], pid)
    try:
        root = root_of(r)
        files = await run_in_threadpool(fsutil.html_files, root)
        want = str((await body(request)).get("path") or "")
        if want:
            full = fsutil.safe_join(root, want)
            if not os.path.isfile(full):
                raise fsutil.FsError("Nie znaleziono pliku.", 404)
            path = want.replace("\\", "/").strip("/")
        else:
            path = files[0] if files else ""
    except fsutil.FsError as e:
        raise fs_fail(e)
    base = "/preview/%s/" % make_token(pid, s["user_id"])
    return {"base": base, "url": base + quote(path, safe="/"), "path": path, "files": files}


@app.get("/api/projects/{pid}/signature")
async def signature(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    try:
        return {"sig": await run_in_threadpool(fsutil.tree_signature, root_of(r))}
    except fsutil.FsError as e:
        raise fs_fail(e)


MIME = {".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
        ".woff2": "font/woff2", ".woff": "font/woff", ".webp": "image/webp", ".json": "application/json",
        ".wasm": "application/wasm", ".md": "text/plain", ".txt": "text/plain", ".ico": "image/x-icon",
        ".map": "application/json", ".webmanifest": "application/manifest+json"}
PREVIEW_HEADERS = {
    "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads",
    "X-Frame-Options": "SAMEORIGIN", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
}


def preview_page(status, text):
    return Response("<!doctype html><meta charset=utf-8><body style=\"font:16px system-ui;padding:40px;color:#444\">%s" % text,
                    status_code=status, media_type="text/html", headers=PREVIEW_HEADERS)


@app.get("/preview/{token}")
async def preview_redirect(request: Request, token: str):
    return RedirectResponse("/preview/%s/" % token, status_code=307)


@app.get("/preview/{token}/{path:path}")
async def preview_file(request: Request, token: str, path: str):
    """Pliki projektu serwowane w piaskownicy (bez dostępu do ciasteczek i API aplikacji). Dostęp przez token z ograniczonym czasem."""
    tok = read_token(token)
    if not tok:
        return preview_page(403, "Link podglądu wygasł. Otwórz podgląd w ProjectHub ponownie.")
    pid, uid = tok
    r = db.one("SELECT * FROM projects WHERE id = ? AND user_id = ?", (pid, uid))
    if not r:
        return preview_page(404, "Nie znaleziono projektu.")
    try:
        root = root_of(r)
        full = fsutil.safe_join(root, path)
        if os.path.isdir(full):
            full = next((os.path.join(full, n) for n in ("index.html", "index.htm") if os.path.isfile(os.path.join(full, n))), full)
    except (fsutil.FsError, HTTPException):
        return preview_page(404, "Nie znaleziono pliku.")
    if not os.path.isfile(full):
        return preview_page(404, "Nie znaleziono pliku <code>%s</code>. Dodaj <b>index.html</b> albo wybierz plik w podglądzie." % (
            re.sub(r"[<>&\"']", "", path) or "index.html"))
    ext = os.path.splitext(full)[1].lower()
    if ext in (".html", ".htm"):
        mime = "text/html; charset=utf-8"
    else:
        mime = MIME.get(ext) or mimetypes.guess_type(full)[0] or "application/octet-stream"
    return FileResponse(full, media_type=mime, headers=PREVIEW_HEADERS)


# ------------------------------------------------------------------ rozmiary, skan, backup, dane

@app.post("/api/sizes")
async def sizes(request: Request):
    s = auth(request)
    rows = db.query("SELECT * FROM projects WHERE user_id = ?", (s["user_id"],))

    def work():
        out = {}
        deadline = time.monotonic() + 60
        for r in rows:
            try:
                root = root_of(r)
            except (fsutil.FsError, HTTPException):
                continue
            out[r["id"]] = fsutil.dir_size(root, min(deadline, time.monotonic() + 20))
        return out
    res = await run_in_threadpool(work)
    for pid, n in res.items():
        db.run("UPDATE projects SET size_bytes = ? WHERE id = ?", (n, pid))
    return {"sizes": res}


@app.post("/api/scan")
async def scan(request: Request):
    auth(request)
    need("scan", "Skanowanie dysku jest wyłączone w trybie serwera. Prześlij foldery przyciskiem „Dodaj projekt”.")
    try:
        return await run_in_threadpool(fsutil.scan, str((await body(request)).get("path") or ""))
    except fsutil.FsError as e:
        raise fs_fail(e)


def zip_item(r):
    p = db.row_to_project(r)
    images = [(i["name"], image_path(r["user_id"], r["id"], json.loads(r["images"])[n]))
              for n, i in enumerate(p["images"])]
    return p, root_of(r), images


@app.post("/api/backup")
async def backup(request: Request):
    s = auth(request)
    need("backupToPath", "Zapis na dysku serwera jest wyłączony w trybie serwera. Użyj pobierania ZIP.")
    d = await body(request)
    ids, dest = d.get("ids"), d.get("destination")
    exclude = d.get("exclude") if isinstance(d.get("exclude"), list) else DEFAULT_EXCLUDE
    if not isinstance(ids, list) or not ids:
        raise fail(400, "Zaznacz co najmniej jeden projekt.")
    if not isinstance(dest, str) or not dest.strip():
        raise fail(400, "Podaj folder docelowy.")
    results = []
    for pid in [i for i in ids if isinstance(i, str)][:200]:
        r = db.one("SELECT * FROM projects WHERE id = ? AND user_id = ?", (pid, s["user_id"]))
        if not r:
            results.append({"id": pid, "ok": False, "error": "Nie znaleziono projektu."})
            continue
        try:
            target = await run_in_threadpool(lambda: export.backup_to_folder(zip_item(r), dest, exclude))
            t = now_iso()
            db.run("UPDATE projects SET backed_up_at = ? WHERE id = ?", (t, pid))
            results.append({"id": pid, "ok": True, "file": target, "backedUpAt": t})
        except fsutil.FsError as e:
            results.append({"id": pid, "ok": False, "error": e.message})
        except HTTPException as e:
            results.append({"id": pid, "ok": False, "error": str(e.detail)})
        except OSError as e:
            results.append({"id": pid, "ok": False, "error": "Nie udało się zapisać archiwum: %s" % e})
    return {"results": results}


async def zip_response(s, ids, name):
    rows = [db.one("SELECT * FROM projects WHERE id = ? AND user_id = ?", (i, s["user_id"])) for i in ids]
    rows = [r for r in rows if r]
    if not rows:
        raise fail(404, "Nie znaleziono projektów.")
    try:
        tmp = await run_in_threadpool(lambda: export.build_zip([zip_item(r) for r in rows], DEFAULT_EXCLUDE))
    except fsutil.FsError as e:
        raise fs_fail(e)
    t = now_iso()
    for r in rows:
        db.run("UPDATE projects SET backed_up_at = ? WHERE id = ?", (t, r["id"]))
    return FileResponse(tmp, media_type="application/zip", filename=name, background=BackgroundTask(os.remove, tmp))


@app.get("/api/backup/download")
async def backup_download(request: Request):
    s = auth(request)
    ids = [i for i in request.query_params.get("ids", "").split(",") if i][:200]
    if not ids:
        raise fail(400, "Zaznacz co najmniej jeden projekt.")
    return await zip_response(s, ids, export.dated_name("projecthub-backup") + ".zip")


@app.get("/api/projects/{pid}/download")
async def project_download(request: Request, pid: str):
    s = auth(request)
    r = get_row(s["user_id"], pid)
    return await zip_response(s, [pid], export.dated_name(fsutil.slug(r["name"])) + ".zip")


@app.get("/api/export")
async def export_json(request: Request):
    s = auth(request)
    return {"version": 2, "projects": [db.row_to_project(r) for r in db.query(
        "SELECT * FROM projects WHERE user_id = ? ORDER BY position", (s["user_id"],))]}


@app.post("/api/import")
async def import_data(request: Request):
    s = auth(request)
    projects = (await body(request)).get("projects")
    if not isinstance(projects, list) or len(projects) > 500:
        raise fail(400, "Plik importu nie zawiera listy projektów (najwyżej 500).")
    n = 0
    with db.transaction():
        for raw in projects:
            storage = raw.get("storage") if isinstance(raw, dict) else None
            if storage != "local" or not config.FEATURES["localPaths"]:
                storage = "managed"
            try:
                f = clean_project(raw, partial=False, require_path=(storage == "local"))
            except ValueError as e:
                raise fail(400, "Projekt nr %d: %s" % (n + 1, e))
            if storage == "local":
                f["path"] = fsutil.normalize_project_path(f["path"])
            else:
                f["path"] = ""
            # Polecenia z importu (obcego pliku) nie wchodzą do nowego projektu.
            f.pop("commands", None)
            f["storage"] = storage
            f = encode(f)
            rid = raw.get("id") if isinstance(raw.get("id"), str) else ""
            mine = db.one("SELECT id, storage FROM projects WHERE id = ? AND user_id = ?", (rid, s["user_id"])) if rid else None
            if mine:
                f.pop("storage", None)
                if mine["storage"] == "managed":
                    f.pop("path", None)
                f["updated_at"] = now_iso()
                db.run("UPDATE projects SET %s WHERE id = ?" % ",".join(k + " = ?" for k in f), tuple(f.values()) + (rid,))
            else:
                ok_id = rid and re.match(r"^[A-Za-z0-9_-]{1,40}$", rid) and not db.one("SELECT 1 FROM projects WHERE id = ?", (rid,))
                insert_project(s["user_id"], f, rid if ok_id else None)
            n += 1
    return {"imported": n}


# ------------------------------------------------------------------ błędy i pliki statyczne

@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


@app.exception_handler(Exception)
async def server_error(request: Request, exc: Exception):
    return JSONResponse({"detail": "Błąd serwera. Szczegóły są w oknie, w którym działa ProjectHub."}, status_code=500)


@app.get("/")
async def root(request: Request):
    return RedirectResponse("/index.html" if current_session(request) else "/login.html", status_code=302)


app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")