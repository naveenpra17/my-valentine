import { Component, inject, input, signal } from '@angular/core';
import gsap from 'gsap';
import { EasterEggService } from '../../core/services/easter-egg.service';
import { MotionService } from '../../core/services/motion.service';

@Component({
  selector: 'app-secret-heart',
  standalone: true,
  template: `
    @if (!revealed()) {
      <button
        class="secret-heart"
        (click)="reveal()"
        aria-label="Hidden surprise"
        title=""
      >
        <span class="secret-heart__glow"></span>
        <span class="secret-heart__icon">♥</span>
      </button>
    }

    @if (showModal()) {
      <div class="secret-heart__modal" role="dialog" aria-modal="true" (click)="close()">
        <div class="secret-heart__card glass-card" (click)="$event.stopPropagation()">
          <p class="secret-heart__found">YOU FOUND A SECRET ❤️</p>
          <p class="secret-heart__message">{{ secretMessage() }}</p>
          <button class="btn-primary" (click)="close()">Okay, I love you too 🥹</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .secret-heart {
      position: fixed;
      bottom: 5.5rem;
      left: 1.25rem;
      z-index: 70;
      width: 28px;
      height: 28px;
      background: none;
      padding: 0;
      cursor: pointer;
      opacity: 0.35;
      transition: opacity 0.3s ease, transform 0.3s ease;

      &:hover {
        opacity: 1;
        transform: scale(1.2);
      }
    }

    .secret-heart__glow {
      position: absolute;
      inset: -8px;
      background: radial-gradient(circle, var(--glow-rose), transparent 70%);
      border-radius: 50%;
      animation: pulse-glow 3s ease-in-out infinite;
    }

    .secret-heart__icon {
      position: relative;
      font-size: 1rem;
      color: var(--rose);
    }

    .secret-heart__modal {
      position: fixed;
      inset: 0;
      z-index: 300;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(26, 15, 20, 0.8);
      backdrop-filter: blur(6px);
      animation: fade-in 0.3s ease;
    }

    .secret-heart__card {
      max-width: 400px;
      padding: 2rem;
      text-align: center;
      background: rgba(255, 248, 240, 0.92);
      color: var(--burgundy);
    }

    .secret-heart__found {
      font-family: var(--font-display);
      font-size: 1.35rem;
      margin-bottom: 1rem;
      color: var(--rose-deep);
    }

    .secret-heart__message {
      font-family: var(--font-quote);
      font-style: italic;
      line-height: 1.7;
      margin-bottom: 1.5rem;
    }

    @keyframes pulse-glow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.15); }
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .secret-heart__glow { animation: none; }
    }
  `]
})
export class SecretHeartComponent {
  readonly secretMessage = input(
    'You found the secret heart. That means you\'re officially the most curious, wonderful person I know.'
  );

  private readonly easterEggs = inject(EasterEggService);
  private readonly motion = inject(MotionService);

  readonly revealed = signal(this.easterEggs.secretHeartFound());
  readonly showModal = signal(false);

  reveal(): void {
    this.easterEggs.markSecretHeartFound();
    this.revealed.set(true);
    this.showModal.set(true);

    if (!this.motion.prefersReducedMotion()) {
      gsap.from('.secret-heart__card', {
        scale: 0.8,
        opacity: 0,
        duration: 0.5,
        ease: 'back.out(1.7)'
      });
    }
  }

  close(): void {
    this.showModal.set(false);
  }
}
