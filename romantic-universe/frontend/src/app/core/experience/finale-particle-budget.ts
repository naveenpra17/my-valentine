import { HeartObject, HeartObjectType } from '../experience/experience-state.types';
import { QualityLevel } from '../services/quality.service';
import { ParticleKind, ParticleOrigin } from '../../features/finale/finale-particle-system';

const TYPE_WEIGHT: Record<HeartObjectType | 'generic', number> = {
  photo: 14,
  memory: 12,
  quote: 8,
  reason: 8,
  flower: 8,
  secret: 7,
  'love-bomb': 6,
  symbol: 5,
  generic: 4
};

const TYPE_MIN_COUNT: Partial<Record<HeartObjectType | 'generic', number>> = {
  photo: 28,
  memory: 24,
  quote: 16,
  reason: 16,
  flower: 16,
  secret: 14,
  'love-bomb': 12,
  symbol: 10,
  generic: 8
};

const QUALITY_BUDGET: Record<QualityLevel, { min: number; max: number }> = {
  low: { min: 500, max: 800 },
  medium: { min: 1000, max: 1500 },
  high: { min: 1800, max: 3000 }
};

export interface ParticleBudgetOptions {
  objects: HeartObject[];
  capacity: number;
  quality: QualityLevel;
  reducedMotion: boolean;
  mobile: boolean;
}

export function resolveParticleCapacity(options: ParticleBudgetOptions): number {
  const tier = QUALITY_BUDGET[options.quality];
  let target = Math.round((tier.min + tier.max) / 2);
  if (options.reducedMotion) target = Math.round(target * 0.5);
  if (options.mobile) target = Math.round(target * 0.82);
  return Math.min(options.capacity, target);
}

/** Build personalized particle spawn requests with type-weighted budgets. */
export function buildPersonalizedOrigins(options: ParticleBudgetOptions): ParticleOrigin[] {
  const { objects, reducedMotion } = options;
  if (objects.length === 0) return [];

  const capacity = resolveParticleCapacity(options);
  const personalizedCap = Math.round(capacity * (reducedMotion ? 0.38 : 0.48));

  const weights = objects.map(obj => TYPE_WEIGHT[obj.type] ?? TYPE_WEIGHT.generic);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  const origins: ParticleOrigin[] = objects.map((obj, i) => {
    const kind = (obj.type as ParticleKind) || 'generic';
    const share = weights[i] / totalWeight;
    const minCount = TYPE_MIN_COUNT[obj.type] ?? TYPE_MIN_COUNT.generic ?? 8;
    const pos = obj.position ?? { x: 0, y: 0, z: 0 };
    const count = Math.max(minCount, Math.round(personalizedCap * share));
    return { x: pos.x, y: pos.y, z: pos.z, kind, count };
  });

  const total = origins.reduce((sum, o) => sum + (o.count ?? 0), 0);
  if (total > personalizedCap) {
    const scale = personalizedCap / total;
    origins.forEach((origin, i) => {
      const minCount = TYPE_MIN_COUNT[objects[i].type] ?? TYPE_MIN_COUNT.generic ?? 8;
      origin.count = Math.max(minCount, Math.round((origin.count ?? 0) * scale));
    });
  }

  return origins;
}

/** Ambient universe particles to fill remaining GPU capacity. */
export function ambientParticleCount(capacity: number, personalizedSpawned: number): number {
  return Math.max(0, capacity - personalizedSpawned);
}

export function totalPersonalizedCount(origins: ParticleOrigin[]): number {
  return origins.reduce((sum, o) => sum + (o.count ?? 0), 0);
}
