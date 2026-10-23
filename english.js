/* The English text (the Boyd ASVBT, an American Standard Version; public domain), verse for verse with this edition.
   The text itself is in asv.js, which is loaded the first time a page needs it. */
(function () {
  'use strict';
  var state = 0, waiting = [], ORDER = [];
  var EN = window.GNT_EN = { ready: false };

  var BOOKS = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
  function booksList() { return BOOKS; }

  /* Load asv.js once, then run every function waiting for it */
  EN.load = function (cb) {
    if (state === 2) { if (cb) cb(); return; }
    if (cb) waiting.push(cb);
    if (state === 1) return;
    state = 1;
    var s = document.createElement('script');
    s.src = 'asv.js';
    s.onload = function () {
      state = 2; EN.ready = true;
      (window.GNT_ASV || []).forEach(function (b, bi) {
        ORDER[bi] = Object.keys(b).map(function (k) { var p = k.split(':'); return [+p[0], +p[1], k]; });
      });
      var q = waiting; waiting = []; q.forEach(function (f) { f(); });
    };
    s.onerror = function () { state = 0; };
    document.head.appendChild(s);
  };

  /* Whether to show the English at all: a choice kept on this device (shown unless the visitor has turned it off) */
  var KEY = 'gnt-show-english';
  var state_shown = true;   /* used when this device will not keep the choice */
  EN.shown = function () { try { return localStorage.getItem(KEY) !== 'no'; } catch (e) { return state_shown; } };
  EN.setShown = function (on) {
    try { if (on) localStorage.removeItem(KEY); else localStorage.setItem(KEY, 'no'); } catch (e) {}
    state_shown = on;
    document.dispatchEvent(new Event('gntenglish'));   /* every switch on the page follows the choice */
  };

  EN.bookIndex = function (name) { return booksList().indexOf(name); };

  /* The verses a note or variant covers: "1:25", "1:7–8", or "7:53–8:11". Returns [{label, text}], or [] when the edition prints no verse there. */
  EN.verses = function (bi, ref) {
    if (!EN.ready || bi < 0 || !ORDER[bi]) return [];
    var m = /^(\d+):(\d+)(?:[–-](\d+)(?::(\d+))?)?$/.exec(ref);
    if (!m) return [];
    var c1 = +m[1], v1 = +m[2], c2 = c1, v2 = v1;
    if (m[4]) { c2 = +m[3]; v2 = +m[4]; } else if (m[3]) { v2 = +m[3]; }
    var multiChapter = c2 !== c1, out = [], B = window.GNT_ASV[bi];
    ORDER[bi].forEach(function (p) {
      var afterStart = p[0] > c1 || (p[0] === c1 && p[1] >= v1);
      var beforeEnd = p[0] < c2 || (p[0] === c2 && p[1] <= v2);
      if (afterStart && beforeEnd) out.push({ label: multiChapter ? p[0] + ':' + p[1] : String(p[1]), text: B[p[2]] });
    });
    return out;
  };

  /* Words as they are compared in a search: lower case, letters and digits only, one space between words */
  EN.norm = function (s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  };
  /* "love one another" is three words that must all occur; "love one another" in quotation marks is one phrase */
  EN.pieces = function (input) {
    var out = [], re = /"([^"]*)"|(\S+)/g, m;
    while ((m = re.exec(input || ''))) {
      var p = EN.norm(m[1] !== undefined ? m[1] : m[2]);
      if (p) out.push(p);
    }
    return out;
  };
  /* The text of a note's verses, ready for matching (every word is preceded by a space, so each piece must begin a word) */
  EN.haystack = function (bi, ref) {
    return ' ' + EN.norm(EN.verses(bi, ref).map(function (v) { return v.text; }).join(' ')) + ' ';
  };
  EN.matches = function (hay, pieces) {
    for (var i = 0; i < pieces.length; i++) if (hay.indexOf(' ' + pieces[i]) < 0) return false;
    return true;
  };
  /* Character ranges of text that match the pieces; a match is stretched to the end of its word */
  EN.ranges = function (text, pieces) {
    if (!pieces.length) return [];
    var ns = ' ', map = [-1], sp = true, i, ch, f, j;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      f = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      if (!/[a-z0-9]/.test(f)) { if (!sp) { ns += ' '; map.push(i); sp = true; } continue; }
      for (j = 0; j < f.length; j++) { ns += f.charAt(j); map.push(i); }
      sp = false;
    }
    var r = [];
    pieces.forEach(function (pc) {
      var needle = ' ' + pc;
      for (var at = ns.indexOf(needle); at >= 0; at = ns.indexOf(needle, at + 1)) {
        var s = at + 1, e = at + needle.length - 1;           /* ns index of first and last matched character */
        while (e + 1 < ns.length && ns.charAt(e + 1) !== ' ') e++;
        r.push([map[s], map[e] + 1]);
      }
    });
    r.sort(function (a, b) { return a[0] - b[0]; });
    var out = [];
    r.forEach(function (x) { var l = out[out.length - 1]; if (l && x[0] <= l[1]) { if (x[1] > l[1]) l[1] = x[1]; } else out.push([x[0], x[1]]); });
    return out;
  };

  function put(parent, text, rg) {
    var at = 0;
    rg.forEach(function (r) {
      if (r[0] > at) parent.appendChild(document.createTextNode(text.slice(at, r[0])));
      var m = document.createElement('mark'); m.className = 'hit'; m.textContent = text.slice(r[0], r[1]); parent.appendChild(m);
      at = r[1];
    });
    if (at < text.length) parent.appendChild(document.createTextNode(text.slice(at)));
  }

  /* Put the English of a passage into parent. Long passages show the first two verses, with a button for the rest.
     "pieces" are search words to highlight. Returns the number of verses (0 when there is none). */
  EN.render = function (parent, bi, ref, pieces) {
    var vs = EN.verses(bi, ref);
    if (!vs.length) return 0;
    var rest = null, LIM = 3;
    vs.forEach(function (v, i) {
      var host = parent;
      if (vs.length > LIM && i >= 2) {
        if (!rest) { rest = document.createElement('span'); rest.hidden = true; parent.appendChild(rest); }
        host = rest;
      }
      if (vs.length > 1) { var n = document.createElement('sup'); n.className = 'envn'; n.textContent = v.label; host.appendChild(n); }
      put(host, v.text, EN.ranges(v.text, pieces || []));
      host.appendChild(document.createTextNode(' '));
    });
    if (rest) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'enmore';
      var more = 'Show all ' + vs.length + ' verses', less = 'Show fewer';
      b.textContent = more; b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        rest.hidden = !rest.hidden; b.textContent = rest.hidden ? more : less; b.setAttribute('aria-expanded', rest.hidden ? 'false' : 'true');
      });
      parent.appendChild(b);
    }
    return vs.length;
  };

  /* Text for the clipboard: the citation, then the verses. With no options it is the English alone.
     opt.greek and opt.english say which of the two to include; the Greek is plain text, without underlining. */
  function lines(vs) { return vs.map(function (v) { return v.label + ' ' + v.text; }).join('\n'); }
  EN.copyText = function (bi, ref, opt) {
    var name = booksList()[bi], useEn = !opt || opt.english !== false, useGr = !!(opt && opt.greek);
    var en = useEn ? EN.verses(bi, ref) : [], gr = (useGr && window.GNT_GR) ? GNT_GR.verses(bi, ref) : [];
    if (!en.length && !gr.length) return '';
    if (!gr.length) {
      var head = name + ' ' + ref + ' (ASVBT)';
      return en.length === 1 ? head + '\n' + en[0].text : head + '\n' + lines(en);
    }
    function block(label, vs) { return vs.length === 1 ? label + ': ' + vs[0].text : label + ':\n' + lines(vs); }
    var parts = [name + ' ' + ref, block('Greek', gr)];
    if (en.length) parts.push(block('English (ASVBT)', en));
    return parts.join('\n');
  };
  EN.copyButton = function (bi, ref) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'encopy'; b.textContent = 'Copy verse';
    b.title = 'Copy the reference and the English text';
    b.addEventListener('click', function () { if (window.GNT_copy) window.GNT_copy(EN.copyText(bi, ref), b, 'Copied'); });
    return b;
  };
  /* The English line for a note or variant: a label, the verses, and the copy button */
  EN.line = function (bi, ref, pieces, force, nocopy) {
    if (!force && !EN.shown()) return null;
    var d = document.createElement('div'); d.className = 'enline';
    var lab = document.createElement('span'); lab.className = 'enlab'; var sc = document.createElement('span'); sc.className = 'ensc'; sc.textContent = 'ASVBT'; lab.appendChild(sc); lab.appendChild(document.createTextNode(': ')); d.appendChild(lab);
    var body = document.createElement('span'); body.className = 'entext'; d.appendChild(body);
    if (!EN.render(body, bi, ref, pieces)) return null;
    if (!nocopy) d.appendChild(EN.copyButton(bi, ref));
    return d;
  };
})();
