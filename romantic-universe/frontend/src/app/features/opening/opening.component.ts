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

@Component({
  selector: 'app-opening',
  standalone: true,
  templateUrl: './opening.component.html',
  styleUrl: './opening.component.scss'
})
export class OpeningComponent implements OnDestroy {
  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;
  @ViewChild('linesWrap') linesWrapRef!: ElementRef<HTMLElement>;
  @ViewChild('ctaEl') ctaRef!: ElementRef<HTMLElement>;
  @ViewChild('lightPoint') lightRef!: ElementRef<HTMLElement>;

  readonly void1 = input('Hey...');
  readonly void2 = input('You.');
  readonly void3 = input('I made a little world for you.');
  readonly void4 = input('Will you come in?');
  readonly ctaLabel = input('');

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
    this.playEnterExpansion();
    this.enter.emit();
  }

  private runSequence(): void {
    const lines = [this.void1(), this.void2(), this.void3(), this.void4()];

    if (this.motion.prefersReducedMotion()) {
      this.showAllLines(lines);
      this.showCta.set(true);
      gsap.set(this.ctaRef.nativeElement, { opacity: 1 });
      return;
    }

    this.playVoidSequence(lines);
  }

  private showAllLines(lines: string[]): void {
    const wrap = this.linesWrapRef.nativeElement;
    wrap.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'void-line void-line--invite';
    p.textContent = lines[lines.length - 1];
    wrap.appendChild(p);
  }

  private playVoidSequence(lines: string[]): void {
    const wrap = this.linesWrapRef.nativeElement;
    wrap.innerHTML = '';

    this.timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => this.revealInvitation()
    });

    lines.forEach((text, index) => {
      const pause = index === 0 ? 0 : '+=1.8';
      this.timeline!.add(() => this.showLine(wrap, text, index), pause);
      if (index < lines.length - 1) {
        this.timeline!.add(() => this.hideLine(wrap), '+=1.8');
      }
    });
  }

  private showLine(container: HTMLElement, text: string, index: number): void {
    container.innerHTML = '';
    const p = document.createElement('p');
    p.className = lineClass(text, index);
    p.textContent = text;
    p.style.opacity = '0';
    p.style.filter = 'blur(10px)';
    container.appendChild(p);

    gsap.to(p, {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      duration: index === 0 ? 2 : 1.4,
      ease: 'power3.out'
    });
  }

  private hideLine(container: HTMLElement): void {
    const p = container.querySelector('p');
    if (!p) return;
    gsap.to(p, {
      opacity: 0,
      filter: 'blur(8px)',
      y: -6,
      duration: 0.9,
      ease: 'power2.in'
    });
  }

  private revealInvitation(): void {
    this.showCta.set(true);
    gsap.fromTo(this.ctaRef.nativeElement, {
      opacity: 0,
      scale: 0.6
    }, {
      opacity: 1,
      scale: 1,
      duration: 1.6,
      ease: 'power3.out'
    });
  }

  private playEnterExpansion(): void {
    if (this.motion.prefersReducedMotion()) return;

    const light = this.lightRef?.nativeElement;
    if (!light) return;

    gsap.to(light, {
      scale: 120,
      opacity: 1,
      duration: 1.8,
      ease: 'power2.inOut'
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

function lineClass(text: string, index: number): string {
  if (index === 0 || text.length <= 6) return 'void-line void-line--pulse';
  if (index >= 2) return 'void-line void-line--invite';
  return 'void-line void-line--whisper';
}
