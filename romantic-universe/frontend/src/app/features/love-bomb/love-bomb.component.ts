import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  afterNextRender,
  inject,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { MotionService } from '../../core/services/motion.service';
import { LoveBomb } from '../../core/models';

interface MiniParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

@Component({
  selector: 'app-love-bomb',
  standalone: true,
  templateUrl: './love-bomb.component.html',
  styleUrl: './love-bomb.component.scss'
})
export class LoveBombComponent implements OnInit, OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('burstCanvas') burstCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('messageEl') messageElRef!: ElementRef<HTMLElement>;

  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly motion = inject(MotionService);

  readonly currentBomb = signal<LoveBomb | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showMessage = signal(false);
  readonly totalBombs = signal(0);

  private particles: MiniParticle[] = [];
  private animationId = 0;
  private ctx!: CanvasRenderingContext2D;

  constructor() {
    afterNextRender(() => {
      const canvas = this.burstCanvasRef?.nativeElement;
      if (canvas) {
        this.ctx = canvas.getContext('2d')!;
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas);
      }
    });
  }

  ngOnInit(): void {
    const stored = sessionStorage.getItem('love_bombs_count');
    if (stored) this.totalBombs.set(parseInt(stored, 10));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resizeCanvas);
  }

  async dropBomb(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.showMessage.set(false);

    try {
      const bomb = await firstValueFrom(this.api.getLoveBomb(this.session.getId()));
      this.currentBomb.set(bomb);
      this.totalBombs.update(n => {
        const next = n + 1;
        sessionStorage.setItem('love_bombs_count', String(next));
        return next;
      });

      this.spawnBurst();
      this.revealMessage();
    } catch {
      this.error.set('The love bomb fizzled... try again?');
    } finally {
      this.loading.set(false);
    }
  }

  private revealMessage(): void {
    this.showMessage.set(true);

    if (!this.motion.prefersReducedMotion() && this.messageElRef) {
      gsap.fromTo(
        this.messageElRef.nativeElement,
        { opacity: 0, scale: 0.8, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' }
      );
    }
  }

  private resizeCanvas = (): void => {
    const canvas = this.burstCanvasRef?.nativeElement;
    if (!canvas) return;
    const section = this.sectionRef?.nativeElement;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private spawnBurst(): void {
    const section = this.sectionRef?.nativeElement;
    if (!section || !this.ctx) return;

    const rect = section.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height * 0.4;
    const colors = ['#e8a0bf', '#d4b8e8', '#e8d5b5', '#f8e8ee', '#c77d9e'];
    const count = this.motion.prefersReducedMotion() ? 15 : 50;

    this.particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 0,
        maxLife: Math.random() * 50 + 30,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });

    cancelAnimationFrame(this.animationId);
    this.animateBurst();
  }

  private animateBurst = (): void => {
    const canvas = this.burstCanvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, w, h);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life += 1;

      const alpha = 1 - p.life / p.maxLife;
      this.ctx.globalAlpha = Math.max(0, alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.particles = this.particles.filter(p => p.life < p.maxLife);

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.animateBurst);
    }
  };
}
