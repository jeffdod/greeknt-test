/* Point the form's redirect at the thank-you page of whichever site the visitor is on. */
(function () {
  var f = document.querySelector('.report-form');
  if (!f) return;
  var r = f.querySelector('input[name="redirectTo"]');
  if (!r) return;
  try { r.value = new URL('thank-you.html', window.location.href).href; } catch (e) {}
})();

/* Ask the visitor to tick the reCAPTCHA box before the form is sent. */
(function () {
  var f = document.querySelector('.report-form');
  var msg = document.getElementById('rfCaptchaMsg');
  if (!f || !msg) return;
  f.addEventListener('submit', function (e) {
    if (window.grecaptcha && typeof window.grecaptcha.getResponse === 'function' && !window.grecaptcha.getResponse()) {
      e.preventDefault();
      msg.hidden = false;
    } else {
      msg.hidden = true;
    }
  });
})();
