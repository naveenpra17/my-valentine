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
import { MotionService } from '../../core/services/motion.service';
import { Quote } from '../../core/models';

interface StarNode {
  x: number;
  y: number;
  radius: number;
  quote: Quote;
  twinkleOffset: number;
  pulse: number;
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
  @ViewChild('quotePanel') quotePanelRef!: ElementRef<HTMLElement>;

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedQuote = signal<Quote | null>(null);

  private ctx!: CanvasRenderingContext2D;
  private stars: StarNode[] = [];
  private animationId = 0;
  private resizeObserver?: ResizeObserver;
  private quotes: Quote[] = [];

  constructor() {
    afterNextRender(() => this.initCanvas());
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
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('click', this.onCanvasClick);
      canvas.removeEventListener('touchstart', this.onCanvasTouch);
    }
  }

  closeQuote(): void {
    this.selectedQuote.set(null);
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

  private layoutStars(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const padding = 60;

    this.stars = this.quotes.map((quote, i) => {
      const cols = Math.ceil(Math.sqrt(this.quotes.length));
      const row = Math.floor(i / cols);
      const col = i % cols;
      const cellW = (w - padding * 2) / cols;
      const cellH = (h - padding * 2) / Math.ceil(this.quotes.length / cols);

      return {
        x: padding + col * cellW + cellW / 2 + (Math.random() - 0.5) * 30,
        y: padding + row * cellH + cellH / 2 + (Math.random() - 0.5) * 30,
        radius: 4 + Math.random() * 4,
        quote,
        twinkleOffset: Math.random() * Math.PI * 2,
        pulse: 0
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
      if (dist < Math.max(star.radius * 3, 24)) {
        this.selectStar(star);
        return;
      }
    }
    this.closeQuote();
  }

  private selectStar(star: StarNode): void {
    this.selectedQuote.set(star.quote);
    star.pulse = 1;

    if (!this.motion.prefersReducedMotion() && this.quotePanelRef) {
      gsap.fromTo(
        this.quotePanelRef.nativeElement,
        { opacity: 0, y: 16, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
  }

  private animate = (): void => {
    this.draw(performance.now());
    this.animationId = requestAnimationFrame(this.animate);
  };

  private draw(time: number): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, w, h);

    // Subtle connecting lines between nearby stars
    this.ctx.strokeStyle = 'rgba(232, 160, 191, 0.08)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.stars.length; i++) {
      for (let j = i + 1; j < this.stars.length; j++) {
        const dist = Math.hypot(this.stars[i].x - this.stars[j].x, this.stars[i].y - this.stars[j].y);
        if (dist < 150) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.stars[i].x, this.stars[i].y);
          this.ctx.lineTo(this.stars[j].x, this.stars[j].y);
          this.ctx.stroke();
        }
      }
    }

    for (const star of this.stars) {
      const twinkle = 0.6 + 0.4 * Math.sin(time * 0.002 + star.twinkleOffset);
      const isSelected = this.selectedQuote()?.id === star.quote.id;
      const glowSize = star.radius * (isSelected ? 4 : 2) + star.pulse * 8;

      if (star.pulse > 0) star.pulse *= 0.95;

      // Glow
      const gradient = this.ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowSize * 3);
      gradient.addColorStop(0, isSelected ? 'rgba(232, 160, 191, 0.6)' : 'rgba(232, 213, 181, 0.3)');
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, glowSize * 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Star core
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius * twinkle, 0, Math.PI * 2);
      this.ctx.fillStyle = isSelected ? '#e8a0bf' : '#e8d5b5';
      this.ctx.fill();
    }
  }
}
