"""Account management from the command line (e.g. when registration is closed).

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
        sys.exit("No such account: %s" % name)
    return u


def ask_password():
    p1 = getpass.getpass("Password (min. 8 characters): ")
    if p1 != getpass.getpass("Repeat password: "):
        sys.exit("The passwords don't match.")
    return p1


def main(argv):
    if not argv or argv[0] not in ("list", "create-user", "set-password", "delete-user"):
        sys.exit(__doc__)
    cmd = argv[0]
    try:
        if cmd == "list":
            for u in db.query("SELECT u.username, u.created_at, (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id) AS n"
                              " FROM users u ORDER BY u.id"):
                print("%-30s %s  projects: %d" % (u["username"], u["created_at"], u["n"]))
        elif cmd == "create-user" and len(argv) == 2:
            accounts.create_user(argv[1], ask_password())
            print("Created account %s (with the guide project)." % argv[1])
        elif cmd == "set-password" and len(argv) == 2:
            accounts.set_password(find(argv[1])["id"], ask_password())
            db.run("DELETE FROM sessions WHERE user_id = ?", (find(argv[1])["id"],))
            print("Password changed, the user has been logged out.")
        elif cmd == "delete-user" and len(argv) == 2:
            u = find(argv[1])
            if input("Delete account %s along with its projects and files? Type YES: " % u["username"]) == "YES":
                accounts.delete_user(u["id"])
                print("Deleted.")
        else:
            sys.exit(__doc__)
    except accounts.AccountError as e:
        sys.exit(e.message)


if __name__ == "__main__":
    main(sys.argv[1:])
