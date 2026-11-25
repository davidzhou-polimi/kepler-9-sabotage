// How things arrive on the console. A window opens from a line of light, empty (CSS: class win-arrive on the window,
// or fxin-type on an ancestor in the mocks); then what is inside is typed in, letter after letter, in reading order.
// What is not text arrives in its own way: a bar loads from left to right, the station map comes up as a hologram,
// a picture appears when the typing reaches it. NOVA's own lines are typed the same way, at the speed of someone
// writing, with the cursor at the letter she is on.
// Decided 2026-11-25: «il testo vorrei che sembri digitato, elementi come la barra di ossigeno non ha senso che abbia
// effetto digitato, ma che appaia da sinistra a destra come barra che si carica» · «per la comparsa della mappa, beh
// come un ologramma».
//
// Nothing moves while it is typed: every letter already holds its place, hidden, so a window has its final size
// from the start and no line jumps.

// What is not text is not typed: it is there, whole, when the typing reaches it. Besides pictures, bars and the map,
// the buttons (2026-11-25: «i pulsanti, e altri elementi che non sono testo, non devono avere effetto di battitura»);
// a line of text that can be tapped (a report NOVA attaches, a member's block) is still text.
const ATOM = 'img, svg, input, select, .meter, .pips, .holo, .tl-cur, .btn, .chip, .rep-toggle, .rep-cover';
const BAR = '.meter, .pips';
// A button comes in its own way too (proposals, only where an ancestor carries one of the classes btnin-a, -b, -c:
// the frames of the board "btnin" and ?btnin= in the game; 2026-11-26: «ma i pulsanti appaiono all'improvviso? non hai
// pensato alle animazioni di entrata?»). The style sheet draws how; here it only gets its turn and its time: the
// next thing waits for a button, and the keys of one row follow each other closely.
const KEY = '.btn, .chip, .rep-toggle';
const keyMs = (el) => (!el.closest('[class*="btnin-"]') ? 0 : el.matches('.chip') ? 45 : 200);
const running = new WeakMap(); // first root → the function that stops the typing and leaves everything complete

export const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// The steps, in reading order: a container opens (its frame and ground show), a text is typed, an atom arrives.
function stepsOf(root, out = []) {
  out.push({ open: root });
  for (const n of [...root.childNodes]) {
    if (n.nodeType === 3) { if (n.nodeValue.trim()) out.push({ text: n }); continue; }
    if (n.nodeType !== 1) continue;
    if (n.matches(ATOM) || !n.firstChild) out.push({ atom: n });
    else stepsOf(n, out);
  }
  return out;
}

// Types what is inside the given elements, one after the other.
//   cps: letters per second; max: the whole never takes longer than this (ms), however much there is (0: no limit)
//   after: promises to wait for before the first letter (a window that is still opening)
//   offset: ms already gone (the page was drawn again while a line was being written: it goes on from that letter)
//   cursor: the cursor stands after the last letter typed
//   onDone: called once, when everything is in place (also when there is nothing to animate)
// Returns { ms, stop }: the time the whole takes, and the function that ends it at once.
const HOLO_MS = 1700; // the hologram goes on building while the text after it is typed
export function typeNodes(roots, { cps = 150, max = 1100, after = [], offset = 0, cursor = false, onDone = null } = {}) {
  roots = roots.filter(Boolean);
  if (!roots.length) { onDone?.(); return { ms: 0, stop() {} }; }
  running.get(roots[0])?.();
  const steps = roots.flatMap((r) => stepsOf(r));
  for (const s of steps) {
    if (s.text) s.ms = (s.text.nodeValue.length / cps) * 1000;
    if (s.atom) s.ms = s.atom.matches(BAR) ? 90 + s.atom.querySelectorAll(':scope > .on').length * 22 : s.atom.matches('.holo') ? 260 : s.atom.matches('img, svg') ? 70 : s.atom.matches(KEY) ? keyMs(s.atom) : 0;
  }
  const total = steps.reduce((a, s) => a + (s.ms || 0), 0);
  const k = max && total > max ? max / total : 1;
  let end = 0;
  for (const s of steps) { s.at = end; s.ms = (s.ms || 0) * k; end += s.ms; }
  for (const s of steps) if (s.atom && s.atom.matches('.holo')) end = Math.max(end, s.at + HOLO_MS);
  if (still() || offset >= end) {
    // nothing to animate: with reduced motion the next thing still waits the time the typing would have taken
    if (onDone) { if (still() && offset < end) setTimeout(onDone, end - offset); else onDone(); }
    return { ms: end, stop() {} };
  }

  roots.forEach((r) => r.classList.add('fx-root'));
  // each text becomes two halves: what has been typed and what has not; together they are the same line
  for (const s of steps) {
    if (s.text) {
      s.full = s.text.nodeValue;
      s.wrap = document.createElement('span');
      s.done = document.createElement('span'); s.done.className = 'fx-on';
      s.rest = document.createElement('span'); s.rest.textContent = s.full;
      s.wrap.append(s.done, s.rest);
      s.text.replaceWith(s.wrap);
    }
    if (s.atom && s.atom.matches(BAR)) {
      s.cells = [...s.atom.children].filter((c) => c.classList.contains('on'));
      s.cells.forEach((c) => c.classList.remove('on'));
    }
  }
  const begin = (s, into) => {
    if (s.begun) return; s.begun = true;
    if (s.open) s.open.classList.add('fx-on');
    if (s.atom) {
      s.atom.classList.add('fx-on-all');
      // a hologram taken up again part of the way (the page was drawn again) goes on from where it was
      if (s.atom.matches('.holo')) { s.atom.style.setProperty('--holo-off', `${-Math.round(into)}ms`); s.atom.classList.add('holo-in'); }
      // (the class stays: its animation ends by itself, also when the typing around it is over first)
      if (s.atom.matches(KEY) && keyMs(s.atom)) { s.atom.style.animationDelay = `${-Math.round(into)}ms`; s.atom.classList.add('btn-in'); }
    }
  };
  let at = null; // the text the cursor stands on
  const progress = (s, f) => {
    if (s.text) {
      const n = Math.round(s.full.length * f);
      if (n !== s.n) { s.n = n; s.done.textContent = s.full.slice(0, n); s.rest.textContent = s.full.slice(n); }
      if (cursor && at !== s) { at?.done.classList.remove('fx-cur'); s.done.classList.add('fx-cur'); at = s; }
    }
    if (s.cells) s.cells.forEach((c, i) => c.classList.toggle('on', i < Math.round(s.cells.length * f)));
  };
  let raf = 0; let over = false;
  const finish = (silent = false) => {
    if (over) return; over = true;
    cancelAnimationFrame(raf);
    for (const s of steps) {
      if (s.text) s.wrap.replaceWith(s.text);
      if (s.cells) s.cells.forEach((c) => c.classList.add('on'));
      if (s.open) s.open.classList.remove('fx-on');
      if (s.atom) s.atom.classList.remove('fx-on-all');
    }
    roots.forEach((r) => r.classList.remove('fx-root'));
    running.delete(roots[0]);
    if (!silent) onDone?.();
  };
  running.set(roots[0], () => finish(true));
  Promise.all(after).then(() => {
    if (over) return;
    let start = null;
    const frame = (now) => {
      if (over) return;
      start ??= now - offset;
      const t = now - start;
      for (const s of steps) {
        if (t < s.at) break;
        begin(s, t - s.at);
        progress(s, s.ms ? Math.min(1, (t - s.at) / s.ms) : 1);
      }
      if (t >= end) finish(); else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
  return { ms: end, stop: finish };
}

// A window: its title, then what is inside. The typing starts when the window has finished opening (its own
// animation, whatever clock the browser gives it).
//   titleOnly: only the title is typed; what is inside is written by whoever fills the window (the case notes)
export function typeWindow(win, { titleOnly = false, ...opts } = {}) {
  const roots = [win.querySelector(':scope > .win-bar .win-title'), titleOnly ? null : win.querySelector(':scope > .win-body')];
  const opening = win.getAnimations().filter((a) => a.animationName === 'win-in-a').map((a) => a.finished.catch(() => {}));
  return typeNodes(roots, { ...opts, after: opening });
}

// Every window inside a frame arrives (mocks). The style sheet opens each one from a line after its own delay (in
// the mocks they come in a row; in the game a window comes when NOVA names it), and each is typed once it is open.
// skip: a selector for the windows that are already there (in the mocks NOVA's channel, whose lines are typed one
// at a time while she speaks, not all at once)
export function playWindows(frame, { skip = '' } = {}) {
  frame.querySelectorAll('.holo-in').forEach((h) => h.classList.remove('holo-in'));
  frame.querySelectorAll('.win').forEach((win) => { if (!skip || !win.matches(skip)) typeWindow(win); });
}
