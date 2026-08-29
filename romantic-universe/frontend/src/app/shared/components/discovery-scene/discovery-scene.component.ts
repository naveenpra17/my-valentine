import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { SceneMomentService } from '../../../core/cinematic/scene-moment.service';

@Component({
  selector: 'app-discovery-scene',
  standalone: true,
  imports: [DatePipe],
  template: `
    @if (moments.active(); as scene) {
      <div class="discovery-scene" role="dialog" aria-modal="true" [attr.aria-label]="scene.title ?? 'Discovery'">
        <div class="discovery-scene__backdrop"></div>
        <div class="discovery-scene__content">
          @if (scene.subtitle) {
            <p class="cine-whisper discovery-scene__subtitle">{{ scene.subtitle }}</p>
          }
          @if (scene.imageUrl) {
            <div class="discovery-scene__frame">
              <img [src]="scene.imageUrl" [alt]="scene.title ?? ''" />
            </div>
          }
          @if (scene.title) {
            <h2 class="cine-editorial-sm discovery-scene__title">{{ scene.title }}</h2>
          }
          @if (scene.date) {
            <time class="cine-micro discovery-scene__date" [attr.datetime]="scene.date">
              {{ scene.date | date:'longDate' }}
            </time>
          }
          @if (scene.location) {
            <p class="cine-micro discovery-scene__location">{{ scene.location }}</p>
          }
          @if (scene.body) {
            <p class="cine-letter discovery-scene__body">{{ scene.body }}</p>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .discovery-scene {
      position: fixed;
      inset: 0;
      z-index: 180;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(1.5rem, 5vw, 3rem);
      pointer-events: none;
    }

    .discovery-scene__backdrop {
      position: absolute;
      inset: 0;
      background: rgba(5, 3, 8, 0.9);
      backdrop-filter: blur(14px);
    }

    .discovery-scene__content {
      position: relative;
      z-index: 1;
      max-width: min(480px, 92vw);
      text-align: center;
      animation: discoveryIn 1.4s var(--ease-cine, ease) both;
    }

    .discovery-scene__subtitle {
      margin: 0 0 1.25rem;
      opacity: 0.75;
    }

    .discovery-scene__frame {
      margin: 0 auto 1.5rem;
      max-width: 320px;
      border: 1px solid rgba(245, 240, 232, 0.12);
      overflow: hidden;
      box-shadow: 0 0 60px rgba(201, 160, 168, 0.15);

      img {
        display: block;
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: cover;
      }
    }

    .discovery-scene__title {
      margin: 0 0 0.75rem;
    }

    .discovery-scene__date,
    .discovery-scene__location {
      display: block;
      margin: 0 0 0.5rem;
      opacity: 0.65;
    }

    .discovery-scene__body {
      margin: 1rem 0 0;
    }

    @keyframes discoveryIn {
      from { opacity: 0; transform: translateY(18px); filter: blur(10px); }
      to { opacity: 1; transform: translateY(0); filter: blur(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .discovery-scene__content { animation: none; }
    }
  `]
})
export class DiscoverySceneComponent {
  readonly moments = inject(SceneMomentService);
}
