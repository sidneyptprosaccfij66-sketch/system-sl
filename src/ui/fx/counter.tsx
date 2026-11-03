// Number that rolls to its new value (monospace digits do not jump).
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './motion';

export function Counter({ value, duration = 900, format = (n: number) => n.toLocaleString('ru-RU') }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
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
