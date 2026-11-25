// NOVA: game state, events, timer, persistence, developer tools.
import { generateCase, randomCode, normalizeCode, answer, PEOPLE, HATCH_NAME } from './generator.js';
import { BRIEFING_PARTS } from './texts.js';
import { screen, newState, liveSide, fmtClock, MAX_QUESTIONS, OXYGEN_MS, esc } from './ui.js';
import { initFontSwitch } from './fonts.js';
import { typeIn } from './typing.js';
import { typeNodes, typeWindow } from './winfx.js';

const STORE = 'k9-nova-state-v2'; // v1: the interface with tabs and a status bar; its saved games are not carried over
const params = new URLSearchParams(location.search);
const DEV = params.get('dev') === '1';
const root = document.getElementById('app');
const wideQuery = matchMedia('(min-width: 1000px)');

let state = load() || newState();
let theCase = state.code ? generateCase(state.code) : null;

// ---------- persistence ----------

function load() {
  try {
    localStorage.removeItem('k9-nova-state-v1');
    const s = JSON.parse(localStorage.getItem(STORE));
    return s && s.v === 2 ? s : null;
  } catch { return null; }
}
function save() {
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
    reportStyle: 'crewwin', askUi: 'thread', mapDetail: { holo: 4, info: 'fields' },
    quitOpen: state.quitOpen,
    saved: state.resume ? { code: state.code, phase: state.resume, remainingMs: remaining() } : null,
  };
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
  root.innerHTML = screen(view());
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
const winKey = (w) => (w.matches('.win-term') ? 'nova' : w.matches('.win-notes') ? 'notes' : w.matches('.win-map') ? 'map'
  : w.matches('.win-code') ? 'code' : w.matches('.win-questions') ? 'questions' : w.matches('.win-oxygen') ? 'oxygen'
    : w.matches('.win-report') ? `report-${w.querySelector('[data-p]')?.dataset.p}` : null);

function arrive(quiet) {
  const live = root.querySelector('.screen-live');
  if (!live) return;
  const now = performance.now();
  // start(into): begins the effect `into` ms after its start, and returns how long the whole takes
  const come = (key, start) => {
    if (!seen.has(key)) {
      seen.add(key);
      if (!quiet) arrivals.set(key, { t0: now, ms: start(0) });
    } else {
      const a = arrivals.get(key);
      if (a && now - a.t0 < a.ms) start(now - a.t0); else arrivals.delete(key);
    }
  };
  live.querySelectorAll('.win').forEach((w) => {
    const key = w.closest('.modal') ? null : winKey(w);
    if (!key) return;
    const fresh = !seen.has(key);
    come(key, (into) => {
      w.classList.add('win-arrive');
      w.style.animationDelay = `${-Math.round(into)}ms`;
      // her request is written at the speed of her writing, not filled in like a file
      const speech = key === 'nova' ? { cps: NOVA_CPS, max: 0, cursor: true } : {};
      return OPEN_MS + typeWindow(w, { ...speech, offset: Math.max(0, into - OPEN_MS) }).ms;
    });
    if (key !== 'notes') return;
    // the case notes: each one is typed in when NOVA says it (the first ones come with the window itself)
    w.querySelectorAll('[data-note]').forEach((row) => {
      const k = `note-${row.dataset.note}`;
      if (fresh || arrivals.has('notes')) { seen.add(k); return; }
      come(k, (into) => typeNodes([...row.children], { offset: into }).ms);
    });
  });
}

// ---------- NOVA writes ----------

// After the transmission is accepted NOVA writes her briefing one line at a time, and each thing comes onto the
// console when she names it (state.stage: the line she is on, 8 when she has finished). Her clock is the page's, not
// the screen's: she goes on writing while the player looks at another channel on a phone. A tap on her conversation
// while she writes shows the rest at once, as a tap on her typing always did.
const NOVA_CPS = 90;   // letters per second: with the pauses, the briefing takes about ten seconds
const BEAT = 350;      // the pause between two lines
let speech = null;     // { key, t0 }: what she is writing now and when she started
let nextTimer = 0;
const lineMs = (stage) => {
  if (stage === 0) return 150; // her first line is the request, already written: a beat, then she goes on
  const attached = BRIEFING_PARTS[stage].id === 'reports' ? 4 * 20 : 0; // the reports she attaches are typed too
  return ((4 + BRIEFING_PARTS[stage].text.length + attached) / NOVA_CPS) * 1000; // 4: her name before the line
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
    nextTimer = setTimeout(() => {
      if (state.phase !== 'play' || state.stage !== stage) return;
      state.stage = stage + 1;
      render.keepScroll = true;
      render();
    }, Math.max(0, lineMs(stage) + BEAT - into));
    if (stage > 0 && rows.length) typeNodes([rows[rows.length - 1]], { cps: NOVA_CPS, max: 0, cursor: true, offset: into });
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
  // Decided 2026-11-23 (changes the brief): the oxygen runs from NOVA's first message. Confirmed 2026-11-24 against
  // update 1, which asked for a START MISSION button. Since 2026-11-25 that moment is ACCEPT on her request: the
  // clock runs from there, and its window comes when she names it, already showing the time gone.
  state.phase = 'play';
  state.tab = 'ask';
  state.stage = 0;
  state.askStep = 0;
  state.openReports = [];
  state.draft = freshDraft();
  resumeTimer();
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
  'new-game': () => newGame(), // ACCEPT on NOVA's request
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
  if (k === 'pause') { if (state.timer.since) pauseTimer(); else if (state.phase === 'play') resumeTimer(); }
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
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !DEV) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
