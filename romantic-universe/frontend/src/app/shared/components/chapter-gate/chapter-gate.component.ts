import { Component, inject, input } from '@angular/core';
import { ExperienceControllerService } from '../../../core/experience/experience-controller.service';
import { DirectorChapterId } from '../../../core/experience/experience-state.types';

@Component({
  selector: 'app-chapter-gate',
  standalone: true,
  template: `
    @if (controller.unlockedChapters().has(chapter())) {
      <ng-content />
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ChapterGateComponent {
  readonly chapter = input.required<DirectorChapterId>();
  readonly controller = inject(ExperienceControllerService);
}
