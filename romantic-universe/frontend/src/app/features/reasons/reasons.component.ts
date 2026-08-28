import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  afterNextRender,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MotionService } from '../../core/services/motion.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { Reason } from '../../core/models';

gsap.registerPlugin(ScrollTrigger);

interface FloatPosition {
  x: number;
  y: number;
}

const FLOAT_POSITIONS: FloatPosition[] = [
  { x: 12, y: 18 },
  { x: 68, y: 12 },
  { x: 38, y: 32 },
  { x: 82, y: 38 },
  { x: 8, y: 52 },
  { x: 55, y: 58 },
  { x: 28, y: 72 },
  { x: 75, y: 68 },
  { x: 48, y: 85 }
];

@Component({
  selector: 'app-reasons',
  standalone: true,
  templateUrl: './reasons.component.html',
  styleUrl: './reasons.component.scss'
})
export class ReasonsComponent implements OnInit, OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('focusPanel') focusPanelRef?: ElementRef<HTMLElement>;
  @ViewChildren('reasonFloat') floatRefs!: QueryList<ElementRef<HTMLElement>>;

  readonly title = input('Things I Adore About You');
  readonly subtitle = input('Tap a whisper to hear more');

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);
  private readonly scenes = inject(SceneManagerService);
  private observer?: IntersectionObserver;
  private scrollTriggers: ScrollTrigger[] = [];
  private floatTweens: gsap.core.Tween[] = [];

  readonly reasons = signal<Reason[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly focusedId = signal<number | null>(null);

  constructor() {
    afterNextRender(() => {
      this.floatRefs.changes.subscribe(() => {
        this.initScrollAnimations();
        this.initFloatMotion();
      });
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.scrollTriggers.forEach(st => st.kill());
    this.floatTweens.forEach(t => t.kill());
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.api.getReasons());
      this.reasons.set(data);
    } catch {
      this.error.set('Could not load reasons.');
    } finally {
      this.loading.set(false);
      setTimeout(() => {
        this.initScrollAnimations();
        this.initFloatMotion();
        this.initSceneObserver();
      }, 100);
    }
  }

  getPosition(index: number): FloatPosition {
    return FLOAT_POSITIONS[index % FLOAT_POSITIONS.length];
  }

  focusedReason(): Reason | null {
    const id = this.focusedId();
    if (id === null) return null;
    return this.reasons().find(r => r.id === id) ?? null;
  }

  focusReason(reason: Reason): void {
    const next = this.focusedId() === reason.id ? null : reason.id;
    this.focusedId.set(next);

    if (!this.motion.prefersReducedMotion() && next !== null && this.focusPanelRef) {
      gsap.fromTo(this.focusPanelRef.nativeElement, {
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

  private initSceneObserver(): void {
    if (!this.sectionRef) return;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('reasons');
        }
      },
      { threshold: 0.2 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private initScrollAnimations(): void {
    if (this.motion.prefersReducedMotion() || !this.sectionRef) return;

    this.scrollTriggers.forEach(st => st.kill());
    this.scrollTriggers = [];

    const header = this.sectionRef.nativeElement.querySelector('.reasons__header');
    if (header) {
      const st = gsap.from(header, {
        scrollTrigger: { trigger: header, start: 'top 85%' },
        opacity: 0,
        y: 30,
        duration: 1,
        ease: 'power3.out'
      }).scrollTrigger;
      if (st) this.scrollTriggers.push(st);
    }

    const floats = this.floatRefs?.toArray() ?? [];
    floats.forEach((ref, i) => {
      const st = gsap.from(ref.nativeElement, {
        scrollTrigger: {
          trigger: this.sectionRef.nativeElement,
          start: 'top 75%',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        scale: 0.8,
        filter: 'blur(10px)',
        duration: 1,
        delay: i * 0.12,
        ease: 'power3.out'
      }).scrollTrigger;
      if (st) this.scrollTriggers.push(st);
    });
  }

  private initFloatMotion(): void {
    if (this.motion.prefersReducedMotion()) return;

    this.floatTweens.forEach(t => t.kill());
    this.floatTweens = [];

    const floats = this.floatRefs?.toArray() ?? [];
    floats.forEach((ref, i) => {
      const el = ref.nativeElement;
      const tween = gsap.to(el, {
        y: `+=${8 + (i % 3) * 4}`,
        x: `+=${i % 2 === 0 ? 6 : -6}`,
        duration: 2.5 + (i % 4) * 0.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
      this.floatTweens.push(tween);
    });
  }
}
