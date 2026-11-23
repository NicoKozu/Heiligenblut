import { D } from './data.js';
import { pay, log } from './assets.js';
import { duty } from './staff.js';
import { grp } from './people.js';
import { mark } from './flow.js';

const X = D.side;
export const HUTS = [], HUT = {}, NODES = new Set();
export const AREAS = Object.keys(X.areas);
const nodeSeats = n => X.huts.filter(h => h.node === n).reduce((a, h) => a + h.seats, 0);
const SEATMAX = Math.max(...[...new Set(X.huts.map(h => h.node))].map(nodeSeats));
export function rehut(G) {
  HUTS.length = 0;
  for (const k in HUT) delete HUT[k];
  NODES.clear();
  for (const h of X.huts) { HUTS.push(h.id); HUT[h.id] = h; NODES.add(h.node); }
  if (G?.side) for (const id in G.side.huts) if (!HUT[id]) delete G.side.huts[id];
  if (G?.side) for (const h of X.huts) if (!G.side.huts[h.id]) G.side.huts[h.id] = { open: false, level: 'normal', extra: 0, own: false };
}
rehut();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lin = (v, a, b) => clamp((b - v) / (b - a), 0, 1) * 100;
const sum = a => a.reduce((x, y) => x + y, 0);

export function initSide(G) {
  if (!G.side) G.side = { huts: {}, rental: { price: X.rental.price, cond: X.rental.start }, school: { price: X.school.price }, park: { price: X.parking.price, cap: X.parking.cap } };
  for (const h of X.huts) if (!G.side.huts[h.id]) G.side.huts[h.id] = { open: true, level: 'normal', extra: 0, own: h.id === 'rossbach' };
  for (const id in G.side.huts) if (G.side.huts[id].own == null) G.side.huts[id].own = true;
  return G.side;
}

export function sideFlow(f) {
  if (!f.hut || !f.HQ || Object.keys(f.hut).some(k => !HUT[k] || typeof f.hut[k] !== 'number')) {
    f.hut = Object.fromEntries(HUTS.map(id => [id, 0]));
    f.HQ = Object.fromEntries(HUTS.map(id => [id, []]));
    f.hutQ = Object.fromEntries(HUTS.map(id => [id, 0]));
    f.hutWait = Object.fromEntries(HUTS.map(id => [id, 0]));
  }
  for (const id of HUTS) if (!(id in f.hut)) { f.hut[id] = 0; f.HQ[id] = []; f.hutQ[id] = 0; f.hutWait[id] = 0; }
  if (f.cars == null) Object.assign(f, { cars: 0, school: 0 });
  if (!f.carsB) f.carsB = { tal: f.cars };
  return f;
}

export const seats = (G, id) => (HUT[id]?.seats || 0) + (G.side.huts[id]?.extra || 0);
export const hutOpen = (G, id) => !!(G.side.huts[id]?.open && G.side.huts[id].own && HUT[id]);
export const hutNeed = (G, id) => Math.ceil(seats(G, id) / X.seatsPerStaff);
export const gastroNeed = G => HUTS.filter(id => hutOpen(G, id)).reduce((a, id) => a + hutNeed(G, id), 0);
export const staffRatio = G => { const n = gastroNeed(G); return n ? Math.min(1, duty(G, 'gastro') / n) : 1; };
export const seatsEff = (G, id) => hutOpen(G, id) ? seats(G, id) * staffRatio(G) : 0;
export const spend = (G, id) => { const L = X.levels[G.side.huts[id].level]; return X.gastro.perGuest / X.gastro.lunchRef * L.price * Math.pow(L.price, -X.spendEl); };
const goodsShare = (G, id) => { const L = X.levels[G.side.huts[id].level]; return X.gastro.goods * L.goods / L.price; };

function earn(G, k, v) {
  const T = G.today;
  T.revenue[k] = (T.revenue[k] || 0) + v;
  G.cash += v;
}

function bump(G, k, v) { const s = G.today.side || (G.today.side = {}); s[k] = (s[k] || 0) + v; }

export function parkShare(G) {
  const P = X.parking;
  return Math.min(P.maxShare, P.share * Math.pow(Math.max(1, G.side.park.price) / P.price, -P.el));
}

export function arrive(G, f, nb, B) {
  const P = X.parking, ps = parkShare(G), C = f.carsB || (f.carsB = {}), got = {};
  let over = 0, adm = 0, n = 0;
  for (const b of B) {
    const v = nb[b.id] || 0;
    if (!(v > 0)) continue;
    const cars = v * ps / P.persons, a = Math.min(cars, Math.max(0, b.cap - (C[b.id] || 0)));
    C[b.id] = (C[b.id] || 0) + a;
    got[b.id] = v - (cars - a) * P.persons;
    over += cars - a;
    adm += a;
    n += v;
  }
  for (const b of B) {
    if (!(over > 1e-9)) break;
    if (!(b.id in got)) continue;
    const a = Math.min(over, Math.max(0, b.cap - (C[b.id] || 0)));
    if (!(a > 0)) continue;
    C[b.id] += a;
    got[b.id] += a * P.persons;
    over -= a;
    adm += a;
  }
  if (n <= 0) return got;
  f.cars += adm;
  if (adm > 0) { earn(G, 'parking', adm * G.side.park.price); bump(G, 'cars', adm); }
  const turned = over * P.persons;
  if (turned > 0) {
    if (!G.today.side?.turned) log(G, 'Parkplatz voll – Gäste kehren um', 'bad');
    bump(G, 'turned', turned);
  }
  return got;
}

export function rentShare(G) {
  const R = X.rental, s = G.side.rental;
  return R.share * Math.pow(Math.max(1, s.price) / R.price, -R.el) * (R.cond[0] + R.cond[1] * s.cond / 100);
}

export function svcK(G, got) {
  const B = G.custom?.bases || [], k = D.custom.svc.k;
  let n = 0, w = 0;
  for (const b in got || {}) { const v = got[b] || 0; n += v; const o = B.find(x => x.id === b); w += v * (!o || o.svc ? 1 : k); }
  return n > 0 ? w / n : 1;
}

export function guests(G, f, full, all, got) {
  const sk = svcK(G, got);
  full *= sk;
  const r = all * rentShare(G) * sk;
  if (r > 0) { earn(G, 'rental', r * G.side.rental.price); pay(G, 'side', r * X.rental.upkeep); bump(G, 'rent', r); }
  const S = X.school, want = full * S.share * Math.pow(Math.max(1, G.side.school.price) / S.price, -S.el);
  const cap = duty(G, 'instructor') * D.staff.pupils, b = Math.max(0, Math.min(want, cap - f.school));
  f.school += b;
  if (b > 0) { earn(G, 'school', b * G.side.school.price); bump(G, 'pupils', b); }
  bump(G, 'schoolWant', want);
  if (want > b) bump(G, 'schoolMiss', want - b);
}

export function leave(G, f, n, b = 'tal') {
  if (!(n > 0)) return;
  const c = n * parkShare(G) / X.parking.persons;
  f.cars = Math.max(0, f.cars - c);
  if (f.carsB) f.carsB[b] = Math.max(0, (f.carsB[b] || 0) - c);
}

export function lunchRate(G, f, node) {
  const hs = X.huts.filter(h => h.node === node), q = sum(hs.map(h => f.hutQ[h.id])), w = q > 0 ? sum(hs.map(h => f.hutQ[h.id] * f.hutWait[h.id])) / q : 0;
  return 0.8 * sum(hs.filter(h => G.side.huts[h.id].own).map(h => h.seats)) / SEATMAX * Math.exp(-w / 20);
}

export const lure = (G, f, id) => seatsEff(G, id) > 0 ? seats(G, id) * HUT[id].draw * X.levels[G.side.huts[id].level].draw * Math.exp(-(f.hutWait[id] || 0) / 15) : 0;

export function pickHut(G, f, node, n, rnd) {
  if (!NODES.has(node)) return null;
  const hs = X.huts.filter(h => h.node === node && G.side.huts[h.id].own);
  if (!hs.length) return null;
  const q = sum(hs.map(h => f.hutQ[h.id])), w = q > 0 ? sum(hs.map(h => f.hutQ[h.id] * f.hutWait[h.id])) / q : 0;
  if (rnd() >= Math.exp(-w / X.eatTau)) return null;
  bump(G, 'lunchWant', n);
  const opts = X.huts.filter(o => o.node === node && seatsEff(G, o.id) > 0).map(o => ({ id: o.id, w: lure(G, f, o.id) }));
  if (!opts.length) { bump(G, 'lunchMiss', n); return null; }
  let x = rnd() * sum(opts.map(o => o.w));
  for (const o of opts) if ((x -= o.w) <= 0) return o.id;
  return opts[opts.length - 1].id;
}

export const hutAt = (G, node) => X.huts.some(h => h.node === node && seatsEff(G, h.id) > 0);

export function queueHut(f, id, gi) { f.HQ[id].push(gi); }

export function hutStep(G, f, t, back, rnd) {
  const dur = D.flow.lunch.dur, st = D.flow.stay;
  let pk = 0;
  const M = grp(f);
  for (const id of HUTS) {
    if (!f.HQ[id]) { f.HQ[id] = []; f.hut[id] = 0; f.hutQ[id] = 0; f.hutWait[id] = 0; }
    const Q = f.HQ[id], eff = seatsEff(G, id);
    if (Q.length && (eff <= 0 || f.hutWait[id] > X.maxWait)) {
      for (let j = 0; j < Q.length; j++) {
        const g = M.get(Q[j]);
        if (!g) { Q.splice(j--, 1); continue; }
        if (eff > 0 && rnd() >= X.giveUp) continue;
        Q.splice(j--, 1);
        bump(G, 'lunchMiss', g.n);
        g.lt = -1;
        back(g, HUT[id].node);
      }
    }
    while (Q.length) {
      const g = M.get(Q[0]);
      if (!g) { Q.shift(); continue; }
      if (f.hut[id] + g.n > eff) break;
      Q.shift();
      f.hut[id] += g.n;
      const v = g.n * spend(G, id);
      earn(G, 'gastro', v);
      pay(G, 'goods', v * goodsShare(G, id));
      bump(G, 'lunch', g.n);
      bump(G, 'h_' + id, v);
      f.lunched = (f.lunched || 0) + g.n;
      g.t1 = Math.max(g.t0, t);
      mark(g);
      g.e = 1;
      g.s = 'h';
      g.t0 = Math.max(g.t0, t);
      g.t1 = g.t0 + dur * (st[0] + (st[1] - st[0]) * rnd());
      g.nx = null;
    }
    let q = 0;
    for (const i of Q) q += M.get(i)?.n || 0;
    f.hutQ[id] = q;
    f.hutWait[id] = eff > 0 ? q / (eff / dur) : 0;
    pk = Math.max(pk, f.hutWait[id]);
  }
  const s = G.today.side || (G.today.side = {});
  s.hutPeak = Math.max(s.hutPeak || 0, pk);
}

export const inHuts = f => f && f.hut ? sum(HUTS.map(id => (f.hut[id] || 0) + (f.hutQ[id] || 0))) : 0;
export const hutWaitNow = f => { if (!f?.hutQ) return 0; const q = sum(HUTS.map(id => f.hutQ[id])); return q > 0 ? sum(HUTS.map(id => f.hutQ[id] * f.hutWait[id])) / q : 0; };

export function gastroScore(G) {
  const s = G.today.side || {}, f = G.flow;
  const miss = (s.lunchMiss || 0) / Math.max(1, s.lunchWant || 0);
  const l = clamp(lin(hutWaitNow(f), X.wait[0], X.wait[1]) - X.miss * miss, 0, 100);
  return X.score.lunch * l + X.score.staff * staffRatio(G) * 100;
}

export function sideScore(G) {
  const s = G.today.side || {};
  const sc = 100 * (1 - (s.schoolMiss || 0) / Math.max(1, s.schoolWant || 0));
  return 0.5 * G.side.rental.cond + 0.5 * sc;
}

export function levelAdj(G, sg) {
  const open = HUTS.filter(id => hutOpen(G, id));
  if (!open.length) return 0;
  const w = sum(open.map(id => seats(G, id)));
  return (D.segs[sg].gastro ?? 0) * sum(open.map(id => seats(G, id) * X.levels[G.side.huts[id].level].sat)) / w;
}

export const parkAdj = G => clamp(-X.parking.satK * (G.side.park.price - X.parking.price), -25, 6);

export function dayStart(G) {
  pay(G, 'side', HUTS.filter(id => hutOpen(G, id)).reduce((a, id) => a + (HUT[id].fix ?? X.hutFix), 0) + X.parking.fix);
}

export function evening(G) {
  const r = G.today.side?.rent || 0;
  G.side.rental.cond = clamp(G.side.rental.cond - r * X.rental.wear, 0, 100);
}

export function endFlow(f) {
  for (const id of HUTS) { f.hut[id] = 0; f.HQ[id] = []; f.hutQ[id] = 0; f.hutWait[id] = 0; }
  f.cars = 0;
  f.carsB = {};
  f.school = 0;
}

export function setLevel(G, id, lv) {
  if (!HUT[id] || !X.levels[lv] || G.phase === 'open') return false;
  G.side.huts[id].level = lv;
  return true;
}

export function toggleHut(G, id) {
  if (!HUT[id]) return false;
  const h = G.side.huts[id];
  if (h.build || !h.own) return false;
  h.open = !h.open;
  log(G, HUT[id].name + (h.open ? ' geöffnet' : ' geschlossen'), h.open ? 'good' : '');
  return true;
}

export function setSidePrice(G, k, v) {
  if (G.phase === 'open') return false;
  const o = k === 'rental' ? G.side.rental : k === 'school' ? G.side.school : k === 'park' ? G.side.park : null;
  const n = Math.round(Number(v));
  if (!o || !Number.isFinite(n)) return false;
  o.price = clamp(n, 0, k === 'park' ? 40 : 300);
  return true;
}

export function rentalAct(G, kind) {
  const R = X.rental, s = G.side.rental;
  if (kind === 'buy') {
    if (G.cash < R.buy) return false;
    pay(G, 'rentalBuy', R.buy);
    s.cond = 100;
    log(G, 'Verleih: neue Ausrüstung gekauft', 'good');
    return true;
  }
  if (s.cond >= R.service.max || G.cash < R.service.cost) return false;
  pay(G, 'rentalBuy', R.service.cost);
  s.cond = Math.min(R.service.max, s.cond + R.service.gain);
  log(G, 'Verleih: Ausrüstung gewartet');
  return true;
}

export function outlook(G, n) {
  const f = 1 - D.mix.half, P = X.parking;
  const lunchers = n * X.gastro.lunchRef;
  const open = HUTS.filter(id => hutOpen(G, id));
  const sp = open.length ? sum(open.map(id => seatsEff(G, id) * spend(G, id))) / Math.max(1, sum(open.map(id => seatsEff(G, id)))) : 0;
  const school = Math.min(n * f * X.school.share * Math.pow(Math.max(1, G.side.school.price) / X.school.price, -X.school.el), duty(G, 'instructor') * D.staff.pupils);
  const cars = Math.min(G.side.park.cap, n * parkShare(G) / P.persons);
  return {
    gastro: open.length ? lunchers * sp : 0,
    rental: n * rentShare(G) * G.side.rental.price,
    school: school * G.side.school.price,
    parking: cars * G.side.park.price,
    cars: n * parkShare(G) / P.persons,
    pupils: school
  };
}

export const areaOf = k => k in D.tickets ? 'tickets' : X.areas[k] ? k : 'tickets';
export function byArea(rev) {
  const o = Object.fromEntries(AREAS.map(k => [k, 0]));
  for (const k in rev || {}) o[areaOf(k)] += rev[k];
  return o;
}
