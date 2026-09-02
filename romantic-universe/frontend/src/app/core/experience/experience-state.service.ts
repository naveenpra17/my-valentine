import { Injectable, computed, inject, signal } from '@angular/core';
import { applyPlacementWithFallback } from './heart-composition.util';
import { SiteStorageService } from '../site/site-storage.service';
import {
  ChapterId,
  ConstellationStar,
  DiscoveryHistory,
  DiscoveryMilestoneKey,
  HeartObject,
  HeartObjectType,
  SerializedExperienceState
} from './experience-state.types';

const STORAGE_BASE = 'ru_experience_v3';

@Injectable({ providedIn: 'root' })
export class ExperienceStateService {
  private readonly siteStorage = inject(SiteStorageService);
  readonly discoveredPhotos = signal<Set<number>>(new Set());
  readonly discoveredMemories = signal<Set<number>>(new Set());
  readonly discoveredReasons = signal<Set<number>>(new Set());
  readonly activatedQuotes = signal<Set<number>>(new Set());
  readonly triggeredLoveBombs = signal<Set<number>>(new Set());
  readonly discoveredFlowers = signal<Set<number>>(new Set());
  readonly foundSecrets = signal<Set<string>>(new Set());
  readonly openedEnvelopes = signal<Set<number>>(new Set());
  readonly selectedHeartObjects = signal<HeartObject[]>([]);
  readonly heartPool = signal<HeartObject[]>([]);
  readonly constellationStars = signal<ConstellationStar[]>([]);
  readonly currentChapter = signal<ChapterId>(0);
  readonly musicEnabled = signal(false);
  readonly experienceStarted = signal(false);
  readonly experienceCompleted = signal(false);
  /** User was sent from the heart section to find discoveries in the starfield. */
  readonly heartDiscoveryHunt = signal(false);
  readonly discoveryHistory = signal<DiscoveryHistory>({ milestones: {}, dwellMs: {} });

  readonly totalDiscoveries = computed(() => {
    return (
      this.discoveredPhotos().size +
      this.discoveredMemories().size +
      this.discoveredReasons().size +
      this.activatedQuotes().size +
      this.triggeredLoveBombs().size +
      this.foundSecrets().size +
      this.discoveredFlowers().size
    );
  });

  readonly hasEnoughForConstellation = computed(() => this.constellationStars().length >= 4);

  readonly constellationHeartRevealed = computed(() => {
    const stars = this.constellationStars();
    return stars.length >= 6;
  });

  readonly availableHeartObjects = computed(() => {
    const placed = new Set(
      this.selectedHeartObjects().map(o => `${o.type}-${o.referenceId}`)
    );
    return this.heartPool().filter(o => !placed.has(`${o.type}-${o.referenceId}`));
  });

  constructor() {
    // Restored when a site route activates via initializeForSite().
  }

  initializeForSite(): void {
    this.restore();
  }

  setChapter(chapter: ChapterId): void {
    this.currentChapter.set(chapter);
    this.persist();
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled.set(enabled);
    this.persist();
  }

  recordDiscoveryMilestone(key: DiscoveryMilestoneKey, referenceId: number | string): void {
    const history = this.discoveryHistory();
    if (history.milestones[key] !== undefined) return;
    this.discoveryHistory.set({
      ...history,
      milestones: { ...history.milestones, [key]: referenceId }
    });
    this.persist();
  }

  addDiscoveryDwell(type: HeartObjectType, referenceId: number | string, ms: number): void {
    if (ms <= 0) return;
    const key = `${type}-${referenceId}`;
    const history = this.discoveryHistory();
    this.discoveryHistory.set({
      ...history,
      dwellMs: { ...history.dwellMs, [key]: (history.dwellMs[key] ?? 0) + ms }
    });
    this.persist();
  }

  /** Most emotionally visited discovery — for subtle finale callbacks. */
  getCherishedDiscovery(): { type: HeartObjectType; referenceId: number | string } | null {
    const entries = Object.entries(this.discoveryHistory().dwellMs);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const [topKey] = entries[0];
    const dash = topKey.indexOf('-');
    if (dash < 0) return null;
    const type = topKey.slice(0, dash) as HeartObjectType;
    const ref = topKey.slice(dash + 1);
    const referenceId = /^\d+$/.test(ref) ? Number(ref) : ref;
    return { type, referenceId };
  }

  discoverPhoto(id: number, label?: string, imageUrl?: string): boolean {
    if (this.discoveredPhotos().has(id)) return false;
    this.discoveredPhotos.update(set => new Set(set).add(id));
    if (this.discoveredPhotos().size === 1) {
      this.recordDiscoveryMilestone('firstPhoto', id);
    }
    this.addConstellationStar('photo', id);
    this.addToHeartPool({
      type: 'photo',
      referenceId: id,
      label,
      imageUrl,
      thumbnailUrl: imageUrl
    });
    this.persist();
    return true;
  }

  discoverMemory(id: number, label?: string, imageUrl?: string): boolean {
    if (this.discoveredMemories().has(id)) return false;
    this.discoveredMemories.update(set => new Set(set).add(id));
    if (this.discoveredMemories().size === 1) {
      this.recordDiscoveryMilestone('firstMemory', id);
    }
    this.addConstellationStar('memory', id);
    this.addToHeartPool({
      type: 'memory',
      referenceId: id,
      label,
      imageUrl,
      thumbnailUrl: imageUrl
    });
    this.persist();
    return true;
  }

  discoverReason(id: number, label?: string): boolean {
    if (this.discoveredReasons().has(id)) return false;
    this.discoveredReasons.update(set => new Set(set).add(id));
    if (this.discoveredReasons().size === 1) {
      this.recordDiscoveryMilestone('firstReason', id);
    }
    this.addConstellationStar('reason', id);
    this.addToHeartPool({ type: 'reason', referenceId: id, label });
    this.persist();
    return true;
  }

  discoverFlower(id = 1, label?: string): boolean {
    if (this.discoveredFlowers().has(id)) return false;
    this.discoveredFlowers.update(set => new Set(set).add(id));
    if (this.discoveredFlowers().size === 1) {
      this.recordDiscoveryMilestone('firstFlower', id);
    }
    this.addConstellationStar('flower', id);
    this.addToHeartPool({ type: 'flower', referenceId: id, label: label ?? 'A little surprise' });
    this.persist();
    return true;
  }

  activateQuote(id: number, label?: string): boolean {
    if (this.activatedQuotes().has(id)) return false;
    this.activatedQuotes.update(set => new Set(set).add(id));
    if (this.activatedQuotes().size === 1) {
      this.recordDiscoveryMilestone('firstQuote', id);
    }
    this.addConstellationStar('quote', id);
    this.addToHeartPool({ type: 'quote', referenceId: id, label });
    this.persist();
    return true;
  }

  triggerLoveBomb(id: number, label?: string): boolean {
    if (this.triggeredLoveBombs().has(id)) return false;
    this.triggeredLoveBombs.update(set => new Set(set).add(id));
    if (this.triggeredLoveBombs().size === 1) {
      this.recordDiscoveryMilestone('firstLoveBomb', id);
    }
    this.addConstellationStar('love-bomb', id);
    this.addToHeartPool({ type: 'love-bomb', referenceId: id, label });
    this.persist();
    return true;
  }

  discoverSecret(key: string, label?: string): boolean {
    if (this.foundSecrets().has(key)) return false;
    this.foundSecrets.update(set => new Set(set).add(key));
    this.recordDiscoveryMilestone('secretDiscovered', key);
    this.addConstellationStar('secret', key);
    this.addToHeartPool({ type: 'secret', referenceId: key, label: label ?? 'A secret' });
    this.persist();
    return true;
  }

  openEnvelope(id: number): boolean {
    if (this.openedEnvelopes().has(id)) return false;
    this.openedEnvelopes.update(set => new Set(set).add(id));
    this.addConstellationStar('symbol', `envelope-${id}`);
    this.persist();
    return true;
  }

  attachHeartObject(object: HeartObject): void {
    const exists = this.selectedHeartObjects().some(
      o => o.type === object.type && o.referenceId === object.referenceId
    );
    if (exists) return;

    const index = this.selectedHeartObjects().length;
    const placed = applyPlacementWithFallback(object, index);
    this.selectedHeartObjects.update(list => [...list, placed]);
    this.persist();
  }

  removeHeartObject(type: HeartObjectType, referenceId: number | string): void {
    this.selectedHeartObjects.update(list =>
      list.filter(o => !(o.type === type && o.referenceId === referenceId))
    );
    this.persist();
  }

  isPhotoDiscovered(id: number): boolean {
    return this.discoveredPhotos().has(id);
  }

  isMemoryDiscovered(id: number): boolean {
    return this.discoveredMemories().has(id);
  }

  resetSession(): void {
    this.discoveredPhotos.set(new Set());
    this.discoveredMemories.set(new Set());
    this.discoveredReasons.set(new Set());
    this.activatedQuotes.set(new Set());
    this.triggeredLoveBombs.set(new Set());
    this.discoveredFlowers.set(new Set());
    this.foundSecrets.set(new Set());
    this.openedEnvelopes.set(new Set());
    this.selectedHeartObjects.set([]);
    this.heartPool.set([]);
    this.constellationStars.set([]);
    this.currentChapter.set(0);
    this.musicEnabled.set(false);
    this.experienceStarted.set(false);
    this.experienceCompleted.set(false);
    this.discoveryHistory.set({ milestones: {}, dwellMs: {} });
    if (typeof sessionStorage !== 'undefined') {
      this.siteStorage.removeItem(sessionStorage, STORAGE_BASE);
    }
  }

  exportForShare(): SerializedExperienceState {
    return this.serialize();
  }

  private addConstellationStar(
    sourceType: HeartObjectType | 'secret' | 'symbol',
    referenceId: number | string
  ): void {
    const id = `${sourceType}-${referenceId}`;
    if (this.constellationStars().some(star => star.id === id)) return;

    const count = this.constellationStars().length;
    const angle = (count / Math.max(count + 1, 6)) * Math.PI * 2 - Math.PI / 2;
    const radius = 0.28 + (count % 3) * 0.04;

    const star: ConstellationStar = {
      id,
      sourceType,
      referenceId,
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius * 0.9,
      discoveredAt: Date.now()
    };

    this.constellationStars.update(stars => [...stars, star]);
  }

  addToHeartPool(object: HeartObject): void {
    const key = `${object.type}-${object.referenceId}`;
    if (this.heartPool().some(o => `${o.type}-${o.referenceId}` === key)) return;
    this.heartPool.update(list => [...list, object]);
  }

  /** Re-sync pool from discoveries without stripping labels or image URLs. */
  syncHeartPoolFromDiscoveries(): void {
    this.mergeDiscoveriesIntoHeartPool();
    this.persist();
  }

  setHeartDiscoveryHunt(active: boolean): void {
    this.heartDiscoveryHunt.set(active);
  }

  /** Fill in missing labels and image URLs on pool items (e.g. after session restore). */
  patchHeartPool(updates: HeartObject[]): void {
    if (!updates.length) return;
    const byKey = new Map(updates.map(o => [`${o.type}-${o.referenceId}`, o]));
    let changed = false;
    const next = this.heartPool().map(item => {
      const patch = byKey.get(`${item.type}-${item.referenceId}`);
      if (!patch) return item;
      const merged = {
        ...item,
        ...patch,
        label: patch.label ?? item.label,
        imageUrl: patch.imageUrl ?? item.imageUrl,
        thumbnailUrl: patch.thumbnailUrl ?? item.thumbnailUrl ?? patch.imageUrl ?? item.imageUrl
      };
      if (
        merged.label !== item.label ||
        merged.imageUrl !== item.imageUrl ||
        merged.thumbnailUrl !== item.thumbnailUrl
      ) {
        changed = true;
      }
      return merged;
    });
    if (changed) {
      this.heartPool.set(next);
      this.persist();
    }
  }

  private mergeDiscoveriesIntoHeartPool(): void {
    const ensure = (obj: HeartObject): void => {
      const key = `${obj.type}-${obj.referenceId}`;
      if (!this.heartPool().some(o => `${o.type}-${o.referenceId}` === key)) {
        this.addToHeartPool(obj);
      }
    };

    for (const id of this.discoveredPhotos()) ensure({ type: 'photo', referenceId: id });
    for (const id of this.discoveredMemories()) ensure({ type: 'memory', referenceId: id });
    for (const id of this.discoveredReasons()) ensure({ type: 'reason', referenceId: id });
    for (const id of this.activatedQuotes()) ensure({ type: 'quote', referenceId: id });
    for (const id of this.triggeredLoveBombs()) ensure({ type: 'love-bomb', referenceId: id });
    for (const id of this.discoveredFlowers()) ensure({ type: 'flower', referenceId: id });
    for (const key of this.foundSecrets()) ensure({ type: 'secret', referenceId: key });
  }

  private rebuildHeartPoolFromDiscoveries(): void {
    const existing = new Map<string, HeartObject>(
      this.heartPool().map(o => [`${o.type}-${o.referenceId}`, o])
    );
    const pool: HeartObject[] = [];
    const add = (obj: HeartObject): void => {
      const key = `${obj.type}-${obj.referenceId}`;
      if (pool.some(o => `${o.type}-${o.referenceId}` === key)) return;
      const prev = existing.get(key);
      pool.push(
        prev
          ? {
              ...prev,
              ...obj,
              label: prev.label ?? obj.label,
              imageUrl: prev.imageUrl ?? obj.imageUrl,
              thumbnailUrl: prev.thumbnailUrl ?? obj.thumbnailUrl ?? prev.imageUrl
            }
          : obj
      );
    };

    for (const id of this.discoveredPhotos()) add({ type: 'photo', referenceId: id });
    for (const id of this.discoveredMemories()) add({ type: 'memory', referenceId: id });
    for (const id of this.discoveredReasons()) add({ type: 'reason', referenceId: id });
    for (const id of this.activatedQuotes()) add({ type: 'quote', referenceId: id });
    for (const id of this.triggeredLoveBombs()) add({ type: 'love-bomb', referenceId: id });
    for (const id of this.discoveredFlowers()) add({ type: 'flower', referenceId: id });
    for (const key of this.foundSecrets()) add({ type: 'secret', referenceId: key });

    this.heartPool.set(pool);
  }

  private persist(): void {
    if (typeof sessionStorage === 'undefined') return;
    this.siteStorage.setItem(sessionStorage, STORAGE_BASE, JSON.stringify(this.serialize()));
  }

  private restore(): void {
    if (typeof sessionStorage === 'undefined') return;
    const raw = this.siteStorage.getItem(sessionStorage, STORAGE_BASE);
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as SerializedExperienceState;
      this.discoveredPhotos.set(new Set(data.discoveredPhotos ?? []));
      this.discoveredMemories.set(new Set(data.discoveredMemories ?? []));
      this.discoveredReasons.set(new Set(data.discoveredReasons ?? []));
      this.activatedQuotes.set(new Set(data.activatedQuotes ?? []));
      this.triggeredLoveBombs.set(new Set(data.triggeredLoveBombs ?? []));
      this.discoveredFlowers.set(new Set(data.discoveredFlowers ?? []));
      this.foundSecrets.set(new Set(data.foundSecrets ?? []));
      this.openedEnvelopes.set(new Set(data.openedEnvelopes ?? []));
      this.selectedHeartObjects.set(data.selectedHeartObjects ?? []);
      this.heartPool.set(data.heartPool ?? []);
      this.constellationStars.set(data.constellationStars ?? []);
      this.currentChapter.set((data.currentChapter ?? 0) as ChapterId);
      this.musicEnabled.set(data.musicEnabled ?? false);
      this.experienceStarted.set(data.experienceStarted ?? false);
      this.experienceCompleted.set(data.experienceCompleted ?? false);
      this.discoveryHistory.set(data.discoveryHistory ?? { milestones: {}, dwellMs: {} });
      if (!data.heartPool?.length) {
        this.rebuildHeartPoolFromDiscoveries();
      }
    } catch {
      this.siteStorage.removeItem(sessionStorage, STORAGE_BASE);
    }
  }

  serialize(): SerializedExperienceState {
    return {
      discoveredPhotos: [...this.discoveredPhotos()],
      discoveredMemories: [...this.discoveredMemories()],
      discoveredReasons: [...this.discoveredReasons()],
      activatedQuotes: [...this.activatedQuotes()],
      triggeredLoveBombs: [...this.triggeredLoveBombs()],
      discoveredFlowers: [...this.discoveredFlowers()],
      foundSecrets: [...this.foundSecrets()],
      openedEnvelopes: [...this.openedEnvelopes()],
      selectedHeartObjects: this.selectedHeartObjects(),
      heartPool: this.heartPool(),
      constellationStars: this.constellationStars(),
      discoveryHistory: this.discoveryHistory(),
      currentChapter: this.currentChapter(),
      musicEnabled: this.musicEnabled(),
      experienceStarted: this.experienceStarted(),
      experienceCompleted: this.experienceCompleted()
    };
  }

  setExperienceStarted(started: boolean): void {
    this.experienceStarted.set(started);
    this.persist();
  }

  setExperienceCompleted(completed: boolean): void {
    this.experienceCompleted.set(completed);
    this.persist();
  }
}
