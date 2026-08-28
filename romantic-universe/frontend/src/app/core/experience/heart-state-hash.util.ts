import { SerializedHeartState } from './heart-asset.types';
import { HeartObject } from './experience-state.types';

function hashString(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Stable cache key from serialized heart state — excludes runtime/timestamp fields. */
export function heartStateCacheKey(state: SerializedHeartState): string {
  const payload = {
    v: state.heartStateVersion,
    id: state.heartId,
    assets: [...state.assets]
      .map(a => ({
        id: a.id,
        type: a.type,
        sourceId: a.sourceId,
        label: a.label ?? '',
        thumbnailUrl: a.thumbnailUrl ?? '',
        imageUrl: a.imageUrl ?? '',
        metadata: a.metadata ?? {},
        position: roundTriple(a.position),
        rotation: roundTriple(a.rotation),
        scale: round(a.scale)
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  };
  return hashString(JSON.stringify(payload));
}

export function heartObjectsCacheKey(objects: HeartObject[]): string {
  const assets = objects.map((o, i) => ({
    id: `${o.type}-${o.referenceId}`,
    type: o.type,
    sourceId: o.referenceId,
    label: o.label ?? '',
    thumbnailUrl: o.thumbnailUrl ?? '',
    imageUrl: o.imageUrl ?? '',
    metadata: o.metadata ?? {},
    position: o.position ? roundTriple(o.position) : { x: 0, y: 0, z: 0 },
    rotation: o.rotation ? roundTriple(o.rotation) : { x: 0, y: 0, z: 0 },
    scale: round(o.scale ?? 1)
  }));
  return heartStateCacheKey({
    heartStateVersion: 1,
    heartId: 'our-little-heart',
    assets
  });
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function roundTriple(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return { x: round(v.x), y: round(v.y), z: round(v.z) };
}
