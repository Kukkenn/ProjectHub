"""Ustawienia z zmiennych środowiskowych (PROJECTHUB_*)."""
import os

MB = 1024 * 1024


def _int(name, default):
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


MODE = os.environ.get("PROJECTHUB_MODE", "local").strip().lower()
if MODE not in ("local", "hosted"):
    MODE = "local"
HOSTED = MODE == "hosted"

# open: każdy może założyć konto; closed: konta tworzy administrator poleceniem manage.py
REGISTRATION = os.environ.get("PROJECTHUB_REGISTRATION", "open").strip().lower()
if REGISTRATION not in ("open", "closed"):
    REGISTRATION = "open"

HOST = os.environ.get("PROJECTHUB_HOST") or ("0.0.0.0" if HOSTED else "127.0.0.1")
PORT = _int("PROJECTHUB_PORT", 8765)
ALLOWED_HOSTS = {h.strip().lower() for h in os.environ.get("PROJECTHUB_ALLOWED_HOSTS", "").split(",") if h.strip()}
TRUST_PROXY = os.environ.get("PROJECTHUB_TRUST_PROXY") == "1"
HTTPS = os.environ.get("PROJECTHUB_HTTPS") == "1"

QUOTA = _int("PROJECTHUB_QUOTA_MB", 500) * MB          # 0 = bez limitu
MAX_FILE = _int("PROJECTHUB_MAX_FILE_MB", 50) * MB
MAX_FILES = _int("PROJECTHUB_MAX_FILES", 5000)           # plików w jednym projekcie
MAX_ZIP = _int("PROJECTHUB_MAX_ZIP_MB", 200) * MB

# Funkcje, które dotykają dysku serwera, są tylko w trybie lokalnym.
LOCAL_FEATURES = not HOSTED
FEATURES = {
    "run": LOCAL_FEATURES,
    "scan": LOCAL_FEATURES,
    "localPaths": LOCAL_FEATURES,
    "openFolder": LOCAL_FEATURES,
    "backupToPath": LOCAL_FEATURES,
    "upload": True,
    "preview": True,
}
