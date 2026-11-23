import { D } from './data.js';

export const built = (G, x) => !x.proj || !!G.build?.done.includes(x.proj);
export const pl = G => D.pistes.filter(p => G.pistes?.[p.id]);
export const baseKm = D.pistes.filter(p => !p.exp && !p.of).reduce((a, p) => a + p.km, 0);
const BOTH = new Set(D.lifts.filter(l => l.both).map(l => l.id));
export const keys = l => BOTH.has(l.id) ? [l.id, l.id + '~'] : [l.id];
export const DIRS = [];
export const LIFTX = {};
export const PX = {};
export function relink() {
  DIRS.length = 0;
  for (const l of D.lifts) DIRS.push(...(l.both ? [l, { ...l, id: l.id + '~', from: l.to, to: l.from, back: l.id }] : [l]));
  for (const k in LIFTX) delete LIFTX[k];
  for (const l of DIRS) LIFTX[l.id] = l;
  for (const k in PX) delete PX[k];
  for (const p of D.pistes) PX[p.id] = p;
}
relink();
