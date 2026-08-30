import { Injectable, signal } from '@angular/core';

/** Tracks normalized scroll progress through the main experience beats (0–1). */
@Injectable({ providedIn: 'root' })
export class ScrollProgressService {
  private beatsEl?: HTMLElement;
  private raf = 0;

  readonly progress = signal(0);

  attach(beatsEl: HTMLElement): void {
    if (this.beatsEl === beatsEl) {
      this.update();
      return;
    }
    this.detach();
    this.beatsEl = beatsEl;
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll, { passive: true });
    this.update();
  }

  detach(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.beatsEl = undefined;
    this.progress.set(0);
  }

  private onScroll = (): void => {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.update();
    });
  };

  private update(): void {
    const el = this.beatsEl;
    if (!el) return;

    const total = el.scrollHeight - window.innerHeight;
    if (total <= 0) {
      this.progress.set(0);
      return;
    }

    const scrolled = Math.min(total, Math.max(0, -el.getBoundingClientRect().top));
    this.progress.set(scrolled / total);
  }
}
