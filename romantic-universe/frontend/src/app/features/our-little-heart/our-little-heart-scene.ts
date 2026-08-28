import * as THREE from 'three';
import { HeartObject } from '../../core/experience/experience-state.types';

interface AttachedMesh {
  mesh: THREE.Mesh;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  yOffset: number;
}

export class OurLittleHeartScene {
  private readonly container: HTMLElement;
  private readonly reducedMotion: boolean;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private heartGroup!: THREE.Group;
  private heartMesh!: THREE.Mesh;
  private attached: AttachedMesh[] = [];
  private animationId = 0;
  private running = false;
  private visible = true;
  private clock = new THREE.Clock();

  private rotX = 0;
  private rotY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private readonly colorMap: Record<string, number> = {
    photo: 0xc4b08a,
    memory: 0xc9a0a8,
    reason: 0x9a8fa8,
    quote: 0xf5f0e8,
    'love-bomb': 0xd4b0b8,
    flower: 0xc9a0a8,
    symbol: 0xc4b08a
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.targetRotY += dx * 0.008;
    this.targetRotX += dy * 0.008;
    this.targetRotX = Math.max(-0.6, Math.min(0.6, this.targetRotX));
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.isDragging = false;
    this.renderer.domElement.releasePointerCapture(e.pointerId);
  };

  private onResize = (): void => {
    this.resize();
  };

  resize(): void {
    if (!this.renderer || !this.camera) return;
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  }

  constructor(container: HTMLElement, reducedMotion = false) {
    this.container = container;
    this.reducedMotion = reducedMotion;
  }

  init(): void {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050308, 0.04);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 5.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050308, 0);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xf5f0e8, 0.3));
    const key = new THREE.PointLight(0xc9a0a8, 1.2, 20);
    key.position.set(2, 2, 4);
    this.scene.add(key);
    const fill = new THREE.PointLight(0x9a8fa8, 0.5, 15);
    fill.position.set(-3, -1, 2);
    this.scene.add(fill);

    this.heartGroup = new THREE.Group();
    this.scene.add(this.heartGroup);

    const heartGeo = this.createHeartGeometry();
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xc9a0a8,
      emissive: 0x2a1020,
      emissiveIntensity: 0.35,
      metalness: 0.2,
      roughness: 0.65,
      transparent: true,
      opacity: 0.92
    });
    this.heartMesh = new THREE.Mesh(heartGeo, heartMat);
    this.heartMesh.scale.set(0.35, 0.35, 0.35);
    this.heartGroup.add(this.heartMesh);

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('resize', this.onResize);
    requestAnimationFrame(() => this.resize());
  }

  syncObjects(objects: HeartObject[]): void {
    const key = (o: HeartObject) => `${o.type}-${o.referenceId}`;
    const incoming = new Set(objects.map(key));
    this.attached = this.attached.filter(a => {
      const id = a.mesh.userData['key'] as string;
      if (!incoming.has(id)) {
        this.heartGroup.remove(a.mesh);
        a.mesh.geometry.dispose();
        (a.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });

    const existing = new Set(this.attached.map(a => a.mesh.userData['key'] as string));
    objects.forEach((obj, i) => {
      const k = key(obj);
      if (existing.has(k)) return;

      const color = this.colorMap[obj.type] ?? 0xc9a0a8;
      const geo = new THREE.SphereGeometry(0.06 + (i % 3) * 0.02, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.2,
        metalness: 0.3,
        roughness: 0.5
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData['key'] = k;
      this.heartGroup.add(mesh);

      this.attached.push({
        mesh,
        orbitAngle: (i / Math.max(objects.length, 1)) * Math.PI * 2,
        orbitRadius: 0.55 + (i % 4) * 0.08,
        orbitSpeed: 0.3 + (i % 5) * 0.05,
        yOffset: (i % 2 === 0 ? 1 : -1) * 0.1
      });
    });
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

    this.attached.forEach(a => {
      a.mesh.geometry.dispose();
      (a.mesh.material as THREE.Material).dispose();
    });
    this.heartMesh.geometry.dispose();
    (this.heartMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private createHeartGeometry(): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.3);
    shape.bezierCurveTo(0, 0.3, -0.25, 0, -0.25, -0.15);
    shape.bezierCurveTo(-0.25, -0.35, 0, -0.45, 0, -0.6);
    shape.bezierCurveTo(0, -0.45, 0.25, -0.35, 0.25, -0.15);
    shape.bezierCurveTo(0.25, 0, 0, 0.3, 0, 0.3);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2
    });
  }

  private animate = (): void => {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.visible) return;

    const elapsed = this.clock.getElapsedTime();

    if (!this.reducedMotion) {
      this.rotX += (this.targetRotX - this.rotX) * 0.08;
      this.rotY += (this.targetRotY - this.rotY) * 0.08;
      if (!this.isDragging) {
        this.targetRotY += 0.002;
      }
      this.heartGroup.rotation.x = this.rotX;
      this.heartGroup.rotation.y = this.rotY;

      const pulse = 1 + Math.sin(elapsed * 1.2) * 0.02;
      this.heartMesh.scale.set(0.35 * pulse, 0.35 * pulse, 0.35 * pulse);

      for (const item of this.attached) {
        item.orbitAngle += item.orbitSpeed * 0.01;
        item.mesh.position.x = Math.cos(item.orbitAngle) * item.orbitRadius;
        item.mesh.position.z = Math.sin(item.orbitAngle) * item.orbitRadius * 0.6;
        item.mesh.position.y = item.yOffset + Math.sin(elapsed * item.orbitSpeed + item.orbitAngle) * 0.05;
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
}
