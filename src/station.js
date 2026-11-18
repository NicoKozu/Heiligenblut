import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials, worldUV } from './textures.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _a = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const T = (x, y, z, ry = 0, rx = 0, rz = 0) => _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s);
const BOX = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const CYL = (r, h, n = 10) => new THREE.CylinderGeometry(r, r, h, n);
const LQ = 13;

function kit() {
  const parts = new Map();
  const add = (geo, mat, m) => { const g = geo.clone().applyMatrix4(m); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); };
  const bar = (mat, x1, y1, z1, x2, y2, z2, r) => {
    _a.set(x2 - x1, y2 - y1, z2 - z1);
    const l = _a.length();
    add(CYL(r, l, 6), mat, _m.compose(_p.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2), _q.setFromUnitVectors(UP, _a.normalize()), _s));
  };
  const build = () => {
    const g = new THREE.Group();
    for (const [mat, gs] of parts) {
      const mesh = new THREE.Mesh(mergeGeometries(gs), mat);
      mesh.castShadow = !mat.transparent;
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    return g;
  };
  return { add, bar, build };
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const FONT = 'Segoe UI, Helvetica, Arial, sans-serif';
const fmt = n => Math.round(n).toLocaleString('de-AT');

function signMat(title, sub) {
  const map = canvasTex(1024, 148, (g, w, h) => {
    g.fillStyle = '#16304f';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8202a';
    g.fillRect(0, h - 12, w, 12);
    g.strokeStyle = '#d9dee4';
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.font = `700 70px ${FONT}`;
    g.fillText(title.toUpperCase(), w / 2, 78);
    g.fillStyle = '#f2c94c';
    g.font = `500 34px ${FONT}`;
    g.fillText(sub, w / 2, 122);
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.55, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.12 });
}

function boardMat(sec, ride, hA, hB) {
  const map = canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8202a';
    g.fillRect(0, 0, w, 78);
    g.fillStyle = '#fff';
    g.font = `700 40px ${FONT}`;
    g.fillText(sec.name, 22, 52);
    g.fillStyle = '#16304f';
    g.font = `600 30px ${FONT}`;
    g.fillText('▲ ' + sec.to + '  ' + fmt(hB) + ' m', 22, 132);
    g.fillText('▼ ' + sec.from + '  ' + fmt(hA) + ' m', 22, 178);
    g.font = `400 26px ${FONT}`;
    g.fillStyle = '#333';
    g.fillText('Länge ' + fmt(sec.len) + ' m · ' + (ride ? 'Fahrzeit ' + ride.ride + ' min' : 'Kabinenbahn'), 22, 236);
    if (ride) g.fillText('Förderleistung ' + fmt(ride.cap) + ' P/h', 22, 276);
    g.fillText('Betrieb 8:30 – 16:30 Uhr', 22, 316);
    g.fillStyle = '#2e9e4f';
    g.beginPath();
    g.arc(w - 40, h - 40, 16, 0, 7);
    g.fill();
    g.strokeStyle = '#16304f';
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.7 });
}

function roofGeo(r, l) {
  return new THREE.CylinderGeometry(r, r, l * 2, 32, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, 0.28, 1);
}

export function createStationKit(terrain) {
  const tx = materials();
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const M = {
    steel: std(0x8d969e, { metalness: 0.55, roughness: 0.4 }),
    dark: std(0x2f363d, { metalness: 0.4, roughness: 0.5 }),
    roof: std(0xe3e6e8, { metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide }),
    glass: std(0xa9cbe0, { metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.32, depthWrite: false }),
    tint: std(0x3a4b58, { metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }),
    floor: std(0x44474b, { roughness: 0.95 }),
    chrome: std(0xc9ced3, { metalness: 0.8, roughness: 0.25 }),
    yellow: std(0xf2c200, { roughness: 0.7 }),
    blue: std(0x2d6fb0, { metalness: 0.3, roughness: 0.45 }),
    red: std(0xc8202a, { roughness: 0.6 }),
    white: std(0xf2f2ef, { roughness: 0.7 }),
    gold: std(0xf2c94c, { roughness: 0.6 }),
    green: std(0x22dd55, { emissive: 0x22dd55, emissiveIntensity: 1.2 }),
    bin: std(0x3f6b3a, { roughness: 0.7 }),
    plank: tx.plank, plankDark: tx.plankDark, stone: tx.stone, shingle: tx.shingle
  };
  const SKI = [0xf2c200, 0x1e88e5, 0xe53935, 0x212121, 0xffffff, 0x43a047].map(c => std(c, { roughness: 0.4 }));

  function hall(st, sec, y, title, sub, ends) {
    const hl = st.hl, hw = st.hw;
    const cx = st.c[0] + sec.dx * st.off, cz = st.c[1] + sec.dz * st.off;
    const g = new THREE.Group();
    g.position.set(cx, y, cz);
    g.rotation.y = sec.heading;
    let lo = y;
    for (const a of [-1, 1]) for (const b of [-1, 1]) lo = Math.min(lo, terrain.heightAt(cx + sec.dx * hl * a + sec.px * hw * b, cz + sec.dz * hl * a + sec.pz * hw * b));
    const depth = y - lo + 3, K = kit();
    K.add(worldUV(BOX(hw * 2, depth, hl * 2), 3), M.stone, T(0, 0.3 - depth / 2, 0));
    K.add(BOX(hw * 2 - 0.3, 0.1, hl * 2 - 0.3), M.floor, T(0, 0.35, 0));
    for (const a of [-1, -1 / 3, 1 / 3, 1]) for (const b of [-1, 1]) K.add(BOX(0.35, 7.2, 0.35), M.steel, T(b * (hw - 0.25), 3.9, a * (hl - 0.25)));
    for (const b of [-1, 1]) K.add(BOX(0.4, 0.55, hl * 2), M.dark, T(b * (hw - 0.2), 7.55, 0));
    for (const a of [-1, 1]) K.add(BOX(hw * 2, 0.55, 0.4), M.dark, T(0, 7.55, a * (hl - 0.2)));
    K.add(roofGeo(hw + 1.1, hl + 1.3), M.roof, T(0, 7.8, 0));
    for (let k = -2; k <= 2; k++) K.add(BOX(0.12, 0.08, hl * 2 + 2.6), M.steel, T(k * (hw + 1.1) * 0.3, 7.8 + 0.28 * Math.sqrt((hw + 1.1) ** 2 - (k * (hw + 1.1) * 0.3) ** 2) + 0.02, 0));
    const span = hl * 2 - 0.4, nz = Math.max(2, Math.round(span / 2.4));
    K.add(worldUV(BOX(0.3, 3.2, span), 1.5), M.plank, T(-hw + 0.15, 1.95, 0));
    K.add(BOX(0.06, 3.9, span), M.glass, T(-hw + 0.15, 5.45, 0));
    K.add(BOX(0.06, 2.4, span), M.glass, T(hw - 0.15, 6.2, 0));
    K.add(BOX(0.16, 0.16, span), M.dark, T(hw - 0.15, 5.0, 0));
    for (let i = 0; i <= nz; i++) {
      const z = -span / 2 + span * i / nz;
      K.add(BOX(0.12, 3.9, 0.12), M.dark, T(-hw + 0.15, 5.45, z));
      K.add(BOX(0.12, 2.4, 0.12), M.dark, T(hw - 0.15, 6.2, z));
    }
    const nx = Math.max(2, Math.round((hw * 2 - 0.4) / 2.4));
    for (const [a, rope] of [[-1, ends.back], [1, ends.front]]) {
      if (rope) continue;
      K.add(BOX(hw * 2 - 0.4, 2.4, 0.06), M.glass, T(0, 6.2, a * (hl - 0.15)));
      K.add(BOX(hw * 2 - 0.4, 0.16, 0.16), M.dark, T(0, 5.0, a * (hl - 0.15)));
      for (let i = 0; i <= nx; i++) K.add(BOX(0.12, 2.4, 0.12), M.dark, T(-hw + 0.2 + (hw * 2 - 0.4) * i / nx, 6.2, a * (hl - 0.15)));
    }
    g.add(K.build());
    const sm = signMat(title, sub), sg = new THREE.PlaneGeometry(9, 1.3);
    const signs = [[hw + 1.18, 8.3, 0, Math.PI / 2], [-hw - 1.18, 8.3, 0, -Math.PI / 2]];
    if (!ends.back) signs.push([0, 8.7, -hl - 1.36, Math.PI]);
    if (!ends.front) signs.push([0, 8.7, hl + 1.36, 0]);
    for (const [x, yy, z, r] of signs) {
      const s = new THREE.Mesh(sg, sm);
      s.position.set(x, yy, z);
      s.rotation.y = r;
      g.add(s);
    }
    g.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
    return { g, h: { x: cx, z: cz, dx: sec.dx, dz: sec.dz, hl, hw, top: y + 7.6 } };
  }

  function frame(E, o) {
    const lx = -o[1], lz = o[0], R = Math.atan2(o[0], o[1]);
    const P = (al, sd) => [E[0] + o[0] * al + lx * sd, E[1] + o[1] * al + lz * sd];
    const gh = (al, sd) => terrain.heightAt(...P(al, sd));
    return { P, R, gh, lx, lz };
  }

  function rail(K, sec, end, Y) {
    const pts = [], v = new THREE.Vector3(), E = end === 'a' ? sec.a : sec.b, u0 = end === 'a' ? sec.L : sec.upLen;
    for (let u = u0 - Math.PI * 3 - 13; u <= u0 + 13; u += 0.8) {
      sec.at(u, v);
      if (Math.abs((v.x - E[0]) * sec.dx + (v.z - E[1]) * sec.dz) > 12.5) continue;
      pts.push(new THREE.Vector3(v.x, Y + 0.32, v.z));
    }
    if (pts.length < 4) return;
    const curve = new THREE.CatmullRomCurve3(pts);
    K.add(new THREE.TubeGeometry(curve, pts.length * 2, 0.11, 6), M.steel, _m.identity());
    K.add(new THREE.TubeGeometry(curve, pts.length * 2, 0.08, 6).translate(0, 0.65, 0), M.dark, _m.identity());
    const tire = CYL(0.27, 0.13, 12).rotateZ(Math.PI / 2);
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i + 1], h = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
      K.add(tire, M.dark, T(pts[i].x, Y + 0.62, pts[i].z, h));
      if (i % 4 === 0) K.bar(M.steel, pts[i].x, Y + 1.0, pts[i].z, pts[i].x, Y + 2.35, pts[i].z, 0.07);
    }
  }

  function booth(K, F, al, sd, y) {
    const [x, z] = F.P(al, sd);
    K.add(worldUV(BOX(1.8, 1.1, 2.1), 1.2), M.plankDark, T(x, y + 0.55, z, F.R));
    K.add(BOX(1.76, 1.25, 2.06), M.tint, T(x, y + 1.72, z, F.R));
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const [px, pz] = F.P(al + b * 1.0, sd + a * 0.85);
      K.add(BOX(0.08, 1.25, 0.08), M.dark, T(px, y + 1.72, pz, F.R));
    }
    K.add(BOX(2.1, 0.18, 2.4), M.dark, T(x, y + 2.43, z, F.R));
    const [kx, kz] = F.P(al - 0.6, sd);
    K.add(BOX(1.4, 0.12, 0.5), M.dark, T(kx, y + 1.12, kz, F.R, -0.3));
    K.add(BOX(0.4, 0.05, 0.2), M.green, T(kx, y + 1.2, kz, F.R, -0.3));
  }

  function gates(K, F, al) {
    for (let i = 0; i < 6; i++) {
      const sd = -4.75 + i * 1.9, [x, z] = F.P(al, sd), gy = F.gh(al, sd);
      K.add(BOX(0.3, 1.05, 0.7), M.steel, T(x, gy + 0.52, z, F.R));
      K.add(BOX(0.34, 0.06, 0.75), M.dark, T(x, gy + 1.07, z, F.R));
      K.add(BOX(0.2, 0.05, 0.14), M.green, T(x, gy + 1.11, z, F.R));
      if (i < 5) for (let k = 0; k < 3; k++) {
        const a = (k - 1) * 1.05, [hx, hz] = F.P(al, sd + 0.16), [ax, az] = F.P(al + Math.sin(a) * 0.5, sd + 0.16 + Math.cos(a) * 0.5);
        K.bar(M.chrome, hx, gy + 0.82, hz, ax, gy + 0.82 + (k === 1 ? 0 : -0.22), az, 0.022);
      }
    }
  }

  function waiting(K, F, al0, sec, rideInfo, hA, hB, extra, s) {
    const W = 4.75, n = 6, rows = 10;
    const pos = new Float32Array((n + 1) * (rows + 1) * 3), uv = new Float32Array((n + 1) * (rows + 1) * 2), idx = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= n; i++) {
      const al = al0 + LQ * j / rows, sd = -W - 0.3 + (2 * W + 0.6) * i / n, [x, z] = F.P(al, sd), k = j * (n + 1) + i;
      pos.set([x, terrain.heightAt(x, z) + 0.07, z], k * 3);
      uv.set([sd / 2, al / 2], k * 2);
      if (i < n && j < rows) idx.push(k, k + 1, k + n + 1, k + 1, k + n + 2, k + n + 1);
    }
    const floor = new THREE.BufferGeometry();
    floor.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    floor.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    floor.setIndex(idx);
    floor.computeVertexNormals();
    K.add(floor, M.plankDark, _m.identity());
    for (const sd of [-W, W]) {
      let prev = null;
      for (let al = al0; al <= al0 + LQ + 0.01; al += 2.6) {
        const [x, z] = F.P(al, sd), y = terrain.heightAt(x, z);
        K.add(CYL(0.04, 1.1, 6), M.chrome, T(x, y + 0.55, z));
        if (prev) for (const h of [0.5, 1.05]) K.bar(M.chrome, prev[0], prev[2] + h, prev[1], x, y + h, z, 0.025);
        prev = [x, z, y];
      }
    }
    let H = -Infinity;
    for (const al of [al0, al0 + 5, al0 + 10]) for (const sd of [-5.3, 5.3]) H = Math.max(H, F.gh(al, sd));
    H += 3.1;
    const cl = 10.5, cm = al0 + cl / 2 - 0.3;
    for (const al of [al0 - 0.3, al0 + cl / 2 - 0.3, al0 + cl - 0.3]) for (const sd of [-5.3, 5.3]) {
      const [x, z] = F.P(al, sd), y = terrain.heightAt(x, z);
      K.add(worldUV(BOX(0.28, H - y + 0.3, 0.28), 1), M.plankDark, T(x, (H + y) / 2 - 0.15, z, F.R));
    }
    for (const sd of [-5.3, 5.3]) { const [x, z] = F.P(cm, sd); K.add(BOX(0.3, 0.35, cl + 0.6), M.plankDark, T(x, H + 0.1, z, F.R)); }
    const sl = Math.hypot(6, 1.5), ang = Math.atan2(1.5, 6);
    for (const s of [-1, 1]) {
      const [x, z] = F.P(cm, s * 3);
      K.add(worldUV(BOX(sl + 0.3, 0.14, cl + 1.4), 2), M.shingle, T(x, H + 1.05, z, F.R, 0, s * ang));
    }
    const [rx, rz] = F.P(cm, 0);
    K.add(BOX(0.25, 0.25, cl + 1.4), M.plankDark, T(rx, H + 1.8, rz, F.R));
    gates(K, F, al0 - 0.35);
    const [bx, bz] = F.P(al0 + 1.2, -6.9 * s), by = terrain.heightAt(bx, bz);
    for (const d of [-1.1, 1.1]) { const [px, pz] = F.P(al0 + 1.2 + d, -6.9 * s); K.add(CYL(0.06, 2.6, 8), M.dark, T(px, by + 1.3, pz)); }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), boardMat(sec, rideInfo, hA, hB));
    board.position.set(bx, by + 1.75, bz);
    board.rotation.y = F.R;
    board.castShadow = true;
    extra.push(board);
    const [ex, ez] = F.P(al0 + 9.5, -7.2 * s), ey = terrain.heightAt(ex, ez), [rx2, rz2] = F.P(al0 + 9.5, -7.42 * s);
    K.add(worldUV(BOX(0.45, 0.07, 2.2), 1), M.plank, T(ex, ey + 0.46, ez, F.R));
    K.add(worldUV(BOX(0.06, 0.45, 2.2), 1), M.plank, T(rx2, ey + 0.75, rz2, F.R));
    for (const d of [-0.9, 0.9]) { const [lx, lz] = F.P(al0 + 9.5 + d, -7.2 * s); K.add(BOX(0.4, 0.44, 0.08), M.dark, T(lx, ey + 0.22, lz, F.R)); }
    const [kx, kz] = F.P(al0 + 4.2, -7.6 * s), ky = terrain.heightAt(kx, kz);
    K.add(BOX(0.12, 0.12, 4.2), M.dark, T(kx, ky + 1.2, kz, F.R));
    for (const d of [-2, 2]) { const [px, pz] = F.P(al0 + 4.2 + d, -7.6 * s); K.add(BOX(0.1, 1.25, 0.1), M.dark, T(px, ky + 0.62, pz, F.R)); }
    for (let i = 0; i < 9; i++) {
      const [sx, sz] = F.P(al0 + 2.5 + i * 0.42, -7.45 * s), m = SKI[(i * 7 + Math.round(al0)) % SKI.length];
      for (const w of [-0.06, 0.06]) { const [wx, wz] = F.P(al0 + 2.5 + i * 0.42 + w, -7.45 * s); K.add(BOX(0.035, 1.75, 0.09), m, T(wx, ky + 0.88, wz, F.R, 0, 0.22 * s)); }
      if (i % 3 === 0) K.add(CYL(0.012, 1.3, 5), M.chrome, T(sx, ky + 0.65, sz, F.R, 0, -0.18 * s));
    }
    const [tx2, tz2] = F.P(al0 - 0.6, -6.1 * s), ty = terrain.heightAt(tx2, tz2);
    K.add(CYL(0.3, 0.9, 12), M.bin, T(tx2, ty + 0.45, tz2));
    const flags = [[M.red, M.white, M.red], [M.gold, M.red, M.white], [M.blue, M.white, M.blue]];
    flags.forEach((cols, i) => {
      const [fx, fz] = F.P(al0 + 13.5 - i * 2.2, -9.4 * s), fy = terrain.heightAt(fx, fz);
      K.add(CYL(0.07, 8, 8), M.white, T(fx, fy + 4, fz));
      const [cx2, cz2] = F.P(al0 + 13.5 - i * 2.2, -8.75 * s);
      K.add(CYL(0.035, 1.5, 6).rotateZ(Math.PI / 2), M.white, T(cx2, fy + 7.85, cz2, F.R));
      cols.forEach((m, k) => K.add(BOX(1.3, 1.2, 0.02), m, T(cx2, fy + 7.2 - k * 1.2, cz2, F.R + Math.PI / 2)));
    });
  }

  function kiosk(K, F, al, sd, extra) {
    const [x, z] = F.P(al, sd);
    let y = -Infinity;
    for (const a of [-1.8, 1.8]) for (const s of [-1.2, 1.2]) y = Math.max(y, F.gh(al + a, sd + s));
    K.add(worldUV(BOX(2.4, y - F.gh(al, sd) + 1.4, 3.6), 3), M.stone, T(x, (y + F.gh(al, sd) - 0.6) / 2, z, F.R));
    K.add(worldUV(BOX(2.4, 0.7, 3.6), 1.4), M.plank, T(x, y + 0.75, z, F.R));
    K.add(BOX(2.36, 1.1, 3.56), M.tint, T(x, y + 1.65, z, F.R));
    K.add(worldUV(BOX(2.4, 0.5, 3.6), 1.4), M.plank, T(x, y + 2.45, z, F.R));
    for (const [a, s] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1]]) {
      const [px, pz] = F.P(al + a * 1.76, sd + s * 1.16);
      K.add(BOX(0.1, 1.1, 0.1), M.plankDark, T(px, y + 1.65, pz, F.R));
    }
    const [cx, cz] = F.P(al, sd + 1.4);
    K.add(BOX(0.5, 0.08, 3.4), M.plankDark, T(cx, y + 1.08, cz, F.R));
    const sl = Math.hypot(1.7, 0.9), ang = Math.atan2(0.9, 1.7);
    for (const s of [-1, 1]) { const [rx, rz] = F.P(al, sd + s * 0.85); K.add(worldUV(BOX(sl + 0.5, 0.12, 4.4), 2), M.shingle, T(rx, y + 3.15, rz, F.R, 0, s * ang)); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.43), signMat('Kassa · Tickets', 'Tageskarten · Saisonkarten'));
    const [sx, sz] = F.P(al, sd + 1.23);
    sign.position.set(sx, y + 2.45, sz);
    sign.rotation.y = F.R - Math.PI / 2;
    extra.push(sign);
    return y;
  }

  function ends(sec, opt) {
    const K = kit(), extra = [], spots = [], obstacles = [];
    const face = (F, a) => F.R + a;
    for (const end of ['a', 'b']) {
      const isA = end === 'a', E = isA ? sec.a : sec.b, Y = isA ? sec.pts[0].y : sec.ropeB, fy = Y - 5.4 + 0.4;
      const o = isA ? [-sec.dx, -sec.dz] : [sec.dx, sec.dz], F = frame(E, o);
      const c = opt.centers.find(c => Math.hypot(c[0] - E[0], c[1] - E[1]) < 30);
      const s = c && ((c[0] - E[0]) * F.lx + (c[1] - E[1]) * F.lz) < -0.5 ? -1 : 1;
      const put = (kind, al, sd, y, a) => { const [x, z] = F.P(al, sd); spots.push({ kind, x, z, y: y ?? terrain.heightAt(x, z), h: face(F, a), sec }); };
      if (!sec.tunnel) {
        rail(K, sec, end, Y);
        K.add(CYL(3.45, 0.6, 32), M.dark, T(E[0], Y + 1.25, E[1]));
        K.add(CYL(3.5, 0.1, 32), M.yellow, T(E[0], Y + 0.98, E[1]));
        if (isA) K.add(CYL(1.1, 0.75, 20), M.blue, T(E[0], Y + 1.93, E[1]));
        K.bar(M.steel, E[0], Y + 1.55, E[1], E[0], Y + 2.4, E[1], 0.25);
        booth(K, F, 6.2, s * 4.4, fy);
        put('booth', 6.6, s * 4.4, fy, Math.PI);
        put('guide', 4.9, -s * 1.2, fy, Math.PI + s * 0.5);
        for (const sd of [-(3 + 1.5), 3 + 1.5]) {
          const [x1, z1] = F.P(-1, sd), [x2, z2] = F.P(5.2, sd);
          K.add(BOX(0.18, 0.02, 6.2), M.yellow, T((x1 + x2) / 2, fy + 0.01, (z1 + z2) / 2, F.R));
        }
        const [x1, z1] = F.P(5.2, 0);
        K.add(BOX(9.2, 0.02, 0.18), M.yellow, T(x1, fy + 0.01, z1, F.R));
      }
      if (isA || sec.tunnel) {
        const hA = sec.pts[0].y - 5.4, hB = sec.ropeB - 5.4;
        waiting(K, F, 16.1, sec, opt.ride, isA ? hA : hB, isA ? hB : hA, extra, s);
        put('gate', 17.1, -s * 5.6, undefined, s * -Math.PI / 2);
        put('shovel', 16.1 + LQ + 1.6, -s * 6.4, undefined, s * Math.PI / 2);
        if (opt.kiosk && isA) {
          const ky = kiosk(K, F, 5.75, 13.6, extra);
          put('cash', 5.75, 13.75, ky + 0.4, Math.PI / 2);
          const [x, z] = F.P(5.75, 13.6);
          obstacles.push({ x, z, dx: sec.dx, dz: sec.dz, hl: 1.8, hw: 1.2, top: ky + 3.4 });
        }
      } else put('guide', 11.5, s * 3.2, fy, 0);
    }
    const g = K.build();
    for (const m of extra) g.add(m);
    return { g, spots, obstacles };
  }

  return { hall, ends, M };
}
