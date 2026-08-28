import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  afterNextRender,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MotionService } from '../../core/services/motion.service';
import { VisibilityService } from '../../core/services/visibility.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { LiveAnnouncerService } from '../../core/services/live-announcer.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { Quote } from '../../core/models';

interface StarNode {
  x: number;
  y: number;
  radius: number;
  quote: Quote;
  twinkleOffset: number;
  pulse: number;
  heartIndex: number;
}

@Component({
  selector: 'app-quote-constellation',
  standalone: true,
  templateUrl: './quote-constellation.component.html',
  styleUrl: './quote-constellation.component.scss'
})
export class QuoteConstellationComponent implements OnInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('quotePanel') quotePanelRef?: ElementRef<HTMLElement>;

  readonly title = input('Messages Written in Stars');
  readonly subtitle = input('Tap a star — they form a heart for you');

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);
  private readonly visibility = inject(VisibilityService);
  private readonly experienceState = inject(ExperienceStateService);
  private readonly announcer = inject(LiveAnnouncerService);
  private readonly scenes = inject(SceneManagerService);
  private observer?: IntersectionObserver;
  private inView = false;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedQuote = signal<Quote | null>(null);
  readonly heartRevealed = signal(false);

  private ctx!: CanvasRenderingContext2D;
  private stars: StarNode[] = [];
  private heartOutline: { x: number; y: number }[] = [];
  private animationId = 0;
  private resizeObserver?: ResizeObserver;
  private quotes: Quote[] = [];
  private revealProgress = 0;

  constructor() {
    afterNextRender(() => this.initCanvas());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    this.observer?.disconnect();
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('click', this.onCanvasClick);
      canvas.removeEventListener('touchstart', this.onCanvasTouch);
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      this.quotes = await firstValueFrom(this.api.getQuotes());
      this.layoutStars();
      if (this.ctx) this.draw(performance.now());
    } catch {
      this.error.set('Could not load quotes.');
    } finally {
      this.loading.set(false);
      this.initSceneObserver();
    }
  }

  closeQuote(): void {
    this.selectedQuote.set(null);
  }

  private initSceneObserver(): void {
    if (!this.sectionRef) return;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.inView = entry.isIntersecting;
        if (entry.isIntersecting) {
          this.scenes.setScene('constellation');
          if (!this.animationId && !this.motion.prefersReducedMotion()) {
            this.animate();
          }
        }
      },
      { threshold: 0.15 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.layoutStars();
    });
    this.resizeObserver.observe(this.sectionRef.nativeElement);

    canvas.addEventListener('click', this.onCanvasClick);
    canvas.addEventListener('touchstart', this.onCanvasTouch, { passive: true });

    if (!this.motion.prefersReducedMotion()) {
      this.animate();
    } else {
      this.revealProgress = 1;
      this.heartRevealed.set(true);
      this.draw(0);
    }
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = this.sectionRef.nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    canvas.style.width = `${parent.clientWidth}px`;
    canvas.style.height = `${parent.clientHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private heartPoint(t: number, scale: number, cx: number, cy: number): { x: number; y: number } {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return { x: cx + x * scale, y: cy + y * scale };
  }

  private layoutStars(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2 + 10;
    const scale = Math.min(w, h) * 0.022;

    const outlineSteps = 120;
    this.heartOutline = [];
    for (let i = 0; i <= outlineSteps; i++) {
      const t = (i / outlineSteps) * Math.PI * 2;
      this.heartOutline.push(this.heartPoint(t, scale, cx, cy));
    }

    const count = Math.max(this.quotes.length, 1);
    this.stars = this.quotes.map((quote, i) => {
      const t = (i / count) * Math.PI * 2 + Math.PI * 0.08;
      const pos = this.heartPoint(t, scale, cx, cy);
      return {
        x: pos.x,
        y: pos.y,
        radius: 3.5 + (i % 3) * 0.8,
        quote,
        twinkleOffset: Math.random() * Math.PI * 2,
        pulse: 0,
        heartIndex: i
      };
    });
  }

  private onCanvasClick = (event: MouseEvent): void => {
    this.handleTap(event.clientX, event.clientY);
  };

  private onCanvasTouch = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (touch) this.handleTap(touch.clientX, touch.clientY);
  };

  private handleTap(clientX: number, clientY: number): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (const star of this.stars) {
      const dist = Math.hypot(x - star.x, y - star.y);
      if (dist < Math.max(star.radius * 4, this.motion.touchHitRadius(28))) {
        this.selectStar(star);
        return;
      }
    }
    this.closeQuote();
  }

  private selectStar(star: StarNode): void {
    this.selectedQuote.set(star.quote);
    star.pulse = 1;
    this.experienceState.activateQuote(star.quote.id, star.quote.text);
    this.announcer.announce(star.quote.text);

    if (!this.heartRevealed()) {
      this.heartRevealed.set(true);
    }

    if (!this.motion.prefersReducedMotion() && this.quotePanelRef) {
      gsap.fromTo(this.quotePanelRef.nativeElement, {
        opacity: 0,
        y: 20,
        filter: 'blur(8px)'
      }, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power3.out'
      });
    }
  }

  private animate = (): void => {
    if (!this.inView || !this.visibility.pageVisible()) {
      this.animationId = requestAnimationFrame(this.animate);
      return;
    }

    if (this.revealProgress < 1) {
      const boost = this.experienceState.hasEnoughForConstellation() ? 0.012 : 0.008;
      this.revealProgress = Math.min(1, this.revealProgress + boost);
      if (this.revealProgress >= 1) {
        this.heartRevealed.set(true);
      }
    }
    this.draw(performance.now());
    this.animationId = requestAnimationFrame(this.animate);
  };

  private draw(time: number): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, w, h);

    this.drawHeartOutline();

    for (let i = 0; i < this.stars.length; i++) {
      const a = this.stars[i];
      const b = this.stars[(i + 1) % this.stars.length];
      this.ctx.strokeStyle = 'rgba(201, 160, 168, 0.12)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
      this.ctx.stroke();
    }

    for (const star of this.stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(time * 0.002 + star.twinkleOffset);
      const isSelected = this.selectedQuote()?.id === star.quote.id;
      const glowSize = star.radius * (isSelected ? 5 : 2.5) + star.pulse * 10;

      if (star.pulse > 0) star.pulse *= 0.94;

      const gradient = this.ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowSize * 3);
      gradient.addColorStop(0, isSelected ? 'rgba(201, 160, 168, 0.65)' : 'rgba(196, 176, 138, 0.35)');
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, glowSize * 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius * twinkle, 0, Math.PI * 2);
      this.ctx.fillStyle = isSelected ? '#c9a0a8' : '#f5f0e8';
      this.ctx.fill();
    }
  }

  private drawHeartOutline(): void {
    if (this.heartOutline.length < 2) return;

    const visibleCount = Math.floor(this.heartOutline.length * this.revealProgress);
    if (visibleCount < 2) return;

    this.ctx.strokeStyle = `rgba(201, 160, 168, ${0.08 + this.revealProgress * 0.14})`;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(this.heartOutline[0].x, this.heartOutline[0].y);
    for (let i = 1; i < visibleCount; i++) {
      this.ctx.lineTo(this.heartOutline[i].x, this.heartOutline[i].y);
    }
    this.ctx.stroke();
  }
}
