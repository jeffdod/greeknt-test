/* Back and forward buttons for when the site runs as an installed app,
   because an installed app has no browser buttons. In a normal tab they are never added. */
(function () {
  var app = (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches ||
             window.matchMedia('(display-mode: fullscreen)').matches ||
             window.matchMedia('(display-mode: minimal-ui)').matches)) || window.navigator.standalone === true;
  if (!app) return;
  var bar = document.querySelector('.topbar .wrap');
  if (!bar) return;
  var NS = 'http://www.w3.org/2000/svg';
  function make(kind, label, flip) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'histbtn';
    b.setAttribute('aria-label', label);
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '20'); s.setAttribute('height', '20');
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    var p = document.createElementNS(NS, 'polyline');
    p.setAttribute('points', flip ? '9,5 16,12 9,19' : '15,5 8,12 15,19');
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '2.4'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    s.appendChild(p); b.appendChild(s);
    return b;
  }
  var back = make('back', 'Back', false), fwd = make('fwd', 'Forward', true);
  var box = document.createElement('div');
  box.className = 'histnav';
  box.appendChild(back); box.appendChild(fwd);
  bar.insertBefore(box, bar.firstChild);
  document.documentElement.classList.add('is-app');

  function refresh() {
    var nav = window.navigation;
    back.disabled = nav && typeof nav.canGoBack === 'boolean' ? !nav.canGoBack : window.history.length <= 1;
    fwd.disabled = nav && typeof nav.canGoForward === 'boolean' ? !nav.canGoForward : false;
  }
  back.addEventListener('click', function () { window.history.back(); });
  fwd.addEventListener('click', function () { window.history.forward(); });
  window.addEventListener('pageshow', refresh);
  window.addEventListener('popstate', refresh);
  window.addEventListener('hashchange', refresh);
  if (window.navigation && window.navigation.addEventListener) window.navigation.addEventListener('currententrychange', refresh);
  refresh();
})();
