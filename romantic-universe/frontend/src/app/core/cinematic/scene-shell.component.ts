import { Component, input } from '@angular/core';

@Component({
  selector: 'app-scene-shell',
  standalone: true,
  template: `
    <section
      class="cine-scene cine-scene--dark"
      [class.cine-scene--pin]="pinned()"
      [attr.data-scene]="sceneId()"
      [attr.data-act]="act()"
    >
      <div class="cine-vignette"></div>
      @if (showActMarker()) {
        <span class="act-marker" aria-hidden="true">{{ actLabel() }}</span>
      }
      <div class="scene-shell__content">
        <ng-content />
      </div>
      <div class="cine-fade-edge cine-fade-edge--bottom"></div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .scene-shell__content {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 900px;
      padding: var(--scene-padding);
    }
    .act-marker {
      position: absolute;
      top: 2rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
    }
  `]
})
export class SceneShellComponent {
  readonly sceneId = input('');
  readonly act = input('');
  readonly actLabel = input('');
  readonly pinned = input(false);
  readonly showActMarker = input(false);
}
