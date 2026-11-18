import { writeFileSync } from 'node:fs';
import { D } from '../src/biz/data.js';
import { newGame, startSeason, startDay, tick, nextDay, setPrice, forecast, report, nextDate } from '../src/biz/sim.js';
import { repair, inspect } from '../src/biz/assets.js';
import { setGroom, setGun, nightTemp, groomPlan } from '../src/biz/snow.js';
import { act } from '../src/biz/marketing.js';
import { setLevel, setSidePrice, HUTS } from '../src/biz/side.js';
import { check, order, borrow, repay, seasonPL, groomer } from '../src/biz/build.js';
import { seasonOf } from '../src/biz/calendar.js';
import { pl } from '../src/biz/area.js';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf('--' + k); return i < 0 ? null : argv[i + 1]; };
const flag = k => argv.includes('--' + k);
const list = (k, d) => opt(k) ? opt(k).split(',').map(s => s.trim()).filter(Boolean) : d;

const P = D.build.projects;
const LIFT = Object.fromEntries(D.lifts.map(l => [l.id, l]));
const SHORT = { schareck: 'SCH', panorama: 'PAN', tunnelbahn: 'TUN', fleissbahn: 'FLB', hochfleiss: 'HFL', rossbach10: 'R10', garage: 'PKH', 'new:schareck': 'hSCH', 'new:spatzl': 'hSPA', 'new:fleiss': 'hFLE' };
const short = id => SHORT[id] || (id.startsWith('p') ? 'P' + id.slice(1) : id.startsWith('hut:') ? '+' + id.slice(4, 7) : id);

const ALL = ['schareck', 'p4', 'p5', 'new:schareck', 'panorama', 'p5a', 'p2', 'p1', ['tunnelbahn', 'fleissbahn', 'p11', 'p12'], 'hochfleiss', 'p11a', 'new:spatzl', 'new:fleiss', 'rossbach10'];
const SENSIBLE = [['schareck', 'p4', 'p5', 'new:schareck'], ['panorama', 'p5a', 'p2', 'p1'], [['tunnelbahn', 'fleissbahn', 'p11', 'p12'], 'new:fleiss'], ['rossbach10', 'hochfleiss', 'p11a', 'new:spatzl'], ['garage', 'hut:rossbach', 'hut:schareck']];

function ctx(G, s) { return s.ctx || (s.ctx = { season0: G.season, queue: [], done: new Set() }); }
const sIdx = (G, s) => G.season - ctx(G, s).season0;
const lastDay = G => seasonOf(nextDate(G)) !== G.season;

function afford(G, price, c) {
  const cap = Array.isArray(c.maxLoan) ? c.maxLoan[Math.min(c.si, c.maxLoan.length - 1)] : c.maxLoan;
  const own = G.cash - c.reserve, room = Math.max(0, Math.min(cap, D.start.credit - c.buffer) - G.loan);
  if (own + room < price) return false;
  if (own < price) borrow(G, Math.ceil((price - own) / D.fin.autoDraw) * D.fin.autoDraw);
  return true;
}

function tryBuild(G, c, ids, summer) {
  const left = [], cost = set => set.reduce((a, id) => a + P[id].price, 0);
  let stop = false, held = 0;
  for (const it of ids) {
    if (stop) { left.push(it); continue; }
    const set = [].concat(it), why = check(G, set[0], summer && !c.now);
    if (why === 'fertig' || why === 'im Bau') { if (set.length > 1) { const r = set.slice(1); r.rest = true; left.push(r); } continue; }
    if (why === 'Sommer') { left.push(it); continue; }
    if (why.startsWith('erst')) { left.push(it); if ((P[set[0]].needs || []).every(n => G.build.done.includes(n) || G.build.jobs.some(j => j.id === n))) held += cost(set); continue; }
    if (!afford(G, cost(set) + held, c)) { left.push(it); stop = true; continue; }
    if (!order(G, set[0], summer && !c.now)) { left.push(it); continue; }
    if (set.length > 1) { const r = set.slice(1); r.rest = true; left.push(r); held += cost(r); }
  }
  c.held = held;
  return left;
}

function repairAll(G, express) {
  for (const l of G.lifts) if (l.broken && !(l.repairLeft > 0)) repair(G, l.id, express === true || (express === 'rossbach' && l.id === 'rossbach'));
}

function snowGuns(G) {
  for (const p of pl(G)) {
    const o = G.pistes[p.id];
    if (!(G.cannons?.[p.id] > 0)) continue;
    const want = nightTemp(G, p) <= D.snow.night && o.snow < 70 ? 10 : 0;
    if (want !== o.gun) setGun(G, p.id, want - o.gun);
  }
}

function groomAll(G, on) { for (const p of pl(G)) if (!!G.pistes[p.id].grm !== on) setGroom(G, p.id); }

function sensible(cfg = {}) {
  const c = { reserve: 50000, buffer: 80000, maxLoan: [330000, 670000, 830000], repayAbove: 250000, mkt: 1, plan: SENSIBLE, now: false, repayFrom: 0, ...cfg };
  const s = { name: cfg.name || 'vernünftig', c };
  s.morning = G => {
    const x = ctx(G, s), si = c.si = sIdx(G, s);
    if (x.started !== G.season) {
      x.started = G.season;
      if (x.planned !== si) x.queue = [...x.queue, ...(c.plan[si] || [])];
      if (si >= c.finishFrom) x.queue = x.queue.filter(it => it.rest);
      if (c.onSeason) c.onSeason(G);
    }
    if (si >= c.mkt) for (const id of ['social', 'radio']) if (!G.mkt.on[id]) act(G, id);
    if (!(si >= c.stopBuild)) x.queue = tryBuild(G, c, x.queue, false);
    const gp = groomPlan(G);
    if (gp.want > gp.cap + 1 && afford(G, D.groom.price + (c.held || 0), c)) groomer(G, 1);
    groomAll(G, true);
    for (const l of G.lifts) if (!l.broken && l.cond < 72) inspect(G, l.id);
  };
  s.live = G => repairAll(G, 'rossbach');
  s.evening = G => {
    const x = ctx(G, s), si = c.si = sIdx(G, s);
    repairAll(G, 'rossbach');
    snowGuns(G);
    if (c.repayFrom ? si >= c.repayFrom : !x.queue.length) if (G.cash > c.repayAbove) repay(G, G.cash - c.repayAbove);
    if (lastDay(G) && c.plan[si + 1]) c.si = si + 1, x.queue = tryBuild(G, c, [...x.queue, ...c.plan[si + 1]], true), x.planned = si + 1;
  };
  s.summer = G => { for (const l of G.lifts) if (l.cond < 90) inspect(G, l.id); };
  return s;
}

function waiting() {
  const s = { name: 'abwarten' };
  s.morning = G => groomAll(G, true);
  s.live = G => repairAll(G, false);
  s.evening = G => { repairAll(G, false); snowGuns(G); };
  return s;
}

function greedy() {
  return sensible({
    name: 'gierig',
    onSeason: G => {
      for (const k in D.tickets) setPrice(G, k, Math.round(D.tickets[k].price * 1.5));
      for (const id of HUTS) setLevel(G, id, 'upscale');
      setSidePrice(G, 'park', D.side.parking.price * 2);
    }
  });
}

function stingy() {
  const s = { name: 'geizig' };
  s.morning = G => {
    groomAll(G, false);
  };
  s.live = G => repairAll(G, false);
  s.evening = G => repairAll(G, false);
  return s;
}

function investor() {
  return sensible({ name: 'investor', reserve: 100000, buffer: 50000, repayAbove: 130000, maxLoan: D.start.credit, now: true, repayFrom: 2, finishFrom: 2, mkt: 0, plan: [ALL] });
}

const STRATS = { 'vernünftig': () => sensible(), abwarten: waiting, gierig: greedy, geizig: stingy, investor };

function run(name, seed, seasons, maxDays, daily) {
  const s = STRATS[name](), G = newGame(seed), out = [], days = [];
  const s0 = G.season;
  let cur = null, n = 0;
  const begin = () => ({ season: G.season, idx: G.season - s0, guests: 0, z: [], peak: 0, wait: 0, faults: 0, acc: 0, built: [], parts: {}, loanMax: G.loan, day: 0, insolvent: false });
  cur = begin();
  const doneSeen = new Set(G.build.done);
  const finish = () => {
    const rec = G.seasons.find(x => x.sy === cur.season);
    const pl = seasonPL(G, cur.season), H = G.history.filter(h => seasonOf(h.date) === cur.season);
    const flowSum = H.reduce((a, h) => a + h.revenue - h.cost - (h.invest || 0) + (h.loan || 0) + (h.sale || 0), 0);
    cur.gap = H.length ? (H[H.length - 1].cash - H[0].cashStart) - flowSum : 0;
    if (process.env.GAP) for (const h of H) { const d = h.cash - h.cashStart - (h.revenue - h.cost - (h.invest || 0) + (h.loan || 0) + (h.sale || 0)); if (Math.abs(d) > 1) console.log(name, seed, h.date, Math.round(d)); }
    Object.assign(cur, { R: pl.R, C: pl.C, result: rec?.year ?? pl.result, winter: pl.result, sumCost: rec?.sumCost || 0, depr: pl.depr, costs: pl.cost, revs: pl.rev, cash: G.cash, loan: G.loan, rep: G.rep, avgZ: cur.z.length ? cur.z.reduce((a, b) => a + b, 0) / cur.z.length : 0, days: cur.day });
    for (const q in cur.parts) cur.parts[q] /= Math.max(1, cur.z.length);
    delete cur.z;
    out.push(cur);
  };
  let guard = 0;
  while (out.length < seasons && !G.fin.over) {
    if (++guard > 200 * seasons * 40) throw new Error('Endlosschleife ' + name + ' Seed ' + seed);
    if (G.phase === 'prep') {
      s.morning(G);
      if (!startDay(G)) throw new Error('startDay fehlgeschlagen ' + G.date);
    } else if (G.phase === 'open') {
      const ev = tick(G, 30);
      s.live(G, ev);
    } else {
      s.evening(G, report(G));
      const h = report(G);
      cur.day++;
      cur.guests += h.guests;
      cur.exp = (cur.exp || 0) + (h.expected || 0);
      if (h.sat) { cur.z.push(h.sat.z); for (const q in h.sat.parts) cur.parts[q] = (cur.parts[q] || 0) + h.sat.parts[q]; }
      cur.peak = Math.max(cur.peak, ...Object.values(h.peak || {}), 0);
      cur.wait = Math.max(cur.wait, h.avgWait || 0);
      cur.faults += h.faults || 0;
      cur.acc += h.sat?.hits?.accident || 0;
      cur.loanMax = Math.max(cur.loanMax, G.loan);
      for (const id of G.build.done) if (!doneSeen.has(id)) { doneSeen.add(id); cur.built.push(short(id) + '@' + cur.day); }
      if (daily) days.push({ strat: name, seed, date: h.date, guests: h.guests, rev: h.revenue, cost: h.cost, cash: G.cash, z: h.sat?.z ?? 0, rep: G.rep, wait: h.avgWait || 0 });
      if (cur.day > 200) throw new Error('Saison > 200 Tage ' + name + ' Seed ' + seed);
      n++;
      const last = lastDay(G);
      if (maxDays && n >= maxDays && !last) { finish(); break; }
      nextDay(G);
      if (G.summer) { s.summer?.(G); startSeason(G); }
      if (G.fin.over) cur.insolvent = true;
      if (last || G.fin.over) finish();
      if (G.fin.over || out.length >= seasons || (maxDays && n >= maxDays)) break;
      if (last) cur = begin();
    }
  }
  return { name, seed, seasons: out, days, over: !!G.fin.over };
}

const fmt = (v, d = 0) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const mio = v => fmt(v / 1e6, 2);
const k = v => fmt(v / 1000, 1);
const pad = (s, n) => String(s).padStart(n);
const padR = (s, n) => String(s).padEnd(n);

function agg(runs, i) {
  const S = runs.map(r => r.seasons[i]).filter(Boolean);
  if (!S.length) return null;
  const f = key => { const v = S.map(s => s[key]); return { m: v.reduce((a, b) => a + b, 0) / v.length, lo: Math.min(...v), hi: Math.max(...v) }; };
  const o = {};
  for (const key of ['exp', 'guests', 'R', 'C', 'result', 'cash', 'loan', 'loanMax', 'avgZ', 'rep', 'faults', 'acc', 'peak', 'wait', 'days']) o[key] = f(key);
  o.insolv = runs.filter(r => r.seasons[i]?.insolvent).length;
  o.n = S.length;
  o.built = S[0].built.join(' ');
  return o;
}

const strats = list('strat', Object.keys(STRATS)).map(s => s === 'vernuenftig' ? 'vernünftig' : s);
for (const s of strats) if (!STRATS[s]) { console.error('Unbekannte Strategie: ' + s); process.exit(2); }
const seasons = Number(opt('seasons') || (flag('check') ? 5 : 3)), seeds = list('seeds', ['1', '2', '3', '4', '5']).map(Number), maxDays = Number(opt('days') || 0), daily = flag('daily');
const t0 = Date.now(), res = {};
for (const s of strats) res[s] = seeds.map(seed => run(s, seed, seasons, maxDays, daily));

if (daily) {
  console.log(padR('Strategie', 11) + pad('Seed', 5) + '  ' + padR('Datum', 10) + pad('Gäste', 7) + pad('Umsatz', 10) + pad('Kosten', 10) + pad('Kasse', 12) + pad('Z', 6) + pad('Ruf', 6) + pad('Wart.', 7));
  for (const s of strats) for (const r of res[s]) for (const d of r.days) console.log(padR(s, 11) + pad(r.seed, 5) + '  ' + d.date + pad(fmt(d.guests), 7) + pad(fmt(d.rev), 10) + pad(fmt(d.cost), 10) + pad(fmt(d.cash), 12) + pad(fmt(d.z, 1), 6) + pad(fmt(d.rep, 1), 6) + pad(fmt(d.wait, 1), 7));
  console.log('');
}

const A = {};
console.log(padR('Strategie', 11) + pad('S', 2) + pad('Tage', 5) + pad('Skitage k', 18) + pad('Umsatz M', 7) + pad('Kosten M', 9) + pad('Ergebnis M', 20) + pad('Kasse M', 8) + pad('Kredit M', 9) + pad('Ø-Z', 6) + pad('Ruf', 15) + pad('Def', 5) + pad('Unf', 5) + pad('Wmax', 6) + pad('Ins', 4) + '  Bau');
for (const s of strats) {
  A[s] = [];
  for (let i = 0; i < seasons; i++) {
    const a = agg(res[s], i);
    A[s].push(a);
    if (!a) continue;
    console.log(padR(s, 11) + pad(i + 1, 2) + pad(fmt(a.days.m), 5) + pad(k(a.guests.m) + ' (' + k(a.guests.lo) + '–' + k(a.guests.hi) + ')', 18) + pad(mio(a.R.m), 7) + pad(mio(a.C.m), 9) + pad(mio(a.result.m) + ' (' + mio(a.result.lo) + '…' + mio(a.result.hi) + ')', 20) + pad(mio(a.cash.m), 8) + pad(mio(a.loan.m), 9) + pad(fmt(a.avgZ.m, 1), 6) + pad(fmt(a.rep.m, 1) + ' (' + fmt(a.rep.lo, 0) + '–' + fmt(a.rep.hi, 0) + ')', 15) + pad(fmt(a.faults.m, 1), 5) + pad(fmt(a.acc.m, 1), 5) + pad(fmt(a.peak.m, 0), 6) + pad(a.insolv, 4) + '  ' + a.built);
  }
}
console.log('\n' + strats.length + ' Strategien × ' + seeds.length + ' Seeds × ' + seasons + ' Saisonen in ' + fmt((Date.now() - t0) / 1000, 1) + ' s');

if (opt('json')) writeFileSync(opt('json'), JSON.stringify({ seeds, seasons, res, agg: A }, null, 1));

if (flag('check')) {
  const rows = [];
  const T = (s, i, label, val, ok, show) => { if (!A[s] || !A[s][i]) return; rows.push([s, i + 1, label, show, ok(val)]); };
  const rg = (lo, hi) => v => v >= lo && v <= hi;
  const ge = lo => v => v >= lo, lt = hi => v => v < hi, le = hi => v => v <= hi;
  const g = (s, i, key) => A[s]?.[i]?.[key]?.m;
  const add = (s, i, label, key, ok, show = v => v) => { const v = g(s, i, key); if (v != null) rows.push([s, i + 1, label, show(v), ok(v)]); };
  const K = v => k(v) + 'k', M = v => mio(v) + ' Mio', N = v => fmt(v, 1);
  const V = 'vernünftig';
  add(V, 0, 'Skitage 9–15k', 'guests', rg(9e3, 15e3), K);
  add(V, 0, 'Ergebnis −0,2…+0,3 Mio', 'result', rg(-2e5, 3e5), M);
  add(V, 0, 'Ø-Z 55–75', 'avgZ', rg(55, 75), N);
  add(V, 0, 'Ruf Ende ≥ 48', 'rep', ge(48), N);
  add(V, 1, 'Skitage 16–26k', 'guests', rg(16e3, 26e3), K);
  add(V, 1, 'Ergebnis +0,1…+0,6 Mio', 'result', rg(1e5, 6e5), M);
  add(V, 2, 'Skitage 20–32k', 'guests', rg(20e3, 32e3), K);
  add(V, 2, 'Ergebnis +0,1…+0,6 Mio', 'result', rg(1e5, 6e5), M);
  if (A[V]?.[4]) rows.push([V, 5, 'Ergebnis steigt ggü. Saison 3', M(g(V, 4, 'result')) + ' / ' + M(g(V, 2, 'result')), g(V, 4, 'result') > g(V, 2, 'result')]);
  add(V, 4, 'Skitage 28–42k', 'guests', rg(28e3, 42e3), K);
  add(V, 4, 'Ergebnis +0,3…+1,0 Mio', 'result', rg(3e5, 1e6), M);
  add(V, 2, 'Ø-Z 60–80', 'avgZ', rg(60, 80), N);
  for (let i = 0; i < seasons; i++) add(V, i, 'max. Ø-Wartezeit ≤ 45 min', 'wait', le(45), N);
  const W = 'abwarten';
  add(W, 0, 'Ruf Ende 40–52', 'rep', rg(40, 52), N);
  add(W, 0, 'Ø-Z ≥ 45', 'avgZ', ge(45), N);
  add(W, 0, 'Ergebnis ≥ −0,1 Mio', 'result', ge(-1e5), M);
  add(W, 1, 'Ergebnis −0,15…+0,05 Mio', 'result', rg(-1.5e5, 5e4), M);
  for (let i = 0; i < seasons; i++) if (A[W]?.[i]) rows.push([W, i + 1, 'keine Insolvenz', A[W][i].insolv, A[W][i].insolv === 0]);
  for (const s of ['gierig', 'geizig']) {
    add(s, 0, 'Ruf Ende < 42', 'rep', lt(42), N);
    add(s, 1, 'Ruf < 38', 'rep', lt(38), N);
    add(s, 1, 'Ergebnis < 0', 'result', lt(0), M);
  }
  const I = 'investor';
  add(I, 0, 'Kredit ≥ 0,5 Mio', 'loanMax', ge(5e5), M);
  for (let i = 0; i < seasons; i++) if (A[I]?.[i]) rows.push([I, i + 1, 'keine Insolvenz', A[I][i].insolv, A[I][i].insolv === 0]);
  if (A[I]?.[2] && A[V]?.[2]) rows.push([I, 3, 'Ergebnis > vernünftig − 0,1 Mio', M(g(I, 2, 'result')) + ' / ' + M(g(V, 2, 'result')), g(I, 2, 'result') > g(V, 2, 'result') - 1e5]);
  if (A[I]?.[2]) rows.push([I, 3, 'Kredit sinkt ggü. Saison 2', M(g(I, 2, 'loan')) + ' / ' + M(g(I, 1, 'loan')), g(I, 2, 'loan') < g(I, 1, 'loan')]);
  for (const s of strats) for (let i = 0; i < seasons; i++) if (A[s][i]) rows.push([s, i + 1, 'Gewinn ≤ 1 Mio (max)', M(A[s][i].result.hi), A[s][i].result.hi <= 1e6]);
  console.log('\n' + padR('Strategie', 11) + pad('S', 2) + '  ' + padR('Ziel', 34) + padR('Ist', 26) + 'OK');
  let bad = 0;
  for (const [s, i, l, v, ok] of rows) { if (!ok) bad++; console.log(padR(s, 11) + pad(i, 2) + '  ' + padR(l, 34) + padR(v, 26) + (ok ? 'OK' : 'FAIL')); }
  console.log('\n' + (bad ? bad + ' Ziele verfehlt' : 'Alle Ziele OK'));
  if (bad) process.exit(1);
}
