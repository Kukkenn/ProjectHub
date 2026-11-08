<div align="center">

<img src="docs/screenshots/logo.png" alt="ProjectHub" width="96">

# ProjectHub

**Lokalny katalog Twoich projektów. Wszystko w jednym miejscu: teczki, zadania, notatki, dokumentacja, podgląd na żywo i backup.**

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?logo=fastapi&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?logo=javascript&logoColor=black)
![No build step](https://img.shields.io/badge/frontend-bez%20bundlera-8E9BFF)
![Language](https://img.shields.io/badge/interfejs-polski-FFB65C)

[Funkcje](#-funkcje) · [Zrzuty ekranu](#-zrzuty-ekranu) · [Szybki start](#-szybki-start) · [Tryb demo](#-tryb-demo) · [API](#-api) · [Roadmapa](#-roadmapa)

<img src="docs/screenshots/library.png" alt="Biblioteka projektów w ProjectHub" width="900">

</div>

---

## O projekcie

ProjectHub porządkuje bałagan w folderach z projektami. Każdy projekt to **teczka** z okładką, statusem, kategorią, technologiami, zadaniami, notatkami i dokumentacją. Strona projektu wygląda jak strona gry w Steamie: duży baner, galeria zrzutów ekranu i przycisk **Uruchom**.

Frontend to czysty HTML, CSS i JavaScript, bez frameworków i bez bundlera. Backend to FastAPI z bazą SQLite.

## ✨ Funkcje

### Biblioteka
- Siatka teczek z kategoriami jako zakładkami nad szufladą
- Filtry po statusie (Pomysł, W toku, Wstrzymany, Skończony), technologiach i braku backupu
- Ulubione na osobnym pasku, archiwum na projekty, których nie rozwijasz
- Własna kolejność przez przeciąganie (drag and drop) albo sortowanie po nazwie, dacie, rozmiarze i backupie
- Własna ikona (emoji) i kolor każdego projektu
- Wyszukiwarka z klawiszem `/` oraz **paleta poleceń** pod `Ctrl + K`

### Strona projektu
- Baner z paralaksą, galeria zdjęć z lightboxem, wklejanie zrzutów przez `Ctrl + V` i przeciąganie plików
- **Polecenia uruchomienia**: zapisujesz „Serwer”, „Testy”, „Build” i odpalasz jednym kliknięciem. Uruchamiają się tylko zapisane polecenia
- **Zadania** z podziałem na Do zrobienia, W toku i Zrobione
- **Notatki i dokumentacja** w Markdownie: podgląd na żywo, spis treści, podświetlanie kodu, tabele, wyróżnienia `[!NOTE]`, autozapis
- **Przeglądarka plików** z podglądem kodu, obrazów i Markdowna
- **Podgląd strony na żywo** (jak Live Server) z widokiem tablet i telefon

### Tablica zadań
- Kanban ze wszystkich projektów naraz, przeciąganie kart między kolumnami

### Pliki i backup
- Projekty **lokalne** (tylko ścieżka do folderu) albo **przechowywane w ProjectHub** (upload folderu, plików lub ZIP)
- Skanowanie folderu, na przykład Pulpitu, i masowy import projektów
- Backup do ZIP z datą w nazwie, z pominięciem `node_modules`, `.venv` i `__pycache__`
- Wewnątrz archiwum folder `PROJECTHUB-INFO` z opisem, notatkami, zadaniami i dokumentacją
- Ranking rozmiarów projektów, eksport i import całego katalogu do JSON

### Wygląd i ustawienia
- 8 motywów (Noc, Grafit, Ocean, Las, Zmierzch, Jasny, Papier, Jak system)
- Kolor akcentu, w tym własny, menu u góry albo z boku, trzy gęstości siatki
- Poziomy animacji (pełne, ograniczone, wyłączone), szacunek dla `prefers-reduced-motion`
- Ustawienia zapisują się też na koncie, więc nie giną po zmianie przeglądarki

### Bezpieczeństwo
- Konta z hasłami zapisywanymi wyłącznie jako hash
- Sesja w ciasteczku i ochrona CSRF (nagłówek `X-CSRF-Token`)
- Automatyczne wylogowanie po bezczynności
- Ścieżki w przeglądarce plików liczone względem folderu projektu, wyjście poza niego kończy się błędem
- Podgląd na żywo w odizolowanym `iframe` (sandbox)
- Usunięcie projektu z katalogu **nigdy** nie usuwa plików z dysku
- Renderer Markdowna escapuje cały tekst, więc wklejony HTML się nie wykona

## 📸 Zrzuty ekranu

| Biblioteka | Strona projektu |
|---|---|
| ![Biblioteka](docs/screenshots/library.png) | ![Projekt](docs/screenshots/project.png) |

| Tablica zadań | Dokumentacja |
|---|---|
| ![Zadania](docs/screenshots/tasks.png) | ![Dokumentacja](docs/screenshots/docs.png) |

| Paleta poleceń | Motywy i ustawienia |
|---|---|
| ![Paleta](docs/screenshots/palette.png) | ![Ustawienia](docs/screenshots/settings.png) |

## 🚀 Szybki start

> Wymagania: Python 3.11 lub nowszy.

```bash
git clone https://github.com/TWOJ-LOGIN/projecthub.git
cd projecthub

python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python main.py
```

Otwórz `http://127.0.0.1:8000` i załóż konto. Pierwsze konto dostaje projekt-przewodnik z instrukcją.

> **Uwaga:** serwer nasłuchuje wyłącznie na `127.0.0.1`. Nie zmieniaj tego na `0.0.0.0`, bo inne urządzenia w sieci mogłyby uruchamiać polecenia na Twoim komputerze.

## 🧪 Tryb demo

Frontend działa także bez serwera. Wystarczy otworzyć `index.html` prosto z dysku albo dopisać `?demo` do adresu. Dane trafiają wtedy do `localStorage`, a uruchamianie poleceń, Eksplorator, pliki i backup tylko udają działanie. To dobry sposób, żeby obejrzeć interfejs przed instalacją.

## 🗂 Struktura repozytorium

```text
projecthub/
├── main.py                 # start serwera
├── requirements.txt
├── app/                    # backend (FastAPI)
└── static/
    ├── index.html          # aplikacja
    ├── login.html          # logowanie i rejestracja
    ├── css/
    │   ├── style.css       # baza, teczki, okna, paleta
    │   ├── project.css     # strona projektu
    │   ├── views.css       # zadania, ustawienia
    │   └── themes.css      # motywy
    └── js/
        ├── api.js          # jedyne miejsce rozmowy z backendem (+ tryb demo)
        ├── lib.js          # ustawienia, ikony, okna, animacje
        ├── library.js      # biblioteka, formularz, skan, backup
        ├── project.js      # strona projektu
        ├── views.js        # zadania, archiwum, ustawienia
        ├── palette.js      # paleta poleceń
        ├── md.js           # bezpieczny renderer Markdowna
        ├── upload.js       # zbieranie plików do wgrania
        ├── app.js          # router i start
        └── demo-data.js    # dane przykładowe
```

## 🔌 API

Całe API jest pod `/api`, w JSON-ie, z ciasteczkiem sesji i nagłówkiem `X-CSRF-Token` przy zapisie. Pełna umowa z backendem jest opisana na górze pliku [`js/api.js`](static/js/api.js).

| Obszar | Przykładowe endpointy |
|---|---|
| Konto | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/status` |
| Projekty | `GET/POST /api/projects`, `PUT/DELETE /api/projects/{id}`, `PUT /api/projects/order` |
| Uruchamianie | `POST /api/projects/{id}/run`, `POST /api/projects/{id}/open` |
| Pliki | `GET /api/projects/{id}/files`, `GET/PUT/DELETE /api/projects/{id}/file` |
| Upload | `POST /api/projects/{id}/upload`, `POST /api/projects/{id}/upload-zip` |
| Podgląd | `POST /api/projects/{id}/preview`, `GET /api/projects/{id}/signature` |
| Backup i dane | `POST /api/backup`, `GET /api/backup/download`, `GET /api/export`, `POST /api/import` |

## ⌨️ Skróty klawiszowe

| Skrót | Działanie |
|---|---|
| `Ctrl + K` | paleta poleceń |
| `/` | szukaj projektu |
| `Ctrl + V` na stronie projektu | wklej zrzut ekranu do galerii |
| `←` `→` | przełączanie zdjęć w galerii |
| `Ctrl + B` / `Ctrl + I` | pogrubienie i kursywa w edytorze |
| `Ctrl + S` | zapis pliku w edytorze plików |

## 🛣 Roadmapa

- [ ] Ochrona CSRF dla każdego zapisu (checklista bezpieczeństwa)
- [ ] Integracja z Git: gałąź, ostatni commit, liczba zmian na teczce
- [ ] Przypomnienia o terminach zadań
- [ ] Automatyczny backup według harmonogramu
- [ ] Wersja angielska interfejsu
- [ ] Tagi klikalne jako filtr
- [ ] Wyszukiwanie w treści notatek i dokumentacji

## 🤝 Współpraca

Pomysły i błędy zgłaszaj w zakładce **Issues**. Pull requesty są mile widziane.

## 📄 Licencja

Dodaj plik `LICENSE` (np. MIT) i wpisz tu wybraną licencję.

---

<div align="center">
Zrobione z myślą o porządku w folderach.
</div>
