import { Component } from '@angular/core';

/** Intentionally blank — used for / and /site without a slug (no public site list). */
@Component({
  selector: 'app-site-empty',
  standalone: true,
  template: `<main class="void-screen" aria-hidden="true"></main>`,
  styles: [`
    :host {
      display: block;
    }

    .void-screen {
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--void);
    }
  `]
})
export class SiteEmptyComponent {}
