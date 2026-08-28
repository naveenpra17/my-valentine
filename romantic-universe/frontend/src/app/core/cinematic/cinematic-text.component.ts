import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  afterNextRender,
  inject,
  input,
  output
} from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../../services/motion.service';

@Component({
  selector: 'app-cinematic-text',
  standalone: true,
  template: `
    <div class="cinematic-text" [class.cinematic-text--center]="center()">
      @for (line of lines(); track $index) {
        <p class="cine-line" [class]="lineClass()" #lineEl>{{ line }}</p>
      }
    </div>
  `,
  styles: [`
    .cinematic-text {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      &--center { align-items: center; text-align: center; }
    }
    .cine-line { margin: 0; }
  `]
})
export class CinematicTextComponent {
  @ViewChildren('lineEl') lineEls!: QueryList<ElementRef<HTMLElement>>;

  readonly lines = input<string[]>([]);
  readonly lineClass = input('cine-statement');
  readonly center = input(true);
  readonly stagger = input(0.8);
  readonly autoPlay = input(true);
  readonly sequenceComplete = output<void>();

  private readonly motion = inject(MotionService);

  constructor() {
    afterNextRender(() => {
      if (this.autoPlay()) {
        this.play();
      }
    });
  }

  play(): Promise<void> {
    return new Promise(resolve => {
      const els = this.lineEls?.toArray().map(r => r.nativeElement) ?? [];
      if (els.length === 0 || this.motion.prefersReducedMotion()) {
        els.forEach(el => gsap.set(el, { opacity: 1 }));
        this.sequenceComplete.emit();
        resolve();
        return;
      }

      gsap.set(els, { opacity: 0, y: 16, filter: 'blur(6px)' });

      const tl = gsap.timeline({
        onComplete: () => {
          this.sequenceComplete.emit();
          resolve();
        }
      });

      els.forEach((el, i) => {
        tl.to(el, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1.4,
          ease: 'power3.out'
        }, i * this.stagger());
      });
    });
  }
}
