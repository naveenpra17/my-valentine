import { Injectable } from '@angular/core';

const SESSION_KEY = 'romantic_universe_session';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private sessionId: string;

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
    return localStorage.getItem('romantic_universe_entered') === 'true';
  }

  markEntered(): void {
    localStorage.setItem('romantic_universe_entered', 'true');
  }

  isUnlocked(): boolean {
    return localStorage.getItem('romantic_universe_unlocked') === 'true';
  }

  markUnlocked(): void {
    localStorage.setItem('romantic_universe_unlocked', 'true');
  }
}
