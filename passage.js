/* Passages: reading a typed range such as "John 3:16-18", "Mk 4", "Rom 8:28-9:5", "Matt 5:3-12; Luke 6:20-23" or "John 3:16 +2",
   finding its verses, and loading the text, word and note data when a page needs them. Used by the Read and Vocabulary pages. */
(function () {
  'use strict';
  var P = window.GNT_PASSAGE = {};
  var BOOKS = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
  P.books = BOOKS;
  var BOOKKEY = BOOKS.map(function (b) { return b.toLowerCase().replace(/[^a-z0-9]/g, ''); });
  var ALIAS = { mt: 0, matt: 0, mk: 1, mar: 1, lk: 2, luk: 2, jn: 3, jhn: 3, joh: 3, ac: 4, rom: 5, ro: 5, rm: 5, '1co': 6, '1cor': 6, '2co': 7, '2cor': 7, gal: 8, eph: 9, php: 10, phil: 10, col: 11, '1th': 12, '1thess': 12, '2th': 13, '2thess': 13, '1ti': 14, '1tim': 14, '2ti': 15, '2tim': 15, tit: 16, phm: 17, phlm: 17, philem: 17, heb: 18, jas: 19, jam: 19, '1pe': 20, '1pet': 20, '2pe': 21, '2pet': 21, '1jn': 22, '1jo': 22, '1john': 22, '2jn': 23, '2jo': 23, '2john': 23, '3jn': 24, '3jo': 24, '3john': 24, jud: 25, rev: 26, re: 26, revelations: 26 };

  function bookIndex(name) {
    var k = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (k.length < 2) return -1;
    if (Object.prototype.hasOwnProperty.call(ALIAS, k)) return ALIAS[k];
    var i;
    for (i = 0; i < BOOKKEY.length; i++) if (BOOKKEY[i].indexOf(k) === 0) return i;
    for (i = 0; i < BOOKKEY.length; i++) if (k.indexOf(BOOKKEY[i]) === 0) return i;
    return -1;
  }
  P.bookIndex = bookIndex;

  /* ---- loading the data files, each only when needed ---- */
  var queues = {};
  function loadScript(src, ready, cb) {
    if (ready()) { if (cb) cb(true); return; }
    var q = queues[src];
    if (q) { if (cb) q.push(cb); return; }
    q = queues[src] = cb ? [cb] : [];
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { var w = q; delete queues[src]; w.forEach(function (f) { f(ready()); }); };
    s.onerror = function () { var w = q; delete queues[src]; w.forEach(function (f) { f(false); }); };
    document.head.appendChild(s);
  }
  P.loadGreek = function (cb) { loadScript('greek-data.js', function () { return !!window.GNT_GRK; }, cb); };
  P.loadNotes = function (cb) { loadScript('notes-data.js', function () { return !!window.GNT_NOTES; }, cb); };
  P.loadHints = function (cb) { loadScript('hints-data.js', function () { return !!window.GNT_HINTS; }, cb); };
  P.loadEnglish = function (cb) { if (window.GNT_EN) window.GNT_EN.load(function () { cb(true); }); else cb(false); };
  P.loadWords = function (cb) { if (window.GNT_TIP) window.GNT_TIP.load(function () { cb(!!window.GNT_WORDS); }); else loadScript('greek-words.js', function () { return !!window.GNT_WORDS; }, cb); };

  /* ---- the verses of a book, in order ---- */
  var KEYS = [], CH = [];
  function keys(b) {
    if (!KEYS[b]) {
      KEYS[b] = Object.keys(window.GNT_GRK.v[b]).map(function (k) { var p = k.split(':'); return [+p[0], +p[1], k]; })
        .sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });
      var ch = {};
      KEYS[b].forEach(function (p) { ch[p[0]] = Math.max(ch[p[0]] || 0, p[1]); });
      CH[b] = ch;
    }
    return KEYS[b];
  }
  P.keys = keys;
  P.chapters = function (b) { keys(b); return CH[b]; };

  /* ---- reading the range text ---- */
  function parseSpec(rest, b) {
    rest = rest.trim();
    if (!rest) return { segs: [{ b: b, from: [1, 1], to: [999, 999] }] };
    var parts = rest.split(','), segs = [], lastC = 0, verseCtx = false, m;
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].replace(/\s+/g, '');
      if (!t) return { error: true };
      if ((m = /^(\d+):(\d+)\+(\d+)$/.exec(t))) { segs.push({ b: b, from: [+m[1], +m[2]], plus: +m[3] }); lastC = +m[1]; verseCtx = true; }
      else if ((m = /^(\d+):(\d+)-(\d+):(\d+)$/.exec(t))) { segs.push({ b: b, from: [+m[1], +m[2]], to: [+m[3], +m[4]] }); lastC = +m[3]; verseCtx = true; }
      else if ((m = /^(\d+):(\d+)-(\d+)$/.exec(t))) { segs.push({ b: b, from: [+m[1], +m[2]], to: [+m[1], +m[3]] }); lastC = +m[1]; verseCtx = true; }
      else if ((m = /^(\d+):(\d+)$/.exec(t))) { segs.push({ b: b, from: [+m[1], +m[2]], to: [+m[1], +m[2]] }); lastC = +m[1]; verseCtx = true; }
      else if (verseCtx && (m = /^(\d+)\+(\d+)$/.exec(t))) segs.push({ b: b, from: [lastC, +m[1]], plus: +m[2] });
      else if (verseCtx && (m = /^(\d+)-(\d+)$/.exec(t))) segs.push({ b: b, from: [lastC, +m[1]], to: [lastC, +m[2]] });
      else if (verseCtx && (m = /^(\d+)$/.exec(t))) segs.push({ b: b, from: [lastC, +m[1]], to: [lastC, +m[1]] });
      else if ((m = /^(\d+)-(\d+)$/.exec(t))) segs.push({ b: b, from: [+m[1], 1], to: [+m[2], 9999] });
      else if ((m = /^(\d+)$/.exec(t))) segs.push({ b: b, from: [+m[1], 1], to: [+m[1], 9999] });
      else return { error: true };
    }
    return { segs: segs };
  }

  /* text -> {segs:[{b, from, to | plus}], error:string}. Lists are separated by semicolons or new lines. */
  P.parse = function (text) {
    var s = String(text || '').toLowerCase().replace(/[‐-―−]/g, '-').replace(/\s+(?:to|through|thru)\s+/g, '-');
    var items = s.split(/[;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!items.length) return { segs: [] };
    var segs = [], last = -1;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], b = last, rest = it, m = /^([1-3]\s*[a-z][a-z.]*|[a-z][a-z.]*)\s*(.*)$/.exec(it);
      if (m && !/^\d+\s*[:,+-]/.test(it)) {
        var k = m[1].replace(/\./g, '');
        var bi = bookIndex(k);
        if (bi < 0) {
          /* "Song of ..."-style names or a name with a space after the book number: try the first two words */
          return { error: 'I do not know a book called “' + m[1].trim() + '”. Try a name such as John, Rom or 1 Cor.' };
        }
        b = bi; rest = m[2];
      } else if (b < 0) return { error: 'Start with a book name, such as John 3:16.' };
      var r = parseSpec(rest.replace(/^\./, ''), b);
      if (r.error) return { error: 'I could not read “' + it + '”. Examples: John 3:16-18, Mk 4, Rom 8:28-9:5.' };
      segs = segs.concat(r.segs); last = b;
    }
    return { segs: segs };
  };

  /* A segment -> the verses it covers, [{b, c, v, key}] */
  P.resolve = function (seg) {
    var ks = keys(seg.b), out = [];
    function at(p, q) { return p[0] !== q[0] ? p[0] - q[0] : p[1] - q[1]; }
    if (seg.plus != null) {
      var start = -1, i;
      for (i = 0; i < ks.length; i++) if (at(ks[i], seg.from) >= 0) { start = i; break; }
      if (start < 0 || at(ks[start], seg.from) !== 0) return [];
      ks.slice(start, start + seg.plus + 1).forEach(function (p) { out.push({ b: seg.b, c: p[0], v: p[1], key: p[2] }); });
      return out;
    }
    ks.forEach(function (p) { if (at(p, seg.from) >= 0 && at(p, seg.to) <= 0) out.push({ b: seg.b, c: p[0], v: p[1], key: p[2] }); });
    return out;
  };

  /* Words for the screen: "John 3:16-18" (with an en dash) from a list of verses */
  P.label = function (vs, dash) {
    if (!vs.length) return '';
    dash = dash || '–';
    var b = vs[0].b, name = BOOKS[b], a = vs[0], z = vs[vs.length - 1], ch = P.chapters(b), n = Object.keys(ch).length;
    var zmax = ch[z.c];
    if (a.c === 1 && a.v === 1 && z.c === n && z.v === zmax) return name;
    if (a.c === z.c) {
      if (a.v === 1 && z.v === zmax) return name + ' ' + a.c;
      return a.v === z.v ? name + ' ' + a.c + ':' + a.v : name + ' ' + a.c + ':' + a.v + dash + z.v;
    }
    if (a.v === 1 && z.v === zmax) return name + ' ' + a.c + dash + z.c;
    return name + ' ' + a.c + ':' + a.v + dash + z.c + ':' + z.v;
  };

  /* Resolve a whole typed list: {parts:[{label, verses}], error} */
  P.lookup = function (text) {
    var r = P.parse(text);
    if (r.error) return { error: r.error, parts: [] };
    var parts = [], bad = '';
    r.segs.forEach(function (sg) {
      var vs = P.resolve(sg);
      if (!vs.length) { if (!bad) bad = BOOKS[sg.b] + ' ' + sg.from[0] + (sg.from[1] > 1 || sg.to && sg.to[1] < 9999 ? ':' + sg.from[1] : '') + ' is not in this edition.'; return; }
      parts.push({ label: P.label(vs), verses: vs });
    });
    return { parts: parts, error: parts.length ? '' : (bad || 'Type a passage, such as John 3:16-18.'), warn: parts.length && bad ? bad : '' };
  };
  P.canon = function (parts) { return parts.map(function (p) { return P.label(p.verses, '-'); }).join('; '); };

  /* The Greek words of a verse, as the same tokens the word popup counts */
  P.tokens = function (text) { return text.match(/[^\s—]+/g) || []; };

  /* ---- notes: which notes begin within a stretch of verses ---- */
  function noteSpan(r) {
    var m = r.match(/^(\d+):(\d+)(?:[–-](\d+)(?::(\d+))?)?$/);
    if (!m) return null;
    var c = +m[1], v = +m[2];
    return { a: [c, v], z: m[4] ? [+m[3], +m[4]] : m[3] ? [c, +m[3]] : [c, v] };
  }
  /* For a list of verses of one book: {key: [note numbers]}; each note is placed at the first of its verses that is in the list */
  P.notesFor = function (verses) {
    var out = {};
    if (!window.GNT_NOTES || !verses.length) return out;
    var b = verses[0].b, N = window.GNT_NOTES.notes;
    function cmp(p, q) { return p[0] !== q[0] ? p[0] - q[0] : p[1] - q[1]; }
    for (var i = 0; i < N.length; i++) {
      if (N[i][1] !== b) continue;
      var sp = noteSpan(N[i][2]);
      if (!sp) continue;
      for (var j = 0; j < verses.length; j++) {
        var p = [verses[j].c, verses[j].v];
        if (cmp(p, sp.a) >= 0 && cmp(p, sp.z) <= 0) { (out[verses[j].key] = out[verses[j].key] || []).push(i); break; }
      }
    }
    return out;
  };
  P.noteSpan = noteSpan;
})();
