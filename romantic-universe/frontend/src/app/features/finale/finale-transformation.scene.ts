import * as THREE from 'three';
import { HeartObject } from '../../core/experience/experience-state.types';
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

export class FinaleTransformationScene {
  private readonly container: HTMLElement;
  private readonly reducedMotion: boolean;
  private readonly mobile: boolean;
  private readonly particleScale: number;
  private callbacks: FinaleSceneCallbacks = {};

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private heartRoot!: THREE.Group;
  private heartMesh!: THREE.Mesh;
  private heartMat!: THREE.MeshPhysicalMaterial;
  private attachedGroup!: THREE.Group;
  private particles!: FinaleParticleSystem;
  private stars!: THREE.Points;

  private attached: AttachedVisual[] = [];
  private phase: FinaleScenePhase = 'idle';
  private animationId = 0;
  private running = false;
  private visible = true;
  private clock = new THREE.Clock();

  private cameraZ = 6;
  private targetCameraZ = 6;
  private heartGlow = 0;
  private heartVisible = true;
  private pulseCount = 0;
  private rotY = 0;

  private timelineRunning = false;

  constructor(
    container: HTMLElement,
    reducedMotion = false,
    mobile = false,
    particleScale = 1
  ) {
    this.container = container;
    this.reducedMotion = reducedMotion;
    this.mobile = mobile;
    this.particleScale = particleScale;
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

    const particleCount = Math.round(
      (this.mobile ? 600 : this.reducedMotion ? 400 : 1800) * this.particleScale
    );
    this.particles = new FinaleParticleSystem(particleCount);
    this.particles.setSize(this.mobile ? 0.03 : 0.04);
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
    if (this.timelineRunning) return;
    this.timelineRunning = true;

    const wait = (ms: number) => this.pause(this.reducedMotion ? ms * 0.35 : ms);
    const setPhase = (p: FinaleScenePhase) => this.setPhase(p);

    setPhase('hold');
    await wait(2800);

    setPhase('glow');
    await this.animateGlow(2200);

    setPhase('detach');
    await this.detachAllObjects();

    setPhase('dissolve');
    await wait(800);
    await this.dissolveHeart();

    setPhase('spread');
    this.spawnParticlesFromAttached();
    this.particles.beginSpread(this.reducedMotion ? 0.6 : 1);
    await wait(3200);

    setPhase('pullback');
    this.targetCameraZ = 11;
    await wait(2400);

    setPhase('silence');
    await wait(1400);

    setPhase('converge');
    this.particles.beginConverge(this.reducedMotion ? 1.8 : 2.8);
    await wait(5200);

    setPhase('giant');
    this.targetCameraZ = 4.2;
    await wait(1800);
    await this.pulseHeart(2);
    setPhase('complete');
  }

  triggerSecretExplosion(): void {
    this.particles.beginBurst();
    this.targetCameraZ = 7;
    setTimeout(() => {
      this.particles.formSmallHeart();
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
    if (this.running) return;
    this.running = true;
    this.animate();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    if (v && !this.running) this.start();
  }

  dispose(): void {
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

  private async animateGlow(duration: number): Promise<void> {
    const start = performance.now();
    await new Promise<void>(resolve => {
      const step = (): void => {
        const t = Math.min(1, (performance.now() - start) / duration);
        this.heartGlow = t;
        this.heartMat.emissiveIntensity = 0.22 + t * 0.45;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      step();
    });
  }

  private async detachAllObjects(): Promise<void> {
    const stagger = this.reducedMotion ? 120 : 380;
    for (let i = 0; i < this.attached.length; i++) {
      const item = this.attached[i];
      if (item.detached) continue;
      item.detached = true;
      this.callbacks.onDetachObject?.(item.object, i);

      const start = item.group.position.clone();
      const dir = start.clone().normalize();
      if (dir.length() < 0.01) dir.set(0, 1, 0.3);
      const end = start.clone().add(dir.multiplyScalar(0.6));

      await this.animateGroup(item.group, start, end, stagger);
      item.group.visible = false;
    }
  }

  private async dissolveHeart(): Promise<void> {
    const duration = this.reducedMotion ? 500 : 1400;
    const start = performance.now();
    await new Promise<void>(resolve => {
      const step = (): void => {
        const t = Math.min(1, (performance.now() - start) / duration);
        this.heartMat.opacity = 0.96 * (1 - t);
        this.heartMesh.scale.setScalar(0.38 * (1 + t * 0.15));
        if (t < 1) requestAnimationFrame(step);
        else {
          this.heartVisible = false;
          this.heartRoot.visible = false;
          resolve();
        }
      };
      step();
    });
  }

  private spawnParticlesFromAttached(): void {
    const origins: ParticleOrigin[] = [];
    for (const item of this.attached) {
      const wp = new THREE.Vector3();
      item.group.getWorldPosition(wp);
      const local = this.heartRoot.worldToLocal(wp.clone());
      const kind = (item.object.type as ParticleKind) || 'generic';
      const per = this.mobile ? 8 : 14;
      for (let j = 0; j < per; j++) {
        origins.push({ x: local.x, y: local.y, z: local.z, kind });
      }
    }
    if (origins.length === 0) {
      origins.push({ x: 0, y: 0, z: 0, kind: 'generic' });
    }
    this.particles.spawnFromOrigins(origins, 1);
  }

  private async pulseHeart(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      this.callbacks.onPulse?.();
      const start = performance.now();
      await new Promise<void>(resolve => {
        const step = (): void => {
          const t = (performance.now() - start) / 600;
          const pulse = Math.sin(Math.min(t, 1) * Math.PI) * 0.08;
          (this.particles.points.material as THREE.PointsMaterial).size =
            (this.mobile ? 0.03 : 0.04) * (1 + pulse);
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        step();
      });
      await this.pause(400);
    }
  }

  private animateGroup(
    group: THREE.Group,
    from: THREE.Vector3,
    to: THREE.Vector3,
    duration: number
  ): Promise<void> {
    return new Promise(resolve => {
      const start = performance.now();
      const step = (): void => {
        const t = Math.min(1, (performance.now() - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        group.position.lerpVectors(from, to, eased);
        group.scale.setScalar(group.scale.x * (1 - eased * 0.2));
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      step();
    });
  }

  private pause(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  private onResize = (): void => this.resize();

  private animate = (): void => {
    if (!this.running) return;
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
