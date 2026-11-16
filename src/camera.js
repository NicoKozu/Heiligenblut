import * as THREE from 'three';

export function createFollowCamera(terrain) {
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.3, 60000);
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const back = new THREE.Vector3();

  function update(target, dir, dt, snap = false) {
    back.copy(dir).setY(0).normalize();
    desired.copy(target).addScaledVector(back, -9);
    desired.y = Math.max(target.y + 4.5, terrain.heightAt(desired.x, desired.z) + 2);
    const k = snap ? 1 : 1 - Math.exp(-dt * 4);
    camera.position.lerp(desired, k);
    const floor = terrain.heightAt(camera.position.x, camera.position.z) + 1.5;
    if (camera.position.y < floor) camera.position.y = floor;
    look.copy(target).addScaledVector(back, 4);
    look.y += 1.2;
    camera.lookAt(look);
  }

  return { camera, update };
}
