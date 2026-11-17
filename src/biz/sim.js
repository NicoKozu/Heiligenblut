import { D } from './data.js';
import { int, seed as newSeed } from './rng.js';
import { addDays, isSeason, seasonOf, seasonStart, baseDemand, phase as calPhase } from './calendar.js';

const zero = () => Object.fromEntries(Object.keys(D.costLabels).map(k => [k, 0]));
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

export function newGame(seed = newSeed()) {
  const G = {
    version: D.version, seed, rng: seed, date: D.startDate, season: seasonOf(D.startDate), day: 1,
    phase: 'prep', min: D.time.open, factor: 1,
    cash: D.start.cash, loan: D.start.loan, rep: D.start.rep,
    lifts: [], today: null, history: []
  };
  G.lifts = D.lifts.map(l => ({ id: l.id, name: l.name, open: true, cond: int(G, D.start.cond[0], D.start.cond[1]), run: 0, util: 0 }));
  resetToday(G);
  return G;
}

function resetToday(G) {
  G.today = { date: G.date, cashStart: G.cash, costs: zero(), revenue: {}, guests: 0, demand: baseDemand(G.date), phase: calPhase(G.date) };
}

function pay(G, k, v) {
  G.today.costs[k] = (G.today.costs[k] || 0) + v;
  G.cash -= v;
}

export function startDay(G) {
  if (G.phase !== 'prep') return false;
  resetToday(G);
  G.phase = 'open';
  G.min = D.time.open;
  pay(G, 'admin', D.admin);
  for (const l of G.lifts) { l.run = 0; if (l.open) pay(G, 'maint', D.maintPerLift); }
  if (G.loan > 0) pay(G, 'interest', G.loan * D.start.rate / 365);
  return true;
}

function minute(G) {
  for (const l of G.lifts) {
    if (!l.open) continue;
    const spec = D.lifts.find(s => s.id === l.id);
    l.run++;
    pay(G, 'power', spec.kw * (D.power.base + D.power.load * l.util) * D.power.price / 60);
  }
  G.min++;
}

export function tick(G, minutes) {
  const ev = [];
  for (let i = 0; i < minutes && G.phase === 'open'; i++) {
    minute(G);
    if (G.min === D.time.close - D.time.warn) ev.push('warn');
    if (G.min >= D.time.close) { close(G); ev.push('closed'); }
  }
  return ev;
}

function close(G) {
  G.phase = 'closed';
  G.min = D.time.close;
  const t = G.today, cost = sum(t.costs), rev = sum(t.revenue);
  G.history.push({ date: t.date, guests: t.guests, revenue: rev, cost, cash: G.cash, cashStart: t.cashStart, rep: G.rep, costs: { ...t.costs } });
  if (G.history.length > 400) G.history.shift();
}

export function nextDay(G) {
  if (G.phase !== 'closed') return false;
  let d = addDays(G.date, 1);
  if (!isSeason(d)) d = seasonStart(seasonOf(d) + (d >= seasonStart(seasonOf(d)) ? 1 : 0));
  G.date = d;
  G.season = seasonOf(d);
  G.day++;
  G.phase = 'prep';
  G.min = D.time.open;
  resetToday(G);
  return true;
}

export const report = G => G.history[G.history.length - 1] || null;
export const prev = G => G.history[G.history.length - (G.phase === 'closed' ? 2 : 1)] || null;
export const costToday = G => sum(G.today.costs);

export function setFactor(G, dir) {
  const f = D.time.factors, i = f.indexOf(G.factor);
  G.factor = f[Math.max(0, Math.min(f.length - 1, (i < 0 ? 0 : i) + dir))];
  return G.factor;
}

export function save(G, store = globalThis.localStorage) {
  try { store.setItem(D.saveKey, JSON.stringify(G)); return true; } catch (e) { return false; }
}

export function load(store = globalThis.localStorage) {
  try {
    const G = JSON.parse(store.getItem(D.saveKey));
    return G && G.version === D.version ? G : null;
  } catch (e) { return null; }
}

export const clear = (store = globalThis.localStorage) => { try { store.removeItem(D.saveKey); } catch (e) {} };

export function clock() {
  let acc = 0;
  return (G, realDt) => {
    if (G.phase !== 'open') { acc = 0; return []; }
    acc += realDt * D.time.gameSecPerSec * G.factor / 60;
    const n = Math.min(Math.floor(acc), D.time.maxSteps);
    acc = Math.min(acc - n, D.time.maxSteps);
    return n ? tick(G, n) : [];
  };
}
