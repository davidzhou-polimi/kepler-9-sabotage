// Run: node --test   (or: npm test)
// Generates a few thousand seeded cases and checks the rules of the brief and of update 1 on each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREW, CODE_ALPHABET, HATCH_OF, QUESTIONS, generateCase, analyze, ask, answer, prng, randomCode, normalizeCode, solve,
  clashPairs, trapQuestions, fmtTime, GRID, QUESTION_WINDOW, STORIES, checkCode, PEOPLE,
} from '../js/generator.js';
import { renderReport, solutionText, codeFlagText, endingBeats, BRIEFING_PARTS } from '../js/texts.js';

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
  // knocked and nobody answered: whoever was in there had left at least 5 minutes before
  if (r.obs.type === 'knocked') return c.start[c.sab] === r.obs.mod && c.t <= r.obs.u - 5;
  // the second clue: the Life Support hatch, or footsteps in the Corridor, within a couple of minutes
  if (r.obs.type === 'ls') return w.hatches.some(([h, tt]) => h === 'L-K' && Math.abs(tt - r.obs.t) <= 2);
  if (r.obs.type === 'steps') return (w.occ.K || []).some(([s, e]) => s < r.obs.t + 2 && e > r.obs.t - 2);
  // saw them come through from the Cargo Bay: the saboteur, leaving the Cargo Bay then
  if (r.obs.type === 'saw') return r.obs.who === c.sab && c.start[c.sab] === 'C' && c.t === r.obs.t && r.mod === 'B';
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
    if (c.story !== 'seen') assert.notEqual(c.start[c.sab], 'C', c.code); // from the Cargo Bay only if seen
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
    assert.equal(acc.obs.type, { heard: 'heard', knock: 'knocked', seen: 'saw' }[c.story], c.code);
    if (c.story === 'seen') assert.equal(acc.obs.who, c.denier, c.code);
    else assert.equal(acc.obs.mod, c.start[c.denier], c.code);
    assert.equal(den.obs.type, 'quiet', c.code);
    // the accusation names a time; the denial names no hatch and no time of its own
    assert.ok(renderReport(c, c.accuser).includes(fmtTime(acc.obs.t ?? acc.obs.u)), c.code);
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

test('questions: every window is exactly QUESTION_WINDOW minutes long', () => {
  assert.ok(QUESTIONS.every((q) => q.b - q.a === QUESTION_WINDOW));
  assert.equal(QUESTIONS.filter((q) => q.kind === 'hatch' && q.what === 'N-K').length, GRID.length - QUESTION_WINDOW / 5);
});

test('stories: knocked and nobody answered, the window from the knock time on is a trap', () => {
  for (const c of cases.filter((x) => x.story === 'knock')) {
    const o = c.reports[c.accuser].obs;
    assert.ok(o.u + QUESTION_WINDOW <= 60, c.code);
    const q = { kind: 'hatch', what: HATCH_OF[o.mod], a: o.u, b: o.u + QUESTION_WINDOW };
    const { groups } = analyze(c);
    for (const s of c.suspects) for (const { world } of groups[s]) assert.equal(ask(world, q), 'no', c.code);
  }
});

test('second clue: in every case, told by someone who is not a suspect, true whichever suspect lies', () => {
  for (const c of cases) {
    const h = c.herring;
    if (c.visit) { assert.equal(h, undefined, c.code); continue; } // the visit is the second clue
    assert.ok(h, c.code);
    assert.ok(!c.suspects.includes(h.who), c.code);
    assert.equal(c.reports[h.who].obs.type, h.type, c.code);
    // NOVA can't answer about the Life Support hatch: asking it is a question spent
    if (h.type === 'ls') assert.equal(answer(c, { kind: 'hatch', what: 'L-K', a: h.t - 5, b: h.t + 5 }), 'refused', c.code);
  }
});

test('section 3: Bridge console call', () => {
  assert.equal(QUESTIONS.filter((q) => q.kind === 'call').length, GRID.length - QUESTION_WINDOW / 5); // every window, always on offer
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
    'story': withPct(count((c) => c.story)),
    'liar form by story': Object.fromEntries(STORIES.map((s) => {
      const mine = cases.filter((c) => c.story === s);
      return [s, withPct(count((c) => (c.accuser === c.sab ? 'accusing' : 'denying'), mine), mine.length)];
    })),
    'tone of the liar (over: explains too much)': withPct(count((c) => c.tone[c.sab])),
    'second clue': withPct(count((c) => (c.visit ? 'visit' : c.herring.type))),
    'second clue, footsteps: the Corridor window around it': (() => {
      const out = {};
      for (const c of cases.filter((x) => x.herring && x.herring.type === 'steps')) {
        const { groups } = analyze(c);
        const T = c.herring.t;
        for (const a of [T - 10, T - 5, T].filter((v) => v >= 0 && v + QUESTION_WINDOW <= 60)) {
          const q = { kind: 'motion', what: 'K', a, b: a + QUESTION_WINDOW };
          const ans = c.suspects.map((s) => [...new Set(groups[s].map(({ world }) => ask(world, q)))]);
          const v = ans.some((x) => x.length > 1) ? 'depends on the time' : ans[0][0] === ans[1][0] ? `same answer (${ans[0][0]})` : 'decides';
          out[v] = (out[v] || 0) + 1;
        }
      }
      const tot = Object.values(out).reduce((s, x) => s + x, 0);
      return withPct(out, tot);
    })(),
    'saboteur in the Cargo Bay': pct(cases.filter((c) => c.start[c.sab] === 'C').length, N),
    'innocent visit': pct(cases.filter((c) => c.visit).length, N),
    'Bridge console call': `${withCall.length} (${pct(withCall.length, N)}); claimed by one of the 2 suspects in ${callBySuspect.length}`,
    'average attempts per case': (cases.reduce((s, c) => s + c.attempts, 0) / N).toFixed(2),
  };
  console.log(JSON.stringify(report, null, 2));
  // rule 3: about 50/50
  assert.ok(Math.abs(accusing / N - 0.5) < 0.04, `liar accuses in ${pct(accusing, N)}`);
  // tone: the two suspects always differ, and the one who explains too much is the liar about half the time
  for (const c of cases) assert.notEqual(c.tone[c.suspects[0]], c.tone[c.suspects[1]], c.code);
  const overLies = cases.filter((c) => c.tone[c.sab] === 'over').length;
  assert.ok(Math.abs(overLies / N - 0.5) < 0.04, `the liar explains too much in ${pct(overLies, N)}`);
  // the three stories, a third each, and 50/50 within each
  for (const s of STORIES) {
    const mine = cases.filter((c) => c.story === s);
    assert.ok(Math.abs(mine.length / N - 1 / 3) < 0.04, `story ${s} off a third`);
    assert.ok(Math.abs(mine.filter((c) => c.accuser === c.sab).length / mine.length - 0.5) < 0.06, `story ${s}: liar accuses off 50%`);
  }
  // rule 5: each of the 4 about 25%
  for (const p of CREW) assert.ok(Math.abs(cases.filter((c) => c.sab === p).length / N - 0.25) < 0.04, `${p} saboteur off 25%`);
});

test('lockout code: NOVA flags a report number or ID that does not exist, or a report number that does not match the ID; the rest depends on the ID', () => {
  for (let i = 0; i < 300; i++) {
    const c = generateCase(randomCode(rand));
    assert.equal(checkCode(c, c.emergencyCode).right, true);
    assert.equal(checkCode(c, '299').flag, 'unknown');
    assert.equal(checkCode(c, '000').flag, 'unknown');
    c.order.forEach((p, k) => {
      const id = String(PEOPLE[p].id);
      assert.equal(checkCode(c, `${k + 1}${id}`).right, p === c.sab); // consistent: right only for the saboteur
      const other = (k + 1) % 4 + 1;
      const f = checkCode(c, `${other}${id}`);
      assert.equal(f.flag, 'inconsistent');
      assert.equal(codeFlagText(f), `CODE INCONSISTENT. Report ${other} was not written by crew ID ${id}.`);
      assert.equal(checkCode(c, `9${id}`).flag, 'unknown'); // there is no report 9
      assert.equal(checkCode(c, `0${id}`).flag, 'unknown');
    });
  }
});

test('update 3: NOVA says why she needs the code; the endings name the ID locked out; the solution says why, and who was locked out by mistake', () => {
  const ids = BRIEFING_PARTS.map((p) => p.id);
  assert.equal(ids.indexOf('lockout'), ids.indexOf('link') + 1);
  for (let i = 0; i < 300; i++) {
    const c = generateCase(randomCode(rand));
    const S = PEOPLE[c.sab].short;
    const [right] = endingBeats('right', c.emergencyCode);
    assert.ok(right.includes(`Access revoked: crew ID ${PEOPLE[c.sab].id}.`));
    const p = c.order.find((q) => q !== c.sab);
    const wrong = `${c.order.indexOf(p) + 1}${PEOPLE[p].id}`;
    const [w1, w2] = endingBeats('wrong', wrong);
    assert.ok(w1.includes(`Access revoked: crew ID ${PEOPLE[p].id}.`) && w2[0].startsWith('WARNING:'));
    const why = `Locking out ${S} was the only way to keep the recycler running.`;
    for (const sent of [null, c.emergencyCode]) {
      const h = solutionText(c, { sent }).happened;
      assert.ok(h.includes(why) && !h.some((l) => l.includes('by mistake')));
    }
    assert.ok(solutionText(c, { sent: wrong }).happened.includes(`${PEOPLE[p].short} was locked out by mistake.`));
  }
});
