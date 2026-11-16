import * as THREE from 'three';
import { TERRAIN_URL, get } from './config.js';

const SUB = 2;
const CHUNK = 64;
const UVS = 8;

function snowBumpTexture() {
  const size = 256;
  const lat = (p, seed) => {
    const a = new Float32Array(p * p);
    let s = seed;
    for (let i = 0; i < a.length; i++) { s = (s * 16807) % 2147483647; a[i] = s / 2147483647; }
    return a;
  };
  const octs = [[4, 0.5], [8, 0.3], [16, 0.22], [32, 0.14], [64, 0.09], [128, 0.06]].map(([p, w], k) => ({ p, w, g: lat(p, 11 + k * 97) }));
  const sm = t => t * t * (3 - 2 * t);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (const o of octs) {
      const fx = x / size * o.p, fy = y / size * o.p;
      const i = Math.floor(fx), j = Math.floor(fy), tx = sm(fx - i), ty = sm(fy - j);
      const g = (a, b) => o.g[(b % o.p) * o.p + (a % o.p)];
      v += o.w * ((g(i, j) * (1 - tx) + g(i + 1, j) * tx) * (1 - ty) + (g(i, j + 1) * (1 - tx) + g(i + 1, j + 1) * tx) * ty);
    }
    const n = Math.round(Math.min(255, Math.max(0, v * 190)));
    img.data.set([n, n, n, 255], (y * size + x) * 4);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

const NOISE = `
float tnH(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float tnN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(tnH(i), tnH(i + vec2(1, 0)), f.x), mix(tnH(i + vec2(0, 1)), tnH(i + vec2(1, 1)), f.x), f.y); }
vec3 tnH3(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }`;

function snowMaterial(bump) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, bumpMap: bump, bumpScale: 0.05 });
  mat.customProgramCacheKey = () => 'snow';
  mat.onBeforeCompile = s => {
    s.vertexShader = 'attribute vec2 pist;\nvarying vec2 vPist;\nvarying vec3 vTw;\n' + s.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  vTw = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vPist = pist;`);
    const bumpPars = THREE.ShaderChunk.bumpmap_pars_fragment.replace('vec2 dHdxy_fwd()', 'vec2 dHdxy_tex()') + `
  vec2 dHdxy_fwd() {
    float pm = clamp(vPist.x, 0.0, 1.0);
    vec2 uv = vBumpMapUv, dx = dFdx(uv), dy = dFdy(uv);
    float h0 = texture2D(bumpMap, uv).x;
    vec2 g = vec2(texture2D(bumpMap, uv + dx).x - h0, texture2D(bumpMap, uv + dy).x - h0);
    vec2 u2 = uv * 0.093 + 0.37;
    float h2 = texture2D(bumpMap, u2).x;
    vec2 g2 = vec2(texture2D(bumpMap, u2 + dx * 0.093).x - h2, texture2D(bumpMap, u2 + dy * 0.093).x - h2);
    vec2 d = bumpScale * (g * (1.0 - 0.7 * pm) + g2 * 6.0 * (1.0 - pm));
    float k = 6.2832 / 0.3;
    float lx = dFdx(vPist.y), ly = dFdy(vPist.y);
    float fw = (abs(lx) + abs(ly)) * k;
    float c = cos(vPist.y * k) * k * 0.018 * pm * (1.0 - smoothstep(0.6, 2.2, fw));
    return d + c * vec2(lx, ly);
  }`;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec2 vPist;
varying vec3 vTw;
${NOISE}`)
      .replace('#include <bumpmap_pars_fragment>', bumpPars)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float tPm = clamp(vPist.x, 0.0, 1.0);
  float tSnow = smoothstep(0.3, 0.7, dot(diffuseColor.rgb, vec3(0.333)));
  float tN = tnN(vTw.xz * 0.021) * 0.55 + tnN(vTw.xz * 0.13) * 0.3 + tnN(vTw.xz * 0.9) * 0.15;
  diffuseColor.rgb *= mix(0.9 + 0.1 * tN, 0.97 + 0.03 * tN, tPm);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.96, 0.98, 1.02), (1.0 - tPm) * tSnow * (1.0 - tN));
  float tL = vPist.y / 4.4, tFw = fwidth(tL);
  float tLane = abs(fract(tL) - 0.5) * 2.0;
  float tAA = 1.0 - smoothstep(0.15, 0.5, tFw);
  diffuseColor.rgb *= 1.0 - tPm * tAA * (smoothstep(0.88 - tFw, 1.0, tLane) * 0.07 + (tnH(vec2(floor(tL), 3.0)) - 0.5) * 0.035);
  float tR = 1.0 - smoothstep(0.6, 2.2, fwidth(vPist.y) * 20.94);
  diffuseColor.rgb *= 1.0 - tPm * tR * 0.05 * (0.5 + 0.5 * sin(vPist.y * 20.94));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.72, tPm * tSnow);
  roughnessFactor = mix(0.95, roughnessFactor, tSnow);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
  {
    vec3 tc = floor(vTw * 38.0);
    float tf = (1.0 - smoothstep(0.35, 1.2, length(fwidth(vTw)) * 38.0)) * tSnow;
    if (tf > 0.0) {
      vec3 tr = tnH3(tc);
      vec3 tn = normalize(normal + (tr - 0.5) * 0.9);
      vec3 th = normalize(directionalLights[0].direction + geometryViewDir);
      float sp = pow(max(dot(tn, th), 0.0), 1400.0) * step(0.6, tr.y);
      float tl = dot(reflectedLight.directDiffuse, vec3(0.333));
      reflectedLight.directSpecular += vec3(sp * tf * tl * 30.0);
    }
  }
#endif`);
  };
  return mat;
}

function upsample(h, nx, nz) {
  const NX = (nx - 1) * SUB + 1, NZ = (nz - 1) * SUB + 1;
  const cr = (a, b, c, d) => (-a + 9 * b + 9 * c - d) / 16;
  const tmp = new Float32Array(NX * nz);
  for (let j = 0; j < nz; j++) {
    const r = j * nx;
    for (let i = 0; i < nx; i++) tmp[j * NX + 2 * i] = h[r + i];
    for (let i = 0; i < nx - 1; i++) tmp[j * NX + 2 * i + 1] = cr(h[r + Math.max(0, i - 1)], h[r + i], h[r + i + 1], h[r + Math.min(nx - 1, i + 2)]);
  }
  const H = new Float32Array(NX * NZ);
  for (let j = 0; j < nz; j++) H.set(tmp.subarray(j * NX, j * NX + NX), 2 * j * NX);
  for (let j = 0; j < nz - 1; j++) {
    const a = Math.max(0, j - 1) * NX, b = j * NX, c = (j + 1) * NX, d = Math.min(nz - 1, j + 2) * NX, o = (2 * j + 1) * NX;
    for (let i = 0; i < NX; i++) H[o + i] = cr(tmp[a + i], tmp[b + i], tmp[c + i], tmp[d + i]);
  }
  return { H, NX, NZ };
}

export async function loadTerrain() {
  const [meta, buf] = await Promise.all([
    get(TERRAIN_URL + '.json', 'json'),
    get(TERRAIN_URL + '.bin', 'arrayBuffer')
  ]);
  const { nx, nz, cell, originX, originZ, scale } = meta;
  const raw = new Uint16Array(buf);
  const h = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) h[i] = raw[i] * scale;
  const width = (nx - 1) * cell;
  const depth = (nz - 1) * cell;
  const { H, NX, NZ } = upsample(h, nx, nz);
  const C = cell / SUB;
  const N = new Float32Array(NX * NZ * 3);
  const COL = new Float32Array(NX * NZ * 3);
  const PIST = new Float32Array(NX * NZ * 2);

  function calcNormals() {
    for (let j = 0; j < NZ; j++) {
      const j0 = Math.max(0, j - 1), j1 = Math.min(NZ - 1, j + 1);
      for (let i = 0; i < NX; i++) {
        const i0 = Math.max(0, i - 1), i1 = Math.min(NX - 1, i + 1);
        const gx = (H[j * NX + i1] - H[j * NX + i0]) / ((i1 - i0) * C);
        const gz = (H[j1 * NX + i] - H[j0 * NX + i]) / ((j1 - j0) * C);
        const l = Math.hypot(gx, 1, gz), k = (j * NX + i) * 3;
        N[k] = -gx / l; N[k + 1] = 1 / l; N[k + 2] = -gz / l;
      }
    }
  }
  calcNormals();

  const snow = new THREE.Color(0xf4f8ff), rock = new THREE.Color(0x6b6560), forest = new THREE.Color(0x9fa9a8);
  const col = new THREE.Color();
  for (let k = 0; k < NX * NZ; k++) {
    const y = H[k];
    col.copy(snow);
    col.lerp(forest, (1 - THREE.MathUtils.smoothstep(y, 1250, 1900)) * 0.25);
    col.lerp(rock, THREE.MathUtils.smoothstep(1 - N[k * 3 + 1], 0.32, 0.48));
    COL[k * 3] = col.r; COL[k * 3 + 1] = col.g; COL[k * 3 + 2] = col.b;
  }

  function heightAt(x, z) {
    const fx = THREE.MathUtils.clamp((x - originX) / C, 0, NX - 1.001);
    const fz = THREE.MathUtils.clamp((z - originZ) / C, 0, NZ - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j, k = j * NX + i;
    const a = H[k], d = H[k + 1], b = H[k + NX], c = H[k + NX + 1];
    return tx + tz <= 1 ? a + (d - a) * tx + (b - a) * tz : c + (b - c) * (1 - tx) + (d - c) * (1 - tz);
  }

  function normalAt(x, z, out = new THREE.Vector3()) {
    const fx = THREE.MathUtils.clamp((x - originX) / C, 0, NX - 1.001);
    const fz = THREE.MathUtils.clamp((z - originZ) / C, 0, NZ - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j, k = (j * NX + i) * 3, r = NX * 3;
    const w0 = (1 - tx) * (1 - tz), w1 = tx * (1 - tz), w2 = (1 - tx) * tz, w3 = tx * tz;
    return out.set(
      N[k] * w0 + N[k + 3] * w1 + N[k + r] * w2 + N[k + r + 3] * w3,
      N[k + 1] * w0 + N[k + 4] * w1 + N[k + r + 1] * w2 + N[k + r + 4] * w3,
      N[k + 2] * w0 + N[k + 5] * w1 + N[k + r + 2] * w2 + N[k + r + 5] * w3
    ).normalize();
  }

  function inside(x, z) {
    return x > originX + cell && x < originX + width - cell && z > originZ + cell && z < originZ + depth - cell;
  }

  const bump = snowBumpTexture();
  const mat = snowMaterial(bump);
  const mesh = new THREE.Group();
  const chunks = [];
  for (let j0 = 0; j0 < NZ - 1; j0 += CHUNK) {
    for (let i0 = 0; i0 < NX - 1; i0 += CHUNK) {
      const w = Math.min(CHUNK, NX - 1 - i0) + 1, d = Math.min(CHUNK, NZ - 1 - j0) + 1;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(w * d * 3), uv = new Float32Array(w * d * 2);
      for (let b = 0; b < d; b++) for (let a = 0; a < w; a++) {
        const v = b * w + a, x = originX + (i0 + a) * C, z = originZ + (j0 + b) * C;
        pos[v * 3] = x; pos[v * 3 + 2] = z;
        uv[v * 2] = x / UVS; uv[v * 2 + 1] = z / UVS;
      }
      const idx = [];
      for (let b = 0; b < d - 1; b++) for (let a = 0; a < w - 1; a++) {
        const A = b * w + a, B = A + w, Cc = B + 1, D = A + 1;
        idx.push(A, B, D, B, Cc, D);
      }
      geo.setIndex(idx);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(w * d * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(w * d * 3), 3));
      geo.setAttribute('pist', new THREE.BufferAttribute(new Float32Array(w * d * 2), 2));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      const m = new THREE.Mesh(geo, mat);
      m.receiveShadow = true;
      m.castShadow = true;
      mesh.add(m);
      chunks.push({ geo, i0, j0, w, d });
    }
  }

  function sync() {
    for (const { geo, i0, j0, w, d } of chunks) {
      const p = geo.attributes.position.array, n = geo.attributes.normal.array;
      const c = geo.attributes.color.array, s = geo.attributes.pist.array;
      for (let b = 0; b < d; b++) for (let a = 0; a < w; a++) {
        const v = b * w + a, k = (j0 + b) * NX + i0 + a;
        p[v * 3 + 1] = H[k];
        n.set(N.subarray(k * 3, k * 3 + 3), v * 3);
        c.set(COL.subarray(k * 3, k * 3 + 3), v * 3);
        s[v * 2] = PIST[k * 2]; s[v * 2 + 1] = PIST[k * 2 + 1];
      }
      for (const a of ['position', 'normal', 'color', 'pist']) geo.attributes[a].needsUpdate = true;
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
    }
  }
  sync();

  const groomed = new THREE.Color(0xfbfdff);
  function groom(fn) {
    let any = false;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      const r = fn(originX + i * C, originZ + j * C, H[k]);
      if (!r) continue;
      any = true;
      H[k] = r[0];
      const t = r[1];
      COL[k * 3] += (groomed.r - COL[k * 3]) * t;
      COL[k * 3 + 1] += (groomed.g - COL[k * 3 + 1]) * t;
      COL[k * 3 + 2] += (groomed.b - COL[k * 3 + 2]) * t;
      if (r.length > 2 && r[1] / 0.9 >= PIST[k * 2]) { PIST[k * 2] = r[1] / 0.9; PIST[k * 2 + 1] = r[2]; }
    }
    if (!any) return;
    calcNormals();
    sync();
  }

  const pois = Object.fromEntries(meta.pois.map(p => [p.name, p]));
  return { mesh, heightAt, normalAt, inside, groom, pois, meta };
}
