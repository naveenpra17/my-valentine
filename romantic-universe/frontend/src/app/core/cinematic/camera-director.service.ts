import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface CameraWorldTarget {
  x: number;
  y: number;
  z: number;
}

export interface CameraDirectorApi {
  approach(target: CameraWorldTarget, durationMs?: number): Promise<void>;
  pullBack(durationMs?: number): Promise<void>;
  focusPhoto(photoId: number, durationMs?: number): Promise<void>;
  returnToUniverse(durationMs?: number): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class CameraDirectorService {
  private api?: CameraDirectorApi;
  readonly sceneReady = new Subject<void>();

  register(api: CameraDirectorApi): void {
    this.api = api;
    this.sceneReady.next();
  }

  unregister(): void {
    this.api = undefined;
  }

  async approach(target: CameraWorldTarget, durationMs = 2000): Promise<void> {
    if (!this.api) return;
    await this.api.approach(target, durationMs);
  }

  async pullBack(durationMs = 2200): Promise<void> {
    if (!this.api) return;
    await this.api.pullBack(durationMs);
  }

  async focusPhoto(photoId: number, durationMs = 1800): Promise<void> {
    if (!this.api) return;
    await this.api.focusPhoto(photoId, durationMs);
  }

  async returnToUniverse(durationMs = 2000): Promise<void> {
    if (!this.api) return;
    await this.api.returnToUniverse(durationMs);
  }
}
