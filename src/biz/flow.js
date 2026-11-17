import { D } from './data.js';
import { running, pisteOpen } from './assets.js';

const F = D.flow;
const LIFT = Object.fromEntries(D.lifts.map(l => [l.id, l]));
const PISTE = Object.fromEntries(D.pistes.map(p => [p.id, p]));
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const sum = a => a.reduce((x, y) => x + y, 0);

function bell(c, t) {
  const L = c.peak - c.from, R = c.to - c.peak, tot = (L + R) / 2;
  if (t <= c.from) return 0;
  if (t >= c.to) return 1;
  if (t <= c.peak) { const x = t - c.from; return (x - L / Math.PI * Math.sin(Math.PI * x / L)) / 2 / tot; }
  const x = t - c.peak;
  return (L / 2 + (x + R / Math.PI * Math.sin(Math.PI * x / R)) / 2) / tot;
}

export const leaveShare = t => smooth((t - F.leave.from) / (F.leave.to - F.leave.from));
export const capPerMin = l => LIFT[l.id].cap * (1 + (l.boost || 0)) / 60;
export const runMinutes = p => Math.max(1, Math.round(p.km / F.speed[p.level] * 60 + F.pause[p.level]));
export const levelWeight = lv => Object.entries(F.skill).reduce((a, [c, s]) => a + s * F.pref[c][lv], 0);

export function newFlow(full, half) {
  const zeros = n => new Array(n).fill(0);
  return {
    plan: { full, half }, done: { full: 0, half: 0 },
    queue: Object.fromEntries(D.lifts.map(l => [l.id, 0])),
    ride: Object.fromEntries(D.lifts.map(l => [l.id, zeros(l.ride)])),
    run: Object.fromEntries(D.pistes.map(p => [p.id, zeros(runMinutes(p))])),
    hut: Object.fromEntries(F.lunch.nodes.map(n => [n, zeros(F.lunch.dur)])),
    wait: Object.fromEntries(D.lifts.map(l => [l.id, 0])),
    board: Object.fromEntries(D.lifts.map(l => [l.id, 0])),
    present: 0, lunched: 0, avgWait: 0
  };
}

function shift(a) {
  const o = a.shift();
  a.push(0);
  return o;
}

function arrivals(G, f, t) {
  const T = G.today, s = G.seasonShare ?? F.seasonShare, m = D.mix;
  const cf = bell(F.arrive, t + 1), ch = bell(F.half, t + 1);
  const A = f.plan.full * (cf - f.done.full), H = f.plan.half * (ch - f.done.half);
  f.done.full = cf;
  f.done.half = ch;
  const add = (k, n) => { T.types[k] = (T.types[k] || 0) + n; };
  const earn = (k, n) => { const v = n * G.prices[D.ticketOf[k]]; T.revenue[D.ticketOf[k]] = (T.revenue[D.ticketOf[k]] || 0) + v; G.cash += v; };
  add('season', (A + H) * s);
  const tm = m.adult + m.youth + m.child;
  for (const k of ['adult', 'youth', 'child']) { const n = A * (1 - s) * m[k] / tm; add(k, n); earn(k, n); }
  add('half', H * (1 - s));
  earn('half', H * (1 - s));
  T.guests += A + H;
  return A + H;
}

function dispatch(G, f, node, X, t, d) {
  if (X <= 1e-9) return;
  if (node === 'tal' && d > 0) { const g = X * d; f.present -= g; X -= g; }
  const L = F.lunch;
  if (f.hut[node] && t >= L.from && t < L.to) {
    const want = L.share * smooth((t + 1 - L.from) / (L.to - L.from)) * f.present - f.lunched;
    const h = Math.max(0, Math.min(X * 0.8, want));
    if (h > 0) { f.hut[node][L.dur - 1] += h; f.lunched += h; X -= h; }
  }
  const opts = [];
  for (const l of G.lifts) {
    const s = LIFT[l.id];
    if (s.from !== node || !running(l)) continue;
    opts.push({ l, w: Math.max(0.02, F.liftW * (1 - d) * Math.exp(-f.wait[l.id] / F.queueTau)) });
  }
  for (const p of D.pistes) {
    if (p.from !== node || !pisteOpen(G, p.id)) continue;
    opts.push({ p, w: levelWeight(p.level) * (1 + 2 * d) });
  }
  if (!opts.length) { f.present -= X; G.today.lost = (G.today.lost || 0) + X; return; }
  const W = opts.reduce((a, o) => a + o.w, 0);
  for (const o of opts) {
    const n = X * o.w / W;
    if (o.l) f.queue[o.l.id] += n;
    else { const r = f.run[o.p.id]; r[r.length - 1] += n; }
  }
}

export function step(G, t) {
  const f = G.flow, T = G.today;
  const d = leaveShare(t);
  const at = Object.fromEntries(Object.keys(D.nodes).map(k => [k, 0]));
  const a = arrivals(G, f, t);
  f.present += a;
  at.tal += a;
  for (const l of D.lifts) at[l.to] += shift(f.ride[l.id]);
  for (const p of D.pistes) at[p.to] += shift(f.run[p.id]);
  for (const n in f.hut) at[n] += shift(f.hut[n]);
  for (const l of G.lifts) if (!running(l) && f.queue[l.id] > 0) { at[LIFT[l.id].from] += f.queue[l.id]; f.queue[l.id] = 0; }
  for (const n in at) dispatch(G, f, n, at[n], t, d);
  let ws = 0, bs = 0;
  for (const l of G.lifts) {
    const c = capPerMin(l);
    const on = running(l), b = on ? Math.min(f.queue[l.id], c) : 0;
    f.queue[l.id] -= b;
    if (f.queue[l.id] < 1e-6) f.queue[l.id] = 0;
    const r = f.ride[l.id];
    r[r.length - 1] += b;
    l.util = c ? b / c : 0;
    const w = on ? f.queue[l.id] / c : 0;
    f.wait[l.id] = w;
    f.board[l.id] = b;
    T.rides[l.id] = (T.rides[l.id] || 0) + b;
    T.peak[l.id] = Math.max(T.peak[l.id] || 0, w);
    ws += w * b;
    bs += b;
  }
  f.avgWait = bs ? ws / bs : 0;
  T.waitSum += ws;
  T.boardSum += bs;
  if (f.present < 1e-6) f.present = 0;
}

export function endFlow(G) {
  const f = G.flow;
  for (const k in f.queue) f.queue[k] = 0;
  for (const o of [f.ride, f.run, f.hut]) for (const k in o) o[k].fill(0);
  for (const k in f.wait) f.wait[k] = 0;
  for (const k in f.board || {}) f.board[k] = 0;
  for (const l of G.lifts) l.util = 0;
  f.present = 0;
  f.avgWait = 0;
}

export const inArea = G => G.flow ? G.flow.present : 0;
export const onLifts = f => sum(Object.values(f.queue)) + sum(Object.values(f.ride).map(sum));
export { PISTE, LIFT };
