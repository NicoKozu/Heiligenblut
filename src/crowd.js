import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSkier, createBoarder } from './models.js';

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
const QMAX = 140;
const SEATS = [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]];

const R = Math.random;
const pick = a => a[Math.floor(R() * a.length)];
const range = ([a, b]) => a + R() * (b - a);
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

function person(type, kid, extra = {}) {
  const j = pick(JACKETS);
  return {
    type, kid,
    scale: kid ? 0.58 + R() * 0.17 : 0.93 + R() * 0.12,
    look: { Jacket: j, Sleeve: shade(j, 0.85), Pants: pick(PANTS), Boots: 0x303438, Gloves: 0x1a1a1a, Helmet: pick(HELMETS), Gear: pick(GEAR), ...extra },
    brake: kid && type === 'ski' ? 0.55 + R() * 0.3 : 0,
    jit: kid ? 1 + R() * 1.5 : 0.3,
    jph: R() * 6.28,
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
    board: new THREE.BoxGeometry(0.3, 0.035, 1.4).translate(0, 0.02, 0)
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
    let cur = node, sec = null;
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
    push(...sec.a);
    const cum = new Float32Array(pts.length), y = new Float32Array(pts.length);
    for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 0; i < pts.length; i++) y[i] = terrain.heightAt(pts[i][0], pts[i][1]);
    g.path = { pts, cum, y, len: cum[pts.length - 1], segs };
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
      const u = lift.cabinU(sec, i);
      if (mid ? u > 30 && u < sec.upLen - 60 : true) list.push({ i, u, d: mid ? R() : sec.L - u });
    }
    list.sort((a, b) => a.d - b.d);
    if (list.length < n) return null;
    return list.slice(0, n).map(c => { taken.add(key(sec, c.i)); return { i: c.i, last: c.u, started: !!mid, done: false }; });
  }
  function release(g) {
    if (g.cabs) for (const c of g.cabs) taken.delete(key(g.sec, c.i));
    g.cabs = null;
  }

  function startWait(g) {
    g.state = 'wait';
    g.cabs = null;
    for (const m of g.members) m.show = false;
  }

  function leaveLift(g) {
    const sec = g.sec;
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
    const row = Math.floor(i / 10), col = i % 10;
    const back = 16.5 + row * 0.8 + R() * 0.3, side = (col - 4.5) * 0.7 + (R() - 0.5) * 0.35;
    const x = sec0.a[0] - sec0.dx * back + sec0.px * side, z = sec0.a[1] - sec0.dz * back + sec0.pz * side;
    const p = person(R() < 0.2 ? 'board' : 'ski', R() < 0.2);
    p.pos.set(x, terrain.heightAt(x, z), z);
    p.heading = sec0.heading + (R() - 0.5) * 0.8;
    pulk.push(p);
  }
  let queued = 0;
  const setQueue = n => { queued = Math.max(0, Math.min(QMAX, Math.round(n))); };
  const geo = simpleGeometries();
  const simpleMat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
  const ims = {};
  for (const k of Object.keys(geo)) {
    const im = new THREE.InstancedMesh(geo[k], simpleMat, members.length + QMAX);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.setColorAt(0, new THREE.Color());
    im.instanceColor.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    im.castShadow = true;
    im.count = 0;
    ims[k] = im;
    group.add(im);
  }

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
      let target = WALK;
      if (sg) {
        const gr = slope(g);
        target = g.vmax * Math.max(0.45, Math.min(1.25, 0.55 + gr * 3));
        if (sg.s1 - g.s < 50) target = Math.min(target, 3 + (sg.s1 - g.s) * 0.15);
        if (g.s - sg.s0 < 30) target = Math.min(target, 4 + (g.s - sg.s0) * 0.3);
        g.tuck = g.kind === 'racer' && gr < 0.3 && g.v > 11 ? 1 : g.kind === 'carver' ? 0.25 : 0.1;
      } else g.tuck = 0;
      if (g.pauseAt >= 0 && g.s >= g.pauseAt) { g.pause = 6 + R() * 8; g.pauseAt = -1; }
      if (g.pause > 0) { g.pause -= dt; target = 0; }
      const acc = target > g.v ? 1.6 : 3.5;
      g.v += Math.max(-acc * dt, Math.min(acc * dt, target - g.v));
      g.s += g.v * dt;
      if (g.s - g.maxLag >= g.path.len) startWait(g);
    } else if (g.state === 'wait') {
      if (lift.stop.has(g.sec.name)) return;
      g.cabs = grabCabins(g, Math.ceil(g.members.length / CAP), false);
      if (g.cabs) g.state = 'ride';
    } else if (g.state === 'ride') {
      let all = true;
      for (const c of g.cabs) {
        const u = lift.cabinU(g.sec, c.i);
        if (!c.started && u < c.last - g.sec.L * 0.5) c.started = true;
        if (c.started && u >= g.sec.upLen) c.done = true;
        c.last = u;
        if (!c.done) all = false;
      }
      if (all) leaveLift(g);
    }
  }

  function placeMember(g, m, dt) {
    m.show = false;
    if (g.off) return;
    if (g.state === 'ride') {
      const c = g.cabs[Math.floor(g.members.indexOf(m) / CAP)];
      if (!c.started || c.done) return;
      lift.cabinAt(g.sec, c.i, v3);
      const k = g.members.indexOf(m) % CAP, [a, b] = SEATS[k], sec = g.sec;
      m.pos.set(v3.x + sec.dx * a + sec.px * b * 0.6, v3.y - 0.9, v3.z + sec.dz * a + sec.pz * b * 0.6);
      m.heading = sec.heading + (b < 0 ? Math.PI / 2 : -Math.PI / 2);
      m.lean = 0;
      m.cab = 1;
      m.show = true;
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
    m.tuck += ((m.kid ? 0 : g.tuck) - m.tuck) * k;
    const br = m.type === 'board' ? (g.pause > 0 || (onPiste && v < 2.5) ? 1 : 0) : onPiste ? m.brake + (g.pause > 0 ? 0.3 : 0) : 0;
    m.br += (br - m.br) * k;
    m.show = true;
  }

  function orient(m, out) {
    qY.setFromAxisAngle(UP, m.heading);
    qR.setFromAxisAngle(Z, -m.lean);
    if (m.cab) return out.copy(qY);
    terrain.normalAt(m.pos.x, m.pos.z, n);
    qT.setFromUnitVectors(UP, n);
    return out.copy(qT).multiply(qY).multiply(qR);
  }

  function collide(state, onHit) {
    if (state.lift) return;
    for (const m of members) {
      if (!m.show || m.cab) continue;
      const ex = state.pos.x - m.pos.x, ez = state.pos.z - m.pos.z;
      if (Math.abs(state.pos.y - m.pos.y) > 1.8) continue;
      const d = Math.hypot(ex, ez), r = 0.45 + 0.4 * m.scale;
      if (d >= r || d === 0) continue;
      const nx = ex / d, nz = ez / d;
      state.pos.x = m.pos.x + nx * r;
      state.pos.z = m.pos.z + nz * r;
      const vx = state.vel.x - Math.sin(m.heading) * m.speed, vz = state.vel.z - Math.cos(m.heading) * m.speed;
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

  const near = [];
  function update(dt, camera) {
    for (const g of groups) stepGroup(g, dt);
    for (const g of groups) for (const m of g.members) placeMember(g, m, dt);

    const cx = camera.position.x, cz = camera.position.z;
    near.length = 0;
    for (const m of members) {
      m.d = m.show ? Math.hypot(m.pos.x - cx, m.pos.z - cz) : Infinity;
      if (m.d < NEAR && !m.cab) near.push(m);
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

    const cnt = { jacket: 0, pants: 0, head: 0, skis: 0, board: 0 };
    const put = (k, c) => { const im = ims[k], i = cnt[k]++; im.setMatrixAt(i, m4); im.setColorAt(i, col.setHex(c)); };
    for (const m of members) {
      if (!m.show || m.rig || m.d > FAR) continue;
      orient(m, q);
      sc.setScalar(m.scale * (m.d > 700 ? 1.3 : 1));
      if (m.type === 'board' && !m.cab) {
        m4.compose(m.pos, q, sc);
        put('board', m.look.Gear);
        qY.setFromAxisAngle(UP, -Math.PI / 2);
        q.multiply(qY);
      }
      m4.compose(m.pos, q, sc);
      put('jacket', m.look.Jacket);
      put('pants', m.look.Pants);
      put('head', m.look.Helmet);
      if (m.type === 'ski' && !m.cab) put('skis', m.look.Gear);
    }
    for (let i = 0; i < queued; i++) {
      const p = pulk[i];
      if (Math.hypot(p.pos.x - cx, p.pos.z - cz) > FAR) break;
      qY.setFromAxisAngle(UP, p.heading);
      sc.setScalar(p.scale);
      m4.compose(p.pos, qY, sc);
      put('jacket', p.look.Jacket);
      put('pants', p.look.Pants);
      put('head', p.look.Helmet);
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

  return { group, update, collide, setDensity, setQueue, link, count: members.length };
}
