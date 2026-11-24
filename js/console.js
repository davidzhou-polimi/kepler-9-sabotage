// Mission Control console: the whole web app as the console of Mission Control (proposals, mocks only until chosen).
// view.shell: 'monitor' the browser window is one console CRT; 'desk' the physical console (monitors + key panel);
//             'dash' the console software fills the screen, every panel visible at once on a laptop.
// view.fx: whole-screen video effects, a list: 'crt' (glass, always), 'boot' (power-on), 'static' (channel change),
//          'link' (NOVA's damaged link). In mocks a frame can be frozen on a moment with view.fxFreeze.
import { esc, fmtClock, statusBar, reportsPanel, mapPanel, askPanel, briefingPanel, codePanel, profileModal, quitModal, MAX_QUESTIONS, OXYGEN_MS } from './ui.js';

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

export function consoleScreen(view, screenFn) {
  const inner = screenFn({ ...view, shell: null });
  if (view.shell === 'desk') return deskShell(view, inner);
  if (view.shell === 'dash') return dashShell(view, inner);
  return monitorShell(view, inner);
}
