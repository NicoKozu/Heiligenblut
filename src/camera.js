import * as THREE from 'three';

export function createFollowCamera(terrain) {
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.3, 25000);
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const back = new THREE.Vector3();
  const head = new THREE.Vector3();
  const gaze = new THREE.Vector3(0, 0, 1);
  const tmp = new THREE.Vector3();
  let mode = 'follow', fov = 65, eye = 1.6;

  function follow(target, dir, dt, snap) {
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

  function ego(target, dir, dt, snap, opt) {
    back.copy(dir).setY(0).normalize();
    const k = snap ? 1 : 1 - Math.exp(-dt * 6);
    eye += ((opt.tuck ? 1.15 : opt.crashed ? 0.6 : 1.6) - eye) * (snap ? 1 : 1 - Math.exp(-dt * 5));
    head.copy(target).addScaledVector(back, opt.lift ? 0 : 0.15);
    head.y += opt.lift ? 1.3 : eye;
    camera.position.copy(head);
    const ax = target.x + back.x * 14, az = target.z + back.z * 14;
    const gy = opt.lift ? head.y - 2 : terrain.heightAt(ax, az) + 0.8;
    tmp.set(ax, Math.min(gy, head.y - 0.6), az).sub(head).normalize();
    gaze.lerp(tmp, k).normalize();
    camera.lookAt(look.copy(head).add(gaze));
  }

  function update(target, dir, dt, snap = false, opt = {}) {
    if (mode === 'ego') ego(target, dir, dt, snap, opt);
    else follow(target, dir, dt, snap);
    const f = (mode === 'ego' ? 72 : 65) + Math.min(opt.speed || 0, 30) * 0.25;
    fov += (f - fov) * (1 - Math.exp(-dt * 3));
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  function toggle() {
    mode = mode === 'ego' ? 'follow' : 'ego';
    return mode;
  }

  return { camera, update, toggle, get mode() { return mode; } };
}
