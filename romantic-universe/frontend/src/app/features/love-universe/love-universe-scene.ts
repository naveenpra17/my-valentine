import * as THREE from 'three';
import { detectUniverseQuality, PhotoOrbData, UniverseQuality } from './universe-quality';

interface PhotoOrb {
  group: THREE.Group;
  mesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  orbitPhase: number;
  orbitRadius: number;
  id: number;
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
  private starPoints!: THREE.Points;
  private dustPoints!: THREE.Points;
  private nebulaMesh?: THREE.Mesh;
  private photoOrbs: PhotoOrb[] = [];
  private textureLoader = new THREE.TextureLoader();

  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;
  private scrollProgress = 0;
  private focusOrb: PhotoOrb | null = null;
  private focusAmount = 0;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private cameraBaseZ = 12;
  private cameraTarget = new THREE.Vector3(0, 0, 0);

  private onMouseMove = (e: MouseEvent | TouchEvent): void => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    this.targetMouseX = (x / window.innerWidth) * 2 - 1;
    this.targetMouseY = -(y / window.innerHeight) * 2 + 1;
    this.pointer.x = this.targetMouseX;
    this.pointer.y = this.targetMouseY;
  };

  private onClick = (e: MouseEvent | TouchEvent): void => {
    if ('touches' in e) {
      const t = e.changedTouches[0];
      this.pointer.x = (t.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(t.clientY / window.innerHeight) * 2 + 1;
    }
    this.pickPhoto();
  };

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  constructor(container: HTMLElement, reducedMotion = false) {
    this.container = container;
    this.reducedMotion = reducedMotion;
    this.quality = detectUniverseQuality(reducedMotion);
  }

  init(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050308, 0.028);

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 120);
    this.camera.position.set(0, 0, this.cameraBaseZ);

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
    this.renderer.domElement.addEventListener('click', this.onClick);
    this.renderer.domElement.addEventListener('touchend', this.onClick, { passive: true });
  }

  async loadPhotos(photos: PhotoOrbData[]): Promise<void> {
    const slice = photos.slice(0, this.quality.maxPhotos);
    const angleStep = (Math.PI * 2) / Math.max(slice.length, 1);

    for (let i = 0; i < slice.length; i++) {
      const photo = slice[i];
      const orb = await this.createPhotoOrb(photo, i, angleStep);
      if (orb) {
        this.photoOrbs.push(orb);
        this.scene.add(orb.group);
      }
    }
  }

  setScrollProgress(progress: number): void {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
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
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.renderer.domElement.removeEventListener('touchend', this.onClick);

    this.scene.traverse(obj => {
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
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, 'rgba(80, 40, 70, 0.35)');
    grad.addColorStop(0.4, 'rgba(40, 20, 50, 0.15)');
    grad.addColorStop(1, 'rgba(5, 3, 8, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.SphereGeometry(40, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    this.nebulaMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.nebulaMesh);
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
    const count = this.quality.starCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 8 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = radius * Math.cos(phi) - 8;

      const tint = Math.random() > 0.6 ? 0xc4b08a : 0xc9a0a8;
      colors[i * 3] = ((tint >> 16) & 255) / 255;
      colors[i * 3 + 1] = ((tint >> 8) & 255) / 255;
      colors[i * 3 + 2] = (tint & 255) / 255;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starPoints = new THREE.Points(geometry, material);
    this.scene.add(this.starPoints);
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
    angleStep: number
  ): Promise<PhotoOrb | null> {
    const group = new THREE.Group();
    const orbitRadius = 5 + (index % 3) * 1.2;
    const angle = index * angleStep;
    const y = (index % 2 === 0 ? 1 : -1) * (0.8 + (index % 3) * 0.5);
    const z = -2 - (index % 4) * 1.5;

    const basePosition = new THREE.Vector3(
      Math.cos(angle) * orbitRadius,
      y,
      z + Math.sin(angle) * 2
    );
    group.position.copy(basePosition);

    // Frame backing
    const frameGeo = new THREE.PlaneGeometry(1.6, 2);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xf5f0e8,
      emissive: 0x1a1020,
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.8,
      transparent: true,
      opacity: 0.9
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -0.02;
    group.add(frame);

    const photoGeo = new THREE.PlaneGeometry(1.4, 1.75);
    let photoMat: THREE.MeshBasicMaterial;

    try {
      const texture = await this.loadTexture(photo.imageUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      photoMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95
      });
    } catch {
      photoMat = new THREE.MeshBasicMaterial({
        color: 0x3d1a28,
        transparent: true,
        opacity: 0.7
      });
    }

    const mesh = new THREE.Mesh(photoGeo, photoMat);
    mesh.userData['photoId'] = photo.id;
    group.add(mesh);

    // Subtle glow
    const glowGeo = new THREE.PlaneGeometry(1.8, 2.2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xc9a0a8,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -0.05;
    group.add(glow);

    group.rotation.y = -angle + Math.PI / 2;

    return {
      group,
      mesh,
      basePosition,
      orbitPhase: angle,
      orbitRadius,
      id: photo.id
    };
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(url, resolve, undefined, reject);
    });
  }

  private pickPhoto(): void {
    if (this.photoOrbs.length === 0) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.photoOrbs.map(o => o.mesh);
    const hits = this.raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const orb = this.photoOrbs.find(o => o.mesh === hitMesh) ?? null;
      this.focusOrb = this.focusOrb === orb ? null : orb;
    }
  }

  private animate = (): void => {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.visible) return;

    const elapsed = this.clock.getElapsedTime();

    if (!this.reducedMotion) {
      this.updateCamera(elapsed);
      this.updateStars(elapsed);
      this.updateDust(elapsed);
      this.updateHearts(elapsed);
      this.updatePetals(elapsed);
      this.updatePhotoOrbs(elapsed);
      if (this.nebulaMesh) {
        this.nebulaMesh.rotation.y = elapsed * 0.008;
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateCamera(elapsed: number): void {
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04;

    const scrollPull = this.scrollProgress * 4;
    const driftX = Math.sin(elapsed * 0.12) * 0.4;
    const driftY = Math.cos(elapsed * 0.09) * 0.25;

    let targetZ = this.cameraBaseZ - scrollPull;
    let lookAt = this.cameraTarget.clone();

    if (this.focusOrb) {
      this.focusAmount = Math.min(1, this.focusAmount + 0.02);
      const worldPos = new THREE.Vector3();
      this.focusOrb.group.getWorldPosition(worldPos);
      lookAt.lerp(worldPos, this.focusAmount * 0.6);
      targetZ = THREE.MathUtils.lerp(targetZ, 6, this.focusAmount * 0.5);
    } else {
      this.focusAmount = Math.max(0, this.focusAmount - 0.03);
    }

    this.camera.position.x = this.mouseX * 1.2 + driftX;
    this.camera.position.y = this.mouseY * 0.7 + driftY - this.scrollProgress * 0.5;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, 0.03);
    this.camera.lookAt(lookAt);
  }

  private updateStars(elapsed: number): void {
    this.starPoints.rotation.y = elapsed * 0.015;
    const pos = this.starPoints.geometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setY(i, y + Math.sin(elapsed * 0.5 + i) * 0.0003);
    }
    pos.needsUpdate = true;
  }

  private updateDust(elapsed: number): void {
    this.dustPoints.rotation.y = elapsed * 0.008;
    const pos = this.dustPoints.geometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let z = pos.getZ(i);
      z += 0.003;
      if (z > 5) z = -15;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
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

  private updatePhotoOrbs(elapsed: number): void {
    for (const orb of this.photoOrbs) {
      const isFocused = this.focusOrb === orb;
      const floatY = Math.sin(elapsed * 0.4 + orb.orbitPhase) * 0.15;
      const floatX = Math.cos(elapsed * 0.25 + orb.orbitPhase) * 0.1;

      orb.group.position.x = orb.basePosition.x + floatX;
      orb.group.position.y = orb.basePosition.y + floatY;
      orb.group.position.z = orb.basePosition.z;

      const targetScale = isFocused ? 1.15 : 1;
      const s = orb.group.scale.x + (targetScale - orb.group.scale.x) * 0.05;
      orb.group.scale.set(s, s, s);

      orb.group.rotation.y += isFocused ? 0.002 : 0.004;
      orb.group.lookAt(this.camera.position);
    }
  }
}
