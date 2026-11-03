// "Облегчённая графика": a per-device switch (localStorage) for weak phones.
// Turns off the particle background, endless ambient animations and glass blur;
// one-off effects (system windows, level-up) stay.
const KEY = 'system.lite';
export const LITE_EVENT = 'system-lite';

export function isLite(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function applyLite(on = isLite()): void {
  document.documentElement.classList.toggle('holo-lite', on);
}

export function setLite(on: boolean): void {
  try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* private mode: class only */ }
  applyLite(on);
  window.dispatchEvent(new Event(LITE_EVENT));
}
