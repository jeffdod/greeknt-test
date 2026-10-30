/* The Read page: look up a passage, read it in Greek and English, and search the Greek, the English and the notes. */
(function () {
  'use strict';
  var P = window.GNT_PASSAGE, EN = window.GNT_EN;
  if (!P) return;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var GREEKRE = /[Ͱ-Ͽἀ-῿]/;

  var greekReady = false, wordsReady = false, englishReady = false, notesReady = false, hintsReady = false;
  var cur = { parts: [], view: 'both', notes: false };

  /* ---------- small helpers ---------- */
  function fold(w) { return w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ').replace(/[^α-ω]/g, ''); }
  function plural(n, one, many) { return n.toLocaleString('en-US') + ' ' + (n === 1 ? one : (many || one + 's')); }
  function greekOf(v) { return window.GNT_GRK.v[v.b][v.key]; }
  function englishOf(v) { var a = window.GNT_ASV && window.GNT_ASV[v.b]; return a ? a[v.key] || '' : ''; }
  function dash(s) { return s.replace(/-/g, '–'); }
  function toGreek(q) {
    return window.GNTGreek ? window.GNTGreek.toGreek(q, true) : q;
  }

  /* A Greek verse, each word in a span that can be pointed at; hits is {wordNumber: true} for words to highlight */
  function greekVerse(parent, v, hits) {
    var text = greekOf(v), re = /[^\s—]+/g, m, at = 0, n = 0;
    while ((m = re.exec(text))) {
      if (m.index > at) parent.appendChild(document.createTextNode(text.slice(at, m.index)));
      var w = el('span', 'gw'); w.dataset.b = v.b; w.dataset.k = v.key; w.dataset.n = n;
      if (hits && hits[n]) { var mk = el('mark', '', m[0]); w.appendChild(mk); } else w.textContent = m[0];
      parent.appendChild(w);
      at = m.index + m[0].length; n++;
    }
    if (at < text.length) parent.appendChild(document.createTextNode(text.slice(at)));
  }
  function verseNum(v, multi) { return el('sup', 'envn', multi ? v.c + ':' + v.v : String(v.v)); }

  /* English text with the stretches in ranges [[start, end], ...] marked */
  function markText(parent, text, ranges) {
    var at = 0;
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    ranges.forEach(function (r) {
      if (r[0] < at) return;
      if (r[0] > at) parent.appendChild(document.createTextNode(text.slice(at, r[0])));
      parent.appendChild(el('mark', '', text.slice(r[0], r[1]))); at = r[1];
    });
    if (at < text.length) parent.appendChild(document.createTextNode(text.slice(at)));
  }

  /* ---------- notes ---------- */
  function edLabel(parent, name) {
    if (name === 'RPmg') { parent.appendChild(document.createTextNode('RP')); parent.appendChild(el('sup', '', 'mg')); }
    else parent.appendChild(document.createTextNode(name === 'ECMs' ? 'ECM†' : name));
  }
  /* One note, set out as in the apparatus. mark(textNodeParent, text) may highlight words. */
  function noteEl(i, mark) {
    var D = window.GNT_NOTES, n = D.notes[i], box = el('p', 'rd-note');
    box.appendChild(el('span', 'rd-ncall', n[3]));
    box.appendChild(document.createTextNode(' ' + n[2] + ' '));
    var lem = el('span', 'greek', ''); lem.lang = 'grc'; if (mark) mark(lem, n[4]); else lem.textContent = n[4]; box.appendChild(lem);
    n[5].forEach(function (r) {
      box.appendChild(document.createTextNode(' ¦ '));
      var names = D.eds.filter(function (e, k) { return r[0] & (1 << k); });
      names.forEach(function (e, k) { if (k) box.appendChild(document.createTextNode(' ')); edLabel(box, e); });
      box.appendChild(document.createTextNode(' '));
      var t = el('span', 'greek', ''); t.lang = 'grc';
      if (r[1] === 'txt') t.textContent = 'txt'; else if (mark) mark(t, r[1]); else t.textContent = r[1];
      box.appendChild(t);
    });
    return box;
  }
  function addNotes(host, verses, map) {
    verses.forEach(function (v) {
      var list = map[v.key]; if (!list) return;
      var slot = host.querySelector('[data-nk="' + v.b + '|' + v.key + '"]');
      if (!slot || slot.dataset.done) return;
      slot.dataset.done = '1';
      list.forEach(function (i) { slot.appendChild(noteEl(i)); });
    });
  }

  /* ---------- reading view ---------- */
  function renderPassage(parts) {
    var host = $('rdText'); host.textContent = '';
    parts.forEach(function (part) {
      var sec = el('article', 'rd-seg');
      sec.appendChild(el('h2', '', part.label));
      var multi = part.verses.length > 1 && part.verses[0].c !== part.verses[part.verses.length - 1].c;
      part.verses.forEach(function (v) {
        var row = el('div', 'rd-v');
        var g = el('div', 'rd-g'); g.lang = 'grc'; g.appendChild(verseNum(v, multi)); greekVerse(g, v); row.appendChild(g);
        var e = el('div', 'rd-e'); e.appendChild(verseNum(v, multi)); e.appendChild(document.createTextNode(englishOf(v))); row.appendChild(e);
        var nk = el('div', 'rd-notes'); nk.dataset.nk = v.b + '|' + v.key; row.appendChild(nk);
        sec.appendChild(row);
      });
      host.appendChild(sec);
    });
    $('rdOutSec').hidden = false;
    if (cur.notes) loadNotesInto();
  }
  function loadNotesInto() {
    P.loadNotes(function (ok) {
      if (!ok) { $('rdStatus').textContent = 'The notes could not be loaded.'; return; }
      cur.parts.forEach(function (part) { addNotes($('rdText'), part.verses, P.notesFor(part.verses)); });
    });
  }
  function setView(v) {
    cur.view = v;
    var o = $('rdOut'); o.className = 'rd-out view-' + v + (cur.notes ? ' shownotes' : '');
    var r = document.querySelector('input[name="view"][value="' + v + '"]'); if (r) r.checked = true;
  }
  function showPassage(parts, push) {
    cur.parts = parts;
    renderPassage(parts);
    var text = P.canon(parts);
    remember(text);
    if (push) { try { history.replaceState(null, '', location.pathname + '?p=' + encodeURIComponent(text).replace(/%20/g, '+').replace(/%3A/g, ':').replace(/%2C/g, ',') + (cur.view !== 'both' ? '&view=' + cur.view : '') + (cur.notes ? '&notes=1' : '')); } catch (e) {} }
    if (!$('rdVocab').hidden) openVocab(false);
    $('rdOutSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /* The vocabulary list for the passage being read */
  function openVocab(scroll) {
    if (!window.GNT_VOCAB || !cur.parts.length) return;
    GNT_VOCAB.setPassage(P.canon(cur.parts));
    $('rdVocab').hidden = false; GNT_VOCAB.open();
    if (scroll) $('rdVocab').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- recent passages ---------- */
  var RKEY = 'gnt-read-recent';
  function recent() { try { return JSON.parse(localStorage.getItem(RKEY)) || []; } catch (e) { return []; } }
  function remember(text) {
    var r = recent().filter(function (x) { return x !== text; }); r.unshift(text); r = r.slice(0, 6);
    try { localStorage.setItem(RKEY, JSON.stringify(r)); } catch (e) {}
    showRecent();
  }
  function showRecent() {
    var r = recent(), box = $('rdRecent');
    box.hidden = !r.length; var list = $('rdRecentList'); list.textContent = '';
    r.forEach(function (t) {
      var b = el('button', 'rd-ex', dash(t)); b.type = 'button'; b.dataset.p = t;
      b.addEventListener('click', function () { $('rdRange').value = t; update(true); });
      list.appendChild(b); list.appendChild(document.createTextNode(' '));
    });
  }

  /* ---------- preview cards ---------- */
  var timer = null;
  function update(open) {
    clearTimeout(timer);
    var txt = $('rdRange').value, msg = $('rdMsg'), box = $('rdCards');
    box.textContent = ''; msg.textContent = ''; msg.className = 'rd-msg';
    if (!txt.trim()) return;
    if (!greekReady) { msg.textContent = 'Loading the text…'; return; }
    var r = P.lookup(txt);
    if (r.error) { msg.textContent = r.error; msg.className = 'rd-msg rd-bad'; return; }
    if (r.warn) msg.textContent = r.warn;
    cur.next = r.parts;
    syncPick(r.parts[0]);
    r.parts.forEach(function (part) { box.appendChild(card(part)); });
    if (r.parts.length > 1) {
      var all = el('button', 'btn btn-primary rd-all', 'Read all ' + r.parts.length + ' passages'); all.type = 'button';
      all.addEventListener('click', function () { showPassage(r.parts, true); });
      box.appendChild(all);
    }
    if (open) showPassage(r.parts, true);
  }
  function countWords(part) {
    var n = 0; part.verses.forEach(function (v) { n += P.tokens(greekOf(v)).length; }); return n;
  }
  function card(part) {
    var c = el('article', 'rd-card');
    c.appendChild(el('h3', '', part.label));
    var facts = el('p', 'rd-facts');
    facts.textContent = plural(part.verses.length, 'verse') + ', ' + plural(countWords(part), 'Greek word');
    var nc = el('span', 'rd-ncount', ''); facts.appendChild(nc);
    c.appendChild(facts);
    P.loadNotes(function (ok) {
      if (!ok) return;
      var map = P.notesFor(part.verses), k = 0; Object.keys(map).forEach(function (x) { k += map[x].length; });
      nc.textContent = ', ' + plural(k, 'note');
    });
    var v = part.verses[0];
    var g = el('p', 'rd-prev greek'); g.lang = 'grc'; g.appendChild(verseNum(v, part.verses.length > 1)); g.appendChild(document.createTextNode(greekOf(v))); c.appendChild(g);
    var e = el('p', 'rd-prev'); e.appendChild(verseNum(v, part.verses.length > 1)); e.appendChild(document.createTextNode(englishOf(v) || '')); c.appendChild(e);
    var b = el('button', 'btn btn-primary', 'Read'); b.type = 'button';
    b.addEventListener('click', function () { showPassage([part], true); });
    c.appendChild(b);
    return c;
  }

  /* ---------- the verse grid ---------- */
  var pick = { b: 3, c: 3, a: 0, z: 0 };
  function buildPick() {
    var sb = $('rdBook'); P.books.forEach(function (n, i) { sb.appendChild(new Option(n, i)); });
    sb.value = pick.b; fillChapters(); drawVerses();
    sb.addEventListener('change', function () { pick.b = +sb.value; pick.c = 1; pick.a = pick.z = 0; fillChapters(); drawVerses(); });
    $('rdChap').addEventListener('change', function () { pick.c = +$('rdChap').value; pick.a = pick.z = 0; drawVerses(); });
    $('rdVerses').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var v = +b.dataset.v;
      if (!pick.a || pick.a !== pick.z) { pick.a = pick.z = v; }
      else { if (v < pick.a) { pick.z = pick.a; pick.a = v; } else pick.z = v; }
      drawVerses();
      var name = P.books[pick.b], t = name + ' ' + pick.c + ':' + pick.a + (pick.z !== pick.a ? '-' + pick.z : '');
      $('rdRange').value = t; update(false);
    });
  }
  function fillChapters() {
    if (!greekReady) return;
    var ch = P.chapters(pick.b), sc = $('rdChap'); sc.textContent = '';
    Object.keys(ch).forEach(function (c) { sc.appendChild(new Option(c, c)); });
    if (!ch[pick.c]) pick.c = 1; sc.value = pick.c;
  }
  function drawVerses() {
    var box = $('rdVerses'); box.textContent = '';
    if (!greekReady) return;
    var n = P.chapters(pick.b)[pick.c] || 0;
    for (var v = 1; v <= n; v++) {
      var b = el('button', 'rd-vsq', String(v)); b.type = 'button'; b.dataset.v = v;
      if (pick.a && v >= pick.a && v <= pick.z) b.className += ' on';
      b.setAttribute('aria-pressed', pick.a && v >= pick.a && v <= pick.z ? 'true' : 'false');
      box.appendChild(b);
    }
  }
  function syncPick(part) {
    if (!part) return;
    var a = part.verses[0], z = part.verses[part.verses.length - 1];
    pick.b = a.b; pick.c = a.c; pick.a = a.v; pick.z = z.c === a.c ? z.v : P.chapters(a.b)[a.c];
    $('rdBook').value = pick.b; fillChapters(); drawVerses();
  }

  /* ---------- copy and share ---------- */
  function copyToClipboard(text, done) {
    function fallback() {
      var ta = el('textarea'); ta.value = text; ta.className = 'rd-hidden'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }
  function plainText() {
    var out = [];
    cur.parts.forEach(function (part) {
      out.push(dash(part.label));
      var multi = part.verses[0].c !== part.verses[part.verses.length - 1].c;
      part.verses.forEach(function (v) {
        var num = multi ? v.c + ':' + v.v : v.v;
        if (cur.view !== 'eng') out.push(num + ' ' + greekOf(v));
        if (cur.view !== 'grk') out.push((cur.view === 'both' ? '   ' : num + ' ') + englishOf(v));
      });
      out.push('');
    });
    return out.join('\n').trim() + '\n\nThe Greek New Testament According to the Byzantine Text, greeknt.org';
  }
  function say(t) { var s = $('rdStatus'); s.textContent = t; clearTimeout(say.t); say.t = setTimeout(function () { s.textContent = ''; }, 3500); }

  /* ---------- searching ---------- */
  var greekIndex = null, lemmaForms = null;
  function buildGreekIndex() {
    if (greekIndex) return;
    var W = window.GNT_WORDS, G = window.GNT_GRK; greekIndex = [];
    var lem = {}; lemmaForms = {};
    Object.keys(W.dict).forEach(function (s) {
      var f = fold(W.dict[s][0].split(',')[0]); if (!f) return;
      (lem[f] = lem[f] || []).push(s);
    });
    P.books.forEach(function (bn, b) {
      P.keys(b).forEach(function (p) {
        var key = p[2], toks = P.tokens(G.v[b][key]), codes = (W.v[b][key] || '').split(' ');
        var fw = toks.map(fold), st = fw.map(function (_, n) { return (codes[n] || '').split('.')[0]; });
        greekIndex.push({ b: b, c: p[0], v: p[1], key: key, fw: fw, st: st });
        fw.forEach(function (f, n) { if (st[n]) (lemmaForms[st[n]] = lemmaForms[st[n]] || {})[f] = 1; });
      });
    });
    greekIndex.lem = lem;
  }
  /* The surface forms a typed Greek word stands for: itself, and every form of a dictionary entry spelled that way */
  function formsOf(term) {
    var set = {}; set[term] = 1;
    (greekIndex.lem[term] || []).forEach(function (s) { Object.keys(lemmaForms[s] || {}).forEach(function (f) { set[f] = 1; }); });
    return set;
  }
  function greekQuery(q) {
    var s = GREEKRE.test(q) ? q : toGreek(q);
    return s.split(/\s+/).map(fold).filter(Boolean);
  }
  function englishQuery(q) {
    var terms = [], re = /"([^"]+)"|“([^”]+)”|(\S+)/g, m;
    while ((m = re.exec(q))) { var t = (m[1] || m[2] || m[3]).toLowerCase().replace(/[^a-z0-9'’ ]/g, '').trim(); if (t) terms.push(t); }
    return terms;
  }
  function englishRanges(text, terms) {
    var low = text.toLowerCase(), ranges = [], ok = true;
    terms.forEach(function (t) {
      var at = 0, i, found = false;
      while ((i = low.indexOf(t, at)) >= 0) {
        var before = i === 0 ? ' ' : low.charAt(i - 1);
        if (!/[a-z0-9]/.test(before)) { ranges.push([i, i + t.length]); found = true; }
        at = i + t.length;
      }
      if (!found) ok = false;
    });
    return ok ? ranges : null;
  }
  function mergeRanges(r) {
    r.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var out = [];
    r.forEach(function (x) { var l = out[out.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else out.push(x.slice()); });
    return out;
  }

  function searchGreekVerses(terms) {
    var sets = terms.map(formsOf), out = [];
    greekIndex.forEach(function (e) {
      var hits = {}, all = true;
      for (var t = 0; t < sets.length; t++) {
        var any = false;
        for (var n = 0; n < e.fw.length; n++) if (sets[t][e.fw[n]]) { hits[n] = true; any = true; }
        if (!any) { all = false; break; }
      }
      if (all) out.push({ b: e.b, c: e.c, v: e.v, key: e.key, hits: hits });
    });
    return out;
  }
  function searchEnglishVerses(terms) {
    var out = [];
    P.books.forEach(function (bn, b) {
      var a = window.GNT_ASV[b]; if (!a) return;
      P.keys(b).forEach(function (p) {
        var tx = a[p[2]]; if (!tx) return;
        var rg = englishRanges(tx, terms);
        if (rg) out.push({ b: b, c: p[0], v: p[1], key: p[2], ranges: mergeRanges(rg) });
      });
    });
    return out;
  }
  /* Notes: Greek terms against each note's lemma and readings; English terms against the English hints */
  function searchNotesGreek(terms) {
    var sets = terms.map(formsOf), out = [], N = window.GNT_NOTES.notes;
    N.forEach(function (n, i) {
      var words = [n[4]].concat(n[5].map(function (r) { return r[1]; })).join(' ').split(/\s+/).map(fold);
      var ok = sets.every(function (s) { return words.some(function (w) { return s[w]; }); });
      if (ok) out.push({ i: i, sets: sets });
    });
    return out;
  }
  function searchNotesEnglish(terms) {
    var out = [], H = window.GNT_HINTS.h;
    Object.keys(H).forEach(function (k) {
      var txt = H[k].map(function (x) { return x[1]; }).join(' · ');
      var rg = englishRanges(txt, terms);
      if (rg) out.push({ i: +k, text: txt, ranges: mergeRanges(rg) });
    });
    return out;
  }
  function noteVerse(i) {
    var n = window.GNT_NOTES.notes[i], sp = P.noteSpan(n[2]); if (!sp) return null;
    var key = sp.a[0] + ':' + sp.a[1];
    return window.GNT_GRK.v[n[1]][key] ? { b: n[1], c: sp.a[0], v: sp.a[1], key: key } : null;
  }

  function refButton(v) {
    var b = el('button', 'rd-ref', P.books[v.b] + ' ' + v.c + ':' + v.v); b.type = 'button';
    b.addEventListener('click', function () {
      showMode('read'); $('rdRange').value = P.books[v.b] + ' ' + v.c + ':' + v.v; update(true);
    });
    return b;
  }
  function resultVerse(v, greekHits, ranges) {
    var box = el('article', 'rd-hit');
    var head = el('p', 'rd-hithead'); head.appendChild(refButton(v)); box.appendChild(head);
    var g = el('p', 'rd-hg'); g.lang = 'grc'; greekVerse(g, v, greekHits); box.appendChild(g);
    var e = el('p', 'rd-he');
    if (ranges) markText(e, englishOf(v), ranges); else e.textContent = englishOf(v);
    box.appendChild(e);
    return box;
  }

  var shown = 0, PAGE = 40, queue = [];
  function more() {
    var host = $('rdResults'), slot = host.querySelector('.rd-list'), btn = host.querySelector('.rd-more');
    queue.slice(shown, shown + PAGE).forEach(function (f) { slot.appendChild(f()); });
    shown = Math.min(queue.length, shown + PAGE);
    if (btn) { btn.hidden = shown >= queue.length; btn.textContent = 'Show more (' + (queue.length - shown).toLocaleString('en-US') + ' left)'; }
  }
  function runSearch() {
    var q = $('rdQ').value.trim(), msg = $('rdSMsg'), host = $('rdResults');
    host.textContent = ''; msg.textContent = '';
    if (!q) { msg.textContent = 'Type a word or phrase to search for.'; return; }
    var scope = document.querySelector('input[name="scope"]:checked').value;
    var lang;
    if (scope === 'greek') lang = 'greek';
    else if (scope === 'english') lang = 'english';
    else lang = (GREEKRE.test(q) || /[\/\\()=|*+]/.test(q)) ? 'greek' : 'english';
    msg.textContent = 'Searching…';
    var need = [P.loadGreek, P.loadEnglish];
    if (lang === 'greek') need.push(P.loadWords);
    var left = need.length + 2, failed = false;
    function go(ok) { if (!ok) failed = true; if (--left) return; if (failed) { msg.textContent = 'The search data could not be loaded. Check your connection and try again.'; return; } setTimeout(function () { doSearch(q, scope, lang); }, 20); }
    need.forEach(function (f) { f(go); });
    P.loadNotes(go); P.loadHints(go);
  }
  function doSearch(q, scope, lang) {
    var msg = $('rdSMsg'), host = $('rdResults'), withNotes = true, withText = scope !== 'notes';
    var info, items = [], noteItems = [], terms;
    if (lang === 'greek') {
      buildGreekIndex();
      terms = greekQuery(q);
      if (!terms.length) { msg.textContent = 'No Greek letters found in what you typed.'; return; }
      if (withText) items = searchGreekVerses(terms);
      if (withNotes) noteItems = searchNotesGreek(terms);
      var shownGreek = GREEKRE.test(q) ? q : toGreek(q);
      info = 'Searching the Greek for ' + shownGreek + ' (any accents, any form).';
    } else {
      terms = englishQuery(q);
      if (!terms.length) { msg.textContent = 'Type a word or phrase to search for.'; return; }
      if (withText) items = searchEnglishVerses(terms);
      if (withNotes) noteItems = searchNotesEnglish(terms);
      info = 'Searching the English for ' + terms.join(', ') + '.';
    }
    var nv = items.length, nn = noteItems.length;
    msg.textContent = '';
    host.textContent = '';
    host.appendChild(el('p', 'rd-count', info + ' ' + (withText ? plural(nv, 'verse') + ' in the text' : '') + (withText && withNotes ? ' and ' : '') + (withNotes ? plural(nn, 'note') + ' in the apparatus' : '') + '.'));
    if (!nv && !nn) {
      host.appendChild(el('p', 'rd-none', lang === 'english' && scope === 'auto' ? 'Nothing found. If you meant Greek, choose “Greek only”, which also accepts beta code.' : 'Nothing found.'));
      return;
    }
    queue = [];
    items.forEach(function (it) {
      queue.push(function () {
        if (lang === 'greek') return resultVerse(it, it.hits, null);
        var box = resultVerse(it, null, it.ranges); return box;
      });
    });
    noteItems.forEach(function (it) {
      queue.push(function () {
        var n = window.GNT_NOTES.notes[it.i], v = noteVerse(it.i), box = el('article', 'rd-hit rd-nhit');
        var head = el('p', 'rd-hithead');
        if (v) head.appendChild(refButton(v)); else head.appendChild(el('span', '', P.books[n[1]] + ' ' + n[2]));
        head.appendChild(el('span', 'rd-tag', 'in the notes')); head.appendChild(document.createTextNode(' page ' + n[0]));
        box.appendChild(head);
        if (v) { var g = el('p', 'rd-hg'); g.lang = 'grc'; greekVerse(g, v, null); box.appendChild(g);
          var e = el('p', 'rd-he'); e.textContent = englishOf(v); box.appendChild(e); }
        var mark = null;
        if (lang === 'greek') mark = function (parent, text) {
          var re = /\S+/g, m, at = 0;
          while ((m = re.exec(text))) {
            if (m.index > at) parent.appendChild(document.createTextNode(text.slice(at, m.index)));
            var f = fold(m[0]), hit = it.sets.some(function (s) { return s[f]; });
            parent.appendChild(hit ? el('mark', '', m[0]) : document.createTextNode(m[0])); at = m.index + m[0].length;
          }
          if (at < text.length) parent.appendChild(document.createTextNode(text.slice(at)));
        };
        box.appendChild(noteEl(it.i, mark));
        if (lang === 'english') { var h = el('p', 'rd-hint'); h.appendChild(document.createTextNode('In English: ')); markText(h, it.text, it.ranges); box.appendChild(h); }
        return box;
      });
    });
    host.appendChild(el('div', 'rd-list'));
    var mb = el('button', 'btn rd-more', 'Show more'); mb.type = 'button'; mb.addEventListener('click', more); host.appendChild(mb);
    shown = 0; more();
  }

  /* ---------- modes and startup ---------- */
  function showMode(m) {
    $('rdRead').hidden = m !== 'read'; $('rdSearch').hidden = m !== 'search';
    $('rdModeRead').setAttribute('aria-pressed', m === 'read' ? 'true' : 'false');
    $('rdModeSearch').setAttribute('aria-pressed', m === 'search' ? 'true' : 'false');
    if (m === 'search') { P.loadGreek(function () {}); $('rdQ').focus(); }
  }

  function init() {
    showRecent();
    $('rdModeRead').addEventListener('click', function () { showMode('read'); });
    $('rdModeSearch').addEventListener('click', function () { showMode('search'); });
    $('rdForm').addEventListener('submit', function (e) { e.preventDefault(); update(true); });
    $('rdRange').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { update(false); }, 280); });
    document.querySelectorAll('#rdRead .rd-ex').forEach(function (b) {
      if (b.dataset.p) return;
      b.addEventListener('click', function () { $('rdRange').value = b.textContent; update(false); $('rdRange').focus(); });
    });
    $('rdSForm').addEventListener('submit', function (e) { e.preventDefault(); runSearch(); });
    document.querySelectorAll('input[name="view"]').forEach(function (r) {
      r.addEventListener('change', function () { setView(r.value); });
    });
    $('rdNotes').addEventListener('change', function () {
      cur.notes = this.checked; setView(cur.view); if (cur.notes) loadNotesInto();
    });
    $('rdCopy').addEventListener('click', function () { copyToClipboard(plainText(), function (ok) { say(ok ? 'Copied.' : 'Copying was not allowed. Select the text and copy it.'); }); });
    $('rdShare').addEventListener('click', function () {
      var url = location.origin + location.pathname + '?p=' + encodeURIComponent(P.canon(cur.parts)).replace(/%20/g, '+').replace(/%3A/g, ':').replace(/%2C/g, ',') + (cur.view !== 'both' ? '&view=' + cur.view : '') + (cur.notes ? '&notes=1' : '');
      copyToClipboard(url, function (ok) { say(ok ? 'Link copied.' : url); });
    });
    $('rdVocabBtn').addEventListener('click', function () { openVocab(true); });
    buildPick();
    P.loadGreek(function (ok) {
      if (!ok) { $('rdMsg').textContent = 'The text could not be loaded. Check your connection and reload the page.'; return; }
      greekReady = true; fillChapters(); drawVerses();
      P.loadEnglish(function () {
        englishReady = true;
        var qs = new URLSearchParams(location.search);
        if (qs.get('view')) setView(qs.get('view') === 'grk' || qs.get('view') === 'eng' ? qs.get('view') : 'both');
        if (qs.get('notes') === '1') { cur.notes = true; $('rdNotes').checked = true; setView(cur.view); }
        if (qs.get('q')) {
          showMode('search'); $('rdQ').value = qs.get('q');
          var sc = document.querySelector('input[name="scope"][value="' + (qs.get('scope') || 'auto') + '"]'); if (sc) sc.checked = true;
          runSearch();
        } else if (qs.get('p')) { $('rdRange').value = qs.get('p'); update(true); }
        else if ($('rdRange').value) update(false);
      });
    });
  }
  init();
})();
