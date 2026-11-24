// NOVA: game state, events, timer, persistence, developer tools.
import { generateCase, randomCode, normalizeCode, answer, PEOPLE, HATCH_NAME } from './generator.js';
import { screen, newState, fmtClock, MAX_QUESTIONS, OXYGEN_MS, esc } from './ui.js';
import { initFontSwitch } from './fonts.js';
import { typeIn } from './typing.js';

const STORE = 'k9-nova-state-v1';
const params = new URLSearchParams(location.search);
const DEV = params.get('dev') === '1';
const root = document.getElementById('app');
const wideQuery = matchMedia('(min-width: 1000px)');

let state = load() || newState();
let theCase = state.code ? generateCase(state.code) : null;

// ---------- persistence ----------

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    return s && s.v === 1 ? s : null;
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

function view() {
  return {
    state, c: theCase, wide: wideQuery.matches, remainingMs: remaining(), dev: DEV,
    reportStyle: 'sheet', // chosen 2026-11-23: the report as a document, signed at the bottom
    askWhere: 'tap', // chosen 2026-11-23: tap a hatch (opening) or a module (motion) on the map
    briefStyle: 'txmix', briefTyped: true, // chosen 2026-11-23: NOVA's messages + rule cards
    mapDetail: { holo: 3 }, // chosen 2026-11-24: projected hologram (tilted, raised walls, beam, slow sway)
    homeStyle: 'window', // chosen 2026-11-24: the home status in a NOVA window
    callUi: null, // Bridge console call: off until the question builder is chosen (mocks.html, board "calls"); see CALLS_IN_GAME
    quit: state.phase === 'play', quitOpen: state.quitOpen,
    saved: state.resume ? { code: state.code, phase: state.resume, remainingMs: remaining() } : null,
  };
}

let lastCritical = null;
function render() {
  const scrollY = window.scrollY;
  const keepScroll = render.keepScroll;
  render.keepScroll = false;
  root.innerHTML = screen(view());
  document.body.classList.toggle('emergency', isRed());
  // last minute: alarm frame and hazard stripes; the windows keep their colours
  document.body.classList.toggle('alarm', state.phase === 'play' && remaining() <= 60000);
  lastCritical = remaining() <= 60000;
  typeIn(root);
  if (DEV) renderDev();
  if (keepScroll) window.scrollTo(0, scrollY);
  else window.scrollTo(0, 0);
  save();
}

function isRed() {
  if (state.phase === 'play') return remaining() <= 60000;
  if (state.phase === 'ending') return state.ending !== 'right';
  return false;
}

function tick() {
  if (state.phase === 'play') {
    const ms = remaining();
    if (ms <= 0) {
      pauseTimer();
      endGame('timeout');
      return;
    }
    const el = root.querySelector('[data-timer]');
    if (el) el.textContent = fmtClock(ms);
    const meter = root.querySelectorAll('[data-meter] i');
    const on = Math.ceil((ms / OXYGEN_MS) * meter.length);
    meter.forEach((m, i) => m.classList.toggle('on', i < on));
    if ((ms <= 60000) !== lastCritical) { render.keepScroll = true; render(); }
  }
  if (state.phase === 'home' && state.resume === 'play') {
    // the home shows the oxygen of the saved game: it keeps running
    const el = root.querySelector('[data-timer]');
    if (el) el.textContent = fmtClock(remaining());
  }
  if (DEV) updateDevClock();
}
setInterval(tick, 250);

// ---------- actions ----------

function newGame(code) {
  const keepFont = state.font;
  state = newState();
  state.font = keepFont;
  state.code = code || randomCode();
  theCase = generateCase(state.code);
  // Decided 2026-11-23 (changes the brief): the oxygen runs from NOVA's first message. There is no
  // separate briefing screen: the investigation opens on the BRIEFING tab with the timer running.
  // Confirmed 2026-11-24 against update 1, which asked for a START MISSION button.
  state.phase = 'play';
  state.tab = 'briefing';
  resumeTimer();
  render();
}

function endGame(kind) {
  pauseTimer();
  state.ending = kind;
  state.phase = 'ending';
  state.confirming = false;
  render();
}

const ACTIONS = {
  'new-game': () => newGame(),
  continue: () => {
    // a game saved on the old briefing screen goes on in the investigation, briefing first
    if (state.resume === 'briefing') { state.resume = 'play'; state.tab = 'briefing'; resumeTimer(); }
    state.phase = state.resume; state.resume = null; render();
  },
  quit: () => { state.quitOpen = true; render.keepScroll = true; render(); },
  'cancel-quit': () => { state.quitOpen = false; render.keepScroll = true; render(); },
  'confirm-quit': () => { state = newState(); theCase = null; render(); },
  'start-mission': () => { state.phase = 'play'; state.tab = 'reports'; state.mapSel = null; resumeTimer(); render(); },
  tab: (el) => { state.tab = el.dataset.v; state.confirming = false; render(); },
  profile: (el) => { state.profile = el.dataset.p; render.keepScroll = true; render(); },
  'close-modal': () => { state.profile = null; render.keepScroll = true; render(); },
  'map-sel': (el) => { state.mapSel = el.dataset.id; render.keepScroll = true; render(); },
  'draft-kind': (el) => {
    if (state.draft.kind !== el.dataset.v) { state.draft.kind = el.dataset.v; state.draft.what = null; }
    render.keepScroll = true; render();
  },
  'draft-what': (el) => { state.draft.what = el.dataset.v; render.keepScroll = true; render(); },
  // the place tapped on the map decides the sensor: a hatch asks about openings, a module about motion
  'draft-place': (el) => {
    const id = el.dataset.id;
    state.draft.what = id === 'console' ? 'B' : id;
    state.draft.kind = id === 'console' ? 'call' : HATCH_NAME[id] ? 'hatch' : 'motion';
    render.keepScroll = true; render();
  },
  'draft-call': () => { state.draft.kind = 'call'; state.draft.what = 'B'; render.keepScroll = true; render(); },
  'draft-sensor': (el) => { state.draft.kind = el.dataset.v; render.keepScroll = true; render(); },
  'send-question': () => {
    if (state.log.length >= MAX_QUESTIONS) return;
    const d = state.draft;
    if (!d.what || d.b <= d.a) return;
    const q = { kind: d.kind, what: d.what, a: d.a, b: d.b };
    state.log.push({ q, ans: answer(theCase, q) });
    state.draft = { kind: d.kind, what: null, a: 0, b: 60 };
    render.keepScroll = true;
    render();
  },
  'send-code': () => { if (/^\d{3}$/.test(state.codeInput)) { state.confirming = true; render.keepScroll = true; render(); } },
  'cancel-code': () => { state.confirming = false; render.keepScroll = true; render(); },
  'confirm-code': () => {
    state.sentCode = state.codeInput;
    endGame(state.codeInput === theCase.emergencyCode ? 'right' : 'wrong');
  },
  solution: () => { state.phase = 'solution'; render(); },
};

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !root.contains(el)) return;
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
root.addEventListener('change', (e) => {
  const f = e.target.dataset.field;
  if (f === 'a' || f === 'b') { state.draft[f] = Number(e.target.value); render.keepScroll = true; render(); }
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
wideQuery.addEventListener('change', () => { render.keepScroll = true; render(); });

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
      ${c ? `<p>CASE <b>${esc(c.code)}</b> · shape ${esc(c.style)}${c.witness ? '+witness' : ''}${c.visit ? '+visit' : ''}</p>
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
  if (k === 'skip' && theCase && state.phase === 'play') state.tab = 'reports';
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
  render.keepScroll = true;
  render();
}

// ---------- start ----------

initFontSwitch();
// Opening the page always shows the home (reset, chosen 2026-11-23: A + B). A saved game is offered with
// CONTINUE if still open. The oxygen clock is wall-clock based: it kept running while the page was closed.
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
