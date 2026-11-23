import { D } from './data.js';
import { LIFTX, keys } from './area.js';
import { running, pisteOpen } from './assets.js';

const X = D.net;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function bases(G) {
  const o = [{ id: 'tal', name: D.nodes.tal, x: X.home[0], z: X.home[1], cap: 0 }];
  let own = 0;
  for (const b of G.custom?.bases || []) if (G.lifts?.some(l => l.id === b.lift)) { o.push({ id: b.id, name: b.name, x: b.x, z: b.z, cap: b.spots || 0, lift: b.lift }); own += b.spots || 0; }
  o[0].cap = Math.max(0, (G.side?.park.cap || 0) - own);
  return o;
}

export function graph(G) {
  const nodes = Object.keys(D.nodes), P = {}, L = {}, run = {};
  for (const n of nodes) { P[n] = []; L[n] = []; }
  for (const p of D.pistes) if (P[p.from] && pisteOpen(G, p.id)) P[p.from].push(p);
  for (const l of G.lifts || []) if (running(l)) for (const k of keys(l)) { const x = LIFTX[k]; if (x && L[x.from]) { run[k] = 1; L[x.from].push(x); } }
  const B = bases(G), isB = Object.fromEntries(B.map(b => [b.id, 1]));
  const ex = Object.fromEntries(nodes.map(n => [n, !!isB[n] || P[n].length > 0 || L[n].length > 0]));
  for (const n of nodes) P[n] = P[n].filter(p => ex[p.to]);
  return { P, L, ex, run, B, isB, to: {}, r: {}, sh: {} };
}

export function dist(N, to) {
  if (N.to[to]) return N.to[to];
  const d = { [to]: 0 }, q = [to];
  while (q.length) {
    const n = q.shift();
    for (const a in N.P) {
      if (d[a] != null) continue;
      if (N.P[a].some(p => p.to === n) || N.L[a].some(x => x.to === n)) { d[a] = d[n] + 1; q.push(a); }
    }
  }
  return N.to[to] = d;
}

export function reach(N, b) {
  if (N.r[b]) return N.r[b];
  const seen = new Set([b]), q = [b];
  while (q.length) {
    const n = q.shift();
    for (const e of [...(N.P[n] || []), ...(N.L[n] || [])]) if (N.ex[e.to] && !seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
  }
  const d = dist(N, b), pistes = [];
  for (const n of seen) for (const p of N.P[n] || []) if (!p.of && d[p.to] != null) pistes.push(p);
  return N.r[b] = { nodes: seen, pistes };
}

export function fun(G, N, b, sg) {
  const S = D.segs[sg], R = reach(N, b);
  let km = 0, c = 0;
  for (const p of R.pistes) { const k = p.km * (S.pref[p.level] ?? 0) * (p.exp ? D.demandModel.expW : 1); km += k; c += k * (G.pistes?.[p.id]?.cond ?? 80); }
  if (!(km > 0)) return 0;
  return km * (X.cond[0] + X.cond[1] * c / km / 100) * (1 + X.variety * Math.min(1, R.pistes.length / X.varRef));
}

export function waitAt(f, N, b) {
  let w = Infinity;
  for (const l of N.L[b] || []) w = Math.min(w, f?.wait?.[l.id] || 0);
  return w + (f?.cashWait || 0);
}

const km = b => Math.hypot(b.x - X.home[0], b.z - X.home[1]) / 1000;

export function shares(G, f, N, sg) {
  if (N.sh[sg]) return N.sh[sg];
  const B = N.B;
  if (B.length < 2) return N.sh[sg] = { [B[0].id]: 1 };
  const mem = G.net?.mem || {}, F = B.map(b => fun(G, N, b.id, sg)), top = Math.max(...F);
  const w = B.map((b, i) => {
    if (!(F[i] > 0) || !(N.L[b.id] || []).length) return 0;
    const free = b.cap > 0 ? clamp(1 - (f?.carsB?.[b.id] || 0) / b.cap, 0, 1) : 0;
    return Math.pow(F[i] / top, X.funEl) * Math.exp(-waitAt(f, N, b.id) / X.waitTau) * (X.park[0] + X.park[1] * free) * Math.exp(-km(b) / X.distTau) * (1 + X.memK * ((mem[b.id] ?? X.mem0) - X.mem0));
  });
  const t = w.reduce((a, v) => a + v, 0);
  return N.sh[sg] = t > 0 ? Object.fromEntries(B.map((b, i) => [b.id, w[i] / t])) : { tal: 1 };
}

export function offerBonus(G) {
  const n = bases(G).length - 1, l = (G.custom?.lifts || []).filter(c => c.link && G.lifts?.some(x => x.id === c.id)).length;
  return 1 + Math.min(X.offerMax, X.offerBase * n + X.offerLink * l);
}

export const customKm = G => (G.custom?.pistes || []).filter(p => G.pistes?.[p.id]).reduce((a, p) => a + p.km, 0);
export const sizeRep = G => Math.min(X.repMax, X.repKm * customKm(G));

export function remember(G) {
  const B = bases(G), W = G.today?.bw || {}, n = G.net || (G.net = { mem: {} });
  if (B.length < 2) return;
  for (const b of B) {
    const o = W[b.id];
    if (!o || !(o[1] > 0)) continue;
    const s = clamp(1 - o[0] / o[1] / X.memWait - (G.today.shuttle?.[b.id] || 0) / o[1], 0, 1);
    n.mem[b.id] = (1 - X.memA) * (n.mem[b.id] ?? X.mem0) + X.memA * s;
  }
}

export function baseStats(G) {
  const f = G.flow, N = graph(G), o = N.B.map(b => ({ id: b.id, name: b.name, guests: 0, wait: (N.L[b.id] || []).length ? waitAt(f, N, b.id) : null, day: G.today?.bases?.[b.id] || 0, cars: f?.carsB?.[b.id] || 0, cap: b.cap }));
  const by = Object.fromEntries(o.map(x => [x.id, x]));
  for (const g of f?.g || []) if (!g.x) { const x = by[g.b || 'tal']; if (x) x.guests += g.n; }
  return o;
}
