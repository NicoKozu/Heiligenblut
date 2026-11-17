import * as THREE from 'three';

const CH = 600;
const BC = 64;
const RC = 16;
const FLOOR = 2.9;

function rng(s) {
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hash(i, j) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}

function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v;
}

function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

function obb(p) {
  let best = null, ar = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    ar += a[0] * b[1] - b[0] * a[1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.5) continue;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const q of p) {
      const u = q[0] * ux + q[1] * uz, v = -q[0] * uz + q[1] * ux;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const A = (u1 - u0) * (v1 - v0);
    if (!best || A < best.A) best = { A, ux, uz, u0, u1, v0, v1 };
  }
  const { ux, uz, u0, u1, v0, v1, A } = best;
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const x = cu * ux - cv * uz, z = cu * uz + cv * ux;
  const du = u1 - u0, dv = v1 - v0, s = Math.sqrt(THREE.MathUtils.clamp(Math.abs(ar / 2) / A / 0.92, 0.55, 1));
  const [l, w, dx, dz] = du >= dv ? [du, dv, ux, uz] : [dv, du, -uz, ux];
  return { x, z, l: l * s, w: w * s, r: Math.atan2(dx, dz), dx, dz };
}

function rockGeo(seed, detail) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position, r = rng(seed), k = [r() * 9, r() * 9, r() * 9], v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 2.1 + k[0]) * Math.sin(v.y * 2.7 + k[1]) * Math.sin(v.z * 1.9 + k[2]);
    const m = 0.78 + 0.32 * n + 0.08 * Math.sin(v.x * 7 + v.z * 5 + k[0]);
    v.multiplyScalar(m);
    if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.4;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function prismGeo() {
  const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
}

function snowMat(lo, hi, flat, noise) {
  const m = new THREE.MeshLambertMaterial({ flatShading: flat });
  m.onBeforeCompile = s => {
    s.vertexShader = 'varying float vSnow;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec3 wn = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  #else
  vec3 wn = normalize(mat3(modelMatrix) * objectNormal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  #endif
  float nz = ${noise ? 'sin(wp.x * 1.7 + sin(wp.z * 1.3)) * sin(wp.z * 2.1 + wp.y * 0.9) * 0.18' : '0.0'};
  vSnow = smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, wn.y + nz);`);
    s.fragmentShader = 'varying float vSnow;\n' + s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.95, 1.0), vSnow);`);
  };
  m.customProgramCacheKey = () => 'psnow' + lo + hi + flat + noise;
  return m;
}

const COL = {};
const col = h => COL[h] ||= new THREE.Color(h);

export function createProps(terrain, pistes, lift, osm) {
  const group = new THREE.Group();
  const all = [...lift.sections, ...(lift.planned || [])], ropes = all.filter(s => !s.tunnel);
  const stations = all.flatMap(s => [s.a, s.b]);
  const pisteD = (x, z) => { const q = pistes.nearest(x, z, 120); return q ? q.d - q.p.width / 2 : 1e9; };
  const liftD = (x, z) => Math.min(...ropes.map(s => segDist(x, z, s.a, s.b)));
  const { originX, originZ, nx, nz, cell } = terrain.meta;
  const W = (nx - 1) * cell, D = (nz - 1) * cell;

  let blds = [];
  const bgrid = new Map();
  const n = new THREE.Vector3();
  for (const [c, h, p] of osm.b) {
    const o = obb(p);
    const r = Math.max(o.l, o.w) / 2;
    if (stations.some(s => Math.hypot(s[0] - o.x, s[1] - o.z) < 45 + r)) continue;
    if (pisteD(o.x, o.z) < r + 2 || liftD(o.x, o.z) < r + 8) continue;
    let lo = Infinity, hi = -Infinity;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      const y = terrain.heightAt(o.x + (sx * o.w * o.dz + sz * o.l * o.dx) / 2, o.z + (-sx * o.w * o.dx + sz * o.l * o.dz) / 2);
      lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
    blds.push({ ...o, c, h, lo, hi, rad: Math.hypot(o.l, o.w) / 2 });
  }
  const tower = blds.find(b => b.c === 'c');
  if (tower) {
    const t = blds.find(b => b !== tower && b.c === 'k' && Math.hypot(b.x - tower.x, b.z - tower.z) < 30);
    if (t) t.c = 't';
  }
  const index = () => {
    bgrid.clear();
    blds.forEach((b, i) => {
      for (let a = Math.floor((b.x - b.rad) / BC); a <= Math.floor((b.x + b.rad) / BC); a++)
        for (let c = Math.floor((b.z - b.rad) / BC); c <= Math.floor((b.z + b.rad) / BC); c++) {
          const k = a * 65536 + c;
          if (!bgrid.has(k)) bgrid.set(k, []);
          bgrid.get(k).push(i);
        }
    });
  };
  index();

  function blocked(x, z, m) {
    const list = bgrid.get(Math.floor(x / BC) * 65536 + Math.floor(z / BC));
    if (!list) return false;
    for (const i of list) {
      const b = blds[i], ex = x - b.x, ez = z - b.z;
      if (Math.abs(ex * b.dx + ez * b.dz) < b.l / 2 + m && Math.abs(-ex * b.dz + ez * b.dx) < b.w / 2 + m) return true;
    }
    return false;
  }

  const chunks = new Map();
  const cx = Math.ceil(W / CH);
  const chunk = (x, z) => {
    const k = Math.floor((x - originX) / CH) + Math.floor((z - originZ) / CH) * cx;
    if (!chunks.has(k)) chunks.set(k, { k, center: new THREE.Vector2(originX + (k % cx + 0.5) * CH, originZ + (Math.floor(k / cx) + 0.5) * CH), body: { lists: {} }, big: { lists: {} }, detail: { lists: {} }, small: { lists: {} } });
    return chunks.get(k);
  };
  const E = new THREE.Euler(0, 0, 0, 'YXZ'), Q = new THREE.Quaternion(), M = new THREE.Matrix4(), P = new THREE.Vector3(), S = new THREE.Vector3();
  function emit(ch, kind, color) {
    const l = ch.lists[kind] ||= [];
    for (let i = 0; i < 16; i++) l.push(M.elements[i]);
    const c = col(color);
    l.push(c.r, c.g, c.b);
  }
  function put(ch, kind, f, lx, ly, lz, sx, sy, sz, color, rx = 0, rz = 0, ry = 0) {
    E.set(rx, f.r + ry, rz);
    M.compose(P.set(f.x + lx * f.c + lz * f.s, f.y + ly, f.z - lx * f.s + lz * f.c), Q.setFromEuler(E), S.set(sx, sy, sz));
    emit(ch, kind, color);
  }

  function windows(ch, f, w, l, y0, levels, frame, both) {
    for (let i = 0; i < levels; i++) {
      const y = y0 + i * FLOOR + 1.55;
      for (const s of [-1, 1]) {
        const nl = Math.max(1, Math.floor((l - 1.5) / 2.9));
        for (let j = 0; j < nl; j++) {
          const z = -l / 2 + (j + 0.5) * l / nl;
          put(ch, 'box', f, s * (w / 2 + 0.02), y, z, 0.1, 1.45, 1.15, frame);
          put(ch, 'box', f, s * (w / 2 + 0.06), y, z, 0.08, 1.2, 0.9, 0x232c36);
        }
        if (!both) continue;
        const nw = Math.max(1, Math.floor((w - 1.5) / 2.9));
        for (let j = 0; j < nw; j++) {
          const x = -w / 2 + (j + 0.5) * w / nw;
          put(ch, 'box', f, x, y, s * (l / 2 + 0.02), 1.15, 1.45, 0.1, frame);
          put(ch, 'box', f, x, y, s * (l / 2 + 0.06), 0.9, 1.2, 0.08, 0x232c36);
        }
      }
    }
  }

  function roof(ch, f, w, l, top, pitch, color, ov, wall) {
    const rh = w / 2 * Math.tan(pitch), e = w / 2 + ov, span = e / Math.cos(pitch);
    put(ch, 'prism', f, 0, top, 0, w, rh, l, wall);
    for (const s of [-1, 1]) {
      const cxr = s * (e / 2), cy = top + rh - e / 2 * Math.tan(pitch) + 0.2;
      put(ch, 'box', f, cxr, cy, 0, span, 0.32, l + ov * 1.6, color, 0, -s * pitch);
    }
    return rh;
  }

  function building(b) {
    const ch = chunk(b.x, b.z), r = rng(Math.round(b.x * 7 + b.z * 13));
    const f = { x: b.x, z: b.z, y: b.hi + 0.25, r: b.r, c: Math.cos(b.r), s: Math.sin(b.r) };
    const { w, l } = b;
    const base = b.lo - 1.5 - f.y;
    const plinth = (pw, pl, top) => put(ch.body, 'box', f, 0, (base + top) / 2, 0, pw, top - base, pl, 0x8f8a82);
    const B = ch.body, Dt = ch.detail;
    if (b.c === 't') {
      plinth(w + 0.4, l + 0.4, 1);
      const s = Math.max(w, l) * 0.85, th = 27;
      put(B, 'box', f, 0, th / 2, 0, s, th, s, 0xeee9df);
      put(B, 'box', f, 0, th + 0.25, 0, s + 0.4, 0.5, s + 0.4, 0xd8d2c6);
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2, sx = Math.sin(a), sz = Math.cos(a);
        put(Dt, 'box', f, sx * (s / 2 + 0.05), th - 4, sz * (s / 2 + 0.05), 1.6, 1.6, 1.6, 0x2b3038, 0, 0, a);
        put(Dt, 'box', f, sx * (s / 2 + 0.1), th - 4, sz * (s / 2 + 0.1), 1.2, 1.2, 1.2, 0xc9a54a, 0, 0, a);
        put(Dt, 'box', f, sx * (s / 2 + 0.05), th - 8.5, sz * (s / 2 + 0.05), 0.9, 2.6, 0.9, 0x232c36, 0, 0, a);
      }
      put(B, 'pyr', f, 0, th + 0.5, 0, s * 0.95, 30, s * 0.95, 0x3b4140);
      put(Dt, 'box', f, 0, th + 31.5, 0, 0.12, 2.6, 0.12, 0xc9a54a);
      put(Dt, 'box', f, 0, th + 32.2, 0, 1.2, 0.12, 0.12, 0xc9a54a);
      return;
    }
    if (b.c === 'c' || b.c === 'k') {
      const church = b.c === 'c', hw = church ? Math.min(b.h, 13) : Math.min(b.h, 4.5);
      plinth(w + 0.4, l + 0.4, 0.6);
      put(B, 'box', f, 0, hw / 2, 0, w, hw, l, 0xf1ece2);
      const rh = roof(B, f, w, l, hw, church ? 0.9 : 0.8, church ? 0x3b4140 : 0x4a3a32, 0.6, 0xf1ece2);
      const n = Math.max(1, Math.floor(l / (church ? 5 : 3.5)));
      for (const s of [-1, 1]) for (let j = 0; j < n; j++) {
        const z = -l / 2 + (j + 0.5) * l / n;
        put(Dt, 'box', f, s * (w / 2 + 0.04), hw * 0.55, z, 0.1, church ? 5 : 1.6, church ? 1.3 : 0.8, 0x2a3442);
      }
      put(Dt, 'box', f, 0, 1.3, l / 2 + 0.05, 1.4, 2.6, 0.12, 0x4a2f1c);
      if (!church) {
        put(B, 'box', f, 0, hw + rh + 0.4, l * 0.3, 1, 1.6, 1, 0xf1ece2);
        put(B, 'pyr', f, 0, hw + rh + 1.2, l * 0.3, 1.3, 2.4, 1.3, 0x3b4140);
      } else if (!blds.some(t => t.c === 't')) {
        f.x += f.s * (l / 2 + 3); f.z += f.c * (l / 2 + 3);
        building({ ...b, c: 't', x: f.x, z: f.z, w: 6, l: 6 });
      }
      return;
    }
    const wood = b.c === 'w';
    const big = w * l > 450;
    const hw = wood ? Math.min(b.h, 4) : b.h;
    const levels = Math.max(1, Math.round(hw / FLOOR));
    const wallW = wood ? [0x5e3f28, 0x6b5544, 0x553a26, 0x7a6450][Math.floor(r() * 4)] : 0xebe6dc;
    const woodC = [0x7a4f2e, 0x6e4526, 0x84582f][Math.floor(r() * 3)];
    const roofC = wood ? 0x4a3b33 : [0x3b3430, 0x5a2e24, 0x44403c, 0x3e3a36][Math.floor(r() * 4)];
    plinth(w + 0.3, l + 0.3, wood ? 0.3 : 0.6);
    if (wood || big || levels < 2) put(B, 'box', f, 0, hw / 2, 0, w, hw, l, wallW);
    else {
      const g = FLOOR + 0.2;
      put(B, 'box', f, 0, g / 2, 0, w, g, l, wallW);
      put(B, 'box', f, 0, g + (hw - g) / 2, 0, w + 0.12, hw - g, l + 0.12, woodC);
    }
    const pitch = wood ? 0.42 : big ? 0.38 : 0.45;
    const rh = roof(B, f, w, l, hw, pitch, roofC, wood ? 0.6 : 1.2, wood ? wallW : woodC);
    if (!wood && w * l > 60) {
      const sx = (r() - 0.5) * w * 0.4, sz = (r() - 0.5) * l * 0.5, cy = hw + rh * (1 - Math.abs(sx) / (w / 2)) + 0.6;
      put(B, 'box', f, sx, cy, sz, 0.7, 2, 0.7, 0xd9d3c8);
      put(B, 'box', f, sx, cy + 1.05, sz, 0.95, 0.12, 0.95, 0x3b3430);
    }
    if (wood) {
      put(Dt, 'box', f, 0, 1.1, l / 2 + 0.05, Math.min(2.6, w * 0.5), 2.2, 0.1, 0x3a2617);
      if (w * l > 50) put(Dt, 'box', f, w / 2 + 0.05, 1.4, 0, 0.1, 0.7, 0.9, 0x232c36);
      return;
    }
    windows(Dt, f, w, l, 0, levels, 0xf4f0e8, true);
    const ends = big ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[0, 1], [0, -1]];
    for (let i = 1; i < levels; i++) for (const [ax, az] of ends) {
      const y = i * FLOOR + 0.1, len = (az ? w : l) * 0.86;
      const ox = ax * (w / 2 + 0.65), oz = az * (l / 2 + 0.65), ry = az ? 0 : Math.PI / 2;
      put(Dt, 'box', f, ox, y, oz, len, 0.18, 1.3, woodC, 0, 0, ry);
      put(Dt, 'box', f, ox * (1 + 0.6 / Math.max(1, Math.abs(ox))), y + 0.55, oz * (1 + 0.6 / Math.max(1, Math.abs(oz))), len, 0.95, 0.07, woodC, 0, 0, ry);
      if (r() < 0.6) put(Dt, 'box', f, ox * (1 + 0.68 / Math.max(1, Math.abs(ox))), y + 1.0, oz * (1 + 0.68 / Math.max(1, Math.abs(oz))), len * 0.9, 0.22, 0.25, 0xf4f8fc, 0, 0, ry);
    }
    put(Dt, 'box', f, 0, 1.15, l / 2 + 0.08, 1.3, 2.3, 0.12, 0x4a2f1c);
  }

  const rocks = [];
  const rgrid = new Map();

  function addRock(ch, kind, x, y, z, s, sy, color, solid) {
    const rand = hash(Math.round(x * 3), Math.round(z * 3));
    E.set((rand - 0.5) * 0.5, rand * 40, (hash(Math.round(z), 7) - 0.5) * 0.5);
    Q.setFromEuler(E);
    M.compose(P.set(x, y, z), Q, S.set(s * (0.8 + rand * 0.5), sy, s * (1.25 - rand * 0.4)));
    emit(ch, kind, color);
    if (!solid) return;
    const k = Math.floor(x / RC) * 65536 + Math.floor(z / RC);
    if (!rgrid.has(k)) rgrid.set(k, []);
    rgrid.get(k).push(rocks.length);
    rocks.push([x, z, s * 0.85, y + sy * 0.7]);
  }

  function mask() {
    const c = document.createElement('canvas'), R = 10;
    c.width = Math.ceil(W / R); c.height = Math.ceil(D / R);
    const g = c.getContext('2d');
    const tx = ([x, z]) => [(x - originX) / R, (z - originZ) / R];
    const poly = (list, style) => {
      g.fillStyle = style;
      for (const p of list) { g.beginPath(); p.forEach((q, i) => g[i ? 'lineTo' : 'moveTo'](...tx(q))); g.closePath(); g.fill(); }
    };
    g.globalCompositeOperation = 'lighter';
    poly(osm.rock, '#ff0000');
    poly(osm.scrub, '#0000ff');
    g.strokeStyle = '#00ff00'; g.lineWidth = 3;
    for (const p of osm.cliff) { g.beginPath(); p.forEach((q, i) => g[i ? 'lineTo' : 'moveTo'](...tx(q))); g.stroke(); }
    const d = g.getImageData(0, 0, c.width, c.height).data;
    return (x, z) => {
      const i = Math.floor((x - originX) / R), j = Math.floor((z - originZ) / R);
      if (i < 0 || j < 0 || i >= c.width || j >= c.height) return [0, 0, 0];
      const k = (j * c.width + i) * 4;
      return [d[k] / 255, d[k + 1] / 255, d[k + 2] / 255];
    };
  }

  function nature(huts) {
    const at = mask(), rand = rng(31), G = 11;
    const clear = (x, z, m) => pisteD(x, z) > m && liftD(x, z) > m + 4 && !stations.some(s => Math.hypot(s[0] - x, s[1] - z) < 40 + m) && !huts.some(h => Math.hypot(h.x - x, h.z - z) < h.reach + 6 + m) && !blocked(x, z, m + 1);
    const ROCK = [0x6f6b66, 0x7c7670, 0x5f5c58, 0x8a8178, 0x66615a];
    for (let z = originZ + 40; z < originZ + D - 40; z += G) for (let x = originX + 40; x < originX + W - 40; x += G) {
      const px = x + (rand() - 0.5) * G, pz = z + (rand() - 0.5) * G, r1 = rand(), r2 = rand(), r3 = rand();
      const y = terrain.heightAt(px, pz);
      terrain.normalAt(px, pz, n);
      const [mr, mc, ms] = at(px, pz);
      const steep = THREE.MathUtils.smoothstep(n.y, 0.86, 0.62);
      const high = THREE.MathUtils.smoothstep(y, 2100, 2500);
      let pr = 0, s0 = 0, s1 = 0, sink = 0.4;
      if (mc > 0.3) { pr = 0.3; s0 = 3; s1 = 11; sink = 0.45; }
      else if (mr > 0.3) { pr = 0.22; s0 = 0.5; s1 = r3 < 0.12 ? 7 : 2.6; sink = 0.3; }
      else if (steep > 0 && y > 1450) { pr = steep * steep * (0.05 + 0.08 * high); s0 = 1.8; s1 = 8; sink = 0.45; }
      else if (y > 2150) { pr = 0.01 + 0.02 * high; s0 = 0.6; s1 = 2.8; sink = 0.35; }
      else pr = 0.0015, s0 = 0.4, s1 = 1.4;
      if (r1 < pr) {
        const s = s0 + (s1 - s0) * r2 * r2;
        if (clear(px, pz, s + 3)) {
          const ch = chunk(px, pz);
          const sy = s * (0.45 + r3 * 0.45);
          addRock(s > 2.2 ? ch.big : ch.small, s > 2.2 ? 'rock0' : 'rock1', px, y - sy * sink + (1 - n.y) * s * 0.3, pz, s, sy, ROCK[Math.floor(r2 * 97) % ROCK.length], s > 1.1);
        }
        continue;
      }
      const band = THREE.MathUtils.smoothstep(y, 1650, 1850) * (1 - THREE.MathUtils.smoothstep(y, 2250, 2450));
      const f = terrain.forestAt(px, pz);
      let ps = ms > 0.3 ? 0.3 : band * 0.22 * THREE.MathUtils.smoothstep(vnoise(px / 70, pz / 70), 0.45, 0.75);
      if (y < 1900 && f > 0.06 && f < 0.35) ps = Math.max(ps, 0.05);
      if (n.y < 0.62 || r1 > pr + ps) continue;
      const s = 1.1 + r2 * 2.2;
      if (!clear(px, pz, s + 2)) continue;
      const ch = chunk(px, pz);
      for (let k = 0; k < 1 + Math.floor(r3 * 3); k++) {
        const ox = px + (hash(k, Math.round(px)) - 0.5) * s * 2, oz = pz + (hash(Math.round(pz), k) - 0.5) * s * 2, sk = s * (0.6 + hash(k, 3) * 0.6);
        addRock(ch.small, 'shrub0', ox, terrain.heightAt(ox, oz) - sk * 0.18, oz, sk, sk * (0.5 + r3 * 0.3), [0x4a6a3c, 0x55743f, 0x3f5c36][k % 3], false);
      }
    }
  }

  function fences() {
    for (const [snow, p] of osm.fence) {
      const step = snow ? 2.2 : 2.6, hp = snow ? 2.1 : 1.25;
      for (let i = 0; i < p.length - 1; i++) {
        const [ax, az] = p[i], [bx, bz] = p[i + 1], len = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.round(len / step));
        const dx = (bx - ax) / len, dz = (bz - az) / len, ry = Math.atan2(dx, dz);
        let px = ax, pz = az, py = terrain.heightAt(ax, az);
        for (let k = 1; k <= m; k++) {
          const qx = ax + (bx - ax) * k / m, qz = az + (bz - az) * k / m, qy = terrain.heightAt(qx, qz);
          const mx = (px + qx) / 2, mz = (pz + qz) / 2;
          if (pisteD(mx, mz) > 1 && liftD(mx, mz) > 4 && !blocked(mx, mz, 0.5)) {
            const ch = chunk(mx, mz).detail, f = { x: mx, z: mz, y: (py + qy) / 2, r: ry, c: Math.cos(ry), s: Math.sin(ry) };
            const seg = Math.hypot(len / m, qy - py), pitch = -Math.atan2(qy - py, len / m);
            put(ch, 'box', { ...f, x: px, z: pz, y: py }, 0, hp / 2 - 0.3, 0, 0.12, hp + 0.6, 0.12, 0x5a4330);
            const rails = snow ? [0.35, 0.7, 1.05, 1.4, 1.75] : [0.45, 0.95];
            for (const h of rails) put(ch, 'box', f, 0, h, 0, 0.05, snow ? 0.22 : 0.1, seg, snow ? 0x7a6450 : 0x6e5640, pitch);
          }
          px = qx; pz = qz; py = qy;
        }
      }
    }
  }

  const geos = {
    box: new THREE.BoxGeometry(1, 1, 1),
    prism: prismGeo(),
    pyr: new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0),
    rock0: rockGeo(3, 2), rock1: rockGeo(2, 1), shrub0: rockGeo(5, 1)
  };
  const mats = {
    build: snowMat(0.6, 0.8, false, false),
    rock: snowMat(0.55, 0.9, true, true),
    shrub: snowMat(0.2, 0.75, true, true)
  };
  const matOf = k => k.startsWith('rock') ? mats.rock : k.startsWith('shrub') ? mats.shrub : mats.build;

  function finish() {
    const out = [];
    for (const ch of chunks.values()) {
      const layers = {};
      for (const layer of ['body', 'big', 'detail', 'small']) {
        const g = new THREE.Group();
        for (const [kind, raw] of Object.entries(ch[layer].lists)) {
          const l = Float32Array.from(raw), cnt = l.length / 19, im = new THREE.InstancedMesh(geos[kind], matOf(kind), cnt);
          const c = new Float32Array(cnt * 3);
          for (let i = 0; i < cnt; i++) {
            im.instanceMatrix.array.set(l.subarray(i * 19, i * 19 + 16), i * 16);
            c.set(l.subarray(i * 19 + 16, i * 19 + 19), i * 3);
          }
          im.instanceColor = new THREE.InstancedBufferAttribute(c, 3);
          im.computeBoundingSphere();
          im.receiveShadow = true;
          im.castShadow = layer === 'body' || layer === 'big';
          g.add(im);
        }
        g.visible = false;
        group.add(g);
        layers[layer] = g;
      }
      out.push({ center: ch.center, ...layers });
    }
    return out;
  }

  let list = [];
  function build(huts) {
    blds = blds.filter(b => !huts.some(h => Math.hypot(h.x - b.x, h.z - b.z) < h.reach + b.rad + 8));
    index();
    for (const b of blds) building(b);
    nature(huts);
    fences();
    list = finish();
  }

  function update(camera) {
    const px = camera.position.x, pz = camera.position.z;
    for (const c of list) {
      const d = Math.hypot(c.center.x - px, c.center.y - pz) - CH * 0.7;
      c.body.visible = d < 6000;
      c.big.visible = d < 3500;
      c.detail.visible = d < 900;
      c.small.visible = d < 1100;
    }
  }

  function collide(state, onHit) {
    const x = state.pos.x, z = state.pos.z;
    const bl = bgrid.get(Math.floor(x / BC) * 65536 + Math.floor(z / BC)) || [];
    for (const i of bl) {
      const b = blds[i], ex = x - b.x, ez = z - b.z;
      const a = ex * b.dx + ez * b.dz, l = -ex * b.dz + ez * b.dx;
      const pa = b.l / 2 + 0.8 - Math.abs(a), pl = b.w / 2 + 0.8 - Math.abs(l);
      if (pa <= 0 || pl <= 0 || state.pos.y > b.hi + b.h + 3) continue;
      let nx, nz, p;
      if (pa < pl) { const s = Math.sign(a) || 1; nx = b.dx * s; nz = b.dz * s; p = pa; }
      else { const s = Math.sign(l) || 1; nx = -b.dz * s; nz = b.dx * s; p = pl; }
      state.pos.x += nx * p;
      state.pos.z += nz * p;
      hit(state, nx, nz, onHit);
    }
    const gx = Math.floor(x / RC), gz = Math.floor(z / RC);
    for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) {
      const rl = rgrid.get((gx + a) * 65536 + gz + c);
      if (!rl) continue;
      for (const i of rl) {
        const [rx, rz, rr, top] = rocks[i];
        const ex = state.pos.x - rx, ez = state.pos.z - rz, d = Math.hypot(ex, ez), r = rr + 0.4;
        if (d >= r || d === 0 || state.pos.y > top) continue;
        const nx = ex / d, nz = ez / d;
        state.pos.x = rx + nx * r;
        state.pos.z = rz + nz * r;
        hit(state, nx, nz, onHit);
      }
    }
  }

  function hit(state, nx, nz, onHit) {
    const g = terrain.heightAt(state.pos.x, state.pos.z);
    if (state.grounded || state.pos.y < g) state.pos.y = g;
    const vn = state.vel.x * nx + state.vel.z * nz;
    if (vn >= 0) return;
    state.vel.x -= nx * vn * 1.3;
    state.vel.z -= nz * vn * 1.3;
    if (-vn > 7 && state.crashed <= 0) {
      state.vel.multiplyScalar(0.15);
      state.crashed = 2;
      onHit?.(state, -vn);
    } else state.vel.multiplyScalar(0.8);
  }

  return { group, blocked, build, update, collide, get count() { return { buildings: blds.length, rocks: rocks.length, inst: list.reduce((a, c) => a + [c.body, c.big, c.detail, c.small].reduce((x, g) => x + g.children.reduce((y, m) => y + m.count, 0), 0), 0) }; } };
}
