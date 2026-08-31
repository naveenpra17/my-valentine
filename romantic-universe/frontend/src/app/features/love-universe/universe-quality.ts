export type QualityTier = 'low' | 'medium' | 'high';

export interface UniverseQuality {
  tier: QualityTier;
  /** Legacy count — starfield uses tier-based counts in universe-starfield.ts */
  starCount: number;
  dustCount: number;
  heartCount: number;
  petalCount: number;
  maxPhotos: number;
  maxDpr: number;
  enableNebula: boolean;
}

export function detectUniverseQuality(reducedMotion: boolean): UniverseQuality {
  if (reducedMotion) {
    return {
      tier: 'low',
      starCount: 900,
      dustCount: 60,
      heartCount: 0,
      petalCount: 8,
      maxPhotos: 3,
      maxDpr: 1,
      enableNebula: false
    };
  }

  const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
  const lowMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined
    && (navigator as Navigator & { deviceMemory?: number }).deviceMemory! < 4;

  if (isMobile || lowMemory) {
    return {
      tier: 'low',
      starCount: 1100,
      dustCount: 140,
      heartCount: 6,
      petalCount: 12,
      maxPhotos: 4,
      maxDpr: 1.5,
      enableNebula: true
    };
  }

  if (window.innerWidth < 1200) {
    return {
      tier: 'medium',
      starCount: 2000,
      dustCount: 220,
      heartCount: 10,
      petalCount: 20,
      maxPhotos: 5,
      maxDpr: 1.75,
      enableNebula: true
    };
  }

  return {
    tier: 'high',
    starCount: 2800,
    dustCount: 320,
    heartCount: 14,
    petalCount: 28,
    maxPhotos: 6,
    maxDpr: 2,
    enableNebula: true
  };
}

export interface PhotoOrbData {
  id: number;
  imageUrl: string;
  title?: string | null;
}
