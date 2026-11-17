import { D } from './data.js';
import { int, next as rand } from './rng.js';
import { hit } from './satisfaction.js';
import { techFactor, riskFactor, canOpen } from './staff.js';

const F = D.fault;
const sum = a => a.reduce((x, y) => x + y, 0);

export function pay(G, k, v) {
  G.today.costs[k] = (G.today.costs[k] || 0) + v;
  G.cash -= v;
  const h = G.history[G.history.length - 1];
  if (G.phase === 'closed' && h && h.date === G.today.date) {
    h.costs[k] = (h.costs[k] || 0) + v;
    h.cost += v;
    h.cash = G.cash;
  }
}

export function log(G, text, lvl = 'info') {
  G.log.push({ date: G.date, min: G.min, text, lvl });
  if (G.log.length > D.logMax) G.log.shift();
}

export const running = l => l.open && !l.broken && !(l.insp > 0) && !l.wind;
export const pisteOpen = (G, id) => G.pistes?.[id]?.open !== false;

export function status(l) {
  if (l.broken) return l.repairLeft > 0 ? 'repair' : 'fault';
  if (l.insp > 0) return 'insp';
  if (l.wind) return 'wind';
  if (!l.open && l.staffOff) return 'staff';
  return l.open ? 'run' : 'closed';
}

export function initAssets(G) {
  G.log = G.log || [];
  for (const l of G.lifts) {
    if (l.broken === undefined) l.broken = null;
    l.repairLeft = l.repairLeft || 0;
    l.insp = l.insp || 0;
    l.inspPlan = !!l.inspPlan;
    l.wind = !!l.wind;
  }
  const P = G.pistes || {};
  G.pistes = {};
  for (const p of D.pistes) {
    const o = P[p.id];
    G.pistes[p.id] = o && typeof o === 'object' ? o : { id: p.id, open: o !== false, cond: D.pisteStart.cond, snow: D.pisteStart.snow, groomed: true };
  }
}

export const faultChance = cond => F.base * Math.pow(1 + (100 - cond) / F.ref, 2) / 60;

function pickType(G) {
  let t = rand(G) * sum(F.types.map(x => x.w));
  for (const x of F.types) if ((t -= x.w) <= 0) return x;
  return F.types[0];
}

function breakLift(G, l, ev) {
  const t = pickType(G);
  l.broken = { type: t.id, label: t.label, min: int(G, t.min[0], t.min[1]), cost: Math.round(int(G, t.cost[0], t.cost[1]) / 100) * 100, gain: t.gain };
  l.repairLeft = 0;
  G.today.faults = (G.today.faults || 0) + 1;
  hit(G, 'fault');
  log(G, 'Störung ' + l.name + ' (' + t.label + ')', 'bad');
  const f = G.flow, r = f && f.ride[l.id];
  const n = r ? sum(r) : 0;
  if (n >= 1) {
    r.fill(0);
    f.queue[l.id] += n;
    G.today.rescued = (G.today.rescued || 0) + n;
    hit(G, 'rescue');
    log(G, 'Bergung ' + l.name + ': ' + Math.round(n) + ' Gäste aus Kabinen', 'bad');
  }
  ev.push({ t: 'fault', id: l.id });
}

function fixed(G, l, ev) {
  l.cond = Math.min(100, l.cond + (l.broken.gain || 0));
  l.broken = null;
  l.repairLeft = 0;
  log(G, l.name + ' repariert', 'good');
  ev && ev.push({ t: 'fixed', id: l.id });
}

export function liftMinute(G, l, ev) {
  if (l.broken) {
    if (l.repairLeft > 0 && --l.repairLeft <= 0) fixed(G, l, ev);
    return;
  }
  if (l.insp > 0) {
    if (--l.insp <= 0) {
      l.cond = Math.min(100, l.cond + D.inspect.gain);
      log(G, 'Inspektion ' + l.name + ' abgeschlossen', 'good');
      ev.push({ t: 'insp', id: l.id });
    }
    return;
  }
  if (!l.open) return;
  l.cond = Math.max(0, l.cond - D.wear.perHour / 60 * (D.wear.base + l.util));
  if (rand(G) < faultChance(l.cond) * riskFactor(G)) breakLift(G, l, ev);
}

export function dayStart(G) {
  for (const l of G.lifts) {
    if (l.inspPlan && !l.broken) {
      l.insp = D.inspect.min;
      log(G, 'Inspektion ' + l.name + ' bis ' + Math.floor((D.time.open + D.inspect.min) / 60) + ':' + String((D.time.open + D.inspect.min) % 60).padStart(2, '0'));
    }
    l.inspPlan = false;
  }
}

export function overnight(G) {
  for (const l of G.lifts) {
    l.insp = 0;
    if (l.broken && l.repairLeft > 0 && (l.repairLeft -= D.night) <= 0) fixed(G, l, null);
  }
}

export function repairQuote(l, express, G) {
  if (!l.broken) return null;
  const x = express ? D.express : { cost: 1, time: 1 };
  return { cost: Math.round(l.broken.cost * x.cost / 100) * 100, min: Math.max(15, Math.round(l.broken.min * x.time * (G ? techFactor(G) : 1))) };
}

export function repair(G, id, express) {
  const l = G.lifts.find(x => x.id === id);
  if (!l || !l.broken || l.repairLeft > 0) return false;
  const q = repairQuote(l, express, G);
  pay(G, 'repair', q.cost);
  l.repairLeft = q.min;
  log(G, 'Reparatur ' + l.name + (express ? ' (Express)' : '') + ' beauftragt');
  return true;
}

export function inspect(G, id) {
  const l = G.lifts.find(x => x.id === id);
  if (!l || l.broken || l.inspPlan || l.insp > 0) return false;
  pay(G, 'inspect', D.inspect.cost);
  l.inspPlan = true;
  log(G, 'Inspektion ' + l.name + (G.phase === 'prep' ? ' heute früh' : ' morgen früh') + ' geplant');
  return true;
}

export function setOpen(G, kind, id, open) {
  const o = kind === 'lift' ? G.lifts.find(x => x.id === id) : G.pistes[id];
  if (!o || o.open === open || (open && kind === 'piste' && o.aper)) return false;
  if (open && kind === 'lift' && !canOpen(G, id)) {
    log(G, o.name + ' kann nicht öffnen – zu wenig Liftpersonal', 'bad');
    return false;
  }
  if (kind === 'lift') o.staffOff = false;
  if (!open && !(kind === 'lift' && (o.broken || o.insp > 0))) hit(G, kind === 'lift' ? 'fault' : 'pisteClose');
  o.open = open;
  const name = kind === 'lift' ? o.name : 'Piste ' + id + ' ' + D.pistes.find(p => p.id === id).name;
  log(G, name + (open ? ' geöffnet' : (kind === 'lift' ? ' geschlossen' : ' gesperrt')));
  return true;
}

export const fmtDur = m => m < 60 ? Math.round(m) + ' min' : m < 1440 ? (Math.round(m / 30) / 2).toLocaleString('de-DE') + ' h' : (Math.round(m / 144) / 10).toLocaleString('de-DE') + ' Tage';
