import { Component, OnInit, inject, output, signal } from '@angular/core';
import { HeartShareService } from '../../../core/services/heart-share.service';

@Component({
  selector: 'app-heart-share-offer',
  standalone: true,
  template: `
    <div class="share-offer" role="dialog" aria-labelledby="share-offer-title" aria-modal="true">
      <div class="share-offer__backdrop" (click)="closed.emit()"></div>
      <div class="share-offer__panel">
        <p class="cine-whisper share-offer__hint" id="share-offer-title">Keep our little heart.</p>
        <p class="cine-micro share-offer__sub">A snapshot of the heart you helped build.</p>

        <div class="share-offer__frame">
          @if (loading()) {
            <div class="share-offer__loading-wrap">
              <div class="share-offer__loading-heart" aria-hidden="true">♥</div>
              <p class="cine-micro share-offer__loading">Preparing your heart...</p>
            </div>
          } @else if (previewUrl()) {
            <img [src]="previewUrl()!" alt="Your personalized heart" class="share-offer__image" />
          } @else {
            <div class="share-offer__fallback">
              <div class="share-offer__fallback-heart" aria-hidden="true">♥</div>
              <p class="cine-micro share-offer__loading">Your heart is still here — even without a picture.</p>
            </div>
          }
        </div>

        <div class="share-offer__actions">
          <button
            class="cine-enter-btn share-offer__btn"
            type="button"
            [disabled]="sharing()"
            (click)="share()"
          >
            {{ sharing() ? 'Sharing...' : 'Share' }}
          </button>
          <button
            class="share-offer__btn share-offer__btn--ghost"
            type="button"
            [disabled]="sharing()"
            (click)="save()"
          >
            Save
          </button>
        </div>

        @if (error()) {
          <p class="cine-micro share-offer__error">Let's try that again.</p>
        }

        <button class="share-offer__dismiss cine-micro" type="button" (click)="closed.emit()">
          Continue
        </button>
        <button class="share-offer__restart cine-micro" type="button" (click)="requestRestart()">
          Start from the beginning
        </button>
      </div>
    </div>
  `,
  styles: [`
    .share-offer {
      position: fixed;
      inset: 0;
      z-index: 10200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .share-offer__backdrop {
      position: absolute;
      inset: 0;
      background: rgba(5, 3, 8, 0.92);
      backdrop-filter: blur(6px);
    }

    .share-offer__panel {
      position: relative;
      z-index: 1;
      width: min(420px, 94vw);
      text-align: center;
    }

    .share-offer__hint {
      margin: 0 0 0.5rem;
      opacity: 0.8;
    }

    .share-offer__sub {
      margin: 0 0 1.25rem;
      opacity: 0.5;
    }

    .share-offer__frame {
      aspect-ratio: 1;
      border: 1px solid rgba(201, 160, 168, 0.2);
      background:
        radial-gradient(ellipse at 50% 40%, rgba(201, 160, 168, 0.12) 0%, transparent 55%),
        rgba(10, 6, 16, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }

    .share-offer__image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .share-offer__loading {
      opacity: 0.55;
      margin: 0;
      padding: 0 1rem;
    }

    .share-offer__loading-wrap,
    .share-offer__fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem;
    }

    .share-offer__loading-heart,
    .share-offer__fallback-heart {
      font-size: 2.5rem;
      color: var(--rose);
      text-shadow: 0 0 30px rgba(201, 160, 168, 0.5);
      animation: shareHeartPulse 2.4s ease-in-out infinite;
    }

    @keyframes shareHeartPulse {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.08); opacity: 1; }
    }

    .share-offer__actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .share-offer__btn--ghost {
      padding: 0.65rem 1.25rem;
      border: 1px solid rgba(245, 240, 232, 0.15);
      background: transparent;
      color: var(--ivory-dim);
      font-family: var(--font-body);
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      cursor: pointer;
    }

    .share-offer__btn--ghost:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .share-offer__error {
      color: var(--rose);
      margin: 0 0 0.75rem;
    }

    .share-offer__dismiss {
      border: none;
      background: none;
      color: rgba(245, 240, 232, 0.45);
      cursor: pointer;
      text-decoration: underline;
      font-family: var(--font-body);
    }

    .share-offer__restart {
      display: block;
      margin: 0.85rem auto 0;
      border: none;
      background: none;
      color: rgba(245, 240, 232, 0.38);
      cursor: pointer;
      text-decoration: underline;
      font-family: var(--font-body);
      letter-spacing: 0.06em;
    }
  `]
})
export class HeartShareOfferComponent implements OnInit {
  private readonly shareService = inject(HeartShareService);

  readonly closed = output<void>();
  readonly restart = output<void>();

  readonly loading = signal(true);
  readonly sharing = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly error = signal(false);

  ngOnInit(): void {
    void this.loadPreview();
  }

  async share(): Promise<void> {
    this.sharing.set(true);
    this.error.set(false);
    try {
      const ok = await this.shareService.share();
      if (!ok) this.error.set(true);
    } catch {
      this.error.set(true);
    } finally {
      this.sharing.set(false);
    }
  }

  async save(): Promise<void> {
    this.sharing.set(true);
    this.error.set(false);
    try {
      const ok = await this.shareService.download();
      if (!ok) this.error.set(true);
    } catch {
      this.error.set(true);
    } finally {
      this.sharing.set(false);
    }
  }

  private async loadPreview(): Promise<void> {
    this.loading.set(true);
    const url = await this.shareService.getPreviewDataUrl();
    this.previewUrl.set(url);
    this.loading.set(false);
    if (!url) this.error.set(true);
  }

  requestRestart(): void {
    this.restart.emit();
  }
}
