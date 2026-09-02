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
import { SiteDataService } from '../../core/site/site-data.service';
import { MotionService } from '../../core/services/motion.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { Reason } from '../../core/models';
import { finalizeScrollReveal, revealOnScroll } from '../../core/utils/scroll-reveal';

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
  readonly introLine1 = input('There are things I love about you...');
  readonly introLine2 = input('The little things you probably don\'t even notice.');

  private readonly siteData = inject(SiteDataService);
  private readonly motion = inject(MotionService);
  private readonly experienceState = inject(ExperienceStateService);
  private readonly sounds = inject(SoundDesignService);
  private readonly scenes = inject(SceneManagerService);
  private observer?: IntersectionObserver;
  private scrollTriggers: ScrollTrigger[] = [];
  private floatTweens: gsap.core.Tween[] = [];

  readonly reasons = signal<Reason[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly focusedId = signal<number | null>(null);
  readonly introComplete = signal(false);

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
    this.reasons.set(this.siteData.reasons());
    this.loading.set(false);
    setTimeout(() => {
      this.initScrollAnimations();
      this.initFloatMotion();
      this.initSceneObserver();
    }, 100);
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

    if (next !== null) {
      this.sounds.enable();
      this.sounds.play('star');
      this.experienceState.discoverReason(reason.id, reason.shortLabel);
      this.floatTweens.forEach(t => t.pause());
    } else {
      this.floatTweens.forEach(t => t.resume());
    }

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
    const revealTargets: Element[] = [];
    if (header) {
      revealTargets.push(header);
      const st = revealOnScroll(header, {
        opacity: 0,
        y: 30,
        duration: 1,
        ease: 'power3.out'
      }, { trigger: header, start: 'top 85%' });
      if (st) this.scrollTriggers.push(st);
    }

    const floats = this.floatRefs?.toArray() ?? [];
    floats.forEach((ref, i) => {
      revealTargets.push(ref.nativeElement);
      const st = revealOnScroll(ref.nativeElement, {
        opacity: 0,
        scale: 0.8,
        filter: 'blur(10px)',
        duration: 1,
        delay: i * 0.12,
        ease: 'power3.out'
      }, {
        trigger: this.sectionRef.nativeElement,
        start: 'top 75%'
      });
      if (st) this.scrollTriggers.push(st);
    });

    finalizeScrollReveal(...revealTargets);
  }

  private initFloatMotion(): void {
    if (this.motion.prefersReducedMotion()) return;

    this.floatTweens.forEach(t => t.kill());
    this.floatTweens = [];

    const floats = this.floatRefs?.toArray() ?? [];
    floats.forEach((ref, i) => {
      const el = ref.nativeElement;
      const tween = gsap.to(el, {
        y: `+=${4 + (i % 3) * 2}`,
        x: `+=${i % 2 === 0 ? 3 : -3}`,
        duration: 4.5 + (i % 4) * 0.75,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        overwrite: false
      });
      this.floatTweens.push(tween);
    });

    if (this.focusedId() !== null) {
      this.floatTweens.forEach(t => t.pause());
    }
  }

  private playIntro(): void {
    if (this.introComplete()) return;
    if (this.motion.prefersReducedMotion()) {
      this.introComplete.set(true);
      return;
    }
    setTimeout(() => this.introComplete.set(true), 2200);
  }
}
