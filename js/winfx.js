// How a window arrives on the console. It opens from a line of light, empty (CSS: class fxin-type on an ancestor);
// then what is inside is typed in, letter after letter, in reading order. What is not text arrives in its own way:
// a bar loads from left to right, the station map comes up as a hologram, a picture appears when the typing reaches it.
// Decided 2026-11-25: «il testo vorrei che sembri digitato, elementi come la barra di ossigeno non ha senso che abbia
// effetto digitato, ma che appaia da sinistra a destra come barra che si carica» · «per la comparsa della mappa, beh
// come un ologramma».
//
// Nothing moves while it is typed: every letter already holds its place, hidden, so the window has its final size
// from the start and no line jumps.

const ATOM = 'img, svg, input, select, .meter, .pips, .holo, .tl-cur';
const BAR = '.meter, .pips';
const running = new WeakMap(); // window → the function that stops its arrival and leaves it complete

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// cps: letters per second; max: a window never takes longer than this to fill (ms), however much it holds.
// The typing starts when the window has finished opening (its own animation, whatever clock the browser gives it)
export function typeWindow(win, { cps = 150, max = 1100 } = {}) {
  running.get(win)?.();
  if (still()) return;
  const roots = [win.querySelector(':scope > .win-bar .win-title'), win.querySelector(':scope > .win-body')].filter(Boolean);
  const steps = roots.flatMap((r) => stepsOf(r));
  win.classList.add('fx-typing');

  // each text becomes two halves: what has been typed and what has not; together they are the same line
  for (const s of steps) {
    if (!s.text) continue;
    s.full = s.text.nodeValue;
    s.wrap = document.createElement('span');
    s.done = document.createElement('span'); s.done.className = 'fx-on';
    s.rest = document.createElement('span'); s.rest.textContent = s.full;
    s.wrap.append(s.done, s.rest);
    s.text.replaceWith(s.wrap);
    s.ms = (s.full.length / cps) * 1000;
  }
  for (const s of steps) {
    if (!s.atom) continue;
    if (s.atom.matches(BAR)) {
      s.cells = [...s.atom.children].filter((c) => c.classList.contains('on'));
      s.cells.forEach((c) => c.classList.remove('on'));
      s.ms = 90 + s.cells.length * 22;
    } else s.ms = s.atom.matches('.holo') ? 260 : s.atom.matches('img, svg') ? 70 : 0;
  }
  const total = steps.reduce((a, s) => a + (s.ms || 0), 0);
  const k = total > max ? max / total : 1;
  let end = 0;
  for (const s of steps) { s.at = end; s.ms = (s.ms || 0) * k; end += s.ms; }

  const begin = (s) => {
    if (s.begun) return; s.begun = true;
    if (s.open) s.open.classList.add('fx-on');
    if (s.atom) { s.atom.classList.add('fx-on-all'); if (s.atom.matches('.holo')) s.atom.classList.add('holo-in'); }
  };
  const progress = (s, f) => {
    if (s.text) { const n = Math.round(s.full.length * f); if (n !== s.n) { s.n = n; s.done.textContent = s.full.slice(0, n); s.rest.textContent = s.full.slice(n); } }
    if (s.cells) s.cells.forEach((c, i) => c.classList.toggle('on', i < Math.round(s.cells.length * f)));
  };
  let raf = 0; let over = false;
  const finish = () => {
    if (over) return; over = true;
    cancelAnimationFrame(raf);
    for (const s of steps) {
      if (s.text) s.wrap.replaceWith(s.text);
      if (s.cells) s.cells.forEach((c) => c.classList.add('on'));
      if (s.open) s.open.classList.remove('fx-on');
      if (s.atom) s.atom.classList.remove('fx-on-all');
    }
    win.classList.remove('fx-typing');
    running.delete(win);
  };
  running.set(win, finish);
  const opening = win.getAnimations().filter((a) => a.animationName === 'win-in-a').map((a) => a.finished.catch(() => {}));
  Promise.all(opening).then(() => {
    if (over) return;
    let start = null;
    const frame = (now) => {
      if (over) return;
      start ??= now;
      const t = now - start;
      for (const s of steps) {
        if (t < s.at) break;
        begin(s);
        progress(s, s.ms ? Math.min(1, (t - s.at) / s.ms) : 1);
      }
      if (t >= end) finish(); else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
  return finish;
}

// Every window inside a frame arrives. The style sheet opens each one from a line after its own delay (in the mocks
// they come in a row; in the game a window comes when NOVA names it), and each is typed once it is open.
// skip: a selector for the windows that are already there (in the mocks NOVA's channel, whose lines are typed one
// at a time while she speaks, not all at once)
export function playWindows(frame, { skip = '' } = {}) {
  frame.querySelectorAll('.holo-in').forEach((h) => h.classList.remove('holo-in'));
  frame.querySelectorAll('.win').forEach((win) => { if (!skip || !win.matches(skip)) typeWindow(win); });
}
