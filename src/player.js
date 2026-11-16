import * as THREE from 'three';
import { START } from './config.js';
import { down, consume } from './input.js';
import { createSkier, createBoarder } from './models.js';

const G = 9.81;
const SNAP = 0.3;
const FOOT = 0.8;
const SIDE = 0.25;
const CRASH = 14;
const STEP = 0.012;
const MASS = 80;
const rho = y => 1.225 * Math.exp(-y / 8500);

const MODES = {
  ski: {
    name: 'Ski', mu: 0.06, brakeMu: 0.7, cdaUp: 0.7, cdaTuck: 0.35, jump: 4.2,
    grip: 7, brakeGrip: 4, keep: 0.9, brakeKeep: 0.2, rateBase: 0.9, rateMax: 2.2, rateDiv: 12,
    brakeRate: 0.7, airRate: 1.6, push: 1.5, land: 1.2, fakie: false, lean: 0.45
  },
  board: {
    name: 'Snowboard', mu: 0.07, brakeMu: 1.0, cdaUp: 0.8, cdaTuck: 0.45, jump: 5.2,
    grip: 5, brakeGrip: 2.5, keep: 0.82, brakeKeep: 0.1, rateBase: 1.3, rateMax: 2.6, rateDiv: 10,
    brakeRate: 1.2, airRate: 4.5, push: 0.7, land: 0.8, fakie: true, lean: 0.6
  }
};

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export function createPlayer(terrain, assets) {
  const group = new THREE.Group();
  const models = { ski: createSkier(assets.figure), board: createBoarder(assets.figure) };
  group.add(models.ski.object, models.board.object);

  const state = {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    dir: new THREE.Vector3(0, 0, 1),
    look: new THREE.Vector3(0, 0, 1),
    heading: 0,
    speed: 0,
    grounded: true,
    crashed: 0,
    reset: false,
    mode: 'ski',
    modeName: MODES.ski.name,
    fakie: false,
    note: '',
    noteT: 0
  };
  let P = MODES.ski;
  const up = new THREE.Vector3(0, 1, 0);
  const n = new THREE.Vector3();
  const ta = new THREE.Vector3(), tb = new THREE.Vector3();
  const upS = new THREE.Vector3(0, 1, 0);
  const fwd = new THREE.Vector3();
  const gt = new THREE.Vector3();
  const right = new THREE.Vector3();
  const qTilt = new THREE.Quaternion();
  const qYaw = new THREE.Quaternion();
  const qRoll = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const pose = { tuck: 0, brake: 0, lean: 0, ctrl: true, fakie: false };
  let input = { steer: 0, tuck: false, brake: false, jump: false };
  let airSpin = 0;

  function note(t) { state.note = t; state.noteT = 1.5; }

  function setMode(m) {
    state.mode = m;
    P = MODES[m];
    state.modeName = P.name;
    state.fakie = false;
    models.ski.object.visible = m === 'ski';
    models.board.object.visible = m === 'board';
  }

  const spawn = { x: START.x, z: START.z, heading: null };

  function reset() {
    state.pos.set(spawn.x, terrain.heightAt(spawn.x, spawn.z), spawn.z);
    terrain.normalAt(spawn.x, spawn.z, n);
    state.heading = spawn.heading ?? Math.atan2(n.x, n.z);
    state.vel.set(0, 0, 0);
    state.grounded = true;
    state.crashed = 0;
    state.fakie = false;
    state.reset = true;
    upS.copy(n);
  }

  function land() {
    const v = state.vel;
    terrain.normalAt(state.pos.x, state.pos.z, n);
    const vn = v.dot(n);
    if (vn < 0) v.addScaledVector(n, -vn);
    const hs = Math.hypot(v.x, v.z);
    let diff = hs > 4 ? wrap(state.heading - Math.atan2(v.x, v.z)) : 0;
    if (P.fakie && Math.abs(diff) > Math.PI - P.land) {
      state.heading += Math.PI;
      state.fakie = !state.fakie;
      diff = wrap(diff + Math.PI);
    }
    if (vn < -CRASH || Math.abs(diff) > P.land) {
      v.multiplyScalar(0.3);
      state.crashed = 2;
    } else {
      const deg = Math.round(Math.abs(airSpin) / Math.PI) * 180;
      if (deg >= 180) note(deg + (state.fakie ? ' Switch' : ''));
    }
    airSpin = 0;
  }

  function step(dt) {
    const v = state.vel;
    const sp = v.length();
    const ctrl = state.crashed <= 0;
    const steer = ctrl ? input.steer : 0;
    const rate = state.grounded
      ? Math.min(P.rateMax, P.rateBase + sp / P.rateDiv) * (input.brake ? P.brakeRate : 1)
      : P.airRate;
    state.heading += steer * rate * dt;
    if (!state.grounded) airSpin += steer * rate * dt;
    state.dir.set(Math.sin(state.heading), 0, Math.cos(state.heading));

    const tuck = ctrl && input.tuck;
    const k = rho(state.pos.y) * (tuck ? P.cdaTuck : P.cdaUp) / (2 * MASS);
    const y0 = state.pos.y;
    let e = 0;

    if (state.grounded) {
      terrain.normalAt(state.pos.x, state.pos.z, n);
      fwd.copy(state.dir).addScaledVector(n, -state.dir.dot(n)).normalize();
      right.crossVectors(fwd, n);
      v.addScaledVector(n, -v.dot(n));
      const s0 = v.length();
      e = 0.5 * s0 * s0;
      gt.set(0, -G, 0).addScaledVector(n, G * n.y);
      v.addScaledVector(gt, dt);

      let lon = v.dot(fwd);
      let lat = v.dot(right);
      const sv = Math.hypot(lon, lat);
      const grip = !ctrl ? 1.5 : input.brake ? P.brakeGrip : P.grip;
      const f = Math.exp(-grip * dt);
      const removed = Math.abs(lat) * (1 - f);
      lat *= f;
      if (lon > 0) {
        const keep = input.brake || !ctrl ? P.brakeKeep : P.keep;
        lon = Math.sqrt(Math.max(0, sv * sv - lat * lat));
        e -= sv * removed * (1 - keep);
      } else e -= 0.5 * (sv * sv - lon * lon - lat * lat);
      v.copy(fwd).multiplyScalar(lon).addScaledVector(right, lat);

      const mu = !ctrl ? 0.6 : input.brake ? P.brakeMu : P.mu;
      e -= (mu * G * n.y + k * s0 * s0) * s0 * dt;
      if (s0 < 0.3 && !tuck && gt.length() <= mu * G * n.y) { v.set(0, 0, 0); e = 0; }
    } else {
      v.y -= G * dt;
      v.multiplyScalar(Math.max(0, 1 - k * sp * dt));
    }

    const wasGrounded = state.grounded;
    state.pos.addScaledVector(v, dt);
    if (!terrain.inside(state.pos.x, state.pos.z)) { reset(); return; }
    const y = terrain.heightAt(state.pos.x, state.pos.z);
    if (state.grounded) {
      if (state.pos.y - y > SNAP) { state.grounded = false; airSpin = 0; }
      else state.pos.y = y;
    } else if (state.pos.y <= y) {
      state.pos.y = y;
      state.grounded = true;
      land();
    }

    if (wasGrounded) {
      e -= G * (state.pos.y - y0);
      const s1 = Math.sqrt(Math.max(0, 2 * e)), sl = v.length();
      if (sl > 0) v.multiplyScalar(s1 / sl);
      if (ctrl && input.tuck && s1 < 5 && fwd.y < 0.02) v.addScaledVector(fwd, P.push * dt);
      if (ctrl && input.jump) {
        v.addScaledVector(n, P.jump);
        state.grounded = false;
        airSpin = 0;
      }
    }
    input.jump = false;
  }

  function animate(dt) {
    const k = 1 - Math.exp(-dt * 8);
    const ctrl = state.crashed <= 0;
    pose.ctrl = ctrl;
    pose.fakie = state.fakie;
    pose.tuck += ((ctrl && input.tuck ? 1 : 0) - pose.tuck) * k;
    pose.brake += ((ctrl && input.brake ? 1 : 0) - pose.brake) * k;
    const leanT = state.grounded ? input.steer * Math.min(1, state.speed / 12) * P.lean : 0;
    pose.lean += (leanT - pose.lean) * k;
    models[state.mode].pose(pose);

    group.position.copy(state.pos);
    if (state.grounded) {
      const fx = Math.sin(state.heading), fz = Math.cos(state.heading), x = state.pos.x, z = state.pos.z;
      const hf = terrain.heightAt(x + fx * FOOT, z + fz * FOOT), hb = terrain.heightAt(x - fx * FOOT, z - fz * FOOT);
      const hr = terrain.heightAt(x + fz * SIDE, z - fx * SIDE), hl = terrain.heightAt(x - fz * SIDE, z + fx * SIDE);
      ta.set(2 * FOOT * fx, hf - hb, 2 * FOOT * fz);
      tb.set(2 * SIDE * fz, hr - hl, -2 * SIDE * fx);
      n.crossVectors(ta, tb).normalize();
      if (n.y < 0) n.negate();
      group.position.y = Math.max(state.pos.y, (hf + hb) / 2, (hr + hl) / 2);
    }
    upS.lerp(state.grounded ? n : up, 1 - Math.exp(-dt * (state.grounded ? 30 : 8))).normalize();
    qTilt.setFromUnitVectors(up, upS);
    qYaw.setFromAxisAngle(up, state.heading);
    qRoll.setFromAxisAngle(zAxis, -pose.lean);
    group.quaternion.copy(qTilt).multiply(qYaw).multiply(qRoll);
  }

  function update(dt) {
    state.reset = false;
    if (consume('KeyR')) reset();
    if (consume('KeyQ') && state.grounded) {
      setMode(state.mode === 'ski' ? 'board' : 'ski');
      note(state.modeName);
    }
    input = {
      steer: (down('KeyA', 'ArrowLeft') ? 1 : 0) - (down('KeyD', 'ArrowRight') ? 1 : 0),
      tuck: down('KeyW', 'ArrowUp'),
      brake: down('KeyS', 'ArrowDown'),
      jump: consume('Space') && state.grounded
    };
    if (input.brake) input.tuck = false;
    const steps = Math.max(1, Math.ceil(dt / STEP));
    for (let i = 0; i < steps; i++) step(dt / steps);
    if (state.crashed > 0) state.crashed -= dt;
    if (state.noteT > 0) state.noteT -= dt;
    state.speed = state.vel.length();
    if (state.grounded || state.reset) state.look.copy(state.dir);
    animate(dt);
  }

  function spawnAt(x, z, heading = null) {
    Object.assign(spawn, { x, z, heading });
    reset();
  }

  setMode('ski');
  reset();
  return { object: group, state, update, spawnAt, setMode };
}
