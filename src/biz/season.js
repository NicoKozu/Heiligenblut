import { D } from './data.js';
import { seasonOf, diff } from './calendar.js';
import { seasonPL, bookValue } from './build.js';
import { heads } from './staff.js';
import { areaSeason, areaList } from './custom.js';

const SM = D.summer;
const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const add = (o, s) => { for (const k in s || {}) o[k] = (o[k] || 0) + s[k]; };
const avg = (a, f) => a.length ? a.reduce((x, h) => x + f(h), 0) / a.length : 0;

export function fixed(G) {
  const adm = (D.admin + D.adminLift * G.lifts.length) * SM.adminDays;
  return { admin: adm, interest: G.loan * D.start.rate * SM.interestDays / 365 };
}

export function snapshot(G, sy) {
  const H = G.history.filter(h => seasonOf(h.date) === sy);
  if (!H.length) return null;
  const pl = seasonPL(G, sy), rev = {}, side = {}, seg = {}, wk = [];
  let wait = 0, boards = 0, faults = 0, rescued = 0, closedLift = 0;
  for (const h of H) {
    add(side, h.side);
    add(seg, h.seg);
    faults += h.faults || 0;
    rescued += h.rescued || 0;
    wait += (h.avgWait || 0) * (h.guests || 0);
    boards += h.guests || 0;
  }
  const t0 = H[0].date;
  for (const h of H) {
    const i = Math.floor(diff(t0, h.date) / D.dayStep), w = wk[i] || (wk[i] = { date: h.date, n: 0, guests: 0, revenue: 0, cost: 0, sat: 0, ns: 0, rep: 0, snow: 0 });
    w.n++; w.guests += h.guests; w.revenue += h.revenue; w.cost += h.cost; w.rep = h.rep; w.snow += h.snow || 0;
    if (h.sat) { w.sat += h.sat.z; w.ns++; }
  }
  const series = wk.filter(Boolean).map(w => ({ date: w.date, days: w.n, guests: w.guests / w.n, revenue: w.revenue / w.n, result: (w.revenue - w.cost) / w.n, sat: w.ns ? w.sat / w.ns : null, rep: w.rep, snow: w.snow / w.n }));
  const byG = [...H].sort((a, b) => b.guests - a.guests), byR = [...H].sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost));
  const day = h => ({ date: h.date, guests: h.guests, result: h.revenue - h.cost, sat: h.sat?.z ?? null });
  const zH = H.filter(h => h.sat), st = H.map(h => h.staff).filter(Boolean);
  const E = (G.ev || []).filter(e => e.s === sy), hired = {}, fired = {};
  let left = 0;
  const built = [];
  for (const e of E) {
    if (e.t === 'build') built.push(e.id);
    else if (e.t === 'hire') hired[e.id] = (hired[e.id] || 0) + e.n;
    else if (e.t === 'fire') fired[e.id] = (fired[e.id] || 0) + e.n;
    else if (e.t === 'left') left += e.n;
  }
  const last = H[H.length - 1], first = H[0];
  return {
    sy, from: first.date, to: last.date, days: H.length, guests: pl.guests, avgGuests: pl.guests / H.length,
    R: pl.R, C: pl.C, depr: pl.depr, result: pl.result, ebitda: pl.ebitda, invest: pl.invest, rev: pl.rev, cost: pl.cost, side, seg,
    perGuest: pl.R / Math.max(1, pl.guests), sat: avg(zH, h => h.sat.z), rep0: first.sat?.rep0 ?? first.rep, rep1: last.rep,
    cash0: first.cashStart, cash1: last.cash, debt0: first.debt != null ? first.debt : 0, debt1: last.debt || 0,
    wait: boards ? wait / boards : 0, faults, rescued, snow: avg(H, h => h.snow || 0), snowCost: pl.cost.snowmaking || 0,
    best: day(byG[0]), worst: day(byG[byG.length - 1]), bestR: day(byR[0]), worstR: day(byR[byR.length - 1]),
    series, built, hired, fired, left, heads: last.staff?.heads ?? heads(G), morale: avg(st, s => s.morale), sick: st.reduce((a, s) => a + (s.sick || 0), 0),
    areas: areaSeason(H), anames: Object.fromEntries(areaList(G).map(a => [a.id, a.name])), wages: pl.cost.staff || 0, book: bookValue(G), equity: G.cash + bookValue(G) - G.loan, sumCost: 0
  };
}

export const label = sy => sy + '/' + String(sy + 1).slice(2);
