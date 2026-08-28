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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionService } from '../../core/services/motion.service';
import { VisibilityService } from '../../core/services/visibility.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';

gsap.registerPlugin(ScrollTrigger);

interface FinaleParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  arrived: boolean;
  isBurst: boolean;
}

@Component({
  selector: 'app-finale',
  standalone: true,
  templateUrl: './finale.component.html',
  styleUrl: './finale.component.scss'
})
export class FinaleComponent implements OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('pinWrap') pinWrapRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('line1El') line1Ref!: ElementRef<HTMLElement>;
  @ViewChild('line2El') line2Ref!: ElementRef<HTMLElement>;
  @ViewChild('line3El') line3Ref!: ElementRef<HTMLElement>;
  @ViewChild('line4El') line4Ref!: ElementRef<HTMLElement>;
  @ViewChild('finalMsg') finalMsgRef!: ElementRef<HTMLElement>;
  @ViewChild('creditEl') creditRef!: ElementRef<HTMLElement>;

  readonly line1 = input('Before you go...');
  readonly line2 = input('I just wanted you to know...');
  readonly line3 = input('You are incredibly special.');
  readonly line4 = input('And I\'m really glad you exist.');
  readonly personalLine = input('Something that exists because you were here.');
  readonly finalMessage = input('You mean more to me than words on a screen could ever say — but I tried anyway.');
  readonly footerCredit = input('Made with ❤️, caffeine, Java, and way too many thoughts about you.');
  readonly herName = input('Beautiful');

  private readonly motion = inject(MotionService);
  private readonly visibility = inject(VisibilityService);
  private readonly experienceState = inject(ExperienceStateService);
  private readonly sounds = inject(SoundDesignService);
  private readonly scenes = inject(SceneManagerService);

  readonly sequenceStarted = signal(false);
  readonly showFinal = signal(false);
  readonly showButton = signal(false);
  readonly surpriseTriggered = signal(false);
  readonly heartFormed = signal(false);

  private ctx!: CanvasRenderingContext2D;
  private particles: FinaleParticle[] = [];
  private animationId = 0;
  private heartPoints: { x: number; y: number }[] = [];
  private scrollTriggered = false;
  private heartOutlineProgress = 0;
  private pulsePhase = 0;
  private scrollTriggers: ScrollTrigger[] = [];
  private lineTimeline?: gsap.core.Timeline;
  private inView = false;
  private visibilityObserver?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      this.initCanvas();
      this.setupScrollTrigger();
      this.setupVisibilityObserver();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resizeCanvas);
    this.visibilityObserver?.disconnect();
    this.lineTimeline?.kill();
    this.scrollTriggers.forEach(st => st.kill());
  }

  triggerSurprise(): void {
    if (this.surpriseTriggered()) return;
    this.surpriseTriggered.set(true);
    this.sounds.enable();
    this.sounds.play('finale');
    this.spawnGrandBurst();
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    this.generateHeartPoints();
  }

  private resizeCanvas = (): void => {
    const canvas = this.canvasRef?.nativeElement;
    const section = this.pinWrapRef?.nativeElement ?? this.sectionRef?.nativeElement;
    if (!canvas || !section) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = section.clientWidth * dpr;
    canvas.height = section.clientHeight * dpr;
    canvas.style.width = `${section.clientWidth}px`;
    canvas.style.height = `${section.clientHeight}px`;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.generateHeartPoints();
  };

  private generateHeartPoints(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h * 0.36;
    const scale = Math.min(w, h) * 0.013;

    this.heartPoints = [];
    for (let t = 0; t < Math.PI * 2; t += 0.12) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      this.heartPoints.push({ x: cx + x * scale, y: cy + y * scale });
    }
  }

  private setupScrollTrigger(): void {
    if (!this.sectionRef) return;

    const mobile = this.motion.isMobile();

    if (!mobile) {
      const pin = ScrollTrigger.create({
        trigger: this.sectionRef.nativeElement,
        start: 'top top',
        end: '+=140%',
        pin: this.pinWrapRef.nativeElement,
        anticipatePin: 1
      });
      this.scrollTriggers.push(pin);
    }

    const enter = ScrollTrigger.create({
      trigger: this.sectionRef.nativeElement,
      start: mobile ? 'top 70%' : 'top 55%',
      once: true,
      onEnter: () => {
        this.scenes.setScene('finale');
        if (this.scrollTriggered) return;
        this.scrollTriggered = true;
        this.startFinale();
      }
    });
    this.scrollTriggers.push(enter);
  }

  private setupVisibilityObserver(): void {
    if (!this.sectionRef) return;
    this.visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        this.inView = entry.isIntersecting;
      },
      { threshold: 0.08 }
    );
    this.visibilityObserver.observe(this.sectionRef.nativeElement);
  }

  private startFinale(): void {
    this.sequenceStarted.set(true);
    this.spawnConvergenceParticles();

    if (this.motion.prefersReducedMotion()) {
      gsap.set(this.getLineElements(), { opacity: 1, y: 0, filter: 'blur(0px)' });
      this.showFinal.set(true);
      this.showButton.set(true);
      this.heartFormed.set(true);
      this.heartOutlineProgress = 1;
      this.drawFrame();
      return;
    }

    requestAnimationFrame(() => {
      const lines = this.getLineElements();
      gsap.set(lines, { opacity: 0, y: 24, filter: 'blur(8px)' });

      this.lineTimeline = gsap.timeline({ delay: 1.8 });
      lines.forEach((el, i) => {
        this.lineTimeline!.to(el, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1.2,
          ease: 'power3.out'
        }, i * 1.1);
      });

      this.lineTimeline.add(() => {
        this.showFinal.set(true);
        requestAnimationFrame(() => {
          if (this.finalMsgRef) {
            gsap.fromTo(this.finalMsgRef.nativeElement, {
              opacity: 0,
              y: 20,
              filter: 'blur(6px)'
            }, {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 1.1,
              ease: 'power3.out'
            });
          }
        });
      }, '+=0.4');

      this.lineTimeline.add(() => {
        this.showButton.set(true);
        this.heartFormed.set(true);
        if (this.creditRef) {
          gsap.from(this.creditRef.nativeElement, {
            opacity: 0,
            y: 12,
            duration: 0.9,
            ease: 'power3.out'
          });
        }
      }, '+=0.8');
    });
  }

  private getLineElements(): HTMLElement[] {
    return [
      this.line1Ref?.nativeElement,
      this.line2Ref?.nativeElement,
      this.line3Ref?.nativeElement,
      this.line4Ref?.nativeElement
    ].filter(Boolean) as HTMLElement[];
  }

  private spawnConvergenceParticles(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const colors = ['#c9a0a8', '#9a8fa8', '#c4b08a', '#f5f0e8'];
    const heartObjectCount = this.experienceState.selectedHeartObjects().length;
    const count = this.motion.prefersReducedMotion()
      ? 30
      : this.motion.isMobile()
        ? 70 + heartObjectCount * 3
        : 140 + heartObjectCount * 5;

    this.particles = Array.from({ length: count }, (_, i) => {
      const edge = Math.floor(Math.random() * 4);
      let x = Math.random() * w;
      let y = Math.random() * h;
      if (edge === 0) y = -10;
      else if (edge === 1) y = h + 10;
      else if (edge === 2) x = -10;
      else x = w + 10;

      const target = this.heartPoints[i % this.heartPoints.length] ?? { x: w / 2, y: h * 0.36 };
      return {
        x,
        y,
        targetX: target.x,
        targetY: target.y,
        vx: 0,
        vy: 0,
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        arrived: false,
        isBurst: false
      };
    });

    cancelAnimationFrame(this.animationId);
    this.animateConvergence();
  }

  private animateConvergence = (): void => {
    if (!this.inView || !this.visibility.pageVisible()) {
      this.animationId = requestAnimationFrame(this.animateConvergence);
      return;
    }

    this.drawFrame();

    let arrivedCount = 0;
    for (const p of this.particles) {
      if (p.isBurst) continue;

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1.5) {
        const ease = 0.035 + (1 - Math.min(dist / 400, 1)) * 0.02;
        p.x += dx * ease;
        p.y += dy * ease;
      } else {
        p.arrived = true;
        p.x = p.targetX;
        p.y = p.targetY;
      }

      if (p.arrived) arrivedCount++;
    }

    const targetProgress = arrivedCount / Math.max(this.particles.filter(p => !p.isBurst).length, 1);
    this.heartOutlineProgress += (targetProgress - this.heartOutlineProgress) * 0.04;

    if (this.heartOutlineProgress > 0.85 && !this.heartFormed()) {
      // heart visually formed via particles
    }

    this.pulsePhase += 0.02;
    this.animationId = requestAnimationFrame(this.animateConvergence);
  };

  private drawFrame(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, w, h);

    if (this.heartOutlineProgress > 0.05 && this.heartPoints.length > 1) {
      this.drawHeartOutline();
    }

    for (const p of this.particles) {
      if (p.isBurst) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.vx *= 0.98;
      }

      const pulse = p.arrived && !p.isBurst
        ? 1 + Math.sin(this.pulsePhase + p.x * 0.01) * 0.15
        : 1;

      this.ctx.globalAlpha = p.arrived ? 0.85 : 0.55;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.particles = this.particles.filter(p => {
      if (!p.isBurst) return true;
      return p.y < h + 30 && p.x > -30 && p.x < w + 30;
    });
  }

  private drawHeartOutline(): void {
    const visible = Math.floor(this.heartPoints.length * this.heartOutlineProgress);
    if (visible < 2) return;

    this.ctx.strokeStyle = `rgba(201, 160, 168, ${0.12 + this.heartOutlineProgress * 0.2})`;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(this.heartPoints[0].x, this.heartPoints[0].y);
    for (let i = 1; i < visible; i++) {
      this.ctx.lineTo(this.heartPoints[i].x, this.heartPoints[i].y);
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }

  private spawnGrandBurst(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h * 0.36;
    const colors = ['#c9a0a8', '#9a8fa8', '#c4b08a', '#f5f0e8', '#d4b0b8'];

    const burstCount = this.motion.prefersReducedMotion() ? 35 : 160;
    const burstParticles: FinaleParticle[] = Array.from({ length: burstCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      return {
        x: cx,
        y: cy,
        targetX: cx,
        targetY: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        arrived: false,
        isBurst: true
      };
    });

    this.particles = [...this.particles, ...burstParticles];
  }
}
