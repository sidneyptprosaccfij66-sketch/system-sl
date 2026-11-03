// Rank badge whose ornament escalates with the rank: E plain → S gold with aura and sparks.
import type { Rank } from '../../game/types';

export function RankBadge({ rank, size = 'chip', label }: { rank: Rank; size?: 'chip' | 'hero' | 'scene'; label?: string }) {
  const tier = 'EDCBAS'.indexOf(rank);
  return (
    <span className={`rk is-${size}`} data-rank={rank} role="img" aria-label={label ?? `Ранг ${rank}`}>
      {tier >= 4 && <span className="rk-ring" aria-hidden="true" />}
      {tier >= 3 && <span className="rk-corners" aria-hidden="true" />}
      {tier === 5 && size !== 'chip' && <><span className="rk-aura" aria-hidden="true" /><span className="rk-aura is-late" aria-hidden="true" /></>}
      {tier === 5 && <><span className="rk-spark is-1" aria-hidden="true" /><span className="rk-spark is-2" aria-hidden="true" /><span className="rk-spark is-3" aria-hidden="true" /></>}
      <span className="rk-letter" aria-hidden="true">{rank}</span>
    </span>
  );
}
