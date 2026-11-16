import * as THREE from 'three';
import { createWorld } from './world.js';
import { loadTerrain } from './terrain.js';
import { createPlayer } from './player.js';
import { createFollowCamera } from './camera.js';
import { createHud } from './hud.js';
import { loadPistes } from './pistes.js';
import { createLift } from './lift.js';
import { consume, flush } from './input.js';

const info = document.getElementById('info');

function fail(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'flex';
}

async function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const { scene, followSun } = createWorld(renderer);
  info.textContent = 'Lade Gelände …';
  const terrain = await loadTerrain();
  scene.add(terrain.mesh);
  info.textContent = 'Lade Pisten …';
  const pistes = await loadPistes(terrain);
  scene.add(pistes.group);
  const lift = createLift(terrain, pistes);
  scene.add(lift.group);
  info.innerHTML = 'Heiligenblut am Großglockner · Etappe 7<br>Q Ski/Snowboard · W Hocke · S Bremsen · A/D Kurven · Leertaste Sprung · R Neustart<br>E Gondel (an Talstation/Rossbach) · W in der Gondel = Zeitraffer · 0 Talstation<br>Pistenstart: ' +
    pistes.list.map((p, i) => (i + 1) + ' ' + p.id + ' ' + p.name).join(' · ');
  const hud = createHud(pistes);

  const player = createPlayer(terrain);
  scene.add(player.object);
  const goTo = k => {
    const s = pistes.startOf(k);
    if (s) player.spawnAt(s.x, s.z, s.heading);
  };
  goTo(0);
  const cam = createFollowCamera(terrain);
  player.update(0);
  cam.update(player.state.pos, player.state.look, 0, true);

  addEventListener('resize', () => {
    cam.camera.aspect = innerWidth / innerHeight;
    cam.camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!lift.riding()) {
      player.update(dt);
      pistes.collide(player.state);
      lift.collide(player.state);
      for (let k = 0; k < pistes.list.length; k++) if (consume('Digit' + (k + 1))) goTo(k);
      if (consume('Digit0')) player.spawnAt(lift.valleySpawn.x, lift.valleySpawn.z, lift.valleySpawn.heading);
    } else flush();
    lift.update(dt, player.state, player, goTo);
    hud.update(player.state, dt);
    cam.update(player.state.pos, player.state.look, dt, player.state.reset);
    followSun(player.state.pos);
    renderer.render(scene, cam.camera);
  });
}

start().catch(e => fail('Start fehlgeschlagen: ' + e.message));
