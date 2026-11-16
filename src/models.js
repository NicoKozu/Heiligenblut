import * as THREE from 'three';

const mat = (color, roughness = 0.6) => new THREE.MeshStandardMaterial({ color, roughness });

function shadows(g) {
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function headWithGoggles(helmet, y) {
  const head = new THREE.Group();
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(helmet, 0.4)));
  const gog = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.08), mat(0xff8a00, 0.2));
  gog.position.set(0, 0.02, 0.14);
  head.add(gog);
  head.position.y = y;
  return head;
}

export function createSkier() {
  const group = new THREE.Group();
  const upper = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 10), mat(0xc8202a));
  body.position.y = 0.45;
  upper.add(body, headWithGoggles(0x222222, 1.05));
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.3), mat(0x1d2b3a, 0.7));
  const skiGeo = new THREE.BoxGeometry(0.1, 0.04, 1.7);
  const skiMat = mat(0xf2c200, 0.4);
  const skiL = new THREE.Mesh(skiGeo, skiMat);
  const skiR = new THREE.Mesh(skiGeo, skiMat);
  skiL.position.set(-0.13, 0.03, 0.1);
  skiR.position.set(0.13, 0.03, 0.1);
  group.add(upper, legs, skiL, skiR);

  function pose(p) {
    upper.position.y = 0.8 - 0.3 * p.tuck - (p.ctrl ? 0 : 0.5);
    upper.rotation.x = 0.12 + 0.6 * p.tuck;
    legs.scale.y = 1 - 0.35 * p.tuck;
    legs.position.y = 0.4 * legs.scale.y + 0.04;
    skiL.rotation.y = 0.28 * p.brake;
    skiR.rotation.y = -0.28 * p.brake;
    skiL.position.x = -0.13 - 0.12 * p.brake;
    skiR.position.x = 0.13 + 0.12 * p.brake;
  }

  return { object: shadows(group), pose };
}

export function createBoarder() {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 1.5), mat(0x15a37a, 0.35));
  board.position.y = 0.03;
  const tipGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.035, 16, 1, false, 0, Math.PI);
  const nose = new THREE.Mesh(tipGeo, board.material);
  nose.position.set(0, 0.03, 0.75);
  nose.rotation.y = -Math.PI / 2;
  const tail = nose.clone();
  tail.position.z = -0.75;
  tail.rotation.y = Math.PI / 2;
  const pantsMat = mat(0x2d2d33, 0.8);
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.55, 4, 8);
  const legF = new THREE.Mesh(legGeo, pantsMat);
  const legB = new THREE.Mesh(legGeo, pantsMat);
  const bodyPivot = new THREE.Group();
  const upper = new THREE.Group();
  upper.rotation.y = -Math.PI / 2;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.55, 4, 10), mat(0x2f6fd6));
  body.position.y = 0.38;
  const arms = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.0, 4, 8), body.material);
  arms.rotation.z = Math.PI / 2;
  arms.position.y = 0.6;
  upper.add(body, arms, headWithGoggles(0xeeeeee, 0.92));
  bodyPivot.add(upper);
  rig.add(board, nose, tail, legF, legB, bodyPivot);
  group.add(rig);

  function pose(p) {
    const crouch = 0.25 * p.tuck + 0.12 * p.brake + (p.ctrl ? 0 : 0.35);
    const hip = 0.85 - crouch;
    for (const [leg, z] of [[legF, 0.24], [legB, -0.24]]) {
      leg.position.set(0, (hip + 0.05) / 2, z);
      leg.scale.y = hip / 0.85;
    }
    bodyPivot.position.y = hip;
    bodyPivot.rotation.x = 0.35 * p.tuck;
    bodyPivot.rotation.z = -0.25 * p.brake;
    arms.rotation.x = 0.4 * p.tuck;
    rig.rotation.y = (p.fakie ? Math.PI : 0) + 1.2 * p.brake;
  }

  return { object: shadows(group), pose };
}
