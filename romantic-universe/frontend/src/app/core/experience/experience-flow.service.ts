import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';
import { CameraDirectorService } from '../cinematic/camera-director.service';
import { SceneMomentService } from '../cinematic/scene-moment.service';
import { ExperienceStateService } from './experience-state.service';
import { HeartObject } from './experience-state.types';
import { SoundDesignService } from '../services/sound-design.service';
import { MusicalChoreographyService } from '../audio/musical-choreography.service';
import { MotionService } from '../services/motion.service';
import { Memory, Photo, Reason } from '../models';

@Injectable({ providedIn: 'root' })
export class ExperienceFlowService {
  private readonly api = inject(ApiService);
  private readonly camera = inject(CameraDirectorService);
  private readonly moments = inject(SceneMomentService);
  private readonly state = inject(ExperienceStateService);
  private readonly sounds = inject(SoundDesignService);
  private readonly music = inject(MusicalChoreographyService);
  private readonly motion = inject(MotionService);

  private memoriesCache: Memory[] | null = null;
  private reasonsCache: Reason[] | null = null;
  private busy = false;

  async handlePhotoDiscovery(photoId: number, title?: string): Promise<void> {
    if (this.busy || this.state.isPhotoDiscovered(photoId)) return;
    this.busy = true;

    try {
      let photo: Photo | undefined;
      try {
        const photos = await this.loadPhotos();
        photo = photos.find(p => p.id === photoId);
      } catch {
        photo = undefined;
      }

      if (!photo) {
        photo = {
          id: photoId,
          title: title ?? `Photo ${photoId}`,
          imageUrl: `/assets/images/gallery/photo-${photoId}.png`,
          caption: title
        } as Photo;
      }

      this.sounds.enable();
      this.music.onPhoto();

      if (!this.motion.prefersReducedMotion()) {
        await this.camera.focusPhoto(photoId, 1400);
      }

      const isNew = this.state.discoverPhoto(
        photo.id,
        photo.caption ?? photo.title ?? title,
        photo.imageUrl
      );

      if (!isNew) return;

      await this.moments.transitionIn({
        kind: 'photo',
        title: photo.title ?? undefined,
        subtitle: photo.caption ?? 'A moment in our universe.',
        imageUrl: photo.imageUrl
      });

      await this.pause(1200);

      if (photo.memoryId) {
        await this.revealLinkedMemory(photo.memoryId);
      } else {
        await this.moments.transitionOut();
      }
    } finally {
      this.busy = false;
    }
  }

  async revealNextReason(): Promise<void> {
    if (this.busy) return;
    const reasons = await this.loadReasons();
    const next = reasons.find(r => !this.state.discoveredReasons().has(r.id));
    if (!next) return;

    this.busy = true;
    try {
      this.sounds.enable();
      this.music.onReason();

      await this.moments.transitionIn({
        kind: 'reason',
        subtitle: 'There\'s something else I love...',
        title: next.shortLabel,
        body: next.longMessage
      });

      this.state.discoverReason(next.id, next.shortLabel);
      await this.pause(2200);
      await this.moments.transitionOut();
    } finally {
      this.busy = false;
    }
  }

  private async revealLinkedMemory(memoryId: number): Promise<void> {
    const memories = await this.loadMemories();
    const memory = memories.find(m => m.id === memoryId);
    if (!memory) {
      await this.moments.transitionOut();
      return;
    }

    await this.moments.transitionIn({
      kind: 'memory',
      subtitle: 'I still remember this.',
      title: memory.title,
      body: memory.message,
      imageUrl: memory.imageUrl,
      date: memory.memoryDate,
      location: memory.location
    });

    if (!this.motion.prefersReducedMotion()) {
      await this.camera.enterMemory(1400);
    }

    if (!this.state.isMemoryDiscovered(memory.id)) {
      this.music.onMemory();
      this.state.discoverMemory(memory.id, memory.title, memory.imageUrl);
    }

    await this.pause(2400);

    if (!this.motion.prefersReducedMotion()) {
      await this.camera.exitMemory(1400);
    }

    await this.moments.transitionOut();

    this.music.onMemoryExit();

    const discoveredMemories = this.state.discoveredMemories().size;
    if (discoveredMemories === 1 || discoveredMemories === 3) {
      void this.revealNextReason();
    }
  }

  private async loadPhotos(): Promise<Photo[]> {
    return firstValueFrom(this.api.getPhotos());
  }

  private async loadMemories(): Promise<Memory[]> {
    if (!this.memoriesCache) {
      this.memoriesCache = await firstValueFrom(this.api.getMemories());
    }
    return this.memoriesCache;
  }

  private async loadReasons(): Promise<Reason[]> {
    if (!this.reasonsCache) {
      this.reasonsCache = await firstValueFrom(this.api.getReasons());
    }
    return this.reasonsCache;
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
    const needsPhoto = pool.some(o => o.type === 'photo' && !o.imageUrl);
    const needsMemory = pool.some(o => o.type === 'memory' && !o.imageUrl);

    if (needsPhoto) {
      try {
        const photos = await this.loadPhotos();
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
      } catch {
        for (const item of pool.filter(o => o.type === 'photo' && !o.imageUrl)) {
          const id = Number(item.referenceId);
          patches.push({
            type: 'photo',
            referenceId: id,
            label: item.label ?? `Photo ${id}`,
            imageUrl: `/assets/images/gallery/photo-${id}.png`,
            thumbnailUrl: `/assets/images/gallery/photo-${id}.png`
          });
        }
      }
    }

    if (needsMemory) {
      try {
        const memories = await this.loadMemories();
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
      } catch {
        for (const item of pool.filter(o => o.type === 'memory' && !o.imageUrl)) {
          const id = Number(item.referenceId);
          patches.push({
            type: 'memory',
            referenceId: id,
            label: item.label ?? `Memory ${id}`,
            imageUrl: `/assets/images/memories/memory-${id}.png`,
            thumbnailUrl: `/assets/images/memories/memory-${id}.png`
          });
        }
      }
    }

    this.state.patchHeartPool(patches);
  }
}
