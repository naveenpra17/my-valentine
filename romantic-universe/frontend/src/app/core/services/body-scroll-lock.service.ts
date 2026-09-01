import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BodyScrollLockService {
  private lockCount = 0;
  private previousOverflow = '';

  lock(): void {
    this.lockCount += 1;

    if (!document.body) return;

    if (this.lockCount === 1) {
      this.previousOverflow = document.body.style.overflow || getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  }

  unlock(): void {
    if (this.lockCount > 0) {
      this.lockCount -= 1;
    }

    if (this.lockCount === 0 && document.body) {
      document.body.style.overflow = this.previousOverflow || '';
      document.body.style.touchAction = '';
      this.previousOverflow = '';
    }
  }

  reset(): void {
    this.lockCount = 0;
    this.previousOverflow = '';

    if (document.body) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }
}
