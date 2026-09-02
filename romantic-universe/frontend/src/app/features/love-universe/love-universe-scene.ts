import * as THREE from 'three';
import { detectUniverseQuality, PhotoOrbData, UniverseQuality } from './universe-quality';
import { UniverseStarfield } from './universe-starfield';
import { getImageFallbacks } from '../../core/utils/image-fallback';
interface PhotoOrb {
  group: THREE.Group;
  mesh: THREE.Mesh;
  frameMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  id: number;
  title?: string;
  proximity: number;
  depth: 'far' | 'mid' | 'near' | 'foreground';
  parallax: number;
  baseScale: number;
  drift: {
    phaseX: number;
    phaseY: number;
    phaseZ: number;
    speedX: number;
    speedY: number;
    speedZ: number;
    ampX: number;
    ampY: number;
    ampZ: number;
    rotSpeedX: number;
    rotSpeedY: number;
    rotSpeedZ: number;
    rotPhase: number;
  };
  baseRotation: THREE.Euler;
  faceYaw: number;
  isPrimary: boolean;
  shadowMesh?: THREE.Mesh;
}

function organicDrift(t: number, phase: number, speed: number, amp: number): number {
  return (
    Math.sin(t * speed + phase) * amp * 0.42 +
    Math.sin(t * speed * 0.31 + phase * 1.6) * amp * 0.33 +
    Math.sin(t * speed * 0.11 + phase * 2.4) * amp * 0.25
  );
}

interface WarmSpot {
  position: THREE.Vector3;
  strength: number;
  started: number;
}

interface UniverseRipple {
  nx: number;
  ny: number;
  start: number;
  duration: number;
}

interface MemoryAfterglow {
  mesh: THREE.Mesh;
  started: number;
  position: THREE.Vector3;
}

export class LoveUniverseScene {
  private readonly container: HTMLElement;
  private readonly reducedMotion: boolean;
  private readonly quality: UniverseQuality;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId = 0;
  private clock = new THREE.Clock();
  private running = false;
  private visible = true;

  private hearts: THREE.Mesh[] = [];
  private petals: THREE.Mesh[] = [];
  private starfield!: UniverseStarfield;
  private dustPoints!: THREE.Points;
  private nebulaMesh?: THREE.Mesh;
  private hazeMesh?: THREE.Mesh;
  private photoOrbs: PhotoOrb[] = [];
  private textureLoader = new THREE.TextureLoader();

  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;
  private scrollProgress = 0;
  private focusOrb: PhotoOrb | null = null;
  private focusAmount = 0;
  private ambientTimeScale = 1;
  private targetTimeScale = 1;
  private warmSpots: WarmSpot[] = [];
  private ripples: UniverseRipple[] = [];
  private discoveryProximity = 0;
  private cherishedOrbId: number | null = null;
  private isTouchDevice = false;
  private driftIntensity = 1;
  private targetDriftIntensity = 1;
  private lastCameraPos = new THREE.Vector3();
  private prevCameraPos = new THREE.Vector3();
  private memoryAfterglows: MemoryAfterglow[] = [];
  private primaryOrb: PhotoOrb | null = null;
  private primaryLight?: THREE.PointLight;
  private discoveryChoreography = 0;
  private discoveryChoreographyActive = false;
  private cameraResting = false;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerDown = { x: 0, y: 0 };

  private cameraBaseZ = 12;
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private entering = false;
  private entryProgress = 0;
  private onPhotoDiscovered?: (id: number, title?: string) => void;
  private cameraMotion: {
    fromZ: number;
    toZ: number;
    lookAt: THREE.Vector3;
    progress: number;
    duration: number;
    resolve?: () => void;
  } | null = null;

  private onMouseMove = (e: MouseEvent | TouchEvent): void => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    this.updatePointerFromClient(x, y);
    this.targetMouseX = this.pointer.x;
    this.targetMouseY = this.pointer.y;
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDown.x = e.clientX;
    this.pointerDown.y = e.clientY;
    this.updatePointerFromClient(e.clientX, e.clientY);
    if (e.pointerType === 'touch') {
      this.isTouchDevice = true;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.button !== 0) return;

    const dx = e.clientX - this.pointerDown.x;
    const dy = e.clientY - this.pointerDown.y;
    if (dx * dx + dy * dy > 144) return;

    this.updatePointerFromClient(e.clientX, e.clientY);
    const hit = this.pickPhoto();
    if (!hit && e.pointerType === 'touch') {
      this.spawnTouchRipple(e.clientX, e.clientY);
    }
  };

  private updatePointerFromClient(clientX: number, clientY: number): void {
    const rect = this.renderer?.domElement?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const dpr = Math.min(window.devicePixelRatio, this.quality.maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.starfield?.setPixelRatio(dpr);
  };
  constructor(container: HTMLElement, reducedMotion = false) {
    this.container = container;
    this.reducedMotion = reducedMotion;
    this.quality = detectUniverseQuality(reducedMotion);
    this.isTouchDevice = 'ontouchstart' in window;
  }

  /** Slow the universe — memory moments feel like time stopping. */
  beginTimeStop(): void {
    this.targetTimeScale = 0.14;
    this.starfield?.setIntensity(0.78);
  }

  endTimeStop(_gradualMs = 1800): void {
    this.targetTimeScale = 1;
    this.starfield?.setIntensity(1);
  }

  addWarmAfterimage(x: number, y: number, z: number): void {
    this.warmSpots.push({
      position: new THREE.Vector3(x, y, z),
      strength: 1,
      started: performance.now()
    });
    if (this.warmSpots.length > 6) this.warmSpots.shift();
    this.starfield?.pulseAt(x, y, z, 0.28);
  }
  spawnTouchRipple(clientX: number, clientY: number): void {
    if (this.reducedMotion) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.ripples.push({
      nx,
      ny,
      start: performance.now(),
      duration: 900
    });
    if (this.ripples.length > 4) this.ripples.shift();
  }

  getDiscoveryProximity(): number {
    return this.discoveryProximity;
  }

  highlightCherishedDiscovery(type: string, referenceId: number | string): void {
    if (type === 'photo' && typeof referenceId === 'number') {
      this.cherishedOrbId = referenceId;
      const orb = this.photoOrbs.find(o => o.id === referenceId);
      if (orb) {
        const pos = orb.group.position;
        this.starfield?.markMemory(pos.x, pos.y, pos.z);
      }
    }
  }

  init(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050308, 0.028);
    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 160);
    this.camera.position.set(0, 0, this.cameraBaseZ);
    this.lastCameraPos.copy(this.camera.position);
    this.prevCameraPos.copy(this.camera.position);

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality.tier !== 'low',
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxDpr));
    this.renderer.setClearColor(0x050308, 1);
    this.renderer.domElement.classList.add('love-universe-canvas');
    this.container.appendChild(this.renderer.domElement);

    if (this.quality.enableNebula) {
      this.addNebula();
      this.addAtmosphericHaze();
    }
    this.addLights();
    this.addStars();
    this.addDust();
    if (this.quality.heartCount > 0) {
      this.addHearts();
    }
    this.addPetals();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onMouseMove, { passive: true });
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'manipulation';
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
  }

  async loadPhotos(photos: PhotoOrbData[]): Promise<void> {
    const slice = photos.slice(0, this.quality.maxPhotos);
    const clusterAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < slice.length; i++) {
      const photo = slice[i];
      const orb = await this.createPhotoOrb(photo, i, slice.length, clusterAngle);
      if (orb) {
        this.photoOrbs.push(orb);
        this.scene.add(orb.group);
        if (orb.isPrimary) {
          this.primaryOrb = orb;
        }
      }
    }
  }

  setScrollProgress(progress: number): void {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
  }

  setPhotoDiscoverHandler(handler: (id: number, title?: string) => void): void {
    this.onPhotoDiscovered = handler;
  }

  playEntryFromVoid(): void {
    this.entering = true;
    this.entryProgress = 0;
    this.camera.position.z = 26;
    this.starfield?.beginReveal();
  }
  approach(target: { x: number; y: number; z: number }, durationMs = 2000): Promise<void> {
    return new Promise(resolve => {
      this.cameraMotion = {
        fromZ: this.camera.position.z,
        toZ: 7,
        lookAt: new THREE.Vector3(target.x, target.y, target.z),
        progress: 0,
        duration: durationMs / 1000,
        resolve
      };
    });
  }

  pullBack(durationMs = 2200): Promise<void> {
    return new Promise(resolve => {
      this.cameraMotion = {
        fromZ: this.camera.position.z,
        toZ: this.cameraBaseZ - this.scrollProgress * 4,
        lookAt: this.cameraTarget.clone(),
        progress: 0,
        duration: durationMs / 1000,
        resolve
      };
      this.focusOrb = null;
    });
  }

  focusPhotoById(photoId: number, durationMs = 1800): Promise<void> {
    const orb = this.photoOrbs.find(o => o.id === photoId);
    if (!orb) return Promise.resolve();
    const pos = orb.group.position;
    this.focusOrb = orb;
    return this.approach({ x: pos.x, y: pos.y, z: pos.z }, durationMs);
  }

  returnToUniverse(durationMs = 2000): Promise<void> {
    return this.pullBack(durationMs);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.animate();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible && !this.running) {
      this.start();
    }
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onMouseMove);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);

    if (this.starfield) {
      this.scene.remove(this.starfield.points);
      this.scene.remove(this.starfield.foregroundPoints);
      this.starfield.dispose();
    }

    for (const g of this.memoryAfterglows) {
      this.scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      (g.mesh.material as THREE.Material).dispose();
    }
    this.memoryAfterglows = [];

    this.scene.traverse(obj => {
      if (obj === this.starfield?.points || obj === this.starfield?.foregroundPoints) return;
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach(m => {
            if ('map' in m && m.map) (m.map as THREE.Texture).dispose();
            m.dispose();
          });
        } else {
          if ('map' in mat && mat.map) (mat.map as THREE.Texture).dispose();
          mat.dispose();
        }
      }
      if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private addNebula(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(180, 200, 0, 256, 256, 280);
    grad.addColorStop(0, 'rgba(72, 38, 58, 0.28)');
    grad.addColorStop(0.35, 'rgba(48, 24, 42, 0.12)');
    grad.addColorStop(0.7, 'rgba(28, 14, 32, 0.05)');
    grad.addColorStop(1, 'rgba(5, 3, 8, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.SphereGeometry(48, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    this.nebulaMesh = new THREE.Mesh(geo, mat);
    this.nebulaMesh.position.set(9, -2.5, -14);
    this.nebulaMesh.renderOrder = -2;
    this.scene.add(this.nebulaMesh);
  }

  private addAtmosphericHaze(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, 'rgba(5, 3, 8, 0)');
    grad.addColorStop(0.45, 'rgba(32, 18, 28, 0.08)');
    grad.addColorStop(0.75, 'rgba(48, 26, 38, 0.13)');
    grad.addColorStop(1, 'rgba(20, 10, 18, 0.17)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.SphereGeometry(55, 24, 24);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.52,
      depthWrite: false
    });
    this.hazeMesh = new THREE.Mesh(geo, mat);
    this.hazeMesh.position.set(-6, 1, -10);
    this.hazeMesh.renderOrder = -3;
    this.scene.add(this.hazeMesh);
  }

  private addLights(): void {
    this.scene.add(new THREE.AmbientLight(0xf5f0e8, 0.25));

    const key = new THREE.PointLight(0xc9a0a8, 0.9, 50);
    key.position.set(4, 3, 6);
    this.scene.add(key);

    const fill = new THREE.PointLight(0x9a8fa8, 0.5, 40);
    fill.position.set(-5, -2, 4);
    this.scene.add(fill);

    const rim = new THREE.PointLight(0xc4b08a, 0.35, 35);
    rim.position.set(0, 5, -3);
    this.scene.add(rim);
  }

  private addStars(): void {
    this.starfield = new UniverseStarfield({
      tier: this.quality.tier,
      reducedMotion: this.reducedMotion
    });
    this.starfield.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxDpr));
    this.scene.add(this.starfield.points);
    this.scene.add(this.starfield.foregroundPoints);
  }

  setStarfieldIntensity(value: number): void {
    this.starfield?.setIntensity(value);
  }

  setDriftIntensity(value: number): void {
    this.targetDriftIntensity = THREE.MathUtils.clamp(value, 0.08, 1);
  }

  cueIntroStillness(): void {
    this.setDriftIntensity(0.18);
    this.starfield?.setIntensity(0.88);
  }

  resumeAmbientMotion(): void {
    this.setDriftIntensity(1);
    this.starfield?.setIntensity(1);
  }

  beginDiscoveryChoreography(): void {
    if (!this.primaryOrb) return;
    this.discoveryChoreographyActive = true;
    this.discoveryChoreography = 0;
    const pos = this.primaryOrb.group.position;
    this.starfield?.pulseAt(pos.x, pos.y, pos.z, 0.22);
    window.setTimeout(() => {
      if (this.primaryOrb) {
        const p = this.primaryOrb.group.position;
        this.starfield?.pulseAt(p.x, p.y, p.z, 0.38);
      }
    }, 1400);
    window.setTimeout(() => {
      if (this.primaryOrb) {
        const p = this.primaryOrb.group.position;
        this.starfield?.pulseAt(p.x, p.y, p.z, 0.28);
      }
    }, 2800);
  }
  private addDust(): void {
    const count = this.quality.dustCount;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      color: 0xc9a0a8,
      transparent: true,
      opacity: 0.25,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.dustPoints = new THREE.Points(geometry, material);
    this.scene.add(this.dustPoints);
  }

  private createHeartGeometry(): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.3);
    shape.bezierCurveTo(0, 0.3, -0.25, 0, -0.25, -0.15);
    shape.bezierCurveTo(-0.25, -0.35, 0, -0.45, 0, -0.6);
    shape.bezierCurveTo(0, -0.45, 0.25, -0.35, 0.25, -0.15);
    shape.bezierCurveTo(0.25, 0, 0, 0.3, 0, 0.3);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1
    });
  }

  private addHearts(): void {
    const heartGeo = this.createHeartGeometry();
    for (let i = 0; i < this.quality.heartCount; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xc9a0a8,
        emissive: 0x3d1a28,
        emissiveIntensity: 0.2,
        metalness: 0.15,
        roughness: 0.7,
        transparent: true,
        opacity: 0.35 + Math.random() * 0.25
      });
      const heart = new THREE.Mesh(heartGeo, material);
      const scale = 0.08 + Math.random() * 0.12;
      heart.scale.set(scale, scale, scale);
      heart.position.set(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 12 - 4
      );
      heart.userData['speed'] = 0.15 + Math.random() * 0.25;
      heart.userData['offset'] = Math.random() * Math.PI * 2;
      this.hearts.push(heart);
      this.scene.add(heart);
    }
  }

  private addPetals(): void {
    const petalGeo = new THREE.PlaneGeometry(0.12, 0.16);
    for (let i = 0; i < this.quality.petalCount; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xc9a0a8,
        transparent: true,
        opacity: 0.2 + Math.random() * 0.2,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const petal = new THREE.Mesh(petalGeo, material);
      petal.position.set(
        (Math.random() - 0.5) * 18,
        Math.random() * 10 + 2,
        (Math.random() - 0.5) * 8 - 3
      );
      petal.userData['fallSpeed'] = 0.2 + Math.random() * 0.35;
      petal.userData['sway'] = Math.random() * Math.PI * 2;
      this.petals.push(petal);
      this.scene.add(petal);
    }
  }

  private async createPhotoOrb(
    photo: PhotoOrbData,
    index: number,
    total: number,
    clusterAngle: number
  ): Promise<PhotoOrb | null> {
    const group = new THREE.Group();
    const isPrimary = index === 0;
    const golden = index * 2.399963 + clusterAngle;

    let depth: PhotoOrb['depth'];
    let z: number;
    let baseScale: number;
    let parallax: number;
    let x: number;
    let y: number;

    if (isPrimary) {
      depth = 'foreground';
      z = -0.35 - Math.random() * 0.4;
      baseScale = this.isTouchDevice ? 1.42 : 1.52;
      parallax = 0.48;
      x = 2.6 + Math.random() * 0.8;
      y = 0.6 + Math.random() * 0.9;
    } else {
      const depthRoll = (index + Math.random() * 0.7) / Math.max(total, 1);
      if (depthRoll < 0.28) {
        depth = 'near';
        z = -3 - Math.random() * 2.8;
        baseScale = 0.78 + Math.random() * 0.1;
        parallax = 0.28;
      } else if (depthRoll < 0.62) {
        depth = 'mid';
        z = -5.5 - Math.random() * 3;
        baseScale = 0.62 + Math.random() * 0.12;
        parallax = 0.14;
      } else {
        depth = 'far';
        z = -8.5 - Math.random() * 4;
        baseScale = 0.52 + Math.random() * 0.1;
        parallax = 0.05;
      }
      const radius = 4.2 + (index % 4) * 1.8 + Math.random() * 2.5;
      const clusterPull = index % 3 === 0 ? 0.55 : 1;
      x = Math.cos(golden) * radius * clusterPull + (Math.random() - 0.5) * 2.4;
      y = Math.sin(golden * 0.85) * (1.2 + (index % 3) * 0.8) + (Math.random() - 0.5) * 2.6;
      if (index === 1) {
        x = -3.8 - Math.random() * 1.2;
        y = -0.4 + Math.random() * 0.8;
      }
    }

    const basePosition = new THREE.Vector3(x, y, z);
    group.position.copy(basePosition);

    const shadowGeo = new THREE.PlaneGeometry(1.48, 1.82);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050308,
      transparent: true,
      opacity: isPrimary ? 0.55 : 0.35,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0.06, -0.05, -0.09);
    group.add(shadowMesh);

    const frameGeo = new THREE.PlaneGeometry(1.48, 1.84);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e1418,
      emissive: isPrimary ? 0x2a1520 : 0x120c10,
      emissiveIntensity: isPrimary ? 0.22 : 0.1,
      metalness: 0.12,
      roughness: 0.94,
      transparent: true,
      opacity: isPrimary ? 0.42 : 0.32,
      depthWrite: true
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.z = -0.025;
    group.add(frameMesh);

    const photoGeo = new THREE.PlaneGeometry(1.36, 1.68);
    let photoMat: THREE.MeshBasicMaterial;

    try {
      const texture = await this.loadTexture(photo.imageUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      photoMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: isPrimary ? 0.98 : depth === 'far' ? 0.72 : depth === 'mid' ? 0.82 : 0.9,
        depthWrite: true
      });
    } catch {
      photoMat = new THREE.MeshBasicMaterial({
        color: 0x3d1a28,
        transparent: true,
        opacity: 0.7,
        depthWrite: true
      });
    }

    const mesh = new THREE.Mesh(photoGeo, photoMat);
    mesh.userData['photoId'] = photo.id;
    mesh.renderOrder = isPrimary ? 14 : depth === 'near' ? 8 : depth === 'mid' ? 4 : 2;
    group.add(mesh);

    const hitGeo = new THREE.PlaneGeometry(isPrimary ? 1.55 : 1.48, isPrimary ? 1.88 : 1.8);
    const hitMat = new THREE.MeshBasicMaterial({
      visible: false,
      depthWrite: false
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData['photoId'] = photo.id;
    hitMesh.renderOrder = mesh.renderOrder + 1;
    group.add(hitMesh);

    const glowGeo = new THREE.PlaneGeometry(isPrimary ? 2.05 : 1.68, isPrimary ? 2.45 : 2.02);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xc9a0a8,
      transparent: true,
      opacity: isPrimary ? 0.1 : 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -0.07;
    group.add(glow);

    if (isPrimary) {
      const warmGeo = new THREE.PlaneGeometry(2.35, 2.75);
      const warmMat = new THREE.MeshBasicMaterial({
        color: 0xc4b08a,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const warmHalo = new THREE.Mesh(warmGeo, warmMat);
      warmHalo.position.z = -0.1;
      group.add(warmHalo);

      this.primaryLight = new THREE.PointLight(0xc9a0a8, 0.55, 9);
      this.primaryLight.position.set(0, 0, 0.4);
      group.add(this.primaryLight);
    }

    const tiltZ = isPrimary ? -0.026 : (Math.random() - 0.5) * 0.07;
    const tiltX = isPrimary ? 0.021 : (Math.random() - 0.5) * 0.05;
    const baseRotation = new THREE.Euler(
      tiltX,
      golden + (Math.random() - 0.5) * (isPrimary ? 0.25 : 0.6),
      tiltZ
    );
    group.rotation.copy(baseRotation);
    group.scale.setScalar(baseScale);

    const driftMul = isPrimary ? 1 : 0.58;
    const drift = {
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
      speedX: (isPrimary ? 0.05 : 0.07 + Math.random() * 0.19) * driftMul,
      speedY: (isPrimary ? 0.04 : 0.05 + Math.random() * 0.16) * driftMul,
      speedZ: (isPrimary ? 0.03 : 0.04 + Math.random() * 0.11) * driftMul,
      ampX: (isPrimary ? 0.09 : 0.06 + Math.random() * 0.14) * (isPrimary ? 1 : 0.85),
      ampY: (isPrimary ? 0.11 : 0.08 + Math.random() * 0.16) * (isPrimary ? 1 : 0.85),
      ampZ: (isPrimary ? 0.04 : 0.03 + Math.random() * 0.08) * (isPrimary ? 1 : 0.85),
      rotSpeedX: (Math.random() - 0.5) * (isPrimary ? 0.006 : 0.012),
      rotSpeedY: (Math.random() - 0.5) * (isPrimary ? 0.008 : 0.018),
      rotSpeedZ: (Math.random() - 0.5) * (isPrimary ? 0.005 : 0.01),
      rotPhase: Math.random() * Math.PI * 2
    };

    return {
      group,
      mesh,
      frameMesh,
      glowMesh: glow,
      hitMesh,
      shadowMesh,
      basePosition,
      id: photo.id,
      title: photo.title ?? undefined,
      proximity: 0,
      depth,
      parallax,
      baseScale,
      drift,
      baseRotation,
      faceYaw: golden,
      isPrimary
    };
  }

  private spawnMemoryAfterglow(position: THREE.Vector3): void {
    const geo = new THREE.PlaneGeometry(0.5, 0.5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc9a0a8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    this.memoryAfterglows.push({
      mesh,
      started: performance.now(),
      position: position.clone()
    });
    if (this.memoryAfterglows.length > 8) {
      const old = this.memoryAfterglows.shift();
      if (old) {
        this.scene.remove(old.mesh);
        old.mesh.geometry.dispose();
        (old.mesh.material as THREE.Material).dispose();
      }
    }
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    const candidates = getImageFallbacks(url);
    return new Promise((resolve, reject) => {
      const tryLoad = (index: number): void => {
        const candidate = candidates[index];
        if (!candidate) {
          reject(new Error(`Failed to load texture: ${url}`));
          return;
        }

        this.textureLoader.load(
          candidate,
          texture => resolve(texture),
          undefined,
          () => tryLoad(index + 1)
        );
      };

      tryLoad(0);
    });
  }

  private pickPhoto(): boolean {
    if (this.photoOrbs.length === 0) return false;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = this.photoOrbs.flatMap(o => [o.hitMesh, o.mesh, o.frameMesh]);
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      const hitObj = hits[0].object as THREE.Mesh;
      const orb = this.photoOrbs.find(o =>
        o.mesh === hitObj || o.hitMesh === hitObj || o.frameMesh === hitObj
      ) ?? null;
      if (!orb) return false;

      const wasFocused = this.focusOrb === orb;
      this.focusOrb = wasFocused ? null : orb;

      if (!wasFocused) {
        const photoMat = orb.mesh.material as THREE.MeshBasicMaterial;
        const prevScale = orb.group.scale.x;
        orb.group.scale.setScalar(prevScale * 1.04);
        window.setTimeout(() => {
          orb.group.scale.setScalar(prevScale);
        }, 120);

        this.onPhotoDiscovered?.(orb.id, orb.title);
        const pos = orb.group.position.clone();
        this.starfield?.pulseAt(pos.x, pos.y, pos.z, 0.32);
        this.starfield?.markMemory(pos.x, pos.y, pos.z);
        this.spawnMemoryAfterglow(pos);
      }
      return true;
    }
    return false;
  }

  private animate = (): void => {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.visible) return;

    const elapsed = this.clock.getElapsedTime();
    const dt = this.clock.getDelta();

    this.ambientTimeScale += (this.targetTimeScale - this.ambientTimeScale) * 0.04;
    const slow = this.ambientTimeScale;
    this.prevCameraPos.copy(this.lastCameraPos);

    if (!this.reducedMotion) {
      this.updateDiscoveryChoreography();
      this.updateCamera(elapsed * slow);
      this.updateDust(elapsed, slow);
      this.updateHearts(elapsed * slow);
      this.updatePetals(elapsed * slow);
      this.updatePhotoOrbs(elapsed, slow);
      this.updateWarmSpots(dt);
      this.updateMemoryAfterglows();
      if (this.nebulaMesh) {
        this.nebulaMesh.rotation.y = elapsed * 0.004 * slow;
      }
      if (this.hazeMesh) {
        this.hazeMesh.rotation.y = -elapsed * 0.003 * slow;
        this.hazeMesh.rotation.x = Math.sin(elapsed * 0.05) * 0.02;
      }
    } else {
      this.updateCamera(elapsed);
    }

    this.updateStars(elapsed, this.reducedMotion ? 1 : slow);

    this.renderer.render(this.scene, this.camera);
  };

  private updateDiscoveryChoreography(): void {
    if (!this.discoveryChoreographyActive) return;
    this.discoveryChoreography = Math.min(1, this.discoveryChoreography + 0.00035);
    if (this.discoveryChoreography >= 1) {
      this.discoveryChoreographyActive = false;
      this.cameraResting = true;
    }
  }

  private updateCamera(elapsed: number): void {
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04;

    const scrollPull = this.scrollProgress * 4;
    const rest = this.cameraResting ? 0.22 : 1;
    const driftX = Math.sin(elapsed * 0.12) * 0.4 * rest;
    const driftY = Math.cos(elapsed * 0.09) * 0.25 * rest;

    let targetZ = this.cameraBaseZ - scrollPull;
    let lookAt = this.cameraTarget.clone();

    if (this.entering) {
      this.entryProgress = Math.min(1, this.entryProgress + 0.005);
      const ease = 1 - Math.pow(1 - this.entryProgress, 3);
      targetZ = THREE.MathUtils.lerp(26, this.cameraBaseZ - scrollPull, ease);
      lookAt.set(0, 0, -2);
      if (this.entryProgress >= 1) {
        this.entering = false;
      }
    } else if (this.cameraMotion) {
      const dt = 1 / 60;
      this.cameraMotion.progress += dt / this.cameraMotion.duration;
      const t = Math.min(1, this.cameraMotion.progress);
      const ease = 1 - Math.pow(1 - t, 3);
      targetZ = THREE.MathUtils.lerp(this.cameraMotion.fromZ, this.cameraMotion.toZ, ease);
      lookAt.copy(this.cameraMotion.lookAt);
      if (t >= 1) {
        this.cameraMotion.resolve?.();
        this.cameraMotion = null;
      }
    }

    if (this.focusOrb && !this.cameraMotion) {
      this.focusAmount = Math.min(1, this.focusAmount + 0.02);
      const worldPos = new THREE.Vector3();
      this.focusOrb.group.getWorldPosition(worldPos);
      lookAt.lerp(worldPos, this.focusAmount * 0.6);
      targetZ = THREE.MathUtils.lerp(targetZ, 6, this.focusAmount * 0.5);
    } else {
      this.focusAmount = Math.max(0, this.focusAmount - 0.03);
    }

    if (this.primaryOrb && !this.entering && !this.cameraMotion && !this.focusOrb) {
      const p = this.primaryOrb.group.position;
      const choreo = this.discoveryChoreography;
      const acknowledge = this.cameraResting ? 0.018 : choreo * 0.012;
      lookAt.lerp(p, acknowledge);
      if (choreo > 0.3 || this.cameraResting) {
        targetZ = THREE.MathUtils.lerp(targetZ, this.cameraBaseZ - scrollPull - 0.6, 0.006);
      }
    }

    this.camera.position.x = this.mouseX * (1.2 * rest) + driftX;
    this.camera.position.y = this.mouseY * (0.7 * rest) + driftY - this.scrollProgress * 0.5;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, 0.03);
    this.camera.lookAt(lookAt);
    this.lastCameraPos.copy(this.camera.position);
  }

  private updateStars(elapsed: number, slow: number): void {
    const camX = this.camera.position.x;
    const camY = this.camera.position.y;
    this.starfield.update({
      time: elapsed,
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      cameraShiftX: camX,
      cameraShiftY: camY,
      timeScale: slow
    });
  }
  private updateDust(elapsed: number, slow: number): void {
    this.dustPoints.rotation.y = elapsed * 0.006 * slow;
    const pos = this.dustPoints.geometry.attributes['position'] as THREE.BufferAttribute;
    const now = performance.now();

    const gravityX = this.mouseX * 2.2;
    const gravityY = this.mouseY * 1.4;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const dx = gravityX - x;
      const dy = gravityY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4.5 && dist > 0.01) {
        const pull = (1 - dist / 4.5) * 0.0008 * slow;
        x += (dx / dist) * pull;
        y += (dy / dist) * pull;
      }

      for (const spot of this.warmSpots) {
        const age = (now - spot.started) / 1000;
        const fade = Math.max(0, 1 - age / 2.2) * spot.strength;
        const sx = spot.position.x - x;
        const sy = spot.position.y - y;
        const sz = spot.position.z - z;
        const sd = Math.sqrt(sx * sx + sy * sy + sz * sz);
        if (sd < 3 && sd > 0.01) {
          const warm = (1 - sd / 3) * fade * 0.0012;
          x += (sx / sd) * warm;
          y += (sy / sd) * warm;
        }
      }

      for (const ripple of this.ripples) {
        const t = (now - ripple.start) / ripple.duration;
        if (t > 1) continue;
        const wave = Math.sin(t * Math.PI) * (1 - t);
        const rx = ripple.nx * 8 - x;
        const ry = ripple.ny * 5 - y;
        const rd = Math.sqrt(rx * rx + ry * ry);
        if (rd < 2.5 && rd > 0.01) {
          const push = wave * 0.004;
          x -= (rx / rd) * push;
          y -= (ry / rd) * push;
        }
      }

      if (this.primaryOrb && this.discoveryChoreography > 0.25 && i % 17 === 0) {
        const px = this.primaryOrb.group.position.x;
        const py = this.primaryOrb.group.position.y;
        const pz = this.primaryOrb.group.position.z;
        const mx = px - x;
        const my = py - y;
        const mz = pz - z;
        const md = Math.sqrt(mx * mx + my * my + mz * mz);
        if (md < 5.5 && md > 0.2) {
          const pull = (1 - md / 5.5) * 0.0006 * this.discoveryChoreography;
          x += (mx / md) * pull;
          y += (my / md) * pull;
          z += (mz / md) * pull * 0.4;
        }
      }

      if (this.primaryOrb && i % 23 < 3) {
        const px = this.primaryOrb.group.position.x;
        const py = this.primaryOrb.group.position.y;
        const dx = px - x;
        const dy = py - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.15 && d < 3.5) {
          x += (dx / d) * 0.00035;
          y += (dy / d) * 0.00035;
        }
      }

      z += 0.002 * slow;
      if (z > 5) z = -15;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;

    this.ripples = this.ripples.filter(r => now - r.start < r.duration);
  }

  private updateWarmSpots(_dt: number): void {
    const now = performance.now();
    this.warmSpots = this.warmSpots.filter(s => now - s.started < 2200);
    for (const spot of this.warmSpots) {
      const age = (now - spot.started) / 1000;
      spot.strength = Math.max(0, 1 - age / 2);
    }
  }

  private updateHearts(elapsed: number): void {
    for (const heart of this.hearts) {
      const speed = heart.userData['speed'] as number;
      const offset = heart.userData['offset'] as number;
      heart.rotation.y += 0.002 * speed;
      heart.position.y += Math.sin(elapsed * speed + offset) * 0.001;
    }
  }

  private updatePetals(elapsed: number): void {
    for (const petal of this.petals) {
      const fallSpeed = petal.userData['fallSpeed'] as number;
      const sway = petal.userData['sway'] as number;
      petal.position.y -= fallSpeed * 0.008;
      petal.position.x += Math.sin(elapsed * 0.5 + sway) * 0.002;
      petal.rotation.z += 0.003;
      if (petal.position.y < -8) {
        petal.position.y = 10;
        petal.position.x = (Math.random() - 0.5) * 18;
      }
    }
  }

  private updateMemoryAfterglows(): void {
    const now = performance.now();
    this.memoryAfterglows = this.memoryAfterglows.filter(g => {
      const age = (now - g.started) / 1000;
      if (age > 4.5) {
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        (g.mesh.material as THREE.Material).dispose();
        return false;
      }
      const fade = Math.max(0, 1 - age / 4.5);
      const pulse = 0.85 + Math.sin(age * 2.2) * 0.08;
      (g.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.28 * pulse;
      g.mesh.scale.setScalar(0.6 + fade * 0.5);
      return true;
    });
  }

  private updatePhotoOrbs(elapsed: number, slow: number): void {
    this.driftIntensity += (this.targetDriftIntensity - this.driftIntensity) * 0.03;
    const drift = this.driftIntensity * slow;
    let maxProximity = 0;

    const camDx = this.camera.position.x - this.prevCameraPos.x;
    const camDy = this.camera.position.y - this.prevCameraPos.y;

    for (const orb of this.photoOrbs) {
      const isFocused = this.focusOrb === orb;
      const isCherished = this.cherishedOrbId === orb.id;
      const d = orb.drift;
      const choreo = orb.isPrimary ? this.discoveryChoreography : 0;

      const screenPos = orb.group.position.clone().project(this.camera);
      const sdx = screenPos.x - this.mouseX;
      const sdy = screenPos.y - this.mouseY;
      const screenDist = Math.sqrt(sdx * sdx + sdy * sdy);
      const proxThreshold = orb.isPrimary ? 0.65 : 0.55;
      const prox = THREE.MathUtils.clamp(1 - screenDist / proxThreshold, 0, 1);
      orb.proximity += (prox - orb.proximity) * (orb.isPrimary ? 0.045 : 0.05);
      maxProximity = Math.max(maxProximity, orb.proximity);

      let driftX: number;
      let driftY: number;
      let driftZ: number;
      if (orb.isPrimary) {
        driftX = organicDrift(elapsed, d.phaseX, d.speedX, d.ampX);
        driftY = organicDrift(elapsed, d.phaseY, d.speedY, d.ampY);
        driftZ = organicDrift(elapsed, d.phaseZ, d.speedZ, d.ampZ);
        driftZ -= choreo * 0.12;
      } else {
        driftX = Math.sin(elapsed * d.speedX + d.phaseX) * d.ampX;
        driftY = Math.sin(elapsed * d.speedY + d.phaseY) * d.ampY;
        driftZ = Math.sin(elapsed * d.speedZ + d.phaseZ) * d.ampZ;
      }

      const parallaxX = camDx * orb.parallax * 18;
      const parallaxY = camDy * orb.parallax * 14;
      const pointerX = this.mouseX * orb.parallax * (orb.isPrimary ? 0.45 : 0.35) * drift;
      const pointerY = this.mouseY * orb.parallax * (orb.isPrimary ? 0.32 : 0.28) * drift;

      orb.group.position.x = orb.basePosition.x + driftX * drift + parallaxX + pointerX;
      orb.group.position.y = orb.basePosition.y + driftY * drift + parallaxY + pointerY;
      orb.group.position.z = orb.basePosition.z + driftZ * drift;

      const distToCam = this.camera.position.distanceTo(orb.group.position);
      const depthScale = THREE.MathUtils.clamp(11.5 / distToCam, 0.5, 1.4) * orb.baseScale;
      const proxScale = 1 + orb.proximity * (orb.isPrimary ? 0.07 : 0.04) + (isFocused ? 0.08 : 0);
      const targetScale = depthScale * proxScale;
      const s = orb.group.scale.x + (targetScale - orb.group.scale.x) * 0.04;
      orb.group.scale.setScalar(s);

      const photoMat = orb.mesh.material as THREE.MeshBasicMaterial;
      const farSoft = orb.isPrimary ? 0.95 : orb.depth === 'far' ? 0.7 : orb.depth === 'mid' ? 0.8 : 0.88;
      photoMat.opacity = THREE.MathUtils.lerp(
        photoMat.opacity,
        farSoft + orb.proximity * (orb.isPrimary ? 0.06 : 0.05) + (isFocused ? 0.05 : 0),
        0.05
      );

      const glowMat = orb.glowMesh.material as THREE.MeshBasicMaterial;
      const baseGlow = orb.isPrimary ? 0.08 : 0.03;
      glowMat.opacity = baseGlow + orb.proximity * 0.16 + (isFocused ? 0.12 : 0) + (isCherished ? 0.06 : 0)
        + choreo * 0.04;

      if (orb.isPrimary && this.primaryLight) {
        this.primaryLight.intensity = 0.45 + orb.proximity * 0.35 + choreo * 0.15;
      }

      orb.group.rotation.x = orb.baseRotation.x
        + Math.sin(elapsed * d.rotSpeedX * 3 + d.rotPhase) * 0.04 * drift
        + orb.proximity * (orb.isPrimary ? 0.08 : 0.05);
      orb.group.rotation.z = orb.baseRotation.z
        + Math.sin(elapsed * d.rotSpeedZ * 2.5 + d.rotPhase) * 0.03 * drift;

      const targetYaw = orb.baseRotation.y
        + Math.sin(elapsed * d.rotSpeedY * 2 + d.rotPhase) * 0.05 * drift;
      if (orb.proximity > 0.15 || isFocused) {
        const toCam = new THREE.Vector3();
        toCam.subVectors(this.camera.position, orb.group.position);
        const faceAngle = Math.atan2(toCam.x, toCam.z);
        const faceRate = 0.01 + orb.proximity * (orb.isPrimary ? 0.05 : 0.03);
        orb.group.rotation.y += (faceAngle - orb.group.rotation.y) * faceRate;
      } else {
        orb.group.rotation.y += (targetYaw - orb.group.rotation.y) * 0.02;
      }

      if (orb.proximity > 0.2) {
        const pull = orb.isPrimary ? 0.005 : 0.004;
        orb.group.position.x += (this.mouseX * 2.2 - orb.group.position.x) * orb.proximity * pull;
        orb.group.position.y += (this.mouseY * 1.6 - orb.group.position.y) * orb.proximity * pull;
      }
    }

    this.discoveryProximity = maxProximity;

    if (maxProximity > 0.35 && !this.cameraMotion) {
      const nearest = this.photoOrbs.reduce((best, o) =>
        o.proximity > best.proximity ? o : best, this.photoOrbs[0]);
      if (nearest.proximity > 0.35) {
        this.cameraTarget.lerp(nearest.group.position, 0.006 * nearest.proximity);
      }
    }
  }
}
