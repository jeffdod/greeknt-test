/* The Greek text under a note (the edition's own text, verse by verse), with the words the note is about underlined.
   The text is in greek-data.js, which is loaded the first time it is needed. */
(function () {
  'use strict';
  var state = 0, waiting = [], KEYS = [], MARKS = {};
  var GR = window.GNT_GR = { ready: false };

  GR.load = function (cb) {
    if (state === 2) { if (cb) cb(); return; }
    if (cb) waiting.push(cb);
    if (state === 1) return;
    state = 1;
    var s = document.createElement('script');
    s.src = 'greek-data.js';
    s.onload = function () {
      var ok = window.GNT_GRK && window.GNT_NOTES && GNT_GRK.n === GNT_NOTES.notes.length;
      state = ok ? 2 : 0; GR.ready = !!ok;
      var q = waiting; waiting = []; if (ok) q.forEach(function (f) { f(); });
    };
    s.onerror = function () { state = 0; };
    document.head.appendChild(s);
  };

  /* Whether to show the Greek at all: a choice kept on this device (shown unless the visitor has turned it off) */
  var KEY = 'gnt-show-greek', session = true;
  GR.shown = function () { try { return localStorage.getItem(KEY) !== 'no'; } catch (e) { return session; } };
  GR.setShown = function (on) {
    try { if (on) localStorage.removeItem(KEY); else localStorage.setItem(KEY, 'no'); } catch (e) {}
    session = on;
    document.dispatchEvent(new Event('gntgreek'));
  };

  function keysOf(b) {
    if (!KEYS[b]) KEYS[b] = Object.keys(GNT_GRK.v[b]).map(function (k) { var p = k.split(':'); return [+p[0], +p[1], k]; })
      .sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });
    return KEYS[b];
  }
  /* The verses a note covers: "1:25", "1:7–8", or "7:53–8:11". Returns [{key, label, text}]. */
  GR.verses = function (b, ref) {
    if (!GR.ready || b < 0 || !GNT_GRK.v[b]) return [];
    var m = /^(\d+):(\d+)(?:[–-](\d+)(?::(\d+))?)?$/.exec(ref);
    if (!m) return [];
    var c1 = +m[1], v1 = +m[2], c2 = c1, v2 = v1;
    if (m[4]) { c2 = +m[3]; v2 = +m[4]; } else if (m[3]) { v2 = +m[3]; }
    var multi = c2 !== c1, out = [];
    keysOf(b).forEach(function (p) {
      if ((p[0] > c1 || (p[0] === c1 && p[1] >= v1)) && (p[0] < c2 || (p[0] === c2 && p[1] <= v2)))
        out.push({ key: p[2], label: multi ? p[0] + ':' + p[1] : String(p[1]), text: GNT_GRK.v[b][p[2]] });
    });
    return out;
  };
  /* The underlined stretches of one note, as {verseKey: [[start, end], ...]} */
  function marksOf(i) {
    if (MARKS[i]) return MARKS[i];
    var out = {}, s = GNT_GRK.m[i];
    if (s) s.split(';').forEach(function (t) { var p = t.split(','); (out[p[0]] = out[p[0]] || []).push([+p[1], +p[2]]); });
    return (MARKS[i] = out);
  }
  function put(parent, text, rg) {
    var at = 0;
    rg.forEach(function (r) {
      if (r[0] > at) parent.appendChild(document.createTextNode(text.slice(at, r[0])));
      var u = document.createElement('u'); u.className = 'vw'; u.textContent = text.slice(r[0], r[1]); parent.appendChild(u);
      at = r[1];
    });
    if (at < text.length) parent.appendChild(document.createTextNode(text.slice(at)));
  }
  /* The Greek line for note number i (a position in notes-data.js): a label and the verses with the note's words underlined.
     Long passages show the first two verses, with a button for the rest. Returns null when there is no Greek. */
  GR.line = function (i, b, ref, force) {
    if (!force && !GR.shown()) return null;
    var vs = GR.verses(b, ref);
    if (!vs.length) return null;
    var d = document.createElement('div'); d.className = 'grline';
    var lab = document.createElement('span'); lab.className = 'grlab'; lab.textContent = 'Greek: '; d.appendChild(lab);
    var body = document.createElement('span'); body.className = 'grtext'; body.lang = 'grc'; d.appendChild(body);
    var mk = marksOf(i), rest = null, LIM = 3;
    vs.forEach(function (v, n) {
      var host = body;
      if (vs.length > LIM && n >= 2) {
        if (!rest) { rest = document.createElement('span'); rest.hidden = true; body.appendChild(rest); }
        host = rest;
      }
      if (vs.length > 1) { var num = document.createElement('sup'); num.className = 'envn'; num.textContent = v.label; host.appendChild(num); }
      put(host, v.text, mk[v.key] || []);
      host.appendChild(document.createTextNode(' '));
    });
    if (rest) {
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'enmore';
      var more = 'Show all ' + vs.length + ' verses', less = 'Show fewer';
      btn.textContent = more; btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        rest.hidden = !rest.hidden; btn.textContent = rest.hidden ? more : less; btn.setAttribute('aria-expanded', rest.hidden ? 'false' : 'true');
      });
      d.appendChild(btn);
    }
    return d;
  };
})();
