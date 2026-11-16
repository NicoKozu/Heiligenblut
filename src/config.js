import * as THREE from 'three';

export const AREA = {
  name: 'Heiligenblut am Großglockner',
  valleyStation: 1301,
  midStation: 1740,
  schareck: 2604,
  highest: 2902,
  grossglockner: 3798,
  slopeKm: 55
};

export const TERRAIN_URL = 'public/terrain/heiligenblut';

export const START = { x: 1250, z: -2900 };

export const get = (url, type) => fetch(url).then(r => {
  if (!r.ok) throw new Error(url + ' (' + r.status + ')');
  return r[type]();
});

export const image = url => get(url, 'blob').then(b => createImageBitmap(b));

export const texture = url => image(url).then(i => {
  const t = new THREE.Texture(i);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
});
