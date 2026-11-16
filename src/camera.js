import * as THREE from 'three';

export function createFollowCamera() {
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 6000);
  const offset = new THREE.Vector3(0, 4.5, -9);
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();

  function update(target, dt, snap = false) {
    desired.copy(target).add(offset);
    const k = snap ? 1 : 1 - Math.exp(-dt * 5);
    camera.position.lerp(desired, k);
    look.copy(target).add(new THREE.Vector3(0, 1.2, 4));
    camera.lookAt(look);
  }

  return { camera, update };
}
