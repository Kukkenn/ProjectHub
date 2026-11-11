"""Zarządzanie kontami z wiersza poleceń (np. gdy rejestracja jest zamknięta).

  python manage.py list
  python manage.py create-user jan
  python manage.py set-password jan
  python manage.py delete-user jan
"""
import getpass
import sys

import accounts
import db


def find(name):
    u = db.one("SELECT * FROM users WHERE username = ?", (name,))
    if not u:
        sys.exit("Nie ma takiego konta: %s" % name)
    return u


def ask_password():
    p1 = getpass.getpass("Hasło (min. 8 znaków): ")
    if p1 != getpass.getpass("Powtórz hasło: "):
        sys.exit("Hasła nie są takie same.")
    return p1


def main(argv):
    if not argv or argv[0] not in ("list", "create-user", "set-password", "delete-user"):
        sys.exit(__doc__)
    cmd = argv[0]
    try:
        if cmd == "list":
            for u in db.query("SELECT u.username, u.created_at, (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id) AS n"
                              " FROM users u ORDER BY u.id"):
                print("%-30s %s  projektów: %d" % (u["username"], u["created_at"], u["n"]))
        elif cmd == "create-user" and len(argv) == 2:
            accounts.create_user(argv[1], ask_password())
            print("Utworzono konto %s (z projektem-przewodnikiem)." % argv[1])
        elif cmd == "set-password" and len(argv) == 2:
            accounts.set_password(find(argv[1])["id"], ask_password())
            db.run("DELETE FROM sessions WHERE user_id = ?", (find(argv[1])["id"],))
            print("Hasło zmienione, użytkownik został wylogowany.")
        elif cmd == "delete-user" and len(argv) == 2:
            u = find(argv[1])
            if input("Usunąć konto %s razem z jego projektami i plikami? Wpisz TAK: " % u["username"]) == "TAK":
                accounts.delete_user(u["id"])
                print("Usunięto.")
        else:
            sys.exit(__doc__)
    except accounts.AccountError as e:
        sys.exit(e.message)


if __name__ == "__main__":
    main(sys.argv[1:])
