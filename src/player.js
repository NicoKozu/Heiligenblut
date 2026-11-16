import * as THREE from 'three';
import { START } from './config.js';

export function createPlayer(terrain) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.6 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1d2b3a, roughness: 0.7 });
  const skiMat = new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.4 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 10), jacket);
  body.position.y = 1.25;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.3), pants);
  legs.position.y = 0.45;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  head.position.y = 1.85;
  const skiGeo = new THREE.BoxGeometry(0.1, 0.04, 1.7);
  const skiL = new THREE.Mesh(skiGeo, skiMat);
  const skiR = skiL.clone();
  skiL.position.set(-0.13, 0.03, 0.1);
  skiR.position.set(0.13, 0.03, 0.1);
  group.add(body, legs, head, skiL, skiR);
  group.traverse(o => { if (o.isMesh) o.castShadow = true; });

  const state = { pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), speed: 0, flat: 0 };
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const fall = new THREE.Vector3();
  const qTilt = new THREE.Quaternion();
  const qYaw = new THREE.Quaternion();

  function reset() {
    state.pos.set(START.x, terrain.heightAt(START.x, START.z), START.z);
    state.dir.set(-0.3, 0, 1).normalize();
    state.speed = 0;
    state.flat = 0;
  }

  function update(dt) {
    terrain.normalAt(state.pos.x, state.pos.z, normal);
    fall.set(normal.x, 0, normal.z);
    const g = fall.length();
    if (g > 0.001) state.dir.lerp(fall.normalize(), Math.min(1, dt * 1.5)).normalize();
    state.speed += (Math.min(18, 6 + g * 30) - state.speed) * Math.min(1, dt * 0.8);
    state.pos.addScaledVector(state.dir, state.speed * dt);
    state.flat = g < 0.06 ? state.flat + dt : 0;
    if (state.flat > 3 || !terrain.inside(state.pos.x, state.pos.z)) reset();
    state.pos.y = terrain.heightAt(state.pos.x, state.pos.z);
    group.position.copy(state.pos);
    qYaw.setFromAxisAngle(up, Math.atan2(state.dir.x, state.dir.z));
    qTilt.setFromUnitVectors(up, normal);
    group.quaternion.copy(qTilt).multiply(qYaw);
  }

  addEventListener('keydown', e => { if (e.code === 'KeyR') reset(); });
  reset();
  return { object: group, state, update };
}
