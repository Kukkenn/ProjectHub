/* md.js: mały, bezpieczny renderer Markdowna (nagłówki, listy, zadania, tabele, cytaty,
   wyróżnienia [!NOTE], bloki kodu z podświetlaniem). Cały tekst jest najpierw escapowany,
   więc wklejony HTML nigdy się nie wykona. */
(function () {
  'use strict';
  const PH = (window.PH = window.PH || {});

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- podświetlanie kodu ---------- */

  const KW = {
    py: 'def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|in|not|and|or|is|None|True|False|lambda|pass|break|continue|yield|async|await',
    js: 'const|let|var|function|return|if|else|for|while|import|from|export|default|class|new|try|catch|finally|throw|async|await|null|true|false|undefined|typeof|of|in',
    sh: 'cd|echo|export|source|if|then|fi|for|do|done|python|pip|npm|git|sudo|mkdir|rm|cp|mv|pytest',
    json: 'true|false|null',
    css: ''
  };
  const LANG = {
    python: 'py', py: 'py', javascript: 'js', js: 'js', ts: 'js', typescript: 'js', jsx: 'js',
    bash: 'sh', sh: 'sh', shell: 'sh', powershell: 'sh', ps1: 'sh', cmd: 'sh', bat: 'sh',
    json: 'json', css: 'css', html: 'html', text: '', txt: ''
  };

  function highlight(code, lang) {
    const L = LANG[String(lang || '').toLowerCase()];
    if (!L) return esc(code);
    const com = (L === 'py' || L === 'sh') ? '#[^\\n]*' : (L === 'css' ? '\\/\\*[\\s\\S]*?\\*\\/' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/');
    const kw = KW[L] ? '\\b(?:' + KW[L] + ')\\b' : '\\b\\B';
    const re = new RegExp('(' + com + ')|("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')|(' + kw + ')|(\\b\\d+(?:\\.\\d+)?\\b)', 'g');
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      if (m[0] === '') { re.lastIndex++; continue; }
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'n';
      out += '<span class="tok-' + cls + '">' + esc(m[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  function codeBlock(code, lang) {
    return '<div class="code"><div class="code-head"><span>' + esc(lang || 'tekst') + '</span>' +
      '<button type="button" class="code-copy" data-copy>Kopiuj</button></div>' +
      '<pre><code>' + highlight(code, lang) + '</code></pre></div>';
  }

  /* ---------- tekst w linii ---------- */

  const safeUrl = u => /^(https?:\/\/|mailto:)/i.test(u);

  function inline(raw) {
    const codes = [];
    let s = String(raw).replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => safeUrl(u.replace(/&amp;/g, '&'))
        ? '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>' : t);
    return s.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + esc(codes[+i]) + '</code>');
  }

  const slugify = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sekcja';

  const CALLOUT = { NOTE: 'Notatka', TIP: 'Wskazówka', WARNING: 'Uwaga', IMPORTANT: 'Ważne' };

  /* ---------- bloki ---------- */

  const FENCE = /^\s{0,3}(```|~~~)\s*([\w+#-]*)\s*$/;
  const HEAD = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
  const HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
  const LI = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  const TBLSEP = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

  function splitRow(line) {
    let t = line.trim();
    if (t[0] === '|') t = t.slice(1);
    if (t[t.length - 1] === '|') t = t.slice(0, -1);
    return t.split('|').map(c => c.trim());
  }

  function listHtml(lines) {
    const items = [];
    lines.forEach(l => {
      const m = l.match(LI);
      if (m) items.push({ indent: m[1].replace(/\t/g, '  ').length, ord: /\d/.test(m[2]), text: m[3] });
      else if (items.length) items[items.length - 1].text += ' ' + l.trim();
    });
    let html = '';
    const stack = [];
    items.forEach(it => {
      while (stack.length && it.indent < stack[stack.length - 1].indent) html += '</li></' + (stack.pop().ord ? 'ol' : 'ul') + '>';
      if (stack.length && it.indent === stack[stack.length - 1].indent) html += '</li>';
      else { html += '<' + (it.ord ? 'ol' : 'ul') + '>'; stack.push({ indent: it.indent, ord: it.ord }); }
      const t = it.text.match(/^\[( |x|X)\]\s+(.*)$/);
      if (t) html += '<li class="task"><input type="checkbox" disabled' + (t[1] === ' ' ? '' : ' checked') + '><span>' + inline(t[2]) + '</span>';
      else html += '<li>' + inline(it.text);
    });
    while (stack.length) html += '</li></' + (stack.pop().ord ? 'ol' : 'ul') + '>';
    return html;
  }

  function render(src) {
    const lines = String(src == null ? '' : src).replace(/\r\n?/g, '\n').split('\n');
    const out = [], toc = [], seen = {};
    let i = 0;
    const startsBlock = (l, n) => FENCE.test(l) || HEAD.test(l) || HR.test(l) || /^\s*>/.test(l) || LI.test(l) ||
      (l.indexOf('|') >= 0 && n != null && TBLSEP.test(n));

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      let m;

      if ((m = line.match(FENCE))) {
        const marker = m[1], lang = m[2], buf = [];
        i++;
        while (i < lines.length && lines[i].trim() !== marker) buf.push(lines[i++]);
        i++;
        out.push(codeBlock(buf.join('\n'), lang));
      } else if ((m = line.match(HEAD))) {
        const level = m[1].length;
        let id = 'md-' + slugify(m[2]);
        if (seen[id]) { seen[id]++; id += '-' + seen[id]; } else seen[id] = 1;
        if (level >= 2 && level <= 3) toc.push({ id, level, text: m[2].replace(/[`*~]/g, '') });
        out.push('<h' + level + ' id="' + id + '">' + inline(m[2]) + '</h' + level + '>');
        i++;
      } else if (HR.test(line)) {
        out.push('<hr>');
        i++;
      } else if (line.indexOf('|') >= 0 && i + 1 < lines.length && TBLSEP.test(lines[i + 1])) {
        const head = splitRow(line);
        const aligns = splitRow(lines[i + 1]).map(c => (c[0] === ':' && c[c.length - 1] === ':') ? 'center' : (c[c.length - 1] === ':' ? 'right' : ''));
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') >= 0) rows.push(splitRow(lines[i++]));
        const cell = (tag, c, k) => '<' + tag + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + inline(c) + '</' + tag + '>';
        out.push('<div class="tbl"><table><thead><tr>' + head.map((c, k) => cell('th', c, k)).join('') + '</tr></thead><tbody>' +
          rows.map(r => '<tr>' + head.map((_, k) => cell('td', r[k] || '', k)).join('') + '</tr>').join('') + '</tbody></table></div>');
      } else if (/^\s*>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
        const c = buf[0] && buf[0].match(/^\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*$/i);
        if (c) {
          const kind = c[1].toUpperCase();
          out.push('<aside class="callout callout-' + kind.toLowerCase() + '"><strong>' + CALLOUT[kind] + '</strong>' + render(buf.slice(1).join('\n')).html + '</aside>');
        } else {
          out.push('<blockquote>' + render(buf.join('\n')).html + '</blockquote>');
        }
      } else if (LI.test(line)) {
        const buf = [];
        while (i < lines.length && lines[i].trim() && (LI.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) buf.push(lines[i++]);
        out.push(listHtml(buf));
      } else {
        const buf = [];
        while (i < lines.length && lines[i].trim() && (buf.length === 0 || !startsBlock(lines[i], lines[i + 1]))) buf.push(lines[i++].trim());
        out.push('<p>' + buf.map(inline).join(' ') + '</p>');
      }
    }
    return { html: out.join('\n'), toc };
  }

  PH.md = { render, highlight, esc };
})();
