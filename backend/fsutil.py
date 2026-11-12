"""File operations: safe paths, sizes, scanning, backup, running."""
import datetime
import os
import re
import subprocess
import sys
import tempfile
import time
import unicodedata
import zipfile

IS_WIN = os.name == "nt"
TEXT_LIMIT = 200 * 1024
IMAGE_EXT = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
             ".webp": "image/webp", ".bmp": "image/bmp", ".ico": "image/x-icon"}


class FsError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message, self.status = message, status


def normalize_project_path(path):
    """If someone pastes a path to a file (e.g. index.html), the folder holding that file becomes the project."""
    if path and os.path.isfile(path):
        return os.path.dirname(path)
    return path


def project_root(path):
    path = normalize_project_path(path)
    if not path or not os.path.isdir(path):
        raise FsError("Project folder doesn't exist or is unavailable: " + (path or "(no path)"), 400)
    return os.path.realpath(path)


def safe_join(root, rel):
    """Joins a relative path onto the project folder; escaping the folder is a 400 error."""
    rel = (rel or "").replace("\\", "/").strip("/")
    if "\x00" in rel or re.match(r"^[A-Za-z]:", rel) or rel.startswith("~"):
        raise FsError("Path escapes the project folder.")
    parts = [p for p in rel.split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts):
        raise FsError("Path escapes the project folder.")
    full = os.path.realpath(os.path.join(root, *parts))
    if full != root and not full.startswith(root + os.sep):
        raise FsError("Path escapes the project folder.")
    return full


def iso(ts):
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def list_dir(root, rel):
    full = safe_join(root, rel)
    if not os.path.isdir(full):
        raise FsError("This is not a folder.", 400)
    entries = []
    try:
        with os.scandir(full) as it:
            for e in it:
                if len(entries) >= 2000:
                    break
                try:
                    isdir = e.is_dir(follow_symlinks=False)
                    st = e.stat(follow_symlinks=False)
                except OSError:
                    continue
                entries.append({"name": e.name, "type": "dir" if isdir else "file",
                                "size": 0 if isdir else st.st_size, "modified": iso(st.st_mtime)})
    except PermissionError:
        raise FsError("Access to this folder is denied.", 403)
    entries.sort(key=lambda x: (x["type"] != "dir", x["name"].lower()))
    return {"path": "" if full == root else os.path.relpath(full, root).replace(os.sep, "/"),
            "entries": entries}


def read_file(root, rel, pid):
    full = safe_join(root, rel)
    if not os.path.isfile(full):
        raise FsError("This is not a file.", 400)
    size = os.path.getsize(full)
    name = os.path.basename(full)
    ext = os.path.splitext(name)[1].lower()
    if ext in IMAGE_EXT:
        from urllib.parse import quote
        return {"name": name, "size": size, "kind": "image",
                "url": "/api/projects/%s/raw?path=%s" % (quote(pid, safe=""), quote(rel.replace("\\", "/").strip("/"), safe="/"))}
    with open(full, "rb") as f:
        raw = f.read(TEXT_LIMIT + 1)
    truncated = len(raw) > TEXT_LIMIT
    raw = raw[:TEXT_LIMIT]
    if b"\x00" in raw[:8192]:
        return {"name": name, "size": size, "kind": "binary"}
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = raw.decode("utf-8", errors="strict") if truncated else raw.decode("cp1250")
        except UnicodeDecodeError:
            text = raw.decode("utf-8", errors="replace")
    out = {"name": name, "size": size, "kind": "text", "content": text}
    if truncated:
        out["truncated"] = True
    return out


def dir_size(path, deadline):
    total = 0
    stack = [path]
    while stack:
        if time.monotonic() > deadline:
            break
        d = stack.pop()
        try:
            with os.scandir(d) as it:
                for e in it:
                    try:
                        if e.is_symlink():
                            continue
                        if e.is_dir(follow_symlinks=False):
                            stack.append(e.path)
                        else:
                            total += e.stat(follow_symlinks=False).st_size
                    except OSError:
                        continue
        except OSError:
            continue
    return total


MARKERS = [("package.json", "Node.js"), ("requirements.txt", "Python"), ("pyproject.toml", "Python"),
           ("index.html", "HTML"), ("Cargo.toml", "Rust"), ("go.mod", "Go"), ("pom.xml", "Java"),
           ("composer.json", "PHP"), ("Dockerfile", "Docker")]
SKIP_SCAN = {"node_modules", "$recycle.bin", "system volume information", "__pycache__"}


def scan(path):
    path = os.path.expanduser((path or "").strip().strip("\"'"))
    if not path or not os.path.isabs(path):
        raise FsError("Provide a full path to a folder, for example C:\\Users\\You\\Desktop.")
    if not os.path.isdir(path):
        raise FsError("That folder doesn't exist: " + path, 404)
    folders = []
    try:
        names = sorted(os.listdir(path), key=str.lower)
    except PermissionError:
        raise FsError("Access to this folder is denied.", 403)
    for n in names:
        if len(folders) >= 300:
            break
        full = os.path.join(path, n)
        if n.startswith(".") or n.lower() in SKIP_SCAN or not os.path.isdir(full) or os.path.islink(full):
            continue
        tech, files = [], 0
        try:
            top = set(os.listdir(full))
        except OSError:
            continue
        for marker, label in MARKERS:
            if marker in top and label not in tech:
                tech.append(label)
        if any(x.endswith((".csproj", ".sln")) for x in top):
            tech.append("C#")
        if "Python" not in tech and any(x.endswith(".py") for x in top):
            tech.append("Python")
        for _root, dirs, fl in os.walk(full):
            dirs[:] = [d for d in dirs if d.lower() not in SKIP_SCAN and not d.startswith(".")]
            files += len(fl)
            if files >= 5000:
                break
        folders.append({"name": n, "path": full, "tech": tech, "files": files})
    return {"path": path, "folders": folders}


def slug(name):
    s = unicodedata.normalize("NFKD", name.replace("ł", "l").replace("Ł", "L"))
    s = s.encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60] or "projekt"


def open_in_explorer(path):
    if IS_WIN:
        os.startfile(path)  # noqa: S606 — we only open the project directory, validated a bit further up
    elif sys.platform == "darwin":
        subprocess.Popen(["open", path])
    else:
        subprocess.Popen(["xdg-open", path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def run_command(cmd, cwd):
    """Runs a command SAVED in the database inside the project folder."""
    if IS_WIN:
        subprocess.Popen(["cmd", "/k", cmd], cwd=cwd, creationflags=subprocess.CREATE_NEW_CONSOLE)
    else:
        subprocess.Popen(cmd, shell=True, cwd=cwd, start_new_session=True,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


# ---------------------------------------------------------------- projects stored in ProjectHub

SKIP_DIRS = {"node_modules", ".git", "__pycache__", ".venv"}
_BAD_CHARS = re.compile(r'[\x00-\x1f<>:"|?*]')


def rel_parts(p):
    """Splits a relative path into safe components or raises FsError."""
    p = (p or "").replace("\\", "/")
    if p.startswith("/") or re.match(r"^[A-Za-z]:", p):
        raise FsError("Invalid file path.")
    parts = []
    for x in p.split("/"):
        if x in ("", "."):
            continue
        if x == "..":
            raise FsError("Invalid file path.")
        if len(x) > 200 or _BAD_CHARS.search(x):
            raise FsError("Invalid file name.")
        x = x.rstrip(" .")
        if not x:
            raise FsError("Invalid file name.")
        parts.append(x)
    if not parts or len(parts) > 30:
        raise FsError("Invalid file path.")
    return parts


def copy_limited(src, dest, limit):
    """Copies a stream into a file (atomically). Returns the byte count or raises 413."""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.isdir(dest):
        raise FsError("A folder with that name already exists here.")
    tmp = dest + ".part"
    n = 0
    try:
        with open(tmp, "wb") as out:
            while True:
                chunk = src.read(1024 * 1024)
                if not chunk:
                    break
                n += len(chunk)
                if n > limit:
                    raise FsError("File is too large (limit %d MB)." % (limit // (1024 * 1024)), 413)
                out.write(chunk)
        os.replace(tmp, dest)
    except BaseException:
        try:
            os.remove(tmp)
        except OSError:
            pass
        raise
    return n


def count_files(root):
    n = 0
    for _cur, _dirs, files in os.walk(root):
        n += len(files)
    return n


def tree_signature(root, cap=6000):
    """Fast fingerprint of the file tree (for refreshing the live preview)."""
    latest, n, total = 0.0, 0, 0
    stack = [root]
    while stack and n < cap:
        d = stack.pop()
        try:
            with os.scandir(d) as it:
                for e in it:
                    try:
                        if e.is_dir(follow_symlinks=False):
                            if e.name not in SKIP_DIRS:
                                stack.append(e.path)
                        elif e.is_file(follow_symlinks=False):
                            st = e.stat(follow_symlinks=False)
                            n += 1
                            total += st.st_size
                            latest = max(latest, st.st_mtime)
                    except OSError:
                        continue
        except OSError:
            continue
    return "%d-%d-%d" % (int(latest * 1000), n, total)


def html_files(root, cap=200):
    out = []
    for cur, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS and not d.startswith("."))
        for f in sorted(files):
            if f.lower().endswith((".html", ".htm")):
                out.append(os.path.relpath(os.path.join(cur, f), root).replace(os.sep, "/"))
                if len(out) >= cap:
                    return out
    out.sort(key=lambda x: (x.count("/"), x.lower() != "index.html" and not x.lower().endswith("/index.html"), x.lower()))
    return out


def delete_path(root, rel):
    full = safe_join(root, rel)
    if full == root:
        raise FsError("Can't delete the project's root folder.")
    if os.path.isdir(full) and not os.path.islink(full):
        import shutil
        shutil.rmtree(full)
    elif os.path.exists(full) or os.path.islink(full):
        os.remove(full)
    else:
        raise FsError("File not found.", 404)


def rename_path(root, src, dst):
    a = safe_join(root, src)
    b_parts = rel_parts(dst)
    b = safe_join(root, "/".join(b_parts))
    if a == root or not os.path.exists(a):
        raise FsError("File not found.", 404)
    if os.path.exists(b):
        raise FsError("A file with that name already exists.", 409)
    os.makedirs(os.path.dirname(b), exist_ok=True)
    os.replace(a, b)


def extract_zip(zip_path, root, budget, max_files, start_files, skip_info=True):
    """Safely unpacks a ZIP into root. Returns (saved, skipped, info_json_bytes|None)."""
    import zipfile
    saved = skipped = 0
    info = None
    with zipfile.ZipFile(zip_path) as z:
        entries = [i for i in z.infolist() if not i.is_dir()]
        if len(entries) > max_files + 1000:
            raise FsError("The archive has too many files.", 413)
        names = [i.filename.replace("\\", "/").lstrip("/") for i in entries]
        tops = {n.split("/")[0] for n in names if "/" in n}
        strip = len(tops) == 1 and all("/" in n for n in names)
        for i, name in zip(entries, names):
            if strip:
                name = name.split("/", 1)[1]
            if (i.external_attr >> 16) & 0o170000 == 0o120000:      # symlink, we don't unpack those
                skipped += 1
                continue
            if name.startswith("PROJECTHUB-INFO/"):
                if name == "PROJECTHUB-INFO/projekt.json" and i.file_size < 2 * 1024 * 1024:
                    info = z.read(i)
                continue
            try:
                parts = rel_parts(name)
            except FsError:
                skipped += 1
                continue
            if any(p in SKIP_DIRS for p in parts[:-1]):
                skipped += 1
                continue
            if start_files + saved >= max_files:
                raise FsError("A project can have at most %d files." % max_files, 413)
            if budget is not None and budget < 0:
                raise FsError("Storage quota exceeded.", 413)
            limit = min(60 * 1024 * 1024, budget) if budget is not None else 60 * 1024 * 1024
            with z.open(i) as src:
                try:
                    n = copy_limited(src, safe_join(root, "/".join(parts)), limit if limit > 0 else 0)
                except FsError as e:
                    if e.status == 413:
                        raise FsError("File size limit or storage quota exceeded.", 413)
                    skipped += 1
                    continue
            if budget is not None:
                budget -= n
            saved += 1
    return saved, skipped, info


def import_folder(src, dest_root, budget, max_files, max_file, move=False, data_dir=None):
    """Copies a folder from disk into a ProjectHub project. Returns (saved, skipped, bytes, removed_from_source).

    With move=True, after a SUCCESSFUL copy only the files that were copied and have the
    same size are removed from the source folder (plus the empty folders they leave behind).
    Skipped files (node_modules, symlinks, etc.) stay in place, nothing is deleted recursively."""
    src = os.path.realpath(src)
    single = os.path.isfile(src)          # just a file given (e.g. index.html) — we take that file only, not the folder next to it
    if single:
        src_dir = os.path.dirname(src)
    elif not os.path.isdir(src):
        raise FsError("Source folder doesn't exist or isn't a folder.", 404)
    home = os.path.realpath(os.path.expanduser("~"))
    if src == os.path.dirname(src) or src == home:
        raise FsError("Pick a specific project folder, not a whole drive or your home folder.")
    for forbidden in filter(None, [data_dir and os.path.realpath(data_dir), os.path.realpath(dest_root)]):
        if src == forbidden or src.startswith(forbidden + os.sep) or forbidden.startswith(src + os.sep):
            raise FsError("This folder overlaps ProjectHub's data.")
    plan, skipped, total = [], 0, 0
    walk = [(src_dir, [], [os.path.basename(src)])] if single else os.walk(src)
    for cur, dirs, files in walk:
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not os.path.islink(os.path.join(cur, d))]
        for name in files:
            full = os.path.join(cur, name)
            try:
                if os.path.islink(full) or not os.path.isfile(full):
                    skipped += 1
                    continue
                size = os.path.getsize(full)
            except OSError:
                skipped += 1
                continue
            if size > max_file:
                skipped += 1
                continue
            plan.append((full, os.path.relpath(full, src_dir if single else src).replace(os.sep, "/"), size))
            total += size
            if len(plan) > max_files:
                raise FsError("The folder has too many files (limit %d)." % max_files, 413)
    if budget is not None and total > budget:
        raise FsError("Not enough storage on the account: need %d MB, %d MB free." % (total // 1048576 + 1, budget // 1048576), 413)
    done = []
    try:
        for full, rel, size in plan:
            with open(full, "rb") as fh:
                copy_limited(fh, safe_join(dest_root, rel), max_file)
            done.append((full, rel, size))
    except BaseException:
        for _f, rel, _s in done:           # if the import blows up, don't leave half-written files behind
            try:
                os.remove(safe_join(dest_root, rel))
            except (OSError, FsError):
                pass
        raise
    removed = 0
    if move:
        base = src_dir if single else src
        for full, rel, size in done:
            try:
                if os.path.getsize(os.path.join(dest_root, *rel.split("/"))) == size:
                    os.remove(full)
                    removed += 1
            except OSError:
                continue
        for cur, dirs, files in ([] if single else os.walk(src, topdown=False)):
            if cur != src:
                try:
                    os.rmdir(cur)               # only succeeds if it's actually empty
                except OSError:
                    pass
    return len(done), skipped, total, removed
