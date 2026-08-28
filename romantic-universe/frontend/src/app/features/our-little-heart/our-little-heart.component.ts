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
import { HeartStateService } from '../../core/experience/heart-state.service';
import { prioritizePool } from '../../core/experience/heart-asset.mapper';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { CameraDirectorService } from '../../core/cinematic/camera-director.service';
import { HeartObject } from '../../core/experience/experience-state.types';
import { ChapterVisitDirective } from '../../shared/directives/chapter-visit.directive';
import { HeartScenePhase, OurLittleHeartScene } from './our-little-heart-scene';
import { objectKey } from './heart-object-meshes';

const INTRO_KEY = 'ru_heart_intro_seen';
const FIRST_ATTACH_KEY = 'ru_heart_first_attach';

type GuidanceKey = 'intro' | 'choose' | 'first' | 'another' | 'rich' | 'done' | 'empty';

@Component({
  selector: 'app-our-little-heart',
  standalone: true,
  imports: [ChapterVisitDirective],
  templateUrl: './our-little-heart.component.html',
  styleUrl: './our-little-heart.component.scss'
})
export class OurLittleHeartComponent implements OnDestroy, AfterViewInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('canvasHost') canvasHost!: ElementRef<HTMLElement>;
  @ViewChild('introEl') introRef?: ElementRef<HTMLElement>;
  @ViewChild('guidanceEl') guidanceRef?: ElementRef<HTMLElement>;

  readonly title = input('Our Little Heart');
  readonly subtitle = input('Choose something for our heart.');

  private readonly motion = inject(MotionService);
  private readonly visibility = inject(VisibilityService);
  private readonly sounds = inject(SoundDesignService);
  readonly experienceState = inject(ExperienceStateService);
  private readonly heartState = inject(HeartStateService);
  private readonly scenes = inject(SceneManagerService);
  private readonly camera = inject(CameraDirectorService);

  private scene?: OurLittleHeartScene;
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private inView = false;
  private bootstrapped = false;
  private attaching = false;
  private introPlayed = false;

  readonly sceneReady = signal(false);
  readonly sceneFailed = signal(false);
  readonly phase = signal<HeartScenePhase>('intro');
  readonly showIntro = signal(true);
  readonly guidance = signal<GuidanceKey>('intro');
  readonly selectedObject = signal<HeartObject | null>(null);
  readonly showCompletion = signal(false);
  readonly introLine = signal(0);

  readonly poolObjects = computed(() =>
    prioritizePool(this.experienceState.availableHeartObjects())
  );

  readonly attachedCount = computed(() => this.experienceState.selectedHeartObjects().length);

  readonly canComplete = computed(() => {
    const selected = this.experienceState.selectedHeartObjects();
    const hasPhoto = selected.some(o => o.type === 'photo');
    const hasOther = selected.some(o => o.type !== 'photo');
    return selected.length >= 2 && hasPhoto && hasOther;
  });

  readonly guidanceText = computed(() => {
    switch (this.guidance()) {
      case 'intro': return 'Choose something for our heart.';
      case 'choose': return 'Touch one of the little lights around the heart.';
      case 'first': return "That's one. Let's keep going.";
      case 'another': return "There's room for another.";
      case 'rich': return "Look what you've made.";
      case 'done': return 'Look at our little heart.';
      case 'empty': return "Let's find some things to put in here.";
      default: return '';
    }
  });

  constructor() {
    effect(() => {
      const attached = this.experienceState.selectedHeartObjects();
      this.scene?.syncAttachedObjects(attached);
      this.updateGuidance();
    });

    effect(() => {
      const pool = this.poolObjects();
      void this.scene?.setPoolObjects(pool);
    });
  }

  ngAfterViewInit(): void {
    this.waitForContainerAndBootstrap();

    const host = this.canvasHost?.nativeElement;
    if (host) {
      this.resizeObserver = new ResizeObserver(() => this.scene?.resize());
      this.resizeObserver.observe(host);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.scene?.dispose();
  }

  beginHeart(): void {
    this.showIntro.set(false);
    this.scene?.beginCreation();
    this.guidance.set(this.poolObjects().length ? 'choose' : 'empty');
    sessionStorage.setItem(INTRO_KEY, '1');
  }

  async attachFromPool(obj: HeartObject): Promise<void> {
    if (this.attaching || this.phase() === 'intro') return;
    const key = objectKey(obj);
    if (this.experienceState.selectedHeartObjects().some(o => objectKey(o) === key)) return;

    this.attaching = true;
    this.sounds.enable();
    const placed = this.heartState.prepareAttach(obj);

    try {
      await this.scene?.flyAttach(placed);
      this.experienceState.attachHeartObject(placed);
      this.sounds.play('heart');

      const isFirst = !sessionStorage.getItem(FIRST_ATTACH_KEY);
      if (isFirst) {
        sessionStorage.setItem(FIRST_ATTACH_KEY, '1');
        this.guidance.set('first');
        await this.pause(1800);
      }
      this.updateGuidance();
    } finally {
      this.attaching = false;
    }
  }

  async removeSelected(): Promise<void> {
    const obj = this.selectedObject();
    if (!obj || this.attaching) return;

    this.attaching = true;
    this.experienceState.removeHeartObject(obj.type, obj.referenceId);
    const poolIndex = this.poolObjects().length;
    await this.scene?.flyDetach(obj, poolIndex, poolIndex + 1);
    this.selectedObject.set(null);
    this.scene?.clearAttachedFocus();
    this.updateGuidance();
    this.attaching = false;
  }

  onAttachedTap(obj: HeartObject): void {
    this.selectedObject.set(obj);
    this.scene?.focusAttached(objectKey(obj));
    this.sounds.enable();
    this.sounds.play('star');
  }

  dismissDetail(): void {
    this.selectedObject.set(null);
    this.scene?.clearAttachedFocus();
  }

  finishHeart(): void {
    this.showCompletion.set(true);
    this.guidance.set('done');
    this.scene?.completeCreation();
  }

  continueJourney(): void {
    this.sectionRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  private updateGuidance(): void {
    if (this.showIntro()) return;
    const count = this.attachedCount();
    if (count === 0) {
      this.guidance.set(this.poolObjects().length ? 'choose' : 'empty');
    } else if (count === 1) {
      this.guidance.set('another');
    } else if (count >= 3) {
      this.guidance.set('rich');
    }
    if (this.canComplete()) {
      this.showCompletion.set(true);
    }
  }

  private async playIntroSequence(): Promise<void> {
    if (this.introPlayed || sessionStorage.getItem(INTRO_KEY)) {
      this.showIntro.set(false);
      this.scene?.beginCreation();
      this.guidance.set(this.poolObjects().length ? 'choose' : 'empty');
      return;
    }
    this.introPlayed = true;
    const lines = [
      'All those little things you found...',
      '...I think they belong somewhere.',
      'Want to make something with them?'
    ];
    for (let i = 0; i < lines.length; i++) {
      this.introLine.set(i);
      await this.pause(i === 0 ? 2200 : 1800);
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
      const mobile = window.innerWidth < 768;
      this.scene = new OurLittleHeartScene(
        this.canvasHost.nativeElement,
        this.motion.prefersReducedMotion(),
        mobile
      );
      this.scene.setCallbacks({
        onPoolSelect: obj => void this.attachFromPool(obj),
        onAttachedSelect: obj => this.onAttachedTap(obj),
        onPhaseChange: p => this.phase.set(p),
        onPulse: () => this.sounds.play('memory')
      });
      this.scene.init();
      await this.scene.setPoolObjects(this.poolObjects());
      this.scene.syncAttachedObjects(this.experienceState.selectedHeartObjects());
      this.scene.start();
      this.sceneReady.set(true);

      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.inView = entry.isIntersecting;
          this.scene?.setVisible(this.inView && this.visibility.pageVisible());
          if (entry.isIntersecting) {
            this.scenes.setScene('heart');
            void this.camera.focusHeart(1600);
            void this.playIntroSequence();
          }
        },
        { threshold: 0.2 }
      );
      this.observer.observe(this.sectionRef.nativeElement);
    } catch {
      this.sceneFailed.set(true);
    }
  }

  private pause(ms: number): Promise<void> {
    if (this.motion.prefersReducedMotion()) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
