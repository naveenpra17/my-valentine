import { Injectable, inject, signal } from '@angular/core';
import { TransitionService } from './transition.service';
import { CameraDirectorService } from './camera-director.service';
import { MotionService } from '../services/motion.service';

export type SceneMomentKind = 'photo' | 'memory' | 'reason' | 'quote' | 'idle';

export interface SceneMomentPayload {
  kind: SceneMomentKind;
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  date?: string | null;
  location?: string | null;
}

/**
 * Lightweight scene transition contract:
 * Universe → moment → Universe
 */
@Injectable({ providedIn: 'root' })
export class SceneMomentService {
  private readonly transitions = inject(TransitionService);
  private readonly camera = inject(CameraDirectorService);
  private readonly motion = inject(MotionService);

  readonly active = signal<SceneMomentPayload | null>(null);
  readonly transitioning = signal(false);

  async transitionIn(payload: SceneMomentPayload): Promise<void> {
    this.transitioning.set(true);
    if (!this.motion.prefersReducedMotion()) {
      await this.transitions.fadeThroughDarkness(0.9);
    }
    this.active.set(payload);
    this.transitioning.set(false);
  }

  async transitionOut(): Promise<void> {
    this.transitioning.set(true);
    this.active.set(null);
    if (!this.motion.prefersReducedMotion()) {
      await this.camera.returnToUniverse(1600);
      await this.transitions.fadeThroughDarkness(0.7);
    }
    this.transitioning.set(false);
  }
}
