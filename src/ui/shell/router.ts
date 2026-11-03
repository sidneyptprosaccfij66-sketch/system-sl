import { useEffect, useState } from 'react';

export type FeedRoute = 'status' | 'today' | 'tasks' | 'skills' | 'more';
export type Route = FeedRoute | 'more/bank' | 'more/journal' | 'more/settings';
export const FEED: FeedRoute[] = ['status', 'today', 'tasks', 'skills', 'more'];
const ROUTES: Route[] = [...FEED, 'more/bank', 'more/journal', 'more/settings'];

export function parseRoute(hash: string): Route {
  const r = hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'status';
}
export const isFeed = (r: Route): r is FeedRoute => (FEED as string[]).includes(r);

export function useRoute(): Route {
  const [r, setR] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setR(parseRoute(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

/** Updates the address without a hashchange event (no re-render, no jump). */
export const setHashQuietly = (r: Route) => { if (location.hash !== `#/${r}`) history.replaceState(null, '', `#/${r}`); };
