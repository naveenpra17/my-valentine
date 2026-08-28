import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { ExperienceEngineService } from '../../core/cinematic/experience-engine.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { ExperienceStateService } from '../../core/experience/experience-state.service';
import { ConfigService } from '../../core/services/config.service';
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
import { QuoteConstellationComponent } from '../quote-constellation/quote-constellation.component';
import { FlowerSurpriseComponent } from '../flower-surprise/flower-surprise.component';
import { SecretHeartComponent } from '../secret-heart/secret-heart.component';
import { HiddenStarComponent } from '../hidden-star/hidden-star.component';
import { VoidWhisperComponent } from '../void-whisper/void-whisper.component';
import { LetterComponent } from '../letter/letter.component';
import { FinaleComponent } from '../finale/finale.component';
import { OurLittleHeartComponent } from '../our-little-heart/our-little-heart.component';
import { UniverseRemembersComponent } from '../universe-remembers/universe-remembers.component';
import { ChapterProgressComponent } from '../../shared/components/chapter-progress/chapter-progress.component';
import { MemoryConstellationTrackerComponent } from '../../shared/components/memory-constellation-tracker/memory-constellation-tracker.component';

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
    QuoteConstellationComponent,
    FlowerSurpriseComponent,
    SecretHeartComponent,
    HiddenStarComponent,
    VoidWhisperComponent,
    LetterComponent,
    FinaleComponent,
    OurLittleHeartComponent,
    UniverseRemembersComponent,
    ChapterProgressComponent,
    MemoryConstellationTrackerComponent
  ],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperienceComponent implements OnDestroy {
  @ViewChild(OpeningComponent) opening?: OpeningComponent;
  @ViewChild('mainContent') mainRef?: ElementRef<HTMLElement>;
  @ViewChild('openingHost') openingHost?: ElementRef<HTMLElement>;

  readonly config = inject(ConfigService);
  private readonly session = inject(SessionService);
  private readonly engine = inject(ExperienceEngineService);
  private readonly experienceState = inject(ExperienceStateService);
  private readonly easterEggs = inject(EasterEggService);
  readonly scenes = inject(SceneManagerService);

  readonly showMain = signal(this.session.hasEntered());
  readonly burstActive = signal(false);
  readonly transitioning = signal(false);
  readonly loadProgress = signal(0);

  readonly showEntryLock = computed(() => {
    const cfg = this.config.config();
    return !!cfg?.entryLockEnabled && !this.session.isUnlocked();
  });

  readonly showOpening = computed(() => {
    return !this.showEntryLock() && !this.showMain() && !this.config.loading() && !this.config.error();
  });

  constructor() {
    if (!this.session.hasEntered()) {
      this.scenes.setScene('opening');
    } else {
      this.scenes.setScene('universe');
    }

    this.easterEggs.initHiddenWorld();
  }

  ngOnDestroy(): void {
    this.easterEggs.destroyHiddenWorld();
  }

  async onOpeningEnter(): Promise<void> {
    if (this.transitioning()) return;
    this.transitioning.set(true);
    this.burstActive.set(true);

    await this.opening?.fadeOut();
    await this.engine.fadeToBlack();

    this.session.markEntered();
    this.experienceState.setChapter(1);
    this.showMain.set(true);
    this.burstActive.set(false);
    this.transitioning.set(false);
    this.scenes.setScene('universe');
  }

  onUnlocked(): void {
    // Entry lock cleared — opening will show via computed
  }

  retry(): void {
    void this.config.load();
  }
}
