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
}

@Component({
  selector: 'app-finale',
  standalone: true,
  templateUrl: './finale.component.html',
  styleUrl: './finale.component.scss'
})
export class FinaleComponent implements OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('line1El') line1Ref!: ElementRef<HTMLElement>;
  @ViewChild('line2El') line2Ref!: ElementRef<HTMLElement>;
  @ViewChild('line3El') line3Ref!: ElementRef<HTMLElement>;
  @ViewChild('line4El') line4Ref!: ElementRef<HTMLElement>;
  @ViewChild('finalMsg') finalMsgRef!: ElementRef<HTMLElement>;

  readonly line1 = input('Before you go...');
  readonly line2 = input('I just wanted you to know...');
  readonly line3 = input('You are incredibly special.');
  readonly line4 = input('And I\'m really glad you exist.');
  readonly finalMessage = input('You mean more to me than words on a screen could ever say — but I tried anyway.');
  readonly footerCredit = input('Made with ❤️, caffeine, Java, and way too many thoughts about you.');

  private readonly motion = inject(MotionService);

  readonly showLines = signal(false);
  readonly showFinal = signal(false);
  readonly showButton = signal(false);
  readonly surpriseTriggered = signal(false);
  readonly heartFormed = signal(false);

  private ctx!: CanvasRenderingContext2D;
  private particles: FinaleParticle[] = [];
  private animationId = 0;
  private heartPoints: { x: number; y: number }[] = [];
  private scrollTriggered = false;

  constructor() {
    afterNextRender(() => {
      this.initCanvas();
      this.setupScrollTrigger();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resizeCanvas);
    ScrollTrigger.getAll().forEach(t => {
      if (t.trigger === this.sectionRef?.nativeElement) t.kill();
    });
  }

  triggerSurprise(): void {
    if (this.surpriseTriggered()) return;
    this.surpriseTriggered.set(true);
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
    const section = this.sectionRef?.nativeElement;
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
    const cy = h * 0.38;
    const scale = Math.min(w, h) * 0.012;

    this.heartPoints = [];
    for (let t = 0; t < Math.PI * 2; t += 0.15) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      this.heartPoints.push({ x: cx + x * scale, y: cy + y * scale });
    }
  }

  private setupScrollTrigger(): void {
    if (!this.sectionRef) return;

    ScrollTrigger.create({
      trigger: this.sectionRef.nativeElement,
      start: 'top 60%',
      once: true,
      onEnter: () => {
        if (this.scrollTriggered) return;
        this.scrollTriggered = true;
        this.startFinale();
      }
    });
  }

  private startFinale(): void {
    this.showLines.set(true);
    this.spawnConvergenceParticles();

    if (this.motion.prefersReducedMotion()) {
      this.showFinal.set(true);
      this.showButton.set(true);
      this.heartFormed.set(true);
      return;
    }

    setTimeout(() => {
      const lines = [
        this.line1Ref?.nativeElement,
        this.line2Ref?.nativeElement,
        this.line3Ref?.nativeElement,
        this.line4Ref?.nativeElement
      ].filter(Boolean);

      gsap.set(lines, { opacity: 0, y: 20 });

      const tl = gsap.timeline({ delay: 1.5 });
      lines.forEach((el, i) => {
        tl.to(el, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, i * 1.2);
      });

      tl.add(() => {
        this.showFinal.set(true);
        setTimeout(() => {
          if (this.finalMsgRef) {
            gsap.from(this.finalMsgRef.nativeElement, {
              opacity: 0, y: 20, duration: 1, ease: 'power3.out'
            });
          }
        }, 50);
      }, '+=0.5');

      tl.add(() => {
        this.showButton.set(true);
        this.heartFormed.set(true);
      }, '+=1');
    }, 100);
  }

  private spawnConvergenceParticles(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const colors = ['#e8a0bf', '#d4b8e8', '#e8d5b5', '#f8e8ee'];
    const count = this.motion.prefersReducedMotion() ? 30 : 120;

    this.particles = Array.from({ length: count }, (_, i) => {
      const target = this.heartPoints[i % this.heartPoints.length] ?? { x: w / 2, y: h / 2 };
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        targetX: target.x,
        targetY: target.y,
        vx: 0,
        vy: 0,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        arrived: false
      };
    });

    cancelAnimationFrame(this.animationId);
    this.animateConvergence();
  }

  private animateConvergence = (): void => {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, w, h);

    let allArrived = true;
    for (const p of this.particles) {
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        allArrived = false;
        p.x += dx * 0.04;
        p.y += dy * 0.04;
      } else {
        p.arrived = true;
      }

      this.ctx.globalAlpha = p.arrived ? 0.9 : 0.6;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (!allArrived || this.surpriseTriggered()) {
      this.animationId = requestAnimationFrame(this.animateConvergence);
    }
  };

  private spawnGrandBurst(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h * 0.38;
    const colors = ['#e8a0bf', '#d4b8e8', '#e8d5b5', '#f8e8ee', '#c77d9e', '#ff8fab'];

    const burstCount = this.motion.prefersReducedMotion() ? 40 : 200;
    const burstParticles = Array.from({ length: burstCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      return {
        x: cx,
        y: cy,
        targetX: cx,
        targetY: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        arrived: false
      };
    });

    this.particles = [...this.particles, ...burstParticles];

    const animateBurst = () => {
      this.ctx.clearRect(0, 0, w, h);

      this.particles = this.particles.filter(p => {
        if (p.vx !== 0 || p.vy !== 0) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.1;
          p.vx *= 0.98;
          return p.y < h + 20;
        }
        return true;
      });

      for (const p of this.particles) {
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }

      if (this.particles.some(p => p.vx !== 0)) {
        this.animationId = requestAnimationFrame(animateBurst);
      }
    };

    cancelAnimationFrame(this.animationId);
    this.animationId = requestAnimationFrame(animateBurst);
  }
}
