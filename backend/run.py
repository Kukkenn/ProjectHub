"""Runs ProjectHub. Locally: http://127.0.0.1:8765 (this machine only). Server mode: PROJECTHUB_MODE=hosted."""
import threading
import webbrowser

import uvicorn

import config

if __name__ == "__main__":
    local_url = "http://127.0.0.1:%d/" % config.PORT
    if not config.HOSTED:
        import os
        if os.environ.get("PROJECTHUB_NO_BROWSER") != "1":
            threading.Timer(1.2, lambda: webbrowser.open(local_url)).start()
    print("ProjectHub (%s) running on http://%s:%d/  (Ctrl+C stops it)" % (config.MODE, config.HOST, config.PORT))
    import sys
    if getattr(sys, "frozen", False):          # after packaging with PyInstaller, "by name" imports don't work, it has to be hardcoded
        from main import app as target
    else:
        target = "main:app"
    uvicorn.run(target, host=config.HOST, port=config.PORT, log_level="warning",
                proxy_headers=config.TRUST_PROXY, forwarded_allow_ips="*" if config.TRUST_PROXY else "127.0.0.1")
