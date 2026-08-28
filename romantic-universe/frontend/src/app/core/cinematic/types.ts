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

export const CHAPTERS: ChapterDefinition[] = [
  { id: 0, key: 'invitation', title: 'The Invitation', sceneIds: ['opening'] },
  { id: 1, key: 'universe', title: 'Enter the Universe', sceneIds: ['universe'] },
  { id: 2, key: 'discover', title: 'Discover Her World', sceneIds: ['hero', 'gallery'] },
  { id: 3, key: 'memories', title: 'Collect the Memories', sceneIds: ['memories'] },
  { id: 4, key: 'reasons', title: 'What I Love', sceneIds: ['reasons', 'constellation'] },
  { id: 5, key: 'play', title: 'Play', sceneIds: ['love-bomb'] },
  { id: 6, key: 'creation', title: 'Create Something', sceneIds: ['heart'] },
  { id: 7, key: 'open-when', title: 'Quiet Moments', sceneIds: ['open-when'] },
  { id: 8, key: 'remembers', title: 'The Universe Remembers', sceneIds: ['remembers', 'flower'] },
  { id: 9, key: 'letter', title: 'The Letter', sceneIds: ['letter'] },
  { id: 10, key: 'finale', title: 'Final Creation', sceneIds: ['finale'] }
];
