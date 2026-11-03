// Task difficulty as a dungeon gate. Three candidate styles while the owner chooses.
import type { Rank } from '../../game/types';

export type GateStyle = 'rift' | 'seal' | 'hex';
let defaultStyle: GateStyle = 'rift';
export const setGateStyle = (s: GateStyle) => { defaultStyle = s; };

export function GateBadge({ rank, size = 'chip', label, variant }: { rank: Rank; size?: 'chip' | 'hero'; label?: string; variant?: GateStyle }) {
  const v = variant ?? defaultStyle;
  const tier = 'EDCBAS'.indexOf(rank);
  return (
    <span className={`gate is-${size} is-${v}${tier === 5 ? ' is-pulse' : ''}`} data-rank={rank} role="img" aria-label={label ?? `Сложность ${rank}`}>
      <span className="gate-shape" aria-hidden="true" />
      {v === 'rift' && <span className="gate-crack" aria-hidden="true" />}
      {v === 'seal' && tier >= 4 && <span className="gate-shape2" aria-hidden="true" />}
      {v === 'seal' && tier >= 3 && <span className="gate-runes" aria-hidden="true" />}
      {v === 'seal' && tier === 5 && <span className="gate-veins" aria-hidden="true" />}
      {v === 'hex' && tier >= 4 && <span className="gate-cracks" aria-hidden="true" />}
      <span className="gate-letter" aria-hidden="true">{rank}</span>
    </span>
  );
}
