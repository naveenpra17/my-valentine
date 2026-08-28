import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject,
  input,
  output
} from '@angular/core';
import { MotionService } from '../../../core/services/motion.service';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
}

@Component({
  selector: 'app-particle-burst',
  standalone: true,
  template: `<canvas #canvas class="burst-canvas" aria-hidden="true"></canvas>`,
  styles: [`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
    }
    .burst-canvas {
      width: 100%;
      height: 100%;
    }
  `]
})
export class ParticleBurstComponent implements OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly active = input(false);
  readonly burstComplete = output<void>();

  private readonly motion = inject(MotionService);
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId = 0;
  private wasActive = false;

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvasRef.nativeElement;
      this.ctx = canvas.getContext('2d')!;
      this.resize();
      window.addEventListener('resize', this.onResize);
      this.tick();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.resize();
  };

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private tick = (): void => {
    if (this.active() && !this.wasActive) {
      this.spawnBurst();
      this.wasActive = true;
    }
    if (!this.active()) {
      this.wasActive = false;
    }

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.tick);
  };

  private spawnBurst(): void {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const colors = ['#e8a0bf', '#d4b8e8', '#e8d5b5', '#f8e8ee', '#c77d9e'];
    const count = this.motion.prefersReducedMotion() ? 20 : 80;

    this.particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        maxLife: Math.random() * 60 + 40,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2
      };
    });
  }

  private update(): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.vx *= 0.98;
      p.life += 1;
      p.rotation += p.vr;
    }
    this.particles = this.particles.filter(p => p.life < p.maxLife);

    if (this.wasActive && this.particles.length === 0 && this.active()) {
      this.burstComplete.emit();
      this.wasActive = false;
    }
  }

  private draw(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.clearRect(0, 0, w, h);

    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = alpha;

      if (Math.random() > 0.5) {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size * 0.5);
        this.ctx.bezierCurveTo(p.size * 0.5, -p.size, p.size, -p.size * 0.3, 0, p.size * 0.5);
        this.ctx.bezierCurveTo(-p.size, -p.size * 0.3, -p.size * 0.5, -p.size, 0, -p.size * 0.5);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }

      this.ctx.restore();
    }
  }
}
