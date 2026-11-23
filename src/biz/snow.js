import { D } from './data.js';
import { pl, PX } from './area.js';
import { next as rand } from './rng.js';
import { tempAt, advance, applyWind, avalClose, weatherFactor, forecastFor } from './weather.js';
import { pay, log } from './assets.js';
import { hit } from './satisfaction.js';
import { duty, patrolShort } from './staff.js';

const C = D.cover, S = D.snow, W = D.weather;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PISTE = PX;

export const pisteH = p => (D.nodeH[p.from] + D.nodeH[p.to]) / 2;
export const pisteT = (p, day) => tempAt(day.tTal, pisteH(p));
export const area = p => p.km * 1000 * (p.width || S.width);
export const label = o => o.cond < C.worn ? 'abgefahren' : o.q || 'griffig';
export const depthF = cm => clamp(C.depth[2] + (1 - C.depth[2]) * (cm - C.depth[0]) / (C.depth[1] - C.depth[0]), C.depth[2], 1);
export const score = (G, id) => { const o = G.pistes[id]; return clamp((o.cond ?? 0) * (C.q[label(o)] ?? 1) * depthF(o.snow ?? 0), 0, 100); };
export const avgSnow = G => { const L = pl(G); return L.reduce((a, p) => a + p.km * (G.pistes[p.id].snow || 0), 0) / L.reduce((a, p) => a + p.km, 0); };
const newAt = (cm, h) => cm * clamp(W.lowSnow + (1 - W.lowSnow) * (h - W.ref) / (W.top - W.ref), W.lowSnow, 1.2);

export function cannons(G) {
  if (!G.cannons) {
    const per = Math.floor(S.start / S.pistes.length);
    G.cannons = Object.fromEntries(S.pistes.map((id, i) => [id, per + (i < S.start - per * S.pistes.length ? 1 : 0)]));
  }
  return G.cannons;
}

export function initSnow(G, fresh) {
  cannons(G);
  if (!G.groom) G.groom = { machines: D.groom.start };
  for (const p of pl(G)) {
    const o = G.pistes[p.id];
    if (fresh) o.snow = Math.round(C.natural[0] + C.natural[1] * (pisteH(p) - W.ref) + (G.cannons[p.id] ? C.cannonStart : 0));
    if (!o.q) o.q = 'griffig';
    if (o.grm === undefined) o.grm = true;
    if (o.gun === undefined) o.gun = 0;
    if (o.aper === undefined) o.aper = false;
  }
  if (G.night === undefined) G.night = null;
}

export function wear(G, id, n) {
  const o = G.pistes[id];
  if (!o || n <= 0) return;
  const k = C.wearKm / (PISTE[id]?.km || C.wearKm), f = Math.max(0, (o.cond - C.floor) / (C.groomed - C.floor));
  o.cond = Math.max(0, o.cond - n * C.wear * k * f * (C.wearBy[o.q] || 1) * (o.groomed === false ? C.rough : 1));
}

const MID = D.groom.mid;
export function midPlan(G) {
  const cap = G.groom.machines * (MID.to - MID.from) / 60;
  let hours = 0;
  const list = [];
  for (const p of pl(G)) {
    if (!G.pistes[p.id].mid) continue;
    const h = p.km * MID.hoursPerKm;
    if (hours + h > cap + 1e-6) continue;
    hours += h;
    list.push(p.id);
  }
  return { cap, hours, list, cost: hours * D.groom.perHour };
}

export function setMid(G, id) {
  const o = G.pistes[id];
  if (!o) return false;
  o.mid = !o.mid;
  return true;
}

function midMinute(G) {
  if (G.min === MID.from) {
    const m = midPlan(G);
    G.today.mid = m.list.filter(id => G.pistes[id].open);
    if (G.today.mid.length) pay(G, 'groom', G.today.mid.reduce((a, id) => a + PISTE[id].km * MID.hoursPerKm, 0) * D.groom.perHour);
  }
  if (G.min < MID.from || G.min >= MID.to || !G.today.mid) return;
  for (const id of G.today.mid) {
    const o = G.pistes[id];
    if (o.cond < MID.target) o.cond += (MID.target - o.cond) / (MID.to - G.min);
  }
}

export function snowFactor(G, day) {
  const F = D.snowFactor, s = avgSnow(G);
  const st = F.steps.find(([lim]) => s < lim);
  return (st ? st[1] : F.top) + (day && day.cm >= F.powder ? F.powderAdd : 0);
}

export function demandExtra(G, date) {
  const day = forecastFor(G, date);
  return { weather: weatherFactor(day), snow: snowFactor(G, day) };
}

export function nightTemp(G, p) {
  const w = G.weather, a = w.today, b = G.phase === 'closed' ? w.ahead[0] : a;
  return tempAt((a.tTal + (b.fc ? b.fc.tTal : b.tTal)) / 2 + S.night, pisteH(p));
}

export function gunPlan(G, id, h = G.pistes[id].gun) {
  const n = cannons(G)[id] || 0, p = PISTE[id];
  const m3 = n * S.m3PerHour * h;
  return { n, h, m3, cm: m3 / area(p) * 100, cost: m3 * S.perM3, water: m3 * S.water, kwh: m3 * S.kwh, cold: nightTemp(G, p) <= S.maxTemp };
}

export function groomPlan(G) {
  const cap = Math.min(G.groom.machines, duty(G, 'groomer')) * D.groomNight.shift;
  let hours = 0;
  const list = [];
  for (const p of pl(G)) {
    if (!G.pistes[p.id].grm) continue;
    const h = p.km * D.groom.hoursPerKm;
    if (hours + h > cap + 1e-6) continue;
    hours += h;
    list.push(p.id);
  }
  const drivers = Math.ceil(hours / D.groomNight.shift - 1e-6);
  const want = pl(G).filter(p => G.pistes[p.id].grm).reduce((a, p) => a + p.km * D.groom.hoursPerKm, 0);
  return { cap, hours, want, list, drivers, cost: hours * D.groom.perHour };
}

export function nightTotals(G) {
  const g = groomPlan(G), t = { m3: 0, cost: 0, water: 0, kwh: 0 };
  for (const p of pl(G)) {
    const q = gunPlan(G, p.id);
    if (!q.n || !q.h || !q.cold) continue;
    t.m3 += q.m3; t.cost += q.cost; t.water += q.water; t.kwh += q.kwh;
  }
  return { groom: g, gun: t, total: g.cost + t.cost };
}

export function night(G, date) {
  const prev = G.weather.today, g = groomPlan(G), rep = { date, pistes: {}, groomCost: g.cost, gunCost: 0, m3: 0, closed: [], opened: [], skipped: [] };
  const warm = {};
  for (const p of pl(G)) {
    const o = G.pistes[p.id], t = pisteT(p, prev), r = rep.pistes[p.id] = { melt: 0, gun: 0, groomed: false, fresh: 0 };
    warm[p.id] = t > C.refreeze;
    if (t > 0) r.melt += C.melt * t * (C.meltBy[prev.type] || 1);
    if (prev.cm > 0 && t > C.rainAt) { r.melt += newAt(prev.cm, pisteH(p)) * C.rainMelt; o.q = 'sulzig'; }
    o.snow = Math.max(0, o.snow * (1 - C.compact) - r.melt);
    const q = gunPlan(G, p.id);
    if (q.n && q.h) {
      if (q.cold) { o.snow += q.cm; r.gun = q.cm; rep.m3 += q.m3; rep.gunCost += q.cost; }
      else rep.skipped.push(p.id);
    }
  }
  if (rep.gunCost) pay(G, 'snowmaking', rep.gunCost);
  if (g.cost) pay(G, 'groom', g.cost);
  advance(G, date);
  const day = G.weather.today;
  rep.newCm = day.cm;
  for (const p of pl(G)) {
    const o = G.pistes[p.id], r = rep.pistes[p.id], t = pisteT(p, day);
    const fresh = day.cm > 0 && t <= C.rainAt ? newAt(day.cm, pisteH(p)) : 0;
    o.snow += fresh * C.settle;
    r.fresh = fresh;
    const gr = g.list.includes(p.id);
    o.groomed = gr;
    r.groomed = gr;
    if (gr) {
      o.cond = warm[p.id] && t <= 0 && !fresh ? C.groomedHard : C.groomed;
      o.q = 'griffig';
    } else if (fresh >= C.newSnow) {
      o.q = 'pulvrig';
      o.cond = Math.max(o.cond, C.powder + fresh);
    } else if (warm[p.id] && t <= 0) o.q = 'eisig';
    else if (o.q === 'pulvrig' && !fresh) o.q = 'griffig';
    if (t > 1 && !(fresh >= C.newSnow)) o.q = 'sulzig';
    if (day.cm > 0 && t > C.rainAt) o.q = 'sulzig';
    o.cond = clamp(o.cond, 0, 100);
    o.snow = Math.round(o.snow * 10) / 10;
    r.snow = o.snow;
    if (o.snow < C.minOpen && !o.aper) {
      o.aper = true;
      if (o.open) { o.open = false; rep.closed.push(p.id); log(G, 'Piste ' + p.id + ' ' + p.name + ' apert aus – gesperrt', 'bad'); }
    } else if (o.aper && o.snow >= C.minOpen) {
      o.aper = false;
      o.open = true;
      rep.opened.push(p.id);
      log(G, 'Piste ' + p.id + ' ' + p.name + ' wieder befahrbar', 'good');
    }
  }
  if (rep.skipped.length) log(G, 'Beschneiung zu warm: Piste ' + rep.skipped.join(', '), 'bad');
  applyWind(G);
  if (G.lifts.some(l => l.wind)) log(G, 'Sturm ' + day.wind + ' km/h – ' + G.lifts.filter(l => l.wind).map(l => l.name).join(' und ') + ' geschlossen', 'bad');
  if (G.weather.aval >= 4) log(G, 'Lawinenwarnstufe ' + G.weather.aval + ' – Piste ' + avalClose(G).join('/') + ' sperren!', 'bad');
  G.night = rep;
  return rep;
}

export function minute(G) {
  midMinute(G);
  const a = G.weather?.aval || 1;
  if (a < 4) return;
  for (const id of avalClose(G)) {
    const o = G.pistes[id];
    if (!o.open || rand(G) >= D.aval.risk * (a - 3) * (1 + patrolShort(G)) * (G.flow?.present > 0 ? 1 : 0)) continue;
    o.open = false;
    hit(G, 'accident');
    log(G, 'Lawinenabgang auf Piste ' + id + ' – Unfall, Piste gesperrt', 'bad');
  }
}


export const startSnow = (G, p) => Math.round(C.natural[0] + C.natural[1] * (pisteH(p) - W.ref) + (cannons(G)[p.id] ? C.cannonStart : 0));

export function newSeason(G) {
  for (const p of pl(G)) {
    const o = G.pistes[p.id];
    o.snow = startSnow(G, p);
    if (o.aper) o.open = true;
    o.aper = false;
    o.cond = D.pisteStart.cond;
    o.q = 'griffig';
  }
}

export function setGroom(G, id) {
  const o = G.pistes[id];
  if (!o) return false;
  o.grm = !o.grm;
  return true;
}

export function setGun(G, id, d) {
  const o = G.pistes[id];
  if (!o || !cannons(G)[id]) return false;
  o.gun = clamp(o.gun + d, S.hours[0], S.hours[1]);
  return true;
}
