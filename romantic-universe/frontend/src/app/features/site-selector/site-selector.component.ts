import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SiteSummary } from '../../core/models';

@Component({
  selector: 'app-site-selector',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="selector">
      <div class="selector__glow" aria-hidden="true"></div>
      <h1 class="selector__title cine-statement">Little universes</h1>
      <p class="selector__subtitle cine-whisper">Choose one to enter.</p>

      @if (loading()) {
        <p class="selector__state cine-body">Finding stars...</p>
      } @else if (error()) {
        <p class="selector__state selector__state--error cine-body">{{ error() }}</p>
      } @else if (sites().length === 0) {
        <p class="selector__state cine-body">No universes are available yet.</p>
      } @else {
        <ul class="selector__list">
          @for (site of sites(); track site.slug) {
            <li>
              <a class="selector__link cine-enter-btn" [routerLink]="['/site', site.slug]">
                {{ site.name }}
              </a>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [`
    .selector {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: var(--void);
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .selector__glow {
      position: absolute;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201, 160, 168, 0.12), transparent 70%);
      pointer-events: none;
    }

    .selector__title {
      margin: 0 0 0.75rem;
      position: relative;
    }

    .selector__subtitle {
      margin: 0 0 2.5rem;
      position: relative;
    }

    .selector__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: relative;
    }

    .selector__link {
      min-width: 220px;
      text-decoration: none;
    }

    .selector__state {
      position: relative;

      &--error {
        color: var(--rose);
      }
    }
  `]
})
export class SiteSelectorComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly sites = signal<SiteSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const sites = await firstValueFrom(this.api.listSites());
      this.sites.set(sites);

      if (sites.length === 1) {
        await this.router.navigate(['/site', sites[0].slug]);
      }
    } catch {
      this.error.set('Could not reach the universe server.');
    } finally {
      this.loading.set(false);
    }
  }
}
