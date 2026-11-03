import { useEffect, useRef } from 'react';
import { startBackground } from './particles';

export function Background() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => (ref.current ? startBackground(ref.current) : undefined), []);
  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
}
