import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { DirectorChapterId } from '../experience/experience-state.types';

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
  focusObject?(target: CameraWorldTarget, durationMs?: number): Promise<void>;
  enterMemory?(durationMs?: number): Promise<void>;
  exitMemory?(durationMs?: number): Promise<void>;
  focusReason?(durationMs?: number): Promise<void>;
  focusQuote?(durationMs?: number): Promise<void>;
  focusHeart?(durationMs?: number): Promise<void>;
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

  async focusObject(target: CameraWorldTarget, durationMs = 1800): Promise<void> {
    if (this.api?.focusObject) {
      await this.api.focusObject(target, durationMs);
      return;
    }
    await this.approach(target, durationMs);
  }

  async approachObject(target: CameraWorldTarget, durationMs = 2000): Promise<void> {
    await this.approach(target, durationMs);
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

  async enterMemory(durationMs = 1600): Promise<void> {
    if (this.api?.enterMemory) {
      await this.api.enterMemory(durationMs);
      return;
    }
    await this.approach({ x: 0, y: 0.2, z: -1 }, durationMs);
  }

  async exitMemory(durationMs = 1600): Promise<void> {
    if (this.api?.exitMemory) {
      await this.api.exitMemory(durationMs);
      return;
    }
    await this.pullBack(durationMs);
  }

  async focusReason(durationMs = 1400): Promise<void> {
    if (this.api?.focusReason) {
      await this.api.focusReason(durationMs);
      return;
    }
    await this.approach({ x: 1.2, y: 0.8, z: -2 }, durationMs);
  }

  async focusQuote(durationMs = 1400): Promise<void> {
    if (this.api?.focusQuote) {
      await this.api.focusQuote(durationMs);
      return;
    }
    await this.approach({ x: -1, y: 1.2, z: -3 }, durationMs);
  }

  async focusHeart(durationMs = 1500): Promise<void> {
    if (this.api?.focusHeart) {
      await this.api.focusHeart(durationMs);
      return;
    }
    await this.approach({ x: 0, y: 0, z: 0 }, durationMs);
  }

  async transitionToChapter(_chapter: DirectorChapterId, durationMs = 1800): Promise<void> {
    await this.returnToUniverse(durationMs);
  }
}
