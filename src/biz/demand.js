import { D } from './data.js';
import { baseKm } from './area.js';
import { baseDemand } from './calendar.js';
import { range } from './rng.js';
import { running, pisteOpen } from './assets.js';
import { mFactor, kFactor, SEGS } from './marketing.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const M = D.demandModel;

export const defaultPrices = () => Object.fromEntries(Object.entries(D.tickets).map(([k, t]) => [k, t.price]));

export function avgPrice(p) {
  const m = D.mix;
  return (1 - m.half) * (m.adult * p.day + m.youth * p.youth + m.child * p.child) + m.half * p.half;
}

const REF = avgPrice(defaultPrices());

export function segPrice(p, sg, child = p.child) {
  const m = D.segs[sg].mix, h = D.mix.half;
  return (1 - h) * (m.adult * p.day + m.youth * p.youth + m.child * child) + h * p.half;
}
const SREF = Object.fromEntries(SEGS.map(s => [s, segPrice(defaultPrices(), s)]));
export const segPriceFactor = (p, sg) => clamp(Math.pow(SREF[sg] / Math.max(1, segPrice(p, sg)), D.segs[sg].el), M.priceClamp[0], M.priceClamp[1]);
export const segPriceEq = (p, sg, child) => D.sat.price.ref * segPrice(p, sg, child) / SREF[sg];
export const priceFactor = p => SEGS.reduce((a, s) => a + D.segs[s].share * segPriceFactor(p, s), 0);
export const repFactor = rep => M.rep[0] + M.rep[1] * rep / 100;

export function openPistes(G) {
  const reach = new Set(['tal']);
  for (let k = 0; k < 4; k++) {
    for (const l of D.lifts) { const s = G.lifts?.find(x => x.id === l.id); if (reach.has(l.from) && (s ? running(s) : !l.proj)) reach.add(l.to); }
    for (const p of D.pistes) if (reach.has(p.from) && pisteOpen(G, p.id)) reach.add(p.to);
  }
  return D.pistes.filter(p => pisteOpen(G, p.id) && reach.has(p.from));
}

const KM = baseKm;
const prefKm = (list, sg) => list.reduce((a, p) => a + p.km * D.segs[sg].pref[p.level] * (p.exp ? M.expW : 1), 0);
const SKM = Object.fromEntries(SEGS.map(s => [s, prefKm(D.pistes.filter(p => !p.exp), s)]));
export const segOffer = (G, sg, open = openPistes(G)) => prefKm(open, sg) / SKM[sg];
export const openKm = G => openPistes(G).reduce((a, p) => a + p.km, 0);
export const offerShare = G => openKm(G) / KM;
export const offerF = o => o > 0 ? M.offer[0] + M.offer[1] * o : 0;
export const offerFactor = G => offerF(offerShare(G));
export const priceEq = p => D.sat.price.ref * avgPrice(p) / REF;

export function wordFactor(G) {
  const W = D.sat.word, z = G.sat?.z;
  return z == null ? 1 : clamp(1 + W.k * (z - W.ref) / 100, W.clamp[0], W.clamp[1]);
}

export function segFactors(G, date, sg, extra = {}) {
  const S = D.segs[sg], w = extra.weather ?? 1;
  return {
    B: baseDemand(date) * S.share,
    P: segPriceFactor(G.prices, sg),
    R: repFactor(G.rep),
    O: offerF(segOffer(G, sg)),
    weather: 1 + (w - 1) * S.wx,
    snow: extra.snow ?? 1,
    marketing: extra.noMkt ? 1 : mFactor(G, date, sg),
    K: kFactor(G, sg, extra.snow ?? 1),
    word: wordFactor(G)
  };
}

const prod = f => f.B * f.P * f.R * f.O * f.weather * f.snow * f.marketing * f.K * f.word;
export const expectedSeg = (G, date, extra) => Object.fromEntries(SEGS.map(s => [s, prod(segFactors(G, date, s, extra))]));
const tot = o => Object.values(o).reduce((a, b) => a + b, 0);

export function factors(G, date, extra = {}) {
  const seg = SEGS.map(s => [s, segFactors(G, date, s, extra)]), n = tot(Object.fromEntries(seg.map(([s, f]) => [s, prod(f)]))) || 1;
  const o = { B: baseDemand(date) };
  for (const k of ['P', 'R', 'O', 'weather', 'snow', 'marketing', 'K', 'word']) o[k] = seg.reduce((a, [, f]) => a + prod(f) / n * f[k], 0);
  return o;
}

export const expected = (G, date, extra) => tot(expectedSeg(G, date, extra));

export function demand(G, date, extra) {
  const eps = range(G, M.eps[0], M.eps[1]), seg = expectedSeg(G, date, extra);
  for (const s in seg) seg[s] *= eps;
  return { n: tot(seg), eps, seg };
}
