// Full-screen PENALTY scene: red flash, shake, glitch title, stripes (spec §10.3).
import { useEffect, useRef } from 'react';
import { animate } from './motion';

export interface PenaltyView {
  severityLabel: string;
  reasons: string[];
  restrictions: string[];
  until: string;
}

export function PenaltyScene({ view, onDone }: { view: PenaltyView; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const tint = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void animate(root.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    void animate(tint.current, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0.35 }], { duration: 1200 });
    void animate(card.current, [{ transform: 'scale(1.08)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380 }).then(() =>
      animate(card.current, [0, -10, 9, -7, 5, -3, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 420, easing: 'linear', decorative: true }));
  }, []);
  return (
    <div ref={root} className="scene scene-penalty" role="dialog" aria-label="PENALTY">
      <div ref={tint} className="scene-tint" />
      <div ref={card} className="penalty-card panel is-danger glow-danger">
        <div className="panel-body">
          <div className="penalty-stripes" />
          <div className="penalty-inner">
            <div className="sys glitch" data-text="PENALTY">PENALTY</div>
            <p className="muted" style={{ margin: '8px 0 0' }}>{view.severityLabel}</p>
            <ul className="penalty-list">
              {view.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <p className="muted" style={{ margin: '16px 0 4px' }}>Назначено</p>
            {view.restrictions.length === 0
              ? <p className="penalty-restriction" style={{ margin: 0 }}>Только Penalty Zone</p>
              : view.restrictions.map((r, i) => <p key={i} className="penalty-restriction" style={{ margin: '0 0 4px' }}>{r}</p>)}
            <p className="muted" style={{ margin: '12px 0 0' }}>Срок: {view.until}. Пока штраф не отбыт, всё даёт ×0.5.</p>
            <button className="btn is-danger" style={{ marginTop: 18, width: '100%' }} onClick={onDone}>Принято</button>
          </div>
        </div>
      </div>
    </div>
  );
}
