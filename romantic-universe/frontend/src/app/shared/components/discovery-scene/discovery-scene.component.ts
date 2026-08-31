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
          @if (scene.imageUrl) {
            <div class="discovery-scene__frame discovery-scene__reveal discovery-scene__reveal--first">
              <img [src]="scene.imageUrl" [alt]="scene.title ?? ''" />
            </div>
          }
          @if (scene.subtitle) {
            <p class="cine-whisper discovery-scene__subtitle discovery-scene__reveal discovery-scene__reveal--second">{{ scene.subtitle }}</p>
          }
          @if (scene.title) {
            <h2 class="cine-editorial-sm discovery-scene__title discovery-scene__reveal discovery-scene__reveal--third">{{ scene.title }}</h2>
          }
          @if (scene.date) {
            <time class="cine-micro discovery-scene__date discovery-scene__reveal discovery-scene__reveal--fourth" [attr.datetime]="scene.date">
              {{ scene.date | date:'longDate' }}
            </time>
          }
          @if (scene.location) {
            <p class="cine-micro discovery-scene__location discovery-scene__reveal discovery-scene__reveal--fourth">{{ scene.location }}</p>
          }
          @if (scene.body) {
            <p class="cine-letter discovery-scene__body discovery-scene__reveal discovery-scene__reveal--fifth">{{ scene.body }}</p>
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
      background: rgba(5, 3, 8, 0.94);
      backdrop-filter: blur(18px);
    }

    .discovery-scene__content {
      position: relative;
      z-index: 1;
      max-width: min(440px, 92vw);
      text-align: center;
    }

    .discovery-scene__reveal {
      opacity: 0;
      animation: discoveryReveal 1.4s var(--ease-cine, ease) both;
    }

    .discovery-scene__reveal--first { animation-delay: 0.4s; }
    .discovery-scene__reveal--second { animation-delay: 1.4s; }
    .discovery-scene__reveal--third { animation-delay: 2s; }
    .discovery-scene__reveal--fourth { animation-delay: 2.5s; }
    .discovery-scene__reveal--fifth { animation-delay: 3s; }

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

    @keyframes discoveryReveal {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .discovery-scene__reveal { animation: none; opacity: 1; }
    }
  `]
})
export class DiscoverySceneComponent {
  readonly moments = inject(SceneMomentService);
}
