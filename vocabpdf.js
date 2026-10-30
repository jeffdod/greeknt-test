/* Makes the vocabulary list as a PDF file, on the device, with no outside service.
   First choice: real text, with the fonts (EB Garamond and GFS Didot, fonts/pdf/*.ttf) embedded in the file, so the letters are
   sharp at any size, and the text can be selected and searched.
   Fallback (if the font files cannot be loaded): each page is drawn with the site's own fonts and stored as a 300-dpi picture.
   GNT_PDF.make(doc) returns a promise of a Blob. */
(function () {
  'use strict';
  var W = 612, H = 792, M = 54, SCALE = 25 / 6, INK = '#1f2a36', SOFT = '#5a6270', RUB = '#8a2a1e', RULE = '#bdb6a6';
  var FACES = {
    reg: { url: 'fonts/pdf/EBGaramond-Regular.ttf', name: 'EBGaramond-Regular', css: function (s) { return '400 ' + s + 'px "EB Garamond", Georgia, serif'; } },
    it: { url: 'fonts/pdf/EBGaramond-Italic.ttf', name: 'EBGaramond-Italic', css: function (s) { return 'italic 400 ' + s + 'px "EB Garamond", Georgia, serif'; } },
    sb: { url: 'fonts/pdf/EBGaramond-SemiBold.ttf', name: 'EBGaramond-SemiBold', css: function (s) { return '600 ' + s + 'px "EB Garamond", Georgia, serif'; } },
    gr: { url: 'fonts/pdf/GFSDidot-Regular.ttf', name: 'GFSDidot-Regular', css: function (s) { return '400 ' + s + 'px "GFS Didot", "EB Garamond", serif'; } }
  };
  var COLS = [{ w: 112, h: 'Greek' }, { w: 240, h: 'Meaning' }, { w: 46, h: 'Strong’s', r: 1 }, { w: 62, h: 'In the edition', r: 1 }, { w: 44, h: 'Here', r: 1 }];
  /* characters a font may lack, and what to print instead */
  var SUBST = { 0x2219: 0xb7, 0x2022: 0xb7 };

  /* ---------- layout, shared by both ways of making the file ---------- */
  function wrapRuns(runs, maxW, measure) {
    var lines = [], line = [], x = 0;
    function flush() { if (line.length) lines.push(line); line = []; x = 0; }
    runs.forEach(function (r) {
      r.t.split(/(\s+)/).forEach(function (p) {
        if (!p) return;
        var w = measure(r.f, r.s, p);
        if (/^\s+$/.test(p)) { if (x > 0) { line.push({ t: ' ', f: r.f, s: r.s, c: r.c, x: x }); x += w; } return; }
        if (x + w > maxW && x > 0) { while (line.length && line[line.length - 1].t === ' ') line.pop(); flush(); }
        line.push({ t: p, f: r.f, s: r.s, c: r.c, x: x }); x += w;
      });
    });
    while (line.length && line[line.length - 1].t === ' ') line.pop();
    flush();
    return lines;
  }
  function R(t, f, s, c) { return { t: t, f: f, s: s, c: c }; }

  function layout(doc, measure) {
    var pages = [], ops, y;
    function newPage() { ops = []; pages.push(ops); y = M; }
    function text(x, yy, t, f, s, c, a) { ops.push({ k: 't', x: x, y: yy, t: t, f: f, s: s, c: c, a: a }); }
    function rule(yy, wd, c) { ops.push({ k: 'l', y: yy, w: wd, c: c }); }
    function block(runs, size, lead, maxW) {
      wrapRuns(runs, maxW, measure).forEach(function (l) { l.forEach(function (p) { text(M + p.x, y + size, p.t, p.f, p.s, p.c); }); y += lead; });
    }
    newPage();
    block([R('Vocabulary: ' + doc.title, 'reg', 20, INK)], 20, 26, W - 2 * M);
    block([R('The Greek New Testament, Byzantine Text · greeknt.org', 'it', 10.5, SOFT)], 10.5, 15, W - 2 * M);
    y += 4; rule(y, 1.2, RUB); y += 10;
    block([R('Included: ', 'sb', 10, INK), R(doc.filt, 'reg', 10, SOFT)], 10, 14, W - 2 * M);
    y += 8;
    function header() {
      var x = M;
      COLS.forEach(function (c) { text(c.r ? x + c.w - 6 : x, y + 9, c.h, 'sb', 9.5, SOFT, c.r ? 'r' : null); x += c.w; });
      y += 14; rule(y, 1.2, RUB); y += 4;
    }
    header();
    var bottom = H - M - 18;
    if (!doc.rows.length) block([R('No words match these choices.', 'reg', 11, SOFT)], 11, 16, W - 2 * M);
    doc.rows.forEach(function (e) {
      var mean = wrapRuns([R(e.gloss + ' ', 'reg', 11, INK), R('(' + e.kind + ')', 'reg', 9.5, SOFT)], COLS[1].w - 8, measure), forms = [];
      e.forms.forEach(function (fm) {
        forms.push(wrapRuns([R(fm.spell, 'gr', 11, INK), R((fm.text ? ' · ' + fm.text : '') + ' · ' + fm.verses.join(', ') + (fm.n > 1 ? ' ×' + fm.n : ''), 'reg', 9.5, SOFT)], COLS[1].w - 8, measure));
      });
      var greekLines = wrapRuns([R(e.hw, 'gr', 13, INK)], COLS[0].w - 8, measure);
      var hMean = mean.length * 14 + forms.reduce(function (a, l) { return a + l.length * 13; }, 0) + (forms.length ? 2 : 0);
      var hRow = Math.max(hMean, greekLines.length * 17) + 9;
      if (y + hRow > bottom) { newPage(); header(); }
      var top = y + 4, x = M;
      greekLines.forEach(function (l, i) { l.forEach(function (p) { text(x + p.x, top + 11 + i * 17, p.t, p.f, p.s, p.c); }); });
      x += COLS[0].w;
      var yy = top;
      mean.forEach(function (l) { l.forEach(function (p) { text(x + p.x, yy + 10, p.t, p.f, p.s, p.c); }); yy += 14; });
      if (forms.length) yy += 2;
      forms.forEach(function (fl) { fl.forEach(function (l) { l.forEach(function (p) { text(x + p.x, yy + 9.5, p.t, p.f, p.s, p.c); }); yy += 13; }); });
      x += COLS[1].w;
      [e.s ? 'G' + e.s : '', e.freq.toLocaleString('en-US'), String(e.here)].forEach(function (v, i) {
        var c = COLS[i + 2]; text(x + c.w - 6, top + 10, v, 'reg', 11, INK, 'r'); x += c.w;
      });
      y += hRow; rule(y - 2, 0.5, RULE);
    });
    y += 10;
    block([R(doc.count + ' Meanings from the Strong’s dictionary, as shown on the site.', 'reg', 9.5, SOFT)], 9.5, 13, W - 2 * M);
    pages.forEach(function (p, i) {
      p.push({ k: 't', x: M, y: H - M + 6, t: 'greeknt.org', f: 'reg', s: 9, c: SOFT });
      p.push({ k: 't', x: W - M, y: H - M + 6, t: 'Page ' + (i + 1) + ' of ' + pages.length, f: 'reg', s: 9, c: SOFT, a: 'r' });
    });
    return pages;
  }

  /* ---------- small helpers ---------- */
  var enc = new TextEncoder();
  function deflate(u8) {
    if (!window.CompressionStream) return Promise.resolve(null);
    var cs = new CompressionStream('deflate'), wr = cs.writable.getWriter();
    wr.write(u8); wr.close();
    return new Response(cs.readable).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }
  function rgb(hex) { return [1, 3, 5].map(function (i) { return (parseInt(hex.substr(i, 2), 16) / 255).toFixed(3); }).join(' '); }
  function num(n) { return String(Math.round(n * 1000) / 1000); }
  function hex4(n) { return ('0000' + n.toString(16)).slice(-4); }

  /* A PDF being written: objects are numbered from 1; reserve() gives a number to fill in later */
  function Writer() { this.objs = [null]; }
  Writer.prototype.reserve = function () { this.objs.push(null); return this.objs.length - 1; };
  Writer.prototype.set = function (n, dict, stream) { this.objs[n] = { d: dict, s: stream || null }; return n; };
  Writer.prototype.add = function (dict, stream) { return this.set(this.reserve(), dict, stream); };
  Writer.prototype.blob = function (rootNo, infoNo) {
    var chunks = [], pos = 0, offs = [];
    function put(x) { var u = typeof x === 'string' ? enc.encode(x) : x; chunks.push(u); pos += u.length; }
    put('%PDF-1.5\n%\xe2\xe3\xcf\xd3\n');
    for (var i = 1; i < this.objs.length; i++) {
      var o = this.objs[i]; offs[i] = pos;
      put(i + ' 0 obj\n' + o.d.replace('__LEN__', o.s ? o.s.length : 0));
      if (o.s) { put('\nstream\n'); put(o.s); put('\nendstream'); }
      put('\nendobj\n');
    }
    var xref = pos, n = this.objs.length;
    put('xref\n0 ' + n + '\n0000000000 65535 f \n');
    for (i = 1; i < n; i++) put(('0000000000' + offs[i]).slice(-10) + ' 00000 n \n');
    put('trailer\n<< /Size ' + n + ' /Root ' + rootNo + ' 0 R /Info ' + infoNo + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(chunks, { type: 'application/pdf' });
  };
  function infoDict(title) {
    return '<< /Title <FEFF' + Array.prototype.map.call(title, function (ch) { return hex4(ch.charCodeAt(0)); }).join('') + '> /Producer (greeknt.org) >>';
  }

  /* ---------- real text with embedded fonts ---------- */
  function parseFont(buf) {
    var dv = new DataView(buf), n = dv.getUint16(4), t = {};
    for (var i = 0; i < n; i++) {
      var o = 12 + i * 16, tag = String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
      t[tag] = { o: dv.getUint32(o + 8), l: dv.getUint32(o + 12) };
    }
    var f = { buf: buf, upem: dv.getUint16(t.head.o + 18), bbox: [dv.getInt16(t.head.o + 36), dv.getInt16(t.head.o + 38), dv.getInt16(t.head.o + 40), dv.getInt16(t.head.o + 42)],
      asc: dv.getInt16(t.hhea.o + 4), desc: dv.getInt16(t.hhea.o + 6), glyphs: dv.getUint16(t.maxp.o + 4), nh: dv.getUint16(t.hhea.o + 34), map: {}, used: {} };
    var adv = [], last = 0;
    for (i = 0; i < f.glyphs; i++) { if (i < f.nh) last = dv.getUint16(t.hmtx.o + i * 4); adv[i] = last; }
    f.adv = adv;
    /* the character map: format 12 or format 4 */
    var cm = t.cmap.o, cnt = dv.getUint16(cm + 2), best = null;
    for (i = 0; i < cnt; i++) {
      var pid = dv.getUint16(cm + 4 + i * 8), eid = dv.getUint16(cm + 6 + i * 8), off = cm + dv.getUint32(cm + 8 + i * 8), fmt = dv.getUint16(off);
      if ((fmt === 12 || fmt === 4) && (pid === 3 || pid === 0)) { if (!best || fmt === 12 || (pid === 3 && eid === 1 && best.fmt !== 12)) best = { off: off, fmt: fmt }; }
    }
    if (!best) throw new Error('no character map');
    var off2 = best.off, c;
    if (best.fmt === 12) {
      var ng = dv.getUint32(off2 + 12);
      for (i = 0; i < ng; i++) {
        var s = dv.getUint32(off2 + 16 + i * 12), e = dv.getUint32(off2 + 20 + i * 12), g = dv.getUint32(off2 + 24 + i * 12);
        for (c = s; c <= e; c++) f.map[c] = g + c - s;
      }
    } else {
      var sc = dv.getUint16(off2 + 6) / 2, ends = off2 + 14, starts = ends + sc * 2 + 2, deltas = starts + sc * 2, ranges = deltas + sc * 2;
      for (i = 0; i < sc; i++) {
        var end = dv.getUint16(ends + i * 2), st = dv.getUint16(starts + i * 2), dl = dv.getInt16(deltas + i * 2), ro = dv.getUint16(ranges + i * 2);
        for (c = st; c <= end && c !== 0xffff; c++) {
          var gid;
          if (ro === 0) gid = (c + dl) & 0xffff;
          else { var gp = ranges + i * 2 + ro + (c - st) * 2; gid = dv.getUint16(gp); if (gid) gid = (gid + dl) & 0xffff; }
          if (gid) f.map[c] = gid;
        }
      }
    }
    return f;
  }
  /* characters -> glyph numbers (a character the font lacks is replaced, or left out) */
  function glyphsOf(f, str) {
    var out = [];
    Array.from(str.normalize('NFC')).forEach(function (ch) {
      var c = ch.codePointAt(0), g = f.map[c];
      if (g == null && SUBST[c]) { c = SUBST[c]; g = f.map[c]; }
      if (g == null) { if (c >= 0x300 && c < 0x370) return; g = f.map[0x3f]; c = 0x3f; }
      if (g != null) out.push({ g: g, c: c });
    });
    return out;
  }
  function loadFonts() {
    var keys = Object.keys(FACES);
    return Promise.all(keys.map(function (k) {
      return fetch(FACES[k].url).then(function (r) { if (!r.ok) throw new Error('font ' + k); return r.arrayBuffer(); }).then(function (b) { return parseFont(b); });
    })).then(function (list) { var o = {}; keys.forEach(function (k, i) { o[k] = list[i]; }); return o; });
  }

  function vectorPdf(doc, fonts) {
    var measure = function (face, size, str) {
      var f = fonts[face], w = 0; glyphsOf(f, str).forEach(function (x) { w += f.adv[x.g]; });
      return w * size / f.upem;
    };
    var pages = layout(doc, measure), wr = new Writer(), cat = wr.reserve(), pagesNo = wr.reserve(), fontNo = {};
    var keys = Object.keys(FACES), tasks = [];
    /* the pages' content streams first, which also records which glyphs each font needs */
    var contents = pages.map(function (ops) {
      var s = '';
      ops.forEach(function (o) {
        if (o.k === 'l') { s += rgb(o.c).replace(/(\S+) (\S+) (\S+)/, '$1 $2 $3 RG ') + num(o.w) + ' w ' + M + ' ' + num(H - o.y) + ' m ' + (W - M) + ' ' + num(H - o.y) + ' l S\n'; return; }
        var f = fonts[o.f], gl = glyphsOf(f, o.t), x = o.x, hex = '';
        if (!gl.length) return;
        gl.forEach(function (x2) { f.used[x2.g] = x2.c; hex += hex4(x2.g); });
        if (o.a === 'r') x -= measure(o.f, o.s, o.t);
        s += 'BT /' + o.f + ' ' + num(o.s) + ' Tf ' + rgb(o.c) + ' rg 1 0 0 1 ' + num(x) + ' ' + num(H - o.y) + ' Tm <' + hex + '> Tj ET\n';
      });
      return enc.encode(s);
    });
    /* the fonts */
    keys.forEach(function (k) {
      var f = fonts[k], face = FACES[k], gids = Object.keys(f.used).map(Number).sort(function (a, b) { return a - b; });
      if (!gids.length) return;
      var fileNo = wr.reserve(), descNo = wr.reserve(), cidNo = wr.reserve(), toUniNo = wr.reserve(), type0 = wr.reserve();
      fontNo[k] = type0;
      var u8 = new Uint8Array(f.buf);
      tasks.push(deflate(u8).then(function (z) {
        wr.set(fileNo, '<< /Length __LEN__ /Length1 ' + u8.length + (z ? ' /Filter /FlateDecode' : '') + ' >>', z || u8);
      }));
      var sc = 1000 / f.upem, tag = 'ABCDEF+' + face.name;
      wr.set(descNo, '<< /Type /FontDescriptor /FontName /' + tag + ' /Flags 4 /FontBBox [' + f.bbox.map(function (v) { return Math.round(v * sc); }).join(' ') + '] /ItalicAngle ' + (k === 'it' ? -10 : 0) +
        ' /Ascent ' + Math.round(f.asc * sc) + ' /Descent ' + Math.round(f.desc * sc) + ' /CapHeight ' + Math.round(f.asc * sc * 0.7) + ' /StemV 80 /FontFile2 ' + fileNo + ' 0 R >>');
      wr.set(cidNo, '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /' + tag + ' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ' + descNo + ' 0 R /CIDToGIDMap /Identity /DW 0 /W [' +
        gids.map(function (g) { return g + ' [' + Math.round(f.adv[g] * sc) + ']'; }).join(' ') + '] >>');
      var cmap = '/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /Adobe-Identity-UCS def /CMapType 2 def 1 begincodespacerange <0000> <FFFF> endcodespacerange\n';
      for (var i = 0; i < gids.length; i += 100) {
        var part = gids.slice(i, i + 100);
        cmap += part.length + ' beginbfchar\n' + part.map(function (g) {
          var c = f.used[g], u = c > 0xffff ? hex4(0xd800 + ((c - 0x10000) >> 10)) + hex4(0xdc00 + ((c - 0x10000) & 0x3ff)) : hex4(c);
          return '<' + hex4(g) + '> <' + u + '>';
        }).join('\n') + '\nendbfchar\n';
      }
      cmap += 'endcmap CMapName currentdict /CMap defineresource pop end end';
      var cm8 = enc.encode(cmap);
      wr.set(toUniNo, '<< /Length __LEN__ >>', cm8);
      wr.set(type0, '<< /Type /Font /Subtype /Type0 /BaseFont /' + tag + ' /Encoding /Identity-H /DescendantFonts [' + cidNo + ' 0 R] /ToUnicode ' + toUniNo + ' 0 R >>');
    });
    var res = '<< /Font << ' + Object.keys(fontNo).map(function (k) { return '/' + k + ' ' + fontNo[k] + ' 0 R'; }).join(' ') + ' >> >>';
    var kids = [];
    contents.forEach(function (c) {
      var pageNo = wr.reserve(), cNo = wr.reserve(); kids.push(pageNo + ' 0 R');
      wr.set(pageNo, '<< /Type /Page /Parent ' + pagesNo + ' 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources ' + res + ' /Contents ' + cNo + ' 0 R >>');
      tasks.push(deflate(c).then(function (z) { wr.set(cNo, '<< /Length __LEN__' + (z ? ' /Filter /FlateDecode' : '') + ' >>', z || c); }));
    });
    wr.set(pagesNo, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>');
    wr.set(cat, '<< /Type /Catalog /Pages ' + pagesNo + ' 0 R >>');
    var info = wr.add(infoDict('Vocabulary: ' + doc.title));
    return Promise.all(tasks).then(function () { return wr.blob(cat, info); });
  }

  /* ---------- the fallback: pictures of the pages ---------- */
  function fontsReady() {
    var f = document.fonts;
    if (!f || !f.load) return Promise.resolve();
    return Promise.all(['400 12px "EB Garamond"', 'italic 400 12px "EB Garamond"', '600 12px "EB Garamond"', '400 12px "GFS Didot"'].map(function (x) { return f.load(x, 'αabc'); })).catch(function () {});
  }
  function rasterPdf(doc) {
    return fontsReady().then(function () {
      var m = document.createElement('canvas').getContext('2d');
      var pages = layout(doc, function (face, size, str) { m.font = FACES[face].css(size); return m.measureText(str).width; });
      var imgs = [], chain = Promise.resolve();
      pages.forEach(function (ops) { chain = chain.then(function () { return drawPage(ops); }).then(function (im) { imgs.push(im); }); });
      return chain.then(function () {
        var wr = new Writer(), cat = wr.reserve(), pagesNo = wr.reserve(), kids = [];
        imgs.forEach(function (im) {
          var pageNo = wr.reserve(), imNo = wr.reserve(), cNo = wr.reserve(); kids.push(pageNo + ' 0 R');
          wr.set(pageNo, '<< /Type /Page /Parent ' + pagesNo + ' 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 ' + imNo + ' 0 R >> >> /Contents ' + cNo + ' 0 R >>');
          wr.set(imNo, '<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace ' + (im.flate ? '/DeviceGray' : '/DeviceRGB') + ' /BitsPerComponent 8 /Filter ' + (im.flate ? '/FlateDecode' : '/DCTDecode') + ' /Length __LEN__ >>', im.data);
          wr.set(cNo, '<< /Length __LEN__ >>', enc.encode('q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q'));
        });
        wr.set(pagesNo, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>');
        wr.set(cat, '<< /Type /Catalog /Pages ' + pagesNo + ' 0 R >>');
        return wr.blob(cat, wr.add(infoDict('Vocabulary: ' + doc.title)));
      });
    });
  }
  function drawPage(ops) {
    var cv = document.createElement('canvas'); cv.width = Math.round(W * SCALE); cv.height = Math.round(H * SCALE);
    var c = cv.getContext('2d'); c.scale(SCALE, SCALE);
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.textBaseline = 'alphabetic';
    ops.forEach(function (o) {
      if (o.k === 'l') { c.strokeStyle = o.c; c.lineWidth = o.w; c.beginPath(); c.moveTo(M, o.y); c.lineTo(W - M, o.y); c.stroke(); return; }
      c.font = FACES[o.f].css(o.s); c.fillStyle = o.c; c.textAlign = o.a === 'r' ? 'right' : 'left'; c.fillText(o.t, o.x, o.y);
    });
    if (window.CompressionStream) {
      var px = c.getImageData(0, 0, cv.width, cv.height).data, g = new Uint8Array(cv.width * cv.height);
      for (var i = 0, j = 0; j < g.length; i += 4, j++) g[j] = px[i];
      return deflate(g).then(function (z) { return { data: z, w: cv.width, h: cv.height, flate: true }; });
    }
    var url = cv.toDataURL('image/jpeg', 0.97), b = atob(url.split(',')[1]), u = new Uint8Array(b.length);
    for (var k = 0; k < b.length; k++) u[k] = b.charCodeAt(k);
    return Promise.resolve({ data: u, w: cv.width, h: cv.height });
  }

  window.GNT_PDF = {
    make: function (doc) {
      return loadFonts().then(function (fonts) { return vectorPdf(doc, fonts); }).catch(function (e) {
        try { console.warn('PDF with embedded fonts failed, using page pictures:', e && e.message); } catch (x) {}
        return rasterPdf(doc);
      });
    }
  };
})();
