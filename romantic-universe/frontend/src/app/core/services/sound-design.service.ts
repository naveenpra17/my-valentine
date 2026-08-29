import { Injectable, inject, signal } from '@angular/core';
import { MotionService } from './motion.service';
import { ExperienceStateService } from '../experience/experience-state.service';
import { MusicalChoreographyService } from '../audio/musical-choreography.service';
import { MotifKind } from '../audio/musical-choreography.types';

type SfxId = MotifKind;

@Injectable({ providedIn: 'root' })
export class SoundDesignService {
  private readonly motion = inject(MotionService);
  private readonly experience = inject(ExperienceStateService);
  private readonly music = inject(MusicalChoreographyService);

  readonly enabled = this.music.enabled;

  enable(): void {
    if (this.motion.prefersReducedMotion()) return;
    this.music.enable();
    this.experience.setMusicEnabled(true);
  }

  play(id: SfxId): void {
    if (!this.enabled() || this.motion.prefersReducedMotion()) return;
    this.music.playMotif(id);
  }
}
