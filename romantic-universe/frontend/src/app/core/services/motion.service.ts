import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MotionService {
  prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
