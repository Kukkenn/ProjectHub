#!/usr/bin/env bash
# Builds the desktop app (Linux/macOS). Requires: Python 3.10+, Rust (rustup), and on Linux the webkit2gtk libraries.
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
echo "Done: the installer is in desktop/src-tauri/target/release/bundle/"
