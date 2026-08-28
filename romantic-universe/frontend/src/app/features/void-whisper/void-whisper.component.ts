import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input
} from '@angular/core';
import { EasterEggService } from '../../core/services/easter-egg.service';
import { FocusTrapService } from '../../core/services/focus-trap.service';

@Component({
  selector: 'app-void-whisper',
  standalone: true,
  template: `
    @if (easterEggs.showVoidWhisper()) {
      <div
        class="void-whisper"
        #dialog
        role="dialog"
        aria-modal="true"
        aria-label="Hidden whisper"
      >
        <div class="void-whisper__card">
          <p class="cine-micro void-whisper__label">You whispered into the void</p>
          <p class="cine-letter void-whisper__message">{{ message() }}</p>
          <button class="cine-enter-btn" type="button" (click)="dismiss()">The void heard you</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .void-whisper {
      position: fixed;
      inset: 0;
      z-index: 400;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: rgba(5, 3, 8, 0.95);
      backdrop-filter: blur(16px);
    }

    .void-whisper__card {
      max-width: 440px;
      width: 100%;
      padding: clamp(2.5rem, 6vw, 3.5rem);
      text-align: center;
      border: 1px solid rgba(245, 240, 232, 0.08);
    }

    .void-whisper__label {
      margin: 0 0 1.5rem;
      color: var(--rose);
    }

    .void-whisper__message {
      margin: 0 0 2rem;
    }
  `]
})
export class VoidWhisperComponent implements OnDestroy {
  readonly message = input(
    'The void heard you. And it whispered back: you are loved.'
  );

  @ViewChild('dialog') dialogRef?: ElementRef<HTMLElement>;

  readonly easterEggs = inject(EasterEggService);
  private readonly focusTrap = inject(FocusTrapService);

  constructor() {
    effect(() => {
      if (this.easterEggs.showVoidWhisper()) {
        requestAnimationFrame(() => {
          const el = this.dialogRef?.nativeElement;
          if (el) {
            this.focusTrap.activate(el, () => this.dismiss());
          }
        });
      } else {
        this.focusTrap.deactivate();
      }
    });
  }

  dismiss(): void {
    this.easterEggs.dismissVoidWhisper();
  }

  ngOnDestroy(): void {
    this.focusTrap.deactivate();
  }
}
