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
| `/mocks.html` | Design boards built from the real screens: open proposals with their choices, and the decided ones (reset, reports, last minute, font) |

A game in progress is saved in the browser. Opening the page always shows the home: an open saved game is offered with `[ CONTINUE ]` next to `[ NEW GAME ]`, and during the game `[ QUIT ]` in the top bar ends it after a confirmation. The oxygen clock is wall-clock based, so it keeps running while the page is closed.

`[ NEW GAME ]` opens the investigation on the BRIEFING tab, and the 10 minutes of oxygen start right away, with NOVA's first message (decided 2026-11-23 and confirmed 2026-11-24; the original brief and update 1 started them on a START MISSION button). The game ends on the solution with `[ NEW GAME ]`. The debrief questions are not in the app: they go on the scoreboard sheet (only the 3 questions), with the line asking teams to write their code and who they believed first.

## Tests

```bash
node --test
```

Generates 3,000 seeded cases with the Bridge console call on (`CASES=10000 node --test` for more) and checks on each one: exactly one false report; exactly 2 suspects, who are the one pair of reports that can't both be true; that pair is a precise accusation against a plain denial; solvable with 2 questions, and the decisive question really separates the two; a confirmation trap about each suspect; the liar never claims a call; every text renders without leftovers and without sensor data. It also prints the distributions: saboteur, liar form (accusing or denying, overall and per saboteur), report number, visits, calls.

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
js/console.js       the app as Mission Control's console (proposals in mocks.html, not in the game yet)
css/console.css     its styles
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
- **Bridge console call.** In about a fifth of the cases the Bridge occupant, always innocent, had a 10-minute scheduled call with Mission Control and says so in the report; the liar never claims a call. NOVA answers calls from the case data. In a world where the Bridge occupant would be the liar, the console can only have been in use before they left, so the solver never treats a call question as decisive unless it really is. **Off in the game** (`CALLS_IN_GAME` in `js/generator.js`, `callUi` in `js/app.js`) until the question-builder design is chosen on the "calls" board of `mocks.html`.
