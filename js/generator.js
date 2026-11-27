// Kepler-9 case generator. Port of reference/gen.py, with the changes of the brief (section 5).
// Pure module: no DOM. Imported by the app, mocks.html and the tests (Node).
//
// Time is in minutes after 02:00 (0 = 02:00, 60 = 03:00).
// Modules: B Bridge, N Engine Room, M Medbay, C Cargo Bay, L Life Support, K Corridor.
// Hatches: B-K, N-K, M-K, L-K, C-B. They log when they open, never who opened them.

export const CREW = ['hana', 'doyun', 'mira', 'echo'];
// ECHO-7's role (confirmed 2026-11-25 and 2026-11-27; docs/story.md): the label lives here only.
export const ECHO_ROLE = 'Maintenance android';
export const PEOPLE = {
  hana: { name: 'Hana Sato', short: 'Hana', role: 'Captain', id: 14, human: true },
  doyun: { name: 'Doyun Park', short: 'Doyun', role: 'Engineer', id: 27, human: true },
  mira: { name: 'Mira Costa', short: 'Mira', role: 'Medical Officer', id: 55, human: true },
  echo: { name: 'ECHO-7', short: 'ECHO-7', role: ECHO_ROLE, id: 71, human: false },
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
// Bridge console call (update 1, section 3): a scheduled call with Mission Control, 10 minutes long.
export const CALL_STARTS = [10, 15, 20, 25, 30, 35, 40, 45, 50];
export const CALL_LENGTH = 10;
// Off in the game until the design of the question builder is chosen (mocks.html); on in the tests.
export const CALLS_IN_GAME = false;
// Every question covers a window of exactly this many minutes, moved along the hour (decided 2026-11-24).
export const QUESTION_WINDOW = 10;
// The story of the one pair of reports that can't both be true (chosen 2026-11-25, so that cases are not all solved
// the same way), drawn once per case, each a third of the time:
//   heard: someone heard the denier's corridor hatch open at a time (the original shape)
//   knock: someone knocked at the denier's hatch at a time and nobody answered
//   seen:  the Bridge occupant saw the Cargo Bay occupant come through and go out into the Corridor
export const STORIES = ['heard', 'knock', 'seen'];
// A second clue in every case (2026-11-25), told by one of the two who are not suspects: something true whichever of
// the two suspects lies, so that the reports don't say at once what to ask.
//   ls:    they heard the Life Support hatch open around the time someone went in (NOVA can't answer about it)
//   steps: they heard footsteps in the Corridor around that time
export const HERRINGS = ['ls', 'steps'];

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
  if (src === 'B' && dst === 'C') return { ev: [['C-B', t]], transit }; // the direct hatch, not via the Corridor
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

/**
 * One concrete world: hatch events, motion spans per module, and the Bridge console call.
 * call: { a, b } (a call happened), null (no call), or { unknownBefore: t } (hypothetical world where the
 * Bridge occupant is the liar: whatever they claim, the console can only have been in use before they left).
 */
export function buildWorld(start, sab, t, visit, call = null, knock = null) {
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
    } else if (knock && p === knock.who) {
      // out into the Corridor to knock at a hatch, and back: own hatch a minute before and a minute after
      add(m, 0, knock.u - 1);
      hatches.push([HATCH_OF[m], knock.u - 1], [HATCH_OF[m], knock.u + 1]);
      add('K', knock.u - 1, knock.u + 1);
      add(m, knock.u + 1, 60);
    } else {
      add(m, 0, 60);
    }
  }
  return { hatches, occ, call };
}

/**
 * q = { kind: 'hatch'|'motion'|'call', what: hatch, module or 'B', a, b } -> 'yes' | 'no' | 'refused'
 * ('unknown' only in hypothetical worlds, never in a real case).
 */
export function ask(world, q) {
  const { kind, what, a, b } = q;
  if (kind === 'call') {
    const c = world.call;
    if (!c) return 'no';
    if (c.unknownBefore !== undefined) return a >= c.unknownBefore ? 'no' : 'unknown';
    return c.a < b && c.b > a ? 'yes' : 'no';
  }
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
    if (b - a !== QUESTION_WINDOW) continue;
    for (const h of HATCHES) QUESTIONS.push({ kind: 'hatch', what: h, a, b });
    for (const m of MODULES) QUESTIONS.push({ kind: 'motion', what: m, a, b });
    QUESTIONS.push({ kind: 'call', what: 'B', a, b });
  }
}

// ---------- reports ----------
// Report shapes:
//   { kind: 'stayed', mod, obs: { type: 'quiet' } }
//   { kind: 'stayed', mod, obs: { type: 'heard', mod: X, t } }       (X's corridor hatch, around t)
//   { kind: 'stayed', mod, obs: { type: 'visitor', who, u } }
//   { kind: 'stayed', mod, obs: { type: 'knocked', mod: X, u } }      (went out to X's hatch around u, no answer, back)
//   { kind: 'stayed', mod, obs: { type: 'saw', who, t } }             (on the Bridge: who came through from the Cargo Bay)
//   { kind: 'stayed', mod, obs: { type: 'ls' | 'steps', t } }        (the second clue: Life Support hatch, footsteps)
//   { kind: 'moved', mod, dst, u, host }
// An honest Bridge occupant who had the scheduled call always mentions it: report.call = { a, b }.
// The liar never claims a call.

export function buildReports(spec) {
  const { start, sab, style, accuse, visit, witness, call, story = 'heard', herring = null } = spec;
  const occupantOf = (m) => CREW.find((p) => start[p] === m);
  // the accusation of the case, by story: what the accuser says about the denier
  const claim = (a) => (story === 'knock' ? { type: 'knocked', mod: a.mod, u: a.t }
    : story === 'seen' ? { type: 'saw', who: occupantOf(a.mod), t: a.t } : { type: 'heard', mod: a.mod, t: a.t });
  const r = {};
  for (const p of CREW) {
    const m = start[p];
    if (visit && p === visit.who) {
      r[p] = { kind: 'moved', mod: m, dst: visit.dst, u: visit.u, host: occupantOf(visit.dst) };
    } else if (p === sab) {
      r[p] = { kind: 'stayed', mod: m, obs: style === 'accuser' ? claim(accuse) : { type: 'quiet' } };
    } else if (witness && p === witness.who) {
      r[p] = { kind: 'stayed', mod: m, obs: claim(witness) };
    } else if (visit && visit.dst === m) {
      r[p] = { kind: 'stayed', mod: m, obs: { type: 'visitor', who: visit.who, u: visit.u } };
    } else if (herring && p === herring.who) {
      r[p] = { kind: 'stayed', mod: m, obs: { type: herring.type, t: herring.t } };
    } else {
      r[p] = { kind: 'stayed', mod: m, obs: { type: 'quiet' } };
    }
    if (call && m === 'B' && p !== sab) r[p].call = { a: call.a, b: call.b };
  }
  return r;
}

// ---------- deduction ----------

/**
 * Why `liar` cannot be the liar, from the reports alone (players know the claimed modules).
 * Returns null if the hypothesis survives these checks.
 */
export function exclusionReason(start, rep, liar) {
  // from the Cargo Bay the way out crosses the Bridge: only a Bridge occupant who saw them go can leave them a suspect
  const bridge = CREW.find((p) => start[p] === 'B');
  if (start[liar] === 'C' && !(bridge && rep[bridge].obs && rep[bridge].obs.type === 'saw' && rep[bridge].obs.who === liar)) return { type: 'cargo' };
  if (rep[liar].kind === 'moved') return { type: 'moved' }; // only a "stayed" report can hide the trip
  // Change from gen.py: whoever had a visitor had company when they would have left (visits end before
  // anyone leaves): the honest visitor would have seen them go. Same reasoning as the Cargo Bay rule.
  const guest = CREW.find((p) => p !== liar && rep[p].kind === 'moved' && rep[p].dst === start[liar]);
  if (guest) return { type: 'hosted', guest };
  for (const p of CREW) {
    if (p === liar) continue;
    const r = rep[p];
    if (r.kind === 'stayed' && r.obs.type === 'saw' && r.obs.who !== liar) return { type: 'contradiction', a: p, b: r.obs.who };
    if (r.kind === 'stayed' && (r.obs.type === 'heard' || r.obs.type === 'knocked')) {
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
export function candidateWorlds(start, rep, liar, visit, knock = null) {
  if (exclusionReason(start, rep, liar)) return [];
  const worlds = [];
  const bridge = CREW.find((p) => start[p] === 'B');
  for (const t of LEAVE_TIMES) {
    const call = bridge === liar ? { unknownBefore: t } : rep[bridge].call || null;
    const w = buildWorld(start, liar, t, visit, call, knock && knock.who !== liar ? knock : null);
    // every honest accusation must match what really happened
    const ok = CREW.every((p) => {
      if (p === liar) return true;
      const r = rep[p];
      if (r.kind !== 'stayed') return true;
      const o = r.obs;
      // heard: a real hatch event at that hatch and time
      if (o.type === 'heard') return ask(w, { kind: 'hatch', what: HATCH_OF[o.mod], a: o.t, b: o.t }) === 'yes';
      // knocked, nobody answered: whoever was in there had already left
      if (o.type === 'knocked') return start[liar] === o.mod && t <= o.u - 5;
      // saw them come through from the Cargo Bay: they left then
      if (o.type === 'saw') return o.who === liar && t === o.t;
      // the second clue: within a couple of minutes of the time they give
      if (o.type === 'ls') return w.hatches.some(([h, tt]) => h === 'L-K' && Math.abs(tt - o.t) <= 2);
      if (o.type === 'steps') return (w.occ.K || []).some(([s, e]) => s < o.t + 2 && e > o.t - 2);
      return true;
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
    if (x === 'unknown') return null;
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

/**
 * Pairs of reports that can't both be true: [accuser, denier]. The accuser heard the denier's hatch, knocked at it
 * and nobody answered, or saw the denier come through the Bridge; the denier says they stayed and nothing happened.
 */
export function clashPairs(start, rep) {
  const out = [];
  for (const p of CREW) {
    const r = rep[p];
    if (r.kind !== 'stayed' || !['heard', 'knocked', 'saw'].includes(r.obs.type)) continue;
    for (const q of CREW) {
      const about = r.obs.type === 'saw' ? q === r.obs.who : start[q] === r.obs.mod;
      if (q !== p && about && rep[q].kind === 'stayed' && rep[q].obs.type === 'quiet') out.push([p, q]);
    }
  }
  return out;
}

/**
 * Confirmation traps about `about` (a suspect): questions on their own module (motion, or their hatch) that get
 * the same answer whichever of the 2 suspects is lying. Computed like the decisive question, over the worlds.
 */
export function trapQuestions(groups, suspects, start, about) {
  const m = start[about];
  const out = [];
  for (const q of QUESTIONS) {
    if (!((q.kind === 'motion' && q.what === m) || (q.kind === 'hatch' && q.what === HATCH_OF[m]))) continue;
    const answers = suspects.map((s) => determinate(groups[s], q));
    if (answers.some((x) => x === null || x === 'refused')) continue;
    if (new Set(answers).size === 1) out.push({ q, answer: answers[0] });
  }
  return out;
}

export function analyze(spec) {
  const rep = spec.reports || buildReports(spec);
  const groups = {};
  for (const p of CREW) groups[p] = candidateWorlds(spec.start, rep, p, spec.visit, spec.knock);
  const suspects = CREW.filter((p) => groups[p].length);
  const first = suspects.length >= 2 ? solve(groups, suspects, 2) : suspects.length === 1;
  return { rep, groups, suspects, solvable: Boolean(first), firstQuestion: typeof first === 'object' ? first : null };
}

// ---------- sampling ----------

// Update 1, section 1: the saboteur (each of the 4 equally often) and the liar's form (accusing or denying,
// 50/50) are drawn once per case; the case is then resampled with them fixed until it is valid.
const P_VISIT = 0.5;
const P_CALL = 0.3; // "in some cases" the Bridge occupant had a scheduled call

/** One random case spec for a given saboteur, liar form and story (not yet validated). */
function sampleSpec(rand, sab, form, calls, story) {
  if (story === 'knock') return sampleKnock(rand, sab, form);
  if (story === 'seen') return sampleSeen(rand, sab, form);
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

  // the other half of the clash pair must be someone whose report can be a plain "stayed" one
  const plain = (q) => q !== sab && start[q] !== 'C' && !(visit && (visit.who === q || visit.dst === start[q]));
  const world = buildWorld(start, sab, t, visit);
  let style, accuse = null, witness = null;
  if (form === 'accusing') {
    // the liar says they heard an innocent's hatch, which did not open around that time
    style = 'accuser';
    const options = [];
    for (const q of CREW.filter(plain)) for (const tt of LEAVE_TIMES) {
      if (ask(world, { kind: 'hatch', what: HATCH_OF[start[q]], a: tt - 5, b: tt + 5 }) === 'no') options.push({ mod: start[q], t: tt });
    }
    if (!options.length) return null;
    accuse = pick(rand, options);
  } else {
    // the liar denies; an innocent who stayed really heard the liar's hatch
    style = 'quiet';
    const options = CREW.filter(plain);
    if (!options.length) return null;
    witness = { who: pick(rand, options), mod: start[sab], t };
  }

  let call = null;
  const bridge = CREW.find((p) => start[p] === 'B');
  if (calls && rand() < P_CALL && bridge !== sab && !(visit && visit.who === bridge)) {
    const a = pick(rand, CALL_STARTS);
    call = { a, b: a + CALL_LENGTH };
  }
  return { story, start, sab, t, form, style, accuse, visit, witness, call, knock: null };
}

/**
 * knock: the accuser went out to the denier's hatch around u, knocked, nobody answered, and went back.
 * Denying form: the saboteur had already left (u at least 5 minutes after the exit). Accusing form: the saboteur
 * invents the knock; the denier was there all night.
 */
function sampleKnock(rand, sab, form) {
  let mods;
  do mods = shuffle(rand, START_MODS); while (mods[CREW.indexOf(sab)] === 'C');
  const start = Object.fromEntries(CREW.map((p, i) => [p, mods[i]]));
  const t = pick(rand, LEAVE_TIMES);
  const others = CREW.filter((p) => p !== sab && start[p] !== 'C'); // from the Cargo Bay one would cross the Bridge
  if (!others.length) return null;
  const other = pick(rand, others);
  const [x, d] = form === 'denying' ? [other, sab] : [sab, other];
  // the knock ends a question window before 03:00, so the window starting at the knock exists (and is the trap)
  const fits = (u) => u >= LEAVE_TIMES[0] + 5 && u + QUESTION_WINDOW <= 60;
  const times = LEAVE_TIMES.filter((u) => fits(u) && (form === 'accusing' || u >= t + 5));
  if (!times.length) return null;
  const u = pick(rand, times);
  const claim = { who: x, mod: start[d], t: u };
  return {
    story: 'knock', start, sab, t, form, style: form === 'denying' ? 'quiet' : 'accuser',
    accuse: form === 'accusing' ? claim : null, witness: form === 'denying' ? claim : null,
    visit: null, call: null, knock: { who: x, u },
  };
}

/**
 * seen: the Bridge occupant saw the Cargo Bay occupant come through around T and go out into the Corridor.
 * Denying form: the saboteur started in the Cargo Bay and left that way at T. Accusing form: the saboteur is on the
 * Bridge and invents it; the Cargo Bay occupant never moved.
 */
function sampleSeen(rand, sab, form) {
  const other = pick(rand, CREW.filter((p) => p !== sab));
  const [b, c] = form === 'denying' ? [other, sab] : [sab, other];
  const rest = shuffle(rand, ['N', 'M']);
  const start = { [b]: 'B', [c]: 'C' };
  CREW.filter((p) => p !== b && p !== c).forEach((p, i) => { start[p] = rest[i]; });
  const t = pick(rand, LEAVE_TIMES);
  const claim = { who: b, mod: 'C', t: form === 'denying' ? t : pick(rand, LEAVE_TIMES) };
  return {
    story: 'seen', start, sab, t, form, style: form === 'denying' ? 'quiet' : 'accuser',
    accuse: form === 'accusing' ? claim : null, witness: form === 'denying' ? claim : null,
    visit: null, call: null, knock: null,
  };
}

/**
 * The second clue: one of the two who are not in the pair, on a module by the Corridor and with nothing else to say,
 * heard the Life Support hatch or footsteps in the Corridor around the time the saboteur went into Life Support.
 * In a case with a visit, the visit is the second clue.
 */
function addHerring(rand, spec) {
  // a visit already gives the other two something true to tell (who joined whom, and when): it is the second clue
  if (spec.visit) return spec;
  const occupantOf = (m) => CREW.find((p) => spec.start[p] === m);
  const claim = spec.accuse || spec.witness;
  const accuser = spec.form === 'accusing' ? spec.sab : claim.who;
  const denier = spec.form === 'accusing' ? occupantOf(claim.mod) : spec.sab;
  const v = spec.visit;
  const tellers = CREW.filter((p) => p !== accuser && p !== denier && spec.start[p] !== 'C'
    && !(v && (v.who === p || v.dst === spec.start[p])) && !(spec.call && spec.start[p] === 'B'));
  if (!tellers.length) return null;
  return { ...spec, herring: { who: pick(rand, tellers), type: pick(rand, HERRINGS), t: spec.t } };
}

/** Score of a question as a natural first choice: a window around the key time, 10–20 minutes wide. */
const naturalScore = (focus) => ({ q }) => (q.kind === 'hatch' ? 1000 : 0)
  + (q.a <= focus && focus <= q.b ? 300 : 0)
  - Math.abs(q.b - q.a - 15) * 4
  - Math.abs((q.a + q.b) / 2 - focus);

const focusTime = (rep) => {
  const o = Object.values(rep).find((r) => r.kind === 'stayed' && ['heard', 'knocked', 'saw'].includes(r.obs.type)).obs;
  return o.t ?? o.u;
};

/** Questions players would find natural first: hatches, a window around the key time. */
function decisiveQuestion(rep, groups, suspects) {
  const score = naturalScore(focusTime(rep));
  const options = splittingQuestions(groups, suspects);
  options.sort((x, y) => score(y) - score(x));
  return options[0];
}

/** The most natural trap about a suspect: motion in their module first, around the key time. */
function bestTrap(rep, groups, suspects, start, about) {
  const score = naturalScore(focusTime(rep));
  const options = trapQuestions(groups, suspects, start, about);
  options.sort((x, y) => (y.q.kind === 'motion') - (x.q.kind === 'motion') || score(y) - score(x));
  return options[0] || null;
}

/**
 * Deterministic case from a code like "K9-4F7Q". Retries with the same PRNG until the case is valid:
 * exactly one false report; exactly 2 suspects, the 2 reports that can't both be true (a precise accusation
 * and a plain denial), the saboteur one of them; solvable in 2 questions; a confirmation trap about each suspect.
 */
export function generateCase(code, { calls = CALLS_IN_GAME } = {}) {
  const rand = prng(code);
  const sab = pick(rand, CREW);
  const form = rand() < 0.5 ? 'accusing' : 'denying';
  const story = pick(rand, STORIES);
  for (let attempt = 0; attempt < 2000; attempt++) {
    const bare = sampleSpec(rand, sab, form, calls, story);
    const spec = bare && addHerring(rand, bare);
    if (!spec) continue;
    const { rep, groups, suspects, solvable } = analyze(spec);
    if (suspects.length !== 2 || !suspects.includes(spec.sab) || !solvable) continue;
    const pairs = clashPairs(spec.start, rep);
    if (pairs.length !== 1 || !pairs[0].every((p) => suspects.includes(p))) continue;
    const [accuser, denier] = pairs[0];
    if ((form === 'accusing') !== (accuser === sab)) continue;
    const traps = Object.fromEntries(suspects.map((p) => [p, bestTrap(rep, groups, suspects, spec.start, p)]));
    if (suspects.some((p) => !traps[p])) continue;
    const order = shuffle(rand, CREW); // report numbers 1–4
    const decisive = decisiveQuestion(rep, groups, suspects);
    // tone (2026-11-25): one suspect explains too much, the other says just what is needed, 50/50 whoever lies;
    // the other two draw theirs freely. Its own seed, so the case itself doesn't change with it.
    const toneRand = prng(`${code}:tone`);
    const over = toneRand() < 0.5 ? accuser : denier;
    const tone = Object.fromEntries(CREW.map((p) => [p, suspects.includes(p) ? (p === over ? 'over' : 'plain') : toneRand() < 0.5 ? 'over' : 'plain']));
    const exclusions = Object.fromEntries(CREW.filter((p) => !suspects.includes(p)).map((p) => [p, exclusionReason(spec.start, rep, p)]));
    return {
      code, ...spec, reports: rep, order, suspects, accuser, denier, decisive, traps, exclusions, tone,
      world: buildWorld(spec.start, spec.sab, spec.t, spec.visit, spec.call, spec.knock && spec.knock.who !== spec.sab ? spec.knock : null),
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

/**
 * The check of a lockout code (docs/story.md, «Why NOVA needs the code»). Mission Control's console knows who is on
 * the crew and who wrote each report, so before sending it flags a code whose report number or ID doesn't exist ({ flag: 'unknown' }: there
 * are only reports 1 to 4, 2026-11-27) or whose report number doesn't match the ID ({ flag: 'inconsistent', n, id }),
 * and the code is not sent: the attempt is not used. An accepted code is always consistent, and its outcome depends only on the ID: { right }.
 */
export function checkCode(theCase, code) {
  const n = Number(code[0]), id = code.slice(1);
  const who = CREW.find((p) => String(PEOPLE[p].id) === id);
  if (!who || n < 1 || n > theCase.order.length) return { flag: 'unknown' };
  if (theCase.order[n - 1] !== who) return { flag: 'inconsistent', n, id };
  return { right: who === theCase.sab };
}

export function fmtTime(m) {
  return m >= 60 ? '03:00' : `02:${String(m).padStart(2, '0')}`;
}
