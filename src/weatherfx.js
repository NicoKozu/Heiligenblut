import * as THREE from 'three';
import { HAZE } from './world.js';

const P = {
  sun: { fog: HAZE, col: 0xcfdeec, hemi: 1.15, sun: 2.3, cover: 0, turb: 2.6, ray: 1.1, exp: 0.85, rate: 0, wind: 0.5, fall: 1.1 },
  cloud: { fog: 3.2e-5, col: 0xc6ced8, hemi: 1.05, sun: 1.5, cover: 0.7, turb: 9, ray: 0.5, exp: 0.88, rate: 0, wind: 1, fall: 1.1 },
  snow: { fog: 9e-4, col: 0xd3d8df, hemi: 1.0, sun: 0.9, cover: 1, turb: 14, ray: 0.2, exp: 0.95, rate: 0.55, wind: 1.5, fall: 1.1 },
  storm: { fog: 1.7e-3, col: 0xc9ced5, hemi: 0.85, sun: 0.6, cover: 1, turb: 16, ray: 0.15, exp: 0.95, rate: 1, wind: 11, fall: 1.7 },
  fog: { fog: 3.6e-3, col: 0xdde1e6, hemi: 1.05, sun: 0.7, cover: 0.85, turb: 14, ray: 0.2, exp: 0.92, rate: 0, wind: 0.3, fall: 1.1 },
  foehn: { fog: 0.8e-5, col: 0xd6e0ec, hemi: 1.2, sun: 2.4, cover: 0.3, turb: 3.4, ray: 1.0, exp: 0.85, rate: 0, wind: 3, fall: 1.1 }
};
const N = 9000;
const BOX = new THREE.Vector3(70, 40, 70);

const VERT = `
attribute vec4 seed;
uniform float uTime, uRate, uScale;
uniform vec3 uCam, uBox, uOff;
varying float vA;
void main() {
  vec3 p = seed.xyz * uBox + vec3(uOff.x + sin(uTime * 1.3 + seed.w * 40.0) * 0.4, -uOff.y * (0.75 + 0.5 * seed.w), uOff.z + cos(uTime * 1.1 + seed.w * 30.0) * 0.4);
  p = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float on = step(seed.w, uRate);
  float d = -mv.z;
  gl_PointSize = on * (0.035 + 0.03 * seed.w) * uScale * projectionMatrix[1][1] / max(d, 0.3);
  vA = on * smoothstep(0.3, 2.0, d) * (1.0 - smoothstep(20.0, 34.0, d));
}`;

const FRAG = `
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.1, length(c)) * vA * 0.9;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0), a);
}`;

export function createWeatherFx(world, pano, renderer) {
  const seeds = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) seeds[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const U = {
    uTime: { value: 0 }, uRate: { value: 0 }, uScale: { value: 500 },
    uCam: { value: new THREE.Vector3() }, uBox: { value: BOX }, uOff: { value: new THREE.Vector3() }
  };
  const flakes = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false }));
  flakes.frustumCulled = false;
  flakes.renderOrder = 5;

  const pu = pano.uniforms, sky = world.sky.material.uniforms;
  const base = { sun: pu.sunCol.value.clone(), sky: pu.skyCol.value.clone(), gnd: pu.gndCol.value.clone() };
  const cur = { ...P.sun, col: new THREE.Color(P.sun.col) }, tgt = { ...P.sun, col: new THREE.Color(P.sun.col) };
  const wdir = new THREE.Vector2(0.8, 0.6);
  let key = 'sun', first = true;

  function set(day) {
    const k = day && P[day.type] ? day.type : 'sun';
    if (k === key && !first) return;
    key = k;
    Object.assign(tgt, P[k], { col: new THREE.Color(P[k].col) });
    if (first) { Object.assign(cur, tgt, { col: tgt.col.clone() }); first = false; }
  }

  function update(dt, camera, canvasH) {
    const a = 1 - Math.exp(-dt / 1.5);
    for (const k of ['hemi', 'sun', 'cover', 'turb', 'ray', 'exp', 'rate', 'wind', 'fall']) cur[k] += (tgt[k] - cur[k]) * a;
    cur.fog = Math.exp(Math.log(cur.fog) + (Math.log(tgt.fog) - Math.log(cur.fog)) * a);
    cur.col.lerp(tgt.col, a);
    world.scene.fog.density = cur.fog;
    world.scene.fog.color.copy(cur.col);
    world.hemi.intensity = cur.hemi;
    world.sun.intensity = cur.sun;
    renderer.toneMappingExposure = cur.exp;
    sky.turbidity.value = cur.turb;
    sky.rayleigh.value = cur.ray;
    pu.haze.value = cur.fog;
    pu.pCover.value = cur.cover;
    pu.sunCol.value.copy(base.sun).multiplyScalar(cur.sun / P.sun.sun);
    pu.skyCol.value.copy(base.sky).multiplyScalar(cur.hemi / P.sun.hemi);
    pu.gndCol.value.copy(base.gnd).multiplyScalar(cur.hemi / P.sun.hemi);
    U.uTime.value += dt;
    U.uRate.value = cur.rate;
    U.uScale.value = canvasH * 0.5;
    U.uOff.value.x = (U.uOff.value.x + wdir.x * cur.wind * dt) % 7000;
    U.uOff.value.z = (U.uOff.value.z + wdir.y * cur.wind * dt) % 7000;
    U.uOff.value.y = (U.uOff.value.y + cur.fall * dt) % 4000;
    U.uCam.value.copy(camera.position);
    flakes.visible = cur.rate > 0.01;
  }

  return { object: flakes, set, update, get type() { return key; } };
}
