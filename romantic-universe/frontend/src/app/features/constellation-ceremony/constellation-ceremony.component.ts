import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../../core/services/motion.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { ExperienceControllerService } from '../../core/experience/experience-controller.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';

@Component({
  selector: 'app-constellation-ceremony',
  standalone: true,
  imports: [],
  templateUrl: './constellation-ceremony.component.html',
  styleUrl: './constellation-ceremony.component.scss'
})
export class ConstellationCeremonyComponent implements OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('line1El') line1Ref!: ElementRef<HTMLElement>;
  @ViewChild('line2El') line2Ref!: ElementRef<HTMLElement>;

  readonly line1 = input('You\'ve been leaving little pieces of yourself everywhere.');
  readonly line2 = input('Look.');

  private readonly motion = inject(MotionService);
  private readonly state = inject(ExperienceStateService);
  private readonly controller = inject(ExperienceControllerService);
  private readonly scenes = inject(SceneManagerService);

  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private animationId = 0;
  private played = false;
  private heartProgress = 0;
  private lastTime = 0;

  readonly revealed = signal(false);
  readonly hasStars = computed(() => this.state.constellationStars().length > 0);

  constructor() {
    afterNextRender(() => this.initObserver());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.animationId);
  }

  private initObserver(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !this.played) {
          this.scenes.setScene('constellation-ceremony');
          this.played = true;
          this.playCeremony();
        }
      },
      { threshold: 0.3 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private playCeremony(): void {
    this.controller.revealConstellation();

    if (this.motion.prefersReducedMotion()) {
      this.heartProgress = 1;
      this.revealed.set(true);
      requestAnimationFrame(() => this.draw(0));
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(
      this.line1Ref.nativeElement,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' }
    )
      .fromTo(
        this.line2Ref.nativeElement,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' },
        '+=1.6'
      )
      .add(() => {
        this.revealed.set(true);
        requestAnimationFrame(() => {
          this.bindResize();
          this.animateHeart();
        });
      });
  }

  private bindResize(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => this.draw(this.lastTime));
    this.resizeObserver.observe(canvas);
  }

  private animateHeart(): void {
    cancelAnimationFrame(this.animationId);
    const step = (now: number): void => {
      this.lastTime = now * 0.001;
      if (this.heartProgress < 1) {
        this.heartProgress = Math.min(1, this.heartProgress + 0.008);
      }
      this.draw(this.lastTime);
      this.animationId = requestAnimationFrame(step);
    };
    this.animationId = requestAnimationFrame(step);
  }

  private draw(time: number): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * 0.34;

    const heartPoints: { x: number; y: number }[] = [];
    for (let t = 0; t <= Math.PI * 2; t += 0.1) {
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      heartPoints.push({ x: cx + hx * scale * 0.042, y: cy + hy * scale * 0.042 });
    }

    const visibleHeart = Math.max(2, Math.floor(heartPoints.length * this.heartProgress));

    if (visibleHeart > 1) {
      const strokeAlpha = 0.28 + this.heartProgress * 0.55;
      ctx.save();
      ctx.shadowColor = 'rgba(201, 160, 168, 0.45)';
      ctx.shadowBlur = 12 * this.heartProgress;
      ctx.strokeStyle = `rgba(201, 160, 168, ${strokeAlpha})`;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(heartPoints[0].x, heartPoints[0].y);
      for (let i = 1; i < visibleHeart; i++) {
        ctx.lineTo(heartPoints[i].x, heartPoints[i].y);
      }
      if (this.heartProgress >= 0.98) {
        ctx.closePath();
        const fillGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.5);
        fillGrad.addColorStop(0, 'rgba(201, 160, 168, 0.12)');
        fillGrad.addColorStop(1, 'rgba(201, 160, 168, 0)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();
    }

    const stars = this.state.constellationStars();
    stars.forEach((star, i) => {
      const tx = cx + (star.x - 0.5) * scale * 1.6;
      const ty = cy + (star.y - 0.5) * scale * 1.4;
      const pulse = 0.65 + 0.35 * Math.sin(time * 2 + i);
      ctx.save();
      ctx.shadowColor = 'rgba(245, 240, 232, 0.5)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = `rgba(245, 240, 232, ${0.55 + pulse * 0.45})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 2.5 + pulse * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
