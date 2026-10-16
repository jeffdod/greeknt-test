/* Point the form's redirect at the thank-you page of whichever site the visitor is on. */
(function () {
  var f = document.querySelector('.report-form');
  if (!f) return;
  var r = f.querySelector('input[name="redirectTo"]');
  if (!r) return;
  try { r.value = new URL('thank-you.html', window.location.href).href; } catch (e) {}
})();
