/* My notes in Explore Variants: a note of your own on a footnote as a whole and on each of its readings, kept in this
   browser's IndexedDB. It is offered only where stored data is safe from being cleared (an installed app, or a desktop
   browser other than Safari). Nothing leaves the device unless you download a file. */
(function () {
  'use strict';
  var api = window.GNT_MYNOTES = { available: false, ready: false, count: 0 };

  /* ---------- where the feature is offered ---------- */
  function offered() {
    if (!window.indexedDB) return false;
    var ua = navigator.userAgent || '', app = false;
    var mm = window.matchMedia ? function (q) { return window.matchMedia(q); } : null;
    if (navigator.standalone === true) app = true;
    else if (mm && mm('(display-mode)').matches) app = !mm('(display-mode: browser)').matches;
    else if (document.referrer.indexOf('android-app://') === 0) app = true;
    if (app) return true;
    var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /Android/i.test(ua);
    var safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/.test(ua);
    return !ios && !android && !safari;
  }
  if (!offered()) return;
  api.available = true;

  var DB = 'gnt-notes', STORE = 'notes', BACKUPKEY = 'gnt-notes-backup';
  var db = null, M = new Map(), K = new Map(), pending = new Map(), timer = null, waiters = [];
  var R = null, keyIdx = null;

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function res() { return R || (R = window.GNT_RES || null); }
  function fmtDate(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    try { return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return d.toString(); }
  }
  function foldText(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function idxOfKey(k) {
    var r = res(); if (!r) return undefined;
    if (!keyIdx) { keyIdx = new Map(); for (var i = 0, n = r.size(); i < n; i++) keyIdx.set(r.key(i), i); }
    return keyIdx.get(k);
  }
  /* the ids of a note's slots: 'g' for the footnote as a whole, then one for each reading, named from the reading's own text */
  function slotsOf(info) {
    var seen = {}, out = ['g'];
    info.readings.forEach(function (r) {
      var base = 'r' + hash(r.txt ? '\u0001txt' : r.text), n = (seen[base] = (seen[base] || 0) + 1);
      out.push(n > 1 ? base + '~' + n : base);
    });
    return out;
  }

  /* ---------- storage ---------- */
  function index(rec) { var s = K.get(rec.key); if (!s) K.set(rec.key, (s = new Set())); s.add(rec.id); }
  function unindex(rec) { var s = K.get(rec.key); if (s) { s.delete(rec.id); if (!s.size) K.delete(rec.key); } }
  function setRec(rec) { var old = M.get(rec.id); if (old) unindex(old); M.set(rec.id, rec); index(rec); api.count = M.size; }
  function dropRec(id) { var old = M.get(id); if (old) unindex(old); M.delete(id); api.count = M.size; }
  var onSaved = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(flush, 500); }
  function flush() {
    clearTimeout(timer);
    if (!db || !pending.size) return;
    var batch = pending; pending = new Map();
    var tx;
    try { tx = db.transaction(STORE, 'readwrite'); } catch (e) { batch.forEach(function (v, id) { if (!pending.has(id)) pending.set(id, v); }); return; }
    var st = tx.objectStore(STORE);
    batch.forEach(function (v, id) { if (v) st.put(v); else st.delete(id); });
    tx.oncomplete = function () { if (onSaved) onSaved(true); };
    tx.onerror = tx.onabort = function () { if (onSaved) onSaved(false); };
  }
  function touchStore(rec) {
    setRec(rec); pending.set(rec.id, rec); schedule();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  }
  function removeRec(id) { dropRec(id); pending.set(id, null); schedule(); }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

  function finish(ok) {
    api.ready = ok; if (!ok) api.available = false;
    var w = waiters; waiters = [];
    w.forEach(function (f) { try { f(ok); } catch (e) {} });
    if (ok) { paintAll(); updateListBtn(); } else { hideUi(); }
  }
  api.whenReady = function (f) { if (api.ready) f(true); else waiters.push(f); };
  (function open() {
    var rq;
    try { rq = indexedDB.open(DB, 1); } catch (e) { finish(false); return; }
    rq.onupgradeneeded = function () { if (!rq.result.objectStoreNames.contains(STORE)) rq.result.createObjectStore(STORE, { keyPath: 'id' }); };
    rq.onerror = rq.onblocked = function () { finish(false); };
    rq.onsuccess = function () {
      db = rq.result;
      db.onversionchange = function () { db.close(); };
      var all;
      try { all = db.transaction(STORE, 'readonly').objectStore(STORE).getAll(); } catch (e) { finish(false); return; }
      all.onsuccess = function () { (all.result || []).forEach(setRec); finish(true); };
      all.onerror = function () { finish(false); };
    };
  })();

  /* ---------- the notes on one footnote ---------- */
  function recFor(key, slot) { return M.get(key + '|' + slot) || null; }
  function countFor(key) { var s = K.get(key); return s ? s.size : 0; }

  /* edit one slot of the open footnote; returns the stored record, or null when both title and text are empty */
  function save(info, slot, title, text) {
    var id = info.key + '|' + slot, rec = M.get(id), now = new Date().toISOString();
    title = title.slice(0, 200); text = text.slice(0, 50000);
    if (!title.trim() && !text.trim()) { if (rec) removeRec(id); return null; }
    if (!rec) rec = { id: id, key: info.key, slot: slot, ref: info.label, title: '', text: '', created: now, modified: now };
    if (rec.title !== title || rec.text !== text) { rec.title = title; rec.text = text; rec.modified = now; }
    rec.ref = info.label;
    touchStore(rec);
    return rec;
  }

  /* ---------- notes drawn in the results ---------- */
  function fill(host, rec, about) {
    host.textContent = '';
    if (!rec) return;
    var d = el('div', 'mynote'), lab = el('span', 'mn-lab', rec.title ? '' : 'My note');
    if (rec.title) { var t = el('b', 'mn-title', rec.title); lab.appendChild(t); }
    d.appendChild(lab);
    if (rec.text) d.appendChild(document.createTextNode(rec.text));
    host.appendChild(d);
  }
  function paintCard(li) {
    var st = li._nt; if (!st) return;
    var r = res(), info = r.info(st.idx), slots = slotsOf(info), n = 0, key = r.key(st.idx);
    st.hosts.forEach(function (h, k) {
      var rec = api.ready ? recFor(key, slots[k]) : null;
      fill(h, rec); if (rec) n++;
    });
    st.btn.textContent = n ? 'Notes (' + n + ')' : 'Note';
    st.btn.classList.toggle('has', n > 0);
  }
  function paintAll() {
    var all = document.querySelectorAll('#results li.res[data-i]'), k;
    for (k = 0; k < all.length; k++) paintCard(all[k]);
  }
  function paintIdx(idx) { var li = document.querySelector('#results li.res[data-i="' + idx + '"]'); if (li) paintCard(li); }

  api.decorate = function (li, head, idx) {
    var btn = el('button', 'ntbtn', 'Note'); btn.type = 'button';
    btn.title = 'Write your own note on this footnote, or on any one of its readings';
    btn.addEventListener('click', function () { openEditor(idx, 'g'); });
    head.insertBefore(btn, head.firstChild);
    li.dataset.i = idx;
    var hosts = [], g = el('div', 'nt-slot');
    li.insertBefore(g, head.nextSibling); hosts.push(g);
    var rows = li.querySelectorAll(':scope > .rd:not(.br)');
    Array.prototype.forEach.call(rows, function (d) { var h = el('div', 'nt-slot nt-rslot'); d.parentNode.insertBefore(h, d.nextSibling); hosts.push(h); });
    li._nt = { idx: idx, btn: btn, hosts: hosts };
    if (api.ready) paintCard(li);
  };

  /* ---------- finding notes: the filter fields in the search form ---------- */
  api.matchSet = function (onlyMine, text) {
    var out = new Set(), q = foldText(text || '').trim().split(/\s+/).filter(Boolean);
    M.forEach(function (rec) {
      var idx = idxOfKey(rec.key); if (idx === undefined) return;
      if (q.length) { var hay = foldText(rec.title + ' ' + rec.text); if (!q.every(function (w) { return hay.indexOf(w) >= 0; })) return; }
      out.add(idx);
    });
    return out;
  };
  function hideUi() {
    ['ntFilter1', 'ntFilter2'].forEach(function (id) { var e = document.getElementById(id); if (e) e.hidden = true; });
    var b = document.getElementById('ntList'); if (b) b.hidden = true;
    var all = document.querySelectorAll('.ntbtn,.nt-slot,.pinnote'), k;
    for (k = 0; k < all.length; k++) all[k].hidden = true;
  }
  var uiShown = false;
  function showUi() {
    if (uiShown || !api.available) return; uiShown = true;
    ['ntFilter1', 'ntFilter2'].forEach(function (id) { var e = document.getElementById(id); if (e) e.hidden = false; });
    var b = document.getElementById('ntList'); if (b) { b.hidden = false; b.addEventListener('click', function () { openPanel('list'); }); }
  }
  function updateListBtn() {
    var b = document.getElementById('ntList'); if (b) b.textContent = M.size ? 'My notes (' + M.size + ')' : 'My notes';
  }

  /* ---------- the panel: the list of notes, and the editor ---------- */
  var P = null, view = 'list', ed = null;        /* ed: the footnote being edited */
  var listSort = 'edited', listFind = '', confirming = false;

  function build() {
    if (P) return;
    P = {};
    P.back = el('div', 'nt-back'); P.back.hidden = true;
    P.box = el('section', 'nt'); P.box.hidden = true; P.box.setAttribute('role', 'dialog'); P.box.setAttribute('aria-modal', 'true');
    var head = el('div', 'nt-head');
    P.toList = el('button', 'nt-lite nt-tolist', '‹ My notes'); P.toList.type = 'button';
    P.title = el('h2', 'nt-h'); P.title.id = 'ntTitle'; P.box.setAttribute('aria-labelledby', 'ntTitle');
    P.x = el('button', 'nt-x', '×'); P.x.type = 'button'; P.x.setAttribute('aria-label', 'Close');
    head.appendChild(P.toList); head.appendChild(P.title); head.appendChild(P.x);
    P.listV = el('div', 'nt-listv'); P.editV = el('div', 'nt-editv');
    P.box.appendChild(head); P.box.appendChild(P.listV); P.box.appendChild(P.editV);
    document.body.appendChild(P.back); document.body.appendChild(P.box);
    P.back.addEventListener('click', closePanel); P.x.addEventListener('click', closePanel);
    P.toList.addEventListener('click', function () { flush(); openPanel('list'); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || P.box.hidden) return;
      if (confirming) { confirming = false; paintDelete(); return; }
      closePanel();
    });
    buildEdit(); buildList();
  }

  function openPanel(v) {
    build(); view = v;
    P.back.hidden = false; P.box.hidden = false; document.documentElement.classList.add('nt-open');
    P.listV.hidden = v !== 'list'; P.editV.hidden = v !== 'edit'; P.toList.hidden = v !== 'edit';
    if (v === 'list') { P.title.textContent = 'My notes'; paintList(); }
  }
  function closePanel() {
    if (!P || P.box.hidden) return;
    flush();
    P.box.hidden = true; P.back.hidden = true; document.documentElement.classList.remove('nt-open');
    if (ed) paintIdx(ed.idx);
    paintAll(); updateListBtn(); ed = null;
  }

  /* ----- the editor ----- */
  function buildEdit() {
    var e = P.editV;
    P.ctx = el('div', 'nt-ctx');
    P.main = el('p', 'nt-main'); P.reads = el('ul', 'nt-reads'); P.ctx.appendChild(P.main); P.ctx.appendChild(P.reads);
    P.tabs = el('div', 'nt-tabs'); P.tabs.setAttribute('role', 'tablist'); P.tabs.setAttribute('aria-label', 'Choose what the note is about');
    var body = el('div', 'nt-body');
    P.lab = el('label', 'nt-lab'); P.lab.htmlFor = 'ntText';
    P.ttl = el('input', 'nt-ttl'); P.ttl.type = 'text'; P.ttl.maxLength = 200; P.ttl.placeholder = 'Title (optional)'; P.ttl.id = 'ntTtl'; P.ttl.setAttribute('aria-label', 'Title of this note'); P.ttl.autocomplete = 'off';
    P.txt = el('textarea', 'nt-text'); P.txt.id = 'ntText'; P.txt.rows = 6; P.txt.placeholder = 'Write here. It saves as you type.';
    P.dates = el('p', 'nt-dates');
    body.appendChild(P.lab); body.appendChild(P.ttl); body.appendChild(P.txt); body.appendChild(P.dates);
    var foot = el('div', 'nt-foot');
    P.status = el('span', 'nt-status', 'Saved on this device');
    P.delBox = el('span', 'nt-delbox');
    P.done = el('button', 'nt-main-btn', 'Done'); P.done.type = 'button';
    foot.appendChild(P.status); foot.appendChild(P.delBox); foot.appendChild(P.done);
    e.appendChild(P.ctx); e.appendChild(P.tabs); e.appendChild(body); e.appendChild(foot);
    P.done.addEventListener('click', closePanel);
    function changed() {
      if (!ed || !api.ready) return;
      var rec = save(ed.info, ed.slots[ed.cur], P.ttl.value, P.txt.value);
      P.status.textContent = 'Saving…';
      paintDates(rec); paintTabDot(); paintDelete(); paintIdx(ed.idx);
    }
    P.ttl.addEventListener('input', changed); P.txt.addEventListener('input', changed);
    onSaved = function (ok) { if (P && P.status) P.status.textContent = ok ? 'Saved on this device' : 'Could not save on this device'; };
    P.tabs.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      var n = ed.slots.length, k = (ed.cur + (ev.key === 'ArrowRight' ? 1 : n - 1)) % n;
      select(k); P.tabs.children[k].focus();
    });
  }
  function labelFor(k) {
    if (k === 0) return 'Your note on the whole footnote';
    return 'Your note on the ' + res().tagText(ed.idx, k - 1) + ' reading';
  }
  function paintDates(rec) {
    P.dates.textContent = rec ? 'Created ' + fmtDate(rec.created) + ' · Last edited ' + fmtDate(rec.modified) : 'Not saved yet. The date is recorded when you start writing.';
  }
  function paintTabDot() {
    Array.prototype.forEach.call(P.tabs.children, function (b, k) { b.classList.toggle('has', !!recFor(ed.info.key, ed.slots[k])); });
  }
  function paintDelete() {
    P.delBox.textContent = '';
    if (!recFor(ed.info.key, ed.slots[ed.cur])) return;
    if (!confirming) {
      var d = el('button', 'nt-lite', 'Delete this note'); d.type = 'button';
      d.addEventListener('click', function () { confirming = true; paintDelete(); });
      P.delBox.appendChild(d);
    } else {
      P.delBox.appendChild(document.createTextNode('Delete it? '));
      var y = el('button', 'nt-lite nt-danger', 'Yes, delete'); y.type = 'button';
      var n = el('button', 'nt-lite', 'Keep'); n.type = 'button';
      y.addEventListener('click', function () {
        confirming = false; removeRec(ed.info.key + '|' + ed.slots[ed.cur]);
        P.ttl.value = ''; P.txt.value = ''; paintDates(null); paintTabDot(); paintDelete(); paintIdx(ed.idx);
      });
      n.addEventListener('click', function () { confirming = false; paintDelete(); });
      P.delBox.appendChild(y); P.delBox.appendChild(n);
    }
  }
  function paintReads() {
    P.reads.textContent = '';
    ed.info.readings.forEach(function (r, k) {
      var li = el('li', ed.cur === k + 1 ? 'on' : '');
      li.appendChild(res().tags(ed.idx, k));
      var g = el('span', 'gk', r.txt ? 'reads the main text' : r.text); g.lang = 'grc'; li.appendChild(g);
      if (r.kinds.length && !r.txt) li.appendChild(el('span', 'kd', '(' + r.kinds.join('; ') + ')'));
      P.reads.appendChild(li);
    });
  }
  function paintTabs() {
    P.tabs.textContent = '';
    for (var k = 0; k <= ed.info.readings.length; k++) {
      var b = el('button', 'nt-tab'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', k === ed.cur ? 'true' : 'false'); b.tabIndex = k === ed.cur ? 0 : -1;
      if (k === 0) b.textContent = 'Note'; else b.appendChild(res().tags(ed.idx, k - 1));
      b.appendChild(el('span', 'dot'));
      b.addEventListener('click', select.bind(null, k));
      P.tabs.appendChild(b);
    }
    paintTabDot();
  }
  function select(k) {
    flush(); confirming = false; ed.cur = k;
    paintTabs(); paintReads();
    var rec = recFor(ed.info.key, ed.slots[k]);
    P.lab.textContent = labelFor(k); P.ttl.value = rec ? rec.title : ''; P.txt.value = rec ? rec.text : '';
    paintDates(rec); paintDelete();
    P.status.textContent = rec ? 'Saved on this device' : '';
    var busy = !api.ready; P.ttl.disabled = P.txt.disabled = busy;
    P.txt.placeholder = busy ? 'Loading your notes…' : 'Write here. It saves as you type.';
  }
  function openEditor(idx, slot) {
    build();
    var r = res(), info = r.info(idx);
    info.key = r.key(idx); info.label = info.book + ' ' + info.ref + ' ' + info.caller;
    ed = { idx: idx, info: info, slots: slotsOf(info), cur: Math.max(0, slotsOf(info).indexOf(slot)) };
    openPanel('edit');
    P.title.textContent = info.book + ' ' + info.ref + ' · page ' + info.page + ' · note ' + info.caller;
    P.main.textContent = ''; P.main.appendChild(el('span', 'lab', 'Main text: '));
    var g = el('span', 'gk', info.main); g.lang = 'grc'; P.main.appendChild(g);
    select(ed.cur);
    if (!api.ready) api.whenReady(function (ok) { if (ed && ed.idx === idx && ok) select(ed.cur); });
    if (!(window.matchMedia && matchMedia('(pointer: coarse)').matches)) P.txt.focus();
  }
  api.open = function (idx) { openEditor(idx, 'g'); };

  /* ----- the list of notes, and backup, restore and export ----- */
  function buildList() {
    var l = P.listV;
    var ctl = el('div', 'nt-ctl');
    P.find = el('input', 'nt-find'); P.find.type = 'search'; P.find.placeholder = 'Search your notes'; P.find.setAttribute('aria-label', 'Search your notes'); P.find.autocomplete = 'off';
    P.sort = el('select', 'nt-sort'); P.sort.setAttribute('aria-label', 'Sort your notes');
    [['edited', 'Last edited'], ['created', 'Created'], ['ref', 'Passage'], ['title', 'Title']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; P.sort.appendChild(op); });
    ctl.appendChild(P.find); ctl.appendChild(P.sort);
    P.rows = el('div', 'nt-rows');
    P.tools = el('details', 'nt-tools');
    var sm = el('summary', null, 'Back up, restore and export'); P.tools.appendChild(sm);
    var tb = el('div', 'nt-toolbody');
    P.last = el('p', 'nt-last');
    var b1 = el('button', 'nt-lite', 'Download a backup'); b1.type = 'button'; b1.title = 'One file holding all your notes, to restore on this or another device';
    var b2 = el('button', 'nt-lite', 'Restore from a backup…'); b2.type = 'button';
    P.file = el('input'); P.file.type = 'file'; P.file.accept = '.json,application/json'; P.file.hidden = true;
    var r1 = el('div', 'nt-trow'); r1.appendChild(b1); r1.appendChild(b2); r1.appendChild(P.file);
    var h = el('p', 'nt-hint', 'A backup restores your notes. Restoring keeps the newer version of any note that is in both.');
    P.rep = el('div', 'nt-rep'); P.rep.setAttribute('aria-live', 'polite');
    var sep = el('hr', 'nt-sep');
    var h2 = el('p', 'nt-hint', 'A readable copy shows each note with the main text and readings it is about. It cannot be restored.');
    P.fmt = el('select'); [['md', 'Text with Markdown'], ['csv', 'Spreadsheet (CSV)']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; P.fmt.appendChild(op); });
    P.scope = el('select'); [['all', 'All my notes'], ['hits', 'Only notes in the current results']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; P.scope.appendChild(op); });
    var vl = el('label', 'nt-chk'); P.verse = el('input'); P.verse.type = 'checkbox'; vl.appendChild(P.verse); vl.appendChild(document.createTextNode(' Include the verse in Greek and English'));
    var b3 = el('button', 'nt-lite', 'Download a readable copy'); b3.type = 'button';
    var r2 = el('div', 'nt-trow'); r2.appendChild(P.fmt); r2.appendChild(P.scope);
    var r3 = el('div', 'nt-trow'); r3.appendChild(vl); r3.appendChild(b3);
    tb.appendChild(P.last); tb.appendChild(r1); tb.appendChild(h); tb.appendChild(P.rep); tb.appendChild(sep); tb.appendChild(h2); tb.appendChild(r2); tb.appendChild(r3);
    P.tools.appendChild(tb);
    l.appendChild(ctl); l.appendChild(P.rows); l.appendChild(P.tools);
    P.find.addEventListener('input', function () { listFind = P.find.value; paintList(); });
    P.sort.addEventListener('change', function () { listSort = P.sort.value; paintList(); });
    b1.addEventListener('click', downloadBackup);
    b2.addEventListener('click', function () { P.file.click(); });
    P.file.addEventListener('change', function () { var f = P.file.files && P.file.files[0]; if (f) readBackup(f); P.file.value = ''; });
    b3.addEventListener('click', function () { downloadReadable(b3); });
  }
  function describe(rec) {
    var r = res(), idx = idxOfKey(rec.key), out = { rec: rec, idx: idx, ref: rec.ref || rec.key, about: '', orphan: false, order: 1e9 };
    if (idx === undefined) { out.orphan = true; out.about = 'This footnote is no longer in the edition'; return out; }
    var info = r.info(idx); info.key = rec.key; var sl = slotsOf(info), k = sl.indexOf(rec.slot);
    out.info = info; out.order = idx * 100 + (k < 0 ? 99 : k);
    out.ref = info.book + ' ' + info.ref + ' ' + info.caller;
    if (k < 0) { out.orphan = true; out.about = 'The reading this note was on has changed'; }
    else if (k === 0) out.about = 'whole footnote';
    else out.about = r.tagText(idx, k - 1) + ' reading';
    return out;
  }
  function paintList() {
    if (!P) return;
    var rows = [], q = foldText(listFind).trim().split(/\s+/).filter(Boolean);
    M.forEach(function (rec) { rows.push(describe(rec)); });
    rows = rows.filter(function (d) {
      if (!q.length) return true;
      var hay = foldText(d.ref + ' ' + d.about + ' ' + d.rec.title + ' ' + d.rec.text);
      return q.every(function (w) { return hay.indexOf(w) >= 0; });
    });
    rows.sort(function (a, b) {
      switch (listSort) {
        case 'created': return a.rec.created < b.rec.created ? 1 : -1;
        case 'ref': return a.order - b.order;
        case 'title': return (a.rec.title || '￿').localeCompare(b.rec.title || '￿') || a.order - b.order;
        default: return a.rec.modified < b.rec.modified ? 1 : -1;
      }
    });
    P.rows.textContent = '';
    if (!api.ready) { P.rows.appendChild(el('p', 'nt-empty', 'Loading your notes…')); return; }
    if (!rows.length) { P.rows.appendChild(el('p', 'nt-empty', M.size ? 'No note matches your search.' : 'You have no notes yet. Choose Note on any footnote to write one.')); }
    rows.forEach(function (d) {
      var b = el('button', 'nt-row' + (d.orphan ? ' nt-orphan' : '')); b.type = 'button';
      var r1 = el('span', 'nt-r1'); r1.appendChild(el('b', null, d.ref)); r1.appendChild(document.createTextNode(' · ' + d.about));
      var snip = d.rec.text.replace(/\s+/g, ' ').trim(); if (snip.length > 140) snip = snip.slice(0, 140) + '…';
      var r2 = el('span', 'nt-r2'); if (d.rec.title) r2.appendChild(el('b', null, d.rec.title + (snip ? ' — ' : ''))); r2.appendChild(document.createTextNode(snip));
      var r3 = el('span', 'nt-r3', 'Last edited ' + fmtDate(d.rec.modified));
      b.appendChild(r1); b.appendChild(r2); b.appendChild(r3);
      if (d.orphan) {
        b.appendChild(el('span', 'nt-r4', d.about + '. It is kept in your backups.'));
        var del = el('span', 'nt-rdel', 'Delete'); del.setAttribute('role', 'button'); del.tabIndex = 0;
        var go = function (ev) { ev.stopPropagation(); ev.preventDefault(); removeRec(d.rec.id); paintList(); updateListBtn(); };
        del.addEventListener('click', go); del.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') go(ev); });
        b.appendChild(del);
        b.addEventListener('click', function () {});
      } else {
        b.addEventListener('click', function () { openEditor(d.idx, d.rec.slot); });
      }
      P.rows.appendChild(b);
    });
    var lb = null; try { lb = localStorage.getItem(BACKUPKEY); } catch (e) {}
    P.last.textContent = lb ? 'Last backup: ' + fmtDate(lb) : 'You have not made a backup yet.';
  }

  function saveFile(text, name, type, bom) {
    var blob = new Blob([(bom ? '﻿' : '') + text], { type: type });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function stamp() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function say(msg, undo) {
    P.rep.textContent = '';
    (Array.isArray(msg) ? msg : [msg]).forEach(function (m) { P.rep.appendChild(el('p', null, m)); });
    if (undo) { var u = el('button', 'nt-lite', 'Undo this restore'); u.type = 'button'; u.addEventListener('click', undo); P.rep.appendChild(u); }
  }

  function downloadBackup() {
    flush();
    var notes = [];
    M.forEach(function (r) { notes.push({ key: r.key, slot: r.slot, ref: r.ref || '', title: r.title, text: r.text, created: r.created, modified: r.modified }); });
    var data = { format: 'gnt-notes', version: 1, exported: new Date().toISOString(), notes: notes };
    saveFile(JSON.stringify(data, null, 1), 'greek-nt-my-notes-backup-' + stamp() + '.json', 'application/json');
    try { localStorage.setItem(BACKUPKEY, data.exported); } catch (e) {}
    say('Backup saved: ' + notes.length + ' note' + (notes.length === 1 ? '' : 's') + '.'); paintList();
  }

  function validIso(s) { return typeof s === 'string' && !isNaN(Date.parse(s)); }
  function readBackup(file) {
    var rd = new FileReader();
    rd.onerror = function () { say('That file could not be read.'); };
    rd.onload = function () {
      var data; try { data = JSON.parse(rd.result); } catch (e) { say('That is not a backup file from this site.'); return; }
      if (!data || data.format !== 'gnt-notes' || !Array.isArray(data.notes)) { say('That is not a backup file from this site.'); return; }
      var added = 0, updated = [], kept = 0, skipped = 0, undo = [];
      data.notes.forEach(function (n) {
        if (!n || typeof n.key !== 'string' || typeof n.slot !== 'string' || typeof n.text !== 'string' || typeof n.title !== 'string' || !validIso(n.modified) || !validIso(n.created) || n.key.length > 200 || n.slot.length > 40) { skipped++; return; }
        var id = n.key + '|' + n.slot, cur = M.get(id);
        var rec = { id: id, key: n.key, slot: n.slot, ref: typeof n.ref === 'string' ? n.ref.slice(0, 120) : '', title: n.title.slice(0, 200), text: n.text.slice(0, 50000), created: n.created, modified: n.modified };
        if (!cur) { undo.push({ id: id, before: null }); touchStore(rec); added++; return; }
        if (cur.text === rec.text && cur.title === rec.title) { kept++; return; }
        if (rec.modified > cur.modified) {
          undo.push({ id: id, before: Object.assign({}, cur) });
          rec.created = cur.created < rec.created ? cur.created : rec.created;
          rec.ref = cur.ref || rec.ref; touchStore(rec); updated.push(rec.ref || rec.key);
        } else kept++;
      });
      flush(); paintAll(); paintList(); updateListBtn();
      var lines = ['Restored: ' + added + ' added, ' + updated.length + ' replaced with a newer version, ' + kept + ' left as they were' + (skipped ? ', ' + skipped + ' skipped as unreadable' : '') + '.'];
      if (updated.length) lines.push('Replaced: ' + updated.slice(0, 12).join('; ') + (updated.length > 12 ? '; and ' + (updated.length - 12) + ' more' : '') + '.');
      say(lines, undo.length ? function () {
        undo.forEach(function (u) { if (u.before) touchStore(u.before); else removeRec(u.id); });
        flush(); paintAll(); paintList(); updateListBtn(); say('The restore was undone.');
      } : null);
    };
    rd.readAsText(file);
  }

  /* a readable copy: each note with the main text and readings it is about */
  function loadVerses(cb) {
    var todo = 1; function done() { if (--todo === 0) cb(); }
    if (window.GNT_EN && !GNT_EN.ready) { todo++; GNT_EN.load(done); }
    if (window.GNT_GR && !GNT_GR.ready) { todo++; GNT_GR.load(done); }
    done();
  }
  function selected() {
    var rows = [], hit = null;
    if (P.scope.value === 'hits') { hit = new Set(res().hits()); }
    M.forEach(function (rec) { var d = describe(rec); if (hit && !(d.idx !== undefined && hit.has(d.idx))) return; rows.push(d); });
    rows.sort(function (a, b) { return a.order - b.order || (a.rec.created < b.rec.created ? -1 : 1); });
    return rows;
  }
  function groups(rows) {
    var out = [], byKey = {};
    rows.forEach(function (d) { var k = d.rec.key; if (!byKey[k]) { byKey[k] = { d: d, items: [] }; out.push(byKey[k]); } byKey[k].items.push(d); });
    return out;
  }
  function readingLine(info, idx, k) {
    var r = info.readings[k], r0 = res();
    return r0.tagText(idx, k) + ': ' + (r.txt ? 'reads the main text' : r.text) + (r.kinds.length && !r.txt ? ' (' + r.kinds.join('; ') + ')' : '');
  }
  function verseText(info, withVerse) {
    if (!withVerse || !window.GNT_EN || !GNT_EN.ready) return '';
    var t = ''; try { t = GNT_EN.copyText(info.bi, info.ref, { english: true, greek: true }) || ''; } catch (e) {}
    return t;
  }
  function markdown(rows, withVerse) {
    var out = ['# My notes on the Greek New Testament', '', 'Written ' + fmtDate(new Date().toISOString()) + '. ' + rows.length + ' note' + (rows.length === 1 ? '' : 's') + '.', ''];
    groups(rows).forEach(function (g) {
      var d0 = g.d, info = d0.info;
      out.push('## ' + (info ? info.book + ' ' + info.ref + ', page ' + info.page + ', note ' + info.caller : d0.ref), '');
      if (info) {
        out.push('Main text: ' + info.main, '');
        info.readings.forEach(function (r, k) { out.push('- ' + readingLine(info, d0.idx, k)); });
        out.push('');
        var v = verseText(info, withVerse); if (v) out.push(v.split('\n').map(function (s) { return '> ' + s; }).join('\n'), '');
      } else out.push(d0.about + '.', '');
      g.items.forEach(function (d) {
        out.push('### ' + (d.rec.slot === 'g' ? 'The whole footnote' : 'The ' + d.about) + (d.rec.title ? ': ' + d.rec.title : ''), '');
        if (d.orphan) out.push('(' + d.about + '.)', '');
        out.push(d.rec.text.replace(/\r\n?/g, '\n'), '', '*Created ' + fmtDate(d.rec.created) + '. Last edited ' + fmtDate(d.rec.modified) + '.*', '');
      });
    });
    return out.join('\n');
  }
  function csvCell(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }
  function csv(rows, withVerse) {
    var head = ['Passage', 'Page', 'Note letter', 'About', 'Title', 'Note', 'Created', 'Last edited', 'Main text', 'Reading', 'Editions', 'Kind of difference'];
    if (withVerse) head.push('Verse');
    var out = [head];
    rows.forEach(function (d) {
      var info = d.info, k = info ? slotsOf(Object.assign({}, info, { key: d.rec.key })).indexOf(d.rec.slot) : -1, r = k > 0 ? info.readings[k - 1] : null;
      var row = [info ? info.book + ' ' + info.ref : d.ref, info ? info.page : '', info ? info.caller : '', d.rec.slot === 'g' ? 'whole footnote' : d.about, d.rec.title, d.rec.text, d.rec.created, d.rec.modified,
        info ? info.main : '', r ? (r.txt ? 'reads the main text' : r.text) : '', r ? res().tagText(d.idx, k - 1) : '', r ? r.kinds.join('; ') : ''];
      if (withVerse) row.push(info ? verseText(info, true) : '');
      out.push(row);
    });
    return out.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }
  function downloadReadable(btn) {
    flush();
    var rows = selected();
    if (!rows.length) { say('There are no notes to export' + (P.scope.value === 'hits' ? ' in the current results.' : '.')); return; }
    var was = btn.textContent; btn.disabled = true; btn.textContent = 'Preparing…';
    var v = P.verse.checked;
    (v ? loadVerses : function (cb) { cb(); })(function () {
      btn.disabled = false; btn.textContent = was;
      if (P.fmt.value === 'csv') saveFile(csv(rows, v), 'greek-nt-my-notes-' + stamp() + '.csv', 'text/csv;charset=utf-8', true);
      else saveFile(markdown(rows, v), 'greek-nt-my-notes-' + stamp() + '.md', 'text/markdown;charset=utf-8');
      say('Saved a readable copy of ' + rows.length + ' note' + (rows.length === 1 ? '' : 's') + '.');
    });
  }

  showUi();
})();
