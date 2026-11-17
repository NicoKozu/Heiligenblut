import { D } from './data.js';

const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const pad = n => String(n).padStart(2, '0');

export const parse = s => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
const utc = s => { const { y, m, d } = parse(s); return Date.UTC(y, m - 1, d); };
const iso = t => { const x = new Date(t); return x.getUTCFullYear() + '-' + pad(x.getUTCMonth() + 1) + '-' + pad(x.getUTCDate()); };
export const make = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);
export const addDays = (s, n) => iso(utc(s) + n * 86400000);
export const diff = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
export const weekday = s => new Date(utc(s)).getUTCDay();
export const weekend = s => { const w = weekday(s); return w === 0 || w === 6; };

export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return make(y, mo, da);
}

export const seasonOf = s => { const { y, m } = parse(s); return m >= 7 ? y : y - 1; };
export const seasonStart = sy => make(sy, 12, 1);

export function seasonEnd(sy) {
  const em = addDays(easter(sy + 1), 1), cap = make(sy + 1, D.seasonEnd.month, D.seasonEnd.day);
  return em < cap ? em : cap;
}

export function isSeason(s) {
  const sy = seasonOf(s);
  return s >= seasonStart(sy) && s <= seasonEnd(sy);
}

export function phase(s) {
  const { y, m, d } = parse(s);
  const e = easter(m >= 7 ? y + 1 : y);
  if (m >= 3 && m <= 4) {
    if (s >= addDays(e, D.easterHolidays[0]) && s <= addDays(e, D.easterHolidays[1])) return 'easter';
    if (s > addDays(e, D.easterHolidays[1])) return 'late';
    return 'mar';
  }
  if (m === 12) return d < 20 ? 'early' : 'xmas';
  if (m === 1) return d <= 6 ? 'xmas' : 'jan';
  if (m === 2) return d >= D.febHolidays[0] && d <= D.febHolidays[1] ? 'febHol' : 'feb';
  return 'late';
}

export function baseDemand(s) {
  const p = D.demand[phase(s)];
  return weekend(s) ? p.we : p.wd;
}

export function fmtDate(s) {
  const { y, m, d } = parse(s);
  return DAYS[weekday(s)] + ' ' + pad(d) + '.' + pad(m) + '.' + y;
}

export const fmtClock = min => pad(Math.floor(min / 60) % 24) + ':' + pad(Math.floor(min % 60));
