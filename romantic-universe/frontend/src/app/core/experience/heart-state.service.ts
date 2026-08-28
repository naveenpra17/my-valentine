import { Injectable, inject } from '@angular/core';
import { ExperienceStateService } from './experience-state.service';
import { applyPlacementWithFallback, hasPersistedPlacement } from './heart-composition.util';
import { toHeartAsset } from './heart-asset.mapper';
import { HeartAsset, SerializedHeartAsset, SerializedHeartState } from './heart-asset.types';
import { HeartObject, HeartObjectType } from './experience-state.types';

const HEART_STATE_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class HeartStateService {
  private readonly state = inject(ExperienceStateService);

  getSerializableHeartState(): SerializedHeartState {
    return this.captureHeartState();
  }

  captureHeartState(): SerializedHeartState {
    return {
      heartStateVersion: HEART_STATE_VERSION,
      heartId: 'our-little-heart',
      assets: this.validateAssets(
        this.state.selectedHeartObjects().map((obj, i) => this.serializeAsset(obj, i))
      )
    };
  }

  getHeartAssets(): HeartAsset[] {
    return this.toAssets(this.getValidatedHeartObjects());
  }

  getValidatedHeartObjects(): HeartObject[] {
    return this.validateObjects(this.state.selectedHeartObjects()).map((o, i) =>
      applyPlacementWithFallback(o, i)
    );
  }

  restoreHeartState(data: SerializedHeartState): HeartObject[] {
    return this.validateObjects(data.assets.map(a => this.deserializeAsset(a)));
  }

  prepareAttach(object: HeartObject): HeartObject {
    const index = this.state.selectedHeartObjects().length;
    return applyPlacementWithFallback(object, index);
  }

  toAssets(objects: HeartObject[]): HeartAsset[] {
    return objects.map(toHeartAsset);
  }

  private validateObjects(objects: HeartObject[]): HeartObject[] {
    return objects
      .filter(obj => this.isValidObject(obj))
      .map((obj, i) => (hasPersistedPlacement(obj) ? obj : applyPlacementWithFallback(obj, i)));
  }

  private validateAssets(assets: SerializedHeartAsset[]): SerializedHeartAsset[] {
    return assets.filter(a => this.isValidAsset(a));
  }

  private isValidObject(obj: HeartObject): boolean {
    if (!obj?.type || obj.referenceId == null) return false;
    if (!obj.position || !obj.rotation) return true;
    const p = obj.position;
    const s = obj.scale ?? 1;
    return (
      Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) &&
      Number.isFinite(s) && s > 0 && s < 5
    );
  }

  private isValidAsset(asset: SerializedHeartAsset): boolean {
    if (!asset?.type || asset.sourceId == null) return false;
    const p = asset.position;
    const s = asset.scale;
    return (
      Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) &&
      Number.isFinite(s) && s > 0 && s < 5
    );
  }

  private serializeAsset(object: HeartObject, index: number): SerializedHeartAsset {
    const placed = hasPersistedPlacement(object) ? object : applyPlacementWithFallback(object, index);
    return {
      id: `${placed.type}-${placed.referenceId}`,
      type: placed.type,
      sourceId: placed.referenceId,
      label: placed.label,
      thumbnailUrl: placed.thumbnailUrl ?? placed.imageUrl,
      imageUrl: placed.imageUrl,
      metadata: placed.metadata,
      position: placed.position!,
      rotation: placed.rotation!,
      scale: placed.scale ?? 1
    };
  }

  private deserializeAsset(asset: SerializedHeartAsset): HeartObject {
    return {
      type: asset.type as HeartObjectType,
      referenceId: asset.sourceId,
      label: asset.label,
      thumbnailUrl: asset.thumbnailUrl,
      imageUrl: asset.imageUrl,
      metadata: asset.metadata,
      position: asset.position,
      rotation: asset.rotation,
      scale: asset.scale
    };
  }
}
