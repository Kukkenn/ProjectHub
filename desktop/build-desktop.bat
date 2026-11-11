@echo off
REM Buduje aplikacje desktopowa na Windows. Wymaga: Python 3.10+, Rust (https://rustup.rs) i "Build Tools for Visual Studio" (C++).
cd /d "%~dp0"
python -m venv .build-venv || goto :err
call .build-venv\Scripts\activate.bat
pip install -r ..\backend\requirements.txt pyinstaller || goto :err
if exist src-tauri\resources rmdir /s /q src-tauri\resources
mkdir src-tauri\resources
pushd ..\backend
pyinstaller --noconfirm --onefile --name projecthub-server --collect-submodules uvicorn --collect-submodules starlette --collect-submodules multipart --hidden-import main --distpath ..\desktop\src-tauri\resources --workpath ..\desktop\.pyi-work --specpath ..\desktop\.pyi-work run.py || goto :err
popd
xcopy /e /i /y ..\static src-tauri\resources\static >nul
if not exist app-icon.png python make-icon.py
cargo install tauri-cli --version "^2" --locked
pushd src-tauri
cargo tauri icon ..\app-icon.png || goto :err
cargo tauri build || goto :err
popd
echo Gotowe: instalator jest w desktop\src-tauri\target\release\bundle\
pause
exit /b 0
:err
echo Cos poszlo nie tak, patrz komunikaty powyzej.
pause
exit /b 1
