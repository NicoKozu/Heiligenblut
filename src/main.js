import * as THREE from 'three';
import { createWorld } from './world.js';
import { createTerrain } from './terrain.js';
import { createPlayer } from './player.js';
import { createFollowCamera } from './camera.js';

function fail(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'flex';
}

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const { scene, followSun } = createWorld(renderer);
  scene.add(createTerrain());
  const player = createPlayer();
  scene.add(player.object);
  const cam = createFollowCamera();
  player.update(0);
  cam.update(player.state.pos, 0, true);

  addEventListener('resize', () => {
    cam.camera.aspect = innerWidth / innerHeight;
    cam.camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    player.update(dt);
    cam.update(player.state.pos, dt);
    followSun(player.state.pos);
    renderer.render(scene, cam.camera);
  });
} catch (e) {
  fail('WebGL konnte nicht gestartet werden: ' + e.message);
}
