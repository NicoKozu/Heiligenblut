import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export function createWorld(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xd6e4f0, 0.00009);

  const sky = new Sky();
  sky.scale.setScalar(40000);
  const u = sky.material.uniforms;
  u.turbidity.value = 3;
  u.rayleigh.value = 1.2;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.8;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(55), THREE.MathUtils.degToRad(160));
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xdfefff, 0x7d8ea5, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dc, 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = sun.shadow.camera;
  s.left = -80; s.right = 80; s.top = 80; s.bottom = -80; s.near = 1; s.far = 1200;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  function followSun(target) {
    sun.position.copy(target).addScaledVector(sunDir, 600);
    sun.target.position.copy(target);
  }

  return { scene, sky, followSun };
}
