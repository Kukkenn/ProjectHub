/* api.js: jedyne miejsce, w którym front rozmawia z backendem.

   Dwa tryby:
   - serwer: zwykłe zapytania fetch do FastAPI (adresy poniżej),
   - podgląd (demo): działa po otwarciu index.html prosto z dysku albo z ?demo w adresie.
     Dane trafiają wtedy do localStorage, a uruchamianie, Eksplorator, backup i pliki tylko udają.

   Umowa z backendem (wszystko pod /api, JSON, ciasteczko sesji, nagłówek X-CSRF-Token przy zapisie):

   Konto
     GET    /api/auth/status             -> { configured, authenticated, username, mode: "local"|"hosted",
                                                  registration: "open"|"closed", features: {run, scan, localPaths,
                                                  openFolder, backupToPath, upload, preview}, limits, usage }
     POST   /api/auth/register           { username, password }  zakłada konto i loguje (alias: /api/auth/setup)
     POST   /api/auth/login              { username, password }
     POST   /api/auth/logout
     POST   /api/account/password        { current, new }
     DELETE /api/account                 { password }  usuwa konto z projektami przechowywanymi w ProjectHub

   Projekty
     GET    /api/projects                -> [Project]   (w kolejności użytkownika)
     POST   /api/projects                Project bez id -> Project
     PUT    /api/projects/{id}           CZĘŚCIOWY zapis: tylko przesłane pola -> Project
     PUT    /api/projects/order          { ids: [id, ...] }  zapisuje własną kolejność wszystkich projektów
     DELETE /api/projects/{id}           usuwa wpis z bazy, NIGDY plików z dysku
     POST   /api/projects/{id}/run       { commandId }  uruchamia ZAPISANE polecenie w folderze projektu -> { message }
     POST   /api/projects/{id}/open      { path? }  otwiera folder (lub podfolder) w Eksploratorze -> { message }
     POST   /api/projects/{id}/images    multipart, pole "files" -> Project
     DELETE /api/projects/{id}/images/{imageId}        -> Project
     POST   /api/projects/{id}/images/{imageId}/cover  ustawia zdjęcie jako pierwsze (baner) -> Project

   Pliki projektu (ścieżki ZAWSZE względne do folderu projektu; wyjście poza niego = 400)
     GET    /api/projects/{id}/files?path=   -> { path, entries: [{ name, type: "dir"|"file", size, modified }] }
     GET    /api/projects/{id}/file?path=    -> { name, size, kind: "text"|"image"|"binary", content?, url?, truncated? }
                                               (tekst do ok. 200 KB; obrazy jako url do endpointu serwującego)

   Projekty przechowywane w ProjectHub (storage "managed": pliki wgrane do aplikacji zamiast ścieżki na dysku)
     POST   /api/projects/{id}/upload      multipart: files[] + paths (JSON, ścieżki względne) + base? -> { project, saved, skipped }
     POST   /api/projects/{id}/upload-zip  multipart: file (ZIP) + restore? -> { project, saved, skipped }
     PUT    /api/projects/{id}/file        { path, content }  zapis pliku tekstowego
     DELETE /api/projects/{id}/file?path=  usuwa plik lub folder
     POST   /api/projects/{id}/rename      { from, to }
     POST   /api/projects/{id}/preview     { path? } -> { base, url, path, files }  adres podglądu na żywo (token w adresie)
     GET    /api/projects/{id}/signature   -> { sig }  odcisk plików, zmienia się po edycji (odświeżanie podglądu)
     GET    /api/projects/{id}/download    ZIP: pliki + PROJECTHUB-INFO (opis, notatki, dokumentacja, zadania)
     GET    /api/backup/download?ids=a,b   ZIP wielu projektów

   Rozmiary, skanowanie, backup, dane
     POST   /api/sizes                   przelicza rozmiary folderów -> { sizes: { [id]: bajty } }
     POST   /api/scan                    { path } -> { path, folders: [{ name, path, tech: [], files }] }
     POST   /api/backup                  { ids: [], destination, exclude: [] } -> { results: [{ id, ok, file, error, backedUpAt }] }
     GET    /api/export                  -> { version, projects: [Project] }
     POST   /api/import                  { projects: [Project] } -> { imported }

   Project: { id, name, path ("" dla managed), storage: "local"|"managed", icon (emoji), color (#rrggbb), description, notes (Markdown), category, tech: [], tags: [],
              status: "idea"|"active"|"paused"|"done", favorite: bool, archived: bool,
              commands: [{ id, label, cmd }],
              tasks: [{ id, text, state: "todo"|"doing"|"done" }],
              docs: [{ id, title, body (Markdown) }],
              images: [{ id, name, url }], sizeBytes, updatedAt, backedUpAt }  (daty w ISO 8601)
   Identyfikatory poleceń, zadań i stron dokumentacji nadaje front (krótkie losowe teksty).

   Błędy: status 4xx/5xx i { "detail": "komunikat po polsku" }. Status 401 odsyła do logowania. */

(function () {
  'use strict';

  try {
    if (new URLSearchParams(location.search).has('demo')) sessionStorage.setItem('ph_demo', '1');
  } catch (e) { /* brak sessionStorage, trudno */ }
  let demoFlag = false;
  try { demoFlag = sessionStorage.getItem('ph_demo') === '1'; } catch (e) { /* j.w. */ }
  const MOCK = location.protocol === 'file:' || demoFlag;

  class ApiError extends Error {
    constructor(message, status) { super(message); this.name = 'ApiError'; this.status = status; }
  }

  /* ---------- tryb serwerowy ---------- */

  function csrfToken() {
    const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function detailText(data, status) {
    const d = data && data.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map(x => x.msg || '').filter(Boolean).join(' ');
    return 'Coś poszło nie tak (kod ' + status + ').';
  }

  async function req(method, url, body, opts) {
    opts = opts || {};
    const init = { method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined && !opts.form) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    if (opts.form) init.body = body;
    if (method !== 'GET') {
      const t = csrfToken();
      if (t) init.headers['X-CSRF-Token'] = t;
    }
    let res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      throw new ApiError('Nie udało się połączyć z serwerem. Sprawdź, czy ProjectHub jest uruchomiony.', 0);
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* pusta odpowiedź */ }
    if (res.status === 401 && !opts.noRedirect) {
      location.href = 'login.html';
      throw new ApiError('Sesja wygasła. Zaloguj się ponownie.', 401);
    }
    if (!res.ok) throw new ApiError(detailText(data, res.status), res.status);
    return data;
  }

  function xhrForm(url, form, onProgress) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('POST', url);
      const t = csrfToken();
      if (t) x.setRequestHeader('X-CSRF-Token', t);
      if (x.upload && onProgress) x.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded); };
      x.onerror = () => reject(new ApiError('Nie udało się połączyć z serwerem. Sprawdź połączenie.', 0));
      x.onload = () => {
        let data = null;
        try { data = JSON.parse(x.responseText); } catch (e) { /* pusta odpowiedź */ }
        if (x.status === 401) { location.href = 'login.html'; reject(new ApiError('Sesja wygasła. Zaloguj się ponownie.', 401)); return; }
        if (x.status >= 400) reject(new ApiError(detailText(data, x.status), x.status)); else resolve(data);
      };
      x.send(form);
    });
  }

  /* Wgrywanie wielu plików partiami (do 60 plików i ok. 30 MB na zapytanie), z jednym wspólnym postępem. */
  async function uploadBatches(id, entries, opts) {
    opts = opts || {};
    const total = entries.reduce((n, e) => n + e.file.size, 0) || 1;
    let done = 0, saved = 0, skipped = 0, project = null, i = 0;
    while (i < entries.length) {
      const form = new FormData(), paths = [];
      let size = 0, n = 0;
      while (i < entries.length && n < 60 && (n === 0 || size + entries[i].file.size <= 30 * 1024 * 1024)) {
        form.append('files', entries[i].file, 'f');
        paths.push(entries[i].path);
        size += entries[i].file.size; n++; i++;
      }
      form.append('paths', JSON.stringify(paths));
      if (opts.base) form.append('base', opts.base);
      const before = done;
      const r = await xhrForm(pid(id) + '/upload', form, loaded => opts.onProgress && opts.onProgress(Math.min(1, (before + loaded) / total)));
      done += size; saved += r.saved; skipped += r.skipped; project = r.project;
      if (opts.onProgress) opts.onProgress(Math.min(1, done / total));
    }
    return { project, saved, skipped };
  }

  const q = encodeURIComponent;
  const pid = id => '/api/projects/' + q(id);

  const real = {
    authStatus: () => req('GET', '/api/auth/status', undefined, { noRedirect: true }),
    register: (username, password) => req('POST', '/api/auth/register', { username, password }, { noRedirect: true }),
    setup: (username, password) => req('POST', '/api/auth/register', { username, password }, { noRedirect: true }),
    changePassword: (current, next) => req('POST', '/api/account/password', { current, new: next }),
    deleteAccount: password => req('DELETE', '/api/account', { password }, { noRedirect: true }),
    getSettings: () => req('GET', '/api/settings'),
    saveSettings: settings => req('PUT', '/api/settings', { settings }),
    login: (username, password) => req('POST', '/api/auth/login', { username, password }, { noRedirect: true }),
    logout: () => req('POST', '/api/auth/logout', undefined, { noRedirect: true }),
    listProjects: () => req('GET', '/api/projects'),
    saveProject: p => (p.id ? req('PUT', pid(p.id), p) : req('POST', '/api/projects', p)),
    patchProject: (id, fields) => req('PUT', pid(id), fields),
    reorder: ids => req('PUT', '/api/projects/order', { ids }),
    deleteProject: id => req('DELETE', pid(id)),
    runProject: (id, commandId) => req('POST', pid(id) + '/run', { commandId }),
    openFolder: (id, path) => req('POST', pid(id) + '/open', { path: path || '' }),
    addImages: (id, files) => {
      const f = new FormData();
      files.forEach(x => f.append('files', x));
      return req('POST', pid(id) + '/images', f, { form: true });
    },
    uploadFiles: uploadBatches,
    importPath: (id, from, move) => req('POST', pid(id) + '/import-path', { from, move: !!move }),
    uploadZip: (id, file, restore, onProgress) => {
      const f = new FormData();
      f.append('file', file, 'a.zip');
      if (restore) f.append('restore', '1');
      return xhrForm(pid(id) + '/upload-zip', f, loaded => onProgress && onProgress(Math.min(1, loaded / (file.size || 1))));
    },
    saveFile: (id, path, content) => req('PUT', pid(id) + '/file', { path, content }),
    deleteFile: (id, path) => req('DELETE', pid(id) + '/file?path=' + q(path)),
    renameFile: (id, from, to) => req('POST', pid(id) + '/rename', { from, to }),
    previewStart: (id, path) => req('POST', pid(id) + '/preview', { path: path || '' }),
    signature: id => req('GET', pid(id) + '/signature'),
    downloadUrl: id => pid(id) + '/download',
    backupDownloadUrl: ids => '/api/backup/download?ids=' + ids.map(q).join(','),
    removeImage: (id, imageId) => req('DELETE', pid(id) + '/images/' + q(imageId)),
    setCover: (id, imageId) => req('POST', pid(id) + '/images/' + q(imageId) + '/cover'),
    listFiles: (id, path) => req('GET', pid(id) + '/files?path=' + q(path || '')),
    readFile: (id, path) => req('GET', pid(id) + '/file?path=' + q(path)),
    refreshSizes: () => req('POST', '/api/sizes'),
    scan: path => req('POST', '/api/scan', { path }),
    backup: (ids, destination, exclude) => req('POST', '/api/backup', { ids, destination, exclude: exclude || [] }),
    exportData: () => req('GET', '/api/export'),
    importData: data => req('POST', '/api/import', data)
  };

  /* ---------- tryb podglądu (demo) ---------- */

  const DEMO = window.PH_DEMO;
  const K = { acc: 'ph_account', ses: 'ph_session', prj: 'ph_projects', off: 'ph_demo_off', ver: 'ph_data_ver' };
  const DATA_VERSION = '3';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const uid = () => Math.random().toString(36).slice(2, 10);

  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {
        throw new ApiError('Pamięć przeglądarki jest pełna. Usuń część zdjęć z projektów demo.', 507);
      }
    }
  };

  async function sha(text) {
    const raw = 'projecthub:' + text;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return btoa(unescape(encodeURIComponent(raw)));
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const fail = () => reject(new ApiError('Nie udało się wczytać pliku „' + file.name + '”.', 400));
      const fr = new FileReader();
      fr.onerror = fail;
      fr.onload = () => {
        const im = new Image();
        im.onerror = fail;
        im.onload = () => {
          const s = Math.min(1, 960 / Math.max(im.width, im.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * s));
          c.height = Math.max(1, Math.round(im.height * s));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.74));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'projekt';

  function normP(p) {
    const o = Object.assign({
      description: '', notes: '', category: 'Inne', tech: [], tags: [], images: [], commands: [], tasks: [], docs: [],
      favorite: false, archived: false, status: 'active', storage: 'local', icon: '', color: '', sizeBytes: null, backedUpAt: null, updatedAt: new Date().toISOString()
    }, p);
    if (!Array.isArray(o.commands)) o.commands = [];
    if (!o.commands.length && o.runCommand) o.commands = [{ id: uid(), label: 'Uruchom', cmd: o.runCommand }];
    delete o.runCommand;
    ['tech', 'tags', 'images', 'tasks', 'docs'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
    if (['idea', 'active', 'paused', 'done'].indexOf(o.status) < 0) o.status = 'active';
    return o;
  }

  function projects() {
    if (store.get(K.ver, null) !== DATA_VERSION) {
      store.set(K.prj, DEMO.seed());
      store.set(K.ver, DATA_VERSION);
      try { localStorage.removeItem(K.off); } catch (e) { /* j.w. */ }
    }
    return store.get(K.prj, []).map(normP);
  }
  function findIn(list, id) {
    const i = list.findIndex(x => x.id === id);
    if (i < 0) throw new ApiError('Nie znaleziono projektu. Odśwież stronę.', 404);
    return i;
  }
  const QUIET = ['favorite', 'archived', 'status'];

  /* drzewo plików demo */
  function nodeAt(p, path) {
    let n = DEMO.buildTree(p);
    const parts = String(path || '').split('/').filter(Boolean);
    for (const part of parts) {
      if (part === '..' || !n.dir || !n.children[part]) throw new ApiError('Nie znaleziono folderu lub pliku w projekcie.', 404);
      n = n.children[part];
    }
    return n;
  }
  const modifiedFor = (p, name) => DEMO.isoAgo(DEMO.hashStr(p.id + name) % 40);
  const TEXT_EXT = /\.(md|txt|py|js|json|html|css|csv|ini|toml|yml|yaml|sh|bat|gitignore|env)$/i;

  const mock = {
    async getSettings() { return { settings: null }; },
    async saveSettings() { return { ok: true }; },
    async authStatus() {
      await wait(60);
      const acc = store.get(K.acc, null);
      let on = false;
      try { on = sessionStorage.getItem(K.ses) === '1'; } catch (e) { /* j.w. */ }
      return {
        configured: !!acc, authenticated: !!acc && on, username: acc ? acc.username : null, mode: 'demo', registration: 'open',
        features: { run: true, scan: true, localPaths: true, openFolder: true, backupToPath: true, upload: false, preview: false },
        limits: { quota: 0, maxFile: 0, maxFiles: 0, maxZip: 0 }, usage: 0
      };
    },
    async register(username, password) { return this.setup(username, password); },
    async changePassword(current, next) {
      await wait(150);
      const acc = store.get(K.acc, null);
      if (!acc || acc.hash !== await sha(current)) throw new ApiError('Hasło jest nieprawidłowe.', 403);
      if (String(next).length < 8) throw new ApiError('Hasło jest za krótkie. Użyj co najmniej 8 znaków.', 400);
      store.set(K.acc, { username: acc.username, hash: await sha(next) });
      return { ok: true };
    },
    async deleteAccount(password) {
      await wait(150);
      const acc = store.get(K.acc, null);
      if (!acc || acc.hash !== await sha(password)) throw new ApiError('Hasło jest nieprawidłowe.', 403);
      this.resetDemo();
      return { ok: true };
    },
    downloadUrl: () => '#',
    backupDownloadUrl: () => '#',
    async setup(username, password) {
      await wait(150);
      if (store.get(K.acc, null)) throw new ApiError('Konto już istnieje. Zaloguj się.', 409);
      store.set(K.acc, { username, hash: await sha(password) });
      projects();
      sessionStorage.setItem(K.ses, '1');
      return { username };
    },
    async login(username, password) {
      await wait(150);
      const acc = store.get(K.acc, null);
      if (!acc || acc.username !== username || acc.hash !== await sha(password)) {
        throw new ApiError('Nieprawidłowy login lub hasło.', 401);
      }
      sessionStorage.setItem(K.ses, '1');
      return { username };
    },
    async logout() { sessionStorage.removeItem(K.ses); },
    async enterDemo() {
      if (!store.get(K.acc, null)) store.set(K.acc, { username: 'demo', hash: await sha('demodemo') });
      projects();
      sessionStorage.setItem(K.ses, '1');
    },
    async listProjects() {
      await wait(80);
      const list = projects();
      /* projekt demo wraca, chyba że sam go usunąłeś */
      if (!list.some(x => x.id === 'demo-projecthub') && !store.get(K.off, false)) {
        list.unshift(normP(DEMO.seed()[0]));
        store.set(K.prj, list);
      }
      return list;
    },
    async saveProject(p) {
      await wait(80);
      const list = projects(), now = new Date().toISOString();
      if (p.id) {
        const i = findIn(list, p.id);
        const keep = { images: list[i].images, backedUpAt: list[i].backedUpAt };
        list[i] = normP(Object.assign({}, list[i], p, keep, { updatedAt: now }));
        store.set(K.prj, list);
        return list[i];
      }
      const n = normP(Object.assign({ images: [], backedUpAt: null }, p, { id: uid(), updatedAt: now }));
      list.unshift(n);
      store.set(K.prj, list);
      return n;
    },
    async patchProject(id, fields) {
      await wait(40);
      const list = projects(), i = findIn(list, id);
      const quiet = Object.keys(fields).every(k => QUIET.indexOf(k) >= 0);
      const safe = Object.assign({}, fields);
      delete safe.id; delete safe.images;
      list[i] = normP(Object.assign({}, list[i], safe, quiet ? {} : { updatedAt: new Date().toISOString() }));
      store.set(K.prj, list);
      return list[i];
    },
    async reorder(ids) {
      const list = projects();
      const map = new Map(list.map(p => [p.id, p]));
      const out = ids.filter(id => map.has(id)).map(id => map.get(id));
      list.forEach(p => { if (ids.indexOf(p.id) < 0) out.push(p); });
      store.set(K.prj, out);
      return { ok: true };
    },
    async deleteProject(id) {
      await wait(80);
      if (id === 'demo-projecthub') store.set(K.off, true);
      store.set(K.prj, projects().filter(x => x.id !== id));
      return { ok: true };
    },
    async runProject(id, commandId) {
      await wait(280);
      const p = projects()[findIn(projects(), id)];
      const c = commandId ? p.commands.find(x => x.id === commandId) : p.commands[0];
      if (!c) throw new ApiError('Ten projekt nie ma takiego polecenia. Dodaj je w edycji.', 400);
      return { message: 'Tryb podglądu: tu uruchomiłoby się „' + c.cmd + '” w folderze projektu.' };
    },
    async openFolder(id, path) {
      await wait(150);
      const p = projects()[findIn(projects(), id)];
      return { message: 'Tryb podglądu: tu otworzyłby się Eksplorator w folderze ' + p.path + (path ? '\\' + path.replace(/\//g, '\\') : '') };
    },
    async addImages(id, files) {
      const list = projects(), i = findIn(list, id);
      for (const f of files) {
        list[i].images.push({ id: uid(), name: f.name, url: await fileToDataUrl(f) });
      }
      store.set(K.prj, list);
      return list[i];
    },
    async removeImage(id, imageId) {
      const list = projects(), i = findIn(list, id);
      list[i].images = list[i].images.filter(x => x.id !== imageId);
      store.set(K.prj, list);
      return list[i];
    },
    async setCover(id, imageId) {
      const list = projects(), i = findIn(list, id);
      const im = list[i].images.find(x => x.id === imageId);
      if (im) list[i].images = [im].concat(list[i].images.filter(x => x.id !== imageId));
      store.set(K.prj, list);
      return list[i];
    },
    async listFiles(id, path) {
      await wait(160);
      const p = projects()[findIn(projects(), id)];
      const n = nodeAt(p, path);
      if (!n.dir) throw new ApiError('To nie jest folder.', 400);
      const entries = Object.keys(n.children).map(name => {
        const c = n.children[name];
        return { name, type: c.dir ? 'dir' : 'file', size: c.dir ? null : c.size, modified: modifiedFor(p, (path || '') + name) };
      }).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'pl') : a.type === 'dir' ? -1 : 1));
      return { path: path || '', entries };
    },
    async readFile(id, path) {
      await wait(120);
      const p = projects()[findIn(projects(), id)];
      const n = nodeAt(p, path);
      if (n.dir) throw new ApiError('To jest folder, nie plik.', 400);
      const name = path.split('/').pop();
      if (n.content.indexOf('__img:') === 0) return { name, size: n.size, kind: 'image', url: DEMO.shot(name, +n.content.slice(6)) };
      if (!TEXT_EXT.test(name) && name.indexOf('.') >= 0) return { name, size: n.size, kind: 'binary' };
      return { name, size: n.size, kind: 'text', content: n.content, truncated: false };
    },
    async refreshSizes() {
      await wait(900);
      const list = projects(), sizes = {};
      list.forEach(p => {
        if (p.sizeBytes == null) p.sizeBytes = (3 + (DEMO.hashStr(p.name) % 400)) * DEMO.MB;
        sizes[p.id] = p.sizeBytes;
      });
      store.set(K.prj, list);
      return { sizes };
    },
    async scan(path) {
      await wait(600);
      const base = path.replace(/[\\/]+$/, '');
      const demo = [['kalkulator_walut', 'Python', 9], ['stary_projekt_szkola', 'HTML', 31], ['telegram_bot', 'Python', 14], ['makieta_aplikacji', 'Figma', 6], ['gra_w_statki', 'JavaScript', 22]];
      return { path: base, folders: demo.map(d => ({ name: d[0], path: base + '\\' + d[0], tech: [d[1]], files: d[2] })) };
    },
    async backup(ids, destination) {
      await wait(900);
      const list = projects(), now = new Date(), day = now.toISOString().slice(0, 10);
      const dest = destination.replace(/[\\/]+$/, '');
      const results = ids.map(id => {
        const i = list.findIndex(x => x.id === id);
        if (i < 0) return { id, ok: false, error: 'Nie znaleziono projektu.' };
        list[i].backedUpAt = now.toISOString();
        return { id, ok: true, file: dest + '\\' + slug(list[i].name) + '-' + day + '.zip', backedUpAt: list[i].backedUpAt };
      });
      store.set(K.prj, list);
      return { results };
    },
    async exportData() {
      await wait(150);
      return { version: 3, exportedAt: new Date().toISOString(), projects: projects() };
    },
    async importData(data) {
      await wait(250);
      if (!data || !Array.isArray(data.projects)) throw new ApiError('To nie wygląda na plik eksportu ProjectHub.', 400);
      const list = projects();
      let n = 0;
      data.projects.forEach(raw => {
        if (!raw || typeof raw.name !== 'string') return;
        raw.path = typeof raw.path === 'string' ? raw.path : '';
        const p = normP(Object.assign({}, raw, { id: raw.id || uid() }));
        const i = list.findIndex(x => x.id === p.id);
        if (i >= 0) list[i] = p; else list.push(p);
        n++;
      });
      store.set(K.prj, list);
      return { imported: n };
    },
    resetDemo() {
      Object.values(K).forEach(k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* j.w. */ } });
    }
  };

  window.PH_API = Object.assign({ MOCK, ApiError }, MOCK ? mock : real);
})();