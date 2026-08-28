import {
  Component,
  ElementRef,
  ViewChild,
  afterNextRender,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionService } from '../../core/services/motion.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('photoWrap') photoWrapRef!: ElementRef<HTMLElement>;
  @ViewChild('textBlock') textBlockRef!: ElementRef<HTMLElement>;

  readonly herName = input('Beautiful');
  readonly line1 = input('Some people make the world beautiful just by being in it.');
  readonly line2 = input('And somehow, I got lucky enough to find you.');
  readonly imageUrl = input('/assets/images/hero/hero.jpg');

  private readonly motion = inject(MotionService);
  readonly imageError = signal(false);

  constructor() {
    afterNextRender(() => this.initAnimations());
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  private initAnimations(): void {
    if (this.motion.prefersReducedMotion()) return;

    const section = this.sectionRef.nativeElement;

    gsap.from(this.photoWrapRef.nativeElement, {
      scrollTrigger: { trigger: section, start: 'top 80%' },
      opacity: 0,
      y: 60,
      scale: 0.95,
      duration: 1.2,
      ease: 'power3.out'
    });

    gsap.from(this.textBlockRef.nativeElement.children, {
      scrollTrigger: { trigger: section, start: 'top 70%' },
      opacity: 0,
      y: 30,
      stagger: 0.2,
      duration: 1,
      ease: 'power3.out'
    });

    gsap.to(this.photoWrapRef.nativeElement, {
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      },
      y: -40,
      ease: 'none'
    });
  }
}
