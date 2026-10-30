/* The Vocabulary page: a list of the words in a passage, with filters, to print, save as PDF, open in Word, or open in a spreadsheet. */
(function () {
  'use strict';
  var P = window.GNT_PASSAGE;
  if (!P) return;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var GREEKLET = /[Ͱ-Ͽἀ-῿̀-ͯ]/g;
  var KINDS = { noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun', prep: 'preposition', conj: 'conjunction', part: 'particle', art: 'article', name: 'name' };
  var KORDER = ['noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'part', 'art', 'name'];
  var PLURAL = { noun: 'nouns', verb: 'verbs', adj: 'adjectives', adv: 'adverbs', pron: 'pronouns', prep: 'prepositions', conj: 'conjunctions', part: 'particles', art: 'the article' };
  var model = null, ready = false;

  function fold(w) { return w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ').replace(/[^α-ω]/g, ''); }
  function posOf(code) {
    var p = code.split('-')[0];
    if (p === 'N' || p === 'HEB' || p === 'ARAM') return 'noun';
    if (p === 'V') return 'verb';
    if (p === 'A') return 'adj';
    if (p === 'ADV') return 'adv';
    if (p === 'T') return 'art';
    if (p === 'PREP') return 'prep';
    if (p === 'CONJ') return 'conj';
    if ('PRDIXCFKQS'.indexOf(p) >= 0 && p.length === 1) return 'pron';
    return 'part';
  }
  function num(n) { return n.toLocaleString('en-US'); }

  /* ---------- gathering the words ---------- */
  function gather(parts) {
    var W = window.GNT_WORDS, G = window.GNT_GRK, map = {}, order = 0, books = {}, total = 0;
    parts.forEach(function (part) { part.verses.forEach(function (v) { books[v.b] = 1; }); });
    var multiBook = Object.keys(books).length > 1;
    parts.forEach(function (part) {
      part.verses.forEach(function (v) {
        var toks = P.tokens(G.v[v.b][v.key]), codes = (W.v[v.b][v.key] || '').split(' ');
        toks.forEach(function (tok, n) {
          var c = codes[n]; if (!c) return;
          var a = c.split('.'), s = a[0], ci = +a[1], d = W.dict[s], cd = W.codes[ci];
          if (!d || !cd) return;
          total++;
          var e = map[s];
          if (!e) {
            var hw = d[0], cap = hw.charAt(0) !== hw.charAt(0).toLowerCase();
            e = map[s] = { s: s, hw: hw, gloss: d[1], freq: d[2] || 0, pos: posOf(cd[0]), here: 0, at: order++, forms: {}, flist: [] };
            e.kind = cap ? 'name' : e.pos;
          }
          e.here++;
          if (e.pos === 'verb' || cd[0].charAt(0) === 'V') {
            var spell = tok.match(GREEKLET); spell = spell ? spell.join('') : tok;
            var fk = spell + '|' + ci, f = e.forms[fk];
            if (!f) { f = e.forms[fk] = { spell: spell, code: cd[0], text: cd[1].replace(/^Verb, /, ''), verses: [], at: e.flist.length }; e.flist.push(f); }
            var ref = (multiBook ? P.books[v.b] + ' ' : '') + v.c + ':' + v.v;
            if (f.verses.indexOf(ref) < 0) f.verses.push(ref);
          }
        });
      });
    });
    return { list: Object.keys(map).map(function (k) { return map[k]; }), total: total, multiBook: multiBook };
  }

  /* ---------- the choices on the page ---------- */
  function choices() {
    var pos = {}; document.querySelectorAll('input[name="pos"]').forEach(function (c) { pos[c.value] = c.checked; });
    return {
      pos: pos, names: $('vbNames').checked, common: $('vbCommon').checked, max: Math.max(1, +$('vbMax').value || 1000),
      forms: $('vbForms').checked, parse: $('vbParse').checked, order: document.querySelector('input[name="order"]:checked').value
    };
  }
  function filterLine(ch) {
    var on = Object.keys(PLURAL).filter(function (k) { return ch.pos[k]; }).map(function (k) { return PLURAL[k]; });
    var bits = [];
    bits.push(on.length === Object.keys(PLURAL).length ? 'Every kind of word' : on.length ? on.join(', ').replace(/^./, function (m) { return m.toUpperCase(); }) : 'No kinds of word');
    bits.push(ch.names ? 'names of people and places included' : 'names of people and places left out');
    if (ch.common) bits.push('words used more than ' + num(ch.max) + ' times in the edition left out');
    if (ch.pos.verb) bits.push(ch.forms ? (ch.parse ? 'verb forms shown with tense, voice and mood' : 'verb forms shown') : 'verb forms not shown');
    bits.push({ appear: 'in the order they appear', rare: 'rarest words first', az: 'in alphabetical order', kind: 'grouped by kind of word' }[ch.order]);
    return bits.join('; ') + '.';
  }
  function build(parts, ch) {
    var g = gather(parts);
    var rows = g.list.filter(function (e) {
      if (e.kind === 'name') { if (!ch.names) return false; }
      else if (!ch.pos[e.pos]) return false;
      if (ch.common && e.freq > ch.max) return false;
      return true;
    });
    var cmpAz = function (a, b) { return fold(a.hw.split(',')[0]).localeCompare(fold(b.hw.split(',')[0]), 'el'); };
    if (ch.order === 'rare') rows.sort(function (a, b) { return a.freq - b.freq || a.at - b.at; });
    else if (ch.order === 'az') rows.sort(cmpAz);
    else if (ch.order === 'kind') rows.sort(function (a, b) { return KORDER.indexOf(a.kind) - KORDER.indexOf(b.kind) || cmpAz(a, b); });
    else rows.sort(function (a, b) { return a.at - b.at; });
    rows.forEach(function (e) {
      e.fl = e.pos === 'verb' || e.flist.length ? e.flist.slice().sort(function (a, b) { return a.at - b.at; }) : [];
    });
    var title = parts.map(function (p) { return p.label; }).join('; ');
    return { title: title, filt: filterLine(ch), rows: rows, distinct: g.list.length, ch: ch };
  }

  /* ---------- the report on the screen ---------- */
  function renderReport(m) {
    var box = $('vbReport'); box.textContent = '';
    box.appendChild(el('h2', '', 'Vocabulary: ' + m.title));
    box.appendChild(el('p', 'vb-filt', m.filt));
    if (!m.rows.length) { box.appendChild(el('p', 'rd-none', 'No words match these choices. Try including more kinds of word.')); return; }
    var wrap = el('div', 'vb-wrap'), t = el('table', 'vb-table');
    var h = el('thead'), hr = el('tr');
    ['Greek', 'Meaning', 'Strong’s', 'In the edition', 'Here'].forEach(function (x, i) { var th = el('th', i > 1 ? 'vb-n' : '', x); th.scope = 'col'; hr.appendChild(th); });
    h.appendChild(hr); t.appendChild(h);
    var tb = el('tbody');
    m.rows.forEach(function (e) {
      var tr = el('tr');
      var a = el('td', 'vb-gr', e.hw); a.lang = 'grc'; tr.appendChild(a);
      var b = el('td', 'vb-mean');
      b.appendChild(document.createTextNode(e.gloss + ' ')); b.appendChild(el('span', 'vb-pos', KINDS[e.kind]));
      if (m.ch.forms && e.fl.length) {
        var ul = el('ul', 'vb-forms');
        e.fl.forEach(function (f) {
          var li = el('li'); var sp = el('span', 'greek', f.spell); sp.lang = 'grc'; li.appendChild(sp);
          if (m.ch.parse) li.appendChild(document.createTextNode(' ' + f.text));
          li.appendChild(el('span', 'vb-vs', ' ' + f.verses.join(', ')));
          ul.appendChild(li);
        });
        b.appendChild(ul);
      }
      tr.appendChild(b);
      tr.appendChild(el('td', 'vb-n', e.s));
      tr.appendChild(el('td', 'vb-n', num(e.freq)));
      tr.appendChild(el('td', 'vb-n', num(e.here)));
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); box.appendChild(wrap);
    box.appendChild(el('p', 'vb-foot', num(m.rows.length) + (m.rows.length === 1 ? ' word' : ' words') + ' listed, from ' + num(m.distinct) + ' different ' + (m.distinct === 1 ? 'word' : 'words') + ' in the passage.'));
  }

  /* ---------- downloads ---------- */
  function slug() { return 'vocabulary-' + model.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
  function save(name, type, content) {
    var blob = new Blob([content], { type: type }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.className = 'rd-hidden'; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  }
  function formsText(e, ch) {
    return e.fl.map(function (f) { return f.spell + (ch.parse ? ' (' + f.text + ')' : '') + ' ' + f.verses.join(', '); }).join('; ');
  }
  function csvCell(s) { s = String(s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function toCsv(m) {
    var lines = [['Greek', 'Meaning', 'Kind of word', 'Strong’s', 'In the edition', 'Here'].concat(m.ch.forms ? ['Verb forms in the passage'] : [])];
    m.rows.forEach(function (e) { lines.push([e.hw, e.gloss, KINDS[e.kind], e.s, e.freq, e.here].concat(m.ch.forms ? [formsText(e, m.ch)] : [])); });
    return '﻿' + lines.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function toWord(m) {
    var h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc('Vocabulary: ' + m.title) + '</title>' +
      '<style>body{font-family:"Palatino Linotype",Georgia,serif;font-size:11pt}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #999;padding:4pt 6pt;text-align:left;vertical-align:top}th{border-bottom:2px solid #333}.n{text-align:right}.g{font-size:13pt}.p{color:#666;font-style:italic}.f{margin:2pt 0 0 0;font-size:10pt}</style></head><body>' +
      '<h2>' + esc('Vocabulary: ' + m.title) + '</h2><p>' + esc(m.filt) + '</p><table><thead><tr><th>Greek</th><th>Meaning</th><th class="n">Strong’s</th><th class="n">In the edition</th><th class="n">Here</th></tr></thead><tbody>';
    m.rows.forEach(function (e) {
      h += '<tr><td class="g">' + esc(e.hw) + '</td><td>' + esc(e.gloss) + ' <span class="p">' + KINDS[e.kind] + '</span>';
      if (m.ch.forms) e.fl.forEach(function (f) { h += '<p class="f">' + esc(f.spell + (m.ch.parse ? ' ' + f.text : '') + '  ' + f.verses.join(', ')) + '</p>'; });
      h += '</td><td class="n">' + e.s + '</td><td class="n">' + num(e.freq) + '</td><td class="n">' + num(e.here) + '</td></tr>';
    });
    h += '</tbody></table><p>' + num(m.rows.length) + ' words listed, from ' + num(m.distinct) + ' different words in the passage.</p><p>The Greek New Testament According to the Byzantine Text, greeknt.org</p></body></html>';
    return h;
  }
  function say(t) { var s = $('vbStatus'); s.textContent = t; clearTimeout(say.t); say.t = setTimeout(function () { s.textContent = ''; }, 4000); }

  /* ---------- running ---------- */
  function make() {
    var msg = $('vbMsg'); msg.textContent = ''; msg.className = 'rd-msg';
    var txt = $('vbRange').value;
    if (!txt.trim()) { msg.textContent = 'Type a passage, such as John 3:16-18.'; msg.className = 'rd-msg rd-bad'; return; }
    if (!ready) { msg.textContent = 'The word data is still loading. Try again in a moment.'; return; }
    var r = P.lookup(txt);
    if (r.error) { msg.textContent = r.error; msg.className = 'rd-msg rd-bad'; return; }
    if (r.warn) msg.textContent = r.warn;
    model = build(r.parts, choices());
    renderReport(model);
    $('vbOutSec').hidden = false;
    try { history.replaceState(null, '', location.pathname + '?p=' + encodeURIComponent(P.canon(r.parts)).replace(/%20/g, '+').replace(/%3A/g, ':').replace(/%2C/g, ',')); } catch (e) {}
    $('vbOutSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function init() {
    $('vbForm').addEventListener('submit', function (e) { e.preventDefault(); make(); });
    document.querySelectorAll('.rd-ex').forEach(function (b) { b.addEventListener('click', function () { $('vbRange').value = b.textContent; $('vbRange').focus(); }); });
    $('vbSlide').addEventListener('input', function () { $('vbMax').value = this.value; $('vbCommon').checked = true; });
    $('vbMax').addEventListener('input', function () { $('vbSlide').value = Math.min(5000, Math.max(10, +this.value || 10)); });
    $('vbPrint').addEventListener('click', function () { window.print(); });
    $('vbPdf').addEventListener('click', function () { say('Choose “Save as PDF” in the print window.'); window.print(); });
    $('vbWord').addEventListener('click', function () { if (model) { save(slug() + '.doc', 'application/msword', toWord(model)); say('Saved as a Word file.'); } });
    $('vbCsv').addEventListener('click', function () { if (model) { save(slug() + '.csv', 'text/csv;charset=utf-8', toCsv(model)); say('Saved as a CSV file.'); } });
    $('vbMsg').textContent = 'Loading the word data…';
    P.loadGreek(function (ok1) {
      P.loadWords(function (ok2) {
        if (!ok1 || !ok2) { $('vbMsg').textContent = 'The word data could not be loaded. Check your connection and reload the page.'; return; }
        ready = true; $('vbMsg').textContent = '';
        var q = new URLSearchParams(location.search).get('p');
        if (q) { $('vbRange').value = q; make(); }
      });
    });
  }
  init();
})();
