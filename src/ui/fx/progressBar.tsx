// Progress bar: transform-only fill with a running sheen; on level change it fills, flashes, restarts.
import { useEffect, useRef } from 'react';
import { animate } from './motion';

export function ProgressBar({ value, level, thin, label }: { value: number; level?: number; thin?: boolean; label?: string }) {
  const fill = useRef<HTMLDivElement>(null);
  const sheen = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const prev = useRef({ value, level });
  const v = Math.max(0, Math.min(1, value));

  useEffect(() => {
    const p = prev.current;
    prev.current = { value: v, level };
    const el = fill.current;
    if (!el) return;
    const from = Math.max(0, Math.min(1, p.value));
    const levelled = level !== undefined && p.level !== undefined && level > p.level;
    const run = async () => {
      if (levelled) {
        await animate(el, [{ transform: `scaleX(${from})` }, { transform: 'scaleX(1)' }], { duration: 450 });
        await animate(flash.current, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 380, fill: 'none' });
        await animate(el, [{ transform: 'scaleX(0)' }, { transform: `scaleX(${v})` }], { duration: 600 });
      } else if (from !== v) {
        await animate(el, [{ transform: `scaleX(${from})` }, { transform: `scaleX(${v})` }], { duration: 700 });
      } else {
        el.style.transform = `scaleX(${v})`;
        return;
      }
      void animate(sheen.current, [{ transform: 'translateX(-120%)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translateX(320%)', opacity: 0 }], { duration: 900, fill: 'none', decorative: true });
    };
    void run();
  }, [v, level]);

  return (
    <div className={`bar${thin ? ' is-thin' : ''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <div ref={fill} className="bar-fill" style={{ transform: `scaleX(${v})` }} />
      <div ref={sheen} className="bar-sheen" />
      <div ref={flash} className="bar-flash" />
    </div>
  );
}
