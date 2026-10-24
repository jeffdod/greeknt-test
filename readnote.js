/* “How to read a note” on Explore variants: two example notes, drawn by the same code as the results (stats.js),
   with their comparison and translation hints opened. Each part of a note gets a numbered marker that matches a line
   of the key below it; choosing either one outlines that part. The panel opens by itself on a visitor's first visit
   only (remembered on this device), and the examples are built the first time it is opened. */
(function () {
  'use strict';
  var box = document.getElementById('readnote');
  if (!box || !window.GNT_STATS) return;
  var KEY = 'gnt-readnote-seen', seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (!seen) { box.open = true; try { localStorage.setItem(KEY, '1'); } catch (e) {} }

  /* where each part of a note is, by the name used in the key's data-part */
  function part(li, name) {
    var all;
    switch (name) {
      case 'head': return li.querySelector('.rhd');
      case 'main': return li.querySelector('.lem');
      case 'reading': return li.querySelector('.rd');
      case 'reading2': return li.querySelectorAll('.rd')[1] || null;
      case 'cmpbtn': return li.querySelector('.rd .cmp-btn');
      case 'cmp': return li.querySelector('.cmp-panel');
      case 'card':
        all = [].filter.call(li.querySelectorAll('.cmp-cell'), function (c) { return c.querySelector('.cmp-nt'); });
        return all[all.length - 1] || null;
      case 'greek': return li.querySelector('.grline');
      case 'english': return li.querySelector('.enline');
      case 'copy': return li.querySelector('.copyhold');
      case 'hints': return li.querySelector('.hints');
    }
    return null;
  }

  function example(ol) {
    var keys = box.querySelector('.hw-keys[data-for="' + ol.id + '"]');
    if (!keys) return;
    var li = window.GNT_STATS.render(+ol.dataset.note, ol.id);
    ol.appendChild(li);
    var lines = [].slice.call(keys.children), btns = [];
    lines.forEach(function (line, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'hw-k';
      b.setAttribute('aria-pressed', 'false');
      var num = document.createElement('span'); num.className = 'hw-num'; num.textContent = i + 1; num.setAttribute('aria-hidden', 'true');
      var txt = document.createElement('span'); txt.className = 'hw-txt';
      while (line.firstChild) txt.appendChild(line.firstChild);
      b.appendChild(num); b.appendChild(txt); line.appendChild(b); btns.push(b);
      b.addEventListener('click', function () { show(i, true); });
    });
    function show(i, scroll) {
      [].forEach.call(li.querySelectorAll('.hw-on'), function (e) { e.classList.remove('hw-on'); });
      btns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      var t = part(li, lines[i].dataset.part);
      if (!t) return;
      t.classList.add('hw-on');
      if (scroll) t.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
    /* open the first reading's comparison and the translation hints */
    var c = li.querySelector('.rd .cmp-btn'); if (c) c.click();
    var h = li.querySelector('.hbtn'); if (h) h.click();
    /* the markers go in as the parts arrive (the Greek, the English and the comparison load separately) */
    var tries = 0, placed = [];
    (function mark() {
      var waiting = false;
      lines.forEach(function (line, i) {
        if (placed[i]) return;
        var t = part(li, line.dataset.part);
        if (!t) { waiting = true; return; }
        placed[i] = true;
        var m = document.createElement('button'); m.type = 'button'; m.className = 'hw-mk'; m.textContent = i + 1;
        m.setAttribute('aria-label', 'Part ' + (i + 1) + ': show its explanation');
        m.addEventListener('click', function (ev) { ev.preventDefault(); show(i, false); btns[i].focus(); btns[i].scrollIntoView({ block: 'nearest' }); });
        if (t.tagName === 'BUTTON') t.parentNode.insertBefore(m, t); else t.insertBefore(m, t.firstChild);
      });
      if (waiting && tries++ < 80) setTimeout(mark, 150);
    })();
  }

  var built = false;
  function build() {
    if (built) return;
    built = true;
    [].forEach.call(box.querySelectorAll('.hw-note'), example);
    var fill = function () { window.GNT_STATS.fill(box); };
    if (window.GNT_GR) window.GNT_GR.load(fill);
    if (window.GNT_EN) window.GNT_EN.load(fill);
  }
  if (box.open) build();
  box.addEventListener('toggle', function () { if (box.open) build(); });
})();
