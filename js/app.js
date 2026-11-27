// NOVA: game state, events, timer, persistence, developer tools.
import { generateCase, randomCode, normalizeCode, answer, PEOPLE, HATCH_NAME } from './generator.js';
import { BRIEFING_PARTS } from './texts.js';
import { screen, newState, liveSide, fmtClock, MAX_QUESTIONS, OXYGEN_MS, esc } from './ui.js';
import { initFontSwitch } from './fonts.js';
import { typeIn } from './typing.js';
import { typeNodes, typeWindow, still } from './winfx.js';

const STORE = 'k9-nova-state-v2'; // v1: the interface with tabs and a status bar; its saved games are not carried over
const params = new URLSearchParams(location.search);
const DEV = params.get('dev') === '1';
// ?demo=1: a game that leaves no trace. Nothing is read from the browser and nothing is saved in it, so that several
// can run side by side in the frames of a board (mocks.html plays the proposals for NOVA's pace this way)
const DEMO = params.has('demo');
const root = document.getElementById('app');
const wideQuery = matchMedia('(min-width: 1000px)');

let state = load() || newState();
let theCase = state.code ? generateCase(state.code) : null;

// ---------- persistence ----------

function load() {
  if (DEMO) return null;
  try {
    localStorage.removeItem('k9-nova-state-v1');
    const s = JSON.parse(localStorage.getItem(STORE));
    return s && s.v === 2 ? s : null;
  } catch { return null; }
}
function save() {
  if (DEMO) return;
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* private mode: play without saving */ }
}

// ---------- timer ----------

function elapsed() {
  const t = state.timer;
  return t.elapsed + (t.since ? (Date.now() - t.since) * t.speed : 0);
}
const remaining = () => Math.max(0, OXYGEN_MS - elapsed());
function pauseTimer() {
  if (!state.timer.since) return;
  state.timer.elapsed = elapsed();
  state.timer.since = null;
}
function resumeTimer() {
  if (state.timer.since) return;
  state.timer.since = Date.now();
}
function setSpeed(speed) {
  const running = Boolean(state.timer.since);
  pauseTimer();
  state.timer.speed = speed;
  if (running) resumeTimer();
}

// The oxygen runs from the line in which NOVA says it does («Oxygen: 10 minutes. The countdown has already started.»),
// not from ACCEPT (2026-11-25: «il timer di 10 min deve partire da quando nova scrive "the timer has already
// started"»; from 2026-11-23 it ran from her first message). A briefing cut short starts it at once.
const OXYGEN_STAGE = BRIEFING_PARTS.findIndex((p) => p.id === 'oxygen');
function startClock() {
  if (state.phase !== 'play' || state.clock || state.stage < OXYGEN_STAGE) return;
  state.clock = true;
  resumeTimer();
}

// ---------- render ----------

// The whole app is Mission Control's console (the boards and David's answers are in mocks.html and docs/design):
// one screen with the video effect and the physical bar under it (2026-11-24: the physical console, the CRT glass
// always and only on the screen, retro-futuristic with dark keys; the bar with LEDs pushed out like the keys, the
// grille and the nameplate). The console is empty until NOVA's request is accepted, then fills up while she writes
// (view.flow 'live', view.stage; 2026-11-25). Reports as windows after the crew cards, closed as a strip; NOVA's
// channel holds the whole conversation; the station model as a hologram with walls of light and a console readout.
function view() {
  return {
    state, c: theCase, wide: wideQuery.matches, remainingMs: remaining(), dev: DEV,
    shell: 'deck', deck: 'retro', fx: ['crt'], deckBar: 'leds', ledStyle: 'b',
    flow: 'live', flowHome: true, // (the endings keep their own screens; the bar keeps the same keys, dark)
    stage: state.phase === 'play' ? state.stage : -1,
    reportStyle: 'crewwin', askUi: 'thread', mapDetail: { holo: 4, info: 'fields', plan: PLAN },
    quitOpen: state.quitOpen,
    saved: state.resume ? { code: state.code, phase: state.resume, remainingMs: remaining() } : null,
    ack: PACE.ack ? { hold: Boolean(state.hold) } : null,
    homeTitle: HOME_TITLE,
  };
}
// Proposals played in the frames of the boards "hometitle" and "titleout2" (mocks.html), not in the game:
//   ?title=one|two  the title MISSION CONTROL on the empty console (2026-11-25: «come questo titolo serve all'inizio
//                   nella home, MISSION CONTROL, magari su due righe, responsive, quando si preme accept, il titolo
//                   fades away (coerentemente con uno schermo)»)
//   ?out=fade|glow|scan  how it leaves when the transmission is accepted (CSS: .home-title.is-leaving.to-…)
//   ?btnin=a|b|c    how a button comes (board "btnin"; CSS: .btnin-… .btn-in)
// The station plan of the group's map with the hull and the solar arrays (board "mapplan", chosen 2026-11-27);
// ?plan=a plays the plan alone, as it was shown on the board.
const PLAN = params.get('plan') === 'a' ? 'a' : 'b';
const HOME_TITLE = ['one', 'two'].includes(params.get('title')) ? params.get('title') : null;
const TITLE_OUT = params.get('out') || 'fade';
if (['a', 'b', 'c'].includes(params.get('btnin'))) document.body.classList.add(`btnin-${params.get('btnin')}`);
// The title is not on the next screen: a copy of it stays where it was for as long as it takes to leave
function leaveTitle(old, box) {
  const host = root.querySelector('.cs-screen');
  if (!old || !host || root.querySelector('.home-title') || still()) return;
  const hb = host.getBoundingClientRect();
  const g = old.cloneNode(true);
  g.classList.add('is-leaving', `to-${TITLE_OUT}`);
  Object.assign(g.style, { position: 'absolute', left: `${box.left - hb.left}px`, top: `${box.top - hb.top}px`, width: `${box.width}px`, margin: '0', pointerEvents: 'none' });
  host.insertBefore(g, host.querySelector('.cs-fx'));
  g.addEventListener('animationend', (e) => { if (e.target === g) g.remove(); });
}

// what scrolls inside the screen, besides NOVA's conversation
const SCROLLERS = ['.cs-scroll', '.live-right', '.live-left > .win:last-child > .win-body', '.modal-inner'];
const markScrolled = (el) => el.classList.toggle('is-scrolled', el.scrollTop > 2);

let lastCritical = null;
function render() {
  const keep = render.keepScroll;
  const quiet = render.quiet; // nothing arrives with its effect: a game taken up again, a briefing cut short
  render.keepScroll = false;
  render.quiet = false;
  const tops = SCROLLERS.map((s) => root.querySelector(s)?.scrollTop ?? 0);
  const chat0 = root.querySelector('.win-term .win-body');
  const was = chat0 ? { top: chat0.scrollTop, end: chat0.scrollHeight - chat0.clientHeight - chat0.scrollTop < 4, h: chat0.scrollHeight } : null;
  const before = places();
  const title0 = root.querySelector('.home-title');
  const titleBox = title0?.getBoundingClientRect();
  startClock();
  // the model sways on the page's clock, not from the moment it was drawn: drawing it again leaves it where it was
  root.style.setProperty('--holo-t', `${-Math.round((((performance.now() + swayShift) % 10000) + 10000) % 10000)}ms`);
  root.innerHTML = screen(view());
  layFlat(); // (before anything reads the layout, so the new model is flat from its first frame and does not tip over)
  document.body.classList.toggle('emergency', isRed());
  // last minute: alarm frame and hazard stripes; the windows keep their colours
  document.body.classList.toggle('alarm', state.phase === 'play' && remaining() <= 60000);
  lastCritical = remaining() <= 60000;
  if (keep) SCROLLERS.forEach((s, i) => { const el = root.querySelector(s); if (el) el.scrollTop = tops[i]; });
  const chat = root.querySelector('.win-term .win-body');
  // the conversation rests at its last line; it stays where the player left it only if nothing was added to it
  if (chat) chat.scrollTop = keep && was && !was.end && chat.scrollHeight === was.h ? was.top : chat.scrollHeight;
  root.querySelectorAll('.win-body').forEach(markScrolled);
  arrive(quiet);
  glide(before);
  leaveTitle(title0, titleBox);
  speak(quiet);
  typeIn(root);
  if (DEV) renderDev();
  save();
}

function isRed() {
  if (state.phase === 'play') return remaining() <= 60000;
  if (state.phase === 'ending') return state.ending !== 'right';
  return false;
}

// ---------- what arrives on the console ----------

// A window comes once: the first time it is on the screen it opens from a line and what is inside is typed in
// (decided 2026-11-25, board "winfx"). NOVA's own window comes with her request; the others when she names them, or
// on a phone when their key first shows them. The windows opened over the screen (a profile, the confirmation of
// the power button) are not part of it: they are asked for, and are there at once.
const OPEN_MS = 380;
const seen = new Set();       // what has already come in this game
const arrivals = new Map();   // key → { t0, ms }: what is still arriving, so that drawing the page again takes it up
const winKey = (w) => (w.matches('.win-term') ? 'nova' : w.matches('.win-held') ? 'held' : w.matches('.win-notes') ? 'notes' : w.matches('.win-map') ? 'map'
  : w.matches('.win-code') ? 'code' : w.matches('.win-questions') ? 'questions' : w.matches('.win-oxygen') ? 'oxygen'
    : w.matches('.win-report') ? `report-${w.querySelector('[data-p]')?.dataset.p}` : null);

function arrive(quiet) {
  const live = root.querySelector('.screen-live');
  if (!live) return;
  const now = performance.now();
  // start(into): begins the effect `into` ms after its start (before it, when negative), and returns how long the
  // whole takes; wait: ms before it begins
  // Returns how long a thing that has just come takes (0 for one that was already there).
  const come = (key, start, wait = 0) => {
    if (!seen.has(key)) {
      seen.add(key);
      if (quiet) return 0;
      const ms = start(-wait);
      arrivals.set(key, { t0: now + wait, ms });
      return ms;
    }
    const a = arrivals.get(key);
    if (a && now - a.t0 < a.ms) start(now - a.t0); else arrivals.delete(key);
    return 0;
  };
  const said = state.phase === 'play' && state.stage < 8 ? BRIEFING_PARTS[state.stage] : null; // the line she is writing
  const writing = said && (!speech || speech.key !== `${state.code}:b${state.stage}`) ? lineMs(state.stage) : 0; // (just begun)
  let nth = 0; // the reports that come in this drawing, counted
  live.querySelectorAll('.win').forEach((w) => {
    const key = w.closest('.modal') ? null : winKey(w);
    if (!key) return;
    const fresh = !seen.has(key);
    // The reports come one at a time (2026-11-25: «i report vorrei che compaiano uno alla volta»): while NOVA attaches
    // them, each when she starts writing its name; otherwise (a phone, the first time REPORTS shows them) in a row
    let wait = 0;
    if (fresh && key.startsWith('report-')) {
      wait = said?.id === 'reports' && writing ? PACE.lead + ((4 + said.text.length + nth * 20) / NOVA_CPS) * 1000 : nth * 240;
      nth += 1;
    }
    come(key, (into) => {
      w.classList.add('win-arrive');
      w.style.animationDelay = `${-Math.round(into)}ms`;
      // her request is written at the speed of her writing, not filled in like a file
      const speech = key === 'nova' ? { cps: NOVA_CPS, max: 0, cursor: true } : {};
      // the case notes are Mission Control's: the window opens with its title, each note is written on its own (below)
      return OPEN_MS + typeWindow(w, { ...speech, titleOnly: key === 'notes', offset: Math.max(0, into - OPEN_MS) }).ms;
    }, wait);
    if (key !== 'notes') return;
    // The case notes: each one is written when NOVA has finished the line it is taken from (2026-11-25: «briefing
    // deve scrivere dopo un po' rispetto a nova, altrimenti non sembra che stia prendendo appunti»); the notes of
    // lines already said (a phone, the first time BRIEFING shows them) come with the window
    let row0 = fresh ? OPEN_MS + 120 : 0; // the notes that come together are written one after the other
    w.querySelectorAll('[data-note]').forEach((row) => {
      const late = said?.id === row.dataset.note ? writing : 0;
      const ms = come(`note-${row.dataset.note}`, (into) => typeNodes([...row.children], { offset: into }).ms, late || row0);
      if (!late) row0 += ms;
    });
  });
}

// ---------- windows that move ----------

// A window that changes place slides there instead of jumping (2026-11-25: «La finestra di Nova dal centro scatta
// in cima, serve una transizione per le finestre se si spostano»): its place is read before the page is drawn again
// and after, and it is carried from one to the other. Its height changes at once.
const MOVE_MS = 360;
const liveWins = () => [...root.querySelectorAll('.screen-live .win')].map((w) => [w.closest('.modal') ? null : winKey(w), w]).filter(([k]) => k);
const places = () => new Map(liveWins().map(([k, w]) => [k, w.getBoundingClientRect()]));
function glide(before) {
  if (still() || !before.size) return;
  for (const [k, w] of liveWins()) {
    const a = before.get(k);
    if (!a || w.classList.contains('win-arrive')) continue;
    const b = w.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top - b.top;
    const dw = a.width - b.width;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dw) < 1) continue;
    // a window that also changes width (NOVA's, from her request to her column) is let out of its column by as much
    // on each side, and brought back in: a real width, so her lines never look stretched
    const side = Math.abs(dw) < 1 ? {} : { marginLeft: `${-dw / 2}px`, marginRight: `${-dw / 2}px` };
    const rest = Math.abs(dw) < 1 ? {} : { marginLeft: '0px', marginRight: '0px' };
    const body = w.querySelector(':scope > .win-body');
    const atEnd = body && body.scrollHeight - body.clientHeight - body.scrollTop < 4;
    const move = w.animate([{ transform: `translate(${dx}px, ${dy}px)`, ...side }, { transform: 'none', ...rest }], { duration: MOVE_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    // (wider, her lines break in fewer rows and the conversation loses its place: it is put back at its last line)
    if (side.marginLeft && atEnd) move.finished.then(() => { body.scrollTop = body.scrollHeight; }, () => {});
  }
}

// ---------- the station model under the pointer ----------

// Under the mouse the model lies flat, seen from above, and what the pointer is on lights up; when the pointer leaves
// it goes back to swaying (CSS: .is-flat; 2026-11-25: «mouse hover, la mappa si raddrizza, effetto hover tipo si
// illuminano la zona o i corridoi che hovero, poi appena mouse leave torna a ruotare»). The page is drawn again at
// every tap, so which model is flat is kept here and given to the new one before it is first painted.
let flatHolo = null; // 'map' (the one in its window) or 'pick' (the one NOVA shows for a question)
const holoKey = (h) => (h.closest('.win-map') ? 'map' : 'pick');
function layFlat() {
  root.querySelectorAll('.holo').forEach((h) => {
    h.classList.toggle('is-flat', holoKey(h) === flatHolo);
    holdModel(h); // (the model a finger is turning keeps its position when the screen is drawn again)
  });
}
root.addEventListener('pointerover', (e) => {
  // (after a finger, the browser may report a mouse over whatever is drawn again under its last place: only a mouse
  // that really moves takes the model back)
  if (e.pointerType !== 'mouse' || SIM || fingerDown) return;
  const h = e.target.closest?.('.holo');
  const key = h ? holoKey(h) : null;
  if (key !== flatHolo) { flatHolo = key; layFlat(); }
});
// (only the mouse: a finger also "leaves" the page each time it is lifted)
root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !SIM && flatHolo) { flatHolo = null; layFlat(); } });

// ---------- the station model under a finger (board "maptouch") ----------

// 2026-11-27, on a phone the places of the new plan are small targets: «sul telefono, non possiamo che quando focus
// sulla mappa la appiattisce? o lo rendiamo interattivo quindi se swipo con dito si gira la mappa come voglio, non ha
// senso andare sotto alla mappa né dietro, quindi con lo swipe il movimento è limitato a quello che già farebbe. poi
// quando dopo qualche secondo che non si tocca la mappa, torna a girare come suo consueto»
// Chosen 2026-11-27, the first tap: the first tap on the swaying model lays it flat and selects nothing, the next taps
// select, and REST_MS after the last touch on it the model goes back to swaying («teniamo quella con tocco dai»; just
// before, the swipe: «i think interactive is better, and you can move with the finger, but movement is limited to how
// the map usually swings»). Kept for the record of the board:
//   ?touch=swipe  a finger dragged on the model turns it: up and down between flat and its usual tilt, sideways within
//                 its sway; a tap still selects; at rest it goes on swaying from where it was left
//   ?touch=off    the model as it was before: a finger only taps
//   ?sim=1        the mouse acts as a finger (the board plays them in a frame on a laptop)
const TOUCH = params.get('touch') === 'off' ? null : params.get('touch') === 'swipe' ? 'swipe' : 'flat';
const SIM = params.get('sim') === '1';
if (TOUCH) document.body.classList.add(`touch-${TOUCH}`);
const REST_MS = 4000;
const TILT = 50, SWAY = 5; // the model's usual tilt and the reach of its sway (CSS: .holo-4, holo-sway-p)
const isFinger = (e) => e.pointerType === 'touch' || e.pointerType === 'pen' || (SIM && e.pointerType === 'mouse');
let restTimer = 0;
const restLater = (fn) => { clearTimeout(restTimer); restTimer = setTimeout(fn, REST_MS); };
let fingerDown = false; // the click that follows comes from a finger
let swallow = false; // the click that ends a swipe selects nothing
let held = null; // { key, tilt, sway }: the model a finger has turned, until it rests
let drag = null;

function holdModel(h) {
  const on = Boolean(held && holoKey(h) === held.key);
  h.classList.toggle('is-held', on);
  if (!on) return;
  h.style.setProperty('--held-tilt', `${held.tilt}deg`);
  h.style.setProperty('--held-sway', `${held.sway}deg`);
  h.style.setProperty('--held-hs', String(1 - 0.14 * (1 - held.tilt / TILT))); // as small as the flat model when flat
  h.style.setProperty('--held-hh', `${(26 * held.tilt) / TILT}px`); // the walls go down as it lies flat
  h.style.setProperty('--held-beam', String(held.tilt / TILT));
}
// The sway is ease-in-out from -SWAY to +SWAY in 5 s and back: the moment of the 10 s cycle where it is at `deg`,
// on the way up, so that a model let go goes on swaying from where the finger left it.
function swayPhaseMs(deg) {
  const bez = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  const ease = (x) => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (bez(0.42, 0.58, m) < x) lo = m; else hi = m; } return bez(0, 1, lo); };
  const want = (deg + SWAY) / (2 * SWAY);
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (ease(m) < want) lo = m; else hi = m; }
  return lo * 5000;
}
let swayShift = 0; // added to the page's clock for the sway (render(): --holo-t)
function letGo() {
  if (!held) return;
  swayShift = swayPhaseMs(held.sway) - (performance.now() % 10000);
  held = null;
  root.style.setProperty('--holo-t', `${-Math.round((((performance.now() + swayShift) % 10000) + 10000) % 10000)}ms`);
  layFlat();
}

root.addEventListener('pointerdown', (e) => {
  fingerDown = isFinger(e);
  const h = e.target.closest?.('.holo');
  if (!TOUCH || !fingerDown || !h) return;
  if (TOUCH === 'flat') { if (flatHolo === holoKey(h)) restLater(() => { flatHolo = null; layFlat(); }); return; }
  const stage = h.querySelector('.holo-stage');
  const cs = getComputedStyle(stage);
  const from = held && held.key === holoKey(h) ? held : { tilt: parseFloat(cs.getPropertyValue('--tilt')) || TILT, sway: parseFloat(cs.getPropertyValue('--sway')) || 0 };
  drag = { key: holoKey(h), x: e.clientX, y: e.clientY, tilt: from.tilt, sway: from.sway, moved: false, id: e.pointerId };
  clearTimeout(restTimer);
}, true);
root.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse' && !SIM && (e.movementX || e.movementY)) fingerDown = false;
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 8) return; // a tap, not a swipe
  drag.moved = true;
  // down pulls the far edge towards you, as on a sheet lying on a table: 120 px from tilted to flat; 150 px sideways
  // cover the whole sway
  held = {
    key: drag.key,
    tilt: Math.min(TILT, Math.max(0, drag.tilt - (dy * TILT) / 120)),
    sway: Math.min(SWAY, Math.max(-SWAY, drag.sway + (dx * 2 * SWAY) / 150)),
  };
  root.querySelectorAll('.holo').forEach(holdModel);
}, true);
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  swallow = drag.moved;
  drag = null;
  restLater(letGo);
};
root.addEventListener('pointerup', endDrag, true);
root.addEventListener('pointercancel', endDrag, true);
root.addEventListener('click', (e) => {
  if (!TOUCH || !fingerDown) return;
  const h = e.target.closest?.('.holo');
  if (TOUCH === 'swipe') {
    if (swallow) { swallow = false; e.stopImmediatePropagation(); e.preventDefault(); }
    return;
  }
  if (!h) return;
  if (!h.classList.contains('is-flat')) { e.stopImmediatePropagation(); e.preventDefault(); flatHolo = holoKey(h); layFlat(); }
  restLater(() => { flatHolo = null; layFlat(); });
}, true);

// ---------- NOVA writes ----------

// After the transmission is accepted NOVA writes her briefing one line at a time, and each thing comes onto the
// console when she names it (state.stage: the line she is on, 8 when she has finished). Her clock is the page's, not
// the screen's: she goes on writing while the player looks at another channel on a phone. A tap on her conversation
// while she writes shows the rest at once, as a tap on her typing always did.
// Her pace. 'now' is the game: with the pauses, the briefing takes about ten seconds. The others are proposals, played
// with ?pace= in the frames of the board "pace" (2026-11-25: «siccome nova scrive tanto testo tutto in un colpo, come
// scadenziamo e diamo tempo ai giocatori di seguire la console, anche in modo più realistico?»):
//   cps   letters per second
//   lead  before each line her prompt stands alone with the cursor, as long as the link takes to receive it (ms)
//   beat  the pause between two lines (ms)
//   wait  she goes on only when what she has brought has finished coming onto the console
//   read  time to read a line once it is written (ms per letter)
//   ack   she waits for Mission Control to answer COPY after each line
const PACES = {
  now: { cps: 90, lead: 0, beat: 350 },
  a: { cps: 45, lead: 0, beat: 700, wait: true },
  b: { cps: 60, lead: 900, beat: 300, wait: true, read: 14 },
  c: { cps: 45, lead: 0, beat: 300, wait: true, ack: true },
};
const PACE = PACES[params.get('pace')] || PACES.now;
const NOVA_CPS = PACE.cps;
const BEAT = PACE.beat;
let speech = null;     // { key, t0 }: what she is writing now and when she started
let nextTimer = 0;
const lineMs = (stage) => {
  if (stage === 0) return 150; // her first line is the request, already written: a beat, then she goes on
  const attached = BRIEFING_PARTS[stage].id === 'reports' ? 4 * 20 : 0; // the reports she attaches are typed too
  return PACE.lead + ((4 + BRIEFING_PARTS[stage].text.length + attached) / NOVA_CPS) * 1000; // 4: her name before the line
};

function speak(quiet) {
  clearTimeout(nextTimer);
  if (state.phase !== 'play') { speech = null; return; }
  const now = performance.now();
  const term = root.querySelector('.win-term .term');
  const rows = term ? [...term.querySelectorAll(':scope > .tl')] : [];
  const stage = state.stage;
  if (stage < 8) {
    const key = `${state.code}:b${stage}`;
    if (!speech || speech.key !== key) speech = { key, t0: now };
    const into = now - speech.t0;
    if (state.hold) return; // her line is written and she waits for COPY
    const go = () => {
      if (state.phase !== 'play' || state.stage !== stage) return;
      const busy = PACE.wait ? Math.max(0, ...[...arrivals.values()].map((a) => a.t0 + a.ms - performance.now())) : 0;
      if (busy > 0) { nextTimer = setTimeout(go, busy + BEAT); return; }
      // (the request and the oxygen line are not answered: the first is, with ACCEPT, and after the last the clock runs)
      if (PACE.ack && stage > 0 && stage < OXYGEN_STAGE) state.hold = true; else state.stage = stage + 1;
      render.keepScroll = true;
      render();
    };
    const read = stage > 0 && PACE.read ? BRIEFING_PARTS[stage].text.length * PACE.read : 0;
    nextTimer = setTimeout(go, Math.max(0, lineMs(stage) + read + BEAT - into));
    const row = stage > 0 && rows[rows.length - 1];
    if (row && PACE.lead) {
      row.classList.toggle('tl-lead', into < PACE.lead);
      if (into < PACE.lead) setTimeout(() => row.classList.remove('tl-lead'), PACE.lead - into);
      typeNodes([row.querySelector('.tl-txt'), row.querySelector('.tl-wide')], { cps: NOVA_CPS, max: 0, cursor: true, offset: into - PACE.lead });
    } else if (row) typeNodes([row], { cps: NOVA_CPS, max: 0, cursor: true, offset: into });
    return;
  }
  // she has finished: her last line and Mission Control's prompt are written once; after a question, her answer is
  const key = `${state.code}:q${state.log.length}`;
  if (!speech || speech.key !== key) speech = { key, t0: quiet ? -Infinity : now };
  if (!rows.length || (state.askStep || 0) !== 0) { speech.t0 = -Infinity; return; }
  const lastQ = rows.findLastIndex((r) => r.matches('.tl-mc:not(.tl-draft)'));
  typeNodes(lastQ >= 0 ? rows.slice(lastQ + 1) : rows.slice(-2), { cps: NOVA_CPS, max: 0, cursor: true, offset: now - speech.t0 });
}

function tick() {
  if (state.phase === 'play') {
    const ms = remaining();
    if (ms <= 0) {
      pauseTimer();
      endGame('timeout');
      return;
    }
    // (not while the clock and its bar are being typed in: they hold their place until the typing reaches them)
    const el = root.querySelector('[data-timer]');
    if (el && !el.closest('.fx-root')) el.textContent = fmtClock(ms);
    const bar = root.querySelector('[data-meter]');
    if (bar && !bar.closest('.fx-root')) {
      const cells = bar.querySelectorAll('i');
      const on = Math.ceil((ms / OXYGEN_MS) * cells.length);
      cells.forEach((m, i) => m.classList.toggle('on', i < on));
    }
    if ((ms <= 60000) !== lastCritical) { render.keepScroll = true; render(); }
  }
  if (state.phase === 'home' && state.resume === 'play') {
    // the request shows the oxygen of the case left open: it keeps running
    const el = root.querySelector('[data-timer]');
    if (el && !el.closest('.fx-root')) el.textContent = fmtClock(remaining());
  }
  if (DEV) updateDevClock();
}
setInterval(tick, 250);

// ---------- actions ----------

const freshDraft = () => ({ kind: 'hatch', what: null, a: null, b: null }); // no place and no time chosen: the app never points anywhere

function newGame(code) {
  const keepFont = state.font;
  state = newState();
  state.font = keepFont;
  state.code = code || randomCode();
  theCase = generateCase(state.code);
  // (the oxygen does not run yet: it starts with the line in which NOVA says it does, see startClock)
  state.phase = 'play';
  state.tab = 'ask';
  state.stage = 0;
  state.askStep = 0;
  state.openReports = [];
  state.draft = freshDraft();
  seen.clear(); arrivals.clear(); seen.add('nova'); // her window is already there
  speech = null;
  render();
}

// the empty console, with NOVA's next request waiting
function goHome() {
  const keepFont = state.font;
  state = newState();
  state.font = keepFont;
  theCase = null;
  seen.clear(); arrivals.clear();
  speech = null;
  render();
}

function endGame(kind) {
  pauseTimer();
  state.ending = kind;
  state.phase = 'ending';
  state.confirming = false;
  render();
}

const again = () => { render.keepScroll = true; render(); };

const ACTIONS = {
  accept: () => newGame(), // ACCEPT on NOVA's request
  ack: () => { state.hold = false; state.stage += 1; again(); }, // COPY after one of her lines (?pace=c)
  home: goHome,
  continue: () => { state.phase = state.resume; state.resume = null; render.quiet = true; render(); },
  quit: () => { state.quitOpen = true; again(); },
  'cancel-quit': () => { state.quitOpen = false; again(); },
  'confirm-quit': goHome,
  // On a laptop NOVA and the reports are always on the screen: the keys change what stands under the meters, and
  // the key that is lit gives the place back to what rests there (the case while she writes, then the map)
  tab: (el) => {
    const v = el.dataset.v;
    const wide = wideQuery.matches;
    state.tab = wide && liveSide(state.tab, state.stage) === v ? 'ask' : v;
    state.confirming = false;
    render.keepScroll = wide;
    render();
  },
  'toggle-report': (el) => {
    const p = el.dataset.p;
    state.openReports = state.openReports.includes(p) ? state.openReports.filter((x) => x !== p) : [...state.openReports, p];
    again();
  },
  // a report NOVA attached, tapped in her conversation: it opens (on a phone, in the REPORTS channel)
  'open-report': (el) => {
    const p = el.dataset.p;
    if (!state.openReports.includes(p)) state.openReports.push(p);
    if (!wideQuery.matches) { state.tab = 'reports'; render(); } else again();
  },
  profile: (el) => { state.profile = el.dataset.p; again(); },
  'close-modal': () => { state.profile = null; again(); },
  'map-sel': (el) => { state.mapSel = el.dataset.id; again(); },
  // a question to NOVA: the place, the 10 minutes, then it is sent (state.askStep: 0 none started, 1, 2, 3)
  'ask-step': (el) => { state.askStep = Number(el.dataset.v); again(); },
  // the place tapped on the map decides the sensor: a hatch asks about openings, a module about motion
  'draft-place': (el) => {
    const id = el.dataset.id;
    state.draft.what = id;
    state.draft.kind = HATCH_NAME[id] ? 'hatch' : 'motion';
    state.askStep = state.draft.a == null ? 2 : 3;
    again();
  },
  'draft-time': (el) => {
    state.draft.a = Number(el.dataset.v);
    state.draft.b = state.draft.a + 10; // a question covers 10 minutes (decided 2026-11-24)
    state.askStep = 3;
    again();
  },
  'send-question': () => {
    if (state.log.length >= MAX_QUESTIONS) return;
    const d = state.draft;
    if (!d.what || d.a == null) return;
    const q = { kind: d.kind, what: d.what, a: d.a, b: d.b };
    state.log.push({ q, ans: answer(theCase, q) });
    state.draft = freshDraft();
    state.askStep = 0;
    again();
  },
  'send-code': () => { if (/^\d{3}$/.test(state.codeInput)) { state.confirming = true; again(); } },
  'cancel-code': () => { state.confirming = false; again(); },
  'confirm-code': () => {
    state.sentCode = state.codeInput;
    endGame(state.codeInput === theCase.emergencyCode ? 'right' : 'wrong');
  },
  solution: () => { state.phase = 'solution'; render(); },
};

// NOVA stops writing and everything she had still to bring is there
function cutBriefing() {
  state.stage = 8;
  state.hold = false;
  render.keepScroll = true;
  render.quiet = true;
  render();
}

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !root.contains(el)) {
    if (state.phase === 'play' && state.stage < 8 && e.target.closest('.win-term')) cutBriefing();
    return;
  }
  // clicks inside a modal window don't close it, except on its own buttons
  if (el.classList.contains('modal') && e.target.closest('[data-stop]')) return;
  if (el.disabled) return;
  const f = ACTIONS[el.dataset.act];
  if (f) { e.preventDefault(); f(el); }
});
root.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-act]')) { e.preventDefault(); ACTIONS[e.target.dataset.act]?.(e.target); }
  if (e.key === 'Escape' && state.profile) ACTIONS['close-modal']();
  if (e.key === 'Escape' && state.quitOpen) ACTIONS['cancel-quit']();
  if (e.key === 'Enter' && e.target.matches('[data-field="code"]')) ACTIONS['send-code']();
});
root.addEventListener('input', (e) => {
  if (e.target.dataset.field !== 'code') return;
  const clean = e.target.value.replace(/\D/g, '').slice(0, 3);
  if (clean !== e.target.value) e.target.value = clean;
  state.codeInput = clean;
  // update the button without a re-render, so the field keeps focus
  const b = root.querySelector('[data-act="send-code"]');
  if (b) b.disabled = !/^\d{3}$/.test(clean);
  save();
});
// what scrolls under the title of a window fades out, once the window has left its first line (scroll does not bubble)
root.addEventListener('scroll', (e) => { if (e.target.matches?.('.win-body')) markScrolled(e.target); }, true);
wideQuery.addEventListener('change', again);

// ---------- developer tools (?dev=1) ----------

let devEl = null;
function renderDev() {
  if (!devEl) {
    devEl = document.createElement('aside');
    devEl.className = 'dev';
    document.body.appendChild(devEl);
    devEl.addEventListener('click', onDevClick);
    devEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.name === 'seed') onDevClick({ target: devEl.querySelector('[data-dev="load"]') }); });
  }
  const c = theCase;
  const t = state.timer;
  devEl.innerHTML = `
    <header class="dev-bar"><b>DEV</b><button type="button" data-dev="fold">${devEl.classList.contains('is-folded') ? '+' : '–'}</button></header>
    <div class="dev-body">
      ${c ? `<p>CASE <b>${esc(c.code)}</b> · shape ${esc(c.style)}${c.witness ? '+witness' : ''}${c.passage ? '+passage' : ''}${c.visit ? '+visit' : ''}</p>
        <p class="dev-sol">${state.devShow ? `Saboteur <b>${esc(PEOPLE[c.sab].short)}</b> (report ${c.order.indexOf(c.sab) + 1}), left ${String(c.t)}′ · suspects ${c.suspects.map((p) => esc(PEOPLE[p].short)).join(' / ')} · code <b>${c.emergencyCode}</b>` : '<i>Solution hidden</i>'}</p>
        <div class="dev-row"><button type="button" data-dev="show">${state.devShow ? 'Hide' : 'Show'} solution</button>
        <button type="button" data-dev="skip">Skip briefing</button></div>
        <div class="dev-row">Timer <span data-dev-clock>${fmtClock(remaining())}</span> ×${t.speed}
          <button type="button" data-dev="pause">${t.since ? 'Pause' : 'Resume'}</button>
          <button type="button" data-dev="speed" data-v="1">×1</button><button type="button" data-dev="speed" data-v="10">×10</button><button type="button" data-dev="speed" data-v="60">×60</button>
          <button type="button" data-dev="minus">−1 min</button></div>` : '<p>No case loaded.</p>'}
      <div class="dev-row"><input name="seed" placeholder="K9-XXXX" value=""><button type="button" data-dev="load">Load seed</button>
        <button type="button" data-dev="new">New case</button></div>
      <p class="dev-note">Font: key F or ?font=1–4</p>
    </div>`;
}
function updateDevClock() {
  const el = devEl && devEl.querySelector('[data-dev-clock]');
  if (el) el.textContent = fmtClock(remaining());
}
function onDevClick(e) {
  const b = e.target.closest && e.target.closest('[data-dev]');
  if (!b) return;
  const k = b.dataset.dev;
  if (k === 'fold') { devEl.classList.toggle('is-folded'); renderDev(); return; }
  if (k === 'show') state.devShow = !state.devShow;
  if (k === 'skip' && theCase && state.phase === 'play' && state.stage < 8) { cutBriefing(); return; }
  if (k === 'pause') { if (state.timer.since) pauseTimer(); else if (state.phase === 'play' && state.clock) resumeTimer(); }
  if (k === 'speed') setSpeed(Number(b.dataset.v));
  if (k === 'minus') { state.timer.elapsed += 60000; }
  if (k === 'new') { newGame(); return; }
  if (k === 'load') {
    const code = normalizeCode(devEl.querySelector('input[name=seed]').value);
    if (!code) { devEl.querySelector('input[name=seed]').value = 'Invalid code'; return; }
    newGame(code);
    return;
  }
  again();
}

// ---------- start ----------

initFontSwitch();
// Opening the page always shows the empty console with NOVA's request (reset, chosen 2026-11-23: A + B). A case left
// open is offered above it with CONTINUE. The oxygen clock is wall-clock based: it kept running while the page was closed.
if (state.code && state.phase !== 'home') {
  state.resume = state.phase;
  state.phase = 'home';
  state.quitOpen = false;
  state.profile = null;
}
// The console is drawn when its fonts are there: no text is first seen in another font, and no window is measured
// with one (2026-11-26: «c'è fout quando carico la pagina»). They start loading with the page (index.html); if the
// link is too slow the console comes anyway after a second and a half, and the text waits for its font, unseen.
const fd = getComputedStyle(document.documentElement).getPropertyValue('--fd').trim() || '"Jersey 10"';
Promise.race([
  Promise.all([`400 16px ${fd}`, '400 14px "IBM Plex Mono"', '500 14px "IBM Plex Mono"', '600 14px "IBM Plex Mono"'].map((x) => document.fonts.load(x))),
  new Promise((r) => { setTimeout(r, 1500); }),
]).catch(() => {}).then(() => {
  render();
  if (DEMO && params.has('auto')) newGame(); // a board plays the briefing without a tap (mocks.html, board "pace")
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !DEV && !DEMO) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
