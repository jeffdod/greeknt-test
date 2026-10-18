/* A small button that jumps to the top or the bottom of a long page.
   It appears only when the page is much taller than the screen. After you scroll down it
   takes you to the top; after you scroll up it takes you to the bottom. */
(function () {
  var LONG = 8;        // a page counts as long when it is taller than this many screens
  var NEAR_TOP = 300;  // closer to the top than this (pixels): offer the bottom
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'jump jump-hidden';
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><polyline points="5,15 12,8 19,15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(btn);

  var mode = 'top', last = window.pageYOffset || 0, dir = 'down', queued = false;
  var LABEL = { top: 'Back to the top of the page', bottom: 'Down to the bottom of the page' };

  function update() {
    queued = false;
    var h = document.documentElement.scrollHeight, vh = window.innerHeight;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (Math.abs(y - last) > 6) { dir = y > last ? 'down' : 'up'; last = y; }
    var long = h > LONG * vh;
    var atBottom = y + vh >= h - 40;
    var m;
    if (y < NEAR_TOP) m = 'bottom';
    else if (atBottom) m = 'top';
    else m = dir === 'down' ? 'top' : 'bottom';
    if (m !== mode || !btn.getAttribute('aria-label')) {
      mode = m;
      btn.classList.toggle('jump-bottom', m === 'bottom');
      btn.setAttribute('aria-label', LABEL[m]);
    }
    btn.classList.toggle('jump-hidden', !long);
  }
  function queue() { if (!queued) { queued = true; window.requestAnimationFrame(update); } }

  btn.addEventListener('click', function () {
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var to = mode === 'top' ? 0 : document.documentElement.scrollHeight;
    window.scrollTo({ top: to, behavior: calm ? 'auto' : 'smooth' });
  });
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('load', queue);
  if (window.ResizeObserver) new ResizeObserver(queue).observe(document.body);
  update();
})();
