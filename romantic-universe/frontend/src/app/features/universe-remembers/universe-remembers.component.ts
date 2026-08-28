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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionService } from '../../core/services/motion.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { HeartShareService } from '../../core/services/heart-share.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-universe-remembers',
  standalone: true,
  templateUrl: './universe-remembers.component.html',
  styleUrl: './universe-remembers.component.scss'
})
export class UniverseRemembersComponent implements OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('introEl') introRef!: ElementRef<HTMLElement>;
  @ViewChild('recapEl') recapRef!: ElementRef<HTMLElement>;

  readonly intro = input('You\'ve been exploring for a while...');
  readonly reveal = input('Look what you created.');

  private readonly motion = inject(MotionService);
  readonly experienceState = inject(ExperienceStateService);
  private readonly scenes = inject(SceneManagerService);
  private readonly share = inject(HeartShareService);

  private observer?: IntersectionObserver;
  private scrollTrigger?: ScrollTrigger;
  private animationId = 0;
  private started = false;

  readonly sharing = signal(false);

  readonly recap = computed(() => ({
    photos: this.experienceState.discoveredPhotos().size,
    memories: this.experienceState.discoveredMemories().size,
    reasons: this.experienceState.discoveredReasons().size,
    quotes: this.experienceState.activatedQuotes().size,
    bombs: this.experienceState.triggeredLoveBombs().size,
    secrets: this.experienceState.foundSecrets().size,
    heartObjects: this.experienceState.selectedHeartObjects().length,
    stars: this.experienceState.constellationStars().length
  }));

  constructor() {
    afterNextRender(() => this.initObserver());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.scrollTrigger?.kill();
    cancelAnimationFrame(this.animationId);
  }

  async keepHeart(): Promise<void> {
    this.sharing.set(true);
    try {
      await this.share.share();
    } finally {
      this.sharing.set(false);
    }
  }

  private initObserver(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('remembers');
          this.experienceState.setChapter(8);
          if (!this.started) {
            this.started = true;
            this.playReveal();
          }
        }
      },
      { threshold: 0.25 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private playReveal(): void {
    if (this.motion.prefersReducedMotion()) {
      this.drawConstellation();
      return;
    }

    const intro = this.introRef.nativeElement;
    const recap = this.recapRef.nativeElement;
    gsap.set([intro, recap], { opacity: 0, y: 24, filter: 'blur(8px)' });

    const tl = gsap.timeline({ onComplete: () => this.animateConstellation() });
    tl.to(intro, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power3.out' })
      .to(recap, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out' }, '+=1.2');
  }

  private animateConstellation(): void {
    this.drawConstellation();
    if (this.motion.prefersReducedMotion()) return;

    const animate = (): void => {
      this.drawConstellation(performance.now() * 0.001);
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private drawConstellation(time = 0): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const stars = this.experienceState.constellationStars();
    if (stars.length < 2) return;

    const points = stars.map(s => ({
      x: s.x * w,
      y: s.y * h,
      pulse: 0.6 + 0.4 * Math.sin(time * 2 + s.discoveredAt * 0.001)
    }));

    ctx.strokeStyle = 'rgba(201, 160, 168, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    if (stars.length >= 6) ctx.closePath();
    ctx.stroke();

    for (const p of points) {
      const r = 3 * p.pulse;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      grad.addColorStop(0, 'rgba(196, 176, 138, 0.6)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#f5f0e8';
      ctx.fill();
    }
  }
}
