import {
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../../core/services/motion.service';
import { VisibilityService } from '../../core/services/visibility.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { HeartObject } from '../../core/experience/experience-state.types';
import { OurLittleHeartScene } from './our-little-heart-scene';

@Component({
  selector: 'app-our-little-heart',
  standalone: true,
  templateUrl: './our-little-heart.component.html',
  styleUrl: './our-little-heart.component.scss'
})
export class OurLittleHeartComponent implements OnDestroy, AfterViewInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('canvasHost') canvasHost!: ElementRef<HTMLElement>;
  @ViewChild('hintEl') hintRef?: ElementRef<HTMLElement>;

  readonly title = input('Our Little Heart');
  readonly subtitle = input('Choose something for our heart.');

  private readonly motion = inject(MotionService);
  private readonly visibility = inject(VisibilityService);
  private readonly sounds = inject(SoundDesignService);
  readonly experienceState = inject(ExperienceStateService);
  private readonly scenes = inject(SceneManagerService);

  private scene?: OurLittleHeartScene;
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private inView = false;
  private bootstrapped = false;

  readonly hintVisible = signal(true);
  readonly sceneReady = signal(false);
  readonly sceneFailed = signal(false);

  readonly floatingChoices = computed((): HeartObject[] => {
    return this.experienceState.availableHeartObjects().slice(0, 12);
  });

  readonly discoveryCount = computed(() => this.experienceState.totalDiscoveries());

  constructor() {
    effect(() => {
      const objects = this.experienceState.selectedHeartObjects();
      this.scene?.syncObjects(objects);
    });
  }

  ngAfterViewInit(): void {
    this.waitForContainerAndBootstrap();

    const host = this.canvasHost?.nativeElement;
    if (host) {
      this.resizeObserver = new ResizeObserver(() => {
        this.scene?.resize();
      });
      this.resizeObserver.observe(host);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.scene?.dispose();
  }

  attachObject(obj: HeartObject): void {
    this.sounds.enable();
    this.sounds.play('heart');
    this.experienceState.attachHeartObject(obj);
    this.hintVisible.set(false);

    if (!this.motion.prefersReducedMotion() && this.hintRef) {
      gsap.fromTo(this.hintRef.nativeElement, {
        opacity: 1
      }, {
        opacity: 0,
        duration: 0.6
      });
    }
  }

  private waitForContainerAndBootstrap(attempts = 0): void {
    const host = this.canvasHost?.nativeElement;
    if (!host) return;

    if (host.clientWidth < 20 || host.clientHeight < 20) {
      if (attempts < 60) {
        requestAnimationFrame(() => this.waitForContainerAndBootstrap(attempts + 1));
      }
      return;
    }

    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    if (this.bootstrapped) return;
    this.bootstrapped = true;

    try {
      this.scene = new OurLittleHeartScene(
        this.canvasHost.nativeElement,
        this.motion.prefersReducedMotion()
      );
      this.scene.init();
      this.scene.syncObjects(this.experienceState.selectedHeartObjects());
      this.scene.start();
      this.sceneReady.set(true);

      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.inView = entry.isIntersecting;
          this.scene?.setVisible(this.inView && this.visibility.pageVisible());
          if (entry.isIntersecting) {
            this.scenes.setScene('heart');
          }
        },
        { threshold: 0.15 }
      );
      this.observer.observe(this.sectionRef.nativeElement);
    } catch {
      this.sceneFailed.set(true);
    }
  }
}
