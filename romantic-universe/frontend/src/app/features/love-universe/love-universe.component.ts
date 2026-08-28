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
import { firstValueFrom } from 'rxjs';
import gsap from 'gsap';
import { ApiService } from '../../core/services/api.service';
import { MotionService } from '../../core/services/motion.service';
import { VisibilityService } from '../../core/services/visibility.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { LoveUniverseScene } from './love-universe-scene';

@Component({
  selector: 'app-love-universe',
  standalone: true,
  templateUrl: './love-universe.component.html',
  styleUrl: './love-universe.component.scss'
})
export class LoveUniverseComponent implements OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLElement>;
  @ViewChild('section', { static: true }) section!: ElementRef<HTMLElement>;
  @ViewChild('introText') introTextRef?: ElementRef<HTMLElement>;

  readonly line1 = input('You found something...');
  readonly line2 = input('A little universe.');

  private readonly motion = inject(MotionService);
  private readonly visibility = inject(VisibilityService);
  private readonly api = inject(ApiService);
  private readonly scenes = inject(SceneManagerService);

  private scene?: LoveUniverseScene;
  private observer?: IntersectionObserver;
  private inViewport = true;
  private scrollHandler?: () => void;

  readonly introVisible = signal(true);
  readonly photosLoaded = signal(false);

  constructor() {
    afterNextRender(() => void this.bootstrap());
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
    this.observer?.disconnect();
    this.scene?.dispose();
  }

  private async bootstrap(): Promise<void> {
    this.scenes.setScene('universe');

    this.scene = new LoveUniverseScene(
      this.canvasHost.nativeElement,
      this.motion.prefersReducedMotion()
    );
    this.scene.init();
    this.scene.start();

    try {
      const photos = await firstValueFrom(this.api.getPhotos());
      await this.scene.loadPhotos(
        photos.map(p => ({ id: p.id, imageUrl: p.imageUrl, title: p.title }))
      );
      this.photosLoaded.set(true);
    } catch {
      // Universe works without photos
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.inViewport = entry.isIntersecting;
        this.updateSceneVisibility();
      },
      { threshold: 0.05 }
    );
    this.observer.observe(this.section.nativeElement);

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.scrollHandler = () => this.onScroll();
    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    this.playIntro();
  }

  private playIntro(): void {
    if (this.motion.prefersReducedMotion()) {
      setTimeout(() => this.introVisible.set(false), 2000);
      return;
    }

    const el = this.introTextRef?.nativeElement;
    if (!el) {
      setTimeout(() => this.introVisible.set(false), 4000);
      return;
    }

    gsap.fromTo(el.children, {
      opacity: 0,
      y: 20,
      filter: 'blur(8px)'
    }, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.4,
      stagger: 1.2,
      ease: 'power3.out'
    });

    gsap.to(el, {
      opacity: 0,
      y: -12,
      delay: 5,
      duration: 1.2,
      ease: 'power2.in',
      onComplete: () => this.introVisible.set(false)
    });
  }

  private onScroll(): void {
    if (!this.scene || !this.inViewport) return;
    const rect = this.section.nativeElement.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = 1 - Math.max(0, Math.min(1, rect.bottom / (rect.height + vh)));
    this.scene.setScrollProgress(progress);
  }

  private onVisibilityChange = (): void => {
    this.updateSceneVisibility();
  };

  private updateSceneVisibility(): void {
    this.scene?.setVisible(this.inViewport && this.visibility.pageVisible());
  }
}
