import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { MotionService } from '../../core/services/motion.service';
import { LiveAnnouncerService } from '../../core/services/live-announcer.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
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

interface GameHeart {
  id: number;
  left: number;
}

@Component({
  selector: 'app-love-bomb',
  standalone: true,
  templateUrl: './love-bomb.component.html',
  styleUrl: './love-bomb.component.scss'
})
export class LoveBombComponent implements OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('arena') arenaRef!: ElementRef<HTMLElement>;
  @ViewChild('burstCanvas') burstCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('messageEl') messageElRef?: ElementRef<HTMLElement>;

  readonly title = input('Love Bomb Attack');
  readonly subtitle = input('Catch the hearts before they fade');

  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly motion = inject(MotionService);
  private readonly announcer = inject(LiveAnnouncerService);
  private readonly scenes = inject(SceneManagerService);

  readonly hearts = signal<GameHeart[]>([]);
  readonly currentBomb = signal<LoveBomb | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showMessage = signal(false);
  readonly totalCaught = signal(0);
  readonly streak = signal(0);
  readonly playing = signal(false);
  readonly reducedMotion = this.motion.prefersReducedMotion();

  private particles: MiniParticle[] = [];
  private animationId = 0;
  private ctx?: CanvasRenderingContext2D;
  private nextHeartId = 1;
  private spawnTimer?: ReturnType<typeof setInterval>;
  private heartTweens = new Map<number, gsap.core.Animation>();
  private observer?: IntersectionObserver;

  private readonly maxHearts = 5;
  private readonly spawnIntervalMs = 1400;

  constructor() {
    const stored = sessionStorage.getItem('love_bombs_count');
    if (stored) this.totalCaught.set(parseInt(stored, 10));

    afterNextRender(() => {
      const canvas = this.burstCanvasRef?.nativeElement;
      if (canvas) {
        this.ctx = canvas.getContext('2d')!;
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas);
      }
      this.initSceneObserver();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resizeCanvas);
    this.observer?.disconnect();
    this.stopGame();
    this.heartTweens.forEach(t => t.kill());
  }

  async catchHeart(heart: GameHeart, event: MouseEvent): Promise<void> {
    if (this.loading()) return;

    event.stopPropagation();
    this.removeHeart(heart.id);

    const arena = this.arenaRef?.nativeElement;
    if (arena) {
      const rect = arena.getBoundingClientRect();
      const x = (heart.left / 100) * rect.width;
      const y = rect.height * 0.5;
      this.spawnBurst(x, y);
    }

    await this.fetchLoveBomb();
  }

  async dropBomb(): Promise<void> {
    if (this.loading()) return;

    const arena = this.arenaRef?.nativeElement;
    if (arena) {
      const rect = arena.getBoundingClientRect();
      this.spawnBurst(rect.width / 2, rect.height / 2);
    }

    await this.fetchLoveBomb();
  }

  private async fetchLoveBomb(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.showMessage.set(false);

    try {
      const bomb = await firstValueFrom(this.api.getLoveBomb(this.session.getId()));
      this.currentBomb.set(bomb);
      this.totalCaught.update(n => {
        const next = n + 1;
        sessionStorage.setItem('love_bombs_count', String(next));
        return next;
      });
      this.streak.update(s => s + 1);
      this.revealMessage();
    } catch {
      this.error.set('The love bomb fizzled... try again?');
      this.streak.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  dismissMessage(): void {
    this.showMessage.set(false);
    this.currentBomb.set(null);
  }

  private revealMessage(): void {
    this.showMessage.set(true);
    const bomb = this.currentBomb();
    if (bomb?.message) {
      this.announcer.announce(bomb.message);
    }

    if (!this.motion.prefersReducedMotion() && this.messageElRef) {
      gsap.fromTo(this.messageElRef.nativeElement, {
        opacity: 0,
        scale: 0.9,
        y: 24,
        filter: 'blur(8px)'
      }, {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.8,
        ease: 'power3.out'
      });
    }
  }

  private initSceneObserver(): void {
    if (!this.sectionRef) return;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('love-bomb');
          this.startGame();
        } else {
          this.stopGame();
        }
      },
      { threshold: 0.25 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private startGame(): void {
    if (this.playing() || this.motion.prefersReducedMotion()) return;
    this.playing.set(true);
    this.spawnHeart();
    this.spawnTimer = setInterval(() => {
      if (this.hearts().length < this.maxHearts) {
        this.spawnHeart();
      }
    }, this.spawnIntervalMs);
  }

  private stopGame(): void {
    this.playing.set(false);
    if (this.spawnTimer) {
      clearInterval(this.spawnTimer);
      this.spawnTimer = undefined;
    }
    this.heartTweens.forEach(t => t.kill());
    this.heartTweens.clear();
    this.hearts.set([]);
  }

  private spawnHeart(): void {
    const id = this.nextHeartId++;
    const left = 12 + Math.random() * 76;
    const heart: GameHeart = { id, left };
    this.hearts.update(list => [...list, heart]);

    requestAnimationFrame(() => {
      const el = this.arenaRef?.nativeElement.querySelector(
        `[data-heart-id="${id}"]`
      ) as HTMLElement | null;
      if (!el) return;

      gsap.set(el, { top: '-12%', opacity: 0, scale: 0.6 });
      const tween = gsap.timeline()
        .to(el, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' })
        .to(el, {
          top: '108%',
          duration: 5 + Math.random() * 2,
          ease: 'none',
          onComplete: () => {
            this.missHeart(id);
          }
        }, 0)
        .to(el, {
          x: `+=${Math.random() > 0.5 ? 20 : -20}`,
          duration: 2.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1
        }, 0);

      this.heartTweens.set(id, tween);
    });
  }

  private missHeart(id: number): void {
    if (!this.hearts().some(h => h.id === id)) return;
    this.streak.set(0);
    this.removeHeart(id);
  }

  private removeHeart(id: number): void {
    const tween = this.heartTweens.get(id);
    if (tween) {
      tween.kill();
      this.heartTweens.delete(id);
    }
    this.hearts.update(list => list.filter(h => h.id !== id));
  }

  private resizeCanvas = (): void => {
    const canvas = this.burstCanvasRef?.nativeElement;
    const arena = this.arenaRef?.nativeElement;
    if (!canvas || !arena || !this.ctx) return;
    const rect = arena.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private spawnBurst(x: number, y: number): void {
    if (!this.ctx) return;

    const colors = ['#c9a0a8', '#9a8fa8', '#c4b08a', '#f5f0e8', '#d4b0b8'];
    const count = this.motion.prefersReducedMotion() ? 12 : 40;

    this.particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: Math.random() * 45 + 25,
        size: Math.random() * 5 + 2,
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
      p.vy += 0.1;
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
