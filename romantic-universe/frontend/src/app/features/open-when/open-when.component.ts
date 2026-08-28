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
import { SoundDesignService } from '../../core/services/sound-design.service';
import { OpenWhenMessage } from '../../core/models';

gsap.registerPlugin(ScrollTrigger);

type EnvelopeMood = 'warm' | 'tender' | 'longing' | 'comfort' | 'night' | 'hope';

const MOOD_CYCLE: EnvelopeMood[] = ['warm', 'tender', 'longing', 'comfort', 'night', 'hope'];

@Component({
  selector: 'app-open-when',
  standalone: true,
  templateUrl: './open-when.component.html',
  styleUrl: './open-when.component.scss'
})
export class OpenWhenComponent implements OnInit, OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('moodLayer') moodLayerRef?: ElementRef<HTMLElement>;
  @ViewChild('letterPanel') letterPanelRef?: ElementRef<HTMLElement>;
  @ViewChildren('envelope') envelopeRefs!: QueryList<ElementRef<HTMLElement>>;

  readonly title = input('Messages for Different Days');
  readonly subtitle = input('Open one whenever you need it');

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);
  private readonly scenes = inject(SceneManagerService);
  private readonly sounds = inject(SoundDesignService);
  private observer?: IntersectionObserver;
  private scrollTriggers: ScrollTrigger[] = [];

  readonly messages = signal<OpenWhenMessage[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly openedId = signal<number | null>(null);
  readonly activeMood = signal<EnvelopeMood>('warm');

  constructor() {
    afterNextRender(() => {
      this.envelopeRefs.changes.subscribe(() => this.initScrollAnimations());
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.scrollTriggers.forEach(st => st.kill());
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.api.getOpenWhenMessages());
      this.messages.set(data);
    } catch {
      this.error.set('Could not load messages.');
    } finally {
      this.loading.set(false);
      setTimeout(() => {
        this.initScrollAnimations();
        this.initSceneObserver();
      }, 100);
    }
  }

  openedMessage(): OpenWhenMessage | null {
    const id = this.openedId();
    if (id === null) return null;
    return this.messages().find(m => m.id === id) ?? null;
  }

  getMood(index: number): EnvelopeMood {
    return MOOD_CYCLE[index % MOOD_CYCLE.length];
  }

  openEnvelope(msg: OpenWhenMessage, index: number): void {
    if (this.openedId() === msg.id) {
      this.closeEnvelope();
      return;
    }

    this.sounds.enable();
    this.sounds.play('envelope');

    const mood = this.getMood(index);
    this.activeMood.set(mood);
    this.openedId.set(msg.id);
    this.shiftMood(mood);
    this.revealLetter();
  }

  closeEnvelope(): void {
    this.openedId.set(null);
    this.shiftMood('warm');
  }

  isOpen(id: number): boolean {
    return this.openedId() === id;
  }

  private shiftMood(mood: EnvelopeMood): void {
    const layer = this.moodLayerRef?.nativeElement;
    if (!layer || this.motion.prefersReducedMotion()) return;

    gsap.to(layer, {
      opacity: mood === 'warm' && this.openedId() === null ? 0.35 : 0.85,
      duration: 1.2,
      ease: 'power2.inOut'
    });
  }

  private revealLetter(): void {
    const panel = this.letterPanelRef?.nativeElement;
    if (!panel || this.motion.prefersReducedMotion()) return;

    gsap.fromTo(panel, {
      opacity: 0,
      y: 40,
      filter: 'blur(10px)'
    }, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1,
      ease: 'power3.out'
    });
  }

  private initSceneObserver(): void {
    if (!this.sectionRef) return;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('open-when');
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

    const header = this.sectionRef.nativeElement.querySelector('.open-when__header');
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

    const envelopes = this.envelopeRefs?.toArray() ?? [];
    envelopes.forEach((ref, i) => {
      const st = gsap.from(ref.nativeElement, {
        scrollTrigger: {
          trigger: this.sectionRef.nativeElement,
          start: 'top 75%',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        y: 40,
        rotate: i % 2 === 0 ? -2 : 2,
        duration: 0.8,
        delay: i * 0.1,
        ease: 'power3.out'
      }).scrollTrigger;
      if (st) this.scrollTriggers.push(st);
    });
  }
}
