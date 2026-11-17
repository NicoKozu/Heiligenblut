import { D } from './data.js';
import { next as rand } from './rng.js';
import { addDays } from './calendar.js';
import { pay, log } from './assets.js';
import { hit } from './satisfaction.js';
import { gastroNeed, gastroScore, sideScore } from './side.js';

const S = D.staff;
export const GROUPS = Object.keys(S.groups);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LIFT = Object.fromEntries(D.lifts.map(l => [l.id, l]));
const short = d => d.slice(8) + '.' + d.slice(5, 7) + '.';

export function initStaff(G) {
  if (!G.staff) G.staff = { n: {}, pending: [], sick: {}, wage: 100, morale: S.morale.start, over: 0, bonus: null };
  for (const k of GROUPS) if (G.staff.n[k] == null) G.staff.n[k] = S.groups[k].start;
  return G.staff;
}

export const duty = (G, k) => Math.max(0, G.staff.n[k] - (G.staff.sick[k] || 0));
export const heads = G => GROUPS.reduce((a, k) => a + G.staff.n[k], 0);
export const dayCost = (G, k) => D.staffCost[k] * G.staff.wage / 100;
export const wages = G => GROUPS.reduce((a, k) => a + G.staff.n[k] * dayCost(G, k), 0);
export const pendingOf = (G, k) => G.staff.pending.filter(p => p.k === k).reduce((a, p) => a + p.n, 0);
export const nextArrival = (G, k) => G.staff.pending.filter(p => p.k === k).map(p => p.date).sort()[0] || null;
const openCount = G => D.pistes.filter(p => G.pistes[p.id].open).length;

export function needs(G, n) {
  const s = G.seasonShare ?? D.flow.seasonShare, a = D.flow.arrive;
  const peak = n * (1 - D.mix.half) * 2 / (a.to - a.from);
  const want = D.pistes.filter(p => G.pistes[p.id].grm).reduce((x, p) => x + p.km * D.groom.hoursPerKm, 0);
  return {
    lift: Math.ceil(G.lifts.filter(l => l.open || l.staffOff).reduce((x, l) => x + LIFT[l.id].staff, 0) * S.relief),
    tech: G.lifts.length * S.techPerLift + S.techBase,
    groomer: Math.min(G.groom.machines, Math.ceil(want / D.groomNight.shift - 1e-6)),
    patrol: Math.ceil(openCount(G) / S.patrolPer),
    cashier: Math.ceil(peak * (1 - s) * (1 - S.cash.online) / S.cash.rate),
    instructor: Math.ceil(n * D.side.school.share / S.pupils),
    gastro: gastroNeed(G)
  };
}

export function liftFree(G, except) {
  return duty(G, 'lift') - G.lifts.filter(l => l.open && l.id !== except).reduce((a, l) => a + LIFT[l.id].staff, 0);
}
export const canOpen = (G, id) => liftFree(G, id) >= LIFT[id].staff;

export function assign(G) {
  let free = duty(G, 'lift');
  for (const l of G.lifts) {
    if (!l.open && !l.staffOff) continue;
    const need = LIFT[l.id].staff;
    if (free >= need) {
      free -= need;
      if (l.staffOff) log(G, l.name + ' wieder besetzt', 'good');
      l.open = true;
      l.staffOff = false;
    } else {
      if (!l.staffOff) log(G, l.name + ' bleibt zu – zu wenig Liftpersonal (' + Math.max(0, free) + '/' + need + ')', 'bad');
      l.open = false;
      l.staffOff = true;
    }
  }
}

export function morning(G) {
  const st = G.staff, got = {};
  st.pending = st.pending.filter(p => {
    if (p.date > G.date) return true;
    st.n[p.k] += p.n;
    got[p.k] = (got[p.k] || 0) + p.n;
    return false;
  });
  for (const k in got) log(G, got[k] + ' × ' + S.groups[k].label + ' neu im Dienst', 'good');
  st.sick = {};
  const m = S.morale;
  if (st.morale < m.sickBelow) {
    const p = m.sick[0] + (m.sick[1] - m.sick[0]) * (m.sickBelow - st.morale) / m.sickBelow;
    let tot = 0;
    for (const k of GROUPS) {
      let c = 0;
      for (let i = 0; i < st.n[k]; i++) if (rand(G) < p) c++;
      if (c) { st.sick[k] = c; tot += c; }
    }
    if (tot) log(G, tot + ' Krankmeldungen (Moral ' + Math.round(st.morale) + ')', 'bad');
  }
  assign(G);
}

export function evening(G) {
  const st = G.staff, nd = needs(G, G.today.guests), m = S.morale;
  let over = 0, w = 0;
  for (const k of GROUPS) {
    over += clamp(nd[k] / Math.max(duty(G, k), 0.5) - 1, 0, 1) * nd[k];
    w += nd[k];
  }
  st.over = w ? over / w : 0;
  const target = clamp(m.base + m.wageK * (st.wage - 100) - m.over * st.over, 0, 100);
  st.morale = clamp(st.morale + m.rate * (target - st.morale), 0, 100);
  const sick = GROUPS.reduce((a, k) => a + (st.sick[k] || 0), 0);
  return { morale: st.morale, over: st.over, sick, heads: heads(G), need: GROUPS.reduce((a, k) => a + nd[k], 0), duty: GROUPS.reduce((a, k) => a + duty(G, k), 0), cashPeak: G.today.cashPeak || 0 };
}

export function hire(G, k, n = 1) {
  const st = G.staff;
  if (!S.groups[k] || st.n[k] + pendingOf(G, k) + n > S.max) return false;
  const date = addDays(G.date, S.delay);
  const p = st.pending.find(x => x.k === k && x.date === date);
  if (p) p.n += n; else st.pending.push({ k, n, date });
  log(G, n + ' × ' + S.groups[k].label + ' eingestellt – Dienstbeginn ' + short(date));
  return true;
}

export function fire(G, k, n = 1) {
  const st = G.staff;
  if (!S.groups[k] || G.phase === 'open') return false;
  const i = st.pending.map(p => p.k).lastIndexOf(k);
  if (i >= 0) {
    const p = st.pending[i];
    p.n -= n;
    if (p.n <= 0) st.pending.splice(i, 1);
    log(G, 'Einstellung ' + S.groups[k].label + ' storniert');
    return true;
  }
  if (st.n[k] < n) return false;
  pay(G, 'severance', S.fireDays * dayCost(G, k) * n);
  st.n[k] -= n;
  if (st.sick[k]) st.sick[k] = Math.min(st.sick[k], st.n[k]);
  st.morale = clamp(st.morale - S.morale.fire * n, 0, 100);
  log(G, n + ' × ' + S.groups[k].label + ' gekündigt (' + S.fireDays + ' Tageslöhne)');
  if (k === 'lift') assign(G);
  return true;
}

export function setWage(G, d) {
  const st = G.staff, w = clamp(st.wage + d, S.wage[0], S.wage[1]);
  if (w === st.wage) return false;
  if (w < st.wage) st.morale = clamp(st.morale - S.morale.cut * (st.wage - w), 0, 100);
  st.wage = w;
  log(G, 'Lohnniveau ' + w + ' %');
  return true;
}

export const bonusCost = G => heads(G) * S.bonus.perHead;
export const bonusDone = G => G.staff.bonus === G.date;

export function bonus(G) {
  const st = G.staff;
  if (bonusDone(G)) return false;
  pay(G, 'bonus', bonusCost(G));
  st.morale = clamp(st.morale + S.bonus.gain, 0, 100);
  st.bonus = G.date;
  log(G, 'Prämie an alle Mitarbeiter ausgezahlt', 'good');
  return true;
}

export function seasonEnd(G) {
  const st = G.staff, r = S.returnRate[0] + (S.returnRate[1] - S.returnRate[0]) * st.morale / 100;
  let gone = 0;
  for (const k of GROUPS) {
    const perm = Math.min(st.n[k], S.groups[k].perm), keep = perm + Math.round((st.n[k] - perm) * r);
    gone += st.n[k] - keep;
    st.n[k] = keep;
  }
  st.pending = [];
  st.sick = {};
  log(G, 'Saisonende: ' + gone + ' Saisonkräfte verabschiedet, ' + Math.round(r * 100) + ' % kommen wieder');
}

export const techFactor = G => Math.max(S.techMin, S.techRef / Math.max(duty(G, 'tech'), 0.5));
export const riskFactor = G => clamp(1 + S.techRisk * (S.techRef - duty(G, 'tech')) / S.techRef, 1 - S.techRisk, 1 + S.techRisk);
export const patrolShort = G => Math.max(0, openCount(G) / S.patrolPer - duty(G, 'patrol'));
export const cashCap = G => (duty(G, 'cashier') + S.cash.auto) * S.cash.rate;

export function minute(G) {
  const sh = patrolShort(G), f = G.flow;
  if (sh <= 0 || !f || f.present <= 0 || rand(G) >= S.accident * sh * f.present / 1000) return;
  const open = D.pistes.filter(p => G.pistes[p.id].open);
  if (!open.length) return;
  const p = open[Math.floor(rand(G) * open.length)];
  hit(G, 'accident');
  log(G, 'Unfall auf Piste ' + p.id + ' – Rettung kam spät (zu wenig Pistenrettung)', 'bad');
}

export function service(G) {
  const f = G.flow, c = S.cash.wait, w = S.service, st = G.staff;
  const cash = clamp((c[1] - (f?.cashWait || 0)) / (c[1] - c[0]), 0, 1) * 100;
  return w.cash * cash + w.morale * st.morale + w.gastro * gastroScore(G) + w.side * sideScore(G);
}
