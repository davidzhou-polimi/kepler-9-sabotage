// All in-game text. English, in character.
// The false report is drawn from the same pools as the true ones: style never gives the liar away.

import { CREW, PEOPLE, ECHO_ROLE, MOD_NAME, HATCH_NAME, HATCH_OF, fmtTime, prng } from './generator.js';

// ---------- NOVA ----------

export const BRIEFING = [
  'Mission Control, this is NOVA on Kepler-9.',
  'At 03:00 the oxygen recycler in Life Support was sabotaged. The station went into lockdown: every module is sealed, and each crew member is locked in where they were.',
  'Whoever was in Life Support is the saboteur. Its reserve tanks will keep them alive. Nobody else will make it.',
  'I asked the crew where they were. One report is false.',
  'The Life Support sensors were cut from inside. I can answer yes/no questions on every other sensor: hatch openings and motion. Hatches record when they open, never who opened them. No sensor records names.',
  'The saboteur also damaged our link. It will carry only 2 questions and the lockout code. A question I have to refuse is still sent.',
  // update 3 (24/11): why she needs the code
  'I can restart the recycler from here, but the saboteur is sealed in Life Support and would shut it down again. I can\'t lock out the whole crew: my safety protocol lets me revoke access for one person only, and only on your order. Send me the lockout code and I will lock them out before the restart.',
  'Lockout code: the number of the false report, followed by the saboteur\'s ID. One attempt.',
  'Oxygen: 10 minutes. The countdown has already started.',
];

// The briefing in parts, for the briefing layouts (same sentences as BRIEFING). keys: words to highlight.
export const BRIEFING_PARTS = [
  { id: 'hello', text: BRIEFING[0], keys: [] },
  { id: 'situation', label: 'SITUATION_', text: BRIEFING[1], keys: ['03:00', 'sabotaged', 'every module is sealed'] },
  { id: 'saboteur', label: 'SABOTEUR_', text: BRIEFING[2], keys: ['Whoever was in Life Support is the saboteur.'] },
  { id: 'reports', label: 'REPORTS_', text: BRIEFING[3], keys: ['One report is false.'] },
  { id: 'sensors', label: 'SENSORS_', text: BRIEFING[4], keys: ['hatch openings', 'motion', 'never who opened them'] },
  { id: 'link', label: 'LINK_', text: BRIEFING[5], keys: ['2 questions', 'is still sent'] },
  { id: 'lockout', text: BRIEFING[6], keys: [] },
  { id: 'code', label: 'CODE_', text: BRIEFING[7], keys: ['the number of the false report', 'the saboteur\'s ID', 'One attempt.'] },
  { id: 'oxygen', label: 'OXYGEN_', text: BRIEFING[8], keys: ['10 minutes'] },
];
// The line NOVA brings each thing with (the console fills up as she names it), and the stage when she has finished
export const briefingAt = (id) => BRIEFING_PARTS.findIndex((p) => p.id === id);
export const BRIEFING_DONE = BRIEFING_PARTS.length;

// The sensors sentence when the Bridge console call is in the game (update 1, section 3).
export const BRIEFING_SENSORS_CALL = {
  id: 'sensors', label: 'SENSORS_',
  text: 'The Life Support sensors were cut from inside. I can answer yes/no questions on every other sensor: hatch openings, motion and calls on the Bridge console. Hatches record when they open, never who opened them. No sensor records names.',
  keys: ['hatch openings', 'motion', 'calls on the Bridge console', 'never who opened them'],
};

// Update 1, section 4: system style; the consequence, without naming who survives.
// The story is docs/story.md («How it ends»): a wrong code is carried out like a right one, NOVA locks out the wrong
// person and restarts the recycler, and the saboteur shuts it down again from inside Life Support.
// Update 3 (24/11): {id} is the ID that was locked out; the wrong code comes in two beats (then: the second, after a
// short pause, in the red emergency state). The MISSION STATUS lines are the app's own wording.
export const ENDINGS = {
  right: {
    title: 'Code accepted',
    lines: ['LOCKOUT CODE ACCEPTED.', 'Access revoked: crew ID {id}.', 'Restarting the oxygen recycler…', 'Restart holding.', 'Oxygen levels rising.', 'The crew will make it, Mission Control.', 'MISSION STATUS: SUCCESS.'],
  },
  wrong: {
    title: 'Wrong code',
    lines: ['LOCKOUT CODE ACCEPTED.', 'Access revoked: crew ID {id}.', 'Restarting the oxygen recycler…'],
    then: ['WARNING: recycler shut down again from inside Life Support.', 'Life Support is now the only module with breathable air.', 'MISSION STATUS: FAILED.'],
  },
  timeout: {
    title: 'Oxygen depleted',
    lines: ['TIME LIMIT EXCEEDED.', 'Oxygen depleted in every module except Life Support.', 'MISSION STATUS: FAILED.'],
  },
};

// The console's answer to a code it doesn't send (update 3; since 2026-11-27 the console, not NOVA; docs/story.md):
// the attempt is not used. {n} {id} as typed.
/** The lines of an ending, with the ID that was locked out (code: the code sent): [first beat, second beat]. */
export function endingBeats(kind, code) {
  const e = ENDINGS[kind];
  const fill = (l) => l.replace('{id}', code ? code.slice(1) : '');
  return [e.lines.map(fill), (e.then || []).map(fill)];
}

export const CODE_FLAGS = {
  unknown: 'CODE NOT RECOGNISED. Check the format: report number followed by crew ID.',
  inconsistent: 'CODE INCONSISTENT. Report {n} was not written by crew ID {id}.',
};
export const codeFlagText = (f) => CODE_FLAGS[f.flag].replace('{n}', f.n).replace('{id}', f.id);

export const ANSWERS = {
  yes: 'Yes.',
  no: 'No.',
  refused: 'Refused. The Life Support sensors are offline. The question was still sent and counts as one of your 2.',
};


// ---------- crew profiles ----------

export const PROFILES = {
  hana: [
    'Captain of Kepler-9 for the past three years.',
    'A former test pilot. Runs the station by the checklist, and expects the same of everyone aboard.',
    'Few words, quick decisions.',
    'Second long-duration posting.',
  ],
  doyun: [
    'Station engineer, aboard for two years.',
    'Keeps the pumps, valves and power lines running, and knows every bolt on the station by name.',
    'Little patience for meetings, endless patience for machines.',
    'Says what needs saying, then goes back to work.',
  ],
  mira: [
    'Medical officer, aboard for eight months. First long mission.',
    'Runs the weekly check-ups and keeps the crew\'s health records.',
    'Remembers every birthday, and notices when someone hasn\'t slept.',
  ],
  echo: [
    `${ECHO_ROLE}, active on Kepler-9 for six years: longer than anyone aboard.`,
    'Handles inventory, cleaning and repairs in spaces too tight for people.',
    'Reports in machine log format.',
    'Never off duty.',
  ],
};

// ---------- report voices ----------
// Update 1, section 2. Role and tone live here, never in the case logic: every report carries its
// character's cue whether it is true or false. Reference: the group's Case 01, "The Engineer's Alibi".
// A report is built from parts: opening (where, doing what), the Bridge call if any, the observation, a closing
// line. True and false reports of a character draw from the same pools, so the false one has the same voice,
// length and structure. Reports never quote sensor data: a crew member says what they did, saw or heard.

// What each person was doing in each starting module. Hands-on work only, never a console action: every console
// action records who did it, so a report can't claim one (docs/story.md, «NOVA calls Mission Control»).
const ACT = {
  hana: { B: 'overseeing station operations', N: 'reviewing the recycler maintenance logs', M: 'reviewing the crew medical files', C: 'auditing the cargo manifest' },
  doyun: { B: 'checking the wiring behind the panels', N: 'checking the oxygen recycler\'s auxiliary pumps', M: 'repairing the body scanner', C: 'sorting spare parts for the recycler' },
  mira: { B: 'covering the night watch', N: 'taking the radiation readings', M: 'doing the medicine inventory', C: 'unpacking the medical supplies' },
  echo: { B: 'Bridge ventilation duct cleaning', N: 'Engine Room pump maintenance', M: 'Medbay sterilisation cycle', C: 'Cargo Bay inventory scan' },
};

// Why a crew member went out to knock at someone's hatch (the knock story). The same reason whether the knock is
// true or invented, so a false report reads like a true one.
const KNOCK_WHY = {
  hana: 'to have the night checklist signed',
  doyun: 'to pick up a spare part',
  mira: 'to drop off the night\'s medical log',
  echo: 'spare part delivery',
};

// How a person names a hatch they heard (always the module's hatch on the Corridor).
const HEARD = { B: 'the Bridge\'s corridor hatch', N: 'the Engine Room hatch', M: 'the Medbay hatch' };

// Placeholders: {inMod} "on the Bridge" / "in the Medbay", {mod} "the Medbay", {act}, {time}, {target} the hatch heard,
// {inTarget} where it leads, {who}, {dst}, {host}, {ca} {cb} the call. ECHO-7: {task}, {hatch} (NOVA's hatch name),
// {Dst} bare module name, {WHO} {HOST} full name with ID.
// Tone (chosen 2026-11-25): the accusation, the denial and the closing line come in two versions in each voice:
// "over" explains too much or insists (it sounds like a liar), "plain" says just what is needed (it sounds sincere).
// In every case one of the two suspects speaks "over" and the other "plain", whoever lies (generator: c.tone).
const VOICES = {
  // Captain: confident, composed, complete decisive sentences; procedures and responsibility. Over: she justifies herself.
  hana: {
    open: [
      'I was {inMod} throughout the shift, {act}.',
      'I spent the whole shift {inMod}, {act}.',
      'From 02:00 until the lockdown I was {inMod}, {act}.',
    ],
    openOut: [
      'I was {inMod}, {act}.',
      'My post was {mod}: I was {act}.',
    ],
    quiet: {
      over: [
        'No one came in, and I heard nothing out of the ordinary. I would have noticed anything unusual.',
        'It was an uneventful shift: no one came in, nothing unusual reached me, and I was alert the whole time.',
      ],
      plain: [
        'No one came in, and I heard nothing out of the ordinary.',
        'Nothing out of the ordinary happened until the alarm.',
      ],
    },
    heard: {
      over: [
        'At around {time} I clearly heard {target} open. That was not on any schedule, and I am certain of the time.',
        'At around {time} I heard {target} open. Nobody was scheduled to move at that hour; I want that on record.',
      ],
      plain: [
        'At around {time} I heard {target} open.',
        'At around {time} I heard {target} open, and I noted the time.',
      ],
    },
    knocked: {
      over: ['At around {time} I went to {target} {why}. I knocked twice, firmly; nobody answered. I waited, then returned to {mod}.'],
      plain: ['At around {time} I knocked at {target} {why}. There was no answer, so I went back to {mod}.'],
    },
    saw: {
      over: ['At around {time} {who} came through from the Cargo Bay and went out into the Corridor. I saw it clearly. Nobody was scheduled to move at that hour.'],
      plain: ['At around {time} I saw {who} cross the Bridge from the Cargo Bay and leave by the corridor hatch.'],
    },
    close: {
      over: [
        'I followed the standard procedures. There was no reason for me to leave {mod}.',
        'I followed procedure throughout. There was no reason for me to leave my post.',
        'My responsibility was {mod}, and I stayed at my post.',
      ],
      plain: [
        'That is all I have to report.',
        'Nothing further to report.',
      ],
    },
    // the second clue (told by someone who is not a suspect)
    ls: ['At around {time} I heard the Life Support hatch open.', 'At around {time} the Life Support hatch opened; I heard it clearly from {mod}.'],
    steps: ['At around {time} I heard footsteps in the Corridor.', 'At around {time} someone walked past in the Corridor.'],
    // whoever went out to knock doesn't say she never left
    closeOut: {
      over: ['I followed the standard procedures, and I want that on record.'],
      plain: ['Nothing else to report.'],
    },
    visitor: [
      'At around {time} {who} joined me, and stayed until the lockdown.',
      '{who} joined me at around {time} and was still with me at the lockdown.',
    ],
    call: 'From {ca} to {cb} I held the scheduled call with Mission Control.',
    moved: [
      'I started the shift {inMod}, {act}. At around {time} I went to {dst} to assist {host}, and I stayed there until the lockdown. I followed the standard procedures.',
      'I was {inMod} until around {time}, {act}. Then I went to {dst} to assist {host}, and I remained there until the lockdown. Nothing else to report.',
    ],
  },
  // Engineer: direct, practical, slightly blunt; technical words. Over: defensive, impatient, points elsewhere.
  doyun: {
    open: [
      'I was {inMod}, {act}.',
      'I was {inMod} the whole shift, {act}.',
      'I spent the night {inMod}, {act}.',
    ],
    openOut: ['I was {inMod}, {act}.'],
    quiet: {
      over: [
        'Quiet night. Nobody came in, I didn\'t hear anything, and I didn\'t go anywhere.',
        'Nothing on my end. Nobody came by, I didn\'t hear a thing, and I never left the place.',
      ],
      plain: [
        'Quiet night. Nobody came in, and I didn\'t hear anything.',
        'Nothing unusual on my end; the machinery was running normally.',
      ],
    },
    heard: {
      over: [
        'Around {time} I heard {target} slam. If you want to know what happened, you should probably ask whoever was {inTarget}.',
        'Around {time} I heard {target} open. Not my business, but you should ask whoever was {inTarget}.',
      ],
      plain: [
        'Around {time}, {target} opened. You can\'t miss that sound: the seals hiss.',
        'Around {time} I heard {target} open.',
      ],
    },
    knocked: {
      over: ['Around {time} I went over to {target} {why}. Knocked hard, twice. Nobody answered. Don\'t ask me where they were.'],
      plain: ['Around {time} I knocked at {target} {why}. No answer. Went back to my work.'],
    },
    saw: {
      over: ['Around {time} {who} came up from the Cargo Bay and walked straight out into the Corridor. Didn\'t say a word. Ask {who} why, not me.'],
      plain: ['Around {time} {who} came through from the Cargo Bay and headed out into the Corridor.'],
    },
    ls: ['Around {time} I heard the Life Support hatch. Heavy seals; you can\'t miss them.', 'Around {time} the Life Support hatch opened. I heard it from here.'],
    steps: ['Around {time} somebody walked down the Corridor. Quick steps.', 'Around {time} I heard footsteps out in the Corridor.'],
    close: {
      over: [
        'My work\'s in order. That\'s all I\'ve got.',
        'That\'s it. Can we get on with this?',
        'I had a job to do, and I did it.',
      ],
      plain: [
        'That\'s all from me.',
        'Nothing else to add.',
      ],
    },
    visitor: [
      'Around {time} {who} showed up and stayed until the lockdown.',
      '{who} came in around {time} and didn\'t leave again.',
    ],
    call: 'From {ca} to {cb} I was on the scheduled call with Mission Control. Routine.',
    moved: [
      'I started {inMod}, {act}. Around {time} I went over to {dst} to give {host} a hand. Stayed there until the alarm. That\'s it.',
      'I was {inMod} until around {time}, {act}. Then {dst}, to help {host} out. Didn\'t move after that. My work\'s in order.',
    ],
  },
  // Medical Officer: calm, warm, reassuring, conversational; worried about the crew; never confrontational.
  // Over: she says the same thing several ways, or insists she is sure. Plain: one statement, then her concern for others.
  mira: {
    open: [
      'I was {inMod} all night, {act}.',
      'I spent the night {inMod}, {act}.',
      'I stayed {inMod} the whole night, {act}.',
    ],
    openOut: [
      'I was {inMod}, {act}.',
      'I was working {inMod}, {act}.',
    ],
    quiet: {
      over: [
        'Nothing happened on my side, thankfully. I didn\'t hear anything at all.',
        'It was a quiet night, thankfully. Nobody came in, nobody at all, and I didn\'t hear a sound.',
      ],
      plain: [
        'Nobody came by all night.',
        'It was a quiet night. Nobody came in.',
      ],
    },
    heard: {
      over: [
        'Around {time} I heard {target} open, I\'m sure of it. I thought someone might be feeling unwell, and I nearly went to check.',
        'Around {time} I heard {target} open, I\'m certain. I\'m sure there\'s a good reason; maybe someone couldn\'t sleep.',
      ],
      plain: [
        'Around {time} I heard {target} open, and I wondered if someone needed me.',
        'Around {time} I heard {target} open. I nearly went to check.',
      ],
    },
    // her knock line closes the report itself (closeOut is empty)
    knocked: {
      over: ['Around {time} I went to {target} {why}. I knocked twice, I\'m sure of it, and nobody answered. I really hope {host} is all right.'],
      plain: ['Around {time} I went to {target} {why}. I knocked, but nobody answered, so I went back. I hope {host} is all right.'],
    },
    saw: {
      over: ['Around {time} {who} came through from the Cargo Bay and went out into the Corridor, I\'m sure it was {who}. I hope nothing was wrong.'],
      plain: ['Around {time} {who} came through from the Cargo Bay and went out into the Corridor. I didn\'t think much of it at the time.'],
    },
    ls: ['Around {time} I heard the Life Support hatch open, and I wondered who was up.', 'Around {time} I heard the Life Support hatch. I thought someone was checking the recycler.'],
    steps: ['Around {time} I heard footsteps in the Corridor. Someone was in a hurry.', 'Around {time} someone walked past in the Corridor; I nearly looked out.'],
    close: {
      over: [
        'I hope everyone is okay.',
        'Please tell me the others are all right.',
      ],
      plain: [
        'I hope everyone is okay.',
        'I just hope everyone is safe.',
      ],
    },
    closeOut: { over: [], plain: [] },
    visitor: [
      'Around {time} {who} came by and kept me company until the alarm. I was glad of it.',
      '{who} came in around {time} and stayed with me until the lockdown.',
    ],
    call: 'From {ca} to {cb} I had the scheduled call with Mission Control; it was nice to hear a friendly voice.',
    moved: [
      'I started the night {inMod}, {act}. Around {time} I went over to {dst} to see how {host} was doing, and I stayed there. I just hope everyone is safe.',
      'I was {inMod} until around {time}, {act}. Then I went to {dst} to keep {host} company, and I stayed until the alarm. I hope everyone is okay.',
    ],
  },
  // Android: precise, neutral, structured; short task/time/status lines; no emotions, no speculation.
  // Over: redundant status lines, claims of certainty. Plain: the one line needed.
  echo: {
    open: [
      'Scheduled task: {task}. Time interval: 02:00–03:00. Task status: COMPLETED.',
      'Location: {Mod}. Scheduled task: {task}. Time interval: 02:00–03:00. Task status: COMPLETED.',
    ],
    quiet: {
      over: [
        'Observations: none. Unscheduled events: none. Anomalies: none.',
        'Unscheduled events observed: none. Confirmed: none.',
      ],
      plain: [
        'Observations: none.',
        'Unscheduled events observed: none.',
      ],
    },
    heard: {
      over: ['Unscheduled event: {hatch} hatch heard opening, approx. {time}. Confidence: high. Event confirmed.'],
      plain: [
        'Observation: {hatch} hatch heard opening, approx. {time}.',
        'Unscheduled event: {hatch} hatch heard opening, approx. {time}.',
      ],
    },
    knocked: {
      over: ['Unscheduled task: {why} to {HOST}, {Dst}, approx. {time}. Hatch: no response. Attempts: 3. Task status: ABORTED. Returned to {Mod}.'],
      plain: ['Unscheduled task: {why} to {HOST}, {Dst}, approx. {time}. Hatch: no response. Returned to {Mod}.'],
    },
    saw: {
      over: ['Observation: {WHO} crossed the Bridge, Cargo Bay to Corridor, approx. {time}. Identification: certain.'],
      plain: ['Observation: {WHO} crossed the Bridge, Cargo Bay to Corridor, approx. {time}.'],
    },
    ls: ['Observation: Life Support hatch heard opening, approx. {time}.', 'Unscheduled event: Life Support hatch heard opening, approx. {time}.'],
    steps: ['Observation: footsteps in Corridor, approx. {time}.', 'Unscheduled event: footsteps in Corridor, approx. {time}.'],
    close: {
      over: ['Statement accuracy: 100%. End of statement.'],
      plain: ['End of statement.'],
    },
    visitor: [
      'Visitor: {WHO}, from approx. {time} until lockdown.',
      'Unscheduled event: {WHO} entered, approx. {time}. Present until lockdown.',
    ],
    call: 'Scheduled call: Mission Control. Time interval: {ca}–{cb}. Call status: COMPLETED.',
    moved: [
      'Scheduled task: {task}. Time interval: 02:00–{time}. Task status: INTERRUPTED. Reassignment: assist {HOST}, {Dst}, from approx. {time} until lockdown. End of statement.',
      'Location: {Mod}. Scheduled task: {task}. Task status: INTERRUPTED, approx. {time}. Relocation: {Dst}, to assist {HOST}. Remained until lockdown. End of statement.',
    ],
  },
};

const the = (m) => `the ${MOD_NAME[m]}`;
const inMod = (m) => `${m === 'B' ? 'on' : 'in'} the ${MOD_NAME[m]}`;
const fullName = (p) => `${PEOPLE[p].name} (ID ${PEOPLE[p].id})`;

function fill(tpl, v) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
}

/** The text of one crew member's report in a case. */
export function renderReport(c, p) {
  const r = c.reports[p];
  const V = VOICES[p];
  const rand = prng(`${c.code}:${c.variant}:${p}`);
  // a pool is a list, or { over, plain } for the lines that carry the tone (c.tone; a case without one is plain)
  const tone = (c.tone && c.tone[p]) || 'plain';
  const one = (pool) => {
    const list = Array.isArray(pool) ? pool : pool[tone];
    return list[Math.floor(rand() * list.length)];
  };
  const time = r.kind === 'moved' ? r.u : r.obs.t ?? r.obs.u;
  const who = r.obs && r.obs.who;
  const heard = r.obs && (r.obs.type === 'heard' || r.obs.type === 'knocked') ? r.obs.mod : null;
  const host = r.obs && r.obs.type === 'knocked' ? c.order.find((q) => c.start[q] === r.obs.mod) : r.host;
  const vars = {
    mod: the(r.mod), Mod: MOD_NAME[r.mod], inMod: inMod(r.mod), act: ACT[p][r.mod], task: ACT.echo[r.mod],
    time: time === undefined ? '' : fmtTime(time),
    target: heard ? HEARD[heard] : '', inTarget: heard ? inMod(heard) : '', hatch: heard ? HATCH_NAME[HATCH_OF[heard]] : '',
    who: who ? PEOPLE[who].short : '', WHO: who ? fullName(who) : '',
    dst: r.dst ? the(r.dst) : '',
    host: host ? PEOPLE[host].short : '', HOST: host ? fullName(host) : '',
    why: KNOCK_WHY[p], Dst: r.dst ? MOD_NAME[r.dst] : heard ? MOD_NAME[heard] : '',
    ca: r.call ? fmtTime(r.call.a) : '', cb: r.call ? fmtTime(r.call.b) : '',
  };
  let parts;
  if (r.kind === 'moved') parts = [one(V.moved)];
  else {
    // whoever went out to knock doesn't say they were there all night
    const out = r.obs.type === 'knocked';
    parts = [one(out && V.openOut ? V.openOut : V.open), r.call ? V.call : null, one(V[r.obs.type]), one(out && V.closeOut ? V.closeOut : V.close)].filter(Boolean);
  }
  return parts.map((s) => fill(s, vars)).join(' ');
}

// ---------- questions ----------

export function questionText(q) {
  const span = `between ${fmtTime(q.a)} and ${fmtTime(q.b)}`;
  if (q.kind === 'hatch') return `Did the ${HATCH_NAME[q.what]} hatch open ${span}?`;
  if (q.kind === 'call') return `Was there a call on the Bridge console ${span}?`;
  return `Was there motion ${inMod(q.what)} ${span}?`;
}

// ---------- solution ----------

const n = (c, p) => c.order.indexOf(p) + 1;
const nm = (p) => PEOPLE[p].short;
const tag = (c, p) => `${nm(p)} (report ${n(c, p)})`;

/**
 * Update 1, section 5: facts only. Who was in Life Support, their route (a reconstruction: the Life Support
 * sensors were offline, and hatches never say who opened them), how the rival company got them, the 2 reports
 * that couldn't both be true, one decisive question with its answer, the code; why the lockout (update 3), and after
 * a wrong code (sent) who was locked out by mistake. The rival company stays unnamed:
 * Voran Industries is the company Mission Control works for (docs/story.md).
 * Returns { happened[], reports[], question{}, code }.
 */
export function solutionText(c, { sent = null } = {}) {
  const s = c.sab, S = nm(s), m = c.start[s];
  // update 3 (24/11): why the lockout, and after a wrong code who was locked out (a sent code is always consistent)
  const locked = sent ? CREW.find((p) => String(PEOPLE[p].id) === sent.slice(1)) : null;
  const happened = [
    `${S} was in Life Support at 03:00.`,
    `Reconstructed route (the Life Support sensors were offline): ${S} stayed ${inMod(m)} until around ${fmtTime(c.t)}, then crossed ${m === 'C' ? 'the Bridge and the Corridor' : 'the Corridor'} into Life Support.`,
    PEOPLE[s].human
      ? 'A rival company paid them to make the recycler test fail.'
      : 'A rival company hacked ECHO-7 from outside the station to make the recycler test fail.',
    `Locking out ${S} was the only way to keep the recycler running.`,
    ...(locked && locked !== s ? [`${nm(locked)} was locked out by mistake.`] : []),
  ];

  const A = c.accuser, D = c.denier;
  const [first, second] = [A, D].sort((x, y) => n(c, x) - n(c, y));
  const o = c.reports[A].obs;
  const said = {
    heard: () => `heard ${HEARD[o.mod]} open around ${fmtTime(o.t)}`,
    knocked: () => `knocked at ${HEARD[o.mod]} around ${fmtTime(o.u)} and nobody answered`,
    saw: () => `saw ${nm(D)} come through from the Cargo Bay around ${fmtTime(o.t)}`,
  }[o.type]();
  const reports = [
    `Reports ${n(c, first)} and ${n(c, second)} couldn't both be true. ${tag(c, A)} ${said}; ${tag(c, D)} was ${inMod(c.start[D])} and reported a quiet night.`,
    `The false one was report ${n(c, s)}.`,
  ];

  const { q, answers } = c.decisive;
  const other = c.suspects.find((p) => p !== s);
  const yn = (x) => (x === 'yes' ? 'Yes' : 'No');
  const question = {
    text: questionText(q),
    answer: `NOVA's answer: ${yn(answers[s])}. If report ${n(c, other)} had been the false one, it would have been ${yn(answers[other])}.`,
  };
  const code = `${c.emergencyCode}: report ${n(c, s)}, then ${S}'s ID, ${PEOPLE[s].id}.`;
  return { happened, reports, question, code };
}
