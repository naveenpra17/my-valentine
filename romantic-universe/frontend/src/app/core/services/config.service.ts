import { Injectable, computed, inject } from '@angular/core';
import { SiteDataService } from '../site/site-data.service';
import { SiteContextService } from '../site/site-context.service';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly siteData = inject(SiteDataService);
  private readonly siteContext = inject(SiteContextService);

  readonly config = this.siteData.config;
  readonly loading = this.siteData.loading;
  readonly error = this.siteData.error;

  /** Authoritative entry-lock question from the site bundle (not settings map). */
  readonly entryLockQuestion = computed(
    () => this.siteData.config()?.entryLockQuestion ?? ''
  );

  readonly entryLockEnabled = computed(
    () => this.siteData.config()?.entryLockEnabled ?? false
  );

  async load(): Promise<void> {
    const slug = this.siteContext.slug();
    if (!slug || this.siteData.bundle()) return;
    await this.siteData.load(slug);
  }

  get(key: string, fallback = ''): string {
    return this.siteData.get(key, fallback);
  }
}
