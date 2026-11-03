import { useEngine, useGame } from '../../app/store';
import { servePenalty } from '../../game/evaluate';
import { clock, dateTime } from './format';

export function PenaltyBanner() {
  const s = useGame();
  const engine = useEngine();
  const active = Object.values(s.penalties).filter((p) => p.status === 'active').sort((a, b) => a.activeUntil - b.activeUntil);
  if (!active.length) return null;
  const now = engine.now();
  return (
    <div className="panel is-danger penalty-banner is-full" role="status" aria-label="Penalty zone">
      <div className="panel-body" style={{ display: 'grid', gap: 10 }}>
        <span className="sys" style={{ color: 'var(--danger)' }}>PENALTY ZONE</span>
        {active.map((p) => (
          <div key={p.id} style={{ display: 'grid', gap: 6 }}>
            <span>{p.restrictions.length ? p.restrictions.join(' · ') : 'Без ограничений'} — до {now < p.activeUntil && p.activeUntil - now < 86400e3 ? clock(p.activeUntil) : dateTime(p.activeUntil)}</span>
            {now >= p.activeUntil
              ? <button className="btn is-danger" onClick={() => void engine.run((st, c) => servePenalty(st, c, p.id))}>Штраф отбыт</button>
              : <span className="hint">Пока штраф не отбыт, всё даёт ×0.5. Отметить «отбыт» можно после окончания срока.</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
