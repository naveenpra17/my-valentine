import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../../../core/services/motion.service';
import { FocusTrapService } from '../../../core/services/focus-trap.service';
import { getImageFallbacks } from '../../../core/utils/image-fallback';

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
}

@Component({
  selector: 'app-cinematic-lightbox',
  standalone: true,
  template: `
    @if (open()) {
      <div
        class="cine-lightbox"
        #overlay
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="ariaLabel()"
        (click)="onBackdrop($event)"
      >
        <canvas #dustCanvas class="cine-lightbox__dust" aria-hidden="true"></canvas>
        <div class="cine-lightbox__frame" #frame>
          @if (imageUrl()) {
            <img
              class="cine-lightbox__img"
              [src]="resolvedImageUrl()"
              [alt]="title() || 'Photo'"
              #img
              (error)="onImageError()"
            />
          } @else {
            <div class="cine-lightbox__placeholder" aria-hidden="true">💕</div>
          }
        </div>
        <div class="cine-lightbox__body" #body>
          <ng-content />
        </div>
        <button
          class="cine-lightbox__close cine-enter-btn"
          type="button"
          (click)="requestClose()"
          aria-label="Close"
        >
          Close
        </button>
      </div>
    }
  `,
  styles: [`
    .cine-lightbox {
      position: fixed;
      inset: 0;
      z-index: 300;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: clamp(1rem, 4vw, 2rem);
      background: rgba(5, 3, 8, 0.92);
      backdrop-filter: blur(12px);
    }

    .cine-lightbox__dust {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .cine-lightbox__frame {
      position: relative;
      z-index: 1;
      max-width: min(560px, 92vw);
      width: 100%;
      border: 1px solid rgba(245, 240, 232, 0.12);
      box-shadow: 0 0 80px rgba(201, 160, 168, 0.15);
      overflow: hidden;
      will-change: transform, opacity;
    }

    .cine-lightbox__img {
      display: block;
      width: 100%;
      max-height: 55vh;
      object-fit: cover;
      aspect-ratio: 4 / 5;
    }

    .cine-lightbox__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      background: radial-gradient(ellipse at center, var(--night-soft), var(--void));
      font-size: 3rem;
      opacity: 0.6;
    }

    .cine-lightbox__body {
      position: relative;
      z-index: 1;
      max-width: min(560px, 92vw);
      width: 100%;
      margin-top: 1.5rem;
      text-align: center;
      will-change: transform, opacity;
    }

    .cine-lightbox__close {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 2;
    }
  `]
})
export class CinematicLightboxComponent implements OnDestroy {
  @ViewChild('overlay') overlayRef?: ElementRef<HTMLElement>;
  @ViewChild('frame') frameRef?: ElementRef<HTMLElement>;
  @ViewChild('body') bodyRef?: ElementRef<HTMLElement>;
  @ViewChild('dustCanvas') dustCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly open = input(false);
  readonly imageUrl = input('');
  readonly title = input('');
  readonly ariaLabel = input('Photo viewer');
  readonly sourceRect = input<DOMRect | null>(null);

  readonly close = output<void>();

  readonly resolvedImageUrl = signal('');
  readonly imageError = signal(false);
  private readonly motion = inject(MotionService);
  private readonly focusTrap = inject(FocusTrapService);
  private dustParticles: DustParticle[] = [];
  private dustAnimId = 0;
  private wasOpen = false;

  constructor() {
    effect(() => {
      const image = this.imageUrl();
      this.resolvedImageUrl.set(image);
      this.imageError.set(false);
    });

    effect(() => {
      const isOpen = this.open();
      if (isOpen && !this.wasOpen) {
        this.wasOpen = true;
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
          this.playOpen();
          const overlay = this.overlayRef?.nativeElement;
          if (overlay) {
            this.focusTrap.activate(overlay, () => this.requestClose());
          }
        });
      } else if (!isOpen && this.wasOpen) {
        this.wasOpen = false;
        document.body.style.overflow = '';
        this.focusTrap.deactivate();
      }
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.dustAnimId);
    document.body.style.overflow = '';
    this.focusTrap.deactivate();
  }

  requestClose(): void {
    void this.playClose().then(() => this.close.emit());
  }

  onImageError(): void {
    const current = this.resolvedImageUrl();
    const candidates = getImageFallbacks(current);
    const next = candidates.find(candidate => candidate !== current && candidate.length > 0);

    if (next) {
      this.resolvedImageUrl.set(next);
      this.imageError.set(false);
      return;
    }

    this.imageError.set(true);
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  private playOpen(): void {
    const frame = this.frameRef?.nativeElement;
    const body = this.bodyRef?.nativeElement;
    const overlay = this.overlayRef?.nativeElement;
    if (!frame || !overlay) return;

    this.spawnDust();

    if (this.motion.prefersReducedMotion()) {
      gsap.set([frame, body], { opacity: 1, scale: 1, y: 0 });
      gsap.set(overlay, { opacity: 1 });
      return;
    }

    const rect = this.sourceRect();
    gsap.set(overlay, { opacity: 0 });
    if (body) {
      gsap.set(body, { opacity: 0, y: 20 });
    }

    if (rect) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2 - 40;
      const scaleX = rect.width / frame.offsetWidth;
      const scaleY = rect.height / frame.offsetHeight;
      const scale = Math.max(scaleX, scaleY, 0.2);

      gsap.set(frame, {
        x: rect.left + rect.width / 2 - cx,
        y: rect.top + rect.height / 2 - cy,
        scale,
        opacity: 0.6,
        transformOrigin: 'center center'
      });
    } else {
      gsap.set(frame, { scale: 0.85, opacity: 0, y: 30 });
    }

    const tl = gsap.timeline();
    tl.to(overlay, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    tl.to(frame, {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 1.1,
      ease: 'power3.out'
    }, '-=0.2');
    if (body) {
      tl.to(body, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, '-=0.5');
    }
  }

  private playClose(): Promise<void> {
    const frame = this.frameRef?.nativeElement;
    const body = this.bodyRef?.nativeElement;
    const overlay = this.overlayRef?.nativeElement;
    if (!frame || !overlay || this.motion.prefersReducedMotion()) {
      return Promise.resolve();
    }

    this.spawnDust();

    return new Promise(resolve => {
      const tl = gsap.timeline({ onComplete: resolve });
      if (body) {
        tl.to(body, { opacity: 0, y: -12, duration: 0.35, ease: 'power2.in' });
      }
      tl.to(frame, {
        scale: 0.92,
        opacity: 0,
        filter: 'blur(8px)',
        duration: 0.5,
        ease: 'power2.in'
      }, '-=0.1');
      tl.to(overlay, { opacity: 0, duration: 0.4, ease: 'power2.in' }, '-=0.2');
    });
  }

  private spawnDust(): void {
    if (this.motion.prefersReducedMotion()) return;

    const canvas = this.dustCanvasRef?.nativeElement;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const count = 60;

    this.dustParticles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.5 + 0.5;
      return {
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        life: 0,
        maxLife: Math.random() * 50 + 30,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.2
      };
    });

    cancelAnimationFrame(this.dustAnimId);
    const animate = (): void => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const p of this.dustParticles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        p.life += 1;
        const fade = 1 - p.life / p.maxLife;
        ctx.globalAlpha = p.alpha * fade;
        ctx.fillStyle = '#c9a0a8';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      this.dustParticles = this.dustParticles.filter(p => p.life < p.maxLife);
      if (this.dustParticles.length > 0) {
        this.dustAnimId = requestAnimationFrame(animate);
      }
    };
    animate();
  }
}
