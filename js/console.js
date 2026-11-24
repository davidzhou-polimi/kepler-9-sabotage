// Mission Control console: the whole web app as the console of Mission Control (proposals, mocks only until chosen).
// view.shell: 'monitor' the browser window is one console CRT; 'desk' the physical console (monitors + key panel);
//             'dash' the console software fills the screen, every panel visible at once on a laptop.
//             'desk2' third round: the desk combined with today's interface (see below)
//             'deck' fourth round: one screen with today's windows, and the physical bar (see below)
// view.fx: whole-screen video effects, a list: 'crt' (glass, always), 'boot' (power-on), 'static' (channel change),
//          'link' (NOVA's damaged link). In mocks a frame can be frozen on a moment with view.fxFreeze.
import { esc, fmtClock, warningIcon, statusBar, reportsPanel, mapPanel, askPanel, briefingPanel, codePanel, profileModal, quitModal, MAX_QUESTIONS, OXYGEN_MS } from './ui.js';

const lamp = (label, cls = '') => `<span class="cs-lamp ${cls}"><i></i>${label}</span>`;
const sysLine = (c) => `<div class="cs-sys"><span>MC-OS // MISSION CONTROL</span><span>KEPLER-9 LINK${c ? ` · CASE ${esc(c.code)}` : ''}</span></div>`;
const critical = (view) => view.state.phase === 'play' && view.remainingMs <= 60000;
const lamps = (view) => lamp('PWR', 'is-on') + lamp('LINK', 'is-warn') + lamp('ALARM', critical(view) ? 'is-alarm' : '');
const fxClass = (view) => (view.fx || []).map((f) => `fx-${f}`).join(' ') + (view.fxFreeze ? ` fx-freeze-${view.fxFreeze}` : '');

// the four channels of the console
const CHANNELS = [['reports', 'REPORTS'], ['map', 'MODEL'], ['comms', 'COMMS'], ['code', 'CODE']];
const commsTab = (tab) => (tab === 'briefing' ? 'briefing' : 'ask');

function commsContent(view) {
  const { state, c } = view;
  const sub = commsTab(state.tab);
  return `<nav class="cs-subkeys">
      <button type="button" class="cs-subkey ${sub === 'briefing' ? 'is-on' : ''}" data-act="tab" data-v="briefing">BRIEFING</button>
      <button type="button" class="cs-subkey ${sub === 'ask' ? 'is-on' : ''}" data-act="tab" data-v="ask">ASK NOVA</button>
    </nav>
    ${sub === 'briefing' ? briefingPanel({ typed: false, style: view.briefStyle || 'now' }) : askPanel(state, c, view.askWhere, view.mapDetail || {})}`;
}
const panelFor = (view, ch) => ({
  reports: () => reportsPanel(view.c, view.reportStyle || 'card'),
  map: () => mapPanel(view.state.mapSel, { detail: view.mapDetail || {} }),
  comms: () => commsContent(view),
  code: () => codePanel(view.state),
}[ch]());
const channelOf = (tab) => (tab === 'reports' || tab === 'map' || tab === 'code' ? tab : 'comms');

function o2Display(view) {
  const left = MAX_QUESTIONS - view.state.log.length;
  const frac = Math.max(0, view.remainingMs / OXYGEN_MS);
  return `<div class="cs-o2"><span class="cs-o2-label">O2</span><span class="cs-o2-val" data-timer>${fmtClock(view.remainingMs)}</span>
    <span class="cs-o2-bar"><i style="width:${Math.round(frac * 100)}%"></i></span></div>
    <div class="cs-q"><span class="cs-o2-label">QUESTIONS</span>${Array.from({ length: MAX_QUESTIONS }, (_, i) => lamp('', i < left ? 'is-q' : '')).join('')}</div>`;
}
const keycap = (label, act, v, { on = false, cls = '' } = {}) =>
  `<button type="button" class="cs-key ${on ? 'is-on' : ''} ${cls}" data-act="${act}" ${v ? `data-v="${v}"` : ''}><span>${label}</span></button>`;
const codeKey = (on) => `<div class="cs-guard"><span class="cs-guard-label">EMERGENCY</span>${keycap('CODE', 'tab', 'code', { on, cls: 'cs-key-red' })}</div>`;
const modals = (view) => `${view.state.profile ? profileModal(view.c, view.state.profile) : ''}${view.quitOpen ? quitModal(view.c) : ''}`;
const alarmStrip = (view) => (critical(view) ? '<div class="alarm-strip" role="alert"><span>OXYGEN CRITICAL // LESS&nbsp;THAN&nbsp;ONE&nbsp;MINUTE</span></div>' : '');

// ---------- the browser window is one console CRT ----------

function monitorShell(view, inner) {
  return `<div class="cs cs-monitor ${fxClass(view)}">
    <div class="cs-glass"><div class="cs-scroll">${sysLine(view.c)}${inner}</div><div class="cs-fx" aria-hidden="true"></div></div>
    <div class="cs-panel">${lamps(view)}<span class="cs-brand">MISSION CONTROL · NIGHT SHIFT</span></div>
  </div>`;
}

// ---------- the physical console: monitors above, a panel of keys below ----------

function monitor(label, html, cls = '') {
  return `<section class="cs-mon ${cls}"><div class="cs-mon-label">${label}</div>
    <div class="cs-mon-glass"><div class="cs-scroll">${html}</div><div class="cs-fx" aria-hidden="true"></div></div></section>`;
}
function deskShell(view, inner) {
  const { state } = view;
  const playing = state.phase === 'play';
  if (!playing) {
    return `<div class="cs cs-desk ${fxClass(view)}">
      <div class="cs-monitors cs-monitors-one">${monitor('MON 3 // COMMS · KEPLER-9', inner, 'cs-mon-main')}</div>
      <div class="cs-deskpanel">${lamps(view)}<span class="cs-brand">MISSION CONTROL · NIGHT SHIFT</span></div>
    </div>`;
  }
  const ch = channelOf(state.tab);
  const monitors = view.wide
    ? `<div class="cs-monitors">
        ${monitor('MON 1 // REPORTS · RELAYED BY NOVA', panelFor(view, 'reports'))}
        ${monitor('MON 2 // STATION MODEL · ARCHIVE', panelFor(view, 'map'))}
        ${monitor(ch === 'code' ? 'MON 3 // EMERGENCY UPLINK' : 'MON 3 // COMMS · KEPLER-9', panelFor(view, ch === 'code' ? 'code' : 'comms'))}
      </div>`
    : `<div class="cs-monitors cs-monitors-one">${monitor(`MON // ${CHANNELS.find(([k]) => k === ch)[1]}`, panelFor(view, ch), 'cs-mon-main')}</div>`;
  const keys = view.wide
    ? keycap('BRIEFING', 'tab', 'briefing', { on: state.tab === 'briefing' }) + keycap('ASK NOVA', 'tab', 'ask', { on: state.tab === 'ask' })
    : CHANNELS.filter(([k]) => k !== 'code').map(([k, l]) => keycap(l, 'tab', k === 'comms' ? 'ask' : k, { on: ch === k })).join('');
  return `<div class="cs cs-desk ${fxClass(view)}">
    ${alarmStrip(view)}
    ${monitors}
    <div class="cs-deskpanel">
      <div class="cs-keys">${keys}</div>
      <div class="cs-readouts">${o2Display(view)}</div>
      <div class="cs-side">${lamps(view)}${codeKey(ch === 'code')}${keycap('QUIT', 'quit', '', { cls: 'cs-key-small' })}</div>
    </div>
    ${modals(view)}
  </div>`;
}

// ---------- the console software fills the screen ----------

function dashShell(view, inner) {
  const { state } = view;
  if (state.phase !== 'play' || !view.wide) {
    return `<div class="cs cs-dash ${fxClass(view)}"><div class="cs-glass"><div class="cs-scroll">${sysLine(view.c)}${inner}</div><div class="cs-fx" aria-hidden="true"></div></div></div>`;
  }
  return `<div class="cs cs-dash ${fxClass(view)}"><div class="cs-glass"><div class="cs-dashgrid">
      <div class="dash-sys">${sysLine(view.c)}</div>
      <div class="dash-tele">${statusBar({ ...view, quit: true })}${alarmStrip(view)}</div>
      <div class="dash-cell dash-rep"><div class="dash-label">REPORTS · RELAYED BY NOVA</div><div class="cs-scroll">${panelFor(view, 'reports')}</div></div>
      <div class="dash-cell dash-map"><div class="dash-label">STATION MODEL · ARCHIVE</div><div class="cs-scroll">${panelFor(view, 'map')}</div></div>
      <div class="dash-cell dash-code"><div class="dash-label">EMERGENCY UPLINK</div><div class="cs-scroll">${panelFor(view, 'code')}</div></div>
      <div class="dash-cell dash-comms"><div class="dash-label">COMMS · KEPLER-9</div><div class="cs-scroll">${panelFor(view, 'comms')}</div></div>
    </div><div class="cs-fx" aria-hidden="true"></div></div>${modals(view)}</div>`;
}

// ---------- third round: the physical console with today's interface ----------
// Chosen 2026-11-24: the physical console (desk) with the CRT glass, corrected:
// - today's status bar (OXYGEN with its timer and meter, QUESTIONS, CASE) is the console's telemetry display:
//   the countdown reads as the oxygen timer, and the questions left are on a screen, not on the hardware;
// - the keys are today's tabs, in one tidy row on a phone; the CODE key stays red, apart, under its guard;
// - QUIT is the power button;
// - the CRT glass covers the whole viewport, hardware included.
// view.deskPower: 'top' the power button beside the telemetry display (where QUIT is today);
//                 'panel' on the key panel (two rows of three on a phone).

const pixels = (rows) => rows.map((row, y) => [...row].map((ch, x) => (ch === 'k' ? `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>` : '')).join('')).join('');
const POWER = [
  '.....k.....', '.....k.....', '..kk.k.kk..', '.k...k...k.', 'k....k....k', 'k....k....k',
  'k.........k', 'k.........k', 'k.........k', '.k.......k.', '..kk...kk..', '....kkk....',
];
const powerKey = (live) => `<button type="button" class="cs-power" ${live ? 'data-act="quit"' : 'disabled'} aria-label="Quit game">
    <svg viewBox="0 0 11 12" shape-rendering="crispEdges" aria-hidden="true">${pixels(POWER)}</svg></button>`;
const key2 = (label, v, { on = false, live = true, cls = '' } = {}) =>
  `<button type="button" class="cs-key cs-key2 ${on ? 'is-on' : ''} ${cls}" ${live ? `data-act="tab" data-v="${v}"` : 'disabled'}><i class="cs-led" aria-hidden="true"></i><span>${label}</span></button>`;
// no case open: the same display, waiting for telemetry
const idleStatus = (view) => `<div class="status is-idle">
    <div class="status-o2"><span class="label">OXYGEN</span><span class="timer">--:--</span><span class="meter">${'<i></i>'.repeat(20)}</span></div>
    <div class="status-link"><span class="label">QUESTIONS</span><span class="pips">${'<i></i>'.repeat(MAX_QUESTIONS)}</span></div>
    <div class="status-case">CASE ${view.state.phase !== 'home' && view.c ? esc(view.c.code) : '----'}</div>
  </div>`;
const monitor2 = (label, html, cls = '') => `<section class="cs-mon ${cls}">${label ? `<div class="cs-mon-label">${label}</div>` : ''}
    <div class="cs-mon-glass"><div class="cs-scroll">${html}</div></div></section>`;

function desk2Shell(view, inner) {
  const { state, c } = view;
  const playing = state.phase === 'play';
  const powerTop = view.deskPower !== 'panel';
  let tab = state.tab;
  if (view.wide && (tab === 'reports' || tab === 'map')) tab = 'ask'; // on a laptop reports and map have their own monitors
  const content = {
    reports: () => reportsPanel(c, view.reportStyle || 'card'),
    map: () => mapPanel(state.mapSel, { detail: view.mapDetail || {}, console: view.callUi === 'map' }),
    ask: () => askPanel(state, c, view.askWhere, view.mapDetail || {}, view.callUi || null),
    briefing: () => briefingPanel({ typed: Boolean(view.briefTyped), style: view.briefStyle || 'now', calls: Boolean(view.callUi) }),
    code: () => codePanel(state),
  };
  let monitors;
  if (!playing) monitors = `<div class="cs-monitors cs-monitors-one">${monitor2('', inner, 'cs-mon-main')}</div>`;
  else if (view.wide) {
    monitors = `<div class="cs-monitors">
      ${monitor2('MON 1 // REPORTS · RELAYED BY NOVA', content.reports())}
      ${monitor2('MON 2 // STATION MODEL · ARCHIVE', content.map())}
      ${monitor2(tab === 'code' ? 'MON 3 // EMERGENCY UPLINK' : 'MON 3 // COMMS · KEPLER-9', content[tab]())}
    </div>`;
  } else monitors = `<div class="cs-monitors cs-monitors-one">${monitor2('', content[tab](), 'cs-mon-main')}</div>`;
  const k = (label, v) => key2(label, v, { on: playing && tab === v, live: playing });
  const keys = view.wide
    ? k('BRIEFING', 'briefing') + k('ASK NOVA', 'ask')
    : k('REPORTS', 'reports') + k('MAP', 'map') + k('ASK NOVA', 'ask') + k('BRIEFING', 'briefing');
  const code = `<div class="cs-guard">${key2('CODE', 'code', { on: playing && tab === 'code', live: playing, cls: 'cs-key-red' })}</div>`;
  return `<div class="cs cs-desk2 ${powerTop ? 'pw-top' : 'pw-panel'} ${fxClass(view)}">
    <div class="cs-top"><div class="cs-tele">${playing ? statusBar({ ...view, quit: false }) : idleStatus(view)}</div>${powerTop ? powerKey(playing) : ''}</div>
    ${playing && critical(view) ? `<div class="alarm-strip" role="alert">${warningIcon()}<span>OXYGEN CRITICAL // LESS&nbsp;THAN&nbsp;ONE&nbsp;MINUTE</span></div>` : ''}
    ${monitors}
    <div class="cs-deskpanel">
      <div class="cs-keys">${keys}</div>
      <div class="cs-lamps">${lamps(view)}</div>
      <div class="cs-side">${code}${powerTop ? '' : powerKey(playing)}</div>
    </div>
    ${playing ? modals(view) : ''}
    <div class="cs-crt" aria-hidden="true"></div>
  </div>`;
}

// ---------- fourth round: one screen with windows, and the physical bar ----------
// 2026-11-24, after the third round. The boxes don't sit in monitors (they read as cards, not windows): the screen
// is one display and shows today's screens as they are, windows on the grid, the status bar on top. The video
// effect stays on the screen, never on the hardware. The physical bar has more on it, none of it a fake control:
// the keys (today's tabs, each with its lamp), the red CODE key under its guard, the power button (QUIT), the PWR
// and ALARM lamps, the LINK meter (low and unsteady: the link is damaged), the speaker of the voice channel.
// view.deck: 'retro' chunky dark keys, slotted grille, needle gauge, a tube with its bezel
//            'color' as retro, with coloured key caps: amber ASK NOVA (the amber of the QUESTIONS marks), red CODE
//            'scifi' flat backlit keys, light strips, no bezel
// view.deckBar (what is on the bar besides the keys; proposals after «non mi convince molto, soprattutto il coso
// con la freccia su PWR e LINK», 2026-11-24; default 'gauge', the bar as first shown):
//   'tiles':       no needle, no grille, no plate: PWR, LINK and ALARM as three lit tiles in one recessed panel
//   'tilesgrille': the tiles, with the grille and the plate
//   'min':         only the keys, CODE and the power button
function deckShell(view, screenFn) {
  const { state } = view;
  const playing = state.phase === 'play';
  const style = view.deck || 'retro';
  const inner = screenFn({ ...view, shell: null, quit: false, noTabs: true });
  let tab = state.tab;
  if (view.wide && tab === 'reports') tab = 'ask'; // on a laptop the reports are always on screen
  const k = (label, v) => key2(label, v, { on: playing && tab === v, live: playing, cls: `cs-key-${v}` });
  const keys = (view.wide ? '' : k('REPORTS', 'reports')) + k('MAP', 'map') + k('ASK NOVA', 'ask') + k('BRIEFING', 'briefing');
  const code = `<div class="cs-guard">${key2('CODE', 'code', { on: playing && tab === 'code', live: playing, cls: 'cs-key-red' })}</div>`;
  const link = style === 'scifi'
    ? '<span class="cs-link"><span class="cs-o2-label">LINK</span><span class="cs-link-bars"><i class="on"></i><i class="on is-flick"></i><i></i><i></i><i></i></span></span>'
    : '<span class="cs-link"><span class="cs-gauge"><i></i></span><span class="cs-o2-label">LINK</span></span>';
  const bar = view.deckBar || 'gauge';
  const tiles = `<span class="cs-ann" aria-hidden="true"><b class="is-on">PWR</b><b class="is-warn">LINK</b><b class="${critical(view) ? 'is-alarm' : ''}">ALARM</b></span>`;
  const grille = '<span class="cs-grille" aria-hidden="true"></span><span class="cs-brand">MISSION CONTROL · NIGHT SHIFT</span>';
  const instr = {
    gauge: `<span class="cs-lampset">${lamp('PWR', 'is-on')}${link}${lamp('ALARM', critical(view) ? 'is-alarm' : '')}</span>${grille}`,
    tiles,
    tilesgrille: tiles + grille,
    min: '',
  }[bar];
  return `<div class="cs cs-deck deck-${style} bar-${bar} ${view.wide ? 'is-wide' : ''} ${fxClass(view)}">
    <div class="cs-screen"><div class="cs-scroll">${inner}</div><div class="cs-fx" aria-hidden="true"></div></div>
    <div class="cs-bar">
      ${bar === 'min' ? '' : `<div class="cs-instr">${instr}${powerKey(playing)}</div>`}
      <div class="cs-keyrow">${keys}${code}${bar === 'min' ? powerKey(playing) : ''}</div>
    </div>
  </div>`;
}

export function consoleScreen(view, screenFn) {
  if (view.shell === 'deck') return deckShell(view, screenFn);
  const inner = screenFn({ ...view, shell: null });
  if (view.shell === 'desk2') return desk2Shell(view, inner);
  if (view.shell === 'desk') return deskShell(view, inner);
  if (view.shell === 'dash') return dashShell(view, inner);
  return monitorShell(view, inner);
}
