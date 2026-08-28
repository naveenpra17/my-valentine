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
  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;
  @ViewChild('linesWrap') linesWrapRef!: ElementRef<HTMLElement>;
  @ViewChild('ctaEl') ctaRef!: ElementRef<HTMLElement>;

  readonly void1 = input('Hey...');
  readonly void2 = input('You.');
  readonly void3 = input('Yes, you.');
  readonly void4 = input('I made something for you.');
  readonly ctaLabel = input('Enter');

  readonly enter = output<void>();

  private readonly motion = inject(MotionService);
  private timeline?: gsap.core.Timeline;

  readonly exiting = signal(false);
  readonly showCta = signal(false);
  readonly visibleLines = signal<string[]>([]);

  private allLines: string[] = [];

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
    this.allLines = [this.void1(), this.void2(), this.void3(), this.void4()];

    if (this.motion.prefersReducedMotion()) {
      this.visibleLines.set(this.allLines);
      this.showCta.set(true);
      gsap.set(this.ctaRef.nativeElement, { opacity: 1 });
      return;
    }

    this.playVoidSequence();
  }

  private playVoidSequence(): void {
    const wrap = this.linesWrapRef.nativeElement;
    wrap.innerHTML = '';

    this.timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => this.revealCta()
    });

    this.allLines.forEach((text, index) => {
      this.timeline!.add(() => this.showLine(wrap, text, index === 0), index === 0 ? 0 : '+=1.4');
      this.timeline!.add(() => this.hideLine(wrap), '+=1.6');
    });
  }

  private showLine(container: HTMLElement, text: string, isFirst: boolean): void {
    container.innerHTML = '';
    const p = document.createElement('p');
    p.className = indexClass(text);
    p.textContent = text;
    p.style.opacity = '0';
    p.style.filter = 'blur(8px)';
    container.appendChild(p);

    gsap.to(p, {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      duration: isFirst ? 1.8 : 1.2,
      ease: 'power3.out'
    });
  }

  private hideLine(container: HTMLElement): void {
    const p = container.querySelector('p');
    if (!p) return;
    gsap.to(p, {
      opacity: 0,
      filter: 'blur(6px)',
      y: -8,
      duration: 0.8,
      ease: 'power2.in'
    });
  }

  private revealCta(): void {
    this.showCta.set(true);
    gsap.fromTo(this.ctaRef.nativeElement, {
      opacity: 0,
      y: 12
    }, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power3.out'
    });
  }

  fadeOut(): Promise<void> {
    return new Promise(resolve => {
      if (this.motion.prefersReducedMotion()) {
        resolve();
        return;
      }
      gsap.to(this.containerRef.nativeElement, {
        opacity: 0,
        duration: 1.6,
        ease: 'power2.inOut',
        onComplete: resolve
      });
    });
  }
}

function indexClass(text: string): string {
  if (text.length <= 6) return 'void-line void-line--pulse';
  return 'void-line void-line--whisper';
}
