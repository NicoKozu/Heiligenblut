import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export function createWorld(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe0ee, 250, 1100);

  const sky = new Sky();
  sky.scale.setScalar(5000);
  const u = sky.material.uniforms;
  u.turbidity.value = 3;
  u.rayleigh.value = 1.2;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.8;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(58), THREE.MathUtils.degToRad(200));
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xdfefff, 0x8a9bb0, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = sun.shadow.camera;
  s.left = -60; s.right = 60; s.top = 60; s.bottom = -60; s.near = 1; s.far = 400;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  function followSun(target) {
    sun.position.copy(target).addScaledVector(sunDir, 150);
    sun.target.position.copy(target);
  }

  return { scene, followSun };
}
