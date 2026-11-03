import { useEffect, useState } from 'react';
import { parseRoute, type Route } from './routes';

export { FEED, isFeed, parseRoute, setHashQuietly, type FeedRoute, type Route } from './routes';

export function useRoute(): Route {
  const [r, setR] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setR(parseRoute(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
