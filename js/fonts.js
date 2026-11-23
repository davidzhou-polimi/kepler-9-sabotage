// Display font: Jersey 10 (chosen 2026-11-23 from mocks.html). The other candidates stay for comparison:
// ?font=1..4 picks one; with ?dev=1 or ?font=, key F cycles.
export const DISPLAY_FONTS = [
  { n: 1, name: 'Pixelify Sans' },
  { n: 2, name: 'Silkscreen' },
  { n: 3, name: 'Jersey 10' },
  { n: 4, name: 'Press Start 2P' },
];
const KEY = 'k9-display-font';
export const DEFAULT_FONT = 3; // Jersey 10

export function setFont(n, { toast = true } = {}) {
  const f = DISPLAY_FONTS.find((x) => x.n === Number(n)) || DISPLAY_FONTS.find((x) => x.n === DEFAULT_FONT);
  document.documentElement.dataset.font = String(f.n);
  try { localStorage.setItem(KEY, String(f.n)); } catch { /* ignore */ }
  if (toast) showToast(`DISPLAY FONT ${f.n}/4: ${f.name}`);
  return f;
}

function showToast(text) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => el.classList.remove('is-on'), 1600);
}

export function initFontSwitch() {
  const fromUrl = new URLSearchParams(location.search).get('font');
  const dev = new URLSearchParams(location.search).get('dev') === '1';
  // a font picked with F is remembered only on developer URLs: players always get the chosen one
  let saved = null;
  if (dev) { try { saved = localStorage.getItem(KEY); } catch { /* ignore */ } }
  setFont(fromUrl || saved || DEFAULT_FONT, { toast: Boolean(fromUrl) });
  // the key only works on developer URLs: players at the festival must not switch fonts by accident
  if (!dev && !fromUrl) return;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'f' && e.key !== 'F') return;
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target.matches && e.target.matches('input, select, textarea'))) return;
    const cur = Number(document.documentElement.dataset.font) || 1;
    setFont((cur % DISPLAY_FONTS.length) + 1);
  });
}
