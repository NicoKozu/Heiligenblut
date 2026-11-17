import { D } from './data.js';
import { baseDemand } from './calendar.js';
import { range } from './rng.js';
import { running } from './assets.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const M = D.demandModel;

export const defaultPrices = () => Object.fromEntries(Object.entries(D.tickets).map(([k, t]) => [k, t.price]));

export function avgPrice(p) {
  const m = D.mix;
  return (1 - m.half) * (m.adult * p.day + m.youth * p.youth + m.child * p.child) + m.half * p.half;
}

const REF = avgPrice(defaultPrices());

export const priceFactor = p => clamp(Math.pow(REF / Math.max(1, avgPrice(p)), M.priceExp), M.priceClamp[0], M.priceClamp[1]);
export const repFactor = rep => M.rep[0] + M.rep[1] * rep / 100;

export function offerFactor(G) {
  let all = 0, open = 0;
  const reach = new Set(['tal']);
  for (let k = 0; k < 4; k++) {
    for (const l of D.lifts) { const s = G.lifts?.find(x => x.id === l.id); if (reach.has(l.from) && (!s || running(s))) reach.add(l.to); }
    for (const p of D.pistes) if (reach.has(p.from) && G.pistes?.[p.id]?.open !== false) reach.add(p.to);
  }
  for (const p of D.pistes) {
    all += p.km;
    if (G.pistes?.[p.id]?.open !== false && reach.has(p.from)) open += p.km;
  }
  return M.offer[0] + M.offer[1] * (all ? open / all : 0);
}

export function factors(G, date, extra = {}) {
  return {
    B: baseDemand(date),
    P: priceFactor(G.prices),
    R: repFactor(G.rep),
    O: offerFactor(G),
    weather: extra.weather ?? 1,
    snow: extra.snow ?? 1,
    marketing: extra.marketing ?? 1
  };
}

export function expected(G, date, extra) {
  const f = factors(G, date, extra);
  return f.B * f.P * f.R * f.O * f.weather * f.snow * f.marketing;
}

export function demand(G, date, extra) {
  const eps = range(G, M.eps[0], M.eps[1]);
  return { n: expected(G, date, extra) * eps, eps };
}
