import * as THREE from 'three';
import { generateHeartPoints3D } from './heart-geometry.util';

export type ParticleKind =
  | 'photo'
  | 'memory'
  | 'quote'
  | 'reason'
  | 'flower'
  | 'secret'
  | 'love-bomb'
  | 'generic';

export interface ParticleOrigin {
  x: number;
  y: number;
  z: number;
  kind: ParticleKind;
  color?: THREE.ColorRepresentation;
}

const KIND_COLORS: Record<ParticleKind, number> = {
  photo: 0xc4b08a,
  memory: 0xc9a0a8,
  quote: 0xf5f0e8,
  reason: 0x9a8fa8,
  flower: 0xd4b0b8,
  secret: 0x6a5088,
  'love-bomb': 0xd4b0b8,
  generic: 0xc9a0a8
};

export class FinaleParticleSystem {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly targets: Float32Array;
  private readonly alphas: Float32Array;
  private readonly kinds: ParticleKind[];
  private readonly count: number;
  private mode: 'idle' | 'spread' | 'converge' | 'burst' = 'idle';
  private convergeTargets: THREE.Vector3[] = [];

  constructor(maxCount: number) {
    this.count = maxCount;
    this.positions = new Float32Array(maxCount * 3);
    this.velocities = new Float32Array(maxCount * 3);
    this.targets = new Float32Array(maxCount * 3);
    this.alphas = new Float32Array(maxCount);
    this.kinds = new Array(maxCount).fill('generic');

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xf5f0e8,
        size: 0.04,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    this.points.frustumCulled = false;
  }

  spawnFromOrigins(origins: ParticleOrigin[], perOrigin: number): void {
    let idx = 0;
    for (const origin of origins) {
      for (let j = 0; j < perOrigin && idx < this.count; j++, idx++) {
        const i3 = idx * 3;
        this.positions[i3] = origin.x + (Math.random() - 0.5) * 0.05;
        this.positions[i3 + 1] = origin.y + (Math.random() - 0.5) * 0.05;
        this.positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.05;
        this.velocities[i3] = 0;
        this.velocities[i3 + 1] = 0;
        this.velocities[i3 + 2] = 0;
        this.alphas[idx] = 1;
        this.kinds[idx] = origin.kind;
      }
    }
    for (; idx < this.count; idx++) {
      this.alphas[idx] = 0;
    }
    this.points.geometry.attributes['position'].needsUpdate = true;
  }

  beginSpread(intensity = 1): void {
    this.mode = 'spread';
    for (let i = 0; i < this.count; i++) {
      if (this.alphas[i] <= 0) continue;
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.5) * Math.PI;
      const speed = (0.02 + Math.random() * 0.04) * intensity;
      this.velocities[i3] = Math.cos(angle) * Math.cos(elev) * speed;
      this.velocities[i3 + 1] = Math.sin(elev) * speed;
      this.velocities[i3 + 2] = Math.sin(angle) * Math.cos(elev) * speed;
    }
  }

  beginConverge(scale = 2.5): void {
    this.mode = 'converge';
    this.convergeTargets = generateHeartPoints3D(this.count, scale);
    for (let i = 0; i < this.count; i++) {
      const t = this.convergeTargets[i % this.convergeTargets.length];
      const i3 = i * 3;
      this.targets[i3] = t.x;
      this.targets[i3 + 1] = t.y;
      this.targets[i3 + 2] = t.z;
    }
  }

  beginBurst(): void {
    this.mode = 'burst';
    for (let i = 0; i < this.count; i++) {
      if (this.alphas[i] <= 0) continue;
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.08;
      this.velocities[i3] = Math.cos(angle) * speed;
      this.velocities[i3 + 1] = (Math.random() - 0.3) * speed;
      this.velocities[i3 + 2] = Math.sin(angle) * speed;
    }
  }

  formSmallHeart(): void {
    this.beginConverge(0.45);
    this.mode = 'converge';
  }

  update(dt: number, timeScale = 1): void {
    const dtScaled = dt * timeScale;
    const mat = this.points.material as THREE.PointsMaterial;

    if (this.mode === 'spread' || this.mode === 'burst') {
      for (let i = 0; i < this.count; i++) {
        if (this.alphas[i] <= 0) continue;
        const i3 = i * 3;
        this.positions[i3] += this.velocities[i3] * dtScaled * 60;
        this.positions[i3 + 1] += this.velocities[i3 + 1] * dtScaled * 60;
        this.positions[i3 + 2] += this.velocities[i3 + 2] * dtScaled * 60;
        if (this.mode === 'burst') {
          this.velocities[i3 + 1] -= 0.0003 * dtScaled * 60;
        }
      }
    } else if (this.mode === 'converge') {
      for (let i = 0; i < this.count; i++) {
        if (this.alphas[i] <= 0) continue;
        const i3 = i * 3;
        this.positions[i3] += (this.targets[i3] - this.positions[i3]) * 0.018 * dtScaled * 60;
        this.positions[i3 + 1] += (this.targets[i3 + 1] - this.positions[i3 + 1]) * 0.018 * dtScaled * 60;
        this.positions[i3 + 2] += (this.targets[i3 + 2] - this.positions[i3 + 2]) * 0.018 * dtScaled * 60;
      }
    }

    this.points.geometry.attributes['position'].needsUpdate = true;
    mat.opacity = 0.55 + Math.sin(performance.now() * 0.001) * 0.1;
  }

  setSize(size: number): void {
    (this.points.material as THREE.PointsMaterial).size = size;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

export function colorForKind(kind: ParticleKind): number {
  return KIND_COLORS[kind] ?? KIND_COLORS.generic;
}
