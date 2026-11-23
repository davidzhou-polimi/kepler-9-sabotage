# Design record

`mocks.html` draws its boards from the live code, so an earlier attempt changes whenever the code changes. The images here are the record: each dated folder freezes every board as it looked that day, one image per board (proposals, choices, the user's answers in their own words).

Freeze a new round after each decision:

```bash
python3 -m http.server 8765
```

```bash
node tools/snapshot_mocks.mjs
```

The script drives a local headless Chromium (the one Playwright installs in `~/.cache/ms-playwright`, or `CHROME=/path`) with reduced motion, so animated boards come out still. Output: `docs/design/<today>/NN-<board>.webp`.

## 2026-11-23

First freeze, taken at the end of the day: the boards decided earlier in the day (reset, reports, last minute, buttons, map questions, briefing, font) were captured from that evening's code, so details that changed after their decision show the later version (for example the solution ends with NEW GAME in the buttons board, which was shown with DEBRIEF). From here on, each round is frozen when it is decided.
