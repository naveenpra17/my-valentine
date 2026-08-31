/** Director's Cut chapter map (0–12). */
export type DirectorChapterId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type ChapterId = DirectorChapterId;

export type HeartObjectType =
  | 'photo'
  | 'memory'
  | 'reason'
  | 'quote'
  | 'love-bomb'
  | 'flower'
  | 'secret'
  | 'symbol';

export interface HeartObject {
  type: HeartObjectType;
  referenceId: number | string;
  label?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, string>;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
}

export interface ConstellationStar {
  id: string;
  sourceType: HeartObjectType | 'secret' | 'symbol';
  referenceId: number | string;
  x: number;
  y: number;
  discoveredAt: number;
}

export type DiscoveryMilestoneKey =
  | 'firstPhoto'
  | 'firstMemory'
  | 'firstReason'
  | 'firstFlower'
  | 'firstLoveBomb'
  | 'firstQuote'
  | 'secretDiscovered';

export interface DiscoveryHistory {
  milestones: Partial<Record<DiscoveryMilestoneKey, number | string>>;
  /** Milliseconds spent with each discovery moment open — key: `type-referenceId` */
  dwellMs: Record<string, number>;
}

export interface SerializedExperienceState {
  discoveredPhotos: number[];
  discoveredMemories: number[];
  discoveredReasons: number[];
  activatedQuotes: number[];
  triggeredLoveBombs: number[];
  discoveredFlowers?: number[];
  foundSecrets: string[];
  openedEnvelopes: number[];
  selectedHeartObjects: HeartObject[];
  heartPool: HeartObject[];
  constellationStars: ConstellationStar[];
  discoveryHistory?: DiscoveryHistory;
  currentChapter: ChapterId;
  musicEnabled: boolean;
  experienceStarted: boolean;
  experienceCompleted: boolean;
}
