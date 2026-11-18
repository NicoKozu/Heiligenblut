import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSkier, createBoarder } from './models.js';
import { each } from './biz/people.js';
import { queueSpot, laneAt, rowD, LANE_IN } from './station.js';

const JACKETS = [0xc8202a, 0x2f6fd6, 0xf2c200, 0x1aa36b, 0xff6a00, 0x7a2fd6, 0xe8e8e8, 0x222a33, 0xff3f8e, 0x18a8c8, 0x8b1d2c, 0x3a7d2c, 0x5c6b7a, 0xffb000];
const PANTS = [0x1d2b3a, 0x2d2d33, 0x111111, 0x40464f, 0x2a3b5c, 0x5a3a22, 0xe8e8e8, 0x6b1d2c, 0x3c4a2a];
const HELMETS = [0x222222, 0xeeeeee, 0xc8202a, 0x2f6fd6, 0xf2c200, 0x111111, 0xff3f8e, 0x1aa36b];
const GEAR = [0xf2c200, 0xd62a2a, 0x222222, 0x2f6fd6, 0xeeeeee, 0x1aa36b, 0xff6a00, 0x7a2fd6];
const KINDS = {
  familie: { n: 10, lv: { leicht: 4, mittel: 1, schwer: 0 }, v: 7, lam: [16, 22], amp: [5, 8], pause: 0.6 },
  skischule: { n: 3, lv: { leicht: 1, mittel: 0.15, schwer: 0 }, v: 5.5, lam: [13, 16], amp: [6, 8], pause: 0.8 },
  paar: { n: 8, lv: { leicht: 2, mittel: 2, schwer: 0.3 }, v: 10, lam: [20, 28], amp: [6, 9], pause: 0.3 },
  carver: { n: 12, lv: { leicht: 1, mittel: 3, schwer: 1 }, v: 13, lam: [26, 36], amp: [8, 11], pause: 0.1 },
  racer: { n: 5, lv: { leicht: 0.3, mittel: 2, schwer: 3 }, v: 17, lam: [34, 46], amp: [7, 10], pause: 0 },
  crew: { n: 6, lv: { leicht: 1, mittel: 3, schwer: 1 }, v: 11, lam: [22, 32], amp: [7, 11], pause: 0.4 },
  boarder: { n: 8, lv: { leicht: 1, mittel: 3, schwer: 1.5 }, v: 12, lam: [24, 34], amp: [8, 12], pause: 0.2 }
};
const NEAR = 120;
const POOL = { ski: 10, board: 5 };
const FAR = 2600;
const WALK = 2.2;
const CAP = 4;
const HALL = 16;
const APEX = 4.7;
const RIDE0 = 40;
const QV = 300;
const QMAX = 140;
const SEATS = [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]];

const R = Math.random;
const pick = (a, r = R) => a[Math.floor(r() * a.length)];
const range = ([a, b]) => a + R() * (b - a);
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

function person(type, kid, extra = {}, r = R) {
  const j = pick(JACKETS, r);
  return {
    type, kid,
    scale: kid ? 0.58 + r() * 0.17 : 0.93 + r() * 0.12,
    look: { Jacket: j, Sleeve: shade(j, 0.85), Pants: pick(PANTS, r), Boots: 0x303438, Gloves: 0x1a1a1a, Helmet: pick(HELMETS, r), Gear: pick(GEAR, r), ...extra },
    brake: kid && type === 'ski' ? 0.55 + r() * 0.3 : 0,
    jit: kid ? 1 + r() * 1.5 : 0.3,
    jph: r() * 6.28,
    lag: 0, show: false, cab: 0,
    pos: new THREE.Vector3(), heading: 0, lean: 0, tuck: 0, br: 0, speed: 0,
    rig: null
  };
}

function makeGroup(kind) {
  const m = [];
  if (kind === 'familie') {
    m.push(person(R() < 0.25 ? 'board' : 'ski', false), person('ski', false));
    const kids = 1 + (R() < 0.5 ? 1 : 0);
    for (let i = 0; i < kids; i++) m.splice(1, 0, person('ski', true));
  } else if (kind === 'skischule') {
    m.push(person('ski', false, { Jacket: 0xd0141e, Sleeve: 0xb0101a, Pants: 0x111111, Helmet: 0xd0141e }));
    for (let i = 0, n = 4 + Math.floor(R() * 4); i < n; i++) m.push(person('ski', true, { Jacket: 0xff7a00, Sleeve: 0xff8c1a }));
  } else if (kind === 'paar') m.push(person(R() < 0.2 ? 'board' : 'ski', false), person(R() < 0.2 ? 'board' : 'ski', false));
  else if (kind === 'crew') for (let i = 0, n = 2 + (R() < 0.5 ? 1 : 0); i < n; i++) m.push(person('board', false));
  else m.push(person(kind === 'boarder' ? 'board' : 'ski', false));
  const gap = kind === 'skischule' ? 3.2 : kind === 'familie' ? 5 : 9;
  m.forEach((p, i) => p.lag = i * (gap + R() * 2));
  const k = KINDS[kind];
  return {
    kind, k, members: m, maxLag: m[m.length - 1].lag,
    lam: range(k.lam), amp: range(k.amp), c: (R() - 0.5) * 0.8, phi: R() * 6.28,
    v: 0, tuck: 0, vmax: k.v * (0.85 + R() * 0.3), s: 0, path: null, state: 'path', sec: null, cabs: null, pause: 0, pauseAt: -1
  };
}

function simpleGeometries() {
  const lean = g => g.applyMatrix4(new THREE.Matrix4().makeRotationX(0.18));
  return {
    jacket: lean(mergeGeometries([
      new THREE.BoxGeometry(0.4, 0.58, 0.26).translate(0, 1.12, 0),
      new THREE.BoxGeometry(0.11, 0.55, 0.12).translate(0.27, 1.08, 0.06),
      new THREE.BoxGeometry(0.11, 0.55, 0.12).translate(-0.27, 1.08, 0.06)
    ])),
    pants: lean(mergeGeometries([
      new THREE.BoxGeometry(0.15, 0.82, 0.17).translate(0.1, 0.42, 0),
      new THREE.BoxGeometry(0.15, 0.82, 0.17).translate(-0.1, 0.42, 0)
    ])),
    head: lean(new THREE.SphereGeometry(0.135, 10, 8).translate(0, 1.56, 0)),
    skis: mergeGeometries([
      new THREE.BoxGeometry(0.08, 0.03, 1.65).translate(0.11, 0.015, 0.05),
      new THREE.BoxGeometry(0.08, 0.03, 1.65).translate(-0.11, 0.015, 0.05)
    ]),
    board: new THREE.BoxGeometry(0.3, 0.035, 1.4).translate(0, 0.02, 0),
    carry: mergeGeometries([
      new THREE.BoxGeometry(0.08, 0.03, 1.65).translate(-0.04, 0, 0),
      new THREE.BoxGeometry(0.08, 0.03, 1.65).translate(0.04, 0.03, 0)
    ]).applyMatrix4(new THREE.Matrix4().makeRotationX(-0.75)).translate(0.24, 1.38, 0.05),
    carryB: new THREE.BoxGeometry(0.035, 1.3, 0.3).translate(0.32, 0.85, 0.02)
  };
}

export function createCrowd(terrain, pistes, lift, assets) {
  const group = new THREE.Group();
  const secs = lift.sections;

  const nodes = [];
  const nodeAt = (x, z, max) => {
    let best = -1, bd = max;
    nodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  const addNode = (x, z) => { let i = nodeAt(x, z, 60); if (i < 0) { i = nodes.push({ x, z, starts: [], lifts: [] }) - 1; } return i; };
  for (const sec of secs) { sec.na = addNode(...sec.a); sec.nb = addNode(...sec.b); nodes[sec.na].lifts.push(sec); }
  const runs = [];
  for (const p of pistes.list) {
    const a = nodeAt(...p.pts[0], 150), b = nodeAt(...p.pts[p.pts.length - 1], 150);
    if (a < 0 || b < 0 || a === b) continue;
    const r = { p, a, b, i0: lift.clear(p.pts) };
    runs.push(r);
    nodes[a].starts.push(r);
  }

  function choose(g, node, first) {
    const opts = [];
    for (const r of nodes[node].starts) if (!r.p.closed) opts.push({ r, w: (g.k.lv[r.p.level] ?? 1) * (first ? 1 : 0.5) + 0.02 });
    for (const sec of nodes[node].lifts) if (secs.includes(sec) && !lift.stop.has(sec.name)) opts.push({ sec, w: first ? 0.8 : 1.5 });
    if (!opts.length) return null;
    let t = R() * opts.reduce((a, o) => a + o.w, 0);
    for (const o of opts) if ((t -= o.w) <= 0) return o;
    return opts[opts.length - 1];
  }

  function buildLeg(g, x, z, node) {
    const pts = [[x, z]], segs = [];
    let cur = node, sec = null, walk = Infinity;
    const push = (px, pz) => { const l = pts[pts.length - 1]; if (Math.hypot(px - l[0], pz - l[1]) > 0.5) pts.push([px, pz]); };
    const len = () => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
    for (let n = 0; n < 6 && !sec; n++) {
      const o = choose(g, cur, n === 0);
      if (!o) break;
      if (o.sec) { sec = o.sec; break; }
      const P = o.r.p.pts;
      const s0 = len() + Math.hypot(P[o.r.i0][0] - pts[pts.length - 1][0], P[o.r.i0][1] - pts[pts.length - 1][1]);
      for (let i = o.r.i0; i < P.length; i++) push(...P[i]);
      segs.push({ s0, s1: len(), w: o.r.p.width / 2 - 3, p: o.r.p });
      cur = o.r.b;
    }
    if (!sec) sec = nodes[cur].lifts.find(x => secs.includes(x)) || secs[0];
    if (sec.qbig) {
      while (pts.length > 1 && Math.hypot(pts[pts.length - 1][0] - sec.a[0], pts[pts.length - 1][1] - sec.a[1]) < 32) pts.pop();
      const l = walk = len();
      for (let i = segs.length - 1; i >= 0; i--) if (segs[i].s0 >= l) segs.splice(i, 1); else segs[i].s1 = Math.min(segs[i].s1, l);
    }
    push(...(sec.qbig ? lanePt(sec, LANE_IN, 0) : sec.a));
    const cum = new Float32Array(pts.length), y = new Float32Array(pts.length);
    for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 0; i < pts.length; i++) y[i] = terrain.heightAt(pts[i][0], pts[i][1]);
    g.path = { pts, cum, y, len: cum[pts.length - 1], segs, walk };
    g.unclip = false;
    g.sec = sec;
    g.s = 0;
    g.v = 0;
    g.state = 'path';
    g.pause = 0;
    const first = segs[0];
    g.pauseAt = first && R() < g.k.pause ? first.s0 + (first.s1 - first.s0) * (0.2 + R() * 0.6) : -1;
  }

  const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  function segOf(path, s) {
    for (const sg of path.segs) if (s >= sg.s0 - 1 && s <= sg.s1 + 1) return sg;
    return null;
  }
  function center(path, s, out) {
    const { pts, cum, len } = path;
    s = Math.max(0, Math.min(len, s));
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const l = cum[hi] - cum[lo] || 1, t = (s - cum[lo]) / l;
    out.x = pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t;
    out.z = pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t;
    out.tx = (pts[hi][0] - pts[lo][0]) / l;
    out.tz = (pts[hi][1] - pts[lo][1]) / l;
    out.i = lo;
    out.t = t;
    return out;
  }
  const C = { x: 0, z: 0, tx: 0, tz: 0, i: 0, t: 0 };
  function at(g, m, s, out) {
    center(g.path, s, C);
    const sg = segOf(g.path, s);
    let o = 0;
    if (sg) {
      const f = smooth((s - sg.s0) / 30) * smooth((sg.s1 - s) / 30);
      o = g.c * Math.max(0, sg.w - g.amp) + g.amp * Math.sin(6.2832 * s / g.lam + g.phi) + m.jit * Math.sin(s * 0.21 + m.jph);
      o = f * Math.max(-sg.w, Math.min(sg.w, o));
    }
    out.x = C.x + C.tz * o;
    out.z = C.z - C.tx * o;
    return out;
  }

  function slope(g) {
    const p = g.path;
    center(p, g.s, C);
    const i = Math.min(C.i + 1, p.pts.length - 1), j = Math.min(i + 1, p.pts.length - 1);
    const d = p.cum[j] - p.cum[C.i];
    return d > 0 ? (p.y[C.i] - p.y[j]) / d : 0;
  }

  const taken = new Set();
  const key = (sec, i) => sec.name + '|' + i;
  function grabCabins(g, n, mid) {
    const sec = g.sec, list = [];
    const own = lift.rideCabin();
    for (let i = 0; i < sec.count; i++) {
      if (taken.has(key(sec, i)) || (own && own.sec === sec && own.i === i)) continue;
      const u = lift.cabinU(sec, i), p = (u + APEX) % sec.L;
      if (mid ? u > 30 && u < sec.upLen - 60 : sec.L - p > 3) list.push({ i, p, d: mid ? R() : sec.L - p });
    }
    list.sort((a, b) => a.d - b.d);
    if (list.length < n) return null;
    return list.slice(0, n).map(c => { taken.add(key(sec, c.i)); return { i: c.i, last: c.p, started: !!mid, done: false }; });
  }
  function release(g) {
    if (g.cabs) for (const c of g.cabs) taken.delete(key(g.sec, c.i));
    g.cabs = null;
  }

  function lanePt(sec, d, side, out) {
    const [al, sd, fa, fs] = laneAt(d, side, sec.qside?.a ?? 1), ox = -sec.dx, oz = -sec.dz;
    const p = [sec.a[0] + ox * al - oz * sd, sec.a[1] + oz * al + ox * sd];
    if (out) out.h = Math.atan2(ox * fa - oz * fs, oz * fa + ox * fs);
    return p;
  }
  const lines = new Map();
  function startWait(g) {
    g.state = 'wait';
    g.cabs = null;
    for (const m of g.members) m.show = false;
    if (!g.sec.qbig || g.off) return;
    g.state = 'queue';
    g.members.forEach((m, i) => { m.qd = LANE_IN + i * 1.2; m.qv = 0; m.qs = 1; });
    if (!lines.has(g.sec)) lines.set(g.sec, { q: [], t: 0 });
    lines.get(g.sec).q.push(g);
  }
  function stepLines(dt) {
    for (const [sec, L] of lines) {
      L.q = L.q.filter(g => g.state === 'queue' && g.sec === sec);
      L.t -= dt;
      let j = 0;
      for (const g of L.q) {
        if (g.off) { g.state = 'wait'; continue; }
        let ready = true;
        for (const m of g.members) {
          const t = rowD(j >> 1), gap = m.qd - t;
          m.qs = j & 1 ? 1 : -1;
          m.qv = gap > 0.05 ? Math.min(gap > 4 ? 1.3 : 0.4 + gap * 0.22, m.qv + dt * 1.2) : 0;
          m.qd = Math.max(t, m.qd - m.qv * dt);
          if (gap > 0.4) ready = false;
          j++;
        }
        if (g === L.q[0]) L.w = ready ? (L.w || 0) + dt : 0;
        if (g === L.q[0] && L.w > 2.5 && L.t <= 0 && !lift.stop.has(sec.name)) { startBoard(g); L.t = 3 + g.members.length * 0.8; L.w = 0; }
      }
    }
  }

  const loc = (sec, al, sd) => [sec.a[0] - sec.dx * al + sec.dz * sd, sec.a[1] - sec.dz * al - sec.dx * sd];
  function boardPath(sec, p0, side, row, seat) {
    const S = sec.qside?.a ?? 1, p1 = lanePt(sec, 0, side);
    const al = -(sec.dx * (p1[0] - sec.a[0]) + sec.dz * (p1[1] - sec.a[1]));
    const pts = [p0, p1, loc(sec, al, S * 5.8), loc(sec, 8.2, S * 2.6), loc(sec, 5.7 + row * 0.9, (seat - 1.5) * 0.75)];
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    return { pts, cum };
  }
  function startBoard(g) {
    const sec = g.sec;
    g.state = 'board';
    g.cabs = null;
    g.members.forEach((m, i) => {
      m.bp = boardPath(sec, lanePt(sec, m.qd, m.qs), m.qs, Math.floor(i / CAP), i % CAP);
      m.bd = 0;
    });
  }
  function boardAt(sec, m, out) {
    const { pts, cum } = m.bp, d = Math.min(m.bd, cum[cum.length - 1]);
    let k = 1;
    while (k < pts.length - 1 && cum[k] < d) k++;
    const l = cum[k] - cum[k - 1] || 1, t = Math.min(1, (d - cum[k - 1]) / l), [x0, z0] = pts[k - 1], [x1, z1] = pts[k];
    out.x = x0 + (x1 - x0) * t;
    out.z = z0 + (z1 - z0) * t;
    out.h = d >= cum[cum.length - 1] ? sec.heading : Math.atan2(x1 - x0, z1 - z0);
    const al = -(sec.dx * (out.x - sec.a[0]) + sec.dz * (out.z - sec.a[1])), sd = sec.dz * (out.x - sec.a[0]) - sec.dx * (out.z - sec.a[1]);
    out.y = Math.abs(sd) < 6.4 && al > -7 && al < 15 ? sec.pts[0].y - 5 : terrain.heightAt(out.x, out.z);
    return out;
  }

  function leaveLift(g) {
    const sec = g.sec;
    for (const m of g.members) m.bp = null;
    release(g);
    buildLeg(g, sec.b[0] + sec.dx * 4, sec.b[1] + sec.dz * 4, sec.nb);
  }

  const groups = [];
  for (const [kind, k] of Object.entries(KINDS)) for (let i = 0; i < k.n; i++) groups.push(makeGroup(kind));
  const members = groups.flatMap(g => g.members);
  for (const g of groups) {
    const sec = pick(secs);
    if (R() < 0.6) {
      buildLeg(g, sec.b[0], sec.b[1], sec.nb);
      g.s = R() * Math.max(0, g.path.len - g.maxLag - 40) + g.maxLag;
      g.v = g.vmax * 0.6;
      if (g.pauseAt < g.s) g.pauseAt = -1;
    } else {
      g.sec = sec;
      g.cabs = grabCabins(g, Math.ceil(g.members.length / CAP), true);
      if (g.cabs) g.state = 'ride';
      else { buildLeg(g, sec.b[0], sec.b[1], sec.nb); }
    }
  }

  groups.forEach(g => { g.rank = R(); });
  let density = 1;
  function setDensity(f) {
    density = Math.max(0, Math.min(1, f));
    for (const g of groups) g.off = g.rank >= density;
  }

  const sec0 = secs[0];
  const pulk = [];
  for (let i = 0; i < QMAX; i++) {
    const [al, sd, fa, fs] = queueSpot(i, sec0.qside?.a ?? 1), ox = -sec0.dx, oz = -sec0.dz, a = al + (R() - 0.5) * 0.15, d = sd + (R() - 0.5) * 0.2;
    const x = sec0.a[0] + ox * a - oz * d, z = sec0.a[1] + oz * a + ox * d;
    const p = person(R() < 0.2 ? 'board' : 'ski', R() < 0.2);
    p.pos.set(x, terrain.heightAt(x, z), z);
    p.heading = Math.atan2(ox * fa - oz * fs, oz * fa + ox * fs) + (R() - 0.5) * 0.4;
    pulk.push(p);
  }
  let queued = 0;
  const setQueue = n => { queued = Math.max(0, Math.min(QMAX, Math.round(n))); };
  const geo = simpleGeometries();
  const simpleMat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
  const ims = {};
  let capN = 0;
  function grow(n) {
    if (n <= capN) return;
    capN = Math.max(n, capN * 2);
    for (const k of Object.keys(geo)) {
      if (ims[k]) { group.remove(ims[k]); ims[k].dispose(); }
      const im = new THREE.InstancedMesh(geo[k], simpleMat, capN);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.setColorAt(0, new THREE.Color());
      im.instanceColor.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      im.castShadow = true;
      im.count = 0;
      ims[k] = im;
      group.add(im);
    }
  }
  grow(members.length + QMAX);

  const pool = { ski: [], board: [] };
  for (const type of ['ski', 'board']) for (let i = 0; i < POOL[type]; i++) {
    const model = type === 'ski' ? createSkier(assets.figure) : createBoarder(assets.figure);
    const holder = new THREE.Group();
    holder.add(model.object);
    holder.visible = false;
    group.add(holder);
    pool[type].push({ model, holder, who: null });
  }

  const UP = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const n = new THREE.Vector3(), qT = new THREE.Quaternion(), qY = new THREE.Quaternion(), qR = new THREE.Quaternion(), q = new THREE.Quaternion();
  const m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), v3 = new THREE.Vector3(), col = new THREE.Color();
  const A = { x: 0, z: 0 }, B = { x: 0, z: 0 }, M = { x: 0, z: 0 };

  function stepGroup(g, dt) {
    if (g.state !== 'path' && !secs.includes(g.sec)) { buildLeg(g, g.sec.a[0], g.sec.a[1], g.sec.na); g.s = g.maxLag; g.v = 0; return; }
    if (g.state === 'path') {
      const sg = segOf(g.path, g.s);
      let target = g.s > g.path.walk ? 1.3 : WALK;
      if (sg) {
        const gr = slope(g);
        target = g.vmax * Math.max(0.45, Math.min(1.25, 0.55 + gr * 3));
        if (sg.s1 - g.s < 50) target = Math.min(target, 3 + (sg.s1 - g.s) * 0.15);
        if (g.s - sg.s0 < 30) target = Math.min(target, 4 + (g.s - sg.s0) * 0.3);
        g.tuck = g.kind === 'racer' && gr < 0.3 && g.v > 11 ? 1 : g.kind === 'carver' ? 0.25 : 0.1;
      } else g.tuck = 0;
      if (g.pauseAt >= 0 && g.s >= g.pauseAt) { g.pause = 6 + R() * 8; g.pauseAt = -1; }
      if (!g.unclip && g.s >= g.path.walk) { g.unclip = true; g.pause = 3; }
      if (g.pause > 0) { g.pause -= dt; target = 0; }
      const acc = target > g.v ? 1.6 : 3.5;
      g.v += Math.max(-acc * dt, Math.min(acc * dt, target - g.v));
      g.s += g.v * dt;
      if (g.s - g.maxLag >= g.path.len) startWait(g);
    } else if (g.state === 'wait') {
      if (lift.stop.has(g.sec.name)) return;
      g.cabs = grabCabins(g, Math.ceil(g.members.length / CAP), false);
      if (g.cabs) g.state = 'ride';
    } else if (g.state === 'board') {
      let all = true;
      for (const m of g.members) { m.bd += 1.25 * dt; if (m.bd < m.bp.cum[m.bp.cum.length - 1]) all = false; }
      if (all && !lift.stop.has(g.sec.name)) {
        g.cabs = grabCabins(g, Math.ceil(g.members.length / CAP), false);
        if (g.cabs) g.state = 'ride';
      }
    } else if (g.state === 'ride') {
      let all = true;
      for (const c of g.cabs) {
        const u = (lift.cabinU(g.sec, c.i) + APEX) % g.sec.L;
        if (!c.started && u < c.last - g.sec.L * 0.5) c.started = true;
        if (c.started && u >= g.sec.upLen + APEX) c.done = true;
        c.last = u;
        if (!c.done) all = false;
      }
      if (all) leaveLift(g);
    }
  }

  function placeMember(g, m, dt) {
    m.show = false;
    if (g.off) return;
    if (g.state === 'queue') {
      const p = lanePt(g.sec, m.qd, m.qs, B);
      m.pos.set(p[0], terrain.heightAt(p[0], p[1]), p[1]);
      m.heading = B.h;
      m.speed = m.qv;
      m.lean = 0;
      m.tuck = 0;
      m.cab = 0;
      m.foot = true;
      m.br = 0;
      m.show = true;
      return;
    }
    if (g.state === 'board') {
      boardAt(g.sec, m, B);
      m.pos.set(B.x, B.y, B.z);
      m.heading = B.h;
      m.speed = m.bd < m.bp.cum[m.bp.cum.length - 1] ? 1.25 : 0;
      m.lean = 0;
      m.tuck = 0;
      m.cab = 0;
      m.foot = true;
      m.br = 0;
      m.show = true;
      return;
    }
    if (g.state === 'ride') {
      const c = g.cabs[Math.floor(g.members.indexOf(m) / CAP)];
      if (c.done || (!c.started && !m.bp)) return;
      lift.cabinAt(g.sec, c.i, v3);
      const k = g.members.indexOf(m) % CAP, [a, b] = SEATS[k], sec = g.sec;
      const sx = v3.x + sec.dx * a + sec.px * b * 0.6, sy = v3.y - 0.9, sz = v3.z + sec.dz * a + sec.pz * b * 0.6, sh = sec.heading + (b < 0 ? Math.PI / 2 : -Math.PI / 2);
      m.lean = 0;
      m.tuck = 0;
      m.br = 0;
      m.show = true;
      if (c.started) { m.pos.set(sx, sy, sz); m.heading = sh; m.cab = 1; return; }
      boardAt(sec, m, B);
      const t = Math.max(0, 1 - (sec.L - c.last) / 6);
      m.pos.set(B.x + (sx - B.x) * t, B.y + (sy - B.y) * t, B.z + (sz - B.z) * t);
      m.heading = t > 0 ? Math.atan2(sx - B.x, sz - B.z) : B.h;
      m.speed = t > 0 && t < 1 ? 1 : 0;
      m.cab = 0;
      m.foot = true;
      return;
    }
    if (g.state !== 'path') return;
    const s = g.s - m.lag;
    if (s < 0 || s > g.path.len) return;
    m.cab = 0;
    at(g, m, s, M);
    at(g, m, s + 1.5, B);
    at(g, m, s - 1.5, A);
    const dx = B.x - A.x, dz = B.z - A.z, dl = Math.hypot(dx, dz) || 1;
    const ax = (B.x + A.x - 2 * M.x) / 2.25, az = (B.z + A.z - 2 * M.z) / 2.25;
    const aLeft = (ax * dz - az * dx) / dl;
    const v = g.v;
    const leanT = segOf(g.path, s) ? Math.max(-0.8, Math.min(0.8, Math.atan(v * v * aLeft / 9.81))) * (m.type === 'board' ? 1.1 : 0.9) : 0;
    const k = 1 - Math.exp(-dt * 6);
    m.lean += (leanT - m.lean) * k;
    m.heading = Math.atan2(dx, dz);
    m.pos.set(M.x, terrain.heightAt(M.x, M.z), M.z);
    m.speed = v;
    const onPiste = !!segOf(g.path, s);
    m.foot = s > g.path.walk;
    m.tuck += ((m.kid ? 0 : g.tuck) - m.tuck) * k;
    const br = m.type === 'board' ? (g.pause > 0 || (onPiste && v < 2.5) ? 1 : 0) : onPiste ? m.brake + (g.pause > 0 ? 0.3 : 0) : 0;
    m.br += (br - m.br) * k;
    m.show = true;
  }

  function orient(m, out) {
    qY.setFromAxisAngle(UP, m.heading);
    if (m.cab || m.foot || m.d > 700) return out.copy(qY);
    qR.setFromAxisAngle(Z, -m.lean);
    terrain.normalAt(m.pos.x, m.pos.z, n);
    qT.setFromUnitVectors(UP, n);
    return out.copy(qT).multiply(qY).multiply(qR);
  }

  const act = [];
  function collide(state, onHit) {
    if (state.lift) return;
    for (const m of act) {
      if (m.cab) continue;
      const ex = state.pos.x - m.pos.x, ez = state.pos.z - m.pos.z;
      if (Math.abs(ex) > 3 || Math.abs(ez) > 3 || Math.abs(state.pos.y - m.pos.y) > 1.8) continue;
      const d = Math.hypot(ex, ez), r = 0.45 + 0.4 * m.scale;
      if (d >= r || d === 0) continue;
      const nx = ex / d, nz = ez / d;
      state.pos.x = m.pos.x + nx * r;
      state.pos.z = m.pos.z + nz * r;
      const sp = Math.min(m.speed, 25), vx = state.vel.x - Math.sin(m.heading) * sp, vz = state.vel.z - Math.cos(m.heading) * sp;
      const vn = vx * nx + vz * nz;
      if (vn >= 0) continue;
      state.vel.x -= nx * vn * 1.2;
      state.vel.z -= nz * vn * 1.2;
      if (-vn > 6 && state.crashed <= 0) {
        state.vel.multiplyScalar(0.2);
        state.crashed = 2;
        onHit?.(state, -vn);
        const g = groups.find(g => g.members.includes(m));
        if (g && g.state === 'path') g.pause = Math.max(g.pause, 4);
      }
    }
  }

  const folk = new Map(), paths = new Map(), tally = new Map(), qn = {};
  let source = null, frame = 0, fdt = 0;
  const vq = new Map(), qo = {}, arr = [], used = new Map();
  const secById = id => secs.find(s => s.id === id);
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function mul(a) {
    return () => {
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function guest(r) {
    const kid = r() < 0.18, m = person(r() < (kid ? 0.08 : 0.22) ? 'board' : 'ski', kid, {}, r);
    m.lane = r() * 2 - 1;
    m.lam = 20 + r() * 22;
    m.amp = 4 + r() * 6;
    m.phi = r() * 6.28;
    m.tk = !kid && r() < 0.15 ? 1 : r() * 0.3;
    return m;
  }
  function runPath(id) {
    if (paths.has(id)) return paths.get(id);
    const p = pistes.list.find(x => x.id === id);
    let P = null;
    if (p) {
      const pts = p.pts.slice(lift.clear(p.pts)), qs = secs.find(x => x.qbig);
      const n0 = pts.length;
      if (qs) while (pts.length > 2 && Math.hypot(pts[pts.length - 1][0] - qs.a[0], pts[pts.length - 1][1] - qs.a[1]) < 32) pts.pop();
      const cut = pts.length < n0;
      if (cut) pts.push(lanePt(qs, LANE_IN + 3, 0));
      if (pts.length > 1) {
        const cum = new Float32Array(pts.length);
        for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        P = { pts, cum, len: cum[pts.length - 1], w: Math.max(4, p.width / 2 - 3), walk: cut ? cum[pts.length - 2] : Infinity };
      }
    }
    paths.set(id, P);
    return P;
  }
  function onRun(P, m, s, out) {
    center(P, s, C);
    const f = smooth(s / 30) * smooth((P.len - s) / 30);
    let o = m.lane * Math.max(0, P.w - m.amp) * 0.8 + m.amp * Math.sin(6.2832 * s / m.lam + m.phi) + m.jit * Math.sin(s * 0.21 + m.jph);
    o = f * Math.max(-P.w, Math.min(P.w, o));
    out.x = C.x + C.tz * o;
    out.z = C.z - C.tx * o;
    return out;
  }
  function stand(m, heading, foot) {
    m.heading = heading;
    m.lean = 0;
    m.tuck = 0;
    m.br = 0;
    m.speed = 0;
    m.cab = 0;
    m.foot = foot;
  }
  function ground(m, x, z, y) { m.pos.set(x, y ?? terrain.heightAt(x, z), z); }
  function local(m, h, lx, lz, y) { ground(m, h.x + h.dz * lx + h.dx * lz, h.z - h.dx * lx + h.dz * lz, y); }
  function queueAt(m, sec, rev, rank) {
    const [al, sd, fa, fs] = queueSpot(rank, sec.qside?.[rev ? 'b' : 'a'] ?? 1, !rev && sec.qbig), ox = rev ? sec.dx : -sec.dx, oz = rev ? sec.dz : -sec.dz;
    const bx = rev ? sec.b[0] : sec.a[0], bz = rev ? sec.b[1] : sec.a[1], a = al + m.lane * 0.08, d = sd + Math.sin(m.jph) * 0.1;
    ground(m, bx + ox * a - oz * d, bz + oz * a + ox * d);
    stand(m, Math.atan2(ox * fa - oz * fs, oz * fa + ox * fs) + m.lane * 0.2, !rev && !!sec.qbig);
  }
  function place(m, kind, id, k, j, u, len, rank, src) {
    const e = Math.min(1, (len - j - u + src.frac) / len);
    if (kind === 'p') {
      const P = runPath(id);
      if (!P) return false;
      const d = e * P.len, v = P.len / len * src.pace;
      onRun(P, m, d, M);
      onRun(P, m, d + 1.5, B);
      onRun(P, m, d - 1.5, A);
      const dx = B.x - A.x, dz = B.z - A.z, dl = Math.hypot(dx, dz) || 1;
      const ax = (B.x + A.x - 2 * M.x) / 2.25, az = (B.z + A.z - 2 * M.z) / 2.25, vl = Math.min(v, 20);
      m.lean = Math.max(-0.8, Math.min(0.8, Math.atan(vl * vl * (ax * dz - az * dx) / dl / 9.81))) * (m.type === 'board' ? 1.1 : 0.9);
      m.heading = Math.atan2(dx, dz);
      ground(m, M.x, M.z);
      m.speed = v;
      m.cab = 0;
      m.foot = d > P.walk;
      m.qarr = P.walk < Infinity && d > P.walk - 2;
      m.tuck = m.kid || m.foot ? 0 : m.tk;
      m.br = m.type === 'board' ? 0.2 : m.brake;
      return true;
    }
    if (kind === 'q' || kind === 'hold') {
      const sec = secById(kind === 'hold' ? 'rossbach' : id.replace('~', ''));
      if (!sec) return false;
      if (kind === 'q') qn[id] = rank + 1;
      queueAt(m, sec, id.endsWith('~'), kind === 'hold' ? rank + (qn.rossbach || 0) : rank);
      return true;
    }
    if (kind === 'cash') {
      const sec = secById('rossbach');
      if (!sec) return false;
      const side = 16 + Math.floor(rank / 6) * 0.8, back = 4 + (rank % 6) * 0.7;
      ground(m, sec.a[0] - sec.dx * back - sec.px * side, sec.a[1] - sec.dz * back - sec.pz * side);
      stand(m, Math.atan2(sec.px, sec.pz), true);
      return true;
    }
    if (kind === 'r') {
      const sec = secById(id);
      if (!sec || !sec.count || (sec.qbig && e * sec.upLen < RIDE0)) return false;
      const step = sec.L / sec.count, i = ((Math.round((e * sec.upLen - sec.phase) / step) % sec.count) + sec.count) % sec.count;
      const t = tally.get(sec.id + i) || 0;
      tally.set(sec.id + i, t + 1);
      lift.cabinAt(sec, i, v3);
      const [a, b] = SEATS[t % 4], c = Math.floor(t / 4) % 2 ? 0.25 : 0;
      ground(m, v3.x + sec.dx * (a - Math.sign(a) * c) + sec.px * b * 0.6, v3.z + sec.dz * (a - Math.sign(a) * c) + sec.pz * b * 0.6, v3.y - 0.9 + 0.3 * Math.floor(t / 8));
      stand(m, sec.heading + (b < 0 ? Math.PI / 2 : -Math.PI / 2), true);
      m.cab = 1;
      return true;
    }
    const h = src.huts?.[id];
    if (!h) return false;
    if (kind === 'hq') {
      local(m, h, h.hw + 1.2 + (rank % 2) * 0.7, h.hl - 1 - Math.floor(rank / 2) * 0.8);
      stand(m, Math.atan2(h.dx, h.dz), true);
      return true;
    }
    const seat = ((k % 400) + 400) % 400, lz = h.hl + 0.7 + Math.floor(seat / 16) * 1.1;
    local(m, h, (seat % 16 - 7.5) * 0.9 + m.lane * 0.1, lz, lz < h.hl + 5.6 ? h.y + 0.8 : undefined);
    stand(m, Math.atan2(-h.dx, -h.dz) + m.lane * 0.6, true);
    return true;
  }
  function vline(sec) {
    let V = vq.get(sec);
    if (!V) vq.set(sec, V = { q: [], b: [], T: 0, c: 0, w: 0, t: 0, n: 0, f: true });
    return V;
  }
  function fromFlow(src) {
    frame++;
    tally.clear();
    for (const k in qn) qn[k] = 0;
    for (const sec of secs) if (sec.qbig) {
      const V = vline(sec), o = src.f.out?.['b:' + sec.id] || 0;
      if (qo[sec.id] != null && o > qo[sec.id]) V.c += o - qo[sec.id];
      qo[sec.id] = o;
    }
    for (const V of vq.values()) V.T = 0;
    each(src.f, (kind, id, k, j, u, len, rank) => {
      if (kind === 'q') {
        const sec = secById(id);
        if (sec?.qbig) { qn[id] = rank + 1; vline(sec).T++; return; }
      }
      const key = kind + id + '#' + k;
      let m = folk.get(key);
      if (!m) { m = guest(mul(hash(key))); folk.set(key, m); }
      m.seen = frame;
      m.show = place(m, kind, id, k, j, u, len, rank, src);
      if (m.show) act.push(m);
    });
    for (const [key, m] of folk) if (m.seen !== frame) { folk.delete(key); if (m.qarr) arr.push(m); }
    for (const [sec, V] of vq) stepV(sec, V, src);
    arr.length = 0;
  }
  function stepV(sec, V, src) {
    if (!secs.includes(sec)) { V.q.length = V.b.length = 0; return; }
    const run = !lift.stop.has(sec.name), k = Math.max(1, (src.pace || 0) * 60), dt = fdt * k;
    const pl = src.places?.(sec.id) || CAP, debt = pl * 60 / (src.gap?.(sec.id) || 10);
    if (!run) V.c = 0;
    V.c = Math.min(V.c, 40);
    const want = Math.max(0, Math.min(QV, V.T + Math.floor(V.c)));
    while (V.q.length > want) V.q.pop();
    while (V.q.length < want) {
      const j = V.q.length, t = rowD(j >> 1), qs = j & 1 ? 1 : -1, r = !V.f && arr.pop();
      const m = r || guest(mul(hash(sec.id + '/' + V.n++)));
      m.qd = V.f ? t : Math.max(t, LANE_IN + (r ? 3 : 1.5));
      m.qv = 0;
      m.qsv = r ? 0 : qs;
      m.qin = !!r;
      m.sc = 0;
      V.q.push(m);
    }
    V.f = false;
    let hall = 0;
    for (const g of V.b) if (!g.c?.st) hall += g.m.length;
    for (let j = 0; j < V.q.length; j++) {
      const m = V.q[j], t = rowD(j >> 1), gap = m.qd - t, qs = j & 1 ? 1 : -1;
      m.qv = gap > 0.05 ? Math.min(gap > 4 ? 1.3 : 0.4 + gap * 0.22, m.qv + dt * 1.2) : 0;
      m.qd = Math.max(t, m.qd - m.qv * dt);
      m.qsv += (qs - m.qsv) * Math.min(1, dt * 2.5);
      m.sc = j < 2 && gap < 0.3 ? (m.sc || 0) + dt : 0;
    }
    for (let j = 0; j < Math.min(2, V.q.length); j++) {
      const m = V.q[j];
      if (!run || m.sc < 1 || hall >= HALL || V.c - 1 < -debt) continue;
      V.q.splice(j--, 1);
      V.c--;
      hall++;
      let g = V.b[V.b.length - 1];
      if (!g || g.c || g.m.length >= pl) V.b.push(g = { m: [], c: null });
      const i = g.m.length;
      m.bp = boardPath(sec, lanePt(sec, m.qd, m.qsv), m.qsv, 3, 0);
      m.bd = 0;
      m.slot = -1;
      g.m.push(m);
    }
    let n = 0, f = true;
    for (const g of V.b) {
      g.f = !g.c && f;
      if (!g.c) f = false;
      if (!g.c?.st) for (const m of g.m) slot(sec, m, n++);
    }
    for (const m of V.q) {
      const p = lanePt(sec, m.qd, m.qsv, B), ex = p[0] - m.pos.x, ez = p[1] - m.pos.z, e = m.qin && Math.hypot(ex, ez) < 3 ? Math.min(1, dt * 8) : 1;
      m.qin = true;
      ground(m, m.pos.x + ex * e, m.pos.z + ez * e);
      stand(m, B.h + m.lane * 0.1, true);
      m.speed = m.qv * k;
      act.push(m);
    }
    for (let i = V.b.length - 1; i >= 0; i--) if (!stepB(sec, V.b[i], run, dt, k, pl)) V.b.splice(i, 1);
  }
  function slot(sec, m, n) {
    if (m.slot === n) return;
    m.slot = n;
    const { pts, cum } = m.bp, e = cum.length - 1, p = loc(sec, 5.7 + (n >> 2) * 0.8, ((n & 3) - 1.5) * 0.75);
    if (m.bd >= cum[e]) { pts.push(p); cum.push(cum[e] + Math.hypot(p[0] - pts[e][0], p[1] - pts[e][1])); }
    else { pts[e] = p; cum[e] = cum[e - 1] + Math.hypot(p[0] - pts[e - 1][0], p[1] - pts[e - 1][1]); }
  }
  function stepB(sec, g, run, dt, k, pl) {
    const L = sec.L;
    if (!g.c) {
      let all = true;
      for (const m of g.m) {
        const end = m.bp.cum[m.bp.cum.length - 1];
        m.bd = Math.min(m.bd + 1.25 * dt, end);
        if (m.bd < end) all = false;
        boardAt(sec, m, B);
        m.pos.set(B.x, B.y, B.z);
        stand(m, B.h, true);
        m.speed = m.bd < end ? 1.25 * k : 0;
        act.push(m);
      }
      if (all && run && g.f && sec.count) {
        const own = lift.rideCabin(), win = Math.max(6, sec.speed * 0.8);
        let best = -1, bd = Infinity;
        for (let i = 0; i < sec.count; i++) {
          if ((used.get(key(sec, i)) || 0) + g.m.length > pl || (own && own.sec === sec && own.i === i)) continue;
          const d = L - (lift.cabinU(sec, i) + APEX) % L;
          if (d > win && d < bd) { bd = d; best = i; }
        }
        if (best >= 0) { const n = used.get(key(sec, best)) || 0; used.set(key(sec, best), n + g.m.length); g.c = { i: best, s: n, last: (lift.cabinU(sec, best) + APEX) % L, st: false }; }
      }
      return true;
    }
    const c = g.c, p = (lift.cabinU(sec, c.i) + APEX) % L;
    if (!c.st && p < c.last - L * 0.5) c.st = true;
    c.last = p;
    if (c.st && p - APEX >= RIDE0) { const n = (used.get(key(sec, c.i)) || 0) - g.m.length; if (n > 0) used.set(key(sec, c.i), n); else used.delete(key(sec, c.i)); return false; }
    lift.cabinAt(sec, c.i, v3);
    const t = Math.max(0, 1 - (L - p) / Math.max(6, sec.speed * 0.8));
    g.m.forEach((m, j) => {
      const q = c.s + j, [a, b] = SEATS[q & 3], o = q >> 2 ? 0.25 : 0, sx = v3.x + sec.dx * (a - Math.sign(a) * o) + sec.px * b * 0.6, sy = v3.y - 0.9, sz = v3.z + sec.dz * (a - Math.sign(a) * o) + sec.pz * b * 0.6;
      if (c.st) { m.pos.set(sx, sy, sz); stand(m, sec.heading + (b < 0 ? Math.PI / 2 : -Math.PI / 2), true); m.cab = 1; }
      else {
        boardAt(sec, m, B);
        m.pos.set(B.x + (sx - B.x) * t, B.y + (sy - B.y) * t, B.z + (sz - B.z) * t);
        stand(m, t > 0 ? Math.atan2(sx - B.x, sz - B.z) : B.h, true);
        m.speed = t > 0 && t < 1 ? 1 : 0;
      }
      act.push(m);
    });
    return true;
  }

  const near = [];
  function update(dt, camera) {
    const src = source?.();
    act.length = 0;
    fdt = Math.min(dt, 0.1);
    if (src) fromFlow(src);
    else {
      for (const g of groups) stepGroup(g, dt);
      stepLines(dt);
      for (const g of groups) for (const m of g.members) { placeMember(g, m, dt); if (m.show) act.push(m); }
      for (let i = 0; i < queued; i++) { pulk[i].foot = true; act.push(pulk[i]); }
    }
    if (extra) for (const m of extra()) act.push(m);
    grow(act.length);

    const cx = camera.position.x, cz = camera.position.z;
    near.length = 0;
    for (const m of act) {
      m.d = Math.hypot(m.pos.x - cx, m.pos.z - cz);
      if (m.d < NEAR && !m.cab && !m.foot) near.push(m);
    }
    near.sort((a, b) => a.d - b.d);
    for (const type of ['ski', 'board']) {
      const want = near.filter(m => m.type === type).slice(0, POOL[type]);
      for (const slot of pool[type]) if (slot.who && !want.includes(slot.who)) { slot.who.rig = null; slot.who = null; }
      for (const m of want) {
        if (m.rig) continue;
        const slot = pool[type].find(s => !s.who);
        slot.who = m;
        m.rig = slot;
        slot.model.dress(m.look);
      }
      for (const slot of pool[type]) {
        const m = slot.who;
        slot.holder.visible = !!m;
        if (!m) continue;
        slot.model.pose({ ctrl: true, tuck: m.tuck, brake: m.br, lean: m.lean, fakie: false });
        slot.holder.position.copy(m.pos);
        orient(m, slot.holder.quaternion);
        slot.holder.scale.setScalar(m.scale);
      }
    }

    const cnt = { jacket: 0, pants: 0, head: 0, skis: 0, board: 0, carry: 0, carryB: 0 };
    const put = (k, c) => { const im = ims[k], i = cnt[k]++; im.setMatrixAt(i, m4); im.setColorAt(i, col.setHex(c)); };
    for (const m of act) {
      if (m.rig || m.d > FAR) continue;
      orient(m, q);
      sc.setScalar(m.scale * (m.d > 700 ? 1.3 : 1));
      if (m.type === 'board' && !m.cab && !m.foot) {
        m4.compose(m.pos, q, sc);
        put('board', m.look.Gear);
        qY.setFromAxisAngle(UP, -Math.PI / 2);
        q.multiply(qY);
      }
      m4.compose(m.pos, q, sc);
      put('jacket', m.look.Jacket);
      put('pants', m.look.Pants);
      put('head', m.look.Helmet);
      if (m.type === 'ski' && !m.cab && !m.foot) put('skis', m.look.Gear);
      if (m.foot && !m.cab) put(m.type === 'board' ? 'carryB' : 'carry', m.look.Gear);
    }
    for (const k in ims) {
      const im = ims[k];
      im.count = cnt[k];
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor.needsUpdate = true;
    }
  }

  function link(sec) {
    if (sec.tunnel || sec.na != null) return;
    sec.na = addNode(...sec.a);
    sec.nb = addNode(...sec.b);
    nodes[sec.na].lifts.push(sec);
    for (const p of pistes.list) {
      if (runs.some(r => r.p === p)) continue;
      const a = nodeAt(...p.pts[0], 220), b = nodeAt(...p.pts[p.pts.length - 1], 220);
      if (a < 0 || b < 0 || a === b) continue;
      const r = { p, a, b, i0: 0 };
      runs.push(r);
      nodes[a].starts.push(r);
    }
    for (const r of runs) r.i0 = lift.clear(r.p.pts);
    paths.clear();
    let n = 0;
    for (const g of groups) {
      if (n >= 8 || g.state !== 'path' || R() > 0.3) continue;
      buildLeg(g, sec.b[0], sec.b[1], sec.nb);
      g.s = g.maxLag;
      g.v = g.vmax * 0.6;
      g.pauseAt = -1;
      n++;
    }
  }

  let extra = null;
  const make = s => { const m = guest(mul(s >>> 0)); m.foot = true; return m; };
  return { group, update, collide, setDensity, setQueue, link, make, setExtra: fn => { extra = fn; }, setSource: fn => { source = fn; }, get count() { return source ? act.length : members.length; } };
}
