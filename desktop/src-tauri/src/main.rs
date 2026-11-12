// ProjectHub window: runs the server (packaged Python) in the background on 127.0.0.1 and shows it in a window.
// User data lives in the app's data folder (e.g. %APPDATA%\pl.projecthub.desktop\data).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, RunEvent};

struct Server(Mutex<Option<Child>>);

fn pick_port() -> u16 {
    // A fixed port keeps the site's settings (localStorage depends on the address); when it's taken, fall back to a free one.
    for p in [8765u16, 0] {
        if let Ok(l) = TcpListener::bind(("127.0.0.1", p)) {
            return l.local_addr().unwrap().port();
        }
    }
    8765
}

fn healthy(port: u16) -> bool {
    let Ok(mut s) = TcpStream::connect_timeout(&([127, 0, 0, 1], port).into(), Duration::from_millis(300)) else { return false };
    let _ = s.set_read_timeout(Some(Duration::from_millis(800)));
    let _ = s.write_all(format!("GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n").as_bytes());
    let mut buf = String::new();
    let _ = s.read_to_string(&mut buf);
    buf.starts_with("HTTP/1.1 200")
}

fn main() {
    let app = tauri::Builder::default()
        .manage(Server(Mutex::new(None)))
        .setup(|app| {
            let res = app.path().resource_dir()?.join("resources");
            let data = app.path().app_data_dir()?.join("data");
            std::fs::create_dir_all(&data)?;
            let exe = res.join(if cfg!(windows) { "projecthub-server.exe" } else { "projecthub-server" });
            let port = pick_port();

            let mut cmd = Command::new(&exe);
            cmd.env("PROJECTHUB_MODE", "local")
                .env("PROJECTHUB_PORT", port.to_string())
                .env("PROJECTHUB_DATA", &data)
                .env("PROJECTHUB_STATIC", res.join("static"))
                .env("PROJECTHUB_NO_BROWSER", "1")
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null());
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x0800_0000); // no console window
            }
            let child = cmd.spawn().map_err(|e| format!("Failed to start the server ({}): {e}", exe.display()))?;
            *app.state::<Server>().0.lock().unwrap() = Some(child);

            let win = app.get_webview_window("main").unwrap();
            std::thread::spawn(move || {
                let t = Instant::now();
                while t.elapsed() < Duration::from_secs(40) {
                    if healthy(port) {
                        let _ = win.eval(&format!("location.replace('http://127.0.0.1:{port}/')"));
                        return;
                    }
                    std::thread::sleep(Duration::from_millis(250));
                }
                let _ = win.eval("document.getElementById('m').textContent='The ProjectHub server didn't start. Close the app and try again.'");
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error starting ProjectHub");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            if let Some(mut c) = handle.state::<Server>().0.lock().unwrap().take() {
                let _ = c.kill();
                let _ = c.wait();
            }
        }
    });
}
