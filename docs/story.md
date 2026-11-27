# Kepler-9 Sabotage – The complete story

## The test

Kepler-9 is a research station in orbit. It is testing a new oxygen recycler, built to keep a crew alive in space for years without resupply.

Voran Industries runs the test. It runs it on several Kepler-9 stations at the same time.

A rival company wants the test to fail, and it has someone on the inside. On the evening of the test, a man watches the news announce Voran's test and says: "The test cannot succeed. We have someone on the inside."

## Mission Control

The players are the night shift of Voran's Mission Control, the only link between Earth and the stations. They can reach a station only through NOVA, the station's AI.

Mission Control follows more than one station. On the night of the test it receives alerts from several NOVAs at once. Each alert is a separate case with its own case number.

The web app is Mission Control's console, in contact with NOVA.

## The crew

- Hana Sato · Captain · ID 14
- Doyun Park · Engineer · ID 27
- Mira Costa · Medical Officer · ID 55
- ECHO-7 · Maintenance android · ID 71

## The station

- **Hatches** between modules are mechanical and recognise no one.
- **Sensors** in each module record only hatch openings (which hatch and when) and motion (yes or no). They never record names.
- **Sensor logs** are written once, like a black box. A sensor can be switched off, but what it has already recorded can't be rewritten. To switch off a module's sensors, someone has to disconnect them by hand, from inside that module.
- **Biometrics** exist only on the command consoles, and every console action records who did it. So a saboteur avoids the consoles.
- **The reserve oxygen tanks** are in Life Support.

## The night

At 03:00, someone in Life Support sabotages the oxygen recycler. It shuts down, damaged but not destroyed: it can still be restarted.

Before that, the saboteur disconnected the Life Support sensors by hand, from inside. They also damaged the link between the station and Mission Control.

At 03:00 the emergency lockdown starts on its own. It is mechanical and not connected to the network. Every module seals, and everyone stays where they were. Whoever is sealed in Life Support is next to the reserve tanks and will survive. Nobody else will. The crew has 10 minutes of oxygen.

## NOVA calls Mission Control

NOVA calls Mission Control, and Mission Control accepts the transmission. NOVA explains what happened, why she needs the lockout code (see «Why NOVA needs the code»), and says the countdown has already started.

NOVA asked each crew member where they were. Their written reports arrive at the console one at a time. Exactly one report is false: the saboteur's.

Some reports explain why someone moved: knocking on a hatch to get a checklist signed, picking up a part, delivering the medical log, going to help someone. True and false reports give these reasons in the same way.

The station has no record of calls. The sensors record hatches and motion, nothing else. A report can't claim a call with Mission Control, because Mission Control would know whether that call happened.

No report claims a console action, true or false: every console action records who did it, so NOVA would know at once, same as calls. Reports describe hands-on tasks that need no console login, like checking wiring or a part by hand.

## The damaged link

The damaged link will carry only 2 questions and one lockout code.

- NOVA answers yes or no, and only about sensor data.
- NOVA refuses questions about names, report numbers or Life Support. A refused question has already been sent, so it still uses one of the 2.

## Why NOVA needs the code

- NOVA can restart the recycler from the station. But the saboteur is sealed in Life Support, right next to it, and would shut it down again.
- So NOVA has to lock the saboteur out first. NOVA can't lock out the whole crew: its safety protocol lets it revoke access for one person only, and only on Mission Control's order. Deciding who is guilty is up to the humans.
- The saboteur works by hand, not as a hacker, so once locked out they can't get around it. After the restart, the recycler controls respond only to authorised access, and NOVA seals the maintenance panel.
- If the saboteur is ECHO-7, locking it out means NOVA shuts the android down.
- The lockout code is the number of the false report followed by the saboteur's ID. For example, report 2 and ID 27 give 227. The ID tells NOVA whom to lock out. There is one attempt, because the link carries one code only.
- Mission Control's console knows who is on the crew and who wrote each report, and it checks the code before sending it, because the link carries few transmissions. If the code has a report number that doesn't exist (there are only reports 1 to 4) or an ID that isn't on the crew, or a report number that doesn't match the ID, the console flags it and doesn't send it, so the attempt isn't used.

## How it ends

- **Right code:** NOVA locks out the saboteur and restarts the recycler. The restart holds, oxygen rises, and the crew will make it. Mission successful.
- **Wrong code:** NOVA locks out the wrong person and restarts the recycler. The saboteur shuts it down again from inside Life Support, and only Life Support still has air. Mission failed.
- **Time up:** the oxygen runs out everywhere except Life Support. Mission failed.

After the ending, the console shows what really happened in that case:
- who was in Life Support, and the route they took;
- how the rival company got them;
- that locking them out was the only way to keep the recycler running, and after a wrong code who was locked out by mistake;
- which 2 reports couldn't both be true;
- one question that would have settled it;
- the right code.

## The saboteur

Any of the four can be the saboteur, and it changes from case to case. Only the solution says how the rival company got them:
- a human was paid by the rival company;
- ECHO-7 was hacked by the rival company from outside the station.

Nothing in the game ever points to the culprit. Nobody is always the honest one: whoever seems calm, authoritative, precise, abrupt or accusing sometimes lies and sometimes doesn't.
