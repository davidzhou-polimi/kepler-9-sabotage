// Typing effect for NOVA's lines. Each block types once (remembered by key), then shows in full on re-render.
// A tap on a block that is still typing shows it in full.
const done = new Set();

export function typeIn(root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('.type-me').forEach((el) => {
    const key = el.dataset.typeKey || el.textContent.slice(0, 60);
    if (reduce || done.has(key)) return;
    done.add(key);
    const targets = el.matches('p') ? [el] : [...el.querySelectorAll('p')];
    const texts = targets.map((p) => p.textContent);
    targets.forEach((p) => { p.textContent = ''; });
    let i = 0, j = 0, timer = 0;
    const finish = () => {
      clearTimeout(timer);
      targets.forEach((p, k) => { p.textContent = texts[k]; p.classList.remove('is-typing'); });
      i = targets.length;
      el.removeEventListener('click', finish);
    };
    el.addEventListener('click', finish);
    const step = () => {
      if (!el.isConnected || i >= targets.length) return;
      const p = targets[i];
      p.classList.add('is-typing');
      j = Math.min(texts[i].length, j + 2);
      p.textContent = texts[i].slice(0, j);
      if (j >= texts[i].length) {
        p.classList.remove('is-typing');
        i++; j = 0;
        if (i >= targets.length) { el.removeEventListener('click', finish); return; }
        timer = setTimeout(step, 140);
      } else timer = setTimeout(step, 16);
    };
    step();
  });
}
