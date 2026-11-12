/* upload.js: collecting files to upload (folder, files, drag & drop, ZIP) and summarizing them. */
(function () {
  'use strict';
  const PH = window.PH;
  const SKIP = ['node_modules', '.git', '__pycache__', '.venv'];
  const JUNK = /^(thumbs\.db|\.ds_store|desktop\.ini)$/i;

  function mb(n) { return PH.fmtSize(n); }

  /* raw: [{file, path}] -> a selection ready to upload */
  function build(raw, extra) {
    const lim = PH.limits || {};
    const sel = { entries: [], zip: null, skippedDirs: [], tooBig: 0, junk: 0, bytes: 0, rootName: '' };
    (extra && extra.skippedDirs || []).forEach(d => { if (sel.skippedDirs.indexOf(d) < 0) sel.skippedDirs.push(d); });
    if (raw.length === 1 && /\.zip$/i.test(raw[0].file.name) && raw[0].path.indexOf('/') < 0) {
      sel.zip = raw[0].file; sel.bytes = raw[0].file.size; sel.rootName = raw[0].file.name.replace(/\.zip$/i, '');
      return sel;
    }
    let items = raw.map(r => ({ file: r.file, path: String(r.path).replace(/\\/g, '/').replace(/^\/+/, '') }));
    // a shared root folder (e.g. the selected folder “my-site”) is not part of the project
    if (items.length && items.every(i => i.path.indexOf('/') > 0 && i.path.split('/')[0] === items[0].path.split('/')[0])) {
      const first = items[0].path.split('/')[0];
      sel.rootName = first;
      items.forEach(i => { i.path = i.path.slice(first.length + 1); });
    }
    items.forEach(i => {
      const parts = i.path.split('/');
      if (JUNK.test(parts[parts.length - 1])) { sel.junk++; return; }
      const bad = parts.slice(0, -1).find(p => SKIP.indexOf(p) >= 0);
      if (bad) { if (sel.skippedDirs.indexOf(bad) < 0) sel.skippedDirs.push(bad); return; }
      if (lim.maxFile && i.file.size > lim.maxFile) { sel.tooBig++; return; }
      sel.entries.push(i);
      sel.bytes += i.file.size;
    });
    return sel;
  }

  /* validation against server limits; returns an error text or '' */
  function problem(sel) {
    const lim = PH.limits || {};
    if (sel.zip && lim.maxZip && sel.zip.size > lim.maxZip) return 'The ZIP archive is too large (limit ' + mb(lim.maxZip) + ').';
    if (lim.maxFiles && sel.entries.length > lim.maxFiles) return 'Too many files: ' + sel.entries.length + ' (limit ' + lim.maxFiles + '). Pack them into a ZIP or pick fewer.';
    if (lim.quota && sel.bytes > Math.max(0, lim.quota - (PH.usage || 0))) {
      return 'Not enough free space: need ' + mb(sel.bytes) + ', left ' + mb(Math.max(0, lim.quota - (PH.usage || 0))) + '.';
    }
    return '';
  }

  function describe(sel) {
    if (!sel) return '';
    if (sel.zip) return 'ZIP archive: ' + PH.esc(sel.zip.name) + ' (' + mb(sel.zip.size) + '). I will unpack it into the project.';
    if (!sel.entries.length) return sel.skippedDirs.length || sel.tooBig ? 'There is nothing to upload.' : '';
    let t = '<strong>' + sel.entries.length + '</strong> ' + PH.plural(sel.entries.length, 'file', 'files', 'files') + ', ' + mb(sel.bytes);
    const notes = [];
    if (sel.skippedDirs.length) notes.push('skipped folders: ' + sel.skippedDirs.map(PH.esc).join(', '));
    if (sel.tooBig) notes.push(sel.tooBig + ' ' + PH.plural(sel.tooBig, 'file is too large', 'files are too large', 'files are too large'));
    return t + (notes.length ? '. <span class="muted">' + notes.join('; ') + '.</span>' : '');
  }

  function fromInput(files) {
    return build(Array.from(files).map(f => ({ file: f, path: f.webkitRelativePath || f.name })));
  }

  async function fromDrop(dt) {
    const ents = Array.from(dt.items || []).map(i => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
    if (!ents.length) return fromInput(dt.files || []);
    const out = [], skipped = [];
    async function walk(entry, prefix) {
      if (entry.isFile) {
        const file = await new Promise((res, rej) => entry.file(res, rej));
        out.push({ file, path: prefix + entry.name });
      } else if (entry.isDirectory) {
        if (SKIP.indexOf(entry.name) >= 0) { if (skipped.indexOf(entry.name) < 0) skipped.push(entry.name); return; }
        const reader = entry.createReader();
        let batch;
        do {
          batch = await new Promise((res, rej) => reader.readEntries(res, rej));
          for (const e of batch) await walk(e, prefix + entry.name + '/');
        } while (batch.length);
      }
    }
    for (const e of ents) await walk(e, '');
    return build(out, { skippedDirs: skipped });
  }

  PH.upload = { build, describe, problem, fromInput, fromDrop, SKIP };
})();
