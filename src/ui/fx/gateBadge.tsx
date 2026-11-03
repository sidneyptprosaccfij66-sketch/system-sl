// Task difficulty as a dungeon gate: an ominous portal that grows wilder from E to S (red).
import type { Rank } from '../../game/types';

export function GateBadge({ rank, size = 'chip', label }: { rank: Rank; size?: 'chip' | 'hero'; label?: string }) {
  const tier = 'EDCBAS'.indexOf(rank);
  return (
    <span className={`gate is-${size}`} data-rank={rank} role="img" aria-label={label ?? `Сложность ${rank}`}>
      {tier >= 4 && <span className="gate-spikes" aria-hidden="true" />}
      {tier >= 3 && <span className="gate-outer" aria-hidden="true" />}
      <span className="gate-swirl" aria-hidden="true" />
      <span className="gate-ring" aria-hidden="true" />
      <span className="gate-letter" aria-hidden="true">{rank}</span>
    </span>
  );
}
