import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SiteContextService {
  readonly slug = signal<string | null>(null);
  readonly siteName = signal<string | null>(null);

  setSite(slug: string, name?: string): void {
    this.slug.set(slug.trim().toLowerCase());
    this.siteName.set(name ?? null);
  }

  clear(): void {
    this.slug.set(null);
    this.siteName.set(null);
  }

  requireSlug(): string {
    const slug = this.slug();
    if (!slug) {
      throw new Error('Site slug is not set');
    }
    return slug;
  }
}
