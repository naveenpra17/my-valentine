import { Injectable, inject } from '@angular/core';
import { SceneManagerService } from './scene-manager.service';
import { TransitionService } from './transition.service';
import { TransitionType } from './types';

@Injectable({ providedIn: 'root' })
export class ExperienceEngineService {
  private readonly scenes = inject(SceneManagerService);
  private readonly transitions = inject(TransitionService);

  async enterMainExperience(
    openingEl: HTMLElement,
    mainEl: HTMLElement
  ): Promise<void> {
    this.scenes.setScene('universe');
    await this.transitions.transition(openingEl, mainEl, 'fade-dark');
  }

  async betweenScenes(
    fromEl: HTMLElement | null,
    toEl: HTMLElement | null,
    sceneId: string,
    transition: TransitionType = 'dissolve'
  ): Promise<void> {
    this.scenes.setScene(sceneId);
    await this.transitions.transition(fromEl, toEl, transition);
  }

  fadeToBlack(): Promise<void> {
    return this.transitions.fadeThroughDarkness(1.4);
  }
}
