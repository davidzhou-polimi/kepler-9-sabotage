# Design record

`mocks.html` draws its boards from the live code, so an earlier attempt changes whenever the code changes. The images here are the record: each dated folder freezes every board as it looked that day, one image per board (proposals, choices, the user's answers in their own words).

Freeze a new round after each decision:

```bash
python3 tools/serve.py 8765
```

```bash
node tools/snapshot_mocks.mjs
```

The script drives a local headless Chromium (the one Playwright installs in `~/.cache/ms-playwright`, or `CHROME=/path`) with reduced motion, so animated boards come out still. Output: `docs/design/<today>/NN-<board>.webp`.

## 2026-11-23

First freeze, taken at the end of the day: the boards decided earlier in the day (reset, reports, last minute, buttons, map questions, briefing, font) were captured from that evening's code, so details that changed after their decision show the later version (for example the solution ends with NEW GAME in the buttons board, which was shown with DEBRIEF). From here on, each round is frozen when it is decided.

## 2026-11-24

Hologram map (C) and home (B) decided; captured from a clean copy of the commit that brings them into the game, so the boards show only decided work.

## 2026-11-24-console

Second freeze of the day. Decided: the physical console (B) and the CRT glass, always, over the whole viewport. Their boards carry the corrections asked with the choice. Open: the third console round (the physical console with today's status bar, keys in one row, the power button for QUIT), the windows after the group's game cards, and the Bridge console call.

## 2026-11-24-deck

Third freeze of the day. The third console round goes back with corrections (no monitors around the windows, the video effect off the hardware, a richer physical bar), and the Bridge console call is rejected: both boards carry the words. Open: the fourth round (one screen with today's windows and the physical bar, in three versions), the windows after the game cards, now on that screen, the reports after the crew cards, and the control for the time window of a question. Done: the crew portraits as true pixel art, with the comparison against the pictures received.

## 2026-11-24-choices

Fourth freeze of the day. Decided: the console with the tube and the dark keys (A), the windows with the title in a tab (B), the reports as crew cards with the card first (C), the time line for the time window (A). Open: how the tab windows are decorated after the two cards received (and whether the reports keep a window around them), with everything chosen shown together; the time window free or of fixed length, with the measurement on 3000 cases; the hologram, second round.

## 2026-11-24-nesting

Fifth freeze of the day. Decided: the time window is 10 minutes long and is only moved; the hologram with walls of light and upright names. Open: the tab windows decorated after the cards; the reports without a frame inside a frame; the physical bar without the needle gauge; how the 10-minute window is moved, since the slider was not liked.

## 2026-11-24-terminal

Sixth freeze of the day. Decided: the reports as cards without a window around them; the bar with the lamps, the grille and the plate, the lamps as LEDs (shown as done). Superseded, with the words: the decoration of the tab windows, and the control of the 10-minute window (it goes into the new ASK NOVA). Open: ASK NOVA as a chat in a terminal; what is written under the map; the home as the home of a console, without the words of a game. In the game since this round: lines that start with the prompt mark wrap under their text.
