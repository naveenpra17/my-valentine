import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  inject,
  input,
  signal
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { MotionService } from '../../core/services/motion.service';
import { LiveAnnouncerService } from '../../core/services/live-announcer.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { LoveBomb } from '../../core/models';

interface GameHeart {
  id: number;
  left: number;
  top: number;
  speed: number;
}

@Component({
  selector: 'app-love-bomb',
  standalone: true,
  templateUrl: './love-bomb.component.html',
  styleUrl: './love-bomb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoveBombComponent implements OnDestroy, AfterViewInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('arena') arenaRef!: ElementRef<HTMLElement>;
  @ViewChild('burstCanvas') burstCanvasRef!: ElementRef<HTMLCanvasElement>;

  readonly title = input('Love Bomb Attack');
  readonly subtitle = input('Catch the hearts before they fade');
  readonly introLine1 = input('Okay.');
  readonly introLine2 = input('Enough being sentimental.');
  readonly introLine3 = input('You\'ve been warned.');

  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly motion = inject(MotionService);
  private readonly announcer = inject(LiveAnnouncerService);
  private readonly experienceState = inject(ExperienceStateService);
  private readonly sounds = inject(SoundDesignService);
  private readonly scenes = inject(SceneManagerService);

  readonly hearts = signal<GameHeart[]>([]);
  readonly currentBomb = signal<LoveBomb | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showMessage = signal(false);
  readonly totalCaught = signal(0);
  readonly streak = signal(0);
  readonly playing = signal(false);

  private burstFrameId = 0;
  private gameFrameId = 0;
  private ctx?: CanvasRenderingContext2D;
  private nextHeartId = 1;
  private spawnTimer?: ReturnType<typeof setInterval>;
  private observer?: IntersectionObserver;
  private removingIds = new Set<number>();
  // Do not use a guessed height here. Until the arena has been laid out, a
  // guessed value lets hearts fall out of a zero-height clipped container.
  private arenaHeight = 0;
  private lastGameFrameAt = 0;

  private readonly maxHearts = 10;
  private readonly spawnIntervalMs = 700;

  constructor() {
    const stored = sessionStorage.getItem('love_bombs_count');
    if (stored) this.totalCaught.set(parseInt(stored, 10));
  }

  ngAfterViewInit(): void {
    const canvas = this.burstCanvasRef?.nativeElement;
    if (canvas) {
      this.ctx = canvas.getContext('2d')!;
      this.resizeCanvas();
      window.addEventListener('resize', this.resizeCanvas);
    }

    this.measureArena();
    this.initSceneObserver();

    // Always start shortly after view init — do not rely on intersection alone
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.startPlayground());
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.burstFrameId);
    cancelAnimationFrame(this.gameFrameId);
    window.removeEventListener('resize', this.resizeCanvas);
    this.observer?.disconnect();
    this.stopGame();
  }

  startPlayground(): void {
    this.sounds.enable();
    this.measureArena();
    if (this.arenaHeight < 80) {
      requestAnimationFrame(() => this.startPlayground());
      return;
    }
    if (this.playing()) {
      if (this.hearts().length === 0) {
        this.spawnHeart();
        this.spawnHeart();
        this.spawnHeart();
      }
      return;
    }

    this.playing.set(true);
    this.error.set(null);
    this.spawnHeart();
    this.spawnHeart();
    this.spawnHeart();
    this.spawnHeart();

    if (this.spawnTimer) clearInterval(this.spawnTimer);
    this.spawnTimer = setInterval(() => {
      if (this.hearts().length < this.maxHearts) {
        this.spawnHeart();
      }
    }, this.spawnIntervalMs);

    if (!this.gameFrameId) {
      this.startGameLoop();
    }
  }

  catchHeart(heart: GameHeart, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.loading() || this.removingIds.has(heart.id)) return;

    this.removingIds.add(heart.id);
    this.sounds.enable();
    this.sounds.play('love-bomb');
    this.hearts.update(list => list.filter(h => h.id !== heart.id));

    const arena = this.arenaRef?.nativeElement;
    if (arena && this.ctx) {
      const rect = arena.getBoundingClientRect();
      const x = (heart.left / 100) * rect.width;
      this.spawnBurst(x, heart.top);
    }

    void this.fetchLoveBomb();
  }

  dismissMessage(): void {
    this.showMessage.set(false);
    this.currentBomb.set(null);
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
      this.showMessage.set(true);
      if (bomb?.message) {
        this.experienceState.triggerLoveBomb(bomb.id, bomb.message);
        this.announcer.announce(bomb.message);
      }
    } catch {
      this.error.set('The love bomb fizzled... try again?');
      this.streak.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  private initSceneObserver(): void {
    if (!this.sectionRef?.nativeElement) return;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('love-bomb');
          this.startPlayground();
        }
      },
      { threshold: 0.1 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private measureArena(): void {
    const arena = this.arenaRef?.nativeElement;
    if (!arena) return;
    const height = arena.getBoundingClientRect().height;
    if (height > 0) this.arenaHeight = height;
    this.resizeCanvas();
  }

  private startGameLoop(): void {
    cancelAnimationFrame(this.gameFrameId);
    this.lastGameFrameAt = performance.now();
    const tick = (now: number): void => {
      if (!this.playing()) {
        this.gameFrameId = 0;
        return;
      }

      // Use elapsed time instead of pixels per animation frame. This keeps hearts
      // visible at the same pace on fast displays and after a tab resumes.
      const elapsedSeconds = Math.min((now - this.lastGameFrameAt) / 1000, 0.1);
      this.lastGameFrameAt = now;
      const limit = this.arenaHeight + 80;
      const next = this.hearts()
        .map(h => ({ ...h, top: h.top + h.speed * elapsedSeconds }))
        .filter(h => {
          if (h.top > limit) {
            this.streak.set(0);
            this.removingIds.delete(h.id);
            return false;
          }
          return true;
        });

      if (next.length !== this.hearts().length || next.some((h, i) => h.top !== this.hearts()[i]?.top)) {
        this.hearts.set(next);
      }

      this.gameFrameId = requestAnimationFrame(tick);
    };
    this.gameFrameId = requestAnimationFrame(tick);
  }

  private stopGame(): void {
    this.playing.set(false);
    if (this.spawnTimer) {
      clearInterval(this.spawnTimer);
      this.spawnTimer = undefined;
    }
    cancelAnimationFrame(this.gameFrameId);
    this.gameFrameId = 0;
    this.hearts.set([]);
    this.removingIds.clear();
  }

  private spawnHeart(): void {
    const id = this.nextHeartId++;
    const left = 8 + Math.random() * 84;
    const speed = this.motion.prefersReducedMotion() ? 70 : 100 + Math.random() * 50;
    // `top` is an explicit pixel coordinate. It avoids transform composition
    // issues that can leave a newly-created heart outside the clipped arena.
    this.hearts.update(list => [...list, { id, left, top: -48, speed }]);
  }

  private resizeCanvas = (): void => {
    const canvas = this.burstCanvasRef?.nativeElement;
    const arena = this.arenaRef?.nativeElement;
    if (!canvas || !arena || !this.ctx) return;
    const rect = arena.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.max(rect.width, 1) * dpr;
    canvas.height = Math.max(rect.height, 1) * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private spawnBurst(x: number, y: number): void {
    if (!this.ctx) return;
    const canvas = this.burstCanvasRef?.nativeElement;
    if (!canvas) return;

    const colors = ['#c9a0a8', '#9a8fa8', '#c4b08a', '#f5f0e8', '#d4b0b8'];
    const particles = Array.from({ length: 30 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: 40,
        size: 4,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });

    cancelAnimationFrame(this.burstFrameId);
    const animate = (): void => {
      if (!this.ctx) return;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      this.ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life += 1;
        if (p.life < p.maxLife) {
          alive = true;
          this.ctx.globalAlpha = 1 - p.life / p.maxLife;
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      if (alive) {
        this.burstFrameId = requestAnimationFrame(animate);
      }
    };
    animate();
  }
}
