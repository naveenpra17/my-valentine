import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VisibilityService {
  readonly pageVisible = signal(!document.hidden);

  constructor() {
    document.addEventListener('visibilitychange', () => {
      this.pageVisible.set(!document.hidden);
    });
  }
}
