import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { EasterEggService } from '../../core/services/easter-egg.service';
import { MotionService } from '../../core/services/motion.service';
import { FocusTrapService } from '../../core/services/focus-trap.service';

@Component({
  selector: 'app-hidden-star',
  standalone: true,
  template: `
    @if (!found()) {
      <button
        class="hidden-star"
        type="button"
        (click)="discover()"
        aria-label="Hidden star"
      >
        <span class="hidden-star__dot" aria-hidden="true"></span>
      </button>
    }

    @if (showReveal()) {
      <div
        class="hidden-star__modal"
        #modal
        role="dialog"
        aria-modal="true"
        (click)="close()"
      >
        <div class="hidden-star__card" (click)="$event.stopPropagation()">
          <p class="cine-micro hidden-star__label">Another secret</p>
          <p class="cine-letter hidden-star__message">{{ message() }}</p>
          <button class="cine-enter-btn" type="button" (click)="close()">Close</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .hidden-star {
      position: fixed;
      bottom: max(1rem, var(--safe-bottom));
      right: max(1rem, var(--safe-right));
      z-index: 65;
      width: var(--touch-min);
      height: var(--touch-min);
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      opacity: 0.15;
      transition: opacity 0.4s ease;

      @media (max-width: 767px) {
        bottom: max(5.25rem, calc(1rem + var(--safe-bottom)));
      }

      &:hover { opacity: 0.7; }
      &:focus-visible {
        opacity: 1;
        outline: 1px solid var(--champagne);
        outline-offset: 4px;
      }
    }

    .hidden-star__dot {
      display: block;
      width: 4px;
      height: 4px;
      margin: 8px auto;
      border-radius: 50%;
      background: var(--champagne);
      box-shadow: 0 0 8px var(--champagne);
    }

    .hidden-star__modal {
      position: fixed;
      inset: 0;
      z-index: 350;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: rgba(5, 3, 8, 0.92);
      backdrop-filter: blur(14px);
    }

    .hidden-star__card {
      max-width: 400px;
      width: 100%;
      padding: 2.5rem 2rem;
      text-align: center;
      border: 1px solid rgba(245, 240, 232, 0.1);
      background: rgba(10, 6, 16, 0.7);
    }

    .hidden-star__label {
      margin: 0 0 1rem;
      color: var(--champagne);
    }

    .hidden-star__message {
      margin: 0 0 1.5rem;
    }
  `]
})
export class HiddenStarComponent implements OnDestroy {
  readonly message = input(
    'You found the hidden star. The universe has a few more secrets — keep exploring.'
  );

  @ViewChild('modal') modalRef?: ElementRef<HTMLElement>;

  private readonly easterEggs = inject(EasterEggService);
  private readonly motion = inject(MotionService);
  private readonly focusTrap = inject(FocusTrapService);

  readonly found = signal(this.easterEggs.hiddenStarFound());
  readonly showReveal = signal(false);

  constructor() {
    afterNextRender(() => {
      effect(() => {
        if (this.showReveal()) {
          requestAnimationFrame(() => {
            const el = this.modalRef?.nativeElement;
            if (el) {
              this.focusTrap.activate(el, () => this.close());
            }
          });
        } else {
          this.focusTrap.deactivate();
        }
      });
    });
  }

  discover(): void {
    this.easterEggs.markHiddenStarFound();
    this.found.set(true);
    this.showReveal.set(true);

    if (!this.motion.prefersReducedMotion()) {
      requestAnimationFrame(() => {
        gsap.from('.hidden-star__card', {
          opacity: 0,
          scale: 0.92,
          duration: 0.7,
          ease: 'power3.out'
        });
      });
    }
  }

  close(): void {
    this.showReveal.set(false);
  }

  ngOnDestroy(): void {
    this.focusTrap.deactivate();
  }
}
