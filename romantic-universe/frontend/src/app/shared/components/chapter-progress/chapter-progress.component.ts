import { Component, computed, inject, input } from '@angular/core';
import { SceneManagerService } from '../../../core/cinematic/scene-manager.service';

@Component({
  selector: 'app-chapter-progress',
  standalone: true,
  template: `
    <nav
      class="chapter-progress"
      aria-label="Experience progress"
      [class.chapter-progress--hidden]="hidden()"
    >
      <ol class="chapter-progress__list">
        @for (chapter of scenes.chapters; track chapter.id) {
          <li>
            <span
              class="chapter-progress__dot"
              [class.chapter-progress__dot--active]="chapter.id === scenes.currentChapter()"
              [class.chapter-progress__dot--visited]="chapter.id < scenes.currentChapter()"
              [attr.aria-current]="chapter.id === scenes.currentChapter() ? 'step' : null"
              [attr.aria-label]="chapter.title"
            ></span>
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [`
    .chapter-progress {
      position: fixed;
      top: max(1rem, var(--safe-top));
      left: 50%;
      transform: translateX(-50%);
      z-index: 55;
      pointer-events: none;
      opacity: 0.35;
      transition: opacity 0.6s ease;

      &--hidden {
        opacity: 0;
      }
    }

    .chapter-progress__list {
      display: flex;
      gap: 0.45rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .chapter-progress__dot {
      display: block;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: rgba(245, 240, 232, 0.25);
      transition: transform 0.4s ease, background 0.4s ease, box-shadow 0.4s ease;

      &--visited {
        background: rgba(201, 160, 168, 0.55);
      }

      &--active {
        transform: scale(1.6);
        background: var(--champagne);
        box-shadow: 0 0 8px rgba(196, 176, 138, 0.45);
      }
    }

    @media (max-width: 767px) {
      .chapter-progress__dot {
        width: 3px;
        height: 3px;
      }
    }
  `]
})
export class ChapterProgressComponent {
  readonly hidden = input(false);
  readonly scenes = inject(SceneManagerService);

  readonly activeChapter = computed(() => this.scenes.currentChapter());
}
