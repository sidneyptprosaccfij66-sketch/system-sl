// "+3 STR" flies from the completed row to the stat anchor (spec §10.3).
import type { StatCode } from '../../game/types';
import { animate, prefersReducedMotion } from './motion';

export async function flyToStat(fromEl: Element | null, stat: StatCode, label: string): Promise<void> {
  if (!fromEl) return;
  const target = document.querySelector(`[data-stat-anchor="${stat}"]`);
  const a = fromEl.getBoundingClientRect();
  const sx = a.left + a.width / 2, sy = a.top + a.height / 2;
  const el = document.createElement('div');
  el.className = 'fly';
  el.textContent = label;
  document.body.appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight;
  const at = (x: number, y: number, s: number) => `translate(${x - w / 2}px, ${y - h / 2}px) scale(${s})`;
  if (!target || prefersReducedMotion()) {
    await animate(el, [{ transform: at(sx, sy, 1), opacity: 0 }, { transform: at(sx, sy - 24, 1.1), opacity: 1, offset: 0.3 }, { transform: at(sx, sy - 48, 1), opacity: 0 }], { duration: 900 });
  } else {
    const b = target.getBoundingClientRect();
    const tx = b.left + b.width / 2, ty = b.top + b.height / 2;
    const mx = (sx + tx) / 2 + (tx > sx ? -40 : 40), my = Math.min(sy, ty) - 80;
    await animate(el, [
      { transform: at(sx, sy, 0.6), opacity: 0 },
      { transform: at(sx, sy - 18, 1.25), opacity: 1, offset: 0.18 },
      { transform: at(mx, my, 1.05), opacity: 1, offset: 0.6 },
      { transform: at(tx, ty, 0.5), opacity: 0.2 },
    ], { duration: 1050, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' });
    target.classList.remove('stat-hit');
    void (target as HTMLElement).offsetWidth;
    target.classList.add('stat-hit');
  }
  el.remove();
}
