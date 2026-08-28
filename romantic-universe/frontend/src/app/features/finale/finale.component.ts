import {
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  inject,
  input,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionService } from '../../core/services/motion.service';
import { QualityService } from '../../core/services/quality.service';
import { VisibilityService } from '../../core/services/visibility.service';
import { ExperienceControllerService } from '../../core/experience/experience-controller.service';
import { HeartStateService } from '../../core/experience/heart-state.service';
import { SoundDesignService } from '../../core/services/sound-design.service';
import { ChapterVisitDirective } from '../../shared/directives/chapter-visit.directive';
import { HeartShareOfferComponent } from '../../shared/components/heart-share-offer/heart-share-offer.component';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import {
  FinaleScenePhase,
  FinaleTransformationScene
} from './finale-transformation.scene';
import { FinaleBulbHeartRenderer } from './finale-bulb-heart';

gsap.registerPlugin(ScrollTrigger);

type TextPhase =
  | 'idle'
  | 'pre'
  | 'lines'
  | 'message'
  | 'signature'
  | 'fade'
  | 'secret'
  | 'end';

@Component({
  selector: 'app-finale',
  standalone: true,
  imports: [ChapterVisitDirective, HeartShareOfferComponent],
  templateUrl: './finale.component.html',
  styleUrl: './finale.component.scss'
})
export class FinaleComponent implements OnDestroy, AfterViewInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('pinWrap') pinWrapRef!: ElementRef<HTMLElement>;
  @ViewChild('canvasHost') canvasHost!: ElementRef<HTMLElement>;
  @ViewChild('bulbCanvas', { static: true }) bulbCanvasRef!: ElementRef<HTMLCanvasElement>;

  readonly line1 = input('Before you go...');
  readonly line2 = input('I just wanted you to know...');
  readonly line3 = input('You are incredibly special to me.');
  readonly line4 = input('');
  readonly personalLine = input('Something that exists because you were here.');
  readonly finalMessage = input('You mean more to me than words on a screen could ever say — but I tried anyway.');
  readonly footerCredit = input('Made with ❤️, caffeine, Java, and way too many thoughts about you.');
  readonly herName = input('Beautiful');
  readonly myName = input('');

  private readonly motion = inject(MotionService);
  private readonly quality = inject(QualityService);
  private readonly visibility = inject(VisibilityService);
  private readonly heartState = inject(HeartStateService);
  private readonly controller = inject(ExperienceControllerService);
  private readonly sounds = inject(SoundDesignService);
  private readonly scenes = inject(SceneManagerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private scene?: FinaleTransformationScene;
  private bulbHeart?: FinaleBulbHeartRenderer;
  private scrollTriggers: ScrollTrigger[] = [];
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private started = false;
  private bootstrapped = false;
  private destroyed = false;
  private bootstrapRaf = 0;
  private finaleGeneration = 0;
  private readonly timeoutIds = new Set<ReturnType<typeof setTimeout>>();

  readonly sceneReady = signal(false);
  readonly sceneFailed = signal(false);
  readonly textPhase = signal<TextPhase>('idle');
  readonly overlayLine = signal('');
  readonly overlaySub = signal('');
  readonly showMessage = signal(false);
  readonly showSignature = signal(false);
  readonly showSecret = signal(false);
  readonly secretDone = signal(false);
  readonly bulbHeartActive = signal(false);
  readonly bulbHeartIgnite = signal(false);
  readonly bulbHeartGlowing = signal(false);
  readonly heartLinger = signal(false);
  readonly showHeartQuote = signal(false);
  readonly showHeartContinue = signal(false);
  readonly showEpilogue = signal(false);
  readonly showShareOffer = signal(false);
  readonly lineIndex = signal(-1);

  readonly finaleLines = () => [
    this.line1(),
    this.line2(),
    this.line3(),
    this.line4()
  ].filter(Boolean);

  readonly heartFooterText = () => this.footerCredit().trim();
  readonly heartClosingLine = () => this.line4().trim() || this.line3().trim();

  ngAfterViewInit(): void {
    this.waitForContainerAndBootstrap();
    const host = this.canvasHost?.nativeElement;
    if (host) {
      this.resizeObserver = new ResizeObserver(() => this.scene?.resize());
      this.resizeObserver.observe(host);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.finaleGeneration++;
    cancelAnimationFrame(this.bootstrapRaf);
    this.clearAllTimeouts();
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.scrollTriggers.forEach(st => st.kill());
    this.scene?.cancel();
    this.scene?.dispose();
    this.scene = undefined;
    this.bulbHeart?.dispose();
    this.bulbHeart = undefined;
  }

  triggerSecret(): void {
    if (this.destroyed || this.secretDone()) return;
    this.secretDone.set(true);
    this.clearSecretAutoTimeout();
    this.sounds.enable();
    this.sounds.play('finale');

    this.showSecret.set(false);
    this.overlayLine.set('');
    this.overlaySub.set('');
    this.showMessage.set(false);
    this.showSignature.set(false);
    this.textPhase.set('end');
    this.bulbHeartFinished = false;
    this.showHeartQuote.set(this.motion.prefersReducedMotion());
    this.showHeartContinue.set(false);

    this.scene?.stop();
    if (this.canvasHost?.nativeElement) {
      this.canvasHost.nativeElement.style.visibility = 'hidden';
    }

    this.bulbHeart?.dispose();
    this.bulbHeartIgnite.set(true);
    this.bulbHeartGlowing.set(false);
    this.heartLinger.set(false);
    this.bulbHeartActive.set(true);
    this.cdr.detectChanges();

    this.scheduleTimeout(() => this.bulbHeartIgnite.set(false), 1400);

    this.scheduleTimeout(() => {
      if (this.destroyed || !this.bulbHeartActive()) return;
      this.startBulbHeartRenderer(false);
    }, 120);
  }

  private startBulbHeartRenderer(holdOnly: boolean): void {
    if (this.destroyed || !this.bulbHeartActive()) return;

    const canvas = this.bulbCanvasRef?.nativeElement;
    const onHold = (): void => {
      this.bulbHeartGlowing.set(true);
      this.revealHeartQuote();
    };

    if (canvas) {
      this.bulbHeart?.dispose();
      this.bulbHeart = new FinaleBulbHeartRenderer(
        canvas,
        this.motion.prefersReducedMotion(),
        this.motion.isMobile(),
        null,
        undefined,
        onHold
      );
      if (holdOnly) {
        this.bulbHeart.startHoldGlow();
      } else {
        this.bulbHeart.start();
      }
      return;
    }

    this.bulbHeart = FinaleBulbHeartRenderer.mount(
      this.motion.prefersReducedMotion(),
      this.motion.isMobile(),
      undefined,
      onHold
    );
  }

  continueFromHeart(): void {
    this.finishBulbHeart();
  }

  openShareFromEpilogue(): void {
    this.showShareOffer.set(true);
  }

  closeEpilogue(): void {
    this.controller.completeExperience();
    this.showEpilogue.set(false);
    this.showShareOffer.set(false);
    this.enterLingerMoment();
  }

  restartFromBeginning(): void {
    this.bulbHeart?.dispose();
    this.bulbHeart = undefined;
    this.controller.restartFromBeginning();
  }

  private enterLingerMoment(): void {
    if (this.destroyed) return;
    this.heartLinger.set(true);
    this.bulbHeartFinished = false;
    this.showHeartQuote.set(true);
    this.showHeartContinue.set(false);
    this.bulbHeartIgnite.set(true);
    this.bulbHeartGlowing.set(true);
    this.bulbHeartActive.set(true);
    this.cdr.detectChanges();

    this.scheduleTimeout(() => this.bulbHeartIgnite.set(false), 1400);
    this.scheduleTimeout(() => {
      if (this.destroyed || !this.heartLinger()) return;
      this.startBulbHeartRenderer(true);
    }, 120);
  }

  private bulbHeartFinished = false;

  private revealHeartQuote(): void {
    if (this.destroyed) return;
    this.showHeartQuote.set(true);
    if (!this.heartLinger()) {
      this.scheduleTimeout(() => {
        if (this.destroyed || !this.bulbHeartActive()) return;
        this.showHeartContinue.set(true);
        this.cdr.detectChanges();
      }, this.motion.prefersReducedMotion() ? 500 : 1600);
    }
    this.cdr.detectChanges();
  }

  private finishBulbHeart(): void {
    if (this.destroyed || this.bulbHeartFinished) return;

    this.bulbHeartFinished = true;
    this.bulbHeart?.dispose();
    this.bulbHeart = undefined;
    this.bulbHeartActive.set(false);
    this.bulbHeartGlowing.set(false);
    this.heartLinger.set(false);
    this.showHeartQuote.set(false);
    this.showHeartContinue.set(false);
    if (this.canvasHost?.nativeElement) {
      this.canvasHost.nativeElement.style.visibility = '';
    }
    this.controller.showFinaleSecret();
    this.showEpilogue.set(true);
  }

  onShareClosed(): void {
    this.showShareOffer.set(false);
  }

  private waitForContainerAndBootstrap(attempts = 0): void {
    if (this.destroyed) return;
    const host = this.canvasHost?.nativeElement;
    if (!host) return;
    if (host.clientWidth < 20 || host.clientHeight < 20) {
      if (attempts < 60) {
        this.bootstrapRaf = requestAnimationFrame(() =>
          this.waitForContainerAndBootstrap(attempts + 1)
        );
      }
      return;
    }
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    if (this.bootstrapped || this.destroyed) return;
    this.bootstrapped = true;

    try {
      const mobile = this.motion.isMobile();
      this.scene = new FinaleTransformationScene(
        this.canvasHost.nativeElement,
        this.motion.prefersReducedMotion(),
        mobile,
        this.quality.getLevel(),
        this.quality.getParticleBudget()
      );
      this.scene.setCallbacks({
        onPhase: phase => this.onScenePhase(phase),
        onDetachObject: () => {
          if (!this.destroyed) this.sounds.play('star');
        },
        onPulse: () => {
          if (!this.destroyed) this.sounds.play('heart');
        }
      });
      this.scene.init();
      const objects = this.heartState.getValidatedHeartObjects();
      await this.scene.loadExactHeart(objects);
      if (this.destroyed) return;
      this.scene.start();
      this.sceneReady.set(true);
      this.setupScroll();
    } catch {
      if (!this.destroyed) this.sceneFailed.set(true);
    }
  }

  private setupScroll(): void {
    if (!this.sectionRef || this.destroyed) return;
    const mobile = this.motion.isMobile();

    if (!mobile && !this.motion.prefersReducedMotion()) {
      const pin = ScrollTrigger.create({
        trigger: this.sectionRef.nativeElement,
        start: 'top top',
        end: '+=180%',
        pin: this.pinWrapRef.nativeElement,
        anticipatePin: 1
      });
      this.scrollTriggers.push(pin);
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (this.destroyed) return;
        this.scene?.setVisible(entry.isIntersecting && this.visibility.pageVisible());
        if (entry.isIntersecting) {
          this.scenes.setScene('finale');
          if (!this.started && !this.controller.experienceCompleted()) {
            this.started = true;
            void this.beginFinale();
          }
        }
      },
      { threshold: mobile ? 0.15 : 0.2 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private async beginFinale(): Promise<void> {
    const gen = ++this.finaleGeneration;
    this.sounds.enable();
    this.textPhase.set('pre');

    this.overlayLine.set('I wanted to keep this moment.');
    await this.pause(2400, gen);
    if (!this.isFinaleActive(gen)) return;
    this.overlaySub.set('Just for a little longer.');
    await this.pause(2000, gen);
    if (!this.isFinaleActive(gen)) return;
    this.overlayLine.set('');
    this.overlaySub.set('');

    await this.scene?.playTransformation();
  }

  private async onScenePhase(phase: FinaleScenePhase): Promise<void> {
    if (this.destroyed) return;
    if (phase === 'glow') {
      this.sounds.play('memory');
    }
    if (phase === 'spread') {
      this.sounds.play('photo');
    }
    if (phase === 'converge') {
      this.sounds.play('star');
    }
    if (phase === 'complete') {
      await this.playFinalMessages();
    }
  }

  private async playFinalMessages(): Promise<void> {
    const gen = ++this.finaleGeneration;
    this.textPhase.set('lines');
    const lines = this.finaleLines();

    for (let i = 0; i < lines.length; i++) {
      if (!this.isFinaleActive(gen)) return;
      this.lineIndex.set(i);
      this.overlayLine.set(lines[i]);
      await this.pause(2200, gen);
    }
    if (!this.isFinaleActive(gen)) return;
    this.lineIndex.set(-1);
    this.overlayLine.set('');

    this.textPhase.set('message');
    this.showMessage.set(true);
    await this.pause(3200, gen);
    if (!this.isFinaleActive(gen)) return;

    this.textPhase.set('signature');
    this.showSignature.set(true);
    await this.pause(2800, gen);
    if (!this.isFinaleActive(gen)) return;

    this.textPhase.set('fade');
    this.showMessage.set(false);
    this.showSignature.set(false);
    await this.pause(2000, gen);
    if (!this.isFinaleActive(gen)) return;

    this.textPhase.set('secret');
    this.showSecret.set(true);
    this.scheduleSecretAutoTimeout();
  }

  private secretAutoTimeout?: ReturnType<typeof setTimeout>;

  private scheduleSecretAutoTimeout(): void {
    this.clearSecretAutoTimeout();
    this.secretAutoTimeout = this.scheduleTimeout(() => {
      this.secretAutoTimeout = undefined;
      if (!this.secretDone()) {
        this.triggerSecret();
      }
    }, 12000);
  }

  private clearSecretAutoTimeout(): void {
    if (this.secretAutoTimeout) {
      clearTimeout(this.secretAutoTimeout);
      this.timeoutIds.delete(this.secretAutoTimeout);
      this.secretAutoTimeout = undefined;
    }
  }

  private isFinaleActive(gen: number): boolean {
    return !this.destroyed && gen === this.finaleGeneration;
  }

  private scheduleTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    const id = setTimeout(() => {
      this.timeoutIds.delete(id);
      if (this.destroyed) return;
      fn();
    }, ms);
    this.timeoutIds.add(id);
    return id;
  }

  private clearAllTimeouts(): void {
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds.clear();
    this.secretAutoTimeout = undefined;
  }

  private pause(ms: number, gen?: number): Promise<void> {
    if (this.motion.prefersReducedMotion()) return Promise.resolve();
    if (gen !== undefined && !this.isFinaleActive(gen)) return Promise.resolve();
    return new Promise(resolve => {
      this.scheduleTimeout(() => {
        resolve();
      }, ms);
    });
  }
}
