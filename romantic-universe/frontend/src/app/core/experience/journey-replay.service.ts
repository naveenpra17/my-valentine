import { Injectable, inject } from '@angular/core';
import { ExperienceStateService } from './experience-state.service';
import { ConstellationStar, HeartObject, HeartObjectType } from './experience-state.types';

export type JourneyEventKind =
  | 'photo'
  | 'memory'
  | 'reason'
  | 'quote'
  | 'love-bomb'
  | 'flower'
  | 'secret'
  | 'symbol';

export interface JourneyReplayEvent {
  kind: JourneyEventKind;
  referenceId: number | string;
  label?: string;
  subtitle?: string;
  imageUrl?: string;
  discoveredAt: number;
}

const KIND_WHISPER: Partial<Record<JourneyEventKind, string>> = {
  photo: 'I remember this.',
  memory: 'A moment that stayed.',
  reason: 'Something I love...',
  quote: 'Words that stayed.',
  'love-bomb': 'A little burst of love.',
  flower: 'Something grew.',
  secret: 'You found something hidden.',
  symbol: 'A quiet moment.'
};

@Injectable({ providedIn: 'root' })
export class JourneyReplayService {
  private readonly state = inject(ExperienceStateService);

  /** Chronological discovery timeline from actual session state. */
  buildTimeline(): JourneyReplayEvent[] {
    const pool = this.state.heartPool();
    const poolLookup = new Map(
      pool.map(o => [`${o.type}-${o.referenceId}`, o])
    );

    const stars = [...this.state.constellationStars()].sort(
      (a, b) => a.discoveredAt - b.discoveredAt
    );

    const events: JourneyReplayEvent[] = [];
    for (const star of stars) {
      const kind = this.normalizeKind(star.sourceType);
      if (!kind) continue;

      const key = `${kind}-${star.referenceId}`;
      const obj = poolLookup.get(key);
      events.push({
        kind,
        referenceId: star.referenceId,
        label: obj?.label,
        subtitle: KIND_WHISPER[kind],
        imageUrl: obj?.thumbnailUrl ?? obj?.imageUrl,
        discoveredAt: star.discoveredAt
      });
    }
    return events;
  }

  /** Heart objects in selection order (source of truth for reconstruction). */
  getHeartComposition(): HeartObject[] {
    return [...this.state.selectedHeartObjects()];
  }

  hasJourney(): boolean {
    return this.state.constellationStars().length > 0;
  }

  hasHeart(): boolean {
    return this.state.selectedHeartObjects().length > 0;
  }

  private normalizeKind(
    sourceType: ConstellationStar['sourceType']
  ): JourneyEventKind | null {
    const allowed: JourneyEventKind[] = [
      'photo', 'memory', 'reason', 'quote', 'love-bomb', 'flower', 'secret', 'symbol'
    ];
    return allowed.includes(sourceType as JourneyEventKind)
      ? (sourceType as JourneyEventKind)
      : null;
  }
}
