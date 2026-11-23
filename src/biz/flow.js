import { D } from './data.js';
import { DIRS, keys, LIFTX, PX } from './area.js';
import { running, pisteOpen, pay } from './assets.js';
import { wear } from './snow.js';
import { cashCap } from './staff.js';
import { ticketPrice, kidsFree } from './marketing.js';
import * as SD from './side.js';
import { next } from './rng.js';
import { grp } from './people.js';

const F = D.flow;
const LIFT = LIFTX;
const PISTE = PX;
const LV = ['leicht', 'mittel', 'schwer'];
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const unsmooth = u => 0.5 - Math.sin(Math.asin(1 - 2 * Math.min(1, Math.max(0, u))) / 3);
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

const R = f => next(f);
const span = (f, [a, b]) => a + (b - a) * R(f);
function pick(f, o) {
  const W = sum(o.map(x => x.w));
  if (!(W > 0)) return o[Math.floor(R(f) * o.length)];
  let r = R(f) * W;
  for (const x of o) if ((r -= x.w) <= 0) return x;
  return o[o.length - 1];
}
const pickKey = (f, obj) => pick(f, Object.entries(obj).map(([k, w]) => ({ k, w }))).k;

export function newFlow(full, half, seg, rng = 1) {
  const t = seg ? sum(Object.values(seg)) || 1 : 0;
  return SD.sideFlow(ensureKeys({
    plan: { full, half }, seg: seg ? Object.fromEntries(Object.entries(seg).map(([k, v]) => [k, v / t])) : null, done: { full: 0, half: 0 },
    rng, id: 0, g: [], acc: {}, nz: {}, CQ: [], ct: 0, Q: {}, cab: {}, cn: {},
    queue: {}, ride: {}, run: {}, wait: {}, board: {},
    present: 0, lunched: 0, avgWait: 0, cashQ: 0, cashWait: 0, cashServed: 0, hold: 0
  }));
}

export function ensureKeys(f) {
  if (!Array.isArray(f.g)) Object.assign(f, { g: [], id: 0, rng: f.rng || 1, acc: {}, nz: {}, CQ: [], ct: 0, Q: {}, cab: {}, present: 0, hold: 0, cashQ: 0, lunched: 0 });
  for (const k of ['queue', 'ride', 'run', 'wait', 'board', 'Q', 'cab', 'cn', 'acc', 'nz']) if (!f[k]) f[k] = {};
  for (const l of DIRS) {
    for (const k of ['queue', 'wait', 'board', 'ride']) if (typeof f[k][l.id] !== 'number') f[k][l.id] = 0;
    if (!f.Q[l.id]) f.Q[l.id] = [];
    if (f.cab[l.id] == null) f.cab[l.id] = 0;
  }
  for (const p of D.pistes) if (typeof f.run[p.id] !== 'number') f.run[p.id] = 0;
  return f;
}

function size(f, sg) {
  const p = F.group[sg] || F.group.day;
  return 1 + pick(f, p.map((w, i) => ({ i, w }))).i;
}

function spawn(f, sg, half, n, t) {
  const S = D.segs[sg], L = F.lunch;
  const g = {
    i: ++f.id, n, sg, k: LV.indexOf(pickKey(f, S.skill)), v: span(f, F.tempo) * (sg === 'fam' ? 0.9 : 1), h: half ? 1 : 0,
    ht: F.leave.from + (F.leave.to - F.leave.from) * unsmooth(R(f)),
    lt: R(f) < (half ? F.eatHalf : L.share) ? L.from + (L.to - L.from) * unsmooth(R(f)) : -1,
    e: 0, lp: null, s: 'c', at: 'tal', t0: t, t1: t, nx: null, dl: span(f, F.lead)
  };
  f.g.push(g);
  grp(f).set(g.i, g);
  f.present += n;
  return g;
}

function arrivals(G, f, t, ev) {
  const T = G.today, s = G.seasonShare ?? F.seasonShare;
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
  const born = [];
  const make = (key, sg, half, x) => {
    f.acc[key] = (f.acc[key] || 0) + x;
    if (!f.nz[key]) f.nz[key] = size(f, sg);
    while (f.acc[key] >= f.nz[key]) {
      f.acc[key] -= f.nz[key];
      born.push(spawn(f, sg, half, f.nz[key], t + R(f)));
      f.nz[key] = size(f, sg);
    }
  };
  for (const sg in sh) make(sg, sg, false, A * sh[sg]);
  if (H > 0) make('half', pickKey(f, sh), true, H);
  born.sort((a, b) => a.t0 - b.t0);
  const cash = (1 - s) * (1 - D.staff.cash.online);
  for (const g of born) {
    if (R(f) < cash) { g.s = 'c'; f.CQ.push(g.i); }
    else { g.s = 'a'; g.t1 = g.t0; }
  }
}

export const mark = g => { g.ps = g.s; g.pa = g.at; g.p0 = g.t0; g.p1 = g.t1; };

function serveCash(G, f, t) {
  const cap = Math.max(1e-6, cashCap(G));
  let served = 0;
  while (f.CQ.length) {
    const g = grp(f).get(f.CQ[0]);
    if (!g) { f.CQ.shift(); continue; }
    const a = Math.max(f.ct, g.t0, t);
    if (a >= t + 1) break;
    f.ct = a + g.n / cap;
    f.CQ.shift();
    served += g.n;
    g.t1 = a;
    mark(g);
    g.t0 = a;
    g.s = 'a';
    g.t1 = f.ct;
  }
  if (!f.CQ.length) f.ct = Math.min(f.ct, t + 1);
  f.cashServed = served;
  return cap;
}

let net = null;
function network(G) {
  const P = {}, L = {}, nodes = Object.keys(D.nodes), run = {};
  for (const n of nodes) { P[n] = []; L[n] = []; }
  for (const p of D.pistes) if (pisteOpen(G, p.id)) P[p.from].push(p);
  for (const l of G.lifts) if (running(l)) for (const k of keys(l)) { run[k] = 1; L[LIFT[k].from].push(LIFT[k]); }
  const ex = Object.fromEntries(nodes.map(n => [n, P[n].length > 0 || L[n].length > 0]));
  for (const n of nodes) P[n] = P[n].filter(p => p.to === 'tal' || ex[p.to]);
  const dst = Object.fromEntries(nodes.map(n => [n, LV.map(c => {
    let b = 0;
    for (const p of P[n]) b = Math.max(b, F.pref[c][p.level]);
    if (L[n].some(x => x.back)) b = Math.max(b, 0.5);
    return Math.max(F.destMin, b);
  })]));
  const hut = Object.fromEntries(nodes.map(n => [n, SD.hutAt(G, n)]));
  const hold = G.lifts.some(l => l.open && !running(l) && LIFT[l.id].from === 'tal');
  return { P, L, ex, dst, run, hut, hold, home: null };
}

function homeDist(G, to = 'tal') {
  if (to === 'tal' && net.home) return net.home;
  if (to !== 'tal' && net.to?.[to]) return net.to[to];
  const d = { [to]: 0 }, q = [to];
  while (q.length) {
    const n = q.shift();
    for (const a in net.P) {
      if (d[a] != null) continue;
      if (net.P[a].some(p => p.to === n) || net.L[a].some(x => x.to === n)) { d[a] = d[n] + 1; q.push(a); }
    }
  }
  if (to !== 'tal') return (net.to || (net.to = {}))[to] = d;
  return net.home = d;
}

function hutGoal(G, f, g, node) {
  if (g.hu && SD.seatsEff(G, g.hu) > 0 && homeDist(G, SD.HUT[g.hu].node)[node] != null) return SD.HUT[g.hu].node;
  const o = [];
  for (const id of SD.HUTS) {
    const w = SD.lure(G, f, id), d = w > 0 ? homeDist(G, SD.HUT[id].node)[node] : null;
    if (d != null) o.push({ id, w: w * Math.pow(F.hutDist, d) });
  }
  g.hu = o.length ? pick(f, o).id : null;
  return g.hu ? SD.HUT[g.hu].node : null;
}

function decide(G, f, g, node, t) {
  const home = t >= g.ht;
  if (node === 'tal' && home) return 'o';
  let hungry = false, hd = null;
  if (!home && g.lt >= 0 && !g.e && t >= g.lt) {
    if (t > F.lunch.to + F.lateLunch) g.lt = -1;
    else {
      const gn = hutGoal(G, f, g, node);
      if (!gn || gn === node || t > F.lunch.to) { const h = SD.pickHut(G, f, node, g.n, () => R(f)); if (h) return 'h:' + h; }
      hungry = true;
      if (gn && gn !== node) hd = homeDist(G, gn);
    }
  }
  const dn = home ? homeDist(G) : null, here = dn?.[node] ?? Infinity, hh = hd?.[node] ?? Infinity;
  const toward = to => (dn && (dn[to] ?? Infinity) < here ? F.homeW : 1) * (hungry && (hd ? (hd[to] ?? Infinity) < hh : net.hut[to]) ? F.hungryW : 1);
  const o = [];
  for (const s of net.L[node] || []) {
    if (!net.ex[s.to]) continue;
    const w = F.liftW * (s.back ? F.backW : 1) * Math.exp(-(f.wait[s.id] || 0) / F.queueTau) * net.dst[s.to][g.k] * toward(s.to);
    o.push({ d: 'q:' + s.id, w: Math.max(0.02, w) });
  }
  for (const p of net.P[node] || []) o.push({ d: 'p:' + p.id, w: Math.max(0.005, F.pref[LV[g.k]][p.level] * (g.lp === p.id ? F.variety : 1)) * toward(p.to) });
  if (!o.length) return node === 'tal' && net.hold ? 'w' : 'x';
  return pick(f, o).d;
}

function valid(G, f, g, node, d) {
  if (!d) return false;
  const i = d.indexOf(':'), s = i < 0 ? d : d.slice(0, i), id = d.slice(i + 1);
  if (s === 'o') return node === 'tal';
  if (s === 'q') { const x = LIFT[id]; return !!x && x.from === node && !!net.run[id] && net.ex[x.to]; }
  if (s === 'p') { const p = PISTE[id]; return !!p && p.from === node && net.P[node].includes(p); }
  if (s === 'h') return SD.HUT[id]?.node === node && SD.seatsEff(G, id) > 0;
  return false;
}

function runTime(f, g, p) {
  const d = LV.indexOf(p.level) - g.k, adj = d > 0 ? 1 - F.over * d * 2 : 1 + F.under * -d;
  const km = p.rk || p.km;
  return km / (F.speed[p.level] * g.v * adj) * 60 + F.pause[p.level] * Math.min(1, km / F.pauseKm) * span(f, [0.5, 1.5]);
}

function drop(G, f, g, lost) {
  g.x = 1;
  grp(f).delete(g.i);
  f.present = Math.max(0, f.present - g.n);
  SD.leave(G, f, g.n);
  if (lost) G.today.lost = (G.today.lost || 0) + g.n;
}

function go(G, f, g, node, t, ev, end) {
  let d = g.nx;
  g.nx = null;
  if (!valid(G, f, g, node, d)) d = decide(G, f, g, node, t);
  if (g.s !== 'n') { g.t1 = t; mark(g); }
  const i = d.indexOf(':'), s = i < 0 ? d : d.slice(0, i), id = d.slice(i + 1);
  g.t0 = t;
  g.rb = 0;
  if (s === 'o' || s === 'x') return drop(G, f, g, s === 'x');
  if (s === 'w') { g.s = 'w'; g.at = node; return; }
  g.at = id;
  if (s === 'q') { g.s = 'q'; f.Q[id].push(g.i); return; }
  if (s === 'h') { g.s = 'hq'; SD.queueHut(f, id, g.i); return; }
  g.s = 'p';
  g.lp = id;
  g.t1 = t + runTime(f, g, PISTE[id]);
  if (g.t1 < end) ev.push(g);
}

const nodeOf = g => g.s === 'r' ? (g.rb ? LIFT[g.at].from : LIFT[g.at].to) : g.s === 'p' ? PISTE[g.at].to : g.s === 'h' ? SD.HUT[g.at].node : 'tal';

function finish(G, f, g) {
  if (g.s === 'p') { wear(G, PISTE[g.at].of || g.at, g.n); if (PISTE[g.at].custom) { const R = G.today.runs || (G.today.runs = {}); R[g.at] = (R[g.at] || 0) + g.n; } }
  if (g.s === 'h') f.hut[g.at] = Math.max(0, f.hut[g.at] - g.n);
}

function board(G, f, t) {
  const T = G.today, M = grp(f);
  let ws = 0, bs = 0;
  for (const l of G.lifts) {
    const c = capPerMin(l), on = running(l), K = keys(l), pl = places(l), gap = LIFT[l.id].gap / 60;
    let u = 0;
    for (const k of K) {
      const Q = f.Q[k];
      let b = 0;
      if (on) {
        let tc = Math.max(f.cab[k] || 0, t);
        while (tc < t + 1) {
          let free = pl, cid = 0;
          for (let j = 0; j < Q.length && j < F.look && free > 0; j++) {
            const g = M.get(Q[j]);
            if (!g) { Q.splice(j--, 1); continue; }
            if (g.t0 > tc) break;
            const split = g.n > pl && free === pl;
            if (g.n > free && !split) continue;
            Q.splice(j--, 1);
            g.t1 = tc;
            mark(g);
            if (!cid) cid = f.cn[k] = (f.cn[k] || 0) + 1;
            g.cb = cid;
            g.cs = pl - free;
            free = split ? 0 : free - g.n;
            if (split) tc += gap * (Math.ceil(g.n / pl) - 1);
            b += g.n;
            ws += (tc - g.t0) * g.n;
            g.s = 'r';
            g.at = k;
            g.t0 = tc;
            g.t1 = tc + LIFT[k].ride;
            g.nx = null;
          }
          tc += gap;
        }
        f.cab[k] = tc;
      }
      u += c ? b / c / K.length : 0;
      f.board[k] = b;
      bs += b;
      T.rides[l.id] = (T.rides[l.id] || 0) + b;
    }
    l.util = u;
  }
  return [ws, bs];
}

export function step(G, t) {
  const f = G.flow, T = G.today, end = t + 1, ev = [];
  net = network(G);
  for (const l of G.lifts) if (!running(l)) for (const k of keys(l)) {
    const Q = f.Q[k];
    while (Q.length) { const g = grp(f).get(Q.shift()); if (g) { g.t1 = t; mark(g); g.s = 'n'; g.at = LIFT[k].from; g.t1 = t; ev.push(g); } }
  }
  arrivals(G, f, t, ev);
  const cap = serveCash(G, f, t), all = f.g;
  for (const g of all) {
    if (g.s === 'a') { if (g.t1 < end) ev.push(g); continue; }
    if (g.s !== 'r' && g.s !== 'p' && g.s !== 'h') continue;
    if (!g.nx && g.t1 - g.dl < end) g.nx = decide(G, f, g, nodeOf(g), Math.max(t, g.t1));
    if (g.t1 < end) ev.push(g);
  }
  for (let n = 0; n < 4 && ev.length; n++) {
    const list = ev.splice(0).sort((a, b) => a.t1 - b.t1);
    for (const g of list) {
      if (g.x) continue;
      const node = g.s === 'a' ? 'tal' : g.s === 'n' ? g.at : nodeOf(g);
      finish(G, f, g);
      go(G, f, g, node, Math.max(t, g.t1), ev, end);
    }
  }
  for (const g of all) {
    if (g.s !== 'w' || g.x) continue;
    const d = decide(G, f, g, 'tal', t);
    if (d === 'w') { if (R(f) < F.holdGiveUp) drop(G, f, g, true); }
    else { g.nx = d; go(G, f, g, 'tal', t, ev, end); }
  }
  const [ws, bs] = board(G, f, t);
  SD.hutStep(G, f, t, (g, node) => go(G, f, g, node, t, ev, end), () => R(f));
  tally(G, f, cap, all);
  if (f.g.some(g => g.x)) f.g = f.g.filter(g => !g.x);
  f.avgWait = bs ? ws / bs : 0;
  T.waitSum += ws;
  T.boardSum += bs;
}

function tally(G, f, cap, all) {
  const T = G.today;
  for (const k in f.queue) { f.queue[k] = 0; f.ride[k] = 0; }
  for (const k in f.run) f.run[k] = 0;
  let hold = 0, cq = 0, n = 0;
  for (const g of all) {
    if (g.x) continue;
    n += g.n;
    if (g.s === 'q') f.queue[g.at] += g.n;
    else if (g.s === 'r') f.ride[g.at] += g.n;
    else if (g.s === 'p') f.run[g.at] += g.n;
    else if (g.s === 'w') hold += g.n;
    else if (g.s === 'c') cq += g.n;
  }
  f.present = n;
  f.hold = hold;
  f.cashQ = cq;
  f.cashWait = cq / cap;
  T.cashPeak = Math.max(T.cashPeak || 0, f.cashWait);
  for (const l of G.lifts) {
    const c = capPerMin(l), on = running(l);
    for (const k of keys(l)) {
      const w = on && c ? f.queue[k] / c : 0;
      f.wait[k] = w;
      T.peak[l.id] = Math.max(T.peak[l.id] || 0, w);
    }
  }
}

export function rescue(G, l) {
  const f = G.flow, K = keys(l);
  let n = 0;
  if (!Array.isArray(f?.g)) return 0;
  for (const g of f.g) {
    if (g.x || g.s !== 'r' || !K.includes(g.at)) continue;
    g.rb = 1;
    g.t1 = G.min;
    g.nx = null;
    n += g.n;
  }
  return n;
}

export function endFlow(G) {
  const f = G.flow;
  f.g = [];
  f.CQ = [];
  f.acc = {};
  f.nz = {};
  f.ct = 0;
  for (const k in f.Q) f.Q[k] = [];
  for (const k in f.cab) f.cab[k] = 0;
  for (const o of [f.queue, f.ride, f.run, f.wait, f.board]) for (const k in o) o[k] = 0;
  SD.endFlow(f);
  for (const l of G.lifts) l.util = 0;
  f.present = 0;
  f.hold = 0;
  f.avgWait = 0;
  f.cashQ = 0;
  f.cashWait = 0;
  f.cashServed = 0;
}

export { PISTE, LIFT };
