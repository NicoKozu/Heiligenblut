import * as THREE from 'three';

export function createFollowCamera(terrain) {
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.3, 25000);
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const back = new THREE.Vector3();
  const head = new THREE.Vector3();
  const gaze = new THREE.Vector3(0, 0, 1);
  const tmp = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let mode = 'follow', fov = 65, eye = 1.6;
  let yaw = 0, pitch = 0, zoom = 1, drag = false, idle = 9, mx = 0, my = 0;

  addEventListener('contextmenu', e => { if (e.target.tagName === 'CANVAS') e.preventDefault(); });
  addEventListener('mousedown', e => { if (e.button === 2 && e.target.tagName === 'CANVAS') { drag = true; mx = e.clientX; my = e.clientY; e.preventDefault(); } });
  addEventListener('mouseup', e => { if (e.button === 2) drag = false; });
  addEventListener('blur', () => { drag = false; });
  addEventListener('mousemove', e => {
    if (!drag) return;
    if (!(e.buttons & 2)) { drag = false; return; }
    const dx = e.clientX - mx, dy = e.clientY - my;
    mx = e.clientX; my = e.clientY;
    yaw -= dx * 0.005;
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    pitch = Math.max(-0.5, Math.min(1.1, pitch + dy * 0.004));
    idle = 0;
  });
  addEventListener('wheel', e => {
    if (e.target.tagName !== 'CANVAS') return;
    zoom = Math.max(0.45, Math.min(3, zoom * Math.exp(e.deltaY * 0.001)));
  }, { passive: true });

  function relax(dt) {
    if (drag) { idle = 0; return; }
    idle += dt;
    if (idle < 1.2) return;
    const r = 1 - Math.exp(-dt * 1.8);
    yaw -= yaw * r;
    pitch -= pitch * r;
  }

  function follow(target, dir, dt, snap) {
    back.copy(dir).setY(0).normalize().applyAxisAngle(up, yaw);
    const d = 10 * zoom, el = Math.max(-0.05, Math.min(1.45, 0.46 + pitch));
    desired.copy(target).addScaledVector(back, -d * Math.cos(el));
    let y = Math.max(target.y + d * Math.sin(el), terrain.heightAt(desired.x, desired.z) + 2);
    for (const f of [0.2, 0.4, 0.6]) {
      const hf = terrain.heightAt(target.x + (desired.x - target.x) * f, target.z + (desired.z - target.z) * f);
      y = Math.max(y, target.y + 1 + (hf - target.y - 0.2) / f);
    }
    desired.y = Math.min(y, target.y + Math.max(16 * zoom, d * Math.sin(el) + 2));
    const k = snap ? 1 : 1 - Math.exp(-dt * (idle < 0.3 ? 14 : 4));
    camera.position.lerp(desired, k);
    const floor = terrain.heightAt(camera.position.x, camera.position.z) + 1.5;
    if (camera.position.y < floor) camera.position.y = floor;
    look.copy(target).addScaledVector(back, 4 * Math.max(0, Math.cos(yaw)));
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
    tmp.copy(gaze).applyAxisAngle(up, yaw);
    const p = Math.asin(Math.max(-1, Math.min(1, tmp.y))) - pitch * 0.8;
    const h = Math.hypot(tmp.x, tmp.z) || 1, c = Math.cos(Math.max(-1.4, Math.min(1.4, p)));
    tmp.set(tmp.x / h * c, Math.sin(Math.max(-1.4, Math.min(1.4, p))), tmp.z / h * c);
    camera.lookAt(look.copy(head).add(tmp));
  }

  function update(target, dir, dt, snap = false, opt = {}) {
    relax(dt);
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
