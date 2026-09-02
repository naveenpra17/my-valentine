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
  NgZone,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../../core/services/motion.service';
import { VisibilityService } from '../../core/services/visibility.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { MusicalChoreographyService } from '../../core/audio/musical-choreography.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { ExperienceFlowService } from '../../core/experience/experience-flow.service';
import { ExperienceNavigationService } from '../../core/experience/experience-navigation.service';
import { HeartStateService } from '../../core/experience/heart-state.service';
import { HeartShareService } from '../../core/services/heart-share.service';
import { prioritizePool } from '../../core/experience/heart-asset.mapper';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { CameraDirectorService } from '../../core/cinematic/camera-director.service';
import { HeartObject } from '../../core/experience/experience-state.types';
import { HeartScenePhase, OurLittleHeartScene } from './our-little-heart-scene';
import { objectKey } from './heart-object-meshes';
import { SiteStorageService } from '../../core/site/site-storage.service';

const INTRO_KEY = 'ru_heart_intro_seen';
const FIRST_ATTACH_KEY = 'ru_heart_first_attach';
const HEART_COMPLETE_KEY = 'ru_heart_complete_seen';

type GuidanceKey =
  | 'intro'
  | 'choose'
  | 'first'
  | 'another'
  | 'variety'
  | 'find-more'
  | 'rich'
  | 'done'
  | 'empty';

@Component({
  selector: 'app-our-little-heart',
  standalone: true,
  imports: [],
  templateUrl: './our-little-heart.component.html',
  styleUrl: './our-little-heart.component.scss'
})
export class OurLittleHeartComponent implements OnDestroy, AfterViewInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('canvasHost') canvasHost!: ElementRef<HTMLElement>;
  @ViewChild('introEl') introRef?: ElementRef<HTMLElement>;
  @ViewChild('guidanceEl') guidanceRef?: ElementRef<HTMLElement>;
  @ViewChild('completeEl') completeRef?: ElementRef<HTMLElement>;

  readonly title = input('Our Little Heart');
  readonly subtitle = input('Choose something for our heart.');

  private readonly motion = inject(MotionService);
  private readonly visibility = inject(VisibilityService);
  private readonly sounds = inject(SoundDesignService);
  private readonly music = inject(MusicalChoreographyService);
  readonly experienceState = inject(ExperienceStateService);
  private readonly experienceFlow = inject(ExperienceFlowService);
  private readonly navigation = inject(ExperienceNavigationService);
  private readonly heartState = inject(HeartStateService);
  private readonly heartShare = inject(HeartShareService);
  private readonly scenes = inject(SceneManagerService);
  private readonly camera = inject(CameraDirectorService);
  private readonly ngZone = inject(NgZone);
  private readonly siteStorage = inject(SiteStorageService);

  private scene?: OurLittleHeartScene;
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private inView = false;
  private bootstrapped = false;
  private attaching = false;
  private introPlayed = false;
  private sectionEngaged = false;
  private guidanceLocked = false;
  private completionTimer?: ReturnType<typeof setTimeout>;

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
      case 'variety': return 'Mix different kinds of treasures.';
      case 'find-more': return "There's room for another.";
      case 'rich': return "Look what you've made.";
      case 'done': return 'Look at our little heart.';
      case 'empty': return "Let's find some things to put in here.";
      default: return '';
    }
  });

  readonly guidanceHint = computed(() => {
    switch (this.guidance()) {
      case 'choose':
        return 'Each little light is something you found.';
      case 'first':
        return 'The heart is starting to take shape.';
      case 'another':
        return 'Tap another little light floating around the heart.';
      case 'variety':
        return 'Try adding a memory, reason, or quote — not just photos.';
      case 'find-more':
        return 'Scroll up to discover more, then come back here.';
      default:
        return '';
    }
  });

  readonly showGuidanceHint = computed(() => {
    const key = this.guidance();
    return key === 'choose' || key === 'first' || key === 'another' || key === 'variety' || key === 'find-more';
  });

  constructor() {
    effect(() => {
      const attached = this.experienceState.selectedHeartObjects();
      this.scene?.syncAttachedObjects(attached);
    });

    effect(() => {
      const pool = this.poolObjects();
      void this.scene?.setPoolObjects(pool);
    });

    effect(() => {
      this.attachedCount();
      if (!this.showIntro() && !this.guidanceLocked && !this.attaching) {
        this.updateGuidance();
      }
    });

    effect(() => {
      const key = this.guidance();
      const poolActive = key === 'another' || key === 'choose' || key === 'find-more';
      this.scene?.setPoolHighlight(poolActive);
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
    if (this.completionTimer) clearTimeout(this.completionTimer);
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.scene?.dispose();
  }

  beginHeart(): void {
    this.experienceState.setHeartDiscoveryHunt(false);
    void this.refreshHeartPoolFromDiscoveries();
    this.showIntro.set(false);
    this.scene?.setVisible(true);
    this.scene?.beginCreation();
    this.phase.set(this.motion.prefersReducedMotion() ? 'creating' : 'entering');
    this.guidance.set(this.poolObjects().length ? 'choose' : 'empty');
    this.sounds.enable();
    this.siteStorage.setItem(sessionStorage, INTRO_KEY, '1');

    if (!this.motion.prefersReducedMotion() && this.introRef?.nativeElement) {
      gsap.to(this.introRef.nativeElement, {
        opacity: 0,
        y: -12,
        duration: 0.6,
        ease: 'power2.in'
      });
    }
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
      this.heartShare.clearPreviewCache();
      this.music.onHeartAttach(obj.type);

      const isFirst = !this.siteStorage.getItem(sessionStorage, FIRST_ATTACH_KEY);
      if (isFirst) {
        this.siteStorage.setItem(sessionStorage, FIRST_ATTACH_KEY, '1');
        this.guidanceLocked = true;
        this.guidance.set('first');
        this.scene?.setPoolHighlight(true);
        await this.pause(1800);
        this.guidanceLocked = false;
      }
      this.updateGuidance();
      this.animateGuidanceChange();
      if (this.canComplete()) {
        this.scheduleCompletion();
      }
    } finally {
      this.attaching = false;
    }
  }

  async removeSelected(): Promise<void> {
    const obj = this.selectedObject();
    if (!obj || this.attaching) return;

    this.cancelScheduledCompletion();
    this.attaching = true;
    this.experienceState.removeHeartObject(obj.type, obj.referenceId);
    this.heartShare.clearPreviewCache();
    const poolIndex = this.poolObjects().length;
    await this.scene?.flyDetach(obj, poolIndex, poolIndex + 1);
    this.selectedObject.set(null);
    this.scene?.clearAttachedFocus();
    this.updateGuidance();
    this.animateGuidanceChange();
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
    if (this.phase() === 'complete' || this.showCompletion()) return;
    this.scene?.setPoolHighlight(false);
    this.guidance.set('done');
    this.scene?.completeCreation();
    this.music.onHeartComplete();
    this.siteStorage.setItem(sessionStorage, HEART_COMPLETE_KEY, '1');
    this.showCompletion.set(true);
    this.animateCompletionEnter();
  }

  continueJourney(): void {
    if (this.phase() !== 'complete') {
      this.finishHeart();
    }

    this.sounds.enable();
    void this.dismissCompletionAndScroll();
  }

  private async dismissCompletionAndScroll(): Promise<void> {
    const el = this.completeRef?.nativeElement;
    if (el && !this.motion.prefersReducedMotion()) {
      await gsap.to(el, { opacity: 0, y: 8, duration: 0.45, ease: 'power2.in' }).then();
    }
    this.showCompletion.set(false);

    if (!this.navigation.scrollToNextBeat(this.sectionRef.nativeElement)) {
      this.navigation.scrollTo('#open-when') || this.navigation.scrollTo('#flower');
    }
  }

  goFindDiscoveries(): void {
    this.experienceState.setHeartDiscoveryHunt(true);
    this.experienceState.syncHeartPoolFromDiscoveries();
    void this.experienceFlow.enrichHeartPool();

    if (!this.navigation.scrollToDiscovery()) {
      window.scrollTo({ top: 0, behavior: this.motion.prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  returnFromDiscoveryHunt(): void {
    this.experienceState.setHeartDiscoveryHunt(false);
    this.navigation.scrollToHeart();
  }

  skipIntro(): void {
    this.siteStorage.setItem(sessionStorage, INTRO_KEY, '1');
    this.beginHeart();
  }

  private async refreshHeartPoolFromDiscoveries(): Promise<void> {
    this.experienceState.syncHeartPoolFromDiscoveries();
    await this.experienceFlow.enrichHeartPool();
    await this.scene?.setPoolObjects(this.poolObjects());
    if (!this.showIntro()) {
      this.updateGuidance();
      this.animateGuidanceChange();
    }
  }

  private updateGuidance(): void {
    if (this.showIntro() || this.guidanceLocked || this.attaching) return;

    const count = this.attachedCount();
    const poolLen = this.poolObjects().length;
    const selected = this.experienceState.selectedHeartObjects();
    const hasPhoto = selected.some(o => o.type === 'photo');
    const hasOther = selected.some(o => o.type !== 'photo');

    if (count === 0) {
      this.guidance.set(poolLen ? 'choose' : 'empty');
    } else if (count === 1) {
      this.guidance.set(poolLen ? 'another' : 'find-more');
    } else if (count === 2 && !(hasPhoto && hasOther)) {
      this.guidance.set(poolLen ? 'variety' : 'find-more');
    } else if (count >= 3) {
      this.guidance.set('rich');
    }

  }

  private scheduleCompletion(): void {
    if (this.completionTimer) return;
    this.guidanceLocked = true;
    this.completionTimer = setTimeout(() => {
      this.completionTimer = undefined;
      this.guidanceLocked = false;
      this.finishHeart();
    }, this.motion.prefersReducedMotion() ? 400 : 1400);
  }

  private cancelScheduledCompletion(): void {
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = undefined;
    }
    this.guidanceLocked = false;
  }

  private animateGuidanceChange(): void {
    const el = this.guidanceRef?.nativeElement;
    if (!el || this.motion.prefersReducedMotion()) return;
    gsap.fromTo(el, { opacity: 0.35, y: 6 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
  }

  private animateCompletionEnter(): void {
    const el = this.completeRef?.nativeElement;
    if (!el || this.motion.prefersReducedMotion()) return;
    gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' });
  }

  private restoreCompletedHeartIfNeeded(): void {
    if (!this.canComplete() || !this.siteStorage.getItem(sessionStorage, HEART_COMPLETE_KEY)) return;
    this.showIntro.set(false);
    this.scene?.setVisible(true);
    this.scene?.completeCreation();
    this.phase.set('complete');
    this.guidance.set('done');
  }

  private async playIntroSequence(): Promise<void> {
    if (this.introPlayed || this.siteStorage.getItem(sessionStorage, INTRO_KEY)) {
      this.showIntro.set(false);
      this.scene?.setVisible(true);
      this.scene?.beginCreation();
      this.phase.set(this.motion.prefersReducedMotion() ? 'creating' : 'entering');
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
        onPhaseChange: p => this.ngZone.run(() => this.phase.set(p)),
        onPulse: () => this.sounds.play('memory')
      });
      this.scene.init();
      await this.scene.setPoolObjects(this.poolObjects());
      this.scene.syncAttachedObjects(this.experienceState.selectedHeartObjects());
      this.restoreCompletedHeartIfNeeded();
      this.scene.start();
      this.sceneReady.set(true);

      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.inView = entry.isIntersecting;
          this.scene?.setVisible(this.inView && this.visibility.pageVisible());
          if (!entry.isIntersecting) return;

          this.scenes.setScene('heart');
          this.experienceState.setHeartDiscoveryHunt(false);
          void this.refreshHeartPoolFromDiscoveries();

          if (!this.sectionEngaged) {
            this.sectionEngaged = true;
            this.music.enterHeart();
            void this.camera.focusHeart(1600);
            void this.playIntroSequence();
          }
        },
        { threshold: 0.28, rootMargin: '0px 0px -12% 0px' }
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
