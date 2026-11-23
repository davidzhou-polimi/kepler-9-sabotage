// Display font candidates (not chosen yet). Dev switch: ?font=1..4 picks one; with ?dev=1 or ?font=, key F cycles.
export const DISPLAY_FONTS = [
  { n: 1, name: 'Pixelify Sans' },
  { n: 2, name: 'Silkscreen' },
  { n: 3, name: 'Jersey 10' },
  { n: 4, name: 'Press Start 2P' },
];
const KEY = 'k9-display-font';

export function setFont(n, { toast = true } = {}) {
  const f = DISPLAY_FONTS.find((x) => x.n === Number(n)) || DISPLAY_FONTS[0];
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
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* ignore */ }
  setFont(fromUrl || saved || 1, { toast: Boolean(fromUrl) });
  // the key only works on developer URLs: players at the festival must not switch fonts by accident
  const params = new URLSearchParams(location.search);
  if (params.get('dev') !== '1' && !fromUrl) return;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'f' && e.key !== 'F') return;
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target.matches && e.target.matches('input, select, textarea'))) return;
    const cur = Number(document.documentElement.dataset.font) || 1;
    setFont((cur % DISPLAY_FONTS.length) + 1);
  });
}
