// Screens as pure functions: (view) -> HTML string. Used by the game (app.js) and by mocks.html.
// view = { state, c (case), wide, remainingMs, dev }

import { CREW, PEOPLE, MOD_NAME, HATCH_NAME, HATCHES, MODULES, GRID, fmtTime } from './generator.js';
import { BRIEFING, ENDINGS, ANSWERS, DEBRIEF, SCOREBOARD, PROFILES, renderReport, questionText, solutionText } from './texts.js';
import { portraitSvg } from './portraits.js';

export const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export const MAX_QUESTIONS = 2;
export const OXYGEN_MS = 10 * 60 * 1000;

// ---------- building blocks ----------

export function win(title, body, { cls = '', tone = '', id = '' } = {}) {
  return `<section class="win ${tone ? `win-${tone}` : ''} ${cls}" ${id ? `id="${id}"` : ''}>
    <header class="win-bar"><h2 class="win-title">${title}</h2>
      <span class="win-ctl" aria-hidden="true"><i class="ctl ctl-min"></i><i class="ctl ctl-max"></i><i class="ctl ctl-close"></i></span>
    </header>
    <div class="win-body">${body}</div>
  </section>`;
}

export const btn = (label, act, { cls = '', attrs = '', disabled = false } = {}) =>
  `<button type="button" class="btn ${cls}" data-act="${act}" ${attrs} ${disabled ? 'disabled' : ''}><span>${label}</span></button>`;

const log = (lines, cls = '') => `<div class="log ${cls}">${lines.map((l) => `<p>${l}</p>`).join('')}</div>`;

export function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function warningIcon() {
  // pixel warning triangle
  const rows = [
    '.......kk.......', '......kkkk......', '......k..k......', '.....kk..kk.....', '.....k.kk.k.....',
    '....kk.kk.kk....', '....k..kk..k....', '...kk..kk..kk...', '...k...kk...k...', '..kk........kk..',
    '..k....kk....k..', '.kk....kk....kk.', '.kkkkkkkkkkkkkk.',
  ];
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'k') r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; }));
  return `<svg class="warn-icon" viewBox="0 0 16 13" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

// ---------- crew ----------

export function crewCard(c, p, { asButton = true } = {}) {
  const P = PEOPLE[p];
  const num = c.order.indexOf(p) + 1;
  const tagName = asButton ? 'button' : 'div';
  const attrs = asButton ? `type="button" data-act="profile" data-p="${p}" aria-label="Profile of ${esc(P.name)}"` : '';
  return `<${tagName} class="idcard" ${attrs}>
    <div class="idcard-left">
      <div class="idcard-photo">${portraitSvg(p)}</div>
      <div class="idcard-name">${P.short.toUpperCase()}</div>
    </div>
    <div class="idcard-right">
      <div class="idcard-role"><span aria-hidden="true">{</span><span>${esc(P.role)}</span><span aria-hidden="true">}</span></div>
      <dl class="idcard-list">
        <div><dt>NAME_</dt><dd>${esc(P.name)}</dd></div>
        <div><dt>ROLE_</dt><dd>${esc(P.role)}</dd></div>
        <div><dt>ID_</dt><dd>${P.id}</dd></div>
      </dl>
      <div class="idcard-num">REPORT <b>${String(num).padStart(2, '0')}</b></div>
    </div>
  </${tagName}>`;
}

export function reportBlock(c, p) {
  const num = c.order.indexOf(p) + 1;
  const machine = !PEOPLE[p].human;
  return `<article class="report">
    ${crewCard(c, p)}
    <div class="report-text ${machine ? 'is-machine' : ''}"><span class="report-num">${num}.</span> ${esc(renderReport(c, p))}</div>
  </article>`;
}

export function reportsPanel(c) {
  return win('CREW REPORTS', `
    <p class="hint">Tap a card for the profile.</p>
    <div class="reports">${c.order.map((p) => reportBlock(c, p)).join('')}</div>`, { cls: 'win-reports' });
}

export function profileModal(c, p) {
  const P = PEOPLE[p];
  return `<div class="modal" data-act="close-modal">
    <div class="modal-inner" data-stop>
      ${win(`PROFILE // ${P.short.toUpperCase()}`, `
        ${crewCard(c, p, { asButton: false })}
        <div class="profile">${PROFILES[p].map((l) => `<p>${esc(l)}</p>`).join('')}</div>
        <div class="actions">${btn('CLOSE', 'close-modal')}</div>`)}
    </div>
  </div>`;
}

// ---------- map ----------

// Layout in a 360×270 box.
const ROOMS = {
  C: [12, 14, 100, 62], B: [140, 14, 100, 62], N: [12, 110, 100, 62], K: [140, 110, 100, 62],
  M: [268, 110, 80, 62], L: [140, 206, 100, 52],
};
const HATCH_POS = { 'C-B': [126, 45, 'h'], 'B-K': [190, 93, 'v'], 'N-K': [126, 141, 'h'], 'M-K': [254, 141, 'h'], 'L-K': [190, 189, 'v'] };

export function mapSvg(sel) {
  const room = (m) => {
    const [x, y, w, h] = ROOMS[m];
    const off = m === 'L';
    const isSel = sel === m;
    return `<g class="room ${off ? 'is-off' : ''} ${isSel ? 'is-sel' : ''}" data-act="map-sel" data-id="${m}" tabindex="0" role="button" aria-label="${MOD_NAME[m]}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}"/>
      <text x="${x + 6}" y="${y + 15}" class="room-name">${MOD_NAME[m].toUpperCase()}</text>
      ${off ? `<text x="${x + 6}" y="${y + 32}" class="room-off">SENSORS OFFLINE</text>`
        : `<g class="sensor"><rect x="${x + w - 14}" y="${y + h - 14}" width="8" height="8"/><rect x="${x + w - 12}" y="${y + h - 12}" width="4" height="4" class="sensor-core"/></g>`}
    </g>`;
  };
  const hatch = (h) => {
    const [x, y, o] = HATCH_POS[h];
    const off = h === 'L-K';
    const w = o === 'h' ? 28 : 12, hh = o === 'h' ? 12 : 28;
    return `<g class="hatch ${off ? 'is-off' : ''} ${sel === h ? 'is-sel' : ''}" data-act="map-sel" data-id="${h}" tabindex="0" role="button" aria-label="${HATCH_NAME[h]} hatch">
      <rect x="${x - w / 2}" y="${y - hh / 2}" width="${w}" height="${hh}"/>
      <rect x="${x - 2}" y="${y - 2}" width="4" height="4" class="hatch-core"/>
    </g>`;
  };
  const conn = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="conn"/>`;
  return `<svg class="map" viewBox="0 0 360 270" shape-rendering="crispEdges">
    ${conn(112, 45, 140, 45)}${conn(190, 76, 190, 110)}${conn(112, 141, 140, 141)}${conn(240, 141, 268, 141)}${conn(190, 172, 190, 206)}
    ${['C', 'B', 'N', 'K', 'M', 'L'].map(room).join('')}
    ${HATCHES.map(hatch).join('')}
  </svg>`;
}

function mapInfo(sel) {
  if (!sel) return '> Tap a module or a hatch.';
  if (sel === 'L') return '> LIFE SUPPORT: motion sensor offline. Disconnected by hand, from inside.';
  if (sel === 'L-K') return '> LIFE SUPPORT–CORRIDOR HATCH: log offline. Disconnected from inside Life Support.';
  if (HATCH_NAME[sel]) return `> ${HATCH_NAME[sel].toUpperCase()} HATCH: logs every opening, with the time. Never who opened it.`;
  return `> ${MOD_NAME[sel].toUpperCase()}: motion sensor online. Logs whether anything moved, never who.`;
}

export function mapPanel(sel, { title = 'STATION MAP' } = {}) {
  return win(title, `
    ${mapSvg(sel)}
    <div class="legend"><span><i class="lg lg-hatch"></i>Hatch</span><span><i class="lg lg-sensor"></i>Motion sensor</span><span><i class="lg lg-off"></i>Offline</span></div>
    ${log([esc(mapInfo(sel))], 'map-info')}`, { cls: 'win-map' });
}

// ---------- briefing ----------

export function briefingPanel({ typed = true } = {}) {
  return win('NOVA // BRIEFING', log(BRIEFING.map((l) => `&gt; ${esc(l)}`), typed ? 'nova type-me' : 'nova'), { cls: 'win-briefing' });
}

// ---------- ask NOVA ----------

export function askPanel(state, c) {
  const used = state.log.length;
  const left = MAX_QUESTIONS - used;
  const d = state.draft;
  const choices = d.kind === 'hatch' ? HATCHES.map((h) => [h, HATCH_NAME[h]]) : MODULES.map((m) => [m, MOD_NAME[m]]);
  const opt = (v, sel) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${fmtTime(v)}</option>`;
  const valid = d.b > d.a && Boolean(d.what);
  const q = { kind: d.kind, what: d.what, a: d.a, b: d.b };

  const builder = left > 0 ? `
    <div class="field"><span class="label">SENSOR_</span>
      <div class="seg">
        ${btn('HATCH OPENING', 'draft-kind', { cls: d.kind === 'hatch' ? 'is-on' : '', attrs: 'data-v="hatch"' })}
        ${btn('MOTION', 'draft-kind', { cls: d.kind === 'motion' ? 'is-on' : '', attrs: 'data-v="motion"' })}
      </div>
    </div>
    <div class="field"><span class="label">WHERE_</span>
      <div class="chips">${choices.map(([v, label]) => `<button type="button" class="chip ${v === d.what ? 'is-on' : ''} ${v === 'L' || v === 'L-K' ? 'is-off' : ''}" data-act="draft-what" data-v="${v}">${esc(label)}</button>`).join('')}</div>
    </div>
    <div class="field field-time"><span class="label">TIME_</span>
      <label>From <select data-field="a">${GRID.slice(0, -1).map((v) => opt(v, d.a)).join('')}</select></label>
      <label>To <select data-field="b">${GRID.slice(1).map((v) => opt(v, d.b)).join('')}</select></label>
    </div>
    <div class="preview">&gt; ${!d.what ? `Choose ${d.kind === 'hatch' ? 'a hatch' : 'a module'}.` : d.b <= d.a ? 'The end of the window must come after the start.' : esc(questionText(q))}</div>
    <div class="actions">${btn(`SEND QUESTION`, 'send-question', { cls: 'btn-primary', disabled: !valid })}
      <span class="note">Uses 1 of ${MAX_QUESTIONS}. ${left} left.</span></div>`
    : log(['&gt; Link capacity reached. Only the emergency code can still be sent.'], 'nova');

  const history = state.log.length ? state.log.map((e, i) => `
      <div class="qa">
        <p class="q">&gt; Q${i + 1}: ${esc(questionText(e.q))}</p>
        <p class="a a-${e.ans} ${i === state.log.length - 1 ? 'type-me' : ''}" data-type-key="ans-${i}">NOVA: ${esc(ANSWERS[e.ans])}</p>
      </div>`).join('') : '<p class="muted">&gt; No questions sent yet.</p>';

  return win('ASK NOVA', `
    ${builder}
    <div class="sub">TRANSMISSION LOG</div>
    <div class="log qa-log">${history}</div>`, { cls: 'win-ask' });
}

// ---------- emergency code ----------

export function codePanel(state) {
  const v = state.codeInput || '';
  const ok = /^\d{3}$/.test(v);
  const body = state.confirming && ok ? `
      <div class="confirm">
        <p class="big-code">${esc(v)}</p>
        <p>Send code <b>${esc(v)}</b>? There is only one attempt.</p>
        <div class="actions">${btn('CONFIRM', 'confirm-code', { cls: 'btn-danger' })}${btn('CANCEL', 'cancel-code')}</div>
      </div>` : `
      <p>The number of the false report, followed by the saboteur's ID.</p>
      <input class="code-input" data-field="code" inputmode="numeric" autocomplete="off" maxlength="3" pattern="[0-9]*" placeholder="___" value="${esc(v)}" aria-label="Emergency code">
      <div class="actions">${btn('SEND CODE (ONE ATTEMPT)', 'send-code', { cls: 'btn-primary', disabled: !ok })}</div>
      ${v && !ok ? '<p class="note">The code has 3 digits.</p>' : ''}`;
  return win('EMERGENCY CODE', body, { cls: 'win-code', tone: state.confirming ? 'amber' : '' });
}

// ---------- screens ----------

export function screenHome() {
  return `<main class="screen screen-home">
    <div class="home-top"><span>NOVA // STATION AI</span><span>LINK: UNSTABLE</span></div>
    <div class="home-title">
      <p class="kicker">MISSION CONTROL // NIGHT SHIFT</p>
      <h1 class="title">KEPLER-9</h1>
      <p class="title-sub">SABOTAGE</p>
    </div>
    ${log(['&gt; Oxygen recycler test: in progress', '&gt; Crew aboard: 4', '&gt; Awaiting Mission Control'], 'home-log')}
    <div class="menu">
      ${btn('NEW GAME', 'new-game', { cls: 'btn-primary' })}
    </div>
  </main>`;
}

export function screenBriefing(view) {
  const { c } = view;
  return `<main class="screen screen-briefing">
    ${caseBar(c)}
    <div class="brief-grid">
      ${briefingPanel()}
      ${mapPanel(view.state.mapSel)}
    </div>
    <div class="menu">${btn('START MISSION', 'start-mission', { cls: 'btn-primary' })}</div>
  </main>`;
}

const caseBar = (c) => `<div class="casebar"><span>NOVA // KEPLER-9</span><span class="case-no">CASE ${esc(c.code)}</span></div>`;

export function statusBar(view) {
  const { state, c, remainingMs } = view;
  const left = MAX_QUESTIONS - state.log.length;
  const frac = Math.max(0, remainingMs / OXYGEN_MS);
  const blocks = 20;
  const on = Math.ceil(frac * blocks);
  return `<div class="status">
    <div class="status-o2">
      <span class="label">OXYGEN</span>
      <span class="timer" data-timer>${fmtClock(remainingMs)}</span>
      <span class="meter" data-meter>${Array.from({ length: blocks }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span>
    </div>
    <div class="status-link">
      <span class="label">QUESTIONS</span>
      <span class="pips">${Array.from({ length: MAX_QUESTIONS }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span>
      <span class="status-num">${left}/${MAX_QUESTIONS}</span>
    </div>
    <div class="status-case">CASE ${esc(c.code)}</div>
  </div>`;
}

const TABS = [['reports', 'REPORTS'], ['map', 'MAP'], ['ask', 'ASK NOVA'], ['code', 'CODE'], ['briefing', 'BRIEFING']];

export function screenPlay(view) {
  const { state, c, wide } = view;
  let tab = state.tab;
  if (wide && tab === 'reports') tab = 'ask';
  const panel = {
    reports: () => reportsPanel(c),
    map: () => mapPanel(state.mapSel),
    ask: () => askPanel(state, c),
    code: () => codePanel(state),
    briefing: () => briefingPanel({ typed: false }),
  }[tab]();
  const tabs = TABS.filter(([k]) => !(wide && k === 'reports'));
  const critical = view.remainingMs <= 60000;
  return `<main class="screen screen-play">
    ${statusBar(view)}
    ${critical ? `<div class="alarm-strip" role="alert">${warningIcon()}<span>OXYGEN CRITICAL // LESS THAN ONE MINUTE</span></div>` : ''}
    <div class="play ${wide ? 'play-wide' : ''}">
      ${wide ? `<div class="play-left">${reportsPanel(c)}</div>` : ''}
      <div class="play-right">
        <nav class="tabs">${tabs.map(([k, label]) => `<button type="button" class="tab ${k === tab ? 'is-on' : ''}" data-act="tab" data-v="${k}">${label}</button>`).join('')}</nav>
        ${panel}
      </div>
    </div>
    ${state.profile ? profileModal(c, state.profile) : ''}
  </main>`;
}

export function screenEnding(view) {
  const { state } = view;
  const e = ENDINGS[state.ending];
  const red = state.ending !== 'right';
  const body = `
    <div class="ending-body">
      ${red ? warningIcon() : '<div class="ok-mark" aria-hidden="true"></div>'}
      <div>
        <p class="ending-head">${red ? 'SYSTEM FAILURE' : 'RECYCLER ONLINE'}</p>
        ${log(e.lines.map((l) => `&gt; ${esc(l)}`), 'nova type-me')}
        ${state.sentCode ? `<p class="muted">CODE SENT_ ${esc(state.sentCode)}</p>` : ''}
        <div class="actions">${btn('SEE WHAT HAPPENED', 'solution', { cls: red ? 'btn-danger' : 'btn-primary' })}</div>
      </div>
    </div>`;
  return `<main class="screen screen-ending ${red ? 'is-red' : 'is-ok'}">
    <div class="ending-top"><span>${red ? 'SYS.ERROR' : 'SYS.OK'}</span><span>CASE ${esc(view.c.code)}</span></div>
    <h1 class="ending-title">${e.title.toUpperCase()}</h1>
    ${win(red ? 'CRITICAL ERROR' : 'NOVA', body, { tone: red ? 'red' : '' })}
  </main>`;
}

export function screenSolution(view) {
  const { c, state } = view;
  const s = solutionText(c);
  const section = (h, html) => `<div class="sol-sec"><h3 class="sub">${h}</h3>${html}</div>`;
  const ps = (arr) => arr.map((l) => `<p>${esc(l)}</p>`).join('');
  const asked = state.log.length
    ? state.log.map((e, i) => `<p>&gt; Q${i + 1}: ${esc(questionText(e.q))} <b>${esc(ANSWERS[e.ans].split('.')[0])}.</b></p>`).join('')
    : '<p>&gt; No questions sent.</p>';
  return `<main class="screen screen-solution">
    ${caseBar(c)}
    ${win(`CASE ${esc(c.code)} // SOLUTION`, `
      ${section('WHAT HAPPENED', ps(s.happened))}
      ${section('THE REPORTS', ps(s.reports))}
      ${section('ONE QUESTION THAT SETTLED IT', `<p class="mono">&gt; ${esc(s.question.text)}</p><p>${esc(s.question.answer)}</p>`)}
      ${section('THE CODE', `<p class="big-code">${esc(c.emergencyCode)}</p><p>${esc(s.code)}</p>`)}
      ${section('YOUR TRANSMISSIONS', `<div class="log">${asked}${state.sentCode ? `<p>&gt; Code: ${esc(state.sentCode)}</p>` : '<p>&gt; Code: not sent.</p>'}</div>`)}
      <div class="actions">${btn('DEBRIEF', 'debrief', { cls: 'btn-primary' })}</div>
    `)}
  </main>`;
}

export function screenDebrief(view) {
  const { c } = view;
  return `<main class="screen screen-debrief">
    ${caseBar(c)}
    ${win('DEBRIEF', `
      <ol class="debrief">${DEBRIEF.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
      <p class="scoreboard">${esc(SCOREBOARD)}</p>
      <div class="actions">${btn('NEW GAME', 'new-game', { cls: 'btn-primary' })}</div>
    `)}
  </main>`;
}

export function screen(view) {
  const f = {
    home: screenHome, briefing: screenBriefing, play: screenPlay,
    ending: screenEnding, solution: screenSolution, debrief: screenDebrief,
  }[view.state.phase];
  return f(view);
}

export function newState() {
  return {
    v: 1, phase: 'home', code: null, tab: 'reports',
    draft: { kind: 'hatch', what: null, a: 0, b: 60 }, // no preselected place: the app never points anywhere
    log: [], codeInput: '', confirming: false, sentCode: null, ending: null,
    timer: { elapsed: 0, since: null, speed: 1 },
    profile: null, mapSel: null,
  };
}
