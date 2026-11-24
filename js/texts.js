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
  'The saboteur also damaged our link. It will carry only 2 questions and the emergency code. A question I have to refuse is still sent.',
  'Emergency code: the number of the false report, followed by the saboteur\'s ID. One attempt.',
  'Oxygen: 10 minutes. The countdown starts on your command.',
];

// The briefing in parts, for the briefing layouts (same sentences as BRIEFING). keys: words to highlight.
export const BRIEFING_PARTS = [
  { id: 'hello', text: BRIEFING[0], keys: [] },
  { id: 'situation', label: 'SITUATION_', text: BRIEFING[1], keys: ['03:00', 'sabotaged', 'every module is sealed'] },
  { id: 'saboteur', label: 'SABOTEUR_', text: BRIEFING[2], keys: ['Whoever was in Life Support is the saboteur.'] },
  { id: 'reports', label: 'REPORTS_', text: BRIEFING[3], keys: ['One report is false.'] },
  { id: 'sensors', label: 'SENSORS_', text: BRIEFING[4], keys: ['hatch openings', 'motion', 'never who opened them'] },
  { id: 'link', label: 'LINK_', text: BRIEFING[5], keys: ['2 questions', 'is still sent'] },
  { id: 'code', label: 'CODE_', text: BRIEFING[6], keys: ['the number of the false report', 'the saboteur\'s ID', 'One attempt.'] },
  { id: 'oxygen', label: 'OXYGEN_', text: BRIEFING[7], keys: ['10 minutes'] },
];

// The sensors sentence when the Bridge console call is in the game (update 1, section 3).
export const BRIEFING_SENSORS_CALL = {
  id: 'sensors', label: 'SENSORS_',
  text: 'The Life Support sensors were cut from inside. I can answer yes/no questions on every other sensor: hatch openings, motion and calls on the Bridge console. Hatches record when they open, never who opened them. No sensor records names.',
  keys: ['hatch openings', 'motion', 'calls on the Bridge console', 'never who opened them'],
};

// Update 1, section 4: system style; the consequence, without naming who survives.
export const ENDINGS = {
  right: {
    title: 'Code accepted',
    lines: ['EMERGENCY CODE ACCEPTED.', 'Access revoked.', 'Restarting the oxygen recycler…', 'Oxygen levels rising.', 'The crew will make it, Mission Control.', 'MISSION STATUS: SUCCESS.'],
  },
  wrong: {
    title: 'Code rejected',
    lines: ['EMERGENCY CODE REJECTED.', 'Restart sequence not authorised.', 'Oxygen recycler: OFFLINE.', 'Life Support is now the only module with breathable air.', 'MISSION STATUS: FAILED.'],
  },
  timeout: {
    title: 'Oxygen depleted',
    lines: ['TIME LIMIT EXCEEDED.', 'Oxygen depleted in every module except Life Support.', 'MISSION STATUS: FAILED.'],
  },
};

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

// What each person was doing in each starting module.
const ACT = {
  hana: { B: 'overseeing station operations', N: 'reviewing the recycler maintenance logs', M: 'reviewing the crew medical files', C: 'auditing the cargo manifest' },
  doyun: { B: 'recalibrating the navigation console', N: 'checking the oxygen recycler\'s auxiliary pumps', M: 'repairing the body scanner', C: 'sorting spare parts for the recycler' },
  mira: { B: 'covering the night watch', N: 'taking the radiation readings', M: 'doing the medicine inventory', C: 'unpacking the medical supplies' },
  echo: { B: 'Bridge systems diagnostics', N: 'Engine Room pump maintenance', M: 'Medbay sterilisation cycle', C: 'Cargo Bay inventory scan' },
};

// How a person names a hatch they heard (always the module's hatch on the Corridor).
const HEARD = { B: 'the Bridge\'s corridor hatch', N: 'the Engine Room hatch', M: 'the Medbay hatch' };

// Placeholders: {inMod} "on the Bridge" / "in the Medbay", {mod} "the Medbay", {act}, {time}, {target} the hatch heard,
// {inTarget} where it leads, {who}, {dst}, {host}, {ca} {cb} the call. ECHO-7: {task}, {hatch} (NOVA's hatch name),
// {Dst} bare module name, {WHO} {HOST} full name with ID.
const VOICES = {
  // Captain: confident, composed, complete decisive sentences; procedures and responsibility; doesn't over-justify.
  hana: {
    open: [
      'I was {inMod} throughout the shift, {act}.',
      'I spent the whole shift {inMod}, {act}.',
      'From 02:00 until the lockdown I was {inMod}, {act}.',
    ],
    quiet: [
      'No one came in, and I heard nothing out of the ordinary.',
      'It was an uneventful shift: no one came in, and nothing unusual reached me.',
      'Nothing out of the ordinary happened until the alarm.',
    ],
    heard: [
      'At around {time} I heard {target} open. Nobody was scheduled to move at that hour.',
      'At around {time} I clearly heard {target} open. That was not on any schedule.',
      'At around {time} I heard {target} open, and I noted the time.',
    ],
    visitor: [
      'At around {time} {who} joined me, and stayed until the lockdown.',
      '{who} joined me at around {time} and was still with me at the lockdown.',
    ],
    close: [
      'I followed the standard procedures. There was no reason for me to leave {mod}.',
      'I followed procedure throughout. There was no reason for me to leave my post.',
      'My responsibility was {mod}, and I stayed at my post.',
    ],
    call: 'From {ca} to {cb} I held the scheduled call with Mission Control.',
    moved: [
      'I started the shift {inMod}, {act}. At around {time} I went to {dst} to assist {host}, and I stayed there until the lockdown. I followed the standard procedures.',
      'I was {inMod} until around {time}, {act}. Then I went to {dst} to assist {host}, and I remained there until the lockdown. Nothing else to report.',
    ],
  },
  // Engineer: direct, practical, slightly blunt; technical words; a bit defensive; points elsewhere.
  doyun: {
    open: [
      'I was {inMod}, {act}.',
      'I was {inMod} the whole shift, {act}.',
      'I spent the night {inMod}, {act}.',
    ],
    quiet: [
      'Nothing unusual on my end; the machinery was running normally.',
      'Quiet night. Nobody came in, and I didn\'t hear anything.',
      'Nothing on my end. Nobody came by, and I didn\'t hear a thing.',
    ],
    heard: [
      'Around {time} I heard {target} slam. If you want to know what happened, you should probably ask whoever was {inTarget}.',
      'Around {time}, {target} opened. You can\'t miss that sound: the seals hiss. Ask whoever was {inTarget}.',
      'Around {time} I heard {target} open. Not my business, but you should ask whoever was {inTarget}.',
    ],
    visitor: [
      'Around {time} {who} showed up and stayed until the lockdown.',
      '{who} came in around {time} and didn\'t leave again.',
    ],
    close: [
      'My work\'s in order. That\'s all I\'ve got.',
      'I had a job to do, and I did it.',
      'That\'s it. Can we get on with this?',
    ],
    call: 'From {ca} to {cb} I was on the scheduled call with Mission Control. Routine.',
    moved: [
      'I started {inMod}, {act}. Around {time} I went over to {dst} to give {host} a hand. Stayed there until the alarm. That\'s it.',
      'I was {inMod} until around {time}, {act}. Then {dst}, to help {host} out. Didn\'t move after that. My work\'s in order.',
    ],
  },
  // Medical Officer: calm, warm, reassuring, conversational; worried about the crew; never confrontational.
  mira: {
    open: [
      'I was {inMod} all night, {act}.',
      'I spent the night {inMod}, {act}.',
      'I stayed {inMod} the whole night, {act}.',
    ],
    quiet: [
      'It was a quiet night, thankfully. Nobody came in, and I didn\'t hear anything.',
      'It was so quiet; nobody came by, and I didn\'t hear a sound.',
      'Nothing happened on my side, thankfully. I didn\'t hear anything at all.',
    ],
    heard: [
      'Around {time} I heard {target} open. I thought someone might be feeling unwell, and I nearly went to check.',
      'Around {time} I heard {target} open. I\'m sure there\'s a good reason; maybe someone couldn\'t sleep.',
      'Around {time} I heard {target} open, and I wondered if someone needed me.',
    ],
    visitor: [
      'Around {time} {who} came by and kept me company until the alarm. I was glad of it.',
      '{who} came in around {time} and stayed with me until the lockdown.',
    ],
    close: [
      'I just hope everyone is safe.',
      'Please tell me the others are all right.',
      'I hope everyone is okay.',
    ],
    call: 'From {ca} to {cb} I had the scheduled call with Mission Control; it was nice to hear a friendly voice.',
    moved: [
      'I started the night {inMod}, {act}. Around {time} I went over to {dst} to see how {host} was doing, and I stayed there. I just hope everyone is safe.',
      'I was {inMod} until around {time}, {act}. Then I went to {dst} to keep {host} company, and I stayed until the alarm. I hope everyone is okay.',
    ],
  },
  // Android: precise, neutral, structured; short task/time/status lines; no emotions, no speculation.
  echo: {
    open: [
      'Scheduled task: {task}. Time interval: 02:00–03:00. Task status: COMPLETED.',
      'Location: {Mod}. Scheduled task: {task}. Time interval: 02:00–03:00. Task status: COMPLETED.',
    ],
    quiet: [
      'Observations: none.',
      'Unscheduled events observed: none.',
    ],
    heard: [
      'Observation: {hatch} hatch heard opening, approx. {time}.',
      'Unscheduled event: {hatch} hatch heard opening, approx. {time}.',
    ],
    visitor: [
      'Visitor: {WHO}, from approx. {time} until lockdown.',
      'Unscheduled event: {WHO} entered, approx. {time}. Present until lockdown.',
    ],
    close: ['End of statement.'],
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
  const one = (pool) => pool[Math.floor(rand() * pool.length)];
  const time = r.kind === 'moved' ? r.u : r.obs.t ?? r.obs.u;
  const who = r.obs && r.obs.who;
  const heard = r.obs && r.obs.type === 'heard' ? r.obs.mod : null;
  const vars = {
    mod: the(r.mod), Mod: MOD_NAME[r.mod], inMod: inMod(r.mod), act: ACT[p][r.mod], task: ACT.echo[r.mod],
    time: time === undefined ? '' : fmtTime(time),
    target: heard ? HEARD[heard] : '', inTarget: heard ? inMod(heard) : '', hatch: heard ? HATCH_NAME[HATCH_OF[heard]] : '',
    who: who ? PEOPLE[who].short : '', WHO: who ? fullName(who) : '',
    dst: r.dst ? the(r.dst) : '', Dst: r.dst ? MOD_NAME[r.dst] : '',
    host: r.host ? PEOPLE[r.host].short : '', HOST: r.host ? fullName(r.host) : '',
    ca: r.call ? fmtTime(r.call.a) : '', cb: r.call ? fmtTime(r.call.b) : '',
  };
  let parts;
  if (r.kind === 'moved') parts = [one(V.moved)];
  else parts = [one(V.open), r.call ? V.call : null, one(V[r.obs.type]), one(V.close)].filter(Boolean);
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
 * sensors were offline, and hatches never say who opened them), how Voran Industries got them, the 2 reports
 * that couldn't both be true, one decisive question with its answer, the code.
 * Returns { happened[], reports[], question{}, code }.
 */
export function solutionText(c) {
  const s = c.sab, S = nm(s), m = c.start[s];
  const happened = [
    `${S} was in Life Support at 03:00.`,
    `Reconstructed route (the Life Support sensors were offline): ${S} stayed ${inMod(m)} until around ${fmtTime(c.t)}, then crossed the Corridor into Life Support.`,
    PEOPLE[s].human
      ? 'Voran Industries paid them to make the recycler test fail.'
      : 'Voran Industries hacked ECHO-7 from outside the station to make the recycler test fail.',
  ];

  const A = c.accuser, D = c.denier;
  const [first, second] = [A, D].sort((x, y) => n(c, x) - n(c, y));
  const heard = c.reports[A].obs;
  const reports = [
    `Reports ${n(c, first)} and ${n(c, second)} couldn't both be true. ${tag(c, A)} heard ${HEARD[heard.mod]} open around ${fmtTime(heard.t)}; ${tag(c, D)} was ${inMod(c.start[D])} and reported a quiet night.`,
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
