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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionService } from '../../core/services/motion.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { finalizeScrollReveal, revealOnScroll } from '../../core/utils/scroll-reveal';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent implements OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('pinWrap') pinWrapRef!: ElementRef<HTMLElement>;
  @ViewChild('photoStage') photoStageRef!: ElementRef<HTMLElement>;
  @ViewChild('photoInner') photoInnerRef!: ElementRef<HTMLElement>;
  @ViewChild('textBlock') textBlockRef!: ElementRef<HTMLElement>;
  @ViewChild('dustLayer') dustLayerRef!: ElementRef<HTMLElement>;

  readonly herName = input('Beautiful');
  readonly title = input('Look at This Beautiful Human');
  readonly discoverLine1 = input('Somewhere in this little universe...');
  readonly discoverLine2 = input('...there\'s someone I wanted you to meet.');
  readonly pauseLine1 = input('Beautiful?');
  readonly pauseLine2 = input('Obviously.');
  readonly pauseLine3 = input('But that\'s not even the best part.');
  readonly line1 = input('Some people make the world beautiful just by being in it.');
  readonly line2 = input('And somehow, I got lucky enough to find you.');
  readonly imageUrl = input('/assets/images/hero/hero.png');

  private readonly motion = inject(MotionService);
  private readonly scenes = inject(SceneManagerService);
  private observer?: IntersectionObserver;
  private scrollTriggers: ScrollTrigger[] = [];

  readonly imageError = signal(false);

  constructor() {
    afterNextRender(() => this.bootstrap());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.scrollTriggers.forEach(st => st.kill());
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  private bootstrap(): void {
    if (!this.sectionRef?.nativeElement) return;

    this.scenes.setScene('hero');

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('hero');
        }
      },
      { threshold: 0.2 }
    );
    this.observer.observe(this.sectionRef.nativeElement);

    const photoInner = this.photoInnerRef?.nativeElement;
    const textBlock = this.textBlockRef?.nativeElement;
    const dust = this.dustLayerRef?.nativeElement;
    if (!photoInner || !textBlock) return;

    const children = Array.from(textBlock.children) as HTMLElement[];
    const revealTargets = [photoInner, ...children];

    // Content is always visible — scroll animations are optional polish only
    gsap.set(revealTargets, { opacity: 1, y: 0, x: 0, scale: 1, filter: 'none' });
    if (dust) gsap.set(dust, { opacity: 0.35 });

    if (this.motion.prefersReducedMotion()) return;

    revealOnScroll(photoInner, {
      opacity: 0.4,
      y: 24,
      duration: 1,
      ease: 'power3.out'
    }, { trigger: this.sectionRef.nativeElement, start: 'top 85%' });

    children.forEach((child, i) => {
      const st = revealOnScroll(child, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        delay: i * 0.06,
        ease: 'power3.out'
      }, { trigger: child, start: 'top 92%' });
      if (st) this.scrollTriggers.push(st);
    });

    finalizeScrollReveal(...revealTargets);
    ScrollTrigger.refresh();
  }
}
