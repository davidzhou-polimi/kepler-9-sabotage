// All in-game text. English, in character.
// The false report is drawn from the same pools as the true ones: style never gives the liar away.

import { CREW, PEOPLE, MOD_NAME, HATCH_NAME, HATCH_OF, fmtTime, prng } from './generator.js';

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

export const ENDINGS = {
  right: {
    title: 'Code accepted',
    lines: ['Code accepted. Access revoked.', 'Restarting the oxygen recycler…', 'Oxygen levels rising.', 'The crew will make it, Mission Control.'],
  },
  wrong: {
    title: 'Code rejected',
    lines: ['Code rejected.', 'The recycler cannot restart.', 'Only Life Support still has air.', 'I\'m sorry, Mission Control.'],
  },
  timeout: {
    title: 'Oxygen depleted',
    lines: ['Oxygen depleted.', 'Only Life Support still has air.'],
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
    'Maintenance android, active on Kepler-9 for six years: longer than anyone aboard.',
    'Handles inventory, cleaning and repairs in spaces too tight for people.',
    'Reports in machine log format, always in capitals.',
    'Never off duty.',
  ],
};

// ---------- report voices ----------

// What each person was doing in each starting module (a clause: "Medbay, all night, doing the medicine inventory").
const ACT = {
  hana: { B: 'on the night watch', N: 'going through the pump logs', M: 'reviewing the crew medical files', C: 'auditing the cargo manifest' },
  doyun: { B: 'fixing the navigation console', N: 'on the coolant pumps', M: 'repairing the body scanner', C: 'sorting spare parts' },
  mira: { B: 'covering the night watch', N: 'taking the radiation readings', M: 'doing the medicine inventory', C: 'unpacking the medical supplies' },
  echo: { B: 'SYSTEMS DIAGNOSTICS', N: 'PUMP MAINTENANCE', M: 'STERILISATION CYCLE', C: 'INVENTORY SCAN' },
};

// How a person names a hatch they heard (always the module's hatch on the Corridor).
const HEARD = { B: 'the Bridge\'s corridor hatch', N: 'the Engine Room hatch', M: 'the Medbay hatch' };

// Placeholders: {Mod} bare module name, {mod} with article, {inMod} "on the Bridge" / "in the Medbay", {act}, {Act}, {time}, {target}, {who}, {dst}, {host}.
// ECHO-7 uses upper-case variants: {MOD} {TASK} {HATCH} {WHO} {DST} {HOST}.
const VOICES = {
  hana: {
    quiet: [
      '{Mod}, all night, {act}. Nobody came in, nobody went out. Nothing to report until the alarm.',
      'I held {mod} from 02:00 until the lockdown, {act}. The hatch stayed shut. Nothing unusual.',
      '{Mod}. {Act}, from the start of the shift until the alarm. I didn\'t leave, and no one came in.',
    ],
    heard: [
      '{Mod}, all night, {act}. Around {time} I heard {target} open. Nobody had any reason to be moving at that hour.',
      'I stayed {inMod} until the lockdown, {act}. One thing you should know: around {time}, {target} opened. I heard it clearly.',
      '{Mod}. {Act}, all night. I didn\'t leave. Around {time} I heard {target}. Check it.',
    ],
    visitor: [
      '{Mod}, all night, {act}. Around {time} {who} came in and stayed with me until the lockdown.',
      'I was {inMod} the whole night, {act}. {who} joined me around {time} and was still there at 03:00.',
    ],
    moved: [
      'I started the night {inMod}, {act}. Around {time} I went to {dst} to see {host}, and stayed there until the lockdown.',
      '{Mod} until around {time}, {act}. Then I went to {dst} to join {host}. I was there when the alarm went off.',
    ],
  },
  doyun: {
    quiet: [
      '{Mod}. {Act}. I didn\'t leave. The hatch stayed sealed, nobody came in. That\'s it.',
      'I was {inMod} the whole shift, {act}. Nothing happened in here until the alarm. Can we get on with this?',
      '{Mod}, 02:00 to 03:00, {act}. Didn\'t leave, didn\'t see anyone. Quiet.',
    ],
    heard: [
      '{Mod}. {Act}. I didn\'t leave. Around {time} I heard {target} slam. Ask whoever was in there.',
      'I was {inMod} all night, {act}. Around {time}, {target} cycled. You can\'t miss that sound: the seals hiss.',
      '{Mod}, all night, {act}. Around {time} I heard {target} open. None of my business, but somebody moved.',
    ],
    visitor: [
      '{Mod}. {Act}. Around {time} {who} showed up and stayed until the lockdown. Otherwise, nothing.',
      'I was {inMod} all night, {act}. {who} came in around {time} and didn\'t leave again. Ask {who}.',
    ],
    moved: [
      'Started {inMod}, {act}. Around {time} I went over to {dst} to give {host} a hand. Stayed there until the alarm.',
      '{Mod} until around {time}, {act}. Then {dst}, with {host}. Didn\'t move after that.',
    ],
  },
  mira: {
    quiet: [
      'I was {inMod} all night, {act}. It was a quiet night in here: nobody came in, and I didn\'t go out. I hope everyone is all right.',
      '{Mod}, the whole night, {act}. Nothing happened in here until the alarm. Please tell me the others are safe.',
      'I stayed {inMod}, {act}. The hatch didn\'t open once. It was so quiet I almost dozed off. Is everyone okay?',
    ],
    heard: [
      'I was {inMod} all night, {act}. Around {time} I heard {target} open. I thought someone might be feeling unwell, and I nearly went to check.',
      '{Mod}, the whole night, {act}. Around {time} I heard {target}. At that hour, it worried me. I hope it was nothing.',
      'I didn\'t leave {mod}, {act}. Around {time} I heard {target} open and close. I wish I\'d gone to look.',
    ],
    visitor: [
      'I was {inMod} all night, {act}. Around {time} {who} came by and stayed with me until the alarm. I was glad of the company.',
      '{Mod}, all night, {act}. {who} came in around {time} and kept me company until the lockdown.',
    ],
    moved: [
      'I started the night {inMod}, {act}. Around {time} I went to {dst} to keep {host} company, and stayed there until the alarm.',
      'I was {inMod}, {act}, until around {time}. Then I went over to {dst} to see how {host} was doing. I stayed there.',
    ],
  },
  echo: {
    quiet: [
      '02:00–03:00: {MOD}. TASK: {TASK}. HATCHES: CLOSED. ENTRIES: 0. EXITS: 0.',
      'LOG 02:00–03:00. LOCATION: {MOD}. TASK: {TASK}. NO ENTRIES. NO EXITS. NO ANOMALIES UNTIL ALARM.',
    ],
    heard: [
      '02:00–03:00: {MOD}. TASK: {TASK}. HATCHES: CLOSED. ~{time}: ACOUSTIC EVENT. SOURCE: {HATCH} HATCH.',
      'LOG 02:00–03:00. LOCATION: {MOD}. TASK: {TASK}. ~{time}: HATCH CYCLE DETECTED. SOURCE: {HATCH}. LOCAL HATCH: CLOSED.',
    ],
    visitor: [
      '02:00–03:00: {MOD}. TASK: {TASK}. ~{time}: {WHO} ENTERED. {WHO} PRESENT UNTIL LOCKDOWN.',
      'LOG 02:00–03:00. LOCATION: {MOD}. TASK: {TASK}. ENTRIES: 1 (~{time}, {WHO}). EXITS: 0.',
    ],
    moved: [
      '02:00–~{time}: {MOD}. TASK: {TASK}. ~{time}: RELOCATED TO {DST} TO ASSIST {HOST}. ~{time}–03:00: {DST}.',
      'LOG 02:00–03:00. LOCATION: {MOD}, TASK: {TASK}. ~{time}: TRANSFER TO {DST}. REASON: ASSIST {HOST}. REMAINED IN {DST} UNTIL LOCKDOWN.',
    ],
  },
};

const the = (m) => `the ${MOD_NAME[m]}`;
const inMod = (m) => `${m === 'B' ? 'on' : 'in'} the ${MOD_NAME[m]}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const machineName = (p) => `${PEOPLE[p].name.toUpperCase()} (ID ${PEOPLE[p].id})`;

function fill(tpl, v) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
}

/** The text of one crew member's report in a case. */
export function renderReport(c, p) {
  const r = c.reports[p];
  const type = r.kind === 'moved' ? 'moved' : r.obs.type;
  const pool = VOICES[p][type];
  const rand = prng(`${c.code}:${c.variant}:${p}`);
  const tpl = pool[Math.floor(rand() * pool.length)];
  const act = ACT[p][r.mod];
  const time = r.kind === 'moved' ? r.u : r.obs.t ?? r.obs.u;
  const who = r.obs && r.obs.who;
  const host = r.host;
  return fill(tpl, {
    Mod: MOD_NAME[r.mod], mod: the(r.mod), inMod: inMod(r.mod), act, Act: cap(act),
    time: time === undefined ? '' : fmtTime(time),
    target: r.obs && r.obs.type === 'heard' ? HEARD[r.obs.mod] : '',
    who: who ? PEOPLE[who].short : '', dst: r.dst ? the(r.dst) : '', host: host ? PEOPLE[host].short : '',
    MOD: MOD_NAME[r.mod].toUpperCase(), TASK: ACT.echo[r.mod],
    HATCH: r.obs && r.obs.type === 'heard' ? HATCH_NAME[HATCH_OF[r.obs.mod]].toUpperCase() : '',
    WHO: who ? machineName(who) : '', DST: r.dst ? MOD_NAME[r.dst].toUpperCase() : '', HOST: host ? machineName(host) : '',
  });
}

// ---------- questions ----------

export function questionText(q) {
  const span = `between ${fmtTime(q.a)} and ${fmtTime(q.b)}`;
  if (q.kind === 'hatch') return `Did the ${HATCH_NAME[q.what]} hatch open ${span}?`;
  return `Was there motion in the ${MOD_NAME[q.what]} ${span}?`;
}

// ---------- solution ----------

const n = (c, p) => c.order.indexOf(p) + 1;
const nm = (p) => PEOPLE[p].short;
const tag = (c, p) => `${nm(p)} (report ${n(c, p)})`;

/** Plain-facts solution, generated from the case. Returns { happened[], reports[], question{}, code }. */
export function solutionText(c) {
  const s = c.sab, S = nm(s), m = c.start[s];
  const happened = [];
  happened.push(`${S} was in Life Support at 03:00.`);
  happened.push(`${S} stayed ${inMod(m)} until ${fmtTime(c.t)}, then opened the ${HATCH_NAME[HATCH_OF[m]]} hatch, crossed the Corridor and entered Life Support through the Life Support–Corridor hatch at ${fmtTime(c.t + 1)}. Inside, ${S} disconnected the sensors by hand and, at 03:00, sabotaged the recycler.`);
  happened.push(PEOPLE[s].human
    ? 'Voran Industries paid them to make the recycler test fail.'
    : 'Voran Industries hacked ECHO-7 from outside the station to make the recycler test fail.');
  const sr = c.reports[s];
  if (sr.obs.type === 'heard') {
    happened.push(`${S}'s report was invented: ${HEARD[sr.obs.mod]} did not open around ${fmtTime(sr.obs.t)}.`);
  }
  if (c.witness) {
    happened.push(`${nm(c.witness.who)} told the truth: ${HEARD[c.witness.mod]} really opened at ${fmtTime(c.witness.t)}.`);
  }
  if (c.visit) {
    happened.push(`${nm(c.visit.who)} really did move to ${the(c.visit.dst)} at ${fmtTime(c.visit.u)}, and stayed there with ${nm(c.reports[c.visit.who].host)}: an innocent trip.`);
  }

  const reports = [];
  const [a, b] = c.suspects.slice().sort((x, y) => n(c, x) - n(c, y));
  const accuser = c.suspects.find((p) => c.reports[p].kind === 'stayed' && c.reports[p].obs.type === 'heard');
  if (accuser) {
    const other = c.suspects.find((p) => p !== accuser);
    const target = c.reports[accuser].obs;
    reports.push(`Reports ${n(c, a)} and ${n(c, b)} couldn't both be true. ${tag(c, accuser)} says ${HEARD[target.mod]} opened around ${fmtTime(target.t)}; ${tag(c, other)} says nobody went in or out of ${the(target.mod)} all night.`);
  } else {
    reports.push(`No two reports clashed head-on, but only reports ${n(c, a)} and ${n(c, b)} (${nm(a)} and ${nm(b)}) could hide a trip to Life Support.`);
  }
  const bridge = CREW.find((p) => c.start[p] === 'B');
  for (const p of CREW) {
    if (c.suspects.includes(p)) continue;
    const why = c.exclusions[p];
    if (why.type === 'cargo') reports.push(`${tag(c, p)} was in the Cargo Bay. The only way out is through the Bridge, where ${nm(bridge)} was.`);
    else if (why.type === 'moved') reports.push(`${tag(c, p)} moved to ${the(c.reports[p].dst)}, and ${nm(c.reports[p].host)} confirms it.`);
    else if (why.type === 'hosted') reports.push(`${tag(c, p)} had company from around ${fmtTime(c.reports[why.guest].u)}: ${nm(why.guest)} would have seen ${nm(p)} leave.`);
    else reports.push(`If ${tag(c, p)} were lying, reports ${[why.a, why.b].filter(Boolean).map((x) => n(c, x)).sort().join(' and ')} would still contradict each other.`);
  }

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
