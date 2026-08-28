import { Injectable, signal } from '@angular/core';
import { ExperienceAct, SceneDefinition } from './types';

const SCENES: SceneDefinition[] = [
  { id: 'opening', act: 'void', label: 'Act 1' },
  { id: 'universe', act: 'universe', label: 'Act 2' },
  { id: 'hero', act: 'her', label: 'Act 3' },
  { id: 'memories', act: 'memories', label: 'Act 4' },
  { id: 'reasons', act: 'feel', label: 'Act 5' },
  { id: 'love-bomb', act: 'play', label: 'Act 6' },
  { id: 'open-when', act: 'intimacy', label: 'Act 7' },
  { id: 'gallery', act: 'memories', label: 'Act 4' },
  { id: 'constellation', act: 'hidden', label: 'Act 8' },
  { id: 'flower', act: 'hidden', label: 'Act 8' },
  { id: 'letter', act: 'letter', label: 'Act 9' },
  { id: 'finale', act: 'finale', label: 'Act 10' }
];

@Injectable({ providedIn: 'root' })
export class SceneManagerService {
  readonly currentAct = signal<ExperienceAct>('void');
  readonly currentSceneId = signal<string>('opening');
  readonly transitionActive = signal(false);

  readonly scenes = SCENES;

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
