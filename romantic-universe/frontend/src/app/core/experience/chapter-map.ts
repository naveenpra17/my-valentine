import { DirectorChapterId } from './experience-state.types';

/** Single source of truth for experience chapters (Director's Cut 0–12). */
export interface ExperienceChapterDef {
  id: DirectorChapterId;
  key: string;
  label: string;
  sceneId: string;
}

export const EXPERIENCE_CHAPTERS: ExperienceChapterDef[] = [
  { id: 0, key: 'opening', label: 'Invitation', sceneId: 'opening' },
  { id: 1, key: 'universe', label: 'Universe', sceneId: 'universe' },
  { id: 2, key: 'her', label: 'Her', sceneId: 'hero' },
  { id: 3, key: 'discover', label: 'Discover', sceneId: 'gallery' },
  { id: 4, key: 'memories', label: 'Memories', sceneId: 'memories' },
  { id: 5, key: 'reasons', label: 'Reasons', sceneId: 'reasons' },
  { id: 6, key: 'play', label: 'Love Bomb', sceneId: 'love-bomb' },
  { id: 7, key: 'constellation', label: 'Constellation', sceneId: 'constellation-ceremony' },
  { id: 8, key: 'heart', label: 'Our Heart', sceneId: 'heart' },
  { id: 9, key: 'open-when', label: 'Open When', sceneId: 'open-when' },
  { id: 10, key: 'flower', label: 'Flower', sceneId: 'flower' },
  { id: 11, key: 'remembers', label: 'Remembers', sceneId: 'remembers' },
  { id: 12, key: 'finale', label: 'Finale', sceneId: 'letter' }
];

export function chapterById(id: DirectorChapterId): ExperienceChapterDef | undefined {
  return EXPERIENCE_CHAPTERS.find(c => c.id === id);
}

export function chapterBySceneId(sceneId: string): ExperienceChapterDef | undefined {
  return EXPERIENCE_CHAPTERS.find(c => c.sceneId === sceneId);
}
