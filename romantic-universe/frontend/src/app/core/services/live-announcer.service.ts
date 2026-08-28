import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LiveAnnouncerService {
  private region?: HTMLElement;

  constructor() {
    if (typeof document === 'undefined') return;

    this.region = document.createElement('div');
    this.region.setAttribute('aria-live', 'polite');
    this.region.setAttribute('aria-atomic', 'true');
    this.region.className = 'sr-only';
    document.body.appendChild(this.region);
  }

  announce(message: string): void {
    if (!this.region || !message.trim()) return;

    this.region.textContent = '';
    requestAnimationFrame(() => {
      if (this.region) {
        this.region.textContent = message;
      }
    });
  }
}
