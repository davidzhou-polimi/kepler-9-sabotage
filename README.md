# NOVA: Kepler-9 Sabotage

The web app at the centre of the Kepler-9 detective game (cards + app). Static site: HTML, CSS and JavaScript modules, no build, no server, no accounts. After the first visit it works offline (service worker).

## Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
python3 tools/serve.py 8000
```

Then open <http://localhost:8000>. It is `python3 -m http.server` with one difference: it tells the browser not to keep the files. With the plain server a browser can go on using an older copy of one module after it changed, and `mocks.html` then stays blank until a forced reload. Other pages:

| URL | What |
|---|---|
| `/` | The game |
| `/?dev=1` | The game with developer tools (show the solution, skip the briefing, pause or speed up the timer, load a seed, new case) |
| `/?font=1` … `/?font=4` | Display font candidates: 1 Pixelify Sans, 2 Silkscreen, 3 Jersey 10 (the chosen one, default), 4 Press Start 2P. On these URLs and with `?dev=1`, the F key cycles the fonts |
| `/mocks.html` | Design boards built from the real screens: open proposals with their choices, and the decided ones with the answers they got |

The whole app is Mission Control's console: one screen with a video effect, and under it a physical bar with the keys, the red CODE key under its guard and the power button (decided 2026-11-24 and 2026-11-25; every board and the words of each decision are in `mocks.html`, frozen in `docs/design/`). The console is empty until NOVA's request is answered with `[ ACCEPT ]`. Then NOVA writes her briefing one line at a time and each thing comes onto the console when she names it: the case notes, the four reports (closed, each opens and closes), the station map, the questions the link will carry, the oxygen clock. A tap on her conversation shows the rest at once. On a laptop the screen has three columns (the clock, the questions and the map on the left; NOVA in the middle; the reports on the right); on a phone the clock and the questions stay on top and the keys choose one channel.

The 10 minutes of oxygen start on `[ ACCEPT ]`, with NOVA's first message (decided 2026-11-23 and confirmed 2026-11-24; the original brief and update 1 started them on a START MISSION button). A question to NOVA is built in her conversation: the place, tapped on the map, then one of the eleven 10-minute windows. The game ends on the solution, whose button leads back to the empty console. The debrief questions are not in the app: they go on the scoreboard sheet (only the 3 questions), with the line asking teams to write their code and who they believed first.

A game in progress is saved in the browser. Opening the page always shows the empty console with NOVA's request: a case left open is offered above it with `[ CONTINUE ]`, and during the game the power button ends it after a confirmation. The oxygen clock is wall-clock based, so it keeps running while the page is closed.

## Tests

```bash
node --test
```

```bash
node tools/render_check.mjs
```

The second one draws every screen of the game on 300 cases (the request, each line of the briefing on each channel, a question step by step, the endings, the solution; laptop and phone) and fails if a value was left unfilled.

Generates 3,000 seeded cases with the Bridge console call on (`CASES=10000 node --test` for more) and checks on each one: exactly one false report; exactly 2 suspects, who are the one pair of reports that can't both be true; that pair is a precise accusation against a plain denial; every question window is 10 minutes long; solvable with 2 questions, and the decisive question really separates the two; a confirmation trap about each suspect; the liar never claims a call; every text renders without leftovers and without sensor data. It also prints the distributions: saboteur, liar form (accusing or denying, overall and per saboteur), report number, story (and liar form within each), saboteur in the Cargo Bay, visits, calls.

## Publish on GitHub Pages

```bash
git init -b main
git add .
git commit -m "NOVA prototype"
gh repo create kepler-9-sabotage --public --source=. --push
gh api repos/{owner}/kepler-9-sabotage/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

The site appears at `https://<user>.github.io/kepler-9-sabotage/` after a minute or two. Without `gh`: create the repository on github.com, push, then Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`. On a free account, Pages needs a public repository.

Every later `git push` publishes the new version. Players who already opened the site get it on their next load (the service worker fetches the network first and falls back to its cache after 2.5 s or when offline). When files are added or renamed, update the list in `sw.js` and change `CACHE` (`nova-v4`, …).

## Files

```
index.html          the game
mocks.html          font comparison (js/mocks.js)
css/style.css       palette tokens, windows, buttons, ID cards, red emergency state
js/generator.js     case generator (port of reference/gen.py) and NOVA's answers
js/texts.js         every in-game text: briefing, report voices, profiles, endings, solution
js/ui.js            screens as pure functions (state -> HTML), shared by the game and the mocks
js/app.js           state, events, timer, saving, developer tools
js/console.js       the app as Mission Control's console: the screen and the physical bar
css/console.css     its styles
js/winfx.js         how things arrive: a window opens from a line and is typed in, NOVA's lines are typed
tools/render_check.mjs  draws every screen on many cases and looks for unfilled values
tools/serve.py      local server that never lets the browser keep old files
tools/portraits.py  redraws the group's portraits as true pixel art (needs Pillow, numpy, scipy)
js/portraits.js     the crew portraits (img/crew/, made by tools/portraits.py from reference/portraits/)
js/fonts.js         display font switch
js/typing.js        NOVA typing effect
sw.js               offline cache
fonts/              self-hosted Google Fonts (latin), made by tools/fetch_fonts.py
reference/gen.py    the reference generator, as received
test/               generator tests
```

## Case generator

Time runs in minutes from 02:00. Every case comes from its code (`K9-` + 4 characters without 0/O, 1/I/L), with a seeded PRNG: the same code always gives the same case.

On top of `gen.py`, the changes asked for in the brief: ECHO-7 can be the saboteur; a saboteur starting in the Cargo Bay is excluded; whoever's report says they moved can't be the liar; an honest accusation must match a real hatch opening; only cases with exactly 2 suspects that 2 questions always solve; liar style "quiet" or "accuser"; optional innocent visit; times shown rounded to 5 minutes.

Further choices, made while porting:

- **Honest witnesses.** In `gen.py` only the liar ever says they heard a hatch, so whoever accuses would always be lying. Now, when the liar keeps quiet, an innocent can report a hatch they really heard (the saboteur's). The odds are tuned so that, among the cases with an accusation, it comes from the liar about half the time (the tests print the figure).
- **Whoever had a visitor can't be the liar.** The visitor arrives before anyone leaves for Life Support and would see them go: the same reasoning as the Cargo Bay rule. `gen.py` counted them as suspects. As a result, the only visits that survive are those between the Bridge and the Cargo Bay (any other one would leave a single suspect).
- **A visit can't cross an occupied module.** From the Cargo Bay you only go to the Bridge, and to the Cargo Bay only from the Bridge.
- **The report order changes every case.** Otherwise the report number would always be the same for each person, and the code would just be the ID.
- **The question builder has no place preselected**, so the app doesn't point anywhere.

Update 1 (2026-11-24):

- **Bias ingredients.** The saboteur (each of the 4, ECHO-7 included, a quarter of the time) and the liar's form are drawn first, then the case is resampled with them fixed until valid. The 2 suspects are always the one pair of reports that can't both be true: a precise accusation (someone heard a hatch, with a time) against a plain denial (a quiet night) from whoever was behind that hatch. The liar is the accuser or the denier, 50/50. Every case has a confirmation trap about each suspect: a question on their own module that gets the same answer whichever of the two is lying (stored in `traps`).
- **Voices** live in `js/texts.js` (`VOICES`), built from the group's Case 01. A report is opening + Bridge call (if any) + observation + closing line, all from the character's pools, so a false report reads like a true one. Reports never quote sensor data. ECHO-7's role label is the constant `ECHO_ROLE` in `js/generator.js`.
- **Bridge console call.** When it is on (tests only), in some cases of the *heard* story the Bridge occupant, always innocent, had a 10-minute scheduled call with Mission Control and says so in the report; the liar never claims a call. NOVA answers calls from the case data. In a world where the Bridge occupant would be the liar, the console can only have been in use before they left, so the solver never treats a call question as decisive unless it really is. **Off in the game** (`CALLS_IN_GAME` in `js/generator.js`) and rejected on 2026-11-24; the code is still there.

After update 1 (2026-11-24):

- **Questions cover 10 minutes.** The windows a case is built and solved with are exactly 10 minutes long, moved along the hour (`QUESTION_WINDOW` in `js/generator.js`): 11 positions per sensor. The game offers those eleven windows and nothing else.
- **Bridge to Cargo Bay** goes through the direct hatch, no longer out into the Corridor and back.
- **Three stories** (2026-11-25), so that cases are not all solved the same way. Each case draws one, a third of the time each (`STORIES` in `js/generator.js`), with the saboteur and the liar's form drawn as before and 50/50 within each story:
  - *heard*: someone heard the denier's corridor hatch open at a time (the shape of update 1). Solved by asking about that hatch at that time.
  - *knock*: someone went out to the denier's hatch at a time, knocked, nobody answered, and went back. True only if the denier had already left, at least 5 minutes before; so it is solved by asking about the denier's hatch *before* the knock, or motion in their module after. The hatch from the knock time on answers "no" whichever of the two lies (a trap, checked by the tests).
  - *seen*: the Bridge occupant saw the Cargo Bay occupant come through and go out into the Corridor. Solved by asking about the Cargo Bay–Bridge hatch at that time.
  Two rules of the original brief change with them: the saboteur can start in the Cargo Bay, in the *seen* story only (anywhere else the Bridge occupant would have seen them go); and whoever knocked went out and back, yet can be the liar (their report still says where they were; visits keep the old rule). Visits and the Bridge call only come with the *heard* story.
- **Tone** (2026-11-25). In each voice the denial, the accusation and the closing line come in two versions (`VOICES` in `js/texts.js`): *over*, which explains too much or insists and sounds like a liar, and *plain*, which says just what is needed and sounds sincere, in the same character's voice. In every case one of the two suspects speaks *over* and the other *plain*, 50/50 whoever lies (`c.tone`, with its own seed; the tests check both). The other two draw theirs freely.
- **A second clue** (2026-11-25), so that the reports don't say at once what to ask. In every case one of the two who are not suspects tells something true whichever suspect lies (`c.herring`): they heard the Life Support hatch open, or footsteps in the Corridor, around the time someone went into Life Support. NOVA can't answer about the Life Support hatch, and the Corridor around that time answers the same for both suspects in 97% of the windows (the tests print it). In a case with a visit, the visit is the second clue.
