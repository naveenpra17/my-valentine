import { Component, ElementRef, OnDestroy, ViewChild, afterNextRender, computed, inject, input, signal } from '@angular/core';import gsap from 'gsap';
import { MotionService } from '../../core/services/motion.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { ExperienceControllerService } from '../../core/experience/experience-controller.service';
import { ChapterVisitDirective } from '../../shared/directives/chapter-visit.directive';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';

@Component({
  selector: 'app-constellation-ceremony',
  standalone: true,
  imports: [ChapterVisitDirective],
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
  private animationId = 0;
  private played = false;
  private heartProgress = 0;

  readonly revealed = signal(false);
  readonly hasStars = computed(() => this.state.constellationStars().length > 0);

  constructor() {
    afterNextRender(() => this.initObserver());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    cancelAnimationFrame(this.animationId);
  }

  private initObserver(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !this.played) {
          this.scenes.setScene('constellation');
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
      this.draw(0);
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(this.line1Ref.nativeElement, {
      opacity: 0, y: 20, filter: 'blur(8px)'
    }, {
      opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power3.out'
    })
      .fromTo(this.line2Ref.nativeElement, {
        opacity: 0, y: 16, filter: 'blur(6px)'
      }, {
        opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out'
      }, '+=1.6')
      .add(() => {
        this.revealed.set(true);
        this.animateHeart();
      });
  }

  private animateHeart(): void {
    const step = (): void => {
      if (this.heartProgress < 1) {
        this.heartProgress = Math.min(1, this.heartProgress + 0.012);
      }
      this.draw(performance.now() * 0.001);
      this.animationId = requestAnimationFrame(step);
    };
    step();
  }

  private draw(time: number): void {
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

    const stars = this.state.constellationStars();
    if (stars.length === 0) return;

    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * 0.32;

    const heartPoints: { x: number; y: number }[] = [];
    for (let t = 0; t <= Math.PI * 2; t += 0.12) {
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      heartPoints.push({ x: cx + hx * scale * 0.04, y: cy + hy * scale * 0.04 });
    }

    const visibleHeart = Math.floor(heartPoints.length * this.heartProgress);
    if (visibleHeart > 1) {
      ctx.strokeStyle = `rgba(201, 160, 168, ${0.1 + this.heartProgress * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(heartPoints[0].x, heartPoints[0].y);
      for (let i = 1; i < visibleHeart; i++) {
        ctx.lineTo(heartPoints[i].x, heartPoints[i].y);
      }
      ctx.stroke();
    }

    stars.forEach((star, i) => {
      const tx = cx + (star.x - 0.5) * scale * 1.6;
      const ty = cy + (star.y - 0.5) * scale * 1.4;
      const pulse = 0.6 + 0.4 * Math.sin(time * 2 + i);
      ctx.fillStyle = `rgba(245, 240, 232, ${0.5 + pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 3 * pulse, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
