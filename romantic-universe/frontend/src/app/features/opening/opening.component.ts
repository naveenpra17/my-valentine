import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../../core/services/motion.service';
import { StarfieldComponent } from '../../shared/components/starfield/starfield.component';

@Component({
  selector: 'app-opening',
  standalone: true,
  imports: [StarfieldComponent],
  templateUrl: './opening.component.html',
  styleUrl: './opening.component.scss'
})
export class OpeningComponent implements OnDestroy {
  @ViewChild('line1El') line1Ref!: ElementRef<HTMLElement>;
  @ViewChild('line2El') line2Ref!: ElementRef<HTMLElement>;
  @ViewChild('ctaEl') ctaRef!: ElementRef<HTMLElement>;
  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;

  readonly line1 = input('Hey beautiful... ❤️');
  readonly line2 = input('I made a little universe for you.');
  readonly enter = output<void>();

  private readonly motion = inject(MotionService);
  private timeline?: gsap.core.Timeline;

  readonly exiting = signal(false);
  readonly showCta = signal(false);

  constructor() {
    afterNextRender(() => this.runSequence());
  }

  ngOnDestroy(): void {
    this.timeline?.kill();
  }

  onEnter(): void {
    if (this.exiting()) return;
    this.exiting.set(true);
    this.enter.emit();
  }

  private runSequence(): void {
    const reduced = this.motion.prefersReducedMotion();

    if (reduced) {
      gsap.set([this.line1Ref.nativeElement, this.line2Ref.nativeElement, this.ctaRef.nativeElement], {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)'
      });
      this.showCta.set(true);
      return;
    }

    this.timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

    gsap.set([this.line1Ref.nativeElement, this.line2Ref.nativeElement, this.ctaRef.nativeElement], {
      opacity: 0,
      y: 24,
      filter: 'blur(8px)'
    });

    this.timeline
      .to(this.line1Ref.nativeElement, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2 })
      .to(this.line2Ref.nativeElement, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2 }, '+=0.6')
      .add(() => this.showCta.set(true))
      .to(this.ctaRef.nativeElement, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1 }, '+=0.3');
  }

  fadeOut(): Promise<void> {
    return new Promise(resolve => {
      if (this.motion.prefersReducedMotion()) {
        resolve();
        return;
      }
      gsap.to(this.containerRef.nativeElement, {
        opacity: 0,
        scale: 1.05,
        filter: 'blur(12px)',
        duration: 1.2,
        ease: 'power2.inOut',
        onComplete: resolve
      });
    });
  }
}
