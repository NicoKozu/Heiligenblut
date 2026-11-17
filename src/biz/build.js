import { D } from './data.js';
import { log, ev, initAssets } from './assets.js';
import { ensureKeys } from './flow.js';
import { initSnow, startSnow, cannons } from './snow.js';
import { seasonOf } from './calendar.js';

const B = D.build, P = B.projects, FN = D.fin;
export const PROJECTS = Object.keys(P);
const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const item = (G, id) => G.fin.items.find(x => x.id === id);

export function initBuild(G) {
  if (!G.build) G.build = { done: [], jobs: [] };
  if (G.build.v !== 2) legacy(G);
  if (!G.pipes) G.pipes = [...D.snow.pistes];
  if (!G.fin) G.fin = { items: FN.start.map(x => ({ ...x })), insolv: 0, over: null };
  for (const id of G.build.done) applyDone(G, id);
}

function legacy(G) {
  G.build.v = 2;
  const add = id => { if (!G.build.done.includes(id)) G.build.done.push(id); };
  if (G.lifts.some(l => l.id === 'schareck')) for (const id of ['schareck', 'panorama', 'p4', 'p5', 'p5a', 'p2', 'p1', 'new:schareck', 'new:spatzl', 'new:fleiss']) add(id);
  if (G.build.done.includes('fleissbahn')) { add('p11'); add('p12'); }
  if (G.build.done.includes('hochfleiss')) add('p11a');
}

export const done = (G, id) => G.build.done.includes(id);
export const job = (G, id) => G.build.jobs.find(j => j.id === id);
export const room = G => Math.max(0, D.start.credit - G.loan);

export function invest(G, v) {
  G.cash -= v;
  G.today.invest = (G.today.invest || 0) + v;
  const h = G.history[G.history.length - 1];
  if (G.phase === 'closed' && h && h.date === G.today.date) { h.invest = (h.invest || 0) + v; h.cash = G.cash; }
}

function asset(G, id, label, cost, life, n) {
  const o = item(G, id);
  if (o) { o.cost += cost; o.val += cost; if (n) o.n = (o.n || 0) + n; }
  else G.fin.items.push({ id, label, cost, val: cost, life, ...(n ? { n } : {}) });
}

export function check(G, id, summer) {
  const p = P[id];
  if (!p) return 'unbekannt';
  if (done(G, id)) return 'fertig';
  if (job(G, id)) return 'im Bau';
  const miss = (p.needs || []).filter(n => !done(G, n) && !(summer && job(G, n)?.left === null));
  if (miss.length) return 'erst ' + miss.map(n => P[n].label).join(', ');
  if (G.cash + room(G) < p.price) return 'zu wenig Geld/Kredit';
  return '';
}

function closures(G, id, on) {
  const p = P[id];
  for (const lid of p.close || []) { const l = G.lifts.find(x => x.id === lid); if (l) l.build = on; }
  if (p.closeHut) { const h = G.side.huts[p.closeHut]; if (on) { h.was = h.open; h.open = false; h.build = true; } else { h.open = h.was !== false; h.build = false; delete h.was; } }
}

export function order(G, id, summer) {
  if (check(G, id, summer)) return false;
  const p = P[id];
  if (G.cash < p.price) borrow(G, Math.ceil((p.price - G.cash) / FN.autoDraw) * FN.autoDraw);
  invest(G, p.price);
  G.build.jobs.push({ id, left: summer ? null : p.days, days: p.days, from: G.date, season: G.season });
  if (!summer) closures(G, id, true);
  log(G, 'Bauauftrag: ' + p.label + (summer ? ' (im Sommer)' : ' – fertig in ' + p.days + ' Tagen'), 'info');
  return true;
}

function applyDone(G, id) {
  const p = P[id];
  for (const lid of p.lifts || []) if (!G.lifts.some(l => l.id === lid)) G.lifts.push({ id: lid, name: D.lifts.find(l => l.id === lid).name, open: true, cond: 100, run: 0, util: 0 });
  for (const lid in p.boost || {}) { const l = G.lifts.find(x => x.id === lid); if (l) l.boost = p.boost[lid]; }
  if (p.hut && G.side?.huts[p.hut]) { const h = G.side.huts[p.hut]; if (!h.own) { h.own = true; h.open = true; } }
}

function complete(G, j) {
  const id = j.id, p = P[id];
  G.build.jobs = G.build.jobs.filter(x => x !== j);
  G.build.done.push(id);
  ev(G, 'build', id, 1);
  if (j.left != null) closures(G, id, false);
  applyDone(G, id);
  initAssets(G);
  for (const pid of p.pistes || []) Object.assign(G.pistes[pid], { snow: startSnow(G, D.pistes.find(x => x.id === pid)), cond: D.pisteStart.cond });
  initSnow(G, false);
  for (const h in p.seats || {}) G.side.huts[h].extra = (G.side.huts[h].extra || 0) + p.seats[h];
  if (p.park) G.side.park.cap += p.park;
  if (G.flow) ensureKeys(G.flow);
  asset(G, id, p.label, p.price, p.life);
  const staff = (p.lifts || []).reduce((a, l) => a + D.lifts.find(x => x.id === l).staff, 0);
  log(G, p.label + ' fertiggestellt' + (staff ? ' – braucht ' + staff + ' Liftpersonal mehr' : ''), 'good');
}

export function buildDay(G, newSeason) {
  for (const j of [...G.build.jobs]) {
    if (newSeason) complete(G, j);
    else if (j.left != null && --j.left <= 0) complete(G, j);
  }
}

export function cancelInfo(G, id) { const j = job(G, id); return j ? (j.left == null ? 'Sommer' : j.left + ' Tage') : ''; }

export function borrow(G, v) {
  const a = Math.min(room(G), Math.max(0, v));
  if (a <= 0) return 0;
  G.loan += a;
  G.cash += a;
  G.today.loan = (G.today.loan || 0) + a;
  return a;
}

export function repay(G, v) {
  const a = Math.min(G.loan, Math.max(0, G.cash), Math.max(0, v));
  if (a <= 0) return 0;
  G.loan -= a;
  G.cash -= a;
  G.today.loan = (G.today.loan || 0) - a;
  return a;
}

export const deprDay = G => G.fin.items.reduce((a, x) => a + Math.min(x.val, x.cost / x.life / FN.days), 0);

export function depreciate(G) {
  let t = 0;
  for (const x of G.fin.items) { const v = Math.min(x.val, x.cost / x.life / FN.days); x.val -= v; t += v; }
  G.today.depr = t;
  return t;
}

export const bookValue = G => G.fin.items.reduce((a, x) => a + x.val, 0);

export function solvency(G) {
  if (G.cash < 0) {
    const a = borrow(G, Math.ceil(-G.cash / FN.autoDraw) * FN.autoDraw);
    if (a) log(G, 'Kasse im Minus – Kredit automatisch um ' + Math.round(a).toLocaleString('de-DE') + ' € erhöht', 'bad');
  }
  if (G.cash < 0) {
    G.fin.insolv++;
    log(G, 'Zahlungsunfähig, Kreditrahmen ausgeschöpft – Tag ' + G.fin.insolv + ' von ' + FN.insolvDays, 'bad');
    if (G.fin.insolv >= FN.insolvDays) G.fin.over = { date: G.date, cash: G.cash, loan: G.loan, assets: bookValue(G) };
  } else G.fin.insolv = 0;
}

function machine(G, k, price, life, label, d) {
  const o = item(G, k) || (asset(G, k, label, 0, life), item(G, k));
  if (d > 0) { if (G.cash + room(G) < price) return false; if (G.cash < price) borrow(G, Math.ceil((price - G.cash) / FN.autoDraw) * FN.autoDraw); invest(G, price); o.cost += price; o.val += price; o.n = (o.n || 0) + 1; return true; }
  const n = Math.max(1, o.n || 1), v = o.val / n;
  o.cost -= o.cost / n; o.val -= v; o.n = Math.max(0, (o.n || 1) - 1);
  G.cash += v * B.sell;
  G.today.sale = (G.today.sale || 0) + v * B.sell;
  return true;
}

export function groomer(G, d) {
  if (d < 0 && G.groom.machines <= 0) return false;
  if (!machine(G, 'groomer', D.groom.price, FN.life.groomer, 'Pistengeräte', d)) return false;
  G.groom.machines += d > 0 ? 1 : -1;
  log(G, 'Pistengerät ' + (d > 0 ? 'gekauft' : 'verkauft') + ' – jetzt ' + G.groom.machines);
  return true;
}

export function cannon(G, pid, d) {
  const c = cannons(G);
  if (d > 0 && !G.pipes.includes(pid)) return false;
  if (d < 0 && !(c[pid] > 0)) return false;
  if (!machine(G, 'cannon', D.snow.price, FN.life.cannon, 'Schneekanonen', d)) return false;
  c[pid] = (c[pid] || 0) + (d > 0 ? 1 : -1);
  if (!c[pid] && G.pistes[pid]) G.pistes[pid].gun = 0;
  return true;
}

export const pipeCost = p => Math.round(p.km * B.pipe);

export function pipe(G, pid) {
  const p = D.pistes.find(x => x.id === pid);
  if (!p || !G.pistes[pid] || G.pipes.includes(pid)) return false;
  const c = pipeCost(p);
  if (G.cash + room(G) < c) return false;
  if (G.cash < c) borrow(G, Math.ceil((c - G.cash) / FN.autoDraw) * FN.autoDraw);
  invest(G, c);
  const o = item(G, 'pipe');
  if (o) { o.cost += c; o.val += c; } else asset(G, 'pipe', 'Beschneiungsleitungen', c, B.pipeLife);
  G.pipes.push(pid);
  log(G, 'Beschneiungsleitung Piste ' + pid + ' gebaut', 'good');
  return true;
}

export function seasonPL(G, sy = G.season) {
  const H = G.history.filter(h => seasonOf(h.date) === sy), rev = {}, cost = {};
  let depr = 0, inv = 0, days = 0, guests = 0;
  const add = (o, s) => { for (const k in s || {}) o[k] = (o[k] || 0) + s[k]; };
  for (const h of H) { add(rev, h.revs); add(cost, h.costs); depr += h.depr || 0; inv += h.invest || 0; days++; guests += h.guests; }
  const t = G.today, open = G.phase !== 'closed' && t && sy === G.season;
  if (open) { add(rev, t.revenue); add(cost, t.costs); inv += t.invest || 0; }
  const R = sum(rev), C = sum(cost);
  return { rev, cost, R, C, depr, ebitda: R - C, result: R - C - depr, invest: inv, days, guests };
}

export function benefit(G, id, fc) {
  const p = P[id], cap = (p.lifts || []).reduce((a, l) => a + D.lifts.find(x => x.id === l).cap, 0) + Object.entries(p.boost || {}).reduce((a, [l, b]) => a + D.lifts.find(x => x.id === l).cap * b, 0);
  const km = (p.pistes || []).reduce((a, x) => a + D.pistes.find(y => y.id === x).km, 0);
  const seats = sum(p.seats) + (p.hut ? D.side.huts.find(h => h.id === p.hut).seats : 0);
  let gain = null;
  if (fc && (km || cap)) {
    const cl = () => { const X = JSON.parse(JSON.stringify({ ...G, history: [], log: [] })); for (const l of X.lifts) { l.broken = null; l.build = false; l.open = true; } return X; };
    const A = cl(), H = cl();
    const chain = x => [...(P[x].needs || []).flatMap(chain), x];
    for (const n of chain(id)) if (!done(H, n)) { let j = job(H, n); if (!j) { j = { id: n, left: 0 }; H.build.jobs.push(j); } j.left = 0; complete(H, j); }
    gain = fc(H) / Math.max(1, fc(A)) - 1;
  }
  return { cap, km, seats, park: p.park || 0, gain };
}
