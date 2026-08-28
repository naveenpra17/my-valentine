import { Injectable, computed, signal } from '@angular/core';
import { applyPlacement } from './heart-composition.util';
import {
  ChapterId,
  ConstellationStar,
  HeartObject,
  HeartObjectType,
  SerializedExperienceState
} from './experience-state.types';

const STORAGE_KEY = 'ru_experience_v3';

@Injectable({ providedIn: 'root' })
export class ExperienceStateService {
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

  discoverPhoto(id: number, label?: string, imageUrl?: string): boolean {
    if (this.discoveredPhotos().has(id)) return false;
    this.discoveredPhotos.update(set => new Set(set).add(id));
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
    this.addConstellationStar('reason', id);
    this.addToHeartPool({ type: 'reason', referenceId: id, label });
    this.persist();
    return true;
  }

  discoverFlower(id = 1, label?: string): boolean {
    if (this.discoveredFlowers().has(id)) return false;
    this.discoveredFlowers.update(set => new Set(set).add(id));
    this.addConstellationStar('flower', id);
    this.addToHeartPool({ type: 'flower', referenceId: id, label: label ?? 'A little surprise' });
    this.persist();
    return true;
  }

  activateQuote(id: number, label?: string): boolean {
    if (this.activatedQuotes().has(id)) return false;
    this.activatedQuotes.update(set => new Set(set).add(id));
    this.addConstellationStar('quote', id);
    this.addToHeartPool({ type: 'quote', referenceId: id, label });
    this.persist();
    return true;
  }

  triggerLoveBomb(id: number, label?: string): boolean {
    if (this.triggeredLoveBombs().has(id)) return false;
    this.triggeredLoveBombs.update(set => new Set(set).add(id));
    this.addConstellationStar('love-bomb', id);
    this.addToHeartPool({ type: 'love-bomb', referenceId: id, label });
    this.persist();
    return true;
  }

  discoverSecret(key: string, label?: string): boolean {
    if (this.foundSecrets().has(key)) return false;
    this.foundSecrets.update(set => new Set(set).add(key));
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
    const placed = applyPlacement(object, index);
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
    sessionStorage.removeItem(STORAGE_KEY);
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

  private addToHeartPool(object: HeartObject): void {
    const key = `${object.type}-${object.referenceId}`;
    if (this.heartPool().some(o => `${o.type}-${o.referenceId}` === key)) return;
    this.heartPool.update(list => [...list, object]);
  }

  private rebuildHeartPoolFromDiscoveries(): void {
    const pool: HeartObject[] = [];
    const add = (obj: HeartObject): void => {
      const key = `${obj.type}-${obj.referenceId}`;
      if (!pool.some(o => `${o.type}-${o.referenceId}` === key)) {
        pool.push(obj);
      }
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize()));
  }

  private restore(): void {
    if (typeof sessionStorage === 'undefined') return;
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
      if (!data.heartPool?.length) {
        this.rebuildHeartPoolFromDiscoveries();
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
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
