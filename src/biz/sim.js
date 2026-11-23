import { D } from './data.js';
import { int, seed as newSeed } from './rng.js';
import { addDays, isSeason, seasonOf, seasonStart, baseDemand, phase as calPhase } from './calendar.js';
import { defaultPrices, demand, expected, expectedSeg } from './demand.js';
import { newFlow, step, endFlow, ensureKeys } from './flow.js';
import { initBuild, buildDay, depreciate, solvency } from './build.js';
import { pay, initAssets, liftMinute, dayStart, overnight, running } from './assets.js';
import { minute as satMinute, endDay as satEnd, seasonShare } from './satisfaction.js';
import { initWeather, applyWind } from './weather.js';
import { initStaff, staffAuto, evening, wages, minute as staffMinute } from './staff.js';
import { initSnow, night, newSeason, minute as snowMinute, demandExtra, avgSnow } from './snow.js';
import { initMkt, day as mktDay, compDay, newSeason as mktSeason } from './marketing.js';
import { snapshot, fixed } from './season.js';
import { initCustom, unlock, areaDay } from './custom.js';
import { remember } from './net.js';
import { initSide, sideFlow, dayStart as sideStart, evening as sideEvening } from './side.js';

const zero = () => Object.fromEntries(Object.keys(D.costLabels).map(k => [k, 0]));
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

export function newGame(seed = newSeed()) {
  const G = {
    version: D.version, seed, rng: seed, date: D.startDate, season: seasonOf(D.startDate), day: 1,
    phase: 'prep', min: D.time.open, factor: 1,
    cash: D.start.cash, loan: D.start.loan, rep: D.start.rep, sat: null, seasonShare: D.flow.seasonShare,
    lifts: [], today: null, history: [], prices: defaultPrices(), pistes: {}, flow: null, log: []
  };
  initCustom(G);
  G.lifts = D.lifts.filter(l => !l.proj).map(l => ({ id: l.id, name: l.name, open: true, cond: int(G, D.start.cond[0], D.start.cond[1]), run: 0, util: 0 }));
  initAssets(G);
  initSnow(G, true);
  migrate(G);
  resetToday(G);
  return G;
}

function migrate(G) {
  initCustom(G);
  G.prices = { ...defaultPrices(), ...(G.prices || {}) };
  initBuild(G);
  initAssets(G);
  if (!G.flow) G.flow = newFlow(0, 0);
  ensureKeys(G.flow);
  initSnow(G, false);
  initStaff(G);
  initMkt(G);
  initSide(G);
  sideFlow(G.flow);
  if (G.flow.cashQ == null) Object.assign(G.flow, { cashQ: 0, cashWait: 0, cashServed: 0 });
  if (!G.weather) { initWeather(G); applyWind(G); }
  if (G.seasonShare == null) G.seasonShare = D.flow.seasonShare;
  if (G.sat === undefined) G.sat = null;
  if (!G.seasons) G.seasons = [];
  if (!G.ev) G.ev = [];
  if (G.summer === undefined) G.summer = null;
  if (!G.net) G.net = { mem: {} };
  for (const l of G.lifts) if (l.boost) { l.places = Math.round(D.lifts.find(x => x.id === l.id).places * (1 + l.boost)); delete l.boost; }
  if (G.today && !G.today.hits) G.today.hits = {};
  if (!G.today || !G.today.types) resetToday(G);
  unlock(G);
  return G;
}

function resetToday(G) {
  G.today = {
    date: G.date, cashStart: G.cash, costs: zero(), revenue: {}, guests: 0, demand: baseDemand(G.date), phase: calPhase(G.date),
    expected: 0, types: {}, rides: {}, peak: {}, waitSum: 0, boardSum: 0, faults: 0, rescued: 0, lost: 0, hits: {}, sat: null, seg: {}, free: 0, side: {}, invest: 0, depr: 0, loan: 0
  };
}

export function startDay(G) {
  if (G.phase !== 'prep' || G.fin.over) return false;
  const o = G.today;
  resetToday(G);
  if (o && o.date === G.date) Object.assign(G.today, { cashStart: o.cashStart, costs: { ...G.today.costs, ...o.costs }, revenue: { ...o.revenue }, invest: o.invest || 0, loan: o.loan || 0, sale: o.sale || 0, depr: o.depr || 0 });
  G.phase = 'open';
  G.min = D.time.open;
  const dm = demand(G, G.date, demandExtra(G, G.date));
  G.today.expected = dm.n;
  G.today.expSeg = dm.seg;
  G.flow = newFlow(dm.n * (1 - D.mix.half), dm.n * D.mix.half, dm.seg, (G.seed ^ Math.imul(Number(G.date.replace(/-/g, '')), 2654435761)) | 0);
  mktDay(G);
  dayStart(G);
  sideStart(G);
  pay(G, 'admin', D.admin + D.adminLift * G.lifts.length);
  staffAuto(G, dm.n);
  pay(G, 'staff', wages(G));
  for (const l of G.lifts) { l.run = 0; if (l.open) pay(G, 'maint', D.lifts.find(x => x.id === l.id).maint ?? D.maintPerLift); }
  if (G.loan > 0) pay(G, 'interest', G.loan * D.start.rate * D.dayStep / 365);
  return true;
}

function minute(G, ev) {
  step(G, G.min);
  for (const l of G.lifts) {
    liftMinute(G, l, ev);
    if (!running(l)) continue;
    const spec = D.lifts.find(s => s.id === l.id);
    l.run++;
    const pw = spec.kw * (D.power.base + D.power.load * l.util) * D.power.price / 60, lp = G.today.lp || (G.today.lp = {});
    pay(G, 'power', pw);
    lp[l.id] = (lp[l.id] || 0) + pw;
  }
  snowMinute(G);
  staffMinute(G);
  satMinute(G);
  G.min++;
}

export function tick(G, minutes) {
  const ev = [];
  for (let i = 0; i < minutes && G.phase === 'open'; i++) {
    minute(G, ev);
    if (G.min === D.time.close - D.time.warn) ev.push('warn');
    if (G.min >= D.time.close) { close(G); ev.push('closed'); }
  }
  return ev;
}

function close(G) {
  G.phase = 'closed';
  G.min = D.time.close;
  const sat = satEnd(G);
  remember(G);
  const staff = evening(G);
  sideEvening(G);
  endFlow(G);
  depreciate(G);
  const t = G.today, cost = sum(t.costs), rev = sum(t.revenue);
  G.history.push({
    date: t.date, guests: t.guests, expected: t.expected || 0, revenue: rev, cost, cash: G.cash, cashStart: t.cashStart, rep: G.rep, costs: { ...t.costs },
    revs: { ...t.revenue }, types: { ...t.types }, peak: { ...t.peak }, rides: { ...t.rides }, runs: { ...(t.runs || {}) }, faults: t.faults || 0, rescued: t.rescued || 0, avgWait: t.boardSum ? t.waitSum / t.boardSum : 0, sat,
    weather: { ...G.weather.today }, snow: avgSnow(G), aval: G.weather.aval, staff, seg: { ...(t.seg || {}) }, free: t.free || 0, side: { ...(t.side || {}) }, depr: t.depr || 0, invest: t.invest || 0, loan: t.loan || 0, sale: t.sale || 0, debt: G.loan,
    area: areaDay(G), bases: { ...(t.bases || {}) }, back: { ...(t.back || {}) }, shuttle: { ...(t.shuttle || {}) }
  });
  if (G.history.length > 400) G.history.shift();
}

export function nextDate(G) {
  let d = addDays(G.date, D.dayStep);
  if (!isSeason(d)) d = seasonStart(seasonOf(d) + (d >= seasonStart(seasonOf(d)) ? 1 : 0));
  return d;
}

export function forecast(G) {
  const date = G.phase === 'closed' ? nextDate(G) : G.date;
  const x = demandExtra(G, date), seg = expectedSeg(G, date, x);
  return { date, n: Object.values(seg).reduce((a, b) => a + b, 0), seg, base: expected(G, date, { ...x, noMkt: true }) };
}

export function setPrice(G, k, v) {
  if (!(k in G.prices)) return;
  const n = Math.round(Number(v));
  if (Number.isFinite(n)) G.prices[k] = Math.max(D.priceRange[0], Math.min(D.priceRange[1], n));
}

export function nextDay(G) {
  if (G.phase !== 'closed' || G.fin.over || G.summer) return false;
  solvency(G);
  if (G.fin.over) return true;
  const d = nextDate(G), ns = seasonOf(d) !== G.season;
  overnight(G);
  if (ns) return endSeason(G, d);
  night(G, d);
  compDay(G);
  buildDay(G, false);
  unlock(G);
  G.date = d;
  G.day++;
  G.phase = 'prep';
  G.min = D.time.open;
  resetToday(G);
  return true;
}

function endSeason(G, d) {
  const sy = G.season, s = snapshot(G, sy);
  G.summer = { sy, next: d, stage: 'report', costs: {}, rev: {} };
  if (s) { const f = fixed(G); s.sumCost = f.admin + f.interest; s.year = s.result - s.sumCost; G.seasons.push(s); }
  if (G.seasons.length > D.summer.keep) G.seasons.shift();
  return true;
}

export function summerStage(G, stage) {
  if (!G.summer || !['report', 'plan'].includes(stage)) return false;
  G.summer.stage = stage;
  return true;
}

export function startSeason(G) {
  const S = G.summer;
  if (!S || G.fin.over) return false;
  const f = fixed(G);
  for (const k in f) { G.cash -= f[k]; S.costs[k] = (S.costs[k] || 0) + f[k]; }
  const rec = G.seasons.find(x => x.sy === S.sy);
  if (rec) { rec.sumCosts = { ...S.costs }; rec.sumCost = sum(S.costs); rec.year = rec.result - rec.sumCost; }
  const d = S.next;
  night(G, d);
  compDay(G);
  G.seasonShare = seasonShare(G.rep);
  newSeason(G);
  buildDay(G, true);
  unlock(G);
  G.summer = null;
  G.date = d;
  G.season = seasonOf(d);
  mktSeason(G);
  G.day++;
  G.phase = 'prep';
  G.min = D.time.open;
  resetToday(G);
  solvency(G);
  return true;
}

export const report = G => G.history[G.history.length - 1] || null;
export const prev = G => G.history[G.history.length - (G.phase === 'closed' ? 2 : 1)] || null;
export const costToday = G => sum(G.today.costs);

export function setFactor(G, dir) {
  const f = D.time.factors, i = f.indexOf(G.factor);
  G.factor = f[Math.max(0, Math.min(f.length - 1, (i < 0 ? f.indexOf(1) : i) + dir))];
  return G.factor;
}

export function save(G, store = globalThis.localStorage) {
  try { store.setItem(D.saveKey, JSON.stringify(G)); return true; } catch (e) { return false; }
}

export function load(store = globalThis.localStorage) {
  try {
    const G = JSON.parse(store.getItem(D.saveKey));
    return G && G.version === D.version ? migrate(G) : null;
  } catch (e) { return null; }
}

export const clear = (store = globalThis.localStorage) => { try { store.removeItem(D.saveKey); } catch (e) {} };

export function clock() {
  let acc = 0;
  const c = (G, realDt) => {
    if (G.phase !== 'open') { acc = 0; return []; }
    acc += realDt * D.time.gameSecPerSec * G.factor / 60;
    const n = Math.min(Math.floor(acc), D.time.maxSteps);
    acc = Math.min(acc - n, D.time.maxSteps);
    return n ? tick(G, n) : [];
  };
  c.frac = () => Math.min(acc, 1);
  return c;
}
