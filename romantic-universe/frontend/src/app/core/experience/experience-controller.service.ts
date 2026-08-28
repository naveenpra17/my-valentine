import { Injectable, computed, inject, signal } from '@angular/core';
import { ExperienceStateService } from './experience-state.service';
import { DirectorChapterId } from './experience-state.types';

const CONTROLLER_STORAGE_KEY = 'ru_controller_v1';

/** Central cinematic orchestrator — emotional pacing, chapter gates, story flow. */
type EmotionalBeat =
  | 'curious'
  | 'wonder'
  | 'discovery'
  | 'smile'
  | 'nostalgia'
  | 'playful'
  | 'intimate'
  | 'creative'
  | 'emotional'
  | 'wow';

interface PersistedControllerState {
  experienceStarted: boolean;
  experienceCompleted: boolean;
  visitedChapters: DirectorChapterId[];
  unlockedChapters: DirectorChapterId[];
  constellationRevealed: boolean;
  finaleSecretShown: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExperienceControllerService {
  private readonly state = inject(ExperienceStateService);

  readonly experienceStarted = signal(false);
  readonly experienceCompleted = signal(false);
  readonly visitedChapters = signal<Set<DirectorChapterId>>(new Set());
  readonly unlockedChapters = signal<Set<DirectorChapterId>>(new Set([1]));
  readonly emotionalBeat = signal<EmotionalBeat>('curious');

  readonly constellationRevealed = signal(false);
  readonly finaleSecretShown = signal(false);

  readonly canShowProgress = computed(() => this.visitedChapters().size >= 2);

  constructor() {
    this.restore();
  }

  startExperience(): void {
    this.experienceStarted.set(true);
    this.state.setChapter(1);
    this.setEmotionalBeat('wonder');
    this.unlockAllChapters();
    this.persist();
  }

  restoreForReturningVisitor(): void {
    if (this.experienceStarted()) {
      this.unlockAllChapters();
      return;
    }
    this.startExperience();
  }

  completeExperience(): void {
    this.experienceCompleted.set(true);
    this.setEmotionalBeat('wow');
    this.persist();
  }

  visitChapter(chapter: DirectorChapterId): void {
    this.visitedChapters.update(set => new Set(set).add(chapter));
    this.state.setChapter(Math.min(chapter, 10) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10);

    const beats: Partial<Record<DirectorChapterId, EmotionalBeat>> = {
      1: 'wonder',
      2: 'discovery',
      3: 'discovery',
      4: 'nostalgia',
      5: 'smile',
      6: 'playful',
      7: 'emotional',
      8: 'creative',
      9: 'intimate',
      10: 'emotional',
      11: 'emotional',
      12: 'wow'
    };
    const beat = beats[chapter];
    if (beat) this.setEmotionalBeat(beat);

    const next = (chapter + 1) as DirectorChapterId;
    if (next <= 12) {
      this.unlockChapter(next);
    }
    this.persist();
  }

  isChapterUnlocked(chapter: DirectorChapterId): boolean {
    return this.unlockedChapters().has(chapter);
  }

  isChapterVisited(chapter: DirectorChapterId): boolean {
    return this.visitedChapters().has(chapter);
  }

  revealConstellation(): void {
    this.constellationRevealed.set(true);
    this.setEmotionalBeat('emotional');
    this.persist();
  }

  showFinaleSecret(): void {
    this.finaleSecretShown.set(true);
    this.persist();
  }

  openEnvelope(id: number): void {
    this.state.openEnvelope(id);
  }

  private unlockAllChapters(): void {
    const all = new Set<DirectorChapterId>();
    for (let i = 1; i <= 12; i++) {
      all.add(i as DirectorChapterId);
    }
    this.unlockedChapters.set(all);
  }

  private unlockChapter(chapter: DirectorChapterId): void {
    this.unlockedChapters.update(set => new Set(set).add(chapter));
  }

  private setEmotionalBeat(beat: EmotionalBeat): void {
    this.emotionalBeat.set(beat);
  }

  private persist(): void {
    if (typeof sessionStorage === 'undefined') return;
    const data: PersistedControllerState = {
      experienceStarted: this.experienceStarted(),
      experienceCompleted: this.experienceCompleted(),
      visitedChapters: [...this.visitedChapters()],
      unlockedChapters: [...this.unlockedChapters()],
      constellationRevealed: this.constellationRevealed(),
      finaleSecretShown: this.finaleSecretShown()
    };
    sessionStorage.setItem(CONTROLLER_STORAGE_KEY, JSON.stringify(data));
  }

  private restore(): void {
    if (typeof sessionStorage === 'undefined') return;
    const raw = sessionStorage.getItem(CONTROLLER_STORAGE_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as PersistedControllerState;
      this.experienceStarted.set(data.experienceStarted ?? false);
      this.experienceCompleted.set(data.experienceCompleted ?? false);
      this.visitedChapters.set(new Set(data.visitedChapters ?? []));
      this.unlockedChapters.set(new Set(data.unlockedChapters ?? [1]));
      this.constellationRevealed.set(data.constellationRevealed ?? false);
      this.finaleSecretShown.set(data.finaleSecretShown ?? false);
    } catch {
      sessionStorage.removeItem(CONTROLLER_STORAGE_KEY);
    }
  }
}
