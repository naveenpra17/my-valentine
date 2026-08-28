import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MotionService {
  prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  isMobile(): boolean {
    return window.innerWidth < 768 || this.isTouchDevice();
  }

  isNarrow(): boolean {
    return window.innerWidth < 480;
  }

  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /** Larger hit area for canvas / star taps on touch screens */
  touchHitRadius(base = 24): number {
    return this.isMobile() ? Math.max(base, 40) : base;
  }
}
