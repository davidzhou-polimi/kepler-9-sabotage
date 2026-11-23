// mocks.html: the real screens of the app, side by side in the 4 display-font candidates, on a fixed sample case.
import { generateCase } from './generator.js';
import { screen, newState, crewCard, profileModal } from './ui.js';
import { DISPLAY_FONTS } from './fonts.js';

const SAMPLE = 'K9-7UQ8';
const c = generateCase(SAMPLE);

const base = () => ({ ...newState(), code: SAMPLE });
const STATES = [
  { id: 'home', title: 'Home', state: { ...base(), phase: 'home' } },
  { id: 'briefing', title: 'Briefing', state: { ...base(), phase: 'briefing' } },
  { id: 'investigation', title: 'Investigation: reports', state: { ...base(), phase: 'play', tab: 'reports' }, remainingMs: 7 * 60000 + 42000 },
  {
    id: 'ask', title: 'Ask NOVA', remainingMs: 5 * 60000 + 13000,
    state: {
      ...base(), phase: 'play', tab: 'ask',
      draft: { kind: 'hatch', what: 'M-K', a: 45, b: 60 },
      log: [{ q: { kind: 'motion', what: 'K', a: 40, b: 55 }, ans: 'yes' }],
    },
  },
  { id: 'ending', title: 'Ending: wrong code', state: { ...base(), phase: 'ending', ending: 'wrong', sentCode: '255' }, red: true },
  { id: 'card', title: 'Crew card and profile', card: true },
];

function frame(s, font) {
  let html;
  if (s.card) {
    html = `<main class="screen mock-cardscreen"><div class="mock-card">${crewCard(c, 'mira', { asButton: false })}</div>${profileModal(c, 'echo')}</main>`;
  } else {
    html = screen({ state: s.state, c, wide: false, remainingMs: s.remainingMs ?? 10 * 60000, dev: false });
  }
  return `<div class="mock-frame ${s.red ? 'emergency' : ''}" data-font="${font.n}">${html}</div>`;
}

const root = document.getElementById('mocks');
root.innerHTML = `
  <div class="mock-head">
    <h1>NOVA // Display font candidates</h1>
    <p>Same screens, same sample case (${SAMPLE}), one column per font. Only the display font changes: texts stay in IBM Plex Sans, data in IBM Plex Mono. Each frame scrolls.</p>
  </div>
  <div class="mock-grid">
    <div class="mock-cols">${DISPLAY_FONTS.map((f) => `<div class="mock-col-head" data-font="${f.n}"><span>${f.n}</span> <b class="mock-fontname">${f.name}</b></div>`).join('')}</div>
    ${STATES.map((s) => `
      <section class="mock-row" id="${s.id}">
        <h2>${s.title}</h2>
        <div class="mock-cols">${DISPLAY_FONTS.map((f) => frame(s, f)).join('')}</div>
      </section>`).join('')}
  </div>`;
