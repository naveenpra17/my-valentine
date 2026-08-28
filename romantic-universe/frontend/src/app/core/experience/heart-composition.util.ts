import { heartAssetKey } from './heart-asset.types';
import { HeartObject, HeartObjectType } from './experience-state.types';

export interface HeartPlacement {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

export interface PoolOrbitPlacement {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(key: string, salt: number): number {
  const h = hashString(`${key}:${salt}`);
  return (h % 10000) / 10000;
}

const TYPE_RADIUS: Partial<Record<HeartObjectType, number>> = {
  photo: 0.52,
  memory: 0.48,
  reason: 0.44,
  quote: 0.42,
  secret: 0.38,
  flower: 0.46,
  'love-bomb': 0.4,
  symbol: 0.43
};

const TYPE_SCALE: Partial<Record<HeartObjectType, number>> = {
  photo: 1,
  memory: 0.92,
  reason: 0.78,
  quote: 0.72,
  secret: 0.65,
  flower: 0.8,
  'love-bomb': 0.7,
  symbol: 0.75
};

/** Deterministic surface placement on the heart sculpture. */
export function computeHeartPlacement(
  type: HeartObjectType,
  sourceId: number | string,
  index: number
): HeartPlacement {
  const key = heartAssetKey(type, sourceId);
  const golden = index * 2.399963229728653 + seededUnit(key, 1) * Math.PI * 2;
  const tilt = (seededUnit(key, 2) - 0.5) * 0.55;
  const radius = TYPE_RADIUS[type] ?? 0.45;
  const yBias = (seededUnit(key, 3) - 0.5) * 0.35;

  const x = Math.cos(golden) * radius * 0.85;
  const z = Math.sin(golden) * radius * 0.55;
  const y = yBias + Math.sin(golden * 0.5) * 0.12;

  const normal = new THREELikeVector(x, y, z).normalize();
  const scale = (TYPE_SCALE[type] ?? 0.75) * (0.88 + seededUnit(key, 4) * 0.18);

  return {
    position: { x: normal.x * radius, y: normal.y * radius + y * 0.15, z: normal.z * radius },
    rotation: { x: tilt, y: golden + Math.PI * 0.5, z: (seededUnit(key, 5) - 0.5) * 0.35 },
    scale
  };
}

/** Orbit position for pool objects floating around the heart. */
export function computePoolOrbit(
  type: HeartObjectType,
  sourceId: number | string,
  index: number,
  total: number
): PoolOrbitPlacement {
  const key = heartAssetKey(type, sourceId);
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 + seededUnit(key, 6) * 0.6;
  const radius = 2.1 + (index % 3) * 0.22 + seededUnit(key, 7) * 0.15;
  const y = (seededUnit(key, 8) - 0.5) * 0.9;

  return {
    position: {
      x: Math.cos(angle) * radius,
      y,
      z: Math.sin(angle) * radius * 0.75
    },
    rotation: { x: 0, y: -angle + Math.PI * 0.5, z: 0 }
  };
}

/** Minimal vector helper — avoids importing three in util. */
class THREELikeVector {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly z: number
  ) {}

  normalize(): THREELikeVector {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z) || 1;
    return new THREELikeVector(this.x / len, this.y / len, this.z / len);
  }
}

export function applyPlacement(object: HeartObject, index: number): HeartObject {
  if (object.position && object.rotation && object.scale != null) {
    return object;
  }
  const placement = computeHeartPlacement(object.type, object.referenceId, index);
  return { ...object, ...placement };
}
