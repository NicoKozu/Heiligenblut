import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials, worldUV } from './textures.js';

const CHUNK = 500;
const NEAR = 1300;
const FAR = 3800;
const GRID = 10;
const CELL = 16;
const DET = 170;
const CAP = 700;
const TS = 7;

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

function hider(u) {
  return s => {
    s.uniforms.uDet = { value: u };
    s.vertexShader = 'uniform vec4 uDet;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec2 dq = (modelMatrix * instanceMatrix[3]).xz - uDet.xy;
  if (dot(dq, dq) < uDet.z * uDet.z) transformed = vec3(0.0);
  #endif`);
  };
}

function leafMat(map, tint, snow, twig) {
  const m = new THREE.MeshLambertMaterial({ map, color: tint, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = s => {
    s.uniforms.uSnow = { value: snow };
    s.vertexShader = 'varying float vSnow;\n' + s.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
  vSnow = smoothstep(0.45, 0.95, abs(normal.y));`);
    s.fragmentShader = 'varying float vSnow;\nuniform float uSnow;\n' + s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.97), vSnow * uSnow);
  ${twig ? 'diffuseColor.a = (diffuseColor.a - 0.5) * 2.5 + 0.2;' : ''}`);
  };
  m.customProgramCacheKey = () => 'leaf' + (twig ? 1 : 0);
  return m;
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

function flagTex() {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#c8102e'; g.fillRect(0, 0, 96, 64);
  g.fillStyle = '#fff'; g.fillRect(0, 21, 96, 22);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildHut(o, mats) {
  const g = new THREE.Group(), on = new THREE.Group(), off = new THREE.Group();
  off.visible = false;
  const { w, l, h } = o;
  const glass = mats.glass.clone();
  let to = g;
  const box = (sx, sy, sz, m, x, y, z, tile) => {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    if (tile) worldUV(geo, tile);
    const b = new THREE.Mesh(geo, m);
    b.position.set(x, y, z);
    to.add(b);
    return b;
  };
  box(w + 0.6, 4, l + 0.6, mats.tx.stone, 0, -1.2, 0, 1.6);
  box(w, h, l, mats.tx.log, 0, 0.8 + h / 2, 0, 2.4);
  const rows = Math.round(h / 0.3), ends = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.15, 0.55, 7).rotateX(Math.PI / 2), mats.tx.logDark, rows * 8);
  const em = new THREE.Matrix4(), rq = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  let ei = 0;
  for (let i = 0; i < rows; i++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const y = 0.95 + i * h / rows;
    ends.setMatrixAt(ei++, em.makeTranslation(sx * w / 2, y, sz * (l / 2 + 0.2)));
    ends.setMatrixAt(ei++, em.copy(rq).setPosition(sx * (w / 2 + 0.2), y + 0.12, sz * l / 2));
  }
  g.add(ends);
  const rh = w * 0.38, top = 0.8 + h;
  const gable = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rh)]);
  const gm = new THREE.Mesh(worldUV(new THREE.ExtrudeGeometry(gable, { depth: l, bevelEnabled: false }), 1.6), mats.tx.plankDark);
  gm.position.set(0, top, -l / 2);
  g.add(gm);
  const ow = w / 2 + 1.1, slope = Math.atan2(rh, w / 2), span = ow / Math.cos(slope);
  for (const s of [-1, 1]) {
    const roof = new THREE.Group();
    roof.position.set(0, top + rh + 0.15, 0);
    roof.rotation.z = -s * slope;
    const r = new THREE.Mesh(worldUV(new THREE.BoxGeometry(span, 0.3, l + 2), 1.8, true), mats.tx.shingle);
    r.position.x = s * span / 2;
    const sn = new THREE.Mesh(new THREE.BoxGeometry(span - 0.6, 0.4, l + 1.6), mats.snow);
    sn.position.set(s * (span / 2 - 0.15), 0.32, 0);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, l + 1.6, 6).rotateX(Math.PI / 2), mats.snow);
    lip.position.set(s * (span - 0.45), 0.28, 0);
    const fasc = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, l + 2.05), mats.tx.plankDark);
    fasc.position.set(s * span, -0.05, 0);
    roof.add(r, sn, lip, fasc);
    for (const z of [-1, 1]) {
      const bd = new THREE.Mesh(new THREE.BoxGeometry(span, 0.35, 0.14), mats.tx.plankDark);
      bd.position.set(s * span / 2, -0.05, z * (l / 2 + 1.02));
      roof.add(bd);
    }
    g.add(roof);
  }
  const chim = [w * 0.22, top + rh, -l * 0.2];
  box(0.9, 2.4, 0.9, mats.tx.stone, chim[0], chim[1], chim[2], 1);
  box(1.1, 0.12, 1.1, mats.stone, chim[0], chim[1] + 1.2, chim[2]);
  box(0.95, 0.3, 0.95, mats.snow, chim[0], chim[1] + 1.36, chim[2]);
  const win = (s, z, ww, hh, side) => {
    const y = 0.8 + h * 0.55;
    if (side) {
      box(0.12, hh, ww, glass, s * (w / 2 + 0.03), y, z);
      box(0.16, hh + 0.2, 0.1, mats.frame, s * (w / 2 + 0.05), y, z - ww / 2 - 0.02);
      box(0.16, hh + 0.2, 0.1, mats.frame, s * (w / 2 + 0.05), y, z + ww / 2 + 0.02);
      box(0.16, 0.1, ww + 0.2, mats.frame, s * (w / 2 + 0.05), y + hh / 2 + 0.05, z);
      box(0.3, 0.1, ww + 0.3, mats.frame, s * (w / 2 + 0.12), y - hh / 2 - 0.05, z);
      box(0.16, hh, 0.05, mats.frame, s * (w / 2 + 0.06), y, z);
      box(0.16, 0.05, ww, mats.frame, s * (w / 2 + 0.06), y + hh * 0.1, z);
      box(0.3, 0.22, ww * 0.9, mats.tx.plankDark, s * (w / 2 + 0.25), y - hh / 2 - 0.2, z);
    } else {
      box(ww, hh, 0.12, glass, s, y, l / 2 + 0.03);
      box(ww + 0.2, 0.1, 0.16, mats.frame, s, y + hh / 2 + 0.05, l / 2 + 0.05);
      box(ww + 0.3, 0.1, 0.3, mats.frame, s, y - hh / 2 - 0.05, l / 2 + 0.12);
      box(0.05, hh, 0.16, mats.frame, s, y, l / 2 + 0.06);
    }
  };
  const nWin = Math.max(2, Math.floor(l / 3.5));
  for (const s of [-1, 1]) for (let i = 0; i < nWin; i++) {
    const z = -l / 2 + (i + 0.5) * l / nWin, y = 0.8 + h * 0.55;
    win(s, z, 0.9, 1.1, true);
    to = on;
    box(0.08, 1.2, 0.35, mats.shutter, s * (w / 2 + 0.06), y, z - 0.68);
    box(0.08, 1.2, 0.35, mats.shutter, s * (w / 2 + 0.06), y, z + 0.68);
    to = off;
    box(0.1, 1.25, 1.0, mats.shutter, s * (w / 2 + 0.11), y, z);
    to = g;
  }
  box(1.3, 2.2, 0.15, mats.door, 0, 0.8 + 1.1, l / 2 + 0.05);
  box(1.5, 0.15, 0.25, mats.frame, 0, 0.8 + 2.25, l / 2 + 0.1);
  for (const s of [-1, 1]) win(s * w * 0.28, 0, 0.9, 1.1, false);
  to = off;
  for (const s of [-1, 1]) box(1.0, 1.25, 0.1, mats.shutter, s * w * 0.28, 0.8 + h * 0.55, l / 2 + 0.12);
  box(1.4, 2.3, 0.1, mats.shutter, 0, 0.8 + 1.15, l / 2 + 0.16);
  for (const s of [-1, 1]) box(1.8, 0.9, 0.9, mats.tx.plank, s * w * 0.25, 1.25, l / 2 + 1.2, 1);
  to = g;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.8, 7), Math.min(w * 0.8, 7) / 4), new THREE.MeshLambertMaterial({ map: signTex(o.name) }));
  sign.position.set(0, top + rh * 0.4, l / 2 + 0.05);
  g.add(sign);
  const deck = 6, dz = l / 2 + deck / 2;
  box(w + 2, 0.5, deck, mats.tx.plank, 0, 0.55, dz, 1.5);
  for (const s of [-1, 1]) {
    box(0.1, 0.1, deck, mats.tx.plankDark, s * (w / 2 + 0.95), 1.75, dz);
    box(0.1, 0.1, deck, mats.tx.plankDark, s * (w / 2 + 0.95), 1.25, dz);
    box((w + 2) / 2 - 1.2, 0.1, 0.1, mats.tx.plankDark, s * ((w + 2) / 4 + 0.6), 1.75, l / 2 + deck - 0.05);
    box((w + 2) / 2 - 1.2, 0.1, 0.1, mats.tx.plankDark, s * ((w + 2) / 4 + 0.6), 1.25, l / 2 + deck - 0.05);
  }
  const posts = [];
  for (const s of [-1, 1]) for (let k = 0; k <= 6; k++) posts.push([s * (w / 2 + 0.95), l / 2 + k * deck / 6]);
  for (let k = 0; k <= 8; k++) { const x = -w / 2 - 0.95 + k * (w + 1.9) / 8; if (Math.abs(x) > 0.9) posts.push([x, l / 2 + deck - 0.05]); }
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), mats.tx.plankDark, posts.length);
  posts.forEach(([x, z], i) => pm.setMatrixAt(i, em.makeTranslation(x, 1.3, z)));
  g.add(pm);
  to = on;
  for (const s of [-1, 1]) {
    const tx = s * w * 0.25, tz = dz;
    box(1.8, 0.08, 0.8, mats.tx.plank, tx, 1.55, tz);
    box(0.12, 0.75, 0.12, mats.deck, tx, 1.2, tz);
    box(1.8, 0.08, 0.35, mats.tx.plank, tx, 1.25, tz - 0.8);
    box(1.8, 0.08, 0.35, mats.tx.plank, tx, 1.25, tz + 0.8);
    box(0.06, 2.4, 0.06, mats.shutter, tx, 2, tz);
    const um = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 8, 1, true), mats.parasol);
    um.position.set(tx, 3.2, tz);
    on.add(um);
  }
  const ski = new THREE.BoxGeometry(0.08, 1.7, 0.03);
  const skis = new THREE.InstancedMesh(ski, mats.ski, 10);
  const sc = new THREE.Color(), sq = new THREE.Quaternion(), sv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), ax = new THREE.Vector3(1, 0, 0);
  const SK = [0xd62828, 0x1d4ed8, 0xf2f2f2, 0x111111, 0xf59e0b];
  for (let i = 0; i < 10; i++) {
    sq.setFromAxisAngle(ax, -0.22);
    skis.setMatrixAt(i, em.compose(sv.set(-w / 2 - 1.6 + (i >> 1) * 0.35 + (i & 1) * 0.1, 1.1, l / 2 + 0.6), sq, one));
    skis.setColorAt(i, sc.setHex(SK[(i >> 1) % SK.length]));
  }
  on.add(skis);
  box(2, 0.08, 0.08, mats.tx.plankDark, -w / 2 - 0.9, 1.75, l / 2 + 0.85);
  to = g;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 8, 6), mats.frame);
  pole.position.set(w / 2 + 2.2, 4.4, l / 2 + deck - 0.5);
  g.add(pole);
  const fgeo = new THREE.PlaneGeometry(1.8, 1.2, 12, 4).translate(0.9, 0, 0);
  const flag = new THREE.Mesh(fgeo, mats.flag);
  flag.position.set(w / 2 + 2.25, 7.7, l / 2 + deck - 0.5);
  g.add(flag);
  const fx0 = Float32Array.from(fgeo.attributes.position.array);
  const piles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), mats.snow, 6);
  [[-w / 2 - 0.9, -l / 3], [w / 2 + 0.9, -l / 3], [-w / 2 - 0.9, 0], [w / 2 + 0.9, l / 6], [-w / 3, -l / 2 - 0.9], [w / 4, -l / 2 - 0.9]].forEach(([x, z], i) => piles.setMatrixAt(i, em.compose(sv.set(x, 0.8, z), sq.identity(), new THREE.Vector3(1.4 + (i % 3) * 0.3, 0.55, 1.1))));
  g.add(piles);
  g.add(on, off);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  flag.castShadow = false;
  const bulbs = [];
  for (let i = 0; i <= 8; i++) bulbs.push(new THREE.Vector3(-w / 2 - 1 + (w + 2) * i / 8, 2.9 - Math.sin(i / 8 * Math.PI) * 0.5, l / 2 + deck - 0.2));
  const lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), mats.bulb, bulbs.length);
  bulbs.forEach((p, i) => lamp.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
  on.add(lamp);
  on.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bulbs), mats.cord));
  const SM = 14, puffs = [];
  for (let i = 0; i < SM; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mats.smoke, color: 0xd8d8d8, transparent: true, depthWrite: false, opacity: 0 }));
    s.position.set(chim[0], chim[1] + 1.5, chim[2]);
    puffs.push({ s, t: i / SM, r: Math.random() });
    g.add(s);
  }
  let open = true;
  const setOpen = v => {
    if (v === open) return;
    open = v;
    on.visible = v;
    off.visible = !v;
    glass.emissive.setHex(v ? 0x6a4a1a : 0x000000);
  };
  const fp = fgeo.attributes.position;
  const tick = (t, dt, wind) => {
    for (let i = 0; i < fp.count; i++) {
      const x = fx0[i * 3], y = fx0[i * 3 + 1], k = x / 1.8;
      fp.setZ(i, Math.sin(x * 3.2 - t * (4 + wind * 4)) * 0.22 * k + Math.sin(y * 4 + t * 3) * 0.04 * k);
      fp.setY(i, y - k * k * 0.25 * (1 - wind));
    }
    fp.needsUpdate = true;
    fgeo.computeVertexNormals();
    for (const p of puffs) {
      p.t += dt / 7;
      if (p.t > 1) { p.t -= 1; p.r = Math.random(); }
      const u = p.t, sz = 0.8 + u * 4.5;
      p.s.position.set(chim[0] + u * (2 + wind * 9) + (p.r - 0.5) * u * 2, chim[1] + 1.6 + u * 9 * (1 - wind * 0.5), chim[2] + (p.r - 0.5) * u * 3);
      p.s.scale.set(sz, sz, 1);
      p.s.material.opacity = open ? Math.sin(Math.min(1, u * 4) * Math.PI / 2) * (1 - u) * 0.55 : 0;
      p.s.material.rotation = p.r * 6 + u;
    }
  };
  return { group: g, setOpen, tick, hl: l / 2 + 0.3, hw: w / 2 + 0.3, top: top + rh, reach: Math.max(w + 2, l + deck * 2) / 2 + 3 };
}

export function detailMaterials(assets) {
  return {
    bark: new THREE.MeshLambertMaterial({ color: 0x4a3626 }),
    leafMats: [leafMat(assets.leaves, new THREE.Color(0.24, 0.4, 0.3), 0.6, false), leafMat(assets.leaves, new THREE.Color(0.5, 0.42, 0.36), 0.3, true)]
  };
}

export function createScenery(terrain, pistes, lift, assets, blocked) {
  const group = new THREE.Group();
  const all = [...lift.sections, ...(lift.planned || [])], ropes = all.filter(s => !s.tunnel);
  const stations = all.flatMap(s => [s.a, s.b]);
  const towers = ropes.flatMap(s => s.towers.map(t => [t.x, t.z]));
  const pisteClear = (x, z, m) => { const q = pistes.nearest(x, z, 80); return !q || q.d > q.p.width / 2 + m; };
  const liftClear = (x, z, m) => ropes.every(s => segDist(x, z, s.a, s.b) > m);

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
    parasol: new THREE.MeshLambertMaterial({ color: 0xc8302a, side: THREE.DoubleSide }),
    bulb: new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    cord: new THREE.LineBasicMaterial({ color: 0x222222 }),
    frame: new THREE.MeshLambertMaterial({ color: 0xede6da }),
    ski: new THREE.MeshLambertMaterial({ color: 0xffffff }),
    flag: new THREE.MeshLambertMaterial({ map: flagTex(), side: THREE.DoubleSide }),
    smoke: new THREE.TextureLoader().load('public/textures/smoke.webp'),
    tx: materials()
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
  const detU = new THREE.Vector4(0, 0, 0, 0);
  treeMat.onBeforeCompile = hider(detU);
  treeMat.customProgramCacheKey = () => 'thide';
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depthMat.onBeforeCompile = hider(detU);
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
      if (y > 2320) continue;
      const tl = 1 - THREE.MathUtils.smoothstep(y, 1900, 2320);
      const f = THREE.MathUtils.smoothstep(terrain.forestAt(px, pz), 0.12, 0.55);
      const pr = Math.max(f * 0.9, 0.03) * tl;
      if (r > pr) continue;
      terrain.normalAt(px, pz, n);
      if (n.y < 0.66 || r > pr * THREE.MathUtils.smoothstep(n.y, 0.66, 0.8)) continue;
      if (Math.hypot(px, pz) < 70) continue;
      if (!pisteClear(px, pz, 7) || !liftClear(px, pz, 14)) continue;
      if (stations.some(s => Math.hypot(s[0] - px, s[1] - pz) < 40)) continue;
      if (huts.some(h => Math.hypot(h.x - px, h.z - pz) < h.reach + 14)) continue;
      if (blocked?.(px, pz, 3)) continue;
      const larch = rand() < 0.15 + THREE.MathUtils.smoothstep(y, 1450, 2000) * 0.65;
      const s = (larch ? 13 : 16) * (0.55 + rand() * 0.6) * (0.45 + 0.55 * tl);
      const k = Math.floor((px - originX) / CHUNK) + Math.floor((pz - originZ) / CHUNK) * cx;
      const key = k * 2 + (larch ? 1 : 0);
      const rot = rand() * Math.PI * 2, b = 0.85 + rand() * 0.3;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push([px, y - 0.3, pz, s, rot, b]);
      T.push(px, pz, y, s, rot, b, larch ? 1 : 0);
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
    near.customDepthMaterial = depthMat;
    near.computeBoundingSphere();
    far.boundingSphere = near.boundingSphere;
    const k = key >> 1;
    const center = new THREE.Vector2(originX + (k % cx + 0.5) * CHUNK, originZ + (Math.floor(k / cx) + 0.5) * CHUNK);
    near.visible = far.visible = false;
    group.add(near, far);
    chunks.push({ near, far, center });
  }

  const grid = new Map();
  const N = T.length / TS;
  for (let i = 0; i < N; i++) {
    const k = Math.floor(T[i * TS] / CELL) * 65536 + Math.floor(T[i * TS + 1] / CELL);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }

  const { bark, leafMats } = detailMaterials(assets);
  const pools = [];
  for (let t = 0; t < 2; t++) for (const v of assets.spruce) {
    const a = new THREE.InstancedMesh(v.bark, bark, CAP), l = new THREE.InstancedMesh(v.leaves, leafMats[t], CAP);
    a.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    a.setColorAt(0, new THREE.Color());
    l.instanceMatrix = a.instanceMatrix;
    l.instanceColor = a.instanceColor;
    for (const o of [a, l]) { o.count = 0; o.frustumCulled = false; o.castShadow = true; group.add(o); }
    pools.push({ a, l, n: 0 });
  }
  const NV = assets.spruce.length;
  let lx = Infinity, lz = Infinity;

  function refresh(px, pz) {
    lx = px; lz = pz;
    for (const p of pools) p.n = 0;
    const r = Math.ceil(DET / CELL), gx = Math.floor(px / CELL), gz = Math.floor(pz / CELL);
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      const list = grid.get((gx + a) * 65536 + gz + b);
      if (!list) continue;
      for (const i of list) {
        const o = i * TS, x = T[o], z = T[o + 1];
        if ((x - px) ** 2 + (z - pz) ** 2 >= DET * DET) continue;
        const p = pools[T[o + 6] * NV + i % NV];
        if (p.n >= CAP) continue;
        const s = T[o + 3], br = T[o + 5], w = s * (0.85 + (br - 0.85) * 0.5);
        m.compose(v.set(x, T[o + 2] - 0.3 - 0.06 * s, z), q.setFromAxisAngle(up, T[o + 4]), sc.set(w, s, w));
        p.a.setMatrixAt(p.n, m);
        p.a.setColorAt(p.n, col.setScalar(br));
        p.n++;
      }
    }
    for (const p of pools) {
      p.a.count = p.l.count = p.n;
      p.a.instanceMatrix.needsUpdate = true;
      p.a.instanceColor.needsUpdate = true;
    }
    detU.set(px, pz, DET, 0);
  }

  let last = performance.now() / 1000;
  function update(camera) {
    const px = camera.position.x, pz = camera.position.z, now = performance.now() / 1000, dt = Math.min(0.1, now - last);
    last = now;
    for (const h of huts) if (Math.hypot(h.x - px, h.z - pz) < 1500) h.tick(now, dt, wind);
    if (Math.hypot(px - lx, pz - lz) > 10) refresh(px, pz);
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
        const tx = T[i * TS], tz = T[i * TS + 1], ty = T[i * TS + 2], s = T[i * TS + 3];
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

  const setHut = (name, open) => huts.find(h => h.name === name)?.setOpen(open);
  let wind = 0.2;
  return { group, update, collide, huts, setHut, treeCount: N, set wind(v) { wind = Math.max(0, Math.min(1, v)); } };
}
