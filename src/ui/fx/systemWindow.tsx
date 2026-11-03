// The SL "system window": line → unfold → typed text → hold → fold (spec §10.3).
import { useEffect, useRef, useState } from 'react';
import { animate, prefersReducedMotion, wait } from './motion';

export interface SystemWindowProps {
  title: string;
  lines: string[];
  reward?: string;
  tone?: 'accent' | 'danger';
  holdMs?: number;
  onDone?: () => void;
}

export function SystemWindow({ title, lines, reward, tone = 'accent', holdMs = 2200, onDone }: SystemWindowProps) {
  const root = useRef<HTMLDivElement>(null);
  const scan = useRef<HTMLDivElement>(null);
  const all = reward ? [...lines, reward] : lines;
  const full = all.join('\n');
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    let alive = true;
    const el = root.current;
    const reduced = prefersReducedMotion();
    (async () => {
      await animate(el, [{ transform: 'scaleX(0) scaleY(0.02)', opacity: 0 }, { transform: 'scaleX(1) scaleY(0.02)', opacity: 1 }], { duration: 220 });
      await animate(el, [{ transform: 'scaleX(1) scaleY(0.02)' }, { transform: 'scaleX(1) scaleY(1)' }], { duration: 260 });
      void animate(scan.current, [{ transform: 'translateY(0)' }, { transform: 'translateY(360%)' }], { duration: 900, fill: 'none', decorative: true });
      if (reduced) setTyped(full.length);
      else for (let i = 1; i <= full.length && alive; i++) { setTyped(i); await wait(full[i - 1] === '\n' ? 60 : 16); }
      await wait(holdMs);
      if (!alive) return;
      await animate(el, [{ transform: 'scaleX(1) scaleY(1)', opacity: 1 }, { transform: 'scaleX(1) scaleY(0.02)', opacity: 1, offset: 0.6 }, { transform: 'scaleX(0) scaleY(0.02)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
      if (alive) onDone?.();
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  let left = typed;
  const shown = all.map((l) => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; return s; });
  return (
    <div ref={root} className={`syswin panel ${tone === 'danger' ? 'is-danger glow-danger' : 'is-accent glow'}`} role="status" aria-live="polite" aria-label={`${title}. ${all.join('. ')}`}>
      <div className="panel-body">
        <div ref={scan} className="syswin-scan" />
        <div className="syswin-head">
          <span className="syswin-mark" aria-hidden="true">!</span>
          <span className="syswin-title sys">{title}</span>
        </div>
        <ul className="syswin-lines" aria-hidden="true">
          {shown.map((s, i) => <li key={i} className={reward && i === all.length - 1 ? 'syswin-reward' : undefined}>{s}</li>)}
        </ul>
      </div>
    </div>
  );
}
