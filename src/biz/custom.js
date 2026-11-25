import { D, addCabs, cabId, growCabs } from './data.js';
import { relink, PX } from './area.js';
import { log, ev } from './assets.js';
import { order, done, job, room, post, writeoff } from './build.js';
import { rehut } from './side.js';

const C = D.custom, T = C.types, P = D.build.projects, PC = C.piste, CH = C.hut, LV = ['leicht', 'mittel', 'schwer'];
const CN = new Set();
const r1 = v => Math.round(v * 10) / 10;

export const TYPES = Object.keys(T);

export function initCustom(G) {
  if (!G.custom) G.custom = { lifts: [], pistes: [], bases: [], n: 0 };
  if (!G.custom.names) G.custom.names = {};
  if (!G.custom.hn) G.custom.hn = 0;
  for (const k of ['lifts', 'pistes', 'bases', 'huts']) if (!Array.isArray(G.custom[k])) G.custom[k] = [];
  if (!G.custom.n) G.custom.n = 0;
  if (!G.custom.pn) G.custom.pn = 0;
  if (G.open == null) G.open = false;
  sync(G);
}

export const segIds = c => c.pts.slice(1).map((_, i) => i ? c.id + '-' + (i + 1) : c.id);
export const lift = (G, id) => G.custom?.lifts.find(c => c.id === id || segIds(c).includes(id));
export const base = (G, id) => G.custom?.bases.find(b => b.id === id);

function segSpec(c, i) {
  const t = T[c.type], a = c.pts[i], b = c.pts[i + 1], places = t.places;
  const len = Math.hypot(b[0] - a[0], b[2] - a[2], b[1] - a[1]), rise = b[1] - a[1];
  const cap = Math.round(3600 / t.gap * places);
  const multi = c.pts.length > 2;
  return {
    id: segIds(c)[i], name: c.name + (multi ? (i ? ' II' : ' I') : ''), custom: true, type: c.type, gap: t.gap, places, cap,
    kw: Math.round(C.kwBase + cap * Math.max(0, rise) * C.kwK), staff: t.staff, maint: Math.round(t.maint[0] + t.maint[1] * len),
    ride: Math.max(1, r1(len / t.speed / 60)), from: c.nodes[i], to: c.nodes[i + 1], proj: c.id,
    exposed: Math.max(a[1], b[1]) > C.exposed, drag: !!t.drag, chair: !!t.chair, h: t.h, color: t.color, link: !!c.link, both: !!c.link && !t.drag,
    a: [a[0], a[2]], b: [b[0], b[2]], ya: a[1], yb: b[1], len, rise
  };
}

export function sync(G) {
  for (let i = D.lifts.length - 1; i >= 0; i--) if (D.lifts[i].custom) D.lifts.splice(i, 1);
  for (const k of CN) { delete D.nodes[k]; delete D.nodeH[k]; }
  CN.clear();
  for (const k in P) if (P[k].custom) delete P[k];
  for (const b of G.custom?.bases || []) { D.nodes[b.id] = b.name; D.nodeH[b.id] = Math.round(b.y); CN.add(b.id); }
  for (const c of G.custom?.lifts || []) {
    c.pts.forEach((p, i) => { const n = c.nodes[i]; if (!D.nodes[n] || CN.has(n)) { if (!D.nodes[n]) D.nodes[n] = c.name + ' ' + (i ? i === c.pts.length - 1 ? 'Berg' : 'Mitte' : 'Tal'); D.nodeH[n] = Math.round(p[1]); CN.add(n); } });
    const segs = c.pts.slice(1).map((_, i) => segSpec(c, i));
    D.lifts.push(...segs);
    P[c.id] = { label: c.name, price: c.price, life: C.life, lifts: segs.map(s => s.id), park: c.base ? base(G, c.base)?.spots || 0 : 0, custom: true, info: info(c) };
    for (const s of segs) addCabs(s, Math.max(20000, c.price / segs.length * 0.5), { custom: true });
  }
  for (let i = D.pistes.length - 1; i >= 0; i--) if (D.pistes[i].custom) D.pistes.splice(i, 1);
  for (const p of G.custom?.pistes || []) {
    D.pistes.push({ id: p.id, name: p.name, level: p.level, km: p.km, rk: p.rk, from: p.from, to: p.to, proj: p.id, exp: true, custom: true, width: p.width, pre: p.pre || null, post: p.post || null });
    P[p.id] = { label: 'Piste ' + p.id + ' ' + p.name, price: p.price, life: PC.life, pistes: [p.id], custom: true, info: pinfo(p) };
  }
  for (const b of G.custom?.bases || []) P['svc:' + b.id] = { label: 'Verleih & Skischule ' + b.name, price: C.svc.price, life: C.svc.life, needs: [b.lift], svc: b.id, custom: true, info: 'Ohne Verleih/Skischule leihen und buchen Gäste dieser Talstation nur ' + Math.round(C.svc.k * 100) + ' % so oft.' };
  const SH = D.side.huts;
  for (let i = SH.length - 1; i >= 0; i--) if (SH[i].custom) SH.splice(i, 1);
  for (const h of G.custom?.huts || []) {
    const z = CH.sizes[h.size];
    SH.push({ id: h.id, name: h.name, node: h.node, seats: z.seats, draw: z.draw, fix: z.fix, custom: true });
    P[h.id] = { label: h.name, price: h.price, life: CH.life, hut: h.id, custom: true, info: hinfo(h) };
  }
  growCabs(G);
  rehut(G);
  relink();
}

const hinfo = h => 'Hütte ' + CH.sizes[h.size].label + ' · ' + CH.sizes[h.size].seats + ' Plätze · bei ' + (D.nodes[h.node] || '');

function info(c) {
  const t = T[c.type];
  return t.label + ' · ' + Math.round(c.len).toLocaleString('de-DE') + ' m · ' + Math.round(c.rise).toLocaleString('de-DE') + ' Hm' + (c.link ? ' · Verbindungslift' : '') + (c.base ? ' · Tallift' : '');
}

function nodePts(G, skip) {
  const o = [];
  for (const n in D.nodeAt) for (const [x, z] of D.nodeAt[n]) o.push({ node: n, x, z });
  for (const b of G.custom?.bases || []) o.push({ node: b.id, x: b.x, z: b.z });
  for (const c of G.custom?.lifts || []) if (c.id !== skip) c.pts.forEach((p, i) => o.push({ node: c.nodes[i], x: p[0], z: p[2] }));
  return o;
}

export function snap(G, x, z, skip) {
  let best = null;
  for (const p of nodePts(G, skip)) { const d = Math.hypot(p.x - x, p.z - z); if (d < C.snap && (!best || d < best.d)) best = { ...p, d }; }
  return best;
}

export function areas(G, skip) {
  const A = {};
  for (const k in D.areas) for (const n of D.areas[k].nodes) A[n] = k;
  for (const b of G.custom?.bases || []) A[b.id] = b.id;
  const L = (G.custom?.lifts || []).filter(c => c.id !== skip);
  for (let go = true; go;) {
    go = false;
    for (const c of L) {
      const a = c.nodes.map(n => A[n]).find(Boolean);
      if (a) for (const n of c.nodes) if (!A[n]) { A[n] = a; go = true; }
    }
  }
  return A;
}

export const areaName = (G, a) => G.custom?.names?.[a] || D.areas[a]?.label || base(G, a)?.name || '';

export function areaList(G) {
  const A = areas(G), o = [...Object.keys(D.areas), ...(G.custom?.bases || []).map(b => b.id)];
  return o.map((id, i) => ({ id, name: areaName(G, id), color: C.areaColors[i % C.areaColors.length], nodes: Object.keys(A).filter(n => A[n] === id) }));
}

export function renameArea(G, a, name) {
  const n = String(name || '').trim().slice(0, 40);
  if (!D.areas[a] && !base(G, a)) return false;
  if (n) G.custom.names[a] = n; else delete G.custom.names[a];
  return true;
}

const areaOfNode = (A, n) => A[n] || 'hb';

export function areaDay(G) {
  const T = G.today, A = areas(G), o = {}, at = a => o[a] || (o[a] = { g: 0, rev: 0, cost: 0 });
  const B = T.bases || {}, ng = Object.values(B).reduce((a, v) => a + v, 0);
  for (const b in B) at(areaOfNode(A, b)).g += B[b];
  const sh = {}, R = T.revenue || {}, K = T.costs || {};
  for (const a in o) sh[a] = ng > 0 ? o[a].g / ng : 0;
  const gen = ['tickets', 'rental', 'school', 'parking'].reduce((a, k) => a + Object.keys(R).filter(x => (k === 'tickets' ? x in D.tickets : x === k)).reduce((s, x) => s + R[x], 0), 0);
  for (const a in sh) at(a).rev += gen * sh[a];
  const hs = T.side || {}, gastro = R.gastro || 0, hr = D.side.huts.reduce((a, h) => a + (hs['h_' + h.id] || 0), 0);
  for (const h of D.side.huts) { const v = hs['h_' + h.id] || 0; if (v) { at(areaOfNode(A, h.node)).rev += hr > 0 ? gastro * v / hr : 0; at(areaOfNode(A, h.node)).cost += v * D.side.gastro.goods + (G.side.huts[h.id]?.open ? h.fix ?? D.side.hutFix : 0); } }
  const lp = T.lp || {}, ls = D.staffCost.lift || 0;
  for (const l of G.lifts) {
    const sp = D.lifts.find(x => x.id === l.id);
    if (!sp || !l.open) continue;
    at(areaOfNode(A, sp.from) || areaOfNode(A, sp.to)).cost += (sp.maint ?? D.maintPerLift) + (lp[l.id] || 0) + sp.staff * ls + D.adminLift;
  }
  const km = {};
  let tk = 0;
  for (const p of D.pistes) if (!p.of && G.pistes?.[p.id]?.open) { const a = areaOfNode(A, p.from); km[a] = (km[a] || 0) + p.km; tk += p.km; }
  const pc = (K.groom || 0) + (K.snowmaking || 0);
  for (const a in km) at(a).cost += tk > 0 ? pc * km[a] / tk : 0;
  for (const a in o) { o[a].g = Math.round(o[a].g); o[a].rev = Math.round(o[a].rev); o[a].cost = Math.round(o[a].cost); }
  return o;
}

export function areaSeason(H) {
  const o = {};
  for (const h of H) for (const a in h.area || {}) { const x = o[a] || (o[a] = { g: 0, rev: 0, cost: 0 }); x.g += h.area[a].g; x.rev += h.area[a].rev; x.cost += h.area[a].cost; }
  return o;
}

export const custHut = (G, id) => G.custom?.huts.find(h => h.id === id);

export function hquote(G, req) {
  const z = CH.sizes[req.size] || CH.sizes[CH.def], s = req.x != null ? snap(G, req.x, req.z) : null, near = s && s.d <= CH.snap ? s : null;
  const o = { size: CH.sizes[req.size] ? req.size : CH.def, seats: z.seats, price: z.price, node: near?.node || null, why: '' };
  o.why = !G.open ? 'Freier Ausbau noch nicht freigeschaltet' : (G.custom?.huts.length || 0) >= CH.max ? 'höchstens ' + CH.max + ' eigene Hütten' : req.blocked ? req.blocked : !o.node ? 'zu weit von einer Station (max. ' + CH.snap + ' m)' : (s.d < CH.min) ? 'zu nah an der Station' : G.cash + room(G) < o.price ? 'zu wenig Geld/Kredit' : '';
  return o;
}

export function hplace(G, req) {
  const q = hquote(G, req);
  if (q.why) return null;
  const id = 'H' + (++G.custom.hn);
  const h = { id, name: (req.name || 'Hütte ' + G.custom.hn).slice(0, 40), size: q.size, node: q.node, x: Math.round(req.x * 10) / 10, y: Math.round((req.y || D.nodeH[q.node] || 0) * 10) / 10, z: Math.round(req.z * 10) / 10, rot: req.rot || 0, price: q.price, date: G.date };
  G.custom.huts.push(h);
  sync(G);
  if (req.level && D.side.levels[req.level]) G.side.huts[id].level = req.level;
  if (!order(G, id, !!G.summer)) { G.custom.huts = G.custom.huts.filter(x => x !== h); sync(G); return null; }
  log(G, 'Eigene Hütte geplant: ' + h.name + ' (' + hinfo(h) + ')', 'info');
  return id;
}

export function canDemolishHut(G, id) {
  if (!custHut(G, id)) return 'unbekannt';
  if (G.phase === 'open' && !G.summer) return 'nur außerhalb des Betriebs';
  return '';
}

export const hrefundOf = (G, id) => job(G, id) ? custHut(G, id)?.price || 0 : Math.round(G.fin.items.filter(x => x.id === id).reduce((a, x) => a + x.cost, 0) * C.refund);

export function demolishHut(G, id) {
  if (canDemolishHut(G, id)) return false;
  const h = custHut(G, id), r = hrefundOf(G, id), pending = !!job(G, id);
  if (pending) post(G, 'invest', -r);
  else { const val = G.fin.items.filter(x => x.id === id).reduce((a, x) => a + x.val, 0); post(G, 'sale', r); writeoff(G, Math.max(0, val - r)); }
  G.fin.items = G.fin.items.filter(x => x.id !== id);
  G.build.done = G.build.done.filter(k => k !== id);
  G.build.jobs = G.build.jobs.filter(j => j.id !== id);
  G.custom.huts = G.custom.huts.filter(x => x !== h);
  sync(G);
  ev(G, 'build', id, -1);
  log(G, h.name + (pending ? ' storniert' : ' abgerissen – Rückerstattung ' + r.toLocaleString('de-DE') + ' €'), 'info');
  return true;
}

export const custHuts = G => (G.custom?.huts || []).map(h => ({ ...h, seats: CH.sizes[h.size].seats, built: done(G, h.id), job: !!job(G, h.id), open: !!G.side?.huts[h.id]?.open }));

export function quote(G, req) {
  const t = T[req.type], pts = req.pts || [];
  const o = { type: req.type, segs: [], len: 0, rise: 0, price: 0, parts: {}, why: '' };
  if (!t) return { ...o, why: 'unbekannter Typ' };
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], h = Math.hypot(b[0] - a[0], b[2] - a[2]), len = Math.hypot(h, b[1] - a[1]), rise = b[1] - a[1];
    o.segs.push({ h, len, rise, slope: h > 0 ? rise / h : 0 });
    o.len += len; o.rise += rise;
  }
  const s0 = snap(G, pts[0]?.[0], pts[0]?.[2]), s1 = pts.length > 1 ? snap(G, pts[pts.length - 1][0], pts[pts.length - 1][2]) : null;
  o.from = s0?.node || null; o.to = s1?.node || null;
  const A = areas(G), af = o.from && A[o.from], at = o.to && A[o.to];
  o.link = !!(af && at && af !== at);
  o.areas = [af ? areaName(G, af) : '', at ? areaName(G, at) : ''];
  o.canBase = !o.from;
  const wantBase = !!req.base && o.canBase;
  o.cap = Math.round(3600 / t.gap * t.places);
  o.ride = o.segs.map(s => Math.max(1, r1(s.len / t.speed / 60)));
  o.kw = o.segs.reduce((a, s) => a + Math.round(C.kwBase + o.cap * Math.max(0, s.rise) * C.kwK), 0);
  o.maint = o.segs.reduce((a, s) => a + Math.round(t.maint[0] + t.maint[1] * s.len), 0);
  o.staff = t.staff * o.segs.length;
  o.towers = req.towers || 0;
  o.forest = Math.round(req.forest || 0);
  o.parts = {
    lift: Math.round(t.base + t.perM * o.len + t.perHm * Math.max(0, o.rise)),
    mid: pts.length > 2 ? C.mid : 0,
    clear: Math.round(C.clear * o.forest),
    base: wantBase ? C.base.price : 0,
    park: wantBase ? Math.round(C.base.perSpot * clampSpots(req.base.spots)) : 0,
    road: wantBase ? Math.round(C.base.road * (req.base.roadLen || 0)) : 0
  };
  o.price = Math.round(Object.values(o.parts).reduce((a, b) => a + b, 0) / 1000) * 1000;
  o.spots = wantBase ? clampSpots(req.base.spots) : 0;
  o.why = whyNot(G, req, t, o);
  return o;
}

const clampSpots = n => Math.max(C.base.spots[0], Math.min(C.base.spots[1], Math.round((n || C.base.def) / C.base.step) * C.base.step));

function whyNot(G, req, t, o) {
  if (!G.open) return 'Freier Ausbau noch nicht freigeschaltet';
  if ((G.custom?.lifts.length || 0) >= C.max) return 'höchstens ' + C.max + ' eigene Lifte';
  if (req.pts.length < 2) return 'Bergpunkt fehlt';
  if (req.pts.length > 3 || (req.pts.length > 2 && !t.mid)) return t.label + ' ohne Mittelstation';
  if (req.blocked) return req.blocked;
  if (req.base && o.canBase && req.base.why) return req.base.why;
  for (const s of o.segs) {
    if (s.h < t.len[0]) return 'zu kurz (min. ' + t.len[0] + ' m)';
    if (s.h > t.len[1]) return 'zu lang (max. ' + t.len[1].toLocaleString('de-DE') + ' m)';
    if (s.rise < C.minRise) return 'Bergpunkt muss höher liegen';
    if (s.slope > t.slope) return 'zu steil (max. ' + Math.round(t.slope * 100) + ' %)';
  }
  if ((req.maxSlope || 0) > t.slope * 2) return 'Gelände zu steil für ' + t.label;
  if (o.from && o.to && o.from === o.to) return 'Tal und Berg an derselben Station';
  if (G.cash + room(G) < o.price) return 'zu wenig Geld/Kredit';
  return '';
}

export function place(G, req) {
  const q = quote(G, req);
  if (q.why) return null;
  const t = T[req.type], id = 'u' + (++G.custom.n), n = req.pts.length;
  const nodes = req.pts.map((p, i) => i === 0 ? q.from : i === n - 1 ? q.to : null).map((v, i) => v || id + ':' + i);
  const c = { id, type: req.type, name: (req.name || t.label + ' ' + G.custom.n).slice(0, 40), pts: req.pts.map(p => p.map(v => Math.round(v * 10) / 10)), nodes, price: q.price, len: q.len, rise: q.rise, forest: q.forest, towers: q.towers, link: q.link, base: null, date: G.date };
  if (req.base && q.canBase) {
    const b = { id: 'b' + G.custom.n, name: (req.base.name || c.name).slice(0, 40), x: req.pts[0][0], y: req.pts[0][1], z: req.pts[0][2], spots: q.spots, lot: req.base.lot || null, road: req.base.road || null, lift: id };
    G.custom.bases.push(b);
    c.base = b.id;
    c.nodes[0] = b.id;
  }
  G.custom.lifts.push(c);
  sync(G);
  if (!order(G, id, !!G.summer)) { drop(G, c); return null; }
  log(G, 'Eigener Lift geplant: ' + c.name + (c.link ? ' (Verbindungslift)' : '') + (c.base ? ' mit Talstation und ' + q.spots + ' Stellplätzen' : ''), 'info');
  return id;
}

function drop(G, c) {
  G.custom.lifts = G.custom.lifts.filter(x => x !== c);
  if (c.base) G.custom.bases = G.custom.bases.filter(b => b.id !== c.base);
  sync(G);
}

export function canDemolish(G, id) {
  const c = lift(G, id);
  if (!c) return 'unbekannt';
  if (G.phase === 'open' && !G.summer) return 'nur außerhalb des Betriebs';
  const own = c.nodes.filter(n => n.startsWith(c.id + ':') || n === c.base);
  if (G.custom.lifts.some(x => x !== c && x.nodes.some(n => own.includes(n)))) return 'erst anschließende Lifte abreißen';
  if (G.custom.pistes.some(p => own.includes(p.from) || own.includes(p.to))) return 'erst anschließende Pisten abreißen';
  if ((G.custom.huts || []).some(h => own.includes(h.node))) return 'erst Hütten an der Station abreißen';
  return '';
}

export function refundOf(G, id) {
  const c = lift(G, id);
  if (!c) return 0;
  if (job(G, c.id)) return c.price;
  const ids = [c.id, ...Object.keys(P).filter(k => P[k].custom && P[k].cab && segIds(c).includes(P[k].cab) && done(G, k))];
  return Math.round(G.fin.items.filter(x => ids.includes(x.id)).reduce((a, x) => a + x.cost, 0) * C.refund);
}

export function demolish(G, id) {
  if (canDemolish(G, id)) return false;
  const c = lift(G, id), segs = segIds(c), r = refundOf(G, id), pending = !!job(G, c.id);
  const cabs = Object.keys(P).filter(k => P[k].custom && segs.includes(P[k].cab));
  const ids = [c.id, ...cabs, ...(c.base ? ['svc:' + c.base] : [])];
  if (pending) post(G, 'invest', -r);
  else {
    const val = G.fin.items.filter(x => ids.includes(x.id)).reduce((a, x) => a + x.val, 0);
    post(G, 'sale', r);
    writeoff(G, Math.max(0, val - r));
  }
  G.fin.items = G.fin.items.filter(x => !ids.includes(x.id));
  G.build.done = G.build.done.filter(k => !ids.includes(k));
  G.build.jobs = G.build.jobs.filter(j => !ids.includes(j.id));
  G.lifts = G.lifts.filter(l => !segs.includes(l.id));
  if (c.base && !pending) G.side.park.cap = Math.max(0, G.side.park.cap - (base(G, c.base)?.spots || 0));
  drop(G, c);
  ev(G, 'build', c.id, -1);
  log(G, c.name + (pending ? ' storniert' : ' abgerissen – Rückerstattung ' + r.toLocaleString('de-DE') + ' €'), 'info');
  return true;
}

export function realDone(G) {
  return Object.entries(P).filter(([, p]) => !p.custom && !p.cab && (p.lifts || p.pistes)).every(([k]) => done(G, k));
}

export function unlock(G) {
  if (G.open || !realDone(G)) return false;
  G.open = true;
  log(G, 'Alle Lifte und Pisten des Gebiets gebaut – Freier Ausbau freigeschaltet (Büro → Freier Bau, Flugmodus F)', 'good');
  return true;
}

export const custPiste = (G, id) => G.custom?.pistes.find(p => p.id === id);
const levelOf = s => s <= PC.steep[0] ? 0 : s <= PC.steep[1] ? 1 : 2;
const pinfo = p => p.level.replace('leicht', 'blau').replace('mittel', 'rot').replace('schwer', 'schwarz') + ' · ' + p.km.toFixed(1).replace('.', ',') + ' km · ' + p.width + ' m breit · ' + (D.nodes[p.from] || '') + ' → ' + (D.nodes[p.to] || '');

export function profile(pts) {
  const n = pts.length, h = new Float64Array(n);
  let len = 0;
  for (let i = 1; i < n; i++) { const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[2] - a[2]); h[i] = h[i - 1] + d; len += Math.hypot(d, b[1] - a[1]); }
  const lv = new Array(Math.max(0, n - 1)).fill(0), w = Math.min(PC.win, h[n - 1] || 0);
  let max = 0, rise = 0;
  if (n > 1 && w > 0) for (let i = 0, j = 0; i < n - 1; i++) {
    while (j < n - 1 && h[j] - h[i] < w) j++;
    const d = h[j] - h[i];
    if (d < w * 0.99) break;
    const sl = (pts[i][1] - pts[j][1]) / d;
    max = Math.max(max, sl);
    rise = Math.max(rise, pts[j][1] - pts[i][1]);
    const k = levelOf(sl);
    for (let m = i; m < j; m++) lv[m] = Math.max(lv[m], k);
  }
  const top = lv.reduce((a, v) => Math.max(a, v), 0);
  return { len, h: h[n - 1] || 0, drop: n ? pts[0][1] - pts[n - 1][1] : 0, max, rise, lv, level: LV[top] };
}

export function pquote(G, req) {
  const pts = req.pts || [], pr = profile(pts), width = Math.max(PC.width[0], Math.min(PC.width[1], Math.round(req.width || PC.def)));
  const o = { ...pr, width, km: Math.round(pr.len) / 1000, parts: {}, price: 0, why: '', from: null, to: null };
  if (pts.length > 1) {
    const a = pts[0], b = pts[pts.length - 1], s0 = snap(G, a[0], a[2]), s1 = snap(G, b[0], b[2]);
    const pre = !s0 && req.pre && PX[req.pre.of], post = !s1 && req.post && PX[req.post.of];
    o.from = s0?.node || (pre ? pre.from : null);
    o.to = s1?.node || (post ? post.to : null);
    o.pre = pre ? { of: pre.id, upto: req.pre.upto, km: req.pre.km || 0 } : null;
    o.post = post ? { of: post.id, at: req.post.at, km: req.post.km || 0 } : null;
  }
  o.rk = Math.round((o.km + (o.pre?.km || 0) + (o.post?.km || 0)) * 100) / 100;
  o.forest = Math.round(req.forest || 0);
  o.parts = { piste: Math.round(PC.base + PC.perM * pr.len * width / PC.wRef), clear: Math.round(PC.clearM2 * o.forest) };
  o.price = Math.round((o.parts.piste + o.parts.clear) / 1000) * 1000;
  o.why = pwhy(G, req, o);
  return o;
}

function pwhy(G, req, o) {
  if (!G.open) return 'Freier Ausbau noch nicht freigeschaltet';
  if ((G.custom?.pistes.length || 0) >= PC.max) return 'höchstens ' + PC.max + ' eigene Pisten';
  if ((req.pts || []).length < 2) return 'Endpunkt fehlt';
  if (req.blocked) return req.blocked;
  if (o.h < PC.len[0]) return 'zu kurz (min. ' + PC.len[0] + ' m)';
  if (o.h > PC.len[1]) return 'zu lang (max. ' + PC.len[1].toLocaleString('de-DE') + ' m)';
  if (!o.from) return 'Start nicht an Bergstation oder Piste';
  if (!o.to) return 'Ende nicht an Station, Lift oder Piste';
  if (o.from === o.to) return 'Start und Ende an derselben Station';
  if (o.drop < PC.drop) return 'zu wenig Gefälle';
  if (o.rise > PC.rise) return 'Gegenanstieg (' + Math.round(o.rise) + ' Hm bergauf)';
  if (o.max > PC.maxSlope) return 'zu steil (max. ' + Math.round(PC.maxSlope * 100) + ' %)';
  if (G.cash + room(G) < o.price) return 'zu wenig Geld/Kredit';
  return '';
}

export function pplace(G, req) {
  const q = pquote(G, req);
  if (q.why) return null;
  const id = 'E' + (++G.custom.pn), r = v => Math.round(v * 10) / 10;
  const p = { id, name: (req.name || 'Abfahrt ' + G.custom.pn).slice(0, 40), pts: req.pts.map(v => v.map(r)), width: q.width, level: q.level, lv: q.lv, km: q.km, rk: q.rk, from: q.from, to: q.to, pre: q.pre, post: q.post, price: q.price, forest: q.forest, date: G.date };
  G.custom.pistes.push(p);
  sync(G);
  if (!order(G, id, !!G.summer)) { G.custom.pistes = G.custom.pistes.filter(x => x !== p); sync(G); return null; }
  log(G, 'Eigene Piste geplant: ' + p.name + ' (' + pinfo(p) + ')', 'info');
  return id;
}

export function canDemolishPiste(G, id) {
  const p = custPiste(G, id);
  if (!p) return 'unbekannt';
  if (G.phase === 'open' && !G.summer) return 'nur außerhalb des Betriebs';
  if (G.cannons?.[id] > 0) return 'erst Schneekanonen abbauen';
  if (G.custom.pistes.some(x => x.pre?.of === id || x.post?.of === id)) return 'erst anschließende Pisten abreißen';
  return '';
}

export function prefundOf(G, id) {
  const p = custPiste(G, id);
  if (!p) return 0;
  if (job(G, id)) return p.price;
  return Math.round(G.fin.items.filter(x => x.id === id).reduce((a, x) => a + x.cost, 0) * C.refund);
}

export function demolishPiste(G, id) {
  if (canDemolishPiste(G, id)) return false;
  const p = custPiste(G, id), r = prefundOf(G, id), pending = !!job(G, id);
  if (pending) post(G, 'invest', -r);
  else {
    const val = G.fin.items.filter(x => x.id === id).reduce((a, x) => a + x.val, 0);
    post(G, 'sale', r);
    writeoff(G, Math.max(0, val - r));
  }
  G.fin.items = G.fin.items.filter(x => x.id !== id);
  G.build.done = G.build.done.filter(k => k !== id);
  G.build.jobs = G.build.jobs.filter(j => j.id !== id);
  delete G.pistes[id];
  if (G.cannons) delete G.cannons[id];
  if (G.pipes) G.pipes = G.pipes.filter(k => k !== id);
  if (G.flow?.run) delete G.flow.run[id];
  G.custom.pistes = G.custom.pistes.filter(x => x !== p);
  sync(G);
  ev(G, 'build', id, -1);
  log(G, 'Piste ' + p.name + (pending ? ' storniert' : ' abgerissen – Rückerstattung ' + r.toLocaleString('de-DE') + ' €'), 'info');
  return true;
}

export const custPistes = G => (G.custom?.pistes || []).map(p => ({ ...p, built: done(G, p.id), job: !!job(G, p.id) }));
export const custLifts = G => (G.custom?.lifts || []).map(c => ({ ...c, segs: segIds(c), built: done(G, c.id), job: !!job(G, c.id) }));
export { cabId };
