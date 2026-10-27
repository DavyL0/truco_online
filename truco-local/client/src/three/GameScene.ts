import * as THREE from "three";
import type { GameState } from "@/types/game";
import { createCardTexture } from "@/three/createCardTexture";
import { createMonkeyChair, type MonkeyChair } from "@/three/createMonkeyChair";
import { createMonkeyBarEnvironment, type MonkeyBarEnvironment } from "@/three/createMonkeyBarEnvironment";

interface SceneCharacter {
  rel: number;
  group: THREE.Group;
  model: MonkeyChair;
}

interface RelativePlayer {
  isMe: boolean;
}

interface CardTarget {
  p: [number, number, number];
  rx: number;
  ry: number;
  rz: number;
  face: string | null;
  hand: boolean;
}

interface GameSceneOptions {
  onPick: (card: string) => void;
}

const WORLD_SCALE = 0.6;
const TABLE_TOP = 2.6; // metade da altura dos personagens (5.2)

const CHARACTER_SPECS = [
  { rel: 0, position: [0, -0.42, 6] as const, rotationY: Math.PI },
  { rel: 2, position: [0, -0.42, -6] as const, rotationY: 0 },
  { rel: 1, position: [-6, -0.42, 0] as const, rotationY: Math.PI / 2 },
  { rel: 3, position: [6, -0.42, 0] as const, rotationY: -Math.PI / 2 },
];

const TABLE_SPOTS = [
  [0.3, 1.7],
  [-2.2, 0.1],
  [0.3, -1.4],
  [2.4, 0.1],
].map(([x, z]) => [x * WORLD_SCALE, z * WORLD_SCALE]);

export class GameScene {
  private readonly host: HTMLElement;
  private readonly options: GameSceneOptions;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly characters: SceneCharacter[] = [];
  private readonly planeGeometry = new THREE.PlaneGeometry(1.15, 1.6);
  private readonly textures = new Map<string, THREE.CanvasTexture>();
  private readonly objects = new Map<string, THREE.Group>();
  private hover: string | null = null;
  private interactionEnabled = false;
  private animationFrame = 0;
  private readonly clock = new THREE.Clock();
  private readonly environment: MonkeyBarEnvironment;

  constructor(host: HTMLElement, options: GameSceneOptions) {
    this.host = host;
    this.options = options;
    this.canvas = document.createElement("canvas");
    this.host.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.scene.background = new THREE.Color(0x0d0703);
    this.scene.fog = new THREE.FogExp2(0x160d06, 0.014);

    this.environment = createMonkeyBarEnvironment(-0.42);
    this.scene.add(this.environment.group);
    this.configureTable();
    this.configureCharacters();
    this.fit();
    window.addEventListener("resize", this.fit);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.startLoop();
  }

  sync(state: GameState | null, mySeat: number): void {
    if (!state?.hands) return;

    const totalPlayers = state.n;
    const safeMySeat = Math.max(mySeat, 0);
    const relativePlayers: Array<RelativePlayer | null> = Array(4).fill(null);

    for (let seat = 0; seat < totalPlayers; seat += 1) {
      const relativeSeat = this.direction((seat - safeMySeat + totalPlayers) % totalPlayers, totalPlayers);
      relativePlayers[relativeSeat] = { isMe: seat === mySeat };
    }

    this.syncCharacters(relativePlayers);

    const wantedCards: Record<string, CardTarget> = {};
    for (let seat = 0; seat < totalPlayers; seat += 1) {
      const relativeSeat = this.direction((seat - safeMySeat + totalPlayers) % totalPlayers, totalPlayers);
      const hand = state.hands[seat] ?? [];
      const isMe = seat === mySeat;
      const character = this.characters.find((item) => item.rel === relativeSeat);
      if (!character) {
        throw new Error(`Personagem da posição relativa ${relativeSeat} não encontrado.`);
      }

      hand.forEach((card, index) => {
        const offset = index - (hand.length - 1) / 2;
        const key = isMe ? card : `h${seat}${index}`;
        wantedCards[key] = isMe
          ? this.createOwnCardTarget(card, offset)
          : this.createOpponentCardTarget(offset, hand.length, character);
      });
    }

    (state.table ?? []).forEach((entry, index) => {
      const relativeSeat = this.direction((entry.s - safeMySeat + totalPlayers) % totalPlayers, totalPlayers);
      const spot = TABLE_SPOTS[relativeSeat];
      wantedCards[entry.c] = {
        p: [spot[0], TABLE_TOP + 0.06 + index * 0.01, spot[1]],
        rx: -Math.PI / 2,
        ry: relativeSeat % 2 ? 0.35 : relativeSeat === 0 ? 0.12 : -0.1,
        rz: 0,
        face: entry.c,
        hand: false,
      };
    });

    this.syncCardObjects(wantedCards);
  }

  setHover(card: string | null): void {
    this.hover = card;
    this.canvas.style.cursor = card ? "pointer" : "default";
  }

  setInteractionEnabled(enabled: boolean): void {
    this.interactionEnabled = enabled;
    if (!enabled) this.setHover(null);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.fit);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.environment.dispose();
    this.renderer.dispose();
    this.planeGeometry.dispose();
    this.textures.forEach((texture) => texture.dispose());
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.canvas.remove();
  }

  private configureTable(): void {
    const textureLoader = new THREE.TextureLoader();
    const tableTexture = textureLoader.load("/texture/fundo_mesa.jpg");
    tableTexture.wrapS = THREE.RepeatWrapping;
    tableTexture.wrapT = THREE.RepeatWrapping;
    tableTexture.repeat.set(2, 2);

    const tableRadius = 8.8 * WORLD_SCALE;
    const tableMaterial = new THREE.MeshStandardMaterial({ map: tableTexture, roughness: 0.85 });

    // tampo: metade da altura dos personagens (5.2)
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(tableRadius, tableRadius - 0.3, 0.18, 64),
      tableMaterial,
    );
    top.scale.z = 0.8;
    top.position.y = TABLE_TOP - 0.09;
    top.receiveShadow = true;
    top.castShadow = true;
    this.scene.add(top);

    // pedestal de madeira: coluna estreita + base no chão (y=-0.42)
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x7a4f28, roughness: 0.75 });
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.8, TABLE_TOP - 0.24, 32),
      woodMaterial,
    );
    column.position.y = (TABLE_TOP - 0.24) / 2 - 0.42 + 0.05;
    column.receiveShadow = true;
    column.castShadow = true;
    this.scene.add(column);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.5, 0.22, 32),
      woodMaterial,
    );
    base.position.y = -0.42 + 0.11;
    base.receiveShadow = true;
    base.castShadow = true;
    this.scene.add(base);

    const borderTexture = textureLoader.load("/texture/borda_mesa.jpg");
    borderTexture.wrapS = THREE.RepeatWrapping;
    borderTexture.wrapT = THREE.RepeatWrapping;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(tableRadius - 0.05, 0.22, 16, 64),
      new THREE.MeshStandardMaterial({ map: borderTexture, roughness: 0.5 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.scale.y = 0.8;
    rim.position.y = TABLE_TOP - 0.06;
    rim.receiveShadow = true;
    this.scene.add(rim);
  }

  private configureCharacters(): void {
    CHARACTER_SPECS.forEach((spec) => {
      const group = new THREE.Group();
      group.position.set(spec.position[0], spec.position[1], spec.position[2]);
      group.rotation.y = spec.rotationY;
      group.visible = false;
      this.scene.add(group);

      const model = this.createScaledModel();
      group.add(model);
      this.characters.push({ rel: spec.rel, group, model });
    });
  }

  private createScaledModel(): MonkeyChair {
    const model = createMonkeyChair();
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 5.2 / (size.y || 1);
    model.scale.setScalar(scale);
    // alinha pela base (pés da cadeira) para ficar em cima do chão
    model.position.y = -bounds.min.y * scale;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return model;
  }

  private direction(relativeSeat: number, totalPlayers: number): number {
    return totalPlayers === 2 ? [0, 2][relativeSeat] : relativeSeat;
  }

  private syncCharacters(relativePlayers: Array<RelativePlayer | null>): void {
    this.characters.forEach((character) => {
      const player = relativePlayers[character.rel];
      character.group.visible = Boolean(player && !player.isMe);
    });
  }

  private createOwnCardTarget(card: string, offset: number): CardTarget {
    return {
      p: [offset * 1.35 * WORLD_SCALE, TABLE_TOP + 0.3, 5.0],
      rx: -1,
      ry: 0,
      rz: 0,
      face: card,
      hand: true,
    };
  }

  private createOpponentCardTarget(
    offset: number,
    cardCount: number,
    character: SceneCharacter,
  ): CardTarget {
    character.model.setGrip(cardCount);
    character.group.updateMatrixWorld(true);

    const center = new THREE.Vector3();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      character.group.getWorldQuaternion(new THREE.Quaternion()),
    );
    character.model.cardAnchor.getWorldPosition(center);
    center.addScaledVector(right, offset * 0.68);
    center.y += Math.abs(offset) * 0.05;

    return {
      p: [center.x, center.y, center.z],
      rx: -0.22,
      ry: character.group.rotation.y,
      rz: -offset * 0.1,
      face: null,
      hand: false,
    };
  }

  private syncCardObjects(wantedCards: Record<string, CardTarget>): void {
    for (const [key, card] of this.objects) {
      if (!wantedCards[key]) {
        this.scene.remove(card);
        this.objects.delete(key);
      }
    }

    for (const [key, target] of Object.entries(wantedCards)) {
      let card = this.objects.get(key);
      if (!card) {
        card = this.createCard(key, target.face);
        this.objects.set(key, card);
      }
      card.userData.target = target;
      card.userData.hand = target.hand;
    }
  }

  private createCard(key: string, face: string | null): THREE.Group {
    const group = new THREE.Group();
    const front = new THREE.Mesh(
      this.planeGeometry,
      new THREE.MeshStandardMaterial({ map: this.texture(face ?? "back") }),
    );
    const back = new THREE.Mesh(
      this.planeGeometry,
      new THREE.MeshStandardMaterial({ map: this.texture("back") }),
    );
    back.rotation.y = Math.PI;
    front.position.z = 0.01;
    back.position.z = -0.01;
    group.add(front, back);
    group.rotation.order = "YXZ";
    group.position.set(0, 1, 0);
    group.rotation.x = -Math.PI / 2;
    group.userData = { key, hand: false };
    this.scene.add(group);
    return group;
  }

  private texture(card: string): THREE.CanvasTexture {
    const cached = this.textures.get(card);
    if (cached) return cached;
    const texture = createCardTexture(card);
    this.textures.set(card, texture);
    return texture;
  }

  private readonly fit = (): void => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // em telas estreitas, abre o FOV em vez de afastar demais a câmera
    this.camera.fov = this.camera.aspect >= 1 ? 45 : Math.min(64, 45 / Math.sqrt(this.camera.aspect));
    const factor = Math.max(1, 0.95 / this.camera.aspect);
    const camY = Math.min(6.4 * factor, 8); // permanece abaixo do teto
    this.camera.position.set(0, camY, 9.6 * factor);
    this.camera.lookAt(0, 1.3, 0);
    this.camera.updateProjectionMatrix();
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.interactionEnabled) {
      this.setHover(null);
      return;
    }
    this.setHover(this.pick(event));
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.interactionEnabled) return;
    const card = this.pick(event);
    if (card) {
      this.setHover(null);
      this.options.onPick(card);
    }
  };

  private pick(event: PointerEvent): string | null {
    const bounds = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const selectable = [...this.objects.values()].filter((object) => object.userData.hand);
    const intersections = raycaster.intersectObjects(selectable, true);
    if (!intersections.length) return null;

    let object: THREE.Object3D | null = intersections[0].object;
    while (object && !object.userData.key) object = object.parent;
    return object?.userData.key ?? null;
  }

  private startLoop(): void {
    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      this.environment.update(this.clock.elapsedTime, delta);
      this.updateCards();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private updateCards(): void {
    this.objects.forEach((group, key) => {
      const target = group.userData.target as CardTarget | undefined;
      if (!target) return;
      const position = new THREE.Vector3(...target.p);
      if (this.hover === key) {
        position.y += 0.3;
        position.z -= 0.36;
      }
      group.position.lerp(position, 0.14);
      group.rotation.x += (target.rx - group.rotation.x) * 0.14;
      group.rotation.y += (target.ry - group.rotation.y) * 0.14;
      group.rotation.z += (target.rz - group.rotation.z) * 0.14;
    });
  }
}
