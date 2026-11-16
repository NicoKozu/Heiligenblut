import * as THREE from 'three';
import { createWorld } from './world.js';
import { loadTerrain } from './terrain.js';
import { createPlayer } from './player.js';
import { createFollowCamera } from './camera.js';

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
  info.innerHTML = 'Heiligenblut am Großglockner · Etappe 3<br>W Hocke · S Bremsen · A/D Kurven · Leertaste Sprung · R Neustart<br><span id="spd"></span>';
  const spd = document.getElementById('spd');

  const player = createPlayer(terrain);
  scene.add(player.object);
  const cam = createFollowCamera(terrain);
  player.update(0);
  cam.update(player.state.pos, player.state.dir, 0, true);

  addEventListener('resize', () => {
    cam.camera.aspect = innerWidth / innerHeight;
    cam.camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    player.update(dt);
    cam.update(player.state.pos, player.state.dir, dt, player.state.reset);
    spd.textContent = Math.round(player.state.speed * 3.6) + ' km/h' + (player.state.crashed > 0 ? ' · Sturz!' : '');
    followSun(player.state.pos);
    renderer.render(scene, cam.camera);
  });
}

start().catch(e => fail('Start fehlgeschlagen: ' + e.message));
