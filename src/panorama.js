import * as THREE from 'three';
import { HAZE } from './world.js';
import { get } from './config.js';

const URL = 'public/terrain/panorama';
const EARTH = 0.87 / (2 * 6371000);
const CLOUD_Y = 5400;

const NOISE = `
float pHash(vec2 p) { p = fract(mod(p, 512.0) * vec2(123.34, 456.21) );  p += dot(p, p + 45.32); return fract(p.x * p.y); }
float pNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), u.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float pFbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * pNoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}
float cloudD(vec2 xz, float t) {
  return smoothstep(0.5, 0.76, pFbm(xz / 7000.0 + vec2(t * 0.0016, t * 0.0006)));
}
float cloudShade(vec3 w, vec3 sd, float t) {
  vec2 q = (w.xz + sd.xz / sd.y * (${CLOUD_Y.toFixed(1)} - w.y)) / 7000.0 + vec2(t * 0.0016, t * 0.0006);
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * pNoise(q); q = q * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return 1.0 - 0.72 * smoothstep(0.43, 0.68, s);
}
`;

const BAKE_FRAG = `
precision highp float;
uniform sampler2D tN, tM, tF;
uniform vec4 nR;
uniform vec2 nN;
uniform vec3 mL, fL;
uniform vec4 rect;
uniform vec3 sunDir;
varying vec2 vUv;
float bil(sampler2D t, vec2 g, vec2 n) {
  g = clamp(g, vec2(0.0), n - 1.001);
  ivec2 i = ivec2(floor(g));
  vec2 f = g - vec2(i);
  float a = texelFetch(t, i, 0).r, b = texelFetch(t, i + ivec2(1, 0), 0).r;
  float c = texelFetch(t, i + ivec2(0, 1), 0).r, d = texelFetch(t, i + ivec2(1, 1), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float hAny(vec2 p) {
  vec2 g = (p - nR.xy) / nR.z;
  if (g.x > 0.0 && g.y > 0.0 && g.x < nN.x - 1.0 && g.y < nN.y - 1.0) return bil(tN, g, nN);
  if (max(abs(p.x), abs(p.y)) < mL.x) return bil(tM, (p + mL.x) / mL.y, vec2(mL.z));
  return bil(tF, (p + fL.x) / fL.y, vec2(fL.z));
}
void main() {
  vec2 p = rect.xy + vUv * rect.zw;
  vec2 dir = normalize(sunDir.xz);
  float tanS = sunDir.y / length(sunDir.xz);
  float h0 = hAny(p) + 4.0;
  float m = 1.0, t = 12.0;
  for (int k = 0; k < 220; k++) {
    float ray = h0 + t * tanS;
    if (ray > 3850.0 || t > 45000.0) break;
    m = min(m, (ray - hAny(p + dir * t)) / t);
    if (m < -0.05) break;
    t += 8.0 + t * 0.03;
  }
  float v = smoothstep(-0.03, 0.03, m);
  gl_FragColor = vec4(v, v, v, 1.0);
}`;

const TERRAIN_VERT = `
uniform float earth;
varying vec3 vW;
varying vec3 vN;
void main() {
  vW = position;
  vN = normal;
  vec2 d = position.xz - cameraPosition.xz;
  vec3 w = position;
  w.y -= dot(d, d) * earth;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const TERRAIN_FRAG = `
uniform sampler2D visM, visF;
uniform float midHalf, farHalf, haze, time;
uniform vec3 sunDir, sunCol, skyCol, gndCol, hazeCol, sunHaze;
varying vec3 vW;
varying vec3 vN;
${NOISE}
void main() {
  vec3 n = normalize(vN);
  float h = vW.y;
  float nz = pFbm(vW.xz / 220.0);
  float nf = mix(0.5, pNoise(vW.xz / 37.0), 1.0 - smoothstep(0.25, 0.9, length(fwidth(vW.xz)) / 37.0));
  float slope = 1.0 - n.y;
  bool inMid = max(abs(vW.x), abs(vW.z)) < midHalf;
  float rl = inMid ? 0.17 : 0.11;
  float rock = smoothstep(rl, rl + 0.13, slope + (nz - 0.5) * 0.14 + (nf - 0.5) * 0.06);
  float tl = 1980.0 + (nz - 0.5) * 300.0;
  float forest = (1.0 - smoothstep(tl - 180.0, tl, h)) * (1.0 - smoothstep(rl + 0.05, rl + 0.2, slope)) * smoothstep(0.32, 0.55, pFbm(vW.xz / 700.0 + 3.1));
  float glacier = smoothstep(2650.0, 2900.0, h + nz * 150.0) * (1.0 - smoothstep(rl, rl + 0.1, slope));
  vec3 snow = vec3(0.84, 0.88, 0.94) * (0.92 + 0.12 * nf);
  vec3 rockC = mix(vec3(0.07, 0.066, 0.062), vec3(0.15, 0.14, 0.13), nf);
  vec2 fl = normalize(n.xz + 1e-4);
  vec2 sq = vec2(dot(vW.xz, vec2(-fl.y, fl.x)) / 9.0, dot(vW.xz, fl) / 70.0);
  float aa = 1.0 - smoothstep(0.25, 0.9, max(fwidth(sq.x), fwidth(sq.y)));
  float gully = mix(0.5, pNoise(sq + nz * 2.0) * 0.7 + pNoise(sq * vec2(2.7, 1.3)) * 0.3, aa);
  rockC = mix(rockC, snow * 0.95, smoothstep(0.52, 0.78, gully) * 0.75);
  vec3 forC = mix(vec3(0.028, 0.038, 0.034), snow, 0.18 + 0.22 * nf);
  vec3 alb = mix(snow, snow * vec3(0.93, 0.97, 1.02), glacier);
  alb = mix(alb, forC, forest);
  alb = mix(alb, rockC, rock);
  float vis = inMid
    ? texture2D(visM, (vW.xz + midHalf) / (2.0 * midHalf)).r
    : texture2D(visF, (vW.xz + farHalf) / (2.0 * farHalf)).r;
  vis *= cloudShade(vW, sunDir, time);
  vec3 v = normalize(cameraPosition - vW);
  float ndl = max(dot(n, sunDir), 0.0);
  vec3 irr = sunCol * ndl * vis + mix(gndCol, skyCol, 0.5 + 0.5 * n.y);
  vec3 col = alb * irr * 0.31831;
  float spec = pow(max(dot(n, normalize(sunDir + v)), 0.0), 40.0) * ndl * vis * (1.0 - rock) * (1.0 - forest);
  col += sunCol * spec * 0.04;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float sa = pow(max(dot(-v, sunDir), 0.0), 8.0);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(hazeCol, sunHaze, sa * 0.6), 1.0 - exp(-haze * distance(vW, cameraPosition)));
}`;

const CLOUD_VERT = `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const CLOUD_FRAG = `
uniform float time, haze;
uniform vec3 sunDir, hazeCol, sunHaze;
varying vec3 vW;
${NOISE}
void main() {
  float d = cloudD(vW.xz, time);
  float det = pFbm(vW.xz / 1400.0 + vec2(time * 0.012, 0.0));
  d = clamp(d * (0.7 + 0.6 * det) - 0.08, 0.0, 1.0);
  vec2 cq = mat2(0.8, -0.6, 0.6, 0.8) * vW.xz;
  float ci = smoothstep(0.55, 0.85, pFbm(cq / vec2(16000.0, 2200.0) + vec2(time * 0.0009, 0.0))) * 0.35;
  vec3 v = normalize(vW - cameraPosition);
  float fw = pow(max(dot(v, sunDir), 0.0), 6.0);
  vec3 base = mix(vec3(1.0, 1.0, 1.02), vec3(0.58, 0.62, 0.7), d * 0.85);
  base += vec3(1.0, 0.88, 0.7) * fw * 0.6 * (1.0 - d * 0.7);
  float a = max(d * 0.93, ci);
  base = mix(vec3(1.02, 1.03, 1.06), base, d * 0.93 / max(a, 0.001));
  a *= 1.0 - smoothstep(38000.0, 62000.0, length(vW.xz - cameraPosition.xz));
  gl_FragColor = vec4(base, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(hazeCol, sunHaze, fw * 0.6), 1.0 - exp(-haze * 0.6 * distance(vW, cameraPosition)));
}`;

function smooth(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

function floatTex(data, w, h) {
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

export async function loadPanorama(terrain, world) {
  const [meta, buf] = await Promise.all([
    get(URL + '.json', 'json'),
    get(URL + '.bin', 'arrayBuffer')
  ]);
  const raw = new Uint16Array(buf);
  let off = 0;
  const [mid, far] = meta.levels.map(l => {
    const h = new Float32Array(l.n * l.n);
    for (let i = 0; i < h.length; i++) h[i] = raw[off + i] * meta.scale;
    off += h.length;
    return { ...l, h };
  });

  function sample(L, x, z) {
    const fx = Math.min(Math.max((x + L.half) / L.cell, 0), L.n - 1.001);
    const fz = Math.min(Math.max((z + L.half) / L.cell, 0), L.n - 1.001);
    const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, k = j * L.n + i, h = L.h;
    return (h[k] * (1 - tx) + h[k + 1] * tx) * (1 - tz) + (h[k + L.n] * (1 - tx) + h[k + L.n + 1] * tx) * tz;
  }

  const tm = terrain.meta;
  const near = { x0: tm.originX, z0: tm.originZ, x1: tm.originX + (tm.nx - 1) * tm.cell, z1: tm.originZ + (tm.nz - 1) * tm.cell };
  const inNear = (x, z, m = 0) => x > near.x0 + m && x < near.x1 - m && z > near.z0 + m && z < near.z1 - m;

  function heightAny(x, z) {
    if (inNear(x, z)) return terrain.heightAt(x, z);
    if (Math.abs(x) < mid.half && Math.abs(z) < mid.half) return sample(mid, x, z);
    return sample(far, x, z);
  }

  const sunDir = world.sunDir;
  const lin = (c, k) => c.clone().multiplyScalar(k);
  const time = { value: 0 };
  const uniforms = {
    visM: { value: null }, visF: { value: null },
    midHalf: { value: mid.half }, farHalf: { value: far.half },
    haze: { value: HAZE }, time,
    earth: { value: EARTH },
    sunDir: { value: sunDir },
    sunCol: { value: lin(world.sun.color, world.sun.intensity) },
    skyCol: { value: lin(world.hemi.color, world.hemi.intensity) },
    gndCol: { value: lin(world.hemi.groundColor, world.hemi.intensity) },
    hazeCol: { value: world.scene.fog.color },
    sunHaze: { value: new THREE.Color(0xfff0d8) }
  };
  const terrainMat = new THREE.ShaderMaterial({ uniforms, vertexShader: TERRAIN_VERT, fragmentShader: TERRAIN_FRAG });

  function buildLevel(L, heightFn, skipCell, chunk) {
    const n = L.n, c = L.cell, o = -L.half;
    const H = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) H[j * n + i] = heightFn(o + i * c, o + j * c, L.h[j * n + i]);
    const g = new THREE.Group();
    for (let cj = 0; cj < n - 1; cj += chunk) {
      for (let ci = 0; ci < n - 1; ci += chunk) {
        const ni = Math.min(chunk, n - 1 - ci), nj = Math.min(chunk, n - 1 - cj), w = ni + 1;
        const idx = [];
        for (let b = 0; b < nj; b++) {
          for (let a = 0; a < ni; a++) {
            if (skipCell(o + (ci + a) * c, o + (cj + b) * c, c)) continue;
            const v = b * w + a;
            idx.push(v, v + w, v + 1, v + 1, v + w, v + w + 1);
          }
        }
        if (!idx.length) continue;
        const pos = new Float32Array(w * (nj + 1) * 3), nrm = new Float32Array(pos.length);
        for (let b = 0; b <= nj; b++) {
          for (let a = 0; a <= ni; a++) {
            const i = ci + a, j = cj + b, k = (b * w + a) * 3;
            pos[k] = o + i * c; pos[k + 1] = H[j * n + i]; pos[k + 2] = o + j * c;
            const hl = H[j * n + Math.max(i - 1, 0)], hr = H[j * n + Math.min(i + 1, n - 1)];
            const hu = H[Math.max(j - 1, 0) * n + i], hd = H[Math.min(j + 1, n - 1) * n + i];
            const nx = hl - hr, nz = hu - hd, ny = 2 * c, l = Math.hypot(nx, ny, nz);
            nrm[k] = nx / l; nrm[k + 1] = ny / l; nrm[k + 2] = nz / l;
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        geo.setIndex(idx);
        geo.computeBoundingSphere();
        geo.boundingSphere.radius += 400;
        g.add(new THREE.Mesh(geo, terrainMat));
      }
    }
    return g;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 150, 200000);
  scene.add(world.sky);

  scene.add(buildLevel(mid, (x, z, h) => {
    const e = mid.half - Math.max(Math.abs(x), Math.abs(z));
    h = sample(far, x, z) + (h - sample(far, x, z)) * smooth(0, 1500, e);
    if (inNear(x, z)) {
      const ei = Math.min(x - near.x0, near.x1 - x, z - near.z0, near.z1 - z);
      h -= 25 * smooth(0, 60, ei);
    }
    return h;
  }, (x, z, c) => inNear(x, z, 200) && inNear(x + c, z + c, 200), 64));

  scene.add(buildLevel(far, (x, z, h) => h,
    (x, z, c) => x >= -mid.half && x + c <= mid.half && z >= -mid.half && z + c <= mid.half, 56));

  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(130000, 130000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { time, haze: uniforms.haze, sunDir: uniforms.sunDir, hazeCol: uniforms.hazeCol, sunHaze: uniforms.sunHaze },
    vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide
  }));
  clouds.position.y = CLOUD_Y;
  clouds.frustumCulled = false;
  scene.add(clouds);

  const nearVis = { value: null };
  const nearRect = { value: new THREE.Vector4(near.x0, near.z0, near.x1 - near.x0, near.z1 - near.z0) };

  function bake(renderer) {
    const nn = new Float32Array(tm.nx * tm.nz);
    for (let j = 0; j < tm.nz; j++) for (let i = 0; i < tm.nx; i++) nn[j * tm.nx + i] = terrain.heightAt(near.x0 + i * tm.cell, near.z0 + j * tm.cell);
    const tN = floatTex(nn, tm.nx, tm.nz), tM = floatTex(mid.h, mid.n, mid.n), tF = floatTex(far.h, far.n, far.n);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tN: { value: tN }, tM: { value: tM }, tF: { value: tF },
        nR: { value: new THREE.Vector4(near.x0, near.z0, tm.cell, 0) },
        nN: { value: new THREE.Vector2(tm.nx, tm.nz) },
        mL: { value: new THREE.Vector3(mid.half, mid.cell, mid.n) },
        fL: { value: new THREE.Vector3(far.half, far.cell, far.n) },
        rect: { value: new THREE.Vector4() },
        sunDir: { value: sunDir }
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: BAKE_FRAG,
      depthTest: false, depthWrite: false
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    const bs = new THREE.Scene();
    bs.add(quad);
    const cam = new THREE.Camera();
    const run = (x0, z0, w, d, rx, rz) => {
      const rt = new THREE.WebGLRenderTarget(rx, rz, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      mat.uniforms.rect.value.set(x0, z0, w, d);
      renderer.setRenderTarget(rt);
      renderer.render(bs, cam);
      renderer.setRenderTarget(null);
      return rt.texture;
    };
    const nw = near.x1 - near.x0, nd = near.z1 - near.z0;
    nearVis.value = run(near.x0, near.z0, nw, nd, 1024, Math.round(1024 * nd / nw));
    uniforms.visM.value = run(-mid.half, -mid.half, 2 * mid.half, 2 * mid.half, 1024, 1024);
    uniforms.visF.value = run(-far.half, -far.half, 2 * far.half, 2 * far.half, 1024, 1024);
    for (const t of [tN, tM, tF]) t.dispose();
    mat.dispose();
    quad.geometry.dispose();
  }

  const patched = new WeakSet();
  function shade(root) {
    root.traverse(o => {
      if (!o.material) return;
      for (const m of [].concat(o.material)) {
        if (patched.has(m) || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial)) continue;
        patched.add(m);
        const prevKey = m.customProgramCacheKey.bind(m), prev = m.onBeforeCompile.bind(m);
        m.customProgramCacheKey = () => 'pvis' + prevKey();
        m.onBeforeCompile = (s, r) => {
          prev(s, r);
          s.uniforms.pvisTex = nearVis;
          s.uniforms.pvisR = nearRect;
          s.uniforms.pvisTime = time;
          s.uniforms.pvisSun = uniforms.sunDir;
          s.vertexShader = 'varying vec3 vPvW;\n' + s.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  vec4 pvw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  pvw = instanceMatrix * pvw;
  #endif
  vPvW = (modelMatrix * pvw).xyz;`);
          s.fragmentShader = s.fragmentShader
            .replace('#include <common>', `#include <common>
uniform sampler2D pvisTex;
uniform vec4 pvisR;
uniform float pvisTime;
uniform vec3 pvisSun;
varying vec3 vPvW;
${NOISE}`)
            .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  float pvis = texture2D(pvisTex, (vPvW.xz - pvisR.xy) / pvisR.zw).r * cloudShade(vPvW, pvisSun, pvisTime);
  reflectedLight.directDiffuse *= pvis;
  reflectedLight.directSpecular *= pvis;`);
        };
        m.needsUpdate = true;
      }
    });
  }

  const peaks = meta.peaks.map(p => ({ ...p, y: heightAny(p.x, p.z) }));

  function visibleFrom(cam, p) {
    const c = cam.position, dx = p.x - c.x, dz = p.z - c.z, D = Math.hypot(dx, dz);
    const ty = p.y - D * D * EARTH + 15;
    const steps = 48;
    for (let s = 1; s < steps; s++) {
      const f = s / steps, d = D * f;
      if (heightAny(c.x + dx * f, c.z + dz * f) - d * d * EARTH > c.y + (ty - c.y) * f) return false;
    }
    return true;
  }

  function update(cam, dt) {
    time.value += dt;
    camera.position.copy(cam.position);
    camera.quaternion.copy(cam.quaternion);
    camera.fov = cam.fov;
    camera.aspect = cam.aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    world.sky.position.copy(cam.position);
  }

  function render(renderer, nearScene, cam) {
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(nearScene, cam);
  }

  return { scene, camera, bake, shade, update, render, heightAny, peaks, visibleFrom, earth: EARTH };
}
