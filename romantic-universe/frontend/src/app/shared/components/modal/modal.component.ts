import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (open()) {
      <div
        class="modal-backdrop"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="ariaLabel()"
      >
        <div class="modal-content glass-card" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="close.emit()" aria-label="Close">✕</button>
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(26, 15, 20, 0.75);
      backdrop-filter: blur(8px);
      animation: fade-in 0.3s ease;
    }

    .modal-content {
      position: relative;
      max-width: 560px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem;
      background: rgba(255, 248, 240, 0.92);
      color: var(--burgundy);
      animation: slide-up 0.35s ease;
    }

    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(232, 160, 191, 0.25);
      color: var(--burgundy);
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background var(--transition);
      z-index: 1;

      &:hover {
        background: rgba(232, 160, 191, 0.45);
      }
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class ModalComponent {
  readonly open = input(false);
  readonly ariaLabel = input('Dialog');
  readonly close = output<void>();

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
