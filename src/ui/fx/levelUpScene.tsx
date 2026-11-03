// Full-screen LEVEL UP / RANK UP scene (spec §10.3).
import { useEffect, useRef } from 'react';
import type { Rank } from '../../game/types';
import { animate, wait } from './motion';
import { RankBadge } from './rankBadge';

export function LevelUpScene({ variant, from, to, onDone }: { variant: 'level' | 'rank'; from: number | Rank; to: number | Rank; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLSpanElement>(null);
  const oldN = useRef<HTMLSpanElement>(null);
  const newN = useRef<HTMLSpanElement>(null);
  const badge = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const word = variant === 'level' ? 'LEVEL UP' : 'RANK UP';
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  useEffect(() => {
    let alive = true;
    (async () => {
      await animate(root.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
      void animate(ring.current, [{ transform: 'scale(0.2)', opacity: 0.9 }, { transform: 'scale(5)', opacity: 0 }], { duration: 1400, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', decorative: true });
      const chars = Array.from(title.current?.querySelectorAll('.ch') ?? []);
      chars.forEach((c, i) => void animate(c, [{ transform: 'scaleY(0.04) translateY(-6px)', opacity: 0 }, { transform: 'scaleY(1.25)', opacity: 1, offset: 0.6 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 420, delay: 60 * i }));
      await wait(60 * chars.length + 300);
      void animate(oldN.current, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-100%)', opacity: 0 }], { duration: 420 });
      await animate(newN.current, [{ transform: 'translateY(0)', opacity: 0 }, { transform: 'translateY(-100%)', opacity: 1 }], { duration: 420 });
      if (badge.current) await animate(badge.current, [{ transform: 'scale(1.6) rotate(-8deg)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 520 });
      await wait(1500);
      if (!alive) return;
      await animate(root.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 360 });
      if (alive) finish();
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={root} className="scene scene-levelup" role="dialog" aria-label={`${word}: ${from} → ${to}`} onClick={finish}>
      <div ref={ring} className="scene-ring" />
      <div className="scene-center">
        <span ref={title} className="scene-title" aria-hidden="false">
          {Array.from(word).map((c, i) => <span key={i} className="ch">{c === ' ' ? ' ' : c}</span>)}
        </span>
        {variant === 'level' ? (
          <div className="scene-num" aria-hidden="true">
            <span ref={oldN}>Lv {from}</span>
            <span ref={newN}>Lv {to}</span>
          </div>
        ) : (
          <div>
            <div ref={badge} className="scene-rank-wrap"><RankBadge rank={to as Rank} size="scene" /></div>
            <div className="scene-sub" style={{ color: 'var(--text)' }}>Ранг {from} → {to}</div>
          </div>
        )}
        <div className="scene-sub">Нажми, чтобы продолжить</div>
      </div>
    </div>
  );
}
