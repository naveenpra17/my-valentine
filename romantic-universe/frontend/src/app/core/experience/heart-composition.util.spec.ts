import { computeHeartPlacement, hasPersistedPlacement, applyPlacementWithFallback } from './heart-composition.util';
import { HeartObject } from './experience-state.types';

describe('heart-composition.util', () => {
  it('computes deterministic placement for same inputs', () => {
    const a = computeHeartPlacement('photo', 1, 0);
    const b = computeHeartPlacement('photo', 1, 0);
    expect(a).toEqual(b);
  });

  it('treats persisted placement as authoritative', () => {
    const object: HeartObject = {
      type: 'photo',
      referenceId: 1,
      position: { x: 0.1, y: 0.2, z: 0.3 },
      rotation: { x: 0, y: 1, z: 0 },
      scale: 0.9
    };
    expect(hasPersistedPlacement(object)).toBe(true);
    const result = applyPlacementWithFallback(object, 99);
    expect(result.position).toEqual(object.position);
  });

  it('generates placement only when missing', () => {
    const object: HeartObject = { type: 'memory', referenceId: 2 };
    expect(hasPersistedPlacement(object)).toBe(false);
    const result = applyPlacementWithFallback(object, 0);
    expect(result.position).toBeDefined();
    expect(result.rotation).toBeDefined();
    expect(result.scale).toBeDefined();
  });

  it('uses fallback for corrupt placement', () => {
    const object: HeartObject = {
      type: 'quote',
      referenceId: 3,
      position: { x: NaN, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1
    };
    expect(hasPersistedPlacement(object)).toBe(false);
    const result = applyPlacementWithFallback(object, 1);
    expect(Number.isFinite(result.position!.x)).toBe(true);
  });
});
