/* Pin one note in Explore Variants, then move the pin through the notes now listed.
   Holding Previous or Next moves faster the longer it is held. The pin is kept on this device. */
(function () {
  'use strict';
  var KEY = 'gnt-pin';
  var DELAY = 450, STAGE = 1100, TICK = 110, SPEEDS = [1, 3, 10, 25];
  var R = null, pin = -1, bar = null, ui = {}, hold = null;

  function res() { return R || (R = window.GNT_RES || null); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  function load() {
    var r = res(); if (!r) return;
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o.k === 'string') {
        if (typeof o.i === 'number' && r.key(o.i) === o.k) pin = o.i;
        else pin = r.find(o.k);
      }
    } catch (e) {}
  }
  function save() {
    var r = res();
    try { if (pin >= 0 && r) localStorage.setItem(KEY, JSON.stringify({ i: pin, k: r.key(pin) })); else localStorage.removeItem(KEY); } catch (e) {}
  }
  function posOf(i) { var h = res().hits(); return i < 0 ? -1 : h.indexOf(i); }
  function itemOf(i) { return document.querySelector('#results li.res[data-i="' + i + '"]'); }

  function mark() {
    var all = document.querySelectorAll('#results li.res[data-i]'), k, li, on, b;
    for (k = 0; k < all.length; k++) {
      li = all[k]; on = +li.dataset.i === pin;
      li.classList.toggle('pinned', on);
      b = li.querySelector('.pinbtn');
      if (b) { b.textContent = on ? 'Pinned' : 'Pin'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    }
  }

  function decorate(li, head, idx) {
    li.dataset.i = idx;
    var b = el('button', 'pinbtn', idx === pin ? 'Pinned' : 'Pin');
    b.type = 'button'; b.setAttribute('aria-pressed', idx === pin ? 'true' : 'false');
    b.title = 'Pin this note to keep your place. A bar then lets you move the pin to the previous or next note.';
    b.addEventListener('click', function () { setPin(pin === idx ? -1 : idx); });
    head.insertBefore(b, head.firstChild);
    if (idx === pin) li.classList.add('pinned');
  }

  function build() {
    if (bar) return;
    var anchor = document.getElementById('results'); if (!anchor) return;
    bar = el('div', 'pinbar'); bar.hidden = true; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Pinned note');
    var row = el('div', 'pinrow');
    ui.prev = el('button', 'pinnav', '◀ Previous'); ui.prev.type = 'button'; ui.prev.setAttribute('aria-label', 'Previous note. Hold to move faster.');
    ui.count = el('button', 'pincount'); ui.count.type = 'button'; ui.count.title = 'Type a note number to jump to it';
    ui.pos = el('span', 'pinpos'); ui.ref = el('span', 'pinref'); ui.count.appendChild(ui.pos); ui.count.appendChild(ui.ref);
    ui.next = el('button', 'pinnav', 'Next ▶'); ui.next.type = 'button'; ui.next.setAttribute('aria-label', 'Next note. Hold to move faster.');
    row.appendChild(ui.prev); row.appendChild(ui.count); row.appendChild(ui.next);
    var row2 = el('div', 'pinrow pinrow2');
    ui.go = el('button', 'pinlite', 'Go to pin'); ui.go.type = 'button';
    ui.un = el('button', 'pinlite', 'Unpin'); ui.un.type = 'button';
    row2.appendChild(ui.go); row2.appendChild(ui.un);
    row2.appendChild(el('span', 'pinhint', 'Hold to move faster. Left and right arrow keys work too.'));
    ui.form = el('form', 'pinjump'); ui.form.hidden = true;
    var lab = el('label', null, 'Go to note '); ui.num = el('input'); ui.num.type = 'number'; ui.num.min = 1; ui.num.setAttribute('inputmode', 'numeric'); lab.appendChild(ui.num);
    var ok = el('button', 'pinlite', 'Go'); ok.type = 'submit';
    var no = el('button', 'pinlite', 'Cancel'); no.type = 'button';
    ui.form.appendChild(lab); ui.form.appendChild(ok); ui.form.appendChild(no);
    bar.appendChild(row); bar.appendChild(row2); bar.appendChild(ui.form);
    anchor.parentNode.insertBefore(bar, anchor);

    ui.go.addEventListener('click', goToPin);
    ui.un.addEventListener('click', function () { setPin(-1); });
    ui.count.addEventListener('click', function () {
      var p = posOf(pin); if (p < 0) return;
      ui.form.hidden = false; ui.num.max = res().hits().length; ui.num.value = p + 1; ui.num.focus(); ui.num.select();
    });
    no.addEventListener('click', function () { ui.form.hidden = true; });
    ui.form.addEventListener('submit', function (e) {
      e.preventDefault(); var v = parseInt(ui.num.value, 10), h = res().hits();
      if (v >= 1 && h.length) moveTo(Math.min(v, h.length) - 1);
      ui.form.hidden = true;
    });
    /* A tap or click is an ordinary click, which works the same on every device. Holding the button down (a press that lasts
       past DELAY) starts the repeating, speeding-up move instead; letting go then ends it and the click that follows is ignored. */
    [[ui.prev, -1], [ui.next, 1]].forEach(function (p) {
      var btn = p[0], dir = p[1];
      btn.addEventListener('pointerdown', function (e) { if (e.button > 0) return; startHold(dir, btn); });
      btn.addEventListener('click', function () {
        if (swallow) { swallow = false; return; }
        var q = posOf(pin); if (q >= 0) moveTo(q + dir);
      });
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    ['pointerup', 'pointercancel'].forEach(function (t) { document.addEventListener(t, function () { stopHold(true); }, true); });
    window.addEventListener('blur', function () { stopHold(false); });
  }

  function paint(shownPos) {
    if (!bar) return;
    if (pin < 0) { bar.hidden = true; document.body.classList.remove('pin-on'); return; }
    bar.hidden = false; document.body.classList.add('pin-on');
    var r = res(), h = r.hits(), p = shownPos != null ? shownPos : posOf(pin);
    if (p < 0) {
      ui.pos.textContent = 'The pinned note is not in this search'; ui.ref.textContent = r.label(pin);
      ui.count.classList.add('pinout'); ui.prev.disabled = ui.next.disabled = true; ui.go.textContent = 'Show it';
    } else {
      var shownIdx = shownPos != null ? h[shownPos] : pin;
      ui.count.classList.remove('pinout');
      ui.pos.textContent = (p + 1).toLocaleString('en-US') + ' of ' + h.length.toLocaleString('en-US');
      ui.ref.textContent = r.label(shownIdx);
      ui.prev.disabled = p <= 0; ui.next.disabled = p >= h.length - 1; ui.go.textContent = 'Go to pin';
    }
  }

  function scrollToPin() {
    var li = itemOf(pin);
    if (li) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function setPin(i) {
    stopHold(false);
    pin = i; save(); mark(); paint();
    if (ui.form) ui.form.hidden = true;
  }
  function moveTo(p) {
    var r = res(), h = r.hits(); if (!h.length) return;
    p = Math.max(0, Math.min(h.length - 1, p));
    r.ensure(p); setPin(h[p]); scrollToPin();
  }
  function goToPin() {
    var r = res();
    if (posOf(pin) < 0) { r.reset(); }
    var p = posOf(pin);
    if (p >= 0) moveTo(p);
  }

  var swallow = false;
  function startHold(dir, btn) {
    stopHold(false);
    var p0 = posOf(pin), h = res().hits(); if (p0 < 0) return;
    var t0 = Date.now(), last = h.length - 1;
    hold = { btn: btn, pos: p0, active: false, wait: null, timer: null, key: false };
    hold.wait = setTimeout(function () {
      if (!hold) return;
      hold.active = true; btn.classList.add('pinheld');
      hold.timer = setInterval(function () {
        var st = Math.min(SPEEDS.length - 1, Math.max(0, Math.floor((Date.now() - t0 - DELAY) / STAGE)));
        hold.pos = Math.max(0, Math.min(last, hold.pos + dir * SPEEDS[st]));
        paint(hold.pos);
        if (hold.pos === 0 || hold.pos === last) stopHold(true);
      }, TICK);
    }, DELAY);
  }
  function stopHold(commit) {
    if (!hold) return;
    clearTimeout(hold.wait); clearInterval(hold.timer);
    hold.btn.classList.remove('pinheld');
    var h = hold; hold = null;
    if (h.active) {
      swallow = !h.key;                 /* the click that ends a long press must not move the pin a second time */
      if (swallow) setTimeout(function () { swallow = false; }, 400);
      if (commit) moveTo(h.pos); else paint();
    }
  }

  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || pin < 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target;
    if (t && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable || (t.closest && t.closest('dialog,[role="dialog"],[role="tablist"],.cmp-panel')))) return;
    if (document.querySelector('dialog[open]') || posOf(pin) < 0) return;
    e.preventDefault();
    if (e.repeat) return;
    var dirK = e.key === 'ArrowLeft' ? -1 : 1, q = posOf(pin);
    if (q >= 0) moveTo(q + dirK);
    startHold(dirK, dirK < 0 ? ui.prev : ui.next); hold.key = true;
  });
  document.addEventListener('keyup', function (e) { if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && hold && hold.key) stopHold(true); });

  window.GNT_PIN = {
    decorate: decorate,
    refresh: function () { if (!res()) return; build(); mark(); if (!hold) paint(); },
    start: function () {
      if (!res()) return;
      build(); load(); mark(); paint();
      var p = posOf(pin);
      if (p >= 0) { res().ensure(p); mark(); setTimeout(scrollToPin, 250); }
    }
  };
})();
