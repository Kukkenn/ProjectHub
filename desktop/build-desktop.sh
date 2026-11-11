#!/usr/bin/env bash
# Buduje aplikację desktopową (Linux/macOS). Wymaga: Python 3.10+, Rust (rustup), na Linuksie biblioteki webkit2gtk.
set -e
cd "$(dirname "$0")"
python3 -m venv .build-venv
. .build-venv/bin/activate
pip install -r ../backend/requirements.txt pyinstaller
rm -rf src-tauri/resources && mkdir -p src-tauri/resources
(cd ../backend && pyinstaller --noconfirm --onefile --name projecthub-server \
  --collect-submodules uvicorn --collect-submodules starlette --collect-submodules multipart \
  --hidden-import main --distpath ../desktop/src-tauri/resources --workpath ../desktop/.pyi-work --specpath ../desktop/.pyi-work run.py)
cp -r ../static src-tauri/resources/static
[ -f app-icon.png ] || python3 make-icon.py
cargo install tauri-cli --version "^2" --locked || true
(cd src-tauri && cargo tauri icon ../app-icon.png && cargo tauri build)
echo "Gotowe: instalator jest w desktop/src-tauri/target/release/bundle/"
