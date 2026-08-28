import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
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
export class OurLittleHeartComponent implements OnDestroy {
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
  private inView = false;

  readonly hintVisible = signal(true);

  readonly availableObjects = computed(() => {
    const attached = new Set(
      this.experienceState.selectedHeartObjects().map(o => `${o.type}-${o.referenceId}`)
    );
    return this.experienceState.selectedHeartObjects().filter(
      o => !attached.has(`${o.type}-${o.referenceId}`)
    );
  });

  readonly floatingChoices = computed((): HeartObject[] => {
    return this.experienceState.selectedHeartObjects().slice(0, 12);
  });

  constructor() {
    effect(() => {
      const objects = this.experienceState.selectedHeartObjects();
      this.scene?.syncObjects(objects);
    });

    afterNextRender(() => void this.bootstrap());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
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

  private async bootstrap(): Promise<void> {
    this.scene = new OurLittleHeartScene(
      this.canvasHost.nativeElement,
      this.motion.prefersReducedMotion()
    );
    this.scene.init();
    this.scene.syncObjects(this.experienceState.selectedHeartObjects());
    this.scene.start();

    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.inView = entry.isIntersecting;
        this.scene?.setVisible(this.inView && this.visibility.pageVisible());
        if (entry.isIntersecting) {
          this.scenes.setScene('heart');
          this.experienceState.setChapter(6);
        }
      },
      { threshold: 0.15 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }
}
