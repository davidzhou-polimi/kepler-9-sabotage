// Run: node --test   (or: npm test)
// Generates a few thousand seeded cases and checks the rules of the brief and of update 1 on each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREW, CODE_ALPHABET, HATCH_OF, QUESTIONS, generateCase, analyze, ask, answer, prng, randomCode, normalizeCode, solve,
  clashPairs, trapQuestions, fmtTime,
} from '../js/generator.js';
import { renderReport, solutionText } from '../js/texts.js';

const N = Number(process.env.CASES || 3000);
const rand = prng('test-suite');
const codes = new Set();
while (codes.size < N) codes.add(randomCode(rand));
// with the Bridge console call on (section 3), so every rule is checked with it too
const cases = [...codes].map((code) => generateCase(code, { calls: true }));

/** Is this report true in the real world of the case? */
function isTrue(c, p) {
  const r = c.reports[p];
  const w = c.world;
  if (r.call && !(c.call && c.call.a === r.call.a && c.call.b === r.call.b && c.start[p] === 'B')) return false;
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
    const again = generateCase(c.code, { calls: true });
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

test('rule 1: exactly 2 suspects, and they are the one pair of reports that can\'t both be true', () => {
  for (const c of cases) {
    assert.equal(c.suspects.length, 2, c.code);
    const pairs = clashPairs(c.start, c.reports);
    assert.equal(pairs.length, 1, `${c.code}: ${pairs.length} clashing pairs`);
    assert.deepEqual([...pairs[0]].sort(), [...c.suspects].sort(), c.code);
  }
});

test('rule 2: the pair is a precise accusation against a plain denial', () => {
  for (const c of cases) {
    const acc = c.reports[c.accuser], den = c.reports[c.denier];
    assert.equal(acc.obs.type, 'heard', c.code);
    assert.equal(acc.obs.mod, c.start[c.denier], c.code);
    assert.equal(den.obs.type, 'quiet', c.code);
    // the accusation names a time; the denial names no hatch and no time of its own
    assert.ok(renderReport(c, c.accuser).includes(fmtTime(acc.obs.t)), c.code);
    // (the whole shift, 02:00–03:00, and a Bridge call are not observations)
    const plain = renderReport(c, c.denier).replace(/From \d\d:\d\d to \d\d:\d\d|Time interval: [\d:–]+|02:00|03:00/g, '');
    assert.doesNotMatch(plain, /hatch|\d\d:\d\d/i, `${c.code}: ${plain}`);
  }
});

test('rule 4: a confirmation trap about each suspect (same answer whichever of the 2 is lying)', () => {
  for (const c of cases) {
    const { groups } = analyze(c);
    for (const p of c.suspects) {
      const trap = c.traps[p];
      assert.ok(trap, `${c.code}: no trap about ${p}`);
      assert.ok(trapQuestions(groups, c.suspects, c.start, p).some((x) => JSON.stringify(x.q) === JSON.stringify(trap.q)), c.code);
      for (const s of c.suspects) for (const { world } of groups[s]) assert.equal(ask(world, trap.q), trap.answer, c.code);
      assert.equal(answer(c, trap.q), trap.answer, c.code);
    }
  }
});

test('section 3: Bridge console call', () => {
  assert.equal(QUESTIONS.filter((q) => q.kind === 'call').length, 78); // every window, always on offer
  for (const c of cases) {
    for (const p of CREW) {
      const r = c.reports[p];
      if (!r.call) continue;
      assert.notEqual(p, c.sab, `${c.code}: the liar claims a call`);
      assert.equal(c.start[p], 'B', c.code);
    }
    for (const q of QUESTIONS.filter((x) => x.kind === 'call')) assert.match(answer(c, q), /^(yes|no)$/, c.code);
  }
  // the game has no call until the question builder is chosen
  for (const c of cases.slice(0, 300)) assert.equal(generateCase(c.code).call, null);
});

test('every case renders four reports and a solution, without leftovers or sensor data', () => {
  for (const c of cases) {
    for (const p of CREW) {
      const txt = renderReport(c, p);
      assert.ok(txt.length > 20, c.code);
      assert.doesNotMatch(txt, /\{|\}|undefined|null|NaN/, `${c.code} ${p}: ${txt}`);
      assert.doesNotMatch(txt, /DETECTED|motion|sensor|between \d|stayed (closed|shut|sealed)|ENTRIES|EXITS/i, `${c.code} ${p}: ${txt}`);
    }
    const sol = solutionText(c);
    const flat = JSON.stringify(sol);
    assert.doesNotMatch(flat, /\{\w+\}|undefined|null|NaN/, `${c.code}: ${flat}`);
  }
});

test('rules 3 and 5: who lies within the pair, and who the saboteur is, vary (stats)', () => {
  const pct = (x, n) => `${((100 * x) / n).toFixed(1)}%`;
  const count = (f, list = cases) => list.reduce((m, c) => ((m[f(c)] = (m[f(c)] || 0) + 1), m), {});
  const withPct = (o, n = N) => Object.fromEntries(Object.entries(o).sort().map(([k, v]) => [k, `${v} (${pct(v, n)})`]));
  const accusing = cases.filter((c) => c.accuser === c.sab).length;
  const withCall = cases.filter((c) => c.call);
  const callBySuspect = withCall.filter((c) => c.suspects.some((p) => c.reports[p].call));
  const report = {
    cases: N,
    'saboteur': withPct(count((c) => c.sab)),
    'liar form': withPct(count((c) => (c.accuser === c.sab ? 'accusing' : 'denying'))),
    'liar form by saboteur': Object.fromEntries(CREW.map((p) => {
      const mine = cases.filter((c) => c.sab === p);
      return [p, withPct(count((c) => (c.accuser === c.sab ? 'accusing' : 'denying'), mine), mine.length)];
    })),
    'saboteur report number': withPct(count((c) => c.order.indexOf(c.sab) + 1)),
    'innocent visit': pct(cases.filter((c) => c.visit).length, N),
    'Bridge console call': `${withCall.length} (${pct(withCall.length, N)}); claimed by one of the 2 suspects in ${callBySuspect.length}`,
    'average attempts per case': (cases.reduce((s, c) => s + c.attempts, 0) / N).toFixed(2),
  };
  console.log(JSON.stringify(report, null, 2));
  // rule 3: about 50/50
  assert.ok(Math.abs(accusing / N - 0.5) < 0.04, `liar accuses in ${pct(accusing, N)}`);
  // rule 5: each of the 4 about 25%
  for (const p of CREW) assert.ok(Math.abs(cases.filter((c) => c.sab === p).length / N - 0.25) < 0.04, `${p} saboteur off 25%`);
});
