"""Project data validation. Errors are ValueError messages."""
import re

STATUSES = ("idea", "active", "paused", "done")
TASK_STATES = ("todo", "doing", "done")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")


def _text(v, name, maxlen, required=False, multiline=False):
    if v is None:
        v = ""
    if not isinstance(v, str):
        raise ValueError("Field “%s” must be text." % name)
    v = v.replace("\x00", "")
    if not multiline:
        v = " ".join(v.split()) if "\n" in v or "\r" in v else v.strip()
    if required and not v.strip():
        raise ValueError("Field “%s” is required." % name)
    if len(v) > maxlen:
        raise ValueError("Field “%s” is too long (at most %d characters)." % (name, maxlen))
    return v


def _strlist(v, name, maxitems=40, maxlen=40):
    if not isinstance(v, list):
        raise ValueError("Field “%s” must be a list." % name)
    out, seen = [], set()
    for x in v:
        t = _text(x, name, maxlen)
        if t and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    if len(out) > maxitems:
        raise ValueError("Field “%s” has too many items (at most %d)." % (name, maxitems))
    return out


def _items(v, name, maxitems):
    if not isinstance(v, list):
        raise ValueError("Field “%s” must be a list." % name)
    if len(v) > maxitems:
        raise ValueError("Field “%s” has too many items (at most %d)." % (name, maxitems))
    ids = set()
    for x in v:
        if not isinstance(x, dict):
            raise ValueError("Invalid item in the “%s” field." % name)
        i = x.get("id")
        if not isinstance(i, str) or not ID_RE.match(i):
            raise ValueError("Invalid id in the “%s” field." % name)
        if i in ids:
            raise ValueError("Duplicate id in the “%s” field." % name)
        ids.add(i)
    return v


def clean_path(v):
    v = _text(v, "Path", 500)
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        v = v[1:-1].strip()
    return v


COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def clean_project(data, partial, require_path=True):
    """Returns the dict of fields to save (database columns). With partial=False, name and path are required."""
    if not isinstance(data, dict):
        raise ValueError("Invalid project data.")
    out = {}
    has = lambda k: k in data

    if has("name") or not partial:
        out["name"] = _text(data.get("name"), "Name", 120, required=True)
    if require_path and (has("path") or not partial):
        out["path"] = clean_path(data.get("path"))
        if not out["path"]:
            raise ValueError("Field “Path” is required.")
    if has("icon"):
        out["icon"] = _text(data["icon"], "Icon", 8)
    if has("color"):
        c = _text(data["color"], "Color", 7)
        if c and not COLOR_RE.match(c):
            raise ValueError("Color must be in the #RRGGBB format.")
        out["color"] = c.lower()
    if has("description"):
        out["description"] = _text(data["description"], "Description", 2000, multiline=True)
    if has("notes"):
        out["notes"] = _text(data["notes"], "Notes", 500000, multiline=True)
    if has("category"):
        out["category"] = _text(data["category"], "Category", 40) or "Inne"
    elif not partial:
        out["category"] = "Inne"
    if has("status"):
        if data["status"] not in STATUSES:
            raise ValueError("Unknown project status.")
        out["status"] = data["status"]
    if has("favorite"):
        out["favorite"] = 1 if data["favorite"] is True else 0
    if has("archived"):
        out["archived"] = 1 if data["archived"] is True else 0
    if has("tech"):
        out["tech"] = _strlist(data["tech"], "Technologies")
    if has("tags"):
        out["tags"] = _strlist(data["tags"], "Tags")
    if has("commands"):
        cmds = _items(data["commands"], "Commands", 20)
        out["commands"] = [{
            "id": c["id"],
            "label": _text(c.get("label"), "Command name", 40, required=True),
            "cmd": _text(c.get("cmd"), "Command", 500, required=True),
        } for c in cmds]
    if has("tasks"):
        tasks = _items(data["tasks"], "Tasks", 500)
        out["tasks"] = [{
            "id": t["id"],
            "text": _text(t.get("text"), "Task", 200, required=True),
            "state": t.get("state") if t.get("state") in TASK_STATES else "todo",
        } for t in tasks]
    if has("docs"):
        docs = _items(data["docs"], "Documentation", 100)
        out["docs"] = [{
            "id": d["id"],
            "title": _text(d.get("title"), "Page title", 120, required=True),
            "body": _text(d.get("body"), "Page content", 200000, multiline=True),
        } for d in docs]
    return out
