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
    while ((m = re.exec(text))) {
      var t = m[0], o = t.charAt(0) === '[', c = t.charAt(t.length - 1) === ']';
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
    return ks.map(function (k, i) { k.a = analysis(es[i]); return k; });
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
  /* The letters of a that differ from b: [start, end) after the letters the two share at the front and the back */
  function diffSpan(a, b) {
    var x = Array.from(a.normalize('NFC')), y = Array.from(b.normalize('NFC')), i = 0, j = 0;
    while (i < x.length && i < y.length && x[i] === y[i]) i++;
    while (j < x.length - i && j < y.length - i && x[x.length - 1 - j] === y[y.length - 1 - j]) j++;
    var end = x.length - j;
    if (end <= i) { if (i > 0) return [x, i - 1, i]; if (x.length) return [x, 0, 1]; return [x, 0, 0]; }
    return [x, i, end];
  }
  /* Fill element e with word k; when other (its partner) is spelled differently, the letters that differ are marked */
  function fillWord(e, k, other) {
    if (!other || !spelledDifferently(k.w, other.w)) { e.textContent = shown(k); return false; }
    var d = diffSpan(k.w, other.w), x = d[0];
    if (k.o) e.appendChild(document.createTextNode('['));
    e.appendChild(document.createTextNode(x.slice(0, d[1]).join('')));
    var m = el('mark', 'cmp-sp', x.slice(d[1], d[2]).join('')); e.appendChild(m);
    e.appendChild(document.createTextNode(x.slice(d[2]).join('')));
    if (k.c) e.appendChild(document.createTextNode(']'));
    return true;
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
  function cell(k, num, tint, cls, note, label, part, other) {
    var c = el('div', 'cmp-cell ' + tint + (cls ? ' ' + cls : ''));
    c.dataset.p = part; c.setAttribute('role', 'group'); c.setAttribute('aria-label', label); c.tabIndex = 0;
    c.appendChild(el('span', 'cmp-pos', String(num)));
    var g = el('div', 'cmp-gk'); g.lang = 'grc'; var sp = fillWord(g, k, other); c.appendChild(g);
    if (sp) { note = (note ? note + '; ' : '') + 'spelled differently'; label += ', spelled differently'; c.setAttribute('aria-label', label); }
    var a = k.a;
    if (a) {
      var l = el('div', 'cmp-lm'); l.appendChild(el('b', null, a.lem)); l.appendChild(document.createTextNode(' · G' + a.s));
      c.appendChild(l);
      if (a.g) c.appendChild(el('div', 'cmp-gl', a.g));
      if (a.p) c.appendChild(el('div', 'cmp-pc', a.p));
    } else c.appendChild(el('div', 'cmp-pc', 'No analysis available'));
    if (note) c.appendChild(el('div', 'cmp-nt', note));
    return c;
  }

  function chip(k, num, tint, part, label, other) {
    var c = el('span', 'cmp-chip ' + tint);
    c.dataset.p = part; c.tabIndex = 0; c.setAttribute('role', 'group'); c.setAttribute('aria-label', label);
    c.appendChild(el('i', null, String(num)));
    var g = el('span'); g.lang = 'grc'; if (fillWord(g, k, other)) c.setAttribute('aria-label', label + ', spelled differently'); c.appendChild(g);
    return c;
  }

  function build(n, idx, ri) {
    var W = window.GNT_WORDS, rows = W.nt && W.nt[idx];
    var wrap = el('div', 'cmp-panel');
    if (!rows) { wrap.appendChild(el('p', 'cmp-none', 'No word-by-word data is available for this note.')); return wrap; }
    var B = words(n[4], rows[0]), V = words(n[5][ri][1], rows[ri + 1]);
    var pair = align(B, V), inRead = {};
    pair.forEach(function (p) { if (p >= 0) inRead[p] = true; });
    function partner(i) { for (var j = 0; j < pair.length; j++) if (pair[j] === i) return V[j]; return null; }
    var long = B.length > SHORT || V.length > SHORT, id = 'cmp' + (++uid);
    var info = el('div', 'cmp-info'); info.setAttribute('aria-live', 'polite');
    var holder = el('div', 'cmp-body');
    var DEFAULT = 'Point at a word, or select it, to see its dictionary form, Strong’s number, gloss and parsing here, with its partner’s details if they differ.';

    if (!long) {
      var cols = Math.max(B.length, V.length, 1);
      var r1 = el('div', 'cmp-rowlab', 'Main text'), g1 = el('div', 'cmp-grid'); g1.style.setProperty('--n', cols);
      B.forEach(function (k, i) {
        var om = !inRead[i];
        g1.appendChild(cell(k, i + 1, 'cmp-t' + (i % TINTS + 1), om ? 'cmp-om' : '', om ? 'not in this reading' : '', 'Main text word ' + (i + 1) + (om ? ', not in this reading' : ''), id + '-b' + i, partner(i)));
      });
      var r2 = el('div', 'cmp-rowlab', 'Reading'), g2 = el('div', 'cmp-grid'); g2.style.setProperty('--n', cols);
      V.forEach(function (k, j) {
        var p = pair[j];
        if (p < 0) g2.appendChild(cell(k, '+', 'cmp-add', 'cmp-ad', 'added', 'Added word, not in the main text', id + '-v' + j));
        else g2.appendChild(cell(k, p + 1, 'cmp-t' + (p % TINTS + 1), '', '', 'Matches main text word ' + (p + 1), id + '-b' + p, B[p]));
      });
      if (!V.length) g2.appendChild(el('div', 'cmp-empty', 'The reading has no words here.'));
      [r1, g1, r2, g2].forEach(function (e) { holder.appendChild(e); });
    } else {
      /* blocks of words that keep their order together; the biggest block that did not move stays plain */
      var blocks = [];
      pair.forEach(function (p, j) {
        var last = blocks.length ? blocks[blocks.length - 1] : null;
        if (p >= 0 && last && last.p[last.p.length - 1] === p - 1 && last.j[last.j.length - 1] === j - 1) { last.p.push(p); last.j.push(j); }
        else blocks.push({ p: [p], j: [j] });
      });
      var big = -1, bigN = 0;
      blocks.forEach(function (b, q) { if (b.p[0] >= 0 && b.p.length > bigN) { big = q; bigN = b.p.length; } });
      var tint = {}, next = 0, jb = {};
      blocks.forEach(function (b, q) { b.j.forEach(function (j) { jb[j] = q; }); });
      blocks.forEach(function (b, q) { if (q !== big && b.p[0] >= 0) { var t = 'cmp-t' + (next++ % TINTS + 1); b.p.forEach(function (p) { tint[p] = t; }); } });
      pair.forEach(function (p, j) {
        if (p < 0 || jb[j] !== big) return;
        if (!sameSpelling(B[p].w, V[j].w) || !sameAnalysis(B[p].a, V[j].a)) tint[p] = 'cmp-t' + (next++ % TINTS + 1);
      });
      var l1 = el('div', 'cmp-rowlab', 'Main text'), c1 = el('div', 'cmp-chips');
      B.forEach(function (k, i) { c1.appendChild(chip(k, i + 1, inRead[i] ? (tint[i] || '') : 'cmp-om', id + '-b' + i, 'Main text word ' + (i + 1) + (inRead[i] ? '' : ', not in this reading'), partner(i))); });
      var l2 = el('div', 'cmp-rowlab', 'Reading'), c2 = el('div', 'cmp-chips');
      V.forEach(function (k, j) {
        var p = pair[j];
        c2.appendChild(p < 0 ? chip(k, '+', 'cmp-add', id + '-v' + j, 'Added word, not in the main text') : chip(k, p + 1, tint[p] || '', id + '-b' + p, 'Matches main text word ' + (p + 1), B[p]));
      });
      [l1, c1, l2, c2].forEach(function (e) { holder.appendChild(e); });
    }
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
        lone.appendChild(el('div', 'cmp-same', 'This word has no partner in the other line.'));
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
    holder.addEventListener('mouseover', function (e) {
      var p = partOf(e.target);
      if (quiet) { if (p === quiet) return; quiet = ''; }
      if (!pinned) mark(p);
    });
    holder.addEventListener('mouseleave', function () { quiet = ''; if (!pinned) mark(''); });
    holder.addEventListener('focusin', function (e) { if (!pinned) mark(partOf(e.target)); });
    holder.addEventListener('focusout', function () { if (!pinned) mark(''); });
    holder.addEventListener('click', function (e) {
      var p = partOf(e.target);
      if (!p) { if (pinned) { pinned = ''; quiet = ''; mark(''); } return; }
      if (pinned === p) { pinned = ''; quiet = p; mark(''); } else { pinned = p; quiet = ''; mark(p); }
      e.stopPropagation();
    });
    holder.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var p = partOf(e.target); if (!p) return; e.preventDefault();
      if (pinned === p) { pinned = ''; quiet = p; mark(''); } else { pinned = p; quiet = ''; mark(p); }
    });
    document.addEventListener('click', function (e) { if (pinned && !holder.contains(e.target)) { pinned = ''; mark(''); } });
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
        window.GNT_TIP.load(function () {
          clearTimeout(giveUp); btn.disabled = false;
          if (!window.GNT_WORDS) { btn.textContent = 'Show comparison'; return; }
          panel = build(n, idx, ri);
          d.parentNode.insertBefore(panel, d.nextSibling);
          btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Hide comparison';
        });
      });
      d.appendChild(btn);
    }
  };
})();
