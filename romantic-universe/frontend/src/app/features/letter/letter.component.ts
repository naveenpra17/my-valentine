import {
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
  afterNextRender,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../../core/services/motion.service';
import { SceneManagerService } from '../../core/cinematic/scene-manager.service';
import { MusicalChoreographyService } from '../../core/audio/musical-choreography.service';

@Component({
  selector: 'app-letter',
  standalone: true,
  templateUrl: './letter.component.html',
  styleUrl: './letter.component.scss'
})
export class LetterComponent implements OnDestroy {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('paper') paperRef!: ElementRef<HTMLElement>;
  @ViewChild('introEl') introRef!: ElementRef<HTMLElement>;
  @ViewChild('signEl') signRef?: ElementRef<HTMLElement>;
  @ViewChildren('lineEl') lineRefs!: QueryList<ElementRef<HTMLElement>>;

  readonly intro = input('A letter for you');
  readonly message = input('');
  readonly myName = input('');

  private readonly motion = inject(MotionService);
  private readonly scenes = inject(SceneManagerService);
  private readonly music = inject(MusicalChoreographyService);
  private observer?: IntersectionObserver;
  private timeline?: gsap.core.Timeline;
  private hasPlayed = false;
  private inView = false;
  private playQueued = false;

  readonly revealed = signal(false);

  constructor() {
    afterNextRender(() => {
      this.prepareHidden();
      this.lineRefs.changes.subscribe(() => {
        this.prepareHidden();
        this.tryPlayReveal();
      });
      this.initVisibilityObserver();
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.timeline?.kill();
  }

  lines(): string[] {
    const text = this.message().trim();
    if (!text) return [];

    const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    const result: string[] = [];

    for (const paragraph of paragraphs) {
      const parts = paragraph.split('\n').map(l => l.trim()).filter(Boolean);
      if (parts.length <= 1) {
        result.push(paragraph);
      } else {
        result.push(...parts);
      }
    }

    return result;
  }

  private initVisibilityObserver(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.inView = entry.isIntersecting;
        if (entry.isIntersecting) {
          this.scenes.setScene('letter');
          this.music.beginLetter();
          this.tryPlayReveal();
        }
      },
      { threshold: 0.35 }
    );
    this.observer.observe(this.sectionRef.nativeElement);
  }

  private tryPlayReveal(): void {
    if (!this.inView || this.hasPlayed || this.playQueued) return;

    const expectedLines = Math.max(this.lines().length, 1);
    if (this.lineRefs.length < expectedLines) {
      return;
    }

    this.playQueued = true;
    requestAnimationFrame(() => this.playReveal());
  }

  private prepareHidden(): void {
    if (this.hasPlayed || this.motion.prefersReducedMotion()) return;

    const targets = [
      this.introRef?.nativeElement,
      this.paperRef?.nativeElement,
      this.signRef?.nativeElement,
      ...this.lineRefs.map(r => r.nativeElement)
    ].filter(Boolean) as HTMLElement[];

    if (targets.length > 0) {
      gsap.set(targets, { opacity: 0 });
    }
  }

  private playReveal(): void {
    if (this.hasPlayed) return;
    this.hasPlayed = true;

    if (this.motion.prefersReducedMotion()) {
      gsap.set([
        this.introRef.nativeElement,
        this.paperRef.nativeElement,
        this.signRef?.nativeElement,
        ...this.lineRefs.map(r => r.nativeElement)
      ].filter(Boolean), { opacity: 1 });
      this.revealed.set(true);
      return;
    }

    const lines = this.lineRefs.map(r => r.nativeElement);
    this.timeline = gsap.timeline({
      onComplete: () => this.revealed.set(true)
    });

    this.timeline
      .fromTo(this.introRef.nativeElement, {
        opacity: 0,
        y: 12,
        filter: 'blur(6px)'
      }, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.2,
        ease: 'power3.out'
      })
      .fromTo(this.paperRef.nativeElement, {
        opacity: 0,
        scale: 0.97,
        filter: 'blur(4px)'
      }, {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: 1,
        ease: 'power3.out'
      }, '-=0.6');

    if (lines.length > 0) {
      this.timeline.fromTo(lines, {
        opacity: 0,
        y: 16,
        filter: 'blur(8px)'
      }, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.1,
        stagger: 0.55,
        ease: 'power3.out'
      }, '-=0.4');
    }

    const sign = this.signRef?.nativeElement;
    if (sign && this.myName()) {
      this.timeline.fromTo(sign, {
        opacity: 0,
        y: 10,
        filter: 'blur(4px)'
      }, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1,
        ease: 'power3.out'
      }, '-=0.2');
    }
  }
}
