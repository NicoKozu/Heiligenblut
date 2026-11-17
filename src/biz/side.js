import { D } from './data.js';
import { pay, log } from './assets.js';
import { duty } from './staff.js';
import { out } from './people.js';

const X = D.side;
export const HUTS = X.huts.map(h => h.id);
export const HUT = Object.fromEntries(X.huts.map(h => [h.id, h]));
export const AREAS = Object.keys(X.areas);
export const NODES = new Set(X.huts.map(h => h.node));
const nodeSeats = n => X.huts.filter(h => h.node === n).reduce((a, h) => a + h.seats, 0);
const SEATMAX = Math.max(...[...NODES].map(nodeSeats));
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
  if (!f.hut || !f.hutQ || Object.keys(f.hut).some(k => !HUT[k])) {
    f.hut = Object.fromEntries(HUTS.map(id => [id, new Array(D.flow.lunch.dur).fill(0)]));
    f.hutQ = Object.fromEntries(HUTS.map(id => [id, 0]));
    f.hutWait = Object.fromEntries(HUTS.map(id => [id, 0]));
  }
  if (f.cars == null) Object.assign(f, { cars: 0, school: 0 });
  return f;
}

export const seats = (G, id) => HUT[id].seats + (G.side.huts[id].extra || 0);
export const hutOpen = (G, id) => G.side.huts[id].open && G.side.huts[id].own;
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

export function arrive(G, f, n) {
  if (n <= 0) return 1;
  const P = X.parking, cars = n * parkShare(G) / P.persons, free = Math.max(0, G.side.park.cap - f.cars), adm = Math.min(cars, free);
  f.cars += adm;
  if (adm > 0) { earn(G, 'parking', adm * G.side.park.price); bump(G, 'cars', adm); }
  const turned = (cars - adm) * P.persons;
  if (turned > 0) {
    if (!G.today.side?.turned) log(G, 'Parkplatz voll – Gäste kehren um', 'bad');
    bump(G, 'turned', turned);
  }
  return 1 - turned / n;
}

export function rentShare(G) {
  const R = X.rental, s = G.side.rental;
  return R.share * Math.pow(Math.max(1, s.price) / R.price, -R.el) * (R.cond[0] + R.cond[1] * s.cond / 100);
}

export function guests(G, f, full, all) {
  const r = all * rentShare(G);
  if (r > 0) { earn(G, 'rental', r * G.side.rental.price); pay(G, 'side', r * X.rental.upkeep); bump(G, 'rent', r); }
  const S = X.school, want = full * S.share * Math.pow(Math.max(1, G.side.school.price) / S.price, -S.el);
  const cap = duty(G, 'instructor') * D.staff.pupils, b = Math.max(0, Math.min(want, cap - f.school));
  f.school += b;
  if (b > 0) { earn(G, 'school', b * G.side.school.price); bump(G, 'pupils', b); }
  bump(G, 'schoolWant', want);
  if (want > b) bump(G, 'schoolMiss', want - b);
}

export function leave(G, f, n) {
  if (n > 0) f.cars = Math.max(0, f.cars - n * parkShare(G) / X.parking.persons);
}

export function lunchRate(G, f, node) {
  const hs = X.huts.filter(h => h.node === node), q = sum(hs.map(h => f.hutQ[h.id])), w = q > 0 ? sum(hs.map(h => f.hutQ[h.id] * f.hutWait[h.id])) / q : 0;
  return 0.8 * sum(hs.filter(h => G.side.huts[h.id].own).map(h => h.seats)) / SEATMAX * Math.exp(-w / 20);
}

export function lunch(G, f, node, h) {
  const opts = X.huts.filter(o => o.node === node && seatsEff(G, o.id) > 0).map(o => ({ id: o.id, w: seats(G, o.id) * o.draw * X.levels[G.side.huts[o.id].level].draw * Math.exp(-(f.hutWait[o.id] || 0) / 15) }));
  bump(G, 'lunchWant', h);
  if (!opts.length) { bump(G, 'lunchMiss', h); return h; }
  const W = sum(opts.map(o => o.w));
  for (const o of opts) f.hutQ[o.id] += h * o.w / W;
  return 0;
}

export function hutsOut(G, f, at) {
  for (const id of HUTS) {
    const a = f.hut[id], o = a.shift();
    a.push(0);
    out(f, 'h:' + id, o);
    at[HUT[id].node] += o;
    const q = f.hutQ[id];
    if (q <= 0) continue;
    const g = seatsEff(G, id) <= 0 ? q : f.hutWait[id] > X.maxWait ? q * X.giveUp : 0;
    if (g > 0) { f.hutQ[id] -= g; out(f, 'hq:' + id, g); at[HUT[id].node] += g; bump(G, 'lunchMiss', g); }
  }
}

export function hutsIn(G, f) {
  const dur = D.flow.lunch.dur;
  let pk = 0;
  for (const id of HUTS) {
    const a = f.hut[id], eff = seatsEff(G, id), q = f.hutQ[id];
    const adm = Math.max(0, Math.min(q, eff - sum(a)));
    if (adm > 0) {
      a[dur - 1] += adm;
      f.hutQ[id] -= adm;
      out(f, 'hq:' + id, adm);
      const v = adm * spend(G, id);
      earn(G, 'gastro', v);
      pay(G, 'goods', v * goodsShare(G, id));
      bump(G, 'lunch', adm);
      bump(G, 'h_' + id, v);
    }
    if (f.hutQ[id] < 1e-6) f.hutQ[id] = 0;
    f.hutWait[id] = eff > 0 ? f.hutQ[id] / (eff / dur) : 0;
    pk = Math.max(pk, f.hutWait[id]);
  }
  const s = G.today.side || (G.today.side = {});
  s.hutPeak = Math.max(s.hutPeak || 0, pk);
}

export const inHuts = f => f && f.hut ? sum(HUTS.map(id => sum(f.hut[id]) + (f.hutQ[id] || 0))) : 0;
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
  pay(G, 'side', HUTS.filter(id => hutOpen(G, id)).length * X.hutFix + X.parking.fix);
}

export function evening(G) {
  const r = G.today.side?.rent || 0;
  G.side.rental.cond = clamp(G.side.rental.cond - r * X.rental.wear, 0, 100);
}

export function endFlow(f) {
  for (const id of HUTS) { f.hut[id].fill(0); f.hutQ[id] = 0; f.hutWait[id] = 0; }
  f.cars = 0;
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
