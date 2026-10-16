/* Copy text to the clipboard and show brief feedback on the button. */
window.GNT_copy = function (text, btn, label) {
  var old = btn.dataset.label || btn.textContent; btn.dataset.label = old;
  function done(ok) {
    btn.textContent = ok ? (label || 'Copied') : 'Press Ctrl+C to copy';
    setTimeout(function () { btn.textContent = old; }, 1800);
  }
  function fallback() {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
    ta.className = 'cite-ta'; document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); done(ok);
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
  else fallback();
};
