// Screens as pure functions: (view) -> HTML string. Used by the game (app.js) and by mocks.html.
// view = { state, c (case), wide, remainingMs, dev }

import { CREW, PEOPLE, MOD_NAME, HATCH_NAME, HATCHES, MODULES, GRID, fmtTime } from './generator.js';
import { BRIEFING, BRIEFING_PARTS, ENDINGS, ANSWERS, PROFILES, renderReport, questionText, solutionText } from './texts.js';
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

// Report block proposals (mocks only until one is chosen): the report text leads, the data follows.
//   lead:  number, small portrait and name in one row above the text
//   sheet: the report as a light document; who wrote it comes after the text, as a signature
//   tag:   a small ID-card fragment (portrait + name bar) beside the text
function reportAlt(c, p, style) {
  const P = PEOPLE[p];
  const n = String(c.order.indexOf(p) + 1).padStart(2, '0');
  const body = `<p class="rep-body ${P.human ? '' : 'is-machine'}">${esc(renderReport(c, p))}</p>`;
  // role, separator and ID never break apart: a line never ends up holding only "ID 55"
  const meta = `${esc(P.role.toUpperCase()).replace(/ /g, '&nbsp;')}&nbsp;·&nbsp;ID&nbsp;${P.id}`;
  const who = `<span class="rep-who"><b class="rep-name">${esc(P.name.toUpperCase())}</b><span class="rep-meta">${meta}</span></span>`;
  const prof = `type="button" data-act="profile" data-p="${p}" aria-label="Profile of ${esc(P.name)}"`;
  if (style === 'lead') {
    return `<article class="rep rep-lead">
      <button class="rep-head" ${prof}><span class="rep-n">${n}</span><span class="rep-face">${portraitSvg(p)}</span>${who}</button>
      ${body}
    </article>`;
  }
  if (style === 'sheet') {
    return `<article class="rep rep-sheet">
      <div class="sheet-top">REPORT <b>${n}</b></div>
      ${body}
      <button class="sheet-sign" ${prof}><span class="rep-face">${portraitSvg(p)}</span>${who}</button>
    </article>`;
  }
  return `<article class="rep rep-tag">
    <button class="tag" ${prof}><span class="tag-photo">${portraitSvg(p)}</span><span class="tag-name">${esc(P.short.toUpperCase())}</span></button>
    <div class="tag-main"><div class="rep-meta">REPORT&nbsp;<b>${n}</b> · ${meta}</div>${body}</div>
  </article>`;
}

const REPORT_HINT = { card: 'Tap a card for the profile.', lead: 'Tap a name for the profile.', sheet: 'Tap a signature for the profile.', tag: 'Tap a card for the profile.' };

export function reportsPanel(c, style = 'card') {
  const block = (p) => (style === 'card' ? reportBlock(c, p) : reportAlt(c, p, style));
  return win('CREW REPORTS', `
    <p class="hint">${REPORT_HINT[style]}</p>
    <div class="reports reports-${style}">${c.order.map(block).join('')}</div>`, { cls: 'win-reports' });
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

// Map detail proposals (mocks only until one is chosen): interior objects and hull; numbered hatches.
const r = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${c}"/>`;
const DECO = {
  C: r(20, 52, 14, 14, 'd-crate') + r(35, 52, 14, 14, 'd-crate') + r(27, 38, 14, 13, 'd-crate') + r(52, 58, 10, 8, 'd-crate')
    + r(26, 58, 2, 2, 'd-dot') + r(41, 58, 2, 2, 'd-dot') + r(33, 43, 2, 2, 'd-dot'),
  B: r(170, 14, 40, 3, 'd-glass') + r(152, 44, 56, 7, 'd-obj') + [155, 167, 179, 191].map((x) => r(x, 45, 9, 3, 'd-screen')).join('')
    + r(162, 58, 8, 8, 'd-obj') + r(186, 58, 8, 8, 'd-obj'),
  N: r(20, 132, 16, 22, 'd-obj') + r(42, 132, 16, 22, 'd-obj') + r(20, 138, 16, 2, 'd-band') + r(42, 138, 16, 2, 'd-band')
    + r(20, 146, 16, 2, 'd-band') + r(42, 146, 16, 2, 'd-band') + r(36, 141, 6, 4, 'd-obj') + r(26, 126, 4, 6, 'd-obj')
    + r(64, 138, 12, 12, 'd-obj') + r(68, 142, 4, 4, 'd-screen'),
  K: [148, 158, 168, 178, 188, 198, 208].map((x) => r(x, 152, 4, 3, 'd-light')).join(''),
  M: r(274, 140, 36, 12, 'd-obj') + r(274, 140, 9, 12, 'd-soft') + r(324, 128, 4, 12, 'd-screen') + r(320, 132, 12, 4, 'd-screen')
    + r(290, 130, 14, 6, 'd-obj'),
  L: r(146, 243, 9, 12, 'd-obj') + r(158, 243, 9, 12, 'd-obj') + r(170, 243, 9, 12, 'd-obj')
    + r(146, 243, 9, 3, 'd-soft') + r(158, 243, 9, 3, 'd-soft') + r(170, 243, 9, 3, 'd-soft')
    + r(200, 242, 32, 12, 'd-broken') + `<line x1="202" y1="244" x2="230" y2="252" class="d-x"/><line x1="230" y1="244" x2="202" y2="252" class="d-x"/>`,
};
const HATCH_NUM = Object.fromEntries(HATCHES.map((h, i) => [h, i + 1]));
const NUM_POS = { 'C-B': [126, 31], 'B-K': [206, 93], 'N-K': [126, 127], 'M-K': [254, 127], 'L-K': [206, 189] };
export const hatchLegend = () => `<ol class="hatch-legend">${HATCHES.map((h) => `<li><b>${HATCH_NUM[h]}</b> ${HATCH_NAME[h]}</li>`).join('')}</ol>`;

// opts.act: action of a tap; opts.only: 'hatch' or 'room' keeps only those tappable (the others are dimmed)
// opts.detail: { interior, numbers }
export function mapSvg(sel, { act = 'map-sel', only = null, cls = '', detail = {} } = {}) {
  const tap = (kind, id, label) => (only && only !== kind ? 'class-dim' : `data-act="${act}" data-id="${id}" tabindex="0" role="button" aria-label="${label}"`);
  const room = (m) => {
    const [x, y, w, h] = ROOMS[m];
    const off = m === 'L';
    const isSel = sel === m;
    const t = tap('room', m, MOD_NAME[m]);
    return `<g class="room ${off ? 'is-off' : ''} ${isSel ? 'is-sel' : ''} ${t === 'class-dim' ? 'is-dim' : ''}" ${t === 'class-dim' ? '' : t}>
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
    const t = tap('hatch', h, `${HATCH_NAME[h]} hatch`);
    return `<g class="hatch ${off ? 'is-off' : ''} ${sel === h ? 'is-sel' : ''} ${t === 'class-dim' ? 'is-dim' : ''}" ${t === 'class-dim' ? '' : t}>
      <rect x="${x - w / 2}" y="${y - hh / 2}" width="${w}" height="${hh}"/>
      <rect x="${x - 2}" y="${y - 2}" width="4" height="4" class="hatch-core"/>
      <rect x="${x - 20}" y="${y - 20}" width="40" height="40" class="hit"/>
    </g>`;
  };
  const conn = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="conn"/>`;
  const hull = detail.interior ? '<rect x="4" y="6" width="352" height="258" class="d-hull"/>' : '';
  const deco = detail.interior ? `<g class="deco">${Object.values(DECO).join('')}</g>` : '';
  const nums = detail.numbers ? `<g class="nums">${HATCHES.map((h) => { const [x, y] = NUM_POS[h]; return `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" class="n-box"/><text x="${x}" y="${y + 3}" class="n-txt">${HATCH_NUM[h]}</text>`; }).join('')}</g>` : '';
  return `<svg class="map ${cls} ${detail.interior ? 'map-interior' : ''}" viewBox="0 0 360 270" shape-rendering="crispEdges">
    ${hull}
    ${conn(112, 45, 140, 45)}${conn(190, 76, 190, 110)}${conn(112, 141, 140, 141)}${conn(240, 141, 268, 141)}${conn(190, 172, 190, 206)}
    ${['C', 'B', 'N', 'K', 'M', 'L'].map(room).join('')}
    ${deco}
    ${HATCHES.map(hatch).join('')}
    ${nums}
  </svg>`;
}

function mapInfo(sel) {
  if (!sel) return '> Tap a module or a hatch.';
  if (sel === 'L') return '> LIFE SUPPORT: motion sensor offline. Disconnected by hand, from inside.';
  if (sel === 'L-K') return '> LIFE SUPPORT–CORRIDOR HATCH: log offline. Disconnected from inside Life Support.';
  if (HATCH_NAME[sel]) return `> ${HATCH_NAME[sel].toUpperCase()} HATCH: logs every opening, with the time. Never who opened it.`;
  return `> ${MOD_NAME[sel].toUpperCase()}: motion sensor online. Logs whether anything moved, never who.`;
}

export function mapPanel(sel, { title = 'STATION MAP', detail = {} } = {}) {
  return win(title, `
    ${mapSvg(sel, { detail })}
    ${detail.numbers ? hatchLegend() : ''}
    <div class="legend"><span><i class="lg lg-hatch"></i>Hatch</span><span><i class="lg lg-sensor"></i>Motion sensor</span><span><i class="lg lg-off"></i>Offline</span></div>
    ${log([esc(mapInfo(sel))], 'map-info')}`, { cls: 'win-map' });
}

// ---------- briefing ----------

// ---------- NOVA and Mission Control ----------

const pixels = (rows, fills, cls) => {
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (fills[ch]) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${fills[ch]}"/>`; }));
  return `<svg class="${cls}" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
};
// NOVA: the station's eye. Mission Control: a dish on Earth.
export const novaIcon = () => pixels([
  '....kkkk....', '..kk....kk..', '.k..cccc..k.', '.k.cc..cc.k.', 'k.cc.cc.cc.k', 'k.c.cccc.c.k',
  'k.c.cccc.c.k', 'k.cc.cc.cc.k', '.k.cc..cc.k.', '.k..cccc..k.', '..kk....kk..', '....kkkk....',
], { k: 'var(--star)', c: 'var(--cyan)' }, 'who-icon');
export const mcIcon = () => pixels([
  '.........aa.', '.......aa...', '..aaa.a.....', '.a...aa.....', 'a...a.a.....', 'a..a...a....',
  'a.a.....a...', '.a.......a..', '..a.....a...', '...aaaaa....', '.....a......', '...aaaaa....',
], { a: 'var(--amber)' }, 'who-icon');

const keyed = (part) => {
  let s = esc(part.text);
  for (const k of part.keys) s = s.replace(esc(k), `<b class="key">${esc(k)}</b>`);
  // "Kepler-9" never breaks at its hyphen, and the last two words of a part stay together
  return s.replace(/Kepler-9/g, '<span class="nw">Kepler-9</span>').replace(/ (\S+)$/, '&nbsp;$1');
};
const BP = Object.fromEntries(BRIEFING_PARTS.map((p) => [p.id, p]));

// small visuals for the rules
const linkVisual = () => `<div class="viz viz-link"><span><i class="pip"></i>Q1</span><span><i class="pip"></i>Q2</span><span><i class="pip pip-code"></i>CODE</span></div>`;
const codeVisual = () => `<div class="viz viz-code"><span class="box">#</span><span class="box">#</span><span class="box">#</span>
  <span class="viz-cap"><b>REPORT</b> <b>ID</b></span></div>`;
const oxygenVisual = () => `<div class="viz viz-o2"><span class="o2">10:00</span><span class="meter">${'<i class="on"></i>'.repeat(20)}</span></div>`;
const sensorVisual = () => `<div class="viz viz-sensors"><span><i class="lg lg-hatch"></i>HATCH OPENING</span><span><i class="lg lg-sensor"></i>MOTION</span></div>`;

const whoNova = `<span class="who who-nova">${novaIcon()}<b>NOVA</b><span>STATION AI</span></span>`;
const whoMc = `<span class="who who-mc"><b>MISSION CONTROL</b><span>NIGHT SHIFT</span>${mcIcon()}</span>`;

// style (proposals, mocks only until one is chosen):
//   'now':  today, one log of eight lines
//   'tx':   a transmission: NOVA's messages, Mission Control answers with START MISSION
//   'file': a file from NOVA to Mission Control, one labelled row per rule
//   'mix':  NOVA tells what happened; the rules become four cards; Mission Control starts
//   'txmix' chosen 2026-11-23 (A + C): NOVA tells what happened in A's messages, the rules are C's cards,
//           no start button: the oxygen runs from NOVA's first message
export function briefingPanel({ typed = true, style = 'now', start = false } = {}) {
  if (style === 'txmix') {
    const msg = (ids) => `<div class="msg msg-nova"><div class="bubble">${ids.map((id) => `<p>${keyed(BP[id])}</p>`).join('')}</div></div>`;
    const card = (title, id, viz) => `<div class="rule"><h3 class="sub">${title}</h3>${viz()}<p>${keyed(BP[id])}</p></div>`;
    return win('NOVA // BRIEFING', `
      <div class="tx">
        ${whoNova}
        <div class="tx-voice ${typed ? 'type-me' : ''}" data-type-key="briefing">${msg(['hello', 'situation'])}${msg(['saboteur', 'reports'])}</div>
      </div>
      <div class="rules">
        ${card('SENSORS', 'sensors', sensorVisual)}${card('QUESTIONS', 'link', linkVisual)}
        ${card('EMERGENCY CODE', 'code', codeVisual)}${card('OXYGEN', 'oxygen', oxygenVisual)}
      </div>`, { cls: 'win-briefing win-mix' });
  }
  if (style === 'tx') {
    const msg = (ids) => `<div class="msg msg-nova"><div class="bubble">${ids.map((id) => `<p>${keyed(BP[id])}</p>`).join('')}</div></div>`;
    return win('NOVA // BRIEFING', `
      <div class="tx">
        ${whoNova}
        ${msg(['hello', 'situation'])}${msg(['saboteur', 'reports'])}${msg(['sensors'])}${msg(['link'])}${msg(['code'])}${msg(['oxygen'])}
        ${start ? `<div class="msg msg-mc">${whoMc}<div class="bubble">${btn('START MISSION', 'start-mission', { cls: 'btn-primary' })}</div></div>` : ''}
      </div>`, { cls: 'win-briefing win-tx' });
  }
  if (style === 'file') {
    const rows = ['situation', 'saboteur', 'reports', 'sensors', 'link', 'code', 'oxygen'];
    const extra = { link: linkVisual, code: codeVisual, oxygen: oxygenVisual };
    return win('NOVA // BRIEFING', `
      <div class="file-head">${whoNova}<span class="file-to">TO_ ${whoMc}</span></div>
      <p class="file-hello">${keyed(BP.hello)}</p>
      <dl class="file-rows">${rows.map((id) => `<div><dt>${BP[id].label}</dt><dd><p>${keyed(BP[id])}</p>${extra[id] ? extra[id]() : ''}</dd></div>`).join('')}</dl>`,
    { cls: 'win-briefing win-file' });
  }
  if (style === 'mix') {
    const card = (title, id, viz) => `<div class="rule"><h3 class="sub">${title}</h3>${viz()}<p>${keyed(BP[id])}</p></div>`;
    return win('NOVA // BRIEFING', `
      ${whoNova}
      <div class="log nova mix-voice ${typed ? 'type-me' : ''}">${['hello', 'situation', 'saboteur', 'reports'].map((id) => `<p>&gt; ${keyed(BP[id])}</p>`).join('')}</div>
      <div class="rules">
        ${card('SENSORS', 'sensors', sensorVisual)}${card('QUESTIONS', 'link', linkVisual)}
        ${card('EMERGENCY CODE', 'code', codeVisual)}${card('OXYGEN', 'oxygen', oxygenVisual)}
      </div>
      ${start ? `<div class="mc-strip">${whoMc}${btn('START MISSION', 'start-mission', { cls: 'btn-primary' })}</div>` : ''}`,
    { cls: 'win-briefing win-mix' });
  }
  return win('NOVA // BRIEFING', log(BRIEFING.map((l) => `&gt; ${esc(l)}`), typed ? 'nova type-me' : 'nova'), { cls: 'win-briefing' });
}

// ---------- ask NOVA ----------

// where (proposals for asking from the map, mocks only until one is chosen):
//   'chips' today: sensor toggle + list of names
//   'map':  sensor toggle + map, only the places of that sensor tappable
//   'both': sensor toggle + map + list, kept in sync
//   'tap':  no toggle: tap a hatch to ask if it opened, a module to ask about motion
export function askPanel(state, c, where = 'chips', detail = {}) {
  const used = state.log.length;
  const left = MAX_QUESTIONS - used;
  const d = state.draft;
  const choices = d.kind === 'hatch' ? HATCHES.map((h) => [h, HATCH_NAME[h]]) : MODULES.map((m) => [m, MOD_NAME[m]]);
  const opt = (v, sel) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${fmtTime(v)}</option>`;
  const valid = d.b > d.a && Boolean(d.what);
  const q = { kind: d.kind, what: d.what, a: d.a, b: d.b };

  const kindField = `
    <div class="field"><span class="label">SENSOR_</span>
      <div class="seg">
        ${btn('HATCH OPENING', 'draft-kind', { cls: d.kind === 'hatch' ? 'is-on' : '', attrs: 'data-v="hatch"' })}
        ${btn('MOTION', 'draft-kind', { cls: d.kind === 'motion' ? 'is-on' : '', attrs: 'data-v="motion"' })}
      </div>
    </div>`;
  const chipsField = `
    <div class="field"><span class="label">WHERE_</span>
      <div class="chips">${choices.map(([v, label]) => `<button type="button" class="chip ${v === d.what ? 'is-on' : ''} ${v === 'L' || v === 'L-K' ? 'is-off' : ''}" data-act="draft-what" data-v="${v}">${esc(label)}</button>`).join('')}</div>
    </div>`;
  const mapField = (only, hint) => `
    <div class="field"><span class="label">WHERE_</span>
      ${mapSvg(d.what, { act: where === 'tap' ? 'draft-place' : 'draft-what', only, cls: 'map-pick', detail })}
      ${detail.numbers ? hatchLegend() : ''}
      ${hint ? `<p class="hint map-hint">${hint}</p>` : ''}
    </div>`;
  const placeFields = {
    chips: () => kindField + chipsField,
    map: () => kindField + mapField(d.kind === 'hatch' ? 'hatch' : 'room'),
    both: () => kindField + mapField(d.kind === 'hatch' ? 'hatch' : 'room') + chipsField.replace('<span class="label">WHERE_</span>', ''),
    tap: () => mapField(null, 'Tap a hatch to ask if it opened, or a module to ask about motion.'),
  }[where]();

  const builder = left > 0 ? `
    ${placeFields}
    <div class="field field-time"><span class="label">TIME_</span>
      <label>From <select data-field="a">${GRID.slice(0, -1).map((v) => opt(v, d.a)).join('')}</select></label>
      <label>To <select data-field="b">${GRID.slice(1).map((v) => opt(v, d.b)).join('')}</select></label>
    </div>
    <div class="preview">&gt; ${!d.what ? (where === 'tap' ? 'Tap a hatch or a module.' : `Choose ${d.kind === 'hatch' ? 'a hatch' : 'a module'}.`) : d.b <= d.a ? 'The end of the window must come after the start.' : esc(questionText(q))}</div>
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

// view.saved: { code, phase, remainingMs } of a saved game, offered on the home (reset A)
export function screenHome(view = {}) {
  const s = view.saved;
  const open = s && (s.phase === 'briefing' || s.phase === 'play');
  const caseLines = !s ? ['&gt; Awaiting Mission Control']
    : open ? [`&gt; Case ${esc(s.code)}: in progress`, ...(s.phase === 'play' ? [`&gt; Oxygen: <span data-timer>${fmtClock(s.remainingMs)}</span>`] : [])]
    : [`&gt; Case ${esc(s.code)}: closed`];
  return `<main class="screen screen-home">
    <div class="home-top"><span>NOVA // STATION AI</span><span>LINK: UNSTABLE</span></div>
    <div class="home-title">
      <p class="kicker">MISSION CONTROL // NIGHT SHIFT</p>
      <h1 class="title">KEPLER-9</h1>
      <p class="title-sub">SABOTAGE</p>
    </div>
    ${log(['&gt; Oxygen recycler test: in progress', '&gt; Crew aboard: 4', ...caseLines], 'home-log')}
    <div class="menu">
      ${open ? btn('CONTINUE', 'continue', { cls: 'btn-primary' }) : ''}
      ${btn('NEW GAME', 'new-game', { cls: open ? '' : 'btn-primary' })}
    </div>
  </main>`;
}

export function screenBriefing(view) {
  const { c } = view;
  const style = view.briefStyle || 'now';
  const startInside = style === 'tx' || style === 'mix'; // Mission Control starts the mission from inside the briefing
  return `<main class="screen screen-briefing">
    ${caseBar(c)}
    <div class="brief-grid">
      ${briefingPanel({ style, start: startInside, typed: !view.static })}
      ${mapPanel(view.state.mapSel)}
    </div>
    ${startInside ? '' : `<div class="menu">${btn('START MISSION', 'start-mission', { cls: 'btn-primary' })}</div>`}
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
    ${view.quit ? btn('QUIT', 'quit', { cls: 'btn-quit' }) : ''}
  </div>`;
}

// Reset B: QUIT in the status bar, with a confirmation inside the page.
export function quitModal(c) {
  return `<div class="modal" data-act="cancel-quit">
    <div class="modal-inner" data-stop>
      ${win('QUIT GAME', `
        <p>Case ${esc(c.code)} will be lost.</p>
        <div class="actions">${btn('QUIT', 'confirm-quit', { cls: 'btn-danger' })}${btn('CANCEL', 'cancel-quit')}</div>`, { tone: 'amber' })}
    </div>
  </div>`;
}

const TABS = [['reports', 'REPORTS'], ['map', 'MAP'], ['ask', 'ASK NOVA'], ['code', 'CODE'], ['briefing', 'BRIEFING']];

export function screenPlay(view) {
  const { state, c, wide } = view;
  let tab = state.tab;
  if (wide && tab === 'reports') tab = 'ask';
  const panel = {
    reports: () => reportsPanel(c, view.reportStyle || 'card'),
    map: () => mapPanel(state.mapSel, { detail: view.mapDetail || {} }),
    ask: () => askPanel(state, c, view.askWhere, view.mapDetail || {}),
    code: () => codePanel(state),
    briefing: () => briefingPanel({ typed: Boolean(view.briefTyped), style: view.briefStyle || 'now' }),
  }[tab]();
  const tabs = TABS.filter(([k]) => !(wide && k === 'reports'));
  const critical = view.remainingMs <= 60000;
  return `<main class="screen screen-play">
    ${statusBar(view)}
    ${critical ? `<div class="alarm-strip" role="alert">${warningIcon()}<span>OXYGEN CRITICAL // LESS&nbsp;THAN&nbsp;ONE&nbsp;MINUTE</span></div>` : ''}
    <div class="play ${wide ? 'play-wide' : ''}">
      ${wide ? `<div class="play-left">${reportsPanel(c, view.reportStyle || 'card')}</div>` : ''}
      <div class="play-right">
        <nav class="tabs">${tabs.map(([k, label]) => `<button type="button" class="tab ${k === tab ? 'is-on' : ''}" data-act="tab" data-v="${k}">${label}</button>`).join('')}</nav>
        ${panel}
      </div>
    </div>
    ${state.profile ? profileModal(c, state.profile) : ''}
    ${view.quitOpen ? quitModal(c) : ''}
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
      <div class="actions">${btn('NEW GAME', 'new-game', { cls: 'btn-primary' })}</div>
    `)}
  </main>`;
}

// The debrief questions are on the scoreboard sheet, not in NOVA (decided 2026-11-23).

export function screen(view) {
  const f = {
    home: screenHome, briefing: screenBriefing, play: screenPlay,
    ending: screenEnding, solution: screenSolution,
  }[view.state.phase] || screenHome;
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
