import * as THREE from 'three';

export function createFollowCamera(terrain) {
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.3, 60000);
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const back = new THREE.Vector3();

  function update(target, dir, dt, snap = false) {
    back.copy(dir).setY(0).normalize();
    desired.copy(target).addScaledVector(back, -9);
    let y = Math.max(target.y + 4.5, terrain.heightAt(desired.x, desired.z) + 2);
    for (const f of [0.2, 0.4, 0.6]) {
      const hf = terrain.heightAt(target.x + (desired.x - target.x) * f, target.z + (desired.z - target.z) * f);
      y = Math.max(y, target.y + 1 + (hf - target.y - 0.2) / f);
    }
    desired.y = Math.min(y, target.y + 16);
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
