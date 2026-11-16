import * as THREE from 'three';
import { get } from './config.js';

export const LEVELS = {
  leicht: { color: 0x1d63d6, css: '#5aa2ff' },
  mittel: { color: 0xd41e1e, css: '#ff5a5a' },
  schwer: { color: 0x151515, css: '#ffffff' }
};

const FALL = 40;
const FENCE_OUT = 2;

function prepare(p, terrain) {
  const n = p.pts.length;
  const s = new Float32Array(n);
  for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]);
  let y = p.pts.map(([x, z]) => terrain.heightAt(x, z));
  for (let r = 0; r < 3; r++) y = y.map((v, i) => {
    const k = Math.min(2, i, n - 1 - i);
    let a = 0;
    for (let j = i - k; j <= i + k; j++) a += y[j];
    return a / (2 * k + 1);
  });
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, z] of p.pts) {
    box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], z);
    box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], z);
  }
  const m = p.width / 2 + FALL + 10;
  box[0] -= m; box[1] -= m; box[2] += m; box[3] += m;
  return { ...p, lv: LEVELS[p.level], s, y, box, len: s[n - 1], fence: [new Uint8Array(n), new Uint8Array(n)] };
}

function nearestOn(p, x, z, out) {
  const P = p.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], az = P[i][1], dx = P[i + 1][0] - ax, dz = P[i + 1][1] - az;
    const l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const ex = x - ax - dx * t, ez = z - az - dz * t;
    const d = ex * ex + ez * ez;
    if (d < out.d2) {
      const l = Math.sqrt(l2);
      Object.assign(out, { d2: d, p, i, t, lat: (ez * dx - ex * dz) / l, tx: dx / l, tz: dz / l });
    }
  }
  return out;
}

function signTexture(p, small) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = small ? 256 : 320;
  const g = c.getContext('2d');
  g.fillStyle = '#f5f2e8'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#333'; g.lineWidth = 10; g.strokeRect(5, 5, c.width - 10, c.height - 10);
  const col = '#' + p.lv.color.toString(16).padStart(6, '0');
  const r = small ? 90 : 80, cx = small ? 256 : 110, cy = small ? 128 : 110;
  g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold ' + (small ? 110 : 96) + 'px system-ui,sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(p.id, cx, cy + 6);
  if (!small) {
    g.fillStyle = '#222'; g.textAlign = 'left';
    g.font = 'bold 48px system-ui,sans-serif';
    g.fillText(p.name, 210, 90, 290);
    g.font = '38px system-ui,sans-serif';
    g.fillText(p.level + ' · ' + (p.len / 1000).toFixed(1).replace('.', ',') + ' km', 210, 150, 290);
    g.fillText('↓ ' + Math.round(p.y[0] - p.y[p.y.length - 1]) + ' Hm', 210, 200, 290);
    g.font = 'bold 34px system-ui,sans-serif';
    g.fillText('Ende: ' + p.end, 30, 270, 460);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function cordTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 64);
  for (let x = 0; x < 256; x++) {
    const u = x / 255;
    const a = Math.min(1, u / 0.06, (1 - u) / 0.06);
    const v = 240 + (x % 8 < 4 ? 8 : 0);
    for (let y = 0; y < 64; y++) {
      const n = v + Math.random() * 5;
      img.data.set([n, n + 2, n + 5, 255 * a * 0.9], (y * 256 + x) * 4);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function ribbon(p, terrain, mat) {
  const n = p.pts.length, hw = p.width / 2 + 2, cols = 7;
  const pos = [], uv = [], idx = [];
  const norm = p.pts.map((_, i) => {
    const a = p.pts[Math.max(0, i - 1)], b = p.pts[Math.min(n - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  });
  let rows = 0;
  for (let i = 0; i < n - 1; i++) {
    const sub = i === n - 2 ? 3 : 2;
    for (let k = 0; k < sub; k++) {
      const t = k / 2;
      const x = p.pts[i][0] + (p.pts[i + 1][0] - p.pts[i][0]) * t, z = p.pts[i][1] + (p.pts[i + 1][1] - p.pts[i][1]) * t;
      let nx = norm[i][0] * (1 - t) + norm[i + 1][0] * t, nz = norm[i][1] * (1 - t) + norm[i + 1][1] * t;
      const l = Math.hypot(nx, nz); nx /= l; nz /= l;
      const sv = (p.s[i] + (p.s[i + 1] - p.s[i]) * t) / 12;
      for (let c = 0; c < cols; c++) {
        const o = (c / (cols - 1) * 2 - 1) * hw, px = x + nx * o, pz = z + nz * o;
        pos.push(px, terrain.heightAt(px, pz) + 0.12, pz);
        uv.push(c / (cols - 1), sv);
      }
      rows++;
    }
  }
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + cols;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  m.renderOrder = 1;
  return m;
}

export async function loadPistes(terrain) {
  const data = await get('public/pistes.json', 'json');
  const list = data.pistes.map(p => prepare(p, terrain));
  for (const p of list) {
    const [x, z] = p.pts[p.pts.length - 1];
    let best = '', bd = Infinity;
    for (const q of Object.values(terrain.pois)) {
      const d = Math.hypot(q.x - x, q.z - z);
      if (d < bd) { bd = d; best = q.name; }
    }
    p.end = best;
  }

  function nearest(x, z, max = Infinity) {
    const out = { d2: max * max, p: null };
    for (const p of list) {
      const b = p.box;
      if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
      nearestOn(p, x, z, out);
    }
    if (!out.p) return null;
    out.d = Math.sqrt(out.d2);
    out.y = out.p.y[out.i] + (out.p.y[out.i + 1] - out.p.y[out.i]) * out.t;
    return out;
  }

  terrain.groom((x, z, y) => {
    const q = nearest(x, z, 60);
    if (!q) return null;
    const hw = q.p.width / 2;
    const w = 1 - THREE.MathUtils.smoothstep(q.d, hw, hw + FALL);
    if (w <= 0) return null;
    const c = (1 - THREE.MathUtils.smoothstep(q.d, hw - 6, hw + 12)) * 0.9;
    return [y + (q.y - y) * w, c];
  });

  const group = new THREE.Group();
  const cordMat = new THREE.MeshStandardMaterial({
    map: cordTexture(), transparent: true, depthWrite: false, roughness: 0.75,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });
  for (const p of list) group.add(ribbon(p, terrain, cordMat));
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.8, 6).translate(0, 0.9, 0);
  const capGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8).translate(0, 1.6, 0);
  const poles = [];
  const fenceTri = [];
  const STEP = 40;
  for (const p of list) {
    const hw = p.width / 2;
    for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
      const l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l;
      for (let side = 0; side < 2; side++) {
        const sg = side ? -1 : 1;
        const ex = ax + nx * sg * hw, ez = az + nz * sg * hw;
        const drop = terrain.heightAt(ex, ez) - terrain.heightAt(ex + nx * sg * 14, ez + nz * sg * 14);
        if (drop > 4.5 || (p.level === 'schwer' && drop > 2)) p.fence[side][i] = 1;
      }
    }
    for (let side = 0; side < 2; side++) {
      const sg = side ? -1 : 1;
      for (let i = 0; i < p.pts.length - 1; i++) {
        if (!p.fence[side][i]) continue;
        const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
        const l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l;
        const o = hwOff(hw);
        const k = 4;
        for (let j = 0; j < k; j++) {
          const t0 = j / k, t1 = (j + 1) / k;
          const x0 = ax + (bx - ax) * t0 + nx * sg * o, z0 = az + (bz - az) * t0 + nz * sg * o;
          const x1 = ax + (bx - ax) * t1 + nx * sg * o, z1 = az + (bz - az) * t1 + nz * sg * o;
          const y0 = terrain.heightAt(x0, z0), y1 = terrain.heightAt(x1, z1);
          fenceTri.push(x0, y0, z0, x1, y1, z1, x1, y1 + 1.3, z1, x0, y0, z0, x1, y1 + 1.3, z1, x0, y0 + 1.3, z0);
        }
      }
    }
    for (let d = 10; d < p.len - 5; d += STEP) {
      let i = 0;
      while (i < p.s.length - 2 && p.s[i + 1] < d) i++;
      const t = (d - p.s[i]) / (p.s[i + 1] - p.s[i]);
      const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l;
      for (const sg of [1, -1]) {
        const px = x + nx * sg * (hw + 1), pz = z + nz * sg * (hw + 1);
        poles.push([px, terrain.heightAt(px, pz), pz, p.lv.color]);
      }
    }
  }

  function hwOff(hw) { return hw + FENCE_OUT; }

  const poleMesh = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6 }), poles.length);
  const capMesh = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), poles.length);
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  poles.forEach(([x, y, z, c], k) => {
    mtx.makeTranslation(x, y - 0.1, z);
    poleMesh.setMatrixAt(k, mtx);
    capMesh.setMatrixAt(k, mtx);
    capMesh.setColorAt(k, col.setHex(c));
  });
  poleMesh.castShadow = capMesh.castShadow = true;
  group.add(poleMesh, capMesh);

  if (fenceTri.length) {
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fenceTri, 3));
    fg.computeVertexNormals();
    const fence = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({
      color: 0xff6a00, emissive: 0x4a1800, transparent: true, opacity: 0.8, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false
    }));
    group.add(fence);
  }

  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 6).translate(0, 0.5, 0);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.8 });
  function sign(p, d, small) {
    let i = 0;
    while (i < p.s.length - 2 && p.s[i + 1] < d) i++;
    const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
    const l = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / l, tz = (bz - az) / l;
    const off = p.width / 2 + 4;
    const x = ax + -tz * off, z = az + tx * off;
    const w = small ? 1.1 : 2.4, h = small ? w / 2 : w * 0.625, top = small ? 2.2 : 2.9;
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTexture(p, small), roughness: 0.7 }));
    face.position.y = top - h / 2;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), backMat);
    back.position.set(0, top - h / 2, -0.02);
    back.rotation.y = Math.PI;
    g.add(face, back);
    for (const px of small ? [0] : [-w * 0.4, w * 0.4]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.scale.y = top - h;
      post.position.x = px;
      g.add(post);
    }
    g.position.set(x, terrain.heightAt(x, z) - 0.1, z);
    g.rotation.y = Math.atan2(-tx, -tz);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    group.add(g);
  }
  for (const p of list) {
    sign(p, 45, false);
    for (let d = 500; d < p.len - 200; d += 500) sign(p, d, true);
  }

  let wasIn = false;
  function collide(state) {
    const q = nearest(state.pos.x, state.pos.z, 80);
    if (!q) { wasIn = false; return; }
    const lim = hwOff(q.p.width / 2) - 0.6, a = Math.abs(q.lat);
    if (a <= lim) { wasIn = true; return; }
    const side = q.lat >= 0 ? 0 : 1, f = q.p.fence[side];
    const fenced = f[q.i] || (q.t < 0.5 && q.i > 0 && f[q.i - 1]) || (q.t >= 0.5 && f[q.i + 1]);
    if (!wasIn || !fenced || state.pos.y - terrain.heightAt(state.pos.x, state.pos.z) > 1.3) { wasIn = false; return; }
    const sg = side ? -1 : 1, nx = -q.tz * sg, nz = q.tx * sg, push = a - lim;
    state.pos.x -= nx * push;
    state.pos.z -= nz * push;
    const g = terrain.heightAt(state.pos.x, state.pos.z);
    if (state.grounded || state.pos.y < g) state.pos.y = g;
    const vn = state.vel.x * nx + state.vel.z * nz;
    if (vn > 0) {
      state.vel.x -= nx * vn * 1.3;
      state.vel.z -= nz * vn * 1.3;
      state.vel.multiplyScalar(0.9);
    }
  }

  let cur = null;
  const tmp = { d2: Infinity, p: null };
  function at(pos) {
    if (cur) {
      tmp.d2 = Infinity;
      nearestOn(cur, pos.x, pos.z, tmp);
      if (Math.sqrt(tmp.d2) <= cur.width / 2 + 4) return cur;
    }
    const q = nearest(pos.x, pos.z, 80);
    cur = q && q.d <= q.p.width / 2 + 4 ? q.p : null;
    return cur;
  }

  function startOf(k) {
    const p = list[k];
    if (!p) return null;
    cur = p;
    const [ax, az] = p.pts[0], [bx, bz] = p.pts[2];
    return { x: ax, z: az, heading: Math.atan2(bx - ax, bz - az), piste: p };
  }

  return { group, list, at, collide, startOf, nearest };
}
