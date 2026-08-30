import { Injectable, inject } from '@angular/core';
import { MotionService } from '../services/motion.service';

export type NavScrollBlock = ScrollLogicalPosition;

/** Reliable scroll helpers for laptop + mobile (iOS-safe window.scrollTo). */
@Injectable({ providedIn: 'root' })
export class ExperienceNavigationService {
  private readonly motion = inject(MotionService);

  scrollTo(
    target: string | HTMLElement | null | undefined,
    block: NavScrollBlock = 'start'
  ): boolean {
    const el = this.resolve(target);
    if (!el) return false;

    const behavior = this.motion.prefersReducedMotion() ? 'auto' : 'smooth';
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight;
    let top = rect.top + window.scrollY;

    if (block === 'center') {
      top -= (viewport - rect.height) / 2;
    } else if (block === 'end') {
      top -= viewport - rect.height;
    }

    window.scrollTo({ top: Math.max(0, top), behavior });
    return true;
  }

  scrollToNextBeat(from: HTMLElement): boolean {
    const next = from.closest('.experience-beat')?.nextElementSibling as HTMLElement | null;
    return next ? this.scrollTo(next) : false;
  }

  scrollToDiscovery(): boolean {
    return (
      this.scrollTo('.experience-beat--hero') ||
      this.scrollTo('#universe-discovery-zone') ||
      this.scrollTo('#hero')
    );
  }

  scrollToHeart(): boolean {
    return this.scrollTo('#our-heart');
  }

  scrollToLoveBomb(): boolean {
    return this.scrollTo('#love-bombs');
  }

  scrollToFinale(): boolean {
    return this.scrollTo('#finale');
  }

  private resolve(target: string | HTMLElement | null | undefined): HTMLElement | null {
    if (!target) return null;
    if (typeof target === 'string') {
      if (target.startsWith('.') || target.startsWith('[')) {
        return document.querySelector(target) as HTMLElement | null;
      }
      return document.getElementById(target.replace(/^#/, ''));
    }
    return target;
  }
}
