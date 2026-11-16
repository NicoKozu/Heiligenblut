import * as THREE from 'three';
import { SLOPE } from './config.js';

export function heightAt(x, z) {
  const base = -z * SLOPE.gradient;
  const bowl = (x * x) * 0.0009;
  const waves = Math.sin(z * 0.02) * 2.5 + Math.sin(x * 0.03 + z * 0.01) * 1.5;
  return base + bowl + waves;
}

export function createTerrain() {
  const geo = new THREE.PlaneGeometry(SLOPE.width, SLOPE.length, SLOPE.segX, SLOPE.segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    const n = 0.94 + Math.random() * 0.06;
    c.setRGB(n, n, Math.min(1, n + 0.04));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
