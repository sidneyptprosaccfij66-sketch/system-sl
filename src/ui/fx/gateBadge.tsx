// Task difficulty as a dungeon-gate seal: escalates E → S (blood red).
import type { Rank } from '../../game/types';

export function GateBadge({ rank, size = 'chip', label }: { rank: Rank; size?: 'chip' | 'hero'; label?: string }) {
  const tier = 'EDCBAS'.indexOf(rank);
  return (
    <span className={`gate is-${size}${tier === 5 ? ' is-pulse' : ''}`} data-rank={rank} role="img" aria-label={label ?? `Сложность ${rank}`}>
      <span className="gate-shape" aria-hidden="true" />
      <span className="gate-corners" aria-hidden="true" />
      {tier >= 4 && <span className="gate-shape2" aria-hidden="true" />}
      {tier >= 3 && <span className="gate-runes" aria-hidden="true" />}
      {tier === 5 && <span className="gate-veins" aria-hidden="true" />}
      <span className="gate-letter" aria-hidden="true">{rank}</span>
    </span>
  );
}
