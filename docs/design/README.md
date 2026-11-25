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

## 2026-11-25

Decided: the window is NOVA ON KEPLER-9 and NIGHT SHIFT is gone everywhere (in the game too); the map inside NOVA's conversation has no projector; on the bar the tape closes round the CODE key and the plate is a metal nameplate. The first terminal chat goes back with the words. Open: the LEDs on the bar, in two drawings with depth (the first try, a flat capsule, was thrown out); how NOVA's channel opens (quiet, or with the whole conversation); what is written under the map; the home as the home of a console.

Later the same day. Decided: the LEDs pushed out like the keys, without their halo; NOVA's channel holding the whole conversation, names aligned on one column, no tab on its window; the map text as a terminal readout, without a legend; each report a window with its tab. The home goes back with the words: it becomes NOVA's request, and the console fills up after it is accepted. Shown as a storyboard: the request, the case notes written as NOVA speaks, the reports attached as lines of text, the QUESTIONS and OXYGEN windows appearing when she names them. Done and to check: buttons with two opposite corners cut, the map readout in the words of a console.

## 2026-11-25-centre

Third freeze of the day; only the four boards that changed or are new (the others are as in `2026-11-25`). Changed with the words: the console's layout on a laptop, with NOVA's channel in the middle column from the start, the meters and under them the map (or the case, or the code) on its left, the reports on its right; before, NOVA stood on the left. Sent back: the closed report (the window's tab squeezed into one line) and the way the text arrives in the combined window effect. Open: what stays under the meters once NOVA has finished (the map, or the case notes); the closed report, in three drawings (a plain strip with cut corners, a line of text, the tab alone); how the text arrives in a window that has opened from a line (printed row by row, lit at once, written by a line of light).

## 2026-11-25-typed

Fourth freeze of the day; only the five boards that changed or are new. Decided: under the meters, once NOVA has finished, the map takes the place of the case notes (A); the closed report is a plain strip with cut corners (A), its + the same square as the − and at the same place, so the strip is 54 px tall; a window opens from a line and what is inside is typed in (D, corrected with the words: text typed letter by letter, a bar loading from left to right, the map coming up as a hologram). Changed with the words: the case notes hold one fact per line, with the name of each note on the left, and the window under the meters ends where NOVA's conversation ends, on any screen. Open: the top edge of NOVA's conversation once it has been scrolled, in three drawings (the text fades under the title, a line under the title, the title on a filled band). The images are still: the typed arrival and the hologram are seen in `mocks.html` with «Riguarda».

## 2026-11-25-game

Fifth freeze of the day; only the six boards that changed or are new. Everything decided so far is in the game: the console that fills up after NOVA's request is accepted, on a laptop and on a phone (the storyboard, now marked as done, with the request offered again when a case was left open). Decided: what scrolls under the title of a window fades out («vai con lo sfumato»). Open, asked on 2026-11-25: the console and its monitor drawn in pixel art; the reports column ending where NOVA's window ends (the gaps grow, or the open reports take the room); the map window when nothing is selected (as tall as its content, Life Support already selected, or the readout at the bottom with the model in the middle); the member's block at the top of a report (the ID and the file on the right, the file as a key, or a sheet of fields).

## 2026-11-25-pace

Sixth freeze of the day; only the nine boards that changed or are new. Decided, with the words: the console and its monitor stay as they are, not in pixel art; the reports column stays as it is, and the windows of the left column become as tall as what is in them («facciamo che anche i pannelli a sinistra hug content, così a destra i report non tocchiamo più e lasciamo così come sono oggi»); the map window fits its content and comes with Life Support selected; in an open report, who it is on the left, the ID and the way to the personnel file on the right. In the game since this freeze, asked for in words: the oxygen starts with the last line of NOVA's briefing; each case note is written when she has finished its line; the reports come one at a time and are named «REPORT 01: MIRA»; a window that changes place slides there; buttons are not typed; under the mouse the station model lies flat and the place under the pointer lights up; the code is typed in the display font; the page of the game no longer scrolls on a phone. Open: NOVA's pace (`02-pace`: its frames play the game itself, so in the image they are empty; open the board), a case left open when the page is opened again, the archive of the closed cases, the font of the long texts.

## 2026-11-25-title

Seventh freeze of the day; only the five boards that are new or changed. Corrected in the game, with the words: NOVA's conversation stands on the same ground as every other window (its body had a darker ground of its own, which ended under the title with a sharp edge and faded when the conversation was scrolled). Open, asked on 2026-11-25: the title MISSION CONTROL on the empty console, on one line or two, and how it leaves when the transmission is accepted; the title of the endings, kept smaller or dropped; the code at the end of the reports column and typed as a terminal line, or in NOVA's conversation. The font board gains the personnel file («Anche il test dei profili dei membri è col font sbagliato»). The new words (the endings, the name of the code, its button, the power-off dialog) are proposed in chat, not in the boards.
