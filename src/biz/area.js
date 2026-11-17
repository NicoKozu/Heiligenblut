import { D } from './data.js';

export const built = (G, x) => !x.proj || !!G.build?.done.includes(x.proj);
export const pl = G => D.pistes.filter(p => G.pistes?.[p.id]);
export const baseKm = D.pistes.filter(p => !p.exp).reduce((a, p) => a + p.km, 0);
const BOTH = new Set(D.lifts.filter(l => l.both).map(l => l.id));
export const keys = l => BOTH.has(l.id) ? [l.id, l.id + '~'] : [l.id];
export const DIRS = D.lifts.flatMap(l => l.both ? [l, { ...l, id: l.id + '~', from: l.to, to: l.from, back: l.id }] : [l]);
