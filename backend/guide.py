"""ProjectHub guide: a project every new account gets.

Each page is plain Markdown. The content goes into the database (Documentation
tab) and as .md files into data/guide/<account>/ (Files tab), so you can copy,
edit or download it from disk.
"""

PROJECT_NAME = "ProjectHub Guide"
DESCRIPTION = ("A Markdown manual for the whole app: every feature, how to use it "
               "and ready-made examples to copy. You can always come back here.")
CATEGORY = "ProjectHub"
TECH = ["Markdown"]
TAGS = ["guide", "manual"]

NOTES = """# My notes

You can write your own notes about the project here. It's plain Markdown and it saves itself.

> [!TIP]
> You'll find the Markdown syntax in the **Documentation** tab, on the “Markdown: cheat sheet” page.

- [ ] What am I doing today?
- [ ] What's blocking me?
"""

COMMANDS = [
    {"id": "przyklad", "label": "Python version", "cmd": "python --version"},
]

TASKS = [
    ("g1", "Read the “Start” page in the documentation", "todo"),
    ("g2", "Add your first project (the “Add project” button)", "todo"),
    ("g3", "Scan your Desktop and import the folders you pick", "todo"),
    ("g4", "Paste a screenshot into the project gallery (Ctrl+V)", "todo"),
    ("g5", "Add your own run command", "todo"),
    ("g6", "Make your first backup", "todo"),
    ("g7", "Open the command palette (Ctrl+K)", "todo"),
]

PAGES = [
    ("start", "Start", """# Start

**ProjectHub** is a catalog of your projects. It keeps descriptions, notes, documentation, tasks,
images, run commands, a live page preview and backups in one place. You can use it on your own
computer (desktop app) or on a server, where everyone has their own account.

## Getting started

1. Click **Add project** (at the top), type a name and drop in a folder, files or a ZIP (the files go into ProjectHub). On the desktop app you can point it to a folder path instead.
2. On the desktop app you can also click **Scan**, pick a folder, such as your Desktop, and tick the subfolders that are projects.
3. Click a project tile to open its full page.
4. Add images, tasks, notes and commands.
5. Every now and then, click **Backup**.

> [!NOTE]
> This project is a guide. It was created along with your account and you can edit it however you like.
> The original pages also live as files in the **Files** tab.

## Where everything is

| Place | What it's for |
|---|---|
| Library | tiles of all projects, filters, favorites |
| Tasks | a task board across all projects |
| Archive | projects you're not working on |
| Settings | theme and colors, how projects are added, backup, account, data |
| Preview tab | the project's page live, like Live Server |
| Ctrl+K | command palette: jump to a project, run commands, actions |

## Security in one sentence

The app never moves or deletes your files on its own, and it only runs commands you saved yourself.
"""),

    ("projekty", "Projects", """# Projects

## Adding

The **Add project** button opens a form. Fields:

| Field | What to type | Example |
|---|---|---|
| Name | a short name | `Discord bot` |
| Path | the full path to the folder | `D:\\Projects\\bot` |
| Status | the stage of work | Idea, In progress, Paused, Done |
| Commands | run buttons | see the “Commands” page |
| Description | one or two sentences | `A moderation bot for a friends' server` |
| Category | a tab in the library | `Bots and scripts` |
| Technologies | type and press Enter | `Python`, `FastAPI` |
| Tags | your own keywords | `hobby`, `for-later` |

> [!TIP]
> You can copy the path in File Explorer: select the folder and press **Ctrl + Shift + C**. I strip the quotes myself.

## Favorites, status, archive

- **The star** on a tile pins the project to the top of the library.
- **Status** can be changed on the project page in the panel on the right. In the library you can filter by status.
- **Archive** (the “More” menu on the project page) hides the project from the main list. Nothing is lost — you can restore it at any time.

## Ordering

Drag a tile to a new spot while sorting is set to “Custom order”.

## Deleting

> [!WARNING]
> “Remove from catalog” only deletes the entry in the ProjectHub database. **The files in the project folder are left untouched.**

## Search

The `/` key moves the cursor to the search box. I search in the name, description, technologies and tags.
"""),

    ("polecenia", "Run commands", """# Run commands

Every project can have **several** of its own commands. Each one is a separate button,
for example “Server”, “Tests”, “Build”. The first one sits on the big **Run** button,
the rest are in the dropdown menu next to it.

## How to write them

Type the command exactly as you would in a terminal. It runs in the project folder.

~~~bash
python main.py
~~~

Chain several steps on one line with `&&`:

~~~bash
npm install && npm run dev
~~~

## Examples

| Name | Command |
|---|---|
| Server (FastAPI) | `uvicorn main:app --reload` |
| Python script | `python main.py` |
| Tests | `pytest -q` |
| Node website | `npm run dev` |
| Virtual environment (Windows) | `.venv\\Scripts\\python main.py` |
| Open in VS Code | `code .` |
| Docker | `docker compose up` |

## Where commands run

On Windows a new console window opens and stays after the command finishes, so you'll see the output.
On other systems the command runs in the background.

> [!IMPORTANT]
> The server only executes **commands saved in the database** on the project. It doesn't accept commands “from outside”.
> Only enter things you trust, because a command runs with the same permissions as you.

## Copying

On the project page, in the “Commands” tab, the copy icon puts a command on the clipboard.
"""),

    ("zadania", "Tasks", """# Tasks

Every project has its own task list, and the **Tasks** tab at the top shows all of them together as a board.

## States

| State | Meaning |
|---|---|
| To do | waiting |
| In progress | you're working on it right now (flag icon) |
| Done | checked off |

## In a project

- Type the text and press **Enter**.
- Click the square to mark it as done.
- Click the flag icon to mark it as “in progress”.
- Double-click the text to rename it.

## The board across all projects

- Drag cards between columns.
- Or use the arrows on a card (they work from the keyboard too).
- The “Project” filter narrows the board down to a single project.
- At the top of the form, pick a project and add a task without opening it.
- The project name on a card opens its page.

> [!TIP]
> The number next to “Tasks” in the menu is all the tasks that aren't done yet.
"""),

    ("markdown", "Markdown: cheat sheet", """# Markdown: cheat sheet

You write notes and documentation in Markdown. The editor has **Edit**, **Split** (text and preview side by side) and **Preview** modes.
Saving is automatic. Below is everything ProjectHub supports, with ready-made examples.

## Headings

~~~markdown
# Page title
## Section
### Subsection
~~~

`##` and `###` headings build the **table of contents** on the right side of the documentation.

## Text

~~~markdown
**bold**, *italic*, ~~strikethrough~~ and `inline code`
~~~

The result: **bold**, *italic*, ~~strikethrough~~ and `inline code`.

## Lists

~~~markdown
- first bullet
- second bullet
  - nested (two spaces of indentation)

1. first step
2. second step
~~~

## Tasks with checkboxes

~~~markdown
- [ ] to do
- [x] done
~~~

## Links

~~~markdown
[Python's website](https://www.python.org)
~~~

> [!NOTE]
> Only `https://`, `http://` and `mailto:` addresses are supported. Other links will show up as plain text.

## Quotes

~~~markdown
> This is a quote.
~~~

## Callout boxes

A quote with a marker at the start turns into a colored box:

~~~markdown
> [!NOTE]
> An ordinary note.

> [!TIP]
> A tip.

> [!WARNING]
> A warning.

> [!IMPORTANT]
> The most important thing.
~~~

## Tables

~~~markdown
| Column | Description |
|---|---|
| a | first row |
| b | second row |
~~~

## Code blocks

Three backticks or three tildes, followed by the language name:

~~~markdown
```python
def hello():
    print("Hello")
```
~~~

Syntax highlighting works for: `python`, `javascript`, `typescript`, `bash`, `powershell`, `json`, `css`, `html`.
Every block has a **Copy** button.

## Horizontal rule

~~~markdown
---
~~~

## Editor shortcuts

| Shortcut | Effect |
|---|---|
| Ctrl+B | bold |
| Ctrl+I | italic |
| buttons above the field | heading, code, list, task, quote, link |
"""),

    ("dokumentacja", "Project documentation", """# Project documentation

The **Documentation** tab is a built-in, pretty wiki for every project. You don't need GitHub:
the pages live in ProjectHub and are saved with the project.

## How it works

- Left column: the list of pages.
- Middle: the content in Markdown.
- Right column: a table of contents with the section you're in highlighted.
- At the bottom: “Previous” and “Next” buttons.

## Buttons above the page

| Button | What it does |
|---|---|
| Edit | switches to the Markdown editor |
| Rename | changes the page title |
| Copy | copies the whole page as Markdown |
| Trash | deletes the page |

## A good page skeleton

~~~markdown
# Page name

One sentence about what the page covers.

## Requirements
## Installation
## Usage
## Common issues
~~~

> [!TIP]
> An empty project has a “Insert README template” button that creates this skeleton for you.

## Downloading documentation

- The **Copy** button puts the page on the clipboard, ready to paste anywhere.
- The guide's pages also live as `.md` files in the **Files** tab, so you can open them in any editor.
- In Settings, in the Data section, there's a **JSON export** of all projects together with their documentation.
"""),

    ("zdjecia", "Images and banner", """# Images and banner

The big banner at the top of the project page comes from the **first image** in the gallery.
Without images I show the project's initials in the category's color.

## Adding images

- **Paste** a screenshot with `Ctrl+V` (on the project page).
- **Drag** files from File Explorer onto the project page.
- Or click “Add” in the gallery and pick the files.

Supported formats: PNG, JPG, WebP, GIF. Up to 8 MB per file.

> [!TIP]
> Windows: `Win + Shift + S` grabs a screenshot of part of the screen to the clipboard. Then just `Ctrl+V` in ProjectHub.

## Managing

| Action | How |
|---|---|
| Zoom in | click the image (arrows or the ← → keys switch between them) |
| New banner | hover over the thumbnail and click “Set banner” |
| Delete | the cross in the corner of the thumbnail |

## Where they're stored

Images are copied into ProjectHub's data folder (`data/uploads`). I don't touch or change
the original files. Deleting an image from the gallery only removes that copy.
"""),

    ("pliki", "File browser", """# File browser

The **Files** tab lets you look into the project folder without leaving the app.

- Click a folder to go into it. “Up” goes back a level, and the breadcrumbs at the top let you jump to any level.
- Click a file to see a preview:
  - text and code with syntax highlighting,
  - `.md` files as nice documentation (with a “Code” toggle),
  - images,
  - other files: a notice that there's no preview.
- **Open in Explorer** opens this folder in the system (desktop app only).

> [!NOTE]
> For a project pointed to by a **path**, the browser only **reads**: it doesn't change or delete files.
> For a project **uploaded into ProjectHub** you can edit files, add them, rename and delete them (described in “Adding projects”).
> In both cases you can't leave the project folder.
> Text files are shown up to about 200 KB.
"""),

    ("paleta", "Command palette and shortcuts", """# Command palette and shortcuts

Press **Ctrl+K** (Cmd+K on a Mac) anywhere in the app.

## What you'll find

| Group | Examples |
|---|---|
| Actions | add a project, scan a folder, make a backup, sizes, move the menu |
| Go to | Library, Tasks, Archive, Settings |
| Projects | jump to any project |
| Run | every saved command of every project |
| Documentation | the documentation page of any project |

## Using it

- Type and the list narrows as you go. You can type a few words.
- `↑` `↓` change the selection, `Home` and `End` jump to the start and end.
- `Enter` runs it, `Esc` closes it.

## Other shortcuts

| Shortcut | Effect |
|---|---|
| `/` | search for a project |
| Ctrl+V | paste an image on the project page |
| Ctrl+B, Ctrl+I | bold, italic in the editor |
| Esc | close the window |
"""),

    ("skanowanie", "Scanning a folder", """# Scanning a folder

Got a mess on your Desktop? The **Scan** button helps you turn it into a catalog.

1. Type the folder path, for example `C:\\Users\\You\\Desktop`.
2. You'll see the subfolders along with the detected technologies and file counts.
3. Tick the ones that are projects (new ones are ticked for you).
4. Pick a category and click **Import selected**.

## How I detect technologies

| File found | Technology |
|---|---|
| `package.json` | Node.js |
| `requirements.txt`, `pyproject.toml`, `.py` files | Python |
| `index.html` | HTML |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pom.xml` | Java |
| `*.csproj`, `*.sln` | C# |
| `composer.json` | PHP |
| `Dockerfile` | Docker |

> [!IMPORTANT]
> Scanning **doesn't move, rename or delete anything**. I only save the paths of the folders you selected.
> Organizing the files stays in your hands.
"""),

    ("wgrywanie", "Adding projects: path, copy, move", """# Adding projects

A project can hold its files in two ways.

| Way | Where the files are | When |
|---|---|---|
| **In ProjectHub** | in the app's data folder, you edit them in the Files tab | server mode and when you want everything in one place |
| **Path on disk** | they stay where they are; ProjectHub only reads them | desktop app only |

## Uploading

In the **Add project** window, drop a folder, file or ZIP onto the framed field (or use the buttons).
I skip `node_modules`, `.git`, `.venv` and `__pycache__`. The limits are shown below the field.
Uploading a ZIP made by ProjectHub also restores the description, notes, tasks and documentation.

## The “Adding projects from disk” setting (desktop app)

In **Settings → Appearance and navigation** you choose what happens when you point to a folder:

- **Path only**: I remember the folder's address, the files stay put. Changes show up immediately.
- **Copy**: I copy the files into ProjectHub, the original is left untouched.
- **Move**: I copy, and after a successful copy I remove from the original folder only the files that were copied.
  I always ask for confirmation, and skipped folders (like `node_modules`) are left behind.

> [!WARNING]
> “Move” deletes files in their original location. If that's the only copy, make a backup first.

If you paste the path to a single file (like `index.html`), I'll copy only that one file, not the whole folder next to it.

## Editing files in ProjectHub

In the **Files** tab of a ProjectHub project you can: add a new file, edit text (Ctrl+S saves),
rename, delete a file, upload more files and download the whole project as a ZIP.
"""),

    ("podglad", "Live page preview", """# Live page preview

The **Preview** tab works like the Live Server extension in Visual Studio Code.

1. Open a project that has `.html` files (ideally `index.html`).
2. Go to the **Preview** tab. The page shows up in a frame.
3. Change something in a file (in the Files tab or in your own editor, if the project is pointed to by a path):
   the preview refreshes itself after about a second.

## Options

- **File list**: pick a different HTML page from the project.
- **Full / Tablet / Phone**: check how the page looks at different widths.
- **Live refresh**: turn it off if you don't want automatic reloads.
- **New tab**: the same page in a separate browser tab.

## Security

The page runs in an isolated frame (sandbox): its scripts can't reach your account or ProjectHub's API.
The preview address expires after a few hours, so it can't be used as a permanent link.
Relative paths (`css/style.css`, `img/logo.png`) work just like on an ordinary server.

> [!NOTE]
> This is a preview for working, not hosting. To publish a page for others, upload the files to real hosting.
"""),

    ("motywy", "Themes and looks", """# Themes and looks

**Settings → Appearance and navigation → Site theme** changes the colors of the whole app:

| Theme | Character |
|---|---|
| Night | dark purple (default) |
| Graphite | neutral gray |
| Ocean | navy and blue |
| Forest | dark green |
| Dusk | dark plum |
| Light | light mode |
| Paper | warm, creamy light mode |
| Follow system | switches together with the device's setting |

You can also pick an **accent color** (buttons and selections), including a custom one from the color picker.
For every project you can set an **icon (emoji) and color** in the edit window, and then the folder and tab take on that color.

The look is remembered in the browser (on this device).
"""),

    ("konta", "Accounts and hosting", """# Accounts and hosting

## Accounts

Every account has its own projects, files, documentation and backups. Nobody sees anyone else's data.
In **Settings → Account** you can change your password, see how much space you use, or delete the account
(along with its projects and uploaded files, after confirming with your password).

## Two ways to run

| | Desktop app | Server (hosting) |
|---|---|---|
| Who uses it | you | many people, each on their own account |
| Folder paths, scanning, running commands | yes | no (blocked for security) |
| Uploading files, editing, preview, ZIP backup | yes | yes |
| Storage limit per account | optional | 500 MB by default |

## Your own server

Easiest through Docker: `docker compose up -d`, then open the server address.
The environment variables (`PROJECTHUB_REGISTRATION=closed`, `PROJECTHUB_QUOTA_MB`, `PROJECTHUB_ALLOWED_HOSTS`)
are described in the README. For public access use HTTPS (there's a ready Caddyfile in the repository).

> [!IMPORTANT]
> On a server, always enable HTTPS and consider closing registration if it's meant to be a private instance.
"""),

    ("backup", "Backup", """# Backup

A backup is a ZIP file with **the project's files and all of its documentation**: description, notes, tasks, documentation pages,
commands and images.

## What's inside

~~~text
my-project-2026-11-07.zip
  index.html, src/, ...            ← project files
  PROJECTHUB-INFO/
    projekt.json                   ← everything needed to restore the project
    README.md                      ← description, notes and tasks to read
    dokumentacja/01-start.md ...   ← documentation pages as Markdown
    zdjecia/                       ← the gallery
~~~

If you upload such a ZIP into a new project (with restore checked), you get the project back together with its descriptions.

## How to do it

- **Desktop app**: type the destination folder, for example `E:\\Backups`, tick the projects and click **Save to folder**.
  Each project goes into its own file with the date in the name. You can also click **Download ZIP**.
- **Server**: click **Download ZIP**. One project is one file, several projects are one archive.
- A single project can also be downloaded from the “⋯” menu → **Download ZIP**.

If such a file already exists, I add a number at the end, so nothing gets overwritten.

## What I skip

By default I don't pack heavy folders that can be regenerated:
`node_modules`, `.venv`, `__pycache__`. You can change the list in Settings.
That usually shrinks the archive many times over.

## Reminders

- The tile shows when the last backup was: green when fresh, yellow after the set number of days (14 by default), red when never.
- After how many days the color turns yellow is set in Settings.
- The “no backup” button in the library filters projects that were never backed up.

> [!TIP]
> The good 3-2-1 rule: three copies, on two different kinds of media, one kept outside your home.
"""),

    ("ustawienia", "Settings", """# Settings

Changes are saved immediately.

## Appearance and navigation

- **Navigation position:** at the top or on the side.
- **Accent color:** amber, mint, rose, sky, violet.
- **Tile size:** small, medium, large.

## Animations

- **Full, Limited, Disabled.** I also respect the system's “reduce motion” setting.
- **Tile tilting** following the cursor.

## Library

Default sorting, favorites on top, size on the tile, the default tab on the project page,
confirming before deleting.

## Backup

Default destination folder, skipped folders and the number of days before a reminder.

## Security

Automatic logout after being idle (in minutes).

## Data

- **JSON export** of all projects (descriptions, notes, documentation, tasks).
- **JSON import** (projects with the same id will be updated).
- **Recalculate** folder sizes.

> [!NOTE]
> Appearance preferences are remembered in the browser. Projects and documentation live in the database on disk.
"""),

    ("bezpieczenstwo", "Security and data", """# Security and data

## What lives where

| What | Where |
|---|---|
| Database (account, projects, notes) | `data/projecthub.db` |
| Images from the gallery | `data/uploads/` |
| Files of projects uploaded to ProjectHub | `data/workspaces/<account>/<project>/` |

## The rules

- The desktop app listens **only** on `127.0.0.1`. Server mode listens on the network, but disables features that touch the server's disk (paths, running commands).
- The password is stored as a **hash** (scrypt with a unique salt). Nobody, including me, can read it.
- A session is a random token in an `HttpOnly` cookie, and writes are protected by a CSRF token.
- After several failed logins the server briefly blocks further attempts.
- Only commands saved in the database are ever run.
- The file browser won't leave the project folder, and ZIP unpacking is protected against path escapes (zip-slip) and bombs.
- The page preview runs in an isolated frame with no access to your account.
- Every account sees only its own data.
- Deleting a project removes only the database entry, never the files on disk.

## Back up ProjectHub's data

Copy the whole `data/` folder. It contains everything except the projects themselves, which you back up separately with the **Backup** button.

## Forgotten password

A password can't be read back. If you lose it, stop the server, move `data/projecthub.db` somewhere safe
and start the app again: you'll get a fresh account with a new guide.
You can keep the old database later as a copy.
"""),
]
