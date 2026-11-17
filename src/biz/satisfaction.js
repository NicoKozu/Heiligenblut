import { D } from './data.js';
import { pl } from './area.js';
import { int, next as rand } from './rng.js';
import { running } from './assets.js';
import { openPistes, offerShare, priceEq, segOffer, segPriceEq } from './demand.js';
import { SEGS, kidsFree } from './marketing.js';
import { score } from './snow.js';
import { service } from './staff.js';
import { levelAdj, parkAdj } from './side.js';

const S = D.sat;
const K = Object.keys(S.w);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lin = (v, a, b) => clamp((b - v) / (b - a), 0, 1) * 100;

export const waitScore = w => lin(w, S.wait[0], S.wait[1]);
export function combine(p, w = S.w) {
  const m = K.reduce((a, k) => a + w[k] * (p[k] ?? 0), 0), lo = Math.min(...K.map(k => p[k] ?? 0));
  return m - S.worst * Math.max(0, m - lo);
}
export const stars = z => clamp(z / 20, 0, 5);

export function instant(G) {
  const f = G.flow, open = openPistes(G), km = open.reduce((a, p) => a + p.km, 0), share = offerShare(G);
  let q = 0, qs = 0;
  for (const l of G.lifts) {
    if (!running(l) || !f) continue;
    const n = f.queue[l.id] || 0;
    q += n;
    qs += n * waitScore(f.wait[l.id] || 0);
  }
  if (f && f.cashQ > 0) { q += f.cashQ; qs += f.cashQ * waitScore(f.cashWait || 0); }
  const fair = S.price.ref * (S.price.base + S.price.offer * share);
  const present = f ? f.present : 0;
  return {
    wait: q >= 1 ? qs / q : 100,
    offer: Math.min(100, share * 100),
    quality: (q => q.reduce((a, p) => a + p.km * score(G, p.id), 0) / q.reduce((a, p) => a + p.km, 0))(km ? open : pl(G)),
    price: clamp(S.price.atFair - S.price.perEur * (priceEq(G.prices) - fair), 0, 100),
    crowd: lin(present / Math.max(km, 0.5), S.crowd[0], S.crowd[1]),
    service: service(G)
  };
}

function state(G) {
  const T = G.today;
  if (!T.sat) T.sat = { acc: Object.fromEntries(K.map(k => [k, 0])), wt: 0, wait: [0, 0], live: null };
  if (!T.sat.seg) T.sat.seg = Object.fromEntries(SEGS.map(k => [k, 0]));
  if (!T.hits) T.hits = {};
  return T.sat;
}

export function hit(G, k) {
  if (G.phase !== 'open') return;
  const h = G.today.hits || (G.today.hits = {});
  h[k] = (h[k] || 0) + 1;
}

export const lostShare = G => Math.min(1, (G.today.lost || 0) / Math.max(1, G.today.guests));
const adjust = (G, z) => clamp(z * (1 - S.lostW * lostShare(G)) - deduction(G), 0, 100);

export function segPrice(G, sg, share) {
  const fair = S.price.ref * (S.price.base + S.price.offer * share) * D.segs[sg].fair;
  return clamp(S.price.atFair - S.price.perEur * (segPriceEq(G.prices, sg, kidsFree(G, G.date) ? 0 : G.prices.child) - fair), 0, 100);
}

function segMix(G) {
  const t = G.today.seg, n = t ? SEGS.reduce((a, s) => a + (t[s] || 0), 0) : 0;
  return Object.fromEntries(SEGS.map(s => [s, n > 0 ? (t[s] || 0) / n : G.flow?.seg?.[s] ?? D.segs[s].share]));
}

function segZ(G, parts, offer, share) {
  const mix = segMix(G), seg = {};
  let z = 0;
  for (const sg of SEGS) {
    const p = { ...parts, offer: offer[sg], price: clamp(segPrice(G, sg, share) + D.side.priceK * levelAdj(G, sg) + parkAdj(G), 0, 100), service: clamp(parts.service + levelAdj(G, sg), 0, 100) };
    seg[sg] = adjust(G, combine(p, D.segs[sg].w || S.w));
    z += mix[sg] * seg[sg];
  }
  return { z, seg, mix };
}


export function deduction(G) {
  const h = G.today.hits || {};
  return Math.min(S.dedMax, Object.entries(h).reduce((a, [k, n]) => a + (S.ded[k] || 0) * n, 0));
}

export function minute(G) {
  const s = state(G), f = G.flow, p = instant(G), wt = f.present;
  if (wt > 0) {
    for (const k of K) if (k !== 'wait') s.acc[k] += p[k] * wt;
    const open = openPistes(G);
    for (const sg of SEGS) s.seg[sg] += segOffer(G, sg, open) * 100 * wt;
    s.wt += wt;
  }
  for (const l of G.lifts) {
    const b = f.board?.[l.id] || 0;
    if (b > 0) { s.wait[0] += b * waitScore(f.wait[l.id] || 0); s.wait[1] += b; }
  }
  if (f.cashServed > 0) { s.wait[0] += f.cashServed * waitScore(f.cashWait || 0); s.wait[1] += f.cashServed; }
  if (!s.live) s.live = { ...p };
  else { const a = 1 - Math.exp(-1 / S.liveTau); for (const k of K) s.live[k] += (p[k] - s.live[k]) * a; }
}

export function dayParts(G) {
  const s = state(G), p = instant(G), o = {};
  for (const k of K) o[k] = k === 'wait' ? (s.wait[1] ? s.wait[0] / s.wait[1] : p.wait) : s.wt ? s.acc[k] / s.wt : p[k];
  return o;
}

const offerNow = G => { const open = openPistes(G); return Object.fromEntries(SEGS.map(sg => [sg, Math.min(100, segOffer(G, sg, open) * 100)])); };

export function live(G) {
  if (G.phase === 'open') {
    const s = state(G), parts = s.live || instant(G), r = segZ(G, parts, offerNow(G), offerShare(G));
    return { z: r.z, seg: r.seg, parts, ded: deduction(G), lost: G.today.lost || 0 };
  }
  return G.sat ? { z: G.sat.z, seg: G.sat.seg, parts: G.sat.parts, ded: G.sat.ded, lost: G.sat.lost || 0 } : null;
}

const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const pick = (G, a) => a[Math.floor(rand(G) * a.length)];

function voices(G, parts, z) {
  const T = G.today, peak = Object.entries(T.peak || {}).sort((a, b) => b[1] - a[1])[0];
  const open = openPistes(G);
  const v = {
    lift: peak ? D.lifts.find(l => l.id === peak[0]).name.replace(/^Gondel /, '') : 'Lift',
    min: peak ? Math.max(1, Math.round(peak[1])) : 0,
    piste: (open.length ? pick(G, open) : pick(G, pl(G))).name,
    price: G.prices.day
  };
  const order = [...K].sort((a, b) => parts[a] - parts[b]);
  const n = int(G, S.quotes.n[0], S.quotes.n[1]);
  const keys = [order[0], order[order.length - 1]];
  if ((T.hits?.rescue || 0) > 0) keys.unshift('rescue');
  if (lostShare(G) > 0.05) keys.unshift('lost');
  const rest = order.slice(1, -1).filter(k => k !== 'service');
  while (keys.length < n && rest.length) keys.push(rest.splice(Math.floor(rand(G) * rest.length), 1)[0]);
  const used = new Set();
  return keys.slice(0, n).map(k => {
    const sc = parts[k] ?? 0, good = sc >= S.quotes.good;
    const list = S.voices[k][good ? 'good' : 'bad'].filter(t => !used.has(t));
    const text = fill(pick(G, list.length ? list : S.voices[k][good ? 'good' : 'bad']), v);
    used.add(text);
    const st = clamp(Math.round((z + (sc - z) * 0.6) / 20 + (rand(G) - 0.5)), 1, 5);
    return { k, text, who: pick(G, S.who), stars: st };
  });
}

export function endDay(G) {
  const parts = dayParts(G), ded = deduction(G), st = state(G);
  const offer = st.wt ? Object.fromEntries(SEGS.map(sg => [sg, st.seg[sg] / st.wt])) : offerNow(G);
  const r = segZ(G, parts, offer, parts.offer / 100), z = r.z, seg = r.seg, lost = G.today.lost || 0;
  const quotes = voices(G, parts, z);
  const rep0 = G.rep;
  G.rep = clamp((1 - S.rep) * G.rep + S.rep * z, 0, 100);
  G.sat = { z, seg, parts, ded, lost, date: G.today.date };
  return { z, seg, mix: r.mix, parts, ded, lost, rep0, hits: { ...(G.today.hits || {}) }, quotes };
}

export const seasonShare = rep => clamp(D.flow.seasonShare + S.season.k * (rep - S.season.ref), S.season.clamp[0], S.season.clamp[1]);
