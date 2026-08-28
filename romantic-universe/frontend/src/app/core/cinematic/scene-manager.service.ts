import { Injectable, computed, signal } from '@angular/core';
import { CHAPTERS, ChapterDefinition, ExperienceAct, SceneDefinition } from './types';

const SCENES: SceneDefinition[] = [
  { id: 'opening', act: 'void', chapter: 0, label: 'The Invitation' },
  { id: 'universe', act: 'universe', chapter: 1, label: 'Enter the Universe' },
  { id: 'hero', act: 'her', chapter: 2, label: 'Discover Her World' },
  { id: 'memories', act: 'memories', chapter: 3, label: 'Collect the Memories' },
  { id: 'reasons', act: 'feel', chapter: 4, label: 'What I Love' },
  { id: 'love-bomb', act: 'play', chapter: 5, label: 'Play' },
  { id: 'heart', act: 'creation', chapter: 6, label: 'Our Little Heart' },
  { id: 'open-when', act: 'intimacy', chapter: 7, label: 'Quiet Moments' },
  { id: 'gallery', act: 'her', chapter: 2, label: 'Photo Discovery' },
  { id: 'constellation', act: 'feel', chapter: 4, label: 'Memory Constellation' },
  { id: 'flower', act: 'hidden', chapter: 8, label: 'Hidden Bloom' },
  { id: 'remembers', act: 'remembers', chapter: 8, label: 'Universe Remembers' },
  { id: 'letter', act: 'letter', chapter: 9, label: 'The Letter' },
  { id: 'finale', act: 'finale', chapter: 10, label: 'Final Creation' }
];

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
