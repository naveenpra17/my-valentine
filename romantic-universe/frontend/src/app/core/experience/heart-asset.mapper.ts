import { HeartAsset, heartAssetKey } from './heart-asset.types';
import { HeartObject, HeartObjectType } from './experience-state.types';

const TYPE_PRIORITY: Record<HeartObjectType, number> = {
  photo: 0,
  memory: 1,
  reason: 2,
  quote: 3,
  secret: 4,
  flower: 5,
  'love-bomb': 6,
  symbol: 7
};

export function toHeartAsset(object: HeartObject): HeartAsset {
  return {
    id: heartAssetKey(object.type, object.referenceId),
    type: object.type,
    sourceId: object.referenceId,
    label: object.label,
    thumbnailUrl: object.thumbnailUrl ?? object.imageUrl,
    imageUrl: object.imageUrl,
    metadata: object.metadata
  };
}

export function sortHeartObjectsByPriority(objects: HeartObject[]): HeartObject[] {
  return [...objects].sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type] ?? 99;
    const pb = TYPE_PRIORITY[b.type] ?? 99;
    if (pa !== pb) return pa - pb;
    return String(a.referenceId).localeCompare(String(b.referenceId));
  });
}

export function prioritizePool(objects: HeartObject[], limit = 14): HeartObject[] {
  return sortHeartObjectsByPriority(objects).slice(0, limit);
}
