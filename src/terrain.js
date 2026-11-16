import * as THREE from 'three';
import { TERRAIN_URL } from './config.js';

function snowBumpTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 150 + Math.random() * 60 + (Math.random() < 0.02 ? 45 : 0);
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  ctx.filter = 'blur(1px)';
  ctx.drawImage(c, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export async function loadTerrain() {
  const [meta, buf] = await Promise.all([
    fetch(TERRAIN_URL + '.json').then(r => r.json()),
    fetch(TERRAIN_URL + '.bin').then(r => r.arrayBuffer())
  ]);
  const { nx, nz, cell, originX, originZ, scale } = meta;
  const raw = new Uint16Array(buf);
  const h = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) h[i] = raw[i] * scale;
  const width = (nx - 1) * cell;
  const depth = (nz - 1) * cell;

  function heightAt(x, z) {
    const fx = THREE.MathUtils.clamp((x - originX) / cell, 0, nx - 1.001);
    const fz = THREE.MathUtils.clamp((z - originZ) / cell, 0, nz - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j;
    const a = h[j * nx + i], b = h[j * nx + i + 1];
    const c = h[(j + 1) * nx + i], d = h[(j + 1) * nx + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  function normalAt(x, z, out = new THREE.Vector3()) {
    const e = 2;
    return out.set(
      heightAt(x - e, z) - heightAt(x + e, z),
      2 * e,
      heightAt(x, z - e) - heightAt(x, z + e)
    ).normalize();
  }

  function inside(x, z) {
    return x > originX + cell && x < originX + width - cell && z > originZ + cell && z < originZ + depth - cell;
  }

  const geo = new THREE.PlaneGeometry(width, depth, nx - 1, nz - 1);
  const pos = geo.attributes.position;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      pos.setXYZ(k, originX + i * cell, h[k], originZ + j * cell);
    }
  }
  geo.computeVertexNormals();

  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const snow = new THREE.Color(0xf4f8ff);
  const shade = new THREE.Color(0xdde8f5);
  const rock = new THREE.Color(0x6b6560);
  const forest = new THREE.Color(0x9fa9a8);
  const col = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const ny = nrm.getY(k);
    const y = pos.getY(k);
    col.copy(snow).lerp(shade, Math.random() * 0.5);
    const low = THREE.MathUtils.smoothstep(y, 1250, 1900);
    col.lerp(forest, (1 - low) * 0.25);
    const steep = THREE.MathUtils.smoothstep(1 - ny, 0.32, 0.48);
    col.lerp(rock, steep);
    colors.set([col.r, col.g, col.b], k * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const bump = snowBumpTexture();
  bump.repeat.set(width / 6, depth / 6);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0,
    bumpMap: bump,
    bumpScale: 0.6
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  const pois = Object.fromEntries(meta.pois.map(p => [p.name, p]));
  return { mesh, heightAt, normalAt, inside, pois, meta };
}
