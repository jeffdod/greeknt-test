/* Makes the vocabulary list as a real PDF file, on the device, with no outside service. Each page is drawn with the site's own
   fonts and stored in the PDF as a picture, so the file looks the same everywhere. GNT_PDF.make(doc) returns a promise of a Blob. */
(function () {
  'use strict';
  var W = 612, H = 792, M = 54, SCALE = 2, INK = '#1f2a36', SOFT = '#5a6270', RUB = '#8a2a1e', RULE = '#bdb6a6';
  var BODY = '"EB Garamond", Georgia, serif', GREEK = '"GFS Didot", "EB Garamond", serif';
  var COLS = [{ w: 112, h: 'Greek' }, { w: 240, h: 'Meaning' }, { w: 46, h: 'Strong’s', r: 1 }, { w: 62, h: 'In the edition', r: 1 }, { w: 44, h: 'Here', r: 1 }];

  function fontsReady() {
    var f = document.fonts;
    if (!f || !f.load) return Promise.resolve();
    return Promise.all(['400 12px "EB Garamond"', 'italic 400 12px "EB Garamond"', '600 12px "EB Garamond"', '400 12px "GFS Didot"'].map(function (x) { return f.load(x, 'αabc'); })).catch(function () {});
  }
  var ctx = document.createElement('canvas').getContext('2d');
  function width(txt, font) { ctx.font = font; return ctx.measureText(txt).width; }

  /* runs: [{t, f (font), c (color)}] -> lines, each [{t, f, c, x}], broken at spaces to fit maxW */
  function wrapRuns(runs, maxW) {
    var lines = [], line = [], x = 0;
    function flush() { if (line.length) lines.push(line); line = []; x = 0; }
    runs.forEach(function (r) {
      var parts = r.t.split(/(\s+)/);
      parts.forEach(function (p) {
        if (!p) return;
        var w = width(p, r.f);
        if (/^\s+$/.test(p)) { if (x > 0) { line.push({ t: ' ', f: r.f, c: r.c, x: x }); x += w; } return; }
        if (x + w > maxW && x > 0) { while (line.length && line[line.length - 1].t === ' ') line.pop(); flush(); }
        line.push({ t: p, f: r.f, c: r.c, x: x }); x += w;
      });
    });
    while (line.length && line[line.length - 1].t === ' ') line.pop();
    flush();
    return lines;
  }

  function layout(doc) {
    var pages = [], ops, y, pageTop;
    function newPage() { ops = []; pages.push(ops); y = M; }
    function text(x, yy, t, f, c, align) { ops.push({ k: 't', x: x, y: yy, t: t, f: f, c: c, a: align }); }
    function lineOp(y1, wd, c) { ops.push({ k: 'l', y: y1, w: wd, c: c }); }
    function block(runs, size, lead, maxW, x0) {
      var ls = wrapRuns(runs, maxW);
      ls.forEach(function (l) { l.forEach(function (s) { text((x0 == null ? M : x0) + s.x, y + size, s.t, s.f, s.c); }); y += lead; });
    }
    newPage();
    block([{ t: 'Vocabulary: ' + doc.title, f: '400 20px ' + BODY, c: INK }], 20, 26, W - 2 * M);
    y += 0;
    block([{ t: 'The Greek New Testament, Byzantine Text · greeknt.org', f: 'italic 400 10.5px ' + BODY, c: SOFT }], 10.5, 15, W - 2 * M);
    y += 4;
    lineOp(y, 1.2, RUB); y += 10;
    block([{ t: 'Included: ', f: '600 10px ' + BODY, c: INK }, { t: doc.filt, f: '400 10px ' + BODY, c: SOFT }], 10, 14, W - 2 * M);
    y += 8;
    function header() {
      var x = M;
      COLS.forEach(function (c) { text(c.r ? x + c.w - 6 : x, y + 9, c.h, '600 9.5px ' + BODY, SOFT, c.r ? 'r' : null); x += c.w; });
      y += 14; lineOp(y, 1.2, RUB); y += 4;
    }
    header();
    var bottom = H - M - 18;
    if (!doc.rows.length) block([{ t: 'No words match these choices.', f: '400 11px ' + BODY, c: SOFT }], 11, 16, W - 2 * M);
    doc.rows.forEach(function (e) {
      var meanRuns = [{ t: e.gloss + ' ', f: '400 11px ' + BODY, c: INK }, { t: '(' + e.kind + ')', f: '400 9.5px ' + BODY, c: SOFT }];
      var mean = wrapRuns(meanRuns, COLS[1].w - 8), forms = [];
      e.forms.forEach(function (fm) {
        var runs = [{ t: fm.spell, f: '400 11px ' + GREEK, c: INK }, { t: (fm.text ? ' · ' + fm.text : '') + ' · ' + fm.verses.join(', ') + (fm.n > 1 ? ' ×' + fm.n : ''), f: '400 9.5px ' + BODY, c: SOFT }];
        forms.push(wrapRuns(runs, COLS[1].w - 8));
      });
      var greekLines = wrapRuns([{ t: e.hw, f: '400 13px ' + GREEK, c: INK }], COLS[0].w - 8);
      var hMean = mean.length * 14 + forms.reduce(function (a, l) { return a + l.length * 13; }, 0) + (forms.length ? 2 : 0);
      var hRow = Math.max(hMean, greekLines.length * 17) + 9;
      if (y + hRow > bottom) { newPage(); header(); }
      var top = y + 4, x = M;
      greekLines.forEach(function (l, i) { l.forEach(function (s) { text(x + s.x, top + 11 + i * 17, s.t, s.f, s.c); }); });
      x += COLS[0].w;
      var yy = top;
      mean.forEach(function (l) { l.forEach(function (s) { text(x + s.x, yy + 10, s.t, s.f, s.c); }); yy += 14; });
      if (forms.length) yy += 2;
      forms.forEach(function (fl) { fl.forEach(function (l) { l.forEach(function (s) { text(x + s.x, yy + 9.5, s.t, s.f, s.c); }); yy += 13; }); });
      x += COLS[1].w;
      [['G' + e.s], [e.freq.toLocaleString('en-US')], [String(e.here)]].forEach(function (v, i) {
        var c = COLS[i + 2]; text(x + c.w - 6, top + 10, v[0], '400 11px ' + BODY, INK, 'r'); x += c.w;
      });
      y += hRow; lineOp(y - 2, 0.5, RULE);
    });
    y += 10;
    block([{ t: doc.count + ' Meanings from the Strong’s dictionary, as shown on the site.', f: '400 9.5px ' + BODY, c: SOFT }], 9.5, 13, W - 2 * M);
    pages.forEach(function (p, i) {
      p.push({ k: 't', x: M, y: H - M + 6, t: 'greeknt.org', f: '400 9px ' + BODY, c: SOFT });
      p.push({ k: 't', x: W - M, y: H - M + 6, t: 'Page ' + (i + 1) + ' of ' + pages.length, f: '400 9px ' + BODY, c: SOFT, a: 'r' });
    });
    return pages;
  }

  function draw(ops) {
    var cv = document.createElement('canvas'); cv.width = Math.round(W * SCALE); cv.height = Math.round(H * SCALE);
    var c = cv.getContext('2d'); c.scale(SCALE, SCALE);
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.textBaseline = 'alphabetic';
    ops.forEach(function (o) {
      if (o.k === 'l') { c.strokeStyle = o.c; c.lineWidth = o.w; c.beginPath(); c.moveTo(M, o.y); c.lineTo(W - M, o.y); c.stroke(); return; }
      c.font = o.f; c.fillStyle = o.c; c.textAlign = o.a === 'r' ? 'right' : 'left'; c.fillText(o.t, o.x, o.y);
    });
    var url = cv.toDataURL('image/jpeg', 0.85), b = atob(url.split(',')[1]), u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return { data: u, w: cv.width, h: cv.height };
  }

  function pdf(imgs, title) {
    var enc = new TextEncoder(), chunks = [], pos = 0, offs = [];
    function add(x) { var u = typeof x === 'string' ? enc.encode(x) : x; chunks.push(u); pos += u.length; }
    function obj(n, body) { offs[n] = pos; add(n + ' 0 obj\n'); add(body); add('\nendobj\n'); }
    var n = imgs.length, kids = [];
    add('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>');
    for (i = 0; i < n; i++) {
      var p = 3 + i * 3, im = p + 1, ct = p + 2, content = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q';
      obj(p, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>');
      offs[im] = pos; add(im + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + imgs[i].w + ' /Height ' + imgs[i].h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + imgs[i].data.length + ' >>\nstream\n'); add(imgs[i].data); add('\nendstream\nendobj\n');
      obj(ct, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
    }
    var info = 3 + n * 3;
    obj(info, '<< /Title <FEFF' + Array.prototype.map.call(title, function (ch) { return ('0000' + ch.charCodeAt(0).toString(16)).slice(-4); }).join('') + '> /Producer (greeknt.org) >>');
    var xref = pos; add('xref\n0 ' + (info + 1) + '\n0000000000 65535 f \n');
    for (i = 1; i <= info; i++) add(('0000000000' + offs[i]).slice(-10) + ' 00000 n \n');
    add('trailer\n<< /Size ' + (info + 1) + ' /Root 1 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  window.GNT_PDF = {
    make: function (doc) {
      return fontsReady().then(function () {
        var pages = layout(doc), imgs = [];
        pages.forEach(function (p) { imgs.push(draw(p)); });
        return pdf(imgs, 'Vocabulary: ' + doc.title);
      });
    }
  };
})();
