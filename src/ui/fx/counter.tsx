// Number that rolls to its new value (monospace digits do not jump).
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './motion';

/** `from` sets the starting number on first render (e.g. 0 for a count-up intro). */
export function Counter({ value, from: start0, duration = 900, format = (n: number) => n.toLocaleString('ru-RU') }: { value: number; from?: number; duration?: number; format?: (n: number) => string }) {
  const initial = start0 === undefined || prefersReducedMotion() ? value : start0;
  const [shown, setShown] = useState(initial);
  const from = useRef(initial);
  useEffect(() => {
    const start = from.current;
    if (start === value || prefersReducedMotion()) { from.current = value; setShown(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(start + (value - start) * e);
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="num">{format(shown)}</span>;
}
