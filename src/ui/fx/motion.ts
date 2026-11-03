// WAAPI helpers that respect prefers-reduced-motion (spec §10.3).
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface AnimOpts extends KeyframeAnimationOptions { /** Skipped entirely under reduced motion (shake, particles). */ decorative?: boolean }

export function animate(el: Element | null | undefined, keyframes: Keyframe[], opts: AnimOpts = {}): Promise<void> {
  if (!el || typeof (el as HTMLElement).animate !== 'function') return Promise.resolve();
  const reduced = prefersReducedMotion();
  if (reduced && opts.decorative) return Promise.resolve();
  const { decorative: _d, ...rest } = opts;
  const duration = typeof rest.duration === 'number' ? rest.duration * (reduced ? 0.3 : 1) : rest.duration;
  const delay = typeof rest.delay === 'number' ? rest.delay * (reduced ? 0.3 : 1) : rest.delay;
  const a = (el as HTMLElement).animate(keyframes, { fill: 'both', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', ...rest, duration, delay });
  return a.finished.then(() => undefined, () => undefined);
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
