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
import { MusicalChoreographyService } from '../../core/audio/musical-choreography.service';

@Component({
  selector: 'app-opening',
  standalone: true,
  templateUrl: './opening.component.html',
  styleUrl: './opening.component.scss'
})
export class OpeningComponent implements OnDestroy {
  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;
  @ViewChild('linesWrap') linesWrapRef!: ElementRef<HTMLElement>;
  @ViewChild('lightPoint') lightRef!: ElementRef<HTMLElement>;

  readonly void1 = input('Hey...');
  readonly void2 = input('You.');
  readonly void3 = input('I made something for you.');
  readonly void4 = input('Come see.');
  readonly ctaLabel = input('');

  readonly enter = output<void>();

  private readonly motion = inject(MotionService);
  private readonly music = inject(MusicalChoreographyService);
  private timeline?: gsap.core.Timeline;

  readonly exiting = signal(false);
  readonly showCta = signal(false);
  readonly invitationVisible = signal(false);

  constructor() {
    afterNextRender(() => {
      this.music.enterOpening();
      this.runSequence();
    });
  }

  ngOnDestroy(): void {
    this.timeline?.kill();
  }

  onEnter(): void {
    if (this.exiting() || !this.showCta()) return;
    this.exiting.set(true);
    this.playEnterExpansion();
    this.enter.emit();
  }

  onStageActivate(): void {
    this.onEnter();
  }

  private runSequence(): void {
    const lines = [this.void1(), this.void2(), this.void3(), this.void4()];

    if (this.motion.prefersReducedMotion()) {
      this.showAllLines(lines);
      this.showCta.set(true);
      this.revealInvitation();
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
    const linePause = this.motion.isMobile() ? 2.2 : 2.8;
    const hidePause = this.motion.isMobile() ? 1.8 : 2.4;

    this.timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => this.revealInvitation()
    });

    // Darkness holds — curiosity before words
    this.timeline.add(() => {}, '+=2.6');

    lines.forEach((text, index) => {
      const pause = index === 0 ? 0 : `+=${linePause}`;
      this.timeline!.add(() => this.showLine(wrap, text, index), pause);
      if (index < lines.length - 1) {
        this.timeline!.add(() => this.hideLine(wrap), `+=${hidePause}`);
      }
    });
  }

  private showLine(container: HTMLElement, text: string, index: number): void {
    container.innerHTML = '';
    const p = document.createElement('p');
    p.className = lineClass(text, index);
    p.textContent = text;
    p.style.opacity = '0';
    p.style.transform = 'translateY(12px)';
    container.appendChild(p);

    gsap.to(p, {
      opacity: 1,
      y: 0,
      duration: index === 0 ? 2.4 : 1.6,
      ease: 'power2.out'
    });
  }

  private hideLine(container: HTMLElement): void {
    const p = container.querySelector('p');
    if (!p) return;
    gsap.to(p, {
      opacity: 0,
      y: -8,
      duration: 1.1,
      ease: 'power2.in'
    });
  }

  private revealInvitation(): void {
    this.showCta.set(true);
    requestAnimationFrame(() => {
      this.invitationVisible.set(true);
      const light = this.lightRef?.nativeElement;
      if (light && !this.motion.prefersReducedMotion()) {
        gsap.to(light, {
          scale: 1.6,
          opacity: 0.95,
          duration: 2.6,
          ease: 'power2.out'
        });
      }
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
