// Kepler-9 case generator. Port of reference/gen.py, with the changes of the brief (section 5).
// Pure module: no DOM. Imported by the app, mocks.html and the tests (Node).
//
// Time is in minutes after 02:00 (0 = 02:00, 60 = 03:00).
// Modules: B Bridge, N Engine Room, M Medbay, C Cargo Bay, L Life Support, K Corridor.
// Hatches: B-K, N-K, M-K, L-K, C-B. They log when they open, never who opened them.

export const CREW = ['hana', 'doyun', 'mira', 'echo'];
export const PEOPLE = {
  hana: { name: 'Hana Sato', short: 'Hana', role: 'Captain', id: 14, human: true },
  doyun: { name: 'Doyun Park', short: 'Doyun', role: 'Engineer', id: 27, human: true },
  mira: { name: 'Mira Costa', short: 'Mira', role: 'Medical Officer', id: 55, human: true },
  echo: { name: 'ECHO-7', short: 'ECHO-7', role: 'Maintenance android', id: 71, human: false },
};
export const START_MODS = ['B', 'N', 'M', 'C'];
export const MODULES = ['B', 'N', 'M', 'C', 'K', 'L'];
export const MOD_NAME = { B: 'Bridge', N: 'Engine Room', M: 'Medbay', C: 'Cargo Bay', L: 'Life Support', K: 'Corridor' };
export const HATCHES = ['B-K', 'N-K', 'M-K', 'L-K', 'C-B'];
export const HATCH_NAME = {
  'B-K': 'Bridge–Corridor', 'N-K': 'Engine Room–Corridor', 'M-K': 'Medbay–Corridor',
  'L-K': 'Life Support–Corridor', 'C-B': 'Cargo Bay–Bridge',
};
export const HATCH_OF = { B: 'B-K', N: 'N-K', M: 'M-K', L: 'L-K' };
export const LEAVE_TIMES = [40, 45, 50, 55];
export const VISIT_TIMES = [20, 25, 30, 35];
export const GRID = Array.from({ length: 13 }, (_, i) => i * 5);

// ---------- seeds ----------

// Unambiguous alphabet: no 0/O, 1/I/L.
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function randomCode(rand = Math.random) {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return `K9-${s}`;
}

/** Accepts "K9-4F7Q", "4f7q", " k9 4F7Q ". Returns the canonical code or null. */
export function normalizeCode(input) {
  const s = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^K9/, '');
  if (s.length !== 4 || [...s].some((c) => !CODE_ALPHABET.includes(c))) return null;
  return `K9-${s}`;
}

function hashString(str) {
  // cyrb53-style 32-bit mix
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

export function prng(seedStr) {
  let a = hashString(seedStr);
  return function mulberry32() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
function shuffle(rand, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- world model ----------

/** Hatch events and transit spans for moving src -> dst starting at minute t. */
export function pathHatches(src, dst, t) {
  const ev = [], transit = [];
  if (src === 'C') {
    ev.push(['C-B', t]); transit.push(['B', t, t + 1]); t += 1;
    src = 'B';
    if (dst === 'B') return { ev, transit };
  }
  ev.push([HATCH_OF[src], t]); transit.push(['K', t, t + 1]);
  ev.push([dst !== 'C' ? HATCH_OF[dst] : 'B-K', t + 1]);
  if (dst === 'C') { transit.push(['B', t + 1, t + 2]); ev.push(['C-B', t + 2]); }
  return { ev, transit };
}

/** Does a move from src to dst cross a module other than the two ends (always occupied: B)? */
export function crossesBridge(src, dst) {
  return (src === 'C' && dst !== 'B') || (dst === 'C' && src !== 'B');
}

/** One concrete world: hatch events and motion spans per module. */
export function buildWorld(start, sab, t, visit) {
  const hatches = [];
  const occ = {};
  const add = (m, a, b) => (occ[m] ||= []).push([a, b]);
  for (const p of CREW) {
    const m = start[p];
    if (p === sab) {
      add(m, 0, t);
      const { ev, transit } = pathHatches(m, 'L', t);
      hatches.push(...ev);
      for (const [mod, a, b] of transit) add(mod, a, b);
    } else if (visit && p === visit.who) {
      add(m, 0, visit.u);
      const { ev, transit } = pathHatches(m, visit.dst, visit.u);
      hatches.push(...ev);
      for (const [mod, a, b] of transit) add(mod, a, b);
      add(visit.dst, visit.u + 1, 60);
    } else {
      add(m, 0, 60);
    }
  }
  return { hatches, occ };
}

/** q = { kind: 'hatch'|'motion', what: hatch or module, a, b } -> 'yes' | 'no' | 'refused' */
export function ask(world, q) {
  const { kind, what, a, b } = q;
  if (kind === 'hatch') {
    if (what === 'L-K') return 'refused';
    return world.hatches.some(([h, tt]) => h === what && a <= tt && tt <= b) ? 'yes' : 'no';
  }
  if (what === 'L') return 'refused';
  return (world.occ[what] || []).some(([s, e]) => s < b && e > a) ? 'yes' : 'no';
}

export const QUESTIONS = [];
for (let i = 0; i < GRID.length; i++) {
  for (let j = i + 1; j < GRID.length; j++) {
    const a = GRID[i], b = GRID[j];
    for (const h of HATCHES) QUESTIONS.push({ kind: 'hatch', what: h, a, b });
    for (const m of MODULES) QUESTIONS.push({ kind: 'motion', what: m, a, b });
  }
}

// ---------- reports ----------
// Report shapes:
//   { kind: 'stayed', mod, obs: { type: 'quiet' } }
//   { kind: 'stayed', mod, obs: { type: 'heard', mod: X, t } }       (X's corridor hatch, around t)
//   { kind: 'stayed', mod, obs: { type: 'visitor', who, u } }
//   { kind: 'moved', mod, dst, u, host }

export function buildReports(spec) {
  const { start, sab, style, accuse, visit, witness } = spec;
  const occupantOf = (m) => CREW.find((p) => start[p] === m);
  const r = {};
  for (const p of CREW) {
    const m = start[p];
    if (visit && p === visit.who) {
      r[p] = { kind: 'moved', mod: m, dst: visit.dst, u: visit.u, host: occupantOf(visit.dst) };
    } else if (p === sab) {
      r[p] = { kind: 'stayed', mod: m, obs: style === 'accuser' ? { type: 'heard', mod: accuse.mod, t: accuse.t } : { type: 'quiet' } };
    } else if (witness && p === witness.who) {
      r[p] = { kind: 'stayed', mod: m, obs: { type: 'heard', mod: witness.mod, t: witness.t } };
    } else if (visit && visit.dst === m) {
      r[p] = { kind: 'stayed', mod: m, obs: { type: 'visitor', who: visit.who, u: visit.u } };
    } else {
      r[p] = { kind: 'stayed', mod: m, obs: { type: 'quiet' } };
    }
  }
  return r;
}

// ---------- deduction ----------

/**
 * Why `liar` cannot be the liar, from the reports alone (players know the claimed modules).
 * Returns null if the hypothesis survives these checks.
 */
export function exclusionReason(start, rep, liar) {
  if (start[liar] === 'C') return { type: 'cargo' }; // would have crossed an occupied Bridge
  if (rep[liar].kind === 'moved') return { type: 'moved' }; // only a "stayed" report can hide the trip
  // Change from gen.py: whoever had a visitor had company when they would have left (visits end before
  // anyone leaves): the honest visitor would have seen them go. Same reasoning as the Cargo Bay rule.
  const guest = CREW.find((p) => p !== liar && rep[p].kind === 'moved' && rep[p].dst === start[liar]);
  if (guest) return { type: 'hosted', guest };
  for (const p of CREW) {
    if (p === liar) continue;
    const r = rep[p];
    if (r.kind === 'stayed' && r.obs.type === 'heard') {
      const occupants = CREW.filter((q) => start[q] === r.obs.mod);
      if (!occupants.length) return { type: 'contradiction', a: p };
      for (const q of occupants) {
        if (q !== liar && rep[q].kind === 'stayed' && rep[q].obs.type === 'quiet') return { type: 'contradiction', a: p, b: q };
      }
    }
  }
  return null;
}

/** Worlds consistent with: liar's report is false (liar went to Life Support), all others true. */
export function candidateWorlds(start, rep, liar, visit) {
  if (exclusionReason(start, rep, liar)) return [];
  const worlds = [];
  for (const t of LEAVE_TIMES) {
    const w = buildWorld(start, liar, t, visit);
    // every honest accusation must match a real hatch event at that hatch and time
    const ok = CREW.every((p) => {
      if (p === liar) return true;
      const r = rep[p];
      if (r.kind !== 'stayed' || r.obs.type !== 'heard') return true;
      return ask(w, { kind: 'hatch', what: HATCH_OF[r.obs.mod], a: r.obs.t, b: r.obs.t }) === 'yes';
    });
    if (ok) worlds.push({ t, world: w });
  }
  return worlds;
}

/** Answer of a question for a suspect if it is the same in all their worlds, else null. */
function determinate(group, q) {
  let ans = null;
  for (const { world } of group) {
    const x = ask(world, q);
    if (ans === null) ans = x;
    else if (ans !== x) return null;
  }
  return ans;
}

/** Can `depth` adaptive questions always single out the liar among `suspects`? Returns a first question or false. */
export function solve(groups, suspects, depth = 2) {
  if (suspects.length === 1) return true;
  if (depth === 0) return false;
  for (const q of QUESTIONS) {
    const buckets = {};
    let ok = true;
    for (const s of suspects) {
      const ans = determinate(groups[s], q);
      if (ans === null) { ok = false; break; }
      (buckets[ans] ||= []).push(s);
    }
    if (!ok || Object.keys(buckets).length < 2) continue;
    if (Object.values(buckets).every((b) => solve(groups, b, depth - 1))) return q;
  }
  return false;
}

/** All questions that settle a 2-suspect case on their own. */
export function splittingQuestions(groups, suspects) {
  const out = [];
  for (const q of QUESTIONS) {
    const answers = suspects.map((s) => determinate(groups[s], q));
    if (answers.some((x) => x === null || x === 'refused')) continue;
    if (new Set(answers).size === suspects.length) out.push({ q, answers: Object.fromEntries(suspects.map((s, i) => [s, answers[i]])) });
  }
  return out;
}

export function analyze(spec) {
  const rep = spec.reports || buildReports(spec);
  const groups = {};
  for (const p of CREW) groups[p] = candidateWorlds(spec.start, rep, p, spec.visit);
  const suspects = CREW.filter((p) => groups[p].length);
  const first = suspects.length >= 2 ? solve(groups, suspects, 2) : suspects.length === 1;
  return { rep, groups, suspects, solvable: Boolean(first), firstQuestion: typeof first === 'object' ? first : null };
}

// ---------- sampling ----------

// Tuned so that, when someone says they heard a hatch, it is the liar about half the time
// (see the stats printed by the tests): accusing must not be a cue.
const P_VISIT = 0.5;
const P_ACCUSER = 0.4;
const P_WITNESS = 0.9; // only with a quiet liar

/** One random case spec (not yet validated). */
function sampleSpec(rand) {
  const sab = pick(rand, CREW);
  let mods;
  do mods = shuffle(rand, START_MODS); while (mods[CREW.indexOf(sab)] === 'C');
  const start = Object.fromEntries(CREW.map((p, i) => [p, mods[i]]));
  const t = pick(rand, LEAVE_TIMES);

  let visit = null;
  if (rand() < P_VISIT) {
    const options = [];
    for (const v of CREW) {
      if (v === sab) continue;
      for (const dst of START_MODS) {
        if (dst === start[v] || dst === start[sab] || crossesBridge(start[v], dst)) continue;
        for (const u of VISIT_TIMES) options.push({ who: v, dst, u });
      }
    }
    visit = pick(rand, options);
  }

  const style = rand() < P_ACCUSER ? 'accuser' : 'quiet';
  let accuse = null, witness = null;
  const world = buildWorld(start, sab, t, visit);
  if (style === 'accuser') {
    // a hatch that did not open around that time
    const targets = CREW.filter((q) => q !== sab && start[q] !== 'C' && !(visit && visit.who === q));
    const options = [];
    for (const q of targets) for (const tt of LEAVE_TIMES) {
      if (ask(world, { kind: 'hatch', what: HATCH_OF[start[q]], a: tt - 5, b: tt + 5 }) === 'no') options.push({ mod: start[q], t: tt });
    }
    if (!options.length) return null;
    accuse = pick(rand, options);
  } else if (rand() < P_WITNESS) {
    // an innocent who stayed really heard the saboteur's hatch
    const options = CREW.filter((q) => q !== sab && !(visit && visit.who === q));
    witness = { who: pick(rand, options), mod: start[sab], t };
  }
  return { start, sab, t, style, accuse, visit, witness };
}

/** Questions players would find natural first: hatches, a window around the key time, 10–20 minutes wide. */
function decisiveQuestion(spec, groups, suspects) {
  const options = splittingQuestions(groups, suspects);
  const heard = Object.values(buildReports(spec)).find((r) => r.kind === 'stayed' && r.obs.type === 'heard');
  const focus = heard ? heard.obs.t : spec.t;
  const score = ({ q }) => (q.kind === 'hatch' ? 1000 : 0)
    + (q.a <= focus && focus <= q.b ? 300 : 0)
    - Math.abs(q.b - q.a - 15) * 4
    - Math.abs((q.a + q.b) / 2 - focus);
  options.sort((x, y) => score(y) - score(x));
  return options[0];
}

/**
 * Deterministic case from a code like "K9-4F7Q". Retries with the same PRNG until the case is valid:
 * exactly one false report, exactly 2 suspects including the saboteur, solvable in 2 questions.
 */
export function generateCase(code) {
  const rand = prng(code);
  for (let attempt = 0; attempt < 500; attempt++) {
    const spec = sampleSpec(rand);
    if (!spec) continue;
    const { rep, groups, suspects, solvable } = analyze(spec);
    if (suspects.length !== 2 || !suspects.includes(spec.sab) || !solvable) continue;
    const order = shuffle(rand, CREW); // report numbers 1–4
    const decisive = decisiveQuestion(spec, groups, suspects);
    const exclusions = Object.fromEntries(CREW.filter((p) => !suspects.includes(p)).map((p) => [p, exclusionReason(spec.start, rep, p)]));
    return {
      code, ...spec, reports: rep, order, suspects, decisive, exclusions,
      world: buildWorld(spec.start, spec.sab, spec.t, spec.visit),
      variant: Math.floor(rand() * 1e9), // picks the text variants
      emergencyCode: `${order.indexOf(spec.sab) + 1}${PEOPLE[spec.sab].id}`,
      attempts: attempt + 1,
    };
  }
  throw new Error(`No valid case for ${code}`);
}

export function answer(theCase, q) {
  return ask(theCase.world, q);
}

export function fmtTime(m) {
  return m >= 60 ? '03:00' : `02:${String(m).padStart(2, '0')}`;
}
