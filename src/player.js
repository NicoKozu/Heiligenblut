import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { START, SLOPE } from './config.js';

export function createPlayer() {
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

  const state = { pos: new THREE.Vector3(), speed: 0 };
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();

  function reset() {
    state.pos.set(START.x, heightAt(START.x, START.z), START.z);
    state.speed = 0;
  }

  function update(dt) {
    state.speed = Math.min(state.speed + dt * 2.5, 12);
    state.pos.z += state.speed * dt;
    state.pos.x = Math.sin(state.pos.z * 0.01) * 20;
    if (state.pos.z > SLOPE.length / 2 - 20) reset();
    state.pos.y = heightAt(state.pos.x, state.pos.z);
    const e = 0.5;
    normal.set(
      heightAt(state.pos.x - e, state.pos.z) - heightAt(state.pos.x + e, state.pos.z),
      2 * e,
      heightAt(state.pos.x, state.pos.z - e) - heightAt(state.pos.x, state.pos.z + e)
    ).normalize();
    group.position.copy(state.pos);
    group.quaternion.setFromUnitVectors(up, normal);
  }

  addEventListener('keydown', e => { if (e.code === 'KeyR') reset(); });
  reset();
  return { object: group, state, update };
}
