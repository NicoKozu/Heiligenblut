import * as THREE from 'three';
import { createWorker } from './models.js';

const MAX = 16, RANGE = 280;
const ACTS = { gate: ['point', 'stand', 'wave', 'stand'], guide: ['guide', 'stand', 'guide', 'wave'], booth: ['desk', 'desk', 'stand'], cash: ['desk', 'desk', 'stand'], shovel: ['shovel', 'shovel', 'stand'] };
const WEAR = { shovel: { Jacket: 0xf2c400, Sleeve: 0xf2c400, Helmet: 0xb5162b, tool: true }, cash: { Jacket: 0x23436e, Sleeve: 0x23436e, Helmet: 0x6b3a2a } };

export function createWorkers(lift, assets) {
  const group = new THREE.Group(), made = [];
  const live = s => lift.sections.includes(s.sec) && !lift.shut.has(s.sec.name) && lift.stop.get(s.sec.name) !== 'geschlossen';
  let time = 0, scan = 0, on = [];

  function make(s) {
    const w = createWorker(assets.figure, WEAR[s.kind]);
    w.object.position.set(s.x, s.y, s.z);
    w.object.rotation.y = s.h;
    w.seed = Math.random() * 20;
    group.add(w.object);
    made.push(w);
    return w;
  }

  function update(dt, camera) {
    time += dt;
    if ((scan -= dt) <= 0) {
      scan = 0.5;
      const cx = camera.position.x, cz = camera.position.z, d = s => Math.hypot(s.x - cx, s.z - cz);
      on = lift.spots.filter(s => live(s) && d(s) < RANGE).sort((a, b) => d(a) - d(b)).slice(0, MAX);
      for (const w of made) w.object.visible = false;
      for (const s of on) (s.w ||= make(s)).object.visible = true;
    }
    for (const s of on) {
      const w = s.w, t = time + w.seed, list = ACTS[s.kind];
      w.pose(list[Math.floor(t / 6) % list.length], t, Math.sin(t * 0.4) * 0.7);
    }
  }

  return { group, update };
}
