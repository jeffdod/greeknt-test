/* Page viewer: shows an image of a page of the edition in a pop-up.
   Any link with a data-pages attribute opens it: data-pages="297" or data-pages="297-299".
   The numbers are the page numbers printed in the book. Press Esc, click outside the page,
   or use the Close button to dismiss it. For a range, the arrows (or the left and right
   arrow keys) move between the pages. */
(function () {
  var OFFSET = 32;            /* the book's page 1 is page 33 of the PDF */
  var FOLDER = 'images/pdf-pages/';
  var dlg, img, cap, prev, next, zoomBtn, openLink, closeBtn, first, last, cur, opener;
  function pad(n) { n = String(n); while (n.length < 3) n = '0' + n; return n; }
  function src(p) { return FOLDER + 'p' + pad(p + OFFSET) + '.webp'; }
  function mk(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  function build() {
    if (dlg) return;
    dlg = mk('dialog', 'pv');
    dlg.setAttribute('aria-label', 'Page of the edition');
    var bar = mk('div', 'pv-bar');
    prev = mk('button', 'pv-btn', '← Previous'); prev.type = 'button';
    cap = mk('span', 'pv-cap'); cap.setAttribute('aria-live', 'polite');
    next = mk('button', 'pv-btn', 'Next →'); next.type = 'button';
    zoomBtn = mk('button', 'pv-btn', 'Enlarge'); zoomBtn.type = 'button';
    openLink = mk('a', 'pv-btn', 'Open image'); openLink.target = '_blank'; openLink.rel = 'noopener';
    closeBtn = mk('button', 'pv-btn pv-close', 'Close'); closeBtn.type = 'button';
    bar.appendChild(prev); bar.appendChild(cap); bar.appendChild(next); bar.appendChild(zoomBtn); bar.appendChild(openLink); bar.appendChild(closeBtn);
    var stage = mk('div', 'pv-stage');
    img = mk('img', 'pv-img'); img.width = 938; img.height = 1388;
    stage.appendChild(img);
    dlg.appendChild(bar); dlg.appendChild(stage);
    document.body.appendChild(dlg);
    closeBtn.addEventListener('click', function () { dlg.close(); });
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    zoomBtn.addEventListener('click', function () {
      var z = dlg.classList.toggle('pv-zoom');
      zoomBtn.textContent = z ? 'Fit to window' : 'Enlarge';
    });
    img.addEventListener('click', function () { zoomBtn.click(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target === stage) dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    });
    dlg.addEventListener('close', function () {
      img.removeAttribute('src');
      if (opener && opener.focus) opener.focus();
    });
  }
  function show() {
    var range = last > first, n = last - first + 1;
    dlg.setAttribute('aria-label', 'Page ' + cur + ' of the edition');
    cap.textContent = 'Page ' + cur + (range ? ' (' + (cur - first + 1) + ' of ' + n + ')' : '');
    img.alt = 'Image of page ' + cur + ' of the edition';
    img.src = src(cur);
    openLink.href = src(cur);
    prev.hidden = next.hidden = !range;
    prev.disabled = cur <= first; next.disabled = cur >= last;
    if (range && cur < last) { var pre = new Image(); pre.src = src(cur + 1); }
    var st = dlg.querySelector('.pv-stage'); if (st) st.scrollTop = 0;
  }
  function go(d) {
    var c = cur + d;
    if (c < first || c > last) return;
    cur = c; show();
  }
  function open(a, b, from) {
    build();
    first = a; last = b || a; cur = a; opener = from || null;
    dlg.classList.remove('pv-zoom'); zoomBtn.textContent = 'Enlarge';
    show();
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    closeBtn.focus();
  }
  function parse(s) {
    var m = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec((s || '').trim());
    if (!m) return null;
    var a = +m[1], b = m[2] ? +m[2] : a;
    if (b < a) b = a;
    return [a, b];
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-pages]') : null;
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    var r = parse(a.getAttribute('data-pages'));
    if (!r) return;
    e.preventDefault();
    open(r[0], r[1], a);
  });
  window.GNTPages = { open: open, link: function (text, pages) {
    var a = mk('a', 'pglink', text);
    var r = parse(String(pages));
    a.href = r ? src(r[0]) : '#';
    a.setAttribute('data-pages', String(pages));
    a.title = 'Show this page of the edition';
    return a;
  } };
})();
