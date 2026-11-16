import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CHUNK = 500;
const NEAR = 1300;
const FAR = 3800;
const GRID = 12;
const CELL = 16;

function rng(s) {
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function paint(geo, top, bottom, y0, y1) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
  for (let k = 0; k < p.count; k++) {
    col.copy(bottom).lerp(top, THREE.MathUtils.clamp((p.getY(k) - y0) / (y1 - y0), 0, 1));
    c.set([col.r, col.g, col.b], k * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

function tierGeo(tiers, needle, snow, trunk, segs) {
  const parts = [paint(new THREE.CylinderGeometry(0.012, 0.022, 0.3, 5, 1, true).translate(0, 0.15, 0), trunk, trunk, 0, 1)];
  for (const [r, y0, y1] of tiers) {
    const g = new THREE.ConeGeometry(r, y1 - y0, segs, 1, true).translate(0, (y0 + y1) / 2, 0);
    parts.push(paint(g, snow, needle, y0, y1));
  }
  return mergeGeometries(parts);
}

function treeGeos() {
  const C = h => new THREE.Color(h);
  const spruce = tierGeo([[0.3, 0.1, 0.5], [0.24, 0.32, 0.72], [0.16, 0.55, 0.9], [0.08, 0.78, 1]], C(0x1c3526), C(0xdfe7ef), C(0x4a3626), 6);
  const larch = tierGeo([[0.2, 0.18, 0.62], [0.13, 0.5, 0.88], [0.06, 0.78, 1]], C(0x6a5644), C(0xa59a8c), C(0x4f3b2b), 5);
  const spruceLow = paint(new THREE.ConeGeometry(0.28, 0.92, 5, 1, true).translate(0, 0.54, 0), C(0xc9d3dc), C(0x1c3526), 0.1, 1);
  const larchLow = paint(new THREE.ConeGeometry(0.18, 0.85, 4, 1, true).translate(0, 0.58, 0), C(0x9a8e80), C(0x6a5644), 0.15, 1);
  return { spruce: [spruce, spruceLow], larch: [larch, larchLow] };
}

function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

const HUTS = [
  { name: 'Rossbach Alm', at: [630, -903], w: 10, l: 14, h: 3.4, color: 0x6e4a2e },
  { name: 'Panoramarestaurant Schareck', at: [1098, -2878], w: 13, l: 20, h: 4.2, color: 0x5d3f28 },
  { name: 'Spatzl Alm', at: [535, -2230], w: 9, l: 12, h: 3.2, color: 0x6e4a2e },
  { name: 'Skihütte Fleißalm', at: [2143, -1190], w: 8, l: 10, h: 3, color: 0x77502f }
];

function signTex(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3b2616'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#d9b27a'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = '#f3e3c4'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let f = 64;
  do g.font = 'bold ' + f-- + 'px Georgia,serif'; while (g.measureText(text).width > 460);
  g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildHut(o, mats) {
  const g = new THREE.Group();
  const { w, l, h } = o;
  const box = (sx, sy, sz, m, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };
  box(w + 0.6, 4, l + 0.6, mats.stone, 0, -1.2, 0);
  box(w, h, l, mats.wood(o.color), 0, 0.8 + h / 2, 0);
  const rh = w * 0.38, top = 0.8 + h;
  const gable = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rh)]);
  const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: l, bevelEnabled: false }), mats.wood(o.color));
  gm.position.set(0, top, -l / 2);
  g.add(gm);
  const ow = w / 2 + 1.1, slope = Math.atan2(rh, w / 2), span = ow / Math.cos(slope);
  for (const s of [-1, 1]) {
    const roof = new THREE.Group();
    roof.position.set(0, top + rh + 0.15, 0);
    roof.rotation.z = -s * slope;
    const r = new THREE.Mesh(new THREE.BoxGeometry(span, 0.3, l + 2), mats.roof);
    r.position.x = s * span / 2;
    const sn = new THREE.Mesh(new THREE.BoxGeometry(span - 0.2, 0.35, l + 1.8), mats.snow);
    sn.position.set(s * span / 2, 0.3, 0);
    roof.add(r, sn);
    g.add(roof);
  }
  box(0.9, 2.4, 0.9, mats.stone, w * 0.22, top + rh, -l * 0.2);
  box(0.95, 0.3, 0.95, mats.snow, w * 0.22, top + rh + 1.3, -l * 0.2);
  const nWin = Math.max(2, Math.floor(l / 3.5));
  for (const s of [-1, 1]) for (let i = 0; i < nWin; i++) {
    const z = -l / 2 + (i + 0.5) * l / nWin;
    box(0.12, 1.1, 0.9, mats.glass, s * (w / 2 + 0.03), 0.8 + h * 0.55, z);
    box(0.08, 1.2, 0.35, mats.shutter, s * (w / 2 + 0.06), 0.8 + h * 0.55, z - 0.65);
    box(0.08, 1.2, 0.35, mats.shutter, s * (w / 2 + 0.06), 0.8 + h * 0.55, z + 0.65);
  }
  box(1.3, 2.2, 0.15, mats.door, 0, 0.8 + 1.1, l / 2 + 0.05);
  for (const s of [-1, 1]) box(0.9, 1.1, 0.12, mats.glass, s * w * 0.28, 0.8 + h * 0.55, l / 2 + 0.03);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.8, 7), Math.min(w * 0.8, 7) / 4), new THREE.MeshLambertMaterial({ map: signTex(o.name) }));
  sign.position.set(0, top + rh * 0.4, l / 2 + 0.05);
  g.add(sign);
  const deck = 6;
  box(w + 2, 0.5, deck, mats.deck, 0, 0.55, l / 2 + deck / 2);
  for (const s of [-1, 1]) {
    const tx = s * w * 0.25, tz = l / 2 + deck / 2;
    box(1.8, 0.08, 0.8, mats.deck, tx, 1.55, tz);
    box(0.12, 0.75, 0.12, mats.deck, tx, 1.2, tz);
    box(1.8, 0.08, 0.35, mats.deck, tx, 1.25, tz - 0.8);
    box(1.8, 0.08, 0.35, mats.deck, tx, 1.25, tz + 0.8);
    box(0.06, 2.4, 0.06, mats.shutter, tx, 2, tz);
    const um = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 8, 1, true), mats.parasol);
    um.position.set(tx, 3.2, tz);
    g.add(um);
  }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group: g, hl: l / 2 + 0.3, hw: w / 2 + 0.3, top: top + rh, reach: Math.max(w + 2, l + deck * 2) / 2 + 3 };
}

export function createScenery(terrain, pistes, lift) {
  const group = new THREE.Group();
  const stations = lift.sections.flatMap(s => [s.a, s.b]);
  const towers = lift.sections.flatMap(s => s.towers.map(t => [t.x, t.z]));
  const pisteClear = (x, z, m) => { const q = pistes.nearest(x, z, 80); return !q || q.d > q.p.width / 2 + m; };
  const liftClear = (x, z, m) => lift.sections.every(s => segDist(x, z, s.a, s.b) > m);

  const wood = {};
  const mats = {
    stone: new THREE.MeshLambertMaterial({ color: 0x8b8781 }),
    wood: c => wood[c] ||= new THREE.MeshLambertMaterial({ color: c }),
    roof: new THREE.MeshLambertMaterial({ color: 0x3d3430 }),
    snow: new THREE.MeshLambertMaterial({ color: 0xf6f9fd }),
    glass: new THREE.MeshLambertMaterial({ color: 0x2a3440, emissive: 0x6a4a1a }),
    shutter: new THREE.MeshLambertMaterial({ color: 0x8c2a22 }),
    door: new THREE.MeshLambertMaterial({ color: 0x4a2f1c }),
    deck: new THREE.MeshLambertMaterial({ color: 0x9a7350 }),
    parasol: new THREE.MeshLambertMaterial({ color: 0xc8302a, side: THREE.DoubleSide })
  };

  const huts = [];
  for (const o of HUTS) {
    const b = buildHut(o, mats);
    let best = null;
    for (let r = 20; r <= 260 && !best; r += 15) {
      let bs = Infinity;
      for (let a = 0; a < 24; a++) {
        const x = o.at[0] + Math.cos(a / 24 * Math.PI * 2) * r, z = o.at[1] + Math.sin(a / 24 * Math.PI * 2) * r;
        if (!pisteClear(x, z, b.reach + 6) || !liftClear(x, z, b.reach + 6)) continue;
        if (stations.some(s => Math.hypot(s[0] - x, s[1] - z) < b.reach + 30)) continue;
        if (towers.some(t => Math.hypot(t[0] - x, t[1] - z) < b.reach + 25)) continue;
        const n = terrain.normalAt(x, z);
        if (n.y < 0.82) continue;
        const s = (1 - n.y) * 400 + r * 0.05;
        if (s < bs) { bs = s; best = { x, z, n: n.clone() }; }
      }
    }
    if (!best) continue;
    const y = terrain.heightAt(best.x, best.z);
    const heading = Math.atan2(best.n.x, best.n.z);
    b.group.position.set(best.x, y, best.z);
    b.group.rotation.y = heading;
    group.add(b.group);
    huts.push({ ...b, name: o.name, x: best.x, z: best.z, y, dx: Math.sin(heading), dz: Math.cos(heading) });
  }
  terrain.groom((x, z, y) => {
    for (const h of huts) {
      const d = Math.hypot(x - h.x, z - h.z);
      if (d > h.reach + 25) continue;
      const w = 1 - THREE.MathUtils.smoothstep(d, h.reach, h.reach + 25);
      return [y + (h.y - y) * w, w * 0.5];
    }
    return null;
  });

  const geos = treeGeos();
  const treeMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const { originX, originZ, nx, nz, cell } = terrain.meta;
  const W = (nx - 1) * cell, D = (nz - 1) * cell;
  const cx = Math.ceil(W / CHUNK), cz = Math.ceil(D / CHUNK);
  const buckets = new Map();
  const T = [];
  const rand = rng(8);
  const n = new THREE.Vector3();
  for (let z = originZ + 60; z < originZ + D - 60; z += GRID) {
    for (let x = originX + 60; x < originX + W - 60; x += GRID) {
      const px = x + (rand() - 0.5) * GRID, pz = z + (rand() - 0.5) * GRID;
      const r = rand();
      const y = terrain.heightAt(px, pz);
      if (y > 2180) continue;
      const tl = 1 - THREE.MathUtils.smoothstep(y, 1850, 2180);
      const f = THREE.MathUtils.smoothstep(terrain.forestAt(px, pz), 0.15, 0.6);
      if (r > f * tl * 0.85) continue;
      terrain.normalAt(px, pz, n);
      if (n.y < 0.7 || r > f * tl * 0.85 * THREE.MathUtils.smoothstep(n.y, 0.7, 0.82)) continue;
      if (Math.hypot(px, pz) < 70) continue;
      if (!pisteClear(px, pz, 7) || !liftClear(px, pz, 14)) continue;
      if (stations.some(s => Math.hypot(s[0] - px, s[1] - pz) < 40)) continue;
      if (huts.some(h => Math.hypot(h.x - px, h.z - pz) < h.reach + 14)) continue;
      const larch = rand() < 0.15 + THREE.MathUtils.smoothstep(y, 1450, 2000) * 0.65;
      const s = (larch ? 13 : 16) * (0.55 + rand() * 0.6) * (0.45 + 0.55 * tl);
      const k = Math.floor((px - originX) / CHUNK) + Math.floor((pz - originZ) / CHUNK) * cx;
      const key = k * 2 + (larch ? 1 : 0);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push([px, y - 0.3, pz, s, rand() * Math.PI * 2, 0.85 + rand() * 0.3]);
      T.push(px, pz, y, s);
    }
  }

  const chunks = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);
  for (const [key, list] of buckets) {
    const [hi, lo] = geos[key & 1 ? 'larch' : 'spruce'];
    const near = new THREE.InstancedMesh(hi, treeMat, list.length);
    list.forEach(([x, y, z, s, rot, b], i) => {
      m.compose(v.set(x, y, z), q.setFromAxisAngle(up, rot), sc.set(s * (0.85 + (b - 0.85) * 0.5), s, s * (0.85 + (b - 0.85) * 0.5)));
      near.setMatrixAt(i, m);
      near.setColorAt(i, col.setScalar(b));
    });
    const far = new THREE.InstancedMesh(lo, treeMat, list.length);
    far.instanceMatrix = near.instanceMatrix;
    far.instanceColor = near.instanceColor;
    near.castShadow = true;
    near.computeBoundingSphere();
    far.boundingSphere = near.boundingSphere;
    const k = key >> 1;
    const center = new THREE.Vector2(originX + (k % cx + 0.5) * CHUNK, originZ + (Math.floor(k / cx) + 0.5) * CHUNK);
    near.visible = far.visible = false;
    group.add(near, far);
    chunks.push({ near, far, center });
  }

  const grid = new Map();
  const N = T.length / 4;
  for (let i = 0; i < N; i++) {
    const k = Math.floor(T[i * 4] / CELL) * 65536 + Math.floor(T[i * 4 + 1] / CELL);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }

  function update(camera) {
    const px = camera.position.x, pz = camera.position.z;
    for (const c of chunks) {
      const d = Math.hypot(c.center.x - px, c.center.y - pz) - CHUNK * 0.7;
      c.near.visible = d < NEAR;
      c.far.visible = !c.near.visible && d < FAR;
    }
  }

  function collide(state, onHit) {
    const x = state.pos.x, z = state.pos.z, gx = Math.floor(x / CELL), gz = Math.floor(z / CELL);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const list = grid.get((gx + a) * 65536 + gz + b);
      if (!list) continue;
      for (const i of list) {
        const tx = T[i * 4], tz = T[i * 4 + 1], ty = T[i * 4 + 2], s = T[i * 4 + 3];
        const ex = x - tx, ez = z - tz, d = Math.hypot(ex, ez), r = 0.7 + s * 0.02;
        if (d >= r || d === 0 || state.pos.y > ty + s * 0.9) continue;
        const nx = ex / d, nz = ez / d;
        state.pos.x = tx + nx * r;
        state.pos.z = tz + nz * r;
        const vn = state.vel.x * nx + state.vel.z * nz;
        if (vn < 0) {
          state.vel.x -= nx * vn * 1.3;
          state.vel.z -= nz * vn * 1.3;
          if (-vn > 7 && state.crashed <= 0) {
            state.vel.multiplyScalar(0.15);
            state.crashed = 2;
            onHit?.(state, -vn);
          } else state.vel.multiplyScalar(0.8);
        }
      }
    }
    for (const h of huts) {
      const ex = state.pos.x - h.x, ez = state.pos.z - h.z;
      const a = ex * h.dx + ez * h.dz, l = -ex * h.dz + ez * h.dx;
      const pa = h.hl + 0.5 - Math.abs(a), pl = h.hw + 0.5 - Math.abs(l);
      if (pa <= 0 || pl <= 0 || state.pos.y > h.y + h.top) continue;
      let nx, nz, p;
      if (pa < pl) { const s = Math.sign(a) || 1; nx = h.dx * s; nz = h.dz * s; p = pa; }
      else { const s = Math.sign(l) || 1; nx = -h.dz * s; nz = h.dx * s; p = pl; }
      state.pos.x += nx * p;
      state.pos.z += nz * p;
      const g = terrain.heightAt(state.pos.x, state.pos.z);
      if (state.grounded || state.pos.y < g) state.pos.y = g;
      const vn = state.vel.x * nx + state.vel.z * nz;
      if (vn < 0) { state.vel.x -= nx * vn; state.vel.z -= nz * vn; state.vel.multiplyScalar(0.8); }
    }
  }

  return { group, update, collide, huts, treeCount: N };
}
