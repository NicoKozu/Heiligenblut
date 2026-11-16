import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export const SUN = { azimuth: 158, elevation: 31 };
export const HAZE = 1.25e-5;

THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;

export function createWorld(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xcfdeec, HAZE);

  const a = THREE.MathUtils.degToRad(SUN.azimuth), e = THREE.MathUtils.degToRad(SUN.elevation);
  const sunDir = new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a));

  const sky = new Sky();
  sky.scale.setScalar(60000);
  sky.renderOrder = -10;
  const u = sky.material.uniforms;
  u.turbidity.value = 2.6;
  u.rayleigh.value = 1.1;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  u.sunPosition.value.copy(sunDir);

  const hemi = new THREE.HemisphereLight(0xd8e8ff, 0x8a9ab0, 1.15);
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

  return { scene, sky, sun, hemi, sunDir, followSun };
}
