// Screens as pure functions: (view) -> HTML string. Used by the game (app.js) and by mocks.html.
// view = { state, c (case), wide, remainingMs, dev }

import { CREW, PEOPLE, MOD_NAME, HATCH_NAME, HATCHES, MODULES, GRID, fmtTime } from './generator.js';
import { BRIEFING, BRIEFING_PARTS, BRIEFING_SENSORS_CALL, ENDINGS, ANSWERS, PROFILES, renderReport, questionText, solutionText } from './texts.js';
import { portrait } from './portraits.js';
import { consoleScreen } from './console.js';

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

// a line that starts with the prompt mark gets class "pl": when it wraps, the next lines start under its text
const log = (lines, cls = '') => `<div class="log ${cls}">${lines.map((l) => `<p${/^(&gt;|<span class="prompt">)/.test(l) ? ' class="pl"' : ''}>${l}</p>`).join('')}</div>`;

export function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function warningIcon() {
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
      <div class="idcard-photo">${portrait(p)}</div>
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
// After the group's printed crew cards (proposals, mocks only until one is chosen):
//   crew:     the report on a crew card: dark, cyan frame with cut corners; the text first, then who wrote it as on
//             the card (portrait, name, role, ID), with the card's PERSONNEL FILE line as the way to the profile
//   crewsign: today's light sheet, signed with a small crew card
//   crewtop:  the crew card first, as printed, then the text
//   crewwin:  no frame inside a frame: each report is a window of its own, titled REPORT 01, with the crew card
//             first and then the text; there is no CREW REPORTS window around them
function reportAlt(c, p, style, { open = null } = {}) {
  const P = PEOPLE[p];
  const n = String(c.order.indexOf(p) + 1).padStart(2, '0');
  const body = `<p class="rep-body ${P.human ? '' : 'is-machine'}">${esc(renderReport(c, p))}</p>`;
  // role, separator and ID never break apart: a line never ends up holding only "ID 55"
  const meta = `${esc(P.role.toUpperCase()).replace(/ /g, '&nbsp;')}&nbsp;·&nbsp;ID&nbsp;${P.id}`;
  const who = `<span class="rep-who"><b class="rep-name">${esc(P.name.toUpperCase())}</b><span class="rep-meta">${meta}</span></span>`;
  const prof = `type="button" data-act="profile" data-p="${p}" aria-label="Profile of ${esc(P.name)}"`;
  if (style === 'crew' || style === 'crewsign' || style === 'crewtop' || style === 'crewwin') {
    const id = `<button class="crew-id" ${prof}>
        <span class="crew-photo">${portrait(p)}</span>
        <span class="crew-who"><b class="crew-name">${esc(P.short.toUpperCase())}</b><span class="crew-role">${esc(P.role)}</span><span class="crew-chip">ID ${P.id}</span></span>
        <span class="crew-file">PERSONNEL FILE</span>
      </button>`;
    if (style === 'crewsign') return `<article class="rep rep-sheet"><div class="sheet-top">REPORT <b>${n}</b></div>${body}${id}</article>`;
    if (style === 'crewwin') {
      // a report is a small window that opens and closes (open: the list of the open ones; null = all open)
      const isOpen = !open || open.includes(p);
      const toggle = `<button type="button" class="rep-toggle" data-act="toggle-report" data-p="${p}" aria-expanded="${isOpen}" aria-label="${isOpen ? 'Close' : 'Open'} report ${n}">${isOpen ? '&minus;' : '+'}</button>`;
      if (isOpen) return win(`REPORT ${n}`, `${toggle}${id}${body}`, { cls: 'win-report rep' });
      return win(`REPORT ${n}`, `${toggle}<button type="button" class="crew-id is-compact" data-act="toggle-report" data-p="${p}" aria-label="Open report ${n}">
          <span class="crew-photo">${portrait(p)}</span>
          <span class="crew-who"><b class="crew-name">${esc(P.short.toUpperCase())}</b><span class="crew-role">${esc(P.role)}</span><span class="crew-chip">ID ${P.id}</span></span>
        </button>`, { cls: 'win-report rep is-closed' });
    }
    const top = `<div class="crew-top"><span>REPORT ${n}</span><i></i><span class="crew-dot"></span></div>`;
    return `<article class="rep rep-crew ${style === 'crewtop' ? 'is-top' : ''}">${top}${style === 'crewtop' ? id + body : body + id}</article>`;
  }
  if (style === 'lead') {
    return `<article class="rep rep-lead">
      <button class="rep-head" ${prof}><span class="rep-n">${n}</span><span class="rep-face">${portrait(p)}</span>${who}</button>
      ${body}
    </article>`;
  }
  if (style === 'sheet') {
    return `<article class="rep rep-sheet">
      <div class="sheet-top">REPORT <b>${n}</b></div>
      ${body}
      <button class="sheet-sign" ${prof}><span class="rep-face">${portrait(p)}</span>${who}</button>
    </article>`;
  }
  return `<article class="rep rep-tag">
    <button class="tag" ${prof}><span class="tag-photo">${portrait(p)}</span><span class="tag-name">${esc(P.short.toUpperCase())}</span></button>
    <div class="tag-main"><div class="rep-meta">REPORT&nbsp;<b>${n}</b> · ${meta}</div>${body}</div>
  </article>`;
}

const REPORT_HINT = {
  card: 'Tap a card for the profile.', lead: 'Tap a name for the profile.', sheet: 'Tap a signature for the profile.', tag: 'Tap a card for the profile.',
  crew: 'Tap a card for the profile.', crewsign: 'Tap a signature for the profile.', crewtop: 'Tap a card for the profile.',
  crewwin: 'Tap a card for the profile.',
};

// bare (proposal, mocks): no window around the reports; the cards stand on the screen under the title
export function reportsPanel(c, style = 'card', { bare = false, open = null } = {}) {
  const block = (p) => (style === 'card' ? reportBlock(c, p) : reportAlt(c, p, style, { open }));
  if (style === 'crewwin') return `<div class="reports-wins"><h2 class="win-title rw-title">CREW REPORTS</h2><p class="hint">${REPORT_HINT[style]}</p>${c.order.map(block).join('')}</div>`;
  return win('CREW REPORTS', `
    <p class="hint">${REPORT_HINT[style]}</p>
    <div class="reports reports-${style}">${c.order.map(block).join('')}</div>`, { cls: `win-reports ${bare ? 'win-bare' : ''}` });
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
// opts.detail: { interior, numbers, holo: 1 | 2 | 3 } (holo: hologram proposals, mocks only until one is chosen)
//   1 tilted hologram, 2 + walls in layers, 3 + projector beam and a slow sway
// opts.console: the Bridge console, a third sensor (calls); proposal A of the "calls" board, mocks only until chosen
export function mapSvg(sel, { act = 'map-sel', only = null, cls = '', detail = {}, console: withConsole = false } = {}) {
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
  const consoleEl = () => {
    const t = tap('console', 'console', 'Bridge console');
    return `<g class="console ${sel === 'console' ? 'is-sel' : ''} ${t === 'class-dim' ? 'is-dim' : ''}" ${t === 'class-dim' ? '' : t}>
      <rect x="150" y="48" width="22" height="14"/><rect x="153" y="51" width="16" height="8" class="console-screen"/><rect x="157" y="62" width="8" height="4" class="console-foot"/>
      <rect x="147" y="38" width="34" height="34" class="hit"/>
    </g>`;
  };
  const conn = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="conn"/>`;
  const hull = detail.interior ? '<rect x="4" y="6" width="352" height="258" class="d-hull"/>' : '';
  const deco = detail.interior ? `<g class="deco">${Object.values(DECO).join('')}</g>` : '';
  const nums = detail.numbers ? `<g class="nums">${HATCHES.map((h) => { const [x, y] = NUM_POS[h]; return `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" class="n-box"/><text x="${x}" y="${y + 3}" class="n-txt">${HATCH_NUM[h]}</text>`; }).join('')}</g>` : '';
  const svg = `<svg class="map ${cls} ${detail.interior ? 'map-interior' : ''}" viewBox="0 0 360 270" shape-rendering="crispEdges">
    ${hull}
    ${conn(112, 45, 140, 45)}${conn(190, 76, 190, 110)}${conn(112, 141, 140, 141)}${conn(240, 141, 268, 141)}${conn(190, 172, 190, 206)}
    ${['C', 'B', 'N', 'K', 'M', 'L'].map(room).join('')}
    ${deco}
    ${HATCHES.map(hatch).join('')}
    ${withConsole ? consoleEl() : ''}
    ${nums}
  </svg>`;
  if (!detail.holo) return svg;
  // hologram, second round (proposals, mocks): rooms as volumes of light (four walls that fade upwards and a rim),
  // names standing upright above each room so they read straight, a ring for the projector.
  //   4: the same view as today; 5: the model turned three quarters, like a scale model
  if (detail.holo >= 4) {
    const pc = (v, of) => `${(v / of * 100).toFixed(3)}%`;
    const box = (m) => {
      const [x, y, w, h] = ROOMS[m];
      return `<div class="h-box ${m === 'L' ? 'is-off' : ''} ${sel === m ? 'is-sel' : ''}" style="left:${pc(x, 360)};top:${pc(y, 270)};width:${pc(w, 360)};height:${pc(h, 270)}">
        <i class="h-w h-n"></i><i class="h-w h-s"></i><i class="h-w h-e"></i><i class="h-w h-wst"></i><i class="h-top"></i>
        <b class="h-label">${esc(MOD_NAME[m].toUpperCase())}${m === 'L' ? '<small>SENSORS OFFLINE</small>' : ''}</b>
      </div>`;
    };
    // detail.noproj: the same model without the ring and the beam of the projector (inside NOVA's conversation)
    return `<div class="holo holo-3 holo-x holo-${detail.holo} ${detail.noproj ? 'holo-noproj' : ''}">
      <div class="holo-stage">${svg}<div class="h-boxes" aria-hidden="true">${['C', 'B', 'N', 'K', 'M', 'L'].map(box).join('')}</div></div>
      ${detail.noproj ? '' : '<div class="holo-beam" aria-hidden="true"></div>'}
      <div class="holo-scan" aria-hidden="true"></div>
    </div>`;
  }
  // hologram: the same map, tilted in 3D; walls are outline copies raised in layers (not tappable)
  const wall = (z) => `<svg class="map holo-layer ${z === 30 ? 'holo-rim' : ''}" style="--z:${z}px" viewBox="0 0 360 270" shape-rendering="crispEdges" aria-hidden="true">
    ${['C', 'B', 'N', 'K', 'M', 'L'].map((m) => { const [x, y, w, h] = ROOMS[m]; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${m === 'L' ? 'is-off' : ''}"/>`; }).join('')}
  </svg>`;
  return `<div class="holo holo-${detail.holo}">
    <div class="holo-stage">${svg}${detail.holo >= 2 ? [6, 12, 18, 24, 30].map(wall).join('') : ''}</div>
    ${detail.holo >= 3 ? '<div class="holo-beam" aria-hidden="true"></div>' : ''}
    <div class="holo-scan" aria-hidden="true"></div>
  </div>`;
}

function mapInfo(sel) {
  if (!sel) return '> Tap a module or a hatch.';
  if (sel === 'console') return '> BRIDGE CONSOLE: logs calls with Mission Control, with the time.';
  if (sel === 'L') return '> LIFE SUPPORT: motion sensor offline. Disconnected by hand, from inside.';
  if (sel === 'L-K') return '> LIFE SUPPORT–CORRIDOR HATCH: log offline. Disconnected from inside Life Support.';
  if (HATCH_NAME[sel]) return `> ${HATCH_NAME[sel].toUpperCase()} HATCH: logs every opening, with the time. Never who opened it.`;
  return `> ${MOD_NAME[sel].toUpperCase()}: motion sensor online. Logs whether anything moved, never who.`;
}

// The place tapped, as a name and its sentences (the same words as mapInfo).
function mapInfoParts(sel) {
  const s = mapInfo(sel).slice(2);
  const i = s.indexOf(': ');
  const text = i < 0 ? s : s[i + 2].toUpperCase() + s.slice(i + 3);
  const kind = !sel ? '' : sel === 'L' || sel === 'L-K' ? 'off' : HATCH_NAME[sel] ? 'hatch' : sel === 'console' ? 'console' : 'sensor';
  return { name: i < 0 ? '' : s.slice(0, i), sentences: text.match(/[^.]+\./g) || [text], kind };
}

// detail.info (what stands under the map; proposals, mocks only until one is chosen; default: the legend and one line):
//   'card':    a small card: the sign of the legend, the name of the place, its sentences in the reading font
//   'readout': a terminal readout: the name on the prompt line, one sentence per line under it
//   'fields':  the readout in the words of a console: one line per reading, label and value (chosen layout
//              2026-11-25; the sentences were found unnatural, these wordings are a proposal)
const MAP_FIELDS = (sel) => (sel === 'L' ? [['Motion sensor', 'Offline'], ['Cause', 'Manual disconnection, inside the module']]
  : sel === 'L-K' ? [['Hatch log', 'Offline'], ['Cause', 'Manual disconnection, inside Life Support']]
    : HATCH_NAME[sel] ? [['Hatch log', 'Online'], ['Records', 'Each opening, with its time'], ['Identity', 'Not recorded']]
      : [['Motion sensor', 'Online'], ['Records', 'Movement, with its time'], ['Identity', 'Not recorded']]);
export function mapPanel(sel, { title = 'STATION MAP', detail = {}, console: withConsole = false } = {}) {
  // no legend with the console readout: Mission Control's own map wouldn't carry one, and the readout names
  // what is tapped (2026-11-25: «è poco realistico avere la legenda sulla mappa di mission control»)
  const legend = detail.info === 'fields' ? '' : `<div class="legend ${detail.info ? 'legend-row' : ''}"><span><i class="lg lg-hatch"></i>Hatch</span><span><i class="lg lg-sensor"></i>Motion sensor</span>${withConsole ? '<span><i class="lg lg-console"></i>Console</span>' : ''}<span><i class="lg lg-off"></i>Offline</span></div>`;
  const { name, sentences, kind } = mapInfoParts(sel);
  const info = detail.info === 'card'
    ? `<div class="minfo ${kind ? `minfo-${kind}` : ''}">${kind ? `<i class="lg lg-${kind}"></i>` : ''}<div>${name ? `<b class="minfo-name">${esc(name)}</b>` : ''}<p>${esc(sentences.join(' '))}</p></div></div>`
    : detail.info === 'fields'
      ? `<div class="log map-info mread ${kind === 'off' ? 'is-off' : ''}">${name ? `<p class="pl">&gt; <b>${esc(name)}</b></p><dl class="mfields">${MAP_FIELDS(sel).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : `<p class="pl">&gt; ${esc(sentences.join(' '))}</p>`}</div>`
    : detail.info === 'readout'
      ? `<div class="log map-info mread ${kind === 'off' ? 'is-off' : ''}">${name ? `<p class="pl">&gt; <b>${esc(name)}</b></p>${sentences.map((x) => `<p class="mread-s">${esc(x.trim())}</p>`).join('')}` : `<p class="pl">&gt; ${esc(sentences.join(' '))}</p>`}</div>`
      : log([esc(mapInfo(sel))], 'map-info');
  return win(title, `
    ${mapSvg(sel, { detail, console: withConsole })}
    ${detail.numbers ? hatchLegend() : ''}
    ${legend}
    ${info}`, { cls: 'win-map' });
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
const BPARTS = Object.fromEntries(BRIEFING_PARTS.map((p) => [p.id, p]));

// small visuals for the rules
const linkVisual = () => `<div class="viz viz-link"><span><i class="pip"></i>Q1</span><span><i class="pip"></i>Q2</span><span><i class="pip pip-code"></i>CODE</span></div>`;
const codeVisual = () => `<div class="viz viz-code"><span class="box">#</span><span class="box">#</span><span class="box">#</span>
  <span class="viz-cap"><b>REPORT</b> <b>ID</b></span></div>`;
const oxygenVisual = () => `<div class="viz viz-o2"><span class="o2">10:00</span><span class="meter">${'<i class="on"></i>'.repeat(20)}</span></div>`;
const sensorVisual = (calls) => () => `<div class="viz viz-sensors"><span><i class="lg lg-hatch"></i>HATCH OPENING</span><span><i class="lg lg-sensor"></i>MOTION</span>${calls ? '<span><i class="lg lg-console"></i>CONSOLE CALL</span>' : ''}</div>`;

const whoNova = `<span class="who who-nova">${novaIcon()}<b>NOVA</b><span>STATION AI</span></span>`;
const whoMc = `<span class="who who-mc"><b>MISSION CONTROL</b>${mcIcon()}</span>`;

// style (proposals, mocks only until one is chosen):
//   'now':  today, one log of eight lines
//   'tx':   a transmission: NOVA's messages, Mission Control answers with START MISSION
//   'file': a file from NOVA to Mission Control, one labelled row per rule
//   'mix':  NOVA tells what happened; the rules become four cards; Mission Control starts
//   'txmix' chosen 2026-11-23 (A + C): NOVA tells what happened in A's messages, the rules are C's cards,
//           no start button: the oxygen runs from NOVA's first message
// calls: the Bridge console call is in the game (the sensors sentence and card name it)
export function briefingPanel({ typed = true, style = 'now', start = false, calls = false } = {}) {
  const BP = calls ? { ...BPARTS, sensors: BRIEFING_SENSORS_CALL } : BPARTS;
  if (style === 'txmix') {
    const msg = (ids) => `<div class="msg msg-nova"><div class="bubble">${ids.map((id) => `<p>${keyed(BP[id])}</p>`).join('')}</div></div>`;
    const card = (title, id, viz) => `<div class="rule"><h3 class="sub">${title}</h3>${viz()}<p>${keyed(BP[id])}</p></div>`;
    return win('NOVA // BRIEFING', `
      <div class="tx">
        ${whoNova}
        <div class="tx-voice ${typed ? 'type-me' : ''}" data-type-key="briefing">${msg(['hello', 'situation'])}${msg(['saboteur', 'reports'])}</div>
      </div>
      <div class="rules">
        ${card('SENSORS', 'sensors', sensorVisual(calls))}${card('QUESTIONS', 'link', linkVisual)}
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
      <div class="log nova mix-voice ${typed ? 'type-me' : ''}">${['hello', 'situation', 'saboteur', 'reports'].map((id) => `<p class="pl">&gt; ${keyed(BP[id])}</p>`).join('')}</div>
      <div class="rules">
        ${card('SENSORS', 'sensors', sensorVisual(calls))}${card('QUESTIONS', 'link', linkVisual)}
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
// callUi (the Bridge console call, proposals of the "calls" board, mocks only until one is chosen; null = no calls):
//   'map':    the console is drawn on the Bridge and tapped like a hatch
//   'button': a CONSOLE CALL button under the map
//   'bridge': tapping the Bridge offers MOTION or CONSOLE CALL
// timeUi (how the time window is chosen; proposals, mocks only until one is chosen; default: two select menus):
//   'track': a time line from 02:00 to 03:00 with a mark every 5 minutes; the window is lit between its two ends
//   'step':  two displays, each with a minus and a plus key
//   'box':   today's two menus, drawn as console displays
//   'fixed10', 'fixed15': the time line with a window of fixed length (10 or 15 minutes) that is only moved
// The 10-minute window is decided (2026-11-24), the slider is not («non mi piace lo slider»). Other ways to move it:
//   'cells10':  the hour as twelve marks, like the oxygen bar; the two lit ones are the window
//   'step10':   one display with the window, between a minus and a plus key
//   'around10': the times a report can state, as keys; the window is the 5 minutes before and after
export function askPanel(state, c, where = 'chips', detail = {}, callUi = null, timeUi = 'select', askUi = null) {
  if (askUi) return askTerm(state, askUi, detail);
  const used = state.log.length;
  const left = MAX_QUESTIONS - used;
  const d = state.draft;
  const choices = d.kind === 'hatch' ? HATCHES.map((h) => [h, HATCH_NAME[h]]) : MODULES.map((m) => [m, MOD_NAME[m]]);
  const opt = (v, sel) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${fmtTime(v)}</option>`;
  const valid = d.b > d.a && Boolean(d.what);
  const q = { kind: d.kind, what: d.what, a: d.a, b: d.b };
  const isCall = d.kind === 'call';

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
  const mapSel = isCall && callUi === 'map' ? 'console' : isCall && callUi === 'button' ? null : d.what;
  const mapField = (only, hint) => `
    <div class="field"><span class="label">WHERE_</span>
      ${mapSvg(mapSel, { act: where === 'tap' ? 'draft-place' : 'draft-what', only, cls: 'map-pick', detail, console: callUi === 'map' })}
      ${detail.numbers ? hatchLegend() : ''}
      ${hint ? `<p class="hint map-hint">${hint}</p>` : ''}
    </div>`;
  const placeFields = {
    chips: () => kindField + chipsField,
    map: () => kindField + mapField(d.kind === 'hatch' ? 'hatch' : 'room'),
    both: () => kindField + mapField(d.kind === 'hatch' ? 'hatch' : 'room') + chipsField.replace('<span class="label">WHERE_</span>', ''),
    tap: () => {
      if (callUi === 'map') return mapField(null, 'Tap a hatch to ask if it opened, a module to ask about motion, or the Bridge console to ask about calls.');
      const base = mapField(null, callUi === 'bridge'
        ? 'Tap a hatch to ask if it opened, or a module to ask about motion. On the Bridge, you can also ask about calls.'
        : 'Tap a hatch to ask if it opened, or a module to ask about motion.');
      if (callUi === 'button') {
        return `${base}<div class="field call-pick"><button type="button" class="chip ${isCall ? 'is-on' : ''}" data-act="draft-call">BRIDGE CONSOLE CALL</button></div>`;
      }
      if (callUi === 'bridge' && d.what === 'B') {
        return `${base}<div class="field"><span class="label">SENSOR_</span><div class="seg">
          ${btn('MOTION', 'draft-sensor', { cls: !isCall ? 'is-on' : '', attrs: 'data-v="motion"' })}
          ${btn('CONSOLE CALL', 'draft-sensor', { cls: isCall ? 'is-on' : '', attrs: 'data-v="call"' })}
        </div></div>`;
      }
      return base;
    },
  }[where]();

  const selA = `<select data-field="a">${GRID.slice(0, -1).map((v) => opt(v, d.a)).join('')}</select>`;
  const selB = `<select data-field="b">${GRID.slice(1).map((v) => opt(v, d.b)).join('')}</select>`;
  const stepper = (label, f, v) => `<div class="ts-box"><span class="ts-l">${label}</span>
      <button type="button" class="ts-k" data-act="draft-step" data-f="${f}" data-d="-5" aria-label="${label}: 5 minutes earlier">&minus;</button>
      <b class="ts-v">${fmtTime(v)}</b>
      <button type="button" class="ts-k" data-act="draft-step" data-f="${f}" data-d="5" aria-label="${label}: 5 minutes later">+</button></div>`;
  const fixed = timeUi.startsWith('fixed') ? Number(timeUi.slice(5)) : 0;
  const fixedTrack = () => `<div class="field tt tt-fixed"><span class="label">TIME_</span>
      <div class="tt-read"><span class="ts-l">From</span><b>${fmtTime(d.a)}</b><span class="ts-l">To</span><b>${fmtTime(d.b)}</b><span class="tt-len">${fixed} MIN</span></div>
      <div class="tt-track" role="group" aria-label="Time window">${GRID.map((v) => `<button type="button" class="tt-tick ${v >= d.a && v <= d.b ? 'is-in' : ''} ${v === d.a ? 'is-a' : ''} ${v === d.b ? 'is-b' : ''}" data-act="draft-time" data-v="${v}" aria-label="${fmtTime(v)}"><i></i>${v % 15 === 0 ? `<span>${fmtTime(v)}</span>` : ''}</button>`).join('')}
        <span class="tt-win" style="left:${((d.a / 5 + 0.5) / 13 * 100).toFixed(3)}%;width:${((d.b - d.a) / 5 / 13 * 100).toFixed(3)}%" aria-hidden="true"><i></i></span></div>
      <p class="hint map-hint">Drag the window, or tap a time to move it there.</p>
    </div>`;
  const ten = {
    cells10: () => `<div class="field tc"><span class="label">TIME_</span>
      <div class="tt-read"><span class="ts-l">From</span><b>${fmtTime(d.a)}</b><span class="ts-l">To</span><b>${fmtTime(d.b)}</b><span class="tt-len">10 MIN</span></div>
      <div class="tc-cells" role="group" aria-label="Time window">${GRID.slice(0, -1).map((v) => `<button type="button" class="tc-cell ${v >= d.a && v < d.b ? 'is-on' : ''}" data-act="draft-time" data-v="${v}" aria-label="${fmtTime(v)}"><i></i></button>`).join('')}</div>
      <div class="tc-scale" aria-hidden="true">${[0, 15, 30, 45, 60].map((v) => `<span>${fmtTime(v)}</span>`).join('')}</div>
      <p class="hint map-hint">Tap a mark to move the window there.</p>
    </div>`,
    step10: () => `<div class="field field-time ts ts-one"><span class="label">TIME_</span>
      <div class="ts-box"><span class="ts-l">Window<span class="tt-len">10 MIN</span></span>
        <button type="button" class="ts-k" data-act="draft-step" data-d="-5" aria-label="5 minutes earlier">&minus;</button>
        <b class="ts-v">${fmtTime(d.a)}<i>&ndash;</i>${fmtTime(d.b)}</b>
        <button type="button" class="ts-k" data-act="draft-step" data-d="5" aria-label="5 minutes later">+</button></div>
    </div>`,
    around10: () => `<div class="field ta"><span class="label">TIME_</span>
      <div class="tt-read"><span class="ts-l">From</span><b>${fmtTime(d.a)}</b><span class="ts-l">To</span><b>${fmtTime(d.b)}</b><span class="tt-len">10 MIN</span></div>
      <div class="ta-keys" role="group" aria-label="Time window">${GRID.slice(1, -1).map((v) => `<button type="button" class="chip ${v === d.a + 5 ? 'is-on' : ''}" data-act="draft-time" data-v="${v}">${fmtTime(v)}</button>`).join('')}</div>
      <p class="hint map-hint">Tap a time: the question covers the 5 minutes before and after it.</p>
    </div>`,
  }[timeUi];
  const timeField = ten ? ten() : fixed ? fixedTrack() : {
    select: () => `<div class="field field-time"><span class="label">TIME_</span>
      <label>From ${selA}</label>
      <label>To ${selB}</label>
    </div>`,
    box: () => `<div class="field field-time tb"><span class="label">TIME_</span>
      <label class="tb-box"><span class="ts-l">From</span>${selA}</label>
      <label class="tb-box"><span class="ts-l">To</span>${selB}</label>
    </div>`,
    step: () => `<div class="field field-time ts"><span class="label">TIME_</span>${stepper('From', 'a', d.a)}${stepper('To', 'b', d.b)}</div>`,
    track: () => `<div class="field tt"><span class="label">TIME_</span>
      <div class="tt-read"><span class="ts-l">From</span><b>${fmtTime(d.a)}</b><span class="ts-l">To</span><b>${fmtTime(d.b)}</b></div>
      <div class="tt-track" role="group" aria-label="Time window">${GRID.map((v) => `<button type="button" class="tt-tick ${v >= d.a && v <= d.b ? 'is-in' : ''} ${v === d.a ? 'is-a' : ''} ${v === d.b ? 'is-b' : ''}" data-act="draft-time" data-v="${v}" aria-label="${fmtTime(v)}"><i></i>${v % 15 === 0 ? `<span>${fmtTime(v)}</span>` : ''}</button>`).join('')}</div>
      <p class="hint map-hint">Tap a time to move the nearest end of the window.</p>
    </div>`,
  }[timeUi]();

  const builder = left > 0 ? `
    ${placeFields}
    ${timeField}
    <div class="preview">&gt; ${!d.what ? (where === 'tap' ? 'Tap a hatch or a module.' : `Choose ${d.kind === 'hatch' ? 'a hatch' : 'a module'}.`) : d.b <= d.a ? 'The end of the window must come after the start.' : esc(questionText(q))}</div>
    <div class="actions">${btn(`SEND QUESTION`, 'send-question', { cls: 'btn-primary', disabled: !valid })}
      <span class="note">Uses 1 of ${MAX_QUESTIONS}. ${left} left.</span></div>`
    : log(['&gt; Link capacity reached. Only the emergency code can still be sent.'], 'nova');

  const history = state.log.length ? state.log.map((e, i) => `
      <div class="qa">
        <p class="q pl">&gt; Q${i + 1}: ${esc(questionText(e.q))}</p>
        <p class="a a-${e.ans} ${i === state.log.length - 1 ? 'type-me' : ''}" data-type-key="ans-${i}">NOVA: ${esc(ANSWERS[e.ans])}</p>
      </div>`).join('') : '<p class="muted pl">&gt; No questions sent yet.</p>';

  return win('NOVA ON KEPLER-9', `
    ${builder}
    <div class="sub">TRANSMISSION LOG</div>
    <div class="log qa-log">${history}</div>`, { cls: 'win-ask' });
}

// ASK NOVA as a chat in a terminal (proposals, mocks only until one is chosen). The window is always 10 minutes.
//   'cmd':  the station model, then one command line: the place tapped and the 10 minutes are its two slots
//   'chat': NOVA asks one thing at a time (state.askStep: 1 the place, 2 the 10 minutes, 3 send)
// After «non mi convince che mostra fin da subito la mappa, e mi chiede subito se voglio interagire, come se nova
// fosse ridotto a quello» (2026-11-25), the channel no longer opens on the map, and the map has no projector:
//   'open':   the channel is open and quiet; a question starts with a command (askStep 0), then as 'chat'
//   'thread': the same, with NOVA's own messages (the briefing) at the top: the whole conversation in one place
// intro (the console fills up, storyboard): { stage, c } with stage -1 NOVA's request, 0..7 the briefing line
// she is writing, 8 finished. Until she has finished there is nothing to send; the reports come as attachments.
function askTerm(state, mode, detail, intro = null) {
  const left = MAX_QUESTIONS - state.log.length;
  const d = state.draft;
  const opens = mode === 'open' || mode === 'thread';
  const step = state.askStep ?? (d.what ? 3 : opens ? 0 : 1);
  const q = { kind: d.kind, what: d.what, a: d.a, b: d.b };
  const row = (who, html, wide = '', cls = '') => `<div class="tl tl-${who} ${cls}"><span class="tl-who">${who === 'nova' ? 'NOVA' : 'MC'}</span><div class="tl-txt">${html}</div>${wide ? `<div class="tl-wide">${wide}</div>` : ''}</div>`;
  const past = state.log.map((e, i) => row('mc', esc(questionText(e.q)))
    + row('nova', `<span class="a a-${e.ans} ${i === state.log.length - 1 ? 'type-me' : ''}" data-type-key="ans-${i}">${esc(ANSWERS[e.ans])}</span>`)).join('');
  const place = d.what ? (HATCH_NAME[d.what] ? `${HATCH_NAME[d.what]} hatch` : MOD_NAME[d.what]) : '';
  const model = mapSvg(d.what, { act: 'draft-place', cls: 'map-pick', detail: opens ? { ...detail, noproj: true } : detail });
  const send = `<div class="actions">${btn('SEND QUESTION', 'send-question', { cls: 'btn-primary', disabled: !d.what })}<span class="note">Uses 1 of ${MAX_QUESTIONS}. ${left} left.</span></div>`;
  let briefing = mode === 'thread' ? ['hello', 'situation', 'saboteur', 'reports'].map((id) => row('nova', keyed(BPARTS[id]))).join('') : '';
  if (intro) {
    const n = Math.min(intro.stage, BRIEFING_PARTS.length - 1);
    // the reports she attaches are lines of text, as a terminal lists files, not boxes
    const files = `<div class="atts">${intro.c.order.map((p, i) => `<button type="button" class="att" data-act="tab" data-v="reports">+ REPORT ${String(i + 1).padStart(2, '0')} · ${esc(PEOPLE[p].short.toUpperCase())}</button>`).join('')}</div>`;
    briefing = BRIEFING_PARTS.slice(0, Math.max(0, n) + 1).map((part, i) => row('nova', `${keyed(part)}${i === n && intro.stage < 8 && intro.stage >= 0 ? '<span class="tl-cur"></span>' : ''}`, part.id === 'reports' ? files : '')).join('');
    if (intro.stage < 0) {
      // the request: her first line, then the words on the left and the button at the far right
      return win('NOVA ON KEPLER-9', `<div class="term">${briefing}
        <div class="tl-accept"><span class="hc-tag">INCOMING TRANSMISSION</span>${btn('ACCEPT', 'new-game', { cls: 'btn-primary' })}</div></div>`, { cls: 'win-ask win-term' });
    }
    if (intro.stage < 8) return win('NOVA ON KEPLER-9', `<div class="term">${briefing}</div>`, { cls: 'win-ask win-term' });
  }
  const quiet = row('nova', `The link will carry ${left} ${left === 1 ? 'question' : 'questions'} and the emergency code.`)
    + row('mc', '<span class="tl-cur"></span>', `<div class="actions">${btn('NEW QUESTION', 'ask-step', { cls: 'btn-primary', attrs: 'data-v="1"' })}</div>`, 'tl-draft');
  const hint = 'Tap a hatch to ask if it opened, or a module to ask about motion.';
  let live;
  if (left <= 0) live = row('nova', 'Link capacity reached. Only the emergency code can still be sent.');
  else if (mode === 'cmd') {
    const line = d.what
      ? esc(questionText(q)).replace(esc(place), (m) => `<b class="slot">${m}</b>`)
        .replace(`between ${fmtTime(d.a)} and ${fmtTime(d.b)}`, `between <span class="slot slot-time"><button type="button" data-act="draft-step" data-d="-5" aria-label="5 minutes earlier">&#9664;</button>${fmtTime(d.a)} and ${fmtTime(d.b)}<button type="button" data-act="draft-step" data-d="5" aria-label="5 minutes later">&#9654;</button></span>`)
      : 'Tap a hatch or a module.';
    live = row('nova', hint, model) + row('mc', `${line}<span class="tl-cur"></span>`, send, 'tl-draft');
  } else {
    const times = GRID.slice(0, -2).map((a) => `<button type="button" class="chip ${a === d.a ? 'is-on' : ''}" data-act="draft-time" data-v="${a}">${fmtTime(a)}&ndash;${fmtTime(a + 10)}</button>`).join('');
    const edit = (v, label) => `<button type="button" class="tl-edit" data-act="ask-step" data-v="${v}">${label}</button>`;
    live = step === 0 ? quiet : (opens ? row('mc', 'New question') : '') + row('nova', hint, step === 1 ? model : '')
      + (step > 1 ? row('mc', edit(1, esc(place))) + row('nova', 'Which 10 minutes?', step === 2 ? `<div class="tw-keys">${times}</div>` : '') : '')
      + (step > 2 ? row('mc', edit(2, `${fmtTime(d.a)}&ndash;${fmtTime(d.b)}`)) + row('mc', `${esc(questionText(q))}<span class="tl-cur"></span>`, send, 'tl-draft') : '');
  }
  return win('NOVA ON KEPLER-9', `<div class="term">${briefing}${past}${live}</div>`, { cls: 'win-ask win-term' });
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
      <div class="actions">${btn('SEND CODE', 'send-code', { cls: 'btn-primary', disabled: !ok })}<span class="note">One attempt.</span></div>
      ${v && !ok ? '<p class="note">The code has 3 digits.</p>' : ''}`;
  return win('EMERGENCY CODE', body, { cls: 'win-code', tone: state.confirming ? 'amber' : '' });
}

// ---------- screens ----------

// view.saved: { code, phase, remainingMs } of a saved game, offered on the home (reset A)
// view.homeStyle (proposals for the grey texts, mocks only until one is chosen):
//   'now' today; 'bright' brighter lines, cyan prompt; 'window' the lines in a NOVA status window; 'data' label/value pairs
export function screenHome(view = {}) {
  const s = view.saved;
  const style = view.homeStyle || 'now';
  const open = s && (s.phase === 'briefing' || s.phase === 'play');
  const oxygen = s && s.phase === 'play' ? `<span data-timer>${fmtClock(s.remainingMs)}</span>` : null;
  // [label for 'data', value for 'data', line for the log]
  const rows = [
    ['RECYCLER TEST_', 'In progress', 'Oxygen recycler test: in progress'],
    ['CREW ABOARD_', '4', 'Crew aboard: 4'],
    ...(!s ? [['STATUS_', 'Awaiting Mission Control', 'Awaiting Mission Control']]
      : open ? [[`CASE_`, `${esc(s.code)} · in progress`, `Case ${esc(s.code)}: in progress`], ...(oxygen ? [['OXYGEN_', oxygen, `Oxygen: ${oxygen}`]] : [])]
      : [['CASE_', `${esc(s.code)} · closed`, `Case ${esc(s.code)}: closed`]]),
  ];
  const lines = rows.map((r) => r[2]);
  if (style === 'console' || style === 'terminal' || style === 'plain') return consoleHome({ rows, lines, open, style });
  let info;
  if (style === 'bright') info = `<div class="log home-log home-log-bright">${lines.map((l) => `<p class="pl"><span class="prompt">&gt;</span> ${l}</p>`).join('')}</div>`;
  else if (style === 'window') info = `<div class="home-status">${win('NOVA // STATUS', `${whoNova}<div class="log nova home-status-log">${lines.map((l) => `<p class="pl"><span class="prompt">&gt;</span> ${l}</p>`).join('')}</div>`)}</div>`;
  else if (style === 'data') info = `<dl class="home-data">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>`;
  else info = log(lines.map((l) => `&gt; ${l}`), 'home-log');
  const top = style === 'now'
    ? '<div class="home-top"><span>NOVA // STATION AI</span><span>LINK: UNSTABLE</span></div>'
    : '<div class="home-top home-top-bright"><span><b>NOVA</b> // STATION AI</span><span>LINK: <b class="warn">UNSTABLE</b></span></div>';
  return `<main class="screen screen-home">
    ${top}
    <div class="home-title">
      <p class="kicker">MISSION CONTROL</p>
      <h1 class="title">KEPLER-9</h1>
      <p class="title-sub">SABOTAGE</p>
    </div>
    ${info}
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
      ${briefingPanel({ style, start: startInside, typed: !view.static, calls: Boolean(view.callUi) })}
      ${mapPanel(view.state.mapSel)}
    </div>
    ${startInside ? '' : `<div class="menu">${btn('START MISSION', 'start-mission', { cls: 'btn-primary' })}</div>`}
  </main>`;
}

// The home as the home of Mission Control's console, without the words of a game (proposals, mocks only until
// one is chosen): no SABOTAGE before NOVA has spoken, ANSWER for NEW GAME, RESUME for CONTINUE.
//   'plain':    today's home with only those changes
//   'console':  the station as a panel with its readings, and the incoming transmission to answer
//   'terminal': the same as the lines of a terminal
function consoleHome({ rows, lines, open, style }) {
  const resume = open ? btn('RESUME', 'continue', { cls: 'btn-primary' }) : '';
  const answer = btn('ANSWER', 'new-game', { cls: open ? '' : 'btn-primary' });
  const prompt = (l, cls = '') => `<p class="pl ${cls}"><span class="prompt">&gt;</span> ${l}</p>`;
  if (style === 'plain') {
    return `<main class="screen screen-home">
      <div class="home-top home-top-bright"><span><b>NOVA</b> // STATION AI</span><span>LINK: <b class="warn">UNSTABLE</b></span></div>
      <div class="home-title"><p class="kicker">MISSION CONTROL</p><h1 class="title">KEPLER-9</h1></div>
      <div class="home-status">${win('NOVA // STATUS', `${whoNova}<div class="log nova home-status-log">${lines.map((l) => prompt(l)).join('')}</div>`)}</div>
      <div class="menu">${resume}${answer}</div>
    </main>`;
  }
  const top = '<div class="home-top home-top-bright"><span><b>MISSION CONTROL</b></span><span>LINK: <b class="warn">UNSTABLE</b></span></div>';
  if (style === 'terminal') {
    return `<main class="screen screen-home home-terminal">
      ${top}
      <div class="log home-term">
        ${prompt('Station Kepler-9')}${lines.map((l) => prompt(l)).join('')}
        ${prompt('Incoming transmission: NOVA, station AI<span class="tl-cur"></span>', 'is-in')}
      </div>
      <div class="menu">${resume}${answer}</div>
    </main>`;
  }
  return `<main class="screen screen-home home-console">
    ${top}
    <section class="hc-panel">
      <h1 class="title hc-name">KEPLER-9</h1>
      <dl class="home-data">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>
      ${open ? `<div class="hc-act">${resume}</div>` : ''}
    </section>
    <section class="hc-call">
      <span class="hc-tag">INCOMING TRANSMISSION</span>
      ${whoNova}
      ${answer}
    </section>
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

const TABS = [['reports', 'REPORTS'], ['map', 'MAP'], ['ask', 'NOVA'], ['code', 'CODE'], ['briefing', 'BRIEFING']];

export function screenPlay(view) {
  const { state, c, wide } = view;
  let tab = state.tab;
  if (wide && tab === 'reports') tab = 'ask';
  const panel = {
    reports: () => reportsPanel(c, view.reportStyle || 'card', { bare: Boolean(view.reportsBare) }),
    map: () => mapPanel(state.mapSel, { detail: view.mapDetail || {}, console: view.callUi === 'map' }),
    ask: () => askPanel(state, c, view.askWhere, view.mapDetail || {}, view.callUi || null, view.timeUi || 'select', view.askUi || null),
    code: () => codePanel(state),
    briefing: () => briefingPanel({ typed: Boolean(view.briefTyped), style: view.briefStyle || 'now', calls: Boolean(view.callUi) }),
  }[tab]();
  const tabs = TABS.filter(([k]) => !(wide && k === 'reports'));
  const critical = view.remainingMs <= 60000;
  return `<main class="screen screen-play">
    ${statusBar(view)}
    ${critical ? `<div class="alarm-strip" role="alert">${warningIcon()}<span>OXYGEN CRITICAL // LESS&nbsp;THAN&nbsp;ONE&nbsp;MINUTE</span></div>` : ''}
    <div class="play ${wide ? 'play-wide' : ''}">
      ${wide ? `<div class="play-left">${reportsPanel(c, view.reportStyle || 'card', { bare: Boolean(view.reportsBare) })}</div>` : ''}
      <div class="play-right">
        ${view.noTabs ? '' : `<nav class="tabs">${tabs.map(([k, label]) => `<button type="button" class="tab ${k === tab ? 'is-on' : ''}" data-act="tab" data-v="${k}">${label}</button>`).join('')}</nav>`}
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
    ? state.log.map((e, i) => `<p class="pl">&gt; Q${i + 1}: ${esc(questionText(e.q))} <b>${esc(ANSWERS[e.ans].split('.')[0])}.</b></p>`).join('')
    : '<p class="pl">&gt; No questions sent.</p>';
  return `<main class="screen screen-solution">
    ${caseBar(c)}
    ${win(`CASE ${esc(c.code)} // SOLUTION`, `
      ${section('WHAT HAPPENED', ps(s.happened))}
      ${section('THE REPORTS', ps(s.reports))}
      ${section('ONE QUESTION THAT SETTLED IT', `<p class="mono pl">&gt; ${esc(s.question.text)}</p><p>${esc(s.question.answer)}</p>`)}
      ${section('THE CODE', `<p class="big-code">${esc(c.emergencyCode)}</p><p>${esc(s.code)}</p>`)}
      ${section('YOUR TRANSMISSIONS', `<div class="log">${asked}${state.sentCode ? `<p class="pl">&gt; Code: ${esc(state.sentCode)}</p>` : '<p class="pl">&gt; Code: not sent.</p>'}</div>`)}
      <div class="actions">${btn('NEW GAME', 'new-game', { cls: 'btn-primary' })}</div>
    `)}
  </main>`;
}

// The debrief questions are on the scoreboard sheet, not in NOVA (decided 2026-11-23).

// The console fills up after NOVA's transmission is accepted (storyboard, mocks only until approved).
// view.stage: -1 NOVA's request, waiting; 0..7 NOVA is writing that line of her briefing; 8 she has finished.
// Each thing appears when she says it: the case notes Mission Control takes, the reports she attaches, the
// station model, the questions the link will carry, the oxygen clock.
// Laptop: three columns, NOVA | the case (clock, questions, then notes, model or code) | the reports.
// Phone: the clock and the questions on top, one channel under them.
const NOTES = [
  ['situation', 'SITUATION_', '03:00 · Recycler sabotaged · Every module sealed'],
  ['saboteur', 'SABOTEUR_', 'Whoever was in Life Support'],
  ['reports', 'REPORTS_', '4 reports · One is false'],
  ['sensors', 'SENSORS_', 'Hatch openings · Motion · No names recorded'],
  // not the rule about refused questions: the player finds that out (2026-11-25)
  ['link', 'LINK_', 'Damaged · 2 questions · Emergency code'],
  ['code', 'CODE_', 'False report number + saboteur\'s ID · One attempt'],
  ['oxygen', 'OXYGEN_', '10 minutes'],
];
export function screenLive(view) {
  const { state, c, wide, remainingMs } = view;
  const stage = view.stage ?? 8;
  const at = (id) => BRIEFING_PARTS.findIndex((p) => p.id === id); // the line that brings each thing
  const has = (id) => stage >= at(id);
  const detail = view.mapDetail || {};
  const chat = askTerm(state, 'thread', detail, { stage, c });
  // at the start NOVA's terminal stands alone in the middle of the empty console
  if (stage < 0) return `<main class="screen screen-live live-request"><div class="live-col">${chat}</div></main>`;
  const leftQ = MAX_QUESTIONS - state.log.length;
  const on = Math.ceil(Math.max(0, remainingMs / OXYGEN_MS) * 20);
  const oxygen = has('oxygen') ? win('OXYGEN', `<div class="status-o2"><span class="timer" data-timer>${fmtClock(remainingMs)}</span>
      <span class="meter" data-meter>${Array.from({ length: 20 }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span></div>`, { cls: 'win-meter win-oxygen' }) : '';
  const questions = has('link') ? win('QUESTIONS', `<div class="status-link"><span class="pips">${Array.from({ length: MAX_QUESTIONS }, (_, i) => `<i class="${i < leftQ ? 'on' : ''}"></i>`).join('')}</span>
      <span class="status-num">${leftQ}/${MAX_QUESTIONS}</span></div>`, { cls: 'win-meter win-questions' }) : '';
  // the questions come first, so they stand on the left
  const meters = oxygen || questions ? `<div class="live-meters">${questions}${oxygen}</div>` : '';
  const notes = stage >= 1 ? win(`CASE ${esc(c.code)}`, `<dl class="notes">${NOTES.filter(([id]) => has(id)).map(([id, label, text]) => `<div><dt>${label}</dt><dd>${text}${at(id) === stage ? '<span class="tl-cur"></span>' : ''}</dd></div>`).join('')}</dl>`, { cls: 'win-notes' }) : '';
  const reports = has('reports') ? reportsPanel(c, view.reportStyle || 'crewtop', { bare: true, open: state.openReports || [] }) : '';
  const model = has('sensors') ? mapPanel(state.mapSel, { detail }) : '';
  const code = has('code') ? codePanel(state) : '';
  const tab = state.tab || 'ask';
  const modals = `${state.profile ? profileModal(c, state.profile) : ''}${view.quitOpen ? quitModal(c) : ''}`;
  const critical = remainingMs <= 60000 && has('oxygen') ? `<div class="alarm-strip" role="alert">${warningIcon()}<span>OXYGEN CRITICAL // LESS&nbsp;THAN&nbsp;ONE&nbsp;MINUTE</span></div>` : '';
  if (wide) {
    const mid = tab === 'map' && model ? model : tab === 'code' && code ? code : notes;
    // one column at first, in the middle; a second when the case opens, a third when the reports arrive
    const cols = 1 + (stage >= 1 ? 1 : 0) + (reports ? 1 : 0);
    return `<main class="screen screen-live live-wide live-cols-${cols}">${critical}
      <div class="live-col live-chat">${chat}</div>
      ${cols > 1 ? `<div class="live-col">${meters}${mid}</div>` : ''}
      ${reports ? `<div class="live-col">${reports}</div>` : ''}
      ${modals}</main>`;
  }
  const channel = { reports, map: model, code, briefing: notes, ask: chat }[tab] || chat;
  return `<main class="screen screen-live">${meters}${critical}${channel}${modals}</main>`;
}

export function screen(view) {
  if (view.shell) return consoleScreen(view, screen); // the whole app as Mission Control's console (proposals)
  if (view.flow === 'live') return screenLive(view);
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
