import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { get, image } from './config.js';

const gltf = url => get(url, 'arrayBuffer').then(b => new Promise((ok, err) => new GLTFLoader().parse(b, '', ok, err)));

export async function loadAssets() {
  const [trees, leaves, figure] = await Promise.all([
    gltf('public/models/spruce.glb'),
    image('public/models/spruce_leaves.png'),
    gltf('public/models/figure.glb')
  ]);
  const map = new THREE.Texture(leaves);
  map.flipY = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;
  const variants = [];
  trees.scene.traverse(o => {
    if (!o.isMesh) return;
    const v = variants.find(v => v.name === o.parent.name) || variants[variants.push({ name: o.parent.name }) - 1];
    v[o.material.name === 'PineTree_Leaves' ? 'leaves' : 'bark'] = o.geometry;
  });
  return { spruce: variants.map(({ bark, leaves }) => ({ bark, leaves })), leaves: map, figure };
}
