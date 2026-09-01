import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BodyScrollLockService {
  private lockCount = 0;

  lock(): void {
    this.lockCount += 1;
    if (document.body) {
      document.body.style.overflow = 'hidden';
    }
  }

  unlock(): void {
    if (this.lockCount > 0) {
      this.lockCount -= 1;
    }

    if (this.lockCount === 0 && document.body) {
      document.body.style.overflow = '';
    }
  }

  reset(): void {
    this.lockCount = 0;
    if (document.body) {
      document.body.style.overflow = '';
    }
  }
}
