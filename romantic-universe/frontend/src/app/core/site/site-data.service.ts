import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';
import { SiteBundle, SiteConfig } from '../models';
import { SiteContextService } from './site-context.service';

@Injectable({ providedIn: 'root' })
export class SiteDataService {
  private readonly api = inject(ApiService);
  private readonly siteContext = inject(SiteContextService);

  readonly bundle = signal<SiteBundle | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);

  readonly config = computed<SiteConfig | null>(() => {
    const data = this.bundle();
    if (!data) return null;
    return {
      settings: data.config,
      entryLockEnabled: data.entryLockEnabled,
      entryLockQuestion: data.entryLockQuestion
    };
  });

  readonly photos = computed(() => this.bundle()?.photos ?? []);
  readonly memories = computed(() => this.bundle()?.memories ?? []);
  readonly quotes = computed(() => this.bundle()?.quotes ?? []);
  readonly reasons = computed(() => this.bundle()?.reasons ?? []);
  readonly openWhenMessages = computed(() => this.bundle()?.openWhenMessages ?? []);
  readonly loveBombs = computed(() => this.bundle()?.loveBombs ?? []);

  async load(slug: string): Promise<boolean> {
    const normalized = slug.trim().toLowerCase();
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    this.bundle.set(null);

    try {
      const data = await firstValueFrom(this.api.getSiteBundle(normalized));
      this.bundle.set(data);
      this.siteContext.setSite(data.site.slug, data.site.name);
      return true;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        this.notFound.set(true);
        this.error.set('This little universe doesn\'t exist.');
      } else {
        this.error.set('Could not load this universe. Please try again.');
      }
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  get(key: string, fallback = ''): string {
    return this.bundle()?.config[key] ?? fallback;
  }

  clear(): void {
    this.bundle.set(null);
    this.error.set(null);
    this.notFound.set(false);
    this.siteContext.clear();
  }
}
