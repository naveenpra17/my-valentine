import { Injectable, signal } from '@angular/core';

const SESSION_KEY = 'romantic_universe_session';
const ENTERED_KEY = 'romantic_universe_entered';
const UNLOCKED_KEY = 'romantic_universe_unlocked';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private sessionId: string;

  /** Reactive unlock state — required for computed UI gates. */
  readonly unlocked = signal(this.readFlag(UNLOCKED_KEY));
  readonly entered = signal(this.readFlag(ENTERED_KEY));

  constructor() {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      this.sessionId = stored;
    } else {
      this.sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, this.sessionId);
    }
  }

  getId(): string {
    return this.sessionId;
  }

  hasEntered(): boolean {
    return this.entered();
  }

  markEntered(): void {
    localStorage.setItem(ENTERED_KEY, 'true');
    this.entered.set(true);
  }

  isUnlocked(): boolean {
    return this.unlocked();
  }

  markUnlocked(): void {
    localStorage.setItem(UNLOCKED_KEY, 'true');
    this.unlocked.set(true);
  }

  clearEntered(): void {
    localStorage.removeItem(ENTERED_KEY);
    this.entered.set(false);
  }

  private readFlag(key: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(key) === 'true';
  }
}
