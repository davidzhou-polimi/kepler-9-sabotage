# NOVA: Kepler-9 Sabotage

The web app at the centre of the Kepler-9 detective game (cards + app). Static site: HTML, CSS and JavaScript modules, no build, no server, no accounts. After the first visit it works offline (service worker).

## Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Other pages:

| URL | What |
|---|---|
| `/` | The game |
| `/?dev=1` | The game with developer tools (show the solution, skip the briefing, pause or speed up the timer, load a seed, new case) |
| `/?font=1` … `/?font=4` | Display font: 1 Pixelify Sans, 2 Silkscreen, 3 Jersey 10, 4 Press Start 2P. On these URLs and with `?dev=1`, the F key cycles the fonts |
| `/mocks.html` | Key screens side by side in the 4 fonts, on a fixed sample case |

A game in progress is saved in the browser: reloading the page resumes it. The oxygen clock is wall-clock based, so it keeps running while the page is closed.

## Tests

```bash
node --test
```

Generates 3,000 seeded cases (`CASES=10000 node --test` for more) and checks on each one: exactly one false report, the saboteur is a suspect, exactly 2 suspects, solvable with 2 questions, the decisive question really separates the two, every text renders without leftovers. It also prints the cue statistics (who the saboteur is, which report number, who makes accusations).

## Publish on GitHub Pages

```bash
git init -b main
git add .
git commit -m "NOVA prototype"
gh repo create kepler-9-sabotage --public --source=. --push
gh api repos/{owner}/kepler-9-sabotage/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

The site appears at `https://<user>.github.io/kepler-9-sabotage/` after a minute or two. Without `gh`: create the repository on github.com, push, then Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`. On a free account, Pages needs a public repository.

Every later `git push` publishes the new version. Players who already opened the site get it on their next load (the service worker fetches the network first and falls back to its cache after 2.5 s or when offline). When files are added or renamed, update the list in `sw.js` and change `CACHE` (`nova-v2`, …).

## Files

```
index.html          the game
mocks.html          font comparison (js/mocks.js)
css/style.css       palette tokens, windows, buttons, ID cards, red emergency state
js/generator.js     case generator (port of reference/gen.py) and NOVA's answers
js/texts.js         every in-game text: briefing, report voices, profiles, endings, solution
js/ui.js            screens as pure functions (state -> HTML), shared by the game and the mocks
js/app.js           state, events, timer, saving, developer tools
js/portraits.js     16×16 pixel portraits (placeholders)
js/fonts.js         display font switch
js/stars.js         pixel star field
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
