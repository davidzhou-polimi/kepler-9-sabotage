// Renders every screen of the game on many cases and looks for what must never reach a player: a value that
// was not filled in, and a word of a game (the console is Mission Control's). No browser: the screens are functions
// from a view to a string of HTML.
//   node tools/render_check.mjs            300 cases
//   CASES=1000 node tools/render_check.mjs
import { generateCase, randomCode, answer, HATCHES, MODULES } from '../js/generator.js';
import { screen, newState } from '../js/ui.js';

const CASES = Number(process.env.CASES || 300);
const BAD = [/undefined/, /\bNaN\b/, /\[object /, /\$\{/, />null</];
// Words the console never says: it is Mission Control's console, not a game (2026-11-25: «noi avevamo detto che non ci
// devono essere riferimenti al game, perché è una console»; 2026-11-26, after NEW GAME was shown again in a board:
// «è VIETATO, cosa devo fare per farti capire che è la console di mission control»). Looked for in what a player
// reads or hears: the text of the screen and the labels read aloud, not the names inside the markup.
const FORBIDDEN = [/\bgames?\b/i, /\bplayers?\b/i, /\bplay again\b/i, /\bquit\b/i];
const spoken = (html) => `${html.replace(/<[^>]*>/g, ' ')} ${[...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]).join(' ')}`;
// the view of the game (js/app.js): the console that fills up after NOVA's request is accepted
const view = (state, c, extra = {}) => ({
  state, c, remainingMs: 6 * 60000, dev: false,
  shell: 'deck', deck: 'retro', fx: ['crt'], deckBar: 'leds', ledStyle: 'b', flow: 'live', flowHome: true,
  stage: state.phase === 'play' ? state.stage : -1,
  reportStyle: 'crewwin', askUi: 'thread', mapDetail: { holo: 4, info: 'fields' }, ...extra,
});

let n = 0;
const fails = [];
const check = (label, v) => {
  for (const wide of [true, false]) {
    let html;
    try { html = screen({ ...v, wide }); } catch (e) { fails.push(`${label} ${wide ? 'wide' : 'phone'}: ${e.message}`); continue; }
    n += 1;
    const bad = BAD.find((re) => re.test(html));
    if (bad) fails.push(`${label} ${wide ? 'wide' : 'phone'}: ${bad}`);
    const word = FORBIDDEN.find((re) => re.test(spoken(html)));
    if (word) fails.push(`${label} ${wide ? 'wide' : 'phone'}: a word the console never says, ${word}`);
  }
};

for (let i = 0; i < CASES; i += 1) {
  const code = randomCode();
  const c = generateCase(code);
  const base = () => ({ ...newState(), code, phase: 'play', tab: 'ask', stage: 8, askStep: 0, openReports: [], draft: { kind: 'hatch', what: null, a: null, b: null } });
  check(`${code} request`, view({ ...newState() }, null));
  check(`${code} request, case open`, view({ ...base(), phase: 'home' }, c, { saved: { code, phase: 'play', remainingMs: 432000 } }));
  for (let stage = 0; stage <= 8; stage += 1) {
    for (const tab of ['ask', 'reports', 'map', 'briefing', 'code']) check(`${code} stage ${stage} ${tab}`, view({ ...base(), stage, tab }, c));
  }
  // a question, step by step, on every place; then its answer in the conversation
  const places = [...HATCHES.map((h) => ['hatch', h]), ...MODULES.map((m) => ['motion', m])];
  const [kind, what] = places[i % places.length];
  const a = (i % 11) * 5;
  const q = { kind, what, a, b: a + 10 };
  check(`${code} ask 1`, view({ ...base(), askStep: 1 }, c));
  check(`${code} ask 2`, view({ ...base(), askStep: 2, draft: { kind, what, a: null, b: null } }, c));
  check(`${code} ask 3`, view({ ...base(), askStep: 3, draft: q }, c));
  const log = [{ q, ans: answer(c, q) }];
  check(`${code} answered`, view({ ...base(), log }, c));
  check(`${code} link full`, view({ ...base(), log: [...log, ...log] }, c));
  check(`${code} reports open`, view({ ...base(), tab: 'reports', openReports: [...c.order], mapSel: what }, c));
  check(`${code} profile`, view({ ...base(), profile: c.order[i % 4] }, c));
  check(`${code} quit`, view(base(), c, { quitOpen: true }));
  check(`${code} code typed`, view({ ...base(), tab: 'code', codeInput: c.emergencyCode, confirming: true }, c));
  check(`${code} last minute`, view(base(), c, { remainingMs: 42000 }));
  for (const ending of ['right', 'wrong', 'timeout']) check(`${code} ending ${ending}`, view({ ...base(), phase: 'ending', ending, sentCode: ending === 'timeout' ? null : '123', log }, c));
  check(`${code} solution`, view({ ...base(), phase: 'solution', log, sentCode: '123' }, c));
}

if (fails.length) {
  console.error(`${fails.length} screens with something left over or a forbidden word, of ${n}:`);
  fails.slice(0, 20).forEach((f) => console.error('  ' + f));
  process.exit(1);
}
console.log(`screens rendered without leftovers or forbidden words: ${n}`);
