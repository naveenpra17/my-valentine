import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EasterEggService {
  readonly secretHeartFound = signal(
    localStorage.getItem('egg_secret_heart') === 'true'
  );
  readonly titleClicked = signal(
    localStorage.getItem('egg_title_click') === 'true'
  );

  markSecretHeartFound(): void {
    localStorage.setItem('egg_secret_heart', 'true');
    this.secretHeartFound.set(true);
  }

  markTitleClicked(): void {
    localStorage.setItem('egg_title_click', 'true');
    this.titleClicked.set(true);
  }
}
