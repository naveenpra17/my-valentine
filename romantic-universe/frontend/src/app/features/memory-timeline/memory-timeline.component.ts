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
  signal,
  computed
} from '@angular/core';
import { DatePipe } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SiteDataService } from '../../core/site/site-data.service';
import { MotionService } from '../../core/services/motion.service';
import { LiveAnnouncerService } from '../../core/services/live-announcer.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { Memory } from '../../core/models';
import { CinematicLightboxComponent } from '../../shared/components/cinematic-lightbox/cinematic-lightbox.component';
import { finalizeScrollReveal, revealOnScroll } from '../../core/utils/scroll-reveal';
import { getImageFallbacks, placeholderImageDataUrl } from '../../core/utils/image-fallback';
import { BodyScrollLockService } from '../../core/services/body-scroll-lock.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-memory-timeline',
  standalone: true,
  imports: [DatePipe, CinematicLightboxComponent],
  templateUrl: './memory-timeline.component.html',
  styleUrl: './memory-timeline.component.scss'
})
export class MemoryTimelineComponent implements OnInit, OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChildren('memoryCard') cardRefs!: QueryList<ElementRef<HTMLElement>>;

  readonly title = input('Things I Remember');
  readonly subtitle = input('Little moments that stayed with me');
  readonly discoveredOnly = input(false);
  readonly introLine1 = input('Some moments disappear.');
  readonly introLine2 = input('Some stay.');
  readonly introLine3 = input('I kept these.');

  private readonly siteData = inject(SiteDataService);
  private readonly motion = inject(MotionService);
  private readonly announcer = inject(LiveAnnouncerService);
  private readonly sounds = inject(SoundDesignService);
  private readonly experienceState = inject(ExperienceStateService);
  private readonly scenes = inject(SceneManagerService);
  private readonly scrollLock = inject(BodyScrollLockService);
  private observer?: IntersectionObserver;
  private scrollTriggers: ScrollTrigger[] = [];

  readonly memories = signal<Memory[]>([]);
  readonly visibleMemories = computed(() => {
    const all = this.memories();
    if (!this.discoveredOnly()) return all;
    return all.filter(m => this.experienceState.isMemoryDiscovered(m.id));
  });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selected = signal<Memory | null>(null);
  readonly lightboxOpen = signal(false);
  readonly sourceRect = signal<DOMRect | null>(null);
  readonly imageErrors = signal<Set<number>>(new Set());
  readonly introComplete = signal(false);
  readonly introLineIndex = signal(0);

  private introPlayed = false;
  private lastOpenedIndex = -1;

  constructor() {
    afterNextRender(() => {
      this.cardRefs.changes.subscribe(() => this.initScrollAnimations());
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.scrollTriggers.forEach(st => st.kill());
    if (this.lightboxOpen()) {
      this.scrollLock.unlock();
    }
  }

  async ngOnInit(): Promise<void> {
    this.memories.set(this.siteData.memories());
    this.loading.set(false);
    setTimeout(() => {
      this.initScrollAnimations();
      this.initSceneObserver();
    }, 100);
  }

  openMemory(memory: Memory, event: Event): void {
    const cards = this.cardRefs?.toArray() ?? [];
    const index = cards.findIndex(ref => ref.nativeElement.contains(event.currentTarget as Node));
    const cardEl = (event.currentTarget as HTMLElement);

    if (!this.motion.prefersReducedMotion() && index >= 0 && this.lastOpenedIndex >= 0 && index !== this.lastOpenedIndex) {
      this.playMemoryTransition(cardEl, index);
    }
    this.lastOpenedIndex = index;

    const target = cardEl.querySelector('.memory-card__image-wrap');
    this.sourceRect.set(target?.getBoundingClientRect() ?? null);
    this.selected.set(memory);
    this.lightboxOpen.set(true);
    this.scrollLock.lock();
    this.experienceState.discoverMemory(memory.id, memory.title, memory.imageUrl);
    this.sounds.enable();
    this.sounds.play('memory');
    this.announcer.announce(`Opened memory: ${memory.title}`);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
    this.selected.set(null);
    this.sourceRect.set(null);
    this.scrollLock.unlock();
  }

  onImageError(id: number): void {
    const memory = this.memories().find(item => item.id === id);
    if (!memory) {
      this.imageErrors.update(set => new Set(set).add(id));
      return;
    }

    const current = memory.imageUrl ?? '';
    const candidates = getImageFallbacks(current);
    const next = candidates.find(
      candidate => candidate !== current && !candidate.startsWith('data:')
    );

    if (next) {
      this.memories.update(items =>
        items.map(item => (item.id === id ? { ...item, imageUrl: next } : item))
      );
      return;
    }

    if (!current.startsWith('data:')) {
      this.memories.update(items =>
        items.map(item =>
          item.id === id
            ? { ...item, imageUrl: placeholderImageDataUrl(memory.title) }
            : item
        )
      );
      return;
    }

    this.imageErrors.update(set => new Set(set).add(id));
  }

  hasImageError(id: number): boolean {
    return this.imageErrors().has(id);
  }

  private initSceneObserver(): void {
    if (!this.sectionRef) return;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('memories');
        }
      },
      { threshold: 0.2 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private playIntro(): void {
    if (this.introPlayed) return;
    this.introPlayed = true;

    if (this.motion.prefersReducedMotion()) {
      this.introComplete.set(true);
      return;
    }

    const lines = [this.introLine1(), this.introLine2(), this.introLine3()];
    let i = 0;
    const step = (): void => {
      this.introLineIndex.set(i);
      i += 1;
      if (i < lines.length) {
        setTimeout(step, 1200);
      } else {
        setTimeout(() => this.introComplete.set(true), 800);
      }
    };
    step();
  }

  private playMemoryTransition(cardEl: HTMLElement, index: number): void {
    const imageWrap = cardEl.querySelector('.memory-card__image-wrap');
    if (!imageWrap) return;

    const mode = index % 3;
    if (mode === 0) {
      gsap.fromTo(imageWrap, {
        opacity: 0.4,
        scale: 0.92,
        filter: 'blur(12px)'
      }, {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power3.out'
      });
    } else if (mode === 1) {
      gsap.fromTo(imageWrap, {
        rotationY: -18,
        transformPerspective: 800,
        opacity: 0.5
      }, {
        rotationY: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out'
      });
    } else {
      gsap.fromTo(imageWrap, {
        y: 24,
        opacity: 0,
        filter: 'blur(6px)'
      }, {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.85,
        ease: 'power2.out'
      });
    }
  }

  private initScrollAnimations(): void {
    if (this.motion.prefersReducedMotion() || !this.sectionRef) return;

    this.scrollTriggers.forEach(st => st.kill());
    this.scrollTriggers = [];

    const header = this.sectionRef.nativeElement.querySelector('.memories__header');
    if (header) {
      const st = revealOnScroll(header, {
        opacity: 0,
        y: 30,
        duration: 1,
        ease: 'power3.out'
      }, { trigger: header, start: 'top 85%' });
      if (st) this.scrollTriggers.push(st);
    }

    const cards = this.cardRefs?.toArray() ?? [];
    const revealTargets: Element[] = [header].filter(Boolean) as Element[];

    cards.forEach((card, i) => {
      revealTargets.push(card.nativeElement);
      const imageWrap = card.nativeElement.querySelector('.memory-card__image-wrap');
      const body = card.nativeElement.querySelector('.memory-card__body');

      const st = gsap.timeline({
        scrollTrigger: {
          trigger: card.nativeElement,
          start: 'top 88%',
          once: true,
          toggleActions: 'play none none none'
        }
      })
        .from(card.nativeElement, {
          opacity: 0,
          y: 60,
          duration: 0.9,
          ease: 'power3.out',
          immediateRender: false
        })
        .from(imageWrap, {
          scale: 0.85,
          filter: 'blur(8px)',
          duration: 1,
          ease: 'power3.out',
          immediateRender: false
        }, '-=0.6')
        .from(body, {
          opacity: 0,
          x: i % 2 === 0 ? -20 : 20,
          duration: 0.7,
          ease: 'power3.out',
          immediateRender: false
        }, '-=0.5')
        .scrollTrigger;

      if (st) this.scrollTriggers.push(st);

      if (!this.motion.isMobile()) {
        const parallax = gsap.to(imageWrap, {
          y: -12,
          ease: 'none',
          scrollTrigger: {
            trigger: card.nativeElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }).scrollTrigger;

        if (parallax) this.scrollTriggers.push(parallax);
      }
    });

    finalizeScrollReveal(...revealTargets);
  }
}
