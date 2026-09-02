import {

  ChangeDetectionStrategy,

  Component,

  ElementRef,

  OnDestroy,

  AfterViewInit,

  ViewChild,

  computed,

  effect,

  inject,

  signal

} from '@angular/core';

import gsap from 'gsap';
import { ExperienceEngineService } from '../../core/cinematic/experience-engine.service';
import { ScrollProgressService } from '../../core/cinematic/scroll-progress.service';
import { MotionService } from '../../core/services/motion.service';

import { SceneManagerService } from '../../core/cinematic/scene-manager.service';

import { ExperienceControllerService } from '../../core/experience/experience-controller.service';
import { MusicalChoreographyService } from '../../core/audio/musical-choreography.service';

import { ExperienceStateService } from '../../core/experience/experience-state.service';

import { ConfigService } from '../../core/services/config.service';
import { SiteContextService } from '../../core/site/site-context.service';

import { EasterEggService } from '../../core/services/easter-egg.service';

import { SessionService } from '../../core/services/session.service';

import { EntryLockComponent } from '../entry-lock/entry-lock.component';

import { OpeningComponent } from '../opening/opening.component';

import { LoveUniverseComponent } from '../love-universe/love-universe.component';

import { HeroComponent } from '../hero/hero.component';

import { MusicPlayerComponent } from '../music-player/music-player.component';

import { ParticleBurstComponent } from '../../shared/components/particle-burst/particle-burst.component';

import { MemoryTimelineComponent } from '../memory-timeline/memory-timeline.component';

import { ReasonsComponent } from '../reasons/reasons.component';

import { LoveBombComponent } from '../love-bomb/love-bomb.component';

import { OpenWhenComponent } from '../open-when/open-when.component';

import { PhotoGalleryComponent } from '../photo-gallery/photo-gallery.component';

import { FlowerSurpriseComponent } from '../flower-surprise/flower-surprise.component';

import { SecretHeartComponent } from '../secret-heart/secret-heart.component';

import { HiddenStarComponent } from '../hidden-star/hidden-star.component';

import { VoidWhisperComponent } from '../void-whisper/void-whisper.component';

import { LetterComponent } from '../letter/letter.component';

import { FinaleComponent } from '../finale/finale.component';

import { OurLittleHeartComponent } from '../our-little-heart/our-little-heart.component';

import { UniverseRemembersComponent } from '../universe-remembers/universe-remembers.component';

import { ConstellationCeremonyComponent } from '../constellation-ceremony/constellation-ceremony.component';

import { QuoteConstellationComponent } from '../quote-constellation/quote-constellation.component';

import { ChapterVisitDirective } from '../../shared/directives/chapter-visit.directive';

import { DiscoverySceneComponent } from '../../shared/components/discovery-scene/discovery-scene.component';



@Component({

  selector: 'app-experience',

  standalone: true,

  imports: [

    EntryLockComponent,

    OpeningComponent,

    LoveUniverseComponent,

    HeroComponent,

    MusicPlayerComponent,

    ParticleBurstComponent,

    MemoryTimelineComponent,

    ReasonsComponent,

    LoveBombComponent,

    OpenWhenComponent,

    PhotoGalleryComponent,

    FlowerSurpriseComponent,

    SecretHeartComponent,

    HiddenStarComponent,

    VoidWhisperComponent,

    LetterComponent,

    FinaleComponent,

    OurLittleHeartComponent,

    UniverseRemembersComponent,

    ConstellationCeremonyComponent,

    QuoteConstellationComponent,

    ChapterVisitDirective,

    DiscoverySceneComponent

  ],

  templateUrl: './experience.component.html',

  styleUrl: './experience.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush

})

export class ExperienceComponent implements OnDestroy, AfterViewInit {

  @ViewChild(OpeningComponent) opening?: OpeningComponent;

  @ViewChild('mainContent') mainRef?: ElementRef<HTMLElement>;

  @ViewChild('shellRef') shellRef?: ElementRef<HTMLElement>;

  @ViewChild('openingHost') openingHost?: ElementRef<HTMLElement>;



  readonly config = inject(ConfigService);
  private readonly siteContext = inject(SiteContextService);

  private readonly session = inject(SessionService);

  private readonly engine = inject(ExperienceEngineService);

  private readonly scrollProgress = inject(ScrollProgressService);

  private readonly motion = inject(MotionService);

  readonly controller = inject(ExperienceControllerService);

  readonly experienceState = inject(ExperienceStateService);

  private readonly easterEggs = inject(EasterEggService);

  readonly scenes = inject(SceneManagerService);

  private readonly music = inject(MusicalChoreographyService);



  readonly showMain = signal(false);

  readonly burstActive = signal(false);

  readonly transitioning = signal(false);

  readonly reasonsIntroLine2 = computed(() => {
    const value = this.config.get('REASONS_INTRO_2').trim();
    return value || "The little things you probably don't even notice.";
  });



  readonly showEntryLock = computed(() => {
    const cfg = this.config.config();
    return !!cfg?.entryLockEnabled && !this.session.unlocked();
  });



  readonly showOpening = computed(() => {

    return !this.showEntryLock() && !this.showMain() && !this.config.loading() && !this.config.error();

  });



  constructor() {
    this.session.initializeForSite();
    this.experienceState.initializeForSite();
    this.controller.initializeForSite();
    this.showMain.set(this.session.entered());

    if (!this.session.hasEntered()) {

      this.scenes.setScene('opening');

    } else {

      this.scenes.setScene('universe');

      this.controller.restoreForReturningVisitor();

    }



    this.easterEggs.initHiddenWorld();

    effect(() => {
      if (this.showMain()) {
        queueMicrotask(() => this.attachScrollTracking());
      }
    });

    effect(() => {
      if (this.config.loading() || this.config.error()) return;
      const url = this.config.get('MUSIC_URL');
      if (url) this.music.setBackgroundUrl(url);
    });

  }



  ngAfterViewInit(): void {

    if (this.showMain()) {
      const shell = this.shellRef?.nativeElement;
      if (shell) {
        gsap.set(shell, { opacity: 1 });
      }
      this.attachScrollTracking();
    }

  }



  ngOnDestroy(): void {

    this.scrollProgress.detach();
    this.easterEggs.destroyHiddenWorld();

  }



  private attachScrollTracking(): void {

    const main = this.mainRef?.nativeElement;
    if (main) {
      this.scrollProgress.attach(main);
    }

  }



  async onOpeningEnter(): Promise<void> {

    if (this.transitioning()) return;

    this.music.onFirstInteraction();

    this.transitioning.set(true);

    this.burstActive.set(true);



    await this.opening?.fadeOut();

    await this.engine.fadeToBlack();



    this.session.markEntered();

    this.controller.startExperience();

    this.experienceState.setChapter(1);

    this.showMain.set(true);

    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    this.attachScrollTracking();

    const shell = this.shellRef?.nativeElement;
    if (shell) {
      if (this.motion.prefersReducedMotion()) {
        gsap.set(shell, { opacity: 1 });
      } else {
        gsap.fromTo(shell, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power2.out' });
      }
    }

    this.burstActive.set(false);

    this.transitioning.set(false);

    this.scenes.setScene('universe');

    this.music.enterUniverse();

  }



  onUnlocked(): void {

    // Entry lock cleared — opening will show via computed

  }



  retry(): void {
    const slug = this.siteContext.slug();
    if (slug) {
      void this.config.load();
    }
  }

}


