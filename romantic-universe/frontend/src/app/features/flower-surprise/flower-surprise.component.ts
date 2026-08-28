import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../../core/services/motion.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';

@Component({
  selector: 'app-flower-surprise',
  standalone: true,
  templateUrl: './flower-surprise.component.html',
  styleUrl: './flower-surprise.component.scss'
})
export class FlowerSurpriseComponent implements OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('seed') seedRef!: ElementRef<HTMLElement>;
  @ViewChild('stem') stemRef!: ElementRef<HTMLElement>;
  @ViewChild('leaves') leavesRef!: ElementRef<HTMLElement>;
  @ViewChild('bloom') bloomRef!: ElementRef<HTMLElement>;
  @ViewChild('messageEl') messageElRef?: ElementRef<HTMLElement>;
  @ViewChild('glow') glowRef?: ElementRef<HTMLElement>;

  readonly title = input('A Little Surprise');
  readonly subtitle = input('Something is waiting to grow');
  readonly flowerMessage = input('Every day with you feels like spring arrived early.');

  private readonly motion = inject(MotionService);
  private readonly scenes = inject(SceneManagerService);
  private observer?: IntersectionObserver;
  private bloomTimeline?: gsap.core.Timeline;

  readonly phase = signal<'seed' | 'growing' | 'bloomed'>('seed');
  readonly showMessage = signal(false);

  constructor() {
    afterNextRender(() => this.initSceneObserver());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.bloomTimeline?.kill();
  }

  plantSeed(): void {
    if (this.phase() !== 'seed') return;

    if (this.motion.prefersReducedMotion()) {
      this.phase.set('bloomed');
      this.showMessage.set(true);
      return;
    }

    this.phase.set('growing');
    this.playBloomSequence();
  }

  private initSceneObserver(): void {
    if (!this.sectionRef) return;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('flower');
        }
      },
      { threshold: 0.25 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private playBloomSequence(): void {
    const seed = this.seedRef.nativeElement;
    const stem = this.stemRef.nativeElement;
    const leaves = this.leavesRef.nativeElement;
    const bloom = this.bloomRef.nativeElement;
    const glow = this.glowRef?.nativeElement;
    const petals = bloom.querySelectorAll('.flower__petal');
    const center = bloom.querySelector('.flower__center');

    gsap.set(stem, { scaleY: 0, transformOrigin: 'bottom center' });
    gsap.set(leaves, { opacity: 0, scale: 0.5 });
    gsap.set(bloom, { scale: 0, opacity: 0 });
    gsap.set(petals, { scale: 0, opacity: 0, transformOrigin: 'center bottom' });
  if (center) gsap.set(center, { scale: 0, opacity: 0 });

    this.bloomTimeline = gsap.timeline({
      onComplete: () => {
        this.phase.set('bloomed');
        this.showMessage.set(true);
        this.revealMessage();
      }
    });

    this.bloomTimeline
      .to(seed, { scale: 0.6, opacity: 0, duration: 0.5, ease: 'power2.in' })
      .to(stem, { scaleY: 1, duration: 1.2, ease: 'power2.out' }, '-=0.1')
      .to(leaves, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.4)' }, '-=0.5')
      .to(bloom, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.6)' }, '-=0.2')
      .to(petals, {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        stagger: 0.08,
        ease: 'back.out(2)'
      }, '-=0.3');

    if (center) {
      this.bloomTimeline.to(center, { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' }, '-=0.4');
    }

    if (glow) {
      this.bloomTimeline.to(glow, { opacity: 0.7, scale: 1.2, duration: 1.2, ease: 'power2.out' }, '-=0.8');
    }
  }

  private revealMessage(): void {
    const el = this.messageElRef?.nativeElement;
    if (!el || this.motion.prefersReducedMotion()) return;

    gsap.fromTo(el, {
      opacity: 0,
      y: 24,
      filter: 'blur(8px)'
    }, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1,
      ease: 'power3.out'
    });
  }
}
