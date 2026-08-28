import { heartStateCacheKey, heartObjectsCacheKey } from './heart-state-hash.util';
import { SerializedHeartState } from './heart-asset.types';

describe('heart-state-hash.util', () => {
  const baseState: SerializedHeartState = {
    heartStateVersion: 1,
    heartId: 'our-little-heart',
    assets: [
      {
        id: 'photo-1',
        type: 'photo',
        sourceId: 1,
        position: { x: 0.1, y: 0.2, z: 0.3 },
        rotation: { x: 0, y: 1, z: 0 },
        scale: 0.9
      }
    ]
  };

  it('produces stable hash for same state', () => {
    const a = heartStateCacheKey(baseState);
    const b = heartStateCacheKey({ ...baseState, assets: [...baseState.assets] });
    expect(a).toBe(b);
  });

  it('changes hash when heart changes', () => {
    const a = heartStateCacheKey(baseState);
    const changed: SerializedHeartState = {
      ...baseState,
      assets: [
        {
          ...baseState.assets[0],
          position: { x: 0.5, y: 0.2, z: 0.3 }
        }
      ]
    };
    expect(heartStateCacheKey(changed)).not.toBe(a);
  });

  it('matches object list hash', () => {
    const key = heartObjectsCacheKey([
      {
        type: 'photo',
        referenceId: 1,
        position: { x: 0.1, y: 0.2, z: 0.3 },
        rotation: { x: 0, y: 1, z: 0 },
        scale: 0.9
      }
    ]);
    expect(key).toBe(heartStateCacheKey(baseState));
  });
});
