/* Word-by-word comparison of a reading with the main text, for the notes in Explore variants.
   Each reading gets a "Show comparison" button. The words, their Strong's numbers and parsings come from greek-words.js
   (loaded the first time a button is pressed): W.nt[note][0] is the main text and W.nt[note][reading + 1] a reading,
   one "strongs.code" entry per Greek word, in the same order that stats.js counts the Greek words of a note. */
(function () {
  'use strict';
  var TINTS = 6, SHORT = 6, uid = 0;

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  /* The Greek words of a text, each with its place in a bracketed stretch: o (opens one), c (closes one) */
  function tokens(text) {
    var re = /\S+/g, m, out = [], inside = false;
    out.gaps = [];                       /* gaps[i] = how many Greek words come before the i-th ellipsis */
    while ((m = re.exec(text))) {
      var t = m[0], o = t.charAt(0) === '[', c = t.charAt(t.length - 1) === ']';
      if (/^[\[\]]*…[\[\]]*$/.test(t)) { out.gaps.push(out.length); continue; }
      if (o) inside = true;
      if (window.GNT_TIP.fold(t)) {
        var bare = t.replace(/^\[+/, '').replace(/\]+$/, '');
        out.push({ w: bare, o: o, c: c, m: inside && !o && !c });
      }
      if (c) inside = false;
    }
    return out;
  }
  function shown(k) { return (k.o ? '[' : '') + k.w + (k.c ? ']' : ''); }

  /* A word's analysis, or null when the comparison editions' text gives none */
  function analysis(entry) {
    var W = window.GNT_WORDS;
    if (!entry || entry === '-') return null;
    var all = entry.split('|').map(function (p) { var a = p.split('.'); return [+a[0], +a[1]]; });
    var good = all.filter(function (a) { var c = W.codes[a[1]]; return !c || c[0] !== 'UNPARSED'; });
    var a = (good.length ? good : all)[0], d = W.dict[a[0]], c = W.codes[a[1]];
    return { s: a[0], lem: d ? d[0].split(',')[0] : '', g: d ? d[1] : '', p: c && c[0] !== 'UNPARSED' ? c[1] : '' };
  }

  function words(text, row) {
    var ks = tokens(text), es = row ? row.split(' ') : [];
    var out = ks.map(function (k, i) { k.a = analysis(es[i]); return k; });
    out.gaps = ks.gaps;
    return out;
  }

  function fold(w) { return window.GNT_TIP.fold(w); }
  /* The same spelling, allowing a movable nu or final sigma that one side prints in parentheses */
  function sameSpelling(a, b) {
    if (fold(a) === fold(b)) return true;
    var pairs = [[a, b], [b, a]];
    for (var i = 0; i < 2; i++) {
      var x = pairs[i][0], y = pairs[i][1], m = /\(([νσς])\)/.exec(y);
      if (m) { var r = fold(y.replace(m[0], '')); if (fold(x) === r || fold(x) === r + fold(m[1])) return true; }
    }
    return false;
  }
  function sameAnalysis(a, b) {
    if (!a || !b) return a === b;
    return a.s === b.s && a.p === b.p;
  }

  /* Do two words, taken as partners, differ in spelling? Accents and breathings count only when both words show them. */
  function spelledDifferently(a, b) {
    if (!sameSpelling(a, b)) return true;
    var acc = function (w) { return /[\u0300-\u036f]/.test(w.normalize('NFD')); };
    var strip = function (w) { return w.replace(/\([^)]*\)/g, '').normalize('NFC').toLowerCase(); };
    return acc(a) && acc(b) && strip(a) !== strip(b);
  }
  /* Which letters of each word to mark: the fewest letters whose removal leaves the same letters in the same order in both words
     (the longest common subsequence of letters is kept). Accents are compared only when both words show them; a parenthesis or an
     apostrophe is never marked. Returns two lists of true/false, one for each word's letters. */
  function diffMarks(a, b) {
    var x = Array.from(a.normalize('NFC')), y = Array.from(b.normalize('NFC'));
    var accA = /[\u0300-\u036f]/.test(a.normalize('NFD')), accB = /[\u0300-\u036f]/.test(b.normalize('NFD')), exact = accA && accB;
    function base(c) { return c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ'); }
    function neutral(c) { return /[()'’‘ʼ·,.;:\-]/.test(c); }
    function same(p, q) { return exact ? p.toLowerCase() === q.toLowerCase() : base(p) === base(q); }
    var ix = [], iy = [], i, j;
    x.forEach(function (c, k) { if (!neutral(c)) ix.push(k); });
    y.forEach(function (c, k) { if (!neutral(c)) iy.push(k); });
    var n = ix.length, m = iy.length, L = [];
    for (i = 0; i <= n; i++) { L.push([]); for (j = 0; j <= m; j++) L[i].push(0); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      L[i][j] = same(x[ix[i]], y[iy[j]]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var fa = x.map(function () { return false; }), fb = y.map(function () { return false; });
    i = 0; j = 0;
    while (i < n && j < m) {
      if (same(x[ix[i]], y[iy[j]])) { i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { fa[ix[i]] = true; i++; }
      else { fb[iy[j]] = true; j++; }
    }
    while (i < n) { fa[ix[i++]] = true; }
    while (j < m) { fb[iy[j++]] = true; }
    return [x, fa, y, fb];
  }
  /* How a word differs from its partner: '' (not at all), 'spell' (the same word, spelled differently), 'form' (the same dictionary
     word in a different form), 'parse' (the same spelling, parsed differently) or 'word' (a different dictionary word).
     When one side has no analysis, a spelling difference is all that can be told. */
  var RELNOTE = { spell: 'spelled differently', form: 'different form', parse: 'parsed differently', word: 'different word' };
  function relation(k, o) {
    if (!o) return '';
    var a = k.a, b = o.a, spell = spelledDifferently(k.w, o.w);
    if (a && b) {
      if (a.s !== b.s) return 'word';
      if (a.p !== b.p) return spell ? 'form' : 'parse';
    }
    return spell ? 'spell' : '';
  }
  /* Fill element e with word k; when it and its partner are the same word spelled differently, the letters that differ are marked.
     Returns how the two differ (see relation). */
  function fillWord(e, k, other) {
    var rel = relation(k, other);
    if (rel !== 'spell') { e.textContent = shown(k); return rel; }
    var d = diffMarks(k.w, other.w), x = d[0], f = d[1], run = '', on = false, any = false;
    function flush() { if (!run) return; if (on) { e.appendChild(el('mark', 'cmp-sp', run)); any = true; } else e.appendChild(document.createTextNode(run)); run = ''; }
    if (k.o) e.appendChild(document.createTextNode('['));
    x.forEach(function (c, i) { if (!!f[i] !== on) { flush(); on = !!f[i]; } run += c; });
    flush();
    if (k.c) e.appendChild(document.createTextNode(']'));
    return rel;
  }

  /* pair[j] is the main-text word that word j of the reading matches, or -1 for an added word */
  function align(B, V) {
    var used = {}, pair = V.map(function () { return -1; });
    V.forEach(function (v, j) {
      for (var i = 0; i < B.length; i++) if (!used[i] && fold(B[i].w) === fold(v.w)) { pair[j] = i; used[i] = true; break; }
    });
    V.forEach(function (v, j) {
      if (pair[j] >= 0 || !v.a) return;
      for (var i = 0; i < B.length; i++) if (!used[i] && B[i].a && B[i].a.s === v.a.s) { pair[j] = i; used[i] = true; break; }
    });
    return pair;
  }

  /* A main text with an ellipsis against a reading that has none: the words before the ellipsis are paired from the front of the
     reading and the words after it from the back. Reading words between the two ends fill the ellipsis (fill[j] = true). */
  function alignEll(B, V) {
    var used = {}, pair = V.map(function () { return -1; }), g = B.gaps[0], fill = {};
    var front = [], rear = [], i;
    for (i = 0; i < B.length; i++) (i < g ? front : rear).push(i);
    function find(b, from, to, step) {
      var j, pass;
      for (pass = 0; pass < 2; pass++)
        for (j = from; step > 0 ? j <= to : j >= to; j += step) {
          if (pair[j] >= 0) continue;
          if (pass === 0 ? fold(V[j].w) === fold(B[b].w) : (V[j].a && B[b].a && V[j].a.s === B[b].a.s)) return j;
        }
      return -1;
    }
    var lo = 0, hi = V.length - 1, j;
    front.forEach(function (b) { j = find(b, lo, hi, 1); if (j >= 0) { pair[j] = b; lo = j + 1; } });
    rear.slice().reverse().forEach(function (b) { j = find(b, hi, lo, -1); if (j >= 0) { pair[j] = b; hi = j - 1; } });
    for (j = lo; j <= hi; j++) if (pair[j] < 0) fill[j] = true;
    return { pair: pair, fill: fill };
  }


  /* A word of the verse as the notes print it: no accents, breathings, diaeresis or iota subscript, lower case, no closing punctuation */
  function plain(w) {
    return w.replace(/[,.;·∙:!?)]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').toLowerCase();
  }

  /* A main text whose note quotes only the ends of a stretch ("ει … υμων"): the whole stretch, taken from the verse text.
     Words the note quotes keep the note's own spelling and analysis; the rest are marked x. Returns null when it cannot be made. */
  function expandBase(n, idx, B) {
    var W = window.GNT_WORDS, G = window.GNT_GRK, GR = window.GNT_GR;
    if (!G || !GR || !GR.ready || !G.m || !G.m[idx] || !W.v) return null;
    var rs = G.m[idx].split(';').map(function (t) { var a = t.split(','); return { k: a[0], s: +a[1], e: +a[2] }; });
    var vs = GR.verses(n[1], n[2]);
    var first = rs[0], last = rs[rs.length - 1], on = false, out = [], qi = 0, i, ok = true;
    vs.forEach(function (v) {
      if (v.key === first.k) on = true;
      if (!on) return;
      var tags = (W.v[n[1]] && W.v[n[1]][v.key] || '').split(' '), re = /\S+/g, m, wi = 0;
      while ((m = re.exec(v.text))) {
        if (!fold(m[0])) continue;
        var s = m.index, e = s + m[0].length, tag = tags[wi++];
        if (v.key === first.k && e <= first.s) continue;
        if (v.key === last.k && s >= last.e) { on = on && v.key !== last.k ? on : on; continue; }
        var q = rs.some(function (r) { return r.k === v.key && s < r.e && e > r.s; });
        if (q) { var b = B[qi++]; if (!b) { ok = false; continue; } out.push(b); }
        else out.push({ w: plain(m[0]), o: false, c: false, m: false, x: true, a: analysis(tag) });
      }
      if (v.key === last.k) on = false;
    });
    return ok && qi === B.length && out.length ? out : null;
  }


  /* Pairs that keep their order: the longest run of identical words, then words with the same Strong's number between them */
  function alignOrdered(B, V) {
    var pair = V.map(function () { return -1; }), n = B.length, m = V.length, L = [], i, j;
    for (i = 0; i <= n; i++) { L[i] = []; for (j = 0; j <= m; j++) L[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      L[i][j] = fold(B[i].w) === fold(V[j].w) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    i = 0; j = 0;
    while (i < n && j < m) {
      if (fold(B[i].w) === fold(V[j].w)) { pair[j] = i; i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
    }
    var used = {}; pair.forEach(function (p) { if (p >= 0) used[p] = true; });
    var lo = 0;
    for (j = 0; j < m; j++) {
      if (pair[j] >= 0) { lo = pair[j] + 1; continue; }
      var hi = n; for (var t = j + 1; t < m; t++) if (pair[t] >= 0) { hi = pair[t]; break; }
      for (i = lo; i < hi; i++) if (!used[i] && B[i].a && V[j].a && B[i].a.s === V[j].a.s) { pair[j] = i; used[i] = true; lo = i + 1; break; }
    }
    return pair;
  }


  /* A word with a bracketed twin: when a reading has the same word inside brackets and outside them, the main-text word pairs with
     the one that is bracketed the same way (an unbracketed main-text word with the unbracketed one) */
  function preferSameBrackets(B, V, pair) {
    var br = function (k) { return !!(k.o || k.c || k.m); };
    var mono = function (pr) { var last = -1, ok = true; pr.forEach(function (p) { if (p >= 0) { if (p < last) ok = false; last = p; } }); return ok; };
    var was = mono(pair);
    V.forEach(function (v, j) {
      var i = pair[j];
      if (i < 0 || br(v) === br(B[i])) return;
      for (var j2 = 0; j2 < V.length; j2++) {
        if (pair[j2] >= 0 || br(V[j2]) !== br(B[i]) || fold(V[j2].w) !== fold(B[i].w)) continue;
        var t = pair.slice(); t[j2] = i; t[j] = -1;
        if (!was || mono(t)) { pair[j2] = i; pair[j] = -1; return; }
      }
    });
    return pair;
  }

  /* Between two pairs that are kept, words of the reading and of the main text that have no partner are a replacement when they are
     equally many: they pair one to one, in order. Where the reading has an ellipsis in that stretch, the reading's words before it pair
     with the first words of the main-text stretch and its words after it with the last ones. */
  function pairLeftovers(B, V, pair, gaps) {
    gaps = gaps || [];
    var anchors = [], k, s, i, j;
    pair.forEach(function (p, jj) { if (p >= 0) anchors.push([jj, p]); });
    for (k = 1; k < anchors.length; k++) if (anchors[k][1] < anchors[k - 1][1]) return pair;
    var bounds = [[-1, -1]].concat(anchors, [[V.length, B.length]]);
    for (s = 0; s < bounds.length - 1; s++) {
      var vs = bounds[s][0] + 1, ve = bounds[s + 1][0] - 1, bs = bounds[s][1] + 1, be = bounds[s + 1][1] - 1, vw = [], bw = [];
      for (j = vs; j <= ve; j++) vw.push(j);
      for (i = bs; i <= be; i++) bw.push(i);
      if (!vw.length || !bw.length) continue;
      var gs = gaps.filter(function (g) { return g >= vs && g <= ve + 1; });
      if (!gs.length) { if (vw.length === bw.length) vw.forEach(function (jj, x) { pair[jj] = bw[x]; }); continue; }
      var head = vw.filter(function (jj) { return jj < gs[0]; }), tail = vw.filter(function (jj) { return jj >= gs[gs.length - 1]; });
      if (head.length + tail.length > bw.length) continue;
      head.forEach(function (jj, x) { pair[jj] = bw[x]; });
      tail.forEach(function (jj, x) { pair[jj] = bw[bw.length - tail.length + x]; });
    }
    return pair;
  }

  function detail(a, spelling) {
    var d = el('div', 'cmp-d');
    var g = el('div', 'cmp-g', spelling); g.lang = 'grc'; d.appendChild(g);
    if (!a) { d.appendChild(el('div', 'cmp-n', 'No analysis is available for this word.')); return d; }
    d.appendChild(el('div', 'cmp-l', a.lem + ' · Strong’s ' + a.s));
    if (a.g) d.appendChild(el('div', 'cmp-gl', a.g));
    if (a.p) d.appendChild(el('div', 'cmp-p', a.p));
    return d;
  }

  /* One word as a full cell (short readings): its spelling, dictionary form, gloss and parsing */
  function uq(k) { return k.x ? ' cmp-uq' + (k.bs ? ' cmp-bs' : '') + (k.be ? ' cmp-be' : '') : ''; }
  function cell(k, num, tint, cls, note, label, part, other) {
    if (k.x) label += ', inside the ellipsis';
    var c = el('div', 'cmp-cell ' + tint + (cls ? ' ' + cls : ''));
    c.dataset.p = part; c.setAttribute('role', 'group'); c.setAttribute('aria-label', label); c.tabIndex = 0;
    c.appendChild(el('span', 'cmp-pos', String(num)));
    var g = el('div', 'cmp-gk'); g.lang = 'grc'; var rel = fillWord(g, k, other); c.appendChild(g);
    if (rel) { note = (note ? note + '; ' : '') + RELNOTE[rel]; label += ', ' + RELNOTE[rel]; c.setAttribute('aria-label', label); }
    var a = k.a;
    if (a) {
      var l = el('div', 'cmp-lm'); l.appendChild(el('b', null, a.lem)); l.appendChild(document.createTextNode(' · G' + a.s));
      c.appendChild(l);
      if (a.g) c.appendChild(el('div', 'cmp-gl', a.g));
      if (a.p) c.appendChild(el('div', 'cmp-pc' + (rel === 'form' || rel === 'parse' ? ' cmp-diff' : ''), a.p));
    } else c.appendChild(el('div', 'cmp-pc', 'No analysis available'));
    if (note) c.appendChild(el('div', 'cmp-nt', note));
    return c;
  }

  function chip(k, num, tint, part, label, other) {
    if (k.x) label += ', inside the ellipsis';
    var c = el('span', 'cmp-chip ' + tint);
    c.dataset.p = part; c.tabIndex = 0; c.setAttribute('role', 'group'); c.setAttribute('aria-label', label);
    c.appendChild(el('i', null, String(num)));
    var g = el('span'); g.lang = 'grc'; var rel = fillWord(g, k, other); if (rel) c.setAttribute('aria-label', label + ', ' + RELNOTE[rel]); c.appendChild(g);
    return c;
  }

  function build(n, idx, ri) {
    var W = window.GNT_WORDS, rows = W.nt && W.nt[idx];
    var wrap = el('div', 'cmp-panel');
    if (!rows) { wrap.appendChild(el('p', 'cmp-none', 'No word-by-word data is available for this note.')); return wrap; }
    var B = words(n[4], rows[0]), V = words(n[5][ri][1], rows[ri + 1]);
    var inGap = {}, pair, ex = null;
    if (B.gaps.length) ex = expandBase(n, idx, B);
    if (ex) {
      B = ex; B.gaps = [];
      pair = pairLeftovers(B, V, preferSameBrackets(B, V, alignOrdered(B, V)), V.gaps);
      if (V.gaps.length) {              /* an ellipsis in the reading covers the same words of the main text that lie between its neighbors */
        var V2 = [], p2 = [], j2, g2;
        V2.gaps = [];
        for (j2 = 0; j2 <= V.length; j2++) {
          V.gaps.forEach(function (g) {
            if (g !== j2) return;
            var lo = -1, hi = B.length, t;
            for (t = j2 - 1; t >= 0; t--) if (pair[t] >= 0) { lo = pair[t]; break; }
            for (t = j2; t < V.length; t++) if (pair[t] >= 0) { hi = pair[t]; break; }
            for (g2 = lo + 1; g2 < hi; g2++) {
              var cp = {}; for (var key in B[g2]) cp[key] = B[g2][key]; cp.x = true; cp.o = false; cp.c = false; cp.m = false;
              V2.push(cp); p2.push(g2);
            }
          });
          if (j2 < V.length) { V2.push(V[j2]); p2.push(pair[j2]); }
        }
        V = V2; pair = p2;
      }
    }
    else if (B.gaps.length && !V.gaps.length && V.length) { var ae = alignEll(B, V); pair = ae.pair; inGap = ae.fill; }
    else pair = pairLeftovers(B, V, preferSameBrackets(B, V, align(B, V)));
    var inRead = {};
    pair.forEach(function (p) { if (p >= 0) inRead[p] = true; });
    function partner(i) { for (var j = 0; j < pair.length; j++) if (pair[j] === i) return V[j]; return null; }
    [B, V].forEach(function (list) { list.forEach(function (k, i) { if (!k.x) return; k.bs = !(list[i - 1] && list[i - 1].x); k.be = !(list[i + 1] && list[i + 1].x); }); });
    var long = B.length > SHORT || V.length > SHORT, id = 'cmp' + (++uid);
    var info = el('div', 'cmp-info'); info.setAttribute('aria-live', 'polite');
    var holder = el('div', 'cmp-body');
    var DEFAULT = 'Point at a word, or select it, to see its dictionary form, Strong’s number, gloss and parsing here, with its partner’s details if they differ.';
    /* an ellipsis in the main text, or in the reading, is shown as a box of its own where it falls */
    function gapBox(kind) { var g = el('div', 'cmp-gapbox', kind === 'cell' ? '… words not quoted' : '…'); g.setAttribute('aria-label', 'An ellipsis: words that the note does not quote'); return g; }
    function withGaps(list, gaps, make, kind, host) {
      list.forEach(function (k, i) {
        gaps.forEach(function (g) { if (g === i) host.appendChild(gapBox(kind)); });
        host.appendChild(make(k, i));
      });
      gaps.forEach(function (g) { if (g >= list.length) host.appendChild(gapBox(kind)); });
    }
    var T = function (q) { return 'cmp-t' + (q % TINTS + 1); };

    if (!long) {
      var cols = Math.max(B.length + B.gaps.length, V.length + V.gaps.length, 1);
      var r1 = el('div', 'cmp-rowlab', 'Main text'), g1 = el('div', 'cmp-grid'); g1.style.setProperty('--n', cols);
      withGaps(B, B.gaps, function (k, i) {
        var om = !inRead[i];
        return cell(k, i + 1, T(i), (om ? 'cmp-om' : '') + uq(k), om ? 'not in this reading' : '', 'Main text word ' + (i + 1) + (om ? ', not in this reading' : ''), id + '-b' + i, partner(i));
      }, 'cell', g1);
      var r2 = el('div', 'cmp-rowlab', 'Reading'), g2 = el('div', 'cmp-grid'); g2.style.setProperty('--n', cols);
      withGaps(V, V.gaps, function (k, j) {
        var p = pair[j];
        if (inGap[j]) return cell(k, '…', 'cmp-fillbg', 'cmp-fl', 'inside the ellipsis', 'Inside the ellipsis of the main text', id + '-v' + j);
        if (p < 0) return cell(k, '+', 'cmp-add', 'cmp-ad', 'added', 'Added word, not in the main text', id + '-v' + j);
        return cell(k, p + 1, T(p), uq(k).trim(), '', 'Matches main text word ' + (p + 1), id + '-b' + p, B[p]);
      }, 'cell', g2);
      if (!V.length) g2.appendChild(el('div', 'cmp-empty', 'This reading has no words here: it omits the main text.'));
      [r1, g1, r2, g2].forEach(function (e) { holder.appendChild(e); });
    } else {
      /* a word is in place when it belongs to the longest run of paired words that keep their order; the rest moved, and
         moved words that sit side by side in both texts share a shade */
      var js = [], len = [], prv = [], bestEnd = -1, x, y;
      pair.forEach(function (p, j) { if (p >= 0) js.push(j); });
      js.forEach(function (j, x2) {
        len[x2] = 1; prv[x2] = -1;
        for (y = 0; y < x2; y++) if (pair[js[y]] < pair[j] && len[y] + 1 > len[x2]) { len[x2] = len[y] + 1; prv[x2] = y; }
        if (bestEnd < 0 || len[x2] > len[bestEnd]) bestEnd = x2;
      });
      var inPlace = {};
      for (x = bestEnd; x >= 0; x = prv[x]) inPlace[js[x]] = true;
      var tint = {}, next = 0, lastJ = -2, lastP = -2, cur = '';
      js.forEach(function (j) {
        var p = pair[j];
        if (inPlace[j]) { lastJ = -2; return; }
        if (!(lastJ === j - 1 && lastP === p - 1)) cur = T(next++);
        tint[p] = cur; lastJ = j; lastP = p;
      });
      pair.forEach(function (p, j) {
        if (p < 0 || !inPlace[j]) return;
        if (!sameSpelling(B[p].w, V[j].w) || !sameAnalysis(B[p].a, V[j].a)) tint[p] = T(next++);
      });
      var l1 = el('div', 'cmp-rowlab', 'Main text'), c1 = el('div', 'cmp-chips');
      withGaps(B, B.gaps, function (k, i) { return chip(k, i + 1, (inRead[i] ? (tint[i] || '') : 'cmp-om') + uq(k), id + '-b' + i, 'Main text word ' + (i + 1) + (inRead[i] ? '' : ', not in this reading'), partner(i)); }, 'chip', c1);
      var l2 = el('div', 'cmp-rowlab', 'Reading'), c2 = el('div', 'cmp-chips');
      withGaps(V, V.gaps, function (k, j) {
        var p = pair[j];
        if (inGap[j]) return chip(k, '…', 'cmp-fillbg', id + '-v' + j, 'Inside the ellipsis of the main text');
        return p < 0 ? chip(k, '+', 'cmp-add', id + '-v' + j, 'Added word, not in the main text') : chip(k, p + 1, (tint[p] || '') + uq(k), id + '-b' + p, 'Matches main text word ' + (p + 1), B[p]);
      }, 'chip', c2);
      if (!V.length) c2.appendChild(el('div', 'cmp-empty', 'This reading has no words here: it omits the main text.'));
      [l1, c1, l2, c2].forEach(function (e) { holder.appendChild(e); });
    }
    if (ex) holder.appendChild(el('p', 'cmp-legend', 'The main text’s note quotes only some of the words in this passage and uses “…” for the rest. The words under a red line are the ones the note leaves out, taken from the verse.'));
    holder.appendChild(info);

    function words2(part) {
      var m = /^(.*)-([bv])(\d+)$/.exec(part), out = [];
      if (!m) return out;
      if (m[2] === 'v') { out.push([null, V[+m[3]]]); return out; }
      var i = +m[3]; out.push([B[i], null]);
      for (var j = 0; j < pair.length; j++) if (pair[j] === i) out[0][1] = V[j];
      return out;
    }
    function fill(part) {
      info.textContent = '';
      if (!part) { if (long) info.textContent = DEFAULT; return; }
      if (!long) return;                       /* short readings show everything in their cells */
      var pr = words2(part)[0]; if (!pr) return;
      var b = pr[0], v = pr[1];
      if (b && v) {
        var same = sameSpelling(b.w, v.w) && sameAnalysis(b.a, v.a);
        if (same) {
          var one = detail(b.a, b.w === v.w ? b.w : b.w + ' (printed ' + v.w + ' in the reading)');
          one.appendChild(el('div', 'cmp-same', 'Identical in the main text and the reading.'));
          info.appendChild(one);
        } else {
          var two = el('div', 'cmp-two');
          [[b, 'Main text', v], [v, 'Reading', b]].forEach(function (x) {
            var d = detail(x[0].a, x[0].w), o = x[2];
            d.insertBefore(el('div', 'cmp-who', x[1]), d.firstChild);
            if (!sameSpelling(x[0].w, o.w)) d.querySelector('.cmp-g').classList.add('cmp-diff');
            if (x[0].a && o.a && x[0].a.s !== o.a.s) d.querySelector('.cmp-l').classList.add('cmp-diff');
            if (x[0].a && o.a && x[0].a.p !== o.a.p && d.querySelector('.cmp-p')) d.querySelector('.cmp-p').classList.add('cmp-diff');
            two.appendChild(d);
          });
          info.appendChild(two);
        }
      } else {
        var lone = detail((b || v).a, (b || v).w);
        lone.appendChild(el('div', 'cmp-same', !b && v && inGap[V.indexOf(v)] ? 'This word falls inside the ellipsis in the main text, which does not quote it.' : 'This word has no partner in the other line.'));
        info.appendChild(lone);
      }
    }

    var pinned = '', quiet = '';   /* quiet: a word just deselected by a click, which must not light up again while the pointer stays on it */
    function mark(part) {
      [].forEach.call(holder.querySelectorAll('.cmp-hl'), function (x) { x.classList.remove('cmp-hl'); });
      if (part) [].forEach.call(holder.querySelectorAll('[data-p="' + part + '"]'), function (x) { x.classList.add('cmp-hl'); });
      fill(part);
    }
    function partOf(t) { var c = t.closest && t.closest('[data-p]'); return c && holder.contains(c) ? c.dataset.p : ''; }
    /* Leaving a word clears the details only after a short wait, so crossing the gap to the next word does not flash the
       instruction text in between */
    var clearing = 0;
    function clearSoon() { clearTimeout(clearing); clearing = setTimeout(function () { if (!pinned) mark(''); }, 150); }
    function show(p) { clearTimeout(clearing); mark(p); }
    holder.addEventListener('mouseover', function (e) {
      var p = partOf(e.target);
      if (quiet) { if (p === quiet) return; quiet = ''; }
      if (pinned) return;
      if (p) show(p); else clearSoon();
    });
    holder.addEventListener('mouseleave', function () { quiet = ''; if (!pinned) clearSoon(); });
    holder.addEventListener('focusin', function (e) { if (!pinned) { var p = partOf(e.target); if (p) show(p); else clearSoon(); } });
    holder.addEventListener('focusout', function () { if (!pinned) clearSoon(); });
    holder.addEventListener('click', function (e) {
      var p = partOf(e.target);
      if (!p) { if (pinned) { pinned = ''; quiet = ''; show(''); } return; }
      clearTimeout(clearing); if (pinned === p) { pinned = ''; quiet = p; mark(''); } else { pinned = p; quiet = ''; mark(p); }
      e.stopPropagation();
    });
    holder.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var p = partOf(e.target); if (!p) return; e.preventDefault();
      clearTimeout(clearing); if (pinned === p) { pinned = ''; quiet = p; mark(''); } else { pinned = p; quiet = ''; mark(p); }
    });
    document.addEventListener('click', function (e) { if (pinned && !holder.contains(e.target)) { pinned = ''; show(''); } });
    fill('');
    wrap.appendChild(holder);
    return wrap;
  }

  window.GNT_CMP = {
    /* Put a "Show comparison" button on reading row d (reading number ri of note n, which is note idx in the list) */
    attach: function (d, n, idx, ri) {
      var btn = el('button', 'cmp-btn', 'Show comparison');
      btn.type = 'button'; btn.setAttribute('aria-expanded', 'false');
      var panel = null;
      btn.addEventListener('click', function () {
        if (panel) { var open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Hide comparison' : 'Show comparison'; return; }
        btn.disabled = true; btn.textContent = 'Loading…';
        var giveUp = setTimeout(function () { btn.disabled = false; btn.textContent = 'Show comparison'; }, 20000);
        var go = function () { window.GNT_TIP.load(function () {
          clearTimeout(giveUp); btn.disabled = false;
          if (!window.GNT_WORDS) { btn.textContent = 'Show comparison'; return; }
          panel = build(n, idx, ri);
          d.parentNode.insertBefore(panel, d.nextSibling);
          btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Hide comparison';
        }); };
        if (window.GNT_GR && n[4].indexOf('…') >= 0) window.GNT_GR.load(go); else go();
      });
      d.appendChild(btn);
    }
  };
})();
