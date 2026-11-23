// Pixel star field behind the interface. Static when the user prefers reduced motion.
export function initStars(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const PX = 3; // size of one star pixel in CSS px
  let stars = [];
  let w = 0, h = 0;

  function seedStars() {
    const dpr = 1;
    w = Math.ceil(window.innerWidth / PX);
    h = Math.ceil(window.innerHeight / PX);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const count = Math.round((w * h) / 260);
    let s = 12345;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    stars = Array.from({ length: count }, () => ({
      x: Math.floor(rnd() * w), y: Math.floor(rnd() * h),
      kind: rnd() < 0.06 ? 'cross' : rnd() < 0.12 ? 'diamond' : 'dot',
      base: 0.25 + rnd() * 0.6, speed: 0.4 + rnd() * 1.6, phase: rnd() * 6.28,
      tint: rnd() < 0.25 ? '168,180,255' : rnd() < 0.15 ? '67,217,210' : '231,237,244',
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const st of stars) {
      const a = reduce.matches ? st.base : st.base * (0.55 + 0.45 * Math.sin(st.phase + (t / 1000) * st.speed));
      ctx.fillStyle = `rgba(${st.tint},${a.toFixed(3)})`;
      const { x, y } = st;
      if (st.kind === 'dot') ctx.fillRect(x, y, 1, 1);
      else if (st.kind === 'diamond') { ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
      else { ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5); }
    }
  }

  let raf = 0, last = 0;
  function loop(t) {
    if (t - last > 120) { draw(t); last = t; } // a slow twinkle is enough
    raf = requestAnimationFrame(loop);
  }
  function start() {
    cancelAnimationFrame(raf);
    seedStars();
    if (reduce.matches) draw(0);
    else raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', start);
  reduce.addEventListener('change', start);
  start();
}
