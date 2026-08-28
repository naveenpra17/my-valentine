import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject
} from '@angular/core';
import { MotionService } from '../../core/services/motion.service';
import { VisibilityService } from '../../core/services/visibility.service';
import { LoveUniverseScene } from './love-universe-scene';

@Component({
  selector: 'app-love-universe',
  standalone: true,
  template: `
    <section class="love-universe" #section>
      <div class="love-universe__canvas-wrap" #canvasHost></div>
      <div class="love-universe__overlay">
        <p class="love-universe__hint">Move your cursor to explore ✨</p>
        <div class="love-universe__scroll-hint">
          <span>Scroll to continue</span>
          <div class="love-universe__chevron"></div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .love-universe {
      position: relative;
      width: 100%;
      height: 100vh;
      height: 100dvh;
      background: radial-gradient(ellipse at 50% 30%, #2a1520 0%, var(--night) 70%);
      overflow: hidden;
    }

    .love-universe__canvas-wrap {
      position: absolute;
      inset: 0;
    }

    .love-universe__canvas-wrap ::ng-deep canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }

    .love-universe__overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding-bottom: 3rem;
      pointer-events: none;
      z-index: 2;
    }

    .love-universe__hint {
      font-family: var(--font-display);
      font-size: clamp(1rem, 2.5vw, 1.25rem);
      color: rgba(255, 248, 240, 0.6);
      font-style: italic;
      margin-bottom: 2rem;
    }

    .love-universe__scroll-hint {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: var(--rose);
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      animation: bob 2s ease-in-out infinite;
    }

    .love-universe__chevron {
      width: 20px;
      height: 20px;
      border-right: 2px solid var(--rose);
      border-bottom: 2px solid var(--rose);
      transform: rotate(45deg);
      opacity: 0.7;
    }

    @keyframes bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(6px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .love-universe__scroll-hint {
        animation: none;
      }
    }
  `]
})
export class LoveUniverseComponent implements OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLElement>;
  @ViewChild('section', { static: true }) section!: ElementRef<HTMLElement>;

  private readonly motion = inject(MotionService);
  private readonly visibility = inject(VisibilityService);
  private scene?: LoveUniverseScene;
  private observer?: IntersectionObserver;
  private inViewport = true;

  constructor() {
    afterNextRender(() => {
      this.scene = new LoveUniverseScene(
        this.canvasHost.nativeElement,
        this.motion.prefersReducedMotion()
      );
      this.scene.init();
      this.scene.start();

      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.inViewport = entry.isIntersecting;
          this.updateSceneVisibility();
        },
        { threshold: 0.1 }
      );
      this.observer.observe(this.section.nativeElement);

      document.addEventListener('visibilitychange', this.onVisibilityChange);
    });
  }

  private onVisibilityChange = (): void => {
    this.updateSceneVisibility();
  };

  private updateSceneVisibility(): void {
    this.scene?.setVisible(this.inViewport && this.visibility.pageVisible());
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.observer?.disconnect();
    this.scene?.dispose();
  }
}
