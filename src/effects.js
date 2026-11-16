import * as THREE from 'three';
import { down } from './input.js';

const SEGS = 2500;
const STEP = 0.6;
const P = 900;

export function createEffects(terrain) {
  const group = new THREE.Group();

  const tpos = new Float32Array(SEGS * 2 * 4 * 3);
  const idx = new Uint32Array(SEGS * 2 * 6);
  for (let q = 0; q < SEGS * 2; q++) idx.set([q * 4, q * 4 + 2, q * 4 + 1, q * 4 + 1, q * 4 + 2, q * 4 + 3], q * 6);
  const tgeo = new THREE.BufferGeometry();
  const tattr = new THREE.BufferAttribute(tpos, 3).setUsage(THREE.DynamicDrawUsage);
  tgeo.setAttribute('position', tattr);
  tgeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(tpos.length).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
  tgeo.setIndex(new THREE.BufferAttribute(idx, 1));
  const tracks = new THREE.Mesh(tgeo, new THREE.MeshLambertMaterial({
    color: 0x9fb1c8, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
  }));
  tracks.frustumCulled = false;
  tracks.renderOrder = 2;
  group.add(tracks);
  let head = 0, last = null;

  function edges(state, x, z, slip) {
    const rx = state.dir.z, rz = -state.dir.x;
    const ski = state.mode === 'ski';
    const off = ski ? [-0.13, 0.13] : [-0.08, 0.08];
    const w = (ski ? 0.035 : 0.08) + Math.min(slip, 6) * (ski ? 0.04 : 0.05);
    return off.map(o => {
      const ax = x + rx * (o - w), az = z + rz * (o - w), bx = x + rx * (o + w), bz = z + rz * (o + w);
      return [ax, terrain.heightAt(ax, az) + 0.05, az, bx, terrain.heightAt(bx, bz) + 0.05, bz];
    });
  }

  function addTrack(state, slip, onGround) {
    const x = state.pos.x, z = state.pos.z;
    if (!onGround || state.reset || state.speed < 0.8) { last = null; return; }
    if (last) {
      const d = Math.hypot(x - last.x, z - last.z);
      if (d < STEP) return;
      if (d > 4) { last = null; return; }
    }
    const e = edges(state, x, z, slip);
    if (last) {
      for (let s = 0; s < 2; s++) {
        const o = ((head * 2 + s) * 4) * 3;
        tpos.set(last.e[s], o);
        tpos.set(e[s], o + 6);
      }
      tattr.addUpdateRange(head * 24, 24);
      tattr.needsUpdate = true;
      head = (head + 1) % SEGS;
    }
    last = { x, z, e };
  }

  const ppos = new Float32Array(P * 3), pvel = new Float32Array(P * 3);
  const life = new Float32Array(P), max = new Float32Array(P).fill(1);
  const size = new Float32Array(P), alpha = new Float32Array(P), grow = new Float32Array(P);
  const pgeo = new THREE.BufferGeometry();
  const pa = new THREE.BufferAttribute(ppos, 3).setUsage(THREE.DynamicDrawUsage);
  const sa = new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage);
  const aa = new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage);
  pgeo.setAttribute('position', pa);
  pgeo.setAttribute('size', sa);
  pgeo.setAttribute('alpha', aa);
  const uniforms = { uScale: { value: 500 } };
  const dust = new THREE.Points(pgeo, new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: 'attribute float size;attribute float alpha;uniform float uScale;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=size*uScale*projectionMatrix[1][1]/max(-mv.z,0.1);vA=alpha;}',
    fragmentShader: 'varying float vA;void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.1,d)*vA;if(a<0.01)discard;gl_FragColor=vec4(0.93,0.95,0.98,a);}'
  }));
  dust.frustumCulled = false;
  dust.renderOrder = 3;
  group.add(dust);
  let next = 0, acc = 0;

  function emit(x, y, z, vx, vy, vz, spread, s0, l0) {
    const i = next;
    next = (next + 1) % P;
    ppos[i * 3] = x + (Math.random() - 0.5) * 0.4;
    ppos[i * 3 + 1] = y + Math.random() * 0.15;
    ppos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
    pvel[i * 3] = vx + (Math.random() - 0.5) * spread;
    pvel[i * 3 + 1] = vy + Math.random() * spread * 0.6;
    pvel[i * 3 + 2] = vz + (Math.random() - 0.5) * spread;
    life[i] = max[i] = l0 * (0.6 + Math.random() * 0.7);
    size[i] = s0 * (0.6 + Math.random() * 0.6);
    grow[i] = s0 * 1.6;
  }

  function burst(state, n, strength) {
    const p = state.pos, v = state.vel;
    for (let k = 0; k < n; k++) emit(p.x, p.y, p.z, v.x * 0.25, 1 + strength * 0.25, v.z * 0.25, 2 + strength * 0.3, 0.6, 1.2);
  }

  let wasGround = true, lastVy = 0;
  const right = new THREE.Vector3();

  function update(dt, state, riding, camH) {
    uniforms.uScale.value = camH * 0.5;
    const g = terrain.heightAt(state.pos.x, state.pos.z);
    const onGround = !riding && state.grounded && state.pos.y - g < 0.3;
    right.set(state.dir.z, 0, -state.dir.x);
    const lat = state.vel.dot(right), slip = Math.abs(lat), sp = state.speed;
    addTrack(state, slip, onGround);

    if (onGround && !wasGround && !state.reset && -lastVy > 3) burst(state, Math.min(70, -lastVy * 6), -lastVy);
    wasGround = onGround;
    lastVy = state.vel.y;

    if (onGround && sp > 4) {
      const brake = state.crashed <= 0 && down('KeyS', 'ArrowDown');
      const crash = state.crashed > 0;
      const rate = sp * 0.8 + slip * 9 + (brake ? sp * 2 : 0) + (crash ? sp * 6 : 0);
      acc += rate * dt;
      const side = Math.sign(lat) || 1;
      const p = state.pos, v = state.vel;
      while (acc >= 1) {
        acc -= 1;
        const kick = slip * 0.5 + (brake ? sp * 0.12 : 0);
        emit(p.x - v.x * 0.02, p.y + 0.05, p.z - v.z * 0.02,
          v.x * 0.45 + right.x * side * kick, 0.8 + sp * 0.05 + kick * 0.3, v.z * 0.45 + right.z * side * kick,
          1.2 + sp * 0.04, 0.35 + Math.min(sp, 25) * 0.012, 0.9);
      }
    } else acc = 0;

    const drag = Math.exp(-2.2 * dt);
    for (let i = 0; i < P; i++) {
      if (life[i] <= 0) { alpha[i] = 0; continue; }
      life[i] -= dt;
      const t = 1 - Math.max(life[i], 0) / max[i];
      pvel[i * 3 + 1] -= 3.5 * dt;
      for (let c = 0; c < 3; c++) {
        pvel[i * 3 + c] *= drag;
        ppos[i * 3 + c] += pvel[i * 3 + c] * dt;
      }
      size[i] += grow[i] * dt;
      alpha[i] = 0.55 * (1 - t) * Math.min(1, t * 8);
    }
    pa.needsUpdate = sa.needsUpdate = aa.needsUpdate = true;
  }

  return { group, update, burst };
}
