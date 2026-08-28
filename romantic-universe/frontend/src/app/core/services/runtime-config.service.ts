import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

interface RuntimeConfig {
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  readonly apiUrl = signal(environment.apiUrl);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    if (!environment.production) {
      this.loaded.set(true);
      return;
    }

    try {
      const response = await fetch('/assets/config.json');
      if (!response.ok) throw new Error('config not found');
      const config = (await response.json()) as RuntimeConfig;
      if (config.apiUrl) {
        this.apiUrl.set(config.apiUrl.replace(/\/$/, ''));
      }
    } catch {
      // Fall back to environment.apiUrl
    } finally {
      this.loaded.set(true);
    }
  }
}
