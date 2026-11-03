// Quiet drifting-dust background (≤ 60 particles, pauses when hidden).
import { prefersReducedMotion } from './motion';

export function startBackground(canvas: HTMLCanvasElement): () => void {
  const c = canvas.getContext('2d');
  if (!c) return () => {};
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 0, h = 0, raf = 0, last = 0;
  const N = 56;
  const ps = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.4, v: 0.004 + Math.random() * 0.012, a: Math.random() * Math.PI * 2 }));
  const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const draw = (t: number) => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    c.clearRect(0, 0, w, h);
    for (const p of ps) {
      p.y -= p.v * dt; p.a += dt * 0.8;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(p.a));
      c.beginPath();
      c.fillStyle = `rgba(120, 200, 255, ${tw})`;
      c.arc(p.x * w + Math.sin(p.a * 0.5) * 6, p.y * h, p.r, 0, Math.PI * 2);
      c.fill();
    }
  };
  const loop = (t: number) => { draw(t); raf = requestAnimationFrame(loop); };
  const onVis = () => { cancelAnimationFrame(raf); last = 0; if (!document.hidden && !prefersReducedMotion()) raf = requestAnimationFrame(loop); };
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVis);
  if (prefersReducedMotion()) draw(0); else raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis); };
}
