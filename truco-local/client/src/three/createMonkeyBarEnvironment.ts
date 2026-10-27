import * as THREE from "three";

export interface MonkeyBarEnvironment {
  group: THREE.Group;
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
}

type MaterialOptions = Partial<THREE.MeshStandardMaterialParameters>;

function makeMaterial(color: number, options: MaterialOptions = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...options });
}

function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createPlankTexture(base: string, dark: string, rows = 8): THREE.CanvasTexture {
  const texture = createCanvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < rows; i += 1) {
      c.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`;
      c.fillRect(0, (i * h) / rows, w, h / rows);
      c.fillStyle = dark;
      c.fillRect(0, (i * h) / rows, w, 3);
    }
    for (let i = 0; i < 260; i += 1) {
      c.globalAlpha = Math.random() * 0.25;
      c.fillStyle = Math.random() < 0.5 ? dark : "#000";
      c.fillRect(Math.random() * w, Math.random() * h, Math.random() * 160 + 20, 1 + Math.random() * 2);
    }
    c.globalAlpha = 1;
    for (let i = 0; i < rows; i += 1) {
      c.fillStyle = dark;
      c.fillRect(Math.random() * w, (i * h) / rows, 3, h / rows);
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/* quadro com paisagem em tons quentes */
const LANDSCAPE_TEXTURE = () =>
  createCanvasTexture(512, 384, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, "#f7c46a");
    sky.addColorStop(1, "#c97b3a");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h * 0.7);
    c.fillStyle = "#ffe7b0";
    c.beginPath();
    c.arc(w * 0.68, h * 0.34, 42, 0, 7);
    c.fill();
    c.fillStyle = "#5a3418";
    c.beginPath();
    c.moveTo(0, h * 0.62);
    c.quadraticCurveTo(w * 0.3, h * 0.42, w * 0.62, h * 0.6);
    c.quadraticCurveTo(w * 0.8, h * 0.68, w, h * 0.58);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    c.fillStyle = "#3a2210";
    c.beginPath();
    c.moveTo(0, h * 0.78);
    c.quadraticCurveTo(w * 0.4, h * 0.66, w, h * 0.8);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
  });

/* pôster vintage de truco */
const TRUCO_POSTER_TEXTURE = () =>
  createCanvasTexture(320, 448, (c, w, h) => {
    c.fillStyle = "#e6d2a0";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i += 1) {
      c.globalAlpha = Math.random() * 0.08;
      c.fillStyle = "#6a4a24";
      c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    c.globalAlpha = 1;
    c.strokeStyle = "#5a3a1c";
    c.lineWidth = 10;
    c.strokeRect(14, 14, w - 28, h - 28);
    c.lineWidth = 3;
    c.strokeRect(28, 28, w - 56, h - 56);
    c.textAlign = "center";
    c.fillStyle = "#4a2a12";
    c.font = "900 64px Georgia, serif";
    c.fillText("TRUCO", w / 2, 130);
    c.font = "700 30px Georgia, serif";
    c.fillText("MINEIRO", w / 2, 175);
    c.font = "22px Georgia, serif";
    c.fillText("— SALOON —", w / 2, 230);
    c.fillText("★ ★ ★", w / 2, 285);
    c.font = "italic 20px Georgia, serif";
    c.fillText("desde 1895", w / 2, 380);
  });

/**
 * Saloon rústico (referência: bar western quente):
 * balcão com prateleiras iluminadas de garrafas, banquinhos redondos,
 * pendentes de cobre, poltrona vermelha e cadeira de vime junto a uma
 * janela com cortinas e raios de luz, quadros na parede e poeira no ar.
 */
export function createMonkeyBarEnvironment(floorY = 0): MonkeyBarEnvironment {
  const group = new THREE.Group();
  group.position.y = floorY;

  const addMesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    castShadow = true,
  ): THREE.Mesh => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = castShadow;
    object.receiveShadow = true;
    group.add(object);
    return object;
  };

  /* ---------- texturas ---------- */
  const floorTexture = createPlankTexture("#7a4e26", "#2e1a0a", 12);
  floorTexture.repeat.set(8, 12);
  const wallTexture = createPlankTexture("#5f3d20", "#241207", 16);
  wallTexture.repeat.set(8, 1);
  const ceilingTexture = createPlankTexture("#3d2513", "#180b04", 18);
  ceilingTexture.repeat.set(8, 10);
  const woodTexture = createPlankTexture("#6a4020", "#33190a", 8);
  const landscapeTexture = LANDSCAPE_TEXTURE();
  const posterTexture = TRUCO_POSTER_TEXTURE();

  /* ---------- salão ---------- */
  const ROOM_X = 16;
  const ROOM_Z = 26;
  const HEIGHT = 9;

  const floor = addMesh(
    new THREE.PlaneGeometry(ROOM_X * 2 + 4, ROOM_Z * 2 + 4),
    makeMaterial(0xffffff, { map: floorTexture, roughness: 0.6, flatShading: false }),
    0,
    0,
    0,
    false,
  );
  floor.rotation.x = -Math.PI / 2;

  const wallMaterial = makeMaterial(0xffffff, { map: wallTexture, roughness: 0.9, flatShading: false });
  addMesh(new THREE.PlaneGeometry(ROOM_X * 2 + 4, HEIGHT), wallMaterial, 0, HEIGHT / 2, -ROOM_Z, false);
  [-1, 1].forEach((side) => {
    const wall = addMesh(new THREE.PlaneGeometry(ROOM_Z * 2 + 4, HEIGHT), wallMaterial, side * ROOM_X, HEIGHT / 2, 0, false);
    wall.rotation.y = -side * Math.PI / 2;
  });
  const frontWall = addMesh(new THREE.PlaneGeometry(ROOM_X * 2 + 4, HEIGHT), wallMaterial, 0, HEIGHT / 2, ROOM_Z, false);
  frontWall.rotation.y = Math.PI;

  const ceiling = addMesh(
    new THREE.PlaneGeometry(ROOM_X * 2 + 4, ROOM_Z * 2 + 4),
    makeMaterial(0xffffff, { map: ceilingTexture, roughness: 1, flatShading: false }),
    0,
    HEIGHT - 0.05,
    0,
    false,
  );
  ceiling.rotation.x = Math.PI / 2;

  const beamMaterial = makeMaterial(0x2e1a0c);
  // vigas apenas no fundo do salão: perto da câmera cruzariam a visão
  [-22, -17, -12].forEach((z) => {
    addMesh(new THREE.BoxGeometry(ROOM_X * 2, 0.4, 0.4), beamMaterial, 0, HEIGHT - 0.45, z, false);
  });

  const woodMaterial = makeMaterial(0xffffff, { map: woodTexture, roughness: 0.55, flatShading: false });
  const darkWoodMaterial = makeMaterial(0x3a2210, { roughness: 0.7 });

  /* ---------- balcão (parede do fundo, à esquerda) ---------- */
  const BAR_X = -5; // centro do balcão em x
  const BAR_Z = -24.6;
  const BAR_LEN = 14;

  addMesh(new THREE.BoxGeometry(BAR_LEN, 1.12, 1.5), woodMaterial, BAR_X, 0.56, BAR_Z);
  addMesh(new THREE.BoxGeometry(BAR_LEN + 0.4, 0.09, 1.9), darkWoodMaterial, BAR_X, 1.16, BAR_Z + 0.1);
  // painel frontal com tábuas verticais
  for (let x = -BAR_LEN / 2 + 0.6; x < BAR_LEN / 2; x += 1.15) {
    addMesh(new THREE.BoxGeometry(0.95, 0.95, 0.06), darkWoodMaterial, BAR_X + x, 0.55, BAR_Z + 0.78, false);
  }
  // apoio de pés
  const footRail = addMesh(
    new THREE.CylinderGeometry(0.045, 0.045, BAR_LEN - 1, 8),
    makeMaterial(0x8a6a3a, { metalness: 0.6, roughness: 0.4 }),
    BAR_X,
    0.28,
    BAR_Z + 1.05,
    false,
  );
  footRail.rotation.z = Math.PI / 2;

  /* back-bar: armário + prateleiras com garrafas */
  addMesh(new THREE.BoxGeometry(BAR_LEN - 1, 1.0, 0.9), woodMaterial, BAR_X, 0.5, -25.5);
  const shelfYs = [2.3, 3.4];
  const bottleColors = [0xc86a2a, 0x9a5a20, 0x5a7a2a, 0x8a2a1a, 0xd9a03a, 0x4a6a3a];
  shelfYs.forEach((shelfY, shelfIndex) => {
    addMesh(new THREE.BoxGeometry(BAR_LEN - 1, 0.09, 0.55), woodMaterial, BAR_X, shelfY, -25.55);
    // fita de luz quente sob a prateleira
    addMesh(
      new THREE.BoxGeometry(BAR_LEN - 1.4, 0.03, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xffc06a, toneMapped: false }),
      BAR_X,
      shelfY - 0.06,
      -25.32,
      false,
    );
    for (let b = 0; b < 15; b += 1) {
      const height = 0.38 + Math.random() * 0.2;
      const color = bottleColors[(b + shelfIndex * 2) % bottleColors.length];
      const bottle = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, height, 10),
        makeMaterial(color, { transparent: true, opacity: 0.85, roughness: 0.15, emissive: color, emissiveIntensity: 0.12, flatShading: false }),
      );
      body.position.y = height / 2;
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.05, 0.15, 8),
        makeMaterial(color, { transparent: true, opacity: 0.85, flatShading: false }),
      );
      neck.position.y = height + 0.05;
      bottle.add(body, neck);
      bottle.position.set(BAR_X - (BAR_LEN - 2) / 2 + b * 0.88, shelfY + 0.05, -25.55);
      group.add(bottle);
    }
  });

  /* espelho e quadros acima do balcão */
  const mirror = addMesh(
    new THREE.PlaneGeometry(4.6, 2.4),
    makeMaterial(0x54432e, { metalness: 0.85, roughness: 0.18, flatShading: false }),
    BAR_X - 1,
    5.6,
    -25.9,
    false,
  );
  mirror.receiveShadow = false;
  addMesh(new THREE.BoxGeometry(4.9, 2.7, 0.07), darkWoodMaterial, BAR_X - 1, 5.6, -25.94, false);

  const landscape = addMesh(
    new THREE.PlaneGeometry(2.1, 1.55),
    makeMaterial(0xffffff, { map: landscapeTexture, roughness: 0.5, flatShading: false }),
    BAR_X + 5.4,
    5.6,
    -25.9,
    false,
  );
  landscape.receiveShadow = false;
  addMesh(new THREE.BoxGeometry(2.3, 1.75, 0.07), makeMaterial(0x8a6a34, { metalness: 0.4, roughness: 0.4 }), BAR_X + 5.4, 5.6, -25.94, false);

  /* pôster de truco na parede do fundo, à direita */
  const poster = addMesh(
    new THREE.PlaneGeometry(1.35, 1.9),
    makeMaterial(0xffffff, { map: posterTexture, roughness: 0.6, flatShading: false }),
    9,
    4.4,
    -25.9,
    false,
  );
  poster.receiveShadow = false;
  addMesh(new THREE.BoxGeometry(1.5, 2.05, 0.06), darkWoodMaterial, 9, 4.4, -25.94, false);

  /* porta na parede do fundo */
  addMesh(new THREE.BoxGeometry(1.5, 3.1, 0.1), makeMaterial(0x33200f, { roughness: 0.8 }), 4.5, 1.55, -25.92, false);
  addMesh(new THREE.BoxGeometry(1.7, 3.3, 0.06), darkWoodMaterial, 4.5, 1.6, -25.96, false);
  addMesh(new THREE.SphereGeometry(0.05, 8, 8), makeMaterial(0xc8a03a, { metalness: 0.7, roughness: 0.3 }), 4.0, 1.5, -25.84, false);

  /* ---------- banquinhos ---------- */
  const stoolSeat = makeMaterial(0x8a5a2c, { roughness: 0.5 });
  const stoolLeg = makeMaterial(0x3a2410, { roughness: 0.7 });
  [-10.5, -7, -3.5, 0, 3.5].forEach((x) => {
    const stool = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 16), stoolSeat);
    seat.position.y = 0.82;
    seat.castShadow = true;
    stool.add(seat);
    for (let l = 0; l < 4; l += 1) {
      const angle = (l / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.82, 6), stoolLeg);
      leg.position.set(Math.cos(angle) * 0.24, 0.4, Math.sin(angle) * 0.24);
      leg.rotation.z = Math.cos(angle) * 0.12;
      leg.rotation.x = -Math.sin(angle) * 0.12;
      leg.castShadow = true;
      stool.add(leg);
    }
    const ringT = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 6, 16), stoolLeg);
    ringT.rotation.x = Math.PI / 2;
    ringT.position.y = 0.32;
    stool.add(ringT);
    stool.position.set(x, 0, BAR_Z + 1.9);
    group.add(stool);
  });

  /* canecas e garrafas sobre o balcão */
  const mug = (x: number, z: number): void => {
    const mugGroup = new THREE.Group();
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.26, 12),
      makeMaterial(0xfef3c7, { transparent: true, opacity: 0.85, roughness: 0.15, flatShading: false }),
    );
    glass.position.y = 0.13;
    const drink = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.105, 0.18, 12),
      makeMaterial(0xe8a02a, { flatShading: false, emissive: 0x7c3a00 }),
    );
    drink.position.y = 0.11;
    const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.045, 12), makeMaterial(0xfff8e8, { flatShading: false }));
    foam.position.y = 0.25;
    mugGroup.add(glass, drink, foam);
    mugGroup.position.set(x, 1.21, z);
    group.add(mugGroup);
  };
  mug(BAR_X - 4, BAR_Z + 0.3);
  mug(BAR_X - 1.2, BAR_Z + 0.5);
  mug(BAR_X + 2.2, BAR_Z + 0.2);
  [BAR_X + 4.2, BAR_X + 4.7, BAR_X + 4.45].forEach((x, i) => {
    const h = 0.34 + (i % 2) * 0.1;
    addMesh(
      new THREE.CylinderGeometry(0.08, 0.08, h, 10),
      makeMaterial(bottleColors[i % bottleColors.length], { transparent: true, opacity: 0.85, roughness: 0.15, flatShading: false }),
      x,
      1.21 + h / 2,
      BAR_Z + (i % 2) * 0.35 - 0.2,
    );
  });

  /* tonel */
  const barrel = (x: number, z: number): void => {
    addMesh(new THREE.CylinderGeometry(0.62, 0.62, 1.3, 14), woodMaterial, x, 0.65, z);
    [0.3, 1.0].forEach((y) =>
      addMesh(new THREE.CylinderGeometry(0.64, 0.64, 0.07, 14), makeMaterial(0x555555, { metalness: 0.7 }), x, y, z, false),
    );
  };
  barrel(-13.2, -22.8);
  barrel(13.8, -16.5);

  /* ---------- pendentes de cobre ---------- */
  const pendants: THREE.Group[] = [];
  const pendant = (x: number, z: number, cordLength: number): void => {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, HEIGHT - 0.2, z);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, cordLength, 6), new THREE.MeshBasicMaterial({ color: 0x1a120a }));
    cord.position.y = -cordLength / 2;
    const shade = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2.6),
      makeMaterial(0xb0703a, { metalness: 0.55, roughness: 0.4, side: THREE.DoubleSide, flatShading: false }),
    );
    shade.rotation.x = Math.PI;
    shade.position.y = -cordLength;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a8 }));
    glow.position.y = -cordLength - 0.18;
    const light = new THREE.PointLight(0xffc87a, 26, 12, 2);
    light.position.y = -cordLength - 0.25;
    lampGroup.add(cord, shade, glow, light);
    group.add(lampGroup);
    pendants.push(lampGroup);
  };
  pendant(BAR_X - 4.5, BAR_Z + 0.6, 4.4);
  pendant(BAR_X, BAR_Z + 0.6, 4.4);
  pendant(BAR_X + 4.5, BAR_Z + 0.6, 4.4);
  pendant(2.4, 1.2, 3.1); // sobre a mesa de truco

  /* ---------- canto de leitura: janela, poltronas, mesa lateral ---------- */
  const WINDOW_Z = -12;
  const windowPane = addMesh(
    new THREE.PlaneGeometry(2.6, 3),
    new THREE.MeshBasicMaterial({ color: 0xf3d49a, toneMapped: true }),
    ROOM_X - 0.08,
    3.8,
    WINDOW_Z,
    false,
  );
  windowPane.rotation.y = -Math.PI / 2;
  // caixilho
  const frameMaterial = makeMaterial(0x3a2410, { roughness: 0.7 });
  [
    [ROOM_X - 0.12, 5.35, WINDOW_Z, 0.12, 0.14, 2.9],
    [ROOM_X - 0.12, 2.25, WINDOW_Z, 0.12, 0.14, 2.9],
    [ROOM_X - 0.12, 3.8, WINDOW_Z - 1.32, 0.12, 3.25, 0.14],
    [ROOM_X - 0.12, 3.8, WINDOW_Z + 1.32, 0.12, 3.25, 0.14],
    [ROOM_X - 0.12, 3.8, WINDOW_Z, 0.1, 3.1, 0.08],
  ].forEach(([x, y, z, sx, sy, sz]) => addMesh(new THREE.BoxGeometry(sx, sy, sz), frameMaterial, x, y, z, false));
  // cortinas
  const curtainMaterial = makeMaterial(0xb99b72, { roughness: 1, flatShading: false });
  [-1, 1].forEach((side) => {
    const curtain = addMesh(new THREE.BoxGeometry(0.22, 3.5, 0.7), curtainMaterial, ROOM_X - 0.3, 3.8, WINDOW_Z + side * 1.75, false);
    curtain.rotation.x = side * 0.06;
  });

  /* raios de luz da janela */
  const rayMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdf9e,
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const godRays: THREE.Mesh[] = [];
  [
    [ROOM_X - 0.4, 4.6, WINDOW_Z - 0.5, 6.5, 0.3, -7.5],
    [ROOM_X - 0.4, 3.6, WINDOW_Z + 0.7, 5.5, 0.1, -5.5],
  ].forEach(([sx, sy, sz, ex, ey, ez]) => {
    const from = new THREE.Vector3(sx, sy, sz);
    const to = new THREE.Vector3(ex, ey, ez);
    const length = from.distanceTo(to);
    const ray = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.6, length, 10, 1, true), rayMaterial.clone());
    ray.position.copy(from).add(to).multiplyScalar(0.5);
    ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), from.clone().sub(to).normalize());
    group.add(ray);
    godRays.push(ray);
  });
  const windowLight = new THREE.PointLight(0xffe6b8, 35, 22, 2);
  windowLight.position.set(ROOM_X - 1.2, 4.2, WINDOW_Z);
  group.add(windowLight);

  /* poltrona vermelha */
  const armchair = new THREE.Group();
  const redFabric = makeMaterial(0x7a241c, { roughness: 0.95, flatShading: false });
  const redCushion = makeMaterial(0x93302a, { roughness: 0.95, flatShading: false });
  const addBox = (parent: THREE.Group, material: THREE.Material, px: number, py: number, pz: number, sx: number, sy: number, sz: number): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    m.position.set(px, py, pz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
  };
  addBox(armchair, redFabric, 0, 0.28, 0, 1.05, 0.5, 0.95);
  addBox(armchair, redCushion, 0, 0.56, 0.05, 0.95, 0.14, 0.85);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.3, 0.24), redFabric);
  chairBack.position.set(0, 1.05, -0.42);
  chairBack.rotation.x = -0.12;
  chairBack.castShadow = true;
  armchair.add(chairBack);
  addBox(armchair, redFabric, -0.56, 0.62, 0, 0.2, 0.42, 0.9);
  addBox(armchair, redFabric, 0.56, 0.62, 0, 0.2, 0.42, 0.9);
  armchair.position.set(11.8, 0, -13.5);
  armchair.rotation.y = 0.6;
  group.add(armchair);

  /* cadeira de vime */
  const wicker = new THREE.Group();
  const wickerMaterial = makeMaterial(0xa9825a, { roughness: 0.9 });
  addBox(wicker, wickerMaterial, 0, 0.3, 0, 0.8, 0.08, 0.8);
  addBox(wicker, wickerMaterial, 0, 0.45, 0.02, 0.72, 0.22, 0.72);
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => addBox(wicker, wickerMaterial, sx * 0.33, 0.15, sz * 0.33, 0.07, 0.3, 0.07));
  });
  const wickerBack = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 14, Math.PI), wickerMaterial);
  wickerBack.position.set(0, 0.62, -0.36);
  wickerBack.castShadow = true;
  wicker.add(wickerBack);
  const wickerBackLow = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.06), wickerMaterial);
  wickerBackLow.position.set(0, 0.62, -0.36);
  wicker.add(wickerBackLow);
  wicker.position.set(13.6, 0, -9.8);
  wicker.rotation.y = -0.5;
  group.add(wicker);

  /* mesa lateral com garrafa */
  addMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), woodMaterial, 12.9, 0.72, -11.6);
  addMesh(new THREE.CylinderGeometry(0.05, 0.07, 0.72, 8), darkWoodMaterial, 12.9, 0.36, -11.6);
  addMesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.4, 10),
    makeMaterial(0x8a2a1a, { transparent: true, opacity: 0.85, roughness: 0.15, flatShading: false }),
    12.9,
    0.95,
    -11.6,
  );
  // tapete
  const rug = addMesh(new THREE.CircleGeometry(2.2, 24), makeMaterial(0x5a2020, { roughness: 1 }), 12.6, 0.012, -11.8, false);
  rug.rotation.x = -Math.PI / 2;

  /* ---------- poeira no ar ---------- */
  const DUST_COUNT = 200;
  const dustPositions = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i += 1) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 26;
    dustPositions[i * 3 + 1] = Math.random() * 7;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 34;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({ color: 0xffe6b0, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  group.add(dust);

  /* ---------- luzes do salão ---------- */
  group.add(new THREE.HemisphereLight(0xffe2b8, 0x3a2412, 1.25));

  const sunThroughWindow = new THREE.DirectionalLight(0xffd9a8, 1.5);
  sunThroughWindow.position.set(14, 7, WINDOW_Z);
  sunThroughWindow.target.position.set(0, 0, -3);
  group.add(sunThroughWindow, sunThroughWindow.target);

  const spot = new THREE.SpotLight(0xffedc9, 380, 55, Math.PI / 3.4, 0.65, 1.6);
  spot.position.set(0, 9.5, 2);
  spot.target.position.set(0, 2.2, 0.5);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0004;
  group.add(spot, spot.target);

  /* ---------- animação ---------- */
  const update = (elapsed: number): void => {
    pendants.forEach((lampGroup, index) => {
      lampGroup.rotation.z = Math.sin(elapsed * 0.9 + index * 1.7) * 0.018;
      lampGroup.rotation.x = Math.cos(elapsed * 0.7 + index * 2.3) * 0.014;
    });
    godRays.forEach((ray, index) => {
      (ray.material as THREE.MeshBasicMaterial).opacity = 0.045 + Math.sin(elapsed * 0.6 + index * 1.9) * 0.012;
    });

    const positions = dustGeometry.attributes.position as THREE.BufferAttribute;
    const array = positions.array as Float32Array;
    for (let i = 1; i < DUST_COUNT * 3; i += 3) {
      array[i] -= 0.003;
      if (array[i] < 0) array[i] = 7;
    }
    positions.needsUpdate = true;
  };

  const dispose = (): void => {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          const standard = material as THREE.MeshStandardMaterial;
          standard.map?.dispose();
          material.dispose();
        });
      }
    });
  };

  return { group, update, dispose };
}
