import * as THREE from 'three';
import { down } from './input.js';

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
  let prev = 'follow', fy = 0, fp = 0, fv = 40;
  const go = { on: false, x: 0, y: 0, z: 0, tx: 0, tz: 0 };
  addEventListener('contextmenu', e => { if (e.target.tagName === 'CANVAS') e.preventDefault(); });
  addEventListener('mousedown', e => { if (e.button === 0 && !e.altKey && e.target.tagName === 'CANVAS') { drag = true; mx = e.clientX; my = e.clientY; e.preventDefault(); } });
  addEventListener('mouseup', e => { if (e.button === 0) drag = false; });
  addEventListener('blur', () => { drag = false; });
  addEventListener('mousemove', e => {
    if (!drag) return;
    if (!(e.buttons & 1)) { drag = false; return; }
    const dx = e.clientX - mx, dy = e.clientY - my;
    mx = e.clientX; my = e.clientY;
    if (mode === 'fly') { if (Math.abs(dx) + Math.abs(dy) > 0) go.on = false; fy -= dx * 0.004; fp = Math.max(-1.5, Math.min(1.5, fp - dy * 0.004)); return; }
    yaw -= dx * 0.005;
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    pitch = Math.max(-0.5, Math.min(1.1, pitch + dy * 0.004));
    idle = 0;
  });
  addEventListener('wheel', e => {
    if (e.target.tagName !== 'CANVAS') return;
    if (mode === 'fly') { fv = Math.max(5, Math.min(400, fv * Math.exp(-e.deltaY * 0.001))); return; }
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

  function fly(dt) {
    const fw = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0);
    const sd = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0);
    const ud = (down('Space', 'KeyE') ? 1 : 0) - (down('ShiftLeft', 'ShiftRight', 'KeyQ') ? 1 : 0);
    const cp = Math.cos(fp);
    gaze.set(Math.sin(fy) * cp, Math.sin(fp), Math.cos(fy) * cp);
    back.set(-Math.cos(fy), 0, Math.sin(fy));
    const v = fv * (down('ControlLeft', 'ControlRight') ? 4 : 1) * dt;
    tmp.copy(gaze).multiplyScalar(fw).addScaledVector(back, sd);
    if (tmp.lengthSq() > 1) tmp.normalize();
    tmp.multiplyScalar(v);
    tmp.y += ud * v;
    const p = camera.position;
    if (fw || sd || ud) go.on = false;
    if (go.on) {
      const k = 1 - Math.exp(-dt * 2.5);
      p.x += (go.x - p.x) * k; p.y += (go.y - p.y) * k; p.z += (go.z - p.z) * k;
      tmp.set(go.tx - p.x, terrain.heightAt(go.tx, go.tz) - p.y, go.tz - p.z).normalize();
      fy = Math.atan2(tmp.x, tmp.z); fp = Math.asin(tmp.y);
      tmp.set(0, 0, 0);
    }
    const nx = p.x + tmp.x, nz = p.z + tmp.z;
    if (terrain.inside(nx, nz)) { p.x = nx; p.z = nz; }
    p.y = Math.min(9000, Math.max(terrain.heightAt(p.x, p.z) + 1.5, p.y + tmp.y));
    camera.lookAt(look.copy(p).add(gaze));
  }

  function goTo(x, z) {
    if (mode !== 'fly') return;
    const p = camera.position, dx = x - p.x, dz = z - p.z, l = Math.hypot(dx, dz) || 1, d = Math.min(l, 350);
    go.x = x - dx / l * d; go.z = z - dz / l * d;
    if (!terrain.inside(go.x, go.z)) { go.x = p.x; go.z = p.z; }
    go.y = Math.max(terrain.heightAt(go.x, go.z), terrain.heightAt(x, z)) + 220;
    go.tx = x; go.tz = z; go.on = true;
  }

  function startFly() {
    if (mode === 'fly') return;
    prev = mode;
    mode = 'fly';
    go.on = false;
    camera.getWorldDirection(tmp);
    fy = Math.atan2(tmp.x, tmp.z);
    fp = Math.asin(Math.max(-1, Math.min(1, tmp.y)));
    if (!terrain.inside(camera.position.x, camera.position.z)) camera.position.set(0, terrain.heightAt(0, 0) + 50, 0);
  }

  function endFly() {
    mode = prev;
    yaw = 0; pitch = 0;
    return { x: camera.position.x, z: camera.position.z, heading: fy };
  }

  function update(target, dir, dt, snap = false, opt = {}) {
    if (mode === 'fly') {
      fly(dt);
      const f = 70;
      fov += (f - fov) * (1 - Math.exp(-dt * 3));
      if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
      return;
    }
    relax(dt);
    if (mode === 'ego') ego(target, dir, dt, snap, opt);
    else follow(target, dir, dt, snap);
    const f = (mode === 'ego' ? 72 : 65) + Math.min(opt.speed || 0, 30) * 0.25;
    fov += (f - fov) * (1 - Math.exp(-dt * 3));
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  function toggle() {
    if (mode === 'fly') return mode;
    mode = mode === 'ego' ? 'follow' : 'ego';
    return mode;
  }

  return { camera, update, toggle, startFly, endFly, goTo, get focus() { return look; }, get mode() { return mode; } };
}
