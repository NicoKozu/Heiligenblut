import { D } from './data.js';
import { DIRS, keys } from './area.js';
import { running, pisteOpen, pay } from './assets.js';
import { wear } from './snow.js';
import { cashCap } from './staff.js';
import { ticketPrice, kidsFree } from './marketing.js';
import * as SD from './side.js';
import { out } from './people.js';

const F = D.flow;
const LIFT = Object.fromEntries(DIRS.map(l => [l.id, l]));
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
export const places = l => l.places || LIFT[l.id].places;
export const capPerMin = l => 60 / LIFT[l.id].gap * places(l);
export const runMinutes = p => Math.max(1, Math.round(p.km / F.speed[p.level] * 60 + F.pause[p.level]));
export const levelWeight = (lv, skill = F.skill) => Object.entries(skill).reduce((a, [c, s]) => a + s * F.pref[c][lv], 0);

export function skillMix(seg) {
  const t = Object.values(seg).reduce((a, b) => a + b, 0) || 1, o = { leicht: 0, mittel: 0, schwer: 0 };
  for (const s in seg) for (const k in o) o[k] += seg[s] / t * D.segs[s].skill[k];
  return o;
}

export function newFlow(full, half, seg) {
  const zeros = n => new Array(n).fill(0), t = seg ? Object.values(seg).reduce((a, b) => a + b, 0) || 1 : 0;
  return SD.sideFlow(ensureKeys({
    plan: { full, half }, seg: seg ? Object.fromEntries(Object.entries(seg).map(([k, v]) => [k, v / t])) : null, skill: seg ? skillMix(seg) : null, done: { full: 0, half: 0 },
    queue: {}, ride: {}, run: {}, wait: {}, board: {},
    present: 0, lunched: 0, avgWait: 0, cashQ: 0, cashWait: 0, cashServed: 0
  }));
}

export function ensureKeys(f) {
  for (const k of ['queue', 'ride', 'run', 'wait', 'board']) if (!f[k]) f[k] = {};
  for (const l of DIRS) {
    for (const k of ['queue', 'wait', 'board']) if (f[k][l.id] == null) f[k][l.id] = 0;
    if (!f.ride[l.id]) f.ride[l.id] = new Array(l.ride).fill(0);
  }
  for (const p of D.pistes) if (!f.run[p.id]) f.run[p.id] = new Array(runMinutes(p)).fill(0);
  return f;
}

function shift(a) {
  const o = a.shift();
  a.push(0);
  return o;
}

function arrivals(G, f, t) {
  const T = G.today, s = G.seasonShare ?? F.seasonShare, m = D.mix;
  const cf = bell(F.arrive, t + 1), ch = bell(F.half, t + 1);
  let A = f.plan.full * (cf - f.done.full), H = f.plan.half * (ch - f.done.half);
  f.done.full = cf;
  f.done.half = ch;
  const k = SD.arrive(G, f, A + H);
  A *= k;
  H *= k;
  SD.guests(G, f, A, A + H);
  const add = (k, n) => { T.types[k] = (T.types[k] || 0) + n; };
  const earn = (k, n) => { const v = n * ticketPrice(G, D.ticketOf[k]); T.revenue[D.ticketOf[k]] = (T.revenue[D.ticketOf[k]] || 0) + v; G.cash += v; };
  add('season', (A + H) * s);
  const paid = Math.max(0, s - (G.mkt?.early === G.season ? D.mkt.campaigns.early.share : 0)) * (A + H);
  if (paid > 0) { const v = paid * G.prices.season / F.cardVisits; T.revenue.season = (T.revenue.season || 0) + v; G.cash += v; }
  const sh = f.seg || Object.fromEntries(Object.entries(D.segs).map(([k, v]) => [k, v.share]));
  if (!T.seg) T.seg = {};
  for (const sg in sh) {
    const a = A * sh[sg], mx = D.segs[sg].mix, tm = mx.adult + mx.youth + mx.child;
    T.seg[sg] = (T.seg[sg] || 0) + (A + H) * sh[sg];
    for (const k of ['adult', 'youth', 'child']) { const n = a * (1 - s) * mx[k] / tm; add(k, n); earn(k, n); if (k === 'child' && kidsFree(G, G.date)) T.free = (T.free || 0) + n; }
  }
  add('half', H * (1 - s));
  earn('half', H * (1 - s));
  T.guests += A + H;
  pay(G, 'guest', (A + H) * D.guestCost);
  return A + H;
}

const exit = (G, node) => D.pistes.some(p => p.from === node && pisteOpen(G, p.id)) || G.lifts.some(l => running(l) && keys(l).some(k => LIFT[k].from === node));

function dispatch(G, f, node, X, t, d) {
  if (X <= 1e-9) return;
  if (node === 'tal' && d > 0) { const g = X * d; f.present -= g; X -= g; SD.leave(G, f, g); }
  const L = F.lunch;
  if (SD.NODES.has(node) && t >= L.from && t < L.to) {
    const want = L.share * smooth((t + 1 - L.from) / (L.to - L.from)) * f.present - f.lunched;
    const h = Math.max(0, Math.min(X * SD.lunchRate(G, f, node), want));
    if (h > 0) { f.lunched += h; X -= h - SD.lunch(G, f, node, h); }
  }
  const opts = [];
  for (const l of G.lifts) {
    if (!running(l)) continue;
    for (const k of keys(l)) {
      const s = LIFT[k];
      if (s.from !== node || !exit(G, s.to)) continue;
      opts.push({ k, w: Math.max(0.02, F.liftW * (s.back ? 0.3 + 1.5 * d : 1 - d) * Math.exp(-f.wait[k] / F.queueTau)) });
    }
  }
  for (const p of D.pistes) {
    if (p.from !== node || !pisteOpen(G, p.id)) continue;
    opts.push({ p, w: levelWeight(p.level, f.skill || F.skill) * (1 + 2 * d) });
  }
  if (!opts.length && node === 'tal' && G.lifts.some(l => l.open && !running(l) && LIFT[l.id].from === 'tal')) { const g = X * F.holdGiveUp; f.hold = (f.hold || 0) + X - g; X = g; }
  if (!opts.length) { f.present -= X; G.today.lost = (G.today.lost || 0) + X; return; }
  const W = opts.reduce((a, o) => a + o.w, 0);
  for (const o of opts) {
    const n = X * o.w / W;
    if (o.k) f.queue[o.k] += n;
    else { const r = f.run[o.p.id]; r[r.length - 1] += n; }
  }
}

export function step(G, t) {
  const f = G.flow, T = G.today;
  const d = leaveShare(t);
  const at = Object.fromEntries(Object.keys(D.nodes).map(k => [k, 0]));
  const a = arrivals(G, f, t);
  f.present += a;
  const s = G.seasonShare ?? F.seasonShare, cap = cashCap(G), dq = a * (1 - s) * (1 - D.staff.cash.online);
  f.cashQ = (f.cashQ || 0) + dq;
  const sv = Math.min(f.cashQ, cap);
  f.cashQ -= sv;
  out(f, 'cash', sv);
  if (f.cashQ < 1e-6) f.cashQ = 0;
  f.cashWait = f.cashQ / cap;
  f.cashServed = sv;
  T.cashPeak = Math.max(T.cashPeak || 0, f.cashWait);
  at.tal += a - dq + sv;
  for (const l of DIRS) { const n = shift(f.ride[l.id]); out(f, 'r:' + l.id, n); at[l.to] += n; }
  for (const p of D.pistes) { const n = shift(f.run[p.id]); out(f, 'p:' + p.id, n); wear(G, p.id, n); at[p.to] += n; }
  SD.hutsOut(G, f, at);
  for (const l of G.lifts) if (!running(l)) for (const k of keys(l)) if (f.queue[k] > 0) { at[LIFT[k].from] += f.queue[k]; out(f, 'q:' + k, f.queue[k]); f.queue[k] = 0; }
  at.tal += f.hold || 0;
  out(f, 'hold', f.hold);
  f.hold = 0;
  for (const n in at) dispatch(G, f, n, at[n], t, d);
  SD.hutsIn(G, f);
  let ws = 0, bs = 0;
  for (const l of G.lifts) {
    const c = capPerMin(l), on = running(l), K = keys(l);
    let u = 0;
    for (const k of K) {
      const b = on ? Math.min(f.queue[k], c) : 0;
      f.queue[k] -= b;
      out(f, 'q:' + k, b);
      out(f, 'b:' + k, b);
      if (f.queue[k] < 1e-6) f.queue[k] = 0;
      const r = f.ride[k];
      r[r.length - 1] += b;
      u += c ? b / c / K.length : 0;
      const w = on ? f.queue[k] / c : 0;
      f.wait[k] = w;
      f.board[k] = b;
      T.rides[l.id] = (T.rides[l.id] || 0) + b;
      T.peak[l.id] = Math.max(T.peak[l.id] || 0, w);
      ws += w * b;
      bs += b;
    }
    l.util = u;
  }
  f.avgWait = bs ? ws / bs : 0;
  T.waitSum += ws;
  T.boardSum += bs;
  if (f.present < 1e-6) f.present = 0;
}

export function endFlow(G) {
  const f = G.flow;
  for (const k in f.queue) f.queue[k] = 0;
  for (const o of [f.ride, f.run]) for (const k in o) o[k].fill(0);
  SD.endFlow(f);
  for (const k in f.wait) f.wait[k] = 0;
  for (const k in f.board || {}) f.board[k] = 0;
  for (const l of G.lifts) l.util = 0;
  f.present = 0;
  f.out = {};
  f.avgWait = 0;
  f.cashQ = 0;
  f.cashWait = 0;
  f.cashServed = 0;
}

export const inArea = G => G.flow ? G.flow.present : 0;
export const onLifts = f => sum(Object.values(f.queue)) + sum(Object.values(f.ride).map(sum));
export { PISTE, LIFT };
