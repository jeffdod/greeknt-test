/* "How to cite this edition": builds the panel and the copy buttons. */
(function () {
  var host = document.getElementById('cite-panel');
  if (!host) return;
  var URL_ = 'https://greeknt.org/';
  var STYLES = [
    ['SBL / Chicago', 'Dodson, J. Jeffrey, and Dwayne Green, eds. <i>The Greek New Testament According to the Byzantine Text</i>. Guardian Press, 2026. ' + URL_ + '.',
            'Dodson, J. Jeffrey, and Dwayne Green, eds. The Greek New Testament According to the Byzantine Text. Guardian Press, 2026. ' + URL_ + '.'],
    ['APA', 'Dodson, J. J., & Green, D. (Eds.). (2026). <i>The Greek New Testament according to the Byzantine text</i>. Guardian Press. ' + URL_,
            'Dodson, J. J., & Green, D. (Eds.). (2026). The Greek New Testament according to the Byzantine text. Guardian Press. ' + URL_],
    ['BibTeX', null,
      '@book{dodson-green-2026,\n  editor    = {Dodson, J. Jeffrey and Green, Dwayne},\n  title     = {The Greek New Testament According to the Byzantine Text},\n  publisher = {Guardian Press},\n  year      = {2026},\n  url       = {' + URL_ + '}\n}']
  ];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function copy(text, btn) {
    function done(ok) {
      var old = btn.dataset.label || btn.textContent; btn.dataset.label = old;
      btn.textContent = ok ? 'Copied' : 'Press Ctrl+C to copy';
      setTimeout(function () { btn.textContent = old; }, 1800);
    }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.className = 'cite-ta'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); done(ok);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }
  host.textContent = '';
  STYLES.forEach(function (s) {
    var row = el('div', 'cite-row');
    row.appendChild(el('h3', null, s[0]));
    var p = el(s[1] ? 'p' : 'pre', 'cite-text');
    if (s[1]) p.innerHTML = s[1]; else p.textContent = s[2];
    row.appendChild(p);
    var b = el('button', 'btn btn-quiet cite-copy', 'Copy'); b.type = 'button';
    b.setAttribute('aria-label', 'Copy the ' + s[0] + ' citation');
    b.addEventListener('click', function () { copy(s[2], b); });
    row.appendChild(b);
    host.appendChild(row);
  });
})();
