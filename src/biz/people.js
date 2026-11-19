const IDX = new WeakMap();

export function grp(f) {
  let m = IDX.get(f);
  if (!m || m.list !== f.g) {
    m = new Map();
    for (const g of f.g || []) if (!g.x) m.set(g.i, g);
    m.list = f.g;
    IDX.set(f, m);
  }
  return m;
}

export function count(f) {
  if (!Array.isArray(f?.g)) return 0;
  let n = 0;
  for (const g of f.g) if (!g.x) n += g.n;
  return n;
}

export function each(f, cb) {
  if (!Array.isArray(f?.g)) return;
  const M = grp(f), ahead = new Map(), rank = list => { let a = 0; for (const i of list) { const g = M.get(i); if (!g) continue; ahead.set(g.i, a); a += g.n; } };
  rank(f.CQ || []);
  for (const k in f.Q || {}) rank(f.Q[k]);
  for (const k in f.HQ || {}) rank(f.HQ[k]);
  for (const g of f.g) if (!g.x) cb(g, ahead.get(g.i) || 0);
}
