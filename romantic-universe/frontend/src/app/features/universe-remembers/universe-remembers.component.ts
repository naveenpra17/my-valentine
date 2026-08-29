import {
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import { MotionService } from '../../core/services/motion.service';
import { VisibilityService } from '../../core/services/visibility.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { MusicalChoreographyService } from '../../core/audio/musical-choreography.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { HeartStateService } from '../../core/experience/heart-state.service';
import { JourneyReplayService, JourneyReplayEvent } from '../../core/experience/journey-replay.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { ChapterVisitDirective } from '../../shared/directives/chapter-visit.directive';
import { HeartObject } from '../../core/experience/experience-state.types';
import { OurLittleHeartScene } from '../our-little-heart/our-little-heart-scene';
import { objectKey } from '../our-little-heart/heart-object-meshes';

type RemembersPhase =
  | 'idle'
  | 'intro'
  | 'journey'
  | 'heart-intro'
  | 'reconstruct'
  | 'complete';

@Component({
  selector: 'app-universe-remembers',
  standalone: true,
  imports: [ChapterVisitDirective],
  templateUrl: './universe-remembers.component.html',
  styleUrl: './universe-remembers.component.scss'
})
export class UniverseRemembersComponent implements OnDestroy, AfterViewInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('canvasHost') canvasHost!: ElementRef<HTMLElement>;

  readonly intro = input('You\'ve been here for a while.');
  readonly reveal = input('Look what you created.');

  private readonly motion = inject(MotionService);
  private readonly visibility = inject(VisibilityService);
  private readonly sounds = inject(SoundDesignService);
  private readonly music = inject(MusicalChoreographyService);
  readonly experienceState = inject(ExperienceStateService);
  private readonly heartState = inject(HeartStateService);
  private readonly journey = inject(JourneyReplayService);
  private readonly scenes = inject(SceneManagerService);

  private scene?: OurLittleHeartScene;
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private started = false;
  private bootstrapped = false;

  readonly phase = signal<RemembersPhase>('idle');
  readonly sceneReady = signal(false);
  readonly sceneFailed = signal(false);
  readonly overlayLine = signal('');
  readonly overlaySubtitle = signal('');
  readonly showTitle = signal(false);
  readonly selectedObject = signal<HeartObject | null>(null);
  readonly introLineIndex = signal(-1);

  readonly journeyEvents = computed(() => this.journey.buildTimeline());
  readonly heartObjects = computed(() => this.heartState.getValidatedHeartObjects());
  readonly hasHeart = computed(() => this.heartObjects().length > 0);
  readonly hasJourney = computed(() => this.journey.hasJourney());

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

  dismissDetail(): void {
    this.selectedObject.set(null);
    this.scene?.clearAttachedFocus();
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
        mobile,
        'reconstruct'
      );
      this.scene.setCallbacks({
        onAttachedSelect: obj => this.onObjectInspect(obj),
        onReconstructItem: (obj) => {
          this.music.onHeartObjectRemembered(obj.type);
        },
        onReconstructComplete: () => {
          this.music.onReconstructionComplete();
          void this.playFinaleLines();
        },
        onPulse: () => this.sounds.play('star')
      });
      this.scene.init();
      this.scene.start();
      this.sceneReady.set(true);

      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.scene?.setVisible(entry.isIntersecting && this.visibility.pageVisible());
          if (entry.isIntersecting) {
            this.scenes.setScene('remembers');
            this.experienceState.setChapter(11);
            if (!this.started) {
              this.started = true;
              void this.playExperience();
            }
          }
        },
        { threshold: 0.2 }
      );
      this.observer.observe(this.sectionRef.nativeElement);
    } catch {
      this.sceneFailed.set(true);
    }
  }

  private async playExperience(): Promise<void> {
    this.sounds.enable();
    this.music.enterRemembers();
    this.phase.set('intro');
    await this.playIntroSequence();
    await this.playJourneyReplay();
    await this.playHeartSequence();
  }

  private async playIntroSequence(): Promise<void> {
    const lines = [
      this.intro(),
      'You found quite a few things.',
      'And somehow...',
      '...you left a little bit of yourself behind.'
    ];

    for (let i = 0; i < lines.length; i++) {
      this.introLineIndex.set(i);
      this.overlayLine.set(lines[i]);
      this.overlaySubtitle.set('');
      await this.pause(i === 0 ? 2600 : 2200);
    }
    this.introLineIndex.set(-1);
    this.overlayLine.set('');
  }

  private async playJourneyReplay(): Promise<void> {
    const events = this.journeyEvents();
    if (events.length === 0) {
      this.overlayLine.set('Even the little things matter.');
      await this.pause(2200);
      this.overlayLine.set('');
      return;
    }

    this.phase.set('journey');
    const total = events.length;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      await this.playJourneyEvent(event, i, total);
    }

    this.overlayLine.set('');
    this.overlaySubtitle.set('');
    await this.pause(1200);
  }

  private async playJourneyEvent(
    event: JourneyReplayEvent,
    index: number,
    total: number
  ): Promise<void> {
    this.scene?.addJourneyMarker(index, total);
    this.scene?.highlightJourneyMarker(index);

    if (event.kind === 'reason' || event.kind === 'quote') {
      this.overlayLine.set(event.label ?? '');
      this.overlaySubtitle.set('');
    } else {
      this.overlayLine.set(event.subtitle ?? '');
      this.overlaySubtitle.set(event.label ?? '');
    }

    this.sounds.play('star');
    await this.pause(this.motion.prefersReducedMotion() ? 1100 : 2000);
    this.overlayLine.set('');
    this.overlaySubtitle.set('');
    await this.pause(600);
  }

  private async playHeartSequence(): Promise<void> {
    const objects = this.heartObjects();

    this.phase.set('heart-intro');
    this.overlayLine.set('You found all these little things...');
    await this.pause(2600);
    this.overlayLine.set('...and then you made this.');
    await this.pause(2400);
    this.overlayLine.set('');
    this.showTitle.set(true);

    this.scene?.revealHeartForReconstruction();
    await this.pause(1000);

    this.phase.set('reconstruct');

    if (objects.length === 0) {
      this.scene?.prepareReconstruction();
      this.overlayLine.set('Even the little things matter.');
      await this.pause(2400);
      this.overlayLine.set('');
      this.phase.set('complete');
      this.scene?.setReadOnly(true);
      return;
    }

    await this.scene?.reconstructSequential(objects);
  }

  private async playFinaleLines(): Promise<void> {
    this.phase.set('complete');
    const lines = [
      'Every little thing you found...',
      'Every memory.',
      'Every little secret.',
      'And every piece you chose...',
      '...became this.'
    ];

    for (const line of lines) {
      this.overlayLine.set(line);
      await this.pause(2400);
    }
    this.overlayLine.set('');
    this.showTitle.set(true);
  }

  private onObjectInspect(obj: HeartObject): void {
    this.selectedObject.set(obj);
    this.scene?.focusAttached(objectKey(obj));
    this.sounds.enable();
    this.sounds.play('star');
  }

  private pause(ms: number): Promise<void> {
    if (this.motion.prefersReducedMotion()) {
      return Promise.resolve();
    }
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
