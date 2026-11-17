import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { consume, down } from './input.js';
import { D } from './biz/data.js';

const RIDE = Object.fromEntries(D.lifts.map(l => [l.id, l]));

const GAUGE = 3;
const ROPE = 5.4;
const HANG = 3.7;
const SPEED = 5;
const FAST = 8;
const SPACING = 85;
const BOARD = 45;
const TUN = 12;

const SECTIONS = [
  { id: 'rossbach', name: 'Gondel Rossbach', from: 'Talstation', to: 'Rossbach', a: [-158, -109], b: [617, -921], st: [0, 1] },
  { id: 'schareck', name: 'Gondel Schareck', from: 'Rossbach', to: 'Schareck', a: [635, -923], b: [1110, -2861], st: [1, 2] },
  { id: 'panorama', name: 'Panoramabahn', from: 'Fallbichl', to: 'Schareck', a: [40, -3263], b: [1099, -2892], st: [3, 4] }
];
const STATIONS = [
  { c: [-158, -109], s: 0, off: -4, hl: 11, hw: 6.5 },
  { c: [626, -922], s: 0, off: 0, hl: 17, hw: 6.5 },
  { c: [1110, -2861], s: 1, off: 3, hl: 11, hw: 6.5 },
  { c: [40, -3263], s: 2, off: -4, hl: 11, hw: 6.5 },
  { c: [1099, -2892], s: 2, off: 2, hl: 9, hw: 6 }
];

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

function buildSection(sec, terrain, base, avoid) {
  const [ax, az] = sec.a, [bx, bz] = sec.b;
  const len = Math.hypot(bx - ax, bz - az);
  const dx = (bx - ax) / len, dz = (bz - az) / len, px = -dz, pz = dx;
  const N = Math.ceil(len / 5);
  const S = [], G = [];
  for (let i = 0; i <= N; i++) {
    const s = Math.min(len, i * 5), x = ax + dx * s, z = az + dz * s;
    S.push(s);
    G.push(Math.max(terrain.heightAt(x, z), terrain.heightAt(x + px * GAUGE, z + pz * GAUGE), terrain.heightAt(x - px * GAUGE, z - pz * GAUGE)));
  }
  const tw = [{ s: 0, y: base[0] + ROPE, i: 0 }, { s: len, y: base[1] + ROPE, i: N }];
  const lin = (k, s) => tw[k].y + (tw[k + 1].y - tw[k].y) * (s - tw[k].s) / (tw[k + 1].s - tw[k].s);
  const rope = s => {
    let k = 0;
    while (k < tw.length - 2 && s > tw[k + 1].s) k++;
    const span = tw[k + 1].s - tw[k].s, t = (s - tw[k].s) / span;
    return lin(k, s) - span * 0.012 * 4 * t * (1 - t);
  };
  for (let it = 0, changed = !sec.tunnel; changed && it < 80; it++) {
    changed = false;
    for (let k = 0; k < tw.length - 1 && !changed; k++) {
      let worst = 0, wi = -1;
      for (let i = tw[k].i + 1; i < tw[k + 1].i; i++) {
        if (S[i] < 25 || S[i] > len - 25) continue;
        const v = G[i] + 8.5 - rope(S[i]);
        if (v > worst) { worst = v; wi = i; }
      }
      if (wi >= 0) {
        const near = j => avoid.some(([x, z]) => Math.hypot(ax + dx * S[j] - x, az + dz * S[j] - z) < 15);
        let y = G[wi] + 12;
        if (near(wi)) {
          const w0 = wi;
          while (near(wi) && wi + 1 < tw[k + 1].i) wi++;
          const a0 = tw[k], span = S[wi] - a0.s;
          y = G[wi] + 12;
          for (let i = a0.i + 1; i <= wi; i++) {
            if (S[i] < 25 || i < w0 - 2) continue;
            const t = (S[i] - a0.s) / span;
            y = Math.max(y, a0.y + (G[i] + 8.5 + span * 0.048 * t * (1 - t) - a0.y) / t);
          }
        }
        tw.splice(k + 1, 0, { s: S[wi], y, i: wi });
        changed = true;
      } else if (tw[k + 1].s - tw[k].s > 450) {
        const mi = (tw[k].i + tw[k + 1].i) >> 1, h = lin(k, S[mi]) - G[mi];
        if (h > 9 && h < 35) {
          tw.splice(k + 1, 0, { s: S[mi], y: lin(k, S[mi]), i: mi });
          changed = true;
        }
      }
    }
  }

  const pts = [];
  for (let i = 0; i <= N; i++) pts.push(new THREE.Vector3(ax + dx * S[i] + px * GAUGE, rope(S[i]), az + dz * S[i] + pz * GAUGE));
  const turn = (cx, cz, y, sgn) => {
    for (let k = 1; k < 8; k++) {
      const t = k / 8 * Math.PI, c = Math.cos(t) * sgn, s = Math.sin(t) * sgn;
      pts.push(new THREE.Vector3(cx + (px * c + dx * s) * GAUGE, y, cz + (pz * c + dz * s) * GAUGE));
    }
  };
  turn(bx, bz, rope(len), 1);
  const upEnd = pts.length;
  for (let i = N; i >= 0; i--) pts.push(new THREE.Vector3(ax + dx * S[i] - px * GAUGE, rope(S[i]), az + dz * S[i] - pz * GAUGE));
  turn(ax, az, rope(0), -1);
  const cum = new Float32Array(pts.length + 1);
  for (let i = 1; i <= pts.length; i++) cum[i] = cum[i - 1] + pts[i - 1].distanceTo(pts[i % pts.length]);
  const L = cum[pts.length];

  function at(u, out) {
    u = ((u % L) + L) % L;
    let lo = 0, hi = pts.length;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= u) lo = m; else hi = m; }
    return out.lerpVectors(pts[lo], pts[(lo + 1) % pts.length], (u - cum[lo]) / (cum[lo + 1] - cum[lo]));
  }

  const towers = tw.slice(1, -1).map(t => ({ x: ax + dx * t.s, z: az + dz * t.s, y: t.y, g: terrain.heightAt(ax + dx * t.s, az + dz * t.s) }));
  return { ...sec, len, dx, dz, px, pz, pts, at, L, ropeB: rope(len), upLen: cum[upEnd], towers, count: sec.tunnel ? 0 : Math.floor(L / Math.min(SPACING, RIDE[sec.id] ? cum[upEnd] / Math.ceil(RIDE[sec.id].ride * RIDE[sec.id].cap / 360) : SPACING)), phase: 0, speed: SPEED, heading: Math.atan2(dx, dz) };
}

export function createLift(terrain, pistes, exp) {
  const group = new THREE.Group();
  const base = STATIONS.map(st => terrain.heightAt(st.c[0], st.c[1]));
  const secBase = SECTIONS.map(s => s.st.map(i => base[i]));
  const avoid = pistes.list.flatMap(p => [p.pts[0], p.pts[p.pts.length - 1]]);
  const sections = SECTIONS.map((s, k) => buildSection(s, terrain, secBase[k], avoid));
  const planned = (exp?.lifts || []).map(d => buildSection({ ...d, st: null }, terrain, [terrain.heightAt(...d.a), terrain.heightAt(...d.b)], avoid));

  const steel = mat(0x8a929a, { metalness: 0.6, roughness: 0.4 });
  const ropeMat = mat(0x2a2a2a, { roughness: 0.8 });
  const padMat = mat(0xe23b2e, { roughness: 0.9 });
  const glassMat = mat(0x9fc6dc, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45 });
  const frameMat = mat(0x50565c, { metalness: 0.5, roughness: 0.4 });
  const shaftGeo = new THREE.CylinderGeometry(0.5, 0.95, 1, 6).translate(0, 0.5, 0);
  const headGeo = mergeGeometries([
    new THREE.BoxGeometry(GAUGE * 2 + 2, 0.5, 0.7).translate(0, -0.7, 0),
    new THREE.BoxGeometry(0.5, 0.35, 3.2).translate(GAUGE, 0.1, 0),
    new THREE.BoxGeometry(0.5, 0.35, 3.2).translate(-GAUGE, 0.1, 0),
    new THREE.BoxGeometry(0.3, 0.8, 0.3).translate(GAUGE, -0.35, 0),
    new THREE.BoxGeometry(0.3, 0.8, 0.3).translate(-GAUGE, -0.35, 0)
  ]);
  const padGeo = new THREE.CylinderGeometry(1.35, 1.35, 2.2, 10).translate(0, 1.1, 0);
  const wheelGeo = new THREE.CylinderGeometry(GAUGE + 0.2, GAUGE + 0.2, 0.4, 20);
  const body = new THREE.BoxGeometry(1.9, 1.05, 1.9).translate(0, -0.55, 0);
  const glass = new THREE.BoxGeometry(1.86, 0.95, 1.86).translate(0, 0.45, 0);
  const frame = mergeGeometries([
    new THREE.BoxGeometry(2.0, 0.22, 2.0).translate(0, 1.0, 0),
    new THREE.BoxGeometry(0.12, 2.5, 0.12).translate(0, 2.35, 0),
    new THREE.BoxGeometry(0.12, 0.12, 1.0).translate(0, 3.55, -0.45),
    new THREE.BoxGeometry(0.4, 0.3, 0.6).translate(0, 3.65, 0)
  ]);
  const wood = mat(0x7a5236, { roughness: 0.85 });
  const concrete = mat(0xb9b4ab, { roughness: 0.95 });
  const roofMat = mat(0x3c4650, { roughness: 0.7 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), yAx = new THREE.Vector3(0, 1, 0);
  const towers = [], halls = [];

  function dress(sec) {
    const g = new THREE.Group();
    if (!sec.tunnel) {
      const curve = new THREE.CatmullRomCurve3(sec.pts, true, 'centripetal');
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, sec.pts.length * 2, 0.09, 4, true), ropeMat));
      for (const [x, z, y] of [[...sec.a, sec.pts[0].y], [...sec.b, sec.ropeB]]) {
        const w = new THREE.Mesh(wheelGeo, steel);
        w.position.set(x, y + 0.3, z);
        g.add(w);
      }
    }
    const tw = sec.towers.map(t => ({ ...t, sec }));
    if (tw.length) {
      const padded = tw.filter(t => { const n = pistes.nearest(t.x, t.z, 80); return n && n.d < n.p.width / 2 + 4; });
      const shaft = new THREE.InstancedMesh(shaftGeo, steel, tw.length);
      const head = new THREE.InstancedMesh(headGeo, steel, tw.length);
      q.setFromAxisAngle(yAx, sec.heading);
      tw.forEach((t, i) => {
        shaft.setMatrixAt(i, m4.compose(v.set(t.x, t.g - 2, t.z), q, sc.set(1, t.y - 0.9 - t.g + 2, 1)));
        head.setMatrixAt(i, m4.compose(v.set(t.x, t.y - 0.35, t.z), q, sc.set(1, 1, 1)));
      });
      shaft.castShadow = head.castShadow = true;
      g.add(shaft, head);
      if (padded.length) {
        const pad = new THREE.InstancedMesh(padGeo, padMat, padded.length);
        padded.forEach((t, i) => pad.setMatrixAt(i, m4.compose(v.set(t.x, t.g - 0.2, t.z), q.identity(), sc.set(1, 1, 1))));
        pad.castShadow = true;
        g.add(pad);
      }
    }
    sec.tw = tw;
    if (sec.count) {
      const cBody = new THREE.InstancedMesh(body, mat(sec.color ?? 0xc8202a, { roughness: 0.45 }), sec.count);
      const cGlass = new THREE.InstancedMesh(glass, glassMat, sec.count);
      const cFrame = new THREE.InstancedMesh(frame, frameMat, sec.count);
      for (const m of [cBody, cGlass, cFrame]) { m.castShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; }
      g.add(cBody, cFrame, cGlass);
      sec.cabs = [cBody, cGlass, cFrame];
    }
    sec.mesh = g;
    group.add(g);
  }

  function hall(st, sec, y) {
    const cx = st.c[0] + sec.dx * st.off, cz = st.c[1] + sec.dz * st.off;
    const g = new THREE.Group();
    g.position.set(cx, y, cz);
    g.rotation.y = sec.heading;
    let lo = y;
    for (const a of [-1, 1]) for (const b of [-1, 1]) lo = Math.min(lo, terrain.heightAt(cx + sec.dx * st.hl * a + sec.px * st.hw * b, cz + sec.dz * st.hl * a + sec.pz * st.hw * b));
    const depth = y - lo + 3;
    const plat = new THREE.Mesh(new THREE.BoxGeometry(st.hw * 2, depth, st.hl * 2), concrete);
    plat.position.y = 0.3 - depth / 2;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(st.hw * 2 + 1.5, 0.6, st.hl * 2 + 1.5), roofMat);
    roof.position.y = 7.9;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.4, st.hl * 2), wood);
    wall.position.set(-st.hw, 4, 0);
    g.add(plat, roof, wall);
    for (const a of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.4, 0.5), wood);
      p.position.set(st.hw - 0.3, 4, a * (st.hl - 0.3));
      g.add(p);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { g, h: { x: cx, z: cz, dx: sec.dx, dz: sec.dz, hl: st.hl, hw: st.hw, top: y + 7.6 } };
  }

  for (const sec of sections) { dress(sec); towers.push(...sec.tw); }
  const added = new Map(), all = [...sections];
  STATIONS.forEach((st, k) => { const r = hall(st, sections[st.s], base[k]); group.add(r.g); halls.push(r.h); const id = SECTIONS[st.s].id; added.set(id, [...(added.get(id) || []), r]); });

  function addSection(id) {
    const sec = all.find(s => s.id === id) || planned.find(s => s.id === id);
    if (!sec || sections.includes(sec)) return null;
    if (!added.has(id)) {
      dress(sec);
      const hs = [hall({ c: sec.a, off: -4, hl: 11, hw: 6.5 }, sec, terrain.heightAt(...sec.a)), hall({ c: sec.b, off: 3, hl: 11, hw: 6.5 }, sec, terrain.heightAt(...sec.b))];
      for (const r of hs) sec.mesh.add(r.g);
      added.set(id, hs);
    }
    sec.mesh.visible = true;
    sections.push(sec);
    towers.push(...sec.tw);
    for (const r of added.get(id)) { r.g.visible = true; halls.push(r.h); }
    api.onAdd?.(sec);
    return sec;
  }

  function removeSection(id) {
    const sec = sections.find(s => s.id === id);
    if (!sec || sec === sections[0]) return;
    if (ride && ride.sec === sec) leave(ride.state);
    sec.mesh.visible = false;
    sections.splice(sections.indexOf(sec), 1);
    for (const t of sec.tw) towers.splice(towers.indexOf(t), 1);
    for (const r of added.get(id)) { if (!sec.mesh.children.includes(r.g)) r.g.visible = false; halls.splice(halls.indexOf(r.h), 1); }
  }

  const sites = new Map();
  const yellow = mat(0xf2b822, { roughness: 0.6 }), orange = mat(0xff6a1a, { roughness: 0.8 });
  function crane(x, z, heading) {
    const g = new THREE.Group(), y = terrain.heightAt(x, z);
    g.position.set(x, y, z);
    g.rotation.y = heading;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 32, 1.2), yellow);
    mast.position.set(9, 16, 0);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 30), yellow);
    jib.position.set(9, 32, 7);
    const cw = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 3), concrete);
    cw.position.set(9, 31, -7);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.1, 14, 0.1), ropeMat);
    hook.position.set(9, 25, 18);
    g.add(mast, jib, cw, hook);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, px = Math.cos(a) * 14, pz = Math.sin(a) * 16;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.15), orange);
      post.position.set(px, terrain.heightAt(x + px, z + pz) - y + 0.55, pz);
      g.add(post);
    }
    const tape = new THREE.Mesh(new THREE.TorusGeometry(15, 0.06, 3, 32), orange);
    tape.rotation.x = Math.PI / 2;
    tape.scale.set(14 / 15, 16 / 15, 1);
    tape.position.y = 1;
    g.add(tape);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  function site(id, on) {
    if (!on) { const g = sites.get(id); if (g) { group.remove(g); sites.delete(id); } return; }
    if (sites.has(id)) return;
    const sec = planned.find(s => s.id === id) || all.find(s => s.id === id);
    if (!sec) return;
    const g = new THREE.Group();
    g.add(crane(sec.a[0] - sec.dx * 14, sec.a[1] - sec.dz * 14, sec.heading), crane(sec.b[0] + sec.dx * 14, sec.b[1] + sec.dz * 14, sec.heading + Math.PI));
    sites.set(id, g);
    group.add(g);
  }

  let ride = null;
  const tmp = new THREE.Vector3();
  const cabinAt = (sec, i, out) => sec.at(sec.phase + i * (sec.L / sec.count), out).setY(out.y - HANG);

  function exitTo(sec) {
    let best = null, bd = 150;
    pistes.list.forEach((p, i) => {
      const d = Math.hypot(p.pts[0][0] - sec.b[0], p.pts[0][1] - sec.b[1]);
      if (d < bd && !p.unbuilt) { bd = d; best = i; }
    });
    return best;
  }

  function board(sec, state, rev) {
    state.lift = sec.name;
    state.vel.set(0, 0, 0);
    if (sec.tunnel) { ride = { sec, u: 0, rev, tunnel: true, state }; return; }
    const step = sec.L / sec.count;
    const i = ((Math.ceil(-sec.phase / step) % sec.count) + sec.count) % sec.count;
    sec.phase = -i * step;
    ride = { sec, i, u: 0, state };
  }

  const shut = new Set();
  const stop = new Map();

  function setOpen(id, open, why = 'geschlossen') {
    const sec = sections.find(s => s.id === id || s.name === id);
    if (!sec) return;
    if (open) stop.delete(sec.name);
    else stop.set(sec.name, why);
  }

  function update(dt, state, player, goTo) {
    state.hint = '';
    for (const sec of sections) {
      const r = api.pace && RIDE[sec.id], base = r ? (sec.tunnel ? sec.len : sec.upLen) / r.ride * api.pace : SPEED;
      const want = stop.has(sec.name) ? 0 : ride && ride.sec === sec && down('KeyW', 'ArrowUp') ? base * FAST : base;
      sec.speed = want >= sec.speed || want > 0 ? want : Math.max(0, sec.speed - Math.max(1.2, sec.speed * 1.5) * dt);
      sec.phase += sec.speed * dt;
    }
    if (ride && ride.tunnel) {
      const sec = ride.sec, why = stop.get(sec.name), fast = down('KeyW', 'ArrowUp');
      ride.u += (api.pace ? sec.speed : sec.speed / SPEED * TUN * (fast ? FAST : 1)) * dt;
      state.hint = sec.name + ' → ' + (ride.rev ? sec.from : sec.to) + (why ? ' steht (' + why + ')' : ' · ' + Math.min(99, Math.round(ride.u / sec.len * 100)) + ' % · W Zeitraffer');
      if (ride.u >= sec.len) {
        const rev = ride.rev;
        ride = null;
        state.lift = null;
        player.object.visible = true;
        if (rev) player.spawnAt(sec.a[0] - sec.dx * 24, sec.a[1] - sec.dz * 24, sec.heading + Math.PI);
        else player.spawnAt(sec.b[0] + sec.dx * 22, sec.b[1] + sec.dz * 22, sec.heading);
      }
    } else if (ride) {
      ride.u += ride.sec.speed * dt;
      const why = stop.get(ride.sec.name);
      state.hint = why ? ride.sec.name + ' steht (' + why + ') · E: Bergung' : ride.sec.name + ' → ' + ride.sec.to + ' · W Zeitraffer';
      if (why && consume('KeyE')) {
        cabinAt(ride.sec, ride.i, tmp);
        const sec = ride.sec;
        ride = null;
        state.lift = null;
        player.object.visible = true;
        player.spawnAt(tmp.x - sec.px * 6, tmp.z - sec.pz * 6, sec.heading + Math.PI);
        state.note = 'Bergung – abgeseilt';
        state.noteT = 2.5;
      } else if (ride.u >= ride.sec.upLen) {
        const sec = ride.sec;
        ride = null;
        state.lift = null;
        player.object.visible = true;
        const k = exitTo(sec);
        if (k != null) goTo(k);
        else player.spawnAt(sec.b[0] + sec.dx * 20, sec.b[1] + sec.dz * 20, sec.heading);
      }
    } else if (state.crashed <= 0) {
      let rev = false, sec = sections.find(s => Math.hypot(state.pos.x - s.a[0], state.pos.z - s.a[1]) < BOARD);
      if (!sec) { sec = sections.find(s => s.tunnel && Math.hypot(state.pos.x - s.b[0], state.pos.z - s.b[1]) < BOARD); rev = !!sec; }
      if (sec && stop.has(sec.name)) state.hint = sec.name + ' – ' + (stop.get(sec.name) === 'geschlossen' ? 'Lift geschlossen' : stop.get(sec.name));
      else if (sec && shut.has(sec.name)) state.hint = sec.name + ' geschlossen';
      else if (sec) {
        state.hint = 'E: ' + sec.name + ' → ' + (rev ? sec.from : sec.to);
        if (consume('KeyE')) { board(sec, state, rev); player.object.visible = false; }
      }
    }
    consume('KeyE');

    for (const sec of sections) {
      if (!sec.cabs) continue;
      q.setFromAxisAngle(yAx, sec.heading);
      for (let i = 0; i < sec.count; i++) {
        cabinAt(sec, i, v);
        m4.compose(v, q, sc.set(1, 1, 1));
        for (const m of sec.cabs) m.setMatrixAt(i, m4);
      }
      for (const m of sec.cabs) m.instanceMatrix.needsUpdate = true;
    }

    if (ride && ride.tunnel) {
      const sec = ride.sec, e = ride.rev ? sec.b : sec.a;
      state.pos.set(e[0], terrain.heightAt(e[0], e[1]) + 1, e[1]);
      state.dir.set(sec.dx, 0, sec.dz);
      state.look.set(sec.dx, 0, sec.dz);
      state.heading = sec.heading;
      state.speed = 0;
      state.grounded = true;
    } else if (ride) {
      cabinAt(ride.sec, ride.i, tmp);
      state.pos.set(tmp.x, tmp.y - 0.9, tmp.z);
      state.dir.set(ride.sec.dx, 0, ride.sec.dz);
      state.look.set(ride.sec.dx - ride.sec.px * 0.6, 0, ride.sec.dz - ride.sec.pz * 0.6).normalize();
      state.heading = ride.sec.heading;
      state.speed = ride.sec.speed;
      state.grounded = true;
    }
  }

  function collide(state) {
    if (ride) return;
    for (const t of towers) {
      const ex = state.pos.x - t.x, ez = state.pos.z - t.z, d = Math.hypot(ex, ez), r = 1.6;
      if (d >= r || d === 0 || state.pos.y > t.y) continue;
      const nx = ex / d, nz = ez / d;
      state.pos.x = t.x + nx * r;
      state.pos.z = t.z + nz * r;
      const vn = state.vel.x * nx + state.vel.z * nz;
      if (vn < 0) { state.vel.x -= nx * vn * 1.4; state.vel.z -= nz * vn * 1.4; state.vel.multiplyScalar(0.7); }
    }
    for (const h of halls) {
      const ex = state.pos.x - h.x, ez = state.pos.z - h.z;
      const a = ex * h.dx + ez * h.dz, l = ex * -h.dz + ez * h.dx;
      const pa = h.hl + 0.5 - Math.abs(a), pl = h.hw + 0.5 - Math.abs(l);
      if (pa <= 0 || pl <= 0 || state.pos.y > h.top) continue;
      let nx, nz, p;
      if (pa < pl) { const s = Math.sign(a) || 1; nx = h.dx * s; nz = h.dz * s; p = pa; }
      else { const s = Math.sign(l) || 1; nx = -h.dz * s; nz = h.dx * s; p = pl; }
      state.pos.x += nx * p;
      state.pos.z += nz * p;
      const g = terrain.heightAt(state.pos.x, state.pos.z);
      if (state.grounded || state.pos.y < g) state.pos.y = g;
      const vn = state.vel.x * nx + state.vel.z * nz;
      if (vn < 0) { state.vel.x -= nx * vn; state.vel.z -= nz * vn; }
    }
  }

  const valley = sections[0];
  const valleySpawn = { x: valley.a[0] - valley.dx * 28, z: valley.a[1] - valley.dz * 28, heading: valley.heading };

  function inHall(x, z, m) {
    if (towers.some(t => Math.hypot(t.x - x, t.z - z) < 14)) return true;
    return halls.some(h => {
      const ex = x - h.x, ez = z - h.z;
      return Math.abs(ex * h.dx + ez * h.dz) < h.hl + m && Math.abs(-ex * h.dz + ez * h.dx) < h.hw + m;
    });
  }

  function clear(pts) {
    for (let i = 0; i < pts.length - 4; i++) {
      let hit = false;
      for (let j = i; j < i + 3 && !hit; j++) for (let f = 0; f < 1 && !hit; f += 0.1) hit = inHall(pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f, 3);
      if (!hit) return i;
    }
    return 0;
  }

  function leave(state) {
    if (!ride) return;
    ride = null;
    state.lift = null;
  }

  const cabinU = (sec, i) => { const u = (sec.phase + i * (sec.L / sec.count)) % sec.L; return u < 0 ? u + sec.L : u; };

  const api = { group, sections, planned, update, collide, leave, clear, shut, stop, setOpen, addSection, removeSection, site, riding: () => !!ride, valleySpawn, cabinAt, cabinU, rideCabin: () => ride, onAdd: null, pace: null };
  return api;
}
