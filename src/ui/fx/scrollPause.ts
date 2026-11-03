// While the page is being scrolled, ambient CSS animations pause (html.is-scrolling).
// Running animations make the browser recompute their styles on every scroll frame;
// paused ones cost nothing, so scrolling stays smooth on phones. They resume ~0.25 s
// after the scroll stops. One-off effects (system windows) use WAAPI and are unaffected.
const IDLE_MS = 250;

export function startScrollPause(root: HTMLElement = document.documentElement): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onScroll = () => {
    if (timer === undefined) root.classList.add('is-scrolling');
    else clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; root.classList.remove('is-scrolling'); }, IDLE_MS);
  };
  // capture: also catches scrolling inside sheets and other scrollable boxes
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  return () => { document.removeEventListener('scroll', onScroll, { capture: true }); clearTimeout(timer); root.classList.remove('is-scrolling'); };
}
