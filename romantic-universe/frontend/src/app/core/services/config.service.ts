import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { SiteConfig } from '../models';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly api = inject(ApiService);

  readonly config = signal<SiteConfig | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.api.getConfig());
      this.config.set(data);
    } catch {
      this.error.set('Could not load site configuration. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  get(key: string, fallback = ''): string {
    return this.config()?.settings[key] ?? fallback;
  }
}
