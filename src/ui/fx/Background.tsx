// Ambient background: slowly rising, twinkling dust.
// Pure CSS animations of transform/opacity, so the GPU moves them and the page's
// main thread stays asleep (a canvas loop used to wake it 30–60 times a second).
// Twinkle uses one shared 24 s cycle: each loop restart costs the browser a few
// main-thread frames, so fewer restarts = less work.
import { useMemo, type CSSProperties } from 'react';

interface Mote { x: number; y: number; size: number; rise: number; delay: number }

function makeMotes(): Mote[] {
  const area = typeof window === 'undefined' ? 390 * 844 : innerWidth * innerHeight;
  const n = Math.max(14, Math.min(40, Math.round(area / 15000)));
  return Array.from({ length: n }, () => {
    const rise = 60 + Math.random() * 180; // seconds per screen height, like the old canvas speed
    return {
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.6,
      rise,
      delay: -Math.random() * rise,
    };
  });
}

export function Background() {
  const motes = useMemo(makeMotes, []);
  return (
    <>
      <div className="dust" aria-hidden="true">
        {motes.map((m, i) => (
          <i
            key={i}
            style={{ '--x': `${m.x}%`, '--y': `${m.y}%`, '--s': `${m.size}px`, '--rise': `${m.rise}s`, '--delay': `${m.delay}s` } as CSSProperties}
          ><b /></i>
        ))}
      </div>
    </>
  );
}
