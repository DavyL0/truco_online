import * as THREE from "three";

export interface MonkeyChair extends THREE.Group {
  cardAnchor: THREE.Object3D;
  handL: THREE.Mesh;
  handR: THREE.Mesh;
  setGrip: (cardCount: number) => void;
}

interface ArmRig {
  side: 1 | -1;
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  upper: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  forearm: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  hand: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
}

type ChairMaterials = Record<
  "fur" | "dark" | "skin" | "face" | "chair" | "eye",
  THREE.MeshStandardMaterial
>;

const vector = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function createMaterials(): ChairMaterials {
  const material = (color: number) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0 });

  return {
    fur: material(0x8a5a3c),
    dark: material(0x5a3a28),
    skin: material(0xd9a07e),
    face: material(0xc98a74),
    chair: material(0x7f8c8d),
    eye: material(0x1a1210),
  };
}

export function createMonkeyChair(): MonkeyChair {
  const materials = createMaterials();
  const group = new THREE.Group() as MonkeyChair;
  const geometryIcosahedron = new THREE.IcosahedronGeometry(1, 0);
  const geometryBox = new THREE.BoxGeometry(1, 1, 1);

  const addMesh = <TGeometry extends THREE.BufferGeometry>(
    geometry: TGeometry,
    material: THREE.Material,
    position: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh as THREE.Mesh<TGeometry, THREE.MeshStandardMaterial>;
  };

  const createLimb = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    topRadius: number,
    bottomRadius: number,
    material: THREE.MeshStandardMaterial,
  ) => {
    const direction = end.clone().sub(start);
    const length = direction.length();
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(bottomRadius, topRadius, length, 6),
      material,
    );
    mesh.castShadow = true;
    group.add(mesh);
    placeLimb(mesh, start, end);
    return mesh;
  };

  function placeLimb(
    mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>,
    start: THREE.Vector3,
    end: THREE.Vector3,
  ) {
    const direction = end.clone().sub(start);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.scale.y = direction.length() / mesh.geometry.parameters.height;
    mesh.quaternion.setFromUnitVectors(vector(0, 1, 0), direction.normalize());
  }

  buildChair(group, geometryBox, materials.chair);

  addMesh(geometryIcosahedron, materials.fur, [0, 1.05, -0.15], [0.38, 0.5, 0.3]);
  addMesh(geometryIcosahedron, materials.skin, [0, 1, -0.02], [0.22, 0.32, 0.17]);
  addMesh(geometryIcosahedron, materials.fur, [0, 0.7, -0.08], [0.34, 0.2, 0.3]);
  addMesh(geometryIcosahedron, materials.fur, [0, 1.68, -0.05], [0.28, 0.27, 0.27]);
  addMesh(geometryIcosahedron, materials.face, [0, 1.64, 0.14], [0.2, 0.18, 0.13]);
  addMesh(geometryBox, materials.eye, [0, 1.548, 0.258], [0.07, 0.014, 0.012]);
  addMesh(geometryBox, materials.eye, [-0.06, 1.56, 0.252], [0.06, 0.014, 0.012]).rotation.set(0, -0.45, -0.45);
  addMesh(geometryBox, materials.eye, [0.06, 1.56, 0.252], [0.06, 0.014, 0.012]).rotation.set(0, 0.45, 0.45);

  const arms: ArmRig[] = [];
  ([-1, 1] as const).forEach((side) => {
    addMesh(geometryIcosahedron, materials.eye, [side * 0.085, 1.7, 0.255], [0.04, 0.04, 0.03]);
    addMesh(geometryIcosahedron, materials.fur, [side * 0.29, 1.68, -0.05], [0.05, 0.1, 0.09]);

    const shoulder = vector(side * 0.38, 1.3, -0.15);
    const elbow = vector(side * 0.52, 1.04, 0.16);
    const wrist = vector(side * 0.27, 1.2, 0.62);
    const upper = createLimb(shoulder, elbow, 0.1, 0.08, materials.fur);
    const forearm = createLimb(elbow, wrist, 0.08, 0.06, materials.fur);
    const hand = addMesh(geometryIcosahedron, materials.dark, [wrist.x, wrist.y, wrist.z], [0.09, 0.075, 0.07]);
    arms.push({ side, shoulder, elbow, wrist, upper, forearm, hand });

    const hip = vector(side * 0.15, 0.68, -0.05);
    const knee = vector(side * 0.17, 0.7, 0.45);
    const ankle = vector(side * 0.17, 0.22, 0.5);
    createLimb(hip, knee, 0.13, 0.09, materials.fur);
    createLimb(knee, ankle, 0.09, 0.06, materials.fur);
    addMesh(geometryIcosahedron, materials.dark, [ankle.x, 0.13, 0.57], [0.07, 0.05, 0.12]);
  });

  const cardAnchor = new THREE.Object3D();
  cardAnchor.position.set(0, 1.34, 0.64);
  group.add(cardAnchor);

  group.cardAnchor = cardAnchor;
  group.handL = arms[0].hand;
  group.handR = arms[1].hand;
  group.setGrip = (cardCount: number) => {
    const spread = cardCount <= 1 ? 0.16 : cardCount === 2 ? 0.23 : 0.29;
    arms.forEach((arm) => {
      arm.wrist.set(arm.side * spread, 1.2, 0.62);
      placeLimb(arm.upper, arm.shoulder, arm.elbow);
      placeLimb(arm.forearm, arm.elbow, arm.wrist);
      arm.hand.position.copy(arm.wrist);
      arm.hand.rotation.set(-0.35, 0, arm.side * 0.18);
    });
  };
  group.setGrip(3);

  return group;
}

function buildChair(
  group: THREE.Group,
  geometryBox: THREE.BoxGeometry,
  material: THREE.MeshStandardMaterial,
) {
  const addBox = (position: [number, number, number], scale: [number, number, number]) => {
    const mesh = new THREE.Mesh(geometryBox, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    group.add(mesh);
  };

  addBox([0, 0.52, 0], [0.9, 0.07, 0.85]);
  addBox([-0.38, 0.25, -0.35], [0.07, 0.5, 0.07]);
  addBox([0.38, 0.25, -0.35], [0.07, 0.5, 0.07]);
  addBox([-0.38, 0.25, 0.35], [0.07, 0.5, 0.07]);
  addBox([0.38, 0.25, 0.35], [0.07, 0.5, 0.07]);

  const back = new THREE.Group();
  back.position.set(0, 0.55, -0.4);
  back.rotation.x = -0.18;
  const addBackBox = (x: number, y: number, scale: [number, number, number]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.position.set(x, y, 0);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    back.add(mesh);
  };
  addBackBox(0, 0.78, [0.95, 0.09, 0.07]);
  addBackBox(-0.46, 0.4, [0.07, 0.8, 0.07]);
  addBackBox(0.46, 0.4, [0.07, 0.8, 0.07]);
  for (let index = -2; index <= 2; index += 1) {
    addBackBox(index * 0.18, 0.4, [0.08, 0.7, 0.04]);
  }
  group.add(back);

  addBox([-0.47, 0.8, -0.05], [0.07, 0.07, 0.65]);
  addBox([0.47, 0.8, -0.05], [0.07, 0.07, 0.65]);
  addBox([-0.47, 0.66, 0.25], [0.07, 0.28, 0.07]);
  addBox([0.47, 0.66, 0.25], [0.07, 0.28, 0.07]);
  addBox([-0.47, 0.7, -0.38], [0.07, 0.3, 0.07]);
  addBox([0.47, 0.7, -0.38], [0.07, 0.3, 0.07]);
}
