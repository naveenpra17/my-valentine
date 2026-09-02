import { Injectable, inject } from '@angular/core';
import { CameraDirectorService } from '../cinematic/camera-director.service';
import { SceneMomentService } from '../cinematic/scene-moment.service';
import { ExperienceStateService } from './experience-state.service';
import { HeartObject } from './experience-state.types';
import { SoundDesignService } from '../services/sound-design.service';
import { MusicalChoreographyService } from '../audio/musical-choreography.service';
import { MotionService } from '../services/motion.service';
import { UniverseLivingService } from '../cinematic/universe-living.service';
import { SiteDataService } from '../site/site-data.service';
import { Memory, Photo, Reason } from '../models';

@Injectable({ providedIn: 'root' })
export class ExperienceFlowService {
  private readonly siteData = inject(SiteDataService);
  private readonly camera = inject(CameraDirectorService);
  private readonly moments = inject(SceneMomentService);
  private readonly state = inject(ExperienceStateService);
  private readonly sounds = inject(SoundDesignService);
  private readonly music = inject(MusicalChoreographyService);
  private readonly motion = inject(MotionService);
  private readonly living = inject(UniverseLivingService);

  private busy = false;
  private momentOpenedAt = 0;
  private lastMemoryOrbPos: { x: number; y: number; z: number } | null = null;

  clearSiteCache(): void {
    this.busy = false;
    this.momentOpenedAt = 0;
    this.lastMemoryOrbPos = null;
  }

  async handlePhotoDiscovery(photoId: number, title?: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;

    try {
      const photo = this.loadPhotos().find(p => p.id === photoId);
      if (!photo) {
        return;
      }

      this.sounds.enable();
      this.music.onPhoto();

      if (!this.motion.prefersReducedMotion()) {
        await this.camera.focusPhoto(photoId, 1400);
        this.lastMemoryOrbPos = { x: 0, y: 0, z: -2 };
      }

      if (!this.state.isPhotoDiscovered(photoId)) {
        this.state.discoverPhoto(
          photo.id,
          photo.caption ?? photo.title ?? title,
          photo.imageUrl
        );
      }

      await this.moments.transitionIn({
        kind: 'photo',
        title: photo.title ?? undefined,
        subtitle: photo.caption ?? undefined,
        imageUrl: photo.imageUrl
      });

      this.momentOpenedAt = performance.now();
      this.living.beginTimeStop();
      this.music.beginMomentFocus();

      await this.pause(4500);

      if (photo.memoryId) {
        await this.revealLinkedMemory(photo.memoryId);
      } else {
        this.recordMomentDwell('photo', photo.id);
        this.living.endTimeStop();
        this.music.endMomentFocus();
        await this.moments.transitionOut();
      }
    } finally {
      this.busy = false;
    }
  }

  async revealNextReason(): Promise<void> {
    if (this.busy) return;
    const reasons = this.loadReasons();
    const next = reasons.find(r => !this.state.discoveredReasons().has(r.id));
    if (!next) return;

    this.busy = true;
    try {
      this.sounds.enable();
      this.music.onReason();

      await this.moments.transitionIn({
        kind: 'reason',
        subtitle: undefined,
        title: next.shortLabel,
        body: next.longMessage
      });

      this.state.discoverReason(next.id, next.shortLabel);
      await this.pause(2800);
      await this.moments.transitionOut();
    } finally {
      this.busy = false;
    }
  }

  private async revealLinkedMemory(memoryId: number): Promise<void> {
    const memory = this.loadMemories().find(m => m.id === memoryId);
    if (!memory) {
      await this.moments.transitionOut();
      return;
    }

    await this.moments.transitionIn({
      kind: 'memory',
      subtitle: undefined,
      title: memory.title,
      body: memory.message,
      imageUrl: memory.imageUrl,
      date: memory.memoryDate,
      location: memory.location
    });

    this.momentOpenedAt = performance.now();
    this.living.beginTimeStop();
    this.music.beginMomentFocus();

    if (!this.motion.prefersReducedMotion()) {
      await this.camera.enterMemory(1400);
    }

    if (!this.state.isMemoryDiscovered(memory.id)) {
      this.music.onMemory();
      this.state.discoverMemory(memory.id, memory.title, memory.imageUrl);
    }

    await this.pause(3000);

    if (!this.motion.prefersReducedMotion()) {
      await this.camera.exitMemory(1600);
    }

    await this.moments.transitionOut();

    this.recordMomentDwell('memory', memory.id);
    this.living.endTimeStop();
    this.music.endMomentFocus();
    if (this.lastMemoryOrbPos) {
      this.living.addWarmAfterimage(
        this.lastMemoryOrbPos.x,
        this.lastMemoryOrbPos.y,
        this.lastMemoryOrbPos.z
      );
    }

    this.music.onMemoryExit();

    const discoveredMemories = this.state.discoveredMemories().size;
    if (discoveredMemories === 1 || discoveredMemories === 3) {
      void this.revealNextReason();
    }
  }

  private loadPhotos(): Photo[] {
    return this.siteData.photos();
  }

  private loadMemories(): Memory[] {
    return this.siteData.memories();
  }

  private loadReasons(): Reason[] {
    return this.siteData.reasons();
  }

  private recordMomentDwell(type: 'photo' | 'memory', referenceId: number): void {
    if (this.momentOpenedAt <= 0) return;
    const ms = performance.now() - this.momentOpenedAt;
    this.state.addDiscoveryDwell(type, referenceId, ms);
    this.momentOpenedAt = 0;
  }

  private pause(ms: number): Promise<void> {
    if (this.motion.prefersReducedMotion()) {
      return Promise.resolve();
    }
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Restore image URLs and labels for heart pool items missing metadata. */
  async enrichHeartPool(): Promise<void> {
    const pool = this.state.heartPool();
    if (!pool.length) return;

    const patches: HeartObject[] = [];
    const photos = this.loadPhotos();
    const memories = this.loadMemories();

    for (const item of pool.filter(o => o.type === 'photo' && !o.imageUrl)) {
      const photo = photos.find(p => p.id === item.referenceId);
      if (photo) {
        patches.push({
          type: 'photo',
          referenceId: photo.id,
          label: photo.caption ?? photo.title ?? undefined,
          imageUrl: photo.imageUrl,
          thumbnailUrl: photo.imageUrl
        });
      }
    }

    for (const item of pool.filter(o => o.type === 'memory' && !o.imageUrl)) {
      const memory = memories.find(m => m.id === item.referenceId);
      if (memory) {
        patches.push({
          type: 'memory',
          referenceId: memory.id,
          label: memory.title,
          imageUrl: memory.imageUrl,
          thumbnailUrl: memory.imageUrl
        });
      }
    }

    this.state.patchHeartPool(patches);
  }
}
