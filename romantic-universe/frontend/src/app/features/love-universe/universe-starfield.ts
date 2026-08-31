import * as THREE from 'three';
import type { QualityTier } from './universe-quality';

export type StarLayer = 'far' | 'mid' | 'near' | 'hero';

export interface StarfieldUpdateParams {
  time: number;
  mouseX: number;
  mouseY: number;
  cameraShiftX: number;
  cameraShiftY: number;
  timeScale: number;
}

export interface UniverseStarfieldOptions {
  tier: QualityTier;
  reducedMotion: boolean;
}

const STAR_VERTEX = `
  attribute float aSize;
  attribute float aBrightness;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aTwinkle;
  attribute float aParallax;
  attribute float aHero;
  attribute float aForeground;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uReveal;
  uniform float uIntensity;
  uniform vec2 uMouse;
  uniform vec2 uCameraDelta;
  uniform float uPixelRatio;
  uniform vec3 uPulsePoint;
  uniform float uPulseStrength;
  uniform vec3 uMemoryPoint;
  uniform float uMemoryStrength;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vHero;
  varying float vForeground;
  varying float vEdgeBoost;
  varying float vCenterDim;

  void main() {
    vec3 pos = position;

    pos.x += uMouse.x * aParallax * 0.9;
    pos.y += uMouse.y * aParallax * 0.65;
    pos.x += uCameraDelta.x * aParallax * 14.0;
    pos.y += uCameraDelta.y * aParallax * 11.0;
    pos.y += sin(uTime * aSpeed * 0.28 + aPhase) * 0.003 * aParallax;
    pos.z += cos(uTime * aSpeed * 0.19 + aPhase * 1.3) * 0.002 * aParallax;

    float xyDist = length(pos.xy);
    vEdgeBoost = 1.0 + smoothstep(4.0, 16.0, xyDist) * 0.22;
    vCenterDim = mix(0.52, 1.0, smoothstep(0.0, 6.5, xyDist));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float tw = sin(uTime * aSpeed + aPhase) * aTwinkle
             + sin(uTime * aSpeed * 0.41 + aPhase * 1.9) * aTwinkle * 0.28;

    float pdist = length(pos - uPulsePoint);
    float pboost = uPulseStrength * exp(-pdist * pdist * 0.11) * 0.12;

    float mdist = length(pos - uMemoryPoint);
    float mboost = uMemoryStrength * exp(-mdist * mdist * 0.06) * 0.08;

    float bright = aBrightness * uReveal * uIntensity * vCenterDim * vEdgeBoost;
    bright *= (0.94 + tw + pboost + mboost);
    vAlpha = bright;
    vColor = aColor;
    vHero = aHero;
    vForeground = aForeground;

    float size = aSize * uReveal * (1.0 + tw * 0.12 + pboost * 0.4);
    gl_PointSize = size * uPixelRatio * (460.0 / max(-mv.z, 1.0));
    gl_PointSize = clamp(gl_PointSize, aForeground > 0.5 ? 1.4 : 1.15, aForeground > 0.5 ? 16.0 : 14.0);
  }
`;

const STAR_FRAGMENT = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vHero;
  varying float vForeground;
  varying float vEdgeBoost;
  varying float vCenterDim;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    float core = 1.0 - smoothstep(0.0, 0.34, dist);
    float halo = 1.0 - smoothstep(0.2, 0.5, dist);

    float alpha = core * vAlpha;
    alpha += halo * vAlpha * (vHero > 0.5 ? 0.18 : (vForeground > 0.5 ? 0.1 : 0.06));

    if (vForeground > 0.5) {
      alpha *= 0.88;
    }

    if (vHero > 0.5) {
      float cross = max(0.0, 1.0 - abs(uv.x) * 9.0) * max(0.0, 1.0 - abs(uv.y) * 9.0);
      alpha += cross * vAlpha * 0.22;
    }

    vec3 col = vColor * (0.94 + halo * (vHero > 0.5 ? 0.12 : 0.05));
    gl_FragColor = vec4(col, alpha);
  }
`;

function starCountForTier(tier: QualityTier, reducedMotion: boolean): number {
  if (reducedMotion) return 900;
  switch (tier) {
    case 'high': return 2800;
    case 'medium': return 2000;
    case 'low': return 1100;
  }
}

function pickLayer(): StarLayer {
  const r = Math.random();
  if (r < 0.015) return 'hero';
  if (r < 0.13) return 'near';
  if (r < 0.43) return 'mid';
  return 'far';
}

function pickStarColor(layer: StarLayer, rand: number): [number, number, number] {
  const warm = layer === 'near' || layer === 'hero';
  if (rand < 0.38) return warm ? [0.82, 0.72, 0.58] : [0.76, 0.68, 0.54];
  if (rand < 0.72) return warm ? [0.84, 0.68, 0.66] : [0.78, 0.62, 0.64];
  if (rand < 0.9) return [0.92, 0.9, 0.86];
  return [0.88, 0.8, 0.7];
}

const CLUSTER_CENTERS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + 0.7;
  const r = 11 + (i % 5) * 3.5;
  return new THREE.Vector3(
    Math.cos(a) * r,
    (i % 3 - 1) * 2.8,
    Math.sin(a) * r * 0.55 - 7
  );
});

function samplePosition(layer: StarLayer): THREE.Vector3 {
  const useCluster = Math.random() < 0.17;
  if (useCluster) {
    const c = CLUSTER_CENTERS[Math.floor(Math.random() * CLUSTER_CENTERS.length)];
    const spread = 1.8 + Math.random() * 5.5;
    return new THREE.Vector3(
      c.x + (Math.random() - 0.5) * spread,
      c.y + (Math.random() - 0.5) * spread * 0.55,
      c.z + (Math.random() - 0.5) * spread
    );
  }

  let radius: number;
  switch (layer) {
    case 'far':
      radius = 26 + Math.random() * 28;
      break;
    case 'mid':
      radius = 13 + Math.random() * 17;
      break;
    case 'near':
      radius = 5.5 + Math.random() * 10;
      break;
    case 'hero':
      radius = 8 + Math.random() * 18;
      break;
  }

  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  let x = radius * Math.sin(phi) * Math.cos(theta);
  let y = radius * Math.sin(phi) * Math.sin(theta) * 0.58;
  let z = radius * Math.cos(phi) - 9;

  if (Math.random() < 0.38) {
    const edge = 1.15 + Math.random() * 0.65;
    x *= edge;
    y *= edge * 0.85;
  }

  const dist = Math.sqrt(x * x + y * y + z * z);
  if (dist < 2.4 && Math.random() < 0.82) {
    const push = 2.4 / Math.max(dist, 0.12);
    x *= push;
    y *= push;
    z *= push;
  }

  return new THREE.Vector3(x, y, z);
}

function layerParams(layer: StarLayer, reducedMotion: boolean): {
  size: number;
  brightness: number;
  twinkle: number;
  speed: number;
  parallax: number;
  hero: number;
} {
  switch (layer) {
    case 'far':
      return {
        size: 0.014 + Math.random() * 0.014,
        brightness: 0.2 + Math.random() * 0.14,
        twinkle: reducedMotion ? 0.008 : 0.012 + Math.random() * 0.018,
        speed: 0.06 + Math.random() * 0.2,
        parallax: 0.05,
        hero: 0
      };
    case 'mid':
      return {
        size: 0.024 + Math.random() * 0.018,
        brightness: 0.34 + Math.random() * 0.18,
        twinkle: reducedMotion ? 0.02 : 0.04 + Math.random() * 0.06,
        speed: 0.12 + Math.random() * 0.32,
        parallax: 0.15,
        hero: 0
      };
    case 'near':
      return {
        size: 0.034 + Math.random() * 0.016,
        brightness: 0.5 + Math.random() * 0.18,
        twinkle: reducedMotion ? 0.03 : 0.06 + Math.random() * 0.08,
        speed: 0.18 + Math.random() * 0.38,
        parallax: 0.35,
        hero: 0
      };
    case 'hero':
      return {
        size: 0.044 + Math.random() * 0.02,
        brightness: 0.72 + Math.random() * 0.2,
        twinkle: reducedMotion ? 0.05 : 0.09 + Math.random() * 0.1,
        speed: 0.22 + Math.random() * 0.42,
        parallax: 0.45,
        hero: 1
      };
  }
}

export class UniverseStarfield {
  readonly points: THREE.Points;
  readonly foregroundPoints: THREE.Points;
  private readonly material: THREE.ShaderMaterial;
  private readonly count: number;
  private readonly reducedMotion: boolean;
  private reveal = 0;
  private targetReveal = 1;
  private intensity = 1;
  private targetIntensity = 1;
  private interactionPoint = new THREE.Vector3(999, 999, 999);
  private interactionStrength = 0;
  private memoryPoint = new THREE.Vector3(999, 999, 999);
  private memoryStrength = 0;
  private lastCameraX = 0;
  private lastCameraY = 0;

  constructor(options: UniverseStarfieldOptions) {
    this.reducedMotion = options.reducedMotion;
    this.count = starCountForTier(options.tier, options.reducedMotion);

    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const brightness = new Float32Array(this.count);
    const phases = new Float32Array(this.count);
    const speeds = new Float32Array(this.count);
    const twinkles = new Float32Array(this.count);
    const parallaxes = new Float32Array(this.count);
    const heroes = new Float32Array(this.count);
    const foregrounds = new Float32Array(this.count);

    const fgCount = Math.max(10, Math.floor(this.count * 0.035));
    const fgSlots = new Set<number>();
    while (fgSlots.size < fgCount) {
      fgSlots.add(Math.floor(Math.random() * this.count));
    }

    for (let i = 0; i < this.count; i++) {
      const layer = pickLayer();
      const p = samplePosition(layer);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      const params = layerParams(layer, this.reducedMotion);
      sizes[i] = params.size;
      brightness[i] = params.brightness;
      twinkles[i] = params.twinkle;
      speeds[i] = params.speed;
      parallaxes[i] = params.parallax;
      heroes[i] = params.hero;
      foregrounds[i] = 0;

      if (fgSlots.has(i)) {
        const theta = Math.random() * Math.PI * 2;
        const r = 3.5 + Math.random() * 11;
        positions[i * 3] = Math.cos(theta) * r * (0.75 + Math.random() * 0.5);
        positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
        positions[i * 3 + 2] = 2.2 + Math.random() * 6.8;
        sizes[i] *= 1.18;
        parallaxes[i] = 0.52;
        brightness[i] *= 0.82;
        twinkles[i] *= 0.75;
        foregrounds[i] = 1;
      }

      phases[i] = Math.random() * Math.PI * 2;
      const [r, g, b] = pickStarColor(layer, Math.random());
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    const bgIndices: number[] = [];
    const fgIndices: number[] = [];
    for (let i = 0; i < this.count; i++) {
      if (foregrounds[i] > 0.5) fgIndices.push(i);
      else bgIndices.push(i);
    }

    const buildGeometry = (indices: number[]): THREE.BufferGeometry => {
      const n = indices.length;
      const geo = new THREE.BufferGeometry();
      const pack = (src: Float32Array, size: number) => {
        const out = new Float32Array(n * size);
        indices.forEach((idx, j) => {
          for (let k = 0; k < size; k++) out[j * size + k] = src[idx * size + k];
        });
        return out;
      };
      const pack1 = (src: Float32Array) => {
        const out = new Float32Array(n);
        indices.forEach((idx, j) => { out[j] = src[idx]; });
        return out;
      };
      geo.setAttribute('position', new THREE.BufferAttribute(pack(positions, 3), 3));
      geo.setAttribute('aColor', new THREE.BufferAttribute(pack(colors, 3), 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(pack1(sizes), 1));
      geo.setAttribute('aBrightness', new THREE.BufferAttribute(pack1(brightness), 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(pack1(phases), 1));
      geo.setAttribute('aSpeed', new THREE.BufferAttribute(pack1(speeds), 1));
      geo.setAttribute('aTwinkle', new THREE.BufferAttribute(pack1(twinkles), 1));
      geo.setAttribute('aParallax', new THREE.BufferAttribute(pack1(parallaxes), 1));
      geo.setAttribute('aHero', new THREE.BufferAttribute(pack1(heroes), 1));
      geo.setAttribute('aForeground', new THREE.BufferAttribute(pack1(foregrounds), 1));
      return geo;
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uIntensity: { value: 1 },
        uMouse: { value: new THREE.Vector2() },
        uCameraDelta: { value: new THREE.Vector2() },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uPulsePoint: { value: new THREE.Vector3(999, 999, 999) },
        uPulseStrength: { value: 0 },
        uMemoryPoint: { value: new THREE.Vector3(999, 999, 999) },
        uMemoryStrength: { value: 0 }
      },
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(buildGeometry(bgIndices), this.material);
    this.points.renderOrder = 0;
    this.foregroundPoints = new THREE.Points(buildGeometry(fgIndices), this.material);
    this.foregroundPoints.renderOrder = 11;
  }

  beginReveal(): void {
    this.reveal = 0;
    this.targetReveal = 1;
  }

  setIntensity(value: number): void {
    this.targetIntensity = THREE.MathUtils.clamp(value, 0.55, 1.1);
  }

  pulseAt(x: number, y: number, z: number, strength = 0.35): void {
    this.interactionPoint.set(x, y, z);
    this.interactionStrength = Math.max(this.interactionStrength, strength);
  }

  markMemory(x: number, y: number, z: number): void {
    this.memoryPoint.set(x, y, z);
    this.memoryStrength = 1;
  }

  update(params: StarfieldUpdateParams): void {
    const revealSpeed = this.reducedMotion ? 0.018 : 0.011;
    this.reveal += (this.targetReveal - this.reveal) * revealSpeed;
    this.intensity += (this.targetIntensity - this.intensity) * 0.04;
    this.interactionStrength *= 0.94;
    this.memoryStrength *= 0.9985;

    this.material.uniforms['uTime'].value = params.time;
    this.material.uniforms['uReveal'].value = this.reveal;
    this.material.uniforms['uIntensity'].value = this.intensity;
    (this.material.uniforms['uPulsePoint'].value as THREE.Vector3).copy(this.interactionPoint);
    this.material.uniforms['uPulseStrength'].value = this.interactionStrength;
    (this.material.uniforms['uMemoryPoint'].value as THREE.Vector3).copy(this.memoryPoint);
    this.material.uniforms['uMemoryStrength'].value = this.memoryStrength;

    const mouse = this.material.uniforms['uMouse'].value as THREE.Vector2;
    mouse.set(params.mouseX * 0.42, params.mouseY * 0.3);

    const camDelta = this.material.uniforms['uCameraDelta'].value as THREE.Vector2;
    const dx = params.cameraShiftX - this.lastCameraX;
    const dy = params.cameraShiftY - this.lastCameraY;
    this.lastCameraX = params.cameraShiftX;
    this.lastCameraY = params.cameraShiftY;
    camDelta.set(dx, dy);

    const slow = params.timeScale;
    this.points.rotation.y = params.time * 0.01 * slow;
    this.points.rotation.x = params.mouseY * 0.022;
    this.foregroundPoints.rotation.copy(this.points.rotation);
  }

  setPixelRatio(dpr: number): void {
    this.material.uniforms['uPixelRatio'].value = dpr;
  }

  getStarCount(): number {
    return this.count;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.foregroundPoints.geometry.dispose();
    this.material.dispose();
  }
}

export function createUniverseStarfield(options: UniverseStarfieldOptions): UniverseStarfield {
  return new UniverseStarfield(options);
}
