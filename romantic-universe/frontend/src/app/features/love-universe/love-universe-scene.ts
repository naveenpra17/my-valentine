import * as THREE from 'three';

export class LoveUniverseScene {
  private readonly container: HTMLElement;
  private readonly reducedMotion: boolean;

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
  private centerpiece!: THREE.Mesh;

  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  private onMouseMove = (e: MouseEvent | TouchEvent): void => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    this.targetMouseX = (x / window.innerWidth) * 2 - 1;
    this.targetMouseY = -(y / window.innerHeight) * 2 + 1;
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
  }

  init(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a0f14, 0.035);

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    this.camera.position.z = 8;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.classList.add('love-universe-canvas');
    this.container.appendChild(this.renderer.domElement);

    this.addLights();
    this.addStars();
    this.addHearts();
    this.addPetals();
    this.addCenterpiece();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onMouseMove, { passive: true });
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

    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0xf8e8ee, 0.4);
    this.scene.add(ambient);

    const roseLight = new THREE.PointLight(0xe8a0bf, 1.2, 30);
    roseLight.position.set(2, 3, 4);
    this.scene.add(roseLight);

    const lavenderLight = new THREE.PointLight(0xd4b8e8, 0.8, 25);
    lavenderLight.position.set(-3, -1, 3);
    this.scene.add(lavenderLight);
  }

  private addStars(): void {
    const count = this.reducedMotion ? 150 : 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;

      const tint = Math.random() > 0.5 ? 0xe8d5b5 : 0xd4b8e8;
      colors[i * 3] = ((tint >> 16) & 255) / 255;
      colors[i * 3 + 1] = ((tint >> 8) & 255) / 255;
      colors[i * 3 + 2] = (tint & 255) / 255;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });

    this.starPoints = new THREE.Points(geometry, material);
    this.scene.add(this.starPoints);
  }

  private createHeartGeometry(): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    const x = 0, y = 0;
    shape.moveTo(x, y + 0.3);
    shape.bezierCurveTo(x, y + 0.3, x - 0.25, y, x - 0.25, y - 0.15);
    shape.bezierCurveTo(x - 0.25, y - 0.35, x, y - 0.45, x, y - 0.6);
    shape.bezierCurveTo(x, y - 0.45, x + 0.25, y - 0.35, x + 0.25, y - 0.15);
    shape.bezierCurveTo(x + 0.25, y, x, y + 0.3, x, y + 0.3);

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2
    });
  }

  private addHearts(): void {
    const heartGeo = this.createHeartGeometry();
    const count = this.reducedMotion ? 12 : 28;

    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.92 + Math.random() * 0.06, 0.5 + Math.random() * 0.2, 0.55 + Math.random() * 0.15),
        emissive: 0x5c1a2e,
        emissiveIntensity: 0.15,
        metalness: 0.1,
        roughness: 0.6,
        transparent: true,
        opacity: 0.7 + Math.random() * 0.3
      });

      const heart = new THREE.Mesh(heartGeo, material);
      const scale = 0.15 + Math.random() * 0.25;
      heart.scale.set(scale, scale, scale);
      heart.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8 - 2
      );
      heart.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      heart.userData['speed'] = 0.2 + Math.random() * 0.4;
      heart.userData['offset'] = Math.random() * Math.PI * 2;
      this.hearts.push(heart);
      this.scene.add(heart);
    }
  }

  private addPetals(): void {
    const petalGeo = new THREE.PlaneGeometry(0.15, 0.2);
    const count = this.reducedMotion ? 15 : 35;

    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xe8a0bf,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const petal = new THREE.Mesh(petalGeo, material);
      petal.position.set(
        (Math.random() - 0.5) * 16,
        Math.random() * 10 + 2,
        (Math.random() - 0.5) * 6
      );
      petal.rotation.z = Math.random() * Math.PI;
      petal.userData['fallSpeed'] = 0.3 + Math.random() * 0.5;
      petal.userData['sway'] = Math.random() * Math.PI * 2;
      this.petals.push(petal);
      this.scene.add(petal);
    }
  }

  private addCenterpiece(): void {
    const geo = new THREE.TorusKnotGeometry(0.6, 0.18, 100, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe8a0bf,
      emissive: 0xc77d9e,
      emissiveIntensity: 0.4,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.9
    });
    this.centerpiece = new THREE.Mesh(geo, mat);
    this.centerpiece.position.z = -1;
    this.scene.add(this.centerpiece);
  }

  private animate = (): void => {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.animate);

    if (!this.visible) return;

    const elapsed = this.clock.getElapsedTime();

    if (!this.reducedMotion) {
      this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
      this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;
      this.camera.position.x = this.mouseX * 0.8;
      this.camera.position.y = this.mouseY * 0.5;
      this.camera.lookAt(0, 0, 0);

      this.starPoints.rotation.y = elapsed * 0.02;

      for (const heart of this.hearts) {
        const speed = heart.userData['speed'] as number;
        const offset = heart.userData['offset'] as number;
        heart.rotation.x += 0.003 * speed;
        heart.rotation.y += 0.005 * speed;
        heart.position.y += Math.sin(elapsed * speed + offset) * 0.002;
      }

      for (const petal of this.petals) {
        const fallSpeed = petal.userData['fallSpeed'] as number;
        const sway = petal.userData['sway'] as number;
        petal.position.y -= fallSpeed * 0.01;
        petal.position.x += Math.sin(elapsed + sway) * 0.003;
        petal.rotation.z += 0.005;

        if (petal.position.y < -6) {
          petal.position.y = 8;
          petal.position.x = (Math.random() - 0.5) * 16;
        }
      }

      this.centerpiece.rotation.x = elapsed * 0.15;
      this.centerpiece.rotation.y = elapsed * 0.2;
    }

    this.renderer.render(this.scene, this.camera);
  };
}
