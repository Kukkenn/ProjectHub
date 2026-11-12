/* i18n.js: switches the interface language between English (default) and Polish.
   Polish strings live in lang-pl.js as window.PH_PL = { "English": "Polski", ... };
   English strings are the ones in the code, so switching back is just the reverse map. */
(function () {
  'use strict';
  var MAP = window.PH_PL || {};
  var REVERSE = {};
  Object.keys(MAP).forEach(function (en) { if (!REVERSE[MAP[en]]) REVERSE[MAP[en]] = en; });
  // Exact whole-text-node matches always win; shorter fragments are replaced
  // as substrings only when long enough to be unambiguous.
  var KEYS = Object.keys(MAP).sort(function (a, b) { return b.length - a.length; });
  var SUB_MIN = 4;
  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, NOSCRIPT: 1, KBD: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label'];
  var observer = null;
  var current = 'en';

  function swap(text, map, keys) {
    if (!text || !text.trim()) return null;
    if (map[text] !== undefined) return map[text];
    var out = text, changed = false;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.length < SUB_MIN || out.indexOf(k) === -1) continue;
      out = out.split(k).join(map[k]);
      changed = true;
    }
    return changed ? out : null;
  }

  function translate(root, dict, keys, subKeys) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var el = n.parentElement;
        if (!el || SKIP[el.tagName] || el.isContentEditable) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var s = swap(t.nodeValue, dict, subKeys);
      if (s !== null && s !== t.nodeValue) t.nodeValue = s;
    });
    if (root.querySelectorAll) {
      root.querySelectorAll('[' + ATTRS.join('],[') + ']').forEach(function (el) {
        ATTRS.forEach(function (a) {
          var v = el.getAttribute(a);
          if (!v) return;
          var s = swap(v, dict, subKeys);
          if (s !== null && s !== v) el.setAttribute(a, s);
        });
      });
    }
    if (root.nodeType === 1) { // the element itself may carry an attribute
      ATTRS.forEach(function (a) {
        var v = root.getAttribute && root.getAttribute(a);
        if (!v) return;
        var s = swap(v, dict, subKeys);
        if (s !== null && s !== v) root.setAttribute(a, s);
      });
    }
  }

  function keysFor(dict) {
    return Object.keys(dict).sort(function (a, b) { return b.length - a.length; });
  }
  function subKeysFor(keys) { return keys.filter(function (k) { return k.length >= SUB_MIN; }); }

  function apply(lang) {
    current = lang === 'pl' ? 'pl' : 'en';
    if (observer) { observer.disconnect(); observer = null; }
    if (current === 'pl') {
      var keys = keysFor(MAP);
      translate(document.body || document.documentElement, MAP, keys, subKeysFor(keys));
      observer = new MutationObserver(function (muts) {
        var keys2 = keysFor(MAP), subs = subKeysFor(keys2);
        muts.forEach(function (m) {
          if (m.type === 'characterData' && m.target.parentElement) {
            var s = swap(m.target.nodeValue, MAP, subs);
            if (s !== null && s !== m.target.nodeValue) m.target.nodeValue = s;
            return;
          }
          for (var i = 0; i < m.addedNodes.length; i++) {
            var a = m.addedNodes[i];
            if (a.nodeType === 3 && a.parentElement) {
              var s2 = swap(a.nodeValue, MAP, subs);
              if (s2 !== null && s2 !== a.nodeValue) a.nodeValue = s2;
            } else if (a.nodeType === 1 && !SKIP[a.tagName]) {
              translate(a, MAP, keys2, subs);
            }
          }
        });
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true, characterData: true });
    } else {
      var rkeys = keysFor(REVERSE);
      translate(document.body || document.documentElement, REVERSE, rkeys, subKeysFor(rkeys));
    }
    document.documentElement.dataset.lang = current;
  }

  // React to settings changes: switching the language re-translates the whole page.
  document.addEventListener('ph:settings', function (e) {
    if (!window.PH || !PH.settings) return;
    if (e.detail && (e.detail.key === 'language' || e.detail.key === '*')) {
      if (PH_I18N.get() !== (PH.settings.language || 'en')) apply(PH.settings.language);
    }
  });
  document.addEventListener('DOMContentLoaded', function () {
    if (window.PH && PH.settings && PH.settings.language === 'pl') apply('pl');
  });

  window.PH_I18N = {
    apply: function (lang) {
      if (!window.PH_PL || !Object.keys(MAP).length) return; // no Polish pack: English only
      apply(lang);
    },
    get: function () { return current; },
    t: function (s) { return current === 'pl' && MAP[s] !== undefined ? MAP[s] : s; }
  };
})();
