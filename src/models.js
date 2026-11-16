import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const mat = (color, roughness = 0.6) => new THREE.MeshStandardMaterial({ color, roughness });
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), qy = new THREE.Quaternion();
const va = new THREE.Vector3(), vb = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

function outfit(colors) {
  const u = Object.fromEntries(Object.entries(colors).map(([k, c]) => ['o' + k, { value: new THREE.Color(c) }]));
  const m = new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide });
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, u);
    s.vertexShader = 'varying vec3 vBind;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    s.fragmentShader = 'varying vec3 vBind;\n' + Object.keys(u).map(k => `uniform vec3 ${k};`).join('\n') + '\n' + s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  vec3 oc = oJacket;
  float ax = abs(vBind.x);
  if (vBind.y < 1.0) oc = oPants;
  if (vBind.y < 1.0 && vBind.y > 0.93 && ax < 0.2) oc = oJacket * 0.6;
  if (vBind.y < 0.13) oc = oBoots;
  if (ax > 0.42 && vBind.y > 1.3) oc = oSleeve;
  if (ax > 0.66) oc = oGloves;
  if (vBind.y > 1.58 && ax < 0.13) oc = oHelmet;
  if (vBind.y > 1.64 && vBind.y < 1.71 && vBind.z > 0.04) oc = vec3(1.0, 0.55, 0.05);
  diffuseColor.rgb = oc;`);
  };
  m.customProgramCacheKey = () => 'outfit';
  return m;
}

function rig(src, colors) {
  const root = clone(src.scene);
  const b = {};
  const body = outfit(colors), joints = mat(0x2a2d33, 0.5);
  root.traverse(o => {
    if (o.isBone) b[o.name.replace('mixamorig', '')] = o;
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false;
      o.material = o.name === 'Beta_Joints' ? joints : body;
    }
  });
  for (const o of Object.values(b)) o.userData.rest = o.quaternion.clone();
  const hipsRest = b.Hips.position.clone();
  const armScale = b.Hips.parent.scale.x;
  const rootInv = new THREE.Quaternion();
  const rel = new THREE.Matrix4(), inv = new THREE.Matrix4();

  function aim(name, child, dir, yaw = 0) {
    const bone = b[name], c = b[child];
    bone.parent.getWorldQuaternion(qa).premultiply(rootInv);
    qb.copy(qa).multiply(bone.userData.rest);
    va.copy(c.position).normalize().applyQuaternion(qb);
    qc.setFromUnitVectors(va, dir).multiply(qb);
    if (yaw) qc.premultiply(qy.setFromAxisAngle(UP, yaw));
    bone.quaternion.copy(qa.invert()).multiply(qc);
    bone.updateMatrixWorld(true);
  }

  function local(name, out) {
    return out.setFromMatrixPosition(rel.multiplyMatrices(inv, b[name].matrixWorld));
  }

  function begin() {
    root.updateMatrixWorld(true);
    root.getWorldQuaternion(rootInv).invert();
    inv.copy(root.matrixWorld).invert();
    for (const o of Object.values(b)) o.quaternion.copy(o.userData.rest);
    b.Hips.position.copy(hipsRest);
    root.updateMatrixWorld(true);
  }

  function plant(target) {
    local('LeftFoot', va);
    local('RightFoot', vb);
    va.add(vb).multiplyScalar(0.5);
    b.Hips.position.addScaledVector(target.sub(va), 1 / armScale);
    root.updateMatrixWorld(true);
  }

  return { root, b, aim, local, begin, plant };
}

function poleMesh() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1, 6).translate(0, -0.5, 0), mat(0xb8bcc4, 0.3));
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 10), mat(0x222222));
  g.add(shaft, basket);
  shaft.castShadow = true;
  return { g, shaft, basket };
}

export function createSkier(src) {
  const group = new THREE.Group();
  const f = rig(src, { Jacket: 0xc8202a, Sleeve: 0xa81822, Pants: 0x1d2b3a, Boots: 0x303438, Gloves: 0x1a1a1a, Helmet: 0x222222 });
  group.add(f.root);
  const skiGeo = new THREE.BoxGeometry(0.09, 0.03, 1.7);
  const skiMat = mat(0xf2c200, 0.4);
  const skis = [new THREE.Mesh(skiGeo, skiMat), new THREE.Mesh(skiGeo, skiMat)];
  const poles = [poleMesh(), poleMesh()];
  for (const s of skis) { s.castShadow = true; group.add(s); }
  for (const p of poles) group.add(p.g);
  const h = new THREE.Vector3(), t = new THREE.Vector3(), d = new THREE.Vector3();

  function pose(p) {
    const tuck = p.ctrl ? p.tuck : 1, br = p.ctrl ? p.brake : 0, down = p.ctrl ? 0 : 1;
    const a = 0.32 + 0.4 * tuck + 0.15 * br + 0.5 * down, bb = 0.5 + 0.75 * tuck + 0.2 * br + 0.9 * down, c = 0.25 + 0.75 * tuck + 0.3 * down;
    f.begin();
    f.aim('Spine', 'Spine1', V(0, Math.cos(c * 0.6), Math.sin(c * 0.6)));
    f.aim('Spine1', 'Spine2', V(0, Math.cos(c), Math.sin(c)));
    f.aim('Spine2', 'Neck', V(0, Math.cos(c), Math.sin(c)));
    f.aim('Neck', 'Head', V(0, 1, 0.35 * c));
    f.aim('Head', 'HeadTop_End', V(0, 1, 0.2 - 0.3 * tuck));
    for (const s of [1, -1]) {
      const L = s > 0 ? 'Left' : 'Right';
      f.aim(L + 'UpLeg', L + 'Leg', V(s * (0.06 + 0.3 * br), -Math.cos(bb), Math.sin(bb)));
      f.aim(L + 'Leg', L + 'Foot', V(s * (0.02 + 0.2 * br), -Math.cos(a), -Math.sin(a)));
      f.aim(L + 'Foot', L + 'ToeBase', V(-s * 0.2 * br, -0.35, 1));
      f.aim(L + 'Arm', L + 'ForeArm', V(s * (0.2 - 0.08 * tuck + 0.4 * down), -0.8 + 0.5 * tuck - 0.2 * down, 0.55 + 0.2 * tuck));
      f.aim(L + 'ForeArm', L + 'Hand', V(s * (0.12 - 0.3 * tuck), -0.15 + 0.2 * tuck, 1));
      f.aim(L + 'Hand', L + 'HandMiddle1', V(s * 0.05 - s * 0.2 * tuck, -0.2, 1));
    }
    f.plant(t.set(0, 0.09, 0.02));
    for (let i = 0; i < 2; i++) {
      const L = i ? 'Right' : 'Left', s = i ? -1 : 1;
      f.local(L + 'Foot', h);
      f.local(L + 'ToeBase', t);
      const yaw = Math.atan2(t.x - h.x, t.z - h.z);
      skis[i].position.set(h.x + Math.sin(yaw) * 0.05, 0.015, h.z + Math.cos(yaw) * 0.05);
      skis[i].rotation.y = yaw;
      f.local(L + 'Hand', h);
      t.set(h.x + s * (0.12 + 0.1 * tuck), 0.02, h.z - 0.25 - 0.55 * tuck);
      if (tuck > 0.5) t.set(h.x + s * 0.3, h.y + 0.1, h.z - 1.1);
      d.subVectors(t, h);
      const len = d.length(), pl = poles[i];
      pl.g.position.copy(h);
      pl.g.quaternion.setFromUnitVectors(DOWN, d.multiplyScalar(1 / len));
      pl.shaft.scale.y = len + 0.08;
      pl.shaft.position.y = 0.08;
      pl.basket.position.y = 0.1 - len;
    }
  }

  return { object: group, pose };
}

export function createBoarder(src) {
  const group = new THREE.Group();
  const rigG = new THREE.Group();
  const f = rig(src, { Jacket: 0x2f6fd6, Sleeve: 0x2860bb, Pants: 0x2d2d33, Boots: 0x1c1c1c, Gloves: 0x111111, Helmet: 0xeeeeee });
  f.root.rotation.y = -Math.PI / 2;
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 1.3), mat(0x15a37a, 0.35));
  board.position.y = 0.02;
  const tipGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.035, 16, 1, false, 0, Math.PI);
  const nose = new THREE.Mesh(tipGeo, board.material);
  nose.position.set(0, 0.02, 0.65);
  nose.rotation.y = -Math.PI / 2;
  const tail = nose.clone();
  tail.position.z = -0.65;
  tail.rotation.y = Math.PI / 2;
  for (const m of [board, nose, tail]) m.castShadow = true;
  rigG.add(board, nose, tail, f.root);
  group.add(rigG);
  const t = new THREE.Vector3();

  function pose(p) {
    const ctrl = p.ctrl;
    const k = ctrl ? 0.25 * p.tuck + 0.15 * p.brake : 0.6;
    const a = 0.35 + 1.0 * k, bb = 0.45 + 1.3 * k, c = 0.2 + 0.6 * k - 0.25 * p.brake;
    f.begin();
    f.aim('Spine', 'Spine1', V(0, Math.cos(c * 0.6), Math.sin(c * 0.6)), 0.15);
    f.aim('Spine1', 'Spine2', V(0, Math.cos(c), Math.sin(c)), 0.3);
    f.aim('Spine2', 'Neck', V(0, Math.cos(c), Math.sin(c)), 0.45);
    f.aim('Neck', 'Head', V(0.2, 1, 0.2));
    f.aim('Head', 'HeadTop_End', V(0.1, 1, 0.1), 1.0);
    for (const s of [1, -1]) {
      const L = s > 0 ? 'Left' : 'Right';
      f.aim(L + 'UpLeg', L + 'Leg', V(s * 0.32, -Math.cos(bb), Math.sin(bb)));
      f.aim(L + 'Leg', L + 'Foot', V(s * 0.12, -Math.cos(a), -Math.sin(a)));
      f.aim(L + 'Foot', L + 'ToeBase', V(s * 0.35, -0.3, 1));
      f.aim(L + 'Arm', L + 'ForeArm', V(s, -0.55 + 0.2 * k, 0.25));
      f.aim(L + 'ForeArm', L + 'Hand', V(s, -0.35, 0.3));
      f.aim(L + 'Hand', L + 'HandMiddle1', V(s, -0.4, 0.2));
    }
    f.plant(t.set(0, 0.11, 0));
    rigG.rotation.y = (p.fakie ? Math.PI : 0) + 1.2 * p.brake;
  }

  return { object: group, pose };
}
