import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-site-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="missing">
      <p class="cine-whisper missing__line">This little universe doesn't exist.</p>
      @if (slug) {
        <p class="cine-micro missing__slug">{{ slug }}</p>
      }
      <a routerLink="/" class="cine-enter-btn missing__back">Return</a>
    </main>
  `,
  styles: [`
    .missing {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2rem;
      background: var(--void);
      text-align: center;
    }

    .missing__line {
      margin: 0;
    }

    .missing__slug {
      margin: 0;
      opacity: 0.45;
    }

    .missing__back {
      margin-top: 1.5rem;
      text-decoration: none;
    }
  `]
})
export class SiteNotFoundComponent {
  private readonly route = inject(ActivatedRoute);
  readonly slug = this.route.snapshot.queryParamMap.get('slug');
}
