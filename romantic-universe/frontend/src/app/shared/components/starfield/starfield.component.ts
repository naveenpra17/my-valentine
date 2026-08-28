import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject,
  input
} from '@angular/core';
import { MotionService } from '../../../core/services/motion.service';

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

@Component({
  selector: 'app-starfield',
  standalone: true,
  template: `<canvas #canvas class="starfield-canvas" aria-hidden="true"></canvas>`,
  styles: [`
    :host {
      display: block;
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }
    .starfield-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `]
})
export class StarfieldComponent implements OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly density = input(120);

  private readonly motion = inject(MotionService);
  private ctx!: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private animationId = 0;
  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => this.init());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
  }

  private init(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.createStars();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);

    if (!this.motion.prefersReducedMotion()) {
      this.animate();
    } else {
      this.draw(0);
    }
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.createStars();
  }

  private createStars(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const count = Math.floor(this.density() * (w * h) / (1920 * 1080));

    this.stars = Array.from({ length: Math.max(count, 40) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() * 1.8 + 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      twinkleSpeed: Math.random() * 0.002 + 0.001,
      twinkleOffset: Math.random() * Math.PI * 2
    }));
  }

  private animate(): void {
    const tick = (time: number) => {
      this.draw(time);
      this.animationId = requestAnimationFrame(tick);
    };
    this.animationId = requestAnimationFrame(tick);
  }

  private draw(time: number): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, w, h);

    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 248, 240, ${star.alpha * twinkle})`;
      this.ctx.fill();
    }
  }
}
