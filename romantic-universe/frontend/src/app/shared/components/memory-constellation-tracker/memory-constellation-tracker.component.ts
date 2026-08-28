import { Component, computed, inject } from '@angular/core';
import { ExperienceStateService } from '../../../core/experience/experience-state.service';

@Component({
  selector: 'app-memory-constellation-tracker',
  standalone: true,
  template: `
    @if (stars().length > 0) {
      <div class="mem-tracker" aria-label="Memory constellation progress" role="status">
        <div class="mem-tracker__stars">
          @for (star of stars(); track star.id) {
            <span class="mem-tracker__star" [class.mem-tracker__star--new]="$last"></span>
          }
        </div>
        @if (heartHint()) {
          <span class="mem-tracker__hint cine-discovery-hint">A shape is forming...</span>
        }
      </div>
    }
  `,
  styles: [`
    .mem-tracker {
      position: fixed;
      bottom: max(1.25rem, var(--safe-bottom));
      left: max(1rem, var(--safe-left));
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      pointer-events: none;
      opacity: 0.4;
      transition: opacity 0.6s ease;

      @media (max-width: 767px) {
        bottom: max(5.5rem, calc(1rem + var(--safe-bottom)));
      }
    }

    .mem-tracker__stars {
      display: flex;
      gap: 0.3rem;
      flex-wrap: wrap;
      max-width: 120px;
    }

    .mem-tracker__star {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--champagne);
      box-shadow: 0 0 4px rgba(196, 176, 138, 0.5);
    }

    .mem-tracker__star--new {
      animation: star-pop 0.8s ease;
    }

    .mem-tracker__hint {
      font-size: 0.55rem;
    }

    @keyframes star-pop {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(2.5); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class MemoryConstellationTrackerComponent {
  private readonly state = inject(ExperienceStateService);

  readonly stars = computed(() => this.state.constellationStars());
  readonly heartHint = computed(() => this.state.hasEnoughForConstellation() && !this.state.constellationHeartRevealed());
}
