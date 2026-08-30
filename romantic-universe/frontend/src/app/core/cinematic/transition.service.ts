import { Injectable, inject } from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../services/motion.service';
import { SceneManagerService } from './scene-manager.service';
import { TransitionType } from './types';

@Injectable({ providedIn: 'root' })
export class TransitionService {
  private readonly motion = inject(MotionService);
  private readonly sceneManager = inject(SceneManagerService);

  async transition(
    fromEl: HTMLElement | null,
    toEl: HTMLElement | null,
    type: TransitionType = 'fade-dark'
  ): Promise<void> {
    if (this.motion.prefersReducedMotion()) {
      if (fromEl) gsap.set(fromEl, { opacity: 0 });
      if (toEl) gsap.set(toEl, { opacity: 1 });
      return;
    }

    this.sceneManager.setTransitioning(true);

    const overlay = this.createOverlay();

    try {
      switch (type) {
        case 'fade-dark':
          await this.fadeDark(fromEl, toEl, overlay);
          break;
        case 'blur':
          await this.blurTransition(fromEl, toEl, overlay);
          break;
        case 'zoom-in':
          await this.zoomTransition(fromEl, toEl, overlay, 1.08);
          break;
        case 'zoom-out':
          await this.zoomTransition(fromEl, toEl, overlay, 0.92);
          break;
        case 'dissolve':
          await this.dissolve(fromEl, toEl, overlay);
          break;
        case 'light-sweep':
          await this.lightSweep(fromEl, toEl, overlay);
          break;
        default:
          await this.fadeDark(fromEl, toEl, overlay);
      }
    } finally {
      overlay.remove();
      this.sceneManager.setTransitioning(false);
    }
  }

  fadeThroughDarkness(duration = 1.2): Promise<void> {
    if (this.motion.prefersReducedMotion()) {
      return Promise.resolve();
    }
    const overlay = this.createOverlay();
    return new Promise(resolve => {
      gsap.fromTo(overlay, { opacity: 0 }, {
        opacity: 1,
        duration: duration / 2,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(overlay, {
            opacity: 0,
            duration: duration / 2,
            ease: 'power2.out',
            onComplete: () => {
              overlay.remove();
              resolve();
            }
          });
        }
      });
    });
  }

  private createOverlay(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cine-transition-overlay';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }

  private fadeDark(
    fromEl: HTMLElement | null,
    toEl: HTMLElement | null,
    overlay: HTMLElement
  ): Promise<void> {
    return new Promise(resolve => {
      const tl = gsap.timeline({ onComplete: resolve });
      if (fromEl) {
        tl.to(fromEl, { opacity: 0, duration: 0.8, ease: 'power2.in' });
      }
      tl.to(overlay, { opacity: 1, duration: 0.6, ease: 'power2.in' }, '-=0.3');
      if (toEl) {
        gsap.set(toEl, { opacity: 0 });
        tl.set(toEl, { opacity: 1 });
      }
      tl.to(overlay, { opacity: 0, duration: 0.8, ease: 'power2.out' });
    });
  }

  private blurTransition(
    fromEl: HTMLElement | null,
    toEl: HTMLElement | null,
    overlay: HTMLElement
  ): Promise<void> {
    return new Promise(resolve => {
      const tl = gsap.timeline({ onComplete: resolve });
      if (fromEl) {
        tl.to(fromEl, { opacity: 0, filter: 'blur(20px)', duration: 0.9, ease: 'power2.in' });
      }
      tl.to(overlay, { opacity: 1, duration: 0.5 }, '-=0.4');
      if (toEl) gsap.set(toEl, { opacity: 0, filter: 'blur(12px)' });
      tl.add(() => { if (toEl) gsap.set(toEl, { opacity: 1 }); });
      tl.to(toEl, { filter: 'blur(0px)', duration: 1, ease: 'power3.out' }, '-=0.2');
      tl.to(overlay, { opacity: 0, duration: 0.6 }, '-=0.8');
    });
  }

  private zoomTransition(
    fromEl: HTMLElement | null,
    toEl: HTMLElement | null,
    overlay: HTMLElement,
    scale: number
  ): Promise<void> {
    return new Promise(resolve => {
      const tl = gsap.timeline({ onComplete: resolve });
      if (fromEl) {
        tl.to(fromEl, { opacity: 0, scale, duration: 1, ease: 'power3.in' });
      }
      tl.to(overlay, { opacity: 1, duration: 0.4 }, '-=0.5');
      if (toEl) gsap.set(toEl, { opacity: 0, scale: 2 - scale });
      tl.add(() => { if (toEl) gsap.set(toEl, { opacity: 1 }); });
      tl.to(toEl, { scale: 1, duration: 1.2, ease: 'power3.out' }, '-=0.2');
      tl.to(overlay, { opacity: 0, duration: 0.6 }, '-=0.6');
    });
  }

  private dissolve(
    fromEl: HTMLElement | null,
    toEl: HTMLElement | null,
    overlay: HTMLElement
  ): Promise<void> {
    return new Promise(resolve => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(overlay, { opacity: 0.9, duration: 0.5 });
      if (fromEl) tl.to(fromEl, { opacity: 0, duration: 0.8 }, 0);
      if (toEl) {
        gsap.set(toEl, { opacity: 0 });
        tl.to(toEl, { opacity: 1, duration: 1 }, 0.6);
      }
      tl.to(overlay, { opacity: 0, duration: 0.7 }, '-=0.3');
    });
  }

  private lightSweep(
    fromEl: HTMLElement | null,
    toEl: HTMLElement | null,
    overlay: HTMLElement
  ): Promise<void> {
    overlay.style.background = 'linear-gradient(105deg, transparent 40%, rgba(245,240,232,0.08) 50%, transparent 60%)';
    overlay.style.backgroundSize = '200% 100%';
    return new Promise(resolve => {
      const tl = gsap.timeline({ onComplete: resolve });
      if (fromEl) tl.to(fromEl, { opacity: 0, duration: 0.6 });
      tl.fromTo(overlay, { opacity: 0, backgroundPosition: '200% 0' }, {
        opacity: 1,
        backgroundPosition: '-100% 0',
        duration: 1.2,
        ease: 'power2.inOut'
      });
      if (toEl) gsap.set(toEl, { opacity: 0 });
      tl.add(() => { if (toEl) gsap.set(toEl, { opacity: 1 }); });
      tl.to(overlay, { opacity: 0, duration: 0.5 });
    });
  }
}
