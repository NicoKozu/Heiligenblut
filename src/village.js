import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials, worldUV } from './textures.js';

const VC = [-60, 60];
const LANE = 1.65;
const CELL = 25;
const LIFT = [0.16, 0.15, 0.13, 0.12, 0.1];
const PAINT = [0xf2f2f0, 0xe9e9e6, 0x1b1d21, 0x2b2e33, 0x8d939a, 0xb9bec4, 0x5b6068, 0x1e2f4f, 0x8a1d1d, 0x2e4a33, 0x3e5f86, 0xc9c2b4, 0x6e2a1e, 0xd8d8d8, 0x101010];
const KINDS = ['hatch', 'wagon', 'suv', 'van'];

function rng(s) {
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

function canvasTex(w, h, draw, rep = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function speckle(g, r, w, h, n, cols, size = 1.6) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(r() * cols.length) | 0];
    const s = 0.5 + r() * size;
    g.fillRect(r() * w, r() * h, s, s);
  }
}

function band(g, w, h, v0, v1, col, r, rough = 0.06) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, v0 * h);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, (v0 + (r() - 0.5) * rough) * h);
  for (let x = w; x >= 0; x -= 8) g.lineTo(x, (v1 + (r() - 0.5) * rough) * h);
  g.closePath();
  g.fill();
}

function roadTextures() {
  const r = rng(7);
  const asphalt = (g, w, h) => {
    g.fillStyle = '#34373b'; g.fillRect(0, 0, w, h);
    speckle(g, r, w, h, 9000, ['#2a2c30', '#3e4146', '#45484c', '#2f3236', '#505357']);
  };
  const main = canvasTex(512, 128, (g, w, h) => {
    asphalt(g, w, h);
    for (const v of [0.26, 0.74]) band(g, w, h, v - 0.09, v + 0.09, 'rgba(18,20,24,0.45)', r, 0.02);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(235,238,240,${0.04 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * w, (r() < 0.5 ? 0.1 + r() * 0.1 : 0.8 + r() * 0.1) * h, 8 + r() * 30, 2 + r() * 4, 0, 0, 7); g.fill(); }
    band(g, w, h, 0, 0.09, 'rgba(228,232,236,0.92)', r, 0.05);
    band(g, w, h, 0.91, 1, 'rgba(228,232,236,0.92)', r, 0.05);
    g.fillStyle = 'rgba(235,235,230,0.8)';
    g.fillRect(0, 0.105 * h, w, 0.022 * h);
    g.fillRect(0, 0.873 * h, w, 0.022 * h);
    g.fillRect(0, 0.49 * h, w * 0.4, 0.024 * h);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(52,55,59,0.7)'; g.fillRect(r() * w, (r() < 0.5 ? 0.1 : 0.87) * h, 2 + r() * 8, 0.03 * h); }
  });
  const minor = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#dfe3e8'; g.fillRect(0, 0, w, h);
    speckle(g, r, w, h, 5000, ['#d0d5db', '#eef1f4', '#c6ccd3', '#e7eaee']);
    for (const v of [0.3, 0.7]) {
      band(g, w, h, v - 0.11, v + 0.11, 'rgba(92,96,102,0.55)', r, 0.05);
      band(g, w, h, v - 0.07, v + 0.07, 'rgba(60,63,68,0.6)', r, 0.04);
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(245,247,250,${0.2 + r() * 0.5})`; g.beginPath(); g.ellipse(r() * w, (0.3 + (r() < 0.5 ? -0.4 : 0.4) * 0) * h + (r() - 0.5) * h * 0.9, 4 + r() * 18, 1.5 + r() * 4, 0, 0, 7); g.fill(); }
    band(g, w, h, 0, 0.1, 'rgba(246,248,251,0.95)', r, 0.07);
    band(g, w, h, 0.9, 1, 'rgba(246,248,251,0.95)', r, 0.07);
  });
  const foot = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#e8ecf1'; g.fillRect(0, 0, w, h);
    speckle(g, r, w, h, 2500, ['#d7dce3', '#f5f7fa', '#cdd3db', '#c2c9d2'], 2.2);
    for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(170,180,192,0.45)'; g.beginPath(); g.ellipse(r() * w, (0.25 + r() * 0.5) * h, 3, 1.6, r(), 0, 7); g.fill(); }
    band(g, w, h, 0, 0.12, 'rgba(250,251,253,0.9)', r, 0.1);
    band(g, w, h, 0.88, 1, 'rgba(250,251,253,0.9)', r, 0.1);
  });
  const water = canvasTex(256, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#f2f5f8'); grd.addColorStop(0.12, '#c9d6dc'); grd.addColorStop(0.2, '#3d5a5e'); grd.addColorStop(0.5, '#2a4549'); grd.addColorStop(0.8, '#3d5a5e'); grd.addColorStop(0.88, '#c9d6dc'); grd.addColorStop(1, '#f2f5f8');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(210,230,235,${0.08 + r() * 0.2})`; g.lineWidth = 0.6 + r(); const y = (0.22 + r() * 0.56) * h, x = r() * w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 + r() * 30, y + (r() - 0.5) * 3); g.stroke(); }
    for (let i = 0; i < 50; i++) { g.fillStyle = 'rgba(240,244,247,0.9)'; g.beginPath(); g.ellipse(r() * w, (r() < 0.5 ? 0.17 : 0.83) * h + (r() - 0.5) * 8, 4 + r() * 12, 2 + r() * 4, 0, 0, 7); g.fill(); }
  });
  const slush = canvasTex(256, 256, (g, w, h) => {
    asphalt(g, w, h);
    for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(232,236,240,${0.08 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 22, 2 + r() * 9, r() * 3, 0, 7); g.fill(); }
  });
  return { main, minor, foot, water, slush };
}

function lotTexture(L, W, rows, cross) {
  const S = 8, r = rng(21);
  return canvasTex(Math.round(L * S), Math.round(W * S), (g, w, h) => {
    g.fillStyle = '#383b3f'; g.fillRect(0, 0, w, h);
    speckle(g, r, w, h, 40000, ['#2c2f33', '#43464b', '#4a4d52', '#313438', '#55585c']);
    for (const row of rows) {
      const y = (row.tA + W / 2) * S;
      g.fillStyle = 'rgba(20,22,26,0.35)';
      g.fillRect(0, y - 2.6 * S, w, 1.3 * S); g.fillRect(0, y + 1.3 * S, w, 1.3 * S);
    }
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(236,240,244,${0.05 + r() * 0.25})`; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 40, 4 + r() * 12, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(238,238,232,0.88)'; g.lineWidth = 0.12 * S;
    for (const row of rows) {
      const ya = (row.t0 + W / 2) * S, yb = (row.t1 + W / 2) * S;
      for (const st of row.stalls) for (const e of [-1.25, 1.25]) { const x = (st.s + e + L / 2) * S; g.beginPath(); g.moveTo(x, ya); g.lineTo(x, yb); g.stroke(); }
      const yb2 = (row.f > 0 ? row.t0 : row.t1) + W / 2;
      g.beginPath();
      for (const seg of row.segs) { g.moveTo((seg[0] + L / 2) * S, yb2 * S); g.lineTo((seg[1] + L / 2) * S, yb2 * S); }
      g.stroke();
    }
    g.fillStyle = 'rgba(238,238,232,0.8)';
    for (const row of rows) for (const sx of [-L / 4, L / 4]) {
      const x = (sx + L / 2) * S, y = (row.tA + W / 2) * S, d = Math.sign(sx);
      g.beginPath(); g.moveTo(x + d * 1.4 * S, y); g.lineTo(x, y - 0.6 * S); g.lineTo(x, y + 0.6 * S); g.closePath(); g.fill();
      g.fillRect(Math.min(x, x - d * 2.2 * S), y - 0.18 * S, 2.2 * S, 0.36 * S);
    }
    for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(242,245,248,${0.4 + r() * 0.5})`; const e = r() < 0.5, x = r() * w, y = e ? r() * 1.4 * S : h - r() * 1.4 * S; g.beginPath(); g.ellipse(x, y, 6 + r() * 20, 3 + r() * 6, 0, 0, 7); g.fill(); }
    for (const c of cross) { g.fillStyle = 'rgba(30,32,36,0.25)'; g.fillRect((c - 1.6 + L / 2) * S, 0, 3.2 * S, h); }
  }, false);
}

function signTexture(lines) {
  return canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d4f9c'; g.fillRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#ffffff'; g.font = 'bold 300px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('P', w / 2, 210);
    g.font = 'bold 46px Arial, sans-serif';
    lines.forEach((t, i) => g.fillText(t, w / 2, 430 + i * 62));
  }, false);
}

function profileGeo(pts, width) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1, curveSegments: 2 });
  g.translate(0, 0, -width / 2);
  return g;
}

function paint(g, hex) {
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (g.index) return g.toNonIndexed();
  return g;
}

function prep(g) {
  const o = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(o.attributes)) if (!['position', 'normal', 'color'].includes(k)) o.deleteAttribute(k);
  return o;
}

const SHAPES = {
  hatch: { L: 4.05, W: 1.76, body: [[-2.02, 0.3], [2.02, 0.3], [2.05, 0.62], [1.92, 0.8], [1.1, 0.9], [0.45, 1.42], [-1.55, 1.46], [-1.98, 1.02], [-2.03, 0.6]], cab: [[1.08, 0.92], [0.46, 1.38], [-1.52, 1.42], [-1.92, 1.0]], wb: 2.55, wr: 0.31 },
  wagon: { L: 4.7, W: 1.82, body: [[-2.35, 0.3], [2.35, 0.3], [2.37, 0.6], [2.2, 0.78], [1.25, 0.88], [0.55, 1.42], [-2.05, 1.45], [-2.32, 1.05], [-2.36, 0.6]], cab: [[1.22, 0.9], [0.55, 1.38], [-2.0, 1.41], [-2.26, 1.0]], wb: 2.8, wr: 0.33 },
  suv: { L: 4.6, W: 1.88, body: [[-2.3, 0.38], [2.3, 0.38], [2.32, 0.75], [2.18, 0.98], [1.3, 1.08], [0.7, 1.66], [-1.95, 1.7], [-2.28, 1.25], [-2.31, 0.75]], cab: [[1.28, 1.1], [0.7, 1.62], [-1.9, 1.66], [-2.22, 1.2]], wb: 2.75, wr: 0.38 },
  van: { L: 5.0, W: 1.95, body: [[-2.5, 0.36], [2.5, 0.36], [2.52, 0.7], [2.4, 0.95], [1.75, 1.2], [1.25, 1.95], [-2.42, 1.98], [-2.5, 1.7], [-2.51, 0.7]], cab: [[1.72, 1.23], [1.26, 1.9], [-0.2, 1.92], [-0.2, 1.25]], wb: 3.1, wr: 0.36 },
  bus: { L: 11.8, W: 2.5, body: [[-5.9, 0.42], [5.9, 0.42], [5.92, 3.0], [5.7, 3.15], [-5.85, 3.15], [-5.92, 2.95]], cab: [[5.8, 1.15], [5.86, 2.85], [-5.75, 2.85], [-5.75, 1.25]], wb: 6.2, wr: 0.5 }
};

function carGeo(kind) {
  const S = SHAPES[kind];
  const body = prep(profileGeo(S.body, S.W - 0.08));
  const parts = [];
  const cab = S.cab;
  const cx = cab.reduce((a, p) => a + p[0], 0) / cab.length, cy = cab.reduce((a, p) => a + p[1], 0) / cab.length;
  const scaled = (k, dy = 0) => cab.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k + dy]);
  parts.push(paint(prep(profileGeo(scaled(kind === 'bus' ? 1 : 0.9), S.W - 0.02)), 0x1a222b));
  parts.push(paint(prep(profileGeo(scaled(1.025), S.W - 0.34)), 0x1a222b));
  const wheel = new THREE.CylinderGeometry(S.wr, S.wr, 0.24, 14);
  wheel.rotateX(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(S.wr * 0.55, S.wr * 0.55, 0.26, 10);
  rim.rotateX(Math.PI / 2);
  const axles = kind === 'bus' ? [-S.wb / 2, S.wb / 2] : [-S.wb / 2, S.wb / 2];
  for (const x of axles) for (const z of [-1, 1]) {
    parts.push(paint(prep(wheel.clone().translate(x, S.wr, z * (S.W / 2 - 0.14))), 0x151515));
    parts.push(paint(prep(rim.clone().translate(x, S.wr, z * (S.W / 2 - 0.13))), 0x9aa0a6));
  }
  const front = S.body[2][0], back = S.body[S.body.length - 1][0], ly = kind === 'bus' ? 0.9 : S.body[2][1] - 0.06;
  for (const z of [-1, 1]) {
    parts.push(paint(prep(new THREE.BoxGeometry(0.08, 0.13, 0.36).translate(front + 0.01, ly, z * (S.W / 2 - 0.3))), 0xfff6dc));
    parts.push(paint(prep(new THREE.BoxGeometry(0.08, 0.14, 0.3).translate(back - 0.03, ly + 0.08, z * (S.W / 2 - 0.25))), 0xb3121a));
  }
  parts.push(paint(prep(new THREE.BoxGeometry(0.06, 0.12, 0.5).translate(front + 0.03, 0.42, 0)), 0xf0f0f0));
  parts.push(paint(prep(new THREE.BoxGeometry(0.06, 0.12, 0.5).translate(back - 0.03, 0.5, 0)), 0xf0f0f0));
  if (kind === 'bus') parts.push(paint(prep(new THREE.BoxGeometry(0.05, 0.3, 1.7).translate(front + 0.03, 2.95, 0)), 0x111111));
  const detail = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p));
  body.rotateY(-Math.PI / 2); detail.rotateY(-Math.PI / 2);
  const roofY = Math.max(...S.body.map(p => p[1]));
  return { body, detail, roofY, S };
}

const CLEAR = [[630, -915, 135]];

export function createVillage(terrain, data, built) {
  const group = new THREE.Group();
  const H = (x, z) => terrain.heightAt(x, z);
  const tx = roadTextures();
  const M = {
    main: new THREE.MeshStandardMaterial({ map: tx.main, roughness: 0.62, metalness: 0.02, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    minor: new THREE.MeshStandardMaterial({ map: tx.minor, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    foot: new THREE.MeshStandardMaterial({ map: tx.foot, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    slush: new THREE.MeshStandardMaterial({ map: tx.slush, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    water: new THREE.MeshStandardMaterial({ map: tx.water, roughness: 0.18, metalness: 0.15, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    snow: new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.92, vertexColors: true }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.38, metalness: 0.75, side: THREE.DoubleSide }),
    post: new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.5, metalness: 0.6 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xa7a59f, roughness: 0.9, side: THREE.DoubleSide }),
    lampHead: new THREE.MeshStandardMaterial({ color: 0x2d3034, roughness: 0.5, metalness: 0.4 }),
    lampGlow: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd28a, emissiveIntensity: 0.55, roughness: 0.3 }),
    pole: new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.55, metalness: 0.5 })
  };
  const W = materials();

  const segs = new Map();
  const cellKey = (i, j) => i * 65536 + j;
  const addSeg = (ax, az, bx, bz, hw, id, kind) => {
    const s = [ax, az, bx, bz, hw, id, kind];
    const x0 = Math.floor((Math.min(ax, bx) - hw) / CELL), x1 = Math.floor((Math.max(ax, bx) + hw) / CELL);
    const z0 = Math.floor((Math.min(az, bz) - hw) / CELL), z1 = Math.floor((Math.max(az, bz) + hw) / CELL);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const k = cellKey(i, j);
      if (!segs.has(k)) segs.set(k, []);
      segs.get(k).push(s);
    }
  };
  const segD = (x, z, s) => {
    const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2));
    return Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t);
  };
  const near = (x, z) => segs.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  function onRoad(x, z, m, skip, kinds) {
    for (const s of near(x, z)) {
      if (s[5] === skip || (kinds && !kinds.includes(s[6]))) continue;
      if (segD(x, z, s) < s[4] + m) return true;
    }
    return false;
  }

  const clear = (x, z) => CLEAR.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r);
  const runs = pts => pts.reduce((o, p) => { if (clear(...p)) o.push([]); else o[o.length - 1].push(p); return o; }, [[]]).filter(r => r.length > 1);
  const roads = data.roads.flatMap(([c, w, br, pts], id) => runs(pts).map(p => ({ c, w, br, pts: p, id })));
  const rivers = data.rivers.map(([w, pts], i) => ({ c: 5, w, pts: pts.filter(p => Math.hypot(p[0] - VC[0], p[1] - VC[1]) < 3600 && terrain.inside(p[0], p[1])), id: 10000 + i }));
  for (const r of roads) for (let i = 1; i < r.pts.length; i++) addSeg(...r.pts[i - 1], ...r.pts[i], r.w / 2, r.id, r.c < 4 ? 'road' : 'foot');
  for (const r of rivers) for (let i = 1; i < r.pts.length; i++) addSeg(...r.pts[i - 1], ...r.pts[i], r.w / 2, r.id, 'river');

  const lots = data.lots.filter(p => !p.some(q => clear(...q))).map(p => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const [x, z] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    return { p, x0, x1, z0, z1 };
  });
  const inPoly = (p, x, z) => {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, zi] = p[i], [xj, zj] = p[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  const inLot = (x, z, m = 0) => lots.some(l => x > l.x0 - m && x < l.x1 + m && z > l.z0 - m && z < l.z1 + m && inPoly(l.p, x, z));

  const P = data.lot, A = P.a * Math.PI / 180, U = [Math.cos(A), Math.sin(A)], V = [-U[1], U[0]];
  const LW = P.w, LL = P.l, LY = P.y;
  const toW = (s, t) => [P.c[0] + U[0] * s + V[0] * t, P.c[1] + U[1] * s + V[1] * t];
  const toL = (x, z) => { const dx = x - P.c[0], dz = z - P.c[1]; return [dx * U[0] + dz * U[1], dx * V[0] + dz * V[1]]; };
  const inBig = (x, z, m) => { const [s, t] = toL(x, z); return Math.abs(s) < LL / 2 + m && Math.abs(t) < LW / 2 + m; };

  terrain.groom((x, z, y) => {
    const [s, t] = toL(x, z);
    const e = Math.max(Math.abs(s) - LL / 2 - 4, Math.abs(t) - LW / 2 - 4);
    if (e > 22) return null;
    const k = smooth(1 - e / 22);
    return [y + (LY - y) * k, 0];
  });

  function strip(pts, w, lift, opt = {}) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(l / (opt.step || 3)));
      for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    out.push(pts[pts.length - 1]);
    const N = out.length, cum = new Float32Array(N), nx = new Float32Array(N), nz = new Float32Array(N), mk = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (i) cum[i] = cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
      const a = out[Math.max(0, i - 1)], b = out[Math.min(N - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      let m = 1;
      if (i > 0 && i < N - 1) {
        const ux = out[i][0] - a[0], uz = out[i][1] - a[1], ul = Math.hypot(ux, uz) || 1;
        m = Math.min(2, 1 / Math.max(0.5, (ux * dx + uz * dz) / ul));
      }
      nx[i] = -dz; nz[i] = dx; mk[i] = m;
    }
    return { out, N, cum, nx, nz, mk, len: cum[N - 1] };
  }

  const builders = {};
  const B = key => builders[key] || (builders[key] = { pos: [], uv: [], col: [], idx: [] });
  function ribbon(key, st, offs, yAt, tile, vRange = [0, 1]) {
    const b = B(key), C = offs.length, base = b.pos.length / 3;
    for (let i = 0; i < st.N; i++) {
      const [x, z] = st.out[i];
      for (let k = 0; k < C; k++) {
        const o = offs[k] * st.mk[i], px = x + st.nx[i] * o, pz = z + st.nz[i] * o;
        b.pos.push(px, yAt(px, pz, i, k), pz);
        b.uv.push(st.cum[i] / tile, vRange[0] + (vRange[1] - vRange[0]) * k / (C - 1));
      }
    }
    for (let i = 0; i < st.N - 1; i++) for (let k = 0; k < C - 1; k++) {
      const a = base + i * C + k, c = a + C;
      b.idx.push(a, a + 1, c, a + 1, c + 1, c);
    }
  }
  function flush(key, mat, shadow = true) {
    const b = builders[key];
    if (!b || !b.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    if (b.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    if (b.col.length) g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    g.setIndex(b.idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = shadow;
    group.add(m);
    delete builders[key];
    return m;
  }

  const bridges = [];
  function deckAt(x, z) {
    let y = -Infinity;
    for (const b of bridges) {
      if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
      for (let i = 1; i < b.pts.length; i++) {
        const s = [b.pts[i - 1][0], b.pts[i - 1][1], b.pts[i][0], b.pts[i][1]];
        if (segD(x, z, s) < b.w / 2 + 0.3) {
          const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2));
          y = Math.max(y, b.y(i - 1 + t));
        }
      }
    }
    return y;
  }
  const surfaceAt = (x, z) => Math.max(H(x, z) + 0.15, deckAt(x, z));

  const rnd = rng(77);
  const lampSpots = [], railRuns = [], postSpots = [];
  for (const r of roads) {
    const st = strip(r.pts, r.w, 0);
    const lift = LIFT[r.c] + (r.id % 5) * 0.004;
    const half = r.w / 2;
    let yAt;
    if (r.br) {
      const y0 = H(...r.pts[0]) + lift + 0.15, y1 = H(...r.pts[r.pts.length - 1]) + lift + 0.15;
      const x0 = Math.min(...r.pts.map(p => p[0])) - 10, x1 = Math.max(...r.pts.map(p => p[0])) + 10, z0 = Math.min(...r.pts.map(p => p[1])) - 10, z1 = Math.max(...r.pts.map(p => p[1])) + 10;
      const segLen = r.pts.slice(1).map((p, i) => Math.hypot(p[0] - r.pts[i][0], p[1] - r.pts[i][1])), tot = segLen.reduce((a, b) => a + b, 0) || 1;
      const yOf = f => { let acc = 0; const i = Math.min(segLen.length - 1, Math.floor(f)); for (let k = 0; k < i; k++) acc += segLen[k]; acc += segLen[i] * (f - i); return y0 + (y1 - y0) * acc / tot; };
      bridges.push({ pts: r.pts, w: r.w, x0, x1, z0, z1, y: yOf });
      yAt = (x, z, i) => Math.max(y0 + (y1 - y0) * st.cum[i] / st.len, H(x, z) + lift);
    } else yAt = (x, z) => H(x, z) + lift;
    const offs = r.w >= 4 ? [-half, -half / 2, 0, half / 2, half] : [-half, 0, half];
    ribbon(r.c <= 1 ? 'main' : r.c <= 3 ? 'minor' : 'foot', st, offs, yAt, r.c <= 1 ? 12 : r.c <= 3 ? 10 : 6);
    if (r.br) {
      for (const sd of [-1, 1]) {
        const o = sd * (half + 0.25);
        ribbon('fascia', st, [o, o], (x, z, i, k) => yAt(x, z, i) + (k ? 0.2 : -0.9), 4);
        ribbon('fascia', st, [o - sd * 0.25, o], (x, z, i) => yAt(x, z, i) + 0.2, 4);
        ribbon('rail', st, [o, o], (x, z, i, k) => yAt(x, z, i) + (k ? 1.05 : 0.95), 4);
        for (let i = 0; i < st.N; i += 1) {
          const [x, z] = st.out[i];
          if (st.cum[i] % 2.4 > 1.6 && i < st.N - 1) continue;
          postSpots.push([x + st.nx[i] * o, yAt(x, z, i) + 0.2, z + st.nz[i] * o, 0.85]);
        }
      }
      continue;
    }
    if (r.c > 3) continue;
    const vc = Math.hypot(st.out[0][0] - VC[0], st.out[0][1] - VC[1]);
    for (const sd of [-1, 1]) {
      let run = null;
      const hb = r.c <= 1 ? 0.75 : r.c === 3 ? 0.4 : 0.6;
      const b = B('bank'), base = () => b.pos.length / 3;
      let prev = -1;
      for (let i = 0; i < st.N; i++) {
        const [x, z] = st.out[i], nx = st.nx[i] * sd, nz = st.nz[i] * sd, e = half * st.mk[i];
        const ex = x + nx * (e + 0.7), ez = z + nz * (e + 0.7);
        const ok = !onRoad(ex, ez, 1.2, r.id) && !inLot(ex, ez, 1) && !inBig(ex, ez, 6) && !built(ex, ez, 0.3);
        if (ok && (i % 2 === 0 || i === st.N - 1) && Math.hypot(x - VC[0], z - VC[1]) < 2600) {
          const ry = H(x, z) + lift, h = hb * (0.75 + 0.5 * Math.sin(st.cum[i] * 0.21 + r.id) * Math.sin(st.cum[i] * 0.07));
          const pts = [[e, ry - 0.02, 0.72], [e + 0.45, ry + h * 0.85, 0.9], [e + 1.05, ry + h * 0.8, 1], [e + 1.9, null, 1]];
          const vb = base();
          for (const [o, yy, c] of pts) {
            const px = x + nx * o, pz = z + nz * o;
            b.pos.push(px, yy ?? H(px, pz) + 0.05, pz);
            b.col.push(c * 0.97, c * 0.98, c);
          }
          if (prev >= 0 && i - prev <= 2) for (let k = 0; k < 3; k++) {
            const a = vb - 4 + k, c = vb + k;
            if (sd > 0) b.idx.push(a, a + 1, c, a + 1, c + 1, c); else b.idx.push(a, c, a + 1, a + 1, c, c + 1);
          }
          prev = i;
        }
        if (r.c <= 1 && vc > 250) {
          const dy = H(x, z) - H(x + nx * (e + 6), z + nz * (e + 6));
          if (dy > 2.2 && ok) { if (!run) run = []; run.push(i); }
          else if (run) { if (run.length > 3) railRuns.push({ st, run, sd, half, lift }); run = null; }
        }
        if (r.c <= 2 && i % 10 === 5 && sd === ((r.id % 2) ? 1 : -1) && Math.hypot(x - VC[0], z - VC[1]) < 700 && ok) {
          const lx = x + nx * (e + 2.3), lz = z + nz * (e + 2.3);
          if (!built(lx, lz, 0.8) && !onRoad(lx, lz, 0.6)) lampSpots.push([lx, H(lx, lz), lz, Math.atan2(-nx, -nz)]);
        }
      }
      if (run && run.length > 3) railRuns.push({ st, run, sd, half, lift });
    }
  }
  for (const r of rivers) {
    if (r.pts.length < 2) continue;
    const st = strip(r.pts, r.w, 0, { step: 4 });
    ribbon('water', st, [-r.w / 2 - 1.5, -r.w / 4, 0, r.w / 4, r.w / 2 + 1.5], (x, z) => H(x, z) + 0.22, 14);
  }
  for (const rr of railRuns) {
    const { st, run, sd, half, lift } = rr;
    const sub = { out: run.map(i => st.out[i]), N: run.length, cum: run.map(i => st.cum[i]), nx: run.map(i => st.nx[i]), nz: run.map(i => st.nz[i]), mk: run.map(i => st.mk[i]) };
    const o = sd * (half + 0.45);
    ribbon('rail', sub, [o, o], (x, z, i, k) => H(...sub.out[i]) + lift + (k ? 0.82 : 0.52), 4);
    for (let i = 0; i < sub.N; i += 2) {
      const [x, z] = sub.out[i];
      postSpots.push([x + sub.nx[i] * (o + sd * 0.12), H(x, z) + lift, z + sub.nz[i] * (o + sd * 0.12), 0.8]);
    }
  }

  for (const l of lots) {
    const p = l.p;
    if (p.length < 3) continue;
    const tri = THREE.ShapeUtils.triangulateShape(p.map(([x, z]) => new THREE.Vector2(x, z)), []);
    const b = B('lots');
    const emit = (a, c, d, depth) => {
      const e1 = Math.hypot(a[0] - c[0], a[1] - c[1]), e2 = Math.hypot(c[0] - d[0], c[1] - d[1]), e3 = Math.hypot(d[0] - a[0], d[1] - a[1]);
      if (depth < 7 && Math.max(e1, e2, e3) > 4) {
        const m = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
        const ac = m(a, c), cd = m(c, d), da = m(d, a);
        emit(a, ac, da, depth + 1); emit(ac, c, cd, depth + 1); emit(da, cd, d, depth + 1); emit(ac, cd, da, depth + 1);
        return;
      }
      const i0 = b.pos.length / 3;
      if ((c[1] - a[1]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[1] - a[1]) < 0) [c, d] = [d, c];
      for (const q of [a, c, d]) { b.pos.push(q[0], H(q[0], q[1]) + 0.14, q[1]); b.uv.push(q[0] / 10, q[1] / 10); }
      b.idx.push(i0, i0 + 1, i0 + 2);
    };
    for (const [i, j, k] of tri) emit(p[i], p[j], p[k], 0);
  }

  flush('main', M.main); flush('minor', M.minor); flush('foot', M.foot); flush('lots', M.slush);
  const waterMesh = flush('water', M.water);
  flush('bank', M.snow); flush('fascia', M.concrete); flush('rail', M.steel, false);

  const rows = [];
  {
    const seq = [['S', 1], ['A'], ['S', -1], ['S', 1], ['A'], ['S', -1], ['S', 1], ['A'], ['S', -1]];
    const tot = seq.reduce((a, s) => a + (s[0] === 'S' ? 5 : 6.6), 0);
    let t = -LW / 2 + (LW - tot) / 2, aisles = [];
    const bands = [];
    for (const s of seq) { const w = s[0] === 'S' ? 5 : 6.6; bands.push({ k: s[0], f: s[1], t0: t, t1: t + w }); if (s[0] === 'A') aisles.push(t + w / 2); t += w; }
    let ai = 0;
    for (const b of bands) {
      if (b.k === 'A') { ai++; continue; }
      const tA = b.f > 0 ? aisles[ai] : aisles[ai - 1];
      const row = { t0: b.t0, t1: b.t1, tc: (b.t0 + b.t1) / 2, tA, f: Math.sign(tA - (b.t0 + b.t1) / 2), stalls: [], segs: [] };
      for (const sg of [-1, 1]) {
        const a = 4.2, e = LL / 2 - 8.5, n = Math.floor((e - a) / 2.5), s0 = sg * (a + ((e - a) - n * 2.5) / 2 + 1.25);
        row.segs.push(sg > 0 ? [s0 - 1.25, s0 - 1.25 + n * 2.5] : [s0 + 1.25 - n * 2.5, s0 + 1.25]);
        for (let k = 0; k < n; k++) row.stalls.push({ s: s0 + sg * k * 2.5, row });
      }
      rows.push(row);
    }
  }
  const stalls = rows.flatMap(r => r.stalls);
  {
    const geo = new THREE.BufferGeometry();
    const c = [[-LL / 2, -LW / 2], [LL / 2, -LW / 2], [LL / 2, LW / 2], [-LL / 2, LW / 2]].map(([s, t]) => toW(s, t));
    geo.setAttribute('position', new THREE.Float32BufferAttribute(c.flatMap(([x, z]) => [x, LY + 0.07, z]), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setIndex([0, 2, 1, 0, 3, 2]);
    geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) < 0) { geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); }
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: lotTexture(LL, LW, rows, [0, -LL / 2 + 4, LL / 2 - 4]), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const kit = [];
  const put = (geo, mat, x, y, z, ry = 0, shadow = true) => { const g = geo.clone(); g.rotateY(ry); g.translate(x, y, z); kit.push([g, mat, shadow]); };
  const lotAng = Math.atan2(U[0], U[1]);
  {
    const b = B('lotbank');
    const ring = [];
    const per = 2 * (LL + LW), n = Math.ceil(per / 2);
    for (let i = 0; i <= n; i++) {
      let d = i / n * per, s, t, ns, nt;
      if (d < LL) { s = -LL / 2 + d; t = LW / 2; ns = 0; nt = 1; }
      else if ((d -= LL) < LW) { s = LL / 2; t = LW / 2 - d; ns = 1; nt = 0; }
      else if ((d -= LW) < LL) { s = LL / 2 - d; t = -LW / 2; ns = 0; nt = -1; }
      else { d -= LL; s = -LL / 2; t = -LW / 2 + d; ns = -1; nt = 0; }
      const gap = (t < -LW / 2 + 0.1 && Math.abs(s) < 6) || (t < -LW / 2 + 0.1 && Math.abs(s + 18) < 1.6);
      ring.push({ s, t, ns, nt, gap, h: 0.8 + 0.6 * Math.abs(Math.sin(i * 0.37)) * Math.abs(Math.sin(i * 0.11 + 1)) });
    }
    let prev = -1;
    ring.forEach((q, i) => {
      if (q.gap) { prev = -1; return; }
      const vb = b.pos.length / 3;
      for (const [o, dh, c] of [[-0.1, 0, 0.75], [0.5, 0.75, 0.9], [1.2, 1, 0.98], [2.2, 0.55, 1], [3.4, 0, 1]]) {
        const [x, z] = toW(q.s + q.ns * o, q.t + q.nt * o);
        b.pos.push(x, LY + 0.06 + q.h * dh, z);
        b.col.push(c * 0.97, c * 0.98, c);
      }
      if (prev >= 0) for (let k = 0; k < 4; k++) { const a = vb - 5 + k, c = vb + k; b.idx.push(a, a + 1, c, a + 1, c + 1, c); }
      prev = i;
    });
    flush('lotbank', M.snow);
    const heap = new THREE.IcosahedronGeometry(1, 2);
    const hp = heap.attributes.position, hr = rng(5);
    for (let i = 0; i < hp.count; i++) { const y = hp.getY(i), k = 1 + (hr() - 0.5) * 0.25; hp.setXYZ(i, hp.getX(i) * k, Math.max(-0.2, y) * k, hp.getZ(i) * k); }
    heap.computeVertexNormals();
    paint(heap, 0xf3f6fa);
    for (const [s, t, sc] of [[-LL / 2 + 3, LW / 2 - 3.5, 4.2], [LL / 2 - 3.5, LW / 2 - 3, 3.8], [LL / 2 - 3, -LW / 2 + 4, 3.2], [-LL / 2 + 3, -LW / 2 + 3, 2.8]]) {
      const [x, z] = toW(s, t), g = heap.clone();
      g.scale(sc * 1.5, sc * 0.75, sc);
      put(g, M.snow, x, LY, z, lotAng + s);
    }
  }
  const lampGeo = {
    pole: new THREE.CylinderGeometry(0.06, 0.09, 6, 8).translate(0, 3, 0),
    arm: new THREE.BoxGeometry(0.08, 0.08, 1.1).translate(0, 5.95, 0.5),
    head: new THREE.BoxGeometry(0.34, 0.14, 0.6).translate(0, 5.9, 1.05),
    glow: new THREE.BoxGeometry(0.26, 0.03, 0.5).translate(0, 5.82, 1.05),
    mast: new THREE.CylinderGeometry(0.1, 0.16, 9, 10).translate(0, 4.5, 0),
    mastHead: new THREE.BoxGeometry(0.5, 0.18, 0.9).translate(0, 8.95, 0.65),
    mastGlow: new THREE.BoxGeometry(0.4, 0.03, 0.75).translate(0, 8.85, 0.65)
  };
  const mastSpots = [];
  const se = LL / 2 - 7.4;
  for (const [s, t] of [[-se, -LW / 2 + 2], [se, -LW / 2 + 2], [-se, LW / 2 - 2], [se, LW / 2 - 2], [-se, rows[2].t0], [se, rows[2].t0], [-se, rows[4].t0], [se, rows[4].t0]]) mastSpots.push(toW(s, t));
  for (const [x, z] of mastSpots) for (const a of [0, Math.PI]) {
    put(lampGeo.mastHead, M.lampHead, x, LY, z, lotAng + a + Math.PI / 2);
    put(lampGeo.mastGlow, M.lampGlow, x, LY, z, lotAng + a + Math.PI / 2, false);
  }
  for (const [x, z] of mastSpots) put(lampGeo.mast, M.pole, x, LY, z);
  for (const [x, y, z, h] of lampSpots) {
    put(lampGeo.pole, M.pole, x, y - 0.2, z, h);
    put(lampGeo.arm, M.pole, x, y - 0.2, z, h);
    put(lampGeo.head, M.lampHead, x, y - 0.2, z, h);
    put(lampGeo.glow, M.lampGlow, x, y - 0.2, z, h, false);
  }
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 5, 1, true).translate(0, 0.5, 0);
  for (const [x, y, z, hh] of postSpots) { const g = postGeo.clone(); g.scale(1, hh, 1); g.translate(x, y, z); kit.push([g, M.post, true]); }
  {
    const [ex, ez] = toW(9, -LW / 2 - 2.5);
    put(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8).translate(0, 1.6, 0), M.post, ex, H(ex, ez), ez);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.75), new THREE.MeshStandardMaterial({ map: signTexture(['Skiparkplatz', 'Talstation ↑', stalls.length + ' Plätze']), roughness: 0.5, side: THREE.DoubleSide }));
    sign.position.set(ex, H(ex, ez) + 3.0, ez);
    sign.rotation.y = Math.atan2(-V[0], -V[1]);
    group.add(sign);
    const [mx, mz] = toW(-15, -LW / 2 + 1.4);
    put(new THREE.BoxGeometry(0.7, 1.6, 0.45).translate(0, 0.8, 0), new THREE.MeshStandardMaterial({ color: 0x5b6470, roughness: 0.5, metalness: 0.4 }), mx, LY, mz, lotAng);
    put(new THREE.BoxGeometry(0.74, 0.22, 0.5).translate(0, 1.7, 0), new THREE.MeshStandardMaterial({ color: 0x1d4f9c, roughness: 0.5 }), mx, LY, mz, lotAng);
    put(new THREE.BoxGeometry(0.4, 0.3, 0.02).translate(0, 1.25, -0.235), M.lampGlow, mx, LY, mz, lotAng, false);
    const fr = rng(9), plank = W.plank;
    for (let s = -LL / 2; s <= LL / 2 + 0.01; s += 2.5) {
      const [x, z] = toW(s, LW / 2 + 4.2);
      put(new THREE.BoxGeometry(0.12, 1.25, 0.12).translate(0, 0.62, 0), W.plankDark, x, H(x, z) - 0.1, z, lotAng + (fr() - 0.5) * 0.1);
      if (s < LL / 2 - 0.1) {
        const [x2, z2] = toW(s + 1.25, LW / 2 + 4.2), y2 = H(x2, z2);
        for (const hy of [0.45, 0.95]) put(new THREE.BoxGeometry(0.04, 0.1, 2.55).translate(0, hy, 0), plank, x2, y2 - 0.1, z2, lotAng);
      }
    }
  }
  {
    const byMat = new Map();
    for (const [g, m, sh] of kit) { const k = m.uuid + sh; if (!byMat.has(k)) byMat.set(k, { m, sh, list: [] }); byMat.get(k).list.push(g.index ? g.toNonIndexed() : g); }
    for (const { m, sh, list } of byMat.values()) {
      const cols = list.some(g => g.attributes.color);
      const geo = mergeGeometries(list.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); if (cols && !g.attributes.color) paint(g, 0xffffff); if (!cols && g.attributes.color) g.deleteAttribute('color'); return g; }));
      if (m.map) worldUV(geo, 1.5);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = sh; mesh.receiveShadow = true;
      group.add(mesh);
    }
  }

  const fleet = {};
  const CAP = { hatch: 420, wagon: 420, suv: 420, van: 220, bus: 8 };
  const detailMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.3 });
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.55 });
  for (const k of [...KINDS, 'bus']) {
    const g = carGeo(k);
    const body = new THREE.InstancedMesh(g.body, bodyMat, CAP[k]), det = new THREE.InstancedMesh(g.detail, detailMat, CAP[k]);
    body.instanceMatrix.setUsage(THREE.DynamicDrawUsage); det.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    body.setColorAt(0, new THREE.Color());
    for (const m of [body, det]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.count = 0; group.add(m); }
    fleet[k] = { body, det, S: g.S, roofY: g.roofY, n: 0 };
  }
  const extraGeo = new THREE.BoxGeometry(1, 1, 1);
  const snowCap = new THREE.InstancedMesh(extraGeo, new THREE.MeshStandardMaterial({ color: 0xf6f9fc, roughness: 0.9 }), 1400);
  const roofBox = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.5, 1, 3, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.35, metalness: 0.3 }), 1400);
  const skiCarry = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.05, 1.7), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }), 200);
  skiCarry.setColorAt(0, new THREE.Color());
  for (const m of [snowCap, roofBox, skiCarry]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.castShadow = true; group.add(m); }

  let seed = 1;
  function newCar(r = Math.random) {
    const x = r();
    const kind = x < 0.3 ? 'hatch' : x < 0.62 ? 'wagon' : x < 0.9 ? 'suv' : 'van';
    return { kind, color: PAINT[(r() * PAINT.length) | 0], box: r() < 0.22, snow: r() < 0.55 ? 0.03 + r() * 0.1 : 0, n: 1 + (r() < 0.8 ? 1 : 0) + (r() < 0.35 ? 1 : 0) + (r() < 0.2 ? 1 : 0), x: 0, y: 0, z: 0, h: 0, p: 0, seed: seed++ };
  }

  function makeRoute(raw, o = {}) {
    let pts = raw.map(p => [p[0], p[1], p[2] ?? 0]);
    for (let it = 0; it < (o.smooth ?? 2); it++) {
      const q = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25, a[2] * 0.75 + b[2] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75, a[2] * 0.25 + b[2] * 0.75]);
      }
      q.push(pts[pts.length - 1]);
      pts = q;
    }
    const xs = [], zs = [], ls = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az, al] = pts[i], [bx, bz, bl] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(l / 1));
      for (let k = 0; k < n; k++) { const t = k / n; xs.push(ax + (bx - ax) * t); zs.push(az + (bz - az) * t); ls.push(al + (bl - al) * t); }
    }
    xs.push(pts[pts.length - 1][0]); zs.push(pts[pts.length - 1][1]); ls.push(pts[pts.length - 1][2]);
    const N = xs.length, X = new Float32Array(N), Z = new Float32Array(N), Y = new Float32Array(N), Vv = new Float32Array(N), S = new Float32Array(N);
    const lane = Float32Array.from(ls);
    for (let it = 0; it < 25; it++) for (let i = 1; i < N - 1; i++) lane[i] = (lane[i - 1] + lane[i] * 2 + lane[i + 1]) / 4;
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 2), b = Math.min(N - 1, i + 2);
      let dx = xs[b] - xs[a], dz = zs[b] - zs[a];
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      X[i] = xs[i] - dz * lane[i]; Z[i] = zs[i] + dx * lane[i];
    }
    for (let i = 0; i < N; i++) { if (i) S[i] = S[i - 1] + Math.hypot(X[i] - X[i - 1], Z[i] - Z[i - 1]); Y[i] = o.flat ? LY + 0.07 : surfaceAt(X[i], Z[i]) - 0.03; }
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 3), b = Math.min(N - 1, i + 3);
      const h1 = Math.atan2(X[i] - X[a], Z[i] - Z[a]), h2 = Math.atan2(X[b] - X[i], Z[b] - Z[i]);
      let d = Math.abs(h2 - h1); if (d > Math.PI) d = 2 * Math.PI - d;
      const k = d / Math.max(1, S[b] - S[a]);
      const road = lane[i] > 0.5, far = Math.hypot(X[i] - VC[0], Z[i] - VC[1]) > 650;
      Vv[i] = Math.min(o.vmax ?? (road ? (far ? 19 : 12.5) : 3.6), Math.sqrt(2.4 / Math.max(k, 1e-4)));
    }
    if (o.v0 !== undefined) Vv[0] = o.v0;
    if (o.v1 !== undefined) Vv[N - 1] = o.v1;
    for (let i = 1; i < N; i++) Vv[i] = Math.min(Vv[i], Math.sqrt(Vv[i - 1] ** 2 + 2 * 1.8 * (S[i] - S[i - 1])));
    for (let i = N - 2; i >= 0; i--) Vv[i] = Math.min(Vv[i], Math.sqrt(Vv[i + 1] ** 2 + 2 * 2.6 * (S[i + 1] - S[i])));
    return { X, Y, Z, V: Vv, S, N, len: S[N - 1] };
  }
  function sample(r, s, out) {
    s = Math.max(0, Math.min(r.len - 0.001, s));
    let lo = 0, hi = r.N - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.S[m] <= s) lo = m; else hi = m; }
    const t = (s - r.S[lo]) / ((r.S[hi] - r.S[lo]) || 1);
    out.x = r.X[lo] + (r.X[hi] - r.X[lo]) * t; out.y = r.Y[lo] + (r.Y[hi] - r.Y[lo]) * t; out.z = r.Z[lo] + (r.Z[hi] - r.Z[lo]) * t;
    out.v = r.V[lo] + (r.V[hi] - r.V[lo]) * t;
    return out;
  }
  const qa = {}, qb = {};
  function pose(car, r, s, flip, half) {
    sample(r, s + half, qa); sample(r, s - half, qb);
    const dx = qa.x - qb.x, dz = qa.z - qb.z, l = Math.hypot(dx, dz) || 1;
    car.x = (qa.x + qb.x) / 2; car.z = (qa.z + qb.z) / 2; car.y = (qa.y + qb.y) / 2;
    car.h = Math.atan2(dx, dz) + (flip ? Math.PI : 0);
    car.p = Math.atan2(qb.y - qa.y, l) * (flip ? -1 : 1);
  }

  const ROAD_IN = data.drive.map(d => makeRoute(d.map((p, i) => [p[0], p[1], i > d.length - 3 ? 0 : LANE]), { v1: 3.4 }));
  const ROAD_OUT = data.drive.map(d => makeRoute([...d].reverse().map((p, i) => [p[0], p[1], i < 2 ? 0 : LANE]), { v0: 3.4 }));
  const LOCAL = data.local.map(d => makeRoute(d.map(p => [p[0], p[1], LANE]), { v0: 0, v1: 0 }));
  const wl = (s, t) => { const [x, z] = toW(s, t); return [x, z, 0]; };
  function lotIn(st) {
    const r = st.row, sg = Math.sign(st.s), f = r.f, tA = r.tA;
    return makeRoute([wl(0, -LW / 2), wl(-1.6, -LW / 2 + 2), wl(-1.6, tA - 4), wl(sg * 3.5, tA + sg * 1.3), wl(st.s - sg * 6, tA + sg * 1.3), wl(st.s - sg * 1.6, tA - f * 1.2), wl(st.s, r.tc + f * 0.6), wl(st.s, r.tc - f * 0.15)], { flat: true, smooth: 3, v0: 3.4, v1: 0, vmax: 3.6 });
  }
  function lotBack(st) {
    const r = st.row, sg = Math.sign(st.s), f = r.f, tA = r.tA;
    return makeRoute([wl(st.s, r.tc - f * 0.15), wl(st.s, tA - f * 1.4), wl(st.s + sg * 2.5, tA + f * 0.2), wl(st.s + sg * 4.2, tA + f * 0.5)], { flat: true, smooth: 3, v0: 0, v1: 0, vmax: 1.6 });
  }
  function lotOut(st) {
    const r = st.row, sg = Math.sign(st.s), tA = r.tA;
    return makeRoute([wl(st.s + sg * 4.2, tA + r.f * 0.5), wl(st.s, tA - sg * 1.3), wl(sg * 4, tA - sg * 1.3), wl(1.6, tA - 4.5), wl(1.6, -LW / 2 + 2), wl(0, -LW / 2)], { flat: true, smooth: 3, v0: 0, v1: 3.4, vmax: 3.6 });
  }
  const walkBase = [...data.walk];
  let kasse = null;

  const parked = [];
  const statics = [];
  {
    const r = rng(404);
    for (const l of lots) {
      const p = l.p;
      let best = null;
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(ang), s = Math.sin(ang);
        let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
        for (const [x, z] of p) { const u = x * c + z * s, v = -x * s + z * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
        const area = (u1 - u0) * (v1 - v0);
        if (!best || area < best.area) best = { area, c, s, u0, u1, v0, v1 };
      }
      const { c, s, u0, u1, v0, v1 } = best, wid = v1 - v0, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
      const fill = Math.hypot(cx - VC[0], cz - VC[1]) < 700 ? 0.62 : 0.2;
      const along = wid < 4.6, rowsV = along ? [(v0 + v1) / 2] : wid >= 10.5 ? [v0 + 2.6, v1 - 2.6] : [(v0 + v1) / 2];
      const step = along ? 5.6 : 2.55;
      for (const v of rowsV) for (let u = u0 + step / 2 + 0.4; u < u1 - step / 2; u += step) {
        const x = u * c - v * s, z = u * s + v * c;
        if (!inPoly(p, x, z) || r() > fill) continue;
        const car = newCar(r);
        const hd = along ? Math.atan2(c, s) + (r() < 0.5 ? Math.PI : 0) : Math.atan2(-s, c) + (v > (v0 + v1) / 2 ? 0 : Math.PI);
        Object.assign(car, { x, z, y: H(x, z) + 0.12, h: hd, p: 0 });
        statics.push(car);
      }
    }
  }

  const moving = [];
  const walkers = [];
  const routeCache = new Map();
  const cached = (k, f) => { if (!routeCache.has(k)) routeCache.set(k, f()); return routeCache.get(k); };
  let src = null, want = 0, free = { t: 0, churn: 6 }, spawnT = 0, localT = 4, busT = 30;
  const occupied = new Set();
  const lotCars = () => parked.length + moving.filter(m => m.to === 'park').length;

  function placeStall(car, st) {
    const r = st.row, f = r.f;
    const [x, z] = toW(st.s, r.tc - f * 0.15);
    Object.assign(car, { x, z, y: LY + 0.07, h: Math.atan2(-V[0] * f, -V[1] * f), p: 0, stall: st });
  }
  function freeStall(r = Math.random) {
    const open = stalls.filter(s => !occupied.has(s));
    if (!open.length) return null;
    open.sort((a, b) => (Math.abs(a.s) + Math.abs(a.row.tc + LW / 2) * 0.6) - (Math.abs(b.s) + Math.abs(b.row.tc + LW / 2) * 0.6));
    return open[Math.min(open.length - 1, Math.floor(r() * r() * open.length))];
  }
  function walkPath(car) {
    if (!kasse) return null;
    const st = car.stall, r = st.row, sg = Math.sign(st.s) || 1;
    const pts = [toW(st.s + 1.4, r.tc), toW(st.s + 1.4, r.tA + (r.f > 0 ? -1 : 1) * 1.2), toW(sg * 2.6, r.tA - r.f * 1.2), toW(sg * 2.6, -LW / 2 + 1.5), ...walkBase.slice(1), kasse];
    return makeRoute(pts.map(p => [p[0], p[1], 0]), { smooth: 1 });
  }
  function spawnWalkers(car, dir, r = Math.random, mid = false) {
    if (!crowdApi || walkers.length > 140) return 0;
    const R = walkPath(car);
    if (!R) return 0;
    let n = 0;
    for (let i = 0; i < car.n; i++) {
      const m = crowdApi.make(car.seed * 31 + i);
      const w = { m, r: R, dir, s: dir > 0 ? -i * 1.4 : R.len + i * 1.4, v: (m.kid ? 1.0 : 1.15) + r() * 0.2, lane: (i - (car.n - 1) / 2) * 0.55, car, ski: m.type === 'ski' && !m.kid ? 1 : m.type === 'ski' ? 0.75 : 0 };
      if (mid) w.s = r() * R.len;
      walkers.push(w);
      n++;
    }
    return n;
  }
  function arrive(instant, r = Math.random) {
    const st = freeStall(r);
    if (!st) return false;
    occupied.add(st);
    const car = newCar(r);
    car.stall = st;
    if (instant) { placeStall(car, st); parked.push(car); if (instant === 'walk') spawnWalkers(car, 1, r, true); return true; }
    const i = r() < 0.72 ? 0 : 1;
    car.snow = 0;
    car.phases = [{ r: ROAD_IN[i] }, { r: cached('in' + stalls.indexOf(st), () => lotIn(st)) }];
    car.pi = 0; car.s = 0; car.to = 'park';
    if (moving.some(m => m.phases[0].r === ROAD_IN[i] && m.pi === 0 && m.s < 18)) { occupied.delete(st); return false; }
    moving.push(car);
    return true;
  }
  function depart(instant, r = Math.random) {
    const cand = parked.filter(c => !c.leaving);
    if (!cand.length) return false;
    const car = cand[(r() * cand.length) | 0];
    if (instant) { parked.splice(parked.indexOf(car), 1); occupied.delete(car.stall); walkers.forEach(w => { if (w.car === car) w.gone = true; }); return true; }
    car.leaving = true;
    car.wait = spawnWalkers(car, -1, r);
    if (!car.wait) go(car);
    return true;
  }
  function go(car) {
    parked.splice(parked.indexOf(car), 1);
    const st = car.stall, i = Math.random() < 0.72 ? 0 : 1, k = stalls.indexOf(st);
    car.phases = [{ r: cached('back' + k, () => lotBack(st)), flip: true }, { r: cached('out' + k, () => lotOut(st)) }, { r: ROAD_OUT[i] }];
    car.pi = 0; car.s = 0; car.to = 'gone'; car.pause = 1.2;
    moving.push(car);
    occupied.delete(st);
  }
  function local(bus) {
    const r = bus ? LOCAL[LOCAL.length - 2 + (Math.random() < 0.5 ? 0 : 1)] : LOCAL[(Math.random() * LOCAL.length) | 0];
    if (moving.some(m => m.phases[0].r === r && m.s < 25)) return;
    const car = newCar();
    if (bus) Object.assign(car, { kind: 'bus', color: 0xe8c21a, box: false, snow: 0 });
    car.phases = [{ r }]; car.pi = 0; car.s = 0; car.to = 'gone';
    moving.push(car);
  }

  let crowdApi = null;
  const tmp = {};
  function step(dt) {
    const target = src ? src() : null;
    if (target === null) {
      free.t += dt;
      want = Math.round(stalls.length * (0.7 + 0.08 * Math.sin(free.t / 240)));
      free.churn -= dt;
      if (free.churn < 0) { free.churn = 14 + Math.random() * 18; if (parked.length > want - 6) depart(false); }
    } else want = Math.round(stalls.length * Math.max(0, Math.min(1, target)));
    const have = lotCars();
    const diff = want - have;
    if (diff > 8) for (let i = 0; i < diff - 8; i++) arrive('walk');
    if (diff < -8) for (let i = 0; i < -diff - 8; i++) depart(true);
    spawnT -= dt;
    if (spawnT <= 0) {
      if (diff > 0) { arrive(false); spawnT = Math.max(1.6, 9 / Math.sqrt(diff)); }
      else if (diff < 0) { depart(false); spawnT = Math.max(2.2, 12 / Math.sqrt(-diff)); }
      else spawnT = 1;
    }
    localT -= dt;
    if (localT <= 0) { local(false); localT = 6 + Math.random() * 12; }
    busT -= dt;
    if (busT <= 0) { local(true); busT = 70 + Math.random() * 60; }
    for (let i = moving.length - 1; i >= 0; i--) {
      const c = moving[i];
      if (c.pause > 0) { c.pause -= dt; continue; }
      const ph = c.phases[c.pi];
      sample(ph.r, c.s, tmp);
      c.s += Math.max(0.7, tmp.v) * dt;
      if (c.s >= ph.r.len) {
        c.pi++; c.s = 0;
        if (c.pi >= c.phases.length) {
          moving.splice(i, 1);
          if (c.to === 'park') { placeStall(c, c.stall); parked.push(c); c.phases = null; spawnWalkers(c, 1); }
          continue;
        }
      }
      const p2 = c.phases[c.pi];
      pose(c, p2.r, c.s, p2.flip, SHAPES[c.kind].wb / 2);
    }
    for (let i = walkers.length - 1; i >= 0; i--) {
      const w = walkers[i];
      w.s += w.v * w.dir * dt;
      const done = w.dir > 0 ? w.s >= w.r.len : w.s <= 0;
      if (done || w.gone) {
        walkers.splice(i, 1);
        if (w.dir < 0 && !w.gone && w.car.leaving && --w.car.wait <= 0 && parked.includes(w.car)) go(w.car);
        continue;
      }
      const s = Math.max(0, Math.min(w.r.len, w.s));
      sample(w.r, s + 0.6, qa); sample(w.r, s - 0.6, qb);
      let dx = qa.x - qb.x, dz = qa.z - qb.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      const x = (qa.x + qb.x) / 2 - dz * w.lane, z = (qa.z + qb.z) / 2 + dx * w.lane;
      w.m.pos.set(x, Math.max(H(x, z), inBig(x, z, 0) ? LY + 0.07 : -1e9) + Math.abs(Math.sin(w.s * 3.3)) * 0.035, z);
      w.m.heading = Math.atan2(dx, dz) + (w.dir < 0 ? Math.PI : 0);
      w.m.foot = true; w.m.cab = 0; w.m.lean = 0; w.m.tuck = 0; w.m.br = 0; w.m.speed = 0;
    }
  }

  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), Pv = new THREE.Vector3(), Sv = new THREE.Vector3(), Cc = new THREE.Color();
  const O4 = new THREE.Matrix4(), T4 = new THREE.Matrix4();
  function draw(camera) {
    for (const k in fleet) fleet[k].n = 0;
    let ns = 0, nb = 0;
    const cx = camera.position.x, cz = camera.position.z;
    const all = [statics, parked, moving];
    for (const list of all) for (const c of list) {
      const d = Math.hypot(c.x - cx, c.z - cz);
      if (d > 3200) continue;
      const F = fleet[c.kind];
      if (F.n >= CAP[c.kind]) continue;
      E.set(c.p, c.h, 0); Q.setFromEuler(E); Pv.set(c.x, c.y, c.z); Sv.set(1, 1, 1);
      M4.compose(Pv, Q, Sv);
      F.body.setMatrixAt(F.n, M4); F.det.setMatrixAt(F.n, M4); F.body.setColorAt(F.n, Cc.setHex(c.color));
      F.n++;
      if (d > 900) continue;
      const S = F.S;
      if (c.box && nb < 1400) {
        T4.compose(Pv.set(0, F.roofY + 0.25, -0.15), Q.identity(), Sv.set(0.85, 0.38, (S.L * 0.45) / 2));
        O4.multiplyMatrices(M4, T4);
        roofBox.setMatrixAt(nb++, O4);
      }
      if (c.snow && !c.phases && ns < 1400) {
        T4.compose(Pv.set(0, F.roofY + c.snow / 2 + (c.box ? 0 : 0), -0.25), Q.identity(), Sv.set(S.W * 0.86, c.snow, S.L * 0.42));
        O4.multiplyMatrices(M4, T4);
        snowCap.setMatrixAt(ns++, O4);
        if (c.kind !== 'van') {
          T4.compose(Pv.set(0, S.body[4][1] - 0.04 + c.snow / 2, (S.body[3][0] + S.body[4][0]) / 2), Q.identity(), Sv.set(S.W * 0.86, c.snow * 0.8, S.body[3][0] - S.body[4][0]));
          O4.multiplyMatrices(M4, T4);
          snowCap.setMatrixAt(ns++, O4);
        }
      }
    }
    for (const k in fleet) {
      const F = fleet[k];
      F.body.count = F.det.count = F.n;
      F.body.instanceMatrix.needsUpdate = F.det.instanceMatrix.needsUpdate = true;
      if (F.body.instanceColor) F.body.instanceColor.needsUpdate = true;
    }
    snowCap.count = ns; roofBox.count = nb;
    snowCap.instanceMatrix.needsUpdate = roofBox.instanceMatrix.needsUpdate = true;
    let nk = 0;
    for (const w of walkers) {
      if (!w.ski || nk >= 200) continue;
      const m = w.m;
      if (Math.hypot(m.pos.x - cx, m.pos.z - cz) > 350) continue;
      const sc = m.scale, h = m.heading;
      E.set(-1.05, h, 0.25); Q.setFromEuler(E);
      Pv.set(m.pos.x + Math.cos(h) * 0.24 * sc, m.pos.y + 1.42 * sc, m.pos.z - Math.sin(h) * 0.24 * sc);
      M4.compose(Pv, Q, Sv.set(1, 1, w.ski));
      skiCarry.setMatrixAt(nk, M4); skiCarry.setColorAt(nk, Cc.setHex(m.look.Gear)); nk++;
    }
    skiCarry.count = nk;
    skiCarry.instanceMatrix.needsUpdate = true;
    if (skiCarry.instanceColor) skiCarry.instanceColor.needsUpdate = true;
  }

  for (let i = 0; i < Math.round(stalls.length * 0.7); i++) arrive(true, rng(1000 + i));

  const blocked = (x, z, m) => onRoad(x, z, m + 0.6) || inLot(x, z, m + 1) || inBig(x, z, m + 7);
  let flowT = 0;
  let tscale = 1;
  function update(dt, camera) {
    const t = Math.min(dt, 0.1) * tscale, n = Math.max(1, Math.ceil(t / 0.1));
    for (let i = 0; i < n; i++) step(t / n);
    flowT += dt;
    if (waterMesh) M.water.map.offset.x = -flowT * 0.09;
    const d = Math.hypot(camera.position.x - VC[0], camera.position.z - VC[1]);
    if (d < 6000) draw(camera);
  }
  function attach(crowd, lift) {
    crowdApi = crowd;
    const sec = lift.sections.find(s => s.id === 'rossbach');
    if (sec) {
      kasse = [sec.a[0] - sec.dx * 7 - sec.px * 19, sec.a[1] - sec.dz * 7 - sec.pz * 19];
      const w = data.walk.filter(p => Math.hypot(p[0] - sec.a[0], p[1] - sec.a[1]) > 22);
      walkBase.length = 0; walkBase.push(...w);
    }
    crowd.setExtra?.(() => walkers.map(w => w.m));
  }
  return { group, update, blocked, attach, setSource: fn => { src = fn; }, setScale: k => { tscale = Math.max(1, k || 1); }, lot: { center: P.c, stalls: stalls.length } };
}
