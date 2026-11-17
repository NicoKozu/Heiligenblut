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
    return [y + (q.y - y) * w, c, q.lat, list.indexOf(q.p) + 1];
  });

  const group = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.8, 6).translate(0, 0.9, 0);
  const capGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8).translate(0, 1.6, 0);
  const poles = [];
  const fenceTri = [];
  const STEP = 40;
  for (const p of list) {
    const hw = p.width / 2;
    p.poles = [poles.length, 0];
    p.ftri = fenceTri.length;
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
    p.poles[1] = poles.length;
    p.ftri = [p.ftri, fenceTri.length];
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

  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0xff6a00, emissive: 0x4a1800, transparent: true, opacity: 0.8, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false
  });
  for (const p of list) {
    const [a, b] = p.ftri;
    if (b <= a) continue;
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fenceTri.slice(a, b), 3));
    fg.computeVertexNormals();
    p.fenceMesh = new THREE.Mesh(fg, fenceMat);
    group.add(p.fenceMesh);
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
    (p.signs ||= []).push(g);
  }
  for (const p of list) {
    sign(p, 45, false);
    for (let d = 500; d < p.len - 200; d += 500) sign(p, d, true);
  }

  function stripes() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 8;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 8);
    g.fillStyle = '#e0141e'; g.fillRect(0, 0, 32, 8);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }
  function closedTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#d0101a'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#fff'; g.lineWidth = 14; g.strokeRect(12, 12, 488, 232);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 104px system-ui,sans-serif';
    g.fillText('GESPERRT', 256, 110, 460);
    g.font = 'bold 40px system-ui,sans-serif';
    g.fillText('Piste geschlossen', 256, 196, 460);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  let tapeTex = null, tapeMat = null, closedMat = null;
  const tapePost = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6 });
  function barrier(p) {
    if (!tapeMat) {
      tapeTex = stripes();
      tapeMat = new THREE.MeshStandardMaterial({ map: tapeTex, roughness: 0.7, side: THREE.DoubleSide });
      closedMat = new THREE.MeshStandardMaterial({ map: closedTexture(), roughness: 0.6 });
    }
    let i = 0;
    while (i < p.s.length - 2 && p.s[i + 1] < 35) i++;
    const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
    const l = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / l, tz = (bz - az) / l;
    const hw = p.width / 2 + 2, n = Math.max(2, Math.ceil(hw * 2 / 5));
    const g = new THREE.Group();
    const post = [];
    for (let k = 0; k <= n; k++) {
      const o = -hw + hw * 2 * k / n, x = ax - tz * o, z = az + tx * o, y = terrain.heightAt(x, z);
      const m = new THREE.Mesh(postGeo, tapePost);
      m.scale.set(0.7, 1.15, 0.7);
      m.position.set(x, y - 0.1, z);
      g.add(m);
      post.push(new THREE.Vector3(x, y + 0.95, z));
    }
    for (let k = 0; k < n; k++) {
      const a = post[k], b = post[k + 1], d = a.distanceTo(b);
      const geo = new THREE.PlaneGeometry(d, 0.09);
      geo.attributes.uv.array.forEach((v, j, arr) => { if (j % 2 === 0) arr[j] = v * d * 2; });
      const m = new THREE.Mesh(geo, tapeMat);
      m.position.copy(a).lerp(b, 0.5);
      m.lookAt(b);
      m.rotateY(Math.PI / 2);
      g.add(m);
    }
    const w = 2.2, h = 1.1, mid = post[n >> 1];
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), closedMat);
    face.position.set(mid.x + tx * 0.05, mid.y + 0.7, mid.z + tz * 0.05);
    face.rotation.y = Math.atan2(-tx, -tz);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), backMat);
    back.position.set(mid.x + tx * 0.07, mid.y + 0.7, mid.z + tz * 0.07);
    back.rotation.y = Math.atan2(tx, tz);
    g.add(face, back);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    group.add(g);
    return g;
  }
  function setOpen(id, open) {
    const p = list.find(q => q.id === id);
    if (!p || !p.closed === open) return;
    p.closed = !open;
    if (!open && !p.barrier) p.barrier = barrier(p);
    if (p.barrier) p.barrier.visible = !open && !p.unbuilt;
  }

  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function setBuilt(id, on) {
    const p = list.find(q => q.id === id);
    if (!p || !p.unbuilt === on) return;
    p.unbuilt = !on;
    for (let k = p.poles[0]; k < p.poles[1]; k++) {
      if (on) { const [x, y, z] = poles[k]; mtx.makeTranslation(x, y - 0.1, z); } else mtx.copy(zero);
      poleMesh.setMatrixAt(k, mtx);
      capMesh.setMatrixAt(k, mtx);
    }
    poleMesh.instanceMatrix.needsUpdate = capMesh.instanceMatrix.needsUpdate = true;
    if (p.fenceMesh) p.fenceMesh.visible = on;
    for (const g of p.signs || []) g.visible = on;
    if (p.barrier) p.barrier.visible = on && p.closed;
  }

  let wasIn = false;
  function collide(state) {
    const q = nearest(state.pos.x, state.pos.z, 80);
    if (!q || q.p.unbuilt) { wasIn = false; return; }
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
      if (!cur.unbuilt && Math.sqrt(tmp.d2) <= cur.width / 2 + 4) return cur;
    }
    const q = nearest(pos.x, pos.z, 80);
    cur = q && !q.p.unbuilt && q.d <= q.p.width / 2 + 4 ? q.p : null;
    return cur;
  }

  function startOf(k) {
    const p = list[k];
    if (!p || p.unbuilt) return null;
    cur = p;
    const [ax, az] = p.pts[0], [bx, bz] = p.pts[2];
    return { x: ax, z: az, heading: Math.atan2(bx - ax, bz - az), piste: p };
  }

  const setSurface = (id, cord, worn, aper) => terrain.surface(list.findIndex(p => p.id === id) + 1, cord, worn, aper);
  return { group, list, at, collide, startOf, nearest, setOpen, setSurface, setBuilt };
}
