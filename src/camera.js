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
  const mg = { x: 0, z: 0, gx: 0, gz: 0, h: 1200, gh: 1200, yaw: 0, pitch: 0.95, go: false, rot: false, ex: 0, ey: 0, y: 0, in: false };
  addEventListener('mousedown', e => { if (mode === 'mgr' && e.button === 2 && e.target.tagName === 'CANVAS') { mg.rot = true; mx = e.clientX; my = e.clientY; } });
  addEventListener('mouseup', e => { if (e.button === 2) mg.rot = false; });
  addEventListener('mousemove', e => {
    mg.ex = e.clientX; mg.ey = e.clientY; mg.in = e.target.tagName === 'CANVAS';
    if (mode !== 'mgr' || !mg.rot) return;
    if (!(e.buttons & 2)) { mg.rot = false; return; }
    mg.yaw -= (e.clientX - mx) * 0.005;
    mg.pitch = Math.max(0.35, Math.min(1.45, mg.pitch + (e.clientY - my) * 0.004));
    mx = e.clientX; my = e.clientY;
  });
  addEventListener('mouseout', e => { if (!e.relatedTarget) mg.in = false; });

  addEventListener('contextmenu', e => { if (e.target.tagName === 'CANVAS') e.preventDefault(); });
  addEventListener('mousedown', e => { if (e.button === 0 && mode !== 'mgr' && !e.altKey && e.target.tagName === 'CANVAS') { drag = true; mx = e.clientX; my = e.clientY; e.preventDefault(); } });
  addEventListener('mouseup', e => { if (e.button === 0) drag = false; });
  addEventListener('blur', () => { drag = false; });
  addEventListener('mousemove', e => {
    if (!drag) return;
    if (!(e.buttons & 1)) { drag = false; return; }
    const dx = e.clientX - mx, dy = e.clientY - my;
    mx = e.clientX; my = e.clientY;
    if (mode === 'fly') { fy -= dx * 0.004; fp = Math.max(-1.5, Math.min(1.5, fp - dy * 0.004)); return; }
    yaw -= dx * 0.005;
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    pitch = Math.max(-0.5, Math.min(1.1, pitch + dy * 0.004));
    idle = 0;
  });
  addEventListener('wheel', e => {
    if (e.target.tagName !== 'CANVAS') return;
    if (mode === 'mgr') { mg.gh = Math.max(300, Math.min(4000, mg.gh * Math.exp(e.deltaY * 0.0012))); return; }
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
    const p = camera.position, nx = p.x + tmp.x, nz = p.z + tmp.z;
    if (terrain.inside(nx, nz)) { p.x = nx; p.z = nz; }
    p.y = Math.min(9000, Math.max(terrain.heightAt(p.x, p.z) + 1.5, p.y + tmp.y));
    camera.lookAt(look.copy(p).add(gaze));
  }

  function mgr(dt) {
    const fw = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0) + (mg.in && mg.ey < 10 ? 1 : 0) - (mg.in && mg.ey > innerHeight - 10 ? 1 : 0);
    const sd = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0) + (mg.in && mg.ex > innerWidth - 10 ? 1 : 0) - (mg.in && mg.ex < 10 ? 1 : 0);
    const v = mg.h * 0.9 * dt * (down('ShiftLeft', 'ShiftRight') ? 2.5 : 1);
    if (fw || sd) mg.go = false;
    const sy = Math.sin(mg.yaw), cy = Math.cos(mg.yaw);
    let nx = mg.gx + (sy * fw - cy * sd) * v, nz = mg.gz + (cy * fw + sy * sd) * v;
    if (terrain.inside(nx, nz)) { mg.gx = nx; mg.gz = nz; }
    const k = 1 - Math.exp(-dt * (mg.go ? 2.5 : 8));
    mg.x += (mg.gx - mg.x) * k; mg.z += (mg.gz - mg.z) * k;
    mg.h += (mg.gh - mg.h) * (1 - Math.exp(-dt * 6));
    mg.y += (terrain.heightAt(mg.x, mg.z) - mg.y) * (1 - Math.exp(-dt * 3));
    const off = mg.h / Math.tan(mg.pitch), p = camera.position;
    p.set(mg.x - sy * off, mg.y + mg.h, mg.z - cy * off);
    p.y = Math.max(p.y, terrain.heightAt(p.x, p.z) + 30);
    camera.lookAt(look.set(mg.x, mg.y, mg.z));
  }

  function startMgr() {
    if (mode === 'mgr') return;
    if (mode !== 'fly') prev = mode;
    mode = 'mgr';
    camera.getWorldDirection(tmp);
    mg.yaw = Math.atan2(tmp.x, tmp.z);
    const p = camera.position;
    mg.x = mg.gx = p.x + Math.sin(mg.yaw) * 300; mg.z = mg.gz = p.z + Math.cos(mg.yaw) * 300;
    if (!terrain.inside(mg.x, mg.z)) { mg.x = mg.gx = p.x; mg.z = mg.gz = p.z; }
    mg.y = terrain.heightAt(mg.x, mg.z);
    mg.h = 200; mg.gh = 1200; mg.go = false;
  }

  function endMgr() { mode = prev; yaw = 0; pitch = 0; }
  function goTo(x, z, h) { mg.gx = x; mg.gz = z; mg.go = true; if (h) mg.gh = h; }

  function startFly() {
    if (mode === 'fly') return;
    prev = mode;
    mode = 'fly';
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
    if (mode === 'mgr') {
      mgr(dt);
      if (Math.abs(camera.fov - 55) > 0.05) { camera.fov = fov = 55; camera.updateProjectionMatrix(); }
      return;
    }
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
    if (mode === 'fly' || mode === 'mgr') return mode;
    mode = mode === 'ego' ? 'follow' : 'ego';
    return mode;
  }

  return { camera, update, toggle, startFly, endFly, startMgr, endMgr, goTo, get focus() { return look; }, get mode() { return mode; } };
}
