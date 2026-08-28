import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  afterNextRender,
  inject,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MotionService } from '../../core/services/motion.service';
import { Photo } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './photo-gallery.component.html',
  styleUrl: './photo-gallery.component.scss'
})
export class PhotoGalleryComponent implements OnInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('carousel') carouselRef!: ElementRef<HTMLElement>;

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);

  readonly photos = signal<Photo[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selected = signal<Photo | null>(null);
  readonly activeIndex = signal(0);
  readonly imageErrors = signal<Set<number>>(new Set());

  private touchStartX = 0;
  private isMobile = false;

  constructor() {
    afterNextRender(() => {
      this.isMobile = window.innerWidth < 768;
      this.initAnimations();
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.api.getPhotos());
      this.photos.set(data);
    } catch {
      this.error.set('Could not load photos.');
    } finally {
      this.loading.set(false);
    }
  }

  openPhoto(photo: Photo): void {
    this.selected.set(photo);
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.selected.set(null);
    document.body.style.overflow = '';
  }

  onImageError(id: number): void {
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

  private initAnimations(): void {
    if (this.motion.prefersReducedMotion() || !this.sectionRef) return;

    gsap.from(this.sectionRef.nativeElement.querySelector('.photo-gallery__header'), {
      scrollTrigger: { trigger: this.sectionRef.nativeElement, start: 'top 80%' },
      opacity: 0,
      y: 30,
      duration: 0.9,
      ease: 'power3.out'
    });
  }
}
