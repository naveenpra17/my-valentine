import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { ConfigService } from '../../core/services/config.service';
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
import { FinaleComponent } from '../finale/finale.component';

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
    FinaleComponent
  ],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperienceComponent {
  @ViewChild(OpeningComponent) opening?: OpeningComponent;

  readonly config = inject(ConfigService);
  private readonly session = inject(SessionService);

  readonly showMain = signal(this.session.hasEntered());
  readonly burstActive = signal(false);
  readonly transitioning = signal(false);

  readonly showEntryLock = computed(() => {
    const cfg = this.config.config();
    return !!cfg?.entryLockEnabled && !this.session.isUnlocked();
  });

  readonly showOpening = computed(() => {
    return !this.showEntryLock() && !this.showMain() && !this.config.loading() && !this.config.error();
  });

  async onOpeningEnter(): Promise<void> {
    if (this.transitioning()) return;
    this.transitioning.set(true);
    this.burstActive.set(true);

    await this.opening?.fadeOut();

    this.session.markEntered();
    this.showMain.set(true);
    this.burstActive.set(false);
    this.transitioning.set(false);
  }

  onUnlocked(): void {
    // Entry lock cleared — opening will show via computed
  }

  retry(): void {
    void this.config.load();
  }
}
