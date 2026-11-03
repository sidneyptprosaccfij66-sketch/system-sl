export function buzz(pattern: number | number[]): void {
  try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern); } catch { /* unsupported */ }
}
