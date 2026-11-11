"""Hasła (scrypt), tokeny sesji i ograniczanie prób logowania."""
import base64
import hashlib
import hmac
import secrets
import time

_N, _R, _P = 2 ** 14, 8, 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    h = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    return "scrypt${}${}${}${}${}".format(
        _N, _R, _P, base64.b64encode(salt).decode(), base64.b64encode(h).decode())


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, digest = stored.split("$")
        if scheme != "scrypt":
            return False
        expected = base64.b64decode(digest)
        h = hashlib.scrypt(password.encode("utf-8"), salt=base64.b64decode(salt),
                           n=int(n), r=int(r), p=int(p), dklen=len(expected))
        return hmac.compare_digest(h, expected)
    except (ValueError, TypeError):
        return False


# do wyrównania czasu, gdy login nie istnieje
DUMMY_HASH = hash_password("nieistniejace-konto")


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class Throttle:
    """Po `limit` błędach w oknie `window` sekund blokuje kolejne próby."""

    def __init__(self, limit=5, window=300):
        self.limit, self.window = limit, window
        self.fails = {}

    def _clean(self, key):
        now = time.monotonic()
        self.fails[key] = [t for t in self.fails.get(key, []) if now - t < self.window]
        return self.fails[key]

    def wait(self, key) -> int:
        f = self._clean(key)
        if len(f) < self.limit:
            return 0
        return max(1, int(self.window - (time.monotonic() - f[0])))

    def fail(self, key):
        self._clean(key).append(time.monotonic())

    def reset(self, key):
        self.fails.pop(key, None)
