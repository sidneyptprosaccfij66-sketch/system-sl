// Synthesized system sounds (Web Audio). Off by default (spec §10.4).
let enabled = false;
let ctx: AudioContext | null = null;

export function setSoundEnabled(on: boolean): void { enabled = on; }
export function isSoundEnabled(): boolean { return enabled; }

type Sfx = 'complete' | 'levelup' | 'penalty' | 'window';

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ac.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

export function playSfx(kind: Sfx): void {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime + 0.01;
    switch (kind) {
      case 'window': tone(ctx, 1320, t, 0.08, 'sine', 0.05); break;
      case 'complete': tone(ctx, 880, t, 0.09, 'sine', 0.08); tone(ctx, 1320, t + 0.08, 0.16, 'sine', 0.08); break;
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => tone(ctx!, f, t + i * 0.09, 0.32, 'triangle', 0.07)); break;
      case 'penalty': tone(ctx, 140, t, 0.5, 'sawtooth', 0.06, 70); tone(ctx, 147, t, 0.5, 'square', 0.03, 74); break;
    }
  } catch { /* audio unavailable */ }
}
