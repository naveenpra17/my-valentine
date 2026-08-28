import { HeartObjectType } from './experience-state.types';

/** Presentation-ready heart asset — separates state from UI rendering. */
export interface HeartAsset {
  id: string;
  type: HeartObjectType;
  sourceId: number | string;
  label?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, string>;
}

export interface SerializedHeartAsset {
  id: string;
  type: HeartObjectType;
  sourceId: number | string;
  label?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, string>;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

export interface SerializedHeartState {
  heartStateVersion?: number;
  heartId: string;
  assets: SerializedHeartAsset[];
}

export function heartAssetKey(type: HeartObjectType, sourceId: number | string): string {
  return `${type}-${sourceId}`;
}