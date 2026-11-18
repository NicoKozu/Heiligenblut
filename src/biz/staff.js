import { D } from './data.js';
import { pl } from './area.js';
import { next as rand } from './rng.js';
import { log } from './assets.js';
import { hit } from './satisfaction.js';
import { gastroNeed, gastroScore, sideScore } from './side.js';

const S = D.staff;
export const GROUPS = Object.keys(S.groups);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LIFT = Object.fromEntries(D.lifts.map(l => [l.id, l]));

export function initStaff(G) {
  if (!G.staff) G.staff = { n: {} };
  const st = G.staff;
  for (const k of GROUPS) if (st.n[k] == null) st.n[k] = S.groups[k].start;
  Object.assign(st, { pending: [], sick: {}, wage: 100, morale: S.morale.fix, over: 0, bonus: null });
  return st;
}

export const duty = (G, k) => G.staff.n[k];
export const heads = G => GROUPS.reduce((a, k) => a + G.staff.n[k], 0);
export const dayCost = (G, k) => D.staffCost[k];
export const wages = G => GROUPS.reduce((a, k) => a + G.staff.n[k] * dayCost(G, k), 0);
const openCount = G => pl(G).filter(p => G.pistes[p.id].open).length;

export function needs(G, n) {
  const s = G.seasonShare ?? D.flow.seasonShare, a = D.flow.arrive;
  const peak = n * (1 - D.mix.half) * 2 / (a.to - a.from);
  const want = pl(G).filter(p => G.pistes[p.id].grm).reduce((x, p) => x + p.km * D.groom.hoursPerKm, 0);
  return {
    lift: Math.ceil(G.lifts.filter(l => !l.build).reduce((x, l) => x + LIFT[l.id].staff, 0) * S.relief),
    tech: G.lifts.length * S.techPerLift + S.techBase,
    groomer: Math.min(G.groom.machines, Math.ceil(want / D.groomNight.shift - 1e-6)),
    patrol: Math.max(1, Math.ceil(pl(G).length / S.patrolPer)),
    cashier: Math.max(1, Math.ceil(peak * (1 - s) * (1 - S.cash.online) / S.cash.rate)),
    instructor: Math.max(1, Math.ceil(n * D.side.school.share / S.pupils)),
    gastro: gastroNeed(G)
  };
}

export const canOpen = () => true;

export function staffAuto(G, n) {
  const nd = needs(G, n);
  for (const k of GROUPS) G.staff.n[k] = nd[k];
  for (const l of G.lifts) l.staffOff = false;
}

export function evening(G) {
  const st = G.staff, h = heads(G);
  return { morale: st.morale, over: 0, sick: 0, heads: h, need: h, duty: h, cashPeak: G.today.cashPeak || 0 };
}

export const techFactor = G => Math.max(S.techMin, S.techRef / Math.max(duty(G, 'tech'), 0.5));
export const riskFactor = G => clamp(1 + S.techRisk * (S.techRef - duty(G, 'tech')) / S.techRef, 1 - S.techRisk, 1 + S.techRisk);
export const patrolShort = G => Math.max(0, openCount(G) / S.patrolPer - duty(G, 'patrol'));
export const cashCap = G => (duty(G, 'cashier') + S.cash.auto) * S.cash.rate;

export function minute(G) {
  const sh = patrolShort(G), f = G.flow;
  if (sh <= 0 || !f || f.present <= 0 || rand(G) >= S.accident * sh * f.present / 1000) return;
  const open = pl(G).filter(p => G.pistes[p.id].open);
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
