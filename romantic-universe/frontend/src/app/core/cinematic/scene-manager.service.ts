import { Injectable, computed, signal } from '@angular/core';
import { EXPERIENCE_CHAPTERS } from '../experience/chapter-map';
import { CHAPTERS, ChapterDefinition, ExperienceAct, SceneDefinition } from './types';

const SCENE_ACTS: Record<string, ExperienceAct> = {
  opening: 'void',
  universe: 'universe',
  hero: 'her',
  gallery: 'her',
  memories: 'memories',
  reasons: 'feel',
  'love-bomb': 'play',
  'constellation-ceremony': 'feel',
  heart: 'creation',
  'open-when': 'intimacy',
  flower: 'hidden',
  remembers: 'remembers',
  letter: 'letter',
  finale: 'finale'
};

const SCENES: SceneDefinition[] = EXPERIENCE_CHAPTERS.map(ch => ({
  id: ch.sceneId,
  act: SCENE_ACTS[ch.sceneId] ?? 'universe',
  chapter: ch.id,
  label: ch.label
}));

@Injectable({ providedIn: 'root' })
export class SceneManagerService {
  readonly currentAct = signal<ExperienceAct>('void');
  readonly currentSceneId = signal<string>('opening');
  readonly transitionActive = signal(false);

  readonly scenes = SCENES;
  readonly chapters = CHAPTERS;

  readonly currentChapter = computed(() => {
    const scene = SCENES.find(s => s.id === this.currentSceneId());
    return scene?.chapter ?? 0;
  });

  readonly currentChapterDef = computed((): ChapterDefinition => {
    const chapterId = this.currentChapter();
    return CHAPTERS.find(c => c.id === chapterId) ?? CHAPTERS[0];
  });

  setScene(sceneId: string): void {
    const scene = SCENES.find(s => s.id === sceneId);
    if (scene) {
      this.currentSceneId.set(sceneId);
      this.currentAct.set(scene.act);
    }
  }

  setAct(act: ExperienceAct): void {
    this.currentAct.set(act);
  }

  setTransitioning(active: boolean): void {
    this.transitionActive.set(active);
  }
}
