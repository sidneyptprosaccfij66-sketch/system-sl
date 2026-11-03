// Pure route helpers (no React) so they can be unit-tested.
export type FeedRoute = 'status' | 'today' | 'tasks' | 'skills' | 'more';
export type Route = FeedRoute | 'more/bank' | 'more/journal' | 'more/settings';
export const FEED: FeedRoute[] = ['status', 'today', 'tasks', 'skills', 'more'];
const ROUTES: Route[] = [...FEED, 'more/bank', 'more/journal', 'more/settings'];

export function parseRoute(hash: string): Route {
  const r = hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'status';
}
export const isFeed = (r: Route): r is FeedRoute => (FEED as string[]).includes(r);

/** Updates the address without a hashchange event (no re-render, no jump).
 *  A feed position never overwrites a sub-page the user has just opened
 *  (a late scroll-spy tick would otherwise cancel the navigation). */
export const setHashQuietly = (r: Route) => {
  if (isFeed(r) && !isFeed(parseRoute(location.hash))) return;
  if (location.hash !== `#/${r}`) history.replaceState(null, '', `#/${r}`);
};
