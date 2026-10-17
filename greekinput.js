/* Greek input: any text box marked data-beta accepts Unicode Greek or CCAT beta code.
   Beta code is converted to Unicode Greek as it is typed or pasted:
     letters      a b g d e z h q i k l m n c o p r s t u f x y w   (capitals or lower case)
     accents      ) smooth   ( rough   / acute   \\ grave   = circumflex   + diaeresis   | iota subscript
     capitals     * before the letter, with any breathing or accent between, as in *)ihsou=s
     final sigma  typed as s; it becomes a final sigma at the end of a word (s2 and s1 also work)
   Accents are written as combining characters and then composed (NFC), so lo/gos becomes λόγος. */
(function () {
  var LETTER = { a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η', q: 'θ', i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'ν',
    c: 'ξ', o: 'ο', p: 'π', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', f: 'φ', x: 'χ', y: 'ψ', w: 'ω', v: 'ϝ' };
  var MARK = { ')': '̓', '(': '̔', '/': '́', '\\': '̀', '=': '͂', '+': '̈', '|': 'ͅ' };
  var MARKS = '\\)\\(\\/\\\\=\\+\\|';
  var GREEK = '\\u0370-\\u03FF\\u1F00-\\u1FFF';
  var RE_CAP = new RegExp('\\*([' + MARKS + ']*)([A-Za-z])', 'g');
  var RE_LOW = /[A-Za-z]/g;
  var RE_RUN = new RegExp('([' + GREEK + '])([' + MARKS + ']+)', 'g');
  var RE_FINAL = new RegExp('σ(?=[^' + GREEK + '\\u0300-\\u036F])', 'g');
  var RE_FINAL_END = new RegExp('σ$');

  function marksOf(run) { var o = ''; for (var i = 0; i < run.length; i++) o += MARK[run.charAt(i)] || ''; return o; }
  function letter(ch, upper) { var g = LETTER[ch.toLowerCase()]; if (!g) return ch; return upper ? g.toUpperCase() : g; }

  /* final: true when the text ends the word (for example when the box loses focus) */
  function toGreek(s, final) {
    if (!/[A-Za-z*σ)(\/\\=+|]/.test(s)) return s;
    s = s.replace(/[sS]2/g, 'ς').replace(/[sS]1/g, 'σ');
    s = s.replace(RE_CAP, function (m, marks, ch) { return letter(ch, true) + marksOf(marks); });
    s = s.replace(RE_LOW, function (ch) { return letter(ch, false); });
    s = s.replace(RE_RUN, function (m, ch, run) { return ch + marksOf(run); });
    s = s.normalize('NFC');
    s = s.replace(RE_FINAL, 'ς');
    if (final) s = s.replace(RE_FINAL_END, 'ς');
    return s;
  }

  function attach(box) {
    box.addEventListener('input', function (e) {
      if (e.isComposing) return;
      var v = box.value, pos = box.selectionStart;
      var before = toGreek(v.slice(0, pos), false);
      var after = toGreek(v.slice(pos), false);
      var out = before + after;
      if (out !== v) {
        box.value = out;
        try { box.setSelectionRange(before.length, before.length); } catch (x) { /* some input types have no selection */ }
      }
    });
    box.addEventListener('blur', function () {
      var out = toGreek(box.value, true);
      if (out !== box.value) { box.value = out; box.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  }

  var boxes = document.querySelectorAll('input[data-beta]');
  for (var i = 0; i < boxes.length; i++) attach(boxes[i]);
  window.GNTGreek = { toGreek: toGreek };
})();
