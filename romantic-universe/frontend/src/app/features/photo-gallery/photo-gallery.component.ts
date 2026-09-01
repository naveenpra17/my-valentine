import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
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
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { Photo } from '../../core/models';
import { CinematicLightboxComponent } from '../../shared/components/cinematic-lightbox/cinematic-lightbox.component';
import { finalizeScrollReveal, revealOnScroll } from '../../core/utils/scroll-reveal';
import { getImageFallbacks } from '../../core/utils/image-fallback';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [CinematicLightboxComponent],
  templateUrl: './photo-gallery.component.html',
  styleUrl: './photo-gallery.component.scss'
})
export class PhotoGalleryComponent implements OnInit, OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('carousel') carouselRef!: ElementRef<HTMLElement>;

  readonly title = input('Our Moments');
  readonly subtitle = input('Polaroids from our little universe');

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);
  private readonly experienceState = inject(ExperienceStateService);
  private readonly scenes = inject(SceneManagerService);
  private readonly sounds = inject(SoundDesignService);
  private observer?: IntersectionObserver;

  readonly photos = signal<Photo[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selected = signal<Photo | null>(null);
  readonly lightboxOpen = signal(false);
  readonly sourceRect = signal<DOMRect | null>(null);
  readonly activeIndex = signal(0);
  readonly imageErrors = signal<Set<number>>(new Set());

  private touchStartX = 0;
  private isMobile = false;

  isDiscovered(id: number): boolean {
    return this.experienceState.isPhotoDiscovered(id);
  }

  constructor() {
    afterNextRender(() => {
      this.isMobile = window.innerWidth < 768;
      this.initAnimations();
      this.initSceneObserver();
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.lightboxOpen()) {
      document.body.style.overflow = '';
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.api.getPhotos());
      this.photos.set(data);
      setTimeout(() => this.initAnimations(), 50);
    } catch {
      this.error.set('Could not load photos.');
    } finally {
      this.loading.set(false);
    }
  }

  openPhoto(photo: Photo, event: Event): void {
    const target = (event.currentTarget as HTMLElement).querySelector('.polaroid__image-wrap')
      ?? event.currentTarget as HTMLElement;
    this.sourceRect.set(target.getBoundingClientRect());
    this.selected.set(photo);
    this.lightboxOpen.set(true);
    document.body.style.overflow = 'hidden';
    const isNew = this.experienceState.discoverPhoto(photo.id, photo.caption ?? photo.title ?? undefined, photo.imageUrl);
    if (isNew) {
      this.sounds.enable();
      this.sounds.play('photo');
    }
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
    this.selected.set(null);
    this.sourceRect.set(null);
    document.body.style.overflow = '';
  }

  onImageError(id: number): void {
    const current = this.photos().find(photo => photo.id === id)?.imageUrl ?? '';
    const photo = this.photos().find(item => item.id === id);
    if (!photo) {
      this.imageErrors.update(set => new Set(set).add(id));
      return;
    }

    const candidates = getImageFallbacks(current);
    const next = candidates.find(candidate => candidate !== current && !this.photos().some(item => item.id === id && item.imageUrl === candidate));

    if (next) {
      this.photos.update(items => items.map(item => item.id === id ? { ...item, imageUrl: next } : item));
      return;
    }

    this.imageErrors.update(set => new Set(set).add(id));
  }

  hasImageError(id: number): boolean {
    return this.imageErrors().has(id);
  }

  getCarouselTransform(): string {
    const photos = this.photos();
    if (photos.length === 0) return 'none';

    if (this.isMobile) {
      return 'none';
    }

    const index = this.activeIndex();
    const angleStep = 360 / photos.length;
    const angle = -index * angleStep;
    return `translateZ(-320px) rotateY(${angle}deg)`;
  }

  getCardTransform(i: number): string {
    const photos = this.photos();
    if (photos.length === 0 || this.isMobile) return 'none';

    const angle = (360 / photos.length) * i;
    return `rotateY(${angle}deg) translateZ(320px)`;
  }

  setActive(index: number): void {
    const len = this.photos().length;
    if (len === 0) return;
    this.activeIndex.set(((index % len) + len) % len);
  }

  prev(): void {
    this.setActive(this.activeIndex() - 1);
  }

  next(): void {
    this.setActive(this.activeIndex() + 1);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const diff = this.touchStartX - event.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? this.next() : this.prev();
    }
  }

  private initSceneObserver(): void {
    if (!this.sectionRef) return;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('gallery');
        }
      },
      { threshold: 0.2 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private initAnimations(): void {
    if (this.motion.prefersReducedMotion() || !this.sectionRef) return;

    const header = this.sectionRef.nativeElement.querySelector('.photo-gallery__header');
    const stage = this.sectionRef.nativeElement.querySelector('.photo-gallery__stage');
    const revealTargets: Element[] = [];

    if (header) {
      revealTargets.push(header);
      revealOnScroll(header, {
        opacity: 0,
        y: 30,
        duration: 0.9,
        ease: 'power3.out'
      }, { trigger: this.sectionRef.nativeElement, start: 'top 80%' });
    }

    if (stage) {
      revealTargets.push(stage);
      revealOnScroll(stage, {
        opacity: 0,
        scale: 0.92,
        duration: 1.2,
        ease: 'power3.out'
      }, { trigger: stage, start: 'top 85%' });
    }

    finalizeScrollReveal(...revealTargets);
  }
}
