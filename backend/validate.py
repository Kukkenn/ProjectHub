"""Walidacja danych projektu. Błędy po polsku, jako ValueError."""
import re

STATUSES = ("idea", "active", "paused", "done")
TASK_STATES = ("todo", "doing", "done")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")


def _text(v, name, maxlen, required=False, multiline=False):
    if v is None:
        v = ""
    if not isinstance(v, str):
        raise ValueError("Pole „%s” musi być tekstem." % name)
    v = v.replace("\x00", "")
    if not multiline:
        v = " ".join(v.split()) if "\n" in v or "\r" in v else v.strip()
    if required and not v.strip():
        raise ValueError("Pole „%s” jest wymagane." % name)
    if len(v) > maxlen:
        raise ValueError("Pole „%s” jest za długie (maksymalnie %d znaków)." % (name, maxlen))
    return v


def _strlist(v, name, maxitems=40, maxlen=40):
    if not isinstance(v, list):
        raise ValueError("Pole „%s” musi być listą." % name)
    out, seen = [], set()
    for x in v:
        t = _text(x, name, maxlen)
        if t and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    if len(out) > maxitems:
        raise ValueError("Pole „%s” ma za dużo elementów (maksymalnie %d)." % (name, maxitems))
    return out


def _items(v, name, maxitems):
    if not isinstance(v, list):
        raise ValueError("Pole „%s” musi być listą." % name)
    if len(v) > maxitems:
        raise ValueError("Pole „%s” ma za dużo elementów (maksymalnie %d)." % (name, maxitems))
    ids = set()
    for x in v:
        if not isinstance(x, dict):
            raise ValueError("Nieprawidłowy element w polu „%s”." % name)
        i = x.get("id")
        if not isinstance(i, str) or not ID_RE.match(i):
            raise ValueError("Nieprawidłowy identyfikator w polu „%s”." % name)
        if i in ids:
            raise ValueError("Powtórzony identyfikator w polu „%s”." % name)
        ids.add(i)
    return v


def clean_path(v):
    v = _text(v, "Ścieżka", 500)
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        v = v[1:-1].strip()
    return v


COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def clean_project(data, partial, require_path=True):
    """Zwraca słownik pól do zapisu (kolumny bazy). Przy partial=False wymaga nazwy i ścieżki."""
    if not isinstance(data, dict):
        raise ValueError("Nieprawidłowe dane projektu.")
    out = {}
    has = lambda k: k in data

    if has("name") or not partial:
        out["name"] = _text(data.get("name"), "Nazwa", 120, required=True)
    if require_path and (has("path") or not partial):
        out["path"] = clean_path(data.get("path"))
        if not out["path"]:
            raise ValueError("Pole „Ścieżka” jest wymagane.")
    if has("icon"):
        out["icon"] = _text(data["icon"], "Ikona", 8)
    if has("color"):
        c = _text(data["color"], "Kolor", 7)
        if c and not COLOR_RE.match(c):
            raise ValueError("Kolor musi mieć postać #RRGGBB.")
        out["color"] = c.lower()
    if has("description"):
        out["description"] = _text(data["description"], "Opis", 2000, multiline=True)
    if has("notes"):
        out["notes"] = _text(data["notes"], "Notatki", 500000, multiline=True)
    if has("category"):
        out["category"] = _text(data["category"], "Kategoria", 40) or "Inne"
    elif not partial:
        out["category"] = "Inne"
    if has("status"):
        if data["status"] not in STATUSES:
            raise ValueError("Nieznany status projektu.")
        out["status"] = data["status"]
    if has("favorite"):
        out["favorite"] = 1 if data["favorite"] is True else 0
    if has("archived"):
        out["archived"] = 1 if data["archived"] is True else 0
    if has("tech"):
        out["tech"] = _strlist(data["tech"], "Technologie")
    if has("tags"):
        out["tags"] = _strlist(data["tags"], "Tagi")
    if has("commands"):
        cmds = _items(data["commands"], "Polecenia", 20)
        out["commands"] = [{
            "id": c["id"],
            "label": _text(c.get("label"), "Nazwa polecenia", 40, required=True),
            "cmd": _text(c.get("cmd"), "Polecenie", 500, required=True),
        } for c in cmds]
    if has("tasks"):
        tasks = _items(data["tasks"], "Zadania", 500)
        out["tasks"] = [{
            "id": t["id"],
            "text": _text(t.get("text"), "Zadanie", 200, required=True),
            "state": t.get("state") if t.get("state") in TASK_STATES else "todo",
        } for t in tasks]
    if has("docs"):
        docs = _items(data["docs"], "Dokumentacja", 100)
        out["docs"] = [{
            "id": d["id"],
            "title": _text(d.get("title"), "Tytuł strony", 120, required=True),
            "body": _text(d.get("body"), "Treść strony", 200000, multiline=True),
        } for d in docs]
    return out
