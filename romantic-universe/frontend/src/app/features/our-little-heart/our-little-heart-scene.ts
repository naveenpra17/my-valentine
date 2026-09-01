import * as THREE from 'three';
import { HeartObject } from '../../core/experience/experience-state.types';
import { computePoolOrbit } from '../../core/experience/heart-composition.util';
import {
  buildObjectMesh,
  disposeGroup,
  objectKey
} from './heart-object-meshes';

export type HeartSceneMode = 'create' | 'reconstruct';
export type HeartScenePhase = 'intro' | 'entering' | 'creating' | 'reconstructing' | 'complete';

export interface HeartSceneOptions {
  reducedMotion?: boolean;
  mobile?: boolean;
  mode?: HeartSceneMode;
}

export interface HeartSceneCallbacks {
  onPoolSelect?: (obj: HeartObject) => void;
  onAttachedSelect?: (obj: HeartObject) => void;
  onAttachComplete?: (obj: HeartObject) => void;
  onDetachComplete?: (obj: HeartObject) => void;
  onReconstructItem?: (obj: HeartObject, index: number) => void;
  onReconstructComplete?: () => void;
  onPhaseChange?: (phase: HeartScenePhase) => void;
  onPulse?: () => void;
}

interface PoolEntry {
  key: string;
  object: HeartObject;
  group: THREE.Group;
  orbit: ReturnType<typeof computePoolOrbit>;
  floatPhase: number;
}

interface AttachedEntry {
  key: string;
  object: HeartObject;
  group: THREE.Group;
}

interface FlyTask {
  group: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  fromScale: number;
  toScale: number;
  start: number;
  duration: number;
  onComplete: () => void;
  trail?: THREE.Points;
}

export class OurLittleHeartScene {
  private readonly container: HTMLElement;
  private readonly reducedMotion: boolean;
  private readonly mobile: boolean;
  private readonly mode: HeartSceneMode;
  private callbacks: HeartSceneCallbacks = {};
  private readOnly = false;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private heartRoot!: THREE.Group;
  private heartMesh!: THREE.Mesh;
  private heartMat!: THREE.MeshPhysicalMaterial;
  private poolGroup!: THREE.Group;
  private attachedGroup!: THREE.Group;
  private journeyGroup!: THREE.Group;
  private echoGroup!: THREE.Group;
  private particles!: THREE.Points;
  private stars!: THREE.Points;
  private rippleMesh?: THREE.Mesh;
  private journeyMarkers: THREE.Mesh[] = [];

  private pool = new Map<string, PoolEntry>();
  private attached = new Map<string, AttachedEntry>();
  private flyTasks: FlyTask[] = [];
  private hoveredKey: string | null = null;
  private selectedAttachedKey: string | null = null;

  private animationId = 0;
  private running = false;
  private visible = true;
  private clock = new THREE.Clock();
  private phase: HeartScenePhase = 'intro';

  private rotX = 0;
  private rotY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private rotVelX = 0;
  private rotVelY = 0;
  private isDragging = false;
  private interactionUntil = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pinchStartDist = 0;
  private pinchStartZ = 6.2;
  private activePointers = new Map<number, { x: number; y: number }>();

  private cameraZ = 6.2;
  private targetCameraZ = 6.2;
  private pulseAmount = 0;
  private heartScale = 0.38;
  private introProgress = 0;
  private timeScale = 1;
  private poolHighlight = false;
  private pointerProximity = 0;
  private universeRipple = 0;
  private cherishedKey: string | null = null;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private onPointerDown = (e: PointerEvent): void => {
    if (this.phase === 'intro' || this.phase === 'reconstructing') return;
    if (this.readOnly && this.phase !== 'complete') return;
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activePointers.size === 2) {
      this.pinchStartDist = this.pointerDistance();
      this.pinchStartZ = this.targetCameraZ;
      this.isDragging = false;
      return;
    }

    this.isDragging = true;
    this.interactionUntil = performance.now() + 2800;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.rotVelX = 0;
    this.rotVelY = 0;
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (this.activePointers.size === 2) {
      const dist = this.pointerDistance();
      const scale = this.pinchStartDist / Math.max(dist, 1);
      this.targetCameraZ = THREE.MathUtils.clamp(this.pinchStartZ * scale, 3.8, 9);
      return;
    }

    if (!this.isDragging) {
      this.updateHover();
      this.updatePointerProximity();
      return;
    }
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.rotVelY = dx * 0.007;
    this.rotVelX = dy * 0.007;
    this.targetRotY += this.rotVelY;
    this.targetRotX += this.rotVelX;
    this.targetRotX = THREE.MathUtils.clamp(this.targetRotX, -0.75, 0.75);
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size >= 1) return;

    if (this.isDragging && Math.abs(this.rotVelX) + Math.abs(this.rotVelY) < 0.002) {
      this.trySelect(e.clientX, e.clientY);
    }
    this.isDragging = false;
    try {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    } catch { /* already released */ }
  };

  private pointerDistance(): number {
    const pts = [...this.activePointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private onWheel = (e: WheelEvent): void => {
    if (this.mobile || e.ctrlKey || e.metaKey) return;

    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 1) return;

    this.targetCameraZ = THREE.MathUtils.clamp(this.targetCameraZ + delta * 0.004, 3.8, 9);
  };

  private onResize = (): void => this.resize();

  constructor(
    container: HTMLElement,
    reducedMotion = false,
    mobile = false,
    mode: HeartSceneMode = 'create'
  ) {
    this.container = container;
    this.reducedMotion = reducedMotion;
    this.mobile = mobile;
    this.mode = mode;
  }

  setCallbacks(callbacks: HeartSceneCallbacks): void {
    this.callbacks = callbacks;
  }

  init(): void {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050308, 0.028);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 80);
    this.camera.position.set(0, 0.1, this.cameraZ);

    const dpr = this.mobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.mobile, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setClearColor(0x050308, 0);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xf5f0e8, 0.22));
    const key = new THREE.DirectionalLight(0xf5e8ec, 1.1);
    key.position.set(3, 4, 5);
    this.scene.add(key);
    const rim = new THREE.PointLight(0xc9a0a8, 0.9, 18);
    rim.position.set(-2, 1, 3);
    this.scene.add(rim);
    const fill = new THREE.PointLight(0x9a8fa8, 0.45, 14);
    fill.position.set(2, -2, 2);
    this.scene.add(fill);

    this.stars = this.createStarfield(600);
    this.scene.add(this.stars);
    this.particles = this.createAmbientParticles(this.mobile ? 80 : 140);
    this.scene.add(this.particles);

    this.heartRoot = new THREE.Group();
    this.scene.add(this.heartRoot);

    const heartGeo = this.createHeartGeometry();
    this.heartMat = new THREE.MeshPhysicalMaterial({
      color: 0x5c1830,
      emissive: 0x1a0810,
      emissiveIntensity: 0.22,
      metalness: 0.12,
      roughness: 0.38,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide
    });
    this.heartMesh = new THREE.Mesh(heartGeo, this.heartMat);
    this.heartMesh.scale.setScalar(this.heartScale);
    this.heartRoot.add(this.heartMesh);

    this.attachedGroup = new THREE.Group();
    this.heartRoot.add(this.attachedGroup);

    this.poolGroup = new THREE.Group();
    this.scene.add(this.poolGroup);

    this.journeyGroup = new THREE.Group();
    this.scene.add(this.journeyGroup);

    this.echoGroup = new THREE.Group();
    this.scene.add(this.echoGroup);

    if (this.mode === 'reconstruct') {
      this.poolGroup.visible = false;
      this.heartRoot.visible = false;
      this.targetCameraZ = 9.5;
      this.cameraZ = 9.5;
    } else if (this.reducedMotion) {
      this.heartRoot.scale.setScalar(1);
      this.cameraZ = 5.8;
      this.targetCameraZ = 5.8;
    } else {
      this.heartRoot.scale.setScalar(0.15);
      this.cameraZ = 8.5;
      this.targetCameraZ = 8.5;
    }

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.onPointerUp);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('resize', this.onResize);
    requestAnimationFrame(() => this.resize());
  }

  async setPoolObjects(objects: HeartObject[]): Promise<void> {
    const incoming = new Set(objects.map(objectKey));
    for (const [key, entry] of this.pool) {
      if (!incoming.has(key)) {
        this.poolGroup.remove(entry.group);
        disposeGroup(entry.group);
        this.pool.delete(key);
      }
    }

    const quality = this.mobile ? 'mobile' : 'desktop';
    const poolKeys = objects.map(objectKey);
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const key = objectKey(obj);
      if (this.pool.has(key)) {
        const entry = this.pool.get(key)!;
        const orbit = computePoolOrbit(obj.type, obj.referenceId, i, objects.length);
        entry.orbit = orbit;
        entry.object = obj;
        entry.floatPhase = i * 0.7;
        if (!this.flyTasks.some(t => t.group === entry.group)) {
          entry.group.position.set(orbit.position.x, orbit.position.y, orbit.position.z);
          entry.group.rotation.set(orbit.rotation.x, orbit.rotation.y, orbit.rotation.z);
        }
        continue;
      }
      if (this.attached.has(key)) continue;

      const group = await buildObjectMesh(obj, quality);
      const orbit = computePoolOrbit(obj.type, obj.referenceId, i, objects.length);
      group.position.set(orbit.position.x, orbit.position.y, orbit.position.z);
      group.rotation.set(orbit.rotation.x, orbit.rotation.y, orbit.rotation.z);
      group.userData['pool'] = true;
      this.poolGroup.add(group);
      this.pool.set(key, { key, object: obj, group, orbit, floatPhase: i * 0.7 });
    }

    if (poolKeys.length > 0 && this.phase === 'creating') {
      this.targetCameraZ = THREE.MathUtils.lerp(this.targetCameraZ, this.mobile ? 6.1 : 5.9, 0.35);
    }
  }

  setPoolHighlight(active: boolean): void {
    this.poolHighlight = active;
    if (!active) {
      for (const entry of this.pool.values()) {
        entry.group.scale.setScalar(1);
      }
    }
  }

  syncAttachedObjects(objects: HeartObject[]): void {
    const incoming = new Set(objects.map(objectKey));

    for (const [key, entry] of this.attached) {
      if (!incoming.has(key)) {
        this.attachedGroup.remove(entry.group);
        disposeGroup(entry.group);
        this.attached.delete(key);
      }
    }

    objects.forEach(obj => {
      const key = objectKey(obj);
      if (this.attached.has(key)) {
        this.applyAttachedTransform(this.attached.get(key)!.group, obj);
        return;
      }
      if (this.flyTasks.some(t => t.group.userData['key'] === key)) return;

      void this.placeAttachedInstant(obj);
    });
  }

  private async placeAttachedInstant(obj: HeartObject): Promise<void> {
    const key = objectKey(obj);
    const quality = this.mobile ? 'mobile' : 'desktop';
    const group = await buildObjectMesh(obj, quality);
    this.applyAttachedTransform(group, obj);
    this.attachedGroup.add(group);
    this.attached.set(key, { key, object: obj, group });
  }

  private applyAttachedTransform(group: THREE.Group, obj: HeartObject): void {
    const s = obj.scale ?? 1;
    if (obj.position) group.position.set(obj.position.x, obj.position.y, obj.position.z);
    if (obj.rotation) group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    group.scale.setScalar(s * 0.85);
    group.userData['key'] = objectKey(obj);
    group.userData['pool'] = false;
  }

  async flyAttach(obj: HeartObject): Promise<void> {
    const key = objectKey(obj);
    const poolEntry = this.pool.get(key);
    const quality = this.mobile ? 'mobile' : 'desktop';

    let group: THREE.Group;
    let fromWorld: THREE.Vector3;

    if (poolEntry) {
      group = poolEntry.group;
      fromWorld = group.getWorldPosition(new THREE.Vector3());
      this.pool.delete(key);
    } else {
      group = await buildObjectMesh(obj, quality);
      fromWorld = new THREE.Vector3(0, 0, 3);
      this.scene.add(group);
    }

    this.poolGroup.remove(group);
    this.attachedGroup.add(group);

    const target = new THREE.Vector3(
      obj.position?.x ?? 0,
      obj.position?.y ?? 0,
      obj.position?.z ?? 0.4
    );
    const localFrom = this.attachedGroup.worldToLocal(fromWorld.clone());
    group.position.copy(localFrom);
    group.scale.setScalar(this.reducedMotion ? (obj.scale ?? 1) * 0.85 : 0.2);

    const duration = this.reducedMotion ? 350 : 900;
    this.timeScale = 0.65;

    await new Promise<void>(resolve => {
      const trail = this.reducedMotion ? undefined : this.createTrail(localFrom, target);
      if (trail) this.attachedGroup.add(trail);

      this.flyTasks.push({
        group,
        from: localFrom.clone(),
        to: target.clone(),
        fromScale: group.scale.x,
        toScale: (obj.scale ?? 1) * 0.85,
        start: performance.now(),
        duration,
        trail,
        onComplete: () => {
          if (obj.rotation) group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
          this.attached.set(key, { key, object: obj, group });
          if (obj.type === 'flower') this.burstFlowerPetals(target);
          if (obj.type === 'love-bomb') this.burstLoveBomb(target);
          this.triggerHeartPulse();
          this.sendUniverseRipple();
          this.updateHeartRichness();
          this.callbacks.onAttachComplete?.(obj);
          this.callbacks.onPulse?.();
          this.timeScale = 1;
          resolve();
        }
      });
    });
  }

  async flyDetach(obj: HeartObject, poolIndex: number, poolTotal: number): Promise<void> {
    const key = objectKey(obj);
    const entry = this.attached.get(key);
    if (!entry) return;

    const group = entry.group;
    const orbit = computePoolOrbit(obj.type, obj.referenceId, poolIndex, poolTotal);
    const from = group.position.clone();
    const to = new THREE.Vector3(orbit.position.x, orbit.position.y, orbit.position.z);

    this.attached.delete(key);
    this.attachedGroup.remove(group);
    this.poolGroup.add(group);

    const duration = this.reducedMotion ? 300 : 900;
    await new Promise<void>(resolve => {
      this.flyTasks.push({
        group,
        from,
        to,
        fromScale: group.scale.x,
        toScale: 1,
        start: performance.now(),
        duration,
        onComplete: () => {
          group.rotation.set(orbit.rotation.x, orbit.rotation.y, orbit.rotation.z);
          this.pool.set(key, { key, object: obj, group, orbit, floatPhase: poolIndex * 0.7 });
          this.callbacks.onDetachComplete?.(obj);
          resolve();
        }
      });
    });
  }

  beginCreation(): void {
    this.poolGroup.visible = this.mode === 'create';
    this.heartRoot.visible = true;
    this.setPhase('entering');
    if (this.reducedMotion) {
      this.heartRoot.scale.setScalar(1);
      this.cameraZ = 5.8;
      this.targetCameraZ = 5.8;
      this.setPhase('creating');
      return;
    }
    this.introProgress = 0;
  }

  completeCreation(): void {
    this.setPhase('complete');
    this.setPoolHighlight(false);
    this.poolGroup.visible = false;
    this.readOnly = true;
    this.hoveredKey = null;

    if (this.reducedMotion) {
      this.targetCameraZ = 6;
      this.cameraZ = 6;
      this.pulseAmount = 1;
      return;
    }

    this.targetCameraZ = this.mobile ? 6.35 : 6.05;
    this.targetRotX = THREE.MathUtils.lerp(this.targetRotX, 0, 0.35);
    this.pulseAmount = 1.35;
    this.triggerHeartPulse();
  }

  setReadOnly(readOnly: boolean): void {
    this.readOnly = readOnly;
    this.poolGroup.visible = !readOnly && this.mode === 'create';
  }

  /** Show empty heart before reconstruction. */
  prepareReconstruction(): void {
    this.heartRoot.visible = true;
    this.clearAttached();
    this.heartRoot.scale.setScalar(1);
    this.targetCameraZ = this.reducedMotion ? 5.8 : 7.2;
    this.cameraZ = this.targetCameraZ;
    this.setPhase('reconstructing');
  }

  /** Add a journey constellation marker in 3D space. */
  addJourneyMarker(index: number, total: number): void {
    const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 2.8 + (index % 3) * 0.15;
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xf5f0e8,
        emissive: 0xc9a0a8,
        emissiveIntensity: 0.6
      })
    );
    marker.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.35,
      Math.sin(angle) * radius * 0.5 - 1
    );
    this.journeyGroup.add(marker);
    this.journeyMarkers.push(marker);

    if (this.journeyMarkers.length >= 2) {
      this.drawJourneyLines();
    }
  }

  highlightJourneyMarker(index: number): void {
    const marker = this.journeyMarkers[index];
    if (!marker) return;
    marker.scale.setScalar(1.8);
    setTimeout(() => marker.scale.setScalar(1), 600);
  }

  revealHeartForReconstruction(): void {
    this.heartRoot.visible = true;
    this.targetCameraZ = this.reducedMotion ? 5.8 : 6.2;
  }

  highlightCherishedMarker(type: string, referenceId: number | string): void {
    this.cherishedKey = `${type}-${referenceId}`;
  }

  /** Reconstruct heart objects one at a time from saved state (read-only). */
  async reconstructSequential(objects: HeartObject[]): Promise<void> {
    this.prepareReconstruction();
    await this.pause(1800);

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      await this.flyReconstructAttach(obj);
      this.callbacks.onReconstructItem?.(obj, i);
      await this.pause(this.reducedMotion ? 400 : 1100);
    }

    this.setPhase('complete');
    this.setReadOnly(true);
    this.showEchoes();
    this.callbacks.onReconstructComplete?.();
  }

  private async flyReconstructAttach(obj: HeartObject): Promise<void> {
    const key = objectKey(obj);
    const quality = this.mobile ? 'mobile' : 'desktop';
    const group = await buildObjectMesh(obj, quality);

    const target = new THREE.Vector3(
      obj.position?.x ?? 0,
      obj.position?.y ?? 0,
      obj.position?.z ?? 0.4
    );
    const from = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      1.5 + Math.random() * 0.5,
      2 + Math.random()
    );

    group.position.copy(from);
    group.scale.setScalar(this.reducedMotion ? (obj.scale ?? 1) * 0.85 : 0.05);
    this.attachedGroup.add(group);

    const duration = this.reducedMotion ? 450 : 1200;

    await new Promise<void>(resolve => {
      const trail = this.reducedMotion ? undefined : this.createTrail(from, target);
      if (trail) this.attachedGroup.add(trail);

      this.flyTasks.push({
        group,
        from: from.clone(),
        to: target.clone(),
        fromScale: group.scale.x,
        toScale: (obj.scale ?? 1) * 0.85,
        start: performance.now(),
        duration,
        trail,
        onComplete: () => {
          if (obj.rotation) group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
          this.attached.set(key, { key, object: obj, group });
          this.flashObjectSignature(obj);
          this.triggerHeartPulse();
          this.callbacks.onPulse?.();
          resolve();
        }
      });
    });
  }

  private clearAttached(): void {
    for (const entry of this.attached.values()) {
      this.attachedGroup.remove(entry.group);
      disposeGroup(entry.group);
    }
    this.attached.clear();
  }

  private drawJourneyLines(): void {
    const existing = this.journeyGroup.getObjectByName('journey-lines');
    if (existing) {
      this.journeyGroup.remove(existing);
      (existing as THREE.Line).geometry.dispose();
      ((existing as THREE.Line).material as THREE.Material).dispose();
    }

    const points = this.journeyMarkers.map(m => m.position.clone());
    if (points.length < 2) return;

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0xc9a0a8, transparent: true, opacity: 0.2 })
    );
    line.name = 'journey-lines';
    this.journeyGroup.add(line);
  }

  private showEchoes(): void {
    if (this.reducedMotion) return;
    const count = Math.min(this.attached.size, 12);
    for (let i = 0; i < count; i++) {
      const echo = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xc9a0a8, transparent: true, opacity: 0.35 })
      );
      const angle = (i / count) * Math.PI * 2;
      echo.position.set(Math.cos(angle) * 1.8, Math.sin(angle) * 0.4, Math.sin(angle) * 1.2);
      echo.userData['echoAngle'] = angle;
      this.echoGroup.add(echo);
    }
  }

  private pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  focusAttached(key: string): void {
    const entry = this.attached.get(key);
    if (!entry) return;
    this.selectedAttachedKey = key;
    entry.group.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          if ('emissiveIntensity' in m) {
            (m as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
          }
        });
      }
    });
  }

  clearAttachedFocus(): void {
    this.selectedAttachedKey = null;
    for (const entry of this.attached.values()) {
      entry.group.traverse(child => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => {
            if ('emissiveIntensity' in m) {
              (m as THREE.MeshStandardMaterial).emissiveIntensity = 0.15;
            }
          });
        }
      });
    }
  }

  captureCameraState(): { z: number; rotX: number; rotY: number } {
    return { z: this.cameraZ, rotX: this.rotX, rotY: this.rotY };
  }

  restoreCameraState(state: { z: number; rotX: number; rotY: number }): void {
    this.cameraZ = state.z;
    this.targetCameraZ = state.z;
    this.rotX = state.rotX;
    this.rotY = state.rotY;
    this.targetRotX = state.rotX;
    this.targetRotY = state.rotY;
  }

  resize(): void {
    if (!this.renderer || !this.camera) return;
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
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
    if (visible) {
      this.resize();
      if (!this.running) this.start();
    }
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.onPointerUp);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);

    for (const entry of this.pool.values()) disposeGroup(entry.group);
    for (const entry of this.attached.values()) disposeGroup(entry.group);
    for (const marker of this.journeyMarkers) {
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
    }
    this.echoGroup.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    this.heartMesh.geometry.dispose();
    this.heartMat.dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private setPhase(phase: HeartScenePhase): void {
    this.phase = phase;
    this.callbacks.onPhaseChange?.(phase);
  }

  private trySelect(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const poolMeshes = [...this.pool.values()].map(e => e.group);
    const poolHits = this.raycaster.intersectObjects(poolMeshes, true);
    if (!this.readOnly && poolHits.length > 0) {
      const root = this.findRootGroup(poolHits[0].object);
      const key = root.userData['key'] as string;
      const entry = this.pool.get(key);
      if (entry) this.callbacks.onPoolSelect?.(entry.object);
      return;
    }

    const attachedMeshes = [...this.attached.values()].map(e => e.group);
    const attachHits = this.raycaster.intersectObjects(attachedMeshes, true);
    if (attachHits.length > 0) {
      const root = this.findRootGroup(attachHits[0].object);
      const key = root.userData['key'] as string;
      const entry = this.attached.get(key);
      if (entry) this.callbacks.onAttachedSelect?.(entry.object);
    }
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = [...this.pool.values()].map(e => e.group);
    const hits = this.raycaster.intersectObjects(targets, true);
    const nextKey = hits.length ? (this.findRootGroup(hits[0].object).userData['key'] as string) : null;

    if (nextKey === this.hoveredKey) return;
    if (this.hoveredKey) {
      const prev = this.pool.get(this.hoveredKey);
      if (prev) prev.group.scale.setScalar(1);
    }
    this.hoveredKey = nextKey;
    if (nextKey) {
      const entry = this.pool.get(nextKey);
      if (entry) entry.group.scale.setScalar(1.12);
    }
  }

  private findRootGroup(obj: THREE.Object3D): THREE.Group {
    let current: THREE.Object3D = obj;
    while (current.parent && current.parent !== this.poolGroup && current.parent !== this.attachedGroup) {
      current = current.parent;
    }
    return current as THREE.Group;
  }

  private triggerHeartPulse(): void {
    this.pulseAmount = 1;
    this.showRipple();
  }

  private showRipple(): void {
    if (this.reducedMotion) return;
    if (this.rippleMesh) {
      this.heartRoot.remove(this.rippleMesh);
      this.rippleMesh.geometry.dispose();
      (this.rippleMesh.material as THREE.Material).dispose();
    }
    this.rippleMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.38, 32),
      new THREE.MeshBasicMaterial({
        color: 0xc9a0a8,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      })
    );
    this.rippleMesh.rotation.x = Math.PI / 2;
    this.heartRoot.add(this.rippleMesh);
  }

  private flashObjectSignature(obj: HeartObject): void {
    if (this.reducedMotion) return;
    const entry = this.attached.get(objectKey(obj));
    if (!entry) return;
    const isCherished = objectKey(obj) === this.cherishedKey;
    const colors: Record<string, number> = {
      photo: 0xc4b08a,
      memory: 0xc9a0a8,
      reason: 0x9a8fa8,
      flower: 0xd4b0b8,
      secret: 0x6a5088,
      'love-bomb': 0xd4b0b8
    };
    const light = new THREE.PointLight(colors[obj.type] ?? 0xc9a0a8, isCherished ? 1 : 0.6, isCherished ? 3.5 : 2.5);
    light.position.copy(entry.group.position);
    this.attachedGroup.add(light);
    setTimeout(() => {
      this.attachedGroup.remove(light);
      light.dispose();
    }, isCherished ? 1400 : 900);
  }

  private sendUniverseRipple(): void {
    if (this.reducedMotion) return;
    this.universeRipple = 1;
    const pos = this.particles.geometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const d = Math.sqrt(x * x + y * y + z * z);
      if (d < 3) {
        pos.setXYZ(i, x * 1.04, y * 1.04, z * 1.04);
      }
    }
    pos.needsUpdate = true;
  }

  private updateHeartRichness(): void {
    const count = this.attached.size;
    const richness = Math.min(1, count / 6);
    const particleMat = this.particles.material as THREE.PointsMaterial;
    particleMat.opacity = 0.12 + richness * 0.18;
    this.heartMat.emissiveIntensity = 0.14 + richness * 0.08;
  }

  private updatePointerProximity(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const heartHits = this.raycaster.intersectObject(this.heartMesh, true);
    const dist = heartHits.length > 0 ? heartHits[0].distance : 12;
    const prox = THREE.MathUtils.clamp(1 - dist / 10, 0, 1);
    this.pointerProximity += (prox - this.pointerProximity) * 0.08;
    if (prox > 0.2) {
      this.targetCameraZ = THREE.MathUtils.lerp(this.targetCameraZ, 5.6 - prox * 0.4, 0.02);
    }
  }

  private burstFlowerPetals(center: THREE.Vector3): void {
    if (this.reducedMotion) return;
    for (let i = 0; i < 6; i++) {
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xc9a0a8, transparent: true, opacity: 0.7 })
      );
      petal.position.copy(center);
      this.attachedGroup.add(petal);
      const angle = (i / 6) * Math.PI * 2;
      const end = center.clone().add(new THREE.Vector3(Math.cos(angle) * 0.2, Math.sin(angle) * 0.15, 0.05));
      const start = performance.now();
      const animate = (): void => {
        const t = Math.min(1, (performance.now() - start) / 600);
        petal.position.lerpVectors(center, end, t);
        (petal.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t);
        if (t < 1) requestAnimationFrame(animate);
        else {
          this.attachedGroup.remove(petal);
          petal.geometry.dispose();
          (petal.material as THREE.Material).dispose();
        }
      };
      animate();
    }
  }

  private burstLoveBomb(center: THREE.Vector3): void {
    if (this.reducedMotion) return;
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xd4b0b8, transparent: true, opacity: 0.5 })
    );
    flash.position.copy(center);
    this.attachedGroup.add(flash);
    const start = performance.now();
    const animate = (): void => {
      const t = Math.min(1, (performance.now() - start) / 400);
      flash.scale.setScalar(1 + t * 2);
      (flash.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
      if (t < 1) requestAnimationFrame(animate);
      else {
        this.attachedGroup.remove(flash);
        flash.geometry.dispose();
        (flash.material as THREE.Material).dispose();
      }
    };
    animate();
  }

  private createTrail(from: THREE.Vector3, to: THREE.Vector3): THREE.Points {
    const count = 12;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      positions[i * 3] = THREE.MathUtils.lerp(from.x, to.x, t);
      positions[i * 3 + 1] = THREE.MathUtils.lerp(from.y, to.y, t);
      positions[i * 3 + 2] = THREE.MathUtils.lerp(from.z, to.z, t);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xc9a0a8, size: 0.04, transparent: true, opacity: 0.6 })
    );
  }

  private createHeartGeometry(): THREE.LatheGeometry {
    const points: THREE.Vector2[] = [];
    for (let t = 0; t <= Math.PI * 2; t += 0.08) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      points.push(new THREE.Vector2(x * 0.012, y * 0.012));
    }
    return new THREE.LatheGeometry(points, 64);
  }

  private createStarfield(count: number): THREE.Points {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xf5f0e8, size: 0.03, transparent: true, opacity: 0.5 })
    );
  }

  private createAmbientParticles(count: number): THREE.Points {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xc9a0a8, size: 0.02, transparent: true, opacity: 0.25 })
    );
  }

  private animate = (): void => {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.animate);

    const elapsed = this.clock.getElapsedTime();
    const dt = this.clock.getDelta();
    const slow = this.timeScale;

    // Heart entry animation must run even when off-screen (e.g. after "Let's make one")
    if (this.phase === 'entering' && !this.reducedMotion) {
      this.introProgress = Math.min(1, this.introProgress + dt * 0.55);
      const eased = 1 - Math.pow(1 - this.introProgress, 3);
      this.heartRoot.scale.setScalar(THREE.MathUtils.lerp(0.15, 1, eased));
      this.targetCameraZ = THREE.MathUtils.lerp(8.5, 5.8, eased);
      if (this.introProgress >= 1) this.setPhase('creating');
    }

    if (!this.visible) {
      if (this.phase === 'entering' || this.phase === 'creating') {
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }

    this.cameraZ += (this.targetCameraZ - this.cameraZ) * 0.08;
    this.camera.position.z = this.cameraZ;

    if (!this.reducedMotion) {
      if (!this.isDragging) {
        const interacting = performance.now() < this.interactionUntil;
        if (!interacting) {
          this.targetRotY += 0.0008 * slow;
        }
        this.rotVelX *= 0.92;
        this.rotVelY *= 0.92;
      }
      this.rotX += (this.targetRotX - this.rotX) * 0.08;
      this.rotY += (this.targetRotY - this.rotY) * 0.08;
      this.heartRoot.rotation.x = this.rotX;
      this.heartRoot.rotation.y = this.rotY;

      const breath = 1 + Math.sin(elapsed * 1.05) * 0.012;
      const pulse = this.pulseAmount > 0 ? 1 + this.pulseAmount * 0.05 * Math.sin(this.pulseAmount * Math.PI) : 0;
      this.heartMesh.scale.setScalar(this.heartScale * breath * (1 + pulse));
      if (this.pulseAmount > 0) this.pulseAmount = Math.max(0, this.pulseAmount - dt * 1.5);

      const warmth = 0.14 + Math.sin(elapsed * 0.55) * 0.025 + this.pulseAmount * 0.1
        + this.pointerProximity * 0.06 + this.universeRipple * 0.08;
      this.heartMat.emissiveIntensity = warmth;

      if (this.rippleMesh) {
        const s = 1 + (1 - this.pulseAmount) * 0.5;
        this.rippleMesh.scale.set(s, s, s);
        (this.rippleMesh.material as THREE.MeshBasicMaterial).opacity = this.pulseAmount * 0.35;
        if (this.pulseAmount <= 0.05) {
          this.heartRoot.remove(this.rippleMesh);
          this.rippleMesh.geometry.dispose();
          (this.rippleMesh.material as THREE.Material).dispose();
          this.rippleMesh = undefined;
        }
      }

      for (const entry of this.pool.values()) {
        const f = elapsed * 0.6 + entry.floatPhase;
        entry.group.position.y = entry.orbit.position.y + Math.sin(f) * 0.06;
        entry.group.rotation.y = entry.orbit.rotation.y + Math.sin(f * 0.5) * 0.08;

        if (this.poolHighlight) {
          const pulse = 1 + Math.sin(elapsed * 2.2 + entry.floatPhase) * 0.08;
          const isHovered = this.hoveredKey === entry.key;
          entry.group.scale.setScalar(isHovered ? 1.12 * pulse : pulse);
        }
      }

      for (const entry of this.attached.values()) {
        const f = elapsed * 0.4 + entry.key.length * 0.1;
        entry.group.position.y += Math.sin(f) * 0.0008;
      }

      this.stars.rotation.y = elapsed * 0.008;
      this.particles.rotation.y = -elapsed * 0.012;

      if (this.universeRipple > 0) {
        this.universeRipple = Math.max(0, this.universeRipple - dt * 0.45);
        const starMat = this.stars.material as THREE.PointsMaterial;
        starMat.opacity = 0.35 + this.universeRipple * 0.25;
      }

      for (const child of this.echoGroup.children) {
        if (child instanceof THREE.Mesh && child.userData['echoAngle'] != null) {
          const a = child.userData['echoAngle'] as number;
          child.position.x = Math.cos(a + elapsed * 0.15) * 1.8;
          child.position.z = Math.sin(a + elapsed * 0.15) * 1.2;
        }
      }

      for (let mi = 0; mi < this.journeyMarkers.length; mi++) {
        const marker = this.journeyMarkers[mi];
        const pulse = 0.9 + Math.sin(elapsed * 2 + mi) * 0.1;
        marker.scale.setScalar(pulse);
      }
    }

    this.updateFlyTasks();

    this.renderer.render(this.scene, this.camera);
  };

  private updateFlyTasks(): void {
    const now = performance.now();
    this.flyTasks = this.flyTasks.filter(task => {
      const t = THREE.MathUtils.clamp((now - task.start) / task.duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      task.group.position.lerpVectors(task.from, task.to, eased);
      const scale = THREE.MathUtils.lerp(task.fromScale, task.toScale, eased);
      task.group.scale.setScalar(scale);
      if (task.trail) {
        (task.trail.material as THREE.PointsMaterial).opacity = (1 - t) * 0.5;
      }
      if (t >= 1) {
        if (task.trail) {
          task.group.remove(task.trail);
          task.trail.geometry.dispose();
          (task.trail.material as THREE.Material).dispose();
        }
        task.onComplete();
        return false;
      }
      return true;
    });
  };
}
