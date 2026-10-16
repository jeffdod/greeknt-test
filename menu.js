/* Small-screen menu: close it after a link is chosen, or on Escape. */
(function () {
  var d = document.querySelector('details.navmenu');
  if (!d) return;
  d.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) d.removeAttribute('open');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') d.removeAttribute('open');
  });
  document.addEventListener('click', function (e) {
    if (!d.contains(e.target)) d.removeAttribute('open');
  });
})();
