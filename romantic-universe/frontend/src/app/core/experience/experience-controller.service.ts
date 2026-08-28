import { Injectable, computed, inject, signal } from '@angular/core';
import { ExperienceStateService } from './experience-state.service';
import { DirectorChapterId } from './experience-state.types';
import { SessionService } from '../services/session.service';
import { HeartShareService } from '../services/heart-share.service';

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
  visitedChapters: DirectorChapterId[];
  unlockedChapters: DirectorChapterId[];
  constellationRevealed: boolean;
  finaleSecretShown: boolean;
  /** @deprecated migrated to ExperienceStateService */
  experienceStarted?: boolean;
  /** @deprecated migrated to ExperienceStateService */
  experienceCompleted?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExperienceControllerService {
  private readonly state = inject(ExperienceStateService);
  private readonly session = inject(SessionService);
  private readonly heartShare = inject(HeartShareService);

  /** Single source of truth — delegated to ExperienceStateService. */
  readonly experienceStarted = this.state.experienceStarted;
  readonly experienceCompleted = this.state.experienceCompleted;

  readonly visitedChapters = signal<Set<DirectorChapterId>>(new Set());
  readonly unlockedChapters = signal<Set<DirectorChapterId>>(new Set([1]));
  readonly emotionalBeat = signal<EmotionalBeat>('curious');

  readonly constellationRevealed = signal(false);
  readonly finaleSecretShown = signal(false);

  readonly canShowProgress = computed(() => false);

  constructor() {
    this.restore();
  }

  startExperience(): void {
    this.state.setExperienceStarted(true);
    this.state.setChapter(1);
    this.setEmotionalBeat('wonder');
    this.unlockChapter(1);
    this.unlockChapter(2);
    this.persist();
  }

  restoreForReturningVisitor(): void {
    if (this.state.experienceStarted()) {
      this.unlockChapter(1);
      this.unlockChapter(2);
      for (const ch of this.visitedChapters()) {
        this.unlockChapter(ch);
        const next = (ch + 1) as DirectorChapterId;
        if (next <= 12) this.unlockChapter(next);
      }
      return;
    }
    this.startExperience();
  }

  completeExperience(): void {
    this.setEmotionalBeat('wow');
    this.state.setExperienceCompleted(true);
    this.persist();
  }

  visitChapter(chapter: DirectorChapterId): void {
    this.visitedChapters.update(set => new Set(set).add(chapter));
    this.state.setChapter(chapter);

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

  /** Clear journey progress and return to the opening. Keeps entry-lock unlock. */
  restartFromBeginning(): void {
    this.state.resetSession();
    this.resetForRestart();
    this.session.clearEntered();
    this.heartShare.clearPreviewCache();
    sessionStorage.removeItem('love_bombs_count');
    sessionStorage.removeItem('ru_heart_intro_seen');
    sessionStorage.removeItem('ru_heart_first_attach');
    window.location.assign(window.location.pathname || '/');
  }

  private resetForRestart(): void {
    this.visitedChapters.set(new Set());
    this.unlockedChapters.set(new Set([1]));
    this.constellationRevealed.set(false);
    this.finaleSecretShown.set(false);
    this.emotionalBeat.set('curious');
    sessionStorage.removeItem(CONTROLLER_STORAGE_KEY);
  }

  openEnvelope(id: number): void {
    this.state.openEnvelope(id);
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
      this.visitedChapters.set(new Set(data.visitedChapters ?? []));
      this.unlockedChapters.set(new Set(data.unlockedChapters ?? [1]));
      this.constellationRevealed.set(data.constellationRevealed ?? false);
      this.finaleSecretShown.set(data.finaleSecretShown ?? false);

      // Migrate legacy controller copies into ExperienceStateService once.
      if (data.experienceStarted && !this.state.experienceStarted()) {
        this.state.setExperienceStarted(true);
      }
      if (data.experienceCompleted && !this.state.experienceCompleted()) {
        this.state.setExperienceCompleted(true);
      }
    } catch {
      sessionStorage.removeItem(CONTROLLER_STORAGE_KEY);
    }
  }
}
