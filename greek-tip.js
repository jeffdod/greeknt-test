/* The word popup: point at or tap a Greek word (a span with class "gw") to see its Strong's number, dictionary form,
   short gloss and parsing. The data (greek-words.js) is loaded the first time a word is pointed at.
   A word in a verse carries data-b, data-k, data-n (book, verse, word number) and is looked up exactly.
   A word in a reading carries data-f (its spelling without accents) and is looked up by spelling. */
(function () {
  'use strict';
  var state = 0, waiting = [], tip = null, cur = null, pinned = false, tHover = null, tHide = null;
  var TIP = window.GNT_TIP = {};

  TIP.load = function (cb) {
    if (state === 2) { if (cb) cb(); return; }
    if (cb) waiting.push(cb);
    if (state === 1) return;
    state = 1;
    var s = document.createElement('script');
    s.src = 'greek-words.js';
    s.onload = function () { state = window.GNT_WORDS ? 2 : 0; var q = waiting; waiting = []; if (state === 2) q.forEach(function (f) { f(); }); };
    s.onerror = function () { state = 0; waiting = []; };
    document.head.appendChild(s);
  };

  /* A spelling without accents, breathings or capitals, with every sigma the same: the key used for looking up a reading's words */
  TIP.fold = function (w) {
    return w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ').replace(/[^α-ω]/g, '');
  };

  /* Put a reading's words into parent, each in a span that can be pointed at. Anything that is not Greek (such as "om.") stays plain text. */
  TIP.forms = function (parent, text, vid, ri) {
    var re = /\S+/g, m, at = 0, n = 0;
    while ((m = re.exec(text))) {
      if (m.index > at) parent.appendChild(document.createTextNode(text.slice(at, m.index)));
      var f = TIP.fold(m[0]);
      if (f) { var w = document.createElement('span'); w.className = 'gw'; w.dataset.f = f; if (vid) { w.dataset.v = vid; w.dataset.i = ri; w.dataset.n = n; } n++; w.textContent = m[0]; parent.appendChild(w); }
      else parent.appendChild(document.createTextNode(m[0]));
      at = m.index + m[0].length;
    }
    if (at < text.length) parent.appendChild(document.createTextNode(text.slice(at)));
  };

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function parse(p) { var a = p.split('.'); return [+a[0], +a[1]]; }
  /* A parsing marked "UNPARSED" is left out when the same word has a real one */
  function dropUnparsed(an) {
    var good = an.filter(function (a) { var c = GNT_WORDS.codes[a[1]]; return !c || c[0] !== 'UNPARSED'; });
    return good.length ? good : an;
  }
  /* The analyses of a word: [[strongs, code index], ...]. A word in a verse has one. A word in a reading was found in the
     comparison editions' own text (one or more analyses); failing that it is looked up by its spelling in the whole edition. */
  function analyses(w) {
    var W = window.GNT_WORDS;
    if (w.dataset.ni) {
      var nn = W.nt && W.nt[+w.dataset.ni], t2 = nn && nn[+w.dataset.j], e2 = t2 && t2.split(' ')[+w.dataset.n];
      if (e2 && e2 !== '-') return dropUnparsed(e2.split('|').map(parse));
      return [];
    }
    if (w.dataset.v) {
      var rs = W.rd && W.rd[w.dataset.v], t = rs && rs[+w.dataset.i], e = t && t.split(' ')[+w.dataset.n];
      if (e && e !== '-') return e.split('|').map(parse);
    }
    if (w.dataset.f) {
      var s = W.forms[w.dataset.f];
      return s ? s.split(',').map(function (p) { var a = p.split('.'); return [+a[0], +a[1]]; }) : [];
    }
    var v = W.v[+w.dataset.b], t = v && v[w.dataset.k];
    var p = t && t.split(' ')[+w.dataset.n];
    if (!p) return [];
    var a = p.split('.'); return [[+a[0], +a[1]]];
  }

  /* One dictionary entry with the parsings that go with it (a list of code indexes) */
  function entry(num, codes) {
    var W = GNT_WORDS, d = W.dict[num], box = el('div', 'gt-an');
    var h = el('div', 'gt-head');
    h.appendChild(el('span', 'gt-num', 'Strong’s ' + num));
    if (d) { var hw = el('span', 'gt-hw', d[0]); hw.lang = 'grc'; h.appendChild(hw); }
    box.appendChild(h);
    if (d && d[1]) box.appendChild(el('div', 'gt-gloss', d[1]));
    codes.forEach(function (ci) {
      var c = W.codes[ci];
      if (c && c[0] === 'UNPARSED') box.appendChild(el('div', 'gt-parse gt-soft', c[1]));
      else if (c) { var pr = el('div', 'gt-parse'); pr.appendChild(el('span', 'gt-code', c[0])); pr.appendChild(document.createTextNode(' ' + c[1])); box.appendChild(pr); }
    });
    if (d && d[2]) box.appendChild(el('div', 'gt-count', 'This word occurs ' + d[2].toLocaleString('en-US') + (d[2] === 1 ? ' time' : ' times') + ' in the edition’s text.'));
    return box;
  }

  function fill(w) {
    var an = analyses(w), box = el('div', 'gt-body');
    var g = el('div', 'gt-word', w.textContent.replace(/[^Ͱ-Ͽἀ-῿̀-ͯ]/g, '')); g.lang = 'grc'; box.appendChild(g);
    if (!an.length) box.appendChild(el('div', 'gt-none', 'This spelling does not occur in the edition’s text, so there is no entry to show.'));
    else {
      var groups = [], at = {};
      an.forEach(function (a) { if (!(a[0] in at)) { at[a[0]] = groups.length; groups.push([a[0], []]); } if (groups[at[a[0]]][1].indexOf(a[1]) < 0) groups[at[a[0]]][1].push(a[1]); });
      if (groups.length > 1) box.appendChild(el('div', 'gt-many', 'This spelling occurs with more than one meaning:'));
      else if (groups[0][1].length > 1) box.appendChild(el('div', 'gt-many', 'This form can be parsed more than one way:'));
      groups.slice(0, 4).forEach(function (g2) { box.appendChild(entry(g2[0], g2[1])); });
    }
    var mk = w.querySelector('u.vw[data-i]');
    if (mk && window.GNT_VARIANTS) { var vx = window.GNT_VARIANTS(+mk.dataset.i, w); if (vx) box.appendChild(vx); }
    return box;
  }

  function ensure(host) {
    if (!tip) { tip = el('div', 'gwtip'); tip.setAttribute('role', 'tooltip'); tip.hidden = true;
      tip.addEventListener('mouseenter', function () { clearTimeout(tHide); });
      tip.addEventListener('mouseleave', function () { if (!pinned) schedHide(); }); }
    if (tip.parentNode !== host) host.appendChild(tip);
  }

  function place(w) {
    var r = w.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    var left = Math.max(8, Math.min(r.left, vw - tw - 8));
    var top = r.bottom + 6;
    if (top + th > vh - 8 && r.top - th - 6 >= 8) top = r.top - th - 6;
    top = Math.max(8, Math.min(top, vh - th - 8));
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }

  function show(w) {
    clearTimeout(tHide);
    ensure(w.closest('dialog[open]') || document.body);
    if (cur) cur.classList.remove('gw-on');
    cur = w; w.classList.add('gw-on');
    tip.textContent = '';
    tip.appendChild(el('div', 'gt-load', 'Loading…'));
    tip.hidden = false; place(w);
    TIP.load(function () {
      if (cur !== w || !w.isConnected) return;
      tip.textContent = ''; tip.appendChild(fill(w)); tip.hidden = false; place(w);
    });
  }
  function hide() {
    clearTimeout(tHover); clearTimeout(tHide); pinned = false;
    if (cur) cur.classList.remove('gw-on');
    cur = null; if (tip) tip.hidden = true;
  }
  function schedHide() { clearTimeout(tHide); tHide = setTimeout(hide, 220); }
  function canHover() { return window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches; }

  document.addEventListener('mouseover', function (e) {
    if (!canHover()) return;
    var w = e.target.closest && e.target.closest('.gw');
    if (!w) return;
    clearTimeout(tHide); clearTimeout(tHover);
    if (pinned && cur !== w) return;
    if (cur === w) return;
    tHover = setTimeout(function () { show(w); }, 140);
  });
  document.addEventListener('mouseout', function (e) {
    var w = e.target.closest && e.target.closest('.gw');
    if (!w) return;
    clearTimeout(tHover);
    var to = e.relatedTarget;
    if (to && (w.contains(to) || (tip && tip.contains(to)))) return;
    if (!pinned) schedHide();
  });
  document.addEventListener('click', function (e) {
    var w = e.target.closest && e.target.closest('.gw');
    if (w) {
      if (cur === w && pinned) { hide(); return; }
      if (cur !== w || tip.hidden) show(w);
      pinned = true; return;
    }
    if (tip && !tip.hidden && !tip.contains(e.target)) hide();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur) hide(); });
  window.addEventListener('scroll', function () { if (cur) hide(); }, true);
  window.addEventListener('resize', function () { if (cur) hide(); });
  document.addEventListener('close', function () { if (cur) hide(); }, true);
})();
