import * as THREE from 'three';
import { HeartObject } from '../../core/experience/experience-state.types';
import {
  ambientParticleCount,
  buildPersonalizedOrigins,
  resolveParticleCapacity
} from '../../core/experience/finale-particle-budget';
import { QualityLevel } from '../../core/services/quality.service';
import { buildObjectMesh, disposeGroup, objectKey } from '../our-little-heart/heart-object-meshes';
import { createHeartLatheGeometry, createHeartMaterial } from './heart-geometry.util';
import { FinaleParticleSystem, ParticleKind, ParticleOrigin } from './finale-particle-system';

export type FinaleScenePhase =
  | 'idle'
  | 'hold'
  | 'glow'
  | 'detach'
  | 'dissolve'
  | 'spread'
  | 'pullback'
  | 'silence'
  | 'converge'
  | 'giant'
  | 'complete';

export interface FinaleSceneCallbacks {
  onPhase?: (phase: FinaleScenePhase) => void;
  onDetachObject?: (obj: HeartObject, index: number) => void;
  onPulse?: () => void;
}

interface AttachedVisual {
  key: string;
  object: HeartObject;
  group: THREE.Group;
  detached: boolean;
}

/** Tracks cancellable RAF loops, timeouts, and timeline generation. */
class SceneLifecycle {
  private generation = 0;
  private cancelled = false;
  private readonly rafIds = new Set<number>();
  private readonly timeoutIds = new Set<ReturnType<typeof setTimeout>>();

  begin(): number {
    this.cancelled = false;
    return ++this.generation;
  }

  cancel(): void {
    this.cancelled = true;
    this.generation++;
    this.rafIds.forEach(id => cancelAnimationFrame(id));
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.rafIds.clear();
    this.timeoutIds.clear();
  }

  isActive(gen: number): boolean {
    return !this.cancelled && gen === this.generation;
  }

  raf(callback: FrameRequestCallback): number {
    const id = requestAnimationFrame(time => {
      this.rafIds.delete(id);
      callback(time);
    });
    this.rafIds.add(id);
    return id;
  }

  wait(ms: number, gen: number): Promise<void> {
    if (!this.isActive(gen)) return Promise.resolve();
    return new Promise<void>(resolve => {
      const id = setTimeout(() => {
        this.timeoutIds.delete(id);
        resolve();
      }, ms);
      this.timeoutIds.add(id);
    });
  }

  animate(
    gen: number,
    duration: number,
    update: (t: number) => void,
    onComplete?: () => void
  ): Promise<void> {
    if (!this.isActive(gen)) return Promise.resolve();
    const start = performance.now();
    return new Promise<void>(resolve => {
      const step = (): void => {
        if (!this.isActive(gen)) {
          resolve();
          return;
        }
        const t = Math.min(1, (performance.now() - start) / duration);
        update(t);
        if (t < 1) {
          this.raf(step);
        } else {
          onComplete?.();
          resolve();
        }
      };
      this.raf(step);
    });
  }
}

export class FinaleTransformationScene {
  private readonly container: HTMLElement;
  private readonly reducedMotion: boolean;
  private readonly mobile: boolean;
  private readonly particleScale: number;
  private readonly qualityLevel: QualityLevel;
  private callbacks: FinaleSceneCallbacks = {};
  private readonly lifecycle = new SceneLifecycle();

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private heartRoot!: THREE.Group;
  private heartMesh!: THREE.Mesh;
  private heartMat!: THREE.MeshPhysicalMaterial;
  private attachedGroup!: THREE.Group;
  private particles!: FinaleParticleSystem;
  private stars!: THREE.Points;
  private particleCapacity = 0;
  private heartObjects: HeartObject[] = [];

  private attached: AttachedVisual[] = [];
  private phase: FinaleScenePhase = 'idle';
  private animationId = 0;
  private running = false;
  private visible = true;
  private clock = new THREE.Clock();
  private secretTimeout?: ReturnType<typeof setTimeout>;

  private cameraZ = 6;
  private targetCameraZ = 6;
  private heartGlow = 0;
  private heartVisible = true;
  private rotY = 0;

  private timelineRunning = false;
  private disposed = false;

  constructor(
    container: HTMLElement,
    reducedMotion = false,
    mobile = false,
    particleScale = 1,
    qualityLevel: QualityLevel = 'high'
  ) {
    this.container = container;
    this.reducedMotion = reducedMotion;
    this.mobile = mobile;
    this.particleScale = particleScale;
    this.qualityLevel = qualityLevel;
  }

  setCallbacks(cb: FinaleSceneCallbacks): void {
    this.callbacks = cb;
  }

  init(): void {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050308, 0.025);

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
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xf5f0e8, 0.2));
    const key = new THREE.DirectionalLight(0xf5e8ec, 1);
    key.position.set(3, 4, 5);
    this.scene.add(key);
    const rim = new THREE.PointLight(0xc9a0a8, 0.8, 18);
    rim.position.set(-2, 1, 3);
    this.scene.add(rim);

    const starCount = this.mobile ? 300 : 500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 50;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 35;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 50 - 12;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xf5f0e8, size: 0.03, transparent: true, opacity: 0.45 })
    );
    this.scene.add(this.stars);

    const rawCapacity = Math.round(
      (this.mobile ? 800 : this.reducedMotion ? 500 : 2800) * this.particleScale
    );
    this.particleCapacity = resolveParticleCapacity({
      objects: [],
      capacity: rawCapacity,
      quality: this.qualityLevel,
      reducedMotion: this.reducedMotion,
      mobile: this.mobile
    });
    this.particles = new FinaleParticleSystem(this.particleCapacity);
    this.particles.setSize(this.mobile ? 32 : 42);
    this.scene.add(this.particles.points);

    this.heartRoot = new THREE.Group();
    this.scene.add(this.heartRoot);

    this.heartMesh = new THREE.Mesh(createHeartLatheGeometry(), createHeartMaterial());
    this.heartMat = this.heartMesh.material as THREE.MeshPhysicalMaterial;
    this.heartMesh.scale.setScalar(0.38);
    this.heartRoot.add(this.heartMesh);

    this.attachedGroup = new THREE.Group();
    this.heartRoot.add(this.attachedGroup);

    this.targetCameraZ = 6.2;
    this.cameraZ = 6.8;

    window.addEventListener('resize', this.onResize);
  }

  async loadExactHeart(objects: HeartObject[]): Promise<void> {
    this.heartObjects = objects;
    const quality = this.mobile ? 'mobile' : 'desktop';
    for (const obj of objects) {
      const group = await buildObjectMesh(obj, quality);
      if (obj.position) group.position.set(obj.position.x, obj.position.y, obj.position.z);
      if (obj.rotation) group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
      group.scale.setScalar((obj.scale ?? 1) * 0.85);
      group.userData['key'] = objectKey(obj);
      this.attachedGroup.add(group);
      this.attached.push({ key: objectKey(obj), object: obj, group, detached: false });
    }
  }

  async playTransformation(): Promise<void> {
    if (this.timelineRunning || this.disposed) return;
    this.timelineRunning = true;
    const gen = this.lifecycle.begin();

    const wait = (ms: number) =>
      this.lifecycle.wait(this.reducedMotion ? ms * 0.35 : ms, gen);
    const setPhase = (p: FinaleScenePhase) => {
      if (!this.lifecycle.isActive(gen)) return;
      this.setPhase(p);
    };

    setPhase('hold');
    await wait(2800);
    if (!this.lifecycle.isActive(gen)) return;

    setPhase('glow');
    await this.animateGlow(2200, gen);
    if (!this.lifecycle.isActive(gen)) return;

    setPhase('detach');
    await this.detachAllObjects(gen);
    if (!this.lifecycle.isActive(gen)) return;

    setPhase('dissolve');
    await wait(800);
    await this.dissolveHeart(gen);
    if (!this.lifecycle.isActive(gen)) return;

    setPhase('spread');
    this.spawnParticlesFromAttached();
    this.particles.beginSpread(this.reducedMotion ? 0.6 : 1);
    await wait(3200);
    if (!this.lifecycle.isActive(gen)) return;

    setPhase('pullback');
    this.targetCameraZ = 11;
    await wait(2400);
    if (!this.lifecycle.isActive(gen)) return;

    setPhase('silence');
    await wait(1400);
    if (!this.lifecycle.isActive(gen)) return;

    setPhase('converge');
    this.particles.beginConverge(this.reducedMotion ? 1.8 : 2.8);
    await wait(5200);
    if (!this.lifecycle.isActive(gen)) return;

    setPhase('giant');
    this.targetCameraZ = 4.2;
    await wait(1800);
    await this.pulseHeart(2, gen);
    if (!this.lifecycle.isActive(gen)) return;

    setPhase('complete');
    this.timelineRunning = false;
  }

  cancel(): void {
    this.lifecycle.cancel();
    this.timelineRunning = false;
    if (this.secretTimeout) {
      clearTimeout(this.secretTimeout);
      this.secretTimeout = undefined;
    }
  }

  triggerSecretExplosion(): void {
    if (this.disposed) return;
    this.particles.beginBurst();
    this.targetCameraZ = 7;
    if (this.secretTimeout) clearTimeout(this.secretTimeout);
    this.secretTimeout = setTimeout(() => {
      if (!this.disposed) this.particles.formSmallHeart();
    }, 2200);
  }

  resize(): void {
    if (!this.renderer || !this.camera) return;
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.animate();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    if (v && !this.running && !this.disposed) this.start();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancel();
    this.stop();
    window.removeEventListener('resize', this.onResize);
    for (const a of this.attached) disposeGroup(a.group);
    this.heartMesh.geometry.dispose();
    this.heartMat.dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.particles.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private setPhase(phase: FinaleScenePhase): void {
    this.phase = phase;
    this.callbacks.onPhase?.(phase);
  }

  private async animateGlow(duration: number, gen: number): Promise<void> {
    await this.lifecycle.animate(
      gen,
      duration,
      t => {
        this.heartGlow = t;
        this.heartMat.emissiveIntensity = 0.22 + t * 0.45;
      }
    );
  }

  private async detachAllObjects(gen: number): Promise<void> {
    const stagger = this.reducedMotion ? 120 : 380;
    for (let i = 0; i < this.attached.length; i++) {
      if (!this.lifecycle.isActive(gen)) return;
      const item = this.attached[i];
      if (item.detached) continue;
      item.detached = true;
      this.callbacks.onDetachObject?.(item.object, i);

      const start = item.group.position.clone();
      const dir = start.clone().normalize();
      if (dir.length() < 0.01) dir.set(0, 1, 0.3);
      const end = start.clone().add(dir.multiplyScalar(0.6));

      await this.animateGroup(item.group, start, end, stagger, gen);
      item.group.visible = false;
    }
  }

  private async dissolveHeart(gen: number): Promise<void> {
    const duration = this.reducedMotion ? 500 : 1400;
    await this.lifecycle.animate(
      gen,
      duration,
      t => {
        this.heartMat.opacity = 0.96 * (1 - t);
        this.heartMesh.scale.setScalar(0.38 * (1 + t * 0.15));
      },
      () => {
        this.heartVisible = false;
        this.heartRoot.visible = false;
      }
    );
  }

  private spawnParticlesFromAttached(): void {
    const worldOrigins: ParticleOrigin[] = [];
    for (const item of this.attached) {
      const wp = new THREE.Vector3();
      item.group.getWorldPosition(wp);
      const local = this.heartRoot.worldToLocal(wp.clone());
      const kind = (item.object.type as ParticleKind) || 'generic';
      worldOrigins.push({ x: local.x, y: local.y, z: local.z, kind });
    }

    const budgetOrigins = buildPersonalizedOrigins({
      objects: this.heartObjects.map((obj, i) => {
        const wp = worldOrigins[i];
        if (wp) {
          return { ...obj, position: { x: wp.x, y: wp.y, z: wp.z } };
        }
        return obj;
      }),
      capacity: this.particleCapacity,
      quality: this.qualityLevel,
      reducedMotion: this.reducedMotion,
      mobile: this.mobile
    });

    if (budgetOrigins.length === 0) {
      budgetOrigins.push({ x: 0, y: 0, z: 0, kind: 'generic', count: 80 });
    }

    const personalized = this.particles.spawnFromOrigins(budgetOrigins);
    const ambient = ambientParticleCount(this.particleCapacity, personalized);
    if (ambient > 0) {
      this.particles.fillAmbient(personalized);
    }
  }

  private async pulseHeart(count: number, gen: number): Promise<void> {
    const baseSize = this.mobile ? 32 : 42;
    for (let i = 0; i < count; i++) {
      if (!this.lifecycle.isActive(gen)) return;
      this.callbacks.onPulse?.();
      await this.lifecycle.animate(gen, 600, t => {
        const pulse = Math.sin(Math.min(t, 1) * Math.PI) * 0.12;
        this.particles.pulseSize(1 + pulse);
      });
      this.particles.pulseSize(1);
      await this.lifecycle.wait(400, gen);
    }
  }

  private animateGroup(
    group: THREE.Group,
    from: THREE.Vector3,
    to: THREE.Vector3,
    duration: number,
    gen: number
  ): Promise<void> {
    const startScale = group.scale.x;
    return this.lifecycle.animate(gen, duration, t => {
      const eased = 1 - Math.pow(1 - t, 3);
      group.position.lerpVectors(from, to, eased);
      group.scale.setScalar(startScale * (1 - eased * 0.2));
    });
  }

  private onResize = (): void => this.resize();

  private animate = (): void => {
    if (!this.running || this.disposed) return;
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.visible) return;

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.cameraZ += (this.targetCameraZ - this.cameraZ) * 0.04;
    this.camera.position.z = this.cameraZ;

    if (this.heartVisible) {
      this.rotY += 0.003;
      this.heartRoot.rotation.y = this.rotY;
      const breath = 1 + Math.sin(elapsed * 1.1) * 0.015;
      this.heartMesh.scale.setScalar(0.38 * breath * (1 + this.heartGlow * 0.04));
    }

    this.stars.rotation.y = elapsed * 0.006;
    this.particles.update(dt, this.phase === 'silence' ? 0.15 : 1);

    this.renderer.render(this.scene, this.camera);
  };
}
