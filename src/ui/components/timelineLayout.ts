// Pure layout for the day timeline (no React).
/** Assigns side-by-side columns to overlapping items (greedy, per overlap cluster). */
export function layoutColumns(items: { id: string; s: number; e: number }[]): Record<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.s - b.s || b.e - a.e);
  const out: Record<string, { col: number; cols: number }> = {};
  let cluster: typeof sorted = [];
  let colsEnd: number[] = [];
  let clusterEnd = -1;
  const flush = () => { const n = colsEnd.length; for (const it of cluster) out[it.id].cols = n; cluster = []; colsEnd = []; };
  for (const it of sorted) {
    if (it.s >= clusterEnd) flush();
    let col = colsEnd.findIndex((end) => end <= it.s);
    if (col === -1) { col = colsEnd.length; colsEnd.push(it.e); } else colsEnd[col] = it.e;
    out[it.id] = { col, cols: 1 };
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.e);
  }
  flush();
  return out;
}

