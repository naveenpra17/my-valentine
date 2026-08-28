import { HeartObject, HeartObjectType } from '../experience/experience-state.types';
import { QualityLevel } from '../services/quality.service';
import { ParticleKind, ParticleOrigin } from '../../features/finale/finale-particle-system';

const TYPE_WEIGHT: Record<HeartObjectType | 'generic', number> = {
  photo: 12,
  memory: 10,
  quote: 7,
  reason: 7,
  flower: 7,
  secret: 6,
  'love-bomb': 5,
  symbol: 4,
  generic: 3
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
  if (options.reducedMotion) target = Math.round(target * 0.45);
  if (options.mobile) target = Math.round(target * 0.75);
  return Math.min(options.capacity, target);
}

/** Build personalized particle spawn requests with type-weighted budgets. */
export function buildPersonalizedOrigins(options: ParticleBudgetOptions): ParticleOrigin[] {
  const { objects, quality, reducedMotion } = options;
  if (objects.length === 0) return [];

  const capacity = resolveParticleCapacity(options);
  const personalizedShare = reducedMotion ? 0.55 : 0.72;
  const personalizedBudget = Math.round(capacity * personalizedShare);

  const weights = objects.map(obj => TYPE_WEIGHT[obj.type] ?? TYPE_WEIGHT.generic);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  const qualityScale = quality === 'high' ? 1 : quality === 'medium' ? 0.75 : 0.5;
  const origins: ParticleOrigin[] = [];

  objects.forEach((obj, i) => {
    const kind = (obj.type as ParticleKind) || 'generic';
    const share = weights[i] / totalWeight;
    const count = Math.max(4, Math.round((personalizedBudget * share) * qualityScale));
    const pos = obj.position ?? { x: 0, y: 0, z: 0 };
    origins.push({
      x: pos.x,
      y: pos.y,
      z: pos.z,
      kind,
      count
    });
  });

  return origins;
}

/** Ambient universe particles to fill remaining GPU capacity. */
export function ambientParticleCount(capacity: number, personalizedSpawned: number): number {
  return Math.max(0, capacity - personalizedSpawned);
}
