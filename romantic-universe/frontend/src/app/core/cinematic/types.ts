import { EXPERIENCE_CHAPTERS } from '../experience/chapter-map';

export type ExperienceAct =
  | 'void'
  | 'universe'
  | 'her'
  | 'memories'
  | 'feel'
  | 'play'
  | 'creation'
  | 'intimacy'
  | 'remembers'
  | 'hidden'
  | 'letter'
  | 'finale';

export type TransitionType =
  | 'fade-dark'
  | 'fade-light'
  | 'blur'
  | 'zoom-in'
  | 'zoom-out'
  | 'dissolve'
  | 'light-sweep';

export interface SceneDefinition {
  id: string;
  act: ExperienceAct;
  chapter: number;
  label: string;
}

export interface ChapterDefinition {
  id: number;
  key: string;
  title: string;
  sceneIds: string[];
}

/** Derived from `chapter-map.ts` — single source of truth for chapter numbering. */
export const CHAPTERS: ChapterDefinition[] = EXPERIENCE_CHAPTERS.map(c => ({
  id: c.id,
  key: c.key,
  title: c.label,
  sceneIds: [c.sceneId]
}));
