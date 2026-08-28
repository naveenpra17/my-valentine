import { buildPersonalizedOrigins, resolveParticleCapacity } from './finale-particle-budget';
import { HeartObject } from './experience-state.types';

describe('finale-particle-budget', () => {
  const objects: HeartObject[] = [
    { type: 'photo', referenceId: 1, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 },
    { type: 'memory', referenceId: 2, position: { x: 0.1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 }
  ];

  it('scales capacity by quality', () => {
    const high = resolveParticleCapacity({ objects, capacity: 3000, quality: 'high', reducedMotion: false, mobile: false });
    const low = resolveParticleCapacity({ objects, capacity: 3000, quality: 'low', reducedMotion: false, mobile: false });
    expect(high).toBeGreaterThan(low);
  });

  it('allocates more particles to photo than love-bomb', () => {
    const mixed: HeartObject[] = [
      { type: 'photo', referenceId: 1, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 },
      { type: 'love-bomb', referenceId: 2, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 }
    ];
    const origins = buildPersonalizedOrigins({
      objects: mixed,
      capacity: 2000,
      quality: 'high',
      reducedMotion: false,
      mobile: false
    });
    const photo = origins.find(o => o.kind === 'photo')?.count ?? 0;
    const bomb = origins.find(o => o.kind === 'love-bomb')?.count ?? 0;
    expect(photo).toBeGreaterThan(bomb);
  });

  it('fills most capacity with two heart objects on high quality', () => {
    const origins = buildPersonalizedOrigins({
      objects,
      capacity: 2000,
      quality: 'high',
      reducedMotion: false,
      mobile: false
    });
    const personalized = origins.reduce((s, o) => s + (o.count ?? 0), 0);
    expect(personalized).toBeGreaterThan(200);
    expect(ambientParticleCount(2000, personalized)).toBeGreaterThan(1000);
  });
});
