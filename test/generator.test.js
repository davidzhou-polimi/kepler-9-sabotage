// Run: node --test   (or: npm test)
// Generates a few thousand seeded cases and checks the rules of the brief on each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREW, CODE_ALPHABET, HATCH_OF, generateCase, analyze, ask, answer, prng, randomCode, normalizeCode, solve,
} from '../js/generator.js';
import { renderReport, solutionText } from '../js/texts.js';

const N = Number(process.env.CASES || 3000);
const rand = prng('test-suite');
const codes = new Set();
while (codes.size < N) codes.add(randomCode(rand));
const cases = [...codes].map(generateCase);

/** Is this report true in the real world of the case? */
function isTrue(c, p) {
  const r = c.reports[p];
  const w = c.world;
  const moved = p === c.sab || (c.visit && c.visit.who === p);
  if (r.kind === 'moved') {
    return Boolean(c.visit) && c.visit.who === p && r.dst === c.visit.dst && r.u === c.visit.u;
  }
  if (moved) return false; // claims to have stayed
  if (r.mod !== c.start[p]) return false;
  if (r.obs.type === 'quiet') {
    // nobody came in or out of this module all night
    return !w.hatches.some(([h]) => h === HATCH_OF[r.mod]) && !(c.visit && c.visit.dst === r.mod);
  }
  if (r.obs.type === 'heard') return ask(w, { kind: 'hatch', what: HATCH_OF[r.obs.mod], a: r.obs.t, b: r.obs.t }) === 'yes';
  if (r.obs.type === 'visitor') return Boolean(c.visit) && c.visit.dst === r.mod && c.visit.who === r.obs.who && c.visit.u === r.obs.u;
  return false;
}

test('codes use the unambiguous alphabet and normalise', () => {
  assert.ok(![...'01OIL'].some((ch) => CODE_ALPHABET.includes(ch)));
  assert.equal(normalizeCode(' k9 4f7q '), 'K9-4F7Q');
  assert.equal(normalizeCode('4F7Q'), 'K9-4F7Q');
  assert.equal(normalizeCode('K9-4F0Q'), null);
});

test('same code, same case', () => {
  for (const c of cases.slice(0, 50)) {
    const again = generateCase(c.code);
    assert.deepEqual(JSON.parse(JSON.stringify(again)), JSON.parse(JSON.stringify(c)));
  }
});

test(`${N} cases: exactly one false report, saboteur is a suspect, solvable in 2 questions`, () => {
  for (const c of cases) {
    const lies = CREW.filter((p) => !isTrue(c, p));
    assert.deepEqual(lies, [c.sab], `${c.code}: false reports ${lies}`);
    assert.notEqual(c.start[c.sab], 'C', c.code);
    assert.equal(c.reports[c.sab].kind, 'stayed', c.code);

    const a = analyze(c);
    assert.deepEqual(a.suspects, c.suspects, c.code);
    assert.equal(c.suspects.length, 2, c.code);
    assert.ok(c.suspects.includes(c.sab), `${c.code}: saboteur not a suspect`);
    assert.ok(solve(a.groups, a.suspects, 2), `${c.code}: not solvable in 2 questions`);

    // the decisive question separates the two suspects, and the real world answers as the saboteur's worlds do
    const { q, answers } = c.decisive;
    assert.notEqual(answers[c.suspects[0]], answers[c.suspects[1]], c.code);
    assert.equal(answer(c, q), answers[c.sab], c.code);

    // code = report number + ID
    assert.match(c.emergencyCode, /^[1-4](14|27|55|71)$/);
  }
});

test('every case renders four reports and a solution without template leftovers', () => {
  for (const c of cases.slice(0, 500)) {
    for (const p of CREW) {
      const txt = renderReport(c, p);
      assert.ok(txt.length > 20, c.code);
      assert.doesNotMatch(txt, /\{|\}|undefined|null|NaN/, `${c.code} ${p}: ${txt}`);
    }
    const sol = solutionText(c);
    const flat = JSON.stringify(sol);
    assert.doesNotMatch(flat, /\{\w+\}|undefined|null|NaN/, `${c.code}: ${flat}`);
  }
});

test('no cue always points at the liar (stats)', () => {
  const pct = (x, n) => `${((100 * x) / n).toFixed(1)}%`;
  const by = (f) => cases.reduce((m, c) => ((m[f(c)] = (m[f(c)] || 0) + 1), m), {});
  const accusations = cases.filter((c) => c.style === 'accuser' || c.witness);
  const liarAccuses = accusations.filter((c) => c.style === 'accuser').length;
  const report = {
    'saboteur by crew': by((c) => c.sab),
    'saboteur report number': by((c) => c.order.indexOf(c.sab) + 1),
    'case shape': by((c) => `${c.style}${c.witness ? '+witness' : ''}${c.visit ? '+visit' : ''}`),
    'accusation made by the liar': `${liarAccuses}/${accusations.length} = ${pct(liarAccuses, accusations.length)}`,
    'average attempts per case': (cases.reduce((s, c) => s + c.attempts, 0) / N).toFixed(1),
  };
  console.log(JSON.stringify(report, null, 2));
  // whoever accuses must not always be the liar, and every crew member must be able to be the saboteur
  assert.ok(liarAccuses / accusations.length < 0.6 && liarAccuses / accusations.length > 0.4);
  for (const p of CREW) assert.ok((report['saboteur by crew'][p] || 0) / N > 0.1, `${p} rarely the saboteur`);
});
