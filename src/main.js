import * as THREE from 'three';
import { createWorld } from './world.js';
import { loadTerrain } from './terrain.js';
import { createPlayer } from './player.js';
import { createFollowCamera } from './camera.js';
import { createHud } from './hud.js';
import { loadPistes } from './pistes.js';
import { createLift } from './lift.js';
import { createScenery } from './scenery.js';
import { createEffects } from './effects.js';
import { loadPanorama } from './panorama.js';
import { createPeakLabels } from './peaks.js';
import { consume, flush, down } from './input.js';
import { createMenu } from './menu.js';
import { createAudio } from './audio.js';
import { loadAssets } from './assets.js';
import { createProps } from './props.js';
import { createCrowd } from './crowd.js';
import { get } from './config.js';

const menu = createMenu();
let failed = false;

function fail(msg) {
  if (failed) return;
  failed = true;
  const el = document.getElementById('error');
  el.innerHTML = '<div><b>Fehler</b><br>' + String(msg).replace(/</g, '&lt;') + '<br><br><button onclick="location.reload()">Neu laden</button></div>';
  el.style.display = 'flex';
}

addEventListener('error', e => fail(e.message || 'Unbekannter Fehler'));
addEventListener('unhandledrejection', e => fail(e.reason?.message || e.reason || 'Unbekannter Fehler'));

function webgl2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

async function start() {
  if (!webgl2()) throw new Error('Dein Browser unterstützt kein WebGL 2. Bitte aktuellen Chrome, Firefox, Edge oder Safari verwenden und Hardwarebeschleunigung aktivieren.');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const maxRatio = Math.min(devicePixelRatio, 2);
  let ratio = Math.min(maxRatio, 1.5);
  renderer.setPixelRatio(ratio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); fail('Grafikkontext verloren (Grafiktreiber/Speicher). Bitte Seite neu laden.'); });

  const world = createWorld(renderer);
  const { scene, followSun } = world;
  const assetsP = loadAssets();
  const osmP = get('public/osm.json', 'json');
  menu.setStatus('Lade Gelände …');
  const terrain = await loadTerrain();
  scene.add(terrain.mesh);
  menu.setStatus('Lade Pisten …');
  const pistes = await loadPistes(terrain);
  scene.add(pistes.group);
  const lift = createLift(terrain, pistes);
  scene.add(lift.group);
  menu.setStatus('Lade Modelle …');
  const assets = await assetsP;
  menu.setStatus('Pflanze Wald …');
  await new Promise(r => setTimeout(r, 0));
  const props = createProps(terrain, pistes, lift, await osmP);
  const scenery = createScenery(terrain, pistes, lift, assets, props.blocked);
  scene.add(scenery.group);
  menu.setStatus('Baue Ort und Felsen …');
  await new Promise(r => setTimeout(r, 0));
  props.build(scenery.huts);
  scene.add(props.group);
  const fx = createEffects(terrain);
  scene.add(fx.group);
  menu.setPistes(pistes.list);
  const hud = createHud(pistes);

  const crowd = createCrowd(terrain, pistes, lift, assets);
  scene.add(crowd.group);
  const player = createPlayer(terrain, assets);
  scene.add(player.object);
  const goTo = k => {
    const s = pistes.startOf(k);
    if (!s) return;
    const pts = s.piste.pts, i = lift.clear(pts);
    const [ax, az] = pts[i], [bx, bz] = pts[i + 2];
    player.spawnAt(ax, az, Math.atan2(bx - ax, bz - az));
  };
  goTo(0);
  const cam = createFollowCamera(terrain);
  player.update(0);
  cam.update(player.state.pos, player.state.look, 0, true);

  menu.setStatus('Berechne Panorama …');
  await new Promise(r => setTimeout(r, 0));
  const pano = await loadPanorama(terrain, world);
  pano.bake(renderer);
  pano.shade(scene);
  const peaks = createPeakLabels(pano);
  const audio = createAudio();
  const fps = document.getElementById('fps');
  let pending = null, snap = false, fT = 0, fN = 0, slow = 0, good = 0, cap = maxRatio;

  menu.onStart(c => { pending = c; audio.init(); audio.pause(false); });
  menu.onResume(() => { audio.init(); audio.pause(false); flush(); });
  menu.ready();
  document.addEventListener('visibilitychange', () => { if (document.hidden && !menu.open) { menu.show(); audio.pause(true); } });

  function applyStart(c) {
    player.setMode(c.mode);
    if (c.start < 0) player.spawnAt(lift.valleySpawn.x, lift.valleySpawn.z, lift.valleySpawn.heading);
    else goTo(c.start);
  }

  function adapt(dt) {
    fT += dt; fN++;
    if (fT < 1) return;
    const f = fN / fT;
    fT = 0; fN = 0;
    fps.textContent = Math.round(f) + ' FPS · ' + ratio.toFixed(2) + '×';
    if (f < 50) { slow++; good = 0; } else { slow = 0; if (f > 57) good++; }
    let r = ratio;
    if (slow >= 2 && ratio > 0.6) { cap = ratio; r = Math.max(0.6, ratio - 0.2); slow = 0; }
    else if (good >= 10 && ratio < cap - 0.01) { r = Math.min(cap, ratio + 0.1); good = 0; }
    if (r !== ratio) { ratio = r; renderer.setPixelRatio(ratio); }
  }

  addEventListener('resize', () => {
    cam.camera.aspect = innerWidth / innerHeight;
    cam.camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    if (failed) return renderer.setAnimationLoop(null);
    if (menu.open) {
      flush();
      audio.update(player.state, {}, true);
      scenery.update(cam.camera);
      props.update(cam.camera);
      pano.render(renderer, scene, cam.camera);
      peaks.update(cam.camera);
      return;
    }
    adapt(raw);
    if (consume('KeyC')) { player.state.note = cam.toggle() === 'ego' ? 'Ego-Kamera' : 'Verfolgerkamera'; player.state.noteT = 1.2; snap = true; }
    if (consume('KeyM')) { audio.init(); player.state.note = audio.toggle() ? 'Ton an' : 'Ton aus'; player.state.noteT = 1.2; }
    if (consume('KeyF')) fps.hidden = !fps.hidden;
    if (consume('Escape')) { menu.show(); audio.pause(true); }
    if (consume('KeyP')) peaks.toggle();
    if (pending) { lift.leave(player.state); applyStart(pending); pending = null; }
    if (!lift.riding()) {
      player.update(dt);
      pistes.collide(player.state);
      lift.collide(player.state);
      scenery.collide(player.state, (st, v) => fx.burst(st, 50, v));
      props.collide(player.state, (st, v) => fx.burst(st, 50, v));
      crowd.collide(player.state, (st, v) => fx.burst(st, 50, v));
      for (let k = 0; k < pistes.list.length; k++) if (consume('Digit' + (k + 1))) goTo(k);
      if (consume('Digit0')) player.spawnAt(lift.valleySpawn.x, lift.valleySpawn.z, lift.valleySpawn.heading);
    } else flush();
    lift.update(dt, player.state, player, goTo);
    crowd.update(dt, cam.camera);
    player.object.visible = !lift.riding() && cam.mode !== 'ego';
    fx.update(dt, player.state, lift.riding(), renderer.domElement.height);
    hud.update(player.state, dt);
    const st = player.state;
    cam.update(st.pos, st.lift && cam.mode === 'ego' ? st.dir : st.look, dt, st.reset || snap, { speed: st.lift ? 0 : st.speed, lift: !!st.lift, crashed: st.crashed > 0, tuck: !st.lift && down('KeyW', 'ArrowUp') && !down('KeyS', 'ArrowDown') });
    snap = false;
    scenery.update(cam.camera);
    props.update(cam.camera);
    audio.update(st, { steer: (down('KeyA', 'ArrowLeft') ? 1 : 0) - (down('KeyD', 'ArrowRight') ? 1 : 0), brake: down('KeyS', 'ArrowDown') }, false);
    followSun(player.state.pos);
    pano.update(cam.camera, dt);
    pano.render(renderer, scene, cam.camera);
    peaks.update(cam.camera);
  });
}

start().catch(e => fail('Start fehlgeschlagen: ' + e.message));
