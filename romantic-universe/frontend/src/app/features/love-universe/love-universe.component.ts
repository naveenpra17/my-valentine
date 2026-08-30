import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import gsap from 'gsap';
import { ApiService } from '../../core/services/api.service';
import { MotionService } from '../../core/services/motion.service';
import { VisibilityService } from '../../core/services/visibility.service';
import { CameraDirectorService } from '../../core/cinematic/camera-director.service';
import { ExperienceControllerService } from '../../core/experience/experience-controller.service';
import { MusicalChoreographyService } from '../../core/audio/musical-choreography.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { ExperienceFlowService } from '../../core/experience/experience-flow.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { ExperienceNavigationService } from '../../core/experience/experience-navigation.service';
import { ScrollProgressService } from '../../core/cinematic/scroll-progress.service';
import { ChapterVisitDirective } from '../../shared/directives/chapter-visit.directive';
import { LoveUniverseScene } from './love-universe-scene';

@Component({
  selector: 'app-love-universe',
  standalone: true,
  imports: [ChapterVisitDirective],
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
  private readonly experienceFlow = inject(ExperienceFlowService);
  private readonly experienceState = inject(ExperienceStateService);
  private readonly navigation = inject(ExperienceNavigationService);
  private readonly scrollProgress = inject(ScrollProgressService);
  private readonly cameraDirector = inject(CameraDirectorService);
  private readonly controller = inject(ExperienceControllerService);
  private readonly music = inject(MusicalChoreographyService);

  private scene?: LoveUniverseScene;
  private observer?: IntersectionObserver;
  private inViewport = true;

  readonly introVisible = signal(true);
  readonly photosLoaded = signal(false);
  readonly discoveryHunt = this.experienceState.heartDiscoveryHunt;

  returnToHeart(): void {
    this.experienceState.setHeartDiscoveryHunt(false);
    this.navigation.scrollToHeart();
  }

  constructor() {
    afterNextRender(() => void this.bootstrap());

    effect(() => {
      const progress = this.scrollProgress.progress();
      this.scene?.setScrollProgress(progress);
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.observer?.disconnect();
    this.cameraDirector.unregister();
    this.scene?.dispose();
  }

  private async bootstrap(): Promise<void> {
    this.scenes.setScene('universe');

    this.scene = new LoveUniverseScene(
      this.canvasHost.nativeElement,
      this.motion.prefersReducedMotion()
    );
    this.scene.init();
    this.scene.setPhotoDiscoverHandler((id, title) => {
      void this.experienceFlow.handlePhotoDiscovery(id, title);
    });
    this.scene.playEntryFromVoid();
    this.scene.start();
    this.music.enterUniverse();

    this.cameraDirector.register({
      approach: (t, d) => this.scene!.approach(t, d),
      pullBack: (d) => this.scene!.pullBack(d),
      focusPhoto: (id, d) => this.scene!.focusPhotoById(id, d),
      returnToUniverse: (d) => this.scene!.returnToUniverse(d),
      focusObject: (t, d) => this.scene!.approach(t, d),
      enterMemory: (d) => this.scene!.approach({ x: 0, y: 0.15, z: -1.5 }, d ?? 1500),
      exitMemory: (d) => this.scene!.pullBack(d),
      focusReason: (d) => this.scene!.approach({ x: 1.5, y: 0.5, z: -2.5 }, d ?? 1400),
      focusQuote: (d) => this.scene!.approach({ x: -1.2, y: 1, z: -3 }, d ?? 1400),
      focusHeart: (d) => this.scene!.approach({ x: 0, y: 0, z: -0.5 }, d ?? 1500)
    });

    try {
      const photos = await firstValueFrom(this.api.getPhotos());
      await this.scene.loadPhotos(
        photos.map(p => ({ id: p.id, imageUrl: p.imageUrl, title: p.title }))
      );
      this.photosLoaded.set(true);
    } catch {
      await this.scene.loadPhotos([
        { id: 1, imageUrl: '/assets/images/gallery/photo-1.png', title: 'Us' },
        { id: 2, imageUrl: '/assets/images/gallery/photo-2.png', title: 'Sunset' },
        { id: 3, imageUrl: '/assets/images/gallery/photo-3.png', title: 'Adventure' },
        { id: 4, imageUrl: '/assets/images/gallery/photo-4.png', title: 'Candid' },
        { id: 5, imageUrl: '/assets/images/gallery/photo-5.png', title: 'Together' },
        { id: 6, imageUrl: '/assets/images/gallery/photo-6.png', title: 'Smile' }
      ]);
      this.photosLoaded.set(true);
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
      y: 14,
      filter: 'blur(8px)'
    }, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.6,
      stagger: 1.6,
      ease: 'power3.out'
    });

    gsap.to(el, {
      opacity: 0,
      y: -10,
      delay: 6.2,
      duration: 1.4,
      ease: 'power2.in',
      onComplete: () => this.introVisible.set(false)
    });
  }

  private onVisibilityChange = (): void => {
    this.updateSceneVisibility();
  };

  private updateSceneVisibility(): void {
    this.scene?.setVisible(this.inViewport && this.visibility.pageVisible());
  }
}
