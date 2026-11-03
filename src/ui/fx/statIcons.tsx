// Line icons for the six stats (24×24, stroke = currentColor).
import type { StatCode } from '../../game/types';

const PATHS: Record<StatCode, string[]> = {
  // dumbbell
  STR: ['M3 9v6', 'M6 7v10', 'M18 7v10', 'M21 9v6', 'M6 12h12'],
  // heart
  VIT: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  // brain
  INT: ['M9.5 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 7 17.5a2.5 2.5 0 0 0 5 .5V6a1.8 1.8 0 0 0-2.5-1.5z',
    'M14.5 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2 3 3 0 0 1-2.5 4.8 2.5 2.5 0 0 1-5 .5', 'M9 10.5h1.5', 'M13.5 13.5H15'],
  // hammer
  MST: ['M14 6l4 4', 'M11.5 8.5l4 4L7 21l-4-4z', 'M13 4.5l2-1.5 6 6-1.5 2'],
  // shield
  DIS: ['M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z', 'M9 12l2 2 4-4'],
  // speech bubbles
  CHA: ['M4 5h11v7H9l-3 3v-3H4z', 'M15 9h5v7h-2v3l-3-3h-4v-2'],
};

export function StatIcon({ stat, size = 22 }: { stat: StatCode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[stat].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
