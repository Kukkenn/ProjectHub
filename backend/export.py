"""Backups and project downloads: files + description, notes, docs, tasks."""
import datetime
import json
import os
import re
import tempfile
import zipfile

import fsutil

INFO = "PROJECTHUB-INFO"
STATES = {"todo": "[ ]", "doing": "[~]", "done": "[x]"}
STATUS = {"idea": "Idea", "active": "In progress", "paused": "Paused", "done": "Done"}


def info_readme(p):
    L = ["# %s" % p["name"], ""]
    if p.get("description"):
        L += [p["description"], ""]
    L += ["| | |", "|---|---|", "| Status | %s |" % STATUS.get(p.get("status"), p.get("status")),
          "| Category | %s |" % p.get("category", "")]
    if p.get("tech"):
        L.append("| Technologies | %s |" % ", ".join(p["tech"]))
    if p.get("tags"):
        L.append("| Tags | %s |" % ", ".join(p["tags"]))
    if p.get("path"):
        L.append("| Original path | `%s` |" % p["path"])
    L.append("")
    if p.get("commands"):
        L += ["## Commands", ""] + ["- **%s**: `%s`" % (c["label"], c["cmd"]) for c in p["commands"]] + [""]
    if p.get("tasks"):
        L += ["## Tasks", ""] + ["- %s %s" % (STATES.get(t["state"], "[ ]"), t["text"]) for t in p["tasks"]] + [""]
    if p.get("notes", "").strip():
        L += ["## Notes", "", p["notes"].rstrip(), ""]
    if p.get("docs"):
        L += ["## Documentation", ""] + ["%d. %s (file in the `dokumentacja` folder)" % (n, d["title"]) for n, d in enumerate(p["docs"], 1)] + [""]
    return "\n".join(L)


def info_entries(p, images):
    """List of (name in the archive, bytes | file path) with the project's metadata."""
    meta = {k: v for k, v in p.items() if k not in ("images", "sizeBytes")}
    meta["images"] = [i["name"] for i in p.get("images", [])]
    out = [(INFO + "/projekt.json", json.dumps(meta, ensure_ascii=False, indent=2).encode("utf-8")),
           (INFO + "/README.md", info_readme(p).encode("utf-8"))]
    for n, d in enumerate(p.get("docs", []), 1):
        out.append(("%s/dokumentacja/%02d-%s.md" % (INFO, n, fsutil.slug(d["title"])), d["body"].encode("utf-8")))
    for n, (name, path) in enumerate(images, 1):
        safe = re.sub(r"[^\w.\- ]", "_", name)[:80] or "zdjecie"
        out.append(("%s/zdjecia/%02d-%s" % (INFO, n, safe), path))
    return out


def write_project(z, prefix, root, exclude, p, images, skip_dir=None):
    skip = {x.strip().lower() for x in exclude if isinstance(x, str) and x.strip()}
    if root and os.path.isdir(root):
        for cur, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d.lower() not in skip and not os.path.islink(os.path.join(cur, d))
                       and (skip_dir is None or os.path.realpath(os.path.join(cur, d)) != skip_dir)]
            for f in files:
                fp = os.path.join(cur, f)
                if os.path.islink(fp):
                    continue
                try:
                    z.write(fp, prefix + os.path.relpath(fp, root).replace(os.sep, "/"))
                except OSError:
                    continue
    for name, data in info_entries(p, images):
        if isinstance(data, bytes):
            z.writestr(prefix + name, data)
        elif os.path.isfile(data):
            z.write(data, prefix + name)


def build_zip(items, exclude, dest_dir=None, skip_dir=None):
    """items: [(project_dict, root|None, [(name, path)])]. Returns the path to a (temporary) .zip file."""
    fd, tmp = tempfile.mkstemp(suffix=".part", dir=dest_dir)
    os.close(fd)
    used = set()
    try:
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, allowZip64=True) as z:
            for p, root, images in items:
                base = fsutil.slug(p["name"])
                name, n = base, 1
                while name in used:
                    n += 1
                    name = "%s-%d" % (base, n)
                used.add(name)
                write_project(z, name + "/", root, exclude, p, images, skip_dir)
    except BaseException:
        try:
            os.remove(tmp)
        except OSError:
            pass
        raise
    return tmp


def dated_name(base):
    return "%s-%s" % (base, datetime.date.today().isoformat())


def backup_to_folder(item, destination, exclude):
    p, root, images = item
    destination = os.path.expanduser((destination or "").strip().strip("\"'"))
    if not destination or not os.path.isabs(destination):
        raise fsutil.FsError("Provide the full path to the destination folder, for example E:\\Backups.")
    os.makedirs(destination, exist_ok=True)
    dest = os.path.realpath(destination)
    base = dated_name(fsutil.slug(p["name"]))
    target, n = os.path.join(dest, base + ".zip"), 1
    while os.path.exists(target):
        n += 1
        target = os.path.join(dest, "%s-%d.zip" % (base, n))
    tmp = build_zip([item], exclude, dest_dir=dest, skip_dir=dest)
    os.replace(tmp, target)
    return target
