// Freeze the mock boards as images, so each round stays as it was shown.
// mocks.html draws its boards from the live code, so earlier attempts change when the code changes:
// these images are the record.
//
// Usage (with the site served locally, e.g. python3 -m http.server 8765):
//   node tools/snapshot_mocks.mjs [url] [out-dir]
// Defaults: http://127.0.0.1:8765/mocks.html and docs/design/<today>.
// Needs a Chromium: the headless shell installed by Playwright (~/.cache/ms-playwright), or CHROME=/path.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:8765/mocks.html';
const today = new Date().toISOString().slice(0, 10);
const out = process.argv[3] || join('docs', 'design', today);
const PORT = 9333;
const WIDTH = 1600;

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(base)) throw new Error('No Chromium found: set CHROME=/path/to/chrome');
  for (const d of readdirSync(base).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse()) {
    for (const sub of readdirSync(join(base, d))) {
      const bin = join(base, d, sub, 'chrome-headless-shell');
      if (existsSync(bin)) return bin;
    }
  }
  throw new Error('No Chromium headless shell found: set CHROME=/path/to/chrome');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(findChrome(), [`--remote-debugging-port=${PORT}`, '--headless', '--hide-scrollbars', `--window-size=${WIDTH},1000`, 'about:blank'], { stdio: 'ignore' });

try {
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    await sleep(200);
    try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
  }
  if (!page) throw new Error('Chromium did not start');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: false });
  // still images: no flicker, sway or blinking timer
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url });
  for (let i = 0; i < 50; i++) { await sleep(200); if (await evaluate("document.readyState === 'complete' && document.querySelectorAll('.board').length > 0")) break; }
  await evaluate('document.fonts.ready.then(() => true)');
  await sleep(500);

  // The frames of the open boards never say a word of a game: the console is Mission Control's (2026-11-26, after NEW
  // GAME was shown in a new board: «è VIETATO»). The boards already answered are the record of how things were.
  const said = await evaluate(`[...document.querySelectorAll('.board.is-open .mock-frame')].flatMap((f) => {
    const m = (f.innerText + ' ' + [...f.querySelectorAll('[aria-label]')].map((x) => x.getAttribute('aria-label')).join(' ')).match(/\\b(games?|players?|play again|quit)\\b/i);
    return m ? [f.closest('.board').id + ': ' + m[0]] : [];
  })`);
  if (said.length) { console.error('A word the console never says, in an open board:\n  ' + said.join('\n  ')); process.exitCode = 1; }

  const boards = await evaluate(`[...document.querySelectorAll('.board')].map((b) => {
    const r = b.getBoundingClientRect();
    return { id: b.id, x: 0, y: r.top + scrollY, w: Math.ceil(Math.max(document.documentElement.scrollWidth, b.scrollWidth)), h: Math.ceil(r.height) };
  })`);
  mkdirSync(out, { recursive: true });
  for (const [i, b] of boards.entries()) {
    if (b.id === 'summary') continue;
    const shot = await send('Page.captureScreenshot', {
      format: 'webp', quality: 92, captureBeyondViewport: true,
      clip: { x: b.x, y: b.y, width: Math.min(b.w, 2400), height: b.h, scale: 1 },
    });
    const file = join(out, `${String(i + 1).padStart(2, '0')}-${b.id}.webp`);
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('saved', file);
  }
  ws.close();
} finally {
  chrome.kill();
}
