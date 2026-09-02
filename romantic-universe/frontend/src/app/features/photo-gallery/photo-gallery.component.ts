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
import { SiteDataService } from '../../core/site/site-data.service';
import { MotionService } from '../../core/services/motion.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { Photo } from '../../core/models';
import { CinematicLightboxComponent } from '../../shared/components/cinematic-lightbox/cinematic-lightbox.component';
import { finalizeScrollReveal, revealOnScroll } from '../../core/utils/scroll-reveal';
import { placeholderImageDataUrl, resolveAccessibleImageUrl } from '../../core/utils/image-fallback';

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

  readonly title = input('Our Moments');
  readonly subtitle = input('Polaroids from our little universe');

  private readonly siteData = inject(SiteDataService);
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
  readonly imageErrors = signal<Set<number>>(new Set());
  readonly loadedImages = signal<Set<number>>(new Set());

  private opening = false;

  isDiscovered(id: number): boolean {
    return this.experienceState.isPhotoDiscovered(id);
  }

  isImageLoaded(id: number): boolean {
    return this.loadedImages().has(id);
  }

  constructor() {
    afterNextRender(() => {
      this.initAnimations();
      this.initSceneObserver();
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  async ngOnInit(): Promise<void> {
    const items = this.siteData.photos();
    const resolved = await Promise.all(
      items.map(async photo => ({
        ...photo,
        imageUrl: await resolveAccessibleImageUrl(photo.imageUrl, photo.title ?? 'Photo')
      }))
    );

    this.photos.set(resolved);
    this.loading.set(false);

    for (const photo of resolved) {
      if (photo.imageUrl.startsWith('data:')) {
        this.onImageLoad(photo.id);
      } else {
        this.preloadImage(photo);
      }
    }

    setTimeout(() => this.initAnimations(), 50);
  }

  openPhoto(photo: Photo, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.opening || this.lightboxOpen()) return;

    this.opening = true;
    const target = (event.currentTarget as HTMLElement).querySelector('.polaroid__image-wrap')
      ?? event.currentTarget as HTMLElement;
    this.sourceRect.set(target.getBoundingClientRect());
    this.selected.set(photo);
    this.lightboxOpen.set(true);

    const isNew = this.experienceState.discoverPhoto(
      photo.id,
      photo.caption ?? photo.title ?? undefined,
      photo.imageUrl
    );
    if (isNew) {
      this.sounds.enable();
      this.sounds.play('photo');
    }

    setTimeout(() => {
      this.opening = false;
    }, 400);
  }

  closeLightbox(): void {
    if (!this.lightboxOpen()) return;
    this.lightboxOpen.set(false);
    this.selected.set(null);
    this.sourceRect.set(null);
  }

  onImageLoad(id: number): void {
    this.loadedImages.update(set => new Set(set).add(id));
  }

  onImageError(id: number): void {
    const photo = this.photos().find(item => item.id === id);
    if (!photo) {
      this.imageErrors.update(set => new Set(set).add(id));
      return;
    }

    if (!photo.imageUrl.startsWith('data:')) {
      this.photos.update(items =>
        items.map(item =>
          item.id === id
            ? { ...item, imageUrl: placeholderImageDataUrl(photo.title ?? 'Photo') }
            : item
        )
      );
      this.onImageLoad(id);
      return;
    }

    this.imageErrors.update(set => new Set(set).add(id));
  }

  hasImageError(id: number): boolean {
    return this.imageErrors().has(id);
  }

  hasRealPhoto(photo: Photo): boolean {
    return !photo.imageUrl.startsWith('data:');
  }

  private preloadImage(photo: Photo): void {
    const img = new Image();
    img.onload = () => this.onImageLoad(photo.id);
    img.onerror = () => this.onImageError(photo.id);
    img.src = photo.imageUrl;
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
    const grid = this.sectionRef.nativeElement.querySelector('.photo-gallery__grid');
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

    if (grid) {
      revealTargets.push(grid);
      revealOnScroll(grid, {
        opacity: 0,
        y: 24,
        duration: 1,
        ease: 'power3.out'
      }, { trigger: grid, start: 'top 90%' });
    }

    finalizeScrollReveal(...revealTargets);
  }
}
