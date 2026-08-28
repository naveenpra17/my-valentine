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
  count?: number;
  color?: THREE.ColorRepresentation;
}

const KIND_COLORS: Record<ParticleKind, THREE.Color> = {
  photo: new THREE.Color(0xc4b08a),
  memory: new THREE.Color(0xc9a0a8),
  quote: new THREE.Color(0xf5f0e8),
  reason: new THREE.Color(0x9a8fa8),
  flower: new THREE.Color(0xd4b0b8),
  secret: new THREE.Color(0x6a5088),
  'love-bomb': new THREE.Color(0xd4b0b8),
  generic: new THREE.Color(0xc9a0a8)
};

const KIND_SIZES: Record<ParticleKind, number> = {
  photo: 1.15,
  memory: 1.05,
  quote: 0.95,
  reason: 0.9,
  flower: 1.0,
  secret: 0.85,
  'love-bomb': 0.75,
  generic: 0.8
};

export class FinaleParticleSystem {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly targets: Float32Array;
  private readonly alphas: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly kinds: ParticleKind[];
  private readonly count: number;
  private activeCount = 0;
  private mode: 'idle' | 'spread' | 'converge' | 'burst' = 'idle';
  private convergeTargets: THREE.Vector3[] = [];
  private readonly material: THREE.ShaderMaterial;

  constructor(maxCount: number) {
    this.count = maxCount;
    this.positions = new Float32Array(maxCount * 3);
    this.velocities = new Float32Array(maxCount * 3);
    this.targets = new Float32Array(maxCount * 3);
    this.alphas = new Float32Array(maxCount);
    this.colors = new Float32Array(maxCount * 3);
    this.sizes = new Float32Array(maxCount);
    this.kinds = new Array(maxCount).fill('generic');

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('psize', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.85 },
        uBaseSize: { value: 42 }
      },
      vertexShader: `
        attribute float psize;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = psize * uBaseSize / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.15, d) * uOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  /** Spawn personalized particles from object origins. Returns count spawned. */
  spawnFromOrigins(origins: ParticleOrigin[]): number {
    let idx = 0;
    for (const origin of origins) {
      const perOrigin = origin.count ?? 1;
      const color = KIND_COLORS[origin.kind] ?? KIND_COLORS.generic;
      const sizeMul = KIND_SIZES[origin.kind] ?? 1;

      for (let j = 0; j < perOrigin && idx < this.count; j++, idx++) {
        const i3 = idx * 3;
        this.positions[i3] = origin.x + (Math.random() - 0.5) * 0.06;
        this.positions[i3 + 1] = origin.y + (Math.random() - 0.5) * 0.06;
        this.positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.06;
        this.velocities[i3] = 0;
        this.velocities[i3 + 1] = 0;
        this.velocities[i3 + 2] = 0;
        this.alphas[idx] = 1;
        this.kinds[idx] = origin.kind;
        this.colors[i3] = color.r;
        this.colors[i3 + 1] = color.g;
        this.colors[i3 + 2] = color.b;
        this.sizes[idx] = sizeMul * (0.85 + Math.random() * 0.3);
      }
    }
    this.activeCount = idx;
    this.markBuffersDirty();
    return idx;
  }

  /** Fill remaining capacity with ambient universe particles. */
  fillAmbient(fromIndex: number): number {
    const color = KIND_COLORS.generic;
    let idx = fromIndex;
    for (; idx < this.count; idx++) {
      const i3 = idx * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const r = 0.8 + Math.random() * 2.5;
      this.positions[i3] = Math.cos(theta) * Math.cos(phi) * r;
      this.positions[i3 + 1] = Math.sin(phi) * r * 0.6;
      this.positions[i3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;
      this.alphas[idx] = 0.35 + Math.random() * 0.35;
      this.kinds[idx] = 'generic';
      this.colors[i3] = color.r * 0.85;
      this.colors[i3 + 1] = color.g * 0.85;
      this.colors[i3 + 2] = color.b * 0.85;
      this.sizes[idx] = 0.55 + Math.random() * 0.35;
    }
    this.activeCount = this.count;
    this.markBuffersDirty();
    return idx - fromIndex;
  }

  spawnTransformationBurst(origins: ParticleOrigin[], perOrigin: number): void {
    let idx = this.activeCount;
    for (const origin of origins) {
      for (let j = 0; j < perOrigin && idx < this.count; j++, idx++) {
        const i3 = idx * 3;
        const color = KIND_COLORS[origin.kind] ?? KIND_COLORS.generic;
        this.positions[i3] = origin.x + (Math.random() - 0.5) * 0.04;
        this.positions[i3 + 1] = origin.y + (Math.random() - 0.5) * 0.04;
        this.positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.04;
        this.alphas[idx] = 0.9;
        this.kinds[idx] = origin.kind;
        this.colors[i3] = color.r;
        this.colors[i3 + 1] = color.g;
        this.colors[i3 + 2] = color.b;
        this.sizes[idx] = (KIND_SIZES[origin.kind] ?? 1) * 0.9;
      }
    }
    this.activeCount = Math.max(this.activeCount, idx);
    this.markBuffersDirty();
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
    this.material.uniforms['uOpacity'].value = 0.55 + Math.sin(performance.now() * 0.001) * 0.1;
  }

  setSize(baseSize: number): void {
    this.material.uniforms['uBaseSize'].value = baseSize;
  }

  pulseSize(multiplier: number): void {
    this.material.uniforms['uBaseSize'].value = 42 * multiplier;
  }

  private markBuffersDirty(): void {
    this.points.geometry.attributes['position'].needsUpdate = true;
    this.points.geometry.attributes['color'].needsUpdate = true;
    this.points.geometry.attributes['psize'].needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

export function colorForKind(kind: ParticleKind): number {
  return (KIND_COLORS[kind] ?? KIND_COLORS.generic).getHex();
}
