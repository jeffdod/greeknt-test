/* Collate this verse: the verse of a note as each shown edition reads it, one above the other, in columns.
   The text of an edition is rebuilt from the main text and the notes: each note says which stretch of the verse it is about
   (greek-data.js) and what each edition reads there (notes-data.js). Everything is shown without accents or punctuation.
   Every place where a shown edition differs from the main text becomes one column; places where two such stretches touch or overlap
   are one column. Words are matched by the position the note records, never by searching for the words. */
(function () {
  'use strict';
  var D = window.GNT_NOTES, N = D.notes, EDS = D.eds, BOOKS = D.books, GR = window.GNT_GR;
  var BIT = {}; EDS.forEach(function (e, i) { BIT[e] = 1 << i; });
  var ALL = ['SCR', 'ST', 'WH', 'PT', 'SBL', 'RPmg'];
  var KEY = 'gnt-collate-eds';
  var CHAR = 9.4;                       /* about how wide a letter is, in pixels, at the size used for the columns */
  var LABEL = 118;                      /* the width of the edition names at the left, in pixels */

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function edName(e, node) { if (e === 'RPmg') { node.appendChild(document.createTextNode('RP')); node.appendChild(el('sup', null, 'mg')); } else node.appendChild(document.createTextNode(e)); return node; }

  var sel = null;
  function chosen() {
    if (sel) return sel;
    sel = ALL.slice();
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.length) { var f = ALL.filter(function (e) { return s.indexOf(e) >= 0; }); if (f.length) sel = f; } } catch (e) {}
    return sel;
  }
  function saveChosen() { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch (e) {} }

  /* ---------- words ---------- */
  /* A word without accents, breathings or capitals. Brackets stay, and so does a movable letter printed in parentheses, as in εστι(ν). */
  function strip(w) {
    var s = w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
    s = s.replace(/\(([νσς])\)/g, '\u0001$1\u0002').replace(/[^α-ω\[\]«»\u0001\u0002]/g, '');
    s = s.replace(/\u0001/g, '(').replace(/\u0002/g, ')');
    return /[α-ω]/.test(s) ? s : '';
  }
  function words(t) { return t.split(/\s+/).map(strip).filter(Boolean); }
  /* the words of a verse as the word popup counts them: i is the number of the word in the verse */
  function baseTokens(text) {
    var re = /[^\s\u2014]+/g, m, out = [], i = 0;
    while ((m = re.exec(text))) { var w = strip(m[0]); if (w) out.push({ w: w, s: m.index, e: m.index + m[0].length, i: i++ }); }
    return out;
  }
  /* the same word for the purpose of telling whether two editions differ: movable letters and a few paired forms count as equal */
  function canon(w) {
    var b = w.replace(/[\[\]«»]/g, '').replace(/\([νσς]\)/g, '');
    if (b === 'ουτως') b = 'ουτω'; else if (b === 'εξ') b = 'εκ'; else if (b === 'ουχ' || b === 'ουχι') b = 'ουκ';
    else if (b === 'μεχρις') b = 'μεχρι'; else if (b === 'αχρις') b = 'αχρι';
    else if (/ν$/.test(b)) { var st = b.slice(0, -1); if ((/ι$/.test(st) && st.length >= 4) || (/ε$/.test(st) && st.length >= 4)) b = st; }
    return (w.match(/^[\[«]+/) || [''])[0] + b + (w.match(/[\]»]+$/) || [''])[0];
  }
  function keyOf(ws) { return ws.map(canon).join(' '); }
  function foldWord(w) { return w.replace(/[^α-ω]/g, '').replace(/ς/g, 'σ'); }

  /* ---------- which notes touch which verse ---------- */
  var IDX = null;
  function lastKey(ref) {
    var m = /^(\d+):(\d+)(?:[–-](?:(\d+):)?(\d+))?$/.exec(ref);
    if (!m) return '';
    if (m[4]) return (m[3] || m[1]) + ':' + m[4];
    return m[1] + ':' + m[2];
  }
  function index() {
    if (IDX) return IDX;
    IDX = { m: {}, ins: {} };
    N.forEach(function (n, i) {
      var s = GNT_GRK.m[i], b = n[1];
      if (s) s.split(';').forEach(function (t) { var k = b + '|' + t.split(',')[0], a = IDX.m[k] || (IDX.m[k] = []); if (a.indexOf(i) < 0) a.push(i); });
      else if (n[4] === 'om.') { var k2 = b + '|' + lastKey(n[2]); (IDX.ins[k2] = IDX.ins[k2] || []).push(i); }
    });
    return IDX;
  }
  function marksOf(i) {
    return (GNT_GRK.m[i] || '').split(';').filter(Boolean).map(function (t) { var p = t.split(','); return { k: p[0], s: +p[1], e: +p[2] }; });
  }

  /* ---------- what an edition reads at a note ---------- */
  var OPEN = { 1: '[', 2: '[[', 3: '«' }, CLOSE = { 1: ']', 2: ']]', 3: '»' };
  function readingOf(n, ed, rk) {
    var bit = BIT[ed], rd = n[5].filter(function (r) { return r[1] !== 'txt' && (r[0] & bit); });
    if (!rd.length) return null;
    return rd[ed === 'RPmg' ? Math.min(rk, rd.length - 1) : 0];
  }
  function wrapR(r, ed, parts) {
    if (!(r[2] & BIT[ed])) return parts;
    var two = (r[5] & BIT[ed]) !== 0, o = two ? '[[' : '[', c = two ? ']]' : ']', last = parts.length - 1;
    return parts.map(function (p, i) { return (i === 0 ? o : '') + p + (i === last ? c : ''); });
  }
  /* The operations of one edition on one note: [{k, s, e, t}], or null when the note cannot be applied; ins = words after the verse */
  function applyNote(i, ed, rk, base) {
    var n = N[i], r = readingOf(n, ed, rk), marks = marksOf(i), out = [];
    if (r) {
      if ((r[3] || []).indexOf('other') >= 0) return null;
      if (!marks.length) return { ins: wrapR(r, ed, [r[1] === 'om.' ? '' : r[1]]).join(' '), ni: i, j: n[5].indexOf(r) + 1 };
      var parts;
      if (r[1] === 'om.' || (r[3] || []).indexOf('omitall') >= 0) parts = marks.map(function () { return ''; });
      else if (marks.length === 1) parts = [r[1]];
      else if (r[1].indexOf('…') >= 0) parts = r[1].split(/\s*…\s*/);
      else {
        var bw = marks.map(function (m) { return words(base(m.k).slice(m.s, m.e)).length; }), w = r[1].split(/\s+/), tot = bw.reduce(function (a, b) { return a + b; }, 0), at = 0;
        if (tot !== w.length) return null;
        parts = bw.map(function (c) { var p = w.slice(at, at + c).join(' '); at += c; return p; });
      }
      if (parts.length !== marks.length) return null;
      parts = wrapR(r, ed, parts);
      var ri = n[5].indexOf(r), off = 0;
      marks.forEach(function (m, q) { out.push({ k: m.k, s: m.s, e: m.e, t: parts[q], ni: i, j: ri + 1, off: off }); off += words(parts[q]).length; });
      return { ops: out };
    }
    var br = n[6].filter(function (b) { return b[1] & BIT[ed]; })[0];
    if (br && marks.length) {
      marks.forEach(function (m, q) {
        out.push({ k: m.k, s: m.s, e: m.e, t: null, open: q === 0 ? OPEN[br[0]] : '', close: q === marks.length - 1 ? CLOSE[br[0]] : '' });
      });
      return { ops: out };
    }
    return { ops: [] };
  }

  /* ---------- one verse ---------- */
  function collateVerse(b, key, text, rows) {
    var base = function (k) { return k === key ? text : (GNT_GRK.v[b][k] || ''); }, toks = baseTokens(text);
    var ix = index(), ids = (ix.m[b + '|' + key] || []).slice().sort(function (x, y) { return x - y; });
    var flags = [], ops = rows.map(function () { return []; }), ins = rows.map(function () { return []; });
    ids.forEach(function (i) {
      rows.forEach(function (row, ri) {
        var res = applyNote(i, row.ed, row.rk, base);
        if (!res) { var n = N[i]; if (readingOf(n, row.ed, row.rk)) { var f = n[2] + ' (' + n[3] + ')'; if (flags.indexOf(f) < 0) flags.push(f); } return; }
        (res.ops || []).forEach(function (o) { if (o.k === key) ops[ri].push(o); });
      });
    });
    var insNotes = (ix.ins[b + '|' + key] || []).slice().sort(function (x, y) { return x - y; });
    insNotes.forEach(function (i) {
      var any = false, cells = rows.map(function (row) {
        var res = applyNote(i, row.ed, row.rk, base);
        if (res && res.ins) { any = true; return words(res.ins).map(function (w, x) { return { w: w, src: { ni: res.ni, j: res.j, n: x } }; }); }
        return [];
      });
      if (any) ins.forEach(function (a, ri) { a.push(cells[ri]); });
      else { /* nothing shown reads it */ }
    });
    /* the units: the stretches where any row differs, joined when they overlap or touch */
    var spans = [];
    ops.forEach(function (list) { list.forEach(function (o) { spans.push([o.s, o.e]); }); });
    spans.sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });
    var units = [];
    spans.forEach(function (s) { var l = units[units.length - 1]; if (l && s[0] <= l[1]) l[1] = Math.max(l[1], s[1]); else units.push([s[0], s[1]]); });
    var cols = [], pos = 0;
    function plain(a, e) { toks.forEach(function (t) { if (t.s >= a && t.s < e) cols.push({ same: { w: t.w, src: { i: t.i } } }); }); }
    function baseRange(out, p, q, open, close) {
      var ts = toks.filter(function (t) { return t.s >= p && t.s < q; });
      ts.forEach(function (t, x) { out.push({ w: (x === 0 && open ? open : '') + t.w + (x === ts.length - 1 && close ? close : ''), src: { i: t.i } }); });
    }
    units.forEach(function (u) {
      plain(pos, u[0]);
      var bw = []; baseRange(bw, u[0], u[1], '', '');
      var bk = keyOf(bw.map(function (o) { return o.w; }));
      var cells = rows.map(function (row, ri) {
        var mine = ops[ri].filter(function (o) { return o.s >= u[0] && o.e <= u[1]; }).sort(function (x, y) { return x.s - y.s; }), ws = [], at = u[0];
        mine.forEach(function (o) {
          if (o.s < at) return;
          baseRange(ws, at, o.s, '', '');
          if (o.t != null) words(o.t).forEach(function (w, x) { ws.push({ w: w, src: { ni: o.ni, j: o.j, n: o.off + x } }); });
          else baseRange(ws, o.s, o.e, o.open, o.close);
          at = o.e;
        });
        baseRange(ws, at, u[1], '', '');
        return { w: ws, diff: keyOf(ws.map(function (o) { return o.w; })) !== bk };
      });
      cols.push({ base: bw, cells: cells });
      pos = u[1];
    });
    plain(pos, text.length);
    insNotes.length && ins[0].forEach(function (_, q) {
      var cells = rows.map(function (row, ri) { var w = ins[ri][q] || []; return { w: w, diff: w.length > 0 }; });
      cols.push({ base: [], cells: cells, added: true });
    });
    return { cols: cols, flags: flags, b: b, key: key, differs: cols.some(function (c) { return c.cells && c.cells.some(function (x) { return x.diff; }); }) };
  }

  /* ---------- drawing ---------- */
  /* each word can be pointed at: a word of the verse is looked up by its place in the verse, a word of a reading by its place in the reading */
  function wordsInto(parent, ws, b, key) {
    ws.forEach(function (o, i) {
      if (i) parent.appendChild(document.createTextNode(' '));
      var s = el('span', 'gw', o.w), r = o.src;
      if (r && r.ni != null) { s.dataset.ni = r.ni; s.dataset.j = r.j; s.dataset.n = r.n; }
      else if (r) { s.dataset.b = b; s.dataset.k = key; s.dataset.n = r.i; }
      else s.dataset.f = foldWord(o.w);
      parent.appendChild(s);
    });
  }
  function colWidth(c) {
    var len = function (a) { return a.map(function (o) { return o.w; }).join(' ').length; };
    if (c.same) return c.same.w.length + 2;
    var m = len(c.base);
    c.cells.forEach(function (x) { m = Math.max(m, len(x.w) || 7); });
    return m + 2;
  }
  function drawVerse(box, res, rows, avail) {
    box.textContent = '';
    /* on a narrow screen the verse stays on one line and slides sideways, with the edition names held in place */
    var per = avail < 560 ? 1e9 : Math.max(14, Math.floor((avail - LABEL) / CHAR)), lines = [[]], w = 0;
    res.cols.forEach(function (c) {
      var cw = colWidth(c);
      if (w + cw > per && lines[lines.length - 1].length) { lines.push([]); w = 0; }
      lines[lines.length - 1].push(c); w += cw;
    });
    lines.forEach(function (ln, li) {
      if (li) box.appendChild(el('div', 'coll-cont', 'the verse continues'));
      var wrap = el('div', 'coll-scroll'), t = el('table', 'coll-t');
      var all = [{ ed: null }].concat(rows);
      all.forEach(function (row, ri) {
        var tr = el('tr'), th = el('th'); th.scope = 'row';
        if (!row.ed) th.textContent = 'Main text'; else { edName(row.ed, th); if (row.n) th.appendChild(document.createTextNode(' ' + row.n)); }
        tr.appendChild(th);
        ln.forEach(function (c) {
          var td = el('td');
          if (c.same) { td.className = 'coll-s'; wordsInto(td, [c.same], res.b, res.key); }
          else {
            var cell = row.ed ? c.cells[ri - 1] : null, ws = row.ed ? cell.w : c.base;
            td.className = row.ed ? (cell.diff ? 'coll-d' : 'coll-b') : 'coll-m';
            if (ws.length) wordsInto(td, ws, res.b, res.key);
            else td.appendChild(el('i', null, row.ed ? 'omitted' : (c.added ? 'not in the main text' : '')));
          }
          tr.appendChild(td);
        });
        t.appendChild(tr);
      });
      wrap.appendChild(t); box.appendChild(wrap);
    });
  }

  function rowsFor(b, keys, texts) {
    var rows = [];
    chosen().forEach(function (ed) {
      if (ed !== 'RPmg') { rows.push({ ed: ed, rk: 0 }); return; }
      var most = 1, ix = index();
      keys.forEach(function (k) { (ix.m[b + '|' + k] || []).forEach(function (i) { var c = N[i][5].filter(function (r) { return r[1] !== 'txt' && (r[0] & BIT.RPmg); }).length; if (c > most) most = c; }); });
      for (var q = 0; q < most; q++) rows.push({ ed: 'RPmg', rk: q, n: most > 1 ? String(q + 1) : '' });
    });
    return rows;
  }

  function build(n, idx) {
    var b = n[1], vs = GR.verses(b, n[2]), lk = lastKey(n[2]);
    if (lk && !vs.some(function (v) { return v.key === lk; }) && (index().ins[b + '|' + lk] || []).length) vs.push({ key: lk, label: lk.split(':')[1], text: '' });
    var panel = el('div', 'coll-panel');
    var head = el('div', 'coll-head');
    var pick = el('div', 'coll-pick'); pick.appendChild(el('span', 'coll-lab', 'Editions shown:'));
    var boxes = ALL.map(function (e) {
      var l = el('label', 'coll-ck'), c = el('input'); c.type = 'checkbox'; c.checked = chosen().indexOf(e) >= 0; c.value = e;
      l.appendChild(c); l.appendChild(document.createTextNode(' ')); edName(e, l); pick.appendChild(l);
      c.addEventListener('change', function () {
        var now = boxes.filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
        if (!now.length) { c.checked = true; return; }
        sel = ALL.filter(function (x) { return now.indexOf(x) >= 0; }); saveChosen(); draw();
      });
      return c;
    });
    head.appendChild(pick);
    head.appendChild(el('p', 'coll-note', 'These are the editions whose texts this site may reproduce. Each is rebuilt from the main text and the notes, in lowercase without accents or punctuation. Shaded words differ from the main text; words in brackets are printed in brackets.'));
    head.appendChild(el('p', 'coll-slide', 'Slide the table sideways to read the whole verse.'));
    panel.appendChild(head);
    var body = el('div', 'coll-body'); panel.appendChild(body);
    var foot = el('p', 'coll-credit', 'SBL: SBL Greek New Testament, © 2010 Society of Biblical Literature and Logos Bible Software, licensed under Creative Commons Attribution 4.0. Shown here without accents or punctuation. Point at a word, or tap it, for its meaning and parsing.');
    panel.appendChild(foot);
    var lastW = 0;
    function draw() {
      var avail = panel.clientWidth || 320; lastW = avail;
      panel.classList.toggle('coll-narrow', avail < 560);
      body.textContent = '';
      var rows = rowsFor(b, vs.map(function (v) { return v.key; }));
      var flags = [];
      if (!vs.length) body.appendChild(el('p', 'coll-none', 'The text of this verse is not available.'));
      vs.forEach(function (v) {
        var sec = el('div', 'coll-v');
        sec.appendChild(el('h4', null, BOOKS[b] + ' ' + (vs.length > 1 ? v.key : n[2])));
        var res = collateVerse(b, v.key, v.text, rows);
        res.flags.forEach(function (f) { if (flags.indexOf(f) < 0) flags.push(f); });
        var holder = el('div', 'coll-lines'); sec.appendChild(holder);
        drawVerse(holder, res, rows, avail - 28);
        if (!res.differs) sec.appendChild(el('p', 'coll-same', 'The editions shown all read the main text here.'));
        body.appendChild(sec);
        sec.__res = res; sec.__rows = rows; sec.__holder = holder;
      });
      if (flags.length) body.appendChild(el('p', 'coll-flag', 'The note' + (flags.length > 1 ? 's' : '') + ' on ' + flags.join(', ') + ' cannot be shown in line here.'));
    }
    panel.__draw = draw;
    panel.__redraw = function () {
      if (Math.abs((panel.clientWidth || 0) - lastW) < 24) return;
      lastW = panel.clientWidth || lastW;
      [].forEach.call(body.querySelectorAll('.coll-v'), function (sec) { if (sec.__res) drawVerse(sec.__holder, sec.__res, sec.__rows, lastW - 28); });
    };
    return panel;
  }

  var API = window.GNT_COLL = {
    /* host is the row of buttons under the verse (Copy verse, Copy this note); the panel opens just below the line that follows it */
    attach: function (li, n, idx, host) {
      var btn = el('button', 'encopy coll-btn', /[–-]/.test(n[2]) ? 'Collate these verses' : 'Collate this verse');
      btn.type = 'button'; btn.setAttribute('aria-expanded', 'false');
      btn.title = 'Show this verse as each edition reads it, one above the other';
      host.appendChild(btn);
      var row = host.nextSibling || host;
      var panel = null, ro = null;
      function show(on) {
        if (panel) panel.hidden = !on;
        btn.setAttribute('aria-expanded', String(on));
        btn.textContent = (on ? 'Hide collation' : (/[–-]/.test(n[2]) ? 'Collate these verses' : 'Collate this verse'));
      }
      li.__collOpen = function () {
        if (panel && !panel.hidden) return;
        btn.click();
      };
      btn.addEventListener('click', function () {
        if (panel) { show(panel.hidden); return; }
        btn.disabled = true; btn.textContent = 'Loading…';
        var giveUp = setTimeout(function () { btn.disabled = false; show(false); }, 20000);
        GR.load(function () {
          clearTimeout(giveUp); btn.disabled = false;
          if (!window.GNT_GRK) { show(false); return; }
          panel = build(n, idx);
          row.parentNode.insertBefore(panel, row.nextSibling);
          panel.__draw(); show(true);
          if (window.ResizeObserver) { ro = new ResizeObserver(function () { if (panel.__redraw) panel.__redraw(); }); ro.observe(panel); }
        });
      });
    },
    /* open the collation of card li (used by the pin bar) */
    open: function (li) {
      if (!li || !li.__collOpen) return false;
      li.__collOpen();
      var p = li.querySelector('.coll-panel'); if (p && p.scrollIntoView) p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return true;
    }
  };
})();
