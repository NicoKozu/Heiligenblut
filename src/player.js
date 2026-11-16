import * as THREE from 'three';
import { START } from './config.js';
import { down, consume } from './input.js';

const G = 9.81;
const MU_GLIDE = 0.05;
const MU_PLOW = 0.7;
const DRAG_UP = 0.0036;
const DRAG_TUCK = 0.0015;
const JUMP = 4.2;
const SNAP = 0.3;
const CRASH = 14;
const STEP = 0.012;

export function createPlayer(terrain) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.6 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1d2b3a, roughness: 0.7 });
  const skiMat = new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.4 });

  const upper = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 10), jacket);
  body.position.y = 0.45;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  head.position.y = 1.05;
  upper.add(body, head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.3), pants);
  const skiGeo = new THREE.BoxGeometry(0.1, 0.04, 1.7);
  const skiL = new THREE.Mesh(skiGeo, skiMat);
  const skiR = skiL.clone();
  skiL.position.set(-0.13, 0.03, 0.1);
  skiR.position.set(0.13, 0.03, 0.1);
  group.add(upper, legs, skiL, skiR);
  group.traverse(o => { if (o.isMesh) o.castShadow = true; });

  const state = {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    dir: new THREE.Vector3(0, 0, 1),
    heading: 0,
    speed: 0,
    grounded: true,
    crashed: 0,
    reset: false
  };
  const up = new THREE.Vector3(0, 1, 0);
  const n = new THREE.Vector3();
  const upS = new THREE.Vector3(0, 1, 0);
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const qTilt = new THREE.Quaternion();
  const qYaw = new THREE.Quaternion();
  const qRoll = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const pose = { tuck: 0, plow: 0, lean: 0 };
  let input = { steer: 0, tuck: false, plow: false, jump: false };

  function reset() {
    state.pos.set(START.x, terrain.heightAt(START.x, START.z), START.z);
    terrain.normalAt(START.x, START.z, n);
    state.heading = Math.atan2(n.x, n.z);
    state.vel.set(0, 0, 0);
    state.grounded = true;
    state.crashed = 0;
    state.reset = true;
    upS.copy(n);
  }

  function step(dt) {
    const v = state.vel;
    const sp = v.length();
    const ctrl = state.crashed <= 0;
    const steer = ctrl ? input.steer : 0;
    const rate = state.grounded ? Math.min(2.2, 0.9 + sp / 12) * (input.plow ? 0.7 : 1) : 1.6;
    state.heading += steer * rate * dt;
    state.dir.set(Math.sin(state.heading), 0, Math.cos(state.heading));

    if (state.grounded) {
      terrain.normalAt(state.pos.x, state.pos.z, n);
      fwd.copy(state.dir).addScaledVector(n, -state.dir.dot(n)).normalize();
      right.crossVectors(fwd, n);
      v.addScaledVector(n, -v.dot(n));
      v.addScaledVector(fwd, -G * fwd.y * dt);
      if (ctrl && input.tuck && sp < 5) v.addScaledVector(fwd, 1.5 * dt);

      let lon = v.dot(fwd);
      let lat = v.dot(right);
      const grip = !ctrl ? 1.5 : input.plow ? 4 : 7;
      const e = Math.exp(-grip * dt);
      const removed = Math.abs(lat) * (1 - e);
      lat *= e;
      if (lon > 0) lon += removed * (input.plow || !ctrl ? 0.2 : 0.75);
      v.copy(fwd).multiplyScalar(lon).addScaledVector(right, lat);

      const s = v.length();
      if (s > 0) {
        const mu = !ctrl ? 0.6 : input.plow ? MU_PLOW : MU_GLIDE;
        const drag = ctrl && input.tuck ? DRAG_TUCK : DRAG_UP;
        const dec = (mu * G * n.y + drag * s * s) * dt;
        v.multiplyScalar(Math.max(0, s - dec) / s);
      }

      if (ctrl && input.jump) {
        v.addScaledVector(n, JUMP);
        state.grounded = false;
      }
    } else {
      v.y -= G * dt;
      v.multiplyScalar(1 - DRAG_UP * sp * dt);
    }
    input.jump = false;

    state.pos.addScaledVector(v, dt);
    if (!terrain.inside(state.pos.x, state.pos.z)) { reset(); return; }
    const y = terrain.heightAt(state.pos.x, state.pos.z);
    if (state.grounded) {
      if (state.pos.y - y > SNAP) state.grounded = false;
      else state.pos.y = y;
    } else if (state.pos.y <= y) {
      terrain.normalAt(state.pos.x, state.pos.z, n);
      const vn = v.dot(n);
      if (vn < 0) v.addScaledVector(n, -vn);
      if (vn < -CRASH) { v.multiplyScalar(0.3); state.crashed = 2; }
      state.pos.y = y;
      state.grounded = true;
    }
  }

  function animate(dt) {
    const k = 1 - Math.exp(-dt * 8);
    const ctrl = state.crashed <= 0;
    pose.tuck += ((ctrl && input.tuck ? 1 : 0) - pose.tuck) * k;
    pose.plow += ((ctrl && input.plow ? 1 : 0) - pose.plow) * k;
    const leanT = state.grounded ? input.steer * Math.min(1, state.speed / 12) * 0.45 : 0;
    pose.lean += (leanT - pose.lean) * k;

    upper.position.y = 0.8 - 0.3 * pose.tuck - (ctrl ? 0 : 0.5);
    upper.rotation.x = 0.12 + 0.6 * pose.tuck;
    legs.scale.y = 1 - 0.35 * pose.tuck;
    legs.position.y = 0.4 * legs.scale.y + 0.04;
    skiL.rotation.y = 0.28 * pose.plow;
    skiR.rotation.y = -0.28 * pose.plow;
    skiL.position.x = -0.13 - 0.12 * pose.plow;
    skiR.position.x = 0.13 + 0.12 * pose.plow;

    if (state.grounded) terrain.normalAt(state.pos.x, state.pos.z, n);
    upS.lerp(state.grounded ? n : up, 1 - Math.exp(-dt * 10)).normalize();
    group.position.copy(state.pos);
    qTilt.setFromUnitVectors(up, upS);
    qYaw.setFromAxisAngle(up, state.heading);
    qRoll.setFromAxisAngle(zAxis, -pose.lean);
    group.quaternion.copy(qTilt).multiply(qYaw).multiply(qRoll);
  }

  function update(dt) {
    state.reset = false;
    if (consume('KeyR')) reset();
    input = {
      steer: (down('KeyA', 'ArrowLeft') ? 1 : 0) - (down('KeyD', 'ArrowRight') ? 1 : 0),
      tuck: down('KeyW', 'ArrowUp'),
      plow: down('KeyS', 'ArrowDown'),
      jump: consume('Space') && state.grounded
    };
    if (input.plow) input.tuck = false;
    const steps = Math.max(1, Math.ceil(dt / STEP));
    for (let i = 0; i < steps; i++) step(dt / steps);
    if (state.crashed > 0) state.crashed -= dt;
    state.speed = state.vel.length();
    animate(dt);
  }

  reset();
  return { object: group, state, update };
}
