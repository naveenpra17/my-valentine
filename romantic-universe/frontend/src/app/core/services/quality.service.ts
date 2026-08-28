import { Injectable, inject } from '@angular/core';
import { MotionService } from './motion.service';

export type QualityLevel = 'low' | 'medium' | 'high';

@Injectable({ providedIn: 'root' })
export class QualityService {
  private readonly motion = inject(MotionService);

  /** Adaptive rendering quality for Three.js scenes. */
  getLevel(): QualityLevel {
    if (this.motion.prefersReducedMotion()) return 'low';

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;

    if (this.motion.isMobile()) {
      if (w < 360 || dpr > 2.5) return 'low';
      return 'medium';
    }

    if (w < 1024) return 'medium';
    return 'high';
  }

  particleMultiplier(): number {
    switch (this.getLevel()) {
      case 'low': return 0.35;
      case 'medium': return 0.65;
      case 'high': return 1;
    }
  }

  maxDpr(): number {
    switch (this.getLevel()) {
      case 'low': return 1;
      case 'medium': return 1.5;
      case 'high': return 2;
    }
  }
}
