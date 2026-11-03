import type { Route } from './router';

const ICONS: Record<string, string[]> = {
  status: ['M4 4h16v16H4z', 'M8 9h8', 'M8 13h8', 'M8 17h5'],
  today: ['M4 6h16v14H4z', 'M4 10h16', 'M9 3v5', 'M15 3v5', 'M12 14v3h3'],
  tasks: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4 6l1 1 2-2', 'M4 12l1 1 2-2', 'M4 18l1 1 2-2'],
  skills: ['M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
};
const ITEMS: [Route, string][] = [['status', 'Статус'], ['today', 'Сегодня'], ['tasks', 'Задания'], ['skills', 'Навыки'], ['more', 'Ещё']];

export function Nav({ route }: { route: Route }) {
  const top = route.split('/')[0];
  return (
    <nav className="nav" aria-label="Разделы">
      {ITEMS.map(([r, label]) => (
        <a key={r} href={`#/${r}`} className="nav-link" aria-label={label} aria-current={top === r ? 'page' : undefined} {...(r === 'status' ? { 'data-fly-target': '' } : {})}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={r === 'more' ? 3 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[r].map((d, i) => <path key={i} d={d} />)}
          </svg>
          <span aria-hidden="true">{label}</span>
        </a>
      ))}
    </nav>
  );
}
