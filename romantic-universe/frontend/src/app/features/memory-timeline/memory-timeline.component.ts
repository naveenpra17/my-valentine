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
import { DatePipe } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MotionService } from '../../core/services/motion.service';
import { LiveAnnouncerService } from '../../core/services/live-announcer.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { Memory } from '../../core/models';
import { CinematicLightboxComponent } from '../../shared/components/cinematic-lightbox/cinematic-lightbox.component';

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

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);
  private readonly announcer = inject(LiveAnnouncerService);
  private readonly sounds = inject(SoundDesignService);
  private readonly experienceState = inject(ExperienceStateService);
  private readonly scenes = inject(SceneManagerService);
  private observer?: IntersectionObserver;
  private scrollTriggers: ScrollTrigger[] = [];

  readonly memories = signal<Memory[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selected = signal<Memory | null>(null);
  readonly lightboxOpen = signal(false);
  readonly sourceRect = signal<DOMRect | null>(null);
  readonly imageErrors = signal<Set<number>>(new Set());

  constructor() {
    afterNextRender(() => {
      this.cardRefs.changes.subscribe(() => this.initScrollAnimations());
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.scrollTriggers.forEach(st => st.kill());
    if (this.lightboxOpen()) {
      document.body.style.overflow = '';
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.api.getMemories());
      this.memories.set(data);
    } catch {
      this.error.set('Could not load memories.');
    } finally {
      this.loading.set(false);
      setTimeout(() => {
        this.initScrollAnimations();
        this.initSceneObserver();
      }, 100);
    }
  }

  openMemory(memory: Memory, event: Event): void {
    const target = (event.currentTarget as HTMLElement).querySelector('.memory-card__image-wrap');
    this.sourceRect.set(target?.getBoundingClientRect() ?? null);
    this.selected.set(memory);
    this.lightboxOpen.set(true);
    document.body.style.overflow = 'hidden';
    this.experienceState.discoverMemory(memory.id, memory.title, memory.imageUrl);
    this.sounds.enable();
    this.sounds.play('memory');
    this.announcer.announce(`Opened memory: ${memory.title}`);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
    this.selected.set(null);
    this.sourceRect.set(null);
    document.body.style.overflow = '';
  }

  onImageError(id: number): void {
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

  private initScrollAnimations(): void {
    if (this.motion.prefersReducedMotion() || !this.sectionRef) return;

    this.scrollTriggers.forEach(st => st.kill());
    this.scrollTriggers = [];

    const header = this.sectionRef.nativeElement.querySelector('.memories__header');
    if (header) {
      const st = gsap.from(header, {
        scrollTrigger: {
          trigger: header,
          start: 'top 85%'
        },
        opacity: 0,
        y: 30,
        duration: 1,
        ease: 'power3.out'
      }).scrollTrigger;
      if (st) this.scrollTriggers.push(st);
    }

    const cards = this.cardRefs?.toArray() ?? [];
    cards.forEach((card, i) => {
      const imageWrap = card.nativeElement.querySelector('.memory-card__image-wrap');
      const body = card.nativeElement.querySelector('.memory-card__body');

      const st = gsap.timeline({
        scrollTrigger: {
          trigger: card.nativeElement,
          start: 'top 88%',
          toggleActions: 'play none none reverse'
        }
      })
        .from(card.nativeElement, {
          opacity: 0,
          y: 60,
          duration: 0.9,
          ease: 'power3.out'
        })
        .from(imageWrap, {
          scale: 0.85,
          filter: 'blur(8px)',
          duration: 1,
          ease: 'power3.out'
        }, '-=0.6')
        .from(body, {
          opacity: 0,
          x: i % 2 === 0 ? -20 : 20,
          duration: 0.7,
          ease: 'power3.out'
        }, '-=0.5')
        .scrollTrigger;

      if (st) this.scrollTriggers.push(st);

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
    });
  }
}
