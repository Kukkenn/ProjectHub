<div align="center">

# ProjectHub

**Minimalistyczny i potężny menedżer oraz katalog projektów lokalnych i webowych**[cite: 13, 14]

[English](README.md) &nbsp;|&nbsp; [Polski](README.pl.md)

<br>

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

## 🚀 O projekcie

**ProjectHub** to aplikacja stworzona z myślą o programistach i twórcach, którzy chcą mieć uporządkowane wszystkie swoje projekty (zarówno przechowywane lokalnie na dysku, jak i bezpośrednio w przestrzeni aplikacji)[cite: 13, 14]. Aplikacja łączy w sobie nowoczesny interfejs webowy (HTML5, CSS3, czysty JavaScript) z lekkim i szybkim backendem opartym na **Pythonie (FastAPI)** oraz bazie **SQLite**[cite: 13, 14, 19].

Projekt bez problemu uruchomisz jako tradycyjną aplikację/serwer lokalny (np. za pomocą skrótu `.exe` lub skryptów startowych), dzięki czemu Twoje dane i pliki pozostają w pełni prywatne i bezpieczne na Twoim komputerze[cite: 13, 14].

---

## ✨ Najważniejsze funkcje

* **Dwa tryby przechowywania projektów:**
  * **Managed:** Pliki przesyłane bezpośrednio do ProjectHub (z pełnym menedżerem plików, edytorem kodu, obsługą ZIP i wgrywaniem folderów)[cite: 13, 14].
  * **Local:** Wskazanie istniejącego folderu na dysku komputera[cite: 13, 14].
* **Podgląd na żywo (Live Preview):** Bezpieczne uruchamianie i podgląd stron HTML/aplikacji webowych w izolowanej piaskownicy (sandbox)[cite: 13, 14].
* **Wbudowane polecenia:** Definiowanie i uruchamianie skryptów lub serwerów deweloperskich bezpośrednio z poziomu interfejsu (np. `npm run dev`, `python main.py`)[cite: 13, 14].
* **Dokumentacja i Zadania:** Wbudowane notatki, listy zadań (checklisty) oraz sekcja dokumentacji Markdown dla każdego projektu[cite: 14, 17].
* **Galeria zrzutów ekranu:** Dodawanie i szybki podgląd screenów z projektów w formie wygodnego lightboxa[cite: 14, 21].
* **Backup i eksport:** Tworzenie archiwum ZIP lub automatyczny backup wybranych projektów do wskazanego folderu (np. OneDrive / dysk zewnętrzny)[cite: 14, 17].
* **Bezpieczeństwo:** Ochrona przed CSRF, throttling prób logowania, polityka CSP oraz bezpieczna obsługa sesji.

---

## 🛠️ Tech Stack

<table align="center">
<tr>
<td align="center" width="140"><img src="https://skillicons.dev/icons?i=python&theme=dark" width="40"><br><b>Python</b><br><sub>Backend & API</sub></td>
<td align="center" width="140"><img src="https://skillicons.dev/icons?i=fastapi&theme=dark" width="40"><br><b>FastAPI</b><br><sub>Web Framework</sub></td>
<td align="center" width="140"><img src="https://skillicons.dev/icons?i=sqlite&theme=dark" width="40"><br><b>SQLite</b><br><sub>Database</sub></td>
<td align="center" width="140"><img src="https://skillicons.dev/icons?i=js&theme=dark" width="40"><br><b>JavaScript</b><br><sub>Frontend SPA</sub></td>
</tr>
<tr>
<td align="center" width="140"><img src="https://skillicons.dev/icons?i=html&theme=dark" width="40"><br><b>HTML5</b><br><sub>Structure</sub></td>
<td align="center" width="140"><img src="https://skillicons.dev/icons?i=css&theme=dark" width="40"><br><b>CSS3</b><br><sub>Styling & UI</sub></td>
<td align="center" width="140"><img src="https://skillicons.dev/icons?i=git&theme=dark" width="40"><br><b>Git</b><br><sub>Version Control</sub></td>
<td align="center" width="140"><img src="https://skillicons.dev/icons?i=windows&theme=dark" width="40"><br><b>Windows / Exe</b><br><sub>Desktop Ready</sub></td>
</tr>
</table>

---

## 📂 Struktura projektu

```text
projecthub/
├── backend/            # Logika serwera, bazy danych i bezpieczeństwa
│   ├── main.py         # Główny punkt wejścia (FastAPI)[cite: 13]
│   ├── db.py           # Konfiguracja SQLite i schemat tabel[cite: 14]
│   ├── fsutil.py       # Operacje na plikach i bezpieczeństwo ścieżek[cite: 15]
│   ├── accounts.py     # Zarządzanie kontami i użytkownikami[cite: 16]
│   └── export.py       # Obsługa backupów i archiwów ZIP[cite: 17]
├── static/             # Interfejs użytkownika (Frontend)
│   ├── css/            # Arkusze stylów (style, motywy, widoki)[cite: 21]
│   ├── js/             # Skrypty klienta (aplikacja SPA, router, API)[cite: 19, 21]
│   ├── index.html      # Główny panel aplikacji[cite: 21]
│   └── login.html      # Strona logowania / rejestracji
├── data/               # Baza danych i pliki użytkowników (lokalne)[cite: 14]
├── requirements.txt    # Zależności projektu Python
└── README.md           # Dokumentacja projektu
