import { useEffect, useState } from 'react';

export type Route = 'status' | 'today' | 'tasks' | 'skills' | 'more' | 'more/bank' | 'more/journal' | 'more/settings';
const ROUTES: Route[] = ['status', 'today', 'tasks', 'skills', 'more', 'more/bank', 'more/journal', 'more/settings'];

export function parseRoute(hash: string): Route {
  const r = hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'status';
}

export function useRoute(): Route {
  const [r, setR] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => { setR(parseRoute(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
