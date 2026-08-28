import {
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  inject,
  input,
  signal
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

  readonly line1 = input('Before you go...');
  readonly line2 = input('I just wanted you to know...');
  readonly line3 = input('You are incredibly special to me.');
  readonly line4 = input('');
  readonly personalLine = input('Something that exists because you were here.');
  readonly finalMessage = input('You mean more to me than words on a screen could ever say — but I tried anyway.');
  readonly footerCredit = input('');
  readonly herName = input('Beautiful');
  readonly myName = input('');

  private readonly motion = inject(MotionService);
  private readonly quality = inject(QualityService);
  private readonly visibility = inject(VisibilityService);
  private readonly heartState = inject(HeartStateService);
  private readonly controller = inject(ExperienceControllerService);
  private readonly sounds = inject(SoundDesignService);
  private readonly scenes = inject(SceneManagerService);

  private scene?: FinaleTransformationScene;
  private scrollTriggers: ScrollTrigger[] = [];
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private started = false;
  private bootstrapped = false;
  private secretTimeout?: ReturnType<typeof setTimeout>;

  readonly sceneReady = signal(false);
  readonly sceneFailed = signal(false);
  readonly textPhase = signal<TextPhase>('idle');
  readonly overlayLine = signal('');
  readonly overlaySub = signal('');
  readonly showMessage = signal(false);
  readonly showSignature = signal(false);
  readonly showSecret = signal(false);
  readonly secretDone = signal(false);
  readonly showEndHeart = signal(false);
  readonly showShareOffer = signal(false);
  readonly lineIndex = signal(-1);

  readonly finaleLines = () => [
    this.line1(),
    this.line2(),
    this.line3(),
    this.line4()
  ].filter(Boolean);

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
    this.scrollTriggers.forEach(st => st.kill());
    if (this.secretTimeout) clearTimeout(this.secretTimeout);
    this.scene?.dispose();
  }

  triggerSecret(): void {
    if (this.secretDone()) return;
    this.secretDone.set(true);
    this.sounds.enable();
    this.sounds.play('finale');
    this.scene?.triggerSecretExplosion();
    this.showEndHeart.set(true);

    setTimeout(() => {
      this.textPhase.set('end');
      this.showSecret.set(false);
      this.showEndHeart.set(false);
      this.controller.showFinaleSecret();
      this.showShareOffer.set(true);
    }, 4500);
  }

  onShareClosed(): void {
    this.showShareOffer.set(false);
    this.controller.completeExperience();
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
      const mobile = this.motion.isMobile();
      const particleScale = this.quality.particleMultiplier();
      this.scene = new FinaleTransformationScene(
        this.canvasHost.nativeElement,
        this.motion.prefersReducedMotion(),
        mobile,
        particleScale
      );
      this.scene.setCallbacks({
        onPhase: phase => this.onScenePhase(phase),
        onDetachObject: () => this.sounds.play('star'),
        onPulse: () => this.sounds.play('heart')
      });
      this.scene.init();
      const objects = this.heartState.getValidatedHeartObjects();
      await this.scene.loadExactHeart(objects);
      this.scene.start();
      this.sceneReady.set(true);
      this.setupScroll();
    } catch {
      this.sceneFailed.set(true);
    }
  }

  private setupScroll(): void {
    if (!this.sectionRef) return;
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
    this.sounds.enable();
    this.textPhase.set('pre');

    this.overlayLine.set('I wanted to keep this moment.');
    await this.pause(2400);
    this.overlaySub.set('Just for a little longer.');
    await this.pause(2000);
    this.overlayLine.set('');
    this.overlaySub.set('');

    await this.scene?.playTransformation();
  }

  private async onScenePhase(phase: FinaleScenePhase): Promise<void> {
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
    this.textPhase.set('lines');
    const lines = this.finaleLines();

    for (let i = 0; i < lines.length; i++) {
      this.lineIndex.set(i);
      this.overlayLine.set(lines[i]);
      await this.pause(2200);
    }
    this.lineIndex.set(-1);
    this.overlayLine.set('');

    this.textPhase.set('message');
    this.showMessage.set(true);
    await this.pause(3200);

    this.textPhase.set('signature');
    this.showSignature.set(true);
    await this.pause(2800);

    this.textPhase.set('fade');
    this.showMessage.set(false);
    this.showSignature.set(false);
    await this.pause(2000);

    this.textPhase.set('secret');
    this.showSecret.set(true);
    this.secretTimeout = setTimeout(() => {
      if (!this.secretDone()) {
        this.triggerSecret();
      }
    }, 12000);
  }

  private pause(ms: number): Promise<void> {
    if (this.motion.prefersReducedMotion()) return Promise.resolve();
    return new Promise(r => setTimeout(r, ms));
  }
}
