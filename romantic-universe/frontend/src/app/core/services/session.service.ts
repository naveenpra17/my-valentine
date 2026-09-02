import { Injectable, inject, signal } from '@angular/core';
import { SiteStorageService } from '../site/site-storage.service';

const SESSION_BASE = 'romantic_universe_session';
const ENTERED_BASE = 'romantic_universe_entered';
const UNLOCKED_BASE = 'romantic_universe_unlocked';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly siteStorage = inject(SiteStorageService);
  private sessionId = '';

  readonly unlocked = signal(false);
  readonly entered = signal(false);

  initializeForSite(): void {
    const stored = this.siteStorage.getItem(localStorage, SESSION_BASE);
    if (stored) {
      this.sessionId = stored;
    } else {
      this.sessionId = crypto.randomUUID();
      this.siteStorage.setItem(localStorage, SESSION_BASE, this.sessionId);
    }

    this.unlocked.set(this.readFlag(UNLOCKED_BASE));
    this.entered.set(this.readFlag(ENTERED_BASE));
  }

  getId(): string {
    if (!this.sessionId) {
      this.initializeForSite();
    }
    return this.sessionId;
  }

  hasEntered(): boolean {
    return this.entered();
  }

  markEntered(): void {
    this.siteStorage.setItem(localStorage, ENTERED_BASE, 'true');
    this.entered.set(true);
  }

  isUnlocked(): boolean {
    return this.unlocked();
  }

  markUnlocked(): void {
    this.siteStorage.setItem(localStorage, UNLOCKED_BASE, 'true');
    this.unlocked.set(true);
  }

  clearEntered(): void {
    this.siteStorage.removeItem(localStorage, ENTERED_BASE);
    this.entered.set(false);
  }

  private readFlag(base: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    return this.siteStorage.getItem(localStorage, base) === 'true';
  }
}
