/* Offline use: registers the service worker (sw.js) and runs the "Save the whole edition" control on the About page. */
(function () {
  var TOTAL = 752, FOLDER = 'images/pdf-pages/', CACHE = 'gnt-pages';
  function pad(n) { n = String(n); while (n.length < 3) n = '0' + n; return n; }
  function url(i) { return FOLDER + 'p' + pad(i) + '.webp'; }
  var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    /* wait a few seconds after the page has loaded, so saving the site for offline use does not compete with the page for the connection */
    window.addEventListener('load', function () { setTimeout(function () { navigator.serviceWorker.register('sw.js').catch(function () {}); }, 4000); });
  }

  var box = document.getElementById('offlineBox');
  if (!box) return;
  var saveBtn = document.getElementById('offlineSave'), clearBtn = document.getElementById('offlineClear');
  var status = document.getElementById('offlineStatus'), bar = document.getElementById('offlineBar');
  if (!('caches' in window) || !secure) {
    status.textContent = 'This browser cannot store the pages for offline use here.';
    saveBtn.hidden = true; clearBtn.hidden = true; bar.hidden = true;
    return;
  }
  var busy = false;

  function countSaved() {
    return caches.open(CACHE).then(function (c) { return c.keys(); }).then(function (k) { return k.length; }).catch(function () { return 0; });
  }
  function show(n) {
    bar.max = TOTAL; bar.value = n;
    if (n >= TOTAL) { status.textContent = 'All ' + TOTAL + ' pages of the edition are saved on this device.'; saveBtn.hidden = true; }
    else if (n > 0) { status.textContent = n + ' of ' + TOTAL + ' pages are saved on this device.'; saveBtn.hidden = false; saveBtn.textContent = 'Save the remaining pages'; }
    else { status.textContent = 'No page images are saved yet. Pages you view are saved automatically as you read.'; saveBtn.hidden = false; saveBtn.textContent = 'Save every page for offline use'; }
    clearBtn.hidden = n === 0;
  }
  function refresh() { countSaved().then(show); }

  function saveAll() {
    if (busy) return;
    if (navigator.onLine === false) { status.textContent = 'You need an internet connection to save the pages. Try again when you are online.'; return; }
    busy = true; saveBtn.disabled = true; clearBtn.disabled = true;
    if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }
    caches.open(CACHE).then(function (c) {
      return c.keys().then(function (have) {
        var got = {}; have.forEach(function (r) { got[new URL(r.url).pathname.split('/').pop()] = 1; });
        var todo = []; for (var i = 1; i <= TOTAL; i++) { if (!got['p' + pad(i) + '.webp']) todo.push(i); }
        var done = TOTAL - todo.length, failed = 0, next = 0;
        status.textContent = 'Saving pages: ' + done + ' of ' + TOTAL + '.'; bar.value = done;
        function worker() {
          if (next >= todo.length) return Promise.resolve();
          var i = todo[next++];
          return fetch(url(i)).then(function (r) { if (!r.ok) throw new Error(); return c.put(url(i), r); })
            .then(function () { done++; }, function () { failed++; })
            .then(function () { bar.value = done; status.textContent = 'Saving pages: ' + done + ' of ' + TOTAL + '.'; return worker(); });
        }
        var ws = []; for (var k = 0; k < 4; k++) ws.push(worker());
        return Promise.all(ws).then(function () { return failed; });
      });
    }).then(function (failed) {
      busy = false; saveBtn.disabled = false; clearBtn.disabled = false;
      refresh();
      if (failed) status.textContent += ' ' + failed + ' could not be saved. Check your connection and select the button again.';
    }).catch(function () { busy = false; saveBtn.disabled = false; clearBtn.disabled = false; refresh(); });
  }
  saveBtn.addEventListener('click', saveAll);
  clearBtn.addEventListener('click', function () {
    if (busy) return;
    caches.delete(CACHE).then(refresh);
  });
  refresh();
})();
