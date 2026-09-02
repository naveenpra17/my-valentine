import { Injectable, inject } from '@angular/core';
import { SiteContextService } from './site-context.service';

const STORAGE_PREFIX = 'romantic-universe';
const DEFAULT_SITE_SLUG = 'kavi';

/** Legacy global keys used before multi-site namespacing (Kavi-only migration). */
const LEGACY_GLOBAL_KEYS: Record<string, string> = {
  romantic_universe_session: 'romantic_universe_session',
  romantic_universe_entered: 'romantic_universe_entered',
  romantic_universe_unlocked: 'romantic_universe_unlocked',
  ru_experience_v3: 'ru_experience_v3',
  ru_controller_v1: 'ru_controller_v1',
  love_bombs_count: 'love_bombs_count',
  ru_heart_intro_seen: 'ru_heart_intro_seen',
  ru_heart_first_attach: 'ru_heart_first_attach',
  ru_heart_complete_seen: 'ru_heart_complete_seen',
  egg_secret_heart: 'egg_secret_heart',
  egg_void_whisper: 'egg_void_whisper',
  egg_hidden_star: 'egg_hidden_star',
  egg_title_click: 'egg_title_click'
};

@Injectable({ providedIn: 'root' })
export class SiteStorageService {
  private readonly siteContext = inject(SiteContextService);

  key(base: string): string {
    const slug = this.siteContext.slug();
    return slug ? `${STORAGE_PREFIX}:${slug}:${base}` : base;
  }

  getItem(storage: Storage, base: string): string | null {
    const namespaced = storage.getItem(this.key(base));
    if (namespaced !== null) return namespaced;

    const slug = this.siteContext.slug();
    if (!slug || slug !== DEFAULT_SITE_SLUG) return null;

    const legacyGlobal = LEGACY_GLOBAL_KEYS[base];
    if (legacyGlobal) {
      const legacyValue = storage.getItem(legacyGlobal);
      if (legacyValue !== null) {
        this.migrateValue(storage, base, legacyValue, legacyGlobal);
        return legacyValue;
      }
    }

    const interimKey = `site:${slug}:${base}`;
    const interimValue = storage.getItem(interimKey);
    if (interimValue !== null) {
      this.migrateValue(storage, base, interimValue, interimKey);
      return interimValue;
    }

    return null;
  }

  setItem(storage: Storage, base: string, value: string): void {
    storage.setItem(this.key(base), value);
  }

  removeItem(storage: Storage, base: string): void {
    storage.removeItem(this.key(base));

    const slug = this.siteContext.slug();
    if (slug === DEFAULT_SITE_SLUG) {
      const legacyGlobal = LEGACY_GLOBAL_KEYS[base];
      if (legacyGlobal) storage.removeItem(legacyGlobal);
      storage.removeItem(`site:${slug}:${base}`);
    }
  }

  private migrateValue(storage: Storage, base: string, value: string, legacyKey: string): void {
    storage.setItem(this.key(base), value);
    if (legacyKey !== this.key(base)) {
      storage.removeItem(legacyKey);
    }
  }
}
