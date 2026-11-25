import { D } from './data.js';
import { addDays, weekday, seasonStart } from './calendar.js';
import { range, int, next as rand } from './rng.js';
import { pay } from './assets.js';

const M = D.mkt, C = M.campaigns;
export const SEGS = Object.keys(D.segs);
export const CAMPAIGNS = Object.keys(C);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function initMkt(G) {
  if (!G.mkt) G.mkt = { on: {}, orders: [], run: {}, spent: 0, season: G.season, early: null, days: 0 };
}

const period = (G, id, date) => {
  const c = C[id], m = G.mkt;
  if (c.kind === 'weekly') return !!m.on[id] && date >= addDays(m.on[id], c.delay);
  if (c.kind === 'once') return m.orders.some(o => o.id === id && date >= o.from && date <= o.to);
  return false;
};

export const effActive = (G, id, date) => period(G, id, date) && (!C[id].sat || weekday(date) === 6);
export const kidsFree = (G, date) => effActive(G, 'family', date);
export const wearF = (G, id) => !C[id].noWear && (G.mkt.run[id] || 0) > M.wear.after ? M.wear.f : 1;
export const ticketPrice = (G, k, date = G.date) => k === 'child' && kidsFree(G, date) ? 0 : G.prices[k];

export function mFactor(G, date, seg) {
  let f = 1;
  for (const id of CAMPAIGNS) {
    const c = C[id];
    if (c.kind === 'pre') { if (G.mkt.early === G.season) f *= 1 + c.eff; continue; }
    if (effActive(G, id, date)) f *= 1 + c.eff * (c.target[seg] ?? M.spill) * wearF(G, id);
  }
  return f;
}


export function day(G) {
  const m = G.mkt;
  for (const id of CAMPAIGNS) {
    const c = C[id];
    if (c.kind === 'pre') continue;
    if (period(G, id, G.date)) m.run[id] = (m.run[id] || 0) + 1;
    else m.run[id] = Math.max(0, (m.run[id] || 0) - M.wear.recover);
    if (c.kind === 'weekly' && m.on[id] && c.cost) spend(G, c.cost / 7);
  }
  m.orders = m.orders.filter(o => o.to >= G.date);
}

function spend(G, v) { pay(G, 'marketing', v); G.mkt.spent += v; }

export function newSeason(G) { G.mkt.spent = 0; G.mkt.season = G.season; }

export function weeklyCost(G) {
  return CAMPAIGNS.reduce((a, id) => a + (C[id].kind === 'weekly' && G.mkt.on[id] ? C[id].cost : 0), 0);
}

export const pending = (G, id) => G.mkt.orders.find(o => o.id === id && o.to >= G.date);
export const canEarly = G => G.mkt.early !== G.season && G.phase === 'prep' && G.date === seasonStart(G.season);

export function earlyQuote(G) {
  const c = C.early, n = Math.round(c.cards * (0.5 + G.rep / 100));
  return { n, price: Math.round(G.prices.season * (1 - c.disc)), sum: n * Math.round(G.prices.season * (1 - c.disc)) };
}

export function act(G, id) {
  const c = C[id], m = G.mkt;
  if (!c) return false;
  if (c.kind === 'weekly') {
    if (m.on[id]) delete m.on[id];
    else m.on[id] = G.date;
    return true;
  }
  if (c.kind === 'once') {
    if (pending(G, id)) return false;
    const from = addDays(G.date, c.delay);
    m.orders.push({ id, from, to: addDays(from, c.dur - 1) });
    spend(G, c.cost);
    return true;
  }
  if (c.kind === 'pre') {
    if (!canEarly(G)) return false;
    const q = earlyQuote(G);
    G.today.revenue.season = (G.today.revenue.season || 0) + q.sum;
    G.cash += q.sum;
    G.seasonShare = (G.seasonShare ?? D.flow.seasonShare) + c.share;
    m.early = G.season;
    return true;
  }
  return false;
}

export function status(G, id, date = G.date) {
  const c = C[id], m = G.mkt;
  if (c.kind === 'pre') return m.early === G.season ? 'aktiv (Saison)' : canEarly(G) ? 'verfügbar' : 'nur vor Saisonstart';
  if (c.kind === 'weekly') {
    if (!m.on[id]) return 'aus';
    const s = addDays(m.on[id], c.delay);
    return date < s ? 'wirkt ab ' + s.slice(8) + '.' + s.slice(5, 7) + '.' : wearF(G, id) < 1 ? 'aktiv · abgenutzt' : 'aktiv';
  }
  const o = pending(G, id);
  if (!o) return 'nicht gebucht';
  return date < o.from ? 'wirkt ab ' + o.from.slice(8) + '.' + o.from.slice(5, 7) + '.' : 'aktiv bis ' + o.to.slice(8) + '.' + o.to.slice(5, 7) + '.' + (wearF(G, id) < 1 ? ' · abgenutzt' : '');
}


