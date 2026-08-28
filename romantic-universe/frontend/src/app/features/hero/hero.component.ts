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
  readonly line1 = input('Some people make the world beautiful just by being in it.');
  readonly line2 = input('And somehow, I got lucky enough to find you.');
  readonly imageUrl = input('/assets/images/hero/hero.jpg');

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
    this.scenes.setScene('hero');

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.scenes.setScene('hero');
        }
      },
      { threshold: 0.3 }
    );
    this.observer.observe(this.sectionRef.nativeElement);

    if (this.motion.prefersReducedMotion()) {
      gsap.set(
        [this.photoInnerRef.nativeElement, this.textBlockRef.nativeElement],
        { opacity: 1 }
      );
      return;
    }

    if (this.motion.isMobile()) {
      this.initMobileReveal();
      return;
    }

    this.initPinnedReveal();
  }

  private initMobileReveal(): void {
    const section = this.sectionRef.nativeElement;
    const photoInner = this.photoInnerRef.nativeElement;
    const textBlock = this.textBlockRef.nativeElement;
    const dust = this.dustLayerRef.nativeElement;
    const children = Array.from(textBlock.children) as HTMLElement[];

    gsap.set(photoInner, { opacity: 0, scale: 0.92, y: 24 });
    gsap.set(children, { opacity: 0, y: 20 });
    gsap.set(dust, { opacity: 0 });

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.timeline()
          .to(photoInner, {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out'
          })
          .to(dust, { opacity: 0.45, duration: 0.6 }, '-=0.5')
          .to(children, {
            opacity: 1,
            y: 0,
            stagger: 0.12,
            duration: 0.8,
            ease: 'power3.out'
          }, '-=0.5');
      }
    });

    this.scrollTriggers.push(st);
  }

  private initPinnedReveal(): void {
    const section = this.sectionRef.nativeElement;
    const photoInner = this.photoInnerRef.nativeElement;
    const textBlock = this.textBlockRef.nativeElement;
    const dust = this.dustLayerRef.nativeElement;
    const children = Array.from(textBlock.children) as HTMLElement[];

    gsap.set(photoInner, { scale: 0.72, opacity: 0, filter: 'blur(12px)' });
    gsap.set(children, { opacity: 0, y: 28, filter: 'blur(6px)' });
    gsap.set(dust, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=130%',
        pin: this.pinWrapRef.nativeElement,
        scrub: 1.2,
        anticipatePin: 1
      }
    });

    tl.to(photoInner, {
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
      duration: 0.5,
      ease: 'power2.out'
    })
      .to(dust, { opacity: 0.6, duration: 0.3 }, '-=0.2')
      .to(children, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        stagger: 0.08,
        duration: 0.35,
        ease: 'power3.out'
      }, '-=0.1')
      .to(photoInner, {
        scale: 1.06,
        duration: 0.4,
        ease: 'none'
      });

    const parallax = gsap.to(photoInner, {
      y: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });

    this.scrollTriggers.push(
      tl.scrollTrigger!,
      parallax.scrollTrigger!
    );
  }
}
