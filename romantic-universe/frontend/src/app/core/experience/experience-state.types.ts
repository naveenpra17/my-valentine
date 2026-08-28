export type ChapterId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Director's Cut chapter map (0–12). */
export type DirectorChapterId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type HeartObjectType =
  | 'photo'
  | 'memory'
  | 'reason'
  | 'quote'
  | 'love-bomb'
  | 'flower'
  | 'symbol';

export interface HeartObject {
  type: HeartObjectType;
  referenceId: number | string;
  label?: string;
  imageUrl?: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
}

export interface ConstellationStar {
  id: string;
  sourceType: HeartObjectType | 'secret';
  referenceId: number | string;
  x: number;
  y: number;
  discoveredAt: number;
}

export interface SerializedExperienceState {
  discoveredPhotos: number[];
  discoveredMemories: number[];
  discoveredReasons: number[];
  activatedQuotes: number[];
  triggeredLoveBombs: number[];
  foundSecrets: string[];
  openedEnvelopes: number[];
  selectedHeartObjects: HeartObject[];
  heartPool: HeartObject[];
  constellationStars: ConstellationStar[];
  currentChapter: ChapterId;
  musicEnabled: boolean;
  experienceStarted: boolean;
  experienceCompleted: boolean;
}
