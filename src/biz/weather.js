import { D } from './data.js';
import { next, range } from './rng.js';
import { addDays, seasonOf, make, diff } from './calendar.js';

const W = D.weather;
const TYPES = Object.keys(W.types);

function pick(G, probs) {
  let r = next(G);
  for (const k of TYPES) if ((r -= probs[k] || 0) <= 0) return k;
  return TYPES[0];
}

export function valleyMean(date) {
  const sy = seasonOf(date), d0 = make(sy, 12, 1);
  const pts = W.valley.map(([m, d, t]) => [diff(d0, make(m >= 7 ? sy : sy + 1, m, d)), t]);
  const x = diff(d0, date);
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a, ta] = pts[i - 1], [b, tb] = pts[i]; return ta + (tb - ta) * (x - a) / (b - a); }
  return pts[pts.length - 1][1];
}

export const tempAt = (tTal, h) => tTal - W.lapse * (h - W.ref) / 100;

function noise(G) { return (next(G) + next(G) + next(G) - 1.5) * 2; }

function roll(G, prev, date) {
  const w = G.weather, type = pick(G, W.trans[prev]), T = W.types[type];
  w.anom = W.anom[0] * w.anom + W.anom[1] * noise(G) / 2;
  const tTal = valleyMean(date) + T.dT + w.anom;
  const wind = Math.round(range(G, T.wind[0], T.wind[1]));
  const cm = next(G) < T.snow[0] ? Math.round(range(G, T.snow[1], T.snow[2])) : 0;
  return { date, type, tTal: Math.round(tTal * 10) / 10, tBerg: Math.round(tempAt(tTal, W.top) * 10) / 10, wind, cm };
}

function forecastOf(G, day, lead) {
  const ok = next(G) < W.acc[lead - 1];
  const type = ok ? day.type : pick(G, W.trans[day.type]);
  const T = W.types[type], e = W.tErr[lead - 1] * noise(G) / 2;
  const tTal = Math.round((day.tTal + e + (ok ? 0 : T.dT - W.types[day.type].dT)) * 10) / 10;
  const cm = ok ? day.cm : T.snow[0] ? Math.round((T.snow[1] + T.snow[2]) / 2) : 0;
  return { type, tTal, tBerg: Math.round(tempAt(tTal, W.top) * 10) / 10, cm, wind: ok ? day.wind : Math.round((T.wind[0] + T.wind[1]) / 2) };
}

export function initWeather(G, date = G.date) {
  G.weather = { anom: 0, score: 0, aval: 1, today: null, ahead: [] };
  G.weather.today = roll(G, W.start, date);
  fill(G);
  avalanche(G);
}

function fill(G) {
  const w = G.weather;
  while (w.ahead.length < W.acc.length) {
    const last = w.ahead[w.ahead.length - 1] || w.today;
    w.ahead.push(roll(G, last.type, addDays(last.date, 1)));
  }
  w.ahead.forEach((d, i) => { d.fc = forecastOf(G, d, i + 1); });
}

export function advance(G, date) {
  const w = G.weather;
  if (!w || !w.today || addDays(w.today.date, 1) !== date) {
    const s = w ? w.score : 0;
    initWeather(G, date);
    G.weather.score = s * D.aval.decay;
    avalanche(G);
    return;
  }
  w.today = w.ahead.shift();
  delete w.today.fc;
  fill(G);
  avalanche(G);
}

function avalanche(G) {
  const w = G.weather, d = w.today, A = D.aval;
  w.score = A.decay * (w.score || 0) + d.cm + (d.wind > A.wind && d.cm >= D.cover.newSnow ? A.windAdd : 0);
  w.aval = 1 + A.levels.filter(v => w.score >= v).length;
}

export const today = G => G.weather?.today;
export const label = t => W.types[t];
export const stormy = d => d && d.wind > W.stormWind;
export const weatherFactor = d => d ? W.types[d.type].f : 1;

export function forecastFor(G, date) {
  const w = G.weather;
  if (!w) return null;
  if (w.today?.date === date) return w.today;
  const a = w.ahead.find(x => x.date === date);
  return a ? { ...a.fc, date } : null;
}

export function applyWind(G) {
  const st = stormy(today(G));
  for (const l of G.lifts) {
    const s = D.lifts.find(x => x.id === l.id);
    l.wind = !!(s.exposed && st);
  }
}

export const avalClose = () => D.aval.close.filter(id => D.pistes.some(p => p.id === id));
export const fmtT = t => (Math.round(t) > 0 ? '+' : Math.round(t) < 0 ? '−' : '') + Math.abs(Math.round(t)) + ' °C';
