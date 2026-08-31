import { Injectable } from '@angular/core';

export interface UniverseLivingApi {
  beginTimeStop(): void;
  endTimeStop(gradualMs?: number): void;
  addWarmAfterimage(x: number, y: number, z: number): void;
  spawnTouchRipple(clientX: number, clientY: number): void;
  getDiscoveryProximity(): number;
  highlightCherishedDiscovery(type: string, referenceId: number | string): void;
}

/** Facade for living-universe reactions — registered by LoveUniverseScene. */
@Injectable({ providedIn: 'root' })
export class UniverseLivingService {
  private api?: UniverseLivingApi;

  register(api: UniverseLivingApi): void {
    this.api = api;
  }

  unregister(): void {
    this.api = undefined;
  }

  beginTimeStop(): void {
    this.api?.beginTimeStop();
  }

  endTimeStop(gradualMs = 1800): void {
    this.api?.endTimeStop(gradualMs);
  }

  addWarmAfterimage(x: number, y: number, z: number): void {
    this.api?.addWarmAfterimage(x, y, z);
  }

  spawnTouchRipple(clientX: number, clientY: number): void {
    this.api?.spawnTouchRipple(clientX, clientY);
  }

  getDiscoveryProximity(): number {
    return this.api?.getDiscoveryProximity() ?? 0;
  }

  highlightCherishedDiscovery(type: string, referenceId: number | string): void {
    this.api?.highlightCherishedDiscovery(type, referenceId);
  }
}
