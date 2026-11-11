"""Przewodnik po ProjectHub: projekt, który dostaje każde nowe konto.

Każda strona to zwykły Markdown. Treść trafia do bazy (zakładka Dokumentacja)
i jako pliki .md do folderu data/guide/<konto>/ (zakładka Pliki), więc można ją
kopiować, edytować albo pobrać z dysku.
"""

PROJECT_NAME = "Przewodnik ProjectHub"
DESCRIPTION = ("Instrukcja całej aplikacji w Markdownie: każda funkcja, jak jej używać "
               "i gotowe przykłady do skopiowania. Zawsze możesz tu wrócić.")
CATEGORY = "ProjectHub"
TECH = ["Markdown"]
TAGS = ["przewodnik", "instrukcja"]

NOTES = """# Moje notatki

Tu możesz pisać własne notatki do projektu. To zwykły Markdown, a zapis dzieje się sam.

> [!TIP]
> Składnię Markdown znajdziesz w zakładce **Dokumentacja**, na stronie „Markdown: ściągawka”.

- [ ] Co dziś robię?
- [ ] Co mnie blokuje?
"""

COMMANDS = [
    {"id": "przyklad", "label": "Wersja Pythona", "cmd": "python --version"},
]

TASKS = [
    ("g1", "Przeczytaj stronę „Start” w dokumentacji", "todo"),
    ("g2", "Dodaj swój pierwszy projekt (przycisk „Dodaj projekt”)", "todo"),
    ("g3", "Zeskanuj Pulpit i zaimportuj wybrane foldery", "todo"),
    ("g4", "Wklej zrzut ekranu do galerii projektu (Ctrl+V)", "todo"),
    ("g5", "Dodaj własne polecenie uruchomienia", "todo"),
    ("g6", "Zrób pierwszy backup", "todo"),
    ("g7", "Otwórz paletę poleceń (Ctrl+K)", "todo"),
]

PAGES = [
    ("start", "Start", """# Start

**ProjectHub** to katalog Twoich projektów. Zbiera w jednym miejscu opis, notatki,
dokumentację, zadania, zdjęcia, polecenia uruchomienia, podgląd strony na żywo i backupy.
Możesz używać go na swoim komputerze (aplikacja desktopowa) albo na serwerze, gdzie każdy ma własne konto.

## Pierwsze kroki

1. Kliknij **Dodaj projekt** (u góry), wpisz nazwę i przeciągnij folder, pliki albo ZIP (pliki trafią do ProjectHub). Na komputerze możesz zamiast tego wskazać ścieżkę do folderu.
2. Na komputerze możesz też kliknąć **Skanuj**, wskazać folder, na przykład Pulpit, i zaznaczyć podfoldery, które są projektami.
3. Kliknij kafelek projektu, żeby otworzyć jego pełną stronę.
4. Dodaj zdjęcia, zadania, notatki i polecenia.
5. Raz na jakiś czas kliknij **Backup**.

> [!NOTE]
> Ten projekt jest przewodnikiem. Został utworzony razem z kontem i możesz go dowolnie edytować.
> Oryginalne strony leżą też jako pliki w zakładce **Pliki**.

## Co gdzie jest

| Miejsce | Do czego służy |
|---|---|
| Biblioteka | kafelki wszystkich projektów, filtry, ulubione |
| Zadania | tablica zadań ze wszystkich projektów |
| Archiwum | projekty, których nie rozwijasz |
| Ustawienia | motyw i kolory, sposób dodawania projektów, backup, konto, dane |
| Zakładka Podgląd | strona projektu na żywo, jak Live Server |
| Ctrl+K | paleta poleceń: skok do projektu, uruchomienie, akcje |

## Zasady bezpieczeństwa w jednym zdaniu

Aplikacja nigdy sama nie przenosi ani nie usuwa Twoich plików, a uruchamia wyłącznie polecenia, które sam zapisałeś.
"""),

    ("projekty", "Projekty", """# Projekty

## Dodawanie

Przycisk **Dodaj projekt** otwiera formularz. Pola:

| Pole | Co wpisać | Przykład |
|---|---|---|
| Nazwa | krótka nazwa | `Bot do Discorda` |
| Ścieżka | pełna ścieżka do folderu | `D:\\Projekty\\bot` |
| Status | etap prac | Pomysł, W toku, Wstrzymany, Skończony |
| Polecenia | przyciski uruchomienia | patrz strona „Polecenia” |
| Opis | jedno-dwa zdania | `Bot moderujący serwer znajomych` |
| Kategoria | zakładka w bibliotece | `Boty i skrypty` |
| Technologie | wpisz i Enter | `Python`, `FastAPI` |
| Tagi | własne słowa kluczowe | `hobby`, `na-pozniej` |

> [!TIP]
> Ścieżkę skopiujesz w Eksploratorze: zaznacz folder i naciśnij **Ctrl + Shift + C**. Cudzysłowy usuwam sam.

## Ulubione, status, archiwum

- **Gwiazdka** na kafelku przypina projekt na górze biblioteki.
- **Status** zmienisz na stronie projektu w panelu po prawej. W bibliotece możesz filtrować po statusie.
- **Archiwum** (menu „Więcej” na stronie projektu) chowa projekt z głównej listy. Nic nie przepada, w każdej chwili możesz go przywrócić.

## Kolejność

Przeciągnij kafelek w nowe miejsce, gdy sortowanie ustawione jest na „Własna kolejność”.

## Usuwanie

> [!WARNING]
> „Usuń z katalogu” kasuje tylko wpis w bazie ProjectHub. **Pliki w folderze projektu zostają nietknięte.**

## Wyszukiwanie

Klawisz `/` przenosi kursor do wyszukiwarki. Szukam w nazwie, opisie, technologiach i tagach.
"""),

    ("polecenia", "Polecenia uruchomienia", """# Polecenia uruchomienia

Każdy projekt może mieć **kilka** własnych poleceń. Każde to osobny przycisk,
na przykład „Serwer”, „Testy”, „Build”. Pierwsze jest na dużym przycisku **Uruchom**,
pozostałe w rozwijanym menu obok.

## Jak je pisać

Polecenie wpisujesz dokładnie tak, jak w terminalu. Uruchamia się w folderze projektu.

~~~bash
python main.py
~~~

Kilka kroków w jednej linii łącz przez `&&`:

~~~bash
npm install && npm run dev
~~~

## Przykłady

| Nazwa | Polecenie |
|---|---|
| Serwer (FastAPI) | `uvicorn main:app --reload` |
| Skrypt Pythona | `python main.py` |
| Testy | `pytest -q` |
| Strona w Node | `npm run dev` |
| Środowisko wirtualne (Windows) | `.venv\\Scripts\\python main.py` |
| Otwórz w VS Code | `code .` |
| Docker | `docker compose up` |

## Gdzie uruchamiają się polecenia

Na Windowsie otwiera się nowe okno konsoli, które zostaje po zakończeniu, więc zobaczysz wynik.
Na innych systemach polecenie działa w tle.

> [!IMPORTANT]
> Serwer wykonuje **tylko polecenia zapisane w bazie** przy projekcie. Nie przyjmuje poleceń „z zewnątrz”.
> Wpisuj tylko to, czemu ufasz, bo polecenie ma takie same uprawnienia jak Ty.

## Kopiowanie

Na stronie projektu, w karcie „Polecenia”, ikona kopiowania wkłada polecenie do schowka.
"""),

    ("zadania", "Zadania", """# Zadania

Każdy projekt ma własną listę zadań, a zakładka **Zadania** na górze pokazuje wszystkie naraz jako tablicę.

## Stany

| Stan | Znaczenie |
|---|---|
| Do zrobienia | czeka |
| W toku | właśnie to robisz (ikona flagi) |
| Zrobione | zaznaczone ptaszkiem |

## W projekcie

- Wpisz treść i naciśnij **Enter**.
- Kliknij kwadrat, żeby oznaczyć jako zrobione.
- Kliknij ikonę flagi, żeby oznaczyć jako „w toku”.
- Dwukrotne kliknięcie tekstu zmienia nazwę.

## Tablica ze wszystkich projektów

- Przeciągaj karty między kolumnami.
- Albo użyj strzałek na karcie (działają też z klawiatury).
- Filtr „Projekt” zawęża tablicę do jednego projektu.
- Na górze formularza wybierz projekt i dodaj zadanie bez wchodzenia do niego.
- Nazwa projektu na karcie otwiera jego stronę.

> [!TIP]
> Liczba przy „Zadania” w menu to wszystkie zadania, które nie są jeszcze zrobione.
"""),

    ("markdown", "Markdown: ściągawka", """# Markdown: ściągawka

Notatki i dokumentacja piszesz w Markdownie. W edytorze masz tryby **Edycja**, **Podział** (tekst i podgląd obok siebie) i **Podgląd**.
Zapisuje się samo. Poniżej wszystko, co obsługuje ProjectHub, z gotowymi przykładami.

## Nagłówki

~~~markdown
# Tytuł strony
## Sekcja
### Podsekcja
~~~

Nagłówki `##` i `###` tworzą **spis treści** po prawej stronie dokumentacji.

## Tekst

~~~markdown
**pogrubienie**, *kursywa*, ~~przekreślenie~~ i `kod w tekście`
~~~

Efekt: **pogrubienie**, *kursywa*, ~~przekreślenie~~ i `kod w tekście`.

## Listy

~~~markdown
- punkt pierwszy
- punkt drugi
  - zagnieżdżony (dwie spacje wcięcia)

1. krok pierwszy
2. krok drugi
~~~

## Zadania z polami wyboru

~~~markdown
- [ ] do zrobienia
- [x] zrobione
~~~

## Linki

~~~markdown
[Strona Pythona](https://www.python.org)
~~~

> [!NOTE]
> Obsługiwane są tylko adresy `https://`, `http://` i `mailto:`. Inne linki wyświetlą się jako zwykły tekst.

## Cytaty

~~~markdown
> To jest cytat.
~~~

## Ramki z wyróżnieniem

Cytat z oznaczeniem na początku zamienia się w kolorową ramkę:

~~~markdown
> [!NOTE]
> Zwykła uwaga.

> [!TIP]
> Podpowiedź.

> [!WARNING]
> Ostrzeżenie.

> [!IMPORTANT]
> Rzecz najważniejsza.
~~~

## Tabele

~~~markdown
| Kolumna | Opis |
|---|---|
| a | pierwszy wiersz |
| b | drugi wiersz |
~~~

## Bloki kodu

Trzy odwrócone apostrofy albo trzy tyldy, a po nich nazwa języka:

~~~markdown
```python
def hello():
    print("Cześć")
```
~~~

Kolorowanie działa dla: `python`, `javascript`, `typescript`, `bash`, `powershell`, `json`, `css`, `html`.
Każdy blok ma przycisk **Kopiuj**.

## Linia pozioma

~~~markdown
---
~~~

## Skróty w edytorze

| Skrót | Efekt |
|---|---|
| Ctrl+B | pogrubienie |
| Ctrl+I | kursywa |
| przyciski nad polem | nagłówek, kod, lista, zadanie, cytat, link |
"""),

    ("dokumentacja", "Dokumentacja projektu", """# Dokumentacja projektu

Zakładka **Dokumentacja** to wbudowany, ładny wiki-podręcznik każdego projektu. Nie potrzebujesz GitHuba:
strony żyją w ProjectHub i są zapisywane razem z projektem.

## Jak to działa

- Lewa kolumna: lista stron.
- Środek: treść w Markdownie.
- Prawa kolumna: spis treści z podświetleniem sekcji, w której jesteś.
- Na dole: przyciski „Poprzednia” i „Następna”.

## Przyciski nad stroną

| Przycisk | Co robi |
|---|---|
| Edytuj | przełącza w edytor Markdown |
| Zmień nazwę | zmienia tytuł strony |
| Kopiuj | kopiuje całą stronę jako Markdown |
| Kosz | usuwa stronę |

## Dobry szkielet strony

~~~markdown
# Nazwa strony

Jedno zdanie o tym, czego dotyczy strona.

## Wymagania
## Instalacja
## Użycie
## Najczęstsze problemy
~~~

> [!TIP]
> Pusty projekt ma przycisk „Wstaw szablon README”, który tworzy taki szkielet za Ciebie.

## Pobieranie dokumentacji

- Przycisk **Kopiuj** wkłada stronę do schowka, gotową do wklejenia gdziekolwiek.
- Strony przewodnika leżą też jako pliki `.md` w zakładce **Pliki**, więc możesz je otworzyć w dowolnym edytorze.
- W Ustawieniach, w sekcji Dane, jest **eksport JSON** wszystkich projektów razem z dokumentacją.
"""),

    ("zdjecia", "Zdjęcia i baner", """# Zdjęcia i baner

Duży baner u góry strony projektu pochodzi z **pierwszego zdjęcia** w galerii.
Bez zdjęć pokazuję inicjały projektu w kolorze kategorii.

## Dodawanie zdjęć

- **Wklej** zrzut ekranu skrótem `Ctrl+V` (na stronie projektu).
- **Przeciągnij** pliki z Eksploratora na stronę projektu.
- Albo kliknij „Dodaj” w galerii i wybierz pliki.

Obsługiwane formaty: PNG, JPG, WebP, GIF. Do 8 MB na plik.

> [!TIP]
> Windows: `Win + Shift + S` robi zrzut fragmentu ekranu do schowka. Potem wystarczy `Ctrl+V` w ProjectHub.

## Zarządzanie

| Akcja | Jak |
|---|---|
| Powiększ | kliknij zdjęcie (strzałki lub klawisze ← → przełączają) |
| Nowy baner | najedź na miniaturę i kliknij „Ustaw baner” |
| Usuń | krzyżyk w rogu miniatury |

## Gdzie są zapisane

Zdjęcia kopiowane są do folderu danych ProjectHub (`data/uploads`). Nie ruszam ani nie zmieniam
oryginalnych plików. Usunięcie zdjęcia z galerii usuwa tylko tę kopię.
"""),

    ("pliki", "Przeglądarka plików", """# Przeglądarka plików

Zakładka **Pliki** pozwala zajrzeć do folderu projektu bez wychodzenia z aplikacji.

- Kliknij folder, żeby wejść. „Wyżej” cofa o poziom, a okruszki u góry pozwalają skoczyć do dowolnego poziomu.
- Kliknij plik, żeby zobaczyć podgląd:
  - tekst i kod z kolorowaniem składni,
  - pliki `.md` jako ładna dokumentacja (z przełącznikiem „Kod”),
  - obrazy,
  - inne pliki: informacja, że podglądu nie ma.
- **Otwórz w Eksploratorze** otwiera ten folder w systemie (tylko aplikacja na komputerze).

> [!NOTE]
> Dla projektu wskazanego **ścieżką** przeglądarka tylko **czyta**: nie zmienia ani nie usuwa plików.
> Dla projektu **wgranego do ProjectHub** możesz pliki edytować, dodawać, zmieniać nazwy i usuwać (opis w „Dodawanie projektów”).
> W obu przypadkach nie wyjdziesz poza folder projektu.
> Pliki tekstowe są pokazywane do około 200 KB.
"""),

    ("paleta", "Paleta poleceń i skróty", """# Paleta poleceń i skróty

Naciśnij **Ctrl+K** (na Macu Cmd+K) w dowolnym miejscu aplikacji.

## Co znajdziesz

| Grupa | Przykłady |
|---|---|
| Akcje | dodaj projekt, skanuj folder, zrób backup, rozmiary, przenieś menu |
| Przejdź do | Biblioteka, Zadania, Archiwum, Ustawienia |
| Projekty | skok do dowolnego projektu |
| Uruchom | każde zapisane polecenie każdego projektu |
| Dokumentacja | strona dokumentacji dowolnego projektu |

## Obsługa

- Pisz, a lista zawęża się na bieżąco. Możesz wpisać kilka słów.
- `↑` `↓` zmieniają wybór, `Home` i `End` skaczą na początek i koniec.
- `Enter` wykonuje, `Esc` zamyka.

## Inne skróty

| Skrót | Efekt |
|---|---|
| `/` | szukaj projektu |
| Ctrl+V | wklej zdjęcie na stronie projektu |
| Ctrl+B, Ctrl+I | pogrubienie, kursywa w edytorze |
| Esc | zamknij okno |
"""),

    ("skanowanie", "Skanowanie folderu", """# Skanowanie folderu

Masz bałagan na Pulpicie? Przycisk **Skanuj** pomaga zrobić z niego katalog.

1. Wpisz ścieżkę folderu, na przykład `C:\\Users\\Ty\\Desktop`.
2. Zobaczysz podfoldery wraz z rozpoznanymi technologiami i liczbą plików.
3. Zaznacz te, które są projektami (nowe są zaznaczone same).
4. Wybierz kategorię i kliknij **Importuj zaznaczone**.

## Jak rozpoznaję technologie

| Znaleziony plik | Technologia |
|---|---|
| `package.json` | Node.js |
| `requirements.txt`, `pyproject.toml`, pliki `.py` | Python |
| `index.html` | HTML |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pom.xml` | Java |
| `*.csproj`, `*.sln` | C# |
| `composer.json` | PHP |
| `Dockerfile` | Docker |

> [!IMPORTANT]
> Skanowanie **niczego nie przenosi, nie zmienia nazw i nie usuwa**. Zapisuję tylko ścieżki wybranych folderów.
> Porządkowanie plików zostaje w Twoich rękach.
"""),

    ("wgrywanie", "Dodawanie projektów: ścieżka, kopia, przeniesienie", """# Dodawanie projektów

Projekt może trzymać pliki na dwa sposoby.

| Sposób | Gdzie są pliki | Kiedy |
|---|---|---|
| **W ProjectHub** | w folderze danych aplikacji, edytujesz je w zakładce Pliki | tryb serwera i gdy chcesz mieć wszystko w jednym miejscu |
| **Ścieżka na dysku** | zostają tam, gdzie są; ProjectHub tylko je czyta | tylko aplikacja na Twoim komputerze |

## Wgrywanie

W oknie **Dodaj projekt** przeciągnij folder, plik albo ZIP na pole z ramką (albo użyj przycisków).
Pomijam `node_modules`, `.git`, `.venv` i `__pycache__`. Limity widać pod polem.
Wgranie ZIP-a zrobionego przez ProjectHub odtwarza też opis, notatki, zadania i dokumentację.

## Ustawienie „Dodawanie projektów z dysku” (aplikacja na komputerze)

W **Ustawieniach → Wygląd i nawigacja** wybierasz, co się dzieje po wskazaniu folderu:

- **Tylko ścieżka**: zapamiętuję adres folderu, pliki zostają. Zmiany widać od razu.
- **Kopiuj**: kopiuję pliki do ProjectHub, oryginał zostaje nietknięty.
- **Przenieś**: kopiuję, a po udanym kopiowaniu usuwam z oryginalnego folderu tylko skopiowane pliki.
  Zawsze pytam o potwierdzenie, a pominięte foldery (np. `node_modules`) zostają.

> [!WARNING]
> „Przenieś” kasuje pliki w oryginalnym miejscu. Jeśli to jedyny egzemplarz, zrób wcześniej backup.

Jeśli wkleisz ścieżkę do pojedynczego pliku (np. `index.html`), skopiuję tylko ten jeden plik, nie cały folder obok.

## Edycja plików w ProjectHub

W zakładce **Pliki** projektu w ProjectHub możesz: dodać nowy plik, edytować tekst (Ctrl+S zapisuje),
zmienić nazwę, usunąć plik, wgrać kolejne pliki i pobrać cały projekt jako ZIP.
"""),

    ("podglad", "Podgląd strony na żywo", """# Podgląd strony na żywo

Zakładka **Podgląd** działa jak rozszerzenie Live Server w Visual Studio Code.

1. Otwórz projekt, który ma pliki `.html` (najlepiej `index.html`).
2. Wejdź w zakładkę **Podgląd**. Strona pokaże się w ramce.
3. Zmień coś w pliku (w zakładce Pliki albo w swoim edytorze, jeśli projekt jest wskazany ścieżką):
   podgląd odświeży się sam po około sekundzie.

## Opcje

- **Lista plików**: wybierz inną stronę HTML z projektu.
- **Pełna / Tablet / Telefon**: sprawdź, jak strona wygląda w różnych szerokościach.
- **Odświeżaj na żywo**: wyłącz, jeśli nie chcesz automatycznego przeładowania.
- **Nowa karta**: ta sama strona w osobnej karcie przeglądarki.

## Bezpieczeństwo

Strona działa w izolowanej ramce (sandbox): jej skrypty nie mają dostępu do Twojego konta ani do API ProjectHub.
Adres podglądu wygasa po kilku godzinach, więc nie da się go używać jako trwałego linku.
Względne ścieżki (`css/style.css`, `img/logo.png`) działają tak samo jak na zwykłym serwerze.

> [!NOTE]
> To podgląd do pracy, nie hosting. Żeby opublikować stronę dla innych, wrzuć pliki na prawdziwy hosting.
"""),

    ("motywy", "Motywy i wygląd", """# Motywy i wygląd

**Ustawienia → Wygląd i nawigacja → Motyw strony** zmienia kolory całej aplikacji:

| Motyw | Charakter |
|---|---|
| Noc | ciemny fiolet (domyślny) |
| Grafit | neutralna szarość |
| Ocean | granat i błękit |
| Las | ciemna zieleń |
| Zmierzch | ciemna śliwka |
| Jasny | jasny tryb |
| Papier | ciepły, kremowy jasny tryb |
| Jak system | przełącza się razem z ustawieniem urządzenia |

Dodatkowo wybierzesz **kolor akcentu** (przyciski i zaznaczenia), także własny z palety kolorów.
Każdemu projektowi możesz nadać **ikonę (emoji) i kolor** w oknie edycji, a wtedy teczka i zakładka mają ten kolor.

Wygląd jest zapamiętywany w przeglądarce (na tym urządzeniu).
"""),

    ("konta", "Konta i hosting", """# Konta i hosting

## Konta

Każde konto ma własne projekty, pliki, dokumentację i backupy. Nikt nie widzi cudzych danych.
W **Ustawieniach → Konto** zmienisz hasło, zobaczysz zajęte miejsce albo usuniesz konto
(razem z projektami i wgranymi plikami, po potwierdzeniu hasłem).

## Dwa tryby działania

| | Aplikacja na komputerze | Serwer (hosting) |
|---|---|---|
| Kto korzysta | Ty | wiele osób, każda na swoim koncie |
| Ścieżki do folderów, skanowanie, uruchamianie poleceń | tak | nie (zablokowane ze względów bezpieczeństwa) |
| Wgrywanie plików, edycja, podgląd, backup ZIP | tak | tak |
| Limit miejsca na konto | opcjonalnie | domyślnie 500 MB |

## Własny serwer

Najprościej przez Dockera: `docker compose up -d`, potem otwórz adres serwera.
Zmienne środowiskowe (`PROJECTHUB_REGISTRATION=closed`, `PROJECTHUB_QUOTA_MB`, `PROJECTHUB_ALLOWED_HOSTS`)
opisuje plik README. Do publicznego dostępu używaj HTTPS (w repozytorium jest gotowy plik Caddyfile).

> [!IMPORTANT]
> Na serwerze zawsze włącz HTTPS i rozważ zamknięcie rejestracji, jeśli to ma być prywatna instancja.
"""),

    ("backup", "Backup", """# Backup

Backup to plik ZIP z **plikami projektu i całą dokumentacją**: opisem, notatkami, zadaniami, stronami dokumentacji,
poleceniami i zdjęciami.

## Co jest w środku

~~~text
moj-projekt-2026-11-07.zip
  index.html, src/, ...            ← pliki projektu
  PROJECTHUB-INFO/
    projekt.json                   ← wszystko do odtworzenia projektu
    README.md                      ← opis, notatki i zadania do czytania
    dokumentacja/01-start.md ...   ← strony dokumentacji jako Markdown
    zdjecia/                       ← galeria
~~~

Jeśli wgrasz taki ZIP do nowego projektu (z zaznaczonym odtworzeniem), dostaniesz projekt z powrotem razem z opisami.

## Jak zrobić

- **Aplikacja na komputerze**: wpisz folder docelowy, na przykład `E:\\Backupy`, zaznacz projekty i kliknij **Zapisz do folderu**.
  Każdy projekt trafia do osobnego pliku z datą w nazwie. Możesz też kliknąć **Pobierz ZIP**.
- **Serwer**: kliknij **Pobierz ZIP**. Jeden projekt to jeden plik, kilka projektów to jedno archiwum.
- Pojedynczy projekt pobierzesz też z menu „⋯” → **Pobierz ZIP**.

Jeśli taki plik już jest, dodam numer na końcu, więc nic się nie nadpisze.

## Co pomijam

Domyślnie nie pakuję ciężkich folderów, które da się odtworzyć:
`node_modules`, `.venv`, `__pycache__`. Listę zmienisz w Ustawieniach.
To zwykle zmniejsza archiwum wiele razy.

## Przypomnienia

- Kafelek pokazuje, kiedy był ostatni backup: zielony gdy świeży, żółty po upływie ustawionej liczby dni (domyślnie 14), czerwony gdy nigdy.
- Po ilu dniach kolor robi się żółty, ustawisz w Ustawieniach.
- Przycisk „bez backupu” w bibliotece filtruje projekty, które nigdy nie były pakowane.

> [!TIP]
> Dobra zasada 3-2-1: trzy kopie, na dwóch różnych nośnikach, jedna poza domem.
"""),

    ("ustawienia", "Ustawienia", """# Ustawienia

Zmiany zapisują się od razu.

## Wygląd i nawigacja

- **Położenie nawigacji:** na górze albo z boku.
- **Kolor akcentu:** bursztyn, mięta, róż, niebo, fiolet.
- **Rozmiar teczek:** małe, średnie, duże.

## Animacje

- **Pełne, Ograniczone, Wyłączone.** Respektuję też ustawienie systemu „ogranicz ruch”.
- **Przechylanie teczek** za kursorem.

## Biblioteka

Domyślne sortowanie, ulubione na górze, rozmiar w kafelku, domyślna zakładka na stronie projektu,
potwierdzanie przed usunięciem.

## Backup

Domyślny folder docelowy, pomijane foldery i liczba dni do przypomnienia.

## Bezpieczeństwo

Automatyczne wylogowanie po bezczynności (w minutach).

## Dane

- **Eksport JSON** wszystkich projektów (opisy, notatki, dokumentacja, zadania).
- **Import JSON** (projekty o tym samym identyfikatorze zostaną zaktualizowane).
- **Przelicz rozmiary** folderów.

> [!NOTE]
> Preferencje wyglądu są zapamiętywane w przeglądarce. Projekty i dokumentacja są w bazie na dysku.
"""),

    ("bezpieczenstwo", "Bezpieczeństwo i dane", """# Bezpieczeństwo i dane

## Co jest gdzie

| Co | Gdzie |
|---|---|
| Baza (konto, projekty, notatki) | `data/projecthub.db` |
| Zdjęcia z galerii | `data/uploads/` |
| Pliki projektów wgranych do ProjectHub | `data/workspaces/<konto>/<projekt>/` |

## Zasady

- Aplikacja na komputerze słucha **wyłącznie** na `127.0.0.1`. Tryb serwera słucha w sieci, ale wyłącza funkcje dotykające dysku serwera (ścieżki, uruchamianie poleceń).
- Hasło jest przechowywane jako **hasz** (scrypt z unikalną solą). Nikt, łącznie ze mną, go nie odczyta.
- Sesja to losowy token w ciasteczku `HttpOnly`, a zapisy są chronione tokenem CSRF.
- Po kilku błędnych logowaniach serwer na chwilę blokuje kolejne próby.
- Uruchamiane są wyłącznie polecenia zapisane w bazie.
- Przeglądarka plików nie wyjdzie poza folder projektu, a rozpakowywanie ZIP chroni przed ucieczką ze ścieżki (zip-slip) i bombami.
- Podgląd strony działa w izolowanej ramce bez dostępu do konta.
- Każde konto widzi tylko swoje dane.
- Usunięcie projektu usuwa tylko wpis w bazie, nigdy plików z dysku.

## Zrób kopię danych ProjectHub

Skopiuj cały folder `data/`. Zawiera wszystko oprócz samych projektów, które backupujesz osobno przyciskiem **Backup**.

## Zapomniane hasło

Hasła nie da się odczytać. Jeśli je zgubisz, zatrzymaj serwer, przenieś `data/projecthub.db` w bezpieczne miejsce
i uruchom aplikację ponownie: dostaniesz czyste konto z nowym przewodnikiem.
Starą bazę możesz później zachować jako kopię.
"""),
]
